import { useReducer, useEffect } from 'react';

export type TimerMode = 'stopwatch' | 'pomodoro';
export type TimerStatus = 'idle' | 'running' | 'stopped';
export type PomodoroPhase = 'work' | 'break';

export interface TimerState {
  mode: TimerMode;
  status: TimerStatus;
  startTimestamp: number | null;
  elapsed: number;        // milliseconds — current phase only
  totalElapsed: number;   // milliseconds — sum of all completed phases
  pomodoroPhase: PomodoroPhase;
  pomodoroWorkMs: number;
  pomodoroBreakMs: number;
}

const initialTimerState: TimerState = {
  mode: 'stopwatch',
  status: 'idle',
  startTimestamp: null,
  elapsed: 0,
  totalElapsed: 0,
  pomodoroPhase: 'work',
  pomodoroWorkMs: 25 * 60 * 1000,
  pomodoroBreakMs: 5 * 60 * 1000,
};

type TimerAction =
  | { type: 'START' }
  | { type: 'STOP' }
  | { type: 'TICK'; now: number }
  | { type: 'SET_MODE'; mode: TimerMode }
  | { type: 'RESET' }
  | { type: 'PHASE_COMPLETE' };

function timerReducer(state: TimerState, action: TimerAction): TimerState {
  switch (action.type) {
    case 'START':
      return {
        ...state,
        status: 'running',
        startTimestamp: Date.now(),
      };

    case 'STOP':
      return {
        ...state,
        status: 'stopped',
      };

    case 'TICK':
      if (state.status !== 'running' || state.startTimestamp === null) {
        return state;
      }
      return {
        ...state,
        elapsed: action.now - state.startTimestamp,
      };

    case 'PHASE_COMPLETE':
      return {
        ...state,
        totalElapsed: state.totalElapsed + state.elapsed,
        elapsed: 0,
        startTimestamp: Date.now(),
        pomodoroPhase: state.pomodoroPhase === 'work' ? 'break' : 'work',
      };

    case 'SET_MODE':
      return { ...initialTimerState, mode: action.mode };

    case 'RESET':
      return { ...initialTimerState, mode: state.mode };

    default:
      return state;
  }
}

export function useTimer() {
  const [state, dispatch] = useReducer(timerReducer, initialTimerState);

  // Effect 1 — setInterval for display refresh (anchor-time pattern)
  useEffect(() => {
    if (state.status !== 'running') return;
    const id = setInterval(() => {
      dispatch({ type: 'TICK', now: Date.now() });
    }, 500);
    return () => clearInterval(id);
  }, [state.status]);

  // Effect 2 — Pomodoro phase completion detection
  useEffect(() => {
    if (state.mode !== 'pomodoro' || state.status !== 'running') return;
    const targetMs =
      state.pomodoroPhase === 'work' ? state.pomodoroWorkMs : state.pomodoroBreakMs;
    if (state.elapsed >= targetMs) {
      dispatch({ type: 'PHASE_COMPLETE' });
    }
  }, [
    state.elapsed,
    state.mode,
    state.status,
    state.pomodoroPhase,
    state.pomodoroWorkMs,
    state.pomodoroBreakMs,
  ]);

  return {
    state,
    start: () => dispatch({ type: 'START' }),
    stop: () => dispatch({ type: 'STOP' }),
    reset: () => dispatch({ type: 'RESET' }),
    setMode: (mode: TimerMode) => dispatch({ type: 'SET_MODE', mode }),
  };
}

export function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
