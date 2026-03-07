# Project Research Summary

**Project:** Stuudy — Social Real-Time Study Tracking App (Strava for Students)
**Domain:** Real-time social study tracking web app
**Researched:** 2026-03-06
**Confidence:** MEDIUM (all research based on training data through Aug 2025; WebSearch/WebFetch unavailable during research sessions)

## Executive Summary

Stuudy sits at the intersection of two well-understood product categories — social activity tracking (Strava) and study accountability tools (Forest, Focusmate, StudyStream) — but occupies a genuine gap: no existing product combines a per-user follow graph, real-time live timer broadcasting, and cohort-based classrooms in a single web app. The research-backed approach is to build this as a Next.js 15 + Supabase stack deployed on Vercel, treating Supabase as a unified BaaS that handles auth, Postgres, and WebSocket-based real-time without requiring separate infrastructure services. The social proof loop — "see your friend studying right now, feel motivated to start yourself" — is the entire product bet, and every architecture decision should be evaluated against whether it makes that loop faster and more reliable.

The recommended architecture is deliberately simple for v1: a pull-based social feed (fan-out-on-read via a `sessions JOIN follows` query), Supabase Realtime Presence for the live "who is studying now" layer, server-anchored timer state (only `started_at` persisted, duration computed on session end), and per-classroom Realtime channels for group accountability. This architecture handles 0–10K concurrent users without modification and has clear documented migration paths (indexed views, fan-out-on-write, Pusher as a Broadcast replacement) if scale demands it. The single biggest non-obvious risk is connection management: Supabase Realtime channels must be explicitly cleaned up in React `useEffect` teardowns, and the app needs a session heartbeat mechanism to handle tab-close and browser-crash scenarios before launch.

The most critical product risk is not technical — it is the cold-start problem. A new user who joins and sees an empty feed churns immediately. The solution is classroom-first onboarding: every new user's first action should be joining or creating a classroom via invite link, so their feed is populated by cohort members before they have any followers. This onboarding design must be built into Phase 1, not retrofitted after the core loop ships.

---

## Key Findings

### Recommended Stack

The stack converges cleanly around Next.js 15 (App Router) + Supabase + TypeScript as the unambiguous core. Supabase is the right BaaS choice because it handles auth (email + Google OAuth), Postgres, Row Level Security, and WebSocket-based Realtime in a single service — avoiding the operational burden of running separate auth, database, and real-time services. Zustand handles client-side timer and presence state; TanStack Query v5 manages server state and feed data with stale-while-revalidate semantics. shadcn/ui provides accessible, copy-paste UI components that live in the repo (not a locked-in dependency), and Framer Motion 11 delivers the spring-physics animation quality the product's UX demands.

**Core technologies:**
- **Next.js 15 (App Router):** Full-stack framework — RSC + Server Actions for mutations; SSR for feed/profile initial paint; Vercel zero-config deployment
- **Supabase (Auth + Postgres + Realtime):** Single BaaS covering auth (GoTrue), database (Postgres with RLS), and WebSocket real-time (Broadcast + Presence + Postgres Changes) — eliminate three separate services
- **TypeScript 5.x:** Non-negotiable for a real-time app; type errors in subscription payloads are runtime-silent without it
- **Supabase Realtime — Presence:** Live "who is studying now" channel; CRDT-based Phoenix Presence under the hood; sub-second latency; automatically clears on disconnect
- **Supabase Realtime — Broadcast:** Timer start/stop/pause events to followers; ephemeral, fast, no DB write required
- **Zustand 4.x:** Client-side timer state and presence state — minimal, no-boilerplate store that real-time channels can write into
- **TanStack Query v5:** Feed data, session history, profiles — stale-while-revalidate handles social feeds well; superior cache invalidation over SWR
- **shadcn/ui + Framer Motion 11:** Component system (not a locked dependency) + Apple-quality spring animations

**Critical version / package notes:**
- Use `@supabase/ssr` (not deprecated `@supabase/auth-helpers-nextjs`) for App Router server-side auth
- Next.js 15 requires React 19 — verify peer dependency tree before bootstrapping
- Tailwind CSS 4 is beta — use Tailwind 3.x for production
- Never use Socket.io (stateful WebSocket server incompatible with Vercel serverless deployment)

