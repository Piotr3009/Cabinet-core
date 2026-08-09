import { useState } from 'react';
import Modal from './Modal.jsx';
import { useProjectStore } from '../stores/projectStore.js';
import { useUiStore } from '../stores/uiStore.js';

// File ▸ Save as… — a copy under a new name, leaving the original where it is.
export default function SaveAsModal({ onSave }) {
  const closeModal = useUiStore((s) => s.closeModal);
  // Where this modal opens (turn 12, rule 15): beside whatever asked for it.
  // Nothing to work out here — the opener said, and the shell places it.
  const anchor = useUiStore((s) => s.modalArgs?.anchor) || null;
  const current = useProjectStore((s) => s.project.name);
  const [name, setName] = useState(`${current} copy`);

  const commit = () => {
    const clean = name.trim();
    if (!clean) return;
    onSave(clean);
    closeModal();
  };

  return (
    <Modal
      anchor={anchor}
      title="Save as"
      onClose={closeModal}
      width="w-[420px]"
      footer={(
        <>
          <button type="button" className="cc-btn" onClick={closeModal}>Cancel</button>
          <button type="button" className="cc-btn-gold" onClick={commit} disabled={!name.trim()}>Save</button>
        </>
      )}
    >
      <label className="block">
        <span className="cc-label">New name</span>
        <input
          autoFocus
          className="cc-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') commit(); }}
        />
      </label>
      <p className="text-[11px] text-ink-400 mt-2">
        The project you have open now stays as it is; this saves a copy and switches to it.
      </p>
    </Modal>
  );
}
