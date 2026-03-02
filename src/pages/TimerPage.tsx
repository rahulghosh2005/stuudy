import { useState } from 'react';
import { useTimer, type TimerStatus, type TimerMode } from '../hooks/useTimer';
import { TimerDisplay } from '../components/TimerDisplay';
import { ModeToggle } from '../components/ModeToggle';
import { SubjectCombobox } from '../components/SubjectCombobox';
import { SessionBottomSheet } from '../components/SessionBottomSheet';
import { addSession } from '../firebase/sessions';
import { useAuth } from '../contexts/AuthContext';
import type { Subject } from '../types/session';

const screenStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: '#111',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#fff',
};

const btnStyle: React.CSSProperties = {
  marginTop: '32px',
  padding: '14px 40px',
  fontSize: '18px',
  fontWeight: 700,
  border: 'none',
  borderRadius: '12px',
  cursor: 'pointer',
};

export function TimerPage() {
  const { state, start, stop, reset, setMode } = useTimer();
  const { user } = useAuth();
  const status: TimerStatus = state.status;

  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);

  function handleModeChange(mode: TimerMode) {
    setMode(mode);
    setSelectedSubject(null);
  }

  async function handleSave(notes: string) {
    if (!user || state.startTimestamp === null) return;
    try {
      await addSession(user.uid, {
        subject: selectedSubject?.name ?? null,
        subjectId: selectedSubject?.id ?? null,
        // CRITICAL: sum of all completed phases (totalElapsed) plus current phase (elapsed).
        // Using state.elapsed alone would record only the last Pomodoro phase, not the full
        // session duration. For stopwatch, totalElapsed is 0, so this correctly equals elapsed.
        durationMs: state.totalElapsed + state.elapsed,
        startMs: state.startTimestamp,
        notes,
      });
      reset();
      setSelectedSubject(null);
      setSaveError(null);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (err) {
      setSaveError('Failed to save session. Try again.');
      console.error(err);
    }
  }

  function handleDiscard() {
    reset();
    setSelectedSubject(null);
    setSaveError(null);
  }

  // Running state: full-screen focus mode
  if (status === 'running') {
    return (
      <div style={screenStyle}>
        <TimerDisplay
          mode={state.mode}
          elapsed={state.elapsed}
          pomodoroPhase={state.pomodoroPhase}
          pomodoroWorkMs={state.pomodoroWorkMs}
          pomodoroBreakMs={state.pomodoroBreakMs}
        />
        <button style={{ ...btnStyle, background: '#e53e3e', color: '#fff' }} onClick={stop}>
          Stop
        </button>
      </div>
    );
  }

  // Idle + Stopped: idle elements always rendered; sheet overlays when stopped
  return (
    <div style={screenStyle}>
      {showToast && (
        <div style={{
          position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
          background: '#30d158', color: '#000', padding: '10px 20px',
          borderRadius: 8, fontWeight: 600, zIndex: 1000,
        }}>
          Session saved!
        </div>
      )}
      <ModeToggle
        mode={state.mode}
        disabled={false}
        onModeChange={handleModeChange}
      />
      {user && (
        <SubjectCombobox
          uid={user.uid}
          onSelect={setSelectedSubject}
          disabled={status === 'stopped'}
        />
      )}
      <TimerDisplay
        mode={state.mode}
        elapsed={state.elapsed}
        pomodoroPhase={state.pomodoroPhase}
        pomodoroWorkMs={state.pomodoroWorkMs}
        pomodoroBreakMs={state.pomodoroBreakMs}
      />
      {saveError && (
        <p style={{ color: '#ff453a', marginTop: '8px' }}>{saveError}</p>
      )}
      {status === 'idle' && (
        <button style={{ ...btnStyle, background: '#38a169', color: '#fff' }} onClick={start}>
          Start
        </button>
      )}
      <SessionBottomSheet
        open={status === 'stopped'}
        elapsed={state.totalElapsed + state.elapsed}
        subject={selectedSubject}
        onSave={handleSave}
        onDismiss={handleDiscard}
      />
    </div>
  );
}
