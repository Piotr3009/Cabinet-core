// ─── TURN 59 · F1 — THE SWITCH: TWO DOORS, ONE HOUSE ───────────────────────
//
// CLAUDE.md, F1.4, verbatim:
//
//   *"Tests (`test/turn59-f1-the-switch.test.js`): the three entries build;
//   the PRO frozen-files assertion; the import-boundary walker (parse every
//   `import` / `export … from` under `src/`, resolve, assert the rule); the
//   PRO module graph (static walk from `src/main.jsx`, or Vite's manifest)
//   contains no `src/retail/` file. **This test lands BEFORE any retail file
//   is written.**"*
//
// And it did. The frozen-files assertion, the boundary walker and the module
// graph were committed with an EMPTY `src/retail/` — the walker green over
// zero retail files, the manifest green over the 66 files of PRO. Only then
// was the first retail byte written. A guard installed after the thing it
// guards is not a guard; it is a description.
//
// ─── WHY A HASH MANIFEST AND NOT ONLY A GIT DIFF ───────────────────────────
//
// `git diff origin/main -- <the frozen paths>` is the assertion the owner
// asked for and it is here, second. It is not here FIRST, because it answers
// only where a git checkout with that ref exists — a shallow CI clone, a
// tarball, a vendored copy all make it silently vacuous, and a vacuous freeze
// test is worse than none. The 66 sha256 sums below need nothing but the
// files themselves. The two together say the same thing twice, in two
// languages, and neither can be true by accident.
//
// If a line of PRO ever legitimately changes, this manifest is the place the
// change is ARGUED — one commit that moves a hash and says why.

import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const ROOT = new URL('../', import.meta.url).pathname;
const SRC = join(ROOT, 'src');

/**
 * THE FROZEN SURFACE — CLAUDE.md, STANDING LAW:
 *
 *   *"`git diff origin/main..HEAD --stat` on `index.html`, `src/App.jsx`,
 *   `src/main.jsx`, `src/components/**`, `src/pages/**` must be EMPTY."*
 *
 * Sixty-six files, hashed at the base of turn 59 (origin/main @ c4321f7,
 * t58b merged). Not one of them is touched by this turn.
 */
