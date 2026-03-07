# Roadmap: Stuudy

## Overview

Stuudy is built in 7 phases that follow a strict dependency order: foundation before features, timer integrity before social, presence before the full follow graph, and UI polish last when the data model is stable. Each phase delivers a coherent, verifiable capability. The viral mechanic — seeing a friend studying live — is the product bet, and Phase 3 validates it early enough to course-correct before the full social layer is built.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation + Auth + Onboarding** - Auth, profiles, full DB schema with RLS, and classroom-first onboarding flow
- [ ] **Phase 2: Core Session Loop** - Courses CRUD, server-anchored timer, heartbeat, zombie cleanup, session history
- [ ] **Phase 3: Real-Time Presence + Live Feed** - Centralized channel manager, Presence broadcast, live feed with <2s latency
- [ ] **Phase 4: Social Graph + Full Feed** - Follow system, user search, historical activity feed, public profiles
- [ ] **Phase 5: Classrooms + Grades** - Group rooms with invite links, per-classroom presence, grade/GPA with privacy controls
- [ ] **Phase 6: Analytics** - Study heatmap, streaks, course breakdowns, profile stats (built on real session data)
- [ ] **Phase 7: UI Polish Pass** - Framer Motion animations, dynamic backgrounds, dark mode, full mobile responsiveness

## Phase Details

### Phase 1: Foundation + Auth + Onboarding
**Goal**: Users can create accounts, set up their profiles, and complete an onboarding flow that puts them inside a classroom before they ever see their feed — eliminating the cold-start churn problem from day one.
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, PROF-01, PROF-02, PROF-03, PROF-04, PROF-05, ONBD-01, ONBD-02, ONBD-03
**Success Criteria** (what must be TRUE):
  1. User can sign up with email/password and sign in with Google OAuth, with session persisting across browser refreshes
  2. User can reset a forgotten password via email link and sign out from any page
  3. New user is guided through: create profile (name, username, avatar, bio, school) → add courses → create or join a classroom → start first session — with no blank screens at any step
  4. Empty states across the app are motivating (show what activity looks like) rather than blank
  5. All database tables exist with RLS policies enforced — a logged-out request or cross-user request for private data returns nothing
**Plans**: TBD

### Phase 2: Core Session Loop
**Goal**: Users can track study sessions with a timer whose truth is owned by the server, with automatic cleanup of abandoned sessions, so session data is reliable enough to build every downstream social and analytics feature on top of.
**Depends on**: Phase 1
**Requirements**: COUR-01, COUR-02, COUR-03, COUR-04, SESS-01, SESS-02, SESS-03, SESS-04, SESS-05, SESS-06, SESS-07
**Success Criteria** (what must be TRUE):
  1. User can create, color-code, archive, and delete courses, and see all their courses on their profile
  2. User can start a study session by selecting a course and pressing a timer — the start time is set server-side and cannot be manipulated from the client
  3. User can end a session and the duration is computed server-side as ended_at minus started_at
  4. A session with no heartbeat for more than 2 hours is automatically closed — a tab crash does not leave a zombie session running indefinitely
  5. User can view their full session history in both list and calendar views, with optional notes on completed sessions
**Plans**: TBD

### Phase 3: Real-Time Presence + Live Feed
**Goal**: When a user starts their study timer, their followers can see them studying live within 2 seconds — the core viral mechanic is functional, reliable, and validated with real traffic.
**Depends on**: Phase 2
**Requirements**: LIVE-01, LIVE-02, LIVE-03, LIVE-04, LIVE-05
**Success Criteria** (what must be TRUE):
  1. When a user starts a timer, their live status (course name + elapsed time, updating live) appears in their followers' feeds within 2 seconds
  2. When a user ends their session, they disappear from the live feed within 2 seconds
  3. All Realtime channels are managed by a single centralized channel manager — no per-component channel creation; navigating the app does not leak connections
  4. If the WebSocket connection drops, the client reconnects gracefully without a page refresh
  5. Private account presence is never broadcast to non-followers — follow-graph filtering is enforced before any presence entry is rendered
