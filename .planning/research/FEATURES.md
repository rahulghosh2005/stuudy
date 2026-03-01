# Feature Research

**Domain:** Study tracking + social productivity app (Strava-style)
**Researched:** 2026-03-01
**Confidence:** MEDIUM — Reference apps (YPT, Forest, Toggl, Strava, BeReal) analyzed via official stores, developer blogs, and community sources. Some behavioral claims from secondary sources, flagged where LOW confidence.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Stopwatch timer (start / pause / stop) | Every study timer app has this as its #1 primitive. No timer = no product. | LOW | Single tap to start. Big, prominent display. Elapsed time in HH:MM:SS. |
| Pomodoro-style countdown timer | YPT, Forest, Focusmate, StudyStream all offer this. Students expect configurable intervals (not locked to 25 min). | LOW-MEDIUM | User sets work interval + break interval. Auto-starts break timer. Configurable per session. |
| Subject / tag labeling per session | YPT's core affordance — every session must be labeled so stats are meaningful. Without it, stats are useless. | LOW | Subject picker before or during session. Predefined list + ability to add custom subjects. |
| Today's total study time on home screen | YPT, Toggl, and every study tracker surface a daily total prominently. Users glance at it constantly. | LOW | Must be the first number users see. Updates in real time while timer runs. |
| Session history / log | Toggl's entire model is this. Users expect to scroll back and see every past session. | LOW-MEDIUM | List view by date. Shows subject, duration, timestamp. Tap to see session detail (notes, etc.). |
| Weekly activity chart | GitHub-style or bar chart. Standard in study and fitness trackers (Toggl, Strava). | MEDIUM | Bar chart showing daily totals for current week. Previous-week comparison is a nice addition but not required. |
| Monthly heatmap calendar | YPT uses this; GitHub made it a cultural norm. Users expect it for study apps. | MEDIUM | Color intensity = hours studied that day. Calendar grid. Tap a day to see that day's sessions. |
| Subject breakdown / time by subject | Toggl's primary stats view. Without per-subject breakdown, tracking subjects is pointless. | MEDIUM | Pie chart or ranked list. Shows % and absolute time per subject for selected period. |
| Daily study streak counter | Duolingo normalized this. Users expect it in any productivity/study app. | LOW | Consecutive days studied. Visible on home screen. Reset if no session logged on a given day. |
| Study goal setting (daily / weekly) | YPT, Forest, and every serious productivity app offer goal targets. Users set a goal and track progress toward it. | LOW-MEDIUM | User sets a target (e.g., 4 hrs/day). Progress bar fills as they study. Toggleable — can be off. |
| User profile with stats summary | Strava's profile is the benchmark. Users expect to see their stats on their own profile page. | MEDIUM | Avatar, name, total study hours, streak, follower/following counts, recent session history. |
| Social follow graph (asymmetric) | Strava's model — follow anyone publicly, no approval. Twitter-style. | MEDIUM | Follow / unfollow. Follower list, following list. Following someone causes their sessions to appear in your feed. |
| Activity feed of followed users | Strava's core UX paradigm. Users expect to see what people they follow are doing. | HIGH | Feed cards: avatar, name, "Studied X mins — Subject", timestamp, like/comment. Chronological, pull-to-refresh. |
| Like / kudos on sessions | Strava's "Kudos" (14B+ in 2025) proves this is table stakes for any activity-based social product. | LOW | One-tap reaction. Instant feedback (icon fills, count ticks up). |
| Comments on sessions | Strava, YPT groups all have this. Social accountability without comments feels shallow. | MEDIUM | Threaded or flat comment thread per session. Push notification on new comment (v1.x). |
| Session privacy controls (Public / Followers / Private) | Strava has "Everyone / Followers / Only You." Users trust platforms that give them control. Without this, privacy-sensitive users won't log sessions. | MEDIUM | Per-session setting. Default can be set globally in Settings. Private sessions invisible to all others. |
| Google Sign-In auth | Standard for consumer web apps in 2026. Users expect one-tap login — email/password signup feels archaic and creates friction. | LOW | Firebase Auth with Google provider. No email/password in v1. |

