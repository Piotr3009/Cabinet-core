// ─── THE SCENE RENDERS THE RECORD (turn 26, CLAUDE.md R10 / F3) ─────────────
//
// The owner's law, verbatim intent: *"cut CNC musi być twoją drogą do
// wizualizacji, nie na odwrót."* The sheet is the truth and the scene follows
// it. Every drilling, pocket and cut on a panel's CNC record must be visible on
// that panel in 3-D — the picture is a READING of the record, never a parallel
// idea of what ought to be there.
//
// His clearest example, and the one that named the fault: a side panel carries
// **three ⌀7.5 holes in a row per shelf level** on the sheet, and in the scene
// there were no holes at all — X-ray included — only brass sleeves where a
// shelf happened to stand.
//
// ─── WHY THERE WERE NONE ────────────────────────────────────────────────────
//
// Turn 20 carved every feature out of the board and turn 21 RETIRED the whole
// pass behind `appearance.cuts.enabled = false`, because the owner had seen
// pilot dots on his door faces and stray dashes inside carcasses. He was right
// about the symptom and the flag was the wrong cure: what was actually wrong is
// that no drilling in this app had ever stated a DEPTH, so `engine/recesses.js`
// read every one of them as a hole straight through the board — a ⌀3 cup screw
// showing on the face of a door, a ⌀35 cup showing through it.
//
// R10 outranks the retirement, so the pass comes back and this module is what
// makes it honest: a per-CLASS policy that says, for every layer this engine
// emits, whether the scene bores it and how deep — and, where a class is
// deliberately NOT bored, the reason, in one sentence, in code. F3.3: silence
// is not allowed. `verify/t26/sheet-vs-scene.md` is generated from exactly
// these strings, so the document and the behaviour cannot drift.
//
// ─── THE RECORD WINS ────────────────────────────────────────────────────────
//
// A drill that STATES its depth is bored to it — that is R10, and it is why
// `engine/cabinet.js` now writes the cup's own 11 mm onto the hole. The policy
// below is only the DEFAULT for a class whose record says nothing, and every
// default here is a workshop number with its reasoning beside it rather than a
// convenient constant. A class with no default and no stated depth goes
// through, which is what a drilling in these kits has meant since turn 1.
//
// Pure functions and pure data. No React, no store, no three.js.

// ─── WHERE THE BLIND DEPTHS COME FROM ───────────────────────────────────────
//
// NOT from a new block. `profile.editor.drillDefaults` has carried the
// workshop's own per-layer conventions since turn 24 — "`SHELVES_7_5MM` is a
// ⌀7.5 twelve deep, `SCREWS_3MM` is a ⌀3 straight through" — and they are the
// numbers a joiner stamps by hand in the part editor. A second table would be
// the same rule written twice, which is the thing this file exists to stop.
//
// Turn 26 corrects exactly TWO of its rows, and both on the owner's own words:
// the cup is 11 (he measured it), and the cup's two fixing screws follow the
// cup rather than going through the leaf (his turn-21 "pilot dots on my door
// faces" is that class, read as a through hole).

/**
 * How the scene treats one CNC class.
 *
 * `draw`   is this class bored out of the board's own solid?
 * `reason` why not, where it is not — or why it is drawn somewhere else. It is
 *          a SENTENCE and it is required: `verify/t26/sheet-vs-scene.md` prints
 *          it, and a class added without one fails `test/turn26-f3-parity`.
 */
