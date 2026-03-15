# Phase 1: Foundation - Research

**Researched:** 2026-03-01
**Domain:** Firebase Auth (Google), Firestore, React TypeScript, Security Rules
**Confidence:** HIGH

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-01 | User can sign in with Google via Firebase Auth | signInWithPopup + GoogleAuthProvider pattern; onAuthStateChanged listener |
| AUTH-02 | User's IANA timezone is captured and stored at first sign-in | Intl.DateTimeFormat().resolvedOptions().timeZone; setDoc with merge on first sign-in |
| AUTH-03 | User session persists across browser refresh | Firebase Auth default LOCAL persistence; onAuthStateChanged re-hydrates from IndexedDB |
| PROF-01 | User profile displays stats summary (total hours, streak, subject breakdown) | users/{uid} document with zeroed stats fields; data model section |
| PROF-02 | User profile displays follower/following counts and browsable lists | followerCount/followingCount fields on user doc; subcollections for Phase 4 |
| PROF-03 | User display name and avatar pulled from Google account | user.displayName and user.photoURL from Firebase Auth UserCredential |
| PRIV-03 | Users can only create, edit, and delete their own sessions | Security rules: request.auth.uid == userId pattern |
| PRIV-04 | Users can only write their own user document and presence record | Security rules: request.auth.uid == userId on /users/{userId} |
</phase_requirements>

---

## Summary

This phase establishes the identity and data foundation for the entire app. The core challenge is wiring Firebase Auth (Google-only) into a React TypeScript app in a way that (a) correctly persists the session, (b) silently captures the user's IANA timezone on first sign-in, and (c) creates a well-structured `users/{uid}` Firestore document that later phases can extend without migration.

The second challenge is writing Firestore security rules that are correct from the start. Rules are notoriously easy to get wrong — missing a wildcard, writing a rule that blocks a future feature, or inadvertently leaving a collection open. The Firebase Local Emulator Suite allows rules to be tested before deployment and is the standard approach.

Firebase JS SDK is now at v12.10.0 (February 27, 2026), which uses ES2020 and requires Node 20+. The modular API (`firebase/auth`, `firebase/firestore`) has been stable since v9 and is the only supported import style. The critical pitfall for this phase is `signInWithRedirect` — it breaks on Chrome 115+, Safari 16.1+, and Firefox 109+ due to third-party cookie blocking. Use `signInWithPopup` for this web-first app.

**Primary recommendation:** Use `signInWithPopup` + React Context auth provider with loading guard; create `users/{uid}` document with `setDoc({merge: true})` on every sign-in (idempotent); write Firestore rules with deny-all default and uid-scoped access; capture timezone via `Intl.DateTimeFormat().resolvedOptions().timeZone` in the sign-in handler.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| firebase | 12.10.0 | Auth + Firestore SDK | Official Firebase JS SDK; modular API enables tree-shaking |
| react | 19.x | UI framework | Project constraint (React web-first) |
| react-router-dom | 7.x | Client-side routing + protected routes | Current major version; supports Outlet-based protected routes |
| typescript | 5.x | Type safety | Project constraint; Firebase v12 ships full type definitions |
| vite | 6.x | Build tool | Standard for React+TS projects 2025-2026; works natively with ES modules |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| firebase-tools (CLI) | latest | Firebase Emulator Suite, deploy rules | Local development and rules testing |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| signInWithPopup | signInWithRedirect | Redirect breaks on Chrome 115+, Safari 16.1+, Firefox 109+ — avoid for web |
| Firestore users/{uid} doc | Firebase Auth custom claims | Custom claims are for roles/permissions, not profile data; 1000 byte limit |
| React Context for auth state | Zustand/Redux | Context is sufficient for single auth state; avoid extra dependency for v1 |

**Installation:**
```bash
npm install firebase react-router-dom
npm install -D firebase-tools
```

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── firebase/
│   ├── config.ts        # initializeApp, getAuth, getFirestore exports
│   ├── auth.ts          # signInWithGoogle, signOut helpers
│   └── users.ts         # createOrUpdateUserDoc, getUserDoc
├── contexts/
│   └── AuthContext.tsx  # AuthProvider, useAuth hook
├── components/
│   ├── ProtectedRoute.tsx  # Wraps auth-required pages
│   └── GoogleSignInButton.tsx
├── pages/
│   ├── LoginPage.tsx
│   └── ProfilePage.tsx
└── types/
    └── user.ts          # UserProfile interface matching Firestore schema
