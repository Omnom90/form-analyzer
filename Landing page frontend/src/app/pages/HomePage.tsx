import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        background: '#080c10',
        color: '#e0ebe0',
        fontFamily: 'Inter, -apple-system, system-ui, sans-serif',
        overflowX: 'hidden',
      }}
    >
      <style>{`
        @keyframes blob1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33%       { transform: translate(6%, -10%) scale(1.06); }
          66%       { transform: translate(-5%, 5%) scale(0.95); }
        }
        @keyframes blob2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33%       { transform: translate(-8%, 6%) scale(1.1); }
          66%       { transform: translate(4%, -8%) scale(0.97); }
        }
        @keyframes blob3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%       { transform: translate(5%, 5%) scale(1.05); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp 0.8s ease forwards; }
        .fade-up-d1 { animation: fadeUp 0.8s 0.15s ease forwards; opacity: 0; }
        .fade-up-d2 { animation: fadeUp 0.8s 0.30s ease forwards; opacity: 0; }
        .fade-up-d3 { animation: fadeUp 0.8s 0.45s ease forwards; opacity: 0; }
        .step-card:hover { border-color: rgba(74,222,128,0.3); transform: translateY(-3px); }
        .why-card:hover  { border-color: rgba(74,222,128,0.3); background: rgba(74,222,128,0.04); }
        .nav-link { color: rgba(224,235,224,0.55); font-size: 14px; text-decoration: none; transition: color 0.2s; }
        .nav-link:hover { color: #4ade80; }
        .cta-btn {
          background: #4ade80;
          color: #080c10;
          border: none;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.2s, transform 0.15s;
        }
        .cta-btn:hover { background: #22c55e; transform: translateY(-1px); }
        .cta-btn:active { transform: translateY(0); }
        .ghost-btn {
          background: transparent;
          color: #4ade80;
          border: 1px solid rgba(74,222,128,0.35);
          font-weight: 600;
          cursor: pointer;
          transition: border-color 0.2s, background 0.2s;
        }
        .ghost-btn:hover { border-color: #4ade80; background: rgba(74,222,128,0.06); }

        @media (max-width: 768px) {
          .site-nav { padding: 0 16px !important; }
          .site-nav-links { gap: 14px !important; }
          .nav-link-hide-mobile { display: none !important; }
          .site-hero-badge { margin-bottom: 20px !important; }
          .section-pad { padding-left: 20px !important; padding-right: 20px !important; }
          .footer-row { text-align: center !important; justify-content: center !important; }
        }
        @media (max-width: 480px) {
          .site-nav-links { gap: 10px !important; }
          .site-nav .cta-btn { padding: 8px 14px !important; font-size: 13px !important; }
        }
      `}</style>

      <Nav navigate={navigate} />
      <HeroSection navigate={navigate} />
      <HowItWorksSection />
      <WhySection />
      <FooterCTA navigate={navigate} />
    </div>
  );
}

