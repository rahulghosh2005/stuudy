import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { doc, getDoc, getDocFromCache } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Timer, BarChart2, User, Sun, Moon, Flame, GraduationCap } from 'lucide-react';
import type { UserProfile } from '../types/user';

const navItems = [
  { to: '/',        label: 'Timer',  icon: Timer,         end: true },
  { to: '/stats',   label: 'Stats',  icon: BarChart2,     end: false },
  { to: '/grades',  label: 'Grades', icon: GraduationCap, end: false },
  { to: '/profile', label: 'Profile',icon: User,          end: false },
];

export function LeftSidebar() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!user?.uid) return;
    const docRef = doc(db, 'users', user.uid);
    // Try cache first (instant) — show profile card right away
    getDocFromCache(docRef)
      .then(snap => { if (snap.exists()) setProfile(snap.data() as UserProfile); })
      .catch(() => {})
      .finally(() => {
        // Always fetch fresh data from server to keep streak/minutes up to date
        getDoc(docRef)
          .then(snap => { if (snap.exists()) setProfile(snap.data() as UserProfile); })
          .catch(() => {});
      });
  }, [user?.uid]);

  const photoURL = profile?.customPhotoURL ?? profile?.photoURL ?? null;
  const displayName = profile?.displayName ?? 'Anonymous';

  return (
    <div className="left-sidebar" style={{
      width: 240,
      minWidth: 240,
      background: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: 'sticky',
      top: 0,
      boxSizing: 'border-box',
      padding: '18px 0 20px',
    }}>

      {/* ── Logo ──────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px', marginBottom: 32,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{
            width: 30, height: 30,
            background: 'var(--accent)',
            borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 2px 12px rgba(252,76,2,0.35)',
          }}>
            <Timer size={15} color="#fff" strokeWidth={2.5} />
          </div>
          <span style={{
            fontSize: 16, fontWeight: 900, color: 'var(--text)',
            letterSpacing: '-0.04em',
          }}>
            stuuudy
          </span>
        </div>

        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          style={{
            background: 'transparent',
            border: '1px solid var(--border)',
            borderRadius: 8,
            width: 30, height: 30,
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 0, color: 'var(--text-secondary)', flexShrink: 0,
            transition: 'border-color 0.15s, color 0.15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'var(--border-alt)';
            e.currentTarget.style.color = 'var(--text)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'var(--border)';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          {theme === 'dark'
            ? <Sun size={13} strokeWidth={2} />
            : <Moon size={13} strokeWidth={2} />}
        </button>
      </div>

      {/* ── Nav items ─────────────────────────────────────────────────── */}
      <nav style={{ flex: 1, padding: '0 10px' }}>
        {navItems.map(item => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 13px',
                borderRadius: 10,
                marginBottom: 2,
                color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                fontWeight: isActive ? 700 : 500,
                fontSize: 14,
                textDecoration: 'none',
                background: isActive ? 'var(--accent-muted)' : 'transparent',
                transition: 'all 0.15s ease',
              })}
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={16}
                    strokeWidth={isActive ? 2.5 : 1.8}
                    style={{ flexShrink: 0 }}
                  />
                  {item.label}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* ── Profile card ──────────────────────────────────────────────── */}
      {profile && (
        <NavLink
          to="/profile"
          style={{ textDecoration: 'none' }}
        >
          <div
            style={{
              margin: '0 10px',
              padding: '11px 13px',
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              cursor: 'pointer',
              transition: 'border-color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-alt)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* Avatar */}
              <div style={{ flexShrink: 0 }}>
                {photoURL ? (
                  <img
                    src={photoURL}
                    alt={displayName}
                    style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{
                    width: 34, height: 34, borderRadius: '50%',
                    background: 'var(--accent)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>
                      {displayName[0].toUpperCase()}
                    </span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{
                  fontSize: 13, fontWeight: 700, color: 'var(--text)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {displayName}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <Flame size={10} color="var(--accent)" strokeWidth={2.5} />
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>
                    {profile.currentStreak ?? 0}d · {Math.floor((profile.totalStudyMinutes ?? 0) / 60)}h total
                  </span>
                </div>
              </div>
            </div>
          </div>
        </NavLink>
      )}
    </div>
  );
}
