import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth } from '../firebase/config';
import { createOrUpdateUserDoc } from '../firebase/users';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({ user: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // onAuthStateChanged fires once immediately with the persisted session (from IndexedDB).
    // Keep loading:true until that first event — prevents protected route redirect flicker.
    // Firebase Auth default persistence is LOCAL (survives tab close) — no configuration needed.
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);

      // Keep Firestore profile in sync with Auth session recovery too.
      // This avoids "User not found" states after refresh if the profile doc is missing.
      if (firebaseUser) {
        void createOrUpdateUserDoc(firebaseUser).catch((err) => {
          console.error('[AuthContext] failed to sync user profile document', err);
        });
      }

      setLoading(false);
    });
    return unsubscribe; // Clean up listener on unmount
  }, []);

  // Do NOT render children while loading — prevents flash of protected content
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
        Loading...
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
