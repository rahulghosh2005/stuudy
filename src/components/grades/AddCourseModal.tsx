import { useState } from 'react';
import { addCourse } from '../../firebase/grades';
import { DEFAULT_CATEGORIES, COURSE_COLORS, COURSE_ICONS } from '../../types/grades';
import type { Course, GradeCategory, GradingType } from '../../types/grades';
import { X, Plus, Trash2 } from 'lucide-react';

interface Props {
  uid: string;
  semesterId: string;
  existingCount: number;
  onAdded: (course: Course) => void;
  onClose: () => void;
}

let categoryCounter = 0;
function makeCatId() { return `cat_${Date.now()}_${++categoryCounter}`; }

export function AddCourseModal({ uid, semesterId, existingCount, onAdded, onClose }: Props) {
  const [name, setName] = useState('');
  const [instructor, setInstructor] = useState('');
  const [color, setColor] = useState(COURSE_COLORS[existingCount % COURSE_COLORS.length]);
  const [icon, setIcon] = useState(COURSE_ICONS[existingCount % COURSE_ICONS.length]);
  const [gradingType, setGradingType] = useState<GradingType>('weighted');
  const [targetGrade, setTargetGrade] = useState(90);
  const [creditHours, setCreditHours] = useState(3);
  const [categories, setCategories] = useState<GradeCategory[]>(
    DEFAULT_CATEGORIES.map(c => ({ ...c, id: makeCatId() }))
  );
  const [tab, setTab] = useState<'basic' | 'categories'>('basic');

  const totalWeight = categories.reduce((s, c) => s + c.weight, 0);
  const weightError = gradingType === 'weighted' && totalWeight !== 100;

  function handleSave() {
    if (!name.trim()) return;
    const data = {
      semesterId,
      name: name.trim(),
      instructor: instructor.trim(),
      color,
      icon,
      gradingType,
      targetGrade,
      creditHours,
      categories,
      order: existingCount,
    };
    // Optimistic: give it a temp ID and show it immediately
    const tempId = `temp_course_${Date.now()}`;
    const optimistic: Course = { id: tempId, ...data, createdAt: null as any };
    onAdded(optimistic);
    // Write in background — parent will swap the temp ID when Firestore responds
    addCourse(uid, data).then(saved => {
      // Notify parent to replace temp ID with real Firestore ID
      onAdded(saved);
    }).catch(() => {});
  }

  function addCategory() {
    setCategories(prev => [...prev, {
      id: makeCatId(),
      name: 'New Category',
      weight: 0,
      dropLowest: 0,
      color: COURSE_COLORS[prev.length % COURSE_COLORS.length],
    }]);
  }

  function updateCategory(id: string, field: keyof GradeCategory, value: string | number) {
    setCategories(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  }

  function removeCategory(id: string) {
    setCategories(prev => prev.filter(c => c.id !== id));
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(4px)', zIndex: 500,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--card)', borderRadius: 20,
          width: '100%', maxWidth: 500,
          maxHeight: '92vh', display: 'flex', flexDirection: 'column',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px 0',
        }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, letterSpacing: '-0.03em' }}>
            Add Course
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-tertiary)', padding: 4,
            }}
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', padding: '14px 24px 0', gap: 4 }}>
          {(['basic', 'categories'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '7px 14px', fontSize: 12, fontWeight: 700,
                background: tab === t ? 'var(--accent-muted)' : 'transparent',
                color: tab === t ? 'var(--accent)' : 'var(--text-secondary)',
                border: tab === t ? '1px solid rgba(252,76,2,0.3)' : '1px solid transparent',
                borderRadius: 8, cursor: 'pointer', textTransform: 'capitalize' as const,
                transition: 'all 0.15s',
              }}
            >
              {t === 'basic' ? 'Course Info' : `Categories ${weightError ? '⚠' : ''}`}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>

          {tab === 'basic' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Name */}
              <Field label="Course Name *">
                <input
                  autoFocus
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. CMPUT 355, Calculus II"
                  style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border-alt)')}
                />
              </Field>

              {/* Instructor */}
              <Field label="Instructor (optional)">
                <input
                  value={instructor}
                  onChange={e => setInstructor(e.target.value)}
                  placeholder="e.g. Dr. Smith"
                  style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border-alt)')}
                />
              </Field>

              {/* Color + Icon row */}
              <div style={{ display: 'flex', gap: 14 }}>
                <Field label="Color">
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {COURSE_COLORS.map(c => (
                      <button
                        key={c}
                        onClick={() => setColor(c)}
                        style={{
                          width: 26, height: 26, borderRadius: '50%',
                          background: c, border: `2.5px solid ${c === color ? 'var(--text)' : 'transparent'}`,
                          cursor: 'pointer', outline: 'none',
                        }}
                      />
                    ))}
                  </div>
                </Field>
                <Field label="Icon">
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, maxHeight: 90, overflowY: 'auto' }}>
                    {COURSE_ICONS.map(ic => (
                      <button
                        key={ic}
                        onClick={() => setIcon(ic)}
                        style={{
                          width: 34, height: 34, fontSize: 18,
                          borderRadius: 8, border: `2px solid ${ic === icon ? 'var(--accent)' : 'var(--border)'}`,
                          background: ic === icon ? 'var(--accent-muted)' : 'transparent',
                          cursor: 'pointer',
                        }}
                      >
                        {ic}
                      </button>
                    ))}
                  </div>
                </Field>
              </div>

              {/* Grading type */}
              <Field label="Grading Type">
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['weighted', 'points'] as const).map(gt => (
                    <button
                      key={gt}
                      onClick={() => setGradingType(gt)}
                      style={{
                        flex: 1, padding: '9px', fontSize: 12, fontWeight: 700,
                        border: `1.5px solid ${gradingType === gt ? 'var(--accent)' : 'var(--border-alt)'}`,
                        background: gradingType === gt ? 'var(--accent-muted)' : 'transparent',
                        color: gradingType === gt ? 'var(--accent)' : 'var(--text-secondary)',
                        borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s',
                      }}
                    >
                      {gt === 'weighted' ? '⚖ Weighted' : '🔢 Points'}
                    </button>
                  ))}
                </div>
                <p style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
                  {gradingType === 'weighted'
                    ? 'Categories have weights (e.g. Homework 20%, Midterm 30%). Grade = weighted average.'
                    : 'Points only. Grade = total points earned / total points possible.'}
                </p>
              </Field>

              {/* Target + Credits row */}
              <div style={{ display: 'flex', gap: 12 }}>
                <Field label="Target Grade (%)">
                  <input
                    type="number" min={0} max={100}
                    value={targetGrade}
                    onChange={e => setTargetGrade(Number(e.target.value))}
                    style={{ ...inputStyle, width: '100%' }}
                    onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--border-alt)')}
                  />
                </Field>
                <Field label="Credit Hours">
                  <input
                    type="number" min={1} max={6}
                    value={creditHours}
                    onChange={e => setCreditHours(Number(e.target.value))}
                    style={{ ...inputStyle, width: '100%' }}
                    onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--border-alt)')}
                  />
                </Field>
              </div>
            </div>
          )}

          {tab === 'categories' && (
            <div>
              {gradingType === 'weighted' && (
                <div style={{
                  padding: '8px 12px', borderRadius: 8, marginBottom: 14,
                  background: weightError ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
                  border: `1px solid ${weightError ? '#ef4444' : '#22c55e'}`,
                  fontSize: 12, fontWeight: 600,
                  color: weightError ? '#ef4444' : '#22c55e',
                }}>
                  Total weight: {totalWeight}% {weightError ? `— must equal 100% (${totalWeight > 100 ? 'over' : 'under'} by ${Math.abs(totalWeight - 100)}%)` : '✓'}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {categories.map(cat => (
                  <div key={cat.id} style={{
                    display: 'flex', gap: 8, alignItems: 'center',
                    background: 'var(--bg-secondary)', borderRadius: 10, padding: '10px 12px',
                  }}>
                    <input
                      type="color"
                      value={cat.color}
                      onChange={e => updateCategory(cat.id, 'color', e.target.value)}
                      style={{ width: 28, height: 28, borderRadius: 6, border: 'none', cursor: 'pointer', padding: 0 }}
                    />
                    <input
                      value={cat.name}
                      onChange={e => updateCategory(cat.id, 'name', e.target.value)}
                      style={{
                        flex: 1, background: 'transparent', border: 'none', outline: 'none',
                        color: 'var(--text)', fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
                      }}
                    />
                    {gradingType === 'weighted' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <input
                          type="number" min={0} max={100}
                          value={cat.weight}
                          onChange={e => updateCategory(cat.id, 'weight', Number(e.target.value))}
                          style={{
                            width: 50, background: 'var(--border)', border: 'none',
                            borderRadius: 6, padding: '4px 8px', fontSize: 12,
                            fontWeight: 700, color: 'var(--text)', fontFamily: 'inherit',
                            textAlign: 'right',
                          }}
                        />
                        <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>%</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 10, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>drop</span>
                      <input
                        type="number" min={0} max={5}
                        value={cat.dropLowest}
                        onChange={e => updateCategory(cat.id, 'dropLowest', Number(e.target.value))}
                        style={{
                          width: 34, background: 'var(--border)', border: 'none',
                          borderRadius: 6, padding: '4px 6px', fontSize: 12,
                          fontWeight: 700, color: 'var(--text)', fontFamily: 'inherit',
                          textAlign: 'center',
                        }}
                      />
                    </div>
                    <button
                      onClick={() => removeCategory(cat.id)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--text-tertiary)', padding: 4,
                        display: 'flex', alignItems: 'center',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}
                    >
                      <Trash2 size={13} strokeWidth={2} />
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={addCategory}
                style={{
                  marginTop: 10, width: '100%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '9px', fontSize: 12, fontWeight: 700,
                  background: 'transparent', border: '1.5px dashed var(--border-alt)',
                  borderRadius: 10, cursor: 'pointer', color: 'var(--text-secondary)',
                  transition: 'border-color 0.15s, color 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-alt)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
              >
                <Plus size={13} strokeWidth={2.5} /> Add Category
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 24px',
          borderTop: '1px solid var(--border)',
          display: 'flex', gap: 8,
        }}>
          <button
            onClick={handleSave}
            disabled={!name.trim() || weightError}
            style={{
              flex: 1, padding: '12px', fontSize: 14, fontWeight: 700,
              background: name.trim() && !weightError ? 'var(--accent)' : 'var(--border-alt)',
              color: name.trim() && !weightError ? '#fff' : 'var(--text-tertiary)',
              border: 'none', borderRadius: 10,
              cursor: name.trim() && !weightError ? 'pointer' : 'not-allowed',
              boxShadow: name.trim() ? '0 4px 16px rgba(252,76,2,0.3)' : 'none',
            }}
          >
            Add Course
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '12px 18px', fontSize: 14, fontWeight: 600,
              background: 'transparent', border: '1px solid var(--border-alt)',
              borderRadius: 10, cursor: 'pointer', color: 'var(--text-secondary)',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ flex: 1 }}>
      <label style={{
        display: 'block', marginBottom: 6,
        fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)',
        textTransform: 'uppercase' as const, letterSpacing: '0.07em',
      }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: 'var(--input-bg)',
  border: '1.5px solid var(--border-alt)',
  borderRadius: 10, color: 'var(--text)', fontSize: 13,
  padding: '10px 12px', fontFamily: 'inherit', outline: 'none',
  transition: 'border-color 0.15s',
};
