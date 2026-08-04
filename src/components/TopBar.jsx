import { useState } from 'react';
import { useProjectStore } from '../stores/projectStore.js';
import { useUiStore } from '../stores/uiStore.js';
import MockModeBadge from './MockModeBadge.jsx';

// Frozen layout, SPEC section 7: logo in gold, project name, gold Export button.
export default function TopBar({ onExport, onAuth }) {
  const name = useProjectStore((s) => s.project.name);
  const dirty = useProjectStore((s) => s.dirty);
  const setProjectName = useProjectStore((s) => s.setProjectName);
  const setBomOpen = useUiStore((s) => s.setBomOpen);
  const bomOpen = useUiStore((s) => s.bomOpen);
  const viewMode = useUiStore((s) => s.viewMode);
  const setViewMode = useUiStore((s) => s.setViewMode);
  const [editing, setEditing] = useState(false);

  return (
    <header className="h-12 shrink-0 bg-shell-900 border-b border-shell-600 flex items-center px-4 gap-4 z-30">
      <div className="font-semibold tracking-[0.18em] text-gold text-sm select-none">CABINET CORE</div>

      <div className="h-5 w-px bg-shell-600" />

      {editing ? (
        <input
          autoFocus
          className="cc-input max-w-[260px]"
          value={name}
          onChange={(e) => setProjectName(e.target.value)}
          onBlur={() => setEditing(false)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') setEditing(false); }}
        />
      ) : (
        <button type="button" className="text-sm text-ink-100 hover:text-gold transition-colors" onClick={() => setEditing(true)} title="Rename project">
          {name}
          {dirty && <span className="ml-2 text-ink-400 text-xs">•</span>}
        </button>
      )}

      <MockModeBadge />

      <div className="flex-1" />

      {/* 3D | CNC — the same engine output, drawn two ways */}
      <div className="flex rounded border border-shell-600 overflow-hidden" role="group" aria-label="View mode">
        {[['3d', '3D'], ['cnc', 'CNC']].map(([mode, label]) => (
          <button
            key={mode}
            type="button"
            aria-pressed={viewMode === mode}
            className={`px-3 py-1.5 text-sm transition-colors ${viewMode === mode
              ? 'bg-gold text-shell-900 font-medium'
              : 'bg-shell-700 text-ink-100 hover:bg-shell-600'}`}
            onClick={() => setViewMode(mode)}
          >
            {label}
          </button>
        ))}
      </div>


      <button type="button" className={bomOpen ? 'cc-btn border-gold text-gold' : 'cc-btn'} onClick={() => setBomOpen(!bomOpen)}>
        BOM
      </button>
      <button type="button" className="cc-btn" onClick={onAuth}>Account</button>
      <button type="button" className="cc-btn-gold" onClick={onExport}>Export</button>
    </header>
  );
}
