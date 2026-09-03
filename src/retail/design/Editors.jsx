import { useUiStore } from '../../stores/uiStore.js';
import DoorModal from './detail/DoorModal.jsx';
import RailModal from './detail/RailModal.jsx';
import UnitSizeModal from './detail/UnitSizeModal.jsx';
import AddItemsModal from './detail/AddItemsModal.jsx';
import FrontGapModal from './detail/FrontGapModal.jsx';
import WatchLayoutModal from './detail/WatchLayoutModal.jsx';
import JpullRunModal from './detail/JpullRunModal.jsx';
import LightingPanel from './lighting/LightingPanel.jsx';
import UnitFinishModal from './material/UnitFinishModal.jsx';
import MaterialsModal from './material/MaterialsModal.jsx';

// ─── TURN 63 · PRO'S WINDOWS, MOUNTED IN THE CLIENT'S ROOM ─────────────────
//
// The owner, 01.09.2026: *"miało być identycznie jak w PRO, tylko inna
// kolorystyka i trochę mniej, a pozmieniałeś sporo. Sprawdź jakie jeszcze
// funkcje pominąłeś i je dodaj."*
//
// This file is `src/pages/ConfiguratorPage.jsx`'s modal block, for retail: the
// same `modal` slot on the same shared ui store, the same names, each answered
// by the COPY of the PRO window that answers it in PRO. It is retail's own
// file and not a copy, because PRO's block lives inside a 600-line page that
// mounts the workshop's bars and panels around it, and copying the page would
// mount the workshop.
//
// ─── WHY THE ROUTES ALREADY EXISTED, AND WERE DEAD ─────────────────────────
//
// `src/3d/Scene.jsx` opens every one of these itself — double-click a leaf and
// it calls `openModal('element', …)`, click a J strip and it calls
// `openModal('jpull-run', …)`, double-click a figure and it calls
// `openModal('unit-size', …)` — and it has done so in the retail room since
// T59, because the scene is the SHARED viewer. Nothing rendered the slot, so
// every one of those gestures flipped a store field and changed nothing on the
// glass: the dead control the standing law forbids, twelve times over. This
// block is what makes PRO's own gestures work in the client's room, and the
// Duty menus' buttons are the second road to the same windows.
//
// `design` is PRO's Project settings — the 2646-line wizard, not copied
// tonight (OWED, see the ledger). What answers it here is retail's own
// MATERIALS window, which hosts the copied `MaterialChoicePanel` for the two
// slots that surface writes — so `UnitFinishModal`'s own "More colours…"
// button, which opens `design`, lands on the surface that grows the palette
// rather than on nothing.

export default function Editors() {
  const modal = useUiStore((s) => s.modal);
  return (
    <>
      {modal === 'element' && <DoorModal />}
      {modal === 'rail' && <RailModal />}
      {modal === 'add-items' && <AddItemsModal />}
      {modal === 'unit-finish' && <UnitFinishModal />}
      {modal === 'front-gap' && <FrontGapModal />}
      {modal === 'lighting' && <LightingPanel />}
      {modal === 'unit-size' && <UnitSizeModal />}
      {modal === 'watch-layout' && <WatchLayoutModal />}
      {modal === 'jpull-run' && <JpullRunModal />}
      {modal === 'design' && <MaterialsModal />}
    </>
  );
}
