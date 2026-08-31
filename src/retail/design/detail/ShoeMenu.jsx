import Button from '../../ui/Button.jsx';
import { Field, Said } from '../controls.jsx';
import Duty, { DutyRow } from './Duty.jsx';
import { ShoeDrawing } from './drawings.jsx';
import * as A from '../adapter.js';

// ─── T60 F3.7 · THE SHOE DRAWER ────────────────────────────────────────────
//
// T58 F2 fixed the ramp and its dividers, and the owner fixed the count in his
// own words: *"po prostu daj 2 zawsze."* There is no field for the tilt, none
// for the divider count, and none for anything else that goes in this box.
//
// So this menu has NO CONTROLS BUT ONE, and that is the no-dead-control law
// doing its work rather than failing it: a chip row here would be four ways of
// choosing what the workshop has already decided. What the client gets instead
// is WHAT IT IS, in words and in a small drawing, both read from
// `shoeInsertSpec(profile)` — so a workshop that changes the shoe shelf's tilt
// changes this sentence with it.

export default function ShoeMenu({ unitId, item, onBack, onDone, onRemoved }) {
  const law = A.shoeLaw();
  // The engine refuses the insert in words — not top of its stack, something
  // over it, a watch tray in the same cabinet — and `shoeInsertsBuilt` is
  // computed and never published, so its WARNINGS are the only honest way to
  // know whether the ramp described below is actually in there.
  const said = A.shoeFitWords(unitId, item);
  return (
    <Duty title="SHOE DRAWER" onBack={onBack} onDone={onDone}>
      <Field label="WHAT IT IS">
        <div className="pbi-stack" data-testid="shoe-drawing">
          <ShoeDrawing lanes={law.lanes} />
        </div>
        <Said testid="shoe-law">{law.said}</Said>
      </Field>

      {said.map((w) => <Said key={w} testid="shoe-said">{w}</Said>)}

      <DutyRow>
        <Button
          kind="secondary"
          data-testid="shoe-remove"
          onClick={() => { A.removeElement(unitId, item?.id); onRemoved(); }}
        >
          REMOVE
        </Button>
      </DutyRow>
    </Duty>
  );
}