See `/Users/rahulghosh/stuudy/.planning/research/STACK.md` for full stack analysis, alternatives considered, and installation commands.

---

### Expected Features

The research identifies a clear set of must-have features for the social study loop to function, a second tier of differentiators that create the competitive moat, and a set of anti-features to explicitly avoid.

**Must have for v1 (table stakes — app is not viable without these):**
- User accounts (email + Google OAuth) with public profile — identity primitive for all social features
- Live study timer with course tags (start/pause/stop) — the session creation event
- Real-time broadcast to followers: course name + elapsed time — THE viral mechanic; must be <2s latency
- Follow/unfollow users — required for a personalized feed, not a public dashboard
- Activity feed (live "studying now" + recent sessions) — the social proof loop surface
- Classrooms (create, invite via link, view member sessions) — group accountability; primary growth vector; cold-start solution
- Session history with basic stats (total hours, streak, per-course breakdown) — timer has no value without memory
- Study streaks — low effort, high motivational retention signal
- Privacy toggle (public / followers-only / private) per session — students will not join without control over their data

**Should have — add after v1 loop is validated (v1.x):**
- Kudos/reactions on sessions — engagement layer once feed is active
- Classroom leaderboard (weekly hours) — add when classrooms have 5+ active members
- Course heatmap visualization — needs 2+ weeks of real data to feel meaningful
- Push notifications ("X is now studying") — critical for retention but complex; validate core loop first
- Grade/GPA sharing in classrooms — sensitive; add after classroom trust is established
- Profile analytics page (weekly/monthly summary)

**Defer to v2+:**
- Native mobile app — responsive web is sufficient for v1
- Video/voice study rooms — entirely different infrastructure (WebRTC); fundamentally different product
- AI study insights — requires 3+ months of per-user data and an ML pipeline
- Public classroom discovery — creates moderation surface area; defer until community is healthy
- Calendar integrations — complexity not worth it until core tracking is adopted

**Anti-features — explicitly do not build:**
- In-session chat — attracts off-topic conversation, creates moderation burden, kills the ambient focus feel that is the product's core UX
- Points/XP/badges gamification — hollow extrinsic rewards; students game the timer; use streaks + classroom leaderboards instead
- Global "study rank" — absolute ranking across all users creates toxic dynamics; classroom-scoped leaderboards only
- Direct messages — moderation burden, harassment vector, out-of-scope infrastructure
- Pomodoro / interval timer modes — artificially fragments sessions; single continuous timer per session

See `/Users/rahulghosh/stuudy/.planning/research/FEATURES.md` for full competitor analysis, prioritization matrix, and social/viral loop design.

---

### Architecture Approach

The recommended architecture is a three-tier system: Next.js App Router for routing and SSR (with Server Actions for mutations), Supabase platform for auth/DB/Realtime, and client-side React state (Zustand + TanStack Query) for the real-time UI layer. The key architectural insight is that the feed and presence layers are architecturally distinct: the historical feed is pull-based (fan-out-on-read via SQL join) rendered as SSR on page load, while the live "studying now" overlay is push-based (Supabase Presence channel) applied client-side. Combining SSR for initial paint with Realtime overlays for live state is the correct pattern and avoids either full-page polling or client-only rendering.

**Major components:**
1. **Next.js App Router shell** — routing, auth protection via middleware, SSR for feed/profile pages, Server Actions for all mutations (session start/stop, follow/unfollow, classroom join)
2. **Supabase Realtime Presence** — global `study:live` channel for live timer state broadcast; client filters by `followingIds` set; per-classroom `classroom:{id}` channels for group rooms
3. **Sessions table (Postgres)** — core event log; `started_at` is server-owned truth; duration computed as `ended_at - started_at` never trusting client-sent values; heartbeat column for zombie session cleanup
4. **Social graph (`follows` table)** — directed adjacency; feed is `sessions WHERE user_id IN (SELECT followee_id FROM follows WHERE follower_id = $me)` — pull-based, indexed, no fanout writes needed at MVP scale
5. **Classrooms** — named Realtime channels (`classroom:{id}`); invite via `nanoid(10)` token; membership enforced by RLS; scope for grade sharing and leaderboards
6. **Row Level Security** — database-enforced privacy model; sessions visible to owner + followers + shared classroom members; grades default private; never rely on application-layer privacy checks alone
7. **Analytics layer** — computed from `sessions` table via SQL window functions at request time; no separate pipeline needed until ~500K rows

