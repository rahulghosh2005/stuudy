import { type TimerMode } from '../hooks/useTimer';

interface ModeToggleProps {
  mode: TimerMode;
  disabled?: boolean;
  onModeChange: (mode: TimerMode) => void;
}

export function ModeToggle({ mode, disabled, onModeChange }: ModeToggleProps) {
  return (
    <div style={{
      display: 'flex',
      background: 'var(--card)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '4px',
      marginBottom: '32px',
      gap: '2px',
    }}>
      {(['stopwatch', 'pomodoro'] as TimerMode[]).map(m => {
        const isActive = mode === m;
        return (
          <button
            key={m}
            onClick={() => !disabled && onModeChange(m)}
            disabled={disabled && mode !== m}
            style={{
              padding: '8px 20px',
              border: 'none',
              borderRadius: '9px',
              fontSize: '13px',
              fontWeight: isActive ? 700 : 500,
              cursor: disabled && mode !== m ? 'default' : 'pointer',
              opacity: disabled && mode !== m ? 0.4 : 1,
              background: isActive ? 'var(--accent)' : 'transparent',
              color: isActive ? '#fff' : 'var(--text-secondary)',
              transition: 'all 0.15s ease',
              letterSpacing: isActive ? '-0.01em' : '0',
              boxShadow: isActive ? '0 2px 8px rgba(252,76,2,0.3)' : 'none',
            }}
          >
            {m === 'stopwatch' ? 'Stopwatch' : 'Pomodoro'}
          </button>
        );
      })}
    </div>
  );
}
