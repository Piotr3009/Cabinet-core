// ─── T75 F23 · THE SECOND JOINT SYSTEM: DOWELS, THE ENGINE'S MIRROR OF ───────
// ─── reference/lisp/SKYLON_JOINTS_DOWEL.lsp ─────────────────────────────────
//
// The owner, 9.10.2026: *"lisp najpierw."*  CLAUDE.md T75 F23: *"Dowels
// first, Cabineo's data slot only ... Switching a unit REPLACES all of its
// puzzle sockets and tenons with dowel pairs on both boards (never both
// systems on one joint); dowels count in the BOM by the hardware law."*
//
// `reference/lisp/SKYLON_JOINTS_DOWEL.lsp` was written and paren-balanced
// BEFORE this file existed (ceb5fde), and sections A to F below mirror it
// routine for routine: `dowel-positions` is `dowelPositions`, the same
// arguments in the same order, the same 1e-9 slack, the same answers. A hole
// is returned the way the LISP returns it, as a list:
//   FACE  [board, 'FACE', x, y, dia, depth]
//   EDGE  [board, 'EDGE', x, y, dia, depth, edgeName, z]
// `test/turn75-f23-dowels.test.js` holds them to the LISP's NUMBERS block
// (section H, a BUD 600) board by board.
//
// T78 F19 (11.10.2026): the owner's numbers replace T75's proposals, in the
// LISP first and here second. The owner: *"minimum 2 a kołki co mniej więcej
// co 250 mm"*, dowels 6 mm, the end offset 50 kept as his. `dowelProfile`
// reads `minPerJoint` and no longer `maxGapMm` (the pitch IS the widest gap
// a joint may show, so T75's second maximum said nothing; the LISP, section
// A); `dowelPositions` takes (L, e, p, nMin, dia) as `dowel-positions` does
// and spreads the dowels EVENLY between the two end offsets, never fewer
// than two, no gap over the pitch (section B). The depths (edge 20, face 12)
// stay T75 proposed. `test/turn78-f19-dowels.test.js` holds the rule at six
// lengths; the T75 test moves with the LISP's NUMBERS block, knowingly.
//
// Section Z is what the LISP leaves to the engine. The pattern is asked of the
// PARENT's own puzzle cut first (`dowelVerdict`, F7's grammar: *"Room refuses
// first: nothing is clipped silently"*), and refused in words where the kit
// is not the five-board carcass the LISP's table is written for, where the
// carcass is cut under a slope or notched, where the profile cannot make a
// sound joint (`dowel-refusal`), or where a dowel would meet a hole the kit
// already drills (the wall unit's hanger, for one). Accepted, it is a PLAN:
// `computeCabinet` strips the puzzle off the planned boards before its
// drilling pass (`dowelStrip`), adds the pairs after it (`dowelDrills`) and
// lets the FIX shelves the plan names give up their biscuit set and their
// through screws. A unit whose joint system is 'puzzle' (every unit, unless a
// person chose otherwise) never reaches a line of section Z, so every golden
// is byte-identical by construction.
//
// Pure: numbers in, numbers or records out. No store, no React, no three.js.

import { roundTo } from './format.js';
// T78 F19 · the company row's `joints_system` and the one cascade every
// preference climbs (T22): profile → company row → project → unit.
import { cascade, companyDefaults, levelsOf } from './companyDefaults.js';

const EPS = 1e-6;

/** THE GATE's sentence, the LISP's `dowel-gate`, word for word. */
export const DOWEL_GATE = 'the dowel pattern is proposed, not confirmed by the owner';
/** CLAUDE.md F23: *"The system id `'cabineo'` is reserved in the profile and refused with that sentence."* */
export const CABINEO_REFUSAL = 'Cabineo is reserved: its data is not in the repo yet (reference/hardware/cabineo/README.md)';
/** The engine's warning codes. Check #31 reads both. */
export const DOWEL_GATE_CODE = 'DOWEL_GATE';
export const JOINTS_REFUSED = 'JOINTS_REFUSED';
/**
 * The joint systems a unit may name. CLAUDE.md T78 F19: `puzzle | dowel |
 * biscuit | cabineo8 | cabineo12`. 'biscuit' is SKYLON_JOINTS_BISCUIT.lsp's
 * (engine/biscuitJoints.js), 'cabineo8' and 'cabineo12' are
 * SKYLON_JOINTS_CABINEO.lsp's (engine/cabineo.js); `computeCabinet` branches
 * on each before the dowel verdict. The bare 'cabineo' of T75 stays reserved
 * and refused with CABINEO_REFUSAL: the owner chose the variant in the
 * company's defaults, so the id must say which (8 or 12).
 */
