// ─── THE WHOLE DRAWER SLIDES (turn 20, CLAUDE.md F3) ────────────────────────
//
// Owner: today the front glides out and the box stays in the carcass.
//
// He is right, and it was a gap in what "a front" means to the view rather than
// a bug in the animation. `3d/UnitView.jsx` animates a piece whose `frontKind`
// is `drawer`, and a drawer box's sides, back and bottom are not fronts — they
// are a MECHANISM, and nothing had ever told the view which mechanism belongs
// to which face.
//
// This says it, once, as arithmetic over the engine's own panels:
//
//   • WHICH PARTS travel together — a drawer's front, its two sides, its box
//     front and back, its bottom, and the runners under it, all keyed on the
//     `meta.drawer` index the engine has stamped on every one of them since
//     turn 12;
//   • HOW FAR — the drawer's own NOMINAL LENGTH, which is the box's own depth,
//     because a MOVENTO is full-extension and the box comes out its own length.
//     Not a fraction of the cabinet: turn 3's `depth × 0.75` was a guess made
//     before the app knew what runner a drawer was on.
//
// ONE VALUE DRIVES ONE DRAWER (F3.3). The open amount is the FRONT's, exactly
// as it was — double-clicking a drawer face is older than any of this — and
// every other part of that drawer reads the same number, so the box cannot get
// out of step with the face screwed to it.
//
// Pure functions — no React, no three.js, no store (engine rule).
//
// ─── T83 F9 · ONE DRAWER IS ITS NUMBER AND ITS COLUMN ───────────────────────
//
// The owner, 25.10.2026, 22:41, of a vanity at two columns: *"jak wpieram 2
// rows to otwieraja mi sie 2 szuflady ale jedna sie otwiera carcas tylko a
// druga front tylko zamiast 2 carcasy i 2 fronty, sprawdz"*.
//
// The probe (verify/t83/f09-probe.md) found the cut right and this reader
// wrong. The column stack (KIT_VANITY.lsp 5(c2), the vanity and the chest)
// stamps `{ drawer, column }` on every box part AND on its front; a wardrobe's
// bay drawer stamps `{ drawer, zone }` on both. Every map below keyed on
// `meta.drawer` alone, so one front's open amount reached the box of that
// number in EVERY column (and in every bay): the left front came out with both
// boxes, the right column showed a box out behind a shut front. The pairing
// now reads the drawer AND the column it stands in (`column` on the column
// stack, `zone` on a wardrobe's bay): the very pair the engine already cut.
// A drawer with neither keeps its bare number, so every unit with one stack
// pairs, travels and opens exactly as it did.

/**
 * T83 F9 · the key a drawer's parts are paired on: its number where it stands
 * alone, its number and its column (or its bay) where the stack has two.
 *
 * @param {object} meta  a panel's meta, or a hardware instance's own record
 * @returns {number|string|null}
 */
export function drawerKey(meta) {
  const n = Number(meta?.drawer);
  if (!(n > 0)) return null;
  if (meta?.column != null) return `${n}|column ${meta.column}`;
  if (meta?.zone != null) return `${n}|zone ${meta.zone}`;
  return n;
}

/** Which drawer a panel belongs to, or null where it is not part of one. */
export function drawerOf(panel) {
  const n = Number(panel?.meta?.drawer);
  if (!(n > 0)) return null;
  if (panel.part === 'DRAWER-FRONT') return n;
  // T52 (CLAUDE.md F5): the WATCH INSERT rides its drawer too. It is a tray
  // sitting in the box — pull the drawer and it comes out with it — and a tray
  // that stayed behind in the carcass would be the same fault T23 found in a
  // hinge that stayed shut while its door opened.
  //
  // ─── T70 F1 · AND SO DOES THE SHOE RAMP ──────────────────────────────────
  //
  // The owner, 13.09.2026, of the shoe drawer on his screen:
  //
  //   *"skos ma się otwierać razem z boxem, a nie box się otwiera a reszta
  //   zostaje."*
  //
  // He is describing THIS LINE. T58 gave the shoe insert its own role,
  // `shoe_insert`, and this function has only ever named two — so the box came
  // out and the ramp and its two dividers stayed in the carcass, hanging in
  // mid-air over a hole. It was never a decision; it was a role nobody added.
  //
  // DECIDED, overturnable in one word (*"skos osobno"*): THE SLOPING SHELF IS
  // PART OF THE BOX. One moving assembly, ONE set of runners — the ramp and
  // its dividers are fixed INTO the box, between its sides and onto its
  // bottom, so they travel the box's own nominal length and nothing is left
  // standing in the carcass. `reference/lisp/KIT_WARDROBE_FULL.lsp` section G
  // names the assembly part by part (`SKY:shoeAssembly`) and states the one
  // runner pair (`SKY:shoeRunnerPairs`) before this line reads it.
  //
  // No second travel law: `drawerTravel` measures the DRAWER-SIDE and always
  // did — a shoe drawer is *"traktujesz jak normalną szufladę"* and gets no
  // number of its own.
  return panel.role === 'drawer_box' || panel.role === 'watch_insert'
    || panel.role === 'shoe_insert' ? n : null;
}

