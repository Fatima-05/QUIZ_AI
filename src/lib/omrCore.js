import { SHEET, bubbleCenter, canonicalCorners, expectedRatio } from './sheetLayout.js';

const FILL_MIN = 0.32; 
const MULTI_RATIO = 0.78;    
export const LOW_CONFIDENCE = 0.6;

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const round2 = (n) => Math.round(n * 100) / 100;

function toGray(buf, W, H) {
  const gray = new Float32Array(W * H);
  for (let p = 0, i = 0; p < W * H; p += 1, i += 4) {
    gray[p] = buf[i] * 0.299 + buf[i + 1] * 0.587 + buf[i + 2] * 0.114;
  }
  return gray;
}

function otsuThreshold(gray) {
  const hist = new Array(256).fill(0);
  for (let i = 0; i < gray.length; i += 1) hist[gray[i] | 0] += 1;
  const total = gray.length;
  let sum = 0;
  for (let t = 0; t < 256; t += 1) sum += t * hist[t];
  let sumB = 0, wB = 0, max = 0, threshold = 127;
  for (let t = 0; t < 256; t += 1) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > max) { max = between; threshold = t; }
  }
  return threshold;
}

function darknessAt(buf, W, H, cx, cy, half) {
  let x0 = clamp(Math.round(cx - half), 0, W - 1);
  let y0 = clamp(Math.round(cy - half), 0, H - 1);
  let x1 = clamp(Math.round(cx + half), 0, W - 1);
  let y1 = clamp(Math.round(cy + half), 0, H - 1);
  let sum = 0, n = 0;
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      const i = (y * W + x) * 4;
      sum += 255 - (buf[i] * 0.299 + buf[i + 1] * 0.587 + buf[i + 2] * 0.114);
      n += 1;
    }
  }
  return n ? (sum / n) / 255 : 0;
}

export function detectCornerMarks(buf, W, H) {
  const gray = toGray(buf, W, H);
  const t = otsuThreshold(gray);
  const mask = new Uint8Array(W * H);
  for (let i = 0; i < gray.length; i += 1) mask[i] = gray[i] < t ? 1 : 0;

  const visited = new Uint8Array(W * H);
  const stack = new Int32Array(W * H);
  const minArea = Math.max(40, Math.round(W * H * 0.00008));
  const maxArea = Math.round(W * H * 0.02);
  const candidates = [];

  for (let start = 0; start < W * H; start += 1) {
    if (!mask[start] || visited[start]) continue;
    let sp = 0; stack[sp++] = start; visited[start] = 1;
    let count = 0, sumX = 0, sumY = 0, minX = W, maxX = 0, minY = H, maxY = 0;
    while (sp > 0) {
      const p = stack[--sp];
      const x = p % W, y = (p / W) | 0;
      count += 1; sumX += x; sumY += y;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      if (x > 0 && mask[p - 1] && !visited[p - 1]) { visited[p - 1] = 1; stack[sp++] = p - 1; }
      if (x < W - 1 && mask[p + 1] && !visited[p + 1]) { visited[p + 1] = 1; stack[sp++] = p + 1; }
      if (y > 0 && mask[p - W] && !visited[p - W]) { visited[p - W] = 1; stack[sp++] = p - W; }
      if (y < H - 1 && mask[p + W] && !visited[p + W]) { visited[p + W] = 1; stack[sp++] = p + W; }
    }
    if (count < minArea || count > maxArea) continue;
    const bw = maxX - minX + 1, bh = maxY - minY + 1;
    const aspect = bw / bh, fill = count / (bw * bh);
    if (aspect < 0.55 || aspect > 1.8 || fill < 0.62) continue;
    candidates.push({ x: sumX / count, y: sumY / count });
  }

  if (candidates.length < 4) return null;
  const pick = (fn) => candidates.reduce((a, b) => (fn(b) < fn(a) ? b : a));
  const TL = pick((p) => p.x + p.y);
  const BR = pick((p) => -(p.x + p.y));
  const TR = pick((p) => -(p.x - p.y));
  const BL = pick((p) => (p.x - p.y));
  const pts = [TL, TR, BL, BR];
  if (new Set(pts.map((p) => `${Math.round(p.x)},${Math.round(p.y)}`)).size < 4) return null;
  if (!(TR.x > TL.x + W * 0.1 && BR.x > BL.x + W * 0.1)) return null;
  if (!(BL.y > TL.y + H * 0.1 && BR.y > TR.y + H * 0.1)) return null;
  return pts;
}

