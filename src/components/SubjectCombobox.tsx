import { useState, useEffect, useRef } from 'react';
import { getSubjects, addSubject } from '../firebase/subjects';
import type { Subject } from '../types/session';

interface SubjectComboboxProps {
  uid: string;
  onSelect: (subject: Subject | null) => void;
  disabled?: boolean;
}

export function SubjectCombobox({ uid, onSelect, disabled }: SubjectComboboxProps) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Subject | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getSubjects(uid).then((list) => {
      if (!cancelled) {
        setSubjects(list);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [uid]);

  const filtered = subjects.filter((s) =>
    s.name.toLowerCase().includes(inputValue.toLowerCase())
  );

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setInputValue(val);
    if (val.trim() === '') {
      setSelected(null);
      onSelect(null);
      setOpen(false);
    } else {
      setOpen(true);
    }
  }

  async function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return;
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    // Cancel any pending blur close
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }

    if (filtered.length > 0) {
      // Select top match
      selectSubject(filtered[0]);
    } else {
      // Create new subject
      const newSubject = await addSubject(uid, trimmed);
      setSubjects((prev) => [...prev, newSubject]);
      selectSubject(newSubject);
    }
  }

  function selectSubject(subject: Subject) {
    setSelected(subject);
    setInputValue(subject.name);
    setOpen(false);
    onSelect(subject);
  }

  function handleBlur() {
    closeTimeoutRef.current = setTimeout(() => {
      setOpen(false);
    }, 150);
  }

  function handleFocus() {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    if (inputValue.trim()) setOpen(true);
  }

  function handleClear() {
    setInputValue('');
    setSelected(null);
    setOpen(false);
    onSelect(null);
  }

  function handleItemMouseDown(subject: Subject) {
    // mousedown fires before blur — cancel the blur close
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    selectSubject(subject);
  }

  const wrapperStyle: React.CSSProperties = {
    position: 'relative',
    width: '280px',
    marginBottom: '16px',
  };

  const inputWrapStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    background: '#222',
    border: '1px solid #444',
    borderRadius: '8px',
    padding: '0 8px',
  };

  const inputStyle: React.CSSProperties = {
    flex: 1,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: '#fff',
    fontSize: '16px',
    padding: '10px 4px',
  };

  const clearBtnStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    color: '#888',
    cursor: 'pointer',
    fontSize: '18px',
    lineHeight: 1,
    padding: '0 4px',
  };

  const dropdownStyle: React.CSSProperties = {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    background: '#2a2a2a',
    border: '1px solid #444',
    borderRadius: '8px',
    marginTop: '4px',
    zIndex: 100,
    listStyle: 'none',
    padding: 0,
    margin: '4px 0 0 0',
    overflow: 'hidden',
  };

  const optionStyle: React.CSSProperties = {
    padding: '10px 12px',
    cursor: 'pointer',
    color: '#fff',
    fontSize: '15px',
  };

  return (
    <div
      role="combobox"
      aria-expanded={open}
      aria-haspopup="listbox"
      style={wrapperStyle}
    >
      <div style={inputWrapStyle}>
        <input
          style={inputStyle}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={loading ? 'Loading subjects...' : 'Subject (optional)'}
          disabled={disabled || loading}
          aria-autocomplete="list"
          aria-controls="subject-listbox"
        />
        {(inputValue || selected) && (
          <button
            style={clearBtnStyle}
            onMouseDown={(e) => { e.preventDefault(); handleClear(); }}
            aria-label="Clear subject"
            tabIndex={-1}
          >
            ×
          </button>
        )}
      </div>
      {open && filtered.length > 0 && (
        <ul
          id="subject-listbox"
          role="listbox"
          style={dropdownStyle}
        >
          {filtered.map((subject) => (
            <li
              key={subject.id}
              role="option"
              aria-selected={selected?.id === subject.id}
              style={optionStyle}
              onMouseDown={() => handleItemMouseDown(subject)}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLLIElement).style.background = '#333';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLLIElement).style.background = '';
              }}
            >
              {subject.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
