import { collection, addDoc, getDocs, onSnapshot, query, where, orderBy, setDoc, doc, serverTimestamp, Timestamp, increment, FieldValue } from 'firebase/firestore';
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
  // Both writes run in parallel — session doc + stats update
  await Promise.all([
    addDoc(collection(db, 'users', uid, 'sessions'), {
      userId: uid,
      subject: payload.subject,
      subjectId: payload.subjectId,
      durationMs: payload.durationMs,
      startTimestamp: Timestamp.fromMillis(payload.startMs),
      endTimestamp: serverTimestamp(),
      notes: payload.notes,
      privacy: 'public' as const,  // Phase 2 hardcodes public — per locked decision in CONTEXT.md
      createdAt: serverTimestamp(),
    }),
    // Use setDoc+merge instead of updateDoc so it works even if the user doc
    // doesn't have totalStudyMinutes initialized yet (updateDoc would throw).
    setDoc(doc(db, 'users', uid), {
      totalStudyMinutes: increment(payload.durationMs / 60000) as unknown as FieldValue,
    }, { merge: true }),
  ]);
}

// Returns sessions for uid ordered by createdAt asc (one-time fetch).
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
    .filter(s => s.createdAt != null);
}

/**
 * Real-time session listener. Returns an unsubscribe function.
 *
 * Key behaviour: Firestore saves sessions with serverTimestamp() for createdAt,
 * which is null locally until the server confirms the write. This listener fires
 * immediately from the local cache (showing pending writes), then fires again
 * once the server sets createdAt — so sessions appear instantly without any filter
 * dropping them.
 */
export function subscribeToSessions(
  uid: string,
  onChange: (sessions: SessionDocument[]) => void
): () => void {
  const q = query(
    collection(db, 'users', uid, 'sessions'),
    orderBy('createdAt', 'asc')
  );
  return onSnapshot(
    q,
    { includeMetadataChanges: false },
    (snap) => {
      // Include pending writes (createdAt may be null) so sessions appear instantly.
      // Sort so any pending-write sessions without a createdAt land at the end.
      const sessions = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as unknown as SessionDocument))
        .sort((a, b) => {
          const ta = (a.createdAt as any)?.toMillis?.() ?? Date.now();
          const tb = (b.createdAt as any)?.toMillis?.() ?? Date.now();
          return ta - tb;
        });
      onChange(sessions);
    },
    () => {
      // On listener error fall back to one-time fetch
      getSessions(uid).then(onChange).catch(() => {});
    }
  );
}
