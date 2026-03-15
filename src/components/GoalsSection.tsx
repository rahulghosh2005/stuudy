import { useState, useEffect } from 'react';
import { updateGoals } from '../firebase/users';
import { getSubjects } from '../firebase/subjects';
import type { UserProfile, SubjectGoal } from '../types/user';
import type { Subject } from '../types/session';

// ── GoalRow ──────────────────────────────────────────────────────────────────

interface GoalRowProps {
  label: string;
  sublabel: string;
  enabled: boolean;
  minutes: number;
  maxMinutes: number;
  isSaving: boolean;
  onToggle: (v: boolean) => void;
  onMinutesChange: (v: number) => void;
  onSave: () => void;
}

function GoalRow({ label, sublabel, enabled, minutes, maxMinutes, isSaving, onToggle, onMinutesChange, onSave }: GoalRowProps) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      padding: '12px 0',
      borderBottom: '1px solid var(--border)',
      gap: 12,
    }}>
      <input
        type="checkbox"
        checked={enabled}
        onChange={e => onToggle(e.target.checked)}
        style={{ width: 16, height: 16, accentColor: '#fc4c02', flexShrink: 0, cursor: 'pointer' }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', lineHeight: 1.2 }}>{label}</div>
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1, fontWeight: 500 }}>{sublabel}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: enabled ? 1 : 0.4, transition: 'opacity 0.2s' }}>
        <input
          type="number"
          value={minutes}
          min={1}
          max={maxMinutes}
          disabled={!enabled}
          onChange={e => onMinutesChange(Number(e.target.value))}
          style={{
            width: 72, background: 'var(--bg-secondary)',
            color: 'var(--text)', border: '1px solid var(--border-alt)',
            borderRadius: 8, padding: '6px 8px',
            fontSize: 13, fontWeight: 600, textAlign: 'center',
            outline: 'none', fontFamily: 'inherit',
          }}
        />
        <span style={{ color: 'var(--text-tertiary)', fontSize: 11, fontWeight: 600 }}>min</span>
      </div>
      <button
        onClick={onSave}
        disabled={isSaving || !enabled}
        style={{
          background: enabled ? '#fc4c02' : 'var(--border)',
          color: enabled ? '#fff' : 'var(--text-tertiary)',
          border: 'none', borderRadius: 8,
          padding: '7px 14px', fontSize: 12, fontWeight: 700,
          cursor: (isSaving || !enabled) ? 'not-allowed' : 'pointer',
          opacity: isSaving ? 0.6 : 1,
          transition: 'background 0.15s',
          flexShrink: 0,
        }}
      >
        {isSaving ? '…' : 'Save'}
      </button>
    </div>
  );
}

// ── GoalsSection ─────────────────────────────────────────────────────────────

interface GoalsSectionProps {
  uid: string;
  profile: UserProfile;         // current goal values from Firestore
  onGoalsUpdated: () => void;   // parent re-fetches profile after save
}

export function GoalsSection({ uid, profile, onGoalsUpdated }: GoalsSectionProps) {
  const [dailyEnabled, setDailyEnabled] = useState(profile.dailyGoalEnabled ?? false);
  const [dailyMinutes, setDailyMinutes] = useState(profile.dailyGoalMinutes ?? 60);
  const [weeklyEnabled, setWeeklyEnabled] = useState(profile.weeklyGoalEnabled ?? false);
  const [weeklyMinutes, setWeeklyMinutes] = useState(profile.weeklyGoalMinutes ?? 300);
  const [subjectGoals, setSubjectGoals] = useState<Record<string, { minutes: number; enabled: boolean }>>(
    profile.subjectGoals ?? {}
  );
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isSavingDaily, setIsSavingDaily] = useState(false);
  const [isSavingWeekly, setIsSavingWeekly] = useState(false);
  const [isSavingSubjects, setIsSavingSubjects] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    getSubjects(uid).then(setSubjects).catch(() => {
      // Non-blocking — subject goal rows just won't show if fetch fails
    });
  }, [uid]);

  async function handleSaveDaily() {
    setIsSavingDaily(true);
    setSaveError(null);
    try {
      await updateGoals(uid, { dailyGoalMinutes: dailyMinutes, dailyGoalEnabled: dailyEnabled });
      onGoalsUpdated();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save daily goal');
    } finally {
      setIsSavingDaily(false);
    }
  }

  async function handleSaveWeekly() {
    setIsSavingWeekly(true);
    setSaveError(null);
    try {
      await updateGoals(uid, { weeklyGoalMinutes: weeklyMinutes, weeklyGoalEnabled: weeklyEnabled });
      onGoalsUpdated();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save weekly goal');
    } finally {
      setIsSavingWeekly(false);
    }
  }

  async function handleSaveSubjects() {
    setIsSavingSubjects(true);
    setSaveError(null);
    try {
      const goals: Record<string, SubjectGoal> = {};
      for (const [id, val] of Object.entries(subjectGoals)) {
        goals[id] = { minutes: val.minutes, enabled: val.enabled };
      }
      await updateGoals(uid, { subjectGoals: goals });
      onGoalsUpdated();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save subject goals');
    } finally {
      setIsSavingSubjects(false);
    }
  }

  function setSubjectGoal(id: string, field: 'minutes' | 'enabled', value: number | boolean) {
    setSubjectGoals(prev => ({
      ...prev,
      [id]: {
        minutes: prev[id]?.minutes ?? 60,
        enabled: prev[id]?.enabled ?? false,
        [field]: value,
      },
    }));
  }

  return (
    <div>
      {/* Daily goal */}
      <GoalRow
        label="Daily goal"
        sublabel="Minutes per day"
        enabled={dailyEnabled}
        minutes={dailyMinutes}
        maxMinutes={1440}
        isSaving={isSavingDaily}
        onToggle={setDailyEnabled}
        onMinutesChange={setDailyMinutes}
        onSave={handleSaveDaily}
      />

      {/* Weekly goal */}
      <GoalRow
        label="Weekly goal"
        sublabel="Minutes per week"
        enabled={weeklyEnabled}
        minutes={weeklyMinutes}
        maxMinutes={10080}
        isSaving={isSavingWeekly}
        onToggle={setWeeklyEnabled}
        onMinutesChange={setWeeklyMinutes}
        onSave={handleSaveWeekly}
      />

      {/* Per-subject goals */}
      {subjects.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '16px 0 4px' }}>
            Per Subject
          </div>
          {subjects.map(subject => {
            const goal = subjectGoals[subject.id];
            const enabled = goal?.enabled ?? false;
            const minutes = goal?.minutes ?? 60;
            return (
              <GoalRow
                key={subject.id}
                label={subject.name}
                sublabel="Minutes per day"
                enabled={enabled}
                minutes={minutes}
                maxMinutes={1440}
                isSaving={false}
                onToggle={v => setSubjectGoal(subject.id, 'enabled', v)}
                onMinutesChange={v => setSubjectGoal(subject.id, 'minutes', v)}
                onSave={handleSaveSubjects}
              />
            );
          })}
          {isSavingSubjects && (
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 8, fontWeight: 500 }}>Saving…</div>
          )}
        </div>
      )}

      {/* Error state */}
      {saveError && (
        <p style={{ color: 'var(--error)', fontSize: 13, margin: '12px 0 0' }}>{saveError}</p>
      )}
    </div>
  );
}

