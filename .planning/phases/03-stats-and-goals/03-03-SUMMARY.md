---
phase: 03-stats-and-goals
plan: "03"
subsystem: ui-components
tags: [react, typescript, firebase, firestore, goals, progress-bar, date-fns-tz]

# Dependency graph
requires:
  - phase: 03-01
    provides: updateGoals, getSessions, SubjectGoal, UserProfile goal fields
  - phase: 01-foundation
    provides: getSubjects from firebase/subjects.ts, AuthContext
provides:
  - GoalsSection component: daily/weekly/subject goal CRUD with toggles and Firestore persistence
  - DailyProgressBar component: timezone-aware today's progress bar, hidden when goal disabled
affects: [03-04, 03-05, TimerPage, StatsPage]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "GoalsSection ?? fallback pattern: profile.dailyGoalEnabled ?? false for old docs without goal fields"
    - "DailyProgressBar returns null early when disabled: no DOM rendered, TimerPage area fully hidden"
    - "toZonedTime + startOfDay (date-fns) for IANA timezone local midnight — same pattern as useStreak"

key-files:
  created:
    - src/components/GoalsSection.tsx
    - src/components/DailyProgressBar.tsx
  modified: []

key-decisions:
  - "GoalsSection splits daily/weekly saves into separate buttons — each saves independently, no partial write confusion"
  - "Subject goals saved as a batch via single updateGoals call — simpler than per-subject saves"
  - "DailyProgressBar getSessions error is non-blocking — bar shows 0 rather than crashing TimerPage"

# Metrics
duration: 2min
completed: 2026-03-02
---

# Phase 3 Plan 03: Goals UI Components Summary

**Goal CRUD UI and daily progress bar: GoalsSection with independent daily/weekly toggles + minute inputs writing to Firestore via updateGoals, and DailyProgressBar computing today's session minutes against the daily goal using IANA-timezone local midnight boundary**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-02T20:21:12Z
- **Completed:** 2026-03-02T20:23:42Z
- **Tasks:** 2
- **Files created:** 2

## Accomplishments

- Built GoalsSection.tsx with daily goal toggle + input, weekly goal toggle + input, per-subject goals loaded from getSubjects() with individual toggles and inputs, and separate Save buttons (daily, weekly, all-subjects)
- Built DailyProgressBar.tsx that returns null when disabled (TimerPage area fully hidden), fetches today's sessions using getSessions(uid, startOfLocalToday) with IANA timezone boundary, and renders a thin Xh Ym / Zh goal — N% progress bar

## Task Commits

Each task was committed atomically:

1. **Task 1: Build GoalsSection component** - `2e4041a` (feat)
2. **Task 2: Build DailyProgressBar component** - `d06a09a` (feat)

## Files Created

- `src/components/GoalsSection.tsx` - Goal input UI for daily, weekly, and per-subject goals with toggles and Firestore persistence
- `src/components/DailyProgressBar.tsx` - Thin progress bar for TimerPage showing today's progress toward daily goal

## Decisions Made

- GoalsSection splits daily/weekly save operations into independent buttons — prevents partial-write confusion if one save fails while other is in flight
- Subject goals saved as a single batch via `updateGoals(uid, { subjectGoals: allGoals })` — simpler than per-row saves, matches the subject goals UX (edit all, then save)
- DailyProgressBar error handling in getSessions fetch is a silent catch — non-blocking, bar shows 0 on error rather than crashing the TimerPage

## Deviations from Plan

None - plan executed exactly as written. Both components compile with zero TypeScript errors. The ?? fallback pattern for optional goal fields was already specified in the plan and in the 03-01 SUMMARY decisions.

**Pre-existing out-of-scope issue discovered:** StudyHeatmap.tsx (untracked, from 03-02 work) has a TS2769 type error on react-calendar-heatmap callback parameter types. This was not caused by 03-03 changes and is documented in deferred-items.md.

## Issues Encountered

None beyond the out-of-scope pre-existing StudyHeatmap.tsx TypeScript issue documented in deferred-items.md.

## User Setup Required

None.

## Next Phase Readiness

- GoalsSection ready to be imported at the bottom of StatsPage — receives uid, profile, and onGoalsUpdated callback
- DailyProgressBar ready to be placed on TimerPage below the timer — receives uid, timezone, dailyGoalMinutes, dailyGoalEnabled from user profile
- Both components consume only contracts established in Plan 03-01 (no new dependencies)

---

## Self-Check: PASSED

- FOUND: src/components/GoalsSection.tsx
- FOUND: src/components/DailyProgressBar.tsx
- FOUND commit: 2e4041a (feat(03-03): build GoalsSection component)
- FOUND commit: d06a09a (feat(03-03): build DailyProgressBar component)
- npm run build: fails on pre-existing StudyHeatmap.tsx TS error (out-of-scope, documented in deferred-items.md)

---
*Phase: 03-stats-and-goals*
*Completed: 2026-03-02*
