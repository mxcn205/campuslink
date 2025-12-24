import { Link } from 'react-router-dom';

export default function ProjectCard({ project }) {
  const skills = project.skills.split(',').map(s => s.trim());

  return (
    <div className="card">
      <h3>
        <Link to={`/projects/${project.id}`} className="link">
          {project.title}
        </Link>
      </h3>
      <p className="card-meta">
        Posted by {project.company_name} - {project.company_university}
      </p>
      <p>{project.description.substring(0, 150)}...</p>
      <div className="skills-list">
        {skills.map((skill, index) => (
          <span key={index} className="skill-tag">{skill}</span>
        ))}
      </div>
      <span className={`status status-${project.status}`}>
        {project.status.replace('_', ' ')}
      </span>
    </div>
  );
}
