# Phase 3: Stats and Goals - Research

**Researched:** 2026-03-02
**Domain:** Data visualization (Recharts AreaChart, heatmap), Firestore query/aggregation, timezone-aware streak calculation, goal persistence
**Confidence:** HIGH (core stack), MEDIUM (heatmap library choice), HIGH (Firestore patterns)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Stats page location
- Dedicated `/stats` route — own page, not embedded in ProfilePage
- Bottom tab bar navigation added: Timer (`/`) | Stats (`/stats`) | Profile (`/profile`)
- Stats page shows the signed-in user's own data only — no `/stats/:uid` for this phase
- Sections on Stats page (top to bottom): interactive chart, heatmap calendar, subject breakdown, goals section

#### Chart style
- Area chart with gradient fill in orange (`#fc4c02`) — "stock-ticker" aesthetic
- Auto-granularity based on selected time range: 1D = hourly, 1W = daily, 1M/3M = daily, All = weekly
- Time range filters: 1D | 1W | 1M | 3M | All (pill/tab strip)
- Subject filter dropdown alongside the time range filter
- Tooltip on hover/tap: date + total duration (e.g. "Mar 1 — 2h 15m")
- Library: **Recharts** (React-native, TypeScript-friendly, composable)

#### Heatmap calendar
- Toggle between two views (like a stock chart switcher dropdown): GitHub full-year grid OR month-by-month grid
- Color scale: shades of orange — no activity = dark gray (#1a1a1a), max activity = `#fc4c02`
- Tooltip on tap: date + total duration for that day
- Library: **react-calendar-heatmap**

#### Goals UI
- Goals section lives at the bottom of the `/stats` page — not a separate route
- Daily progress bar on TimerPage: thin bar below the timer display showing `Xh Ym / Zh goal — N%`
- Goals stored on the user document in Firestore (adding fields to `users/{uid}`)
- Toggle behavior: off = progress bar hidden from TimerPage, goal value preserved (restores on re-enable)
- Three independent goal types, each toggleable: daily, weekly, per-subject

#### Streak calculation
- Streak day boundaries calculated in user's IANA timezone (already stored in `UserProfile.timezone`)
- `currentStreak` and `longestStreak` updated on session write or on daily check — client-side recalculation on stats load is acceptable for this phase

### Claude's Discretion
- Exact spacing, typography, and padding on Stats page
- Loading skeleton design for chart/heatmap while data fetches
- Error state handling
- Specific color stops for orange gradient fill on area chart
- How streak recalculation is triggered (on-load vs on-write)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| STAT-01 | User can view an interactive stats chart with time range filters (1D, 1W, 1M, 3M, All) — stock-ticker style | Recharts 3.7 AreaChart + ResponsiveContainer; time-range state drives Firestore query window |
| STAT-02 | Stats chart can be filtered by subject | Subject filter dropdown reuses `getSubjects(uid)`; chart data aggregated client-side by subjectId |
| STAT-03 | Selected time range shows total study time for that period | Client-side reduce over fetched sessions; sum `durationMs`, display as Xh Ym |
| STAT-04 | Monthly heatmap calendar visualises daily study activity | react-calendar-heatmap (with --legacy-peer-deps workaround for React 19) or @uiw/react-heat-map |
| STAT-05 | Subject breakdown shows time distribution across all subjects (for selected range) | Client-side groupBy subjectId over sessions; no Firestore query change needed |
| STAT-06 | All-time cumulative study total is displayed | `UserProfile.totalStudyMinutes` field already scaffolded; update on each session save |
| GOAL-01 | User has a study streak counter (consecutive calendar days with at least one logged session) | date-fns-tz v3.2.0 toZonedTime for IANA-aware date extraction; streak computed client-side from session list |
| GOAL-02 | Streak day boundaries are calculated in the user's local timezone (not UTC) | `toZonedTime(timestamp, userTimezone)` extracts local calendar date; avoids UTC midnight boundary |
| GOAL-03 | User can set a daily study time goal (toggleable on/off) | Goal fields added to `users/{uid}` doc via `updateDoc`; `dailyGoalMinutes + dailyGoalEnabled` |
| GOAL-04 | User can set a weekly study time goal (toggleable on/off) | `weeklyGoalMinutes + weeklyGoalEnabled` fields on UserProfile |
| GOAL-05 | User can set subject-specific study goals (toggleable on/off per subject) | `subjectGoals: Record<subjectId, { minutes, enabled }>` map on UserProfile |
| GOAL-06 | Daily goal progress bar is visible on the home/timer screen | TimerPage reads today's sessions (since local midnight), sums durationMs, renders thin progress bar |
</phase_requirements>

---

## Summary

Phase 3 builds the analytics layer on top of session data written in Phase 2. The primary technical domains are: (1) Recharts 3.7 for composable SVG area charts with gradient fills, (2) a heatmap calendar library for daily activity visualization, (3) Firestore querying with date range filters and client-side aggregation, (4) timezone-aware streak calculation using `date-fns-tz`, and (5) goal persistence on the user document.

The most significant implementation risk is the **heatmap library choice**. The CONTEXT.md specifies `react-calendar-heatmap`, but that library's peerDependencies only declare support through React 18 — the project uses React 19.2.0. Installation requires `--legacy-peer-deps`. An actively maintained alternative, `@uiw/react-heat-map` (v2.3.3), supports React 19 natively and offers inline color customization via `rectProps`. Since the project uses inline styles throughout (no CSS modules, no Tailwind), the `@uiw/react-heat-map` approach is more consistent — but the user explicitly named `react-calendar-heatmap` as a locked decision. The planner should install with `--legacy-peer-deps` and implement colors via `<style>` injection or a CSS variable approach.

All aggregation (chart data points, subject breakdown, streak calculation) happens **client-side** after fetching sessions. This is appropriate for personal data volumes (typical users have < 1,000 sessions at v1 launch). Firestore composite indexes are needed for the `sessions` subcollection queries that combine `orderBy('createdAt')` with `where` range filters.

**Primary recommendation:** Use Recharts 3.7 for the chart (clean React 19 support), install `react-calendar-heatmap` with `--legacy-peer-deps` per the locked decision, use `date-fns-tz` v3.2.0 for timezone-aware streak calculation, and store all goal state as new fields on `users/{uid}`.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| recharts | 3.7.0 | AreaChart, Tooltip, ResponsiveContainer, gradient fill | Composable, TypeScript-first, officially supports React 16-19, active maintenance |
| react-calendar-heatmap | 1.10.0 | GitHub-style SVG heatmap calendar | User-locked choice; simple SVG output; works with CSS class injection |
| @types/react-calendar-heatmap | ^1.0.0 | TypeScript types for react-calendar-heatmap | Separate DefinitelyTyped package required |
| date-fns-tz | 3.2.0 | IANA timezone-aware date math for streak calculation | Peers with date-fns v3; uses Intl API (no bundled tz data); `toZonedTime` API |
| date-fns | 3.x | Date utilities (startOfDay, subDays, eachDayOfInterval, etc.) | Peer dependency of date-fns-tz; tree-shakeable |

### Supporting
| Library | Purpose | When to Use |
|---------|---------|-------------|
| Firebase JS SDK (already installed) | `getDocs`, `query`, `where`, `orderBy`, `updateDoc`, `doc` | Querying sessions subcollection and writing goal fields to user doc |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-calendar-heatmap | @uiw/react-heat-map v2.3.3 | React 19 native support, inline color via `rectProps`, actively maintained — but user locked react-calendar-heatmap |
| date-fns-tz | Luxon or Temporal API | Temporal Stage 3 but not universally available; Luxon is heavier; date-fns-tz + Intl API is lightest |
| client-side aggregation | Firestore aggregation queries (`sum()`) | Firestore `sum()` does not support subcollection paths with compound where+orderBy without collection group index; client aggregation is simpler for personal data volumes |

**Installation:**
```bash
# Recharts (React 19 official support in 3.x peerDependencies)
npm install recharts

# react-calendar-heatmap (React 18 declared peer dep — requires flag for React 19)
npm install react-calendar-heatmap --legacy-peer-deps
npm install --save-dev @types/react-calendar-heatmap --legacy-peer-deps

# Timezone-aware date math
npm install date-fns date-fns-tz
```

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── pages/
│   ├── TimerPage.tsx         # Add daily progress bar (GOAL-06)
│   └── StatsPage.tsx         # NEW: /stats route — full analytics page
├── components/
│   ├── StudyChart.tsx         # NEW: Recharts AreaChart with gradient + time-range filters
│   ├── StudyHeatmap.tsx       # NEW: react-calendar-heatmap wrapper with orange colors
│   ├── SubjectBreakdown.tsx   # NEW: bar/list breakdown of study time by subject
│   ├── GoalsSection.tsx       # NEW: daily/weekly/subject goal input + toggles
│   ├── DailyProgressBar.tsx   # NEW: thin bar for TimerPage goal display
│   └── BottomTabBar.tsx       # NEW: Timer | Stats | Profile navigation
├── firebase/
│   ├── sessions.ts            # Add getSessions(uid, opts) query helper
│   └── users.ts               # Add updateGoals(uid, goalFields) helper
├── hooks/
│   ├── useSessions.ts         # NEW: fetches + caches sessions for a uid + time range
│   ├── useStats.ts            # NEW: aggregates sessions into chart/heatmap/breakdown data
│   └── useStreak.ts           # NEW: computes currentStreak/longestStreak from session list
└── types/
    └── user.ts                # Extend UserProfile with goal fields
```

### Pattern 1: Recharts AreaChart with SVG Gradient Fill

**What:** Use `<defs><linearGradient>` inside `<AreaChart>` to define an orange fade, then reference via `fill="url(#orangeGradient)"` on `<Area>`.
**When to use:** All chart renderings in StudyChart.tsx.

```typescript
// Source: https://leanylabs.com/blog/awesome-react-charts-tips/
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';

function StudyChart({ data }: { data: Array<{ label: string; minutes: number }> }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="orangeGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#fc4c02" stopOpacity={0.6} />
            <stop offset="95%" stopColor="#fc4c02" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
        <XAxis dataKey="label" stroke="#555" tick={{ fill: '#888', fontSize: 11 }} />
        <YAxis stroke="#555" tick={{ fill: '#888', fontSize: 11 }} />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="minutes"
          stroke="#fc4c02"
          strokeWidth={2}
          fill="url(#orangeGradient)"
          fillOpacity={1}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
```

### Pattern 2: Custom Recharts Tooltip (Recharts 3.x)

**What:** In Recharts 3.x, the `content` prop of `<Tooltip>` receives `TooltipContentProps` (renamed from `TooltipProps` in 2.x migration).
**When to use:** Custom date + duration tooltip display.

```typescript
// Source: https://github.com/recharts/recharts/wiki/3.0-migration-guide
import type { TooltipProps } from 'recharts';

// Recharts 3 exports TooltipProps for the content prop signature
function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null;
  const minutes = payload[0].value as number;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return (
    <div style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 6, padding: '8px 12px' }}>
      <p style={{ color: '#888', margin: 0, fontSize: 12 }}>{label}</p>
      <p style={{ color: '#fc4c02', margin: '4px 0 0', fontWeight: 700 }}>
        {hours > 0 ? `${hours}h ${mins}m` : `${mins}m`}
      </p>
    </div>
  );
}
```

### Pattern 3: Firestore Sessions Query with Date Range

**What:** Query `users/{uid}/sessions` subcollection with `where + orderBy` on `createdAt` for a time window.
**When to use:** Fetching sessions for the selected chart time range (1D, 1W, 1M, 3M, All).

```typescript
// Source: https://firebase.google.com/docs/firestore/query-data/queries
import { collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { db } from './config';
import type { SessionDocument } from '../types/session';

export async function getSessions(
  uid: string,
  since?: Date  // undefined = all time
): Promise<SessionDocument[]> {
  const sessionsRef = collection(db, 'users', uid, 'sessions');
  const constraints = since
    ? [where('createdAt', '>=', Timestamp.fromDate(since)), orderBy('createdAt', 'asc')]
    : [orderBy('createdAt', 'asc')];
  const q = query(sessionsRef, ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as SessionDocument);
}
```

**Important:** The `where('createdAt', '>=', ...)` + `orderBy('createdAt')` pattern on the same field does NOT require a composite index in Firestore — single-field range queries are automatically indexed. A composite index would only be needed if filtering by a different field AND ordering by `createdAt`.

### Pattern 4: Timezone-Aware Streak Calculation

**What:** Use `date-fns-tz` `toZonedTime` to convert each session's UTC `createdAt` to the user's local date, dedupe by calendar date, then count consecutive days ending today.
**When to use:** Computing `currentStreak` and `longestStreak`.

```typescript
// Source: https://github.com/marnusw/date-fns-tz (date-fns-tz v3.2.0)
import { toZonedTime } from 'date-fns-tz';
import { startOfDay, differenceInCalendarDays } from 'date-fns';
import type { SessionDocument } from '../types/session';

export function computeStreaks(
  sessions: SessionDocument[],
  timezone: string   // IANA e.g. "Asia/Tokyo"
): { currentStreak: number; longestStreak: number } {
  if (sessions.length === 0) return { currentStreak: 0, longestStreak: 0 };

  // Convert each session to user-local calendar date string
  const localDates = sessions.map(s => {
    const utcDate = s.createdAt instanceof Object && 'toDate' in s.createdAt
      ? (s.createdAt as any).toDate()
      : new Date(s.createdAt as any);
    const zonedDate = toZonedTime(utcDate, timezone);
    return startOfDay(zonedDate).getTime(); // ms timestamp of local midnight
  });

  // Unique sorted calendar days
  const uniqueDays = [...new Set(localDates)].sort((a, b) => a - b);

  // Count longest streak
  let longest = 1;
  let current = 1;
  for (let i = 1; i < uniqueDays.length; i++) {
    const gap = differenceInCalendarDays(new Date(uniqueDays[i]), new Date(uniqueDays[i - 1]));
    if (gap === 1) {
      current++;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }

  // Current streak: count backward from today
  const todayLocal = startOfDay(toZonedTime(new Date(), timezone)).getTime();
  const yesterdayLocal = todayLocal - 86400000;
  const lastDay = uniqueDays[uniqueDays.length - 1];

  // Streak is live only if user studied today or yesterday
  if (lastDay !== todayLocal && lastDay !== yesterdayLocal) {
    return { currentStreak: 0, longestStreak: longest };
  }

  // Walk back from most recent
  let streak = 1;
  for (let i = uniqueDays.length - 2; i >= 0; i--) {
    const gap = differenceInCalendarDays(
      new Date(uniqueDays[i + 1]),
      new Date(uniqueDays[i])
    );
    if (gap === 1) streak++;
    else break;
  }

  return { currentStreak: streak, longestStreak: Math.max(longest, streak) };
}
```

### Pattern 5: Goal Fields on UserProfile + Firestore Update

**What:** Extend `UserProfile` type with goal fields; use `updateDoc` to persist changes.
**When to use:** When user toggles or edits a goal.

```typescript
// Extend src/types/user.ts
export interface SubjectGoal {
  minutes: number;
  enabled: boolean;
}

export interface UserProfile {
  // ... existing fields ...
  // Phase 3 goal fields — add with setDoc merge:true if not present
  dailyGoalMinutes: number;      // 0 = not set
  dailyGoalEnabled: boolean;
  weeklyGoalMinutes: number;
  weeklyGoalEnabled: boolean;
  subjectGoals: Record<string, SubjectGoal>; // key = subjectId
}
```

```typescript
// firebase/users.ts — updateGoals helper
import { doc, updateDoc } from 'firebase/firestore';
import { db } from './config';

export async function updateGoals(
  uid: string,
  fields: Partial<Pick<UserProfile,
    'dailyGoalMinutes' | 'dailyGoalEnabled' |
    'weeklyGoalMinutes' | 'weeklyGoalEnabled' |
    'subjectGoals'
  >>
): Promise<void> {
  await updateDoc(doc(db, 'users', uid), fields as Record<string, unknown>);
}
```

### Pattern 6: react-calendar-heatmap Color Injection (CSS workaround for React 19 inline-style project)

**What:** react-calendar-heatmap uses `classForValue` to assign CSS classes, then you inject a `<style>` tag or use a CSS module. Since this project uses no CSS modules, inject a `<style>` element.
**When to use:** Heatmap color scale for the orange theme.

```typescript
// StudyHeatmap.tsx
import CalendarHeatmap from 'react-calendar-heatmap';
// Note: requires @types/react-calendar-heatmap for TypeScript

const HEATMAP_STYLE = `
  .rhm-cell-0 { fill: #1a1a1a; }   /* no activity */
  .rhm-cell-1 { fill: #7a2500; }   /* low */
  .rhm-cell-2 { fill: #b83800; }   /* medium-low */
  .rhm-cell-3 { fill: #e04000; }   /* medium-high */
  .rhm-cell-4 { fill: #fc4c02; }   /* max */
`;

export function StudyHeatmap({ values }: { values: Array<{ date: string; count: number }> }) {
  return (
    <div>
      <style>{HEATMAP_STYLE}</style>
      <CalendarHeatmap
        startDate={new Date(new Date().setFullYear(new Date().getFullYear() - 1))}
        endDate={new Date()}
        values={values}
        classForValue={(value) => {
          if (!value || value.count === 0) return 'rhm-cell-0';
          if (value.count < 30) return 'rhm-cell-1';
          if (value.count < 60) return 'rhm-cell-2';
          if (value.count < 120) return 'rhm-cell-3';
          return 'rhm-cell-4';
        }}
        tooltipDataAttrs={(value: { date: string; count: number } | null) => ({
          'data-tip': value ? `${value.date}: ${value.count}m` : '',
        })}
      />
    </div>
  );
}
```

### Pattern 7: Chart Data Aggregation (client-side)

**What:** Group sessions by time bucket (hour/day/week) based on selected range, summing `durationMs` per bucket.
**When to use:** Building chart data points from raw Firestore session list.

```typescript
// useStats.ts — aggregation helper
export function aggregateSessions(
  sessions: SessionDocument[],
  range: '1D' | '1W' | '1M' | '3M' | 'All',
  timezone: string,
  subjectId?: string | null
): Array<{ label: string; minutes: number }> {
  const filtered = subjectId
    ? sessions.filter(s => s.subjectId === subjectId)
    : sessions;

  // Granularity: 1D = hourly, 1W/1M/3M = daily, All = weekly
  const granularity = range === '1D' ? 'hour' : range === 'All' ? 'week' : 'day';
  // ... bucket by converting createdAt → toZonedTime → format bucket key
  // ... reduce to { label: string; minutes: number }[]
  return bucketed;
}
```

### Anti-Patterns to Avoid

- **Using `new Date()` for user's local "today":** Always use `toZonedTime(new Date(), userTimezone)` for the user's local date. `new Date()` returns server/browser local time which is correct only if the browser timezone matches the user's stored timezone.
- **Querying all-time sessions on every render:** Cache sessions in a hook; only re-query when the time range changes. Use `useEffect` with `[uid, rangeStart]` as deps.
- **Sorting heatmap data in Firestore:** Fetch all sessions, group + sum client-side by calendar date — don't try to use Firestore aggregation for this.
- **Storing streak as a field that "auto-decrements" at midnight:** Recalculate streak from session history on stats load (client-side). Don't build a Cloud Function for this in Phase 3.
- **Recharts v2 API in v3:** `TooltipProps` was renamed `TooltipContentProps` for the `content` prop in Recharts 3 migration. Use `TooltipProps<number, string>` for the component signature — that type still exists but means something different. Check the migration guide.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| IANA timezone date conversion | Custom UTC offset math | `date-fns-tz` `toZonedTime` | DST transitions make raw offset math wrong ~2x/year per timezone |
| SVG gradient area chart | Custom SVG rendering | Recharts `<AreaChart>` + `<defs><linearGradient>` | Recharts handles responsive sizing, axis math, tooltip positioning, animation |
| Calendar heatmap rendering | Custom SVG grid | `react-calendar-heatmap` | Week-aligned grid, date ranging, leap years — all handled |
| Aggregating sessions by time bucket | SQL-style GROUP BY in code | Client-side `reduce` using `date-fns` formatting | The data volume is small; library overhead not worth it |
| Firestore write aggregation | Cloud Function on every session write | Calculate stats on read (stats load) | Phase 3 decision: client-side recalculation on stats load is acceptable |

**Key insight:** The DST edge cases alone justify using `date-fns-tz` — a user in a DST timezone crossing a DST boundary could get their streak broken or double-counted by naive UTC math.

---

## Common Pitfalls

### Pitfall 1: react-calendar-heatmap + React 19 Peer Dep Conflict
**What goes wrong:** `npm install react-calendar-heatmap` fails with peer dependency conflict because the package declares `react: "^0.14.0 || ^15.0.0 || ^16.0.0 || ^17.0.0 || ^18.0.0"` and the project is on React 19.2.0.
**Why it happens:** react-calendar-heatmap v1.10.0 was last published ~1 year ago and has not been updated for React 19.
**How to avoid:** Install with `npm install react-calendar-heatmap --legacy-peer-deps && npm install --save-dev @types/react-calendar-heatmap --legacy-peer-deps`. The library itself works fine at runtime; the peer dep declaration is overly conservative.
**Warning signs:** npm exits with `ERESOLVE` error mentioning react peer dependency.

### Pitfall 2: Streak Calculation Using UTC Midnight
**What goes wrong:** A user in UTC+9 (Tokyo) finishes a study session at 1am Tokyo time — which is 4pm UTC the previous day. If streak boundaries are computed in UTC, this session is counted on a different calendar day than the user's local experience, causing streak breaks or incorrect counts.
**Why it happens:** Firestore `createdAt` is stored as UTC epoch. Naively calling `new Date(timestamp).toLocaleDateString()` uses the browser's local timezone, which may not match `UserProfile.timezone` (set at sign-in and stored in Firestore).
**How to avoid:** Always use `toZonedTime(timestamp, userProfile.timezone)` from `date-fns-tz` before extracting the calendar date.
**Warning signs:** Users in non-UTC timezones reporting incorrect streaks; streaks resetting at UTC midnight instead of local midnight.

### Pitfall 3: Firestore `createdAt` May Be `null` on Client Optimistic Write
**What goes wrong:** Immediately after `addDoc`, if the component fetches sessions before the server timestamp resolves, `createdAt` can be `null` or a `FieldValue` sentinel — not a real `Timestamp`. Calling `.toDate()` on it throws.
**Why it happens:** `serverTimestamp()` is a sentinel value on the client until the write is committed and the document is read back.
**How to avoid:** In `getSessions`, defensively check `if (s.createdAt && typeof s.createdAt.toDate === 'function')` before calling `.toDate()`. Or use `startTimestamp` (which is a real `Timestamp.fromMillis()`) as a fallback for date grouping.
**Warning signs:** `TypeError: s.createdAt.toDate is not a function` in the browser console.

### Pitfall 4: Recharts v3 Breaking Change — `TooltipProps` vs `TooltipContentProps`
**What goes wrong:** Code written for Recharts 2.x that uses `TooltipProps` for a custom tooltip `content` component gets TypeScript errors or runtime issues in Recharts 3.x.
**Why it happens:** Recharts 3.0 migration renamed the type used in the `content` prop. `TooltipProps` still exists but has a different signature than the content callback.
**How to avoid:** Use `TooltipProps<number, string>` as the component props type (this is the correct type for a standalone component passed to `content=`). Verify against the 3.0 migration guide.
**Warning signs:** TypeScript error `Type 'CustomTooltip' is not assignable to type ...` in the Tooltip content prop.

### Pitfall 5: Recharts `ResponsiveContainer` Requires Non-Zero Parent Height
**What goes wrong:** `ResponsiveContainer` with `width="100%"` and `height={200}` renders a 0-height SVG if the parent element has `height: 0` or is flex-column without a fixed height.
**Why it happens:** ResponsiveContainer reads the DOM container's computed size. If the parent doesn't have an explicit height, it may report 0.
**How to avoid:** Always set an explicit `height` number on `ResponsiveContainer` (e.g., `height={220}`) rather than `height="100%"` unless the parent has a fixed height.
**Warning signs:** Chart renders but is invisible; DevTools shows SVG with height="0".

### Pitfall 6: Heatmap month-by-month view needs manual date windowing
**What goes wrong:** `react-calendar-heatmap` only renders a full-year view when `startDate` and `endDate` span a year. To show month-by-month, you must pass a startDate of the first of the selected month and endDate of the last day of that month.
**Why it happens:** The component renders one continuous grid from startDate to endDate — there's no built-in "month" mode.
**How to avoid:** Track a `selectedMonth` state (defaults to current month). Compute `startDate = startOfMonth(selectedMonth)` and `endDate = endOfMonth(selectedMonth)` using date-fns. The toggle in CONTEXT.md (full-year vs month-by-month) becomes a UI state that changes startDate/endDate props.
**Warning signs:** Month-by-month view shows 12 months of data instead of just one month.

---

## Code Examples

Verified patterns from official/authoritative sources:

### Firestore: Query sessions subcollection with date range
```typescript
// Source: https://firebase.google.com/docs/firestore/query-data/queries
import { collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { db } from './config';
import type { SessionDocument } from '../types/session';

export async function getSessions(uid: string, since?: Date): Promise<SessionDocument[]> {
  const ref = collection(db, 'users', uid, 'sessions');
  const q = since
    ? query(ref, where('createdAt', '>=', Timestamp.fromDate(since)), orderBy('createdAt', 'asc'))
    : query(ref, orderBy('createdAt', 'asc'));
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as SessionDocument))
    .filter(s => s.createdAt != null); // guard against optimistic-write null timestamps
}
```

### date-fns-tz: Convert Firestore Timestamp to user-local date
```typescript
// Source: https://github.com/marnusw/date-fns-tz (v3 API)
import { toZonedTime } from 'date-fns-tz';
import { format } from 'date-fns';
import type { Timestamp } from 'firebase/firestore';

function sessionToLocalDateKey(createdAt: Timestamp, timezone: string): string {
  const utcDate = createdAt.toDate();
  const zonedDate = toZonedTime(utcDate, timezone);
  return format(zonedDate, 'yyyy-MM-dd');  // e.g. "2026-03-02"
}
```

### Recharts: Full AreaChart composition
```typescript
// Source: https://recharts.github.io/en-US/api/AreaChart
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip
} from 'recharts';

