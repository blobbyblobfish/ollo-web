import Nav from './Nav';

/* Shared shell for the auth screens (log in + create account) so they look
   identical: the site nav over a centered card on the warm paper background. */
const AuthCard = ({ children }) => (
  <>
    <Nav />
    <div className="auth-page">
      <div className="auth-card">{children}</div>
    </div>
  </>
);

export default AuthCard;
