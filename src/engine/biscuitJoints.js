// ─── T78 F20 · THE THIRD JOINT SYSTEM: BISCUITS ON THE CARCASS, THE ENGINE'S ─
// ─── MIRROR OF reference/lisp/SKYLON_JOINTS_BISCUIT.lsp ─────────────────────
//
// The owner, 11.10.2026: *"zostaw jak bylo, ciastka byly ustawione ok, nie
// grzeb w tym, polka stala to samo"* and *"bez ciastek na plecach."*
// CLAUDE.md T78 F20: *"LISP FIRST `reference/lisp/SKYLON_JOINTS_BISCUIT.lsp`
// applies THE SAME SET (screw 3, gap 10, mark 70, gap 10, screw 3; edge 50;
// two sets, three above 700) to the carcass joints side to top, side to
// bottom and fixed shelf to side, NEVER to the back; the engine mirrors it
// when `joints.system === 'biscuit'`; the fixed-shelf joint of T24/T26 is
// untouched (it is the same set already)."*
//
// `SKYLON_JOINTS_BISCUIT.lsp` was written and paren-balanced BEFORE this file
// existed, and sections A to F below mirror it routine for routine under the
// `bj` prefix: `biscuit-sets` is `bjSets`, the same arguments in the same
// order, the same answers. THE SET ARITHMETIC IS NOT COPIED A SECOND TIME:
// section B calls `engine/biscuits.js` (T13's module, the fixed shelf's since
// T24) for the length, the count and the positions, so the partition pattern,
// the fixed shelf and the carcass joints cannot drift apart. A cut is returned
// the way the LISP returns it, as a list:
//   MARK   [board, 'MARK', x1, y, x2, y, layer]
//   SCREW  [board, 'SCREW', x, y, dia, layer]
// `test/turn78-f20-biscuit.test.js` holds them to the LISP's NUMBERS block
// (section H, a BUD 600 with one FIX shelf) board by board.
//
// Section Z is what the LISP leaves to the engine. The pattern is asked of the
// PARENT's own puzzle cut first (`biscuitVerdict`, the T75 F23 grammar: *"Room
// refuses first: nothing is clipped silently"*), and refused in words where
// the kit is not the five-board carcass the LISP's table is written for, where
// the carcass is cut under a slope or notched, where a joint is too short for
// one set, or where a mark or a screw would meet a hole the kit already drills.
// Accepted, it is a PLAN: `computeCabinet` strips the side to TOP and side to
// BOTTOM puzzle off the four boards before its drilling pass (`biscuitStrip`),
// adds the screws after it (`biscuitDrills`) and the marks where the fixed
// shelf's marks are written (`biscuitMarkRecords`). The FIX shelf's own joint
// is NOT re-cut here: T24's code in `computeCabinet` cuts it, and the plan's
// shelf rows are marked `existing` so the summary shows the whole pattern
// while nothing is drawn twice. The BACK is never in the plan. A unit whose
// joint system is 'puzzle' (every unit, unless a person chose otherwise) never
// reaches a line of section Z, so every golden is byte-identical by
// construction.
//
// NO GATE. The dowel (T75) and Cabineo (T78) numbers are proposed and gated.
// These are the owner's own, so `bjGate` is null and the export is not refused.
//
// Pure: numbers in, numbers or records out. No store, no React, no three.js.

import {
  biscuitLayers, biscuitSetCount, biscuitSetLength, biscuitSets, markFromEnd, receiverTakesScrews,
} from './biscuits.js';
import { JOINTS_REFUSED } from './dowels.js';
import { roundTo } from './format.js';
import { socketCentres, tabPointsLeft } from './puzzle.js';

const EPS = 1e-6;

/** The system id a unit names to be cut this way (`params.joints_system`). */
export const BISCUIT_SYSTEM = 'biscuit';
/** The boards whose joints this system cuts (section C); the LISP's table has no other. */
export const BISCUIT_BOARDS = Object.freeze(['BUL', 'BUR', 'TOP', 'BOTTOM']);
/** The board the system never touches, by the owner's word. */
export const BISCUIT_LEAVES = Object.freeze([]);
/**
 * THE BACK, the LISP's `biscuit-back-refusal`, word for word. No biscuit goes
 * into the back (11.10.2026) and, since 15.10.2026, no puzzle either: *"jak
 * mamy cabineo to nie robimy dog bonsow, i to samo jak mamy biscuits"*; the
 * back joint goes whole and the BACK is screwed (`screwedBack.js`).
 */
