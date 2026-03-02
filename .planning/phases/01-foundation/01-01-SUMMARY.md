---
phase: 01-foundation
plan: 01
subsystem: infra
tags: [vite, react, typescript, firebase, firestore, auth]

# Dependency graph
requires: []
provides:
  - Vite 7 + React 19 + TypeScript project scaffolded with strict mode
  - Firebase SDK v12.x installed (firebase, react-router-dom, firebase-tools)
  - src/firebase/config.ts — Firebase app singleton exporting auth and db
  - src/types/user.ts — canonical UserProfile interface for all 6 phases
  - .env.example — template with all 6 VITE_FIREBASE_* keys
  - .gitignore — excludes .env.local and node_modules
affects:
  - 01-02 (imports auth, db from src/firebase/config.ts)
  - 01-03 (imports UserProfile from src/types/user.ts)
  - All subsequent phases (depend on UserProfile contract and Firebase singleton)

# Tech tracking
tech-stack:
  added:
    - vite@7.3.1 (bundler)
    - react@19 + react-dom@19
    - typescript (strict mode via tsconfig.app.json)
    - firebase@^12.10.0 (SDK)
    - react-router-dom (routing)
    - firebase-tools (dev — CLI)
  patterns:
    - Module-level Firebase singleton (initializeApp called once at module level in config.ts)
    - VITE_FIREBASE_* env var naming (import.meta.env, never process.env or REACT_APP_)
    - Minimal App.tsx placeholder — no Vite default boilerplate

key-files:
  created:
    - src/firebase/config.ts
    - src/types/user.ts
    - .env.example
    - .gitignore
    - package.json
    - vite.config.ts
    - tsconfig.app.json
    - index.html
    - src/main.tsx
    - src/App.tsx
  modified: []

key-decisions:
  - "Firebase singleton at module level in src/firebase/config.ts — initializeApp never called in components or hooks"
  - "VITE_FIREBASE_* env var prefix for Vite compatibility (import.meta.env) — no REACT_APP_ or bare env vars"
  - "UserProfile includes all 12 fields upfront (including followerCount, followingCount, streak fields) to prevent cascading schema changes across 6 phases"

patterns-established:
  - "Firebase singleton pattern: import { auth, db } from 'src/firebase/config.ts'"
  - "Env vars: always VITE_FIREBASE_* prefix, accessed via import.meta.env.VITE_FIREBASE_*"
  - "UserProfile is the canonical Firestore document shape — never remove fields, only add"

requirements-completed: [AUTH-01, AUTH-03, PROF-01, PROF-03]

# Metrics
duration: 2min
completed: 2026-03-02
---

# Phase 1 Plan 01: Foundation Scaffold Summary

**Vite 7 + React 19 + TypeScript project with Firebase SDK v12, module-level auth/db singleton, and 12-field UserProfile Firestore contract covering all 6 phases**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-02T00:20:40Z
- **Completed:** 2026-03-02T00:22:54Z
- **Tasks:** 2
- **Files modified:** 10 created

## Accomplishments

- Scaffolded Vite 7 + React 19 + TypeScript project with `strict: true` in tsconfig — clean build confirmed
- Installed firebase@^12.10.0, react-router-dom, firebase-tools; all 6 VITE_FIREBASE_* keys in .env.example
- Created Firebase module-level singleton in src/firebase/config.ts exporting `auth` (getAuth) and `db` (getFirestore) — initializeApp called exactly once
- Defined canonical UserProfile interface in src/types/user.ts with all 12 fields covering Phase 1-6 data requirements (uid, displayName, photoURL, email, timezone, createdAt, updatedAt, totalStudyMinutes, currentStreak, longestStreak, followerCount, followingCount)

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold Vite React TypeScript project and install dependencies** - `ecfccd5` (chore)
2. **Task 2: Create Firebase singleton and UserProfile type** - `11f59af` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `src/firebase/config.ts` — Firebase app singleton; exports `auth` (Firebase Auth) and `db` (Firestore); initializeApp called once at module level
- `src/types/user.ts` — UserProfile interface, canonical Firestore document shape for users/{uid}, covers all 6-phase data fields
- `src/App.tsx` — Minimal placeholder (replaced Vite default boilerplate)
- `src/main.tsx` — ReactDOM.createRoot renders App (scaffolded)
- `.env.example` — Template with all 6 VITE_FIREBASE_* keys (no values)
- `.gitignore` — Excludes node_modules, dist, .env.local (explicit + *.local wildcard)
- `package.json` — Dependencies: firebase@^12.10.0, react-router-dom; devDeps: firebase-tools
- `vite.config.ts` — Vite 7 React plugin config
- `tsconfig.app.json` — strict: true, target ES2022, react-jsx
- `index.html` — Vite HTML entry point

## Decisions Made

- Module-level Firebase singleton pattern: `initializeApp` is called exactly once at module level in `src/firebase/config.ts`. No component or hook calls it. Future plans import `auth` and `db` from this file only.
- VITE_FIREBASE_* env var naming enforced: all environment variables use the VITE_ prefix for Vite's import.meta.env injection. No REACT_APP_ prefixes anywhere.
- UserProfile defines all 12 fields upfront (including Phase 3 stats and Phase 4 social counts at 0) to establish the Firestore document contract before any writes occur. This prevents cascading type errors if fields were added later.

## Deviations from Plan

None — plan executed exactly as written.

**Note:** `npm create vite@latest . -- --template react-ts` was cancelled interactively because the directory was not empty (contained `.git` and `.planning`). Resolved by scaffolding into `/tmp/stuuudy-temp` and copying files — same result, no functional deviation.

## Issues Encountered

- Vite scaffold interactive cancellation in non-empty directory: Scaffolded to `/tmp/stuuudy-temp` then copied files. This is an environment constraint, not a plan deviation. All scaffolded files are identical to what `create-vite` would have produced in an empty directory.

## User Setup Required

**External services require manual configuration before running the app.** The user must:

1. Create a Firebase project at https://console.firebase.google.com
2. Enable Google sign-in under Authentication > Sign-in method
3. Copy `.env.example` to `.env.local` and fill in the 6 Firebase project credentials
4. Run `npm run dev` to verify the app loads

No automated verification is possible without real Firebase credentials.

## Next Phase Readiness

- Firebase singleton ready: plan 01-02 can `import { auth, db } from '../firebase/config'`
- UserProfile type ready: plan 01-02 can `import type { UserProfile } from '../types/user'`
- Build is clean with no TypeScript errors — strong foundation for auth layer
- No blockers for plan 01-02

## Self-Check: PASSED

- FOUND: src/firebase/config.ts
- FOUND: src/types/user.ts
- FOUND: .env.example
- FOUND: .gitignore
- FOUND: src/App.tsx
- FOUND: .planning/phases/01-foundation/01-01-SUMMARY.md
- Commit ecfccd5: chore(01-01): scaffold Vite React TypeScript project with Firebase SDK
- Commit 11f59af: feat(01-01): add Firebase singleton and canonical UserProfile type

---
*Phase: 01-foundation*
*Completed: 2026-03-02*
