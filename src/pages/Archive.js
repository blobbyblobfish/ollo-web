import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs } from 'firebase/firestore';
import { ref, getBlob } from 'firebase/storage';
import { auth, db, storage } from '../firebase';
import { PROMPTS } from '../prompts';

/* Owner-authed media fetch. getBlob works regardless of download tokens
   (objects were uploaded via raw signed URLs, which have none). */
async function resolveUrls(paths = []) {
  const out = [];
  for (const p of paths) {
    try {
      const blob = await getBlob(ref(storage, p));
      out.push(URL.createObjectURL(blob));
    } catch {
      /* skip media we can't load */
    }
  }
  return out;
}

const Archive = () => {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(
    () =>
      onAuthStateChanged(auth, (u) => {
        setUser(u);
        setAuthReady(true);
      }),
    []
  );

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const qs = await getDocs(collection(db, 'users', user.uid, 'responses'));
        const rows = qs.docs
          .map((d) => d.data())
          .sort((a, b) => (a.promptIndex || 0) - (b.promptIndex || 0));
        const enriched = [];
        for (const r of rows) {
          enriched.push({
            ...r,
            photoUrls: await resolveUrls(r.photos),
            audioUrls: await resolveUrls(r.audio),
          });
        }
        if (!cancelled) setStories(enriched);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  let body;
  if (authReady && !user) {
    body = (
      <div className="archive-empty">
        <h2 className="section-title">Please log in to view your archive.</h2>
        <Link to="/login" className="btn btn-gold btn-lg">
          Log in
        </Link>
      </div>
    );
  } else if (loading) {
    body = <p className="q-help">Gathering your stories…</p>;
  } else if (stories.length === 0) {
    body = (
      <div className="archive-empty">
        <div className="done-seal">✦</div>
        <h2 className="section-title">Your archive is waiting.</h2>
        <p className="section-lead">
          As prompts are answered, every story, photo, and recording will collect
          here.
        </p>
        <Link to="/start" className="btn btn-ghost">
          Back to dashboard
        </Link>
      </div>
    );
  } else {
    body = (
      <div className="archive-stories">
        {stories.map((s) => (
          <article className="archive-story" key={s.promptIndex}>
            <span className="archive-day">
              {PROMPTS[s.promptIndex]?.day || `Day ${s.promptIndex + 1}`}
            </span>
            <h2 className="archive-story-q">{s.promptText}</h2>
            {s.text && <p className="archive-story-text">{s.text}</p>}
            {s.audioUrls.length > 0 && (
              <div className="archive-audios">
                {s.audioUrls.map((url, i) => (
                  <audio key={i} src={url} controls />
                ))}
              </div>
            )}
            {s.photoUrls.length > 0 && (
              <div className="archive-photos">
                {s.photoUrls.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noreferrer">
                    <img src={url} alt="" />
                  </a>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>
    );
  }

  return (
    <div className="archive-page">
      <header className="archive-top">
        <Link to="/" className="brand">
          <img src={`${process.env.PUBLIC_URL}/logo.svg`} alt="Our Love Lives On" />
          <span className="brand-name">Our Love Lives On</span>
        </Link>
        <Link to="/start" className="link-btn">
          My dashboard
        </Link>
      </header>
      <div className="archive-wrap">
        <p className="eyebrow">Your family archive</p>
        <h1 className="section-title">The saga so far</h1>
        {body}
      </div>
    </div>
  );
};

export default Archive;
