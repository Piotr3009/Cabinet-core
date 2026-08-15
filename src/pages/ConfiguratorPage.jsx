import { useCallback, useEffect, useRef, useState } from 'react';
import TopBar from '../components/TopBar.jsx';
import LibraryPanel from '../components/LibraryPanel.jsx';
import RightPanel from '../components/RightPanel.jsx';
import RoomModal from '../components/RoomModal.jsx';
import DesignSettingsModal from '../components/DesignSettingsModal.jsx';
import AuthModal from '../components/AuthModal.jsx';
import CompanyDefaultsModal from '../components/CompanyDefaultsModal.jsx';
import SaveAsModal from '../components/SaveAsModal.jsx';
import SaveTemplateModal from '../components/SaveTemplateModal.jsx';
import BomPanel from '../components/BomPanel.jsx';
import RenderModal from '../components/RenderModal.jsx';
import DrawingModal from '../components/DrawingModal.jsx';
import Toast from '../components/Toast.jsx';
import ContextMenu from '../components/ContextMenu.jsx';
import HandEditsModal from '../components/HandEditsModal.jsx';
import DoorModal from '../components/DoorModal.jsx';
import CabinetEditorModal from '../components/CabinetEditorModal.jsx';
import PartDetailModal from '../components/PartDetailModal.jsx';
import AddItemsModal from '../components/AddItemsModal.jsx';
import UnitFinishModal from '../components/UnitFinishModal.jsx';
import Scene from '../3d/Scene.jsx';
import CncView from '../components/CncView.jsx';
import CanvasToolbar from '../components/CanvasToolbar.jsx';
import { useUiStore } from '../stores/uiStore.js';
import { getProjectType } from '../engine/projectTypes.js';
import { migrateDesign } from '../engine/design.js';
import { elementLabel } from '../engine/elements.js';
import { useHistoryStore } from '../stores/historyStore.js';
import { useProjectStore } from '../stores/projectStore.js';
import { useMaterialAssignmentStore } from '../stores/materialAssignmentStore.js';
import { exportCuttingListCsv, exportProjectPdf } from '../lib/exporters.js';
import { exportUnitDxfZip } from '../lib/cncExport.js';
import { persistProject } from '../lib/persist.js';
import { useCabinetProfileStore } from '../stores/cabinetProfileStore.js';
import { projectBookletSheets, unitCardSheet } from '../engine/drawings/card.js';
import { exportBookletPdf, exportDrawingPdf, exportDrawingSvg } from '../lib/drawingExport.js';
import { anchorOfEvent } from '../lib/modalAnchor.js';

/**
 * ─── "Add first unit" (turn 11, CLAUDE.md F4.2) ───
 *
 * A DOM button rather than a sprite in the scene, and deliberately: there is no
 * furniture for it to be anchored to, the room may be any size, and a control
 * that means "start here" belongs at the middle of the SCREEN. It opens the
 * Library at the category this project's type starts from (engine/projectTypes),
 * so a wardrobe job opens on tall units.
 */
function FirstUnitPlus() {
  const setLibraryCategory = useUiStore((s) => s.setLibraryCategory);
  const design = useProjectStore((s) => s.project.design);
  const category = getProjectType(migrateDesign(design).projectType)?.category || 'base';
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
      <button
        type="button"
        className="pointer-events-auto w-28 h-28 rounded-full border-2 border-dashed border-gold/70
          text-gold text-6xl leading-none flex items-center justify-center bg-white/70
          hover:bg-gold hover:text-shell-900 hover:border-solid transition-colors shadow-lg"
        title="Add the first unit — opens the Library"
        aria-label="Add first unit"
        onClick={() => setLibraryCategory(category)}
      >
        +
      </button>
      <span className="pointer-events-none mt-3 text-sm text-neutral-600 bg-white/80 px-3 py-1 rounded border border-neutral-200">
        Add first unit
      </span>
    </div>
  );
}

