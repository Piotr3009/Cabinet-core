// ─── Bill of materials ───
// Aggregates engine output across units into the rows the BOM panel and the
// exports render. Computed LIVE from the current state at all times; the panel
// only decides WHEN to show it (SPEC 4.11), and an export is a snapshot of
// whatever the state is at that moment.
//
// Pure functions — no React, no store imports.

import { roundTo } from './format.js';
import { resolvePanelMaterial } from './materials.js';
import { frontManufacturing } from './frontDecorationBom.js';
import {
  ALL_PARTS as REGISTRY_PARTS, PART_REGISTRY, HARDWARE_TO_PART_ID, LIGHTING_TO_PART_ID,
  partIdForElement, edgePartFor, cabinetFamilyOf, assignmentFor, normalizeAssignments,
} from './partRegistry.js';
import { sheetSizeForFamily } from './checks.js';
import { lightingBomLines } from './ledStrips.js';
// T75 F5 · the worktop's slabs, joint and cut-outs, resolved from the design.
// T75 F22 · the state of every line, read off the part.
import { appliedStripNotes, readinessOf } from './readiness.js';
import { worktopsFor } from './worktop.js';
import { migrateDesign } from './design.js';
import { roomWalls } from './room.js';
import { dowelNoteRow } from './dowels.js';
// T78 F20 · a Cabineo unit's cut list says so in a NOTE row of the same grammar (OUTSIDE FACE UP, the gate).
import { cabineoNoteRow } from './cabineo.js';
// T78 F21 - the paint of the sprayed sets, litres off the spray schedule (CLAUDE.md PART F).
import { paintPurchaseQtys } from './spray.js';

/**
 * What ONE piece is finished in, as a name a workshop can order against
 * (turn 9, CLAUDE.md F4.5 / F6.3).
 *
 * ─── TURN 16 (CLAUDE.md F1.5): ONE SOURCE ───────────────────────────────────
 *
 * This function used to be a resolution of its own — the piece's override, then
 * `material_role === 'front' ? finishes.front : finishes.carcass`. That was the
 * second lookup table CLAUDE.md F1.5 removes: it could not tell Front 1 from
 * Front 2, and it knew nothing about the run pieces' own board, so a plinth cut
 * from a different sheet printed as a door.
 *
 * It is `engine/materials.js resolvePanelMaterial` now — the same call the 3D
 * view, the CNC sheet and the check-out make — and this is the thin wrapper
 * that keeps the BOM's own contract: the LABEL, and null when the caller gave
 * no design to resolve against (`buildBom` is used by tests and by callers that
 * only want quantities, and a made-up label would be worse than none).
 */
function partMaterialLabel(panel, resolved) {
  if (resolved?.assignmentProblem) return resolved.label;
  const own = panel.meta?.material_label;
  if (own) return String(own);
  return resolved?.label || null;
}

/**
 * @param {Array<{unit:object, result:object}>} entries
 * @param {object} [context]  { design, profile, materials } — supply the design
 *                            and every row carries the material it is cut from,
 *                            resolved per PIECE (turn 16) so a cabinet on Front
 *                            2 and a plinth on its own board are each labelled
 *                            with what they are actually cut from. `materials`
 *                            is the workshop's stock list, so an assigned board
 *                            with no finish of its own is named by its stock
 *                            name rather than by its slot.
 * @returns aggregated BOM
 */
