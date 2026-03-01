# Architecture Research

**Domain:** Social activity feed app (Strava-style study tracker)
**Researched:** 2026-03-01
**Confidence:** MEDIUM — Firestore patterns are well-documented; specific feed trade-offs verified across multiple sources. Presence pattern is officially documented. Gamification model inferred from Firebase leaderboard codelab.

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         React App (SPA)                              │
├──────────────┬──────────────┬───────────────┬───────────────────────┤
│  Timer View  │  Feed View   │  Stats View   │   Profile View        │
│  (Home tab)  │  (Feed tab)  │  (Stats tab)  │   (Profile tab)       │
└──────┬───────┴──────┬───────┴───────┬───────┴───────┬───────────────┘
       │              │               │               │
┌──────▼──────────────▼───────────────▼───────────────▼───────────────┐
│                    Custom Hooks Layer                                 │
│  useTimer   useSession   useFeed   useStats   useProfile  useAuth   │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────────┐
│                    Service Layer                                      │
│   sessionService   feedService   userService   socialService        │
└──────────┬───────────────────────────────────────────────┬──────────┘
           │                                               │
┌──────────▼──────────┐                    ┌──────────────▼───────────┐
│   Firebase Auth     │                    │       Firestore           │
│   (Google SSO)      │                    │  (primary data store)     │
└─────────────────────┘                    └──────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Timer View | Start/stop/pause timer, select subject, show today's total | Local state + sessionService on stop |
| Feed View | Display activity cards for followed users (live + completed) | useFeed hook with onSnapshot listener |
| Stats View | Weekly chart, monthly heatmap, subject breakdown | useStats hook, one-shot queries |
| Profile View | User stats summary, follow lists, privacy settings | useProfile hook |
| Custom Hooks | Encapsulate Firestore subscription logic, expose clean state | useEffect + onSnapshot + cleanup |
| Service Layer | All Firestore reads/writes, no UI logic | Pure functions returning promises or unsubscribe fns |
| Firebase Auth | Google SSO, session token, UID as primary user key | Firebase SDK auth module |
| Firestore | Document storage, real-time listeners, security rules | Native mode Firestore |

## Recommended Firestore Collection Structure

### Top-Level Collections

```
/users/{userId}
/sessions/{sessionId}
/follows/{followId}
/feed/{userId}/items/{feedItemId}
/presence/{userId}
```

### Document Schemas

**users/{userId}**
```
{
  uid: string,                    // Firebase Auth UID
  displayName: string,
  photoURL: string,
  username: string,               // URL-safe handle
  totalStudyMinutes: number,      // denormalized aggregate
  currentStreak: number,          // consecutive days studied
  longestStreak: number,
  followerCount: number,          // denormalized (fan-out safe)
  followingCount: number,
  defaultPrivacy: "public" | "followers" | "private",
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

**sessions/{sessionId}**
```
{
  sessionId: string,
  userId: string,                 // owner
  subject: string,                // e.g. "Mathematics"
  subjectId: string,              // ref to user-defined subjects
  durationMinutes: number,
  startedAt: Timestamp,
  endedAt: Timestamp,
  notes: string | null,
  privacy: "public" | "followers" | "private",
  likeCount: number,              // denormalized
  commentCount: number,           // denormalized
  isLive: boolean,                // true while timer running
  createdAt: Timestamp
}
// Subcollections:
// sessions/{sessionId}/likes/{userId}    { likedAt: Timestamp }
// sessions/{sessionId}/comments/{commentId}  { userId, text, createdAt }
```

**follows/{followId}**
```
{
  followId: string,               // composite: `${followerId}_${followedId}`
  followerId: string,
  followedId: string,
  createdAt: Timestamp
}
// Query pattern: where('followerId', '==', uid) → who I follow
//               where('followedId', '==', uid) → my followers
```

**feed/{userId}/items/{feedItemId}**
```
{
  sessionId: string,              // ref to original session
  authorId: string,
  authorName: string,             // denormalized for display
  authorPhotoURL: string,         // denormalized for display
  subject: string,
  durationMinutes: number,
  isLive: boolean,
  privacy: "public" | "followers",
  createdAt: Timestamp
}
// This is the fan-out copy. Lightweight — just enough to render a feed card.
```

**presence/{userId}**
```
{
  isStudying: boolean,            // actively running timer
  sessionId: string | null,       // current live session id
  subject: string | null,         // current subject
  startedAt: Timestamp | null,
  lastSeen: Timestamp             // updated by Realtime Database → Cloud Function
}
// Backed by Firebase Realtime Database for disconnect detection.
// Cloud Function mirrors RTDB presence to this Firestore doc.
```

### Subjects — User-Scoped Subcollection

```
/users/{userId}/subjects/{subjectId}
{
  name: string,
  color: string,
  totalMinutes: number,           // denormalized aggregate
  createdAt: Timestamp
}
```

### Future Gamification Collections (design now, implement later)

```
/users/{userId}/achievements/{achievementId}
{
  type: "egg_hatched" | "streak_milestone" | "zoo_unlock",
  awardedAt: Timestamp,
  metadata: object
}

