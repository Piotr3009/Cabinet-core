// ─── TURN 68 · F6 + F8 — THE HINGES GO BACK TO PRO, FRONTS KEEPS ONE ROAD ──
//
// F6, the owner: *"wybór hinges to nie jest dobry pomysł, nie tutaj — zostaw
// w PRO."*
// F8, the owner: *"z menu front usuń COLLECTION proszę, i MORE OPTIONS — po co
// mi dwa razy ta sama opcja."*

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { FRONT_STYLE_OPTIONS } from '../src/engine/design.js';
import { T63_COPIES } from '../scripts/t63-copies.mjs';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const code = (rel) => read(rel).replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');

const OPTIONS = () => read('src/retail/design/Options.jsx');
/** The FRONTS step, WITH its tombstones — which is what names the four ids. */
const frontsRaw = () => {
  const o = OPTIONS();
  return o.slice(o.indexOf('function FrontsPanel'), o.indexOf('/* ─── 6 · EXTRAS'));
};
/**
 * The FRONTS step as the BROWSER sees it — comments stripped. A tombstone is
 * meant to name what left; a test that read it as code would fail the moment
 * the removal was properly documented, which is the wrong way round.
 */
const fronts = () => frontsRaw().replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');

// ═══ F6 · HINGE ASSIGNMENT LEAVES THE RETAIL DOCK ══════════════════════════

test('F6 · the two hinge blocks are hidden in the retail dock, behind the ONE flag', () => {
  const css = read('src/retail/styles/room.css');
  assert.match(css, /\.pbi-room\[data-workshop-tools="no"\] \.pbi-dock \[data-hinge-modal\] > div:has\(> \[data-hinge-assign\]\)/,
    'ASSIGN OTHER HINGE is still in the client\'s dock');
  assert.match(css, /\.pbi-room\[data-workshop-tools="no"\] \.pbi-dock \[data-hinge-modal-rows\]/,
    'the hinge-height rows are still in the client\'s dock');
  // The flag, and the ONE place it is stamped.
  assert.match(read('src/retail/config.js'), /export const RETAIL_SHOW_WORKSHOP_TOOLS = false;/);
  assert.match(code('src/retail/RetailApp.jsx'),
    /data-workshop-tools=\{RETAIL_SHOW_WORKSHOP_TOOLS \? 'yes' : 'no'\}/);
});

test('F6 · HIDDEN, NOT CUT — the copy still carries every byte of PRO\'s hinge section', () => {
  // This is the reason the rule is CSS and not a guard in the component:
  // `DoorModal.jsx` is a COPY, and the fidelity tests hold it to PRO's own
  // line count, element count and every one of PRO's lines. The assertions
  // below are the SAME claim, asked here of the one file F6 touches on.
  const entry = T63_COPIES.find((c) => c.retail === 'src/retail/design/detail/DoorModal.jsx');
  assert.ok(entry, 'DoorModal is not on the copy manifest');
  assert.equal(read(entry.retail).split('\n').length, read(entry.pro).split('\n').length,
    'the copy is no longer PRO\'s length — something was cut rather than hidden');
  for (const hook of ['data-hinge-assign="1"', 'data-hinge-modal-rows="1"',
    'assignDoorHinge(unit.id, panel.id, family)', 'Assign other hinge']) {
    assert.ok(read(entry.retail).includes(hook), `the copy lost ${hook}`);
    assert.ok(read(entry.pro).includes(hook), `PRO lost ${hook}`);
  }
  // …and RETAIL_SHOW_WORKSHOP_TOOLS is not named inside the copy at all.
  assert.doesNotMatch(read(entry.retail), /RETAIL_SHOW_WORKSHOP_TOOLS/,
    'a flag was written into a copy');
});

test('F6 · the client keeps the handle, the mirror, the split — and the door\'s facts', () => {
  const doorModal = read('src/retail/design/detail/DoorModal.jsx');
  const css = read('src/retail/styles/room.css');
  // Everything F6 does NOT take: none of these is named by the hide rule.
  for (const kept of ['HandleSection', 'data-door-section="A"', 'data-hinge-resolved']) {
    assert.ok(doorModal.includes(kept), `the door window lost ${kept}`);
    assert.ok(!css.includes(`.pbi-dock [${kept}]`), `${kept} was hidden — F6 did not ask for it`);
  }
  // `data-hinge-resolved` is the LINE that says which hinge is fitted. It is a
  // fact about what the client is buying, not a control, and it stays.
  assert.ok(!/data-hinge-resolved/.test(css), 'the client can no longer see which hinge is fitted');
});

