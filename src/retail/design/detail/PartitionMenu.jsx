import Button from '../../ui/Button.jsx';
import { Field, NumberField, Said } from '../controls.jsx';
import Duty, { DutyRow } from './Duty.jsx';
import * as A from '../adapter.js';
import { REASONS } from '../reasons.js';

// ─── T61 F4 · THE VERTICAL DIVIDER ─────────────────────────────────────────
//
// READ FROM: PRO's `ElementProperties` on kind `partition`, whose fields are
// `['position-x', 'partition-slot', 'partition-drill-face', 'setback',
// 'thickness', 'material']`, and PRO's own list surface in `RightPanel`
// ("Vertical partitions", with EQUAL BAYS and a per-divider chain field).
//
// FIVE OF PRO's SIX FIELDS ARE NOT HERE, and that is the rule rather than an
// omission: which carcass board the divider is cut from, which face the machine
// bores, its setback, its thickness and its material are the workshop's, and
// *"Liczby silnika nie wchodzą do UI bez rozkazu Piotra"*. What is left is the
// one thing a client has an opinion about — where it stands — and PRO's own
// EQUAL BAYS, which is a client's question in a joiner's words.
//
// THE ENDS ARE `projectStore.setPartitionX`'s OWN CLAMP, read back off the
// same arithmetic it applies: one minimum gap clear of the sides and of the
// divider beside it, because *"a divider you could not get a hand between is
// not a bay"*. Nothing here is a literal.

export default function PartitionMenu({
  unitId, item, onBack, onDone, onRemoved,
}) {
  const travel = A.partitionTravel(unitId, item?.id);
  if (!travel) return null;

  return (
    <Duty title="VERTICAL DIVIDER" onBack={onBack} onDone={onDone}>
      {travel.blocked ? (
        <Said testid="partition-still">{REASONS.partitionPinned}</Said>
      ) : (
        <Field label="HOW FAR FROM THE LEFT">
          <NumberField
            outOfRange={REASONS.outOfRange}
            testid="partition-x"
            min={travel.min}
            max={travel.max}
            value={travel.value}
            onCommit={(v) => A.setPartitionPos(unitId, item.id, v)}
          />
        </Field>
      )}

      <DutyRow>
        {/* PRO's own button, under PRO's own title. */}
        <Button
          kind="secondary"
          data-testid="partition-equal"
          onClick={() => A.centrePartitions(unitId)}
        >
          EQUAL BAYS
        </Button>
        <Button
          kind="secondary"
          data-testid="partition-remove"
          onClick={() => { A.removeElement(unitId, item.id); onRemoved(); }}
        >
          REMOVE
        </Button>
      </DutyRow>
    </Duty>
  );
}
