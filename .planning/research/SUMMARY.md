# Project Research Summary

**Project:** stuuudy
**Domain:** Social study tracking app (Strava-style, web-first)
**Researched:** 2026-03-01
**Confidence:** MEDIUM (stack HIGH, features MEDIUM, architecture MEDIUM, pitfalls HIGH)

## Executive Summary

stuuudy is a Strava-style social study tracker — a web SPA where students log study sessions with subject tags, view performance stats (streaks, heatmaps, subject breakdowns), and follow other students to see their activity in a social feed. The product thesis is "studying feels like a sport when tracked and shared." The closest competitive reference is YeolPumTa (YPT) for the study-tracking core and Strava for the social layer, but no existing app combines both with a serious athletic aesthetic. The recommended technical approach is a React 19 SPA backed entirely by Firebase (Firestore + Auth + Realtime Database for presence) with fan-out-on-write for the social feed — a well-documented Firestore pattern that gives O(1) feed reads at the cost of O(followers) writes per session.

The build should proceed in strict dependency order: Auth and type-safe Firestore foundation first, then the session timer (the core product loop), then stats (validates sessions work), then the social graph, then the feed and social interactions, then live presence. Deviating from this order creates significant rework — social features are meaningless without sessions, and the feed cannot ship without privacy controls already enforced at the Firestore rules layer (not just in the UI). The architecture is well-suited to future gamification (egg-hatching, leaderboards) because the v1 data model intentionally reserves schema space — no structural migrations will be required.

The three highest-impact risks are: (1) timer drift from setInterval counting rather than timestamp-anchored elapsed time — get this wrong in Phase 1 and session duration data is corrupted permanently; (2) missing or client-only privacy enforcement — a one-line security rules gap exposes all private/followers-only sessions to any authenticated user; and (3) naive presence implementation — a Firestore-only "isStudying" field will leave users stuck as "studying live" after browser close or network loss. All three have well-documented prevention patterns that must be implemented from day one, not retrofitted.

---

## Key Findings

### Recommended Stack

The stack is built around React 19.2 + TypeScript 5 + Vite 6 on the frontend, with Firebase SDK 12.x (modular API only) providing Auth, Firestore, and Realtime Database. Styling uses Tailwind CSS v4 and shadcn/ui (source-copied components, not npm dependency), giving full ownership of the design system — critical for the Strava-dark athletic aesthetic that is itself a differentiator. Client state is split deliberately: Zustand 5 for ephemeral in-memory state (timer, auth user, active tab) and TanStack Query v5 for all Firestore server data. This prevents the cascade re-render problem that plagues Context API approaches to server data.

The modular Firebase SDK import pattern is non-negotiable — the compat API bloats the bundle 3-5x. The `react-firebase-hooks` library is explicitly ruled out (unmaintained, last published 3 years ago). TanStack Query integrates with Firestore's `onSnapshot` via the `queryClient.setQueryData` bridge pattern — real-time listeners populate the query cache rather than driving their own parallel state.

**Core technologies:**
- React 19.2 + TypeScript 5: UI rendering with compile-time type safety for Firestore schemas
- Firebase SDK 12.x (modular): Auth, Firestore, Realtime Database — chosen constraint, modular imports required
- Tailwind CSS v4 + shadcn/ui: Custom dark athletic design system with full source ownership
- Zustand 5: Timer state, auth state, transient UI state — no Redux boilerplate
- TanStack Query v5: All Firestore data caching and server state — pairs with onSnapshot via setQueryData
- React Hook Form v7 + Zod v3: Form state and schema validation, schemas reused for Firestore writes
- Recharts v2 + react-calendar-heatmap: Weekly bar charts and monthly heatmap calendar
- date-fns v3: Tree-shakeable date arithmetic for streaks, heatmap data, timestamp formatting

**Version constraints:** All major libraries have confirmed React 19 support. Zustand 5 requires React 18+. TanStack Query v5 has breaking API changes from v4 — use v5 patterns from day one.

### Expected Features

The feature set is driven by a clear dependency chain: Auth enables User Profile, which enables Follow Graph, which enables Feed. Timer enables Sessions, which enables all Stats and Goals. Privacy Controls must ship with the Feed — they are not a v1.x add-on.

