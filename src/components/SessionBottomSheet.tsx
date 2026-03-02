import { useEffect, useRef, useState } from 'react';
import { formatElapsed } from '../hooks/useTimer';
import type { Subject } from '../types/session';

interface SessionBottomSheetProps {
  open: boolean;
  elapsed: number;
  subject: Subject | null;
  onSave: (notes: string) => Promise<void>;
  onDismiss: () => void;
}

export function SessionBottomSheet({ open, elapsed, subject, onSave, onDismiss }: SessionBottomSheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      if (!dialog.open) dialog.showModal();
    } else {
      if (dialog.open) dialog.close();
      setNotes('');
    }
  }, [open]);

  function handleCancel(e: React.SyntheticEvent) {
    e.preventDefault();
    onDismiss();
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      await onSave(notes);
    } finally {
      setIsSaving(false);
    }
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
          max-width: 480px;
          margin: 0 auto;
          border: none;
          border-radius: 16px 16px 0 0;
          background: #1c1c1e;
          color: #fff;
          padding: 24px;
          transform: translateY(100%);
          transition: transform 0.3s ease;
        }
        dialog.session-sheet[open] {
          transform: translateY(0);
        }
        dialog.session-sheet::backdrop {
          background: rgba(0, 0, 0, 0.6);
        }
      `}</style>
      <dialog
        ref={dialogRef}
        className="session-sheet"
        onCancel={handleCancel}
      >
        <p style={{ fontSize: '32px', fontWeight: 700, margin: '0 0 8px 0', textAlign: 'center' }}>
          {formatElapsed(elapsed)}
        </p>
        {subject !== null ? (
          <p style={{ fontSize: '16px', color: '#ccc', textAlign: 'center', margin: '0 0 16px 0' }}>
            {subject.name}
          </p>
        ) : (
          <p style={{ fontSize: '16px', color: '#888', textAlign: 'center', margin: '0 0 16px 0' }}>
            No subject
          </p>
        )}
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (optional)"
          rows={3}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            background: '#2c2c2e',
            border: '1px solid #444',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '15px',
            padding: '10px',
            marginBottom: '16px',
            resize: 'vertical',
          }}
        />
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleSave}
            disabled={isSaving}
            style={{
              flex: 1,
              padding: '14px',
              fontSize: '16px',
              fontWeight: 700,
              border: 'none',
              borderRadius: '10px',
              background: isSaving ? '#555' : '#0a84ff',
              color: '#fff',
              cursor: isSaving ? 'not-allowed' : 'pointer',
            }}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={onDismiss}
            disabled={isSaving}
            style={{
              flex: 1,
              padding: '14px',
              fontSize: '16px',
              fontWeight: 700,
              border: 'none',
              borderRadius: '10px',
              background: '#3a3a3c',
              color: '#fff',
              cursor: isSaving ? 'not-allowed' : 'pointer',
            }}
          >
            Discard
          </button>
        </div>
      </dialog>
    </>
  );
}
