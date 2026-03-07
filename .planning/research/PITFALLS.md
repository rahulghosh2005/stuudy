# Pitfalls Research

**Domain:** Real-time social study-tracking app (Strava for students)
**Researched:** 2026-03-06
**Confidence:** MEDIUM (web fetch denied — research based on official docs knowledge through Aug 2025 + established engineering patterns; web verification was attempted but unavailable in this environment)

---

## Critical Pitfalls

### Pitfall 1: Supabase Realtime — No RLS on Broadcast/Presence Channels Leaks Private Data

**What goes wrong:**
Supabase Realtime has three modes: Postgres Changes, Broadcast, and Presence. Postgres Changes subscriptions respect Row Level Security (RLS) — but only if RLS is explicitly enabled on the table AND the subscription filter matches an RLS policy. Developers often test with RLS disabled ("for simplicity") and ship without re-enabling it. The result: any authenticated user who constructs the right channel subscription can receive updates for rows they should never see — including private study sessions, private grades, and private GPA data.

**Why it happens:**
During development, RLS is often disabled to unblock rapid iteration. The Supabase dashboard shows a prominent warning, but in a Next.js app where you're wiring up client-side subscriptions, there's no compile-time enforcement. Broadcast channels have NO RLS at all by default — they're topic-based, not row-based. A user can join any channel name they guess.

**How to avoid:**
- Enable RLS on every table before shipping, with no exceptions. Create explicit policies for INSERT, SELECT, UPDATE, DELETE.
- Never put private user data (grades, GPA, private session notes) into Broadcast channels. Use Postgres Changes subscriptions with tight RLS policies instead.
- For Presence (who is online studying), only broadcast the minimum data: user_id and a public display name. Never include course names or session details in Presence state if those fields can be private.
- Name Broadcast channels with server-generated tokens (not predictable strings like `classroom:${id}`) and enforce server-side membership validation before issuing channel tokens.
- Write an automated test that logs in as User A, subscribes to User B's private channels, and asserts no data arrives.

**Warning signs:**
- RLS disabled in Supabase dashboard on any table containing user data
- Broadcast channel names are predictable IDs (e.g., `session:${uuid}`)
- No automated test exists that verifies cross-user data isolation
- Client-side code constructs realtime channel subscriptions with raw IDs from the URL

**Phase to address:** Phase 1 (Auth + Data Model) — RLS policies must be written before any real-time feature is built

---

### Pitfall 2: Supabase Realtime — Unmanaged Channel Lifecycle Causes Runaway Connection Count

**What goes wrong:**
In React apps, Supabase Realtime channels are created in `useEffect` hooks. If the cleanup function does not call `supabase.removeChannel(channel)`, a new WebSocket channel is created on every component re-render or route change, but the old one is never removed. A user who navigates between pages several times can silently accumulate dozens of open channels. Supabase free tier has a hard limit of 200 concurrent realtime connections per project; even paid tiers have per-project channel limits. When the limit is hit, new subscriptions silently fail or throw non-obvious errors.

**Why it happens:**
React's `useEffect` cleanup is easy to forget or implement incorrectly. Supabase realtime channels are not garbage-collected when the component unmounts — they persist at the SDK/WebSocket level. Developers only discover this in production when users report "the feed stopped updating."

**How to avoid:**
```typescript
useEffect(() => {
  const channel = supabase
    .channel('live-feed')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, handler)
    .subscribe();

  // Critical: always return cleanup
  return () => {
    supabase.removeChannel(channel);
  };
}, []);
```
- Treat every `supabase.channel()` call as a resource that must be explicitly freed.
- In Next.js App Router, place realtime subscriptions in client components with strict `useEffect` cleanup. Never create channels in server components.
- Add a development-mode assertion: log `supabase.getChannels().length` on each page transition and alert if it exceeds 5.
- Use a centralized realtime manager (singleton or Zustand store) rather than per-component subscriptions to make lifecycle management explicit.

