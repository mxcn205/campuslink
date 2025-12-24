import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMyApplications } from '../api/client';

export default function MyApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const res = await getMyApplications();
        setApplications(res.data.applications);
      } catch (error) {
        console.error('Error fetching applications:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h2 className="page-title">My Applications</h2>

      {applications.length === 0 ? (
        <div className="card">
          <p>You haven't applied to any projects yet.</p>
          <Link to="/projects" className="btn" style={{ marginTop: '10px' }}>
            Browse Projects
          </Link>
        </div>
      ) : (
        <div className="grid">
          {applications.map(app => (
            <div key={app.id} className="card">
              <h3>
                <Link to={`/projects/${app.project_id}`} className="link">
                  {app.project_title}
                </Link>
              </h3>
              <p className="card-meta">Company: {app.company_name}</p>
              {app.message && <p>Your message: {app.message}</p>}
              <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                <span className={`status status-${app.status}`}>{app.status}</span>
                <span className={`status status-${app.project_status}`}>
                  Project: {app.project_status.replace('_', ' ')}
                </span>
              </div>
              {app.status === 'accepted' && app.project_status === 'in_progress' && (
                <Link to={`/projects/${app.project_id}/submit`} className="btn btn-success btn-small" style={{ marginTop: '15px' }}>
                  Submit Work
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
