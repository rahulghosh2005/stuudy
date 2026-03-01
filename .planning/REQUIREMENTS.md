# Requirements: stuuudy

**Defined:** 2026-03-01
**Core Value:** Make studying feel like a sport — personal performance data worth tracking, and a social feed that makes progress visible to the people who matter.

## v1 Requirements

### Authentication

- [ ] **AUTH-01**: User can sign in with Google via Firebase Auth
- [ ] **AUTH-02**: User's IANA timezone is captured and stored at first sign-in
- [ ] **AUTH-03**: User session persists across browser refresh

### Profile

- [ ] **PROF-01**: User profile displays stats summary (total study hours, current streak, subject breakdown)
- [ ] **PROF-02**: User profile displays follower count, following count, and browsable lists of each
- [ ] **PROF-03**: User display name and avatar are pulled from their Google account

### Timer & Sessions

- [ ] **TIMR-01**: User can start and stop a stopwatch-style timer to log a session
- [ ] **TIMR-02**: Timer uses anchor-time pattern (elapsed = Date.now() − startTimestamp) to prevent browser tab throttling drift
- [ ] **TIMR-03**: User can use a Pomodoro-style countdown timer with configurable work/break intervals
- [ ] **TIMR-04**: User selects a subject before or during a session (user-defined subjects, created on the fly)
- [ ] **TIMR-05**: User can add an optional notes/memo field after stopping a session
- [ ] **TIMR-06**: Stopping the timer logs a session document (subject, duration, startTimestamp, endTimestamp, notes, privacyLevel, userId)
- [ ] **TIMR-07**: Each session has a privacy setting (Public / Followers / Private) set before or at logging

### Stats

- [ ] **STAT-01**: User can view an interactive stats chart with time range filters (1D, 1W, 1M, 3M, All) — stock-ticker style
- [ ] **STAT-02**: Stats chart can be filtered by subject
- [ ] **STAT-03**: Selected time range shows total study time for that period
- [ ] **STAT-04**: Monthly heatmap calendar visualises daily study activity
- [ ] **STAT-05**: Subject breakdown shows time distribution across all subjects (for selected range)
- [ ] **STAT-06**: All-time cumulative study total is displayed

### Goals & Streaks

- [ ] **GOAL-01**: User has a study streak counter (consecutive calendar days with at least one logged session)
- [ ] **GOAL-02**: Streak day boundaries are calculated in the user's local timezone (not UTC)
- [ ] **GOAL-03**: User can set a daily study time goal (toggleable on/off)
- [ ] **GOAL-04**: User can set a weekly study time goal (toggleable on/off)
- [ ] **GOAL-05**: User can set subject-specific study goals (toggleable on/off per subject)
- [ ] **GOAL-06**: Daily goal progress bar is visible on the home/timer screen

### Social Graph

- [ ] **SOCL-01**: User can follow another user (asymmetric — no approval required)
- [ ] **SOCL-02**: User can unfollow a user
- [ ] **SOCL-03**: User can view their own followers list and following list

### Activity Feed

- [ ] **FEED-01**: User sees a scrollable vertical feed of completed sessions from users they follow
- [ ] **FEED-02**: Each feed card shows: user avatar, display name, "Studied X mins – Subject", relative timestamp, like count, like button
- [ ] **FEED-03**: Feed shows a "studying now" live indicator for followed users who are actively in a timer session
- [ ] **FEED-04**: User can like a session (one like per user per session)
- [ ] **FEED-05**: Privacy levels are enforced in the feed — private sessions are never shown; followers-only sessions require a verified follow relationship (enforced server-side in Firestore security rules)

### Live Presence

- [ ] **PRES-01**: When a user starts a timer, their presence status is written to Firebase Realtime Database as "studying"
- [ ] **PRES-02**: Presence clears automatically via RTDB onDisconnect() when browser closes or crashes
- [ ] **PRES-03**: Followed users with active presence show a live "studying now" badge in the feed

