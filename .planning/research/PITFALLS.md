# Pitfalls Research

**Domain:** Strava-style study tracking social app (Firebase/Firestore, React, web-first)
**Researched:** 2026-03-01
**Confidence:** HIGH (Firestore pitfalls verified against official docs + multiple community sources; timer and streak pitfalls MEDIUM from community sources)

---

## Critical Pitfalls

### Pitfall 1: Timer Drift via setInterval Counting

**What goes wrong:**
The timer accumulates seconds by incrementing a counter on each `setInterval` tick. Browsers throttle `setInterval` to ~1 second or slower in background/inactive tabs (Chrome throttles after 30s, Firefox uses a time budget). A user who tabs away for 10 minutes and comes back will see a timer that ran slow or even paused. Worse, if they switch back and the count is wrong, the session duration logged to Firestore will be understated — corrupting their stats and streak data.

**Why it happens:**
Developers reach for `setInterval(() => setSeconds(s => s + 1), 1000)` because it reads naturally. They test in the foreground where it's accurate and ship it. Background throttling is not obvious until a user reports "my timer stopped."

**How to avoid:**
Never count ticks. Store `startTimestamp = Date.now()` when the timer starts and derive elapsed time from wall-clock difference on each tick: `elapsed = Date.now() - startTimestamp`. The interval is only used to trigger re-renders, not to accumulate state. Use the Page Visibility API (`document.addEventListener('visibilitychange', ...)`) to handle tab switches — when the tab becomes visible again, recalculate elapsed from the stored start time. Persist `startTimestamp` to `localStorage` so the timer survives page refreshes.

**Warning signs:**
- Timer tests only pass when the developer tab stays focused
- Session durations occasionally come in significantly shorter than expected
- Users report "timer froze when I switched tabs"

**Phase to address:**
Phase: Timer & Sessions (core timer implementation). Build timestamp-based elapsed time from day one — retrofitting is painful because the bug is subtle and tests pass in normal conditions.

---

### Pitfall 2: Firestore Fan-Out Write Costs for Activity Feed

**What goes wrong:**
When a user completes a session, the naive approach writes the session to their own collection and then fan-out writes a copy to every follower's feed document. This is O(followers) writes per session. At small scale this is fine. As the app grows, a user with 500 followers triggers 500 Firestore writes per session — at $0.18/100k writes, this is negligible individually, but amplified across many active users it compounds fast. More critically, Firestore has a soft limit of ~1 write/sec per document, and the fan-out approach can cause bursts that hit quota errors.

**Why it happens:**
Fan-out is the standard Firestore social feed pattern and it works well at small scale. Developers implement it, it passes all tests at 5 followers, and the cost model only becomes visible at 50+ active users.

**How to avoid:**
For V1 with an expected small user base (under 1,000 users, followers per user under 100), fan-out via Cloud Functions triggered on session write is acceptable. The key is to defer the fan-out to a Cloud Function (not the client) so user-perceived latency is not affected. Design the feed query as a fallback: if the user has many followers later, switch to a "pull" model — query sessions from followed-user IDs directly (with `IN` query, max 30 IDs, paginated). Document this scaling seam now so it is not a surprise rewrite later.

**Warning signs:**
- Cloud Function logs show fan-out operations taking >5s
- Firebase billing dashboard shows write counts growing faster than user growth
- Users with many followers see slower session-save response times

**Phase to address:**
Phase: Social Feed — design the Firestore schema to support both push (fan-out) and pull (query by followed user IDs) patterns. The schema decision made here determines the cost trajectory.

---

### Pitfall 3: Firestore Security Rules Enforcing "Followers Only" Privacy

**What goes wrong:**
The app has three session privacy levels: Public, Followers, Private. It is tempting to handle privacy in the frontend by filtering what is displayed, rather than enforcing it in Firestore Security Rules. A user can then query Firestore directly (using the Firebase SDK, Postman, or browser dev tools) and read all sessions regardless of privacy setting. This is a real vulnerability — confirmed by research showing that apps relying on client-side filtering for privacy enforcement are trivially bypassed.

**Why it happens:**
Security rules are unintuitive to write and test. Checking "does the requesting user follow the session owner?" requires a get() call inside security rules, which is expensive (each get() in a rule costs a read) and hard to get right. Developers defer it to "figure out later" and it never gets fixed.

