import { useEffect, useMemo, useState } from 'react';
import Modal from './Modal.jsx';
import { DECOR_DISCLAIMER, filterDecors, finishIdForDecor } from '../engine/decors.js';
import { loadDecorCatalogue } from '../lib/decorCatalogue.js';
import { familiesInCatalogue, filterByFamily } from '../lib/decorFamilies.js';
import { filterVeneers, getVeneers, veneerFinishId, veneerLabel } from '../engine/veneers.js';
import { COLOUR_SYSTEMS, contrastInk, findColour } from '../lib/pswColors.js';
import { normaliseColour } from '../engine/design.js';
import { TILE_SWATCH_PX } from '../lib/wizardTabs.js';
import { decorShortName } from '../lib/chosenDecor.js';

// ─── THE PICKER, AS THE MOCKUP DRAWS IT (turn 45, CLAUDE.md F3) ─────────────
//
// The owner, 23.08.2026, on what T44 shipped: *"okno w oknie, roll w dół,
// wkurw na maxa."* T44 had answered a WINDOW-OVER-WINDOW complaint by making
// the picker a panel INSIDE the wizard's scroll — which produced the other
// half of the same offence, a scrolling grid inside a scrolling step inside a
// draggable window. Three scrollbars, and the tile you wanted was behind two
// of them.
//
// The approved mockup, same day, is this file:
//
//   · the tab shows ONE slot, `Choose decor…` (components/ChosenDecorTile.jsx);
//   · clicking it opens a SEPARATE modal with a backdrop and ITS OWN SINGLE
//     SCROLLING GRID — search on top, a FAMILY filter bar, large tiles;
//   · clicking a tile chooses it AND CLOSES the window. One click, one answer,
//     nothing to scroll back up to.
//
// ─── NO SCROLL-IN-SCROLL, NO WINDOW-OVER-WINDOW, EVER (F3, verbatim) ────────
//
// Both halves of that sentence are structural here, not a promise:
//
//   window-over-window  the wizard step behind this window renders the SLOT and
//                       nothing else — there is no grid in the tab at all, so
//                       there is no second picker for this one to sit on top of.
//   scroll-in-scroll    the modal's BODY does not scroll. `Modal` gives its
//                       content `overflow-y-auto`, so this window hands it a
//                       column that is exactly the window's height (`h-full`,
//                       `min-h-0`) with the grid as the ONE `overflow-y-auto`
//                       inside it. The search box and the family bar are pinned
//                       above it and the licence note below it; neither scrolls,
//                       and neither can be scrolled past.
//
// The window is the shell's (rule 15): draggable by its header, and opened
// BESIDE the control that asked for it — the slot hands its own rectangle in as
// the anchor.
//
// ════════════════════════════════════════════════════════════════════════════
// EGGER IMAGE LICENCE — unchanged, and it travels with the picture
// (EGGER General Terms for Image Use; see engine/decors.js)
//
//   * a thumbnail is the WHOLE board scan reduced — never cropped, tiled or
//     recoloured;
//   * ATTRIBUTION IS MANDATORY and sits next to the image, inside the same
//     control, so there is no state in which one appears without the other;
//   * the pictures never go on 3D geometry — choosing one stores an id, and
//     `engine/decors.js` turns that into our own grain tinted with the decor's
//     hex (test/decors.test.js holds that line).
// ════════════════════════════════════════════════════════════════════════════

const TITLE = {
  decor: 'Choose a laminate decor',
  veneer: 'Choose a veneer',
  colour: 'Choose a sprayed colour',
};

/**
 * @param {object} props
 *   picker    'decor' | 'veneer' | 'colour' — engine/projectSettings.js's word
 *   slotLabel what is being chosen FOR, in the header
 *   value     the finish id already chosen, if any
 *   colour    the sprayed colour already chosen, if any
 *   anchor    the rectangle of the control that opened this (rule 15)
 *   onPick    (finishId) => void        — decor and veneer
 *   onColour  (colourRecord) => void    — spraying
 *   onClose   the ×, Escape, a click on the backdrop
 */
