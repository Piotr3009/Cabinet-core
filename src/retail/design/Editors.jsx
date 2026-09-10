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
import { DOCK_MODALS } from './detail/docked.jsx';

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

// ─── T66 F3 · TWO PLACES, AND A NAME IS DRAWN IN EXACTLY ONE ───────────────
//
// The owner: *"w zasadzie po prawej powinien być tylko menu edycji."*
//
// Three of the names below EDIT A SELECTED ELEMENT — `element` (every piece's
// window), `rail` (the alone rod) and `watch-layout` — and those are DOCKED:
// `Detail.jsx` renders them inside the right-hand panel, which is the one
// surface an element is edited on. The rest are genuinely modal — the Egger
// picker, the room's own screens, the golden `+`, the materials — and stay
// modals, draggable and beside the click, per the house rule.
//
// `where` is what keeps that honest. `Detail` asks for `dock`, the room asks
// for `room`, and the split is `docked.DOCK_MODALS` read in one place — so a
// window cannot be drawn twice, which is the failure the owner's screenshot
// caught.
//
// @param {'room'|'dock'} where
export default function Editors({ where = 'room' }) {
  const modal = useUiStore((s) => s.modal);
  const dock = where === 'dock';
  const here = (name) => (DOCK_MODALS.includes(name) ? dock : !dock);
  const is = (name) => modal === name && here(name);
  return (
    <>
      {is('element') && <DoorModal />}
      {is('rail') && <RailModal />}
      {is('add-items') && <AddItemsModal />}
      {is('unit-finish') && <UnitFinishModal />}
      {is('front-gap') && <FrontGapModal />}
      {is('lighting') && <LightingPanel />}
      {is('unit-size') && <UnitSizeModal />}
      {is('watch-layout') && <WatchLayoutModal />}
      {is('jpull-run') && <JpullRunModal />}
      {is('design') && <MaterialsModal />}
    </>
  );
}
