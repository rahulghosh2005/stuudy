import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { useSessions } from '../hooks/useSessions';
import { useStats } from '../hooks/useStats';
import { useStreak } from '../hooks/useStreak';
import { StudyChart } from '../components/StudyChart';
import { StudyHeatmap } from '../components/StudyHeatmap';
import { SubjectBreakdown } from '../components/SubjectBreakdown';
import { GoalsSection } from '../components/GoalsSection';
import type { UserProfile } from '../types/user';
import type { TimeRange } from '../hooks/useSessions';

function StatCard({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return (
    <div style={{ background: '#1a1a1a', borderRadius: 8, padding: '16px', textAlign: 'center' }}>
      <div style={{ fontSize: 24, fontWeight: 700, color: '#fc4c02' }}>
        {value}{suffix ? ` ${suffix}` : ''}
      </div>
      <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>{label}</div>
    </div>
  );
}

export function StatsPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [range, setRange] = useState<TimeRange>('1W');
  const [subjectId, setSubjectId] = useState<string | null>(null);

  const fetchProfile = () => {
    if (!user?.uid) return;
    getDoc(doc(db, 'users', user.uid))
      .then(snap => { if (snap.exists()) setProfile(snap.data() as UserProfile); })
      .catch(() => {});
  };

  // Fetch profile (contains timezone + goal fields)
  useEffect(() => {
    fetchProfile();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  const timezone = profile?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const { sessions, loading } = useSessions(user?.uid ?? '', range, timezone);
  const { chartData: _chartData, breakdown, heatmap, total } = useStats(sessions, range, timezone, subjectId);
  const { currentStreak, longestStreak } = useStreak(sessions, timezone, user?.uid ?? '');

  return (
    <div style={{
      background: '#0a0a0a',
      minHeight: '100vh',
      color: '#fff',
      padding: '24px 16px 80px',
      maxWidth: 600,
      margin: '0 auto',
    }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>My Stats</h2>

      {/* Loading state */}
      {loading && <div style={{ color: '#555', fontSize: 14 }}>Loading...</div>}

      {/* Chart section (STAT-01, STAT-02) */}
      {user && (
        <StudyChart
          sessions={sessions}
          timezone={timezone}
          uid={user.uid}
          onRangeChange={setRange}
          onSubjectChange={setSubjectId}
        />
      )}

      {/* Total for selected range (STAT-03) */}
      <div style={{ background: '#1a1a1a', borderRadius: 12, padding: '16px', marginTop: 16, textAlign: 'center' }}>
        <div style={{ fontSize: 28, fontWeight: 700, color: '#fc4c02' }}>
          {Math.floor(total / 60)}h {total % 60}m
        </div>
        <div style={{ color: '#888', fontSize: 12, marginTop: 4 }}>Total study time (selected range)</div>
      </div>

      {/* Streak + all-time total summary (GOAL-01, STAT-06) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 16 }}>
        <StatCard label="Current streak" value={currentStreak} suffix="days" />
        <StatCard label="Longest streak" value={longestStreak} suffix="days" />
        <StatCard label="All-time total" value={Math.floor((profile?.totalStudyMinutes ?? 0) / 60)} suffix="h" />
      </div>

      {/* Heatmap calendar (STAT-04) */}
      <div style={{ marginTop: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: '#fff' }}>Activity</h3>
        <StudyHeatmap values={heatmap} />
      </div>

      {/* Subject breakdown (STAT-05) */}
      <div style={{ marginTop: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: '#fff' }}>By Subject</h3>
        <SubjectBreakdown breakdown={breakdown} totalMinutes={total} />
      </div>

      {/* Goals section (GOAL-03, GOAL-04, GOAL-05) */}
      {profile && user && (
        <GoalsSection
          uid={user.uid}
          profile={profile}
          onGoalsUpdated={() => {
            // Re-fetch profile to get updated goal fields
            getDoc(doc(db, 'users', user.uid))
              .then(snap => { if (snap.exists()) setProfile(snap.data() as UserProfile); })
              .catch(() => {});
          }}
        />
      )}
    </div>
  );
}
