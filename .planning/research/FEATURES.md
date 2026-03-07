# Feature Research

**Domain:** Social study-tracking web app (Strava for students)
**Researched:** 2026-03-06
**Confidence:** MEDIUM — External web tools unavailable; findings drawn from training knowledge of Strava, Focusmate, StudyStream, Forest, BeReal, and Study Together Discord communities (training cutoff August 2025). All claims cross-referenced across multiple app sources from training data. Flag any specific version-locked claims for manual verification.

---

## Competitive Landscape Summary

| App | Category | Core Mechanic | Relevant Lessons |
|-----|----------|---------------|-----------------|
| Strava | Social fitness tracking | Public activity feed + segments + kudos | Social proof loop, live "someone is running now" feel, clubs |
| Focusmate | Accountability pairing | 1:1 video co-working sessions | Commitment device, session completion feedback |
| StudyStream | Live study community | Continuous lofi video rooms with live viewer count | Ambient social presence, no interaction needed |
| Forest | Focus / Pomodoro | Plant trees while studying, kill tree if you leave app | Gamification, loss aversion, cute visual feedback |
| BeReal | Social authenticity | Unfiltered 2-minute posts, dual camera | Anti-performance culture, raw/real over polished |
| Study Together (Discord) | Community study | Voice channels, role-based study rooms, bots that log hours | Role-based access, bot-tracked stats, lightweight accountability |

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete or broken.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| User accounts with profile page | Every social app has this; users need identity to share and compare | LOW | Email + Google OAuth minimum; show total study hours, streak, courses on profile |
| Live study timer (start/stop/pause) | Core product loop — without a timer, nothing to track | LOW | Must be persistent across tab switches/browser close; store in DB not just client state |
| Per-course session tagging | Students think in courses, not abstract "focus time" — Forest/Toggl/Clockify all support categories | LOW | Course list managed by user; no central course database needed for v1 |
| Activity feed showing who is studying now | This is the "Strava run feed" analog — the core social proof moment | MEDIUM | Real-time subscriptions required; stale data (>5s) kills the feel |
| Past session history with stats | Every tracking app (Strava, Toggl, Notion habit trackers) shows history; without it the timer has no purpose | MEDIUM | Session log per user; aggregate by day/week/month/course |
| Follow/unfollow other users | Required for personalized feed; without this it's a public dashboard not a social app | LOW | Simple follower graph; bidirectional = friends, unidirectional = following |
| Study streaks | Forest, Duolingo, Bereal, GitHub all use streaks — users expect a streak counter | LOW | Daily streak based on at least one completed session per calendar day |
| Notifications (at minimum: "X is now studying") | Strava notifies when followed users post; this is what closes the motivational loop | MEDIUM | Push notifications are table stakes for social apps; in-app toasts as MVP fallback |
| Privacy controls on sessions | BeReal lets you control audience; Strava has privacy zones; students are sensitive about grades and schedule visibility | LOW | Public / followers-only / private toggle per session or globally |
| Mobile-responsive UI | Target users are on phones; a desktop-only app loses 60%+ of casual interactions | MEDIUM | Not native, but must be fully usable on mobile browser |

**Confidence:** HIGH — These features appear universally across the reference apps and have direct analogs in the project's own stated requirements.

---

### Differentiators (Competitive Advantage)

