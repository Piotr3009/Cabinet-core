import { BRAND } from '../config.js';

/**
 * THE WORDMARK — display serif, 500, uppercase, tracked 0.14em (F2).
 *
 * Drawn as type and not as an image, because the owner has supplied no logo
 * and a generated one would be a lie the site then has to live with.
 */
export default function Wordmark({ size = 15, tone = 'onyx', gap = '0.34em' }) {
  return (
    <span
      className="pbi-display"
      style={{
        fontSize: size,
        letterSpacing: gap,
        color: tone === 'onyx' ? 'var(--pbi-onyx)' : 'var(--pbi-warm-white)',
        whiteSpace: 'nowrap',
      }}
    >
      {BRAND}
    </span>
  );
}
