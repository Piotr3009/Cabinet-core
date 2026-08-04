import { useCallback, useRef } from 'react';
import TopBar from '../components/TopBar.jsx';
import LibraryPanel from '../components/LibraryPanel.jsx';
import RightPanel from '../components/RightPanel.jsx';
import RoomModal from '../components/RoomModal.jsx';
import Toast from '../components/Toast.jsx';
import Scene from '../3d/Scene.jsx';
import { useUiStore } from '../stores/uiStore.js';
import { useProjectStore } from '../stores/projectStore.js';

// Frozen layout (SPEC section 7):
// topbar / floating Library / white 3D canvas / closable right parameter panel.
export default function ConfiguratorPage() {
  const rightPanelOpen = useUiStore((s) => s.rightPanelOpen);
  const modal = useUiStore((s) => s.modal);
  const units = useProjectStore((s) => s.units);

  // The 3D canvas hands us a capture function for the PDF export.
  const captureRef = useRef(null);
  const onCaptureReady = useCallback((fn) => { captureRef.current = fn; }, []);

  return (
    <div className="h-full flex flex-col bg-shell-900">
      <TopBar />
      <div className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0 bg-canvas">
          <Scene onCaptureReady={onCaptureReady} />
        </div>

        {units.length === 0 && (
          <div className="absolute inset-x-0 bottom-10 flex justify-center pointer-events-none">
            <p className="text-neutral-500 text-sm bg-white/80 px-3 py-1.5 rounded border border-neutral-200">
              Pick a unit from the Library to start.
            </p>
          </div>
        )}

        <LibraryPanel />
        {rightPanelOpen && <RightPanel />}
        {modal === 'room' && <RoomModal />}
        <Toast />
      </div>
    </div>
  );
}
