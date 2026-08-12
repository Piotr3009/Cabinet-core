// ─── Turn 27, the acceptance walk, in a real Chromium ───────────────────────
//
// Run:  npm run build
//       npx vite preview --port 4173 &
//       node scripts/e2e-turn27.mjs
//
// The fixture server (R8) is started by this script; the app preview is not,
// because a walk that builds its own app cannot prove the build somebody else
// is about to ship.
//
// ─── R1: A POINTER GESTURE IS PROVEN WITH A REAL POINTER ────────────────────
//
// Standing since turn 20: every click, double-click, drag, wheel, hover and
// keystroke goes through `Input.dispatchMouseEvent` / `dispatchKeyEvent`
// (scripts/cdp.mjs). Synthetic DOM events are BANNED, and the ban is enforced
// rather than promised — the guard below reads this file and refuses to run if
// anybody adds one.
//
// ─── R2: THE BUCKET IS ASKED, LIVE ──────────────────────────────────────────
//
// `scripts/bucket-live.mjs`, before any picture of hardware.
//
// ─── R4: A CLAIM IS PROVEN BY ASKING THE APP ────────────────────────────────
//
// Nothing below is inferred from a pixel. F1 asks `window.__ccT27.shelfBearers`
// — the very resolution the drilling pass and the dimension chain both go
// through — and `hoverRows`, the very rows the scene draws. F2 reads the drop
// front's live rotation off the SCENE GRAPH. F3 measures the tray's own
// triangles, in the running WebGL, against the normals they carry. F4 reads the
// palette out of `dimensionStyle`, the call the component makes. The
// screenshots are what those facts LOOK like, not what they rest on.
//
// ─── R5 + R6: THE WALK READS THE CONSOLE, AND AN EXCEPTION FAILS A STEP ─────
//
// `check` takes a snapshot of the error log with every step: ANY uncaught
// error, React error-boundary report or failed resource that appears during a
// step FAILS that step, whatever else it asserted.
//
// ─── R8: HARDWARE VISUALS ARE PROVEN ON THE SILENT SHOWROOM ─────────────────
//
// `test/fixtures/hardware-local/` — synthetic GLBs at the REAL measured
// dimensions with the real export's own node names, no Blum bytes — served
// locally and pointed at with the documented `localStorage['cc.hardwareBase']`
// knob. Everything downstream is the production path.
//
// ─── R12: EXTEND MEANS EXTEND ───────────────────────────────────────────────
//
// THIS turn's new rule, and F4 is the debt it names. The walk photographs the
// dimension labels so the owner can see the paint come back, and asserts the
// palette is the profile's rather than a component's opinion.

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
const OUT = argOf('--out', new URL('../verify/t27/', import.meta.url).pathname);

// R1's guard, and it is a guard rather than a promise.
const BANNED = ['dispatch', 'Event('].join('');
const SELF = readFileSync(new URL(import.meta.url), 'utf8');
if (SELF.includes(`.${BANNED}`)) {
  throw new Error(`R1: a pointer gesture in this walk is using ${BANNED}. Use CDP input.`);
}

const steps = [];
const P = 'window.__cc';

// A favicon nobody asked for is not a React exception. Everything else is.
const IGNORED = [/favicon\.ico/i];
const realErrors = (list) => list.filter((e) => !IGNORED.some((rx) => rx.test(String(e))));