**Warning signs:**
- `useEffect` blocks that call `supabase.channel()` without a `return () => supabase.removeChannel(...)` cleanup
- Channel subscriptions inside components that re-render frequently (e.g., timer components that update every second)
- Users reporting "feed stopped updating" after navigating around the app
- Supabase dashboard showing channel count climbing over time

**Phase to address:** Phase 2 (Real-time Timer + Live Feed) — implement the centralized channel manager before wiring up any live features

---

### Pitfall 3: Supabase Realtime Postgres Changes — Not All Events Fire on RLS-Filtered Tables

**What goes wrong:**
When using Supabase Realtime's Postgres Changes feature with RLS enabled, the subscription only receives events for rows that the user's RLS policies allow. This is correct and expected behavior — but it creates a subtle bug: if you rely on receiving a DELETE event to remove an item from the UI, and the DELETE changes the row so it no longer matches the user's policy (e.g., a session becomes private after being public), the DELETE event may never arrive. The UI shows stale data indefinitely.

**Why it happens:**
Developers assume Postgres Changes events fire for every database mutation and only apply RLS filtering as a security layer. The actual behavior is that Supabase evaluates RLS *before* sending the event. If the row doesn't pass the RLS check at the time the event fires, the event is dropped silently.

**How to avoid:**
- Use optimistic updates paired with periodic polling as a safety net for critical UI state (e.g., "who is currently studying").
- For the live activity feed, rely on INSERT events (a new session starts) and UPDATE events (session ends — `ended_at` gets set). Do not rely solely on DELETE events to remove items.
- Implement a client-side TTL: if a "live" session has not received a heartbeat UPDATE in 30 seconds, mark it as stale and remove it from the live feed.
- Test specifically: start a public session, make it private, assert the feed removes it.

**Warning signs:**
- Live feed shows ghost sessions (sessions that ended but still appear as live)
- No heartbeat/keepalive mechanism on active study sessions
- Tests only verify that events arrive, not that stale events are correctly handled

**Phase to address:** Phase 2 (Real-time Timer + Live Feed) — design session state machine before implementation

---

### Pitfall 4: Study Session Timer Integrity — Tab Close / Browser Crash Leaves Sessions Open Forever

**What goes wrong:**
The core product loop is: user starts timer → followers see them studying live → user stops timer → session is logged. If the user closes the browser tab, crashes, or loses connectivity without explicitly stopping the timer, the session never receives an end signal. The database row has `started_at` but no `ended_at`. That user shows as "studying" in the live feed forever. Their analytics are corrupted (a "session" of 47 hours appears in their history).

**Why it happens:**
The `beforeunload` browser event is unreliable for async operations — you cannot make a network request in `beforeunload` with any guarantee it will complete. Developers assume they can POST a "stop session" API call when the tab closes. They cannot. Mobile browsers in particular often kill tabs without firing `beforeunload` at all.

**How to avoid:**
- Implement a **server-side session heartbeat**: the client sends a lightweight PATCH request (or Supabase Realtime Broadcast) every 30 seconds while the timer is running. A server-side cron job (Supabase Edge Function on a schedule, or `pg_cron`) runs every 2–5 minutes and marks any session with a `last_heartbeat_at` older than 2 minutes as `status: 'abandoned'` and sets `ended_at = last_heartbeat_at`.
- This means the maximum session overrun displayed to followers is ~2 minutes, not infinite.
- On app startup, check if the user has an open session with no recent heartbeat and offer to "resume or discard" it.
- Never calculate session duration as `now() - started_at` — always use `ended_at - started_at` or `last_heartbeat_at - started_at` for abandoned sessions.

**Warning signs:**
- Sessions table has rows with `ended_at IS NULL` and `started_at` older than 12 hours
- No `last_heartbeat_at` or equivalent column on the sessions table
- No cleanup job for zombie sessions
- Duration calculation uses `NOW()` on the server for open sessions without a cap

