/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
import { useEffect, useState } from 'react';
import Modal from '../room/Modal.jsx';
import { Button, Field, Said } from '../controls.jsx';
import * as A from '../adapter.js';

// ─── T79 F5 · CUT EDGE: THE SMALL WINDOW AT THE CLICK ──────────────────────
//
// The owner, 18.10.2026: *"cut the corner działa idealnie, ale możesz zrobić mi
// też poziome cut? wszystkich 4 rogów?"*
//
// `NotchAsk.jsx`'s twin (KIT_NOTCH.lsp D22): the anchored shell beside the
// pointer, opened by the click on a lit edge (`3d/NotchEdges.jsx`), a click
// anywhere else closes it with nothing cut. EDGE (the four, the clicked one
// lit), DEPTH and HEIGHT open on the profile's own defaults
// (`notch.edgeDefaults`) or the edge notch the wardrobe carries; Enter cuts,
// through the store's one action, and a refusal shows HERE in the engine's own
// words. Retail's own file, drawn by `Editors` at the room's level.

const EDGES = [
  { id: 'TB', title: 'top-back: a coving' },
  { id: 'BB', title: 'bottom-back: a skirting board' },
  { id: 'TF', title: 'top-front: a bulkhead' },
  { id: 'BF', title: 'bottom-front: a plinth return' },
];

/** The window, for one lit edge. `args` is the modal's own: unitId, edge, anchor. */
export default function EdgeNotchAsk({ args }) {
  const unitId = args?.unitId || null;
  const had = A.edgeNotchOfUnit(unitId);
  const start = had || A.edgeNotchDefaults();
  const [edge, setEdge] = useState(String(args?.edge || start.edge || 'BB').toUpperCase());
  const [d, setD] = useState(String(start.d));
  const [h, setH] = useState(String(start.h));
  const [said, setSaid] = useState('');
  // DEPTH takes the caret on a short timer until it has it (NotchAsk's own answer).
  useEffect(() => {
    let id = 0;
    const until = Date.now() + 3000;
    const land = () => {
      const el = document.querySelector('[data-testid="edge-notch-ask"] [data-edge-notch-field="depth"]');
      if (el && document.activeElement !== el) { el.focus(); el.select?.(); }
      if ((!el || document.activeElement !== el) && Date.now() < until) id = setTimeout(land, 30);
    };
    id = setTimeout(land, 0);
    return () => clearTimeout(id);
  }, []);
  if (!unitId || !args?.edge) return null;

  const cut = () => {
    const res = A.cutEdge(unitId, edge, { d: Number(d), h: Number(h) });
    if (!res.ok) setSaid(res.said);
  };
  const field = (label, key, value, onChange) => (
    <Field label={label} key={key}>
      <input
        className="pbi-field pbi-numfield"
        type="text"
        data-edge-notch-field={key}
        value={value}
        onFocus={(e) => e.target.select()}
        onChange={(e) => { onChange(e.target.value); setSaid(''); }}
      />
    </Field>
  );

  return (
    <Modal
      name="edge-notch"
      title={`CUT EDGE ${edge}`}
      anchor={args?.anchor || null}
      width="pbi-re-w260"
      onClose={A.dismissCutEdge}
    >
      <form
        data-testid="edge-notch-ask"
        data-edge-notch-edge={edge}
        data-edge-notch-unit={unitId}
        onSubmit={(e) => { e.preventDefault(); cut(); }}
      >
        <Field label="EDGE">
          <div className="pbi-duty-actions" data-edge-notch-field="edge">
            {EDGES.map((c) => (
              <Button
                key={c.id}
                kind={edge === c.id ? 'primary' : 'secondary'}
                size="small"
                data-edge-notch-choice={c.id}
                title={c.title}
                onClick={() => { setEdge(c.id); setSaid(''); }}
              >
                {c.id}
              </Button>
            ))}
          </div>
        </Field>
        {field('DEPTH', 'depth', d, setD)}
        {field('HEIGHT', 'height', h, setH)}
        {/* T79 F5, the small information: PRO's help line, word for word. */}
        <p className="pbi-choice pbi-field-note" data-testid="edge-notch-help">A rebate along the whole edge: skirting at the bottom-back, coving at the top-back.</p>
        <div className="pbi-duty-actions">
          <Button kind="primary" size="small" type="submit" data-testid="edge-notch-cut">CUT</Button>
        </div>
        {said ? <Said testid="edge-notch-said">{said}</Said> : null}
      </form>
    </Modal>
  );
}
