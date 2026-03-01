# Roadmap: stuuudy

## Overview

stuuudy is built in strict dependency order: auth and data foundation first, then the core study timer loop, then stats that validate sessions are working, then the social graph that enables follows, then the feed and privacy controls that make studying social, and finally live presence — the real-time differentiator. Six phases deliver a complete Strava-style study tracker with server-enforced privacy, fan-out feed, and crash-safe presence.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation** - Auth, user document, Firestore rules scaffold, TypeScript type system
- [ ] **Phase 2: Timer and Sessions** - Core study loop — stopwatch, Pomodoro, subject tagging, session writes
- [ ] **Phase 3: Stats and Goals** - Stats charts, heatmap, streaks, daily/weekly/subject goals
- [ ] **Phase 4: Social Graph** - Follow/unfollow, follower/following lists, follow counts on profile
- [ ] **Phase 5: Activity Feed and Privacy** - Fan-out feed, likes, server-enforced session privacy
- [ ] **Phase 6: Live Presence** - Real-time "studying now" via RTDB with crash-safe onDisconnect

## Phase Details

### Phase 1: Foundation
**Goal**: Users can sign in with Google and own a secure, correctly-keyed account that all future features build on
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, PROF-01, PROF-02, PROF-03, PRIV-03, PRIV-04
**Success Criteria** (what must be TRUE):
  1. User can sign in with Google and is redirected to the app with their Google avatar and display name visible
  2. User's IANA timezone is captured and stored on first sign-in (no prompt needed — captured silently)
  3. User stays signed in after closing and reopening the browser tab
  4. User's profile page shows stats summary (initially zeroed), follower count, and following count
  5. Firestore security rules deny all unauthenticated reads/writes and prevent a user from writing another user's document or session
**Plans**: 3 plans

Plans:
- [ ] 01-01-PLAN.md — Scaffold Vite+React+TS project, install Firebase SDK, define UserProfile type and Firebase singleton
- [ ] 01-02-PLAN.md — Firebase auth layer: Google sign-in (popup), user doc creation with timezone capture, AuthContext, ProtectedRoute, LoginPage
- [ ] 01-03-PLAN.md — Firestore security rules, ProfilePage (stats + social counts), end-to-end human verification

### Phase 2: Timer and Sessions
**Goal**: Users can track a focused study session from start to finish and have it permanently recorded with accurate duration
**Depends on**: Phase 1
**Requirements**: TIMR-01, TIMR-02, TIMR-03, TIMR-04, TIMR-05, TIMR-06, TIMR-07
**Success Criteria** (what must be TRUE):
  1. User can start a stopwatch timer, see elapsed time ticking in real time, and stop it to log a session
  2. User can start a Pomodoro timer with configurable work and break intervals, and it transitions automatically between work and break phases
  3. User can select or create a subject before or during a session (subjects created on the fly are persisted for future sessions)
  4. User can add an optional notes/memo after stopping a session before it is saved
  5. A logged session document contains subject, duration, start/end timestamps, notes, privacy level, and userId — and the elapsed time matches wall-clock time even if the tab was backgrounded
**Plans**: TBD

Plans:
(To be filled by plan-phase)

### Phase 3: Stats and Goals
**Goal**: Users can see exactly how much they have studied and track progress toward personal goals with streak continuity respected across timezones
**Depends on**: Phase 2
**Requirements**: STAT-01, STAT-02, STAT-03, STAT-04, STAT-05, STAT-06, GOAL-01, GOAL-02, GOAL-03, GOAL-04, GOAL-05, GOAL-06
**Success Criteria** (what must be TRUE):
  1. User can view an interactive study chart with time range filters (1D, 1W, 1M, 3M, All) and filter it by subject
  2. User can see a monthly heatmap calendar where each day's color reflects total study time that day
  3. User can see study time broken down by subject for any selected time range, plus an all-time cumulative total
  4. User's study streak (consecutive calendar days) is correct in their local timezone — a user in UTC+9 does not lose their streak at UTC midnight
  5. User can set a daily goal, weekly goal, and per-subject goals (each independently toggleable), and the home screen shows a progress bar toward the daily goal
**Plans**: TBD

Plans:
(To be filled by plan-phase)

### Phase 4: Social Graph
**Goal**: Users can build an asymmetric follow network that the feed will fan-out to
**Depends on**: Phase 3
**Requirements**: SOCL-01, SOCL-02, SOCL-03
**Success Criteria** (what must be TRUE):
  1. User can follow any other user without approval and the followed user's follower count increments atomically
  2. User can unfollow a user and the count decrements atomically
  3. User can view their own complete followers list and following list from their profile page
**Plans**: TBD

Plans:
(To be filled by plan-phase)

### Phase 5: Activity Feed and Privacy
**Goal**: Users can see a social feed of study sessions from people they follow, and session privacy is enforced server-side so private and followers-only data is never exposed
**Depends on**: Phase 4
**Requirements**: FEED-01, FEED-02, FEED-03, FEED-04, FEED-05, PRIV-01, PRIV-02
**Success Criteria** (what must be TRUE):
  1. User sees a scrollable feed of completed session cards from followed users, each showing avatar, display name, duration, subject, relative timestamp, and like count
  2. User can like a session (one like per user per session), and the like count updates immediately
  3. A private session is never visible in any other user's feed regardless of follow status
  4. A followers-only session is visible only to users who follow the session owner — this is enforced in Firestore security rules, not only in the UI
  5. An empty feed shows a suggested-follows call-to-action rather than a blank screen
**Plans**: TBD

Plans:
(To be filled by plan-phase)

### Phase 6: Live Presence
**Goal**: Followed users who are actively studying show a real-time "studying now" indicator that disappears reliably even if the browser crashes
**Depends on**: Phase 5
**Requirements**: PRES-01, PRES-02, PRES-03
**Success Criteria** (what must be TRUE):
  1. When a user starts a timer, a "studying now" live badge appears on their feed card for all followers who have the feed open
  2. The live badge disappears when the user stops their timer
  3. The live badge disappears automatically if the user closes their browser tab or loses network connection — it does not stay stuck as "live"
**Plans**: TBD

Plans:
(To be filled by plan-phase)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 0/3 | Not started | - |
| 2. Timer and Sessions | 0/TBD | Not started | - |
| 3. Stats and Goals | 0/TBD | Not started | - |
| 4. Social Graph | 0/TBD | Not started | - |
| 5. Activity Feed and Privacy | 0/TBD | Not started | - |
| 6. Live Presence | 0/TBD | Not started | - |
