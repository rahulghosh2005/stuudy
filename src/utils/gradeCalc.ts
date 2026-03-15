import type {
  Course, Assignment, CategoryGrade, CourseGrade,
  GpaScaleEntry, GpaEntry, GpaResult, ForecastResult,
} from '../types/grades';

// ── GPA Scales ─────────────────────────────────────────────────────────────

export const GPA_SCALES: Record<string, GpaScaleEntry[]> = {
  '4.0': [
    { minPct: 93, letter: 'A',  points: 4.0 },
    { minPct: 90, letter: 'A-', points: 3.7 },
    { minPct: 87, letter: 'B+', points: 3.3 },
    { minPct: 83, letter: 'B',  points: 3.0 },
    { minPct: 80, letter: 'B-', points: 2.7 },
    { minPct: 77, letter: 'C+', points: 2.3 },
    { minPct: 73, letter: 'C',  points: 2.0 },
    { minPct: 70, letter: 'C-', points: 1.7 },
    { minPct: 67, letter: 'D+', points: 1.3 },
    { minPct: 60, letter: 'D',  points: 1.0 },
    { minPct: 0,  letter: 'F',  points: 0.0 },
  ],
  '4.3': [
    { minPct: 97, letter: 'A+', points: 4.3 },
    { minPct: 93, letter: 'A',  points: 4.0 },
    { minPct: 90, letter: 'A-', points: 3.7 },
    { minPct: 87, letter: 'B+', points: 3.3 },
    { minPct: 83, letter: 'B',  points: 3.0 },
    { minPct: 80, letter: 'B-', points: 2.7 },
    { minPct: 77, letter: 'C+', points: 2.3 },
    { minPct: 73, letter: 'C',  points: 2.0 },
    { minPct: 70, letter: 'C-', points: 1.7 },
    { minPct: 67, letter: 'D+', points: 1.3 },
    { minPct: 60, letter: 'D',  points: 1.0 },
    { minPct: 0,  letter: 'F',  points: 0.0 },
  ],
  '5.0': [
    { minPct: 97, letter: 'A+', points: 5.0 },
    { minPct: 93, letter: 'A',  points: 4.7 },
    { minPct: 90, letter: 'A-', points: 4.3 },
    { minPct: 87, letter: 'B+', points: 4.0 },
    { minPct: 83, letter: 'B',  points: 3.7 },
    { minPct: 80, letter: 'B-', points: 3.3 },
    { minPct: 77, letter: 'C+', points: 3.0 },
    { minPct: 73, letter: 'C',  points: 2.7 },
    { minPct: 70, letter: 'C-', points: 2.3 },
    { minPct: 67, letter: 'D+', points: 2.0 },
    { minPct: 60, letter: 'D',  points: 1.0 },
    { minPct: 0,  letter: 'F',  points: 0.0 },
  ],
};

// ── Letter grade lookup ─────────────────────────────────────────────────────

export function getLetterGrade(pct: number | null, scale: GpaScaleEntry[] = GPA_SCALES['4.0']): string {
  if (pct === null || isNaN(pct)) return '—';
  for (const entry of scale) {
    if (pct >= entry.minPct) return entry.letter;
  }
  return 'F';
}

export function getGradePoints(pct: number | null, scale: GpaScaleEntry[] = GPA_SCALES['4.0']): number {
  if (pct === null || isNaN(pct)) return 0;
  for (const entry of scale) {
    if (pct >= entry.minPct) return entry.points;
  }
  return 0;
}

export function getGradeColor(pct: number | null): string {
  if (pct === null) return 'var(--text-tertiary)';
  if (pct >= 90) return '#22c55e';
  if (pct >= 80) return '#3b82f6';
  if (pct >= 70) return '#f97316';
  if (pct >= 60) return '#eab308';
  return '#ef4444';
}

// ── Core grade calculation ─────────────────────────────────────────────────

