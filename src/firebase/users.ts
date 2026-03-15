import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './config';
import type { UserProfile, SubjectGoal } from '../types/user';

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

// Update editable profile fields (bio, customPhotoURL, etc.)
export async function updateUserProfile(
  uid: string,
  fields: Partial<{ bio: string; customPhotoURL: string }>
): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { ...fields, updatedAt: serverTimestamp() });
}

// Upload a profile photo to Firebase Storage, update Firestore, and return the URL.
export async function uploadProfilePhoto(uid: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg';
  const storageRef = ref(storage, `profile-photos/${uid}/${Date.now()}.${ext}`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  await updateDoc(doc(db, 'users', uid), { customPhotoURL: url, updatedAt: serverTimestamp() });
  return url;
}

// Write partial goal fields to users/{uid}.
// Goal fields are optional on UserProfile — use profile.dailyGoalEnabled ?? false downstream.
// Only called when user explicitly sets a goal (not on sign-in).
export async function updateGoals(
  uid: string,
  fields: Partial<{
    dailyGoalMinutes: number;
    dailyGoalEnabled: boolean;
    weeklyGoalMinutes: number;
    weeklyGoalEnabled: boolean;
    subjectGoals: Record<string, SubjectGoal>;
  }>
): Promise<void> {
  await updateDoc(doc(db, 'users', uid), fields as Record<string, unknown>);
}
