// ─── TURN 66 · F2, F4, F5, F6, F7, F8, F9, F11 — THE STEPS ─────────────────
//
// Eight of tonight's eleven land in the OPTIONS column, and every one of them
// is a sentence of the owner's about what a client is asked and in what order.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getCabinetProfile } from '../src/engine/profile.js';
import * as A from '../src/retail/design/adapter.js';
import { REASONS } from '../src/retail/design/reasons.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { useUiStore } from '../src/stores/uiStore.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { SPLIT_SEG_GAP, SPLIT_SEG_MIN } from '../src/engine/splitDoors.js';
import { ALL_COLOURS } from '../src/lib/pswColors.js';
import { describeDesign } from '../src/retail/estimate/document.js';
import decorPack from '../public/decors/egger/egger-decors.json' with { type: 'json' };
import { parseDecorCatalogue, setDecorCatalogue } from '../src/engine/decors.js';

const decors = decorPack.decors;

// The EGGER pack, loaded the way retail loads it — the same file, through the
// engine's own parser, into the engine's own registry. Without it `decorById`
// answers null and a decor DEFAULT cannot be written at all, which is not a
// fact about the default; it is a fact about a test that never handed the
// engine its catalogue.
setDecorCatalogue(parseDecorCatalogue(decorPack, { basePath: '/decors/egger/' }));

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const code = (rel) => read(rel).replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const S = () => useProjectStore.getState();

const wardrobe = () => {
  useUiStore.getState().clearSelection();
  A.startDesign('T66');
  return A.addFirstWardrobe();
};

// ═══ F2 · SIZE — THE THIRD TILE ════════════════════════════════════════════