<ResponsiveContainer width="100%" height={220}>
  <AreaChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: -20 }}>
    <defs>
      <linearGradient id="orangeFill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor="#fc4c02" stopOpacity={0.55} />
        <stop offset="95%" stopColor="#fc4c02" stopOpacity={0} />
      </linearGradient>
    </defs>
    <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" vertical={false} />
    <XAxis dataKey="label" stroke="transparent" tick={{ fill: '#666', fontSize: 10 }} />
    <YAxis stroke="transparent" tick={{ fill: '#666', fontSize: 10 }} />
    <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#fc4c02', strokeWidth: 1, strokeDasharray: '4 4' }} />
    <Area
      type="monotone"
      dataKey="minutes"
      stroke="#fc4c02"
      strokeWidth={2}
      fill="url(#orangeFill)"
      fillOpacity={1}
      dot={false}
      activeDot={{ r: 4, fill: '#fc4c02', stroke: '#0a0a0a', strokeWidth: 2 }}
    />
  </AreaChart>
</ResponsiveContainer>
```

### Firestore: Update goal fields on user document
```typescript
// Source: https://firebase.google.com/docs/firestore/manage-data/add-data#update-data
import { doc, updateDoc } from 'firebase/firestore';
import { db } from './config';

async function saveDailyGoal(uid: string, minutes: number, enabled: boolean) {
  await updateDoc(doc(db, 'users', uid), {
    dailyGoalMinutes: minutes,
    dailyGoalEnabled: enabled,
  });
}
```

### Bottom tab bar (react-router-dom NavLink pattern)
```typescript
// Source: https://reactrouter.com/en/main/components/nav-link
import { NavLink } from 'react-router-dom';

