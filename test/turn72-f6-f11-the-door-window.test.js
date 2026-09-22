// ─── TURN 72 · F6 + F11 — THE DOOR WINDOW SHOWS WHAT IT HOLDS ─────────────
//
// The owner, 22.09.2026:
//
//   *"2klik na drzwiach nie pokazuje w ogóle hinges"*, *"mamy fajny w PRO to
//   menu z zawiasami i ze strzałkami up and down, skopiuj z PRO"*, *"gdzie jest
//   left/right wybór oraz podzielenie drzwi, top section?"*
//
// …and, asked what he meant by the top box: *"chodziło mi o podzielenie
// drzwi."*  That is F11, and it is answered entirely by F6's probe: the split
// door was never missing from the window, it was mounted and on the screen all
// along — what was missing was the two blocks beside it.
//
// ─── THE PROBE IS THE FIRST HALF OF THIS FILE ──────────────────────────────
//
// `verify/t72/f6-probe.md` was committed BEFORE a line was changed and
// `f6-probe-after.md` is the same walk afterwards. The gate was never the
// fault: `isDoor` is TRUE for a wardrobe leaf and the copy mounts all three
// blocks behind it. The ROOM'S OWN STYLESHEET took two of them.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { rectCorners } from '../src/engine/room.js';
import { elementFields } from '../src/engine/elements.js';
import { getUnitType } from '../src/engine/types.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { useUiStore } from '../src/stores/uiStore.js';
import * as A from '../src/retail/design/adapter.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const S = () => useProjectStore.getState();
const U = () => useUiStore.getState();

function aWardrobeWithDoors() {
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  const { id } = S().addUnit('WARDROBE', { params: { width: 1800, height: 2200, depth: 600 } });
  A.addDoors(id);
  return id;
}

const doorOf = (unitId) => (S().unitResult(unitId)?.panels || [])
  .find((p) => p.part === 'FRONT' && p.role === 'front') || null;

/** Every `data-workshop-tools="no"` rule that hides something in the dock. */
const hideRules = () => read('src/retail/styles/room.css').split('\n')
  .map((l, i) => ({ at: i + 1, text: l.trim() }))
  .filter((l) => /^\.pbi-room\[data-workshop-tools="no"\]/.test(l.text) && /\.pbi-dock/.test(l.text));

// ═══ 1 · THE PROBE, AS ASSERTIONS ══════════════════════════════════════════

test('F6 · the gate was never the fault — a wardrobe leaf IS a door', () => {
  const unitId = aWardrobeWithDoors();
  const door = doorOf(unitId);
  assert.ok(door, 'no leaf was cut');
  assert.equal(door.part, 'FRONT');
  assert.equal(door.role, 'front');
  assert.equal(door.meta?.appliance ?? null, null);
  // …evaluated with the copy's OWN expression, read out of the file.
  const gate = read('src/retail/design/detail/DoorModal.jsx').split('\n')
    .find((l) => /const isDoor =/.test(l));
  assert.match(gate, /panel\?\.part === 'FRONT' && panel\?\.role === 'front' && !panel\?\.meta\?\.appliance/);
});

test('F6 · the route was never the fault either — a 2klik reaches the door window', () => {
  const unitId = aWardrobeWithDoors();
  U().clearSelection();
  U().selectElement(unitId, doorOf(unitId).id);
  const found = A.resolveSelection(U().selectedElement);
  assert.equal(found?.menu, 'door');
  assert.equal(found.panel.id, doorOf(unitId).id);
});

