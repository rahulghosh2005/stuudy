---
phase: 02-timer-and-sessions
verified: 2026-03-02T00:00:00Z
status: human_needed
score: 19/19 automated must-haves verified
human_verification:
  - test: "Start stopwatch, switch to background tab for 30+ seconds, return and confirm elapsed >= 30s"
    expected: "Timer shows accurate wall-clock elapsed time — not less than the actual time spent backgrounded"
    why_human: "Tab throttling behavior cannot be simulated programmatically; requires real browser interaction"
  - test: "Start Pomodoro timer, wait for countdown to reach 00:00"
    expected: "Timer auto-transitions to break phase showing 5:00 countdown with 'Break' label — no user action needed"
    why_human: "Requires waiting 25 minutes (or manually testing with a shortened interval) to observe the phase transition in a live browser"
  - test: "Type a subject name that does not yet exist, press Enter — then start timer, stop it, open bottom sheet"
    expected: "Subject name appears in the bottom sheet; saving writes subject and subjectId to Firestore document"
    why_human: "Requires Firestore write and console inspection to confirm subjectId is populated with the real document ID"
  - test: "Save a session and open Firebase console > Firestore > users/{uid}/sessions"
    expected: "Document exists with all 9 fields: userId, subject, subjectId, durationMs, startTimestamp (Timestamp), endTimestamp (serverTimestamp), notes, privacy='public', createdAt (serverTimestamp)"
    why_human: "Cannot read live Firestore from the codebase; requires Firebase console inspection of an actual written document"
  - test: "Tap Discard (or press ESC) after stopping the timer"
    expected: "Bottom sheet closes, timer resets to idle, no session document is written to Firestore, no confirmation dialog appears"
    why_human: "Requires verifying absence of a Firestore write — cannot confirm from static code alone"
---

# Phase 2: Timer and Sessions Verification Report

**Phase Goal:** Users can track a focused study session from start to finish and have it permanently recorded with accurate duration
**Verified:** 2026-03-02
**Status:** human_needed — all 19 automated checks pass; 5 interactive/live-data items require human confirmation
**Re-verification:** No — initial verification

---

## Goal Achievement

### Success Criteria from ROADMAP.md

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | User can start a stopwatch timer, see elapsed time ticking in real time, and stop it to log a session | VERIFIED | `useTimer` dispatches TICK every 500ms via setInterval; `TimerPage` renders `TimerDisplay` with live `elapsed`; Stop calls `stop()` transitioning to `stopped` status |
| 2 | User can start a Pomodoro timer with configurable work and break intervals, and it transitions automatically between work and break phases | VERIFIED (automated) / NEEDS HUMAN (live transition) | `useTimer` Effect 2 detects `elapsed >= targetMs` and dispatches `PHASE_COMPLETE`; `PHASE_COMPLETE` flips `pomodoroPhase` and resets `elapsed`; `TimerDisplay` shows phase label and correct countdown |
| 3 | User can select or create a subject before or during a session (subjects created on the fly are persisted for future sessions) | VERIFIED (code) / NEEDS HUMAN (Firestore persistence) | `SubjectCombobox` calls `addSubject(uid, trimmed)` on Enter with no match, adds result to local state, calls `onSelect`; `getSubjects(uid)` re-loads on next mount |
| 4 | User can add an optional notes/memo after stopping a session before it is saved | VERIFIED | `SessionBottomSheet` renders `<textarea>` bound to `notes` state; `handleSave` passes `notes` to `onSave(notes)` callback |
| 5 | A logged session document contains subject, duration, start/end timestamps, notes, privacy level, and userId — and elapsed time matches wall-clock time even if the tab was backgrounded | VERIFIED (code) / NEEDS HUMAN (live Firestore doc) | `addSession` writes all 9 fields; `durationMs: state.totalElapsed + state.elapsed` is the correct formula; anchor-time pattern confirmed in `useTimer` TICK reducer |

---

## Observable Truths — Detailed Verification