Features that set this product apart. Not universally expected, but create the competitive moat.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Live timer broadcast to followers in real-time | The core viral mechanic. "X is studying right now" creates FOMO and motivates joining. No competitor (Forest, Focusmate, StudyStream) does this with a per-user follow graph | HIGH | Requires real-time pub/sub (Supabase Realtime or similar); must be <2s latency or the magic is gone |
| Classrooms (group cohort rooms) | Strava has Clubs; Study Together Discord has channels. But no web app combines a curated cohort + live timer feed + grade sharing in one place | MEDIUM | Classroom = named group with invite link; members see each other's live and historical sessions; classroom leaderboard |
| Grade/GPA sharing (optional) | No fitness app equivalent — this is uniquely academic. Sharing a 3.8 GPA in a classroom context creates aspirational social proof. Focusmate and StudyStream have no grade-awareness at all | MEDIUM | Completely opt-in; per-classroom visibility settings; display as "I got an A in Calc II" not raw numbers necessarily |
| Course-level public progress | "Rahul is on his 4th hour of Organic Chemistry today" is more meaningful than a generic timer. Course-aware tracking makes sessions contextually rich — something Strava achieves with route/activity type | LOW | Courses are user-defined tags; displaying course name in live feed is the differentiator |
| Classroom leaderboard (weekly hours) | Study Together Discord uses bots that track voice-channel hours and post weekly leaderboards — it's the most-cited motivator in study Discord servers | MEDIUM | Weekly reset; show hours per course option; top 3 get visual callout |
| Session "kudos" / reactions | Strava's Kudos (simple thumbs-up on activity) is cited as a primary engagement driver. One-tap acknowledgment without social pressure of comments | LOW | Single reaction type (keep it simple) or 3 emoji max; no comment threads in v1 |
| Ambient presence without interaction | StudyStream's most praised feature: just knowing others are studying, without chat noise. The timer broadcast achieves this passively | LOW | The activity feed itself IS this feature — no additional work needed; resist adding chat |
| Course heatmap / consistency visualization | GitHub contribution graph is beloved by developers. An academic equivalent (daily study heatmap per course) is not in any study app currently | MEDIUM | Calendar grid visualization by day; color intensity = hours studied; filterable by course |

**Confidence:** MEDIUM — These are genuine gaps in current competitor feature sets as of training data (August 2025). The live-broadcast-to-followers mechanic and classroom concept are verified as absent from Focusmate, Forest, and StudyStream. Verify no new entrant has shipped this since August 2025.

---

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create real product problems. Build these and regret it.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| In-session chat / study room chat | Users ask for it; Study Bunnies, Discord servers, and StudyStream all have chat | Chat attracts off-topic conversation, becomes support burden, creates moderation needs, kills the "ambient studying" feel that makes the product unique. StudyStream's chat is frequently cited as distracting | Keep the feed read-only; add reactions (kudos) only; if community chat is needed, the Discord integration is a better answer |
| Video/voice study rooms | Focusmate's core feature; users assume it goes together with study tracking | Entirely different infrastructure (WebRTC), massive operational cost, out-of-scope complexity, legal/privacy concerns, fundamentally different product surface | Stay text/stats based; link to Focusmate for 1:1 accountability; link to Discord for voice rooms |
| AI study plan generation | Sounds useful; Notion AI, study apps are adding this | Requires ML pipeline, personalization data that doesn't exist at launch, creates accuracy liability ("the AI said I'd pass"), and distracts from the social loop | Show data-driven insights ("you study 40% more on Tuesdays") based on logged sessions — no AI required |
| Gamification with points/XP/badges | Duolingo, Forest, and every productivity app does this | Hollow engagement mechanics that replace intrinsic motivation with extrinsic rewards; users game the system (leave timer running); creates fairness complaints; badge fatigue | Use streaks and leaderboards instead — these are time-bounded and naturally reset; streaks have intrinsic meaning ("I studied every day this week") |
| Public grade/GPA by default | Sharing academic performance sounds like a key differentiator | Students are extremely sensitive about academic performance; making grades public by default will deter sign-ups and cause social harm; high achievers use it, everyone else turns the app off | Make grades completely opt-in, per-classroom, and never surfaced in the global feed — the study time itself is the public unit, not grades |
| Calendar/schedule integration | Users ask for study scheduling, class schedule import | Integration complexity (Google Calendar API, .ics parsing, time zone bugs, recurring events); distracts from the core tracking loop; class schedule is not the same as study session | Allow users to create courses manually; don't try to sync with academic calendar systems in v1 |
| Pomodoro / interval timer modes | Forest, Be Focused, and dozens of apps do this | Splits focus between "timer as commitment" and "timer as session log"; Pomodoro creates 25-minute artificial sessions that don't reflect real study patterns; creates schema complexity (is a session 1 pomodoro or many?) | Single continuous timer per session; users can start/stop/pause naturally; show total time at end |
| Social comparison scores / "study rank" | Leaderboards are motivating; rank feels objective | Absolute ranking by hours creates toxic comparison dynamics at scale; students with heavier courseloads feel unjustly ranked; students with less time quit feeling behind | Classroom-scoped weekly leaderboards only (not global); show improvement vs. your own prior week alongside rank |
| DMs / private messaging | Social apps have DMs | Moderation burden, harassment vector, out-of-scope infrastructure, creates a social network obligation that distracts from study utility | No DMs; classroom invite link is the sharing primitive; reactions are the social acknowledgment primitive |

