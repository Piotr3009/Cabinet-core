// ─── TURN 67 · F3 – F10 — THE CLIENT'S SIDE OF THE NIGHT ──────────────────
//
// Eight features, all of them the owner's own sentences about screens he has
// just used. Each test quotes the sentence it answers, because a test that
// cannot say what it is for is a test a later turn deletes.
//
//   F3  *"te napisy pod przyciskami daj jedne pod spodem, chcę mieć ładną
//       czystą listę … reszta nieczynna: przycisk, jak najedziesz, napis
//       coming soon i send email to make order, email do skopiowania."*
//   F4  *"nie wpisuj Egger w przycisku głównego menu … nie laminat, bo będzie
//       że cheap."*
//   F5  *"default Egger to H3325 Gladstone Oak."*
//   F6  *"to już niepotrzebne … to jest zdublowanie funkcji."*
//   F7  *"jak dodajesz szuflady, to się nie powinny pokazywać pod spodem, tu
//       menu po lewej ma być puste … te funkcje niech przejdą na prawą stronę."*
//   F8  *"po prawej się pokazuje każda szuflada jako fitted — nie powinna,
//       tylko nazwa."*
//   F9  *"watches szuflad jest bez sensu … zmień w PRO też tę nazwę."*
//   F10 *"kolor podświetlenia szuflady accessories: zmniejsz jasność do 25
//       procent … nie więcej niż 25 procent od teraz."*

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { getCabinetProfile } from '../src/engine/profile.js';
import { ORDER_EMAIL } from '../src/retail/config.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const uncomment = (t) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const code = (rel) => uncomment(read(rel));

function filesUnder(dir, out = []) {
  for (const entry of readdirSync(join(ROOT, dir)).sort()) {
    const rel = `${dir}/${entry}`;
    if (statSync(join(ROOT, rel)).isDirectory()) filesUnder(rel, out);
    else if (/\.(js|jsx)$/.test(entry)) out.push(rel);
  }
  return out;
}

// ═══ F3 · A CLEAN LIST, AND ONE QUIET NOTE ══════════════════════════════════

test('F3 · not one tile carries a line of its own — the note is under the list, once', () => {
  const options = read('src/retail/design/Options.jsx');
  const what = options.slice(options.indexOf('function WhatPanel'), options.indexOf('/* ─── 2 · WHERE'));
  // The per-tile refusal line is GONE: no `reason` reaches a tile, so `Chip`
  // draws no `.pbi-chip-reason` under any of them.
  assert.doesNotMatch(uncomment(what), /reason=\{t\.reason\}/, 'a tile still carries its own line');
  // ONE note, under the list, and it is the engine's own sentence.
  assert.match(what, /data-testid="what-note"/, 'the one note is gone');
  assert.match(what, /REASONS\.projectTypeNotOnline\(\)/, 'the note stopped being the engine\'s word');
});

test('F3 · an inactive tile says COMING SOON, gives the address, and copies it', () => {
  const soon = read('src/retail/ui/ComingSoon.jsx');
  assert.match(soon, />Coming soon</, 'the card does not say coming soon');
  assert.match(soon, /Email us to order:/, 'the card does not ask for the order');
  assert.match(soon, /\{ORDER_EMAIL\}/, 'the address is typed into the card rather than read');
  assert.equal(ORDER_EMAIL, 'Cabinetcore@gmail.com', 'the owner\'s own address moved');
  // The copy affordance, and the word it changes to.
  // TWO roads to the clipboard, because one of them is a permission a browser
  // may refuse: the modern API, and `execCommand` inside the click for every
  // case where it is not granted. COPIED is said only if one of them arrived.
  assert.match(soon, /navigator\.clipboard\.writeText\(ORDER_EMAIL\)/);
  assert.match(soon, /document\.execCommand\('copy'\)/, 'the card has only one road to the clipboard');
  assert.match(soon, /copied \? 'COPIED' : 'COPY THE ADDRESS'/);
  // KEYBOARD-REACHABLE. A disabled <button> takes no focus, so the WRAPPER is
  // what the keyboard reaches, and hover and focus open the same card.
  assert.match(soon, /tabIndex=\{0\}/, 'the card cannot be reached by a keyboard');
  assert.match(soon, /onFocus=\{\(\) => setOpen\(true\)\}/);
  assert.match(soon, /onMouseEnter=\{\(\) => setOpen\(true\)\}/);
  assert.match(soon, /e\.key === 'Escape'/, 'Escape does not close it');
  // ONE implementation for all inactive tiles.
  const what = read('src/retail/design/Options.jsx');
  assert.match(what, /t\.reason\s*\n?\s*\? <ComingSoon key=\{t\.id\} what=\{t\.label\}>\{chip\}<\/ComingSoon>/,
    'the inactive tiles do not share one implementation');
  // …and the tile itself still cannot be pressed.
  assert.match(what, /disabled=\{Boolean\(t\.reason\)\}/);
});

