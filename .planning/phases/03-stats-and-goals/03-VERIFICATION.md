---
phase: 03-stats-and-goals
verified: 2026-03-02T22:00:00Z
status: passed
score: 12/12 must-haves verified
re_verification: false
human_verification:
  - test: "Navigate to /stats and confirm orange area chart renders with gradient fill"
    expected: "Chart area has orange (#fc4c02) fill with gradient from opaque at top to transparent at bottom; range pills (1D|1W|1M|3M|All) are visible and clickable; subject filter dropdown is present"
    why_human: "SVG gradient rendering cannot be verified programmatically; visual color accuracy requires browser inspection"
  - test: "Open heatmap in Year view, then switch to Month view and navigate backward one month"
    expected: "Year view shows 52-week GitHub-style grid with orange color scale; Month view updates to show only that month's days; < arrow correctly moves to the prior month"
    why_human: "Calendar heatmap layout and color scale rendering require visual inspection"
  - test: "Set a daily goal of 60 minutes, click Save, then navigate to Timer page"
    expected: "DailyProgressBar appears below the timer display showing 'Xm / 1h goal — N%'; bar is absent when daily goal toggle is unchecked"
    why_human: "Progress bar visibility and toggle behavior require a live Firestore round-trip that cannot be simulated statically"
  - test: "Log a study session and verify totalStudyMinutes on the user document increments correctly"
    expected: "After saving a session, the All-time total card on /stats shows an increased hour count matching the newly logged session"
    why_human: "Firestore increment() side effect and its downstream display require a live session write and page refresh"
---

# Phase 3: Stats and Goals Verification Report

**Phase Goal:** Users can see exactly how much they have studied and track progress toward personal goals with streak continuity respected across timezones
**Verified:** 2026-03-02T22:00:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | npm run build passes TypeScript clean after adding new goal fields to UserProfile | VERIFIED | Build exits 0, 1038 modules transformed, no TypeScript errors |
| 2 | getSessions(uid, since?) returns SessionDocument[] ordered by createdAt asc, filters null createdAt | VERIFIED | `src/firebase/sessions.ts` lines 38-50: query uses `orderBy('createdAt', 'asc')`, where clause for `since`, `.filter(s => s.createdAt != null)` |
| 3 | computeStreaks(sessions, timezone) returns correct currentStreak and longestStreak using IANA timezone boundaries | VERIFIED | `src/hooks/useStreak.ts`: `toZonedTime` from `date-fns-tz`, `startOfDay` applied to local time, yesterday-grace period at line 43-46, `differenceInCalendarDays` for gap checking |
| 4 | aggregateSessions(sessions, range, timezone) returns bucketed chart points (hourly for 1D, daily for 1W/1M/3M, weekly for All) | VERIFIED | `src/hooks/useStats.ts` lines 7-43: `granularity = range === '1D' ? 'hour' : range === 'All' ? 'week' : 'day'`, correct bucket labeling per granularity |
| 5 | updateGoals(uid, fields) writes partial UserProfile goal fields to users/{uid} via updateDoc | VERIFIED | `src/firebase/users.ts` lines 39-50: `updateDoc(doc(db, 'users', uid), fields)` with correct partial type |
| 6 | addSession now also increments totalStudyMinutes on the user doc using increment(durationMs / 60000) | VERIFIED | `src/firebase/sessions.ts` lines 29-33: `updateDoc(doc(db, 'users', uid), { totalStudyMinutes: increment(payload.durationMs / 60000) })` after addDoc |
| 7 | StudyChart renders orange area chart with range pills and subject filter; tooltip shows formatted duration | VERIFIED | `src/components/StudyChart.tsx`: Recharts AreaChart with linearGradient orangeFill, range pill strip mapping RANGES array, select for subjects, CustomTooltip with `${hours}h ${mins}m` format |
| 8 | StudyHeatmap shows full-year grid with orange color scale and month/year toggle | VERIFIED | `src/components/StudyHeatmap.tsx`: CalendarHeatmap from `react-calendar-heatmap`, HEATMAP_STYLE with color-scale-0 through color-scale-4, Year/Month pill toggle, month navigation arrows |
| 9 | SubjectBreakdown lists subjects ranked by minutes with proportion bars | VERIFIED | `src/components/SubjectBreakdown.tsx`: renders breakdown sorted desc by minutes, proportion bar width = `(item.minutes / totalMinutes) * 100%`, empty state for no sessions |
| 10 | GoalsSection renders daily/weekly/subject goal toggles and calls updateGoals on save | VERIFIED | `src/components/GoalsSection.tsx`: checkbox + number input + Save button for daily and weekly; subject goals mapped from `getSubjects`; all three handleSave functions call `updateGoals` |
| 11 | DailyProgressBar fetches today's sessions, renders progress, returns null when disabled | VERIFIED | `src/components/DailyProgressBar.tsx`: `getStartOfLocalToday` uses `toZonedTime` + `startOfDay`, `getSessions(uid, since)` called in useEffect, `return null` when `!dailyGoalEnabled` |
| 12 | Navigating to /stats shows StatsPage; BottomTabBar appears on all protected routes; /stats route exists in App.tsx | VERIFIED | `src/App.tsx`: `<Route path="/stats" element={<StatsPage />} />` inside `LayoutWithNav` inside `ProtectedRoute`; `LayoutWithNav` renders `<Outlet /><BottomTabBar />` |

