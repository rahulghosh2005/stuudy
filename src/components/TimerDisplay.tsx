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
  let progressPct = 0;

  if (mode === 'pomodoro') {
    const targetMs = pomodoroPhase === 'work' ? pomodoroWorkMs : pomodoroBreakMs;
    displayMs = Math.max(0, targetMs - elapsed);
    progressPct = Math.min(100, (elapsed / targetMs) * 100);
  } else {
    displayMs = elapsed;
    // For stopwatch, show a subtle pulse ring — no progress
  }

  const isBreak = mode === 'pomodoro' && pomodoroPhase === 'break';
  const ringColor = isBreak ? '#30d158' : 'var(--accent)';
  const ringSize = 220;
  const strokeWidth = 4;
  const radius = (ringSize - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (progressPct / 100) * circumference;

  return (
    <div style={{ textAlign: 'center', position: 'relative', userSelect: 'none' }}>
      {mode === 'pomodoro' ? (
        /* Pomodoro: circular progress ring */
        <div style={{ position: 'relative', width: ringSize, height: ringSize, margin: '0 auto' }}>
          <svg
            width={ringSize}
            height={ringSize}
            style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(-90deg)' }}
          >
            {/* Track */}
            <circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
              fill="none"
              stroke="var(--border)"
              strokeWidth={strokeWidth}
            />
            {/* Progress */}
            <circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
              fill="none"
              stroke={ringColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              style={{ transition: 'stroke-dashoffset 0.5s ease' }}
            />
          </svg>

          {/* Center content */}
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <div style={{
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: isBreak ? '#30d158' : 'var(--accent)',
              marginBottom: '4px',
            }}>
              {isBreak ? 'Break' : 'Focus'}
            </div>
            <div style={{
              fontSize: '46px',
              fontWeight: 900,
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.04em',
              lineHeight: 1,
              color: 'var(--text)',
            }}>
              {formatElapsed(displayMs)}
            </div>
          </div>
        </div>
      ) : (
        /* Stopwatch: clean large display */
        <div style={{ padding: '24px 0' }}>
          <div style={{
            fontSize: 'clamp(64px, 12vw, 88px)',
            fontWeight: 900,
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '-0.05em',
            lineHeight: 1,
            color: elapsed > 0 ? 'var(--text)' : 'var(--border-alt)',
            transition: 'color 0.3s ease',
          }}>
            {formatElapsed(displayMs)}
          </div>
          {elapsed > 0 && (
            <div style={{
              fontSize: '12px',
              color: 'var(--text-tertiary)',
              fontWeight: 600,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginTop: '8px',
            }}>
              elapsed
            </div>
          )}
        </div>
      )}
    </div>
  );
}
