import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

import {
  DECOR_CATEGORIES, DECOR_DISCLAIMER, DECOR_GRAIN_TEXTURE, decorById, decorFinish, decorMapping,
  decorIdFromFinishId, decorLabel, filterDecors, finishFromDecor, finishIdForDecor, grainRun,
  normaliseDecor, parseDecorCatalogue, setDecorCatalogue, setDecorScale,
} from '../src/engine/decors.js';
import { finishById, resolveFinishes, migrateDesign } from '../src/engine/design.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { DECOR_DIR, loadDecorCatalogue } from '../src/lib/decorCatalogue.js';

// ─── The EGGER decor pack (BACKLOG #19, picker v1 — turn 5 F5) ───
//
// Two things are being tested here, and the second one is the important one.
//
//   1. The pack loads: 85 decors, two categories, filter and search.
//   2. THE ATTRIBUTION HOLDS. An EGGER image may be shown whole, unedited and
//      next to the word EGGER plus the decor's code and name. That is a code
//      path, so it is a test — a licence that lives only in a comment is a
//      licence one refactor away from being broken.
//
// ─── WHAT TURN 8 CHANGED ───
//
// Turn 5 read the terms as forbidding the scans as 3D textures until there is
// written consent, and this file HELD THAT LINE: it asserted that no finish
// derived from a decor ever carried an EGGER image. Piotr took that decision
// back on 07.08 — the scans are in Supabase Storage, every woodgrain row
// carries a `tex` url, and a woodgrain decor is rendered with the
// manufacturer's own image. It is his supplier relationship and his risk.
//
// So the assertion has moved rather than been deleted. What is tested now is
// what the licence still asks of the SOFTWARE: the image is shown WHOLE and
// UNEDITED (no tint, no recolour), the attribution is unconditional, and a
// decor with no scan — or a machine with no network — falls back to our own
// procedural grain instead of a white panel. The consent itself is BLOCKERS #44.

const CATALOGUE_PATH = new URL('../public/decors/egger/egger-decors.json', import.meta.url);
const raw = JSON.parse(readFileSync(CATALOGUE_PATH, 'utf8'));
const { decors } = parseDecorCatalogue(raw, { basePath: '/decors/egger/' });

