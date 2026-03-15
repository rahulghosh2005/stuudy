import type { Timestamp, FieldValue } from 'firebase/firestore';

// ── Core domain types ──────────────────────────────────────────────────────

export type GradingType = 'weighted' | 'points';
export type AssignmentStatus = 'completed' | 'pending' | 'missing';
export type GpaScale = '4.0' | '4.3' | '5.0' | 'custom';

export interface GradeCategory {
  id: string;
  name: string;         // "Homework", "Quizzes", "Midterm", etc.
  weight: number;       // 0–100 (only used when gradingType === 'weighted')
  dropLowest: number;   // how many lowest scores to drop in this category
  color: string;        // hex color for UI
}

export interface Course {
  id: string;
  semesterId: string;
  name: string;
  instructor: string;
  color: string;        // hex accent color
  icon: string;         // single emoji
  gradingType: GradingType;
  targetGrade: number;  // 0–100
  creditHours: number;
  categories: GradeCategory[];
  order: number;
  createdAt: Timestamp | FieldValue;
}

export interface Assignment {
  id: string;
  courseId: string;
  categoryId: string;   // must match a GradeCategory.id in the course
  title: string;
  score: number | null; // null = not yet graded
  maxScore: number;
  isExtraCredit: boolean;
  dueDate: string;      // ISO date string "YYYY-MM-DD"
  notes: string;
  status: AssignmentStatus;
  createdAt: Timestamp | FieldValue;
}

export interface Semester {
  id: string;
  name: string;         // "Fall 2025", "Spring 2026", etc.
  startDate: string;    // ISO date
  endDate: string;      // ISO date
  isActive: boolean;
  order: number;
  createdAt: Timestamp | FieldValue;
}

// ── Calculated / derived types (never stored in Firestore) ─────────────────

export interface CategoryGrade {
  categoryId: string;
  categoryName: string;
  color: string;
  weight: number;
  earnedPoints: number;
  totalPoints: number;
  grade: number | null;     // null if no graded assignments
  assignmentCount: number;
  gradedCount: number;
}

export interface CourseGrade {
  courseId: string;
  currentGrade: number | null;    // null if no graded assignments
  letterGrade: string;
  isOnTrack: boolean;
  gradedAssignments: number;
  totalAssignments: number;
  remainingAssignments: number;
  categoryBreakdown: CategoryGrade[];
  pointsEarned: number;
  pointsPossible: number;
}

// ── GPA types ──────────────────────────────────────────────────────────────

export interface GpaEntry {
  courseId: string;
  courseName: string;
  creditHours: number;
  grade: number;        // percentage 0–100
  letterGrade: string;
  gradePoints: number;  // e.g. 4.0, 3.7, etc.
}

export interface GpaResult {
  semesterGpa: number;
  cumulativeGpa: number;
  totalCredits: number;
  entries: GpaEntry[];
}

export interface GpaScaleEntry {
  minPct: number;
  letter: string;
  points: number;
}

// ── Forecasting types ──────────────────────────────────────────────────────

export interface ForecastResult {
  targetGrade: number;
  requiredScore: number;       // what you need on remaining/specified work
  requiredPct: number;         // same as percentage
  isAchievable: boolean;       // false if > 100%
  currentGrade: number | null;
  remainingWeight: number;     // how much of the grade is left
}

export interface ScenarioResult {
  label: string;
  scores: { assignmentId: string; score: number }[];
  projectedGrade: number;
  letterGrade: string;
}

// ── Default constants ──────────────────────────────────────────────────────

export const COURSE_COLORS = [
  '#fc4c02', '#f97316', '#eab308', '#22c55e',
  '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4',
  '#84cc16', '#f43f5e', '#a855f7', '#14b8a6',
];

export const COURSE_ICONS = [
  '📐', '📊', '🔬', '📚', '🖥️', '🎨', '🎵', '⚗️',
  '🏛️', '📝', '🌍', '💰', '🧬', '📖', '🔭', '🧮',
];

export const DEFAULT_CATEGORIES: Omit<GradeCategory, 'id'>[] = [
  { name: 'Homework',     weight: 20, dropLowest: 0, color: '#3b82f6' },
  { name: 'Quizzes',      weight: 15, dropLowest: 1, color: '#22c55e' },
  { name: 'Midterm',      weight: 25, dropLowest: 0, color: '#f97316' },
  { name: 'Final Exam',   weight: 30, dropLowest: 0, color: '#fc4c02' },
  { name: 'Participation',weight: 10, dropLowest: 0, color: '#8b5cf6' },
];

export const CATEGORY_PRESETS: Omit<GradeCategory, 'id'>[] = [
  { name: 'Homework',      weight: 20, dropLowest: 0, color: '#3b82f6' },
  { name: 'Quizzes',       weight: 15, dropLowest: 1, color: '#22c55e' },
  { name: 'Labs',          weight: 15, dropLowest: 0, color: '#06b6d4' },
  { name: 'Midterm',       weight: 20, dropLowest: 0, color: '#f97316' },
  { name: 'Final Exam',    weight: 30, dropLowest: 0, color: '#fc4c02' },
  { name: 'Project',       weight: 20, dropLowest: 0, color: '#a855f7' },
  { name: 'Participation', weight: 10, dropLowest: 0, color: '#8b5cf6' },
  { name: 'Extra Credit',  weight:  0, dropLowest: 0, color: '#eab308' },
];