export function buildBom(entries, {
  design = null, profile = null, materials = [], excludeDrawerBoxes = false, room = null,
} = {}) {
  const units = [];
  const roleTotals = {};
  const cutRows = new Map();       // identical pieces merge across the project
  const hardwareRows = new Map();  // …and so do identical hardware lines

  let pieces = 0;
  let boardArea = 0;
  let frontArea = 0;
  let boardEdging = 0;
  let frontEdging = 0;
  // T75 F5 · the worktop's own area (its slabs and upstands), kept apart.
  let worktopArea = 0;

  for (const { unit, result } of entries) {
    // Per PIECE, not per project and not per unit: a cabinet on its own door
    // style is finished in that style's material, a run piece on its own board
    // is cut from that board, and the cut list has to say so for each of them.
    // ─── Turn 32 (CLAUDE.md F7): a BOUGHT box is not a cut part ────────────
    // Its purchase line is bomInvoice's business; here it simply leaves the
    // rows, the areas, the edging and the counts.
    const counted = excludeDrawerBoxes
      ? result.panels.filter((p) => p.role !== 'drawer_box')
      : result.panels;
    const rows = counted.map((p) => {
      const resolved = design ? resolvePanelMaterial(p, unit, design, profile, materials) : null;
      const manufacturing = frontManufacturing(p);
      return {
        unit_num: result.unitNum,
        id: p.id,
        part: p.part,
        role: p.role,
        material_role: p.material_role,
        material_label: partMaterialLabel(p, resolved),
        // The GROUPING identity (CLAUDE.md F1.5): same board, same key. Two
        // front types on one board merge; two on different boards do not, and
        // an override moves a piece between groups.
        material_key: resolved?.key || null,
        material_id: resolved ? resolved.material_id : (p.meta?.material_id ?? null),
        w: p.w,
        h: p.h,
        qty: p.qty,
        thickness: p.thickness,
        edge: p.edging.code,
        edge_m: p.edging.len_m,
        area_m2: p.area_m2,
        // T75 F22 · *"The cut list, the BOM and the CNC export show the state
        // on every line"*: read off the part, never written into it.
        readiness: readinessOf(p, { drills: result.drills }),
        ...(manufacturing ? { manufacturing } : {}),
      };
    });
    // T75 F23 · a dowel unit's cut list says so in a NOTE row (the gate while
    // it is shut); counted in nothing, merged with nothing.
    const dowelNote = dowelNoteRow(result);
    const cabineoNote = cabineoNoteRow(result);
    // T76 F5 · a front with applied strips carries a NOTE for their gluing,
    // `manual`, in the same grammar: counted in nothing, merged with nothing.
    const stripNotes = appliedStripNotes(counted).map((n) => ({
      unit_num: result.unitNum,
      id: n.id,
      part: n.part,
      role: 'front_note',
      material_role: 'note',
      material_label: `NOTE: glue the ${n.strips} applied strips to ${n.host}`
        + `${n.mitre != null ? `, ${n.mitre} degree mitres` : ''}, after machining`,
      w: 0,
      h: 0,
      qty: 1,
      thickness: 0,
      edge: '',
      edge_m: 0,
      area_m2: 0,
      readiness: n.state,
    }));
    units.push({
      unitId: unit.id, unitNum: result.unitNum, type: result.type, rows: [...rows, ...stripNotes, ...(dowelNote ? [dowelNote] : []), ...(cabineoNote ? [cabineoNote] : [])], totals: result.totals, warnings: result.warnings,
    });

    for (const r of rows) {
      pieces += r.qty;
      if (r.material_role === 'front') { frontArea += r.area_m2 * r.qty; frontEdging += r.edge_m * r.qty; }
      // T75 F5 · an upstand is worktop material: neither board nor front.
      else if (r.material_role === 'worktop') { worktopArea += r.area_m2 * r.qty; }
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
      //
      // Turn 16 (F1.5): the identity is the resolved material's KEY where there
      // is one — the owner's rule, in the place the rule is applied. Two front
      // types on ONE board merge; two on different boards do not, even when the
      // label reads the same because neither has been given a finish.
      // T75 F22 · …and its state: an outline is not merged into a cut part.
      // T76 F1 · …and its decoration: two fronts with different recipes are
      // never one line (GPT's `manufacturing.identity`, one key with both).
      const key = `${r.part}|${r.w}|${r.h}|${r.thickness}|${r.edge}|${r.material_key || r.material_label || ''}|${r.readiness}`
        + (r.manufacturing ? `|${r.manufacturing.identity}` : '');
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
        hardwareRows.set(key, {
          ...h, qty: h.qty, units: new Set([result.unitNum]), readiness: 'bought',
        });
      }
    }
  }

  // ─── T75 F5 · THE WORKTOP REACHES THE BOM ──────────────────────────────
  //
  // *"one JOINT RECORD at the corner ... three worktop connector bolts as a
  // hardware BOM line; the bolt pockets are a NOTE ... A [cut-out] record is
  // drawn on the worktop sheet ... and listed as a BOM note."*  The slab is a
  // design-layer piece `computeCabinet` never reads (T30's law, held), so it
  // is resolved HERE from the design's records and the units it lies on, and
  // listed as its own block: one line per slab (bought, its size), the bolts
  // as an order line, and every cut-out and joint as a NOTE line. Only when a
  // room is handed in, because a slab that turns a corner is resolved in two
  // walls' frames; every caller written before tonight passes none and gets
  // exactly the BOM it got.
  if (design && room) {
    const slabs = worktopsFor({
      records: migrateDesign(design).worktops,
      units: entries.map((e) => e.unit).filter(Boolean),
      profile,
      walls: roomWalls(room),
    });
    if (slabs.length) {
      const rows = [];
      const joints = new Map();
      for (const slab of slabs) {
        const g = slab.geometry;
        const area = Array.isArray(g.outline) ? polygonAreaM2(g.outline) : roundTo((g.w * g.d) / 1e6, 4);
        worktopArea += area;
        rows.push({
          unit_num: 'WT',
          id: slab.slabId || slab.id,
          part: 'WORKTOP',
          role: 'worktop',
          material_role: 'worktop',
          material_label: g.decor || `Worktop ${g.thickness} mm${g.shape === 'L' ? ', L-shaped' : ''}`,
          material_key: null,
          material_id: null,
          w: roundTo(g.w, 1),
          h: roundTo(g.d, 1),
          qty: 1,
          thickness: g.thickness,
          edge: '',
          edge_m: 0,
          area_m2: area,
          readiness: 'bought',
        });
        for (const c of slab.cutouts || []) {
          rows.push({
            unit_num: 'WT',
            id: `${slab.slabId || slab.id} ${c.kind} cut-out`,
            part: 'WORKTOP-CUTOUT',
            role: 'worktop_note',
            material_role: 'note',
            material_label: `NOTE: ${c.note}`,
            w: c.w,
            h: c.d,
            qty: 1,
            thickness: g.thickness,
            edge: '',
            edge_m: 0,
            area_m2: 0,
            readiness: c.readiness,
          });
        }
        // T78 F2 · one note per JOINT, not per record: an L with a run along
        // each arm carries TWO (arm A, arm B) under one record, and T75's
        // corner pair carries ONE shared by its two slabs (the same `at`), so
        // the key is where the joint is. The probe (verify/t78/f02-probe.md,
        // THE FIX) found the second arm's joint overwrote the first: one note
        // and three bolts for two joints.
        if (slab.joint) {
          const at = slab.joint.at || {};
          joints.set(`${slab.id}@${at.wall ?? ''}:${at.x ?? ''}`, { recordId: slab.id, joint: slab.joint });
        }
      }
      for (const { recordId, joint } of joints.values()) {
        rows.push({
          unit_num: 'WT',
          id: `${recordId} joint${joint.arm ? ` arm ${joint.arm}` : ''}`,
          part: 'WORKTOP-JOINT',
          role: 'worktop_note',
          material_role: 'note',
          material_label: `NOTE: ${joint.note}`,
          w: 0,
          h: 0,
          qty: 1,
          thickness: 0,
          edge: '',
          edge_m: 0,
          area_m2: 0,
          readiness: joint.readiness,
        });
        const key = 'worktop_bolts|connector bolt';
        const merged = hardwareRows.get(key);
        if (merged) { merged.qty += joint.boltCount; merged.units.add('WT'); } else {
          hardwareRows.set(key, {
            role: 'worktop_bolts',
            label: 'Worktop connector bolts',
            qty: joint.boltCount,
            unit: 'pcs',
            spec: { per_joint: joint.boltCount },
            spec_label: 'connector bolt',
            units: new Set(['WT']),
            readiness: 'bought',
          });
        }
      }
      units.push({
        unitId: 'worktops',
        unitNum: 'WT',
        type: 'WORKTOP',
        rows,
        totals: { pieces_total: rows.filter((r) => r.role === 'worktop').length },
        warnings: [],
      });
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
      // T75 F5 · present only when a slab is listed, so every BOM before
      // tonight reads the same totals.
      ...(worktopArea > 0 ? { worktop_area_m2: roundTo(worktopArea, 4) } : {}),
    },
  };
}

