// ─── TURN 59 · F5 — THE ESTIMATE WITHOUT A PRICE, HONESTLY ─────────────────
//
// CLAUDE.md F5: *"Tests: the document contains every choice and the params
// snapshot; mailto body under 2000 characters (truncate with '…full estimate
// attached'); load restores byte-equal params; the capture path excludes every
// overlay."*
//
// The first three are answered here. The fourth is answered by READING the
// capture path, because the thing being asserted is that a particular code
// path was reused rather than reimplemented — `renderCapture.js` has hidden
// every helper since turn 6, and the retail button's whole merit is that it
// did not write a second one.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { setPersistence } from '../src/stores/persistence.js';

setPersistence('none');

const { useProjectStore } = await import('../src/stores/projectStore.js');
const { parseDecorCatalogue, setDecorCatalogue } = await import('../src/engine/decors.js');
const A = await import('../src/retail/design/adapter.js');
const {
  buildEstimateDocument, describeDesign, designSummaryLine, estimateMailBody,
} = await import('../src/retail/estimate/document.js');
const {
  MAIL_BODY_MAX, TRUNCATION, capBody, mailtoUrl,
} = await import('../src/retail/estimate/mail.js');
const { estimateFilename, imageFilename } = await import('../src/retail/estimate/download.js');
const { PRICE_ON_REQUEST, QUOTE_EMAIL } = await import('../src/retail/config.js');

const ROOT = new URL('../', import.meta.url).pathname;
const S = () => useProjectStore.getState();

const PACK = JSON.parse(readFileSync(join(ROOT, 'public/decors/egger/egger-decors.json'), 'utf8'));
setDecorCatalogue(parseDecorCatalogue(PACK, { basePath: '/decors/egger/' }));

/** A wardrobe with an answer to every question, so the document has to carry them all. */
function designed(name = 'Bedroom wardrobe') {
  const unitId = A.startDesign(name);
  A.setSpace({ wallMm: 3000, ceilingMm: 2500 });
  A.setSlope({ on: true, leftMm: 1400, rightMm: 2500 });
  A.setWardrobeSize(unitId, { width: 2000, depth: 650 });
  A.setDoorCount(unitId, 3);
  A.setFrontStyle('S');
  A.applyCollection('mayfair-green');
  A.setHandle('bar');
  A.setPlinth(unitId, 150);
  A.setLighting(true);
  S().addShelves(unitId, 2);
  S().addHangerRail(unitId, {});
  return { unitId, snapshot: JSON.parse(JSON.stringify({ project: S().project, units: S().units })) };
}

// ─── THE DOCUMENT ──────────────────────────────────────────────────────────

test('F5 · the document carries every choice, in words', () => {
  const { snapshot } = designed();
  const choices = describeDesign(snapshot);
  const labels = choices.map((c) => c.label);
  assert.deepEqual(labels, [
    'The space', 'Wardrobe', 'Doors', 'Front style', 'Front finish', 'Carcass finish',
    'Handles', 'Plinth', 'Interior', 'Lighting',
  ]);
  const by = Object.fromEntries(choices.map((c) => [c.label, c.value]));
  assert.match(by['The space'], /3000 mm wall/);
  assert.match(by['The space'], /sloped from 1400 mm to 2500 mm/);
  assert.match(by.Wardrobe, /2000 mm wide · \d+ mm high · 650 mm deep/);
  // THE DOCUMENT IS BUILT FROM A SNAPSHOT, and a snapshot is all it will have:
  // a client who loads an estimate from a file has designs in it that are not
  // on the stage and cannot be recomputed. So the count comes from the
  // design's own dividers, and `test/turn59-f4-the-options.test.js` is where
  // the engine is asked to agree with them on a wardrobe it can compute.
  assert.equal(by.Doors, '3');
  assert.equal(by['Front style'], 'Shaker');
  assert.match(by['Front finish'], /EGGER U606 ST9 Forest Green/, 'the decor speaks with its attribution');
  assert.match(by['Carcass finish'], /EGGER U702 ST9 Cashmere Grey/);
  assert.equal(by.Handles, 'Bar handles');
  assert.equal(by.Plinth, '150 mm');
  assert.match(by.Interior, /hanging rail/);
  assert.match(by.Interior, /shelves/);
  assert.equal(by.Lighting, 'LED shelf strips');

  // …and the one-line summary a row in the estimate column shows.
  assert.match(designSummaryLine(snapshot), /2000 mm × \d+ mm · 3 doors · Shaker/);
});

