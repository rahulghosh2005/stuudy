import { NavLink } from 'react-router-dom';

export function BottomTabBar() {
  const tabStyle = (isActive: boolean): React.CSSProperties => ({
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '10px 0',
    color: isActive ? '#fc4c02' : '#555',
    textDecoration: 'none',
    fontSize: 11,
    fontWeight: isActive ? 700 : 400,
    borderTop: `2px solid ${isActive ? '#fc4c02' : 'transparent'}`,
  });

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: '#0a0a0a',
      display: 'flex',
      borderTop: '1px solid #1a1a1a',
      zIndex: 100,
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      <NavLink to="/" end style={({ isActive }) => tabStyle(isActive)}>
        Timer
      </NavLink>
      <NavLink to="/stats" style={({ isActive }) => tabStyle(isActive)}>
        Stats
      </NavLink>
      <NavLink to="/profile" style={({ isActive }) => tabStyle(isActive)}>
        Profile
      </NavLink>
    </nav>
  );
}