const CLASSES = [
  {
    layer: 'OUTLINE',
    draw: false,
    reason: 'the outline IS the board — it is the polygon every panel is extruded from (3d/panelSolid.js), not a feature cut into one.',
  },
  {
    layer: 'CARCASE',
    draw: false,
    reason: 'the elevation views’ own outline layer; same answer as OUTLINE.',
  },
  {
    layer: 'PUZZLE_SOCKET',
    draw: false,
    reason: 'cut by the OUTLINE since turn 11 — a socket is a notch in the board’s own polygon, and boring it a second time would punch a hole through a notch.',
  },
  {
    layer: 'PUZZLE_DOG_BONES',
    draw: true,
    reason: 'the relief the cutter leaves in the corner of a socket; it goes through the board with the socket.',
  },
  {
    layer: 'PUZZLE_HOLES_7_5MM',
    draw: true,
    reason: 'the puzzle joint’s through-dowel — it passes into the neighbouring board, so it really is through.',
  },
  {
    layer: 'SCREWS_3MM',
    draw: true,
    reason: 'a through screw by definition: it passes through the board it is drilled in and into the edge of the one behind it.',
  },
  {
    layer: 'BISCUIT_4MM',
    draw: false,
    reason: 'a MARK is an open path the cutter runs in and out of, not a closed removal — it is drawn as a line on the face by 3d/JointLines.jsx and 3d/PartMachining.jsx, which is what a set-out transfer looks like on the bench.',
  },
  {
    layer: 'SHAKER_PANEL_POCKET',
    draw: false,
    reason: 'drawn by the TRAY solid (3d/shakerSolid.js), which is the door’s own geometry — boring it again here would stand two coplanar surfaces a hundredth of a millimetre apart, which is z-fighting by construction.',
  },
  {
    layer: 'HANDLES_5MM',
    draw: true,
    reason: 'a handle bolt goes through the front and takes a nut on the back — through is the truth.',
  },
  {
    layer: 'HINGES_5MM',
    draw: true,
    reason: 'the knock-in plate’s two ⌀5 dowels. BLIND: a dowel that broke through the outer face of a side panel would be visible in the room.',
  },
  {
    layer: 'SHELVES_7_5MM',
    draw: true,
    reason: 'the shelf-pin ladder — bored EMPTY ones too, so the full set of levels reads at a glance exactly as it does on the sheet (F3.1). BLIND: a pin hole through a side panel would show daylight.',
  },
  {
    layer: 'RUNNERS_3MM',
    draw: true,
    reason: 'the runner’s fixing screws, drawn to whatever the workshop’s own drillDefaults row says — which today is THROUGH. Nobody has given a pilot depth for a MOVENTO screw and this turn does not invent one; BLOCKERS carries the question.',
  },
  {
    layer: 'FRONT_HINGES_35MM',
    draw: true,
    reason: 'the ⌀35 cup. BLIND to the owner’s measured 11 mm — and the RECORD states it (engine/cabinet.js), so this default is never the number actually used.',
  },
  {
    layer: 'FRONT_HINGES_3MM',
    draw: true,
    reason: 'the cup’s own two fixing screws. BLIND: turn 21’s "pilot dots on his door faces" were exactly these, read as through holes.',
  },
  {
    layer: 'DRAWER_RUNNER_POCKET',
    draw: true,
    reason: 'a groove in the box side, cut to the depth its own record states.',
  },
  {
    layer: 'DRAWER_BOTTOM_POCKET',
    draw: true,
    reason: 'a groove in the box side, cut to the depth its own record states.',
  },
  {
    layer: 'HANGER_HOLE',
    draw: true,
    reason: 'the wall bracket’s cut-out in the back panel — the bracket passes through it.',
  },
  // ─── Turn 34 (CLAUDE.md F4): the shoe box's two classes ───
  {
    layer: 'SHOE_GROOVE_6MM',
    draw: true,
    reason: 'the sloped bottom’s seat, 6 mm deep in all four walls of the box — a groove cut to the depth its own record states, exactly as the drawer box’s two grooves are, and the board that sits in it is 6 mm into every wall.',
  },
  {
    layer: 'SHOE_RUNNER_5MM',
    draw: true,
    reason: 'the side runner’s euro fixings in the carcass side, on the owner’s own 16.08 sheet. BLIND: a ⌀5 broken through the outer face of a wardrobe side would show in the room, exactly as the hinge plate’s dowels would.',
  },
  {
    layer: 'UNIT_NUMBER',
    draw: false,
    reason: 'text, not machining — the label is engraved or printed and is drawn as type by the CNC preview.',
  },
];

const BY_LAYER = new Map(CLASSES.map((c) => [c.layer, c]));

/** Every class this module has an opinion about, in table order. */
export function machiningClasses() {
  return CLASSES.map((c) => ({ ...c }));
}

/**
 * The workshop's own stated depth for one class, or null for "through".
 *
 * `profile.editor.drillDefaults` is the table, and a `depth` of 0 there means
 * through — which is what a screw driven from one board into the next is.
 */
function defaultDepth(profile, layer) {
  const row = profile?.editor?.drillDefaults?.[layer];
  const n = Number(row?.depth);
  return n > 0 ? n : null;
}

/**
 * The policy for one layer, resolved against a profile.
 *
 * A layer this table has never heard of is DRAWN and THROUGH: a new class must
 * appear in the picture on the day it is emitted (R10), and the parity test is
 * what then asks somebody to name its depth.
 */
export function machiningFor(layer, profile) {
  const name = String(layer || '');
  const row = BY_LAYER.get(name) || null;
  if (!row) {
    return {
      layer: name, draw: true, depth: defaultDepth(profile, name), reason: null, known: false,
    };
  }
  return {
    layer: row.layer,
    draw: row.draw,
    depth: row.draw ? defaultDepth(profile, row.layer) : null,
    reason: row.reason,
    known: true,
  };
}

/** Which layers the scene deliberately does NOT bore, with the reason (F3.3). */
export function machiningOmissions() {
  return CLASSES.filter((c) => !c.draw).map((c) => ({ layer: c.layer, reason: c.reason }));
}

/** Is this class bored out of the board's solid at all? */
export function sceneBoresLayer(layer, profile) {
  return machiningFor(layer, profile).draw;
}
