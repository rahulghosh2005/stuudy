# Phase 2: Timer and Sessions - Context

**Gathered:** 2026-03-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can track a focused study session from start to finish and have it permanently recorded. This phase delivers: a real-time timer (stopwatch and Pomodoro modes), subject tagging, an optional notes step, and Firestore persistence with accurate wall-clock duration. Browsing past sessions, editing saved sessions, and session sharing are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Timer mode layout
- Single `/timer` page — Stopwatch and Pomodoro on one screen, toggled by a mode switcher at the top
- The home route (`/`) renders the timer page directly — opening the app lands you in the timer, no dashboard step
- When a session is actively running, the screen shows the timer only — no nav bar, no distractions (full focus mode)
- Timer state resets when the mode toggle is switched
- Pomodoro defaults: 25 min work / 5 min break (classic — no per-session configurability in Phase 2)

### Subject selection
- Subject field is visible on the pre-timer screen (before the user taps Start)
- Interaction: single text input, type to filter existing subjects, Enter/tap creates a new subject on the fly and persists it
- Subject is optional — Start button is always active; sessions without a subject save with `subject: null`
- Subjects are stored as a `users/{uid}/subjects/{subjectId}` subcollection in Firestore

### Session save flow
- After tapping Stop: a bottom sheet slides up over the timer screen
- Sheet contents: read-only duration summary (e.g. "42 min"), subject label, optional notes textarea, Save button
- Dismiss = discard silently — session is lost, no confirmation dialog, timer resets to idle
- After a successful save: sheet closes, timer resets to idle (optionally a brief success toast)
- No separate session detail or review page in Phase 2

### Privacy (Claude's discretion)
- All Phase 2 sessions save with `privacy: "public"` — no UI toggle exposed yet
- Privacy field is stored as a string (`"public"` | `"private"` | `"followers_only"`) for non-breaking extensibility
- Toggle UI and per-session privacy selection belong in Phase 5 when the social feed needs it

### Claude's Discretion
- Timer display style (HH:MM:SS readout, ring/progress indicator for Pomodoro, font size)
- Exact animation/transition for the bottom sheet
- Toast design after successful save
- Loading and error states for Firestore writes
- Tab backgrounding accuracy implementation (use `Date.now()` diff, not `setInterval` counter — technical detail)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useAuth()` hook (`src/contexts/AuthContext.tsx`): provides `user.uid` — needed for every Firestore write in this phase (sessions, subjects)
- `db` export (`src/firebase/config.ts`): Firestore instance ready to use — no additional setup
- `ProtectedRoute` (`src/components/ProtectedRoute.tsx`): timer page must be wrapped inside this — already in place in App.tsx

### Established Patterns
- Firestore writes use `setDoc` with `{ merge: true }` (see `users.ts`) — session writes should use `addDoc` to the `sessions` subcollection (new documents, not upserts)
- Auth state accessed via `useAuth()` context, not directly via Firebase SDK — keep consistent
- No UI component library exists yet — timer display, bottom sheet, and combobox input all need to be built from scratch in this phase

### Integration Points
- `App.tsx` routing: replace the current `/` placeholder route with `<TimerPage />` inside `<ProtectedRoute>`
- `UserProfile.totalStudyMinutes` (in `user.ts`): Phase 3 will aggregate session durations into this field — sessions written in Phase 2 are the source data
- Session documents live at `users/{uid}/sessions/{sessionId}` — consistent with the existing `users/{uid}` ownership pattern and Firestore security rules (PRIV-03 already scaffolds session write ownership rule)

</code_context>

<specifics>
## Specific Ideas

- No specific references mentioned — open to standard approaches for timer UI and bottom sheet implementation

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-timer-and-sessions*
*Context gathered: 2026-03-02*
