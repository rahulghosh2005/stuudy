import { collection, addDoc, getDocs, query, where, orderBy, updateDoc, doc, serverTimestamp, Timestamp, increment } from 'firebase/firestore';
import { db } from './config';
import type { SessionDocument } from '../types/session';

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

  // Update totalStudyMinutes on the user document (STAT-06)
  await updateDoc(doc(db, 'users', uid), {
    totalStudyMinutes: increment(payload.durationMs / 60000),
  });
}

// Returns sessions for uid ordered by createdAt asc.
// If `since` is provided, only sessions with createdAt >= since are returned.
// Filters out documents where createdAt is still null (optimistic write not yet committed).
export async function getSessions(
  uid: string,
  since?: Date
): Promise<SessionDocument[]> {
  const ref = collection(db, 'users', uid, 'sessions');
  const q = since
    ? query(ref, where('createdAt', '>=', Timestamp.fromDate(since)), orderBy('createdAt', 'asc'))
    : query(ref, orderBy('createdAt', 'asc'));
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as unknown as SessionDocument))
    .filter(s => s.createdAt != null); // guard against optimistic-write null timestamps
}
