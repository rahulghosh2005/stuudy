# Stack Research

**Domain:** Social activity tracking app (Strava-style, study-focused)
**Researched:** 2026-03-01
**Confidence:** HIGH (core stack verified via official docs and multiple sources)

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| React | 19.2 | UI rendering | Current stable; React compiler reduces re-renders 25-40%, Actions API simplifies async state; shadcn/ui and all key libs support it |
| TypeScript | 5.x (latest) | Type safety | Non-negotiable for Firebase data models and Firestore schema — catches shape mismatches at compile time, not runtime |
| Vite | 6.x (latest) | Build tool | Standard fast bundler for React SPAs in 2025; official shadcn/ui setup uses Vite + React template |
| Firebase JS SDK | 12.x (latest, modular) | Auth + Firestore + Hosting | Modular SDK v9+ provides 80% smaller bundles via tree-shaking; v12.10.0 is current stable |
| Firestore | (via Firebase SDK) | Real-time database, primary store | Chosen constraint; onSnapshot enables live feed; offline persistence built in |
| Firebase Auth | (via Firebase SDK) | Google sign-in | Chosen constraint; trivial Google OAuth setup, integrates natively with Firestore Security Rules |
| Tailwind CSS | v4 (latest) | Utility-first styling | v4 is current; shadcn/ui CLI initializes with v4 by default in 2025; dark-first design fits athletic aesthetic perfectly |
| shadcn/ui | latest (CLI-managed) | Component library | Best choice for a custom dark athletic design system — you own the source code, nothing is locked behind a dependency, full Tailwind customization |
| Zustand | 5.0.x | Client state management | Best for 90% of SPAs and MVPs; handles timer state, auth user, UI state without Redux boilerplate; v5 requires React 18+ (compatible) |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| TanStack Query (React Query) | v5 | Server state, Firestore data caching | Use for all Firestore reads that are not real-time — stats aggregations, profile data, session history. Pair with `onSnapshot` for live feed using the subscription pattern. |
| React Router | v7 | Client-side routing | SPA routing for Home/Feed/Stats/Profile tabs; v7 is stable and sufficient for non-SSR SPA; TanStack Router is overkill for this app's simple route structure |
| React Hook Form | v7 | Form state management | All forms: session creation, tag selection, profile edits. Minimal re-renders, uncontrolled inputs. |
| Zod | v3 | Schema validation | Pair with React Hook Form via `zodResolver`; reuse schemas for Firestore write validation; keeps form and DB types in sync |
| date-fns | v3 | Date formatting and arithmetic | Tree-shakeable; perfect for formatting session timestamps, computing streaks, heatmap data. Prefer over dayjs for functional style and tree-shaking. |
| Recharts | v2.x | Stats visualization | Bar charts (weekly activity) and composable chart primitives. Well-maintained, 24K+ stars, simple React component API. Use for stats screen. |
| react-calendar-heatmap | latest | Monthly heatmap calendar | Purpose-built SVG heatmap; integrates cleanly with Recharts-based stat pages. Pair with date-fns for data transformation. |
| Lucide React | latest | Icon set | Ships as individual tree-shakeable SVG components; clean minimal icons for athletic UI; official recommendation from shadcn/ui |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Firebase CLI | Local emulator suite, deployment | Run `firebase emulators:start` for local Firestore + Auth development — never develop against production Firestore |
| Firebase Emulator Suite | Local Firestore + Auth testing | Essential for testing Security Rules without incurring Firestore read/write costs; test rules with `firebase emulators:exec` |
| Vitest | Unit and integration testing | Vite-native test runner; pairs naturally with the Vite build; use for hook testing, Zustand store tests, timer logic |
| ESLint + Prettier | Code quality | Standard; configure with TypeScript-aware rules; shadcn/ui CLI sets up basic lint config |
| TypeScript strict mode | Type safety | Enable `"strict": true` in tsconfig; critical for Firestore document typing to prevent silent shape errors |

---

## Firebase-Specific Patterns

### Modular SDK Import Pattern (CRITICAL)

Always use modular imports. Never use the compat/namespaced API.

```typescript
// CORRECT — modular, tree-shakeable
import { getFirestore, collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

// WRONG — compat API, bloated bundle
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
```

Firebase SDK v12.x modular API reduces bundle size by up to 80% vs the namespaced API.

### Firestore Collection Structure

Flat collections with denormalization. Avoid deep nesting beyond subcollections.