export function calculateCourseGrade(course: Course, assignments: Assignment[]): CourseGrade {
  const gradedAssignments = assignments.filter(a => a.score !== null);
  const totalAssignments  = assignments.length;
  const remainingAssignments = assignments.filter(a => a.score === null && a.status !== 'missing').length;

  let currentGrade: number | null = null;
  let pointsEarned  = 0;
  let pointsPossible = 0;
  const categoryBreakdown: CategoryGrade[] = [];

  if (course.gradingType === 'points') {
    // ── Points-based: sum of earned / sum of possible ──────────────────────
    for (const a of gradedAssignments) {
      if (a.isExtraCredit) {
        pointsEarned += (a.score ?? 0);
        // do NOT add to possible
      } else {
        pointsEarned  += (a.score ?? 0);
        pointsPossible += a.maxScore;
      }
    }

    currentGrade = pointsPossible > 0 ? (pointsEarned / pointsPossible) * 100 : null;

    // Category breakdown for points-based
    for (const cat of course.categories) {
      const catAssignments = assignments.filter(a => a.categoryId === cat.id);
      const graded = catAssignments.filter(a => a.score !== null);
      let catEarned = 0, catPossible = 0;
      for (const a of graded) {
        if (a.isExtraCredit) { catEarned += (a.score ?? 0); }
        else { catEarned += (a.score ?? 0); catPossible += a.maxScore; }
      }
      categoryBreakdown.push({
        categoryId:      cat.id,
        categoryName:    cat.name,
        color:           cat.color,
        weight:          cat.weight,
        earnedPoints:    catEarned,
        totalPoints:     catPossible,
        grade:           catPossible > 0 ? (catEarned / catPossible) * 100 : null,
        assignmentCount: catAssignments.length,
        gradedCount:     graded.length,
      });
    }

  } else {
    // ── Weighted: weighted average of category grades ──────────────────────
    let totalWeightUsed = 0;
    let weightedSum     = 0;

    for (const cat of course.categories) {
      const catAssignments = assignments.filter(a => a.categoryId === cat.id);
      let graded = catAssignments.filter(a => a.score !== null);

      // Apply drop-lowest
      if (cat.dropLowest > 0 && graded.length > cat.dropLowest) {
        const sorted = [...graded].sort((a, b) => {
          const pctA = (a.score ?? 0) / a.maxScore;
          const pctB = (b.score ?? 0) / b.maxScore;
          return pctA - pctB;
        });
        graded = sorted.slice(cat.dropLowest);
      }

      let catEarned = 0, catPossible = 0;
      for (const a of graded) {
        if (a.isExtraCredit) { catEarned += (a.score ?? 0); }
        else { catEarned += (a.score ?? 0); catPossible += a.maxScore; }
      }

      const catGrade = catPossible > 0 ? (catEarned / catPossible) * 100 : null;

      if (catGrade !== null && cat.weight > 0) {
        weightedSum     += cat.weight * catGrade;
        totalWeightUsed += cat.weight;
      }

      categoryBreakdown.push({
        categoryId:      cat.id,
        categoryName:    cat.name,
        color:           cat.color,
        weight:          cat.weight,
        earnedPoints:    catEarned,
        totalPoints:     catPossible,
        grade:           catGrade,
        assignmentCount: catAssignments.length,
        gradedCount:     graded.length,
      });

      // Accumulate totals for summary display
      pointsEarned  += catEarned;
      pointsPossible += catPossible;
    }

    currentGrade = totalWeightUsed > 0 ? weightedSum / totalWeightUsed : null;
  }

  const letterGrade = getLetterGrade(currentGrade);
  const isOnTrack   = currentGrade !== null && currentGrade >= course.targetGrade;

  return {
    courseId:           course.id,
    currentGrade,
    letterGrade,
    isOnTrack,
    gradedAssignments:  gradedAssignments.length,
    totalAssignments,
    remainingAssignments,
    categoryBreakdown,
    pointsEarned,
    pointsPossible,
  };
}

// ── Forecaster ─────────────────────────────────────────────────────────────

/**
 * What score do I need on remaining work to hit targetGrade?
 * For weighted: remaining weight = total declared weight minus weight of categories that have grades.
 * For points: remaining points = user specifies remaining possible points.
 */
