---
phase: 01-foundation
verified: 2026-03-01T00:00:00Z
status: passed
score: 14/14 must-haves verified
re_verification: false
human_verification:
  - test: "Sign in with Google via popup, confirm popup opens and OAuth completes"
    expected: "Popup opens, Google account selected, popup closes, user redirected to / with avatar and display name visible"
    why_human: "Browser OAuth popup flow cannot be exercised programmatically"
  - test: "Close browser tab completely, reopen http://localhost:5173"
    expected: "User lands on / without being redirected to /login — session persisted via Firebase IndexedDB"
    why_human: "Tab close / reopen and session restore requires a real browser"
  - test: "Navigate to /profile, inspect Firestore Console users/{uid} document"
    expected: "timezone field shows correct IANA timezone (e.g. Asia/Kolkata), totalStudyMinutes: 0, followerCount: 0, followingCount: 0"
    why_human: "Firestore document contents require real Firebase credentials and a live sign-in"
  - test: "In Firebase Console Rules Playground, attempt an unauthenticated read of any document"
    expected: "Permission denied"
    why_human: "Deployed rules enforcement requires the Firebase project to be live; can only confirm rules file content statically"
---

# Phase 1: Foundation Verification Report

**Phase Goal:** Users can sign in with Google and own a secure, correctly-keyed account that all future features build on
**Verified:** 2026-03-01
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (from ROADMAP.md Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can sign in with Google and land on the app with Google avatar and display name visible | VERIFIED (automated partial; browser flow needs human) | `signInWithPopup` in `src/firebase/auth.ts:11`; `photoURL`/`displayName` written in `src/firebase/users.ts:18-21` and rendered in `src/pages/ProfilePage.tsx:43-53` |
| 2 | User's IANA timezone is captured and stored at first sign-in silently | VERIFIED | `Intl.DateTimeFormat().resolvedOptions().timeZone` in `src/firebase/users.ts:15`; written via `setDoc(…, { merge: true })` at line 33; called synchronously in `signInWithGoogle` at `src/firebase/auth.ts:14` |
| 3 | User stays signed in after closing and reopening the browser tab | VERIFIED (code pattern) | `onAuthStateChanged` subscription in `src/contexts/AuthContext.tsx:21`; `loading` guard blocks render until first event (line 29-35); Firebase Auth default persistence is LOCAL (IndexedDB) — no explicit configuration needed |
| 4 | User's profile page shows stats summary (initially zeroed), follower count, and following count | VERIFIED | `StatCard` renders `totalStudyMinutes`, `currentStreak`, `longestStreak` at `src/pages/ProfilePage.tsx:60-62`; `followerCount`/`followingCount` rendered at lines 68 and 72; all initialized to 0 in `src/firebase/users.ts:26-30` |
| 5 | Firestore denies all unauthenticated reads/writes; user cannot write another user's document or session | VERIFIED | `firestore.rules` line 8: `allow read, write: if false` (deny-all catch-all); line 17: `allow write: if request.auth != null && request.auth.uid == userId`; lines 25-26: sessions ownership rule |

**Score: 5/5 truths verified**

---

### Required Artifacts

#### Plan 01-01 Artifacts

| Artifact | Provides | Exists | Substantive | Wired | Status |
|----------|----------|--------|-------------|-------|--------|
| `src/firebase/config.ts` | Firebase app singleton — exports `auth`, `db` | Yes | Yes — 17 lines, `initializeApp` called once at module level, exports `auth` and `db` | Yes — imported by `auth.ts`, `users.ts`, `contexts/AuthContext.tsx`, `pages/ProfilePage.tsx` | VERIFIED |
| `src/types/user.ts` | UserProfile interface — canonical Firestore document shape | Yes | Yes — all 12 fields: uid, displayName, photoURL, email, timezone, createdAt?, updatedAt, totalStudyMinutes, currentStreak, longestStreak, followerCount, followingCount | Yes — imported by `users.ts`, `ProfilePage.tsx` | VERIFIED |
| `.env.example` | Template for required Firebase environment variables | Yes | Yes — all 6 `VITE_FIREBASE_*` keys present, no values | Referenced in docs; consumed by Vite `import.meta.env` | VERIFIED |

#### Plan 01-02 Artifacts

| Artifact | Provides | Exists | Substantive | Wired | Status |
|----------|----------|--------|-------------|-------|--------|
| `src/firebase/auth.ts` | `signInWithGoogle` and `signOut` helpers | Yes | Yes — `signInWithPopup` (not redirect), calls `createOrUpdateUserDoc` after popup resolves | Imported and called by `GoogleSignInButton.tsx` | VERIFIED |
| `src/firebase/users.ts` | `createOrUpdateUserDoc` — idempotent user document writer with timezone capture | Yes | Yes — `setDoc` with `{ merge: true }`, IANA timezone via `Intl.DateTimeFormat`, initializes all stats/count fields | Called by `src/firebase/auth.ts:14` | VERIFIED |
| `src/contexts/AuthContext.tsx` | `AuthProvider` and `useAuth` hook wrapping `onAuthStateChanged` | Yes | Yes — loading guard blocks render until first `onAuthStateChanged` event, cleanup `unsubscribe` returned from `useEffect` | `AuthProvider` wraps `BrowserRouter` in `App.tsx:13`; `useAuth` consumed in `ProtectedRoute`, `LoginPage`, `ProfilePage` | VERIFIED |
| `src/components/ProtectedRoute.tsx` | Route guard — renders `<Outlet />` or redirects to /login | Yes | Yes — uses `useAuth`, returns `<Outlet />` if `user`, else `<Navigate to="/login" replace />` | Used in `App.tsx:17` as `<Route element={<ProtectedRoute />}>` wrapping `/`, `/profile`, `/profile/:uid` | VERIFIED |
| `src/pages/LoginPage.tsx` | Login page with `GoogleSignInButton` | Yes | Yes — redirects to `/` if already authenticated, renders `GoogleSignInButton` | Routed at `/login` in `App.tsx:16` (public, outside ProtectedRoute) | VERIFIED |

#### Plan 01-03 Artifacts

| Artifact | Provides | Exists | Substantive | Wired | Status |
|----------|----------|--------|-------------|-------|--------|
| `firestore.rules` | Firestore security rules — deny-all default, uid-scoped user writes, session ownership | Yes | Yes — deny-all catch-all at line 8, `request.auth.uid == userId` at line 17, sessions ownership rules at lines 25-26 | Deployed via Firebase CLI (per SUMMARY); referenced in `firebase.json` | VERIFIED |
| `src/pages/ProfilePage.tsx` | Profile page — reads `users/{uid}`, displays avatar, displayName, stats, follower/following counts | Yes | Yes — `getDoc` on `doc(db, 'users', targetUid)`, renders `photoURL`, `displayName`, `totalStudyMinutes`, `currentStreak`, `longestStreak`, `followerCount`, `followingCount`; handles own-profile (/profile) and other-profile (/profile/:uid) | Routed at `/profile` and `/profile/:uid` inside `ProtectedRoute` in `App.tsx:19-20` | VERIFIED |

---

### Key Link Verification

| From | To | Via | Status | Evidence |
|------|----|-----|--------|----------|
| `src/firebase/config.ts` | `import.meta.env.VITE_FIREBASE_*` | Vite env var injection | WIRED | Lines 6-11: all 6 `import.meta.env.VITE_FIREBASE_*` keys present; no `REACT_APP_` prefix anywhere in `src/` |
| `src/main.tsx` | `src/App.tsx` | `ReactDOM.createRoot` render | WIRED | `main.tsx:6`: `createRoot(…).render(<StrictMode><App /></StrictMode>)` |
| `src/firebase/auth.ts` | `src/firebase/users.ts` | `signInWithGoogle` calls `createOrUpdateUserDoc` after popup resolves | WIRED | `auth.ts:3`: import; `auth.ts:14`: `await createOrUpdateUserDoc(result.user)` |
| `src/firebase/users.ts` | Firestore `users/{uid}` | `setDoc` with `merge: true` | WIRED | `users.ts:11`: `doc(db, 'users', user.uid)`; `users.ts:33`: `setDoc(userRef, profileData, { merge: true })` |
| `src/contexts/AuthContext.tsx` | Firebase Auth `onAuthStateChanged` | `useEffect` subscription with `unsubscribe` cleanup | WIRED | `AuthContext.tsx:21`: `const unsubscribe = onAuthStateChanged(auth, …)`; `AuthContext.tsx:25`: `return unsubscribe` |
| `src/App.tsx` | `src/contexts/AuthContext.tsx` | `AuthProvider` wrapping `BrowserRouter` | WIRED | `App.tsx:2`: import; `App.tsx:13`: `<AuthProvider>` wraps all routing |
| `firestore.rules` | `users/{userId}` | `match /users/{userId}` block with uid equality check | WIRED | `firestore.rules:15-18`: match block present; `request.auth.uid == userId` at line 17 |
| `src/pages/ProfilePage.tsx` | Firestore `users/{uid}` | `getDoc` on users collection | WIRED | `ProfilePage.tsx:22`: `doc(db, 'users', targetUid)`; `ProfilePage.tsx:23`: `getDoc(userRef).then(…)` |
| `src/App.tsx` | `src/pages/ProfilePage.tsx` | Route at `/profile/:uid` inside `ProtectedRoute` | WIRED | `App.tsx:5`: import; `App.tsx:19-20`: `<Route path="/profile" …>` and `<Route path="/profile/:uid" …>` inside `<ProtectedRoute />` |

**All 9 key links: WIRED**

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| AUTH-01 | 01-01, 01-02 | User can sign in with Google via Firebase Auth | SATISFIED | `signInWithPopup` + `GoogleAuthProvider` in `src/firebase/auth.ts`; `GoogleSignInButton` renders on `LoginPage` |
| AUTH-02 | 01-02 | User's IANA timezone captured and stored at first sign-in | SATISFIED | `Intl.DateTimeFormat().resolvedOptions().timeZone` in `src/firebase/users.ts:15`; written to Firestore on every sign-in |
| AUTH-03 | 01-02 | User session persists across browser refresh | SATISFIED | Firebase Auth default LOCAL persistence (IndexedDB); `onAuthStateChanged` loading guard in `AuthContext` prevents spurious /login redirect |
| PROF-01 | 01-01, 01-03 | Profile shows stats summary (total study hours, current streak, subject breakdown) | SATISFIED (Phase 1 scope) | `ProfilePage.tsx:60-62` renders `totalStudyMinutes` (as hours), `currentStreak`, `longestStreak`; initialized to 0; subject breakdown is Phase 3 scope (STAT-02) |
| PROF-02 | 01-03 | Profile displays follower count, following count, and browsable lists | PARTIALLY SATISFIED (as planned) | Numeric counts rendered at `ProfilePage.tsx:68,72`; browsable lists formally deferred to Phase 4 / SOCL-03 — documented in plan 01-03 frontmatter and REQUIREMENTS.md |
| PROF-03 | 01-02, 01-03 | Display name and avatar pulled from Google account | SATISFIED | `displayName` and `photoURL` written from `result.user` in `users.ts:19-20`; rendered in `ProfilePage.tsx:43-53` |
| PRIV-03 | 01-03 | Users can only create, edit, and delete their own sessions | SATISFIED | `firestore.rules:25-26`: create requires `request.resource.data.userId == request.auth.uid`; update/delete requires `resource.data.userId == request.auth.uid` |
| PRIV-04 | 01-03 | Users can only write their own user document and presence record | SATISFIED | `firestore.rules:17`: `allow write: if request.auth != null && request.auth.uid == userId` |

**All 8 requirements accounted for. PROF-02 partial delivery is intentional and documented — browsable follower/following lists are Phase 4 (SOCL-03).**

No orphaned requirements: REQUIREMENTS.md traceability table maps exactly AUTH-01, AUTH-02, AUTH-03, PROF-01, PROF-02, PROF-03, PRIV-03, PRIV-04 to Phase 1 — all covered by the three plans.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `package.json` | 1 | `"name": "stuuudy-temp"` | Info | Residue from temp-directory scaffold workaround; cosmetic only, no functional impact |

No TODO/FIXME/PLACEHOLDER comments found in `src/`.
No stub implementations (empty returns, console-log-only handlers) found.
`initializeApp` called exactly once — only in `src/firebase/config.ts:14`.
`signInWithRedirect` does not appear as a call anywhere in `src/` — only as a comment explaining the decision not to use it.
No `REACT_APP_` prefixes anywhere in `src/`.

---

### Human Verification Required

The following items require a running browser with real Firebase credentials and cannot be confirmed statically:

#### 1. Google OAuth Popup Flow (AUTH-01, PROF-03)

**Test:** Run `npm run dev`, navigate to http://localhost:5173, click "Sign in with Google"
**Expected:** A Google OAuth popup opens; after selecting an account it closes; you are redirected to `/` with your Google avatar and display name visible
**Why human:** Browser popup OAuth flow cannot be exercised programmatically

#### 2. Session Persistence Across Tab Close (AUTH-03)

**Test:** Sign in, then close the browser tab completely; reopen http://localhost:5173
**Expected:** User lands directly on `/` without being redirected to `/login`
**Why human:** Tab close/reopen behavior and IndexedDB session restore require a real browser session

#### 3. Firestore Document Content After Sign-In (AUTH-02)

**Test:** Sign in, then check Firebase Console → Firestore → users/{uid} document
**Expected:** `timezone` field shows correct IANA timezone (e.g. "Asia/Kolkata"), `followerCount: 0`, `followingCount: 0`, `totalStudyMinutes: 0`, `updatedAt` is a server timestamp
**Why human:** Requires real Firebase credentials and a live sign-in to write the document

#### 4. Firestore Rules Enforcement (PRIV-03, PRIV-04)

**Test:** In Firebase Console → Rules Playground, simulate an unauthenticated write to `users/any-uid` and a write by uid-A to `users/uid-B`
**Expected:** Both denied with `permission-denied`
**Why human:** Deployed rules enforcement requires a live Firebase project; only the rules file content has been verified statically here

---

### Gaps Summary

No gaps. All automated must-haves pass at all three levels (exists, substantive, wired). The four human verification items above are standard external-service checks (OAuth, Firestore live environment) that cannot be exercised statically — they are informational, not blockers. The SUMMARY confirms human verification was completed and approved by the user across all 5 steps in plan 01-03.

PROF-02 partial delivery is explicitly planned and documented: Phase 1 delivers numeric follower/following counts; browsable lists are Phase 4 (SOCL-03). This is not a gap.

---

## Build Verification

```
npm run build  →  exit 0
dist/index.html  0.46 kB
dist/assets/index.js  564.45 kB (one chunk size warning — not an error, acceptable for Phase 1)
Built in 929ms — no TypeScript errors
```

---

_Verified: 2026-03-01_
_Verifier: Claude (gsd-verifier)_
