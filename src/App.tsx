import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';

function HomePage() {
  return <div style={{ color: '#fff', padding: '24px' }}>Home — Phase 2 will build this out.</div>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<HomePage />} />
            {/* Phase 1 plan 03 adds /profile/:uid */}
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
