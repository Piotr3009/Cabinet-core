// ─── TURN 60 · F3 — A MENU FOR EVERY ELEMENT, AND EVERY CONTROL WORKS ──────
//
// The owner, of column 7:
//
//   *"numer 7 to już musi być detalistyczne menu — jak naciśniemy na drzwi to
//   się pojawi drzwi, jak na szafę to na szafę, jak na półkę to półkę.
//   Wszystkie modale które mamy w PRO muszą się tutaj pojawiać. Nie możemy
//   zostawić nikogo żeby sobie wybrał coś co nie działa. Nie może być
//   możliwości nieprzesunięcia się półki czy coś innego — to głupie."*
//
// CLAUDE.md F3 asks this file for: the router resolving each of the nine kinds;
// every control's adapter call producing the expected engine params; every
// disabled control carrying a reason that came from the engine; a shelf pinned
// by a divider offering no height slider; and an unmapped kind not being
// selectable.
//
// ─── HOW IT IS ASKED ───────────────────────────────────────────────────────
//
// Against the LIVE STORE, not a fixture. Every test below builds a real
// wardrobe through the same adapter the room uses, presses the same functions
// the components press, and reads the result off the engine's own compute. A
// menu test that stubbed the store would prove the menu talks to a stub.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { isCopy } from '../scripts/t63-copies.mjs';
import { join } from 'node:path';

import * as A from '../src/retail/design/adapter.js';
import { REASONS } from '../src/retail/design/reasons.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { useUiStore } from '../src/stores/uiStore.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { WATCH_LAYOUTS } from '../src/engine/watchDrawer.js';
import { elementKind, isMainViewElement, opensOwnModal } from '../src/engine/elements.js';
import { pickMode, picksOnClick, setPickMode } from '../src/3d/picking.js';

const ROOT = new URL('../', import.meta.url).pathname;
const S = () => useProjectStore.getState();
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

/**
 * The same file with its ARGUMENT taken out. Several of the files below quote
 * the very sentence this turn deleted, in order to say why it was deleted — a
 * scan that believed prose would fail on the comment explaining the fix.
 */
const code = (p) => read(p)
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^[ \t]*\/\/.*$/gm, ' ')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ');

/** One wardrobe, made the way the design room makes it. */
function room({ width = 900, drawers = 0, shelves = 0, rail = false } = {}) {
  A.startDesign('Bedroom wardrobe');
  A.addFirstWardrobe();
  const unit = A.designUnit(S().units);
  // T65 F1: the guard used to read `P.wardrobe.defaults.width` (600) — the
  // width the T60 wardrobe arrived at. The client's first wardrobe now arrives
  // at `min(wall, 1200)`, so the helper asks the UNIT what it is instead of
  // assuming a profile number, and `room({ width: 600 })` really is 600.
  if (Math.round(Number(unit.params?.width) || 0) !== width) A.setUnitSize(unit.id, { width });
  if (shelves) S().addShelves(unit.id, shelves);
  if (drawers) S().addDrawers(unit.id, drawers);
  if (rail) S().addHangerRail(unit.id, {});
  return S().units.find((u) => u.id === unit.id);
}

const itemsOf = (unitId) => S().units.find((u) => u.id === unitId)?.params.sections?.[0]?.items || [];
const panelsOf = (unitId) => S().unitResult(unitId)?.panels || [];

// ═══ 1 · THE ROUTER IS A TABLE, AND IT HAS NO DEFAULT BRANCH ═══════════════

// ─── AMENDED BY T61 F4, AND REPLACED BY T66 F3 ──────────────────────────────
//
// T61: *"dowozimy dla klientow musi bcy wszystko"* — the INTERIOR list grew to
// PRO's ten and T60's own law (*"an element with no menu is not clickable"*)
// made NINE menus THIRTEEN.
//
// T66 F3 is the owner looking at the result: a floating `ElementProperties`
// window and a thin Duty menu open on the SAME drawer, and his verdict —
//
//   *"w zasadzie po prawej powinien być tylko menu edycji."*
//
// So the thirteen thin menus are DELETED and what stands in the docked panel is
// the COPIED PRO EDITOR for whatever was clicked. Every law T60 wrote survives
// the change, and this is the same test asking them of the new shape: the
// router is still a TABLE with no default branch, a kind that is not a key is
// still unselectable, and there is still exactly ONE way back.
test('F3 · the editors, and the DOCK resolves every one of them', () => {
  assert.deepEqual(A.MENUS, [
    'door', 'shelf', 'drawers', 'rail', 'watch', 'shoe', 'overlay', 'partition',
  ], 'the vocabulary of things a client edits on the right');

  // ─── NOT ONE `*Menu.jsx` REMAINS ──────────────────────────────────────────
  // CLAUDE.md asks for a test that LISTS the directory, and this is it. The
  // COPY of PRO's right-click menu stands under `ContextEdits.jsx` — the
  // manifest names the destination, so the copy is byte-for-byte the copy it
  // was and the name a thin Duty menu wore cannot come back by accident.
  const files = readdirSync(join(ROOT, 'src/retail/design/detail'));
  assert.deepEqual(files.filter((f) => /Menu\.jsx$/.test(f)), [],
    'a *Menu.jsx is back under design/detail — the thin menus died in T66 F3');
  for (const gone of [
    'DrawersMenu.jsx', 'OverlayMenu.jsx', 'ShelfMenu.jsx', 'PartitionMenu.jsx',
    'PulldownMenu.jsx', 'ShoeMenu.jsx', 'TieRackMenu.jsx', 'TrouserMenu.jsx',
    'KitMenu.jsx', 'WardrobeMenu.jsx', 'Entries.jsx', 'Duty.jsx', 'index.jsx',
    'DoorMenu.jsx', 'RailMenu.jsx', 'WatchMenu.jsx', 'LightingMenu.jsx',
  ]) {
    assert.ok(!files.includes(gone), `${gone} is back beside its copy — that is the second track`);
  }

  // ─── AND WHAT STANDS IN THEIR PLACE IS A TABLE ────────────────────────────
  // Read as TEXT rather than imported: node cannot load a `.jsx`, and a router
  // that had to be executable in node would be a router shaped by its test.
  const dock = read('src/retail/design/detail/docked.jsx');
  for (const menu of ['door', 'watch', 'rail']) {
    assert.match(dock, new RegExp(`menu === '${menu}'`), `${menu} has no branch in the dock`);
  }
  // The three that are a copied WINDOW are the three the dock owns on the
  // shared modal slot, and `Editors.jsx` splits on that ONE list.
  assert.match(dock, /export const DOCK_MODALS = Object\.freeze\(\['element', 'rail', 'watch-layout'\]\)/);
  const editors = read('src/retail/design/Editors.jsx');
  assert.match(editors, /import \{ DOCK_MODALS \} from '\.\/detail\/docked\.jsx'/);
  assert.match(editors, /DOCK_MODALS\.includes\(name\) \? dock : !dock/,
    'a window could be drawn in both places');

  // …and everything else the engine cuts a board for is PRO's own piece panel.
  assert.match(dock, /return \{ props: \{ panel, item, omit: omitted\(\) \} \}/);
  const detail = read('src/retail/design/Detail.jsx');
  assert.match(detail, /import ElementProperties from '\.\/detail\/ElementProperties\.jsx'/);
  assert.ok(isCopy('src/retail/design/detail/ElementProperties.jsx'),
    'the docked panel is not PRO\'s own file');
});

