import Modal from './Modal.jsx';
import WizardSettings from './WizardSettings.jsx';
import { useUiStore } from '../stores/uiStore.js';

// ─── Settings, from the top bar (turn 12, CLAUDE.md F1) ─────────────────────
//
// A frame and nothing else. Everything that used to be written out here is in
// the ONE settings surface — the same component the new-project flow shows,
// bound to the same store the scene reads.
//
// That is the whole of F1. Turn 11 left the app with two settings screens that
// looked alike and wrote to different fields, so a colour set from one of them
// never reached the furniture. There is one now; this file is the door it is
// opened through from the menu, and the flow is the other door.
//
// ─── TURN 36 (CLAUDE.md F1): AND THE SURFACE IS THE WIZARD'S ────────────────
//
// The owner, 17.08.2026, on finding sheet sizes in one panel and not the
// other: *"mamy new project i edit project — 2 różne setup modale, a powinien
// to być ten sam modal. Sprawdź dokładnie i dołóż wszystkie funkcje ze starego
// do nowego."*
//
// The audit was exactly as he said it: NEW project reached `WizardSettings`,
// EDIT project reached `SettingsPanel`, and T35 had landed the sheet sizes
// (F15) and the hinge-plate pilot (F8) in the OLD one only. Two forms, one
// project, and no rule about which of them a new control belongs in.
//
// So this door now opens the SAME component the flow opens, told which door it
// came through. `SettingsPanel.jsx` is NOT deleted — iron rule 4, the owner's
// sanctity rule — it stays in the tree, and the unified panel imports its
// sheet-size row and its hinge block rather than copying them, so the one
// implementation serves both.
export default function DesignSettingsModal() {
  const closeModal = useUiStore((s) => s.closeModal);
  const openModal = useUiStore((s) => s.openModal);
  // Where this modal opens (turn 12, rule 15): beside whatever asked for it.
  // Nothing to work out here — the opener said, and the shell places it.
  const anchor = useUiStore((s) => s.modalArgs?.anchor) || null;

  return (
    <Modal
      name="design"
      anchor={anchor}
      title="Settings"
      onClose={closeModal}
      width="w-[760px]"
      footer={<button type="button" className="cc-btn-gold" onClick={closeModal}>Done</button>}
    >
      {/* Room setup opens IN PLACE OF this modal — one floating window at a
          time, and Settings is one click away again when it closes. It keeps
          the same anchor, so it lands where this one is standing. */}
      <WizardSettings door="project" onRoomSetup={() => openModal('room', { anchor })} />
    </Modal>
  );
}
