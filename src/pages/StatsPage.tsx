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
import { Flame, Zap, Clock } from 'lucide-react';
import type { UserProfile } from '../types/user';
import type { TimeRange } from '../hooks/useSessions';

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{
      fontSize: 11,
      fontWeight: 800,
      color: 'var(--text-secondary)',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.09em',
      margin: '0 0 14px',
    }}>
      {children}
    </h3>
  );
}

interface StatPillProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent?: boolean;
}

function StatPill({ label, value, icon, accent }: StatPillProps) {
  return (
    <div style={{
      background: accent ? 'var(--accent-muted)' : 'var(--card)',
      border: `1px solid ${accent ? 'rgba(252,76,2,0.22)' : 'var(--border)'}`,
      borderRadius: 14,
      padding: '16px 14px',
      textAlign: 'center',
    }}>
      <div style={{
        display: 'flex', justifyContent: 'center', marginBottom: 8,
        color: accent ? 'var(--accent)' : 'var(--text-secondary)',
      }}>
        {icon}
      </div>
      <div style={{
        fontSize: 22, fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1,
        color: accent ? 'var(--accent)' : 'var(--text)',
        marginBottom: 5,
      }}>
        {value}
      </div>
      <div style={{
        fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 700,
        textTransform: 'uppercase' as const, letterSpacing: '0.07em',
      }}>
        {label}
      </div>
    </div>
  );
}

// ─── StatsPage ────────────────────────────────────────────────────────────────

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

  useEffect(() => {
    fetchProfile();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  const timezone = profile?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const { sessions, loading } = useSessions(user?.uid ?? '', range, timezone);
  const { chartData: _chartData, breakdown, heatmap, total } = useStats(sessions, range, timezone, subjectId);
  const { currentStreak, longestStreak } = useStreak(sessions, timezone, user?.uid ?? '');

  const totalHours = Math.floor(total / 60);
  const totalMins = total % 60;
  const allTimeHours = Math.floor((profile?.totalStudyMinutes ?? 0) / 60);

  return (
    <div style={{
      background: 'var(--bg)',
      minHeight: '100vh',
      color: 'var(--text)',
      padding: '28px 24px 120px',
      maxWidth: 700,
      margin: '0 auto',
    }}>
      <style>{`@keyframes statspin { to { transform: rotate(360deg); } }`}</style>

      {/* ── Page header ───────────────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{
            fontSize: 26, fontWeight: 900,
            letterSpacing: '-0.04em', margin: 0,
          }}>
            Your Progress
          </h2>
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{
                width: 14, height: 14, border: '2px solid var(--border-alt)',
                borderTopColor: 'var(--accent)', borderRadius: '50%',
                animation: 'statspin 0.8s linear infinite',
              }} />
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 500 }}>Loading…</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Chart ─────────────────────────────────────────────────────── */}
      {user && (
        <div style={{ marginBottom: 24 }}>
          <StudyChart
            sessions={sessions}
            timezone={timezone}
            uid={user.uid}
            onRangeChange={setRange}
            onSubjectChange={setSubjectId}
          />
        </div>
      )}

      {/* ── Hero: total for range ─────────────────────────────────────── */}
      <div style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: '20px 22px',
        marginBottom: 14,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{
            fontSize: 11, fontWeight: 800,
            color: 'var(--text-secondary)',
            textTransform: 'uppercase', letterSpacing: '0.09em',
            marginBottom: 5,
          }}>
            Study time · {range}
          </div>
          <div style={{
            fontSize: 38, fontWeight: 900, color: 'var(--accent)',
            letterSpacing: '-0.04em', lineHeight: 1,
          }}>
            {totalHours}h {totalMins}m
          </div>
        </div>
        <div style={{
          width: 52, height: 52,
          background: 'var(--accent-muted)', borderRadius: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Clock size={22} color="var(--accent)" strokeWidth={2.5} />
        </div>
      </div>

      {/* ── Streak + all-time pills ───────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 36 }}>
        <StatPill label="Streak" value={`${currentStreak}d`} icon={<Flame size={16} strokeWidth={2.5} />} accent />
        <StatPill label="Best" value={`${longestStreak}d`} icon={<Zap size={16} strokeWidth={2.5} />} />
        <StatPill label="All time" value={`${allTimeHours}h`} icon={<Clock size={16} strokeWidth={2.5} />} />
      </div>

      {/* ── Heatmap ───────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 36 }}>
        <SectionLabel>Activity Heatmap</SectionLabel>
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 14, padding: '18px 16px', overflowX: 'auto',
        }}>
          <StudyHeatmap values={heatmap} />
        </div>
      </div>

      {/* ── Subject breakdown ─────────────────────────────────────────── */}
      <div style={{ marginBottom: 36 }}>
        <SectionLabel>By Subject</SectionLabel>
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 14, padding: '18px 16px',
        }}>
          <SubjectBreakdown breakdown={breakdown} totalMinutes={total} />
        </div>
      </div>

      {/* ── Goals ─────────────────────────────────────────────────────── */}
      {profile && user && (
        <div>
          <SectionLabel>Goals</SectionLabel>
          <div style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 14, padding: '18px 16px',
          }}>
            <GoalsSection
              uid={user.uid}
              profile={profile}
              onGoalsUpdated={() => {
                getDoc(doc(db, 'users', user.uid))
                  .then(snap => { if (snap.exists()) setProfile(snap.data() as UserProfile); })
                  .catch(() => {});
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
