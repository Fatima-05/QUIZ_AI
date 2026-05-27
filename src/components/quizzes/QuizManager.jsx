import { useState } from 'react';
import { useApp } from '../../store/AppContext.jsx';
import { SHEET } from '../../lib/sheetLayout.js';
import { uid } from '../../store/db.js';

const blankDraft = () => ({
  id: uid('Q'),
  title: 'AI Quiz', set: 'Set-A', class: 'BSE-4A', subject: 'Artificial Intelligence',
  timeAllowed: '30 min', marksPerQuestion: 1, negativeMarking: 0,
  parts: { part1: Array(SHEET.qCount).fill('A'), part2: Array(SHEET.qCount).fill('A') },
  _new: true,
});

function KeyEditor({ part, label, arr, onSet }) {
  return (
    <div className="card">
      <h3 className="card__title">{label} answer key</h3>
      <div className="answer-grid mt-2">
        {arr.map((ans, i) => (
          <div key={i} className="qcell">
            <div className="qcell__head"><span className="qcell__num">Q{i + 1}</span></div>
            <div className="opts">
              {SHEET.options.map((o) => (
                <button key={o} className={`opt ${ans === o ? 'opt--on' : ''}`} onClick={() => onSet(part, i, o)}>{o}</button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function QuizManager() {
  const { quizzes, results, saveQuiz, deleteQuiz, resetData, pushToast } = useApp();
  const [draft, setDraft] = useState(null);

  const setField = (f, v) => setDraft((d) => ({ ...d, [f]: v }));
  const setKey = (part, i, val) => setDraft((d) => {
    const parts = { ...d.parts, [part]: [...d.parts[part]] };
    parts[part][i] = val;
    return { ...d, parts };
  });

  function save() {
    if (!draft.title.trim() || !draft.set.trim()) { pushToast({ type: 'error', title: 'Title and set required' }); return; }
    const { _new, ...quiz } = draft;
    saveQuiz({ ...quiz, marksPerQuestion: Number(quiz.marksPerQuestion), negativeMarking: Number(quiz.negativeMarking) });
    pushToast({ type: 'success', title: _new ? 'Quiz created' : 'Quiz updated', msg: `${quiz.title} ${quiz.set}` });
    setDraft(null);
  }

  return (
    <div className="tab-view">
      <div className="section-head spread">
        <div><h2>Quizzes &amp; answer keys</h2><p>Define quizzes (the key is also encoded in each sheet's QR).</p></div>
        <div className="row">
          <button className="btn btn--primary" onClick={() => setDraft(blankDraft())}>+ New quiz</button>
          <button className="btn btn--danger" onClick={resetData} title="Restore seed data">↺ Reset data</button>
        </div>
      </div>

      {draft && (
        <div className="card">
          <h3 className="card__title">{draft._new ? 'New quiz' : `Editing ${draft.title} ${draft.set}`}</h3>
          <div className="grid grid--3 mt-2">
            <div className="field"><label>Title</label><input className="input" value={draft.title} onChange={(e) => setField('title', e.target.value)} /></div>
            <div className="field"><label>Set</label><input className="input" value={draft.set} onChange={(e) => setField('set', e.target.value)} placeholder="Set-A" /></div>
            <div className="field"><label>Class</label><input className="input" value={draft.class} onChange={(e) => setField('class', e.target.value)} /></div>
            <div className="field"><label>Subject</label><input className="input" value={draft.subject} onChange={(e) => setField('subject', e.target.value)} /></div>
            <div className="field"><label>Marks / question</label><input className="input" type="number" min="0" step="0.5" value={draft.marksPerQuestion} onChange={(e) => setField('marksPerQuestion', e.target.value)} /></div>
            <div className="field"><label>Negative marking</label><input className="input" type="number" min="0" step="0.25" value={draft.negativeMarking} onChange={(e) => setField('negativeMarking', e.target.value)} /></div>
          </div>
          <div className="grid grid--2">
            <KeyEditor part="part1" label="Part-I" arr={draft.parts.part1} onSet={setKey} />
            <KeyEditor part="part2" label="Part-II" arr={draft.parts.part2} onSet={setKey} />
          </div>
          <div className="row mt-2">
            <button className="btn btn--primary" onClick={save}>Save quiz</button>
            <button className="btn btn--ghost" onClick={() => setDraft(null)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="grid grid--2">
        {quizzes.map((q) => (
          <div className="card" key={q.id}>
            <div className="spread">
              <div><h3 className="card__title">{q.title} · {q.set}</h3><p className="card__sub">{q.class} · {q.subject}</p></div>
              <span className="badge badge--accent">{results.filter((r) => r.set === q.set).length} graded</span>
            </div>
            <div className="row mt-2" style={{ gap: 6 }}>
              <span className="badge">P1: {q.parts.part1.join('')}</span>
              <span className="badge">P2: {q.parts.part2.join('')}</span>
              {q.negativeMarking > 0 && <span className="badge badge--bad">−{q.negativeMarking}</span>}
            </div>
            <div className="row mt-2">
              <button className="btn btn--sm" onClick={() => setDraft({ ...q, parts: { part1: [...q.parts.part1], part2: [...q.parts.part2] }, _new: false })}>Edit</button>
              <button className="btn btn--sm btn--danger" onClick={() => { deleteQuiz(q.id); pushToast({ type: 'info', title: 'Quiz deleted' }); }}>Delete</button>
            </div>
          </div>
        ))}
        {!quizzes.length && <div className="empty"><div className="empty__icon">🗂️</div><p>No quizzes yet.</p></div>}
      </div>
    </div>
  );
}