### Plan 02-01 Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Sessions written to users/{uid}/sessions/{id} are accepted by Firestore (not rejected with PERMISSION_DENIED) | VERIFIED | `firestore.rules` line 23: `match /users/{userId}/sessions/{sessionId}` with create rule `request.resource.data.userId == request.auth.uid` |
| 2 | Subjects written to users/{uid}/subjects/{id} are accepted by Firestore (not rejected with PERMISSION_DENIED) | VERIFIED | `firestore.rules` line 31: `match /users/{userId}/subjects/{subjectId}` with `request.auth.uid == userId` |
| 3 | addSession() writes all 9 required fields to Firestore subcollection with correct types | VERIFIED | `src/firebase/sessions.ts` lines 16-26: `addDoc(collection(db, 'users', uid, 'sessions'), {...})` with all 9 fields present; `Timestamp.fromMillis` for startTimestamp; `serverTimestamp()` for endTimestamp and createdAt; `'public' as const` for privacy |
| 4 | Saved session documents contain all 9 required fields with correct types | NEEDS HUMAN | Code is correct; live Firestore doc must be inspected in Firebase console to confirm server-side field resolution |

### Plan 02-02 Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 5 | User visits / and sees the timer page (not a placeholder) | VERIFIED | `src/App.tsx` line 15: `<Route path="/" element={<TimerPage />} />`; `HomePage` function is gone; `TimerPage` renders real ModeToggle, TimerDisplay, and Start button |
| 6 | User can toggle between Stopwatch and Pomodoro modes — switching resets timer to idle | VERIFIED | `SET_MODE` reducer returns `{ ...initialTimerState, mode: action.mode }` — full reset including `totalElapsed: 0` |
| 7 | User taps Start in Stopwatch mode and sees elapsed time counting up in HH:MM:SS (or MM:SS) | VERIFIED | `START` sets `startTimestamp: Date.now()`; `TICK` computes `elapsed = action.now - state.startTimestamp`; `TimerDisplay` renders `formatElapsed(elapsed)` for stopwatch mode |
| 8 | User taps Start in Pomodoro mode and sees a countdown from 25:00, which auto-transitions to 5:00 break when it reaches 00:00 | VERIFIED (code) / NEEDS HUMAN (live transition) | `TimerDisplay` computes `displayMs = Math.max(0, targetMs - elapsed)`; `initialTimerState.pomodoroWorkMs = 25 * 60 * 1000`; PHASE_COMPLETE fires via Effect 2 |
| 9 | Timer elapsed is wall-clock accurate — computed from Date.now() - startTimestamp, not tick counter | VERIFIED | `useTimer.ts` line 58: `elapsed: action.now - state.startTimestamp` — anchor-time pattern confirmed; TICK dispatches `now: Date.now()` from within setInterval |
| 10 | During an active session, the UI is full-screen timer only (no nav bar) | VERIFIED | `TimerPage` lines 76-91: `if (status === 'running') { return (<div style={screenStyle}><TimerDisplay .../><button>Stop</button></div>); }` — early return with only timer + stop button; no nav, no ModeToggle, no SubjectCombobox |
| 11 | Tapping Stop transitions timer to stopped state | VERIFIED | `STOP` reducer sets `status: 'stopped'`; `stop()` dispatched by Stop button `onClick`; `SessionBottomSheet` renders with `open={status === 'stopped'}` |
| 12 | After Pomodoro work→break transition, totalElapsed accumulates across all phases | VERIFIED | `PHASE_COMPLETE` reducer line 64: `totalElapsed: state.totalElapsed + state.elapsed`; `elapsed: 0`; `startTimestamp: Date.now()` (new phase anchor) |