test('F6 · the copy MOUNTS all three blocks, behind that one gate', () => {
  const copy = read('src/retail/design/detail/DoorModal.jsx');
  assert.match(copy, /\{isDoor \? <SplitDoorField unit=\{unit\} panel=\{panel\}/, 'no split field');
  assert.match(copy, /\{isDoor \? \(\s*\n\s*<HingeSection/, 'no hinge section');
  assert.match(copy, /<ElementProperties unit=\{unit\} panel=\{panel\} item=\{item\} compact omit=\{\['hinges'\]\}/);
  // …and the window omits exactly `hinges`, so `hinge-side` survives.
  const unitId = aWardrobeWithDoors();
  const fields = elementFields(doorOf(unitId), getUnitType('WARDROBE')).filter((f) => f !== 'hinges');
  assert.ok(fields.includes('hinge-side'), 'the engine stopped publishing the hand');
});

test('F6 · the probe tables are committed — before and after', () => {
  const before = read('verify/t72/f6-probe.md');
  assert.match(before, /THE GATE IS SOUND/);
  assert.match(before, /label:has\(> select\.pbi-re-input\)/, 'the before table does not name the selector');
  const after = read('verify/t72/f6-probe-after.md');
  assert.match(after, /ALL THREE ARE ON THE SCREEN/);
});

// ═══ 2 · THE ONE SELECTOR, NARROWED TO WHAT ITS OWN COMMENT SAYS ═══════════

test('F6 · the board rule names the board — it no longer takes every `<select>`', () => {
  // The comments NAME the old selector (that is how this repository records a
  // narrowing), so the assertion is asked of the RULES rather than of the text.
  const css = read('src/retail/styles/room.css');
  const selectors = css.split('\n').map((l) => l.trim())
    .filter((l) => /^\.pbi-room\[data-workshop-tools="no"\]/.test(l));
  assert.deepEqual(selectors.filter((l) => l.includes('select.pbi-re-input')), [],
    'the shape rule is back — it reaches every control `Field` wraps');
  assert.match(css, /\.pbi-dock label:has\(> select\[data-board-thickness\]\)/);
  assert.match(css, /\.pbi-dock label:has\(> select\[data-partition-slot\]\)/);
  // The hook is on the ONE control the rule was ever about, in PRO and the copy.
  for (const rel of [
    'src/components/ElementProperties.jsx',
    'src/retail/design/detail/ElementProperties.jsx',
  ]) {
    assert.match(read(rel), /data-board-thickness=\{param\}/, `${rel} has no board hook`);
  }
});

test('F6 · HINGE SIDE is on the screen, and so are the other three the rule took', () => {
  // The four `<select>`s the shape rule reached. None is hidden by shape now.
  assert.deepEqual(hideRules().filter((r) => r.text.includes('select.pbi-re-input')), [],
    'the shape rule survives');
  // `shelf-type` is two CHIPS tonight (F2) and the end panel has its own three
  // rows (F1), so of the four only `Hinge side` needed letting through.
  const ep = read('src/retail/design/detail/ElementProperties.jsx');
  const at = ep.indexOf("case 'hinge-side':");
  assert.ok(at > 0);
  assert.match(ep.slice(at, at + 400), /<select/, 'the hand is no longer a select at all');
  assert.ok(!ep.slice(at, at + 400).includes('data-board-thickness'), 'the hand wears the board hook');
});

// ═══ 3 · THE HINGE HEIGHT ROWS COME BACK; THE MODEL STAYS PRO'S ═══════════

test('F6 · the ▲▼ rows are back — *"skopiuj z PRO"*', () => {
  const css = read('src/retail/styles/room.css');
  assert.ok(!/\.pbi-dock \[data-hinge-modal-rows\]/.test(css), 'the height rows are still hidden');
  // …and the block they are in is PRO's own, copied, not a second hinge menu.
  const copy = read('src/retail/design/detail/DoorModal.jsx');
  const pro = read('src/components/DoorModal.jsx');
  assert.equal(copy.split('\n').length, pro.split('\n').length, 'the copy is not PRO\'s length');
  for (const hook of ['data-hinge-modal-rows="1"', 'data-hinge-row', 'data-hinge-up', 'data-hinge-down']) {
    assert.ok(pro.includes(hook) && copy.includes(hook), `${hook} is on one side only`);
  }
  // NO SECOND HINGE MENU WAS WRITTEN — CLAUDE.md F6 says so in as many words.
  for (const rel of ['src/retail/design/detail/ReHomed.jsx', 'src/retail/design/Detail.jsx',
    'src/retail/design/detail/docked.jsx', 'src/retail/design/detail/EndPanel.jsx']) {
    assert.ok(!/HingeSection|hinge-row|setHingePos/.test(read(rel)), `${rel} grew a hinge control`);
  }
});

test('F6 · ASSIGN OTHER HINGE stays PRO\'s — that is what 11.09 was about', () => {
  const css = read('src/retail/styles/room.css');
  assert.match(css, /\.pbi-dock \[data-hinge-modal\] > div:has\(> \[data-hinge-assign\]\)/,
    'the catalogue dropdown came back into the client\'s dock');
  // HIDDEN, NOT CUT: the copy still carries every byte of it.
  const copy = read('src/retail/design/detail/DoorModal.jsx');
  for (const hook of ['data-hinge-assign="1"', 'Assign other hinge']) {
    assert.ok(copy.includes(hook), `the copy lost ${hook}`);
  }
  assert.doesNotMatch(copy, /RETAIL_SHOW_WORKSHOP_TOOLS/, 'a flag was written into a copy');
});

// ═══ 4 · F11 · THE TOP BOX QUESTION, ANSWERED ═════════════════════════════

test('F11 · no top box work — the split door is what he meant, and it was there', () => {
  // *"chodziło mi o podzielenie drzwi."*  The split lives in TWO places and
  // both are untouched by this turn: the door window's own field, and EXTRAS.
  const copy = read('src/retail/design/detail/DoorModal.jsx');
  assert.match(copy, /data-split-door-modal=\{baseId\}/, 'the window lost the split');
  assert.match(copy, /data-split-top-modal="1"/, 'the window lost the TOP SEGMENT field');
  assert.match(copy, />Split door</, 'the block is no longer named');
  // It was never hidden: no rule in the room's sheet names it.
  assert.deepEqual(hideRules().filter((r) => r.text.includes('data-split-door-modal')), []);
  // …and EXTRAS carries it too, which is where a client who has not clicked a
  // door finds it.
  assert.match(read('src/retail/design/Options.jsx'), /testid="extras-split-top"/,
    'SPLIT DOOR (TOP SEGMENT) left EXTRAS');
});

test('F11 · the split really splits — the engine cuts two leaves', () => {
  const unitId = aWardrobeWithDoors();
  const before = (S().unitResult(unitId)?.panels || [])
    .filter((p) => p.part === 'FRONT' && p.role === 'front').length;
  S().setSplitTop(unitId, 600);
  const after = (S().unitResult(unitId)?.panels || [])
    .filter((p) => p.part === 'FRONT' && p.role === 'front');
  assert.ok(after.length > before, 'the split cut no second leaf');
  assert.ok(after.some((p) => p.meta?.split), 'no leaf says it is a segment');
});

test('F11 · and no top box code was written tonight', () => {
  // The claim is a NEGATIVE and it is asserted as one: nothing in this turn's
  // own files touches the rider/top-box law.
  for (const rel of [
    'src/3d/SpacingChain.jsx',
    'src/retail/design/detail/EndPanel.jsx',
    'scripts/t72-copy.mjs',
  ]) {
    assert.ok(!/rides_on|WARDROBE_TOP|riderSlot|topBox/.test(read(rel)),
      `${rel} touches the top box — F11 says there is no top box work`);
  }
});
