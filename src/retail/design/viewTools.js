// ─── T60 F2 · THE VIEW BAR'S TABLE — PRO'S TOOLS, ONE FOR ONE ──────────────
//
// The owner, numbering the screen by the agreed names:
//
//   *"nr 4 musi być identyczne jak mamy w PRO, identyczne ma mieć funkcje."*
//
// So this file is a TABLE and not a component, and that is deliberate: it is
// the thing `test/turn60-f2-the-view-bar.test.js` can hold up beside
// `src/components/CanvasToolbar.jsx` and check entry by entry — the same store
// flag, the same store action, PRO's own label string and PRO's own tooltip,
// character for character. A component could claim parity; a table can be made
// to prove it.
//
// ─── PRO'S LABELS, VERBATIM — AND WHY THEY ARE IN SENTENCE CASE ────────────
//
// PRO writes `Show dimensions`. PBI's bar is UPPERCASE with 0.18em tracking —
// which is `text-transform` in `styles/room.css`, not a different string. So
// the strings below ARE PRO's, and the test greps CanvasToolbar.jsx for each
// one. Retyping them in capitals would have made that test impossible and the
// parity a matter of trust.
//
// ─── WHAT IS ABSENT, AND ON WHOSE ORDER ────────────────────────────────────
//
// PRO's bar also carries BOM, Check and the 3D | CNC switch. Those are not
// view tools: they are the workshop's cut list, the workshop's pre-production
// rules and the workshop's machine output, and a client reading any of them is
// reading the owner's costs. They are therefore absent — behind ONE flag,
// `RETAIL_SHOW_WORKSHOP_TOOLS` in `src/retail/config.js`, so that one word from
// the owner turns them on. This is the doubt CLAUDE.md raised once, before the
// work, and then executed.
//
// Undo and redo are also PRO's and also absent: they act on the PROJECT, not
// on the view, and the brief's enumeration does not name them. The parity map
// carries them as `later`.

/** Which store field says a tool is ON, and which action flips it. */
export const VIEW_TOOLS = [
  // ─── THE CAMERA (PBI's own — t59 F3.3, kept) ────────────────────────────
  //
  // Three places to stand, from `src/3d/cameraPresets.js`. PRO has no such
  // control: a joiner orbits. A client is shown where to look from.
  {
    id: 'front', group: 'camera', own: true, kind: 'preset',
    label: 'Front', title: 'Straight on, the way it will be seen',
  },
  {
    id: 'inside', group: 'camera', own: true, kind: 'preset',
    label: 'Inside', title: 'Doors open, the camera in',
  },
  {
    id: 'room', group: 'camera', own: true, kind: 'preset',
    label: 'Room', title: 'The wardrobe in its room',
  },

  // ─── THE FIGURES ────────────────────────────────────────────────────────
  {
    id: 'dimensions',
    group: 'figures',
    flag: 'showDimensions',
    action: 'toggleDimensions',
    label: 'Show dimensions',
    labelOn: 'Hide dimensions',
    title: 'Show dimensions and distance arrows',
    titleOn: 'Hide dimensions and distance arrows',
    channel: 'dimensions',
  },
  {
    id: 'front-dimensions',
    group: 'figures',
    flag: 'showFrontDimensions',
    action: 'toggleFrontDimensions',
    label: 'Front dimensions',
    labelOn: 'Hide front dimensions',
    title: 'Show front dimensions — sizes, gaps and the merged run figure',
    titleOn: 'Hide front dimensions — sizes, gaps and the merged run figure',
    channel: 'dimensions',
  },

  // ─── THE LENSES — ways of LOOKING, never edits ──────────────────────────
  {
    id: 'outlines',
    group: 'lens',
    flag: 'showOutlines',
    action: 'toggleOutlines',
    label: 'Outlines',
    title: 'Show the outlines',
    titleOn: 'Hide the outlines',
    channel: 'outlines',
  },
  {
    id: 'xray',
    group: 'lens',
    flag: 'xray',
    action: 'toggleXray',
    label: 'X-ray',
    title: 'See through the carcasses — hinges, runners and legs where they are fitted',
    channel: 'outlines',
  },
  {
    id: 'props',
    group: 'lens',
    flag: 'props',
    action: 'toggleProps',
    label: 'Props',
    title: 'Dress the drawers — watches, belt rolls, folded ties',
    titleOn: 'Take the props out of the drawers',
  },
  {
    id: 'hide-fronts',
    group: 'lens',
    flag: 'hideFronts',
    action: 'toggleHideFronts',
    label: 'Hide fronts',
    title: 'Take the doors and drawer fronts off the picture — a way of LOOKING, not an edit',
    titleOn: 'Show the doors and drawer fronts again — nothing about the project changed',
  },
  {
    id: 'measure',
    group: 'lens',
    flag: 'rulerOn',
    action: 'toggleRuler',
    label: 'Measure',
    title: 'Measure between two points on the drawing',
    titleOn: 'Measuring — click two points to read the distance. Escape clears, then closes.',
    channel: 'measure',
  },

  // ─── THE DOORS, AND THE LIGHT ───────────────────────────────────────────
  {
    id: 'open-all',
    group: 'doors',
    kind: 'doors',
    action: 'toggleAllFronts',
    label: 'Open all',
    labelOn: 'Close all',
    title: 'Swing every door in the project open — nothing about the project changes',
    titleOn: 'Shut every door in the project',
  },
  {
    // PBI's own. PRO switches the LED from `LightingPanel`, not from the bar;
    // the brief's enumeration puts it here, beside the doors, because to a
    // client "open it" and "turn the light on" are the same gesture.
    id: 'lights', group: 'doors', own: true, kind: 'lights',
    label: 'Lights', title: 'The LED strips, as they will be fitted',
  },

  // ─── AND THE TWO THAT ARE ABOUT THE PAGE ────────────────────────────────
  {
    id: 'reset', group: 'page', own: true, kind: 'reset',
    label: 'Reset view', title: 'Back to where you started looking',
  },
  {
    id: 'fullscreen', group: 'page', own: true, kind: 'fullscreen',
    label: '⛶', title: 'Fill the page', titleOn: 'Back to the design',
  },
];

/**
 * PRO's bar entries that are NOT view tools. Named here so the report and the
 * test can both point at the same list, and so the flag has something to turn
 * on rather than a comment.
 */
export const WORKSHOP_TOOLS = [
  { id: 'bom', label: 'BOM', title: 'Bill of materials' },
  { id: 'check', label: 'Check', title: 'Eleven pre-production rules over the whole job' },
  { id: 'cnc', label: 'CNC', title: 'The same engine output, drawn two ways' },
];

// A hairline goes between one `group` and the next; `ViewBar` reads the change
// as it walks the table, so the boundaries are the table's own and there is no
// second list of them to fall out of step.
