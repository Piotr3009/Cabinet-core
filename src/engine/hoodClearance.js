// --- T78 F17 . THE HOOD'S CLEARANCE OVER THE HOB: ONE MEASURE, TWO READERS --
//
// The owner, 11.10.2026: *"szafka na hood tradycyjna czyli wysunieta pod
// skosem albo normalna szafka tylko mniejsza zeby bylo 650 do 750 minimum nad
// blatem, nad hobem"*, and, on 650 or 750: *"tak jak mowisz ale pozostaw to
// dla klienta, tylko proponuj."*
//
// CLAUDE.md T78 F17, THE CLEARANCE LAW: *"a Check and a proposal, never a
// block: over a hob unit (F14's `hob` flag or an `OVEN_BASE`), the gap from the
// worktop to the hood's underside is measured; below `profile.hood.clearance =
// { induction: 650, gas: 750 } // T78 proposed` for the hob kind the client set
// (a choice on the hob unit: `hob_kind: 'induction' | 'gas'`, default
// induction) the Check says the number and offers one click: raise the hood to
// the clearance (its `mount_height`). The client may leave it."*
//
// This module is the MEASURE, said once. Two readers: `engine/checks.js` makes
// Check #34 of its rows, and `stores/projectStore.js` says the same row as a
// yellow with a button (T78 F6's grammar) and raises the hood on the click
// (`raiseHoodToClearance`). Neither re-derives a number.
//
// THE DATUMS, read where they already live:
//   the worktop top    the slab over the hob where a record covers it
//                      (`worktop.js worktopsFor`: geometry.y + geometry.h, the
//                      record's own thickness, T75 F17), else the hob's top
//                      plus the workshop's slab (`unitTop` + `worktopSpec`);
//   the hood's underside   `runs.js unitBase`: a wall unit's `mount_height`.
//
// "Over" means on the same wall at the hob's level, with the two x-spans
// overlapping. A hood on another wall, or beside the hob, is not over it.
//
// Pure functions: no React, no store, no three.js.

import { getUnitType } from './types.js';
import { unitBase, unitTop } from './runs.js';
import { worktopsFor, worktopSpec } from './worktop.js';
import { migrateDesign } from './design.js';

/** The two kinds the owner named, in his order. */
export const HOB_KINDS = Object.freeze(['induction', 'gas']);

/** Is this unit the hob's: a hob drawer unit (T75 F14's flag) or the oven base. */
export function isHobUnit(unit) {
  if (!unit) return false;
  if (unit.params?.hob === true) return true;
  return getUnitType(unit.type)?.appliance === 'oven';
}

/** The hob kind the client chose on the unit; nothing chosen is induction (the default, a CHOICE unwritten). */
export function hobKindOf(unit) {
  return unit?.params?.hob_kind === 'gas' ? 'gas' : 'induction';
}

/** Is this unit a hood: any kit with the extractor as its appliance (WUD_HOOD, the short one, the canopy). */
export function isHoodUnit(unit) {
  return Boolean(unit) && getUnitType(unit.type)?.appliance === 'extractor';
}