export const JOINT_SYSTEMS = Object.freeze(['puzzle', 'dowel', 'biscuit', 'cabineo', 'cabineo8', 'cabineo12']);
/** The five-board carcass the LISP's table (section D) is written for. */
export const DOWEL_BOARDS = Object.freeze(['BUL', 'BUR', 'TOP', 'BOTTOM', 'BACK']);

// ═══════════════════════════════════════════════════════════════════════════
// A. THE PROFILE NUMBERS (dowel-profile, dowel-get)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * dowel-profile: `profile.joints.dowel`, every number the LISP keys, read
 * under the LISP's own key. The fallbacks are the LISP's numbers, so a bare
 * call answers exactly what SKYLON_JOINTS_DOWEL.lsp prints.
 */
export function dowelProfile(profile = {}) {
  const d = profile?.joints?.dowel || {};
  const num = (v, fallback) => (Number.isFinite(Number(v)) && v !== null && v !== '' ? Number(v) : fallback);
  // T78 F19: no `maxGapMm` any more. The owner, 11.10.2026: *"minimum 2 a
  // kołki co mniej więcej co 250 mm"*: the pitch is the widest gap a joint
  // may show, so T75's second maximum (128 = 4 pitches) is not part of the
  // rule and is not read; a saved profile that still carries it is ignored.
  return {
    diaMm: num(d.diaMm, 6),               // owner 11.10, decided ("6 mm")
    edgeDepthMm: num(d.edgeDepthMm, 20),  // T75 proposed, owner to confirm
    faceDepthMm: num(d.faceDepthMm, 12),  // T75 proposed, owner to confirm
    pitchMm: num(d.pitchMm, 250),         // owner 11.10, decided ("co mniej więcej co 250 mm")
    minPerJoint: num(d.minPerJoint, 2),   // owner 11.10, decided ("minimum 2")
    endOffsetMm: num(d.endOffsetMm, 50),  // owner 11.10, decided
    confirmed: d.confirmed === true,
  };
}

/** dowel-get: one number (or the flag) off a profile. */
export function dowelGet(prof, key) {
  return prof?.[key];
}

// ═══════════════════════════════════════════════════════════════════════════
// B. THE SPACING RULE (dowel-ceil, dowel-positions, dowel-too-close)
// ═══════════════════════════════════════════════════════════════════════════

/** dowel-ceil: ceil for x >= 0, with the 1e-9 slack (`fix` truncates). */
export function dowelCeil(x) {
  const n = Math.trunc(x);
  return x - n > 1e-9 ? n + 1 : n;
}

/**
 * dowel-positions: the offsets along a joint of length L, from its reference
 * end (T78 F19, the LISP's section B, step for step):
 *   1. L <= 0: none.
 *   2. The two END dowels at e and L - e; the span S = L - 2e.
 *   3. S < dia (the two ends would meet, closer than one diameter): ONE dowel
 *      on the centre, L / 2, as T75's step 3 did on a short run. The only
 *      case under the owner's minimum (L < 2e + dia = 106).
 *   4. The COUNT n = max(nMin, 1 + ceil(S / p)): never fewer than two, one
 *      more for every pitch the span holds.
 *   5. The SPACING: n - 1 EQUAL gaps of S / (n - 1), the last offset written
 *      as L - e so no floating remainder reaches the far end.
 * Same arguments as the LISP, in its order; nMin is read whole (`fix`).
 */
export function dowelPositions(L, e, p, nMin, dia) {
  L = Number(L); e = Number(e); p = Number(p); dia = Number(dia);
  if (L <= 0) return [];
  if (L - e - e < dia) return [L / 2];
  const S = L - e - e;
  const n = Math.trunc(Math.max(nMin, 1 + dowelCeil(S / p)));
  const g = S / (n - 1);
  const out = [];
  for (let i = 0; i < n - 1; i += 1) out.push(e + i * g);
  out.push(L - e);
  return out;
}

/** dowel-too-close: do two neighbouring dowels stand closer than one diameter? */
export function dowelTooClose(offs, dia) {
  let prev = null;
  let hit = false;
  for (const o of offs) {
    if (prev !== null && o - prev < dia) hit = true;
    prev = o;
  }
  return hit;
}

// ═══════════════════════════════════════════════════════════════════════════
// C. THE JOINT RECORD AND THE HOLES (dowel-joint, dowel-jget,
//    dowel-face-holes, dowel-edge-holes, dowel-joint-holes)
// ═══════════════════════════════════════════════════════════════════════════

