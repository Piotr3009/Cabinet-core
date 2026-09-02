import { useEffect, useMemo, useState } from 'react';
import {
  DECOR_CATEGORIES, DECOR_DISCLAIMER, decorLabel, filterDecors, finishIdForDecor,
} from '../../../engine/decors.js';
import { loadDecorCatalogue } from '../../../lib/decorCatalogue.js';

// ─── EGGER decor picker (BACKLOG #19, v1) ───
//
// ════════════════════════════════════════════════════════════════════════════
// EGGER IMAGE LICENCE — this component renders their artwork, so read this
// (EGGER General Terms for Image Use; CLAUDE.md turn 5)
//
//   * A thumbnail here is the WHOLE board scan reduced, which is what the terms
//     allow. It is never cropped, never tiled and never recoloured — the <img>
//     below is `object-cover` on a tile of the scan's own proportions, so the
//     picture stays the picture.
//   * Attribution is MANDATORY and sits NEXT TO the image: "EGGER {code}
//     {name}", from decorLabel(). There is deliberately no unlabelled tile and
//     no way to render one — the caption is inside the same button as the image.
//   * These images MAY NOT go on 3D geometry until there is written consent.
//     Choosing a decor stores an id; engine/decors.js turns that into a finish
//     whose 3D texture is OUR OWN grain tinted with the decor's hex, never the
//     file shown here. test/decors.test.js holds that line.
//   * Every decor is a reproduction — the footer says so, verbatim.
// ════════════════════════════════════════════════════════════════════════════
//
// Loading: the list arrives at once from one small JSON; thumbnails are
// `loading="lazy"`, and a uni colour has no file at all — it is one flat hex.
export default function DecorPicker({ value, onPick, onClear }) {
  const [state, setState] = useState({ decors: [], error: null, loading: true });
  const [category, setCategory] = useState(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let alive = true;
    loadDecorCatalogue().then((res) => {
      if (alive) setState({ decors: res.decors, error: res.error, loading: false });
    });
    return () => { alive = false; };
  }, []);

  const shown = useMemo(
    () => filterDecors(state.decors, { category, query }),
    [state.decors, category, query],
  );

  return (
    <div className="pbi-re-stack-2">
      <div className="pbi-re-row pbi-re-mid pbi-re-gap-1">
        <button
          type="button"
          className={`pbi-re-btn pbi-re-px2 ${category === null ? 'pbi-re-hair-gold pbi-re-gold' : ''}`}
          onClick={() => setCategory(null)}
        >
          All
        </button>
        {DECOR_CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`pbi-re-btn pbi-re-px2 ${category === c.id ? 'pbi-re-hair-gold pbi-re-gold' : ''}`}
            onClick={() => setCategory(c.id)}
          >
            {c.label}
          </button>
        ))}
        <input
          className="pbi-re-input pbi-re-grow"
          placeholder="Search by code or name — H1180, oak…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {value && (
          <button type="button" className="pbi-re-btn-ghost" title="Use the project finish instead" onClick={onClear}>
            Clear
          </button>
        )}
      </div>

      {state.loading && <p className="pbi-re-t11 pbi-re-quiet pbi-re-py4">Loading the decor pack…</p>}
      {state.error && (
        <p className="pbi-re-t11 pbi-re-warn pbi-re-py2">
          The decor pack could not be read ({state.error}). The finishes this app ships with are still available.
        </p>
      )}
      {!state.loading && !state.error && shown.length === 0 && (
        <p className="pbi-re-t11 pbi-re-quiet pbi-re-py4">Nothing matches “{query}”.</p>
      )}

      <div className="pbi-re-grid pbi-re-grid-5 pbi-re-gap-15 pbi-re-maxh280 pbi-re-scroll pbi-re-pr1">
        {shown.map((decor) => {
          const id = finishIdForDecor(decor);
          const label = decorLabel(decor);
          const selected = value === id;
          return (
            <button
              key={decor.id}
              type="button"
              title={label}
              aria-pressed={selected}
              className={`pbi-re-left pbi-re-round pbi-re-line pbi-re-clip pbi-re-fade ${selected
                ? 'pbi-re-hair-gold pbi-re-ring pbi-re-ring-gold'
                : 'pbi-re-hair pbi-re-hair-hover'}`}
              onClick={() => onPick(id, decor)}
            >
              {/* The image is the whole scan, reduced — never a crop of it. A
                  uni colour ships no file: it IS one flat colour. */}
              {decor.thumb ? (
                <img
                  src={decor.thumb}
                  alt={label}
                  loading="lazy"
                  className="pbi-re-wfull pbi-re-h12 pbi-re-cover pbi-re-block"
                />
              ) : (
                <span className="pbi-re-wfull pbi-re-h12 pbi-re-block" style={{ background: decor.hex }} />
              )}
              {/* MANDATORY attribution, next to the image and in the same
                  control, so there is no state in which one appears without the
                  other. */}
              <span className="pbi-re-block pbi-re-px1 pbi-re-py1 pbi-re-t9 pbi-re-lead-tight pbi-re-ink-2">
                <span className="pbi-re-gold">EGGER</span> {decor.code}
                <span className="pbi-re-block pbi-re-quiet pbi-re-trunc">{decor.texture} {shortName(decor)}</span>
              </span>
            </button>
          );
        })}
      </div>

      <p className="pbi-re-t10 pbi-re-quiet">
        {shown.length} of {state.decors.length} decors · {DECOR_DISCLAIMER}
      </p>
    </div>
  );
}

/** The name without the code and surface it already begins with, for the tile. */
function shortName(decor) {
  return String(decor.name || '')
    .replace(new RegExp(`^${decor.code}\\s*`), '')
    .replace(new RegExp(`^${decor.texture}\\s*`), '')
    .trim();
}