---

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Live "studying now" presence in feed | YPT does this in groups. BeReal does ephemeral presence. Strava doesn't do live activity in the social feed. Seeing a friend actively studying creates immediate social pressure and motivation — the "body-doubling effect" without video. | MEDIUM | Feed card variant: "Alice is studying right now — Organic Chemistry (12 min in)". Requires real-time Firestore subscription. Disappears when session ends and becomes a completed card. |
| Strava-aesthetic for studying | No existing study app has Strava's dark, athletic, performance-data aesthetic. YPT is functional but visually bland. Forest is playful/gamified. A study tracker that looks like a serious athlete's training log is genuinely novel. | LOW (design) / MEDIUM (execution) | Dark-first, high-contrast, orange accent. Big bold numbers. Card-based feed. Investment in visual polish is the differentiator, not technical complexity. |
| Subject-specific goals with per-subject progress | YPT tracks time per subject but doesn't surface per-subject goals prominently. A user studying for multiple exams needs to see "2.3h / 3h goal — Maths" not just total time. | MEDIUM | Goal setting per subject. Progress ring or bar per subject. Surfaced on home screen or stats page. |
| Optional notes / memo on completed session | Toggl allows notes. YPT does not prominently feature this. A brief post-session memo ("finally understood integration by parts") makes the feed card more interesting to followers, increasing social engagement. | LOW | Text field after stopping timer. Character limit (e.g., 200 chars). Displays on feed card and profile. |
| Clean athletic data aesthetic with no gamification clutter | Forest and competitors lean into gamification visuals (trees, eggs, monsters). Users who find that infantilizing have no premium alternative. stuuudy's athletic aesthetic is a differentiator for serious students. | LOW (design decision) | Explicit design constraint: no playful illustrations, no cartoon characters in v1. Typography-led design. |
| Profile as performance portfolio | Strava profiles are used to show off training records. A study profile with cumulative hours, top subjects, and longest streak acts as a credibility signal — students can share profiles with study groups or mentors. | LOW-MEDIUM | Shareable profile URL (or screenshot-friendly layout). Not required for v1 but the data foundation should be laid. |

