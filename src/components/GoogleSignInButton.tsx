import { useState } from 'react';
import { signInWithGoogle } from '../firebase/auth';

export function GoogleSignInButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn() {
    setIsLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
      // onAuthStateChanged in AuthContext will update user state after sign-in
    } catch (err) {
      setError('Sign-in failed. Please try again.');
      console.error('Google sign-in error:', err);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div>
      <button onClick={handleSignIn} disabled={isLoading}>
        {isLoading ? 'Signing in...' : 'Sign in with Google'}
      </button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}
