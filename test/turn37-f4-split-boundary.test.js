// ─── TURN 37 (CLAUDE.md F4): THE DIVIDER IS A BOUNDARY, THE FIELD IS VISIBLE,
// ─── AND THE DOORS MODAL STOPS FIGHTING THE HAND ────────────────────────────
//
// Three rulings from the owner's walk of T36-F6, 17.08.2026, and three parts:
//
//   (a) *"dodajemy półkę i powinna być traktowana jak koniec szafy — jeśli daję
//       centruj półki, to ponad tą poprzeczką powinny się centrować według tej
//       poprzeczki, i to samo z dolną — taka sama rola."*
//   (b) *"dodanie splitu powinno być w modalu doors też, i to widoczne bardzo —
//       nie mała jakaś malutka pierdółka."*
//   (c) *"włącza i wyłącza się jak pojebane — niech się ustawi po lewej stronie
//       ekranu całkowicie, i niech się nie wyłącza za każdym razem jak kliknę —
//       dopiero krzyżykiem; a niech się przeskakuje tylko nazwa drzwi, które są
//       kliknięte."*
//
// ─── WHAT THIS FILE IS ACTUALLY GUARDING ────────────────────────────────────
//
// (a) is ONE LAW in one place — `engine/collision.js bandSegments`, applied by
// the store's `shelfBandFor`. The tests that matter are therefore not "does the
// arithmetic work" but "do the THREE callers all get it": the drag/typed clamp,
// the Even button and the add-shelf placement. Three copies of a boundary rule
// is exactly how a divider ends up being an end of the cabinet on one path and
// a piece of furniture on the other two.
//
// And its mirror: a cabinet that has never asked for a split must be the
// cabinet it was yesterday, to the millimetre — this turn's contract is
// BYTE-IDENTITY, and `scripts/t37-classify.mjs` holds the engine half of it.
//
// (b) and (c) are WIRING, and this repository mounts no React (zero
// dependencies — CLAUDE.md forbids adding a renderer), so they are proved by
// reading the source exactly as `test/turn30-f2-door-modal.test.js` proves the
// modal it replaced. What the pictures prove instead is the window on the
// screen: `verify/t37/`.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

import {
  useProjectStore, shelfLimits, shelfLimitSegments, paramsForEngine,
} from '../src/stores/projectStore.js';
import { bandSegmentAt, bandSegments, shelfBand } from '../src/engine/collision.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { evenShelfPositions, shelvesInEngineOrder } from '../src/engine/items.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';

const src = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8');
const SRC_DIR = new URL('../src/', import.meta.url).pathname;

const DOOR = src('components/DoorModal.jsx');
const SHELL = src('components/Modal.jsx');
const RIGHT = src('components/RightPanel.jsx');

const store = () => useProjectStore.getState();
const itemsOf = (id) => store().units.find((u) => u.id === id)?.params.sections?.[0]?.items || [];
const shelfPositions = (id) => shelvesInEngineOrder(itemsOf(id)).map((s) => s.pos_mm);
const unitOf = (id) => store().units.find((u) => u.id === id);

/** A clean project with one wardrobe, doors fitted — a door is what splits. */
function withWardrobe(params = {}) {
  store().loadProject({
    id: null, name: 'test', room: null, design: null,
  }, []);
  const { id, error } = store().addUnit('WARDROBE');
  assert.equal(error, null, error || '');
  if (Object.keys(params).length) store().updateUnitParams(id, params);
  store().setDoors(id, true);
  return id;
}

/** Where the engine actually cut the divider — the datum every test reads. */
function dividerOf(id) {
  const result = computeCabinet(paramsForEngine(unitOf(id)), P);
  const list = result.assemblies.splitDividers || [];
  assert.equal(list.length, 1, 'one divider, shared by the pair');
  return list[0];
}

// ════════════════════════════════════════════════════════════════════════════
// (a) THE LAW ITSELF — engine/collision.js, pure
// ════════════════════════════════════════════════════════════════════════════

