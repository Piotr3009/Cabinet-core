// ─── TURN 61 · F5 & F6 — THE TYPED FIELD, AND WHAT IS IN THE WALL ──────────
//
// F5, the owner: *"nie widze sensu [suwaków] bo i tak nie trafisz, trzeba
// bedzie wpisac; kratki do wpisywania rogi pieknie zaokraglone a nie kanciaki,
// ze zlota obwodka a nie jakis dziwny pomarancz."*
//
// F6, the owner: *"skosy, okna, drzwi trzeba bedzie dodac"*, scoped by
// *"3 — narazie sie rysuja"*.
//
// ─── THE ONE THING F5 IS REALLY ABOUT ──────────────────────────────────────
//
// A slider CANNOT be dragged past its end, so nothing downstream of it ever had
// to refuse a number. A field can be typed past it, so something does — and the
// standing law says what: room-refuses-first, no silent clamp. `Slider` carries
// `value={Math.max(min, Math.min(max, at))}`; `NumberField` must not, and that
// is the first assertion below.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import * as A from '../src/retail/design/adapter.js';
import { REASONS } from '../src/retail/design/reasons.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { OPENING_DEFAULTS, openingsOnWall } from '../src/engine/room.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const S = () => useProjectStore.getState();

const fresh = () => {
  A.startDesign('Bedroom wardrobe');
  A.setSpace({ wallMm: 3000, ceilingMm: 2600 });
  return A.designUnit(S().units).id;
};

// ═══ F5 ═══════════════════════════════════════════════════════════════════

