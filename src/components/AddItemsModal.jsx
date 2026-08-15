import { useMemo } from 'react';
import Modal from './Modal.jsx';
import AddItems from './AddItems.jsx';
import NumberField from './NumberField.jsx';
import { useUiStore } from '../stores/uiStore.js';
import { useProjectStore } from '../stores/projectStore.js';
import { useCabinetProfileStore } from '../stores/cabinetProfileStore.js';
import { getUnitType } from '../engine/types.js';
import { formatMm } from '../engine/format.js';

// ─── The golden "+" opens a WINDOW (turn 12, CLAUDE.md F5.1) ────────────────
//
// "Golden '+' opens a MODAL (F2 shell, beside the unit): the unit's edit +
// 'what to add' menu (context-filtered items, Show-all). The right panel keeps
// mirroring; the modal is primary."
//
// Turn 11's inner plus opened the right panel's Add-items section — which
// works, and which is also a control on the cabinet sending your eye to the far
// side of the screen. The answer belongs where the question was asked, and the
// shell built in F2 is what puts it there: beside the cabinet, draggable, never
// covering it.
//
// PRIMARY, not exclusive. Everything here is the same component the right panel
// renders (`AddItems`) driving the same store, so the panel goes on mirroring
// whatever is done in the window and neither can offer what the other does not.
//
// The unit's own EDIT is the three dimensions — what a joiner changes in the
// same breath as "and put two shelves in it". Anything deeper is the right
// panel or the cabinet editor (F4), and this window says so rather than
// growing a third copy of the parameter panel.

export default function AddItemsModal() {
  const args = useUiStore((s) => s.modalArgs);
  const closeModal = useUiStore((s) => s.closeModal);
  const setZoneHint = useUiStore((s) => s.setZoneHint);
  const anchor = args?.anchor || null;

  const units = useProjectStore((s) => s.units);
  const updateUnitParams = useProjectStore((s) => s.updateUnitParams);
  const addDoors = useProjectStore((s) => s.addDoors);
  const notify = useUiStore((s) => s.notify);
  const profile = useCabinetProfileStore((s) => s.profile);

  const unit = units.find((u) => u.id === args?.unitId) || null;
  const type = useMemo(() => (unit ? getUnitType(unit.type) : null), [unit]);

  if (!unit) return null;

  const hasDoors = Boolean(unit.params.doors) && unit.params.doors !== false;

  const dims = [
    { key: 'width', label: 'Width' },
    { key: 'height', label: 'Height' },
    { key: 'depth', label: 'Depth' },
  ];

  return (
    <Modal
      name="add-items"
      anchor={anchor}
      title={`${unit.params.unit_num} · ${type.label}`}
      onClose={() => { setZoneHint(null); closeModal(); }}
      width="w-[320px]"
      footer={<button type="button" className="cc-btn-gold" onClick={() => { setZoneHint(null); closeModal(); }}>Done</button>}
    >
      <div className="space-y-3">
        <section className="space-y-1">
          <span className="text-xs uppercase tracking-wide text-ink-200">This cabinet</span>
          <div className="grid grid-cols-3 gap-2">
            {dims.map((d) => (
              <label key={d.key} className="block">
                <span className="cc-label">{d.label}</span>
                <NumberField
                  className="cc-input text-right"
                  data-unit-dim={d.key}
                  value={unit.params[d.key]}
                  onCommit={(v) => updateUnitParams(unit.id, { [d.key]: v })}
                />
              </label>
            ))}
          </div>
          <p className="text-[11px] text-ink-400">
            {formatMm(unit.params.width)} × {formatMm(unit.params.height)} × {formatMm(unit.params.depth)} mm.
            Everything else is in the right-hand panel, and the whole cabinet is in Edit cabinet.
          </p>
        </section>

        <div className="cc-divider" />

        <section className="space-y-1">
          <span className="text-xs uppercase tracking-wide text-ink-200">What goes inside</span>
          {/* The SAME list the right panel offers — one component, one store. */}
          <AddItems unit={unit} onZoneHover={setZoneHint} />

          {/* ─── Turn 13 (CLAUDE.md F6) ───
              "The plus-modal's add menu gains 'Add doors' alongside items — same
              action the right panel offers, one click closer." Same action
              literally: the store's `addDoors`, which is also what the right
              panel and the right-click menu call. Nothing else about the window
              changes — F6 says do not gold-plate it. */}
          {type.supports?.doors !== false && (
            <button
              type="button"
              className="cc-btn w-full mt-1"
              data-add-doors="1"
              disabled={hasDoors}
              title={hasDoors ? 'This cabinet already has its doors' : 'Hang the doors this width calls for'}
              onClick={() => {
                addDoors(unit.id);
              }}
            >
              Add doors
            </button>
          )}
        </section>
      </div>
    </Modal>
  );
}