**Architecture file:** `/Users/rahulghosh/stuudy/.planning/research/ARCHITECTURE.md` contains full schema (SQL), data flow diagrams, all 5 patterns with code examples, and anti-pattern analysis.

---

### Critical Pitfalls

The research surfaces 6 critical pitfalls specific to this app's architecture, plus a collection of security mistakes, performance traps, and UX anti-patterns.

1. **Supabase RLS not enabled leaks private grades and sessions** — RLS must be enabled on every table from Phase 1, not deferred. Broadcast channels have NO RLS by default. Never put private data (grades, GPA, private session notes) in Broadcast payloads. Verify with a cross-user data isolation test before any public launch. Recovery from a grades privacy incident is severe.

2. **Realtime channel lifecycle leak causes silent connection exhaustion** — Every `supabase.channel()` call in a `useEffect` must have a matching `return () => supabase.removeChannel(channel)`. Without cleanup, channels accumulate on navigation; Supabase Free tier has ~200 concurrent connection limit; users experience feed silently stopping. Use a centralized Realtime manager singleton rather than per-component subscriptions.

3. **Tab close / browser crash leaves sessions open as zombie sessions** — `beforeunload` is unreliable for async network calls; mobile browsers often skip it entirely. Implement a 30-second client heartbeat (`last_heartbeat_at` column on sessions) plus a server-side cron job that marks sessions abandoned if heartbeat is >2 minutes stale. Never calculate duration as `NOW() - started_at` for open sessions without a heartbeat cap.

4. **Cold-start empty feed causes immediate churn** — a new user with no followers sees nothing. Design classroom-first onboarding so the user joins a classroom before seeing the feed. The classroom feed (based on membership, not follows) provides immediate social context. Show a global "X students studying right now" count as a fallback for users with no classroom yet.

5. **Client-side timer as ground truth enables cheating and loses data on crash** — server owns `started_at`. The client derives display-only elapsed time from that timestamp. Duration is always computed server-side as `ended_at - started_at`. Add a max session duration constraint (e.g., 12 hours) to the database as a final guard.

6. **Global presence channel without follow-graph filtering exposes private accounts** — subscribe to `study:live` globally but filter presence events client-side using the loaded `followingIds` set. For private accounts, gate presence emission server-side. Never render all presence entries without filtering.

See `/Users/rahulghosh/stuudy/.planning/research/PITFALLS.md` for full pitfall analysis including recovery strategies, performance traps, security mistakes, and a pre-launch verification checklist.

---

## Implications for Roadmap

Based on combined research, the build order has clear dependency constraints. The architecture research and feature dependency graph both independently arrive at the same 7–8 phase structure.

### Phase 1: Foundation + Auth + Onboarding
**Rationale:** Auth and data model are prerequisites for every other feature. RLS policies must be written before any real-time feature is built — retrofitting privacy is a high-risk operation. Cold-start onboarding must be designed before the first user is onboarded, not after. This is the riskiest phase to rush.
**Delivers:** Working auth (email + Google OAuth), user profiles, DB schema with all tables and RLS policies, classroom-first onboarding flow, privacy defaults set correctly (grades private by default)
**Addresses:** User accounts (table stakes), privacy controls, cold-start problem
**Avoids:** RLS-disabled privacy leak (Pitfall 1), grades private-by-default violation, guessable invite link IDs (use `nanoid` from the start), service role key exposure
**Research flag:** Standard patterns — Supabase Auth + `@supabase/ssr` is well-documented

