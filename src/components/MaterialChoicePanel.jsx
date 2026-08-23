import { useEffect, useMemo, useState } from 'react';
import { DECOR_DISCLAIMER, decorLabel, filterDecors, finishIdForDecor } from '../engine/decors.js';
import { loadDecorCatalogue } from '../lib/decorCatalogue.js';
import { filterVeneers, getVeneers, veneerFinishId, veneerLabel } from '../engine/veneers.js';
import { COLOUR_SYSTEMS, contrastInk, findColour } from '../lib/pswColors.js';
import { normaliseColour } from '../engine/design.js';
// The owner's 96 px floor lives with the rest of this turn's UI law, so a
// column-count tweak here cannot quietly shrink it (CLAUDE.md F4).
import { TILE_SWATCH_PX } from '../lib/wizardTabs.js';

// ─── THE PICKER THAT STOPS FIGHTING YOU (turn 44, CLAUDE.md F4) ─────────────
//
// The owner, 23.08.2026, on the Egger window that shipped: *"okno w oknie,
// przesuwamy, nic nie widać, gubimy się."* A picker floating over the wizard,
// inside a scroll, inside a draggable window, with 40 px thumbnails and a
// search box that filtered nothing anybody could see.
//
// So this is a PANEL and not a window: it is the width of the step, it is IN
// the sequence rather than over it, and it has exactly one job at a time.
// F4 states the shape and this file is that shape, clause by clause:
//
//   · *"categories separated hard: `Laminat` | `Veneer` | `Spray`"* — the strip
//     across the top. It is the surface's own `sourceSeg`, handed in, because
//     the three categories ARE the three sources the project already stores and
//     a second vocabulary for them is how the two drift.
//   · *"Laminat: LARGE Egger tiles (min 96 px swatch, name in full-size type),
//     a search box that actually filters as you type, source = the same
//     `egger-decors.json` + thumbs the 3D uses"*.
//   · *"Veneer: dropdown list; Spray: dropdown list, NO tiles"* — the owner's
//     explicit order, *"tiles here zakłócają całość"*. There is deliberately no
//     code path in this file that draws a swatch grid for a spray.
//
// ════════════════════════════════════════════════════════════════════════════
// EGGER IMAGE LICENCE — unchanged, and it travels with the picture
// (EGGER General Terms for Image Use; see components/DecorPicker.jsx)
//
//   * a thumbnail is the WHOLE board scan reduced — never cropped, tiled or
//     recoloured;
//   * ATTRIBUTION IS MANDATORY and sits next to the image, inside the same
//     control, so there is no state in which one appears without the other;
//   * the pictures never go on 3D geometry — choosing one stores an id, and
//     `engine/decors.js` turns that into our own grain tinted with the decor's
//     hex (test/decors.test.js holds that line).
// ════════════════════════════════════════════════════════════════════════════

/**
 * @param {object} props
 *   kind          'carcass' | 'front' — only for the data hooks
 *   slot          the type record this panel is choosing for
 *   picker        'decor' | 'veneer' | 'colour' — engine/projectSettings.js
 *   categoryStrip the surface's own source buttons, rendered as the categories
 *   boardSelect   the stock-board select, or null when the head may not see it
 *   value         the finish id currently chosen (decor / veneer)
 *   colour        the sprayed colour currently chosen
 *   onDecor / onVeneer / onColour / onClear
 *   footer        what closes the submodal — the drawers question, and Next
 */
export default function MaterialChoicePanel({
  kind, slot, picker, categoryStrip = null, boardSelect = null,
  value = null, colour = null, onDecor, onVeneer, onColour, onClear = null,
  footer = null, title = null,
}) {
  return (
    <div
      className="border border-shell-600 rounded-lg p-3 space-y-3 w-full"
      data-material-panel={`${kind}:${slot?.id || ''}`}
      data-material-picker-kind={picker || 'none'}
    >
      <div>
        <span className="block text-[11px] uppercase tracking-[0.16em] text-gold">
          {title || `${slot?.label || 'Material'} — what is it made of?`}
        </span>
        <span className="block text-[10px] text-ink-400">
          One question at a time, full width, in the sequence — never a window over a window.
        </span>
      </div>

      {/* ── the three categories, separated hard ── */}
      <div data-material-categories="1">{categoryStrip}</div>

      {/* ── the body the category asks for ── */}
      {picker === 'decor' && (
        <DecorTiles value={value} onPick={onDecor} onClear={onClear} />
      )}
      {picker === 'veneer' && (
        <VeneerList value={value} onPick={onVeneer} onClear={onClear} />
      )}
      {picker === 'colour' && (
        <SprayList value={colour} onPick={onColour} />
      )}
      {!picker && (
        <p className="text-[11px] text-ink-400">This source has no picker yet — the board below is the answer.</p>
      )}

      {boardSelect}
      {footer}
    </div>
  );
}

