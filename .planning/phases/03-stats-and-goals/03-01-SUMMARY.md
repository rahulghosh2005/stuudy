---
phase: 03-stats-and-goals
plan: "01"
subsystem: database
tags: [recharts, date-fns, date-fns-tz, react-calendar-heatmap, firebase, firestore, hooks, typescript]

# Dependency graph
requires:
  - phase: 02-timer-and-sessions
    provides: SessionDocument type, addSession, sessions subcollection pattern, UserProfile base shape
  - phase: 01-foundation
    provides: Firebase config, UserProfile, createOrUpdateUserDoc, AuthContext
provides:
  - SubjectGoal interface and 5 goal fields on UserProfile
  - getSessions(uid, since?) query helper ordered by createdAt asc
  - addSession now increments totalStudyMinutes via increment()
  - updateGoals(uid, fields) for partial goal field updates
  - useSessions(uid, range, timezone) hook — fetches and caches sessions with TimeRange support
  - useStats hook — aggregateSessions (hourly/daily/weekly bucketing), subjectBreakdown, heatmapValues, totalMinutes
  - useStreak hook — computeStreaks with IANA timezone calendar day boundaries, writes back to Firestore
affects: [03-02, 03-03, 03-04, 03-05, 04-social, 05-privacy]

# Tech tracking
tech-stack:
  added:
    - recharts (chart library for bar/line charts in later plans)
    - date-fns (date utilities: subDays, subMonths, startOfDay, differenceInCalendarDays, format)
    - date-fns-tz v3 (IANA timezone: toZonedTime)
    - react-calendar-heatmap (activity heatmap, --legacy-peer-deps for React 19 compat)
    - "@types/react-calendar-heatmap" (type definitions)
  patterns:
    - date-fns-tz v3 API uses toZonedTime (NOT utcToZonedTime from v2) — always check v3 docs
    - startOfDay from date-fns (not date-fns-tz) for local midnight calculation
    - FieldValue cast: use as unknown as { toDate: () => Date } pattern for Timestamp interop
    - as unknown as SessionDocument for Firestore query result mapping
    - useEffect dependency array on streak update: [streaks.currentStreak, streaks.longestStreak, uid, sessions.length]

key-files:
  created:
    - src/hooks/useSessions.ts
    - src/hooks/useStats.ts
    - src/hooks/useStreak.ts
  modified:
    - src/types/user.ts (added SubjectGoal, 5 goal fields)
    - src/firebase/sessions.ts (added getSessions, addSession totalStudyMinutes increment)
    - src/firebase/users.ts (added updateGoals)
    - package.json (5 new deps)

key-decisions:
  - "date-fns-tz v3 startOfDay not exported — use date-fns startOfDay after toZonedTime conversion"
  - "react-calendar-heatmap locked with --legacy-peer-deps for React 19 compat — no substitution per CONTEXT.md"
  - "Goal fields optional on UserProfile — not set by createOrUpdateUserDoc, use ?? fallback downstream"
  - "useStreak writes back to Firestore non-blocking (.catch noop) — local state is source of truth for display"

patterns-established:
  - "IANA timezone streak: toZonedTime then startOfDay, uniqueDays Set dedup, yesterday grace period"
  - "TimeRange → Date boundary: 1D = startOfDay(local), 1W = subDays(startOfDay, 6), 1M/3M = subMonths(now)"
  - "Session aggregation granularity: 1D→hourly, 1W/1M/3M→daily, All→weekly"

requirements-completed: [STAT-01, STAT-02, STAT-03, STAT-04, STAT-05, STAT-06, GOAL-01, GOAL-02, GOAL-03, GOAL-04, GOAL-05, GOAL-06]

# Metrics
duration: 5min
completed: 2026-03-02
---

# Phase 3 Plan 01: Stats and Goals Data Foundation Summary

**Data foundation for Phase 3: recharts + date-fns-tz installed, UserProfile extended with goal fields, getSessions + updateGoals + addSession increment helpers, and useSessions + useStats + useStreak hooks delivering typed contracts to all downstream chart/heatmap/goal plans**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-02T20:11:40Z
- **Completed:** 2026-03-02T20:16:43Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments
- Installed all 5 Phase 3 packages (recharts, date-fns, date-fns-tz, react-calendar-heatmap, @types/react-calendar-heatmap)
- Extended UserProfile with SubjectGoal interface and 5 goal fields; added updateGoals Firebase helper and getSessions query helper; addSession now atomically increments totalStudyMinutes via Firestore increment()
- Built three data hooks: useSessions (fetches with TimeRange boundary), useStats (aggregation + breakdown + heatmap), useStreak (IANA-timezone-aware streak computation with Firestore writeback)

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Phase 3 dependencies** - `06a864d` (chore)
2. **Task 2: Extend UserProfile type and add Firebase helpers** - `24b294b` (feat)
3. **Task 3: Build data hooks — useSessions, useStats, useStreak** - `147f9ab` (feat)