/** T75 F5 · the area of a plan outline in m2 (the shoelace). */
function polygonAreaM2(points) {
  let a = 0;
  for (let i = 0; i < points.length; i += 1) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    a += x1 * y2 - x2 * y1;
  }
  return roundTo(Math.abs(a) / 2 / 1e6, 4);
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

// ═══════════════════════════════════════════════════════════════════════════
// TURN 39 (CLAUDE.md F5): THE BOM ENGINE
// ═══════════════════════════════════════════════════════════════════════════
//
// Everything above this line is turn 3's BOM and stays exactly as it is: a
// CUT LIST, grouped by the engine's own roles, which is what a saw needs.
//
// What a joiner BUYS is a different document, and this is it. The shape and
// the naming are Production Core's `bom.js` — `buildWindowPartQtys` /
// `mergeWindowMaterials` / `bump()` — with cabinet nouns.
//
// ─── THE SECOND COLLAPSE ────────────────────────────────────────────────────
//
// The owner: *"jeśli ten sam wszędzie to połączyć w jedno"*. F1 collapsed many
// engine elements into one assignable PART. This collapses many parts into one
// PURCHASE LINE, and it needs no special case at all: the accumulator is keyed
// on `mat:{material_id}`, so if the sides, the top, the bottom, the partitions
// and the shelves all point at the same Egger board, they land on the same key
// and the BOM shows ONE line with the summed area. That is the whole feature,
// and it falls out of the key.
//
// PURE. Arguments in, list out. No React, no store read, no engine call — the
// COMPUTED result is handed in, which is what makes this turn byte-identical
// (iron rule 2): the BOM is a READ-ONLY consumer of the engine's answer.

/** m² per one sheet of a given board. */
function sheetAreaM2(sheet) {
  const w = Number(sheet?.width) || 0;
  const h = Number(sheet?.height) || 0;
  return w > 0 && h > 0 ? (w * h) / 1e6 : 0;
}

/**
 * How many sheets an area needs — and it ALWAYS ROUNDS UP, because half a
 * sheet is a sheet you had to buy.
 *
 * CLAUDE.md F5 is explicit that this is an ESTIMATE and says why: real nesting
 * is parked, and a number that pretends otherwise is worse than no number. Two
 * shelves that would nest side by side off one offcut are counted here as
 * their area, not as their outline.
 */
export function sheetsFor(m2, sheet) {
  const one = sheetAreaM2(sheet);
  const area = Number(m2) || 0;
  if (!(one > 0) || !(area > 0)) return null;
  return Math.ceil(area / one);
}

