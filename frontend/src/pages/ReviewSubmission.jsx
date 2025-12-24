import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getSubmission, reviewSubmission } from '../api/client';

export default function ReviewSubmission() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState(null);
  const [formData, setFormData] = useState({
    rating: 5,
    feedback: '',
    status: 'approved'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchSubmission = async () => {
      try {
        const res = await getSubmission(id);
        setSubmission(res.data.submission);
        if (res.data.submission.rating) {
          navigate(`/projects/${res.data.submission.project_id}`);
        }
      } catch (err) {
        setError('Submission not found');
      } finally {
        setLoading(false);
      }
    };

    fetchSubmission();
  }, [id, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await reviewSubmission(id, formData);
      navigate(`/projects/${submission.project_id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error && !submission) return <div className="alert alert-error">{error}</div>;
  if (!submission) return null;

  return (
    <div className="form-container" style={{ maxWidth: '600px' }}>
      <h2>Review Submission</h2>

      <div className="card" style={{ marginBottom: '20px' }}>
        <h3>{submission.project_title}</h3>
        <p className="card-meta">Submitted by: {submission.student_name} ({submission.student_email})</p>
        <div className="detail-section">
          <h4>Submission Content</h4>
          <p style={{ whiteSpace: 'pre-wrap' }}>{submission.content}</p>
        </div>
        {submission.file_url && (
          <p>
            <a href={submission.file_url} target="_blank" rel="noopener noreferrer" className="link">
              View Attached Files
            </a>
          </p>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Rating</label>
          <div className="rating-input">
            {[1, 2, 3, 4, 5].map(num => (
              <label key={num} style={{ cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="rating"
                  value={num}
                  checked={formData.rating === num}
                  onChange={() => setFormData({ ...formData, rating: num })}
                  style={{ display: 'none' }}
                />
                <span style={{ fontSize: '24px', color: formData.rating >= num ? '#f1c40f' : '#ddd' }}>
                  ★
                </span>
              </label>
            ))}
            <span style={{ marginLeft: '10px' }}>{formData.rating}/5</span>
          </div>
        </div>
        <div className="form-group">
          <label>Feedback</label>
          <textarea
            value={formData.feedback}
            onChange={(e) => setFormData({ ...formData, feedback: e.target.value })}
            placeholder="Provide constructive feedback to the student..."
            style={{ minHeight: '100px' }}
          />
        </div>
        <div className="form-group">
          <label>Status</label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          >
            <option value="approved">Approved - Project Complete</option>
            <option value="revision">Needs Revision</option>
          </select>
        </div>
        <div className="actions">
          <button type="submit" className="btn btn-success" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Review'}
          </button>
          <Link to={`/projects/${submission.project_id}`} className="btn btn-secondary">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