```
/users/{uid}
  - displayName: string
  - photoURL: string
  - totalStudySeconds: number   // denormalized aggregate — avoid computing on read
  - currentStreak: number
  - followerCount: number
  - followingCount: number
  - createdAt: Timestamp

/sessions/{sessionId}
  - userId: string
  - userName: string            // denormalized — avoid join reads in feed
  - userPhotoURL: string        // denormalized
  - subject: string
  - durationSeconds: number
  - startedAt: Timestamp
  - endedAt: Timestamp | null   // null = session is LIVE
  - privacy: 'public' | 'followers' | 'private'
  - likeCount: number           // denormalized aggregate
  - commentCount: number        // denormalized aggregate

/sessions/{sessionId}/likes/{uid}
  - likedAt: Timestamp

/sessions/{sessionId}/comments/{commentId}
  - userId: string
  - userName: string
  - text: string
  - createdAt: Timestamp

/follows/{followerId_followingId}         // composite key: `${followerId}_${followingId}`
  - followerId: string
  - followingId: string
  - createdAt: Timestamp

/tags/{tagId}
  - name: string
  - userId: string              // tags are per-user
  - color: string
```

**Live session detection:** Query `sessions` where `userId in [followed user IDs]` AND `endedAt == null`. This is how "studying live" works — a null `endedAt` means active.

**Feed approach — Pull model (recommended for V1):** Query sessions from users the current user follows using `where('userId', 'in', followingIds)`. Firestore `in` queries support up to 30 values. For users following more than 30 accounts, paginate or implement fan-out via Cloud Functions later.

### Real-Time Listener Pattern

Use `onSnapshot` only for data that truly needs real-time updates. Everything else goes through TanStack Query with one-time `getDocs`.

```typescript
// Real-time: live feed (needs instant updates when followed user starts/stops studying)
// Real-time: active timer state synced to Firestore

// One-time fetch + TanStack Query cache:
//   - stats aggregations
//   - session history
//   - profile data
//   - comment/like counts (refresh on focus, not live)
```

Integrate `onSnapshot` with TanStack Query via the `queryClient.setQueryData` pattern:

```typescript
// Custom hook pattern for real-time Firestore in TanStack Query
function useLiveFeed(followingIds: string[]) {
  const queryClient = useQueryClient();
  const queryKey = ['feed', followingIds];

  useEffect(() => {
    if (!followingIds.length) return;
    const q = query(
      collection(db, 'sessions'),
      where('userId', 'in', followingIds),
      orderBy('startedAt', 'desc'),
      limit(20)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      queryClient.setQueryData(queryKey, snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsubscribe; // cleanup on unmount
  }, [followingIds.join(',')]);

  return useQuery({ queryKey, queryFn: () => [], staleTime: Infinity });
}
```

### Security Rules Architecture

Default deny-all, explicit allow. Encode privacy logic in rules — don't trust client-side filtering alone.

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper functions
    function isAuth() { return request.auth != null; }
    function isOwner(uid) { return request.auth.uid == uid; }
    function isFollowing(targetUid) {
      return exists(/databases/$(database)/documents/follows/$(request.auth.uid + '_' + targetUid));
    }

    match /users/{uid} {
      allow read: if isAuth();
      allow write: if isOwner(uid);
    }

    match /sessions/{sessionId} {
      allow read: if isAuth() && (
        resource.data.privacy == 'public' ||
        isOwner(resource.data.userId) ||
        (resource.data.privacy == 'followers' && isFollowing(resource.data.userId))
      );
      allow create: if isAuth() && isOwner(request.resource.data.userId);
      allow update: if isOwner(resource.data.userId);
      allow delete: if isOwner(resource.data.userId);
    }

    match /follows/{followId} {
      allow read: if isAuth();
      allow create: if isAuth() && isOwner(request.resource.data.followerId);
      allow delete: if isAuth() && isOwner(resource.data.followerId);
    }
  }
}
```

### Timer State Architecture

The timer runs locally in Zustand (in-memory) for precision, and syncs to Firestore only at key lifecycle events.

```
Zustand store: { status, startedAt, elapsedSeconds, subject, mode }
                      ↓ startSession()
                Firestore: sessions/{sessionId} created with endedAt: null
                      ↓ stopSession()
                Firestore: sessions/{sessionId} updated with endedAt + durationSeconds