/** The owner's numbers, read off the profile (`hood.clearance`); 650 / 750 where a profile says nothing. */
export function hoodClearanceMm(profile, kind = 'induction') {
  const c = profile?.hood?.clearance || {};
  const fallback = kind === 'gas' ? 750 : 650;   // T78 proposed, owner to confirm
  const v = Number(c[kind]);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

/**
 * The worktop top over this hob, in mm off the floor: the slab a record lays
 * over it where there is one, else the hob's top plus the workshop's slab.
 */
function worktopTopOver(hob, {
  records = [], units = [], profile, walls = null, inframe = false,
} = {}) {
  if (!hob) return null;
  // T80 F8 · under in-frame the slab sits on the frame: the hob's top is 19 higher.
  const slabs = worktopsFor({
    records: records || [], units, profile, walls, inframe,
  });
  const over = slabs.find((s) => (s.geometry?.unitIds || []).includes(hob.id)
    || (s.unitIds || []).includes(hob.id));
  if (over?.geometry && Number.isFinite(Number(over.geometry.y)) && Number.isFinite(Number(over.geometry.h))) {
    return Math.round((Number(over.geometry.y) + Number(over.geometry.h)) * 100) / 100;
  }
  return Math.round((unitTop(hob, profile) + worktopSpec(profile).thickness) * 100) / 100;
}

const spanOf = (u) => {
  const x = Number(u.position?.x_mm) || 0;
  const w = Number(u.params?.width) || 0;
  return { left: x, right: x + w };
};

/**
 * THE MEASURE: one row per hood that stands over a hob, whether it is short
 * of the clearance or not (`shortMm` is 0 when it is clear).
 *
 * @param {object} args
 *   units    the room's units
 *   profile  the cabinet profile
 *   design   the project's design (its worktop records); null is "no records"
 *   walls    `roomWalls(room)`, for an island's slab; null is fine
 * @returns {Array<{hoodId, hoodNum, hobId, hobNum, hobKind, wantMm, gapMm, worktopTopMm, mountHeightMm, raiseToMm, shortMm}>}
 */
export function hoodClearanceRows({
  units = [], profile, design = null, walls = null,
} = {}) {
  const list = (units || []).filter(Boolean);
  const hoods = list.filter(isHoodUnit);
  if (!hoods.length) return [];
  const records = design ? (migrateDesign(design).worktops || []) : [];
  const rows = [];
  for (const hood of hoods) {
    if (getUnitType(hood.type).mount !== 'wall') continue;
    const wall = hood.position?.wall ?? 0;
    const hs = spanOf(hood);
    const hobs = list.filter((u) => u.id !== hood.id && isHobUnit(u)
      && (u.position?.wall ?? 0) === wall
      && getUnitType(u.type).mount === 'floor');
    for (const hob of hobs) {
      const bs = spanOf(hob);
      const overlap = Math.min(hs.right, bs.right) - Math.max(hs.left, bs.left);
      if (!(overlap > 0)) continue;
      const kind = hobKindOf(hob);
      const want = hoodClearanceMm(profile, kind);
      const top = worktopTopOver(hob, {
        records, units: list, profile, walls, inframe: design ? migrateDesign(design).inframe === true : false,
      });
      const mount = unitBase(hood, profile);
      const gap = Math.round((mount - top) * 100) / 100;
      const short = Math.max(0, Math.round((want - gap) * 100) / 100);
      rows.push({
        hoodId: hood.id,
        hoodNum: hood.params?.unit_num || '',
        hobId: hob.id,
        hobNum: hob.params?.unit_num || '',
        hobKind: kind,
        wantMm: want,
        gapMm: gap,
        worktopTopMm: top,
        mountHeightMm: Math.round(mount * 100) / 100,
        raiseToMm: Math.round((top + want) * 100) / 100,
        shortMm: short,
      });
    }
  }
  return rows;
}

/** The rows that are SHORT of the clearance: what Check #34 and the proposal speak of. */
export function hoodClearanceShortfalls(args) {
  return hoodClearanceRows(args).filter((r) => r.shortMm > 0);
}

/** For one hood: the mount height that clears every hob under it (the highest ask), or null when nothing is short. */
export function hoodRaiseTo(hoodId, args) {
  const mine = hoodClearanceShortfalls(args).filter((r) => r.hoodId === hoodId);
  if (!mine.length) return null;
  return Math.max(...mine.map((r) => r.raiseToMm));
}

/** The sentence, said the same by both readers. */
export function hoodClearanceMessage(row) {
  const num = row.hoodNum ? `${row.hoodNum}: ` : '';
  const hob = row.hobNum ? ` (${row.hobNum})` : '';
  return `${num}the hood's underside is ${row.gapMm} mm over the hob's worktop${hob}; `
    + `${row.hobKind} asks ${row.wantMm} mm. Raise it to ${row.raiseToMm} mm, or leave it: the client decides.`;
}
