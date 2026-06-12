import { Link } from 'react-router-dom';

const Nav = () => {
  return (
    <nav className="main-nav">
      <div className="nav-inner">
        <Link to="/" className="brand">
          <img src={`${process.env.PUBLIC_URL}/logo.svg`} alt="Our Love Lives On" />
          <span className="brand-name">Our Love Lives On</span>
        </Link>
        <ul className="nav-links">
          <li><Link to="/login">Log in</Link></li>
          <li>
            <Link to="/start" className="btn btn-primary nav-cta">Sign up - start free week</Link>
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default Nav;