## Files Created/Modified
- `src/types/user.ts` - Added SubjectGoal interface; UserProfile extended with dailyGoalMinutes, dailyGoalEnabled, weeklyGoalMinutes, weeklyGoalEnabled, subjectGoals
- `src/firebase/sessions.ts` - Added getSessions(uid, since?) helper; addSession now calls increment(durationMs/60000) on user doc
- `src/firebase/users.ts` - Added updateGoals(uid, fields) for partial goal field writes
- `src/hooks/useSessions.ts` - TimeRange type + useSessions hook with range-to-since mapping
- `src/hooks/useStats.ts` - aggregateSessions, subjectBreakdown, heatmapValues, totalMinutes pure functions + useStats hook
- `src/hooks/useStreak.ts` - computeStreaks pure function (IANA-aware, yesterday grace) + useStreak hook with Firestore writeback
- `package.json` / `package-lock.json` - 5 new Phase 3 packages

## Decisions Made
- date-fns-tz v3 does not export `startOfDay` (v2 API change) — use `date-fns` `startOfDay` after `toZonedTime` to get local calendar day
- `react-calendar-heatmap` installed with `--legacy-peer-deps` per locked CONTEXT.md decision (React 19.2 compat at runtime despite peer dep declaration)
- Goal fields are optional on UserProfile and not written by `createOrUpdateUserDoc` — downstream callers use `?? false` / `?? 0` fallbacks
- `useStreak` Firestore writeback is non-blocking (`.catch` noop) — local computed value is always correct for display

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] date-fns-tz v3 has no startOfDay export**
- **Found during:** Task 3 (useSessions.ts, useStreak.ts implementation)
- **Issue:** Plan imported `startOfDay as startOfDayTz` from `date-fns-tz` — but v3 removed this export (it was in v2). TypeScript error: "Module 'date-fns-tz' has no exported member 'startOfDay'"
- **Fix:** Import `startOfDay` from `date-fns` instead; apply it after `toZonedTime` converts UTC to local time — semantically equivalent
- **Files modified:** src/hooks/useSessions.ts, src/hooks/useStreak.ts
- **Verification:** npm run build passes with no TypeScript errors
- **Committed in:** `147f9ab` (Task 3 commit)

**2. [Rule 1 - Bug] FieldValue type cast needed as unknown as intermediary**
- **Found during:** Task 3 (useStats.ts, useStreak.ts implementation)
- **Issue:** TypeScript strict mode rejects direct cast from `FieldValue` to `{ toDate: () => Date }` — types don't overlap. Build error TS2352
- **Fix:** Changed cast pattern to `as unknown as { toDate?: () => Date }` — valid TypeScript double-cast through unknown
- **Files modified:** src/hooks/useStats.ts, src/hooks/useStreak.ts
- **Verification:** npm run build passes clean
- **Committed in:** `147f9ab` (Task 3 commit)

**3. [Rule 1 - Bug] Firestore query result map type assertion needed as unknown**
- **Found during:** Task 2 (sessions.ts getSessions implementation)
- **Issue:** TypeScript error TS2352 on `{ id: d.id, ...d.data() } as SessionDocument` — spread of `DocumentData` doesn't satisfy SessionDocument shape
- **Fix:** Changed to `as unknown as SessionDocument` — safe double-cast since Firestore guarantees the shape
- **Files modified:** src/firebase/sessions.ts
- **Verification:** npm run build passes clean
- **Committed in:** `24b294b` (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (all Rule 1 - type/API bugs)
**Impact on plan:** All auto-fixes needed for TypeScript strict compilation. No scope creep. No behavioral changes — fixes are type-level only.

## Issues Encountered
None beyond the auto-fixed TypeScript strictness issues above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All typed contracts in place: useSessions, useStats, useStreak export stable APIs for Wave 2 plans
- aggregateSessions handles all TimeRange granularities (hour/day/week)
- computeStreaks handles edge cases (empty sessions, yesterday grace period, timezone boundaries)
- Potential concern: chunk size warning (582KB) — Phase 3 chart plans may want to add dynamic imports for recharts

---
*Phase: 03-stats-and-goals*
*Completed: 2026-03-02*