**How to avoid:**
Store session privacy as a field (`privacy: "public" | "followers" | "private"`). In security rules, enforce: Private sessions: only owner can read. Public: anyone authenticated can read. Followers-only: use `get(/databases/$(database)/documents/follows/$(ownerId)_$(request.auth.uid)).data.exists == true` inside the rule to verify the follow relationship. Test rules using the Firebase Rules Playground before shipping. Accept that the get() in the rule costs one read per query against a followers-only session — this is the correct tradeoff for real security.

**Warning signs:**
- Privacy is only enforced in React component render logic (`if session.privacy === 'private' return null`)
- No Firestore rule tests exist for the privacy field
- A logged-in non-follower can successfully query another user's `followers-only` sessions via `db.collection('sessions').where('userId', '==', uid).get()`

**Phase to address:**
Phase: Auth & Privacy — write and test Firestore security rules in parallel with the privacy UI. Do not ship session creation before rules are verified.

---

### Pitfall 4: Streak Calculation Breaks on Timezone and Midnight Edge Cases

**What goes wrong:**
Streaks are calculated server-side or client-side using UTC timestamps. A user in UTC+9 (Tokyo) who studies at 11 PM local time is actually in the "next UTC day." If the streak logic checks whether a session occurred "today" using UTC dates, Tokyo users will have their sessions counted for the wrong day, breaking their streak unexpectedly. Daylight saving time transitions create 23-hour and 25-hour days, further corrupting "consecutive day" calculations. LeetCode, freeCodeCamp, and Duolingo all have documented user complaints about exactly this class of bug.

**Why it happens:**
Developers store `createdAt: serverTimestamp()` in UTC (correct), then compute "did the user study today?" by comparing `new Date().toDateString()` or UTC day boundaries — which ignores the user's local timezone. The bug is invisible during development if the developer is in UTC or UTC-adjacent timezones.

**How to avoid:**
Store the user's IANA timezone string (e.g., `"Asia/Tokyo"`) in their profile document, captured from `Intl.DateTimeFormat().resolvedOptions().timeZone` during signup. All streak calculations must convert UTC timestamps to the user's local timezone before determining what "calendar day" a session occurred on. Use a date library that handles DST correctly (date-fns-tz or Temporal API when available). Consider a 30-minute grace period past midnight to prevent streaks breaking due to clock edge cases.

**Warning signs:**
- Streak tests only run in UTC or with hardcoded UTC dates
- User timezone is not stored in the Firestore user document
- Streak calculation uses `new Date().toDateString()` or `new Date().getUTCDate()` for "today" comparisons

**Phase to address:**
Phase: Stats & Goals — before shipping streak display, capture user timezone at signup and write streak calculation functions with explicit timezone-aware logic. Write unit tests for UTC+9, UTC-5, and DST transition days.

---

### Pitfall 5: Presence ("Studying Live") Implemented Naively in Firestore

**What goes wrong:**
The "studying live" indicator — showing followers that a user is actively in a session — requires real-time presence. A naive implementation writes `isStudying: true` to the user document when a session starts and `isStudying: false` when it stops. This fails silently: if the user closes the browser tab, crashes the app, or loses connectivity, the session stop code never runs, leaving them stuck as "studying live" forever.

**Why it happens:**
Setting a field on session start/stop feels obvious and simple. The failure mode (crash/disconnect) is not exercised in happy-path development.

**How to avoid:**
Use Firebase Realtime Database's built-in `onDisconnect()` handler to clear the presence state on connection loss — this runs server-side even when the client disconnects unexpectedly. The recommended pattern is: write presence to Realtime Database (not Firestore), use `onDisconnect()` to auto-clear it, and mirror the presence state into Firestore via a Cloud Function trigger if needed for consistency. This is documented in the official Firebase presence guide. For V1, consider whether "live studying" truly needs to be real-time at sub-second latency or whether a simpler "last seen studying" timestamp is sufficient — the latter avoids the presence problem entirely.

**Warning signs:**
- Presence state is stored in a Firestore document field updated by client code only
- No `onDisconnect()` handler exists
- Testing presence only involves normal session stop, not browser close or network kill
- Users appear as "studying live" indefinitely after closing the app

