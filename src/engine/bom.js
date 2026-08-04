// ─── Bill of materials ───
// Aggregates engine output across units into the rows the BOM panel and the
// exports render. Computed LIVE from the current state at all times; the panel
// only decides WHEN to show it (SPEC 4.11), and an export is a snapshot of
// whatever the state is at that moment.
//
// Pure functions — no React, no store imports.

import { roundTo } from './format.js';

/**
 * @param {Array<{unit:object, result:object}>} entries
 * @returns aggregated BOM
 */
export function buildBom(entries) {
  const units = [];
  const roleTotals = {};
  const cutRows = new Map();       // identical pieces merge across the project

  let pieces = 0;
  let boardArea = 0;
  let frontArea = 0;
  let boardEdging = 0;
  let frontEdging = 0;

  for (const { unit, result } of entries) {
    const rows = result.panels.map((p) => ({
      unit_num: result.unitNum,
      id: p.id,
      part: p.part,
      role: p.role,
      material_role: p.material_role,
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

      const key = `${r.part}|${r.w}|${r.h}|${r.thickness}|${r.edge}`;
      const merged = cutRows.get(key);
      if (merged) merged.qty += r.qty;
      else cutRows.set(key, { ...r, qty: r.qty, units: new Set([r.unit_num]) });
      if (merged) merged.units.add(r.unit_num);
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

/** Total cost of the assigned materials, or null when nothing is priced. */
export function demandCost(demand) {
  const priced = demand.filter((d) => d.cost != null);
  if (!priced.length) return null;
  return roundTo(priced.reduce((s, d) => s + d.cost, 0), 2);
}
