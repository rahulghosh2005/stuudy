import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getSemesters, addSemester, getCoursesBySemester, deleteCourse } from '../firebase/grades';
import { calculateCourseGrade, fmtGrade, getLetterGrade, getGradeColor, calculateGpa, fmtGpa } from '../utils/gradeCalc';
import { getAssignments } from '../firebase/grades';
import { AddCourseModal } from '../components/grades/AddCourseModal';
import type { Semester, Course } from '../types/grades';
import {
  Plus, GraduationCap, BookOpen, Target, TrendingUp,
  ChevronRight, Trash2, MoreHorizontal, Award, Calculator,
} from 'lucide-react';

const SEMESTER_PRESETS = [
  'Fall 2024', 'Winter 2025', 'Spring 2025', 'Summer 2025',
  'Fall 2025', 'Winter 2026', 'Spring 2026', 'Summer 2026',
];

export function GradesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [activeSemId, setActiveSemId] = useState<string | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseGrades, setCourseGrades] = useState<Record<string, number | null>>({});
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [showAddSemester, setShowAddSemester] = useState(false);
  const [newSemName, setNewSemName] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [gpaScale, setGpaScale] = useState<string>('4.0');

  // ── Load semesters ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.uid) return;
    getSemesters(user.uid).then(list => {
      setSemesters(list);
      const active = list.find(s => s.isActive) ?? list[list.length - 1];
      if (active) setActiveSemId(active.id);
    }).catch(() => {});
  }, [user?.uid]);

  // ── Load courses for active semester ───────────────────────────────────
  useEffect(() => {
    if (!user?.uid || !activeSemId) return;
    let cancelled = false;
    // Step 1: show courses immediately (no grade yet)
    getCoursesBySemester(user.uid, activeSemId).then(list => {
      if (cancelled) return;
      setCourses(list);
      // Step 2: load each course's grades independently — update state as each arrives
      list.forEach(course => {
        getAssignments(user.uid!, course.id).then(assignments => {
          if (cancelled) return;
          const grade = calculateCourseGrade(course, assignments);
          setCourseGrades(prev => ({ ...prev, [course.id]: grade.currentGrade }));
        }).catch(() => {});
      });
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [user?.uid, activeSemId]);

  const activeSemester = semesters.find(s => s.id === activeSemId);

  // ── GPA summary for active semester ────────────────────────────────────
  const gpaResult = calculateGpa(
    courses.map(c => ({
      id: c.id, name: c.name,
      grade: courseGrades[c.id] ?? null,
      creditHours: c.creditHours,
    })),
    0, 0, gpaScale
  );

  // ── Add semester (optimistic — UI updates instantly, Firestore write in background) ──
  function handleAddSemester(name: string) {
    if (!user?.uid || !name.trim()) return;
    const trimmed = name.trim();
    const tempId = `temp_sem_${Date.now()}`;
    const optimistic: Semester = {
      id: tempId,
      name: trimmed,
      startDate: '',
      endDate: '',
      isActive: true,
      order: semesters.length,
      createdAt: null as any,
    };
    // Update UI immediately
    setSemesters(prev => [...prev, optimistic]);
    setActiveSemId(tempId);
    setShowAddSemester(false);
    setNewSemName('');
    // Write to Firestore in background, swap temp ID for real ID when done
    addSemester(user.uid, {
      name: trimmed, startDate: '', endDate: '', isActive: true, order: semesters.length,
    }).then(saved => {
      setSemesters(prev => prev.map(s => s.id === tempId ? saved : s));
      setActiveSemId(id => id === tempId ? saved.id : id);
    }).catch(() => {
      // Roll back on failure
      setSemesters(prev => prev.filter(s => s.id !== tempId));
      setActiveSemId(prev => prev === tempId ? null : prev);
    });
  }

  // ── After course added (called twice: once with temp ID, once with real ID) ─
  function handleCourseAdded(course: Course) {
    setCourses(prev => {
      // If a temp version already exists, swap it; otherwise append
      const tempIdx = prev.findIndex(c => c.id.startsWith('temp_course_') && c.name === course.name);
      if (tempIdx !== -1 && !course.id.startsWith('temp_course_')) {
        const next = [...prev];
        next[tempIdx] = course;
        return next;
      }
      if (prev.some(c => c.id === course.id)) return prev; // already present
      return [...prev, course];
    });
    setCourseGrades(prev => ({ ...prev, [course.id]: null }));
    setShowAddCourse(false);
  }

  // ── Delete course ───────────────────────────────────────────────────────
  async function handleDeleteCourse(courseId: string) {
    if (!user?.uid || !confirm('Delete this course and all its assignments?')) return;
    setCourses(prev => prev.filter(c => c.id !== courseId));
    setOpenMenuId(null);
    deleteCourse(user.uid, courseId).catch(() => {});
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', paddingBottom: 80 }}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{
        padding: '32px 32px 0',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, letterSpacing: '-0.04em' }}>
              Grades
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>
              Track assignments, calculate GPA, and forecast what you need.
            </p>
          </div>
          <button
            onClick={() => setShowAddCourse(true)}
            disabled={!activeSemId}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '9px 16px', fontSize: 13, fontWeight: 700,
              background: 'var(--accent)', color: '#fff',
              border: 'none', borderRadius: 10, cursor: 'pointer',
              opacity: activeSemId ? 1 : 0.4,
              boxShadow: '0 2px 12px rgba(252,76,2,0.3)',
            }}
          >
            <Plus size={14} strokeWidth={2.5} />
            Add Course
          </button>
        </div>

        {/* Semester tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, overflowX: 'auto', paddingBottom: 1 }}>
          {semesters.map(sem => (
            <button
              key={sem.id}
              onClick={() => setActiveSemId(sem.id)}
              style={{
                padding: '8px 16px', fontSize: 13, fontWeight: 600,
                background: 'transparent', border: 'none',
                borderBottom: `2px solid ${sem.id === activeSemId ? 'var(--accent)' : 'transparent'}`,
                color: sem.id === activeSemId ? 'var(--accent)' : 'var(--text-secondary)',
                cursor: 'pointer', whiteSpace: 'nowrap',
                transition: 'color 0.15s, border-color 0.15s',
              }}
            >
              {sem.name}
            </button>
          ))}
          <button
            onClick={() => setShowAddSemester(true)}
            style={{
              padding: '8px 12px', fontSize: 12, fontWeight: 600,
              background: 'transparent', border: 'none',
              color: 'var(--text-tertiary)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4,
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}
          >
            <Plus size={12} strokeWidth={2.5} /> Semester
          </button>
        </div>
      </div>

      <div style={{ padding: '24px 32px', maxWidth: 1100 }}>

        {/* ── No semester empty state ─────────────────────────────────── */}
        {semesters.length === 0 && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: '80px 24px', gap: 16,
            textAlign: 'center',
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: 'var(--accent-muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <GraduationCap size={26} color="var(--accent)" strokeWidth={1.5} />
            </div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 6 }}>Start tracking your grades</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 340 }}>
                Create a semester to begin adding courses and tracking your academic performance.
              </div>
            </div>
            <button
              onClick={() => setShowAddSemester(true)}
              style={{
                padding: '11px 22px', fontSize: 14, fontWeight: 700,
                background: 'var(--accent)', color: '#fff',
                border: 'none', borderRadius: 12, cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(252,76,2,0.35)',
              }}
            >
              Create First Semester
            </button>
          </div>
        )}

        {/* ── GPA summary bar ─────────────────────────────────────────── */}
        {activeSemId && courses.length > 0 && (
          <div style={{
            display: 'flex', gap: 12, marginBottom: 24,
            flexWrap: 'wrap',
          }}>
            {[
              { label: 'Semester GPA', value: fmtGpa(gpaResult.semesterGpa), icon: Award, color: 'var(--accent)' },
              { label: 'Total Credits', value: `${gpaResult.totalCredits} cr`, icon: BookOpen, color: '#3b82f6' },
              { label: 'Courses', value: `${courses.length}`, icon: GraduationCap, color: '#8b5cf6' },
              {
                label: 'On Track',
                value: `${courses.filter(c => {
                  const g = courseGrades[c.id];
                  return g !== null && g >= c.targetGrade;
                }).length}/${courses.length}`,
                icon: Target, color: '#22c55e',
              },
            ].map(stat => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: 'var(--card)', border: '1px solid var(--border)',
                  borderRadius: 12, padding: '12px 18px', flex: '1 1 160px',
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: `${stat.color}18`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Icon size={17} color={stat.color} strokeWidth={1.8} />
                  </div>
                  <div>
                    <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text)' }}>
                      {stat.value}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {stat.label}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* GPA Scale selector */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '12px 18px',
            }}>
              <Calculator size={14} color="var(--text-tertiary)" strokeWidth={2} />
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>Scale</span>
              {(['4.0', '4.3', '5.0'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setGpaScale(s)}
                  style={{
                    padding: '4px 8px', fontSize: 11, fontWeight: 700,
                    borderRadius: 6, border: 'none', cursor: 'pointer',
                    background: gpaScale === s ? 'var(--accent)' : 'var(--border)',
                    color: gpaScale === s ? '#fff' : 'var(--text-secondary)',
                    transition: 'background 0.15s',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Course grid ─────────────────────────────────────────────── */}
        {activeSemId && courses.length === 0 && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '60px 24px', gap: 12, textAlign: 'center',
            background: 'var(--card)', border: '1px dashed var(--border-alt)',
            borderRadius: 16,
          }}>
            <BookOpen size={28} color="var(--text-tertiary)" strokeWidth={1.5} />
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-secondary)' }}>No courses yet</div>
            <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
              Click "Add Course" to start tracking {activeSemester?.name ?? 'this semester'}.
            </div>
          </div>
        )}

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 14,
        }}>
          {courses.map(course => {
            const grade = courseGrades[course.id];
            const letter = getLetterGrade(grade);
            const gradeColor = getGradeColor(grade);
            const progress = course.targetGrade > 0 && grade !== null
              ? Math.min((grade / course.targetGrade) * 100, 100) : 0;
            const isOnTrack = grade !== null && grade >= course.targetGrade;
            const gpaEntry = gpaResult.entries.find(e => e.courseId === course.id);

            return (
              <div
                key={course.id}
                onClick={() => navigate(`/grades/${course.id}`)}
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: 16,
                  padding: '18px 20px',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'border-color 0.15s, transform 0.1s',
                  overflow: 'hidden',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = course.color;
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {/* Color strip */}
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                  background: course.color, borderRadius: '16px 16px 0 0',
                }} />

                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 22, flexShrink: 0 }}>{course.icon}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{
                        fontSize: 15, fontWeight: 800, color: 'var(--text)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        letterSpacing: '-0.02em',
                      }}>
                        {course.name}
                      </div>
                      {course.instructor && (
                        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500, marginTop: 1 }}>
                          {course.instructor}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Grade pill */}
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
                    flexShrink: 0, marginLeft: 8,
                  }}>
                    <div style={{
                      fontSize: 22, fontWeight: 900, letterSpacing: '-0.04em',
                      color: gradeColor,
                    }}>
                      {letter}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600 }}>
                      {fmtGrade(grade)}
                    </div>
                  </div>
                </div>

                {/* Progress toward target */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Target {course.targetGrade}%
                    </span>
                    <span style={{
                      fontSize: 11, fontWeight: 700,
                      color: isOnTrack ? '#22c55e' : grade !== null ? '#ef4444' : 'var(--text-tertiary)',
                    }}>
                      {isOnTrack ? '✓ On track' : grade !== null ? 'Below target' : 'No grades yet'}
                    </span>
                  </div>
                  <div style={{
                    height: 5, background: 'var(--border-alt)', borderRadius: 100, overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${progress}%`,
                      background: isOnTrack ? '#22c55e' : course.color,
                      borderRadius: 100,
                      transition: 'width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    }} />
                  </div>
                </div>

                {/* Footer */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500 }}>
                      {course.creditHours} cr
                    </span>
                    {gpaEntry && (
                      <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600 }}>
                        {fmtGpa(gpaEntry.gradePoints)} pts
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-tertiary)' }}>
                    <span style={{ fontSize: 11, fontWeight: 500 }}>Open</span>
                    <ChevronRight size={13} strokeWidth={2} />
                  </div>
                </div>

                {/* Context menu */}
                <button
                  onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId === course.id ? null : course.id); }}
                  style={{
                    position: 'absolute', top: 14, right: 14,
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-tertiary)', padding: 4, borderRadius: 6,
                    display: 'flex', alignItems: 'center',
                    opacity: 0,
                    transition: 'opacity 0.15s',
                  }}
                  className="course-menu-btn"
                >
                  <MoreHorizontal size={16} strokeWidth={1.8} />
                </button>

                {openMenuId === course.id && (
                  <div
                    onClick={e => e.stopPropagation()}
                    style={{
                      position: 'absolute', top: 42, right: 12,
                      background: 'var(--card-alt)', border: '1px solid var(--border-alt)',
                      borderRadius: 10, padding: '4px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                      zIndex: 100, minWidth: 140,
                    }}
                  >
                    <button
                      onClick={() => handleDeleteCourse(course.id)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                        padding: '8px 12px', background: 'none', border: 'none',
                        cursor: 'pointer', color: '#ef4444', fontSize: 13, fontWeight: 600,
                        borderRadius: 7, textAlign: 'left',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.1)')}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}
                    >
                      <Trash2 size={13} strokeWidth={2} />
                      Delete course
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── GPA Breakdown table ──────────────────────────────────────── */}
        {gpaResult.entries.length > 0 && (
          <div style={{
            marginTop: 32,
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 16, overflow: 'hidden',
          }}>
            <div style={{
              padding: '14px 20px',
              borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <TrendingUp size={15} color="var(--accent)" strokeWidth={2} />
              <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>GPA Breakdown</span>
              <span style={{ marginLeft: 'auto', fontSize: 19, fontWeight: 900, letterSpacing: '-0.04em', color: 'var(--accent)' }}>
                {fmtGpa(gpaResult.semesterGpa)}
              </span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)' }}>
                  {['Course', 'Grade', 'Letter', 'Credits', 'GPA Pts'].map(h => (
                    <th key={h} style={{
                      padding: '8px 20px', textAlign: 'left',
                      fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)',
                      textTransform: 'uppercase', letterSpacing: '0.07em',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {gpaResult.entries.map((entry, i) => (
                  <tr key={entry.courseId}
                    onClick={() => navigate(`/grades/${entry.courseId}`)}
                    style={{
                      borderTop: i > 0 ? '1px solid var(--border)' : 'none',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                  >
                    <td style={{ padding: '11px 20px', fontSize: 13, fontWeight: 600 }}>{entry.courseName}</td>
                    <td style={{ padding: '11px 20px', fontSize: 13, fontWeight: 700, color: getGradeColor(entry.grade) }}>{fmtGrade(entry.grade)}</td>
                    <td style={{ padding: '11px 20px', fontSize: 13, fontWeight: 800, color: getGradeColor(entry.grade) }}>{entry.letterGrade}</td>
                    <td style={{ padding: '11px 20px', fontSize: 13, color: 'var(--text-secondary)' }}>{entry.creditHours}</td>
                    <td style={{ padding: '11px 20px', fontSize: 13, fontWeight: 700 }}>{fmtGpa(entry.gradePoints)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add Semester Modal ───────────────────────────────────────── */}
      {showAddSemester && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)', zIndex: 500,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
          onClick={() => setShowAddSemester(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--card)', borderRadius: 20,
              padding: 28, width: 360, boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
            }}
          >
            <h3 style={{ margin: '0 0 18px', fontSize: 17, fontWeight: 800, letterSpacing: '-0.03em' }}>
              Add Semester
            </h3>
            {/* Quick presets */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
              {SEMESTER_PRESETS.filter(p => !semesters.some(s => s.name === p)).map(p => (
                <button
                  key={p}
                  onClick={() => setNewSemName(p)}
                  style={{
                    padding: '5px 10px', fontSize: 11, fontWeight: 600,
                    background: newSemName === p ? 'var(--accent)' : 'var(--border)',
                    color: newSemName === p ? '#fff' : 'var(--text-secondary)',
                    border: 'none', borderRadius: 7, cursor: 'pointer',
                    transition: 'background 0.1s',
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
            <input
              value={newSemName}
              onChange={e => setNewSemName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddSemester(newSemName); }}
              placeholder="e.g. Fall 2025"
              autoFocus
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'var(--input-bg)', border: '1.5px solid var(--border-alt)',
                borderRadius: 10, color: 'var(--text)', fontSize: 14,
                padding: '11px 14px', fontFamily: 'inherit', outline: 'none',
              }}
              onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border-alt)')}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button
                onClick={() => handleAddSemester(newSemName)}
                disabled={!newSemName.trim()}
                style={{
                  flex: 1, padding: '11px', fontSize: 13, fontWeight: 700,
                  background: newSemName.trim() ? 'var(--accent)' : 'var(--border-alt)',
                  color: newSemName.trim() ? '#fff' : 'var(--text-tertiary)',
                  border: 'none', borderRadius: 10, cursor: newSemName.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                Create
              </button>
              <button
                onClick={() => setShowAddSemester(false)}
                style={{
                  padding: '11px 16px', fontSize: 13, fontWeight: 600,
                  background: 'transparent', border: '1px solid var(--border-alt)',
                  borderRadius: 10, cursor: 'pointer', color: 'var(--text-secondary)',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Click-outside handler for course menus */}
      {openMenuId && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 99 }}
          onClick={() => setOpenMenuId(null)}
        />
      )}

      {/* ── Add Course Modal ─────────────────────────────────────────── */}
      {showAddCourse && user && activeSemId && (
        <AddCourseModal
          uid={user.uid}
          semesterId={activeSemId}
          existingCount={courses.length}
          onAdded={handleCourseAdded}
          onClose={() => setShowAddCourse(false)}
        />
      )}

      <style>{`
        .course-card:hover .course-menu-btn { opacity: 1 !important; }
      `}</style>
    </div>
  );
}
