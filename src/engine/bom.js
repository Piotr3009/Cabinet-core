// ─── Bill of materials ───
// Aggregates engine output across units into the rows the BOM panel and the
// exports render. Computed LIVE from the current state at all times; the panel
// only decides WHEN to show it (SPEC 4.11), and an export is a snapshot of
// whatever the state is at that moment.
//
// Pure functions — no React, no store imports.

import { roundTo } from './format.js';
import { resolveFinishes } from './design.js';

/**
 * What ONE piece is finished in, as a name a workshop can order against
 * (turn 9, CLAUDE.md F4.5 / F6.3).
 *
 * Most specific first, which is the same order every other resolution in this
 * app runs in:
 *
 *   1. the PIECE's own override — a 25 mm oak shelf in a white carcass
 *      (CLAUDE.md F4). The engine puts it on the panel's meta because that is
 *      where the override arrived as an input;
 *   2. otherwise the project's finish for the sheet this piece is cut from,
 *      which is the engine's own `material_role` and not a guess from the role:
 *      a door, an END PANEL and a FILLER all come out of the front sheet.
 *
 * Null when the caller gave no design to resolve against — `buildBom` is used
 * by tests and by callers that only want quantities, and a made-up label would
 * be worse than none.
 */
function partMaterialLabel(panel, finishes) {
  const own = panel.meta?.material_label;
  if (own) return String(own);
  if (!finishes) return null;
  return (panel.material_role === 'front' ? finishes.front : finishes.carcass)?.label || null;
}

/**
 * @param {Array<{unit:object, result:object}>} entries
 * @param {object} [context]  { design, profile } — supply both and every row
 *                            carries the finish it is cut from, resolved per
 *                            unit so a cabinet with its own door style is
 *                            labelled with ITS material and not the project's.
 * @returns aggregated BOM
 */
export function buildBom(entries, { design = null, profile = null } = {}) {
  const units = [];
  const roleTotals = {};
  const cutRows = new Map();       // identical pieces merge across the project
  const hardwareRows = new Map();  // …and so do identical hardware lines

  let pieces = 0;
  let boardArea = 0;
  let frontArea = 0;
  let boardEdging = 0;
  let frontEdging = 0;

  for (const { unit, result } of entries) {
    // Per UNIT, not per project: a cabinet on its own door style is finished in
    // that style's material, and its cut list has to say so.
    const finishes = design ? resolveFinishes(unit, design, profile) : null;
    const rows = result.panels.map((p) => ({
      unit_num: result.unitNum,
      id: p.id,
      part: p.part,
      role: p.role,
      material_role: p.material_role,
      material_label: partMaterialLabel(p, finishes),
      w: p.w,
      h: p.h,
      qty: p.qty,
      thickness: p.thickness,
      edge: p.edging.code,
      edge_m: p.edging.len_m,
      area_m2: p.area_m2,
    }));
    units.push({ unitId: unit.id, unitNum: result.unitNum, type: result.type, rows, totals: result.totals, warnings: result.warnings });

    for (const r of rows) {
      pieces += r.qty;
      if (r.material_role === 'front') { frontArea += r.area_m2 * r.qty; frontEdging += r.edge_m * r.qty; }
      else { boardArea += r.area_m2 * r.qty; boardEdging += r.edge_m * r.qty; }

      const rt = roleTotals[r.role] || (roleTotals[r.role] = { role: r.role, pieces: 0, area_m2: 0, edging_m: 0, thicknesses: new Set() });
      rt.pieces += r.qty;
      rt.area_m2 += r.area_m2 * r.qty;
      rt.edging_m += r.edge_m * r.qty;
      rt.thicknesses.add(r.thickness);

      // The MATERIAL is part of the identity of a cut piece: two 560 × 500
      // shelves the same thickness are one line only if they come off the same
      // sheet. Without it, the 25 mm oak shelf somebody overrode (CLAUDE.md F4)
      // would merge into the white ones and be cut in white.
      const key = `${r.part}|${r.w}|${r.h}|${r.thickness}|${r.edge}|${r.material_label || ''}`;
      const merged = cutRows.get(key);
      if (merged) merged.qty += r.qty;
      else cutRows.set(key, { ...r, qty: r.qty, units: new Set([r.unit_num]) });
      if (merged) merged.units.add(r.unit_num);
    }

    // Hardware merges on role AND spec: 440 mm runners and 490 mm runners are
    // two different things to buy, even though they are one BOM role.
    for (const h of result.hardware || []) {
      const key = `${h.role}|${h.spec_label}`;
      const merged = hardwareRows.get(key);
      if (merged) { merged.qty += h.qty; merged.units.add(result.unitNum); } else {
        hardwareRows.set(key, { ...h, qty: h.qty, units: new Set([result.unitNum]) });
      }
    }
  }

  const roles = Object.values(roleTotals).map((rt) => ({
    ...rt,
    thicknesses: [...rt.thicknesses].sort((a, b) => a - b),
    area_m2: roundTo(rt.area_m2, 4),
    edging_m: roundTo(rt.edging_m, 3),
  }));

  return {
    units,
    roles,
    cutRows: [...cutRows.values()].map((r) => ({ ...r, units: [...r.units] })),
    hardware: [...hardwareRows.values()].map((r) => ({ ...r, units: [...r.units] })),
    totals: {
      pieces,
      board_area_m2: roundTo(boardArea, 4),
      front_area_m2: roundTo(frontArea, 4),
      area_m2: roundTo(boardArea + frontArea, 4),
      edging_m: roundTo(boardEdging, 3),
      edging_front_m: roundTo(frontEdging, 3),
      edging_total_m: roundTo(boardEdging + frontEdging, 3),
    },
  };
}

/**
 * Material demand per role, with the yield coefficient applied.
 * yield = 1.0 means no waste allowance; 1.15 means order 15 % more.
 */
export function materialDemand(bom, assignments, materials) {
  const byId = new Map((materials || []).map((m) => [m.id, m]));
  return bom.roles.map((role) => {
    const a = assignments?.[role.role];
    const material = a?.material_id ? byId.get(a.material_id) : null;
    const yieldCoeff = Number(a?.yield ?? 1) || 1;
    const required = role.area_m2 * yieldCoeff;
    return {
      role: role.role,
      pieces: role.pieces,
      area_m2: role.area_m2,
      thicknesses: role.thicknesses,
      material,
      yield: yieldCoeff,
      required_m2: roundTo(required, 3),
      cost: material?.price != null ? roundTo(required * material.price, 2) : null,
    };
  });
}

/**
 * Hardware demand: the same ASSIGN pattern as the boards, but counted in
 * pieces and pairs rather than m², and with no yield coefficient — you do not
 * buy 15 % extra hinges to allow for offcuts.
 *
 * One assignment per ROLE; a role that needs two specs (440 mm and 490 mm
 * runners in the same project) shows both lines under that one assignment, so
 * the quantities are always right even before the products are split out
 * (BLOCKERS.md #9).
 */
export function hardwareDemand(bom, assignments, materials) {
  const byId = new Map((materials || []).map((m) => [m.id, m]));
  return (bom.hardware || []).map((row) => {
    const a = assignments?.[row.role];
    const material = a?.material_id ? byId.get(a.material_id) : null;
    return {
      ...row,
      material,
      cost: material?.price != null ? roundTo(row.qty * material.price, 2) : null,
    };
  });
}

/** Total cost of the assigned materials, or null when nothing is priced. */
export function demandCost(demand) {
  const priced = demand.filter((d) => d.cost != null);
  if (!priced.length) return null;
  return roundTo(priced.reduce((s, d) => s + d.cost, 0), 2);
}
