import { useCallback, useRef, useState } from 'react';
import TopBar from '../components/TopBar.jsx';
import LibraryPanel from '../components/LibraryPanel.jsx';
import RightPanel from '../components/RightPanel.jsx';
import RoomModal from '../components/RoomModal.jsx';
import DesignSettingsModal from '../components/DesignSettingsModal.jsx';
import AuthModal from '../components/AuthModal.jsx';
import SaveAsModal from '../components/SaveAsModal.jsx';
import SaveTemplateModal from '../components/SaveTemplateModal.jsx';
import BomPanel from '../components/BomPanel.jsx';
import RenderModal from '../components/RenderModal.jsx';
import DrawingModal from '../components/DrawingModal.jsx';
import Toast from '../components/Toast.jsx';
import ContextMenu from '../components/ContextMenu.jsx';
import Scene from '../3d/Scene.jsx';
import CncView from '../components/CncView.jsx';
import CanvasToolbar from '../components/CanvasToolbar.jsx';
import { useUiStore } from '../stores/uiStore.js';
import { useProjectStore } from '../stores/projectStore.js';
import { useMaterialAssignmentStore } from '../stores/materialAssignmentStore.js';
import { exportCuttingListCsv, exportProjectPdf } from '../lib/exporters.js';
import { exportUnitDxfZip } from '../lib/cncExport.js';
import { persistProject } from '../lib/persist.js';

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

  const assignments = useMaterialAssignmentStore((s) => s.assignments);
  const materials = useMaterialAssignmentStore((s) => s.materials);

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
        onRender={() => openModal('render')}
        onDrawing={(kind) => openModal('drawing', { kind })}
        onAuth={() => openModal('auth')}
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

        {units.length === 0 && viewMode === '3d' && (
          <div className="absolute inset-x-0 bottom-10 flex justify-center pointer-events-none">
            <p className="text-neutral-500 text-sm bg-white/80 px-3 py-1.5 rounded border border-neutral-200">
              Open Library in the menu and pick a unit to start.
            </p>
          </div>
        )}

        <LibraryPanel />
        {rightPanelOpen && !bomOpen && <RightPanel />}
        {bomOpen && <BomPanel onExportCsv={onExportCsv} onExportPdf={onExportPdf} />}
        {modal === 'room' && <RoomModal />}
        {modal === 'design' && <DesignSettingsModal />}
        {modal === 'auth' && <AuthModal />}
        {modal === 'save-as' && <SaveAsModal onSave={onSaveAs} />}
        {modal === 'save-template' && <SaveTemplateModal />}
        {modal === 'render' && <RenderModal rig={renderRig} />}
        {modal === 'drawing' && <DrawingModal />}
        <ContextMenu />
        <Toast />
      </div>
    </div>
  );
}