/**
 * Which of the workshop's TWO boards a part is bought off (T35-F15).
 *
 * ONE DECIDER, and it is not this file's. `cnc/groups.js groupOfPanel` decides
 * which group a cut part is in — on its ROLE, never on its id string — and
 * `checks.js sheetFamilyOfPanel` turns that into 'fronts' or 'carcasses'. The
 * sheet a part is CHECKED against and the sheet it is ESTIMATED against must be
 * the same board or the two documents contradict each other, so this set is the
 * exact image of `groups.js:125`:
 *
 *     role 'front' | 'end_panel' | 'mask' | 'blind_blank' (T75 F3) | 'false_front' (T75 F14)
 *       | 'pelmet' (T75 F15)  → fronts
 *     everything else                      → carcasses
 *
 * Note what that puts on the CARCASS board: the plinth and the infills. They
 * are sprayed with the doors and this app files them under FRONT material, but
 * the engine has measured them against the carcass sheet since T35 and a
 * workshop cuts them off it. `test/t39-bom-engine.test.js` walks every cabinet
 * and asserts the two answers agree panel by panel.
 */
// T76 F1 · the union: T75's `pelmet` and GPT's `front_moulding` both.
const FRONT_SHEET_PARTS = new Set(['door', 'drawer_front', 'front_moulding', 'false_front', 'end_panel', 'mask', 'pelmet']);

export function sheetFamilyOfPart(partId) {
  return FRONT_SHEET_PARTS.has(partId) ? 'fronts' : 'carcasses';
}

/** A quantity as a workshop reads it: whole pieces, two decimals otherwise. */
export function formatQty(value, unit) {
  const n = Number(value) || 0;
  const whole = unit === 'pcs' || unit === 'pairs';
  return `${whole ? Math.round(n) : n.toFixed(2)} ${unit}`;
}

/**
 * What ONE CABINET needs, keyed by assignable part id.
 *
 * @param {object} computed   a `computeCabinet()` result — READ, never called
 * @param {object} unit       the unit record it came from
 * @param {object} [settings] { profile }
 * @returns {{[partId]: { m2?:number, m?:number, pcs?:number, unit:string }}}
 *
 * Three sources and no fourth:
 *   PANELS    → area, and the edging metres the engine already decided
 *   HARDWARE  → `result.hardware`, the engine's own hinge / runner / pin lists
 *   DRILLING  → the consumables, counted off holes that are already drilled
 *               (turn 32's invoice has read them this way for four turns)
 */
export function buildCabinetPartQtys(computed, unit, settings = {}) {
  const out = {};
  if (!computed) return out;
  const typeId = computed.type || unit?.type || null;

  const add = (partId, field, amount) => {
    if (!partId || !PART_REGISTRY[partId] || !(amount > 0)) return;
    const unitLabel = PART_REGISTRY[partId].unit;
    if (!out[partId]) out[partId] = { unit: unitLabel };
    out[partId][field] = (out[partId][field] || 0) + amount;
  };
  // The registry's own unit decides which field a quantity lands in, so a part
  // can never be counted in two currencies at once.
  const addQty = (partId, amount) => {
    const u = PART_REGISTRY[partId]?.unit;
    if (u === 'm²') add(partId, 'm2', amount);
    else if (u === 'm') add(partId, 'm', amount);
    else add(partId, 'pcs', amount);
  };

  // ── PANELS: area, and the banding the engine already measured ────────────
  for (const p of computed.panels || []) {
    const partId = partIdForElement(p.part, { typeId });
    if (!partId) continue;                       // F1's test makes this unreachable
    const qty = Number(p.qty) || 1;
    add(partId, 'm2', (Number(p.area_m2) || 0) * qty);
    // *"edging length from the perimeter of edged sides (read the existing
    // edging decision, do not invent one)"* — `panel.edging.len_m` IS that
    // decision, already summed over the edges `panel.edging.code` names.
    const edgePart = edgePartFor(partId);
    if (edgePart) add(edgePart, 'm', (Number(p.edging?.len_m) || 0) * qty);
  }

  // ── HARDWARE: the engine's own counts, never recomputed ──────────────────
  let hingeQty = 0;
  for (const h of computed.hardware || []) {
    const partId = HARDWARE_TO_PART_ID[h.role];
    if (!partId) continue;
    const qty = Number(h.qty) || 0;
    if (h.role === 'hinges') hingeQty += qty;
    if (h.role === 'rail') {
      // The engine counts rails in PIECES and knows each one's length; a
      // workshop buys tube by the METRE. `bomInvoice.js` has made exactly this
      // conversion since turn 32 — same read, same answer, one law.
      add(partId, 'm', ((Number(h.spec?.length_mm) || 0) * qty) / 1000);
      continue;
    }
    addQty(partId, qty);
  }
  // A hinge has a PLATE, and the plate is a separate product with a separate
  // price. One per hinge, off the engine's own count — turn 32's invoice line,
  // now assignable rather than only named.
  if (hingeQty > 0) addQty('hinge_plate', hingeQty);

  // ── DRILLING: the supports and the fixings, counted off real holes ───────
  const drills = computed.drills || [];
  const brackets = drills.filter((d) => d.kind === 'rail_bracket').length;
  if (brackets > 0) addQty('rail_support', brackets);
  // `/screw/` is `bomInvoice.js`'s own test and it is copied deliberately: two
  // documents that count the same holes must count them the same way.
  const screws = drills.filter((d) => /screw/.test(d.kind)).length;
  if (screws > 0) addQty('screw_confirmat', screws);
  const puzzles = drills.filter((d) => d.kind === 'puzzle').length;
  if (puzzles > 0) addQty('puzzle_screw', puzzles);
  // T75 F23 · *"dowels count in the BOM by the hardware law"*: one dowel per
  // pair, counted ONCE, off its FACE hole (the edge bore is its other half).
  const dowels = drills.filter((d) => d.kind === 'dowel' && d.face !== 'edge').length;
  if (dowels > 0) addQty('dowel', dowels);
  // Handles are placements, not a hardware role — the engine publishes them on
  // `drillSummary.handles`, and the key is ABSENT when there are none.
  const handles = computed.drillSummary?.handles?.length || 0;
  if (handles > 0) addQty('handle', handles);

  // Registry rows with NO engine producer, and it is on purpose:
  //   false_front        a FIX front comes off the engine as a `FRONT` today
  //   top_box_connector  no LISP line fixes a top box to its host, so there is
  //                      no count to read (rule: no invented numbers)
  //   glue               the joiner's own quantity, F8's custom rows
  //   (dowel has a producer since T75 F23: the dowel unit's pairs, above)
  //   led_profile        derived at PROJECT level, from the strip metres
  // Each can still be ASSIGNED a product; none of them fabricates a quantity.

  return out;
}

