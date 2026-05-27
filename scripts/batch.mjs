import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import jsQR from 'jsqr';
import { decode } from './_img.mjs';
import { parseQuizQr } from '../src/lib/quizQr.js';
import { buildMapper, readSheetBuffer } from '../src/lib/omrCore.js';
import { gradeQuiz } from '../src/lib/grade.js';
import { buildCsv, csvFilename } from '../src/lib/csv.js';
import { ocrStudent, endOcr } from './_ocr.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const useOcr = args.includes('--ocr');
const dirArg = args.find((a) => !a.startsWith('--')) || 'samples';
const dir = path.resolve(ROOT, dirArg);
const outDir = path.join(ROOT, 'output');
fs.mkdirSync(outDir, { recursive: true });

const files = fs.readdirSync(dir).filter((f) => /\.(png|jpe?g)$/i.test(f));
if (!files.length) { console.error(`No images in ${dirArg}/. Run: node scripts/makeTestSheet.mjs`); process.exit(1); }

const records = [];
for (const f of files) {
  try {
    const { data, width, height } = decode(path.join(dir, f));
    const qr = parseQuizQr((jsQR(data, width, height, { inversionAttempts: 'attemptBoth' }) || {}).data);
    if (!qr) { console.log(`  ${f}: no QR — skipped`); continue; }
    const mapper = buildMapper(data, width, height);
    if (!mapper) { console.log(`  ${f}: not located — skipped`); continue; }
    const omr = readSheetBuffer(data, width, height, mapper);
    let student = { name: '', regNo: '' };
    if (useOcr) { try { student = await ocrStudent(data, width, height, mapper.map); } catch { /* leave blank */ } }
    const r = gradeQuiz({ part1: omr.part1, part2: omr.part2 }, qr.parts, qr);
    records.push({
      set: qr.set, class: qr.class, subject: qr.subject,
      studentName: student.name, regNo: student.regNo,
      part1: omr.part1, part2: omr.part2,
      correct: r.correct, incorrect: r.incorrect, unattempted: r.unattempted,
      totalMarks: r.totalMarks, maxMarks: r.maxMarks, percentage: r.percentage, grade: r.grade,
      quizTitle: qr.title,
    });
    console.log(`  ${f}: ${student.name || '(no name)'} ${student.regNo || ''} → ${r.totalMarks}/${r.maxMarks} (${r.percentage}% ${r.grade})`);
  } catch (e) { console.log(`  ${f}: error ${e.message}`); }
}
await endOcr();

if (!records.length) { console.error('No sheets graded.'); process.exit(2); }
const title = records[0].quizTitle || 'Quiz';
const out = path.join(outDir, csvFilename(title, records[0].set));
fs.writeFileSync(out, buildCsv(records, title));
console.log(`\nWrote ${records.length} rows -> ${path.relative(ROOT, out)}\n`);