/** dowel-joint: one joint, every field the LISP names, in its order. */
export function dowelJoint(
  name, len, ref,
  face, fAxis, fFrom, fDir, fEdge, fIn,
  edge, eNm, eAt, eFrom, eDir, eT,
) {
  return {
    name, len: Number(len), ref,
    face, faceAxis: fAxis, faceFrom: Number(fFrom),
    faceDir: Number(fDir), faceEdge: Number(fEdge), faceIn: Number(fIn),
    edge, edgeName: eNm, edgeAt: Number(eAt),
    edgeFrom: Number(eFrom), edgeDir: Number(eDir), edgeT: Number(eT),
  };
}

/** dowel-jget: one field off a joint. */
export function dowelJget(jt, key) {
  return jt?.[key];
}

/**
 * dowel-face-holes: on the JOINT LINE, offset by half the mating (edge)
 * board's thickness, so each hole is on the centre of the edge it meets.
 */
export function dowelFaceHoles(jt, offs, dia, depth) {
  const axis = dowelJget(jt, 'faceAxis');
  const from = dowelJget(jt, 'faceFrom');
  const dir = dowelJget(jt, 'faceDir');
  const jline = dowelJget(jt, 'faceEdge') + dowelJget(jt, 'faceIn') * (dowelJget(jt, 'edgeT') / 2);
  return offs.map((off) => {
    const [x, y] = axis === 'X' ? [from + dir * off, jline] : [jline, from + dir * off];
    return [dowelJget(jt, 'face'), 'FACE', x, y, dia, depth];
  });
}

/**
 * dowel-edge-holes: bored INTO the named edge, square to it, centred in the
 * board's thickness (z = edgeT / 2). (x, y) is the mouth of the bore.
 */
export function dowelEdgeHoles(jt, offs, dia, depth) {
  const edgeNm = dowelJget(jt, 'edgeName');
  const at = dowelJget(jt, 'edgeAt');
  const from = dowelJget(jt, 'edgeFrom');
  const dir = dowelJget(jt, 'edgeDir');
  const z = dowelJget(jt, 'edgeT') / 2;
  return offs.map((off) => {
    const [x, y] = edgeNm === 'X0' || edgeNm === 'XW' ? [at, from + dir * off] : [from + dir * off, at];
    return [dowelJget(jt, 'edge'), 'EDGE', x, y, dia, depth, edgeNm, z];
  });
}

/** dowel-joint-holes: one joint, whole: [offsets, faceHoles, edgeHoles]. */
export function dowelJointHoles(jt, prof) {
  const dia = dowelGet(prof, 'diaMm');
  const offs = dowelPositions(
    dowelJget(jt, 'len'),
    dowelGet(prof, 'endOffsetMm'),
    dowelGet(prof, 'pitchMm'),
    dowelGet(prof, 'minPerJoint'),
    dia,
  );
  return [
    offs,
    dowelFaceHoles(jt, offs, dia, dowelGet(prof, 'faceDepthMm')),
    dowelEdgeHoles(jt, offs, dia, dowelGet(prof, 'edgeDepthMm')),
  ];
}

// ═══════════════════════════════════════════════════════════════════════════
// D. THE JOINT TABLE (dowel-joint-table)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * dowel-joint-table: every joint the puzzle makes in the five-board carcass,
 * and the FIX shelf to side joint. fixShelves: [[row, shelfT, setback], ...],
 * row the shelf's UNDERSIDE from the floor.
 */