**Phase to address:** Phase 2 (Real-time Timer + Live Feed) — build heartbeat architecture into the initial timer schema, not as a retrofit

---

### Pitfall 5: Feed Fan-Out on Write — Notification / Feed Storms at Scale

**What goes wrong:**
The naive social feed implementation writes a feed event row for every follower whenever a user starts studying. If User A has 500 followers, starting a session triggers 500 INSERT statements. This "fan-out on write" approach is fine at small scale but becomes a bottleneck as follower counts grow: the database write for one session start can take seconds, and if many popular users start sessions simultaneously, the write queue backs up.

**Why it happens:**
Fan-out on write is the simplest mental model: "each follower has their own feed." It works perfectly for the first 100 users and fails silently (just slowing down) until it catastrophically backs up.

**How to avoid:**
For an MVP targeting university cohorts (likely 20–200 active users initially), fan-out on write is acceptable if follower counts are capped (e.g., 500 max followers enforced in schema). Do NOT optimize prematurely — build fan-out on write first.
The critical thing to do NOW is design the schema so migration to fan-out on read is possible:
- Store sessions in a `sessions` table with a `user_id` FK.
- Build the feed view as a query: `SELECT s.* FROM sessions s JOIN follows f ON s.user_id = f.following_id WHERE f.follower_id = $me ORDER BY s.started_at DESC`.
- Add a Postgres index on `follows(follower_id, following_id)` and `sessions(user_id, started_at DESC)` from day one.
- If follower counts remain low (university context), this query-based approach may never need to change.

**Warning signs:**
- Sessions start taking >500ms as follower counts grow
- Feed table has a `follower_id` column (fan-out write pattern) without follower count limits
- No index on `follows` or `sessions` tables
- Feed query doing full table scans (check with `EXPLAIN ANALYZE`)

**Phase to address:** Phase 2 (Real-time Timer + Live Feed) — design schema with correct indexes, validate with `EXPLAIN ANALYZE` before shipping

---

### Pitfall 6: Cold-Start Problem — App Is Useless Without Friends on It

**What goes wrong:**
The core value proposition ("see your friends studying live") requires friends to already be on the platform. A new user who signs up and sees an empty feed immediately churns. This is the classic cold-start problem for social apps. No amount of technical polish fixes an empty feed.

**Why it happens:**
Builders focus on the technical loop (timer → broadcast → feed) and ship without solving the bootstrapping problem. The app works perfectly in their test environment where they control all accounts.

