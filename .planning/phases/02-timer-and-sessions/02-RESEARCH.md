# Phase 2: Timer and Sessions - Research

**Researched:** 2026-03-01
**Domain:** React timer state management, Firestore subcollection writes, custom UI components (combobox, bottom sheet)
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Timer mode layout
- Single `/timer` page — Stopwatch and Pomodoro on one screen, toggled by a mode switcher at the top
- The home route (`/`) renders the timer page directly — opening the app lands you in the timer, no dashboard step
- When a session is actively running, the screen shows the timer only — no nav bar, no distractions (full focus mode)
- Timer state resets when the mode toggle is switched
- Pomodoro defaults: 25 min work / 5 min break (classic — no per-session configurability in Phase 2)

#### Subject selection
- Subject field is visible on the pre-timer screen (before the user taps Start)
- Interaction: single text input, type to filter existing subjects, Enter/tap creates a new subject on the fly and persists it
- Subject is optional — Start button is always active; sessions without a subject save with `subject: null`
- Subjects are stored as a `users/{uid}/subjects/{subjectId}` subcollection in Firestore

#### Session save flow
- After tapping Stop: a bottom sheet slides up over the timer screen
- Sheet contents: read-only duration summary (e.g. "42 min"), subject label, optional notes textarea, Save button
- Dismiss = discard silently — session is lost, no confirmation dialog, timer resets to idle
- After a successful save: sheet closes, timer resets to idle (optionally a brief success toast)
- No separate session detail or review page in Phase 2

#### Privacy
- All Phase 2 sessions save with `privacy: "public"` — no UI toggle exposed yet
- Privacy field is stored as a string (`"public"` | `"private"` | `"followers_only"`) for non-breaking extensibility
- Toggle UI and per-session privacy selection belong in Phase 5

### Claude's Discretion
- Timer display style (HH:MM:SS readout, ring/progress indicator for Pomodoro, font size)
- Exact animation/transition for the bottom sheet
- Toast design after successful save
- Loading and error states for Firestore writes
- Tab backgrounding accuracy implementation (use `Date.now()` diff, not `setInterval` counter — technical detail)

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TIMR-01 | User can start and stop a stopwatch-style timer to log a session | Anchor-time pattern with `useReducer` state machine; `setInterval` for display refresh only |
| TIMR-02 | Timer uses anchor-time pattern (elapsed = Date.now() − startTimestamp) to prevent browser tab throttling drift | Chrome 88+ throttles background `setInterval` to 1-minute intervals; anchor timestamp is the standard fix |
| TIMR-03 | User can use a Pomodoro-style countdown timer with configurable work/break intervals | Countdown variant of same hook; phase transition on `remaining === 0`; 25/5 defaults hardcoded in Phase 2 |
| TIMR-04 | User selects a subject before or during a session (user-defined subjects, created on the fly) | Custom combobox: `useState` filter + `addDoc` to `users/{uid}/subjects/{id}`; no external library |
| TIMR-05 | User can add an optional notes/memo field after stopping a session | Textarea inside bottom sheet; captured in stop-session state before `addDoc` to sessions |
| TIMR-06 | Stopping the timer logs a session document (subject, duration, startTimestamp, endTimestamp, notes, privacyLevel, userId) | `addDoc(collection(db, 'users', uid, 'sessions'), {...})` with `serverTimestamp()` for end; startTimestamp captured at Start |
| TIMR-07 | Each session has a privacy setting (Public / Followers / Private) set before or at logging | Phase 2 hardcodes `privacy: "public"` — field stored as string for Phase 5 extensibility |
</phase_requirements>

---

## Summary

Phase 2 builds the entire timer and session logging workflow on top of the Firebase + React 19 foundation from Phase 1. The core technical challenge has three parts: (1) implementing an accurate timer that does not drift when the browser tab is backgrounded, (2) building custom UI components (a subject combobox and a slide-up bottom sheet) without a UI library, and (3) writing session data to Firestore with the correct document shape for Phase 3 aggregation.

