// ─── T78 · F10 · THE 40 MM CORNER STRIP AND THE BLANK ARE THE KIT'S OWN PARTS ─
//
// The owner, 11.10.2026: *"slepy naroznik powinien miec panel i listwe 40 mm
// narozinkowa zeby odsunac jedna szafke od drugiej, pusta szafka nic nie
// daje"*; *"listwa narozinkowa musi miec 40 mm bo jak beda raczki to sie nie
// otworza."*  CLAUDE.md T78 F10: profile.corner.postMm = 40 (the owner's
// number); the post and the blind blank are PARTS OF THE BLIND KIT: placed
// alone, its cut list carries BLANK and CORNER-POST at once; the post stands
// in the front plane of the ADJACENT run at the corner, flat; a second run
// landing on the stop changes nothing about them, pulling it away removes
// nothing; the corner stop stays d_A_face + 40; clearance.corner stays 3.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { cornerSpec, cornerStopMm, cornerFaceMm } from '../src/engine/corners.js';
import { buildRuns, runEnd, unitVerticals } from '../src/engine/runs.js';
import { rectCorners, roomWalls } from '../src/engine/room.js';
import { useProjectStore } from '../src/stores/projectStore.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const S = () => useProjectStore.getState();
const U = (id) => S().units.find((u) => u.id === id);
const near = (a, b, tol = 0.01) => Math.abs(a - b) <= tol;

test('F10 · the numbers: the post is 40, the owner\'s, decided; the corner clearance stays 3; the stop is face + 40', () => {
  assert.equal(P.corner.postMm, 40);
  assert.match(read('src/engine/profile.js'), /postMm: 40,\s*\/\/ owner 11\.10\.2026, decided/);
  assert.equal(P.doors.clearance.corner, 3);
  assert.equal(cornerSpec(P).postMm, 40);
  const bud = { type: 'BUD', params: defaultParamsFor('BUD', P) };
  assert.equal(cornerStopMm(bud, P), cornerFaceMm(bud, P) + 40);
});

test('F10 · a blind base ALONE cuts its blank and its 40 mm strip at once: front material, 40 x front_t, plinth line to the top, flat', () => {
  for (const [type, H] of [['BLIND_BASE', null], ['BLIND_WALL', null], ['BLIND_WARDROBE', null]]) {
    const p = { ...defaultParamsFor(type, P), unit_num: 'BB01', doors: true };
    const r = computeCabinet(p, P);
    const blank = r.panels.find((x) => x.role === 'blind_blank');
    const post = r.panels.find((x) => x.part === 'CORNER-POST');
    assert.ok(blank, `${type}: no blank`);
    assert.ok(post, `${type}: no strip`);
    assert.equal(post.id, 'BB01-POST');
    assert.equal(post.role, 'corner_post');
    assert.equal(post.material_role, 'front');
    assert.equal(post.w, 40);
    assert.equal(post.h, p.height, 'plinth line to the unit top');
    assert.equal(post.thickness, P.front.thickness);
    assert.equal(post.box.w, P.front.thickness, 'flat: its thickness along x, no return');
    assert.equal(post.box.d, 40);
    assert.equal(post.box.y, 0);
    const faceOwn = p.depth + P.doors.gap + P.front.thickness;
    assert.ok(near(post.box.z, faceOwn), `${type}: the strip starts at this unit's face plane ${faceOwn}, not ${post.box.z}`);
    // Alone, it stands in the family's own face plane less the wall clearance (the store refines it from the neighbour).
    const at = faceOwn - P.room.wallBackClearance;
    assert.ok(near(post.meta.at_mm, at));
    assert.ok(near(post.box.x, at - P.front.thickness), 'left blind side: the strip faces the unit');
    assert.deepEqual([post.meta.kit, post.meta.corner, post.meta.readiness], ['blind', 'post', 'geometry']);
    // The blank is 10 narrower than T75's: the stop moved with the post.
    assert.ok(near(blank.w, p.depth + P.front.thickness + 40 + P.doors.clearance.corner));
    // Right blind side: the mirror.
    const rr = computeCabinet({ ...p, blind_side: 'right' }, P);
    const pr = rr.panels.find((x) => x.part === 'CORNER-POST');
    assert.ok(near(pr.box.x, p.width - at));
    void H;
  }
});

