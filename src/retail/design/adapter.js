// ─── F4 · THE ADAPTER — THE ONLY PLACE RETAIL SPEAKS ENGINE ────────────────
//
// CLAUDE.md F4, verbatim:
//
//   *"Every control maps to the engine's existing params through ONE adapter
//   (`src/retail/design/adapter.js`): retail choice → the store's own update
//   functions. The adapter is the only place retail speaks engine. Bounds come
//   from the profile's own limits (`src/engine/profile.js`), never typed into
//   retail. Refusals come from the engine's own reasons, never from strings
//   typed into retail."*
//
// And the iron rule above it (Petros, 30.08): *"engine numbers do not enter a
// UI without the owner's order."* So nothing below returns a raw parameter to
// a component. A component asks for a CHOICE — "what widths may I offer", "may
// I offer four doors" — and gets a bounded answer with the engine's own reason
// attached when the answer is no.
//
// ─── WHERE EACH ANSWER COMES FROM ──────────────────────────────────────────
//
// BOUNDS: `getCabinetProfile()` — the live profile, not the frozen default, so
// a workshop that changes its own numbers changes what the client may ask for.
// REFUSALS: an engine PREDICATE decides every one of them, named in the comment
// beside it. Where the shared core also authors the SENTENCE — the watch/shoe
// exclusion, the watch-insert fit — that sentence is passed through verbatim
// and never paraphrased; `reasons.js` carries the client-facing wording only
// for the predicates that answer in a boolean.

import { getCabinetProfile } from '../../engine/profile.js';
import {
  clampOpening, DEFAULT_ROOM, OPENING_DEFAULTS, openingsOnWall,
  rectCorners, wallIndicesInScope, wallWidth,
} from '../../engine/room.js';
import { CHECKS, wideFrontMm } from '../../engine/checks.js';
import { doorCountFor } from '../../engine/cabinet.js';
import { FRONT_STYLE_OPTIONS, normaliseScope } from '../../engine/design.js';
import { carcassSources, frontSources } from '../../engine/projectSettings.js';
import { HANDLE_TYPES } from '../../engine/handles.js';
// T61 F3: the top box's own two engine answers — the type's defaults and the
// room's refusal — both read rather than retyped.
import { defaultParamsFor, getUnitType } from '../../engine/types.js';
import { riderBornHeight } from '../../engine/roomFit.js';
import { decorById, decorLabel, finishIdForDecor } from '../../engine/decors.js';
import { useProjectStore } from '../../stores/projectStore.js';
import { useUiStore } from '../../stores/uiStore.js';
import {
  elementKind, elementLabel, isSelectableElement,
} from '../../engine/elements.js';
import { WATCH_FINISHES, WATCH_LAYOUTS } from '../../engine/watchDrawer.js';
import { shoeInsertSpec } from '../../engine/shoeInsert.js';
import { fieldFromPos, posFromField } from '../../engine/shelfHeights.js';
import { RAIL_MOUNT } from '../../engine/railAssembly.js';
import { COLLECTIONS, collectionById } from './collections.js';
import { REASONS } from './reasons.js';

const P = () => getCabinetProfile();
const S = () => useProjectStore.getState();
const U = () => useUiStore.getState();

/**
 * THE WARDROBE THE COLUMNS ARE ABOUT.
 *
 * ─── TURN 61 (CLAUDE.md F2): IT LEARNS PLURALITY, MINIMALLY ────────────────
 *
 * *"selected unit first, wall-0 wardrobe as fallback."* Two walls means two
 * wardrobes, and every panel that took `units[0]` would have gone on editing
 * the first one while the client was looking at the second.
 *
 * WHAT IT IS NOT: a second selection model. The selection is the shared ui
 * store's own (`selectedElement.unitId`) — the same one `resolveSelection`
 * reads and the same one a click on the stage writes — so there is one answer
 * to "which wardrobe" and this reads it rather than keeping another.
 *
 * A TOP BOX IS NEVER THE ANSWER (F3). A rider is a unit like any other and can
 * be selected and edited through its own menu, but the OPTIONS column asks
 * about the wardrobe it stands on: LAYOUT's width, INTERIOR's rows and
 * DETAILS' plinth are all the main's. So a selected rider resolves to its host.
 */
export const designUnit = (units) => {
  const list = Array.isArray(units) ? units : [];
  if (!list.length) return null;
  const mains = list.filter((u) => !u.params?.rides_on);
  const pool = mains.length ? mains : list;
  const selected = U().selectedElement?.unitId || null;
  const found = selected ? list.find((u) => u.id === selected) : null;
  // A rider hands the question to its host — see the note above.
  const host = found?.params?.rides_on
    ? list.find((u) => u.id === found.params.rides_on) || null
    : found;
  if (host && !host.params?.rides_on) return host;
  // The fallback is the wardrobe on the LOWEST wall, at the start of it — which
  // on a one-wall project is `units[0]` and nothing has moved.
  return [...pool].sort((a, b) => ((a.position?.wall ?? 0) - (b.position?.wall ?? 0))
    || ((a.position?.x_mm ?? 0) - (b.position?.x_mm ?? 0)))[0] || null;
};

// ─── BOUNDS — every one read off the profile ───────────────────────────────

/**
 * What the client may ask for. Nothing here is a literal except the two the
 * brief itself fixes for the ROOM (F4.1: wall 600–4000, ceiling 2000–3000),
 * which the engine has no opinion about — a room is not a cabinet, and
 * `engine/room.js` bounds neither. Those two are flagged in the report.
 */
export function designBounds() {
  const p = P();
  return {
    wall: { min: 600, max: 4000, step: 10, from: 'retail (the engine bounds no room)' },
    ceiling: { min: 2000, max: 3000, step: 10, from: 'retail (the engine bounds no room)' },
    wardrobeHeight: { min: p.wardrobe.minHeight, from: 'profile.wardrobe.minHeight' },
    depths: [450, 600, 650],
    drawerFront: {
      min: p.wardrobe.drawers.minFrontHeight,
      max: p.wardrobe.drawers.maxFrontHeight,
      standard: p.wardrobe.drawers.frontHeight,
      from: 'profile.wardrobe.drawers',
    },
    drawerCount: { max: p.wardrobe.drawers.maxCount, from: 'profile.wardrobe.drawers.maxCount' },
    // THE SHAKER FRAME IS THE PROFILE'S OWN BLOCK — `front.types.S`. NARROW is
    // its floor rounded to something a person would say out loud; STANDARD is
    // the width the workshop actually cuts (`frameWidth`, 60 — `legacyFrameWidth`
    // is 70 and is read only when an OLD job is opened, T34).
    shakerFrame: {
      narrow: Math.max(p.front.types.S.frameMin, 40),
      standard: p.front.types.S.frameWidth,
      min: p.front.types.S.frameMin,
      max: p.front.types.S.frameMax,
      from: 'profile.front.types.S',
    },
    wideFront: wideFrontMm(p),
    // The engine's own face-door law: one leaf up to here, two above it.
    singleDoorMax: p.doors.singleDoorMaxWidth,
    defaults: p.wardrobe.defaults,
  };
}

// ─── THE FRONT STYLES THE ENGINE HAS ───────────────────────────────────────

/**
 * F4.3: *"SLAB · SHAKER · J-PULL — the three the engine has today; GROOVED and
 * ARCHED disabled 'coming soon'."* The ids and labels come from
 * `FRONT_STYLE_OPTIONS`; which three are LIVE is the brief's own decision and
 * is stated here once.
 */
const LIVE_STYLES = ['F', 'S', 'HJ'];
const SOON_STYLES = ['G', 'A'];

export const frontStyles = () => [...LIVE_STYLES, ...SOON_STYLES].map((id) => {
  const option = FRONT_STYLE_OPTIONS.find((o) => o.id === id);
  return {
    id,
    label: id === 'F' ? 'SLAB' : (id === 'HJ' ? 'J-PULL' : String(option?.label || id).toUpperCase()),
    engineLabel: option?.label || id,
    soon: SOON_STYLES.includes(id),
    reason: SOON_STYLES.includes(id) ? REASONS.styleComingSoon : '',
  };
});

// ─── THE HANDLE SYSTEMS THE ENGINE OFFERS ──────────────────────────────────

/**
 * `HANDLE_TYPES` plus NONE, which the engine spells `null` (`normaliseHandle`
 * returns null for anything that is not bar, knob or jpull, and F4.5 asks for
 * the choice to be sayable).
 */
export const handleSystems = () => [
  ...HANDLE_TYPES.map((h) => ({ id: h.id, label: h.label.toUpperCase(), hint: h.hint })),
  { id: 'none', label: 'NONE', hint: 'No handle at all — the front is pushed' },
];

// ─── THE DECORS A COLLECTION NAMES ─────────────────────────────────────────

/** A swatch the client can see: the decor's own colour and EGGER's own label. */
export function swatchFor(decorId) {
  const decor = decorById(decorId) || null;
  return {
    id: decorId,
    hex: decor?.hex || null,
    // The EGGER licence asks for brand + code + name NEXT TO the image,
    // unconditionally. `decorLabel` is the app's one attribution string and
    // there is no unattributed path through this function.
    label: decor ? decorLabel(decor) : decorId,
    finishId: decor ? finishIdForDecor(decor) : null,
    known: Boolean(decor),
  };
}

// ─── WRITES — every one a call into the store's own actions ────────────────

/** F3.7: a fresh, memory-only design. The store is already in `persistence: 'none'`. */
export function startDesign(name = 'Bedroom wardrobe') {
  const store = S();
  store.newProject(name, { number: '', client: '' });
  // ─── T60 · IT IS A WARDROBE PROJECT, AND IT HAS TO SAY SO ────────────────
  //
  // MEASURED FAULT. `projectDepth` (engine/projectSettings.js) hands back
  // `profile.wardrobe.defaults.depth` ONLY when `design.projectType` is
  // 'wardrobe'; `newProject` leaves it null, so every retail wardrobe was born
  // at the BASE UNIT's 558 mm instead of the wardrobe's own 568 — and t59's
  // depth chips (450 / 600 / 650) therefore matched nothing on the first frame
  // a client ever saw. One word, said through the store's own setter.
  // ─── T61 F2 · …AND IT IS ONE WALL, WHICH IT HAS ALWAYS SAID IT WAS ──────
  //
  // MEASURED FAULT, found in the acceptance walk's own frames rather than by
  // reading. `newProject` leaves the migrator's default scope, `'room'` — so a
  // fresh design stood in a FOUR-WALLED box while column 1's hint said
  // *"4000 mm wall"* and F2's WALLS chip said `1`. The chip was not lying about
  // its own state: `wallChoice` reads anything that is not `'two'` as one wall.
  // The STORE was the thing out of step, and LAYOUT's new WALL row proved it by
  // offering four walls to stand a wardrobe against.
  //
  // So the scope is said, once, where the wardrobe is made. The chips write
  // `'wall'` and `'two'`; this is the same word for the same reason, and it is
  // what a client has been shown a wall's worth of since t59.
  store.setDesign({ projectType: 'wardrobe', scope: 'wall' });
  const p = P();
  // `addUnit` answers `{ id, error, wall }` — the room may refuse a placement,
  // and a caller that treated the whole verdict as an id would then pass an
  // object everywhere a unit id was wanted.
  const placed = store.addUnit('WARDROBE', {
    params: { width: p.wardrobe.defaults.width, height: p.wardrobe.defaults.height },
  });
  // AGAINST THE WALL, at its start. `addUnit` drops a cabinet where a joiner
  // would want it — in the middle of the room, beside whatever is already
  // there — and for PRO that is right. Here there is one wardrobe and the wall
  // IS its space: left in the middle, the store clamps its width to the gap
  // and says so ("Width limited to 1260 mm by the infill at the wall"), which
  // is a true sentence about a placement the client never asked for.
  if (placed?.id) store.moveUnit(placed.id, 0, 1);

  // ─── AND IT ARRIVES WITH ITS DOORS ON ────────────────────────────────────
  //
  // A wardrobe's `params.doors` starts false, so a fresh one is an open
  // carcass — while column 1's hint already says "1 door", because a bay with
  // no divider IS one bay. The client would be told one thing and shown
  // another on the first frame they ever see. `setDoorCount` asks the engine
  // for the count its own width law gives (one leaf up to 700 mm, a pair
  // above), so the picture and the words agree from the start.
  if (placed?.id) setDoorCount(placed.id, 1);
  return placed?.id || null;
}

/**
 * The project's first front and carcass type.
 *
 * A brand-new project has an EMPTY `design.fronts.types` — the list is grown by
 * `setFrontTypeCount` the first time somebody answers a question about a front,
 * and the id it gives the first one is `f1`. So this names the slot that is
 * about to exist rather than reading one that does not.
 */
const frontTypeId = (design) => design?.fronts?.types?.[0]?.id || 'f1';
const carcassTypeId = (design) => design?.carcass?.types?.[0]?.id || 'c1';

/**
 * WHICH SOURCE A DECOR IS, ASKED RATHER THAN ASSUMED.
 *
 * `setFrontType` DROPS a `finish_id` when the source it is given does not take
 * a facing — which is right, and which silently threw away every collection's
 * front decor until a test caught it, because the source is not called 'decor'.
 * The front list calls it `laminate` and the carcass list calls it `egger`. So
 * this asks the engine's own source lists for the one whose picker IS a decor,
 * and a workshop that renames its sources tomorrow renames nothing here.
 */
const decorSourceId = (list) => list.find((src) => src.picker === 'decor')?.id || null;

/**
 * F4.1 · YOUR SPACE — the wall and the ceiling.
 *
 * ─── TURN 61 (CLAUDE.md F2): …AND THE SECOND WALL, BY THE SAME LAW ─────────
 *
 * `rectCorners(width, depth)` puts corner 1 at `(W, 0)` and corner 2 at
 * `(W, D)`. So wall 0's length IS the first argument and wall 1's length IS the
 * second — the number this function has been reading back as the room's DEPTH
 * and handing straight back in since t59. WALL 2 WIDTH is therefore not a new
 * write: it is the argument that was always there, given a name and a field.
 */
