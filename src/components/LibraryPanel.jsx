import { useCallback, useEffect, useRef } from 'react';
import { useUiStore } from '../stores/uiStore.js';
import { useProjectStore } from '../stores/projectStore.js';
import { useCabinetProfileStore } from '../stores/cabinetProfileStore.js';
import { UNIT_TYPES, UNIT_TYPE_ORDER, profilePath } from '../engine/types.js';

// Floating, grab-and-move Library panel (SPEC 4.1 / section 7).
export default function LibraryPanel() {
  const pos = useUiStore((s) => s.libraryPos);
  const setPos = useUiStore((s) => s.setLibraryPos);
  const snapStep = useUiStore((s) => s.snapStep);
  const setSnapStep = useUiStore((s) => s.setSnapStep);
  const openModal = useUiStore((s) => s.openModal);
  const selectUnit = useUiStore((s) => s.selectUnit);
  const addUnit = useProjectStore((s) => s.addUnit);
  const units = useProjectStore((s) => s.units);
  const profile = useCabinetProfileStore((s) => s.profile);

  const drag = useRef(null);

  const onPointerDown = useCallback((e) => {
    drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  }, [pos]);

  const onPointerMove = useCallback((e) => {
    if (!drag.current) return;
    const x = Math.max(8, Math.min(window.innerWidth - 260, e.clientX - drag.current.dx));
    const y = Math.max(56, Math.min(window.innerHeight - 120, e.clientY - drag.current.dy));
    setPos({ x, y });
  }, [setPos]);

  const onPointerUp = useCallback((e) => {
    drag.current = null;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* already released */ }
  }, []);

  // Keep the panel on screen when the window shrinks
  useEffect(() => {
    const onResize = () => setPos({
      x: Math.max(8, Math.min(window.innerWidth - 260, pos.x)),
      y: Math.max(56, Math.min(window.innerHeight - 120, pos.y)),
    });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [pos, setPos]);

  const handleAdd = (typeId) => {
    const id = addUnit(typeId);
    selectUnit(id);
  };

  return (
    <div className="cc-panel absolute w-[236px] z-20 select-none" style={{ left: pos.x, top: pos.y }}>
      <div
        className="flex items-center gap-2 px-3 py-2 border-b border-shell-600 cursor-grab active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <span className="text-ink-400 leading-none tracking-tighter" aria-hidden>⋮⋮</span>
        <span className="text-xs uppercase tracking-wide text-ink-200">Library</span>
        <span className="flex-1" />
        <span className="cc-tag">{units.length} unit{units.length === 1 ? '' : 's'}</span>
      </div>

      <div className="p-2 space-y-1">
        {UNIT_TYPE_ORDER.map((id) => {
          const t = UNIT_TYPES[id];
          // Each type names its own defaults block in the profile, so a new
          // kit needs no branch here.
          const d = profilePath(profile, t.defaultsKey) || {};
          return (
            <button
              key={id}
              type="button"
              className="w-full text-left px-2 py-2 rounded hover:bg-shell-700 border border-transparent hover:border-shell-600 transition-colors"
              onClick={() => handleAdd(id)}
            >
              <div className="text-sm text-ink-50">{t.label}</div>
              <div className="text-[11px] text-ink-400">
                {d.width} × {d.height} × {d.depth} mm{t.mount === 'wall' ? ' · wall' : ''}
              </div>
            </button>
          );
        })}

        <div className="cc-divider" />

        <button type="button" className="w-full text-left px-2 py-2 rounded hover:bg-shell-700 text-sm text-ink-100 transition-colors" onClick={() => openModal('room')}>
          Room setup
        </button>

        <label className="flex items-center justify-between px-2 py-2 text-sm text-ink-100">
          <span>Snap</span>
          <select
            className="bg-shell-900 border border-shell-600 rounded px-2 py-1 text-sm text-ink-50 focus:outline-none focus:border-gold"
            value={snapStep}
            onChange={(e) => setSnapStep(Number(e.target.value))}
          >
            {profile.editor.snapSteps.map((s) => (
              <option key={s} value={s}>{s === 32 ? '32 mm system' : `${s} mm`}</option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