test('F10 · the whole road: the second run stops at the strip, carries the stop record and no board; the strip moves to the neighbour\'s face plane; pulled away, the strip stays', () => {
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  S().addUnit('BLIND_BASE');
  const a = S().units[0].id;
  S().moveUnit(a, 4000, 0);
  S().addDoors(a);
  const alone = S().unitResult(a);
  assert.ok(alone.panels.find((x) => x.part === 'CORNER-POST'), 'the strip is there before any neighbour');
  assert.equal(U(a).params.corner_post_at_mm, undefined);
  S().addUnit('BUD');
  const b = S().units[1].id;
  S().setUnitWall(b, 1);
  S().addDoors(b);
  S().moveUnit(b, 0, 0);
  // The stop: A's face plus the owner's 40.
  const faceA = 10 + U(a).params.depth + P.doors.gap + U(a).params.front_t;
  assert.equal(U(b).position.x_mm, faceA + 40, 'B stopped on A\'s face plus the 40 strip');
  // B carries the STOP RECORD, not a post; the engine cuts B no post.
  assert.equal(U(b).params.corner_butt_left_mm, 40);
  assert.equal(U(b).params.corner_post_left_mm, undefined);
  assert.equal(S().unitResult(b).panels.filter((x) => x.role === 'corner_post').length, 0, 'the strip is the blind kit\'s, not B\'s');
  // The blind kit's strip now stands in B's face plane: B's face less A's gap to the wall.
  const gapA = 4000 - (U(a).position.x_mm + U(a).params.width);
  // B's face plane from wall B: the wall clearance, its depth, the gap, its front (as `cornerFaceMm` measures it).
  const faceB = P.room.wallBackClearance + U(b).params.depth + P.doors.gap + U(b).params.front_t;
  assert.ok(near(U(a).params.corner_post_at_mm, faceB - gapA));
  const withB = S().unitResult(a);
  const post = withB.panels.find((x) => x.part === 'CORNER-POST');
  assert.ok(near(post.meta.at_mm, faceB - gapA));
  assert.ok(near(post.box.x, U(a).params.width - (faceB - gapA)), 'right blind side: measured from the blind end');
  assert.equal(withB.panels.filter((x) => x.part === 'CORNER-POST').length, 1, 'one strip, not two');
  // B's run ends on the strip (not open, not a wall), and B's door sees a rigid neighbour there.
  const walls = roomWalls(S().project.room);
  const run = buildRuns(S().units, P).find((r) => r.units.some((u) => u.id === b));
  const end = runEnd(run, 'left', { wallWidth: walls.find((w) => w.index === 1).width, roomHeight: 2500 }, P);
  assert.equal(end.kind, 'corner');
  assert.ok(near(end.x, U(b).position.x_mm - 40));
  const vert = unitVerticals(S().units, P).filter((v) => v.unitId === b && v.kind === 'corner-post');
  assert.equal(vert.length, 1);
  assert.ok(near(vert[0].to - vert[0].from, 40));
  // The checks: the corner is answered (no #27) and the clearance family has no red for B's door at the strip.
  assert.equal(S().runChecks().filter((f) => f.check === 27).length, 0);
  // Pulled away: the stop record goes, the strip STAYS (it is the kit's), back in the family's own plane.
  S().moveUnit(b, 1200, 0);
  assert.equal(U(b).params.corner_butt_left_mm, undefined);
  assert.equal(U(a).params.corner_post_at_mm, undefined);
  const gone = S().unitResult(a);
  assert.ok(gone.panels.find((x) => x.part === 'CORNER-POST'), 'pulling the neighbour away removes nothing of the kit');
  // Back: the record returns, nothing else changes.
  S().moveUnit(b, 0, 0);
  assert.equal(U(b).params.corner_butt_left_mm, 40);
});

test('F10 · a PLAIN corner keeps the neighbour\'s auto post, 40 now', () => {
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  S().addUnit('BUD');
  const a = S().units[0].id;
  S().moveUnit(a, 4000, 0);
  S().addDoors(a);
  S().addUnit('BUD');
  const b = S().units[1].id;
  S().setUnitWall(b, 1);
  S().addDoors(b);
  S().moveUnit(b, 0, 0);
  assert.equal(U(b).params.corner_post_left_mm, 40);
  assert.equal(U(b).params.corner_butt_left_mm, undefined);
  const post = S().unitResult(b).panels.find((x) => x.role === 'corner_post');
  assert.equal(post.w, 40);
  assert.equal(post.id, 'CORNER-POST-L');
});

test('F10 · the goldens and fixtures re-pinned, knowingly, and named by the classifier fragment', () => {
  const frag = read('scripts/t78-classify.d/f10.mjs');
  for (const f of ['golden-blind-base.json', 'golden-blind-wall.json', 'golden-blind-wardrobe.json', 't75-corner-kitchen.json', 't75-wardrobe-corner.json']) {
    assert.ok(frag.includes(`fixtures/${f}`), `${f} is named as re-pinned`);

  }
  const g = JSON.parse(read('fixtures/golden-blind-base.json'));
  assert.ok(JSON.stringify(g.expected).includes('-POST'), 'the blind golden carries the kit\'s strip');
});