test('F5 · the field does not clamp — it refuses, and says so', () => {
  const controls = read('src/retail/design/controls.jsx');
  const at = controls.indexOf('export function NumberField(');
  const body = controls.slice(at, controls.indexOf('\n}\n', at));
  assert.ok(!/Math\.max\(min, Math\.min\(max/.test(body),
    'NumberField carries the slider\'s silent clamp');
  assert.match(body, /if \(n < min \|\| n > max\) \{ setSaid\(outOfRange\(min, max\)\); return; \}/,
    'an out-of-range number is not refused');
  // …and the WRITE only happens after that check passes.
  assert.ok(body.indexOf('if (n < min || n > max)') < body.indexOf('onCommit(n)'),
    'the field writes before it checks');
  // COMMIT ON BLUR AND ENTER, never per keystroke: a wall on its way from 3000
  // to 400 passes through 40, and 40 is a room the store would refuse.
  assert.match(body, /onBlur=\{commit\}/);
  assert.ok(!/onChange=\{\(e\) => onCommit/.test(body), 'it writes on every keystroke');
});

test('F5 · the refusal under the field is the SHARED CORE\'s, not retail\'s', () => {
  const id = fresh();
  // The store's own room guard, verbatim through `setSpace`'s verdict.
  A.setUnitSize(id, { width: 2400 });
  const verdict = A.setSpace({ wallMm: 800 });
  assert.equal(verdict.ok, false, 'shrinking the wall under the wardrobe was allowed');
  assert.ok(verdict.message, 'the room refused without saying why');
  // Options hands that message straight to the field.
  assert.match(read('src/retail/design/Options.jsx'),
    /onCommit=\{\(v\) => A\.setSpace\(\{ wallMm: v \}\)\?\.message \|\| ''\}/);

  // …and the unit's own refusal comes back the same way.
  const said = A.setUnitSize(id, { height: 99999 });
  assert.equal(said.ok, false);
  assert.ok(said.said, 'the store refused without saying why');
});

test('F5 · the ONE sentence retail owns names its predicate, and the bounds', () => {
  assert.equal(REASONS.outOfRange(600, 4000), 'Between 600 and 4000 mm — type a number in that range.');
  const reasons = read('src/retail/design/reasons.js');
  assert.match(reasons, /PREDICATE: the typed number against the bounds/,
    'outOfRange has no predicate named above it');
});

test('F5 · every bound in the two panels is the engine\'s, not a literal', () => {
  const options = read('src/retail/design/Options.jsx');
  const fields = [...options.matchAll(/<NumberField[\s\S]*?\/>/g)].map((m) => m[0]);
  assert.ok(fields.length >= 6, `only ${fields.length} typed fields in the two panels`);
  for (const f of fields) {
    const min = (f.match(/min=\{([^}]+)\}/) || [])[1] || '';
    const max = (f.match(/max=\{([^}]+)\}/) || [])[1] || '';
    for (const [name, v] of [['min', min], ['max', max]]) {
      assert.ok(v, `a field with no ${name}`);
      assert.ok(/^(b\.|size\.|bounds\[|ceiling)/.test(v.trim()),
        `a ${name} that is not the engine's: ${v}`);
    }
  }
});

test('F5 · the sliders THIS turn licensed are gone, and Slider still has callers', () => {
  const options = read('src/retail/design/Options.jsx');
  assert.ok(!/<Slider/.test(options), 'a slider survived in YOUR SPACE or LAYOUT');
  // LICENSED REMOVAL, and its balance: the component itself only goes when its
  // caller count reaches zero, and it has not — the Duty menus still use it.
  let callers = 0;
  for (const dir of ['src/retail/design', 'src/retail/design/detail']) {
    for (const f of readdirSync(join(ROOT, dir))) {
      const p = join(ROOT, dir, f);
      if (!statSync(p).isFile() || !/\.jsx$/.test(f)) continue;
      callers += (readFileSync(p, 'utf8').match(/<Slider/g) || []).length;
    }
  }
  assert.equal(callers, 12, 'the Slider caller count is not what the balance reports');
  assert.match(read('src/retail/design/controls.jsx'), /export function Slider\(/,
    'Slider was deleted while it still had callers');
});

test('F5 · gold, rounded, and never orange — by token, and by token only', () => {
  const tokens = read('src/retail/styles/tokens.css');
  assert.match(tokens, /--pbi-radius:\s*0;/, 'the system\'s own radius stopped being 0');
  assert.match(tokens, /--pbi-field-radius:\s*\d+px;/, 'the field has no radius token');
  const base = read('src/retail/styles/base.css');
  const at = base.indexOf('.pbi-numfield {');
  const rule = base.slice(at, base.indexOf('}', at));
  assert.match(rule, /border-radius: var\(--pbi-field-radius\)/);
  assert.match(rule, /border-color: var\(--pbi-gold\)/, 'the "zlota obwodka" is not gold');
  const focus = base.slice(base.indexOf('.pbi-numfield:focus-visible'));
  assert.match(focus.slice(0, focus.indexOf('}')), /outline: 2px solid var\(--pbi-champagne\)/);
  // The selection ring too — a browser's default blue inside a gold box is the
  // *"dziwny pomarancz"* class of mistake, one hue over.
  assert.match(base, /\.pbi-numfield::selection \{ background: var\(--pbi-champagne\)/);
});

// ═══ F6 ═══════════════════════════════════════════════════════════════════

test('F6 · a new opening is the engine\'s defaults, centred, and clamped', () => {
  fresh();
  const made = A.addOpening('window', 0);
  assert.equal(made.ok, true, made.said);

  const [win] = A.roomOpenings(S().project, S().project.room);
  assert.equal(win.kind, 'window');
  assert.equal(win.width, OPENING_DEFAULTS.window.width);
  assert.equal(win.height, OPENING_DEFAULTS.window.height);
  assert.equal(win.sill, OPENING_DEFAULTS.window.sill);
  // CENTRED on its wall — `WallElevationModal`'s own placement.
  const wall = A.wallLengthMm(S().project.room, 0);
  assert.equal(Math.round(win.x_mm), Math.round(wall / 2 - win.width / 2));

  // A DOOR STANDS ON THE FLOOR — `clampOpening`'s law, not retail's.
  A.addOpening('door', 0);
  const door = A.roomOpenings(S().project).find((o) => o.kind === 'door');
  assert.equal(door.sill, 0);
  assert.equal(door.height, OPENING_DEFAULTS.door.height);
});

test('F6 · every write goes through setRoom — never the three bare setters', () => {
  const adapter = read('src/retail/design/adapter.js');
  const at = adapter.indexOf('T61 F6 · WINDOWS AND DOORS');
  const block = adapter.slice(at, adapter.indexOf('T61 F1 · WHERE A `+` GOES'));
  assert.equal((block.match(/store\.setRoom\(/g) || []).length, 3,
    'add, edit and remove do not all go through setRoom');
  for (const bare of ['S().addOpening(', 'S().updateOpening(', 'S().removeOpening(']) {
    assert.ok(!block.includes(bare),
      `${bare} skips migrateRoom, clampOpening and the room guard`);
  }
  // …and the shape is clamped BEFORE it is stored, as PRO's editor does.
  assert.match(block, /clampOpening\(\{[\s\S]{0,200}\}, room\)/);
});

test('F6 · the four fields\' ends are clampOpening\'s own arithmetic', () => {
  fresh();
  A.addOpening('window', 0);
  const [win] = A.roomOpenings(S().project);
  const b = A.openingBounds(win, S().project.room);
  const wall = A.wallLengthMm(S().project.room, 0);
  const roomH = Math.round(S().project.room.height);

  assert.equal(b.x_mm.max, wall - win.width, 'an opening may run past the end of its wall');
  assert.equal(b.width.max, wall);
  assert.equal(b.width.min, 100);
  assert.equal(b.height.max, roomH - win.sill);
  assert.equal(b.sill.max, roomH - 100);
  assert.equal(b.from, 'engine/room.js clampOpening');

  // …and an edit inside them lands, while the ENGINE's clamp still has the last
  // word on anything that reaches it.
  assert.equal(A.setOpening(win.id, { x_mm: 200 }).ok, true);
  assert.equal(A.roomOpenings(S().project)[0].x_mm, 200);
});

test('F6 · it draws — the shared room, on an in-scope wall, with no gate', () => {
  const draw = read('src/3d/Room.jsx');
  // NO CHROME GUARD anywhere in the file: the retail mount hides nothing here,
  // so F1's channel mechanics were not needed and none were added.
  assert.ok(!/chrome\.js/.test(draw), 'Room.jsx grew a chrome guard');
  assert.match(draw, /openings=\{wall\.stub \? \[\] : openingsOnWall\(room, wall\.index\)\}/,
    'the wall no longer draws what room.openings holds');

  // A SECOND WALL's opening is therefore drawn too, because wall 1 is real in
  // `'two'` — which is the whole of what F6 needed from F2.
  fresh();
  A.setWallCount('two');
  A.addOpening('door', 1);
  assert.equal(openingsOnWall(S().project.room, 1).length, 1);
  assert.deepEqual(A.wallsShown(S().project, S().project.room), [0, 1]);
  assert.equal(A.roomOpenings(S().project).filter((o) => o.wall === 1).length, 1,
    'an opening on wall 2 is not offered');
});

test('F6 · REMOVE takes one, and nothing else', () => {
  fresh();
  const a = A.addOpening('window', 0);
  A.addOpening('door', 0);
  assert.equal(A.roomOpenings(S().project).length, 2);
  assert.equal(A.removeOpening(a.id).ok, true);
  const left = A.roomOpenings(S().project);
  assert.equal(left.length, 1);
  assert.equal(left[0].kind, 'door');
});

test('F6 · KNOWN GAP, stated: nothing fits around an opening tonight', () => {
  fresh();
  const id = A.designUnit(S().units).id;
  A.addOpening('window', 0);
  const [win] = A.roomOpenings(S().project);
  // Stand the wardrobe right across it. The owner's explicit *"na razie"*: it
  // is allowed, and the room says nothing. This test exists so that the day
  // fit logic arrives, the sentence in the PR body stops being true LOUDLY.
  const moved = S().moveUnit(id, win.x_mm, 0);
  assert.ok(moved, 'the wardrobe would not move');
  assert.equal(A.unitWarnings(id).filter((w) => /window|opening/i.test(w)).length, 0,
    'something now complains about a wardrobe across a window — update the PR body');
  // And the room says it, in the panel, rather than leaving it to be found.
  assert.match(read('src/retail/design/Options.jsx'),
    /Nothing is fitted\s*\n?\s*around them yet/);
});
