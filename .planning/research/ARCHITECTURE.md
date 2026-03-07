# Architecture Research

**Domain:** Real-time social study-tracking web app (Strava for studying)
**Researched:** 2026-03-06
**Confidence:** MEDIUM — Based on training knowledge of Supabase, real-time presence patterns, and social graph architectures. WebSearch/WebFetch unavailable during this session; Supabase Realtime specifics should be verified against current docs before implementation.

---

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         BROWSER (Next.js App Router)                │
│                                                                      │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌─────────────┐   │
│  │  Feed Page │  │ Timer Page │  │ Classroom  │  │  Analytics  │   │
│  │  (RSC+CSR) │  │   (CSR)    │  │   Page     │  │    Page     │   │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘  └──────┬──────┘  │
│        │               │               │                 │          │
│  ┌─────▼───────────────▼───────────────▼─────────────────▼──────┐  │
│  │               Supabase JS Client (Browser)                    │  │
│  │         Auth | DB Queries | Realtime Subscriptions            │  │
│  └──────────────────────────────┬────────────────────────────────┘  │
└─────────────────────────────────┼───────────────────────────────────┘
                                  │ WebSocket + HTTPS
┌─────────────────────────────────▼───────────────────────────────────┐
│                          SUPABASE PLATFORM                          │
│                                                                      │
│  ┌───────────────┐  ┌──────────────────┐  ┌──────────────────────┐ │
│  │  Auth Service │  │  Realtime Server │  │    PostgREST API     │ │
│  │  (GoTrue)     │  │  (Elixir/Phoenix) │  │  (auto REST from DB) │ │
│  └───────┬───────┘  └────────┬─────────┘  └──────────┬───────────┘ │
│          │                   │                        │             │
│  ┌───────▼───────────────────▼────────────────────────▼───────────┐ │
│  │                      PostgreSQL Database                        │ │
│  │  users | sessions | follows | classrooms | membership | grades  │ │
│  └─────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                  │
┌─────────────────────────────────▼───────────────────────────────────┐
│                     NEXT.JS SERVER (API Routes / Server Actions)     │
│                                                                      │
│  ┌─────────────────┐  ┌──────────────────┐  ┌──────────────────┐   │
│  │  Session Logic  │  │  Feed Generation │  │  Analytics Jobs  │   │
│  │  (start/stop)   │  │  (fanout queries)│  │  (streak calc)   │   │
│  └─────────────────┘  └──────────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Next.js App Router | Routing, SSR for feed/profile pages, Server Actions for mutations | Next.js 14+ with `app/` directory |
| Supabase Auth | User registration, login (email + Google OAuth), session management | GoTrue; `supabase.auth.*` client methods |
| Supabase Realtime — Presence | Broadcast "who is online studying right now" to a channel | Phoenix Presence pattern over WebSocket |
| Supabase Realtime — Broadcast | Push session start/stop events to subscribers without DB round-trip | Ephemeral messages; no DB write required |
| Supabase Realtime — DB Changes | Listen for `INSERT`/`UPDATE` on `sessions` table; triggers follower feed refresh | Postgres logical replication → Realtime pipe |
| PostgREST (Supabase auto API) | CRUD on all tables via generated REST API; Row Level Security enforces privacy | Automatic from schema; controlled by RLS policies |
| PostgreSQL | Primary data store: users, sessions, follows, classrooms, grades | Supabase-managed Postgres |
| Next.js Server Actions / Route Handlers | Business logic: session validation, feed pagination, streak computation | Edge-compatible functions |
| Analytics aggregation | Compute streaks, heatmaps, weekly totals from sessions table | SQL window functions or periodic server-side jobs |

---

## Recommended Project Structure