### Plan 02-03 Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 13 | User can type in the subject field and see a filtered dropdown of their existing subjects | VERIFIED | `SubjectCombobox`: `filtered = subjects.filter(s => s.name.toLowerCase().includes(inputValue.toLowerCase()))`; dropdown renders when `open && filtered.length > 0` |
| 14 | User can press Enter with a new name to create a subject on the fly — it appears in future sessions | VERIFIED (code) / NEEDS HUMAN (persistence) | `handleKeyDown`: `filtered.length === 0` → `addSubject(uid, trimmed)` → added to local `subjects` state; future mount re-fetches via `getSubjects` |
| 15 | Subject field is optional — Start button always active | VERIFIED | Start button has no `disabled` prop tied to subject; `selectedSubject` is `null` by default and `addSession` accepts `subject: null, subjectId: null` |
| 16 | After tapping Stop, a bottom sheet slides up showing elapsed time, subject name, and notes textarea | VERIFIED | `SessionBottomSheet` shows `formatElapsed(elapsed)` prominently; subject name or "No subject"; `<textarea>` for notes; slide-up CSS via `transform: translateY(100%)` → `translateY(0)` on `[open]` |
| 17 | User taps Save — session is written to Firestore and the bottom sheet closes with a brief success toast | VERIFIED (code) / NEEDS HUMAN (Firestore) | `handleSave` calls `addSession(...)`, then `reset()` (which changes status away from stopped, closing the sheet), then sets `showToast: true` with `setTimeout(() => setShowToast(false), 3000)` |
| 18 | User taps Discard (or presses ESC) — session is silently lost, bottom sheet closes, timer resets to idle | VERIFIED (code) / NEEDS HUMAN (no write confirmed) | `handleDiscard` calls `reset()` only (no addSession call); ESC handled by `handleCancel` which calls `onDismiss()` → `handleDiscard`; no confirmation dialog |
| 19 | Saved session document in Firestore contains all 9 required fields with correct types | NEEDS HUMAN | `addSession` code is correct; live document must be verified in Firebase console |

**Automated score: 19/19 truths have correct supporting code. 5 truths additionally require human verification of live runtime behavior.**

---

## Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `firestore.rules` | VERIFIED | Subcollection rules for `/users/{userId}/sessions/{sessionId}` and `/users/{userId}/subjects/{subjectId}`; top-level `/sessions` rule is absent |
| `src/types/session.ts` | VERIFIED | Exports `SessionDocument` (9 fields, correct types) and `Subject` (id, name) |
| `src/firebase/sessions.ts` | VERIFIED | Exports `addSession`; writes to `users/{uid}/sessions` subcollection with all 9 fields |
| `src/firebase/subjects.ts` | VERIFIED | Exports `getSubjects` (ordered by name) and `addSubject` (returns Subject with Firestore id) |
| `src/hooks/useTimer.ts` | VERIFIED | Exports `useTimer`, `TimerState`, `TimerMode`, `TimerStatus`, `PomodoroPhase`, `formatElapsed`; anchor-time TICK; PHASE_COMPLETE accumulation; setInterval cleanup |
| `src/components/TimerDisplay.tsx` | VERIFIED | Exports `TimerDisplay`; stopwatch counts up via `formatElapsed(elapsed)`; Pomodoro counts down via `Math.max(0, targetMs - elapsed)`; shows phase label |
| `src/components/ModeToggle.tsx` | VERIFIED | Exports `ModeToggle`; active/inactive button styles; `disabled` prop blocks clicks and reduces opacity |
| `src/pages/TimerPage.tsx` | VERIFIED | Exports `TimerPage`; composes all components; full-screen running state; correct `durationMs` formula; handleSave/handleDiscard wired |
| `src/components/SubjectCombobox.tsx` | VERIFIED | Exports `SubjectCombobox`; loads on mount; client-side filter; create on Enter; ARIA roles; blur timeout pattern |
| `src/components/SessionBottomSheet.tsx` | VERIFIED | Exports `SessionBottomSheet`; native `<dialog>` with `showModal()`/`close()`; ESC via `onCancel`; isSaving state; Discard button |

---

## Key Link Verification