export function dowelJointTable(W, D, H, G, fixShelves = []) {
  W = Number(W); D = Number(D); H = Number(H); G = Number(G);
  const sideW = D - G;
  const topW = W - G - G;
  const topH = D - G;
  const out = [
    dowelJoint('BUL-TOP', sideW, 'FRONT',
      'BUL', 'X', 0.0, 1.0, H, -1.0,
      'TOP', 'Y0', 0.0, topH, -1.0, G),
    dowelJoint('BUR-TOP', sideW, 'FRONT',
      'BUR', 'X', sideW, -1.0, H, -1.0,
      'TOP', 'YH', topW, topH, -1.0, G),
    dowelJoint('BUL-BOTTOM', sideW, 'FRONT',
      'BUL', 'X', 0.0, 1.0, 0.0, 1.0,
      'BOTTOM', 'Y0', 0.0, topH, -1.0, G),
    dowelJoint('BUR-BOTTOM', sideW, 'FRONT',
      'BUR', 'X', sideW, -1.0, 0.0, 1.0,
      'BOTTOM', 'YH', topW, topH, -1.0, G),
    dowelJoint('BACK-BUL', H, 'BOTTOM',
      'BACK', 'Y', 0.0, 1.0, 0.0, 1.0,
      'BUL', 'XW', sideW, 0.0, 1.0, G),
    dowelJoint('BACK-BUR', H, 'BOTTOM',
      'BACK', 'Y', 0.0, 1.0, W, -1.0,
      'BUR', 'X0', 0.0, 0.0, 1.0, G),
    dowelJoint('BACK-TOP', topW, 'LEFT',
      'BACK', 'X', G, 1.0, H, -1.0,
      'TOP', 'X0', 0.0, 0.0, 1.0, G),
    dowelJoint('BACK-BOTTOM', topW, 'LEFT',
      'BACK', 'X', G, 1.0, 0.0, 1.0,
      'BOTTOM', 'X0', 0.0, 0.0, 1.0, G),
  ];
  let k = 1;
  for (const sh of fixShelves) {
    const row = Number(sh[0]);
    const st = Number(sh[1]);
    const sb = Number(sh[2]);
    const depthS = D - G - sb;
    out.push(
      dowelJoint(`BUL-SHELF-${k}`, depthS, 'FRONT',
        'BUL', 'X', sb, 1.0, row, 1.0,
        `SHELF-${k}`, 'Y0', 0.0, 0.0, 1.0, st),
      dowelJoint(`BUR-SHELF-${k}`, depthS, 'FRONT',
        'BUR', 'X', sideW - sb, -1.0, row, 1.0,
        `SHELF-${k}`, 'YH', topW, 0.0, 1.0, st),
    );
    k += 1;
  }
  return out;
}

// ═══════════════════════════════════════════════════════════════════════════
// F. THE GATE AND THE REFUSALS (dowel-gate, dowel-refusal)
// ═══════════════════════════════════════════════════════════════════════════
//
// (Section E of the LISP is prose: what a dowel joint replaces and what it
// leaves. It is `dowelStrip` and the shelf hook in section Z.)

/** dowel-gate: null when the owner has confirmed the pattern, else the sentence. */
export function dowelGate(prof) {
  return dowelGet(prof, 'confirmed') ? null : DOWEL_GATE;
}

const rtos2 = (v) => Number(v).toFixed(2);

/**
 * dowel-refusal: a profile that cannot make a sound joint, in words. T78 F19:
 * the max-gap sentence went with `maxGapMm`; in its place the pitch must be
 * a length and the minimum per joint the owner's two.
 */
export function dowelRefusal(prof, faceT, edgeT) {
  const dia = dowelGet(prof, 'diaMm');
  const fd = dowelGet(prof, 'faceDepthMm');
  const ed = dowelGet(prof, 'edgeDepthMm');
  const p = dowelGet(prof, 'pitchMm');
  const nMin = dowelGet(prof, 'minPerJoint');
  const e = dowelGet(prof, 'endOffsetMm');
  const out = [];
  if (p <= 0) out.push(`the pitch ${rtos2(p)} is not a positive length`);
  if (nMin < 2) out.push(`fewer than two dowels per joint: the owner says minimum 2, the profile says ${Math.trunc(nMin)}`);
  if (fd >= faceT) out.push(`a face hole ${rtos2(fd)} deep would break through a ${rtos2(faceT)} board`);
  if (dia >= edgeT) out.push(`a dowel ${rtos2(dia)} wide does not fit a ${rtos2(edgeT)} edge`);
  if (e - dia / 2 <= ed) {
    out.push(`at a corner the end dowel (${rtos2(e)} in) would meet the other joint's edge bores (${rtos2(ed)} deep)`);
  }
  return out;
}

// ═══════════════════════════════════════════════════════════════════════════
// Z. THE ENGINE HALF: WHICH UNITS, ASKED OF THE PARENT, CUT, COUNTED, GATED
// ═══════════════════════════════════════════════════════════════════════════

/**
 * The joint system a unit is cut with: its own `params.joints_system`, else
 * the profile's `joints.system`, else the puzzle. Anything that is not a
 * system name says nothing, so a stray value cannot switch a unit.
 */
export function jointSystemOf(params, profile) {
  const said = params?.joints_system;
  if (JOINT_SYSTEMS.includes(said)) return said;
  const p = profile?.joints?.system;
  return JOINT_SYSTEMS.includes(p) ? p : 'puzzle';
}

/**
 * T78 F19 · THE FOUR-STOREY LADDER FOR THE JOINT SYSTEM, one cascade (T22):
 * the profile's `joints.system`, then the company row's `joints_system`
 * (`engine/companyDefaults.js`, the owner's choice: puzzle | dowel | biscuit |
 * cabineo8 | cabineo12), then the project's `design.joints.system` (prefilled
 * from the row), then the unit's own `params.joints_system` (the T75 F23
 * Joints row); the LAST usable answer wins, an id this build does not cut is
 * a stale field and the ladder carries on below it. The store hands the
 * answer to the engine as `params.joints_system` (`projectStore.js
 * paramsForEngine`), so `computeCabinet` keeps its one reader above and a
 * bare kit call, every golden, still cuts the puzzle.
 *
 * `company` undefined reads the active row; null is "no row" (tests).
 */
