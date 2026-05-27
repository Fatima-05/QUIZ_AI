import jsQR from 'jsqr';

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const url = typeof src === 'string' ? src : URL.createObjectURL(src);
    const img = new Image();
    img.onload = () => resolve({ img, url });
    img.onerror = () => reject(new Error('Could not read image file'));
    img.src = url;
  });
}


export function decodeQrFromImage(img) {
  const MAX = 1400; 
  const scale = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.round(img.naturalWidth * scale);
  const h = Math.round(img.naturalHeight * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);

  const { data } = ctx.getImageData(0, 0, w, h);
  const found = jsQR(data, w, h, { inversionAttempts: 'attemptBoth' });
  return found ? found.data : null;
}


export function parseQrPayload(raw) {
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw);
    return {
      studentId: obj.sid ?? obj.studentId ?? null,
      examId: obj.eid ?? obj.examId ?? null,
      name: obj.name ?? null,
      rollNo: obj.roll ?? obj.rollNo ?? null,
      answers: Array.isArray(obj.ans) ? obj.ans : null,
      raw,
    };
  } catch {
    return { studentId: raw.trim(), examId: null, name: null, rollNo: null, answers: null, raw };
  }
}

