import Button from '../../ui/Button.jsx';
import { ChipRow, Field, NumberField, Said } from '../controls.jsx';
import { REASONS } from '../reasons.js';
import Duty, { DutyRow } from './Duty.jsx';
import * as A from '../adapter.js';

// ─── T60 F3.5 · THE HANGING RAIL ───────────────────────────────────────────
//
// Read from PRO's `RailModal`.
//
// ─── THE BRIEF SAYS "SINGLE / DOUBLE". THE ENGINE HAS NO SUCH LAW ──────────
//
// `engine/railAssembly.js RAIL_MOUNT` has exactly two: SHELF — T35's rod under
// its own board — and ALONE — T40's rod on the carcass sides, with no board
// over it. There is no second rod, no variant and no field anywhere in the
// shared core that would make one, and a "DOUBLE" chip would be retail
// inventing a product the workshop does not build. So the chips are the
// engine's own pair, and the difference from the brief is named in the morning
// report rather than papered over.
//
// ─── AND THE HEIGHT IS ITS SHELF'S, WHEN IT HANGS ON ONE ───────────────────
//
// T41: *"one drag, one truth."* A rod mounted on a shelf follows that shelf —
// `setShelfPos` re-derives every rider, and `moveRail` refuses outright. So the
// slider is not offered there: one line says whose height it is and how to take
// it back, which is the whole of the no-dead-control law in three sentences.

export default function RailMenu({ unitId, item, onBack, onDone, onRemoved }) {
  const travel = item ? A.railTravel(unitId, item.id) : null;
  if (!travel) return null;
  const why = A.railReason(travel);

  return (
    <Duty title="HANGING RAIL" onBack={onBack} onDone={onDone}>
      <Field label="MOUNTED">
        <ChipRow
          testid="rail-mount"
          value={travel.mounted}
          options={A.RAIL_MOUNTS.map((m) => ({ id: m.id, label: m.label, title: m.hint }))}
          onPick={(id) => A.setRailMount(unitId, item.id, id)}
        />
      </Field>

      <Field label="HEIGHT">
        {why ? (
          <Said testid="rail-follows">{why}</Said>
        ) : (
          <NumberField
            outOfRange={REASONS.outOfRange}
            testid="rail-height"
            min={travel.min}
            max={travel.max}
            value={travel.offset}
            onCommit={(v) => A.setRailOffset(unitId, item.id, v)}
          />
        )}
      </Field>

      <DutyRow>
        <Button
          kind="secondary"
          data-testid="rail-remove"
          onClick={() => { A.removeElement(unitId, item.id); onRemoved(); }}
        >
          REMOVE
        </Button>
      </DutyRow>
    </Duty>
  );
}