**Phase to address:**
Phase: Social Feed — the "studying live" indicator must be designed with a crash-safe approach from the start. It cannot be retrofitted onto a document-field approach without a schema migration.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Client-side privacy filtering instead of Firestore rules | Faster to build, rules are complex | Any authenticated user can bypass privacy, data breach risk | Never — rules must be enforced server-side |
| Storing like count as a field on session document | Dead simple to increment | Firestore 1 write/sec limit causes contention on popular posts; write conflicts | Only if likes per session are expected to be < 5/sec at peak, otherwise use distributed counter or aggregation query |
| Fan-out from client (not Cloud Function) | No Cloud Function cold start latency | If client disconnects mid-fan-out, follower feeds are partially updated; no retry logic | Never for production — always fan-out server-side |
| Storing all sessions in a single flat collection (`/sessions`) | Simple queries | Cannot enforce per-user read rules efficiently; pagination is expensive without composite indexes | Acceptable for MVP if composite indexes are created upfront |
| Using `setInterval` tick counting for elapsed time | Obvious, easy to write | Timer drifts in background tabs; session durations inaccurate | Never — timestamp-diff approach has the same complexity |
| Hardcoding timezone as UTC for streak calculation | No timezone complexity | Streaks break for users outside developer's timezone | Only acceptable for single-user internal tool |
| Enabling Firestore test mode for development and forgetting to change it | Fast initial setup | All data publicly readable/writable, security incident waiting to happen | Only in local emulator, never in production |

---

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Firebase Auth (Google Sign-In) | Reading `user.displayName` as the canonical username, not persisting it to Firestore | On first sign-in, write a `/users/{uid}` document with `displayName`, `photoURL`, `email`, `timezone`, `createdAt` — the Auth profile can change but your app data should be the source of truth |
| Firestore Security Rules | Testing rules manually via the console rather than automated rule tests | Use Firebase Emulator Suite with `@firebase/rules-unit-testing` to write automated rule tests for all privacy scenarios before deploying |
| Firestore `serverTimestamp()` | Using `new Date()` (client clock) for session timestamps | Always use `serverTimestamp()` for `createdAt` on sessions — client clocks can be wrong, manipulated, or in wrong timezone |
| Firebase Realtime Database (presence) | Skipping it and using Firestore for presence because "we already have Firestore" | Realtime Database `onDisconnect()` is the only reliable way to clear presence state on crash/disconnect — it cannot be replicated in Firestore |
| Firestore Emulator | Connecting production app to emulator accidentally | Always gate emulator connection behind environment variable; never deploy code that auto-connects to emulator |

---

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Listening to entire user session collection in real-time for feed | Firebase billing spikes, slow initial feed load, memory growth | Query only the last N sessions, use cursor-based pagination, add real-time listener only for new items since last fetch | ~500 total sessions across all followed users |
| Offset-based pagination instead of cursor-based | Firestore still reads and bills all skipped documents, slow page loads | Use `startAfter(lastDocument)` cursor, never use `.offset()` | Any pagination beyond page 1 |
| Re-fetching full follower list on every feed refresh | N reads per refresh where N = number of followed users | Cache the following list in local state/localStorage, only re-fetch on follow/unfollow actions | 20+ followed users |
| Real-time listeners on every visible component | Listener count grows with UI complexity, unsubscribing is missed on unmount causing memory leaks | Centralize listeners in a context/store layer, always unsubscribe in useEffect cleanup, use `.get()` for data that does not need live updates | 5+ simultaneous listeners |
| Like counter as a single-document field with no rate limiting | Contention errors on documents with rapidly incrementing likes | Use Firestore `FieldValue.increment()` (atomic, handles concurrent writes correctly) for like count; for viral posts consider distributed counters | Sustained >1 like/sec on a single session document |

---

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Privacy enforced only in client-side React rendering | Any authenticated user can query private/followers-only sessions directly via SDK | Enforce privacy in Firestore Security Rules with `get()` calls to verify follow relationship; test with non-follower accounts |
| User document writable by the user and also contains role/privilege fields | User can escalate their own privileges by writing to their document | Separate user-writable fields (`displayName`, `timezone`, `bio`) from system-written fields (`isAdmin`, `followersCount`, `streakCount`) into separate documents or use field-level rules |
| No budget alert configured in Firebase | Runaway reads/writes (e.g., from a bug in a Cloud Function loop) can generate a large bill before detection | Set a Firebase billing budget alert at $10/month as the first action after project creation |
| Firestore rules left in test mode past initial setup | All data is publicly readable and writable; confirmed attack vector used in real breaches (150 Firebase instances found open in 2025 research) | Switch to production rules immediately; use the Emulator Suite for local development |
| Trusting client-supplied user ID in session documents | Malicious user can write sessions attributed to another user's ID | Enforce `request.auth.uid == request.resource.data.userId` in write rules for the sessions collection |
| Feed queries returning sessions the requester is not authorized to see | Privacy leak via list queries | Ensure Firestore rules block reads on individual documents and list queries alike — list query security is separate from document security in Firestore |

