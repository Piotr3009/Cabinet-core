// ─── TURN 59 · THE VIEWER'S CHROME, AS A SWITCH ────────────────────────────
//
// CLAUDE.md F3.6, verbatim:
//
//   *"The viewer's PRO overlays (dimension chips, hinge rings, LED icons, `+`
//   add markers, the top bar) are OFF in the retail mount. If the shared viewer
//   cannot hide them by props today, ADD the option to the shared core —
//   additive, default = today's PRO behaviour."*
//
// It cannot. `Scene` takes two props — `onCaptureReady` and `onRenderReady` —
// and every overlay decides for itself, from twenty-five render sites spread
// across Scene.jsx and UnitView.jsx. Threading a prop through all of them would
// be twenty-five chances to move a PRO byte.
//
// So the switch is here, one module, and each overlay COMPONENT asks it in its
// own first line. Guarding the component rather than the render site is what
// makes this small: `DimensionChain` is rendered eight times in UnitView.jsx
// and `DimLabel` four, and one guard covers all twelve.
//
// ─── WHY A MODULE FLAG AND NOT STORE STATE ─────────────────────────────────
//
// Because it is not state — it is WHICH APPLICATION IS RUNNING, decided once
// before the first render and never again. A reactive flag would let an overlay
// return null on its second render but not its first, which is precisely how a
// component ends up rendering fewer hooks than React expects. A boot-time
// constant cannot do that, and it also means the retail stage is clean in frame
// one rather than after a flash of somebody else's tool.
//
// DEFAULT: `true` — PRO's behaviour today, byte for byte. PRO never calls
// `setProChrome`, so PRO cannot tell this file exists.

let on = true;

/** Is the PRO tool chrome drawn? PRO: always yes. PBI retail: never. */
export const proChromeOn = () => on;

/**
 * Turn the tool chrome off for THIS page. Call once, before the first render
 * (see src/retail/main-retail.jsx). Passing anything but `false` restores
 * PRO's default, so the switch cannot get stuck by a typo.
 */
export function setProChrome(next) {
  on = next !== false;
  return on;
}
