import { useApp } from '../store/AppContext.jsx';

const TABS = [
  { id: 'upload', label: 'Upload', step: 1 },
  { id: 'review', label: 'Review', step: 2, needsSession: true },
  { id: 'results', label: 'Results', step: 3, needsSession: true },
  { id: 'batch', label: 'Batch' },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'quizzes', label: 'Quizzes' },
  { id: 'students', label: 'Students' },
];

/** Sticky top navigation. Review/Results are gated until a sheet is in progress. */
export default function TopNav() {
  const { activeTab, goTab, session } = useApp();
  return (
    <header className="nav">
      <div className="nav__inner">
        <div className="brand">
          <span className="brand__logo" aria-hidden>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M5 12.5l4.5 4.5L19 7" stroke="#0b1220" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span>GradeScan<span className="brand__sub"> · Quiz Scanner</span></span>
        </div>

        <nav className="tabs" aria-label="Primary">
          {TABS.map((t) => {
            const disabled = t.needsSession && !session;
            return (
              <button
                key={t.id}
                className={`tab ${activeTab === t.id ? 'tab--active' : ''}`}
                onClick={() => goTab(t.id)}
                disabled={disabled}
                title={disabled ? 'Upload or load a sheet first' : undefined}
              >
                {t.step && <span className="tab__num">{t.step}</span>}
                {t.label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
