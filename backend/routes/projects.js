const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/projects - List all open projects
router.get('/', authMiddleware, (req, res) => {
  try {
    const { status, skills } = req.query;

    let query = `
      SELECT p.*, u.name as company_name, u.university as company_university
      FROM projects p
      JOIN users u ON p.company_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND p.status = ?';
      params.push(status);
    } else {
      query += ' AND p.status = ?';
      params.push('open');
    }

    if (skills) {
      query += ' AND p.skills LIKE ?';
      params.push(`%${skills}%`);
    }

    query += ' ORDER BY p.created_at DESC';

    const projects = db.prepare(query).all(...params);
    res.json({ projects });
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// GET /api/projects/my - Get my projects (for companies)
router.get('/my', authMiddleware, requireRole('company'), (req, res) => {
  try {
    const projects = db.prepare(`
      SELECT * FROM projects WHERE company_id = ?
    `).all(req.user.id);

    // Get counts manually since JSON db doesn't support subqueries
    const applications = db.prepare('SELECT * FROM applications').all();
    const submissions = db.prepare('SELECT * FROM submissions').all();

    const projectsWithCounts = projects.map(p => ({
      ...p,
      application_count: applications.filter(a => a.project_id === p.id).length,
      submission_count: submissions.filter(s => s.project_id === p.id).length
    }));

    // Sort by created_at DESC
    projectsWithCounts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json({ projects: projectsWithCounts });
  } catch (error) {
    console.error('Error fetching my projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// GET /api/projects/:id - Get project details
router.get('/:id', authMiddleware, (req, res) => {
  try {
    const project = db.prepare(`
      SELECT p.*, u.name as company_name, u.university as company_university
      FROM projects p
      JOIN users u ON p.company_id = u.id
      WHERE p.id = ?
    `).get(req.params.id);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // If user is a student, check if they've applied
    let application = null;
    if (req.user.role === 'student') {
      application = db.prepare(`
        SELECT * FROM applications WHERE project_id = ? AND student_id = ?
      `).get(project.id, req.user.id);
    }

    // If user is the company owner, get applications
    let applications = [];
    if (req.user.role === 'company' && project.company_id === req.user.id) {
      applications = db.prepare(`
        SELECT a.*, u.name as student_name, u.email as student_email, u.university as student_university
        FROM applications a
        JOIN users u ON a.student_id = u.id
        WHERE a.project_id = ?
        ORDER BY a.created_at DESC
      `).all(project.id);
    }

    res.json({ project, application, applications });
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// POST /api/projects - Create project (company only)
router.post('/', authMiddleware, requireRole('company'), (req, res) => {
  try {
    const { title, description, skills } = req.body;

    if (!title || !description || !skills) {
      return res.status(400).json({ error: 'Title, description, and skills are required' });
    }

    const id = uuidv4();
    db.prepare(`
      INSERT INTO projects (id, company_id, title, description, skills, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, req.user.id, title, description, skills, 'open');

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    res.status(201).json({ project });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// PUT /api/projects/:id - Update project (company only)
router.put('/:id', authMiddleware, requireRole('company'), (req, res) => {
  try {
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (project.company_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to update this project' });
    }

    const { title, description, skills, status } = req.body;

    db.prepare(`
      UPDATE projects SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        skills = COALESCE(?, skills),
        status = COALESCE(?, status)
      WHERE id = ?
    `).run(title, description, skills, status, req.params.id);

    const updatedProject = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
    res.json({ project: updatedProject });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// POST /api/projects/:id/apply - Apply for project (student only)
router.post('/:id/apply', authMiddleware, requireRole('student'), (req, res) => {
  try {
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (project.status !== 'open') {
      return res.status(400).json({ error: 'Project is not open for applications' });
    }

    // Check if already applied
    const existingApplication = db.prepare(`
      SELECT * FROM applications WHERE project_id = ? AND student_id = ?
    `).get(project.id, req.user.id);

    if (existingApplication) {
      return res.status(400).json({ error: 'You have already applied to this project' });
    }

    const { message } = req.body;
    const id = uuidv4();

    db.prepare(`
      INSERT INTO applications (id, project_id, student_id, message)
      VALUES (?, ?, ?, ?)
    `).run(id, project.id, req.user.id, message || null);

    const application = db.prepare('SELECT * FROM applications WHERE id = ?').get(id);
    res.status(201).json({ application });
  } catch (error) {
    console.error('Error applying to project:', error);
    res.status(500).json({ error: 'Failed to apply to project' });
  }
});

// GET /api/applications/my - Get my applications (student)
router.get('/applications/my', authMiddleware, requireRole('student'), (req, res) => {
  try {
    const applications = db.prepare(`
      SELECT a.*, p.title as project_title, p.status as project_status,
        u.name as company_name
      FROM applications a
      JOIN projects p ON a.project_id = p.id
      JOIN users u ON p.company_id = u.id
      WHERE a.student_id = ?
      ORDER BY a.created_at DESC
    `).all(req.user.id);

    res.json({ applications });
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// PUT /api/applications/:id - Accept/reject application (company)
router.put('/applications/:id', authMiddleware, requireRole('company'), (req, res) => {
  try {
    const application = db.prepare(`
      SELECT a.*, p.company_id
      FROM applications a
      JOIN projects p ON a.project_id = p.id
      WHERE a.id = ?
    `).get(req.params.id);

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (application.company_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to update this application' });
    }

    const { status } = req.body;
    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be accepted or rejected' });
    }

    db.prepare('UPDATE applications SET status = ? WHERE id = ?').run(status, req.params.id);

    // If accepted, update project status
    if (status === 'accepted') {
      db.prepare('UPDATE projects SET status = ? WHERE id = ?').run('in_progress', application.project_id);
    }

    const updatedApplication = db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.id);
    res.json({ application: updatedApplication });
  } catch (error) {
    console.error('Error updating application:', error);
    res.status(500).json({ error: 'Failed to update application' });
  }
});

module.exports = router;
