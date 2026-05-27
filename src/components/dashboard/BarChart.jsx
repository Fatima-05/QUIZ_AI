/**
 * Lightweight horizontal bar chart (no chart library).
 * rows: [{ label, value, max, display?, tone? }]  tone: 'ok' | 'bad' | undefined
 */
export default function BarChart({ rows }) {
  if (!rows.length) return <p className="muted">No data.</p>;
  const max = Math.max(1, ...rows.map((r) => r.max ?? r.value));
  return (
    <div className="bar-chart">
      {rows.map((r, i) => {
        const pct = Math.round(((r.value) / (r.max ?? max)) * 100);
        return (
          <div className="bar-row" key={r.label + i}>
            <span className="muted" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.label}</span>
            <span className="bar-track">
              <span
                className={`bar-fill ${r.tone ? `bar-fill--${r.tone}` : ''}`}
                style={{ width: `${Math.max(2, pct)}%` }}
              />
            </span>
            <span style={{ textAlign: 'right', fontWeight: 700 }}>{r.display ?? r.value}</span>
          </div>
        );
      })}
    </div>
  );
}
