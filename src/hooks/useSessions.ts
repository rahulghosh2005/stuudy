import { useState, useEffect } from 'react';
import { getSessions } from '../firebase/sessions';
import type { SessionDocument } from '../types/session';
import { subDays, subMonths, startOfDay } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

export type TimeRange = '1D' | '1W' | '1M' | '3M' | 'All';

function getRangeStart(range: TimeRange, timezone: string): Date | undefined {
  const nowLocal = toZonedTime(new Date(), timezone);
  if (range === 'All') return undefined;
  if (range === '1D') return startOfDay(nowLocal);
  if (range === '1W') return subDays(startOfDay(nowLocal), 6);
  if (range === '1M') return subMonths(new Date(), 1);
  if (range === '3M') return subMonths(new Date(), 3);
}

export function useSessions(uid: string, range: TimeRange, timezone: string) {
  const [sessions, setSessions] = useState<SessionDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) return;
    setLoading(true);
    setError(null);
    const since = getRangeStart(range, timezone);
    getSessions(uid, since)
      .then(setSessions)
      .catch(() => setError('Failed to load sessions'))
      .finally(() => setLoading(false));
  }, [uid, range, timezone]);

  return { sessions, loading, error };
}
