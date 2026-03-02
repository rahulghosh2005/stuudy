import { signInWithPopup, GoogleAuthProvider, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from './config';
import { createOrUpdateUserDoc } from './users';

const googleProvider = new GoogleAuthProvider();

// Use signInWithPopup — NOT signInWithRedirect.
// signInWithRedirect breaks on Chrome 115+, Safari 16.1+, Firefox 109+ due to
// third-party cookie blocking. Popup has no such dependency.
export async function signInWithGoogle(): Promise<void> {
  const result = await signInWithPopup(auth, googleProvider);
  // Timezone capture happens inside createOrUpdateUserDoc — synchronously
  // in the sign-in handler, not in a useEffect (avoids race if component unmounts)
  await createOrUpdateUserDoc(result.user);
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}