**Score:** 12/12 truths verified

### Required Artifacts

| Artifact | Provides | Exists | Substantive | Wired | Status |
|----------|----------|--------|-------------|-------|--------|
| `src/types/user.ts` | SubjectGoal interface + 5 goal fields on UserProfile | YES | YES — SubjectGoal exported, all 5 fields (dailyGoalMinutes, dailyGoalEnabled, weeklyGoalMinutes, weeklyGoalEnabled, subjectGoals) present | YES — imported by GoalsSection, DailyProgressBar, TimerPage, StatsPage, users.ts | VERIFIED |
| `src/firebase/sessions.ts` | addSession increments totalStudyMinutes; getSessions query helper | YES | YES — addSession calls increment(), getSessions with where + orderBy + null filter | YES — imported by useSessions, DailyProgressBar, TimerPage | VERIFIED |
| `src/firebase/users.ts` | updateGoals helper | YES | YES — updateGoals calls updateDoc with partial fields | YES — imported by GoalsSection | VERIFIED |
| `src/hooks/useSessions.ts` | Fetches + caches sessions for uid + time range; exports TimeRange | YES | YES — 35 lines, useEffect on uid/range/timezone, returns { sessions, loading, error } | YES — imported by StatsPage | VERIFIED |
| `src/hooks/useStats.ts` | aggregateSessions, subjectBreakdown, heatmapValues, totalMinutes, useStats | YES | YES — 97 lines, all 5 functions present with proper bucketing logic | YES — aggregateSessions imported by StudyChart; useStats by StatsPage | VERIFIED |
| `src/hooks/useStreak.ts` | computeStreaks + useStreak with Firestore writeback | YES | YES — 73 lines, full algorithm with IANA timezone support, writes back to users/{uid} | YES — useStreak imported by StatsPage | VERIFIED |
| `src/components/StudyChart.tsx` | Recharts AreaChart with gradient, range filter, subject filter, custom tooltip | YES | YES — 155 lines, full AreaChart implementation, CustomTooltip, range pills, subject select | YES — imported and rendered by StatsPage | VERIFIED |
| `src/components/StudyHeatmap.tsx` | react-calendar-heatmap with orange color injection, month/year toggle | YES | YES — 114 lines, CalendarHeatmap, HEATMAP_STYLE injection, view toggle, month navigation | YES — imported and rendered by StatsPage | VERIFIED |
| `src/components/SubjectBreakdown.tsx` | Subject breakdown list with proportion bars | YES | YES — 45 lines, proportion bar, formatDuration helper, empty state | YES — imported and rendered by StatsPage | VERIFIED |
| `src/components/GoalsSection.tsx` | Goal input UI with toggles and Firestore persistence | YES | YES — 251 lines, daily/weekly/subject goals, three separate save handlers | YES — imported and rendered by StatsPage | VERIFIED |
| `src/components/DailyProgressBar.tsx` | Progress bar for TimerPage; returns null when disabled | YES | YES — 77 lines, getSessions call, progress calculation, returns null when !dailyGoalEnabled | YES — imported and rendered in both branches of TimerPage | VERIFIED |
| `src/components/BottomTabBar.tsx` | Fixed bottom nav with NavLink | YES | YES — 40 lines, NavLink with `end` for /, active tab styling | YES — rendered in LayoutWithNav inside App.tsx | VERIFIED |
| `src/pages/StatsPage.tsx` | Full /stats page with all sections | YES | YES — 117 lines, all 6 sections: chart, total, streaks, heatmap, breakdown, goals | YES — registered at `/stats` route in App.tsx | VERIFIED |
| `src/pages/TimerPage.tsx` | DailyProgressBar added below timer | YES | YES — DailyProgressBar rendered in both running and idle branches (lines 102-108, 148-154) | YES — existing page in App.tsx | VERIFIED |
| `src/App.tsx` | /stats route + BottomTabBar in LayoutWithNav | YES | YES — LayoutWithNav wrapper with Outlet + BottomTabBar, /stats route present | YES — root of application | VERIFIED |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/hooks/useSessions.ts` | `src/firebase/sessions.ts` | `getSessions(uid, since)` | WIRED | Direct import and call on line 2 and 28 |
| `src/hooks/useStreak.ts` | `date-fns-tz toZonedTime` | IANA timezone conversion for calendar day boundaries | WIRED | Imported on line 2, used at lines 21 and 42 |
| `src/firebase/sessions.ts addSession` | `users/{uid} totalStudyMinutes` | `updateDoc` with `increment(durationMs / 60000)` | WIRED | Lines 30-33 in sessions.ts |
| `src/components/StudyChart.tsx` | `src/hooks/useStats.ts aggregateSessions` | `aggregateSessions` called directly in render | WIRED | Line 12 import, line 54 call; chart manages its own range/subject state |
| `src/components/StudyHeatmap.tsx` | `react-calendar-heatmap CalendarHeatmap` | `values` prop with `{date, count}` array | WIRED | Line 2 default import, line 100-110 rendering with values, classForValue, tooltipDataAttrs |
| `src/App.tsx` | `src/pages/StatsPage.tsx` | `<Route path='/stats' element={<StatsPage />} />` | WIRED | Line 7 import, line 28 route declaration |
| `src/App.tsx` | `src/components/BottomTabBar.tsx` | `BottomTabBar` in `LayoutWithNav` | WIRED | Line 8 import, line 14 render inside LayoutWithNav |
| `src/pages/StatsPage.tsx` | `src/hooks/useSessions.ts` | `useSessions(uid, range, timezone)` | WIRED | Line 5 import, line 46 call |
| `src/pages/StatsPage.tsx` | `src/hooks/useStats.ts` | `useStats(sessions, range, timezone, subjectId)` | WIRED | Line 6 import, line 47 call |
| `src/pages/TimerPage.tsx` | `src/components/DailyProgressBar.tsx` | `DailyProgressBar` below TimerDisplay | WIRED | Line 7 import, rendered at lines 102 and 148 |
| `src/components/GoalsSection.tsx` | `src/firebase/users.ts updateGoals` | `updateGoals(uid, {...})` on Save clicks | WIRED | Line 2 import, called in all three handleSave functions |
| `src/components/DailyProgressBar.tsx` | `src/firebase/sessions.ts getSessions` | `getSessions(uid, startOfLocalDay)` | WIRED | Line 4 import, line 30 call |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| STAT-01 | 03-01, 03-02, 03-04 | Interactive stats chart with time range filters (1D, 1W, 1M, 3M, All) | SATISFIED | StudyChart renders AreaChart; range pills call handleRangeChange updating both internal state and parent's useSessions range |
| STAT-02 | 03-01, 03-02, 03-04 | Stats chart can be filtered by subject | SATISFIED | StudyChart has subject select; aggregateSessions filters by subjectId; onSubjectChange callback to StatsPage |
| STAT-03 | 03-01, 03-04 | Selected time range shows total study time | SATISFIED | StatsPage line 77-81: `{Math.floor(total / 60)}h {total % 60}m` card with "Total study time (selected range)" |
| STAT-04 | 03-01, 03-02, 03-04 | Monthly heatmap calendar visualises daily study activity | SATISFIED | StudyHeatmap renders CalendarHeatmap with `heatmapValues` data; year/month toggle; orange color scale injected via `<style>` |
| STAT-05 | 03-01, 03-02, 03-04 | Subject breakdown shows time distribution across all subjects | SATISFIED | SubjectBreakdown receives `breakdown` from `useStats`, renders ranked list with proportion bars |
| STAT-06 | 03-01, 03-04 | All-time cumulative study total is displayed | SATISFIED | `addSession` increments `totalStudyMinutes` via Firestore `increment()`; StatsPage "All-time total" StatCard reads `profile.totalStudyMinutes` |
| GOAL-01 | 03-01, 03-04 | Study streak counter (consecutive calendar days) | SATISFIED | `computeStreaks` in useStreak.ts; StatsPage renders "Current streak" and "Longest streak" StatCards |
| GOAL-02 | 03-01, 03-04 | Streak day boundaries in user's local timezone | SATISFIED | `toZonedTime(utcDate, timezone)` then `startOfDay()` applied before comparing unique days; yesterday grace period also timezone-aware |
| GOAL-03 | 03-03, 03-04 | User can set a daily study time goal (toggleable on/off) | SATISFIED | GoalsSection: daily checkbox + number input + Save button; calls `updateGoals(uid, { dailyGoalMinutes, dailyGoalEnabled })` |
| GOAL-04 | 03-03, 03-04 | User can set a weekly study time goal (toggleable on/off) | SATISFIED | GoalsSection: weekly checkbox + number input + Save button; calls `updateGoals(uid, { weeklyGoalMinutes, weeklyGoalEnabled })` |
| GOAL-05 | 03-03, 03-04 | User can set subject-specific study goals (toggleable per subject) | SATISFIED | GoalsSection loads subjects via `getSubjects`, renders per-subject checkbox + input; "Save subject goals" calls `updateGoals(uid, { subjectGoals })` |
| GOAL-06 | 03-03, 03-04 | Daily goal progress bar visible on home/timer screen | SATISFIED | DailyProgressBar rendered in both running and idle branches of TimerPage; returns null when `dailyGoalEnabled` is false |

All 12 required requirements (STAT-01 through STAT-06, GOAL-01 through GOAL-06) are satisfied.

### Architectural Note: chartData Alias in StatsPage

`StatsPage` calls `useStats` and aliases `chartData` as `_chartData` (discarded). This is intentional: `StudyChart` manages its own internal `range`/`subjectId` state and calls `aggregateSessions` directly on the `sessions` prop. The parent's `range` state exists only to re-query `useSessions` to narrow the data window (e.g., switching from All to 1W fetches fewer docs). The `useStats` call in `StatsPage` is still valuable for `breakdown`, `heatmap`, and `total` which feed the non-chart sections. This dual-aggregation pattern is correct — the chart re-aggregates locally, the other sections use the hook output. No bug.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/pages/StatsPage.tsx` | 47 | `chartData: _chartData` (unused destructure) | Info | No behavioral impact; StatsPage intentionally discards chartData because StudyChart re-aggregates internally. Architecture is sound but slightly confusing. |
| Build output | — | Chunk size 974KB (warning at 500KB) | Warning | Production bundle is oversized due to recharts. Noted in 03-01-SUMMARY. Recommended fix: dynamic import for recharts. Does not block Phase 3 goal. |