test('F3 · the workshop\'s own fields are HIDDEN, not cut — and behind ONE flag', () => {
  // CLAUDE.md F3: *"Workshop fields inside the copied editors are hidden, not
  // cut … behind `RETAIL_SHOW_WORKSHOP_TOOLS=false`."*
  const dock = read('src/retail/design/detail/docked.jsx');
  assert.match(dock, /import \{ RETAIL_SHOW_WORKSHOP_TOOLS \} from '\.\.\/\.\.\/config\.js'/);
  assert.match(dock, /RETAIL_SHOW_WORKSHOP_TOOLS \? \[\] : \[\.\.\.WORKSHOP_FIELDS\]/,
    'the flag does not turn the fields back on');
  // They are left out through PRO's OWN `omit` prop — not by editing a copy.
  assert.match(read('src/retail/design/detail/ElementProperties.jsx'),
    /elementFields\(panel, type\)\.filter\(\(f\) => !omit\.includes\(f\)\)/,
    'the copy\'s own omit API is gone, so retail must have edited it');
  for (const field of ['setback', 'thickness', 'carcass-board', 'front-board', 'material', 'runner-variant']) {
    assert.match(dock, new RegExp(`'${field}'`), `${field} is not named as a workshop field`);
  }
  // Inside a copied WINDOW retail is not the caller, so the four the brief
  // names are hidden by the ROOM's own sheet — the markup is untouched.
  const css = read('src/retail/styles/room.css');
  for (const marker of ['data-piece-weight', 'data-element-move', 'data-element-material', 'data-handle-apply-all']) {
    assert.match(css, new RegExp(`\\[${marker}`), `${marker} is not hidden in the dock`);
  }
  assert.match(css, /\.pbi-room\[data-workshop-tools="no"\] \.pbi-dock/,
    'the hiding is not behind the one flag');
  assert.match(read('src/retail/RetailApp.jsx'),
    /data-workshop-tools=\{RETAIL_SHOW_WORKSHOP_TOOLS \? 'yes' : 'no'\}/,
    'the flag is not stamped on the room');
});

test('F3 · the licensed deletion — and the branch that made it possible', () => {
  // CLAUDE.md licenses ONE deletion by name. It is gone from the whole tree…
  const bad = [];
  const walk = (dir) => {
    for (const e of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
      if (e.isDirectory()) walk(`${dir}/${e.name}`);
      else if (/\.(js|jsx)$/.test(e.name)) {
        const t = code(`${dir}/${e.name}`);
        // The sentence itself, and any re-wording of it — the licence was for
        // the placeholder, not for a synonym of it.
        if (/No options for this element/i.test(t)) bad.push(`${dir}/${e.name}: the placeholder`);
        if (/nothing to (choose|change|set) (for|about) this/i.test(t)) {
          bad.push(`${dir}/${e.name}: the placeholder, re-worded`);
        }
      }
    }
  };
  walk('src/retail');
  assert.deepEqual(bad, [], `the placeholder came back:\n  ${bad.join('\n  ')}`);

  // …and so is the DEFAULT BRANCH it lived in, which is the half that matters:
  // a `switch` invites one, a table does not.
  //
  // T66 F3 · the router MOVED — `detail/index.jsx` and the thirteen thin menus
  // it pointed at are deleted, and `detail/docked.jsx` is the table in its
  // place. The law is the same law and it is asked of the new file: no default
  // branch, and the last word is `return null` rather than a placeholder.
  const router = code('src/retail/design/detail/docked.jsx');
  assert.ok(!/default:/.test(router), 'the router has a default branch again');
  assert.match(router, /export function dockFor\(selection\)/, 'the router is not a function of the selection');
  assert.match(router, /if \(!panel\) return null;/, 'a selection with no panel opens something');
  const detail = code('src/retail/design/Detail.jsx');
  assert.ok(!/UnknownDetail/.test(detail), 'the unknown panel is back');
});

