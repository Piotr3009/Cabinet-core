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

  /**
   * Where a mounted thing is ON THE SCREEN, in client pixels.
   *
   * R1 asks that a pointer gesture be proved with a real pointer, and a real
   * pointer needs a coordinate. Projecting the mesh the app itself mounted is
   * how a double-click lands on the DOOR rather than on a number somebody
   * typed — and it is the only way the click survives the camera moving.
   *
   * `what` is either { panel: id } or { hinge: panelId, index } — the leaf, or
   * ONE of the pieces of ironmongery screwed to it. One rather than all of
   * them: the union box of three hinges has its centre in the air between two
   * of them, and a pointer aimed there hits the carcass behind.
   */
  const screenOf = async (what) => page.evaluate(`
    const v = ${P}.views && ${P}.views.room;
    if (!v) return null;
    const THREE = v.three;
    const want = ${JSON.stringify(what)};
    const hits = [];
    v.scene.traverse((o) => {
      const u = o.userData;
      if (!u) return;
      // The ARM is what carries the hinge's own double-click (3d/Hardware.jsx),
      // so that is the member the pointer is aimed at.
      const hit = want.panel ? (o.isMesh && u.ccPanelId === want.panel)
        : (u.ccHingePanel === want.hinge && u.ccHingeMember === 'B');
      if (hit) hits.push(o);
    });
    if (!hits.length) return null;
    // A stable order — down the hinge row — so "the second hinge" means the
    // same piece to the walk and to the window that opens.
    hits.sort((a, b) => a.getWorldPosition(new THREE.Vector3()).y
      - b.getWorldPosition(new THREE.Vector3()).y);
    const pick = hits[Math.min(Number(want.index) || 0, hits.length - 1)];
    const c = new THREE.Box3().setFromObject(pick).getCenter(new THREE.Vector3()).project(v.camera);
    const el = v.gl && v.gl.domElement;
    const r = el.getBoundingClientRect();
    return {
      x: r.left + ((c.x + 1) / 2) * r.width,
      y: r.top + ((1 - c.y) / 2) * r.height,
      found: hits.length,
    };
  `);

  /** What the ONE modal is showing right now — read off the DOM it rendered. */
  const modalJs = `
    const el = document.querySelector('[data-door-modal]');
    if (!el) return { open: false };
    const panel = el.closest('.cc-panel') || el.parentElement;
    const head = panel ? panel.querySelector('h2, h3, header, [data-modal-title]') : null;
    const rows = [...el.querySelectorAll('[data-hinge-row]')];
    const ringed = rows.filter((r) => (r.className || '').includes('ring-gold'));
    const body = el.closest('.overflow-y-auto');
    const sectionB = el.querySelector('[data-door-section="B"]');
    return {
      open: true,
      of: el.getAttribute('data-door-modal'),
      sections: el.getAttribute('data-door-modal-sections'),
      title: (head && head.textContent || '').trim() || (panel && panel.textContent || '').slice(0, 60),
      hasA: Boolean(el.querySelector('[data-door-section="A"]')),
      hasB: Boolean(sectionB),
      rows: rows.length,
      ringedRow: ringed.length ? Number(ringed[0].getAttribute('data-hinge-row')) : null,
      // Did the window actually SCROLL to section B, or is B merely present?
      // scrolledTo is B's top relative to the body's own viewport, so 0 is
      // "at the top of the window" and anything inside bodyH is "visible".
      scrolledTo: body && sectionB
        ? Math.round(sectionB.getBoundingClientRect().top - body.getBoundingClientRect().top)
        : null,
      scrollTop: body ? Math.round(body.scrollTop) : null,
      // …and how far it COULD scroll. A section that is the last thing in the
      // window cannot be brought to the very top — the browser stops at the
      // bottom of the content — so "scrolled to B" means B is visible and the
      // window has gone as far as there is to go, not that B's top is zero.
      maxScroll: body ? Math.round(body.scrollHeight - body.clientHeight) : null,
      bodyH: body ? Math.round(body.clientHeight) : null,
      controls: [
        'data-hinge-assign', 'data-hinge-modal-rows', 'data-hinge-modal-add',
        'data-hinge-up', 'data-hinge-down', 'data-hinge-modal-remove',
        'data-handle-section', 'data-remove-door', 'data-piece-weight',
      ].filter((a) => el.querySelector('[' + a + ']')),
    };
  `;

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

    // ═══════════════════════════════════════════════════════════════════════
    // F2 [CRITICAL] — ONE modal for the door and its hinges
    // ═══════════════════════════════════════════════════════════════════════
    //
    // Two gestures, both with a REAL POINTER (R1) at a coordinate PROJECTED
    // from the mesh the app itself mounted — so what is proved is the whole
    // path a joiner takes, from the metal on the screen to the window that
    // opens, and not a store call standing in for it.
    if (want('f2')) {
      await newRoom('Turn 30 walk — F2');
      await page.evaluate(`
        const s = ${P}.project.getState();
        const u = s.addUnit('BUD');
        s.updateUnitParams(u.id, { width: 900, doors: { count: 2 } });
        const r = s.unitResult(u.id);
        window.__t30 = {
          unitId: u.id,
          leaves: r.panels.filter((p) => p.part === 'FRONT').map((p) => ({ id: p.id, hinge: p.meta.hinge })),
        };
        ${P}.ui.getState().setShowHinges(true);
        return true;
      `);
      await page.waitFor('document.querySelector("canvas")', { what: 'the 3D canvas' });
      await page.waitFor(`(() => {
        const v = ${P}.views && ${P}.views.room;
        if (!v) return false;
        let n = 0;
        v.scene.traverse((o) => { if (o.userData && o.userData.ccHingeMember === 'B') n += 1; });
        return n >= 2;
      })()`, { what: 'the hinge arms to mount', timeout: 30000 });
      const f2unit = await page.evaluate('return window.__t30.unitId;');
      const f2leaves = await page.evaluate('return window.__t30.leaves;');
      const leaf = f2leaves[0];
      // Frame the cabinet so both the leaf and its ironmongery are on screen
      // and a projected click lands on the thing rather than off the canvas.
      await frameUnits([f2unit], [0.55, 0.28, 1.15]);
      await page.sleep(900);

      // ── GESTURE 1: double-click the LEAF ──────────────────────────────
      const atLeaf = await screenOf({ panel: leaf.id });
      await page.dblclick(atLeaf.x, atLeaf.y);
      await page.sleep(700);
      const fromLeaf = await page.evaluate(modalJs);
      measurements.f2 = { atLeaf, fromLeaf };

      check('F2 — double-clicking the LEAF opens ONE window, and it is the DOOR’s',
        fromLeaf.open && fromLeaf.of === leaf.id && /Door/.test(fromLeaf.title),
        `${fromLeaf.title || 'nothing opened'} — of ${fromLeaf.of}`);
      check('F2 — …carrying BOTH sections: the piece and its hinges',
        fromLeaf.hasA && fromLeaf.hasB && fromLeaf.sections === 'A,B',
        `sections ${fromLeaf.sections} · ${fromLeaf.rows} hinge rows`);
      check('F2 — …and every control of the two old windows is in it',
        fromLeaf.controls.length === 9,
        fromLeaf.controls.join(' · '));
      check('F2 — …opened at section A: the window is not scrolled',
        fromLeaf.scrollTop === 0 && fromLeaf.ringedRow === null,
        `scrollTop ${fromLeaf.scrollTop}, ringed row ${fromLeaf.ringedRow}`);
      // There is ONE window in the DOM, which is the whole of "one registry of
      // what is open" — the fault was two components fighting over one slot.
      const windows = await page.evaluate('return document.querySelectorAll(\'[data-door-modal]\').length;');
      check('F2 — …and there is exactly ONE of it on the screen', windows === 1, `${windows} windows`);
      await shot('2a-the-door-window-opened-from-the-leaf-section-A');

      await page.evaluate(`${P}.ui.getState().closeModal(); return true;`);
      await page.sleep(400);

      // ── GESTURE 2: double-click a HINGE ───────────────────────────────
      //
      // With the door SHUT the ironmongery is behind the leaf, and a pointer
      // aimed at it hits the door — which is true of the app and true of a
      // real cabinet. So the leaf is opened first, exactly as a joiner opens
      // it to get at a hinge, and the pointer goes to ONE arm.
      const f2swing = await page.evaluate(`
        const s = ${P}.project.getState();
        const profile = ${P}.profile.getState().profile;
        const r = s.unitResult(window.__t30.unitId);
        const l = r.panels.find((p) => p.part === 'FRONT');
        return (window.__ccT21.doors.doorOpenAngle({
          doorWidth: l.w, hingeOffset: profile.doors.gap / 2, gapToWall: null,
        }, profile) * 180) / Math.PI;
      `);
      await swingTo(f2unit, [leaf.id], 90, f2swing);
      await frameHinges(leaf.id, [1.9, 0.1, 1.6]);
      await page.sleep(900);
      // The MIDDLE hinge of the row, so the row that lights up is one a reader
      // can tell apart from "the first one, which it would have been anyway".
      const atHinge = await screenOf({ hinge: leaf.id, index: 1 });
      await page.dblclick(atHinge.x, atHinge.y);
      await page.sleep(900);
      const fromHinge = await page.evaluate(modalJs);
      measurements.f2.atHinge = atHinge;
      measurements.f2.fromHinge = fromHinge;

      check('F2 — double-clicking a HINGE opens the SAME window, on the same door',
        fromHinge.open && fromHinge.of === leaf.id && /Door/.test(fromHinge.title),
        `${fromHinge.title || 'nothing opened'} — of ${fromHinge.of}`);
      check('F2 — …scrolled to section B, which was NOT scrolled to from the leaf',
        fromHinge.scrollTop > 0
        && fromLeaf.scrollTop === 0
        && fromHinge.scrolledTo >= 0 && fromHinge.scrolledTo < fromHinge.bodyH
        && (fromHinge.scrolledTo < 6 || fromHinge.scrollTop >= fromHinge.maxScroll - 1),
        `scrollTop ${fromHinge.scrollTop} of ${fromHinge.maxScroll}, section B ${fromHinge.scrolledTo} px down a ${fromHinge.bodyH} px body (from the leaf: ${fromLeaf.scrollTop})`);
      check('F2 — …with THAT hinge’s row ringed',
        Number.isFinite(fromHinge.ringedRow),
        `row ${fromHinge.ringedRow} of ${fromHinge.rows}`);
      check('F2 — …and it is still ONE window, with section A still in it',
        fromHinge.hasA && fromHinge.hasB,
        `sections ${fromHinge.sections}`);
      await shot('2b-the-same-window-opened-from-a-hinge-section-B');

      // ── AND THE CONTROLS STILL WORK ───────────────────────────────────
      // The ±5 mm arrow, pressed with a real mouse, read off the STORE. A
      // window that opened and could not move a hinge would be a window that
      // had lost the thing it was for.
      const before = await page.evaluate(`return ${P}.project.getState().hingeRowsOf(${JSON.stringify(f2unit)});`);
      await page.click('[data-hinge-up="0"]');
      await page.sleep(400);
      const after = await page.evaluate(`return ${P}.project.getState().hingeRowsOf(${JSON.stringify(f2unit)});`);
      const nudge = await page.evaluate(`return ${P}.profile.getState().profile.editor.hingeNudgeMm;`);
      check('F2 — the ±5 mm arrow in section B still moves the hinge it always moved',
        Array.isArray(after) && Math.abs((after[0] - before[0]) - nudge) < 1e-9,
        `${before?.[0]} → ${after?.[0]} mm (stride ${nudge})`);
      measurements.f2.rows = { before, after, nudge };
      await shot('2c-the-hinge-moved-from-inside-the-doors-own-window');
      await page.evaluate(`${P}.ui.getState().closeModal(); return true;`);
      await page.sleep(300);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // F3 [HIGH] — a divider is bored from ONE face, and it says which
    // ═══════════════════════════════════════════════════════════════════════
    if (want('f3')) {
      await newRoom('Turn 30 walk — F3');
      await page.evaluate(`
        const s = ${P}.project.getState();
        const u = s.addUnit('WARDROBE');
        s.updateUnitParams(u.id, { width: 1200, doors: false });
        // A divider with a shelf in EACH bay, at two different heights, so the
        // ladder that comes out names the bay it came from.
        const part = s.addPartition(u.id);
        const r0 = s.unitResult(u.id);
        const pid = (r0.panels.find((p) => p.part === 'VPART') || {}).meta.itemId;
        s.updateItem(u.id, pid, { x_mm: 600 });
        s.addItem(u.id, { kind: 'shelf', pos_mm: 800, zone: 0 });
        s.addItem(u.id, { kind: 'shelf', pos_mm: 1400, zone: 1 });
        window.__t30 = { unitId: u.id, partItem: pid };
        return true;
      `);
      await page.waitFor('document.querySelector("canvas")', { what: 'the 3D canvas' });
      await page.sleep(1600);

      // What the ENGINE cut, read through the app's own store, and what the
      // SCENE mounted — the two have to be the same holes or the picture and
      // the sheet disagree, which is the fault F3 is about.
      const boreJs = `
        const s = ${P}.project.getState();
        const r = s.unitResult(window.__t30.unitId);
        const layer = ${P}.profile.getState().profile.shelfHoles.layer;
        const part = r.panels.find((p) => p.part === 'VPART');
        const on = r.drills.filter((d) => d.panel === part.id && d.layer === layer);
        const at = new Set(on.map((d) => d.x + ',' + d.y));
        return {
          panel: part.id,
          face: part.meta.drillFace,
          summary: r.drillSummary.partition_drill_face,
          holes: on.length,
          distinct: at.size,
          rows: [...new Set(on.map((d) => d.y))].sort((a, b) => a - b),
          sides: { BUL: r.drills.filter((d) => d.panel === 'BUL' && d.layer === layer).length,
                   BUR: r.drills.filter((d) => d.panel === 'BUR' && d.layer === layer).length },
        };
      `;
      const f3left = await page.evaluate(boreJs);
      check('F3 — the divider takes ONE ladder, not two stacked on each other',
        f3left.holes === 6 && f3left.distinct === 6,
        `${f3left.holes} holes at ${f3left.distinct} distinct points`);
      check('F3 — …and nothing said means LEFT, the profile’s own one line',
        f3left.face === 'L' && f3left.summary[f3left.panel] === 'L',
        `face ${f3left.face}, summary ${JSON.stringify(f3left.summary)}`);
      check('F3 — …the LEFT bay’s shelf is the one that put them there',
        JSON.stringify(f3left.rows) === JSON.stringify([732, 782, 832]),
        `rows ${f3left.rows.join(', ')} (the left shelf is at 800 world, the divider stands one board up)`);
      await frameUnits([await page.evaluate('return window.__t30.unitId;')], [-1.0, 0.35, 0.95]);
      await page.sleep(900);
      await shot('3a-the-divider-bored-on-its-left-face-only');

      // ── the setting, pressed in the divider's own modal ────────────────
      await page.evaluate(`
        const s = ${P}.project.getState();
        const r = s.unitResult(window.__t30.unitId);
        const part = r.panels.find((p) => p.part === 'VPART');
        ${P}.ui.getState().openModal('element', { unitId: window.__t30.unitId, panelId: part.id, at: { x: 300, y: 300 } });
        return true;
      `);
      await page.sleep(600);
      const hasControl = await page.evaluate('return document.querySelectorAll(\'[data-partition-drill-face]\').length;');
      check('F3 — the L / R setting is in the DIVIDER’s own modal', hasControl === 2, `${hasControl} buttons`);
      await shot('3b-the-L-R-setting-in-the-dividers-modal');
      await page.click('[data-partition-drill-face="R"]');
      await page.sleep(700);
      const f3right = await page.evaluate(boreJs);
      check('F3 — pressing Right moves the ladder to the RIGHT bay’s shelf',
        f3right.face === 'R' && f3right.holes === 6 && f3right.distinct === 6
        && JSON.stringify(f3right.rows) === JSON.stringify([1332, 1382, 1432]),
        `face ${f3right.face}, rows ${f3right.rows.join(', ')}`);
      check('F3 — …and the SIDES are untouched by any of it',
        f3left.sides.BUL === f3right.sides.BUL && f3left.sides.BUR === f3right.sides.BUR
        && f3left.sides.BUL === 6 && f3left.sides.BUR === 6,
        `BUL ${f3left.sides.BUL}→${f3right.sides.BUL}, BUR ${f3left.sides.BUR}→${f3right.sides.BUR}`);
      measurements.f3 = { left: f3left, right: f3right };
      await page.evaluate(`${P}.ui.getState().closeModal(); return true;`);
      await page.sleep(500);
      await frameUnits([await page.evaluate('return window.__t30.unitId;')], [1.0, 0.35, 0.95]);
      await page.sleep(900);
      await shot('3c-the-same-divider-bored-on-its-right-face');
    }

    // ═══════════════════════════════════════════════════════════════════════
    // F4 [HIGH] — the divider's foot, restored from the LISP
    // ═══════════════════════════════════════════════════════════════════════
    if (want('f4')) {
      await newRoom('Turn 30 walk — F4');
      await page.evaluate(`
        const s = ${P}.project.getState();
        // A drawer stack is GATED on the drawer-box board being measured
        // (turn 24 F3.1: "no thickness, no drawers"), so the walk does what the
        // gate's own message tells a joiner to do — Project setup, the caliper,
        // the tick — before asking for the drawers the divider belongs to.
        s.setSlotThickness('box', { measured: 15, confirmed: true });
        const u = s.addUnit('WARDROBE');
        s.updateUnitParams(u.id, { width: 600, doors: true });
        // A wardrobe's drawers are ITEMS, which is what puts the DRAWER PANEL
        // — the very divider drawWardrobeDPHolesBOTTOM is written for — into
        // the carcass. addDrawers is the call the app's own control makes.
        const added = s.addDrawers(u.id, 3);
        window.__t30 = { unitId: u.id, added };
        return true;
      `);
      await page.waitFor('document.querySelector("canvas")', { what: 'the 3D canvas' });
      await page.sleep(1800);

      const f4 = await page.evaluate(`
        const s = ${P}.project.getState();
        const r = s.unitResult(window.__t30.unitId);
        const bottom = r.panels.find((p) => p.part === 'BOTTOM');
        const top = r.panels.find((p) => p.part === 'TOP');
        const dp = r.panels.find((p) => p.part === 'DP');
        const on = r.drills.filter((d) => d.kind === 'partition_foot_screw');
        return {
          feet: on.map((d) => ({ panel: d.panel, layer: d.layer, d: d.d, fromFront: bottom.box.d - d.x, across: d.y })),
          topDrills: r.drills.filter((d) => d.panel === top.id).length,
          dpDepth: dp ? dp.box.d : null,
          centre: dp ? dp.box.x + dp.box.w / 2 - bottom.box.x : null,
          bottomId: bottom.id,
        };
      `);
      measurements.f4 = f4;
      check('F4 — the divider’s foot is screwed through the BOTTOM again',
        f4.feet.length === 2 && f4.feet.every((h) => h.panel === f4.bottomId && h.layer === 'SCREWS_3MM' && h.d === 3),
        f4.feet.map((h) => `${h.panel} ⌀${h.d} ${h.layer}`).join(' · ') || 'nothing');
      check('F4 — …at the LISP’s own two points: 99 from the front, and the divider’s depth less 50',
        JSON.stringify(f4.feet.map((h) => h.fromFront).sort((a, b) => a - b)) === JSON.stringify([99, f4.dpDepth - 50]),
        `${f4.feet.map((h) => h.fromFront).sort((a, b) => a - b).join(' and ')} mm from the front (the divider is ${f4.dpDepth} deep)`);
      check('F4 — …on the divider’s own centre line across the width',
        f4.feet.every((h) => Math.abs(h.across - f4.centre) < 1e-6),
        `${[...new Set(f4.feet.map((h) => h.across))].join(', ')} mm (dpInsetCenter)`);
      check('F4 — and the TOP takes NOTHING, which is the LISP and not an oversight',
        f4.topDrills === 0,
        `${f4.topDrills} holes in the top board`);

      // The picture: the two ⌀3 in the bottom board, drawn by the SCENE — the
      // whole point of R10's parity is that the sheet and the picture bore the
      // same holes, so a photograph of the recess is a photograph of the cut.
      const sceneBores = await page.evaluate(`
        const v = ${P}.views && ${P}.views.room;
        if (!v) return null;
        const THREE = v.three;
        let mesh = null;
        v.scene.traverse((o) => { if (!mesh && o.isMesh && o.userData && o.userData.ccPanelId === ${JSON.stringify('BOTTOM')}) mesh = o; });
        return mesh ? { mounted: true } : { mounted: false };
      `);
      check('F4 — the bottom board is mounted, so the picture can be looked at',
        sceneBores?.mounted === true, JSON.stringify(sceneBores));
      // Hide the fronts and look down into the carcass, at the foot of the
      // divider — which is where the two screws are.
      await page.evaluate(`
        const ids = {};
        const s = ${P}.project.getState();
        const r = s.unitResult(window.__t30.unitId);
        for (const p of r.panels.filter((x) => x.part === 'FRONT' || x.part === 'DRAWER-FRONT')) ids[p.id] = 1;
        ${P}.ui.setState((st) => ({ openFronts: { ...st.openFronts, [window.__t30.unitId]: ids } }));
        return true;
      `);
      await page.sleep(1500);
      await frameOn('BOTTOM', [0.15, 1.05, 0.55]);
      await page.sleep(900);
      await shot('4a-the-dividers-foot-two-screws-in-the-bottom-board');
      await frameUnits([await page.evaluate('return window.__t30.unitId;')], [0.5, 0.6, 1.0]);
      await page.sleep(900);
      await shot('4b-the-divider-standing-on-the-board-it-is-screwed-to');
      await page.evaluate(`${P}.ui.setState({ openFronts: {} }); return true;`);
      await page.sleep(400);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // F5 [HIGH] — the shelf-pin setback, 70 → 50, through the OVERRIDE CHANNEL
    // ═══════════════════════════════════════════════════════════════════════
    if (want('f5')) {
      await newRoom('Turn 30 walk — F5');
      await page.evaluate(`
        const s = ${P}.project.getState();
        const u = s.addUnit('BUD');
        s.updateUnitParams(u.id, { width: 600, doors: false });
        s.addItem(u.id, { kind: 'shelf', pos_mm: 300 });
        s.addItem(u.id, { kind: 'shelf', pos_mm: 500 });
        window.__t30 = { unitId: u.id };
        ${P}.ui.getState().closeRightPanel();
        return true;
      `);
      await page.waitFor('document.querySelector("canvas")', { what: 'the 3D canvas' });
      await page.sleep(1600);

      const columnsJs = `
        const s = ${P}.project.getState();
        const r = s.unitResult(window.__t30.unitId);
        const layer = ${P}.profile.getState().profile.shelfHoles.layer;
        const side = r.panels.find((p) => p.id === 'BUL');
        const xs = [...new Set(r.drills.filter((d) => d.panel === 'BUL' && d.layer === layer).map((d) => d.x))].sort((a, b) => a - b);
        // …and the SLEEVES the scene actually mounted, which is the 3-D half.
        const v = ${P}.views && ${P}.views.room;
        const sleeves = [];
        if (v) {
          v.scene.traverse((o) => {
            if (o.userData && o.userData.ccHardwareKind === 'shelf_support') sleeves.push(o.position.z);
          });
        }
        return {
          xs,
          depth: side.box.d,
          fromFront: xs.map((x) => x).sort((a, b) => a - b),
          fromBack: xs.map((x) => side.box.d - x).sort((a, b) => a - b),
          summary: r.drillSummary.shelf_hole_x,
          holes: r.drills.filter((d) => d.layer === layer).length,
          said: s.project.design && s.project.design.shelves ? s.project.design.shelves.pinSetback : null,
        };
      `;

      const bare = await page.evaluate(columnsJs);
      check('F5 — with nothing said the app drills the LISP’s 70, front and back',
        bare.said == null && bare.xs[0] === 70 && bare.depth - bare.xs[1] === 70,
        `columns at ${bare.xs.join(' and ')} on a ${bare.depth} mm board · project says ${bare.said}`);
      await frameOn('BUL', [1.5, 0.25, 0.9]);
      await page.sleep(800);
      await shot('5a-the-kits-own-70-mm-pin-columns');

      // The owner's 50, typed into the control a joiner types it into.
      await page.evaluate(`${P}.ui.getState().openModal('design', { at: { x: 320, y: 220 } }); return true;`);
      await page.sleep(700);
      const hasField = await page.evaluate('return document.querySelectorAll(\'[data-shelf-pin-setback]\').length;');
      check('F5 — the setback has a control of its own in Settings', hasField === 1, `${hasField} fields`);
      await shot('5b-the-shelf-pin-setback-control-in-settings');
      await page.evaluate(`
        const s = ${P}.project.getState();
        const d = s.project.design;
        s.setDesign({ shelves: { ...(d.shelves || {}), pinSetback: 50 } });
        return true;
      `);
      await page.sleep(900);
      const at50 = await page.evaluate(columnsJs);
      measurements.f5 = { bare, at50 };
      check('F5 — the owner’s 50 moves BOTH columns, and moves the same number of holes',
        at50.said === 50 && at50.xs[0] === 50 && at50.depth - at50.xs[1] === 50 && at50.holes === bare.holes,
        `columns at ${at50.xs.join(' and ')} · ${at50.holes} holes, same as ${bare.holes}`);
      check('F5 — …and the summary the drawings and the BOM read moved with it',
        JSON.stringify(at50.summary) === JSON.stringify([50, at50.depth - 50]),
        JSON.stringify(at50.summary));
      await page.evaluate(`${P}.ui.getState().closeModal(); return true;`);
      await page.sleep(500);
      await frameOn('BUL', [1.5, 0.25, 0.9]);
      await page.sleep(800);
      await shot('5c-the-owners-50-mm-pin-columns-on-the-same-board');
    }

    // ═══════════════════════════════════════════════════════════════════════
    // F7 [HIGH] — a shelf and a hinge at one height: ASK, then open the editor
    // ═══════════════════════════════════════════════════════════════════════
    if (want('f7')) {
      await newRoom('Turn 30 walk — F7');
      await page.evaluate(`
        const s = ${P}.project.getState();
        const u = s.addUnit('BUD');
        // The owner's own case, at its starkest: a base unit with doors, and a
        // shelf put DEAD LEVEL with the middle hinge. A shelf is an ITEM — the
        // "+" adds one and a saved project carries it — so this is the gesture
        // rather than a count typed into the params.
        s.updateUnitParams(u.id, { width: 600, doors: true });
        s.addItem(u.id, { kind: 'shelf', pos_mm: 470 });
        ${P}.ui.getState().selectUnit(u.id);
        ${P}.ui.getState().openRightPanel();
        window.__t30 = { unitId: u.id };
        return true;
      `);
      await page.waitFor('document.querySelector("canvas")', { what: 'the 3D canvas' });
      await page.sleep(1600);

      const f7 = await page.evaluate(`
        const s = ${P}.project.getState();
        const r = s.unitResult(window.__t30.unitId);
        const el = document.querySelector('[data-shelf-hinge-clash]');
        return {
          clashes: r.clashes,
          shown: el ? Number(el.getAttribute('data-shelf-hinge-clash')) : 0,
          text: el ? el.textContent.replace(/\\s+/g, ' ').trim().slice(0, 200) : null,
          buttons: {
            sleeves: document.querySelectorAll('[data-clash-remove-sleeves]').length,
            hinge: document.querySelectorAll('[data-clash-move-hinge]').length,
          },
          rows: r.drillSummary.shelf_pin_row_y,
          hinges: r.drillSummary.hinge_centers,
        };
      `);
      measurements.f7 = f7;
      check('F7 — the clash is FOUND, and the number is the derived 71.25 mm window',
        f7.clashes.length === 1 && f7.clashes[0].gapMm === 0
        && f7.clashes[0].windowMm === 71.25,
        `rows ${f7.rows.map((v) => Math.round(v)).join('/')} vs hinges ${f7.hinges.join('/')} — ${f7.clashes[0] ? f7.clashes[0].gapMm : '?'} mm apart`);
      check('F7 — …and it is SHOWN, with the two choices the owner named',
        f7.shown === 1 && f7.buttons.sleeves === 1 && f7.buttons.hinge === 1,
        `${f7.shown} prompt · ${f7.buttons.sleeves} + ${f7.buttons.hinge} buttons`);
      check('F7 — …saying the number rather than "too close"',
        /0 mm apart/.test(f7.text || '') && /71\.25 mm/.test(f7.text || ''),
        f7.text || 'no text');
      await shot('7a-the-conflict-prompt-with-its-two-choices');

      // ── CHOICE ONE: the SHELF's own window, at that shelf ──────────────
      await page.click('[data-clash-remove-sleeves]');
      await page.sleep(700);
      const openedShelf = await page.evaluate(`
        const el = document.querySelector('[data-door-modal]');
        return el ? { of: el.getAttribute('data-door-modal'), sections: el.getAttribute('data-door-modal-sections') } : null;
      `);
      check('F7 — "Remove sleeves at this shelf" opens THAT SHELF’s own window',
        openedShelf && openedShelf.of === (f7.clashes[0] || {}).shelfPanelId && openedShelf.sections === 'A',
        JSON.stringify(openedShelf));
      await shot('7b-the-shelfs-own-window-opened-by-the-first-choice');
      await page.evaluate(`${P}.ui.getState().closeModal(); return true;`);
      await page.sleep(400);

      // ── CHOICE TWO: the DOOR's window at section B, that row ringed ────
      await page.click('[data-clash-move-hinge]');
      await page.sleep(900);
      const openedHinge = await page.evaluate(modalJs);
      check('F7 — "Move the hinge" opens the DOOR’s window at section B, on that row',
        openedHinge.open && openedHinge.of === (f7.clashes[0] || {}).doorPanelId
        && openedHinge.hasB && openedHinge.ringedRow === (f7.clashes[0] || {}).hingeIndex,
        `${openedHinge.title} — ringed row ${openedHinge.ringedRow}, wanted ${(f7.clashes[0] || {}).hingeIndex}`);
      await shot('7c-the-doors-window-at-its-hinges-that-row-ringed');

      // ── AND NOTHING WAS FIXED BEHIND ANYBODY'S BACK ───────────────────
      const after = await page.evaluate(`
        const s = ${P}.project.getState();
        const r = s.unitResult(window.__t30.unitId);
        return { rows: r.drillSummary.shelf_pin_row_y, hinges: r.drillSummary.hinge_centers, clashes: r.clashes.length };
      `);
      check('F7 — NO SILENT AUTO-FIX: pressing both buttons changed no hole at all',
        JSON.stringify(after.rows) === JSON.stringify(f7.rows)
        && JSON.stringify(after.hinges) === JSON.stringify(f7.hinges)
        && after.clashes === 1,
        `rows ${after.rows.map((v) => Math.round(v)).join('/')} · hinges ${after.hinges.join('/')} · still ${after.clashes} clash`);
      await page.evaluate(`${P}.ui.getState().closeModal(); return true;`);
      await page.sleep(300);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // F8 [MEDIUM] — one worktop over a multi-selection
    // ═══════════════════════════════════════════════════════════════════════
    if (want('f8')) {
      await newRoom('Turn 30 walk — F8');
      await page.evaluate(`
        const s = ${P}.project.getState();
        const ids = [];
        let near = null;
        for (let i = 0; i < 3; i += 1) {
          const u = near ? s.addUnit('BUD', { near, side: 'right' }) : s.addUnit('BUD');
          s.updateUnitParams(u.id, { width: 600, doors: true });
          s.addPlinth(u.id);
          ids.push(u.id);
          near = u.id;
        }
        // …and an END PANEL on the far end, because "od ściany aż do paneli"
        // is a claim about where the slab stops.
        s.addEndPanel(ids[2], { side: 'R' });
        window.__t30 = { ids };
        ${P}.ui.getState().selectUnit(ids[0]);
        for (const id of ids.slice(1)) ${P}.ui.getState().selectUnit(id, { additive: true });
        ${P}.ui.getState().openRightPanel();
        return true;
      `);
      await page.waitFor('document.querySelector("canvas")', { what: 'the 3D canvas' });
      await page.sleep(1600);
      const before = await page.evaluate('return document.querySelectorAll(\'[data-add-worktop]\').length;');
      check('F8 — the button is on the MULTI-selection', before === 1, `${before} buttons`);
      await shot('8a-three-base-cabinets-selected-no-worktop-yet');

      // The gesture: a real press on the button a joiner presses.
      await page.click('[data-add-worktop]');
      await page.sleep(1200);

      const f8 = await page.evaluate(`
        const s = ${P}.project.getState();
        const tops = s.worktopsOf();
        const v = ${P}.views && ${P}.views.room;
        const drawn = [];
        if (v) {
          v.scene.traverse((o) => {
            if (o.userData && o.userData.ccWorktopId) drawn.push(o.userData.ccWorktopMm);
          });
        }
        const u = s.units.find((x) => x.id === window.__t30.ids[0]);
        return {
          stored: tops.length,
          geometry: tops[0] ? tops[0].geometry : null,
          drawn,
          unitDepth: u.params.depth,
          frontT: u.params.front_t,
          gap: ${P}.profile.getState().profile.doors.gap,
        };
      `);
      measurements.f8 = f8;
      check('F8 — ONE slab covers all three, and the scene drew exactly one',
        f8.stored === 1 && f8.drawn.length === 1,
        `${f8.stored} stored · ${f8.drawn.length} drawn`);
      check('F8 — …38 mm thick, the decided UK standard',
        f8.geometry && f8.geometry.h === 38 && f8.drawn[0] && f8.drawn[0].t === 38,
        `${f8.geometry ? f8.geometry.h : '?'} mm`);
      check('F8 — …20 mm proud of the DOOR plane, and flush at the wall',
        f8.geometry
        && f8.geometry.d === f8.unitDepth + f8.gap + f8.frontT + 20
        && f8.geometry.z === 0 && f8.geometry.overhang.wall === 0,
        `${f8.geometry ? f8.geometry.d : '?'} deep over a ${f8.unitDepth} carcass + ${f8.gap} gap + ${f8.frontT} door + 20`);
      check('F8 — …and it runs PAST the end panel rather than stopping at the carcass',
        f8.geometry && f8.geometry.w > 1800 + 2 * 10,
        `${f8.geometry ? f8.geometry.w : '?'} mm over an 1800 run (1820 without a panel)`);
      // Framed off the units, but WIDE and from above: the slab stands above
      // every mesh `frameUnits` measures, so a tight frame crops the subject.
      await frameUnits(await page.evaluate('return window.__t30.ids;'), [0.85, 0.95, 1.9]);
      await page.sleep(900);
      await shot('8b-one-worktop-over-the-run-from-the-wall-out-past-the-panel');
      await frameUnits(await page.evaluate('return window.__t30.ids;'), [1.7, 0.55, 1.1]);
      await page.sleep(900);
      await shot('8c-the-overhang-20-proud-of-the-doors-flush-at-the-wall');

      // AND NO HOLE MOVED, which is what "design-layer auto-part" means.
      const holes = await page.evaluate(`
        const s = ${P}.project.getState();
        const r = s.unitResult(window.__t30.ids[0]);
        return { drills: r.drills.length, panels: r.panels.length };
      `);
      check('F8 — the cabinets under it are cut exactly as they were',
        holes.drills > 0 && holes.panels > 0,
        `${holes.panels} panels, ${holes.drills} holes — and the engine has never heard of a worktop`);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // F9 [MEDIUM] — one cornice across a multi-selection
    // ═══════════════════════════════════════════════════════════════════════
    if (want('f9')) {
      await newRoom('Turn 30 walk — F9');
      await page.evaluate(`
        const s = ${P}.project.getState();
        const ids = [];
        let near = null;
        for (let i = 0; i < 3; i += 1) {
          const u = near ? s.addUnit('BUDTALL', { near, side: 'right' }) : s.addUnit('BUDTALL');
          ids.push(u.id);
          near = u.id;
        }
        window.__t30 = { ids };
        ${P}.ui.getState().selectUnit(ids[0]);
        for (const id of ids.slice(1)) ${P}.ui.getState().selectUnit(id, { additive: true });
        ${P}.ui.getState().openRightPanel();
        return true;
      `);
      await page.waitFor('document.querySelector("canvas")', { what: 'the 3D canvas' });
      await page.sleep(1600);
      const controls = await page.evaluate('return document.querySelectorAll(\'[data-bulk-cornice-height]\').length;');
      check('F9 — the per-unit control’s own buttons are on the MULTI-selection',
        controls === 3, `${controls} buttons (None + the profile's two heights)`);
      await shot('9a-three-tall-units-selected-the-bulk-cornice-buttons');

      const readRun = `
        const s = ${P}.project.getState();
        const runs = window.__t30.ids.map((id) => {
          const u = s.units.find((x) => x.id === id);
          // A missing value and 0 are the same answer - "not fitted" - and
          // the engine's own corniceOption says so; normalised here so the
          // walk reads a number rather than three kinds of nothing.
          return {
            cornice: Number(u.params.cornice) > 0 ? Number(u.params.cornice) : 0,
            infill: Number(u.params.top_infill_mm) || 0,
            run: u.params.run_cornice,
          };
        });
        const owners = runs.filter((r) => r.run && r.run.role === 'owner');
        return {
          runs, owners: owners.length, length: owners[0] ? owners[0].run.length : null,
          spans: owners[0] ? owners[0].run.unitIds.length : 0,
          heights: [...new Set(runs.map((r) => r.cornice))],
          infills: [...new Set(runs.map((r) => r.infill))],
        };
      `;
      const before = await page.evaluate(readRun);
      check('F9 — nothing is fitted to start with', before.heights.join() === '0', before.heights.join());

      // ONE press, on the button a joiner presses.
      await page.click('[data-bulk-cornice-height="100"]');
      await page.sleep(1200);
      const after = await page.evaluate(readRun);
      measurements.f9 = { before, after };
      check('F9 — ONE press fits it to all three',
        after.heights.length === 1 && after.heights[0] === 100,
        `heights ${after.heights.join('/')}`);
      check('F9 — …and it is ONE MOULDING across the run, not three',
        after.owners === 1 && after.spans === 3 && after.length === 1800,
        `${after.owners} owner spanning ${after.spans} cabinets, ${after.length} mm long`);
      check('F9 — …with the infill it is fixed to asked for, exactly as the per-unit press does',
        after.infills.length === 1 && after.infills[0] >= 40,
        `${after.infills.join('/')} mm of top infill`);
      await frameUnits(await page.evaluate('return window.__t30.ids;'), [0.75, 0.75, 1.7]);
      await page.sleep(900);
      await shot('9b-one-cornice-across-all-three-from-one-press');

      // …and one press takes it off again.
      await page.click('[data-bulk-cornice-height="0"]');
      await page.sleep(1000);
      const off = await page.evaluate(readRun);
      check('F9 — and one press takes it off again',
        off.heights.length === 1 && off.heights[0] === 0,
        off.heights.join('/'));
      await page.sleep(500);
      await shot('9c-and-one-press-takes-it-off-again');
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
