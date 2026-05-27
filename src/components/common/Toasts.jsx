import { useApp } from '../../store/AppContext.jsx';

const ICONS = { success: '✓', error: '✕', info: 'ℹ' };

/** Stack of auto-dismissing toast notifications (bottom-right). */
export default function Toasts() {
  const { toasts, dismissToast } = useApp();
  if (!toasts.length) return null;
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast--${t.type}`} onClick={() => dismissToast(t.id)}>
          <span className="toast__icon">{ICONS[t.type] ?? 'ℹ'}</span>
          <div className="toast__msg">
            {t.title && <div className="toast__title">{t.title}</div>}
            {t.msg && <div className="muted">{t.msg}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}
