import { useState } from 'react';
import Modal from '../room/Modal.jsx';
import { Button, Said } from '../controls.jsx';
import * as A from '../adapter.js';

// ─── TURN 73 · F2 · CLICK THE OUTSIDE OF A SIDE, AND IT ASKS ───────────────
//
// The owner, 23.09.2026:
//
//   *"jak klikniesz na bok szafy z zewnątrz, żeby się pokazywało add panel
//   (Yes / No), to będzie bardzo intuicyjne."*
//
// ─── TURN 74 · F1 · A SMALL MODAL AT THE CLICK ─────────────────────────────
//
// The owner, retesting it: *"a jak nic nie naciśniesz i klikniesz na coś
// innego to znika mały modal jak wymiary lub j pull hands."*
//
// So the question is the same kind of window the dimension label opens
// (`UnitSizeModal`) and the J-pull run window: the anchored shell
// (`room/Modal.jsx`), beside the pointer, and a click anywhere else closes it
// (the shell's own pointer-down outside) with nothing added. It is rendered by
// `Editors` at the room's level and never in the dock, so the right-hand
// panel does not open for the click.
//
// YES is the EXTRAS road (`addEndPanelByHand`), so the panel is the client's
// own and the automat never takes it back off; the question closes and the
// panel's own docked menu opens (T72 F1). Where the store refuses (no room,
// between two flush wardrobes), its own sentence shows HERE, inside the
// question. NO closes it.

/** The question, for one bare side. `args` is the modal's own: unit, panel, side, anchor. */
export default function AddPanelAsk({ args }) {
  const [said, setSaid] = useState('');
  const unitId = args?.unitId || null;
  const side = args?.side === 'R' ? 'R' : 'L';
  if (!unitId) return null;

  return (
    <Modal
      name="add-panel"
      title="ADD END PANEL?"
      anchor={args?.anchor || null}
      width="pbi-re-w260"
      onClose={A.closeEditor}
    >
      <div data-testid="add-panel-ask" data-add-panel-side={side} data-add-panel-unit={unitId}>
        <div className="pbi-duty-actions">
          <Button
            kind="primary"
            size="small"
            data-testid="add-panel-yes"
            onClick={() => {
              const res = A.addEndPanelFromAsk(unitId, side);
              if (!res.ok) setSaid(res.said || '');
            }}
          >
            YES
          </Button>
          <Button
            kind="secondary"
            size="small"
            data-testid="add-panel-no"
            onClick={() => A.dismissSideAsk()}
          >
            NO
          </Button>
        </div>
        {said ? <Said testid="add-panel-said">{said}</Said> : null}
      </div>
    </Modal>
  );
}