test('F4a — nothing crossing: the band comes back UNCHANGED, the same object', () => {
  const band = shelfBand({ height: 2150, boardT: 18, floorY: null }, P);
  const segments = bandSegments({ band, boundaries: [] }, P);
  assert.equal(segments.length, 1);
  // The SAME object, not a copy with the same numbers: a cabinet with no split
  // is the cabinet it was yesterday, and that is this turn's whole contract.
  assert.equal(segments[0], band);
  assert.equal(bandSegmentAt({ band, boundaries: [], at: 900 }, P), band);
});

test('F4a — a divider cuts the band in two, and each half is an ordinary band', () => {
  const band = shelfBand({ height: 2150, boardT: 18, floorY: null }, P);
  const [low, high] = bandSegments({ band, boundaries: [{ at: 1247, thickness: 18 }] }, P);
  const edge = P.editor.minShelfEdgeGap;

  // BELOW: the base is still the floor, the DIVIDER is now the ceiling —
  // "taka sama rola" as the underside of the top panel.
  assert.equal(low.floor, band.floor);
  assert.equal(low.ceiling, 1247);
  assert.equal(low.min, band.floor + edge);
  assert.equal(low.max, 1247 - edge);

  // ABOVE: the divider is the floor — the base panel's own role — and the top
  // is unchanged.
  assert.equal(high.floor, 1247 + 18);
  assert.equal(high.ceiling, band.ceiling);
  assert.equal(high.min, 1247 + 18 + edge);
  assert.equal(high.max, band.max);

  // The same edge gap at all four ends: the boundary is not a special kind of
  // end, it is an end.
  assert.equal(low.min - low.floor, band.min - band.floor);
  assert.equal(high.ceiling - high.max, band.ceiling - band.max);
});

test('F4a — which half a shelf belongs to is its OWN height, and null is neither', () => {
  const band = shelfBand({ height: 2150, boardT: 18, floorY: null }, P);
  const boundaries = [{ at: 1247, thickness: 18 }];
  const pick = (at) => bandSegmentAt({ band, boundaries, at }, P);

  assert.equal(pick(600).ceiling, 1247, 'a shelf under the divider stops at it');
  assert.equal(pick(1800).floor, 1265, 'a shelf above it stands on it');
  // `Number(null)` is 0 — the trap rule 13 is about. A caller that asks about
  // no piece in particular (the rail's automatic placement, a panel readout)
  // must get the WHOLE band and not the bottom segment.
  assert.equal(pick(null), band);
  assert.equal(pick(undefined), band);
  // On the line itself: the nearest segment, so a shelf is never handed a band
  // it cannot live in.
  assert.equal(pick(1247).ceiling, 1247);
});

test('F4a — a board that does not cross this band is not a boundary of it', () => {
  // A divider below the drawer partition a shelf already stands over, or above
  // the top: neither is a boundary this shelf has ever had to think about.
  const band = shelfBand({ height: 2150, boardT: 18, floorY: 700 }, P);
  assert.equal(bandSegments({ band, boundaries: [{ at: 400, thickness: 18 }] }, P).length, 1);
  assert.equal(bandSegments({ band, boundaries: [{ at: 2140, thickness: 18 }] }, P).length, 1);
  assert.equal(bandSegments({ band, boundaries: [{ at: 1200, thickness: 18 }] }, P).length, 2);
});

// ════════════════════════════════════════════════════════════════════════════
// (a) THE LAW IN THE STORE — the three callers, and that they agree
// ════════════════════════════════════════════════════════════════════════════

test('F4a — the store cuts the band at the divider the ENGINE actually cut', () => {
  const id = withWardrobe();
  store().setSplitTop(id, 900);
  const divider = dividerOf(id);
  const segments = shelfLimitSegments(unitOf(id), P);
  assert.equal(segments.length, 2);
  assert.equal(segments[0].ceiling, divider.y);
  assert.equal(segments[1].floor, divider.y + (unitOf(id).params.board_t ?? P.board.thickness));
  // …and the WHOLE band is still the whole band for anyone who asks about no
  // shelf in particular.
  const whole = shelfLimits(unitOf(id), P);
  assert.equal(whole.floor, segments[0].floor);
  assert.equal(whole.ceiling, segments[1].ceiling);
});

