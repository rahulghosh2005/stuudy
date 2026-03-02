---
phase: 03-stats-and-goals
plan: "02"
subsystem: visualization
tags: [recharts, react-calendar-heatmap, charts, heatmap, components, typescript, visualization]

# Dependency graph
requires:
  - phase: 03-01
    provides: aggregateSessions, subjectBreakdown, heatmapValues, useSessions, TimeRange, SessionDocument, Subject types
  - phase: 02-timer-and-sessions
    provides: SessionDocument type, subjects subcollection via getSubjects
provides:
  - StudyChart: Recharts AreaChart with range pills, subject filter dropdown, gradient fill, custom tooltip
  - StudyHeatmap: react-calendar-heatmap with orange color scale, year/month toggle, month navigation
  - SubjectBreakdown: ranked list with proportion bars and formatted time totals
affects: [03-03, 03-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Recharts 3.x custom tooltip: use TooltipContentProps<V, N> (not TooltipProps) as function ref — content={FnRef} not content={<JSX/>}"
    - "react-calendar-heatmap classForValue/tooltipDataAttrs: use { date: string; [key: string]: unknown } in callback to match library ReactCalendarHeatmapValue<string> index signature"
    - "CalendarHeatmap month view: pass exact startDate=startOfMonth/endDate=endOfMonth for correct per-month display"

key-files:
  created:
    - src/components/StudyChart.tsx
    - src/components/StudyHeatmap.tsx
    - src/components/SubjectBreakdown.tsx
  modified: []

key-decisions:
  - "TooltipContentProps used instead of TooltipProps for Recharts 3.x custom tooltip — TooltipProps omits payload/label (read from context), ContentType expects render fn or JSX element; function ref avoids JSX missing-required-props TS error"
  - "react-calendar-heatmap callback type uses [key: string]: unknown index signature to match ReactCalendarHeatmapValue<string> — our { date; count } type is incompatible as callback parameter since it lacks index signature"
  - "StudyChart getSubjects loaded once on mount (uid dep only) — failure is silent since subject dropdown is non-critical for chart display"

# Metrics
duration: 3min
completed: 2026-03-02
---

# Phase 3 Plan 02: Visualization Components Summary

**Three pure presentational chart components: orange Recharts AreaChart with range/subject filter, react-calendar-heatmap with orange color scale and year/month toggle, and subject breakdown list with proportion bars — all typed to Plan 01 hook contracts**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-02T20:20:48Z
- **Completed:** 2026-03-02T20:23:xx Z
- **Tasks:** 2
- **Files created:** 3

## Accomplishments

- Built StudyChart with orange gradient AreaChart, range pill strip (1D/1W/1M/3M/All), subject dropdown, custom tooltip showing formatted duration
- Built StudyHeatmap with orange color scale (5 levels), year view (12 months) and month view with prev/next navigation, native title tooltip
- Built SubjectBreakdown with ranked rows, proportion bars sized by minutes/totalMinutes, formatDuration helper, and empty state

## Task Commits

Each task was committed atomically:

1. **Task 1: Build StudyChart** - `384f099` (feat)
2. **Task 2: Build StudyHeatmap and SubjectBreakdown** - `395fca1` (feat)

## Files Created

- `src/components/StudyChart.tsx` - Recharts AreaChart with gradient fill, range pills, subject filter, CustomTooltip, empty state
- `src/components/StudyHeatmap.tsx` - react-calendar-heatmap, orange HEATMAP_STYLE injected, year/month toggle, month < > navigation
- `src/components/SubjectBreakdown.tsx` - ranked list with proportion bars, formatDuration helper, empty state

## Decisions Made

- **Recharts TooltipContentProps vs TooltipProps:** Recharts 3.x `TooltipProps` omits `payload` and `label` (they are injected from context). Custom tooltip must use `TooltipContentProps<number, string>` and be passed as `content={FnRef}` not `content={<JSX />}` to avoid TypeScript missing-required-props error on JSX element
- **react-calendar-heatmap callback type:** `ReactCalendarHeatmapValue<string>` has `{ date: string; [key: string]: any }` (index signature). Our `{ date: string; count: number }` type cannot be used as callback parameter type since it lacks the index signature — use `{ date: string; [key: string]: unknown }` and cast `value.count as number | undefined`
- **Subject dropdown on mount:** getSubjects loaded once on mount; failure is silent catch since dropdown is a filter convenience, not required for chart to render

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Recharts 3.x TooltipProps missing payload/label**
- **Found during:** Task 1 (StudyChart.tsx build verification)
- **Issue:** Plan specified `TooltipProps<number, string>` for custom tooltip type, but in Recharts 3.x `TooltipProps` explicitly omits `payload`, `label`, and `active` (they are read from chart context). TypeScript error: Property 'payload' does not exist on type 'TooltipProps<number, string>'
- **Fix:** Changed type annotation to `TooltipContentProps<number, string>` and passed function reference `content={CustomTooltip}` instead of JSX `content={<CustomTooltip />}`
- **Files modified:** src/components/StudyChart.tsx
- **Commit:** 384f099

**2. [Rule 1 - Bug] react-calendar-heatmap callback parameter type mismatch**
- **Found during:** Task 2 (StudyHeatmap.tsx build verification)
- **Issue:** Plan specified `{ date: string; count: number } | null` for classForValue and tooltipDataAttrs callbacks. Library expects `ReactCalendarHeatmapValue<string> | undefined` which has index signature `[key: string]: any`. Our concrete type without index signature is not assignable as a callback parameter (TS2769 no overload). Also `null` vs `undefined`.
- **Fix:** Changed callback types to `{ date: string; [key: string]: unknown } | undefined`, accessed count via `value.count as number | undefined` cast
- **Files modified:** src/components/StudyHeatmap.tsx
- **Commit:** 395fca1

---

**Total deviations:** 2 auto-fixed (Rule 1 - library API/type bugs). Both fixes are type-level only — no behavioral changes.

## Issues Encountered
None beyond the auto-fixed TypeScript strictness issues above.

## User Setup Required
None.

## Next Phase Readiness
- All 3 visualization components export stable typed APIs for StatsPage assembly (Wave 3 Plan 03-03)
- StudyChart accepts `sessions`, `timezone`, `uid` — matches useSessions output
- StudyHeatmap accepts `values: Array<{date, count}>` — matches heatmapValues output
- SubjectBreakdown accepts `breakdown` + `totalMinutes` — matches subjectBreakdown + totalMinutes output

## Self-Check: PASSED

- src/components/StudyChart.tsx: FOUND
- src/components/StudyHeatmap.tsx: FOUND
- src/components/SubjectBreakdown.tsx: FOUND
- .planning/phases/03-stats-and-goals/03-02-SUMMARY.md: FOUND
- Commit 384f099 (Task 1): FOUND
- Commit 395fca1 (Task 2): FOUND

---
*Phase: 03-stats-and-goals*
*Completed: 2026-03-02*