The anchor-time pattern (TIMR-02) is non-negotiable and well-understood: store `startTimestamp = Date.now()` when the user taps Start; on every `setInterval` tick (used only for display refresh, not time-keeping), compute `elapsed = Date.now() - startTimestamp`. Chrome 88+ can throttle background `setInterval` to fire once per minute, but because the timer reads wall-clock time rather than counting ticks, the displayed time catches up correctly when the tab is re-focused.

There is one critical path conflict to resolve before coding begins: the existing Firestore security rules scaffold a top-level `/sessions/{sessionId}` collection, but CONTEXT.md specifies session documents at `users/{uid}/sessions/{sessionId}` (a subcollection). These are different Firestore paths; the current rules do **not** cover the subcollection path. The Firestore rules must be updated in the first task of this phase.

**Primary recommendation:** Use a single `useTimerReducer` custom hook covering both Stopwatch and Pomodoro modes with states `idle | running | paused | stopped`; drive display via `setInterval` at 500 ms with elapsed computed from `Date.now() - startTimestamp`; write sessions to `users/{uid}/sessions` subcollection via `addDoc`; update Firestore security rules for subcollection path before any data writes.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| firebase | 12.10.0 | Firestore writes (`addDoc`, `collection`, `getDocs`, `serverTimestamp`) | Already installed; modular API is the only supported style |
| react | 19.2.0 | UI rendering, hooks (`useReducer`, `useEffect`, `useRef`, `useState`) | Project constraint |
| react-router-dom | 7.13.1 | Route replacement (`/` → `<TimerPage />`) | Already installed |
| typescript | ~5.9.3 | Type-safe session and subject interfaces | Project constraint |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none new) | — | All UI built from scratch | No UI library is installed or planned |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom combobox | Downshift or Headless UI | Adds a dependency; custom is ~80 lines and sufficient for a simple filter-and-create pattern |
| Custom bottom sheet | react-modal-sheet or react-spring-bottom-sheet | Adds dependency + animation library; native `<dialog>` + CSS `translate` transition is sufficient for this use case |
| Anchor-time pattern | `setInterval` tick counter | Tick counter drifts in background tabs — never use for elapsed time; anchor-time is the industry standard |

**Installation:** No new packages needed. All required Firebase functions are already in the `firebase` package.

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── hooks/
│   └── useTimer.ts           # Timer state machine (stopwatch + pomodoro modes)
├── firebase/
│   ├── sessions.ts           # addSession(), type SessionDocument
│   └── subjects.ts           # getSubjects(), addSubject(), type Subject
├── types/
│   └── session.ts            # SessionDocument interface
├── pages/
│   └── TimerPage.tsx         # Route handler — composes timer + subject + bottom sheet
└── components/
    ├── TimerDisplay.tsx      # HH:MM:SS readout (receives elapsed, mode)
    ├── SubjectCombobox.tsx   # Filter-and-create subject selector
    ├── SessionBottomSheet.tsx # Slide-up save sheet (dialog element)
    └── ModeToggle.tsx        # Stopwatch / Pomodoro switcher
```

### Pattern 1: Anchor-Time Timer State Machine

**What:** A `useReducer`-based hook that tracks `mode`, `phase` (for Pomodoro), `status` (`idle | running | stopped`), `startTimestamp`, and `elapsed`. The `setInterval` runs at 500 ms and only triggers a re-render with the current `Date.now() - startTimestamp` value — it never increments a counter.

**When to use:** Any timer that must survive tab backgrounding.

**Example:**
```typescript
// Source: Pattern derived from Chrome timer-throttling guidance
// https://developer.chrome.com/blog/timer-throttling-in-chrome-88

type TimerMode = 'stopwatch' | 'pomodoro';
type TimerStatus = 'idle' | 'running' | 'stopped';
type PomodoroPhase = 'work' | 'break';

