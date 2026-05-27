const PART_LEN = 8; 

function parsePartTokens(text) {
  const arr = Array(PART_LEN).fill(null);
  const re = /Q\s*(\d+)\s*=\s*([A-Da-d])/g;
  let m;
  while ((m = re.exec(text))) {
    const i = Number(m[1]) - 1;
    if (i >= 0 && i < PART_LEN) arr[i] = m[2].toUpperCase();
  }
  return arr;
}

/**
 * 
 * 
 * @returns {{title,set,class,subject,negativeMarking,marksPerQuestion,parts:{part1,part2}}|null}
 */
export function parseQuizQr(raw) {
  if (!raw || typeof raw !== 'string' || !/part/i.test(raw)) return null;

  const segs = raw.split('|').map((s) => s.trim()).filter(Boolean);
  const out = {
    title: 'Quiz', set: '', class: '', subject: '',
    negativeMarking: 0, marksPerQuestion: 1,
    parts: { part1: Array(PART_LEN).fill(null), part2: Array(PART_LEN).fill(null) },
    raw,
  };

  segs.forEach((seg) => {
    const lower = seg.toLowerCase();
    if (/part[\s-]*(ii|2|two)\b/i.test(seg)) {
      out.parts.part2 = parsePartTokens(seg);
    } else if (/part[\s-]*(i|1|one)\b/i.test(seg)) {
      out.parts.part1 = parsePartTokens(seg);
    } else if (lower.startsWith('class')) {
      out.class = seg.split(':')[1]?.trim() ?? '';
    } else if (lower.startsWith('subject')) {
      out.subject = seg.split(':')[1]?.trim() ?? '';
    } else if (lower.startsWith('neg')) {
      out.negativeMarking = Number(seg.split(':')[1]) || 0;
    } else if (lower.startsWith('marks')) {
      out.marksPerQuestion = Number(seg.split(':')[1]) || 1;
    } else {
      const setMatch = seg.match(/Set[\s-]*([A-Za-z0-9]+)/i);
      if (setMatch) {
        out.set = `Set-${setMatch[1].toUpperCase()}`;
        out.title = seg.slice(0, setMatch.index).trim() || out.title;
      } else if (!out.title || out.title === 'Quiz') {
        out.title = seg;
      }
    }
  });

  return out;
}

export function buildQuizQr(quiz) {
  const fmt = (arr) => arr.map((a, i) => `Q${i + 1}=${a ?? '-'}`).join(' ');
  const parts = [
    `${quiz.title} ${quiz.set}`.trim(),
    quiz.class ? `Class: ${quiz.class}` : null,
    quiz.subject ? `Subject: ${quiz.subject}` : null,
    `Neg: ${quiz.negativeMarking ?? 0}`,
    `Part-I: ${fmt(quiz.parts.part1)}`,
    `Part-II: ${fmt(quiz.parts.part2)}`,
  ].filter(Boolean);
  return parts.join(' | ');
}
