const LS_KEY = 'gradescan.db.v2';

function normalize(db) {
  return {
    meta: db.meta ?? { appName: 'GradeScan', version: 2 },
    students: Array.isArray(db.students) ? db.students : [],
    quizzes: Array.isArray(db.quizzes) ? db.quizzes : [],
    results: Array.isArray(db.results) ? db.results : [],
  };
}

export async function loadDb() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return normalize(JSON.parse(raw));
  } catch {
  }

  const res = await fetch(`${import.meta.env.BASE_URL}db.json`);
  if (!res.ok) throw new Error('Could not load seed db.json');
  const seed = normalize(await res.json());
  persistDb(seed);
  return seed;
}

export function persistDb(db) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(db));
  } catch (e) {
    console.error('Failed to persist db', e);
  }
}

export async function resetToSeed() {
  localStorage.removeItem(LS_KEY);
  return loadDb();
}

export function uid(prefix = 'id') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
