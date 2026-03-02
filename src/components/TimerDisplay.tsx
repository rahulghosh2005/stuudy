import { type TimerMode, type PomodoroPhase, formatElapsed } from '../hooks/useTimer';

interface TimerDisplayProps {
  mode: TimerMode;
  elapsed: number;
  pomodoroPhase: PomodoroPhase;
  pomodoroWorkMs: number;
  pomodoroBreakMs: number;
}

export function TimerDisplay({
  mode,
  elapsed,
  pomodoroPhase,
  pomodoroWorkMs,
  pomodoroBreakMs,
}: TimerDisplayProps) {
  let displayMs: number;
  if (mode === 'pomodoro') {
    const targetMs = pomodoroPhase === 'work' ? pomodoroWorkMs : pomodoroBreakMs;
    displayMs = Math.max(0, targetMs - elapsed);
  } else {
    displayMs = elapsed;
  }

  return (
    <div style={{ textAlign: 'center' }}>
      {mode === 'pomodoro' && (
        <div style={{ fontSize: '14px', color: '#aaa', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '2px' }}>
          {pomodoroPhase === 'work' ? 'Work' : 'Break'}
        </div>
      )}
      <div style={{ fontSize: '72px', fontWeight: 700, fontVariantNumeric: 'tabular-nums', letterSpacing: '-2px' }}>
        {formatElapsed(displayMs)}
      </div>
    </div>
  );
}