### Phase 2: Core Session Loop (Timer + History)
**Rationale:** Sessions are the data primitive for every social and analytics feature. Timer integrity (heartbeat, server-anchored timestamps, zombie session cleanup) must be built correctly the first time — retrofitting heartbeat after analytics are built is painful and requires schema changes.
**Delivers:** Courses CRUD, session start/stop with Server Actions, session history page, session heartbeat + cron cleanup, orphaned session handling
**Addresses:** Live study timer with course tags (P1 table stakes), session history + streak (P1 table stakes)
**Avoids:** Client-side timer as ground truth (Pitfall 5), zombie sessions (Pitfall 4), duplicate concurrent sessions
**Research flag:** Heartbeat + cron job pattern may benefit from a brief research phase to verify current Supabase Edge Function scheduling capabilities and `pg_cron` availability on the chosen plan tier

### Phase 3: Real-Time Presence + Live Feed
**Rationale:** This is the core viral mechanic and highest-risk technical phase. Should be built and validated early, even before the full follower system is in place (two test accounts can validate presence broadcast). The centralized Realtime channel manager and channel lifecycle cleanup patterns must be established here before any other real-time features are added.
**Delivers:** Supabase Realtime channel manager singleton, Presence broadcast on session start/stop, live activity feed with "LIVE" badges, feed filtering by `followingIds`, <2s latency validated
**Addresses:** Real-time broadcast to followers (P1, the viral mechanic), live "studying now" feed
**Avoids:** Channel lifecycle leak (Pitfall 2), global presence without follow-graph filtering (Pitfall 6), Postgres Changes RLS event-dropping edge case (Pitfall 3), polling anti-pattern
**Research flag:** Needs verification of current Supabase Realtime connection limits per plan tier before committing to architecture; this is the most dependency-critical external factor

### Phase 4: Social Graph + Full Feed
**Rationale:** Follow/unfollow is required for a personalized feed, but the presence layer in Phase 3 can be tested with hardcoded test accounts first. This phase upgrades the feed from "all classroom members" to "everyone I follow + classroom members."
**Delivers:** Follow/unfollow (follows table + RLS), user search/discovery, full SSR activity feed (historical + Realtime overlay), public profile pages with session stats
**Addresses:** Follow/unfollow (P1 table stakes), public profile, user discovery
**Avoids:** Fan-out-on-write at MVP scale (use pull-based feed with proper indexes from day 1); validate feed query with `EXPLAIN ANALYZE`
**Research flag:** Standard patterns — social graph adjacency list is well-understood; indexes are documented in ARCHITECTURE.md

### Phase 5: Classrooms
**Rationale:** Classrooms depend on the social graph RLS logic established in Phase 4 and the presence channel pattern from Phase 3. Classrooms are an extension of both — a curated follow group with its own named channel. This ordering means classrooms are additive, not a rewrite. Classrooms are also the primary growth vector (invite link brings cohorts, not individuals).
**Delivers:** Create classroom, invite via `nanoid` token, join via invite link (Server Action validates token), per-classroom Realtime presence channel, classroom member session view, leaderboard groundwork
**Addresses:** Classrooms (P1 core differentiator), classroom-scoped group accountability, invite-link viral growth
**Avoids:** Predictable channel names (use classroom ID token, not raw UUID in channel name), membership not enforced by RLS
**Research flag:** Standard patterns — established in ARCHITECTURE.md with full invite token pattern

### Phase 6: Analytics + Streak
**Rationale:** Analytics require real session data to be meaningful and to correctly test streak edge cases. Building analytics against seed data risks shipping incorrect consecutive-day calculation logic. Running after real sessions accumulate means testing against realistic data distributions.
**Delivers:** Streak computation (SQL window function), course heatmap (calendar grid, intensity = study minutes), course breakdown charts (Recharts), weekly/monthly summary, profile analytics page
**Addresses:** Study streaks (P1 table stakes, low-effort/high-value), course heatmap + analytics (P2 after validation)
**Avoids:** Premature analytics with no real data; complex SQL on unindexed tables (all indexes established in earlier phases)
**Research flag:** Streak SQL window function pattern is HIGH confidence and included in ARCHITECTURE.md; Recharts integration is standard