const FROZEN = {
  'index.html': '9474860393b6e8dd6070d8178b35fbd2fbd309b26cb07b0e6140dcbf914e4912',
  'src/App.jsx': 'f6c33592a05affc52d8167cd776f5164ee2aeaccfea1dfce5dc3756e93f9b968',
  'src/components/AddItems.jsx': '6d0be57abb2b51a5789cbfee88ea87d2fc82e895a17099e00d8cadcd0c71c729',
  'src/components/AddItemsModal.jsx': '952b9e52104d92a148ba00da6ba42166e44824e76aeda7ba0553b22f2633105e',
  'src/components/AssignMaterialsModal.jsx': '32d48ece258aa562d6614606a65fd8df5a15adb3717d40f5736df8db45fac550',
  'src/components/AuthModal.jsx': 'b51d7a14910e89553528fe2e36f787502e4b4a77b6c408ebb24323510c164ddc',
  'src/components/BomPanel.jsx': '54109296695b50f20d8d7eaf1696b6d62d9969110c59623feb0f8fe0d75a2cd4',
  'src/components/CabinetEditorModal.jsx': '3d21bba5af9dc42fecbb620b6594b5a4be79be2e9ce5446cf4b53dc4b09b3ca4',
  'src/components/CanvasToolbar.jsx': 'ee85f7f7d4b3a64021f56cbea5fe36ff504136ace340216fdef71fcb316e2bd9',
  'src/components/CheckPanel.jsx': '65a991cbc4aed29b3c9a49ed613e715dd3d033106f8e5e9ded45e8125a8dc014',
  'src/components/ChosenDecorTile.jsx': '38d960b752ed6d5e99519573a3c6b9d31d687820f38b4e39ee11b971b2c3b683',
  'src/components/CncTree.jsx': 'f8a478a57677e257d4bafdc379bc4e224b7bd397a29bfaa28f923569463712f5',
  'src/components/CncView.jsx': 'bbfa3f571120d6bb089f2a885bc48f1f12e1c0431ebb57fb997b9f31ea8a540d',
  'src/components/ColourPicker.jsx': '03775b851d5fef7d0803765f6f721d807b5b21bedfd8f0c49386db7047d8c33e',
  'src/components/CompanyDefaultsModal.jsx': '90365da4e2e0bc285c652ec252c62a11da199853fdd9e31a899cb74464e2a896',
  'src/components/ContextMenu.jsx': '8c3adb3f6452fece13b76fe1a7db85679f35d73dd6c644cd280032a81d1e2d1b',
  'src/components/DecorPicker.jsx': '3ed5d2c75e1c7eb48b364f3b86cf9ec30fdad43acae9f1b30879f65f14e82e6a',
  'src/components/DecorPickerModal.jsx': 'eff9e583740f2381cfa8e796339f5b664f88ddf010e427a61cd450ed2ad44411',
  'src/components/DesignSettingsModal.jsx': '370f34cccd0b9907215eead9d27884ae14e6806ca192361bece6ef049116cf56',
  'src/components/DoorModal.jsx': '4e5e539c734fe6ccf32f030f5c90e3678196828aad35be244248c0992e16efe7',
  'src/components/DrawRoomModal.jsx': 'bbf2021f049146f6af31f1094b61a284a8d351a36361c3d549fbb0cb1372366b',
  'src/components/DrawingModal.jsx': 'd10d1f38b920d5782f760be94c3efbf0946074a6717e77c4e813985eec9b48b8',
  'src/components/ElementProperties.jsx': '3c223158225645e691c6a840be20fe7ce2fa3114eef21602a3d1c7ac48a0f140',
  'src/components/FrontGapModal.jsx': '9c2218d7f62684c2efe283df871af6a41df89152c674e093f3f721659524d4d5',
  'src/components/FrontGapWarnings.jsx': '84051f4e5178faf481c8c9f8a699576435a86e6f7138f94831748cac42f2433a',
  'src/components/FrontStyleGallery.jsx': '96ac40d58f9a1016d23256bcd95f6d1e037bfde609d4e17a9bf9f93c6127ed5e',
  'src/components/HandEditsModal.jsx': '8b2f61eead0bcc9f47aab78cadb7a6627a73885fd8e1b2e7ac8ac6ebf30025b0',
  'src/components/JoineryPreview.jsx': '4313bbe216ce87f80ab6ee1b4d1e8e288465e5b2ef2bedbba1167346508add0a',
  'src/components/JpullRunModal.jsx': 'ba78041e79962423326e060630dee5b81c26e34eb2a877795f6c8872cf4622fb',
  'src/components/LibraryPanel.jsx': 'c0f86722ab66d0a00b28994639f257f7ebe596140f265331a556ba615f4226ef',
  'src/components/LightingPanel.jsx': '65bf9cbc3cf6fe4b687def6f2d9538d4b363690c3c5d5ad2fddb0f7a77e48d2d',
  'src/components/MaterialChoicePanel.jsx': '16d2ed3171b4756141f21f693123c46bd6b33f772cad58013b2a45ec9a8fcb71',
  'src/components/MaterialPicker.jsx': 'd2b1d49bb1ef08d55652437986d4d40a2cac7c1683b42d16b0523b0e08fca5b7',
  'src/components/MenuBar.jsx': '8259c2d7b81f5f176c8c20d6faf98d6c2943667e2dd6354154a85748da1c4581',
  'src/components/Messages.jsx': 'fda203e902e53f4bd5ec26d27cd92229cb2967205239973b02616656e67cf55e',
  'src/components/MockModeBadge.jsx': '081294a78610a7fd3baef730ca7a318d8d193e40ef66c5d278e45f9672c82826',
  'src/components/Modal.jsx': '4bee3abfa7d391916931428869da887ea6e56c002ee1980b596413de5fc7ddbe',
  'src/components/MultiUnitPanel.jsx': 'ad7d770b51042f0c2e8d9633df4067c5a7d8d4af6e358fad2e90cf62e631531c',
  'src/components/NewProjectFlow.jsx': '504081eb2764b691da4209f87ac3d59dcc8643b7828ef26ba03aa870543d8966',
  'src/components/NumberField.jsx': 'ae2f9b89ea20a8da26fdf77db1cdb00cb487a2e5110128263f4c33f32eb5c176',
  'src/components/PartDetailModal.jsx': '3e97f121e6932a9859d4a88616651c0ec08a7f871ca72192eb339521597afc83',
  'src/components/RailModal.jsx': '4981e3843fe4b6249db4d2a9c5fe96d428d2b4bbe4605e41db3834c5d5d6bccf',
  'src/components/RenderModal.jsx': '263c9fca6fdc1e0cfd27c2b185934e4232b9b3fb57d18bd57ee830cc533df2a0',
  'src/components/RightPanel.jsx': 'ad0777675b240f39d649f9bf1dd79215161d79e3cca9c80ed5ffc9a21d68c788',
  'src/components/RoomModal.jsx': 'a96643d775c200276c159169007292d1f395534f6bcf07e27859b636343244bb',
  'src/components/SaveAsModal.jsx': '17bc0789ca392eda476dd34afa63a0c961da04b3dac4f32c8bab0bcb95dc6ad5',
  'src/components/SaveSettingsSetModal.jsx': 'e89dc83a41dbadbf472496c5674216171221f7bda5fa240c61dbaab09dd86951',
  'src/components/SaveTemplateModal.jsx': '83a756327cd24f0a13f1c28e618a692b1b88b00df6c2735416d5711422cbc4c1',
  'src/components/Section.jsx': 'f3f64ad9f4d024d31a508f469a1f816c2bf1c0ffcf7d9221e95e2ee42d2a1a56',
  'src/components/SettingsPanel.jsx': '13f1ce656e27a273545d055d59ad453685f456dd031bfbd61e9c9525c8738537',
  'src/components/SheenSlider.jsx': 'ec09e0dd7ad835672e4c024dee3013e649dcfa8ad64a2da5c120ed78d5c94bfb',
  'src/components/ShelfHingeClash.jsx': 'd205a25f3f86278aef44b7b91bb1d19958cef84aadc333ec550cd47327fc9619',
  'src/components/StartScreen.jsx': '6a6de6d1667872a45d18bb5b8e9e42d3d4522ac99f8ef2d1e9a32ce54ab363aa',
  'src/components/TopBar.jsx': '68fe1ff109ad1198a365ceae380fdead183ccfefb6eb579f98496a7308e1b681',
  'src/components/UnitFinishModal.jsx': '64ef4ad294dea3ac69cea7a2b6a200f55d335b75e8ebce69fafe37a33eb2a819',
  'src/components/UnitSizeModal.jsx': '558973450f57e2f9b70324c41d9a8cea710a2668425b5b3dad56f39c8d09b55d',
  'src/components/UnitWarnings.jsx': 'f654c6abd287439ddd932fb8a4011784db34105312ce17bdc6416e701b5b74f8',
  'src/components/VeneerPicker.jsx': '05bbf6f2a8c54f546c3c7f19608c0193dc356323ff1a5a7e543ae57e039e9e7d',
  'src/components/WallElevationModal.jsx': '49d61b8d3530b1a3f1a92faf2b0e25773255a3e4dbb5053f235b2878a6cae168',
  'src/components/WarehouseModal.jsx': '891e9065b7a6ae95612b4de88dc9cdd3d015a99c709c3ce47cdf458b1bf9da62',
  'src/components/WatchLayoutModal.jsx': '64a7d2a10be84eef92ceba2dc3541c4820a04b3d6549213968893b78b067f01d',
  'src/components/WizardHardware.jsx': 'd0de5ca0c32de92feffef65a1a091cc2d45eaeb02a446a73c5389c2d03c377a8',
  'src/components/WizardSettings.jsx': 'e78f35fff5107b21a5a775629ab899d2474d883df03b5873ad538bcfbd68fc74',
  'src/components/WizardSummary.jsx': '949a0930f7179cc25aa0b3eb5ff85f92845dd70b51390df188c445f7beb8a506',
  'src/main.jsx': '843c4aefa30516162f32ebdede296fdc091288019da4bbab851f01765b786dbb',
  'src/pages/ConfiguratorPage.jsx': 'a232a7cf5c61898b16c2a6f61be6ec4bbe4fda3873a2a4f478e8b99b2f3bab98',
};

