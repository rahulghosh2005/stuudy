import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db } from './config';
import type { UserProfile } from '../types/user';

// Called on every sign-in. setDoc with merge:true is idempotent:
// - On first sign-in: creates the document with zeroed stats
// - On repeat sign-ins: updates only the listed fields, leaves stats/counts untouched
// NEVER use setDoc without {merge: true} here — it would wipe stats from later phases
export async function createOrUpdateUserDoc(user: User): Promise<void> {
  const userRef = doc(db, 'users', user.uid);

  // Capture IANA timezone here — synchronous, no library needed.
  // e.g. "America/New_York", "Asia/Tokyo", "Europe/London"
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const profileData: Partial<UserProfile> = {
    uid: user.uid,
    displayName: user.displayName,
    photoURL: user.photoURL,
    email: user.email,
    timezone,
    updatedAt: serverTimestamp(),
    // Initialize stats and counts to 0 only if fields don't exist yet.
    // merge:true means these are NOT overwritten on repeat sign-ins.
    totalStudyMinutes: 0,
    currentStreak: 0,
    longestStreak: 0,
    followerCount: 0,
    followingCount: 0,
  };

  await setDoc(userRef, profileData, { merge: true });
}
