---
phase: 01-foundation
plan: 02
subsystem: auth
tags: [firebase-auth, google-oauth, firestore, react-context, protected-routes]

# Dependency graph
requires:
  - 01-01 (src/firebase/config.ts exporting auth and db, src/types/user.ts UserProfile contract)
provides:
  - src/firebase/auth.ts — signInWithGoogle (popup) and signOut helpers
  - src/firebase/users.ts — createOrUpdateUserDoc idempotent user document writer with timezone capture
  - src/contexts/AuthContext.tsx — AuthProvider and useAuth hook wrapping onAuthStateChanged
  - src/components/ProtectedRoute.tsx — Route guard rendering Outlet or redirecting to /login
  - src/components/GoogleSignInButton.tsx — Button with loading/error state for sign-in
  - src/pages/LoginPage.tsx — Login page rendering GoogleSignInButton
  - src/App.tsx — Full routing: AuthProvider wrapping BrowserRouter with ProtectedRoute for /
affects:
  - 01-03 (profile page uses useAuth and UserProfile data from Firestore)
  - All subsequent phases (every protected route uses ProtectedRoute, every user action needs auth)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - signInWithPopup pattern (not signInWithRedirect — cookie-block safe on Chrome 115+/Safari 16.1+/Firefox 109+)
    - setDoc with merge:true for idempotent Firestore writes (preserves stats/counts on repeat sign-ins)
    - AuthProvider loading guard (blocks render until onAuthStateChanged fires first event — no flash)
    - IANA timezone capture via Intl.DateTimeFormat().resolvedOptions().timeZone (synchronous, no library)
    - ProtectedRoute using React Router Outlet pattern (no per-route wrapper needed)

key-files:
  created:
    - src/firebase/auth.ts
    - src/firebase/users.ts
    - src/contexts/AuthContext.tsx
    - src/components/ProtectedRoute.tsx
    - src/components/GoogleSignInButton.tsx
    - src/pages/LoginPage.tsx
  modified:
    - src/App.tsx

key-decisions:
  - "signInWithPopup over signInWithRedirect: popup is independent of third-party cookies; redirect breaks on Chrome 115+, Safari 16.1+, Firefox 109+"
  - "setDoc with merge:true for idempotent user document writes: preserves totalStudyMinutes/streaks/counts on repeat sign-ins without conditional logic"
  - "AuthProvider loading guard at provider level (not in ProtectedRoute): single point of truth, prevents flash of protected content and flash of /login before session restores"
  - "IANA timezone captured in createOrUpdateUserDoc (sync in sign-in handler, not useEffect): avoids race condition if component unmounts between sign-in and effect"
  - "createdAt field intentionally omitted from profileData in createOrUpdateUserDoc: field is optional in UserProfile, no Phase 1 requirement depends on it"

requirements-completed: [AUTH-01, AUTH-02, AUTH-03, PROF-03]

# Metrics
duration: 5min
completed: 2026-03-02
---

# Phase 1 Plan 02: Firebase Auth Layer Summary

**Google OAuth popup sign-in with idempotent Firestore user document writes using merge:true, IANA timezone capture, and auth state context with loading guard preventing protected content flash**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-02T00:26:17Z
- **Completed:** 2026-03-02T00:31:00Z
- **Tasks:** 2
- **Files modified:** 7 (6 created, 1 updated)

## Accomplishments

- Created `src/firebase/auth.ts` with `signInWithGoogle` (popup) and `signOut` helpers — signInWithPopup explicitly chosen over signInWithRedirect to avoid third-party cookie blocking on Chrome 115+/Safari 16.1+
- Created `src/firebase/users.ts` with `createOrUpdateUserDoc` — uses `setDoc(ref, data, { merge: true })` for idempotent writes: first sign-in creates document with zeroed stats; repeat sign-ins update display fields without touching stats/counts from later phases
- Captured IANA timezone via `Intl.DateTimeFormat().resolvedOptions().timeZone` synchronously in the sign-in handler (not a useEffect) to avoid race conditions
- Created `src/contexts/AuthContext.tsx` with `AuthProvider` and `useAuth` — loading guard blocks rendering until `onAuthStateChanged` fires first event, preventing both flash of protected content and spurious redirect to /login
- Created `src/components/ProtectedRoute.tsx` using React Router `<Outlet />` pattern — `AuthProvider` loading guard means `user` is definitively null or User when this renders
- Created `src/components/GoogleSignInButton.tsx` with loading/error state handling for the popup flow
- Created `src/pages/LoginPage.tsx` — redirects already-authenticated users to /
- Updated `src/App.tsx` — `AuthProvider` wraps `BrowserRouter`; `ProtectedRoute` guards `/`; `/login` is public

