---
phase: 01-foundation
plan: "03"
subsystem: database
tags: [firestore, security-rules, react, profile, firebase]

# Dependency graph
requires:
  - phase: 01-01
    provides: UserProfile 12-field type, Firebase singleton (db, auth)
  - phase: 01-02
    provides: AuthContext with useAuth hook, ProtectedRoute, createOrUpdateUserDoc with followerCount/followingCount/timezone initialized to 0

provides:
  - Firestore security rules deployed — deny-all catch-all, uid-scoped write on /users/{userId}, session ownership on /sessions/{sessionId}
  - ProfilePage reading users/{uid} from Firestore and displaying avatar, displayName, stats, follower/following numeric counts
  - /profile and /profile/:uid routes inside ProtectedRoute
  - firebase.json and firestore.indexes.json for Firebase CLI

affects: [phase-2-sessions, phase-4-social, phase-5-feed]

# Tech tracking
tech-stack:
  added: [firebase-tools (CLI — npx), firebase.json config]
  patterns: [Firestore deny-all security rules scaffold, uid-equality write guard, ownership-field write guard for sub-collections]

key-files:
  created:
    - firestore.rules
    - firebase.json
    - firestore.indexes.json
    - src/pages/ProfilePage.tsx
  modified:
    - src/App.tsx

key-decisions:
  - "deny-all catch-all as default: match /{document=**} { allow read, write: if false } ensures future collections are locked until explicitly opened"
  - "sessions scaffold in rules Phase 1: write rules (ownership check) added now so Phase 2 sessions writes work immediately without hitting permission errors"
  - "PROF-02 partial delivery: followerCount/followingCount rendered as numeric labels only; browsable follower/following lists formally deferred to SOCL-03 (Phase 4)"
  - "getDoc (one-shot fetch) not onSnapshot for ProfilePage: Phase 1 profile is read-only display, real-time subscription adds cost with no benefit at this stage"

patterns-established:
  - "Firestore security model: explicit collection match blocks, deny-all default — never trust implicit Firestore open state"
  - "uid-equality write guard: request.auth.uid == userId prevents cross-user writes at the rules layer, not application layer"
  - "ProfilePage pattern: useParams uid with fallback to auth.user.uid — same component handles own-profile (/profile) and other-profile (/profile/:uid) views"

requirements-completed: [PROF-01, PROF-02, PROF-03, PRIV-03, PRIV-04]

# Metrics
duration: 6min
completed: 2026-03-01
---

# Phase 1 Plan 03: Firestore Security Rules and ProfilePage Summary

**Firestore deny-all rules deployed with uid-scoped write guards, plus ProfilePage rendering Google avatar, display name, zeroed stats, and follower/following counts — full Phase 1 auth and profile flow verified by human**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-01T17:28:00Z
- **Completed:** 2026-03-02T04:25:29Z
- **Tasks:** 2 (1 auto, 1 human-verify checkpoint)
- **Files modified:** 5

## Accomplishments

- Firestore security rules deployed with deny-all default catch-all and uid-equality write rule on /users/{userId} — satisfies PRIV-04
- Sessions collection scaffold in rules with ownership-based write guard — satisfies PRIV-03, unblocks Phase 2 without structural rule changes
- ProfilePage fetches users/{uid} from Firestore and renders Google avatar, displayName, totalStudyMinutes (as hours), currentStreak, longestStreak, followerCount, followingCount — satisfies PROF-01, PROF-03, and partial PROF-02
- /profile and /profile/:uid routes added inside ProtectedRoute in App.tsx
- Human verification passed all 5 steps: sign-in flow, session persistence, profile page content, Firestore document fields, and security rules

## Task Commits

Each task was committed atomically:

1. **Task 1: Firestore security rules and ProfilePage** - `b836038` (feat)
2. **Task 2: Verify complete Phase 1 auth and profile flow** - Human-verify checkpoint — user approved; no code commit (verification-only task)

## Files Created/Modified

- `firestore.rules` - Deny-all catch-all, authenticated read on /users/{userId}, uid-equality write on /users/{userId}, ownership-field write on /sessions/{sessionId}
- `firebase.json` - Firebase CLI config pointing to firestore.rules and firestore.indexes.json
- `firestore.indexes.json` - Empty indexes scaffold (required by firebase.json)
- `src/pages/ProfilePage.tsx` - Reads users/{uid} via getDoc, renders avatar, displayName, email, stat cards (hours/streak/longestStreak), followerCount, followingCount
- `src/App.tsx` - Added /profile and /profile/:uid routes inside existing ProtectedRoute block

## Decisions Made

- **deny-all catch-all first:** Explicit `match /{document=**} { allow read, write: if false }` ensures any collection added in future phases is denied until a matching rule is added — prevents accidental data exposure.
- **Sessions scaffold in Phase 1 rules:** Phase 2 writes sessions; including the ownership rule now means Phase 2 can proceed without requiring a rules deployment step.
- **PROF-02 partial delivery accepted:** followerCount and followingCount are initialized to 0 (plan 01-02) and rendered as numeric labels (this plan). Browsable lists require a follow graph which is Phase 4 scope (SOCL-03). This is captured in plan frontmatter and STATE.md.
- **getDoc not onSnapshot:** Profile page is a read-only stats display in Phase 1. Real-time subscription adds Firebase quota cost with no user benefit at this stage; Phase 4 may revisit.

## Deviations from Plan

None — plan executed exactly as written. Task 1 code was committed in a previous session. Task 2 human verification was approved by the user with all 5 steps passing.

## Issues Encountered

None. Firebase CLI rules deployment was handled prior to human verification. User approved all verification steps without reporting any issues.

## User Setup Required

**External services require manual configuration.** The following was required for Phase 1:

- Create `.env.local` from `.env.example` with Firebase project credentials (VITE_FIREBASE_API_KEY, etc.)
- Authenticate Firebase CLI: `npx firebase login --no-localhost`
- Select Firebase project: `npx firebase use --add`
- Deploy Firestore rules: `npx firebase deploy --only firestore:rules`

## Next Phase Readiness

Phase 1 foundation is complete. Ready for Phase 2 (Study Sessions):
- Firebase Auth fully operational (Google sign-in, persistence, user document with all 12 UserProfile fields)
- Firestore security rules deployed — sessions collection write rules already in place so Phase 2 can write immediately
- ProfilePage scaffold ready to display study stats once Phase 2 populates totalStudyMinutes, currentStreak, longestStreak

Concerns to carry forward:
- Phase 3: Streak midnight grace period behavior (show yesterday's streak vs. 0 at midnight) needs UX decision before implementation
- Phase 5: Cloud Functions Gen 2 fan-out nuances (cold start, partial batch failure, >500 followers pagination) need a research spike

## Self-Check: PASSED

- FOUND: `.planning/phases/01-foundation/01-03-SUMMARY.md`
- FOUND: `firestore.rules`
- FOUND: `src/pages/ProfilePage.tsx`
- FOUND: `firebase.json`
- FOUND: `firestore.indexes.json`
- FOUND: commit b836038 (feat(01-03): Firestore security rules, ProfilePage, and profile routes)

---
*Phase: 01-foundation*
*Completed: 2026-03-01*
