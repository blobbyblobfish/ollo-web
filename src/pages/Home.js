import { useState } from 'react';
import { Link } from 'react-router-dom';
import Nav from '../Nav';

const PROMPT_SETS = {
  childhood: {
    label: 'Childhood',
    q: 'What was the house you grew up in like?',
    meta: ['1940s', 'Pittsburgh, PA', 'Mom'],
  },
  love: {
    label: 'Love & Family',
    q: 'How did you know your partner was the one?',
    meta: ['1968', 'First dance', 'Dad'],
  },
  wisdom: {
    label: 'Wisdom',
    q: 'What advice would you give your great-grandchildren?',
    meta: ['Legacy', 'For the future', 'Grandpa'],
  },
};

const Home = () => {
  const [activePrompt, setActivePrompt] = useState('childhood');

  const prompt = PROMPT_SETS[activePrompt];

  return (
    <div className="App">
      <Nav />
      {/* ---------- Hero ---------- */}
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-content">
            <span className="kicker">✦ Your family's stories, preserved forever</span>
            <h1>
              Pass down the stories you cherish,{' '}
              <em>eternally</em>.
            </h1>
            <p className="hero-sub">
              Answer one custom prompt at a time - turn a lifetime of stories,
              photos, and voice into a keepsake that lasts for generations.
            </p>
            <div className="hero-actions">
              <Link className="btn btn-gold btn-lg" to="/start">
                Start your free week
              </Link>
              <a className="btn btn-ghost btn-lg" href="#how">
                Learn more
              </a>
            </div>
            <p className="hero-note">
              Try a week free - no credit card. Pay once, yours forever — no
              subscriptions, no investors, no ads.
            </p>
          </div>
        </div>
      </section>

      {/* ---------- Trust strip ---------- */}
      <div className="trust-strip">
        Unlike competitor products, your stories don't disappear — they're preserved by our{' '}
        <strong>Perpetuity Fund</strong>, forever.
      </div>

      {/* ---------- Why (emotional narrative) ---------- */}
      <section className="section bg-paper-2" id="how">
        <div className="container">
          <div className="split split--reverse narrative">
            <div className="split-text">
              <p className="eyebrow">Why I built this</p>
              <h2 className="section-title">
                Learn their life. Leave their legacy.
              </h2>
              <p>
                This is my dad. He doesn't talk much about himself.
              </p>
              <p>
                One day, my in-laws got a story out of him about how he summited the tallest mountain in the continental U.S. when he was 68.
              </p>
              <p className="narrative-pull">
                I said, <em>"You never told me that."</em> He said, "I told you —
                that I went hiking."
              </p>
              <p>
                I'm building Our Love Lives On so that I can learn all about his crazy, unbelievable life. So that I don't have to worry that my future children will never know who he was. So that all of the stories I heard once or twice have a place to be heard forever.
              </p>
              <p className="signature">— Alice Onuffer, founder</p>
            </div>
            <figure className="split-media narrative-photo">
              <img src={`${process.env.PUBLIC_URL}/1.jpg`} alt="Alice's father" />
              <figcaption>My dad — the reason this exists.</figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* ---------- Prompt-choice showcase ---------- */}
      <section className="section bg-paper-2">
        <div className="container">
          <div className="split">
            <div className="split-text">
              <p className="eyebrow">A memory project that will actually get done</p>
              <h2 className="section-title">
                Tell us who you want to capture. We'll do the rest.
              </h2>
              <p className="section-lead">
                Just sign up yourself or your loved one and we'll guide the
                conversation. Every prompt can be answered in writing, with voice,
                or over the phone.
              </p>
            </div>
            <div className="split-media">
              <div className="prompt-card">
                <div className="prompt-toggle">
                  {Object.entries(PROMPT_SETS).map(([key, set]) => (
                    <button
                      key={key}
                      className={key === activePrompt ? 'active' : ''}
                      onClick={() => setActivePrompt(key)}
                    >
                      {set.label}
                    </button>
                  ))}
                </div>
                <div className="prompt-preview">
                  <p className="prompt-label">This week's prompt</p>
                  <p className="prompt-q">{prompt.q}</p>
                  <div className="prompt-meta">
                    {prompt.meta.map((m) => (
                      <span className="chip" key={m}>
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="answer-modes">
                  <span>✍️ Write it</span>
                  <span>🎙️ Record your voice</span>
                  <span>📞 Answer by phone</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Outputs ---------- */}
      <section className="section">
        <div className="container center">
          <p className="eyebrow">What you get</p>
          <h2 className="section-title">One life, preserved every way that matters</h2>
          <div className="outputs">
            <div className="output-card">
              <span className="ico">🔒</span>
              <h3>Private Digital Archive</h3>
              <p>
                A secure online home for the whole saga — every story, photo, and
                voice recording in their real voice. You decide exactly who can
                read, listen, and contribute.
              </p>
            </div>
            <div className="output-card">
              <span className="ico">📖</span>
              <h3>Print On Demand Heirlooms</h3>
              <p>
                Turn the archive into a beautifully typeset hardcover whenever you
                like — printed on demand and shipped to your door, in as many
                copies as your family needs.
              </p>
            </div>
            <div className="output-card">
              <span className="tag">Forever</span>
              <span className="ico">♾️</span>
              <h3>Perpetuity</h3>
              <p>
                Backed by the Perpetuity Fund so your stories stay online long
                after the subscription era ends.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Perpetuity Fund ---------- */}
      <section className="section fund">
        <div className="container">
          <div className="fund-grid">
            <div className="fund-text">
              <p className="eyebrow">The Perpetuity Fund</p>
              <h2 className="section-title">
                Built to outlive subscriptions — and outlive us.
              </h2>
              <p>
                Most memory services vanish when the money stops coming in.
                Unlike other companies, we set aside part of every purchase into an endowment whose only job
                is to keep your saga alive.
              </p>
              <ul className="fund-points">
                <li>
                  <span className="pt-ico">✦</span>
                  <div>
                    <strong>Endowed, not rented</strong>
                    <span className="sub">
                      A portion of every plan funds long-term storage and hosting.
                    </span>
                  </div>
                </li>
                <li>
                  <span className="pt-ico">✦</span>
                  <div>
                    <strong>Independent &amp; ad-free</strong>
                    <span className="sub">
                      Solo-built, no investors. Your stories are never the product.
                    </span>
                  </div>
                </li>
                <li>
                  <span className="pt-ico">✦</span>
                  <div>
                    <strong>Exportable always</strong>
                    <span className="sub">
                      Download everything — text, audio, and photos — anytime.
                    </span>
                  </div>
                </li>
              </ul>
            </div>
            <div className="fund-card">
              <div className="big">100%</div>
              <p className="big-sub">
                of stories stay online — no renewals required after your one-time
                purchase.
              </p>
              <div className="fund-seal">✦ Protected in perpetuity</div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Pricing ---------- */}
      <section className="section bg-paper-2">
        <div className="container center">
          <p className="eyebrow">Simple, one-time pricing</p>
          <h2 className="section-title">Pay once. Yours forever.</h2>
          <p className="section-lead">
            No renewing costs. Try a week free first — founding-member pricing is
            locked in for everyone who starts during early access.
          </p>
          <div className="pricing">
            <div className="price-card featured">
              <span className="badge badge-trial">Free trial</span>
              <h3>Founder's Keepsake</h3>
              <div className="price">
                $99 <span>once</span>
              </div>
              <ul>
                <li>Daily story prompts by email</li>
                <li>Written, voice, and photo stories</li>
                <li>Private online archive</li>
                <li>Perpetuity Fund included</li>
              </ul>
              <Link className="btn btn-gold" to="/start">
                Buy now - free week
              </Link>
            </div>
            <div className="price-card soon">
              <span className="badge badge-soon">Coming soon</span>
              <h3>Founder's Saga</h3>
              <div className="price">
                $199 <span>once</span>
              </div>
              <ul>
                <li>Everything in Keepsake</li>
                <li><span className="amp">&amp;</span>Storytelling phone calls</li>
                <li><span className="amp">&amp;</span>Hardcover heirloom book</li>
                <li><span className="amp">&amp;</span>Up to 5 family contributors</li>
              </ul>
              <button className="btn btn-ghost" disabled>
                Coming soon
              </button>
            </div>
            <div className="price-card soon">
              <span className="badge badge-soon">Coming soon</span>
              <h3>Founder's Legacy</h3>
              <div className="price">
                $349 <span>once</span>
              </div>
              <ul>
                <li>Everything in Saga</li>
                <li><span className="amp">&amp;</span>Video storage</li>
                <li><span className="amp">&amp;</span>Three printed books</li>
                <li><span className="amp">&amp;</span>Unlimited contributors</li>
              </ul>
              <button className="btn btn-ghost" disabled>
                Coming soon
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Quote band ---------- */}
      <section className="section quote-band">
        <div className="container">
          <blockquote>
            "The stories that were never written down are the ones we'd give anything to hear
            again."
          </blockquote>
          <cite>— Why we're building Our Love Lives On</cite>
        </div>
      </section>

      {/* ---------- Final CTA ---------- */}
      <section className="section cta-final" id="start">
        <div className="container center">
          <p className="eyebrow">Try it free</p>
          <h2 className="section-title">Start preserving your love today.</h2>
          <p className="section-lead">
            Create your free account and begin a week of prompts right now — one
            gentle question a day. No credit card, and your stories are yours to
            keep.
          </p>
          <div className="hero-actions">
            <Link className="btn btn-gold btn-lg" to="/start">
              Start your free week →
            </Link>
          </div>
        </div>
      </section>

      {/* ---------- Footer ---------- */}
      <footer className="footer">
        <div className="container footer-inner">
          <div>
            <span className="brand-name">Our Love Lives On</span>
            <small>Your family's stories, preserved forever.</small>
          </div>
          <nav>
            <a href="/privacy">Privacy Policy</a>
            <a href="/terms">Terms of Service</a>
          </nav>
        </div>
        <div className="container footer-copy">
          © 2026 My Saga LLC. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default Home;
