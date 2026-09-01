import Button from '../../ui/Button.jsx';
import { ChipRow, Field, NumberField } from '../controls.jsx';
import Duty, { DutyRow } from './Duty.jsx';
import * as A from '../adapter.js';
import { REASONS } from '../reasons.js';

// ─── T61 F4 · THE OVERLAY DRAWERS ──────────────────────────────────────────
//
// READ FROM: PRO's add form in `components/AddItems.jsx` under
// `kind.id === 'overlay_drawers'`, which is TWO FIELDS and a button — a count
// and a front height, bounded by `profile.wardrobe.drawers` — and nothing else.
// Its own comment says why there is nothing else: *"Everything the stack
// implies — the bottom position, the fixed shelf over it, the shortened doors
// and their re-laddered hinges — is the engine's law and not a question a
// joiner should have to answer twice."* A client is asked even less often.
//
// THE STACK IS REBUILT, NOT EDITED. `addOverlayDrawers` is the one call that
// makes an overlay stack, and it makes the WHOLE stack — so changing the count
// or the height is the same call again with the other number kept. That is the
// store's own shape and this menu does not invent a second one.
//
// WHY IT NEEDED ITS OWN MENU AT ALL: an overlay drawer's item kind is
// `overlay_drawer`, not `drawer`. `DrawersMenu` reads the internal stack
// (`kind === 'drawer'`), which on an overlay stack is EMPTY — its count would
// have read zero and its REMOVE would have thrown. `engine/drawerRef.js`
// documents that exact fault; this is the retail half of the same answer.

export default function OverlayMenu({
  unitId, onBack, onDone, onRemoved,
}) {
  const { drawers, count } = A.overlayStack(unitId);
  const b = A.drawerBounds();
  if (!count) return null;

  return (
    <Duty title="OVERLAY DRAWERS" onBack={onBack} onDone={onDone}>
      <Field
        label="HOW MANY"
        note={REASONS.overlayIsOutside}
      >
        <ChipRow
          testid="overlay-count"
          value={String(count)}
          options={Array.from({ length: b.maxCount }, (_, i) => ({
            id: String(i + 1), label: String(i + 1),
          }))}
          onPick={(id) => A.setOverlayStackCount(unitId, Number(id))}
        />
      </Field>

      <Field label="FRONT HEIGHT">
        <NumberField
          outOfRange={REASONS.outOfRange}
          testid="overlay-front"
          min={b.front.min}
          max={b.front.max}
          standardAt={b.front.standard}
          value={A.overlayFrontHeight(unitId)}
          onCommit={(v) => A.setOverlayFronts(unitId, v)}
        />
      </Field>

      <DutyRow>
        <Button
          kind="secondary"
          data-testid="overlay-remove"
          onClick={() => {
            drawers.forEach((d) => A.removeElement(unitId, d.id));
            onRemoved();
          }}
        >
          REMOVE
        </Button>
      </DutyRow>
    </Duty>
  );
}