// ─── THE WALKER ────────────────────────────────────────────────────────────
//
// Zero dependencies (CLAUDE.md), so the import graph is read the way
// test/imports.test.js reads it: with a regex over source text that has had
// its comments taken out first. A comment that says `import Foo from
// '../components/Foo'` is prose, not an edge, and a boundary test that
// believed prose would fail on this very file's header.

const CODE_FILE = /\.(js|jsx|mjs)$/;

function filesUnder(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir).sort()) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out.push(...filesUnder(path));
    else if (CODE_FILE.test(path)) out.push(path);
  }
  return out;
}

/** Comments out; string literals stay, because the specifier IS a string. */
const uncomment = (text) => text
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^[ \t]*\/\/.*$/gm, ' ');

/**
 * Every specifier this file names: `import … from 'x'`, a bare `import 'x'`,
 * `export … from 'x'`, `export * from 'x'`, and `import('x')`. The negated
 * class in the first pattern spans newlines on purpose — a brace list broken
 * over eight lines is one import, and half the app writes them that way.
 */
function specifiersOf(text) {
  const code = uncomment(text);
  const found = [];
  const patterns = [
    /(?:^|[\s;}])import\s+(?:[^'"();]*?\s+from\s*)?['"]([^'"]+)['"]/g,
    /(?:^|[\s;}])export\s+(?:\*|\{[^}]*\})\s*(?:as\s+[A-Za-z_$][\w$]*\s*)?from\s*['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];
  for (const re of patterns) {
    for (const m of code.matchAll(re)) found.push(m[1]);
  }
  return found;
}

