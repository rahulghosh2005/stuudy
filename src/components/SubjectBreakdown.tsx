interface SubjectBreakdownProps {
  breakdown: Array<{ subjectId: string | null; subject: string; minutes: number }>;
  totalMinutes: number;
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function SubjectBreakdown({ breakdown, totalMinutes }: SubjectBreakdownProps) {
  if (breakdown.length === 0) {
    return (
      <div style={{ color: '#555', fontSize: 14, textAlign: 'center', padding: '16px 0' }}>
        No sessions yet
      </div>
    );
  }

  return (
    <div>
      {breakdown.map(item => (
        <div key={item.subjectId ?? '__none__'} style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ color: '#fff', fontSize: 14 }}>{item.subject}</span>
            <span style={{ color: '#888', fontSize: 13 }}>{formatDuration(item.minutes)}</span>
          </div>
          <div style={{ background: '#0a0a0a', borderRadius: 3, height: 4 }}>
            <div
              style={{
                background: '#fc4c02',
                borderRadius: 3,
                height: 4,
                width: totalMinutes > 0
                  ? `${Math.round((item.minutes / totalMinutes) * 100)}%`
                  : '0%',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