```
stuudy/
├── app/                          # Next.js App Router pages
│   ├── (auth)/                   # Auth group: login, signup, onboarding
│   │   ├── login/
│   │   └── signup/
│   ├── (app)/                    # Authenticated app shell
│   │   ├── layout.tsx            # Persistent sidebar/nav + realtime init
│   │   ├── feed/                 # Live activity feed
│   │   ├── session/              # Active timer page
│   │   ├── profile/[username]/   # Public/private profile view
│   │   ├── classroom/[id]/       # Classroom room view
│   │   └── analytics/            # Personal stats dashboard
│   └── api/                      # Route Handlers for non-Supabase logic
│       ├── session/              # start-session, end-session endpoints
│       └── classroom/            # create, join via invite-link
│
├── components/
│   ├── timer/                    # LiveTimer, TimerControls, TimerCard
│   ├── feed/                     # ActivityFeed, SessionCard, LiveBadge
│   ├── classroom/                # ClassroomRoom, MemberList, InviteLink
│   ├── analytics/                # StreakRing, HeatmapGrid, CourseBreakdown
│   └── ui/                       # shadcn/ui base components (customized)
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Browser Supabase client (singleton)
│   │   ├── server.ts             # Server Supabase client (cookies-based)
│   │   └── middleware.ts         # Auth session refresh middleware
│   ├── realtime/
│   │   ├── presence.ts           # Presence channel helpers
│   │   └── feed-channel.ts       # Feed subscription hooks
│   ├── session/
│   │   ├── actions.ts            # Server Actions: startSession, endSession
│   │   └── queries.ts            # DB queries for session history
│   ├── social/
│   │   ├── follows.ts            # follow/unfollow mutations + queries
│   │   └── feed.ts               # Feed generation queries
│   ├── classroom/
│   │   ├── actions.ts            # create, join, leave
│   │   └── queries.ts
│   └── analytics/
│       └── compute.ts            # Streak logic, heatmap data transforms
│
├── hooks/                        # Client-side React hooks
│   ├── usePresence.ts            # Subscribes to presence channel
│   ├── useLiveFeed.ts            # Listens to realtime feed events
│   ├── useTimer.ts               # Local timer state + sync with server
│   └── useClassroom.ts           # Classroom realtime subscription
│
└── supabase/
    ├── migrations/               # Database migrations (schema changes)
    └── seed.ts                   # Development seed data
```

### Structure Rationale

- **`(app)/layout.tsx`:** Single place to initialize Supabase Realtime subscriptions for the whole authenticated session — avoids duplicate channel registrations.
- **`lib/supabase/client.ts` vs `server.ts`:** Supabase requires two separate client instances — a browser client (uses `localStorage` for auth tokens) and a server client (uses cookies via `next/headers`). Mixing them causes auth bugs.
- **`lib/realtime/`:** Isolating presence and broadcast logic here prevents hooks from embedding channel setup, which makes testing and reuse easier.
- **`hooks/`:** Thin wrappers around lib functions. Keep business logic in `lib/`, keep UI state management in `hooks/`.
- **`supabase/migrations/`:** Source-controlled schema changes. Never hand-edit production DB without a migration.

---

## Architectural Patterns

### Pattern 1: Supabase Presence for Live Study Status

**What:** Supabase Realtime Presence uses Phoenix Presence under the hood — a CRDT-based gossip protocol that tracks which clients are connected to a channel and what metadata they carry. Each client joins a named channel and broadcasts its `state` (e.g., `{ user_id, course, started_at }`). All members of the channel receive `presence_sync`, `presence_join`, and `presence_leave` events.

**When to use:** For broadcasting "who is studying right now" to followers. This is the core live-timer broadcast mechanism. It does not require a DB write per presence update — state is held in Realtime Server memory and synced over WebSocket.

**Trade-offs:**
- PRO: Sub-second latency, no DB polling, built into Supabase
- PRO: Presence state automatically clears if client disconnects (tab close, network drop)
- CON: Presence state is ephemeral — lost on server restart (fine for live status, not for history)
- CON: All users on the channel receive all presence states — for follower-scoped feeds, you need per-user channels or client-side filtering

**Architecture decision:** Use a global `study:live` presence channel but filter on the client by checking if the `user_id` is in the current user's `following` set. This is simpler than per-user channels for an MVP with <10K users.

**Example:**
```typescript
// hooks/usePresence.ts
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type StudyPresence = {
  user_id: string
  username: string
  course: string
  started_at: string
}

export function usePresence(followingIds: string[]) {
  const supabase = createClient()
  const [liveStudiers, setLiveStudiers] = useState<StudyPresence[]>([])

  useEffect(() => {
    const channel = supabase.channel('study:live', {
      config: { presence: { key: 'user_id' } }
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<StudyPresence>()
        const relevant = Object.values(state)
          .flat()
          .filter(p => followingIds.includes(p.user_id))
        setLiveStudiers(relevant)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [followingIds])

  return liveStudiers
}
```