/**
 * A specifier that starts with `.` or `/` is OURS and must land on a file; a
 * bare one is an npm package and none of this test's business. `?url` and
 * `?raw` are Vite's, and the file is what is on the left of the question mark.
 */
function resolveSpec(fromFile, spec) {
  const clean = spec.split('?')[0].split('#')[0];
  if (!clean.startsWith('.') && !clean.startsWith('/')) return { external: true };
  const base = clean.startsWith('/')
    ? join(ROOT, clean.replace(/^\/+/, ''))
    : resolve(dirname(fromFile), clean);
  const tries = [
    base, `${base}.js`, `${base}.jsx`, `${base}.mjs`,
    join(base, 'index.js'), join(base, 'index.jsx'),
  ];
  for (const candidate of tries) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return { path: candidate };
  }
  return { unresolved: spec };
}

/**
 * THE THREE ZONES, AND NOTHING ELSE.
 *
 * CLAUDE.md, THE IRON BOUNDARY (Petros, 30.08): *"The SHARED CORE both apps
 * may import is exactly: `src/engine/**`, `src/3d/**`, `src/stores/**`."*
 *
 * EXACTLY. So `src/lib` and `src/index.css` are not core — they are PRO's,
 * and a retail file reaching for either is the same violation as reaching for
 * a component. The zone is decided by the path and by nothing else.
 */
const CORE_DIRS = ['engine/', '3d/', 'stores/'];

function zoneOf(absPath) {
  const rel = relative(SRC, absPath);
  if (rel.startsWith('..')) return 'outside-src';
  if (rel === 'retail' || rel.startsWith('retail/')) return 'retail';
  if (CORE_DIRS.some((d) => rel.startsWith(d))) return 'core';
  return 'pro';
}

const show = (abs) => relative(ROOT, abs);

// ─── 1. THE PRO FROZEN-FILES ASSERTION ─────────────────────────────────────

test('F1 · the frozen surface — 66 files of PRO, byte for byte', () => {
  const moved = [];
  for (const [rel, want] of Object.entries(FROZEN)) {
    const path = join(ROOT, rel);
    if (!existsSync(path)) { moved.push(`${rel} — GONE (no deletions this turn)`); continue; }
    const got = createHash('sha256').update(readFileSync(path)).digest('hex');
    if (got !== want) moved.push(`${rel}\n    want ${want}\n    got  ${got}`);
  }
  assert.deepEqual(moved, [], `PRO IS FROZEN. These files moved:\n  ${moved.join('\n  ')}`);
});

test('F1 · the frozen surface — nothing was ADDED to it either', () => {
  const onDisk = [
    'index.html', 'src/App.jsx', 'src/main.jsx',
    ...filesUnder(join(SRC, 'components')).map(show),
    ...filesUnder(join(SRC, 'pages')).map(show),
  ].filter((p) => existsSync(join(ROOT, p))).sort();
  // A new component is not a byte moved, but it is PRO changing, and the
  // manifest alone would never see it.
  assert.deepEqual(onDisk, Object.keys(FROZEN).sort(),
    'the PRO surface gained or lost a file — PRO IS FROZEN');
});

