// ─── TURN 52 (CLAUDE.md F5): THE WATCH DRAWER ──────────────────────────────
//
// The owner, 26.08.2026:
//
//   *"szuflada z przegródkami na zegarki, krawaty etc … szkło i podświetlenie
//   … rama z Eggera ale podświetlone zegarki … oczywiście szuflada nasza
//   standardowa, tylko przegródki z 9 mm zrób, i szuflada płytka w środku,
//   myślę że około 60 mm."*
//
// *"szuflada nasza standardowa, tylko przegródki"* — so this is an INSERT and
// not a new drawer type. It drops into a standard drawer box and THE BOX IS
// UNTOUCHED: same sides, same box front and back, same bottom, same runners,
// same holes. Nothing in this module reaches a drawer's own geometry.
//
// ─── LISP IS LAW, FIRST (iron rule 3) ───────────────────────────────────────
//
// Every rule below is born in `reference/lisp/KIT_WATCH_DRAWER.lsp` —
// `SKY:watchPocketCount`, `SKY:watchPocketWidth`, `SKY:watchDividerXs`,
// `SKY:watchDrawerTooShallow` — and this is the application following it.
// `test/turn52-f5-the-watch-drawer.test.js` parses that file off disk and holds
// the two to each other, exactly as T48 does for the LED groove.
//
// ─── THE THREE DECISIONS TAKEN FOR THE OWNER ────────────────────────────────
//
// He was asked and left. CLAUDE.md writes them at the top of F5 for him to veto
// in one line, and they are law here until he does:
//
//   1. THE GLASS LIFTS OUT. A fixed pane looks better and makes a watch
//      unreachable without opening the whole drawer; a lift-out pane is what a
//      joiner would fit. So it sits in a REBATE in the top of the frame and
//      nothing holds it down.
//   2. THE LED LIGHTS THE WATCHES, not the glass. Lighting the pane makes a
//      shop display; lighting the contents makes a wardrobe. The groove is in
//      the INNER face of the front rail, BELOW the glass, firing back across
//      the pockets.
//   3. THE INSERT IS ITS OWN BOM LINE, addable to any drawer — not a drawer
//      type. `watchInsertOn(item)` is a flag ON a drawer item and is orthogonal
//      to `variant`, so a customer can have it in one drawer of six.
//
// ─── ONE ROW OF POCKETS, AT THE FRONT ───────────────────────────────────────
//
// *"Three rows of pockets is a known mistake: the back row cannot be reached
// once the drawer is in."*  So the tray is divided ONCE across its depth and
// the pockets are the strip in front of that rail; behind it are LONG sections,
// which is what a tie or a strap actually wants.
//
// Pure functions — no React, no store, no three.js.

import { GROOVE_END_EXTRA_MM, LED_GROOVE_LAYER } from '../lib/ledGroove.js';

/** The two layers this insert cuts — `watchMakeLayers` in the kit. */
export const WATCH_LAYERS = Object.freeze({
  slot: 'WATCH_DIVIDER_SLOT',
  rebate: 'WATCH_GLASS_REBATE',
});

/** The strip the insert lights with: the app's own flexi, 4 mm. */
export const LED_FLEXI_WIDTH_MM = 4;

/** The watch-drawer block of a profile, with every field present. */
export function watchDrawerSpec(profile) {
  const w = profile?.watchDrawer || {};
  const num = (v, fallback) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : fallback);
  return {
    dividerT: num(w.dividerT, 9),
    frameT: num(w.frameT, 9),
    baseT: num(w.baseT, 9),
    insideDepthMm: num(w.insideDepthMm, 60),
    pocketTargetMm: num(w.pocketTargetMm, 95),
    pocketMinMm: num(w.pocketMinMm, 60),
    pocketRowDepthMm: num(w.pocketRowDepthMm, 110),
    sectionTargetMm: num(w.sectionTargetMm, 220),
    glassT: num(w.glassT, 4),
    glassBearingMm: num(w.glassBearingMm, 5),
    slotDepthMm: num(w.slotDepthMm, 3),
    ledBelowGlassMm: num(w.ledBelowGlassMm, 12),
    headroomMm: num(w.headroomMm, 2),
    clearanceMm: num(w.clearanceMm, 2),
  };
}