/**
 * LAMINAT — the big tiles, and a search box that filters as you type.
 *
 * The grid is `min-content` at 96 px + the caption, so a wide panel gets more
 * columns instead of bigger gaps, and no tile is ever smaller than the floor
 * the owner set.
 */
function DecorTiles({ value, onPick, onClear }) {
  const [state, setState] = useState({ decors: [], error: null, loading: true });
  const [query, setQuery] = useState('');

  useEffect(() => {
    let alive = true;
    loadDecorCatalogue().then((res) => {
      if (alive) setState({ decors: res.decors, error: res.error, loading: false });
    });
    return () => { alive = false; };
  }, []);

  // The SAME filter the old picker used — one rule, and the search box is wired
  // to it on every keystroke rather than on a button nobody presses.
  const shown = useMemo(
    () => filterDecors(state.decors, { category: null, query }),
    [state.decors, query],
  );

  return (
    <div className="space-y-2" data-decor-tiles="1">
      <div className="flex items-center gap-2">
        <span className="text-[11px] uppercase tracking-wide text-ink-400 shrink-0">Laminat</span>
        <input
          className="cc-input flex-1 text-sm"
          data-decor-search="1"
          placeholder="Type to filter — H1180, oak, white…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {value && onClear && (
          <button type="button" className="cc-btn-ghost" data-decor-clear="1" onClick={onClear}>Clear</button>
        )}
      </div>

      {state.loading && <p className="text-[11px] text-ink-400 py-4">Loading the decor pack…</p>}
      {state.error && (
        <p className="text-[11px] text-status-warn py-2">
          The decor pack could not be read ({state.error}). The finishes this app ships with are still available.
        </p>
      )}
      {!state.loading && !state.error && shown.length === 0 && (
        <p className="text-[11px] text-ink-400 py-4" data-decor-empty="1">Nothing matches “{query}”.</p>
      )}

      <div
        className="grid gap-2 max-h-[420px] overflow-y-auto cc-scroll pr-1"
        style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${TILE_SWATCH_PX + 40}px, 1fr))` }}
      >
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
              data-egger-tile={decor.id}
              data-decor-finish={id}
              className={`text-left rounded border overflow-hidden transition-colors ${selected
                ? 'border-gold ring-1 ring-gold'
                : 'border-shell-600 hover:border-ink-400'}`}
              onClick={() => onPick(id, decor)}
            >
              {/* The whole scan, reduced — never a crop. A uni colour ships no
                  file: it IS one flat colour. */}
              {decor.thumb ? (
                <img
                  src={decor.thumb}
                  alt={label}
                  loading="lazy"
                  className="w-full object-cover block"
                  style={{ height: TILE_SWATCH_PX }}
                />
              ) : (
                <span className="w-full block" style={{ height: TILE_SWATCH_PX, background: decor.hex }} />
              )}
              {/* MANDATORY attribution, in the same control as the picture, and
                  the NAME in type somebody can read across a bench. */}
              <span className="block px-2 py-1.5 leading-tight">
                <span className="block text-[13px] text-ink-50 truncate">{decor.code}</span>
                <span className="block text-[11px] text-ink-300 truncate">{shortName(decor)}</span>
                <span className="block text-[10px] text-gold">EGGER · {decor.texture}</span>
              </span>
            </button>
          );
        })}
      </div>

      <p className="text-[10px] text-ink-400">
        {shown.length} of {state.decors.length} decors · {DECOR_DISCLAIMER}
      </p>
    </div>
  );
}

/**
 * VENEER — a LIST. The owner's fourth open detail, decided in the spec:
 * *"veneer picks from a LIST like spray (no tile assets exist)"*. So this is a
 * dropdown of timber and nothing else, and no picture is promised that the
 * repository cannot keep.
 */
function VeneerList({ value, onPick, onClear }) {
  const veneers = getVeneers();
  const [query, setQuery] = useState('');
  const shown = useMemo(() => filterVeneers(veneers, { query }), [veneers, query]);
  const current = veneers.find((v) => veneerFinishId(v) === value) || null;

  return (
    <div className="space-y-2" data-veneer-list="1">
      <div className="flex items-center gap-2">
        <span className="text-[11px] uppercase tracking-wide text-ink-400 shrink-0">Veneer</span>
        <input
          className="cc-input w-48 text-sm"
          data-veneer-search="1"
          placeholder="oak, hickory…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className="cc-input flex-1 text-sm"
          data-veneer-select="1"
          value={value && shown.some((v) => veneerFinishId(v) === value) ? value : ''}
          onChange={(e) => (e.target.value ? onPick(e.target.value) : onClear?.())}
        >
          <option value="">Choose a timber…</option>
          {shown.map((v) => (
            <option key={v.id} value={veneerFinishId(v)}>{veneerLabel(v)}</option>
          ))}
        </select>
        {value && onClear && (
          <button type="button" className="cc-btn-ghost" data-veneer-clear="1" onClick={onClear}>Clear</button>
        )}
      </div>
      <p className="text-[11px] text-ink-300" data-veneer-current="1">
        {current ? `Chosen: ${veneerLabel(current)}` : `${shown.length} of ${veneers.length} timbers.`}
        {' '}The workshop’s own scanned veneers drop into this list as data.
      </p>
    </div>
  );
}

/**
 * SPRAY — a LIST, and the owner said so twice: *"bez cholernych kafelek"*, and
 * again tonight, *"Spray: dropdown list, NO tiles"*. There is no swatch grid in
 * this function and there is no branch that could grow one; the only colour
 * drawn is the single chip that says what is currently chosen, which is a
 * READ-OUT and not a picker.
 */
function SprayList({ value, onPick }) {
  const current = normaliseColour(value);
  const [system, setSystem] = useState(current?.system === 'F&B' ? 'F&B' : 'RAL');
  const groups = COLOUR_SYSTEMS.find((s) => s.id === system)?.groups || [];

  return (
    <div className="space-y-2" data-spray-list="1">
      <div className="flex items-center gap-2">
        <span className="text-[11px] uppercase tracking-wide text-ink-400 shrink-0">Spray</span>
        {COLOUR_SYSTEMS.map((s) => (
          <button
            key={s.id}
            type="button"
            data-spray-system={s.id}
            className={`cc-btn px-2 ${system === s.id ? 'border-gold text-gold' : ''}`}
            onClick={() => setSystem(s.id)}
          >
            {s.label}
          </button>
        ))}
        {current && (
          <span
            className="px-2 py-0.5 rounded text-[11px] border border-shell-600"
            style={{ background: current.hex, color: contrastInk(current.hex) }}
            data-spray-current="1"
          >
            {current.name}
          </span>
        )}
      </div>
      <select
        className="cc-input w-full text-sm"
        data-spray-select="1"
        value={current?.system === system ? current.hex : ''}
        onChange={(e) => {
          const found = findColour(e.target.value);
          if (found) onPick(normaliseColour({ hex: found.hex, name: found.name, system: found.system }));
        }}
      >
        <option value="">Choose a {system} colour…</option>
        {groups.map((g) => (
          <optgroup key={g.group} label={g.group}>
            {g.colours.map((c) => (
              <option key={`${g.group}-${c.hex}-${c.name}`} value={c.hex}>{c.name}</option>
            ))}
          </optgroup>
        ))}
      </select>
      <p className="text-[10px] text-ink-400">
        RAL and Farrow &amp; Ball, as the sprayer orders them. No tiles here — a lacquer is a code on a tin,
        not a picture of a board.
      </p>
    </div>
  );
}

/** The name without the code and surface it already begins with. */
function shortName(decor) {
  return String(decor.name || '')
    .replace(new RegExp(`^${decor.code}\\s*`), '')
    .replace(new RegExp(`^${decor.texture}\\s*`), '')
    .trim();
}