export const BISCUIT_BACK = 'no biscuits on the back (the owner, 11.10.2026: bez ciastek na plecach); the BACK is screwed on with the kit\'s own dia 3 rows, its puzzle joint goes whole (the owner, 15.10.2026: no dog bones)';
/** Why there is no gate, the LISP's `biscuit-no-gate-reason`, word for word. */
export const BISCUIT_NO_GATE = 'the biscuit set is the owner\'s own (09.08.2026, reaffirmed 11.10.2026): no gate, nothing to confirm';
/** The drill kind of a carcass joint's through screw: T13's own kind, which `joinery.js` already draws as a screw. */
export const BISCUIT_SCREW_KIND = 'biscuit_screw';
/** What the EDGE board carries: nothing (T26 F7.1), said once. */
export const BISCUIT_EDGE_NOTHING = 'nothing: the end is plain, the slot is cut at the bench (T26 F7.1, the fixed shelf\'s ruling)';

// ═══════════════════════════════════════════════════════════════════════════
// A. THE PROFILE NUMBERS (biscuit-profile, biscuit-get)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * biscuit-profile: `profile.biscuits`, every number the LISP keys, read under
 * the LISP's own key. The fallbacks are the owner's numbers (the same ones
 * `engine/biscuits.js settings` falls back to), so a bare call answers exactly
 * what SKYLON_JOINTS_BISCUIT.lsp prints. Nothing here is proposed.
 */
export function bjProfile(profile = {}) {
  const B = profile?.biscuits || {};
  const num = (v, fallback) => (Number.isFinite(Number(v)) && v !== null && v !== '' ? Number(v) : fallback);
  return {
    markLength: num(B.markLength, 70),
    markTool: num(B.markTool, 4),
    gap: num(B.gap, 10),
    screwDiameter: num(B.screwDiameter, 3),
    edgeMin: num(B.edgeMin, 50),
    wideThreshold: num(B.wideThreshold, 700),
    markFromEnd: num(B.markFromEnd, 20),
    layer: B.layer || 'BISCUIT_4MM',
    screwLayer: B.screwLayer || 'SCREWS_3MM',
    concealedReceivers: Array.isArray(B.concealedReceivers) ? [...B.concealedReceivers] : ['TOP', 'BOTTOM'],
  };
}

/** biscuit-get: one number (or the list) off a profile. */
export function bjGet(prof, key) {
  return prof?.[key];
}

/** The LISP's assoc list as the profile shape `engine/biscuits.js` reads. */
const asProfile = (prof) => ({ biscuits: prof });

// ═══════════════════════════════════════════════════════════════════════════
// B. THE SET RULE (biscuit-set-length, biscuit-set-count, biscuit-sets)
// ═══════════════════════════════════════════════════════════════════════════
//
// THE SAME SET as T13's partition pattern and T24's fixed shelf, and the same
// CODE: `engine/biscuits.js` is the one copy of the arithmetic. These three
// are the LISP's names on that one copy.

/** biscuit-set-length: screw + gap + mark + gap + screw (96 at the owner's numbers). */
export function bjSetLength(prof) {
  return biscuitSetLength(asProfile(prof));
}

/** biscuit-set-count: 0, 1, 2 or 3 sets on a joint of length L. */
export function bjSetCount(L, prof) {
  return biscuitSetCount(L, asProfile(prof));
}

/**
 * biscuit-sets: where each set sits along a joint of length L, offsets from
 * the joint's reference end (the edge board's FRONT edge). `screws` true for
 * the through-screw set, false for the mark-only set in the same positions.
 * The LISP returns ((start end (screw screw) (markFrom markTo)) ...); this
 * returns `engine/biscuits.js`'s own records, `{ start, end, screws, mark:
 * { from, to } }`, which carry the same four things under names.
 */
export function bjSets(L, screws, prof) {
  return biscuitSets({ length: L, screws: Boolean(screws), profile: asProfile(prof) });
}

// ═══════════════════════════════════════════════════════════════════════════
// C. THE JOINTS: WHICH, AND NEVER THE BACK (biscuit-takes-screws,
//    biscuit-back-refusal, biscuit-joint, biscuit-jget, biscuit-joint-table)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * biscuit-takes-screws: may a through screw be driven into this RECEIVING
 * board? A carcass side (BUL, BUR): always (T24's rule; "a carcass side never
 * stays visible"). A board in `profile.biscuits.concealedReceivers`: yes, when
 * a board's END lands on ITS face (T13's partition; not a joint of this file,
 * honoured so one question has one answer). A SHELF, a PARTITION: the mark alone.
 */
