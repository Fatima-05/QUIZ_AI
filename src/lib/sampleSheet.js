import QRCode from 'qrcode';
import { SHEET, bubbleCenter, sheetHeight, canonicalCorners } from './sheetLayout.js';
import { buildQuizQr } from './quizQr.js';

function loadDataUrl(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function drawBubble(ctx, cx, cy, filled, faint) {
  ctx.beginPath();
  ctx.arc(cx, cy, SHEET.bubbleR, 0, Math.PI * 2);
  ctx.fillStyle = filled ? (faint ? 'rgba(17,17,17,0.5)' : '#111111') : '#ffffff';
  ctx.fill();
  ctx.lineWidth = 1.4;
  ctx.strokeStyle = '#9ca3af';
  ctx.stroke();
}

/**
 * @param quiz   
 * @param opts   
 *
 */
async function compose(quiz, { answers = null, studentName = '', regNo = '', blank = false } = {}) {
  const W = SHEET.width;
  const H = sheetHeight();
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#000000';
  canonicalCorners().forEach(({ x, y }) => ctx.fillRect(x - SHEET.cornerSize / 2, y - SHEET.cornerSize / 2, SHEET.cornerSize, SHEET.cornerSize));

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#0b1220';
  ctx.font = 'bold 22px Segoe UI, sans-serif';
  ctx.fillText(`${quiz.title} — ${quiz.set}`, SHEET.marginX, 48);
  ctx.font = '13px Segoe UI, sans-serif';
  ctx.fillStyle = '#374151';
  ctx.fillText(`Class: ${quiz.class}    Subject: ${quiz.subject}    Time: ${quiz.timeAllowed || '—'}    Marks: ${(quiz.parts.part1.length + quiz.parts.part2.length)}`, SHEET.marginX, 74);

  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1;
  ctx.font = 'bold 14px Segoe UI, sans-serif';
  ctx.fillStyle = '#0b1220';
  ctx.fillText('Name:', SHEET.marginX, SHEET.nameBox.y + 21);
  ctx.strokeRect(SHEET.nameBox.x, SHEET.nameBox.y, SHEET.nameBox.w, SHEET.nameBox.h);
  ctx.fillText('Reg #:', SHEET.marginX, SHEET.regBox.y + 21);
  ctx.strokeRect(SHEET.regBox.x, SHEET.regBox.y, SHEET.regBox.w, SHEET.regBox.h);
  if (!blank) {
    ctx.font = '16px Segoe UI, sans-serif';
    ctx.fillStyle = '#111827';
    if (studentName) ctx.fillText(studentName, SHEET.nameBox.x + 8, SHEET.nameBox.y + 21);
    if (regNo) ctx.fillText(regNo, SHEET.regBox.x + 8, SHEET.regBox.y + 21);
  }

  const qrSize = 200;
  const qrImg = await loadDataUrl(await QRCode.toDataURL(buildQuizQr(quiz), { margin: 2, width: 420 }));
  ctx.drawImage(qrImg, W - qrSize - SHEET.marginX, 20, qrSize, qrSize);
  ctx.font = '10px Segoe UI, sans-serif';
  ctx.fillStyle = '#6b7280';
  ctx.textAlign = 'center';
  ctx.fillText('answer-key QR', W - qrSize / 2 - SHEET.marginX, 232);
  ctx.textAlign = 'left';

  const faintKey = answers ? `part1:${Math.floor(SHEET.qCount / 2)}` : null;

  ctx.textBaseline = 'middle';
  for (const part of ['part1', 'part2']) {
    const p = SHEET.parts[part];
    
    ctx.textAlign = 'left';
    ctx.font = 'bold 15px Segoe UI, sans-serif';
    ctx.fillStyle = '#0b1220';
    ctx.fillText(p.title, p.titleX, SHEET.gridTop - 34);
    
    ctx.textAlign = 'center';
    ctx.font = '12px Segoe UI, sans-serif';
    ctx.fillStyle = '#6b7280';
    SHEET.options.forEach((letter, oi) => {
      const { cx } = bubbleCenter(part, 0, oi);
      ctx.fillText(letter, cx, SHEET.gridTop - 30);
    });

    for (let qi = 0; qi < SHEET.qCount; qi += 1) {
      const { cy } = bubbleCenter(part, qi, 0);

      ctx.textAlign = 'right';
      ctx.font = 'bold 13px Segoe UI, sans-serif';
      ctx.fillStyle = '#111827';
      ctx.fillText(`Q${qi + 1}`, p.qX + 18, cy);

      const chosen = answers ? answers[part]?.[qi] : null;
      SHEET.options.forEach((letter, oi) => {
        const { cx } = bubbleCenter(part, qi, oi);
        const faint = faintKey === `${part}:${qi}` && chosen === letter;
        const filled = !blank && (chosen === letter || (chosen === 'X' && (oi === 0 || letter === SHEET.options[1])));
        drawBubble(ctx, cx, cy, filled, faint);
      });
    }
  }

  return { dataUrl: canvas.toDataURL('image/png'), answers };
}

export function plausibleAnswers(quiz) {
  const out = { part1: [...quiz.parts.part1], part2: [...quiz.parts.part2] };
  out.part1[2] = null;                      
  out.part2[4] = 'X';                                    
  const k = quiz.parts.part1[6];
  out.part1[6] = SHEET.options[(SHEET.options.indexOf(k) + 1) % 4]; 
  return out;
}

export async function generateBlankSheet(quiz) {
  return { ...(await compose(quiz, { blank: true })), blank: true };
}

export async function generateFilledSheet(quiz, { studentName = '', regNo = '', answers } = {}) {
  return compose(quiz, { studentName, regNo, answers: answers ?? plausibleAnswers(quiz) });
}

export async function generateQrTag(quiz) {
  const qrImg = await loadDataUrl(await QRCode.toDataURL(buildQuizQr(quiz), { margin: 1, width: 240 }));
  const W = 260; const H = 300;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
  ctx.drawImage(qrImg, 10, 10, 240, 240);
  ctx.fillStyle = '#0b1220'; ctx.textAlign = 'center';
  ctx.font = 'bold 15px Segoe UI, sans-serif';
  ctx.fillText(`${quiz.title} · ${quiz.set}`, W / 2, 268);
  ctx.font = '12px Segoe UI, sans-serif'; ctx.fillStyle = '#374151';
  ctx.fillText('answer-key QR', W / 2, 288);
  return { dataUrl: canvas.toDataURL('image/png') };
}
