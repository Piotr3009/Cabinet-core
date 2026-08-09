import { useEffect, useMemo, useState } from 'react';
import { DECOR_BRAND, decorById } from '../engine/decors.js';
import { formatMm } from '../engine/format.js';
import { filterVeneers, getVeneers, veneerFinishId, veneerLabel } from '../engine/veneers.js';
import { loadDecorCatalogue } from '../lib/decorCatalogue.js';

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
    <div className="space-y-2" data-veneer-picker="1">
      <div className="flex items-center gap-1">
        <span className="text-[11px] uppercase tracking-wide text-ink-400 shrink-0">Veneer</span>
        <input
          className="cc-input flex-1"
          placeholder="Search by timber — oak, hickory…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {value && (
          <button type="button" className="cc-btn-ghost" title="Use the project finish instead" onClick={onClear}>
            Clear
          </button>
        )}
      </div>

      {/* The LIST is ours and arrives at once; only the pictures are fetched.
          Saying so is the difference between "loading" and "broken". */}
      {!ready && <p className="text-[11px] text-ink-400">Loading the pictures…</p>}
      {shown.length === 0 && (
        <p className="text-[11px] text-ink-400 py-4">Nothing matches “{query}”.</p>
      )}

      <div className="grid grid-cols-4 gap-1.5 max-h-[280px] cc-scroll pr-1">
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
              className={`text-left rounded border overflow-hidden transition-colors ${selected
                ? 'border-gold ring-1 ring-gold'
                : 'border-shell-600 hover:border-ink-400'}`}
              onClick={() => onPick(id, v)}
            >
              {decor?.thumb ? (
                <img src={decor.thumb} alt={veneerLabel(v)} loading="lazy" className="w-full h-12 object-cover block" />
              ) : (
                <span className="w-full h-12 block" style={{ background: v.hex || decor?.hex || '#C2A485' }} />
              )}
              <span className="block px-1 py-1 text-[9px] leading-tight text-ink-100">
                {v.label}
                {/* MANDATORY attribution while the picture is EGGER's, in the
                    same control as the image it credits. */}
                {decor && (
                  <span className="block text-ink-400 truncate">
                    <span className="text-gold">EGGER</span> {decor.code}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      <p className="text-[10px] text-ink-400">
        {shown.length} of {veneers.length} veneers
        {thickness ? ` · ${formatMm(thickness)} mm from the source` : ''}. The workshop&apos;s own scanned
        veneers drop into this list as data — {DECOR_BRAND} decors stand in until they do.
      </p>
    </div>
  );
}
