
import { Link } from 'react-router-dom';

const Nav = () => {
  return (
    <nav className="main-nav">
      <ul>
        <li><Link to="/"><button>Home</button></Link></li>
        <li><Link to="/about"><button>About</button></Link></li>
        <li><a href="https://newsletter.starlightsaga.com" target="_blank" rel="noopener noreferrer"><button>Newsletter</button></a></li>
      </ul>
    </nav>
  );
};

export default Nav;
