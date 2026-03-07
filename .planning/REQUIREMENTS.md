# Requirements: Stuudy

**Defined:** 2026-03-06
**Core Value:** The moment you start your study timer, your followers can see you studying live — making studying social, visible, and motivating.

## v1 Requirements

### Authentication

- [ ] **AUTH-01**: User can sign up with email and password
- [ ] **AUTH-02**: User can sign in with Google (OAuth)
- [ ] **AUTH-03**: User session persists across browser refresh
- [ ] **AUTH-04**: User can reset password via email link
- [ ] **AUTH-05**: User can sign out from any page

### Profile

- [ ] **PROF-01**: User can create a profile with display name, username, and avatar
- [ ] **PROF-02**: User can write a short bio
- [ ] **PROF-03**: User can set their university/school
- [ ] **PROF-04**: User can view any other user's public profile
- [ ] **PROF-05**: User can set profile to public or private

### Courses

- [ ] **COUR-01**: User can create named courses (e.g., "CMPUT 291", "Biology 101")
- [ ] **COUR-02**: User can assign a color to each course
- [ ] **COUR-03**: User can archive/delete courses
- [ ] **COUR-04**: User can see all their courses on their profile

### Session Timer

- [ ] **SESS-01**: User can start a study session by selecting a course and pressing a timer
- [ ] **SESS-02**: Session start time is anchored server-side (cannot be manipulated client-side)
- [ ] **SESS-03**: User can end a session — duration is computed server-side
- [ ] **SESS-04**: Session heartbeat pings server every 30s to mark session alive
- [ ] **SESS-05**: Sessions with no heartbeat for >2h are automatically closed (zombie cleanup)
- [ ] **SESS-06**: User can add optional notes to a completed session
- [ ] **SESS-07**: User can view their full session history (list + calendar view)

### Real-Time Presence

- [ ] **LIVE-01**: When a user starts a timer, their live status broadcasts to all followers within 2 seconds
- [ ] **LIVE-02**: Live feed shows: who is studying, which course, elapsed time (updated live)
- [ ] **LIVE-03**: When a user ends their session, they disappear from the live feed within 2 seconds
- [ ] **LIVE-04**: Centralized Supabase Realtime channel manager — no per-component channel creation
- [ ] **LIVE-05**: Graceful reconnection if WebSocket connection drops

### Social Graph

- [ ] **SOCL-01**: User can follow other users
- [ ] **SOCL-02**: User can unfollow users
- [ ] **SOCL-03**: User can see a list of who they follow and who follows them
- [ ] **SOCL-04**: User can search for other users by name or username
- [ ] **SOCL-05**: User can view an activity feed of recent sessions from users they follow

### Classrooms

- [ ] **ROOM-01**: User can create a named classroom
- [ ] **ROOM-02**: User can generate a shareable invite link for a classroom
- [ ] **ROOM-03**: Any user with the invite link can join the classroom
- [ ] **ROOM-04**: Classroom members can see each other's live study sessions
- [ ] **ROOM-05**: Classroom members can see each other's past session history
- [ ] **ROOM-06**: Classroom creator can remove members
- [ ] **ROOM-07**: User can leave a classroom
- [ ] **ROOM-08**: User can be a member of multiple classrooms

### Grades & GPA

- [ ] **GRADE-01**: User can log grades for individual assessments per course
- [ ] **GRADE-02**: User can log their overall GPA
- [ ] **GRADE-03**: Grades default to private visibility
- [ ] **GRADE-04**: User can set grade visibility to: private, followers only, or classroom only
- [ ] **GRADE-05**: Grade data never flows through Supabase Broadcast channels (RLS enforced)

### Analytics

- [ ] **ANLX-01**: User can see total study time per course (bar chart)
- [ ] **ANLX-02**: User can see a weekly study heatmap (GitHub-style calendar)
- [ ] **ANLX-03**: User can see their current and longest study streak (days)
- [ ] **ANLX-04**: User can see average daily study time over the past 30 days
- [ ] **ANLX-05**: User's public profile shows a summary of their study stats

### UI & Design

- [ ] **UI-01**: Design language: Notion-inspired typography + Apple-style interactions
- [ ] **UI-02**: Dynamic gradient backgrounds that shift based on time-of-day and active study state
- [ ] **UI-03**: Framer Motion spring animations on all page transitions and interactive elements
- [ ] **UI-04**: Frosted glass card components for the live feed and session cards
- [ ] **UI-05**: Full mobile responsiveness (web-first, no native app)
- [ ] **UI-06**: Dark mode support
- [ ] **UI-07**: Skeleton loading states for all async content

### Onboarding

- [ ] **ONBD-01**: New user is directed to create/join a classroom before seeing their feed (cold-start mitigation)
- [ ] **ONBD-02**: Onboarding flow: create profile → add courses → create or join a classroom → start first session
- [ ] **ONBD-03**: Empty state UI is motivating, not blank (shows what the feed looks like with activity)

---

## v2 Requirements

### Engagement

- **ENGJ-01**: Kudos — single-tap reaction on a completed session (Strava mechanic)
- **ENGJ-02**: Classroom leaderboard — weekly study time ranking within a classroom
- **ENGJ-03**: Session comments — leave a comment on a friend's completed session

