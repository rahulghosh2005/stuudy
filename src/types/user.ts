// Canonical Firestore document shape for users/{uid}
// Phase 1 creates the document; later phases populate stats, social counts.
// Never remove fields — Firestore merge writes depend on this contract.
import type { FieldValue, Timestamp } from 'firebase/firestore';

// Phase 3 goal fields — stored on users/{uid}, default to 0/false/{}
// Use profile.dailyGoalEnabled ?? false pattern downstream — old docs won't have these fields.
export interface SubjectGoal {
  minutes: number;
  enabled: boolean;
}

export interface UserProfile {
  uid: string;
  displayName: string | null;
  photoURL: string | null;
  email: string | null;
  timezone: string;                // IANA, e.g. "Asia/Tokyo" — required for Phase 3 streak calculation
  createdAt?: Timestamp | FieldValue;   // Set once on first write (serverTimestamp)
  updatedAt: Timestamp | FieldValue;    // Updated on every sign-in (serverTimestamp)
  // Stats — Phase 3 populates; initialize to 0 in Phase 1
  totalStudyMinutes: number;
  currentStreak: number;
  longestStreak: number;
  // Phase 3 goal fields — optional, set via updateGoals(); not initialized by createOrUpdateUserDoc
  dailyGoalMinutes: number;           // 0 = not set
  dailyGoalEnabled: boolean;
  weeklyGoalMinutes: number;
  weeklyGoalEnabled: boolean;
  subjectGoals: Record<string, SubjectGoal>; // key = subjectId
  // Social graph counts — Phase 4 maintains atomically; initialize to 0 in Phase 1
  // Phase 4 also adds browsable follower/following lists (full PROF-02 delivery)
  followerCount: number;
  followingCount: number;
  // Profile customization
  bio?: string;
  customPhotoURL?: string;
}
