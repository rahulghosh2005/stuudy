import { BrowserRouter, Routes, Route, Outlet, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { ProfilePage } from './pages/ProfilePage';
import { TimerPage } from './pages/TimerPage';
import { StatsPage } from './pages/StatsPage';
import { GradesPage } from './pages/GradesPage';
import { CoursePage } from './pages/CoursePage';
import { BottomTabBar } from './components/BottomTabBar';
import { LeftSidebar } from './components/LeftSidebar';

// Wraps page content with a fade-in animation on route change
function AnimatedPage({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div
      key={pathname}
      style={{
        animation: 'pageFadeIn 0.22s ease forwards',
        height: '100%',
      }}
    >
      {children}
    </div>
  );
}

function DesktopLayout() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      <LeftSidebar />
      <main style={{ flex: 1, minWidth: 0, background: 'transparent', overflowY: 'auto' }}>
        <AnimatedPage>
          <Outlet />
        </AnimatedPage>
      </main>
      <BottomTabBar />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          {/* Global animation keyframe */}
          <style>{`
            @keyframes pageFadeIn {
              from { opacity: 0; transform: translateY(6px); }
              to   { opacity: 1; transform: translateY(0); }
            }
          `}</style>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<DesktopLayout />}>
                <Route path="/"                element={<TimerPage />} />
                <Route path="/stats"           element={<StatsPage />} />
                <Route path="/grades"          element={<GradesPage />} />
                <Route path="/grades/:courseId" element={<CoursePage />} />
                <Route path="/profile"         element={<ProfilePage />} />
                <Route path="/profile/:uid"    element={<ProfilePage />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