/** The lighting the whole PROJECT carries, keyed by part id. */
function lightingPartQtys(entries, { design = null, profile = null } = {}) {
  const out = {};
  if (!design || !profile) return out;
  let strip = 0;
  for (const row of lightingBomLines({ entries, design, profile })) {
    const partId = LIGHTING_TO_PART_ID[row.role];
    if (!partId) continue;
    const qty = Number(row.qty) || 0;
    if (!(qty > 0)) continue;
    const u = PART_REGISTRY[partId].unit;
    const field = u === 'm' ? 'm' : 'pcs';
    if (!out[partId]) out[partId] = { unit: u };
    out[partId][field] = (out[partId][field] || 0) + qty;
    if (partId === 'led_strip') strip += qty;
  }
  // The aluminium CHANNEL. CLAUDE.md F1 names the row and the engine has no
  // line for it, so it is derived the only honest way there is: a metre of
  // channel per metre of strip. It is the strip's own length, not a guess.
  if (strip > 0) out.led_profile = { m: strip, unit: 'm' };
  return out;
}

/** The one measure a part entry carries, with the yield already applied. */
export function resolvePartTotal(entry, yieldCoeff = 1.0) {
  if (!entry) return { total: 0, unit: 'pcs' };
  const y = Number(yieldCoeff) > 0 ? Number(yieldCoeff) : 1.0;
  const raw = entry.m2 ?? entry.m ?? entry.pcs ?? 0;
  // Yield applies to EVERY unit, not only to area. Production Core made the
  // same call on Piotr's own instruction: a coefficient a joiner typed on a row
  // has to do something on that row, whatever the row is counted in.
  return { total: (Number(raw) || 0) * y, unit: entry.unit };
}

// Purchasing and assignment warnings validate the same individual strip stock.
function resolveMouldingMaterial(panel, unit, assignment, { design, profile, materials }) {
  const resolved = resolvePanelMaterial(panel, unit, design, profile, materials);
  if (resolved.overridden || !assignment?.material_id) return resolved;
  return resolvePanelMaterial({
    ...panel,
    meta: { ...panel.meta, material_key: null, material_label: null, material_id: assignment.material_id },
  }, unit, design, profile, materials);
}

/**
 * MANY CABINETS → ONE FLAT PURCHASE LIST.
 *
 * Production Core's `mergeWindowMaterials`, and its accumulator verbatim:
 *
 *   assigned   → key `mat:{material_id}`, `_assigned: true`, cost from the
 *                stock row — so every part on that board lands on ONE line
 *   unassigned → key `part:{partId}`,     `_assigned: false`, cost 0 — so the
 *                user sees exactly what is missing rather than a short total
 *
 * The project BOM is a SIMPLE SUM over the units, which is what makes it
 * impossible for one cabinet's BOM and the project's to disagree: the project
 * is this function over N entries, one cabinet is this function over 1.
 *
 * @param {Array<{unit:object, result:object}>} units
 * @param {object} ctx
 *   assignments      the schema-2 blob (any shape `normalizeAssignments` eats)
 *   materials        the workshop's stock list (`cc_materials` rows)
 *   ALL_PARTS        injectable, so a caller can narrow the walk; defaults to
 *                    the whole registry — and iterating THIS is what makes a
 *                    missing row a dropped line, which is why F1 has the test
 *                    it has
 *   profile, design  for the sheet estimate and the lighting lines
 */