/leaderboards/{period}/entries/{userId}
{
  displayName: string,
  photoURL: string,
  totalMinutes: number,
  rank: number                    // updated by scheduled Cloud Function
}
// period: "weekly_2026-W09", "monthly_2026-03", "alltime"
```

These collections are designed but not populated in v1. The `users.totalStudyMinutes` and `users.currentStreak` fields in v1 are precisely the source-of-truth values that gamification reads.

## Recommended Project Structure

```
src/
├── app/                          # App shell, routing, global providers
│   ├── App.tsx
│   ├── router.tsx
│   └── providers.tsx             # AuthProvider, QueryClientProvider
├── features/                     # Feature-based grouping
│   ├── timer/
│   │   ├── components/           # TimerDisplay, SubjectSelector, ModeToggle
│   │   ├── hooks/                # useTimer, useActiveSession
│   │   └── index.ts
│   ├── feed/
│   │   ├── components/           # FeedCard, LiveBadge, LikeButton
│   │   ├── hooks/                # useFeed, useLiveUsers
│   │   └── index.ts
│   ├── stats/
│   │   ├── components/           # WeeklyChart, Heatmap, SubjectBreakdown
│   │   ├── hooks/                # useStats, useStreak
│   │   └── index.ts
│   ├── profile/
│   │   ├── components/           # ProfileHeader, FollowList, SessionHistory
│   │   ├── hooks/                # useProfile, useFollows
│   │   └── index.ts
│   └── auth/
│       ├── components/           # GoogleSignInButton, AuthGuard
│       ├── hooks/                # useAuth
│       └── index.ts
├── services/                     # All Firestore/Firebase logic
│   ├── firebase.ts               # Firebase app init, exports db, auth
│   ├── sessionService.ts         # createSession, endSession, listenToSession
│   ├── feedService.ts            # subscribeToFeed, fanOutSession
│   ├── userService.ts            # getUser, updateUser, updateStreak
│   ├── socialService.ts          # follow, unfollow, getFollowers
│   └── presenceService.ts        # setStudying, clearStudying, subscribePresence
├── lib/                          # Shared utilities
│   ├── firestore/
│   │   ├── converters.ts         # Type-safe withConverter helpers
│   │   └── batch.ts              # Batch write helpers
│   └── utils/
│       ├── time.ts               # Duration formatting
│       └── streak.ts             # Streak calculation logic
└── ui/                           # Shared UI components
    ├── Card.tsx
    ├── Avatar.tsx
    └── ProgressBar.tsx