---

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Timer resets on page refresh (state only in React) | User loses an in-progress session on accidental refresh | Persist timer start timestamp and running state to localStorage on every tick; restore on mount |
| Streak count shows "0" immediately after midnight even if user studied earlier that day | User feels punished for studying late the previous night; creates a false sense of failure | Calculate streak from yesterday's sessions if today has none yet; only break streak if yesterday and today both have no sessions |
| No confirmation before stopping an ongoing timer | Accidental stop loses session data permanently | Show a confirmation dialog or undo toast on stop; give 5-second undo window |
| "Like" action optimistically updated then reverted on error with no feedback | User clicks like, it flips, then silently reverts — feels like a bug | Show a brief error toast on like failure; keep optimistic update until error is confirmed |
| Feed loads all sessions upfront with no pagination | First load is slow as data grows; browser memory increases | Load 10-20 sessions initially, infinite scroll to load more using Firestore cursor pagination |
| Stats screen shows no data for users with < 1 week of sessions | New users see empty charts and feel the app is broken | Show placeholder/skeleton states for empty charts with "Start your first session" CTA |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Timer:** Timer displays correctly — but verify: does it survive tab switch? Does it persist through page refresh? Does it accurately record duration if the user closes and reopens the tab mid-session?
- [ ] **Session save:** Session saves to Firestore — but verify: does the security rule reject a session where `userId != request.auth.uid`? Is `serverTimestamp()` used (not client `new Date()`)?
- [ ] **Streak display:** Streak shows on home screen — but verify: is it calculated in the user's local timezone? Does it handle the DST transition day? Does it handle a user who studies just before and just after midnight?
- [ ] **Privacy:** Private sessions are hidden in the feed — but verify: can a logged-in non-follower query the sessions collection directly and retrieve followers-only sessions? Test this with the Firebase SDK console.
- [ ] **Follow/unfollow:** Follow button works — but verify: does unfollowing immediately remove the followed user's sessions from the feed, or does the feed still show stale data?
- [ ] **Presence:** "Studying live" indicator appears — but verify: does it clear if the user closes the browser without stopping the timer? Test by starting a session and killing the tab.
- [ ] **Like count:** Like increments visually — but verify: is it using `FieldValue.increment()` (atomic) or reading the current count, adding 1, and writing back (race condition)?
- [ ] **Feed pagination:** Feed shows sessions — but verify: does pagination use document cursors (`startAfter(doc)`) not offset? Does adding a new listener for new sessions avoid re-reading all existing sessions?
- [ ] **Security rules:** Rules are deployed — but verify: run the Firebase Rules Playground against all privacy scenarios (anonymous user, logged-in non-follower, logged-in follower, owner) for all collection paths.

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Timer drift discovered post-launch | LOW | Deploy fix (timestamp-based elapsed time), users lose only their current in-flight sessions — historical data is unaffected because session duration is written on stop |
| Fan-out costs exceed budget | MEDIUM | Write a one-time Cloud Function migration to switch to pull-based feed model; update security rules; update client query logic — schema was designed for this so no data migration needed if done upfront |
| Privacy rules discovered missing | HIGH | Immediately lock down rules (deny all, then add back read permissions carefully); audit Firestore logs for unauthorized reads; notify affected users if sensitive data was exposed |
| Streak data corrupted by timezone bug | MEDIUM | Calculate correct streaks server-side from raw session timestamps with correct timezone; write corrected streak values back to user documents; communicate the fix to users |
| Presence state stuck as "studying live" | LOW | Write a Cloud Function that runs every 15 minutes to clear `isStudying: true` where the last session ended more than 30 minutes ago as a fallback cleanup |
| "Test mode" Firestore rules discovered in production | CRITICAL | Emergency: deploy locked-down rules immediately; rotate any sensitive data that may have been exposed; check Firestore audit logs |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Timer drift via setInterval | Timer & Sessions | Unit test: start timer, mock tab visibility change to hidden for 5 minutes, verify elapsed time within 1s of actual elapsed |
| Fan-out cost explosion | Social Feed (schema design) | Document the write-count formula; estimate cost at 100/1000/10k active users before implementing |
| "Followers only" privacy bypass | Auth & Privacy | Firebase Rules unit test: non-follower query against followers-only session returns permission-denied |
| Streak timezone bug | Stats & Goals | Unit tests with timezone-aware date math covering UTC+9, UTC-5, and DST transition day |
| Naive presence (stuck "live") | Social Feed (live indicator) | Integration test: start session, kill tab process, verify presence clears within 60s |
| Session document writable by wrong user | Auth & Privacy | Rule test: user A cannot write a session with userId = user B's uid |
| Budget runaway from unmonitored listeners | Social Feed | Set Firebase billing alert before building feed; document listener lifecycle in component |
| Offset-based pagination | Social Feed | Code review checklist: reject any use of `.offset()` in Firestore queries |
| Denormalized username staleness | Auth & Profile | Test: user changes displayName, verify that feed cards update within reasonable time (either immediately via batch write or on next session post) |