export function BottomTabBar() {
  const tabStyle = (isActive: boolean): React.CSSProperties => ({
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '10px 0', color: isActive ? '#fc4c02' : '#555',
    textDecoration: 'none', fontSize: 11, fontWeight: isActive ? 700 : 400,
    borderTop: `2px solid ${isActive ? '#fc4c02' : 'transparent'}`,
  });
  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: '#0a0a0a', display: 'flex',
      borderTop: '1px solid #1a1a1a', zIndex: 100,
    }}>
      <NavLink to="/" end style={({ isActive }) => tabStyle(isActive)}>Timer</NavLink>
      <NavLink to="/stats" style={({ isActive }) => tabStyle(isActive)}>Stats</NavLink>
      <NavLink to="/profile" style={({ isActive }) => tabStyle(isActive)}>Profile</NavLink>
    </nav>
  );
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Recharts 2.x `TooltipProps` for custom tooltip content | Recharts 3.x keeps `TooltipProps<V, N>` for component signature | v3.0 (Oct 2024) | Check 3.0 migration guide before writing tooltip code |
| `utcToZonedTime` from date-fns-tz v2 | `toZonedTime` from date-fns-tz v3 | v3.0 of date-fns-tz | Function renamed; old name removed in v3 |
| date-fns v2 with date-fns-tz v2 | date-fns v3 with date-fns-tz v3 | 2023-2024 | Both must be v3; mixing versions causes type errors |
| Firestore client SDK v8 (compat) | Modular SDK v9+ (firebase ^12.10.0 already installed) | 2021 | Use tree-shakeable imports: `import { getDocs } from 'firebase/firestore'` |

