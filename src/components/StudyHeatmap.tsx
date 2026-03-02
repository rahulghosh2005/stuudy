import { useState } from 'react';
import CalendarHeatmap from 'react-calendar-heatmap';

import { startOfMonth, endOfMonth, subYears, subMonths, addMonths, format } from 'date-fns';

interface StudyHeatmapProps {
  values: Array<{ date: string; count: number }>;
}

const HEATMAP_STYLE = `
  .color-scale-0 { fill: #1a1a1a; }
  .color-scale-1 { fill: #7a2500; }
  .color-scale-2 { fill: #b83800; }
  .color-scale-3 { fill: #e04000; }
  .color-scale-4 { fill: #fc4c02; }
  .react-calendar-heatmap text { fill: #555; font-size: 8px; }
  .react-calendar-heatmap rect:hover { stroke: #fc4c02; stroke-width: 1px; }
`;

// Uses index signature type from react-calendar-heatmap: { date: string; [key: string]: any }
function classForValue(value: { date: string; [key: string]: unknown } | undefined): string {
  const count = value ? (value.count as number | undefined) ?? 0 : 0;
  if (!value || count === 0) return 'color-scale-0';
  if (count < 30) return 'color-scale-1';
  if (count < 60) return 'color-scale-2';
  if (count < 120) return 'color-scale-3';
  return 'color-scale-4';
}

export function StudyHeatmap({ values }: StudyHeatmapProps) {
  const [view, setView] = useState<'year' | 'month'>('year');
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  const startDate = view === 'year'
    ? subYears(new Date(), 1)
    : startOfMonth(selectedMonth);
  const endDate = view === 'year'
    ? new Date()
    : endOfMonth(selectedMonth);

  const pillStyle = (active: boolean) => ({
    padding: '4px 12px',
    borderRadius: 20,
    fontSize: 12,
    border: 'none',
    cursor: 'pointer',
    background: active ? '#fc4c02' : '#1a1a1a',
    color: active ? '#fff' : '#888',
  });

  return (
    <div style={{ background: '#1a1a1a', borderRadius: 12, padding: '16px' }}>
      <style>{HEATMAP_STYLE}</style>

      {/* View toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <button style={pillStyle(view === 'year')} onClick={() => setView('year')}>
          Year
        </button>
        <button style={pillStyle(view === 'month')} onClick={() => setView('month')}>
          Month
        </button>

        {/* Month navigation (only in month view) */}
        {view === 'month' && (
          <>
            <button
              onClick={() => setSelectedMonth(m => subMonths(m, 1))}
              style={{
                background: 'none',
                border: 'none',
                color: '#888',
                cursor: 'pointer',
                fontSize: 16,
                padding: '0 4px',
              }}
            >
              &lt;
            </button>
            <span style={{ color: '#fff', fontSize: 13, minWidth: 90, textAlign: 'center' }}>
              {format(selectedMonth, 'MMM yyyy')}
            </span>
            <button
              onClick={() => setSelectedMonth(m => addMonths(m, 1))}
              style={{
                background: 'none',
                border: 'none',
                color: '#888',
                cursor: 'pointer',
                fontSize: 16,
                padding: '0 4px',
              }}
            >
              &gt;
            </button>
          </>
        )}
      </div>

      <CalendarHeatmap
        startDate={startDate}
        endDate={endDate}
        values={values}
        classForValue={classForValue}
        tooltipDataAttrs={(value: { date: string; [key: string]: unknown } | undefined) => {
          const count = value ? (value.count as number | undefined) ?? 0 : 0;
          return count ? ({ title: `${String(value?.date)}: ${count}m` } as { title: string }) : {};
        }}
        showWeekdayLabels
      />
    </div>
  );
}
