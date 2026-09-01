// ─── TURN 62 · F2/F3 — THE COPY IS A COPY, AND THE SLOPE IS REAL ───────────
//
// The owner, 01.09.2026, verbatim. This is the law the whole turn is audited
// against and it is written out here so a later turn cannot undo it by
// accident:
//
//   *"ale cała idea była że niektóre zmiany są wspólne, po to mamy cały silnik
//   w jednym miejscu. jak piszę 1 do 1 to KOPIUJ. ale kopiuj — nie kasuj, nie
//   zmieniaj PRO, tylko zrób identycznie w retail."*
//
// And his verdict on what T61 built instead, which is why this file exists:
//
//   *"miało być prawie 1 do 1 a jest 1 do 20."*
//
// T61 was told retail needed a sloping ceiling. It could not reach the slope
// maths — `test/turn59-f1-the-switch.test.js` said in one line that `src/lib`
// is NOT the shared core — so it wrote a `SLOPED CEILING NO | YES` chip where
// PRO has a 1096-line editor with Side, Start height, Run and Flat in it. A
// chip cannot say *"gdzie jest slope ale nie cały sufit tylko część"*.
//
// ─── WHAT THIS FILE ACTUALLY ASSERTS, AND WHY IT IS SHAPED LIKE THIS ───────
//
// CLAUDE.md asks for a test that reads the PRO source and the retail copy off
// disk and proves the copy carries every control label the original has — *"A
// label PRO has and retail does not is a FAILING test with the label named.
// This is what stops '1 do 20' from happening twice."*
//
// It is done twice over, on purpose:
//
//   1. THE NAMED LIST. Every label CLAUDE.md writes out by hand, asserted by
//      name. It is the owner's own checklist and it fails saying which word is
//      missing.
//   2. THE WHOLE FILE. Every label EXTRACTED from PRO's source — its JSX text,
//      its titles, its aria-labels — asserted to be in the copy. The named list
//      is twenty-two words; a screen has hundreds, and a copy that carried only
//      the twenty-two would pass a hand-written list and still be 1-to-20.
//
// And then the shape, because labels alone would let a copy keep the words and
// lose the wiring: every `data-*` hook, every event handler, every store
// setter and every engine import PRO's file names must be named by the copy
// too.
//
// ─── THE THREE THINGS THE COPY IS ALLOWED TO DIFFER BY ────────────────────
//
// Declared here, so "allowed" is a list and not a judgement call:
//
//   a. IMPORTS REPOINTED — `../engine/x` became `../../../engine/x`, because
//      the copy is three directories deeper. Same modules, same names.
//   b. CLASS NAMES RESKINNED — every PRO class token became a `pbi-re-*` name
//      defined in `src/retail/styles/roomeditor.css`, at PRO's own geometry and
//      in PBI's colours. Retail does not load Tailwind or `src/index.css`;
//      copied unchanged, these screens would render as unstyled markup.
//   c. COLOURS SWAPPED — the SVG hexes of PRO's dark shell became the twelve
//      Ivory & Onyx tokens. `turn59-f2-the-shell.test.js` enforces that half.
//
// …plus ONE addition, in ONE file, which is asserted below by name rather than
// waved through: `RoomModal.jsx`'s opt-in `onOpenWall` hook, which renders
// nothing when it is absent — and it is absent in every call PRO makes.

import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  SLOPE_DEFAULTS, RECESS_DEFAULTS, CHIMNEY_DEFAULTS, MIN_ELEMENT_MM,
  clampSlope, wallHeightAt,
} from '../src/lib/wallElements.js';
import { TWO_SLOPES_NOTE, flatFieldShown, flatFromRun, runFromFlat } from '../src/lib/slopeFlat.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