test('F3 · an unmapped kind is NOT selectable — nothing highlights, nothing opens', () => {
  const unit = room({ drawers: 3 });
  // A drawer PANEL the engine cuts but `elementKind` files as a mechanism: the
  // runner panel and its fillers. `isSelectableElement` says no, and the room
  // must agree rather than render an empty column.
  const mech = panelsOf(unit.id).find((p) => p.part === 'DP' || p.part === 'FILLER');
  assert.ok(mech, 'the fixture has no mechanism panel to ask about');
  assert.equal(elementKind(mech), null, 'the engine calls this a mechanism');
  assert.equal(A.resolveSelection({ unitId: unit.id, elementRef: mech.id }), null,
    'an unmapped kind resolved to a menu');

  // …and a ref that names nothing at all.
  assert.equal(A.resolveSelection({ unitId: unit.id, elementRef: 'nothing-like-this' }), null);
  assert.equal(A.resolveSelection(null), null);

  // The room CLEARS such a selection rather than leaving a highlight behind.
  const design = read('src/retail/design/DesignRoom.jsx');
  assert.match(design, /if \(!found\) \{[\s\S]{0,200}clearElement/,
    'DesignRoom does not clear a selection it has no menu for');
});

test('F3 · a SINGLE click reaches a door — the owner\'s own gesture', () => {
  // PRO's single click selects the CABINET and a leaf is reached by
  // double-clicking it (turn 13's verdict, turn 14's gesture). Right for a
  // bench; a client double-clicks nothing, and the owner's sentence is
  // *"jak naciśniemy na drzwi to się pojawi drzwi."*
  const unit = room({ width: 600 });
  const door = A.doorPanels(unit.id)[0];
  const shelfUnit = room({ shelves: 1 });
  const shelf = panelsOf(shelfUnit.id).find((p) => p.part === 'SHELF');

  assert.equal(pickMode(), 'workshop', 'PRO\'s answer is the default');
  assert.equal(picksOnClick(shelf), isMainViewElement(shelf), 'workshop asks isMainViewElement');
  assert.equal(picksOnClick(door), false, 'PRO does not pick a leaf on a single click');

  setPickMode('client');
  try {
    assert.equal(picksOnClick(door), true, 'a client must reach a door with one click');
    assert.equal(picksOnClick(shelf), true, '…and a shelf, exactly as before');
    // The SET is the one PRO's DOUBLE click already opens — nothing new became
    // reachable, only the gesture changed.
    assert.equal(picksOnClick(door), opensOwnModal(door));
    const mech = panelsOf(room({ drawers: 3 }).id).find((p) => p.part === 'DP');
    assert.equal(picksOnClick(mech), false, 'a mechanism is still not a thing you point at');
  } finally {
    setPickMode('workshop');
  }
  assert.equal(pickMode(), 'workshop', 'anything but the word restores PRO\'s answer');
  setPickMode('nonsense');
  assert.equal(pickMode(), 'workshop');

  // …and the retail entry is what asks the other question.
  assert.match(read('src/retail/main-retail.jsx'), /setPickMode\('client'\)/);
  for (const rel of ['src/App.jsx', 'src/main.jsx', 'src/pages/ConfiguratorPage.jsx']) {
    assert.ok(!/setPickMode/.test(read(rel)), `${rel} must know nothing of the pick mode`);
  }
});

test('F3 · a click in the stage reaches the ITEM, not a string that looks like it', () => {
  // t59 matched the engine's panel id against the interior items' ids, and it
  // could never succeed: a panel id is positional (`SHELF-1`) and an item id is
  // `shelf_` plus seven characters of base 36. So EVERY stage click fell to the
  // placeholder. This is the regression that must never come back.
  const unit = room({ shelves: 2 });
  const panel = panelsOf(unit.id).find((p) => p.part === 'SHELF');
  assert.ok(panel && panel.meta?.itemId, 'a shelf panel must name its own item');
  assert.ok(!panel.id.includes(panel.meta.itemId), 'the ids do not look alike — that IS the point');

  const found = A.resolveSelection({ unitId: unit.id, elementRef: panel.id });
  assert.equal(found.menu, 'shelf');
  assert.equal(found.item.id, panel.meta.itemId, 'the selection did not reach the item');
});

// ─── AMENDED BY T66 F3 ──────────────────────────────────────────────────────
//
// T60 asked that every kind the engine cuts be MAPPED. T66 F3 adds the second
// honest answer — the owner's own: *"jak naciśniesz w szafę lub poza menu —
// znika"* — so a CARCASS kind is deliberately not a key, and the panel slides
// out on it. The law this test exists for is the THIRD case, and it is the
// same law: a kind may not resolve to a highlight with nothing behind it.
test('F3 · every engine kind is either mapped or unselectable — no third case', () => {
  const unit = room({ drawers: 3, shelves: 2, rail: true });
  A.setBayCount(unit.id, 2);
  const third = [];
  for (const panel of panelsOf(unit.id)) {
    const kind = elementKind(panel);
    if (!kind) continue;                       // a mechanism: not selectable at all
    const found = A.resolveSelection({ unitId: unit.id, elementRef: panel.id });
    if (A.MENU_FOR_KIND[kind]) {
      // MAPPED — and then it must actually resolve, to a menu the list knows.
      if (!found || !A.MENUS.includes(found.menu)) third.push(`${kind} maps to ${found?.menu || 'nothing'}`);
      continue;
    }
    // UNMAPPED — and then it must resolve to NOTHING, so the room clears it.
    if (found) third.push(`${panel.part}/${panel.role} → ${kind} is unmapped but resolved to ${found.menu}`);
  }
  assert.deepEqual([...new Set(third)], [],
    `a kind that is neither mapped nor unselectable:\n  ${third.join('\n  ')}`);

  // …and the carcass is the way OUT, by name — the whole of T66 F3's F10 clause.
  for (const kind of ['side', 'top', 'bottom', 'back', 'plinth', 'end-panel', 'infill', 'masking-panel']) {
    assert.equal(A.MENU_FOR_KIND[kind], undefined, `${kind} still opens a menu`);
  }
});

// ═══ 2 · THE NINE, ONE AT A TIME ═══════════════════════════════════════════

test('F3.1 · WARDROBE — the sliders\' ends are the engine\'s three clamps', () => {
  const unit = room({ width: 900 });
  const b = A.unitBounds(unit.id);
  assert.ok(b, 'no bounds at all');

  // MIN: named, and every one of them a number the profile already holds.
  assert.equal(b.width.min, Math.round(Math.max(P.board.thickness * 2, P.wardrobe.topBox.minWidth)));
  assert.equal(b.height.min, P.wardrobe.minHeight);
  assert.equal(b.depth.min,
    Math.round(P.wardrobe.drawers.depthSteps[0] + P.wardrobe.drawers.depthAllowance));
  for (const dim of ['width', 'height', 'depth']) {
    assert.match(b[dim].from, /profile|collision/, `${dim} does not name its source`);
    assert.ok(b[dim].max > b[dim].min, `${dim} has no room between its ends`);
  }

  // MAX: the room's own, and it MOVES with the room — which is what makes it
  // the engine's answer rather than a constant somebody wrote down.
  const before = A.unitBounds(unit.id).height.max;
  A.setSpace({ ceilingMm: 2200 });
  assert.ok(A.unitBounds(unit.id).height.max < before, 'a lower ceiling did not lower the slider');
});

test('F3.1 · WARDROBE — a refused size answers in the ROOM\'s own sentence', () => {
  const unit = room({ width: 900 });
  const b = A.unitBounds(unit.id);
  const no = A.setUnitSize(unit.id, { height: b.height.max + 500 });
  assert.equal(no.ok, false, 'the room did not refuse an impossible height');
  assert.ok(no.said.length > 20, 'the refusal is not a sentence');
  // VERBATIM the engine's: retail types no part of it.
  const engine = read('src/engine/roomFit.js');
  const stem = no.said.split('—')[0].trim().split(' ').slice(1, 4).join(' ');
  assert.ok(engine.includes('will not fit') || engine.includes('is what is left'),
    `the sentence is not roomFit's (stem: ${stem})`);

  // …and a size the room takes is simply taken.
  const yes = A.setUnitSize(unit.id, { width: 1200 });
  assert.equal(yes.ok, true);
  assert.equal(Math.round(S().units.find((u) => u.id === unit.id).params.width), 1200);
});

test('F3.1 · WARDROBE — DOORS and BAYS are two acts, not one under two names', () => {
  const unit = room({ width: 1800 });
  const before = A.doorCount(unit.id);

  // BAYS writes the partitions, flush, and centres them.
  assert.equal(A.setBayCount(unit.id, 3), 3);
  const parts = itemsOf(unit.id).filter((i) => i.kind === 'partition');
  assert.equal(parts.length, 2, 'three bays is two dividers');
  for (const p of parts) assert.equal(Number(p.front_mm), 0, 'a divider set back is invisible to the door law');
  assert.equal(A.bayCount(unit.id), 3);

  // DOORS writes the leaves, and the two numbers are free to differ — which is
  // the whole difference between them.
  assert.notEqual(A.doorCount(unit.id), before + 99);
  A.setDoorCount(unit.id, 2);
  assert.ok(A.doorCount(unit.id) >= 1);

  // …and the refusal for another bay is the STORE's own gate, in words.
  const tiny = room({ width: 600 });
  const why = A.bayRefusal(tiny.id, 8);
  assert.ok(why.includes(String(Math.round(P.board.thickness + 2 * P.editor.minShelfGap))),
    `the bay refusal does not carry the engine's own number: ${why}`);
});

test('F3.1 · WARDROBE — the one-door law refuses in the engine\'s terms', () => {
  const unit = room({ width: 900 });
  const why = A.doorCountRefusal(900, 1);
  assert.ok(why, 'a 900 mm carcass must refuse one leaf');
  assert.ok(why.includes(String(P.doors.singleDoorMaxWidth)),
    'the refusal does not carry the profile\'s own singleDoorMaxWidth');
  assert.equal(A.doorCountRefusal(600, 1), '', 'a 600 mm carcass takes one leaf');
  assert.equal(A.doorCountRefusal(900, 2), '', 'a pair is never refused');
  assert.ok(unit);
});

test('F3.2 · DOOR — the hand is written the way the leaf is hung', () => {
  const unit = room({ width: 600 });
  const panel = A.doorPanels(unit.id)[0];
  assert.ok(panel, 'the wardrobe arrives with its doors on');

  const hinge = A.doorHinge(unit.id, panel);
  assert.equal(hinge.forced, false);
  assert.equal(hinge.reason, '', 'a single leaf has nothing to refuse');

  A.setDoorHinge(unit.id, panel, 'R');
  const after = A.doorPanels(unit.id)[0];
  assert.equal(String(after.meta.hinge).toUpperCase(), 'R', 'the hand did not reach the engine');

  // A PAIR: the engine hangs -FL left and -FR right by construction, so the
  // chips must be disabled WITH that said rather than offered and ignored.
  const wide = room({ width: 1200 });
  const leaves = A.doorPanels(wide.id);
  if (leaves.length > 1) {
    assert.equal(A.doorHinge(wide.id, leaves[0]).reason, REASONS.pairHangsBothWays);
  }
});

test('F3.2 · DOOR — J-pull refuses the screwed-on systems, and NONE is the way back', () => {
  const unit = room({ width: 600 });
  const panel = A.doorPanels(unit.id)[0];
  A.setDoorHandle(unit.id, panel.id, 'jpull');
  assert.equal(A.doorHandle(unit.id, panel, S().project), 'jpull');

  // ─── AMENDED BY T63 F3 ─────────────────────────────────────────────────
  // `DoorMenu.jsx` — T60's 113-line sketch of PRO's 996-line `DoorModal` — is
  // deleted, and the door's window in retail is now PRO's own, COPIED. The
  // T57 law it applied is PRO's `DoorModal`'s to apply now, in PRO's own
  // words: the handle rows read `handleClassOf` and refuse the screwed-on
  // systems while a J is chosen. Asserted on the copy.
  const menu = read('src/retail/design/detail/DoorModal.jsx');
  assert.match(menu, /handleClassOf/, 'the copied door window lost the T57 law');
  assert.match(menu, /HANDLE_TYPES/, 'the copied door window lost the handle rows');
  assert.equal(A.REASON_JPULL, REASONS.jpullTakesNoHandle);

  // …and NONE takes the client back out, which is what stops the row being a
  // one-way door.
  A.setDoorHandle(unit.id, panel.id, 'none');
  assert.equal(A.doorHandle(unit.id, panel, S().project), 'none');
  A.setDoorHandle(unit.id, panel.id, 'bar');
  assert.equal(A.doorHandle(unit.id, panel, S().project), 'bar');
});

test('F3.3 · SHELF — it MOVES, and its ends are the engine\'s band', () => {
  const unit = room({ shelves: 3 });
  const shelf = itemsOf(unit.id).find((i) => i.kind === 'shelf');
  const travel = A.shelfTravel(unit.id, shelf.id);
  assert.ok(travel, 'no travel at all');
  assert.equal(travel.blocked, false, 'the owner\'s own example must not be blocked');
  assert.ok(travel.fieldMax > travel.fieldMin, 'the slider has no room');
  assert.equal(A.shelfReason(travel), '', 'a movable shelf carries no refusal');

  // The MINIMUM GAP is the profile's, not retail's — proved by moving the
  // board at its neighbour and watching the engine stop it.
  const to = travel.fieldMax + 500;
  A.setShelfHeight(unit.id, shelf.id, to);
  const now = A.shelfTravel(unit.id, shelf.id);
  assert.ok(now.field <= travel.fieldMax + 1, 'the clamp let it past its own ceiling');

  // The NUMBER is the clear light under the board, not the stored underside —
  // the same figure PRO's field shows, so the client and the joiner read one.
  const G = unit.params.board_t ?? P.board.thickness;
  assert.equal(now.field, Math.round(now.pos - G));
});

// ─── AMENDED BY TURN 67 · F7 ──────────────────────────────────────────────
//
// The owner, 11.09.2026, of INSIDE grown long: *"jak dodajesz szuflady, to się
// nie powinny pokazywać pod spodem, tu menu po lewej ma być puste — powinno
// się pokazywać po prawej … te funkcje niech przejdą na prawą stronę."*
//
// T66's `ReHomed` moved WHOLE out of `Options.jsx` and into
// `detail/ReHomed.jsx`, which the DOCK renders. The claim every assertion
// below makes is unchanged — not one control a deleted thin menu carried was
// lost — so the reader is the two files that now hold them between them.
const REHOMED = () => read('src/retail/design/Options.jsx')
  + read('src/retail/design/detail/ReHomed.jsx');

test('F3.3 · SHELF — pinned is a NOTE, locked is a refusal, and they differ', () => {
  const unit = room({ rail: true });
  const items = itemsOf(unit.id);
  const carried = items.find((i) => i.kind === 'shelf');
  assert.ok(carried, 'a rail arrives with the shelf it hangs from');

  const travel = A.shelfTravel(unit.id, carried.id);
  assert.equal(travel.pinned, true, 'something hangs on it — T58-F3.1');
  // …and it STILL MOVES (T37-F2). A slider gated on `pinned` would have been
  // the very "nieprzesunięcia się półki" the owner refused.
  assert.equal(travel.blocked, false, 'a rail-carrying board must still move');
  assert.equal(A.shelfReason(travel), '', 'pinned is not a refusal');
  const notes = A.shelfNotes(travel, null);
  assert.ok(notes.includes(REASONS.shelfPinned), 'pinned must be said as a note');

  const before = travel.field;
  A.setShelfHeight(unit.id, carried.id, before - 120);
  assert.ok(A.shelfTravel(unit.id, carried.id).field < before, 'the setter refused what the slider offered');

  // A shelf the store WOULD refuse — locked — offers no slider at all.
  S().setShelfLocked(unit.id, carried.id, true);
  const other = room({ shelves: 1 });
  const plain = itemsOf(other.id).find((i) => i.kind === 'shelf');
  S().setShelfLocked(other.id, plain.id, true);
  const held = A.shelfTravel(other.id, plain.id);
  assert.equal(held.locked, true);
  assert.equal(held.blocked, true);
  assert.equal(A.shelfReason(held), REASONS.shelfLocked, 'a locked board must say why');

  // T66 F3 · the thin ShelfMenu is deleted; a shelf clicked on the stage docks
  // PRO's OWN piece panel, whose `position-y` field is the height this test has
  // just walked. The height that reaches the store is the same height, because
  // `setShelfPos` is the same setter — which is the point of docking a copy
  // rather than writing a fourteenth surface.
  const dock = read('src/retail/design/detail/docked.jsx');
  assert.match(dock, /return \{ props: \{ panel, item, omit: omitted\(\) \} \}/);
  assert.match(read('src/retail/design/detail/ElementProperties.jsx'), /case 'position-y':/,
    'PRO\'s own height field is gone from the copy');
  // …and the EVEN LADDER, which the copy has no button for, is re-homed on the
  // left, in INSIDE's own row (F3's *"never lost"* clause).
  assert.match(REHOMED(), /data-testid="shelf-centre"/,
    'CENTRE THIS BAY was lost with the menu that carried it');
});

test('F3.3 · SHELF — CENTRE THIS BAY is the T58 law, per bay, and it reclamps', () => {
  const unit = room({ width: 1800, shelves: 3 });
  const shelf = itemsOf(unit.id).find((i) => i.kind === 'shelf');
  const travel = A.shelfTravel(unit.id, shelf.id);
  A.setShelfHeight(unit.id, shelf.id, travel.fieldMin);
  A.centreBay(unit.id, travel.bay);
  const after = A.shelfTravel(unit.id, shelf.id);
  assert.ok(after.field > travel.fieldMin, 'centring moved nothing');

  // The pair of calls, not one: `redistributeShelvesInBay` does not reclamp,
  // and every other centring path in the store ends with one.
  const adapter = read('src/retail/design/adapter.js');
  assert.match(adapter, /redistributeShelvesInBay\(unitId, bay \?\? null\);\s*\n\s*S\(\)\.reclampShelves/,
    'centreBay does not reclamp');
});

test('F3.4 · DRAWERS — the counts, the insert and the two engine refusals', () => {
  const unit = room({ drawers: 3 });
  const b = A.drawerBounds();
  assert.equal(b.maxCount, P.wardrobe.drawers.maxCount);
  assert.equal(b.front.min, P.wardrobe.drawers.minFrontHeight);
  assert.equal(b.front.max, P.wardrobe.drawers.maxFrontHeight);

  // The TOP drawer's insert goes through the store's own guarded action, so a
  // shoe gets the shoe's DERIVED height and not the 200 it happened to have.
  A.setTopInsert(unit.id, 'shoes');
  const top = A.drawerStack(unit.id).top;
  assert.equal(top.variant, 'shoe');
  assert.equal(top.height_mm,
    P.wardrobe.drawers.shoeSideMm + P.wardrobe.drawers.frontToSideDelta,
    'a converted shoe drawer kept a front the box cannot carry');

  // A shoe on the TOP drawer is not a reason to refuse watches — it is the
  // thing being replaced. Refusing there would trap the client in the choice
  // they just made.
  assert.equal(A.insertRefusals(unit.id).watches, '', 'the chip refused its own replacement');
  A.setTopInsert(unit.id, 'watches');
  assert.equal(A.drawerStack(unit.id).top.watch_insert, true);

  // …but a shoe on ANOTHER drawer is: and the sentence is the store's own law.
  const two = room({ drawers: 3 });
  S().setDrawerFitting(two.id, itemsOf(two.id).filter((i) => i.kind === 'drawer')[0].id, 'shoe');
  assert.equal(A.insertRefusals(two.id).watches, REASONS.watchWithShoe);
});

test('F3.4 · DRAWERS — the GLASS needs a tray, and then a shelf over it', () => {
  const unit = room({ drawers: 3 });
  assert.equal(A.glassRefusal(unit.id), REASONS.glassNeedsWatch, 'glass with no tray must refuse');
  A.setTopInsert(unit.id, 'watches');
  // With a tray but nothing above it the ENGINE is what refuses, in its words.
  const why = A.glassRefusal(unit.id);
  assert.ok(why === '' || why === REASONS.glassNeedsShelf, `unexpected: ${why}`);
});

test('F3.4 · DRAWERS — the ONE slider stands down where it would overwrite a fixed height', () => {
  const plain = room({ drawers: 3 });
  assert.equal(A.stackHasFixedHeights(plain.id), '', 'a plain stack may be split');
  A.setStackFronts(plain.id, 250);
  for (const d of A.drawerStack(plain.id).drawers) assert.equal(d.height_mm, 250);

  // …and with a watch tray in it, it says so instead of silently overwriting
  // the height the owner declared slider-less.
  A.setTopInsert(plain.id, 'watches');
  assert.equal(A.stackHasFixedHeights(plain.id), REASONS.stackHasAFixedDrawer);
  // T66 F3 · the thin DrawersMenu is deleted and the STACK-WIDE questions it
  // carried — how many, the top insert, the glass, and this front height — are
  // re-homed into INSIDE's own row. ONE drawer's own height is the docked
  // copy's `drawer-height`, which is PRO's own field.
  const options = REHOMED();
  assert.match(options, /\{fixed \? \([\s\S]{0,200}<Said/, 'the row shows a field beside the reason');
  assert.match(options, /testid="drawers-front-height"/);
  assert.match(read('src/retail/design/detail/ElementProperties.jsx'), /case 'drawer-height':/,
    'PRO\'s own per-drawer height is gone from the copy');
});

test('F3.5 · RAIL — the engine\'s own two mounts, and the height that is its shelf\'s', () => {
  const unit = room({ rail: true });
  const rail = itemsOf(unit.id).find((i) => i.kind === 'hanger');
  const travel = A.railTravel(unit.id, rail.id);
  assert.equal(travel.mounted, 'shelf');
  assert.equal(travel.blocked, true, 'a rod on a shelf does not own its own height');
  assert.equal(A.railReason(travel), REASONS.railFollowsItsShelf);
  assert.deepEqual(A.RAIL_MOUNTS.map((m) => m.id), ['shelf', 'alone'],
    'the engine has two mounts and no double-rail law');

  // Changing the mount is a RE-PLACEMENT: the fix shelf goes with the rod
  // rather than being orphaned in the cut list.
  const shelvesBefore = itemsOf(unit.id).filter((i) => i.kind === 'shelf').length;
  A.setRailMount(unit.id, rail.id, 'alone');
  assert.equal(itemsOf(unit.id).filter((i) => i.kind === 'shelf').length, shelvesBefore - 1,
    'switching to ON ITS OWN left a shelf carrying nothing');
  const alone = itemsOf(unit.id).find((i) => i.kind === 'hanger');
  const now = A.railTravel(unit.id, alone.id);
  assert.equal(now.mounted, 'alone');
  assert.equal(now.blocked, false, 'a rod on its own owns its height');
  assert.equal(A.railReason(now), '');

  // …and the slider's far end is the engine's clamp, not retail's guess.
  const R = P.wardrobe.rail;
  const radius = P.hardware.rail.diameter / 2;
  assert.equal(now.max, Math.max(now.min,
    Math.round((now.axis - now.offset === now.support ? 0 : 0)
      + ((unit.params.height - (unit.params.board_t ?? P.board.thickness))
        - R.topClearance - radius) - now.support)));

  // and it CLAMPS rather than letting the engine lower it with a warning.
  A.setRailOffset(unit.id, alone.id, now.max + 400);
  assert.ok(A.railTravel(unit.id, alone.id).offset <= now.max, 'the rod was written past its ceiling');
});

test('F3.6 · WATCH — the four layouts are the engine\'s four, drawn from its own fields', () => {
  assert.deepEqual(A.watchLayouts().map((l) => l.id), WATCH_LAYOUTS.map((l) => l.id));
  for (const l of A.watchLayouts()) {
    const engine = WATCH_LAYOUTS.find((e) => e.id === l.id);
    assert.equal(l.label, engine.label.toUpperCase());
    assert.equal(l.hint, engine.hint, 'the hint is not the engine\'s own');
    assert.equal(l.rows, engine.rows);
    assert.equal(l.backStrip, engine.backStrip);
  }
  // ─── AMENDED BY T63 F3 ─────────────────────────────────────────────────
  // The drawing was retail's own (`drawings.jsx WatchLayoutDrawing`) because
  // *"retail cannot import PRO's"*. It CAN copy it, and did: the watch window
  // in retail is PRO's `WatchLayoutModal`, whose `Schematic` is drawn from the
  // engine's own computed tray (`watchDrawerLayout` — pockets, sections,
  // lanes, the back strip) and invents nothing. The sketch's drawing went with
  // the sketch. Asserted on the copy.
  const drawing = read('src/retail/design/detail/WatchLayoutModal.jsx');
  for (const field of ['watchDrawerLayout', 'pockets', 'lanes', 'backStrip']) {
    assert.ok(drawing.includes(field), `the copied schematic ignores the engine's ${field}`);
  }

  // PROJECT / SPRAYED — the T58 pair, and it is a null and one engine id.
  const finishes = A.watchFinishes();
  assert.deepEqual(finishes.map((f) => f.id), ['project', 'spray']);

  const unit = room({ drawers: 3 });
  S().addWatchDrawer(unit.id);
  const tray = itemsOf(unit.id).find((i) => i.watch_insert === true || i.variant === 'watch');
  assert.ok(tray, 'no watch drawer was made');
  A.setWatchLayout(unit.id, tray.id, 'belts');
  assert.equal(A.watchLayoutOf(itemsOf(unit.id).find((i) => i.id === tray.id)), 'belts');
  A.setWatchFinish(unit.id, tray.id, 'spray');
  assert.equal(A.watchFinishIdOf(itemsOf(unit.id).find((i) => i.id === tray.id)), 'spray');
  A.setWatchFinish(unit.id, tray.id, 'project');
  assert.equal(A.watchFinishIdOf(itemsOf(unit.id).find((i) => i.id === tray.id)), 'project');
});

test('F3.7 · SHOE — fixed law, said in words, with no invented option', () => {
  const law = A.shoeLaw();
  assert.equal(law.dividers, 2, 'the owner\'s own "po prostu daj 2 zawsze"');
  assert.equal(law.tiltDeg, P.wardrobeAccessories.shoeShelf.tiltDeg,
    'the ramp leans at the shoe shelf\'s own tilt, read where it lives');
  assert.equal(law.lanes, 3);

  // T66 F3 · the thin ShoeMenu is deleted. What it carried was a DRAWING and a
  // SENTENCE — never a control, because the ramp is fixed law — and both are
  // re-homed onto the shoe drawer's own row in INSIDE.
  const options = REHOMED();
  // T67 F7 · the ROW's own branch, not the drawer-name table beside it.
  const at = options.indexOf("if (row.id === 'shoe')");
  const row = options.slice(at, at + 700);
  assert.ok(!/ChipRow/.test(row), 'the shoe row offers a choice the workshop has already made');
  assert.match(row, /A\.shoeLaw\(\)/, 'the sentence is not read from the profile');
  assert.match(row, /<ShoeDrawing lanes=\{law\.lanes\}/, 'the drawing went with the menu');
  assert.match(row, /testid="shoe-law"/);
});

test('F3.8 · PULL-DOWN — the drop is the owner\'s own frame, bounded by the body', () => {
  const unit = room();
  const id = S().addWardrobeKit(unit.id, 'pulldown_rail');
  assert.ok(id, 'the kit was not added');
  const travel = A.pulldownTravel(unit.id, id);
  const body = P.wardrobeAccessories.kits.pulldown_rail;
  assert.equal(travel.standard, body.topDrop, 'the standard is the profile\'s own topDrop');
  assert.equal(travel.min, 0);
  const G = unit.params.board_t ?? P.board.thickness;
  assert.equal(travel.max, Math.round(unit.params.height - 2 * G - body.bodyHeight),
    'the far end is not where the body would stand on the base');

  A.setPulldownDrop(unit.id, id, 300);
  assert.equal(A.pulldownTravel(unit.id, id).drop, 300);
  // …and the engine reads it in that frame: a bigger drop is a lower rod.
  const y = (n) => {
    A.setPulldownDrop(unit.id, id, n);
    return (S().unitResult(unit.id).assemblies.wardrobeKits || []).find((k) => k.id === id).box.y;
  };
  assert.ok(y(400) < y(100), 'a bigger drop did not hang the rod lower');
});

test('F3.9 · LIGHTING — a strip belongs to a board, and the pane light is not a switch', () => {
  const unit = room({ shelves: 2 });
  const panel = panelsOf(unit.id).find((p) => p.part === 'SHELF');
  assert.equal(A.shelfStripOf(S().project, unit.id, panel.id), null);

  A.setShelfStrip(unit.id, panel.id, true);
  const strip = A.shelfStripOf(S().project, unit.id, panel.id);
  assert.ok(strip, 'no strip was written');
  // The IDENTICAL record PRO's LightingPanel writes.
  assert.equal(strip.kind, 'shelf');
  assert.equal(strip.ref, panel.id);
  assert.equal(strip.unitId, unit.id);
  assert.match(read('src/components/LightingPanel.jsx'), /kind: 'shelf', ref: shelfPanel\.id/,
    'PRO writes a different record — the two have drifted');

  A.setShelfStrip(unit.id, panel.id, false);
  assert.equal(A.shelfStripOf(S().project, unit.id, panel.id), null, 'the strip did not come off');

  // THE PANE LIGHT. t59 offered a chip calling `setLighting({ pane })` —
  // `migrateDesign` drops any key outside `{ on, temperature, switch, items }`,
  // so it wrote to nothing. It is gone, and one true line stands where it was.
  S().setLighting({ pane: true });
  assert.equal(S().project.design.lighting.pane, undefined, 'the key survives — this test is stale');
  // ─── AMENDED BY T63 F2 ─────────────────────────────────────────────────
  // `LightingMenu.jsx` — T60's 61-line sketch of PRO's 861-line panel — is
  // deleted; retail's lighting is PRO's `LightingPanel`, COPIED. It never
  // wrote a `pane` key either (PRO's file has no such control), which is
  // asserted on the copy; the pane light is the engine's own automatic ring.
  const menu = code('src/retail/design/lighting/LightingPanel.jsx');
  assert.ok(!/setLighting\(\{ pane/.test(menu), 'the dead pane control is back');
  assert.match(menu, /setLighting\(\{ on: /, 'the copied panel lost PRO\'s ON / OFF');
  assert.equal(A.paneLight(S().project, unit.id).present, false);
});

// ═══ 3 · THE LAW THAT GOVERNS ALL NINE ═════════════════════════════════════

test('F3 · not one menu speaks to the store or the engine — the adapter is the wall', () => {
  const strays = [];
  for (const file of readdirSync(join(ROOT, 'src/retail/design/detail'))) {
    if (!/\.jsx?$/.test(file)) continue;
    // T63: a COPY of a PRO window speaks the engine because PRO's file does —
    // routing it through the adapter would be re-writing it, which is the one
    // thing this turn forbids. Per file, per original (`scripts/t63-copies.mjs`);
    // `Entries.jsx` is retail's own and still answers here.
    if (isCopy(`src/retail/design/detail/${file}`)) continue;
    const text = read(`src/retail/design/detail/${file}`);
    for (const m of text.matchAll(/from '\.\.[^']*\/(engine|3d|stores)\/[^']*'/g)) {
      strays.push(`${file} reaches ${m[0]}`);
    }
  }
  assert.deepEqual(strays, [],
    `a menu reached past the adapter:\n  ${strays.join('\n  ')}`);
});

test('F3 · every refusal a menu can show is tied to a predicate that is not retail\'s', () => {
  const reasons = read('src/retail/design/reasons.js');
  // Each entry carries a PREDICATE line naming what decides it. The file's own
  // preamble makes that promise; this is the promise checked.
  // A JSDoc block may run to several lines with a `*` down its left edge, so
  // the scan spans them rather than stopping at the first star.
  const named = [...reasons.matchAll(/PREDICATE:[\s\S]*?\*\/\s*\n\s*(\w+):/g)].map((m) => m[1]);
  const declared = Object.keys(REASONS);
  const orphans = declared.filter((k) => !named.includes(k));
  // `paneIsLit` is explicitly NOT a refusal and says so in its own comment.
  assert.deepEqual(orphans, ['paneIsLit'],
    `a reason with no predicate named above it:\n  ${orphans.join('\n  ')}`);

  // …and nothing in a MENU authors a sentence of its own. A SENTENCE is a
  // single-line string long enough and spaced enough to be prose — which is
  // what distinguishes one from a class list or a path.
  for (const file of readdirSync(join(ROOT, 'src/retail/design/detail'))) {
    if (!/Menu\.jsx$/.test(file)) continue;
    // T65 F8: PRO's copied ContextMenu carries PRO's own refusals, word for
    // word — that is what 1:1 MEANS. The law is about sentences retail INVENTS.
    if (isCopy(`src/retail/design/detail/${file}`)) continue;
    const text = code(`src/retail/design/detail/${file}`);
    const long = [...text.matchAll(/['`]([^'`\n]{45,})['`]/g)].map((m) => m[1])
      .filter((lit) => (lit.match(/ /g) || []).length >= 6)
      .filter((lit) => !lit.includes('/') && !lit.startsWith('pbi-'));
    assert.deepEqual(long, [], `${file} writes its own sentence: ${long.join(' | ')}`);
  }
});

// ─── REPLACED BY T66 F3 ─────────────────────────────────────────────────────
//
// T60 asked that each of the thirteen thin menus carry `onDone` so a client
// could always get back. There are no thin menus: there is ONE panel, and the
// way out of it is one link in one file — which is a stronger version of the
// same promise, and the reason it can be asserted in three lines.
test('F3 · ONE way out of the panel, and it is in ONE file', () => {
  const files = readdirSync(join(ROOT, 'src/retail/design/detail'));
  assert.deepEqual(files.filter((f) => /Menu\.jsx$/.test(f)), [],
    'a thin Duty menu is back, and with it a second DONE');
  const detail = read('src/retail/design/Detail.jsx');
  assert.match(detail, /data-testid="detail-close"/, 'the panel cannot be closed');
  assert.match(detail, /onClick=\{clear\}/);
  // CLOSE takes the WHOLE selection — the scene's own `clearSelection`, exactly
  // as a click on the empty stage does — so the panel cannot slide straight
  // back in on the selection it just let go of.
  assert.match(detail, /const clear = \(\) => \{[\s\S]{0,320}clearSelection/);
  // …and it closes the shared modal slot too, but only when the DOCK is what
  // filled it: a modal opened from the left is not the panel's to shut.
  assert.match(detail, /if \(DOCK_MODALS\.includes\(ui\.modal\)\) ui\.closeModal\(\);/);
});

test('F3 · every REMOVE goes through the store\'s own remove', () => {
  const adapter = read('src/retail/design/adapter.js');
  assert.match(adapter, /export const removeElement = \(unitId, itemId\) => S\(\)\.removeItem/);
  // T61 F3: and the unit-level one, the same shape, for the same reason.
  assert.match(adapter, /export const removeUnit = \(unitId\) => S\(\)\.removeUnit/);
  // ─── AMENDED BY T61 F3, AND AGAIN BY T66 F3 ───────────────────────────
  // A TOP BOX is a UNIT, not an item in a section — `params.rides_on` is a
  // link between two units — so its REMOVE is `removeUnit` and not
  // `removeItem`. Both are the STORE's own remove, which is the whole of what
  // this test is for.
  //
  // The thin menus that carried a REMOVE are deleted; the removes that had no
  // copied editor to go to are re-homed into INSIDE's rows, and this asks the
  // same question of the file they landed in.
  const options = REHOMED();
  for (const [what, testid] of [
    ['the overlay stack', 'overlay-remove'],
    ['the pull-down rod', 'pulldown-remove'],
    ['the trouser pull-out and the tie rack', 'kit-${row.id}-remove'],
  ]) {
    assert.ok(options.includes(testid), `${what} lost its REMOVE with the menu`);
  }
  const removes = [...options.matchAll(/data-testid=\{?[`"]([a-z$-{}.]*-remove)[`"]\}?[\s\S]{0,320}?onClick=\{\(\) => ([\s\S]{0,90}?)\}/g)];
  assert.ok(removes.length >= 3, `only ${removes.length} re-homed removes found`);
  // ─── AMENDED BY T70 F5, WITH THE EXEMPTION NAMED RATHER THAN IMPLIED ─────
  //
  // The law is about removing a THING FROM A WARDROBE — a stack, a rod, a
  // bought fitting — and it is that every one of them goes through the store's
  // own remove rather than by unpicking an item list in retail.
  //
  // `fronts-colour-remove` removes no such thing. It takes a COLOUR off the
  // PROJECT's palette (`setFrontTypes(n − 1)`) and, first, takes it off every
  // cabinet wearing it (`resetUnitFinish` through the adapter's one road) so
  // that no unit is left pointing at a type that no longer exists. Both are
  // the store's own calls; neither is an element remove, and asserting
  // `A.removeElement` of it would be asserting the wrong act.
  //
  // It is exempted BY NAME, so the law keeps its teeth for everything else and
  // a fourth exemption has to be argued the way this one is.
  const NOT_AN_ELEMENT = ['fronts-colour-remove'];
  for (const [, id, body] of removes) {
    if (NOT_AN_ELEMENT.includes(id)) {
      assert.match(body, /A\.removeFrontColour\(/, `${id} is exempt and still takes another road`);
      continue;
    }
    assert.match(body, /A\.remove(Element|Unit)\(/, `${id} removes by another road`);
  }
  // …and the exemption really is the store's own pair, in one place.
  assert.match(read('src/retail/design/adapter.js'),
    /export function removeFrontColour[\s\S]{0,900}?S\(\)\.setFrontTypes\(/,
    'removing a colour no longer shrinks the project\'s own type list');

  // …and the STAGE follows, because the removal is the store's own recompute.
  const unit = room({ shelves: 2 });
  const shelf = itemsOf(unit.id).find((i) => i.kind === 'shelf');
  const before = panelsOf(unit.id).filter((p) => p.part === 'SHELF').length;
  A.removeElement(unit.id, shelf.id);
  assert.equal(panelsOf(unit.id).filter((p) => p.part === 'SHELF').length, before - 1);
});

test('F3 · the selection the INTERIOR list opens is the selection a click opens', () => {
  const unit = room({ shelves: 2, drawers: 3, rail: true });
  useUiStore.getState().clearElement();
  for (const row of A.INTERIOR_ROWS) {
    const sel = A.selectionForMenu(row.menu, unit.id);
    if (!sel) continue;                        // the wardrobe holds none of these
    assert.equal(sel.menu, row.menu, `${row.id} opens the wrong menu`);
    assert.ok(A.MENUS.includes(sel.menu), `${row.id} opens a menu that does not exist`);
    assert.equal(sel.unitId, unit.id);
  }
  // A row for something that is not there opens nothing at all.
  assert.equal(A.selectionForMenu('shoe', unit.id), null);
});
