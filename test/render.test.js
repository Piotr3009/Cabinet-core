// ─── Render configuration (turn 6, CLAUDE.md F2 / BACKLOG #37) ───
//
// A render is expensive to check by eye: a 4K PNG takes a second to make and a
// human to judge. What CAN be checked is the arithmetic behind it — the pixel
// size, where the camera ends up, and what the file is called — and that is
// exactly the part that goes wrong quietly. A camera that frames the subject
// from too close crops it; one that frames from too far makes the render look
// like a photo of a doll's house; neither throws.

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import {
  CAMERA_PRESETS, cameraPreset, framedCamera, lensFov, renderFilename, renderJob,
  renderSize, resolutionById, shadowQuality, slug, subjectBounds,
} from '../src/engine/render.js';

// ─── resolution ───

test('the longer side is what the preset fixes; the shorter follows the view', () => {
  // 16:9 landscape — the case everybody has.
  assert.deepEqual(renderSize(3840, 16 / 9), { width: 3840, height: 2160 });
  assert.deepEqual(renderSize(1920, 16 / 9), { width: 1920, height: 1080 });

  // A tall window: 3840 is still the LONGER side, so it goes on height.
  assert.deepEqual(renderSize(3840, 0.5), { width: 1920, height: 3840 });

  // Square-ish, and a genuinely square one.
  assert.deepEqual(renderSize(2000, 1), { width: 2000, height: 2000 });
});

test('a render size is always even and always sane', () => {
  for (const aspect of [16 / 9, 4 / 3, 1, 0.62, 2.4, 3.11]) {
    for (const long of [1920, 3840, 777]) {
      const { width, height } = renderSize(long, aspect);
      assert.equal(width % 2, 0, `${long}@${aspect} width`);
      assert.equal(height % 2, 0, `${long}@${aspect} height`);
      assert.equal(Math.max(width, height), long % 2 ? long + 1 : long, 'the longer side is the preset');
    }
  }
  // Nonsense in, a picture out rather than a crash: a zero aspect falls back.
  const { width, height } = renderSize(1920, 0);
  assert.ok(width > 0 && height > 0);
});

test('the profile ships a 1080p preview and a 4K, and 4K means 3840', () => {
  const ids = P.render.resolutions.map((r) => r.id);
  assert.deepEqual(ids, ['preview', '4k']);
  assert.equal(resolutionById('4k', P).long, 3840, 'CLAUDE.md F2: 3840 px on the longer side');
  assert.equal(resolutionById('preview', P).long, 1920);
  assert.equal(resolutionById('nonsense', P).id, 'preview', 'an unknown id falls back, it does not crash');
});

// ─── lens ───

test('the presets are shot on a 35 mm lens, not a CAD viewport', () => {
  const fov = lensFov(P.render.focalMm, P.render.sensorHeightMm);
  // 2·atan(24 / 70) = 37.85°
  assert.ok(Math.abs(fov - 37.85) < 0.05, `35 mm on full frame is 37.8° vertical, got ${fov}`);
  // A wide-angle lens bulges a kitchen; a long one flattens it. This is the
  // band an interior photograph lives in.
  assert.ok(fov > 30 && fov < 45);
  assert.equal(lensFov(0, 24), 45, 'a nonsense lens falls back rather than dividing by zero');
});

// ─── framing ───

const box = (w, h, d) => ({ min: [-w / 2, 0, -d / 2], max: [w / 2, h, d / 2] });

/**
 * Where each of the eight corners lands on the film, as a fraction of the
 * half-frame: ≤ 1 is in shot, > 1 is cropped. This is the actual acceptance
 * test for a framing — "is all of it in the picture, and does it fill it".
 */
