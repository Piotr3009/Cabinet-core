/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// --- T82 F9 . THE VANITY UNIT: THE BOARDS THE LISP CUTS --------------------
//
// The owner, 25.10.2026 (12:57): *"pamietaj ze nie ma plecow na vanity unit
// tylko sa poziome poprzeczki na dole i na gorze, plecy sa jakby wyciete"*,
// *"musimy miec tez wyciecie na trap, w razie czego jak nie bedzie miejsca to
// zostawimy informacje prosze uzyc shallow trap"*; over the mockup (13:03):
// *"2 wyciecie u dookola zeby sie szuflada otwierala, 3 - 80, 4 - 100 na
// material carcasa grubosc"*; (13:46) *"6 - tak"*.
//
// LISP IS LAW: `reference/lisp/KIT_VANITY.lsp` states every difference from
// its parent, KIT_BUDR_FULL, in its part 5, and this module mirrors those
// routines one for one (the LISP name beside each). `computeCabinet` cuts the
// vanity as the drawer base it is (the sides, the TOP, the BOTTOM, the runner
// ladder, the boxes, the fronts are the parent's to the hole) and asks this
// module for the rest, under `type.vanity` only:
//
//   5(a)  THE BACK CUT OUT. No BACK; RAIL-BOTTOM and RAIL-TOP, W x 100 x G in
//         the back's own plane, each keeping the part of the back's joint
//         that lands wholly inside it (`vanityRailGeometry`). The sides keep
//         no back tab (D4): `computeCabinet` cuts them with `backTabs: false`.
//   5(b)  THE SERVICE VOID, INSIDE (T83 F6, D27). The carcass to the wall at
//         the house's clearance (`vanityWallGap`; `defaultParamsFor` writes
//         no `wall_gap`); the void is room taken behind the drawer boxes
//         (`vanityBoxRoom`, read by `cabinet.js` for the box's rung) and
//         Check #45 says so (`vanityVoidNote`).
//   5(c)  THE EQUAL DRAWERS. `cabinet.js drawerSplitFor` (the kit's
//         `equalDrawers`); the boxes are the parent's, shortened by the void.
//   5(d)  THE TRAP. The wastes (`vanityWastes`, THE ONE SOURCE the basin, the
//         plan cut-out and the room read), the U in the top drawer's box (the
//         back wall cut into boards, the bottom notched) and Check #39's
//         sentences (`vanityTrapVerdict`), applied on the cut by
//         `applyVanityTrap` with the drilling, as the canopy's boards are.
//   5(f)  THE BOWL NEVER ENTERS A BOARD (T83 F8, D29). The bowl's solid, the
//         room's half ellipsoid, held against every board of the cut
//         (`vanityBowlEnters`, `vanityBowlHits`): the shell the params fix
//         refuses the basin with the worktop's refusals (`vanityBowlRefused`,
//         read by worktop.js fitBasins), a board inside is said in #48
//         (`vanityBowlVerdict`); the U follows the waste (`vanityUDepth`).
//   5(c2) THE TRAP'S GAP (T83 F7, D28). At two columns with one basin the top
//         row's two boxes stand apart round the waste (`vanityTrapGap`,
//         `vanityGapBox`, `vanityGapOf`), the divider stops under the top row
//         (`cabinet.js drawerColumnsDivider`), and the waste's plan is GAP.
//
// Pure: no React, no store, no three.js. Reads the profile it is handed.

import { socketCentres, socketPanelGeometry, tabCentres } from './puzzle.js';
import { notchedOutline } from './socketFace.js';

const r4 = (v) => Math.round(Number(v) * 10000) / 10000;
const EPS = 1e-6;
const num = (v, fallback) => (Number.isFinite(Number(v)) ? Number(v) : fallback);

/** profile.vanity, read defensively: the LISP's section 3 where a profile says nothing. */
export function vanitySpec(profile) {
  const v = profile?.vanity || {};
  return {
    serviceVoidMm: num(v.serviceVoidMm, 80),          // vanityServiceVoid, CONFIRMED "3 - 80"
    railHeightMm: num(v.railHeightMm, 100),           // vanityRailH, CONFIRMED "4 - 100"
    trapWidthMm: num(v.trapWidthMm, 160),             // vanityTrapW, CONFIRMED
    trapDepthMm: num(v.trapDepthMm, 120),             // vanityTrapD, CONFIRMED
    trapRadiusMm: num(v.trapRadiusMm, 20),            // vanityTrapR, CONFIRMED "6 - tak"
    trapClearMm: num(v.trapClearMm, 60),              // vanityTrapClear, PROPOSED
    // T83 F7 (D28): the air a side of the trap's gap at two columns with one basin.
    trapGapClearMm: num(v.trapGapClearMm, 20),        // vanityTrapGapClear, PROPOSED
    // D23, after the review of 25.10.2026: no board of the back wall under it.
    backPieceMinMm: num(v.backPieceMinMm, 30),        // vanityBackPieceMin, PROPOSED
    wasteFromBackMm: num(v.wasteFromBackMm, 250),     // vanityWasteFromBack, T83 F8 (D29): 250, 200 under T82
    // The basin, to the eye only (vanityBasinW / D / H, PROPOSED): its rim's
    // oval is the hole in the worktop and the carcass TOP (D18), its depth the
    // bowl's below the worktop's top (D25).
    basinW: num(v.basin?.widthMm, 520),
    basinD: num(v.basin?.depthMm, 400),
    basinH: num(v.basin?.heightMm, 150),
    topMm: num(v.defaults?.top, 20),                  // vanityTop, PROPOSED: the top's thickness at birth
  };
}

/** A figure for a sentence: 45, or 45.5 (`vanity-mm`). */
function vanityMm(v) {
  const n = Number(v);
  return n === Math.trunc(n) ? String(Math.trunc(n)) : n.toFixed(1);
}

// --- (a) THE BACK CUT OUT: RAIL-BOTTOM AND RAIL-TOP -------------------------

