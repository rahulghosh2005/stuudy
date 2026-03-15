import { useState, useEffect } from 'react';
import { toZonedTime } from 'date-fns-tz';
import { startOfDay } from 'date-fns';
import { getSessions } from '../firebase/sessions';

interface DailyProgressBarProps {
  uid: string;
  timezone: string;
  dailyGoalMinutes: number;
  dailyGoalEnabled: boolean;
}

function getStartOfLocalToday(timezone: string): Date {
  const nowInUserTz = toZonedTime(new Date(), timezone);
  return startOfDay(nowInUserTz);
}

const formatMin = (m: number): string => {
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return h > 0 ? `${h}h ${rem}m` : `${rem}m`;
};

export function DailyProgressBar({ uid, timezone, dailyGoalMinutes, dailyGoalEnabled }: DailyProgressBarProps) {
  const [todayMinutes, setTodayMinutes] = useState(0);

  useEffect(() => {
    if (!uid || !dailyGoalEnabled) return;
    const since = getStartOfLocalToday(timezone);
    getSessions(uid, since)
      .then(sessions => {
        const totalMs = sessions.reduce((acc, s) => acc + s.durationMs, 0);
        setTodayMinutes(Math.round(totalMs / 60000));
      })
      .catch(() => {
        // Non-blocking — progress bar just shows 0 on error
      });
  }, [uid, timezone, dailyGoalEnabled]);

  if (!dailyGoalEnabled) {
    return null;
  }

  const pct = dailyGoalMinutes > 0
    ? Math.min(100, Math.round((todayMinutes / dailyGoalMinutes) * 100))
    : 0;

  return (
    <div style={{ width: '100%', maxWidth: 300, margin: '12px auto 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>
          {formatMin(todayMinutes)} / {formatMin(dailyGoalMinutes)} goal
        </span>
        <span
          style={{
            color: pct >= 100 ? '#fc4c02' : 'var(--text-secondary)',
            fontSize: 11,
            fontWeight: pct >= 100 ? 700 : 400,
          }}
        >
          {pct}%
        </span>
      </div>
      <div style={{ background: 'var(--card)', borderRadius: 3, height: 4 }}>
        <div
          style={{
            background: '#fc4c02',
            borderRadius: 3,
            height: 4,
            width: `${pct}%`,
            transition: 'width 0.3s ease',
          }}
        />
      </div>
    </div>
  );
}
