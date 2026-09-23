import { useState } from 'react';
import { Button, Field, Said } from '../controls.jsx';
import * as A from '../adapter.js';

// ─── TURN 73 · F2 · CLICK THE OUTSIDE OF A SIDE, AND IT ASKS ───────────────
//
// The owner, 23.09.2026:
//
//   *"jak klikniesz na bok szafy z zewnątrz, żeby się pokazywało add panel
//   (Yes / No), to będzie bardzo intuicyjne."*
//
// Shown only for a side with no end panel and no neighbour covering it
// (`adapter.sideAskFor`). YES is the EXTRAS road (`addEndPanelByHand`), so the
// panel is the client's own and the automat never takes it back off; the
// panel's own menu opens straight after. NO closes the question.

/** The question, for one bare outer side. */
export default function AddPanelAsk({ unitId, panel }) {
  const [said, setSaid] = useState('');
  const ask = A.sideAskFor(unitId, panel);
  if (!ask) return null;

  return (
    <div className="pbi-interior-more" data-testid="dock-add-panel" data-add-panel-side={ask.side}>
      <Field label="ADD END PANEL?">
        <div className="pbi-duty-actions">
          <Button
            kind="primary"
            size="small"
            data-testid="add-panel-yes"
            onClick={() => {
              const res = A.addEndPanelFromAsk(unitId, ask.side);
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
      </Field>
      {said ? <Said testid="add-panel-said">{said}</Said> : null}
    </div>
  );
}