/** The two rails, where the back stood (`vanity-rails`, D2). */
export function vanityRails({ W, H, G }, profile) {
  const r = vanitySpec(profile).railHeightMm;
  return [
    { name: 'RAIL-BOTTOM', x0: 0, y0: 0, z0: 0, length: Number(W), height: r, t: Number(G) },
    { name: 'RAIL-TOP', x0: 0, y0: Number(H) - r, z0: 0, length: Number(W), height: r, t: Number(G) },
  ];
}

/** The open back between them: [y0, y1] (`vanity-back-window`). */
function vanityBackWindow(H, profile) {
  const r = vanitySpec(profile).railHeightMm;
  return [r, Number(H) - r];
}

/**
 * Which rail a feature of the back lands WHOLLY inside, by its vertical extent
 * lo .. hi (`vanity-rail-of`, D3). An edge feature may run past the back's own
 * outer edge; only the rail's inside edge bounds it.
 */
function vanityRailOf(lo, hi, H, profile) {
  const r = vanitySpec(profile).railHeightMm;
  if (hi <= r) return 'RAIL-BOTTOM';
  if (lo >= Number(H) - r) return 'RAIL-TOP';
  return null;
}

/** The sides' back tabs a rail keeps: only where the whole dog bone lands in a rail (`vanity-side-tabs-kept`, D4). */
function vanitySideTabsKept(H, puzzle, profile) {
  const half = Number(puzzle.dogboneHalfHeight) || 0;
  return tabCentres(Number(H), puzzle).filter((c) => vanityRailOf(c - half, c + half, H, profile));
}

/** The back's side screw rows: 50 from each end and one between every two tabs (`vanity-back-side-screws`). */
function vanityBackSideScrews(H, puzzle) {
  const c = tabCentres(Number(H), puzzle);
  return [puzzle.screwFromEnd, ...c.slice(1).map((y, i) => (c[i] + y) / 2), Number(H) - puzzle.screwFromEnd];
}

/** ...and those the rails keep: [{ rail, y }], y up from the rail's own underside (`vanity-rail-side-screws`). */
function vanityRailSideScrews(H, puzzle, profile) {
  const r = vanitySpec(profile).railHeightMm;
  const out = [];
  for (const y of vanityBackSideScrews(H, puzzle)) {
    const rail = vanityRailOf(y, y, H, profile);
    if (rail) out.push({ rail, y: rail === 'RAIL-TOP' ? y - (Number(H) - r) : y });
  }
  return out;
}

/**
 * Each rail's CNC record, in the BACK's own drawn frame (x along the width
 * from the BUL end, y up from the rail's underside): the back's joint where it
 * lands wholly inside the rail (D3, D4). The back's sockets for the TOP's and
 * BOTTOM's back tenons (`backPanelGeometry`'s `acrossCentres`) and the screw
 * row beside them stay on the rail's long outer edge; the sides' sockets stay
 * only where `vanitySideTabsKept` keeps their tab (none on a 100 rail); the
 * side screw rows only where `vanityRailSideScrews` keeps them.
 */
export function vanityRailGeometry({
  W, H, G, puzzle, dropped = [],
}, profile) {
  const w = Number(W);
  // D26: the TOP's tenon (its socket here) and the rail's screw into the TOP's
  // back edge, where a basin's oval takes that edge away, are not cut.
  const gone = (kind, x) => dropped.some((f) => f.kind === kind && Math.abs(f.x - x) < EPS);
  const r = vanitySpec(profile).railHeightMm;
  const S = Number(G) / 2;
  const across = socketCentres(w - 2 * Number(G), puzzle).map((c) => Number(G) + c);
  const kept = vanitySideTabsKept(H, puzzle, profile);
  const sideScrews = vanityRailSideScrews(H, puzzle, profile);
  const out = {};
  for (const rail of ['RAIL-BOTTOM', 'RAIL-TOP']) {
    const top = rail === 'RAIL-TOP';
    const base = top ? Number(H) - r : 0;
    const sideC = kept.filter((c) => vanityRailOf(c, c, H, profile) === rail).map((c) => c - base);
    const geom = socketPanelGeometry({
      w, h: r, G: Number(G), puzzle,
      sockets: {
        left: sideC, right: sideC, ...(top ? { top: across.filter((x) => !gone('TENON', x)) } : { bottom: across }),
      },
    });
    for (const s of sideScrews.filter((x) => x.rail === rail)) {
      geom.holes.push({ layer: puzzle.layers.screw, kind: 'screw', x: S, y: s.y, d: puzzle.screwDiameter });
      geom.holes.push({ layer: puzzle.layers.screw, kind: 'screw', x: w - S, y: s.y, d: puzzle.screwDiameter });
    }
    for (const x of [Number(G) + puzzle.screwFromEnd, w / 2, w - Number(G) - puzzle.screwFromEnd]) {
      if (top && gone('SCREW', x)) continue;
      geom.holes.push({ layer: puzzle.layers.screw, kind: 'screw', x, y: top ? r - S : S, d: puzzle.screwDiameter });
    }
    out[rail] = geom;
  }
  return out;
}

// --- (b) THE SERVICE VOID, INSIDE THE CARCASS --------------------------------
//
// T83 F6 · the owner, 25.10.2026 (22:41): *"jak mamy miejsce na rurki z tylu
// to super ze szuflady sa mniejsze ale carcas powinien byc do sciany, czyli
// wszystko w srodku carcasa mniejsze ale carcas do sciany"*. KIT_VANITY.lsp
// D6, D9 and D27: the carcass stands at the house's clearance like every
// unit; the void is the room the drawer boxes leave behind them.

/** The unit's wall gap: the house's clearance, as every unit's (`vanity-wall-gap`, D6, D27). */
export function vanityWallGap(profile) {
  return Math.max(0, num(profile?.room?.wallBackClearance, 0));
}

/**
 * The room a vanity's drawer box may take (`vanity-box-room`, D9, D27): the
 * parent's D - G - 20 and no more than D - front - the void, so the box's back
 * face (D - front - box from the carcass back, the parent's placement) keeps
 * `serviceVoidMm` from the carcass back. A void of 0 is the parent's law to
 * the millimetre. `cabinet.js` snaps it on the box ladder (the runner less
 * ten): VANITY3 at D 500, 395, the 390 box on the 400 runner.
 */
