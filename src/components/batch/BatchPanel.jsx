import { useRef, useState } from 'react';
import { useApp } from '../../store/AppContext.jsx';
import { loadImage } from '../../lib/qr.js';
import { scanSheet } from '../../lib/scan.js';
import { buildCsv, csvFilename, downloadCsv } from '../../lib/csv.js';
import { uid } from '../../store/db.js';

const STATUS = {
  ok: { cls: 'badge--ok', txt: 'graded' },
  noqr: { cls: 'badge--bad', txt: 'no QR' },
  failed: { cls: 'badge--bad', txt: 'not located' },
  error: { cls: 'badge--bad', txt: 'error' },
};

export default function BatchPanel() {
  const { saveResult, upsertStudentByReg, pushToast, goTab } = useApp();
  const inputRef = useRef(null);
  const [rows, setRows] = useState([]);      
  const [progress, setProgress] = useState(null); 
  const [active, setActive] = useState(false);

  async function processFiles(fileList) {
    const files = [...fileList].filter((f) => f.type.startsWith('image/'));
    if (!files.length) return;
    setRows([]);
    setProgress({ done: 0, total: files.length });
    const collected = [];

    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      let row;
      try {
        const { img } = await loadImage(file);
        const scan = await scanSheet(img, { ocr: true });
        if (!scan.key) {
          row = { file: file.name, status: 'noqr' };
        } else if (scan.omr.method === 'failed' || !scan.report) {
          row = { file: file.name, status: 'failed', set: scan.key.set };
        } else {
          const student = upsertStudentByReg(scan.student.regNo, scan.student.name, scan.key.class);
          const record = {
            id: uid('R'),
            quizId: `${scan.key.title}-${scan.key.set}`,
            set: scan.key.set, class: scan.key.class, subject: scan.key.subject,
            studentId: student?.id, studentName: scan.student.name || student?.name || '', regNo: scan.student.regNo || '',
            part1: scan.omr.part1, part2: scan.omr.part2,
            correct: scan.report.correct, incorrect: scan.report.incorrect, unattempted: scan.report.unattempted,
            totalMarks: scan.report.totalMarks, maxMarks: scan.report.maxMarks,
            percentage: scan.report.percentage, grade: scan.report.grade,
            flags: scan.report.flags, source: 'batch', gradedAt: new Date().toISOString(),
          };
          saveResult(record);
          collected.push(record);
          row = { file: file.name, status: 'ok', record, name: record.studentName, regNo: record.regNo, set: record.set, pct: record.percentage, grade: record.grade };
        }
      } catch (e) {
        row = { file: file.name, status: 'error', msg: String(e?.message || e) };
      }
      setRows((r) => [...r, row]);
      setProgress({ done: i + 1, total: files.length });
    }

    setProgress(null);
    pushToast({ type: 'success', title: 'Batch complete', msg: `${collected.length}/${files.length} graded & saved.` });
  }

  function exportCsv() {
    const records = rows.filter((r) => r.status === 'ok').map((r) => r.record);
    if (!records.length) { pushToast({ type: 'error', title: 'Nothing to export' }); return; }
    const title = records[0].quizId?.split('-')[0] || 'Quiz';
    downloadCsv(csvFilename(title, records[0].set), buildCsv(records, title));
    pushToast({ type: 'success', title: 'CSV exported', msg: `${records.length} rows + summary.` });
  }

  const okCount = rows.filter((r) => r.status === 'ok').length;

  return (
    <div className="tab-view">
      <div className="section-head spread">
        <div><h2>Batch processing</h2><p>Drop many quiz scans — each is read (QR key + OCR student + bubbles), graded, and saved. Export one CSV.</p></div>
        <button className="btn btn--primary" onClick={exportCsv} disabled={!okCount}>⬇ Export CSV ({okCount})</button>
      </div>

      <div
        className={`dropzone ${active ? 'dropzone--active' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setActive(true); }}
        onDragLeave={() => setActive(false)}
        onDrop={(e) => { e.preventDefault(); setActive(false); processFiles(e.dataTransfer.files); }}
        role="button" tabIndex={0}
      >
        <div className="dropzone__icon" aria-hidden>🗂️</div>
        <div style={{ fontWeight: 600 }}>Drop multiple quiz sheets here</div>
        <div className="dropzone__hint">or click to browse — PNG / JPG (at least 5 for the assignment)</div>
        <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={(e) => processFiles(e.target.files)} />
      </div>

      {progress && (
        <div className="card mt-2">
          <div className="row"><span className="loader" /> <span>Processing {progress.done}/{progress.total}…</span></div>
          <div className="bar-track mt-1" style={{ height: 10 }}>
            <div className="bar-fill" style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }} />
          </div>
          <p className="card__sub mt-1">OCR runs per sheet — the first sheet is slower while the model loads.</p>
        </div>
      )}

      {rows.length > 0 && (
        <div className="card">
          <div className="spread"><h3 className="card__title">Processed ({rows.length})</h3>
            <button className="btn btn--sm" onClick={() => goTab('dashboard')}>Open dashboard →</button>
          </div>
          <div className="table--scroll mt-2">
            <table className="table">
              <thead><tr><th>File</th><th>Status</th><th>Name</th><th>Reg No</th><th>Set</th><th>%</th><th>Grade</th></tr></thead>
              <tbody>
                {rows.map((r, i) => {
                  const st = STATUS[r.status] ?? STATUS.error;
                  return (
                    <tr key={i}>
                      <td className="mono" style={{ fontSize: 12 }}>{r.file}</td>
                      <td><span className={`badge ${st.cls}`}>{st.txt}</span></td>
                      <td>{r.name || '—'}</td>
                      <td className="mono muted">{r.regNo || '—'}</td>
                      <td>{r.set || '—'}</td>
                      <td>{r.pct != null ? `${r.pct}%` : '—'}</td>
                      <td>{r.grade ? <span className="badge badge--accent">{r.grade}</span> : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
