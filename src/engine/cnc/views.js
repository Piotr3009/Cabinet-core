// ─── The two CNC VIEWS (turn 15, CLAUDE.md F9) ──────────────────────────────
//
// "The CNC EXPORT and today's grouping stay byte-identical — these are VIEWS."
//
// That sentence is the whole design brief and it is why this module exists at
// all. Nothing here is imported by engine/cnc/dxf.js, engine/cnc/layout.js or
// lib/cncExport.js; it is read by the SCREEN. A view sorts parts into buckets
// and names the buckets. It never moves a coordinate, never renames a layer and
// never decides what goes in a file.
//
// ─── WHY TWO ──────────────────────────────────────────────────────────────
//
// The sheet has shown one thing since turn 11 — every cabinet stacked down the
// page — and a workshop asks two different questions of it:
//
//   BY MATERIAL   "what do I cut out of the 18 mm MDF?" The sheet splits
//                 left→right into one section per ASSIGNED material and every
//                 part stands in its own. Identity is the MATERIAL and never
//                 the colour: two doors off the same white MDF are one section
//                 whatever they are sprayed, because it is one board on the bed
//                 of the machine.
//   BY CABINET    "is unit 03 complete?" A square per cabinet holding ALL of
//                 its parts — and the RUN parts in a group of their own,
//                 because a plinth, an infill and a masking panel belong to the
//                 run and not to any one carcass. The owner's words: "infille i
//                 plinthy osobno".
//
// NO NESTING. The nesting simulation is deferred by the owner and CLAUDE.md F9.4
// says so twice: do not sketch it, do not scaffold it. Neither view optimises
// anything; both are the engine's own part order, bucketed.
//
// Pure data + pure functions — no React, no store imports.

import { resolvePanelMaterial } from '../materials.js';

/**
 * The parts that belong to a RUN rather than to a carcass.
 *
 * Decided on the engine's own `role`, exactly as `groupOfPanel` is, and never
 * on the id string: the infill at a run's end is called INFILL-L-FACE in one
 * cabinet and INFILL-T-FACE in another, and both are run parts.
 */
export const RUN_PART_ROLES = new Set(['infill', 'plinth', 'mask']);

export function isRunPart(panel) {
  return RUN_PART_ROLES.has(panel?.role);
}

export const CNC_VIEWS = [
  {
    id: 'material',
    label: 'By material',
    hint: 'One section per assigned material — what comes off each board',
  },
  {
    id: 'cabinet',
    label: 'By cabinet',
    hint: 'A square per cabinet, and the run parts in a group of their own',
  },
];

export function cncViewById(id) {
  return CNC_VIEWS.find((v) => v.id === id) || CNC_VIEWS[0];
}

/**
 * Which MATERIAL a cut part is made of, as the BOM names it.
 *
 * ─── TURN 16 (CLAUDE.md F2.1): BY ASSIGNED MATERIAL, AND NOTHING ELSE ───────
 *
 * "Sheets group by ASSIGNED MATERIAL only: same material → same section,
 * different → separate. Three materials in the project = three groups.
 * Identity by material_id (with its label as the header, as the BOM names it)
 * — never by colour, never by finish kind."
 *
 * Turn 15 asked the ASSIGNMENT STORE by BOM role, which was the best answer
 * available at the time and is the wrong one now: that table is the purchasing
 * layer, one row per role for the whole project, and it cannot tell a cabinet
 * on Front 1 from a cabinet on Front 2 or know that this run's plinths come off
 * their own board. The project's own assignment can — it is
 * `engine/materials.js resolvePanelMaterial`, the same call the BOM, the
 * picture and the check-out make (F1.5).
 *
 * A slot with no board behind it yet is honest about it and groups by what it
 * is CALLED plus the thickness the engine cut it at, which are the facts that
 * are certainly true of it.
 *
 * @param {object} panel      an engine panel record
 * @param {object} context    { unit, design, profile, materials }
 * @returns {{key:string, label:string, thickness:number, assigned:boolean,
 *            material_id:string|null}}
 */
export function materialSection(panel, {
  unit = null, design = null, profile = null, materials = [],
} = {}) {
  const thickness = Number(panel?.thickness) || 0;
  const resolved = resolvePanelMaterial(panel, unit, design, profile, materials);
  const material = resolved.material_id
    ? (materials || []).find((m) => m.id === resolved.material_id) || null
    : null;

  if (!resolved.assigned) {
    return {
      key: `unassigned:${resolved.label || ''}:${thickness}`,
      label: `${resolved.label || 'Unassigned'}${thickness ? ` · ${thickness} mm` : ''}`,
      thickness,
      assigned: false,
      material_id: null,
    };
  }
  return {
    // ONE BOARD, ONE SECTION. The thickness is deliberately NOT in the key any
    // more: a stock item has one thickness, so splitting on it could only ever
    // split a board away from itself — which is exactly what "three materials
    // in the project = three groups" forbids.
    key: `mat:${resolved.material_id}`,
    label: material
      ? `${material.code && material.code !== '—' ? `${material.code} · ` : ''}${material.name}`
      : (resolved.label || 'Assigned board'),
    thickness,
    assigned: true,
    material_id: resolved.material_id,
  };
}

/**
 * Every part on the sheet, bucketed by material, left→right.
 *
 * Within a section the parts stay grouped BY CABINET, in cabinet order. Two
 * reasons, and neither is laziness: a drill belongs to a panel id that is only
 * unique within its own unit (two cabinets both have a `BUL`), and a machine
 * operator reading "what comes off this board" still wants to know which
 * carcass a piece is for.
 *
 * @param {Array} entries  [{ unit, result, panels }] — `panels` already filtered
 *                         by the checkbox tree
 * @param {object} context { design, profile, materials } — the PROJECT's own
 *                         assignment, which is what a section is (turn 16, F2)
 * @returns {Array<{key, label, thickness, assigned, units:[{unit, result, panels}]}>}
 */
export function groupByMaterial(entries, {
  design = null, profile = null, materials = [],
} = {}) {
  const sections = new Map();
  for (const entry of entries) {
    for (const panel of entry.panels) {
      const section = materialSection(panel, {
        unit: entry.unit, design, profile, materials,
      });
      let bucket = sections.get(section.key);
      if (!bucket) {
        bucket = { ...section, units: [] };
        sections.set(section.key, bucket);
      }
      let perUnit = bucket.units.find((u) => u.unit.id === entry.unit.id);
      if (!perUnit) {
        perUnit = { unit: entry.unit, result: entry.result, panels: [] };
        bucket.units.push(perUnit);
      }
      perUnit.panels.push(panel);
    }
  }
  // Assigned boards first, then the honest "unassigned" ones; alphabetical
  // inside each, so the sections do not reshuffle when a part is unticked.
  return [...sections.values()].sort((a, b) => {
    if (a.assigned !== b.assigned) return a.assigned ? -1 : 1;
    return a.label.localeCompare(b.label) || a.thickness - b.thickness;
  });
}

/**
 * Every part on the sheet, bucketed by cabinet — with the run parts pulled out.
 *
 * @param {Array} entries  [{ unit, result, panels }]
 * @returns {{cabinets:Array, run:Array}}  both in the same `entries` shape, so
 *          the view renders one kind of block and not two.
 */
export function groupByCabinet(entries) {
  const cabinets = [];
  const run = [];
  for (const entry of entries) {
    const own = entry.panels.filter((p) => !isRunPart(p));
    const shared = entry.panels.filter(isRunPart);
    if (own.length) cabinets.push({ ...entry, panels: own });
    if (shared.length) run.push({ ...entry, panels: shared });
  }
  return { cabinets, run };
}