export function resolveJointSystem({
  params = null, design = null, profile = null, company = undefined,
} = {}) {
  const row = company === undefined ? companyDefaults() : company;
  return cascade(levelsOf({
    profile: profile?.joints?.system,
    company: row?.joints_system,
    project: design?.joints?.system,
    element: params?.joints_system,
  }), {
    allowed: new Set(JOINT_SYSTEMS),
    normalise: (v) => String(v).trim().toLowerCase(),
  }) || 'puzzle';
}

/**
 * Can this KIT take dowels? Only the five-board carcass the LISP's table is
 * written for: sides, a TOP panel and a full BACK (the BOTTOM may be absent,
 * WUD_HOOD: its rows drop, section D's "the same switch drops the matching
 * row"). Null when it can, the sentence when it cannot.
 */
export function dowelKitRefusal(type) {
  const c = type?.carcass || {};
  const ok = (c.sides ?? 'panel') === 'panel' && c.top === 'panel' && c.back === 'full';
  if (ok) return null;
  return `${type?.id || 'this kit'}: its joints are not in SKYLON_JOINTS_DOWEL.lsp's table `
    + '(the five-board carcass: sides, a TOP panel, a full BACK), so it keeps the puzzle';
}

/** Can the UI offer Dowel on this unit's kit? (The engine still asks the rest.) */
export function dowelApplies(type) {
  return dowelKitRefusal(type) === null;
}

const say = (message, panel = null) => ({ refused: true, message, panel });

/** A circle against an axis-aligned rectangle: do they overlap? */
function circleMeetsRect(cx, cy, r, x1, y1, x2, y2) {
  const nx = Math.max(Math.min(cx, Math.max(x1, x2)), Math.min(x1, x2));
  const ny = Math.max(Math.min(cy, Math.max(y1, y2)), Math.min(y1, y2));
  return Math.hypot(cx - nx, cy - ny) < r - EPS;
}

function rectsMeet(a, b) {
  return Math.min(a[0], a[2]) < Math.max(b[0], b[2]) - EPS && Math.max(a[0], a[2]) > Math.min(b[0], b[2]) + EPS
    && Math.min(a[1], a[3]) < Math.max(b[1], b[3]) - EPS && Math.max(a[1], a[3]) > Math.min(b[1], b[3]) + EPS;
}

/** The plan footprint of one EDGE bore in its board's frame: [x1, y1, x2, y2]. */
export function edgeBoreRect(h, boardW, boardH) {
  const [, , x, y, dia, depth, edgeNm] = h;
  const r = dia / 2;
  if (edgeNm === 'X0') return [0, y - r, depth, y + r];
  if (edgeNm === 'XW') return [boardW - depth, y - r, boardW, y + r];
  if (edgeNm === 'Y0') return [x - r, 0, x + r, depth];
  return [x - r, boardH - depth, x + r, boardH];
}

/** Does a planned hole (FACE or EDGE) meet a circle at (x, y), diameter d? */
function holeMeetsCircle(h, boardW, boardH, x, y, d) {
  if (h[1] === 'FACE') return Math.hypot(h[2] - x, h[3] - y) < h[4] / 2 + d / 2 - EPS;
  const [x1, y1, x2, y2] = edgeBoreRect(h, boardW, boardH);
  return circleMeetsRect(x, y, d / 2, x1, y1, x2, y2);
}

/** Does a planned hole meet a rectangle (a pocket the kit cuts)? */
function holeMeetsRect(h, boardW, boardH, rect) {
  if (h[1] === 'FACE') return circleMeetsRect(h[2], h[3], h[4] / 2, rect[0], rect[1], rect[2], rect[3]);
  return rectsMeet(edgeBoreRect(h, boardW, boardH), rect);
}

/** Do two planned holes on one board meet? */
function holesMeet(a, b, boardW, boardH) {
  if (a[1] === 'FACE') return holeMeetsCircle(b, boardW, boardH, a[2], a[3], a[4]);
  if (b[1] === 'FACE') return holeMeetsCircle(a, boardW, boardH, b[2], b[3], b[4]);
  return rectsMeet(edgeBoreRect(a, boardW, boardH), edgeBoreRect(b, boardW, boardH));
}

