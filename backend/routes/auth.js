const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { authMiddleware, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// Validate university email (.edu domain)
const isUniversityEmail = (email) => {
  return email.toLowerCase().endsWith('.edu');
};

// Extract university/company name from email
const extractOrganization = (email, role) => {
  const domain = email.split('@')[1];
  const parts = domain.split('.');
  if (role === 'student') {
    // Remove .edu and capitalize
    return parts.slice(0, -1).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
  } else {
    // For companies, use domain without TLD (e.g., google.com -> Google)
    return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  }
};

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, role } = req.body;

    // Validation
    if (!email || !password || !name || !role) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (!['student', 'company'].includes(role)) {
      return res.status(400).json({ error: 'Role must be student or company' });
    }

    // Only students need university email
    if (role === 'student' && !isUniversityEmail(email)) {
      return res.status(400).json({ error: 'Students must use a university email (.edu domain)' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user exists
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Create user (auto-verified)
    const id = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);
    const university = extractOrganization(email, role);

    db.prepare(`
      INSERT INTO users (id, email, password_hash, name, role, university, verified)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, email.toLowerCase(), passwordHash, name, role, university, true);

    res.status(201).json({
      message: 'Registration successful! You can now log in.',
      userId: id
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        university: user.university
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
