// ─── THE DRILL GUARD (turn 31, CLAUDE.md F3, Check #10) ─────────────────────
//
// Turn 25 wrote `cnc/edgeGuard.js` — the OUTLINE guard — because the owner
// found a doubled edge in his own AutoLISP and VCarve cuts a doubled edge from
// both sides. It has been tested since turn 25 and it was never wired to the
// export the owner actually presses.
//
// This is its twin for the other half of a CNC file: the HOLES. Two faults, and
// both of them are live in the app today rather than hypothetical.
//
// ─── 1. THE SAME HOLE, DRILLED TWICE ────────────────────────────────────────
//
// `hinge_rows [100, 100, 470]` — two hinge centres at the same height, which
// the editor will happily store — makes `computeCabinet()` emit the pair of
// cups at 84 and 116 TWICE, on the same panel, on the same layer, at the same
// coordinate, at the same diameter. On the machine that is the drill going back
// into a hole it has already made: at best a chewed edge, at worst a snapped
// 5 mm bit and a scrapped side. Nothing in this app has ever said so.
//
// It is the same class of fault as the doubled edge and it is checked the same
// way: same layer, same centre, same radius, at 0.01 mm — a tenth of the finest
// thing the machine can hold, and far below anything the engine rounds to.
//
// ─── 2. TWO HINGE ROWS TOO CLOSE TOGETHER ───────────────────────────────────
//
// The first fault's CAUSE, one level up, and it catches the near misses the
// coordinate test cannot: two rows 8 mm apart drill four holes that do not
// coincide and still cannot both take a hinge — the cups overlap, the plate
// screws land in each other's holes, and the second hinge has nowhere to go.
// `hingeMinSpacingMm` (profile, default 60 — the owner's number, 15.08.2026) is
// the line, and it is the same number `setHingePos` refuses at, so the guard
// and the setter cannot disagree about what is legal.
//
// ─── RULE 4: IT SPEAKS, IT NEVER FIXES ──────────────────────────────────────
//
// Nothing here moves a hole, drops a duplicate or re-spaces a hinge ladder. It
// returns findings. The EXPORT decides what to do with them (cnc/exportGate.js)
// and the SETTER decides what to refuse (stores/projectStore.js) — this file
// only ever says what is true.
//
// Pure functions — no React, no store, no three.js.

// TURN 40 (CLAUDE.md F1): the ONE post-split hinge reader.
import { drilledHingeRows } from '../hingeLadder.js';

/** How close two holes must be to be the same hole, in mm. */
export const DRILL_TOLERANCE = 0.01;

/**
 * How near two hinge rows may come.
 *
 * OWNER'S NUMBER, 15.08.2026: 60 mm. A Blum CLIP top cup is 35 mm across and
 * its plate reaches further again, so two rows inside 60 are two hinges that
 * cannot both be fitted.
 */
export function hingeMinSpacingMm(profile) {
  const n = Number(profile?.hinges?.minSpacingMm);
  return Number.isFinite(n) && n > 0 ? n : 60;
}

/**
 * Does the app REFUSE a row that close, or merely warn about it?
 *
 * CLAUDE.md F3: "One profile line flips block→warn if the owner ever wants it
 * loose." This is that line. It ships blocking, because the fault it stops is a
 * board in the skip.
 */
export function hingeSpacingBlocks(profile) {
  return profile?.hinges?.spacingBlocks !== false;
}

const key = (v, tol) => Math.round(Number(v) / tol);

/** What a hole is called in a message: the layer and where it is. */
function where(d) {
  return `${d.layer || 'DRILL'} ⌀${d.d} at (${round2(d.x)}, ${round2(d.y)})`;
}

const round2 = (v) => {
  const s = Number(v).toFixed(2);
  return s === '-0.00' ? '0' : s.replace(/\.?0+$/, '') || '0';
};

/**
 * Every hole that is drilled more than once.
 *
 * Grouped by PANEL and LAYER before comparing, for the same reason the edge
 * guard groups its loops: "the same hole twice" is a question about one tool's
 * program. A 5 mm hinge hole and a 7.5 mm puzzle hole at the same coordinate
 * are two different cutters and are not this fault — the diameter is part of
 * the key, so they cannot be confused.
 *
 * @param {Array} drills  `result.drills`
 * @param {object} [opts] { tolerance }
 * @returns {Array<{panel:string, layer:string, code:string, message:string,
 *                  x:number, y:number, d:number, times:number}>}
 */
