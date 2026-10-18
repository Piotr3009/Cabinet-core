import { useEffect, useState } from 'react';
import Modal from '../room/Modal.jsx';
import { Button, Field, Said } from '../controls.jsx';
import * as A from '../adapter.js';

// ─── T75 F7 · CUT CORNER: THE SMALL WINDOW AT THE CLICK ────────────────────
//
// The owner, 23.09.2026: *"Klikasz 'wytnij narożnik', program podświetla
// narożniki, wybierasz, podajesz wysokość, głębokość, szerokość (np.
// 200x200)."*
//
// The same kind of window the side ask is (T74 F1, `AddPanelAsk.jsx`): the
// anchored shell (`room/Modal.jsx`) beside the pointer, opened by the click on
// a lit corner (`3d/NotchCorners.jsx`), and a click anywhere else closes it
// with nothing cut. Three fields, WIDTH, DEPTH and HEIGHT, open on the
// profile's own defaults (`notch.defaults`: 200, 200, full); Enter cuts,
// through the store's one action, and a refusal shows HERE in the engine's
// own words. Retail's own file, drawn by `Editors` at the room's level.

// T79 F4 (KIT_NOTCH.lsp D21): a negative HEIGHT, from the top, shows as itself.
const heightText = (h) => (Number(h) ? String(Math.round(Number(h))) : 'full');

/** The window, for one lit corner. `args` is the modal's own: unitId, corner, anchor. */
export default function NotchAsk({ args }) {
  const unitId = args?.unitId || null;
  const corner = args?.corner || null;
  const had = A.notchOfUnit(unitId);
  const start = had?.corner === corner ? had : A.notchDefaults();
  const [w, setW] = useState(String(start.w));
  const [d, setD] = useState(String(start.d));
  const [h, setH] = useState(heightText(start.h));
  const [said, setSaid] = useState('');
  // WIDTH takes the caret on a short timer until it has it (the shell measures
  // itself in a hidden frame first; PRO's size window's own answer, T74 F7).
  useEffect(() => {
    let id = 0;
    const until = Date.now() + 3000;
    const land = () => {
      const el = document.querySelector('[data-testid="notch-ask"] [data-notch-field="width"]');
      if (el && document.activeElement !== el) { el.focus(); el.select?.(); }
      if ((!el || document.activeElement !== el) && Date.now() < until) id = setTimeout(land, 30);
    };
    id = setTimeout(land, 0);
    return () => clearTimeout(id);
  }, []);
  if (!unitId || !corner) return null;

  const cut = () => {
    const height = /^\s*(full|0)?\s*$/i.test(h) ? 0 : Number(h);
    const res = A.cutCorner(unitId, corner, { w: Number(w), d: Number(d), h: height });
    if (!res.ok) setSaid(res.said);
  };
  // Retail's own row (`controls.Field`) and its own millimetre box's class;
  // a text box, because HEIGHT says "full" where the notch runs top to bottom.
  const field = (label, key, value, onChange, autoFocus = false) => (
    <Field label={label} key={key}>
      <input
        className="pbi-field pbi-numfield"
        type="text"
        data-notch-field={key}
        value={value}
        autoFocus={autoFocus}
        onFocus={(e) => e.target.select()}
        onChange={(e) => { onChange(e.target.value); setSaid(''); }}
      />
    </Field>
  );

  return (
    <Modal
      name="notch"
      title={`CUT CORNER ${corner}`}
      anchor={args?.anchor || null}
      width="pbi-re-w260"
      onClose={A.dismissCutCorner}
    >
      <form
        data-testid="notch-ask"
        data-notch-corner={corner}
        data-notch-unit={unitId}
        onSubmit={(e) => { e.preventDefault(); cut(); }}
      >
        {field('WIDTH', 'width', w, setW, true)}
        {field('DEPTH', 'depth', d, setD)}
        {field('HEIGHT', 'height', h, setH)}
        {/* T79 F4, the owner: *"i mała informacja o tym."* PRO's help line, word for word. */}
        <p className="pbi-choice pbi-field-note" data-testid="notch-help">WIDTH along the back, DEPTH into the carcass, HEIGHT from the floor; 0 runs top to bottom; a negative HEIGHT cuts from the top (e.g. -500).</p>
        <div className="pbi-duty-actions">
          <Button kind="primary" size="small" type="submit" data-testid="notch-cut">CUT</Button>
        </div>
        {said ? <Said testid="notch-said">{said}</Said> : null}
      </form>
    </Modal>
  );
}
