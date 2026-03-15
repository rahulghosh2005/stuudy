import { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import type { TooltipContentProps } from 'recharts';
import { BarChart2 } from 'lucide-react';
import { aggregateSessions } from '../hooks/useStats';
import { getSubjects } from '../firebase/subjects';
import type { TimeRange } from '../hooks/useSessions';
import type { SessionDocument, Subject } from '../types/session';

interface StudyChartProps {
  sessions: SessionDocument[];
  timezone: string;
  uid: string;
  onRangeChange?: (range: TimeRange) => void;
  onSubjectChange?: (subjectId: string | null) => void;
}

const RANGES: TimeRange[] = ['1D', '1W', '1M', '3M', 'All'];

function CustomTooltip({ active, payload, label }: TooltipContentProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null;
  const minutes = payload[0].value as number;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px' }}>
      <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: 12 }}>{label}</p>
      <p style={{ color: '#fc4c02', margin: '4px 0 0', fontWeight: 700 }}>
        {hours > 0 ? `${hours}h ${mins}m` : `${mins}m`}
      </p>
    </div>
  );
}

export function StudyChart({ sessions, timezone, uid, onRangeChange, onSubjectChange }: StudyChartProps) {
  const [range, setRange] = useState<TimeRange>('1W');
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  useEffect(() => {
    if (!uid) return;
    getSubjects(uid)
      .then(setSubjects)
      .catch(() => {/* silently fail — subjects dropdown is non-critical */});
  }, [uid]);

  const chartData = aggregateSessions(sessions, range, timezone, subjectId);

  function handleRangeChange(r: TimeRange) {
    setRange(r);
    onRangeChange?.(r);
  }

  function handleSubjectChange(value: string) {
    const id = value === '' ? null : value;
    setSubjectId(id);
    onSubjectChange?.(id);
  }

  return (
    <div>
      {/* Controls: range pills + subject dropdown */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {RANGES.map(r => (
            <button
              key={r}
              onClick={() => handleRangeChange(r)}
              style={{
                padding: '4px 12px',
                borderRadius: 20,
                fontSize: 12,
                border: 'none',
                cursor: 'pointer',
                background: range === r ? '#fc4c02' : 'var(--card)',
                color: range === r ? '#fff' : 'var(--text-secondary)',
              }}
            >
              {r}
            </button>
          ))}
        </div>
        <select
          value={subjectId ?? ''}
          onChange={e => handleSubjectChange(e.target.value)}
          style={{
            background: 'var(--card)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            padding: '4px 8px',
            fontSize: 12,
          }}
        >
          <option value="">All subjects</option>
          {subjects.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {/* Chart or empty state */}
      {chartData.length === 0 ? (
        <div
          style={{
            height: 220,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
          }}
        >
          <div style={{
            width: 44, height: 44,
            background: 'var(--accent-muted)',
            borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <BarChart2 size={20} color="var(--accent)" strokeWidth={1.5} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 3 }}>
              No sessions yet
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 500 }}>
              Start a timer to track your first session
            </div>
          </div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="orangeFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#fc4c02" stopOpacity={0.55} />
                <stop offset="95%" stopColor="#fc4c02" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="label" stroke="transparent" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
            <YAxis stroke="transparent" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
            <Tooltip
              content={CustomTooltip}
              cursor={{ stroke: '#fc4c02', strokeWidth: 1, strokeDasharray: '4 4' }}
            />
            <Area
              type="monotone"
              dataKey="minutes"
              stroke="#fc4c02"
              strokeWidth={2}
              fill="url(#orangeFill)"
              fillOpacity={1}
              dot={false}
              activeDot={{ r: 4, fill: '#fc4c02', stroke: 'var(--bg)', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