**Deprecated/outdated:**
- `utcToZonedTime` from date-fns-tz: replaced by `toZonedTime` in v3 — do NOT use the old name
- `zonedTimeToUtc` from date-fns-tz: replaced by `fromZonedTime` in v3 (if needed)
- Recharts `<ResponsiveContainer>` `ref.current.current` pattern: removed in v3

---

## Open Questions

1. **Heatmap tooltip on mobile (tap vs hover)**
   - What we know: `react-calendar-heatmap` uses `tooltipDataAttrs` to set `data-tip` attributes — these work with react-tooltip or tippy.js but have no built-in mobile tap handler.
   - What's unclear: User experience for mobile tap-to-show-tooltip — the project targets mobile-responsive web.
   - Recommendation: Implement a simple `onMouseOver`/`onMouseLeave` callback on the heatmap with controlled tooltip state (a positioned `<div>`) rather than introducing another tooltip library. This avoids a 3rd dependency.

2. **Streak display on ProfilePage (PROF-01) vs StatsPage**
   - What we know: `ProfilePage` already displays `profile.currentStreak` from the Firestore user document. Phase 3 writes the computed streak back to the user document after recalculation.
   - What's unclear: Whether `ProfilePage` should trigger a streak recalculation or only display the stored value.
   - Recommendation: Only StatsPage recalculates and updates streak. ProfilePage always reads the stored value. This avoids double-writes and keeps ProfilePage fast (already uses a single `getDoc`).

