import { Fragment, useEffect, useMemo, useState } from 'react';

import Modal from './Modal.jsx';
import MaterialPicker from './MaterialPicker.jsx';
import NumberField from './NumberField.jsx';
import { useUiStore } from '../stores/uiStore.js';
import { useProjectStore } from '../stores/projectStore.js';
import { useCabinetProfileStore } from '../stores/cabinetProfileStore.js';
import { useMaterialAssignmentStore } from '../stores/materialAssignmentStore.js';
import {
  PART_GROUPS, partsInGroup, assignmentFor, familyLabel, VARIANT_ORDER,
} from '../engine/partRegistry.js';
import { projectPartUsage, formatQty } from '../engine/bom.js';

/**
 * ─── ASSIGN MATERIALS (turn 39, CLAUDE.md F3) ───────────────────────────────
 *
 * The owner, 18.08.2026: *"musi być Assign materials i później BOM"*, and
 * *"każdy jeden projekt powinien mieć Assign materials"*.
 *
 * The layer this app never had, between the ENGINE's part names and the things
 * a joiner BUYS. Left: the seven registry groups, each with the count of what
 * is still missing beside it. Right: the parts of the chosen group, one row
 * each — name · what it is cut from · yield · a per-family override.
 *
 * THE MARKING IS THE FEATURE. The owner: *"podkreślone nowe materiały
 * nieprzypisane"*. An unassigned row is underlined, coloured and dotted; a part
 * that has only just started existing — the first drawer in the job, the first
 * LED strip — reads NEW until somebody has looked at it. A running counter sits
 * in the header, because "how much is left" is the question this screen exists
 * to answer.
 *
 * Opens BESIDE its menu entry and drags by its header — permanent rule 15, and
 * it is the shared `Modal` shell that gives both.
 */
