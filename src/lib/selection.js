// ─── More than one cabinet at a time (turn 13, CLAUDE.md F5) ────────────────
//
// A joiner who has just drawn a run of six base units wants to put a plinth
// under all of them, or paint all of them, or drop a shelf in all of them. Turn
// 12 made him do it six times.
//
// Three pieces of arithmetic, and they are here — pure, no React, no store —
// because each of them is a rule and not a component:
//
//   THE SET       what Ctrl+click does to a selection. One function, so the
//                 canvas, the right panel and the context menu cannot disagree
//                 about what "selected" means.
//   MIXED         what a shared field shows over six cabinets that do not
//                 agree, and — the half that actually matters — what it must
//                 NOT write. A bulk editor that writes its own placeholder is
//                 a bulk editor that silently flattens five cabinets into the
//                 sixth.
//   THE PRIMARY   which one of them the single-unit panels are about. The LAST
//                 one touched, because that is the one the hand is on.

/**
 * What a click does to the selection.
 *
 * @param {string[]} current   the ids selected now
 * @param {string|null} id     what was clicked; null is the background
 * @param {boolean} additive   was Ctrl (or ⌘) held
 * @returns {string[]} the new selection, order preserved — the last entry is
 *                     the PRIMARY, which is what `primaryOf` reads.
 *
 * Ctrl+click on a cabinet ALREADY in the set removes it, which is the half
 * people forget: a selection you can only grow is a selection you have to clear
 * and rebuild every time you overshoot.
 */
export function applySelection(current, id, additive = false) {
  const ids = (current || []).filter(Boolean);
  if (!id) return [];
  if (!additive) return [id];
  const at = ids.indexOf(id);
  if (at === -1) return [...ids, id];
  const without = ids.filter((x) => x !== id);
  // Taking the primary away promotes whatever was touched before it; taking the
  // LAST one away leaves nothing selected, which is what the joiner asked for.
  return without;
}

// ─── TURN 37 (CLAUDE.md F1): THE SET SPANS CABINETS ─────────────────────────
//
// The owner, on T36-F2: *"chodziło mi o półki z 2–3 szaf obok siebie, a nie
// tylko z jednej… Nie mogę sobie złapać 6 półek z 3 szaf i przesunąć ich
// razem."* T36 built the set one level down from the cabinet and then drew a
// boundary round the cabinet, which is the one place the owner needed it not
// to be: a run of three wardrobes is ONE piece of furniture to the person
// looking at it, and the six shelves in it line up or they do not.
//
// A member is `{unitId, elementRef}` — and it is carried as a KEY, one string,
// so `applySelection` above is reused CHARACTER FOR CHARACTER. That is not
// tidiness: the add/remove/promote arithmetic is subtle (Ctrl+click on a member
// already in the set removes it; removing the primary promotes the one touched
// before it), it is tested, and a second copy of it keyed on object identity
// would be a second copy that disagrees the first time somebody re-creates a
// member object in a `useMemo`.
//
// The separator is a NUL. A unit id is `u_…` and a panel id is `SHELF-2`, so
// almost anything would do — but "almost" is how a piece called `a::b` in a
// cabinet called `x` collides with a piece called `b` in a cabinet called
// `x::a`, and a character that cannot occur in either is free.
const MEMBER_SEP = '\u0000';

/** One member of a cross-cabinet piece selection, as a single comparable key. */
export function memberKey(unitId, elementRef) {
  return `${unitId}${MEMBER_SEP}${elementRef}`;
}

/** …and back. Answers null for anything that is not a key. */
export function parseMember(key) {
  const text = typeof key === 'string' ? key : '';
  const at = text.indexOf(MEMBER_SEP);
  if (at < 0) return null;
  return { unitId: text.slice(0, at), elementRef: text.slice(at + 1) };
}

/**
 * What a click on a PIECE does to the selection, across cabinets.
 *
 * Exactly `applySelection`, on keys. A plain click starts a fresh set; Ctrl (or
 * ⌘) adds and removes — and it no longer matters which cabinet the piece is in.
 */
export function applyMemberSelection(current, unitId, elementRef, additive = false) {
  if (!unitId || !elementRef) return [];
  return applySelection(current, memberKey(unitId, elementRef), additive);
}

/**
 * The members of the set that live in ONE cabinet, as bare panel ids.
 *
 * What a `<UnitView>` needs: it draws its own pieces and knows nothing about
 * the cabinet next door. Returns a stable EMPTY array when this unit has none,
 * so a scene of twelve cabinets does not re-render eleven of them because a
 * fresh `[]` was handed down.
 */
const NO_MEMBERS = Object.freeze([]);

