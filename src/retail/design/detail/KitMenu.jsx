import Button from '../../ui/Button.jsx';
import { Said } from '../controls.jsx';
import Duty, { DutyRow } from './Duty.jsx';
import * as A from '../adapter.js';

// ─── T61 F4 · A BOUGHT MECHANISM, AND WHAT THERE IS TO SAY ABOUT ONE ───────
//
// `engine/cabinet.js WARDROBE_KIT_KINDS` files three things together — the
// trouser pull-out, the tie rack and the pull-down rail — and they are the same
// thing in the engine's eyes: a named spec in the BOM, ordered to the opening
// it goes in, drawn in the scene as the room it takes, and NEVER drilled for.
// The pull-down has one number (the parked rod's drop) and its own menu; these
// two have none, so this is the shape they share.
//
// THE LABEL IS THE PROFILE'S (`wardrobeAccessories.kits[kind].label`) — a
// workshop that renames its own fitting renames it here.

export default function KitMenu({
  unitId, item, kind, onBack, onDone, onRemoved,
}) {
  const words = A.kitWords(kind);
  const fitted = item || A.kitItem(unitId, kind);
  if (!fitted) return null;

  return (
    <Duty title={words.label.toUpperCase()} onBack={onBack} onDone={onDone}>
      <Said testid={`kit-${kind}-said`}>{words.said}</Said>

      <DutyRow>
        <Button
          kind="secondary"
          data-testid={`kit-${kind}-remove`}
          onClick={() => { A.removeElement(unitId, fitted.id); onRemoved(); }}
        >
          REMOVE
        </Button>
      </DutyRow>
    </Duty>
  );
}
