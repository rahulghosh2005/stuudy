import {
  collection, doc, addDoc, getDoc, getDocs, getDocsFromCache,
  updateDoc, deleteDoc, query, orderBy, serverTimestamp, writeBatch, where,
  type Query, type DocumentData,
} from 'firebase/firestore';
import { db } from './config';
import type { Course, Assignment, Semester, GradeCategory } from '../types/grades';

// ── Cache-first helper ─────────────────────────────────────────────────────
// Try local Firestore cache first (instant), fall back to network on miss.
async function getDocsWithCache(q: Query<DocumentData>) {
  try {
    const cached = await getDocsFromCache(q);
    if (!cached.empty) return cached;
  } catch {
    // Cache miss or unavailable — fall through to network fetch
  }
  return getDocs(q);
}

// ── Semesters ─────────────────────────────────────────────────────────────

export async function getSemesters(uid: string): Promise<Semester[]> {
  const snap = await getDocsWithCache(
    query(collection(db, 'users', uid, 'semesters'), orderBy('order', 'asc'))
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Semester));
}

export async function addSemester(uid: string, data: Omit<Semester, 'id' | 'createdAt'>): Promise<Semester> {
  const ref = await addDoc(collection(db, 'users', uid, 'semesters'), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return { id: ref.id, ...data, createdAt: serverTimestamp() };
}

export async function updateSemester(uid: string, semId: string, data: Partial<Semester>): Promise<void> {
  await updateDoc(doc(db, 'users', uid, 'semesters', semId), data);
}

export async function deleteSemester(uid: string, semId: string): Promise<void> {
  // Also delete all courses in this semester
  const coursesSnap = await getDocs(
    query(collection(db, 'users', uid, 'courses'), where('semesterId', '==', semId))
  );
  const batch = writeBatch(db);
  for (const courseDoc of coursesSnap.docs) {
    batch.delete(courseDoc.ref);
  }
  batch.delete(doc(db, 'users', uid, 'semesters', semId));
  await batch.commit();
}

// ── Courses ───────────────────────────────────────────────────────────────

export async function getCourses(uid: string): Promise<Course[]> {
  const snap = await getDocs(
    query(collection(db, 'users', uid, 'courses'), orderBy('order', 'asc'))
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Course));
}

export async function getCoursesBySemester(uid: string, semId: string): Promise<Course[]> {
  // NOTE: combining where() + orderBy() on different fields requires a composite
  // Firestore index. To avoid that requirement we fetch by semesterId only and
  // sort in JS, which also works with the local offline cache.
  const snap = await getDocsWithCache(
    query(collection(db, 'users', uid, 'courses'), where('semesterId', '==', semId))
  );
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as Course))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export async function getCourse(uid: string, courseId: string): Promise<Course | null> {
  const snap = await getDoc(doc(db, 'users', uid, 'courses', courseId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Course;
}

export async function addCourse(uid: string, data: Omit<Course, 'id' | 'createdAt'>): Promise<Course> {
  const ref = await addDoc(collection(db, 'users', uid, 'courses'), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return { id: ref.id, ...data, createdAt: serverTimestamp() };
}

export async function updateCourse(uid: string, courseId: string, data: Partial<Course>): Promise<void> {
  await updateDoc(doc(db, 'users', uid, 'courses', courseId), data);
}

export async function deleteCourse(uid: string, courseId: string): Promise<void> {
  // Delete all assignments in the course too
  const asnSnap = await getDocs(collection(db, 'users', uid, 'courses', courseId, 'assignments'));
  const batch = writeBatch(db);
  asnSnap.docs.forEach(d => batch.delete(d.ref));
  batch.delete(doc(db, 'users', uid, 'courses', courseId));
  await batch.commit();
}

export async function updateCourseCategories(uid: string, courseId: string, categories: GradeCategory[]): Promise<void> {
  await updateDoc(doc(db, 'users', uid, 'courses', courseId), { categories });
}

// ── Assignments ───────────────────────────────────────────────────────────

export async function getAssignments(uid: string, courseId: string): Promise<Assignment[]> {
  const snap = await getDocsWithCache(
    query(
      collection(db, 'users', uid, 'courses', courseId, 'assignments'),
      orderBy('createdAt', 'asc')
    )
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Assignment));
}

export async function addAssignment(
  uid: string,
  courseId: string,
  data: Omit<Assignment, 'id' | 'createdAt'>
): Promise<Assignment> {
  const ref = await addDoc(
    collection(db, 'users', uid, 'courses', courseId, 'assignments'),
    { ...data, createdAt: serverTimestamp() }
  );
  return { id: ref.id, ...data, createdAt: serverTimestamp() };
}

export async function updateAssignment(
  uid: string,
  courseId: string,
  assignmentId: string,
  data: Partial<Assignment>
): Promise<void> {
  await updateDoc(
    doc(db, 'users', uid, 'courses', courseId, 'assignments', assignmentId),
    data
  );
}

export async function deleteAssignment(
  uid: string,
  courseId: string,
  assignmentId: string
): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'courses', courseId, 'assignments', assignmentId));
}
