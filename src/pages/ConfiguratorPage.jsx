import TopBar from '../components/TopBar.jsx';
import LibraryPanel from '../components/LibraryPanel.jsx';
import RightPanel from '../components/RightPanel.jsx';
import Toast from '../components/Toast.jsx';
import { useUiStore } from '../stores/uiStore.js';
import { useProjectStore } from '../stores/projectStore.js';

// Frozen layout (SPEC section 7):
// topbar / floating Library / white 3D canvas / closable right parameter panel.
export default function ConfiguratorPage() {
  const rightPanelOpen = useUiStore((s) => s.rightPanelOpen);
  const units = useProjectStore((s) => s.units);

  return (
    <div className="h-full flex flex-col bg-shell-900">
      <TopBar />
      <div className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0 bg-canvas">
          {units.length === 0 && (
            <div className="h-full flex items-center justify-center">
              <p className="text-neutral-400 text-sm">Pick a unit from the Library to start.</p>
            </div>
          )}
        </div>
        <LibraryPanel />
        {rightPanelOpen && <RightPanel />}
        <Toast />
      </div>
    </div>
  );
}
