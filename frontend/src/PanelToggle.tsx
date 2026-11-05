import type { Panel } from './panels';

type Props = {
  side: Panel;
  open: boolean;
  label: string;
  controls: string;
  onToggle: () => void;
};

// One button per panel. Open: a small chevron in the panel's top corner. Closed: the whole strip is the button,
// so there is a big target to click and the label says what is hidden.
export default function PanelToggle({ side, open, label, controls, onToggle }: Props) {
  // chevron points the way the panel will move: towards its own edge to close, away from it to open
  const pointsLeft = (side === 'left') === open;
  return (
    <button
      type="button"
      className={`panel-toggle ${open ? 'is-open' : 'is-closed'}`}
      onClick={onToggle}
      aria-expanded={open}
      aria-controls={controls}
      aria-label={open ? `Hide ${label}` : `Show ${label}`}
      title={open ? `Hide ${label}` : `Show ${label}`}
    >
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
        <path
          d={pointsLeft ? 'M10 3 5 8l5 5' : 'M6 3l5 5-5 5'}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {!open && <span className="panel-toggle-label">{label}</span>}
    </button>
  );
}
