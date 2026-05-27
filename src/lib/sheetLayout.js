export const SHEET = {
  width: 800,
  marginX: 36,

  nameBox: { x: 110, y: 104, w: 320, h: 30 },
  regBox: { x: 110, y: 146, w: 320, h: 30 },


  gridTop: 290,    
  rowH: 40,
  bubbleR: 12,
  optGap: 46,      
  qCount: 8,        
  options: ['A', 'B', 'C', 'D'],

  parts: {
    part1: { title: 'Part-I', titleX: 60, qX: 64, optX0: 130 },
    part2: { title: 'Part-II', titleX: 430, qX: 434, optX0: 500 },
  },

  cornerSize: 16,
  bottomPad: 56,
};

export function sheetHeight() {
  return SHEET.gridTop + SHEET.qCount * SHEET.rowH + SHEET.bottomPad;
}

export function bubbleCenter(part, qi, oi) {
  const p = SHEET.parts[part];
  return { cx: p.optX0 + oi * SHEET.optGap, cy: SHEET.gridTop + qi * SHEET.rowH };
}

export function canonicalCorners() {
  const H = sheetHeight();
  return [
    { x: 36, y: 36 },
    { x: SHEET.width - 36, y: 36 },
    { x: 36, y: H - 36 },
    { x: SHEET.width - 36, y: H - 36 },
  ];
}

export function expectedRatio() {
  return sheetHeight() / SHEET.width;
}
