import type { FieldValue, Timestamp } from 'firebase/firestore';

export interface SessionDocument {
  userId: string;
  subject: string | null;        // subject name at save time (denormalized for display)
  subjectId: string | null;      // subject doc ID — enables Phase 3 aggregation by subject
  durationMs: number;            // wall-clock elapsed in milliseconds (from anchor-time pattern)
  startTimestamp: Timestamp;     // Timestamp.fromMillis(startMs) — NOT a plain number
  endTimestamp: FieldValue;      // serverTimestamp() — authoritative server time
  notes: string;                 // empty string if user left blank
  privacy: 'public' | 'private' | 'followers_only'; // Phase 2 always writes 'public'
  createdAt: FieldValue;         // serverTimestamp() — used for ordering in Phase 3/5
}

export interface Subject {
  id: string;   // Firestore document ID
  name: string;
}
