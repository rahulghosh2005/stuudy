---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: in_progress
last_updated: "2026-03-02T20:16:43Z"
progress:
  total_phases: 6
  completed_phases: 2
  total_plans: 11
  completed_plans: 7
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-01)

**Core value:** Make studying feel like a sport — personal performance data worth tracking, and a social feed that makes progress visible to the people who matter.
**Current focus:** Phase 3 — Stats and Goals (in progress)

## Current Position

Phase: 3 of 6 (Stats and Goals) — IN PROGRESS
Plan: 1 of 5 in current phase — complete
Status: Plan 03-01 complete, ready for 03-02
Last activity: 2026-03-02 — Plan 03-01 completed

Progress: [████████░░] 38%

## Performance Metrics

**Velocity:**
- Total plans completed: 7
- Average duration: 4 min
- Total execution time: 0.2 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Foundation | 3 | 13 min | 4.3 min |

**Recent Trend:**
- Last 5 plans: 01-01 (2 min), 01-02 (5 min), 01-03 (6 min)
- Trend: steady

*Updated after each plan completion*
| Phase 02-timer-and-sessions P01 | 6 | 2 tasks | 4 files |
| Phase 02-timer-and-sessions P02 | 2 | 2 tasks | 5 files |
| Phase 02-timer-and-sessions P03 | 2 | 2 tasks | 3 files |
| Phase 02-timer-and-sessions P03 | 7 | 3 tasks | 3 files |
| Phase 03-stats-and-goals P01 | 5 | 3 tasks | 7 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Firebase Auth (Google only): Simplest auth for v1, users likely have Google accounts
- Firestore as primary DB: Real-time updates for live feed, pairs with Firebase Auth
- RTDB for presence: Firestore alone cannot detect browser crash — onDisconnect() requires RTDB
- Fan-out on write for feed: Cloud Function fan-out gives O(1) feed reads — must be Cloud Function not client
- Timer must use anchor-time pattern: Store startTimestamp, derive elapsed from wall-clock delta — never count setInterval ticks
- Firebase singleton at module level: initializeApp called once in src/firebase/config.ts — never in components or hooks (01-01)
- VITE_FIREBASE_* env var prefix: all Firebase config via import.meta.env.VITE_FIREBASE_* — never REACT_APP_ or bare env vars (01-01)
- UserProfile 12-field contract upfront: all phase 1-6 fields defined in src/types/user.ts now to prevent cascading schema changes later (01-01)
- [Phase 01]: signInWithPopup over signInWithRedirect: popup avoids third-party cookie blocking on Chrome 115+/Safari 16.1+/Firefox 109+
- [Phase 01]: setDoc with merge:true for idempotent user document writes: preserves stats/counts owned by later phases
- [Phase 01]: AuthProvider loading guard at provider level: single point prevents flash of protected content and spurious /login redirect
- [Phase 01]: deny-all catch-all as Firestore default: match /{document=**} deny-all ensures new collections are locked until explicitly opened (01-03)
- [Phase 01]: sessions scaffold in Phase 1 rules: write ownership rules added now so Phase 2 sessions writes work without a rules deployment step (01-03)
- [Phase 01]: PROF-02 partial delivery: followerCount/followingCount rendered as numeric counts in Phase 1; browsable lists deferred to Phase 4 SOCL-03 (01-03)
- [Phase 01]: getDoc not onSnapshot for ProfilePage: read-only profile display does not warrant real-time subscription cost in Phase 1 (01-03)
- [Phase 02]: subcollection path users/{uid}/sessions replaces top-level /sessions — matches all Phase 2+ write patterns
- [Phase 02]: [Phase 02-01]: privacy hardcoded to public in addSession — Phase 5 will enforce granular privacy in rules
- [Phase 02]: [Phase 02-01]: startTimestamp stored as Timestamp.fromMillis(startMs) not serverTimestamp — anchor-time pattern requires client-captured start
- [Phase 02-timer-and-sessions]: verbatimModuleSyntax requires type-only imports for all type re-exports
- [Phase 02-timer-and-sessions]: durationMs = state.totalElapsed + state.elapsed ensures full Pomodoro multi-phase duration is recorded, not just last phase
- [Phase 02-timer-and-sessions]: Discard is silent with no confirmation dialog — locked decision from plan (02-03)
- [Phase 02-timer-and-sessions]: Native dialog element used for SessionBottomSheet — ESC, backdrop, focus trap for free (02-03)
- [Phase 02-timer-and-sessions]: SubjectCombobox fetches subjects once on mount and filters client-side — personal lists are small (<50) (02-03)
- [Phase 03-01]: date-fns-tz v3 has no startOfDay export — use date-fns startOfDay after toZonedTime for local calendar day boundaries
- [Phase 03-01]: react-calendar-heatmap locked with --legacy-peer-deps for React 19 compat — no substitution per CONTEXT.md
- [Phase 03-01]: Goal fields optional on UserProfile — not set by createOrUpdateUserDoc, use ?? fallback downstream
- [Phase 03-01]: useStreak Firestore writeback non-blocking (.catch noop) — local computed state is source of truth for display

### Pending Todos

None yet.

### Blockers/Concerns

- Phase 5 planning: Cloud Functions Gen 2 fan-out pattern has nuances (cold start, partial batch failure, >500 followers pagination) — flag for research spike during plan-phase 5
- Phase 3 planning: Streak midnight grace period RESOLVED — yesterday grace period implemented in computeStreaks (lastDay === todayLocal || lastDay === yesterdayLocal)

## Session Continuity

Last session: 2026-03-02
Stopped at: Completed 03-01-PLAN.md — Phase 3 data foundation: deps installed, UserProfile extended, getSessions + updateGoals + addSession increment, useSessions + useStats + useStreak hooks built.
Resume file: None