```

### Structure Rationale

- **features/:** Groups all code for one feature together. When adding the egg-hatching milestone, create `features/gamification/` without touching existing features.
- **services/:** Strict boundary: zero React imports, zero JSX. Firestore logic lives here only. Components never call Firestore SDK directly.
- **lib/converters.ts:** Firestore `withConverter` typed converters prevent runtime type errors when reading documents.

## Architectural Patterns

### Pattern 1: Hybrid Feed — Fan-Out on Write (Recommended for v1)

**What:** When a session ends, a Cloud Function (or client-side batch write) pushes a lightweight copy of the session into every follower's `feed/{userId}/items/` subcollection. Feed reads are a simple ordered query on a single collection.

**When to use:** User base under ~50K users and no single user has more than ~5K followers. Covers all realistic v1 scenarios.

**Trade-offs:**
- Reads are O(1) — single ordered query, no joins
- Writes are O(followers) — cost grows with follower count
- Data duplication is intentional — feed items are display copies, not source of truth
- Sessions document remains the canonical source; likes/comments always reference `sessions/{sessionId}`

**Implementation note:** Use a Cloud Function `onWrite` trigger on `sessions/{sessionId}` where `isLive` transitions from `true` to `false`. The function fetches the user's followers and batch-writes feed items. This keeps the client simple.

```typescript
// services/feedService.ts
export const subscribeToFeed = (
  userId: string,
  onUpdate: (items: FeedItem[]) => void
): Unsubscribe => {
  const feedRef = collection(db, 'feed', userId, 'items');
  const q = query(feedRef, orderBy('createdAt', 'desc'), limit(50));
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map((doc) =>
      feedItemConverter.fromFirestore(doc)
    );
    onUpdate(items);
  });
};
```

```typescript
// features/feed/hooks/useFeed.ts
export const useFeed = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<FeedItem[]>([]);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToFeed(user.uid, setItems);
    return unsubscribe; // cleanup on unmount
  }, [user?.uid]);

  return { items };
};
```

### Pattern 2: Presence via RTDB + Firestore Hybrid

**What:** Firebase Realtime Database handles disconnect detection (onDisconnect). A Cloud Function mirrors RTDB presence changes to Firestore `presence/{userId}` documents so the feed can show "studying live" badges.

**When to use:** Any time you need reliable offline detection. Firestore has no native connection lifecycle awareness.

**Trade-offs:**
- Requires Realtime Database in addition to Firestore (two databases)
- RTDB is cheap for this use case — presence data is tiny
- Firestore-only alternative (heartbeat polling) fails to detect browser-close events reliably

```typescript
// services/presenceService.ts
// Client side: set RTDB node on study start, clear on stop
import { ref, set, onDisconnect } from 'firebase/database';

export const setStudying = async (
  userId: string,
  sessionId: string,
  subject: string
) => {
  const presenceRef = ref(rtdb, `presence/${userId}`);
  await set(presenceRef, { isStudying: true, sessionId, subject, startedAt: Date.now() });
  // Auto-clear if connection drops
  await onDisconnect(presenceRef).set({ isStudying: false, sessionId: null, subject: null });
};

// Cloud Function mirrors RTDB → Firestore (separate functions/ project)
// onValue trigger: presence/{userId} → writes to Firestore presence/{userId}
```

### Pattern 3: Denormalized Aggregates with Cloud Function Maintenance

**What:** Counts (likeCount, commentCount, totalStudyMinutes, followerCount, currentStreak) are stored denormalized on the parent document. Cloud Functions or transactions keep them accurate.

**When to use:** Any time you need to display a count without a collection-size query. Firestore has no cheap `COUNT(*)`.

**Trade-offs:**
- Fast reads: count is on the document you already have
- Write contention risk if >1 write/second to same document — acceptable for this app's scale
- Use `FieldValue.increment()` for atomic updates; never read-modify-write counts

```typescript
// Atomic like count increment — never read before write
import { FieldValue } from 'firebase/firestore';

