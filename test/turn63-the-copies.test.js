// ─── TURN 63 · THE COPY IS A COPY — TWENTY-ONE TIMES OVER ──────────────────
//
// The owner, 01.09.2026, verbatim — the law of this turn:
//
//   *"miało być identycznie jak w PRO, tylko inna kolorystyka i trochę mniej,
//   a pozmieniałeś sporo. Sprawdź jakie jeszcze funkcje pominąłeś i je dodaj."*
//
//   *"jak piszę 1 do 1 to KOPIUJ. ale kopiuj — nie kasuj, nie zmieniaj PRO,
//   tylko zrób identycznie w retail."*
//
// T62 copied two screens and wrote `turn62-f2-f3-the-copy.test.js` to prove
// it. CLAUDE.md asks for that PATTERN, extended: *"for every file copied
// tonight, read the PRO source and the retail copy off disk and assert the
// copy carries every control label, every hook and every gesture the original
// has. A label the original has and the copy does not is a FAILING test that
// names the label."*
//
// So this file is T62's four assertions run over `scripts/t63-copies.mjs` —
// ONE manifest, read by the script that makes the copies, by this test, by
// the ledger and by the classifier — and then the four things that make a
// copy USABLE rather than merely present: every window has an entry, the
// sketches it replaces are gone, retail holds ONE law for what may be added
// where, and ONE surface writes a unit's finish.
//
// ─── THE THREE THINGS A COPY MAY DIFFER BY ─────────────────────────────────
//
//   a. IMPORTS REPOINTED — three directories deeper; `./Modal.jsx` and
//      `./NumberField.jsx` resolve to T62's copies; a PRO sibling resolves to
//      its own copy. Same modules, same names.
//   b. CLASS NAMES RESKINNED — every token in a `className=` became a
//      `pbi-re-*` name; `scripts/t63-copy.mjs` holds the map and GENERATES
//      `styles/copies.css` from it, one token in, one token out.
//   c. COLOURS SWAPPED — four hexes PRO's dark shell draws with became four of
//      the twelve tokens.
//
// …and NOTHING ELSE. Not one addition: the T62 room copy needed a hook; these
// twenty-one needed none, and the element-count assertion at the end holds
// every one of them to exactly PRO's JSX element count.

import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { T63_COPIES, isCopy } from '../scripts/t63-copies.mjs';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

/** Comments out. A label quoted in a comment is prose, not a control. */
const uncomment = (text) => text
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^[ \t]*\/\/.*$/gm, ' ');