/** Is this drawer item carrying the insert? Decision 3 — a flag, not a type. */
export function watchInsertOn(item) {
  return item?.watch_insert === true;
}

/**
 * The drawer ITEM one drawer index belongs to, on a unit.
 *
 * The properties panel is handed a PANEL and knows the drawer by its index;
 * the flag lives on the ITEM. One resolution, here, so the surface and the
 * store cannot disagree about which drawer was clicked. Column drawers are
 * matched on their zone too, because index 1 exists in every column.
 */
export function drawerItemOf(unit, index, zone = null) {
  const items = unit?.params?.sections?.[0]?.items || [];
  const zoneOf = (i) => (i?.zone == null || !Number.isFinite(Number(i.zone)) ? null : Math.trunc(Number(i.zone)));
  return items.find((i) => i?.kind === 'drawer'
    && Number(i.index) === Number(index)
    && zoneOf(i) === zone) || null;
}

/**
 * How wide one pocket is, at `n` of them across `innerW`.
 *
 * `n` pockets take `n − 1` dividers between them — the frame's own two rails
 * are the outer walls and are not dividers. `SKY:watchPocketWidth`.
 */
export function pocketWidth(innerW, n, dividerT) {
  return n > 0 ? (innerW - (n - 1) * dividerT) / n : 0;
}

/**
 * How many pockets across a clear width — `SKY:watchPocketCount`.
 *
 * The count that lands NEAREST the target, then giving way DOWNWARDS until the
 * pocket clears the floor. Downwards is the whole of it: a watch case is
 * 30–48 mm across, so a pocket under `pocketMinMm` will not take one and fewer,
 * bigger pockets is the only direction the rule may move in.
 *
 * *"the count follows the width, never a fixed five."*
 */
export function pocketCount(innerW, profile) {
  const s = watchDrawerSpec(profile);
  if (!(innerW > 0)) return 0;
  let n = Math.round((innerW + s.dividerT) / (s.pocketTargetMm + s.dividerT));
  if (n < 1) n = 1;
  while (n > 1 && pocketWidth(innerW, n, s.dividerT) < s.pocketMinMm) n -= 1;
  // A tray too narrow even for ONE pocket at the floor takes no insert at all;
  // `watchDrawerFit` below is what says so, in words.
  return n;
}

/**
 * Where each DIVIDER's near face is, from the inside of the left rail.
 * `SKY:watchDividerXs` — `n − 1` of them, evenly spaced by construction.
 */
export function dividerXs(innerW, n, dividerT) {
  const w = pocketWidth(innerW, n, dividerT);
  const out = [];
  for (let i = 1; i < n; i += 1) out.push(i * w + (i - 1) * dividerT);
  return out;
}

/**
 * How tall the tray stands: its base plus the owner's inside depth.
 * `SKY:watchInsertHeight`.
 */
export function insertHeight(profile) {
  const s = watchDrawerSpec(profile);
  return s.baseT + s.insideDepthMm;
}

/**
 * Will this insert go into this drawer, and if not, why not?
 *
 * CLAUDE.md: *"Report in Check when a drawer is too shallow to take the insert
 * rather than shipping a squashed one."*  Two ways it can refuse and they are
 * different in kind — too SHALLOW (the owner's own case) and too NARROW (a
 * tray that could not hold one pocket at the floor width).
 *
 * @param {{width:number, depth:number, height:number}} clear  the drawer box's
 *   own interior, in mm
 * @returns {{ok:boolean, reason:string|null, needsHeight:number}}
 */
