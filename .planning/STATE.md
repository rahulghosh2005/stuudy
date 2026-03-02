# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-01)

**Core value:** Make studying feel like a sport — personal performance data worth tracking, and a social feed that makes progress visible to the people who matter.
**Current focus:** Phase 1 — Foundation

## Current Position

Phase: 1 of 6 (Foundation)
Plan: 1 of 3 in current phase
Status: In progress
Last activity: 2026-03-02 — Plan 01-01 completed

Progress: [█░░░░░░░░░] 5%

## Performance Metrics

**Velocity:**
- Total plans completed: 1
- Average duration: 2 min
- Total execution time: 0.03 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Foundation | 1 | 2 min | 2 min |

**Recent Trend:**
- Last 5 plans: 01-01 (2 min)
- Trend: —

*Updated after each plan completion*

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

### Pending Todos

None yet.

### Blockers/Concerns

- Phase 5 planning: Cloud Functions Gen 2 fan-out pattern has nuances (cold start, partial batch failure, >500 followers pagination) — flag for research spike during plan-phase 5
- Phase 3 planning: Streak midnight grace period behavior (show yesterday's streak vs. 0 at midnight) needs UX decision before implementation

## Session Continuity

Last session: 2026-03-02
Stopped at: Completed 01-01-PLAN.md — Vite+React+TS scaffolded, Firebase singleton, UserProfile type defined
Resume file: None