3. **`totalStudyMinutes` on UserProfile — who updates it?**
   - What we know: `UserProfile.totalStudyMinutes` is already scaffolded at 0. STAT-06 requires displaying an all-time total.
   - What's unclear: Whether to update it on every session write (in `addSession`) or derive it from the fetched sessions on Stats load.
   - Recommendation: Update `totalStudyMinutes` inside `addSession` using `updateDoc` with `increment(durationMs / 60000)` after each session write. This keeps STAT-06 cheap (reads UserProfile, no extra query). The stats page can also display a live-aggregated total from fetched sessions for the selected range.

4. **Daily progress bar data source (GOAL-06)**
   - What we know: The progress bar on TimerPage shows `todayMs / dailyGoalMs` where "today" = user's local calendar day.
   - What's unclear: Whether to run a separate Firestore query for today's sessions on TimerPage load, or reuse a session cache.
   - Recommendation: Run a lightweight `getSessions(uid, startOfLocalDay)` query on TimerPage when `dailyGoalEnabled === true`. Cache in a `useTodaySessions` hook. This is a single query with a tight date range — fast and cheap.

---

## Sources

### Primary (HIGH confidence)
- Recharts official docs: https://recharts.github.io/en-US/api/AreaChart — AreaChart API
- Recharts 3.0 migration guide: https://github.com/recharts/recharts/wiki/3.0-migration-guide — TooltipProps → TooltipContentProps, removed props
- Firebase docs: https://firebase.google.com/docs/firestore/query-data/queries — where + orderBy pattern
- Firebase docs: https://firebase.google.com/docs/firestore/query-data/order-limit-data — ordering and range queries
- date-fns-tz GitHub: https://github.com/marnusw/date-fns-tz — toZonedTime API, v3 compatibility

