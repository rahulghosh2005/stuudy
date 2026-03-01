# stuuudy

## What This Is

stuuudy is a Strava-style study tracking app inspired by Yeolpumta. Users track focused study sessions with a timer, label sessions by subject/tag, and earn detailed stats. The social layer — a Strava-like activity feed where followers can see each other's sessions live and after completion, react with likes/comments, and share accountability — turns studying into something worth showing off.

## Core Value

Make studying feel like a sport: personal performance data that's worth tracking, and a social feed that makes progress visible to the people who matter.

## Requirements

### Validated

(None yet — ship to validate)

### Active

**Timer & Sessions**
- [ ] User can start a stopwatch-style timer and stop it to log a session
- [ ] User can use a Pomodoro-style countdown timer with configurable intervals
- [ ] User selects a subject/tag before or during a session
- [ ] User can add an optional notes/memo field after stopping a session
- [ ] Sessions record subject, duration, timestamp, and privacy level

**Stats & Goals**
- [ ] User sees today's total study time prominently on the home screen
- [ ] User can view weekly activity bar chart and monthly heatmap calendar
- [ ] User can view study time broken down by subject
- [ ] User can set a daily time goal (toggleable)
- [ ] User can set a weekly time goal (toggleable)
- [ ] User can set subject-specific goals (toggleable)
- [ ] User has a study streak (consecutive days studied), visible on home screen

**Social Feed**
- [ ] User can see a feed of sessions from people they follow (completed + live)
- [ ] Feed cards show: avatar, name, "Studied X mins – Subject", timestamp, like/comment actions
- [ ] User can see when a followed user is actively studying right now ("studying live")
- [ ] User can like a session
- [ ] User can comment on a session

**Social Graph**
- [ ] User can follow another user (asymmetric — no approval required)
- [ ] User can unfollow a user
- [ ] User can view their followers and following lists

**Privacy**
- [ ] Each session has a privacy setting: Public / Followers / Private
- [ ] Private sessions are invisible to others
- [ ] Followers-only sessions are visible only to approved followers

**Auth & Profile**
- [ ] User can sign in with Google via Firebase Auth
- [ ] User has a profile with stats summary, activity history, follower/following counts
- [ ] User can access privacy settings from their profile

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

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Firebase Auth (Google only) | Simplest auth for v1, users likely have Google accounts | — Pending |
| Firestore as primary DB | Real-time updates for live feed, pairs naturally with Firebase Auth | — Pending |
| Web-first (not native mobile) | Faster to ship, works on all devices, mobile-responsive | — Pending |
| Asymmetric follow model | Strava model — follow anyone publicly, no friction | — Pending |
| No gamification in v1 | Keep v1 clean and athletic; gamification in future milestones | — Pending |
| Stopwatch + Pomodoro both | User chooses mode per session — maximizes flexibility | — Pending |

---
*Last updated: 2026-03-01 after initialization*