export function refsForUnit(keys, unitId) {
  if (!unitId || !(keys || []).length) return NO_MEMBERS;
  const out = [];
  for (const k of keys) {
    const m = parseMember(k);
    if (m && m.unitId === unitId) out.push(m.elementRef);
  }
  return out.length ? out : NO_MEMBERS;
}

/** Every member, as `{unitId, elementRef}` — what a group EDIT walks. */
export function membersOf(keys) {
  return (keys || []).map(parseMember).filter(Boolean);
}

/** The cabinet the single-unit panels are about: the last one touched. */
export function primaryOf(ids) {
  const list = (ids || []).filter(Boolean);
  return list.length ? list[list.length - 1] : null;
}

/** Is this cabinet in the selection? */
export function isSelected(ids, id) {
  return Boolean(id) && (ids || []).includes(id);
}

/**
 * ─── The PAIR (turn 14, CLAUDE.md F1.1) ─────────────────────────────────────
 *
 * Two invariants that have been taking it in turns to be broken for three
 * turns, and they are one question asked from one place:
 *
 *   (a) click on a wall or the floor → the selection empties;
 *   (b) click on a cabinet THROUGH a wall → that cabinet is selected.
 *
 * Turn 11 built (a) — the canvas's own `onPointerMissed` fires only when the
 * ray hits NOTHING, and a wall is something, so the room's surfaces had to say
 * so themselves. Turn 13 found that (a) had eaten (b): the walls are
 * double-sided and the camera stands outside the front one, so EVERY click in
 * the application passes through a wall, and the room was clearing the
 * selection a moment before the cabinet set it. Its fix — "am I the ONLY kind
 * of thing in this ray?" — swung the pendulum back and broke (a), because the
 * ray does not stop at the surface that was clicked: it carries on through the
 * floor and out under the cabinets standing on it. Measured in a browser: a
 * click on the floor in front of a base unit lists that unit's outline lines at
 * 6514 mm, more than a metre BEHIND the floor hit at 5197, and the room
 * therefore refused a click that was unambiguously on the floor.
 *
 * The question that holds both at once is neither "was I nearest" nor "was I
 * alone" but "is there furniture IN FRONT OF ME" — nothing behind the surface I
 * am can have been what the eye was pointing at. Distances, not membership.
 *
 * The other half of the pair lives in the view and is the same physical fact:
 * a wall the camera is BEHIND is not drawn, so it must not be clickable either
 * (3d/Room.jsx). three's raycaster ignores `visible` — it walks the graph and
 * asks the geometry — so a hidden wall answers pointer events unless it is told
 * not to, and it is the hidden FRONT wall that makes (b) hard in the first
 * place. With it out of the ray, a cabinet is always the nearest thing on the
 * way to the wall behind it, and both invariants fall out of one rule.
 *
 * @param {Array} intersections  the R3F event's own list (sorted, nearest first)
 * @param {number} distance      how far away the surface handling the event is
 * @param {number} tolerance     metres of slack, so a coincident hit counts as
 *                               "in front" rather than as a floating-point race
 * @returns {boolean} true when this click belongs to the room
 */
export function roomClickIsBackground(intersections, distance, tolerance = 1e-4) {
  const mine = Number.isFinite(Number(distance)) ? Number(distance) : Infinity;
  for (const hit of intersections || []) {
    // Behind the surface that was clicked: it cannot be what was pointed at.
    if (Number(hit?.distance) > mine + tolerance) continue;
    for (let o = hit?.object; o; o = o.parent) {
      if (o.userData?.ccUnitId) return false;
    }
  }
  return true;
}

/**
 * One value over many objects: the value if they all agree, MIXED if they do
 * not, and null when there is nothing to ask.
 *
 * The whole point of the `mixed` flag is the WRITE side. A `<select>` showing
 * "mixed" that posts its own value on the first render would set six cabinets
 * to whatever the first option happens to be — so the flag travels with the
 * value and the component refuses to write until a human picks something.
 *
 * @param {Array} objects
 * @param {Function} read   object → the value to compare
 * @returns {{value:any, mixed:boolean, empty:boolean}}
 */
export function commonValue(objects, read) {
  const list = objects || [];
  if (!list.length) return { value: null, mixed: false, empty: true };
  const first = read(list[0]);
  const key = (v) => (v === undefined ? null : v);
  for (const o of list.slice(1)) {
    if (key(read(o)) !== key(first)) return { value: null, mixed: true, empty: false };
  }
  return { value: key(first), mixed: false, empty: false };
}

/**
 * What a shared field shows: its value, or the word.
 *
 * One place, so "mixed" is spelled the same in every editor — and so a caller
 * cannot accidentally show an empty box for a genuine null.
 */
export const MIXED = 'mixed';

export function fieldValue({ value, mixed, empty }) {
  if (empty) return '';
  if (mixed) return MIXED;
  return value == null ? '' : value;
}