export const likeSession = async (sessionId: string, userId: string) => {
  const batch = writeBatch(db);
  const likeRef = doc(db, 'sessions', sessionId, 'likes', userId);
  const sessionRef = doc(db, 'sessions', sessionId);
  batch.set(likeRef, { likedAt: serverTimestamp() });
  batch.update(sessionRef, { likeCount: FieldValue.increment(1) });
  await batch.commit();
};
```

### Pattern 4: Streak Calculation at Session End

**What:** When a session ends, calculate whether today advances the streak. Store `currentStreak`, `longestStreak`, and `lastStudiedDate` on the user document. Check via Cloud Function or client-side on session write.

**When to use:** Always — streak is a core feature that future gamification (eggs) builds on. Getting this right in v1 matters.

**Trade-offs:**
- Simple comparison: `lastStudiedDate == yesterday` → increment streak
- Idempotent: multiple sessions on same day don't increment streak
- Must handle timezone correctly — compare dates in the user's local timezone, not UTC

```typescript
// lib/utils/streak.ts
export const calculateStreak = (
  lastStudiedDate: string | null, // 'YYYY-MM-DD' in user's local TZ
  currentStreak: number,
  todayStr: string                // 'YYYY-MM-DD' in user's local TZ
): number => {
  if (!lastStudiedDate) return 1;
  if (lastStudiedDate === todayStr) return currentStreak; // same day, no change
  const yesterday = subDays(parseISO(todayStr), 1);
  if (isSameDay(parseISO(lastStudiedDate), yesterday)) return currentStreak + 1;
  return 1; // streak broken
};
```

## Data Flow

### Session Creation Flow

```
User taps "Stop" on timer
    ↓
useTimer calls sessionService.endSession()
    ↓
sessionService writes sessions/{sessionId} with isLive: false
    ↓
Cloud Function triggers on sessions/{sessionId} write
    ↓
Cloud Function reads followers from follows collection
    ↓
Cloud Function batch-writes to feed/{followerId}/items/{sessionId}
    ↓
Cloud Function updates users/{userId}: totalStudyMinutes, streak, lastStudiedDate
    ↓
Feed listeners (onSnapshot on feed/{followerId}/items) fire for each follower
    ↓
FeedCards re-render with new session card
```

### Live Session Feed Flow

```
User taps "Start" on timer
    ↓
sessionService.startSession() writes sessions/{sessionId} with isLive: true
    ↓
presenceService.setStudying() writes RTDB presence/{userId}
    ↓
Cloud Function mirrors RTDB → Firestore presence/{userId}
    ↓
Feed listener (optional: useLiveUsers) queries where isStudying == true among follows
    ↓
Feed cards render "Studying live" badge in real-time
```

### Feed Read Flow

```
User opens Feed tab
    ↓
useFeed hook mounts, calls subscribeToFeed(userId)
    ↓
onSnapshot on feed/{userId}/items ordered by createdAt desc, limit 50
    ↓
Initial snapshot fires immediately with cached + fresh data
    ↓
Subsequent writes by Cloud Function fire incremental updates (no full re-read)
    ↓
useFeed returns items[], loading state to FeedCard list
```

### Follow/Unfollow Flow

```
User taps "Follow" on a profile
    ↓
socialService.follow(followerId, followedId) batch:
  - sets follows/{followerId_followedId}
  - increments users/{followedId}.followerCount
  - increments users/{followerId}.followingCount
    ↓
