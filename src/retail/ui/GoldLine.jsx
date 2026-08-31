/**
 * 48 x 1 px of gold under a heading (F2). One of the four places the system
 * allows gold at all, and by some distance the most used.
 */
export default function GoldLine({ light = false, width, margin }) {
  return (
    <hr
      className={`pbi-gold-line${light ? ' pbi-gold-line-light' : ''}`}
      style={{ ...(width ? { width } : null), ...(margin ? { margin } : null) }}
    />
  );
}
