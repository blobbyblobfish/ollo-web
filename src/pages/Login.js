import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import AuthCard from '../AuthCard';
import { friendly, isValidEmail, sendSignInLink } from '../auth';

const Login = () => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  const submit = async (e) => {
    e.preventDefault();
    if (!isValidEmail(email)) {
      setError('Please enter a valid email so we can send your link.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await sendSignInLink(email);
      setSent(true);
    } catch (err) {
      setError(friendly(err));
    }
    setBusy(false);
  };

  let body;
  if (user) {
    body = (
      <>
        <div className="done-seal">✦</div>
        <h2 className="auth-title">You're already signed in.</h2>
        <p className="auth-lead">Pick up right where you left off.</p>
        <Link to="/start" className="btn btn-gold btn-lg" style={{ marginTop: 24 }}>
          Continue my saga →
        </Link>
      </>
    );
  } else if (sent) {
    body = (
      <>
        <div className="done-seal">✉</div>
        <h2 className="auth-title">Check your inbox.</h2>
        <p className="auth-lead">
          We sent a sign-in link to <strong>{email}</strong>. Tap it on this
          device to log in.
        </p>
        <p className="auth-alt">
          <button className="link-btn" onClick={() => setSent(false)}>
            Use a different email
          </button>
        </p>
      </>
    );
  } else {
    body = (
      <>
        <p className="eyebrow">Welcome back</p>
        <h2 className="auth-title">Log in to your account.</h2>
        <p className="auth-lead">
          Enter your email and we'll send a one-tap sign-in link — no password
          needed.
        </p>
        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="login-email">Email address</label>
            <input
              id="login-email"
              type="email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          {error && <p className="trial-error">{error}</p>}
          <button type="submit" className="btn btn-gold btn-lg" disabled={busy}>
            {busy ? 'Sending…' : 'Email me a sign-in link →'}
          </button>
          <p className="auth-alt">
            New here? <Link to="/start">Register →</Link>
          </p>
        </form>
      </>
    );
  }

  return <AuthCard>{body}</AuthCard>;
};

export default Login;