| From | To | Via | Status | Evidence |
|------|----|-----|--------|----------|
| `src/firebase/sessions.ts` | Firestore `users/{uid}/sessions` | `addDoc(collection(db, 'users', uid, 'sessions'), {...})` | VERIFIED | Line 16: exact path confirmed |
| `src/firebase/subjects.ts` | Firestore `users/{uid}/subjects` | `collection(db, 'users', uid, 'subjects')` | VERIFIED | Lines 8, 16: both getSubjects and addSubject use this path |
| `src/pages/TimerPage.tsx` | `src/hooks/useTimer.ts` | `const { state, start, stop, reset, setMode } = useTimer()` | VERIFIED | Line 32: destructured correctly |
| `src/pages/TimerPage.tsx` | `src/App.tsx` | `<Route path="/" element={<TimerPage />} />` | VERIFIED | App.tsx line 15 confirmed |
| `src/hooks/useTimer.ts` | `Date.now()` wall clock | `elapsed = action.now - state.startTimestamp` in TICK | VERIFIED | Line 58: anchor-time pattern |
| `src/components/SubjectCombobox.tsx` | `src/firebase/subjects.ts` | `getSubjects(uid)` on mount, `addSubject(uid, trimmed)` on Enter | VERIFIED | Lines 22, 63 |
| `src/components/SessionBottomSheet.tsx` | `src/firebase/sessions.ts` (via TimerPage) | `onSave(notes)` → `handleSave` → `addSession(user.uid, {...})` | VERIFIED | TimerPage `handleSave` line 48 |
| `src/pages/TimerPage.tsx` | `src/components/SubjectCombobox.tsx` | `<SubjectCombobox uid={user.uid} onSelect={setSelectedSubject} .../>` | VERIFIED | TimerPage line 111 |
| `src/pages/TimerPage.tsx` | `src/components/SessionBottomSheet.tsx` | `<SessionBottomSheet open={status === 'stopped'} elapsed={state.totalElapsed + state.elapsed} .../>` | VERIFIED | TimerPage lines 132-138 |

**Critical durationMs link:** `durationMs: state.totalElapsed + state.elapsed` — VERIFIED at TimerPage line 54. Uses the correct total-session formula, not `state.elapsed` alone.

---

## Requirements Coverage

| Requirement | Plans | Description | Status | Evidence |
|-------------|-------|-------------|--------|----------|
| TIMR-01 | 02-02 | User can start and stop a stopwatch-style timer to log a session | SATISFIED | `useTimer` START/STOP; `TimerPage` Start/Stop buttons; `SessionBottomSheet` save flow |
| TIMR-02 | 02-01, 02-02 | Anchor-time pattern (elapsed = Date.now() − startTimestamp) | SATISFIED | `useTimer` TICK reducer: `elapsed: action.now - state.startTimestamp` |
| TIMR-03 | 02-02 | Pomodoro countdown timer with auto work/break transitions | SATISFIED (code) | PHASE_COMPLETE fires when `elapsed >= targetMs`; `TimerDisplay` renders countdown; NEEDS HUMAN for live transition |
| TIMR-04 | 02-01, 02-03 | User selects a subject (user-defined, created on the fly) | SATISFIED (code) | `SubjectCombobox` filter+create; `addSubject` persists to Firestore; NEEDS HUMAN for persistence confirmation |
| TIMR-05 | 02-03 | Optional notes/memo field after stopping | SATISFIED | `SessionBottomSheet` `<textarea>` with notes state; passed to `addSession` |
| TIMR-06 | 02-01, 02-03 | Session document with subject, duration, timestamps, notes, privacy, userId | SATISFIED (code) | All 9 fields in `addSession`; NEEDS HUMAN for live Firestore doc confirmation |
| TIMR-07 | 02-01, 02-03 | Session has privacy setting set at logging time | SATISFIED | `addSession` hardcodes `privacy: 'public' as const`; `SessionDocument` type has full privacy union for future phases |

All 7 required TIMR requirements are covered. No orphaned requirements detected — all 7 IDs appear in plan frontmatter and map to implemented code.

---

## Anti-Patterns Scan

