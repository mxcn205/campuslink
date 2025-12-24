import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getProject, applyToProject, updateApplication, getProjectSubmissions } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function ProjectDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [application, setApplication] = useState(null);
  const [applications, setApplications] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProject();
  }, [id]);

  const fetchProject = async () => {
    try {
      const res = await getProject(id);
      setProject(res.data.project);
      setApplication(res.data.application);
      setApplications(res.data.applications || []);

      if (user.role === 'company' && res.data.project.company_id === user.id) {
        const subsRes = await getProjectSubmissions(id);
        setSubmissions(subsRes.data.submissions);
      }
    } catch (error) {
      setError('Project not found');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (e) => {
    e.preventDefault();
    setApplying(true);
    setError('');

    try {
      await applyToProject(id, { message });
      fetchProject();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to apply');
    } finally {
      setApplying(false);
    }
  };

  const handleApplicationAction = async (appId, status) => {
    try {
      await updateApplication(appId, { status });
      fetchProject();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update application');
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error && !project) return <div className="alert alert-error">{error}</div>;
  if (!project) return null;

  const skills = project.skills.split(',').map(s => s.trim());
  const isOwner = user.role === 'company' && project.company_id === user.id;
  const hasAcceptedApplication = application?.status === 'accepted';

  return (
    <div>
      <div className="card">
        <h2>{project.title}</h2>
        <p className="card-meta">
          Posted by {project.company_name} - {project.company_university}
          <br />
          <span className={`status status-${project.status}`}>
            {project.status.replace('_', ' ')}
          </span>
        </p>

        <div className="detail-section">
          <h3>Description</h3>
          <p>{project.description}</p>
        </div>

        <div className="detail-section">
          <h3>Required Skills</h3>
          <div className="skills-list">
            {skills.map((skill, index) => (
              <span key={index} className="skill-tag">{skill}</span>
            ))}
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {/* Student view */}
        {user.role === 'student' && (
          <>
            {application ? (
              <div className="detail-section">
                <h3>Your Application</h3>
                <p>
                  Status: <span className={`status status-${application.status}`}>
                    {application.status}
                  </span>
                </p>
                {application.message && <p>Message: {application.message}</p>}
                {hasAcceptedApplication && project.status === 'in_progress' && (
                  <Link to={`/projects/${id}/submit`} className="btn btn-success">
                    Submit Work
                  </Link>
                )}
              </div>
            ) : project.status === 'open' ? (
              <div className="detail-section">
                <h3>Apply for this Project</h3>
                <form onSubmit={handleApply}>
                  <div className="form-group">
                    <label>Message (optional)</label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Tell them why you're a good fit..."
                    />
                  </div>
                  <button type="submit" className="btn btn-success" disabled={applying}>
                    {applying ? 'Applying...' : 'Apply Now'}
                  </button>
                </form>
              </div>
            ) : (
              <p>This project is no longer accepting applications.</p>
            )}
          </>
        )}

        {/* Company owner view */}
        {isOwner && (
          <>
            {applications.length > 0 && (
              <div className="detail-section">
                <h3>Applications ({applications.length})</h3>
                {applications.map(app => (
                  <div key={app.id} className="card" style={{ background: '#f9f9f9' }}>
                    <p><strong>{app.student_name}</strong> - {app.student_university}</p>
                    <p>{app.student_email}</p>
                    {app.message && <p>Message: {app.message}</p>}
                    <p>
                      Status: <span className={`status status-${app.status}`}>{app.status}</span>
                    </p>
                    {app.status === 'pending' && (
                      <div className="actions">
                        <button
                          className="btn btn-success btn-small"
                          onClick={() => handleApplicationAction(app.id, 'accepted')}
                        >
                          Accept
                        </button>
                        <button
                          className="btn btn-danger btn-small"
                          onClick={() => handleApplicationAction(app.id, 'rejected')}
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {submissions.length > 0 && (
              <div className="detail-section">
                <h3>Submissions ({submissions.length})</h3>
                {submissions.map(sub => (
                  <div key={sub.id} className="card" style={{ background: '#f9f9f9' }}>
                    <p><strong>{sub.student_name}</strong> - {sub.student_email}</p>
                    <p>{sub.content.substring(0, 200)}...</p>
                    <p>
                      Status: <span className={`status status-${sub.status}`}>{sub.status}</span>
                    </p>
                    {sub.rating ? (
                      <p>Rating: {'★'.repeat(sub.rating)}{'☆'.repeat(5 - sub.rating)}</p>
                    ) : (
                      <Link to={`/submissions/${sub.id}/review`} className="btn btn-small">
                        Review
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <Link to="/projects" className="link">← Back to Projects</Link>
    </div>
  );
}
