import { useMemo, useState } from 'react';
import { FRONT_STYLE_OPTIONS } from '../../../engine/design.js';
import { FRONT_ART_VIEWBOX, frontStyleArt } from '../../../engine/frontStyleArt.js';

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
    <div className="pbi-re-stack-2" data-style-gallery="1">
      <div className="pbi-re-fieldrow">
        <span className="pbi-re-t11 pbi-re-caps pbi-re-track pbi-re-quiet">Existing styles</span>
        <input
          className="pbi-re-input pbi-re-w44"
          data-style-filter="1"
          placeholder="Filter — shaker, arch…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {shown.length === 0 ? (
        <p className="pbi-re-t11 pbi-re-quiet pbi-re-py3">Nothing matches “{query}”.</p>
      ) : (
        <div className="pbi-re-grid pbi-re-grid-4 pbi-re-gap-2 pbi-re-maxh260 pbi-re-scrollbox pbi-re-pr1">
          {shown.map((s) => {
            const selected = value === s.id;
            return (
              <button
                key={s.id}
                type="button"
                data-style-tile={s.id}
                aria-pressed={selected}
                title={s.label}
                className={`pbi-re-round pbi-re-line pbi-re-p15 pbi-re-fade ${selected
                  ? 'pbi-re-hair-gold pbi-re-gold pbi-re-fill-soft'
                  : 'pbi-re-hair pbi-re-ink-2 pbi-re-hair-hover pbi-re-fill-hover'}`}
                onClick={() => onPick(s.id)}
              >
                <FrontStyleArt styleId={s.id} className="pbi-re-wfull pbi-re-h68 pbi-re-block" />
                <span className="pbi-re-block pbi-re-mt1 pbi-re-t10 pbi-re-lead-tight pbi-re-centre-text pbi-re-trunc">{s.label}</span>
              </button>
            );
          })}
        </div>
      )}
      <p className="pbi-re-t10 pbi-re-quiet">
        {shown.length} of {styles.length} styles. A new one is a line of data and one drawing — the
        gallery grows without this panel changing.
      </p>
    </div>
  );
}