// ═══ F4 · THE SOURCE BUTTON SAYS "DECOR" ════════════════════════════════════

test('F4 · the retail source chip reads DECOR — and PRO still says EGGER', () => {
  const slot = read('src/retail/design/material/MaterialSlot.jsx');
  assert.match(slot, /const RETAIL_SOURCE_LABEL = \{ egger: 'DECOR', laminate: 'DECOR' \};/);
  assert.match(slot, /\{sourceLabel\(s\)\}/, 'the strip still prints the profile\'s own word');
  // It happens in RETAIL'S OWN CHROME. The copy below it is untouched.
  assert.doesNotMatch(read('src/retail/design/material/MaterialChoicePanel.jsx'), /DECOR'/);
  // PRO's profile — the workshop's word — is unchanged.
  const p = getCabinetProfile().projectSettings;
  assert.equal(p.carcassSources.find((s) => s.id === 'egger').label, 'EGGER decor');
  assert.equal(p.frontSources.find((s) => s.id === 'laminate').label, 'Laminate');
  // …and the EGGER name stays INSIDE the picker, on the boards, where the
  // licence requires it.
  assert.match(read('src/retail/design/material/DecorPicker.jsx'), /decorLabel/);
});

// ═══ F5 · THE DEFAULT DECOR ═════════════════════════════════════════════════

test('F5 · the default carcass decor is H3325, named in the PROFILE', () => {
  assert.equal(getCabinetProfile().projectSettings.defaultCarcassDecorId, 'H3325_28');
  // Keys and defaults only: nothing on the cut path reads it.
  const engine = filesUnder('src/engine').filter((rel) => rel !== 'src/engine/profile.js');
  const readers = engine.filter((rel) => /defaultCarcassDecorId/.test(code(rel)));
  assert.deepEqual(readers, [], `the engine reads the retail default: ${readers.join(', ')}`);
  // The one surface that reads it is the lazy client's, and it never
  // overwrites a design that has already said something.
  const adapter = code('src/retail/design/adapter.js');
  assert.match(adapter, /if \(!carcassDecorOf\(S\(\)\.project\)\) \{/);
  assert.match(adapter, /P\(\)\.projectSettings\?\.defaultCarcassDecorId/);
  // The fronts are untouched: sprayed RAL 3005.
  assert.match(adapter, /RAL_WINE_NAME = '3005 Wine Red'/);
});

// ═══ F6 · THE DUPLICATE DIES ════════════════════════════════════════════════

test('F6 · the INSIDE COLOUR row is gone, and ONE path writes the interior finish', () => {
  const options = code('src/retail/design/Options.jsx');
  assert.doesNotMatch(options, /data-testid="inside-colour"/);
  assert.doesNotMatch(options, /SAME AS FRONTS/);
  assert.doesNotMatch(options, /setInsideColour/, 'the row\'s writer survives it');
  // It also reached into the DOM to press another control's button. Gone.
  assert.doesNotMatch(options, /document\.querySelector\('\[data-testid="inside-material"\]/);

  // THE ONE WRITE PATH, asserted as a count: exactly one function in the whole
  // of retail writes the carcass slot's finish, and it is the picker's.
  const writers = filesUnder('src/retail')
    .filter((rel) => /setCarcassFinish\(/.test(code(rel)));
  assert.deepEqual(writers, ['src/retail/design/adapter.js'],
    `a second file writes the interior finish: ${writers.join(', ')}`);
  const adapter = code('src/retail/design/adapter.js');
  // FOUR calls, and all four are the SLOT's own four writers — pick a decor,
  // pick a veneer, clear it, and the named default (`setCarcassDecor`, which
  // `applyLazyDefaults` uses and which routes through the same two store
  // actions). There is no fifth, and no surface but the slot reaches them.
  const calls = [...adapter.matchAll(/setCarcassFinish\(/g)].length;
  assert.equal(calls, 4, `${calls} calls write the carcass finish — the slot's four`);
  for (const owner of ['export function setCarcassDecor', 'export function pickMaterialDecor',
    'export function pickMaterialVeneer', 'export function clearMaterialFinish']) {
    assert.ok(adapter.includes(owner), `${owner} is not the writer it was`);
  }
  assert.match(adapter, /export function pickMaterialDecor[\s\S]{0,400}setCarcassFinish\(slot\.id, finishId\)/);
  // And the slot is the only SURFACE that calls them.
  const surfaces = filesUnder('src/retail')
    .filter((rel) => rel !== 'src/retail/design/adapter.js')
    .filter((rel) => /A\.(pickMaterialDecor|pickMaterialVeneer|clearMaterialFinish)\(/.test(code(rel)));
  assert.deepEqual(surfaces, ['src/retail/design/material/MaterialSlot.jsx'],
    `a second surface writes the interior finish: ${surfaces.join(', ')}`);
});

// ═══ F7 · LEFT ADDS, RIGHT EDITS ════════════════════════════════════════════

test('F7 · the INSIDE row is a name, a count and a door — nothing expands beneath it', () => {
  const options = read('src/retail/design/Options.jsx');
  const list = options.slice(options.indexOf('data-testid="interior-inside"'),
    options.indexOf('T66 F3 · RE-HOMED FROM THE DELETED `WardrobeMenu`'));
  assert.match(list, /data-testid=\{`interior-count-\$\{row\.id\}`\}/, 'the count is gone');
  assert.doesNotMatch(uncomment(list), /<ReHomed/, 'the controls still expand under the row');
  // The row is a DOOR: it selects the stack through the same store the stage
  // writes, which is what docks the editor. The REF is the stage's own — a
  // PANEL id, found by asking `resolveSelection` of the unit's panels — because
  // an ITEM id resolves to nothing for a thing the engine cuts a board for.
  assert.match(list, /A\.stageRefFor\(unit\.id, row\.menu\)/);
  assert.match(list, /A\.selectOnStage\(unit\.id, ref\)/);
  // And the column holds no drawer control at all any more.
  const inside = options.slice(options.indexOf('function InsidePanel'), options.indexOf('/* ─── 5 · FRONTS'));
  for (const gone of ['drawers-count', 'drawers-insert', 'drawers-glass', 'drawers-front-height']) {
    assert.ok(!inside.includes(gone), `${gone} is still in the left column`);
  }
});

test('F7 · …and every one of those controls is on the RIGHT, in the dock', () => {
  const rehomed = read('src/retail/design/detail/ReHomed.jsx');
  for (const hook of ['drawers-count', 'drawers-insert', 'drawers-glass', 'drawers-front-height',
    'overlay-count', 'overlay-front', 'overlay-remove', 'shelf-centre', 'pulldown-drop',
    'pulldown-remove', 'shoe-law']) {
    assert.ok(rehomed.includes(hook), `${hook} was lost on the way right`);
  }
  // The dock renders it, for the row the selection belongs to.
  const detail = code('src/retail/design/Detail.jsx');
  assert.match(detail, /rowForSelection\(selection\) && selection\?\.unitId/);
  assert.match(detail, /<ReHomed row=\{rowForSelection\(selection\)\} unitId=\{selection\.unitId\} \/>/);
  // A selection on no row draws nothing extra — the panel is what it was.
  assert.match(rehomed, /return A\.INTERIOR_ROWS\.find\(\(row\) => row\.menu === selection\.menu\) \|\| null;/);
});

// ═══ F8 · THE LIST IS NAMES ═════════════════════════════════════════════════

test('F8 · the docked drawer list is NAMES — and the accessories one is named once', () => {
  const rehomed = read('src/retail/design/detail/ReHomed.jsx');
  assert.match(rehomed, /data-testid="dock-drawer-list"/, 'there is no list');
  assert.match(rehomed, /return `Drawer \$\{n\}`;/, 'a plain drawer has no name');
  // The accessories drawer takes its name off the SAME table INSIDE counts
  // with — the one F9 renamed — so the two sides cannot drift.
  assert.match(rehomed, /A\.INTERIOR_ROWS\.find\(\(row\) => row\.id === 'watch'\)\?\.name/);
  // NO SENTENCE in the list: every entry is the name and nothing else.
  const list = rehomed.slice(rehomed.indexOf('function DrawerList'), rehomed.indexOf('export default function'));
  assert.doesNotMatch(uncomment(list), /<Said/, 'a sentence came back into the list');
  assert.doesNotMatch(uncomment(list), /fitted/i, 'the list still says "fitted"');
  // Clicking a name opens THAT drawer's own detail, in place — by the panel
  // the stage would have handed the dock had the client clicked its front.
  assert.match(list, /A\.stageRefFor\(unitId, menu, d\.id\)/);
  assert.match(list, /A\.selectOnStage\(unitId, ref\)/);
  // …and the display layer is the guard, the same one that hides the workshop
  // fields — scoped to the dock, never the copied markup.
  const css = read('src/retail/styles/room.css');
  assert.match(css, /\.pbi-dock \.pbi-drawer-list p,/);
  assert.match(css, /\.pbi-dock \.pbi-drawer-list \[data-testid\$="-said"\] \{ display: none !important; \}/);
  // The EXPLANATION still exists — in the drawer's own detail, PRO's own copy.
  assert.match(read('src/retail/design/detail/ElementProperties.jsx'), /Watch insert/);
});

// ═══ F9 · ACCESSORIES DRAWER, IN PRO TOO ════════════════════════════════════

test('F9 · no user-facing "Watch drawer" label remains, in either app', () => {
  const hits = [];
  for (const dir of ['src']) {
    for (const rel of filesUnder(dir)) {
      if (/Watch drawer/.test(read(rel))) hits.push(rel);
    }
  }
  assert.deepEqual(hits, [], `the old label survives in: ${hits.join(', ')}`);
});

test('F9 · every site says "Accessories drawer" — and the ENGINE never learned of it', () => {
  // THE FOUR SITES, named. PRO first, then the copies that must agree with it.
  assert.match(read('src/components/AddItems.jsx'), /label: 'Accessories drawer',/);
  assert.match(read('src/components/AddItems.jsx'), /Add an accessories drawer on top/);
  assert.match(read('src/components/WatchLayoutModal.jsx'), /· Accessories drawer \$\{item\.index\} · Layout/);
  assert.match(read('src/lib/modalLayer.js'), /label: 'Accessories drawer layout'/);
  assert.match(read('src/retail/design/detail/AddItems.jsx'), /label: 'Accessories drawer',/);
  assert.match(read('src/retail/design/detail/WatchLayoutModal.jsx'), /· Accessories drawer \$\{item\.index\} · Layout/);
  assert.match(read('src/retail/design/adapter.js'), /name: 'Accessories drawer',/);
  assert.match(read('src/retail/design/adapter.js'), /if \(sel\.menu === 'watch'\) return 'Accessories drawer';/);

  // THE ENGINE IDENTIFIERS ARE NOT RENAMED — the cut path knows nothing.
  assert.match(read('src/components/AddItems.jsx'), /id: 'watch_drawer',/);
  assert.match(read('src/engine/watchDrawer.js'), /WATCH_LAYOUTS/);
  assert.match(read('src/retail/design/adapter.js'), /pro: 'watch_drawer'/);
  // …and the INSERT names stay: they name contents, not the drawer.
  const layouts = read('src/components/WatchLayoutModal.jsx');
  for (const word of ['WATCHES', 'BELTS']) {
    assert.ok(layouts.includes(word) || read('src/engine/watchDrawer.js').includes(word),
      `${word} was renamed — it names contents`);
  }
});

// ═══ F10 · THE ACCESSORIES LED ══════════════════════════════════════════════

test('F10 · the accessories drawer\'s LED is at 25%, and capped there', () => {
  const gain = getCabinetProfile().appearance.lighting.accessoryDrawerGain;
  assert.equal(gain, 0.25, 'the owner\'s quarter moved');
  // The owner's sentence rides with the key, so no later turn "improves" it.
  const profile = read('src/engine/profile.js');
  const block = profile.slice(profile.indexOf('accessoryDrawerGain') - 1400, profile.indexOf('accessoryDrawerGain'));
  assert.match(block, /nie więcej niż 25 procent od teraz/, 'the key lost the sentence that fixes it');

  // THE CAP is in the drawing file too, so the number lives in two places on
  // purpose — a profile cannot raise it.
  const led = read('src/3d/LedStrips.jsx');
  assert.match(led, /const ACCESSORY_LED_MAX_GAIN = 0\.25;/);
  assert.match(led, /Math\.min\(\s*ACCESSORY_LED_MAX_GAIN,/);
  assert.match(led, /nie więcej niż 25 procent od teraz/, 'the cap lost the sentence that fixes it');
  // WHICH LIGHT: the drawer's own ring, by the id `engine/cabinet.js` gives it.
  assert.match(led, /const isAccessoryDrawerLed = \(s\) => \/:watch-glass\$\/\.test/);
  assert.match(read('src/engine/cabinet.js'), /id: `\$\{shelfAbove\.id\}:watch-glass`/);
  // BOTH halves of that strip's intensity come down: its emissive and its lamp.
  assert.match(led, /\* accessoryGain;/);
  assert.match(led, /spec\.halo\.area \* boost \* accessoryGain,/);
  // THE ROOM RIG IS UNTOUCHED — T66's 0.60 baseGain is a different question.
  assert.doesNotMatch(uncomment(led), /baseGain/, 'the room rig is read in the strip file');
  assert.equal(getCabinetProfile().appearance.studio.baseGain, 0.6, 'the room rig moved');
});