export function duplicateDrills(drills, { tolerance = DRILL_TOLERANCE } = {}) {
  // Grouped by the three facts that make two holes THE SAME PROGRAM — board,
  // layer, cutter — and only then compared by coordinate. The grouping is a
  // key; the coordinates are NOT, because a key is a grid and a grid splits two
  // holes 0.005 mm apart whenever the grid line happens to fall between them.
  // A tolerance has to be a distance, so it is one. Each group is one board's
  // holes on one layer — tens of them — so the pairwise walk costs nothing.
  const groups = new Map();
  for (const drill of drills || []) {
    if (!drill || !Number.isFinite(Number(drill.x)) || !Number.isFinite(Number(drill.y))) continue;
    const k = [drill.panel || '', drill.layer || '', key(drill.d, tolerance)].join('|');
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(drill);
  }

  const seen = [];
  for (const list of groups.values()) {
    const rows = [];
    for (const drill of list) {
      const same = rows.find((r) => Math.abs(r.drill.x - drill.x) <= tolerance
        && Math.abs(r.drill.y - drill.y) <= tolerance);
      if (same) same.times += 1;
      else rows.push({ drill, times: 1 });
    }
    seen.push(...rows);
  }

  const out = [];
  for (const { drill, times } of seen) {
    if (times < 2) continue;
    out.push({
      panel: drill.panel,
      layer: drill.layer || 'DRILL',
      code: 'duplicate-drill',
      x: Number(drill.x),
      y: Number(drill.y),
      d: Number(drill.d),
      times,
      message: `${drill.panel}: ${where(drill)} is drilled ${times} times — `
        + 'the bit goes back into a hole it has already made.',
    });
  }
  return out.sort((a, b) => (a.panel < b.panel ? -1 : a.panel > b.panel ? 1 : 0) || (a.y - b.y) || (a.x - b.x));
}

/**
 * Hinge rows that stand closer together than a hinge can be fitted.
 *
 * Asked of the ROWS rather than of the holes, because that is the fact the
 * joiner can act on and the number the setter refuses at. A row list is sorted
 * on the way in — a hand-typed list is not guaranteed to be.
 *
 * @param {Array<number>} rows   hinge centres, mm up the carcass
 * @param {object} opts          { minSpacingMm, unitNum }
 */
export function hingeRowClashes(rows, { minSpacingMm = 60, unitNum = '' } = {}) {
  const list = (rows || []).map(Number).filter(Number.isFinite).sort((a, b) => a - b);
  const out = [];
  for (let i = 1; i < list.length; i += 1) {
    const gap = list[i] - list[i - 1];
    if (gap >= minSpacingMm) continue;
    const mm = Math.round(gap * 100) / 100;
    out.push({
      code: 'hinge-rows-too-close',
      a: list[i - 1],
      b: list[i],
      mm,
      minSpacingMm,
      message: mm === 0
        ? `${unitNum ? `${unitNum}: ` : ''}two hinge rows are both at ${round2(list[i])} mm — `
          + 'every hole in that row is drilled twice.'
        : `${unitNum ? `${unitNum}: ` : ''}hinge rows at ${round2(list[i - 1])} and ${round2(list[i])} mm `
          + `are ${mm} mm apart — under the ${minSpacingMm} mm minimum, so both hinges cannot be fitted.`,
    });
  }
  return out;
}

/**
 * Check #10, whole: every drill fault on one computed cabinet.
 *
 * An empty array is the pass. Nothing throws — the caller decides what a
 * finding is worth, which is what lets one function serve a test, the Check
 * panel and the export gate.
 *
 * @param {object} result   computeCabinet() output
 * @param {object} opts     { profile, unitId, unitNum }
 */
export function drillFindings(result, { profile = null, unitId = null, unitNum = null } = {}) {
  const out = [];
  const num = unitNum || result?.unitNum || '';

  for (const dup of duplicateDrills(result?.drills)) {
    out.push({
      check: 10,
      level: 'red',
      unitId,
      unitNum: num,
      panel: dup.panel,
      layer: dup.layer,
      code: dup.code,
      message: dup.message,
      at: { x: dup.x, y: dup.y },
    });
  }

  // TURN 40 (CLAUDE.md F1): the rows the side is ACTUALLY bored at. On a
  // cabinet with no split this IS `hinge_centers`; on a split one it is the
  // union of the segments' own ladders, which is exactly what
  // `engine/cabinet.js platedRowsFor` drills — so the guard and the machine
  // measure one column.
  const rows = drilledHingeRows(result);
  for (const clash of hingeRowClashes(rows, {
    minSpacingMm: hingeMinSpacingMm(profile), unitNum: num,
  })) {
    out.push({
      check: 10,
      level: 'red',
      unitId,
      unitNum: num,
      // The rows are the CARCASS's — one column per hinged side — so the fault
      // belongs to the cabinet rather than to one board, and the finding says
      // so instead of picking a side at random.
      panel: null,
      layer: profile?.hinges?.layer || 'HINGES_5MM',
      code: clash.code,
      message: clash.message,
      rows: [clash.a, clash.b],
      mm: clash.mm,
    });
  }

  return out;
}

/** A drill finding, as one line of a report. */
export function formatDrillFinding(f) {
  return `${f.unitNum || ''}${f.panel ? ` ${f.panel}` : ''} [${f.layer}] ${f.code}: ${f.message}`;
}
