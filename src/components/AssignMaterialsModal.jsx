import { useEffect, useMemo, useState } from 'react';

import Modal from './Modal.jsx';
import MaterialPicker, { MaterialPickerMenu } from './MaterialPicker.jsx';
import NumberField from './NumberField.jsx';
import { useUiStore } from '../stores/uiStore.js';
import { useProjectStore } from '../stores/projectStore.js';
import { useCabinetProfileStore } from '../stores/cabinetProfileStore.js';
import {
  ASSIGN_GROUPS, assignCount, buildAssignLines, useMaterialAssignmentStore,
} from '../stores/materialAssignmentStore.js';
// T78 F21 - the warehouse's Paints department reaches the picker as stock rows.
import { useWarehouseStore } from '../stores/warehouseStore.js';
import { withPaints } from '../engine/spray.js';
import {
  ALL_PARTS, assignmentFor, familyLabel, VARIANT_ORDER,
} from '../engine/partRegistry.js';
import {
  buildBom, projectPartUsage, unassignedInUse, formatQty,
} from '../engine/bom.js';
// ─── Turn 39 (CLAUDE.md F4): the rules that fill a part in without being asked.
import { autoAssignments, applicable, refusals } from '../engine/autoAssign.js';
import { JC_OFFLINE } from '../lib/jcApi.js';
import { categoryTree, STOCK_EMPTY, STOCK_PAGE } from '../lib/jcStock.js';

/**
 * ─── ASSIGN MATERIALS (turn 39, CLAUDE.md F3; T-CC1b F10) ───────────────────
 *
 * The owner, 01.11.2026: *"materialy z JC (jego baza), przypisanie w CC, grupy
 * (plyty, zawiasy, prowadnice, okucia/inne, materialy eksploatacyjne,
 * wyposazenie wewnetrzne), modal duzo wiekszy i czytelny, polaczony na stale,
 * kazda funkcja przypisana (10 rodzajow zawiasow, wszystkie przypisane),
 * inaczej eksport BOM pisze not assigned materials"*.
 *
 * Width 1240 (as Spraying's), the font floor of F12, two columns. LEFT, the
 * project's demand in the SIX GROUPS of CC's roles: each LINE is one BOM key
 * (`${role}|${spec_label}` for hardware, the registry part for the boards),
 * with its spec, quantity and unit, then the assigned Joinery Core material
 * or a red "Not assigned" chip. RIGHT, the stock, embedded and visible at once
 * (MaterialPicker): a click assigns the row to the selected line. The header
 * counts what is left, because "how much is left" is the question this window
 * exists to answer.
 *
 * Opens BESIDE its menu entry and drags by its header (rule 15, the shared
 * `Modal` shell).
 *
 * ─── T-CC2a F14.1 · READ ONLY FOR ONE TURN ───────────────────────────────────
 * Replaced by Link materials (the company's links, CLAUDE.md T-CC2a law 3);
 * the owner: *"zgadzam sie z Ola i Kamilem"* (the old window's deletion waits
 * for T-CC2b). A banner says so with a button to the new window; every assign,
 * clear, automatics and family control is disabled, and nothing runs on open
 * that writes the blob (the automatics, the schema 2 adoption): the blob stays
 * as saved (FROZEN 4). The lists stay visible.
 */
