import {
  createContext, useContext, useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import { loadDb, persistDb, resetToSeed, uid } from './db.js';

const AppContext = createContext(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}

export function AppProvider({ children }) {
  const [db, setDb] = useState({ quizzes: [], students: [], results: [], meta: {} });
  const [ready, setReady] = useState(false);
  const [activeTab, setActiveTab] = useState('upload');
  const [busy, setBusyState] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [session, setSession] = useState(null);

  useEffect(() => {
    loadDb()
      .then((loaded) => { setDb(loaded); setReady(true); })
      .catch((err) => { console.error(err); setReady(true); });
  }, []);

  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    persistDb(db);
  }, [db]);

  const dismissToast = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const pushToast = useCallback(({ type = 'info', title, msg, ttl = 3800 }) => {
    const id = uid('toast');
    setToasts((t) => [...t, { id, type, title, msg }]);
    if (ttl) setTimeout(() => dismissToast(id), ttl);
    return id;
  }, [dismissToast]);

  const setBusy = useCallback((label) => setBusyState(label ? { label } : null), []);
  const goTab = useCallback((tab) => { setActiveTab(tab); window.scrollTo({ top: 0, behavior: 'smooth' }); }, []);

  const saveQuiz = useCallback((quiz) => {
    setDb((prev) => {
      const exists = prev.quizzes.some((q) => q.id === quiz.id);
      const quizzes = exists ? prev.quizzes.map((q) => (q.id === quiz.id ? quiz : q)) : [...prev.quizzes, quiz];
      return { ...prev, quizzes };
    });
  }, []);
  const deleteQuiz = useCallback((id) => setDb((prev) => ({ ...prev, quizzes: prev.quizzes.filter((q) => q.id !== id) })), []);

  const addStudent = useCallback((student) => {
    setDb((prev) => ({ ...prev, students: [...prev.students, { id: uid('S'), ...student }] }));
  }, []);
  const updateStudent = useCallback((student) => {
    setDb((prev) => ({ ...prev, students: prev.students.map((s) => (s.id === student.id ? student : s)) }));
  }, []);
  const deleteStudent = useCallback((id) => setDb((prev) => ({ ...prev, students: prev.students.filter((s) => s.id !== id) })), []);

  const upsertStudentByReg = useCallback((regNo, name, cls) => {
    const key = (regNo || '').trim().toLowerCase();
    let found = null;
    setDb((prev) => {
      found = prev.students.find((s) => (s.regNo || '').trim().toLowerCase() === key && key);
      if (found) {
        if (!found.name && name) {
          const updated = { ...found, name };
          found = updated;
          return { ...prev, students: prev.students.map((s) => (s.id === updated.id ? updated : s)) };
        }
        return prev;
      }
      found = { id: uid('S'), name: name || 'Unknown', regNo: regNo || '', class: cls || '' };
      return { ...prev, students: [...prev.students, found] };
    });
    return found;
  }, []);

  const saveResult = useCallback((result) => {
    setDb((prev) => {
      const exists = prev.results.some((r) => r.id === result.id);
      const results = exists ? prev.results.map((r) => (r.id === result.id ? result : r)) : [...prev.results, result];
      return { ...prev, results };
    });
  }, []);
  const deleteResult = useCallback((id) => setDb((prev) => ({ ...prev, results: prev.results.filter((r) => r.id !== id) })), []);

  const updateSessionAnswer = useCallback((part, qi, value) => {
    setSession((s) => {
      if (!s) return s;
      const next = { ...s, [part]: [...s[part]] };
      next[part][qi] = value;
      if (s.confidence?.[part]) {
        next.confidence = { ...s.confidence, [part]: [...s.confidence[part]] };
        next.confidence[part][qi] = 1;
      }
      return next;
    });
  }, []);
  const clearSession = useCallback(() => setSession(null), []);

  const resetData = useCallback(async () => {
    const seed = await resetToSeed();
    firstRun.current = true;
    setDb(seed);
    setSession(null);
    pushToast({ type: 'success', title: 'Data reset', msg: 'Restored the seed database.' });
  }, [pushToast]);

  const value = useMemo(() => ({
    ready,
    quizzes: db.quizzes, students: db.students, results: db.results,
    activeTab, goTab,
    busy, setBusy,
    toasts, pushToast, dismissToast,
    session, setSession, updateSessionAnswer, clearSession,
    saveQuiz, deleteQuiz,
    addStudent, updateStudent, deleteStudent, upsertStudentByReg,
    saveResult, deleteResult,
    resetData,
  }), [
    ready, db, activeTab, goTab, busy, setBusy, toasts, pushToast, dismissToast,
    session, updateSessionAnswer, clearSession, saveQuiz, deleteQuiz,
    addStudent, updateStudent, deleteStudent, upsertStudentByReg,
    saveResult, deleteResult, resetData,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
