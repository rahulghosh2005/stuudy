import { collection, getDocs, addDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from './config';
import type { Subject } from '../types/session';

// Load all subjects for a user once (not a real-time subscription).
// Subjects are a personal list typically <50 items — filter client-side.
export async function getSubjects(uid: string): Promise<Subject[]> {
  const snap = await getDocs(
    query(collection(db, 'users', uid, 'subjects'), orderBy('name'))
  );
  return snap.docs.map(doc => ({ id: doc.id, name: doc.data().name as string }));
}

// Create a new subject and return the saved Subject (with Firestore-generated id).
export async function addSubject(uid: string, name: string): Promise<Subject> {
  const ref = await addDoc(collection(db, 'users', uid, 'subjects'), {
    name: name.trim(),
    createdAt: serverTimestamp(),
  });
  return { id: ref.id, name: name.trim() };
}