// Frozen layout (SPEC section 7):
// topbar / floating Library / white 3D canvas / closable right parameter panel.
export default function ConfiguratorPage() {
  const rightPanelOpen = useUiStore((s) => s.rightPanelOpen);
  const bomOpen = useUiStore((s) => s.bomOpen);
  const setBomOpen = useUiStore((s) => s.setBomOpen);
  const modal = useUiStore((s) => s.modal);
  const openModal = useUiStore((s) => s.openModal);
  const notify = useUiStore((s) => s.notify);
  const viewMode = useUiStore((s) => s.viewMode);

  const units = useProjectStore((s) => s.units);
  const project = useProjectStore((s) => s.project);
  const allResults = useProjectStore((s) => s.allResults);
  const unitResult = useProjectStore((s) => s.unitResult);
  const markSaved = useProjectStore((s) => s.markSaved);
  const selectedUnitId = useUiStore((s) => s.selectedUnitId);
  const selectedElement = useUiStore((s) => s.selectedElement);
  const clearElement = useUiStore((s) => s.clearElement);
  const clearSelection = useUiStore((s) => s.clearSelection);
  const removeItem = useProjectStore((s) => s.removeItem);
  const removeUnit = useProjectStore((s) => s.removeUnit);
  // Turn 25 (CLAUDE.md F11): the same action the front's modal calls.
  const removeFront = useProjectStore((s) => s.removeFront);
  const undo = useHistoryStore((s) => s.undo);
  const redo = useHistoryStore((s) => s.redo);

  const assignments = useMaterialAssignmentStore((s) => s.assignments);
  const materials = useMaterialAssignmentStore((s) => s.materials);
  const profile = useCabinetProfileStore((s) => s.profile);

  // ─── Escape steps back OUT (turn 9, CLAUDE.md F4.1) ───
  // One level at a time, which is what a person expects of it: the first press
  // drops the shelf you had hold of and leaves the cabinet selected, the second
  // drops the cabinet. Clicking the background still clears both at once — that
  // is a different gesture and it always meant "nothing".
  //
  // It is here rather than in the canvas because the keyboard belongs to the
  // page: a joiner reaching for Escape has usually just typed a number into the
  // right-hand panel, and the canvas does not have focus.
  useEffect(() => {
    const onKey = (e) => {
      // A field, a modal or a menu handles its own key first. A joiner typing
      // "450" into a width field is not asking for anything to be deleted.
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      // ─── Undo / redo (turn 12, CLAUDE.md F9) ───
      // Before everything else, because it is the one shortcut that has to work
      // whatever is selected. Ctrl+Y and Ctrl+Shift+Z are both redo: Windows
      // uses the first, the Mac habit is the second, and a workshop has both
      // kinds of machine in it.
      if ((e.ctrlKey || e.metaKey) && !e.altKey) {
        const key = e.key.toLowerCase();
        if (key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return; }
        if (key === 'y' || (key === 'z' && e.shiftKey)) { e.preventDefault(); redo(); return; }
      }

      if (e.key === 'Escape') {
        if (selectedElement) clearElement();
        else if (selectedUnitId) clearSelection();
        return;
      }

      // ─── Delete (turn 12, CLAUDE.md F5.2) ───
      // "a DELETE path (× in panel/modal + Delete key on selection) — both
      // missing today". The × is in the panel; this is the key, and it acts on
      // the SELECTED PIECE when there is one and on the cabinet otherwise —
      // which is the same one-level-at-a-time rule Escape has followed since
      // turn 9, applied to the other half of the gesture.
      //
      // Only pieces that ARE items can be deleted this way: a shelf, a
      // partition, a rail. A side panel is not a thing you delete, it is a
      // thing the kit has, and Delete on one must do nothing rather than
      // something surprising.
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      if (selectedElement) {
        const unit = units.find((u) => u.id === selectedElement.unitId);
        const panel = unit ? unitResult(unit.id)?.panels
          .find((p) => p.id === selectedElement.elementRef) : null;
        // ─── TURN 25 (CLAUDE.md F11): …AND A DOOR IS ONE OF THEM NOW ─────
        //
        // "The Delete key on a selected leaf does the same." A door is not an
        // ITEM — it has no `itemId`, because it is not something added to a
        // section — so it fell through the rule above and Delete did nothing
        // on the one piece a joiner most often wants gone. It is handled by
        // its own path, through the same store action the modal's button
        // calls, so the two cannot come to mean different things.
        //
        // No confirmation: Undo covers it, and a dialog in front of an action
        // one Ctrl+Z away is a dialog that only ever gets dismissed. R9 does
        // the rest — the hinge holes leave with the door and return with it.
        if (panel?.part === 'FRONT' && !panel.meta?.appliance) {
          e.preventDefault();
          const res = removeFront(unit.id, panel.id);
          clearElement();
          if (res) notify(res.scope === 'bay' ? 'Door removed from the bay.' : 'Doors removed.', 'ok');
          return;
        }
        const itemId = panel?.meta?.itemId;
        if (!itemId) return;
        e.preventDefault();
        removeItem(unit.id, itemId);
        clearElement();
        notify(`${elementLabel(panel) || 'Piece'} removed.`, 'ok');
        return;
      }
      if (selectedUnitId) {
        e.preventDefault();
        removeUnit(selectedUnitId);
        clearSelection();
        notify('Cabinet removed.', 'ok');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedElement, selectedUnitId, clearElement, clearSelection,
    units, unitResult, removeItem, removeUnit, removeFront, notify, undo, redo]);

  // The 3D canvas hands us a capture function for the PDF export.
  const captureRef = useRef(null);
  const onCaptureReady = useCallback((fn) => { captureRef.current = fn; }, []);

  // …and, since turn 6, a render rig for Output ▸ Render. Kept in state rather
  // than a ref: the modal is a child that has to RE-RENDER when the rig arrives,
  // and a ref changing never told it anything.
  const [renderRig, setRenderRig] = useState(null);
  const onRenderReady = useCallback((rig) => setRenderRig(rig), []);

  const guard = () => {
    if (units.length === 0) { notify('Nothing to export yet — add a unit first.', 'warn'); return false; }
    return true;
  };

  const onExportCsv = useCallback(() => {
    if (!guard()) return;
    exportCuttingListCsv(allResults(), project.name);
    notify('Cutting list exported.', 'ok');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allResults, project.name, units.length]);

  const onExportPdf = useCallback(() => {
    if (!guard()) return;
    exportProjectPdf({
      entries: allResults(), project, capture: captureRef.current, assignments, materials,
    });
    notify('PDF exported.', 'ok');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allResults, project, assignments, materials, units.length]);

  /** Every cut part of the SELECTED unit, as one ZIP (Output ▸ CNC / DXF). */
  const onExportDxfZip = useCallback(async () => {
    const unit = units.find((u) => u.id === selectedUnitId) || units[0] || null;
    if (!unit) { notify('Select a unit first — the DXF export is per unit.', 'warn'); return; }
    try {
      const { filename, files } = await exportUnitDxfZip(unitResult(unit.id));
      notify(`${files.length} DXF files exported as ${filename}.`, 'ok');
    } catch (e) {
      notify(e.message || 'This unit has no CNC geometry to export.', 'warn');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [units, selectedUnitId, unitResult]);

  /**
   * Output ▸ Drawings (turn 7, CLAUDE.md F1).
   *
   * An entry that says "(PDF)" writes a PDF; the preview has its own entry and
   * is the only one that opens a window. The SHEETS come from the engine
   * (engine/drawings/card.js), which is the same code the preview renders, so
   * the file and the screen cannot drift apart.
   */
  const onDrawing = useCallback((kind, e = null) => {
    const anchor = anchorOfEvent(e);
    if (kind === 'preview' || kind === 'front-elevation') { openModal('drawing', { kind, anchor }); return; }
    const date = new Date().toLocaleDateString();

    if (kind === 'booklet') {
      if (!guard()) return;
      try {
        const sheets = projectBookletSheets({ entries: allResults(), project, profile, date });
        const { filename, pages } = exportBookletPdf(sheets, { project: project.name });
        notify(`Saved ${filename} — ${pages} pages.`, 'ok');
      } catch (e) {
        notify(e.message || 'Nothing to draw yet.', 'warn');
      }
      return;
    }

    const unit = units.find((u) => u.id === selectedUnitId) || units[0] || null;
    if (!unit) { notify('Select a unit first — a card is of one unit.', 'warn'); return; }
    const result = unitResult(unit.id);
    if (!result) { notify('This unit has nothing to draw yet.', 'warn'); return; }
    const sheet = unitCardSheet({ result, unit, project, profile, date });
    const args = { project: project.name, unit: unit.params.unit_num, view: 'unit-card' };
    const { filename } = kind === 'unit-card-svg'
      ? exportDrawingSvg(sheet, args)
      : exportDrawingPdf(sheet, args);
    notify(`Saved ${filename}.`, 'ok');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [units, selectedUnitId, unitResult, allResults, project, profile, openModal, notify]);

  /** File ▸ Save as… — a copy under a new name. */
  const onSaveAs = useCallback(async (name) => {
    const { project: saved, message, tone } = await persistProject({ project, units, asName: name });
    markSaved(saved);
    notify(message, tone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project, units, markSaved]);

  return (
    <div className="h-full flex flex-col bg-shell-900">
      <TopBar
        onExportCsv={onExportCsv}
        onExportPdf={onExportPdf}
        onExportDxfZip={onExportDxfZip}
        onRender={(e) => openModal('render', { anchor: anchorOfEvent(e) })}
        onDrawing={onDrawing}
        onAuth={(e) => openModal('auth', { anchor: anchorOfEvent(e) })}
      />
      <div className="flex-1 relative overflow-hidden">
        {/* The 3D scene stays MOUNTED behind the CNC view: it owns the WebGL
            context the PDF export captures, and re-initialising it on every
            toggle would both lose that and cost a visible stall. CncView is
            opaque, so nothing shows through. */}
        <div className="absolute inset-0 bg-canvas">
          <Scene onCaptureReady={onCaptureReady} onRenderReady={onRenderReady} />
        </div>
        {viewMode === 'cnc' && <CncView />}
        <CanvasToolbar />

        {/* ─── An empty room asks ONE question (turn 11, CLAUDE.md F4.2) ───
            A line of grey text at the bottom of the canvas saying "open Library
            in the menu" is a manual, not an invitation: it tells somebody where
            a control is instead of being one. One big plus in the middle of the
            room, and it opens the Library — the same panel the menu opens, at
            the category a job of this type starts from.

            It disappears the moment the first unit exists, and it comes back
            when the scene is emptied, because it is not a splash screen: it is
            what an empty room looks like. */}
        {units.length === 0 && viewMode === '3d' && <FirstUnitPlus />}

        <LibraryPanel />
        {rightPanelOpen && !bomOpen && <RightPanel />}
        {bomOpen && <BomPanel onExportCsv={onExportCsv} onExportPdf={onExportPdf} />}
        {modal === 'room' && <RoomModal />}
        {modal === 'design' && <DesignSettingsModal />}
        {modal === 'auth' && <AuthModal />}
        {/* Turn 22 (CLAUDE.md F2b.2 / F3): Database ▸ Company defaults. */}
        {modal === 'company-defaults' && <CompanyDefaultsModal />}
        {modal === 'save-as' && <SaveAsModal onSave={onSaveAs} />}
        {modal === 'save-template' && <SaveTemplateModal />}
        {modal === 'render' && <RenderModal rig={renderRig} />}
        {modal === 'drawing' && <DrawingModal />}
        {/* Turn 11 (CLAUDE.md F3.3): the piece you double-clicked, edited where
            you clicked it. Not a centred dialog — see DoorModal.
            ─── Turn 30 (CLAUDE.md F2) ───
            ONE window, two sections: the piece, and — on a hinged front — its
            hinges. Double-clicking the ironmongery opens THIS modal scrolled to
            section B rather than a second modal of its own, so there is one
            component, one open/close path and one registry of what is open. */}
        {modal === 'element' && <DoorModal />}
        {/* Turn 12 (CLAUDE.md F4): one cabinet, its own canvas, mounted only
            while the window is open. */}
        {modal === 'cabinet' && <CabinetEditorModal />}
        {/* ─── Turn 14 (CLAUDE.md F7) ───
            One part, in the hand on the left and on the machine on the right.
            Opened by double-clicking a piece in the exploded cabinet. */}
        {modal === 'part-detail' && <PartDetailModal />}
        {/* Turn 12 (CLAUDE.md F5.1): the golden "+" opens a window beside the
            cabinet rather than sending the eye to the right-hand panel. */}
        {modal === 'add-items' && <AddItemsModal />}
        {/* Turn 13 (CLAUDE.md F3): ONE cabinet's colour, from the project's own
            palette. It takes a selection, so the same window serves the
            right-click menu over six cabinets (F5.3). */}
        {modal === 'unit-finish' && <UnitFinishModal />}
        {/* ─── Turn 23 (CLAUDE.md F9.3) ───
            "This part carries manual edits — recompute drops them, continue?"
            It is not a modal in the `modal` slot: it is raised by the STATE of
            the project rather than by anybody opening it, and it must be able
            to appear over whatever window the recompute happened in. */}
        <HandEditsModal />
        <ContextMenu />
        <Toast />
      </div>
    </div>
  );
}