function framing({ bounds, cam, aspect, fov }) {
  const dir = [0, 1, 2].map((i) => cam.position[i] - cam.target[i]);
  const len = Math.hypot(...dir);
  const f = dir.map((v) => v / len);
  const worldUp = Math.abs(f[1]) > 0.999 ? [0, 0, -1] : [0, 1, 0];
  const cr = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = (v) => { const l = Math.hypot(...v); return v.map((x) => x / l); };
  const right = norm(cr(worldUp, f));
  const up = norm(cr(f, right));
  const tanV = Math.tan((fov * Math.PI) / 360);
  const tanH = tanV * aspect;

  let worstX = 0;
  let worstY = 0;
  for (const sx of [0, 1]) {
    for (const sy of [0, 1]) {
      for (const sz of [0, 1]) {
        const v = [
          (sx ? bounds.max[0] : bounds.min[0]) - cam.target[0],
          (sy ? bounds.max[1] : bounds.min[1]) - cam.target[1],
          (sz ? bounds.max[2] : bounds.min[2]) - cam.target[2],
        ];
        const depth = len - (v[0] * f[0] + v[1] * f[1] + v[2] * f[2]);
        const x = Math.abs(v[0] * right[0] + v[1] * right[1] + v[2] * right[2]) / (depth * tanH);
        const y = Math.abs(v[0] * up[0] + v[1] * up[1] + v[2] * up[2]) / (depth * tanV);
        worstX = Math.max(worstX, x);
        worstY = Math.max(worstY, y);
      }
    }
  }
  return { worstX, worstY, fill: Math.max(worstX, worstY) };
}

test('every preset stands the camera outside the subject and looks at it', () => {
  const bounds = box(3.6, 2.2, 0.6);          // a run of kitchen units, in metres
  const centre = [0, 1.1, 0];
  const radius = 0.5 * Math.hypot(3.6, 2.2, 0.6);

  for (const preset of CAMERA_PRESETS) {
    const cam = framedCamera({ bounds, preset: preset.id, aspect: 16 / 9, fov: 37.85 });
    assert.deepEqual(cam.target.map((v) => Math.round(v * 1e6) / 1e6), centre, `${preset.id} looks at the centre`);
    assert.ok(cam.distance > radius, `${preset.id} stands outside the subject's own sphere`);
    // …and not in the next postcode: a subject this size photographed from
    // 30 m is a render of a floor.
    assert.ok(cam.distance < radius * 6, `${preset.id} is ${cam.distance} away — too far`);
  }
});

test('the whole subject fits in frame, in both directions and at any aspect', () => {
  const bounds = box(4.2, 2.4, 0.62);
  const fov = 37.85;

  for (const preset of ['front', 'iso-left', 'iso-right', 'top']) {
    for (const aspect of [16 / 9, 4 / 3, 1, 0.5625]) {
      const cam = framedCamera({ bounds, preset, aspect, fov, margin: 1 });
      const { worstX, worstY } = framing({ bounds, cam, aspect, fov });
      // A portrait render is limited by the HORIZONTAL, which is the case that
      // silently crops a wide kitchen if only the vertical is checked.
      assert.ok(worstX <= 1 + 1e-9, `${preset} crops sideways at aspect ${aspect} (${worstX})`);
      assert.ok(worstY <= 1 + 1e-9, `${preset} crops top or bottom at aspect ${aspect} (${worstY})`);
    }
  }
});

test('the subject FILLS the frame — a render is not a cabinet in a car park', () => {
  // The bug this pins: fitting the bounding SPHERE instead of the corners.
  // A run of kitchen units is 1.8 m wide, 0.9 m tall and 0.6 m deep; its sphere
  // is twice as tall as the furniture, so a sphere fit leaves the cabinets
  // occupying a third of the frame with a lot of empty floor around them.
  const bounds = { min: [0, 0, 0], max: [1.8, 0.87, 0.56] };
  const fov = 37.85;
  for (const preset of ['front', 'iso-left', 'iso-right']) {
    const cam = framedCamera({ bounds, preset, aspect: 16 / 9, fov, margin: 1.1 });
    const { fill } = framing({ bounds, cam, aspect: 16 / 9, fov });
    assert.ok(fill > 0.85, `${preset} fills only ${(fill * 100).toFixed(0)} % of the frame`);
    assert.ok(fill <= 1, `${preset} overflows the frame (${fill})`);
  }
});

