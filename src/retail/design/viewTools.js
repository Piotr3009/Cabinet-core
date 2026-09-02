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
  // T63 F5 · LICENSED REMOVAL: `Front dimensions` stood here. The owner:
  // *"front dimensions wywal, po co mi to."* Removed from the retail bar only.

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
  // T63 F5 · LICENSED REMOVAL: `Measure` stood here. The owner: *"measure
  // wyrzuć też."* Removed from the retail bar only; PRO keeps its ruler.

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
    // ─── T63 F2 · LIGHTS OPENS THE LIGHTING PANEL — IT DOES NOT TOGGLE ────
    // The owner: *"jak naciskam lights to nie powinno się wyłączać światło
    // tylko powinno się pojawić menu oświetlenia (jak w PRO)."* PRO's own
    // Lighting button (`TopBar.jsx`) is exactly that — `openModal('lighting',
    // { anchor })` — and the copied `LightingPanel` carries PRO's ON / OFF
    // in PRO's place for it, at the top of the panel.
    id: 'lights', group: 'doors', own: true, kind: 'lights',
    label: 'Lights', title: 'LED strips, spots and the demo — placed in the scene, counted in the BOM',
  },

  // ─── AND THE TWO THAT ARE ABOUT THE PAGE ────────────────────────────────
  {
    // T63 F5 · the owner: *"reset view widok wyśrodkowany, powinien być od
    // środka."* Reset now parks the camera on the design's own centre line —
    // `resetPlacement` below — rather than back at the room-corner preset.
    id: 'reset', group: 'page', own: true, kind: 'reset',
    label: 'Reset view', title: 'Centre the wardrobe in the picture',
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

// ─── T63 F5 · RESET VIEW CENTRES THE MODEL ──────────────────────────────────
//
// The owner: *"reset view widok wyśrodkowany, powinien być od środka."*
//
// PRO has no reset: `CanvasToolbar.jsx` carries no such control and
// `src/3d/cameraPresets.js` (T59, retail's own) knows only its three places to
// stand. So this is written in the retail view-tool and nowhere else, as
// CLAUDE.md allows — the same maths `presetPlacement` frames a box with (the
// app's 38° lens needs `max(w, h) × 1.5 + d` to hold a piece), aimed at the
// bounding box's own centre, standing on its centre line, a little above the
// middle so the top and the plinth are both in the picture.
//
// Pure, so a test can hold it: a box in, a place to stand out.
export function resetPlacement(box) {
  if (!box?.min || !box?.max) return null;
  const cx = (box.min[0] + box.max[0]) / 2;
  const cy = (box.min[1] + box.max[1]) / 2;
  const cz = (box.min[2] + box.max[2]) / 2;
  const w = box.max[0] - box.min[0];
  const h = box.max[1] - box.min[1];
  const d = box.max[2] - box.min[2];
  const framing = Math.max(w, h) * 1.5 + d;
  return {
    from: [cx, cy + h * 0.12, box.max[2] + framing],
    at: [cx, cy, cz],
  };
}
