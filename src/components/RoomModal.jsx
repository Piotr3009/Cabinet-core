import { useState } from 'react';
import Modal from './Modal.jsx';
import { useProjectStore } from '../stores/projectStore.js';
import { useUiStore } from '../stores/uiStore.js';

// SPEC 4.2 — the main wall is the anchor. Max 3 walls by design; MVP ships the
// main wall only, the side walls slot into the same array later.
const MAX_WALLS = 3;

export default function RoomModal() {
  const room = useProjectStore((s) => s.project.room);
  const setRoom = useProjectStore((s) => s.setRoom);
  const closeModal = useUiStore((s) => s.closeModal);
  const [height, setHeight] = useState(room.height);
  const [width, setWidth] = useState(room.walls[0]?.width ?? 4000);

  const apply = () => {
    setRoom({ height: Number(height) || room.height, walls: [{ width: Number(width) || room.walls[0].width }] });
    closeModal();
  };

  return (
    <Modal
      title="Room setup"
      onClose={closeModal}
      footer={<>
        <button type="button" className="cc-btn" onClick={closeModal}>Cancel</button>
        <button type="button" className="cc-btn-gold" onClick={apply}>Apply</button>
      </>}
    >
      <div className="space-y-3">
        <div>
          <span className="cc-label">Room height (mm)</span>
          <input type="number" className="cc-input" value={height} onChange={(e) => setHeight(e.target.value)} />
        </div>
        <div>
          <span className="cc-label">Main wall width (mm)</span>
          <input type="number" className="cc-input" value={width} onChange={(e) => setWidth(e.target.value)} />
        </div>
        <p className="text-[11px] text-ink-400 leading-relaxed">
          The main wall is the project anchor. Up to {MAX_WALLS} walls are supported by the data model —
          side walls arrive in a later phase. The fourth wall is deliberately never drawn.
        </p>
      </div>
    </Modal>
  );
}
