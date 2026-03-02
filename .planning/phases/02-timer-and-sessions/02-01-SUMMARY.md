---
phase: 02-timer-and-sessions
plan: "01"
subsystem: firebase-data-layer
tags: [firestore, security-rules, typescript, sessions, subjects]
dependency_graph:
  requires: [01-03 (firestore.rules base scaffold)]
  provides: [firestore rules for sessions+subjects subcollections, SessionDocument type, addSession, getSubjects, addSubject]
  affects: [02-02 (timer component), 02-03 (save session modal)]
tech_stack:
  added: []
  patterns: [subcollection path pattern for user-scoped data, serverTimestamp for audit fields, Timestamp.fromMillis for client-captured start time]
key_files:
  created:
    - src/types/session.ts
    - src/firebase/sessions.ts
    - src/firebase/subjects.ts
  modified:
    - firestore.rules
decisions:
  - "subcollection path users/{uid}/sessions instead of top-level /sessions — matches all Phase 2+ write patterns"
  - "privacy hardcoded to 'public' in addSession for Phase 2 — Phase 5 will add granular enforcement"
  - "startTimestamp stored as Timestamp.fromMillis(startMs) not serverTimestamp — anchor-time pattern requires client-captured start time"
  - "endTimestamp and createdAt use serverTimestamp() — authoritative server time for ordering and audit"
metrics:
  duration: 6 min
  completed_date: "2026-03-02"
  tasks_completed: 2
  files_changed: 4
---

# Phase 02 Plan 01: Fix Firestore Rules + Data Layer Summary

**One-liner:** Subcollection security rules deployed for sessions/subjects plus SessionDocument type and addSession/getSubjects/addSubject Firebase helpers.

## What Was Built

Fixed the critical path mismatch in firestore.rules (top-level `/sessions` replaced with `/users/{uid}/sessions` subcollection), added subjects subcollection rules, and created the full type + data-access layer that Plans 02 and 03 depend on.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Fix Firestore security rules — subcollection paths | b44b730 | firestore.rules |
| 2 | Define types and Firebase helpers | bc02797 | src/types/session.ts, src/firebase/sessions.ts, src/firebase/subjects.ts |

## Decisions Made

1. **Subcollection path for sessions** — `users/{uid}/sessions/{sessionId}` matches all Phase 2+ write patterns; top-level `/sessions` path was never written to and is removed.
2. **Privacy hardcoded to 'public'** — Phase 2 always writes `privacy: 'public'`; Phase 5 will enforce field-level privacy in rules.
3. **startTimestamp as Timestamp.fromMillis** — anchor-time pattern requires the client-captured start time; endTimestamp uses serverTimestamp() for authoritative end time.
4. **addSession takes startMs (number), not Timestamp** — caller passes `Date.now()` captured at Start button tap; conversion to Timestamp happens inside addSession.

## Deviations from Plan

### Auth Gate: Firebase CLI not authenticated

- **Found during:** Task 1 deploy step
- **Issue:** `npx firebase deploy --only firestore:rules` failed — no active Firebase project set (no `.firebaserc`, `firebase login` not run)
- **Action taken:** Rules file written correctly; deploy deferred as manual step
- **Manual step required:** Run `firebase login` then `firebase use <project-id>` then `npx firebase deploy --only firestore:rules`
- **Impact:** Rules are correct on disk but not live in Firestore until deployed

## Verification Results

- `grep -n "sessions\|subjects" firestore.rules` confirms subcollection match blocks present
- Top-level `/sessions/{sessionId}` rule removed
- `npx tsc --noEmit` exits 0 — no TypeScript errors
- SessionDocument interface has all 9 required fields: userId, subject, subjectId, durationMs, startTimestamp, endTimestamp, notes, privacy, createdAt

## Self-Check: PASSED

Files verified present:
- firestore.rules — FOUND (modified)
- src/types/session.ts — FOUND (created)
- src/firebase/sessions.ts — FOUND (created)
- src/firebase/subjects.ts — FOUND (created)

Commits verified:
- b44b730 — FOUND
- bc02797 — FOUND