export function mergeUnitMaterials(unitsIn = [], {
  assignments = null,
  assignmentsData = null,
  materials = [],
  // Named `ALL_PARTS` on the outside because CLAUDE.md F5 names it that, bound
  // to `parts` on the inside because `ALL_PARTS` is another module's export and
  // this house's import test — rightly — will not have a bare one here.
  ALL_PARTS: parts = REGISTRY_PARTS,
  profile = null,
  design = null,
  // T75 F21 · the prices this job was quoted at (`project.warehouseStamp`):
  // a material in it is priced at its quoted figure, never silently at today's.
  pricedAt = null,
} = {}) {
  // `= []` only defends against `undefined`; a caller with nothing to show may
  // well hand us a null, and a BOM screen must not be the thing that crashes.
  const units = Array.isArray(unitsIn) ? unitsIn : [];
  const data = normalizeAssignments(assignmentsData || assignments);
  const byId = new Map((materials || []).map((m) => [m.id, m]));
  const acc = {};

  // Production Core's `bump()`, unchanged in spirit: create on first sight,
  // then only ever add to the quantity.
  const bump = (key, fields, addQty, { partId = null, family = null } = {}) => {
    if (!acc[key]) {
      acc[key] = {
        qty: 0, parts: new Set(), _m2ByFamily: { carcasses: 0, fronts: 0 }, ...fields,
      };
    }
    acc[key].qty += addQty;
    if (partId) acc[key].parts.add(partId);
    // The sheet estimate is per BOARD FAMILY, because a workshop's carcass
    // board and its front board are different sizes (T35-F15). A line that
    // somehow carries both counts each family's sheets and adds them, rather
    // than measuring one board against the other's format.
    if (family && acc[key]._m2ByFamily[family] != null) acc[key]._m2ByFamily[family] += addQty;
  };

  const costOf = (mat) => {
    // T75 F21 · the quoted price first: *"prices change a quote only by the
    // owner's decision"*.
    const quoted = pricedAt?.prices?.[mat?.id];
    if (quoted && quoted.price != null) return Number(quoted.price) || 0;
    // CLAUDE.md F5 says `cc_materials.cost_per_unit`; Cabinet Core's own table
    // (sql/001_init.sql) calls the column `price`. Both are read, so the spec's
    // name works the day somebody adds it and today's column works now.
    const v = mat?.cost_per_unit ?? mat?.price;
    return Number(v) || 0;
  };
  // T75 F21 · *"The purchase BOM export carries `jc_uuid` and the material code
  // on every line that has them, so JoineryCore can import the shopping list by
  // identity."*  The code is the stock row's own `code`, else the warehouse's
  // `item_number`; and where the price came from rides beside it.
  const identityOf = (mat) => ({
    jc_uuid: mat?.jc_uuid ? String(mat.jc_uuid) : null,
    code: mat?.code ?? mat?.item_number ?? null,
    price_source: pricedAt?.prices?.[mat?.id] ? 'quoted' : (mat?.price_source || 'stock list'),
  });

  const consume = (partQtys, family) => {
    for (const part of parts) {
      const entry = partQtys[part.id];
      if (!entry) continue;
      const assignment = assignmentFor(data, part.id, family);
      const { total, unit } = resolvePartTotal(entry, assignment?.yield ?? 1.0);
      if (!(total > 0)) continue;
      const isArea = PART_REGISTRY[part.id]?.unit === 'm²';
      const sheetFamily = isArea ? sheetFamilyOfPart(part.id) : null;

      const mat = assignment?.material_id ? byId.get(assignment.material_id) : null;
      if (mat) {
        bump(`mat:${mat.id}`, {
          name: mat.name || mat.id,
          unit,
          costPerUnit: costOf(mat),
          source: 'material',
          material: mat,
          ...identityOf(mat),
          group: part.group,
          _assigned: true,
        }, total, { partId: part.id, family: sheetFamily });
        continue;
      }
      // Assigned to a material this workshop's list does not have, or not
      // assigned at all — the SAME line either way, because both mean "nobody
      // has told this BOM what to buy" and hiding one of them behind a price of
      // zero would be the more expensive mistake.
      bump(`part:${part.id}`, {
        name: part.name,
        unit,
        costPerUnit: 0,
        source: 'part',
        material: null,
        group: part.group,
        _assigned: false,
      }, total, { partId: part.id, family: sheetFamily });
    }
  };

  // Moulding thickness is chosen per front. Keep each strip's dimensions and
  // explicit stock until material validation has run, before areas merge.
  // Family assignments use the same material resolver as the cut list.
  const mouldingPart = parts.find((part) => part.id === 'front_moulding');
  const consumeMouldings = (entry, family) => {
    if (!mouldingPart) return;
    const assignment = assignmentFor(data, mouldingPart.id, family);
    for (const panel of entry.result.panels || []) {
      if (panel.part !== 'FRONT-MOULDING') continue;
      const area = (Number(panel.area_m2) || 0) * (Number(panel.qty) || 1);
      const { total, unit } = resolvePartTotal({ m2: area, unit: mouldingPart.unit }, assignment?.yield ?? 1.0);
      if (!(total > 0)) continue;
      const resolved = resolveMouldingMaterial(panel, entry.unit, assignment, { design, profile, materials });
      const mat = resolved.assigned ? byId.get(resolved.material_id) : null;
      const sheetFamily = sheetFamilyOfPart(mouldingPart.id);
      if (mat) {
        bump(`mat:${mat.id}`, {
          name: mat.name || mat.id, unit, costPerUnit: costOf(mat),
          source: 'material', material: mat, group: mouldingPart.group, _assigned: true,
        }, total, { partId: mouldingPart.id, family: sheetFamily });
      } else {
        bump(`part:front_moulding:${panel.thickness}`, {
          name: `Applied front mouldings ${panel.thickness} mm`, unit, costPerUnit: 0,
          source: 'part', material: null, group: mouldingPart.group, _assigned: false,
          assignmentProblem: resolved.assignmentProblem,
        }, total, { partId: mouldingPart.id, family: sheetFamily });
      }
    }
  };

  for (const entry of units) {
    if (!entry?.result) continue;
    const family = cabinetFamilyOf(entry.result.type || entry.unit?.type);
    const quantities = buildCabinetPartQtys(entry.result, entry.unit, { profile });
    if (quantities.front_moulding) {
      delete quantities.front_moulding;
      consumeMouldings(entry, family);
    }
    consume(quantities, family);
    // ── F8: the joiner's own rows, a fixed quantity per cabinet ────────────
    for (const cp of data.customParts || []) {
      const assignment = assignmentFor(data, cp.id, family);
      const total = (Number(cp.qtyPerUnit) || 0) * (Number(assignment?.yield) > 0 ? Number(assignment.yield) : 1);
      if (!(total > 0)) continue;
      const mat = assignment?.material_id ? byId.get(assignment.material_id) : null;
      if (mat) {
        bump(`mat:${mat.id}`, {
          name: mat.name || mat.id,
          unit: cp.unit || 'pcs',
          costPerUnit: costOf(mat),
          source: 'material',
          material: mat,
          ...identityOf(mat),
          group: 'consumable',
          _assigned: true,
        }, total, { partId: cp.id });
      } else {
        bump(`part:${cp.id}`, {
          name: cp.name,
          unit: cp.unit || 'pcs',
          costPerUnit: 0,
          source: 'custom',
          material: null,
          group: 'consumable',
          _assigned: false,
        }, total, { partId: cp.id });
      }
    }
  }

  // ── LIGHTING, which is a PROJECT fact and not a cabinet's ────────────────
  // `lightingBomLines` counts the strips over the whole entries list at once,
  // so it is consumed once, here, under the project's base assignments.
  if (design && profile && units.length) {
    consume(lightingPartQtys(units, { design, profile }), null);
  }

  // -- T78 F21 - THE PAINT, which is a PROJECT fact like the lighting --------
  // *"lines go to BOM > Purchase list"*: litres per sprayed set (set 1 the
  // fronts and the run pieces, set 2 a veneer or sprayed carcass), computed by
  // the spray law over the whole job, through the SAME door every registry
  // part takes: `paint_fronts` / `paint_carcass` under the base assignments,
  // priced by the paint the Assign Materials modal chose, or an unassigned
  // line that says so. The litres read the assigned paint's own coverage and
  // coats, so the assignment is handed in.
  if (design && profile && units.length) {
    consume(paintPurchaseQtys(units, { design, profile, assignments: data, materials }), null);
  }

  const carcassSheet = sheetSizeForFamily(profile, 'carcasses');
  const frontSheet = sheetSizeForFamily(profile, 'fronts');

  const rows = Object.entries(acc).map(([key, v]) => {
    const { _m2ByFamily, parts, ...rest } = v;
    const sheets = (sheetsFor(_m2ByFamily.carcasses, carcassSheet) || 0)
      + (sheetsFor(_m2ByFamily.fronts, frontSheet) || 0);
    return {
      key,
      ...rest,
      parts: [...parts],
      // An ESTIMATE, and labelled one everywhere it is shown. Null where the
      // line is not bought by the sheet at all.
      sheets: sheets > 0 ? sheets : null,
      lineCost: rest._assigned ? roundTo(v.qty * rest.costPerUnit, 2) : null,
    };
  });

  // Unassigned FIRST — CLAUDE.md F6: *"Unassigned lines sit at the TOP"*. That
  // is the opposite of Production Core's order, and it is the spec's call: what
  // is missing is the thing the joiner has to act on.
  rows.sort((a, b) => {
    if (a._assigned !== b._assigned) return a._assigned ? 1 : -1;
    return String(a.name).localeCompare(String(b.name));
  });
  return rows;
}