export function bjTakesScrews(board, prof) {
  return board === 'BUL' || board === 'BUR' || receiverTakesScrews(board, asProfile(prof));
}

/** biscuit-back-refusal: the owner's sentence for any joint that names the BACK. */
export function bjBackRefusal() {
  return BISCUIT_BACK;
}

/** biscuit-joint: one joint, every field the LISP names, in its order. */
export function bjJoint(name, len, face, fFrom, fDir, jointY, edge, eNm, eT, sb) {
  return {
    name, len: Number(len),
    face, faceFrom: Number(fFrom), faceDir: Number(fDir),
    jointY: Number(jointY),
    edge, edgeName: eNm, edgeT: Number(eT),
    setback: Number(sb),
  };
}

/** biscuit-jget: one field off a joint. */
export function bjJget(jt, key) {
  return jt?.[key];
}

/**
 * biscuit-joint-table: the side to TOP, side to BOTTOM and FIX shelf to side
 * joints of the five-board carcass. fixShelves: [[row, shelfT, setback], ...],
 * row the shelf's UNDERSIDE from the floor. No BACK row is built, by design.
 */
export function bjJointTable(W, D, H, G, fixShelves = []) {
  W = Number(W); D = Number(D); H = Number(H); G = Number(G);
  const sideW = D - G;
  const out = [
    bjJoint('BUL-TOP', sideW, 'BUL', 0.0, 1.0, H - G / 2, 'TOP', 'Y0', G, 0.0),
    bjJoint('BUR-TOP', sideW, 'BUR', sideW, -1.0, H - G / 2, 'TOP', 'YH', G, 0.0),
    bjJoint('BUL-BOTTOM', sideW, 'BUL', 0.0, 1.0, G / 2, 'BOTTOM', 'Y0', G, 0.0),
    bjJoint('BUR-BOTTOM', sideW, 'BUR', sideW, -1.0, G / 2, 'BOTTOM', 'YH', G, 0.0),
  ];
  let k = 1;
  for (const sh of fixShelves) {
    const row = Number(sh[0]);
    const st = Number(sh[1]);
    const sb = Number(sh[2]);
    const depthS = D - G - sb;
    out.push(
      bjJoint(`BUL-SHELF-${k}`, depthS, 'BUL', sb, 1.0, row + st / 2, `SHELF-${k}`, 'Y0', st, sb),
      bjJoint(`BUR-SHELF-${k}`, depthS, 'BUR', sideW - sb, -1.0, row + st / 2, `SHELF-${k}`, 'YH', st, sb),
    );
    k += 1;
  }
  return out;
}

// ═══════════════════════════════════════════════════════════════════════════
// D. PER BOARD: WHERE THE MARKS AND THE SCREWS LAND (biscuit-face-marks,
//    biscuit-face-screws, biscuit-joint-cuts)
// ═══════════════════════════════════════════════════════════════════════════
//
// The RECEIVING board takes the whole set on its inner face along y = jointY,
// x = faceFrom + faceDir x offset. The EDGE board carries NOTHING (T26 F7.1:
// the fixed shelf's ruling, applied to the TOP and BOTTOM, the same joint);
// `markFromEnd` stays a profile number no joint here draws from.

/** biscuit-face-marks: the marks of one joint on its receiving board, in set order. */
export function bjFaceMarks(jt, sets, prof) {
  const face = bjJget(jt, 'face');
  const from = bjJget(jt, 'faceFrom');
  const dir = bjJget(jt, 'faceDir');
  const y = bjJget(jt, 'jointY');
  const lay = bjGet(prof, 'layer');
  return sets.map((s) => [face, 'MARK', from + dir * s.mark.from, y, from + dir * s.mark.to, y, lay]);
}

/** biscuit-face-screws: the through screws of one joint on its receiving board, in set order. */
export function bjFaceScrews(jt, sets, prof) {
  const face = bjJget(jt, 'face');
  const from = bjJget(jt, 'faceFrom');
  const dir = bjJget(jt, 'faceDir');
  const y = bjJget(jt, 'jointY');
  const dia = bjGet(prof, 'screwDiameter');
  const lay = bjGet(prof, 'screwLayer');
  const out = [];
  for (const s of sets) {
    for (const sc of s.screws) out.push([face, 'SCREW', from + dir * sc, y, dia, lay]);
  }
  return out;
}

/**
 * biscuit-joint-cuts: one joint, whole. The LISP returns (sets marks screws);
 * this returns `{ sets, marks, screws }`.
 */
