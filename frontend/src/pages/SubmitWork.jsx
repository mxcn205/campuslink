import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { submitWork } from '../api/client';

export default function SubmitWork() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    content: '',
    fileUrl: ''
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
      await submitWork(id, formData);
      navigate('/my-submissions');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit work');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container" style={{ maxWidth: '600px' }}>
      <h2>Submit Your Work</h2>
      {error && <div className="alert alert-error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Description of Your Work</label>
          <textarea
            name="content"
            value={formData.content}
            onChange={handleChange}
            placeholder="Describe what you've completed, include any relevant details, implementation notes, etc."
            style={{ minHeight: '200px' }}
            required
          />
        </div>
        <div className="form-group">
          <label>File/Link URL (optional)</label>
          <input
            type="url"
            name="fileUrl"
            value={formData.fileUrl}
            onChange={handleChange}
            placeholder="e.g., https://github.com/your-repo or Google Drive link"
          />
          <small style={{ color: '#666' }}>Link to your code repository, documentation, or deliverables</small>
        </div>
        <div className="actions">
          <button type="submit" className="btn btn-success" disabled={loading}>
            {loading ? 'Submitting...' : 'Submit Work'}
          </button>
          <Link to={`/projects/${id}`} className="btn btn-secondary">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
