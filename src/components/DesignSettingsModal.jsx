import Modal from './Modal.jsx';
import SettingsPanel from './SettingsPanel.jsx';
import { useUiStore } from '../stores/uiStore.js';

// ─── Settings, from the top bar (turn 12, CLAUDE.md F1) ─────────────────────
//
// A frame and nothing else. Everything that used to be written out here is in
// components/SettingsPanel.jsx, which is the ONE settings surface — the same
// component step 5 of the new-project flow shows, bound to the same store the
// scene reads.
//
// That is the whole of F1. Turn 11 left the app with two settings screens that
// looked alike and wrote to different fields, so a colour set from one of them
// never reached the furniture. There is one now; this file is the door it is
// opened through from the menu, and the flow is the other door.

export default function DesignSettingsModal() {
  const closeModal = useUiStore((s) => s.closeModal);
  const openModal = useUiStore((s) => s.openModal);
  // Where this modal opens (turn 12, rule 15): beside whatever asked for it.
  // Nothing to work out here — the opener said, and the shell places it.
  const anchor = useUiStore((s) => s.modalArgs?.anchor) || null;

  return (
    <Modal
      anchor={anchor}
      title="Settings"
      onClose={closeModal}
      width="w-[720px]"
      footer={<button type="button" className="cc-btn-gold" onClick={closeModal}>Done</button>}
    >
      {/* Room setup opens IN PLACE OF this modal — one floating window at a
          time, and Settings is one click away again when it closes. It keeps
          the same anchor, so it lands where this one is standing. */}
      <SettingsPanel onRoomSetup={() => openModal('room', { anchor })} />
    </Modal>
  );
}