export function watchDrawerFit(clear, profile) {
  const s = watchDrawerSpec(profile);
  const needsHeight = insertHeight(profile) + s.headroomMm;
  const innerW = Number(clear?.width) - 2 * s.frameT - 2 * s.clearanceMm;
  const innerD = Number(clear?.depth) - 2 * s.frameT - 2 * s.clearanceMm;
  if (!(Number(clear?.height) >= needsHeight)) {
    return { ok: false, reason: 'too-shallow', needsHeight };
  }
  if (!(innerW >= s.pocketMinMm)) return { ok: false, reason: 'too-narrow', needsHeight };
  // The pocket row and one long section behind it: below that there is no room
  // for the row the whole insert exists for.
  if (!(innerD >= s.pocketRowDepthMm + s.dividerT + s.pocketMinMm)) {
    return { ok: false, reason: 'too-short', needsHeight };
  }
  return { ok: true, reason: null, needsHeight };
}

/**
 * The whole insert, worked out for one drawer box interior.
 *
 * Everything is in the DRAWER BOX's own interior frame: x across the drawer
 * from the inside of its left side, z front-to-back from the inside of its BOX
 * BACK, y up from the top of its bottom board. The caller adds its own origin
 * and nothing here has to know where in the room the cabinet is.
 *
 * @param {{width:number, depth:number, height:number}} clear
 * @returns {object|null} null where it does not fit — `watchDrawerFit` says why
 */
export function watchDrawerLayout(clear, profile) {
  const s = watchDrawerSpec(profile);
  const fit = watchDrawerFit(clear, profile);
  if (!fit.ok) return null;

  // The tray is inset a hair from the box so it lifts out with a fingernail —
  // the same courtesy decision 1 asks of the glass.
  const trayW = Number(clear.width) - 2 * s.clearanceMm;
  const trayD = Number(clear.depth) - 2 * s.clearanceMm;
  const innerW = trayW - 2 * s.frameT;
  const innerD = trayD - 2 * s.frameT;

  const n = pocketCount(innerW, profile);
  const pw = pocketWidth(innerW, n, s.dividerT);
  const xs = dividerXs(innerW, n, s.dividerT);

  // ONE row, at the FRONT. `pocketRowDepthMm` is the row's own depth, clamped
  // so it can never eat the sections behind it: below that a "row of pockets"
  // with nothing behind it is a cutlery tray, not a watch drawer.
  const rowD = Math.min(s.pocketRowDepthMm, innerD - s.dividerT - s.pocketMinMm);
  const sectionD = innerD - rowD - s.dividerT;
  // Behind the row: LONG sections. As few as will keep each one near the
  // target, because a tie wants length and a strap wants width — never the
  // pocket rule again.
  let sections = Math.round((innerW + s.dividerT) / (s.sectionTargetMm + s.dividerT));
  if (sections < 1) sections = 1;
  while (sections > 1 && pocketWidth(innerW, sections, s.dividerT) < s.pocketMinMm) sections -= 1;
  const sectionW = pocketWidth(innerW, sections, s.dividerT);

  const wallH = s.insideDepthMm;
  return {
    ok: true,
    spec: s,
    // The tray itself, in the box's interior frame.
    tray: {
      w: trayW, d: trayD, h: s.baseT + wallH, inset: s.clearanceMm,
    },
    inner: { w: innerW, d: innerD },
    // ─── THE POCKETS ────────────────────────────────────────────────────────
    pockets: {
      count: n,
      width: pw,
      depth: rowD,
      // …and how deep they are DOWNWARDS, which is the owner's own 60.
      inside: wallH,
      // The divider between the row and the sections behind it: one rail, at
      // `rowD` from the tray's inside front.
      dividerXs: xs,
    },
    // ─── AND THE LONG SECTIONS BEHIND THEM ──────────────────────────────────
    sections: {
      count: sections,
      width: sectionW,
      depth: sectionD,
      dividerXs: dividerXs(innerW, sections, s.dividerT),
    },
    // ─── DECISION 1: THE GLASS LIFTS OUT ────────────────────────────────────
    //
    // It bears on a rebate cut in the top of all four rails, so its pane is the
    // inner opening PLUS the two bearings on each axis. Nothing holds it down.
    glass: {
      w: innerW + 2 * s.glassBearingMm,
      d: innerD + 2 * s.glassBearingMm,
      t: s.glassT,
      bearing: s.glassBearingMm,
      liftsOut: true,
      // Where its underside sits: the tray's own top, less the rebate.
      atY: s.baseT + wallH - s.glassT,
    },
    // ─── DECISION 2: THE LED LIGHTS THE WATCHES ─────────────────────────────
    //
    // In the INNER face of the FRONT rail, `ledBelowGlassMm` under the glass,
    // firing back and down across the pockets. A groove in the rail's TOP face
    // would light the pane, which is a shop display.
    led: {
      // The line, in the front rail's own board frame — the two ends of the
      // PROFILE, which is what `drawLedGroove` takes. T48's +10 each end is the
      // GROOVE's law and is applied there, never restated here.
      length: trayW,
      atY: s.baseT + wallH - s.glassT - s.ledBelowGlassMm,
      // …and the same line in the FRONT RAIL's own board frame, which is what
      // the groove is actually cut in.
      railY: wallH - s.glassT - s.ledBelowGlassMm,
      width: LED_FLEXI_WIDTH_MM,
      aimedAt: 'contents',
    },
    fit,
  };
}