interface TimerState {
  mode: TimerMode;
  status: TimerStatus;
  startTimestamp: number | null;   // Date.now() at the moment Start was tapped
  elapsed: number;                 // milliseconds — derived on each tick, never counted
  pomodoroPhase: PomodoroPhase;
  pomodoroWorkMs: number;          // 25 * 60 * 1000
  pomodoroBreakMs: number;         // 5 * 60 * 1000
}

type TimerAction =
  | { type: 'START' }
  | { type: 'STOP' }
  | { type: 'TICK'; now: number }
  | { type: 'SET_MODE'; mode: TimerMode }
  | { type: 'RESET' };

function timerReducer(state: TimerState, action: TimerAction): TimerState {
  switch (action.type) {
    case 'START':
      return { ...state, status: 'running', startTimestamp: Date.now() };
    case 'STOP':
      return { ...state, status: 'stopped' };
    case 'TICK': {
      if (state.status !== 'running' || state.startTimestamp === null) return state;
      const elapsed = action.now - state.startTimestamp;
      return { ...state, elapsed };
    }
    case 'SET_MODE':
      // Reset all timer state when mode changes (locked decision)
      return { ...initialTimerState, mode: action.mode };
    case 'RESET':
      return { ...initialTimerState, mode: state.mode };
    default:
      return state;
  }
}

// In the hook, setInterval fires at 500ms and dispatches TICK with Date.now()
// This ensures elapsed is always wall-clock accurate, not tick-count dependent
```

### Pattern 2: Pomodoro Countdown with Auto-Phase Transition

**What:** Pomodoro remaining time = `targetMs - elapsed`. When remaining hits zero, dispatch `PHASE_COMPLETE` to switch work→break or break→work and reset `startTimestamp = Date.now()`.

**When to use:** Pomodoro mode only.

**Example:**
```typescript
// In useEffect (inside the hook), after TICK is dispatched:
useEffect(() => {
  if (state.mode !== 'pomodoro' || state.status !== 'running') return;
  const targetMs = state.pomodoroPhase === 'work'
    ? state.pomodoroWorkMs
    : state.pomodoroBreakMs;
  const remaining = targetMs - state.elapsed;
  if (remaining <= 0) {
    dispatch({ type: 'PHASE_COMPLETE' }); // switches phase, resets startTimestamp
  }
}, [state.elapsed]);
```

### Pattern 3: Subject Combobox (Filter + Create)

**What:** A controlled input that filters an in-memory list of subjects loaded from Firestore on mount. Pressing Enter with a value not in the list creates a new subject document and adds it to the list.

**When to use:** Anywhere a user needs to select from or add to a personal list.

**Example:**
```typescript
// Source: MDN ARIA combobox pattern
// https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/combobox_role

