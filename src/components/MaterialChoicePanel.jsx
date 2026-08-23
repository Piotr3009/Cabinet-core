import { useEffect, useRef, useState } from 'react';
import { loadDecorCatalogue } from '../lib/decorCatalogue.js';
import { chosenTile } from '../lib/chosenDecor.js';
import ChosenDecorTile from './ChosenDecorTile.jsx';
import DecorPickerModal from './DecorPickerModal.jsx';

// ─── THE TAB SIDE OF THE PICKER (turn 44 F4, REBUILT turn 45 F3) ────────────
//
// T44 moved the picker OUT of a floating window and INTO the step, because the
// owner had said *"okno w oknie, przesuwamy, nic nie widać, gubimy się."* The
// grid came with it, and on 23.08 he met the result and said the other half of
// the same sentence: *"okno w oknie, roll w dół, wkurw na maxa."* A grid inside
// a scrolling step inside a draggable window is three scrollbars deep, and the
// tile he wanted was behind two of them.
//
// So the approved mockup splits the two jobs that had been fighting each other
// inside this file:
//
//   THIS FILE, in the tab   ONE slot — `Choose decor…` — and, once something is
//                           chosen, exactly ONE tile with `Change`. No grid, no
//                           list, no scrolling region of any kind. What the tab
//                           shows about a material is a decision, not a
//                           catalogue.
//   DecorPickerModal.jsx    the catalogue: its own window, its own backdrop,
//                           its own single scrolling grid, a search and a family
//                           bar. Click a tile = chosen, and the window closes.
//
// The category strip (Laminate | Veneer | Spraying) stays HERE, above the slot,
// because it is what the slot is FOR — the three categories are the three
// sources the project already stores (`sourceSeg` in WizardSettings.jsx), and a
// second vocabulary for them is how the two drift. The stock-board select stays
// here for the same reason: it answers "what board is this cut from", which is
// not a picture and never belonged in a picture picker.
//
// ─── ONE CHOSEN-DECOR FORMAT (F3, verbatim) ─────────────────────────────────
//
// *"Spraying: picked from the list, but once picked it renders as the SAME
// large tile (colour swatch + name) — one chosen-decor format across laminate /
// veneer / spraying."* The tile is `components/ChosenDecorTile.jsx` and what
// fills it is `lib/chosenDecor.js` — one component and one resolver, so this
// tab and the wizard's own Summary cannot disagree about what the job is faced
// in.

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
  // The catalogue, for the ONE tile's picture and words. It is already loaded
  // once at the top of the app (`App.jsx`); `loadDecorCatalogue` shares that
  // one request rather than making a second.
  const [decors, setDecors] = useState([]);
  useEffect(() => {
    let alive = true;
    loadDecorCatalogue().then((res) => {
      if (alive && Array.isArray(res.decors)) setDecors(res.decors);
    });
    return () => { alive = false; };
  }, []);

  // Rule 15: the window opens BESIDE the control that asked for it, so the
  // control hands its own rectangle in.
  const [open, setOpen] = useState(null); // { anchor }
  const slotBox = useRef(null);
  const openPicker = () => {
    const r = slotBox.current?.getBoundingClientRect();
    setOpen({
      anchor: r ? {
        x: r.left, y: r.top, width: r.width, height: r.height,
      } : null,
    });
  };

  const tile = chosenTile({
    picker, value, colour, decors,
  });
  const slotId = `${kind}:${slot?.id || ''}`;

  return (
    <div
      className="border border-shell-600 rounded-lg p-3 space-y-3 w-full"
      data-material-panel={slotId}
      data-material-picker-kind={picker || 'none'}
    >
      <div>
        <span className="block text-[11px] uppercase tracking-[0.16em] text-gold">
          {title || `${slot?.label || 'Material'} — what is it made of?`}
        </span>
        <span className="block text-[10px] text-ink-400">
          One slot here, the whole catalogue in its own window — never a window over a window.
        </span>
      </div>

      {/* ── the three categories, separated hard ── */}
      <div data-material-categories="1">{categoryStrip}</div>

      {/* ── the ONE slot, or the ONE tile it became ── */}
      <div ref={slotBox} data-material-slot-box={slotId}>
        {picker ? (
          <ChosenDecorTile
            tile={tile}
            slot={slotId}
            label={slot?.label || 'Material'}
            onOpen={openPicker}
          />
        ) : (
          <p className="text-[11px] text-ink-400">This source has no picker yet — the board below is the answer.</p>
        )}
      </div>

      {tile && onClear && (
        <button type="button" className="cc-btn-ghost px-2" data-decor-clear="1" onClick={onClear}>
          Clear
        </button>
      )}

      {boardSelect}
      {footer}

      {open && picker && (
        <DecorPickerModal
          picker={picker}
          slotLabel={slot?.label || 'Material'}
          value={value}
          colour={colour}
          anchor={open.anchor}
          onClose={() => setOpen(null)}
          // ONE CLICK, ONE ANSWER: chosen, and the window closes.
          onPick={(id) => {
            if (picker === 'veneer') onVeneer?.(id); else onDecor?.(id);
            setOpen(null);
          }}
          onColour={(c) => { onColour?.(c); setOpen(null); }}
        />
      )}
    </div>
  );
}