/**
 * THE COPIES, AND WHERE THEY CAME FROM.
 *
 * `RoomModal` and `WallElevationModal` are the two CLAUDE.md names. `Modal` and
 * `NumberField` are here because the method says so — *"any import that
 * resolves into `src/components/**` is a COPY TOO — walk the tree and copy
 * every PRO component it reaches, recursively, until nothing outside the
 * boundary is imported."* Those two are the whole of what the tree reaches:
 * `Modal.jsx` imports only `lib` and `engine` and `stores`, `NumberField.jsx`
 * only `lib` and `engine`, so the walk terminates there.
 */
const COPIES = [
  ['src/components/RoomModal.jsx', 'src/retail/design/room/RoomModal.jsx'],
  ['src/components/WallElevationModal.jsx', 'src/retail/design/room/WallElevationModal.jsx'],
  ['src/components/Modal.jsx', 'src/retail/design/room/Modal.jsx'],
  ['src/components/NumberField.jsx', 'src/retail/design/room/NumberField.jsx'],
];

/** Comments out. A label quoted in a comment is prose, not a control. */
const uncomment = (text) => text
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^[ \t]*\/\/.*$/gm, ' ');

/**
 * Every LABEL a file shows a person: its JSX text nodes and the strings behind
 * `title`, `label`, `aria-label`, `placeholder`.
 *
 * A JSX text node is what sits between two tags with no braces in it — braces
 * mean an expression, and an expression is not a label this test can compare.
 * Anything under two characters, or with no letter in it, is punctuation.
 */
