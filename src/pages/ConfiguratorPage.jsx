import { useCallback, useRef } from 'react';
import TopBar from '../components/TopBar.jsx';
import LibraryPanel from '../components/LibraryPanel.jsx';
import RightPanel from '../components/RightPanel.jsx';
import RoomModal from '../components/RoomModal.jsx';
import DesignSettingsModal from '../components/DesignSettingsModal.jsx';
import AddItemsModal from '../components/AddItemsModal.jsx';
import AuthModal from '../components/AuthModal.jsx';
import BomPanel from '../components/BomPanel.jsx';
import Toast from '../components/Toast.jsx';
import ContextMenu from '../components/ContextMenu.jsx';
import Scene from '../3d/Scene.jsx';
import CncView from '../components/CncView.jsx';
import CanvasToolbar from '../components/CanvasToolbar.jsx';
import { useUiStore } from '../stores/uiStore.js';
import { useProjectStore } from '../stores/projectStore.js';
import { useMaterialAssignmentStore } from '../stores/materialAssignmentStore.js';
import { exportCuttingListCsv, exportProjectPdf } from '../lib/exporters.js';

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
  const selectedUnitId = useUiStore((s) => s.selectedUnitId);
  const selectedUnit = units.find((u) => u.id === selectedUnitId) || null;

  const assignments = useMaterialAssignmentStore((s) => s.assignments);
  const materials = useMaterialAssignmentStore((s) => s.materials);

  // The 3D canvas hands us a capture function for the PDF export.
  const captureRef = useRef(null);
  const onCaptureReady = useCallback((fn) => { captureRef.current = fn; }, []);

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

  return (
    <div className="h-full flex flex-col bg-shell-900">
      <TopBar onExport={() => { setBomOpen(true); }} onAuth={() => openModal('auth')} />
      <div className="flex-1 relative overflow-hidden">
        {/* The 3D scene stays MOUNTED behind the CNC view: it owns the WebGL
            context the PDF export captures, and re-initialising it on every
            toggle would both lose that and cost a visible stall. CncView is
            opaque, so nothing shows through. */}
        <div className="absolute inset-0 bg-canvas">
          <Scene onCaptureReady={onCaptureReady} />
        </div>
        {viewMode === 'cnc' && <CncView />}
        <CanvasToolbar />

        {units.length === 0 && viewMode === '3d' && (
          <div className="absolute inset-x-0 bottom-10 flex justify-center pointer-events-none">
            <p className="text-neutral-500 text-sm bg-white/80 px-3 py-1.5 rounded border border-neutral-200">
              Pick a unit from the Library to start.
            </p>
          </div>
        )}

        <LibraryPanel />
        {rightPanelOpen && !bomOpen && <RightPanel />}
        {bomOpen && <BomPanel onExportCsv={onExportCsv} onExportPdf={onExportPdf} />}
        {modal === 'room' && <RoomModal />}
        {modal === 'design' && <DesignSettingsModal />}
        {modal === 'add-items' && selectedUnit && <AddItemsModal unit={selectedUnit} />}
        {modal === 'auth' && <AuthModal />}
        <ContextMenu />
        <Toast />
      </div>
    </div>
  );
}