test('swinging round the subject does not change how big it is in frame', () => {
  // Two renders of one project must not read as two projects. The corner fit
  // gives this for free on the presets that matter: 3/4 left and 3/4 right are
  // mirror images and a box is symmetric.
  const bounds = box(3, 2.15, 0.6);
  const left = framedCamera({ bounds, preset: 'iso-left', aspect: 16 / 9, fov: 38 });
  const right = framedCamera({ bounds, preset: 'iso-right', aspect: 16 / 9, fov: 38 });
  assert.ok(Math.abs(left.distance - right.distance) < 1e-9);
  // …and they really are on opposite sides.
  assert.ok(left.position[0] < left.target[0]);
  assert.ok(right.position[0] > right.target[0]);
});

test('front looks along the room, top looks down it', () => {
  const bounds = box(2, 2, 0.6);
  const front = framedCamera({ bounds, preset: 'front', aspect: 16 / 9, fov: 38 });
  const top = framedCamera({ bounds, preset: 'top', aspect: 16 / 9, fov: 38 });

  // Front: mostly +Z, barely above the subject.
  assert.ok(front.position[2] > front.target[2]);
  assert.ok(Math.abs(front.position[0] - front.target[0]) < 1e-6, 'front is straight on, not off to a side');
  assert.ok(front.position[1] - front.target[1] < front.distance * 0.2, 'front is a touch above, not a bird');

  // Top: nearly straight down.
  assert.ok(top.position[1] - top.target[1] > top.distance * 0.9);
});

test('an unknown preset is the first one, not a crash', () => {
  assert.equal(cameraPreset('who-knows').id, 'current');
  assert.equal(cameraPreset('top').id, 'top');
  // 'current' still frames — the caller ignores the numbers and uses the live
  // camera, and a preset returning null would put a check in every caller.
  const cam = framedCamera({ bounds: box(1, 1, 1), preset: 'current' });
  assert.ok(Number.isFinite(cam.distance));
});

// ─── subject bounds ───

test('the subject is every unit plus the floor under them', () => {
  const b = subjectBounds([
    { min: [0, 0.1, 0], max: [0.6, 0.87, 0.56] },
    { min: [0.6, 0.1, 0], max: [1.8, 0.87, 0.56] },
  ]);
  assert.deepEqual(b.min, [0, 0, 0], 'the floor is in the picture — furniture never floats in a void');
  assert.deepEqual(b.max, [1.8, 0.87, 0.56]);

  // Nothing placed yet: a box the camera can still be pointed at.
  const empty = subjectBounds([]);
  assert.ok(empty.max[1] > empty.min[1]);
});

// ─── shadows ───

test('high shadows really are the expensive ones, and normal is what the editor runs', () => {
  const normal = shadowQuality('normal', P);
  const high = shadowQuality('high', P);
  assert.ok(high.mapSize > normal.mapSize * 2, 'otherwise "high" is a label, not a setting');
  assert.ok(high.radius > normal.radius, 'and softer with it');
  assert.equal(P.render.defaultShadows, 'normal', 'the working view never pays the render price');
  assert.equal(shadowQuality('nope', P).mapSize, normal.mapSize);
});

// ─── the file ───

test('a render is named {project}-{unit|scene}-{date}.png', () => {
  const date = new Date(2026, 7, 7);       // 07.08.2026
  assert.equal(
    renderFilename({ project: 'Hampstead kitchen', subject: 'W01', date }),
    'hampstead-kitchen-w01-2026-08-07.png',
  );
  assert.equal(
    renderFilename({ project: 'Hampstead kitchen', subject: 'scene', date }),
    'hampstead-kitchen-scene-2026-08-07.png',
  );
  // A project nobody named, and one named in a way a filesystem hates.
  assert.equal(renderFilename({ project: '', subject: '', date }), 'project-scene-2026-08-07.png');
  assert.equal(
    renderFilename({ project: 'Ostrów / Łódź "flat" #3', subject: 'W01', date }),
    'ostrow-lodz-flat-3-w01-2026-08-07.png',
  );
});

test('slug never returns an empty string', () => {
  assert.equal(slug('', 'fallback'), 'fallback');
  assert.equal(slug('———'), 'project');
  assert.equal(slug(null, 'scene'), 'scene');
});

// ─── the job ───

