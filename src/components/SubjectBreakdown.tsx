interface SubjectBreakdownProps {
  breakdown: Array<{ subjectId: string | null; subject: string; minutes: number }>;
  totalMinutes: number;
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

const SUBJECT_COLORS = [
  '#fc4c02', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899',
];

export function SubjectBreakdown({ breakdown, totalMinutes }: SubjectBreakdownProps) {
  if (breakdown.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 3 }}>
          No data yet
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 500 }}>
          Subject breakdown will appear after your first session
        </div>
      </div>
    );
  }

  return (
    <div>
      {breakdown.map((item, index) => {
        const pct = totalMinutes > 0 ? Math.round((item.minutes / totalMinutes) * 100) : 0;
        const color = SUBJECT_COLORS[index % SUBJECT_COLORS.length];
        return (
          <div key={item.subjectId ?? '__none__'} style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                <span style={{ color: 'var(--text)', fontSize: 13, fontWeight: 600 }}>{item.subject}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: 'var(--text-tertiary)', fontSize: 11, fontWeight: 600 }}>{pct}%</span>
                <span style={{ color: 'var(--accent)', fontSize: 12, fontWeight: 700 }}>{formatDuration(item.minutes)}</span>
              </div>
            </div>
            <div style={{ background: 'var(--border)', borderRadius: 100, height: 5, overflow: 'hidden' }}>
              <div
                style={{
                  background: color,
                  borderRadius: 100,
                  height: 5,
                  width: `${pct}%`,
                  transition: 'width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
