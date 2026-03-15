import { useEffect, useRef, useState } from 'react';
import { formatElapsed } from '../hooks/useTimer';
import { getSubjects, addSubject } from '../firebase/subjects';
import type { Subject } from '../types/session';
import { BookOpen, MessageSquare, Zap } from 'lucide-react';

interface SessionBottomSheetProps {
  open: boolean;
  elapsed: number;
  uid: string;
  initialSubject?: Subject | null;  // pre-fills from timer's selected subject
  onSave: (subject: Subject | null, notes: string) => Promise<void>;
  onDismiss: () => void;
}

export function SessionBottomSheet({ open, elapsed, uid, initialSubject, onSave, onDismiss }: SessionBottomSheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Subject state (managed here post-session)
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectInput, setSubjectInput] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      if (!dialog.open) dialog.showModal();
      // Pre-fill from timer's selected subject if provided
      if (initialSubject) {
        setSelectedSubject(initialSubject);
        setSubjectInput(initialSubject.name);
      }
      // Load subjects when sheet opens
      getSubjects(uid).then(setSubjects).catch(() => {});
    } else {
      if (dialog.open) dialog.close();
      // Reset all fields
      setNotes('');
      setSubjectInput('');
      setSelectedSubject(null);
      setDropdownOpen(false);
    }
  }, [open, uid, initialSubject]);

  function handleCancel(e: React.SyntheticEvent) {
    e.preventDefault();
    onDismiss();
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      await onSave(selectedSubject, notes);
    } finally {
      setIsSaving(false);
    }
  }

  const filteredSubjects = subjects.filter(s =>
    s.name.toLowerCase().includes(subjectInput.toLowerCase())
  );

  function handleSubjectInput(e: React.ChangeEvent<HTMLInputElement>) {
    setSubjectInput(e.target.value);
    setSelectedSubject(null);
    setDropdownOpen(e.target.value.trim().length > 0);
  }

  async function handleSubjectKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return;
    const trimmed = subjectInput.trim();
    if (!trimmed) return;
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    if (filteredSubjects.length > 0) {
      selectSubject(filteredSubjects[0]);
    } else {
      const newSubject = await addSubject(uid, trimmed);
      setSubjects(prev => [...prev, newSubject]);
      selectSubject(newSubject);
    }
  }

  function selectSubject(subject: Subject) {
    setSelectedSubject(subject);
    setSubjectInput(subject.name);
    setDropdownOpen(false);
  }

  function clearSubject() {
    setSubjectInput('');
    setSelectedSubject(null);
    setDropdownOpen(false);
  }

  return (
    <>
      <style>{`
        dialog.session-sheet {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          width: 100%;
          max-width: 520px;
          margin: 0 auto;
          border: none;
          border-radius: 20px 20px 0 0;
          background: var(--card-alt);
          color: var(--text);
          padding: 0;
          transform: translateY(100%);
          transition: transform 0.35s cubic-bezier(0.32, 0.72, 0, 1);
        }
        dialog.session-sheet[open] {
          transform: translateY(0);
        }
        dialog.session-sheet::backdrop {
          background: rgba(0, 0, 0, 0.65);
          backdrop-filter: blur(4px);
        }
      `}</style>
      <dialog ref={dialogRef} className="session-sheet" onCancel={handleCancel}>

        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 0' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border-alt)' }} />
        </div>

        <div style={{ padding: '20px 24px 32px' }}>

          {/* ── Header ───────────────────────────── */}
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{
              display: 'inline-block',
              fontSize: '11px', fontWeight: 700,
              color: 'var(--accent)',
              letterSpacing: '0.1em', textTransform: 'uppercase',
              background: 'var(--accent-muted)',
              padding: '4px 12px', borderRadius: '100px',
              marginBottom: '10px',
            }}>
              <Zap size={10} strokeWidth={2.5} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />
              Session Complete
            </div>
            <div style={{
              fontSize: '52px', fontWeight: 800,
              letterSpacing: '-0.04em', lineHeight: 1,
              color: 'var(--text)',
            }}>
              {formatElapsed(elapsed)}
            </div>
          </div>

          {/* ── What were you studying? ───────── */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              fontSize: '11px', fontWeight: 700,
              color: 'var(--text-secondary)',
              textTransform: 'uppercase', letterSpacing: '0.07em',
              marginBottom: '7px',
            }}>
              <BookOpen size={11} />
              What were you studying?
            </label>
            <div style={{ position: 'relative' }}>
              <div style={{
                display: 'flex', alignItems: 'center',
                background: 'var(--input-bg)',
                border: `1px solid ${selectedSubject ? 'var(--accent)' : 'var(--border-alt)'}`,
                borderRadius: '10px', padding: '0 12px',
                transition: 'border-color 0.15s',
              }}>
                <input
                  value={subjectInput}
                  onChange={handleSubjectInput}
                  onKeyDown={handleSubjectKeyDown}
                  onFocus={() => { if (subjectInput.trim()) setDropdownOpen(true); }}
                  onBlur={() => { closeTimeoutRef.current = setTimeout(() => setDropdownOpen(false), 150); }}
                  placeholder="e.g. Calculus, Chemistry, History..."
                  style={{
                    flex: 1, background: 'transparent', border: 'none', outline: 'none',
                    color: 'var(--text)', fontSize: '15px', padding: '13px 8px 13px 0',
                    fontFamily: 'inherit',
                  }}
                />
                {subjectInput && (
                  <button
                    onMouseDown={e => { e.preventDefault(); clearSubject(); }}
                    style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0 2px', fontSize: '18px', lineHeight: 1 }}
                  >×</button>
                )}
              </div>
              {dropdownOpen && filteredSubjects.length > 0 && (
                <ul style={{
                  position: 'absolute', top: '100%', left: 0, right: 0,
                  background: 'var(--card)', border: '1px solid var(--border-alt)',
                  borderRadius: '10px', marginTop: '4px', zIndex: 200,
                  listStyle: 'none', padding: '4px', margin: '4px 0 0 0', overflow: 'hidden',
                }}>
                  {filteredSubjects.slice(0, 5).map(s => (
                    <li
                      key={s.id}
                      onMouseDown={() => { if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current); selectSubject(s); }}
                      style={{ padding: '9px 12px', cursor: 'pointer', fontSize: '14px', color: 'var(--text)', borderRadius: '7px' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--border)')}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}
                    >
                      {s.name}
                    </li>
                  ))}
                </ul>
              )}
              {dropdownOpen && filteredSubjects.length === 0 && subjectInput.trim() && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0,
                  background: 'var(--card)', border: '1px solid var(--border-alt)',
                  borderRadius: '10px', marginTop: '4px', zIndex: 200,
                  padding: '10px 14px', fontSize: '13px', color: 'var(--text-secondary)',
                }}>
                  Press Enter to create <strong style={{ color: 'var(--text)' }}>"{subjectInput}"</strong>
                </div>
              )}
            </div>
          </div>

          {/* ── How did it go? ────────────────── */}
          <div style={{ marginBottom: '22px' }}>
            <label style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              fontSize: '11px', fontWeight: 700,
              color: 'var(--text-secondary)',
              textTransform: 'uppercase', letterSpacing: '0.07em',
              marginBottom: '7px',
            }}>
              <MessageSquare size={11} />
              How did it go?
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any notes, reflections, or what you covered..."
              rows={3}
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'var(--input-bg)',
                border: '1px solid var(--border-alt)',
                borderRadius: '10px', color: 'var(--text)',
                fontSize: '15px', padding: '12px',
                resize: 'none', fontFamily: 'inherit', lineHeight: 1.5,
                outline: 'none',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border-alt)')}
            />
          </div>

          {/* ── Action buttons ────────────────── */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleSave}
              disabled={isSaving}
              style={{
                flex: 1, padding: '15px',
                fontSize: '16px', fontWeight: 700,
                border: 'none', borderRadius: '12px',
                background: isSaving ? 'var(--border-alt)' : 'var(--accent)',
                color: isSaving ? 'var(--text-secondary)' : '#fff',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                transition: 'background 0.15s',
                boxShadow: isSaving ? 'none' : '0 4px 16px var(--accent-glow)',
              }}
            >
              {isSaving ? 'Saving...' : 'Save Session'}
            </button>
            <button
              onClick={onDismiss}
              disabled={isSaving}
              style={{
                padding: '15px 20px',
                fontSize: '16px', fontWeight: 600,
                border: '1px solid var(--border-alt)',
                borderRadius: '12px',
                background: 'transparent',
                color: 'var(--text-secondary)',
                cursor: isSaving ? 'not-allowed' : 'pointer',
              }}
            >
              Discard
            </button>
          </div>

        </div>
      </dialog>
    </>
  );
}
