import { useEffect, useMemo, useState } from 'react';
import { DECOR_BRAND, decorById } from '../../../engine/decors.js';
import { formatMm } from '../../../engine/format.js';
import { filterVeneers, getVeneers, veneerFinishId, veneerLabel } from '../../../engine/veneers.js';
import { loadDecorCatalogue } from '../../../lib/decorCatalogue.js';

// ─── The VENEER picker (turn 15, CLAUDE.md F3.2) ────────────────────────────
//
// The owner's "mega ważne": choosing VENEER offered a RAL palette. A veneer is
// a species of timber, so this is a list of timber.
//
// It is deliberately the DECOR picker's twin and not a second design — same
// tile, same search box, same attribution rule — because they are the same
// gesture ("pick what the board is faced with") asked of two collections. What
// is NOT shared is the collection: the veneers are their own list
// (engine/veneers.js), which is what makes the owner's own scanned oak a data
// entry rather than a code change.
//
// ─── THE LICENCE, UNCHANGED (EGGER General Terms for Image Use) ─────────────
// While a veneer's picture is an EGGER scan, the tile carries EGGER's
// attribution next to the image and in the same control, exactly as
// DecorPicker does. There is no state in which the picture appears without the
// credit. See engine/decors.js for the full note.
export default function VeneerPicker({
  value, onPick, onClear, thickness = null,
}) {
  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState('');

  // The thumbnails live in the decor pack; the LIST does not need it, so a pack
  // that fails to load leaves a picker of names and colours rather than nothing.
  useEffect(() => {
    let alive = true;
    loadDecorCatalogue().then(() => { if (alive) setReady(true); });
    return () => { alive = false; };
  }, []);

  const veneers = getVeneers();
  const shown = useMemo(() => filterVeneers(veneers, { query }), [veneers, query]);

  return (
    <div className="pbi-re-stack-2" data-veneer-picker="1">
      <div className="pbi-re-row pbi-re-mid pbi-re-gap-1">
        <span className="pbi-re-t11 pbi-re-caps pbi-re-track pbi-re-quiet pbi-re-nogrow">Veneer</span>
        <input
          className="pbi-re-input pbi-re-grow"
          placeholder="Search by timber — oak, hickory…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {value && (
          <button type="button" className="pbi-re-btn-ghost" title="Use the project finish instead" onClick={onClear}>
            Clear
          </button>
        )}
      </div>

      {/* The LIST is ours and arrives at once; only the pictures are fetched.
          Saying so is the difference between "loading" and "broken". */}
      {!ready && <p className="pbi-re-t11 pbi-re-quiet">Loading the pictures…</p>}
      {shown.length === 0 && (
        <p className="pbi-re-t11 pbi-re-quiet pbi-re-py4">Nothing matches “{query}”.</p>
      )}

      <div className="pbi-re-grid pbi-re-grid-4 pbi-re-gap-15 pbi-re-maxh280 pbi-re-scrollbox pbi-re-pr1">
        {shown.map((v) => {
          const id = veneerFinishId(v);
          const decor = v.decorId ? decorById(v.decorId) : null;
          const selected = value === id;
          return (
            <button
              key={v.id}
              type="button"
              title={veneerLabel(v)}
              aria-pressed={selected}
              data-veneer={v.id}
              className={`pbi-re-left pbi-re-round pbi-re-line pbi-re-clip pbi-re-fade ${selected
                ? 'pbi-re-hair-gold pbi-re-ring pbi-re-ring-gold'
                : 'pbi-re-hair pbi-re-hair-hover'}`}
              onClick={() => onPick(id, v)}
            >
              {decor?.thumb ? (
                <img src={decor.thumb} alt={veneerLabel(v)} loading="lazy" className="pbi-re-wfull pbi-re-h12 pbi-re-cover pbi-re-block" />
              ) : (
                <span className="pbi-re-wfull pbi-re-h12 pbi-re-block" style={{ background: v.hex || decor?.hex || '#D9D1C6' }} />
              )}
              <span className="pbi-re-block pbi-re-px1 pbi-re-py1 pbi-re-t9 pbi-re-lead-tight pbi-re-ink-1">
                {v.label}
                {/* MANDATORY attribution while the picture is EGGER's, in the
                    same control as the image it credits. */}
                {decor && (
                  <span className="pbi-re-block pbi-re-quiet pbi-re-trunc">
                    <span className="pbi-re-gold">EGGER</span> {decor.code}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      <p className="pbi-re-t10 pbi-re-quiet">
        {shown.length} of {veneers.length} veneers
        {thickness ? ` · ${formatMm(thickness)} mm from the source` : ''}. The workshop&apos;s own scanned
        veneers drop into this list as data — {DECOR_BRAND} decors stand in until they do.
      </p>
    </div>
  );
}
