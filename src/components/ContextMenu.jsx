import { useEffect, useMemo } from 'react';
import { useUiStore } from '../stores/uiStore.js';
import { useProjectStore } from '../stores/projectStore.js';
import { getUnitType } from '../engine/types.js';
import { menuActions } from '../lib/contextActions.js';

// Right-click menu for an item in the canvas (CLAUDE.md phase 5).
// The actions themselves live in lib/contextActions.js — this file is only
// where they are shown, dismissed and keyboard-handled.

export default function ContextMenu() {
  const menu = useUiStore((s) => s.contextMenu);
  const closeContextMenu = useUiStore((s) => s.closeContextMenu);
  const closeAllFronts = useUiStore((s) => s.closeAllFronts);
  const clearSelection = useUiStore((s) => s.clearSelection);
  const units = useProjectStore((s) => s.units);
  const redistributeShelves = useProjectStore((s) => s.redistributeShelves);
  const rotateUnit = useProjectStore((s) => s.rotateUnit);
  const removeUnit = useProjectStore((s) => s.removeUnit);

  const unit = units.find((u) => u.id === menu?.unitId) || null;

  const actions = useMemo(() => (unit
    ? menuActions({
      unit,
      panelPart: menu.part,
      store: { redistributeShelves, rotateUnit, removeUnit, closeAllFronts },
    })
    : []), [unit, menu, redistributeShelves, rotateUnit, removeUnit, closeAllFronts]);

  useEffect(() => {
    if (!menu) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') closeContextMenu(); };
    const onDown = () => closeContextMenu();
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onDown);
    };
  }, [menu, closeContextMenu]);

  if (!menu || !unit) return null;

  // Keep the menu on screen when the click lands near an edge.
  const left = Math.min(menu.x, window.innerWidth - 190);
  const top = Math.min(menu.y, window.innerHeight - (actions.length * 30 + 40));

  return (
    <div
      className="fixed z-50 w-[180px] cc-panel py-1"
      style={{ left, top }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="px-3 py-1 text-[11px] text-ink-400 border-b border-shell-600">
        {unit.params.unit_num} · {getUnitType(unit.type).label}
      </div>
      {actions.map((a) => (
        <button
          key={a.id}
          type="button"
          className={`w-full text-left px-3 py-1.5 text-sm hover:bg-shell-700 transition-colors ${
            a.danger ? 'text-status-danger' : 'text-ink-100'}`}
          title={a.hint || ''}
          onClick={() => {
            a.run();
            if (a.id === 'delete') clearSelection();
            closeContextMenu();
          }}
        >
          {a.label}
        </button>
      ))}
    </div>
  );
}
