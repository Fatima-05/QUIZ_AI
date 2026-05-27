import { useApp } from '../../store/AppContext.jsx';

/** Full-screen busy overlay shown during image processing / decoding. */
export default function LoadingOverlay() {
  const { busy } = useApp();
  if (!busy) return null;
  return (
    <div className="loading-overlay">
      <div className="loading-overlay__box">
        <span className="loader loader--lg" />
        <span>{busy.label || 'Working…'}</span>
      </div>
    </div>
  );
}
