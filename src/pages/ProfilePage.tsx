import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, getDocFromCache, type Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToSessions } from '../firebase/sessions';
import { updateUserProfile, uploadProfilePhoto } from '../firebase/users';
import { createOrUpdateUserDoc } from '../firebase/users';
import { getSubjects, addSubject, deleteSubject } from '../firebase/subjects';
import type { UserProfile } from '../types/user';
import type { SessionDocument, Subject } from '../types/session';
import { Camera, Edit2, Check, X, BookOpen, Flame, AlertTriangle, Plus, Trash2, GraduationCap } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
type Session = SessionDocument & { id: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  if (h > 0) return `${h}h${m > 0 ? ` ${m}m` : ''}`;
  if (m > 0) return `${m}m`;
  return `${totalSec}s`;
}

function timeAgo(ts: Timestamp | null | undefined): string {
  if (!ts || typeof ts.toDate !== 'function') return '';
  const diff = Math.floor((Date.now() - ts.toDate().getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 7 * 86400) return `${Math.floor(diff / 86400)}d ago`;
  return ts.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatCardDate(ts: Timestamp | null | undefined): string {
  if (!ts || typeof ts.toDate !== 'function') return '';
  const d = ts.toDate();
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (days === 0) return `Today at ${time}`;
  if (days === 1) return `Yesterday at ${time}`;
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + ` at ${time}`;
}

function getDotStyle(minutes: number): React.CSSProperties {
  if (minutes === 0) return { background: 'transparent', border: '1.5px solid var(--border-alt)' };
  if (minutes < 20) return { background: 'rgba(252,76,2,0.22)', border: '1.5px solid rgba(252,76,2,0.38)' };
  if (minutes < 60) return { background: 'rgba(252,76,2,0.52)', border: '1.5px solid rgba(252,76,2,0.65)' };
  return { background: '#fc4c02', border: '1.5px solid transparent' };
}

// ─── Session Card ─────────────────────────────────────────────────────────────
function SessionCard({ session }: { session: Session }) {
  const ts = session.startTimestamp as unknown as Timestamp;
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--card)',
        border: `1px solid ${hovered ? 'var(--border-alt)' : 'var(--border)'}`,
        borderRadius: 16,
        padding: '20px 22px 18px',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        boxShadow: hovered ? '0 4px 24px rgba(0,0,0,0.18)' : 'none',
        cursor: 'default',
      }}
    >
      {/* Top row: subject title + time-ago */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em',
            lineHeight: 1.2, marginBottom: 4,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {session.subject ?? 'Study Session'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 400 }}>
            Study Session · {formatCardDate(ts)}
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 500, flexShrink: 0, paddingTop: 2 }}>
          {timeAgo(ts)}
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'var(--border)', margin: '14px 0' }} />

      {/* Stats row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '5px 12px',
          background: 'var(--accent-muted)',
          borderRadius: 100,
        }}>
          <BookOpen size={11} color="var(--accent)" strokeWidth={2.5} />
          <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--accent)', letterSpacing: '-0.01em' }}>
            {formatDuration(session.durationMs)}
          </span>
        </div>
      </div>

      {/* Notes */}
      {session.notes && (
        <p style={{
          margin: '14px 0 0', fontSize: 13, color: 'var(--text-secondary)',
          lineHeight: 1.65, fontStyle: 'italic',
          borderTop: '1px solid var(--border)', paddingTop: 14,
        }}>
          "{session.notes}"
        </p>
      )}
    </div>
  );
}

