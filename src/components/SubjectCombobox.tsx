import { useState, useEffect, useRef } from 'react';
import { getSubjects, addSubject } from '../firebase/subjects';
import { getCourses } from '../firebase/grades';
import { BookOpen, X, ChevronDown, GraduationCap } from 'lucide-react';
import type { Subject } from '../types/session';

interface CourseOption {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface SubjectComboboxProps {
  uid: string;
  onSelect: (subject: Subject | null) => void;
  disabled?: boolean;
}

export function SubjectCombobox({ uid, onSelect, disabled }: SubjectComboboxProps) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Subject | null>(null);
  const [focused, setFocused] = useState(false);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load both subjects and grade courses in parallel
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getSubjects(uid),
      getCourses(uid),
    ]).then(([subjectList, courseList]) => {
      if (!cancelled) {
        setSubjects(subjectList);
        setCourses(courseList.map(c => ({ id: c.id, name: c.name, icon: c.icon, color: c.color })));
        setLoading(false);
      }
    }).catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [uid]);

  const query = inputValue.toLowerCase();

  // Grade courses that match the query (show all when empty)
  const filteredCourses = courses.filter(c =>
    !query || c.name.toLowerCase().includes(query)
  );

  // Previously used subjects, excluding names already covered by courses
  const courseNames = new Set(courses.map(c => c.name.toLowerCase()));
  const filteredSubjects = subjects.filter(s =>
    (!query || s.name.toLowerCase().includes(query)) &&
    !courseNames.has(s.name.toLowerCase())
  );

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setInputValue(val);
    if (val.trim() === '') { setSelected(null); onSelect(null); setOpen(false); }
    else setOpen(true);
  }

  async function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return;
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    if (closeTimeoutRef.current) { clearTimeout(closeTimeoutRef.current); closeTimeoutRef.current = null; }
    if (filteredCourses.length > 0) { selectCourse(filteredCourses[0]); }
    else if (filteredSubjects.length > 0) { selectSubject(filteredSubjects[0]); }
    else {
      const newSubject = await addSubject(uid, trimmed);
      setSubjects(prev => [...prev, newSubject]);
      selectSubject(newSubject);
    }
  }

  function selectSubject(subject: Subject) {
    setSelected(subject); setInputValue(subject.name); setOpen(false); onSelect(subject);
  }

  function selectCourse(course: CourseOption) {
    const asSubject: Subject = { id: course.id, name: course.name };
    setSelected(asSubject); setInputValue(course.name); setOpen(false); onSelect(asSubject);
  }

  function handleBlur() {
    closeTimeoutRef.current = setTimeout(() => { setOpen(false); setFocused(false); }, 150);
  }

  function handleFocus() {
    if (closeTimeoutRef.current) { clearTimeout(closeTimeoutRef.current); closeTimeoutRef.current = null; }
    setFocused(true);
    setOpen(true); // always open on focus — shows all courses even with no input
  }

  function handleClear(e: React.MouseEvent) {
    e.preventDefault();
    setInputValue(''); setSelected(null); setOpen(false); onSelect(null);
    inputRef.current?.focus();
  }

  const hasAnyResults = filteredCourses.length > 0 || filteredSubjects.length > 0;
  const isActive = focused || !!selected;
  const showNewOption = inputValue.trim() && !hasAnyResults;
  const showDropdown = open && !loading;
  const selectedCourse = selected ? courses.find(c => c.id === selected.id) : null;

  return (
    <div style={{ position: 'relative', width: '300px', marginBottom: '28px' }}>
      {/* Input */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        background: 'var(--card)',
        border: `1.5px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: '12px', padding: '0 14px',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        boxShadow: isActive ? '0 0 0 3px var(--accent-glow)' : 'none',
        opacity: disabled ? 0.5 : 1,
      }}>
        {selectedCourse
          ? <span style={{ fontSize: 15, flexShrink: 0 }}>{selectedCourse.icon}</span>
          : <BookOpen size={15} color={isActive ? 'var(--accent)' : 'var(--text-tertiary)'} strokeWidth={2} style={{ flexShrink: 0, transition: 'color 0.15s' }} />
        }
        <input
          ref={inputRef}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={loading ? 'Loading…' : 'What are you studying?'}
          disabled={disabled || loading}
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            color: 'var(--text)', fontSize: '14px',
            fontWeight: selected ? 600 : 400, padding: '12px 0', fontFamily: 'inherit',
          }}
        />
        {inputValue
          ? <button onMouseDown={handleClear} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <X size={14} strokeWidth={2} />
            </button>
          : <ChevronDown size={14} color="var(--text-tertiary)" strokeWidth={2} style={{ flexShrink: 0, opacity: focused ? 1 : 0.5 }} />
        }
      </div>

      {/* Selected badge */}
      {selected && (
        <div style={{
          position: 'absolute', top: '-9px', left: '12px',
          background: selectedCourse ? selectedCourse.color : 'var(--accent)',
          color: '#fff', fontSize: '10px', fontWeight: 700,
          padding: '1px 8px', borderRadius: '100px', letterSpacing: '0.04em',
          textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4,
        }}>
          {selectedCourse && <span style={{ fontSize: 11 }}>{selectedCourse.icon}</span>}
          {selected.name}
        </div>
      )}

      {/* Dropdown */}
      {showDropdown && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
          background: 'var(--card)', border: '1px solid var(--border-alt)',
          borderRadius: '14px', zIndex: 200,
          boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
          overflow: 'hidden', maxHeight: 300, overflowY: 'auto',
        }}>

          {/* Grade Courses */}
          {filteredCourses.length > 0 && (
            <>
              <div style={{ padding: '8px 12px 4px', display: 'flex', alignItems: 'center', gap: 5 }}>
                <GraduationCap size={11} color="var(--accent)" strokeWidth={2.5} />
                <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Grade Courses
                </span>
              </div>
              {filteredCourses.map(course => (
                <div
                  key={course.id}
                  onMouseDown={() => { if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current); selectCourse(course); }}
                  style={{
                    padding: '9px 12px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: selected?.id === course.id ? 'var(--accent-muted)' : 'transparent',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = selected?.id === course.id ? 'var(--accent-muted)' : 'var(--border)')}
                  onMouseLeave={e => (e.currentTarget.style.background = selected?.id === course.id ? 'var(--accent-muted)' : 'transparent')}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                    background: `${course.color}22`, border: `1.5px solid ${course.color}55`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                  }}>
                    {course.icon}
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: 600, flex: 1, color: selected?.id === course.id ? 'var(--accent)' : 'var(--text)' }}>
                    {course.name}
                  </span>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: course.color, flexShrink: 0 }} />
                </div>
              ))}
            </>
          )}

          {/* Previously Used */}
          {filteredSubjects.length > 0 && (
            <>
              {filteredCourses.length > 0 && <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />}
              <div style={{ padding: '6px 12px 4px' }}>
                <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Previously Used
                </span>
              </div>
              {filteredSubjects.slice(0, 5).map(s => (
                <div
                  key={s.id}
                  onMouseDown={() => { if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current); selectSubject(s); }}
                  style={{
                    padding: '9px 12px 9px 40px', cursor: 'pointer',
                    fontSize: '14px', fontWeight: 500,
                    color: s.id === selected?.id ? 'var(--accent)' : 'var(--text)',
                    background: s.id === selected?.id ? 'var(--accent-muted)' : 'transparent',
                    transition: 'background 0.1s',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = s.id === selected?.id ? 'var(--accent-muted)' : 'var(--border)')}
                  onMouseLeave={e => (e.currentTarget.style.background = s.id === selected?.id ? 'var(--accent-muted)' : 'transparent')}
                >
                  <BookOpen size={13} color="var(--text-tertiary)" strokeWidth={1.8} style={{ flexShrink: 0 }} />
                  {s.name}
                </div>
              ))}
            </>
          )}

          {/* Create new */}
          {showNewOption && (
            <div style={{ padding: '9px 12px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              Press <kbd style={{ background: 'var(--border)', borderRadius: '4px', padding: '1px 5px', fontSize: '11px', fontFamily: 'inherit' }}>Enter</kbd>{' '}
              to create <strong style={{ color: 'var(--text)' }}>"{inputValue}"</strong>
            </div>
          )}

          {/* Empty state */}
          {!hasAnyResults && !showNewOption && (
            <div style={{ padding: '14px 12px', fontSize: '13px', color: 'var(--text-tertiary)', textAlign: 'center' }}>
              No courses found. Type to create a subject.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
