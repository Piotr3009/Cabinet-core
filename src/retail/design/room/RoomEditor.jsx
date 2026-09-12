import RoomModal from './RoomModal.jsx';

// ─── TURN 62 · THE DOOR INTO THE COPIED EDITOR ─────────────────────────────
//
// The owner, 01.09.2026: *"jak piszę 1 do 1 to KOPIUJ. ale kopiuj — nie kasuj,
// nie zmieniaj PRO, tylko zrób identycznie w retail."*
//
// `RoomModal.jsx` and `WallElevationModal.jsx` beside this file ARE PRO's two
// screens — copied, their imports repointed and their class names reskinned,
// and nothing else. This file is the only thing in `design/room/` that is not
// a copy: it is the ROUTE, and it exists because the copy has to be routed
// somewhere and routing it inside a copy would be editing one.
//
// ─── TURN 67 F1 · THE ROUTE IS ONE LINE NOW, BECAUSE PRO'S FILE HOLDS IT ───
//
// T62 could not copy a route that did not exist: PRO reached a wall's
// elevation from `DrawRoomModal.jsx`, never from the room's own wall rows, so
// the copy grew ONE declared addition — `onOpenWall`, an opt-in hook that put
// an `Elevation ›` button on each row — and this file swapped one window for
// the other when it fired.
//
// Tonight PRO's own `RoomModal.jsx` DOCKS the elevation under the plan
// (CLAUDE.md F1, the owner: *"tak, zdecydowanie potwierdzam"*), so the route
// is inside the file being copied. The hook has nothing left to do and is
// gone with the state and the second window that served it: the copy now
// differs from PRO by imports, class names and colour, and by NOTHING ELSE.
//
// ─── TOMBSTONE ─────────────────────────────────────────────────────────────
// `useState(wall)` and the `<WallElevationModal …>` branch stood here; the
// elevation is drawn by the copied `RoomModal` itself, on whichever wall the
// plan click chose.
export default function RoomEditor({ anchor = null, onClose }) {
  return (
    <RoomModal
      anchor={anchor}
      onClose={onClose}
      onApplied={onClose}
    />
  );
}