const isPuzzleHole = (d, pz) => d.kind === 'puzzle' || (d.kind === 'screw' && d.layer === pz?.layers?.screw);
const isPuzzlePocket = (k, pz) => k.layer === pz?.layers?.socket || k.layer === pz?.layers?.dogbone;
const fmt = (v) => String(roundTo(v, 1));

/**
 * The verdict, asked of the PARENT (the same unit cut with the puzzle): a
 * plan, or a refusal in words. The plan is everything `computeCabinet` needs
 * to cut the unit with dowels and nothing it has to work out again.
 *
 * @returns {{ refused: true, message: string, panel: string|null }
 *          | { refused: false, plan: object }}
 */
export function dowelVerdict({
  parent, params, asked, type, profile,
}) {
  if (asked === 'cabineo') return say(CABINEO_REFUSAL);
  const kit = dowelKitRefusal(type);
  if (kit) return say(kit);
  if (parent?.params?.slope_cut) {
    return say('a carcass cut under a slope keeps the puzzle: SKYLON_JOINTS_DOWEL.lsp has no row for its roof board');
  }
  if (params?.notch) {
    return say('a carcass with a corner notch keeps the puzzle: KIT_NOTCH.lsp re-plans the puzzle\'s joints, '
      + 'and SKYLON_JOINTS_DOWEL.lsp has no notch row');
  }
  const prof = dowelProfile(profile);
  const pz = profile?.puzzle || {};
  const {
    width: W, height: H, depth: D, board_t: G,
  } = parent.params;
  const byId = new Map((parent.panels || []).map((p) => [p.id, p]));
  const dims = (p) => [Number(p?.cnc?.drawn_w ?? p?.w), Number(p?.cnc?.drawn_h ?? p?.h)];
  const want = {
    BUL: [D - G, H], BUR: [D - G, H], TOP: [D - G, W - 2 * G], BOTTOM: [D - G, W - 2 * G], BACK: [W, H],
  };
  // The carcass must BE the LISP's: every board it names, where it names it.
  for (const id of DOWEL_BOARDS) {
    const p = byId.get(id);
    if (!p) {
      if (id === 'BOTTOM' && type?.carcass?.bottom === 'none') continue;
      return say(`${id} is missing, so this is not the five-board carcass SKYLON_JOINTS_DOWEL.lsp is written for`, null);
    }
    const [w, h] = dims(p);
    if (Math.abs(w - want[id][0]) > EPS || Math.abs(h - want[id][1]) > EPS || (id === 'BACK' && p.cnc?.rotated)) {
      return say(`${id} is ${fmt(w)} x ${fmt(h)}, not the ${fmt(want[id][0])} x ${fmt(want[id][1])} `
        + 'SKYLON_JOINTS_DOWEL.lsp\'s table cuts', id);
    }
  }
  // The FIX shelves the table owns: a shelf screwed into BOTH carcass sides,
  // cut to the full clear light, its back edge on the BACK. A shelf on a
  // partition keeps its biscuit set (the LISP: "two bays' face holes ... would
  // meet in the middle"), and so does every shelf the table does not describe.
  const drills = parent.drills || [];
  const fix = [];
  for (const p of parent.panels || []) {
    if (p.part !== 'SHELF' || !p.box) continue;
    const jointY = p.box.y + (Number(p.thickness) || G) / 2;
    const screwed = (side) => drills.some((d) => d.panel === side && d.kind === 'shelf_screw'
      && Math.abs(d.y - jointY) < EPS);
    if (!screwed('BUL') || !screwed('BUR')) continue;
    if (Math.abs(p.box.x - G) > EPS || Math.abs(p.box.w - (W - 2 * G)) > EPS || Math.abs(p.box.z - G) > EPS) continue;
    fix.push({ id: p.id, row: p.box.y, t: Number(p.thickness) || G, sb: D - p.box.z - p.box.d, jointY });
  }
  const shelfIds = new Map(fix.map((f, i) => [`SHELF-${i + 1}`, f.id]));
  const rename = (s) => (shelfIds.has(s) ? shelfIds.get(s) : s);
  const table = dowelJointTable(W, D, H, G, fix.map((f) => [f.row, f.t, f.sb]))
    .map((jt) => ({
      ...jt,
      name: jt.name.replace(/SHELF-\d+$/, (m) => rename(m)),
      edge: rename(jt.edge),
    }))
    .filter((jt) => byId.has(jt.face) && byId.has(jt.edge));

  // dowel-refusal, at the thinnest face and edge board the table uses.
  const tOf = (id) => Number(byId.get(id)?.thickness) || G;
  const faceT = Math.min(...table.map((jt) => tOf(jt.face)));
  const edgeT = Math.min(...table.map((jt) => tOf(jt.edge)));
  const bad = dowelRefusal(prof, faceT, edgeT);
  if (bad.length) return say(`the dowel profile cannot make a sound joint: ${bad.join('; ')}`);

  const joints = [];
  for (const jt of table) {
    const [offs, face, edge] = dowelJointHoles(jt, prof);
    if (dowelTooClose(offs, prof.diaMm)) {
      return say(`two dowels on ${jt.name} stand closer than one diameter`, jt.face);
    }
    joints.push({ joint: jt, offs, face, edge });
  }

  // Nothing is clipped silently: a dowel that meets a hole or a pocket the
  // kit already cuts on that board (and that the puzzle does not take with
  // it) refuses the pattern, naming both.
  const stripped = new Set(table.flatMap((jt) => [jt.face, jt.edge]).filter((id) => DOWEL_BOARDS.includes(id)));
  const doweledRows = fix.map((f) => f.jointY);
  const keeps = (d) => {
    if (stripped.has(d.panel) && isPuzzleHole(d, pz)) return false;
    if (d.kind === 'shelf_screw' && doweledRows.some((y) => Math.abs(d.y - y) < EPS)) return false;
    return true;
  };
  const planned = joints.flatMap((j) => [...j.face, ...j.edge].map((h) => ({ h, joint: j.joint.name })));
  for (const { h, joint } of planned) {
    const board = byId.get(h[0]);
    const [bw, bh] = dims(board);
    for (const d of drills) {
      if (d.panel !== h[0] || !keeps(d)) continue;
      if (holeMeetsCircle(h, bw, bh, Number(d.x), Number(d.y), Number(d.d) || 0)) {
        return say(`the dowel of ${joint} at ${fmt(h[2])}, ${fmt(h[3])} on ${h[0]} meets the ${d.kind} hole `
          + `at ${fmt(d.x)}, ${fmt(d.y)}; SKYLON_JOINTS_DOWEL.lsp has no answer for it yet, so the unit keeps the puzzle`, h[0]);
      }
    }
    for (const k of board?.cnc?.pockets || []) {
      if (isPuzzlePocket(k, pz) && stripped.has(h[0])) continue;
      if (holeMeetsRect(h, bw, bh, [k.x1, k.y1, k.x2, k.y2])) {
        return say(`the dowel of ${joint} at ${fmt(h[2])}, ${fmt(h[3])} on ${h[0]} meets the ${k.layer} pocket; `
          + 'SKYLON_JOINTS_DOWEL.lsp has no answer for it yet, so the unit keeps the puzzle', h[0]);
      }
    }
  }
  for (let i = 0; i < planned.length; i += 1) {
    for (let j = i + 1; j < planned.length; j += 1) {
      const a = planned[i];
      const b = planned[j];
      if (a.h[0] !== b.h[0] || a.joint === b.joint) continue;
      const [bw, bh] = dims(byId.get(a.h[0]));
      if (holesMeet(a.h, b.h, bw, bh)) {
        return say(`on ${a.h[0]} a dowel of ${a.joint} meets a dowel of ${b.joint}`, a.h[0]);
      }
    }
  }

  return {
    refused: false,
    plan: {
      system: 'dowel',
      prof,
      layers: {
        face: profile?.joints?.dowel?.layers?.face || 'DOWEL_8MM',
        edge: profile?.joints?.dowel?.layers?.edge || 'DOWEL_EDGE_8MM',
      },
      boards: [...stripped],
      joints,
      shelves: new Set(fix.map((f) => f.id)),
    },
  };
}