### Notifications

- **NOTF-01**: Push notification when a followed user starts studying
- **NOTF-02**: In-app notification when someone follows you
- **NOTF-03**: Weekly summary email digest
- **NOTF-04**: User can configure notification preferences

### Advanced Analytics

- **ADVX-01**: Compare study time with a specific friend or classroom
- **ADVX-02**: Predicted study hours for upcoming exam week (based on history)
- **ADVX-03**: Per-course grade correlation with study hours

### Sharing

- **SHAR-01**: User can export session stats as a shareable image (Instagram story format)

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Native iOS/Android app | Web-first; responsive mobile web sufficient for v1 — much faster to ship |
| In-session video/voice rooms | Different product surface; high infra complexity; not core to study loop |
| In-session text chat | Creates noise in classrooms; documented failure mode in StudyStream |
| Gamification (badges, XP, global ranking) | Documented fatigue in Forest; distracts from intrinsic motivation loop |
| Default-public grade sharing | Toxic without classroom trust boundary established first |
| AI study recommendations | No data to train on at v1; revisit after session history accumulates |
| Calendar integrations | Nice-to-have; not core to MVP value loop |
| Payments / premium tier | Ship free first; validate retention before monetizing |
| Content moderation tools | Not needed until community reaches problematic scale |

---

## Traceability

*Updated after roadmap creation: 2026-03-06*

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| AUTH-03 | Phase 1 | Pending |
| AUTH-04 | Phase 1 | Pending |
| AUTH-05 | Phase 1 | Pending |
| PROF-01 | Phase 1 | Pending |
| PROF-02 | Phase 1 | Pending |
| PROF-03 | Phase 1 | Pending |
| PROF-04 | Phase 1 | Pending |
| PROF-05 | Phase 1 | Pending |
| ONBD-01 | Phase 1 | Pending |
| ONBD-02 | Phase 1 | Pending |
| ONBD-03 | Phase 1 | Pending |
| COUR-01 | Phase 2 | Pending |
| COUR-02 | Phase 2 | Pending |
| COUR-03 | Phase 2 | Pending |
| COUR-04 | Phase 2 | Pending |
| SESS-01 | Phase 2 | Pending |
| SESS-02 | Phase 2 | Pending |
| SESS-03 | Phase 2 | Pending |
| SESS-04 | Phase 2 | Pending |
| SESS-05 | Phase 2 | Pending |
| SESS-06 | Phase 2 | Pending |
| SESS-07 | Phase 2 | Pending |
| LIVE-01 | Phase 3 | Pending |
| LIVE-02 | Phase 3 | Pending |
| LIVE-03 | Phase 3 | Pending |
| LIVE-04 | Phase 3 | Pending |
| LIVE-05 | Phase 3 | Pending |
| SOCL-01 | Phase 4 | Pending |
| SOCL-02 | Phase 4 | Pending |
| SOCL-03 | Phase 4 | Pending |
| SOCL-04 | Phase 4 | Pending |
| SOCL-05 | Phase 4 | Pending |
| ROOM-01 | Phase 5 | Pending |
| ROOM-02 | Phase 5 | Pending |
| ROOM-03 | Phase 5 | Pending |
| ROOM-04 | Phase 5 | Pending |
| ROOM-05 | Phase 5 | Pending |
| ROOM-06 | Phase 5 | Pending |
| ROOM-07 | Phase 5 | Pending |
| ROOM-08 | Phase 5 | Pending |
| GRADE-01 | Phase 5 | Pending |
| GRADE-02 | Phase 5 | Pending |
| GRADE-03 | Phase 5 | Pending |
| GRADE-04 | Phase 5 | Pending |
| GRADE-05 | Phase 5 | Pending |
| ANLX-01 | Phase 6 | Pending |
| ANLX-02 | Phase 6 | Pending |
| ANLX-03 | Phase 6 | Pending |
| ANLX-04 | Phase 6 | Pending |
| ANLX-05 | Phase 6 | Pending |
| UI-01 | Phase 7 | Pending |
| UI-02 | Phase 7 | Pending |
| UI-03 | Phase 7 | Pending |
| UI-04 | Phase 7 | Pending |
| UI-05 | Phase 7 | Pending |
| UI-06 | Phase 7 | Pending |
| UI-07 | Phase 7 | Pending |

**Coverage:**
- v1 requirements: 59 total
- Mapped to phases: 59
- Unmapped: 0

**Phase breakdown:**
- Phase 1 (Foundation + Auth + Onboarding): AUTH-01–05, PROF-01–05, ONBD-01–03 — 13 requirements
- Phase 2 (Core Session Loop): COUR-01–04, SESS-01–07 — 11 requirements
- Phase 3 (Real-Time Presence + Live Feed): LIVE-01–05 — 5 requirements
- Phase 4 (Social Graph + Full Feed): SOCL-01–05 — 5 requirements
- Phase 5 (Classrooms + Grades): ROOM-01–08, GRADE-01–05 — 13 requirements
- Phase 6 (Analytics): ANLX-01–05 — 5 requirements
- Phase 7 (UI Polish Pass): UI-01–07 — 7 requirements

---
*Requirements defined: 2026-03-06*
*Last updated: 2026-03-06 after roadmap creation*