## Task Commits

Each task was committed atomically:

1. **Task 1: Firebase auth helpers and user document writer** - `f723534` (feat)
2. **Task 2: AuthContext, ProtectedRoute, LoginPage, and App routing** - `dc6eb42` (feat)

## Files Created/Modified

- `src/firebase/auth.ts` — exports `signInWithGoogle` (popup) and `signOut`
- `src/firebase/users.ts` — exports `createOrUpdateUserDoc`; uses `setDoc` with `{ merge: true }` for idempotent Firestore writes; captures IANA timezone via `Intl.DateTimeFormat`
- `src/contexts/AuthContext.tsx` — exports `AuthProvider` (loading guard) and `useAuth` hook; subscribes to `onAuthStateChanged` with cleanup
- `src/components/ProtectedRoute.tsx` — exports `ProtectedRoute`; returns `<Outlet />` if authenticated, `<Navigate to="/login" replace />` if not
- `src/components/GoogleSignInButton.tsx` — exports `GoogleSignInButton`; manages isLoading/error state for popup sign-in
- `src/pages/LoginPage.tsx` — exports `LoginPage`; redirects to / if already authenticated; renders `GoogleSignInButton`
- `src/App.tsx` — updated to wire `AuthProvider`, `BrowserRouter`, `Routes` with `ProtectedRoute` guarding `/`

## Route Structure

```
/login        → <LoginPage />        (public)
/             → <ProtectedRoute>     (auth required)
                  <HomePage />       (Phase 2 will build this out)
/profile/:uid → (added in plan 01-03)
```

## Decisions Made

- `signInWithPopup` over `signInWithRedirect`: Third-party cookie deprecation in Chrome 115+, Safari 16.1+, and Firefox 109+ breaks redirect flow. Popup has no such dependency.
- `setDoc` with `{ merge: true }` for `createOrUpdateUserDoc`: Idempotent — creates document on first sign-in, updates profile fields on repeat sign-ins without touching stats/counts that later phases own. Never omit `merge: true` in this function.
- Loading guard at `AuthProvider` level: A single loading screen before routing decisions prevents (a) flash of protected content and (b) spurious redirect to /login while Firebase restores the persisted session from IndexedDB. `ProtectedRoute` can safely check `user` without its own loading state.
- Timezone capture in `createOrUpdateUserDoc` (not `useEffect`): Synchronous in the sign-in handler. A `useEffect` would run after the component renders, creating a window where the session exists but timezone is not yet written.
- `createdAt` omitted from `profileData`: Optional in `UserProfile`; no Phase 1 requirement needs it. Adding later phases' requirements would use a Firestore security rule or conditional check.

## Deviations from Plan

None — plan executed exactly as written.

## User Setup Required (from plan 01-01, still applies)

Before running the app, the user must:

1. Create a Firebase project at https://console.firebase.google.com
2. Enable Google sign-in under Authentication > Sign-in method
3. Add the app's domain to authorized OAuth redirect domains
4. Copy `.env.example` to `.env.local` and fill in the 6 `VITE_FIREBASE_*` credentials
5. Run `npm run dev` and navigate to `http://localhost:5173`

Navigation to `http://localhost:5173` should redirect to `/login` (unauthenticated). Clicking "Sign in with Google" should open the OAuth popup.

## Next Phase Readiness

- `useAuth()` hook available: plan 01-03 can use `const { user } = useAuth()` to get the signed-in user
- Protected routes work: plan 01-03's `/profile/:uid` goes inside `<ProtectedRoute />`
- Firestore user document written on first sign-in: plan 01-03 can read `users/{uid}` to render profile

## Self-Check: PASSED

- FOUND: src/firebase/auth.ts
- FOUND: src/firebase/users.ts
- FOUND: src/contexts/AuthContext.tsx
- FOUND: src/components/ProtectedRoute.tsx
- FOUND: src/components/GoogleSignInButton.tsx
- FOUND: src/pages/LoginPage.tsx
- FOUND: src/App.tsx (updated)
- Commit f723534: feat(01-02): add Firebase auth helpers and idempotent user document writer
- Commit dc6eb42: feat(01-02): add AuthContext, ProtectedRoute, LoginPage, and wire App routing

---
*Phase: 01-foundation*
*Completed: 2026-03-02*
