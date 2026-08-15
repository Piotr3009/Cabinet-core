// ─── One piece of a cabinet, as a thing you can select and edit ─────────────
// Turn 11, CLAUDE.md F3.
//
// Turn 9 made a SHELF selectable and editable. This is the rest of the cabinet:
// sides, bottom, top, back, vertical partitions, end panels, infills and the
// doors' hinges. The selection model does not change — it is still
// `{ unitId, elementRef }` where the ref is the ENGINE's own panel id — so what
// this module adds is the two questions that follow from it:
//
//   WHAT IS THIS PIECE?   `elementKind` / `elementLabel`, decided on the
//                         engine's `part` and `role`, never on the id string.
//   WHAT MAY BE SAID ABOUT IT?  `elementFields`, which is the list the right
//                         panel builds itself from — so a kit that adds a part
//                         nobody thought of gets a sensible panel for free, and
//                         a new field is one entry here rather than a new
//                         branch in a component.
//
// Pure data and pure functions: no React, no store. The panel reads it, the 3D
// view reads it, and a node test can look at the answer.

/**
 * Is this panel a thing a joiner can point at and edit?
 *
 * Everything with a box, except the pieces that are part of a MECHANISM rather
 * than of the cabinet — a drawer box's four sides, the panel that carries the
 * runners, its fillers. Those are consequences of the drawer stack: the way to
 * change one is to change the stack, and offering a material for the left side
 * of drawer 2 would be offering a decision nobody makes.
 */
export function isSelectableElement(panel) {
  return Boolean(panel?.box) && elementKind(panel) !== null;
}

const MECHANISM_PARTS = new Set(['DP', 'FILLER']);

// ─── TURN 17 (CLAUDE.md F4.2): A DRAWER IS A THING YOU CAN OPEN ─────────────
//
// Owner: "jak je edytuję to nie mają żadnych wcięć, nie widzę dziurek."
//
// He was trying to edit a DRAWER, and turn 11 had decided he could not: a
// drawer box's four sides were filed with the drawer PANEL and its fillers as
// "part of a MECHANISM rather than of the cabinet", so a click on one selected
// nothing and there was no detail window to open.
//
// Turn 11 was half right and the half it got wrong is the half the owner is
// standing in front of. The DP panel and its fillers really are consequences of
// the stack — they are what CARRIES the runners, and nobody chooses them. A
// drawer BOX is a box: four boards with grooves in them, cut on the same
// machine as everything else, and F4.2 says so in as many words — "selectable
// in the editor, with its own detail view", like a shelf.
//
// What it does NOT become is a thing you point at in the room: it is inside a
// closed cabinet, so it is neither an ADDED INTERIOR piece nor an ATTACHED one,
// and the two sets below are untouched. You reach it where you reach a side
// panel — in the editor window.

/**
 * The kinds that are ADDED INTERIOR ITEMS — the things a joiner puts INSIDE a
 * carcass after it exists.
 *
 * ─── TURN 13 (CLAUDE.md F2.4) ───
 * The owner's verdict, after living with turn 11's "the whole cabinet is
 * selectable": clicking a cabinet must select the CABINET again. Turn 11 was
 * right that every piece is a thing with properties; it was wrong about where
 * you reach it. A carcass panel is reached in the EDITOR window now — which is
 * the whole of F2 — and the room view goes back to being about cabinets.
 *
 * What stays directly clickable is exactly what a joiner ADDED: a shelf, a
 * vertical partition, a fixed shelf or rail. Those are the pieces somebody put
 * there on purpose and moves by hand, and taking the click away from them would
 * take the drag with it.
 */
const ADDED_INTERIOR_KINDS = new Set(['shelf', 'partition', 'fixed-shelf']);

/**
 * The kinds that are ATTACHED to a carcass rather than part of it (turn 14,
 * CLAUDE.md F4).
 *
 * The owner's model, and it is a distinction a joiner makes without thinking:
 * a side, a top, a back are the CARCASS — you build them once and you look at
 * them in the editor window. A door, an end panel, a filler, the masking panel
 * under a wall run are things you HANG ON the carcass afterwards, one at a
 * time, and each of them is a decision with its own properties. Those you point
 * at directly.
 */
const ATTACHED_KINDS = new Set(['door', 'drawer-front', 'end-panel', 'infill', 'masking-panel']);

/**
 * Is this piece clickable AS A PIECE in the room view?
 *
 * The narrower question, and the one the 3D scene asks. `isSelectableElement`
 * is unchanged and still says what may be selected AT ALL — the editor window
 * uses it, and so does everything downstream of a selection. This only decides
 * what a SINGLE CLICK in the room lands on, which is the half of it the owner
 * sees — and turn 13's verdict on that is unchanged and deliberate: a single
 * click on a cabinet selects the CABINET.
 */
