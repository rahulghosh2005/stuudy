---
phase: "02-timer-and-sessions"
plan: "03"
subsystem: "timer-ui"
tags: ["combobox", "bottom-sheet", "firestore-write", "session-save", "subject-selector"]
dependency_graph:
  requires: ["02-01", "02-02"]
  provides: ["SubjectCombobox", "SessionBottomSheet", "complete-session-loop"]
  affects: ["TimerPage"]
tech_stack:
  added: []
  patterns: ["native-dialog-element", "client-side-filter", "anchor-time-durationMs"]
key_files:
  created:
    - src/components/SubjectCombobox.tsx
    - src/components/SessionBottomSheet.tsx
  modified:
    - src/pages/TimerPage.tsx
decisions:
  - "disabled prop on SubjectCombobox set to stopped (not running) — status is already narrowed past running guard in render branch"
  - "Discard is silent — no confirmation dialog (locked decision from plan)"
  - "durationMs = state.totalElapsed + state.elapsed — full session wall-clock, not just last Pomodoro phase"
requirements-completed: [TIMR-04, TIMR-05, TIMR-06, TIMR-07]
metrics:
  duration: "~7 min (Tasks 1-3 including human-verify checkpoint)"
  completed_date: "2026-03-02"
  tasks_completed: 3
  tasks_total: 3
  files_created: 2
  files_modified: 1
---

# Phase 02 Plan 03: Subject Selector, Session Save Bottom Sheet, and Wired TimerPage Summary

**One-liner:** SubjectCombobox (Firestore-backed, client-filtered, create-on-Enter) + native dialog SessionBottomSheet + fully wired TimerPage completing the study session loop.

## What Was Built

### SubjectCombobox (`src/components/SubjectCombobox.tsx`)
- Loads subjects from Firestore once on mount via `getSubjects(uid)` in a `useEffect`
- Filters the local list client-side on every keystroke (no per-keystroke Firestore reads)
- Enter with top match → selects that subject; Enter with no match and non-empty input → calls `addSubject(uid, name)` and adds returned Subject to local state
- Click on dropdown item → selects subject
- Clear (×) button and empty input → calls `onSelect(null)`
- `onBlur` closes dropdown with 150ms delay to let click events fire first; timeout cancelled on mousedown of list items
- ARIA: `role="combobox"` on wrapper, `aria-expanded`, `role="listbox"` on `<ul>`, `role="option"` on each `<li>`
- `disabled` prop makes input non-interactive (used when stopped)
- Inline styles only (no Tailwind)

### SessionBottomSheet (`src/components/SessionBottomSheet.tsx`)
- Native `<dialog>` element controlled by `open` prop via `showModal()` / `close()`
- ESC key handled via `onCancel` — `preventDefault()` then calls `onDismiss()` (no default close)
- Slide-up animation via injected `<style>` tag (`transform: translateY(100%)` → `translateY(0)` on `[open]`)
- Shows: formatted elapsed (`formatElapsed`), subject name or "No subject", notes textarea, Save button (with `isSaving` loading state), Discard button
- Notes state reset to `''` when `open` becomes false
- `::backdrop` and `dialog[open]` selectors require `<style>` tag — cannot be done purely inline

### TimerPage (`src/pages/TimerPage.tsx`)
- Imports and renders SubjectCombobox (idle + stopped states) and SessionBottomSheet (open when `status === 'stopped'`)
- `handleSave`: `durationMs = state.totalElapsed + state.elapsed` — critical for correct Pomodoro multi-phase duration
- `handleDiscard`: calls `reset()` silently, no confirmation dialog
- `handleModeChange`: calls `setMode()` then clears `selectedSubject`
- Toast: fixed-position green banner for 3 seconds after successful Firestore write
- `saveError`: red text displayed on Firestore write failure
- Running state: full-screen focus mode (no nav, no subject, no mode toggle)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript narrowing error in TimerPage**
- **Found during:** Task 2 build verification
- **Issue:** After the early `return` for `status === 'running'`, TypeScript narrows `status` to `'idle' | 'stopped'`. Comparing against `'running'` inside the else branch caused TS2367 (no overlap). Also, `disabled={status === 'running'}` on SubjectCombobox was always false in that branch.
- **Fix:** Changed ModeToggle `disabled={false}` (running branch handles itself), SubjectCombobox `disabled={status === 'stopped'}` (correctly disables during save flow)
- **Files modified:** `src/pages/TimerPage.tsx`
- **Commit:** 7fdcf37

## Auth Gates

None.

## Tasks

| # | Name | Status | Commit |
|---|------|--------|--------|
| 1 | Build SubjectCombobox and SessionBottomSheet | Complete | 7bfce26 |
| 2 | Wire into TimerPage — complete session loop | Complete | 7fdcf37 |
| 3 | Human verify complete Phase 2 session loop | Complete — approved | — |

## Self-Check

Files created:
- src/components/SubjectCombobox.tsx — FOUND
- src/components/SessionBottomSheet.tsx — FOUND
- src/pages/TimerPage.tsx — FOUND (modified)

Commits: 7bfce26, 7fdcf37 — both exist in git log.

Build: passes (`npm run build` exits 0, TypeScript clean).

Task 3 human-verify checkpoint: user responded "approved" — all 20 verification steps passed.

## Self-Check: PASSED
