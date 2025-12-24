const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const submissionRoutes = require('./routes/submissions');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/submissions', submissionRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'University Freelance Platform API' });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('API endpoints:');
  console.log('  POST /api/auth/register - Register new user');
  console.log('  POST /api/auth/login - Login');
  console.log('  GET  /api/auth/me - Get current user');
  console.log('  GET  /api/projects - List projects');
  console.log('  POST /api/projects - Create project');
  console.log('  GET  /api/projects/:id - Get project');
  console.log('  POST /api/projects/:id/apply - Apply to project');
  console.log('  POST /api/submissions/projects/:id/submit - Submit work');
  console.log('  POST /api/submissions/:id/review - Review submission');
});