/**
 * The clear interior of one drawer's box, read off the panels the engine
 * already publishes.
 *
 * No second derivation: the sides, the box front and back and the bottom are
 * where they are, and this measures between them. A drawer with an incomplete
 * set of boards (a READY-MADE box, whose parts are not cut) answers null.
 *
 * @param {Array} panels  a computeCabinet result's panels
 * @param {number} index  the drawer's own index, as `meta.drawer` carries it
 */
export function drawerBoxInterior(panels, index) {
  const mine = (panels || []).filter((p) => p.box && Number(p.meta?.drawer) === Number(index)
    && p.role === 'drawer_box');
  const sides = mine.filter((p) => p.part === 'DRAWER-SIDE').sort((a, b) => a.box.x - b.box.x);
  const front = mine.find((p) => p.part === 'DRAWER-BOX-FRONT');
  const back = mine.find((p) => p.part === 'DRAWER-BOX-BACK');
  const bottom = mine.find((p) => p.part === 'DRAWER-BOTTOM');
  if (sides.length < 2 || !front || !back || !bottom) return null;
  const [l, r] = [sides[0], sides[sides.length - 1]];
  const floorY = bottom.box.y + bottom.box.h;
  return {
    width: r.box.x - (l.box.x + l.box.w),
    depth: front.box.z - (back.box.z + back.box.d),
    height: (l.box.y + l.box.h) - floorY,
    at: { x: l.box.x + l.box.w, y: floorY, z: back.box.z + back.box.d },
  };
}


// ─── THE PARTS, AND WHAT IS CUT IN THEM ────────────────────────────────────
//
// CLAUDE.md: *"CNC: the divider slots, the frame, the rebate for the glass and
// the LED groove."*  All four are here and every one of them is cut in a piece
// that did not exist before this turn — no drawer board is touched.
//
// The frame takes the project's CARCASS material like every other board
// (`role: 'watch_insert'` resolves to `material_role: 'board'`), which is
// *"rama z Eggera … it is not special-cased"* said as code rather than as a
// branch.
//
// A rail's own 2D board frame is LENGTH × HEIGHT with the thickness into the
// bed, exactly as a drawer side's is. `face` on a pocket says which side of the
// board it is cut in: the row rail is housed on BOTH faces — pockets in front
// of it, sections behind — and a router cuts one face at a time.

const rect = (w, h) => ({
  outline: [[0, 0], [w, 0], [w, h], [0, h]], pockets: [], holes: [], layer: 'OUTLINE',
});