test('F2 · the rail is SEVEN tiles, and SIZE is the third', () => {
  const cats = read('src/retail/design/Categories.jsx');
  const block = cats.slice(cats.indexOf('export const CATEGORIES = ['), cats.indexOf('];', cats.indexOf('export const CATEGORIES = [')));
  const ids = [...block.matchAll(/id: '([a-z]+)'/g)].map((m) => m[1]);
  assert.deepEqual(ids, ['what', 'where', 'size', 'inside', 'fronts', 'extras', 'review']);
  // The rail's MECHANICS did not change — only its content, which is the one
  // licence CLAUDE.md gives it.
  assert.match(cats, /className=\{`pbi-tile/);
  assert.match(cats, /<StepIcon step=\{c\.id\} \/>/);
  assert.match(cats, /onClick=\{\(\) => onPick\(c\.id\)\}/);
  // …and the seventh icon is drawn in `drawings.jsx`'s own manner: no npm set.
  assert.match(read('src/retail/design/detail/drawings.jsx'), /^ {2}size: \(/m);
});

test('F2 · SIZE holds three typed fields, and they are the store\'s own setters', () => {
  const options = read('src/retail/design/Options.jsx');
  const panel = options.slice(options.indexOf('function SizePanel'), options.indexOf('/* ─── T64 · TOMBSTONE'));
  for (const dim of ['width', 'height', 'depth']) {
    assert.match(panel, new RegExp(`testid="size-${dim}"`), `SIZE has no ${dim}`);
    assert.match(panel, new RegExp(`A\\.setUnitSize\\(unit\\.id, \\{ ${dim}: v \\}\\)`),
      `${dim} does not write through the one setter`);
    assert.match(panel, new RegExp(`min=\\{b\\.${dim}\\.min\\}`), `${dim}'s floor is not the engine's`);
    assert.match(panel, new RegExp(`max=\\{b\\.${dim}\\.max\\}`), `${dim}'s ceiling is not the engine's`);
  }
  assert.ok(!/Slider|type="range"/.test(panel), 'SIZE grew a slider');
});

test('F2 · the ROOM refuses first, and the sentence is the room\'s own', () => {
  const id = wardrobe();
  // A width the room cannot hold: the store's `roomFitRefusalFor` answers in a
  // whole sentence, and `setUnitSize` hands it back verbatim.
  const wall = Math.round(A.wallLengthMm(S().project.room, 0));
  const verdict = A.setUnitSize(id, { width: wall + 2000 });
  assert.equal(verdict.ok, false, 'the room accepted a wardrobe wider than itself');
  assert.ok(verdict.said.length > 10, 'the refusal has no words');
  // …and the wardrobe did not move.
  assert.ok(Math.round(S().units.find((u) => u.id === id).params.width) <= wall);
});

test('F2 · with no wardrobe, SIZE says so and offers ADD A WARDROBE', () => {
  const options = read('src/retail/design/Options.jsx');
  assert.match(options, /<NeedsAWardrobe title="SIZE" testid="panel-size"/);
  assert.match(options, /data-testid=\{`\$\{testid\}-add-wardrobe`\}/, 'the empty state cannot add one');
  // …and the empty state is T65 F1's, unchanged: one sentence, one button.
  assert.match(options, /A\.addFirstWardrobe\(\) \? '' : REASONS\.roomRefusedWardrobe\(\)/);
});

test('F2 · INSIDE carries no size field, and opens on the carcass material', () => {
  const options = read('src/retail/design/Options.jsx');
  const inside = options.slice(options.indexOf('function InsidePanel'), options.indexOf('/* ─── 5 · FRONTS'));
  assert.ok(!/size-width|size-height|size-depth|width: v|depth: v/.test(inside),
    'a size field survives in INSIDE');
  const material = inside.indexOf('<MaterialSlot kind="carcass"');
  assert.ok(material > 0 && material < inside.indexOf('<AddItems unit={unit} />'),
    'INSIDE does not open on the carcass material');
});

// ═══ F4 · FRONTS — A LIST, NOT A MOSAIC ════════════════════════════════════

test('F4 · STYLE is a vertical list of rows, in the owner\'s own order', () => {
  const options = read('src/retail/design/Options.jsx');
  assert.match(options, /className="pbi-style-list"/, 'STYLE is still a mosaic of chips');
  assert.match(options, /const order = \['F', 'S', 'G', 'A'\];/, 'SLAB · SHAKER · GROOVED · ARCHED');
  assert.match(options, /<FrontThumb style=\{s\.id\} size="row" \/>/, 'the rows have no drawing');
  // The J is a HANDLE system, not a shape (T57) — still not offered as a style.
  assert.match(options, /filter\(\(s\) => s\.id !== 'HJ'\)/);
  // A coming-soon row is a GREYED ROW, and it says so on the row itself.
  assert.match(options, /data-soon=\{s\.soon \? 'yes' : 'no'\}/);
  assert.match(options, /disabled=\{s\.soon\}/);
  const css = read('src/retail/styles/room.css');
  assert.match(css, /\.pbi-style-row\.is-soon \{[^}]*opacity/);
  assert.match(css, /\.pbi-style-row\.is-on \{[^}]*border-color: var\(--pbi-deep-gold\)/,
    'the selected row has no gold hairline');
  // …and the drawing is SMALLER than the tile it replaced, at ONE size.
  const scale = read('src/retail/styles/scale.css');
  const thumb = Number((scale.match(/--pbi-thumb: calc\((\d+) \*/) || [])[1]);
  const row = Number((scale.match(/--pbi-thumb-row: calc\((\d+) \*/) || [])[1]);
  assert.ok(row > 0 && row < thumb, `the row drawing is ${row}, the tile was ${thumb}`);
});

test('F4 · the sentences collect BELOW the list — never under a row', () => {
  const options = read('src/retail/design/Options.jsx');
  const list = options.indexOf('className="pbi-style-list"');
  const notes = options.indexOf('data-testid="fronts-style-notes"');
  assert.ok(list > 0 && notes > list, 'the notes are not below the list');
  assert.match(options, /data-testid="fronts-style-line"/);
  assert.match(options, /data-testid="fronts-style-soon"/);
  // One block, one line each — and the coming-soon note only when a greyed row
  // is actually standing in the list.
  assert.match(options, /\{styles\.some\(\(s\) => s\.soon\) \?/);
  // …and not one sentence is rendered inside a row.
  const rows = options.slice(list, notes);
  assert.ok(!/STYLE_LINES|REASONS\.styleComingSoon|reason=/.test(rows),
    'a sentence is back under a row');
});

test('F4 · SHAKER selected → a FRAME WIDTH field, and only then', () => {
  const options = read('src/retail/design/Options.jsx');
  assert.match(options, /\{style === 'S' \? \(\s*<Field label="FRAME WIDTH">/,
    'the frame field is not gated on shaker');
  assert.match(options, /testid="fronts-frame-width"/);
  // The bounds are the ENGINE's own, around its own 60.
  assert.match(options, /min=\{b\.shakerFrame\.min\}/);
  assert.match(options, /max=\{b\.shakerFrame\.max\}/);
  assert.match(options, /standardAt=\{b\.shakerFrame\.standard\}/);
  const b = A.designBounds().shakerFrame;
  assert.equal(b.standard, P.front.types.S.frameWidth);
  assert.equal(b.min, P.front.types.S.frameMin);
  assert.equal(b.max, P.front.types.S.frameMax);
  assert.equal(b.standard, 60, 'the engine\'s own frameWidth moved');
  // …and it writes through the one setter, which is the store's.
  assert.match(options, /A\.setShakerFrame\(v\)/);
});

test('F4 · OPENING is an aligned column of the four — one width, no stagger', () => {
  const options = read('src/retail/design/Options.jsx');
  assert.match(options, /className="pbi-opening-list"/);
  assert.deepEqual(A.frontOpenings().map((o) => o.id), ['push', 'handles', 'knobs', 'jhandle']);
  const css = read('src/retail/styles/room.css');
  const at = css.indexOf('.pbi-opening-list {');
  const rule = css.slice(at, css.indexOf('}', at));
  assert.match(rule, /flex-direction: column/);
  const rowAt = css.indexOf('.pbi-opening-row {');
  assert.match(css.slice(rowAt, css.indexOf('}', rowAt)), /width: 100%/, 'the rows are not equal widths');
});

// ═══ F5 · THE SHOWROOM DEFAULT — WINE ON WALNUT ════════════════════════════

test('F5 · RAL 3005 Wine Red is already in the palette the picker reads', () => {
  // CLAUDE.md: *"RAL 3005 must exist in the spray palette the copied
  // ColourPicker reads; if the palette lacks it, add it."* It does not lack it.
  const found = ALL_COLOURS.find((c) => c.system === 'RAL' && c.name === '3005 Wine Red');
  assert.ok(found, 'RAL 3005 is not in reference/colors/psw-colors.json');
  assert.equal(found.hex, '#5e2129');
  assert.deepEqual(A.ralWine(), { hex: '#5e2129', name: '3005 Wine Red', system: 'RAL' });
  // The hex is NOT typed in retail's CODE — it is read off the one list. (The
  // paragraph above `ralWine` quotes it, which is the point of the paragraph.)
  assert.ok(!/#5e2129/i.test(code('src/retail/design/adapter.js')), 'retail typed the colour');
  assert.match(read('src/retail/design/adapter.js'),
    /ALL_COLOURS\.find\(\(c\) => c\.system === 'RAL' && c\.name === RAL_WINE_NAME\)/);
  // …and the picker reads that same list.
  assert.match(read('src/retail/design/material/ColourPicker.jsx'), /COLOUR_SYSTEMS/);
});

// ─── AMENDED BY TURN 67 · F5 ──────────────────────────────────────────────
// The owner, 11.09.2026: *"default Egger to H3325 Gladstone Oak."*  The CLAIM
// this test was written to make is unchanged and is the one that matters: the
// default decor is a REAL row of the REAL bucket, never invented. What changed
// is which row, and WHERE THE NAME LIVES — the profile now, not retail, so a
// workshop can change its default without editing the client's app.
test('F5, amended by T67 · the default is a REAL Egger decor, named in the profile', () => {
  const named = getCabinetProfile().projectSettings.defaultCarcassDecorId;
  assert.equal(named, 'H3325_28', 'the profile no longer names the owner\'s decor');
  assert.equal(A.DEFAULT_CARCASS_DECOR, named, 'retail holds a second opinion about the default');
  const decor = decors.find((d) => d.id === named);
  assert.ok(decor, `${named} is not in the catalogue`);
  assert.match(decor.name, /Gladstone Oak/i, 'the named decor is not the Gladstone Oak');
  assert.equal(decor.code, 'H3325');
  assert.equal(decor.category, 'woodgrain');
  assert.equal(decors.length, 85, 'the REAL bucket is no longer the 85');
});

test('F5, amended by T67 · a fresh design is wine on H3325 — fronts sprayed, carcass and inside the board', () => {
  useUiStore.getState().clearSelection();
  A.startDesign('Showroom');
  const id = A.addFirstWardrobe();
  A.applyLazyDefaults(id);
  const p = S().project;
  // THE FRONTS — sprayed, RAL 3005, and NOT faced in a decor.
  assert.equal(p.design.fronts.types[0].source, 'spray');
  assert.deepEqual(A.frontColourOf(p), A.ralWine());
  assert.equal(A.frontDecorOf(p), null, 'a sprayed front carries a facing');
  // THE CARCASS — the owner's own decor, and the inside is the same board.
  assert.equal(A.carcassDecorOf(p), A.swatchFor(A.DEFAULT_CARCASS_DECOR).finishId);
  assert.equal(A.insideColourOf(p), 'chosen');
  // …and the style is still shaker, the opening still push-to-open.
  assert.equal(p.design.fronts.style, 'S');
  assert.equal(A.frontOpeningOf(p), 'push');
});

test('F5 · every step still changes it — a default is not a lock', () => {
  useUiStore.getState().clearSelection();
  A.startDesign('Showroom');
  const id = A.addFirstWardrobe();
  A.applyLazyDefaults(id);
  // FRONTS: a decor over the spray FACES the front and clears the project's
  // own front colour — `withFrontColour`/`setFrontType`'s own law, not one
  // retail wrote, and the reason a default cannot lock a client in.
  A.setFrontDecor('H3195_19');
  assert.equal(A.frontDecorOf(S().project), 'egger:H3195_19', 'the decor did not take');
  assert.equal(S().project.design.colour.front, null, 'the project is still painted wine');
  // INSIDE: white puts the carcass back to EGGER's own W1000.
  // T67 F6 · through the ONE write path — the carcass picker — because the
  // second road (`setInsideColour`) died with the duplicated row.
  A.pickMaterialDecor('carcass', A.swatchFor(A.WHITE_DECOR).finishId);
  assert.equal(A.insideColourOf(S().project), 'white');
  // …and the spray comes straight back, which is the other half of "not a lock".
  A.setFrontColour(A.ralWine());
  assert.deepEqual(A.frontColourOf(S().project), A.ralWine());
  assert.equal(A.frontDecorOf(S().project), null, 'a colour did not un-face the front');
});

test('F5 · the REVIEW summary names them, in the same words a client\'s own pick gets', () => {
  useUiStore.getState().clearSelection();
  A.startDesign('Showroom');
  const id = A.addFirstWardrobe();
  A.applyLazyDefaults(id);
  // `describeDesign` is what the REVIEW step renders and what the saved
  // estimate row carries — one function, so a default and a choice cannot be
  // described differently.
  const rows = describeDesign({ project: S().project, units: S().units });
  const text = rows.map((r) => `${r.label}: ${r.value}`).join(' · ');
  assert.match(text, /Wine Red/i, `the summary does not name the colour — ${text}`);
  // T67 F5 · *"REVIEW naming H3325."*  The summary names the DEFAULT decor by
  // the catalogue's own words — the code and the name, exactly as it names a
  // board the client picked himself, which is the claim this test makes.
  assert.match(text, /H3325/, `the summary does not name the board's code — ${text}`);
  assert.match(text, /Gladstone Oak/i, `the summary does not name the board — ${text}`);
});

// ═══ F6 · BAYS — ONE ROW, ONE NAME ═════════════════════════════════════════

test('F6 · the row is renamed, and there is exactly ONE entry', () => {
  const row = A.INTERIOR_ROWS.find((r) => r.id === 'partition');
  assert.equal(row.name, 'Vertical partitions (bays)');
  const options = read('src/retail/design/Options.jsx');
  assert.equal([...options.matchAll(/testid="inside-bays"/g)].length, 1);
  assert.equal([...options.matchAll(/A\.setBayCount\(/g)].length, 1, 'two controls write the count');
  // …and the TYPED count and its max are T65 F7's, untouched.
  assert.equal(A.designBounds().bays.max, A.MAX_BAYS);
  assert.equal(A.MAX_BAYS, 3);
  // The note-line law stands: above one, and not before.
  assert.match(options, /\{bays > 1 \?/);
  assert.match(options, /REASONS\.baysMayDiffer/);
});

// ═══ F7 · SPLIT DOOR — INTO EXTRAS ═════════════════════════════════════════

test('F7 · the split acts on the selected leaf, through the DoorModal\'s own store path', () => {
  const id = wardrobe();
  const before = A.splitDoor(id);
  assert.ok(before, 'the split has nothing to say about a wardrobe with doors');
  assert.equal(before.said, '', `refused on a plain wardrobe: ${before.said}`);
  assert.equal(before.min, SPLIT_SEG_MIN, 'the floor is not the kit\'s own minimum');
  assert.ok(before.max > before.min, 'no room between the ends');

  // …and it writes the SAME setter `SplitDoorField` writes.
  const at = Math.round((before.max + before.min) / 2);
  const done = A.setSplitTopMm(id, before.bay, at);
  assert.equal(done.ok, true, done.said);
  const leaves = A.doorPanels(id).filter((p) => p.meta?.split);
  assert.ok(leaves.length >= 2, 'the leaf did not split into two segments');

  // …and 0 puts the leaf back to one door, which is the engine's way out.
  A.setSplitTopMm(id, before.bay, 0);
  assert.equal(A.doorPanels(id).filter((p) => p.meta?.split).length, 0);
});

test('F7 · it greys with the engine\'s reason — no doors, or a leaf too short', () => {
  const id = wardrobe();
  A.removeDoors(id);
  assert.equal(A.splitDoor(id).said, REASONS.splitNeedsADoor);

  A.addDoors(id);
  // A leaf under twice the kit's minimum plus its gap cannot split at all.
  A.setUnitSize(id, { height: P.wardrobe.minHeight });
  const tiny = A.splitDoor(id);
  const leaf = A.doorPanels(id).find((p) => p.role === 'front');
  if (leaf && Math.round(leaf.h) < 2 * SPLIT_SEG_MIN + SPLIT_SEG_GAP) {
    assert.equal(tiny.said, REASONS.splitLeafTooShort(SPLIT_SEG_MIN));
  } else {
    assert.equal(tiny.said, '', 'a leaf with room refused anyway');
  }
});

test('F7 · the action is in EXTRAS, beside ADD DOORS and ADD TOP BOX', () => {
  const options = read('src/retail/design/Options.jsx');
  const extras = options.slice(options.indexOf('function ExtrasPanel'), options.indexOf('/* ─── 7 · REVIEW'));
  assert.match(extras, /<Field label="SPLIT DOOR \(TOP SEGMENT\)">/);
  assert.match(extras, /testid="extras-split-top"/);
  assert.match(extras, /A\.setSplitTopMm\(unit\.id, split\.bay, v\)/);
  assert.match(extras, /data-testid="extras-add-doors"/);
  assert.match(extras, /data-testid="layout-add-top-box"/);
  // The reason stands in the field's place when it cannot act — never a
  // control that would do nothing.
  assert.match(extras, /\{split\?\.said \? \(\s*<Said testid="extras-split-said">/);
});

// ═══ F8 · WHERE — THE ROOM IS NOT HIDDEN ═══════════════════════════════════

test('F8 · EDIT THE ROOM stands in WHERE, and MORE OPTIONS is gone from that step', () => {
  const options = read('src/retail/design/Options.jsx');
  const where = options.slice(options.indexOf('function WherePanel'), options.indexOf('/* ─── 3 · SIZE'));
  assert.match(where, /data-testid="space-edit-room"/, 'WHERE lost the room button');
  assert.ok(!/MoreOptions/.test(where), 'the room is still folded under MORE OPTIONS');
  assert.ok(!/where-more/.test(options), 'the fold survives with nothing in it');
  // It stands UNDER the two fields, which is where the owner put it.
  assert.ok(where.indexOf('testid="space-ceiling"') < where.indexOf('data-testid="space-edit-room"'));
  // …and it still opens BESIDE its trigger — rule 15 is untouched.
  assert.match(where, /onEditRoom\(anchorOfEvent\(e\)\)/);
});

// ═══ F9 · THE VIEW OPENS DRESSED ═══════════════════════════════════════════

test('F9 · a fresh design mounts with DIMENSIONS and OUTLINES on', () => {
  for (const rel of ['src/retail/main-retail.jsx', 'src/retail/design/DesignRoom.jsx']) {
    const text = code(rel);
    assert.match(text, /setShowDimensions\(true\)/, `${rel} still mounts the dimensions off`);
    assert.match(text, /setShowOutlines\(true\)/, `${rel} still mounts the outlines off`);
    // The three that are TOOLS stay off — that half did not change.
    assert.match(text, /setXray\(false\)/);
    assert.match(text, /setContourView\(false\)/);
    assert.match(text, /setRuler\(false\)/);
  }
  // RESET VIEW does not touch them: it is a CAMERA, and T65 F4 made that its
  // whole job.
  const stage = code('src/retail/design/Stage.jsx');
  const at = stage.indexOf('export function resetStageView');
  const fn = stage.slice(at, stage.indexOf('\n}', at));
  assert.ok(!/setShowDimensions|setShowOutlines/.test(fn), 'RESET VIEW turns the view off');
});

test('F9 · the buttons show the ON state, because they read the same store flags', () => {
  const bar = read('src/retail/design/ViewBar.jsx');
  assert.match(bar, /showDimensions/, 'the bar does not read the dimensions flag');
  assert.match(bar, /showOutlines/, 'the bar does not read the outlines flag');
});

// ═══ F11 · COLUMN 2, THE SECOND TEN PER CENT ═══════════════════════════════

test('F11 · the base is 337 — 421 × 0.8, the owner\'s original twenty', () => {
  const scale = read('src/retail/styles/scale.css');
  const base = Number((scale.match(/--pbi-col-options: calc\((\d+) \* var\(--pbi-scale\)\);(?![\s\S]*--pbi-col-options: calc)/) || [])[1]);
  assert.equal(base, 337);
  assert.equal(base, Math.round(421 * 0.8));
  // The other two columns did NOT move — the space goes to the stage.
  const of = (name) => Number((scale.match(new RegExp(`${name}: calc\\((\\d+) \\* var\\(--pbi-scale\\)\\);(?![\\s\\S]*${name}: calc)`)) || [])[1]);
  assert.equal(of('--pbi-col-categories'), 89);
  assert.equal(of('--pbi-col-detail'), 446);
  // …and it is still one base times one number. No media query, no formula.
  assert.match(scale, /--pbi-scale: clamp\(0\.78px, calc\(0\.78px \+ \(100vw - 1280px\) \* 0\.00017\), 1px\);/);
});

test('F11 · the two labels the measure found were fixed in the COPY\'S WIDTHS', () => {
  // CLAUDE.md: *"If a label breaks, fix the copy's `pbi-re-*` widths."*
  const css = read('src/retail/styles/room.css');
  assert.match(css, /\.pbi-room \.pbi-options \[data-chosen-tile\] \{ flex-wrap: wrap; \}/);
  assert.match(css, /\.pbi-room \.pbi-options \[data-chosen-tile\] > \.pbi-re-minw \{ flex: 1 1 100%; \}/);
  assert.match(css, /\.pbi-source-seg \{ flex-wrap: wrap; \}/);
  // …and the copies' MARKUP is untouched, which the fidelity test also holds.
  for (const [pro, retail] of [
    ['src/components/MaterialChoicePanel.jsx', 'src/retail/design/material/MaterialChoicePanel.jsx'],
    ['src/components/ChosenDecorTile.jsx', 'src/retail/design/material/ChosenDecorTile.jsx'],
    ['src/components/FrontStyleGallery.jsx', 'src/retail/design/material/FrontStyleGallery.jsx'],
  ]) {
    const lines = (t) => t.replace(/\n$/, '').split('\n').length;
    assert.equal(lines(read(retail)), lines(read(pro)), `${retail} is no longer the same shape as its original`);
  }
});