export default function DecorPickerModal({
  picker = 'decor', slotLabel = 'Material', value = null, colour = null,
  anchor = null, onPick = null, onColour = null, onClose = null,
}) {
  return (
    <Modal
      name="decor-picker"
      title={`${TITLE[picker] || TITLE.decor} — ${slotLabel}`}
      anchor={anchor}
      width="w-[860px]"
      // A picker is a DECISION, and everything behind it is the thing the
      // decision is about. The backdrop is deliberate: F3 asks for one by name
      // ("a SEPARATE modal (backdrop…)"), and it is what stops the eye reading
      // the step underneath as a second, competing list.
      dim
      onClose={onClose}
      className="h-[620px] max-h-[86vh]"
    >
      <div className="flex flex-col h-full min-h-0" data-decor-picker-modal={picker}>
        {picker === 'decor' && <DecorGrid value={value} onPick={onPick} />}
        {picker === 'veneer' && <VeneerBody value={value} onPick={onPick} />}
        {picker === 'colour' && <SprayBody value={colour} onPick={onColour} />}
      </div>
    </Modal>
  );
}

/**
 * LAMINAT — the big tiles, the search that filters as you type, and the family
 * bar. The grid is the ONLY scrolling region in the window.
 */
function DecorGrid({ value, onPick }) {
  const [state, setState] = useState({ decors: [], error: null, loading: true });
  const [query, setQuery] = useState('');
  const [family, setFamily] = useState(null);

  useEffect(() => {
    let alive = true;
    loadDecorCatalogue().then((res) => {
      if (alive) setState({ decors: res.decors, error: res.error, loading: false });
    });
    return () => { alive = false; };
  }, []);

  const families = useMemo(() => familiesInCatalogue(state.decors), [state.decors]);
  const shown = useMemo(
    () => filterByFamily(filterDecors(state.decors, { category: null, query }), family),
    [state.decors, query, family],
  );

  return (
    <>
      {/* ── pinned: the search ── */}
      <div className="flex items-center gap-2 shrink-0">
        <input
          className="cc-input flex-1 text-sm"
          autoFocus
          data-decor-search="1"
          placeholder="Type to filter — H1180, oak, white…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <span className="text-[11px] text-ink-400 shrink-0" data-decor-count="1">
          {shown.length} of {state.decors.length}
        </span>
      </div>

      {/* ── pinned: the FAMILY bar — EGGER's own taxonomy (lib/decorFamilies.js) ── */}
      <div className="flex items-center gap-1 flex-wrap mt-2 shrink-0" data-decor-families="1">
        <button
          type="button"
          data-decor-family="all"
          aria-pressed={family === null}
          className={`cc-btn px-2 ${family === null ? 'border-gold text-gold' : ''}`}
          onClick={() => setFamily(null)}
        >
          All
        </button>
        {families.map((f) => (
          <button
            key={f.id}
            type="button"
            data-decor-family={f.id}
            aria-pressed={family === f.id}
            title={`${f.count} decor${f.count === 1 ? '' : 's'}`}
            className={`cc-btn px-2 ${family === f.id ? 'border-gold text-gold' : ''}`}
            onClick={() => setFamily((cur) => (cur === f.id ? null : f.id))}
          >
            {f.label}
          </button>
        ))}
      </div>

      {state.loading && <p className="text-[11px] text-ink-400 py-4 shrink-0">Loading the decor pack…</p>}
      {state.error && (
        <p className="text-[11px] text-status-warn py-2 shrink-0">
          The decor pack could not be read ({state.error}). The finishes this app ships with are still available.
        </p>
      )}
      {!state.loading && !state.error && shown.length === 0 && (
        <p className="text-[11px] text-ink-400 py-4 shrink-0" data-decor-empty="1">
          Nothing matches “{query}”{family ? ' in that family' : ''}.
        </p>
      )}

      {/* ── THE ONE SCROLLING REGION IN THIS WINDOW ── */}
      <div
        // `auto-rows-min` is not decoration. A grid row is `auto` by default,
        // and a tile whose picture is `loading="lazy"` inside an
        // `overflow-hidden` button contributes almost nothing to that
        // measurement — every row came out 15.75 px tall and every tile was
        // clipped to a sliver, which is very likely what the owner was looking
        // at when he said *"roll w dół, nic nie widać"*. Sized to their own
        // content, the rows are 153 px and the grid has something to scroll.
        className="grid gap-2 overflow-y-auto cc-scroll pr-1 mt-2 flex-1 min-h-0 content-start auto-rows-min"
        data-decor-grid="1"
        data-only-scroller="1"
        style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${TILE_SWATCH_PX + 44}px, 1fr))` }}
      >
        {shown.map((decor) => {
          const id = finishIdForDecor(decor);
          const selected = value === id;
          return (
            <button
              key={decor.id}
              type="button"
              title={`EGGER ${decor.code} ${decor.name}`}
              aria-pressed={selected}
              data-egger-tile={decor.id}
              data-decor-finish={id}
              className={`text-left rounded border overflow-hidden transition-colors ${selected
                ? 'border-gold ring-1 ring-gold'
                : 'border-shell-600 hover:border-ink-400'}`}
              // ONE CLICK, ONE ANSWER: chosen, and the window closes. The close
              // is the caller's (`onPick` is what the wizard wired to it), so
              // there is no second path out that could leave it open.
              onClick={() => onPick?.(id, decor)}
            >
              {decor.thumb ? (
                <img
                  src={decor.thumb}
                  alt={`EGGER ${decor.code} ${decor.name}`}
                  loading="lazy"
                  className="w-full object-cover block"
                  style={{ height: TILE_SWATCH_PX }}
                />
              ) : (
                <span className="w-full block" style={{ height: TILE_SWATCH_PX, background: decor.hex }} />
              )}
              {/* MANDATORY attribution, in the same control as the picture. */}
              <span className="block px-2 py-1.5 leading-tight">
                <span className="block text-[13px] text-ink-50 truncate">{decor.code}</span>
                <span className="block text-[11px] text-ink-300 truncate">{decorShortName(decor)}</span>
                <span className="block text-[10px] text-gold">EGGER · {decor.texture}</span>
              </span>
            </button>
          );
        })}
      </div>

      <p className="text-[10px] text-ink-400 pt-2 shrink-0">{DECOR_DISCLAIMER}</p>
    </>
  );
}

/**
 * VENEER — a LIST, because no tile assets exist for one
 * (engine/veneers.js says so and says why). It is in the SAME window as the
 * decor grid so that "choose what this is made of" is one gesture whatever the
 * category, and it renders back into the SAME single tile.
 */
function VeneerBody({ value, onPick }) {
  const veneers = getVeneers();
  const [query, setQuery] = useState('');
  const shown = useMemo(() => filterVeneers(veneers, { query }), [veneers, query]);

  return (
    <>
      <div className="flex items-center gap-2 shrink-0">
        <input
          className="cc-input flex-1 text-sm"
          autoFocus
          data-veneer-search="1"
          placeholder="oak, hickory…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <span className="text-[11px] text-ink-400 shrink-0">{shown.length} of {veneers.length}</span>
      </div>
      <ul
        className="mt-2 flex-1 min-h-0 overflow-y-auto cc-scroll pr-1 space-y-1"
        data-veneer-list="1"
        data-only-scroller="1"
      >
        {shown.map((v) => {
          const id = veneerFinishId(v);
          return (
            <li key={v.id}>
              <button
                type="button"
                data-veneer-option={v.id}
                aria-pressed={value === id}
                className={`w-full text-left border rounded px-3 py-2 flex items-center gap-3 transition-colors ${
                  value === id ? 'border-gold text-gold' : 'border-shell-600 hover:bg-shell-700'}`}
                onClick={() => onPick?.(id, v)}
              >
                <span
                  className="w-8 h-8 rounded border border-shell-600 shrink-0"
                  style={{ background: v.hex || '#C2A485' }}
                />
                <span className="min-w-0">
                  <span className="block text-sm text-ink-50 truncate">{v.label} veneer</span>
                  {/* the borrowed scan's MANDATORY credit */}
                  <span className="block text-[10px] text-gold truncate">{veneerLabel(v)}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="text-[10px] text-ink-400 pt-2 shrink-0">
        The workshop’s own scanned veneers drop into this list as data.
      </p>
    </>
  );
}

/**
 * SPRAY — a LIST, and the owner has said so twice: *"bez cholernych kafelek"*,
 * and *"Spray: dropdown list, NO tiles"*. There is no swatch GRID in this
 * function and no branch that could grow one: what is drawn is a list of named
 * colours with a chip each, which is how a sprayer reads a fan deck, and what
 * comes back is the same single large tile every other source comes back as
 * (F3: *"one chosen-decor format across laminate / veneer / spraying"*).
 */
function SprayBody({ value, onPick }) {
  const current = normaliseColour(value);
  const [system, setSystem] = useState(current?.system === 'F&B' ? 'F&B' : 'RAL');
  const [query, setQuery] = useState('');
  const groups = COLOUR_SYSTEMS.find((s) => s.id === system)?.groups || [];
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out = [];
    for (const g of groups) {
      for (const c of g.colours) {
        if (q && !`${c.name} ${c.hex}`.toLowerCase().includes(q)) continue;
        out.push({ ...c, group: g.group });
      }
    }
    return out;
  }, [groups, query]);

  return (
    <>
      <div className="flex items-center gap-2 shrink-0">
        {COLOUR_SYSTEMS.map((s) => (
          <button
            key={s.id}
            type="button"
            data-spray-system={s.id}
            aria-pressed={system === s.id}
            className={`cc-btn px-2 ${system === s.id ? 'border-gold text-gold' : ''}`}
            onClick={() => setSystem(s.id)}
          >
            {s.label}
          </button>
        ))}
        <input
          className="cc-input flex-1 text-sm"
          autoFocus
          data-spray-search="1"
          placeholder={`Type to filter the ${system} list…`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <span className="text-[11px] text-ink-400 shrink-0">{rows.length}</span>
      </div>
      <ul
        className="mt-2 flex-1 min-h-0 overflow-y-auto cc-scroll pr-1 space-y-1"
        data-spray-list="1"
        data-only-scroller="1"
      >
        {rows.map((c) => (
          <li key={`${c.group}-${c.hex}-${c.name}`}>
            <button
              type="button"
              data-spray-option={c.hex}
              aria-pressed={current?.hex === c.hex}
              className={`w-full text-left border rounded px-3 py-2 flex items-center gap-3 transition-colors ${
                current?.hex === c.hex ? 'border-gold text-gold' : 'border-shell-600 hover:bg-shell-700'}`}
              onClick={() => {
                const found = findColour(c.hex) || c;
                onPick?.(normaliseColour({ hex: found.hex, name: found.name, system: found.system || system }));
              }}
            >
              <span
                className="w-8 h-8 rounded border border-shell-600 shrink-0 flex items-center justify-center text-[9px]"
                style={{ background: c.hex, color: contrastInk(c.hex) }}
              >
                {system}
              </span>
              <span className="min-w-0">
                <span className="block text-sm text-ink-50 truncate">{c.name}</span>
                <span className="block text-[10px] text-ink-400 truncate">{c.group} · {c.hex}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p className="text-[10px] text-ink-400 pt-2 shrink-0">
        RAL and Farrow &amp; Ball, as the sprayer orders them. No tiles here — a lacquer is a code on a tin,
        not a picture of a board.
      </p>
    </>
  );
}
