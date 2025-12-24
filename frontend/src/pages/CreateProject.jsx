import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createProject } from '../api/client';

export default function CreateProject() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    skills: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await createProject(formData);
      navigate(`/projects/${res.data.project.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container" style={{ maxWidth: '600px' }}>
      <h2>Post a New Project</h2>
      {error && <div className="alert alert-error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Project Title</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="e.g., Build a Mobile App for Campus Events"
            required
          />
        </div>
        <div className="form-group">
          <label>Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Describe the project, requirements, deliverables, and timeline..."
            style={{ minHeight: '150px' }}
            required
          />
        </div>
        <div className="form-group">
          <label>Required Skills</label>
          <input
            type="text"
            name="skills"
            value={formData.skills}
            onChange={handleChange}
            placeholder="e.g., React, Node.js, UI/UX Design"
            required
          />
          <small style={{ color: '#666' }}>Separate skills with commas</small>
        </div>
        <button type="submit" className="btn btn-full btn-success" disabled={loading}>
          {loading ? 'Creating...' : 'Post Project'}
        </button>
      </form>
    </div>
  );
}
