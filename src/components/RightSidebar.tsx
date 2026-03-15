import { useEffect, useState } from 'react';
import { doc, getDoc, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { toZonedTime } from 'date-fns-tz';
import { startOfDay, formatDistanceToNow } from 'date-fns';
import { db } from '../firebase/config';
import { getSessions } from '../firebase/sessions';
import { useAuth } from '../contexts/AuthContext';
import { BookOpen } from 'lucide-react';
import type { UserProfile } from '../types/user';
import type { SessionDocument } from '../types/session';

type SessionWithId = SessionDocument & { id: string };

function getStartOfLocalToday(timezone: string): Date {
  const nowInUserTz = toZonedTime(new Date(), timezone);
  return startOfDay(nowInUserTz);
}

const formatDuration = (ms: number): string => {
  const totalMin = Math.round(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const SideLabel = ({ children }: { children: React.ReactNode }) => (
  <h3 style={{
    fontSize: '11px',
    fontWeight: 800,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    margin: '0 0 10px',
  }}>
    {children}
  </h3>
);

export function RightSidebar() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [todayMinutes, setTodayMinutes] = useState(0);
  const [recentSessions, setRecentSessions] = useState<SessionWithId[]>([]);

  useEffect(() => {
    if (!user?.uid) return;
    getDoc(doc(db, 'users', user.uid))
      .then(snap => { if (snap.exists()) setProfile(snap.data() as UserProfile); })
      .catch(() => {});
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid || !profile) return;
    const timezone = profile.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
    const since = getStartOfLocalToday(timezone);
    getSessions(user.uid, since)
      .then(sessions => {
        const totalMs = sessions.reduce((acc, s) => acc + s.durationMs, 0);
        setTodayMinutes(Math.round(totalMs / 60000));
      })
      .catch(() => {});
  }, [user?.uid, profile]);

  useEffect(() => {
    if (!user?.uid) return;
    const ref = collection(db, 'users', user.uid, 'sessions');
    const q = query(ref, orderBy('createdAt', 'desc'), limit(5));
    getDocs(q)
      .then(snap => {
        const sessions = snap.docs
          .map(d => ({ id: d.id, ...d.data() } as unknown as SessionWithId))
          .filter(s => s.createdAt != null);
        setRecentSessions(sessions);
      })
      .catch(() => {});
  }, [user?.uid]);

  const dailyGoalEnabled = profile?.dailyGoalEnabled ?? false;
  const dailyGoalMinutes = profile?.dailyGoalMinutes ?? 60;
  const pct = dailyGoalEnabled && dailyGoalMinutes > 0
    ? Math.min(100, Math.round((todayMinutes / dailyGoalMinutes) * 100))
    : 0;

  return (
    <div className="right-sidebar" style={{
      width: 252,
      minWidth: 252,
      background: 'var(--bg-secondary)',
      borderLeft: '1px solid var(--border)',
      height: '100vh',
      position: 'sticky',
      top: 0,
      padding: '20px 16px 24px',
      boxSizing: 'border-box',
      overflowY: 'auto',
    }}>
      {/* ── Today's summary ──────────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <SideLabel>Today</SideLabel>
        <div style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '14px 16px',
        }}>
          <div style={{
            fontSize: 28, fontWeight: 900,
            color: 'var(--accent)', letterSpacing: '-0.04em', lineHeight: 1,
          }}>
            {Math.floor(todayMinutes / 60)}h {todayMinutes % 60}m
          </div>
          {dailyGoalEnabled && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', margin: '10px 0 5px' }}>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500 }}>
                  Goal: {Math.floor(dailyGoalMinutes / 60)}h {dailyGoalMinutes % 60}m
                </span>
                <span style={{
                  fontSize: 11,
                  color: pct >= 100 ? 'var(--success)' : 'var(--text-secondary)',
                  fontWeight: 700,
                }}>
                  {pct}%
                </span>
              </div>
              <div style={{ background: 'var(--border)', borderRadius: 100, height: 4, overflow: 'hidden' }}>
                <div style={{
                  background: pct >= 100 ? 'var(--success)' : 'var(--accent)',
                  borderRadius: 100, height: 4,
                  width: `${pct}%`, transition: 'width 0.4s ease',
                }} />
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Recent sessions ──────────────────────────────────────────── */}
      <div>
        <SideLabel>Recent</SideLabel>
        {recentSessions.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 8, padding: '28px 0', color: 'var(--text-tertiary)',
          }}>
            <BookOpen size={20} strokeWidth={1.5} />
            <span style={{ fontSize: 12, fontWeight: 500 }}>No sessions yet</span>
          </div>
        ) : (
          recentSessions.map(s => (
            <div key={s.id} style={{
              marginBottom: 8, padding: '10px 12px',
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 10, transition: 'border-color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-alt)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{
                  fontSize: 13, fontWeight: 700, color: 'var(--text)',
                  flex: 1, marginRight: 8,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {s.subject ?? 'Study Session'}
                </span>
                <span style={{
                  fontSize: 12, color: 'var(--accent)',
                  fontWeight: 800, flexShrink: 0, letterSpacing: '-0.01em',
                }}>
                  {formatDuration(s.durationMs)}
                </span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 3, fontWeight: 500 }}>
                {s.startTimestamp ? formatDistanceToNow(s.startTimestamp.toDate(), { addSuffix: true }) : ''}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