### Phase 7: Polish + Mobile Responsiveness
**Rationale:** Animation and visual polish should come last — data models change during Phases 2–6 and animating layouts that are still in flux is wasted effort. This phase is safe to begin once the data layer is stable.
**Delivers:** shadcn/ui customization to intended design system, Framer Motion transitions on key interactions (session start, feed card appear/disappear, timer start), dynamic background effects, mobile-responsive layout pass, toast notifications (sonner)
**Addresses:** Mobile-responsive UI (table stakes — 60%+ casual interactions are mobile), animation quality
**Avoids:** Framer Motion layout thrash (isolate timer in leaf component; use `layoutId` only for shared-element transitions; define animation variants outside render); AnimatePresence on entire feed list
**Research flag:** Standard patterns; PITFALLS.md documents specific Framer Motion anti-patterns to avoid

### Phase 8: Engagement Layer (v1.x)
**Rationale:** These features are validated after the core loop is confirmed working with real users. Building them before validation risks building the wrong things.
**Delivers:** Kudos/reactions on sessions, classroom leaderboard (weekly hours), push notifications with batching, grade/GPA sharing in classrooms (opt-in, per-classroom visibility)
**Addresses:** Kudos (P2), classroom leaderboard (P2), push notifications (P2 — critical for retention), grade sharing (P2 differentiator)
**Avoids:** Notification spam without batching (10 notifications for 10 classroom members starting sessions should be 1 batched notification); grade sharing visible in global feed (classroom-scoped only)
**Research flag:** Push notifications may need a research phase — Web Push API + service worker setup has non-trivial cross-browser complexity; consider a third-party service (OneSignal) vs native Web Push

---

### Phase Ordering Rationale

