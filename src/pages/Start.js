import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  onAuthStateChanged,
  isSignInWithEmailLink,
  signInWithEmailLink,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { PROMPTS } from '../prompts';
import { EMAIL_KEY, friendly, isValidEmail, sendSignInLink } from '../auth';
import AuthCard from '../AuthCard';

const Start = () => {
  const [phase, setPhase] = useState('loading'); // loading|account|sent|finishing|welcome|week|done
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [answers, setAnswers] = useState(() => Array(PROMPTS.length).fill(''));
  const [index, setIndex] = useState(0);

  const finishingRef = useRef(false);

  /* 1. Complete an email-link sign-in if we arrived from one. */
  useEffect(() => {
    if (
      isSignInWithEmailLink(auth, window.location.href) &&
      !finishingRef.current
    ) {
      finishingRef.current = true;
      setPhase('finishing');
      let stored = window.localStorage.getItem(EMAIL_KEY);
      if (!stored) {
        stored =
          window.prompt('Please confirm the email you used to sign in') || '';
      }
      signInWithEmailLink(auth, stored, window.location.href)
        .then(() => {
          window.localStorage.removeItem(EMAIL_KEY);
          window.history.replaceState({}, document.title, '/start');
        })
        .catch((err) => {
          setError(friendly(err));
          finishingRef.current = false;
          setPhase('account');
        });
    }
  }, []);

  /* 2. Track auth state. */
  useEffect(
    () =>
      onAuthStateChanged(auth, (u) => {
        setUser(u);
        setAuthReady(true);
      }),
    []
  );

  /* 3. No user once auth resolves → show the account step. */
  useEffect(() => {
    if (authReady && !user && phase === 'loading') setPhase('account');
  }, [authReady, user, phase]);

  /* 4. User signed in → load (or create) their saga and place them in the flow. */
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const ref = doc(db, 'users', user.uid);
        const snap = await getDoc(ref);
        if (cancelled) return;
        if (snap.exists()) {
          const data = snap.data();
          const wk = data.week || {};
          const loaded = PROMPTS.map((_, i) => wk[i] || '');
          setAnswers(loaded);
          if (data.completed) {
            setPhase('done');
            return;
          }
          const nextUnanswered = loaded.findIndex((a) => !a.trim());
          setIndex(nextUnanswered === -1 ? 0 : nextUnanswered);
          setPhase(data.startedWeek ? 'week' : 'welcome');
        } else {
          await setDoc(
            ref,
            { email: user.email, createdAt: serverTimestamp() },
            { merge: true }
          );
          if (!cancelled) setPhase('welcome');
        }
      } catch (err) {
        if (!cancelled) setError(friendly(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  /* ---------- actions ---------- */
  const sendLink = async (e) => {
    e.preventDefault();
    if (!isValidEmail(email)) {
      setError('Please enter a valid email so we can send your link.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await sendSignInLink(email);
      setPhase('sent');
    } catch (err) {
      setError(friendly(err));
    }
    setBusy(false);
  };

  const persist = async (extra = {}) => {
    if (!user) return;
    const week = {};
    answers.forEach((a, i) => {
      week[i] = a;
    });
    await setDoc(
      doc(db, 'users', user.uid),
      { week, startedWeek: true, updatedAt: serverTimestamp(), ...extra },
      { merge: true }
    );
  };

  const setAnswer = (text) =>
    setAnswers((a) => {
      const next = a.slice();
      next[index] = text;
      return next;
    });

  const startWeek = async () => {
    setPhase('week');
    persist().catch((err) => setError(friendly(err)));
  };

  const goNext = async () => {
    setBusy(true);
    try {
      const isLast = index >= PROMPTS.length - 1;
      await persist(isLast ? { completed: true } : {});
      if (isLast) setPhase('done');
      else setIndex((i) => i + 1);
    } catch (err) {
      setError(friendly(err));
    }
    setBusy(false);
  };

  const goBack = () => setIndex((i) => Math.max(0, i - 1));

  const handleSignOut = async () => {
    await signOut(auth);
    setUser(null);
    setAnswers(Array(PROMPTS.length).fill(''));
    setIndex(0);
    setPhase('account');
  };

  /* ---------- shell ---------- */
  const progress =
    phase === 'week'
      ? ((index + 1) / PROMPTS.length) * 100
      : phase === 'done'
      ? 100
      : phase === 'welcome'
      ? 8
      : 0;

  /* ---------- auth phases: shared centered card (consistent with /login) ---------- */
  if (phase === 'loading' || phase === 'finishing') {
    return (
      <AuthCard>
        <div className="done-seal">✦</div>
        <h2 className="auth-title">
          {phase === 'finishing' ? 'Signing you in…' : 'One moment…'}
        </h2>
        <p className="auth-lead">Getting your saga ready.</p>
      </AuthCard>
    );
  }

  if (phase === 'account') {
    return (
      <AuthCard>
        <p className="eyebrow">Start your free week</p>
        <h2 className="auth-title">Create your account.</h2>
        <p className="auth-lead">
          Enter your email and we'll send a one-tap sign-in link — no password to
          remember. Your stories save to your account as you go.
        </p>
        <form onSubmit={sendLink}>
          <div className="field">
            <label htmlFor="start-email">Email address</label>
            <input
              id="start-email"
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
            Already have an account? <Link to="/login">Log in</Link>
          </p>
        </form>
      </AuthCard>
    );
  }

  if (phase === 'sent') {
    return (
      <AuthCard>
        <div className="done-seal">✉</div>
        <h2 className="auth-title">Check your inbox.</h2>
        <p className="auth-lead">
          We sent a sign-in link to <strong>{email}</strong>. Tap it on this
          device to start your free week. You can close this tab.
        </p>
        <p className="auth-alt">
          <button className="link-btn" onClick={() => setPhase('account')}>
            Use a different email
          </button>
        </p>
      </AuthCard>
    );
  }

  /* ---------- onboarding phases: full-screen wizard ---------- */
  let content;

  if (phase === 'welcome') {
    content = (
      <>
        <p className="step-eyebrow">You're in 🎉</p>
        <h2>Welcome — let's preserve your first week.</h2>
        <p className="q-help">
          Over the next seven prompts we'll help you capture stories worth keeping.
          Answer one a day or breeze through them all — there's no wrong pace, and
          everything saves to your account automatically.
        </p>
        {error && <p className="trial-error">{error}</p>}
        <div className="onboard-actions">
          <span />
          <button className="btn btn-gold btn-lg" onClick={startWeek}>
            Begin Day 1 →
          </button>
        </div>
      </>
    );
  } else if (phase === 'done') {
    const written = PROMPTS.map((p, i) => ({ ...p, answer: answers[i] })).filter(
      (p) => p.answer.trim()
    );
    const words = answers.join(' ').trim().split(/\s+/).filter(Boolean).length;
    content = (
      <>
        <div className="done-card">
          <div className="done-seal">✦</div>
          <h2>Look what you made.</h2>
          <p className="q-help">
            Your first week is saved to your account — {written.length}{' '}
            {written.length === 1 ? 'story' : 'stories'}, {words} words. This is how
            a saga begins.
          </p>
        </div>

        {written.length > 0 && (
          <div className="recap-list">
            {written.map((p) => (
              <div className="recap-item" key={p.day}>
                <span className="recap-day">{p.day}</span>
                <p className="recap-q">{p.q}</p>
                <p className="recap-a">{p.answer}</p>
              </div>
            ))}
          </div>
        )}

        <div className="trial-cta-row">
          <button
            className="btn btn-gold btn-lg"
            onClick={() => {
              setIndex(0);
              setPhase('week');
            }}
          >
            Review or keep editing
          </button>
          <Link to="/" className="link-btn">
            Back to home
          </Link>
        </div>
      </>
    );
  } else {
    /* phase === 'week' */
    const current = PROMPTS[index];
    const isLast = index === PROMPTS.length - 1;
    content = (
      <>
        <p className="step-eyebrow">
          {current.day} of {PROMPTS.length}
        </p>
        <h2>{current.q}</h2>
        <p className="q-help">{current.help}</p>

        <textarea
          className="trial-textarea"
          placeholder="Start anywhere…"
          value={answers[index]}
          onChange={(e) => setAnswer(e.target.value)}
          rows={8}
        />
        {error && <p className="trial-error">{error}</p>}

        <div className="onboard-actions">
          <button className="link-btn" onClick={goBack} disabled={index === 0}>
            ← Back
          </button>
          <div className="trial-actions-right">
            <button className="link-btn" onClick={goNext} disabled={busy}>
              Skip
            </button>
            <button className="btn btn-primary" onClick={goNext} disabled={busy}>
              {busy ? 'Saving…' : isLast ? 'Finish my week' : 'Save & continue →'}
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="onboard">
      <div className="onboard-top">
        <Link to="/" className="brand">
          <img src={`${process.env.PUBLIC_URL}/logo.svg`} alt="Our Love Lives On" />
          <span className="brand-name">Our Love Lives On</span>
        </Link>
        {user ? (
          <button className="link-btn" onClick={handleSignOut}>
            Sign out
          </button>
        ) : (
          <Link to="/" className="link-btn">
            Back to site
          </Link>
        )}
      </div>
      <div className="onboard-progress">
        <div className="bar" style={{ width: `${progress}%` }} />
      </div>
      <div className="onboard-body">
        <div className="onboard-step">{content}</div>
      </div>
    </div>
  );
};

export default Start;