---

### Pattern 2: Timer State Machine (Client-Owned, Server-Anchored)

**What:** The timer runs client-side (using `Date.now()` delta from `started_at`) for smooth UI. The server records only `start_session` and `end_session` events — not tick-by-tick updates. On page reload/reconnect, the client re-derives elapsed time from the server-stored `started_at` timestamp.

**When to use:** Always. Never poll the server for elapsed time — it's computable from a single stored timestamp.

**Trade-offs:**
- PRO: No unnecessary server load, zero polling, perfectly smooth UI
- PRO: Crash-safe — if the user closes the tab, the session's `started_at` is already in the DB; background job or next-login cleanup can close orphaned sessions
- CON: Requires orphaned session cleanup logic (sessions with no `ended_at` older than 24h)

**States:**
```
idle → active (startSession called, DB INSERT) → paused (optional) → completed (endSession called, DB UPDATE sets ended_at + duration)
```

**Example:**
```typescript
// lib/session/actions.ts
'use server'
import { createClient } from '@/lib/supabase/server'

export async function startSession(courseId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Prevent double-start: close any orphaned open session first
  await supabase
    .from('sessions')
    .update({ ended_at: new Date().toISOString() })
    .eq('user_id', user!.id)
    .is('ended_at', null)

  const { data } = await supabase
    .from('sessions')
    .insert({ user_id: user!.id, course_id: courseId, started_at: new Date().toISOString() })
    .select('id, started_at')
    .single()

  return data
}

export async function endSession(sessionId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const now = new Date()

  const { data: session } = await supabase
    .from('sessions')
    .select('started_at')
    .eq('id', sessionId)
    .eq('user_id', user!.id)
    .single()

  const duration = Math.floor(
    (now.getTime() - new Date(session!.started_at).getTime()) / 1000
  )

  await supabase
    .from('sessions')
    .update({ ended_at: now.toISOString(), duration_seconds: duration })
    .eq('id', sessionId)

  return { duration }
}
```

---

### Pattern 3: Social Graph via Follows Table (Pull-Based Feed)

**What:** A simple adjacency table `follows (follower_id, followee_id)` represents the directed graph. The activity feed is generated at query time by joining sessions WHERE `user_id IN (SELECT followee_id FROM follows WHERE follower_id = $me)`. No pre-computed fanout needed at this scale.

**When to use:** Pull-based (fan-out-on-read) is correct for <50K followers. Push-based (fan-out-on-write, maintaining per-user feed tables) is only needed at Twitter/Strava scale.

**Trade-offs:**
- PRO: Simple, no background workers needed, data is always fresh
- PRO: Adding/removing a follow instantly changes the feed without any cache invalidation
- CON: Feed query joins follows table + sessions — can get slow at >1M sessions without proper indexing
- CON: Does not support "infinite scroll" without careful cursor-based pagination

**Critical indexes:**
```sql
-- Follow graph traversal
CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_followee ON follows(followee_id);

-- Feed generation: find sessions by a set of users, sorted by recency
CREATE INDEX idx_sessions_user_started ON sessions(user_id, started_at DESC);

-- Live feed: only open sessions
CREATE INDEX idx_sessions_open ON sessions(user_id) WHERE ended_at IS NULL;
```

---

### Pattern 4: Classroom Rooms as Named Realtime Channels

