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

/** T60 · the per-overlay channels — see THE CHANNELS at the foot of this file. */
const parts = new Map();

/** Is the PRO tool chrome drawn? PRO: always yes. PBI retail: never. */
export const proChromeOn = () => on;

/**
 * Turn the tool chrome off for THIS page. Call once, before the first render
 * (see src/retail/main-retail.jsx). Passing anything but `false` restores
 * PRO's default, so the switch cannot get stuck by a typo.
 */
export function setProChrome(next) {
  on = next !== false;
  // T60: the master switch is the last word — see THE CHANNELS below.
  parts.clear();
  return on;
}

// ─── TURN 60 · F2 · THE CHANNELS — BECAUSE A CLIENT ASKED FOR A TOOL ───────
//
// T59 needed one answer: draw the tool chrome, or do not. T60's VIEW BAR needs
// a finer one, and the owner is the reason:
//
//   *"nr 4 musi być identyczne jak mamy w PRO, identyczne ma mieć funkcje."*
//
// PRO's bar carries Show dimensions, Outlines, X-ray and Measure. All four are
// drawn by components this file switched OFF wholesale — so in the retail room
// those four buttons would have flipped a store flag and changed nothing on
// the glass. That is the DEAD CONTROL the standing law forbids, and the fix is
// not to hide the buttons: it is to let one application say WHICH overlays it
// owns.
//
// So a channel is an override of the master switch, by name:
//
//   chromeOn('dimensions')   the figures — DimLabel, DimensionChain, DistanceArrows
//   chromeOn('outlines')     the thin black contour pass on every board
//   chromeOn('measure')      the ruler
//
// A channel nobody has set FALLS THROUGH to the master switch, so PRO — which
// sets neither — is byte-for-byte what it was, and every one of these guards
// still reads `if (!true) return null`.
//
// ─── IT IS A BOOT-TIME CONSTANT, AND THAT IS LOAD-BEARING ──────────────────
//
// The header above says why the master switch is not store state: these guards
// sit BEFORE their components' hooks, so a value that changed between renders
// would make React see fewer hooks than it did last time. A channel is the same
// kind of value and carries the same rule — set once, at the entry, before the
// first render. What VARIES at run time is the store flag the overlay was
// always gated by (`showDimensions`, `showOutlines`, `xray`, `rulerOn`), and
// that gating is PRO's, unchanged: a channel only says the overlay is THIS
// application's to show, never that it is showing.

/**
 * Is this overlay drawn? With no channel set — which is PRO, always — the
 * answer is the master switch, so every existing call site keeps its meaning.
 */
export function chromeOn(part) {
  if (part !== undefined && parts.has(part)) return parts.get(part);
  return on;
}

/**
 * Hand ONE overlay channel to this page. Call after `setProChrome`, before the
 * first render. `setProChrome` clears every channel on its way past, so the
 * master switch is always the last word and a channel cannot get stuck on.
 */
export function setChromePart(part, next) {
  parts.set(part, next !== false);
  return parts.get(part);
}
