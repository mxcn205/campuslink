import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMySubmissions } from '../api/client';

export default function MySubmissions() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const res = await getMySubmissions();
        setSubmissions(res.data.submissions);
      } catch (error) {
        console.error('Error fetching submissions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubmissions();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h2 className="page-title">My Submissions</h2>

      {submissions.length === 0 ? (
        <div className="card">
          <p>You haven't submitted any work yet.</p>
          <Link to="/my-applications" className="btn" style={{ marginTop: '10px' }}>
            View Applications
          </Link>
        </div>
      ) : (
        <div className="grid">
          {submissions.map(sub => (
            <div key={sub.id} className="card">
              <h3>
                <Link to={`/projects/${sub.project_id}`} className="link">
                  {sub.project_title}
                </Link>
              </h3>
              <p className="card-meta">Company: {sub.company_name}</p>
              <p>{sub.content.substring(0, 150)}...</p>
              {sub.file_url && (
                <p>
                  <a href={sub.file_url} target="_blank" rel="noopener noreferrer" className="link">
                    View Attachment
                  </a>
                </p>
              )}
              <div style={{ marginTop: '10px' }}>
                <span className={`status status-${sub.status}`}>{sub.status}</span>
              </div>
              {sub.rating && (
                <div style={{ marginTop: '15px', padding: '10px', background: '#f9f9f9', borderRadius: '4px' }}>
                  <p>
                    <strong>Rating:</strong> {'★'.repeat(sub.rating)}{'☆'.repeat(5 - sub.rating)} ({sub.rating}/5)
                  </p>
                  {sub.feedback && <p><strong>Feedback:</strong> {sub.feedback}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
