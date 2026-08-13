// ─── Turn 29, the acceptance walk, in a real Chromium ───────────────────────
//
// Run:  npm run build
//       npx vite preview --port 4173 &
//       node scripts/e2e-turn29.mjs
//
// The fixture server (R8) is started by this script; the app preview is not,
// because a walk that builds its own app cannot prove the build somebody else
// is about to ship.
//
// ─── WHY THIS WALK IS WRITTEN THE WAY IT IS ─────────────────────────────────
//
// Two of turn 28's phases passed their tests and failed the owner's eye, and
// both failed the same way: the test asserted a FLAG on the way to the picture
// instead of the picture. CLAUDE.md's instruction for this turn is explicit —
// assert the SURFACE — so every phase below reads the thing itself:
//
//   F1  the MOUNTED material of a shelf's top face: its texture's own UV
//       matrix, the geometry's own UVs, and the IMAGE's own pixels, measured
//       here in the browser. The grain direction comes out in millimetres of
//       cabinet and owes nothing to any flag in the app.
//   F2  the LABELS the scene mounted, read as strings off the sprites the one
//       dimension component drew, and counted for a run.
//   F3  the same BUTTONS a joiner presses, clicked with a real mouse (R1), and
//       the cut list, the sheet and the BOM read after each press.
//   F4  the mounted sprite's own height in the room, against turn 25's.
//   F5  the two hinge members' world positions, off the scene graph, at three
//       angles on both hands.
//
// ─── R1: A POINTER GESTURE IS PROVEN WITH A REAL POINTER ────────────────────
//
// Every click and keystroke goes through `Input.dispatchMouseEvent` /
// `dispatchKeyEvent` (scripts/cdp.mjs). Synthetic DOM events are BANNED, and
// the ban is enforced rather than promised — the guard below reads this file
// and refuses to run if anybody adds one.
//
// ─── R2 / R5 / R6 / R8 ──────────────────────────────────────────────────────
//
// The bucket is asked live and first; the console is captured whole and any
// uncaught error fails the step it appeared in; GLB-dependent steps run on the
// silent showroom.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { launch } from './cdp.mjs';
import { checkLiveBucket } from './bucket-live.mjs';
import { startFixtureServer } from './fixture-server.mjs';

const BASE = process.env.E2E_URL || 'http://127.0.0.1:4173/';
const args = process.argv.slice(2);
const argOf = (name, fallback = null) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const OUT = argOf('--out', new URL('../verify/t29/', import.meta.url).pathname);

// R1's guard, and it is a guard rather than a promise.
const BANNED = ['dispatch', 'Event('].join('');
const SELF = readFileSync(new URL(import.meta.url), 'utf8');
if (SELF.includes(`.${BANNED}`)) {
  throw new Error(`R1: a pointer gesture in this walk is using ${BANNED}. Use CDP input.`);
}

const steps = [];
const P = 'window.__cc';

// A favicon nobody asked for is not a React exception. Neither is the storage
// host refusing to answer: that is R2's blocker, recorded above in
// `bucket-live.json` and in `walk.json`, and it is the very condition F1 is
// about — a machine that cannot reach the bucket paints our own grain instead,
// and rule 7 says that must WORK. Everything else fails the step it appears in.
const IGNORED = [/favicon\.ico/i, /supabase\.co\/storage/i];
const realErrors = (list) => list.filter((e) => !IGNORED.some((rx) => rx.test(String(e))));

