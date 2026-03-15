import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getCourse, getAssignments, addAssignment, updateAssignment, deleteAssignment, updateCourseCategories } from '../firebase/grades';
import {
  calculateCourseGrade, forecastRequired, simulateScenario,
  fmtGrade, getLetterGrade, getGradeColor,
} from '../utils/gradeCalc';
import type { Course, Assignment, GradeCategory, AssignmentStatus } from '../types/grades';
import {
  ArrowLeft, Plus, Target, Zap, BarChart2, Sliders, Check, Trash2,
  ChevronDown, ChevronUp, Edit2, Save, X, AlertTriangle, TrendingUp,
} from 'lucide-react';

type Tab = 'assignments' | 'categories' | 'forecast' | 'analytics';

export function CoursePage() {
  const { courseId } = useParams<{ courseId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [course, setCourse] = useState<Course | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('assignments');

  // ── Load data ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.uid || !courseId) return;
    let cancelled = false;
    Promise.all([
      getCourse(user.uid, courseId),
      getAssignments(user.uid, courseId),
    ]).then(([c, a]) => {
      if (cancelled) return;
      setCourse(c);
      setAssignments(a);
      setLoading(false);
    }).catch(() => setLoading(false));
    return () => { cancelled = true; };
  }, [user?.uid, courseId]);

  const gradeResult = useMemo(
    () => course ? calculateCourseGrade(course, assignments) : null,
    [course, assignments]
  );

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-secondary)', fontSize: 14 }}>
      Loading course…
    </div>
  );

  if (!course || !gradeResult) return (
    <div style={{ padding: 40, color: 'var(--text-secondary)' }}>Course not found.</div>
  );

  const letter     = getLetterGrade(gradeResult.currentGrade);
  const gradeColor = getGradeColor(gradeResult.currentGrade);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', paddingBottom: 80 }}>
      {/* ── Top accent strip ─────────────────────────────────────────────── */}
      <div style={{ height: 4, background: course.color }} />

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div style={{
        padding: '20px 32px 0',
        background: 'var(--bg)',
        position: 'sticky', top: 0, zIndex: 40,
        borderBottom: '1px solid var(--border)',
      }}>
        <button
          onClick={() => navigate('/grades')}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600,
            padding: 0, marginBottom: 14,
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
        >
          <ArrowLeft size={13} strokeWidth={2} />
          All Courses
        </button>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 32 }}>{course.icon}</span>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, letterSpacing: '-0.04em' }}>{course.name}</h1>
              {course.instructor && (
                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 500 }}>{course.instructor}</p>
              )}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 36, fontWeight: 900, letterSpacing: '-0.05em', color: gradeColor, lineHeight: 1 }}>
              {letter}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 700 }}>
              {fmtGrade(gradeResult.currentGrade)}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500 }}>
              Target {course.targetGrade}% {gradeResult.isOnTrack ? '✓' : ''}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ height: 6, background: 'var(--border-alt)', borderRadius: 100, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${gradeResult.currentGrade !== null ? Math.min((gradeResult.currentGrade / 100) * 100, 100) : 0}%`,
              background: gradeColor,
              borderRadius: 100,
              transition: 'width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500 }}>
              {gradeResult.gradedAssignments}/{gradeResult.totalAssignments} graded
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500 }}>
              {gradeResult.pointsEarned.toFixed(1)} / {gradeResult.pointsPossible.toFixed(1)} pts
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0 }}>
          {([
            { key: 'assignments', label: 'Assignments', icon: Check },
            { key: 'categories',  label: 'Categories',  icon: Sliders },
            { key: 'forecast',    label: 'Forecast',    icon: Target },
            { key: 'analytics',   label: 'Analytics',   icon: BarChart2 },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '8px 14px', fontSize: 12, fontWeight: 600,
                background: 'transparent', border: 'none',
                borderBottom: `2px solid ${tab === key ? 'var(--accent)' : 'transparent'}`,
                color: tab === key ? 'var(--accent)' : 'var(--text-secondary)',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              <Icon size={13} strokeWidth={tab === key ? 2.5 : 1.8} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ──────────────────────────────────────────────────── */}
      <div style={{ padding: '24px 32px' }}>
        {tab === 'assignments' && (
          <AssignmentsTab
            course={course}
            assignments={assignments}
            setAssignments={setAssignments}
            uid={user!.uid}
          />
        )}
        {tab === 'categories' && (
          <CategoriesTab
            course={course}
            setCourse={setCourse}
            gradeResult={gradeResult}
            uid={user!.uid}
          />
        )}
        {tab === 'forecast' && (
          <ForecastTab
            course={course}
            assignments={assignments}
          />
        )}
        {tab === 'analytics' && (
          <AnalyticsTab
            course={course}
            assignments={assignments}
            gradeResult={gradeResult}
          />
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Assignments Tab
// ─────────────────────────────────────────────────────────────────────────────

function AssignmentsTab({
  course, assignments, setAssignments, uid,
}: {
  course: Course;
  assignments: Assignment[];
  setAssignments: React.Dispatch<React.SetStateAction<Assignment[]>>;
  uid: string;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Group by category
  const grouped = useMemo(() => {
    const map: Record<string, Assignment[]> = {};
    for (const cat of course.categories) {
      map[cat.id] = assignments.filter(a => a.categoryId === cat.id);
    }
    // Uncategorized
    const knownIds = new Set(course.categories.map(c => c.id));
    const uncategorized = assignments.filter(a => !knownIds.has(a.categoryId));
    if (uncategorized.length > 0) map['__uncategorized'] = uncategorized;
    return map;
  }, [assignments, course.categories]);

  function handleDelete(aId: string) {
    setAssignments(prev => prev.filter(a => a.id !== aId));
    deleteAssignment(uid, course.id, aId).catch(() => {});
  }

  function handleScoreUpdate(aId: string, score: number | null) {
    setAssignments(prev => prev.map(a => a.id === aId ? { ...a, score, status: score !== null ? 'completed' : a.status } : a));
    updateAssignment(uid, course.id, aId, { score, status: score !== null ? 'completed' : 'pending' }).catch(() => {});
  }

  function handleAdded(a: Assignment) {
    setAssignments(prev => [...prev, a]);
    setShowAdd(false);
  }

  const cats = [...course.categories, ...(grouped['__uncategorized']?.length ? [{ id: '__uncategorized', name: 'Uncategorized', color: '#6b7280', weight: 0 }] : [])];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button
          onClick={() => setShowAdd(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '9px 16px', fontSize: 12, fontWeight: 700,
            background: 'var(--accent)', color: '#fff',
            border: 'none', borderRadius: 10, cursor: 'pointer',
            boxShadow: '0 2px 12px rgba(252,76,2,0.3)',
          }}
        >
          <Plus size={13} strokeWidth={2.5} /> Add Assignment
        </button>
      </div>

      {assignments.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '60px 24px',
          background: 'var(--card)', border: '1px dashed var(--border-alt)',
          borderRadius: 14,
        }}>
          <Check size={28} color="var(--text-tertiary)" strokeWidth={1.5} style={{ marginBottom: 10 }} />
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>No assignments yet</div>
          <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Add your first assignment to start tracking grades.</div>
        </div>
      )}

      {cats.map(cat => {
        const catAssignments = grouped[cat.id] ?? [];
        if (catAssignments.length === 0) return null;
        const catGradeInfo = calculateCourseGrade(course, assignments).categoryBreakdown.find(c => c.categoryId === cat.id);
        return (
          <CategorySection
            key={cat.id}
            cat={cat as GradeCategory}
            assignments={catAssignments}
            catGradeInfo={catGradeInfo}
            gradingType={course.gradingType}
            editingId={editingId}
            setEditingId={setEditingId}
            onDelete={handleDelete}
            onScoreUpdate={handleScoreUpdate}
          />
        );
      })}

      {showAdd && (
        <AddAssignmentModal
          course={course}
          uid={uid}
          onAdded={handleAdded}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  );
}

function CategorySection({
  cat, assignments, catGradeInfo, gradingType, editingId, setEditingId, onDelete, onScoreUpdate,
}: {
  cat: GradeCategory;
  assignments: Assignment[];
  catGradeInfo: ReturnType<typeof calculateCourseGrade>['categoryBreakdown'][number] | undefined;
  gradingType: string;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  onDelete: (id: string) => void;
  onScoreUpdate: (id: string, score: number | null) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div style={{ marginBottom: 20 }}>
      {/* Category header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 0', background: 'none', border: 'none', cursor: 'pointer',
          marginBottom: 6,
        }}
      >
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: cat.color, flexShrink: 0 }} />
        <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          {cat.name}
        </span>
        {gradingType === 'weighted' && (
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600 }}>{cat.weight}%</span>
        )}
        {catGradeInfo?.grade !== null && catGradeInfo?.grade !== undefined && (
          <span style={{
            marginLeft: 'auto',
            fontSize: 13, fontWeight: 800,
            color: getGradeColor(catGradeInfo.grade),
          }}>
            {fmtGrade(catGradeInfo.grade)}
          </span>
        )}
        {collapsed ? <ChevronDown size={14} color="var(--text-tertiary)" /> : <ChevronUp size={14} color="var(--text-tertiary)" />}
      </button>

      {!collapsed && (
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 12, overflow: 'hidden',
        }}>
          {assignments.map((a, i) => (
            <AssignmentRow
              key={a.id}
              assignment={a}
              isLast={i === assignments.length - 1}
              isEditing={editingId === a.id}
              onEdit={() => setEditingId(editingId === a.id ? null : a.id)}
              onDelete={() => onDelete(a.id)}
              onScoreUpdate={(score) => onScoreUpdate(a.id, score)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AssignmentRow({
  assignment, isLast, isEditing, onEdit, onDelete, onScoreUpdate,
}: {
  assignment: Assignment;
  isLast: boolean;
  isEditing: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onScoreUpdate: (score: number | null) => void;
}) {
  const [scoreInput, setScoreInput] = useState(String(assignment.score ?? ''));
  const pct = assignment.score !== null && assignment.maxScore > 0
    ? (assignment.score / assignment.maxScore) * 100 : null;

  const statusColors: Record<AssignmentStatus, string> = {
    completed: '#22c55e',
    pending:   '#f97316',
    missing:   '#ef4444',
  };

  function commitScore() {
    const val = parseFloat(scoreInput);
    if (isNaN(val)) { onScoreUpdate(null); }
    else { onScoreUpdate(Math.min(val, assignment.maxScore + (assignment.isExtraCredit ? 100 : 0))); }
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '11px 16px',
      borderBottom: isLast ? 'none' : '1px solid var(--border)',
      transition: 'background 0.1s',
    }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
      onMouseLeave={e => (e.currentTarget.style.background = '')}
    >
      {/* Status dot */}
      <div style={{
        width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
        background: statusColors[assignment.status],
      }} />

      {/* Title */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 600, color: 'var(--text)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {assignment.title}
          {assignment.isExtraCredit && (
            <span style={{
              marginLeft: 6, fontSize: 9, fontWeight: 800,
              color: '#eab308', background: 'rgba(234,179,8,0.15)',
              padding: '1px 6px', borderRadius: 100,
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>EC</span>
          )}
        </div>
        {assignment.dueDate && (
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500, marginTop: 1 }}>
            Due {new Date(assignment.dueDate + 'T00:00').toLocaleDateString('en', { month: 'short', day: 'numeric' })}
          </div>
        )}
      </div>

      {/* Score editor */}
      {isEditing ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <input
            type="number" value={scoreInput}
            onChange={e => setScoreInput(e.target.value)}
            onBlur={commitScore}
            onKeyDown={e => { if (e.key === 'Enter') { commitScore(); onEdit(); } if (e.key === 'Escape') onEdit(); }}
            autoFocus
            style={{
              width: 54, background: 'var(--input-bg)', border: '1.5px solid var(--accent)',
              borderRadius: 7, padding: '4px 8px', fontSize: 13, fontWeight: 700,
              color: 'var(--text)', fontFamily: 'inherit', outline: 'none',
              textAlign: 'right',
            }}
          />
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>/ {assignment.maxScore}</span>
          <button onClick={() => { commitScore(); onEdit(); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#22c55e', padding: 2, display: 'flex' }}>
            <Save size={13} strokeWidth={2.5} />
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: pct !== null ? getGradeColor(pct) : 'var(--text-tertiary)' }}>
              {assignment.score !== null ? `${assignment.score}/${assignment.maxScore}` : `—/${assignment.maxScore}`}
            </div>
            {pct !== null && (
              <div style={{ fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 600 }}>{fmtGrade(pct)}</div>
            )}
          </div>
          <button onClick={onEdit}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 3, display: 'flex', borderRadius: 5 }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}
          >
            <Edit2 size={12} strokeWidth={2} />
          </button>
          <button onClick={onDelete}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 3, display: 'flex', borderRadius: 5 }}
            onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}
          >
            <Trash2 size={12} strokeWidth={2} />
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Add Assignment Modal
// ─────────────────────────────────────────────────────────────────────────────

function AddAssignmentModal({ course, uid, onAdded, onClose }: {
  course: Course; uid: string;
  onAdded: (a: Assignment) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState(course.categories[0]?.id ?? '');
  const [score, setScore] = useState('');
  const [maxScore, setMaxScore] = useState('100');
  const [isEC, setIsEC] = useState(false);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<AssignmentStatus>('pending');
  const [saving, setSaving] = useState(false);

  const hasScore = score.trim() !== '' && !isNaN(Number(score));

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    const a = await addAssignment(uid, course.id, {
      courseId: course.id,
      categoryId,
      title: title.trim(),
      score: hasScore ? Number(score) : null,
      maxScore: Number(maxScore) || 100,
      isExtraCredit: isEC,
      dueDate,
      notes,
      status: hasScore ? 'completed' : status,
    });
    onAdded(a);
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
      backdropFilter: 'blur(4px)', zIndex: 500,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--card)', borderRadius: 20,
        width: '100%', maxWidth: 460, maxHeight: '90vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 14px' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, letterSpacing: '-0.03em' }}>Add Assignment</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}>
            <X size={17} strokeWidth={2} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 13 }}>

          {/* Title */}
          <div>
            <label style={labelStyle}>Title *</label>
            <input autoFocus value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Homework 3, Midterm Exam"
              style={modalInputStyle}
              onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border-alt)')} />
          </div>

          {/* Category */}
          <div>
            <label style={labelStyle}>Category</label>
            <select value={categoryId} onChange={e => setCategoryId(e.target.value)} style={{ ...modalInputStyle, cursor: 'pointer' }}>
              {course.categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Score row */}
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Score (leave blank if ungraded)</label>
              <input type="number" value={score} onChange={e => setScore(e.target.value)}
                placeholder="e.g. 87"
                style={modalInputStyle}
                onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border-alt)')} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Max Score</label>
              <input type="number" value={maxScore} onChange={e => setMaxScore(e.target.value)}
                style={modalInputStyle}
                onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border-alt)')} />
            </div>
          </div>

          {/* Due date + EC + Status */}
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Due Date</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                style={modalInputStyle}
                onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border-alt)')} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Status</label>
              <select value={status} onChange={e => setStatus(e.target.value as AssignmentStatus)}
                style={{ ...modalInputStyle, cursor: 'pointer' }}>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="missing">Missing</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={labelStyle}>Notes (optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Any notes..."
              rows={2}
              style={{ ...modalInputStyle, resize: 'none', lineHeight: 1.5 }}
              onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border-alt)')} />
          </div>

          {/* Extra credit toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 4 }}>
            <div
              onClick={() => setIsEC(!isEC)}
              style={{
                width: 36, height: 20, borderRadius: 100, transition: 'background 0.2s',
                background: isEC ? 'var(--accent)' : 'var(--border-alt)',
                position: 'relative', flexShrink: 0, cursor: 'pointer',
              }}
            >
              <div style={{
                position: 'absolute', top: 2, left: isEC ? 18 : 2,
                width: 16, height: 16, borderRadius: '50%', background: '#fff',
                transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
              }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Extra credit (doesn't affect max points)</span>
          </label>
        </div>

        <div style={{ display: 'flex', gap: 8, padding: '14px 24px', borderTop: '1px solid var(--border)' }}>
          <button
            onClick={handleSave}
            disabled={!title.trim() || saving}
            style={{
              flex: 1, padding: '11px', fontSize: 13, fontWeight: 700,
              background: title.trim() && !saving ? 'var(--accent)' : 'var(--border-alt)',
              color: title.trim() && !saving ? '#fff' : 'var(--text-tertiary)',
              border: 'none', borderRadius: 10,
              cursor: title.trim() && !saving ? 'pointer' : 'not-allowed',
            }}
          >
            {saving ? 'Saving…' : 'Add Assignment'}
          </button>
          <button onClick={onClose} style={{
            padding: '11px 16px', fontSize: 13, fontWeight: 600,
            background: 'transparent', border: '1px solid var(--border-alt)',
            borderRadius: 10, cursor: 'pointer', color: 'var(--text-secondary)',
          }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Categories Tab
// ─────────────────────────────────────────────────────────────────────────────

function CategoriesTab({ course, setCourse, gradeResult, uid }: {
  course: Course;
  setCourse: React.Dispatch<React.SetStateAction<Course | null>>;
  gradeResult: ReturnType<typeof calculateCourseGrade>;
  uid: string;
}) {
  const [editing, setEditing] = useState(false);
  const [localCats, setLocalCats] = useState(course.categories);
  const totalWeight = localCats.reduce((s, c) => s + c.weight, 0);

  function save() {
    setCourse(prev => prev ? { ...prev, categories: localCats } : prev);
    updateCourseCategories(uid, course.id, localCats).catch(() => {});
    setEditing(false);
  }

  function update(id: string, field: keyof GradeCategory, value: string | number) {
    setLocalCats(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          Grade Categories
        </h3>
        {editing ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={save} style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px',
              fontSize: 12, fontWeight: 700, background: 'var(--accent)', color: '#fff',
              border: 'none', borderRadius: 8, cursor: 'pointer',
            }}>
              <Save size={12} strokeWidth={2.5} /> Save
            </button>
            <button onClick={() => { setLocalCats(course.categories); setEditing(false); }} style={{
              padding: '7px 12px', fontSize: 12, fontWeight: 600,
              background: 'transparent', border: '1px solid var(--border-alt)',
              borderRadius: 8, cursor: 'pointer', color: 'var(--text-secondary)',
            }}>
              Cancel
            </button>
          </div>
        ) : (
          <button onClick={() => setEditing(true)} style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px',
            fontSize: 12, fontWeight: 700, background: 'var(--border)',
            color: 'var(--text-secondary)', border: 'none', borderRadius: 8, cursor: 'pointer',
          }}>
            <Edit2 size={12} strokeWidth={2} /> Edit
          </button>
        )}
      </div>

      {course.gradingType === 'weighted' && editing && (
        <div style={{
          padding: '8px 14px', borderRadius: 8, marginBottom: 12,
          background: totalWeight !== 100 ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
          border: `1px solid ${totalWeight !== 100 ? '#ef4444' : '#22c55e'}`,
          fontSize: 12, fontWeight: 600,
          color: totalWeight !== 100 ? '#ef4444' : '#22c55e',
        }}>
          Total: {totalWeight}% {totalWeight !== 100 ? `(needs to equal 100%)` : '✓'}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(editing ? localCats : course.categories).map(cat => {
          const catInfo = gradeResult.categoryBreakdown.find(c => c.categoryId === cat.id);
          return (
            <div key={cat.id} style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '14px 16px',
              borderLeft: `4px solid ${cat.color}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {editing ? (
                  <>
                    <input type="color" value={cat.color}
                      onChange={e => update(cat.id, 'color', e.target.value)}
                      style={{ width: 26, height: 26, borderRadius: 6, border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }} />
                    <input value={cat.name} onChange={e => update(cat.id, 'name', e.target.value)}
                      style={{
                        flex: 1, background: 'var(--input-bg)', border: '1px solid var(--border-alt)',
                        borderRadius: 7, padding: '5px 10px', fontSize: 13, fontWeight: 700,
                        color: 'var(--text)', fontFamily: 'inherit', outline: 'none',
                      }} />
                    {course.gradingType === 'weighted' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <input type="number" min={0} max={100} value={cat.weight}
                          onChange={e => update(cat.id, 'weight', Number(e.target.value))}
                          style={{
                            width: 50, background: 'var(--input-bg)', border: '1px solid var(--border-alt)',
                            borderRadius: 7, padding: '5px 8px', fontSize: 13, fontWeight: 700,
                            color: 'var(--text)', fontFamily: 'inherit', textAlign: 'right', outline: 'none',
                          }} />
                        <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>%</span>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: 14, fontWeight: 800, flex: 1 }}>{cat.name}</span>
                    {course.gradingType === 'weighted' && (
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>{cat.weight}%</span>
                    )}
                  </>
                )}
              </div>

              {catInfo && (
                <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
                  <Stat label="Grade" value={fmtGrade(catInfo.grade)} color={getGradeColor(catInfo.grade)} />
                  <Stat label="Earned" value={`${catInfo.earnedPoints.toFixed(1)}/${catInfo.totalPoints.toFixed(1)}`} />
                  <Stat label="Assignments" value={`${catInfo.gradedCount}/${catInfo.assignmentCount}`} />
                  {cat.dropLowest > 0 && (
                    <Stat label="Drop lowest" value={String(cat.dropLowest)} />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Forecast Tab
// ─────────────────────────────────────────────────────────────────────────────

function ForecastTab({ course, assignments }: { course: Course; assignments: Assignment[] }) {
  const [targetGrade, setTargetGrade] = useState(course.targetGrade);
  const [remainingPoints, setRemainingPoints] = useState(100);

  // Pending assignments for scenario simulator
  const pending = assignments.filter(a => a.score === null && a.status !== 'missing');
  const [scenarios, setScenarios] = useState<{ label: string; scores: Record<string, string> }[]>([
    { label: 'Optimistic', scores: Object.fromEntries(pending.map(a => [a.id, '90'])) },
    { label: 'Realistic',  scores: Object.fromEntries(pending.map(a => [a.id, '80'])) },
    { label: 'Pessimistic',scores: Object.fromEntries(pending.map(a => [a.id, '65'])) },
  ]);

  const forecast = forecastRequired(
    course, assignments, targetGrade,
    course.gradingType === 'points' ? remainingPoints : undefined
  );

  return (
    <div style={{ maxWidth: 640, display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── What do I need? ────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 14, padding: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Target size={16} color="var(--accent)" strokeWidth={2} />
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800 }}>What do I need?</h3>
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Target Final Grade (%)</label>
            <input
              type="number" min={0} max={100}
              value={targetGrade}
              onChange={e => setTargetGrade(Number(e.target.value))}
              style={modalInputStyle}
              onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border-alt)')}
            />
          </div>
          {course.gradingType === 'points' && (
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Remaining Possible Points</label>
              <input
                type="number" min={0}
                value={remainingPoints}
                onChange={e => setRemainingPoints(Number(e.target.value))}
                style={modalInputStyle}
                onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border-alt)')}
              />
            </div>
          )}
        </div>

        {/* Result */}
        <div style={{
          padding: '16px 20px', borderRadius: 12,
          background: forecast.isAchievable ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
          border: `1px solid ${forecast.isAchievable ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
        }}>
          {forecast.currentGrade !== null && (
            <div style={{ display: 'flex', gap: 24, marginBottom: 12 }}>
              <Stat label="Current Grade" value={fmtGrade(forecast.currentGrade)} color={getGradeColor(forecast.currentGrade)} />
              <Stat label="Target" value={`${targetGrade}%`} />
              <Stat label="Remaining Weight" value={
                course.gradingType === 'weighted'
                  ? `${forecast.remainingWeight.toFixed(1)}%`
                  : `${forecast.remainingWeight} pts`
              } />
            </div>
          )}

          {forecast.isAchievable ? (
            <div>
              <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.04em', color: '#22c55e' }}>
                {fmtGrade(forecast.requiredPct, 0)}
                {course.gradingType === 'points' && ` (${forecast.requiredScore.toFixed(1)} pts)`}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, marginTop: 4 }}>
                Required on remaining {course.gradingType === 'weighted' ? 'categories' : 'work'} to reach {targetGrade}%
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <AlertTriangle size={18} color="#ef4444" strokeWidth={1.8} style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#ef4444' }}>
                  {forecast.requiredPct > 100 ? `${fmtGrade(forecast.requiredPct, 0)} required — not achievable` : 'Not enough remaining work'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
                  {forecast.remainingWeight <= 0
                    ? 'All graded work is in. Your final grade is set.'
                    : `You'd need ${fmtGrade(forecast.requiredPct, 0)} on remaining work, which exceeds 100%.`}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Scenario Simulator ─────────────────────────────────────────── */}
      {pending.length > 0 && (
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 14, padding: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Zap size={15} color="var(--accent)" strokeWidth={2} />
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800 }}>Scenario Simulator</h3>
            <span style={{
              marginLeft: 4, fontSize: 9, fontWeight: 800, letterSpacing: '0.08em',
              background: 'var(--accent)', color: '#fff', padding: '2px 7px', borderRadius: 100,
              textTransform: 'uppercase',
            }}>PRO</span>
          </div>
          <p style={{ margin: '0 0 16px', fontSize: 12, color: 'var(--text-tertiary)' }}>
            Simulate different scores on upcoming work and see how they change your final grade.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {scenarios.map((scenario, si) => {
              const simScores: Record<string, number> = {};
              pending.forEach(a => {
                const v = parseFloat(scenario.scores[a.id] ?? '');
                if (!isNaN(v)) simScores[a.id] = v;
              });
              const projected = simulateScenario(course, assignments.filter(a => a.score !== null), pending, simScores);
              const projectedLetter = getLetterGrade(projected);

              return (
                <div key={si} style={{
                  background: 'var(--bg-secondary)', borderRadius: 10, padding: '14px 16px',
                  border: '1px solid var(--border)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <input
                      value={scenario.label}
                      onChange={e => setScenarios(prev => prev.map((s, i) => i === si ? { ...s, label: e.target.value } : s))}
                      style={{
                        flex: 1, background: 'transparent', border: 'none', outline: 'none',
                        fontSize: 13, fontWeight: 800, color: 'var(--text)', fontFamily: 'inherit',
                      }}
                    />
                    <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.04em', color: getGradeColor(projected) }}>
                      {projectedLetter}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: getGradeColor(projected) }}>
                      {fmtGrade(projected)}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {pending.map(a => (
                      <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {a.title}
                        </span>
                        <input
                          type="number" min={0} max={a.maxScore}
                          value={scenario.scores[a.id] ?? ''}
                          onChange={e => setScenarios(prev => prev.map((s, i) =>
                            i === si ? { ...s, scores: { ...s.scores, [a.id]: e.target.value } } : s
                          ))}
                          style={{
                            width: 50, background: 'var(--input-bg)', border: '1px solid var(--border-alt)',
                            borderRadius: 6, padding: '4px 7px', fontSize: 12, fontWeight: 700,
                            color: 'var(--text)', fontFamily: 'inherit', outline: 'none', textAlign: 'right',
                          }}
                          onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                          onBlur={e => (e.target.style.borderColor = 'var(--border-alt)')}
                        />
                        <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>/{a.maxScore}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Analytics Tab
// ─────────────────────────────────────────────────────────────────────────────

function AnalyticsTab({ course, assignments, gradeResult }: {
  course: Course;
  assignments: Assignment[];
  gradeResult: ReturnType<typeof calculateCourseGrade>;
}) {
  // Grade trend (by assignment creation order)
  const completedByDate = [...assignments]
    .filter(a => a.score !== null)
    .sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)));

  const trendPoints: { label: string; grade: number }[] = [];
  let runningEarned = 0, runningPossible = 0;
  for (const a of completedByDate) {
    if (a.isExtraCredit) { runningEarned += (a.score ?? 0); }
    else { runningEarned += (a.score ?? 0); runningPossible += a.maxScore; }
    if (runningPossible > 0) {
      trendPoints.push({
        label: a.title.slice(0, 12),
        grade: (runningEarned / runningPossible) * 100,
      });
    }
  }

  const letterBands = [
    { min: 90, label: 'A', color: '#22c55e' },
    { min: 80, label: 'B', color: '#3b82f6' },
    { min: 70, label: 'C', color: '#f97316' },
    { min: 60, label: 'D', color: '#eab308' },
    { min:  0, label: 'F', color: '#ef4444' },
  ];

  return (
    <div style={{ maxWidth: 700, display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Category performance */}
      <div style={{
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 14, padding: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <TrendingUp size={15} color="var(--accent)" strokeWidth={2} />
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800 }}>Category Performance</h3>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {gradeResult.categoryBreakdown.filter(c => c.gradedCount > 0).map(cat => (
            <div key={cat.categoryId}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: cat.color }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{cat.categoryName}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{cat.gradedCount} graded</span>
                </div>
                <span style={{ fontSize: 14, fontWeight: 800, color: getGradeColor(cat.grade) }}>
                  {fmtGrade(cat.grade)}
                </span>
              </div>
              <div style={{ height: 8, background: 'var(--border-alt)', borderRadius: 100, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${cat.grade ?? 0}%`,
                  background: cat.color, borderRadius: 100,
                  transition: 'width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }} />
              </div>
            </div>
          ))}
          {gradeResult.categoryBreakdown.every(c => c.gradedCount === 0) && (
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: 0 }}>No graded assignments yet.</p>
          )}
        </div>
      </div>

      {/* Grade trend */}
      {trendPoints.length >= 2 && (
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 14, padding: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <BarChart2 size={15} color="var(--accent)" strokeWidth={2} />
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800 }}>Grade Trend</h3>
          </div>
          <div style={{ position: 'relative', height: 120 }}>
            <svg width="100%" height="120" style={{ overflow: 'visible' }}>
              {/* Grade bands */}
              {letterBands.map(band => (
                <line
                  key={band.label}
                  x1="0%" y1={`${120 - (band.min / 100) * 120}px`}
                  x2="100%" y2={`${120 - (band.min / 100) * 120}px`}
                  stroke={band.color} strokeWidth={0.5} strokeDasharray="4,4" opacity={0.4}
                />
              ))}
              {/* Trend line */}
              {trendPoints.map((pt, i) => {
                if (i === 0) return null;
                const prev = trendPoints[i - 1];
                const x1 = `${((i - 1) / (trendPoints.length - 1)) * 100}%`;
                const x2 = `${(i / (trendPoints.length - 1)) * 100}%`;
                const y1 = 120 - (prev.grade / 100) * 110;
                const y2 = 120 - (pt.grade / 100) * 110;
                return (
                  <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke={course.color} strokeWidth={2.5} strokeLinecap="round" />
                );
              })}
              {/* Dots */}
              {trendPoints.map((pt, i) => (
                <circle
                  key={i}
                  cx={`${(i / (trendPoints.length - 1)) * 100}%`}
                  cy={120 - (pt.grade / 100) * 110}
                  r={4} fill={course.color}
                />
              ))}
            </svg>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{trendPoints[0].label}</span>
            <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{trendPoints[trendPoints.length - 1].label}</span>
          </div>
        </div>
      )}

      {/* Score distribution */}
      <div style={{
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 14, padding: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <BarChart2 size={15} color="var(--accent)" strokeWidth={2} />
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800 }}>Score Distribution</h3>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          {letterBands.map(band => {
            const nextMin = band.min === 90 ? 101 : (letterBands[letterBands.indexOf(band) - 1]?.min ?? 101);
            const count = assignments.filter(a => {
              if (a.score === null) return false;
              const pct = (a.score / a.maxScore) * 100;
              return pct >= band.min && pct < nextMin;
            }).length;
            const maxCount = Math.max(1, ...letterBands.map(b => {
              const nb = b.min === 90 ? 101 : (letterBands[letterBands.indexOf(b) - 1]?.min ?? 101);
              return assignments.filter(a => {
                if (a.score === null) return false;
                const pct = (a.score / a.maxScore) * 100;
                return pct >= b.min && pct < nb;
              }).length;
            }));
            return (
              <div key={band.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: band.color }}>{count}</span>
                <div style={{
                  width: '100%', height: count > 0 ? `${Math.max(4, (count / maxCount) * 80)}px` : 4,
                  background: band.color, borderRadius: '4px 4px 0 0', opacity: count > 0 ? 1 : 0.2,
                  transition: 'height 0.4s ease',
                }} />
                <span style={{ fontSize: 12, fontWeight: 800, color: band.color }}>{band.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared UI helpers
// ─────────────────────────────────────────────────────────────────────────────

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div style={{ fontSize: 14, fontWeight: 800, color: color ?? 'var(--text)', letterSpacing: '-0.02em' }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>{label}</div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', marginBottom: 5,
  fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)',
  textTransform: 'uppercase', letterSpacing: '0.07em',
};

const modalInputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: 'var(--input-bg)',
  border: '1.5px solid var(--border-alt)',
  borderRadius: 10, color: 'var(--text)', fontSize: 13,
  padding: '9px 12px', fontFamily: 'inherit', outline: 'none',
  transition: 'border-color 0.15s',
};
