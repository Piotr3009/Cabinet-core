// ─── F12: THE SWEEP (turn 31, CLAUDE.md F12) ────────────────────────────────
//
// "Delete `src/3d/JointLines.jsx` (dead since T13) and the 83 exports no code
// imports (list from the 14.08 audit — REGENERATE IT, DON'T TRUST IT: an export
// used only by tests stays if the test asserts behaviour, goes if it asserts
// the export's own existence)."
//
// "Regenerate it, don't trust it" turned out to be the whole instruction. The
// 14.08 list said 83; a list regenerated tonight said 68, because the codebase
// moved under it — and two rounds of regeneration found faults in the AUDIT
// rather than in the code:
//
//   • the SPREAD operator. `...tabPointsRight(w, …)` is a use, and a scanner
//     with a `(?<![.\w$])` lookbehind reads the spread's own dots as a property
//     access and calls the function dead. It is not: deleting it broke 40 tests
//     immediately, which is the only reason the fault was found at all.
//   • the DYNAMIC import. `const { RAL_GROUPS } = await import('…')` is how
//     test/design.test.js asserts that the colour lists really are the PSW
//     file. A scanner that only reads `import … from` calls both of them dead.
//
// So this file does not carry a LIST. It carries the AUDIT — regenerated on
// every run — because a list checked into a test is the 14.08 list all over
// again, wrong within a fortnight and trusted anyway.

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('../', import.meta.url).pathname;

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((e) => {
    const p = join(dir, e);
    return statSync(p).isDirectory() ? walk(p) : (/\.(js|jsx|mjs)$/.test(p) ? [p] : []);
  });
}

const SRC = walk(join(ROOT, 'src'));
const TESTS = walk(join(ROOT, 'test'));
const SCRIPTS = walk(join(ROOT, 'scripts'));
const read = (p) => readFileSync(p, 'utf8');

/** Every name any module under src/ exports, and where from. */
function exportsOfSrc() {
  const out = new Map();
  for (const file of SRC) {
    const t = read(file);
    for (const m of t.matchAll(/^export\s+(?:async\s+)?(?:function|const|let|var|class)\s+([A-Za-z_$][\w$]*)/gm)) {
      out.set(m[1], file);
    }
    for (const m of t.matchAll(/^export\s*\{([^}]*)\}/gm)) {
      for (const part of m[1].split(',')) {
        const n = part.trim().split(/\s+as\s+/).pop().trim();
        if (n) out.set(n, file);
      }
    }
  }
  return out;
}

/**
 * Every name a set of files brings IN — by all three routes.
 *
 * The third one is the lesson: a dynamic `await import()` destructure is a real
 * use, and a scanner blind to it condemns code that is exercised every run.
 */