---

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems. Explicitly out of scope for v1.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Leaderboards / rankings | YPT has real-time rankings. Competitive students want to know how they rank. | Creates winner-takes-all dynamics. Users who fall behind disengage entirely. Ranks lower users feel demotivated, which is the opposite of the product's purpose. Also requires ranking infra and edge-case handling (same score, ties, time zones). | Replace with: personal records ("Your longest session ever", "Best week this year"). Peer comparison stays in the feed (you see Alice studied 4h today) without explicit ranking. |
| Push notifications ("Your friend is studying!") | Social nudges feel compelling as a feature spec. | Notification fatigue is real and worsening (Chrome auto-revokes permissions for over-notifying apps in 2025). Interrupting a user studying to tell them someone else is studying is actively harmful. Users will kill notifications entirely, permanently. | Use in-app indicators only. The feed refresh shows who's live. Don't push-notify about others' activity in v1. Opt-in notifications only. |
| Gamification visuals (eggs, trees, animals) | Forest's 50M+ downloads make this look like a proven playbook. Users suggest it constantly. | Gamification aesthetics undermine the athletic/serious brand. Forest's gamification is its entire product thesis. Bolting cartoon trees onto a Strava-aesthetic app would be incoherent. The overjustification effect: external rewards (points, badges) reduce intrinsic motivation over time. | If gamification is added, it should be a separate future milestone with its own design language. v1 = clean data. v2 = optional gamification layer. |
| Group study rooms / video co-studying | StudyStream and Focusmate do this. Users familiar with those platforms will request it. | Video co-studying is a completely different product category with WebRTC infra, moderation requirements, and a totally different session paradigm (you can't have a private solo session in a video room). It would balloon scope by 10x. | The "live studying" presence indicator in the feed gives the accountability benefit without video. It's the lightweight version of body-doubling. |
| Direct messaging / inbox | Social apps naturally evolve toward DMs. Users will request it. | DMs require moderation infra, block/report flows, abuse vectors, and notification management. For v1, none of this is necessary — comments on sessions provide sufficient social interaction. | Comments on sessions serve the same accountability loop. Add DMs post-PMF if data shows users needing private communication. |
| Unlimited subject tags / complex tag hierarchy | Power users want to organize by subject > topic > subtopic. | Hierarchical tagging is a product design rabbit hole. It adds UI complexity everywhere (selector, stats breakdown, filtering) and the marginal benefit is low for most users. | Flat subject list. Max 20–30 subjects per user. Users can rename/delete. No nesting. Covers 95% of use cases. |
| Streak freeze / makeup sessions | Duolingo's streak freeze is heavily requested by users of any streak mechanic. | In v1, streaks are a motivational signal, not a product commitment. Adding freeze mechanics before seeing how users actually interact with streaks is premature optimization. It also complicates the streak calculation logic. | Ship with simple streaks. Monitor drop-off patterns after streak breaks. Add freeze as a v1.x feature if data shows streak loss causes churn. |
| Email/password auth | Some users don't have Google accounts (niche). | Password reset flows, email verification, security burden. Not worth the engineering overhead for v1 when Google auth covers the vast majority of target users (students are overwhelmingly Google-account users). | Google Sign-In only in v1. Add Apple Sign-In as a second option in v1.x if iOS usage warrants it. |
| Offline mode with sync | Users who travel or have poor connectivity request this. | Firestore has limited offline support but real-time feed sync while offline creates complex conflict resolution. A timer that runs offline but syncs a session later sounds simple but requires careful Firestore offline rules + timestamp reconciliation. | Timer works in-browser regardless (JS runs offline). Firestore offline persistence can be enabled as a low-effort partial solution. Full offline-first architecture is v2. |

---

## Feature Dependencies

```
[Google Auth]
    └──required by──> [User Profile]
                          └──required by──> [Social Follow Graph]
                                                └──required by──> [Activity Feed]
                                                                      └──enhanced by──> [Live "Studying Now" Presence]

[Stopwatch Timer]
    └──required by──> [Session Creation]
                          └──required by──> [Session History]
                          └──required by──> [Subject Breakdown Stats]
                          └──required by──> [Streak Counter]
                          └──required by──> [Activity Feed Cards]
                          └──required by──> [Daily / Weekly / Subject Goals]

[Subject / Tag System]
    └──required by──> [Subject Breakdown Stats]
    └──required by──> [Subject-Specific Goals]
    └──required by──> [Feed Card Display] (shows subject on card)

[Session Privacy Controls]
    └──required by──> [Activity Feed] (must filter by privacy before displaying)
    └──required by──> [Profile History] (private sessions hidden from profile visitors)

[Pomodoro Timer]
    └──parallel to──> [Stopwatch Timer] (different mode, same session output)

[Like / Kudos]
    └──required by──> [Comments] (socially, comments without likes feels odd — but technically independent)

[Activity Feed]
    └──enhanced by──> [Like / Kudos]
    └──enhanced by──> [Comments]
    └──enhanced by──> [Live "Studying Now" Presence]
```

### Dependency Notes

- **Auth required before everything:** Firebase Auth gates all user-specific data. Ship auth in Phase 1 before any other feature.
- **Timer → Session is the core loop:** Nothing in stats, social, or goals works without sessions being created. Timer is Phase 1.
- **Social Graph required before Feed:** You can't show a feed until users can follow others. Follow graph must exist before feed is built.
- **Privacy Controls required before Feed goes live:** Displaying sessions in a feed without privacy controls is a trust violation. Privacy must ship with the feed, not after.
- **Pomodoro is parallel, not dependent:** Can be added to the timer in Phase 1 or deferred to Phase 2 without blocking anything.
- **Stats are independent of Social:** Stats (heatmap, subject breakdown, goals) can be built before or after social features. They depend only on sessions existing.

---

## MVP Definition

### Launch With (v1)

Minimum viable product — validates the core thesis: "studying feels like a sport when tracked and shared."

- [x] **Google Auth** — gates everything; must be first
- [x] **Stopwatch timer with subject tagging** — the core session creation loop; without this there is no product
- [x] **Session history log** — users need to see their past sessions immediately; otherwise the timer feels disposable
- [x] **Today's total + streak counter on home screen** — the "daily score" that creates the habit loop
- [x] **Weekly bar chart + monthly heatmap** — validates the "performance data worth tracking" thesis
- [x] **Subject breakdown stats** — validates that labeling sessions is worth the friction
- [x] **Daily goal with progress indicator** — gives the home screen a compelling reason to revisit
- [x] **User profile with stats** — required for social features to be meaningful
- [x] **Asymmetric follow graph** — prerequisite for the feed
- [x] **Activity feed (completed sessions from followed users)** — the core social differentiator; without this it's just Toggl
- [x] **Live "studying now" presence in feed** — the single biggest differentiator over existing apps; ships with v1
- [x] **Like / kudos on sessions** — minimum social engagement primitive; trivial to build, high value
- [x] **Session privacy controls (Public / Followers / Private)** — trust requirement; must ship with feed
- [x] **Pomodoro timer** — expected by the target audience; relatively low complexity; ships with v1

### Add After Validation (v1.x)

Features to add once core is working and user behavior is understood.

- [ ] **Comments on sessions** — trigger: users are liking sessions and there's no way to respond; comment volume will indicate demand
- [ ] **Notes / memo on session** — trigger: users request it, or feed cards look sparse without context
- [ ] **Subject-specific goals** — trigger: data shows users have unequal subject distribution and want per-subject targets
- [ ] **Streak freeze / grace period** — trigger: churn analysis shows streak loss causes app abandonment
- [ ] **Apple Sign-In** — trigger: iOS user share grows; Apple may require it for apps using third-party social login
- [ ] **Shareable profile URL** — trigger: users screenshot profiles to share; give them a cleaner mechanism

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] **Leaderboards** — defer: requires ranking infra and creates disengagement for non-top users; only viable once community is large enough that competition is meaningful
- [ ] **Egg-hatching / gamification layer** — defer: brand decision; incompatible with v1 aesthetic; separate milestone
- [ ] **Groups / communities** — defer: requires moderation, discovery, and group feed logic; scope is 3x social features
- [ ] **Push notifications** — defer: notification fatigue risk outweighs benefit in v1; add post-PMF with strong opt-in UX
- [ ] **Native mobile apps (iOS / Android)** — defer: web-first validates concept; native adds cost without changing core hypothesis
- [ ] **Offline-first architecture** — defer: Firestore offline persistence covers light offline use; full offline sync is v2 engineering work
- [ ] **Direct messaging** — defer: comments serve v1 social needs; DMs require moderation infra

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Google Auth | HIGH | LOW | P1 |
| Stopwatch timer + subject tag | HIGH | LOW | P1 |
| Session history log | HIGH | LOW | P1 |
| Today's total + streak on home | HIGH | LOW | P1 |
| Weekly bar chart | HIGH | LOW-MEDIUM | P1 |
| Monthly heatmap calendar | HIGH | MEDIUM | P1 |
| Subject breakdown stats | HIGH | MEDIUM | P1 |
| Daily goal + progress bar | HIGH | LOW | P1 |
| Pomodoro timer | MEDIUM-HIGH | LOW-MEDIUM | P1 |
| User profile with stats | HIGH | MEDIUM | P1 |
| Asymmetric follow graph | HIGH | MEDIUM | P1 |
| Activity feed (completed sessions) | HIGH | MEDIUM-HIGH | P1 |
| Live "studying now" in feed | HIGH | MEDIUM | P1 |
| Like / kudos | MEDIUM-HIGH | LOW | P1 |
| Session privacy controls | HIGH | MEDIUM | P1 |
| Comments on sessions | MEDIUM | MEDIUM | P2 |
| Notes / memo on session | MEDIUM | LOW | P2 |
| Subject-specific goals | MEDIUM | MEDIUM | P2 |
| Streak freeze | MEDIUM | LOW | P2 |
| Shareable profile URL | LOW-MEDIUM | LOW | P2 |
| Leaderboards | MEDIUM | HIGH | P3 |
| Gamification layer | LOW (v1 brand conflict) | HIGH | P3 |
| Groups / communities | MEDIUM | HIGH | P3 |
| Push notifications | MEDIUM | MEDIUM | P3 |
| Native mobile apps | MEDIUM | HIGH | P3 |
| Direct messaging | MEDIUM | HIGH | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