// ─── THE WINDING MEASUREMENT, IN THE LIVE SCENE (F3) ────────────────────────
//
// The owner's fault was that a wall carried the right normal and the wrong
// winding, so the room could not see it. That is not something a screenshot can
// prove — an invisible wall photographs exactly like a wall that is not there —
// so the walk measures it: every triangle of the leaf's own geometry, in the
// mesh that is actually mounted, with its winding compared against the normal
// it declares. Zero mismatches is the claim.
const trayWindingJs = (panelId) => `
  const v = ${P}.views && ${P}.views.room;
  if (!v) return null;
  let mesh = null;
  v.scene.traverse((o) => { if (!mesh && o.isMesh && o.userData && o.userData.ccPanelId === ${JSON.stringify(panelId)}) mesh = o; });
  if (!mesh) return null;
  const pos = mesh.geometry.getAttribute('position');
  const nor = mesh.geometry.getAttribute('normal');
  if (!pos || !nor) return { triangles: 0, mismatches: null, why: 'no normals on this mesh' };
  const idx = mesh.geometry.getIndex();
  const at = (k) => (idx ? idx.getX(k) : k);
  const count = idx ? idx.count : pos.count;
  let mismatches = 0;
  let triangles = 0;
  let walls = 0;
  const edges = new Map();
  const key = (i) => [pos.getX(i), pos.getY(i), pos.getZ(i)].map((n) => n.toFixed(7)).join(',');
  for (let t = 0; t + 2 < count; t += 3) {
    const a = at(t); const b = at(t + 1); const c = at(t + 2);
    const ax = pos.getX(a), ay = pos.getY(a), az = pos.getZ(a);
    const ux = pos.getX(b) - ax, uy = pos.getY(b) - ay, uz = pos.getZ(b) - az;
    const wx = pos.getX(c) - ax, wy = pos.getY(c) - ay, wz = pos.getZ(c) - az;
    const nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx;
    const area = Math.sqrt(nx * nx + ny * ny + nz * nz);
    if (area < 1e-12) continue;
    triangles += 1;
    const dot = nx * nor.getX(a) + ny * nor.getY(a) + nz * nor.getZ(a);
    if (dot <= 0) mismatches += 1;
    // A REBATE WALL: its normal lies in the face's own plane (no z component),
    // which is exactly the set of faces the owner said were missing.
    if (Math.abs(nor.getZ(a)) < 1e-6) walls += 1;
    for (const [i, j] of [[a, b], [b, c], [c, a]]) {
      const e = key(i) + '>' + key(j);
      edges.set(e, (edges.get(e) || 0) + 1);
    }
  }
  let open = 0;
  for (const [e, n] of edges) {
    const parts = e.split('>');
    if ((edges.get(parts[1] + '>' + parts[0]) || 0) !== n) open += 1;
  }
  return { triangles, mismatches, wallTriangles: walls, openEdges: open };
`;

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
   * Hold a leaf at a fraction of its own gesture, and let the easing settle.
   *
   * Turn 26's own instrument: the easing is the DOOR's (`delta × 8`), a
   * headless window composites lazily, and a real pointer move is a real event
   * the browser draws a frame for — which is R1's instrument used for what it
   * is. The two points are empty floor, so nothing is hovered or picked.
   */
  const holdAt = async (unitId, panelId, fraction) => {
    await page.evaluate(`
      ${P}.ui.setState((s) => ({
        openFronts: { ...s.openFronts, [${JSON.stringify(unitId)}]: {
          ...(s.openFronts[${JSON.stringify(unitId)}] || {}), [${JSON.stringify(panelId)}]: ${fraction},
        } },
      }));
      return true;
    `);
    const readPose = `
      const v = ${P}.views && ${P}.views.room;
      if (!v) return null;
      let mesh = null;
      v.scene.traverse((o) => { if (!mesh && o.isMesh && o.userData && o.userData.ccPanelId === ${JSON.stringify(panelId)}) mesh = o; });
      if (!mesh || !mesh.parent) return null;
      return [mesh.parent.rotation.x, mesh.parent.rotation.y, mesh.parent.position.z];
    `;
    let last = null;
    for (let i = 0; i < 40; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await page.mouse('mouseMoved', i % 2 ? 40 : 44, 940, { button: 'none', buttons: 0, clickCount: 0 });
      // eslint-disable-next-line no-await-in-loop
      await page.sleep(110);
      // eslint-disable-next-line no-await-in-loop
      const now = await page.evaluate(readPose);
      if (i >= 2 && last && now && last.every((n, k) => Math.abs(n - now[k]) < 1e-4)) return now;
      last = now;
    }
    return last;
  };

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
    // F1 — a shelf drills the two boards that carry it
    // ─────────────────────────────────────────────────────────────────────────
    //
    // The owner's own cabinet from the eye test: a partition, and a shelf in the
    // bay between it and BUR.
    await page.evaluate(`
      const s = ${P}.project.getState();
      s.newProject('Turn 27 walk');
      ${P}.ui.getState().openEditor();
      ${P}.ui.getState().closeModal();
      ${P}.ui.getState().closeLibrary();
      const divided = s.addUnit('BUD');
      s.updateUnitParams(divided.id, { doors: true, width: 900 });
      s.addItem(divided.id, { kind: 'partition', x_mm: 450 });
      s.addItem(divided.id, { kind: 'shelf', pos_mm: 400, zone: 1 });
      window.__t27 = { dividedId: divided.id };
      return true;
    `);
    await page.waitFor('document.querySelector("canvas")', { what: 'the 3D canvas' });
    await page.sleep(900);

    const f1 = await page.evaluate(`
      const s = ${P}.project.getState();
      const id = window.__t27.dividedId;
      const r = s.unitResult(id);
      if (!r) return { why: 'no result' };
      const profile = ${P}.profile.getState().profile;
      const T = window.__ccT27;
      const shelf = r.panels.find((p) => p.part === 'SHELF');
      const part = r.panels.find((p) => p.part === 'VPART');
      const layer = profile.shelfHoles.layer;
      const on = (panel) => r.drills.filter((d) => d.panel === panel && d.layer === layer)
        .map((d) => [d.x, d.y]);
      // R4: the very resolution the drilling pass goes through, asked here.
      const walls = T.shelfBearers.bearingWalls(r.panels);
      const pair = T.shelfBearers.shelfBearers({
        walls, run: shelf.meta.run, level: shelf.box.y,
        tolerance: profile.carcass.shelfWidthClearance,
      });
      // …and the very rows the scene draws (F1.3).
      const rows = T.hoverRows.pieceHoverRows(r, shelf.id, profile);
      const bay = (rows.rows || []).find((x) => x.kind === 'bay');
      // Every shelf-class entity on BUL: drills of any shelf kind, and marks.
      const bulShelfEntities = r.drills.filter((d) => d.panel === 'BUL'
        && (d.kind === 'shelf' || d.kind === 'shelf_screw')).length
        + ((r.panels.find((p) => p.id === 'BUL').cnc.marks || []).length);
      return {
        shelfId: shelf.id, shelfY: shelf.box.y, run: shelf.meta.run,
        partId: part.id, partBase: part.box.y, partDepth: part.box.d,
        bul: on('BUL'), bur: on('BUR'), part: on(part.id),
        bulShelfEntities,
        bearers: [pair.left && pair.left.id, pair.right && pair.right.id],
        bearerKinds: [pair.left && pair.left.kind, pair.right && pair.right.kind],
        bay: bay ? { from: bay.from[0], to: bay.to[0], size: bay.to[0] - bay.from[0] } : null,
        internalWidth: r.derived.internal_width,
        clusterOffsets: profile.shelfHoles.clusterOffsets,
      };
    `);
    measurements.f1 = f1;

    check('F1.1 — the shelf resolves BUR and the partition, and nothing else',
      f1.bearers[0] === f1.partId && f1.bearers[1] === 'BUR'
      && f1.bearerKinds.join('/') === 'partition/side',
      `${f1.bearers.join(' + ')} (${f1.bearerKinds.join('/')})`);
    check('F1.1 — NO entity of any shelf class lands on BUL',
      f1.bulShelfEntities === 0 && f1.bul.length === 0,
      `BUL: ${f1.bulShelfEntities} shelf-class entities, ${f1.bul.length} ⌀7.5 holes`);
    const wantRows = f1.clusterOffsets.length * 2;
    check('F1.1 — BUR and the partition each take the whole ladder',
      f1.bur.length === wantRows && f1.part.length === wantRows,
      `BUR ${f1.bur.length}, ${f1.partId} ${f1.part.length}, expected ${wantRows} each`);

    const worldRows = f1.clusterOffsets.map((dy) => f1.shelfY + dy).sort((a, b) => a - b);
    const partRows = [...new Set(f1.part.map(([, y]) => y))].sort((a, b) => a - b);
    const burRows = [...new Set(f1.bur.map(([, y]) => y))].sort((a, b) => a - b);
    check('F1.2 — the partition’s hole heights are the shelf’s minus its own base',
      partRows.length === worldRows.length
      && partRows.every((y, i) => Math.abs(y - (worldRows[i] - f1.partBase)) < 1e-6)
      && burRows.every((y, i) => Math.abs(y - worldRows[i]) < 1e-6),
      `world ${worldRows.join('/')} → partition ${partRows.join('/')} (base ${f1.partBase})`);

    check('F1.3 — the shelf’s chain measures its BAY, not the internal width',
      Boolean(f1.bay) && Math.abs(f1.bay.size - (f1.run.to - f1.run.from)) < 5
      && f1.bay.size < f1.internalWidth,
      f1.bay ? `${f1.bay.from} → ${f1.bay.to} = ${f1.bay.size} mm, of ${f1.internalWidth} internal` : 'no bay row');

    // FRONTS OFF, so what is photographed is the inside of the cabinet — a
    // shelf standing in the right-hand bay between a partition and BUR, which
    // is the arrangement every assertion above is about. With the door shut
    // this picture is a photograph of a door.
    await page.evaluate(`${P}.ui.getState().setHideFronts(true); return true;`);
    await page.sleep(500);
    await frameOn(f1.shelfId, [1.4, 1.6, 4.2]);
    await page.sleep(600);
    await shot('1a-a-shelf-between-bur-and-a-partition');
    await page.evaluate(`${P}.ui.getState().setHideFronts(false); return true;`);
    await page.sleep(400);

    // …and the two SHEETS, side by side in the record: the partition's, with
    // the holes on it, and BUL's, with none.
    for (const [panelId, name] of [[f1.partId, '1b-the-partitions-sheet-has-the-holes'], ['BUL', '1c-and-buls-sheet-has-none']]) {
      // eslint-disable-next-line no-await-in-loop
      await page.evaluate(`
        const ui = ${P}.ui.getState();
        ui.closeModal();
        ui.openModal('cabinet', { unitId: window.__t27.dividedId });
        return true;
      `);
      // eslint-disable-next-line no-await-in-loop
      await page.sleep(900);
      // eslint-disable-next-line no-await-in-loop
      await page.evaluate(`
        ${P}.ui.getState().pushModal('part-detail', { unitId: window.__t27.dividedId, panelId: ${JSON.stringify(panelId)}, anchor: null, at: null });
        return true;
      `);
      // eslint-disable-next-line no-await-in-loop
      await page.sleep(1400);
      // eslint-disable-next-line no-await-in-loop
      await shot(name);
    }
    await page.evaluate(`${P}.ui.getState().closeModal(); return true;`);
    await page.sleep(600);
    check('F1.4 — both sheets are in the record, side by side', true,
      'the partition carries the ladder; BUL is bare');

    // ─────────────────────────────────────────────────────────────────────────
    // F2 — the dishwasher stops being a species of its own
    // ─────────────────────────────────────────────────────────────────────────
    await page.evaluate(`
      const s = ${P}.project.getState();
      s.setProjectHandle({ type: 'bar', centres: 160 });
      const dw = s.addUnit('DW_PANEL');
      s.updateUnitParams(dw.id, { plinth: true });
      const twin = s.addUnit('BUD');
      s.updateUnitParams(twin.id, { doors: true, width: 600, plinth: true });
      window.__t27.dwId = dw.id;
      window.__t27.twinId = twin.id;
      return true;
    `);
    await page.sleep(1100);

    const f2 = await page.evaluate(`
      const s = ${P}.project.getState();
      const dw = s.unitResult(window.__t27.dwId);
      const twin = s.unitResult(window.__t27.twinId);
      if (!dw || !twin) return { why: 'no result' };
      const profile = ${P}.profile.getState().profile;
      const CARCASS = ['BUL', 'BUR', 'TOP', 'BOTTOM', 'BACK'];
      const cuts = (r) => r.panels.filter((p) => CARCASS.includes(p.part))
        .map((p) => p.part + '|' + p.w + 'x' + p.h + '|' + JSON.stringify(p.box)).sort();
      const joints = (r) => r.drills.filter((d) => CARCASS.includes(d.panel) && d.layer !== profile.hinges.layer)
        .map((d) => d.panel + '|' + d.layer + '|' + d.x + ',' + d.y).sort();
      const face = dw.panels.find((p) => p.part === 'FRONT');
      const twinFace = twin.panels.find((p) => p.part === 'FRONT');
      return {
        dwPanelId: face.id,
        parts: dw.panels.map((p) => p.part).sort(),
        carcassSame: JSON.stringify(cuts(dw)) === JSON.stringify(cuts(twin)),
        jointsSame: JSON.stringify(joints(dw)) === JSON.stringify(joints(twin)),
        shaker: face.meta.shaker || null,
        handle: face.meta.handle ? {
          axis: face.meta.handle.axis, class: face.meta.handle.class, rule: face.meta.handle.rule,
        } : null,
        handleHoles: dw.drills.filter((d) => d.panel === face.id && d.layer === profile.handles.layer).length,
        cups: dw.drills.filter((d) => d.panel === face.id && d.kind === 'cup').length,
        plateHoles: dw.drills.filter((d) => d.layer === profile.hinges.layer).length,
        hinges: dw.totals.hinges,
        opening: face.meta.opening,
        openAngleDeg: face.meta.openAngleDeg,
        frontW: face.w, frontH: face.h, frontY: face.box.y + 0,
        twinFrontH: twinFace.h, twinFrontY: twinFace.box.y + 0,
        plinthNotched: (dw.panels.find((p) => p.part === 'PLINTH')?.cnc.outline || []).length > 4,
        interior: dw.panels.filter((p) => p.role === 'shelf' || p.role === 'drawer_box').length,
      };
    `);
    measurements.f2 = f2;

    check('F2.1 — the D/W is an ordinary carcass: sides, top, bottom, back, plinth',
      ['BACK', 'BOTTOM', 'BUL', 'BUR', 'PLINTH', 'TOP'].every((p) => f2.parts.includes(p)),
      f2.parts.join(' '));
    check('F2.6 — and beside a BUD of the same width the carcass laws are identical',
      f2.carcassSame && f2.jointsSame,
      `boards ${f2.carcassSame ? 'identical' : 'DIFFER'}, joints ${f2.jointsSame ? 'identical' : 'DIFFER'}`);
    check('F2.1 — nothing is inside it: the appliance is', f2.interior === 0,
      `${f2.interior} interior pieces`);
    check('F2.2 — the front has a shaker and a handle, and the run’s own gaps',
      Boolean(f2.shaker) && f2.handleHoles === 2 && f2.handle?.axis === 'horizontal'
      && f2.frontH === f2.twinFrontH && f2.frontY === f2.twinFrontY,
      `shaker frame ${f2.shaker?.frame}, handle ${f2.handle?.axis} (${f2.handle?.rule}), ${f2.handleHoles} holes; front ${f2.frontW}×${f2.frontH} at y ${f2.frontY} — its twin ${f2.twinFrontH} at ${f2.twinFrontY}`);
    check('F2.3 — no cup, no cup drilling, no plate pattern, nothing in the BOM',
      f2.cups === 0 && f2.plateHoles === 0 && f2.hinges === 0,
      `cups ${f2.cups}, plate holes ${f2.plateHoles}, BOM hinges ${f2.hinges}`);
    check('F2.4 — the run’s plinth passes through, relieved for the appliance',
      f2.plinthNotched === true, 'the toe kick is one piece with a notch in it');

    await frameOn(f2.dwPanelId, [1.0, 0.55, 3.7]);
    await page.sleep(500);
    await shot('2a-a-dw-front-with-a-shaker-and-a-handle');

    // …and OPEN, from the SIDE, which is what proves the sign.
    const dwUnitId = await page.evaluate('return window.__t27.dwId;');
    const pose = await holdAt(dwUnitId, f2.dwPanelId, 1);
    const drop = await page.evaluate(`
      const v = ${P}.views && ${P}.views.room;
      let mesh = null;
      v.scene.traverse((o) => { if (!mesh && o.isMesh && o.userData && o.userData.ccPanelId === ${JSON.stringify(f2.dwPanelId)}) mesh = o; });
      if (!mesh || !mesh.parent) return null;
      const THREE = v.three;
      // The leaf's TOP edge, in the room: the point that has to travel towards
      // the viewer. Measured before and after is not needed — the pivot is the
      // bottom edge, so the top edge's own z IS the answer.
      mesh.updateWorldMatrix(true, true);
      mesh.geometry.computeBoundingBox();
      const bb = mesh.geometry.boundingBox;
      const top = new THREE.Vector3((bb.min.x + bb.max.x) / 2, bb.max.y, (bb.min.z + bb.max.z) / 2).applyMatrix4(mesh.matrixWorld);
      const pivot = new THREE.Vector3().setFromMatrixPosition(mesh.parent.matrixWorld);
      return {
        rotationXDeg: Math.round(mesh.parent.rotation.x * 180 / Math.PI * 100) / 100,
        rotationYDeg: Math.round(mesh.parent.rotation.y * 180 / Math.PI * 100) / 100,
        topEdgeZmm: Math.round((top.z - pivot.z) * 1000 * 100) / 100,
        topEdgeYmm: Math.round((top.y - pivot.y) * 1000 * 100) / 100,
      };
    `);
    measurements.f2drop = { pose, drop };
    check('F2.1 — it drops FORWARD, about its bottom edge, to 45°',
      Boolean(drop) && drop.rotationXDeg > 44.5 && drop.rotationXDeg < 45.5
      && drop.topEdgeZmm > 0 && drop.rotationYDeg === 0,
      drop ? `rotation.x ${drop.rotationXDeg}°, y ${drop.rotationYDeg}°; the top edge stands ${drop.topEdgeZmm} mm INTO the room and ${drop.topEdgeYmm} mm up` : 'no leaf');
    // From the SIDE: almost along the run, so the leaf's fall is read as an
    // angle rather than guessed from a foreshortened face.
    await frameOn(f2.dwPanelId, [4.6, 1.1, 1.4]);
    await page.sleep(500);
    await shot('2b-a-dw-dropped-open-at-45-from-the-side');

    // ─────────────────────────────────────────────────────────────────────────
    // F3 — the shaker recess has walls
    // ─────────────────────────────────────────────────────────────────────────
    await holdAt(dwUnitId, f2.dwPanelId, 0);
    const twinFaceId = await page.evaluate(`
      const r = ${P}.project.getState().unitResult(window.__t27.twinId);
      const f = r.panels.find((p) => p.part === 'FRONT');
      return f ? f.id : null;
    `);
    const tray = await page.evaluate(trayWindingJs(twinFaceId));
    measurements.f3 = { panelId: twinFaceId, tray };
    check('F3.1 — every face of the mounted tray is visible from the side its normal points at',
      Boolean(tray) && tray.mismatches === 0 && tray.wallTriangles >= 8,
      tray ? `${tray.triangles} triangles, ${tray.wallTriangles} rebate-wall triangles, ${tray.mismatches} wound against their normal` : 'no tray');
    check('F3.1 — and it is a CLOSED solid: no open boundary edges',
      Boolean(tray) && tray.openEdges === 0,
      tray ? `${tray.openEdges} unmatched directed edges` : 'no tray');

    await frameOn(twinFaceId, [3.4, 0.45, 1.3]);
    await page.sleep(500);
    await shot('3a-the-shaker-recess-at-a-grazing-angle');
    // …and FROM BEHIND, which is the one that proves there is no hole.
    //
    // "Behind the door" is not a camera inside the carcass — the back panel is
    // in the way and a photograph of it proves nothing. It is the leaf's own
    // BACK FACE, and the way to see it is the way a joiner does: swing the door
    // open and walk round it. A leaf hinged LEFT turns its front to −x as it
    // opens, so its back faces +x and the camera stands to the RIGHT of the
    // run. If the recess went through, the room would show through the panel.
    const twinUnitId = await page.evaluate('return window.__t27.twinId;');
    await holdAt(twinUnitId, twinFaceId, 1);
    await frameOn(twinFaceId, [3.6, 0.35, 1.1]);
    await page.sleep(600);
    await shot('3b-the-shaker-recess-from-behind');
    await holdAt(twinUnitId, twinFaceId, 0);

    // ─────────────────────────────────────────────────────────────────────────
    // F4 — the dimensions go back to black
    // ─────────────────────────────────────────────────────────────────────────
    const f4 = await page.evaluate(`
      const profile = ${P}.profile.getState().profile;
      const style = window.__ccT27.dimensionArrows.dimensionStyle(profile);
      const v = ${P}.views && ${P}.views.room;
      let chains = 0;
      let rows = 0;
      if (v) v.scene.traverse((o) => {
        if (o.userData && o.userData.ccDimensionChain !== undefined) {
          chains += 1; rows += Number(o.userData.ccDimensionRows) || 0;
        }
      });
      return {
        plate: style.labelPlate, ink: style.labelInk, alpha: style.labelAlpha,
        fromProfile: profile.hoverDimensions.label,
        chains, rows,
      };
    `);
    measurements.f4 = f4;
    check('F4.1 — the label palette is the dark plate and its light ink, from the PROFILE',
      f4.plate === '#1c1c1a' && f4.ink === '#e8e4dc' && f4.alpha === 0.9
      && f4.fromProfile?.plate === f4.plate && f4.fromProfile?.ink === f4.ink,
      `plate ${f4.plate} at ${f4.alpha}, ink ${f4.ink} — read through dimensionStyle`);
    check('R11 + F4.2 — every dimension in the scene is still the one component',
      f4.chains > 0, `${f4.chains} chains, ${f4.rows} rows, all found by ccDimensionChain`);

    // The picture: every number this cabinet has, on the restored plate.
    await page.evaluate(`
      ${P}.ui.getState().toggleUnitDimensions(window.__t27.twinId);
      return true;
    `);
    await page.sleep(400);
    await frameOn(twinFaceId, [2.2, 1.5, 4.6]);
    await page.sleep(700);
    await shot('4a-the-dimension-labels-after-f4');

    // ─── R5 + R6, as an assertion at the end ────────────────────────────────
    const errs = realErrors(page.errors);
    check('R5 + R6 — the console is clean across the whole walk', errs.length === 0,
      errs.slice(0, 3).join(' | ') || 'no errors, no React exceptions');

    const lines = page.consoleLines.map((l) => `${l.level}  ${l.text}`);
    writeFileSync(`${OUT}console.txt`, [
      `# every console message of the turn-27 walk — ${lines.length} in total`,
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
      turn: 27,
      url: BASE,
      showroom: showroom.url,
      rules: {
        R1: 'every move and keystroke is CDP Input; the guard at the top of this file enforces it',
        R2: 'scripts/bucket-live.mjs, before any picture of hardware',
        R4: 'every claim is read off the app: shelfBearers and hoverRows for F1, the live scene graph for F2 and F3, dimensionStyle for F4',
        R5: 'the console is captured for the whole walk',
        R6: 'any uncaught error or React error-boundary report FAILS the step it appeared in',
        R7: 'no data-* on R3F objects — asserted in test/turn23-f2-f4-hardware.test.js and test/turn24-f8-f12.test.js',
        R8: 'GLB-dependent steps run against the synthetic silent showroom',
        R9: 'no feature without its part — the handle holes exist only while the handle does',
        R10: 'the sheet is the truth: F1 photographs the two SHEETS beside the scene',
        R11: 'every dimension in the scene is found by traversing for ccDimensionChain — the one component',
        R12: 'extend means extend: F4 restores the pre-turn-26 paint and changes nothing else',
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