test('F4a — CALLER 1: a dragged shelf stops at the divider, above and below', () => {
  const id = withWardrobe();
  store().setSplitTop(id, 900);
  const divider = dividerOf(id);
  const G = unitOf(id).params.board_t ?? P.board.thickness;
  const edge = P.editor.minShelfEdgeGap;

  // Two shelves, one each side — where the add path puts them on its own.
  store().addShelves(id, 2);
  const [below, above] = shelvesInEngineOrder(itemsOf(id));
  assert.ok(below.pos_mm < divider.y, 'the first shelf lands under the split');
  assert.ok(above.pos_mm > divider.y, 'the second lands over it');

  // Dragged at the ceiling: it stops under the DIVIDER, not under the top.
  const up = store().setShelfPos(id, below.id, 5000);
  assert.equal(up.pos, divider.y - edge);
  assert.equal(up.above, divider.y, 'and the readout names the divider it stopped at');

  // …and the one above stands ON it: dragged at the floor it stops on the
  // divider, not on the base panel.
  const down = store().setShelfPos(id, above.id, -500);
  assert.equal(down.pos, divider.y + G + edge);
});

test('F4a — CALLER 2: Even centres each side against the divider', () => {
  const id = withWardrobe();
  store().setSplitTop(id, 900);
  const divider = dividerOf(id);
  const G = unitOf(id).params.board_t ?? P.board.thickness;

  store().addShelves(id, 4);
  store().redistributeShelves(id);
  const positions = shelfPositions(id);
  assert.equal(positions.length, 4);
  const low = positions.filter((y) => y < divider.y);
  const high = positions.filter((y) => y > divider.y);
  assert.ok(low.length && high.length, 'shelves on both sides of the split');

  // The KIT's own formula, run once per segment with that segment's own floor
  // and ceiling — the divider in the base's role above it and in the top's
  // role below it.
  const band = shelfLimits(unitOf(id), P);
  const step = P.editor.mmStep;
  const near = (got, want) => assert.ok(Math.abs(got - want) <= step,
    `${got} is not ${want} (within one ${step} mm step)`);
  evenShelfPositions({
    zoneBottom: band.floor, zoneTop: divider.y, count: low.length, boardT: G,
  }).forEach((want, i) => near(low[i], want));
  evenShelfPositions({
    zoneBottom: divider.y + G, zoneTop: band.ceiling, count: high.length, boardT: G,
  }).forEach((want, i) => near(high[i], want));

  // …and no shelf crossed the crossbar to make the count come out neater.
  // Even is a spacing button, not a re-arrangement.
  assert.equal(low.length, 3);
  assert.equal(high.length, 1);
});

test('F4a — CALLER 3: an added shelf never halves an opening that crosses it', () => {
  const id = withWardrobe();
  store().setSplitTop(id, 900);
  const divider = dividerOf(id);
  const G = unitOf(id).params.board_t ?? P.board.thickness;

  store().addShelves(id, 6);
  const positions = shelfPositions(id);
  assert.ok(positions.length >= 4, 'the wardrobe took the shelves');
  for (const y of positions) {
    assert.ok(y + G <= divider.y || y >= divider.y + G,
      `a shelf at ${y} sits on the divider at ${divider.y}`);
  }
  // Both sides were used — the biggest opening is still the biggest opening,
  // it just cannot be one that runs through the crossbar.
  assert.ok(positions.some((y) => y < divider.y), 'shelves below');
  assert.ok(positions.some((y) => y > divider.y), 'shelves above');
});

test('F4a — typing the split SETTLES a shelf that was standing on the line', () => {
  const id = withWardrobe();
  store().addShelves(id, 1);
  const shelf = shelvesInEngineOrder(itemsOf(id))[0];
  // Park it exactly where the crossbar is about to be cut.
  store().setSplitTop(id, 900);
  const divider = dividerOf(id);
  store().setSplitTop(id, 0);
  store().setShelfPos(id, shelf.id, divider.y);
  assert.equal(shelfPositions(id)[0], divider.y);

  // The divider arrives: the sweep that already exists for every other carcass
  // change is the sweep for this one. A shelf left inside the board would be an
  // overlap nobody dragged.
  store().setSplitTop(id, 900);
  const settled = shelfPositions(id)[0];
  assert.equal(settled, divider.y - P.editor.minShelfEdgeGap);
});

