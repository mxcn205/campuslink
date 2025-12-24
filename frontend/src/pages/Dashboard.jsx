import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getProjects, getMyProjects, getMyApplications, getMySubmissions } from '../api/client';
import ProjectCard from '../components/ProjectCard';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({});
  const [recentProjects, setRecentProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (user.role === 'company') {
          const projectsRes = await getMyProjects();
          setStats({
            totalProjects: projectsRes.data.projects.length,
            openProjects: projectsRes.data.projects.filter(p => p.status === 'open').length,
            totalApplications: projectsRes.data.projects.reduce((sum, p) => sum + (p.application_count || 0), 0),
            totalSubmissions: projectsRes.data.projects.reduce((sum, p) => sum + (p.submission_count || 0), 0)
          });
          setRecentProjects(projectsRes.data.projects.slice(0, 3));
        } else {
          const [projectsRes, applicationsRes, submissionsRes] = await Promise.all([
            getProjects(),
            getMyApplications(),
            getMySubmissions()
          ]);
          setStats({
            availableProjects: projectsRes.data.projects.length,
            totalApplications: applicationsRes.data.applications.length,
            pendingApplications: applicationsRes.data.applications.filter(a => a.status === 'pending').length,
            totalSubmissions: submissionsRes.data.submissions.length
          });
          setRecentProjects(projectsRes.data.projects.slice(0, 3));
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user.role]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <div className="dashboard-header">
        <h2>Welcome, {user.name}!</h2>
        <p>{user.role === 'company' ? 'Company' : 'Student'} at {user.university}</p>
      </div>

      <div className="grid" style={{ marginBottom: '30px' }}>
        {user.role === 'company' ? (
          <>
            <div className="card">
              <h3>{stats.totalProjects}</h3>
              <p>Total Projects</p>
            </div>
            <div className="card">
              <h3>{stats.openProjects}</h3>
              <p>Open Projects</p>
            </div>
            <div className="card">
              <h3>{stats.totalApplications}</h3>
              <p>Applications Received</p>
            </div>
            <div className="card">
              <h3>{stats.totalSubmissions}</h3>
              <p>Submissions Received</p>
            </div>
          </>
        ) : (
          <>
            <div className="card">
              <h3>{stats.availableProjects}</h3>
              <p>Available Projects</p>
            </div>
            <div className="card">
              <h3>{stats.totalApplications}</h3>
              <p>My Applications</p>
            </div>
            <div className="card">
              <h3>{stats.pendingApplications}</h3>
              <p>Pending Applications</p>
            </div>
            <div className="card">
              <h3>{stats.totalSubmissions}</h3>
              <p>My Submissions</p>
            </div>
          </>
        )}
      </div>

      <div className="actions" style={{ marginBottom: '20px' }}>
        {user.role === 'company' ? (
          <Link to="/projects/create" className="btn btn-success">Post New Project</Link>
        ) : (
          <Link to="/projects" className="btn">Browse Projects</Link>
        )}
      </div>

      <h3 style={{ marginBottom: '15px' }}>
        {user.role === 'company' ? 'Your Recent Projects' : 'Recent Projects'}
      </h3>
      <div className="grid">
        {recentProjects.map(project => (
          <ProjectCard key={project.id} project={{
            ...project,
            company_name: user.role === 'company' ? user.name : project.company_name,
            company_university: user.role === 'company' ? user.university : project.company_university
          }} />
        ))}
      </div>
    </div>
  );
}
