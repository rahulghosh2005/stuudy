import { type TimerMode } from '../hooks/useTimer';

interface ModeToggleProps {
  mode: TimerMode;
  disabled?: boolean;
  onModeChange: (mode: TimerMode) => void;
}

export function ModeToggle({ mode, disabled, onModeChange }: ModeToggleProps) {
  const baseStyle: React.CSSProperties = {
    padding: '8px 20px',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: 600,
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'background 0.15s',
  };

  const activeStyle: React.CSSProperties = {
    ...baseStyle,
    background: '#fff',
    color: '#111',
  };

  const inactiveStyle: React.CSSProperties = {
    ...baseStyle,
    background: '#333',
    color: '#aaa',
  };

  return (
    <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
      <button
        style={mode === 'stopwatch' ? activeStyle : inactiveStyle}
        onClick={() => !disabled && onModeChange('stopwatch')}
        disabled={disabled && mode !== 'stopwatch'}
      >
        Stopwatch
      </button>
      <button
        style={mode === 'pomodoro' ? activeStyle : inactiveStyle}
        onClick={() => !disabled && onModeChange('pomodoro')}
        disabled={disabled && mode !== 'pomodoro'}
      >
        Pomodoro
      </button>
    </div>
  );
}