export function setSpace({ wallMm, ceilingMm, wall2Mm }) {
  const store = S();
  const room = store.project.room || DEFAULT_ROOM;
  const wall = Math.round(Math.abs(room.corners?.[1]?.x ?? 3000));
  const depth = Math.max(600, Math.round(Math.abs(room.corners?.[2]?.y ?? 3000)));
  const patch = {};
  const nextWall = Number.isFinite(wallMm) ? Math.round(wallMm) : wall;
  const nextDepth = Number.isFinite(wall2Mm) ? Math.round(wall2Mm) : depth;
  if (Number.isFinite(wallMm) || Number.isFinite(wall2Mm)) {
    patch.corners = rectCorners(nextWall, nextDepth);
  }
  if (Number.isFinite(ceilingMm)) patch.height = Math.round(ceilingMm);
  const verdict = store.setRoom(patch);
  // A wall that has just changed length is a wall the wardrobe should still be
  // standing at the start of. T61: ONE per wall — the wardrobe nearest that
  // wall's start — so a second wardrobe on a wall keeps the place it was put
  // in rather than being shoved onto its neighbour by a resize.
  if (verdict?.ok !== false) {
    const first = new Map();
    for (const u of store.units) {
      if (u.params?.rides_on) continue;          // riders settle on their host
      const w = u.position?.wall ?? 0;
      const at = u.position?.x_mm ?? 0;
      if (!first.has(w) || at < first.get(w).at) first.set(w, { id: u.id, at });
    }
    for (const { id } of first.values()) store.moveUnit(id, 0, 1);
  }
  return verdict;
}

// ═══════════════════════════════════════════════════════════════════════════
// T61 F2 · TWO WALLS — AND CABINETS THAT STAND ON EITHER
// ═══════════════════════════════════════════════════════════════════════════
//
// The owner: *"zrob 2 sciany, Elki bedziemy dokaldac"* · *"2 tak wystarczy"*.
// TWO, and no corner carcass — the L-shape stays parked, so each wall carries
// its own run and nothing is cut where they meet.
//
// EVERY ANSWER BELOW IS THE ENGINE'S OR THE STORE'S. The scope vocabulary is
// `engine/design.js ROOM_SCOPES`; which walls a scope shows is
// `engine/room.js wallIndicesInScope`; moving a wardrobe round the corner is
// `projectStore.setUnitWall`, refusal sentence and all; putting a new one on an
// empty wall is `projectStore.addUnit` followed by that same move. Retail
// writes no geometry and authors no sentence.

/** The project's scope, through the vocabulary's own gate. */
export const roomScope = (project) => normaliseScope(project?.design?.scope);

/**
 * WALLS — the chip row's two answers.
 *
 * `'wall'` and `'two'`, never `'room'`: a client is designing against the wall
 * their wardrobe stands on, and t59's room has never offered the four-walled
 * box. What `startDesign` leaves behind is the migrator's `'room'` default, so
 * the row also SHOWS `1` for it — one wall is what the client is looking at.
 */
export const WALL_CHOICES = Object.freeze([
  { id: 'wall', label: '1' },
  { id: 'two', label: '2' },
]);

/** Which chip is lit. Anything that is not `'two'` reads as one wall. */
export const wallChoice = (project) => (roomScope(project) === 'two' ? 'two' : 'wall');

/**
 * Hand the room a scope. `setDesign` migrates on the way in, so a word the
 * vocabulary does not know cannot get stored — and the units do not move: a
 * wardrobe on wall 1 stays on wall 1 whether or not the wall is drawn, exactly
 * as it does in PRO when a joiner switches back to the whole room.
 */
export function setWallCount(id) {
  S().setDesign({ scope: id === 'two' ? 'two' : 'wall' });
  return wallChoice(S().project);
}

/** The wall indices this scope draws — `[0]` or `[0, 1]`. The engine's list. */
export const wallsShown = (project, room) => wallIndicesInScope(
  room || project?.room || DEFAULT_ROOM,
  roomScope(project),
  P(),
);

/** How long one wall is, in millimetres, off the room's own corners. */
export const wallLengthMm = (room, index = 0) => Math.round(
  wallWidth(room || DEFAULT_ROOM, index),
);

/** The MAIN cabinets standing on one wall. A rider stands on its host, not a wall. */
export const unitsOnWall = (wallIndex) => S().units
  .filter((u) => !u.params?.rides_on && (u.position?.wall ?? 0) === wallIndex);

/** Which wall a unit stands on (1-based, for a person). */
export const unitWall = (unitId) => (unitOf(unitId)?.position?.wall ?? 0);

/**
 * MOVE A WARDROBE ROUND THE CORNER.
 *
 * `projectStore.setUnitWall` is the whole law: it looks for a free slot on the
 * wall asked for, and where there is none it REFUSES with its own sentence
 * (*"Wall 2 has no free space for this unit — move or remove something there
 * first."*) rather than dropping the cabinet into a neighbour. Passed through
 * verbatim; retail does not paraphrase it and does not pre-empt it.
 *
 * @returns {{ok:boolean, said:string}}
 */
export function setUnitWall(unitId, wallIndex) {
  const verdict = S().setUnitWall(unitId, wallIndex);
  if (!verdict) return { ok: false, said: '' };
  return { ok: !verdict.blocked, said: verdict.error || '' };
}

/**
 * ADD WARDROBE ON WALL 2 — the store's own add, then the store's own move.
 *
 * `addUnit` has no `wall` option: it places a cabinet in the first wall with
 * room, starting at wall 0. So the wall is asked for afterwards, through the
 * same `setUnitWall` the chip row uses — one law for "which wall", not two —
 * and a wall with no room refuses in its own words, with the unit taken back
 * out so a refusal leaves nothing behind.
 *
 * The defaults are `startDesign`'s, because a second wardrobe is the same
 * wardrobe: the profile's width and height, seated at the wall's start, with
 * the engine's own door count on it.
 *
 * @returns {{ok:boolean, id:string|null, said:string}}
 */
export function addWardrobeOnWall(wallIndex) {
  const store = S();
  const p = P();
  const placed = store.addUnit('WARDROBE', {
    params: { width: p.wardrobe.defaults.width, height: p.wardrobe.defaults.height },
  });
  if (!placed?.id) return { ok: false, id: null, said: placed?.error || '' };
  const moved = store.setUnitWall(placed.id, wallIndex);
  if (moved?.blocked) {
    // Nothing half-done: the wall refused, so the wardrobe that was made for it
    // goes back out. A cabinet left standing on wall 1 is not what was asked
    // for, and a client would have to find and delete it.
    store.removeUnit(placed.id);
    return { ok: false, id: null, said: moved.error || '' };
  }
  store.moveUnit(placed.id, 0, 1);
  setDoorCount(placed.id, 1);
  return { ok: true, id: placed.id, said: '' };
}

// ═══════════════════════════════════════════════════════════════════════════
// T61 F6 · WINDOWS AND DOORS — DRAWN, AND NOTHING MORE
// ═══════════════════════════════════════════════════════════════════════════
//
// The owner: *"skosy, okna, drzwi trzeba bedzie dodac"*, and the decision that
// scopes it: *"3 — narazie sie rysuja"*. They DRAW. Nothing fits around them
// tonight — a wardrobe may stand across a window and nothing complains, which
// is the owner's explicit "na razie" and is named as a known gap in the PR body
// rather than quietly left for somebody to find.
//
// ─── THE SHAPE IS THE LAW; THE PRO COMPONENT IS NOT IMPORTED ───────────────
//
// `components/WallElevationModal.jsx` is read, not used. What is taken from it
// is the WRITE PATTERN, and it is taken exactly:
//
//   1. a new opening spreads `OPENING_DEFAULTS[kind]`, centred on its wall
//      (`x_mm = wallWidth / 2 - width / 2`), and goes through `clampOpening`
//      BEFORE it is stored;
//   2. every write is a WHOLE-LIST replacement handed to `store.setRoom`, so
//      it passes `migrateRoom` and `roomChangeGuard` — never the store's three
//      bare `addOpening` / `updateOpening` / `removeOpening` setters, which
//      skip both. PRO's two editors avoid them for the same reason.
//   3. a refusal is the verdict's own `message`, shown verbatim.
//
// The id is made HERE and not imported: `lib/wallElements.js newElementId` is
// PRO's zone (`turn59-f1-the-switch.test.js` sorts `src/lib` as `pro`, by name),
// so retail may read its grammar and may not import it. Same grammar, one line.

const openingId = () => `op_${Math.random().toString(36).slice(2, 9)}`;

/** THE OPENINGS, clamped, on the walls this scope actually draws. */
export function roomOpenings(project, room) {
  const live = room || project?.room || DEFAULT_ROOM;
  return wallsShown(project, live)
    .flatMap((wall) => openingsOnWall(live, wall).map((o) => ({ ...o, wall })));
}

/** What a new opening of this kind starts as — the engine's own numbers. */
export const openingDefaults = (kind) => OPENING_DEFAULTS[kind === 'door' ? 'door' : 'window'];

/**
 * ADD A WINDOW / ADD A DOOR. Centred on the wall, clamped, then the room.
 *
 * @returns {{ok:boolean, id:string|null, said:string}}
 */
export function addOpening(kind, wallIndex = 0) {
  const store = S();
  const room = store.project.room || DEFAULT_ROOM;
  const d = openingDefaults(kind);
  const width = wallWidth(room, wallIndex);
  const opening = clampOpening({
    id: openingId(),
    kind: kind === 'door' ? 'door' : 'window',
    wall: wallIndex,
    x_mm: Math.max(0, width / 2 - d.width / 2),
    ...d,
  }, room);
  const verdict = store.setRoom({ openings: [...(room.openings || []), opening] });
  if (verdict?.ok === false) return { ok: false, id: null, said: verdict.message || '' };
  return { ok: true, id: opening.id, said: '' };
}

/**
 * EDIT ONE. The patch goes through `clampOpening` against the live room, which
 * is where the engine's own limits live — never past either end of the wall,
 * never taller than the room, a door always on the floor.
 *
 * @returns {{ok:boolean, said:string}}
 */
export function setOpening(id, patch) {
  const store = S();
  const room = store.project.room || DEFAULT_ROOM;
  const next = (room.openings || []).map((o) => (o.id === id
    ? clampOpening({ ...o, ...patch }, room) : o));
  const verdict = store.setRoom({ openings: next });
  if (verdict?.ok === false) return { ok: false, said: verdict.message || '' };
  return { ok: true, said: '' };
}

/** REMOVE. A room with one less hole in it cannot refuse. */
export function removeOpening(id) {
  const store = S();
  const room = store.project.room || DEFAULT_ROOM;
  const verdict = store.setRoom({
    openings: (room.openings || []).filter((o) => o.id !== id),
  });
  return { ok: verdict?.ok !== false, said: verdict?.message || '' };
}

/**
 * THE FOUR FIELDS' ENDS, and every one is `clampOpening`'s own arithmetic read
 * back rather than a second copy of it: from-the-left runs to `wallW - width`,
 * width to the wall, height to what is left over the sill, and the sill to
 * 100 mm short of the ceiling. F5's fields refuse outside these; the engine
 * would have clamped silently, and a typed number must never be quietly moved.
 */