**How to avoid:**
Design the onboarding to **force social connection before showing the empty feed**:
1. After signup, immediately prompt: "Find classmates in your courses" — search by course code (e.g., CS101) even before they have followers.
2. Implement **classroom-first onboarding**: the first thing a user does is either create a classroom or join one via invite link. Classroom members see each other's activity without a follow step.
3. Show **global/campus leaderboard** as fallback content — even without friends, seeing "42 students are studying right now" provides value.
4. Make the invite link the primary growth vector: "Share this classroom link with your study group." Each invite link brings in a pre-formed cohort, not individual users.
5. On the live feed, show the classroom feed (members of user's classrooms) before the follow feed. Classrooms can be populated by invite even if the user has no followers.

**Warning signs:**
- Empty state on the home feed shows "No one is studying" with no CTA
- Onboarding flow skips social connection and goes straight to "start a session"
- No classroom or group concept to bootstrap engagement
- The app only shows value AFTER the user has followers, not immediately

**Phase to address:** Phase 1 (Auth + Onboarding) — cold-start solution must be designed before the first user is onboarded, not added later

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Disable RLS during development | Faster iteration, no policy writing | Privacy leak in production — private grades exposed to any authenticated user | Never — enable RLS from day one, even if the policy is just `auth.uid() = user_id` |
| Calculate timer duration client-side only | Simple React state, no server round-trip | Session duration wrong if tab is backgrounded (JS timer throttling in background tabs) | Never for stored data — always persist `started_at` server-side and compute duration on server |
| Single global Supabase Realtime channel for all live updates | Easy to implement | Channel receives ALL events for ALL users — client filters; wastes bandwidth; leaks presence info | Never for user-specific data — scope channels by classroom or follow relationship |
| Inline Framer Motion `animate` objects defined in render | Fast to write | New object reference on every render → perpetual re-animation → layout thrash | Never — define variants outside component or use `useMemo` |
| No index on `follows` table | Schema simplicity | Feed query becomes O(n) full scan above ~1000 rows | Never — add indexes in the migration that creates the table |
| Skip heartbeat, use `beforeunload` for session end | Simpler architecture | Ghost sessions, corrupted analytics, feed shows users as "studying" forever | Never — `beforeunload` is unreliable; heartbeat is mandatory for session integrity |
| Store GPA/grades unencrypted with no visibility flag | Simpler schema | Privacy incident — wrong RLS policy exposes all students' grades | Never — add `is_public` boolean and RLS from the start |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Supabase Realtime | Subscribing to `{ event: '*', schema: 'public', table: 'sessions' }` with no filter — receives ALL sessions changes | Add a `filter` parameter: `filter: 'user_id=in.(${followedUserIds.join(',')})'` or use per-user channels |
| Supabase Realtime | Creating channel in component body (runs on every render) instead of inside `useEffect` | Always create channels inside `useEffect` with dependency array and cleanup |
| Supabase Auth | Using `supabase.auth.getUser()` client-side as authorization gate in Server Components | In App Router, use `createServerClient` with cookies and call `getUser()` server-side; client-side tokens can be stale |
| Supabase Postgres Changes | Expecting to receive the full row in the event payload for UPDATE | By default, UPDATE events only include the NEW row values that changed. If you need the full row, enable `REPLICA IDENTITY FULL` on the table (performance tradeoff) |
| Next.js App Router | Placing Supabase realtime subscriptions in a Server Component | Realtime subscriptions require a persistent WebSocket — they can only run in Client Components marked `'use client'` |
| Framer Motion | Using `layout` prop on list items that re-render frequently (live feed) | `layout` triggers expensive layout calculations on every animation; use `layoutId` only for shared-element transitions, not bulk list items |
| Framer Motion | Animating `opacity` AND `transform` simultaneously on many elements | GPU-composited properties (opacity, transform) are fine; animating `width`, `height`, or `top/left` triggers layout recalculation — use `scaleX`/`scaleY` instead |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Live timer re-rendering parent components every second | The entire page flickers or re-renders every second; React DevTools shows entire component tree re-rendering | Isolate timer display in a leaf component using `React.memo`; store timer state in a ref, update display via `requestAnimationFrame` | From the first user — this is an immediate issue |
| Fetching the full user profile on every live feed event | Each feed update triggers an additional profile query; N+1 query pattern | Batch profile data with the session query; cache profile data in Zustand and only fetch missing users | Above ~20 concurrent live sessions |
| Realtime channel broadcasting full session objects | Large payloads on every heartbeat; bandwidth costs grow linearly with concurrent users | Broadcast only changed fields: `{ user_id, status: 'active' }`; full session data fetched once on join | Above ~50 concurrent sessions |
| No database connection pooling in Next.js serverless functions | Each API route creates a new Postgres connection; connection pool exhausted under load | Use Supabase's built-in pooler (Transaction mode for serverless); set `?pgbouncer=true` in connection string | Above ~50 concurrent API requests |
| Framer Motion `AnimatePresence` wrapping the entire live feed | All list items animate simultaneously on mount; jank on first load | Wrap individual items, not the list container; stagger with `delay` variant or `staggerChildren` | From the first render with >5 items |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| No RLS on `grades` or `gpa` tables | Any authenticated user can query all students' grades via the Supabase anon key (which is public) | RLS policy: `SELECT WHERE user_id = auth.uid() OR (is_public = true AND EXISTS(follow relationship))` — test with a separate authenticated user |
| Exposing user email addresses in public profile API | Scraping, spam, privacy violation | Never include `email` in public profile queries; only expose `username`, `display_name`, `avatar_url` |
| Classroom invite links with sequential or guessable IDs | Anyone who guesses the ID joins the classroom without being invited | Use `nanoid()` (21-character random URL-safe token) for invite tokens, stored separately from the classroom ID |
| Trusting client-sent session duration | Users can manipulate client-side state to log fake study sessions (e.g., 24-hour sessions) | Never trust client-sent `duration` field; always compute `ended_at - started_at` server-side; add a max session duration constraint (e.g., 12 hours) in the database |
| Supabase Service Role key used client-side | Service role bypasses ALL RLS — any operation is permitted | Service role key must ONLY be in server-side code (API routes, Edge Functions). Use anon key client-side always. |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Showing raw "0h 0m 0s" when the timer starts | Feels mechanical, not motivating | Show "Starting..." for 1–2 seconds, then transition to the running timer with a smooth count-up animation |
| Empty live feed with no context | New users immediately churn | Show global "X students studying right now" count even before user has followers; show classroom members first |
| Notification for every single follower activity | Notification fatigue → users disable all notifications | Batch notifications: "3 people in your CS101 classroom started studying" instead of 3 separate notifications |
| Showing exact GPA on the public profile by default | Students feel exposed; sensitive data | Default GPA to private; require explicit opt-in to share. Show a relative indicator ("above average in cohort") if public |
| Timer continues running after browser goes offline | Session appears live to followers when user is actually disconnected | Detect WebSocket disconnect and show "connection lost" state; automatically pause/abandon session after 5 minutes offline |
| Study session history shows raw seconds | Cognitive overhead to parse "3,647 seconds" | Always display as "1h 0m 47s" or "about 1 hour"; use human-readable durations everywhere |
| Aggressive onboarding permissions requests (notifications on first load) | Users deny, app loses ability to notify forever | Request notification permission only after user has completed first study session (demonstrated value) |

---

## "Looks Done But Isn't" Checklist

- [ ] **Live timer:** Verify the timer survives tab backgrounding — check that the running duration shown to followers comes from `server_time - started_at`, not a client-side `setInterval` (which throttles in background tabs)
- [ ] **Session end:** Verify that closing the browser tab without clicking "Stop" results in the session being marked abandoned within 3 minutes (heartbeat + cron job working)
- [ ] **RLS:** Log in as a second test user and attempt to read another user's private sessions, grades, and GPA via direct Supabase queries — verify 0 rows returned
- [ ] **Channel cleanup:** Navigate between 5 pages rapidly, then check `supabase.getChannels().length` — should return 0 or 1, not grow with each navigation
- [ ] **Classroom invite links:** Verify that sharing an invite link with an unauthenticated user prompts login and then joins the classroom (not 404 or redirect loop)
- [ ] **Framer Motion performance:** Open React DevTools Profiler while the live feed is updating; verify that timer updates do not re-render more than 2 components per second
- [ ] **GPA privacy:** Verify that toggling "private" on GPA immediately removes it from the public profile — not just hidden in UI but not returned by the API
- [ ] **Offline handling:** Disconnect network while a session is running; verify the app shows a degraded state (not a spinner forever)
- [ ] **Feed ordering:** Verify the live feed always shows currently-studying users first, sorted by most-recently-started, not by insertion order
- [ ] **Duplicate sessions:** Verify a user cannot accidentally start two concurrent sessions (database constraint + UI guard)

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| RLS disabled in production, grade data exposed | HIGH | Immediately enable RLS; rotate anon key if data was accessible without auth; audit logs for unauthorized access; notify affected users per privacy policy |
| Ghost sessions (sessions never ended) | MEDIUM | One-time migration: `UPDATE sessions SET ended_at = last_heartbeat_at, status = 'abandoned' WHERE ended_at IS NULL AND last_heartbeat_at < NOW() - INTERVAL '2 hours'` — then deploy heartbeat system |
| Channel leak causing connection limit hit | MEDIUM | Deploy channel cleanup fix; Supabase dashboard allows resetting connections; users need to reload |
| Fan-out on write causing slow session starts | MEDIUM | Add indexes as a zero-downtime migration; switch to query-based feed (fan-out on read) without schema changes if `sessions` + `follows` tables are designed correctly from the start |
| Client-side timer drift (timer shows wrong duration) | LOW | Resync timer to `started_at` server timestamp on each heartbeat response; display server-computed duration |
| Framer Motion layout thrash causing jank | LOW | Remove `layout` prop from list items; audit and replace CSS properties being animated; add `will-change: transform` CSS hint |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| RLS not enabled on grades/sessions tables | Phase 1: Auth + Data Model | Cross-user data isolation test with two accounts passes |
| Channel lifecycle / connection leak | Phase 2: Real-time Timer | `supabase.getChannels().length` stays stable after 10 page navigations |
| Postgres Changes RLS event dropping | Phase 2: Real-time Timer | Session-end test: private session removed from feed within 2 seconds of privacy toggle |
| Session timer integrity (zombie sessions) | Phase 2: Real-time Timer | Tab-close test: session marked abandoned within 3 minutes in DB |
| Broadcast channel with predictable names | Phase 2: Real-time Timer | Security test: guessing channel name from another account receives no events |
| Feed fan-out performance | Phase 2: Real-time Timer | `EXPLAIN ANALYZE` on feed query shows index scan, not seq scan |
| Cold-start empty feed | Phase 1: Auth + Onboarding | New user who completes onboarding sees at least classroom members in feed |
| Client-side timer drift | Phase 2: Real-time Timer | Timer displayed to followers matches server-computed duration within 5 seconds |
| Framer Motion re-render on timer update | Phase 3: UI Polish + Animations | React Profiler shows <2 component re-renders per second during live session |
| Notification spam (no batching) | Phase 4: Notifications | User with 10 active classroom members receives 1 batched notification, not 10 |
| GPA/grades privacy default wrong | Phase 1: Auth + Data Model | New user's GPA is private by default; API returns null to unauthenticated requests |
| Invite link guessable IDs | Phase 1 / Phase 3: Classrooms | Brute-force test: 1000 random nanoid guesses yields 0 valid invites |
| Service role key client-side exposure | Phase 1: Auth + Data Model | `grep -r "service_role" ./src` returns no results |
| Duplicate concurrent sessions | Phase 2: Real-time Timer | Database unique constraint + API guard prevents starting session while one is active |

---

## Sources

**Confidence note:** Web search and WebFetch tools were denied in this research session. Findings below are based on:
- Supabase official documentation (known through Aug 2025 training data) — MEDIUM confidence
- Established engineering patterns for real-time social apps — MEDIUM confidence
- Known Framer Motion performance characteristics (official docs through Aug 2025) — MEDIUM confidence
- React `useEffect` cleanup patterns — HIGH confidence (stable API, multiple official sources)
- Social app cold-start problem research (established literature) — HIGH confidence

**Verification recommended before roadmap is finalized:**
- Supabase Realtime current channel/connection limits: https://supabase.com/docs/guides/realtime/rate-limits
- Supabase RLS with Realtime behavior: https://supabase.com/docs/guides/realtime/postgres-changes
- Supabase Presence documentation: https://supabase.com/docs/guides/realtime/presence
- Framer Motion layout animation performance: https://www.framer.com/motion/layout-animations/
- Next.js App Router + Supabase integration: https://supabase.com/docs/guides/auth/server-side/nextjs

---

*Pitfalls research for: Stuudy — real-time social study-tracking app*
*Researched: 2026-03-06*
