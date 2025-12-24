import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMyProjects } from '../api/client';

export default function MyProjects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await getMyProjects();
        setProjects(res.data.projects);
      } catch (error) {
        console.error('Error fetching projects:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 className="page-title" style={{ margin: 0 }}>My Projects</h2>
        <Link to="/projects/create" className="btn btn-success">Post New Project</Link>
      </div>

      {projects.length === 0 ? (
        <div className="card">
          <p>You haven't posted any projects yet.</p>
          <Link to="/projects/create" className="btn" style={{ marginTop: '10px' }}>
            Post Your First Project
          </Link>
        </div>
      ) : (
        <div className="grid">
          {projects.map(project => (
            <div key={project.id} className="card">
              <h3>
                <Link to={`/projects/${project.id}`} className="link">
                  {project.title}
                </Link>
              </h3>
              <p>{project.description.substring(0, 100)}...</p>
              <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                <span className={`status status-${project.status}`}>
                  {project.status.replace('_', ' ')}
                </span>
                <span>{project.application_count || 0} applications</span>
                <span>{project.submission_count || 0} submissions</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
