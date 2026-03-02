# Deferred Items

## Out-of-scope issues discovered during 03-03 execution

### StudyHeatmap.tsx TypeScript error (pre-existing from 03-02)

**Discovered during:** Plan 03-03 final build verification
**File:** src/components/StudyHeatmap.tsx
**Error:** TS2769 — react-calendar-heatmap tooltipDataAttrs and classForValue callback parameter types
  include `| undefined` (from library's generic type) but the callbacks typed with non-optional
  custom type. TypeScript strict mode rejects the assignment.
**Scope:** This file was not committed in Plan 03-02 (it was left untracked). Plan 03-03 did not
  create or modify this file.
**Action needed:** Fix in a future plan or as part of 03-04/03-05 integration work. The fix is to
  add a null/undefined guard in the callback parameter type or use a type assertion.