**Must have (table stakes) — v1 launch:**
- Google Sign-In (Google OAuth via Firebase Auth) — one-tap login, no email/password
- Stopwatch timer with subject tagging — the core session creation loop; single-tap start, big elapsed display
- Pomodoro timer mode — configurable work/break intervals; expected by the target audience
- Session history log — every past session; date, subject, duration
- Today's total study time on home screen — updates in real-time while timer runs
- Daily study streak counter — consecutive days studied; visible on home
- Study goal with progress indicator (daily) — configurable target; progress bar on home
- Weekly bar chart — daily totals for current week
- Monthly heatmap calendar — color intensity = hours studied; tap a day for sessions
- Subject breakdown stats — time by subject (pie/ranked list)
- User profile with stats summary — avatar, name, totals, streak, follower/following counts
- Asymmetric follow graph (Strava-style) — follow anyone, no approval
- Activity feed of followed users — chronological, completed session cards with like/kudos
- Live "studying now" presence in feed — biggest differentiator; real-time RTDB-backed indicator
- Like / kudos on sessions — single-tap reaction, instant feedback
- Session privacy controls (Public / Followers / Private) — per-session; must ship with feed

**Should have (competitive differentiators):**
- Optional notes / memo on completed session — adds context to feed cards, increases engagement
- Subject-specific goals with per-subject progress — solves real multi-exam study scheduling need
- Shareable profile URL — enables social proof use case (share with study group or mentor)

**Defer to v1.x (post-validation):**
- Comments on sessions — trigger: like volume demonstrates social engagement exists
- Streak freeze / grace period — trigger: churn analysis shows streak loss causes abandonment
- Apple Sign-In — trigger: iOS user share warrants it

**Defer to v2+ (post product-market fit):**
- Leaderboards / rankings — creates winner-takes-all disengagement; only viable at scale
- Push notifications — notification fatigue risk; Chrome auto-revokes permissions for over-notifying apps
- Gamification visuals (eggs, trees) — brand-incompatible with athletic aesthetic in v1; separate milestone
- Group study rooms / video co-studying — different product category; 10x scope
- Native mobile apps — web-first validates concept; native is follow-on investment
- Direct messaging — requires moderation infra; comments serve v1 social needs
- Offline-first architecture — Firestore offline persistence covers light use; full sync is v2

### Architecture Approach

The architecture is a 4-tab React SPA (Home/Timer, Feed, Stats, Profile) built in strict layers: React components talk only to custom hooks, custom hooks talk to the service layer, the service layer makes all Firestore/RTDB calls. Components never import from `services/` directly. The feed uses fan-out-on-write: when a session ends, a Cloud Function reads the user's followers and batch-writes a lightweight display copy into each follower's `feed/{userId}/items/` subcollection. Feed reads are then O(1) — a single ordered query on one collection. Live presence is handled via Firebase Realtime Database `onDisconnect()`, mirrored to Firestore via Cloud Function — Firestore alone cannot reliably detect browser crash or network loss. Stats are derived directly from the `sessions` collection in v1 (no separate materialized stats documents), with denormalized aggregates (`totalStudyMinutes`, `currentStreak`) on the user document updated via Cloud Functions at session write time.

**Major components and responsibilities:**
1. `features/timer/` — Local Zustand state for stopwatch and Pomodoro modes; writes session to Firestore on stop only (no per-second writes); timestamp-anchored elapsed time
2. `features/feed/` — onSnapshot subscriber via `feed/{userId}/items`; renders live and completed session cards; integrates RTDB presence for "studying now" badges
3. `features/stats/` — TanStack Query one-shot queries for weekly/monthly aggregation; heatmap and bar chart rendering; streak display from denormalized user document field
4. `features/profile/` — User stats, follow lists, profile editing; follow/unfollow with atomic counter batch writes
5. `services/` — All Firebase SDK calls; no React imports; pure functions returning promises or unsubscribe callbacks
6. Cloud Functions — Fan-out on session write, RTDB presence mirror to Firestore, aggregate updates (streak, totalStudyMinutes)
7. Firestore Security Rules — Privacy enforcement server-side; default deny-all; `get()` calls verify follow relationship for followers-only sessions

**Key architectural patterns:**
- Firestore documents use `serverTimestamp()` for all `createdAt` fields — never client `new Date()`
- Denormalized counts (`likeCount`, `followerCount`, `totalStudyMinutes`) updated atomically via `FieldValue.increment()` — never read-modify-write
- Feed items are display-only copies; likes/comments always reference the canonical `sessions/{sessionId}` subcollections
- Subjects are a user-scoped subcollection (`/users/{userId}/subjects/`) with `totalMinutes` denormalized per subject
- Pagination is cursor-based (`startAfter(doc)`) throughout — offset-based pagination is explicitly prohibited

