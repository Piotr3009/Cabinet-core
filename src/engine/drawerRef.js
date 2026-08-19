// ─── WHICH DRAWER A PANEL IS ABOUT (turn 41, F3) ────────────────────────────
//
// A pure decision, lifted out of `components/ElementProperties.jsx` so that the
// thing the panel does can be TESTED — which is this turn's whole discipline.
// The fault it fixes was invisible to every test in the suite precisely because
// it lived in a `.jsx` file that no test could import.
//
// ─── THE FAULT, MEASURED ────────────────────────────────────────────────────
//
// The old lookup found the item by `kind === 'drawer'`. An OVERLAY drawer's
// kind is `overlay_drawer`, so on an overlay stack the filter came back empty
// and the function fell through to returning the numeric INDEX. A number routes
// `setDrawerHeight` to the BUDR ratio setter, which writes
// `params.drawer_heights` — an array the overlay stack has never read.
//
// The measured consequence is the worst kind a control can have: the FIELD then
// displayed the number the joiner had typed, because the field read that same
// array. Type 300 and the panel says 300, while every front stays 200 mm and
// the doors above stay exactly where they were. A control that lies about
// having worked.
//
// ─── THE LAW ────────────────────────────────────────────────────────────────
//
// ASK THE PANEL. The engine stamps `meta.itemId` on every overlay front for
// exactly this purpose, so the piece under the pointer names its own item and
// nothing has to be guessed from a kind or an index. Where there is no stamp —
// which is every internal drawer — the old lookup answers, unchanged, so no
// cabinet in the app is read differently from yesterday.
//
// Pure JavaScript — no React, no store imports, no DOM (engine rule).

/**
 * The Nth INTERNAL drawer's item id, or `n - 1` where there is none.
 *
 * This is the pre-T41 lookup, kept whole and un-deleted (sanctity). It is the
 * fall-through for a panel that carries no stamp, and the numeric answer is
 * still what a BUDR ratio stack wants.
 */
export function internalDrawerRef(unit, n) {
  const item = (unit?.params?.sections?.[0]?.items || [])
    .filter((i) => i.kind === 'drawer')
    .sort((a, b) => (Number(a.index) || 0) - (Number(b.index) || 0))[n - 1];
  return item?.id ?? n - 1;
}

/**
 * The item THIS PANEL is about — the stamp first, the old lookup after.
 *
 * @param {object} unit   the cabinet
 * @param {object} panel  the piece under the pointer
 * @param {number} n      its drawer number, `panel.meta.drawer`
 * @returns {string|number} an item id, or an index where there is no item
 */
export function drawerRefOf(unit, panel, n) {
  const stamped = panel?.meta?.itemId;
  if (stamped != null) {
    const items = unit?.params?.sections?.[0]?.items || [];
    if (items.some((i) => i.id === stamped)) return stamped;
  }
  return internalDrawerRef(unit, n);
}

/**
 * The height this drawer is ACTUALLY cut to, asked of the piece that owns it.
 *
 * An overlay drawer carries its own `height_mm`. An internal one may too; where
 * it does not, the ratio array is still the answer — which is what a BUDR stack
 * and every wardrobe stack sized before this turn read.
 */
export function drawerHeightValue(unit, panel, n) {
  const ref = drawerRefOf(unit, panel, n);
  if (typeof ref === 'string') {
    const item = (unit?.params?.sections?.[0]?.items || []).find((i) => i.id === ref);
    if (Number(item?.height_mm) > 0) return Number(item.height_mm);
  }
  const heights = unit?.params?.drawer_heights || [];
  return Number(heights[n - 1]);
}
