---
phase: 02-timer-and-sessions
plan: "02"
subsystem: timer-ui
tags: [timer, hooks, useReducer, pomodoro, stopwatch, anchor-time]
dependency_graph:
  requires: [02-01]
  provides: [useTimer, TimerDisplay, ModeToggle, TimerPage]
  affects: [src/App.tsx]
tech_stack:
  added: []
  patterns: [anchor-time, useReducer state machine, conditional layout]
key_files:
  created:
    - src/hooks/useTimer.ts
    - src/components/TimerDisplay.tsx
    - src/components/ModeToggle.tsx
    - src/pages/TimerPage.tsx
  modified:
    - src/App.tsx
decisions:
  - "type imports required: verbatimModuleSyntax=true forces `import { type X }` for all type-only imports"
  - "TypeScript narrows status to literal in idle branch — use captured variable to avoid erroneous comparison error"
metrics:
  duration: "2 min"
  completed_date: "2026-03-02"
  tasks_completed: 2
  files_changed: 5
---

# Phase 02 Plan 02: Timer State Machine and UI Summary

**One-liner:** useReducer anchor-time timer hook (stopwatch + Pomodoro with totalElapsed accumulation) composed into full-screen TimerPage wired to the / route.

## What Was Built

### Task 1: useTimer hook (846e83f)

`src/hooks/useTimer.ts` implements a `useReducer`-based state machine:

- **Anchor-time pattern:** `elapsed = action.now - state.startTimestamp` on every TICK — wall-clock accurate, never drifts when tab is backgrounded.
- **PHASE_COMPLETE:** accumulates `totalElapsed += elapsed`, resets `elapsed = 0`, sets new `startTimestamp = Date.now()`, toggles `pomodoroPhase`. This is the critical step Plan 03 relies on for accurate `durationMs`.
- **SET_MODE / RESET:** both set `totalElapsed: 0` to guarantee a clean slate.
- **setInterval at 500ms** with `clearInterval` cleanup — no memory leak on unmount.
- **formatElapsed utility** exported for reuse by SessionBottomSheet (Plan 03).

Exports: `useTimer`, `TimerState`, `TimerMode`, `TimerStatus`, `PomodoroPhase`, `formatElapsed`.

### Task 2: UI Components + App.tsx wiring (682dd0c)

- **ModeToggle:** two-button switcher with active/inactive visual states; disabled prop blocks interaction during running session.
- **TimerDisplay:** stopwatch count-up (`formatElapsed(elapsed)`) or Pomodoro countdown (`formatElapsed(max(0, targetMs - elapsed))`) with Work/Break phase label.
- **TimerPage:** three conditional layouts — idle (ModeToggle + placeholder + Start), running (full-screen focus: display + Stop only), stopped (frozen display + Plan 03 placeholder). All inline styles, dark background.
- **App.tsx:** `HomePage` removed; `<Route path="/" element={<TimerPage />} />` added.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed type-only import errors (verbatimModuleSyntax)**
- **Found during:** Task 2 build
- **Issue:** `import { TimerMode }` caused TS1484 — project has `verbatimModuleSyntax: true` in tsconfig
- **Fix:** Changed to `import { type TimerMode }` in ModeToggle.tsx and TimerDisplay.tsx
- **Files modified:** src/components/ModeToggle.tsx, src/components/TimerDisplay.tsx
- **Commit:** 682dd0c (included in Task 2 commit)

**2. [Rule 1 - Bug] Fixed TypeScript narrowing false positive in idle branch**
- **Found during:** Task 2 build
- **Issue:** In TimerPage idle branch (after `if running` and `if stopped` early returns), TypeScript narrows `state.status` to `'idle'`, making `state.status === 'running'` always-false error (TS2367)
- **Fix:** Captured `const status: TimerStatus = state.status` before guards; used `status` variable for comparisons and passed `disabled={false}` explicitly in idle branch where it can never be running
- **Files modified:** src/pages/TimerPage.tsx
- **Commit:** 682dd0c (included in Task 2 commit)

## Self-Check

- [x] `src/hooks/useTimer.ts` exists with `export function useTimer`
- [x] `src/components/TimerDisplay.tsx` exists
- [x] `src/components/ModeToggle.tsx` exists
- [x] `src/pages/TimerPage.tsx` exists
- [x] `src/App.tsx` routes / to TimerPage, HomePage removed
- [x] Build passes (`npm run build` exits 0)
- [x] TypeScript clean (`npx tsc --noEmit` exits 0)
- [x] Commits: 846e83f (Task 1), 682dd0c (Task 2)

## Self-Check: PASSED
