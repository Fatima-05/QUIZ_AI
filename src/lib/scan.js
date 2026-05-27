import { decodeQrFromImage } from './qr.js';
import { parseQuizQr } from './quizQr.js';
import { analyzeSheet } from './omr.js';
import { extractStudentInfo } from './ocr.js';
import { gradeQuiz } from './grade.js';

/**
 * @param img 
 * @param opts 
 * @returns { raw, key, omr, student, report }
 */
export async function scanSheet(img, { ocr = true, onStep } = {}) {

  onStep?.('qr');
  const raw = decodeQrFromImage(img);
  const key = parseQuizQr(raw);

  onStep?.('bubbles');
  const omr = analyzeSheet(img);

  let student = { name: '', regNo: '', confidence: 0, ocrError: null };
  if (ocr && omr.map && omr.method !== 'failed') {
    onStep?.('ocr');
    try {
      student = await extractStudentInfo(omr.canvas, omr.map);
    } catch (e) {
      student = { name: '', regNo: '', confidence: 0, ocrError: String(e?.message || e) };
    }
  }

  let report = null;
  if (key) {
    onStep?.('grade');
    report = gradeQuiz(
      { part1: omr.part1 || [], part2: omr.part2 || [] },
      key.parts,
      key,
    );
  }

  return { raw, key, omr, student, report };
}
