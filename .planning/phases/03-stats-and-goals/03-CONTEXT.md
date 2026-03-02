# Phase 3: Stats and Goals - Context

**Gathered:** 2026-03-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Stats charts, heatmap, streaks, and daily/weekly/subject goals — all powered by session data written in Phase 2. Users can see exactly how much they have studied and track progress toward personal goals with streak continuity respected across timezones.

Creating posts, social interactions, and feed are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Stats page location
- Dedicated `/stats` route — own page, not embedded in ProfilePage
- Bottom tab bar navigation added: Timer (`/`) | Stats (`/stats`) | Profile (`/profile`)
- Stats page shows the signed-in user's own data only — no `/stats/:uid` for this phase
- Sections on Stats page (top to bottom): interactive chart, heatmap calendar, subject breakdown, goals section

### Chart style
- Area chart with gradient fill in orange (`#fc4c02`) — "stock-ticker" aesthetic
- Auto-granularity based on selected time range: 1D = hourly, 1W = daily, 1M/3M = daily, All = weekly
- Time range filters: 1D | 1W | 1M | 3M | All (pill/tab strip)
- Subject filter dropdown alongside the time range filter
- Tooltip on hover/tap: date + total duration (e.g. "Mar 1 — 2h 15m")
- Library: **Recharts** (React-native, TypeScript-friendly, composable)

### Heatmap calendar
- Toggle between two views (like a stock chart switcher dropdown): GitHub full-year grid OR month-by-month grid
- Color scale: shades of orange — no activity = dark gray (#1a1a1a), max activity = `#fc4c02`
- Tooltip on tap: date + total duration for that day
- Library: **react-calendar-heatmap**

### Goals UI
- Goals section lives at the bottom of the `/stats` page — not a separate route
- Daily progress bar on TimerPage: thin bar below the timer display showing `Xh Ym / Zh goal — N%`
- Goals stored on the user document in Firestore (adding fields to `users/{uid}`)
- Toggle behavior: off = progress bar hidden from TimerPage, goal value preserved (restores on re-enable)
- Three independent goal types, each toggleable: daily, weekly, per-subject

### Streak calculation
- Streak day boundaries calculated in user's IANA timezone (already stored in `UserProfile.timezone`)
- `currentStreak` and `longestStreak` updated on session write or on daily check — client-side recalculation on stats load is acceptable for this phase

### Claude's Discretion
- Exact spacing, typography, and padding on Stats page
- Loading skeleton design for chart/heatmap while data fetches
- Error state handling
- Specific color stops for orange gradient fill on area chart
- How streak recalculation is triggered (on-load vs on-write)

</decisions>

<specifics>
## Specific Ideas

- Heatmap toggle should feel like the period selector on a stock chart (small dropdown or segmented control near the heatmap header)
- Chart should feel like Strava's performance graphs — orange fill, dark background, minimal grid lines
- Progress bar on TimerPage should be subtle — not distracting while actively timing

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ProfilePage.tsx` → `StatCard` component: dark card (`#1a1a1a` bg, `#fc4c02` orange accent, centered value+label). Reuse for stats summary totals.
- `UserProfile` type: already has `totalStudyMinutes`, `currentStreak`, `longestStreak` — just needs to be populated
- `SessionDocument` type: `durationMs`, `startTimestamp`, `subjectId`, `subject`, `createdAt` — all needed for aggregation
- `firebase/sessions.ts`: `addSession` helper — Phase 3 may need a `getSessions(uid)` counterpart for querying
- `firebase/subjects.ts`: `getSubjects(uid)` — reuse for subject filter dropdown on chart

### Established Patterns
- Dark theme: `#0a0a0a` page bg, `#1a1a1a` card bg, `#fc4c02` orange accent, `#888` muted text
- Inline styles throughout (no Tailwind, no CSS modules) — follow same pattern
- `useAuth()` from `AuthContext` for accessing `user.uid` and timezone
- Sessions stored at `users/{uid}/sessions` subcollection

### Integration Points
- `App.tsx`: Add `/stats` route and bottom tab bar nav — currently no nav bar exists
- `UserProfile` type: Add goal fields (`dailyGoalMinutes`, `dailyGoalEnabled`, `weeklyGoalMinutes`, `weeklyGoalEnabled`, plus subject-goal structure)
- `TimerPage.tsx`: Add daily progress bar below the timer display
- Firestore security rules: read access to `users/{uid}/sessions` is already in place from Phase 2

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 03-stats-and-goals*
*Context gathered: 2026-03-02*