/**
 * The whole purchase document, with its totals — what the BOM view renders.
 *
 * `complete: false` is the one that matters. A BOM with a `part:` line in it
 * has a total that is missing money, and CLAUDE.md F6 says it must never be
 * shown as a confident number.
 */
export function purchaseBom(units = [], ctx = {}) {
  const rows = mergeUnitMaterials(units, ctx);
  const unassigned = rows.filter((r) => !r._assigned);
  const cost = rows.reduce((s, r) => s + (r.lineCost || 0), 0);
  return {
    rows,
    unassigned,
    totals: {
      lines: rows.length,
      unassigned: unassigned.length,
      sheets: rows.reduce((s, r) => s + (r.sheets || 0), 0),
      cost: roundTo(cost, 2),
      complete: unassigned.length === 0,
    },
  };
}

/**
 * WHAT THIS PROJECT ACTUALLY USES (turn 39, CLAUDE.md F3 / F7).
 *
 * The registry has 54 parts. A one-cabinet job uses a dozen. The Assign
 * Materials modal must not read "41 parts unassigned" at a joiner who has
 * assigned everything his kitchen contains, and the CNC warning must not fire
 * over a shoe box nobody has drawn.
 *
 * So this answers the only question either of them is really asking: which
 * parts does the CURRENT design need, in which cabinet families, and how much.
 *
 * @returns {{[partId]: { qty:number, unit:string, families:string[] }}}
 */