export function vanityBoxRoom({ D, G, frontT }, profile) {
  const parent = Number(D) - Number(G) - num(profile?.baseDrawerUnit?.depthAllowance, 20);
  const v = vanitySpec(profile).serviceVoidMm;
  return v > 0 ? Math.min(parent, Number(D) - Number(frontT) - v) : parent;
}

/** Check #45's words (`vanity-void-note`, D21, D27), without the LISP's "#45 ". */
export function vanityVoidNote(profile) {
  return `Service void ${vanityMm(vanitySpec(profile).serviceVoidMm)} inside the vanity behind the drawers.`;
}

// --- (c) THE BOXES, AS THE ENGINE CUT THEM -----------------------------------

/** A box's tag: the parent's D3, or the wardrobe's column tag Z1D3 (`vanity-box-tag`, D13). */
function vanityBoxTag(col, idx, columns) {
  return Number(columns) === 2 ? `Z${col}D${idx}` : `D${idx}`;
}

/**
 * The LISP's BOX tuples (`vanity-boxes`: col idx x0 boxW side base depth
 * zBack), read off the boards the engine cut, so a stack the joiner re-heighted
 * is measured as it stands: x0 the left side's outer face, side its height,
 * base its foot above the carcass underside, zBack the box's back face from
 * the carcass back.
 */
export function vanityBoxesOf(panels, { n, columns }) {
  const byId = new Map((panels || []).map((p) => [p.id, p]));
  const out = [];
  for (let col = 1; col <= columns; col += 1) {
    for (let idx = 1; idx <= n; idx += 1) {
      const tag = vanityBoxTag(col, idx, columns);
      const SL = byId.get(`${tag}-SL`);
      const SR = byId.get(`${tag}-SR`);
      if (!SL?.box || !SR?.box) continue;
      out.push({
        col, idx, tag,
        x0: r4(SL.box.x),
        bw: r4(SR.box.x + SR.box.w - SL.box.x),
        side: r4(SL.box.h),
        base: r4(SL.box.y),
        depth: r4(SL.box.d),
        zBack: r4(SL.box.z),
      });
    }
  }
  return out;
}

/** `vanity-box-top`, `vanity-box-under`, `vanity-box-len`, `vanity-box-bottom-w`. */
const vanityBoxTop = (b) => b.base + b.side;
const vanityBoxUnder = (b, profile) => b.base + num(profile?.baseDrawerUnit?.runnerPocketWidth, 15);
const vanityBoxLen = (b, GB) => b.bw - GB - GB;
const vanityBoxBottomW = (b, GB, profile) => vanityBoxLen(b, GB) + num(profile?.baseDrawerUnit?.bottomOversize, 13);

// --- (c2) THE TRAP'S GAP AT TWO COLUMNS WITH ONE BASIN (T83 F7, D28) ---------
//
// The owner, 25.10.2026 (22:41): *"nie ma wyciecia na U na sinki nawet jak je
// wlacze ... jest wyciecie jak jest 1 szuflada ale nie jak sa 2 szuflady a mamy
// jeden sink, albo mam pomysl: zmniejszmy szuflady na szerokosc, tylko fronty
// zostawmy szerokie i pomiedzy szufladami zrobi sie miejsce na syfon (tylko
// gorna row)"*. KIT_VANITY.lsp D28.

/**
 * The trap's gap (`vanity-trap-gap`): at two columns with one basin, the air
 * between the top row's two boxes, [from, to] centred on W / 2, half of it
 * `trapWidthMm / 2 + trapGapClearMm` (100 on the default); else null.
 */
export function vanityTrapGap({ W, columns, sinks }, profile) {
  if (Number(columns) !== 2 || Math.trunc(Number(sinks) || 0) !== 1) return null;
  const T = vanitySpec(profile);
  const half = T.trapWidthMm / 2 + T.trapGapClearMm;
  return [Number(W) / 2 - half, Number(W) / 2 + half];
}

/**
 * A top box narrowed to the gap (`vanity-gap-box`): column 1's right outer
 * face at the gap's left end, column 2's left outer face at its right end.
 * `b` is `{ col, x0, bw }` (x0 the left side's outer face, bw the outer width).
 */
export function vanityGapBox(b, gap) {
  let x0 = Number(b.x0);
  let x1 = Number(b.x0) + Number(b.bw);
  if (Number(b.col) === 1) x1 = gap[0]; else x0 = gap[1];
  return { col: b.col, x0: r4(x0), bw: r4(x1 - x0) };
}

/**
 * The gap the cut takes (`vanity-gap-of`, `vanity-gap-fits-p`): the trap's
 * gap where every narrowed top box keeps walls of `backPieceMinMm` (D23's
 * shortest board), else null (D17 stands: the waste over the divider). `tops`
 * the top row's boxes as the column plan stands them, `{ col, x0, bw }`.
 */
export function vanityGapOf({
  W, columns, sinks, tops, GB,
}, profile) {
  const gap = vanityTrapGap({ W, columns, sinks }, profile);
  if (!gap) return null;
  const m = vanitySpec(profile).backPieceMinMm;
  return (tops || []).every((b) => vanityBoxLen(vanityGapBox(b, gap), Number(GB)) >= m - EPS) ? gap : null;
}

// --- (d) THE TRAP ------------------------------------------------------------

/**
 * The wastes' x, left to right, from the carcass's left outer face
 * (`vanity-wastes`, D14): one basin at W / 2; two at W / 4 and 3W / 4 on two
 * columns, at W / 3 and 2W / 3 on one. THE ONE SOURCE: the basin in the room,
 * the worktop's cut-out on the plan and the U all read it. Their z is
 * `vanitySpec(profile).wasteFromBackMm` from the carcass back.
 */
export function vanityWastes({ W, columns = 1, sinks = 0 }) {
  const w = Number(W);
  const s = Math.trunc(Number(sinks) || 0);
  if (s === 1) return [w / 2];
  if (s === 2 && Number(columns) === 2) return [w / 4, w * 0.75];
  if (s === 2) return [w / 3, (w * 2) / 3];
  return [];
}