// ─── F1: WHICH WAY THE FIGURE RUNS, ON THE MOUNTED SURFACE ──────────────────
//
// Three independent reads, multiplied together, and not one of them is a flag
// the app set on the way here:
//
//   1. THE IMAGE. The texture the material is actually carrying is drawn into
//      a canvas and measured — wood is smooth ALONG the grain and busy across
//      it, so the quiet axis is the grain's. This is pixels, in the browser,
//      of the very picture on the board.
//   2. THE TEXTURE MATRIX. `map.matrix` — repeat, centre and rotation as three
//      composed them — inverted, to carry that image axis back into the
//      geometry's own uv space.
//   3. THE GEOMETRY. One triangle of the piece's big face, its three uvs and
//      its three world positions, which turn a uv direction into a direction
//      in the room.
//
// What comes out is the grain's axis in CABINET millimetres. F1's law — "a
// decor shelf's grain runs FRONT-TO-BACK" — is then a claim about `z`.
const grainOnPanelJs = (panelId) => `
  const v = ${P}.views && ${P}.views.room;
  if (!v) return null;
  const THREE = v.three;
  let mesh = null;
  v.scene.traverse((o) => {
    if (!mesh && o.isMesh && o.userData && o.userData.ccPanelId === ${JSON.stringify(panelId)}) mesh = o;
  });
  if (!mesh) return { why: 'not mounted' };
  const map = mesh.material && mesh.material.map;
  if (!map || !map.image) return { why: 'no decor on this piece' };

  // 1 ─ the IMAGE's own anisotropy, measured here.
  const img = map.image;
  const cv = document.createElement('canvas');
  const W = Math.min(img.width || img.naturalWidth || 0, 384);
  const H = Math.min(img.height || img.naturalHeight || 0, 384);
  if (!(W > 2 && H > 2)) return { why: 'the image has no size yet' };
  cv.width = W; cv.height = H;
  const g2 = cv.getContext('2d');
  g2.drawImage(img, 0, 0, W, H);
  const px = g2.getImageData(0, 0, W, H).data;
  const lum = (x, y) => px[(y * W + x) * 4];
  let du = 0; let dv = 0;
  for (let y = 1; y < H; y += 1) for (let x = 1; x < W; x += 1) {
    du += Math.abs(lum(x, y) - lum(x - 1, y));
    dv += Math.abs(lum(x, y) - lum(x, y - 1));
  }
  const n = (H - 1) * (W - 1);
  du /= n; dv /= n;
  const imageAxis = du < dv ? 'u' : 'v';

  // 2 ─ the mounted TEXTURE MATRIX, inverted, as a direction.
  map.updateMatrix();
  const inv = new THREE.Matrix3().copy(map.matrix).invert().elements;
  const e = imageAxis === 'u' ? [1, 0] : [0, 1];
  const guv = [inv[0] * e[0] + inv[3] * e[1], inv[1] * e[0] + inv[4] * e[1]];

  // 3 ─ the GEOMETRY's own uvs and world positions, on the big face.
  const geo = mesh.geometry;
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  const nrm = geo.attributes.normal;
  if (!pos || !uv || !nrm) return { why: 'no uvs on the mounted mesh' };
  const box = new THREE.Box3().setFromObject(mesh);
  const size = box.getSize(new THREE.Vector3());
  const thin = [size.x, size.y, size.z].indexOf(Math.min(size.x, size.y, size.z));
  const index = geo.getIndex();
  const vAt = (t, k) => (index ? index.getX(t * 3 + k) : t * 3 + k);
  const tris = (index ? index.count : pos.count) / 3;
  for (let t = 0; t < tris; t += 1) {
    const a = vAt(t, 0); const b = vAt(t, 1); const c = vAt(t, 2);
    const nv = [nrm.getX(a), nrm.getY(a), nrm.getZ(a)];
    if (Math.abs(nv[thin] - 1) > 1e-3) continue;
    const u0 = [uv.getX(a), uv.getY(a)];
    const d1 = [uv.getX(b) - u0[0], uv.getY(b) - u0[1]];
    const d2 = [uv.getX(c) - u0[0], uv.getY(c) - u0[1]];
    const det = d1[0] * d2[1] - d1[1] * d2[0];
    if (Math.abs(det) < 1e-12) continue;
    const wp = (i) => mesh.localToWorld(new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)));
    const p0 = wp(a); const p1 = wp(b).sub(p0); const p2 = wp(c).sub(p0);
    const A = [0, 1, 2].map((k) => (d2[1] * p1.getComponent(k) - d1[1] * p2.getComponent(k)) / det);
    const B = [0, 1, 2].map((k) => (-d2[0] * p1.getComponent(k) + d1[0] * p2.getComponent(k)) / det);
    const dir = [0, 1, 2].map((k) => A[k] * guv[0] + B[k] * guv[1]);
    const len = Math.hypot(dir[0], dir[1], dir[2]);
    if (!(len > 1e-9)) continue;
    const unit = dir.map((q) => q / len);
    const big = unit.map(Math.abs);
    return {
      panelId: ${JSON.stringify(panelId)},
      textureUrl: String(map.image.currentSrc || map.image.src || '').split('/').slice(-2).join('/'),
      imageSize: [img.width || img.naturalWidth, img.height || img.naturalHeight],
      imageDu: Math.round(du * 1000) / 1000,
      imageDv: Math.round(dv * 1000) / 1000,
      imageAxis,
      rotationDeg: Math.round((map.rotation * 180) / Math.PI),
      repeat: [Math.round(map.repeat.x * 1000) / 1000, Math.round(map.repeat.y * 1000) / 1000],
      axis: ['x', 'y', 'z'][big.indexOf(Math.max(big[0], big[1], big[2]))],
      vector: unit.map((q) => Math.round(q * 1000) / 1000),
      face: ['x', 'y', 'z'][thin],
    };
  }
  return { why: 'no face triangle' };
`;

/** Every dimension LABEL the scene has mounted, as the string it draws. */
const labelsJs = `
  const v = ${P}.views && ${P}.views.room;
  if (!v) return null;
  const out = [];
  v.scene.traverse((o) => {
    if (!o.userData || o.userData.ccDimensionText === undefined) return;
    out.push({ text: String(o.userData.ccDimensionText), height: o.userData.ccDimensionHeight, scaleY: o.scale.y });
  });
  return out;
`;

/** Every dimension chain, by the name its caller gave it. */
const chainsJs = `
  const v = ${P}.views && ${P}.views.room;
  if (!v) return null;
  const out = [];
  v.scene.traverse((o) => {
    if (!o.userData || o.userData.ccDimensionChain === undefined) return;
    out.push({ name: String(o.userData.ccDimensionChain), rows: Number(o.userData.ccDimensionRows) || 0 });
  });
  return out;
`;

