import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function ProtectedRoute() {
  const { user } = useAuth();
  // AuthProvider already blocks render until loading is false,
  // so user is definitively null (not signed in) or a User object here.
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}