test('F5 · a flat wall says so, and an empty wardrobe says so', () => {
  const unitId = A.startDesign('Plain');
  A.setSpace({ wallMm: 1800, ceilingMm: 2400 });
  A.setWardrobeSize(unitId, { width: 900 });
  const by = Object.fromEntries(
    describeDesign({ project: S().project, units: S().units }).map((c) => [c.label, c.value]),
  );
  assert.match(by['The space'], /1800 mm wall, ceiling 2400 mm, level/);
  assert.equal(by.Interior, 'empty');
  assert.equal(by.Lighting, 'none');
  assert.equal(by.Handles, 'None');
});

test('F5 · the document carries the ENGINE\'s params, not a paraphrase of them', () => {
  const { snapshot } = designed();
  const doc = buildEstimateDocument({ designs: [{ name: 'One', snapshot }], isoDate: '2026-08-31' });
  assert.equal(doc.document, 'pbi-estimate');
  assert.equal(doc.date, '2026-08-31');
  assert.equal(doc.price, PRICE_ON_REQUEST);
  assert.equal(doc.designs[0].price, PRICE_ON_REQUEST);

  const shot = doc.designs[0].snapshot;
  assert.equal(shot.units[0].params.width, 2000);
  assert.equal(shot.units[0].params.depth, 650);
  assert.equal(shot.project.wallSlopes[0].startHeight, 1400);
  assert.ok(shot.project.design.fronts.types[0].finish_id, 'the front decor is in the snapshot');
  // The snapshot is the shape `loadProject` takes — project AND units.
  assert.deepEqual(Object.keys(shot).sort(), ['project', 'units']);
});

test('F5.1 · not one number about money, anywhere in the document', () => {
  const { snapshot } = designed();
  const doc = buildEstimateDocument({
    designs: [{ name: 'One', snapshot }],
    details: { name: 'A Client', email: 'a@b.co', phone: '', postcode: 'N1', message: '' },
    isoDate: '2026-08-31',
  });
  const json = JSON.stringify(doc);
  assert.ok(!/[£$€]\s?\d/.test(json), 'a price got into the estimate');
  assert.match(json, /Price on request/);
});

// ─── LOAD ──────────────────────────────────────────────────────────────────