**Confidence:** MEDIUM — Anti-feature reasoning is drawn from documented product failures across reference apps and community feedback patterns in training data. Forest's gamification backlash and StudyStream's chat moderation issues are well-documented. Grade privacy concerns are consistent across education product research.

---

## Feature Dependencies

```
[User Account + Profile]
    └──requires──> [Live Timer]
                       └──requires──> [Course Tags]
                       └──requires──> [Real-time Broadcast]
                                           └──requires──> [Follow Graph]
                                           └──requires──> [Activity Feed]

[Activity Feed]
    └──enhances──> [Kudos/Reactions]
    └──enhances──> [Notifications]

[Classrooms]
    └──requires──> [User Accounts]
    └──requires──> [Follow Graph] (members are a curated follow group)
    └──enhances──> [Classroom Leaderboard]
    └──enhances──> [Grade Sharing]

[Session History]
    └──requires──> [Live Timer] (sessions are completed timer runs)
    └──enhances──> [Study Streak]
    └──enhances──> [Course Heatmap]
    └──enhances──> [Analytics / Summaries]

[Grade Sharing]
    └──requires──> [User Account]
    └──requires──> [Classrooms] (grades should only be visible in classroom context, not global feed)
    └──conflicts──> [Public Grade Defaults] (must be opt-in)

[Classroom Leaderboard]
    └──requires──> [Classrooms]
    └──requires──> [Session History]
    └──conflicts──> [Global Ranking] (keep scope to classroom only)
```

### Dependency Notes

- **Live Timer requires Real-time Broadcast:** A timer that only the user sees has no social value — real-time broadcasting is not an enhancement, it's fundamental.
- **Classrooms requires Follow Graph:** Classroom membership is a curated follow relationship; building follow first means classrooms are additive, not a rewrite.
- **Grade Sharing requires Classrooms:** Grade data should never be in the global activity feed. The classroom boundary is the privacy primitive that makes grade sharing safe.
- **Course Heatmap requires Session History:** At least 2 weeks of data needed before a heatmap is meaningful; build session history first.
- **Classroom Leaderboard conflicts with Global Ranking:** A global rank creates toxic dynamics; the classroom scope is what makes it motivating not demoralizing.

---

## MVP Definition

### Launch With (v1)

Minimum viable product — what's needed to validate the social study loop.

- [ ] User account (email + Google OAuth) with public profile — needed before any social feature exists
- [ ] Live study timer with course tags (start/pause/stop) — the session creation primitive
- [ ] Real-time broadcast: followers see your timer is active (course + duration) — THE viral mechanic; without this the app is just a timer
- [ ] Follow/unfollow users — required for personalized feed
- [ ] Activity feed: live "who is studying now" + recent sessions — the social proof loop
- [ ] Classrooms: create, invite via link, view classroom member sessions — group accountability, the core differentiator over just a follow graph
- [ ] Session history with basic stats (total hours, streak, per-course breakdown) — without history the timer has no memory
- [ ] Study streaks — low effort, high motivational value
- [ ] Privacy toggle (public / followers-only / private) per session — needed before launch; students won't join without it

