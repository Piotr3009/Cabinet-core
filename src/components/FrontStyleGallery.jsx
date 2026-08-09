import { useMemo, useState } from 'react';
import { FRONT_STYLE_OPTIONS } from '../engine/design.js';
import { FRONT_ART_VIEWBOX, frontStyleArt } from '../engine/frontStyleArt.js';

// ─── The door-style GALLERY (turn 15, CLAUDE.md F4) ─────────────────────────
//
// The owner's verdict on the shapes dropdown shipped in the chat batch: "there
// will be MANY kitchen/front styles — never a bare dropdown". A dropdown of
// seven abbreviations is a list you have to already know; a gallery of little
// drawings is a list you can read.
//
// BUILT FOR SCALE FROM DAY ONE, which is F4.2 and is the part that costs
// something today for nothing today:
//
//   • grid + SCROLL, so the thirtieth tile is reachable rather than off screen;
//   • a NAME FILTER, so it is reachable without scrolling;
//   • the styles are DATA (engine/design.js FRONT_STYLE_OPTIONS) and so are the
//     drawings (engine/frontStyleArt.js) — this component knows seven of
//     nothing. Adding a style is two data entries and no edit here.
//
// The drawings are the seed of the owner's "małe instrukcje": one module, one
// frame, reused wherever a style has to be shown.

/** One style's little picture, drawn from the data. */
export function FrontStyleArt({ styleId, className = '' }) {
  const art = frontStyleArt(styleId);
  return (
    <svg
      viewBox={`0 0 ${FRONT_ART_VIEWBOX.w} ${FRONT_ART_VIEWBOX.h}`}
      className={className}
      role="presentation"
      aria-hidden
      data-style-art={styleId}
    >
      {art.map((bit, i) => {
        const stroke = { stroke: 'currentColor', fill: 'none', strokeWidth: bit.soft ? 1.1 : 2 };
        if (bit.rect) {
          const [x, y, w, h] = bit.rect;
          return <rect key={i} x={x} y={y} width={w} height={h} rx={bit.rx ?? 2} {...stroke} />;
        }
        if (bit.line) {
          const [x1, y1, x2, y2] = bit.line;
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} strokeLinecap="round" {...stroke} />;
        }
        return <path key={i} d={bit.path} strokeLinejoin="round" {...stroke} />;
      })}
    </svg>
  );
}

/**
 * @param {object} props
 *   value     the chosen style id
 *   onPick    (id) => void
 *   styles    the list — defaults to the project's, injected for tests
 */
export default function FrontStyleGallery({ value, onPick, styles = FRONT_STYLE_OPTIONS }) {
  const [query, setQuery] = useState('');
  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return styles;
    return styles.filter((s) => `${s.id} ${s.label}`.toLowerCase().includes(needle));
  }, [styles, query]);

  return (
    <div className="space-y-2" data-style-gallery="1">
      <div className="cc-row">
        <span className="text-[11px] uppercase tracking-wide text-ink-400">Existing styles</span>
        <input
          className="cc-input w-44"
          data-style-filter="1"
          placeholder="Filter — shaker, arch…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {shown.length === 0 ? (
        <p className="text-[11px] text-ink-400 py-3">Nothing matches “{query}”.</p>
      ) : (
        <div className="grid grid-cols-4 gap-2 max-h-[260px] cc-scroll pr-1">
          {shown.map((s) => {
            const selected = value === s.id;
            return (
              <button
                key={s.id}
                type="button"
                data-style-tile={s.id}
                aria-pressed={selected}
                title={s.label}
                className={`rounded border p-1.5 transition-colors ${selected
                  ? 'border-gold text-gold bg-shell-700'
                  : 'border-shell-600 text-ink-200 hover:border-ink-400 hover:bg-shell-700'}`}
                onClick={() => onPick(s.id)}
              >
                <FrontStyleArt styleId={s.id} className="w-full h-[68px] block" />
                <span className="block mt-1 text-[10px] leading-tight text-center truncate">{s.label}</span>
              </button>
            );
          })}
        </div>
      )}
      <p className="text-[10px] text-ink-400">
        {shown.length} of {styles.length} styles. A new one is a line of data and one drawing — the
        gallery grows without this panel changing.
      </p>
    </div>
  );
}