/** The top drawer's box under the waste at xw, between its own sides, or null (`vanity-top-box-under`, D17). */
function vanityTopBoxUnder(boxes, n, xw, GB) {
  let out = null;
  for (const b of boxes) {
    if (b.idx === n && xw >= b.x0 + GB && xw <= b.x0 + b.bw - GB) out = b;
  }
  return out;
}

/**
 * The U's depth into box b from its back face (`vanity-u-depth`, D13, D15,
 * D29). T83 F8, CLAUDE.md: *"The U of the top box (columns 1) follows the
 * waste"*: it reaches a trap as wide as itself centred on the waste, never
 * less than `trapDepthMm`, never past what keeps `backPieceMinMm` of the
 * bottom behind the box's front wall. 245 on the default (250 + 80 - 85).
 */
export function vanityUDepth(b, GB, profile) {
  const T = vanitySpec(profile);
  return Math.min(b.depth - Number(GB) - T.backPieceMinMm,
    Math.max(T.trapDepthMm, T.wasteFromBackMm + T.trapWidthMm / 2 - b.zBack));
}

/** The U round the trap at xw in box b: { col, from, to, depth, r } (`vanity-trap-u`, D13, D29). */
function vanityTrapU(b, xw, GB, profile) {
  const T = vanitySpec(profile);
  const half = T.trapWidthMm / 2;
  return { col: b.col, from: xw - half, to: xw + half, depth: vanityUDepth(b, GB, profile), r: T.trapRadiusMm };
}

/**
 * Does the U leave `backPieceMinMm` (30) of the back wall against each of the
 * box's sides and after the U before it (`vanity-u-fits-p`, D23, after the
 * review of 25.10.2026: no 0 or sliver board for the saw)?
 */
function vanityUFits(b, u, prev, GB, profile) {
  const m = vanitySpec(profile).backPieceMinMm;
  return u.from - (b.x0 + GB) >= m && (b.x0 + b.bw - GB) - u.to >= m
    && (!prev || prev.col !== u.col || u.from - prev.to >= m);
}

/**
 * Every waste's plan: [{ x, box, u, status }], status CUT | DIVIDER | FIT, or
 * GAP: the waste in the trap's gap the cut took (`gap`, D28), no U
 * (`vanity-trap-plan`).
 */
function vanityTrapPlan({
  boxes, n, columns, sinks, W, GB, gap = null,
}, profile) {
  const out = [];
  let prev = null;
  for (const xw of vanityWastes({ W, columns, sinks })) {
    if (gap) { out.push({ x: xw, box: null, u: null, status: 'GAP' }); continue; }
    const b = vanityTopBoxUnder(boxes, n, xw, GB);
    if (!b) { out.push({ x: xw, box: null, u: null, status: 'DIVIDER' }); continue; }
    const u = vanityTrapU(b, xw, GB, profile);
    if (vanityUFits(b, u, prev, GB, profile)) {
      out.push({ x: xw, box: b, u, status: 'CUT' });
      prev = u;
    } else {
      out.push({ x: xw, box: b, u, status: 'FIT' });
    }
  }
  return out;
}

/** The U as the notch in the bottom board's own frame: [from, to, depth, r] (`vanity-u-in-bottom`). */
function vanityUInBottom(b, u, GB, profile) {
  const left = b.x0 + (b.bw - vanityBoxBottomW(b, GB, profile)) / 2;
  return [u.from - left, u.to - left, u.depth, u.r];
}

/**
 * The notch's outline in that frame (`vanity-u-outline`): the six key points
 * from the back edge round the notch and back, the two quarter-arc centres and
 * the radius (never more than half the width or the depth).
 */
function vanityUOutline([a0, a1, d, rAsked]) {
  const r = Math.min(rAsked, (a1 - a0) / 2, d);
  return {
    points: [[a0, 0], [a0, d - r], [a0 + r, d], [a1 - r, d], [a1, d - r], [a1, 0]],
    centres: [[a0 + r, d - r], [a1 - r, d - r]],
    r,
  };
}

/** The back wall's boards once the U's are cut through it: [[from, to]] along it from the left (`vanity-back-pieces`). */
function vanityBackPieces(b, us, GB) {
  const left = b.x0 + GB;
  const len = vanityBoxLen(b, GB);
  const out = [];
  let prev = 0;
  for (const u of us) {
    out.push([prev, u.from - left]);
    prev = u.to - left;
  }
  out.push([prev, len]);
  return out;
}

/** Their ids: {tag}-BB-1 .. {tag}-BB-k from the left (`vanity-piece-ids`). */
function vanityPieceIds(tag, k) {
  return Array.from({ length: k }, (_, i) => `${tag}-BB-${i + 1}`);
}

/** How far the waste stands INSIDE the U's reach; negative, beyond it (`vanity-trap-reach`, D15, D29). */
function vanityTrapReach(b, wasteZ, GB, profile) {
  return b.zBack + vanityUDepth(b, GB, profile) - wasteZ;
}

/** The trap's bottom line (D16) and the air under it to the box below (`vanity-trap-line`, `vanity-trap-room`). */
const vanityTrapLine = (b, profile) => vanityBoxUnder(b, profile);
const vanityTrapRoom = (top, below, profile) => vanityTrapLine(top, profile) - vanityBoxTop(below);

/** The shallow-trap sentence, the top box over the box below it, or null (`vanity-trap-shallow`, D16). */
function vanityTrapShallow(top, below, profile) {
  const T = vanitySpec(profile);
  const room = vanityTrapRoom(top, below, profile);
  return room < T.trapClearMm
    ? `#39 Use a shallow trap: the drawer under it stands ${vanityMm(room)} mm under the trap's bottom, ${vanityMm(T.trapClearMm)} wanted`
    : null;
}

/**
 * Check #39 (`vanity-trap-verdict`, D15, D16, D17, D28): [{ kind, x,
 * sentence }], empty when the trap has its room. Kinds: DIVIDER, FIT, REACH,
 * SHALLOW, and RUNNERS (the trap's gap: no wall carries the top row's inner
 * runners); the sentences are the LISP's, to the letter.
 */