// ─── ProfilePage ──────────────────────────────────────────────────────────────
const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export function ProfilePage() {
  const { uid } = useParams<{ uid: string }>();
  const { user, loading: authLoading } = useAuth();
  const targetUid = uid ?? user?.uid;
  const isOwnProfile = !uid || uid === user?.uid;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [photoURL, setPhotoURL] = useState<string | null>(null);

  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioText, setBioText] = useState('');
  const [isSavingBio, setIsSavingBio] = useState(false);

  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── My Classes state ───────────────────────────────────────────────────────
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectsLoaded, setSubjectsLoaded] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  // (optimistic — no loading state needed)

  useEffect(() => {
    if (authLoading) return;
    if (!targetUid) {
      setLoading(false);
      setError('Please sign in to view your profile.');
      setProfile(null);
      setSessions([]);
      setPhotoURL(null);
      return;
    }

    let cancelled = false;
    const profileUid = targetUid;

    async function loadProfile() {
      setLoading(true);
      setError(null);
      let cachedDataShown = false;

      try {
        const docRef = doc(db, 'users', profileUid);

        // ── Step 1: Try Firestore cache first (instant, no network needed) ──
        let snap: Awaited<ReturnType<typeof getDoc>> | null = null;
        try {
          snap = await getDocFromCache(docRef);
          if (snap.exists() && !cancelled) {
            // Show cached data right away while server fetch runs in background
            const p = snap.data() as UserProfile;
            const hydratedCache: UserProfile = {
              ...p,
              displayName: p.displayName ?? (isOwnProfile ? user?.displayName ?? null : null),
              photoURL: p.photoURL ?? (isOwnProfile ? user?.photoURL ?? null : null),
              email: p.email ?? (isOwnProfile ? user?.email ?? null : null),
            };
            setProfile(hydratedCache);
            setBioText(hydratedCache.bio ?? '');
            setPhotoURL(hydratedCache.customPhotoURL ?? hydratedCache.photoURL ?? null);
            setLoading(false);
            cachedDataShown = true;
          }
        } catch {
          // Not in cache — that's fine, continue to server fetch
        }

        // ── Step 2: Fetch from server with a 10s race-timeout ────────────
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('TIMEOUT')), 10000)
        );
        snap = await Promise.race([getDoc(docRef), timeoutPromise]);

        // Self-profile recovery: if auth exists but Firestore doc is missing, re-create it.
        if (!snap.exists() && isOwnProfile && user) {
          await createOrUpdateUserDoc(user);
          snap = await Promise.race([getDoc(docRef), timeoutPromise]);
        }

        if (!snap.exists()) {
          if (!cancelled) {
            setError('User not found.');
            setProfile(null);
            setSessions([]);
            setPhotoURL(null);
          }
          return;
        }

        const p = snap.data() as UserProfile;
        const hydratedProfile: UserProfile = {
          ...p,
          displayName: p.displayName ?? (isOwnProfile ? user?.displayName ?? null : null),
          photoURL: p.photoURL ?? (isOwnProfile ? user?.photoURL ?? null : null),
          email: p.email ?? (isOwnProfile ? user?.email ?? null : null),
        };

        if (!cancelled) {
          setProfile(hydratedProfile);
          setBioText(hydratedProfile.bio ?? '');
          setPhotoURL(hydratedProfile.customPhotoURL ?? hydratedProfile.photoURL ?? null);
          setLoading(false);
        }

      } catch (err: any) {
        console.error('[ProfilePage]', err?.code, err?.message, err);
        if (!cancelled) {
          if (err?.message === 'TIMEOUT') {
            // If we already showed cached data, silently swallow the timeout — user already sees content
            if (!cachedDataShown) {
              setError('Taking too long to load. Check your connection and retry.');
            }
          } else {
            setError(`Failed to load profile. (${err?.code ?? err?.message ?? 'unknown error'})`);
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [authLoading, isOwnProfile, targetUid, user]);

  // Real-time sessions listener — fires instantly from cache, then on every change.
  // Replaces one-shot getSessions so new sessions appear the moment they're saved.
  useEffect(() => {
    if (authLoading || !targetUid) return;
    const unsubscribe = subscribeToSessions(targetUid, (list) => {
      // Most-recent first (reverse chronological) for the activity feed
      setSessions([...list].reverse() as Session[]);
    });
    return unsubscribe;
  }, [authLoading, targetUid]);

  // Load subjects for own profile
  useEffect(() => {
    if (!isOwnProfile || !targetUid) return;
    let cancelled = false;
    getSubjects(targetUid).then(list => {
      if (!cancelled) { setSubjects(list); setSubjectsLoaded(true); }
    }).catch(() => { if (!cancelled) setSubjectsLoaded(true); });
    return () => { cancelled = true; };
  }, [isOwnProfile, targetUid]);

  function handleAddClass() {
    const trimmed = newClassName.trim();
    if (!trimmed || !targetUid) return;

    // Optimistic: add chip instantly with a temp id, clear input immediately
    const tempId = `temp_${Date.now()}`;
    setSubjects(prev => [...prev, { id: tempId, name: trimmed }].sort((a, b) => a.name.localeCompare(b.name)));
    setNewClassName('');

    // Background write — swap temp id for real id once Firestore responds
    addSubject(targetUid, trimmed).then(saved => {
      setSubjects(prev => prev.map(s => s.id === tempId ? saved : s));
    }).catch(() => {
      // Roll back on failure
      setSubjects(prev => prev.filter(s => s.id !== tempId));
    });
  }

  function handleDeleteClass(subjectId: string) {
    if (!targetUid) return;

    // Optimistic: remove chip instantly
    setSubjects(prev => prev.filter(s => s.id !== subjectId));

    // Background delete — restore on failure
    deleteSubject(targetUid, subjectId).catch(() => {
      // We don't have the original object anymore; reload from Firestore
      getSubjects(targetUid).then(list => setSubjects(list)).catch(() => {});
    });
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !targetUid) return;
    e.target.value = '';
    setPhotoUploading(true);
    setPhotoError(null);
    try {
      const url = await uploadProfilePhoto(targetUid, file);
      setPhotoURL(url);
    } catch {
      setPhotoError('Upload failed. Check Firebase Storage rules.');
    } finally {
      setPhotoUploading(false);
    }
  }

  async function handleSaveBio() {
    if (!targetUid) return;
    setIsSavingBio(true);
    try {
      await updateUserProfile(targetUid, { bio: bioText });
      setProfile(prev => prev ? { ...prev, bio: bioText } : prev);
      setIsEditingBio(false);
    } finally {
      setIsSavingBio(false);
    }
  }

  // ── Last 28 days dot data ──────────────────────────────────────────────────
  const last28Days = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Array.from({ length: 28 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (27 - i));
      const dEnd = new Date(d);
      dEnd.setHours(23, 59, 59, 999);
      const mins = sessions
        .filter(s => {
          const ts = s.startTimestamp as unknown as Timestamp;
          if (!ts?.toDate) return false;
          const date = ts.toDate();
          return date >= d && date <= dEnd;
        })
        .reduce((acc, s) => acc + s.durationMs / 60000, 0);
      return { minutes: mins };
    });
  }, [sessions]);

  const columnLabels = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 27);
    const dow = d.getDay();
    return Array.from({ length: 7 }, (_, i) => DAY_LABELS[(dow + i) % 7]);
  }, []);

  const weeks = useMemo(() => ([
    last28Days.slice(0, 7),
    last28Days.slice(7, 14),
    last28Days.slice(14, 21),
    last28Days.slice(21, 28),
  ]), [last28Days]);

  const last28Stats = useMemo(() => {
    const cutoff = Date.now() - 28 * 24 * 60 * 60 * 1000;
    const recent = sessions.filter(s => {
      const ts = s.startTimestamp as unknown as Timestamp;
      if (!ts?.toDate) return false;
      return ts.toDate().getTime() >= cutoff;
    });
    return {
      count: recent.length,
      totalMins: recent.reduce((acc, s) => acc + s.durationMs / 60000, 0),
      activeDays: last28Days.filter(d => d.minutes > 0).length,
    };
  }, [sessions, last28Days]);

  // ── Loading / error ────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ width: 24, height: 24, border: '2px solid var(--border-alt)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  if (error) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: 24 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}>
          <AlertTriangle size={32} color="var(--error)" strokeWidth={1.5} />
        </div>
        <div style={{ color: 'var(--error)', fontSize: 15, fontWeight: 600, marginBottom: 16 }}>{error}</div>
        <button
          onClick={() => window.location.reload()}
          style={{
            background: 'var(--accent)', color: '#fff', border: 'none',
            borderRadius: '100px', padding: '10px 24px',
            fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    </div>
  );

  if (!profile) return null;

  const displayName = profile.displayName ?? 'Anonymous';
  const totalMins = profile.totalStudyMinutes ?? 0;
  const th = Math.floor(totalMins / 60);
  const tm = Math.round(totalMins % 60);
  const totalTimeStr = th > 0 ? `${th}h${tm > 0 ? ` ${tm}m` : ''}` : `${tm}m`;

  const l4wHours = Math.floor(last28Stats.totalMins / 60);
  const l4wMins = Math.round(last28Stats.totalMins % 60);
  const l4wTimeStr = l4wHours > 0 ? `${l4wHours}h${l4wMins > 0 ? ` ${l4wMins}m` : ''}` : `${l4wMins}m`;

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', color: 'var(--text)' }}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        style={{ display: 'none' }}
        onChange={handlePhotoUpload}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* ── Cover Banner ──────────────────────────────────────────────────── */}
      <div style={{
        height: 200,
        background: 'linear-gradient(145deg, #1c0c02 0%, #2e1607 26%, #130d09 58%, #09090f 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -80, left: '6%', width: 340, height: 340, borderRadius: '50%', background: 'rgba(252,76,2,0.13)', filter: 'blur(100px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: -20, right: '10%', width: 220, height: 220, borderRadius: '50%', background: 'rgba(252,76,2,0.06)', filter: 'blur(70px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -20, left: '40%', width: 160, height: 160, borderRadius: '50%', background: 'rgba(252,76,2,0.04)', filter: 'blur(40px)', pointerEvents: 'none' }} />
      </div>

      {/* ── Profile Content ───────────────────────────────────────────────── */}
      <div style={{ padding: '0 28px 100px', maxWidth: 740 }}>

        {/* ── Avatar row ──────────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
          marginTop: -52, marginBottom: 20,
        }}>
          {/* Avatar */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{
              width: 104, height: 104, borderRadius: '50%',
              border: '4px solid var(--bg)',
              overflow: 'hidden', background: 'var(--card)',
              position: 'relative', boxSizing: 'border-box',
            }}>
              {photoURL ? (
                <img
                  src={photoURL}
                  alt={displayName}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: photoUploading ? 0.4 : 1, transition: 'opacity 0.2s' }}
                />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--accent)', color: '#fff', fontSize: 40, fontWeight: 800 }}>
                  {displayName[0].toUpperCase()}
                </div>
              )}
              {photoUploading && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.55)' }}>
                  <div style={{ width: 22, height: 22, border: '2.5px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                </div>
              )}
            </div>
            {isOwnProfile && (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={photoUploading}
                title="Change photo"
                style={{
                  position: 'absolute', bottom: 5, right: 5,
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'var(--card-alt)', border: '2px solid var(--bg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: photoUploading ? 'not-allowed' : 'pointer', padding: 0,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--card-alt)')}
              >
                <Camera size={12} color="var(--text-secondary)" />
              </button>
            )}
          </div>

          {/* Edit profile button */}
          {isOwnProfile && !isEditingBio && (
            <button
              onClick={() => setIsEditingBio(true)}
              style={{
                marginBottom: 4,
                padding: '8px 18px', fontSize: 13, fontWeight: 600,
                background: 'transparent',
                border: '1.5px solid var(--border-alt)',
                borderRadius: 100, color: 'var(--text)',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--text-secondary)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-alt)')}
            >
              <Edit2 size={12} strokeWidth={2} />
              Edit profile
            </button>
          )}
        </div>

        {/* ── Name + bio ────────────────────────────────────────────────────── */}
        <div style={{ marginBottom: 22 }}>
          <h1 style={{ margin: '0 0 8px', fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.15 }}>
            {displayName}
          </h1>

          {photoError && (
            <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--error)' }}>{photoError}</p>
          )}

          {isEditingBio ? (
            <div>
              <textarea
                value={bioText}
                onChange={e => setBioText(e.target.value)}
                placeholder="Tell people about yourself..."
                rows={3}
                maxLength={200}
                autoFocus
                style={{
                  width: '100%', maxWidth: 480, boxSizing: 'border-box', display: 'block',
                  background: 'var(--input-bg)', border: '1.5px solid var(--accent)',
                  borderRadius: 10, color: 'var(--text)',
                  fontSize: 14, padding: '10px 13px',
                  resize: 'none', fontFamily: 'inherit', lineHeight: 1.5, outline: 'none',
                }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button
                  onClick={handleSaveBio}
                  disabled={isSavingBio}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '8px 18px', fontSize: 13, fontWeight: 700,
                    background: 'var(--accent)', color: '#fff',
                    border: 'none', borderRadius: 100, cursor: 'pointer',
                  }}
                >
                  <Check size={12} />
                  {isSavingBio ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => { setIsEditingBio(false); setBioText(profile.bio ?? ''); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '8px 16px', fontSize: 13, fontWeight: 600,
                    background: 'transparent', color: 'var(--text-secondary)',
                    border: '1px solid var(--border-alt)', borderRadius: 100, cursor: 'pointer',
                  }}
                >
                  <X size={12} />
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p style={{
              margin: 0, fontSize: 15, lineHeight: 1.65,
              color: profile.bio ? 'var(--text-secondary)' : 'var(--text-tertiary)',
            }}>
              {profile.bio || (isOwnProfile ? 'No bio yet — click "Edit profile" to add one.' : '')}
            </p>
          )}
        </div>

        {/* ── Divider ──────────────────────────────────────────────────────── */}
        <div style={{ height: 1, background: 'var(--border)', marginBottom: 20 }} />

        {/* ── Stats + Social ───────────────────────────────────────────────── */}
        <div style={{ marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>{totalTimeStr}</span>
            <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>total study</span>
            <span style={{ fontSize: 12, color: 'var(--border-alt)', margin: '0 2px' }}>·</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>{sessions.length}</span>
            <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
              {sessions.length === 1 ? 'session' : 'sessions'}
            </span>
            <span style={{ fontSize: 12, color: 'var(--border-alt)', margin: '0 2px' }}>·</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--accent)' }}>{profile.currentStreak ?? 0}</span>
            <span style={{ fontSize: 13, color: 'var(--text-tertiary)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              day streak <Flame size={13} color="var(--accent)" strokeWidth={2} />
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--text)', fontWeight: 700 }}>{profile.followingCount ?? 0}</strong>
              {' '}Following
            </span>
            <span style={{ fontSize: 12, color: 'var(--border-alt)' }}>·</span>
            <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--text)', fontWeight: 700 }}>{profile.followerCount ?? 0}</strong>
              {' '}Followers
            </span>
          </div>
        </div>

        {/* ── My Classes (own profile only) ────────────────────────────────── */}
        {isOwnProfile && (
          <>
            <div style={{ height: 1, background: 'var(--border)', margin: '4px 0 24px' }} />
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <h3 style={{
                  margin: 0, fontSize: 11, fontWeight: 800,
                  color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.09em',
                }}>
                  My Classes
                </h3>
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 500 }}>
                  {subjects.length} {subjects.length === 1 ? 'class' : 'classes'}
                </span>
              </div>

              {/* Class chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                {!subjectsLoaded && (
                  <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Loading…</span>
                )}
                {subjectsLoaded && subjects.length === 0 && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 14px',
                    background: 'var(--card)', border: '1px dashed var(--border-alt)',
                    borderRadius: 10,
                    fontSize: 13, color: 'var(--text-tertiary)',
                  }}>
                    <GraduationCap size={14} color="var(--text-tertiary)" strokeWidth={1.8} />
                    No classes yet — add one below
                  </div>
                )}
                {subjects.map(subject => (
                  <div key={subject.id} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    background: 'var(--accent-muted)',
                    border: '1px solid rgba(252,76,2,0.25)',
                    borderRadius: 100,
                    padding: '6px 10px 6px 12px',
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', letterSpacing: '-0.01em' }}>
                      {subject.name}
                    </span>
                    <button
                      onClick={() => handleDeleteClass(subject.id)}
                      title="Remove class"
                      style={{
                        background: 'none', border: 'none', padding: 0,
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center',
                        opacity: 0.6,
                        transition: 'opacity 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                      onMouseLeave={e => (e.currentTarget.style.opacity = '0.6')}
                    >
                      <Trash2 size={12} color="var(--accent)" strokeWidth={2.2} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add class input */}
              <div style={{ display: 'flex', gap: 8, maxWidth: 400 }}>
                <div style={{
                  flex: 1,
                  display: 'flex', alignItems: 'center',
                  background: 'var(--input-bg)',
                  border: '1.5px solid var(--border-alt)',
                  borderRadius: 10, padding: '0 12px',
                  transition: 'border-color 0.15s',
                }}
                  onFocusCapture={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                  onBlurCapture={e => (e.currentTarget.style.borderColor = 'var(--border-alt)')}
                >
                  <BookOpen size={13} color="var(--text-tertiary)" strokeWidth={2} style={{ flexShrink: 0, marginRight: 8 }} />
                  <input
                    value={newClassName}
                    onChange={e => setNewClassName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleAddClass(); }}
                    placeholder="Add a class, e.g. Calculus II"
                    style={{
                      flex: 1, background: 'transparent', border: 'none', outline: 'none',
                      color: 'var(--text)', fontSize: 13, padding: '10px 0',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>
                <button
                  onClick={handleAddClass}
                  disabled={!newClassName.trim()}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '10px 16px', fontSize: 13, fontWeight: 700,
                    background: newClassName.trim() ? 'var(--accent)' : 'var(--border-alt)',
                    color: newClassName.trim() ? '#fff' : 'var(--text-tertiary)',
                    border: 'none', borderRadius: 10,
                    cursor: newClassName.trim() ? 'pointer' : 'not-allowed',
                    transition: 'background 0.15s, color 0.15s',
                    flexShrink: 0,
                  }}
                >
                  <Plus size={14} strokeWidth={2.5} />
                  Add
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── Divider ──────────────────────────────────────────────────────── */}
        <div style={{ height: 1, background: 'var(--border)', marginBottom: 24 }} />

        {/* ── Last 4 Weeks ─────────────────────────────────────────────────── */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h3 style={{
              margin: 0, fontSize: 11, fontWeight: 800,
              color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.09em',
            }}>
              Last 4 Weeks
            </h3>
            <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 500 }}>
              {last28Stats.count} sessions · {l4wTimeStr} · {last28Stats.activeDays} days active
            </span>
          </div>

          {/* Day column labels */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
            {columnLabels.map((label, i) => (
              <div key={i} style={{
                width: 16, textAlign: 'center',
                fontSize: 9, fontWeight: 700,
                color: 'var(--text-tertiary)', textTransform: 'uppercase',
                letterSpacing: '0.02em',
              }}>
                {label}
              </div>
            ))}
          </div>

          {/* Dot grid — 4 rows × 7 cols */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {weeks.map((week, wi) => (
              <div key={wi} style={{ display: 'flex', gap: 4 }}>
                {week.map((day, di) => (
                  <div
                    key={di}
                    title={`${Math.round(day.minutes)} min`}
                    style={{
                      width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                      ...getDotStyle(day.minutes),
                      transition: 'transform 0.1s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.2)')}
                    onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* ── Divider ──────────────────────────────────────────────────────── */}
        <div style={{ height: 1, background: 'var(--border)', margin: '24px 0' }} />

        {/* ── Activity Feed ─────────────────────────────────────────────────── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: '-0.025em' }}>
              Activities
            </h2>
            {sessions.length > 0 && (
              <span style={{
                fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.07em',
              }}>
                {sessions.length} total
              </span>
            )}
          </div>

          {sessions.length === 0 ? (
            <div style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 16, padding: '52px 24px', textAlign: 'center',
            }}>
              <div style={{ marginBottom: 14, display: 'flex', justifyContent: 'center' }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--accent-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <BookOpen size={24} color="var(--accent)" strokeWidth={1.5} />
                </div>
              </div>
              <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>No activities yet</div>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {isOwnProfile
                  ? 'Complete your first study session\nto see it here.'
                  : 'This user has no sessions yet.'}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {sessions.map(session => (
                <SessionCard key={session.id} session={session} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