```

Do NOT use `setInterval` to write to Firestore every second — that would create excessive writes and cost money. Write only on start and stop.

For timer accuracy across tab visibility changes, use `Date.now()` anchored to `startedAt` (recalculate elapsed on each render), not cumulative interval increments.

```typescript
// Timer pattern: compute elapsed from anchor time, not cumulative count
const elapsed = isRunning ? Math.floor((Date.now() - startedAt) / 1000) + previousElapsed : previousElapsed;
```

---

## Zustand Store Architecture

```typescript
// Timer store — pure in-memory, no persistence
interface TimerStore {
  mode: 'stopwatch' | 'pomodoro';
  status: 'idle' | 'running' | 'paused';
  startedAt: number | null;       // Date.now() when last started
  accumulatedSeconds: number;     // seconds accumulated before last pause
  subject: string | null;
  pomodoroWorkMinutes: number;
  pomodoroBreakMinutes: number;
  // actions
  start: (subject: string) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
}

// Auth store — mirrors Firebase auth state
interface AuthStore {
  user: User | null;               // firebase/auth User
  loading: boolean;
  setUser: (user: User | null) => void;
}

// UI store — transient UI state (modals, selected tab)
interface UIStore {
  activeTab: 'home' | 'feed' | 'stats' | 'profile';
  setActiveTab: (tab: string) => void;
}
```

Keep stores small and focused. TanStack Query owns all server/Firestore data — Zustand only owns local ephemeral state.

---

## Installation

```bash
# Create project
npm create vite@latest stuuudy -- --template react-ts
cd stuuudy

# Core
npm install firebase zustand react-router-dom

# Server state + Firebase integration
npm install @tanstack/react-query

# UI framework (shadcn/ui installs via CLI, not npm)
npm install tailwindcss @tailwindcss/vite

# Forms
npm install react-hook-form @hookform/resolvers zod

# Date utilities
npm install date-fns

# Charts
npm install recharts react-calendar-heatmap

# Icons
npm install lucide-react

# Dev dependencies
npm install -D typescript @types/node vitest @testing-library/react @testing-library/jest-dom

# Initialize shadcn/ui (run after Tailwind is configured)
npx shadcn@latest init
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Zustand v5 | Redux Toolkit | Only if team is large (5+ devs), needs time-travel debugging, or has strict enterprise state patterns. Overkill for this app. |
| Zustand v5 | Jotai | If state is highly granular and atom-level reactivity matters (e.g., 100+ independent atoms). Not needed here. |
| React Router v7 | TanStack Router | If type-safe route params, search param serialization, or nested loader patterns are critical. Adds complexity without benefit for this 4-tab SPA. |
| TanStack Query | ReactFire | ReactFire is maintained by Firebase team but uses Suspense-heavy approach that can complicate error boundaries. TanStack Query gives more explicit control over loading/error states. |
| TanStack Query | react-firebase-hooks | Last published 3 years ago (v5.1.1 as of 2025). Unmaintained — do not use. |
| shadcn/ui + Tailwind | Chakra UI | Chakra is good for teams wanting off-the-shelf theming. shadcn gives full ownership of component source — critical for custom dark athletic design system. |
| shadcn/ui + Tailwind | MUI (Material UI) | MUI imposes Material Design language. Stuuudy needs a Strava-style aesthetic — MUI's defaults fight you the whole way. |
| Recharts | Nivo | Nivo is more visually striking but heavier. Recharts is simpler for bar charts. Nivo's heatmap calendar is good but react-calendar-heatmap is more focused. |
| date-fns | dayjs | dayjs is 6kb monolithic. date-fns tree-shakes to only what you import. Either works; date-fns is safer long-term for bundle size. |
| Firebase Hosting | Vercel | Vercel has better DX and preview deployments. However, Firebase Hosting co-locates with Auth + Firestore on the same Google infrastructure, reducing cold-start latency for Cloud Functions in future milestones. Either is valid. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| react-firebase-hooks | Last published 3 years ago; not maintained for Firebase SDK v9+ modular API | Custom hooks with `onSnapshot` + TanStack Query `setQueryData` pattern |
| Firebase Realtime Database | Different product from Firestore; weaker query capabilities, worse offline support | Firestore (already chosen) |
| Firebase compat API (`firebase/compat/*`) | 3-5x larger bundle size; deprecated mental model | Firebase modular API (`firebase/firestore`, `firebase/auth`) |
| Context API for server data | Causes cascade re-renders on any state change; no caching, no background refresh | TanStack Query for all Firestore data |
| setInterval writing to Firestore | Generates excessive writes (60 writes/minute for a 1-hour session = 3,600 writes); costs money | Write to Firestore only on session start and stop; compute elapsed time from `Date.now() - startedAt` |
| Monotonically increasing document IDs | Causes Firestore hotspots (all writes go to same tablet) | Let Firestore auto-generate IDs (`addDoc`) or use `push()` equivalent |
| moment.js | 300KB bundle, deprecated | date-fns v3 |
| Global onSnapshot listeners on all documents | Listener-per-component causes N simultaneous read streams | Centralize Firestore listeners in custom hooks, unsubscribe on unmount |
| Storing follower list as array inside user document | Arrays have a 1MB document size limit; 1000 followers = problematic | Separate `/follows/{followerId_followingId}` collection |

