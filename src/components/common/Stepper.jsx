/** Three-step progress indicator for the grading wizard. */
const STEPS = ['Upload', 'Review', 'Results'];

export default function Stepper({ current }) {
  return (
    <div className="stepper" aria-label="Grading progress">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const state = n < current ? 'done' : n === current ? 'current' : '';
        return (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className={`step ${state ? `step--${state}` : ''}`}>
              <span className="step__dot">{n < current ? '✓' : n}</span>
              {label}
            </div>
            {i < STEPS.length - 1 && <span className="step__bar" />}
          </div>
        );
      })}
    </div>
  );
}
