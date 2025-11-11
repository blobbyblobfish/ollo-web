
import React, { useState } from 'react';

const faqs = [
  {   
    question: "What are you building?",
    answer: "Our Love Lives On was inspired by wanting to preserve the stories of my loved ones and pass them down to my future children. It makes it easy to preserve memories and messages in one place that can last forever."
  },
  {
    question: "Is it private?",
    answer: "Yes, no one will have access to your stories besides people you choose to share them with. I am a solo developer and do not work with investors, so your data is safe from profit-driven people."
  },
  {
    question: "When will it be available?",
    answer: "I am actively developing it to be available to a general audience as soon as possible. Follow my newsletter to learn more."
  }
];

const About = () => {
  const [activeIndex, setActiveIndex] = useState(null);

  const toggleFaq = index => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  return (
    <div className="about-container">
      <section className="bio-section">
        <img src={`${process.env.PUBLIC_URL}/me.jpg`} alt="Alice Onuffer" className="bio-image" />
        <div className="bio-text">
          <h2>About Me</h2>
          <p>
            Hi, I'm Alice Onuffer, the founder of Our Love Lives On. I live in Pittsburgh, PA, with my husband.
          </p>
        </div>
      </section>

      <section className="faq-section">
        <h2>Frequently Asked Questions</h2>
        <div className="faq-list">
          {faqs.map((faq, index) => (
            <div key={index} className="faq-item">
              <div className="faq-question" onClick={() => toggleFaq(index)}>
                <h3>{faq.question}</h3>
                <span className="faq-icon">{activeIndex === index ? '−' : '+'}</span>
              </div>
              <div className={`faq-answer ${activeIndex === index ? 'open' : ''}`}>
                <p>{faq.answer}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default About;