function ScrollCue({ direction, targetId }: { direction: 'up' | 'down'; targetId: string }) {
  return (
    <button
      onClick={() => document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth' })}
      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(74,222,128,0.75)', padding: '6px', transition: 'color 0.2s', display: 'flex', alignItems: 'center' }}
      onMouseEnter={e => (e.currentTarget.style.color = '#4ade80')}
      onMouseLeave={e => (e.currentTarget.style.color = 'rgba(74,222,128,0.75)')}
    >
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        {direction === 'up'
          ? <polyline points="18 15 12 9 6 15" />
          : <polyline points="6 9 12 15 18 9" />}
      </svg>
    </button>
  );
}

function Nav({ navigate }: { navigate: ReturnType<typeof useNavigate> }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <nav
      className="site-nav"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        padding: '0 40px',
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: scrolled ? 'rgba(8,12,16,0.9)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(74,222,128,0.08)' : '1px solid transparent',
        transition: 'background 0.3s, border-color 0.3s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => navigate('/')}>
        <img src="/logo.svg" alt="Formly" style={{ height: '32px', width: '32px' }} />
        <span style={{ fontWeight: 700, fontSize: '17px', letterSpacing: '0.06em', color: '#e0ebe0' }}>FORMLY</span>
      </div>
      <div className="site-nav-links" style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
        <a className="nav-link nav-link-hide-mobile" href="#how-it-works">How it works</a>
        <a className="nav-link nav-link-hide-mobile" href="#why">Why Formly</a>
        <a className="nav-link nav-link-hide-mobile" onClick={() => navigate('/next-steps')} style={{ cursor: 'pointer' }}>Project Roadmap</a>
        <a className="nav-link nav-link-hide-mobile" onClick={() => navigate('/next-steps#about')} style={{ cursor: 'pointer' }}>About</a>
        <button
          className="cta-btn"
          onClick={() => navigate('/workout')}
          style={{ padding: '9px 22px', borderRadius: '8px', fontSize: '14px' }}
        >
          Start Training
        </button>
      </div>
    </nav>
  );
}