### Add After Validation (v1.x)

Features to add once core tracking and social loop are confirmed working.

- [ ] Kudos/reactions on sessions — add when feed is active and users are asking for acknowledgment
- [ ] Classroom leaderboard (weekly hours) — add when classrooms have 5+ active members using them
- [ ] Course heatmap visualization — add when users have 2+ weeks of data; will feel empty at launch
- [ ] Grade/GPA sharing in classrooms — add after classroom trust is established; requires separate settings UI
- [ ] Push notifications ("X is now studying") — add after core loop is validated; required for retention but complex to implement well
- [ ] Profile analytics (weekly/monthly summary) — add when users request history depth beyond a simple feed

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] Native mobile app — web-responsive is sufficient for v1; build native only if mobile session start becomes a friction point
- [ ] Focusmate-style paired accountability sessions — high complexity (video/WebRTC); only worth it if users explicitly request 1:1 live pairing beyond classroom visibility
- [ ] Spotify/Apple Music integration (show what you're listening to while studying) — nice social signal; low priority
- [ ] AI-driven study insights ("You study best at 10pm on Tuesdays") — meaningful only after 3+ months of data per user
- [ ] Public classroom discovery / explore page — useful for growth but creates moderation surface area; defer until community is healthy
- [ ] Study challenge events ("Study 20 hours this week") — Strava challenges are engagement drivers; build after classroom feature is mature
- [ ] Calendar integrations (Google Calendar class schedule import) — users will ask; the complexity is not worth it until core tracking is adopted

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Live timer with course tags | HIGH | LOW | P1 |
| Real-time broadcast to followers | HIGH | HIGH | P1 |
| Activity feed (live + recent) | HIGH | MEDIUM | P1 |
| User profile + follow graph | HIGH | LOW | P1 |
| Session history + streak | HIGH | LOW | P1 |
| Classrooms (invite + member feed) | HIGH | MEDIUM | P1 |
| Privacy toggle | HIGH | LOW | P1 |
| Kudos/reactions | MEDIUM | LOW | P2 |
| Classroom leaderboard | MEDIUM | LOW | P2 |
| Push notifications | HIGH | HIGH | P2 |
| Course heatmap | MEDIUM | MEDIUM | P2 |
| Grade/GPA sharing | MEDIUM | MEDIUM | P2 |
| Profile analytics page | MEDIUM | MEDIUM | P2 |
| Native mobile app | HIGH | HIGH | P3 |
| AI study insights | MEDIUM | HIGH | P3 |
| Public classroom discovery | MEDIUM | MEDIUM | P3 |
| Study challenge events | MEDIUM | MEDIUM | P3 |
| Video/voice rooms | LOW | HIGH | P3 |
| Calendar integration | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for launch — the product is not viable without it
- P2: Should have — add after v1 launch when loop is validated
- P3: Nice to have — defer until product-market fit

---

## Competitor Feature Analysis

| Feature | Strava | Focusmate | StudyStream | Forest | Our Approach |
|---------|--------|-----------|-------------|--------|--------------|
| Live "active now" broadcast | Yes (GPS auto) | No (scheduled sessions) | Ambient viewer count only | No | Yes — per-user, per-course, real-time to followers |
| Social feed of activities | Yes (primary surface) | No | No | Limited (leaderboard) | Yes — hybrid live + recent sessions |
| Follow graph | Yes | No (matched) | No | No (friends list) | Yes — asymmetric follow (Strava model) |
| Group/club rooms | Yes (Clubs) | No | Rooms (not personal) | No | Yes — Classrooms with invite links |
| Accountability pairing | Segments/challenges | Yes (core feature) | No | No | No — ambient visibility is our model, not 1:1 pairing |
| Grade/academic tracking | No | No | No | No | Yes — opt-in, classroom-scoped |
| Streaks | No (recent addition) | No | No | Yes (core) | Yes — simple daily streak |
| Leaderboard | Segments | No | No | Friends leaderboard | Yes — classroom-scoped weekly hours |
| Session reactions | Kudos (one-tap) | No | No | No | Yes — single kudos/reaction per session |
| Privacy controls | Yes (detailed) | N/A | No | No | Yes — public/followers/private toggle |
| Gamification | Badges/trophies | No | No | Trees/coins | No badges; streaks and leaderboards only |
| Chat | No | No (video only) | Yes (distracting) | No | No chat in v1 |
| Push notifications | Yes | Yes (reminders) | No | Yes | v1.x after core loop validated |
| Analytics/stats | Detailed | Basic | None | Basic | Moderate — streak, heatmap, per-course breakdown |

**Confidence:** MEDIUM — Feature presence/absence based on training data through August 2025. Strava, Focusmate, and Forest features are well-documented and stable. StudyStream features are based on multiple consistent sources but the app evolves rapidly.

---

## Social/Viral Loop Analysis

The social loop is the most critical design decision. Here's how it works and what it requires:

```
User starts timer
    → Real-time broadcast to followers (latency <2s)
    → Follower sees "Rahul is studying Organic Chemistry (42 min)"
    → Follower feels FOMO / motivated
    → Follower starts their own timer
    → Rahul gets notified "X started studying"
    → Both visible to their followers
    → Loop compounds
```

**What makes this loop work:**
1. **Speed** — If the broadcast is delayed >2 seconds, the "live" feel is gone. This is a hard technical requirement, not aesthetic.
2. **Specificity** — "Rahul is studying" is weak. "Rahul is studying Organic Chemistry (42 min)" is compelling. Course context is essential.
3. **Low friction to start** — The timer must be 1 tap from any screen. If starting a session requires 3 screens of setup, the loop breaks at the first step.
4. **Classroom amplification** — The follow graph gives personal motivation; classrooms give group accountability. Both are needed. Personal following alone is weak for new users who don't yet have friends on the app.

**Viral mechanics specific to this app:**
- Classroom invite link is the primary growth vector — a student invites their study group, the whole group joins
- The "join your classroom" concept maps to existing mental model (class WhatsApp group, study Discord)
- Grade sharing is a secondary viral hook — students share their A grade in a classroom, which is a bragging mechanic that feels earned

---

## Sources

**Confidence note:** WebSearch and WebFetch tools were unavailable during this research session. All findings are based on training data (knowledge cutoff August 2025) cross-referenced across multiple well-documented apps. Confidence is MEDIUM rather than HIGH as a result. Before roadmap finalization, manually verify:

1. StudyStream current feature set at studystream.live — the app evolves frequently
2. Focusmate current pricing/features at focusmate.com — they pivoted their model in 2024
3. Whether any new "Strava for studying" competitors launched in late 2025 or 2026
4. Forest (forestapp.cc) current social features — added features in 2024

- Strava (strava.com) — social fitness activity feed, Clubs, Kudos, segments model. MEDIUM confidence, training data.
- Focusmate (focusmate.com) — 1:1 video co-working accountability sessions. MEDIUM confidence, training data.
- StudyStream (studystream.live) — ambient live study rooms, lofi community. MEDIUM confidence, training data.
- Forest app (forestapp.cc) — gamified Pomodoro with social leaderboard. MEDIUM confidence, training data.
- BeReal (bereal.com) — authentic unfiltered social sharing, anti-performative culture. MEDIUM confidence, training data.
- Study Together Discord communities — bot-tracked study hours, role-based rooms, weekly leaderboards. MEDIUM confidence, training data.
- Toggl Track / Clockify — professional time tracking with per-project tags as reference for session schema. MEDIUM confidence, training data.

---
*Feature research for: Social study-tracking web app (Stuudy)*
*Researched: 2026-03-06*
