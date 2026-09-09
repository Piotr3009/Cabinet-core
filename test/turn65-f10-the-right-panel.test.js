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
  assert.match(detail, /data-open=\{Menu \? 'yes' : 'no'\}/);
  assert.match(detail, /data-menu=\{Menu \? selection\.menu : ''\}/,
    'the panel does not say which menu it is showing');
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

  // The effect closes the panel in exactly TWO places, and neither is on the
  // path from one element to another: full screen, and an element whose kind
  // has no menu (T60's law — a highlight with nothing behind it is the empty
  // panel by another road).
  assert.equal([...effect.matchAll(/setTarget\(null\)/g)].length, 2,
    'the panel is cleared somewhere new — count the closes');
  assert.match(effect, /if \(!found\) \{\s*setTarget\(null\);/, 'an unmapped kind no longer clears');
});

test('F10 · a click on the WARDROBE BODY slides it out — T64 opened its menu there', () => {
  const room = code('src/retail/design/DesignRoom.jsx');
  // The unit-only branch no longer opens the wardrobe's own menu…
  assert.ok(!/selectionForMenu\('wardrobe', selectedUnitId\)/.test(room),
    'a carcass click still opens the wardrobe menu');
  // …it closes what the STAGE opened, and leaves a list-opened menu standing.
  assert.match(room, /setTarget\(\(t\) => \(t && t\.from === 'stage' \? null : t\)\)/);
  // The wardrobe's menu is not lost — the OPTIONS column's row still opens it.
  assert.match(read('src/retail/design/Options.jsx'), /THIS WARDROBE — SIZE AND DOORS/);
  assert.match(code('src/retail/design/DesignRoom.jsx'), /from: 'list'/);
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

test('F10 · TieRack, Trouser and Kit are NOT empty — each carries the fitting\'s words and REMOVE', () => {
  // CLAUDE.md calls these three empty and asks for PRO's controls or for the
  // element to be made unclickable. Measured, the premise does not hold: the
  // shared `KitMenu` renders the PROFILE's own sentence about the fitting and
  // a REMOVE, which is a real act — not the dead control T60's law forbids.
  const kit = read('src/retail/design/detail/KitMenu.jsx');
  assert.match(kit, /A\.kitWords\(kind\)/, 'the label and the sentence are not the profile\'s');
  assert.match(kit, /data-testid=\{`kit-\$\{kind\}-remove`\}/, 'there is no REMOVE');
  assert.match(kit, /A\.removeElement\(unitId, fitted\.id\)/, 'REMOVE does not reach the store');

  // Both named menus route to that one shape, and both name their kind.
  for (const [file, kind] of [['TieRackMenu.jsx', 'tie_rack'], ['TrouserMenu.jsx', 'trouser']]) {
    const text = read(`src/retail/design/detail/${file}`);
    assert.match(text, /import KitMenu from '\.\/KitMenu\.jsx'/, `${file} is not the shared shape`);
    assert.match(text, new RegExp(`kind="${kind}"`), `${file} does not name its kind`);
  }

  // …and the words are real, so the panel is not visually empty either.
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