export function vanityTrapVerdict({
  boxes, n, columns, sinks, W, GB, gap = null,
}, profile) {
  const T = vanitySpec(profile);
  const out = [];
  for (const e of vanityTrapPlan({
    boxes, n, columns, sinks, W, GB, gap,
  }, profile)) {
    const b = e.box;
    if (e.status === 'GAP') {
      out.push({
        kind: 'RUNNERS',
        x: e.x,
        sentence: '#39 The trap stands in the gap between the top drawers: no wall carries their two inner runners',
      });
      const top = boxes.find((x) => x.col === 1 && x.idx === n);
      const below = boxes.find((x) => x.col === 1 && x.idx === n - 1);
      const s = n > 1 && top && below ? vanityTrapShallow(top, below, profile) : null;
      if (s) out.push({ kind: 'SHALLOW', x: e.x, sentence: s });
    } else if (e.status === 'DIVIDER') {
      out.push({ kind: 'DIVIDER', x: e.x, sentence: '#39 The trap stands over the divider: no top drawer can take its U' });
    } else if (e.status === 'FIT') {
      out.push({
        kind: 'FIT',
        x: e.x,
        sentence: `#39 The trap's U does not fit the top drawer's box: every board of its back wall keeps ${vanityMm(T.backPieceMinMm)}`,
      });
    } else {
      const reach = vanityTrapReach(b, T.wasteFromBackMm, GB, profile);
      if (reach < 0) {
        out.push({
          kind: 'REACH',
          x: e.x,
          sentence: `#39 The trap stands ${vanityMm(-reach)} mm beyond the U: the U reaches `
            + `${vanityMm(b.zBack + vanityUDepth(b, GB, profile))} from the carcass back, the waste stands at ${vanityMm(T.wasteFromBackMm)}`,
        });
      }
      if (n > 1) {
        const below = boxes.find((x) => x.col === b.col && x.idx === n - 1);
        const s = below ? vanityTrapShallow(b, below, profile) : null;
        if (s) out.push({ kind: 'SHALLOW', x: e.x, sentence: s });
      }
    }
  }
  return out;
}

// --- (f) THE BASIN THROUGH THE TOPS (D18, D25, D26, after the review) -------

/**
 * The top's thickness: the vanity's slab's (`params.vanity_top_mm`, handed by
 * the store from the worktop record over it), else the kit's own 20
 * (`vanityTop`). Which basins the top takes is engine/worktop.js `fitBasins`.
 */
export function vanityTopThickness(params, profile) {
  const t = Number(params?.vanity_top_mm);
  return t > 0 ? t : vanitySpec(profile).topMm;
}

/**
 * The oval of each basin the worktop takes, in the carcass TOP's own frame
 * (x from its left end at G, z from its back edge at G): [{ cx, cz, w, d,
 * opens }], opens EDGE where the oval runs past the TOP's back edge, else HOLE
 * (`vanity-top-cutouts`, D18).
 */
export function vanityTopCutouts(xs, G, profile) {
  const T = vanitySpec(profile);
  const zw = T.wasteFromBackMm;
  return (xs || []).map((xw) => ({
    cx: xw - G, cz: zw - G, w: T.basinW, d: T.basinD, opens: zw - T.basinD / 2 < G ? 'EDGE' : 'HOLE',
  }));
}

/** The note it is, on the TOP and in the BOM (`vanity-top-cutout-note`, D18). */
function vanityTopCutoutNote(num, profile) {
  const T = vanitySpec(profile);
  return `Basin cut-out ${vanityMm(T.basinW)} x ${vanityMm(T.basinD)} oval in the carcass top of ${num}: cut on site to the basin's template.`;
}

/** Does the extent lo .. hi along the line z = zEdge meet the oval of the basin at xw (`vanity-oval-meets-p`, D26)? */
function vanityOvalMeets(lo, hi, xw, zEdge, profile) {
  const T = vanitySpec(profile);
  const a = T.basinW / 2;
  const c = T.basinD / 2;
  const dz = (zEdge - T.wasteFromBackMm) / c;
  const k = 1 - dz * dz;
  if (k <= 0) return false;
  const dx = Math.max(0, lo - xw, xw - hi);
  return (dx / a) * (dx / a) < k;
}

/**
 * The TOP's back joint along x (`vanity-top-back-features`): its tenons with
 * the rail's sockets (G + the socket centres over W - 2G, the dog bone either
 * side) and the rail's screws into its back edge (G + 50, W / 2, W - G - 50).
 */
function vanityTopBackFeatures(W, G, puzzle) {
  const h = Number(puzzle.dogboneHalfHeight) || 0;
  const out = socketCentres(W - G - G, puzzle).map((c) => ({ kind: 'TENON', x: G + c, lo: G + c - h, hi: G + c + h }));
  for (const c of [G + puzzle.screwFromEnd, W / 2, W - G - puzzle.screwFromEnd]) out.push({ kind: 'SCREW', x: c, lo: c, hi: c });
  return out;
}

/** ...and those a basin takes away: [{ kind, x }] (`vanity-top-back-dropped`, D26). */
export function vanityTopBackDropped(W, G, xs, puzzle, profile) {
  return vanityTopBackFeatures(W, G, puzzle)
    .filter((f) => (xs || []).some((xw) => vanityOvalMeets(f.lo, f.hi, xw, G, profile)))
    .map((f) => ({ kind: f.kind, x: f.x }));
}

// --- (f2) THE BOWL NEVER ENTERS A BOARD (T83 F8, D29) ------------------------
//
// The owner, 25.10.2026 (22:41): *"umywalki przesun bardziej do przodu o jakies
// 50 mm, powod: wchodza w tylna scianke, zlamana regula material nigdy nie
// wchodzi w drugi material"*. CLAUDE.md T83 F8: *"the engine CHECKS the bowl's
// solid against every board of the carcass (the rails, the sides, the back
// pieces, the top drawer's box after F7) with the house's clash test: a bowl
// that would enter a board is refused in words"*.

/**
 * How far the bowl enters the board `bx` ({ x, y, z, w, h, d }, the carcass
 * frame), or null (`vanity-bowl-enters`): the bowl's solid the room's (3d/
 * Basin.jsx), the lower half of the ellipsoid of the basin's oval centred on
 * (xw, zw), `bowlH` deep under `yTop` (the worktop's top). Over the board's
 * point nearest the bowl's axis, in the oval's own measure, the bowl is
 * deepest; the board enters it by the height it keeps between the bowl's
 * bottom there and the rim.
 */
