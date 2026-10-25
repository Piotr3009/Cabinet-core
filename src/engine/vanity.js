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
//   5(b)  THE SERVICE VOID. `wall_gap` = the clearance + 80 (`vanityWallGap`),
//         written at birth by `types.js defaultParamsFor`.
//   5(c)  THE EQUAL DRAWERS. `cabinet.js drawerSplitFor` (the kit's
//         `equalDrawers`); the boxes are the parent's.
//   5(d)  THE TRAP. The wastes (`vanityWastes`, THE ONE SOURCE the basin, the
//         plan cut-out and the room read), the U in the top drawer's box (the
//         back wall cut into boards, the bottom notched) and Check #39's
//         sentences (`vanityTrapVerdict`), applied on the cut by
//         `applyVanityTrap` with the drilling, as the canopy's boards are.
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
    wasteFromBackMm: num(v.wasteFromBackMm, 200),     // vanityWasteFromBack, PROPOSED
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
export function vanityRailGeometry({ W, H, G, puzzle }, profile) {
  const w = Number(W);
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
      sockets: { left: sideC, right: sideC, ...(top ? { top: across } : { bottom: across }) },
    });
    for (const s of sideScrews.filter((x) => x.rail === rail)) {
      geom.holes.push({ layer: puzzle.layers.screw, kind: 'screw', x: S, y: s.y, d: puzzle.screwDiameter });
      geom.holes.push({ layer: puzzle.layers.screw, kind: 'screw', x: w - S, y: s.y, d: puzzle.screwDiameter });
    }
    for (const x of [Number(G) + puzzle.screwFromEnd, w / 2, w - Number(G) - puzzle.screwFromEnd]) {
      geom.holes.push({ layer: puzzle.layers.screw, kind: 'screw', x, y: top ? r - S : S, d: puzzle.screwDiameter });
    }
    out[rail] = geom;
  }
  return out;
}

// --- (b) THE SERVICE VOID ---------------------------------------------------

/** The unit's wall_gap, written by the kit's defaults (`vanity-wall-gap`, D6). */
export function vanityWallGap(profile) {
  return Math.max(0, num(profile?.room?.wallBackClearance, 0)) + vanitySpec(profile).serviceVoidMm;
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

/** The U round the trap at xw in box b: { col, from, to, depth, r } (`vanity-trap-u`, D13). */
function vanityTrapU(b, xw, profile) {
  const T = vanitySpec(profile);
  const half = T.trapWidthMm / 2;
  return { col: b.col, from: xw - half, to: xw + half, depth: T.trapDepthMm, r: T.trapRadiusMm };
}

/** Does the U stand inside the box's sides, clear of the U before it (`vanity-u-fits-p`)? */
function vanityUFits(b, u, prev, GB) {
  return u.from >= b.x0 + GB && u.to <= b.x0 + b.bw - GB
    && (!prev || prev.col !== u.col || u.from >= prev.to);
}

/** Every waste's plan: [{ x, box, u, status }], status CUT | DIVIDER | FIT (`vanity-trap-plan`). */
function vanityTrapPlan({ boxes, n, columns, sinks, W, GB }, profile) {
  const out = [];
  let prev = null;
  for (const xw of vanityWastes({ W, columns, sinks })) {
    const b = vanityTopBoxUnder(boxes, n, xw, GB);
    if (!b) { out.push({ x: xw, box: null, u: null, status: 'DIVIDER' }); continue; }
    const u = vanityTrapU(b, xw, profile);
    if (vanityUFits(b, u, prev, GB)) {
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

/** How far the waste stands INSIDE the U's reach; negative, beyond it (`vanity-trap-reach`, D15). */
function vanityTrapReach(b, wasteZ, profile) {
  return b.zBack + vanitySpec(profile).trapDepthMm - wasteZ;
}

/** The trap's bottom line (D16) and the air under it to the box below (`vanity-trap-line`, `vanity-trap-room`). */
const vanityTrapLine = (b, profile) => vanityBoxUnder(b, profile);
const vanityTrapRoom = (top, below, profile) => vanityTrapLine(top, profile) - vanityBoxTop(below);

/**
 * Check #39 (`vanity-trap-verdict`, D15, D16, D17): [{ kind, x, sentence }],
 * empty when the trap has its room. Kinds: DIVIDER, FIT, REACH, SHALLOW; the
 * sentences are the LISP's, to the letter.
 */
export function vanityTrapVerdict({ boxes, n, columns, sinks, W, GB }, profile) {
  const T = vanitySpec(profile);
  const out = [];
  for (const e of vanityTrapPlan({ boxes, n, columns, sinks, W, GB }, profile)) {
    const b = e.box;
    if (e.status === 'DIVIDER') {
      out.push({ kind: 'DIVIDER', x: e.x, sentence: '#39 The trap stands over the divider: no top drawer can take its U' });
    } else if (e.status === 'FIT') {
      out.push({ kind: 'FIT', x: e.x, sentence: '#39 The trap\'s U does not fit the top drawer\'s box' });
    } else {
      const reach = vanityTrapReach(b, T.wasteFromBackMm, profile);
      if (reach < 0) {
        out.push({
          kind: 'REACH',
          x: e.x,
          sentence: `#39 The trap stands ${vanityMm(-reach)} mm beyond the U: the U reaches `
            + `${vanityMm(b.zBack + T.trapDepthMm)} from the carcass back, the waste stands at ${vanityMm(T.wasteFromBackMm)}`,
        });
      }
      if (n > 1) {
        const below = boxes.find((x) => x.col === b.col && x.idx === n - 1);
        if (below) {
          const room = vanityTrapRoom(b, below, profile);
          if (room < T.trapClearMm) {
            out.push({
              kind: 'SHALLOW',
              x: e.x,
              sentence: `#39 Use a shallow trap: the drawer under it stands ${vanityMm(room)} mm under the trap's bottom, `
                + `${vanityMm(T.trapClearMm)} wanted`,
            });
          }
        }
      }
    }
  }
  return out;
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
  panels, drills, warnings, W, GB, n, columns, sinks, profile, mkPanel,
}) {
  const boxes = vanityBoxesOf(panels, { n, columns });
  const args = { boxes, n, columns, sinks, W, GB };
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
      widthMm: T.trapWidthMm, depthMm: T.trapDepthMm, radiusMm: T.trapRadiusMm,
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
