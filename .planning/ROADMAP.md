# Roadmap: stuuudy

## Milestones

- ✅ **v1.0 MVP** — Phases 1–3 (shipped 2026-03-02)
- 🚧 **v1.1 Social** — Phases 4–6 (planned)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1–3) — SHIPPED 2026-03-02</summary>

- [x] Phase 1: Foundation (3/3 plans) — completed 2026-03-02
- [x] Phase 2: Timer and Sessions (3/3 plans) — completed 2026-03-02
- [x] Phase 3: Stats and Goals (5/5 plans) — completed 2026-03-02

Full archive: `.planning/milestones/v1.0-ROADMAP.md`

</details>

### 🚧 v1.1 Social (Phases 4–6)

#### Phase 4: Social Graph
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

#### Phase 5: Activity Feed and Privacy
**Goal**: Users can see a social feed of study sessions from people they follow, and session privacy is enforced server-side
**Depends on**: Phase 4
**Requirements**: FEED-01, FEED-02, FEED-03, FEED-04, FEED-05, PRIV-01, PRIV-02
**Success Criteria** (what must be TRUE):
  1. User sees a scrollable feed of completed session cards from followed users, each showing avatar, display name, duration, subject, relative timestamp, and like count
  2. User can like a session (one like per user per session), and the like count updates immediately
  3. A private session is never visible in any other user's feed regardless of follow status
  4. A followers-only session is visible only to users who follow the session owner — enforced in Firestore security rules
  5. An empty feed shows a suggested-follows call-to-action rather than a blank screen
**Plans**: TBD

Plans:
(To be filled by plan-phase)

#### Phase 6: Live Presence
**Goal**: Followed users who are actively studying show a real-time "studying now" indicator that disappears reliably even if the browser crashes
**Depends on**: Phase 5
**Requirements**: PRES-01, PRES-02, PRES-03
**Success Criteria** (what must be TRUE):
  1. When a user starts a timer, a "studying now" live badge appears on their feed card for all followers
  2. The live badge disappears when the user stops their timer
  3. The live badge disappears automatically if the user closes their browser tab or loses network connection
**Plans**: TBD

Plans:
(To be filled by plan-phase)

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v1.0 | 3/3 | Complete | 2026-03-02 |
| 2. Timer and Sessions | v1.0 | 3/3 | Complete | 2026-03-02 |
| 3. Stats and Goals | v1.0 | 5/5 | Complete | 2026-03-02 |
| 4. Social Graph | v1.1 | 0/TBD | Not started | - |
| 5. Activity Feed and Privacy | v1.1 | 0/TBD | Not started | - |
| 6. Live Presence | v1.1 | 0/TBD | Not started | - |