---

## Competitor Feature Analysis

| Feature | Yeolpumta (YPT) | Forest | Strava | BeReal | stuuudy approach |
|---------|-----------------|--------|--------|--------|-----------------|
| Timer modes | Stopwatch + Pomodoro | Countdown only (gamified) | GPS activity recorder | N/A (camera) | Stopwatch + Pomodoro |
| Subject tagging | Yes — core feature | No (forest categories) | Activity type (run, ride) | No | Yes — required per session |
| Social feed | Group-based (not open follow graph) | Friend forest (passive) | Open asymmetric follow, rich feed | Friend network, daily BeReal | Open asymmetric follow, Strava-style feed |
| Live presence | Yes — group members see active timers | Shared forest timer | No | Yes — 2-min capture window | Yes — "studying now" in feed cards |
| Likes / kudos | Not prominently featured | Not featured | Kudos (central mechanic — 14B in 2025) | RealMoji (photo reactions) | Simple like/kudos |
| Comments | Not prominently featured | Not featured | Yes | Yes | v1.x |
| Stats / heatmap | Color-coded calendar heatmap, subject breakdown | Cumulative tree count, session history | Segment analysis, personal records, training load | Minimal | Heatmap + weekly chart + subject breakdown |
| Gamification | Rankings, group competition | Tree growth, badges, real-tree planting | Segments, trophies, challenges | Ephemeral authenticity | None in v1; athletic aesthetic only |
| Privacy controls | Basic (not Strava-level) | N/A (individual or friend group) | Everyone / Followers / Only You | Friends only | Public / Followers / Private per session |
| Aesthetic | Functional, bland | Playful, nature-themed | Dark, athletic, performance-data | Authentic/raw, lo-fi | Dark, athletic, Strava-orange accents |
| Platform | Mobile native (iOS + Android) | Mobile native | Mobile native + web | Mobile native | Web-first (mobile responsive) |