function labelsOf(source) {
  const code = uncomment(source);
  const found = new Set();
  for (const m of code.matchAll(/>([^<>{}]+)</g)) {
    const text = m[1].replace(/\s+/g, ' ').trim();
    // `a > b && c < d` is arithmetic, not a label. Anything carrying an
    // operator, a bracket or a semicolon is code the naive scan walked into.
    if (/[;=()[\]|&`]|=>/.test(text)) continue;
    if (text.length >= 2 && /[A-Za-z]/.test(text)) found.add(text);
  }
  for (const m of code.matchAll(/\b(?:title|label|aria-label|placeholder)=(?:"([^"]*)"|'([^']*)')/g)) {
    const text = (m[1] ?? m[2]).replace(/\s+/g, ' ').trim();
    if (text.length >= 2 && /[A-Za-z]/.test(text)) found.add(text);
  }
  return [...found].sort();
}

/** Every `data-…` hook name a file publishes. The walk and the tests read these. */
const hooksOf = (source) => [...new Set(
  [...uncomment(source).matchAll(/\bdata-([a-z0-9-]+)=/g)].map((m) => m[1]),
)].sort();

/** Every React event handler a file wires. A gesture PRO has, the copy has. */
const handlersOf = (source) => [...new Set(
  [...uncomment(source).matchAll(/\b(on[A-Z][A-Za-z]+)=/g)].map((m) => m[1]),
)].sort();

/** Every imported NAME, ignoring the path — which is the half that repoints. */
function importedNames(source) {
  const code = uncomment(source);
  const names = new Set();
  for (const m of code.matchAll(/import\s+([\s\S]*?)\s+from\s*['"][^'"]+['"]/g)) {
    for (const raw of m[1].replace(/[{}]/g, ',').split(',')) {
      const name = raw.trim().split(/\s+as\s+/).pop().trim();
      if (name) names.add(name);
    }
  }
  return [...names].sort();
}

// ─── 1 · THE NAMED LIST — CLAUDE.md'S OWN CHECKLIST ────────────────────────

/**
 * CLAUDE.md, F3 of the test section, verbatim: *"assert that the retail copy
 * contains every control label PRO's file contains — `Side`, `Run`, `Start
 * height`, `Flat`, `Width`, `Depth`, `Height`, `Sill`, `From the left`, `On
 * this wall`, `Put on the wall`, `Take it off the wall`, `Rectangle`, `L`,
 * `Walls`, `Box`, `Boxes in the plan`, `Room height (mm)`, `Wall height (mm)`,
 * `Drawn in`, `Back`, `Done`."*
 *
 * `L` is asked for as a whole word: every file in this repository contains the
 * letter L, and an assertion that cannot fail is not one.
 */
const OWNERS_LIST = [
  'Side', 'Run', 'Start height', 'Flat', 'Width', 'Depth', 'Height', 'Sill',
  'From the left', 'On this wall', 'Put on the wall', 'Take it off the wall',
  'Rectangle', 'Walls', 'Box', 'Boxes in the plan',
  'Room height (mm)', 'Wall height (mm)', 'Drawn in', 'Back', 'Done',
];

test('F2/F3 · every label CLAUDE.md names by hand is in the retail copies', () => {
  const room = read('src/retail/design/room/RoomModal.jsx');
  const wall = read('src/retail/design/room/WallElevationModal.jsx');
  const shell = read('src/retail/design/room/Modal.jsx');
  const all = `${room}\n${wall}\n${shell}`;

  const missing = OWNERS_LIST.filter((label) => !all.includes(label));
  assert.deepEqual(missing, [],
    `THE COPY DROPPED A CONTROL CLAUDE.md NAMED: ${missing.join(', ')}`);

  // …and `L` — which is `L-shape` on the button and `L` on the hook. Asked for
  // as both, because every file in this repository contains the letter L and an
  // assertion that cannot fail is not one.
  assert.match(room, />L-shape</, "the L preset is gone from the room's copy");
  assert.match(room, /data-room-preset="L"/, 'the L preset lost its hook');
  assert.match(room, /data-room-preset="rect"/, 'the Rectangle preset lost its hook');

  // The four that decide whether this is an EDITOR or a chip live on ONE wall,
  // so they are asked for in the file that must have them.
  for (const label of ['Side', 'Start height', 'Run', 'Flat']) {
    assert.ok(wall.includes(label), `the slope lost its ${label} field`);
  }
});

// ─── 2 · THE WHOLE FILE — EVERY LABEL, NOT THE TWENTY-TWO ──────────────────

for (const [proPath, retailPath] of COPIES) {
  const name = proPath.split('/').pop();

  test(`F2/F3 · ${name} — every label PRO shows, retail shows`, () => {
    const pro = read(proPath);
    const copy = read(retailPath);
    const missing = labelsOf(pro).filter((label) => !copy.includes(label));
    assert.deepEqual(missing, [],
      `${retailPath} DROPPED ${missing.length} of PRO's labels:\n  ${missing.join('\n  ')}`);
    // Vacuously green is the failure mode of every source-scanning test ever
    // written, so the ground is COUNTED rather than assumed. The numbers are
    // what each file actually shows: two big editors, a shell whose only words
    // are its own three buttons, and a bare input that shows none at all —
    // which is why `NumberField.jsx` is proved by its imports and its props
    // instead, in the test below.
    const FLOOR = {
      'RoomModal.jsx': 20, 'WallElevationModal.jsx': 20, 'Modal.jsx': 1, 'NumberField.jsx': 0,
    };
    assert.ok(labelsOf(pro).length >= FLOOR[name],
      `only ${labelsOf(pro).length} labels found in ${proPath} — the extractor is blind`);
  });

  test(`F2/F3 · ${name} — every hook, gesture and imported name survives`, () => {
    const pro = read(proPath);
    const copy = read(retailPath);

    const lostHooks = hooksOf(pro).filter((h) => !hooksOf(copy).includes(h));
    assert.deepEqual(lostHooks, [], `${retailPath} lost data-hooks: ${lostHooks.join(', ')}`);

    const lostGestures = handlersOf(pro).filter((h) => !handlersOf(copy).includes(h));
    assert.deepEqual(lostGestures, [], `${retailPath} lost gestures: ${lostGestures.join(', ')}`);

    // The IMPORTS repoint; the NAMES do not. A copy that quietly dropped
    // `setWallLengthCorners` would keep every label and lose the law behind it.
    const lostNames = importedNames(pro).filter((n) => !importedNames(copy).includes(n));
    assert.deepEqual(lostNames, [], `${retailPath} stopped importing: ${lostNames.join(', ')}`);
  });
}

// ─── 3 · AND THE COPY DIVERGES ONLY WHERE IT SAID IT WOULD ─────────────────

/**
 * ─── THE VALUE OF EVERY `className=` ATTRIBUTE ────────────────────────────
 *
 * The same parser the reskin pass itself used, so the test reads the file the
 * way the transform wrote it: a double-quoted list, or a balanced `{…}`
 * expression which may hold quoted lists and nested template literals.
 *
 * A regex over "things that look like Tailwind" would be order-dependent and
 * wrong in both directions — `border` matches inside `border-shell-600`, and a
 * class the transform DELETED would still collapse. Parsing the attribute
 * means every token inside one, and only inside one, becomes `X` on BOTH
 * sides, so a renamed class equals the class it renamed and a dropped class
 * does not.
 */
function collapseTokens(region) {
  // A className value is a quoted list, or a template literal whose TEXT runs
  // are class lists and whose `${…}` holes are expressions — and those holes
  // may hold quoted lists and further template literals. Handled by walking
  // rather than by a regex, because a regex over `\`a ${x ? 'b' : ''}\`` cannot
  // see that `a` is a class: the quote inside the hole ends its character
  // class. That is exactly the bug the reskin pass itself had on its first run.
  const words = (text) => text.replace(/\S+/g, 'X');
  let out = '';
  let i = 0;
  while (i < region.length) {
    const c = region[i];
    if (c === '"' || c === "'") {
      const j = region.indexOf(c, i + 1);
      if (j < 0) { out += region.slice(i); break; }
      out += c + words(region.slice(i + 1, j)) + c;
      i = j + 1;
    } else if (c === '`') {
      out += '`';
      i += 1;
      while (i < region.length && region[i] !== '`') {
        if (region[i] === '$' && region[i + 1] === '{') {
          let depth = 0;
          let j = i + 1;
          while (j < region.length) {
            if (region[j] === '{') depth += 1;
            else if (region[j] === '}') { depth -= 1; if (depth === 0) break; }
            j += 1;
          }
          out += `\${${collapseTokens(region.slice(i + 2, j))}}`;
          i = j + 1;
        } else {
          let k = i;
          while (k < region.length && region[k] !== '`'
            && !(region[k] === '$' && region[k + 1] === '{')) k += 1;
          out += words(region.slice(i, k));
          i = k;
        }
      }
      if (i < region.length) { out += '`'; i += 1; }
    } else {
      out += c;
      i += 1;
    }
  }
  return out;
}

function collapseClasses(source) {
  const out = [];
  let last = 0;
  const re = /className=/g;
  let m = re.exec(source);
  while (m) {
    const i = m.index + m[0].length;
    let end = i;
    if (source[i] === '"') {
      end = source.indexOf('"', i + 1) + 1;
    } else if (source[i] === '{') {
      let depth = 0;
      end = i;
      while (end < source.length) {
        if (source[end] === '{') depth += 1;
        else if (source[end] === '}') {
          depth -= 1;
          if (depth === 0) { end += 1; break; }
        }
        end += 1;
      }
    } else {
      m = re.exec(source);
      continue;
    }
    out.push(source.slice(last, m.index), 'className=');
    out.push(collapseTokens(source.slice(i, end)));
    last = end;
    re.lastIndex = end;
    m = re.exec(source);
  }
  out.push(source.slice(last));
  return out.join('');
}

test('F2/F3 · the copies differ by nothing but imports, class names and colour', () => {
  const normalise = (text) => collapseClasses(text)
    // (a) THE REPOINT — three directories deeper, same modules.
    .replace(/\.\.\/\.\.\/\.\.\/(engine|stores|lib|3d)\//g, '../$1/')
    // (b) THE WIDTH PROP is a class too, passed rather than written on an
    //     element, so it is collapsed the same way and on both sides.
    .replace(/width\s*=\s*(?:"[^"]*"|'[^']*')/g, 'width=X')
    // (c) THE COLOUR SWAP — every hex, either palette, becomes one mark.
    .replace(/#[0-9a-fA-F]{3,8}\b/g, '#C')
    .replace(/[ \t]+/g, ' ')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  for (const [proPath, retailPath] of COPIES) {
    const pro = normalise(read(proPath));
    const copy = new Set(normalise(read(retailPath)));
    const dropped = pro.filter((line) => !copy.has(line));
    assert.deepEqual(dropped, [],
      `${retailPath} is missing ${dropped.length} of PRO's own lines:\n  ${dropped.slice(0, 15).join('\n  ')}`);
    // Counted, so a normaliser that flattened everything to nothing would be
    // caught rather than believed.
    assert.ok(pro.length > 40, `only ${pro.length} lines compared for ${proPath}`);
  }
});

test('F2/F3 · the ONE addition is declared, opt-in, and in one file only', () => {
  const room = read('src/retail/design/room/RoomModal.jsx');
  // Declared, by name, at the top of the file it is in.
  assert.match(room, /THE ONE THING THIS COPY HAS THAT PRO'S FILE HAS NOT/);
  assert.match(room, /onOpenWall = null,/, 'the hook is not opt-in');
  assert.match(room, /\{onOpenWall && \(/, 'the hook renders when it is absent');

  // …and nowhere else. The other three copies gained nothing at all.
  for (const rel of [
    'src/retail/design/room/WallElevationModal.jsx',
    'src/retail/design/room/Modal.jsx',
    'src/retail/design/room/NumberField.jsx',
  ]) {
    const pro = read(rel.replace('src/retail/design/room/', 'src/components/'));
    const copy = read(rel);
    // Same number of JSX elements, so nothing was added or taken away.
    const count = (t) => (t.match(/<[A-Za-z]/g) || []).length;
    assert.equal(count(copy), count(pro), `${rel} gained or lost an element`);
  }

  // The route it serves is retail's own file, and that file is not a copy.
  const editor = read('src/retail/design/room/RoomEditor.jsx');
  assert.match(editor, /onOpenWall=\{\(index\) => setWall\(index\)\}/);
  assert.match(editor, /<WallElevationModal/, 'the room has no route to the elevation');
  assert.match(editor, /onBack=\{\(\) => setWall\(null\)\}/, 'Back does not come home');
});

// ─── 4 · PRO IS FROZEN, AND THE COPY IS WHY THAT WAS POSSIBLE ─────────────

test('F2/F3 · not one byte of the four originals moved', () => {
  // The 66-file manifest in `turn59-f1-the-switch.test.js` is the real freeze
  // test. This is the half that belongs HERE: the four files this turn read.
  let base = null;
  for (const ref of ['origin/main', 'main']) {
    try {
      execFileSync('git', ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`], { cwd: ROOT });
      base = ref; break;
    } catch { /* next */ }
  }
  if (!base) return;                       // a tarball; the manifest answered
  const diff = execFileSync('git', ['diff', '--stat', base, '--', ...COPIES.map((c) => c[0])],
    { cwd: ROOT, encoding: 'utf8' }).trim();
  assert.equal(diff, '', `a PRO original moved to make the copy work:\n${diff}`);
});

// ─── 5 · THE SLOPE, END TO END — THIS TURN'S REASON FOR EXISTING ──────────

/**
 * CLAUDE.md, test 6, verbatim: *"A slope test that goes end to end: write
 * `{ side:'R', startHeight:1800, run:900 }` on a 4000 wall and assert
 * `wallHeightAt` gives 2500 at x=0 and 1800 at x=4000 — the ceiling is cut on
 * PART of the wall, not all of it."*
 *
 * PART OF IT is the whole point, and it is the sentence T61's chip could not
 * say: *"gdzie jest slope ale nie cały sufit tylko część."*
 */
test('F3 · a slope cuts PART of the ceiling — 2500 at x=0, 1800 at x=4000', () => {
  const WALL = { wallWidth: 4000, wallHeight: 2500 };
  const slope = { kind: 'slope', wall: 0, side: 'R', startHeight: 1800, run: 900 };

  assert.equal(wallHeightAt(0, [slope], WALL), 2500, 'the left end lost its ceiling');
  assert.equal(wallHeightAt(4000, [slope], WALL), 1800, 'the right end kept a flat ceiling');

  // …and between them it is a RAMP, not a step: full height right up to where
  // the run begins, then down.
  assert.equal(wallHeightAt(3100, [slope], WALL), 2500, 'the rake starts in the wrong place');
  assert.equal(wallHeightAt(3550, [slope], WALL), 2150, 'the rake is not a straight line');
  assert.ok(wallHeightAt(3900, [slope], WALL) < 2000);

  // THREE QUARTERS OF THIS WALL IS UNTOUCHED, which is the thing a NO | YES
  // chip could not express and the reason CLAUDE.md calls F3 the turn's reason
  // for existing.
  const cut = [...Array(41).keys()]
    .map((i) => wallHeightAt(i * 100, [slope], WALL))
    .filter((h) => h < 2500).length;
  assert.ok(cut > 0 && cut < 41 / 2, `the slope cut ${cut} of 41 samples — that is not "part"`);
});

test('F3 · the copy carries lib/wallElements own defaults, not retail\'s', () => {
  const wall = read('src/retail/design/room/WallElevationModal.jsx');
  // The defaults are IMPORTED, never retyped — CLAUDE.md: *"Defaults exactly as
  // `lib/wallElements.js` states them"*, and a second copy of `{900, 300}` in
  // retail is how two files start disagreeing.
  assert.match(wall, /SLOPE_DEFAULTS/);
  assert.match(wall, /RECESS_DEFAULTS/);
  assert.match(wall, /CHIMNEY_DEFAULTS/);
  assert.match(wall, /MIN_ELEMENT_MM/);
  assert.deepEqual(SLOPE_DEFAULTS, { side: 'R', startHeight: 1800, run: 900 });
  assert.deepEqual(RECESS_DEFAULTS, { width: 900, depth: 300 });
  assert.deepEqual(CHIMNEY_DEFAULTS, { width: 600, depth: 350 });
  assert.equal(MIN_ELEMENT_MM, 50);

  // NO SECOND CLAMP IS WRITTEN IN RETAIL. *"Every number stays clamped by
  // `clampSlope` / `clampPlanElement` — no second clamp is written in retail."*
  assert.match(wall, /clampPlanElement/);
  assert.doesNotMatch(wall, /function clamp[A-Z]/, 'retail wrote a clamp of its own');
  assert.equal(typeof clampSlope, 'function');

  // The TWO-SLOPES note is carried verbatim, from the lib, not retyped.
  assert.match(wall, /TWO_SLOPES_NOTE/);
  assert.match(TWO_SLOPES_NOTE, /each is entered by its own run/);
  assert.equal(flatFieldShown(1), true);
  assert.equal(flatFieldShown(2), false, 'Flat must not be offered with two slopes on a wall');
  assert.equal(flatFromRun(900, 4000), 3100);
  assert.equal(runFromFlat(3100, 4000), 900);
});

// ─── 6 · ONE PLACE DECIDES A WALL'S HEIGHT, ONE EDITOR WRITES AN OPENING ──

test('F3 · exactly ONE place decides a wall\'s height at a point', () => {
  // CLAUDE.md's balance question, asked as an assertion rather than answered in
  // prose: *"How many places now decide a wall's height at a point? (Must be
  // one: `lib/slopeLine.js`.)"*
  //
  // `wallElements.wallHeightAt` is a one-line call into `slopeLine.ceilingAt`
  // (turn 46 took the second lerp out), and this proves it stayed one line.
  const elements = read('src/lib/wallElements.js');
  assert.match(elements, /return ceilingAt\(xMm, wallSlopes\(slopes\), \{ wallWidth, wallHeight \}\);/,
    'wallHeightAt grew a lerp of its own again — that is the two-chain disease');

  // And nothing in retail wrote a third.
  const retail = ['src/retail/design/room/WallElevationModal.jsx', 'src/retail/design/adapter.js',
    'src/retail/design/Options.jsx', 'src/retail/design/DesignRoom.jsx'];
  for (const rel of retail) {
    assert.doesNotMatch(uncomment(read(rel)), /function ceilingAt|function wallHeightAt/,
      `${rel} decides a wall's height itself`);
  }
});

test('F3 · exactly ONE editor writes room.openings', () => {
  // *"How many editors write `room.openings`? (Must be one.)"*
  //
  // T61 put ADD WINDOW / ADD DOOR and four fields per opening in the retail
  // COLUMN, while PRO edits the same records in the wall's elevation. Two doors
  // to one window. T62's licensed removal takes the column's away, so the
  // copied editor is the only SCREEN in retail that writes an opening.
  // Comments OUT first: the tombstone this turn left behind names the two
  // buttons it deleted, and a ban that could not tell a headstone from a body
  // would forbid saying what was removed.
  const column = uncomment(read('src/retail/design/Options.jsx'));
  for (const gone of ['ADD WINDOW', 'ADD DOOR', 'A.addOpening', 'A.setOpening', 'A.removeOpening']) {
    assert.ok(!column.includes(gone), `${gone} survived in the retail column — that is the second door`);
  }

  // The adapter still EXPORTS those writers and T61's tests still hold them to
  // `clampOpening`. That is a deliberate skip: deleting them is not licensed
  // this turn, and an export with no screen behind it is not an editor. What
  // matters is that no retail SCREEN calls one.
  const SCREENS = ['Options.jsx', 'DesignRoom.jsx', 'Detail.jsx', 'Categories.jsx', 'Stage.jsx'];
  for (const f of SCREENS) {
    const text = uncomment(read(`src/retail/design/${f}`));
    for (const writer of ['addOpening', 'setOpening', 'removeOpening']) {
      assert.ok(!text.includes(`A.${writer}`), `${f} still writes room.openings`);
    }
  }

  // …and the one that does is the copy, through the engine's own clamp.
  const wall = read('src/retail/design/room/WallElevationModal.jsx');
  assert.match(wall, /clampOpening/, 'the elevation editor writes an opening without the clamp');
  assert.match(wall, /OPENING_DEFAULTS/);
});

// ─── 7 · THE BOUNDARY MOVED, AND ONLY THE HALF IT WAS MEANT TO ───────────

test('F1 · src/lib is core; src/components is not, and retail imports none', () => {
  const boundary = read('test/turn59-f1-the-switch.test.js');
  assert.match(boundary, /const CORE_DIRS = \['engine\/', '3d\/', 'stores\/', 'lib\/'\];/,
    'src/lib is not in the core zone — the slope is out of reach again');
  // The owner's words are IN the test file, so the next turn cannot undo this
  // by accident. CLAUDE.md F1: *"Write the reason into the test file in the
  // owner's own words."*
  assert.match(boundary, /jak piszę 1 do 1 to KOPIUJ/);

  // The COMPONENT half did not move, and this is the assertion that says so
  // from outside that file.
  const retailFiles = [
    'src/retail/design/room/RoomModal.jsx', 'src/retail/design/room/WallElevationModal.jsx',
    'src/retail/design/room/Modal.jsx', 'src/retail/design/room/NumberField.jsx',
    'src/retail/design/room/RoomEditor.jsx', 'src/retail/design/Options.jsx',
    'src/retail/design/DesignRoom.jsx',
  ];
  for (const rel of retailFiles) {
    assert.doesNotMatch(uncomment(read(rel)), /from '[^']*\/components\//,
      `${rel} IMPORTS a PRO component — the law is COPY, not import`);
  }
});
