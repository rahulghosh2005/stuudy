import { useMemo } from 'react';
import { toZonedTime } from 'date-fns-tz';
import { format, startOfWeek, getHours } from 'date-fns';
import type { SessionDocument } from '../types/session';
import type { TimeRange } from './useSessions';

export function aggregateSessions(
  sessions: SessionDocument[],
  range: TimeRange,
  timezone: string,
  subjectId?: string | null
): Array<{ label: string; minutes: number }> {
  const filtered = subjectId
    ? sessions.filter(s => s.subjectId === subjectId)
    : sessions;

  const granularity = range === '1D' ? 'hour' : range === 'All' ? 'week' : 'day';

  const buckets: Record<string, number> = {};

  for (const s of filtered) {
    if (!s.createdAt) continue;
    const utcDate = typeof (s.createdAt as unknown as { toDate?: () => Date }).toDate === 'function'
      ? (s.createdAt as unknown as { toDate: () => Date }).toDate()
      : new Date(s.createdAt as unknown as string);
    const localDate = toZonedTime(utcDate, timezone);

    let key: string;
    if (granularity === 'hour') {
      key = `${getHours(localDate).toString().padStart(2, '0')}:00`;
    } else if (granularity === 'day') {
      key = format(localDate, 'MMM d');
    } else {
      // week — use start-of-week label
      key = format(startOfWeek(localDate), 'MMM d');
    }

    buckets[key] = (buckets[key] ?? 0) + s.durationMs / 60000;
  }

  return Object.entries(buckets)
    .map(([label, minutes]) => ({ label, minutes: Math.round(minutes) }));
}

export function subjectBreakdown(
  sessions: SessionDocument[]
): Array<{ subjectId: string | null; subject: string; minutes: number }> {
  const map: Record<string, { subject: string; minutes: number }> = {};
  for (const s of sessions) {
    const key = s.subjectId ?? '__none__';
    if (!map[key]) map[key] = { subject: s.subject ?? 'No subject', minutes: 0 };
    map[key].minutes += s.durationMs / 60000;
  }
  return Object.entries(map)
    .map(([subjectId, v]) => ({
      subjectId: subjectId === '__none__' ? null : subjectId,
      ...v,
      minutes: Math.round(v.minutes),
    }))
    .sort((a, b) => b.minutes - a.minutes);
}

export function heatmapValues(
  sessions: SessionDocument[],
  timezone: string
): Array<{ date: string; count: number }> {
  const map: Record<string, number> = {};
  for (const s of sessions) {
    if (!s.createdAt) continue;
    const utcDate = typeof (s.createdAt as unknown as { toDate?: () => Date }).toDate === 'function'
      ? (s.createdAt as unknown as { toDate: () => Date }).toDate()
      : new Date(s.createdAt as unknown as string);
    const key = format(toZonedTime(utcDate, timezone), 'yyyy-MM-dd');
    map[key] = (map[key] ?? 0) + Math.round(s.durationMs / 60000);
  }
  return Object.entries(map).map(([date, count]) => ({ date, count }));
}

export function totalMinutes(sessions: SessionDocument[]): number {
  return Math.round(sessions.reduce((acc, s) => acc + s.durationMs / 60000, 0));
}

export function useStats(
  sessions: SessionDocument[],
  range: string,
  timezone: string,
  subjectId?: string | null
) {
  const chartData = useMemo(
    () => aggregateSessions(sessions, range as TimeRange, timezone, subjectId),
    [sessions, range, timezone, subjectId]
  );
  const breakdown = useMemo(() => subjectBreakdown(sessions), [sessions]);
  const heatmap = useMemo(() => heatmapValues(sessions, timezone), [sessions, timezone]);
  const total = useMemo(() => totalMinutes(sessions), [sessions]);
  return { chartData, breakdown, heatmap, total };
}