---

## Timer UX Patterns: Specific Findings

Based on analysis of YPT, Forest, Focusmate, and StudyStream:

**What works:**
- Big, single-tap start button at center of home screen (all apps converge on this)
- Elapsed time shown in large typography — the number must be readable at a glance
- Subject selection before starting reduces friction vs. selecting after (users forget to tag when prompted post-session)
- Pause is important — students need bathroom breaks; penalizing pauses creates anxiety
- Session summary screen after stopping (duration, subject, option to add notes) gives closure and encourages reflection

**What causes friction:**
- Mandatory pre-session setup (task lists, detailed planning) — users want to start immediately; complex setup is abandoned
- Timers that can't be paused (Forest's model where leaving kills the tree) — creates anxiety and is unsuitable for study vs. phone avoidance use case
- Tiny stop button — accidental stops are frustrating; require a confirm gesture or hold-to-stop

**Pomodoro specifics:**
- Default: 25 min work / 5 min break is expected; but configurable is required
- Auto-start of break timer is preferred over manual confirmation
- Users expect a sound or vibration at interval boundaries
- Long break (15–20 min) after every 4 Pomodoros is the standard expectation

---

## Social Feed Patterns: Specific Findings

Based on Strava, YPT, and activity feed design research:

**Card anatomy (what every card needs):**
- Avatar + display name (link to profile)
- Session summary: "Studied [X] hours [Y] minutes — [Subject]"
- Timestamp (relative: "2 hours ago")
- Like/kudos action
- Comment count / comment action
- Privacy indicator (subtle) if not public