No blockers found.

### Human Verification Required

#### 1. Orange Area Chart Visual Rendering

**Test:** Log in, navigate to /stats, verify the chart renders with an orange area chart. Click each range pill (1D, 1W, 1M, 3M, All) and confirm the chart updates.
**Expected:** Area chart with orange (#fc4c02) stroke and gradient fill (opaque at top, transparent at bottom). Range pills change background to orange when active. Subject filter dropdown visible.
**Why human:** SVG gradient rendering, color accuracy, and interactive responsiveness require visual browser inspection.

#### 2. Heatmap Calendar with Orange Color Scale and Month/Year Toggle

**Test:** On /stats, scroll to the Activity section. Toggle between Year and Month view. In Month view, click the back arrow to go to the previous month.
**Expected:** Year view shows a full GitHub-style grid with cells colored from dark-orange (#7a2500) to bright orange (#fc4c02) based on study intensity. Month view shows only that month. Navigation arrows change displayed month.
**Why human:** CSS class injection into SVG elements and calendar grid layout require browser rendering to verify.

#### 3. Daily Goal Progress Bar on TimerPage

**Test:** On /stats, scroll to Goals section. Enable the daily goal (check the checkbox), set a minute value, click Save. Then navigate to / (Timer page).
**Expected:** DailyProgressBar appears below the timer showing "Xm / Nh goal — N%". When the daily goal checkbox is unchecked and saved, the bar disappears from the Timer page.
**Why human:** Requires a Firestore round-trip (save goal → re-fetch profile → re-render TimerPage) that cannot be simulated statically.

#### 4. totalStudyMinutes Increment on Session Log

**Test:** Log a study session (start timer, stop, save in the bottom sheet). Navigate to /stats and check the "All-time total" stat card.
**Expected:** All-time total reflects the newly added session duration.
**Why human:** Requires a live Firestore `increment()` write and a page that reads the updated value.

### Gaps Summary

No gaps. All 12 phase truths are verified. All 15 artifacts exist, are substantive (non-stub), and are wired into the application. All 12 key links are confirmed connected. All 12 requirements (STAT-01 to STAT-06, GOAL-01 to GOAL-06) are satisfied.

The only items flagged are:
- 4 human verification items for visual/interactive/live-data behaviors that cannot be verified statically.
- 1 informational finding (unused `_chartData` alias — architecture is sound).
- 1 warning about bundle size (974KB — pre-existing from plan 03-01, non-blocking).

---

_Verified: 2026-03-02T22:00:00Z_
_Verifier: Claude (gsd-verifier)_