/** A divider housing: full height of the rail, `t` across, `depth` in. */
const slot = (x, t, h, depth, face) => ({
  layer: WATCH_LAYERS.slot, depth, face, x1: x, y1: 0, x2: x + t, y2: h,
});

/**
 * The glass rebate along the TOP edge of a rail — decision 1.
 *
 * `glassT` tall from the top edge, `bearing` deep into the board's thickness.
 * On a 9 mm rail with a 5 mm bearing that leaves a 4 mm lip standing proud of
 * the pane all round, which is what makes it lift out with a fingernail
 * instead of needing a bead.
 */
const rebate = (len, h, s) => ({
  layer: WATCH_LAYERS.rebate,
  depth: s.glassBearingMm,
  face: 'A',
  x1: 0,
  y1: h - s.glassT,
  x2: len,
  y2: h,
});

/**
 * The LED groove in the front rail — decision 2.
 *
 * The GROOVE's own law is `reference/lisp/KIT_LED_GROOVE.lsp` and the app's
 * `lib/ledGroove.js`: 4 mm wide, CENTRED on the line, and running
 * `GROOVE_END_EXTRA_MM` (T48's 10) PAST the profile at each end so a round bit
 * leaves no corner for a chisel. Not one number of it is restated here — this
 * says only WHERE the line runs, which is decision 2's business.
 */
const ledPath = (len, y) => {
  const half = LED_FLEXI_WIDTH_MM / 2;
  const e = GROOVE_END_EXTRA_MM;
  return {
    layer: LED_GROOVE_LAYER.name,
    closed: true,
    pts: [
      [-e, y - half], [len + e, y - half], [len + e, y + half], [-e, y + half],
    ],
  };
};

/**
 * Every piece of one insert, in the DRAWER BOX's own frame.
 *
 * @param {object} interior   `drawerBoxInterior()`'s answer — clear sizes AND
 *                            the corner they are measured from
 * @param {object} profile
 * @param {object} opts       { drawer } — the index the parts are keyed on
 * @returns {{parts:Array, glass:object, layout:object}|null}
 */
