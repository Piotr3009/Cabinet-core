import { useState } from 'react';
import { useProjectStore } from '../stores/projectStore.js';
import MockModeBadge from './MockModeBadge.jsx';

// Frozen layout, SPEC section 7: logo in gold, project name, gold Export button.
export default function TopBar({ onExport, onAuth }) {
  const name = useProjectStore((s) => s.project.name);
  const dirty = useProjectStore((s) => s.dirty);
  const setProjectName = useProjectStore((s) => s.setProjectName);
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

      {/* The view controls — dimensions, BOM, 3D | CNC — live ON the canvas
          now (CanvasToolbar). What is left up here acts on the PROJECT. */}
      <button type="button" className="cc-btn" onClick={onAuth}>Account</button>
      <button type="button" className="cc-btn-gold" onClick={onExport}>Export</button>
    </header>
  );
}
