import { useMemo, useState } from 'react';
import { useApp } from '../../store/AppContext.jsx';
import BarChart from './BarChart.jsx';
import { SHEET } from '../../lib/sheetLayout.js';
import { buildCsv, csvFilename, downloadCsv } from '../../lib/csv.js';

const fmtDate = (iso) => { try { return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); } catch { return '—'; } };

export default function DashboardPanel() {
  const { results, quizzes, deleteResult, goTab, pushToast } = useApp();
  const [filter, setFilter] = useState('all'); 

  const sets = useMemo(() => [...new Set(results.map((r) => r.set).filter(Boolean))], [results]);
  const rows = useMemo(() => (filter === 'all' ? results : results.filter((r) => r.set === filter)), [results, filter]);

  const stats = useMemo(() => {
    if (!rows.length) return null;
    const pcts = rows.map((r) => r.percentage);
    return {
      total: rows.length,
      avg: Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length),
      high: Math.max(...pcts), low: Math.min(...pcts),
      passRate: Math.round((rows.filter((r) => r.percentage >= 50).length / rows.length) * 100),
    };
  }, [rows]);

  const distribution = useMemo(() => {
    const buckets = [
      { label: '0–49 (F)',  score: 25, test: (p) => p < 50 },
      { label: '50–64 (D)', score: 55, test: (p) => p >= 50 && p < 65 },
      { label: '65–74 (C)', score: 66, test: (p) => p >= 65 && p < 75 },
      { label: '75–84 (B)', score: 78, test: (p) => p >= 75 && p < 85 },
      { label: '85–100 (A)',score: 99, test: (p) => p >= 85 },
    ];
    return buckets.map((b) => ({ label: b.label, value: rows.filter((r) => b.test(r.percentage)).length, max: rows.length || 1, tone: b.tone }));
  }, [rows]);

  const difficulty = useMemo(() => {
    if (filter === 'all' || !rows.length) return null;
    const quiz = quizzes.find((q) => q.set === filter);
    if (!quiz) return null;
    const out = [];
    ['part1', 'part2'].forEach((part, pi) => {
      quiz.parts[part].forEach((key, i) => {
        const correct = rows.filter((r) => (r[part]?.[i]) === key).length;
        const pct = Math.round((correct / rows.length) * 100);
        out.push({ label: `${pi === 0 ? 'I' : 'II'}-Q${i + 1}`, value: pct, max: 100, display: `${pct}%`, tone: pct >= 70 ? 'ok' : pct < 40 ? 'bad' : undefined });
      });
    });
    return out;
  }, [filter, quizzes, rows]);

  function exportCsv() {
    if (!rows.length) return;
    const title = filter === 'all' ? 'AllQuizzes' : (quizzes.find((q) => q.set === filter)?.title || 'Quiz');
    downloadCsv(csvFilename(title, filter === 'all' ? '' : filter), buildCsv(rows, title));
    pushToast({ type: 'success', title: 'CSV exported', msg: `${rows.length} rows.` });
  }

  return (
    <div className="tab-view">
      <div className="section-head spread">
        <div><h2>Dashboard</h2><p>Analytics across graded sheets.</p></div>
        <div className="row" style={{ alignItems: 'flex-end' }}>
          <div className="field" style={{ marginBottom: 0, minWidth: 180 }}>
            <label htmlFor="ef">Filter by set</label>
            <select id="ef" className="select" value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">All sets</option>
              {sets.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <button className="btn" onClick={exportCsv} disabled={!rows.length}>⬇ Export CSV</button>
        </div>
      </div>

      {!stats ? (
        <div className="empty">
          <div className="empty__icon">📊</div>
          <p>No results yet. Scan a sheet to populate the dashboard.</p>
          <button className="btn btn--primary mt-2" onClick={() => goTab('upload')}>Scan a sheet</button>
        </div>
      ) : (
        <>
          <div className="grid grid--4">
            <div className="stat"><div className="stat__label">Submissions</div><div className="stat__value">{stats.total}</div></div>
            <div className="stat"><div className="stat__label">Average</div><div className="stat__value text-accent">{stats.avg}%</div></div>
            <div className="stat"><div className="stat__label">High / Low</div><div className="stat__value">{stats.high}<span className="muted" style={{ fontSize: 18 }}> / {stats.low}%</span></div></div>
            <div className="stat"><div className="stat__label">Pass rate (≥50%)</div><div className="stat__value text-ok">{stats.passRate}%</div></div>
          </div>

          <div className="grid grid--2 mt-2">
            <div className="card">
              <h3 className="card__title">Score distribution</h3>
              <div className="mt-2"><BarChart rows={distribution} /></div>
            </div>
            <div className="card">
              <h3 className="card__title">Per-question difficulty</h3>
              <p className="card__sub">% correct per question. Low bars = hard questions.</p>
              <div className="mt-2">{difficulty ? <BarChart rows={difficulty} /> : <p className="muted">Pick a single set above to see per-question stats.</p>}</div>
            </div>
          </div>

          <div className="card">
            <h3 className="card__title">Results ({rows.length})</h3>
            <div className="table--scroll mt-2">
              <table className="table">
                <thead><tr><th>Name</th><th>Reg No</th><th>Set</th><th>Marks</th><th>%</th><th>Grade</th><th>C/I/U</th><th>Date</th><th></th></tr></thead>
                <tbody>
                  {[...rows].sort((a, b) => b.percentage - a.percentage).map((r) => (
                    <tr key={r.id}>
                      <td>{r.studentName || '—'}</td>
                      <td className="mono muted">{r.regNo || '—'}</td>
                      <td>{r.set}</td>
                      <td>{r.totalMarks}/{r.maxMarks}</td>
                      <td><b>{r.percentage}%</b></td>
                      <td><span className="badge badge--accent">{r.grade}</span></td>
                      <td className="muted" style={{ fontSize: 12 }}>{r.correct}/{r.incorrect}/{r.unattempted}</td>
                      <td className="muted">{fmtDate(r.gradedAt)}</td>
                      <td><button className="btn btn--sm btn--danger" onClick={() => { deleteResult(r.id); pushToast({ type: 'info', title: 'Result removed' }); }}>✕</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