test('renderJob turns four choices into everything the 3D layer needs', () => {
  const job = renderJob({
    resolution: '4k',
    preset: 'iso-left',
    shadows: 'high',
    aspect: 16 / 9,
    bounds: box(3.6, 2.2, 0.6),
    project: 'Test kitchen',
    subject: 'W01',
    date: new Date(2026, 7, 7),
  }, P);

  assert.equal(job.width, 3840);
  assert.equal(job.height, 2160);
  assert.equal(job.useLiveCamera, false);
  assert.equal(job.shadows.mapSize, P.render.shadow.high.mapSize);
  assert.equal(job.exposure, P.render.exposure);
  assert.equal(job.ao, P.appearance.bevel.ao.render);
  assert.ok(job.ao > P.appearance.bevel.ao.strength, 'the render darkens the joints harder than the editor');
  assert.equal(job.environmentIntensity, P.appearance.environment.renderIntensity);
  assert.equal(job.filename, 'test-kitchen-w01-2026-08-07.png');

  // The camera is framed on the IMAGE aspect, not the screen's — a 4K render
  // of a square window is still 3840 × 2160 and must be framed as such.
  assert.ok(Math.abs(job.aspect - 3840 / 2160) < 1e-9);
});

test('"current view" means the live camera, and says so', () => {
  const job = renderJob({ preset: 'current', bounds: box(2, 2, 0.6) }, P);
  assert.equal(job.useLiveCamera, true);
});

// ─── the working view is not allowed to get expensive ───

test('the still is lit by the SAME rig the editor is showing (turn 8, F1)', () => {
  // Turn 7 lit the editor one way and the render another, and rebalanced the
  // lights in the capture pass to get from one to the other. Piotr's report is
  // what ends that: a joiner who cannot judge the picture from the screen he is
  // working on has to render to find out what he built.
  //
  // So there is one rig, and `lightScale` — which still exists, for a workshop
  // that wants a punchier still — has nothing to say by default.
  const L = P.render.lightScale;
  for (const [role, scale] of Object.entries(L)) {
    assert.equal(scale, 1, `${role} is rebalanced ×${scale} — the render would not match the view`);
  }
  assert.equal(P.render.exposure, P.appearance.studio.exposure,
    'and the still is exposed exactly as the working view is');
});

test('the studio rig is a key light that can actually model something', () => {
  // The whole of Piotr's verdict on turn 7 — "no shadow, no depth, white runs
  // into white" — is this ratio. Turn 7 ran ambient 1.25 against key 0.85: a
  // key light weaker than the flat light it has to beat lights everything and
  // shapes nothing.
  const S = P.appearance.studio;
  assert.ok(S.key > S.ambient * 3, `key ${S.key} against ambient ${S.ambient} cannot cast a readable shadow`);
  assert.ok(S.fill > 0 && S.fill < S.key, 'the fill models the shadow side without erasing the shadow');
  assert.ok(S.rim > 0, 'and the rim is what separates a white cabinet from a white wall');
  assert.ok(S.shadowPadding > 0, 'the shadow camera is fitted to the furniture, with a margin');
});

test('the editor keeps the cheap settings; the render is where the cost is', () => {
  const A = P.appearance;
  assert.ok(A.bevel.ao.strength < A.bevel.ao.render, 'cavity darkening: cheap now, strong in a render');
  // The ENVIRONMENT is no longer one of them (turn 8, F1). Turn 6 turned the
  // probe up for a still because the working view ran flat and untone-mapped
  // and needed the still to make up for it; the working view is tone-mapped
  // now, and a probe turned up on top of the studio key washes out the
  // modelling the key exists to put in. One rig means one probe.
  assert.equal(A.environment.intensity, A.environment.renderIntensity);
  assert.ok(A.bevel.mm >= 0.5 && A.bevel.mm <= 1, 'CLAUDE.md F2: a 0.5–1 mm edge break');
  // Melamine and lacquer must be different ENOUGH to tell apart by eye — that
  // is the acceptance test in CLAUDE.md, expressed as the numbers behind it.
  assert.ok(A.materials.melamine.roughness - A.materials.lacquer.roughness > 0.15);
  assert.equal(A.materials.melamine.clearcoat, 0, 'a melamine board has no clear coat over it');
  assert.ok(A.materials.lacquer.clearcoat > 0.2, 'a sprayed front does');
});