---

## Sources

- [Firebase Firestore Best Practices (Official)](https://firebase.google.com/docs/firestore/best-practices) — MEDIUM confidence (page structure confirmed, full content not loaded)
- [Fix Insecure Rules — Firebase Official](https://firebase.google.com/docs/firestore/security/insecure-rules) — HIGH confidence
- [Build Presence in Cloud Firestore — Firebase Official](https://firebase.google.com/docs/firestore/solutions/presence) — HIGH confidence
- [Firestore Distributed Counters — Firebase Official](https://firebase.google.com/docs/firestore/solutions/counters) — HIGH confidence
- [Paginate Data with Query Cursors — Firebase Official](https://firebase.google.com/docs/firestore/query-data/query-cursors) — HIGH confidence
- [How to Handle Firestore 10-Write-Per-Second Document Limit (2026)](https://oneuptime.com/blog/post/2026-02-17-how-to-handle-firestore-10-write-per-second-document-limit/view) — MEDIUM confidence
- [Building a Scalable Follower Feed with Firestore — Code.Build](https://code.build/p/building-a-scalable-follower-feed-with-firestore-wCeklv) — MEDIUM confidence
- [Top 10 Mistakes Developers Make with Firebase in 2025 — DEV Community](https://dev.to/mridudixit15/top-10-mistakes-developers-still-make-with-firebase-in-2025-53ah) — MEDIUM confidence
- [How to Build a Scalable Follower Feed in Firestore — DEV Community](https://dev.to/jdgamble555/how-to-build-a-scalable-follower-feed-in-firestore-25oj) — MEDIUM confidence
- [Page Visibility API — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API) — HIGH confidence
- [Building Timer in React — Medium](https://medium.com/@bsalwiczek/building-timer-in-react-its-not-as-simple-as-you-may-think-80e5f2648f9b) — MEDIUM confidence (access denied, content from search summary)
- [Implementing a Daily Streak System — Tiger Abrodi Blog](https://tigerabrodi.blog/implementing-a-daily-streak-system-a-practical-guide) — MEDIUM confidence
- [Handling Time Zones in Gamification — Trophy.so](https://trophy.so/blog/handling-time-zones-gamification) — MEDIUM confidence (access denied, content from search summary)
- [Numerous Firebase Apps Leaking Data — Cybersecurity News](https://cybersecuritynews.com/numerous-applications-using-googles-firebase-platform/) — MEDIUM confidence (2025 research on Firebase security in the wild)
- [5 React Memory Leaks That Kill Performance — Codewalnut](https://www.codewalnut.com/insights/5-react-memory-leaks-that-kill-performance) — MEDIUM confidence
- [Understanding Firestore Real-Time Pagination — Medium (Alex Mamo)](https://medium.com/firebase-tips-tricks/how-to-create-a-clean-firestore-pagination-with-real-time-updates-ce05a87bb902) — MEDIUM confidence
- [How to Prevent Firebase Runaway Costs — Medium](https://danielllewellyn.medium.com/how-to-prevent-firebase-runaway-costs-a8b0dac79384) — MEDIUM confidence
- [LeetCode Streak Bug (12:30 AM edge case) — GitHub Issue](https://github.com/LeetCode-Feedback/LeetCode-Feedback/issues/28204) — MEDIUM confidence (real-world documentation of the problem)

---
*Pitfalls research for: Strava-style study tracking social app (Firebase/Firestore/React)*
*Researched: 2026-03-01*