firestore.rules            # Firestore security rules (project root)
```

### Pattern 1: Firebase Initialization (Singleton)
**What:** Initialize Firebase once and export service instances. Never call `initializeApp` more than once.
**When to use:** Always — single entry point for all Firebase services.
**Example:**
```typescript
// src/firebase/config.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
```

### Pattern 2: React Auth Context with Loading Guard
**What:** Wrap the app in an `AuthProvider` that subscribes to `onAuthStateChanged`. Render a loading spinner until Firebase has resolved the initial auth state (prevents redirect flicker).
**When to use:** Always — this is the standard pattern for Firebase + React.
**Example:**
```typescript
// src/contexts/AuthContext.tsx
import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../firebase/config';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({ user: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // onAuthStateChanged returns an unsubscribe function — clean up on unmount
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) return <div>Loading...</div>; // Replace with app spinner

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

### Pattern 3: Google Sign-In with signInWithPopup
**What:** Use `signInWithPopup` (not `signInWithRedirect`) for Google OAuth flow. Handle the result in the same function — no getRedirectResult needed.
**When to use:** On any sign-in trigger (button click).
**Example:**
```typescript
// src/firebase/auth.ts
import { signInWithPopup, GoogleAuthProvider, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from './config';
import { createOrUpdateUserDoc } from './users';

const googleProvider = new GoogleAuthProvider();

export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  // result.user is available immediately — no redirect result needed
  await createOrUpdateUserDoc(result.user);
  return result.user;
}

export async function signOut() {
  await firebaseSignOut(auth);
}
```

### Pattern 4: User Document Creation (Idempotent First Sign-In)
**What:** On every sign-in, write user profile data using `setDoc` with `{merge: true}`. This is safe to call on repeat sign-ins — it only updates fields that change (e.g. displayName if user renames Google account) and leaves existing fields untouched (e.g. stats).
**When to use:** In the sign-in handler, immediately after `signInWithPopup` resolves.
**Example:**
```typescript
// src/firebase/users.ts
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db } from './config';

export async function createOrUpdateUserDoc(user: User) {
  const userRef = doc(db, 'users', user.uid);

  // Capture IANA timezone silently — no prompt required
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  await setDoc(
    userRef,
    {
      uid: user.uid,
      displayName: user.displayName,
      photoURL: user.photoURL,
      email: user.email,
      timezone,                   // e.g. "America/New_York" — AUTH-02
      updatedAt: serverTimestamp(),
    },
    { merge: true }               // Preserves stats, followerCount, etc. on repeat sign-ins
  );
}
```

### Pattern 5: Protected Route
**What:** A wrapper component that reads auth state from context and renders `<Outlet />` or redirects to `/login`.
**When to use:** Around all authenticated pages.
**Example:**
```typescript
// src/components/ProtectedRoute.tsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function ProtectedRoute() {
  const { user } = useAuth();
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}
```

### Firestore User Document Schema
**What:** The canonical shape of `users/{uid}`. Defined in TypeScript and must match Firestore security rules.
**Example:**
```typescript
// src/types/user.ts
export interface UserProfile {
  uid: string;
  displayName: string | null;
  photoURL: string | null;
  email: string | null;
  timezone: string;                // IANA, e.g. "Asia/Tokyo"
  createdAt?: unknown;             // serverTimestamp() on first write
  updatedAt: unknown;              // serverTimestamp() on every write
  // Stats (Phase 3 populates, initialized to zero here)
  totalStudyMinutes: number;       // Default: 0
  currentStreak: number;           // Default: 0
  longestStreak: number;           // Default: 0
  // Social graph counts (Phase 4 maintains atomically)
  followerCount: number;           // Default: 0
  followingCount: number;          // Default: 0
}
```

