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
import { DEFAULT_ROOM, rectCorners } from '../../engine/room.js';
import { CHECKS, wideFrontMm } from '../../engine/checks.js';
import { doorCountFor } from '../../engine/cabinet.js';
import { FRONT_STYLE_OPTIONS } from '../../engine/design.js';
import { carcassSources, frontSources } from '../../engine/projectSettings.js';
import { HANDLE_TYPES } from '../../engine/handles.js';
import { decorById, decorLabel, finishIdForDecor } from '../../engine/decors.js';
import { useProjectStore } from '../../stores/projectStore.js';
import { useUiStore } from '../../stores/uiStore.js';
import { collectionById } from './collections.js';
import { REASONS } from './reasons.js';

const P = () => getCabinetProfile();
const S = () => useProjectStore.getState();

/** The one wardrobe this design is about. */
export const designUnit = (units) => units?.[0] || null;

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

/** F4.1 · YOUR SPACE — the wall and the ceiling. */
export function setSpace({ wallMm, ceilingMm }) {
  const store = S();
  const room = store.project.room || DEFAULT_ROOM;
  const depth = Math.max(600, Math.round(Math.abs(room.corners?.[2]?.y ?? 3000)));
  const patch = {};
  if (Number.isFinite(wallMm)) patch.corners = rectCorners(Math.round(wallMm), depth);
  if (Number.isFinite(ceilingMm)) patch.height = Math.round(ceilingMm);
  const verdict = store.setRoom(patch);
  // A wall that has just changed length is a wall the wardrobe should still be
  // standing at the start of.
  const unit = designUnit(store.units);
  if (unit) store.moveUnit(unit.id, 0, 1);
  return verdict;
}

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
    const before = parts().length;
    S().addPartition(unitId);
    if (parts().length === before) break;    // the engine ran out of room
  }

  // Flush, so each division is a division of the FRONT and not only of the
  // interior. The engine's own slope partition is already at zero.
  for (const part of parts()) {
    if (Number(part.front_mm) !== 0) S().updateItem(unitId, part.id, { front_mm: 0 });
  }
  S().centrePartitions(unitId);

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
export const INTERIOR_ROWS = [
  { id: 'hanger', name: 'Hanging rail', add: (s, u) => s.addHangerRail(u, {}) },
  { id: 'shelves', name: 'Shelves', add: (s, u) => s.addShelves(u, 1) },
  { id: 'drawers', name: 'Drawers', add: (s, u) => s.addDrawers(u, 3) },
  { id: 'shoe', name: 'Shoe drawer', add: (s, u) => s.addShoeDrawer(u) },
  { id: 'watch', name: 'Watch drawer', add: (s, u) => s.addWatchDrawer(u) },
  { id: 'pulldown_rail', name: 'Pull-down rail', add: (s, u) => s.addWardrobeKit(u, 'pulldown_rail') },
];

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
  const underSlope = Boolean(store.unitUnderSlope?.(unitId));
  return {
    pulldown_rail: underSlope ? REASONS.pulldownUnderSlope : '',
    watch: counts.shoe > 0 ? REASONS.watchWithShoe : '',
    shoe: counts.watch > 0 ? REASONS.shoeWithWatch : '',
  };
}

/**
 * Whatever the shared core said last. A refusal the STORE authors — the
 * watch/shoe sentence, the pull-down sweep's warning — arrives in the ui
 * store's message queue, and this is how the design room reads it back rather
 * than writing its own version of the same sentence.
 */
export function lastEngineWord() {
  const messages = useUiStore.getState().messages || [];
  return messages.length ? messages[messages.length - 1].message : '';
}