export function vanityBowlEnters(bx, xw, zw, yTop, bowlH, profile) {
  const T = vanitySpec(profile);
  const a = T.basinW / 2;
  const c = T.basinD / 2;
  const dx = (Math.max(bx.x, Math.min(xw, bx.x + bx.w)) - xw) / a;
  const dz = (Math.max(bx.z, Math.min(zw, bx.z + bx.d)) - zw) / c;
  const s = dx * dx + dz * dz;
  if (!(s < 1)) return null;
  const bottom = yTop - bowlH * Math.sqrt(1 - s);
  const n = Math.min(yTop, bx.y + bx.h) - Math.max(bottom, bx.y);
  return n > 0.0001 ? n : null;
}

/** The shell the params fix (`vanity-bowl-shell`): the two sides and the two rails, as the cut stands them. */
export function vanityBowlShell({
  W, H, D, G,
}, profile) {
  const g = Number(G);
  return [
    { id: 'BUL', x: 0, y: 0, z: g, w: g, h: Number(H), d: Number(D) - g },
    { id: 'BUR', x: Number(W) - g, y: 0, z: g, w: g, h: Number(H), d: Number(D) - g },
    ...vanityRails({ W, H, G }, profile).map((r) => ({
      id: r.name, x: r.x0, y: r.y0, z: r.z0, w: r.length, h: r.height, d: r.t,
    })),
  ];
}

/**
 * Every board the bowls at `xs` enter (`vanity-bowl-hits`): [{ id, mm }],
 * the deepest per board to the tenth of a millimetre, in the boards' order.
 */
export function vanityBowlHits(boards, xs, yTop, bowlH, profile) {
  const zw = vanitySpec(profile).wasteFromBackMm;
  const out = [];
  for (const bx of boards || []) {
    let best = null;
    for (const xw of xs || []) {
      const e = vanityBowlEnters(bx, xw, zw, yTop, bowlH, profile);
      if (e != null && (best == null || e > best)) best = e;
    }
    if (best != null) out.push({ id: bx.id, mm: Math.trunc(best * 10 + 0.5) / 10 });
  }
  return out;
}

/** #48 in CLAUDE.md T83 F8's words (`vanity-bowl-sentence`): *"the bowl enters RAIL-TOP by N mm: move the basin forward or take a shallower bowl"*. */
export function vanityBowlSentence(num, hits) {
  return `${num}: The bowl enters ${hits.map((h) => `${h.id} by ${vanityMm(h.mm)} mm`).join(', ')}: `
    + 'move the basin forward or take a shallower bowl.';
}

/**
 * The bowl refused with the worktop's refusals (`vanity-bowl-refused`, D29):
 * the hits on the shell the params fix (the rails and the sides) of the
 * bowls at `xs`, [] where it enters none. engine/worktop.js fitBasins reads
 * it, so such a basin is cut in neither top and drawn nowhere.
 */
export function vanityBowlRefused({
  W, H, D, G, xs, wt, bowlH,
}, profile) {
  return vanityBowlHits(vanityBowlShell({
    W, H, D, G,
  }, profile), xs, Number(H) + Number(wt), bowlH, profile);
}

/**
 * Check #48 for the bowl (`vanity-bowl-verdict`, D25, D29): the sentence, or
 * null. `panels` the boards of the cut (every one but the TOP, which takes
 * the oval, and the fronts, which stand before the carcass: the LISP's
 * `vanity-bowl-boards`, in the cut's order), `xs` the wastes' x of the basins
 * the worktop takes, `wt` the worktop's thickness, `bowlH` the bowl's depth
 * below the worktop's top.
 */
export function vanityBowlVerdict({
  num, H, panels, xs, wt, bowlH,
}, profile) {
  const boards = (panels || [])
    .filter((p) => p.box && p.id !== 'TOP' && p.role !== 'front')
    .map((p) => ({
      id: p.id, x: p.box.x, y: p.box.y, z: p.box.z, w: p.box.w, h: p.box.h, d: p.box.d,
    }));
  const hits = vanityBowlHits(boards, xs, Number(H) + Number(wt), bowlH, profile);
  return hits.length ? vanityBowlSentence(num, hits) : null;
}

/**
 * The carcass TOP under the basins the worktop takes (D18, D26), on the TOP
 * cut in the BOTTOM's frame (drawn x the depth from the back edge, drawn y
 * the width from the BUL end, before `topFrame.js` mirrors it): every tenon
 * of its back edge the oval meets goes with its dog bone (its socket in
 * RAIL-TOP is not cut, `vanityRailGeometry`'s `dropped`), and the TOP carries
 * the ovals as a NOTE, `meta.vanityBasins`, never on its CNC: the room draws
 * the hole from it, the cut list and Check #30 say it is cut on site.
 */
export function applyVanityTop({
  panels, W, G, xs, puzzle, profile, unitNum, dropped,
}) {
  const top = (panels || []).find((p) => p.id === 'TOP' && p.part === 'TOP');
  if (!top || !(xs || []).length) return null;
  const tenons = (dropped || []).filter((f) => f.kind === 'TENON').map((f) => f.x - G);
  if (tenons.length && top.cnc) {
    const half = Math.max(Number(puzzle.tabHalfWidth) || 0, Number(puzzle.tabHalfOpening) || 0);
    const h = Number(top.cnc.drawn_h) || 0;
    const inTab = (x, y) => x <= EPS && y > EPS && y < h - EPS && tenons.some((cy) => Math.abs(y - cy) <= half + EPS);
    top.cnc = {
      ...top.cnc,
      outline: (top.cnc.outline || []).filter(([x, y]) => !inTab(x, y)),
      pockets: (top.cnc.pockets || []).filter((p) => !(Math.max(p.x1, p.x2) <= EPS
        && tenons.some((cy) => Math.abs((p.y1 + p.y2) / 2 - cy) < EPS))),
    };
  }
  const cutouts = vanityTopCutouts(xs, G, profile).map((c) => ({
    ...c, cx: r4(c.cx), cz: r4(c.cz), x: r4(G + c.cx), z: r4(G + c.cz),
  }));
  const record = {
    frame: 'the TOP\'s own: cx from its left end (x = G), cz from its back edge (z = G); x and z the unit\'s',
    cutouts,
    note: vanityTopCutoutNote(unitNum, profile),
    readiness: 'manual',
    machined: false,
    dropped: (dropped || []).map((f) => ({ kind: f.kind, x: r4(f.x) })),
  };
  top.meta = { ...(top.meta || {}), vanityBasins: record };
  return record;
}