test('F4a — a bay\'s own split bounds THAT bay, and no other', () => {
  const id = withWardrobe({ width: 1200 });
  store().addPartition(id);
  // Flush and full height — the two facts that let a partition carry a door
  // (engine/doors.js `doorBays`), which is what makes a per-bay split possible.
  store().setPartitionFront(id, 0);
  const bays = store().bayDoorsFor(id);
  assert.equal(bays.length, 2);
  store().setBayDoors(id, bays.map(() => ({ door: 'one', hinge: 'L' })));
  store().setBaySplitTop(id, 0, 900);

  const divider = dividerOf(id);
  assert.ok(divider.w < unitOf(id).params.width - 2 * 18, 'the divider spans its own bay only');

  assert.equal(shelfLimitSegments(unitOf(id), P, 0).length, 2, 'bay 0 is cut by it');
  assert.equal(shelfLimitSegments(unitOf(id), P, 1).length, 1, 'bay 1 never sees it');
  // A full-width shelf crosses every bay, so every divider is one of its ends.
  assert.equal(shelfLimitSegments(unitOf(id), P, null).length, 2);
});

test('F4a — NO SPLIT is yesterday\'s cabinet, on all three paths', () => {
  const id = withWardrobe();
  const G = unitOf(id).params.board_t ?? P.board.thickness;
  store().addShelves(id, 4);
  store().redistributeShelves(id);
  const band = shelfLimits(unitOf(id), P);
  assert.equal(shelfLimitSegments(unitOf(id), P).length, 1);

  // Turn 9's single call, over turn 11's two numbers, unchanged.
  const want = evenShelfPositions({
    zoneBottom: band.floor, zoneTop: band.ceiling, count: 4, boardT: G,
  });
  shelfPositions(id).forEach((got, i) => assert.ok(
    Math.abs(got - want[i]) <= P.editor.mmStep, `${got} is not the turn-9 ladder's ${want[i]}`,
  ));
  // …and the drag band is the whole carcass, top to bottom.
  const shelf = shelvesInEngineOrder(itemsOf(id))[0];
  assert.equal(store().setShelfPos(id, shelf.id, -500).pos, band.min);
});

// ════════════════════════════════════════════════════════════════════════════
// (b) THE FIELD, IN BOTH SURFACES
// ════════════════════════════════════════════════════════════════════════════

test('F4b — the right-hand panel KEEPS both of its split fields', () => {
  // CLAUDE.md: "the bay-side field stays." The doors modal is a second surface
  // onto one number, never a replacement for the one that was there.
  assert.match(RIGHT, /data-split-top="1"/);
  assert.match(RIGHT, /data-bay-split-top=\{bay\.index\}/);
  assert.match(RIGHT, /onCommit=\{\(v\) => setSplitTop\(unit\.id, v\)\}/);
  assert.match(RIGHT, /onCommit=\{\(v\) => setBaySplitTop\(unit\.id, i, v\)\}/);
});

test('F4b — …and the doors modal gains it, its own labelled row, full width', () => {
  // "Nie mała jakaś malutka pierdółka": its own section with its own label, at
  // the top of the window, not a line appended to a list of properties.
  assert.match(DOOR, /data-split-door-modal=\{baseId\}/);
  assert.match(DOOR, /data-split-top-modal="1"/);
  assert.match(DOOR, />Split door<\/span>/);
  assert.match(DOOR, /className="flex items-center gap-2 w-full"/);
  // It is rendered for a DOOR, and first — before the hinges and before the
  // piece's own fields.
  assert.match(DOOR, /\{isDoor \? <SplitDoorField unit=\{unit\} panel=\{panel\} anchor=\{args\?\.anchor \|\| null\} \/> : null\}/);
  assert.ok(DOOR.indexOf('SplitDoorField') < DOOR.indexOf('<HingeSection'), 'the split row comes first');
});

