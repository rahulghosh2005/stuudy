import { useMemo, useEffect } from 'react';
import { toZonedTime } from 'date-fns-tz';
import { startOfDay, differenceInCalendarDays } from 'date-fns';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import type { SessionDocument } from '../types/session';

export function computeStreaks(
  sessions: SessionDocument[],
  timezone: string
): { currentStreak: number; longestStreak: number } {
  if (sessions.length === 0) return { currentStreak: 0, longestStreak: 0 };

  // Convert each session createdAt to user-local calendar day (ms of local midnight)
  const localDates = sessions
    .filter(s => s.createdAt != null)
    .map(s => {
      const utcDate = typeof (s.createdAt as unknown as { toDate?: () => Date }).toDate === 'function'
        ? (s.createdAt as unknown as { toDate: () => Date }).toDate()
        : new Date(s.createdAt as unknown as string);
      return startOfDay(toZonedTime(utcDate, timezone)).getTime();
    });

  if (localDates.length === 0) return { currentStreak: 0, longestStreak: 0 };

  const uniqueDays = [...new Set(localDates)].sort((a, b) => a - b);

  // Longest streak
  let longest = 1;
  let run = 1;
  for (let i = 1; i < uniqueDays.length; i++) {
    const gap = differenceInCalendarDays(new Date(uniqueDays[i]), new Date(uniqueDays[i - 1]));
    if (gap === 1) {
      run++;
      if (run > longest) longest = run;
    } else {
      run = 1;
    }
  }

  // Current streak — must include today or yesterday (grace: midnight → next day still counts)
  const todayLocal = startOfDay(toZonedTime(new Date(), timezone)).getTime();
  const yesterdayLocal = todayLocal - 86400000;
  const lastDay = uniqueDays[uniqueDays.length - 1];

  if (lastDay !== todayLocal && lastDay !== yesterdayLocal) {
    return { currentStreak: 0, longestStreak: longest };
  }

  let streak = 1;
  for (let i = uniqueDays.length - 2; i >= 0; i--) {
    const gap = differenceInCalendarDays(new Date(uniqueDays[i + 1]), new Date(uniqueDays[i]));
    if (gap === 1) streak++;
    else break;
  }

  return { currentStreak: streak, longestStreak: Math.max(longest, streak) };
}

export function useStreak(sessions: SessionDocument[], timezone: string, uid: string) {
  const streaks = useMemo(() => computeStreaks(sessions, timezone), [sessions, timezone]);

  // Write back to Firestore so ProfilePage shows correct values (GOAL-01, GOAL-02)
  useEffect(() => {
    if (!uid || sessions.length === 0) return;
    updateDoc(doc(db, 'users', uid), {
      currentStreak: streaks.currentStreak,
      longestStreak: streaks.longestStreak,
    }).catch(() => { /* non-blocking — streak display is still correct from local state */ });
  }, [streaks.currentStreak, streaks.longestStreak, uid, sessions.length]);

  return streaks;
}
