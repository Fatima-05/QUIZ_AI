import { useMemo, useState } from 'react';
import { useApp } from '../../store/AppContext.jsx';
import Stepper from '../common/Stepper.jsx';
import { gradeQuiz } from '../../lib/grade.js';
import { uid } from '../../store/db.js';

const ICON = { correct: '✓', incorrect: '✗', unattempted: '–', invalid: '⚠' };
const CLS = { correct: 'qresult--correct', incorrect: 'qresult--wrong', unattempted: 'qresult--skipped', invalid: 'qresult--wrong' };

export default function ResultsPanel() {
  const { session, goTab, saveResult, upsertStudentByReg, clearSession, pushToast } = useApp();
  const [saved, setSaved] = useState(false);

  const report = useMemo(
    () => (session?.quizKey ? gradeQuiz({ part1: session.part1, part2: session.part2 }, session.quizKey.parts, session.quizKey) : null),
    [session],
  );

  if (!session || !report) {
    return (
      <div className="tab-view">
        <div className="empty">
          <div className="empty__icon">🧮</div>
          <p>Nothing to grade yet.</p>
          <button className="btn btn--primary mt-2" onClick={() => goTab('upload')}>Go to Upload</button>
        </div>
      </div>
    );
  }

  function handleSave() {
    const student = upsertStudentByReg(session.regNo, session.studentName, session.class);
    const record = {
      id: uid('R'),
      quizId: session.quizKey.set ? `${session.title}-${session.set}` : 'quiz',
      set: session.set, class: session.class, subject: session.subject,
      studentId: student?.id, studentName: session.studentName || student?.name || '', regNo: session.regNo,
      part1: session.part1, part2: session.part2,
      correct: report.correct, incorrect: report.incorrect, unattempted: report.unattempted,
      totalMarks: report.totalMarks, maxMarks: report.maxMarks, percentage: report.percentage, grade: report.grade,
      flags: report.flags,
      source: session.source,
      gradedAt: new Date().toISOString(),
    };
    saveResult(record);
    setSaved(true);
    pushToast({ type: 'success', title: 'Result saved', msg: `${record.studentName || record.regNo || 'student'} · ${report.percentage}%` });
  }

  const p1 = report.perQuestion.filter((q) => q.part === 'part1');
  const p2 = report.perQuestion.filter((q) => q.part === 'part2');

  return (
    <div className="tab-view">
      <Stepper current={3} />
      <div className="section-head">
        <h2>Results</h2>
        <p>{session.studentName || 'Unknown'} · {session.regNo || '—'} · {session.title} {session.set}</p>
      </div>

      <div className="card">
        <div className="score-hero">
          <div className="score-ring" style={{ '--pct': report.percentage }}>
            <div className="score-ring__inner"><div>
              <div className="score-ring__pct">{report.percentage}%</div>
              <div className="score-ring__lbl">grade {report.grade}</div>
            </div></div>
          </div>
          <div className="flex-1">
            <div style={{ fontSize: 28, fontWeight: 800 }}>{report.totalMarks} <span className="muted" style={{ fontSize: 18 }}>/ {report.maxMarks} marks</span></div>
            <div className="grid grid--3 mt-2">
              <div className="stat"><div className="stat__label">Correct</div><div className="stat__value text-ok">{report.correct}</div></div>
              <div className="stat"><div className="stat__label">Incorrect</div><div className="stat__value text-bad">{report.incorrect}</div></div>
              <div className="stat"><div className="stat__label">Unattempted</div><div className="stat__value muted">{report.unattempted}</div></div>
            </div>
            {report.flags.length > 0 && (
              <div className="badge badge--bad mt-2">⚠ {report.flags.join(' · ')}</div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid--2">
        {[['Part-I', p1], ['Part-II', p2]].map(([title, list]) => (
          <div className="card" key={title}>
            <h3 className="card__title">{title}</h3>
            <div className="stack mt-2" style={{ gap: 6 }}>
              {list.map((q) => (
                <div key={q.q} className={`qresult ${CLS[q.status]}`}>
                  <span className="qresult__n">Q{q.q}</span>
                  <span className="qresult__icon">{ICON[q.status]}</span>
                  <span className="flex-1">Marked <b>{q.chosen ?? '–'}</b>{q.status !== 'correct' && <span className="muted"> · key {q.correct}</span>}</span>
                  <span className={`badge badge--${q.status === 'correct' ? 'ok' : q.status === 'unattempted' ? 'skip' : 'bad'}`}>{q.status}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="row mt-2">
        <button className="btn" onClick={() => goTab('review')}>← Back to review</button>
        {!saved
          ? <button className="btn btn--primary" onClick={handleSave}>💾 Save result</button>
          : <>
              <span className="badge badge--ok">✓ Saved</span>
              <button className="btn" onClick={() => goTab('dashboard')}>View dashboard →</button>
              <button className="btn btn--ghost" onClick={() => { clearSession(); setSaved(false); goTab('upload'); }}>Grade another</button>
            </>}
      </div>
    </div>
  );
}
