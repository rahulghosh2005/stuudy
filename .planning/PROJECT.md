# stuuudy

## What This Is

stuuudy is a Strava-style study tracking app inspired by Yeolpumta. Users track focused study sessions with a timer, label sessions by subject/tag, and earn detailed stats. The social layer — a Strava-like activity feed where followers can see each other's sessions live and after completion, react with likes/comments, and share accountability — turns studying into something worth showing off.

## Core Value

Make studying feel like a sport: personal performance data that's worth tracking, and a social feed that makes progress visible to the people who matter.

## Requirements

### Validated

**Auth & Profile** (v1.0)
- ✓ User can sign in with Google via Firebase Auth — v1.0
- ✓ IANA timezone captured silently at first sign-in — v1.0
- ✓ Session persists across browser refresh — v1.0
- ✓ Profile displays stats summary, follower/following counts — v1.0
- ✓ Display name and avatar from Google account — v1.0

**Timer & Sessions** (v1.0)
- ✓ User can start a stopwatch-style timer and stop it to log a session — v1.0
- ✓ Timer uses anchor-time pattern (no drift from tab backgrounding) — v1.0
- ✓ User can use a Pomodoro-style countdown timer with configurable intervals — v1.0
- ✓ User selects a subject/tag before or during a session (created on the fly) — v1.0
- ✓ User can add an optional notes/memo field after stopping a session — v1.0
- ✓ Sessions record subject, duration, timestamp, notes, privacy level — v1.0

**Stats & Goals** (v1.0)
- ✓ Interactive stats chart with 1D/1W/1M/3M/All range filters + subject filter — v1.0
- ✓ Monthly heatmap calendar with orange color scale — v1.0
- ✓ Study time broken down by subject for selected range — v1.0
- ✓ All-time cumulative study total displayed — v1.0
- ✓ Study streak (consecutive calendar days, IANA-timezone-correct) — v1.0
- ✓ Daily, weekly, and per-subject goals (each independently toggleable) — v1.0
- ✓ Daily goal progress bar on home/timer screen — v1.0

### Active

**Social Graph** (v1.1 target)
- [ ] User can follow another user (asymmetric — no approval required)
- [ ] User can unfollow a user
- [ ] User can view their followers and following lists

**Activity Feed & Privacy** (v1.1 target)
- [ ] User sees a feed of sessions from followed users (completed + live)
- [ ] Feed cards: avatar, name, "Studied X mins – Subject", timestamp, like button
- [ ] User can like a session (one like per user per session)
- [ ] Privacy enforced server-side: Private never shown, Followers-only requires verified follow
- [ ] Session privacy setting: Public / Followers / Private

**Live Presence** (v1.1 target)
- [ ] "Studying now" live badge for followed users actively in a timer session
- [ ] Presence clears automatically via RTDB onDisconnect() on browser close/crash

### Out of Scope

- Egg-hatching gamification — deferred to future milestone
- Zoo/collectibles system — deferred to future milestone
- Leaderboards — deferred to future milestone
- Groups/communities — deferred to future milestone
- Email/password auth — Google sign-in is sufficient for v1
- Push notifications — deferred to future milestone
- Mobile native app — web-first, mobile app later

## Context

**Inspiration:** Yeolpumta (Korean study timer app) for the session tracking paradigm + Strava for the social feed model and athletic performance aesthetic.

**Architecture note:** Firebase Auth (Google) + Firestore from day one. Architecture should be clean and scalable to accommodate future gamification layers (eggs, zoo, leaderboards) without major rewrites.

**Future milestones (already scoped):** Egg-hatching (eggs tied to study time accumulation), zoo collection, leaderboards, groups. V1 lays the data foundation for these.

## Constraints

- **Tech stack:** React (web-first), Firebase Auth (Google), Firestore — no alternatives
- **Architecture:** Clean and scalable from day one — future gamification should be addable without major refactoring
- **V1 aesthetic:** No gamification visuals in v1 — clean, athletic, data-driven only

## UI Direction

**Design language:** Strava mobile app aesthetic
- Dark-first interface (black/charcoal backgrounds)
- High-contrast white text
- Strava-orange accent color for CTAs and highlights
- Card-based feed layout
- Strong typography hierarchy (large bold metrics, smaller meta text)
- Clean, athletic, performance-oriented — no clutter

**Navigation:**
- Mobile: Bottom tab bar — Home (Timer), Feed, Stats, Profile
- Desktop: Adapts to left sidebar layout

**Home screen:** Large central bold timer, Start/Pause/Stop CTA, today's total at top, streak indicator, daily goal progress bar, subject/tag selector

**Feed:** Scrollable vertical activity cards — avatar, name, session summary, timestamp, like/comment actions. Clean card separation, minimal chrome.

**Stats:** Weekly bar chart, monthly heatmap, big-number totals, subject breakdown

**Profile:** Stats summary at top, activity history, privacy settings, follow lists

## Context

**Shipped v1.0 (2026-03-02):** 2,202 LOC TypeScript, 3 phases, 11 plans, 84 files.
**Stack:** React 19 + Vite, Firebase Auth + Firestore (subcollection sessions), Recharts 3.x, react-calendar-heatmap, date-fns-tz v3.
**Known tech notes:** react-calendar-heatmap requires `--legacy-peer-deps` (React 19 peer dep not declared). Recharts 3.x `TooltipProps` changed to `TooltipContentProps<number, string>`. date-fns-tz v3 renamed `utcToZonedTime` → `toZonedTime`.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Firebase Auth (Google only) | Simplest auth for v1 | ✓ Good — zero friction sign-in |
| Firestore as primary DB | Real-time updates, pairs with Firebase Auth | ✓ Good — subcollection per-user sessions works cleanly |
| Web-first (not native mobile) | Faster to ship, mobile-responsive | ✓ Good — bottom tab bar works on mobile |
| Anchor-time timer pattern | Prevents drift from tab backgrounding | ✓ Good — confirmed correct in testing |
| Asymmetric follow model | Strava model, no friction | — Pending (Phase 4) |
| No gamification in v1 | Keep v1 clean and athletic | ✓ Good — aesthetic is clean |
| Stopwatch + Pomodoro both | User chooses mode per session | ✓ Good — flexibility valued |
| Client-side streak recalculation | Avoids Cloud Function complexity | ✓ Acceptable — recalculates on stats load |
| Inline styles (no Tailwind/CSS modules) | Project convention set in Phase 1 | ⚠️ Revisit — verbose but consistent |

---
*Last updated: 2026-03-02 after v1.0 milestone*
