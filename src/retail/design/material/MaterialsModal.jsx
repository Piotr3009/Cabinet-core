import Modal from '../room/Modal.jsx';
import MaterialSlot from './MaterialSlot.jsx';
import WizardHardware from './WizardHardware.jsx';
import * as A from '../adapter.js';
import { RETAIL_SHOW_WORKSHOP_TOOLS } from '../../config.js';

// ─── TURN 63 F4 · THE MATERIALS WINDOW — PRO's `design` slot, for retail ───
//
// PRO answers `openModal('design')` with `DesignSettingsModal` → the 2646-line
// project wizard, which is not copied tonight (OWED; see the ledger). Two of
// its surfaces ARE copied — `MaterialChoicePanel` (with the tiled EGGER modal
// behind it) and `WizardHardware` — and this window is where they stand, so
// that the copied `UnitFinishModal`'s own *"More colours…"*, which opens
// `design`, lands on the surface that grows the project's palette rather than
// on nothing.
//
// It is retail's own file: the shell is T62's copy of PRO's, the three
// surfaces in it are tonight's copies, and the only thing written here is the
// order they stand in. Placement is the owner's to arrange later.

export default function MaterialsModal() {
  return (
    <Modal
      name="design"
      title="Materials"
      onClose={() => A.closeEditor()}
      width="pbi-re-w640"
      footer={(
        <button type="button" className="pbi-re-btn-gold" data-testid="materials-done" onClick={() => A.closeEditor()}>
          Done
        </button>
      )}
    >
      <div className="pbi-re-stack-3" data-testid="materials-modal">
        <MaterialSlot kind="carcass" title="Carcass — what is it made of?" />
        <MaterialSlot kind="front" title="Fronts — what are they made of?" />
        <div className="pbi-re-divider" />
        <span className="pbi-re-block pbi-re-t11 pbi-re-caps pbi-re-track pbi-re-quiet">Hardware</span>
        {/* PRO's own audience rule (T44: *"retail sees ONLY colour"*), read off
            the same store field PRO's wizard reads. The workshop's four rows —
            soft-close, push-to-open, the plinth line, the automat's verdict —
            are PRO's `!retail` branches, present in the copy and switched off;
            CLAUDE.md's one switch for such things, `RETAIL_SHOW_WORKSHOP_TOOLS`,
            shows them by handing the copy the factory audience. */}
        <WizardHardware audience={RETAIL_SHOW_WORKSHOP_TOOLS ? 'factory' : A.pageAudience()} />
      </div>
    </Modal>
  );
}