/**
 * T83 F9 · the pairing key of a panel that travels with a drawer (the parts
 * `drawerOf` names), or null: the drawer and its column, `drawerKey`.
 */
export function drawerKeyOf(panel) {
  return drawerOf(panel) == null ? null : drawerKey(panel.meta);
}

/**
 * How far each drawer of this unit travels when it is opened, in mm.
 *
 * The BOX's own depth is the answer: `computeCabinet` cuts a drawer box to the
 * nominal length the runner ladder chose for the cabinet
 * (`runnerNominalLength`), so the box's depth IS the NL and reading it here
 * keeps the picture and the runner on order agreeing without a second lookup.
 *
 * A drawer with no box — a front the engine drew over a stack it refused — has
 * no travel and does not move, which is honest: there is nothing to pull out.
 *
 * T83 F9 · keyed on `drawerKey`: the drawer index alone on one stack, the
 * index and its column (or bay) on two, so each column travels its own box.
 *
 * @param {Array} panels  result.panels
 * @returns {Map<number|string, number>} drawer key → travel in mm
 */
export function drawerTravel(panels = []) {
  const out = new Map();
  for (const p of panels) {
    if (p?.part !== 'DRAWER-SIDE' || !p.box) continue;
    const n = drawerKey(p.meta);
    if (n == null) continue;
    // T78 F7 · a box turned onto the adjacent wall of an L (its length in
    // box.w) states its own travel; the box's own depth otherwise.
    out.set(n, Math.max(out.get(n) || 0, Number(p.meta?.travel_mm) || Number(p.box.d) || 0));
  }
  return out;
}

/**
 * How far open each drawer of this unit is, 0..1.
 *
 * Read off the FRONTS, because the front is what a hand opens and what the ui
 * store keys on. A cabinet shown with its fronts off (turn 17 F8) has no front
 * to read, and its boxes therefore sit closed — which is what a joiner looking
 * at a stripped carcass expects.
 *
 * T83 F9 · keyed on `drawerKey`, as the travel is: a front opens the box of
 * its own column and of no other.
 *
 * @param {Array} panels     result.panels
 * @param {object} openFronts  { [panelId]: 0..1 } for THIS unit
 * @returns {Map<number|string, number>} drawer key → 0..1
 */
export function drawerOpenAmounts(panels = [], openFronts = null) {
  const out = new Map();
  if (!openFronts) return out;
  for (const p of panels) {
    if (p?.part !== 'DRAWER-FRONT') continue;
    const n = drawerKey(p.meta);
    if (n == null) continue;
    const amount = Number(openFronts[p.id]) || 0;
    if (amount > 0) out.set(n, amount);
  }
  return out;
}

/**
 * The whole answer for one unit: what moves, how far, and by how much.
 *
 * @returns {{ travel:Map<number,number>, open:Map<number,number>,
 *             forPanel:(panel:object)=>({open:number, travel:number}|null) }}
 */
export function drawerMotion(panels = [], openFronts = null) {
  const travel = drawerTravel(panels);
  const open = drawerOpenAmounts(panels, openFronts);
  return {
    travel,
    open,
    forPanel(panel) {
      // T83 F9 · the drawer AND its column: the box of the front that opened.
      const n = drawerKeyOf(panel);
      if (n == null) return null;
      return { open: open.get(n) || 0, travel: travel.get(n) || 0 };
    },
  };
}

/**
 * T83 F9 · how far one runner pair rides out, in mm: the open amount times the
 * travel of the drawer it carries.
 *
 * `engine/hardware3d.js` numbers a second column's pairs after the first's (as
 * the BOM counts them) and states on each such pair the key of the drawer it
 * carries (`ride`, `drawerKey` of its row and column); a pair with no `ride`
 * (one stack) is its drawer number, as it always was. `3d/Hardware.jsx`
 * groups the runners by that number and asks here for each group.
 *
 * @param {object} motion  `drawerMotion(...)` (or anything with `open` and `travel` maps)
 * @param {Array} items    the runner instances
 * @param {number} drawer  the group's drawer number
 * @returns {number}
 */
export function runnerSlide(motion, items = [], drawer = 0) {
  const pair = (items || []).find((r) => (r?.drawer ?? 0) === drawer);
  const key = pair?.ride ?? drawer;
  return (Number(motion?.open?.get?.(key)) || 0) * (Number(motion?.travel?.get?.(key)) || 0);
}