export function isMainViewElement(panel) {
  return isSelectableElement(panel) && ADDED_INTERIOR_KINDS.has(elementKind(panel));
}

/** An added-on piece: a door, a front, an end panel, a filler, a masking panel. */
export function isAttachedElement(panel) {
  return isSelectableElement(panel) && ATTACHED_KINDS.has(elementKind(panel));
}

/**
 * Does this piece OPEN ITS OWN MODAL when it is double-clicked in the room?
 *
 * ─── Turn 14 (CLAUDE.md F4) ───
 * "Added/attached elements are clicked DIRECTLY and get their OWN modal:
 * doors, end panels, infills — and the bottom masking panel." Directly means
 * without going through the editor window, and in this app that gesture already
 * exists and is learnt: turn 11 F3.3 made a DOUBLE click open the piece and a
 * single click only select. Using it here keeps both of the owner's verdicts —
 * his turn-13 one (a click on a cabinet selects the cabinet) and this one — and
 * costs him nothing he has to learn.
 */
export function opensOwnModal(panel) {
  return isMainViewElement(panel) || isAttachedElement(panel);
}

/**
 * WHICH kind of piece this is — the word a joiner would use for it.
 *
 * @returns {string|null} null for the pieces that are not elements at all
 */
export function elementKind(panel) {
  const part = panel?.part;
  const role = panel?.role;
  if (!part) return null;
  if (MECHANISM_PARTS.has(part)) return null;
  if (role === 'drawer_box') return 'drawer';
  switch (part) {
    case 'SHELF': return 'shelf';
    case 'VPART': return 'partition';
    case 'PARTITION': case 'RAIL-PART': case 'FIXED': return 'fixed-shelf';
    case 'BUL': case 'BUR': return 'side';
    case 'TOP': return 'top';
    case 'BOTTOM': return 'bottom';
    case 'BACK': case 'BACK-RAIL': return 'back';
    case 'HOLDER': return 'holder';
    case 'SPURS': return 'spurs';
    case 'END-PANEL': return 'end-panel';
    case 'INFILL': return 'infill';
    case 'PLINTH': return 'plinth';
    case 'MASK': return 'masking-panel';
    case 'FRONT': return 'door';
    case 'DRAWER-FRONT': return 'drawer-front';
    default: return null;
  }
}

const LABELS = {
  shelf: 'Shelf',
  partition: 'Vertical partition',
  'fixed-shelf': 'Fixed shelf',
  side: 'Side panel',
  top: 'Top',
  bottom: 'Bottom',
  back: 'Back',
  holder: 'Sink holder',
  spurs: 'Spurs panel',
  'end-panel': 'End panel',
  infill: 'Infill',
  plinth: 'Plinth',
  'masking-panel': 'Bottom masking panel',
  door: 'Door',
  'drawer-front': 'Drawer front',
  drawer: 'Drawer box',
};

/** What each board of a drawer box is called, in a joiner's words. */
const DRAWER_PIECES = {
  'DRAWER-SIDE': 'side',
  'DRAWER-BOX-FRONT': 'front',
  'DRAWER-BOX-BACK': 'back',
  'DRAWER-BOTTOM': 'bottom',
};

/** What the panel calls it, above the engine's own id. */
export function elementLabel(panel) {
  const kind = elementKind(panel);
  if (!kind) return null;
  if (kind === 'side') return panel.part === 'BUL' ? 'Left side' : 'Right side';
  if (kind === 'end-panel') return `End panel — ${panel.meta?.side === 'right' ? 'right' : 'left'}`;
  if (kind === 'infill') {
    const side = panel.meta?.side;
    const where = side === 'top' ? 'Top' : (side === 'right' ? 'Right' : 'Left');
    return `${where} infill`;
  }
  // Turn 17 (F4.2): WHICH drawer, and which board of it — a stack of three has
  // twelve of these and "Drawer box" on all of them names none of them.
  if (kind === 'drawer') {
    const n = panel.meta?.drawer;
    const piece = DRAWER_PIECES[panel.part];
    const side = panel.meta?.side === 'R' ? ' (right)' : (panel.meta?.side === 'L' ? ' (left)' : '');
    return `Drawer ${n ?? ''}${piece ? ` — ${piece}${side}` : ''}`.replace(/\s+/g, ' ').trim();
  }
  return LABELS[kind] || 'Piece';
}

