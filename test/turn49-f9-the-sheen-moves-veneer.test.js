import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { finishById, migrateDesign, roughnessFromSheen } from '../src/engine/design.js';
import {
  VENEER_SOURCE, frontsAreVeneered, isVeneerSource, panelIsVeneered, sourceOfSlot,
} from '../src/lib/veneerSheen.js';
import { getVeneers, veneerFinishId } from '../src/engine/veneers.js';
import { surfaceFor } from '../src/3d/materials.js';

// ─── TURN 49 · F9 — THE SHEEN MOVES VENEER TOO ──────────────────────────────
//
// The owner, 25.08.2026: *"suwak powinien dzialac tylko na spray i veneer, nie
// na laminat — na laminat zostaw jak jest."*
//
// `3d/materials.js` gated the roughness on `sprayed`, which is "does this piece
// go to the SPRAY BOOTH". A veneered piece does not — it is a timber face — but
// it IS lacquered, and the gloss of that lacquer is this number and is ordered
// from the same supplier as the doors'. So a veneer could not answer the slider
// at all, and a real board in the workshop had a picture that never changed.
//
// A laminate keeps what it has. A foil board arrives from the factory with its
// own finish on it and no slider changes that.

const MATS = readFileSync(new URL('../src/3d/materials.js', import.meta.url), 'utf8');
const SLIDER = readFileSync(new URL('../src/components/SheenSlider.jsx', import.meta.url), 'utf8');

const SPRAY = { id: 'spray:test', kind: 'spray', hex: '#F2F0EC' };
const VENEER = finishById(P, veneerFinishId(getVeneers()[0]));
const LAMINATE = finishById(P, 'dark_walnut');

/** One piece, one finish, one sheen — everything else held still. */
const roughnessAt = (finish, sheen) => surfaceFor({
  role: 'front',
  materialRole: 'front',
  finishExposed: false,
  finishes: { carcass: finish, front: finish },
  finish,
  profile: P,
  sheen,
}).roughness;

test('F9 — the three finishes really are three different kinds', () => {
  assert.equal(SPRAY.kind, 'spray');
  assert.ok(VENEER, 'the veneer catalogue answered');
  assert.equal(VENEER.kind, 'veneer');
  assert.ok(LAMINATE, 'the decor catalogue answered');
  assert.equal(LAMINATE.kind, 'decor');
  assert.ok(LAMINATE.texture, 'a laminate is a foil with a picture on it');
});

test('F9 — SPRAY moves, as it always has', () => {
  const matt = roughnessAt(SPRAY, 5);
  const gloss = roughnessAt(SPRAY, 100);
  assert.equal(matt, roughnessFromSheen(5, P));
  assert.equal(gloss, roughnessFromSheen(100, P));
  assert.notEqual(matt, gloss);
});

test('F9 — VENEER moves too, and that is the change', () => {
  const matt = roughnessAt(VENEER, 5);
  const gloss = roughnessAt(VENEER, 100);
  assert.equal(matt, roughnessFromSheen(5, P), 'dead matt lacquer on a timber face');
  assert.equal(gloss, roughnessFromSheen(100, P), 'and full gloss on the same one');
  assert.notEqual(matt, gloss);
  // The surface says so out loud, so a scene or a test can ask rather than
  // infer it from a number.
  const s = surfaceFor({
    role: 'front', materialRole: 'front', finishes: { carcass: VENEER, front: VENEER },
    finish: VENEER, profile: P, sheen: 60,
  });
  assert.equal(s.sheenDriven, true);
  // …and it is NOT called sprayed: a veneer takes no orange peel, no gun
  // metalness and keeps the room's own reflection.
  assert.equal(s.sprayed, false);
  assert.equal(s.metalness, P.appearance.materials.melamine.metalness);
  assert.equal(s.envMapIntensity, 1);
  assert.equal(s.normalScale, 1);
});

test('F9 — LAMINATE does not move: *"na laminat zostaw jak jest"*', () => {
  const matt = roughnessAt(LAMINATE, 5);
  const gloss = roughnessAt(LAMINATE, 100);
  assert.equal(matt, gloss, 'the slider must not reach a foil board');
  assert.equal(matt, P.appearance.materials.melamine.roughness, 'it keeps the board family’s own number');
  const s = surfaceFor({
    role: 'front', materialRole: 'front', finishes: { carcass: LAMINATE, front: LAMINATE },
    finish: LAMINATE, profile: P, sheen: 100,
  });
  assert.equal(s.sheenDriven, false);
  assert.equal(s.sprayed, false);
});

test('F9 — a piece that goes to the booth still answers, whatever it is faced in', () => {
  // `finish_exposed` is the engine's own flag and it is untouched: a door, an
  // end panel, an infill and a plinth are sprayed BECAUSE OF WHERE THEY SIT.
  const s = (sheen) => surfaceFor({
    role: 'end_panel',
    materialRole: 'front',
    finishExposed: true,
    finishes: { carcass: SPRAY, front: SPRAY },
    profile: P,
    sheen,
  });
  assert.notEqual(s(5).roughness, s(100).roughness);
  assert.equal(s(60).sprayed, true);
});

test('F9 — the gate is one named line, and the formula did not move', () => {
  assert.match(MATS, /const veneer = veneered \|\| \(!isDecor && finish\?\.kind === 'veneer'\);/);
  assert.match(MATS, /const sheenDriven = sprayed \|\| veneer;/);
  assert.match(MATS, /veneered = false,/, 'and the caller may say so for a front');
  assert.match(MATS, /roughness: sheenDriven && sheen != null \? roughnessFromSheen\(sheen, profile\) : pbr\.roughness/);
  // Only the ROUGHNESS widened. The three things `sprayed` decides — the probe,
  // the metalness and the gun's orange peel — still ask `sprayed`.
  assert.match(MATS, /metalness: sprayed \?/);
  assert.match(MATS, /envMapIntensity: sprayed \?/);
  assert.match(MATS, /normalScale: sprayed \?/);
});