### Secondary (MEDIUM confidence)
- LeanyLabs blog (gradient fill pattern, verified against official Recharts examples): https://leanylabs.com/blog/awesome-react-charts-tips/
- react-calendar-heatmap GitHub (peer dep peerDependencies verified): https://github.com/kevinsqi/react-calendar-heatmap/blob/master/package.json — confirms React 18 max declared
- Recharts GitHub issue #4558 (React 19 support status): https://github.com/recharts/recharts/issues/4558 — confirmed closed as resolved in 3.x
- Trophy.so blog (streak algorithm pattern): https://trophy.so/blog/how-to-build-a-streaks-feature
- react-calendar-heatmap npm listing: confirms v1.10.0, last published ~1 year ago

### Tertiary (LOW confidence)
- WebSearch result: recharts 3.x peerDependencies include `"react": "^16.8.0 || ^17.0.0 || ^18.0.0 || ^19.0.0"` — cited from multiple sources but not personally verified against live package.json
- WebSearch result: @uiw/react-heat-map v2.3.3 supports React 19 natively — not deeply verified, cited as alternative

---

## Metadata

**Confidence breakdown:**
- Standard stack (Recharts, date-fns-tz): HIGH — multiple authoritative sources confirm versions and APIs
- Heatmap library (react-calendar-heatmap): MEDIUM — library is stale, React 19 workaround required; confirmed via peerDependencies check
- Architecture patterns: HIGH — follows established project patterns (inline styles, firebase modular SDK, useAuth hook)
- Firestore query patterns: HIGH — verified against official Firebase docs
- Streak algorithm: MEDIUM — algorithm is sound; `toZonedTime` API verified, but full DST edge case coverage not tested
- Pitfalls: HIGH — most verified from official migration guides and library source

**Research date:** 2026-03-02
**Valid until:** 2026-04-02 (Recharts and date-fns-tz are stable; react-calendar-heatmap unlikely to update)