// --- (g) NO DOUBLE DRAWER UNDER A BASIN (D24, after the review) -------------

/** Is a double asked on this row refused: the top row and the row under it, with a basin (`vanity-double-refused-p`)? */
export function vanityDoubleRefused(row, n, sinks) {
  return Number(sinks) > 0 && (row === n || row === n - 1);
}

/** ...in these words (`vanity-double-refusal`). */
export function vanityDoubleRefusal(row) {
  return `Drawer ${row}: a double drawer is not cut under a basin: the trap's U is the top box's and its air is measured to the box under it. One box is cut.`;
}

// --- APPLIED ON THE CUT --------------------------------------------------------

// A drawn-frame point [x, y, ...] moved down by dy; a box [x0, y0, x1, y1] too.
const isPt = (p) => Array.isArray(p) && p.length >= 2 && Number.isFinite(Number(p[0])) && Number.isFinite(Number(p[1]));
const downPt = (p, dy) => (isPt(p) ? [p[0], r4(Number(p[1]) - dy), ...p.slice(2)] : p);
const downBox = (b, dy) => (Array.isArray(b) && b.length === 4 ? [b[0], r4(b[1] - dy), b[2], r4(b[3] - dy)] : b);

/**
 * A cut record's drawn-frame geometry moved down by dy: what topFrame.js
 * mirrors (`axis`, `lobes`, the `export` frame's `at`, `axis`, `lobes`,
 * `pts`, `box`: T78 F20's Cabineo pocket), translated instead. `end` names
 * the board's y = 0 or y = H end and stays true on the piece that keeps it.
 */
function downMeta(meta, dy) {
  if (!meta || typeof meta !== 'object') return meta;
  const out = { ...meta };
  if (isPt(meta.axis)) out.axis = downPt(meta.axis, dy);
  if (Array.isArray(meta.lobes)) out.lobes = meta.lobes.map((l) => downPt(l, dy));
  if (meta.export && typeof meta.export === 'object') {
    const ex = meta.export;
    out.export = {
      ...ex,
      ...(isPt(ex.at) ? { at: downPt(ex.at, dy) } : {}),
      ...(isPt(ex.axis) ? { axis: downPt(ex.axis, dy) } : {}),
      ...(Array.isArray(ex.lobes) ? { lobes: ex.lobes.map((l) => downPt(l, dy)) } : {}),
      ...(Array.isArray(ex.pts) ? { pts: ex.pts.map((q) => downPt(q, dy)) } : {}),
      ...(Array.isArray(ex.box) ? { box: downBox(ex.box, dy) } : {}),
    };
  }
  return out;
}

/** The part of a feature list that lands wholly inside [y0, y1] of a drawn frame, moved down by y0. */
function featuresIn(cnc, y0, y1) {
  const inside = (lo, hi) => lo >= y0 - EPS && hi <= y1 + EPS;
  const pockets = (cnc?.pockets || [])
    .filter((p) => inside(Math.min(p.y1, p.y2), Math.max(p.y1, p.y2)))
    .map((p) => ({
      ...p,
      y1: r4(p.y1 - y0),
      y2: r4(p.y2 - y0),
      ...(Array.isArray(p.pts) ? { pts: p.pts.map((q) => downPt(q, y0)) } : {}),
      ...(p.meta ? { meta: downMeta(p.meta, y0) } : {}),
    }));
  const holes = (cnc?.holes || [])
    .filter((h) => inside(h.y, h.y))
    .map((h) => ({ ...h, y: r4(h.y - y0), ...(h.meta ? { meta: downMeta(h.meta, y0) } : {}) }));
  return { pockets, holes };
}

/**
 * Cut the trap's U into the top drawer's box of the cut (D13) and say Check
 * #39 (D15, D16, D17). Runs on the boards and the drilling computeCabinet has
 * made, as `applyCanopy` does, so the back wall's boards and the bottom's
 * notch reach the cut list, the DXF and the drilling records at once:
 *
 *   {tag}-BB      replaced by {tag}-BB-1 .. {tag}-BB-k+1 from the left, each
 *                 the back wall's own frame cut to its piece (drawn rotated,
 *                 x up its height, y from its RIGHT end, joinery.js's
 *                 DRAWER-BOX-BACK frame); a pocket, a hole or a drill of the
 *                 wall goes with the piece it lands in
 *   {tag}-DNO     its back edge notched (socketFace.js notchedOutline, the
 *                 LISP's six key points and two quarter arcs); a hole that
 *                 the notch takes is dropped from the board and the drilling
 *                 (a hole in air is a hole the machine plunges through the bed)
 *
 * `mkPanel` is `cabinet.js`'s own `panel()`, so a piece is shaped by the one
 * law every other board is (material role, finish, area). Returns the record
 * `derived.vanity.trap` publishes.
 */
