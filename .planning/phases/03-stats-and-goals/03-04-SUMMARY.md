---
phase: 03-stats-and-goals
plan: "04"
subsystem: navigation-and-assembly
tags: [routing, navigation, stats-page, bottom-tab-bar, daily-progress]
dependency_graph:
  requires: [03-01, 03-02, 03-03]
  provides: [complete-phase-3-feature, stats-page, bottom-tab-navigation]
  affects: [App.tsx, TimerPage, all-protected-routes]
tech_stack:
  added: [react-is]
  patterns: [LayoutWithNav pattern for shared layout, NavLink active styling with end prop]
key_files:
  created:
    - src/components/BottomTabBar.tsx
    - src/pages/StatsPage.tsx
  modified:
    - src/App.tsx
    - src/pages/TimerPage.tsx
    - package.json
decisions:
  - LayoutWithNav component wraps ProtectedRoute outlet so BottomTabBar renders only for authenticated users, LoginPage excluded
  - NavLink to="/" end prop prevents Timer tab from matching /stats and /profile (exact match required)
  - DailyProgressBar rendered in both running and idle/stopped TimerPage branches so it is always visible
  - react-is installed as missing dependency for recharts Rollup resolution (was blocking build)
metrics:
  duration: 3 min
  completed: 2026-03-02
  tasks_completed: 2
  files_changed: 5
---

# Phase 3 Plan 04: Navigation Assembly Summary

BottomTabBar + StatsPage created and wired end-to-end: NavLink tab bar on all protected routes, /stats route with chart/heatmap/streak/goals, DailyProgressBar integrated in TimerPage.

## What Was Built

### Task 1: BottomTabBar and StatsPage (commit c9ec803)

**src/components/BottomTabBar.tsx** — Fixed bottom nav with three tabs: Timer, Stats, Profile. Uses NavLink with active tab highlighted `#fc4c02` and `end` prop on Timer tab to prevent over-matching.

**src/pages/StatsPage.tsx** — Full /stats page that:
- Fetches UserProfile from Firestore for timezone and goal fields
- Drives range and subjectId state passed to useSessions + useStats
- Renders StudyChart, total card, StatCard grid (streak + all-time), StudyHeatmap, SubjectBreakdown, GoalsSection
- Has 80px bottom padding for BottomTabBar clearance

### Task 2: Wire App.tsx and update TimerPage (commit 6d6d144)

**src/App.tsx** — Added `LayoutWithNav` component that renders `<Outlet />` + `<BottomTabBar />`. Nested inside `<ProtectedRoute />` so LoginPage never gets the tab bar. Added `/stats` route.

**src/pages/TimerPage.tsx** — Added DailyProgressBar in both timer branches (running and idle/stopped). Added profile fetch effect for timezone and goal fields. Added `paddingBottom: '80px'` to screenStyle.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Install missing react-is dependency**
- **Found during:** Task 2 build verification
- **Issue:** Recharts imports `react-is` internally but it was not installed, causing Rollup to fail with "failed to resolve import react-is"
- **Fix:** `npm install react-is`
- **Files modified:** package.json, package-lock.json
- **Commit:** 6d6d144

## Verification

All criteria met:
1. `npm run build` exits 0 with no TypeScript errors
2. App.tsx has `/stats` route and BottomTabBar inside LayoutWithNav
3. TimerPage imports and renders DailyProgressBar in both branches
4. StatsPage imports and renders StudyChart, StudyHeatmap, SubjectBreakdown, GoalsSection
5. ProfilePage gets BottomTabBar (inside LayoutWithNav, no changes needed)

## Self-Check: PASSED
