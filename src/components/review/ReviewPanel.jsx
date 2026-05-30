import { useApp } from '../../store/AppContext.jsx';
import Stepper from '../common/Stepper.jsx';
import { SHEET } from '../../lib/sheetLayout.js';
import { LOW_CONFIDENCE } from '../../lib/omr.js';

const METHOD_BADGE = {
  aligned: { cls: 'badge--ok', txt: '🎯 aligned & read' },
  pixel: { cls: 'badge--ok', txt: '🔍 read from pixels' },
  failed: { cls: 'badge--bad', txt: '⚠ not located' },
};

function PartGrid({ title, part, answers, confidence, onSet }) {
  return (
    <div className="card">
      <h3 className="card__title">{title}</h3>
      <div className="answer-grid mt-2">
        {answers.map((chosen, i) => {
          const conf = confidence?.[i] ?? 1;
          const low = conf < LOW_CONFIDENCE || chosen === 'X';
          return (
            <div key={i} className={`qcell ${low ? 'qcell--low' : ''}`}>
              <div className="qcell__head">
                <span className="qcell__num">Q{i + 1}</span>
                {chosen === 'X'
                  ? <span className="conf-pill badge--bad" style={{ padding: '2px 8px' }}>⚠ multi</span>
                  : low ? <span className="conf-pill" style={{ background: 'var(--accent-soft)', color: 'var(--accent-strong)' }}>⚠ review</span>
                    : <span className="conf-pill muted">{Math.round(conf * 100)}%</span>}
              </div>
              <div className="opts">
                {SHEET.options.map((o) => (
                  <button key={o} className={`opt ${chosen === o ? 'opt--on' : ''}`} onClick={() => onSet(part, i, o)}>{o}</button>
                ))}
                <button className={`opt opt--skip ${chosen == null ? 'opt--on' : ''}`} onClick={() => onSet(part, i, null)}>–</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ReviewPanel() {
  const { session, setSession, updateSessionAnswer, goTab, pushToast } = useApp();

  if (!session) {
    return (
      <div className="tab-view">
        <div className="empty">
          <div className="empty__icon">📄</div>
          <p>No sheet in progress. Upload or load one first.</p>
          <button className="btn btn--primary mt-2" onClick={() => goTab('upload')}>Go to Upload</button>
        </div>
      </div>
    );
  }

  const patch = (p) => setSession((s) => ({ ...s, ...p }));
  const badge = METHOD_BADGE[session.method];

  function proceed() {
    if (!session.studentName?.trim() && !session.regNo?.trim()) {
      pushToast({ type: 'error', title: 'Student needed', msg: 'Enter a name or registration number.' });
      return;
    }
    goTab('results');
  }

  return (
    <div className="tab-view">
      <Stepper current={2} />
      <div className="section-head spread">
        <div>
          <h2>Review &amp; correct</h2>
          <p>{session.title} · {session.set} · {session.class} — verify OCR &amp; the detected bubbles.</p>
        </div>
        <div className="row">
          {badge && <span className={`badge ${badge.cls}`}>{badge.txt}</span>}
        </div>
      </div>

      {/* student (OCR) */}
      <div className="card">
        <div className="spread">
          <h3 className="card__title">Student (from OCR)</h3>
          {session.ocrError
            ? <span className="badge badge--bad">OCR unavailable — type manually</span>
            : <span className="badge">OCR confidence {session.ocrConfidence}%</span>}
        </div>
        <div className="grid grid--2 mt-2">
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Name</label>
            <input className="input" value={session.studentName} onChange={(e) => patch({ studentName: e.target.value })} placeholder="Student name" />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Registration #</label>
            <input className="input" value={session.regNo} onChange={(e) => patch({ regNo: e.target.value })} placeholder="FA24-BSE-000" />
          </div>
        </div>
        <p className="card__sub mt-1">New registration numbers are saved to the student roster automatically when you grade.</p>
      </div>

      {/* answers */}
      <div className="grid grid--2">
        <PartGrid title="Part-I" part="part1" answers={session.part1} confidence={session.confidence?.part1} onSet={updateSessionAnswer} />
        <PartGrid title="Part-II" part="part2" answers={session.part2} confidence={session.confidence?.part2} onSet={updateSessionAnswer} />
      </div>

      <div className="row mt-2">
        <button className="btn" onClick={() => goTab('upload')}>← Back</button>
        <button className="btn btn--primary" onClick={proceed}>Grade &amp; view results →</button>
      </div>
    </div>
  );
}