export function bjJointCuts(jt, prof) {
  const sets = bjSets(bjJget(jt, 'len'), bjTakesScrews(bjJget(jt, 'face'), prof), prof);
  return { sets, marks: bjFaceMarks(jt, sets, prof), screws: bjFaceScrews(jt, sets, prof) };
}

// ═══════════════════════════════════════════════════════════════════════════
// E. THE GATE (THERE IS NONE) AND THE REFUSALS (biscuit-gate,
//    biscuit-no-gate-reason, biscuit-refusal)
// ═══════════════════════════════════════════════════════════════════════════

/** biscuit-gate: null, always. The numbers are the owner's. */
export function bjGate() {
  return null;
}

/** biscuit-no-gate-reason: why, in one sentence. */
export function bjNoGateReason() {
  return BISCUIT_NO_GATE;
}

const rtos2 = (v) => Number(v).toFixed(2);

/** biscuit-refusal: a joint this set cannot make, in words; [] when there is nothing to say. */
export function bjRefusal(prof, jt) {
  const len = bjJget(jt, 'len');
  const edgeT = bjJget(jt, 'edgeT');
  const setL = bjSetLength(prof);
  const e = bjGet(prof, 'edgeMin');
  const dia = bjGet(prof, 'screwDiameter');
  const out = [];
  if (bjJget(jt, 'face') === 'BACK' || bjJget(jt, 'edge') === 'BACK') out.push(bjBackRefusal());
  if (bjSetCount(len, prof) === 0) {
    out.push(`the joint ${bjJget(jt, 'name')} is ${rtos2(len)} long and cannot hold one biscuit set: the shortest is `
      + `${rtos2(2 * e + setL)} (${rtos2(e)} + ${rtos2(setL)} + ${rtos2(e)})`);
  }
  if (dia >= edgeT) out.push(`a screw ${rtos2(dia)} wide does not fit a ${rtos2(edgeT)} edge`);
  return out;
}