### Firestore Security Rules
**What:** The base rules scaffold that locks down the database. Written to `firestore.rules` at project root.
**When to use:** Deploy before any client reads/writes. This is the Phase 1 security rules baseline — later phases add collection-specific rules on top.
**Example:**
```
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Deny everything by default (no wildcard catch-all that allows)
    match /{document=**} {
      allow read, write: if false;
    }

    // Users collection: authenticated users can read any profile,
    // but can only WRITE their own document
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### Anti-Patterns to Avoid
- **Using `signInWithRedirect` without custom domain configuration:** Breaks on Chrome 115+, Safari 16.1+, Firefox 109+ due to third-party storage blocking. Use `signInWithPopup`.
- **Calling `initializeApp` more than once:** Throws "Firebase App named '[DEFAULT]' already exists." Use module singleton in `src/firebase/config.ts`.
- **Rendering auth-gated content before `loading` is false:** Causes redirect flicker where protected pages briefly appear before the redirect fires.
- **Using `doc.set()` without `{merge: true}` for user doc updates:** Overwrites the entire document, erasing stats accumulated by later phases.
- **Writing timezone capture in a useEffect:** Capture it synchronously in the sign-in handler where the user is freshly authenticated — avoids a race condition if the component unmounts before the effect fires.
- **Catch-all Firestore rule that allows access:** `allow read, write: if true;` or leaving collections without rules defaults to deny, but any match that resolves to true opens that path globally.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Auth token persistence | Custom localStorage/cookie session management | Firebase Auth (LOCAL persistence default) | Firebase handles token refresh, expiry, cross-tab sync; LOCAL persistence uses IndexedDB and survives tab close |
| Google OAuth flow | OAuth2 PKCE flow, token exchange | `signInWithPopup` + `GoogleAuthProvider` | Popup handles nonce, CSRF, token exchange securely; rolling your own OAuth is a security minefield |
| Auth state sharing across components | Prop-drilling `user` from root | React Context + `useAuth` hook | Clean, standard pattern; avoids re-renders on every tree node |
| Timezone detection | IP geolocation, custom browser detection | `Intl.DateTimeFormat().resolvedOptions().timeZone` | Native browser API; returns canonical IANA string; no library needed |
| Rules testing | Manual Firebase console testing | Firebase Local Emulator Suite + `@firebase/rules-unit-testing` | Emulator tests rules deterministically without hitting production |

**Key insight:** Firebase Auth solves token lifecycle (refresh, revocation, persistence) problems that have sharp edges. Any custom session management will miss edge cases that Firebase's SDK handles automatically.

---

## Common Pitfalls

### Pitfall 1: signInWithRedirect Broken on Modern Browsers
**What goes wrong:** `signInWithRedirect` silently fails or throws `auth/web-storage-unsupported` on Chrome 115+, Safari 16.1+, Firefox 109+. The redirect completes but `getRedirectResult` returns null or an error.
**Why it happens:** These browsers block third-party storage access by default. Firebase's redirect mechanism uses a cross-origin iframe that relies on third-party cookies to pass auth state back.
**How to avoid:** Use `signInWithPopup` instead. For this web-first React SPA, popup is the correct choice and has no third-party cookie dependency.
**Warning signs:** Users report sign-in failing silently; no error in console but user stays unauthenticated after being redirected back.

### Pitfall 2: Auth Loading Flash (Protected Route Redirect Flicker)
**What goes wrong:** The app renders the protected page for a split second, then redirects to `/login` — the user sees a flash of private content.
**Why it happens:** `onAuthStateChanged` is asynchronous. On page load, `user` is `null` for ~100-500ms while Firebase resolves the persisted session from IndexedDB.
**How to avoid:** Keep `loading: true` until `onAuthStateChanged` fires its first event. Do not render `<ProtectedRoute>` children while `loading` is true — show a spinner instead.
**Warning signs:** Brief flash of the protected page on hard refresh before redirect to login.

### Pitfall 3: Missing `{merge: true}` on User Document setDoc
**What goes wrong:** On every sign-in, the user document is completely overwritten — wiping stats, streaks, follower counts accumulated by later phases.
**Why it happens:** `setDoc` without merge option does a full replace, not a partial update.
**How to avoid:** Always use `setDoc(ref, data, { merge: true })` for the user profile document. This makes the write idempotent — safe to call on every sign-in.
**Warning signs:** User stats reset to zero after signing out and back in.

### Pitfall 4: Firestore Rules Not Deployed Before First Client Write
**What goes wrong:** During development, the default Firestore rules ("locked mode") deny all reads/writes, causing confusing permission errors.
**Why it happens:** A new Firestore database starts in locked mode. Rules must be deployed before any client SDK access.
**How to avoid:** Deploy `firestore.rules` as the first step before any other code runs. Use `firebase deploy --only firestore:rules` or the Firebase console to set rules.
**Warning signs:** Every Firestore call throws `FirebaseError: Missing or insufficient permissions`.

### Pitfall 5: Timezone Captured at Wrong Time
**What goes wrong:** Timezone is `undefined` or not captured on first sign-in — later phases (Phase 3 streak calculation) break for non-UTC users.
**Why it happens:** Timezone capture is forgotten or deferred to a separate profile setup step that users skip.
**How to avoid:** Capture timezone synchronously in `createOrUpdateUserDoc`, called immediately after `signInWithPopup` resolves. This happens on every sign-in, so even if it somehow fails the first time, it succeeds on the next.
**Warning signs:** `timezone` field missing from `users/{uid}` documents; streak calculation defaults to UTC for all users.

### Pitfall 6: Environment Variables Exposed or Misconfigured
**What goes wrong:** Firebase config (apiKey, projectId) not loading correctly, or pushed to git.
**Why it happens:** Vite requires `VITE_` prefix for env vars to be exposed to client code. Regular `REACT_APP_` prefix (Create React App) does not work with Vite.
**How to avoid:** Name all Firebase env vars with `VITE_` prefix. Add `.env.local` to `.gitignore`. Use `.env.example` with placeholder values in the repo.
**Warning signs:** `import.meta.env.VITE_FIREBASE_API_KEY` is `undefined`; Firebase throws "API key not valid" error.

---

## Code Examples

Verified patterns from official sources:

### Capturing IANA Timezone (No Library Needed)
```typescript
// Source: MDN Web Docs — Intl.DateTimeFormat.prototype.resolvedOptions()
const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
// Returns e.g. "America/New_York", "Asia/Tokyo", "Europe/London"
// Standard IANA format — supported in all modern browsers
```

### Firestore Security Rules — Base Scaffold
```
// Source: firebase.google.com/docs/firestore/security/rules-conditions
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;  // Deny all by default
    }
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### Google Sign-In with Popup
```typescript
// Source: firebase.google.com/docs/auth/web/google-signin
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from './config';

const provider = new GoogleAuthProvider();

async function signInWithGoogle() {
  const result = await signInWithPopup(auth, provider);
  // result.user contains: uid, displayName, photoURL, email
  return result.user;
}
```

