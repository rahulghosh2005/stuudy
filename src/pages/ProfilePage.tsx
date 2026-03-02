import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import type { UserProfile } from '../types/user';

export function ProfilePage() {
  const { uid } = useParams<{ uid: string }>();
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // If no uid param, view the signed-in user's own profile
  const targetUid = uid ?? user?.uid;

  useEffect(() => {
    if (!targetUid) return;

    setLoading(true);
    const userRef = doc(db, 'users', targetUid);
    getDoc(userRef)
      .then((snap) => {
        if (snap.exists()) {
          setProfile(snap.data() as UserProfile);
        } else {
          setError('User not found.');
        }
      })
      .catch(() => setError('Failed to load profile.'))
      .finally(() => setLoading(false));
  }, [targetUid]);

  if (loading) return <div style={{ color: '#fff', padding: '24px' }}>Loading profile...</div>;
  if (error) return <div style={{ color: '#ff4444', padding: '24px' }}>{error}</div>;
  if (!profile) return null;

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', color: '#fff', padding: '24px', maxWidth: '600px', margin: '0 auto' }}>
      {/* Avatar and identity — PROF-03: pulled from Google account via Firestore */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
        {profile.photoURL && (
          <img
            src={profile.photoURL}
            alt={profile.displayName ?? 'User avatar'}
            style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover' }}
          />
        )}
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>
            {profile.displayName ?? 'Anonymous'}
          </h1>
          <p style={{ margin: '4px 0 0', color: '#888', fontSize: '14px' }}>{profile.email}</p>
        </div>
      </div>

      {/* Stats summary — PROF-01: zeroed initially, populated by Phase 3 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '32px' }}>
        <StatCard label="Total hours" value={Math.floor(profile.totalStudyMinutes / 60)} />
        <StatCard label="Current streak" value={profile.currentStreak} suffix="days" />
        <StatCard label="Longest streak" value={profile.longestStreak} suffix="days" />
      </div>

      {/* Social counts — partial PROF-02: numeric counts only; browsable lists added in Phase 4 */}
      <div style={{ display: 'flex', gap: '32px' }}>
        <div>
          <span style={{ fontSize: '20px', fontWeight: 700 }}>{profile.followerCount}</span>
          <span style={{ color: '#888', marginLeft: '8px', fontSize: '14px' }}>Followers</span>
        </div>
        <div>
          <span style={{ fontSize: '20px', fontWeight: 700 }}>{profile.followingCount}</span>
          <span style={{ color: '#888', marginLeft: '8px', fontSize: '14px' }}>Following</span>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return (
    <div style={{ background: '#1a1a1a', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
      <div style={{ fontSize: '28px', fontWeight: 700, color: '#fc4c02' }}>
        {value}{suffix ? ` ${suffix}` : ''}
      </div>
      <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>{label}</div>
    </div>
  );
}
