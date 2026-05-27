import { PNG } from 'pngjs';
import { createWorker } from 'tesseract.js';
import { SHEET } from '../src/lib/sheetLayout.js';

function cropPng(buf, W, H, map, box, scale = 3) {
  const cs = [[box.x, box.y], [box.x + box.w, box.y], [box.x, box.y + box.h], [box.x + box.w, box.y + box.h]].map(([x, y]) => map(x, y));
  const xs = cs.map((c) => c.x), ys = cs.map((c) => c.y);
  const minX = Math.max(0, Math.floor(Math.min(...xs)));
  const minY = Math.max(0, Math.floor(Math.min(...ys)));
  const w = Math.max(1, Math.min(W - minX, Math.ceil(Math.max(...xs)) - minX));
  const h = Math.max(1, Math.min(H - minY, Math.ceil(Math.max(...ys)) - minY));
  const ow = Math.round(w * scale), oh = Math.round(h * scale);
  const png = new PNG({ width: ow, height: oh });
  for (let y = 0; y < oh; y += 1) {
    for (let x = 0; x < ow; x += 1) {
      const sx = minX + Math.floor(x / scale), sy = minY + Math.floor(y / scale);
      const si = (sy * W + sx) * 4;
      const lum = buf[si] * 0.299 + buf[si + 1] * 0.587 + buf[si + 2] * 0.114;
      const v = lum < 145 ? 0 : 255;
      const di = (y * ow + x) * 4;
      png.data[di] = png.data[di + 1] = png.data[di + 2] = v; png.data[di + 3] = 255;
    }
  }
  return PNG.sync.write(png);
}

const cleanName = (s) => s.replace(/[^A-Za-z .'-]/g, ' ').replace(/\s+/g, ' ').trim();
const cleanReg = (s) => s.replace(/[^A-Za-z0-9-]/g, '').trim();

let worker = null;
export async function ocrStudent(buf, W, H, map) {
  if (!worker) worker = await createWorker('eng');
  const n = await worker.recognize(cropPng(buf, W, H, map, SHEET.nameBox));
  const r = await worker.recognize(cropPng(buf, W, H, map, SHEET.regBox));
  return {
    name: cleanName(n.data.text || ''),
    regNo: cleanReg(r.data.text || ''),
    confidence: Math.round(((n.data.confidence || 0) + (r.data.confidence || 0)) / 2),
  };
}
export async function endOcr() { if (worker) { await worker.terminate(); worker = null; } }