// ══ the front's own veneer, which the finish alone cannot name ═════════════

test('F9 — a VENEERED FRONT answers the slider, even though it is stored as a decor', () => {
  // Turn 20 F12.3: *"a FRONT's veneer picks from the 85-decor catalogue"* — it
  // borrows an EGGER scan because a veneer has no picture of its own — so a
  // veneered door and a laminate door faced in the same decor are the SAME
  // finish object. Gate the slider on the finish alone and the commonest veneer
  // in the shop goes on ignoring it.
  const veneeredFront = migrateDesign({
    fronts: { types: [{ id: 'f1', label: 'Front 1', source: 'veneer', finish_id: 'dark_walnut' }] },
  });
  const laminateFront = migrateDesign({
    fronts: { types: [{ id: 'f1', label: 'Front 1', source: 'laminate', finish_id: 'dark_walnut' }] },
  });
  const door = { id: '01-F', role: 'front', material_role: 'front', finish_exposed: false };

  assert.equal(panelIsVeneered(door, null, veneeredFront), true);
  assert.equal(panelIsVeneered(door, null, laminateFront), false, 'a laminate is not a veneer');

  const rough = (design, sheen) => surfaceFor({
    role: 'front',
    materialRole: 'front',
    finishes: { carcass: LAMINATE, front: LAMINATE },
    finish: LAMINATE,
    profile: P,
    sheen,
    veneered: panelIsVeneered(door, null, design),
  }).roughness;
  assert.notEqual(rough(veneeredFront, 5), rough(veneeredFront, 100), 'the veneered door moves');
  assert.equal(rough(laminateFront, 5), rough(laminateFront, 100), '…and the laminate one does not');
});

test('F9 — an END PANEL and an INFILL follow the doors, because the ENGINE routes them', () => {
  // `materialSlotOf` is the engine's own answer to "which type does this piece
  // wear", and it says `front` for a door, an end panel and an infill alike.
  // So a veneered job's end panel is a veneer too — which is the bug turn 8
  // fixed for the COLOUR and this is the same routing for the gloss.
  const veneered = migrateDesign({
    fronts: { types: [{ id: 'f1', label: 'Front 1', source: 'veneer' }] },
    carcass: { types: [{ id: 'c1', label: 'Carcass 1', source: 'egger' }] },
  });
  for (const role of ['front', 'end_panel', 'infill']) {
    const panel = { id: `01-${role}`, role, material_role: 'front' };
    assert.equal(panelIsVeneered(panel, null, veneered), true, role);
  }
  // …and a carcass side of the same job is NOT, because its own type is Egger.
  assert.equal(panelIsVeneered({ id: '01-SL', role: 'side', material_role: 'board' }, null, veneered), false);
  // The cornice is bought moulding with no role at all, and it is finished with
  // the doors — so it asks the fronts as a whole.
  assert.equal(frontsAreVeneered(veneered), true);
  assert.equal(frontsAreVeneered(migrateDesign({})), false);
  assert.equal(frontsAreVeneered(null), false, 'no design is not a veneer');
});

test('F9 — the reader names the source once, and an unanswered slot is not a veneer', () => {
  assert.equal(VENEER_SOURCE, 'veneer');
  assert.equal(isVeneerSource('veneer'), true);
  assert.equal(isVeneerSource('laminate'), false);
  assert.equal(isVeneerSource(null), false, 'nobody said is not a yes');
  assert.equal(isVeneerSource(undefined), false);

  const design = migrateDesign({
    carcass: { types: [{ id: 'c1', label: 'Carcass 1', source: 'veneer' }] },
    fronts: { types: [{ id: 'f1', label: 'Front 1', source: 'spray' }] },
  });
  assert.equal(sourceOfSlot(design, { kind: 'carcass', typeId: 'c1' }), 'veneer');
  assert.equal(sourceOfSlot(design, { kind: 'front', typeId: 'f1' }), 'spray');
  // A run piece on its own board, or an override from an older project: the
  // slot names no type, so there is nothing to read and it is not a veneer.
  assert.equal(sourceOfSlot(design, { kind: 'run', typeId: null }), null);
  assert.equal(sourceOfSlot(design, null), null);
  assert.equal(sourceOfSlot(null, { kind: 'front', typeId: 'f1' }), null);
});

test('F9 — the three surfaces that draw a panel all ask, and none of them guesses', () => {
  for (const f of ['src/3d/UnitView.jsx', 'src/components/PartDetailModal.jsx', 'src/components/CabinetEditorModal.jsx']) {
    const text = readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
    assert.match(text, /veneered: design \? panelIsVeneered\(/, f);
    assert.match(text, /from '\.\.\/lib\/veneerSheen\.js'/, `${f} imports the reader`);
  }
  // …and the cornice, which is not a panel, asks the fronts.
  const view = readFileSync(new URL('../src/3d/UnitView.jsx', import.meta.url), 'utf8');
  assert.match(view, /veneered: frontsAreVeneered\(design\)/);
});

test('F9 — and the slider says what it does', () => {
  assert.match(SLIDER, /Sprayed and veneered surfaces/);
  assert.match(SLIDER, /A laminate keeps the finish it came with/);
  assert.match(SLIDER, /data-sheen-scope="1"/);
});