// ─── F5: THE TWO MEMBERS OF ONE HINGE, IN THE ROOM ──────────────────────────
//
// The knuckle is asked of EACH member in its own frame and the two answers are
// compared — which is the only way the claim means anything. Member A carries
// the pin as a point inside a group that holds the hand mirror; member B's
// joint group STANDS on it. Two routes, one point.
const hingeJs = (panelId) => `
  const v = ${P}.views && ${P}.views.room;
  if (!v) return null;
  const THREE = v.three;
  const mmv = 0.001;
  const want = ${JSON.stringify(panelId)};
  let leaf = null;
  const members = { A: [], B: [] };
  v.scene.traverse((o) => {
    if (!leaf && o.isMesh && o.userData && o.userData.ccPanelId === want) leaf = o;
    const m = o.userData && o.userData.ccHingeMember;
    if (m && o.userData.ccHingePanel === want) members[m].push(o);
  });
  if (!leaf) return { why: 'no leaf' };
  const ancestors = (o) => { const list = []; let up = o.parent; while (up) { list.push(up); up = up.parent; } return list; };
  const leafGroup = leaf.parent;
  const read = (o, kind) => {
    const p = o.userData.ccHingePivotMm || { x: 0, z: 0 };
    const s = o.userData.ccHingeMirror || 1;
    const knuckle = kind === 'A'
      ? o.localToWorld(new THREE.Vector3(p.x * mmv, 0, p.z * mmv))
      : (o.userData.ccHingeJoint
        ? o.userData.ccHingeJoint.getWorldPosition(new THREE.Vector3())
        : o.getWorldPosition(new THREE.Vector3()));
    const q = (o.userData.ccHingeJoint || o).getWorldQuaternion(new THREE.Quaternion());
    return {
      knuckle: [knuckle.x, knuckle.y, knuckle.z],
      quat: [q.x, q.y, q.z, q.w],
      ridesLeaf: ancestors(o).includes(leafGroup),
      fold: o.userData.ccHingeFold ?? null,
      mirror: s,
      pivotMm: p,
      nodes: o.userData.ccHingeMemberNodes || null,
    };
  };
  const plates = [];
  v.scene.traverse((o) => {
    if (o.userData && o.userData.ccHingePlate === true && o.userData.ccHingePanel === want) {
      plates.push(o.getWorldPosition(new THREE.Vector3()).toArray());
    }
  });
  const leafQ = leafGroup ? leafGroup.getWorldQuaternion(new THREE.Quaternion()) : null;
  return {
    a: members.A.map((o) => read(o, 'A')),
    b: members.B.map((o) => read(o, 'B')),
    plates,
    leafQuat: leafQ ? [leafQ.x, leafQ.y, leafQ.z, leafQ.w] : null,
  };
`;

/** The angle between two quaternions, in degrees. */
const angleBetween = (p, q) => {
  const dot = Math.abs(p[0] * q[0] + p[1] * q[1] + p[2] * q[2] + p[3] * q[3]);
  return (2 * Math.acos(Math.min(1, dot)) * 180) / Math.PI;
};
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) * 1000;