**Plans**: TBD

### Phase 4: Social Graph + Full Feed
**Goal**: Users can follow and discover each other, and the activity feed shows both the live "studying now" overlay and a historical session scroll from everyone they follow.
**Depends on**: Phase 3
**Requirements**: SOCL-01, SOCL-02, SOCL-03, SOCL-04, SOCL-05
**Success Criteria** (what must be TRUE):
  1. User can follow another user, and that user's live sessions immediately appear in the follower's live feed
  2. User can unfollow a user, and that user's sessions stop appearing in the feed
  3. User can see a list of everyone they follow and everyone who follows them
  4. User can search for other users by display name or username and view their public profile
  5. User can see an activity feed of recent (historical) sessions from users they follow, with the live "studying now" layer overlaid on top
**Plans**: TBD

### Phase 5: Classrooms + Grades
**Goal**: Users can create named group rooms, invite cohorts via a shareable link, and see each other's live and past sessions in a shared space — with grade/GPA logging that defaults private and never leaks through broadcast channels.
**Depends on**: Phase 4
**Requirements**: ROOM-01, ROOM-02, ROOM-03, ROOM-04, ROOM-05, ROOM-06, ROOM-07, ROOM-08, GRADE-01, GRADE-02, GRADE-03, GRADE-04, GRADE-05
**Success Criteria** (what must be TRUE):
  1. User can create a named classroom and generate a shareable invite link; any user with the link can join the classroom
  2. Classroom members can see each other's live study sessions (with the same <2s latency as the main feed) and each other's past session history
  3. Classroom creator can remove members; any member can leave; a user can be in multiple classrooms simultaneously
  4. User can log grades for individual assessments and their overall GPA — grades default to private and never appear in Supabase Broadcast payloads
  5. User can set grade visibility to private, followers only, or classroom only — and the setting is enforced at the database layer via RLS
**Plans**: TBD

### Phase 6: Analytics
**Goal**: Users can see meaningful visualizations of their study history — streaks, heatmaps, course breakdowns — built on real accumulated session data so edge cases (timezone boundaries, gaps, minimum durations) behave correctly.
**Depends on**: Phase 5
**Requirements**: ANLX-01, ANLX-02, ANLX-03, ANLX-04, ANLX-05
**Success Criteria** (what must be TRUE):
  1. User can see total study time per course as a bar chart on their analytics page
  2. User can see a GitHub-style weekly study heatmap where intensity reflects actual study minutes per day
  3. User can see their current streak (consecutive study days) and their longest ever streak
  4. User can see their average daily study time over the past 30 days
  5. A user's public profile shows a summary of their study stats (visible to anyone who can view that profile)
**Plans**: TBD

### Phase 7: UI Polish Pass
**Goal**: The app looks and feels premium — Notion-inspired typography, Apple-quality spring animations, frosted glass cards, dynamic backgrounds, full dark mode, and a mobile layout that works on any screen — without any blank loading states.
**Depends on**: Phase 6
**Requirements**: UI-01, UI-02, UI-03, UI-04, UI-05, UI-06, UI-07
**Success Criteria** (what must be TRUE):
  1. All page transitions and interactive elements (session start, feed card appear/disappear, timer start) use Framer Motion spring animations with variants defined outside components
  2. Dynamic gradient backgrounds shift based on time-of-day and active study state
  3. The live feed and session cards use frosted glass card components
  4. The app is fully usable on a 375px mobile screen — no horizontal scroll, no clipped content, no broken layouts
  5. Dark mode is supported and toggleable; all async content shows skeleton loading states before data arrives
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation + Auth + Onboarding | 0/TBD | Not started | - |
| 2. Core Session Loop | 0/TBD | Not started | - |
| 3. Real-Time Presence + Live Feed | 0/TBD | Not started | - |
| 4. Social Graph + Full Feed | 0/TBD | Not started | - |
| 5. Classrooms + Grades | 0/TBD | Not started | - |
| 6. Analytics | 0/TBD | Not started | - |
| 7. UI Polish Pass | 0/TBD | Not started | - |
