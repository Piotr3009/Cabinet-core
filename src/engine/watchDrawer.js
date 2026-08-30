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
  // T53 (F8b): the pane is IN THE SHELF now, so the shelf carries a through cut
  // as well as the rebate round it. Two operations, two layers — a cut-out and
  // a rebate are different tools and a machine must not guess from a depth.
  opening: 'WATCH_GLASS_OPENING',
});

/** The strip the insert lights with: the app's own flexi, 4 mm. */
export const LED_FLEXI_WIDTH_MM = 4;

/**
 * ─── TURN 53 (CLAUDE.md F8e): THE FOUR LAYOUTS ─────────────────────────────
 *
 * The owner, 27.08.2026: *"i dodajesz do opcji kilka zaproponowanych i
 * zaprojektowanych układów na te zegarki i krawaty i paski — otwiera się nowy
 * modal z 4 propozycjami rozmieszczenia."*
 *
 * ALL FOUR KEEP THE T52 HARD LAW: ONE pocket row, at the FRONT, because the
 * back row cannot be reached once the drawer is in. What varies is the REAR
 * FIELD, and only that — so a layout is a pair of numbers about that field and
 * never a second geometry.
 *
 *   `across`   how many cells across the width. `null` means "by the pocket
 *              rule at this layout's own target", a number means exactly that
 *              many (belts wants TWO channels whatever the drawer measures).
 *   `rows`     how many lanes deep the rear field is divided into.
 *   `backStrip` one more lane at the back edge — the long section a pair of
 *              cufflink grids wants behind it, the accessories tray a pair of
 *              belt channels wants.
 *
 * DECISION TAKEN for the owner (veto or redraw in one line each): the four
 * designs are mine, built strictly inside his categories *"zegarki, krawaty,
 * paski"*. Default is CLASSIC, which is T52's own and is unchanged.
 */
export const WATCH_LAYOUTS = Object.freeze([
  {
    id: 'classic',
    label: 'Classic',
    hint: 'Front pocket row; behind it long sections for ties and straps.',
    across: null,
    targetMm: 220,
    minMm: 60,
    rows: 1,
    backStrip: false,
  },
  {
    id: 'cufflinks',
    label: 'Cufflinks',
    hint: 'Front pocket row; a two-row grid of small cells, and one long section at the back.',
    across: null,
    targetMm: 70,
    minMm: 55,
    rows: 2,
    backStrip: true,
  },
  {
    id: 'ties',
    label: 'Ties',
    hint: 'Front pocket row; narrow long sections for ties laid flat.',
    across: null,
    targetMm: 95,
    minMm: 60,
    rows: 1,
    backStrip: false,
  },
  {
    id: 'belts',
    label: 'Belts',
    hint: 'Front pocket row; two wide channels for rolled belts, and a shallow tray behind.',
    across: 2,
    targetMm: 110,
    minMm: 60,
    rows: 1,
    backStrip: true,
  },
]);

export const DEFAULT_WATCH_LAYOUT = 'classic';

/** The layout this drawer item asks for — CLASSIC where it has never said. */
export function watchLayoutOf(item) {
  const said = String(item?.watch_layout || '').toLowerCase();
  return WATCH_LAYOUTS.find((l) => l.id === said) || WATCH_LAYOUTS[0];
}

/**
 * ─── TURN 53 (CLAUDE.md F8f): THE FINISH ───────────────────────────────────
 *
 * *"i wybierasz finish: spray (jak finish wszystkiego), czy oak, walnut."*
 *
 * SPRAY follows the project's spray finish; OAK and WALNUT map onto the
 * project's wood decor set. The default is the project decor, which is T52's
 * standing rule for the frame and is what `null` means here.
 */
export const WATCH_FINISHES = Object.freeze([
  { id: 'spray', label: 'Spray', hint: 'The project’s own sprayed finish.' },
  { id: 'oak', label: 'Oak', hint: 'The project’s oak decor.' },
  { id: 'walnut', label: 'Walnut', hint: 'The project’s walnut decor.' },
]);

