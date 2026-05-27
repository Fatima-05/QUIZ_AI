import path from 'node:path';
import jsQR from 'jsqr';
import { decode } from './_img.mjs';
import { parseQuizQr } from '../src/lib/quizQr.js';
import { buildMapper, readSheetBuffer } from '../src/lib/omrCore.js';
import { gradeQuiz } from '../src/lib/grade.js';
import { ocrStudent } from './_ocr.mjs';

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--'));
const useOcr = args.includes('--ocr');
if (!file) { console.error('Usage: npm run grade <image> [--ocr]'); process.exit(1); }

const { data, width, height } = decode(path.resolve(file));
console.log(`\nImage : ${file}  (${width}×${height})`);

const qr = parseQuizQr((jsQR(data, width, height, { inversionAttempts: 'attemptBoth' }) || {}).data);
if (!qr) { console.error('No answer-key QR found.'); process.exit(2); }
console.log(`Quiz  : ${qr.title} ${qr.set}  (${qr.class} · ${qr.subject})`);

const mapper = buildMapper(data, width, height);
if (!mapper) { console.error('Could not locate the sheet (corner marks).'); process.exit(3); }
const omr = readSheetBuffer(data, width, height, mapper);
console.log(`Method: ${omr.method}`);

if (useOcr) {
  try {
    const s = await ocrStudent(data, width, height, mapper.map);
    console.log(`Student (OCR): ${s.name || '—'}  |  ${s.regNo || '—'}`);
  } catch (e) { console.log(`OCR  : unavailable (${e.message})`); }
}

const report = gradeQuiz({ part1: omr.part1, part2: omr.part2 }, qr.parts, qr);
const icon = { correct: '✓', incorrect: '✗', unattempted: '–', invalid: '⚠' };
console.log('\nPart  Q   detected  key  result');
report.perQuestion.forEach((q) => {
  console.log(`  ${q.part === 'part1' ? 'I ' : 'II'}  Q${q.q}   ${String(q.chosen ?? '—').padEnd(6)} ${q.correct}    ${icon[q.status]} ${q.status}`);
});
console.log('\n────────────────────────────────────');
console.log(`Score : ${report.totalMarks}/${report.maxMarks}  (${report.percentage}%  grade ${report.grade})`);
console.log(`Counts: ${report.correct} correct · ${report.incorrect} incorrect · ${report.unattempted} unattempted`);
if (report.flags.length) console.log(`Flags : ${report.flags.join(', ')}`);
console.log('────────────────────────────────────\n');
