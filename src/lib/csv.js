import { SHEET } from './sheetLayout.js';

const Q = SHEET.qCount;

const HEADERS = [
  'Quiz', 'Set', 'Class', 'Subject', 'Name', 'Reg No',
  ...Array.from({ length: Q }, (_, i) => `Part1_Q0${i + 1}`),
  ...Array.from({ length: Q }, (_, i) => `Part2_Q0${i + 1}`),
  'Correct', 'Incorrect', 'Unattempted', 'Total Marks', 'Percentage', 'Grade',
];

const esc = (v) => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const cell = (a) => (a === 'X' ? 'MULTI' : (a ?? '-'));

export function buildCsv(rows, quizTitle = 'Quiz') {
  const lines = [HEADERS.join(',')];

  rows.forEach((r) => {
    const p1 = r.part1 || [];
    const p2 = r.part2 || [];
    const row = [
      quizTitle, r.set, r.class, r.subject, r.studentName, r.regNo,
      ...Array.from({ length: Q }, (_, i) => cell(p1[i])),
      ...Array.from({ length: Q }, (_, i) => cell(p2[i])),
      r.correct, r.incorrect, r.unattempted, r.totalMarks, `${r.percentage}%`, r.grade,
    ];
    lines.push(row.map(esc).join(','));
  });

  if (rows.length) {
    const pcts = rows.map((r) => r.percentage);
    const avg = Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length);
    const summary = new Array(HEADERS.length).fill('');
    summary[0] = 'SUMMARY';
    summary[HEADERS.indexOf('Percentage')] = `avg ${avg}%`;
    summary[HEADERS.indexOf('Total Marks')] = `high ${Math.max(...pcts)}% / low ${Math.min(...pcts)}%`;
    lines.push(summary.map(esc).join(','));
  }

  return lines.join('\r\n');
}

export function csvFilename(title, set) {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
  const safe = `${title || 'Quiz'}_${set || ''}`.replace(/[^A-Za-z0-9_-]+/g, '-').replace(/-+/g, '-');
  return `${safe}_${stamp}.csv`;
}

export function downloadCsv(filename, text) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
