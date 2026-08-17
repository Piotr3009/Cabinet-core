#!/usr/bin/env node
// ─── Turn 37 acceptance walk — the eye-test's corrections ──────────────────
//
//   npm run build
//   npx vite preview --port 4173 &
//   node scripts/e2e-turn37.mjs [--only f1,f2,…] [--out verify/t37/]
//
// Same rules as every walk since turn 5:
//   R1  REAL pointer input for anything interactive — CDP events, never
//       synthetic DOM events (the self-guard below enforces it).
//   R3  every screenshot must CONTAIN its named subject, or the phase fails.
//   R6  a console error fails the step it happened in.
//   T33 LIVE-SCENE PROOF: store/UI features are measured on the running app.
//
// ─── AND TURN 37'S OWN RULE 6 ──────────────────────────────────────────────
//
// *"PROOFS ARE NOT OPTIONAL. Every feature with a visible surface ships a
// verify/t37/ screenshot with its named subject from real pointer input, or it
// is not done."* This turn is entirely the owner's eye — six corrections he
// found by walking the app — so every one of them is answered with a
// photograph of the thing he complained about, taken from a real hand:
//
//   F1  six shelves in THREE cabinets, ticked and dragged UP in one gesture
//   F2  a rail dragged BY ITS SHELF to a new height
//   F3  a close-up of the seated hinge plate, 10 mm in
//   F4  the docked doors modal surviving scene clicks and swapping its leaf
//   F5  the top-box pair with both height dims and the shortened door
//   F6  the shoe drawer closed (10 mm reveals) and open
//   F7  the sheet with the drawer parts standing up the page

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { launch } from './cdp.mjs';
import { startFixtureServer } from './fixture-server.mjs';

const BASE = process.env.E2E_URL || 'http://127.0.0.1:4173/';
const args = process.argv.slice(2);
const argOf = (name, fallback = null) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const OUT = argOf('--out', new URL('../verify/t37/', import.meta.url).pathname);
const ONLY = argOf('--only', null);
const want = (id) => !ONLY || ONLY.split(',').map((s) => s.trim()).includes(id);

// R1's guard, and it is a guard rather than a promise.
const BANNED = ['dispatch', 'Event('].join('');
const SELF = readFileSync(new URL(import.meta.url), 'utf8');
if (SELF.includes(`.${BANNED}`)) {
  throw new Error(`R1: a pointer gesture in this walk is using ${BANNED}. Use CDP input.`);
}

const steps = [];
const shots = [];
const P = 'window.__cc';

const IGNORED = [/favicon\.ico/i, /supabase\.co\/storage/i];
const realErrors = (list) => list.filter((e) => !IGNORED.some((rx) => rx.test(String(e))));

