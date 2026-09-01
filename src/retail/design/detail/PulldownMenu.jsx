import Button from '../../ui/Button.jsx';
import { Field, NumberField } from '../controls.jsx';
import { REASONS } from '../reasons.js';
import Duty, { DutyRow } from './Duty.jsx';
import * as A from '../adapter.js';

// ─── T60 F3.8 · THE PULL-DOWN RAIL ─────────────────────────────────────────
//
// POSITION, measured the way the owner measures it (30.08): *"wys. drążka od
// góry"* — the parked rod's drop from under the top. That is exactly the frame
// `engine/cabinet.js` reads `pos_mm` in, so the slider writes the number the
// engine reads and there is no translation to get wrong.
//
// The far end is the point at which the mechanism's body would stand on the
// base; both numbers are the profile's own
// (`wardrobeAccessories.kits.pulldown_rail`).
//
// UNDER A SLOPE IT IS NOT ADDABLE AT ALL, and the INTERIOR list already says
// why in the store's own words (T58 F4, `unitUnderSlope`). A menu that is only
// reached by clicking one that exists never has to repeat it.

export default function PulldownMenu({ unitId, item, onBack, onDone, onRemoved }) {
  const travel = A.pulldownTravel(unitId, item?.id);
  if (!travel) return null;
  return (
    <Duty title="PULL-DOWN RAIL" onBack={onBack} onDone={onDone}>
      <Field label="HOW FAR DOWN FROM THE TOP">
        <NumberField
          outOfRange={REASONS.outOfRange}
          testid="pulldown-drop"
          min={travel.min}
          max={travel.max}
          standardAt={travel.standard}
          value={travel.drop}
          onCommit={(v) => A.setPulldownDrop(unitId, item.id, v)}
        />
      </Field>

      <DutyRow>
        <Button
          kind="secondary"
          data-testid="pulldown-remove"
          onClick={() => { A.removeElement(unitId, item.id); onRemoved(); }}
        >
          REMOVE
        </Button>
      </DutyRow>
    </Duty>
  );
}
