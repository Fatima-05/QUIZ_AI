import { useApp } from './store/AppContext.jsx';
import TopNav from './components/TopNav.jsx';
import Toasts from './components/common/Toasts.jsx';
import LoadingOverlay from './components/common/LoadingOverlay.jsx';
import UploadPanel from './components/upload/UploadPanel.jsx';
import ReviewPanel from './components/review/ReviewPanel.jsx';
import ResultsPanel from './components/results/ResultsPanel.jsx';
import BatchPanel from './components/batch/BatchPanel.jsx';
import DashboardPanel from './components/dashboard/DashboardPanel.jsx';
import QuizManager from './components/quizzes/QuizManager.jsx';
import StudentManager from './components/students/StudentManager.jsx';

const PANELS = {
  upload: UploadPanel,
  review: ReviewPanel,
  results: ResultsPanel,
  batch: BatchPanel,
  dashboard: DashboardPanel,
  quizzes: QuizManager,
  students: StudentManager,
};

export default function App() {
  const { ready, activeTab } = useApp();

  if (!ready) {
    return (
      <div className="loading-overlay" style={{ position: 'fixed' }}>
        <div className="loading-overlay__box"><span className="loader loader--lg" /><span>Loading database…</span></div>
      </div>
    );
  }

  const Panel = PANELS[activeTab] ?? UploadPanel;
  return (
    <div className="app">
      <TopNav />
      <main className="app__main"><Panel key={activeTab} /></main>
      <Toasts />
      <LoadingOverlay />
    </div>
  );
}