function HeroSection({ navigate }: { navigate: ReturnType<typeof useNavigate> }) {
  return (
    <section
      id="hero"
      style={{
        position: 'relative',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        overflow: 'hidden',
        padding: '0 24px',
      }}
    >
      {/* Animated gradient blobs */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 0 }}>
        <div style={{
          position: 'absolute', width: '55vw', height: '55vw',
          top: '-15%', left: '-10%',
          background: 'radial-gradient(ellipse, rgba(34,100,50,0.45) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(60px)',
          animation: 'blob1 18s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', width: '50vw', height: '50vw',
          top: '10%', right: '-15%',
          background: 'radial-gradient(ellipse, rgba(20,70,35,0.35) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(70px)',
          animation: 'blob2 22s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', width: '40vw', height: '40vw',
          bottom: '-5%', left: '30%',
          background: 'radial-gradient(ellipse, rgba(74,222,128,0.12) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(80px)',
          animation: 'blob3 16s ease-in-out infinite',
        }} />
        {/* Subtle grid */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(74,222,128,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(74,222,128,0.03) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />
      </div>

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1, maxWidth: '780px' }}>
        <div className="fade-up" style={{
          display: 'inline-block',
          marginBottom: '28px',
          padding: '6px 16px',
          border: '1px solid rgba(74,222,128,0.25)',
          borderRadius: '100px',
          fontSize: '12px',
          fontWeight: 600,
          letterSpacing: '0.12em',
          color: '#4ade80',
          textTransform: 'uppercase',
        }}>
          AI-Powered Form Analysis
        </div>

        <h1
          className="fade-up-d1"
          style={{
            fontSize: 'clamp(52px, 8vw, 96px)',
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: '-0.03em',
            margin: '0 0 24px 0',
            color: '#f0f7f0',
          }}
        >
          Your form,<br />
          <span style={{ color: '#4ade80' }}>perfected.</span>
          <br />
          <span style={{ fontSize: 'clamp(12px, 1.2vw, 14px)', fontWeight: 500, color: 'rgba(224,235,224,0.35)', letterSpacing: '0.08em' }}>(ALPHA v1.0.1)</span>
        </h1>

        <p
          className="fade-up-d2"
          style={{
            fontSize: 'clamp(16px, 2vw, 20px)',
            color: 'rgba(224,235,224,0.6)',
            maxWidth: '520px',
            margin: '0 auto 44px',
            lineHeight: 1.65,
          }}
        >
          Real-time pose detection tracks every joint as you move.
          After each set, AI coaches you on exactly what to improve.
        </p>

        <div className="fade-up-d3" style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            className="cta-btn"
            onClick={() => navigate('/workout')}
            style={{ padding: '16px 36px', borderRadius: '10px', fontSize: '16px' }}
          >
            Start Training →
          </button>
          <button
            className="ghost-btn"
            onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
            style={{ padding: '16px 36px', borderRadius: '10px', fontSize: '16px' }}
          >
            See how it works
          </button>
        </div>
      </div>

      <div style={{ position: 'absolute', bottom: '32px', left: '50%', transform: 'translateX(-50%)', zIndex: 1 }}>
        <ScrollCue direction="down" targetId="how-it-works" />
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.15 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  const steps = [
    {
      number: '01',
      title: 'Open your camera',
      body: 'No signup. No install. No uploads. Just open the session page, allow camera access, and you\'re in.',
    },
    {
      number: '02',
      title: 'Move through your set',
      body: 'MediaPipe tracks 33 points on your body in real time. A skeleton overlay shows exactly what\'s being picked up.',
    },
    {
      number: '03',
      title: 'Get your coaching',
      body: 'After each set, the AI looks at your joint angles and tells you what to fix. Direct feedback, not generic tips.',
    },
  ];

  return (
    <section
      id="how-it-works"
      ref={ref}
      className="section-pad"
      style={{
        scrollMarginTop: '64px',
        padding: 'clamp(80px, 12vw, 160px) 40px',
        maxWidth: '1100px',
        margin: '0 auto',
      }}
    >
      <div
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'none' : 'translateY(32px)',
          transition: 'opacity 0.7s ease, transform 0.7s ease',
          marginBottom: '72px',
          textAlign: 'center',
        }}
      >
        <span style={{
          display: 'inline-block',
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: '#4ade80',
          marginBottom: '16px',
        }}>
          The process
        </span>
        <h2 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 800, color: '#f0f7f0', letterSpacing: '-0.02em', margin: 0 }}>
          Three steps to better form.
        </h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
        {steps.map((step, i) => (
          <div
            key={step.number}
            className="step-card"
            style={{
              background: 'rgba(255,255,255,0.025)',
              border: '1px solid rgba(74,222,128,0.1)',
              borderRadius: '16px',
              padding: '36px 32px',
              opacity: visible ? 1 : 0,
              transform: visible ? 'none' : 'translateY(24px)',
              transition: `opacity 0.6s ${i * 0.12}s ease, transform 0.6s ${i * 0.12}s ease, border-color 0.2s, transform 0.2s`,
              cursor: 'default',
            }}
          >
            <div style={{
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.18em',
              color: '#4ade80',
              marginBottom: '20px',
              fontFamily: 'DM Mono, monospace',
            }}>
              {step.number}
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#f0f7f0', marginBottom: '12px', letterSpacing: '-0.01em' }}>
              {step.title}
            </h3>
            <p style={{ fontSize: '15px', color: 'rgba(224,235,224,0.55)', lineHeight: 1.7, margin: 0 }}>
              {step.body}
            </p>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', marginTop: '56px' }}>
        <ScrollCue direction="up" targetId="hero" />
        <ScrollCue direction="down" targetId="why" />
      </div>
    </section>
  );
}

function WhySection() {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.15 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  const cards = [
    {
      icon: '🔒',
      title: 'Zero data stored',
      body: 'Your camera feed is processed locally in the browser and never leaves your device. No account, no cloud upload, no tracking.',
    },
    {
      icon: '⚡',
      title: 'No friction',
      body: 'Open a browser tab. Allow camera. Train. That\'s the entire setup. Works on any device with a webcam.',
    },
    {
      icon: '🧠',
      title: 'Honest AI coaching',
      body: 'Prompt engineered by Rishane. Feedback is based on your actual joint angles, not generic tips pulled from a database.',
    },
  ];

  return (
    <section
      id="why"
      ref={ref}
      className="section-pad"
      style={{
        scrollMarginTop: '64px',
        padding: 'clamp(80px, 12vw, 160px) 40px',
        background: 'rgba(74,222,128,0.02)',
        borderTop: '1px solid rgba(74,222,128,0.07)',
        borderBottom: '1px solid rgba(74,222,128,0.07)',
      }}
    >
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <div
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'none' : 'translateY(32px)',
            transition: 'opacity 0.7s ease, transform 0.7s ease',
            marginBottom: '72px',
            textAlign: 'center',
          }}
        >
          <span style={{
            display: 'inline-block',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: '#4ade80',
            marginBottom: '16px',
          }}>
            Built different
          </span>
          <h2 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 800, color: '#f0f7f0', letterSpacing: '-0.02em', margin: 0 }}>
            Why it works.
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
          {cards.map((card, i) => (
            <div
              key={card.title}
              className="why-card"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(74,222,128,0.1)',
                borderRadius: '16px',
                padding: '36px 32px',
                opacity: visible ? 1 : 0,
                transform: visible ? 'none' : 'translateY(24px)',
                transition: `opacity 0.6s ${i * 0.12}s ease, transform 0.6s ${i * 0.12}s ease, border-color 0.25s, background 0.25s`,
                cursor: 'default',
              }}
            >
              <div style={{ fontSize: '28px', marginBottom: '20px' }}>{card.icon}</div>
              <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#f0f7f0', marginBottom: '12px', letterSpacing: '-0.01em' }}>
                {card.title}
              </h3>
              <p style={{ fontSize: '15px', color: 'rgba(224,235,224,0.55)', lineHeight: 1.7, margin: 0 }}>
                {card.body}
              </p>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', marginTop: '56px' }}>
          <ScrollCue direction="up" targetId="how-it-works" />
          <ScrollCue direction="down" targetId="footer-cta" />
        </div>
      </div>
    </section>
  );
}

