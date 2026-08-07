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
  const setPanelSection = useUiStore((s) => s.setPanelSection);
  const openRightPanel = useUiStore((s) => s.openRightPanel);
  const notify = useUiStore((s) => s.notify);
  const units = useProjectStore((s) => s.units);
  const redistributeShelves = useProjectStore((s) => s.redistributeShelves);
  const rotateUnit = useProjectStore((s) => s.rotateUnit);
  const removeUnit = useProjectStore((s) => s.removeUnit);
  const addEndPanel = useProjectStore((s) => s.addEndPanel);
  const addPlinth = useProjectStore((s) => s.addPlinth);
  const removePlinth = useProjectStore((s) => s.removePlinth);
  const addTopInfill = useProjectStore((s) => s.addTopInfill);
  const removeEndPanel = useProjectStore((s) => s.removeEndPanel);
  const setSideInfillEnabled = useProjectStore((s) => s.setSideInfillEnabled);
  const unitDimensions = useUiStore((s) => s.unitDimensions);
  const toggleUnitDimensions = useUiStore((s) => s.toggleUnitDimensions);
  const removeTopInfill = useProjectStore((s) => s.removeTopInfill);
  const openModal = useUiStore((s) => s.openModal);

  const unit = units.find((u) => u.id === menu?.unitId) || null;

  const actions = useMemo(() => (unit
    ? menuActions({
      unit,
      panelPart: menu.part,
      dimensions: Boolean(unitDimensions[unit.id]),
      store: {
        redistributeShelves,
        rotateUnit,
        removeUnit,
        closeAllFronts,
        toggleUnitDimensions,
        addEndPanel: (unitId, opts) => {
          const { error } = addEndPanel(unitId, opts) || {};
          if (error) notify(error, 'warn');
        },
        removeEndPanel,
        addPlinth: (unitId) => { if (!addPlinth(unitId)) notify('This type stands on no legs — it takes no plinth.', 'warn'); },
        removePlinth,
        addTopInfill: (unitId) => {
          if (!addTopInfill(unitId)) notify('No room between this unit and the ceiling.', 'warn');
        },
        removeTopInfill,
        setSideInfillEnabled: (unitId, on) => {
          setSideInfillEnabled(unitId, on);
          notify(on
            ? 'Scribe fillers on for this cabinet.'
            : 'Scribe fillers off for this cabinet — the gap beside it stays open.', 'info');
        },
        // "Save as template" needs one thing the menu cannot give it: a NAME.
        // That is the modal's whole job (BACKLOG #30).
        saveAsTemplate: (unitId) => openModal('save-template', { unitId }),
        // The options for what was just added are in the panel, not in a modal.
        openPanelSection: (id) => { openRightPanel(); setPanelSection(id, true); },
      },
    })
    : []), [unit, menu, unitDimensions, redistributeShelves, rotateUnit, removeUnit, closeAllFronts,
    toggleUnitDimensions, addEndPanel, removeEndPanel, addPlinth, removePlinth, addTopInfill,
    removeTopInfill, setSideInfillEnabled, notify, openRightPanel, setPanelSection, openModal]);

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
          disabled={a.disabled}
          className={`w-full text-left px-3 py-1.5 text-sm transition-colors disabled:opacity-40
            disabled:cursor-not-allowed hover:enabled:bg-shell-700 ${
            a.danger ? 'text-status-danger' : 'text-ink-100'}`}
          title={a.hint || ''}
          onClick={() => {
            a.run();
            if (a.id === 'delete') clearSelection();
            closeContextMenu();
          }}
        >
          {/* The state, where the eye already is (turn 8, F7): a toggle that
              does not say which way it is set is a toggle you have to try. */}
          {a.checked === undefined
            ? a.label
            : (
              <span className="flex items-center gap-1.5">
                <span className={a.checked ? 'text-gold' : 'text-ink-400'}>{a.checked ? '✓' : '·'}</span>
                <span>{a.label}</span>
              </span>
            )}
        </button>
      ))}
    </div>
  );
}
