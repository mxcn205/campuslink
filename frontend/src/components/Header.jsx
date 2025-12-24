import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="header">
      <h1>
        <Link to="/" style={{ color: 'white', textDecoration: 'none' }}>
          UniFreelance
        </Link>
      </h1>
      <nav>
        {user ? (
          <>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/projects">Browse Projects</Link>
            {user.role === 'company' && <Link to="/my-projects">My Projects</Link>}
            {user.role === 'student' && <Link to="/my-applications">My Applications</Link>}
            {user.role === 'student' && <Link to="/my-submissions">My Submissions</Link>}
            <span style={{ color: '#bdc3c7' }}>
              {user.name} ({user.role})
            </span>
            <button onClick={logout}>Logout</button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </>
        )}
      </nav>
    </header>
  );
}