**Live "studying now" card variant:**
- Label: "[Name] is studying now" with a pulsing indicator
- Show: subject, elapsed time (updates periodically — not necessarily real-time; every 60s is fine)
- No like/comment on a live session (it's not a completed record yet)
- Transitions to a completed card when session ends, at which point reactions become available

**Feed ordering:**
- Chronological (reverse) is standard and expected; algorithmic feeds are for much larger social networks
- Live sessions float to the top of the feed (or have a dedicated "live now" section)
- Pull-to-refresh is the standard update mechanism; real-time Firestore listener handles live indicators without requiring full refresh

**Empty state (new user):**
- Most critical moment: a new user's feed is empty
- Show a "suggested users to follow" prompt immediately; without it, the feed looks broken
- Must be designed alongside the follow graph feature

---

## Sources

- [YPT — Google Play Store listing](https://play.google.com/store/apps/details?id=com.pallo.passiontimerscoped&hl=en) — MEDIUM confidence
- [How to Develop App Like YPT — mycloudpulse.com](https://mycloudpulse.com/blog/develop-app-like-ypt/) — MEDIUM confidence (secondary analysis)
- [Focumon: YeolPumTa Alternative comparison](https://www.focumon.com/on/yeolpumta) — MEDIUM confidence (competitor framing, biased)
- [Yawns, Pains, and Tears: On YPT — Raffles Press, 2025](https://rafflespress.com/2025/02/13/yawns-pains-and-tears-on-ypt/) — MEDIUM confidence (user perspective)
- [Forest Gamification Case Study — Trophy, 2025](https://trophy.so/blog/forest-gamification-case-study) — MEDIUM confidence
- [Forest App Review — primeproductiv4.com](https://www.primeproductiv4.com/apps-tools/forestapp-review) — LOW confidence (single review)
- [Strava Activity Privacy Controls — Strava Support](https://support.strava.com/hc/en-us/articles/216919377-Activity-Privacy-Controls) — HIGH confidence (official)
- [Strava Live Activities on iOS — Strava Support](https://support.strava.com/hc/en-us/articles/39508401687693-Strava-Live-Activities-on-iOS) — HIGH confidence (official)
- [Strava Kudos: 14B interactions in 2025 — StriveCloud](https://www.strivecloud.io/blog/app-engagement-strava) — MEDIUM confidence
- [Activity Feed Design — GetStream.io](https://getstream.io/blog/activity-feed-design/) — MEDIUM confidence
- [BeReal Wikipedia](https://en.wikipedia.org/wiki/BeReal) — HIGH confidence
- [StudyStream features — app.studystream.live](https://app.studystream.live/) — MEDIUM confidence
- [Focusmate Review 2025 — dailymindboost.com](https://dailymindboost.com/focusmate-review-2025/) — MEDIUM confidence
- [Psychology of Hot Streak Game Design — UX Magazine](https://uxmag.com/articles/the-psychology-of-hot-streak-game-design-how-to-keep-players-coming-back-every-day-without-shame) — MEDIUM confidence
- [Designing Streaks for Long-Term User Growth — MindTheProduct](https://www.mindtheproduct.com/designing-streaks-for-long-term-user-growth/) — MEDIUM confidence
- [Toggl Track Features — toggl.com](https://toggl.com/track/features/) — HIGH confidence (official)
- [Best Focus Apps Ranked by Real Users 2025 — focus-dividend.com](https://www.focus-dividend.com/best-focus-apps-ranked/) — LOW confidence (opinion)
- [Notification Fatigue — Magicbell](https://www.magicbell.com/blog/fighting-back-against-alert-overload) — MEDIUM confidence

---

*Feature research for: Strava-style study tracking social app (stuuudy)*
*Researched: 2026-03-01*