export function applyVanityTrap({
  panels, drills, warnings, W, GB, n, columns, sinks, profile, mkPanel, gap = null,
}) {
  const boxes = vanityBoxesOf(panels, { n, columns });
  const args = {
    boxes, n, columns, sinks, W, GB, gap,
  };
  const plan = vanityTrapPlan(args, profile);
  const verdict = vanityTrapVerdict(args, profile);
  const T = vanitySpec(profile);
  const byTag = new Map();
  for (const e of plan) {
    if (e.status !== 'CUT') continue;
    if (!byTag.has(e.box.tag)) byTag.set(e.box.tag, { box: e.box, us: [], xs: [] });
    byTag.get(e.box.tag).us.push(e.u);
    byTag.get(e.box.tag).xs.push(e.x);
  }
  const cuts = [];
  for (const [tag, { box, us, xs }] of byTag) {
    const trap = {
      // T83 F8 · the depth the U is cut to: it follows the waste (`vanityUDepth`, D29).
      widthMm: T.trapWidthMm, depthMm: r4(us[0].depth), radiusMm: T.trapRadiusMm,
      centreX: r4(xs[0]), centres: xs.map(r4), us: us.map((u) => ({ from: r4(u.from), to: r4(u.to) })),
    };
    // THE BACK WALL, CUT INTO BOARDS.
    const at = panels.findIndex((p) => p.id === `${tag}-BB`);
    const pieces = vanityBackPieces(box, us, GB);
    const ids = vanityPieceIds(tag, pieces.length);
    if (at >= 0) {
      const bb = panels[at];
      const len = vanityBoxLen(box, GB);
      const h = Number(bb.cnc?.drawn_w) || Number(bb.h);
      const made = pieces.map(([a0, a1], k) => {
        const pl = r4(a1 - a0);
        // The wall's drawn y runs from its RIGHT end: this piece is y in [len - a1, len - a0].
        const y0 = len - a1;
        const kept = featuresIn(bb.cnc, y0, len - a0);
        return mkPanel({
          id: ids[k],
          part: bb.part,
          role: bb.role,
          w: pl,
          h: bb.h,
          thickness: bb.thickness,
          edgeCode: bb.edging?.code,
          edgeLen: bb.edging?.len_m || 0,
          box: { ...bb.box, x: r4(bb.box.x + a0), w: pl },
          cnc: {
            ...bb.cnc,
            drawn_w: h,
            drawn_h: pl,
            outline: [[0, 0], [h, 0], [h, pl], [0, pl]],
            pockets: kept.pockets,
            holes: kept.holes,
          },
          meta: { ...(bb.meta || {}), piece: k + 1, of: pieces.length, vanityTrap: trap },
        });
      });
      panels.splice(at, 1, ...made);
      // The wall's drilling goes with its pieces.
      for (let i = drills.length - 1; i >= 0; i -= 1) {
        const d = drills[i];
        if (d.panel !== bb.id) continue;
        const k = pieces.findIndex(([a0, a1]) => d.y >= len - a1 - EPS && d.y <= len - a0 + EPS);
        if (k < 0) { drills.splice(i, 1); continue; }
        const dy = len - pieces[k][1];
        drills[i] = { ...d, panel: ids[k], y: r4(d.y - dy), ...(d.meta ? { meta: downMeta(d.meta, dy) } : {}) };
      }
    }
    // THE BOTTOM, NOTCHED.
    const dno = panels.find((p) => p.id === `${tag}-DNO`);
    if (dno?.cnc) {
      const notches = us.map((u) => vanityUInBottom(box, u, GB, profile));
      const w = Number(dno.cnc.drawn_w) || Number(dno.w);
      const d = Number(dno.cnc.drawn_h) || Number(dno.h);
      const outline = notchedOutline({
        w, h: d, radius: T.trapRadiusMm,
        notches: notches.map(([a0, a1, depth]) => ({ edge: 'bottom', from: a0, to: a1, depth })),
      }).map(([x, y]) => [r4(x), r4(y)]);
      const inNotch = (x, y) => notches.some(([a0, a1, depth]) => x > a0 + EPS && x < a1 - EPS && y < depth - EPS);
      dno.cnc = {
        ...dno.cnc,
        outline,
        holes: (dno.cnc.holes || []).filter((hl) => !inNotch(hl.x, hl.y)),
      };
      dno.meta = {
        ...(dno.meta || {}),
        vanityTrap: {
          ...trap,
          notches: notches.map((nt) => nt.map(r4)),
          lisp: notches.map((nt) => vanityUOutline(nt)),
        },
      };
      for (let i = drills.length - 1; i >= 0; i -= 1) {
        if (drills[i].panel === dno.id && inNotch(drills[i].x, drills[i].y)) drills.splice(i, 1);
      }
    }
    cuts.push({ tag, us: trap.us, centres: trap.centres, pieces: ids });
  }
  for (const v of verdict) {
    warnings.push({
      code: 'VANITY_TRAP', kind: v.kind, level: 'warn', x: r4(v.x),
      message: v.sentence.replace(/^#39 /, ''),
    });
  }
  return {
    wastes: vanityWastes({ W, columns, sinks }).map(r4),
    wasteFromBackMm: T.wasteFromBackMm,
    // T83 F7 (D28) · the trap's gap the cut took, [from, to], when it took one.
    ...(gap ? { gap: gap.map(r4) } : {}),
    cuts,
    verdict: verdict.map((v) => ({ kind: v.kind, x: r4(v.x), sentence: v.sentence })),
  };
}

// --- (e) PLINTH OR FLOATING (T82 F13) ---------------------------------------
//
// KIT_VANITY.lsp D19, CONFIRMED (12:57 *"plinth do zmiany wysokosc, propozycja
// floating lub on the floor"*; 13:03 *"6 - do BOM tez"*): on the floor, the
// house plinth and legs at the height the unit is given; floating, no legs, no
// plinth, mount "wall", the carcass underside at `float_height_mm`
// (`vanity.defaults.floatHeightMm` 300, PROPOSED), and the BOM buys
// `vanity.hangers.perUnit` hangers (2, PROPOSED), RAIL-TOP being where they
// bite. `types.js floatHeightOf` is the one place a unit is asked whether it
// floats; these four are the LISP's answers to it.

/** How the unit stands (`vanity-mount`). */
export function vanityMount(floating) {
  return floating ? 'wall' : 'floor';
}

/** Does the house plinth run under it (`vanity-plinth-p`)? */
export function vanityPlinthP(floating) {
  return !floating;
}

/** The carcass underside above the floor (`vanity-base-y`). */
export function vanityBaseY(floating, floatH, plinthH) {
  return floating ? Number(floatH) : Number(plinthH);
}

/** How many hangers the BOM buys (`vanity-hangers`). */
export function vanityHangers(floating, profile) {
  return floating ? num(profile?.vanity?.hangers?.perUnit, 2) : 0;
}