### Auth State Observer with Cleanup
```typescript
// Source: firebase.google.com/docs/auth/web/start
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './config';

// Returns unsubscribe — call it to stop listening (use in useEffect cleanup)
const unsubscribe = onAuthStateChanged(auth, (user) => {
  if (user) {
    // User is signed in
    console.log('uid:', user.uid);
  } else {
    // User is signed out
  }
});
```

### setDoc with Merge (Idempotent Profile Write)
```typescript
// Source: firebase.google.com/docs/firestore/manage-data/add-data
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './config';

await setDoc(
  doc(db, 'users', user.uid),
  {
    displayName: user.displayName,
    photoURL: user.photoURL,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    updatedAt: serverTimestamp(),
  },
  { merge: true }  // Does NOT overwrite fields not listed here
);
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Namespaced SDK (`firebase.auth()`) | Modular SDK (`import { getAuth } from 'firebase/auth'`) | v9 (2021), required v12+ | Tree-shaking reduces bundle size; namespaced API removed |
| `signInWithRedirect` as default | `signInWithPopup` preferred for web | 2023-2024 (third-party cookie changes) | Redirect approach now broken on major browsers without custom domain setup |
| ES5 bundles | ES2020 minimum (v12) | v12.0.0 (July 2025) | Smaller bundles; drops IE11 and old Safari support |
| `firebase/auth/react-native` entry point | Explicit async storage import | v11.0.0 (October 2024) | Breaking change for React Native; web unaffected |

**Deprecated/outdated:**
- Namespaced API (`firebase.auth()`, `firebase.firestore()`): Removed in v9+, use modular imports only.
- `firebase/vertexai` import alias: Moved to `firebase/ai` in v12.0.0.
- ES5 bundle support: Dropped in v11.0.0.

---

## Open Questions

1. **Whether to use Firebase Hosting custom domain for authDomain**
   - What we know: `signInWithRedirect` requires a custom domain matching `authDomain` to avoid third-party cookie issues; `signInWithPopup` does not have this requirement
   - What's unclear: Whether the project will use Firebase Hosting or another host (e.g. Vercel, Netlify)
   - Recommendation: Use `signInWithPopup` which sidesteps the issue entirely; the planner can note that if the app moves to Firebase Hosting later, the authDomain should match the custom domain

2. **Initial user document creation timing — client vs. server**
   - What we know: Client-side `setDoc` on sign-in is the standard approach for small apps; Cloud Functions trigger (`onCreate` for Auth user) is the server-side alternative
   - What's unclear: Whether a Cloud Function is already planned for Phase 1 (it is not, per ROADMAP.md — Cloud Functions appear in Phase 5)
   - Recommendation: Use client-side `setDoc` with `{merge: true}` in Phase 1; this is correct for v1 scale and can be migrated server-side in a later phase if needed

3. **Whether to scaffold Firestore subcollections for followers/following now**
   - What we know: Phase 1 must show `followerCount` and `followingCount` on the profile page (PROF-02 — initially zeroed); the actual follow subcollections are Phase 4's responsibility
   - What's unclear: Whether the planner should stub out the subcollection paths in firestore.rules now or defer
   - Recommendation: Add zeroed `followerCount: 0` and `followingCount: 0` fields to the user document in Phase 1 so the profile page renders correctly; leave subcollection rules for Phase 4

---

## Sources

### Primary (HIGH confidence)
- firebase.google.com/docs/auth/web/google-signin — Google Sign-In web setup, signInWithPopup pattern
- firebase.google.com/docs/firestore/security/rules-conditions — Security rules syntax, uid matching pattern
- firebase.google.com/docs/auth/web/auth-state-persistence — Persistence modes, LOCAL persistence default
- firebase.google.com/support/release-notes/js — v12.10.0 (Feb 27 2026), v12.0.0 breaking changes (ES2020, Node 20)
- firebase.google.com/docs/web/setup — initializeApp, modular SDK import patterns
- developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/resolvedOptions — IANA timezone capture via Intl API

### Secondary (MEDIUM confidence)
- firebase.google.com/docs/auth/web/redirect-best-practices — signInWithRedirect broken on Chrome 115+, Safari 16.1+, Firefox 109+ (verified by multiple GitHub issues cross-referencing official docs)
- GitHub firebase/firebase-js-sdk issue #8329 — signInWithRedirect failure confirmed across Chrome/Safari/Firefox (cross-verified with official docs)
- LogRocket blog (blog.logrocket.com/user-authentication-firebase-react-apps/) — React Context + onAuthStateChanged + loading state pattern (consistent with official Firebase + React patterns)

### Tertiary (LOW confidence)
- fireship.io/courses/firestore-data-modeling — Follower/following count storage patterns (community resource, not official; consistent with Firebase best practices docs)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Firebase v12.10.0 version confirmed via release notes (Feb 27 2026); modular API confirmed from official docs
- Architecture: HIGH — React Context + onAuthStateChanged pattern confirmed by official Firebase + multiple authoritative sources; security rules syntax verified from official docs
- Pitfalls: HIGH for signInWithRedirect (confirmed via official docs + GitHub issues); HIGH for loading flash (standard React async pattern); MEDIUM for timezone capture timing (reasoning from docs, no explicit official guidance on timing)

**Research date:** 2026-03-01
**Valid until:** 2026-04-01 (Firebase SDK moves fast — recheck release notes if planning is delayed more than 30 days)