/** The parent, cut with the puzzle, and the reason in words (Check #31). */
export function withJointsRefusal(parent, verdict, asked) {
  return {
    ...parent,
    warnings: [...(parent.warnings || []), {
      code: JOINTS_REFUSED,
      ...(verdict.panel ? { panel: verdict.panel } : {}),
      message: `${asked === 'cabineo' ? 'Cabineo' : 'Dowels'} refused: ${verdict.message}`,
    }],
    derived: { ...(parent.derived || {}), joints: { asked, system: 'puzzle', refused: verdict.message } },
  };
}

/**
 * The LISP's section E, on the boards the plan names: each loses its puzzle
 * WHOLE. The tenons go (the outline is the board's plain rectangle), the
 * sockets and their dog bones go, the dia 7.5 holes and the joint's own dia 3
 * assembly screw row go. Run BEFORE the drilling pass, so nothing of it is
 * copied into the drills. What is not a joint stays exactly as it is.
 */
export function dowelStrip({ panels, plan, profile }) {
  const pz = profile?.puzzle || {};
  for (const p of panels) {
    if (!plan.boards.includes(p.id) || !p.cnc) continue;
    const w = Number(p.cnc.drawn_w ?? p.w);
    const h = Number(p.cnc.drawn_h ?? p.h);
    p.cnc = {
      ...p.cnc,
      outline: [[0, 0], [w, 0], [w, h], [0, h]],
      pockets: (p.cnc.pockets || []).filter((k) => !isPuzzlePocket(k, pz)),
      holes: (p.cnc.holes || []).filter((d) => !isPuzzleHole(d, pz)),
    };
  }
}

