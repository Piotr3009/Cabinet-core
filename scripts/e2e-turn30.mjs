// ─── Turn 30, the acceptance walk, in a real Chromium ───────────────────────
//
// Run:  npm run build
//       npx vite preview --port 4173 &
//       node scripts/e2e-turn30.mjs
//
// The fixture server (R8) is started by this script; the app preview is not,
// because a walk that builds its own app cannot prove the build somebody else
// is about to ship.
//
// ─── WHAT THIS TURN'S PROOFS HAVE TO DO ─────────────────────────────────────
//
// CLAUDE.md rule 2: "Proof screenshots in `verify/t30/`, each containing its
// named subject. An empty frame fails the phase." So every picture below is
// framed off the MOUNTED MESHES of the thing it names — never off a hand-typed
// camera position — and the reading beside it comes off the scene graph or off
// the engine's own output, not off a flag the app set on the way there.
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
// silent showroom — which from this turn carries a 155° family, because F1's
// whole subject is a file `71B3550` cannot stand in for.

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
const OUT = argOf('--out', new URL('../verify/t30/', import.meta.url).pathname);
const ONLY = argOf('--only', null);

// R1's guard, and it is a guard rather than a promise.
const BANNED = ['dispatch', 'Event('].join('');
const SELF = readFileSync(new URL(import.meta.url), 'utf8');
if (SELF.includes(`.${BANNED}`)) {
  throw new Error(`R1: a pointer gesture in this walk is using ${BANNED}. Use CDP input.`);
}

const steps = [];
const P = 'window.__cc';

// A favicon nobody asked for is not a React exception. Neither is the storage
// host refusing to answer: that is R2's blocker, recorded in `bucket-live.json`
// and in `walk.json`. Everything else fails the step it appears in.
const IGNORED = [/favicon\.ico/i, /supabase\.co\/storage/i];
const realErrors = (list) => list.filter((e) => !IGNORED.some((rx) => rx.test(String(e))));

// ─── READERS ────────────────────────────────────────────────────────────────