function solveLinear(A, b, n) {
  for (let col = 0; col < n; col += 1) {
    let piv = col;
    for (let r = col + 1; r < n; r += 1) if (Math.abs(A[r][col]) > Math.abs(A[piv][col])) piv = r;
    [A[col], A[piv]] = [A[piv], A[col]];
    [b[col], b[piv]] = [b[piv], b[col]];
    const d = A[col][col];
    if (Math.abs(d) < 1e-12) return null;
    for (let r = 0; r < n; r += 1) {
      if (r === col) continue;
      const f = A[r][col] / d;
      for (let c = col; c < n; c += 1) A[r][c] -= f * A[col][c];
      b[r] -= f * b[col];
    }
  }
  return b.map((v, i) => v / A[i][i]);
}

export function solveHomography(src, dst) {
  const A = [], b = [];
  for (let i = 0; i < 4; i += 1) {
    const { x, y } = src[i];
    const { x: u, y: v } = dst[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
  }
  const h = solveLinear(A, b, 8);
  return h ? [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1] : null;
}

function applyH(Hm, x, y) {
  const X = Hm[0] * x + Hm[1] * y + Hm[2];
  const Y = Hm[3] * x + Hm[4] * y + Hm[5];
  const Z = Hm[6] * x + Hm[7] * y + Hm[8];
  return { x: X / Z, y: Y / Z };
}

export function buildMapper(buf, W, H) {
  const corners = detectCornerMarks(buf, W, H);
  if (corners) {
    const Hm = solveHomography(canonicalCorners(), corners);
    if (Hm) return { map: (x, y) => applyH(Hm, x, y), method: 'aligned' };
  }
  const ratio = H / W;
  if (Math.abs(ratio - expectedRatio()) < 0.06) {
    const s = W / SHEET.width;
    return { map: (x, y) => ({ x: x * s, y: y * s }), method: 'pixel' };
  }
  return null;
}

function readBubble(buf, W, H, map, part, qi, oi) {
  const { cx, cy } = bubbleCenter(part, qi, oi);
  const c = map(cx, cy);
  const edge = map(cx + SHEET.bubbleR, cy);
  const rImg = Math.hypot(edge.x - c.x, edge.y - c.y);
  return darknessAt(buf, W, H, c.x, c.y, Math.max(2, rImg * 0.55));
}

/**
 * 
 * @returns {{ method, part1, part2, confidence:{part1,part2} }}
 *  
 */
export function readSheetBuffer(buf, W, H, prebuilt) {
  const built = prebuilt || buildMapper(buf, W, H);
  if (!built) return { method: 'failed', part1: null, part2: null, confidence: null };
  const { map, method } = built;

  const out = { method, part1: [], part2: [], confidence: { part1: [], part2: [] } };

  for (const part of ['part1', 'part2']) {
    for (let qi = 0; qi < SHEET.qCount; qi += 1) {
      const dark = SHEET.options.map((_, oi) => readBubble(buf, W, H, map, part, qi, oi));
      const ranked = dark.map((d, i) => ({ d, i })).sort((a, b) => b.d - a.d);
      const top1 = ranked[0];
      const top2 = ranked[1] ?? { d: 0 };

      let answer, conf;
      if (top1.d < FILL_MIN) {
        answer = null;                                  
        conf = top1.d < 0.15 ? 0.92 : 0.5;
      } else if (top2.d >= FILL_MIN && top2.d >= top1.d * MULTI_RATIO) {
        answer = 'X';                                    
        conf = 0.4;
      } else {
        answer = SHEET.options[top1.i];
        const sep = top1.d - top2.d;
        conf = clamp(0.2 + sep * 0.45 + (top1.d - 0.5) * 0.7, 0.3, 0.99);
      }
      out[part].push(answer);
      out.confidence[part].push(round2(conf));
    }
  }
  return out;
}