- **Auth before everything:** RLS policies written during schema creation (Phase 1) are the security contract for every subsequent feature. There is no safe way to add RLS retroactively without auditing every existing data path.
- **Timer integrity before social:** The social loop is built on top of session data. If the timer's `started_at` / heartbeat / zombie-cleanup architecture is wrong, every downstream feature (feed, analytics, leaderboards) inherits the corruption.
- **Presence before full social graph:** The live "studying now" mechanic should be testable and validated with two test accounts before the full follower system is built. This de-risks the highest-value feature early.
- **Classrooms after follows:** Classroom membership uses the same RLS patterns as the follow graph. Building follow first means classrooms are additive (extend the privacy model, don't create a parallel one).
- **Analytics after real data:** Streak edge cases (timezone boundaries, gaps, minimum session duration) cannot be correctly tested with synthetic seed data. Run analytics development against real accumulated session data.
- **Polish last:** Data models change during Phases 2–6. Animating layouts that are still in flux is wasted work and creates animation debt when structures are later restructured.

---

### Research Flags

**Phases needing deeper research before or during planning:**
- **Phase 2 (heartbeat/cron):** Verify current Supabase Edge Function scheduling and `pg_cron` availability on the chosen plan tier before designing the zombie-session cleanup architecture. The pattern is clear; the specific Supabase mechanism needs current-docs verification.
- **Phase 3 (Realtime limits):** Verify current Supabase Realtime connection limits per plan tier and Presence channel performance benchmarks at 50+ concurrent members. This is a hard ceiling that directly impacts the Phase 3 architecture decision (global channel vs per-classroom channels).
- **Phase 8 (push notifications):** Web Push + service worker cross-browser complexity is non-trivial. Research OneSignal vs native Web Push API vs Supabase Edge Function + FCM before committing to an approach.

**Phases with standard, well-documented patterns (can skip research-phase):**
- **Phase 1:** Supabase Auth + `@supabase/ssr` + Next.js App Router is comprehensively documented
- **Phase 4:** Social graph adjacency list, pull-based feed, SQL indexes — all documented in ARCHITECTURE.md with specific SQL
- **Phase 5:** Classroom invite token pattern is well-established (nanoid + server-side validation)
- **Phase 6:** Streak SQL window function is included verbatim in ARCHITECTURE.md; Recharts is standard
- **Phase 7:** shadcn/ui + Framer Motion integration patterns are well-documented; specific anti-patterns are captured in PITFALLS.md

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM | Core choices (Next.js 15, Supabase, Zustand, TanStack Query, shadcn/ui) are well-documented and stable. Version-specific compatibility (React 19 peer deps, Tailwind 4 beta status, Framer Motion 11 React 19 support) should be verified with current npm registry before bootstrapping. WebSearch unavailable during research. |
| Features | MEDIUM | Feature gap analysis is based on training data (Aug 2025) for Strava, Focusmate, StudyStream, Forest, BeReal. Core table-stakes features are HIGH confidence (universal across reference apps). Competitor feature set may have changed — verify StudyStream and Focusmate current state before roadmap finalization. |
| Architecture | MEDIUM-HIGH | Supabase Realtime architecture (Presence, Broadcast, Postgres Changes) is based on official docs through Aug 2025. Pull-based feed, RLS patterns, and SQL patterns are HIGH confidence (stable database fundamentals). Specific Realtime connection limits should be verified before Phase 3 planning. |
| Pitfalls | MEDIUM-HIGH | RLS, channel lifecycle, and timer integrity pitfalls are based on established engineering patterns and well-documented Supabase behavior — HIGH confidence these are real risks. Specific connection limit numbers and cron scheduling availability are MEDIUM confidence and require current-docs verification. |

**Overall confidence:** MEDIUM

The research is internally consistent — all four files independently arrive at the same architectural recommendations and the same priority order. The MEDIUM ceiling is driven by the absence of web search during research sessions, meaning version-specific claims (Next.js 15 exact React 19 peer deps, Supabase Realtime connection limits per plan, Tailwind 4 production stability) need verification against live documentation before implementation begins.

---

### Gaps to Address

- **Supabase Realtime connection limits by plan tier:** This is the single most critical external dependency to verify. The Free tier limit (~200 concurrent connections) directly determines whether the global `study:live` presence channel architecture is viable or whether per-classroom sharding is required from day 1. Verify at supabase.com/docs/guides/realtime/rate-limits before Phase 3 planning.
- **Tailwind CSS 4 production stability:** As of Aug 2025, Tailwind 4 was in beta. It may be stable now (March 2026). If stable, shadcn/ui Tailwind 4 compatibility should also be verified before bootstrapping. If still in flux, use Tailwind 3.x.
- **Next.js 15 + React 19 exact peer dependencies:** Run `npm info next peerDependencies` to confirm React 19 is required (not just supported) before project initialization.
- **Supabase Edge Function scheduling for heartbeat cleanup:** Verify whether `pg_cron` is available on the chosen Supabase plan, or whether Edge Function scheduling (via Supabase's built-in cron feature) is the correct mechanism for zombie session cleanup.
- **StudyStream and Focusmate current feature sets:** The competitive analysis is from Aug 2025 training data. Both apps evolve rapidly. Manually check current feature sets before finalizing feature scope — particularly to confirm no competitor has shipped a per-user follow graph with live timer broadcasting since Aug 2025.

---

## Sources

### Primary (HIGH confidence)
- Next.js App Router documentation (training data, Aug 2025) — Server Actions, RSC patterns, middleware
- PostgreSQL Row Level Security (stable standard, multiple training sources) — RLS policy syntax and behavior
- Phoenix Presence (Elixir/Phoenix official docs, training data) — Supabase Presence underlying mechanism
- SQL window functions (SQL standard, multiple training sources) — streak calculation pattern

### Secondary (MEDIUM confidence)
- Supabase Realtime documentation (training data, Aug 2025) — Broadcast, Presence, Postgres Changes channel types; connection limit concerns
- Supabase Auth + `@supabase/ssr` documentation (training data, Aug 2025) — two-client pattern for App Router
- Strava / Focusmate / StudyStream / Forest feature analysis (training data, Aug 2025) — competitive landscape
- Framer Motion 11 documentation (training data, Aug 2025) — React 19 support, layout animation performance
- TanStack Query v5 documentation (training data, Aug 2025) — RSC adapter, cache invalidation
- Fan-out-on-read vs fan-out-on-write (engineering blog consensus, multiple training sources) — threshold estimates

### Tertiary (LOW confidence — verify before use)
- Tailwind CSS 4 production stability — beta as of Aug 2025; check tailwindcss.com for current status
- Supabase Realtime specific connection limit numbers by plan tier — verify at current Supabase pricing/docs pages
- StudyStream, Focusmate current feature parity — apps evolve rapidly; verify against live apps before feature scope is finalized

---

*Research completed: 2026-03-06*
*Ready for roadmap: yes*
