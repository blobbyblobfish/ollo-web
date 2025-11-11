
import { useRef } from 'react';

const Home = () => {
  const contentRef = useRef(null);

  const waitlistRef = useRef(null);

  const goContent = () => {
    contentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const goWaitlist = () => {
    waitlistRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  
  return (
    <div className="App">

      <section className="hero">
        <div className="hero-overlay"></div>
        <header className="header">
          <h2 className="logo">Our Love Lives On</h2>
          <h3 className="header-text">A revolutionary platform for preserving your story.</h3>
          <button className="continue-button" onClick={goContent}> More Info </button>
          <button className="waitlist-button" onClick={goWaitlist}> Join Waitlist </button>
        </header>
      </section>

      <section ref={contentRef}>
        <div className='photos-container'>
          <div className="photo-and-caption">
            <h2>Pass down your wisdom and love to future generations.</h2>
            <img src={`${process.env.PUBLIC_URL}/1.jpg`} className="img" />
          </div>
          <div className="photo-and-caption">
            <h2>Relive the best moments of your life.</h2>
            <img src={`${process.env.PUBLIC_URL}/2.jpg`} className="img"/>   
          </div>
          <div className="photo-and-caption">
            <h2>Share stories with your family, in your voice.</h2>
            <img src={`${process.env.PUBLIC_URL}/3.jpg`} className="img"/>
          </div>         
        </div>
      </section>

      <section className="promo">
        <video autoPlay muted loop playsInline className="background-video">
          <source src={`${process.env.PUBLIC_URL}/background.mp4`} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        <div className="centered-white-text">
          <h1>OurLoveLivesOn.com</h1>
          <h3>iOS, Android, and Web</h3>
          <h3>You tell your story and we make it your legacy.</h3>
          <h3>Pay once, yours forever.</h3>
        </div>
      </section>
      <section ref={waitlistRef}>
        <div className="form-container">
          <iframe src="https://embeds.beehiiv.com/29bbf40e-766c-4ac0-852d-f301fdbb3995" 
            data-test-id="beehiiv-embed" width="100%" height="320" frameborder="0" className="form">
          </iframe>
          <script type="text/javascript" async src="https://embeds.beehiiv.com/attribution.js"></script>
          </div>
        </section>
      </div>
    );
  }

export default Home;
