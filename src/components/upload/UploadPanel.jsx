import { useMemo, useState } from 'react';
import { useApp } from '../../store/AppContext.jsx';
import Stepper from '../common/Stepper.jsx';
import Dropzone from './Dropzone.jsx';
import { loadImage } from '../../lib/qr.js';
import { scanSheet } from '../../lib/scan.js';
import { generateBlankSheet, generateFilledSheet, generateBatchTestSheets, generateQrTag } from '../../lib/sampleSheet.js';

function downloadDataUrl(dataUrl, filename) {
  const a = document.createElement('a');
  a.href = dataUrl; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const STEP_LABEL = {
  qr: 'Decoding answer-key QR…',
  bubbles: 'Reading bubbles…',
  ocr: 'Reading student info (OCR)…',
  grade: 'Grading…',
};

export default function UploadPanel() {
  const { quizzes, students, setSession, goTab, pushToast, setBusy } = useApp();
  const [quizId, setQuizId] = useState(quizzes[0]?.id ?? '');
  const [preview, setPreview] = useState(null);
  const [showGen, setShowGen] = useState(false);
  const [sample, setSample] = useState(null);

  const quiz = useMemo(() => quizzes.find((q) => q.id === quizId), [quizzes, quizId]);

  /** Build a Review session from a scan result. */
  function sessionFromScan(scan, imageUrl, source) {
    const { key, omr, student, report } = scan;
    return {
      quizKey: key,
      title: key.title, set: key.set, class: key.class, subject: key.subject,
      part1: omr.part1 || Array(8).fill(null),
      part2: omr.part2 || Array(8).fill(null),
      confidence: omr.confidence || { part1: [], part2: [] },
      method: omr.method,
      qrFound: !!scan.raw,
      studentName: student.name || '',
      regNo: student.regNo || '',
      ocrConfidence: student.confidence || 0,
      ocrError: student.ocrError || null,
      report,
      imageUrl,
      source,
    };
  }

  async function runScan(img, imageUrl, source) {
    const scan = await scanSheet(img, { onStep: (s) => setBusy(STEP_LABEL[s]) });
    if (!scan.key) {
      pushToast({ type: 'error', title: 'No answer-key QR', msg: 'This sheet has no readable answer-key QR — cannot grade.' });
      return false;
    }
    if (scan.omr.method === 'failed') {
      pushToast({ type: 'error', title: 'Sheet not located', msg: 'Could not find the corner marks. Use a flatter, fuller scan.' });
    }
    setSession(sessionFromScan(scan, imageUrl, source));
    const ocrMsg = scan.student.ocrError
      ? 'OCR unavailable — enter the student in Review.'
      : `Student: ${scan.student.name || '—'} (${scan.student.regNo || '—'}). Verify in Review.`;
    pushToast({ type: 'success', title: 'Scanned', msg: ocrMsg });
    goTab('review');
    return true;
  }

  async function handleFile(file) {
    setBusy('Reading image…');
    try {
      const { img, url } = await loadImage(file);
      setPreview(url);
      await runScan(img, url, 'upload');
    } catch (e) {
      pushToast({ type: 'error', title: 'Could not process image', msg: String(e.message || e) });
    } finally { setBusy(null); }
  }

  async function handleDemo() {
    if (!quiz) { pushToast({ type: 'error', title: 'Pick a quiz first' }); return; }
    setBusy('Building demo sheet…');
    try {
      const { dataUrl } = await generateFilledSheet(quiz, { studentName: 'Demo Student', regNo: '2022-BSE-099' });
      const { img, url } = await loadImage(dataUrl);
      setPreview(url);
      await runScan(img, url, 'demo');
    } finally { setBusy(null); }
  }

  async function genBlank() {
    if (!quiz) return;
    setBusy('Generating blank sheet…');
    try { const out = await generateBlankSheet(quiz); setSample({ ...out, kind: 'blank' }); }
    finally { setBusy(null); }
  }
  async function genFilled() {
    if (!quiz) return;
    setBusy('Generating test sheet (handwritten name)…');
    try {
      // pick a random student from the roster, fallback to a synthetic one
      const pick = students[Math.floor(Math.random() * students.length)]
        ?? { name: 'Test Student', regNo: '2022-BSE-100' };
      const out = await generateFilledSheet(quiz, { studentName: pick.name, regNo: pick.regNo });
      setSample({ ...out, kind: 'filled', studentName: pick.name, regNo: pick.regNo });
    }
    finally { setBusy(null); }
  }

  /** Download N varied test sheets — each with a different handwritten student. */
  async function genBatch() {
    if (!quiz) return;
    const count = 5;
    setBusy(`Generating ${count} test sheets…`);
    try {
      const sheets = await generateBatchTestSheets(quiz, { count, students });
      for (let i = 0; i < sheets.length; i += 1) {
        const s = sheets[i];
        const safeReg = (s.regNo || `student-${i + 1}`).replace(/[^A-Za-z0-9-]/g, '');
        downloadDataUrl(s.dataUrl, `sheet-${quiz.id}-${safeReg}.png`);
        await wait(250); // gap so the browser allows successive downloads
      }
      pushToast({
        type: 'success',
        title: `${sheets.length} test sheets downloaded`,
        msg: 'Drop them into the Batch tab to grade them all.',
      });
    } finally { setBusy(null); }
  }

  async function genQrTag() {
    if (!quiz) return;
    const { dataUrl } = await generateQrTag(quiz);
    downloadDataUrl(dataUrl, `qr-${quiz.id}.png`);
    pushToast({ type: 'success', title: 'QR tag downloaded' });
  }
  async function useSample() {
    if (!sample) return;
    setBusy('Reading image…');
    try { const { img, url } = await loadImage(sample.dataUrl); setPreview(url); await runScan(img, url, 'generated'); }
    finally { setBusy(null); }
  }

  return (
    <div className="tab-view">
      <Stepper current={1} />
      <div className="section-head">
        <h2>Scan a quiz sheet</h2>
        <p>The QR holds the answer key &amp; quiz info; the student's name/reg are read by OCR; bubbles are read for Part-I &amp; Part-II.</p>
      </div>

      <div className="grid grid--2">
        <div className="card">
          <h3 className="card__title">Quiz (for generating sheets)</h3>
          <p className="card__sub">Uploaded sheets are graded against their own QR key — this picker is only for generating sheets/demo.</p>
          <div className="field mt-2">
            <label htmlFor="quiz">Quiz</label>
            <select id="quiz" className="select" value={quizId} onChange={(e) => setQuizId(e.target.value)}>
              {quizzes.map((q) => <option key={q.id} value={q.id}>{q.title} · {q.set}</option>)}
            </select>
          </div>
          {quiz && (
            <div className="row" style={{ gap: 8 }}>
              <span className="badge badge--accent">{quiz.class}</span>
              <span className="badge">{quiz.subject}</span>
              <span className="badge">16 questions</span>
              {quiz.negativeMarking > 0 && <span className="badge badge--bad">−{quiz.negativeMarking}</span>}
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="card__title">Provide a sheet</h3>
          <p className="card__sub">Drop a scan/photo, or use a shortcut.</p>
          <div className="mt-2"><Dropzone onFile={handleFile} disabled={false} /></div>
          {preview && <img src={preview} alt="sheet" className="preview-img mt-2" />}
          <div className="row mt-2">
            <button className="btn btn--primary" onClick={handleDemo}>▶ Load Demo</button>
            <button className="btn btn--ghost" onClick={() => setShowGen((v) => !v)}>🧾 {showGen ? 'Hide' : 'Generate'} sheets</button>
          </div>
        </div>
      </div>

      {showGen && (
        <div className="card">
          <h3 className="card__title">Generate sheets &amp; QR tag</h3>
          <p className="card__sub">
            <b>Blank</b> = print &amp; hand-fill (no student name). <b>Test</b> = one sheet, name/reg drawn in a <i>handwritten style</i> for OCR testing.
            <b> Batch (×5)</b> = five sheets with different students &amp; different "hands" — download them all, then drop the folder into the <b>Batch</b> tab. Every sheet has the answer-key QR + corner marks.
          </p>
          <div className="row mt-2">
            <button className="btn btn--primary" onClick={genBlank}>Generate blank</button>
            <button className="btn" onClick={genFilled}>Generate test sheet</button>
            <button className="btn" onClick={genBatch}>⬇ Batch (×5)</button>
            <button className="btn btn--ghost" onClick={genQrTag}>🏷️ QR tag</button>
          </div>
          {sample && (
            <div className="mt-2">
              <img src={sample.dataUrl} alt="generated sheet" className="preview-img" />
              <div className="row mt-2">
                <a className="btn" href={sample.dataUrl} download={`${sample.kind}-${quiz?.id}.png`}>⬇ Download PNG</a>
                {sample.kind === 'filled' && <button className="btn btn--primary" onClick={useSample}>Use this sheet now →</button>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