### Privacy & Security

- [ ] **PRIV-01**: Firestore security rules enforce session privacy for all three levels (Public / Followers / Private)
- [ ] **PRIV-02**: Followers-only session reads require the follow relationship to be verified inside Firestore security rules (not client-side)
- [ ] **PRIV-03**: Users can only create, edit, and delete their own sessions
- [ ] **PRIV-04**: Users can only write their own user document and presence record

## v2 Requirements

### Social Interactions

- **SOCL-V2-01**: User can comment on a session (threaded, with moderation)
- **SOCL-V2-02**: User can delete their own comments

### Notifications

- **NOTF-01**: User receives in-app notification when their session is liked
- **NOTF-02**: User receives in-app notification when a new user follows them
- **NOTF-03**: User can configure notification preferences

### Feed Enhancements

- **FEED-V2-01**: Feed backfills recent sessions when a user follows someone new

### Subjects

- **SUBJ-V2-01**: App ships with a predefined subject list as starting suggestions

## Out of Scope

| Feature | Reason |
|---------|--------|
| Comments in v1 | Adds moderation, threading, notification complexity — likes deliver the social loop; defer to v1.x |
| Push notifications | Chrome auto-revokes for over-notifying; interrupts studying; in-app only for v1 |
| Leaderboards | Creates winner-takes-all demotivation; deferred to future milestone |
| Groups / communities | Deferred to future milestone |
| Egg-hatching gamification | Deferred to future milestone (data model is gamification-ready) |
| Zoo / collectibles | Deferred to future milestone |
| Email/password auth | Google sign-in sufficient for v1; avoids password reset complexity |
| Native mobile app | Web-first; mobile-responsive web covers v1 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| AUTH-03 | Phase 1 | Pending |
| PROF-01 | Phase 1 | Pending |
| PROF-02 | Phase 1 | Pending |
| PROF-03 | Phase 1 | Pending |
| TIMR-01 | Phase 2 | Pending |
| TIMR-02 | Phase 2 | Pending |
| TIMR-03 | Phase 2 | Pending |
| TIMR-04 | Phase 2 | Pending |
| TIMR-05 | Phase 2 | Pending |
| TIMR-06 | Phase 2 | Pending |
| TIMR-07 | Phase 2 | Pending |
| STAT-01 | Phase 3 | Pending |
| STAT-02 | Phase 3 | Pending |
| STAT-03 | Phase 3 | Pending |
| STAT-04 | Phase 3 | Pending |
| STAT-05 | Phase 3 | Pending |
| STAT-06 | Phase 3 | Pending |
| GOAL-01 | Phase 3 | Pending |
| GOAL-02 | Phase 3 | Pending |
| GOAL-03 | Phase 3 | Pending |
| GOAL-04 | Phase 3 | Pending |
| GOAL-05 | Phase 3 | Pending |
| GOAL-06 | Phase 3 | Pending |
| SOCL-01 | Phase 4 | Pending |
| SOCL-02 | Phase 4 | Pending |
| SOCL-03 | Phase 4 | Pending |
| FEED-01 | Phase 5 | Pending |
| FEED-02 | Phase 5 | Pending |
| FEED-03 | Phase 5 | Pending |
| FEED-04 | Phase 5 | Pending |
| FEED-05 | Phase 5 | Pending |
| PRES-01 | Phase 6 | Pending |
| PRES-02 | Phase 6 | Pending |
| PRES-03 | Phase 6 | Pending |
| PRIV-01 | Phase 5 | Pending |
| PRIV-02 | Phase 5 | Pending |
| PRIV-03 | Phase 1 | Pending |
| PRIV-04 | Phase 1 | Pending |

**Coverage:**
- v1 requirements: 38 total
- Mapped to phases: 38
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-01*
*Last updated: 2026-03-01 after initial definition*
