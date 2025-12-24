const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'data.json');

// Initialize data structure
const defaultData = {
  users: [],
  projects: [],
  applications: [],
  submissions: [],
  reviews: []
};

// Load or initialize database
function loadDb() {
  try {
    if (fs.existsSync(DB_FILE)) {
      return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    }
  } catch (error) {
    console.error('Error loading database:', error);
  }
  return { ...defaultData };
}

function saveDb(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Database wrapper with better-sqlite3-like API
class Database {
  constructor() {
    this.data = loadDb();
  }

  prepare(sql) {
    const self = this;

    // Parse the SQL to understand what we're doing
    const selectMatch = sql.match(/SELECT\s+(.+?)\s+FROM\s+(\w+)/i);
    const insertMatch = sql.match(/INSERT\s+INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
    const updateMatch = sql.match(/UPDATE\s+(\w+)\s+SET/i);
    const deleteMatch = sql.match(/DELETE\s+FROM\s+(\w+)/i);

    return {
      get(...params) {
        if (selectMatch) {
          return self._executeSelect(sql, params, true);
        }
        return undefined;
      },

      all(...params) {
        if (selectMatch) {
          return self._executeSelect(sql, params, false);
        }
        return [];
      },

      run(...params) {
        if (insertMatch) {
          return self._executeInsert(sql, params);
        }
        if (updateMatch) {
          return self._executeUpdate(sql, params);
        }
        if (deleteMatch) {
          return self._executeDelete(sql, params);
        }
        return { changes: 0 };
      }
    };
  }

  _executeSelect(sql, params, single) {
    // Extract table name
    const tableMatch = sql.match(/FROM\s+(\w+)/i);
    if (!tableMatch) return single ? undefined : [];

    const tableName = tableMatch[1];
    let items = [...(this.data[tableName] || [])];

    // Handle JOINs by merging data
    const joinMatches = sql.matchAll(/JOIN\s+(\w+)\s+(\w+)?\s*ON\s+([^\s]+)\s*=\s*([^\s]+)/gi);
    for (const join of joinMatches) {
      const joinTable = join[1];
      const joinAlias = join[2] || joinTable;
      const leftField = join[3].split('.')[1];
      const rightField = join[4].split('.')[1] || 'id';

      items = items.map(item => {
        const joinData = (this.data[joinTable] || []).find(j =>
          j[rightField] === item[leftField]
        );
        // Put joinData first so original item fields take precedence (preserves project.id over user.id)
        return joinData ? { ...joinData, ...item } : item;
      });
    }

    // Handle SELECT aliases (e.g., "u.name as company_name")
    const aliasMatches = sql.matchAll(/(\w+)\.(\w+)\s+as\s+(\w+)/gi);
    const aliases = [];
    for (const match of aliasMatches) {
      aliases.push({ field: match[2], alias: match[3] });
    }
    if (aliases.length > 0) {
      items = items.map(item => {
        const newItem = { ...item };
        for (const { field, alias } of aliases) {
          if (item[field] !== undefined) {
            newItem[alias] = item[field];
          }
        }
        return newItem;
      });
    }

    // Handle WHERE clause
    const whereMatch = sql.match(/WHERE\s+(.+?)(?:ORDER|GROUP|LIMIT|$)/is);
    if (whereMatch) {
      items = this._applyWhere(items, whereMatch[1], params);
    }

    // Handle ORDER BY
    const orderMatch = sql.match(/ORDER\s+BY\s+([^\s]+)\s+(ASC|DESC)?/i);
    if (orderMatch) {
      const field = orderMatch[1].split('.').pop();
      const desc = orderMatch[2]?.toUpperCase() === 'DESC';
      items.sort((a, b) => {
        const aVal = a[field] || '';
        const bVal = b[field] || '';
        return desc ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
      });
    }

    return single ? items[0] : items;
  }

  _applyWhere(items, whereClause, params) {
    return items.filter(item => {
      // Reset param index for each item
      let paramIndex = 0;

      // Handle multiple conditions
      const conditions = whereClause.split(/\s+AND\s+/i);

      return conditions.every(condition => {
        // Skip "1=1" dummy condition
        if (condition.trim() === '1=1') return true;

        // Handle field = ?
        const equalMatch = condition.match(/([a-z_.]+)\s*=\s*\?/i);
        if (equalMatch) {
          const field = equalMatch[1].split('.').pop();
          const value = params[paramIndex++];
          return item[field] === value;
        }

        // Handle field LIKE ?
        const likeMatch = condition.match(/([a-z_.]+)\s+LIKE\s+\?/i);
        if (likeMatch) {
          const field = likeMatch[1].split('.').pop();
          const pattern = params[paramIndex++];
          const regex = new RegExp(pattern.replace(/%/g, '.*'), 'i');
          return regex.test(item[field] || '');
        }

        return true;
      });
    });
  }

  _executeInsert(sql, params) {
    const match = sql.match(/INSERT\s+INTO\s+(\w+)\s*\(([^)]+)\)/i);
    if (!match) return { changes: 0 };

    const tableName = match[1];
    const columns = match[2].split(',').map(c => c.trim());

    if (!this.data[tableName]) {
      this.data[tableName] = [];
    }

    const newItem = {};
    columns.forEach((col, i) => {
      newItem[col] = params[i];
    });

    // Add created_at if not present
    if (!newItem.created_at) {
      newItem.created_at = new Date().toISOString();
    }

    this.data[tableName].push(newItem);
    saveDb(this.data);

    return { changes: 1 };
  }

  _executeUpdate(sql, params) {
    const tableMatch = sql.match(/UPDATE\s+(\w+)/i);
    if (!tableMatch) return { changes: 0 };

    const tableName = tableMatch[1];
    const setMatch = sql.match(/SET\s+(.+?)\s+WHERE/is);
    const whereMatch = sql.match(/WHERE\s+(.+)$/i);

    if (!setMatch || !whereMatch) return { changes: 0 };

    const items = this.data[tableName] || [];
    let changes = 0;

    // Find items matching WHERE
    const setClause = setMatch[1];
    const setCols = setClause.split(',').map(s => s.trim());

    // Count params for SET clause (handle COALESCE)
    let setParamCount = 0;
    setCols.forEach(col => {
      if (col.includes('?')) setParamCount++;
      if (col.includes('COALESCE')) setParamCount++;
    });

    const whereValue = params[params.length - 1];

    items.forEach(item => {
      // Simple WHERE id = ? matching
      const whereField = whereMatch[1].split('=')[0].trim().split('.').pop();
      if (item[whereField] === whereValue) {
        let paramIdx = 0;
        setCols.forEach(colDef => {
          const colMatch = colDef.match(/(\w+)\s*=\s*(?:COALESCE\(\?,\s*\w+\)|\?)/i);
          if (colMatch) {
            const colName = colMatch[1];
            const value = params[paramIdx++];
            if (value !== undefined && value !== null) {
              item[colName] = value;
            }
          }
        });
        changes++;
      }
    });

    saveDb(this.data);
    return { changes };
  }

  _executeDelete(sql, params) {
    const tableMatch = sql.match(/DELETE\s+FROM\s+(\w+)/i);
    if (!tableMatch) return { changes: 0 };

    const tableName = tableMatch[1];
    const whereMatch = sql.match(/WHERE\s+(.+)$/i);

    if (!whereMatch) return { changes: 0 };

    const items = this.data[tableName] || [];
    const initialCount = items.length;

    // Simple WHERE field = ? matching
    const whereField = whereMatch[1].split('=')[0].trim();
    const whereValue = params[0];

    this.data[tableName] = items.filter(item => item[whereField] !== whereValue);

    saveDb(this.data);
    return { changes: initialCount - this.data[tableName].length };
  }

  exec(sql) {
    // For schema creation, we just ensure tables exist in data
    const tableMatches = sql.matchAll(/CREATE TABLE IF NOT EXISTS (\w+)/gi);
    for (const match of tableMatches) {
      if (!this.data[match[1]]) {
        this.data[match[1]] = [];
      }
    }
    saveDb(this.data);
  }

  pragma() {
    // No-op for JSON storage
  }
}

module.exports = new Database();
