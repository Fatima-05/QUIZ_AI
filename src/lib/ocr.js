import { createWorker } from 'tesseract.js';
import { SHEET } from './sheetLayout.js';

let workerPromise = null;

function getWorker() {
  if (!workerPromise) workerPromise = createWorker('eng');
  return workerPromise;
}

export async function terminateOcr() {
  if (workerPromise) { try { (await workerPromise).terminate(); } catch { /* noop */ } workerPromise = null; }
}

function cropRegion(srcCanvas, map, box, scale = 3) {
  const corners = [
    map(box.x, box.y), map(box.x + box.w, box.y),
    map(box.x, box.y + box.h), map(box.x + box.w, box.y + box.h),
  ];
  const xs = corners.map((c) => c.x);
  const ys = corners.map((c) => c.y);
  const minX = Math.max(0, Math.min(...xs));
  const minY = Math.max(0, Math.min(...ys));
  const w = Math.max(1, Math.min(srcCanvas.width - minX, Math.max(...xs) - minX));
  const h = Math.max(1, Math.min(srcCanvas.height - minY, Math.max(...ys) - minY));

  const out = document.createElement('canvas');
  out.width = Math.round(w * scale);
  out.height = Math.round(h * scale);
  const ctx = out.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(srcCanvas, minX, minY, w, h, 0, 0, out.width, out.height);

  const id = ctx.getImageData(0, 0, out.width, out.height);
  const d = id.data;
  for (let i = 0; i < d.length; i += 4) {
    const lum = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
    const v = lum < 145 ? 0 : 255;
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(id, 0, 0);
  return out;
}

const cleanName = (s) => s.replace(/[^A-Za-z .'-]/g, ' ').replace(/\s+/g, ' ').trim();
const cleanReg = (s) => s.replace(/[^A-Za-z0-9-]/g, '').trim();

/**
 * 
 * @param srcCanvas 
 * @param map 
 */
export async function extractStudentInfo(srcCanvas, map) {
  const worker = await getWorker();

  const nameImg = cropRegion(srcCanvas, map, SHEET.nameBox);
  await worker.setParameters({ tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz .'-" });
  const nameRes = await worker.recognize(nameImg);

  const regImg = cropRegion(srcCanvas, map, SHEET.regBox);
  await worker.setParameters({ tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-' });
  const regRes = await worker.recognize(regImg);

  return {
    name: cleanName(nameRes.data.text || ''),
    regNo: cleanReg(regRes.data.text || ''),
    confidence: Math.round(((nameRes.data.confidence || 0) + (regRes.data.confidence || 0)) / 2),
  };
}