/** Every LABEL a file shows a person — T62's extractor, verbatim. */
function labelsOf(source) {
  const code = uncomment(source);
  const found = new Set();
  for (const m of code.matchAll(/>([^<>{}]+)</g)) {
    const text = m[1].replace(/\s+/g, ' ').trim();
    if (/[;=()[\]|&`]|=>/.test(text)) continue;
    if (text.length >= 2 && /[A-Za-z]/.test(text)) found.add(text);
  }
  for (const m of code.matchAll(/\b(?:title|label|aria-label|placeholder)=(?:"([^"]*)"|'([^']*)')/g)) {
    const text = (m[1] ?? m[2]).replace(/\s+/g, ' ').trim();
    if (text.length >= 2 && /[A-Za-z]/.test(text)) found.add(text);
  }
  return [...found].sort();
}

const hooksOf = (source) => [...new Set(
  [...uncomment(source).matchAll(/\bdata-([a-z0-9-]+)=/g)].map((m) => m[1]),
)].sort();

const handlersOf = (source) => [...new Set(
  [...uncomment(source).matchAll(/\b(on[A-Z][A-Za-z]+)=/g)].map((m) => m[1]),
)].sort();

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

/**
 * THE FLOOR — how many labels each PRO file actually shows, counted once and
 * written down, so a blind extractor cannot pass vacuously. Two files show
 * none (`UnitWarnings` renders the engine's own sentences; `FrontGapWarnings`
 * renders the rulebook's) and are proved by their hooks and imports instead.
 */
const FLOOR = {
  'LightingPanel.jsx': 24, 'DoorModal.jsx': 31, 'ElementProperties.jsx': 51, 'UnitWarnings.jsx': 0,
  'WatchLayoutModal.jsx': 5, 'RailModal.jsx': 6, 'UnitSizeModal.jsx': 3, 'AddItemsModal.jsx': 4,
  'AddItems.jsx': 26, 'FrontGapModal.jsx': 5, 'FrontGapWarnings.jsx': 0, 'JpullRunModal.jsx': 2,
  'DecorPickerModal.jsx': 5, 'DecorPicker.jsx': 6, 'ColourPicker.jsx': 3, 'VeneerPicker.jsx': 6,
  'MaterialChoicePanel.jsx': 3, 'ChosenDecorTile.jsx': 2, 'FrontStyleGallery.jsx': 2,
  'WizardHardware.jsx': 7, 'UnitFinishModal.jsx': 8,
};

test('T63 · the manifest names twenty-one copies, every one on disk, every original frozen', () => {
  assert.equal(T63_COPIES.length, 21, `${T63_COPIES.length} copies in the manifest`);
  for (const c of T63_COPIES) {
    assert.ok(existsSync(join(ROOT, c.pro)), `${c.pro} is not a PRO file`);
    assert.ok(existsSync(join(ROOT, c.retail)), `${c.retail} was not copied`);
    assert.equal(c.pro.split('/').pop(), c.retail.split('/').pop(), 'a copy under another name');
    assert.ok(c.why.length > 10, `${c.pro} has no reason`);
  }
  assert.ok(Object.keys(FLOOR).length === 21, 'the floor table drifted from the manifest');
});

// ─── 1 · THE OWNER'S OWN LIST — THE CONTROLS HE NAMED BY HAND ──────────────

test('F2 · the lighting copy carries what the retail sketch lost', () => {
  const panel = read('src/retail/design/lighting/LightingPanel.jsx');
  // *"nie ma suwaka do bright"* — the scene-light slider is PRO's brightness
  // control in this panel (`data-scene-light-slider`, the engine's own clamp);
  // and the rest CLAUDE.md names.
  assert.match(panel, /data-scene-light-slider="1"/, 'the lighting copy lost the brightness slider');
  assert.match(panel, /SCENE_LIGHT_MIN[\s\S]*SCENE_LIGHT_MAX/, 'the brightness slider lost its engine clamp');
  for (const label of ['Colour temperature', 'Depth', 'ON', 'OFF']) {
    assert.ok(panel.includes(label), `the lighting copy lost ${label}`);
  }
  // The five mounting kinds and the room rig, by PRO's own imports.
  for (const name of ['lightingSpec', 'stripsForUnit', 'switchChoicesFor', 'RIG_LAMPS', 'RIG_PRESETS', 'STRENGTH_STEP', 'sceneLightScale']) {
    assert.ok(panel.includes(name), `the lighting copy stopped reading ${name}`);
  }
  assert.match(panel, /type="range"/, 'the brightness slider is gone');
  assert.equal(panel.split('\n').length, read('src/components/LightingPanel.jsx').split('\n').length,
    'the copy is not PRO\'s length');
});

test('F3/F4 · the labels CLAUDE.md names are in the copies', () => {
  const all = T63_COPIES.map((c) => read(c.retail)).join('\n');
  for (const label of ['Add doors', 'What goes inside', 'This cabinet', 'Narrow the front', 'Insert an infill',
    'Glass over the drawer', 'Height above support', 'Remove the rail', 'Back to the standard run',
    'Reset to project', 'More colours…', 'Choose decor…', 'Change', 'Hinges (finish)', 'Internal metal',
    'Existing styles', 'Search by code or name', 'Type to filter']) {
    assert.ok(all.includes(label), `THE COPY DROPPED A CONTROL CLAUDE.md NAMED: ${label}`);
  }
});

// ─── 2 · THE WHOLE FILE — EVERY LABEL, HOOK, GESTURE AND IMPORTED NAME ────

for (const { pro: proPath, retail: retailPath } of T63_COPIES) {
  const name = proPath.split('/').pop();

  test(`T63 · ${name} — every label PRO shows, retail shows`, () => {
    const pro = read(proPath);
    // A paragraph PRO breaks over three lines is one label to the extractor
    // and one label in the copy; both sides are read with one space between
    // words, so a line break is not a dropped control.
    const copy = read(retailPath).replace(/\s+/g, ' ');
    // The one placeholder that IS a hex (`#1f3a5f`, the example in the typed
    // hex field) is a colour, and colours are the third thing a copy may
    // differ by — it became a token, as every hex did.
    const missing = labelsOf(pro).filter((label) => !/^#[0-9a-f]{3,8}$/i.test(label) && !copy.includes(label));
    assert.deepEqual(missing, [],
      `${retailPath} DROPPED ${missing.length} of PRO's labels:\n  ${missing.join('\n  ')}`);
    assert.ok(labelsOf(pro).length >= FLOOR[name],
      `only ${labelsOf(pro).length} labels found in ${proPath} — the extractor is blind`);
  });

  test(`T63 · ${name} — every hook, gesture and imported name survives`, () => {
    const pro = read(proPath);
    const copy = read(retailPath);
    const lostHooks = hooksOf(pro).filter((h) => !hooksOf(copy).includes(h));
    assert.deepEqual(lostHooks, [], `${retailPath} lost data-hooks: ${lostHooks.join(', ')}`);
    const lostGestures = handlersOf(pro).filter((h) => !handlersOf(copy).includes(h));
    assert.deepEqual(lostGestures, [], `${retailPath} lost gestures: ${lostGestures.join(', ')}`);
    const lostNames = importedNames(pro).filter((n) => !importedNames(copy).includes(n));
    assert.deepEqual(lostNames, [], `${retailPath} stopped importing: ${lostNames.join(', ')}`);
  });
}

// ─── 3 · AND THE COPY DIVERGES ONLY WHERE IT SAID IT WOULD ─────────────────

function collapseTokens(region) {
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

const normalise = (text) => collapseClasses(text)
  // (a) THE REPOINT — every import specifier reduced to the file it names.
  .replace(/from '(?:\.\.?\/)+(?:[^'/]+\/)*([^'/]+)'/g, "from '$1'")
  // (b) THE WIDTH PROP, and a class list kept in an object rather than on an
  //     element (`TONE` in FrontGapWarnings), collapsed the same way.
  .replace(/width\s*=\s*(?:"[^"]*"|'[^']*')/g, 'width=X')
  .replace(/^(\s+\w+:\s*')([^']+)(',?)$/gm, (_, o, t, c) => o + t.replace(/\S+/g, 'X') + c)
  // (c) THE COLOUR SWAP — every hex, either palette, becomes one mark.
  .replace(/#[0-9a-fA-F]{3,8}\b/g, '#C')
  .replace(/[ \t]+/g, ' ')
  .split('\n')
  .map((l) => l.trim())
  .filter(Boolean);

test('T63 · the copies differ by nothing but imports, class names and colour', () => {
  for (const { pro: proPath, retail: retailPath } of T63_COPIES) {
    const pro = normalise(read(proPath));
    const copy = new Set(normalise(read(retailPath)));
    const dropped = pro.filter((line) => !copy.has(line));
    assert.deepEqual(dropped, [],
      `${retailPath} is missing ${dropped.length} of PRO's own lines:\n  ${dropped.slice(0, 15).join('\n  ')}`);
    assert.ok(pro.length > 30, `only ${pro.length} lines compared for ${proPath}`);
  }
});

test('T63 · not one copy gained or lost a JSX element — no addition, no drop', () => {
  const count = (t) => (uncomment(t).match(/<[A-Za-z]/g) || []).length;
  for (const { pro: proPath, retail: retailPath } of T63_COPIES) {
    assert.equal(count(read(retailPath)), count(read(proPath)), `${retailPath} gained or lost an element`);
    assert.equal(read(retailPath).split('\n').length, read(proPath).split('\n').length,
      `${retailPath} is not PRO's length`);
  }
});

test('T63 · every class a copy wears is a class the generated sheet defines', () => {
  const sheet = `${read('src/retail/styles/copies.css')}\n${read('src/retail/styles/roomeditor.css')}`;
  const defined = new Set([...sheet.matchAll(/\.(pbi-re-[a-z0-9-]+)/g)].map((m) => m[1]));
  const worn = new Set();
  for (const { retail } of T63_COPIES) {
    for (const m of uncomment(read(retail)).matchAll(/\bpbi-re-[a-z0-9-]+/g)) worn.add(m[0]);
  }
  const bare = [...worn].filter((c) => !defined.has(c));
  assert.deepEqual(bare, [], `a copy wears a class no sheet defines: ${bare.join(', ')}`);
  // …and no PRO class survived the rename — a `cc-btn` in retail is unstyled.
  for (const { retail } of T63_COPIES) {
    const text = uncomment(read(retail));
    for (const m of text.matchAll(/className="([^"]*)"/g)) {
      assert.ok(!/\b(cc-|text-ink-|bg-shell-|border-shell-|text-gold\b|border-gold\b)/.test(m[1]),
        `${retail} still wears a PRO class: ${m[1]}`);
    }
  }
});

// ─── 4 · PRO IS FROZEN, AND THE ORIGINALS DID NOT MOVE ─────────────────────

// ─── AMENDED BY TURN 67 · F9 ──────────────────────────────────────────────
//
// Two of the twenty-one moved tonight, by name and for one reason. The owner,
// 11.09.2026: *"watches szuflad jest bez sensu … tam będzie watches, belts,
// ties, cufflinks, biżuteria"* — and, asked whether PRO may change to say so:
// *"zmień w PRO też tę nazwę."*  The edit is LABEL ONLY at each site
// (`turn59-f1-the-switch.test.js` holds both files to their new hashes and
// carries his sentence), and the copies above were re-made from the edited
// originals the SAME night, which is why every fidelity assertion in this file
// is still green — both sides match, and no map was widened to make them.
const T67_RENAMED = ['src/components/AddItems.jsx', 'src/components/WatchLayoutModal.jsx'];

test('T63, amended by T67 · not one byte of the other NINETEEN originals moved', () => {
  let base = null;
  for (const ref of ['origin/main', 'main']) {
    try {
      execFileSync('git', ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`], { cwd: ROOT });
      base = ref; break;
    } catch { /* next */ }
  }
  if (!base) return;
  const unmoved = T63_COPIES.map((c) => c.pro).filter((p) => !T67_RENAMED.includes(p));
  assert.equal(unmoved.length, 19, 'the T67 exemption grew beyond the two files it names');
  const diff = execFileSync('git', ['diff', '--stat', base, '--', ...unmoved],
    { cwd: ROOT, encoding: 'utf8' }).trim();
  assert.equal(diff, '', `a PRO original moved to make the copy work:\n${diff}`);
  // …and the two that DID move moved only where a person reads.
  const renamed = execFileSync('git', ['diff', '-U0', base, '--', ...T67_RENAMED],
    { cwd: ROOT, encoding: 'utf8' });
  const touched = renamed.split('\n').filter((l) => /^[+-][^+-]/.test(l));
  const NAME = /[Ww]atch drawer|[Aa]ccessories drawer|an accessories drawer|T67 F9|^[+-]\s*\/\//;
  const bad = touched.filter((l) => !NAME.test(l));
  assert.deepEqual(bad, [], `a line that is not the label moved:\n${bad.join('\n')}`);
});

// ─── 5 · EVERY COPY HAS AN ENTRY — A COPY NOBODY CAN OPEN IS NOT DONE ─────

test('T63 · every window answers the shared modal slot, from retail\'s own router', () => {
  const editors = uncomment(read('src/retail/design/Editors.jsx'));
  const WINDOWS = {
    element: 'DoorModal', rail: 'RailModal', 'add-items': 'AddItemsModal', 'unit-finish': 'UnitFinishModal',
    'front-gap': 'FrontGapModal', lighting: 'LightingPanel', 'unit-size': 'UnitSizeModal',
    'watch-layout': 'WatchLayoutModal', 'jpull-run': 'JpullRunModal', design: 'MaterialsModal',
  };
  // ─── AMENDED BY T66 F3 ────────────────────────────────────────────────
  // Every name still answers, and every name still answers from THIS router.
  // What changed is WHERE the router draws it: the three that edit a selected
  // element are DOCKED into the right-hand panel and the rest stay modals, so
  // the test that mattered — *"a copy nobody can open is not done"* — is asked
  // of `is('<name>')` rather than of the raw comparison it used to be.
  for (const [name, component] of Object.entries(WINDOWS)) {
    assert.match(editors, new RegExp(`is\\('${name}'\\) && <${component} />`), `${name} has no window`);
  }
  assert.match(editors, /const here = \(name\) => \(DOCK_MODALS\.includes\(name\) \? dock : !dock\)/,
    'a window could be drawn in both places, or in neither');
  const room = uncomment(read('src/retail/design/DesignRoom.jsx'));
  assert.match(room, /<Editors where="room" \/>/, 'the router is not mounted at the room\'s level');
  assert.match(uncomment(read('src/retail/design/Detail.jsx')), /<Editors where="dock" \/>/,
    'the docked half of the router is not mounted');
});

// ─── AMENDED BY T66 F3 ──────────────────────────────────────────────────────
//
// T63 opened each copy from a BUTTON in a thin Duty menu — *"a copied surface
// that opens from a plain button is a success tonight. Placement is the
// owner's to arrange later."* Tonight he arranged it: *"w zasadzie po prawej
// powinien być tylko menu edycji."* So the three element editors open from the
// CLICK on the element itself and dock; the rest still open from a button, and
// still beside it, per the house rule.
test('T63 · every copy is opened — the three by the dock, the rest beside their button', () => {
  const dock = uncomment(read('src/retail/design/detail/docked.jsx'));
  assert.match(dock, /\{ modal: 'element', args: \{ unitId, panelId: panel\.id \} \}/);
  assert.match(dock, /\{ modal: 'watch-layout', args: \{ unitId, itemId: item\.id \} \}/);
  assert.match(dock, /A\.railWindow\(unitId, item\.id\)/);
  // The dock passes NO anchor: rule 15 places a window beside its object, and
  // a docked panel is not placed at all.
  assert.doesNotMatch(dock, /anchor/, 'the dock still places a window it does not place');
  assert.match(uncomment(read('src/retail/design/Detail.jsx')), /ui\.openModal\(name, args\)/);

  // …and the ones that are genuinely modal keep their button and their anchor.
  const options = uncomment(read('src/retail/design/Options.jsx'));
  for (const name of ['unit-finish', 'design', 'lighting']) {
    assert.match(options, new RegExp(`openEditor\\('${name}'[^)]*anchor: A\\.anchorOf\\(e\\)`),
      `${name} lost its door, or opens away from the button that asked`);
  }
  // The hinges are still reachable — PRO's own section, inside the copy.
  assert.match(uncomment(read('src/retail/design/detail/DoorModal.jsx')), /section === 'hinges'/);

  // THE LIGHTS BUTTON OPENS THE PANEL AND DOES NOT TOGGLE THE LIGHT.
  const room = uncomment(read('src/retail/design/DesignRoom.jsx'));
  assert.match(room, /onLights=\{\(e\) => A\.openEditor\('lighting', \{ anchor: A\.anchorOf\(e\) \}\)\}/);
  assert.doesNotMatch(room, /onLights=\{\(\) => A\.setLighting/, 'LIGHTS still switches the light off');

  // The tiled EGGER modal is reachable from the FRONTS panel and the MATERIALS window.
  assert.match(uncomment(read('src/retail/design/Options.jsx')), /<MaterialSlot kind="front"/);
  assert.match(uncomment(read('src/retail/design/material/MaterialsModal.jsx')), /<MaterialSlot kind="carcass"/);
  assert.match(uncomment(read('src/retail/design/material/MaterialSlot.jsx')), /<MaterialChoicePanel/);
  assert.match(uncomment(read('src/retail/design/material/MaterialChoicePanel.jsx')), /<DecorPickerModal/);
  // …and the front-gap rows stand over the stage, PRO's only door to the repair.
  assert.match(uncomment(read('src/retail/design/Stage.jsx')), /<FrontGapWarnings \/>/);
});

test('T63 · the four sketches are gone, and no fifth stands beside a copy', () => {
  const files = readdirSync(join(ROOT, 'src/retail/design/detail'));
  for (const gone of ['DoorMenu.jsx', 'RailMenu.jsx', 'WatchMenu.jsx', 'LightingMenu.jsx']) {
    assert.ok(!files.includes(gone), `${gone} survives beside its copy — the second track`);
  }
  // ─── AMENDED BY T66 F3 ────────────────────────────────────────────────
  // A sketch is a retail file that re-writes a copied window's controls. T63
  // held the four ENTRIES to that; tonight there are no entries and no thin
  // menus at all, so the question is asked of the whole directory: every
  // remaining `.jsx` under `design/detail/` is either a COPY or the dock's own
  // table, and the table draws nothing.
  // ─── AMENDED BY T67 F7 ──────────────────────────────────────────────
  //
  // `ReHomed.jsx` holds controls and is NOT a sketch, and the difference is
  // the whole point of the rule rather than an exception to it. A SKETCH was a
  // thin retail-written menu standing BESIDE a copied editor and doing the
  // same job worse — the second track this test exists to forbid. `ReHomed` is
  // the opposite: it is the stack-wide controls that NO copied editor has,
  // moved here from `Options.jsx` on the owner's own order (*"te funkcje niech
  // przejdą na prawą stronę"*) and rendered ABOVE the copy, never beside it.
  //
  // So the rule is asked precisely: no file here may duplicate a COPY. The
  // controls `ReHomed` carries are named, and they are exactly the ones T66
  // rescued from the deleted menus — anything else appearing in this file
  // fails, which is the guard the blanket ban was standing in for.
  const REHOMED_CONTROLS = [
    'drawers-count', 'drawers-insert', 'drawers-glass', 'drawers-front-height',
    'overlay-count', 'overlay-front', 'overlay-remove', 'shelf-centre',
    'pulldown-drop', 'pulldown-remove', 'shoe-law', 'shoe-drawing', 'shoe-said', 'drawers-said',
    'drawers-fronts-fixed', 'dock-drawer-list',
  ];
  for (const f of files) {
    if (!/\.jsx$/.test(f)) continue;
    if (isCopy(`src/retail/design/detail/${f}`)) continue;
    const text = uncomment(read(`src/retail/design/detail/${f}`));
    if (f === 'ReHomed.jsx') {
      const hooks = [...text.matchAll(/data-testid=\{?[`"]([a-z][a-z0-9$-{}.]*)[`"]\}?/g)].map((m) => m[1]);
      const stray = hooks.filter((h) => !REHOMED_CONTROLS.includes(h) && !/^dock-drawer-/.test(h)
        && !/\$\{/.test(h));
      assert.deepEqual(stray, [], `ReHomed.jsx grew a control nobody re-homed: ${stray.join(', ')}`);
      continue;
    }
    assert.doesNotMatch(text, /<ChipRow|<NumberField/,
      `${f} grew controls beside a copy — that is a sketch`);
  }
  assert.deepEqual(files.filter((f) => /Menu\.jsx$/.test(f)), [],
    'a thin Duty menu is back beside the copies');
});

// ─── 6 · THE TWO BALANCE QUESTIONS, ASKED AS ASSERTIONS ────────────────────

test('T63 · exactly ONE law decides what may be added where — PRO\'s AddItems, copied', () => {
  // The INTERIOR panel renders the copy, and no retail screen renders a row
  // list of its own with an ADD on it.
  const options = uncomment(read('src/retail/design/Options.jsx'));
  assert.match(options, /<AddItems unit=\{unit\} \/>/, 'the INTERIOR panel does not render PRO\'s list');
  assert.doesNotMatch(options, /interior-add-/, 'retail still offers its own ADD rows');
  assert.doesNotMatch(options, /row\.add\(/, 'retail still runs its own add');
  const screens = readdirSync(join(ROOT, 'src/retail/design')).filter((f) => /\.jsx$/.test(f));
  for (const f of screens) {
    const text = uncomment(read(`src/retail/design/${f}`));
    assert.ok(!/INTERIOR_ROWS\.map\([^)]*=>[\s\S]{0,400}\.add\(/.test(text), `${f} adds through a second list`);
  }
  // The copy IS PRO's file (the fidelity tests above), and PRO's inner-plus
  // window renders the same component — one list, two doors, as in PRO.
  assert.match(uncomment(read('src/retail/design/detail/AddItemsModal.jsx')), /<AddItems unit=\{unit\} onZoneHover=\{setZoneHint\} \/>/);
  // The adapter's `INTERIOR_ROWS` stays exported for the tests that hold it
  // against PRO's file; it is data, not a screen, and nothing renders its ADD.
});

test('T63 · exactly ONE surface writes a unit\'s finish — UnitFinishModal, copied', () => {
  const writers = [];
  const walk = (dir) => {
    for (const e of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
      if (e.isDirectory()) walk(`${dir}/${e.name}`);
      else if (/\.(js|jsx)$/.test(e.name)) {
        const t = uncomment(read(`${dir}/${e.name}`));
        if (/setUnitFinish\(|resetUnitFinish\(|carcass_type_id:|front_type_id:/.test(t)) writers.push(`${dir}/${e.name}`);
      }
    }
  };
  walk('src/retail');
  assert.deepEqual(writers, ['src/retail/design/material/UnitFinishModal.jsx'],
    `a unit's finish is written from ${writers.length} places: ${writers.join(', ')}`);
  // …and the project palette is still written by the project surfaces only —
  // the copied slot, through the adapter's four setters.
  const adapter = uncomment(read('src/retail/design/adapter.js'));
  assert.match(adapter, /export function pickMaterialDecor/);
  assert.match(adapter, /export function pickMaterialColour/);
});