/**
 * The pairs, as drill records: one FACE hole and one EDGE hole per dowel, in
 * joint order (the table's), face holes first. A FACE hole is blind and says
 * its depth; an EDGE hole says `face: 'edge'`, which edge, its z in the
 * board's thickness and its depth, and is `readiness: 'manual'`: a 3-axis bed
 * drills from above and cannot bore into an edge (the LISP, section E).
 */
export function dowelDrills(plan) {
  const out = [];
  const r4 = (v) => roundTo(v, 4);
  for (const { joint, face, edge } of plan.joints) {
    for (const [board, , x, y, dia, depth] of face) {
      out.push({
        panel: board, kind: 'dowel', layer: plan.layers.face, x: r4(x), y: r4(y), d: dia, depth: r4(depth),
        meta: { joint: joint.name },
      });
    }
    for (const [board, , x, y, dia, depth, edgeNm, z] of edge) {
      out.push({
        panel: board, kind: 'dowel', layer: plan.layers.edge, x: r4(x), y: r4(y), d: dia, depth: r4(depth),
        face: 'edge', edge: edgeNm, z: r4(z), meta: { joint: joint.name, readiness: 'manual' },
      });
    }
  }
  return out;
}

/** Is this FIX shelf's joint to the sides dowelled (biscuits and screws give way)? */
export function dowelledShelf(plan, shelfId) {
  return Boolean(plan?.shelves?.has(shelfId));
}

/** What `result.derived.joints` says of a dowel unit. */
export function dowelSummary(plan) {
  const count = plan.joints.reduce((n, j) => n + j.offs.length, 0);
  return {
    system: 'dowel',
    dowels: count,
    edge_bores: count,
    joints: plan.joints.map((j) => ({ name: j.joint.name, len: roundTo(j.joint.len, 4), dowels: j.offs.length })),
    confirmed: plan.prof.confirmed,
    gate: dowelGate(plan.prof),
  };
}

/** The warning a dowel unit carries while the pattern is unconfirmed (Check #31). */
export function dowelGateWarning(summary) {
  if (!summary?.gate) return null;
  return {
    code: DOWEL_GATE_CODE,
    message: `Dowels: ${summary.gate}. The CNC export refuses this unit until the owner confirms the pattern `
      + '(profile joints.dowel.confirmed).',
  };
}

/** Does this result carry a dowel hole on any of these panels (all of them by default)? */
export function carriesDowels(result, panelIds = null) {
  const ids = panelIds ? new Set(panelIds) : null;
  return (result?.drills || []).some((d) => d.kind === 'dowel' && (!ids || ids.has(d.panel)));
}

/**
 * THE GATE at the export: the sentence when an export would MACHINE a dowel
 * hole while the owner has not confirmed the pattern, else null. Asked of the
 * profile the export is written with, so a confirmation reaches every export
 * at once. `entries`: [{ result, panels? }]; `panels` narrows to what goes.
 */
export function dowelExportRefusal(entries, profile) {
  if (dowelProfile(profile).confirmed) return null;
  for (const e of entries || []) {
    const ids = Array.isArray(e?.panels) ? e.panels.map((p) => p.id) : null;
    if (carriesDowels(e?.result, ids)) return DOWEL_GATE;
  }
  return null;
}

/**
 * The cut list's NOTE row for a dowel unit (the BOM panel's Parts tab reads
 * `unit.rows`): how many dowels, that the edge bores are by hand, and the gate
 * while it is closed. Null on every other unit.
 */
export function dowelNoteRow(result) {
  const j = result?.derived?.joints;
  if (!j || j.system !== 'dowel') return null;
  const gate = j.gate ? `; ${j.gate}` : '';
  return {
    unit_num: result.unitNum,
    id: `${result.unitNum} dowels`,
    part: 'DOWEL-NOTE',
    role: 'dowel_note',
    material_role: 'note',
    material_label: `NOTE: dowel joints, ${j.dowels} dowels (one face hole and one edge bore each), `
      + `the ${j.edge_bores} edge bores drilled by hand${gate}`,
    w: 0,
    h: 0,
    qty: 1,
    thickness: 0,
    edge: '',
    edge_m: 0,
    area_m2: 0,
    readiness: 'manual',
  };
}
