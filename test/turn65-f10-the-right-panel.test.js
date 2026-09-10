// ─── TURN 65 · F10 — THE RIGHT PANEL OBEYS ONE SENTENCE ─────────────────────
//
// The owner: *"po naciśnięciu na inny element menu się zmienia, a jak
// naciśniesz w szafę lub poza menu — znika."*
//
// Click an element and its menu slides in; click a DIFFERENT element and it
// SWAPS IN PLACE; click the wardrobe body or the empty stage and it slides
// out. Plus the owner's point 5: the inner plus hides while INSIDE is open.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import * as A from '../src/retail/design/adapter.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const code = (rel) => read(rel).replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');

// ═══ 1 · IN, SWAP, OUT ═════════════════════════════════════════════════════

test('F10 · the panel is one element at a time, and OPEN is a single flag', () => {
  const detail = read('src/retail/design/Detail.jsx');
  // One flag drives the slide, and it is the presence of a menu — so a target
  // that goes from element A to element B never passes through "closed".
  // T66 F3 · the flag is the same single flag; what it reads is the DOCK's
  // route rather than a thin menu's component. A→B still never passes through
  // "closed", which is the whole of this law.
  assert.match(detail, /data-open=\{open \? 'yes' : 'no'\}/);
  assert.match(detail, /const open = Boolean\(route\);/);
  assert.match(detail, /data-menu=\{open \? selection\.menu : ''\}/,
    'the panel does not say which menu it is showing');
  assert.match(detail, /data-editor=\{open \? \(route\.modal \|\| 'element-properties'\) : ''\}/,
    'the panel does not say which EDITOR it is showing');
  // The slide itself is CSS on that flag — not a mount/unmount, which is what
  // "swaps in place" means in a stylesheet.
  const css = read('src/retail/styles/room.css');
  assert.match(css, /\.pbi-detail \{[^}]*transform: translateX\(100%\)/);
  assert.match(css, /\.pbi-detail\[data-open="yes"\] \{[^}]*transform: none/);
});

