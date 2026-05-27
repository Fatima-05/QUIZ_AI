import { buildMapper, readSheetBuffer } from './omrCore.js';
export { LOW_CONFIDENCE } from './omrCore.js';

export function imageToCanvas(img) {
  const MAX = 1600;
  const scale = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight));
  const W = Math.round(img.naturalWidth * scale);
  const H = Math.round(img.naturalHeight * scale);
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, W, H);
  return { canvas, buf: ctx.getImageData(0, 0, W, H).data, W, H };
}

export function analyzeSheet(img) {
  const { canvas, buf, W, H } = imageToCanvas(img);
  const mapper = buildMapper(buf, W, H);
  if (!mapper) {
    return { method: 'failed', part1: null, part2: null, confidence: null, canvas, map: null };
  }
  const res = readSheetBuffer(buf, W, H, mapper);
  return { ...res, canvas, map: mapper.map };
}