test('F4b — it commits through the SAME two store setters, chosen by the leaf', () => {
  // A leaf that lives in a bay writes that bay's answer; a leaf across the face
  // writes the unit's. That is the hierarchy `splitTopFor` reads back, which is
  // why the value is read through it rather than off one of the two fields.
  assert.match(DOOR, /const bay = panel\.meta\?\.bay \?\? null;/);
  assert.match(DOOR, /if \(bay == null\) setSplitTop\(unit\.id, mm\);\s*\n\s*else setBaySplitTop\(unit\.id, bay, mm\);/);
  assert.match(DOOR, /splitTopFor\(\{ unit: unit\.params\.split_top_mm, bays: unit\.params\.bay_doors \}, bay\)/);
  assert.match(DOOR, /import \{ splitSegmentRows, splitTopFor \} from '\.\.\/engine\/splitDoors\.js';/);
});

test('F4b — both setters write where the ENGINE reads, and heal the shelves', () => {
  const id = withWardrobe();
  store().setSplitTop(id, 900);
  assert.equal(unitOf(id).params.split_top_mm, 900);
  assert.equal(dividerOf(id).y > 0, true);
  store().setSplitTop(id, 0);
  assert.equal(unitOf(id).params.split_top_mm, null);
  assert.equal((computeCabinet(paramsForEngine(unitOf(id)), P).assemblies.splitDividers || []).length, 0);
});

test('F4b — the window survives its own edit: it re-points at the door that EXISTS', () => {
  // Typing 600 RE-CUTS the leaf — `DOOR-1` becomes `DOOR-1-T`/`-B` — so the
  // panel this window was opened on stops existing. Going blank would be the
  // "wyłącza się jak pojebane" of F4c; it asks the engine which id is actually
  // there instead of guessing, because a refused number leaves the leaf whole.
  assert.match(DOOR, /const fresh = useProjectStore\.getState\(\)\.unitResult\(unit\.id\);/);
  assert.match(DOOR, /const next = \[`\$\{baseId\}-T`, baseId\]\.find\(\(id\) => ids\.has\(id\)\);/);
  assert.match(DOOR, /openModal\('element', \{ unitId: unit\.id, panelId: next, anchor: anchor \|\| null \}\)/);
  // And the engine half of it, so the ids the modal reaches for are real.
  const id = withWardrobe();
  store().setSplitTop(id, 900);
  const ids = computeCabinet(paramsForEngine(unitOf(id)), P).panels.map((p) => p.id);
  assert.ok(ids.some((x) => /-T$/.test(x)), 'a top segment exists to point at');
});

// ════════════════════════════════════════════════════════════════════════════
// (c) THE DOORS MODAL'S CONDUCT
// ════════════════════════════════════════════════════════════════════════════

