import Button from '../../ui/Button.jsx';
import { Field, Said, Slider } from '../controls.jsx';
import Duty, { DutyRow } from './Duty.jsx';
import * as A from '../adapter.js';

// ─── T60 F3.3 · THE SHELF — THE OWNER'S OWN EXAMPLE ────────────────────────
//
//   *"Nie może być możliwości nieprzesunięcia się półki czy coś innego — to
//   głupie."*
//
// So it moves, and the slider's two ends are the ENGINE's: the band this board
// lives in (a split divider ends its column exactly as the top panel does),
// narrowed by the nearest board above and below at the profile's own minimum
// gap. Retail never types 40 and never types the band.
//
// ─── THE NUMBER IS THE ONE A JOINER READS ──────────────────────────────────
//
// `pos_mm` is the underside in the carcass's own frame, whose zero is the
// OUTSIDE of the bottom. What a person reads — in PRO's field, on the canvas
// chip, in the LISP — is the clear light under the shelf. The slider speaks
// that, so the client and the workshop are never looking at two numbers for one
// board.
//
// ─── AND WHEN IT REALLY CANNOT MOVE ────────────────────────────────────────
//
// Two cases and only two, both the engine's: LOCKED — screwed in, which is what
// `setShelfPos` itself refuses on — and NO ROOM, a band with nothing left in
// it. Then there is no slider at all and one line says why. PINNED is NOT one
// of them: a board carrying a rod is dragged like any other (T37-F2); what it
// does not do is join the ladder when a bay is centred, and that is a note.

export default function ShelfMenu({
  unitId, item, panel, onBack, onDone, onRemoved,
}) {
  const travel = item ? A.shelfTravel(unitId, item.id) : null;
  if (!travel) return null;
  const reason = A.shelfReason(travel);
  const notes = A.shelfNotes(travel, panel);

  return (
    <Duty title="SHELF" onBack={onBack} onDone={onDone}>
      <Field label="HEIGHT">
        {reason ? (
          <Said testid="shelf-still">{reason}</Said>
        ) : (
          <Slider
            testid="shelf-height"
            min={travel.fieldMin}
            max={travel.fieldMax}
            step={5}
            value={travel.field}
            onChange={(v) => A.setShelfHeight(unitId, item.id, v)}
          />
        )}
      </Field>

      <Field label="SPACING" note="Evenly, between whatever stands above and below them.">
        <DutyRow>
          <Button
            kind="secondary"
            data-testid="shelf-centre"
            onClick={() => A.centreBay(unitId, travel.bay)}
          >
            CENTRE THIS BAY
          </Button>
          <Button
            kind="secondary"
            data-testid="shelf-remove"
            onClick={() => { A.removeElement(unitId, item.id); onRemoved(); }}
          >
            REMOVE
          </Button>
        </DutyRow>
      </Field>

      {notes.map((n) => <Said key={n} testid="shelf-note">{n}</Said>)}
    </Duty>
  );
}
