import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import QRCode from 'qrcode';
import { SHEET, bubbleCenter, sheetHeight, canonicalCorners } from '../src/lib/sheetLayout.js';
import { buildQuizQr } from '../src/lib/quizQr.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const outDir = path.resolve(ROOT, args[args.indexOf('--out') + 1] && !args[args.indexOf('--out') + 1]?.startsWith('--') ? args[args.indexOf('--out') + 1] : 'samples');
const N = Number(args[args.indexOf('--n') + 1]) || 5;

const db = JSON.parse(fs.readFileSync(path.join(ROOT, 'public', 'db.json'), 'utf8'));
const quiz = db.quizzes[0]; 

fs.mkdirSync(outDir, { recursive: true });

function makeAnswers(seed) {
  const a = { part1: [...quiz.parts.part1], part2: [...quiz.parts.part2] };
  const wrongCount = seed % 4;            
  for (let k = 0; k < wrongCount; k += 1) {
    const part = k % 2 === 0 ? 'part1' : 'part2';
    const qi = (seed + k * 3) % SHEET.qCount;
    const key = quiz.parts[part][qi];
    a[part][qi] = SHEET.options[(SHEET.options.indexOf(key) + 1) % 4];
  }
  if (seed % 3 === 0) a.part1[(seed + 1) % SHEET.qCount] = null; 
  if (seed % 5 === 0) a.part2[(seed + 2) % SHEET.qCount] = 'X';   
  return a;
}

async function render(answers, file) {
  const W = SHEET.width, H = sheetHeight();
  const png = new PNG({ width: W, height: H });
  const set = (x, y, c) => { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= W || y >= H) return; const i = (y * W + x) * 4; png.data[i] = png.data[i + 1] = png.data[i + 2] = c; png.data[i + 3] = 255; };
  const rect = (x, y, w, h, c) => { for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) set(x + xx, y + yy, c); };
  const disc = (cx, cy, r, c) => { for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) if (xx * xx + yy * yy <= r * r) set(cx + xx, cy + yy, c); };

  rect(0, 0, W, H, 255); 
  canonicalCorners().forEach(({ x, y }) => rect(x - SHEET.cornerSize / 2, y - SHEET.cornerSize / 2, SHEET.cornerSize, SHEET.cornerSize, 0));

  for (const part of ['part1', 'part2']) {
    for (let qi = 0; qi < SHEET.qCount; qi += 1) {
      const chosen = answers[part][qi];
      SHEET.options.forEach((letter, oi) => {
        const { cx, cy } = bubbleCenter(part, qi, oi);
        const fill = chosen === letter || (chosen === 'X' && (oi === 0 || letter === SHEET.options[1]));
        if (fill) disc(cx, cy, SHEET.bubbleR, 17);
      });
    }
  }

  const qrPng = PNG.sync.read(await QRCode.toBuffer(buildQuizQr(quiz), { type: 'png', margin: 2, width: 220 }));
  const gx0 = W - qrPng.width - SHEET.marginX;
  for (let y = 0; y < qrPng.height; y++) for (let x = 0; x < qrPng.width; x++) {
    const j = (y * qrPng.width + x) * 4;
    const gx = gx0 + x, gy = 20 + y;
    if (gx >= 0 && gy >= 0 && gx < W && gy < H) { const i = (gy * W + gx) * 4; png.data[i] = qrPng.data[j]; png.data[i + 1] = qrPng.data[j + 1]; png.data[i + 2] = qrPng.data[j + 2]; png.data[i + 3] = 255; }
  }

  fs.writeFileSync(path.join(outDir, file), PNG.sync.write(png));
}

for (let s = 1; s <= N; s += 1) {
  const ans = makeAnswers(s);
  await render(ans, `sheet${s}.png`);
  console.log(`samples/sheet${s}.png  P1=${ans.part1.map((a) => a ?? '-').join('')}  P2=${ans.part2.map((a) => (a === 'X' ? 'X' : a ?? '-')).join('')}`);
}
console.log(`\nWrote ${N} sheets to ${path.relative(ROOT, outDir)}/`);