/**
 * The two members of one hinge, in the room, plus what the FILE under them is.
 *
 * Turn 29 wrote this to prove the fold. Turn 30 needs one thing more from it —
 * `deepestMm`, how far the mounted body reaches into its leaf, measured off the
 * mounted meshes in the LEAF's own frame. That number is F1: on the 155° file
 * it used to be 17 and the door would not open.
 */
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
  // ─── HOW DEEP, MEASURED IN THE LEAF'S OWN FRAME ────────────────────────
  //
  // The reading F1 turns on. It has to be taken in the frame the door was
  // DRILLED in, so it must survive the leaf swinging — and that rules out
  // Box3.setFromObject, which returns a WORLD axis-aligned box: bringing one
  // of those back through the leaf's inverse gives the box OF a box, and at
  // 110° it reads 194 mm on a hinge that has not moved a micron relative to
  // its own leaf. (It did. That is why this comment is here.)
  //
  // So each mesh's OWN geometry box is transformed corner by corner by
  // leaf-inverse times mesh, which is exact for the boxes and cylinders a
  // hinge is made of and is invariant under any rotation of the leaf.
  leaf.updateWorldMatrix(true, true);
  const inv = new THREE.Matrix4().copy(leaf.matrixWorld).invert();
  const localBox = (root) => {
    const out = new THREE.Box3();
    // true, TRUE: ancestors AND descendants. The meshes are inside a cloned
    // GLB several groups down, and a parent-only refresh leaves their own
    // matrixWorld from whenever three last rendered them — which on the very
    // first reading of a walk is never, and reads as a metre and a quarter.
    root.updateWorldMatrix(true, true);
    root.traverse((n) => {
      if (!n.isMesh || !n.geometry) return;
      if (!n.geometry.boundingBox) n.geometry.computeBoundingBox();
      const g = n.geometry.boundingBox;
      const m = new THREE.Matrix4().multiplyMatrices(inv, n.matrixWorld);
      for (const x of [g.min.x, g.max.x]) {
        for (const y of [g.min.y, g.max.y]) {
          for (const z of [g.min.z, g.max.z]) {
            out.expandByPoint(new THREE.Vector3(x, y, z).applyMatrix4(m));
          }
        }
      }
    });
    return out;
  };
  const leafBox = localBox(leaf);
  const read = (o, kind) => {
    const p = o.userData.ccHingePivotMm || { x: 0, z: 0 };
    const s = o.userData.ccHingeMirror || 1;
    const knuckle = kind === 'A'
      ? o.localToWorld(new THREE.Vector3(p.x * mmv, 0, p.z * mmv))
      : (o.userData.ccHingeJoint
        ? o.userData.ccHingeJoint.getWorldPosition(new THREE.Vector3())
        : o.getWorldPosition(new THREE.Vector3()));
    const q = (o.userData.ccHingeJoint || o).getWorldQuaternion(new THREE.Quaternion());
    // How far this member reaches into the leaf, in the LEAF's own frame.
    const box = localBox(o);
    return {
      knuckle: [knuckle.x, knuckle.y, knuckle.z],
      quat: [q.x, q.y, q.z, q.w],
      ridesLeaf: ancestors(o).includes(leafGroup),
      fold: o.userData.ccHingeFold ?? null,
      mirror: s,
      pivotMm: p,
      nodes: o.userData.ccHingeMemberNodes || null,
      // + is INTO the leaf from its inner face, in millimetres.
      deepestMm: (box.max.z - leafBox.min.z) / mmv,
      leafThickMm: (leafBox.max.z - leafBox.min.z) / mmv,
    };
  };
  return {
    a: members.A.map((o) => read(o, 'A')),
    b: members.B.map((o) => read(o, 'B')),
    leafQuat: leafGroup ? (() => { const q = leafGroup.getWorldQuaternion(new THREE.Quaternion()); return [q.x, q.y, q.z, q.w]; })() : null,
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
   * CLAUDE.md rule 2: a proof screenshot must CONTAIN ITS NAMED SUBJECT.
   * Framing off the unit's own mounted meshes — rather than off a hand-typed
   * position — is what makes a picture contain the thing it names whatever the
   * room happens to be arranged like.
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

  /** Frame on the HINGE ROW of one leaf — the ironmongery, not the cabinet. */
  const frameHinges = async (panelId, offset = [1.5, 0.2, 1.6]) => page.evaluate(`
    const v = ${P}.views && ${P}.views.room;
    if (!v) return null;
    const THREE = v.three;
    const want = ${JSON.stringify(panelId)};
    const box = new THREE.Box3();
    let found = 0;
    v.scene.traverse((o) => {
      if (!o.userData || o.userData.ccHingePanel !== want) return;
      box.expandByObject(o);
      found += 1;
    });
    if (!found) return null;
    const c = box.getCenter(new THREE.Vector3());
    const r = Math.max(0.06, box.getSize(new THREE.Vector3()).length() / 2);
    const off = ${JSON.stringify(offset)};
    v.camera.position.set(c.x + off[0] * r, c.y + off[1] * r, c.z + off[2] * r);
    v.camera.lookAt(c);
    v.camera.updateProjectionMatrix();
    if (v.controls && v.controls.target) { v.controls.target.copy(c); v.controls.update(); }
    return found;
  `);

  const measurements = {};
  const want = (id) => !ONLY || ONLY.split(',').includes(id);

  try {
    // ── R2, first, and before any picture of hardware ──────────────────────
    let bucket = null;
    try {
      // R2 must not be able to HANG the walk. This container's proxy answers
      // the storage host by opening a tunnel and never closing it, so a bare
      // `fetch` waits for ever and the whole night stalls on the one step that
      // is already known to be blocked. A minute is generous for a manifest.
      bucket = await Promise.race([
        checkLiveBucket(),
        new Promise((resolve) => {
          setTimeout(() => resolve({ ok: false, error: 'timed out after 60 s — the egress proxy never answered' }), 60000);
        }),
      ]);
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

    const newRoom = async (name) => page.evaluate(`
      const s = ${P}.project.getState();
      s.newProject(${JSON.stringify(name)}, {
        room: {
          height: 2500,
          corners: [{ x: 0, y: 0 }, { x: 12000, y: 0 }, { x: 12000, y: 3600 }, { x: 0, y: 3600 }],
        },
      });
      ${P}.ui.getState().openEditor();
      ${P}.ui.getState().closeModal();
      ${P}.ui.getState().closeLibrary();
      return true;
    `);

    /**
     * Swing a set of leaves to `deg` and WAIT for them to arrive.
     *
     * The door EASES to its angle (`MovingPanel`, delta × 8), so a reading
     * taken after a guessed sleep is a reading of nothing.
     */
    const swingTo = async (unitId, leafIds, deg, swingDeg) => {
      await page.evaluate(`
        const open = ${deg} / ${swingDeg};
        const map = {};
        for (const id of ${JSON.stringify(leafIds)}) map[id] = open;
        ${P}.ui.setState((s) => ({ openFronts: { ...s.openFronts, [${JSON.stringify(unitId)}]: map } }));
        return true;
      `);
      await page.waitFor(`(() => {
        const v = ${P}.views && ${P}.views.room;
        if (!v) return false;
        const want = ${JSON.stringify(leafIds)};
        let ok = 0;
        v.scene.traverse((o) => {
          if (!o.isMesh || !o.userData || !want.includes(o.userData.ccPanelId) || !o.parent) return;
          if (Math.abs(Math.abs((o.parent.rotation.y * 180) / Math.PI) - ${deg}) < 0.6) ok += 1;
        });
        return ok >= want.length;
      })()`, { what: `the leaves at ${deg}°`, timeout: 20000 });
      await page.sleep(400);
    };

    // ═══════════════════════════════════════════════════════════════════════
    // F1 [CRITICAL] — the hinge body stands on its ABSOLUTE datum
    // ═══════════════════════════════════════════════════════════════════════
    //
    // The owner's fault, in his words: a 155° hinge "jest za głęboko osadzony
    // w drzwiach i się nie otwiera." The reading that decides it is not a flag
    // and not an arithmetic — it is how far the MOUNTED body reaches into the
    // MOUNTED leaf, measured off the scene graph in the leaf's own frame, on
    // both files and on both hands.
    if (want('f1')) {
      await newRoom('Turn 30 walk — F1');
      await page.evaluate(`
        const s = ${P}.project.getState();
        // ONE cabinet, TWO leaves — one hung left, one hung right — so both
        // hands are read in one scene and the mirror has nowhere to hide.
        const pair = s.addUnit('BUD');
        s.updateUnitParams(pair.id, { width: 900, doors: { count: 2 } });
        const r = s.unitResult(pair.id);
        window.__t30 = {
          pairId: pair.id,
          leaves: r.panels.filter((p) => p.part === 'FRONT').map((p) => ({ id: p.id, hinge: p.meta.hinge })),
        };
        ${P}.ui.getState().setShowHinges(true);
        return true;
      `);
      await page.waitFor('document.querySelector("canvas")', { what: 'the 3D canvas' });
      // The GLB has to ARRIVE before a mounted body can be measured: a missing
      // file is the procedural path and would prove nothing about a datum.
      await page.waitFor(`(() => {
        const v = ${P}.views && ${P}.views.room;
        if (!v) return false;
        let n = 0;
        v.scene.traverse((o) => { if (o.userData && o.userData.ccHingeMember) n += 1; });
        return n >= 4;
      })()`, { what: 'the hinge models to mount', timeout: 30000 });
      await page.sleep(700);

      const leaves = await page.evaluate('return window.__t30.leaves;');
      const swingDeg = await page.evaluate(`
        const s = ${P}.project.getState();
        const profile = ${P}.profile.getState().profile;
        const r = s.unitResult(window.__t30.pairId);
        const leaf = r.panels.find((p) => p.part === 'FRONT');
        return (window.__ccT21.doors.doorOpenAngle({
          doorWidth: leaf.w, hingeOffset: profile.doors.gap / 2, gapToWall: null,
        }, profile) * 180) / Math.PI;
      `);

      // Which FILE each leaf is wearing — asked of the engine, which is where
      // the catalogue rule lives, so the walk names the file rather than
      // assuming one.
      const filesOf = async () => page.evaluate(`
        const s = ${P}.project.getState();
        const u = s.units.find((x) => x.id === window.__t30.pairId);
        const r = s.unitResult(u.id);
        const specs = window.__ccHinges.hingeSpecsFor({
          result: r, unit: u, finish: null, plate: null,
        });
        return Object.fromEntries(Object.entries(specs).map(([k, v]) => [k, { file: v.file, angle: v.angle, family: v.family }]));
      `);

      const rig = { 110: [], 155: [] };
      for (const angle of [110, 155]) {
        if (angle === 155) {
          // The 155° family, chosen the way a joiner chooses one: the door's
          // own hinge assignment, the very map `HingeModal`'s "assign other
          // hinge" writes. The wardrobe rule reaches the same file; this
          // reaches it on a cabinet the walk can already see.
          // eslint-disable-next-line no-await-in-loop
          await page.evaluate(`
            const s = ${P}.project.getState();
            for (const l of window.__t30.leaves) s.assignDoorHinge(window.__t30.pairId, l.id, '71B7550');
            return true;
          `);
          // eslint-disable-next-line no-await-in-loop
          await page.waitFor(`(() => {
            const v = ${P}.views && ${P}.views.room;
            if (!v) return false;
            let n = 0;
            v.scene.traverse((o) => { if (o.userData && o.userData.ccHingeMember) n += 1; });
            return n >= 4;
          })()`, { what: 'the 155° models to mount', timeout: 30000 });
          // eslint-disable-next-line no-await-in-loop
          await page.sleep(900);
        }
        // eslint-disable-next-line no-await-in-loop
        const files = await filesOf();
        // eslint-disable-next-line no-await-in-loop
        check(`F1 — the leaves really are wearing the ${angle}° file`,
          Object.values(files).every((f) => f.angle === angle && f.file && f.file.includes(angle === 155 ? '71B7550' : '71B3550')),
          Object.entries(files).map(([k, v]) => `${k}: ${String(v.file).split('/').pop()} (${v.angle}°)`).join(' · '));

        for (const deg of [0, 90, 110]) {
          // eslint-disable-next-line no-await-in-loop
          await swingTo(await page.evaluate('return window.__t30.pairId;'), leaves.map((l) => l.id), deg, swingDeg);
          for (const leaf of leaves) {
            // eslint-disable-next-line no-await-in-loop
            const read = await page.evaluate(hingeJs(leaf.id));
            rig[angle].push({ deg, leaf: leaf.id, hinge: leaf.hinge, read });
          }
        }
        // Shut again before the next file, so 0° is 0° and not a leftover.
        // eslint-disable-next-line no-await-in-loop
        await swingTo(await page.evaluate('return window.__t30.pairId;'), leaves.map((l) => l.id), 0, swingDeg);
      }
      measurements.f1 = { swingDeg, rig };

      // ─── THE LAW ────────────────────────────────────────────────────────
      // The cup is bored 11 mm into the leaf, and NOTHING the model draws may
      // go deeper than the hole drilled for it. That is the sentence F1 is
      // about, and it is now asked of the 155° file too.
      // ─── WHICH HALF IS ASKED WHAT, AND WHY ──────────────────────────────
      //
      // MEMBER A is the half clipped INTO the door — the cup, its flange, the
      // clip cap, the link cover. It is RIGID IN THE LEAF, so the leaf's own
      // frame is its frame at every angle, and "no deeper than the hole
      // drilled for it" is a law that holds at 0° and at 110° alike. This is
      // the law the owner's 155° hinge broke, and it is asked here at three
      // angles on both hands on both files.
      //
      // MEMBER B is bolted to the PLATE on the carcass. It keeps the carcass's
      // attitude while the leaf swings away from it, so in the LEAF's rotating
      // frame it appears to sweep — a reading of "how deep into the leaf" at
      // 110° would be measuring the frame's rotation, not the metal. The
      // question that means something is asked where it means it: with the
      // door SHUT, the arm must lie BEHIND the leaf's inner face, in the
      // carcass opening, which is where a CLIP top's arm lives.
      const bore = 11;
      for (const angle of [110, 155]) {
        const cup = rig[angle].map((r) => Math.max(...(r.read?.a || []).map((m) => m.deepestMm)));
        const thick = rig[angle][0]?.read?.a?.[0]?.leafThickMm;
        check(`F1 — the ${angle}° CUP reaches no deeper than its own ⌀35 bore, at 0°/90°/110°, both hands`,
          cup.every((d) => Number.isFinite(d) && d <= bore + 0.05),
          `${rig[angle].map((r, i) => `${r.hinge}@${r.deg}°: ${cup[i].toFixed(2)}`).join(' · ')} mm into a ${Number(thick).toFixed(0)} mm leaf (bore ${bore})`);
        const shutRows = rig[angle].filter((r) => r.deg === 0);
        const armShut = shutRows.map((r) => Math.max(...(r.read?.b || []).map((m) => m.deepestMm)));
        check(`F1 — …and with the door SHUT the ${angle}° ARM lies behind the leaf, not in it`,
          armShut.every((d) => Number.isFinite(d) && d <= 0),
          shutRows.map((r, i) => `${r.hinge}: ${armShut[i].toFixed(2)} mm`).join(' · '));
      }
      // …and the two files agree, which is the whole claim of one authoring
      // frame: a 155° hinge sits where a 110° hinge sits.
      const depth110 = rig[110].map((r) => Math.max(...(r.read?.a || []).map((m) => m.deepestMm)));
      const depth155 = rig[155].map((r) => Math.max(...(r.read?.a || []).map((m) => m.deepestMm)));
      check('F1 — the 155° cup sits exactly where the 110° cup sits',
        depth110.every((d, i) => Math.abs(d - depth155[i]) < 0.05),
        depth110.map((d, i) => `${rig[110][i].hinge}@${rig[110][i].deg}°: ${d.toFixed(2)} vs ${depth155[i].toFixed(2)}`).join(' · '));

      // The knuckle, and the fold, on the file that used to break them.
      const gaps = rig[155].map((r) => {
        const a = r.read?.a?.[0];
        const b = r.read?.b?.[0];
        return a && b ? dist(a.knuckle, b.knuckle) : Infinity;
      });
      check('F1 — the 155° hinge’s knuckle is still ONE point, at 0°/90°/110°, both hands',
        gaps.every((g) => g < 0.25),
        rig[155].map((r, i) => `${r.hinge}@${r.deg}°: ${gaps[i].toFixed(3)} mm`).join(' · '));
      const pins = rig[155].map((r) => r.read?.b?.[0]?.pivotMm);
      check('F1 — …on the MEASURED pin, unmoved by the bigger file',
        pins.every((p) => p && Math.abs(p.x - -10.33) < 0.01 && Math.abs(p.z - 2.56) < 0.01),
        pins[0] ? `(${pins[0].x}, 0, ${pins[0].z}) mm from the cup centre` : 'no pin');
      const shut = Object.fromEntries(rig[155].filter((r) => r.deg === 0).map((r) => [r.leaf, r.read]));
      const attitudes = rig[155].map((r) => (shut[r.leaf] && r.read?.b?.[0]
        ? angleBetween(r.read.b[0].quat, shut[r.leaf].b[0].quat) : 999));
      check('F1 — …and the arm still keeps the CARCASS’s attitude',
        attitudes.every((a) => a < 0.6),
        rig[155].map((r, i) => `${r.hinge}@${r.deg}°: ${attitudes[i].toFixed(3)}°`).join(' · '));

      // ─── THE PICTURES ───────────────────────────────────────────────────
      const pairId = await page.evaluate('return window.__t30.pairId;');
      const L = leaves.find((l) => l.hinge === 'L') || leaves[0];
      const R = leaves.find((l) => l.hinge === 'R') || leaves[1] || leaves[0];
      for (const [deg, tag] of [[0, 'closed'], [90, '90'], [110, '110']]) {
        // eslint-disable-next-line no-await-in-loop
        await swingTo(pairId, leaves.map((l) => l.id), deg, swingDeg);
        // eslint-disable-next-line no-await-in-loop
        await frameHinges(L.id, [1.7, 0.15, 1.5]);
        // eslint-disable-next-line no-await-in-loop
        await page.sleep(700);
        // eslint-disable-next-line no-await-in-loop
        await shot(`1a-155-left-hand-${tag}-cup-in-its-bore`);
        // eslint-disable-next-line no-await-in-loop
        await frameHinges(R.id, [-1.7, 0.15, 1.5]);
        // eslint-disable-next-line no-await-in-loop
        await page.sleep(700);
        // eslint-disable-next-line no-await-in-loop
        await shot(`1b-155-right-hand-${tag}-cup-in-its-bore`);
      }
      await swingTo(pairId, leaves.map((l) => l.id), 90, swingDeg);
      await frameUnits([pairId], [0.9, 0.5, 1.4]);
      await page.sleep(800);
      await shot('1c-155-both-hands-open-the-doors-do-open');

      // …and the same three angles on the 110° file, so the pair can be
      // compared rather than believed.
      await page.evaluate(`
        const s = ${P}.project.getState();
        for (const l of window.__t30.leaves) s.assignDoorHinge(window.__t30.pairId, l.id, null);
        return true;
      `);
      await page.sleep(1400);
      for (const [deg, tag] of [[0, 'closed'], [90, '90'], [110, '110']]) {
        // eslint-disable-next-line no-await-in-loop
        await swingTo(pairId, leaves.map((l) => l.id), deg, swingDeg);
        // eslint-disable-next-line no-await-in-loop
        await frameHinges(L.id, [1.7, 0.15, 1.5]);
        // eslint-disable-next-line no-await-in-loop
        await page.sleep(700);
        // eslint-disable-next-line no-await-in-loop
        await shot(`1d-110-left-hand-${tag}-cup-in-its-bore`);
      }
      await frameHinges(R.id, [-1.7, 0.15, 1.5]);
      await page.sleep(700);
      await shot('1e-110-right-hand-110-cup-in-its-bore');
      await page.evaluate(`${P}.ui.setState({ openFronts: {} }); return true;`);
      await page.sleep(500);
    }

    // ─── R5 + R6, as an assertion at the end ────────────────────────────────
    const errs = realErrors(page.errors);
    check('R6 — the console is clean for the whole walk', errs.length === 0, errs.slice(0, 3).join(' | '));
    writeFileSync(`${OUT}console.txt`, `${page.consoleLines.map((l) => `${l.level}  ${l.text}`).join('\n')}\n`);
  } finally {
    writeFileSync(`${OUT}measurements.json`, `${JSON.stringify(measurements, null, 1)}\n`);
    writeFileSync(`${OUT}walk.json`, `${JSON.stringify({ steps }, null, 1)}\n`);
    await page.close();
    await showroom.close();
  }

  const failed = steps.filter((s) => s.ok === false);
  const blockedCount = steps.filter((s) => s.ok === null).length;
  console.log(`\n${steps.length - failed.length - blockedCount} ok · ${failed.length} failed · ${blockedCount} blocked`);
  if (failed.length) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