test('F5.3 · LOAD restores every answer, and a second round trip does not drift', () => {
  const { snapshot } = designed();

  // Somebody else's wardrobe, on the stage in the meantime.
  A.startDesign('Something else entirely');
  assert.notEqual(S().units[0].params.width, 2000);

  // …and the saved one, back through the shared store's own loader.
  S().loadProject(snapshot.project, snapshot.units);
  const back = JSON.parse(JSON.stringify({ project: S().project, units: S().units }));

  // EVERY ANSWER, not every byte. `loadProject` is the same door a saved job
  // comes through and it MIGRATES on the way in — this restore gains
  // `shelf_schema: 2`, which is the store telling the truth about a schema
  // rather than a loss. What must not change is anything the client chose.
  assert.equal(back.units[0].params.width, 2000);
  assert.equal(back.units[0].params.depth, 650);
  assert.equal(back.units[0].params.leg_height, 150);
  assert.deepEqual(back.units[0].params.sections, snapshot.units[0].params.sections);
  assert.deepEqual(back.units[0].params.bay_doors, snapshot.units[0].params.bay_doors);
  // The DESIGN comes back through `migrateDesign`, which NORMALISES — a carcass
  // type gains an explicit `source: null`, and a shaker project gains the frame
  // width it was cut at (`legacyShakerFrame`, T34: a job quoted at 70 must not
  // be redrawn by a changed default). Both are the loader telling the truth
  // about a schema rather than losing an answer, so what is asserted is the
  // client's ANSWERS — and, below, that a second round trip adds nothing more.
  assert.equal(back.project.design.fronts.style, snapshot.project.design.fronts.style);
  assert.deepEqual(back.project.design.fronts.handle, snapshot.project.design.fronts.handle);
  assert.equal(back.project.design.fronts.types[0]?.finish_id,
    snapshot.project.design.fronts.types[0]?.finish_id, 'the front decor did not come back');
  assert.equal(back.project.design.carcass.types[0].finish_id,
    snapshot.project.design.carcass.types[0].finish_id, 'the carcass decor did not come back');
  assert.equal(back.project.design.lighting.on, snapshot.project.design.lighting.on);
  assert.deepEqual(back.project.wallSlopes, snapshot.project.wallSlopes, 'the rake did not come back');
  assert.deepEqual(back.project.room, snapshot.project.room, 'the room did not come back');

  // AND THE PROPERTY THAT ACTUALLY MATTERS: a saved estimate that is loaded and
  // saved again is byte-identical to the first reload. An estimate that drifted
  // one key per round trip would be a different wardrobe by the fourth.
  A.startDesign('And again something else');
  S().loadProject(back.project, back.units);
  const twice = JSON.parse(JSON.stringify({ project: S().project, units: S().units }));
  assert.equal(JSON.stringify(twice), JSON.stringify(back), 'the estimate drifts on every round trip');

  // …and the words it comes back with are the words it went in with.
  assert.deepEqual(describeDesign(back), describeDesign(snapshot));
});

// ─── THE MAILTO ────────────────────────────────────────────────────────────

test('F5.2 · the mail body is under 2000 characters, or says why', () => {
  assert.equal(MAIL_BODY_MAX, 2000);

  const { snapshot } = designed();
  const doc = buildEstimateDocument({
    designs: [{ name: 'Bedroom wardrobe', snapshot }],
    details: { name: 'A Client', email: 'a@b.co', phone: '0207', postcode: 'N1 1AA', message: 'Before June please.' },
    isoDate: '2026-08-31',
  });
  const body = estimateMailBody(doc);
  assert.ok(body.length <= MAIL_BODY_MAX, `one design already needs ${body.length} characters`);
  assert.equal(capBody(body), body, 'a body that fits must not be cut');
  assert.match(body, /A Client/);
  assert.match(body, /Price on request/);
  assert.match(body, /3000 mm wall/);

  // A client who designs a whole house. The cut is OURS, at a known length,
  // and it ends in a sentence that says there is a file to look at.
  const many = buildEstimateDocument({
    designs: Array.from({ length: 12 }, (unused, i) => ({ name: `Wardrobe ${i + 1}`, snapshot })),
    details: doc.details,
    isoDate: '2026-08-31',
  });
  const long = estimateMailBody(many);
  assert.ok(long.length > MAIL_BODY_MAX, 'twelve wardrobes should overflow — the test proves nothing otherwise');
  const cut = capBody(long);
  assert.ok(cut.length <= MAIL_BODY_MAX, `the cap let ${cut.length} characters through`);
  assert.ok(cut.endsWith(TRUNCATION), 'a truncated body must say it was truncated');
  assert.equal(TRUNCATION, '…full estimate attached');
  // The client's own name survives the cut — it is at the top for that reason.
  assert.match(cut, /A Client/);
});