Files scanned: `firestore.rules`, `src/types/session.ts`, `src/firebase/sessions.ts`, `src/firebase/subjects.ts`, `src/hooks/useTimer.ts`, `src/components/TimerDisplay.tsx`, `src/components/ModeToggle.tsx`, `src/pages/TimerPage.tsx`, `src/components/SubjectCombobox.tsx`, `src/components/SessionBottomSheet.tsx`, `src/App.tsx`

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/pages/TimerPage.tsx` | 108 | `ModeToggle disabled={false}` hardcoded | Warning | Mode toggle is never disabled during any state, including `stopped`. Plan 02-02 specified `disabled={status === 'running'}` but the prop is hardcoded `false`. Toggle is blocked during `running` by the early return (running renders a different subtree entirely), so the user cannot actually switch modes while running — but the prop intent is wrong. Low functional impact, minor inconsistency. |

No TODO/FIXME/placeholder comments found in any phase 2 file. No empty return stubs. No console.log-only handlers. No `return null` stubs.

**Note on `ModeToggle disabled` prop:** `TimerPage` passes `disabled={false}` unconditionally. This is technically benign because the running state returns a completely different JSX subtree with no ModeToggle rendered at all — so the toggle cannot be clicked while running regardless. However, when `status === 'stopped'`, the ModeToggle is rendered and the `disabled` prop is `false`, meaning a user could technically click to switch modes while the bottom sheet is open. This does not block the phase goal but is worth noting.

---

## Human Verification Required

### 1. Anchor-Time Accuracy Under Tab Backgrounding

**Test:** Start the stopwatch, switch to a different browser tab for at least 30 seconds, return to the app.
**Expected:** The displayed elapsed time is >= 30 seconds — not clamped or truncated to a smaller value caused by timer throttling.
**Why human:** Tab throttling (browsers throttle setInterval to 1Hz in background tabs) cannot be reproduced in static analysis. The anchor-time pattern is correctly coded (`elapsed = Date.now() - startTimestamp`) but only a live browser test confirms it works as intended when the tab is actually backgrounded.

### 2. Pomodoro Phase Auto-Transition at 00:00

**Test:** Start the Pomodoro timer and allow the 25-minute countdown to reach 00:00 (or temporarily edit `pomodoroWorkMs` to a small value like 10 seconds for a faster test).
**Expected:** The display automatically flips to "Break" and begins counting down from 5:00 with no user action required.
**Why human:** The PHASE_COMPLETE dispatch is triggered by a React effect on `state.elapsed` — requires the live React reconciler and real time passing to observe the transition.

### 3. New Subject Persisted Across Sessions

**Test:** Type a subject name that does not yet exist, press Enter. Start timer, stop, save. Reset app (refresh). Begin a new session and type the same subject name.
**Expected:** The subject appears in the dropdown, confirming it was persisted to Firestore and re-fetched on the next mount.
**Why human:** Requires actual Firestore write and subsequent read — cannot verify Firestore persistence from static code.

### 4. Firestore Session Document Field Inspection

**Test:** Complete a full session (start → stop → save). Open Firebase console > Firestore > users/{your-uid}/sessions > the new document.
**Expected:** Document contains exactly these 9 fields with correct types: `userId` (string), `subject` (string or null), `subjectId` (string or null), `durationMs` (number > 0), `startTimestamp` (Firestore Timestamp), `endTimestamp` (Firestore Timestamp — server-resolved), `notes` (string), `privacy` ("public"), `createdAt` (Firestore Timestamp — server-resolved).
**Why human:** Live Firestore document inspection is required to confirm server-side field types (especially that `endTimestamp` and `createdAt` are resolved Timestamps, not pending FieldValue sentinels).

### 5. Discard Produces No Firestore Write

**Test:** Start timer, stop it, then tap Discard (or press ESC).
**Expected:** Bottom sheet closes, timer resets to idle (00:00), no new document appears in Firestore users/{uid}/sessions.
**Why human:** Confirming the absence of a Firestore write requires checking the Firebase console after the discard action — static code shows no `addSession` call in `handleDiscard`, but the actual absence of a document must be confirmed live.

---

## Gaps Summary

No automated gaps found. All 19 observable truths are supported by correct, substantive, wired code. All 7 TIMR requirement IDs map to implemented artifacts. No stubs or placeholder implementations detected.

The 5 human verification items are runtime/external-service checks that cannot be resolved by static analysis. They do not indicate code defects — they confirm live behavior that the code is designed to produce.

---

_Verified: 2026-03-02_
_Verifier: Claude (gsd-verifier)_