export function projectPartUsage(entries = [], { profile = null, design = null } = {}) {
  const rows = Array.isArray(entries) ? entries : [];
  const out = {};
  const note = (partId, entry, family) => {
    if (!entry || !PART_REGISTRY[partId]) return;
    const amount = entry.m2 ?? entry.m ?? entry.pcs ?? 0;
    if (!(amount > 0)) return;
    if (!out[partId]) out[partId] = { qty: 0, unit: entry.unit, families: [] };
    out[partId].qty += amount;
    if (family && !out[partId].families.includes(family)) out[partId].families.push(family);
  };
  for (const e of rows) {
    if (!e?.result) continue;
    const family = cabinetFamilyOf(e.result.type || e.unit?.type);
    const q = buildCabinetPartQtys(e.result, e.unit, { profile });
    for (const [partId, entry] of Object.entries(q)) note(partId, entry, family);
  }
  if (design && profile && rows.length) {
    // Lighting is a project fact, so it belongs to no family — a project's own
    // base assignment is what covers it.
    for (const [partId, entry] of Object.entries(lightingPartQtys(rows, { design, profile }))) {
      note(partId, entry, null);
    }
    // T78 F21 - and the paint, so the Assign Materials modal lists the two
    // paint parts as "used by this job" the moment a door exists.
    for (const [partId, entry] of Object.entries(paintPurchaseQtys(rows, { design, profile }))) {
      note(partId, entry, null);
    }
  }
  return out;
}

/**
 * The parts this project uses that have NOTHING behind them.
 *
 * A part counts as missing when any family that uses it has no material — so a
 * board assigned for the wardrobes and left blank for the kitchen bases is
 * still missing, and says which family it is missing for.
 *
 * @returns {Array<{ partId:string, part:object, families:string[] }>}
 */
export function unassignedInUse(entries = [], {
  assignments = null, assignmentsData = null, profile = null, design = null, materials = [],
} = {}) {
  const data = normalizeAssignments(assignmentsData || assignments);
  const usage = projectPartUsage(entries, { profile, design });
  const missingMouldingFamilies = new Set();
  if (usage.front_moulding) {
    for (const entry of entries) {
      if (!entry?.result) continue;
      const family = cabinetFamilyOf(entry.result.type || entry.unit?.type);
      const assignment = assignmentFor(data, 'front_moulding', family);
      for (const panel of entry.result.panels || []) {
        if (panel.part !== 'FRONT-MOULDING' || !(panel.area_m2 * (Number(panel.qty) || 1) > 0)) continue;
        const resolved = resolveMouldingMaterial(panel, entry.unit, assignment, { design, profile, materials });
        if (!resolved.assigned) missingMouldingFamilies.add(family);
      }
    }
  }
  const out = [];
  for (const [partId, use] of Object.entries(usage)) {
    const families = use.families.length ? use.families : [null];
    const missing = families.filter((f) => partId === 'front_moulding'
      ? missingMouldingFamilies.has(f)
      : !assignmentFor(data, partId, f)?.material_id);
    if (missing.length) {
      out.push({ partId, part: PART_REGISTRY[partId], families: missing.filter(Boolean) });
    }
  }
  return out.sort((a, b) => a.part.name.localeCompare(b.part.name));
}

/**
 * ─── THE CNC WARNING (turn 39, CLAUDE.md F7) ────────────────────────────────
 *
 * *"Export CNC warns (warns, not blocks) when the project has unassigned parts,
 * because a cut file for a board nobody has chosen is a cut file for the wrong
 * board."*
 *
 * WARNS. It returns a sentence or null; the caller says it and carries on. This
 * is the same grammar the Check pre-export hook already uses — it informs, it
 * never fixes and it never holds anything back. The one thing in this app that
 * holds a board back is the export gate, which is a different mechanism with
 * its own "Export anyway".
 *
 * It counts only the parts a BOARD is cut from: a missing hinge product is a
 * purchasing problem, and a DXF does not care what a hinge is made of.
 *
 * @returns {string|null}
 */
export function cncAssignmentWarning(entries = [], {
  assignments = null, assignmentsData = null, profile = null, design = null, materials = [],
} = {}) {
  const missing = unassignedInUse(entries, {
    assignments, assignmentsData, profile, design, materials,
  }).filter((m) => PART_REGISTRY[m.partId]?.unit === 'm²');
  if (!missing.length) return null;
  const names = missing.slice(0, 4).map((m) => m.part.name);
  const rest = missing.length - names.length;
  return `${missing.length} cut part${missing.length === 1 ? ' has' : 's have'} no board assigned `
    + `(${names.join(', ')}${rest > 0 ? ` and ${rest} more` : ''}) — `
    + 'the file will be cut, but nobody has said what from.';
}