### Critical Pitfalls

1. **Timer drift via setInterval tick-counting** — Store `startTimestamp = Date.now()` and derive elapsed from wall-clock difference on each tick. Never count ticks. Use Page Visibility API to handle background tab throttling. Persist start timestamp to `localStorage` to survive page refresh. Get this wrong in Phase 1 and all session duration data is corrupted.

2. **Privacy enforcement client-side only** — Firestore Security Rules must enforce the privacy field server-side; client-side React filtering is trivially bypassed via the Firebase SDK. Rules must use `get()` to verify follow relationships for followers-only sessions. Test with Firebase Rules Playground and automated rules unit tests before shipping the feed.

3. **Naive presence using Firestore field alone** — A Firestore `isStudying` field updated by client code silently fails on browser close, tab crash, or network loss. Use Firebase Realtime Database `onDisconnect()` as the crash-safe backstop, mirrored to Firestore via Cloud Function. Never build presence as a client-written Firestore field only.

4. **Streak calculation ignoring user timezone** — `serverTimestamp()` is UTC; "did I study today?" must be calculated in the user's local IANA timezone (captured at signup via `Intl.DateTimeFormat().resolvedOptions().timeZone`). UTC-based streak math breaks for users in UTC+9 and during DST transitions. Use `date-fns-tz` for timezone-aware date comparison. Write unit tests covering UTC+9, UTC-5, and DST transition days.

5. **Fan-out write costs and Cloud Function timing** — Client-side fan-out is unacceptable (no retry on disconnect, partial fan-out leaves stale feeds). Fan-out must go through a Cloud Function triggered on session write. Design the Firestore schema from the start to support both push (fan-out) and pull (in-query) patterns so the scaling seam is a configuration switch, not a rewrite.

---

## Implications for Roadmap

Based on the combined research, a 7-phase build order is recommended. The architecture research explicitly defines a Layer 1-8 build sequence that maps directly to phases. Deviation from this order creates blocking dependencies.

### Phase 1: Foundation — Auth, Firebase Init, Type System
**Rationale:** Firebase Auth UID is the primary key for every other collection. Nothing can be built without it. Security rules must be written before any data is stored — retrofitting rules onto existing data is high-risk.
**Delivers:** Google Sign-In flow, user document creation on first login, Firestore security rules scaffold (deny-all with explicit allows), TypeScript types and `withConverter` helpers for all collections, Firebase Emulator local dev environment.
**Addresses features:** Google Auth, user profile stub
**Avoids pitfalls:** Firestore test-mode rules in production (critical risk), trusting client-supplied userId in writes
**Research flag:** Standard patterns, well-documented — no additional phase research needed

### Phase 2: Session Timer and Core Session Loop
**Rationale:** The session timer is the product's reason to exist. All stats, social features, and gamification derive from sessions. Nothing else is testable without sessions being created. Pomodoro and stopwatch modes can be built in parallel as they share the same session output schema.
**Delivers:** Stopwatch timer with subject tagging, Pomodoro mode, session creation and end write to Firestore, localStorage persistence of timer state (survives refresh), session history log view, today's total on home screen.
**Addresses features:** Stopwatch timer, Pomodoro timer, subject/tag system, session history log, today's total
**Avoids pitfalls:** Timer drift (timestamp-anchored elapsed time from day one), setInterval tick counting, session write with serverTimestamp() not client new Date()
**Research flag:** Timer timestamp pattern is well-documented (MDN, React community) — standard implementation, no research phase needed. Pomodoro configurable intervals are expected; UX pattern is established.

### Phase 3: Stats and Goals
**Rationale:** Stats validate that session creation is working correctly and the data model is sound before adding social complexity. Stats are independent of social — they depend only on sessions. Building stats before social catches data model issues early while the codebase is still simple.
**Delivers:** Daily streak counter (timezone-aware), weekly bar chart, monthly heatmap, subject breakdown, daily goal with progress indicator, streak display on home.
**Addresses features:** Streak counter, weekly chart, heatmap, subject breakdown, daily goal
**Avoids pitfalls:** Streak timezone bug (capture IANA timezone at signup in Phase 1, use it here), empty state handling for new users (show skeleton/CTA not empty charts)
**Research flag:** Streak calculation with DST handling may need a brief research spike — date-fns-tz timezone-aware date comparison is documented but DST edge cases require explicit unit test coverage. Otherwise standard patterns.

