import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from './config';

// Payload excludes server-generated fields (endTimestamp, createdAt).
// startMs is Date.now() captured at Start button tap — converted to Firestore Timestamp here.
export async function addSession(
  uid: string,
  payload: {
    subject: string | null;
    subjectId: string | null;
    durationMs: number;
    startMs: number;
    notes: string;
  }
): Promise<void> {
  await addDoc(collection(db, 'users', uid, 'sessions'), {
    userId: uid,
    subject: payload.subject,
    subjectId: payload.subjectId,
    durationMs: payload.durationMs,
    startTimestamp: Timestamp.fromMillis(payload.startMs),
    endTimestamp: serverTimestamp(),
    notes: payload.notes,
    privacy: 'public' as const,  // Phase 2 hardcodes public — per locked decision in CONTEXT.md
    createdAt: serverTimestamp(),
  });
}