export function watchInsertParts(interior, profile, { drawer = 1 } = {}) {
  const L = watchDrawerLayout(interior, profile);
  if (!L) return null;
  const s = L.spec;
  const at = interior.at || { x: 0, y: 0, z: 0 };
  const x0 = at.x + s.clearanceMm;
  const z0 = at.z + s.clearanceMm;
  const y0 = at.y;
  const yWall = y0 + s.baseT;
  const wallH = L.pockets.inside;
  const trayW = L.tray.w;
  const trayD = L.tray.d;
  const innerW = L.inner.w;
  const innerD = L.inner.d;
  const railLen = trayD - 2 * s.frameT;         // the side rails, between the ends
  // The pocket row is at the FRONT, which is the FAR end of z.
  const rowFrontZ = z0 + s.frameT + innerD;
  const rowBackZ = rowFrontZ - L.pockets.depth;
  const rowRailZ = rowBackZ - s.dividerT;
  const sectionsBackZ = z0 + s.frameT;

  const P = [];
  const push = (id, part, box, cnc, meta = {}) => P.push({
    id: `D${drawer}-${id}`,
    part,
    role: 'watch_insert',
    w: cnc.__w,
    h: cnc.__h,
    thickness: cnc.__t,
    box,
    cnc: { outline: cnc.outline, pockets: cnc.pockets, holes: cnc.holes, layer: cnc.layer, ...(cnc.paths ? { paths: cnc.paths } : {}) },
    meta: { drawer, ...meta },
  });
  const board = (w, h, t) => {
    const g = rect(w, h);
    g.__w = w; g.__h = h; g.__t = t;
    return g;
  };

  // ─── THE BASE ──────────────────────────────────────────────────────────
  push('WB', 'WATCH-BASE',
    { x: x0, y: y0, z: z0, w: trayW, h: s.baseT, d: trayD },
    board(trayW, trayD, s.baseT));

  // ─── THE FRAME: FOUR RAILS ─────────────────────────────────────────────
  //
  // The FRONT rail carries the pocket dividers' housings, the glass rebate and
  // the LED groove; the back and the two sides carry the rebate alone.
  const front = board(trayW, wallH, s.frameT);
  front.pockets = [
    ...L.pockets.dividerXs.map((x) => slot(s.frameT + x, s.dividerT, wallH, s.slotDepthMm, 'A')),
    rebate(trayW, wallH, s),
  ];
  front.paths = [ledPath(trayW, L.led.railY)];
  push('WRF', 'WATCH-RAIL-FRONT',
    { x: x0, y: yWall, z: rowFrontZ, w: trayW, h: wallH, d: s.frameT },
    front, { rail: 'front', led: true });

  const back = board(trayW, wallH, s.frameT);
  back.pockets = [
    ...L.sections.dividerXs.map((x) => slot(s.frameT + x, s.dividerT, wallH, s.slotDepthMm, 'A')),
    rebate(trayW, wallH, s),
  ];
  push('WRB', 'WATCH-RAIL-BACK',
    { x: x0, y: yWall, z: z0, w: trayW, h: wallH, d: s.frameT },
    back, { rail: 'back' });

  for (const [tag, x] of [['WRL', x0], ['WRR', x0 + trayW - s.frameT]]) {
    const side = board(railLen, wallH, s.frameT);
    side.pockets = [rebate(railLen, wallH, s)];
    push(tag, 'WATCH-RAIL-SIDE',
      { x, y: yWall, z: z0 + s.frameT, w: s.frameT, h: wallH, d: railLen },
      side, { rail: tag === 'WRL' ? 'left' : 'right' });
  }

  // ─── THE RAIL BETWEEN THE ROW AND THE SECTIONS ─────────────────────────
  //
  // ONE row of pockets, at the front (*"the back row cannot be reached once the
  // drawer is in"*). This is the rail that says so, and it is housed on BOTH
  // faces: pockets in front of it, long sections behind.
  const row = board(innerW, wallH, s.dividerT);
  row.pockets = [
    ...L.pockets.dividerXs.map((x) => slot(x, s.dividerT, wallH, s.slotDepthMm, 'A')),
    ...L.sections.dividerXs.map((x) => slot(x, s.dividerT, wallH, s.slotDepthMm, 'B')),
  ];
  push('WRW', 'WATCH-RAIL-ROW',
    { x: x0 + s.frameT, y: yWall, z: rowRailZ, w: innerW, h: wallH, d: s.dividerT },
    row, { rail: 'row' });

  // ─── THE DIVIDERS ──────────────────────────────────────────────────────
  L.pockets.dividerXs.forEach((x, i) => {
    push(`WP${i + 1}`, 'WATCH-DIVIDER',
      {
        x: x0 + s.frameT + x, y: yWall, z: rowBackZ, w: s.dividerT, h: wallH, d: L.pockets.depth,
      },
      board(L.pockets.depth, wallH, s.dividerT), { divider: 'pocket', index: i + 1 });
  });
  L.sections.dividerXs.forEach((x, i) => {
    push(`WS${i + 1}`, 'WATCH-DIVIDER',
      {
        x: x0 + s.frameT + x, y: yWall, z: sectionsBackZ, w: s.dividerT, h: wallH, d: L.sections.depth,
      },
      board(L.sections.depth, wallH, s.dividerT), { divider: 'section', index: i + 1 });
  });

  // ─── AND THE PANE, WHICH IS ORDERED AND NEVER CUT ──────────────────────
  const glass = {
    drawer,
    box: {
      x: x0 + s.frameT - s.glassBearingMm,
      y: yWall + wallH - s.glassT,
      z: z0 + s.frameT - s.glassBearingMm,
      w: L.glass.w,
      h: s.glassT,
      d: L.glass.d,
    },
    liftsOut: true,
  };

  return { parts: P, glass, layout: L };
}
