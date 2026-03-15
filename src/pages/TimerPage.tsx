import { useState, useEffect } from 'react';
import { useTimer, type TimerStatus, type TimerMode } from '../hooks/useTimer';
import { TimerDisplay } from '../components/TimerDisplay';
import { ModeToggle } from '../components/ModeToggle';
import { SubjectCombobox } from '../components/SubjectCombobox';
import { SessionBottomSheet } from '../components/SessionBottomSheet';
import { DailyProgressBar } from '../components/DailyProgressBar';
import { addSession } from '../firebase/sessions';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { CheckCircle, Moon } from 'lucide-react';
import type { Subject } from '../types/session';
import type { UserProfile } from '../types/user';

function getGreeting(): { text: string; moon: boolean } {
  const h = new Date().getHours();
  if (h < 5)  return { text: 'Burning the midnight oil', moon: true };
  if (h < 12) return { text: 'Good morning', moon: false };
  if (h < 17) return { text: 'Good afternoon', moon: false };
  if (h < 21) return { text: 'Good evening', moon: false };
  return { text: 'Late night grind', moon: true };
}

export function TimerPage() {
  const { state, start, stop, reset, setMode } = useTimer();
  const { user } = useAuth();
  const status: TimerStatus = state.status;

  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!user?.uid) return;
    getDoc(doc(db, 'users', user.uid))
      .then(snap => { if (snap.exists()) setProfile(snap.data() as UserProfile); })
      .catch(() => {});
  }, [user?.uid]);

  const timezone = profile?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const firstName = profile?.displayName?.split(' ')[0] ?? user?.displayName?.split(' ')[0] ?? '';
  const greeting = getGreeting();

  function handleModeChange(mode: TimerMode) {
    setMode(mode);
    setSelectedSubject(null);
  }

  async function handleSave(subject: Subject | null, notes: string) {
    if (!user || state.startTimestamp === null) return;

    // Capture values before reset clears them
    const payload = {
      subject: subject?.name ?? null,
      subjectId: subject?.id ?? null,
      durationMs: state.totalElapsed + state.elapsed,
      startMs: state.startTimestamp,
      notes,
    };

    // Optimistic UI: close the sheet and show success immediately
    reset();
    setSelectedSubject(null);
    setSaveError(null);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);

    // Fire the save in the background — if it fails, surface a persistent error
    addSession(user.uid, payload).catch(err => {
      setSaveError('Save failed — check your connection and try again.');
      console.error(err);
    });
  }

  function handleDiscard() {
    reset();
    setSelectedSubject(null);
    setSaveError(null);
  }

  // ── Running: immersive focus mode ─────────────────────────────────────────
  if (status === 'running') {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        color: 'var(--text)', paddingBottom: 80,
      }}>
        {/* Subject label */}
        {selectedSubject && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            marginBottom: '24px',
            background: 'var(--accent-muted)',
            border: '1px solid rgba(252,76,2,0.3)',
            borderRadius: '100px',
            padding: '6px 16px',
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent)', letterSpacing: '-0.01em' }}>
              {selectedSubject.name}
            </span>
          </div>
        )}

        <TimerDisplay
          mode={state.mode}
          elapsed={state.elapsed}
          pomodoroPhase={state.pomodoroPhase}
          pomodoroWorkMs={state.pomodoroWorkMs}
          pomodoroBreakMs={state.pomodoroBreakMs}
        />

        {user && (
          <div style={{ marginTop: 20, width: '100%', maxWidth: 300, padding: '0 24px' }}>
            <DailyProgressBar
              uid={user.uid}
              timezone={timezone}
              dailyGoalMinutes={profile?.dailyGoalMinutes ?? 60}
              dailyGoalEnabled={profile?.dailyGoalEnabled ?? false}
            />
          </div>
        )}

        <button
          onClick={stop}
          style={{
            marginTop: 40, width: 180, padding: '16px 0',
            fontSize: 17, fontWeight: 800, border: 'none', borderRadius: 100,
            cursor: 'pointer', background: 'var(--error)', color: '#fff',
            letterSpacing: '-0.01em', boxShadow: '0 4px 24px rgba(239,68,68,0.35)',
            transition: 'transform 0.1s, box-shadow 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.04)'; e.currentTarget.style.boxShadow = '0 8px 36px rgba(239,68,68,0.5)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 24px rgba(239,68,68,0.35)'; }}
        >
          Stop
        </button>
      </div>
    );
  }

  // ── Idle + Stopped: full setup view ──────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      color: 'var(--text)', padding: '0 24px 80px',
    }}>
      <style>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateX(-50%) translateY(-8px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes timerPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>

      {/* Toast */}
      {showToast && (
        <div style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
          background: '#16a34a', color: '#fff',
          padding: '10px 18px', borderRadius: 100,
          fontWeight: 700, fontSize: 14, zIndex: 1000,
          display: 'flex', alignItems: 'center', gap: 7,
          boxShadow: '0 4px 20px rgba(22,163,74,0.4)',
          animation: 'fadeInDown 0.2s ease',
        }}>
          <CheckCircle size={15} strokeWidth={2.5} />
          Session saved!
        </div>
      )}

      {/* Greeting */}
      {status === 'idle' && (
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            fontSize: '14px',
            color: 'var(--text-secondary)',
            fontWeight: 600,
            letterSpacing: '-0.01em',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            {greeting.moon && <Moon size={13} color="var(--text-tertiary)" strokeWidth={1.8} />}
            {greeting.text}{firstName ? `, ${firstName}` : ''}
          </div>
          <div style={{
            fontSize: '11px',
            color: 'var(--text-tertiary)',
            fontWeight: 500,
            marginTop: '3px',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}>
            What are you conquering today?
          </div>
        </div>
      )}

      {/* Card container — groups mode toggle + subject + timer */}
      <div style={{
        width: '100%',
        maxWidth: 380,
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 24,
        padding: '28px 24px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 20,
        boxShadow: '0 8px 48px rgba(0,0,0,0.3)',
      }}>
        {/* Mode toggle */}
        <ModeToggle mode={state.mode} disabled={false} onModeChange={handleModeChange} />

        {/* Subject picker */}
        {status === 'idle' && user && (
          <div style={{ width: '100%' }}>
            <SubjectCombobox
              uid={user.uid}
              onSelect={setSelectedSubject}
              disabled={false}
            />
          </div>
        )}

        {/* Timer */}
        <TimerDisplay
          mode={state.mode}
          elapsed={state.elapsed}
          pomodoroPhase={state.pomodoroPhase}
          pomodoroWorkMs={state.pomodoroWorkMs}
          pomodoroBreakMs={state.pomodoroBreakMs}
        />

        {/* Daily progress */}
        {user && (
          <div style={{ width: '100%' }}>
            <DailyProgressBar
              uid={user.uid}
              timezone={timezone}
              dailyGoalMinutes={profile?.dailyGoalMinutes ?? 60}
              dailyGoalEnabled={profile?.dailyGoalEnabled ?? false}
            />
          </div>
        )}
      </div>

      {saveError && (
        <p style={{ color: 'var(--error)', marginTop: 12, fontSize: 13, fontWeight: 500 }}>
          {saveError}
        </p>
      )}

      {/* Start button */}
      {status === 'idle' && (
        <button
          onClick={start}
          style={{
            marginTop: 24, width: 200, padding: '17px 0',
            fontSize: 17, fontWeight: 800, border: 'none', borderRadius: 100,
            cursor: 'pointer', background: 'var(--accent)', color: '#fff',
            letterSpacing: '-0.01em', boxShadow: '0 4px 28px rgba(252,76,2,0.38)',
            transition: 'transform 0.1s, box-shadow 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.04)'; e.currentTarget.style.boxShadow = '0 8px 36px rgba(252,76,2,0.5)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 28px rgba(252,76,2,0.38)'; }}
        >
          Start
        </button>
      )}

      {/* Post-session bottom sheet */}
      {user && (
        <SessionBottomSheet
          open={status === 'stopped'}
          elapsed={state.totalElapsed + state.elapsed}
          uid={user.uid}
          initialSubject={selectedSubject}
          onSave={handleSave}
          onDismiss={handleDiscard}
        />
      )}
    </div>
  );
}