### Phase 4: Social Graph (Follow/Unfollow)
**Rationale:** The follow graph is a hard prerequisite for the feed. It cannot be added after the feed without a schema migration. The `/follows/{followerId_followingId}` composite-key collection pattern must be established here. Atomic counter batch writes for follower/following counts must be tested before feed relies on them.
**Delivers:** Follow/unfollow functionality, follower/following lists, follow counts on profile, user search/discovery stub (suggested users for empty feed state).
**Addresses features:** Asymmetric follow graph, user profile with stats
**Avoids pitfalls:** Storing follower list as array in user document (document size limit), non-atomic counter updates (use FieldValue.increment batch writes)
**Research flag:** Standard Firestore social graph pattern — well-documented. No research phase needed.

### Phase 5: Activity Feed and Privacy Controls
**Rationale:** The feed is the core social differentiator and the highest-complexity feature. Privacy controls must ship in this same phase — not after — because displaying sessions in a feed without enforced server-side privacy is a trust violation. Fan-out Cloud Function must be implemented here, not retrofitted.
**Delivers:** Feed of completed session cards from followed users (fan-out via Cloud Function), like/kudos on sessions, session privacy controls (Public/Followers/Private) enforced in Firestore rules, empty feed state with suggested follows CTA.
**Addresses features:** Activity feed, likes/kudos, session privacy controls
**Avoids pitfalls:** Client-side privacy enforcement only (must be in rules), client-side fan-out (must be Cloud Function), offset pagination (use cursor-based), budget runaway from unmonitored listeners
**Research flag:** Cloud Functions Gen 2 setup and fan-out trigger pattern may benefit from a research phase during planning — cold start behavior, error handling, and partial fan-out retry logic have nuances. Recommend flagging for research.

### Phase 6: Live Presence ("Studying Now")
**Rationale:** Presence is architecturally separate from the feed (different Firebase product — Realtime Database) and is the single biggest technical risk. Isolating it into its own phase keeps the feed phase clean and prevents presence complexity from delaying feed delivery.
**Delivers:** "Studying now" indicator on feed cards (real-time badge with elapsed time), RTDB presence write on session start, `onDisconnect()` crash-safe cleanup, Cloud Function RTDB-to-Firestore mirror, live session card variant in feed (transitions to completed card on stop).
**Addresses features:** Live "studying now" presence in feed
**Avoids pitfalls:** Naive Firestore-only presence (must use RTDB onDisconnect), presence stuck as "live" after browser close, manual cleanup falling for crashes
**Research flag:** RTDB + Firestore presence pattern is officially documented by Firebase. Standard implementation — no research phase needed. Verify `onDisconnect()` behavior with integration tests, not additional research.

### Phase 7: Social Interactions and Polish
**Rationale:** Comments, notes on sessions, and profile polish can be added once the core loop is validated. These are v1.x features per the feature research — high value but not blocking launch validation.
**Delivers:** Comments on sessions, optional session notes/memo, shareable profile URL, subject-specific goals, streak freeze (if churn data warrants it), UI polish and empty state improvements.
**Addresses features:** Comments, notes, subject-specific goals, shareable profile, streak freeze
**Avoids pitfalls:** Like count as client read-modify-write (use FieldValue.increment), denormalized username staleness (batch update feed items on displayName change)
**Research flag:** Standard patterns throughout. No research phase needed.

### Phase Ordering Rationale

