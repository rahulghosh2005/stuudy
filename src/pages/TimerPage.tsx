import { useTimer, type TimerStatus } from '../hooks/useTimer';
import { TimerDisplay } from '../components/TimerDisplay';
import { ModeToggle } from '../components/ModeToggle';

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
  const { state, start, stop, setMode } = useTimer();
  const status: TimerStatus = state.status;

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

  // Stopped state: show frozen timer + placeholder for Plan 03 bottom sheet
  if (status === 'stopped') {
    return (
      <div style={screenStyle}>
        <TimerDisplay
          mode={state.mode}
          elapsed={state.elapsed}
          pomodoroPhase={state.pomodoroPhase}
          pomodoroWorkMs={state.pomodoroWorkMs}
          pomodoroBreakMs={state.pomodoroBreakMs}
        />
        <div style={{ marginTop: '24px', color: '#aaa', fontSize: '16px' }}>
          {/* SessionBottomSheet — wired in Plan 03 */}
          Session stopped — saving...
        </div>
      </div>
    );
  }

  // Idle state: mode toggle, subject placeholder, start button
  return (
    <div style={screenStyle}>
      <ModeToggle
        mode={state.mode}
        disabled={false}
        onModeChange={setMode}
      />
      {/* SubjectCombobox — wired in Plan 03 */}
      <div style={{ color: '#555', fontSize: '14px', marginBottom: '24px' }}>
        Subject picker — wired in Plan 03
      </div>
      <TimerDisplay
        mode={state.mode}
        elapsed={state.elapsed}
        pomodoroPhase={state.pomodoroPhase}
        pomodoroWorkMs={state.pomodoroWorkMs}
        pomodoroBreakMs={state.pomodoroBreakMs}
      />
      <button style={{ ...btnStyle, background: '#38a169', color: '#fff' }} onClick={start}>
        Start
      </button>
    </div>
  );
}