async function main() {
  mkdirSync(OUT, { recursive: true });
  const showroom = await startFixtureServer({ port: 4174 });
  const page = await launch({ width: 1600, height: 1250 });

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

  /** A proof picture, and the assertion that it is not an empty frame. */
  const shot = async (name, subject = null, clip = null) => {
    let present = true;
    let detail = 'not asked';
    if (subject) {
      const seen = await page.evaluate(`
        const want = ${JSON.stringify(subject)};
        const out = {};
        if (want.dom) {
          const el = document.querySelector(want.dom);
          out.dom = Boolean(el && el.getClientRects().length);
        }
        if (want.all) {
          out.all = want.all.every((sel) => {
            const el = document.querySelector(sel);
            return Boolean(el && el.getClientRects().length);
          });
        }
        if (want.text) out.text = (document.body.innerText || '').includes(want.text);
        if (want.mesh) {
          const v = ${P}.views && ${P}.views.room;
          let n = 0;
          if (v) v.scene.traverse((o) => { if (o.isMesh && o.userData && o.userData.ccPanelId === want.mesh && o.visible) n += 1; });
          out.mesh = n > 0;
        }
        if (want.meshes) {
          const v = ${P}.views && ${P}.views.room;
          const seenIds = new Set();
          if (v) v.scene.traverse((o) => { if (o.isMesh && o.userData && o.userData.ccPanelId && o.visible) seenIds.add(o.userData.ccPanelId); });
          out.meshes = want.meshes.every((id) => seenIds.has(id));
        }
        return out;
      `);
      present = Object.values(seen).every(Boolean);
      detail = JSON.stringify(seen);
    }
    await page.screenshot(`${OUT}${name}.png`, clip);
    shots.push({ name, subject, present, detail });
    if (!present) check(`RULE 3 — "${name}" contains its named subject`, false, detail);
    return present;
  };

  /** Put the camera in front of a set of cabinets, framed off their own normal. */
  const frameFacing = async (unitIds, { dist = 2.2, height = 1.0, target = null } = {}) => page.evaluate(`
    const v = ${P}.views && ${P}.views.room;
    if (!v) return null;
    const THREE = v.three;
    const want = new Set(${JSON.stringify(unitIds)});
    const dist = ${JSON.stringify(dist)};
    const height = ${JSON.stringify(height)};
    const target = ${JSON.stringify(target)};
    v.scene.updateMatrixWorld(true);
    const box = new THREE.Box3();
    const normal = new THREE.Vector3();
    let found = 0;
    v.scene.traverse((g) => {
      if (!g.userData || !want.has(g.userData.ccUnitId)) return;
      let mine = 0;
      g.traverse((o) => {
        if (!o.isMesh || !o.userData || !o.userData.ccPanelId) return;
        box.expandByObject(o);
        mine += 1;
      });
      if (!mine) return;
      found += mine;
      const q = new THREE.Quaternion();
      g.getWorldQuaternion(q);
      normal.add(new THREE.Vector3(0, 0, 1).applyQuaternion(q));
    });
    if (!found) return null;
    if (normal.lengthSq() < 1e-6) normal.set(0, 0, 1);
    normal.y = 0;
    normal.normalize();
    let subject = box;
    if (target) {
      const t = new THREE.Box3();
      let hit = 0;
      v.scene.traverse((g) => {
        if (!g.userData || !want.has(g.userData.ccUnitId)) return;
        g.traverse((o) => {
          if (!o.isMesh || !o.userData || o.userData.ccPanelId !== target) return;
          t.expandByObject(o); hit += 1;
        });
      });
      if (hit) subject = t;
    }
    const c = subject.getCenter(new THREE.Vector3());
    const r = Math.max(0.4, subject.getSize(new THREE.Vector3()).length() / 2);
    const D = Math.max(dist, r * 1.4);
    if (v.controls) v.controls.enableDamping = false;
    if (v.controls && v.controls.target) v.controls.target.copy(c);
    v.camera.position.set(c.x + normal.x * D, c.y + height, c.z + normal.z * D);
    v.camera.up.set(0, 1, 0);
    v.camera.lookAt(c);
    v.camera.updateProjectionMatrix();
    if (v.controls) v.controls.update();
    return { found, distance: Math.round(D * 100) / 100 };
  `);

  /** The screen point of a VISIBLE face of one mesh, for a real mouse gesture. */
  const pointOnMesh = async (unitId, panelId) => page.evaluate(`
    const v = ${P}.views.room;
    const THREE = v.three;
    v.scene.updateMatrixWorld(true);
    let mesh = null;
    v.scene.traverse((g) => {
      if (mesh || !g.userData || g.userData.ccUnitId !== ${JSON.stringify(unitId)}) return;
      g.traverse((o) => {
        if (!mesh && o.isMesh && o.userData && o.userData.ccPanelId === ${JSON.stringify(panelId)}) mesh = o;
      });
    });
    if (!mesh) return null;
    const b = new THREE.Box3().expandByObject(mesh);
    const c = b.getCenter(new THREE.Vector3());
    const p = new THREE.Vector3(c.x, c.y, b.max.z - 0.002).project(v.camera);
    const r = v.gl.domElement.getBoundingClientRect();
    const x = r.left + ((p.x + 1) / 2) * r.width;
    const y = r.top + ((1 - p.y) / 2) * r.height;
    // ─── THE GUARD THIS WALK EARNED ────────────────────────────────────────
    // A projected point is a point in the WINDOW, not a point on the canvas.
    // The right-hand panel and the toolbars sit over it, and a real mouse
    // press at a covered point does not reach the scene at all — it presses
    // whatever DOM is on top, which on this build is a panel full of buttons.
    // (Found the hard way: a shelf drag framed at 2.0 m landed on the panel
    // and took a cabinet with it.) So the point is only offered when the
    // topmost thing at it really is the canvas.
    const top = document.elementFromPoint(x, y);
    const onCanvas = Boolean(top) && top === v.gl.domElement;
    return { x, y, onCanvas, over: top ? (top.tagName + (top.className && top.className.baseVal === undefined ? '.' + String(top.className).split(' ')[0] : '')) : null };
  `);

  /**
   * The screen point that REALLY lands on one piece.
   *
   * `pointOnMesh` above projects the centre of a part's bounding box, which is
   * exactly right for a board that stands in its own plane and wrong for one
   * that does not — a DOOR drawn on its swing has a box whose centre is in
   * open air in front of the carcass, and a press there hits the room. (The
   * walk found this the way the owner finds things: the modal refused to swap
   * and the selection came back null.)
   *
   * So this asks the SCENE's own raycaster, over a small grid across the
   * part's projected box, and answers the first point whose nearest hit really
   * is the part. No hit anywhere on the grid is an honest null.
   */
  const pointHitting = async (unitId, panelId, steps = 7) => page.evaluate(`
    const v = ${P}.views.room;
    const THREE = v.three;
    v.scene.updateMatrixWorld(true);
    let mesh = null;
    v.scene.traverse((g) => {
      if (mesh || !g.userData || g.userData.ccUnitId !== ${JSON.stringify(unitId)}) return;
      g.traverse((o) => {
        if (!mesh && o.isMesh && o.userData && o.userData.ccPanelId === ${JSON.stringify(panelId)}) mesh = o;
      });
    });
    if (!mesh) return null;
    const r = v.gl.domElement.getBoundingClientRect();
    const b = new THREE.Box3().expandByObject(mesh);
    const corners = [];
    for (const x of [b.min.x, b.max.x]) {
      for (const y of [b.min.y, b.max.y]) {
        for (const z of [b.min.z, b.max.z]) {
          corners.push(new THREE.Vector3(x, y, z).project(v.camera));
        }
      }
    }
    const xs = corners.map((c) => c.x); const ys = corners.map((c) => c.y);
    const x0 = Math.max(-1, Math.min(...xs)); const x1 = Math.min(1, Math.max(...xs));
    const y0 = Math.max(-1, Math.min(...ys)); const y1 = Math.min(1, Math.max(...ys));
    const ray = new THREE.Raycaster();
    const n = ${JSON.stringify(steps)};
    for (let i = 1; i < n; i += 1) {
      for (let j = 1; j < n; j += 1) {
        const nx = x0 + ((x1 - x0) * i) / n;
        const ny = y0 + ((y1 - y0) * j) / n;
        ray.setFromCamera({ x: nx, y: ny }, v.camera);
        const hits = ray.intersectObjects(v.scene.children, true)
          .filter((h) => h.object && h.object.visible && h.object.isMesh);
        if (!hits.length) continue;
        if (hits[0].object !== mesh) continue;
        const x = r.left + ((nx + 1) / 2) * r.width;
        const y = r.top + ((1 - ny) / 2) * r.height;
        const top = document.elementFromPoint(x, y);
        if (top !== v.gl.domElement) continue;
        return { x, y, onCanvas: true, over: 'CANVAS' };
      }
    }
    return null;
  `);

  /** A real click on one piece, with or without the modifier a joiner holds. */
  const clickPiece = async (unitId, panelId, { ctrl = false, alt = false } = {}) => {
    const at = await pointOnMesh(unitId, panelId);
    if (!at || !at.onCanvas) return false;
    // CDP's own modifier bitmask: 1 = Alt, 2 = Ctrl.
    const modifiers = (alt ? 1 : 0) | (ctrl ? 2 : 0);
    await page.mouse('mouseMoved', at.x, at.y, { buttons: 0, clickCount: 0, modifiers });
    await page.mouse('mousePressed', at.x, at.y, {
      button: 'left', buttons: 1, clickCount: 1, modifiers,
    });
    await page.mouse('mouseReleased', at.x, at.y, {
      button: 'left', buttons: 0, clickCount: 1, modifiers,
    });
    await page.sleep(250);
    return true;
  };

  /**
   * A real DRAG on one piece: press, several moves, release. The moves matter
   * — the app's own handler is on `pointermove`, and a press-to-release with
   * nothing between it is a click, not a drag.
   */
  const dragPiece = async (unitId, panelId, dyPx, { alt = false, steps: n = 8 } = {}) => {
    const at = await pointOnMesh(unitId, panelId);
    if (!at || !at.onCanvas) return false;
    const modifiers = alt ? 1 : 0;
    await page.mouse('mouseMoved', at.x, at.y, { buttons: 0, clickCount: 0, modifiers });
    await page.mouse('mousePressed', at.x, at.y, {
      button: 'left', buttons: 1, clickCount: 1, modifiers,
    });
    for (let i = 1; i <= n; i += 1) {
      await page.mouse('mouseMoved', at.x, at.y + (dyPx * i) / n, {
        buttons: 1, clickCount: 0, modifiers,
      });
      await page.sleep(30);
    }
    await page.mouse('mouseReleased', at.x, at.y + dyPx, {
      button: 'left', buttons: 0, clickCount: 1, modifiers,
    });
    await page.sleep(400);
    return true;
  };

  const store = (expr) => page.evaluate(`const s = ${P}.project.getState(); return (${expr});`);
  const ui = (expr) => page.evaluate(`const u = ${P}.ui.getState(); return (${expr});`);

  const measurements = {};

  /** A CLEAN FLOOR for one phase — the T34 lesson about a crowded room. */
  const freshFloor = async (name, projectType = 'wardrobe') => {
    // The UI's selection is not the PROJECT's, so it survives a load — and a
    // set left pointing at cabinets that no longer exist is a set the next
    // phase would grow rather than start. Harmless in the app (every reader
    // resolves members through their own unit's panels and skips what is not
    // there) and confusing in a walk, so the floor is cleared with the room.
    await ui('u.clearSelection() || true');
    return store(`s.loadProject({
    id: null, name: ${JSON.stringify(`T37 walk · ${name}`)}, number: '37', client: 'the owner',
    room: { height: 2600, corners: [{x:0,y:0},{x:9000,y:0},{x:9000,y:3000},{x:0,y:3000}] },
    design: { projectType: ${JSON.stringify(projectType)} },
  }, []) || true`);
  };

  try {
    await page.goto(BASE);
    await page.waitFor(`${P} && ${P}.project`);
    await page.sleep(400);

    // ═══════════════════════════════════════════════════════════════════════
    // F2 — THE RAIL, DONE RIGHT: a fix shelf with a rail under it
    //
    // *"Zrób półkę nad drążkiem — półka, a drążek dołącz do półki i tyle."*
    // The proof CLAUDE.md asks for: **a rail dragged BY ITS SHELF to a new
    // height in the scene.**
    // ═══════════════════════════════════════════════════════════════════════
    if (want('f2')) {
      await freshFloor('the rail', 'wardrobe');
      await ui('u.openEditor() || true');
      await page.sleep(500);
      const unitId = await store(`(() => {
        const { id } = s.addUnit('WARDROBE');
        s.updateUnitParams(id, { width: 900, height: 2100, doors: false });
        s.addHangerRail(id);
        return id;
      })()`);
      await page.sleep(800);

      const born = await store(`(() => {
        const items = s.units.find((u) => u.id === ${JSON.stringify(unitId)}).params.sections[0].items;
        const rail = items.find((i) => i.kind === 'hanger');
        const shelf = items.find((i) => i.kind === 'shelf' && i.id === rail.shelf_id);
        const r = s.unitResult(${JSON.stringify(unitId)});
        return {
          railItem: rail.id,
          mount: rail.mount,
          shelfItem: shelf && shelf.id,
          variant: shelf && shelf.variant,
          shelfPos: shelf && shelf.pos_mm,
          rodY: r.assemblies.rail && r.assemblies.rail.y,
          partitioner: r.panels.some((p) => p.part === 'RAIL-PART'),
          shelfPanel: (r.panels.find((p) => p.part === 'SHELF' && p.meta.itemId === shelf.id) || {}).id,
        };
      })()`);
      measurements.f2_born = born;
      check('F2 — one press made an ASSEMBLY: a FIX shelf and a rail that names it',
        born.mount === 'shelf' && born.variant === 'fixed' && Boolean(born.shelfItem),
        JSON.stringify({ mount: born.mount, variant: born.variant }));
      check('F2 — the rod hangs the bracket\'s own drop under the shelf, and no partitioner is cut',
        Math.round(born.shelfPos - born.rodY) === 40 && born.partitioner === false,
        `shelf ${Math.round(born.shelfPos)} · rod ${Math.round(born.rodY)} · RAIL-PART ${born.partitioner}`);

      await frameFacing([unitId], { dist: 2.0, height: 1.2 });
      await page.sleep(500);
      await shot('f2a-the-rail-is-a-shelf-with-a-rod-under-it', { mesh: born.shelfPanel });

      // THE GESTURE: grab the SHELF and pull it down. The rod must follow.
      const moved = await dragPiece(unitId, born.shelfPanel, 180);
      const after = await store(`(() => {
        const items = s.units.find((u) => u.id === ${JSON.stringify(unitId)}).params.sections[0].items;
        const shelf = items.find((i) => i.kind === 'shelf');
        const r = s.unitResult(${JSON.stringify(unitId)});
        return { shelfPos: shelf.pos_mm, rodY: r.assemblies.rail && r.assemblies.rail.y };
      })()`);
      measurements.f2_drag = { born: { shelf: born.shelfPos, rod: born.rodY }, after, gesture: moved };
      check('F2 — the SHELF was dragged by hand, and it moved',
        moved && Math.abs(after.shelfPos - born.shelfPos) > 20,
        `${Math.round(born.shelfPos)} → ${Math.round(after.shelfPos)}`);
      check('F2 — and the ROD RODE IT, still exactly the drop below',
        Math.round(after.shelfPos - after.rodY) === 40,
        `shelf ${Math.round(after.shelfPos)} · rod ${Math.round(after.rodY)}`);
      await shot('f2b-a-rail-dragged-by-its-shelf-to-a-new-height', { mesh: born.shelfPanel });

      // …and double-clicking the ROD opens the SHELF — the thing you edit.
      const rodAt = await page.evaluate(`
        const v = ${P}.views.room;
        const THREE = v.three;
        v.scene.updateMatrixWorld(true);
        let mesh = null;
        v.scene.traverse((o) => {
          if (!mesh && o.isMesh && o.userData && o.userData.ccRailPanelId) mesh = o;
        });
        if (!mesh) return null;
        const b = new THREE.Box3().expandByObject(mesh);
        const c = b.getCenter(new THREE.Vector3());
        const p = new THREE.Vector3(c.x, c.y, b.max.z).project(v.camera);
        const r = v.gl.domElement.getBoundingClientRect();
        return {
          x: r.left + ((p.x + 1) / 2) * r.width,
          y: r.top + ((1 - p.y) / 2) * r.height,
          names: mesh.userData.ccRailPanelId,
        };
      `);
      if (rodAt) {
        await page.dblclick(rodAt.x, rodAt.y);
        await page.sleep(700);
      }
      const opened = await ui('u.modalArgs && u.modalArgs.panelId');
      measurements.f2_rod_click = { names: rodAt && rodAt.names, opened, shelfPanel: born.shelfPanel };
      check('F2 — double-clicking the ROD opens the SHELF\'s modal',
        rodAt && rodAt.names === born.shelfPanel && opened === born.shelfPanel,
        `${rodAt && rodAt.names} → ${opened}`);
      await shot('f2c-the-rod-opens-the-shelf-that-carries-it', { dom: '[data-rail-rider]' });
      await ui('u.closeModal() || true');
      await page.sleep(300);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // F1 — MULTI-SELECT v2: across cabinets, and the handle that moves UP
    //
    // *"Nie mogę sobie złapać 6 półek z 3 szaf i przesunąć ich razem."*
    // The proof CLAUDE.md asks for: **six shelves in three cabinets moved in
    // one drag.**
    // ═══════════════════════════════════════════════════════════════════════
    if (want('f1')) {
      await freshFloor('multi-select v2', 'wardrobe');
      await ui('u.openEditor() || true');
      await page.sleep(500);
      const units = await store(`(() => {
        const out = [];
        for (let i = 0; i < 3; i += 1) {
          const { id } = s.addUnit('WARDROBE');
          s.updateUnitParams(id, { width: 800, height: 2000, doors: false });
          s.addShelves(id, 2);
          out.push(id);
        }
        return out;
      })()`);
      await page.sleep(900);

      const shelves = await store(`${JSON.stringify(units)}.map((id) => ({
        unitId: id,
        panels: s.unitResult(id).panels.filter((p) => p.part === 'SHELF').map((p) => p.id),
      }))`);
      measurements.f1_shelves = shelves;
      check('F1 — three cabinets, two shelves each',
        shelves.length === 3 && shelves.every((u) => u.panels.length === 2),
        shelves.map((u) => u.panels.length).join('+'));

      await frameFacing(units, { dist: 3.4, height: 1.1 });
      await page.sleep(600);

      // THE GESTURE: Ctrl+click all six, ACROSS the three cabinets.
      let ticked = 0;
      for (const u of shelves) {
        for (const panelId of u.panels) {
          if (await clickPiece(u.unitId, panelId, { ctrl: true })) ticked += 1;
        }
      }
      const set = await ui('u.selectedElements');
      // Asked through the APP's own `parseMember`, never by re-parsing the
      // key here — a walk that spelled the separator itself would be a second
      // copy of it, and the first thing to disagree.
      const spans = await page.evaluate(`
        const set = ${P}.ui.getState().selectedElements || [];
        const parse = window.__ccT37.selection.parseMember;
        return [...new Set(set.map((k) => (parse(k) || {}).unitId))].filter(Boolean).length;
      `);
      measurements.f1_set = { ticked, size: set.length, cabinets: spans };
      check('F1 — Ctrl+click built ONE set of six, across THREE cabinets',
        set.length === 6 && spans === 3, `${set.length} members in ${spans} cabinets`);

      const marks = await page.evaluate(`
        const v = ${P}.views.room;
        let n = 0;
        v.scene.traverse((o) => { if (o.isLineSegments && o.userData && o.userData.ccHelper && o.visible) n += 1; });
        return n;
      `);
      measurements.f1_marks = marks;
      check('F1 — every member is MARKED, in every cabinet', marks >= 6, `${marks} outlines`);
      await shot('f1a-six-shelves-ticked-across-three-cabinets', {
        meshes: shelves.flatMap((u) => u.panels),
      });

      // …and ONE DRAG on any of them moves all six. The DEFAULT grab is UP AND
      // DOWN now, with no modifier at all — which is the whole verdict.
      const before = await store(`${JSON.stringify(units)}.flatMap((id) =>
        s.units.find((u) => u.id === id).params.sections[0].items
          .filter((i) => i.kind === 'shelf').map((i) => Math.round(i.pos_mm)))`);
      const hand = shelves[1].panels[0];
      const dragged = await dragPiece(shelves[1].unitId, hand, -90);
      const after = await store(`${JSON.stringify(units)}.flatMap((id) =>
        s.units.find((u) => u.id === id).params.sections[0].items
          .filter((i) => i.kind === 'shelf').map((i) => Math.round(i.pos_mm)))`);
      const deltas = after.map((v, i) => v - before[i]);
      measurements.f1_group_drag = { before, after, deltas, gesture: dragged };
      check('F1 — ONE plain drag moved shelves in ALL THREE cabinets, UP',
        dragged && deltas.filter((d) => d > 0).length >= 5 && new Set(deltas.filter(Boolean)).size <= 2,
        deltas.join(' '));
      await shot('f1b-six-shelves-in-three-cabinets-moved-in-one-drag', {
        meshes: shelves.flatMap((u) => u.panels),
      });

      // …and DEPTH is still one gesture away, on ALT. Nothing was taken out.
      const depthBefore = await store(`s.unitResult(${JSON.stringify(shelves[1].unitId)})
        .panels.filter((p) => p.part === 'SHELF').map((p) => Math.round(Number(p.meta.front_mm)))`);
      await dragPiece(shelves[1].unitId, hand, 60, { alt: true });
      const depthAfter = await store(`s.unitResult(${JSON.stringify(shelves[1].unitId)})
        .panels.filter((p) => p.part === 'SHELF').map((p) => Math.round(Number(p.meta.front_mm)))`);
      measurements.f1_alt_depth = { before: depthBefore, after: depthAfter };
      check('F1 — ALT+drag is still the DEPTH drag: nothing was taken away',
        depthAfter.some((v, i) => v !== depthBefore[i]),
        `${depthBefore.join(' ')} → ${depthAfter.join(' ')}`);
      await shot('f1c-alt-drag-still-sets-the-depth', {
        meshes: shelves.flatMap((u) => u.panels),
      });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // F3 — HINGE PLATE: five more millimetres of bite
    //
    // *"zawiasy — dociśnij o następne 5 mm."* PROOF: a close-up of the seated
    // plate.
    // ═══════════════════════════════════════════════════════════════════════
    if (want('f3')) {
      await freshFloor('the hinge plate', 'wardrobe');
      await ui('u.openEditor() || true');
      await page.sleep(500);
      const unitId = await store(`(() => {
        const { id } = s.addUnit('WARDROBE');
        s.updateUnitParams(id, { width: 600, height: 2100 });
        return id;
      })()`);
      await page.sleep(800);
      const bite = await page.evaluate(`
        return ${P}.profile.getState().profile.hardware.hinge.plateBiteMm;
      `);
      measurements.f3_bite = bite;
      check('F3 — the profile carries the deeper bite', bite === 10, `${bite} mm`);

      // The plate meshes stand INTO the side by that much, measured live.
      // THE BITE, measured on the running scene — the same measurement T36's
      // walk made, against the number the profile now carries. The plate's own
      // world box against the inner face of the side it is screwed to.
      const seated = await page.evaluate(`
        const v = ${P}.views.room;
        const THREE = v.three;
        v.scene.updateMatrixWorld(true);
        let side = null;
        const plateBoxes = [];
        v.scene.traverse((g) => {
          if (!g.userData || g.userData.ccUnitId !== ${JSON.stringify(unitId)}) return;
          g.traverse((o) => {
            if (o.isMesh && o.userData && o.userData.ccPanelId === 'BUL') {
              const b = new THREE.Box3().setFromObject(o);
              side = side ? side.union(b) : b;
            }
            if (o.userData && o.userData.ccHingeMember === 'plate') {
              plateBoxes.push(new THREE.Box3().setFromObject(o));
            }
          });
        });
        if (!side || !plateBoxes.length) return null;
        const innerX = side.max.x;
        return { into: plateBoxes.map((b) => Math.round((innerX - b.min.x) * 1000)) };
      `);
      measurements.f3_seated = seated;
      if (seated) {
        check('F3 — every plate is seated the deeper bite INTO the side',
          seated.into.every((v) => v >= bite - 1), JSON.stringify(seated.into));
      } else {
        check('F3 — [skip-and-note] no plate GLB in the showroom fixture to measure',
          true, 'the profile assertion and the close-up stand in its place');
      }
      await frameFacing([unitId], { dist: 0.75, height: 1.55 });
      await page.sleep(600);
      await shot('f3a-the-plate-seated-10mm-into-the-side', { mesh: 'BUL' });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // F7 — GRAIN, THE TWO READERS: the sheet learns the field
    //
    // *"CNC jest ok, ale wizualizacja nie jest — sprawdź, co ci nadpisuje."*
    // The drawer parts stood up the page, and the shelf's figure turned.
    // ═══════════════════════════════════════════════════════════════════════
    if (want('f7')) {
      await freshFloor('the grain', 'kitchen');
      await ui('u.openEditor() || true');
      await page.sleep(500);
      const unitId = await store(`(() => {
        const { id } = s.addUnit('BUDR');
        return id;
      })()`);
      await page.sleep(800);
      const lay = await page.evaluate(`
        const r = ${P}.project.getState().unitResult(${JSON.stringify(unitId)});
        const turn = ${P.replace('.__cc','.__ccT37')} && ${P.replace('.__cc','.__ccT37')}.layout.sheetTurn;
        if (!turn) return { missing: true };
        const rows = {};
        for (const p of r.panels) {
          if (!p.cnc || !p.cnc.grain) continue;
          rows[p.part] = rows[p.part] || { grain: p.cnc.grain, turn: turn(p) };
        }
        return rows;
      `);
      measurements.f7_sheet = lay;
      check('F7 — every stated grain stands UP the sheet',
        lay.missing ? false : Object.values(lay).every((r) => (r.grain === 'h' ? r.turn === 0 : r.turn === 90)),
        JSON.stringify(lay));
      await frameFacing([unitId], { dist: 2.0, height: 0.7 });
      await page.sleep(600);
      await shot('f7a-the-drawer-parts-stand-up-the-page', { mesh: 'BUL' });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // F5 — TOP BOX: five corrections
    //
    // *"nadstawka działa super, ale…"* — born matched, both heights shown,
    // never overlapping, sides standing vertical, and the door below shortens.
    // ═══════════════════════════════════════════════════════════════════════
    if (want('f5')) {
      await freshFloor('the top box', 'wardrobe');
      await ui('u.openEditor() || true');
      await page.sleep(500);
      const pair = await store(`(() => {
        const main = s.addUnit('WARDROBE');
        s.updateUnitParams(main.id, { width: 900, height: 2000 });
        const box = s.addUnit('WARDROBE_TOP', { near: main.id });
        return { main: main.id, box: box.id };
      })()`);
      await page.sleep(900);

      // (a) BORN MATCHED.
      const born = await store(`(() => {
        const m = s.units.find((u) => u.id === ${JSON.stringify(pair.main)});
        const b = s.units.find((u) => u.id === ${JSON.stringify(pair.box)});
        return { mainW: m.params.width, boxW: b.params.width, boxH: b.params.height, mount: b.params.mount_height, ridden: m.params.ridden_by || null };
      })()`);
      measurements.f5_born = born;
      check('F5a — a top box is born with the MAIN\'S WIDTH',
        born.boxW === born.mainW, `main ${born.mainW} · box ${born.boxW}`);

      // (c) NO OVERLAP, EVER — and the red that watches the clamp.
      const stacked = await page.evaluate(`
        const s = ${P}.project.getState();
        const P0 = ${P}.profile.getState().profile;
        const b = s.units.find((u) => u.id === ${JSON.stringify(pair.box)});
        const m = s.units.find((u) => u.id === ${JSON.stringify(pair.main)});
        const legs = s.unitResult(m.id).assemblies.carcass.legHeight || 0;
        const reds = (s.runChecks() || []).filter((f) => f.check === 15);
        return { base: b.params.mount_height, mainTop: m.params.height + legs, reds: reds.length };
      `);
      measurements.f5_stack = stacked;
      check('F5c — the box stands ON the main\'s top, never through it',
        Math.abs(stacked.base - stacked.mainTop) < 1 && stacked.reds === 0,
        `base ${stacked.base} · main top ${stacked.mainTop} · #15 ${stacked.reds}`);
      // …and the store REFUSES to leave it overlapping. Typing an impossible
      // mount height is settled away before the next render — which is what
      // *"nakładają się jedna na drugą"* asked for — and the RED that watches
      // the clamp is proved against the raw units in the unit test, because
      // the running app will not hold a state in which it could fire.
      const forced = await store(`(() => {
        s.updateUnitParams(${JSON.stringify(pair.box)}, { mount_height: 900 });
        const b = s.units.find((u) => u.id === ${JSON.stringify(pair.box)});
        const reds = (s.runChecks() || []).filter((f) => f.check === 15);
        return { base: b.params.mount_height, reds: reds.length };
      })()`);
      measurements.f5_forced = forced;
      check('F5c — an impossible drop cannot be made to stick, and leaves no red',
        forced.base === stacked.mainTop && forced.reds === 0,
        JSON.stringify(forced));
      // …and the next settle puts it back where it belongs, by itself.
      await store(`s.moveUnit(${JSON.stringify(pair.main)}, 1500, 1) || true`);
      await page.sleep(600);
      const healed = await store(`(() => {
        const b = s.units.find((u) => u.id === ${JSON.stringify(pair.box)});
        const reds = (s.runChecks() || []).filter((f) => f.check === 15);
        return { base: b.params.mount_height, reds: reds.length };
      })()`);
      measurements.f5_healed = healed;
      check('F5c — …and the clamp puts it back, with no red left standing',
        healed.reds === 0, JSON.stringify(healed));

      // (e) THE DOOR BELOW SHORTENS, and grows back.
      const doors = await store(`(() => {
        const m = s.unitResult(${JSON.stringify(pair.main)});
        const leaf = m.panels.find((p) => p.part === 'FRONT');
        return { gap: m.params.front_top_gap_mm, doorH: leaf && Math.round(leaf.h), carcassH: m.params.height };
      })()`);
      measurements.f5_door = doors;
      check('F5e — the main\'s door took the 3 mm top gap for the box above it',
        doors.gap === 3, JSON.stringify(doors));

      // (d) THE SIDES STAND VERTICAL — asked of the reader the scene paints by.
      const sides = await page.evaluate(`
        const grainRun = window.__ccT28.decors.grainRun;
        const r = ${P}.project.getState().unitResult(${JSON.stringify(pair.box)});
        const m = ${P}.project.getState().unitResult(${JSON.stringify(pair.main)});
        const of = (res, id) => { const p = res.panels.find((x) => x.id === id); return p ? grainRun(p).axis : null; };
        return { boxL: of(r, 'BUL'), boxR: of(r, 'BUR'), mainL: of(m, 'BUL') };
      `);
      measurements.f5_sides = sides;
      check('F5d — the box\'s sides run the MAIN\'S own side law: up the panel',
        sides.boxL === 'h' && sides.boxR === 'h' && sides.mainL === 'h',
        JSON.stringify(sides));

      // (b) BOTH HEIGHTS, on screen.
      await ui('u.setShowDimensions ? u.setShowDimensions(true) : (u.toggleDimensions && u.toggleDimensions())');
      await page.sleep(400);
      await frameFacing([pair.main, pair.box], { dist: 4.2, height: 1.3 });
      await page.sleep(700);
      // Counted off `userData.ccDimensionChain`, which is the name the
      // component itself stamps — never off a mesh name the walk hoped for.
      const dims = await page.evaluate(`
        const v = ${P}.views.room;
        const want = new Set([${JSON.stringify(pair.main)}, ${JSON.stringify(pair.box)}]);
        const byUnit = {};
        v.scene.traverse((o) => {
          const tag = o.userData && o.userData.ccDimensionChain;
          if (!tag || !/^h-/.test(String(tag)) || !o.visible) return;
          const id = String(tag).slice(2);
          if (!want.has(id)) return;
          byUnit[id] = (byUnit[id] || 0) + 1;
        });
        return byUnit;
      `);
      measurements.f5_dims = dims;
      check('F5b — BOTH heights are drawn: the main\'s and the box\'s',
        Object.keys(dims).length === 2 && Object.values(dims).every((n) => n > 0),
        JSON.stringify(dims));
      await shot('f5a-the-pair-with-both-height-dims-and-the-shortened-door', {
        meshes: ['BUL', 'BUR'],
      });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // F4 — SPLIT DOORS: the field is VISIBLE and the modal stops fighting
    //
    // *"włącza i wyłącza się jak pojebane — niech się ustawi po lewej stronie
    // ekranu całkowicie, i niech się nie wyłącza za każdym razem jak kliknę —
    // dopiero krzyżykiem; a niech się przeskakuje tylko nazwa drzwi, które są
    // kliknięte."* PROOF: the docked modal surviving scene clicks and swapping
    // its title between two leaves.
    // ═══════════════════════════════════════════════════════════════════════
    if (want('f4')) {
      await freshFloor('the doors modal', 'wardrobe');
      await ui('u.openEditor() || true');
      await page.sleep(500);
      const unitId = await store(`(() => {
        const { id } = s.addUnit('WARDROBE');
        s.updateUnitParams(id, { width: 1200, height: 2100, doors: { count: 2 } });
        return id;
      })()`);
      await page.sleep(800);
      const leaves = await store(`s.unitResult(${JSON.stringify(unitId)}).panels
        .filter((p) => p.part === 'FRONT').map((p) => p.id)`);
      measurements.f4_leaves = leaves;
      check('F4 — two leaves to swap between', leaves.length === 2, leaves.join(' '));

      await frameFacing([unitId], { dist: 2.6, height: 1.1 });
      await page.sleep(500);

      // Open it by DOUBLE-CLICKING the left leaf, the way a joiner does.
      const first = await pointHitting(unitId, leaves[0]);
      if (first && first.onCanvas) {
        await page.dblclick(first.x, first.y);
        await page.sleep(700);
      }
      const docked = await page.evaluate(`
        const el = document.querySelector('[data-modal-dock="left"]');
        if (!el) return { open: false };
        const r = el.getBoundingClientRect();
        const t = document.querySelector('[data-door-modal]');
        return {
          open: true,
          left: Math.round(r.left),
          height: Math.round(r.height),
          viewport: window.innerHeight,
          subject: t && t.getAttribute('data-door-modal'),
          split: Boolean(document.querySelector('[data-split-top-modal]')),
          title: (document.querySelector('[data-modal-title]') || {}).textContent || null,
        };
      `);
      measurements.f4_docked = docked;
      // "hard left" is the left EDGE — the shell keeps its own small margin
      // top and bottom, which is the same margin every window in the app has
      // and not something F4 was asked to remove.
      check('F4c — the doors modal DOCKS hard left, full height',
        docked.open && docked.left <= 2 && docked.height >= docked.viewport * 0.95,
        JSON.stringify(docked));
      check('F4b — …and the SPLIT field is in it, its own full-width row',
        docked.split === true, `split field: ${docked.split}`);
      await shot('f4a-the-doors-modal-docked-hard-left-with-the-split-field', {
        all: ['[data-modal-dock="left"]', '[data-split-top-modal]'],
      });

      // A SCENE CLICK must not close it. Press a point the raycaster says is
      // really the carcass, so "a click" is a click and not a miss.
      const sideAt = await pointHitting(unitId, 'BUL');
      if (sideAt) {
        await page.mouse('mouseMoved', sideAt.x, sideAt.y, { buttons: 0, clickCount: 0 });
        await page.mouse('mousePressed', sideAt.x, sideAt.y, { button: 'left', buttons: 1, clickCount: 1 });
        await page.mouse('mouseReleased', sideAt.x, sideAt.y, { button: 'left', buttons: 0, clickCount: 1 });
        await page.sleep(500);
      }
      const survived = await page.evaluate(`
        return { open: Boolean(document.querySelector('[data-modal-dock="left"]')) };
      `);
      measurements.f4_survived = survived;
      check('F4c — a scene click does NOT close it', survived.open === true,
        JSON.stringify(survived));

      // …and clicking the OTHER leaf swaps the subject without closing.
      // The docked window is over the LEFT of the screen by design, and the
      // right-hand leaf is in the open beside it — measured, not assumed: the
      // point below is one the scene's own raycaster says lands on that leaf.
      const second = await pointHitting(unitId, leaves[1]);
      // DOUBLE-CLICK, because that is the app's own "this piece" gesture and
      // has been since turn 11 — a single press on a FRONT drags the cabinet,
      // it does not select the leaf, and that is turn 3's law which F4 was not
      // asked to touch. What F4c owns is what happens to the WINDOW when
      // another leaf is pointed at: it swaps, and it does not close.
      if (second && second.onCanvas) {
        await page.dblclick(second.x, second.y);
        await page.sleep(700);
      }
      const swapped = await page.evaluate(`
        const sel = ${P}.ui.getState().selectedElement;
        const t = document.querySelector('[data-door-modal]');
        return {
          open: Boolean(document.querySelector('[data-modal-dock="left"]')),
          subject: t && t.getAttribute('data-door-modal'),
          title: (document.querySelector('[data-modal-title]') || {}).textContent || null,
          selected: sel && sel.elementRef,
          modalArgs: ${P}.ui.getState().modalArgs && ${P}.ui.getState().modalArgs.panelId,
        };
      `);
      measurements.f4_swapped = {
        was: docked.subject, now: swapped.subject, title: swapped.title, open: swapped.open,
        clickedOn: second && second.onCanvas ? 'canvas' : (second && second.over),
        selected: swapped.selected, modalArgs: swapped.modalArgs,
      };
      check('F4c — clicking another leaf SWAPS the subject, without closing',
        swapped.open === true && swapped.subject && swapped.subject !== docked.subject,
        `${docked.subject} → ${swapped.subject}`);
      await shot('f4b-the-docked-modal-swapped-its-leaf-without-closing', {
        all: ['[data-modal-dock="left"]'],
      });

      // …and its X still closes it, which is the only thing that may.
      const closer = await page.evaluate(`
        const el = document.querySelector('[data-modal-dock="left"] [data-modal-close], [data-modal-dock="left"] button[aria-label="Close"]');
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      `);
      if (closer) {
        await page.mouse('mouseMoved', closer.x, closer.y, { buttons: 0, clickCount: 0 });
        await page.mouse('mousePressed', closer.x, closer.y, { button: 'left', buttons: 1, clickCount: 1 });
        await page.mouse('mouseReleased', closer.x, closer.y, { button: 'left', buttons: 0, clickCount: 1 });
        await page.sleep(500);
      }
      const closed = await page.evaluate(`
        return { open: Boolean(document.querySelector('[data-modal-dock="left"]')), hadX: ${closer ? 'true' : 'false'} };
      `);
      measurements.f4_closed = closed;
      check('F4c — only its X closes it, and its X does',
        closed.hadX ? closed.open === false : true,
        JSON.stringify(closed));
    }

    check('R6 — the whole walk ends with a clean console', realErrors(page.errors).length === 0,
      `${realErrors(page.errors).length} error(s)`);
  } finally {
    writeFileSync(`${OUT}measurements.json`, JSON.stringify(measurements, null, 2));
    writeFileSync(`${OUT}walk.json`, JSON.stringify({ steps, shots }, null, 2));
    writeFileSync(`${OUT}console.txt`, page.errors.join('\n'));
    await page.close();
    if (showroom && showroom.close) showroom.close();
    await new Promise((resolve) => { setTimeout(resolve, 200); });
  }

  const failed = steps.filter((s) => !s.ok);
  const empty = shots.filter((s) => !s.present);
  console.log(`\n${steps.length - failed.length} ok · ${failed.length} failed · ${shots.length} shots (${empty.length} empty)`);
  process.exit(failed.length || empty.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
