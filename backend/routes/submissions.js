const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// POST /api/projects/:projectId/submit - Submit work (student)
router.post('/projects/:projectId/submit', authMiddleware, requireRole('student'), (req, res) => {
  try {
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.projectId);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check if student has an accepted application
    const application = db.prepare(`
      SELECT * FROM applications
      WHERE project_id = ? AND student_id = ? AND status = 'accepted'
    `).get(project.id, req.user.id);

    if (!application) {
      return res.status(403).json({ error: 'You must have an accepted application to submit work' });
    }

    const { content, fileUrl } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Submission content is required' });
    }

    const id = uuidv4();
    db.prepare(`
      INSERT INTO submissions (id, project_id, student_id, content, file_url)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, project.id, req.user.id, content, fileUrl || null);

    const submission = db.prepare('SELECT * FROM submissions WHERE id = ?').get(id);
    res.status(201).json({ submission });
  } catch (error) {
    console.error('Error creating submission:', error);
    res.status(500).json({ error: 'Failed to create submission' });
  }
});

// GET /api/submissions/my - Get my submissions (student)
router.get('/my', authMiddleware, requireRole('student'), (req, res) => {
  try {
    const submissions = db.prepare(`
      SELECT s.*, p.title as project_title,
        u.name as company_name,
        r.rating, r.feedback
      FROM submissions s
      JOIN projects p ON s.project_id = p.id
      JOIN users u ON p.company_id = u.id
      LEFT JOIN reviews r ON s.id = r.submission_id
      WHERE s.student_id = ?
      ORDER BY s.created_at DESC
    `).all(req.user.id);

    res.json({ submissions });
  } catch (error) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

// GET /api/submissions/:id - Get submission details
router.get('/:id', authMiddleware, (req, res) => {
  try {
    const submission = db.prepare(`
      SELECT s.*, p.title as project_title, p.company_id,
        u.name as student_name, u.email as student_email,
        r.rating, r.feedback, r.created_at as review_date
      FROM submissions s
      JOIN projects p ON s.project_id = p.id
      JOIN users u ON s.student_id = u.id
      LEFT JOIN reviews r ON s.id = r.submission_id
      WHERE s.id = ?
    `).get(req.params.id);

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    // Only allow student who submitted or company who owns the project
    if (req.user.role === 'student' && submission.student_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to view this submission' });
    }

    if (req.user.role === 'company' && submission.company_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to view this submission' });
    }

    res.json({ submission });
  } catch (error) {
    console.error('Error fetching submission:', error);
    res.status(500).json({ error: 'Failed to fetch submission' });
  }
});

// GET /api/projects/:projectId/submissions - Get all submissions for a project (company)
router.get('/projects/:projectId/list', authMiddleware, requireRole('company'), (req, res) => {
  try {
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.projectId);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (project.company_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to view these submissions' });
    }

    const submissions = db.prepare(`
      SELECT s.*, u.name as student_name, u.email as student_email,
        r.rating, r.feedback
      FROM submissions s
      JOIN users u ON s.student_id = u.id
      LEFT JOIN reviews r ON s.id = r.submission_id
      WHERE s.project_id = ?
      ORDER BY s.created_at DESC
    `).all(req.params.projectId);

    res.json({ submissions });
  } catch (error) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

// POST /api/submissions/:id/review - Add review (company)
router.post('/:id/review', authMiddleware, requireRole('company'), (req, res) => {
  try {
    const submission = db.prepare(`
      SELECT s.*, p.company_id
      FROM submissions s
      JOIN projects p ON s.project_id = p.id
      WHERE s.id = ?
    `).get(req.params.id);

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    if (submission.company_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to review this submission' });
    }

    // Check if already reviewed
    const existingReview = db.prepare('SELECT * FROM reviews WHERE submission_id = ?').get(req.params.id);
    if (existingReview) {
      return res.status(400).json({ error: 'Submission has already been reviewed' });
    }

    const { rating, feedback, status } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const reviewId = uuidv4();
    db.prepare(`
      INSERT INTO reviews (id, submission_id, rating, feedback)
      VALUES (?, ?, ?, ?)
    `).run(reviewId, req.params.id, rating, feedback || null);

    // Update submission status
    const newStatus = status || 'approved';
    db.prepare('UPDATE submissions SET status = ? WHERE id = ?').run(newStatus, req.params.id);

    // If approved, mark project as completed
    if (newStatus === 'approved') {
      db.prepare('UPDATE projects SET status = ? WHERE id = ?').run('completed', submission.project_id);
    }

    const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(reviewId);
    res.status(201).json({ review });
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({ error: 'Failed to create review' });
  }
});

module.exports = router;
