import { NavLink } from 'react-router-dom';
import { Timer, BarChart2, User, GraduationCap } from 'lucide-react';

const tabs = [
  { to: '/',        label: 'Timer',  icon: Timer,         end: true },
  { to: '/stats',   label: 'Stats',  icon: BarChart2,     end: false },
  { to: '/grades',  label: 'Grades', icon: GraduationCap, end: false },
  { to: '/profile', label: 'Profile',icon: User,          end: false },
];

export function BottomTabBar() {
  return (
    <nav className="bottom-tab-bar" style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      width: '100%',
      background: 'var(--bg-secondary)',
      borderTop: '1px solid var(--border)',
      zIndex: 100,
      paddingBottom: 'env(safe-area-inset-bottom)',
      display: 'none', // shown via CSS media query
    }}>
      {tabs.map(tab => {
        const Icon = tab.icon;
        return (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            style={({ isActive }) => ({
              flex: 1,
              display: 'flex',
              flexDirection: 'column' as const,
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              padding: '10px 0 8px',
              color: isActive ? 'var(--accent)' : 'var(--text-tertiary)',
              textDecoration: 'none',
              fontSize: '10px',
              fontWeight: isActive ? 700 : 500,
              letterSpacing: '0.02em',
              borderTop: `2px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
              transition: 'all 0.15s ease',
            })}
          >
            {({ isActive }) => (
              <>
                <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                {tab.label}
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}
