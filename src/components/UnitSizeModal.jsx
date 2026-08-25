import { useEffect, useMemo, useState } from 'react';
import Modal from './Modal.jsx';
import NumberField from './NumberField.jsx';
import { useProjectStore } from '../stores/projectStore.js';
import { useUiStore } from '../stores/uiStore.js';
import { formatMm } from '../engine/format.js';

// ─── F8: THE FIGURE ON THE CANVAS IS A CONTROL (turn 31, CLAUDE.md F8) ──────
//
// "Double-click the width or height figure on the canvas → a small modal
// (through F1's shell, beside the click) with width and height fields; commit
// on Enter. Existing engine setters; nothing new in the engine."
//
// EXISTING SETTERS is the whole specification of what this may do. `800` drawn
// under a cabinet is the number `updateUnitParams` already owns, with a clamp
// that already refuses a width that would eat a neighbour ("Width limited to
// 600 mm by 02"). This window types into that setter and nothing else — it
// computes nothing, clamps nothing and knows no rule.
//
// ─── BOTH FIELDS, WHICHEVER FIGURE WAS CLICKED ──────────────────────────────
//
// The owner asked for a window "with width and height fields", not for a
// width window and a height window. A joiner who double-clicks 800 because he
// meant to change 770 has not made a mistake he should have to close a window
// to fix. The figure that was clicked takes the focus, which is the whole of
// the difference between the two cases.
//
// ─── COMMIT ON ENTER ────────────────────────────────────────────────────────
//
// `NumberField` already commits on Enter and on blur (turn 11), so this window
// inherits it and adds only what a mini modal owes: Enter anywhere in it
// closes, because a two-field window that has to be dismissed separately is a
// window with one gesture too many.

export default function UnitSizeModal() {
  const args = useUiStore((s) => s.modalArgs);
  const closeModal = useUiStore((s) => s.closeModal);
  const notify = useUiStore((s) => s.notify);
  const units = useProjectStore((s) => s.units);
  const updateUnitParams = useProjectStore((s) => s.updateUnitParams);
  const roomFitRefusalFor = useProjectStore((s) => s.roomFitRefusalFor);

  const unitId = args?.unitId || null;
  const unit = useMemo(() => units.find((u) => u.id === unitId) || null, [units, unitId]);
  // Which figure was double-clicked — the one that takes the focus.
  const [focus] = useState(args?.field === 'height' ? 'height' : 'width');
  // ─── FOCUSED BY HAND, NOT BY `autoFocus` ─────────────────────────────────
  //
  // The shell renders a window `visibility: hidden` until it has MEASURED
  // itself and worked out where it stands (turn 12 — a modal drawn at a guessed
  // position flashes across the screen first). React's `autoFocus` fires on
  // mount, which is during that hidden frame, and a hidden element does not
  // take focus. One frame later it does.
  //
  // Found by its own data attribute rather than by a ref handed to
  // `NumberField`: that component keeps an internal ref for its own select and
  // blur, and a second one spread over it through `...rest` would quietly take
  // it away. Reaching for the node this window already labels costs one query
  // and breaks nothing.
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const el = document.querySelector(
        focus === 'height' ? '[data-unit-size-height]' : '[data-unit-size-width]',
      );
      el?.focus();
      el?.select?.();
    });
    return () => cancelAnimationFrame(id);
  }, [focus]);

  // Enter closes the window, wherever the caret is. The FIELD has already
  // committed by then (NumberField commits on Enter), so this is the second
  // half of one gesture rather than a second gesture.
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Enter') closeModal(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closeModal]);

  if (!unit) return null;

  /** One field, straight into the existing setter. */
  const set = (key) => (value) => {
    // ─── TURN 50 (CLAUDE.md F3): …AND THE ROOM REFUSES FIRST ────────────────
    //
    // The owner: *"dlaczego pozwala system dodawać top box powyżej rozmiaru
    // pokoju? to powinno być blokada."*  CLAUDE.md names the two surfaces where
    // the guard sits — the parameter panel and THIS window — because they are
    // the two places a number is TYPED. Still no rule of this window's own: the
    // question is the store's (`roomFitRefusalFor` → `engine/roomFit.js`), and
    // what this does with the answer is print it.
    const no = roomFitRefusalFor(unit.id, { [key]: value });
    if (no) { notify(no.message, 'warn'); return; }
    const res = updateUnitParams(unit.id, { [key]: value });
    // The setter's own clamp SPEAKS when it refuses — "Width limited to 600 mm
    // by 02" — and this window is the surface it speaks through. Nothing here
    // decides what is allowed.
    for (const note of res?.notices || []) notify(note, 'warn');
  };

  return (
    <Modal
      name="unit-size"
      title={`${unit.params.unit_num || unit.id} · size`}
      anchor={args?.anchor || null}
      width="w-[260px]"
      onClose={closeModal}
      footer={(
        <button type="button" className="cc-btn-gold" onClick={closeModal}>Done</button>
      )}
    >
      <div className="space-y-2" data-unit-size={unit.id}>
        <label className="cc-row" htmlFor={`size-w-${unit.id}`}>
          <span className="cc-label mb-0">Width</span>
          <NumberField
            id={`size-w-${unit.id}`}
            className="cc-input text-right w-[110px]"
            data-unit-size-width="1"
            value={unit.params.width}
            onCommit={set('width')}
          />
        </label>
        <label className="cc-row" htmlFor={`size-h-${unit.id}`}>
          <span className="cc-label mb-0">Height</span>
          <NumberField
            id={`size-h-${unit.id}`}
            className="cc-input text-right w-[110px]"
            data-unit-size-height="1"
            value={unit.params.height}
            onCommit={set('height')}
          />
        </label>
        <p className="text-[11px] text-ink-400">
          {formatMm(unit.params.width)} × {formatMm(unit.params.height)} mm.
          Enter commits and closes. The same setter the right-hand panel uses —
          a width that would eat a neighbour is refused there and refused here.
        </p>
      </div>
    </Modal>
  );
}
