import { useState } from 'react';
import Modal from './Modal.jsx';
import { useUiStore } from '../stores/uiStore.js';
import { useProjectStore, shelfLimits } from '../stores/projectStore.js';
import { useCabinetProfileStore } from '../stores/cabinetProfileStore.js';
import { getUnitType } from '../engine/types.js';

// SPEC 4.5 — click a section, then "Add items": drawers / shelves / hanger rail
// / pull-down rail. The list is meant to grow.
export default function AddItemsModal({ unit }) {
  const closeModal = useUiStore((s) => s.closeModal);
  const notify = useUiStore((s) => s.notify);
  const addItem = useProjectStore((s) => s.addItem);
  const addDrawers = useProjectStore((s) => s.addDrawers);
  const redistributeShelves = useProjectStore((s) => s.redistributeShelves);
  const profile = useCabinetProfileStore((s) => s.profile);

  const type = getUnitType(unit.type);
  const items = unit.params.sections?.[0]?.items || [];
  const existingDrawers = items.filter((i) => i.kind === 'drawer').length;
  const hasRail = items.some((i) => i.kind === 'hanger');

  const DR = profile.wardrobe.drawers;
  const [drawerCount, setDrawerCount] = useState(existingDrawers || 2);
  const [drawerHeight, setDrawerHeight] = useState(DR.frontHeight);
  const [shelfCount, setShelfCount] = useState(1);
  const [railOffset, setRailOffset] = useState(unit.params.rail_offset ?? profile.wardrobe.defaults.railOffset);

  const applyDrawers = () => {
    if (!type.supports.drawers) return;
    addDrawers(unit.id, drawerCount, 'overlay', drawerHeight);
    notify(`${drawerCount} × ${drawerHeight} mm drawer${drawerCount === 1 ? '' : 's'} added — the partition above them is automatic.`, 'ok');
    closeModal();
  };

  const applyShelves = () => {
    const limits = shelfLimits(unit, profile);
    const existing = items.filter((i) => i.kind === 'shelf').length;
    const total = existing + shelfCount;
    const step = (limits.max - limits.min) / (total + 1);
    if (step < profile.editor.minShelfGap) {
      notify('Not enough clear height for that many shelves.', 'warn');
      return;
    }
    for (let i = 0; i < shelfCount; i += 1) addItem(unit.id, { kind: 'shelf', variant: 'fixed', pos_mm: limits.min + 1 });
    redistributeShelves(unit.id);
    closeModal();
  };

  const applyRail = () => {
    if (hasRail) { notify('This unit already has a hanging rail.', 'warn'); return; }
    addItem(unit.id, { kind: 'hanger', pos_mm: Number(railOffset) });
    closeModal();
  };

  return (
    <Modal title={`Add items — ${unit.params.unit_num}`} onClose={closeModal} width="w-[460px]">
      <div className="space-y-5">
        {/* Drawers */}
        <section className={type.supports.drawers ? '' : 'opacity-40 pointer-events-none'}>
          <h3 className="text-sm text-ink-50 mb-2">Drawers {!type.supports.drawers && <span className="cc-tag ml-1">not for this type</span>}</h3>
          <div className="flex items-end gap-2">
            <div className="w-20">
              <span className="cc-label">Count</span>
              <input
                type="number" min={1} max={DR.maxCount} className="cc-input"
                value={drawerCount} onChange={(e) => setDrawerCount(Math.max(1, Math.min(DR.maxCount, Number(e.target.value))))}
              />
            </div>
            <div className="w-24">
              <span className="cc-label">Height (mm)</span>
              <input
                type="number" min={DR.minFrontHeight} max={DR.maxFrontHeight} step={10} className="cc-input"
                value={drawerHeight}
                onChange={(e) => setDrawerHeight(Number(e.target.value))}
                onBlur={(e) => setDrawerHeight(Math.min(Math.max(Number(e.target.value) || DR.frontHeight, DR.minFrontHeight), DR.maxFrontHeight))}
              />
            </div>
            <div className="flex-1">
              <span className="cc-label">Mount</span>
              <div className="flex gap-1">
                <button type="button" className="cc-btn border-gold text-gold flex-1" disabled>Overlay</button>
                <button type="button" className="cc-btn flex-1 opacity-40 cursor-not-allowed" disabled title="Inset deductions still to come from Piotr — BLOCKERS #6">
                  Inset <span className="cc-tag ml-1">soon</span>
                </button>
              </div>
            </div>
            <button type="button" className="cc-btn-gold" onClick={applyDrawers}>Add</button>
          </div>
          <p className="text-[11px] text-ink-400 mt-1.5">
            Stacked from the bottom, {DR.minFrontHeight}–{DR.maxFrontHeight} mm each. Every drawer starts at this
            height and can be changed one by one afterwards. A partition closes the stack automatically (SPEC 4.7).
          </p>
        </section>

        <div className="cc-divider" />

        {/* Shelves */}
        <section>
          <h3 className="text-sm text-ink-50 mb-2">Shelves</h3>
          <div className="flex items-end gap-2">
            <div className="w-24">
              <span className="cc-label">Add</span>
              <input type="number" min={1} max={10} className="cc-input" value={shelfCount} onChange={(e) => setShelfCount(Math.max(1, Number(e.target.value)))} />
            </div>
            <button type="button" className="cc-btn-gold" onClick={applyShelves}>Add</button>
          </div>
          <p className="text-[11px] text-ink-400 mt-1.5">Spaced evenly, then drag any of them vertically.</p>
        </section>

        <div className="cc-divider" />

        {/* Rails */}
        <section className={type.supports.rail ? '' : 'opacity-40 pointer-events-none'}>
          <h3 className="text-sm text-ink-50 mb-2">Hanger rail</h3>
          <div className="flex items-end gap-2">
            <div className="w-32">
              <span className="cc-label">Height (mm)</span>
              <input type="number" className="cc-input" value={railOffset} onChange={(e) => setRailOffset(e.target.value)} />
            </div>
            <button type="button" className="cc-btn-gold" onClick={applyRail} disabled={hasRail}>Add</button>
          </div>
          <p className="text-[11px] text-ink-400 mt-1.5">Above the drawer partition, or above the base panel when there are no drawers.</p>
        </section>

        <section className="opacity-40">
          <h3 className="text-sm text-ink-200">Pull-down rail <span className="cc-tag ml-1">soon</span></h3>
        </section>
      </div>
    </Modal>
  );
}