test('F1 · the frozen surface — and git agrees, where git can answer', () => {
  const git = (args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' });
  let base = null;
  for (const ref of ['origin/main', 'main']) {
    try { git(['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]); base = ref; break; } catch { /* next */ }
  }
  if (!base) {
    // A tarball or a clone with no such ref. The manifest above already
    // answered; this assertion has nothing to add and says so out loud
    // rather than passing in silence.
    assert.ok(Object.keys(FROZEN).length === 66, 'no base ref — the manifest is the whole proof here');
    return;
  }
  const diff = git([
    'diff', '--stat', base, '--',
    'index.html', 'src/App.jsx', 'src/main.jsx', 'src/components', 'src/pages',
  ]).trim();
  assert.equal(diff, '', `git diff ${base} -- <the frozen paths> must be EMPTY:\n${diff}`);
});

// ─── 2. THE IMPORT-BOUNDARY WALKER ─────────────────────────────────────────

test('F1 · the walker can see — a self-test before it is trusted', () => {
  // A boundary test that parses nothing passes everything. Before it is
  // allowed to say "no violations", it proves on known ground that it finds
  // edges at all. The ground is counted, not guessed: App.jsx names fifteen
  // specifiers and ConfiguratorPage.jsx is the file that actually holds PRO's
  // component imports — thirty-four of them.
  const app = specifiersOf(readFileSync(join(SRC, 'App.jsx'), 'utf8'));
  assert.ok(app.length >= 15, `the walker found only ${app.length} specifiers in App.jsx — it is blind`);

  const page = specifiersOf(readFileSync(join(SRC, 'pages/ConfiguratorPage.jsx'), 'utf8'));
  const intoComponents = page.filter((s) => s.includes('components/'));
  assert.ok(intoComponents.length > 20,
    `the walker found only ${intoComponents.length} component imports in ConfiguratorPage.jsx`);

  const main = specifiersOf(readFileSync(join(SRC, 'main.jsx'), 'utf8'));
  assert.ok(main.some((s) => /\.\/App(\.jsx)?$/.test(s)), 'the walker cannot see main.jsx → App');

  const resolved = resolveSpec(join(SRC, 'main.jsx'), './App.jsx');
  assert.equal(zoneOf(resolved.path), 'pro', 'the walker cannot tell PRO from anything else');
  assert.equal(zoneOf(join(SRC, 'retail/x.js')), 'retail');
  assert.equal(zoneOf(join(SRC, '3d/Scene.jsx')), 'core');
  assert.equal(zoneOf(join(SRC, 'engine/doors.js')), 'core');
  assert.equal(zoneOf(join(SRC, 'stores/uiStore.js')), 'core');
  assert.equal(zoneOf(join(SRC, 'lib/anything.js')), 'pro', 'src/lib is NOT the shared core');
});

test('F1 · the iron boundary — src/retail imports ONLY retail and the shared core', () => {
  const violations = [];
  for (const file of filesUnder(join(SRC, 'retail'))) {
    for (const spec of specifiersOf(readFileSync(file, 'utf8'))) {
      const hit = resolveSpec(file, spec);
      if (hit.external) continue;
      if (hit.unresolved) {
        violations.push(`${show(file)} imports '${spec}' — which resolves to nothing`);
        continue;
      }
      const zone = zoneOf(hit.path);
      if (zone !== 'retail' && zone !== 'core') {
        violations.push(`${show(file)} imports ${show(hit.path)} (${zone}) — the boundary allows only `
          + 'src/retail, src/engine, src/3d, src/stores');
      }
    }
  }
  assert.deepEqual(violations, [], `THE IRON BOUNDARY:\n  ${violations.join('\n  ')}`);
});

test('F1 · the iron boundary — nothing outside src/retail imports from it', () => {
  const violations = [];
  for (const file of filesUnder(SRC)) {
    if (zoneOf(file) === 'retail') continue;
    for (const spec of specifiersOf(readFileSync(file, 'utf8'))) {
      const hit = resolveSpec(file, spec);
      if (hit.external || hit.unresolved) continue;
      if (zoneOf(hit.path) === 'retail') {
        violations.push(`${show(file)} imports ${show(hit.path)} — the shared core and PRO know `
          + 'nothing of retail');
      }
    }
  }
  assert.deepEqual(violations, [], `THE IRON BOUNDARY:\n  ${violations.join('\n  ')}`);
});

// ─── 3. THE PRO MODULE GRAPH ───────────────────────────────────────────────

/** Every file reachable from an entry by a static or dynamic relative import. */
function moduleGraph(entry) {
  const seen = new Set();
  const queue = [entry];
  while (queue.length) {
    const file = queue.pop();
    if (seen.has(file) || !CODE_FILE.test(file)) continue;
    seen.add(file);
    for (const spec of specifiersOf(readFileSync(file, 'utf8'))) {
      const hit = resolveSpec(file, spec);
      if (hit.path && !seen.has(hit.path)) queue.push(hit.path);
    }
  }
  return seen;
}

test('F1 · the PRO bundle contains not one file from src/retail', () => {
  const graph = moduleGraph(join(SRC, 'main.jsx'));
  // Vacuously green is the failure mode of every graph test ever written.
  assert.ok(graph.size > 100, `the PRO graph walked only ${graph.size} files — the walk is broken`);
  const retail = [...graph].filter((f) => zoneOf(f) === 'retail').map(show);
  assert.deepEqual(retail, [], `PRO's module graph reached retail:\n  ${retail.join('\n  ')}`);
});
