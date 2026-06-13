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

const isValidPhone = (v) => v.replace(/\D/g, '').length >= 10;

/* Reject if a promise (e.g. a hanging Firestore read) doesn't settle in time,
   so the UI never spins forever. */
const withTimeout = (promise, ms = 12000) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(
        () => reject(Object.assign(new Error('timeout'), { code: 'timeout' })),
        ms
      )
    ),
  ]);

const Start = () => {
  // loading|account|sent|finishing|welcome|storyteller|delivery|week|done
  const [phase, setPhase] = useState('loading');
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Onboarding selections
  const [tier, setTier] = useState('free'); // free|keepsake|saga|legacy
  const [storyteller, setStoryteller] = useState({
    who: null, // 'self' | 'other'
    name: '',
    relationship: '',
  });
  const [contact, setContact] = useState({ email: '', phone: '' });
  const [delivery, setDelivery] = useState({ text: false, email: true, phone: false });

  const [campaign, setCampaign] = useState(null);

  const finishingRef = useRef(false);
  const phoneEnabled = tier === 'legacy';

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
        const snap = await withTimeout(getDoc(ref));
        if (cancelled) return;
        if (snap.exists()) {
          const data = snap.data();
          setTier(data.tier || 'free');
          if (data.storyteller) {
            setStoryteller({
              who: data.storyteller.who || null,
              name: data.storyteller.name || '',
              relationship: data.storyteller.relationship || '',
            });
          }
          setContact({
            email: data.contact?.email || user.email || '',
            phone: data.contact?.phone || '',
          });
          if (data.delivery) {
            setDelivery({
              text: !!data.delivery.text,
              email: !!data.delivery.email,
              phone: !!data.delivery.phone,
            });
          }
          if (data.campaign) {
            setCampaign(data.campaign);
            setPhase('active');
          } else {
            setPhase('welcome');
          }
        } else {
          await withTimeout(
            setDoc(
              ref,
              { email: user.email, createdAt: serverTimestamp() },
              { merge: true }
            )
          );
          if (!cancelled) {
            setContact({ email: user.email || '', phone: '' });
            setPhase('welcome');
          }
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

  const persistOnboarding = async (extra = {}) =>
    setDoc(
      doc(db, 'users', user.uid),
      { storyteller, contact, delivery, updatedAt: serverTimestamp(), ...extra },
      { merge: true }
    );

  const toggleChannel = (key) =>
    setDelivery((d) => ({ ...d, [key]: !d[key] }));

  const submitStoryteller = async () => {
    if (!storyteller.who) {
      setError('Please choose who the storyteller is.');
      return;
    }
    if (!storyteller.name.trim()) {
      setError(
        storyteller.who === 'self'
          ? 'Please enter your name.'
          : "Please enter the storyteller's name."
      );
      return;
    }
    setError('');
    setBusy(true);
    try {
      await persistOnboarding();
      setPhase('delivery');
    } catch (err) {
      setError(friendly(err));
    }
    setBusy(false);
  };

  const submitDelivery = async () => {
    if (!delivery.text && !delivery.email && !delivery.phone) {
      setError('Pick at least one way to receive prompts.');
      return;
    }
    if (delivery.email && !isValidEmail(contact.email)) {
      setError('Add a valid email address for email delivery.');
      return;
    }
    if ((delivery.text || delivery.phone) && !isValidPhone(contact.phone)) {
      setError('Add a valid phone number for text or call delivery.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      // Launch a daily-prompt campaign. A scheduled backend job reads active
      // campaigns and sends PROMPTS[currentIndex] via the chosen channels,
      // advancing one per day.
      const newCampaign = {
        status: 'active',
        cadence: 'daily',
        total: PROMPTS.length,
        currentIndex: 0,
        startedAt: serverTimestamp(),
        nextSendAt: null, // null = send the first prompt on the next run
        lastSentAt: null,
      };
      await persistOnboarding({ onboarded: true, campaign: newCampaign });
      setCampaign(newCampaign);
      setPhase('active');
    } catch (err) {
      setError(friendly(err));
    }
    setBusy(false);
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setUser(null);
    setCampaign(null);
    setPhase('account');
  };

  /* ---------- shell ---------- */
  const STEP_PROGRESS = { welcome: 12, storyteller: 45, delivery: 78 };
  const progress = phase === 'active' ? 100 : STEP_PROGRESS[phase] || 0;

  /* ---------- auth phases: shared centered card (consistent with /login) ---------- */
  if (phase === 'loading' || phase === 'finishing') {
    return (
      <AuthCard>
        {error ? (
          <>
            <div className="done-seal">⚠️</div>
            <h2 className="auth-title">We hit a snag.</h2>
            <p className="auth-lead">{error}</p>
            <button
              className="btn btn-gold btn-lg"
              onClick={() => window.location.reload()}
            >
              Try again
            </button>
            {user && (
              <p className="auth-alt">
                <button className="link-btn" onClick={handleSignOut}>
                  Sign out
                </button>
              </p>
            )}
          </>
        ) : (
          <>
            <div className="done-seal">✦</div>
            <h2 className="auth-title">
              {phase === 'finishing' ? 'Signing you in…' : 'One moment…'}
            </h2>
            <p className="auth-lead">Getting your saga ready.</p>
          </>
        )}
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
        <h2>Welcome — let's set up your free week.</h2>
        <p className="q-help">
          Two quick questions and you'll be ready to go: who the stories are for,
          and how they'd like to receive each prompt. Everything saves
          automatically.
        </p>
        {error && <p className="trial-error">{error}</p>}
        <div className="onboard-actions">
          <span />
          <button
            className="btn btn-gold btn-lg"
            onClick={() => {
              setError('');
              setPhase('storyteller');
            }}
          >
            Let's begin →
          </button>
        </div>
      </>
    );
  } else if (phase === 'storyteller') {
    content = (
      <>
        <p className="step-eyebrow">Step 1 of 2 · Storyteller</p>
        <h2>Whose stories are we preserving?</h2>
        <p className="q-help">You can always add more storytellers later.</p>

        <div className="option-grid cols-2">
          <button
            className={`option ${storyteller.who === 'self' ? 'selected' : ''}`}
            onClick={() => setStoryteller((s) => ({ ...s, who: 'self' }))}
          >
            <span className="opt-ico">🙋</span>
            <span>
              <span className="opt-title">Myself</span>
              <span className="opt-desc">
                I'll answer the prompts and tell my own story.
              </span>
            </span>
            <span className="opt-check">✓</span>
          </button>
          <button
            className={`option ${storyteller.who === 'other' ? 'selected' : ''}`}
            onClick={() => setStoryteller((s) => ({ ...s, who: 'other' }))}
          >
            <span className="opt-ico">💌</span>
            <span>
              <span className="opt-title">Someone else</span>
              <span className="opt-desc">
                A parent, grandparent, or loved one — we'll guide them.
              </span>
            </span>
            <span className="opt-check">✓</span>
          </button>
        </div>

        {storyteller.who && (
          <div className="onboard-fields">
            <div className="field">
              <label htmlFor="st-name">
                {storyteller.who === 'self' ? 'Your name' : "Storyteller's name"}
              </label>
              <input
                id="st-name"
                type="text"
                value={storyteller.name}
                onChange={(e) =>
                  setStoryteller((s) => ({ ...s, name: e.target.value }))
                }
                placeholder={
                  storyteller.who === 'self' ? 'Your name' : 'e.g. Grandma Rose'
                }
              />
            </div>
            {storyteller.who === 'other' && (
              <div className="field">
                <label htmlFor="st-rel">
                  Your relationship to them{' '}
                  <span className="optional">(optional)</span>
                </label>
                <input
                  id="st-rel"
                  type="text"
                  value={storyteller.relationship}
                  onChange={(e) =>
                    setStoryteller((s) => ({
                      ...s,
                      relationship: e.target.value,
                    }))
                  }
                  placeholder="e.g. granddaughter"
                />
              </div>
            )}
          </div>
        )}

        {error && <p className="trial-error">{error}</p>}
        <div className="onboard-actions">
          <button className="link-btn" onClick={() => setPhase('welcome')}>
            ← Back
          </button>
          <button
            className="btn btn-gold btn-lg"
            onClick={submitStoryteller}
            disabled={busy || !storyteller.who}
          >
            {busy ? 'Saving…' : 'Continue →'}
          </button>
        </div>
      </>
    );
  } else if (phase === 'delivery') {
    const stName =
      storyteller.who === 'self'
        ? 'you'
        : storyteller.name.trim().split(/\s+/)[0] || 'they';
    content = (
      <>
        <p className="step-eyebrow">Step 2 of 2 · Delivery</p>
        <h2>How should {stName} receive each prompt?</h2>
        <p className="q-help">
          Pick one or more — we'll send a new prompt every day.
        </p>

        <div className="option-grid">
          <button
            className={`option ${delivery.text ? 'selected' : ''}`}
            onClick={() => toggleChannel('text')}
          >
            <span className="opt-ico">📱</span>
            <span>
              <span className="opt-title">Text message</span>
              <span className="opt-desc">A daily prompt by SMS.</span>
            </span>
            <span className="opt-check">✓</span>
          </button>

          <button
            className={`option ${delivery.email ? 'selected' : ''}`}
            onClick={() => toggleChannel('email')}
          >
            <span className="opt-ico">✉️</span>
            <span>
              <span className="opt-title">Email</span>
              <span className="opt-desc">A daily prompt in their inbox.</span>
            </span>
            <span className="opt-check">✓</span>
          </button>

          <button
            className={`option ${delivery.phone ? 'selected' : ''}`}
            onClick={() => phoneEnabled && toggleChannel('phone')}
            disabled={!phoneEnabled}
          >
            <span className="opt-ico">📞</span>
            <span>
              <span className="opt-title">
                Phone call
                {!phoneEnabled && <span className="opt-lock">Legacy</span>}
              </span>
              <span className="opt-desc">
                {phoneEnabled
                  ? 'We call, chat, and record their answer.'
                  : 'A real call to capture their voice — available on the Legacy plan.'}
              </span>
            </span>
            <span className="opt-check">✓</span>
          </button>
        </div>

        {delivery.email && (
          <div className="field">
            <label htmlFor="dl-email">Email address</label>
            <input
              id="dl-email"
              type="email"
              value={contact.email}
              onChange={(e) =>
                setContact((c) => ({ ...c, email: e.target.value }))
              }
              placeholder="name@email.com"
            />
          </div>
        )}
        {(delivery.text || delivery.phone) && (
          <div className="field">
            <label htmlFor="dl-phone">Phone number</label>
            <input
              id="dl-phone"
              type="tel"
              value={contact.phone}
              onChange={(e) =>
                setContact((c) => ({ ...c, phone: e.target.value }))
              }
              placeholder="(555) 123-4567"
            />
          </div>
        )}

        {error && <p className="trial-error">{error}</p>}
        <div className="onboard-actions">
          <button className="link-btn" onClick={() => setPhase('storyteller')}>
            ← Back
          </button>
          <button
            className="btn btn-gold btn-lg"
            onClick={submitDelivery}
            disabled={busy}
          >
            {busy ? 'Launching…' : 'Start daily prompts →'}
          </button>
        </div>
      </>
    );
  } else {
    /* phase === 'active' — daily campaign is live */
    const firstName =
      storyteller.who === 'self'
        ? 'You'
        : storyteller.name.trim().split(/\s+/)[0] || 'Your storyteller';
    const channels = [
      delivery.text && 'text',
      delivery.email && 'email',
      delivery.phone && 'phone call',
    ].filter(Boolean);
    const channelLabel =
      channels.length <= 1
        ? channels[0] || 'their chosen channel'
        : channels.slice(0, -1).join(', ') + ' and ' + channels.slice(-1);
    const deliveredTo = [
      delivery.email && contact.email,
      (delivery.text || delivery.phone) && contact.phone,
    ]
      .filter(Boolean)
      .join(' · ');
    content = (
      <>
        <div className="done-card">
          <div className="done-seal">✦</div>
          <h2>
            {storyteller.who === 'self'
              ? "You're all set."
              : `${firstName} is all set.`}
          </h2>
          <p className="q-help">
            The free week has begun. {firstName} will get{' '}
            <strong>one prompt a day</strong> via {channelLabel} — just reply to
            each message and every answer is saved to your private archive.
          </p>
        </div>

        <div className="onboard-summary">
          <div className="row">
            <span className="k">Cadence</span>
            <span className="v">
              One prompt per day · {campaign?.total ?? PROMPTS.length} days
            </span>
          </div>
          <div className="row">
            <span className="k">Delivered to</span>
            <span className="v">{deliveredTo}</span>
          </div>
          <div className="row">
            <span className="k">First prompt</span>
            <span className="v">“{PROMPTS[0].q}”</span>
          </div>
        </div>

        <div className="trial-cta-row">
          <button className="btn btn-ghost" onClick={() => setPhase('delivery')}>
            Change delivery settings
          </button>
          <Link to="/" className="link-btn">
            Back to home
          </Link>
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
