import { useState } from 'react';
import RoomModal from './RoomModal.jsx';
import WallElevationModal from './WallElevationModal.jsx';

// ─── TURN 62 · THE DOOR INTO THE COPIED EDITOR ─────────────────────────────
//
// The owner, 01.09.2026: *"jak piszę 1 do 1 to KOPIUJ. ale kopiuj — nie kasuj,
// nie zmieniaj PRO, tylko zrób identycznie w retail."*
//
// `RoomModal.jsx` and `WallElevationModal.jsx` beside this file ARE PRO's two
// screens — copied, their imports repointed and their class names reskinned,
// and nothing else. This file is the only thing in `design/room/` that is not
// a copy: it is the ROUTE between them, and it exists because the two screens
// have to be routed somewhere and routing them inside a copy would be editing
// one.
//
// ─── ONE WINDOW AT A TIME ──────────────────────────────────────────────────
//
// T45's rule, kept: no window over a window. Choosing a wall REPLACES the room
// window with that wall's elevation, and Back brings the room back — which is
// exactly what `DrawRoomModal.jsx` does with the same two components and the
// same two callbacks (`onBack` / `onSave` both returning to the plan).
//
// Nothing is held in a draft here. Both editors write straight into the
// project's own room and slope lists through the shared core's setters, so
// stepping between them loses nothing and there is no state to reconcile.
export default function RoomEditor({ anchor = null, onClose }) {
  const [wall, setWall] = useState(null);

  if (wall !== null) {
    return (
      <WallElevationModal
        anchor={anchor}
        wallIndex={wall}
        onBack={() => setWall(null)}
        onSave={() => setWall(null)}
      />
    );
  }

  return (
    <RoomModal
      anchor={anchor}
      onClose={onClose}
      onApplied={onClose}
      // The hook `RoomModal.jsx` declares at the top of its own file, and the
      // only reason it has one.
      onOpenWall={(index) => setWall(index)}
    />
  );
}