function SubjectCombobox({ uid, onSelect }: { uid: string; onSelect: (s: Subject | null) => void }) {
  const [inputValue, setInputValue] = useState('');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [open, setOpen] = useState(false);

  const filtered = subjects.filter(s =>
    s.name.toLowerCase().includes(inputValue.toLowerCase())
  );

  async function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      if (filtered.length > 0) {
        onSelect(filtered[0]);
      } else if (inputValue.trim()) {
        // Create new subject
        const ref = await addDoc(collection(db, 'users', uid, 'subjects'), {
          name: inputValue.trim(),
          createdAt: serverTimestamp(),
        });
        const newSubject = { id: ref.id, name: inputValue.trim() };
        setSubjects(prev => [...prev, newSubject]);
        onSelect(newSubject);
      }
      setOpen(false);
    }
  }

  return (
    <div role="combobox" aria-expanded={open} aria-haspopup="listbox">
      <input value={inputValue} onChange={e => { setInputValue(e.target.value); setOpen(true); }}
             onKeyDown={handleKeyDown} placeholder="Subject (optional)" />
      {open && filtered.length > 0 && (
        <ul role="listbox">
          {filtered.map(s => (
            <li key={s.id} role="option" onClick={() => { onSelect(s); setOpen(false); }}>
              {s.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

### Pattern 4: Bottom Sheet using Native `<dialog>`

**What:** Use the HTML `<dialog>` element with `showModal()` for built-in focus trapping, ESC key support, and backdrop. Apply a CSS `translate` transform for slide-up animation.

**When to use:** Any overlay that needs focus management without a library.

**Example:**
```typescript
// Source: MDN <dialog> element docs
// https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog

// CSS:
// dialog { transform: translateY(100%); transition: transform 0.3s ease; }
// dialog[open] { transform: translateY(0); }
// dialog::backdrop { background: rgba(0,0,0,0.5); }

function SessionBottomSheet({ open, elapsed, subject, onSave, onDismiss }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open) {
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
      setNotes('');
    }
  }, [open]);

  // ESC key triggers onDismiss via the native 'cancel' event
  function handleCancel(e: React.SyntheticEvent) {
    e.preventDefault(); // prevent dialog from closing itself; let state control it
    onDismiss();
  }

  return (
    <dialog ref={dialogRef} onCancel={handleCancel}>
      <p>{formatElapsed(elapsed)}</p>
      {subject && <p>{subject.name}</p>}
      <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)" />
      <button onClick={() => onSave(notes)}>Save Session</button>
      <button onClick={onDismiss}>Discard</button>
    </dialog>
  );
}
```

### Pattern 5: Session Write to Firestore Subcollection

**What:** `addDoc` to `users/{uid}/sessions` with all required fields. `startTimestamp` is captured as `Date.now()` at Start time; `endTimestamp` is `serverTimestamp()` at Save time; `durationMs` is derived from the timer's elapsed value.

**When to use:** Every time user taps Save in the bottom sheet.

**Example:**
```typescript
// Source: Firebase official docs — add-data
// https://firebase.google.com/docs/firestore/manage-data/add-data

import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from './config';

export interface SessionDocument {
  userId: string;
  subject: string | null;         // subject name or null
  subjectId: string | null;       // subject doc ID for Phase 3 aggregation
  durationMs: number;             // wall-clock elapsed in milliseconds
  startTimestamp: Timestamp;      // Firestore Timestamp — captured at Start
  endTimestamp: FieldValue;       // serverTimestamp() at Save
  notes: string;                  // empty string if none
  privacy: 'public' | 'private' | 'followers_only';
  createdAt: FieldValue;          // serverTimestamp() — for ordering in Phase 3/5
}

export async function addSession(uid: string, data: Omit<SessionDocument, 'createdAt' | 'endTimestamp'>): Promise<void> {
  await addDoc(collection(db, 'users', uid, 'sessions'), {
    ...data,
    endTimestamp: serverTimestamp(),
    createdAt: serverTimestamp(),
  });
}
```

### Anti-Patterns to Avoid

- **Counting `setInterval` ticks for elapsed time:** Each tick is supposed to fire every 1000 ms but Chrome throttles background tabs — ticks are skipped or delayed. After 5 minutes backgrounded, Chrome 88+ fires the interval only once per minute. Always compute elapsed from `Date.now() - startTimestamp`.
- **Calling `addDoc` directly in components:** Encapsulate Firestore writes in `src/firebase/sessions.ts` and `src/firebase/subjects.ts`. Consistent with Phase 1's `users.ts` pattern.
- **Using `setDoc` for new sessions:** Sessions are always new documents — use `addDoc` (auto-ID), not `setDoc` with a manually constructed ID.
- **Storing sessions at top-level `/sessions/{id}`:** The CONTEXT.md specifies the subcollection path `users/{uid}/sessions/{id}`. The Phase 1 Firestore rules scaffold incorrectly used a top-level path — this must be corrected in Phase 2 rules update.
- **Storing `startTimestamp` as `Date.now()` number in Firestore:** Store as a `Firestore.Timestamp` or use `Timestamp.fromMillis(startMs)` for consistency with `endTimestamp`; this enables Phase 3 server-side timestamp queries.
- **Rendering the subject dropdown for all keystrokes without debounce:** Load subjects once on mount (they're a personal list, typically <50 items); filter client-side. Do not hit Firestore on every keystroke.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Focus trapping in bottom sheet | Custom focus-trap logic | Native `<dialog>.showModal()` | Browser handles focus cycling, ESC key, backdrop natively |
| Timer drift correction | Background sync, Web Worker | Anchor-time pattern (`Date.now() - startTimestamp`) | Simpler and correct; the display interval is just for re-renders |
| Subject ID generation | Manual UUID | `addDoc` auto-generates Firestore document ID | IDs are guaranteed unique, collision-free |
| Timestamp on session save | `new Date()` | `serverTimestamp()` | Client clocks can be wrong; server timestamp is authoritative for Phase 3 aggregation |

**Key insight:** The anchor-time pattern eliminates the need for any drift correction library or Web Worker. The only complex custom component is the subject combobox — and at ~80 lines it is simpler to build than to integrate a full headless UI library.

---

## Common Pitfalls

### Pitfall 1: Firestore Rules Path Mismatch (CRITICAL)

**What goes wrong:** Sessions written to `users/{uid}/sessions/{id}` are silently rejected because the existing rules only cover the top-level `/sessions/{sessionId}` collection.
**Why it happens:** Phase 1 scaffolded rules for a top-level `sessions` collection; CONTEXT.md and the integration notes specify a subcollection under `users`.
**How to avoid:** The first task in Phase 2 must update `firestore.rules` to add:
```
match /users/{userId}/sessions/{sessionId} {
  allow read: if request.auth != null;
  allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
  allow update, delete: if request.auth != null && resource.data.userId == request.auth.uid;
}
match /users/{userId}/subjects/{subjectId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```
Deploy rules before any data write code is merged.
**Warning signs:** Firestore write throws `PERMISSION_DENIED` in the console.

### Pitfall 2: Timer Drift When Tab is Backgrounded

**What goes wrong:** Elapsed time shown after re-focusing the tab is less than actual wall-clock time.
**Why it happens:** Chrome 88+ throttles chained `setInterval` in background tabs — after 5 minutes backgrounded, the interval fires only once per minute instead of once per second.
**How to avoid:** Always compute `elapsed = Date.now() - state.startTimestamp` inside the interval callback. The interval's only job is to trigger a re-render; it does not track time.
**Warning signs:** After minimizing the browser for 2 minutes and re-opening, the timer shows less than 2 minutes elapsed.

### Pitfall 3: `setInterval` Memory Leak on Component Unmount

**What goes wrong:** The interval keeps firing after the `TimerPage` component unmounts (e.g., user navigates away), causing state updates on an unmounted component and memory leaks.
**Why it happens:** `setInterval` is not automatically cleared when a component unmounts.
**How to avoid:** Always return `() => clearInterval(id)` from the `useEffect` that starts the interval. In the `useTimer` hook, store the interval ID in a `useRef` and clear it in the cleanup function.
**Warning signs:** React DevTools shows state updates after navigation; ESLint warns about state updates on unmounted components.

### Pitfall 4: Dialog `cancel` Event Bypasses React State

**What goes wrong:** User presses ESC to dismiss the bottom sheet but the React state (`open`) remains `true`, causing the sheet to immediately re-open.
**Why it happens:** The native `<dialog>` element fires a `cancel` event on ESC, then calls `close()` on itself. React doesn't know the dialog was closed.
**How to avoid:** Handle the `onCancel` event on the `<dialog>` element, call `e.preventDefault()` to stop the native close, and then call your `onDismiss` callback which sets `open = false` in React state.
**Warning signs:** Dialog appears to close on ESC but flickers back open.

### Pitfall 5: Subject Subcollection Not Loaded Before Timer Starts

**What goes wrong:** The subject dropdown is empty when the user first opens the app because subjects haven't loaded yet.
**Why it happens:** Firestore reads are async; if `getDocs` is not awaited before render, the initial subject list is empty.
**How to avoid:** Load subjects in a `useEffect` with `uid` dependency inside `SubjectCombobox` (or hoist to `TimerPage`). Show a loading indicator or empty-state "No subjects yet — type to create" message while loading.
**Warning signs:** Combobox shows empty list even after subjects exist in Firestore.

### Pitfall 6: `startTimestamp` Stored as Millisecond Number, Not Firestore Timestamp

**What goes wrong:** Phase 3 timestamp queries fail because `startTimestamp` is a plain number (`1704067200000`) instead of a Firestore `Timestamp` object.
**Why it happens:** It's tempting to store `startTimestamp: Date.now()` directly.
**How to avoid:** Convert before writing: `startTimestamp: Timestamp.fromMillis(startMs)`. This ensures the field type is consistent with `endTimestamp` (serverTimestamp) and supports Firestore range queries in Phase 3.
**Warning signs:** Phase 3 `where('startTimestamp', '>=', ...)` queries return unexpected results.

---

## Code Examples

Verified patterns from official sources:

### Firestore addDoc to Subcollection
```typescript
// Source: Firebase official docs
// https://firebase.google.com/docs/firestore/manage-data/add-data
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from './config';

async function addSession(uid: string, payload: {
  subject: string | null;
  subjectId: string | null;
  durationMs: number;
  startMs: number;   // Date.now() captured at Start
  notes: string;
}): Promise<void> {
  await addDoc(collection(db, 'users', uid, 'sessions'), {
    userId: uid,
    subject: payload.subject,
    subjectId: payload.subjectId,
    durationMs: payload.durationMs,
    startTimestamp: Timestamp.fromMillis(payload.startMs),
    endTimestamp: serverTimestamp(),
    notes: payload.notes,
    privacy: 'public',
    createdAt: serverTimestamp(),
  });
}
```

### Firestore getDocs for Subjects
```typescript
// Source: Firebase official docs
// https://firebase.google.com/docs/firestore/query-data/get-data
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from './config';

export interface Subject {
  id: string;
  name: string;
}

export async function getSubjects(uid: string): Promise<Subject[]> {
  const snap = await getDocs(
    query(collection(db, 'users', uid, 'subjects'), orderBy('name'))
  );
  return snap.docs.map(doc => ({ id: doc.id, name: doc.data().name as string }));
}
```

### Anchor-Time Tick in useEffect
```typescript
// Source: Chrome timer throttling guidance
// https://developer.chrome.com/blog/timer-throttling-in-chrome-88
useEffect(() => {
  if (status !== 'running') return;
  const id = setInterval(() => {
    // Do NOT increment a counter — always read wall clock
    dispatch({ type: 'TICK', now: Date.now() });
  }, 500); // 500ms gives smooth display without excessive CPU
  return () => clearInterval(id); // MUST clean up
}, [status]);
```

### Elapsed Time Formatter
```typescript
// No library needed — straightforward math
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
```

### Firestore Rules for Phase 2 Subcollections
```
// Add to firestore.rules (replacing/alongside the top-level /sessions rule)
match /users/{userId}/sessions/{sessionId} {
  allow read: if request.auth != null;
  allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
  allow update, delete: if request.auth != null && resource.data.userId == request.auth.uid;
}

match /users/{userId}/subjects/{subjectId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `setInterval` tick counter for elapsed | Anchor-time: `Date.now() - startTimestamp` | Chrome 88 (Jan 2021), intensified Chrome 88+ | Background tab timers now drift by up to 1 minute per tick if counter-based |
| Custom modal with focus-trap library | Native `<dialog>.showModal()` | Safari 15.4 (2022) completed universal support | No library needed; browser handles focus, ESC, backdrop |
| Firebase v8 `firebase.firestore().collection()` | Modular v9+: `import { collection, addDoc } from 'firebase/firestore'` | Firebase v9 (2021) | Tree-shakeable; v8 namespaced API is deprecated in v12 |

**Deprecated/outdated:**
- `setInterval` tick counting: replaced by anchor-time pattern for any timer that must survive tab backgrounding
- Firebase namespaced API (`firebase.firestore()`): removed in Firebase v12; use modular imports only

---

## Open Questions

1. **Top-level `/sessions` rule vs. subcollection path**
   - What we know: Existing `firestore.rules` has `match /sessions/{sessionId}` (top-level). CONTEXT.md specifies `users/{uid}/sessions/{sessionId}` (subcollection). These are different Firestore paths.
   - What's unclear: Should the top-level rule be removed or kept? Keeping it creates a misleading open path; removing it is safe since no data has been written there yet.
   - Recommendation: Remove the top-level `/sessions/{sessionId}` rule and add subcollection rules for `users/{userId}/sessions/{sessionId}` and `users/{userId}/subjects/{subjectId}`. Deploy before first data write.

2. **Pomodoro: should the session be logged after each work interval or only when the user taps Stop?**
   - What we know: TIMR-06 says "stopping the timer logs a session." TIMR-03 says the timer transitions automatically between work and break.
   - What's unclear: Auto-transition in Pomodoro — does it auto-log a session after each work interval, or does the user tap Stop to log one session covering all elapsed work time?
   - Recommendation: Keep it simple for Phase 2 — Stop always triggers the log flow, and the logged duration is total elapsed time (across all work + break intervals for the session). Auto-logging per-interval is a Phase 2+ enhancement.

3. **Bottom sheet animation: CSS `translate` transition vs. CSS `@starting-style`**
   - What we know: CSS `translate` transition on `dialog[open]` works in all modern browsers. `@starting-style` (Chrome 117+, Firefox 129+) allows animating from closed to open state natively.
   - What's unclear: Safari support for `@starting-style` is limited.
   - Recommendation: Use `translate` + `transition` approach (universal support). Do not use `@starting-style` until Safari catches up.

---

## Sources

### Primary (HIGH confidence)
- Firebase official docs (https://firebase.google.com/docs/firestore/manage-data/add-data) — `addDoc`, subcollection path pattern, `serverTimestamp`
- Chrome Developers blog (https://developer.chrome.com/blog/timer-throttling-in-chrome-88) — timer throttling behavior, anchor-time recommendation
- MDN Web Docs (https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog) — `<dialog>` element, `showModal()`, `cancel` event, focus trapping
- MDN Web Docs (https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilitychange_event) — Page Visibility API, `visibilitychange` event

### Secondary (MEDIUM confidence)
- MDN ARIA combobox role (https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/combobox_role) — combobox/listbox/option ARIA attributes, `aria-activedescendant`
- Dan Abramov, "Making setInterval Declarative with React Hooks" (https://overreacted.io/making-setinterval-declarative-with-react-hooks/) — `useEffect` cleanup pattern for `setInterval`
- Firebase JS SDK GitHub discussions — modular v9+ TypeScript patterns for subcollections

### Tertiary (LOW confidence)
- Community blog posts on Pomodoro timer patterns (LogRocket, AG Grid blog) — reducer state machine examples; not cross-verified against React 19 docs but patterns are foundational and stable

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Firebase 12 and React 19 are the installed versions; no new packages needed
- Architecture: HIGH — Anchor-time pattern is confirmed by Chrome official docs; `addDoc` subcollection pattern confirmed by Firebase official docs; `<dialog>` confirmed by MDN
- Pitfalls: HIGH for Firestore rules mismatch (verified by reading actual `firestore.rules`); HIGH for timer drift (verified by Chrome blog); MEDIUM for `@starting-style` browser support (WebSearch only)

**Research date:** 2026-03-01
**Valid until:** 2026-04-01 (Firebase SDK and React 19 are stable; browser APIs well-established)