function FooterCTA({ navigate }: { navigate: ReturnType<typeof useNavigate> }) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.2 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section
      id="footer-cta"
      ref={ref}
      className="section-pad"
      style={{
        padding: 'clamp(80px, 12vw, 160px) 40px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle glow behind CTA */}
      <div style={{
        position: 'absolute',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '60vw', height: '40vw',
        background: 'radial-gradient(ellipse, rgba(34,80,50,0.35) 0%, transparent 70%)',
        filter: 'blur(60px)',
        pointerEvents: 'none',
      }} />

      <div style={{
        position: 'relative',
        zIndex: 1,
        opacity: visible ? 1 : 0,
        transform: visible ? 'none' : 'translateY(32px)',
        transition: 'opacity 0.7s ease, transform 0.7s ease',
        maxWidth: '600px',
        margin: '0 auto',
      }}>
        <h2 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 800, color: '#f0f7f0', letterSpacing: '-0.02em', marginBottom: '20px' }}>
          Ready to train smarter?
        </h2>
        <p style={{ fontSize: '17px', color: 'rgba(224,235,224,0.5)', marginBottom: '40px', lineHeight: 1.65 }}>
          No signup. No data collection. Just open your camera and move.
        </p>
        <button
          className="cta-btn"
          onClick={() => navigate('/workout')}
          style={{ padding: '18px 48px', borderRadius: '12px', fontSize: '17px' }}
        >
          Start a Session
        </button>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '48px' }}>
          <ScrollCue direction="up" targetId="why" />
        </div>
      </div>

      {/* Footer */}
      <div className="footer-row" style={{
        marginTop: '100px',
        paddingTop: '40px',
        borderTop: '1px solid rgba(74,222,128,0.08)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        opacity: 0.45,
        fontSize: '13px',
        color: 'rgba(224,235,224,0.6)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img src="/logo.svg" alt="" style={{ height: '18px' }} />
          <span style={{ fontWeight: 600, letterSpacing: '0.06em' }}>FORMLY</span>
        </div>
        <span>Built by Ohm Kumblekere · Client: Rishane Oak</span>
        <button
          onClick={() => navigate('/next-steps')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 'inherit', textDecoration: 'underline' }}
        >
          Project roadmap →
        </button>
      </div>
    </section>
  );
}