// ─── What may be said about it ──────────────────────────────────────────────
//
// The FIELDS, per kind. Every element takes a MATERIAL — what a piece is made
// of changes no geometry at all, which is exactly why it can be said about
// anything (engine/cabinet.js applies it by panel id). The rest is
// element-appropriate: a shelf has a height and a setback, an end panel has a
// height mode and how far it runs above the unit, a door has a hinge side.
//
// ─── THE THICKNESS, AND WHY IT IS NOT EVERYWHERE ───
// A carcass is held together by tabs cut for a board of `board_t`: the tab is G
// wide, the socket's centre line is G/2 + 0.5, the dog-bone relief is sized off
// both (engine/puzzle.js). A 22 mm side in an 18 mm carcass is not a thicker
// side — it is a joint that does not go together. So the four jointed pieces
// (both sides, the top, the bottom) and the back that sockets into them take
// `carcass-board`: the field is there, it is the piece's real thickness, and it
// edits the CARCASS BOARD, because that is what that number is. A shelf, a
// partition, an end panel and an infill carry no joint and take their own.
// BLOCKERS #58 records the decision.

const FIELDS = {
  // ─── TURN 21 (CLAUDE.md F7): THE SHELF LEARNS ITS THREE KINDS ─────────────
  // Owner: the shelf modal gains a TYPE — fix / adjustable / pull-out — and it
  // is the FIRST row, because it is the question that decides what the other
  // rows mean. It was only ever in the right-hand list before, so a joiner who
  // double-clicked the shelf he was looking at could edit everything about it
  // except how it is held.
  shelf: ['shelf-type', 'position-y', 'setback', 'thickness', 'material'],
  // ─── TURN 24 (CLAUDE.md F3.3): AND WHICH BOARD IT IS CUT FROM ────────────
  // Owner: "grubość przegrody się nie zmienia" — a partition is a carcass board
  // standing on its end, so it picks one of the project's CARCASS slots rather
  // than being typed a number of its own. `thickness` stays beside it for the
  // piece somebody genuinely wants at 25 mm; the slot is what it is normally.
  // Turn 30 (CLAUDE.md F3): …and WHICH FACE it is bored from. Beside the
  // board it is cut from, because they are the same kind of question about
  // the same piece: what it is, and how the machine meets it.
  partition: ['position-x', 'partition-slot', 'partition-drill-face', 'setback', 'thickness', 'material'],
  'fixed-shelf': ['setback-unit', 'material'],
  side: ['carcass-board', 'material'],
  top: ['carcass-board', 'material'],
  bottom: ['carcass-board', 'material'],
  back: ['carcass-board', 'material'],
  holder: ['carcass-board', 'material'],
  spurs: ['carcass-board', 'material'],
  // Turn 16 (CLAUDE.md F4.3): `below-unit-ep` — how far this masking panel runs
  // BELOW the carcass. The mirror of `above-unit-ep` and, on a wall unit, the
  // owner's second independent height: the door beside it has its own number
  // and neither writes the other.
  'end-panel': ['end-panel-height', 'thickness-ep', 'above-unit-ep', 'below-unit-ep', 'material'],
  infill: ['infill-width', 'above-unit-infill', 'pin-infill', 'material'],
  plinth: ['plinth-height', 'material'],
  // ─── Turn 14 (CLAUDE.md F4.2): DOOR EXTEND LIVES ON THE DOOR ───
  // It is a property of the front — how far this door runs BELOW the carcass to
  // make a handleless grab edge — and it spent three turns in the cabinet's
  // carcass block, which is where a joiner looking for a door property does not
  // look. The engine is untouched: `door_extend` is the same param it has been
  // since turn 3, and this only says where the control is.
  // Turn 17 (CLAUDE.md F7.2): a door's HINGES are a door property — add one,
  // take one off, move one — so they are edited on the door and nowhere else.
  door: ['hinge-side', 'door-extend', 'hinges', 'front-board', 'material'],
  // Turn 18 (CLAUDE.md F6.4): …and which RUNNER this drawer is fitted with.
  // A per-drawer override of the project's own answer, in the colour
  // hierarchy's own shape, and reachable from the front and from the box for
  // the same reason the height is.
  'drawer-front': ['drawer-height', 'runner-variant', 'front-board', 'material'],
  'masking-panel': ['masking-depth', 'material'],
  // Turn 17 (F4.2): a drawer box is a box of boards. Its SIZE follows the
  // stack — that is what F8 edits, on the unit — so what is said about one
  // board of it is what it is made of.
  // Turn 17 (CLAUDE.md F8.2): with the fronts off, the BOX is what a joiner
  // clicks — so the drawer's height is edited on it as well as on its front.
  // One field id, one control, two places it can be reached from.
  drawer: ['drawer-height', 'runner-variant', 'material'],
};

/**
 * The controls this piece's properties panel offers, in order.
 *
 * `type` (turn 14, F4.2) is the unit TYPE record, so a field that only some
 * kits have — the door extend, which is a wall unit's handleless grab edge —
 * can be left out where the kit does not have it instead of being rendered
 * disabled. Left out, every field the kind defines is offered, which is what
 * every caller before this turn asked for.
 *
 * @returns {string[]} field ids the panel knows how to render
 */