test('F4c — the doors modal DOCKS hard left, and only a DOOR does', () => {
  assert.match(DOOR, /dock=\{isDoor \? 'left' : null\}/);
  // The shell's own law: docked outranks the anchor, at the edge of the screen.
  assert.match(SHELL, /if \(dock === 'left'\) \{/);
  assert.match(SHELL, /left: 0,/);
  assert.match(SHELL, /side: 'dock-left',/);
  assert.match(SHELL, /data-modal-dock=\{dock \|\| undefined\}/);
  // …and it is the SAME shell — one window, still placed by rule 15's file.
  assert.equal((DOOR.match(/<Modal\b/g) || []).length, 1);
});

test('F4c — a scene click does not close it: sticky, and only for a door', () => {
  assert.match(DOOR, /sticky=\{isDoor\}/);
  // T33's own prop, unchanged: the backdrop takes no pointer events and does
  // not close, so the click reaches the scene under it.
  assert.match(SHELL, /onPointerDown=\{sticky \? undefined : close\}/);
  assert.match(SHELL, /\$\{sticky \? 'pointer-events-none' : ''\}/);
});

test('F4c — Escape is off for THIS window, and on for every other one', () => {
  assert.match(DOOR, /escapeCloses=\{!isDoor\}/);
  // The listener is untouched — it is one window's law, not fourteen's.
  assert.match(SHELL, /window\.addEventListener\('keydown', onKey\)/);
  assert.match(SHELL, /if \(!escapeCloses && !onBack\) return;/);
  // Back still leaves a nested stack, or the key would be a trap.
  assert.match(SHELL, /\(onBack \|\| close\)\(\);/);
  // The default is ON, so no other caller changes behaviour by saying nothing.
  assert.match(SHELL, /escapeCloses = true,/);
});

test('F4c — the × still closes it, and it is the only thing that does', () => {
  // AMENDED in the same turn: the button gained a `data-modal-close` hook — a
  // proof that only its X closes it has to be able to press its X — and its
  // tooltip stopped promising Escape to the one window that has declined the
  // key. The handler is the same `close` it has always been.
  assert.match(SHELL, /data-modal-close="1"/);
  assert.match(SHELL, /title=\{escapeCloses \? 'Close \(Esc\)' : 'Close'\}/);
  assert.match(SHELL, /onClick=\{close\}/);
  assert.match(DOOR, /onClose=\{closeModal\}/);
});

test('F4c — clicking another leaf SWAPS the subject, without closing', () => {
  // The window holds NO state of its own about which door it is on — it reads
  // `modalArgs` — so re-opening `element` swaps the subject in place and the
  // title follows. That is the load-bearing half of "niech się przeskakuje
  // tylko nazwa drzwi".
  assert.match(DOOR, /const args = useUiStore\(\(s\) => s\.modalArgs\);/);
  assert.match(DOOR, /const panel = result\?\.panels\.find\(\(p\) => p\.id === args\?\.panelId\) \|\| null;/);
  assert.match(DOOR, /\$\{unit\.params\.unit_num\} · Door · \$\{hand\}/);
  // The swap itself: the selection this component already lives beside.
  assert.match(DOOR, /const selected = useUiStore\(\(s\) => s\.selectedElement\);/);
  assert.match(DOOR, /if \(!isDoor \|\| !selected\?\.unitId \|\| !selected\?\.elementRef\) return;/);
  assert.match(DOOR, /if \(!leaf \|\| leaf\.part !== 'FRONT' \|\| leaf\.role !== 'front' \|\| leaf\.meta\?\.appliance\) return;/);
  assert.match(DOOR, /openModal\('element', \{\s*unitId: selected\.unitId, panelId: selected\.elementRef, anchor: args\?\.anchor \|\| null,\s*\}\);/);
  // …and there is no `closeModal()` anywhere on that path.
  const at = DOOR.indexOf('const selected = useUiStore');
  assert.doesNotMatch(DOOR.slice(at, at + 900), /closeModal\(\)/);
});

test('F4c — nothing in the 3-D closes a modal, tonight as before', () => {
  const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory()
    ? walk(`${dir}${e.name}/`)
    : (/\.(js|jsx)$/.test(e.name) ? [`${dir}${e.name}`] : [])));
  for (const path of walk(`${SRC_DIR}3d/`)) {
    assert.doesNotMatch(readFileSync(path, 'utf8'), /closeModal/, `${path} closes a modal`);
  }
});

test('F4c — rule 15 stands: no OTHER window docks or turns the key off', () => {
  // "Modals draggable, beside their object — except where F4c states the doors
  // modal's own new docking law." One exception, named, and testable.
  const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory()
    ? walk(`${dir}${e.name}/`)
    : (/\.(js|jsx)$/.test(e.name) ? [`${dir}${e.name}`] : [])));
  for (const path of walk(SRC_DIR)) {
    // ─── AMENDED BY T62 F2 ─────────────────────────────────────────────
    // `retail/design/room/Modal.jsx` is `components/Modal.jsx`, COPIED — the
    // owner's *"jak piszę 1 do 1 to KOPIUJ"*. It is the SHELL, so it declares
    // `dock` and `escapeCloses` as parameters; it does not USE them, which is
    // what this test is about. Exempting the shell twice is exempting one
    // shell. `test/turn62-f2-f3-the-copy.test.js` proves the second file is
    // the first one.
    if (path.endsWith('components/DoorModal.jsx')
      || path.endsWith('components/Modal.jsx')
      || path.endsWith('retail/design/room/Modal.jsx')) continue;
    const text = readFileSync(path, 'utf8');
    assert.doesNotMatch(text, /\bdock=/, `${path} docks a window`);
    assert.doesNotMatch(text, /escapeCloses=/, `${path} turns Escape off`);
  }
  // And the shell still drags every window by its header.
  assert.match(SHELL, /data-modal-handle="1"/);
  assert.match(SHELL, /onPointerDown=\{startDrag\}/);
});