**What:** Each classroom is a Supabase Realtime channel named `classroom:{classroom_id}`. Members who join the classroom subscribe to this channel and receive presence (who's studying now) and DB change events (new sessions by members).

**When to use:** For the classroom feature — group accountability rooms.

**Trade-offs:**
- PRO: Clean isolation — one channel per room, membership-gated by RLS
- PRO: Members see each other in real time without the global presence channel noise
- CON: If a user is in multiple classrooms, they open multiple channels (manageable for <10 classrooms per user)

**Invite link pattern:** Generate a short token (`classroom.invite_token = nanoid(10)`) stored in the `classrooms` table. The join URL is `/classroom/join?token=XYZ`. Server Action validates token, inserts into `classroom_members`. Token can be one-use or multi-use (configurable).

---

### Pattern 5: Analytics from Sessions Table (No Separate Pipeline Needed at MVP Scale)

**What:** All analytics (streaks, heatmaps, course breakdowns) are derived from the `sessions` table via SQL aggregations computed at request time. No ETL pipeline or separate analytics store.

**When to use:** Until sessions table exceeds ~500K rows or analytics pages feel slow. SQL window functions handle streak calculations efficiently.

**Trade-offs:**
- PRO: Zero extra infrastructure, no data sync lag
- PRO: Analytics are always consistent with actual data
- CON: Complex queries (e.g., "consecutive days with >30 min study") require careful SQL
- CON: At >1M sessions, some aggregations may need materialized views

**Streak calculation approach (pure SQL):**
```sql
-- Compute current study streak for a user
WITH daily AS (
  SELECT DATE(started_at AT TIME ZONE 'UTC') AS study_date
  FROM sessions
  WHERE user_id = $1 AND ended_at IS NOT NULL
  GROUP BY 1
),
gaps AS (
  SELECT study_date,
         study_date - LAG(study_date) OVER (ORDER BY study_date) AS gap
  FROM daily
),
streak_groups AS (
  SELECT study_date,
         SUM(CASE WHEN gap > 1 OR gap IS NULL THEN 1 ELSE 0 END)
           OVER (ORDER BY study_date) AS grp
  FROM gaps
)
SELECT COUNT(*) AS streak_days
FROM streak_groups
WHERE grp = (SELECT grp FROM streak_groups ORDER BY study_date DESC LIMIT 1);
```

---

## Database Schema Sketch

### Key Tables

```sql
-- Core identity
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT UNIQUE NOT NULL,
  username    TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url  TEXT,
  bio         TEXT,
  is_public   BOOLEAN DEFAULT true,   -- public profile vs private
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Courses (user-defined, personal to each user)
CREATE TABLE courses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,          -- e.g. "CS 101", "Linear Algebra"
  color       TEXT,                   -- hex color for UI
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Study sessions (the core event log)
CREATE TABLE sessions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES users(id) ON DELETE CASCADE,
  course_id        UUID REFERENCES courses(id) ON DELETE SET NULL,
  started_at       TIMESTAMPTZ NOT NULL,
  ended_at         TIMESTAMPTZ,                    -- NULL = session in progress
  duration_seconds INTEGER,                        -- populated on end
  note             TEXT,                           -- optional session note
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
-- Indexes: see Pattern 3 above

-- Directed follow graph
CREATE TABLE follows (
  follower_id  UUID REFERENCES users(id) ON DELETE CASCADE,
  followee_id  UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (follower_id, followee_id)
);

-- Group classrooms
CREATE TABLE classrooms (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  owner_id      UUID REFERENCES users(id) ON DELETE CASCADE,
  invite_token  TEXT UNIQUE NOT NULL DEFAULT nanoid(10),
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Classroom membership (many-to-many)
CREATE TABLE classroom_members (
  classroom_id  UUID REFERENCES classrooms(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  joined_at     TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (classroom_id, user_id)
);

-- Grades/GPA (sensitive — privacy controlled by RLS)
CREATE TABLE grades (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
  course_id    UUID REFERENCES courses(id) ON DELETE CASCADE,
  grade        TEXT,                  -- e.g. "A", "B+", "89%"
  gpa          NUMERIC(3,2),          -- e.g. 3.75
  is_public    BOOLEAN DEFAULT false, -- default PRIVATE
  term         TEXT,                  -- e.g. "Fall 2025"
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
```

### Row Level Security (RLS) — Privacy Model

RLS policies enforce the privacy model at the database level — not just in application code.

```sql
-- Sessions: visible to owner + followers + classroom members (if in shared classroom)
CREATE POLICY sessions_select ON sessions FOR SELECT USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM follows WHERE follower_id = auth.uid() AND followee_id = sessions.user_id)
  OR EXISTS (
    SELECT 1 FROM classroom_members cm1
    JOIN classroom_members cm2 ON cm1.classroom_id = cm2.classroom_id
    WHERE cm1.user_id = auth.uid() AND cm2.user_id = sessions.user_id
  )
);

-- Grades: visible to owner only unless is_public = true
CREATE POLICY grades_select ON grades FOR SELECT USING (
  user_id = auth.uid()
  OR is_public = true
);

-- Grades insert/update/delete: owner only
CREATE POLICY grades_write ON grades FOR ALL USING (user_id = auth.uid());
```

**Confidence note (MEDIUM):** RLS policy complexity grows with the permission model. The `sessions` policy above joins three tables — verify performance at scale with EXPLAIN ANALYZE. Consider denormalizing a `session_visibility` view if policies become slow.

---

## Data Flow

### Flow 1: Starting a Study Session (Core Viral Loop)

```
User taps "Start Studying" → selects course
    ↓
Client calls Server Action: startSession(courseId)
    ↓
Server Action: INSERT into sessions (started_at = NOW(), no ended_at)
    ↓
Server Action returns { id, started_at } to client
    ↓
Client: joins Supabase Presence channel 'study:live'
        broadcasts presence state: { user_id, username, course, started_at }
    ↓
All subscribers to 'study:live' receive presence_join event
    ↓
Followers' feed pages update liveStudiers state (< 1s latency)
    ↓
Local timer UI starts ticking from started_at
```

### Flow 2: Activity Feed (Historical + Live)

```
User opens /feed
    ↓
Server Component (SSR): fetches recent sessions from follows graph
  SELECT s.*, u.username, u.avatar_url, c.name as course_name
  FROM sessions s
  JOIN users u ON s.user_id = u.id
  LEFT JOIN courses c ON s.course_id = c.id
  WHERE s.user_id IN (
    SELECT followee_id FROM follows WHERE follower_id = $me
  )
  ORDER BY s.started_at DESC
  LIMIT 20
    ↓
Page renders with static history (SSR = fast initial paint)
    ↓
Client component mounts: subscribes to presence channel
        overlays live "studying now" indicators on feed cards
    ↓
When new session starts for a followed user:
  → Presence event fires → feed shows "LIVE" badge instantly
  → DB change event (optional): Realtime DB subscription on sessions
         INSERT fires → feed adds new card without refresh
```

### Flow 3: Classroom Shared View

```
User opens /classroom/[id]
    ↓
Server checks classroom_members: is user a member? (RLS enforced)
    ↓
Server Component: fetch all members + their recent sessions (last 7 days)
    ↓
Client: subscribe to channel 'classroom:{id}'
    ↓
Each member's browser joins this channel via presence
    ↓
All members see who is studying right now within the classroom
    ↓
When any member starts/ends session:
  → DB change listener fires → classroom session list updates
```

### Flow 4: Analytics Computation

```
User opens /analytics
    ↓
Server Action: runs SQL aggregations (window functions) on sessions
  - Streak: consecutive-day calculation (see Pattern 5 above)
  - Heatmap: GROUP BY DATE + course_id, SUM(duration_seconds)
  - Course breakdown: GROUP BY course_id, SUM/AVG duration per week
    ↓
Returns aggregated data (not raw sessions)
    ↓
Client renders charts (Recharts or similar) from aggregated data
    ↓
No real-time subscription needed — analytics are point-in-time snapshots
```

---

## Suggested Build Order

This is the dependency graph — each phase unlocks the next.

```
Phase 1: Foundation (unblocks everything)
  ├── Supabase project setup (auth, DB schema, migrations)
  ├── Next.js App Router shell (auth routes, protected layout)
  ├── User auth (email + Google OAuth via Supabase)
  └── User profile (create, edit, view)

Phase 2: Core Session Loop (the product's reason to exist)
  ├── Courses CRUD (needed before sessions can reference a course)
  ├── Session start/end (Server Actions + sessions table)
  ├── Session history page (personal stats, sorted list)
  └── Orphaned session cleanup (sessions with no ended_at > 24h)

Phase 3: Real-Time Presence (the viral/social hook)
  ├── Supabase Realtime channel setup in app layout
  ├── Presence broadcast on session start/end
  ├── Live feed page (presence-filtered by following list)
  └── "LIVE" indicators on session cards

Phase 4: Social Graph (follow system + historical feed)
  ├── Follow/unfollow (follows table + RLS)
  ├── User search / discovery (find friends to follow)
  ├── Activity feed with history (SSR + Realtime overlay)
  └── Public profile page (session history + stats)

Phase 5: Classrooms (group accountability)
  ├── Create classroom + invite token generation
  ├── Join via invite link (validate token, insert member)
  ├── Classroom realtime channel (per-room presence)
  └── Classroom member session view

Phase 6: Grades & Privacy
  ├── Grades/GPA data model + forms
  ├── Public/private toggle per grade entry
  ├── Grades visible on public profile (when public=true)
  └── RLS verification for grades policies

Phase 7: Analytics
  ├── Streak computation (SQL window function)
  ├── Heatmap (calendar-style, intensity = study minutes)
  ├── Course breakdown (pie/bar chart per course)
  └── Weekly/monthly summary (totals, trends)

Phase 8: Polish (design system, animations, mobile)
  ├── shadcn/ui customization to Notion-like design
  ├── Framer Motion transitions on key interactions
  ├── Dynamic gradient backgrounds (time-of-day + study state)
  └── Mobile-responsive layout pass
```

**Why this order:**

- Phases 1-2 must come first because auth and sessions are dependencies for every other feature. You cannot build presence without sessions, and you cannot build feeds without the follow graph.
- Phase 3 (presence) comes before Phase 4 (social graph) because presence is the core value proposition — it should be testable as early as possible, even before the full follower system works (two logged-in test accounts can validate it).
- Phase 5 (classrooms) depends on Phase 4 (follows) because classrooms and follows use the same "who can see what" RLS logic — classrooms is an extension of the social graph.
- Phase 6 (grades) is deliberately late — it's sensitive data with complex privacy logic, and it is not core to the viral loop. It should be validated as a feature after the core study loop is shipped.
- Phase 7 (analytics) requires sessions data to be meaningful — you need real data to test streak calculations. Running analytics development against seed data risks incorrect streak edge-case logic.
- Phase 8 (polish) last — do not invest in animation polish while data models are still changing.

---

## Anti-Patterns

### Anti-Pattern 1: Polling for Live Status

**What people do:** `setInterval(() => fetchActiveUsers(), 2000)` — polling an API endpoint every 2 seconds to check who is studying.

**Why it's wrong:** Creates N×(poll_interval) DB queries per active user. At 100 concurrent users each polling every 2s = 50 queries/second just for live status. Latency is up to 2s behind actual state. Defeats the "feels instant and real" requirement.

**Do this instead:** Supabase Realtime Presence. Event-driven — no polling, sub-second latency, zero wasted queries when nothing changes.

---

### Anti-Pattern 2: Client-Owned Timer as Ground Truth

**What people do:** Store elapsed time in React state only. On session end, send `duration: elapsedMs` from the client to the server.

**Why it's wrong:** The client can be manipulated. A student can send `duration: 7200` (2 hours) when they only studied for 10 minutes. Also, if the tab crashes mid-session, the duration is lost.

**Do this instead:** Server owns `started_at`. Duration = `ended_at - started_at`, computed server-side. Client derives display-only elapsed time from `started_at`. Client cannot lie about when the session started.

---

### Anti-Pattern 3: No RLS — Relying on Application-Layer Privacy

**What people do:** Skip RLS policies, check `is_public` in application code before returning data.

**Why it's wrong:** One missed check in an API route, a new route added without the check, or a direct Supabase client query from the browser will expose private grades/sessions. At minimum, grades leaking is a trust-destroying bug.

**Do this instead:** RLS as the enforcement layer. Application code is the UX layer. RLS is the security layer. Both should exist.

---

### Anti-Pattern 4: Fan-Out-on-Write for Feed at MVP Scale

**What people do:** On session start, immediately INSERT a "feed event" row for every follower (100 followers = 100 writes per session start).

**Why it's wrong:** Over-engineering for MVP. At <10K users with <500 followers each, pull-based feed queries (fan-out-on-read) are fast with proper indexes. Fan-out-on-write adds complexity, eventual consistency bugs, and write amplification.

**Do this instead:** Pull-based feed (see Pattern 3). Only migrate to fan-out-on-write if analytics show feed queries >500ms at scale.

---

### Anti-Pattern 5: Global Presence Channel Without Filtering

**What people do:** Subscribe all users to `study:live` and render every presence entry without filtering to the following list.

**Why it's wrong:** A user with 50 followers sees all 10,000 active users on the platform — overwhelming, irrelevant, and privacy-violating if some accounts are set to private.

**Do this instead:** Subscribe to `study:live` but filter client-side using the user's `followingIds` set (fetched at page load). For private accounts, add a server-side gate: only emit presence for users who have opted into public presence.

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1K users | Current architecture works. Single Supabase project, pull-based feed, global presence channel. No caching needed. |
| 1K-10K users | Add indexes if not already present. Cache follower ID lists in memory or Redis (TTL 60s) to avoid repeated follow-graph queries per request. Consider paginating presence channel (per-follow-group channels instead of one global). |
| 10K-100K users | Feed queries will strain at depth — add cursor-based pagination with covering indexes. Consider materialized view for "who I follow" updated on follow/unfollow. Presence channel may need sharding (per-university or per-cohort channels). Analytics aggregations may need nightly materialized views. |
| 100K+ users | Fan-out-on-write becomes worth the complexity. Dedicated analytics service (read replica + time-series). Session event log replicated to columnar store (e.g., Clickhouse) for heatmap queries. Supabase may need migration to self-hosted or alternative real-time broker. |

### Scaling Priorities for This App

1. **First bottleneck: Feed query** — `sessions JOIN follows` without proper indexes. Fix: composite index on `(user_id, started_at DESC)`.
2. **Second bottleneck: Presence channel at global scale** — Too many presence updates for a single channel. Fix: shard by follow-network clusters or move to per-user channels.
3. **Third bottleneck: Streak/analytics SQL** — Complex window functions on large sessions tables. Fix: nightly materialized aggregate views.

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Supabase Auth (GoTrue) | `@supabase/ssr` package; server client via `next/headers` cookies; browser client via localStorage | Two separate client instances required — see structure rationale |
| Supabase Realtime | `supabase.channel()` API; Presence for live status; DB Changes for feed events | WebSocket connection opened once in app layout, not per-page |
| Supabase PostgREST | Direct client queries (`supabase.from('table').select()`) or Server Actions | Prefer Server Actions for mutations; client queries for SSR fetches |
| Google OAuth | Configured in Supabase Auth dashboard; `supabase.auth.signInWithOAuth({ provider: 'google' })` | Callback URL must be whitelisted in Google Console |
| Vercel (deployment) | Standard Next.js deployment; environment variables for Supabase URL + anon key + service role key | Service role key ONLY on server — never expose to browser |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Client components ↔ Server Actions | Direct import + call (Next.js Server Actions) | Server Actions run on server, return serializable data |
| Client components ↔ Supabase Realtime | `supabase.channel()` WebSocket subscription | Initialize once in layout, pass channel reference via context or props |
| Server Actions ↔ Supabase DB | `createClient()` from `@/lib/supabase/server` | Uses cookie-based session; has user context for RLS |
| Analytics ↔ sessions table | SQL aggregation queries via Server Actions | Never run heavy aggregation queries client-side |
| Classroom join ↔ Follow graph | Independent tables; classroom membership does NOT auto-follow | Keep them decoupled — being in a classroom doesn't mean you follow the member |

---

## Sources

- Supabase Realtime documentation (presence, broadcast, DB changes): https://supabase.com/docs/guides/realtime — MEDIUM confidence; verified against training knowledge of Phoenix Presence pattern, but current Supabase API surface should be verified against live docs before implementation.
- Supabase Auth + Next.js SSR guide (`@supabase/ssr`): https://supabase.com/docs/guides/auth/server-side/nextjs — MEDIUM confidence; two-client pattern (browser vs server) is well-established.
- PostgreSQL Row Level Security: https://www.postgresql.org/docs/current/ddl-rowsecurity.html — HIGH confidence; stable PostgreSQL feature.
- Fan-out-on-read vs fan-out-on-write (social feed architecture): Industry standard pattern documented at Instagram/Twitter engineering blogs — MEDIUM confidence (multiple sources agree); specific thresholds are approximations.
- Phoenix Presence (underlying Supabase Presence mechanism): https://hexdocs.pm/phoenix/Phoenix.Presence.html — HIGH confidence; Supabase Realtime server is Elixir/Phoenix-based.
- SQL window functions for streak calculation: Standard SQL, HIGH confidence.
- Next.js App Router + Server Actions: https://nextjs.org/docs/app — HIGH confidence; stable API.

---

*Architecture research for: Stuudy — real-time social study-tracking web app*
*Researched: 2026-03-06*