function importedBy(files) {
  const names = new Set();
  for (const file of files) {
    const t = read(file);
    for (const m of t.matchAll(/import\s+([^'"]+?)\s+from\s*['"]/g)) {
      for (const part of m[1].replace(/[{}]/g, ',').split(',')) {
        const n = part.trim().split(/\s+as\s+/)[0].trim();
        if (/^[A-Za-z_$][\w$]*$/.test(n)) names.add(n);
      }
    }
    for (const m of t.matchAll(/(?:const|let|var)\s*\{([^}]*)\}\s*=\s*await\s+import\(/g)) {
      for (const part of m[1].split(',')) {
        const n = part.trim().split(':')[0].trim();
        if (/^[A-Za-z_$][\w$]*$/.test(n)) names.add(n);
      }
    }
  }
  return names;
}

/** Modules pulled in whole (`import * as x`) — every export of them is reached. */
function namespaceModules() {
  const mods = new Set();
  for (const file of [...SRC, ...TESTS, ...SCRIPTS]) {
    for (const m of read(file).matchAll(/import\s*\*\s*as\s+\w+\s+from\s*['"]([^'"]+)['"]/g)) {
      mods.add(m[1].split('/').pop().replace(/\.jsx?$/, ''));
    }
  }
  return mods;
}

test('JointLines.jsx is gone, and nothing reaches for it', () => {
  assert.ok(!existsSync(join(ROOT, 'src/3d/JointLines.jsx')), 'the file is still there');
  const SELF = join(ROOT, 'test/turn31-f12-sweep.test.js');
  for (const file of [...SRC, ...TESTS, ...SCRIPTS]) {
    if (file === SELF) continue;   // this file quotes the patterns it forbids
    const t = read(file);
    assert.ok(!/from '.*JointLines/.test(t), `${file.slice(ROOT.length)} still imports it`);
    assert.ok(!/<JointLines/.test(t), `${file.slice(ROOT.length)} still renders it`);
  }
  // Its ENGINE half stays: `unitJointLines` is turn 13's geometry, it is
  // tested for behaviour, and `3d/PartMachining.jsx` draws the same marks. What
  // died in turn 13 was the component, not the joinery.
  assert.ok(existsSync(join(ROOT, 'src/engine/joinery.js')));
  assert.match(read(join(ROOT, 'src/engine/joinery.js')), /export function unitJointLines/);
});

test('NOT ONE export in src/ is imported by nothing, anywhere', () => {
  const exported = exportsOfSrc();
  assert.ok(exported.size > 500, `the scan found only ${exported.size} exports — the test is broken, not the code`);

  const reached = new Set([
    ...importedBy(SRC), ...importedBy(TESTS), ...importedBy(SCRIPTS),
  ]);
  const whole = namespaceModules();

  const dead = [];
  for (const [name, file] of exported) {
    if (reached.has(name)) continue;
    // A module imported WHOLE (`import * as dxf`) is reached in every export it
    // has — `main.jsx` publishes six of them for the acceptance walk.
    if (whole.has(file.split('/').pop().replace(/\.jsx?$/, ''))) continue;
    dead.push(`${file.slice(ROOT.length)}  ${name}`);
  }
  assert.deepEqual(dead, [], `${dead.length} export(s) nothing imports:\n${dead.join('\n')}`);
});

test('…and the ones that were internal are still there, just not exported', () => {
  // 47 names were used INSIDE their own file and exported for nobody. The
  // export went; the code did not — deleting a function a module calls itself
  // would be a sweep that broke the app, and the difference between the two is
  // the entire care this feature took.
  for (const [file, name] of [
    ['src/engine/puzzle.js', 'tabPointsRight'],
    ['src/engine/runs.js', 'endPanelSpread'],
    ['src/engine/room.js', 'DEFAULT_ROOM_WIDTH'],
    ['src/engine/cabinet.js', 'buildCsvLines'],
    ['src/3d/Hardware.jsx', 'ShelfSupports'],
  ]) {
    const t = read(join(ROOT, file));
    assert.match(t, new RegExp(`(?:function|const) ${name}\\b`), `${name} was deleted, not un-exported`);
    assert.ok(!new RegExp(`^export (?:async )?(?:function|const) ${name}\\b`, 'm').test(t),
      `${name} is still exported`);
  }
});

test('…and the ones that were used by NOTHING are gone', () => {
  for (const [file, name] of [
    ['src/engine/profile.js', 'withProfile'],
    ['src/engine/render.js', 'renderResolutions'],
    ['src/lib/hardwareCatalogue.js', 'HARDWARE_FILES'],
    ['src/stores/projectStore.js', 'shelfDragBounds'],
    ['src/3d/hingeModels.js', 'memberBAngle'],
  ]) {
    assert.ok(!new RegExp(`\\b${name}\\b`).test(read(join(ROOT, file))), `${name} is still there`);
  }
});

test('THE SPREAD IS A USE — the fault that nearly cost the puzzle joint', () => {
  // `...tabPointsRight(w, centre, G, pz)` is a call. A scanner with a
  // `(?<![.\w$])` lookbehind reads the spread's own dots as a property access
  // and calls the function dead; deleting it broke 40 tests in one run.
  const puzzle = read(join(ROOT, 'src/engine/puzzle.js'));
  assert.match(puzzle, /\.\.\.tabPointsRight\(/);
  assert.match(puzzle, /function tabPointsRight\(/);
});

test('THE DYNAMIC IMPORT IS A USE — the fault that nearly cost the colours', () => {
  // `const { RAL_GROUPS, FB_GROUPS, … } = await import('…pswColors.js')` is how
  // test/design.test.js asserts the lists really are the PSW file. That is a
  // test asserting BEHAVIOUR, so by CLAUDE.md's own rule the exports STAY.
  const colours = read(join(ROOT, 'src/lib/pswColors.js'));
  assert.match(colours, /^export const RAL_GROUPS/m);
  assert.match(colours, /^export const FB_GROUPS/m);
  assert.match(read(join(ROOT, 'test/design.test.js')), /await import\('\.\.\/src\/lib\/pswColors\.js'\)/);
});