---

## Stack Patterns by Variant

**For the live "studying now" indicator:**
- Store sessions with `endedAt: null` for active sessions
- Real-time query: `where('endedAt', '==', null)` on followed users' sessions
- Remove the live indicator client-side when session stops (Firestore update sets `endedAt`)

**For Pomodoro vs. stopwatch mode:**
- Both run in Zustand; only the display logic differs
- Pomodoro: counts DOWN from `pomodoroWorkMinutes * 60`; triggers break phase when reaches 0
- Stopwatch: counts UP from 0; user manually stops

**For session privacy:**
- Privacy stored as a field on the session document (`'public' | 'followers' | 'private'`)
- Firestore Security Rules enforce read access — client-side filtering is not sufficient
- Feed query should still include privacy filter (`where('privacy', '!=', 'private')`) to reduce reads before rules apply

**For the feed `in` query limit (>30 following):**
- V1: Cap at 30 following IDs in the in-query (Firestore limit)
- Future milestone: Fan-out feed via Cloud Function trigger on session create

---

## Version Compatibility

| Package | Version | Compatible With | Notes |
|---------|---------|-----------------|-------|
| React | 19.2 | Zustand 5.x, TanStack Query v5, React Router v7 | All major libs have confirmed React 19 support |
| Zustand | 5.0.x | React 18+ required | Dropped React <18 support in v5; uses native `useSyncExternalStore` |
| TanStack Query | v5 | React 18+, React 19 | v5 is current stable; breaking changes from v4 in query options API |
| Firebase SDK | 12.x | Any modern browser, React 19 | Modular API (v9+) only; do not use compat API |
| Tailwind CSS | v4 | shadcn/ui (CLI-managed), Vite 6 | shadcn/ui CLI initializes with Tailwind v4 by default; deprecated tailwindcss-animate in favor of tw-animate-css |
| shadcn/ui | latest | React 18+, React 19, Tailwind v4 | Component source is copied into project — no npm version pinning needed |
| React Hook Form | v7 | React 18+, React 19 | Fully compatible |
| Zod | v3 | React Hook Form v7, TypeScript 5 | Use `zodResolver` from `@hookform/resolvers` |

---

## Sources

- Firebase official docs (firebase.google.com/docs/web/modular-upgrade) — Firebase JS SDK v12.10.0 confirmed, modular API 80% bundle reduction, verified HIGH confidence
- Firebase official docs (firebase.google.com/docs/firestore/best-practices) — Firestore 500/50/5 rule, collection structure guidance, HIGH confidence
- shadcn/ui official docs (ui.shadcn.com/docs/installation/vite, ui.shadcn.com/docs/tailwind-v4) — Tailwind v4 compatibility confirmed, shadcn/ui CLI setup, HIGH confidence
- npm registry — Zustand v5.0.11 (latest), react-firebase-hooks v5.1.1 last published 3 years ago, MEDIUM confidence
- WebSearch: React state management 2025 — Zustand consensus as standard for MVP/SaaS (multiple sources), MEDIUM confidence
- WebSearch: React UI library comparison 2025 — shadcn/ui dominant choice for new projects in 2025-2026, MEDIUM confidence
- WebSearch: React 19.2 stable October 2025, React compiler status — MEDIUM confidence
- WebSearch: TanStack Query Firebase integration, invertase/tanstack-query-firebase — MEDIUM confidence
- WebSearch: Firestore social feed data models (fireship.io, DEV community articles) — follower feed pull model for V1, MEDIUM confidence
- WebSearch: date-fns vs dayjs 2025 — date-fns tree-shaking advantage confirmed, MEDIUM confidence
- WebSearch: Firebase Hosting vs Vercel for SPAs 2025 — both valid; Firebase Hosting recommended for co-location with backend, MEDIUM confidence

---
*Stack research for: stuuudy — Strava-style study tracking social app*
*Researched: 2026-03-01*