- **Auth before everything:** Firebase Auth UID is the foreign key for all collections. Security rules must exist before data is written.
- **Timer before Stats:** Stats are derived from sessions. No sessions = no testable stats. The data model must be validated at the session write layer before adding a stats layer on top.
- **Stats before Social:** Building stats first catches data model issues in a simpler context. The session schema is the foundation for both stats queries and social feed cards — validate it before building the feed.
- **Social Graph before Feed:** The feed collection (`feed/{userId}/items/`) is populated by following someone's sessions. The graph must exist before fan-out can fire.
- **Privacy Controls in Feed Phase (not after):** Shipping a feed without server-side privacy enforcement is a trust violation. These are the same phase by design.
- **Presence isolated in its own phase:** RTDB presence is a separate architectural layer. Isolating it reduces risk to the feed delivery phase.
- **Social Interactions last:** Comments and notes enhance the feed but don't gate it. Deferring to Phase 7 keeps Phase 5 focused on the high-risk fan-out pattern.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 5 (Activity Feed):** Cloud Functions Gen 2 fan-out pattern has nuances around cold start, partial write failure, and retry logic. A research spike on Cloud Function error handling and Firestore batch write limits (max 500 operations per batch) is recommended before implementation planning.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Foundation):** Firebase Auth + Firestore init is extremely well-documented. Official Firebase docs cover all patterns.
- **Phase 2 (Timer):** Timestamp-anchored elapsed time is a documented React pattern. Pomodoro UX is well-established.
- **Phase 3 (Stats):** date-fns + Recharts patterns are standard. Streak timezone handling has documented solutions.
- **Phase 4 (Social Graph):** Firestore composite-key follows collection is the canonical pattern.
- **Phase 6 (Presence):** Firebase official presence guide covers RTDB + onDisconnect pattern completely.
- **Phase 7 (Social Interactions):** All features in this phase use patterns already established in earlier phases.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Core technologies verified via official docs (Firebase, shadcn/ui, React). Version compatibility confirmed. react-firebase-hooks unmaintained status verified against npm registry. |
| Features | MEDIUM | Competitor analysis from official stores and community sources. YPT behavioral claims from secondary sources. Strava Kudos and privacy data from official support docs (HIGH for those specifics). Feature dependency order is logical deduction, not externally verified. |
| Architecture | MEDIUM | Firestore fan-out pattern and presence pattern verified against official Firebase docs (HIGH). Feed pull-vs-push trade-off verified across multiple community sources. Specific Cloud Function fan-out implementation is community-documented (MEDIUM). Scaling thresholds are estimates. |
| Pitfalls | HIGH | setInterval drift, Firestore test-mode exposure, and presence failure modes verified against official docs and high-quality community sources. Timezone streak bug documented via real-world incident reports (LeetCode, Trophy.so). Firebase security incidents in 2025 confirmed via cybersecurity research. |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **Cloud Function fan-out error handling:** The research recommends Cloud Function fan-out but does not detail partial failure recovery (e.g., what happens if a Cloud Function fails mid-batch). Needs a brief research spike in Phase 5 planning — specifically: retry behavior, dead-letter handling, and max batch size for Firestore batch writes (500 operations/batch = at most 500 followers per Cloud Function invocation, must paginate for larger follower counts).

- **Presence elapsed time update frequency:** The features research states "every 60 seconds is fine" for updating live session elapsed time in the feed, but this is not verified against RTDB pricing. Confirm that periodic RTDB reads by all feed-open clients is within the free tier for expected V1 user counts before implementing real-time elapsed-time updates on live cards.

- **Streak midnight grace period:** The UX pitfall research recommends showing yesterday's streak if today has no session yet (avoid showing 0 after midnight). The exact implementation — whether to defer to user's local time midnight vs. a fixed grace window — should be validated against user expectations during Phase 3.

- **Firestore `IN` query limit for pull-model fallback:** The stack research notes the `IN` query supports up to 30 values. The architecture research notes that users following more than 30 accounts need a fan-out model (not pull). This means Phase 4 must hard-cap or the Phase 5 fan-out must be in place before users can follow more than 30 accounts. The transition threshold should be designed explicitly, not discovered at runtime.

---

## Sources

### Primary (HIGH confidence)
- Firebase official docs (firebase.google.com) — Firestore best practices, security rules, presence pattern, distributed counters, query cursors, modular SDK upgrade
- Firebase Codelabs — Leaderboards with Firestore
- Firebase Fix Insecure Rules (official) — security rules enforcement
- Strava official support — activity privacy controls, live activities
- shadcn/ui official docs — Tailwind v4 compatibility, Vite setup
- Toggl official (toggl.com/track/features) — time tracking feature benchmarks
- MDN Web Docs — Page Visibility API
- BeReal Wikipedia — presence/ephemeral social features

### Secondary (MEDIUM confidence)
- npm registry — react-firebase-hooks last published date, Zustand v5 version
- Code.Build, DEV Community (Jonathan Gamble) — Firestore follower feed patterns
- GetStream.io — activity feed design patterns
- LogRocket — React hooks with Firebase Firestore patterns
- Tiger Abrodi Blog — daily streak system implementation
- StriveCloud — Strava Kudos engagement statistics
- Multiple community articles — Firebase cost management, React memory leaks
- YPT Google Play Store, Focumon, Raffles Press — YPT competitor analysis
- Forest gamification case study (Trophy.so) — gamification pattern analysis

### Tertiary (LOW confidence)
- primeproductiv4.com (Forest review) — single review, anecdotal
- focus-dividend.com (best focus apps) — opinion-based ranking

---
*Research completed: 2026-03-01*
*Ready for roadmap: yes*