export function elementFields(panel, type = null) {
  const kind = elementKind(panel);
  if (!kind) return [];
  let fields = [...(FIELDS[kind] || ['material'])];
  if (type && !type.doorExtend) fields = fields.filter((f) => f !== 'door-extend');
  // A piece the engine DERIVES has no item to hang an override on: the
  // horizontal partition above a drawer stack follows the stack, and a shelf
  // that arrived as a bare count has no id. Those lose the fields that need one.
  if ((kind === 'shelf' || kind === 'partition') && !panel.meta?.itemId) {
    return fields.filter((f) => f === 'material');
  }
  return fields;
}

// ─── What may be DONE to a piece (turn 14, CLAUDE.md F8.2) ──────────────────
//
// "Every part is selectable with ACTIONS — including auto parts (the spur panel
// above a fridge, the sink kit's pieces): edit / move / remove where the
// physics allows; where it does not, a short explanation."
//
// The last clause is the #58 pattern and it is the half that matters: a control
// that is simply absent teaches nothing, and one that is greyed out with no
// reason teaches less. So every kind answers BOTH questions — may it, and if
// not, WHY not — in a sentence a joiner would accept from another joiner.
//
// The physics, in one line each:
//
//   A CARCASS BOARD holds the box together. The tabs are cut for it, the sockets
//   are cut for the tabs, and a cabinet missing a side is not a cabinet.
//
//   A DERIVED piece follows something else. The partition above a drawer stack
//   is the stack's lid; the sink's holders are what that kit has instead of a
//   top. Removing one is asking for a different cabinet, and the way to ask is
//   to change what it follows.
//
//   A PIECE WHOSE POSITION IS ITS DEFINITION cannot be moved. A scribe filler
//   IS the gap it closes; an end panel is screwed to the side it masks. They
//   come off, and they do not slide.
//
//   AN AUTO PART is the interesting case, and it is the one the owner named.
//   The fridge's spur panel is fitted where a spur happens to be, and a workshop
//   that puts the socket somewhere else wants it 100 mm over — or not at all.
//   That is a DESIGN-LAYER decision on the unit, never an engine fork, so it
//   travels as an element override like a material does.

const ACTIONS = {
  side: { remove: false, move: false, why: 'The carcass is held together by this board — the tabs are cut for it.' },
  top: { remove: false, move: false, why: 'The carcass is held together by this board — the tabs are cut for it.' },
  bottom: { remove: false, move: false, why: 'The carcass is held together by this board — the tabs are cut for it.' },
  back: { remove: false, move: false, why: 'The back squares the carcass, and the sides are tenoned into it.' },
  'fixed-shelf': { remove: false, move: false, why: 'It follows what is under it — change the stack, or the fridge height, and this follows.' },
  holder: { remove: false, move: false, why: 'A sink unit has these instead of a top — taking one off opens the carcass.' },
  'drawer-front': { remove: false, move: false, why: 'A drawer front follows its drawer — change the stack.' },
  drawer: { remove: false, move: false, why: 'A drawer box is built from the stack above and below it — change the drawer heights.' },
  spurs: { remove: true, move: true, why: null },
  shelf: { remove: true, move: true, why: null },
  partition: { remove: true, move: true, why: null },
  door: { remove: true, move: false, why: 'A door hangs on its hinges — the hinge side is a door property.' },
  'end-panel': { remove: true, move: false, why: 'An end panel is screwed to the side it masks.' },
  infill: { remove: true, move: false, why: 'A filler IS the gap it closes.' },
  plinth: { remove: true, move: false, why: 'The toe kick runs the front of the run — its setback is a workshop number.' },
  'masking-panel': { remove: true, move: false, why: 'The board is the underside of the run — its depth is what hides the wall standoff.' },
};

/**
 * May this piece be removed, and may it be moved?
 *
 * @returns {{remove:{allowed:boolean,reason:string|null},
 *            move:{allowed:boolean,reason:string|null}}}
 */
export function elementActions(panel) {
  const kind = elementKind(panel);
  const rule = ACTIONS[kind] || { remove: false, move: false, why: 'This piece is part of the kit.' };
  return {
    kind,
    remove: { allowed: Boolean(rule.remove), reason: rule.remove ? null : rule.why },
    move: { allowed: Boolean(rule.move), reason: rule.move ? null : rule.why },
  };
}

/**
 * Which UNIT parameter a `carcass-board` field edits, so the panel does not
 * have to know that a front is a different board from a carcass.
 */
export function boardParamFor(panel) {
  const kind = elementKind(panel);
  if (kind === 'door' || kind === 'drawer-front') return 'front_t';
  return 'board_t';
}
