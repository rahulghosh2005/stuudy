import { useState, useEffect } from 'react';
import { updateGoals } from '../firebase/users';
import { getSubjects } from '../firebase/subjects';
import type { UserProfile, SubjectGoal } from '../types/user';
import type { Subject } from '../types/session';

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
    <div style={{ background: '#1a1a1a', borderRadius: 12, padding: '20px', marginTop: 24 }}>
      <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 700, margin: '0 0 16px' }}>Goals</h3>

      {/* Daily goal */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <input
          type="checkbox"
          checked={dailyEnabled}
          onChange={e => setDailyEnabled(e.target.checked)}
          style={{ width: 16, height: 16, accentColor: '#fc4c02' }}
        />
        <span style={{ color: '#fff', fontSize: 14, flex: 1 }}>Daily goal</span>
        <input
          type="number"
          value={dailyMinutes}
          min={1}
          max={1440}
          disabled={!dailyEnabled}
          onChange={e => setDailyMinutes(Number(e.target.value))}
          style={{
            width: 80,
            background: '#0a0a0a',
            color: '#fff',
            border: '1px solid #333',
            borderRadius: 6,
            padding: '4px 8px',
            fontSize: 14,
            opacity: dailyEnabled ? 1 : 0.4,
          }}
        />
        <span style={{ color: '#888', fontSize: 12 }}>min</span>
        <button
          onClick={handleSaveDaily}
          disabled={isSavingDaily}
          style={{
            background: '#fc4c02',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '4px 12px',
            fontSize: 12,
            cursor: isSavingDaily ? 'not-allowed' : 'pointer',
            opacity: isSavingDaily ? 0.6 : 1,
          }}
        >
          Save
        </button>
      </div>

      {/* Weekly goal */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <input
          type="checkbox"
          checked={weeklyEnabled}
          onChange={e => setWeeklyEnabled(e.target.checked)}
          style={{ width: 16, height: 16, accentColor: '#fc4c02' }}
        />
        <span style={{ color: '#fff', fontSize: 14, flex: 1 }}>Weekly goal</span>
        <input
          type="number"
          value={weeklyMinutes}
          min={1}
          max={10080}
          disabled={!weeklyEnabled}
          onChange={e => setWeeklyMinutes(Number(e.target.value))}
          style={{
            width: 80,
            background: '#0a0a0a',
            color: '#fff',
            border: '1px solid #333',
            borderRadius: 6,
            padding: '4px 8px',
            fontSize: 14,
            opacity: weeklyEnabled ? 1 : 0.4,
          }}
        />
        <span style={{ color: '#888', fontSize: 12 }}>min</span>
        <button
          onClick={handleSaveWeekly}
          disabled={isSavingWeekly}
          style={{
            background: '#fc4c02',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '4px 12px',
            fontSize: 12,
            cursor: isSavingWeekly ? 'not-allowed' : 'pointer',
            opacity: isSavingWeekly ? 0.6 : 1,
          }}
        >
          Save
        </button>
      </div>

      {/* Per-subject goals */}
      {subjects.length > 0 && (
        <div>
          <p style={{ color: '#888', fontSize: 13, margin: '0 0 12px' }}>Per-subject goals</p>
          {subjects.map(subject => {
            const goal = subjectGoals[subject.id];
            const enabled = goal?.enabled ?? false;
            const minutes = goal?.minutes ?? 60;
            return (
              <div
                key={subject.id}
                style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}
              >
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={e => setSubjectGoal(subject.id, 'enabled', e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: '#fc4c02' }}
                />
                <span style={{ color: '#fff', fontSize: 14, flex: 1 }}>{subject.name}</span>
                <input
                  type="number"
                  value={minutes}
                  min={1}
                  max={1440}
                  disabled={!enabled}
                  onChange={e => setSubjectGoal(subject.id, 'minutes', Number(e.target.value))}
                  style={{
                    width: 80,
                    background: '#0a0a0a',
                    color: '#fff',
                    border: '1px solid #333',
                    borderRadius: 6,
                    padding: '4px 8px',
                    fontSize: 14,
                    opacity: enabled ? 1 : 0.4,
                  }}
                />
                <span style={{ color: '#888', fontSize: 12 }}>min</span>
              </div>
            );
          })}
          <button
            onClick={handleSaveSubjects}
            disabled={isSavingSubjects}
            style={{
              background: '#fc4c02',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              padding: '6px 16px',
              fontSize: 13,
              cursor: isSavingSubjects ? 'not-allowed' : 'pointer',
              opacity: isSavingSubjects ? 0.6 : 1,
              marginTop: 4,
            }}
          >
            Save subject goals
          </button>
        </div>
      )}

      {/* Error state */}
      {saveError && (
        <p style={{ color: '#e53e3e', fontSize: 13, margin: '12px 0 0' }}>{saveError}</p>
      )}
    </div>
  );
}
