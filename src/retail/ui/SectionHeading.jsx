import GoldLine from './GoldLine.jsx';

/**
 * A HEADING AND ITS GOLD LINE, together, because in this system they are one
 * mark: F2 gives every display heading a 48x1 px gold rule beneath it, and a
 * heading that appears without one is a heading somebody forgot.
 */
export default function SectionHeading({ children, size = 'pbi-h2', light = false, style, sub }) {
  return (
    <div style={style}>
      <h2 className={`pbi-display ${size}`} style={light ? { color: 'var(--pbi-warm-white)' } : null}>
        {children}
      </h2>
      <GoldLine light={light} />
      {sub ? <div className="pbi-choice pbi-choice-15">{sub}</div> : null}
    </div>
  );
}
