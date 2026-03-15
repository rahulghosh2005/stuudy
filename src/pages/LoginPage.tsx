import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { GoogleSignInButton } from '../components/GoogleSignInButton';
import { GooeyText } from '@/components/ui/gooey-text-morphing';

const features = [
  { icon: '⏱', label: 'Track every session', desc: 'Stopwatch & Pomodoro built in' },
  { icon: '📈', label: 'See your progress', desc: 'Charts, streaks & heatmaps' },
  { icon: '🎯', label: 'Hit your goals', desc: 'Daily targets to stay consistent' },
];

// Words that morph in the hero — study-sport energy
const heroWords = ['Focus.', 'Study.', 'Grind.', 'Grow.', 'Win.'];

export function LoginPage() {
  const { user } = useAuth();
  if (user) return <Navigate to="/" replace />;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background glow */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '700px',
        height: '700px',
        background: 'radial-gradient(circle, rgba(252,76,2,0.07) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Content */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        width: '100%',
        maxWidth: '420px',
        textAlign: 'center',
      }}>
        {/* App badge */}
        <div style={{
          display: 'inline-block',
          background: 'var(--accent-muted)',
          border: '1px solid rgba(252,76,2,0.3)',
          borderRadius: '100px',
          padding: '5px 14px',
          marginBottom: '20px',
        }}>
          <span style={{
            fontSize: '12px',
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--accent)',
          }}>
            stuuudy
          </span>
        </div>

        {/* Hero headline */}
        <h1 style={{
          fontSize: 'clamp(32px, 7vw, 46px)',
          fontWeight: 900,
          letterSpacing: '-0.04em',
          lineHeight: 1.1,
          color: 'var(--text)',
          margin: '0 0 8px',
        }}>
          Make studying
        </h1>

        {/* GooeyText morphing animation — sport-energy words */}
        <div style={{
          height: '90px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '8px',
        }}>
          <GooeyText
            texts={heroWords}
            morphTime={1}
            cooldownTime={1.5}
            className="w-full"
            textClassName="font-black !text-[var(--accent)] !text-5xl md:!text-6xl tracking-tight"
          />
        </div>

        <p style={{
          fontSize: '16px',
          color: 'var(--text-secondary)',
          marginBottom: '36px',
          lineHeight: 1.6,
          fontWeight: 400,
        }}>
          Track sessions, build streaks, and watch your hours add up.
        </p>

        {/* Feature list */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          marginBottom: '36px',
          textAlign: 'left',
        }}>
          {features.map(f => (
            <div key={f.label} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '14px 16px',
            }}>
              <span style={{ fontSize: '18px', flexShrink: 0 }}>{f.icon}</span>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>{f.label}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '1px' }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <GoogleSignInButton />

        <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '16px' }}>
          Free forever · No credit card required
        </p>
      </div>
    </div>
  );
}