async function main() {
  mkdirSync(OUT, { recursive: true });
  const showroom = await startFixtureServer({ port: 4174 });
  const page = await launch({ width: 1600, height: 1000 });
  const shot = (name, clip = null) => page.screenshot(`${OUT}${name}.png`, clip);

  let errorMark = 0;
  const consoleSince = () => realErrors(page.errors.slice(errorMark));
  const check = (label, ok, detail = '') => {
    const errs = consoleSince();
    errorMark = page.errors.length;
    const clean = errs.length === 0;
    steps.push({
      label,
      ok: Boolean(ok) && clean,
      detail: typeof detail === 'string' ? detail : JSON.stringify(detail),
      ...(clean ? {} : { console: errs.slice(0, 4) }),
    });
    const line = `${Boolean(ok) && clean ? '  ok' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`;
    console.log(clean ? line : `${line}\n      R6: ${errs.slice(0, 2).join(' | ')}`);
  };
  const blocked = (label, why, detail = '') => {
    errorMark = page.errors.length;
    steps.push({
      label, ok: null, blocked: why, detail: typeof detail === 'string' ? detail : JSON.stringify(detail),
    });
    console.log(`BLKD  ${label} — ${why}${detail ? ` (${detail})` : ''}`);
  };

  /** Put the camera on ONE piece, close, from a stated direction. */
  const frameOn = async (panelId, offset = [1.6, 0.4, 2.2]) => page.evaluate(`
    const v = ${P}.views && ${P}.views.room;
    if (!v) return null;
    const THREE = v.three;
    let mesh = null;
    v.scene.traverse((o) => { if (!mesh && o.isMesh && o.userData && o.userData.ccPanelId === ${JSON.stringify(panelId)}) mesh = o; });
    if (!mesh) return null;
    const box = new THREE.Box3().setFromObject(mesh);
    const c = box.getCenter(new THREE.Vector3());
    const r = Math.max(0.18, box.getSize(new THREE.Vector3()).length() / 2);
    const off = ${JSON.stringify(offset)};
    v.camera.position.set(c.x + off[0] * r, c.y + off[1] * r, c.z + off[2] * r);
    v.camera.lookAt(c);
    v.camera.updateProjectionMatrix();
    if (v.controls && v.controls.target) { v.controls.target.copy(c); v.controls.update(); }
    return true;
  `);

  /**
   * Put the camera on a SET of cabinets, from a stated direction.
   *
   * CLAUDE.md: a proof screenshot must SHOW THE SUBJECT, and turn 28 shipped
   * two that did not. Framing off the unit's own mounted meshes — rather than
   * off a hand-typed position — is what makes a picture contain the thing it
   * names whatever the room happens to be arranged like.
   */
  const frameUnits = async (unitIds, offset = [1, 1, 2]) => page.evaluate(`
    const v = ${P}.views && ${P}.views.room;
    if (!v) return null;
    const THREE = v.three;
    const want = new Set(${JSON.stringify(unitIds)});
    const box = new THREE.Box3();
    let found = 0;
    v.scene.traverse((g) => {
      if (!g.userData || !want.has(g.userData.ccUnitId)) return;
      g.traverse((o) => {
        if (!o.isMesh || !o.userData || !o.userData.ccPanelId) return;
        box.expandByObject(o);
        found += 1;
      });
    });
    if (!found) return null;
    const c = box.getCenter(new THREE.Vector3());
    const r = Math.max(0.3, box.getSize(new THREE.Vector3()).length() / 2);
    const off = ${JSON.stringify(offset)};
    v.camera.position.set(c.x + off[0] * r, c.y + off[1] * r, c.z + off[2] * r);
    v.camera.lookAt(c);
    v.camera.updateProjectionMatrix();
    if (v.controls && v.controls.target) { v.controls.target.copy(c); v.controls.update(); }
    return found;
  `);

  const measurements = {};

  try {
    // ── R2, first, and before any picture of hardware ──────────────────────
    let bucket = null;
    try {
      bucket = await checkLiveBucket();
    } catch (e) {
      bucket = { ok: false, error: e.message };
    }
    writeFileSync(`${OUT}bucket-live.json`, `${JSON.stringify(bucket, null, 1)}\n`);
    if (bucket?.ok) check('R2 — the live bucket answers', true, 'manifests and a model fetched');
    else {
      blocked('R2 — the live bucket', "this session's egress policy refuses the storage host",
        bucket?.families?.map((f) => `${f.id}: ${f.error || 'failed'}`).join(' · ') || bucket?.error || '403');
    }

    // ── R8: the showroom, and the app pointed at it ────────────────────────
    await page.goto(BASE);
    await page.evaluate(`localStorage.clear(); localStorage.setItem('cc.hardwareBase', ${JSON.stringify(showroom.url)}); return true;`);
    await page.goto(BASE);
    await page.waitFor(`${P} && ${P}.project`, { what: 'the app to boot' });
    check('R8 — the app is pointed at the silent showroom', true, showroom.url);

    // ─────────────────────────────────────────────────────────────────────────
    // F1 — the owner's own arrangement: two open base units, decor shelves
    // ─────────────────────────────────────────────────────────────────────────
    await page.evaluate(`
      const s = ${P}.project.getState();
      s.newProject('Turn 29 walk', {
        room: {
          height: 2500,
          corners: [{ x: 0, y: 0 }, { x: 12000, y: 0 }, { x: 12000, y: 3600 }, { x: 0, y: 3600 }],
        },
      });
      ${P}.ui.getState().openEditor();
      ${P}.ui.getState().closeModal();
      ${P}.ui.getState().closeLibrary();
      // THE OWNER'S PICTURE: two OPEN base units — no doors — with shelves in
      // them, and a woodgrain decor on the carcass so the shelves are wood.
      // The decor is chosen the way the picker chooses one: by its id.
      s.setDesign({ finish: { carcass: 'egger:H1180_37', front: null } });
      const ids = [];
      let near = null;
      for (let i = 0; i < 2; i += 1) {
        const u = near ? s.addUnit('BUD', { near, side: 'right' }) : s.addUnit('BUD');
        s.updateUnitParams(u.id, { width: 600, doors: false });
        // Shelves as ITEMS, which is what the "+" adds and what a saved project
        // carries — the legacy count is not what a cabinet in a room has.
        s.addItem(u.id, { kind: 'shelf', pos_mm: 300 });
        s.addItem(u.id, { kind: 'shelf', pos_mm: 520 });
        ids.push(u.id);
        near = u.id;
      }
      const r = s.unitResult(ids[0]);
      window.__t29 = {
        openIds: ids,
        shelfId: r.panels.find((p) => p.part === 'SHELF').id,
        topId: r.panels.find((p) => p.part === 'TOP').id,
        sideId: r.panels.find((p) => p.part === 'BUL').id,
      };
      return true;
    `);
    await page.waitFor('document.querySelector("canvas")', { what: 'the 3D canvas' });
    // The decor image has to arrive — or, in this container, to be REFUSED by
    // the egress policy and fall over to our own procedural grain — before the
    // material carries a map at all. That is the whole load-order trap turn 8
    // wrote about, and a walk that measured too early would measure nothing.
    // It is also exactly the condition F1 is about, so the wait is generous.
    // `waitFor` wraps its argument in `Boolean(...)`, so this is an EXPRESSION.
    await page.waitFor(`(() => {
      const v = ${P}.views && ${P}.views.room;
      if (!v) return false;
      let ok = false;
      v.scene.traverse((o) => {
        if (o.isMesh && o.userData && o.userData.ccPanelId === 'SHELF-1' && o.material && o.material.map) ok = true;
      });
      return ok;
    })()`, { what: 'a decor image on the shelf', timeout: 30000 });
    await page.sleep(900);

    const f1shelf = await page.evaluate(grainOnPanelJs('SHELF-1'));
    const f1top = await page.evaluate(grainOnPanelJs('TOP'));
    const f1side = await page.evaluate(grainOnPanelJs('BUL'));
    measurements.f1 = { shelf: f1shelf, top: f1top, side: f1side };

    check('F1 — THE LAW: a decor shelf’s grain runs FRONT-TO-BACK on the mounted surface',
      f1shelf && f1shelf.axis === 'z' && Math.abs(f1shelf.vector?.[0] ?? 1) < 0.01,
      f1shelf?.why || `${f1shelf?.axis} — image grain along ${f1shelf?.imageAxis} (${f1shelf?.imageDu} vs ${f1shelf?.imageDv}), turned ${f1shelf?.rotationDeg}°`);
    check('F1 — …and the WIENIEC above it still runs left-to-right (turn 13’s law)',
      f1top && f1top.axis === 'x',
      f1top?.why || `${f1top?.axis} — turned ${f1top?.rotationDeg}°`);
    check('F1 — …and a carcass SIDE still runs up the panel (turn 8’s law)',
      f1side && f1side.axis === 'y',
      f1side?.why || `${f1side?.axis} — turned ${f1side?.rotationDeg}°`);
    check('F1 — the picture is the one the room can actually reach (R7 / rule 7)',
      Boolean(f1shelf?.textureUrl),
      `${f1shelf?.textureUrl} at ${f1shelf?.imageSize?.join('×')}`);

    // The pictures: down into the two open carcasses, where the shelves are,
    // and then one shelf on its own with the cabinet's front edge in frame —
    // "front to back" is only legible beside the front it runs to.
    await page.evaluate('return window.__t29.openIds;');
    await frameUnits(await page.evaluate('return window.__t29.openIds;'), [0.25, 0.95, 1.15]);
    await page.sleep(900);
    await shot('1a-the-grain-runs-front-to-back-on-every-shelf');
    await frameOn('SHELF-1', [0.35, 1.15, 1.5]);
    await page.sleep(700);
    await shot('1b-one-shelf-from-above-front-to-back');

    // ─────────────────────────────────────────────────────────────────────────
    // F2 — the dimension language: the 100, and once per run
    // ─────────────────────────────────────────────────────────────────────────
    await page.evaluate(`
      const s = ${P}.project.getState();
      // A RUN OF THREE IDENTICAL base units, on their own, with the toolbar's
      // own "Show dimensions" on — which is the path the owner is looking at.
      for (const id of window.__t29.openIds) s.removeUnit(id);
      const run = [];
      let near = null;
      for (let i = 0; i < 3; i += 1) {
        const u = near ? s.addUnit('BUD', { near, side: 'right' }) : s.addUnit('BUD');
        s.updateUnitParams(u.id, { width: 600, doors: true });
        s.addPlinth(u.id);
        run.push(u.id);
        near = u.id;
      }
      window.__t29.runIds = run;
      ${P}.ui.getState().setShowDimensions(true);
      // The chain stands on the run's OUTER end, which is where the parameters
      // panel is. A picture of a panel covering its own subject is the fault
      // CLAUDE.md names, so the panel goes for these two frames.
      ${P}.ui.getState().closeRightPanel();
      return true;
    `);
    await page.sleep(2200);

    const f2runLabels = await page.evaluate(labelsJs);
    const f2runChains = await page.evaluate(chainsJs);
    measurements.f2run = { labels: f2runLabels, chains: f2runChains };

    const count = (list, text) => list.filter((l) => l.text === text).length;
    check('F2.1 — the base unit’s chain reads 100 AND 770, on one vertical line',
      count(f2runLabels, '100') >= 1 && count(f2runLabels, '770') >= 1,
      `100 × ${count(f2runLabels, '100')}, 770 × ${count(f2runLabels, '770')}, 870 × ${count(f2runLabels, '870')}`);
    check('F2.1 — …and the 870 nobody orders board to is gone',
      count(f2runLabels, '870') === 0,
      `${count(f2runLabels, '870')} labels reading 870`);
    check('F2.2 — a run of THREE identical units draws ONE 600, ONE 100 and ONE 770',
      count(f2runLabels, '600') === 1 && count(f2runLabels, '100') === 1 && count(f2runLabels, '770') === 1,
      `600 × ${count(f2runLabels, '600')}, 100 × ${count(f2runLabels, '100')}, 770 × ${count(f2runLabels, '770')} for 3 cabinets`);
    check('F2.2 — …and it is ONE cabinet that carries the chains, not three',
      f2runChains.filter((c) => c.name.startsWith('w-')).length === 1
      && f2runChains.filter((c) => c.name.startsWith('h-')).length === 1,
      f2runChains.map((c) => `${c.name}:${c.rows}`).join(' · '));
    await frameUnits(await page.evaluate('return window.__t29.runIds;'), [0.95, 0.34, 2.05]);
    await page.sleep(900);
    await shot('2a-a-run-of-three-dimensions-once-100-and-770');

    // …and a MIXED run, which is where the rule has to break. Built as one
    // rather than edited into one: a width typed into a cabinet already in a
    // run is a different gesture, and this phase is about the RULE.
    await page.evaluate(`
      const s = ${P}.project.getState();
      for (const id of window.__t29.runIds) s.removeUnit(id);
      const run = [];
      let near = null;
      for (const w of [600, 900, 600]) {
        const u = near ? s.addUnit('BUD', { near, side: 'right' }) : s.addUnit('BUD');
        s.updateUnitParams(u.id, { width: w, doors: true });
        s.addPlinth(u.id);
        run.push(u.id);
        near = u.id;
      }
      window.__t29.mixedIds = run;
      return true;
    `);
    await page.sleep(2400);
    const f2mixed = await page.evaluate(labelsJs);
    const f2mixedChains = await page.evaluate(chainsJs);
    measurements.f2mixed = { labels: f2mixed, chains: f2mixedChains };
    check('F2.2 — a DIFFERENT cabinet breaks the run: three chains, three widths',
      f2mixedChains.filter((c) => c.name.startsWith('w-')).length === 3
      && count(f2mixed, '900') === 1 && count(f2mixed, '600') === 2,
      `${f2mixedChains.filter((c) => c.name.startsWith('w-')).length} width chains · 600 × ${count(f2mixed, '600')}, 900 × ${count(f2mixed, '900')}`);
    await frameUnits(await page.evaluate('return window.__t29.mixedIds;'), [0.95, 0.34, 2.05]);
    await page.sleep(700);
    await shot('2b-a-different-cabinet-breaks-the-run');

    // ─────────────────────────────────────────────────────────────────────────
    // F4 — the label's own height, measured off the sprite the scene mounted
    // ─────────────────────────────────────────────────────────────────────────
    const f4 = {
      heights: [...new Set(f2mixed.map((l) => Math.round(l.scaleY * 100000) / 100000))],
      before: 0.044,
    };
    measurements.f4 = f4;
    check('F4 — every mounted dimension label is 1.3× the height turn 25 drew',
      f4.heights.length === 1 && Math.abs(f4.heights[0] / f4.before - 1.3) < 1e-6,
      `${f4.heights.join('/')} against 0.044 — ×${(f4.heights[0] / f4.before).toFixed(4)}`);
    await frameUnits(await page.evaluate('return [window.__t29.mixedIds[2]];'), [1.2, 0.45, 1.7]);
    await page.sleep(700);
    await shot('4a-the-dimension-type-a-third-bigger-half-the-weight');

    // ─────────────────────────────────────────────────────────────────────────
    // F3 — the D/W's front and plinth, on the SAME buttons (R1: a real mouse)
    // ─────────────────────────────────────────────────────────────────────────
    await page.evaluate(`
      const s = ${P}.project.getState();
      for (const id of window.__t29.mixedIds) s.removeUnit(id);
      ${P}.ui.getState().setShowDimensions(false);
      const dw = s.addUnit('DW_PANEL');
      window.__t29.dwId = dw.id;
      ${P}.ui.getState().selectUnit(dw.id);
      ${P}.ui.getState().openRightPanel();
      ${P}.ui.getState().setPanelSection('construction', true);
      ${P}.ui.getState().setPanelSection('doors', true);
      return true;
    `);
    await page.sleep(1600);

    const censusJs = `
      const s = ${P}.project.getState();
      const r = s.unitResult(window.__t29.dwId);
      if (!r) return { why: 'no result' };
      const v = ${P}.views && ${P}.views.room;
      const drawn = [];
      if (v) v.scene.traverse((g) => {
        if (!g.userData || g.userData.ccUnitId !== window.__t29.dwId) return;
        g.traverse((o) => { if (o.isMesh && o.userData && o.userData.ccPanelId) drawn.push(o.userData.ccPanelId); });
      });
      return {
        parts: r.panels.map((p) => p.part).sort(),
        drawn: [...new Set(drawn)].sort(),
        csv: r.csvLines.length,
        frontArea: r.totals.front_area_m2,
        boardArea: r.totals.board_area_m2,
        doors: r.derived.doors,
        drills: r.drills.length,
        hardware: r.hardware.length,
      };
    `;
    const f3on = await page.evaluate(censusJs);
    check('F3 — a D/W arrives with its FRONT and its PLINTH, and the scene draws all three',
      f3on.parts.join('+') === 'FRONT+PLINTH+TOP' && f3on.drawn.length === 3,
      `${f3on.parts.join(' · ')} — scene: ${f3on.drawn.join(' · ')}`);
    check('F3 — the panel offers the ORDINARY plinth control on a kit with no legs',
      await page.evaluate(`
        const rows = [...document.querySelectorAll('.cc-row')];
        const row = rows.find((n) => (n.textContent || '').includes('Plinth'));
        return Boolean(row && [...row.querySelectorAll('button')].some((b) => /Remove|Add plinth/.test(b.textContent || '')));
      `),
      'the same button every other cabinet has');

    await page.click('button', 'Remove doors');
    await page.sleep(1500);
    const f3noFront = await page.evaluate(censusJs);
    measurements.f3 = { on: f3on, noFront: f3noFront };
    check('F3 — "Remove doors" takes the face out of the scene, the sheet and the BOM',
      f3noFront.parts.join('+') === 'PLINTH+TOP'
      && !f3noFront.drawn.some((id) => id.endsWith('-F'))
      && f3noFront.csv < f3on.csv && f3noFront.frontArea < f3on.frontArea,
      `${f3noFront.parts.join(' · ')} — ${f3noFront.csv} csv lines (was ${f3on.csv}), front area ${f3noFront.frontArea}`);
    // Framed after each press, off the pieces that are still there: a cabinet
    // that has just lost two of its three boards is a smaller subject, and a
    // camera left where the whole one was is a picture of the floor.
    await frameUnits([await page.evaluate('return window.__t29.dwId;')], [0.7, 0.5, 1.6]);
    await page.sleep(600);
    await shot('3a-the-dishwasher-with-its-front-removed');

    await page.click('button', 'Remove');
    await page.sleep(1500);
    const f3bare = await page.evaluate(censusJs);
    measurements.f3.bare = f3bare;
    check('F3 — …and the plinth toggle takes the toe kick with it, leaving the RAIL',
      f3bare.parts.join('+') === 'TOP' && f3bare.drawn.length === 1
      && f3bare.drills === 0 && f3bare.hardware === 0,
      `${f3bare.parts.join(' · ')} — scene: ${f3bare.drawn.join(' · ')}, ${f3bare.drills} holes`);
    await frameUnits([await page.evaluate('return window.__t29.dwId;')], [0.7, 0.5, 1.6]);
    await page.sleep(600);
    await shot('3b-both-off-the-rail-is-the-only-fixed-piece');

    await page.click('button', 'Add plinth');
    await page.sleep(1200);
    await page.click('button', 'Add doors');
    await page.sleep(1600);
    const f3back = await page.evaluate(censusJs);
    measurements.f3.back = f3back;
    check('F3 — and the same two buttons put them back, piece for piece',
      f3back.parts.join('+') === 'FRONT+PLINTH+TOP'
      && f3back.csv === f3on.csv && Math.abs(f3back.frontArea - f3on.frontArea) < 1e-9
      && Math.abs(f3back.boardArea - f3on.boardArea) < 1e-9,
      `${f3back.parts.join(' · ')} — ${f3back.csv} csv lines, front area ${f3back.frontArea}`);
    await frameUnits([await page.evaluate('return window.__t29.dwId;')], [0.7, 0.5, 1.6]);
    await page.sleep(600);
    await shot('3c-and-back-again-with-the-same-buttons');

    // ─────────────────────────────────────────────────────────────────────────
    // F5 — the hinge folds about its measured axis
    // ─────────────────────────────────────────────────────────────────────────
    await page.evaluate(`
      const s = ${P}.project.getState();
      s.removeUnit(window.__t29.dwId);
      // A cabinet with TWO leaves — one hung left, one right — so both hands
      // are read in one scene and the mirror has nowhere to hide.
      const pair = s.addUnit('BUD');
      s.updateUnitParams(pair.id, { width: 900, doors: { count: 2 } });
      window.__t29.pairId = pair.id;
      const r = s.unitResult(pair.id);
      window.__t29.leaves = r.panels.filter((p) => p.part === 'FRONT').map((p) => ({ id: p.id, hinge: p.meta.hinge }));
      ${P}.ui.getState().setShowHinges(true);
      return true;
    `);
    await page.sleep(2600);

    const leaves = await page.evaluate('return window.__t29.leaves;');
    const swingDeg = await page.evaluate(`
      const s = ${P}.project.getState();
      const profile = ${P}.profile.getState().profile;
      const r = s.unitResult(window.__t29.pairId);
      const leaf = r.panels.find((p) => p.part === 'FRONT');
      return (window.__ccT21.doors.doorOpenAngle({
        doorWidth: leaf.w, hingeOffset: profile.doors.gap / 2, gapToWall: null,
      }, profile) * 180) / Math.PI;
    `);
    const rig = [];
    for (const deg of [0, 45, 110]) {
      // eslint-disable-next-line no-await-in-loop
      await page.evaluate(`
        const open = ${deg} / ${swingDeg};
        const map = {};
        for (const l of window.__t29.leaves) map[l.id] = open;
        ${P}.ui.setState((s) => ({ openFronts: { ...s.openFronts, [window.__t29.pairId]: map } }));
        return true;
      `);
      // The door EASES to its angle (`MovingPanel`, delta × 8), so the walk
      // waits for the leaf to arrive rather than sleeping a guessed number of
      // milliseconds — a reading taken mid-ease is a reading of nothing.
      // eslint-disable-next-line no-await-in-loop
      await page.waitFor(`(() => {
        const v = ${P}.views && ${P}.views.room;
        if (!v) return false;
        let ok = 0;
        v.scene.traverse((o) => {
          if (!o.isMesh || !o.userData) return;
          const l = window.__t29.leaves.find((x) => x.id === o.userData.ccPanelId);
          if (!l || !o.parent) return;
          if (Math.abs(Math.abs((o.parent.rotation.y * 180) / Math.PI) - ${deg}) < 0.5) ok += 1;
        });
        return ok === window.__t29.leaves.length;
      })()`, { what: `both leaves at ${deg}°`, timeout: 15000 });
      // eslint-disable-next-line no-await-in-loop
      await page.sleep(350);
      for (const leaf of leaves) {
        // eslint-disable-next-line no-await-in-loop
        const read = await page.evaluate(hingeJs(leaf.id));
        rig.push({ deg, leaf: leaf.id, hinge: leaf.hinge, read });
      }
    }
    measurements.f5 = { swingDeg, rig };

    const shut = Object.fromEntries(rig.filter((r) => r.deg === 0).map((r) => [r.leaf, r.read]));
    const gaps = rig.map((r) => {
      const a = r.read?.a?.[0];
      const b = r.read?.b?.[0];
      return a && b ? dist(a.knuckle, b.knuckle) : Infinity;
    });
    check('F5 — the CUP rides the leaf and the ARM is the piece that folds',
      rig.every((r) => r.read?.a?.length && r.read.b.length
        && r.read.a.every((m) => m.ridesLeaf) && r.read.b.every((m) => m.ridesLeaf)),
      rig.filter((r) => r.deg === 45).map((r) => `${r.leaf}: A×${r.read?.a?.length} B×${r.read?.b?.length}`).join(' · '));
    check('F5 — the KNUCKLE is one point at 0°, 45° and 110°, on BOTH hands',
      gaps.every((g) => g < 0.2),
      rig.map((r, i) => `${r.hinge}@${r.deg}°: ${gaps[i].toFixed(3)} mm`).join(' · '));
    const attitudes = rig.map((r) => (shut[r.leaf] && r.read?.b?.[0]
      ? angleBetween(r.read.b[0].quat, shut[r.leaf].b[0].quat) : 999));
    check('F5 — the ARM keeps the CARCASS’s attitude: it does not swing out with the door',
      attitudes.every((a) => a < 0.5),
      rig.map((r, i) => `${r.hinge}@${r.deg}°: ${attitudes[i].toFixed(3)}°`).join(' · '));
    const leafTurn = rig.map((r) => (shut[r.leaf] && r.read?.leafQuat
      ? angleBetween(r.read.leafQuat, shut[r.leaf].leafQuat) : 999));
    check('F5 — …while the LEAF really did swing to the angle it was asked for',
      rig.every((r, i) => Math.abs(leafTurn[i] - r.deg) < 1.5),
      rig.map((r, i) => `${r.hinge}@${r.deg}°: ${leafTurn[i].toFixed(1)}°`).join(' · '));
    const folds = rig.map((r) => Math.abs(((r.read?.b?.[0]?.fold ?? 0) * 180) / Math.PI));
    check('F5 — the fold is the leaf’s own angle and stops at the ironmongery’s 110°',
      rig.every((r, i) => Math.abs(folds[i] - Math.min(110, r.deg)) < 1.5),
      rig.map((r, i) => `${r.hinge}@${r.deg}°: folded ${folds[i].toFixed(1)}°`).join(' · '));
    const pins = rig.map((r) => r.read?.b?.[0]?.pivotMm);
    check('F5 — and it is the MEASURED axis both members are jointed on',
      pins.every((p) => p && Math.abs(p.x - -10.33) < 0.01 && Math.abs(p.z - 2.56) < 0.01),
      pins[0] ? `(${pins[0].x}, 0, ${pins[0].z}) mm from the cup centre` : 'no pin');

    // The picture: both leaves mid-swing, with the ironmongery in frame. A
    // hinge is 80 mm of steel, so the second frame comes in close on the row
    // — and the cabinet is framed off its own mounted meshes, so the subject
    // is in the picture rather than behind the camera.
    await page.evaluate(`
      const map = {};
      for (const l of window.__t29.leaves) map[l.id] = 60 / ${swingDeg};
      ${P}.ui.setState((s) => ({ openFronts: { ...s.openFronts, [window.__t29.pairId]: map } }));
      return true;
    `);
    await page.sleep(1800);
    await frameUnits([await page.evaluate('return window.__t29.pairId;')], [0.9, 0.55, 1.5]);
    await page.sleep(800);
    await shot('5a-a-door-mid-swing-with-the-hinge-folded');
    await frameUnits([await page.evaluate('return window.__t29.pairId;')], [0.42, 0.3, 0.62]);
    await page.sleep(800);
    await shot('5b-the-hinge-row-close-cup-on-the-leaf-arm-at-the-plate');
    await page.evaluate(`${P}.ui.setState({ openFronts: {} }); return true;`);
    await page.sleep(600);

    // ─── R5 + R6, as an assertion at the end ────────────────────────────────
    const errs = realErrors(page.errors);
    check('R5 + R6 — the console is clean across the whole walk', errs.length === 0,
      errs.slice(0, 3).join(' | ') || 'no errors, no React exceptions');

    const lines = page.consoleLines.map((l) => `${l.level}  ${l.text}`);
    writeFileSync(`${OUT}console.txt`, [
      `# every console message of the turn-29 walk — ${lines.length} in total`,
      `# uncaught exceptions and React error-boundary reports: ${errs.length}`,
      ...(lines.length ? lines : ['(the app printed nothing across the whole walk)']),
      '',
    ].join('\n'));
    writeFileSync(`${OUT}measurements.json`, `${JSON.stringify(measurements, null, 1)}\n`);
  } catch (e) {
    check('the walk ran to the end', false, e.message);
  } finally {
    const passed = steps.filter((s) => s.ok === true).length;
    const failed = steps.filter((s) => s.ok === false).length;
    const skipped = steps.filter((s) => s.ok === null).length;
    writeFileSync(`${OUT}walk.json`, `${JSON.stringify({
      turn: 29,
      url: BASE,
      showroom: showroom.url,
      rules: {
        R1: 'every move and keystroke is CDP Input; the guard at the top of this file enforces it. F3 presses the app’s own two buttons with a real mouse',
        R2: 'scripts/bucket-live.mjs, before any picture of hardware',
        R4: 'every claim is read off the app: F1 measures the MOUNTED texture, its UV matrix and the geometry’s own UVs; F2 and F4 read the sprites the one dimension component mounted; F3 reads the record and the scene after each click; F5 reads both hinge members’ world positions',
        R5: 'the console is captured for the whole walk',
        R6: 'any uncaught error or React error-boundary report FAILS the step it appeared in',
        R7: 'no data-* on R3F objects — the scene is found by userData (ccPanelId, ccDimensionChain, ccDimensionText, ccHingeMember)',
        R8: 'GLB-dependent steps run against the synthetic silent showroom, whose hinge carries the measured knuckle',
        R9: 'no feature without its part — F3 asserts the SCENE stops drawing a piece the moment it is switched off',
        R10: 'the sheet is the truth: F1’s grain follows the frame turn 26 F8 nested the shelf in',
        R11: 'every dimension in the scene is found by traversing for ccDimensionChain — one component, one type',
        R12: 'extend means extend: F2 moves the two corrections to the path the eye sees and leaves the front labels the owner approved alone',
      },
      totals: { passed, failed, skipped },
      steps,
      errors: realErrors(page.errors),
    }, null, 1)}\n`);
    console.log(`\n${passed} ok · ${failed} failed · ${skipped} blocked`);
    await page.close();
    await showroom.close();
    process.exit(failed ? 1 : 0);
  }
}

main();