/** The finish this insert wears, or null for the project's own decor. */
export function watchFinishOf(item) {
  const said = String(item?.watch_finish || '').toLowerCase();
  return WATCH_FINISHES.find((f) => f.id === said)?.id || null;
}

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
    // ─── TURN 53 (CLAUDE.md F8b/F8c): THE OWNER'S TWO NEW OFFSETS ──────────
    // *"wycinamy w półce otwór, offset od półki na 50 mm"* and *"dookoła tej
    // szyby masz LED od spodu, offset około 15 mm na LED."*  His numbers, on
    // the profile like every other, so a workshop that wants 60 and 20 changes
    // two lines and nothing in the engine moves.
    openingOffsetMm: num(w.openingOffsetMm, 50),
    ledOffsetMm: num(w.ledOffsetMm, 15),
  };
}

/** Is this drawer item carrying the insert? Decision 3 — a flag, not a type. */
export function watchInsertOn(item) {
  return item?.watch_insert === true;
}

/**
 * ─── T55 (CLAUDE.md F4): WHAT COUNTS AS A SHELF BOARD ──────────────────────
 *
 * The owner: *"z automatycznym dodaniem leda dookoła szyby … na półce która
 * jest wymuszona nad szufladami."*  The pane over a watch drawer is cut in
 * the board DIRECTLY ABOVE it — and the auto board a drawer bank forces is
 * `part: 'PARTITION'` (role `shelf`), a fixed shelf in everything but name.
 * Two askers used to ask `part === 'SHELF'` and both refused it.
 *
 * ONE law, ONE definition, TWO callers: the engine's `shelfAbove` filter
 * (cabinet.js) and the store's `watchShelfAbove` (projectStore.js). A
 * VERTICAL partition (`VPART`) is not a shelf and is not matched.
 */