test('the pack Piotr supplied is the pack the app reads', () => {
  assert.equal(decors.length, 85);
  const counts = {};
  for (const d of decors) counts[d.category] = (counts[d.category] || 0) + 1;
  assert.deepEqual(Object.keys(counts).sort(), ['uni_colour', 'woodgrain']);
  assert.deepEqual(DECOR_CATEGORIES.map((c) => c.id), ['uni_colour', 'woodgrain']);

  for (const d of decors) {
    assert.ok(d.id && d.code, 'every decor has an id and a code');
    assert.match(d.hex, /^#[0-9A-F]{6}$/, `${d.id} has no usable colour: ${d.hex}`);
    assert.ok(d.name, `${d.id} has no name`);
  }
});

test('every thumbnail the app asks for is actually in the repo', () => {
  // A grid of broken images is a worse answer than a grid of colours.
  for (const d of decors) {
    if (!d.thumb) continue;
    const file = new URL(`../public${d.thumb}`, import.meta.url);
    assert.ok(existsSync(file), `${d.id} points at a thumbnail that is not there: ${d.thumb}`);
  }
});

// ─── attribution ───

test('a decor is never named without EGGER, its code and its name', () => {
  const oak = decors.find((d) => d.id === 'H1180_37');
  assert.ok(oak, 'the pack has changed — H1180_37 was the reference decor');
  assert.equal(decorLabel(oak), 'EGGER H1180 ST37 Natural Halifax Oak');

  for (const d of decors) {
    const label = decorLabel(d);
    assert.ok(label.startsWith('EGGER '), `${d.id}: no brand`);
    assert.ok(label.includes(d.code), `${d.id}: no code`);
    assert.ok(label.includes(d.name.replace(`${d.code} `, '')), `${d.id}: no name`);
    // …and the code is not said twice: the shipped name already begins with it.
    assert.equal(label.split(d.code).length - 1, 1, `${d.id}: "${label}" repeats the code`);
  }
  assert.equal(decorLabel(null), '');
});

test('the reproduction note is carried verbatim', () => {
  assert.equal(
    DECOR_DISCLAIMER,
    'All decors are reproductions — colour matching only on the original sample (EGGER).',
  );
});

// ─── THE SCANS (turn 8, Piotr 07.08) ───

test('every woodgrain in the pack has a scan, and every scan is a real url', () => {
  const wood = decors.filter((d) => d.category === 'woodgrain');
  assert.equal(wood.length, 69, 'the 69 woodgrains CLAUDE.md counts');
  for (const d of wood) {
    assert.ok(d.tex, `${d.id} has no scan — it would fall back to procedural wood`);
    assert.match(d.tex, /^https:\/\//, `${d.id}: a scan is fetched over https`);
  }
  // A uni colour is one flat colour and needs no image at all.
  for (const d of decors.filter((x) => x.category === 'uni_colour')) {
    assert.equal(d.tex, null, `${d.id}: 13 needless megabytes for a flat colour`);
  }
});

test('a scan url that is not a url at all is refused rather than loaded', () => {
  // This string is handed to a texture loader. A catalogue is a data file today
  // and a database row tomorrow, and neither is a place to accept a scheme the
  // page would execute or decode.
  assert.equal(normaliseDecor({ id: 'a', code: 'A', tex: 'javascript:alert(1)' }).tex, null);
  assert.equal(normaliseDecor({ id: 'a', code: 'A', tex: 'data:image/png;base64,AA' }).tex, null);
  assert.equal(normaliseDecor({ id: 'a', code: 'A', tex: '  ' }).tex, null);
  assert.equal(normaliseDecor({ id: 'a', code: 'A', tex: 'https://x/y.jpg' }).tex, 'https://x/y.jpg');
});

test('a uni colour is a flat colour in 3D; a woodgrain wears the maker s own board', () => {
  const uni = decors.find((d) => d.category === 'uni_colour');
  const wood = decors.find((d) => d.category === 'woodgrain');

  const uniFinish = finishFromDecor(uni);
  assert.equal(uniFinish.kind, 'colour');
  assert.equal(uniFinish.texture, undefined, 'a plain colour needs no image at all');
  assert.equal(uniFinish.hex, uni.hex);

  const woodFinish = finishFromDecor(wood, { scanAlongGrainMm: 2800 });
  assert.equal(woodFinish.kind, 'decor');
  assert.equal(woodFinish.texture, wood.tex);
  assert.equal(woodFinish.tint, false, 'shown WHOLE and unedited — a tint is a recolour');
  assert.equal(woodFinish.scanAlongGrainMm, 2800, 'placed by physical size, not by a repeat length');
  assert.equal(woodFinish.hex, wood.hex, 'the average colour is still carried, for the swatch and the BOM');
});

test('a decor with no scan still renders — our grain, tinted, exactly as in turn 5', () => {
  const bare = normaliseDecor({ id: 'X1', code: 'X1', name: 'X1 Nowhere Oak', hex: '#B59571', category: 'woodgrain' });
  const finish = finishFromDecor(bare);
  assert.equal(finish.texture, DECOR_GRAIN_TEXTURE);
  assert.equal(finish.tint, true, 'the grain is multiplied by the decor colour, not shown grey');
  assert.equal(finish.scanAlongGrainMm, undefined, 'a tile has no physical size');
});

test('a decor WITH a scan still carries the fallback, for a machine with no network', () => {
  // Mock mode must WORK, not warn (CLAUDE.md rule 7). The view drops to this
  // when the download fails, so a workshop with the wifi off sees wood.
  const wood = decors.find((d) => d.category === 'woodgrain');
  const finish = finishFromDecor(wood);
  assert.equal(finish.fallback.texture, DECOR_GRAIN_TEXTURE);
  assert.equal(finish.fallback.tint, true);
  assert.ok(finish.fallback.repeatMm > 0);
});

test('the fallback grain is a real file, and it is ours', () => {
  const file = new URL(`../public/${DECOR_GRAIN_TEXTURE}`, import.meta.url);
  assert.ok(existsSync(file), 'scripts/gen-textures.mjs has not been run');
  // Generated, not downloaded: the script that makes it is in the repo.
  const script = readFileSync(new URL('../scripts/gen-textures.mjs', import.meta.url), 'utf8');
  assert.ok(script.includes('grain-neutral.png'));
});

// ─── which way the grain runs (turn 8, CLAUDE.md F1) ───

test('the grain runs along the piece — the LONGER cut dimension', () => {
  assert.deepEqual(grainRun({ w: 560, h: 600 }), { axis: 'h', lengthMm: 600, acrossMm: 560 });
  assert.deepEqual(grainRun({ w: 1164, h: 540 }), { axis: 'w', lengthMm: 1164, acrossMm: 540 });
  // …unless the piece says otherwise, which is the only thing that beats a saw.
  assert.equal(grainRun({ w: 560, h: 600, cnc: { grain: 'w' } }).axis, 'w');
});

test('a carcass SIDE gets its grain up the panel, not across it', () => {
  // THE BUG (Piotr): "słoje leżą POZIOMO na bokach". A side panel's biggest
  // face is a ±X face, and three gives that face a u along Z and a v along Y —
  // so scaling the texture by the box's x and y put the figure on its side.
  const r = computeCabinet({
    type: 'BUD', width: 600, height: 770, depth: 558, unit_num: '01', doors: { count: 1, hinge: 'L' },
  }, P);
  const side = r.panels.find((p) => p.id === 'BUL');
  const map = decorMapping(side.box, grainRun(side).lengthMm);
  assert.equal(map.grainAxis, 'v', 'the grain is the face s V axis — up the panel');
  assert.equal(map.heightMm, side.box.h, 'and V spans the panel height');
  assert.equal(map.widthMm, side.box.d, 'while U spans the depth');
  // ─── TURN 29 (CLAUDE.md F1) ───
  // WHICH WAY THE PICTURE IS TURNED is not this function's answer any more: it
  // depends on the image, and the app paints two families of wood that run 90°
  // apart. `test/turn29-f1-shelf-grain-scene.test.js` asserts both, on the
  // surface the scene mounts.
  assert.equal(map.rotate, undefined, 'a mapping decides the BOARD, not the picture');
});

test('a top and a bottom get their grain across the piece', () => {
  const r = computeCabinet({
    type: 'BUD', width: 1200, height: 770, depth: 558, unit_num: '01', shelves: 1, doors: { count: 2 },
  }, P);
  for (const id of ['TOP', 'BOTTOM']) {
    const p = r.panels.find((x) => x.id === id);
    const map = decorMapping(p.box, grainRun(p).lengthMm);
    assert.equal(map.grainAxis, 'u', `${id}: a wide flat piece runs its grain along the width`);
  }
  // ─── TURN 28 (CLAUDE.md F7): …AND A SHELF DOES NOT ───────────────────────
  // The saw's rule — the longer of the two cut dimensions — is the FALLBACK,
  // and a shelf is the piece it gets wrong: 1 164 across against 520 deep says
  // "along the width" while the sheet (turn 26 F8) nests it the other way. The
  // piece states its own grain, and the picture follows the sheet.
  const shelf = r.panels.find((x) => x.id === 'SHELF-1');
  assert.equal(shelf.cnc.grain, 'h', 'the shelf says so on the piece');
  const shelfMap = decorMapping(shelf.box, grainRun(shelf).lengthMm);
  // ─── RE-PINNED 17.08.2026 (CLAUDE.md T37-F7b): 'v' → 'u' ─────────────────
  // The owner: *"CNC jest ok, ale wizualizacja nie jest — sprawdź, co ci
  // nadpisuje."* The paragraph above is right that the piece states its own
  // grain and that the picture follows the sheet. What it got wrong is WHICH
  // WAY the sheet runs: `cnc.grain` is written in the CNC DRAWN frame, beside
  // `drawn_w`/`drawn_h`, and a shelf is drawn `depth × width` — so the stated
  // 'h' is the 1 160, the cabinet's WIDTH, not the 520 depth. `grainRun` now
  // translates the axis out of the drawn frame before using it.
  assert.equal(shelf.cnc.drawn_h, shelf.w, 'the drawn h IS the width — the frame the statement is in');
  assert.equal(shelfMap.grainAxis, 'u', 'left to right, running along the banded long front edge');
  // …and the shelf is the OPPOSITE of the wieniec above it, which is the whole
  // of the owner's turn-29 F1: two horizontal boards, two grain directions.
  //
  // RE-PINNED 17.08.2026: they are the SAME now, and that is T37-F7b — both
  // boards are nested with their grain up the page, so both carry their figure
  // left-to-right. The wieniec's own answer below has not moved a character; it
  // is the shelf that came round to it.
  assert.equal(decorMapping(r.panels.find((x) => x.id === 'TOP').box,
    grainRun(r.panels.find((x) => x.id === 'TOP')).lengthMm).grainAxis, 'u');
});

test('a door runs its grain up the door', () => {
  const r = computeCabinet({
    type: 'BUD', width: 600, height: 770, depth: 558, unit_num: '01', doors: { count: 1, hinge: 'L' },
  }, P);
  const door = r.panels.find((p) => p.part === 'FRONT');
  const map = decorMapping(door.box, grainRun(door).lengthMm);
  assert.equal(map.grainAxis, 'v');
  assert.equal(map.heightMm, door.box.h);
});

test('the scan scale is a profile number pushed in, not a literal in the engine', () => {
  setDecorScale(2800);
  setDecorCatalogue({ decors });
  assert.equal(decorFinish('egger:H1180_37').scanAlongGrainMm, 2800);
  setDecorScale(2070);
  assert.equal(decorFinish('egger:H1180_37').scanAlongGrainMm, 2070);
  setDecorScale(P.appearance.decor.scanHeightMm);
});

// ─── choosing one ───

test('a chosen decor is stored as an id, and reads back as a finish', () => {
  setDecorCatalogue({ decors });
  const oak = decorById('H1180_37');
  const id = finishIdForDecor(oak);
  assert.equal(id, 'egger:H1180_37');
  assert.equal(decorIdFromFinishId(id), 'H1180_37');
  assert.equal(decorIdFromFinishId('broken_white'), null, 'a profile finish is not a decor');
  assert.equal(decorIdFromFinishId(null), null);

  const finish = decorFinish(id);
  assert.equal(finish.label, 'EGGER H1180 ST37 Natural Halifax Oak');
  assert.equal(finish.id, id);
});

test('a decor id resolves through the same finishById the profile finishes use', () => {
  setDecorCatalogue({ decors });
  assert.equal(finishById(P, 'egger:H1180_37').label, 'EGGER H1180 ST37 Natural Halifax Oak');
  assert.equal(finishById(P, 'broken_white').label, 'Broken white', 'the shipped finishes still work');
  assert.equal(finishById(P, null), null);
});

test('a project finished in a decor resolves it for the carcass and the fronts', () => {
  setDecorCatalogue({ decors });
  const design = migrateDesign({ finish: { carcass: 'egger:W1000_9', front: 'egger:H1180_37' } });
  const { carcass, front } = resolveFinishes({ params: {} }, design, P);
  assert.equal(carcass.label, 'EGGER W1000 ST9 Premium White');
  assert.equal(front.label, 'EGGER H1180 ST37 Natural Halifax Oak');
  // …and the fronts still default to the carcass when only the carcass is set.
  const carcassOnly = migrateDesign({ finish: { carcass: 'egger:H1180_37', front: null } });
  assert.equal(resolveFinishes({ params: {} }, carcassOnly, P).front.label,
    'EGGER H1180 ST37 Natural Halifax Oak');
});

test('a decor this install does not have falls back instead of rendering nothing', () => {
  setDecorCatalogue({ decors: [] });
  assert.equal(finishById(P, 'egger:H1180_37'), null);
  const design = migrateDesign({ finish: { carcass: 'egger:H1180_37' } });
  const { carcass } = resolveFinishes({ params: {} }, design, P);
  assert.equal(carcass.id, 'broken_white', 'the project opens, in the default finish');
  setDecorCatalogue({ decors });   // put the catalogue back for the tests below
});

// ─── the grid ───

test('the filter is the two categories and a search over code and name', () => {
  assert.equal(filterDecors(decors, {}).length, decors.length);
  assert.ok(filterDecors(decors, { category: 'uni_colour' }).every((d) => d.category === 'uni_colour'));

  const byCode = filterDecors(decors, { query: 'H1180' });
  assert.ok(byCode.some((d) => d.id === 'H1180_37'));
  const byName = filterDecors(decors, { query: 'halifax' });
  assert.ok(byName.some((d) => d.id === 'H1180_37'), 'and the search is case-insensitive');
  assert.deepEqual(filterDecors(decors, { query: 'zzzz' }), []);

  // Both at once: a woodgrain search does not surface a uni colour.
  const both = filterDecors(decors, { category: 'woodgrain', query: 'white' });
  assert.ok(both.every((d) => d.category === 'woodgrain'));
});

test('a broken row is dropped rather than rendered as an empty tile', () => {
  const parsed = parseDecorCatalogue({ decors: [{ id: 'x' }, { code: 'y' }, raw.decors[0]] });
  assert.equal(parsed.decors.length, 1);
  // A missing or malformed colour gets a visible placeholder, not `undefined`.
  assert.equal(normaliseDecor({ id: 'a', code: 'A', hex: 'nope' }).hex, '#CCCCCC');
  assert.equal(normaliseDecor({ id: 'a', code: 'A' }).category, 'woodgrain');
  assert.equal(normaliseDecor({ id: 'a', code: 'A' }).thumb, null, 'no file, no request');
});

test('thumbnail urls are built from the base the app is served under', () => {
  const at = parseDecorCatalogue(raw, { basePath: '/sub/decors/egger/' }).decors[0];
  assert.ok(at.thumb.startsWith('/sub/decors/egger/thumbs/'));
  // …and a SCAN is not, because it is not in public/ at all: it is an absolute
  // Supabase url, and prefixing it would break every one of the 69.
  const wood = parseDecorCatalogue(raw, { basePath: '/sub/decors/egger/' }).decors
    .find((d) => d.category === 'woodgrain');
  assert.match(wood.tex, /^https:\/\//);
});

test('the loader looks in the folder the pack actually lives in', () => {
  // Turn 8 moved the pack from public/decors/ into public/decors/egger/, which
  // is the layout main already carries. A loader pointing at the old flat path
  // is a picker that opens empty.
  assert.equal(DECOR_DIR, 'decors/egger/');
  assert.ok(existsSync(new URL(`../public/${DECOR_DIR}egger-decors.json`, import.meta.url)));
});

// ─── loading ───

test('the loader hands the parsed pack to the engine, and survives a failure', async () => {
  const ok = await loadDecorCatalogue({
    fetchImpl: async () => ({ ok: true, status: 200, statusText: 'OK', json: async () => raw }),
  });
  assert.equal(ok.error, null);
  assert.equal(ok.decors.length, 85);
  assert.equal(decorById('H1180_37')?.code, 'H1180');

  // A second call shares the first — one request, not one per picker.
  const again = await loadDecorCatalogue({ fetchImpl: () => { throw new Error('should not be called'); } });
  assert.equal(again.decors.length, 85);
});