// ═══════════════════════════════════════════════════════════════════════════
// THE PURE PLAN OF A CARCASS (sections C, D and E together; the LISP's command)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * The whole pattern for a carcass W x H x D of boards G, with its FIX
 * shelves, board by board: what the LISP's BISCUIT_JOINTS command prints.
 *
 * `fixedShelfYs`: the FIX shelves' UNDERSIDE rows from the floor (numbers), or
 * `{ row, t, sb }` records; `fixedShelfT` and `shelfSetback` are the defaults
 * for the numbers (G, and the profile's shelf front clearance, 20).
 *
 * @returns {{ prof, joints, boards, counts, back, edge, gate }}
 *   `joints[i]`: `{ joint, refused, sets, marks, screws }` (a refused joint
 *   has its sentences and no cuts); `boards[id]`: `{ marks, screws, said? }`
 *   for BUL, BUR, TOP, BOTTOM, BACK and every SHELF-k; `counts`: sets, marks,
 *   screws over the joints that are not refused.
 */
export function biscuitCarcassPlan({
  W, H, D, G, fixedShelfYs = [], fixedShelfT = null, shelfSetback = null,
} = {}, profile = {}) {
  const prof = bjProfile(profile);
  const sb0 = Number.isFinite(Number(shelfSetback)) && shelfSetback !== null
    ? Number(shelfSetback)
    : (Number.isFinite(Number(profile?.carcass?.shelfDepthClearance)) ? Number(profile.carcass.shelfDepthClearance) : 20);
  const t0 = Number.isFinite(Number(fixedShelfT)) && fixedShelfT !== null ? Number(fixedShelfT) : Number(G);
  const fix = (fixedShelfYs || []).map((s) => (s && typeof s === 'object'
    ? [Number(s.row), Number(s.t ?? t0), Number(s.sb ?? sb0)]
    : [Number(s), t0, sb0]));
  const table = bjJointTable(W, D, H, G, fix);
  const joints = table.map((jt) => {
    const refused = bjRefusal(prof, jt);
    if (refused.length) return { joint: jt, refused, sets: [], marks: [], screws: [] };
    return { joint: jt, refused: [], ...bjJointCuts(jt, prof) };
  });
  const boards = {};
  const board = (id) => {
    if (!boards[id]) boards[id] = { marks: [], screws: [] };
    return boards[id];
  };
  for (const id of BISCUIT_BOARDS) board(id);
  board('BACK').said = BISCUIT_BACK;
  for (const j of joints) {
    board(j.joint.face).marks.push(...j.marks);
    board(j.joint.face).screws.push(...j.screws);
    board(j.joint.edge).said = BISCUIT_EDGE_NOTHING;
  }
  const counts = joints.reduce((c, j) => ({
    sets: c.sets + j.sets.length, marks: c.marks + j.marks.length, screws: c.screws + j.screws.length,
  }), { sets: 0, marks: 0, screws: 0 });
  return {
    prof, joints, boards, counts, back: BISCUIT_BACK, edge: BISCUIT_EDGE_NOTHING, gate: bjGate(), markFromEnd: markFromEnd(profile),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Z. THE ENGINE HALF: WHICH UNITS, ASKED OF THE PARENT, STRIPPED, CUT, SUMMED
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Can this KIT take biscuits? The five-board carcass the LISP's table is
 * written for: sides, a TOP panel and a full BACK (the BOTTOM may be absent,
 * WUD_HOOD: its rows drop). The BACK is required not because it is cut (it
 * never is) but because the table's TOP and BOTTOM are the ones that stand
 * between two sides with their back edges on it. Null when it can, the
 * sentence when it cannot.
 */
export function biscuitKitRefusal(type) {
  const c = type?.carcass || {};
  const ok = (c.sides ?? 'panel') === 'panel' && c.top === 'panel' && c.back === 'full';
  if (ok) return null;
  return `${type?.id || 'this kit'}: its joints are not in SKYLON_JOINTS_BISCUIT.lsp's table `
    + '(the five-board carcass: sides, a TOP panel, a full BACK), so it keeps the puzzle';
}

/** Can the UI offer Biscuits on this unit's kit? (The engine still asks the rest.) */
export function biscuitApplies(type) {
  return biscuitKitRefusal(type) === null;
}

const say = (message, panel = null) => ({ refused: true, message, panel });
const fmt = (v) => String(roundTo(v, 1));

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

/** The plan footprint of a MARK in its board's frame: the 70 run, markTool wide. */
export function markRect(m, prof) {
  const half = (bjGet(prof, 'markTool') || 4) / 2;
  return [Math.min(m[2], m[4]), m[3] - half, Math.max(m[2], m[4]), m[3] + half];
}

/**
 * The LISP's section F, as a question of one hole or one pocket on a SIDE:
 * does this joint (at `jointY`, the edge board G thick) take it with it?
 *   the socket pocket at that edge (its span contains the joint line),
 *   the socket's two dia 7.5 holes (within G / 2 of the joint line),
 *   the joint's own dia 3 row (ON the joint line).
 */
function sideHoleGoes(d, jointY, G, pz) {
  if (d.kind === 'puzzle') return Math.abs(Number(d.y) - jointY) <= G / 2 + EPS;
  if (d.kind === 'screw' && d.layer === pz?.layers?.screw) return Math.abs(Number(d.y) - jointY) < EPS;
  return false;
}
function sidePocketGoes(k, jointY, pz) {
  return k.layer === pz?.layers?.socket && k.y1 <= jointY + EPS && k.y2 >= jointY - EPS;
}
/** On a TOP or BOTTOM (drawn ROT90): the END dog bones go, the back-edge ones stay. */
function endPocketGoes(k, drawnH, pz) {
  return k.layer === pz?.layers?.dogbone && (k.y1 >= drawnH - EPS || k.y2 <= EPS);
}

/**
 * The TOP's or BOTTOM's outline with PLAIN ENDS: the four corners and, when
 * the board has them, its back-edge tenons exactly as `topPanelGeometry`
 * traces them (the same `socketCentres` over the width, the same
 * `tabPointsLeft`, in the same reversed order). What this leaves out is the
 * two end runs of tabs, which are the biscuit joints' now.
 */
export function bjPlainEnds({
  drawnW, drawnH, G, pz, backTabs = true,
}) {
  const out = [[0, 0], [drawnW, 0], [drawnW, drawnH], [0, drawnH]];
  if (backTabs) for (const cy of [...socketCentres(drawnH, pz)].reverse()) out.push(...tabPointsLeft(0, cy, G, pz));
  return out;
}

/**
 * The verdict, asked of the PARENT (the same unit cut with the puzzle): a
 * plan, or a refusal in words. The plan is everything `computeCabinet` needs
 * to cut the unit with biscuits and nothing it has to work out again.
 *
 * @returns {{ refused: true, message: string, panel: string|null }
 *          | { refused: false, plan: object }}
 */
export function biscuitVerdict({
  parent, params, asked, type, profile,
}) {
  if (asked !== BISCUIT_SYSTEM) return say(`${asked} is not the biscuit system`);
  const kit = biscuitKitRefusal(type);
  if (kit) return say(kit);
  if (parent?.params?.slope_cut) {
    return say('a carcass cut under a slope keeps the puzzle: SKYLON_JOINTS_BISCUIT.lsp has no row for its roof board');
  }
  if (params?.notch) {
    return say('a carcass with a corner notch keeps the puzzle: KIT_NOTCH.lsp re-plans the puzzle\'s joints, '
      + 'and SKYLON_JOINTS_BISCUIT.lsp has no notch row');
  }
  // T79 F5 (KIT_NOTCH.lsp D22): the edge notch re-plans them the same way.
  if (params?.edgeNotch) {
    return say('a carcass with an edge notch keeps the puzzle: KIT_NOTCH.lsp re-plans the puzzle\'s joints, '
      + 'and SKYLON_JOINTS_BISCUIT.lsp has no notch row');
  }
  const prof = bjProfile(profile);
  const pz = profile?.puzzle || {};
  const {
    width: W, height: H, depth: D, board_t: G,
  } = parent.params;
  const byId = new Map((parent.panels || []).map((p) => [p.id, p]));
  const dims = (p) => [Number(p?.cnc?.drawn_w ?? p?.w), Number(p?.cnc?.drawn_h ?? p?.h)];
  const want = {
    BUL: [D - G, H], BUR: [D - G, H], TOP: [D - G, W - 2 * G], BOTTOM: [D - G, W - 2 * G],
  };
  // The carcass must BE the LISP's: every board it names, where it names it.
  for (const id of BISCUIT_BOARDS) {
    const p = byId.get(id);
    if (!p) {
      if (id === 'BOTTOM' && type?.carcass?.bottom === 'none') continue;
      return say(`${id} is missing, so this is not the five-board carcass SKYLON_JOINTS_BISCUIT.lsp is written for`, null);
    }
    const [w, h] = dims(p);
    if (Math.abs(w - want[id][0]) > EPS || Math.abs(h - want[id][1]) > EPS) {
      return say(`${id} is ${fmt(w)} x ${fmt(h)}, not the ${fmt(want[id][0])} x ${fmt(want[id][1])} `
        + 'SKYLON_JOINTS_BISCUIT.lsp\'s table cuts', id);
    }
  }
  // The FIX shelves the table describes: a shelf screwed into BOTH carcass
  // sides, cut to the full clear light, its back edge on the BACK. They are
  // T24's joints already and stay T24's to cut (`existing`); they are in the
  // plan so the summary and the LISP print one whole pattern.
  const drills = parent.drills || [];
  const fix = [];
  for (const p of parent.panels || []) {
    if (p.part !== 'SHELF' || !p.box) continue;
    const jointY = p.box.y + (Number(p.thickness) || G) / 2;
    const screwed = (side) => drills.some((d) => d.panel === side && d.kind === 'shelf_screw'
      && Math.abs(d.y - jointY) < EPS);
    if (!screwed('BUL') || !screwed('BUR')) continue;
    if (Math.abs(p.box.x - G) > EPS || Math.abs(p.box.w - (W - 2 * G)) > EPS || Math.abs(p.box.z - G) > EPS) continue;
    fix.push({
      id: p.id, row: p.box.y, t: Number(p.thickness) || G, sb: D - p.box.z - p.box.d, jointY,
    });
  }
  const shelfIds = new Map(fix.map((f, i) => [`SHELF-${i + 1}`, f.id]));
  const rename = (s) => (shelfIds.has(s) ? shelfIds.get(s) : s);
  const table = bjJointTable(W, D, H, G, fix.map((f) => [f.row, f.t, f.sb]))
    .map((jt) => ({
      ...jt,
      name: jt.name.replace(/SHELF-\d+$/, (m) => rename(m)),
      edge: rename(jt.edge),
    }))
    .filter((jt) => byId.has(jt.face) && byId.has(jt.edge));
  const existingIds = new Set(fix.map((f) => f.id));

  // biscuit-refusal, joint by joint.
  const joints = [];
  for (const jt of table) {
    const bad = bjRefusal(prof, jt);
    if (bad.length) return say(`${jt.name}: ${bad.join('; ')}`, jt.face);
    joints.push({ joint: jt, existing: existingIds.has(jt.edge), ...bjJointCuts(jt, prof) });
  }

  // Nothing is clipped silently: a mark or a screw that meets a hole or a
  // pocket the board KEEPS (not one the strip takes with the joint) refuses
  // the pattern, naming both. The fixed shelf's own cuts are T24's and are
  // not asked again.
  const rowsOn = (board) => joints.filter((j) => !j.existing && j.joint.face === board).map((j) => j.joint.jointY);
  const keepsHole = (d) => !rowsOn(d.panel).some((y) => sideHoleGoes(d, y, G, pz));
  for (const j of joints) {
    if (j.existing) continue;
    const board = byId.get(j.joint.face);
    const kept = (board?.cnc?.pockets || []).filter((k) => !rowsOn(j.joint.face).some((y) => sidePocketGoes(k, y, pz)));
    const cuts = [
      ...j.screws.map((s) => ({ what: 'screw', x: s[2], y: s[3], circle: [s[2], s[3], s[4] / 2] })),
      ...j.marks.map((m) => ({ what: 'mark', x: m[2], y: m[3], rect: markRect(m, prof) })),
    ];
    for (const c of cuts) {
      for (const d of drills) {
        if (d.panel !== j.joint.face || !keepsHole(d)) continue;
        const hit = c.circle
          ? Math.hypot(c.circle[0] - Number(d.x), c.circle[1] - Number(d.y)) < c.circle[2] + (Number(d.d) || 0) / 2 - EPS
          : circleMeetsRect(Number(d.x), Number(d.y), (Number(d.d) || 0) / 2, ...c.rect);
        if (hit) {
          return say(`the biscuit ${c.what} of ${j.joint.name} at ${fmt(c.x)}, ${fmt(c.y)} on ${j.joint.face} meets the ${d.kind} hole `
            + `at ${fmt(d.x)}, ${fmt(d.y)}; SKYLON_JOINTS_BISCUIT.lsp has no answer for it yet, so the unit keeps the puzzle`, j.joint.face);
        }
      }
      for (const k of kept) {
        const hit = c.circle
          ? circleMeetsRect(c.circle[0], c.circle[1], c.circle[2], k.x1, k.y1, k.x2, k.y2)
          : rectsMeet(c.rect, [k.x1, k.y1, k.x2, k.y2]);
        if (hit) {
          return say(`the biscuit ${c.what} of ${j.joint.name} at ${fmt(c.x)}, ${fmt(c.y)} on ${j.joint.face} meets the ${k.layer} pocket; `
            + 'SKYLON_JOINTS_BISCUIT.lsp has no answer for it yet, so the unit keeps the puzzle', j.joint.face);
        }
      }
    }
  }

  return {
    refused: false,
    plan: {
      system: BISCUIT_SYSTEM,
      prof,
      G: Number(G),
      layers: { mark: prof.layer, screw: prof.screwLayer },
      boards: BISCUIT_BOARDS.filter((id) => byId.has(id)),
      leaves: [...BISCUIT_LEAVES],
      joints,
      shelves: new Set(fix.map((f) => f.id)),
      back: BISCUIT_BACK,
    },
  };
}

/** The parent, cut with the puzzle, and the reason in words (Check #31, the dowel's code). */
export function withBiscuitRefusal(parent, verdict, asked) {
  return {
    ...parent,
    warnings: [...(parent.warnings || []), {
      code: JOINTS_REFUSED,
      ...(verdict.panel ? { panel: verdict.panel } : {}),
      message: `Biscuits refused: ${verdict.message}`,
    }],
    derived: { ...(parent.derived || {}), joints: { asked, system: 'puzzle', refused: verdict.message } },
  };
}

/**
 * The LISP's section F, on the boards the plan names: each loses the puzzle of
 * the PLANNED joints and nothing else. A SIDE keeps its outline (the back
 * tenons are the BACK's joint) and loses, at each planned joint line, the
 * socket pocket, its two dia 7.5 holes and the dia 3 row. A TOP or BOTTOM
 * loses its END tenons (the outline is re-traced with plain ends and its
 * back-edge tenons kept) and its end dog bones. Run BEFORE the drilling pass,
 * so nothing of it is copied into the drills. The BACK is not in `boards`.
 */
export function biscuitStrip({ panels, plan, profile }) {
  const pz = profile?.puzzle || {};
  const G = plan.G;
  for (const p of panels) {
    if (!plan.boards.includes(p.id) || !p.cnc) continue;
    const w = Number(p.cnc.drawn_w ?? p.w);
    const h = Number(p.cnc.drawn_h ?? p.h);
    if (p.id === 'BUL' || p.id === 'BUR') {
      const rows = plan.joints.filter((j) => !j.existing && j.joint.face === p.id).map((j) => j.joint.jointY);
      p.cnc = {
        ...p.cnc,
        pockets: (p.cnc.pockets || []).filter((k) => !rows.some((y) => sidePocketGoes(k, y, pz))),
        holes: (p.cnc.holes || []).filter((d) => !rows.some((y) => sideHoleGoes(d, y, G, pz))),
      };
      continue;
    }
    const ends = new Set(plan.joints.filter((j) => !j.existing && j.joint.edge === p.id).map((j) => j.joint.edgeName));
    if (!ends.has('Y0') || !ends.has('YH')) continue;   // both ends or the board is left as cut
    const backTabs = (p.cnc.outline || []).some(([x]) => x < -EPS);
    p.cnc = {
      ...p.cnc,
      outline: bjPlainEnds({
        drawnW: w, drawnH: h, G, pz, backTabs,
      }),
      pockets: (p.cnc.pockets || []).filter((k) => !endPocketGoes(k, h, pz)),
    };
  }
}

/**
 * The MARKS of the planned carcass joints, in the record shape `computeCabinet`
 * pushes the fixed shelf's marks in (`shelfJointMarks`: `{ panelId, layer,
 * from: [x, y], to: [x, y] }`), so one writer writes `cnc.marks`. On BUR the
 * run reads from the back forward, exactly as the shelf's does today.
 * The `existing` (fixed shelf) joints are T24's and are not emitted.
 */
export function biscuitMarkRecords(plan) {
  const out = [];
  for (const j of plan.joints) {
    if (j.existing) continue;
    for (const m of j.marks) {
      out.push({
        panelId: m[0], layer: m[6], from: [m[2], m[3]], to: [m[4], m[5]], meta: { joint: j.joint.name },
      });
    }
  }
  return out;
}

/**
 * The through SCREWS of the planned carcass joints, as drill records: T13's
 * `biscuit_screw` kind on the screw layer, no depth (a through screw), the
 * joint's name in `meta`. The `existing` joints are not emitted.
 */
export function biscuitDrills(plan) {
  const out = [];
  const r4 = (v) => roundTo(v, 4);
  for (const j of plan.joints) {
    if (j.existing) continue;
    for (const s of j.screws) {
      out.push({
        panel: s[0], kind: BISCUIT_SCREW_KIND, layer: s[5], x: r4(s[2]), y: r4(s[3]), d: s[4], meta: { joint: j.joint.name },
      });
    }
  }
  return out;
}

/** What `result.derived.joints` says of a biscuit unit. */
export function biscuitSummary(plan) {
  const all = plan.joints;
  const sum = (list, f) => list.reduce((n, j) => n + f(j), 0);
  return {
    system: BISCUIT_SYSTEM,
    sets: sum(all, (j) => j.sets.length),
    marks: sum(all, (j) => j.marks.length),
    screws: sum(all, (j) => j.screws.length),
    joints: all.map((j) => ({
      name: j.joint.name,
      len: roundTo(j.joint.len, 4),
      sets: j.sets.length,
      screws: j.screws.length > 0,
      cutBy: j.existing ? 'T24 (the fixed shelf, untouched)' : 'T78 F20',
    })),
    leaves: [...plan.leaves],
    back: plan.back,
    confirmed: true,
    gate: bjGate(),
    noGate: BISCUIT_NO_GATE,
  };
}

/** Does this result carry a carcass biscuit screw on any of these panels (all by default)? */
export function carriesBiscuitJoints(result, panelIds = null) {
  const ids = panelIds ? new Set(panelIds) : null;
  return (result?.drills || []).some((d) => d.kind === BISCUIT_SCREW_KIND && (!ids || ids.has(d.panel)));
}

/**
 * The cut list's NOTE row for a biscuit unit (the pattern of `dowelNoteRow`;
 * `bom.js buildBom` may append it beside the dowel's): how many sets, that the
 * slots in the TOP's and BOTTOM's ends are the bench's, and that the BACK keeps
 * the puzzle. Null on every other unit. Offered, not wired: bom.js is not this
 * F's file.
 */
export function biscuitNoteRow(result) {
  const j = result?.derived?.joints;
  if (!j || j.system !== BISCUIT_SYSTEM) return null;
  return {
    unit_num: result.unitNum,
    id: `${result.unitNum} biscuits`,
    part: 'BISCUIT-NOTE',
    role: 'biscuit_note',
    material_role: 'note',
    material_label: `NOTE: biscuit joints, ${j.sets} sets (two dia 3 through screws and a 70 mark each) on the sides; `
      + 'the slots in the TOP\'s and BOTTOM\'s ends are cut at the bench; the BACK is screwed on, no tenons and no dog bones (bez ciastek na plecach)',
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

/** The layers this system writes to, for the layer table and the tests. */
export function biscuitJointLayers(profile) {
  return biscuitLayers(profile);
}