test('F6 · PRO is untouched — its own door window carries both blocks, unhidden', () => {
  const pro = read('src/components/DoorModal.jsx');
  assert.match(pro, /data-hinge-assign="1"/);
  assert.match(pro, /data-hinge-modal-rows="1"/);
  // PRO's page never stamps the attribute the rule keys on, so the rule cannot
  // reach it even if the sheet were loaded there.
  assert.doesNotMatch(code('src/App.jsx'), /data-workshop-tools/);
  assert.doesNotMatch(code('src/components/DoorModal.jsx'), /data-workshop-tools/);
});

// ═══ F8 · FRONTS — ONE ROAD ════════════════════════════════════════════════

test('F8 · the COLLECTION block and the STYLE GALLERY have left FRONTS', () => {
  const panel = fronts();
  assert.ok(!/fronts-collection/.test(panel), 'the COLLECTION chips are back in FRONTS');
  assert.ok(!/fronts-style-gallery/.test(panel), 'the STYLE GALLERY is back in FRONTS');
  assert.ok(!/applyCollection/.test(panel), 'FRONTS still applies a collection');
  assert.ok(!/FrontStyleGallery/.test(panel), 'FRONTS still renders the gallery');
  // …and the fold they were the whole of goes with them: *"A fold with nothing
  // behind it is a control that does nothing."*
  assert.ok(!/fronts-more/.test(panel), 'MORE OPTIONS survives with nothing behind it');
  // Neither symbol is imported into the file any more.
  const options = OPTIONS();
  assert.ok(!/import \{ COLLECTIONS \}/.test(options));
  assert.ok(!/import FrontStyleGallery/.test(options));
});

test('F8 · the STYLE list is the one road, and it is still the four', () => {
  const panel = fronts();
  assert.match(panel, /data-testid="fronts-style"/);
  assert.match(panel, /A\.setFrontStyle\(s\.id\)/);
  // Exactly ONE call to `setFrontStyle` survives in the whole step.
  assert.equal((panel.match(/A\.setFrontStyle\(/g) || []).length, 1,
    'FRONTS writes the style in more than one place');
  // …and the OPENING list is where the J now honestly lives (T57's doctrine).
  assert.match(panel, /data-testid="fronts-opening"/);
  assert.match(panel, /A\.setFrontOpening\(o\.id\)/);
  assert.match(panel, /order = \['F', 'S', 'G', 'A'\]/);
  assert.match(panel, /filter\(\(s\) => s\.id !== 'HJ'\)/, 'the legacy J is offered as a shape again');
});

test('F8 · nothing re-homes, and the four ids that went are NAMED', () => {
  // *"Any control that existed ONLY there re-homes and is named; duplicates
  // die."* The gallery's extras are not capabilities the list dropped — they
  // are `FRONT_STYLE_OPTIONS` whole, and T66 F4 narrowed a client's choice to
  // four on purpose. Each of the four is named in the tombstone.
  const gallery = new Set(FRONT_STYLE_OPTIONS.map((o) => o.id));
  const list = ['F', 'S', 'G', 'A'];
  const extras = [...gallery].filter((id) => !list.includes(id));
  assert.deepEqual(extras.sort(), ['AH', 'GF', 'GL', 'HJ']);
  const tomb = frontsRaw();
  for (const id of extras) {
    assert.ok(new RegExp(`\`${id}\``).test(tomb), `${id} left FRONTS without being named`);
  }
  // The copied COMPONENT is not deleted — 1:1 = COPY, and a copy is not cut
  // because its caller count fell.
  assert.ok(T63_COPIES.some((c) => c.retail === 'src/retail/design/material/FrontStyleGallery.jsx'));
  assert.ok(read('src/retail/design/material/FrontStyleGallery.jsx').length > 100);
});

test('F8 · the collections still live where they entered', () => {
  // They are a PRESET a client arrives on, and F1 made them write through the
  // one front law. Both doors are intact.
  assert.match(code('src/retail/design/adapter.js'), /export function applyCollection/);
  assert.match(code('src/retail/site/LandingPage.jsx'), /collection/i);
  assert.match(code('src/retail/design/DesignRoom.jsx'), /applyLazyDefaults/);
  // …and exactly one surface in the DESIGN room presses `applyCollection`.
  const room = code('src/retail/design/DesignRoom.jsx') + code('src/retail/design/Options.jsx');
  assert.equal((room.match(/applyCollection\(/g) || []).length, 0,
    'the design room still applies a collection directly');
});