test('F5.2 · the mailto goes to the address in config, and encodes its body', () => {
  const url = mailtoUrl({ subject: 'Estimate request — A Client', body: 'one\ntwo & three' });
  assert.ok(url.startsWith(`mailto:${QUOTE_EMAIL}?`), url.slice(0, 60));
  assert.match(url, /subject=Estimate%20request/);
  assert.match(url, /body=one%0Atwo%20%26%20three/);
  assert.ok(!/\s/.test(url), 'a raw space in a mailto is a mailto that breaks');
});

// ─── THE FILES ─────────────────────────────────────────────────────────────

test('F5 · the filenames are predictable, and safe on a filesystem', () => {
  assert.equal(estimateFilename('2026-08-31T09:12:00Z'), 'pbi-estimate-2026-08-31.json');
  assert.equal(imageFilename('Bedroom wardrobe'), 'pbi-bedroom-wardrobe.png');
  assert.equal(imageFilename('  Ivory & Onyx / master  '), 'pbi-ivory-onyx-master.png');
  assert.equal(imageFilename(''), 'pbi-wardrobe.png');
  assert.equal(imageFilename(null), 'pbi-wardrobe.png');
});

// ─── THE IMAGE ─────────────────────────────────────────────────────────────

test('F5.4 · SAVE IMAGE reuses the shared capture, and adds no second rig', () => {
  const stage = readFileSync(join(ROOT, 'src/retail/design/Stage.jsx'), 'utf8');
  // The Petros render law: ONE rig, whatever the panel switches say. It is
  // `engine/render.js renderJob()` and it is the same one PRO's render modal
  // asks for.
  assert.match(stage, /import \{ renderJob \} from '\.\.\/\.\.\/engine\/render\.js';/);
  assert.match(stage, /import \{ savePng \} from '\.\.\/\.\.\/3d\/renderCapture\.js';/);
  assert.match(stage, /handle\.capture\(job\)/, 'the capture must be Scene\'s own');

  // Retail writes no rig of its own: no exposure, no tone mapping, no light
  // scale, no environment intensity anywhere in the retail tree.
  const RIG = /toneMapping|toneMappingExposure|environmentIntensity|lightScale|exposure\s*[:=]/;
  assert.ok(!RIG.test(stage), 'the retail stage is building a lighting rig of its own');

  // And the overlays are excluded because `captureRender` has hidden every
  // helper since turn 6 — the code path, not a second implementation.
  const capture = readFileSync(join(ROOT, 'src/3d/renderCapture.js'), 'utf8');
  assert.match(capture, /if \(object\.visible && isChrome\(object\)\)/);
  assert.match(capture, /object\.visible = false;/);
});

test('F5.3 · ADD ANOTHER WARDROBE keeps the estimate and clears only the stage', async () => {
  const { useEstimateStore } = await import('../src/retail/estimate/store.js');
  const E = () => useEstimateStore.getState();

  designed('First wardrobe');
  E().begin('First wardrobe');
  assert.equal(E().designs.length, 1);
  const firstId = E().activeId;

  E().addDesign((name) => A.startDesign(name), 'Second wardrobe');
  assert.equal(E().designs.length, 2, 'the estimate lost the first wardrobe');
  assert.notEqual(E().activeId, firstId);
  // The stage is a fresh wardrobe; the first one is still in the list.
  assert.equal(E().designs[0].name, 'First wardrobe');
  assert.equal(E().designs[0].snapshot.units[0].params.width, 2000);

  // …and going back to it puts it on the stage again.
  assert.equal(E().select(firstId), true);
  assert.equal(S().units[0].params.width, 2000);

  // A whole estimate, saved and loaded, keeps both.
  const doc = buildEstimateDocument({ designs: E().designs, isoDate: '2026-08-31' });
  assert.equal(doc.designs.length, 2);
  assert.equal(E().loadEstimate(doc), true);
  assert.equal(E().designs.length, 2);
  assert.equal(E().loadEstimate({ designs: [] }), false, 'an empty document must not wipe the estimate');
});