Cloud Function (optional backfill) can seed historical sessions into new follower's feed
```

## Component Boundaries — What Talks to What

| Boundary | Communication | Rule |
|----------|---------------|------|
| React Component → Service | Via custom hook only | Components never import from `services/` directly |
| Custom Hook → Service | Direct import, returns cleanup fn | Hook owns subscription lifecycle |
| Service → Firestore | Firestore SDK calls | No business logic in service layer |
| Service → Cloud Function | Firestore write triggers | Services don't call Functions directly |
| Cloud Function → Firestore | Admin SDK | Fan-out, aggregate updates, presence mirroring |
| Feed items → Sessions | sessionId reference only | Feed items do NOT embed comment/like data |
| Likes/Comments → Sessions | Subcollection of sessions | Never stored on feed items |

## Suggested Build Order

Build in this sequence — each layer is a dependency for the next.

### Layer 1: Foundation (build first — everything depends on this)
1. Firebase init, Auth context, Google sign-in
2. Firestore security rules (draft) — protect all collections from day one
3. `users/{userId}` document creation on first sign-in
4. Type definitions and Firestore converters for all collections

### Layer 2: Core Session Mechanics (the product's reason to exist)
5. Subject management (`users/{userId}/subjects`)
6. Timer logic (local state, stopwatch + Pomodoro modes)
7. `sessions/{sessionId}` write on stop — the foundational write event
8. `totalStudyMinutes` and streak update on session write

### Layer 3: Stats (validates that sessions work correctly)
9. Today's total query
10. Weekly bar chart (last 7 days aggregation)
11. Monthly heatmap (last 30 days)
12. Subject breakdown

### Layer 4: Social Graph (prerequisite for feed)
13. Follow/unfollow with batch counter increments
14. Followers/following lists
15. Profile view with follower/following counts

### Layer 5: Feed — Fan-Out (requires Layer 2 + 4)
16. Cloud Function: fan-out on session write → feed items
17. `subscribeToFeed` onSnapshot listener
18. Feed card component (read-only first)

### Layer 6: Social Interactions
19. Like a session (batch: likes subcollection + likeCount increment)
20. Comment on a session
21. Comment list display

### Layer 7: Presence / Live Sessions
22. RTDB presence write on timer start
23. onDisconnect cleanup
24. Cloud Function RTDB → Firestore mirror
25. "Studying live" indicator in feed

### Layer 8: Privacy
26. Privacy field on session writes
27. Firestore security rules updated to enforce privacy
28. Feed fan-out respects privacy: only fan-out public/followers sessions

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1K users | Client-side fan-out acceptable. All architecture above works. Direct writes from client on follow/unfollow. |
| 1K-10K users | Move fan-out entirely to Cloud Functions. Monitor Firestore write costs. Add Firestore composite indexes for feed queries. |
| 10K-100K users | Implement chunked follower index (Jonathan Gamble's _relations pattern). Add pagination to feed (cursor-based, not offset). Cap feed listener to visible items only. |
| 100K+ users | Separate presence to dedicated service. Consider scheduled leaderboard materialization. Evaluate distributed counters for high-contention follower counts. |

### Scaling Priorities

1. **First bottleneck:** Fan-out write cost when a popular user (1K+ followers) posts a session. Fix: move fan-out to Cloud Function with batched processing and pagination.
2. **Second bottleneck:** Feed listener for power users subscribed to many active studiers. Fix: paginate feed (cursor-based), only listen to first page in real-time.

## Anti-Patterns

### Anti-Pattern 1: Pull Model Feed (Fan-In)

**What people do:** At feed-read time, query `sessions` where `userId in [followedUser1, followedUser2, ...]` and merge/sort the results.

**Why it's wrong:** Firestore does not support `IN` queries with more than 30 values and has no cross-collection sort. You'd need one query per followed user, then client-side merge and sort. With 100 followed users, that's 100 round trips on every feed open. Expensive, slow, and complex.

**Do this instead:** Fan-out on write. Accept write amplification in exchange for O(1) feed reads. This is the standard Firestore pattern for social feeds.

### Anti-Pattern 2: Storing Likes/Comments Inside the Session Document

**What people do:** Embed likes as an array field on the session document: `likes: [userId1, userId2, ...]`.

**Why it's wrong:** Firestore documents have a 1MB size limit. An array of user IDs grows unboundedly. You can't paginate subcollection items if they're in an array. You can't query "did I like this?" without fetching the full array.

**Do this instead:** Use a subcollection `sessions/{sessionId}/likes/{userId}`. Existence of the document = liked. This supports existence checks, pagination, and stays within document size limits.

### Anti-Pattern 3: Deep Nesting of Collections

**What people do:** Nest feed inside sessions inside users: `users/{uid}/sessions/{sid}/feedItems/...`.

**Why it's wrong:** Firestore cannot query across subcollections of different parents easily. You can't query "all feed items across all users." Deep nesting makes security rules complex and data harder to manage.

**Do this instead:** Keep major entities as top-level collections (`sessions`, `feed`, `follows`). Use flat IDs and denormalization for relationships.

### Anti-Pattern 4: Reading Before Counting

**What people do:** Read all like documents, count them in the client, display the count.

**Why it's wrong:** 1000 likes = 1000 document reads billed every time the session card renders. Expensive and scales linearly.

**Do this instead:** Denormalize `likeCount` on the session document. Use `FieldValue.increment(1)` for atomic updates. Read the count from the session document you already have.

### Anti-Pattern 5: Using Firestore for Presence Detection

**What people do:** Use a heartbeat: write to `presence/{userId}` every 30 seconds. If `lastSeen > 60s ago`, consider offline.

**Why it's wrong:** Browser close / network drop / tab crash silently fails to write. Heartbeat fires at most once per 30s interval, meaning you get 30–60s false "online" windows that are confusing in a "studying live" context.

**Do this instead:** Firebase Realtime Database's `onDisconnect()` handler fires server-side even when the client disconnects ungracefully. Use RTDB for the ephemeral presence state and mirror to Firestore via Cloud Function.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Firebase Auth | Google OAuth via signInWithPopup / signInWithRedirect | Mobile web: use redirect (popup blocked). Desktop: popup is fine. |
| Firestore | Direct SDK (web modular v9+) | Use modular imports for tree-shaking |
| Firebase Realtime Database | Direct SDK, presence only | Lightweight use case — free tier handles it |
| Cloud Functions (Gen 2) | Triggered by Firestore writes | Fan-out, aggregate updates, RTDB → Firestore mirror |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Timer state → Session write | One-way: timer signals service on stop | Timer never reads sessions; sessions never drive timer |
| Feed items → Sessions | sessionId foreign key | Feed items are display-only copies; mutations always go to `sessions/` |
| Stats view → Sessions | Query by userId + date range | Stats are derived, never stored separately in v1 (aggregate in v1, materialize in future) |
| Presence → Feed | Firestore `presence/{userId}` document | Feed subscribes to presence docs for followed users' live status |
| Gamification (future) → Users | Reads `totalStudyMinutes`, `currentStreak` | No changes to v1 user schema needed for gamification integration |

## Gamification Readiness

The v1 data model accommodates future gamification without structural changes:

| Future Feature | Required v1 Data | Where It Lives |
|----------------|-----------------|----------------|
| Egg hatching (study time threshold) | `users.totalStudyMinutes` | Already on user doc |
| Streak-based eggs | `users.currentStreak` | Already on user doc |
| Leaderboards (weekly/monthly) | `sessions` by `userId + createdAt` | Queryable now; materialize with scheduled function |
| Zoo collection | `users/{uid}/achievements/` | Empty subcollection, add items in milestone 2 |
| Push notifications on milestones | Cloud Function already on session writes | Extend existing trigger |

The `users/{userId}/achievements/` subcollection is defined but never written in v1. The schema is reserved so the gamification milestone is additive-only, no migrations.

## Sources

- [Building a Scalable Follower Feed with Firestore — Code.Build](https://code.build/p/building-a-scalable-follower-feed-with-firestore-wCeklv) (MEDIUM confidence — verified approach)
- [How to Build a Scalable Follower Feed in Firestore — Dev.to (Gamble)](https://dev.to/jdgamble555/how-to-build-a-scalable-follower-feed-in-firestore-25oj) (MEDIUM confidence — innovative chunked-array variant)
- [Build presence in Cloud Firestore — Firebase Official Docs](https://firebase.google.com/docs/firestore/solutions/presence) (HIGH confidence — official)
- [Build Leaderboards with Firestore — Firebase Codelabs](https://firebase.google.com/codelabs/build-leaderboards-with-firestore) (HIGH confidence — official codelab)
- [How to use React Hooks with Firebase Firestore — LogRocket](https://blog.logrocket.com/how-to-use-react-hooks-firebase-firestore/) (MEDIUM confidence — widely cited pattern)
- [Understand real-time queries at scale — Firebase Official Docs](https://firebase.google.com/docs/firestore/enterprise/real-time-queries-at-scale) (HIGH confidence — official)
- [Distributed counters — Firestore Official Docs](https://firebase.google.com/docs/firestore/solutions/counters) (HIGH confidence — official)
- [Firestore Data Model — Firebase Official Docs](https://firebase.google.com/docs/firestore/data-model) (HIGH confidence — official)

---
*Architecture research for: Strava-style study tracking social app (stuuudy)*
*Researched: 2026-03-01*