export function forecastRequired(
  course: Course,
  assignments: Assignment[],
  targetGrade: number,
  remainingPossiblePoints?: number  // only used for points-based
): ForecastResult {
  const courseGrade = calculateCourseGrade(course, assignments);
  const currentGrade = courseGrade.currentGrade;

  if (course.gradingType === 'points') {
    // Points based
    const earned   = courseGrade.pointsEarned;
    const possible = courseGrade.pointsPossible;
    const remaining = remainingPossiblePoints ?? 0;
    const totalFuturePossible = possible + remaining;

    if (totalFuturePossible === 0) {
      return { targetGrade, requiredScore: 0, requiredPct: 0, isAchievable: false, currentGrade, remainingWeight: 0 };
    }

    const targetEarned = (targetGrade / 100) * totalFuturePossible;
    const requiredScore = targetEarned - earned;
    const requiredPct   = remaining > 0 ? (requiredScore / remaining) * 100 : Infinity;

    return {
      targetGrade,
      requiredScore: Math.max(0, requiredScore),
      requiredPct:   Math.max(0, requiredPct),
      isAchievable:  requiredPct <= 100,
      currentGrade,
      remainingWeight: remaining,
    };
  } else {
    // Weighted: find categories with no grades yet
    const totalDeclaredWeight = course.categories.reduce((s, c) => s + c.weight, 0);
    const usedWeight = courseGrade.categoryBreakdown
      .filter(c => c.grade !== null)
      .reduce((s, c) => s + c.weight, 0);
    const currentContribution = courseGrade.categoryBreakdown
      .filter(c => c.grade !== null)
      .reduce((s, c) => s + c.weight * (c.grade ?? 0), 0);

    const remainingWeight = totalDeclaredWeight - usedWeight;

    if (remainingWeight <= 0) {
      return { targetGrade, requiredScore: 0, requiredPct: 0, isAchievable: false, currentGrade, remainingWeight: 0 };
    }

    // target*totalWeight = currentContribution + remainingWeight * requiredScore
    const targetContribution = targetGrade * totalDeclaredWeight;
    const requiredContribution = targetContribution - currentContribution;
    const requiredPct = (requiredContribution / remainingWeight);

    return {
      targetGrade,
      requiredScore: requiredPct,
      requiredPct:   requiredPct,
      isAchievable:  requiredPct <= 100,
      currentGrade,
      remainingWeight,
    };
  }
}

// ── GPA calculation ─────────────────────────────────────────────────────────

export function calculateGpa(
  courses: { name: string; id: string; grade: number | null; creditHours: number }[],
  previousCredits: number = 0,
  previousGpa: number = 0,
  scaleKey: string = '4.0'
): GpaResult {
  const scale = GPA_SCALES[scaleKey] ?? GPA_SCALES['4.0'];
  const entries: GpaEntry[] = [];
  let semesterCredits = 0;
  let semesterPoints  = 0;

  for (const c of courses) {
    if (c.grade === null || c.creditHours <= 0) continue;
    const letter     = getLetterGrade(c.grade, scale);
    const gpaPoints  = getGradePoints(c.grade, scale);
    entries.push({
      courseId:    c.id,
      courseName:  c.name,
      creditHours: c.creditHours,
      grade:       c.grade,
      letterGrade: letter,
      gradePoints: gpaPoints,
    });
    semesterCredits += c.creditHours;
    semesterPoints  += gpaPoints * c.creditHours;
  }

  const semesterGpa = semesterCredits > 0 ? semesterPoints / semesterCredits : 0;

  const totalCredits     = previousCredits + semesterCredits;
  const cumulativeGpa    = totalCredits > 0
    ? (previousGpa * previousCredits + semesterPoints) / totalCredits
    : semesterGpa;

  return {
    semesterGpa:    Math.round(semesterGpa    * 1000) / 1000,
    cumulativeGpa:  Math.round(cumulativeGpa  * 1000) / 1000,
    totalCredits,
    entries,
  };
}

// ── Scenario simulation ─────────────────────────────────────────────────────

export function simulateScenario(
  course: Course,
  completedAssignments: Assignment[],
  pendingAssignments: Assignment[],
  hypotheticalScores: Record<string, number>  // assignmentId → score
): number | null {
  const simulated: Assignment[] = [
    ...completedAssignments,
    ...pendingAssignments.map(a => ({
      ...a,
      score: hypotheticalScores[a.id] ?? null,
    })),
  ];
  const result = calculateCourseGrade(course, simulated);
  return result.currentGrade;
}

// ── Formatting helpers ──────────────────────────────────────────────────────

export function fmtGrade(pct: number | null, decimals = 1): string {
  if (pct === null || isNaN(pct)) return '—';
  return `${pct.toFixed(decimals)}%`;
}

export function fmtGpa(gpa: number): string {
  return gpa.toFixed(2);
}
