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

/** Which drawer a panel belongs to, or null where it is not part of one. */
export function drawerOf(panel) {
  const n = Number(panel?.meta?.drawer);
  if (!(n > 0)) return null;
  if (panel.part === 'DRAWER-FRONT') return n;
  return panel.role === 'drawer_box' ? n : null;
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
 * @param {Array} panels  result.panels
 * @returns {Map<number, number>} drawer index → travel in mm
 */
export function drawerTravel(panels = []) {
  const out = new Map();
  for (const p of panels) {
    if (p?.part !== 'DRAWER-SIDE' || !p.box) continue;
    const n = Number(p.meta?.drawer);
    if (!(n > 0)) continue;
    out.set(n, Math.max(out.get(n) || 0, Number(p.box.d) || 0));
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
 * @param {Array} panels     result.panels
 * @param {object} openFronts  { [panelId]: 0..1 } for THIS unit
 * @returns {Map<number, number>} drawer index → 0..1
 */
export function drawerOpenAmounts(panels = [], openFronts = null) {
  const out = new Map();
  if (!openFronts) return out;
  for (const p of panels) {
    if (p?.part !== 'DRAWER-FRONT') continue;
    const n = Number(p.meta?.drawer);
    if (!(n > 0)) continue;
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
      const n = drawerOf(panel);
      if (n == null) return null;
      return { open: open.get(n) || 0, travel: travel.get(n) || 0 };
    },
  };
}