test('F10 · clicking a DIFFERENT element swaps the target without clearing it first', () => {
  const room = code('src/retail/design/DesignRoom.jsx');
  const at = room.indexOf('if (fullScreen) { setTarget(null); return; }');
  assert.ok(at > 0, 'the selection effect has changed shape');
  const effect = room.slice(at, room.indexOf('}, [selectedElement', at));

  // A RESOLVED element sets the target directly and returns — no clear on the
  // way, so the panel never closes between one element and the next.
  assert.match(effect, /setTarget\(\{\s*menu: found\.menu/, 'the element branch does not set the target directly');

  // The effect closes the panel in exactly THREE places, and none of them is on
  // the path from one element to another: full screen; an element whose kind
  // has no editor (T60's law — a highlight with nothing behind it is the empty
  // panel by another road); and, since T66 F3, the carcass or the empty stage,
  // which is the owner's own *"jak naciśniesz w szafę lub poza menu — znika"*.
  assert.equal([...effect.matchAll(/setTarget\(null\)/g)].length, 3,
    'the panel is cleared somewhere new — count the closes');
  assert.match(effect, /if \(!found\) \{\s*setTarget\(null\);/, 'an unmapped kind no longer clears');
});

test('F10 · a click on the WARDROBE BODY slides it out — T64 opened its menu there', () => {
  const room = code('src/retail/design/DesignRoom.jsx');
  // The unit-only branch no longer opens the wardrobe's own menu…
  assert.ok(!/selectionForMenu\('wardrobe', selectedUnitId\)/.test(room),
    'a carcass click still opens the wardrobe menu');
  // ─── FINISHED BY T66 F3 ───────────────────────────────────────────────
  // T65 closed only what the STAGE opened, because a row's `›` was a second
  // road in. The rows' `›` is gone — *"po prawej powinien być tylko menu
  // edycji"* — so a cleared selection simply closes the panel, in one line.
  assert.match(room, /setTarget\(null\);\n  \}, \[selectedElement, selectedUnitId, fullScreen\]\)/);
  assert.ok(!/from: 'list'|from: 'stage'/.test(room), 'the two roads into the panel are back');
  // …and the resolution itself refuses a carcass kind now, so there is nothing
  // for the panel to hold in the first place.
  for (const kind of ['side', 'top', 'bottom', 'back', 'plinth', 'end-panel', 'infill', 'masking-panel']) {
    assert.equal(A.MENU_FOR_KIND[kind], undefined, `${kind} still opens a menu`);
  }
  // The wardrobe's own settings are not lost — they are the LEFT: its three
  // numbers are the SIZE step, what goes in it is INSIDE, the rest is EXTRAS.
  const options = read('src/retail/design/Options.jsx');
  assert.match(options, /testid="size-width"/);
  assert.match(options, /testid="size-height"/);
  assert.match(options, /testid="size-depth"/);
});

// ═══ 2 · THE OWNER'S POINT 5 ═══════════════════════════════════════════════

test('F10 · the inner plus hides while the INSIDE step is open', () => {
  const room = code('src/retail/design/DesignRoom.jsx');
  const stage = code('src/retail/design/Stage.jsx');
  const scene = code('src/3d/Scene.jsx');
  assert.match(room, /hideInnerPlus=\{active === 'inside'\}/, 'the room never hides the plus');
  assert.match(stage, /hideInnerPlus=\{hideInnerPlus\}/, 'the stage does not pass it on');
  // No handler, no plus: UnitView draws it only when it has somewhere to send
  // the click, so this needed no change in that file at all.
  assert.match(scene, /onAddItems=\{hideInnerPlus \? undefined :/);
  assert.match(read('src/3d/UnitView.jsx'), /selected && !contour && !shelfDrag && onAddItems &&/);
  // ADDITIVE: PRO passes nothing and its plus is where it always was.
  assert.match(scene, /hideInnerPlus = false,/);
  for (const f of ['src/App.jsx', 'src/main.jsx']) {
    assert.ok(!/hideInnerPlus/.test(read(f)), `${f} passes hideInnerPlus`);
  }
});

// ═══ 3 · THE THREE MENUS — WHAT THEY ACTUALLY ARE ══════════════════════════

// ─── AMENDED BY T66 F3 ──────────────────────────────────────────────────────
//
// T65 measured CLAUDE.md's premise and found it wrong: the shared `KitMenu`
// carried the PROFILE's own sentence and a REMOVE, which is a real act. T66's
// second half of that same choice — *"or the element is made unclickable"* —
// is what tonight takes, because F3 leaves nothing on the right for a fitting
// PRO has no editor for. The words and the REMOVE are NOT lost: they stand on
// the fitting's own row in INSIDE, where the row that added it already was.
test('F10 · the three kits keep the fitting\'s words and REMOVE — on the LEFT', () => {
  const options = read('src/retail/design/Options.jsx');
  assert.match(options, /A\.kitWords\(row\.id\)\.said/, 'the sentence is not the profile\'s');
  assert.match(options, /data-testid=\{`kit-\$\{row\.id\}-remove`\}/, 'there is no REMOVE');
  assert.match(options, /A\.removeElement\(unitId, item\.id\)/, 'REMOVE does not reach the store');
  assert.match(options, /row\.id === 'trouser' \|\| row\.id === 'tie_rack'/,
    'the two named fittings lost their shared row');

  // …and they are UNCLICKABLE, which is what makes one surface honest.
  assert.deepEqual(A.KIT_MENUS, {}, 'a kit is selectable again with no editor behind it');

  // …and the words are real, so the row is not visually empty either.
  for (const kind of ['trouser', 'tie_rack']) {
    const words = A.kitWords(kind);
    assert.ok(words.label.length > 2, `${kind} has no label`);
    assert.ok(words.said.length > 20, `${kind} has nothing to say`);
  }
});

test('F10 · …and there was nothing of PRO\'s to copy for them', () => {
  // The other half of the choice CLAUDE.md offers — "give each the controls
  // PRO's editor has for it" — has no subject: PRO has no editor for either
  // fitting. Its ONLY mention of them is the ADD list, which retail already
  // has as a copy.
  const proFiles = ['DoorModal.jsx', 'RailModal.jsx', 'WatchLayoutModal.jsx', 'ElementProperties.jsx'];
  for (const f of proFiles) {
    const text = read(`src/components/${f}`);
    assert.ok(!/tie_rack|trouser/.test(text), `src/components/${f} does have an editor to copy`);
  }
  assert.match(read('src/components/AddItems.jsx'), /tie_rack/, "PRO's ADD list lost the tie rack");
});