export const READ_ONLY_WORDS = 'Replaced by Link materials. This window is read only until the next update.';
const READ_ONLY = true;
export default function AssignMaterialsModal() {
  const closeModal = useUiStore((s) => s.closeModal);
  const openModal = useUiStore((s) => s.openModal);
  const anchor = useUiStore((s) => s.modalArgs?.anchor) || null;
  const openPart = useUiStore((s) => s.modalArgs?.partId) || null;

  const allResults = useProjectStore((s) => s.allResults);
  const runElements = useProjectStore((s) => s.runElements);
  const units = useProjectStore((s) => s.units);
  const design = useProjectStore((s) => s.project.design);
  const profile = useCabinetProfileStore((s) => s.profile);

  const data = useMaterialAssignmentStore((s) => s.data);
  const ownMaterials = useMaterialAssignmentStore((s) => s.materials);
  // T78 F21 - THE PAINT AS A MATERIAL: the warehouse's Paints rows stand beside
  // the stock list with `category: 'paint'`, so the two paint parts pick a tin
  // the way a shelf picks a board (engine/spray.js withPaints).
  const warehouseRows = useWarehouseStore((s) => s.rows);
  const materials = useMemo(() => withPaints(ownMaterials, warehouseRows), [ownMaterials, warehouseRows]);
  const materialsSource = useMaterialAssignmentStore((s) => s.materialsSource);
  const stockError = useMaterialAssignmentStore((s) => s.stockError);
  const stockCategories = useMaterialAssignmentStore((s) => s.stockCategories);
  const setAssignment = useMaterialAssignmentStore((s) => s.setAssignment);
  const setYield = useMaterialAssignmentStore((s) => s.setYield);
  const removeAssignment = useMaterialAssignmentStore((s) => s.removeAssignment);
  const setHardwareAssignment = useMaterialAssignmentStore((s) => s.setHardwareAssignment);
  const clearHardwareAssignment = useMaterialAssignmentStore((s) => s.clearHardwareAssignment);
  const syncHardwarePart = useMaterialAssignmentStore((s) => s.syncHardwarePart);
  const adoptHardwareKeys = useMaterialAssignmentStore((s) => s.adoptHardwareKeys);
  const loadMaterials = useMaterialAssignmentStore((s) => s.loadMaterials);
  const setAutoAssignment = useMaterialAssignmentStore((s) => s.setAutoAssignment);
  const addCustomPart = useMaterialAssignmentStore((s) => s.addCustomPart);
  const removeCustomPart = useMaterialAssignmentStore((s) => s.removeCustomPart);

  const [showAll, setShowAll] = useState(false);
  const [selected, setSelected] = useState(null);       // a line id
  const [family, setFamily] = useState(null);            // a Sheets line's family exception, when chosen
  // F8: the row a joiner is typing, before it exists.
  const [draft, setDraft] = useState({ name: '', unit: 'pcs', qtyPerUnit: 1 });

  // T-CC1b F9.2: the tenant's stock, read from Joinery Core on open.
  useEffect(() => { loadMaterials?.()?.catch?.(() => {}); }, [loadMaterials]);

  const entries = useMemo(() => allResults(), [units, runElements, allResults]);
  const bom = useMemo(() => buildBom(entries, { design, profile }), [entries, design, profile]);
  const usage = useMemo(() => projectPartUsage(entries, { profile, design }), [entries, profile, design]);
  const shownUsage = useMemo(() => {
    if (!showAll) return usage;
    const out = { ...usage };
    for (const p of ALL_PARTS) if (!out[p.id]) out[p.id] = { qty: 0, unit: p.unit, families: [] };
    return out;
  }, [usage, showAll]);

  const missingOf = useMemo(() => {
    const out = {};
    for (const m of unassignedInUse(entries, { assignments: data, profile, design, materials })) {
      out[m.partId] = m.families.length ? m.families : [null];
    }
    return out;
  }, [entries, data, profile, design, materials]);

  // ─── TURN 39 (CLAUDE.md F4): THE AUTOMATICS ──────────────────────────────
  // *"zawiasy automatycznie po wyborze koloru, nóżki też automatycznie w
  // zależności od wysokości."* The rules PROPOSE; `setAutoAssignment` refuses
  // to touch a part a hand has set, so running this on open is safe.
  const proposals = useMemo(
    () => autoAssignments({ entries, design, profile, usage }),
    [entries, design, profile, usage],
  );
  const refusedBy = useMemo(() => {
    const out = {};
    for (const r of refusals(proposals)) out[r.partId] = r.why;
    return out;
  }, [proposals]);
  const runAutomatics = useMemo(() => () => {
    if (READ_ONLY) return;
    for (const p of applicable(proposals)) setAutoAssignment(p.partId, p.material_id, { variant: null });
  }, [proposals, setAutoAssignment]);
  useEffect(() => { if (!READ_ONLY) runAutomatics(); }, [runAutomatics]);
  const autoCount = useMemo(
    () => applicable(proposals).filter((p) => assignmentFor(data, p.partId, null)?.material_id === p.material_id).length,
    [proposals, data],
  );

  // T-CC1b F10.1: the schema 2 migration, once, at load: a legacy role value
  // reaches every key of that role the current BOM lists.
  useEffect(() => { if (!READ_ONLY) adoptHardwareKeys?.(bom.hardware || []); }, [bom, adoptHardwareKeys]);

  const lines = useMemo(
    () => buildAssignLines({ bom, data, materials, usage: shownUsage, missingOf }),
    [bom, data, materials, shownUsage, missingOf],
  );
  const count = assignCount(lines.filter((l) => l.qty !== 0 || l.type !== 'part'));
  const byGroup = useMemo(() => {
    const out = Object.fromEntries(ASSIGN_GROUPS.map((g) => [g.id, []]));
    for (const l of lines) (out[l.group] || out.consumables).push(l);
    return out;
  }, [lines]);

  // The line being assigned: the one clicked, else the BOM line's part this
  // window was opened from, else the first that is not assigned.
  const current = lines.find((l) => l.id === selected)
    || (openPart ? lines.find((l) => l.partId === openPart) : null)
    || lines.find((l) => !l.assigned)
    || lines[0]
    || null;
  const choose = (line, fam = null) => { setSelected(line.id); setFamily(fam); };

  const assign = (line, material, fam = null) => {
    if (!line || READ_ONLY) return;
    if (line.type === 'hardware') {
      if (material) setHardwareAssignment(line.key, material.id);
      else clearHardwareAssignment(line.key);
      syncHardwarePart(line.role, bom.hardware || []);
      return;
    }
    if (!material) { removeAssignment(line.partId, fam); return; }
    const prev = assignmentFor(data, line.partId, fam);
    setAssignment(line.partId, material.id, prev?.yield ?? 1.0, fam);
  };

  const tree = useMemo(() => categoryTree(stockCategories), [stockCategories]);
  const stockRows = ownMaterials.filter((m) => !m.placeholder).length;
  const currentValue = current
    ? (current.type === 'part' && family
      ? data?.overrides?.[current.partId]?.[family]?.material_id || null
      : current.material?.id || null)
    : null;

  return (
    <Modal
      name="assign-materials"
      anchor={anchor}
      title="Assign materials"
      onClose={closeModal}
      width="w-[1240px]"
      className="cc-modal-wide"
      footer={(
        <>
          <span className="text-ink-400 mr-auto" data-assign-source={materialsSource}>
            {materialsSource === 'jc'
              ? `${stockRows} materials from your Joinery Core stock, and the three generic boards`
              : (stockError || JC_OFFLINE)}
          </span>
          <button
            type="button"
            className="cc-btn"
            onClick={runAutomatics}
            disabled={READ_ONLY}
            data-assign-auto-run={String(autoCount)}
            title="Hinges from the chosen metal, legs from the plinth height, runners from the length the engine snapped to. A material you chose by hand is never overwritten."
          >
            Automatics
            {autoCount > 0 && <span className="ml-1 text-gold tabular-nums">{autoCount}</span>}
          </button>
          <button
            type="button"
            className="cc-btn"
            onClick={() => { setShowAll((v) => !v); }}
            data-assign-showall={showAll ? '1' : '0'}
          >
            {showAll ? 'Only what this job uses' : 'Show every part'}
          </button>
          <button type="button" className="cc-btn" onClick={closeModal}>Close</button>
        </>
      )}
    >
      <div className="flex flex-col gap-2" data-assign-materials="1" data-assign-read-only={READ_ONLY ? '1' : '0'}>
        {/* T-CC2a F14.1: the banner, and the way to the window that replaced this one. */}
        <div className="flex items-center gap-2 rounded px-2 py-1.5 border border-gold/60 bg-gold/10" data-assign-replaced="1">
          <span className="flex-1 text-ink-50">{READ_ONLY_WORDS}</span>
          <button type="button" className="cc-btn-gold" data-assign-open-link="1" onClick={() => openModal('link-materials')}>
            Open Link materials
          </button>
        </div>
        {/* THE HEADER LINE, F10.3: what is assigned, and in red what is not. Ewa's P2 (the owner approved, 01.11.2026):
            read only, the count is grey, so the only red count is the BOM's (the links). */}
        <div
          className={READ_ONLY
            ? 'flex items-center gap-3 rounded px-2 py-1.5 border border-shell-600 bg-shell-700/40 text-ink-400'
            : count.missing > 0
              ? 'flex items-center gap-3 rounded px-2 py-1.5 border border-status-danger/60 bg-status-danger/10'
              : 'flex items-center gap-3 rounded px-2 py-1.5 border border-status-ok/50 bg-status-ok/10 text-status-ok'}
          data-assign-counter={String(count.missing)}
          data-assign-total={String(count.total)}
          data-assign-counter-tone={READ_ONLY ? 'grey' : count.missing > 0 ? 'red' : 'green'}
        >
          <span className={`font-medium tabular-nums ${READ_ONLY ? 'text-ink-400' : 'text-ink-100'}`}>{count.text}</span>
          {count.missing > 0 && (
            <span className={`${READ_ONLY ? 'text-ink-400' : 'text-status-danger'} font-medium`} data-assign-missing-words="1">{count.missingText}</span>
          )}
        </div>

        <div className="flex gap-4 min-h-[460px]">
          {/* LEFT: the demand, in the six groups. */}
          <div className="w-[600px] shrink-0 cc-scroll max-h-[64vh] pr-1" data-assign-demand="1">
            {ASSIGN_GROUPS.map((g) => {
              const rows = byGroup[g.id] || [];
              const missing = rows.filter((l) => !l.assigned).length;
              return (
                <section key={g.id} className="mb-3" data-assign-group={g.id} data-assign-group-lines={String(rows.length)} data-assign-group-missing={String(missing)}>
                  <div className="flex items-center gap-2 text-gold uppercase tracking-wide mb-1">
                    <span>{g.label}</span>
                    <span className="text-ink-400 normal-case tracking-normal tabular-nums">
                      {rows.length} line{rows.length === 1 ? '' : 's'}{missing ? `, ${missing} not assigned` : ''}
                    </span>
                  </div>
                  {rows.length === 0 && <p className="text-ink-400 px-2">Nothing in this group in this job.</p>}
                  {rows.length > 0 && (
                    <table className="w-full">
                      <tbody>
                        {rows.map((line) => (
                          <LineRow
                            key={line.id}
                            line={line}
                            active={current?.id === line.id}
                            family={current?.id === line.id ? family : null}
                            data={data}
                            materials={materials}
                            tree={tree}
                            refused={line.partId ? refusedBy[line.partId] : null}
                            onChoose={(fam) => choose(line, fam)}
                            onAssign={(m, fam) => assign(line, m, fam)}
                            onYield={(v) => { if (!READ_ONLY) setYield(line.partId, Number(v) || 1); }}
                            onRemoveCustom={() => { if (!READ_ONLY) removeCustomPart(line.partId); }}
                            readOnly={READ_ONLY}
                          />
                        ))}
                      </tbody>
                    </table>
                  )}
                  {/* TURN 39 (CLAUDE.md F8): THE JOINER'S OWN ROWS, a quantity per cabinet. */}
                  {g.id === 'consumables' && (
                    <div className="flex items-center gap-1.5 mt-1" data-custom-parts="1">
                      <input
                        className="cc-input flex-1"
                        placeholder="Your own consumable, e.g. Dowels 8 x 40"
                        disabled={READ_ONLY}
                        value={draft.name}
                        data-custom-draft-name="1"
                        onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                      />
                      <NumberField
                        disabled={READ_ONLY}
                        value={draft.qtyPerUnit}
                        min={0.01}
                        max={9999}
                        integer={false}
                        decimals={2}
                        onCommit={(v) => setDraft((d) => ({ ...d, qtyPerUnit: Number(v) || 1 }))}
                        className="cc-input w-[70px] text-right"
                      />
                      <select
                        className="cc-input w-[80px]"
                        disabled={READ_ONLY}
                        value={draft.unit}
                        data-custom-draft-unit="1"
                        onChange={(e) => setDraft((d) => ({ ...d, unit: e.target.value }))}
                      >
                        {['pcs', 'm', 'm²', 'L', 'kg', 'tubes'].map((u) => <option key={u} value={u}>{u}</option>)}
                      </select>
                      <button
                        type="button"
                        className="cc-btn"
                        data-custom-add="1"
                        disabled={READ_ONLY || !draft.name.trim()}
                        onClick={() => {
                          if (READ_ONLY) return;
                          addCustomPart(draft);
                          setDraft({ name: '', unit: 'pcs', qtyPerUnit: 1 });
                        }}
                      >
                        Add
                      </button>
                    </div>
                  )}
                </section>
              );
            })}
          </div>

          {/* RIGHT: the stock, embedded and visible at once. */}
          <div className="flex-1 min-w-0 flex flex-col gap-2" data-assign-stock="1">
            <div className="text-ink-100" data-assign-target={current?.id || ''}>
              {current
                ? <>Assigning: <span className="text-gold">{current.label}</span>{current.spec ? <span className="text-ink-400">{` ${current.spec}`}</span> : null}{family ? <span className="text-ink-400">{`, ${familyLabel(family)} only`}</span> : null}</>
                : 'This job has no line to assign yet.'}
            </div>
            {stockError && (
              <div className="flex items-center gap-2 rounded px-2 py-1.5 border border-status-warn/60 bg-status-warn/10 text-status-warn" data-stock-offline="1">
                <span className="flex-1">{stockError}</span>
                <button type="button" className="cc-btn" onClick={() => loadMaterials()} data-stock-retry="1">Retry</button>
              </div>
            )}
            {!stockError && materialsSource === 'jc' && stockRows === 0 && (
              <div className="flex items-center gap-2 rounded px-2 py-1.5 border border-shell-600" data-stock-empty="1">
                <span className="flex-1">{STOCK_EMPTY}</span>
                <a className="cc-btn" href={STOCK_PAGE} target="_blank" rel="noreferrer" data-stock-open="1">Open Stock</a>
              </div>
            )}
            <MaterialPicker
              materials={materials}
              value={currentValue}
              kind={current?.kind || 'all'}
              tree={tree}
              testId="assign"
              onSelect={current && !READ_ONLY ? (m) => assign(current, m, current.type === 'part' ? family : null) : null}
              onClear={current && !READ_ONLY ? () => assign(current, null, current.type === 'part' ? family : null) : null}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}

/** One line of the demand: label and spec, quantity, then the material or the red chip. */
function LineRow({
  line, active, family, data, materials, tree, refused, onChoose, onAssign, onYield, onRemoveCustom, readOnly = false,
}) {
  const [openFamilies, setOpenFamilies] = useState(false);
  const isSheet = line.type === 'part' && line.group === 'sheets';
  const m = line.material;
  return (
    <>
      <tr
        className={`border-t border-shell-600/50 cursor-pointer ${active ? 'bg-gold/10' : 'hover:bg-shell-700/40'}`}
        onClick={() => onChoose(null)}
        data-assign-line={line.type === 'hardware' ? line.key : line.partId}
        data-assign-line-type={line.type}
        data-assign-assigned={line.assigned ? '1' : '0'}
      >
        <td className="align-top">
          <div className="text-ink-100">{line.label}</div>
          {line.spec && <div className="text-ink-400 leading-tight" data-assign-spec="1">{line.spec}</div>}
          {refused && !line.assigned && <div className="text-status-warn/80 leading-tight" data-assign-why={line.partId}>auto: {refused}</div>}
        </td>
        <td className="align-top text-right tabular-nums text-ink-200 whitespace-nowrap">
          {line.qty == null ? '' : formatQty(line.qty, line.unit)}
        </td>
        <td className="align-top">
          {m ? (
            <div data-assign-material={m.id}>
              <span className="text-ink-50">{m.name}</span>
              {m.jc_uuid && <span className="cc-tag ml-1.5">JC</span>}
              {m.placeholder && <span className="cc-tag ml-1.5">generic</span>}
              <div className="text-ink-400 tabular-nums">
                {[m.item_number || m.code, Number(m.price) > 0 ? `£${Number(m.price).toFixed(2)}${m.unit ? `/${m.unit}` : ''}` : null].filter(Boolean).join(', ')}
              </div>
            </div>
          ) : null}
          {!line.assigned && (
            <span className="inline-block rounded px-1.5 py-0.5 border border-status-danger text-status-danger mt-0.5" data-assign-chip="not-assigned">
              {line.families?.filter(Boolean).length && m
                ? `Not assigned for ${line.families.filter(Boolean).map(familyLabel).join(', ')}`
                : 'Not assigned'}
            </span>
          )}
        </td>
        <td className="align-top text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
          {isSheet && (
            <NumberField
              disabled={readOnly}
              value={line.yield ?? 1}
              min={1}
              max={3}
              step={0.01}
              integer={false}
              decimals={2}
              onCommit={onYield}
              className="cc-input w-[64px] text-right"
              data-assign-yield={line.partId}
              title="Yield: the offcut waste on this board"
            />
          )}
          {isSheet && (
            <button
              type="button"
              className={openFamilies ? 'cc-btn-ghost text-gold ml-1' : 'cc-btn-ghost ml-1'}
              title="Per cabinet family: a different board in the wardrobes from the kitchen bases"
              disabled={readOnly}
              data-assign-override={line.partId}
              onClick={() => setOpenFamilies((v) => !v)}
            >
              Families
            </button>
          )}
          {line.material && (
            <button type="button" className="cc-btn-ghost ml-1" disabled={readOnly} data-assign-clear={line.id} onClick={() => onAssign(null, null)}>Clear</button>
          )}
          {line.type === 'custom' && (
            <button type="button" className="cc-btn-ghost text-status-danger ml-1" title="Remove this line" disabled={readOnly} data-custom-remove={line.partId} onClick={onRemoveCustom}>Remove</button>
          )}
        </td>
      </tr>
      {isSheet && openFamilies && !readOnly && (
        <tr className="bg-shell-700/30">
          <td colSpan={4}>
            <div className="text-ink-400 mb-1">Per cabinet family: blank inherits the project's board above</div>
            <div className="grid grid-cols-3 gap-1.5">
              {VARIANT_ORDER.map((fam) => {
                const own = data?.overrides?.[line.partId]?.[fam] || null;
                const missingHere = line.families?.includes(fam);
                return (
                  <div key={fam} className={family === fam ? 'outline outline-1 outline-gold rounded' : ''}>
                    <button type="button" className={`cc-label mb-0.5 ${missingHere ? 'text-status-danger' : ''}`} onClick={() => onChoose(fam)}>
                      {familyLabel(fam)}
                    </button>
                    <MaterialPickerMenu
                      materials={materials}
                      kind="board"
                      tree={tree}
                      value={own?.material_id || null}
                      placeholder="inherit"
                      testId={`${line.partId}@${fam}`}
                      onSelect={(mat) => onAssign(mat, fam)}
                    />
                  </div>
                );
              })}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