export function isShelfBoard(p) {
  return p?.part === 'SHELF' || (p?.part === 'PARTITION' && p?.role === 'shelf');
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
export function watchDrawerLayout(clear, profile, { layout = DEFAULT_WATCH_LAYOUT } = {}) {
  const s = watchDrawerSpec(profile);
  const fit = watchDrawerFit(clear, profile);
  if (!fit.ok) return null;
  const variant = WATCH_LAYOUTS.find((l) => l.id === layout) || WATCH_LAYOUTS[0];

  // The tray is inset a hair from the box so it lifts out with a fingernail.
  const trayW = Number(clear.width) - 2 * s.clearanceMm;
  const trayD = Number(clear.depth) - 2 * s.clearanceMm;
  const innerW = trayW - 2 * s.frameT;
  const innerD = trayD - 2 * s.frameT;

  const n = pocketCount(innerW, profile);
  const pw = pocketWidth(innerW, n, s.dividerT);
  const xs = dividerXs(innerW, n, s.dividerT);

  // ONE row, at the FRONT. `pocketRowDepthMm` is the row's own depth, clamped
  // so it can never eat the field behind it: below that a "row of pockets"
  // with nothing behind it is a cutlery tray, not a watch drawer.
  const rowD = Math.min(s.pocketRowDepthMm, innerD - s.dividerT - s.pocketMinMm);
  const fieldD = innerD - rowD - s.dividerT;

  // ─── TURN 53 (CLAUDE.md F8e): THE REAR FIELD, PER LAYOUT ────────────────
  //
  // How many ACROSS is the pocket rule again, at this layout's own target and
  // floor — except where the layout states a count, which BELTS does: two
  // channels is what a rolled belt wants whatever the drawer measures.
  const acrossOf = () => {
    if (Number.isFinite(variant.across)) return Math.max(1, Math.trunc(variant.across));
    let k = Math.round((innerW + s.dividerT) / (variant.targetMm + s.dividerT));
    if (k < 1) k = 1;
    while (k > 1 && pocketWidth(innerW, k, s.dividerT) < variant.minMm) k -= 1;
    return k;
  };
  const across = acrossOf();
  // How many LANES deep — the layout's own rows, plus the back strip when it
  // asks for one. A field too shallow for the lanes it wants gives them up one
  // at a time rather than shipping a lane under the pocket floor.
  let lanes = Math.max(1, Math.trunc(variant.rows)) + (variant.backStrip ? 1 : 0);
  while (lanes > 1
    && (fieldD - (lanes - 1) * s.dividerT) / lanes < s.pocketMinMm) lanes -= 1;
  const laneD = (fieldD - (lanes - 1) * s.dividerT) / lanes;
  const sectionW = pocketWidth(innerW, across, s.dividerT);

  const wallH = s.insideDepthMm;
  return {
    ok: true,
    spec: s,
    layout: variant.id,
    // The tray itself, in the box's interior frame.
    tray: {
      w: trayW, d: trayD, h: s.baseT + wallH, inset: s.clearanceMm,
    },
    inner: { w: innerW, d: innerD },
    // ─── THE POCKETS — the same row in all four layouts ─────────────────────
    pockets: {
      count: n,
      width: pw,
      depth: rowD,
      inside: wallH,
      dividerXs: xs,
    },
    // ─── AND THE REAR FIELD, WHICH IS WHAT THE LAYOUT DECIDES ───────────────
    sections: {
      count: across,
      width: sectionW,
      depth: laneD,
      lanes,
      // The back strip is the LAST lane when the layout asks for one, and it is
      // one long section rather than a divided row.
      backStrip: Boolean(variant.backStrip) && lanes > 1,
      dividerXs: dividerXs(innerW, across, s.dividerT),
      field: fieldD,
    },
    // ─── DECISION 1 AND 2 ARE VETOED BY THE OWNER (F8, the ONE licence) ─────
    //
    // T52 put the pane in the tray's own frame and the LED in the front rail.
    // 27.08: *"opcja: dodać szybę ponad szufladą — wtedy wycinamy w półce
    // otwór … i dookoła tej szyby masz LED od spodu."*  Both move to the SHELF
    // ABOVE (`shelfGlassPlan`, below), so neither is on this tray at all — and
    // the T52 law they carried, THE LED LIGHTS THE WATCHES AND NOT THE GLASS,
    // is not overturned but relocated: the strip fires DOWN onto the watches.
    fit,
  };
}

/**
 * ─── TURN 53 (CLAUDE.md F8a): THE HEIGHT IS FIXED, AND DERIVED ─────────────
 *
 * *"wtedy dokładamy taką szufladę już bez możliwości sterowania wysokością —
 * zawsze stała wysokość."*
 *
 * ONE derived number, stated beside its derivation and never typed:
 *
 *     60  the owner's own inside depth (`insideDepthMm`)
 *   +  9  the tray's base (`baseT`)
 *   +  2  headroom over the tray (`headroomMm`)
 *   ────
 *     71  the CLEAR interior a drawer must have — `watchDrawerFit`'s own
 *         `needsHeight`, read from it rather than restated
 *
 *   + 15  the box's bottom sits that far up its sides
 *         (`baseDrawerUnit.runnerPocketWidth`)
 *   + 18  …and is that thick (`board.thickness`)
 *   + 36  the drawer BOX's own front-to-side delta (`frontToSideDelta`) — the
 *         invariant the wardrobe's stack has been built on since turn 2
 *   ────
 *    140  the FRONT height a watch drawer is always cut at
 *
 * Every term is a profile number, so a workshop that changes its inside depth
 * or its runner gets a new fixed height and nobody has to remember to change a
 * literal. The answer is CHECKED against the engine in `test/turn53-f8-*`: a
 * drawer built at this height really does take the insert and one a millimetre
 * under it does not, which is what makes it a derivation rather than a guess.
 */
export function watchDrawerFixedHeight(profile) {
  const s = watchDrawerSpec(profile);
  const delta = Number(profile?.wardrobe?.drawers?.frontToSideDelta) || 36;
  const bottomT = Number(profile?.board?.thickness) || 18;
  const seat = Number(profile?.baseDrawerUnit?.runnerPocketWidth) || 0;
  return Math.round(insertHeight(profile) + s.headroomMm + seat + bottomT + delta);
}

/**
 * ─── TURN 53 (CLAUDE.md F8b/F8c): THE GLASS, AND THE LED, IN THE SHELF ─────
 *
 * *"wtedy wycinamy w półce otwór, offset od półki na 50 mm, i wstawiamy szybę
 * w ten otwór. i dookoła tej szyby masz LED od spodu, offset około 15 mm na
 * LED."*
 *
 * In the SHELF's own board frame: an opening inset `openingOffsetMm` (50) from
 * all four edges, a rebate one glass thickness deep round it, and the LED ring
 * `ledOffsetMm` (15) OUTSIDE the opening on the shelf's UNDERSIDE.
 *
 * DECISION TAKEN (veto in one line): the pane sits FLUSH WITH THE SHELF TOP —
 * a proud pane on a wardrobe shelf catches every sleeve — so the rebate depth
 * IS the glass thickness.
 *
 * @param {{w:number, d:number}} shelf  the shelf board's own width and depth
 * @returns {object|null} null where the shelf is too small to take an opening
 */
export function shelfGlassPlan(shelf, profile) {
  const s = watchDrawerSpec(profile);
  const w = Math.max(0, Number(shelf?.w) || 0);
  const d = Math.max(0, Number(shelf?.d) || 0);
  const off = s.openingOffsetMm;
  const led = s.ledOffsetMm;
  const openW = w - 2 * off;
  const openD = d - 2 * off;
  // The ring has to stand ON the shelf, not off its edge, or the strip is
  // fixed to air. A shelf that cannot hold both is refused and the caller
  // reports it, which is the house way.
  if (!(openW > 0) || !(openD > 0)) return null;
  if (!(off - led > 0)) return null;
  return {
    opening: {
      x1: off, y1: off, x2: off + openW, y2: off + openD, w: openW, d: openD,
    },
    // Flush: the pane drops into a rebate exactly its own thickness deep.
    rebate: {
      x1: off - s.glassT,
      y1: off - s.glassT,
      x2: off + openW + s.glassT,
      y2: off + openD + s.glassT,
      depth: s.glassT,
      flush: true,
    },
    glass: {
      w: openW + 2 * s.glassT, d: openD + 2 * s.glassT, t: s.glassT, flush: true,
    },
    led: {
      x1: off - led, y1: off - led, x2: off + openW + led, y2: off + openD + led,
      width: LED_FLEXI_WIDTH_MM,
      face: 'underside',
      aimedAt: 'contents',
      // The ring's own run, for the BOM's metres.
      lengthMm: 2 * ((openW + 2 * led) + (openD + 2 * led)),
    },
    offsets: { opening: off, led },
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

// ─── THE ONE SANCTITY LICENCE OF THE NIGHT (turn 53, CLAUDE.md F8) ─────────
//
// T52's `rebate()` — the glass rebate along the top of all four rails — and
// `ledPath()` — the LED groove in the inner face of the front rail — ARE GONE,
// and this note is the account CLAUDE.md's iron rule 4 asks for.
//
// The licence is the owner's own re-specification, 27.08.2026: *"opcja: dodać
// szybę ponad szufladą — wtedy wycinamy w półce otwór, offset od półki na
// 50 mm, i wstawiamy szybę w ten otwór. i dookoła tej szyby masz LED od spodu,
// offset około 15 mm na LED."*  The pane and the strip are not on the tray any
// more; they are on the SHELF ABOVE it (`shelfGlassPlan`). A rebate cut for a
// pane that is not there, and a groove for a strip that is not there, are two
// operations the machine would perform on every rail for nothing.
//
// WHAT IS NOT OVERTURNED is T52's law about the light — THE LED LIGHTS THE
// WATCHES, NOT THE GLASS — which is why the ring fires DOWN from the shelf's
// underside. Relocated, not repealed.
//
// Nothing else in this file is removed. The slot, the frame, the row rail and
// the dividers are T52's, to the millimetre.

/**
 * Every piece of one insert, in the DRAWER BOX's own frame.
 *
 * @param {object} interior   `drawerBoxInterior()`'s answer — clear sizes AND
 *                            the corner they are measured from
 * @param {object} profile
 * @param {object} opts       { drawer } — the index the parts are keyed on
 * @returns {{parts:Array, glass:object, layout:object}|null}
 */
export function watchInsertParts(interior, profile, { drawer = 1, layout = DEFAULT_WATCH_LAYOUT } = {}) {
  const L = watchDrawerLayout(interior, profile, { layout });
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
  // T53 (F8): the pocket housings alone. The glass rebate is gone with the
  // glass — see the licence above.
  front.pockets = L.pockets.dividerXs.map(
    (x) => slot(s.frameT + x, s.dividerT, wallH, s.slotDepthMm, 'A'),
  );
  push('WRF', 'WATCH-RAIL-FRONT',
    { x: x0, y: yWall, z: rowFrontZ, w: trayW, h: wallH, d: s.frameT },
    front, { rail: 'front' });

  const back = board(trayW, wallH, s.frameT);
  back.pockets = L.sections.dividerXs.map(
    (x) => slot(s.frameT + x, s.dividerT, wallH, s.slotDepthMm, 'A'),
  );
  push('WRB', 'WATCH-RAIL-BACK',
    { x: x0, y: yWall, z: z0, w: trayW, h: wallH, d: s.frameT },
    back, { rail: 'back' });

  for (const [tag, x] of [['WRL', x0], ['WRR', x0 + trayW - s.frameT]]) {
    const side = board(railLen, wallH, s.frameT);
    push(tag, 'WATCH-RAIL-SIDE',
      { x, y: yWall, z: z0 + s.frameT, w: s.frameT, h: wallH, d: railLen },
      side, { rail: tag === 'WRL' ? 'left' : 'right' });
  }

  // ─── THE RAIL BETWEEN THE ROW AND THE REAR FIELD ───────────────────────
  //
  // ONE row of pockets, at the front (*"the back row cannot be reached once the
  // drawer is in"*). This is the rail that says so, and it is housed on BOTH
  // faces: pockets in front of it, the layout's own field behind.
  const row = board(innerW, wallH, s.dividerT);
  row.pockets = [
    ...L.pockets.dividerXs.map((x) => slot(x, s.dividerT, wallH, s.slotDepthMm, 'A')),
    ...L.sections.dividerXs.map((x) => slot(x, s.dividerT, wallH, s.slotDepthMm, 'B')),
  ];
  push('WRW', 'WATCH-RAIL-ROW',
    { x: x0 + s.frameT, y: yWall, z: rowRailZ, w: innerW, h: wallH, d: s.dividerT },
    row, { rail: 'row' });

  // ─── THE POCKET DIVIDERS ───────────────────────────────────────────────
  L.pockets.dividerXs.forEach((x, i) => {
    push(`WP${i + 1}`, 'WATCH-DIVIDER',
      {
        x: x0 + s.frameT + x, y: yWall, z: rowBackZ, w: s.dividerT, h: wallH, d: L.pockets.depth,
      },
      board(L.pockets.depth, wallH, s.dividerT), { divider: 'pocket', index: i + 1 });
  });

  // ─── AND THE REAR FIELD, LANE BY LANE (T53 · F8e) ──────────────────────
  //
  // The layout decides two things and only two: how many cells ACROSS, and how
  // many LANES deep. Everything below is those two numbers laid out — the lane
  // rails between the lanes, and each lane's own dividers. A BACK STRIP is the
  // last lane taken whole: one long section rather than a divided row, which is
  // what a cufflink grid wants behind it and what a pair of belt channels wants.
  const laneD = L.sections.depth;
  for (let lane = 0; lane < L.sections.lanes; lane += 1) {
    const laneBackZ = sectionsBackZ + lane * (laneD + s.dividerT);
    const isBackStrip = L.sections.backStrip && lane === L.sections.lanes - 1;
    // The rail BEHIND this lane, where there is another lane behind it.
    if (lane > 0) {
      push(`WL${lane}`, 'WATCH-RAIL-LANE',
        {
          x: x0 + s.frameT,
          y: yWall,
          z: laneBackZ - s.dividerT,
          w: innerW,
          h: wallH,
          d: s.dividerT,
        },
        board(innerW, wallH, s.dividerT), { rail: 'lane', index: lane });
    }
    if (isBackStrip) continue;      // one long section: no dividers in it
    L.sections.dividerXs.forEach((x, i) => {
      push(`WS${lane + 1}-${i + 1}`, 'WATCH-DIVIDER',
        {
          x: x0 + s.frameT + x, y: yWall, z: laneBackZ, w: s.dividerT, h: wallH, d: laneD,
        },
        board(laneD, wallH, s.dividerT), { divider: 'section', lane: lane + 1, index: i + 1 });
    });
  }

  // ─── AND THE PANE IS NOT HERE ANY MORE ─────────────────────────────────
  //
  // T52 returned a `glass` box on the tray. The owner moved it upstairs, so the
  // pane belongs to the SHELF (`shelfGlassPlan`) and this answer is the tray
  // alone. `glass: null` rather than a missing key, so a reader that asked for
  // it gets an answer instead of `undefined`.
  return { parts: P, glass: null, layout: L };
}