export default function AssignMaterialsModal() {
  const closeModal = useUiStore((s) => s.closeModal);
  const anchor = useUiStore((s) => s.modalArgs?.anchor) || null;
  const openPart = useUiStore((s) => s.modalArgs?.partId) || null;

  const allResults = useProjectStore((s) => s.allResults);
  const units = useProjectStore((s) => s.units);
  const design = useProjectStore((s) => s.project.design);
  const profile = useCabinetProfileStore((s) => s.profile);

  const data = useMaterialAssignmentStore((s) => s.data);
  const materials = useMaterialAssignmentStore((s) => s.materials);
  const materialsSource = useMaterialAssignmentStore((s) => s.materialsSource);
  const setAssignment = useMaterialAssignmentStore((s) => s.setAssignment);
  const setYield = useMaterialAssignmentStore((s) => s.setYield);
  const removeAssignment = useMaterialAssignmentStore((s) => s.removeAssignment);
  const loadMaterials = useMaterialAssignmentStore((s) => s.loadMaterials);
  const markSeen = useMaterialAssignmentStore((s) => s.markSeen);
  const seen = useMaterialAssignmentStore((s) => s.seen);

  const [group, setGroup] = useState(PART_GROUPS[0].id);
  const [showAll, setShowAll] = useState(false);
  const [openOverride, setOpenOverride] = useState(null);

  // The workshop's own stock list, once. Mock mode, a dead network and a table
  // that is not there all leave the sample list standing (iron rule 6).
  useEffect(() => { loadMaterials?.().catch(() => {}); }, [loadMaterials]);

  const entries = useMemo(() => allResults(), [units, allResults]);
  const usage = useMemo(
    () => projectPartUsage(entries, { profile, design }),
    [entries, profile, design],
  );

  // A part is MISSING when a family that uses it has nothing behind it. Parts
  // this design does not contain are not counted — a joiner who has assigned
  // everything his kitchen holds must not be told 41 things are outstanding.
  const missingOf = useMemo(() => {
    const out = {};
    for (const [partId, use] of Object.entries(usage)) {
      const families = use.families.length ? use.families : [null];
      const missing = families.filter((f) => !assignmentFor(data, partId, f)?.material_id);
      if (missing.length) out[partId] = missing;
    }
    return out;
  }, [usage, data]);

  const counts = useMemo(() => {
    const out = {};
    for (const g of PART_GROUPS) out[g.id] = 0;
    for (const partId of Object.keys(missingOf)) {
      const g = PART_GROUPS.find((x) => partsInGroup(x.id).some((p) => p.id === partId));
      if (g) out[g.id] += 1;
    }
    return out;
  }, [missingOf]);

  const totalMissing = Object.keys(missingOf).length;

  // A part the design has only just started needing reads NEW until it has been
  // shown once. Marking happens on the way OUT of the render, so the badge
  // survives the frame it appears on.
  const rows = useMemo(() => {
    const all = partsInGroup(group);
    return showAll ? all : all.filter((p) => usage[p.id] || missingOf[p.id]);
  }, [group, showAll, usage, missingOf]);

  useEffect(() => {
    const ids = rows.map((p) => p.id);
    const t = setTimeout(() => markSeen?.(ids), 1200);
    return () => clearTimeout(t);
  }, [rows, markSeen]);

  // Opened from a BOM line's "assign this" button: jump straight to its group.
  useEffect(() => {
    if (!openPart) return;
    const g = PART_GROUPS.find((x) => partsInGroup(x.id).some((p) => p.id === openPart));
    if (g) setGroup(g.id);
  }, [openPart]);

  const pick = (partId, material, family = null) => {
    if (!material) { removeAssignment(partId, family); return; }
    const prev = assignmentFor(data, partId, family);
    setAssignment(partId, material.id, prev?.yield ?? 1.0, family);
  };

  return (
    <Modal
      name="assign-materials"
      anchor={anchor}
      title="Assign materials"
      onClose={closeModal}
      width="w-[860px]"
      footer={(
        <>
          <span className="text-[11px] text-ink-400 mr-auto">
            {materialsSource === 'db'
              ? `${materials.length} materials from this workshop’s stock list`
              : `${materials.length} sample materials — Database ▸ Materials has not been loaded`}
          </span>
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
      <div className="flex flex-col gap-2" data-assign-materials="1">
        {/* THE RUNNING COUNTER — CLAUDE.md F3 asks for it by name. */}
        <div
          className={totalMissing > 0
            ? 'flex items-center gap-2 rounded px-2 py-1.5 border border-status-warn/60 bg-status-warn/10 text-status-warn text-xs'
            : 'flex items-center gap-2 rounded px-2 py-1.5 border border-status-ok/50 bg-status-ok/10 text-status-ok text-xs'}
          data-assign-counter={String(totalMissing)}
        >
          <span className="font-medium tabular-nums">
            {totalMissing === 0
              ? 'Every part this job uses has a material'
              : `${totalMissing} part${totalMissing === 1 ? '' : 's'} unassigned`}
          </span>
          <span className="text-ink-400">
            {totalMissing > 0 ? '— a BOM with these in it cannot be costed' : '— the BOM is complete'}
          </span>
        </div>

        <div className="flex gap-3 min-h-[420px]">
          {/* LEFT: the seven groups, with what is missing beside each. */}
          <div className="w-[190px] shrink-0 flex flex-col gap-1">
            {PART_GROUPS.map((g) => {
              const missing = counts[g.id] || 0;
              const active = g.id === group;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setGroup(g.id)}
                  title={g.hint}
                  data-assign-group={g.id}
                  data-assign-group-missing={String(missing)}
                  className={`cc-btn text-left flex items-center gap-2 ${active ? 'border-gold text-gold' : ''}`}
                >
                  {/* The dot. It is the group-level half of the owner's
                      "podkreślone … nieprzypisane": you can see which drawer of
                      the cabinet has something missing in it without opening it. */}
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${missing > 0 ? 'bg-status-warn' : 'bg-shell-600'}`}
                    aria-hidden="true"
                  />
                  <span className="flex-1 truncate text-[12px]">{g.label}</span>
                  {missing > 0 && (
                    <span className="text-[10px] tabular-nums text-status-warn">{missing}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* RIGHT: the parts of the chosen group. */}
          <div className="flex-1 min-w-0 cc-scroll max-h-[460px] pr-1">
            {rows.length === 0 && (
              <p className="text-[11px] text-ink-400 p-3">
                Nothing in this group is used by this job yet — “Show every part” lists them all.
              </p>
            )}
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-shell-800 text-ink-400 text-[10px] uppercase tracking-wide">
                <tr>
                  <th className="text-left font-normal py-1 w-[34%]">Part</th>
                  <th className="text-left font-normal py-1">Material</th>
                  <th className="text-right font-normal py-1 w-[70px]">Yield</th>
                  <th className="text-right font-normal py-1 w-[92px]">This job</th>
                  <th className="w-[30px]" />
                </tr>
              </thead>
              <tbody>
                {rows.map((part) => {
                  const use = usage[part.id] || null;
                  const missing = missingOf[part.id] || null;
                  const base = assignmentFor(data, part.id, null);
                  const isAuto = Boolean(base?.auto);
                  const isNew = use && !seen[part.id] && !base?.material_id;
                  const overrides = VARIANT_ORDER
                    .map((f) => [f, data?.overrides?.[part.id]?.[f] || null])
                    .filter(([, v]) => v);
                  const expanded = openOverride === part.id;
                  return (
                    <Fragment key={part.id}>
                      <tr
                        data-assign-part={part.id}
                        data-assign-missing={missing ? '1' : '0'}
                        className={`border-t border-shell-600/50 ${use ? '' : 'opacity-50'}`}
                      >
                        <td className="py-1.5 pr-2 align-top">
                          <div className="flex items-center gap-1.5">
                            {/* THE MARK. Underline + colour, exactly as asked. */}
                            <span
                              className={missing
                                ? 'text-status-warn underline decoration-status-warn decoration-2 underline-offset-2'
                                : 'text-ink-100'}
                            >
                              {part.name}
                            </span>
                            {isNew && <span className="cc-tag border-status-warn/60 text-status-warn" data-assign-new="1">new</span>}
                            {isAuto && <span className="cc-tag" data-assign-auto={part.id}>auto</span>}
                          </div>
                          <div className="text-[10px] text-ink-400 leading-tight">{part.note}</div>
                        </td>
                        <td className="py-1.5 pr-2 align-top">
                          <MaterialPicker
                            materials={materials}
                            materialType={part.materialType}
                            value={base?.material_id || null}
                            testId={part.id}
                            onSelect={(m) => pick(part.id, m, null)}
                          />
                        </td>
                        <td className="py-1.5 pr-1 align-top">
                          <NumberField
                            value={base?.yield ?? 1}
                            min={1}
                            max={3}
                            step={0.01}
                            integer={false}
                            decimals={2}
                            onCommit={(v) => setYield(part.id, Number(v) || 1)}
                            className="cc-input w-[64px] text-right"
                            data-assign-yield={part.id}
                          />
                        </td>
                        <td className="py-1.5 pr-1 align-top text-right tabular-nums text-ink-200">
                          {use ? formatQty(use.qty, use.unit) : '—'}
                        </td>
                        <td className="py-1.5 align-top text-right">
                          <button
                            type="button"
                            className={overrides.length || expanded ? 'cc-btn-ghost text-gold' : 'cc-btn-ghost'}
                            title="Per cabinet family — a different board in the wardrobes from the kitchen bases"
                            data-assign-override={part.id}
                            onClick={() => setOpenOverride(expanded ? null : part.id)}
                          >
                            {overrides.length ? `⋮${overrides.length}` : '⋮'}
                          </button>
                        </td>
                      </tr>
                      {expanded && (
                        <tr className="bg-shell-700/30">
                          <td colSpan={5} className="px-2 py-2">
                            <div className="text-[10px] uppercase tracking-wide text-ink-400 mb-1">
                              Per cabinet family — blank inherits the project’s board above
                            </div>
                            <div className="grid grid-cols-5 gap-1.5">
                              {VARIANT_ORDER.map((family) => {
                                const own = data?.overrides?.[part.id]?.[family] || null;
                                const missingHere = missing?.includes(family);
                                return (
                                  <div key={family}>
                                    <div className={`cc-label mb-0.5 ${missingHere ? 'text-status-warn' : ''}`}>
                                      {familyLabel(family)}
                                    </div>
                                    <MaterialPicker
                                      materials={materials}
                                      materialType={part.materialType}
                                      value={own?.material_id || null}
                                      placeholder="— inherit —"
                                      testId={`${part.id}@${family}`}
                                      onSelect={(m) => pick(part.id, m, family)}
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Modal>
  );
}