export function openingBounds(opening, room) {
  const live = room || S().project.room || DEFAULT_ROOM;
  const wallW = Math.round(wallWidth(live, opening?.wall ?? 0));
  const roomH = Math.round(Number(live.height) || 2500);
  const width = Math.round(Number(opening?.width) || 0);
  const sill = Math.round(Number(opening?.sill) || 0);
  return {
    x_mm: { min: 0, max: Math.max(0, wallW - width) },
    width: { min: 100, max: wallW },
    height: { min: 100, max: Math.max(100, roomH - sill) },
    sill: { min: 0, max: Math.max(0, roomH - 100) },
    from: 'engine/room.js clampOpening',
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// T61 F1 · WHERE A `+` GOES
// ═══════════════════════════════════════════════════════════════════════════
//
// The marker is drawn again in the client's room (channel `plus`), and a marker
// that is drawn must DO something. PRO's answer is `openLibraryToInsert` — the
// LIBRARY panel, filtered to the neighbour's own category, in `src/components`
// and on the far side of the iron boundary. Retail has no library surface
// tonight (the RAIL rebuild is the owner's next green point, not this turn's),
// so the plus adds the NEIGHBOUR'S OWN TYPE through the very call the library
// makes — `addUnit(type, { near, side })`, the same `{ near, side }` PRO hands
// it. Same category, its default member; no target invented.
//
// A top box's plus therefore adds another top box beside it, which is T53 F5's
// own law reached without retail knowing it exists: `addUnit` reads the clicked
// box's host and refuses in its own words when there is no room on that side.

/**
 * @param {{unitId:string, side:'left'|'right'}} point  `engine/runs.js addPlusPoints`
 * @returns {{ok:boolean, id:string|null, said:string}}
 */
export function addBesidePlus(point) {
  const near = unitOf(point?.unitId);
  if (!near) return { ok: false, id: null, said: '' };
  const placed = S().addUnit(near.type, { near: near.id, side: point.side });
  if (!placed?.id) return { ok: false, id: null, said: placed?.error || '' };
  U().selectUnit?.(placed.id);
  return { ok: true, id: placed.id, said: '' };
}

// ═══════════════════════════════════════════════════════════════════════════
// T61 F3 · THE TOP BOX
// ═══════════════════════════════════════════════════════════════════════════
//
// The owner, asked where a top box gets added: *"4 add top"* — a button on the
// selected wardrobe. NOTHING NEW IN THE ENGINE: `engine/topBox.js` has held the
// whole relationship since T36 — `WARDROBE_TOP`, `params.rides_on`,
// `settleRiders`, several riders per host since T53, orphan check #14, and the
// room's refusal since T50.
//
// THE ADD IS `addUnit('WARDROBE_TOP', { near: hostId })`, which is the call
// PRO's `components/LibraryPanel.jsx:123` makes from the wardrobe tile — the
// same one, with the host named. Everything a box needs is written INSIDE that
// action: `rides_on`, `rides_offset_mm`, the host's width, the born-fitted
// height, the depth, the host's own `ridden_by`, and the layout settle. Retail
// passes no `params` at all, because `profile.wardrobe.topBox.defaults` is
// already what `defaultParamsFor` applies.

/**
 * THE UNIT A SELECTION IS ABOUT.
 *
 * T61 F3: `Detail` handed every menu the OPTIONS column's wardrobe, which was
 * the same unit as the selection's for as long as there was one wardrobe. A top
 * box is a unit of its own, and a menu opened on it would have been editing the
 * cabinet underneath — so the router asks for the selection's own unit now.
 */
export const unitById = (unitId) => unitOf(unitId);

/** Is this unit a rider — a box standing on something? The engine's own test. */
export const isTopBox = (unit) => Boolean(unit && getUnitType(unit.type)?.ridesOn);

/**
 * MAY A BOX GO ON THIS WARDROBE — asked BEFORE the press, in the engine's words.
 *
 * `riderBornHeight` is the predicate `addUnit` itself uses, and it is PURE: it
 * takes the room, the host and the profile and answers with the sentence the
 * add would have refused with. So the greyed button carries the refusal the
 * press would have produced, word for word, and there is ONE reading of the
 * ceiling rather than a retail copy of it.
 *
 * *"Where the room refuses (over the ceiling), the button greys with the
 * store's sentence verbatim. No silent clamp."* — a box that merely does not
 * fit is BORN FITTED and says nothing, which is T50's law and not a clamp
 * retail invented: nobody typed that height.
 *
 * @returns {string} the engine's sentence, or '' when a box may go on
 */
export function topBoxRefusal(hostId) {
  const host = unitOf(hostId);
  if (!host) return '';
  if (isTopBox(host)) return REASONS.topBoxOnTopBox;
  const p = P();
  const born = riderBornHeight({
    // THE TYPE MATTERS AS MUCH AS THE PARAMS. `roomFit.floorOf` asks
    // `getUnitType(unit.type).ridesOn` before it will read the host's top; a
    // params-only object answers `undefined` there and the box is measured off
    // the FLOOR instead of off the wardrobe — which is 2100 mm of headroom
    // where there is none, and a button that never greys. Found by the test
    // below rather than by reading.
    unit: { type: 'WARDROBE_TOP', params: defaultParamsFor('WARDROBE_TOP', p) },
    host,
    room: S().project.room,
    profile: p,
    minHeight: p.wardrobe.topBox.minHeight,
  });
  return born.refuse || '';
}

/**
 * ADD TOP BOX. One store call, and its refusal read off the return value.
 *
 * `addUnit` answers `{ id, error }` and does NOT push the sentence through the
 * message queue — PRO reads the return and notifies itself
 * (`LibraryPanel.jsx:128`) — so `lastEngineWord()` would never see it. Read
 * here, from where the shared core actually put it.
 *
 * @returns {{ok:boolean, id:string|null, said:string}}
 */
export function addTopBox(hostId) {
  const host = unitOf(hostId);
  if (!host) return { ok: false, id: null, said: '' };
  const placed = S().addUnit('WARDROBE_TOP', { near: host.id });
  if (!placed?.id) return { ok: false, id: null, said: placed?.error || '' };
  U().selectUnit?.(placed.id);
  return { ok: true, id: placed.id, said: '' };
}

/** Every box standing on this wardrobe — the store's own link, read back. */
export const topBoxesOn = (hostId) => S().units.filter((u) => u.params?.rides_on === hostId);

/** REMOVE, from the box's own menu. The store re-settles the rest for itself. */
export const removeUnit = (unitId) => S().removeUnit(unitId);

/**
 * F4.1 · THE SLOPED CEILING.
 *
 * *"SLOPED CEILING (chip off/on; on → two sliders 'height at the left wall /
 * at the right wall', drawn as the room's rake — the existing `slope_cut` law
 * then does everything: forced hinges, the door partition, pull-down refusal,
 * LED trimming)."*
 *
 * Two heights over one wall become the wall element the store already
 * understands; every consequence is the engine's, and retail asks for none of
 * them by name.
 */
export function setSlope({ on, leftMm, rightMm }) {
  const store = S();
  const existing = (store.project.wallSlopes || []).find((s) => s.kind === 'slope');
  if (!on) {
    if (existing) store.removeWallSlope(existing.id);
    return null;
  }
  const room = store.project.room || DEFAULT_ROOM;
  const wall = Math.round(Math.abs(room.corners?.[1]?.x ?? 3000));
  const ceiling = Math.round(room.height || 2500);

  // ─── TWO HEIGHTS, INTO THE ENGINE'S OWN THREE NUMBERS ────────────────────
  //
  // The client is asked the question a person can answer with a tape measure:
  // how high is the ceiling at the left wall, and how high at the right. The
  // shared model is an ELEVATION — `{ side, startHeight, run }`: which side the
  // ceiling comes down on, how high it is where it meets that side wall, and
  // how far along the wall the rake runs before it reaches full height. So:
  //
  //   SIDE        whichever of the two heights is the lower one.
  //   startHeight that lower height.
  //   RUN         where the rake, climbing from `startHeight` towards the other
  //               height, crosses the ceiling. If the high side is already at
  //               the ceiling, that is the far wall and the run is the whole
  //               width; if it is short of the ceiling, the rake gets there
  //               sooner and the run is shorter in the same proportion.
  //
  // Every consequence after that is the ENGINE's: the forced hinges, the door
  // partition, the pull-down refusal, the trimmed LED. Retail asks for none of
  // them by name.
  const low = Math.min(Math.round(leftMm), Math.round(rightMm));
  const high = Math.min(ceiling, Math.max(Math.round(leftMm), Math.round(rightMm)));
  const side = Math.round(leftMm) <= Math.round(rightMm) ? 'L' : 'R';
  const rise = high - low;
  const run = rise <= 0 ? wall : Math.round(Math.min(wall, (wall * (ceiling - low)) / rise));

  const shape = {
    kind: 'slope', wall: 0, side, startHeight: low, run: Math.max(1, run),
  };
  if (existing) { store.updateWallSlope(existing.id, shape); return existing.id; }
  return store.addWallSlope(shape);
}

/** The two heights the sliders show, read back out of the engine's elevation. */
export function slopeHeights(project) {
  const slope = (project?.wallSlopes || []).find((s) => s.kind === 'slope') || null;
  const ceiling = Math.round(project?.room?.height || 2500);
  if (!slope) return { on: false, left: ceiling, right: ceiling };
  const wall = Math.round(Math.abs(project?.room?.corners?.[1]?.x ?? 3000));
  const low = Math.round(slope.startHeight);
  // Where the rake has climbed to by the far wall — capped at the ceiling,
  // because past `run` the ceiling is flat.
  const far = slope.run > 0
    ? Math.round(Math.min(ceiling, low + ((ceiling - low) * wall) / slope.run))
    : ceiling;
  return slope.side === 'L'
    ? { on: true, left: low, right: far }
    : { on: true, left: far, right: low };
}

/** F4.2 · LAYOUT. Width and depth go straight to the unit's own params. */
export function setWardrobeSize(unitId, patch) {
  return S().updateUnitParams(unitId, patch);
}

/**
 * F4.2 · DOORS — a COUNT, expressed the way the engine expresses it: one bay
 * per door, so `n` doors is `n - 1` full-height partitions, centred by the
 * store's own `centrePartitions`. Retail never places a partition by hand.
 */
export function setDoorCount(unitId, count) {
  const want = Math.max(1, Math.min(4, Math.trunc(count)));
  if (!S().units.find((u) => u.id === unitId)) return 0;

  // ─── WHAT MAKES A DOOR, IN THIS ENGINE ───────────────────────────────────
  //
  // Three separate facts, and a wardrobe wears the wrong number of leaves if
  // any one of them is missed. All three were, in turn, until a test asked.
  //
  //   1. `params.doors` says the carcass wears leaves AT ALL. A cabinet full
  //      of dividers and no doors cuts no fronts, however many bays it has.
  //   2. A partition only DIVIDES the doors when it is FLUSH. `addPartition`
  //      sets one back 20 mm — right for a shelf divider, invisible to
  //      `doorBays`, which counts only boundaries at `setback === 0`. So each
  //      one retail adds is brought forward to the face with `front_mm: 0`.
  //   3. `bay_doors` is what hangs a leaf IN each bay. Without it the unit
  //      falls back to its face doors and the engine's own width law decides
  //      the count — which for one leaf over 600 mm is two.
  //
  // EVERY read is a FRESH read: `getState()` hands back a SNAPSHOT, and a loop
  // that holds one while adding partitions never sees its own work. (It did
  // not: thirty-one dividers went in before a test counted them.)
  S().setDoors(unitId, true);

  const parts = () => (S().units.find((u) => u.id === unitId)
    ?.params.sections?.[0]?.items || []).filter((i) => i.kind === 'partition');

  let guard = 8;
  while (parts().length > want - 1 && guard > 0) {
    guard -= 1;
    S().removeItem(unitId, parts().slice(-1)[0].id);
  }
  guard = 8;
  while (parts().length < want - 1 && guard > 0) {
    guard -= 1;
    // ─── T61 F4 · THE THIRD COPY OF THIS LAW, DELETED ─────────────────────
    //
    // Point 2 above — add, then bring the divider forward to the face, then
    // re-centre — was written out in full HERE, again in `setBayCount`, and
    // would have been written a third time by F4's new INTERIOR row. Three
    // copies of one act is three answers to *"what may be added here"*, and the
    // standing question this turn has to answer with ONE. `addFlushPartition`
    // is that one, and all three doors now open onto it.
    if (!addFlushPartition(unitId)) break;   // the engine ran out of room
  }

  const bays = S().bayDoorsFor(unitId).length;
  S().setBayDoors(unitId, bays > 1
    ? Array.from({ length: bays }, () => ({ door: 'one', hinge: 'L' }))
    : null);
  return doorCount(unitId);
}

/**
 * HOW MANY DOORS THIS WARDROBE HAS, according to the engine.
 *
 * Counted off the computed result's own FRONT panels — the leaves that will
 * actually be cut — rather than off anything retail arranged to make them.
 */
export function doorCount(unitId) {
  const result = S().unitResult?.(unitId);
  return (result?.panels || []).filter((p) => p.part === 'FRONT').length;
}

/**
 * F4.2 · THE DOOR-WIDTH LAW, ASKED BEFORE THE CLICK.
 *
 * The engine's own number is `wideFrontMm(profile)` — profile.checks.wideFrontMm,
 * the owner's 600 — and its own words are CHECK #8's label. A count whose
 * leaves come out wider than that is refused, with the leaf width said out loud
 * so the client can see WHY four is offered and one is not.
 */
export function doorCountRefusal(widthMm, count) {
  const p = P();
  const width = Number(widthMm) || 0;

  // ─── A REFUSAL IS A REFUSAL; A WARNING IS NOT ────────────────────────────
  //
  // The engine has TWO laws about door width and they are not the same weight,
  // so retail must not treat them as one.
  //
  //   `doorCountFor(width, profile)` — engine/cabinet.js — IS the face-door
  //   law: one leaf while `width - widthDeduction <= singleDoorMaxWidth`, two
  //   above it. It is structural. Ask for one door on a 900 mm carcass and the
  //   engine cuts two whatever the chip said, so the chip is DISABLED.
  //
  //   CHECK #8 — `profile.checks.wideFrontMm`, the owner's 600 — is a YELLOW
  //   finding: *"consider 155°"*. It is advice about a hinge, not a refusal,
  //   and a chip greyed out over a yellow would be retail inventing a law the
  //   workshop does not have. It is a NOTE (`doorCountNote`), under an enabled
  //   chip, in the engine's own words.
  if (count === 1 && doorCountFor(width, p) !== 1) {
    return REASONS.oneDoorTooWide({ width, max: p.doors.singleDoorMaxWidth });
  }
  return '';
}

/** CHECK #8's advice, said under a chip the client may still press. */
export function doorCountNote(widthMm, count) {
  const p = P();
  const wide = wideFrontMm(p);
  const leaf = Math.round((Number(widthMm) || 0) / Math.max(1, count));
  if (leaf <= wide) return '';
  const check = CHECKS.find((c) => c.n === 8);
  return REASONS.doorTooWide({ leaf, wide, check: check?.label || 'Wide front' });
}

/** F4.3 · FRONT STYLE and the shaker frame. */
export function setFrontStyle(styleId) {
  const store = S();
  const design = store.project.design;
  store.setDesign({ fronts: { ...design.fronts, style: styleId } });
  store.setFrontType(frontTypeId(design), { style: styleId });
  return styleId;
}

export function setShakerFrame(mm) {
  const store = S();
  const design = store.project.design;
  store.setDesign({ fronts: { ...design.fronts, shakerFrame: Math.round(mm) } });
  return Math.round(mm);
}

/**
 * F4.3 · A COLLECTION IS A PRESET, applied through the store's own setters:
 * a front decor, a carcass decor and a handle default, and nothing else.
 */
export function applyCollection(collectionId) {
  const collection = collectionById(collectionId);
  if (!collection) return null;
  setFrontDecor(collection.frontDecor);
  setCarcassDecor(collection.carcassDecor);
  setHandle(collection.handle);
  return collection;
}

export function setFrontDecor(decorId) {
  const store = S();
  const s = swatchFor(decorId);
  if (!s.finishId) return null;
  const source = decorSourceId(frontSources(P()));
  if (!source) return null;
  store.setFrontType(frontTypeId(store.project.design), { source, finish_id: s.finishId });
  return s.finishId;
}

export function setCarcassDecor(decorId) {
  const store = S();
  const s = swatchFor(decorId);
  if (!s.finishId) return null;
  const typeId = carcassTypeId(store.project.design);
  const source = decorSourceId(carcassSources(P()));
  if (!source) return null;
  store.setCarcassSource(typeId, source);
  store.setCarcassFinish(typeId, s.finishId);
  return s.finishId;
}

/**
 * F4.5 · THE T57 LAW, said once.
 *
 * *"J-pull disables the others by the T57 law"* — `engine/handles.js`
 * `normaliseHandle` returns `{ type: 'jpull' }` with no centres, because there
 * is nothing screwed on to space. A project wearing a J-pull therefore cannot
 * also wear a bar, and the chip that would say otherwise is refused.
 */
export const REASON_JPULL = REASONS.jpullTakesNoHandle;

/** F4.5 · HANDLES. `none` is the engine's own `null`. */
export function setHandle(type) {
  return S().setProjectHandle(type === 'none' ? null : { type });
}

/** F4.5 · PLINTH — the wardrobe's own leg height. */
export function setPlinth(unitId, mm) {
  return S().updateUnitParams(unitId, { leg_height: Math.round(mm) });
}

/** F4.5 · LIGHTING — the shelf-strip law at its default depth. */
export function setLighting(on) {
  S().setLighting({ on: Boolean(on) });
  return lightingOn(S().project);
}

/**
 * Where the LED answer actually lives, and what it is called there.
 *
 * `project.design.lighting`, and the key is `on` — `migrateDesign` normalises
 * the block to `{ on, temperature, switch, items }` and quietly drops anything
 * else, so a patch of `{ enabled: true }` is a patch that vanishes. Asked once,
 * here, rather than guessed in four components.
 */
export const lightingOn = (project) => Boolean(project?.design?.lighting?.on);

// ─── F4.4 · THE INTERIOR ROWS ──────────────────────────────────────────────

/**
 * Each row is a kit the STORE knows how to add. Nothing here computes a
 * position: centred shelves are `addShelves`' own law (T58), a drawer stack is
 * `addDrawers`', the watch drawer's fixed height is `addWatchDrawer`'s, and
 * the pull-down is `addWardrobeKit('pulldown_rail')`.
 */
// ─── TURN 61 (CLAUDE.md F4): THE FULL ROW SET, 1:1 WITH PRO ────────────────
//
// The owner: *"dowozimy dla klientow musi bcy wszystko"*. So retail's six rows
// become PRO's TEN — the same rows, in the same order, with the same
// availability predicates and the same reasons.
//
// ─── WHERE "PRO's LIST" IS READ FROM, AND WHERE IT IS NOT ──────────────────
//
// NOT from `profile.itemsByContext`. That list looks like the answer and is
// not: the filter that consumed it in `components/AddItems.jsx` has been
// COMMENTED OUT since the 19.08 chat-fix (*"the list must be ALWAYS fully
// expanded"*), so `offered` is computed and never read. It also disagrees with
// what PRO draws — it names neither `shoe_box` (which left it at T54-F7) nor
// `watch_drawer`, and PRO renders both.
//
// What actually decides is AddItems' own `kinds` array filtered by
// `k.families`: an entry that names its families is drawn inside them and
// nowhere else, which is why `cargo` and `bins` are ABSENT on a wardrobe rather
// than greyed (T50 F9, the owner's *"w ogóle nie ma sensu"*). Ten rows survive
// that filter, and `pro` below names each one of them.
//
// `test/turn61-f4-the-interior.test.js` READS BOTH LISTS and diffs them, so the
// day somebody adds an eleventh row to PRO, this file fails rather than drifts.

export const INTERIOR_ROWS = [
  {
    id: 'drawers', pro: 'drawers', menu: 'drawers', name: 'Drawers',
    add: (s, u) => s.addDrawers(u, 3),
  },
  {
    id: 'overlay', pro: 'overlay_drawers', menu: 'overlay', name: 'Overlay drawers',
    add: (s, u) => s.addOverlayDrawers(u, 3, P().wardrobe.drawers.frontHeight),
  },
  {
    id: 'watch', pro: 'watch_drawer', menu: 'watch', name: 'Watch drawer',
    add: (s, u) => s.addWatchDrawer(u),
  },
  {
    id: 'shelves', pro: 'shelves', menu: 'shelf', name: 'Shelves',
    add: (s, u) => s.addShelves(u, 1),
  },
  {
    id: 'shoe', pro: 'shoe_box', menu: 'shoe', name: 'Shoe drawer',
    add: (s, u) => s.addShoeDrawer(u),
  },
  {
    id: 'partition', pro: 'partition', menu: 'partition', name: 'Vertical divider',
    // ONE TRACK, and this line is the whole of it — see `addFlushPartition`.
    add: (s, u) => addFlushPartition(u),
  },
  {
    id: 'hanger', pro: 'hanger', menu: 'rail', name: 'Hanging rail',
    add: (s, u) => s.addHangerRail(u, {}),
  },
  {
    id: 'pulldown_rail', pro: 'pulldown', menu: 'pulldown', name: 'Pull-down rail',
    add: (s, u) => s.addWardrobeKit(u, 'pulldown_rail'),
  },
  {
    id: 'trouser', pro: 'trouser', menu: 'trouser', name: 'Trouser pull-out',
    add: (s, u) => s.addWardrobeKit(u, 'trouser'),
  },
  {
    id: 'tie_rack', pro: 'tie_rack', menu: 'tie_rack', name: 'Tie rack',
    add: (s, u) => s.addWardrobeKit(u, 'tie_rack'),
  },
];

/**
 * ─── ONE PATH ADDS A DIVIDER, AND THIS IS IT ───────────────────────────────
 *
 * The BAYS chips and the INTERIOR row are two doors onto the same act, and
 * before this function they would have been two ACTS: `addPartition` sets a
 * divider back 20 mm — right for a shelf divider, invisible to the door law —
 * and `setBayCount` has always flattened that to 0 so the division is a
 * division of the FRONT as well. A bare `addPartition` from a new row would
 * have made dividers the BAYS chip could not see, and the two controls would
 * have disagreed about the same wardrobe.
 *
 * So both call this. The answer to *"how many code paths decide what may be
 * added here"* has to be one, and for the divider this is where it is one.
 */
export function addFlushPartition(unitId) {
  const before = itemsOf(unitId).filter((i) => i.kind === 'partition').length;
  const id = S().addPartition(unitId);
  const parts = itemsOf(unitId).filter((i) => i.kind === 'partition');
  if (parts.length === before) return null;      // the engine ran out of room
  for (const part of parts) {
    if (Number(part.front_mm) !== 0) S().updateItem(unitId, part.id, { front_mm: 0 });
  }
  S().centrePartitions(unitId);
  return id;
}

/** How many of each row the wardrobe currently holds — read off the unit. */
export function interiorCounts(unit) {
  const items = unit?.params?.sections?.[0]?.items || [];
  const drawers = items.filter((i) => i.kind === 'drawer');
  return {
    hanger: items.filter((i) => i.kind === 'hanger').length,
    shelves: items.filter((i) => i.kind === 'shelf').length,
    drawers: drawers.filter((i) => !i.variant && !i.watch_insert).length,
    shoe: drawers.filter((i) => i.variant === 'shoe').length,
    watch: drawers.filter((i) => i.watch_insert === true).length,
    pulldown_rail: items.filter((i) => i.kind === 'pulldown_rail').length,
    // T61 F4 · the four that joined. An overlay drawer's kind is
    // `overlay_drawer` and not `drawer` — the exact fault `engine/drawerRef.js`
    // documents, and the reason the row above cannot count it.
    overlay: items.filter((i) => i.kind === 'overlay_drawer').length,
    partition: items.filter((i) => i.kind === 'partition').length,
    trouser: items.filter((i) => i.kind === 'trouser').length,
    tie_rack: items.filter((i) => i.kind === 'tie_rack').length,
  };
}

/**
 * THE REFUSALS, each decided by a predicate that is NOT retail's.
 *
 *   pull-down   `store.unitUnderSlope(unitId)` — the store's own answer, the
 *               same one PRO's Add-items menu greys the row with (T58 F4).
 *   watch/shoe  the SHOE's presence on the unit; the sentence, when the client
 *               presses anyway, is the store's own and is shown verbatim.
 *   hanger      one rail per column is the store's own refusal (`addHangerRail`
 *               returns null); it is reported after the press, not before.
 */
export function interiorRefusals(unitId, unit) {
  const store = S();
  const counts = interiorCounts(unit);
  const items = unit?.params?.sections?.[0]?.items || [];
  const underSlope = Boolean(store.unitUnderSlope?.(unitId));
  const zones = (store.zonesOf?.(unitId) || []).length;
  return {
    pulldown_rail: underSlope ? REASONS.pulldownUnderSlope : '',
    watch: counts.shoe > 0 ? REASONS.watchWithShoe
    // ─── T61 F4 · PRO's OWN PRECONDITION, WHICH RETAIL DID NOT HAVE ───────
    // PRO greys this row while there is no stack (*"add the drawers first"*).
    // Retail offered ADD and swallowed the store's refusal, which is the
    // standing law broken in the quietest possible way: a control that acts
    // and reports nothing. The SENTENCE is the store's own, verbatim from
    // `projectStore.addWatchDrawer`, not a retail paraphrase of PRO's label.
      : (counts.drawers + counts.shoe === 0 ? WATCH_NEEDS_A_STACK : ''),
    shoe: counts.watch > 0 ? REASONS.shoeWithWatch : '',
    // A DIVIDER, by `addPartition`'s own gate — the same predicate the BAYS
    // chips are refused by, asked one bay further along.
    partition: bayRefusal(unitId, bayCount(unitId) + 1),
    // ONE RAIL PER COLUMN is the store's own refusal (`addHangerRail` answers
    // null). PRO greys it with `already fitted` when there is no column left to
    // ask about; the words are `reasons.js`'s, named against that predicate.
    hanger: counts.hanger > 0 && zones <= 1 ? REASONS.railAlreadyThere : '',
    // ONE OF EACH BOUGHT MECHANISM PER OPENING (`addWardrobeKit` refuses a
    // second of the same kind in the same zone and answers null).
    trouser: counts.trouser > 0 && zones <= 1 ? REASONS.kitAlreadyThere('trouser pull-out') : '',
    tie_rack: counts.tie_rack > 0 && zones <= 1 ? REASONS.kitAlreadyThere('tie rack') : '',
  };
}

/**
 * THE STORE'S OWN SENTENCE, verbatim.
 *
 * `projectStore.addWatchDrawer` refuses an empty stack with exactly this, and
 * the row is greyed with it BEFORE the press rather than after — same words,
 * one reading. It is a constant here so a test can hold the two together; the
 * words are not retail's and must never be edited.
 */
const WATCH_NEEDS_A_STACK = 'Add the drawers first — the watch drawer goes on top of a stack.';

/**
 * THE NOTE beside a row — a true thing about it that is not a refusal.
 *
 * The overlay stack is the one that needs one: `addOverlayDrawers` DELETES the
 * internal stack it replaces (*"T41-F3: choosing overlay clears the internal
 * stack it replaces"*), so the two drawer rows are mutually exclusive by
 * construction and nothing said so. PRO does not say it either; it is the
 * store's own behaviour, stated rather than discovered.
 */
export function interiorNotes(unit) {
  const counts = interiorCounts(unit);
  return {
    overlay: counts.drawers > 0
      ? 'Overlay fronts replace the drawers inside — the stack is rebuilt outside the carcass.'
      : '',
    drawers: counts.overlay > 0
      ? 'Drawers inside replace the overlay stack — the fronts come off.'
      : '',
  };
}

/**
 * Whatever the shared core said last. A refusal the STORE authors — the
 * watch/shoe sentence, the pull-down sweep's warning — arrives in the ui
 * store's message queue, and this is how the design room reads it back rather
 * than writing its own version of the same sentence.
 */
export const messageCount = () => (useUiStore.getState().messages || []).length;

export function lastEngineWord() {
  const messages = useUiStore.getState().messages || [];
  const last = messages.length ? messages[messages.length - 1] : null;
  // T60: the queue FOLDS a repeated sentence and rewrites it as "3 × <it>"
  // (`uiStore.notify`). `baseMessage` is the sentence the shared core actually
  // wrote, and it is the one a client is shown — a refusal with a multiplier
  // in front of it is the queue's bookkeeping leaking into the room.
  return last ? String(last.baseMessage || last.message || '') : '';
}

// ═══════════════════════════════════════════════════════════════════════════
// T60 F3 · THE ELEMENT MENUS — EVERY ANSWER THE ENGINE'S
// ═══════════════════════════════════════════════════════════════════════════
//
// The owner, after the first live look:
//
//   *"numer 7 to już musi być detalistyczne menu — jak naciśniemy na drzwi to
//   się pojawi drzwi, jak na szafę to na szafę, jak na półkę to półkę.
//   Wszystkie modale które mamy w PRO muszą się tutaj pojawiać. Nie możemy
//   zostawić nikogo żeby sobie wybrał coś co nie działa. Nie może być
//   możliwości nieprzesunięcia się półki czy coś innego — to głupie."*
//
// Everything below exists to make the last sentence true. NINE menus live in
// `design/detail/`, and not one of them imports a store, an engine module or a
// panel: each asks this file what its controls may do, and this file asks the
// engine. So there is exactly one place where a bound could be typed by hand,
// and it is a place `test/turn60-f3-the-element-menus.test.js` reads line by
// line.
//
// THE SHAPE OF EVERY ANSWER. A control gets `{ value, options|min|max, reason }`
// — and `reason` is a SENTENCE or the empty string. Where the shared core
// authors the sentence (the watch/shoe exclusion, the room's refusal, the
// store's clamp notice) it is passed through verbatim. Where the shared core
// answers only in a boolean, the words are `reasons.js`'s and the predicate is
// named beside them there.


/** The computed unit, or null before the first frame has one. */
const resultOf = (unitId) => (unitId ? S().unitResult?.(unitId) || null : null);
const unitOf = (unitId) => S().units.find((u) => u.id === unitId) || null;
const itemsOf = (unitId) => unitOf(unitId)?.params?.sections?.[0]?.items || [];

// ─── THE SELECTION LAW ─────────────────────────────────────────────────────

/**
 * WHICH MENU A KIND OPENS. The router is a TABLE, and that is the whole of the
 * "no dead control" law's front door: a kind that is not in it has no menu, so
 * it is not selectable — the empty panel it would have rendered cannot exist.
 *
 * The left-hand side is the ENGINE's own vocabulary (`engine/elements.js
 * elementKind`), not retail's, so a kit that grows a new part gets sorted by
 * the same function PRO's element panel sorts it by.
 *
 * THE CARCASS GOES TO THE WARDROBE, and that is PRO's own verdict rather than
 * a convenience: turn 13, *"clicking a cabinet must select the CABINET again…
 * A carcass panel is reached in the EDITOR window now, and the room view goes
 * back to being about cabinets."* A client clicking a side, a top or a plinth
 * is asking about the wardrobe, and the wardrobe menu is what opens.
 */
export const MENU_FOR_KIND = Object.freeze({
  door: 'door',
  'drawer-front': 'drawers',
  drawer: 'drawers',
  shelf: 'shelf',
  'fixed-shelf': 'shelf',
  // ─── T61 F4 · RE-POINTED, AND SAID OUT LOUD ──────────────────────────────
  // T60 sent a divider to the WARDROBE menu, with the carcass, on turn 13's
  // verdict that *"clicking a cabinet must select the CABINET"*. That verdict
  // is about the CARCASS — a side, a top, a plinth — and a divider is not
  // carcass: it is an interior item a client ADDS, from a row that now exists,
  // and F4's standing law is that every addable row has its own Duty menu. So
  // clicking a divider opens the divider, and the carcass keys below are
  // untouched.
  partition: 'partition',
  side: 'wardrobe',
  top: 'wardrobe',
  bottom: 'wardrobe',
  back: 'wardrobe',
  plinth: 'wardrobe',
  'end-panel': 'wardrobe',
  infill: 'wardrobe',
  'masking-panel': 'wardrobe',
  holder: 'wardrobe',
  spurs: 'wardrobe',
});

/**
 * T61 F4 · WHICH MENU A BOUGHT MECHANISM OPENS.
 *
 * The engine files all three under one key — `engine/cabinet.js
 * WARDROBE_KIT_KINDS = ['trouser', 'tie_rack', 'pulldown_rail']` — and they are
 * not panels, so `MENU_FOR_KIND` (which is keyed on `elementKind`) cannot carry
 * them. This is the same table for the same job, on the other route.
 */
export const KIT_MENUS = Object.freeze({
  pulldown_rail: 'pulldown',
  trouser: 'trouser',
  tie_rack: 'tie_rack',
});

/**
 * Every menu retail has: T60's nine in the brief's own order, and T61 F4's four
 * after them — one for each row the INTERIOR list grew, because *"an element
 * with no menu is not clickable"* and a row that adds something unclickable is
 * a row that adds nothing a client can then change.
 */
export const MENUS = Object.freeze([
  'wardrobe', 'door', 'shelf', 'drawers', 'rail', 'watch', 'shoe', 'pulldown', 'lighting',
  'overlay', 'partition', 'trouser', 'tie_rack',
]);

/**
 * WHAT IS SELECTED, in retail's words.
 *
 * The shared store keeps `{ unitId, elementRef }` and the ref is the ENGINE's
 * own panel id — the same selection PRO's element panel reads. This resolves
 * it: the panel, the kind, the interior item behind it where there is one, the
 * menu that opens, and the plain-English name F4 puts in the stage hint.
 *
 * THREE THINGS ARE NOT PANELS and are found by their own route, because the
 * engine does not cut a board for them:
 *
 *   the ROD          `assemblies.rail.itemId` — T42 deleted the board over it
 *                    and the rod is picked as itself.
 *   a PULL-DOWN      `assemblies.wardrobeKits` — a body, not a panel.
 *   a WATCH / SHOE   a drawer whose item says so; its panels are the drawer's.
 *
 * @returns {{menu:string, kind:string, unitId:string, ref:string,
 *            panel:object|null, item:object|null, label:string}|null}
 */
export function resolveSelection(selected) {
  const unitId = selected?.unitId || null;
  const ref = selected?.elementRef == null ? null : String(selected.elementRef);
  if (!unitId || !ref) return null;
  const result = resultOf(unitId);
  const items = itemsOf(unitId);

  // The rod, first: it is an item id and never a panel id.
  const rail = result?.assemblies?.rail?.itemId === ref
    ? result.assemblies.rail
    : (result?.assemblies?.columnRails || []).find((r) => r.itemId === ref) || null;
  if (rail) {
    return {
      menu: 'rail', kind: 'hanger', unitId, ref, panel: null,
      item: items.find((i) => i.id === ref) || null, label: 'Hanging rail',
    };
  }

  // T61 F4: all THREE bought mechanisms, not just the pull-down. The engine
  // publishes them under one key (`WARDROBE_KIT_KINDS`) and this branch was
  // narrowed to one of them, so a trouser pull-out and a tie rack resolved to
  // nothing and had no menu — which is why they could not be added.
  const kit = (result?.assemblies?.wardrobeKits || []).find((k) => k.id === ref) || null;
  if (kit && KIT_MENUS[kit.kind]) {
    return {
      menu: KIT_MENUS[kit.kind],
      kind: kit.kind,
      unitId,
      ref,
      panel: null,
      item: items.find((i) => i.id === ref) || null,
      label: kit.label || kitWords(kit.kind).label,
    };
  }

  const panel = (result?.panels || []).find((p) => p.id === ref) || null;
  if (!panel || !isSelectableElement(panel)) return null;
  const kind = elementKind(panel);
  let menu = MENU_FOR_KIND[kind] || null;
  if (!menu) return null;

  // A shelf names its own item on its panel (`meta.itemId`), which is how a
  // click on a board reaches the thing a joiner added.
  let item = null;
  if (menu === 'shelf') item = items.find((i) => i.id === panel.meta?.itemId) || null;

  // A drawer — box or front — carries `meta.drawer`, the stack index the
  // engine cut it at. Which KIND of drawer it is, is the item's own word.
  if (menu === 'drawers') {
    // ─── T61 F4 · THE PANEL'S OWN ITEM, FIRST ───────────────────────────────
    // `engine/drawerRef.js drawerRefOf` is the shared core's answer to exactly
    // this and its header is the fault report: an OVERLAY drawer's kind is
    // `overlay_drawer`, so a lookup that filters `kind === 'drawer'` comes back
    // empty and the menu opens on nothing. The engine STAMPS the item on the
    // panel (`meta.itemId`); read that before counting anything.
    const stamped = panel.meta?.itemId != null
      ? items.find((i) => i.id === panel.meta.itemId) || null
      : null;
    if (stamped?.kind === 'overlay_drawer') {
      return {
        menu: 'overlay', kind: 'overlay_drawer', unitId, ref, panel, item: stamped,
        label: 'Overlay drawer',
      };
    }
    item = stamped || drawerAt(unitId, panel.meta?.drawer, panel.meta?.zone ?? null);
    if (item?.watch_insert === true || String(item?.variant || '') === 'watch') menu = 'watch';
    else if (String(item?.variant || '') === 'shoe') menu = 'shoe';
  }

  return {
    menu, kind, unitId, ref, panel, item, label: elementLabel(panel) || kind,
  };
}

/**
 * The drawer item the engine cut as `meta.drawer`.
 *
 * That number is the item's OWN `index` — the stack position the engine was
 * given — and it is counted WITHIN ITS BAY (`engine/cabinet.js` keys the boxes
 * by `${zone}|${drawer}`). Matching it against a position in the flat item
 * list opens the wrong drawer's menu in any wardrobe with bays, which is the
 * kind of wrong that only shows up on the owner's own screen.
 */
export function drawerAt(unitId, index, zone = null) {
  const n = Math.trunc(Number(index));
  if (!Number.isFinite(n)) return null;
  const here = (i) => (i.zone == null || !Number.isFinite(Number(i.zone))
    ? null : Math.trunc(Number(i.zone)));
  const want = zone == null || !Number.isFinite(Number(zone)) ? null : Math.trunc(Number(zone));
  const drawers = itemsOf(unitId).filter((i) => i.kind === 'drawer' && here(i) === want);
  return drawers.find((d) => Math.trunc(Number(d.index)) === n) || drawers[n - 1] || null;
}

/** The engine's own word for the PIECE — T60's law, unchanged. */
function elementWord(sel) {
  if (sel.menu === 'watch') return 'Watch drawer';
  if (sel.menu === 'shoe') return 'Shoe drawer';
  // A leaf says which one: the engine hangs it left or right and the panel
  // knows which side it is on.
  if (sel.menu === 'door') {
    const hand = String(sel.panel?.meta?.hinge || '').toUpperCase();
    if (hand === 'L') return 'Left door';
    if (hand === 'R') return 'Right door';
  }
  return sel.label || '';
}

/**
 * WHICH PIECE OF FURNITURE the selection is in, when there is more than one to
 * confuse it with.
 *
 * ─── T61 · F2's NAMING LAW, AND F3's ─────────────────────────────────────
 *
 * *"STAGE HINT extends T60's naming law: 'WALL 2 WARDROBE — LEFT DOOR'."*
 *
 * It says NOTHING while there is one wardrobe, which is every project t59 and
 * t60 shipped and every one T60's own test reads — a hint that says "Wall 1
 * wardrobe" in a room with one wardrobe is noise, and the owner's *"6 bez
 * zmian"* was about exactly that kind of addition. The prefix appears when the
 * client has actually put furniture on two walls, and for a TOP BOX always,
 * because a box and the cabinet under it are two things in the same place.
 */
function placeName(unitId) {
  const unit = unitOf(unitId);
  if (!unit) return '';
  if (isTopBox(unit)) return 'Top box';
  const walls = new Set(S().units
    .filter((u) => !u.params?.rides_on)
    .map((u) => u.position?.wall ?? 0));
  if (walls.size < 2) return '';
  return `Wall ${(unit.position?.wall ?? 0) + 1} wardrobe`;
}

/** Retail's own word for a selection, for the STAGE HINT (F4, extended T61). */
export function selectionName(sel) {
  if (!sel) return '';
  const word = elementWord(sel);
  const place = placeName(sel.unitId);
  if (!place) return word;
  // The cabinet itself, opened from LAYOUT, is named once and not twice.
  if (!word || word === 'Wardrobe') return place;
  return `${place} — ${word}`;
}

// ─── 1 · THE WARDROBE ──────────────────────────────────────────────────────

/** The three sliders' ends, from the store's own reading of the engine. */
export const unitBounds = (unitId) => S().unitSizeBoundsFor?.(unitId) || null;

/**
 * A size, written the way PRO writes it (`UnitSizeModal`, `RightPanel`): the
 * ROOM is asked first and its refusal is a whole sentence; if it says nothing
 * the setter clamps and speaks for itself.
 *
 * @returns {{ok:boolean, said:string}} — `said` is the engine's or the store's
 *          own words, never retail's.
 */
export function setUnitSize(unitId, patch) {
  const refusal = S().roomFitRefusalFor?.(unitId, patch);
  if (refusal?.message) return { ok: false, said: refusal.message };
  const done = S().updateUnitParams(unitId, patch);
  return { ok: true, said: (done?.notices || [])[0] || '' };
}

/** Whatever the engine last said about this cabinet — its own warnings. */
export function unitWarnings(unitId) {
  return (resultOf(unitId)?.warnings || []).map((w) => w.message).filter(Boolean);
}

/**
 * HOW MANY COMPARTMENTS. A BAY is the clear opening between the two sides and
 * any FULL-HEIGHT, FLUSH partition — `engine/doors.js doorBays` counts only
 * `fullHeight && setback === 0`, which is why every divider retail adds is
 * brought forward to the face.
 *
 * This is NOT the door count. t59 wired both chip rows to one call, so BAYS was
 * a second name for DOORS — a duplicate control, which the no-dead-control law
 * forbids exactly as much as a dead one. They are two acts here.
 */
export const bayCount = (unitId) => Math.max(1, (S().bayDoorsFor?.(unitId) || []).length);

export function setBayCount(unitId, want) {
  const n = Math.max(1, Math.trunc(Number(want) || 1));
  if (!unitOf(unitId)) return 0;
  const parts = () => itemsOf(unitId).filter((i) => i.kind === 'partition');
  let guard = 12;
  while (parts().length > n - 1 && guard > 0) {
    guard -= 1;
    S().removeItem(unitId, parts().slice(-1)[0].id);
  }
  guard = 12;
  while (parts().length < n - 1 && guard > 0) {
    guard -= 1;
    // T61 F4: `addFlushPartition` — the SAME call the INTERIOR row makes. It
    // carries the flush law (a divider set back 20 mm is invisible to the door
    // law) and the re-centring, so the chips and the row cannot produce two
    // different kinds of divider in the same wardrobe.
    if (!addFlushPartition(unitId)) break;        // the engine ran out of room
  }
  return bayCount(unitId);
}

/**
 * MAY THIS WARDROBE HOLD `n` BAYS? The predicate is `addPartition`'s own gate
 * (`projectStore.js`): the widest clear opening must be at least one board plus
 * two minimum shelf gaps, or there is nowhere to stand another divider. The
 * store answers with a bare `null`; the sentence is `reasons.js`'s, and it is
 * named there against this predicate.
 */
export function bayRefusal(unitId, want) {
  const n = Math.max(1, Math.trunc(Number(want) || 1));
  const now = bayCount(unitId);
  if (n <= now) return '';
  const p = P();
  const unit = unitOf(unitId);
  const G = unit?.params?.board_t ?? p.board.thickness;
  const need = G + 2 * p.editor.minShelfGap;
  // The openings as they stand — `doorBays` publishes each one's CLEAR `size`,
  // which is the number `addPartition`'s gate measures.
  const widest = Math.max(0, ...(S().bayDoorsFor?.(unitId) || []).map((b) => Number(b.size) || 0));
  // Adding `n - now` more dividers cuts the widest opening into that many more
  // pieces, each losing a board: what is left has to clear the gate.
  const extra = n - now;
  const after = (widest - extra * G) / (extra + 1);
  return after >= need ? '' : REASONS.noRoomForABay({ need: Math.round(need) });
}

/** The plinth heights the profile itself names — its default and its own leg. */
export function plinthOptions() {
  const p = P();
  const legs = Math.round(p.wardrobe.legHeight);
  const kick = Math.round(p.baseUnit?.defaults?.leg_height ?? legs);
  const set = [...new Set([0, kick, legs])].filter((n) => n >= 0).sort((a, b) => a - b);
  return set.map((mm) => ({
    id: String(mm),
    label: mm === 0 ? 'NONE' : `${mm}`,
    from: mm === legs ? 'profile.wardrobe.legHeight' : 'profile.baseUnit.defaults.leg_height',
  }));
}

/** Every decor a client may choose, with EGGER's own attribution on each. */
export function decorChoices() {
  const ids = [...new Set(COLLECTIONS.flatMap((c) => [...c.swatches, c.carcassDecor]))];
  // A decor the pack has not handed the engine yet is not a choice: it has no
  // colour to draw and no EGGER label to put beside it, and a blank tile with
  // no attribution is both a dead control and a licence breach. The pack
  // arrives over the network (`retail/decorPack.js`); until it does, this
  // field is empty rather than wrong.
  return ids.map((id) => swatchFor(id)).filter((sw) => sw.known);
}

export const carcassDecorOf = (project) => project?.design?.carcass?.types?.[0]?.finish_id || null;
export const frontDecorOf = (project) => project?.design?.fronts?.types?.[0]?.finish_id || null;

// ─── 2 · THE DOOR ──────────────────────────────────────────────────────────

/** Every leaf the engine will actually cut on this cabinet. */
export const doorPanels = (unitId) => (resultOf(unitId)?.panels || []).filter(
  (p) => p.part === 'FRONT' && !p.meta?.appliance,
);

/**
 * WHICH WAY THIS LEAF OPENS, and whether the client may say.
 *
 * Three cases and they are genuinely different writes:
 *
 *   a BAY leaf     `setBayDoor(unitId, bay, { hinge })` — the bay owns its hand.
 *   a SINGLE face  `setDoors(unitId, { …, hinge })` — the cabinet owns it.
 *   a face PAIR    NOT SETTABLE. The engine hangs `-FL` left and `-FR` right by
 *                  construction (`engine/cabinet.js`), so a chip that offered to
 *                  change it would be a chip that did nothing.
 *
 * And above all three: `meta.hingeForced` — under a rake the engine decides the
 * hand and says so on the panel itself (T46/T55). Retail reads that flag; it
 * never re-derives the rule.
 */
export function doorHinge(unitId, panel) {
  const bay = Number(panel?.meta?.bay);
  const pair = doorPanels(unitId).length > 1 && !Number.isFinite(bay);
  return {
    hand: String(panel?.meta?.hinge || 'L').toUpperCase(),
    forced: Boolean(panel?.meta?.hingeForced),
    bay: Number.isFinite(bay) ? bay : null,
    reason: panel?.meta?.hingeForced ? REASONS.hingeForcedBySlope
      : (pair ? REASONS.pairHangsBothWays : ''),
  };
}

export function setDoorHinge(unitId, panel, hand) {
  const h = String(hand).toUpperCase() === 'R' ? 'R' : 'L';
  const bay = Number(panel?.meta?.bay);
  if (Number.isFinite(bay)) return S().setBayDoor(unitId, bay, { hinge: h });
  const unit = unitOf(unitId);
  const doors = typeof unit?.params?.doors === 'object' ? unit.params.doors : {};
  return S().setDoors(unitId, { ...doors, hinge: h });
}

/**
 * THIS LEAF'S OWN HANDLE. `setFrontHandle(unitId, panelId, spec)` writes the
 * front's own override; `setProjectHandle` repaints every front in the job,
 * which is not what a panel titled DOOR should do.
 */
export function doorHandle(unitId, panel, project) {
  const own = unitOf(unitId)?.params?.front_handles?.[panel?.id] || null;
  const type = String(own?.type || project?.design?.fronts?.handle?.type || 'none');
  return type === 'null' ? 'none' : type;
}

export function setDoorHandle(unitId, panelId, type) {
  return S().setFrontHandle(unitId, panelId, type === 'none' ? null : { type });
}

/**
 * THE J RUN — the ONE slider F3.2 allows this menu, and it exists only where
 * the engine has already cut a J on this leaf (`meta.jpull`). Its bounds are
 * the leaf's own height: a run longer than the door is not a run.
 */
export function jpullRun(unitId, panel) {
  const cut = panel?.meta?.jpull || null;
  if (!cut) return null;
  const own = S().frontJpullRunOf?.(unitId, panel.id);
  const full = Math.round(Number(panel?.box?.h) || Number(cut.run) || 0);
  return {
    run: Math.round(Number(own ?? cut.run ?? full)),
    min: Math.min(full, Math.round(P().front.types.S.frameMin)),
    max: full,
    standard: full,
    // The engine's own word about this leaf's J, when it has one.
    reason: cut.reason === 'too-short' ? String(cut.message || REASONS.jrunTooShort) : '',
  };
}

export const setJpullRun = (unitId, panelId, mm) => S().setFrontJpullRun(unitId, panelId, mm);

/** OPEN / CLOSE THIS DOOR — the same `openFronts` value a double-click writes. */
export function toggleDoor(unitId, panelId) {
  return U().toggleAllFronts([{ unitId, panelIds: [panelId] }]);
}

export const doorIsOpen = (unitId, panelId) => (U().openFronts?.[unitId]?.[panelId] ?? 0) > 0.5;

// ─── 3 · THE SHELF — THE OWNER'S OWN EXAMPLE, AND IT MOVES ─────────────────

/**
 * *"Nie może być możliwości nieprzesunięcia się półki."*
 *
 * `shelfTravelFor` is the store's own reading of the engine: the band this
 * board lives in (a split divider ends its column exactly as the top does),
 * narrowed by its neighbours at the profile's own minimum gap, plus the two
 * predicates that say it may not move at all — LOCKED (screwed, or a joiner
 * said so) and PINNED (T58: something hangs on it, so it is a boundary the
 * others centre around).
 */
export function shelfTravel(unitId, itemId) {
  const raw = S().shelfTravelFor?.(unitId, itemId) || null;
  if (!raw) return null;
  // ─── THE NUMBER A PERSON READS IS NOT THE NUMBER THE ENGINE STORES ───────
  //
  // `pos_mm` is the board's UNDERSIDE in the carcass's own frame, whose zero
  // is the OUTSIDE of the bottom. What a joiner reads — in PRO's field, in the
  // canvas chip, in the LISP — is the CLEAR LIGHT under the shelf, which is
  // `fieldFromPos(pos, boardT)`. Showing the stored number instead would give
  // the client and the workshop two different figures for one board.
  const G = unitOf(unitId)?.params?.board_t ?? P().board.thickness;
  const up = (mm) => Math.round(fieldFromPos(mm, G));
  return {
    ...raw,
    boardT: G,
    field: up(raw.pos),
    fieldMin: up(raw.min),
    fieldMax: up(raw.max),
  };
}

/** A height the client set, taken back into the frame the engine stores. */
export const setShelfHeight = (unitId, itemId, fieldMm) => {
  const G = unitOf(unitId)?.params?.board_t ?? P().board.thickness;
  return S().setShelfPos(unitId, itemId, posFromField(fieldMm, G));
};

/**
 * CENTRE THIS BAY — the T58 law, and it is TWO store calls rather than one.
 *
 * `redistributeShelvesInBay(unitId, bay)` is the raw single-bay ladder and it
 * does NOT reclamp; every other centring path in the store ends with
 * `reclampShelves`. Retail calls the pair, which is what the store's own
 * `redistributeShelves` does per bay — asked here for ONE bay because the
 * owner's T58 sentence is *"Centrujemy tylko prawy lub lewy bay."*
 *
 * `bay` is the shelf's own zone index, or `null` for a full-width board — which
 * is what every shelf retail's INTERIOR row adds is today.
 */
export function centreBay(unitId, bay) {
  const out = S().redistributeShelvesInBay(unitId, bay ?? null);
  S().reclampShelves(unitId);
  return out;
}

/**
 * Why this board's slider is not offered, in the words the predicate earns.
 * PINNED is deliberately NOT here: it is a CENTRING law (T58-F3.1) and a
 * rail-carrying board is dragged like any other (T37-F2). It is a NOTE.
 */
export function shelfReason(travel) {
  if (!travel) return '';
  if (travel.locked) return REASONS.shelfLocked;
  if (travel.max <= travel.min) return REASONS.shelfNoRoom;
  return '';
}

/** …and the two things that are TRUE about it without refusing anything. */
export function shelfNotes(travel, panel) {
  const said = [];
  if (travel?.pinned) said.push(REASONS.shelfPinned);
  if (panel?.meta?.railItemId) said.push(REASONS.shelfCarriesTheRail);
  return said;
}

// ─── 4 · THE DRAWERS ───────────────────────────────────────────────────────

export function drawerStack(unitId) {
  const drawers = itemsOf(unitId).filter((i) => i.kind === 'drawer');
  const plain = drawers.filter((d) => !d.watch_insert && d.variant !== 'shoe' && d.variant !== 'watch');
  return { drawers, plain, top: drawers[drawers.length - 1] || null };
}

/** The engine's own ceiling on a stack, and its own front-height window. */
export function drawerBounds() {
  const d = P().wardrobe.drawers;
  return {
    maxCount: d.maxCount,
    front: { min: d.minFrontHeight, max: d.maxFrontHeight, standard: d.frontHeight },
    from: 'profile.wardrobe.drawers',
  };
}

/**
 * THE TOP DRAWER'S INSERT, and the two refusals that govern it.
 *
 * The watch⇄shoe exclusion is the STORE's, and so is its sentence — 
 * `setDrawerWatchInsert` notifies it verbatim and `lastEngineWord()` reads it
 * back. Asked BEFORE the press (which is what "no dead control" means) the
 * predicate is the presence of the other kind on this cabinet, and the words
 * are `reasons.js`'s against that predicate.
 */
export function insertRefusals(unitId) {
  const { drawers, top } = drawerStack(unitId);
  // ─── AND IT IS THE OTHER DRAWERS THAT REFUSE, NOT THIS ONE ───────────────
  //
  // These chips change the TOP drawer. A shoe drawer that IS the top drawer is
  // not a reason to refuse watches — it is the thing being replaced by them,
  // and greying the chip over it would trap a client in the choice they just
  // made. The exclusion is about a wardrobe carrying BOTH, so it is asked of
  // every drawer except the one in hand.
  const others = drawers.filter((d) => d !== top);
  const shoe = others.some((d) => d.variant === 'shoe');
  const watch = others.some((d) => d.watch_insert === true || d.variant === 'watch');
  return {
    watches: shoe ? REASONS.watchWithShoe : '',
    shoes: watch ? REASONS.shoeWithWatch : '',
    belts: '',
    none: '',
  };
}

/** What the TOP drawer of this stack is carrying, in the client's word for it. */
export function topInsertOf(top) {
  if (!top) return 'none';
  if (top.watch_insert === true || String(top.variant || '') === 'watch') return 'watches';
  const v = String(top.variant || '');
  if (v === 'shoe') return 'shoes';
  if (v === 'belt_tie' || v === 'belt_tie_glass') return 'belts';
  return 'none';
}

/**
 * IS THE STACK'S ONE SLIDER SAFE TO OFFER?
 *
 * `setAllDrawerHeights` writes EVERY drawer in the stack. Two of them have
 * heights the owner declared fixed and slider-less — the watch tray's
 * `watchDrawerFixedHeight` and the shoe drawer's, derived from its 80 mm side —
 * and the store's one call does not exclude them. So a stack holding either is
 * a stack this control must not touch, and it says so instead of quietly
 * overwriting two numbers nobody asked it to.
 *
 * @returns {string} the sentence, or '' when the slider may act
 */
export function stackHasFixedHeights(unitId) {
  const { drawers } = drawerStack(unitId);
  const watch = drawers.some((d) => d.watch_insert === true || d.variant === 'watch');
  const shoe = drawers.some((d) => d.variant === 'shoe');
  if (!watch && !shoe) return '';
  return REASONS.stackHasAFixedDrawer;
}

/** Whatever the engine last said about this stack — its own warnings, verbatim. */
export function stackWord(unitId) {
  return (resultOf(unitId)?.warnings || [])
    .filter((w) => String(w.code || '').toUpperCase().startsWith('DRAWER'))
    .map((w) => w.message)[0] || '';
}

/**
 * WHAT GOES IN THE TOP DRAWER. Every one of the four goes through a store
 * action that carries its own law — `setDrawerWatchInsert` for the watch flag
 * and its exclusion, `setDrawerFitting` for the other three and the shoe's
 * derived height. Retail writes no item field by hand here, which is what
 * stops a shoe drawer ending up with a 200 mm front over an 80 mm box.
 *
 * @returns {string} whatever the shared core said, verbatim, or ''
 */
export function setTopInsert(unitId, id) {
  const { top } = drawerStack(unitId);
  if (!top) return '';
  // WHAT THE SHARED CORE SAID ABOUT **THIS** PRESS. `lastEngineWord()` reads
  // the tail of a queue that holds every notice the session has raised, so a
  // press that refused nothing would otherwise come back carrying somebody
  // else's sentence about a front's edge trim. Only a message the queue GREW
  // is this action's.
  const before = (useUiStore.getState().messages || []).length;
  const said = () => ((useUiStore.getState().messages || []).length > before ? lastEngineWord() : '');

  if (id === 'watches') {
    S().setDrawerFitting(unitId, top.id, null);
    S().setDrawerWatchInsert(unitId, top.id, true);
    return said();
  }
  S().setDrawerWatchInsert(unitId, top.id, false);
  S().setDrawerFitting(unitId, top.id,
    id === 'belts' ? 'belt_tie' : (id === 'shoes' ? 'shoe' : null));
  return said();
}

// ═══════════════════════════════════════════════════════════════════════════
// T61 F4 · THE FOUR NEW ELEMENTS' OWN ANSWERS
// ═══════════════════════════════════════════════════════════════════════════
//
// *"Every addable row needs its Duty menu (an element with no menu is not
// clickable — T60 law). New menus are written in retail language reading the
// same store fields PRO's editors read… Keep each menu as small as PRO's own
// controls for that element — no invented fields."*
//
// So each block below names the PRO surface it was read from, and what that
// surface has that a CLIENT is not shown, and why.

/**
 * THE DIVIDER'S ONE MOVE — where it stands across the width.
 *
 * PRO's editor is `ElementProperties` on kind `partition`, whose fields are
 * `['position-x', 'partition-slot', 'partition-drill-face', 'setback',
 * 'thickness', 'material']`. Five of those six are the WORKSHOP's: which
 * carcass board it is cut from, which face the machine bores, its setback, its
 * thickness and its material are the joiner's decisions and Petros' iron rule
 * keeps them out of a client's room. What is left is where it stands, which is
 * the only thing a client has an opinion about — and PRO's own list surface
 * (`RightPanel`'s "Vertical partitions") offers exactly that plus EQUAL BAYS.
 *
 * The ends are `projectStore.setPartitionX`'s own clamp, read back off the
 * answer it gives: one minimum gap clear of the sides and of the divider next
 * to it, *"a divider you could not get a hand between is not a bay"*.
 */
export function partitionTravel(unitId, itemId) {
  const unit = unitOf(unitId);
  const item = itemsOf(unitId).find((i) => i.id === itemId) || null;
  if (!unit || !item) return null;
  const p = P();
  const G = unit.params.board_t ?? p.board.thickness;
  const W = Number(unit.params.width) || 0;
  const gap = p.editor.minShelfGap;
  const self = Number(item.x_mm) || G;
  const others = itemsOf(unitId)
    .filter((i) => i.kind === 'partition' && i.id !== itemId && Number.isFinite(i.x_mm))
    .map((i) => Number(i.x_mm))
    .sort((a, b) => a - b);
  const below = [...others].filter((x) => x <= self).pop();
  const above = others.find((x) => x > self);
  const min = Math.round(Math.max(G + gap, below != null ? below + gap : G + gap));
  const max = Math.round(Math.min(W - 2 * G - gap, above != null ? above - gap : W - 2 * G - gap));
  return {
    value: Math.round(self), min, max, blocked: max < min,
  };
}

/** Move it. The store clamps and re-measures the bay doors; the answer is its. */
export const setPartitionPos = (unitId, itemId, mm) => S().setPartitionX(unitId, itemId, mm);

/** EQUAL BAYS — PRO's own button (`RightPanel`, `data-centre-partitions`). */
export const centrePartitions = (unitId) => S().centrePartitions(unitId);

/**
 * THE OVERLAY STACK, read the way `engine/drawerRef.js` says it must be.
 *
 * Its own fault report, verbatim: *"The old lookup found the item by `kind ===
 * 'drawer'`. An OVERLAY drawer's kind is `overlay_drawer`, so on an overlay
 * stack the filter came back empty… A control that lies about having worked."*
 * `drawerStack` filters `kind === 'drawer'` and would have answered zero here.
 */
export function overlayStack(unitId) {
  const drawers = itemsOf(unitId).filter((i) => i.kind === 'overlay_drawer')
    .sort((a, b) => (Number(a.index) || 0) - (Number(b.index) || 0));
  return { drawers, count: drawers.length };
}

/** The stack's count and its front height — PRO's add form is these two, and
 *  nothing else (*"everything the stack implies is the engine's law and not a
 *  question a joiner should have to answer twice"*). */
export const setOverlayStackCount = (unitId, n) => S().addOverlayDrawers(
  unitId, Math.max(1, Math.trunc(Number(n) || 1)), overlayFrontHeight(unitId),
);

export function overlayFrontHeight(unitId) {
  const { drawers } = overlayStack(unitId);
  const said = Number(drawers[0]?.front_h ?? drawers[0]?.height);
  return Number.isFinite(said) && said > 0 ? Math.round(said) : P().wardrobe.drawers.frontHeight;
}

export const setOverlayFronts = (unitId, mm) => S().addOverlayDrawers(
  unitId, Math.max(1, overlayStack(unitId).count || 1), Math.round(Number(mm) || 0),
);

/**
 * A BOUGHT MECHANISM — the trouser pull-out and the tie rack.
 *
 * PRO HAS NO EDITOR FOR EITHER. Its whole surface is one Add button (plus a
 * column chip when the cabinet is divided): they are not panels, `elementKind`
 * has no case for them, `KitBodies` draws them with no click handler, there is
 * no `kit` modal, and `RightPanel` has no remove for them. Said plainly in the
 * PR body: retail's menu is AHEAD of PRO here, exactly as `PulldownMenu`'s
 * REMOVE already is.
 *
 * So the menu is the honest minimum — what was bought, said in the shared
 * core's own terms, and REMOVE. No position field: the profile's `posMm` is a
 * workshop default the pull-down alone exposes, and inventing a second one
 * would be the invented field the rule forbids.
 */
export function kitWords(kind) {
  const spec = P().wardrobeAccessories?.kits?.[kind] || null;
  if (!spec) return { label: '', said: '' };
  return {
    label: String(spec.label || kind),
    // The engine's own account of what a kit IS, kept in the words PRO uses to
    // a joiner and trimmed of the machine half a client has no use for.
    said: 'Bought, never cut — it is ordered to the opening it goes in, and '
      + 'nothing is drilled for it.',
  };
}

export function kitItem(unitId, kind) {
  return itemsOf(unitId).find((i) => i.kind === kind) || null;
}

/** GLASS TOP: the engine refuses in words when there is no shelf over it. */
export function glassRefusal(unitId) {
  const { drawers, top } = drawerStack(unitId);
  const watch = drawers.some((d) => d.watch_insert === true);
  if (!watch) return REASONS.glassNeedsWatch;
  const index = drawers.indexOf(top) + 1;
  return S().watchShelfAbove?.(unitId, index) ? '' : REASONS.glassNeedsShelf;
}

export const setGlassTop = (unitId, itemId, on) => S().setWatchShelfGlass(unitId, itemId, on);
export const setStackCount = (unitId, n) => S().addDrawers(unitId, Math.trunc(Number(n) || 0));

/**
 * THE STACK'S SPLIT. `setAllDrawerHeights` is the one call that redistributes
 * a stack's front heights, and its clamp is the profile's own window — so this
 * slider is real, and it is the only one this menu has.
 */
export const setStackFronts = (unitId, mm) => S().setAllDrawerHeights(unitId, mm);

// ─── 5 · THE HANGING RAIL ──────────────────────────────────────────────────

/**
 * The engine has TWO rail mounts and they are not "single / double": T35's rod
 * hangs under its own SHELF, T40's hangs ALONE off the carcass sides
 * (`engine/railAssembly.js RAIL_MOUNT`). There is no double-rail law in this
 * engine, and offering one would be retail inventing a product. The brief's
 * "single / double" is answered with the engine's own pair, and the difference
 * is named in the morning report.
 */
export const RAIL_MOUNTS = Object.freeze([
  { id: RAIL_MOUNT.SHELF, label: 'WITH A SHELF', hint: 'A board over the rod, and the rod hangs from it.' },
  { id: RAIL_MOUNT.ALONE, label: 'ON ITS OWN', hint: 'No shelf and no board above it — it mounts to the sides.' },
]);

export const railTravel = (unitId, itemId) => S().railTravelFor?.(unitId, itemId) || null;
/**
 * The mount is a re-placement, not a field: `updateItem({ mount })` writes a
 * word and leaves either a rod with no shelf behind it or a fix shelf carrying
 * nothing. The store's own `setRailMount` runs its add-time law again.
 */
export const setRailMount = (unitId, itemId, mount) => S().setRailMount(
  unitId, itemId, mount === RAIL_MOUNT.ALONE ? RAIL_MOUNT.ALONE : RAIL_MOUNT.SHELF,
);

/**
 * …and the height is clamped to the ends the engine gave, because `moveRail`
 * clamps only at zero and `setRailHeight` does not clamp at all: a rod written
 * past the top is a rod the engine then lowers with a warning, which is a
 * control that does something other than what it said.
 */
export function setRailOffset(unitId, itemId, mm) {
  const travel = railTravel(unitId, itemId);
  if (!travel || travel.blocked) return null;
  const at = Math.max(travel.min, Math.min(travel.max, Math.round(Number(mm) || 0)));
  return S().moveRail(unitId, itemId, at);
}

/** Why the rod's own slider is not offered: its height is its SHELF's (T41). */
export const railReason = (travel) => (travel && travel.mounted === RAIL_MOUNT.SHELF
  ? REASONS.railFollowsItsShelf : '');

// ─── 6 · THE WATCH DRAWER ──────────────────────────────────────────────────

/** The four the engine designed, with the engine's own labels and hints. */
export const watchLayouts = () => WATCH_LAYOUTS.map((l) => ({
  id: l.id, label: l.label.toUpperCase(), hint: l.hint, rows: l.rows, across: l.across, backStrip: l.backStrip,
}));

/**
 * PROJECT or SPRAYED. `WATCH_FINISHES` holds one entry — `spray` — and
 * `watchFinishOf` answers `null` for "the project's own decor", so the T58 pair
 * is that `null` and that one id. Retail names neither: both come from here.
 */
export const watchFinishes = () => [
  { id: 'project', label: 'PROJECT', hint: 'The carcass decor this wardrobe is built in.' },
  ...WATCH_FINISHES.map((f) => ({ id: f.id, label: f.label.toUpperCase(), hint: f.hint })),
];

export const watchLayoutOf = (item) => String(item?.watch_layout || WATCH_LAYOUTS[0].id);
export const watchFinishIdOf = (item) => String(item?.watch_finish || 'project');
export const setWatchLayout = (unitId, itemId, id) => S().setWatchLayout(unitId, itemId, id);
export const setWatchFinish = (unitId, itemId, id) => S().setWatchFinish(unitId, itemId, id === 'project' ? null : id);

/**
 * Whether this tray's pane may be cut, and the engine's own reason when not.
 *
 * Asked with the drawer's OWN index and OWN bay — `watchShelfAbove(unitId,
 * index, zone)`. A position in the flat item list is not that number, and in a
 * wardrobe with bays it is not even close.
 */
export function watchGlassRefusal(unitId, item) {
  const index = Math.trunc(Number(item?.index));
  if (!Number.isFinite(index)) return '';
  const zone = item?.zone == null || !Number.isFinite(Number(item.zone))
    ? null : Math.trunc(Number(item.zone));
  return S().watchShelfAbove?.(unitId, index, zone) ? '' : REASONS.glassNeedsShelf;
}

/** Every word the engine has about THIS tray — its own warnings, verbatim. */
export function watchFitWords(unitId, item) {
  const index = Math.trunc(Number(item?.index));
  const zone = item?.zone == null || !Number.isFinite(Number(item.zone))
    ? null : Math.trunc(Number(item.zone));
  return (resultOf(unitId)?.warnings || [])
    .filter((w) => String(w.code || '').startsWith('watch'))
    .filter((w) => (w.drawer == null || Math.trunc(Number(w.drawer)) === index))
    .filter((w) => ((w.zone ?? null) === zone))
    .map((w) => w.message)
    .filter(Boolean);
}

/**
 * …and the same for the shoe insert, which the engine also refuses in words —
 * it is not built unless the drawer is top of its stack, has nothing over it
 * and shares the cabinet with no watch tray. `shoeInsertsBuilt` is computed and
 * never published (named in the morning report), so the WARNINGS are the only
 * honest way to know whether the ramp is actually there.
 */
export function shoeFitWords(unitId, item) {
  const index = Math.trunc(Number(item?.index));
  return (resultOf(unitId)?.warnings || [])
    .filter((w) => String(w.code || '').toLowerCase().includes('shoe'))
    .filter((w) => (w.drawer == null || Math.trunc(Number(w.drawer)) === index))
    .map((w) => w.message)
    .filter(Boolean);
}

// ─── 7 · THE SHOE DRAWER — FIXED LAW, SAID IN WORDS ────────────────────────

/**
 * T58 F2 fixed the ramp and the two dividers and the owner fixed the count
 * himself: *"po prostu daj 2 zawsze"*. There is no option here to offer, so the
 * menu says WHAT IT IS and offers REMOVE — which is the no-dead-control law
 * doing its job rather than failing to.
 *
 * Every number in the sentence is read from `shoeInsertSpec(profile)`.
 */
export function shoeLaw() {
  const s = shoeInsertSpec(P());
  const law = {
    tiltDeg: s.tiltDeg,
    dividers: s.dividerCount,
    lanes: s.dividerCount + 1,
    from: 'engine/shoeInsert.js shoeInsertSpec — profile.wardrobeAccessories.shoeShelf.tiltDeg',
  };
  return { ...law, said: REASONS.shoeIsFixed(law) };
}

/**
 * The note under HOW MANY, when there is one. `addDrawers` rebuilds a stack and
 * carries only a handful of fields across — a watch tray's insert, layout,
 * glass and finish are dropped from every survivor — so a client changing the
 * count is told what it costs before they press.
 */
export function countNote(unitId) {
  const { drawers } = drawerStack(unitId);
  const watch = drawers.some((d) => d.watch_insert === true || d.variant === 'watch');
  return watch ? REASONS.countRebuildsTheStack : '';
}

// ─── 8 · THE PULL-DOWN RAIL ────────────────────────────────────────────────

/**
 * POSITION, and it is measured the way the owner measures it: *"wys. drążka od
 * góry"* — the parked rod's drop from the underside of the top. The engine
 * reads `pos_mm` in exactly that frame (`engine/cabinet.js`: `y = H − G −
 * pos_mm − bodyHeight`), so the slider writes the number the engine reads.
 *
 * Its far end is the point at which the body would stand on the base. Both
 * numbers are the profile's.
 */
export function pulldownTravel(unitId, itemId) {
  const p = P();
  const body = p.wardrobeAccessories?.kits?.pulldown_rail || null;
  const unit = unitOf(unitId);
  if (!body || !unit) return null;
  const G = unit.params.board_t ?? p.board.thickness;
  const H = Number(unit.params.height) || 0;
  const item = itemsOf(unitId).find((i) => i.id === itemId) || null;
  const max = Math.max(0, Math.round(H - 2 * G - body.bodyHeight));
  return {
    drop: Math.round(Number(item?.pos_mm ?? body.topDrop) || 0),
    min: 0,
    max,
    standard: Math.round(body.topDrop),
    step: 5,
    from: 'profile.wardrobeAccessories.kits.pulldown_rail',
  };
}

export const setPulldownDrop = (unitId, itemId, mm) => S().updateItem(unitId, itemId, {
  pos_mm: Math.max(0, Math.round(Number(mm) || 0)),
});

// ─── 9 · THE LIGHTING ──────────────────────────────────────────────────────

/**
 * A STRIP UNDER ONE SHELF. The shared core's lighting items are
 * `{ unitId, kind, ref }` and `kind: 'shelf'` with the shelf PANEL's id is
 * exactly what PRO's `LightingPanel` writes. Retail writes the same record.
 */
export const lightingItems = (project) => project?.design?.lighting?.items || [];

export const shelfStripOf = (project, unitId, panelId) => lightingItems(project)
  .find((it) => it.unitId === unitId && it.kind === 'shelf' && it.ref === panelId) || null;

export function setShelfStrip(unitId, panelId, on) {
  const found = shelfStripOf(S().project, unitId, panelId);
  if (on && !found) return S().addLightingItem({ unitId, kind: 'shelf', ref: panelId });
  if (!on && found) { S().removeLightingItem(found.id); return null; }
  return found?.id || null;
}

/**
 * THE PANE LIGHT IS NOT A SWITCH, and this is the honest answer rather than a
 * chip that writes a key nothing reads.
 *
 * The owner's own spec for the watch pane (T53 F8c): *"z automatycznym dodaniem
 * leda dookoła szyby … offset około 15 mm na LED."* AUTOMATIC. `shelfGlassPlan`
 * cuts the ring with the opening, in the same board, whenever a pane is cut —
 * there is no option in the shared core to turn it off, and `migrateDesign`
 * drops any key that is not `{ on, temperature, switch, items }`, so t59's
 * `setLighting({ pane })` wrote to nothing at all. It is deleted, and the menu
 * says what is true in one line instead.
 */
export function paneLight(project, unitId) {
  const items = itemsOf(unitId);
  const pane = items.some((i) => i.watch_shelf_glass === true || i.variant === 'belt_tie_glass');
  return { present: pane, said: pane ? REASONS.paneIsLit : '' };
}

/**
 * REMOVE. One route for every menu, and it is the store's own — which is what
 * takes a rod out with the shelf it hangs on (T37-F2), renumbers a stack
 * bottom-up, and lets the STAGE update from the same recompute everything else
 * reads.
 */
export const removeElement = (unitId, itemId) => S().removeItem(unitId, itemId);

/**
 * A SELECTION, RE-ASKED — and this is what keeps a menu alive while it works.
 *
 * MEASURED FAULT, found by the browser and by nothing else. The design room
 * held the RESOLVED selection in state and rebuilt it from `selectedElement`
 * whenever the store changed. A menu opened from the INTERIOR list has no
 * `selectedElement` behind it — so the first time one of its own controls wrote
 * anything, the store changed, the effect re-ran, found nothing selected, and
 * closed the menu the client was using. The shelf slider moved the shelf and
 * then vanished, which is precisely the *"nieprzesunięcia się półki"* the owner
 * refused, arriving by the back door.
 *
 * So the room now holds only a TARGET — `{ menu, unitId, ref }`, three strings
 * — and this re-resolves it against the live store on every render. The panel
 * and the item a menu reads are therefore never one edit out of date, and a
 * menu closes when the client closes it and at no other time.
 *
 * @returns {object|null} null when the thing is gone — removed, or its bay
 *          taken out from under it — which is the one time a menu SHOULD close.
 */
export function resolveTarget(target) {
  if (!target?.menu || !target.unitId) return null;
  const { menu, unitId, ref } = target;
  if (!unitOf(unitId)) return null;

  // The whole cabinet, and the light: neither is a panel or an item.
  if (menu === 'wardrobe' || menu === 'lighting') {
    const from = ref ? resolveSelection({ unitId, elementRef: ref }) : null;
    return from && from.menu === menu ? from : selectionForMenu(menu, unitId);
  }

  // A PANEL, a ROD or a KIT — `resolveSelection` knows all three routes.
  const found = ref ? resolveSelection({ unitId, elementRef: ref }) : null;
  if (found) return found.menu === menu ? found : found;

  // …or an ITEM the list named directly. Its panels renumber on every compute,
  // so the ITEM's own id is the only thing that survives an edit.
  const item = itemsOf(unitId).find((i) => i.id === ref) || null;
  if (!item) return null;
  const result = resultOf(unitId);
  const panel = (result?.panels || []).find((p) => p.meta?.itemId === item.id) || null;
  return {
    menu, kind: item.kind, unitId, ref, panel, item, label: menu,
  };
}

/**
 * THE OTHER WAY INTO A MENU — the INTERIOR list's `›`.
 *
 * A client reaches an element two ways: by clicking it on the stage, and by
 * pressing the arrow on its row in column 3. The first is a panel id and goes
 * through `resolveSelection`; this is the second, and it resolves to the SAME
 * shape so that column 7 cannot tell them apart and no menu grows a second
 * entry point.
 *
 * It answers null where the wardrobe holds no such thing — which is what makes
 * a row without a `›` a row that opens nothing, rather than a row that opens an
 * empty panel.
 */
export function selectionForMenu(menu, unitId) {
  const items = itemsOf(unitId);
  const result = resultOf(unitId);
  const pick = (fn) => items.find(fn) || null;

  if (menu === 'wardrobe') {
    return {
      menu, kind: 'unit', unitId, ref: unitId, panel: null, item: null, label: 'Wardrobe',
    };
  }
  if (menu === 'lighting') {
    return {
      menu, kind: 'lighting', unitId, ref: 'lighting', panel: null, item: null, label: 'Lighting',
    };
  }
  if (menu === 'door') {
    const panel = doorPanels(unitId)[0] || null;
    return panel ? {
      menu, kind: 'door', unitId, ref: panel.id, panel, item: null, label: 'Door',
    } : null;
  }
  if (menu === 'rail') {
    const item = pick((i) => i.kind === 'hanger');
    return item ? {
      menu, kind: 'hanger', unitId, ref: item.id, panel: null, item, label: 'Hanging rail',
    } : null;
  }
  // T61 F4: the three bought mechanisms, one branch — see `KIT_MENUS`.
  const kitKind = Object.keys(KIT_MENUS).find((k) => KIT_MENUS[k] === menu);
  if (kitKind) {
    const item = pick((i) => i.kind === kitKind);
    return item ? {
      menu, kind: kitKind, unitId, ref: item.id, panel: null, item, label: kitWords(kitKind).label,
    } : null;
  }
  if (menu === 'partition') {
    const item = pick((i) => i.kind === 'partition');
    if (!item) return null;
    const panel = (result?.panels || []).find((p) => p.meta?.itemId === item.id) || null;
    return {
      menu, kind: 'partition', unitId, ref: panel?.id || item.id, panel, item, label: 'Vertical divider',
    };
  }
  if (menu === 'overlay') {
    const item = pick((i) => i.kind === 'overlay_drawer');
    return item ? {
      menu, kind: 'overlay_drawer', unitId, ref: item.id, panel: null, item, label: 'Overlay drawer',
    } : null;
  }
  if (menu === 'shelf') {
    const item = pick((i) => i.kind === 'shelf');
    if (!item) return null;
    const panel = (result?.panels || []).find((p) => p.meta?.itemId === item.id) || null;
    return {
      menu, kind: 'shelf', unitId, ref: panel?.id || item.id, panel, item, label: 'Shelf',
    };
  }
  const want = {
    watch: (i) => i.kind === 'drawer' && (i.watch_insert === true || i.variant === 'watch'),
    shoe: (i) => i.kind === 'drawer' && i.variant === 'shoe',
    drawers: (i) => i.kind === 'drawer' && !i.watch_insert && i.variant !== 'shoe' && i.variant !== 'watch',
  }[menu];
  if (!want) return null;
  const item = pick(want);
  return item ? {
    menu, kind: 'drawer', unitId, ref: item.id, panel: null, item, label: 'Drawer',
  } : null;
}

// ═══ TURN 63 · THE DOORS INTO PRO'S OWN WINDOWS ═════════════════════════════
//
// The owner, 01.09.2026: *"jak piszę 1 do 1 to KOPIUJ. ale kopiuj — nie
// kasuj, nie zmieniaj PRO, tylko zrób identycznie w retail."*
//
// Twenty-two of PRO's components are COPIED into `design/{lighting,detail,
// material}/` tonight, and a copy speaks the engine and the stores directly,
// as PRO's file does — that is what makes it a copy. What retail WRITES is
// only the wiring that opens them, and that wiring goes through here, so the
// adapter is still the one place a retail-authored file speaks the store.

import { anchorOfEvent } from '../../lib/modalAnchor.js';
import { migrateDesign } from '../../engine/design.js';
import { pickerForSource, sourceById } from '../../engine/projectSettings.js';
import { railChosenAlone } from '../../engine/railAssembly.js';

/** Open one of PRO's windows in the SHARED ui store's own slot. */
export const openEditor = (name, args = null) => U().openModal(name, args);
export const closeEditor = () => U().closeModal();
/** The rectangle of the control that asked (rule 15: beside, never on). */
export const anchorOf = (e) => anchorOfEvent(e);
/** The scene's own selection — the one `LightingPanel` offers a strip under. */
export const selectOnStage = (unitId, ref) => U().selectElement(unitId, ref);
/** The whole project, for a reader that wants one field of it. */
export const liveProject = () => S().project;
/** Which door this page was opened through — `WizardHardware` reads it as PRO does. */
export const pageAudience = () => U().audience;

/**
 * WHICH WINDOW A ROD OPENS — PRO's own T42 verdict, asked of the engine.
 *
 * An ALONE rod is its own subject: `RailModal`, by ITEM id. An ASSEMBLY's rod
 * rides a fix shelf and opens THAT board's window (`DoorModal` is every
 * piece's window), by the shelf's PANEL id — the same route `src/3d/Hardware.jsx`
 * takes on a double-click. Nothing here decides which; `railChosenAlone` does.
 */
export function railWindow(unitId, itemId) {
  const item = itemsOf(unitId).find((i) => i.id === itemId && i.kind === 'hanger') || null;
  if (!item) return null;
  const result = resultOf(unitId);
  // The ENGINE's published rod — `mount` and the ADDRESS (`panelId`: the fix
  // shelf's panel for an assembly, the rod's own item for an alone rod) are the
  // two fields `src/3d/Hardware.jsx Rods` reads for the same decision.
  const rail = result?.assemblies?.rail?.itemId === item.id
    ? result.assemblies.rail
    : (result?.assemblies?.columnRails || []).find((r) => r.itemId === item.id) || null;
  const alone = rail ? rail.mount === RAIL_MOUNT.ALONE : railChosenAlone(item);
  if (alone) return { modal: 'rail', args: { unitId, railItemId: item.id }, said: '' };
  const shelfId = rail?.panelId || null;
  if (shelfId) return { modal: 'element', args: { unitId, panelId: shelfId }, said: '' };
  return null;
}

// ─── F4 · THE SOURCE→PICKER LAW, READ FROM THE PROFILE ─────────────────────
//
// CLAUDE.md F4: *"every carcass and front source names the picker it opens
// (decor / colour / veneer / none), and the thickness rides with the source
// (Egger 18, veneer 19, spray 18). `MaterialChoicePanel` is the surface that
// reads that law."* These functions hand that surface what PRO's wizard hands
// it (`WizardSettings.jsx slotPicker`), and write through the same four store
// setters PRO writes through. The ONE rule restated from PRO's wizard, because
// it lives in a component and not the engine: a FRONT's veneer picks from the
// 85-decor catalogue (T20 F12.3), so its body is the decor grid.

const typeOf = (kind) => {
  const design = migrateDesign(S().project.design);
  return kind === 'carcass' ? design.carcass.types[0] : design.fronts.types[0];
};

export function materialSlot(kind) {
  const design = migrateDesign(S().project.design);
  const slot = typeOf(kind);
  const sources = kind === 'carcass' ? carcassSources(P()) : frontSources(P());
  const activeSource = slot?.source || (kind === 'carcass' ? 'egger' : 'laminate');
  const src = sourceById(sources, activeSource) || sourceById(sources, kind === 'carcass' ? 'egger' : 'laminate');
  const picker = pickerForSource(src);
  return {
    kind,
    slot,
    sources: sources.map((s) => ({
      id: s.id, label: s.label, picker: pickerForSource(s), thickness: s.thickness, active: s.id === activeSource,
    })),
    activeSource,
    thickness: src?.thickness ?? null,
    picker: picker === 'veneer' && kind === 'front' ? 'decor' : picker,
    value: slot?.finish_id || null,
    colour: kind === 'carcass' ? design.colour?.carcass || null : slot?.colour || null,
  };
}

export function setMaterialSource(kind, sourceId) {
  const slot = typeOf(kind);
  if (kind === 'carcass') return S().setCarcassSource(slot.id, sourceId);
  return S().setFrontType(slot.id, { source: sourceId });
}

export function pickMaterialDecor(kind, finishId) {
  const slot = typeOf(kind);
  if (kind === 'carcass') {
    S().setCarcassSource(slot.id, 'egger');
    return S().setCarcassFinish(slot.id, finishId);
  }
  return S().setFrontType(slot.id, { source: slot.source || 'laminate', finish_id: finishId });
}

export function pickMaterialVeneer(kind, finishId) {
  const slot = typeOf(kind);
  if (kind === 'carcass') {
    S().setCarcassSource(slot.id, 'veneer');
    return S().setCarcassFinish(slot.id, finishId);
  }
  return S().setFrontType(slot.id, { source: 'veneer', finish_id: finishId });
}

export function pickMaterialColour(kind, colour) {
  const slot = typeOf(kind);
  if (kind === 'carcass') {
    const design = migrateDesign(S().project.design);
    return S().setDesign({ colour: { ...design.colour, carcass: colour } });
  }
  return S().setFrontType(slot.id, { source: 'spray', colour });
}

export function clearMaterialFinish(kind) {
  const slot = typeOf(kind);
  if (kind === 'carcass') return S().setCarcassFinish(slot.id, null);
  return S().setFrontType(slot.id, { finish_id: null });
}
