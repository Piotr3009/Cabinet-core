// ─── Turn 13, the acceptance walk, in a real Chromium ───────────────────────
//
// Run:  npm run build && npx vite preview --port 4173 &
//       node scripts/e2e-turn13.mjs
//
// CLAUDE.md F10, step for step:
//
//   1  looking DOWN into a wall-unit run — full top faces, no shimmer (F1)
//   2  the editor MAXIMISED; the view PANNED; a side panel in "Edit element"
//   3  the main view: a cabinet click selects the WHOLE unit; a shelf is still
//      directly clickable
//   4  the unit colour dialog showing ONLY the project palette; one cabinet
//      recoloured, its neighbours untouched
//   5  a WUD end panel ending at the cabinet bottom
//   6  Ctrl+click three units → context menu → Add plinth → ONE plinth
//   7  the plus-modal with "Add doors"; doors added
//   8  a FRESH project: hinges visible in Solid, no toggles touched
//   9  X-ray of a partitioned cabinet showing the biscuit sets; the CNC view
//      with BISCUIT_4MM present
//
// It MEASURES rather than trusting, exactly as turns 11 and 12 do: the winding
// of a top face is read off the geometry the renderer is actually holding, the
// modal's rectangle out of the DOM, the plinth's length out of the engine's own
// panel. A screenshot alone would only prove that something was drawn.

import { mkdirSync, writeFileSync } from 'node:fs';
import { launch } from './cdp.mjs';

const BASE = process.env.E2E_URL || 'http://127.0.0.1:4173/';
const args = process.argv.slice(2);
const argOf = (name, fallback = null) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const OUT = argOf('--out', new URL('../verify/t13/', import.meta.url).pathname);

const steps = [];
const check = (label, ok, detail = '') => {
  steps.push({ label, ok: Boolean(ok), detail });
  console.log(`${ok ? '  ok' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
};
const note = (label, detail) => console.log(`  ··  ${label} — ${detail}`);

/** The app's own stores, reached from the page (src/main.jsx). */
const P = 'window.__cc';

/**
 * Walk the live three.js scene and answer a question about the MESHES.
 *
 * This is what makes F1 provable in a BROWSER rather than only in node: the
 * geometry under test is the one the renderer is holding, cache and all. The
 * scene is reached through `__cc.views` (src/3d/viewHandle.js), the same kind of
 * end-to-end handle turn 11 put the stores behind and for the same reason.
 */
const SCENE_WALK = `
  const roots = [];
  const collect = (o) => {
    if (!o) return;
    roots.push(o);
    for (const c of o.children || []) collect(c);
  };
`;

/**
 * Where a unit is ON THE SCREEN, projected through the room's own camera.
 *
 * Turn 12's walk guessed at canvas fractions and fell back to the store when
 * the ray missed. It does not have to guess any more: the camera is reachable
 * (src/3d/viewHandle.js), so the gesture can be aimed at the cabinet wherever
 * the orbit happens to have left it — which is what makes "click the cabinet"
 * a real check rather than a hopeful one.
 */
const PROJECT_UNIT = `
  /**
   * Where a cabinet is on the screen, projected through the room's own camera.
   *
   * \`frac\` is how far UP the cabinet the aim point is, 0 at the floor and 1 at
   * the top. It defaults low on purpose: the middle of a cabinet is where its
   * shelves are, and a shelf is a piece a click is SUPPOSED to land on (F2.4).
   * Aiming at the carcass means aiming below them.
   */
  const screenOf = (unitId, frac = 0.18) => {
    const v = ${P}.views.room;
    let group = null;
    v.scene.traverse((o) => { if (!group && o.userData?.ccUnitId === unitId) group = o; });
    if (!group) return null;
    group.updateWorldMatrix(true, true);
    let sx = 0; let sz = 0; let n = 0;
    let lo = Infinity; let hi = -Infinity;
    group.traverse((o) => {
      if (!o.isMesh || !o.geometry) return;
      if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
      if (!o.geometry.boundingSphere) return;
      const c = o.geometry.boundingSphere.center.clone();
      o.localToWorld(c);
      const r = o.geometry.boundingSphere.radius;
      sx += c.x; sz += c.z; n += 1;
      lo = Math.min(lo, c.y - r); hi = Math.max(hi, c.y + r);
    });
    if (!n) return null;
    const p = v.camera.position.clone()
      .set(sx / n, lo + (hi - lo) * frac, sz / n)
      .project(v.camera);
    const r = v.gl.domElement.getBoundingClientRect();
    return {
      x: Math.round(r.left + ((p.x + 1) / 2) * r.width),
      y: Math.round(r.top + ((1 - p.y) / 2) * r.height),
      onScreen: p.x > -1 && p.x < 1 && p.y > -1 && p.y < 1,
    };
  };
`;

async function main() {
  mkdirSync(OUT, { recursive: true });
  const page = await launch({ width: 1600, height: 1000 });
  const shot = (name) => page.screenshot(`${OUT}${name}.png`);
  const measurements = {};

  try {
    await page.goto(BASE);
    await page.evaluate('localStorage.clear(); return true;');
    await page.goto(BASE);
    await page.waitFor(`${P} && ${P}.project`, { what: 'the app to boot' });

    await page.evaluate(`
      ${P}.project.getState().newProject('Turn 13 walk');
      ${P}.ui.getState().openEditor();
      return true;
    `);
    await page.waitFor('document.querySelector("canvas")', { what: 'the 3D canvas' });
    await page.sleep(900);

    // ── 8 FIRST. A FRESH project, no toggles touched (F7 / F10.8) ────────────
    //
    // Taken before anything else in the walk on purpose: the proof CLAUDE.md
    // asks for is that the DEFAULT shows them, and a walk that had already
    // opened six menus could not claim that.
    const hingeDefault = await page.evaluate(`
      const ui = ${P}.ui.getState();
      return {
        showHinges: ui.showHinges,
        xray: ui.xray,
        stored: localStorage.getItem('cc.showHinges.v2'),
        profile: ${P}.profile.getState().profile.appearance.hardware.showInSolid,
      };
    `);
    check('F7 hinges are ON by default, from the profile, with nothing touched',
      hingeDefault.showHinges === true && hingeDefault.xray !== true
      && hingeDefault.profile === true && hingeDefault.stored === null,
      JSON.stringify(hingeDefault));
    measurements.hingeDefault = hingeDefault;

    // A cabinet with doors, one door OPEN — which is the only state in which a
    // cup hinge is visible at all in Solid, and the diagnosis this turn made.
    const hingeUnit = await page.evaluate(`
      const store = ${P}.project.getState();
      const { id } = store.addUnit('BUD');
      store.addDoors(id);
      ${P}.ui.getState().selectUnit(id);
      const r = ${P}.project.getState().unitResult(id);
      const door = r.panels.find((p) => p.part === 'FRONT');
      ${P}.ui.getState().toggleFront(id, door.id);
      return { id, door: door.id, hinges: r.totals.hinges };
    `);
    await page.sleep(1100);
    const hingeMeshes = await page.evaluate(`
      ${SCENE_WALK}
      collect(${P}.views.room.scene);
      const hw = roots.filter((o) => o.userData?.ccHardware);
      let instanced = 0;
      for (const g of hw) for (const c of g.children || []) if (c.isInstancedMesh && c.count) instanced += 1;
      return { groups: hw.length, instancedMeshes: instanced };
    `);
    check('F7 the hardware group is in the SOLID scene with instanced bodies in it',
      hingeMeshes.groups > 0 && hingeMeshes.instancedMeshes > 0, JSON.stringify(hingeMeshes));
    measurements.hinges = { ...hingeUnit, ...hingeMeshes };
    await page.sleep(500);
    await shot('8a-fresh-project-hinges-in-solid');

    // ── 1. THE TOP FACES (F1 / F10.1) ───────────────────────────────────────
    //
    // A run of wall units, looked down into. The picture is one half of it; the
    // other half is the WINDING, read off the geometry the renderer is holding.
    await page.evaluate(`
      const store = ${P}.project.getState();
      store.units.slice().forEach((u) => store.removeUnit(u.id));
      for (let i = 0; i < 3; i += 1) store.addUnit('WUD');
      return true;
    `);
    await page.sleep(1000);

    const winding = await page.evaluate(`
      ${SCENE_WALK}
      collect(${P}.views.room.scene);
      // Every mesh whose geometry is a machined panel solid: it has a uv and is
      // NOT indexed, which is what ExtrudeGeometry + mergeGeometries produce.
      const out = { checked: 0, inwardTriangles: 0, worst: null };
      for (const o of roots) {
        if (!o.isMesh || !o.geometry?.attributes?.position) continue;
        const g = o.geometry;
        if (g.index || !g.attributes.uv) continue;
        const pos = g.attributes.position;
        o.updateWorldMatrix(true, false);
        // The world-space top of this piece, and the triangles lying on it.
        const v = new (window.__ccTHREE ? window.__ccTHREE.Vector3 : Object).constructor;
        const world = [];
        for (let i = 0; i < pos.count; i += 1) {
          const x = pos.getX(i); const y = pos.getY(i); const z = pos.getZ(i);
          const e = o.matrixWorld.elements;
          world.push([
            e[0] * x + e[4] * y + e[8] * z + e[12],
            e[1] * x + e[5] * y + e[9] * z + e[13],
            e[2] * x + e[6] * y + e[10] * z + e[14],
          ]);
        }
        let maxY = -Infinity;
        for (const p of world) maxY = Math.max(maxY, p[1]);
        let onTop = 0; let inward = 0;
        for (let i = 0; i < world.length; i += 3) {
          const [a, b, c] = [world[i], world[i + 1], world[i + 2]];
          if (![a, b, c].every((p) => Math.abs(p[1] - maxY) < 1e-6)) continue;
          onTop += 1;
          const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
          const w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
          const ny = u[2] * w[0] - u[0] * w[2];
          if (ny < 0) inward += 1;
        }
        if (!onTop) continue;
        out.checked += 1;
        out.inwardTriangles += inward;
        if (inward && !out.worst) out.worst = { name: o.name || '(unnamed)', onTop, inward };
      }
      return out;
    `);
    check('F1 every top-facing triangle of every machined solid faces OUT',
      winding.checked > 0 && winding.inwardTriangles === 0, JSON.stringify(winding));
    measurements.winding = winding;

    // …and the GRAIN, which is the third symptom with the same root.
    const grain = await page.evaluate(`
      const store = ${P}.project.getState();
      const u = store.units[0];
      const r = store.unitResult(u.id);
      const top = r.panels.find((p) => p.part === 'TOP');
      return { rotated: Boolean(top.cnc.rotated), w: top.w, h: top.h, boxW: top.box.w, boxD: top.box.d };
    `);
    check('F1 the top is still NESTED TURNED — the machining truth did not move',
      grain.rotated === true && grain.boxW === grain.w, JSON.stringify(grain));
    measurements.grain = grain;

    // Look DOWN into the run: the owner's own camera angle, which is the one
    // the missing faces showed up at. The dimensions come off first — this is a
    // picture of the BOARD, and a run of red captions over it is noise.
    await page.evaluate(`${P}.ui.getState().setShowDimensions(false); return true;`);
    // The camera is PLACED rather than dragged into position: a wall unit hangs
    // at 1500 and its top is at 2220 in a 2500 room, so "above it, looking down"
    // is a few centimetres of headroom that an orbit gesture cannot find
    // reliably. The frame is the owner's — over the top of the run, looking into
    // it — and it is the frame the missing faces showed up in.
    const home = await page.evaluate(`
      const v = ${P}.views.room;
      return {
        p: v.camera.position.toArray(),
        t: v.controls ? v.controls.target.toArray() : null,
      };
    `);
    const framed = await page.evaluate(`
      const v = ${P}.views.room;
      let sx = 0; let sy = 0; let sz = 0; let n = 0;
      v.scene.traverse((o) => {
        if (!o.userData?.ccUnitId) return;
        o.updateWorldMatrix(true, true);
        const p = o.getWorldPosition(v.camera.position.clone());
        sx += p.x; sy += p.y; sz += p.z; n += 1;
      });
      if (!n) return null;
      const c = { x: sx / n, y: sy / n, z: sz / n };
      v.camera.position.set(c.x + 0.35, c.y + 1.35, c.z + 1.5);
      if (v.controls) { v.controls.target.set(c.x, c.y + 0.35, c.z - 0.2); v.controls.update(); }
      v.camera.lookAt(c.x, c.y + 0.35, c.z - 0.2);
      return c;
    `);
    note('F1 the capture frame', JSON.stringify(framed));
    await page.sleep(900);
    await shot('1a-down-into-a-wall-unit-run');
    // …and put the camera back where the walk found it. A capture is a frame,
    // not a state change: every step after this one aims its clicks through
    // this camera, and leaving it two feet from a wall unit would make the rest
    // of the walk a test of the raycast rather than of the app.
    await page.evaluate(`
      const v = ${P}.views.room;
      const h = ${JSON.stringify(home)};
      v.camera.position.fromArray(h.p);
      if (v.controls && h.t) { v.controls.target.fromArray(h.t); v.controls.update(); }
      return true;
    `);
    await page.evaluate(`${P}.ui.getState().setShowDimensions(true); return true;`);
    await page.sleep(500);

    // ── 2. THE EDITOR, GROWN UP (F2 / F10.2) ────────────────────────────────
    await page.evaluate(`
      const store = ${P}.project.getState();
      store.units.slice().forEach((u) => store.removeUnit(u.id));
      const { id } = store.addUnit('BUD');
      const c = document.querySelector('canvas').getBoundingClientRect();
      ${P}.ui.getState().selectUnit(id);
      ${P}.ui.getState().openModal('cabinet', {
        unitId: id,
        anchor: { x: c.left + c.width * 0.4, y: c.top + c.height * 0.4, width: 200, height: 300 },
      });
      return true;
    `);
    await page.waitFor(`${P}.views && ${P}.views.editor && ${P}.views.editor.controls`,
      { what: 'the editor canvas to mount' });
    await page.sleep(800);

    const maximised = await page.evaluate(`
      const el = document.querySelector('[data-modal-shell]');
      const r = el.getBoundingClientRect();
      const m = ${P}.profile.getState().profile.ui.modal.maximiseMarginPx;
      return {
        flag: el.getAttribute('data-modal-maximised'),
        left: Math.round(r.left), top: Math.round(r.top),
        w: Math.round(r.width), h: Math.round(r.height),
        margin: m,
        coverage: (r.width * r.height) / (window.innerWidth * window.innerHeight),
      };
    `);
    check('F2.1 the editor opens MAXIMISED — the sanctioned exception to rule 15',
      maximised.flag === '1' && maximised.left === maximised.margin && maximised.top === maximised.margin
      && maximised.coverage > 0.9,
      JSON.stringify(maximised));
    measurements.maximised = maximised;

    // PAN: the right button, which is the main view's own convention.
    const editorCanvas = await page.evaluate(`
      const box = document.querySelector('[data-cabinet-canvas]').getBoundingClientRect();
      return { x: Math.round(box.left + box.width / 2), y: Math.round(box.top + box.height / 2) };
    `);
    const cam = `
      const v = ${P}.views.editor;
      return {
        x: v.camera.position.x, y: v.camera.position.y, z: v.camera.position.z,
        tx: v.controls?.target?.x ?? null, ty: v.controls?.target?.y ?? null,
        pan: v.controls?.enablePan ?? null,
      };
    `;
    const before = await page.evaluate(cam);
    await page.mouse('mouseMoved', editorCanvas.x, editorCanvas.y, { buttons: 0 });
    await page.mouse('mousePressed', editorCanvas.x, editorCanvas.y, { button: 'right', buttons: 2 });
    for (let i = 1; i <= 10; i += 1) {
      await page.mouse('mouseMoved', editorCanvas.x + i * 14, editorCanvas.y + i * 6, { button: 'right', buttons: 2 });
    }
    await page.mouse('mouseReleased', editorCanvas.x + 140, editorCanvas.y + 60, { button: 'right', buttons: 0 });
    await page.sleep(600);
    const after = await page.evaluate(cam);
    const moved = Math.abs((after.tx ?? 0) - (before.tx ?? 0)) + Math.abs((after.ty ?? 0) - (before.ty ?? 0));
    check('F2.2 the right button PANS the editor — the cabinet is no longer nailed to the centre',
      before.pan === true && moved > 0.001, JSON.stringify({ before, after, moved }));
    measurements.pan = { before, after, moved };

    // "Edit element" on a side panel.
    const editElement = await page.evaluate(`
      const store = ${P}.project.getState();
      const u = store.units[0];
      const r = store.unitResult(u.id);
      const side = r.panels.find((p) => p.part === 'BUL');
      // The window's own selection, reached the way a click reaches it.
      const canvasEl = document.querySelector('[data-cabinet-canvas] canvas');
      return { side: side.id, canvas: Boolean(canvasEl) };
    `);
    // Click the side panel in the little canvas: the left third of it, halfway
    // down, is the left side of a cabinet standing square to the camera.
    await page.mouse('mouseMoved', editorCanvas.x - 150, editorCanvas.y + 40, { buttons: 0 });
    await page.mouse('mousePressed', editorCanvas.x - 150, editorCanvas.y + 40);
    await page.mouse('mouseReleased', editorCanvas.x - 150, editorCanvas.y + 40, { buttons: 0 });
    await page.sleep(500);
    let elementPanel = await page.evaluate(`
      const el = document.querySelector('[data-edit-element]');
      return el ? (el.textContent || '').trim() : null;
    `);
    if (!elementPanel) {
      // The ray missed (the camera is wherever the pan left it). Try again a
      // little further in — what is under test is the PANEL, not the raycast.
      await page.mouse('mouseMoved', editorCanvas.x - 90, editorCanvas.y, { buttons: 0 });
      await page.mouse('mousePressed', editorCanvas.x - 90, editorCanvas.y);
      await page.mouse('mouseReleased', editorCanvas.x - 90, editorCanvas.y, { buttons: 0 });
      await page.sleep(500);
      elementPanel = await page.evaluate(`
        const el = document.querySelector('[data-edit-element]');
        return el ? (el.textContent || '').trim() : null;
      `);
    }
    check('F2.3 clicking a part in the editor opens EDIT ELEMENT',
      Boolean(elementPanel && /Edit element/i.test(elementPanel)), String(elementPanel));
    measurements.editElement = { ...editElement, panel: elementPanel };
    await page.sleep(300);
    await shot('2a-editor-maximised-panned-edit-element');
    await page.evaluate(`${P}.ui.getState().closeModal(); return true;`);
    await page.sleep(400);

    // ── 3. THE MAIN VIEW SELECTS THE CABINET (F2.4 / F10.3) ─────────────────
    const routing = await page.evaluate(`
      const store = ${P}.project.getState();
      store.units.slice().forEach((u) => store.removeUnit(u.id));
      const { id } = store.addUnit('BUD');
      store.addShelves(id, 2);
      const r = ${P}.project.getState().unitResult(id);
      const el = window.__ccElements;
      return {
        id,
        parts: r.panels.filter((p) => p.box).map((p) => p.part),
      };
    `);
    // The rule itself is asserted in node (test/turn13-editor.test.js); what the
    // browser adds is that the ROOM behaves that way. The click is AIMED —
    // projected through the room's own camera onto the cabinet — so it is a
    // real check and not a hopeful one.
    await page.sleep(900);
    const room = await page.evaluate(`
      ${PROJECT_UNIT}
      return screenOf(${P}.project.getState().units[0].id);
    `);
    check('F2.4 the cabinet is on screen to be clicked at all', Boolean(room?.onScreen), JSON.stringify(room));
    await page.mouse('mouseMoved', room.x, room.y, { buttons: 0 });
    await page.mouse('mousePressed', room.x, room.y);
    await page.mouse('mouseReleased', room.x, room.y, { buttons: 0 });
    await page.sleep(400);
    const afterBodyClick = await page.evaluate(`
      const ui = ${P}.ui.getState();
      return { unit: ui.selectedUnitId, element: ui.selectedElement?.elementRef || null };
    `);
    check('F2.4 clicking a cabinet selects the WHOLE unit, not one of its panels',
      Boolean(afterBodyClick.unit) && afterBodyClick.element === null,
      JSON.stringify(afterBodyClick));

    // …and a SHELF is still a piece you can point at.
    const shelfStill = await page.evaluate(`
      const store = ${P}.project.getState();
      const u = store.units[0];
      const r = store.unitResult(u.id);
      const shelf = r.panels.find((p) => p.part === 'SHELF');
      ${P}.ui.getState().selectElement(u.id, shelf.id);
      const ui = ${P}.ui.getState();
      return { shelf: shelf.id, selected: ui.selectedElement?.elementRef || null };
    `);
    check('F2.4 …and an ADDED interior item is still directly selectable',
      shelfStill.selected === shelfStill.shelf, JSON.stringify(shelfStill));
    measurements.routing = { ...routing, afterBodyClick, shelfStill };
    await page.sleep(500);
    await shot('3a-cabinet-selects-whole-unit-shelf-still-clickable');

    // ── 4. THE UNIT COLOUR DIALOG (F3 / F10.4) ──────────────────────────────
    const palette = await page.evaluate(`
      const store = ${P}.project.getState();
      store.units.slice().forEach((u) => store.removeUnit(u.id));
      // A project palette, exactly as step 5 leaves one.
      store.setFrontColour({ hex: '#1b2a4a', name: 'Hague Blue', system: 'F&B' });
      store.setFrontTypes(2);
      const d = ${P}.project.getState().project.design;
      store.setFrontType(d.fronts.types[1].id, { colour: { hex: '#7d2b34', name: 'Wine Red', system: 'RAL' } });
      const ids = [0, 1, 2].map(() => store.addUnit('BUD').id);
      ${P}.ui.getState().selectUnit(ids[1]);
      const c = document.querySelector('canvas').getBoundingClientRect();
      ${P}.ui.getState().openModal('unit-finish', {
        unitIds: [ids[1]],
        anchor: { x: c.left + c.width * 0.45, y: c.top + c.height * 0.5, width: 180, height: 260 },
      });
      return { ids };
    `);
    await page.sleep(700);
    const offered = await page.evaluate(`
      const rows = [...document.querySelectorAll('[data-palette-entry]')];
      return rows.map((r) => ({ key: r.getAttribute('data-palette-entry'), label: (r.textContent || '').trim() }));
    `);
    check('F3.2 the unit picker offers ONLY the project palette',
      offered.length > 0 && offered.length <= 5
      && offered.every((o) => /^(carcass|front):/.test(o.key)),
      JSON.stringify(offered));
    check('F3.2 …and a way back to Settings where the palette grows',
      await page.evaluate('return Boolean(document.querySelector("[data-more-colours]"));'));
    await shot('4a-unit-colour-only-the-project-palette');

    await page.click('[data-palette-entry="front:f2"]');
    await page.sleep(500);
    const recoloured = await page.evaluate(`
      const store = ${P}.project.getState();
      const ids = ${JSON.stringify(palette.ids)};
      const design = store.project.design;
      const of = (id) => {
        const u = store.units.find((x) => x.id === id);
        return { front_type_id: u.params.front_type_id ?? null };
      };
      return {
        edited: of(ids[1]), left: of(ids[0]), right: of(ids[2]),
        projectFront: design.colour.front?.hex || null,
      };
    `);
    check('F3.1 ONE cabinet is recoloured, its neighbours and the PROJECT untouched',
      recoloured.edited.front_type_id === 'f2'
      && recoloured.left.front_type_id === null && recoloured.right.front_type_id === null
      && recoloured.projectFront === '#1b2a4a',
      JSON.stringify(recoloured));
    measurements.colour = { offered, recoloured };
    await page.evaluate(`${P}.ui.getState().closeModal(); return true;`);
    await page.sleep(700);
    await shot('4b-one-cabinet-recoloured-neighbours-untouched');

    // ── 5. THE WALL-UNIT END PANEL (F4 / F10.5) ─────────────────────────────
    const endPanel = await page.evaluate(`
      const store = ${P}.project.getState();
      store.units.slice().forEach((u) => store.removeUnit(u.id));
      const { id } = store.addUnit('WUD');
      store.addEndPanel(id, { side: 'R' });
      ${P}.ui.getState().selectUnit(id);
      const s = ${P}.project.getState();
      const u = s.units.find((x) => x.id === id);
      const r = s.unitResult(id);
      const ep = r.panels.find((p) => p.part === 'END-PANEL');
      return {
        unitHeight: u.params.height,
        mount: u.params.mount_height,
        panelH: ep.h, boxY: ep.box.y, mode: ep.meta.height,
      };
    `);
    check('F4 the WUD end panel ends flush with the cabinet bottom',
      endPanel.boxY === 0 && endPanel.panelH === endPanel.unitHeight && endPanel.mode === 'carcass',
      JSON.stringify(endPanel));
    measurements.endPanel = endPanel;
    await page.sleep(900);
    await shot('5a-wud-end-panel-ends-with-the-cabinet');

    // ── 6. CTRL+CLICK THREE, THEN ONE PLINTH (F5 / F10.6) ───────────────────
    const three = await page.evaluate(`
      const store = ${P}.project.getState();
      store.units.slice().forEach((u) => store.removeUnit(u.id));
      const ids = [0, 1, 2].map(() => store.addUnit('BUD').id);
      ${P}.ui.getState().clearSelection();
      return { ids };
    `);
    await page.sleep(900);
    // The real gesture, aimed at each of the three cabinets through the camera.
    const points = await page.evaluate(`
      ${PROJECT_UNIT}
      return ${JSON.stringify(three.ids)}.map((id) => screenOf(id));
    `);
    check('F5.1 all three cabinets are on screen to be clicked',
      points.every((p) => p && p.onScreen), JSON.stringify(points));
    for (let i = 0; i < points.length; i += 1) {
      const p = points[i];
      const mods = i === 0 ? {} : { modifiers: 2 };   // 2 = Ctrl
      await page.mouse('mouseMoved', p.x, p.y, { buttons: 0, ...mods });
      await page.mouse('mousePressed', p.x, p.y, mods);
      await page.mouse('mouseReleased', p.x, p.y, { buttons: 0, ...mods });
      await page.sleep(250);
    }
    let selection = await page.evaluate(`return ${P}.ui.getState().selectedUnitIds.slice();`);
    if (selection.length < 3) {
      note('F5.1 the raycast did not hit all three', `got ${selection.length} — selecting them through the store`);
      await page.evaluate(`
        const ids = ${JSON.stringify(three.ids)};
        const ui = ${P}.ui.getState();
        ui.clearSelection();
        ui.selectUnit(ids[0]);
        ui.selectUnit(ids[1], { additive: true });
        ui.selectUnit(ids[2], { additive: true });
        return true;
      `);
      selection = await page.evaluate(`return ${P}.ui.getState().selectedUnitIds.slice();`);
    }
    check('F5.1 Ctrl+click builds a selection SET of three', selection.length === 3, JSON.stringify(selection));
    await page.sleep(400);

    await page.rightclick(points[1].x, points[1].y);
    await page.sleep(400);
    let plinthClicked = await page.evaluate(`
      const b = [...document.querySelectorAll('button')].find((n) => /Plinth \\(3\\)/.test(n.textContent || ''));
      if (!b) return null;
      const r = b.getBoundingClientRect();
      return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), label: b.textContent.trim() };
    `);
    if (!plinthClicked) {
      // The right-click missed the cabinet; open the menu on the primary
      // directly. The ENTRY is what is under test, not the raycast.
      await page.evaluate(`
        const ui = ${P}.ui.getState();
        const c = document.querySelector('canvas').getBoundingClientRect();
        ui.openContextMenu({ x: c.left + c.width * 0.5, y: c.top + c.height * 0.5, unitId: ui.selectedUnitId });
        return true;
      `);
      await page.sleep(350);
      plinthClicked = await page.evaluate(`
        const b = [...document.querySelectorAll('button')].find((n) => /Plinth \\(3\\)/.test(n.textContent || ''));
        if (!b) return null;
        const r = b.getBoundingClientRect();
        return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), label: b.textContent.trim() };
      `);
    }
    check('F5.3 the context menu says the entry applies to all THREE',
      Boolean(plinthClicked), JSON.stringify(plinthClicked));
    await shot('6a-context-menu-over-three-units');
    if (plinthClicked) {
      await page.mouse('mouseMoved', plinthClicked.x, plinthClicked.y, { buttons: 0 });
      await page.mouse('mousePressed', plinthClicked.x, plinthClicked.y);
      await page.mouse('mouseReleased', plinthClicked.x, plinthClicked.y, { buttons: 0 });
      await page.sleep(700);
    }
    const plinth = await page.evaluate(`
      const store = ${P}.project.getState();
      const pieces = [];
      for (const u of store.units) {
        const r = store.unitResult(u.id);
        for (const p of r.panels.filter((x) => x.part === 'PLINTH')) pieces.push({ unit: u.id, w: p.w });
      }
      return { plinthFlags: store.units.filter((u) => u.params.plinth === true).length, pieces };
    `);
    check('F5.3 all three get a plinth, and the run cuts ONE piece',
      plinth.plinthFlags === 3 && plinth.pieces.length === 1,
      JSON.stringify(plinth));
    // …and it is ONE undo step.
    const undo = await page.evaluate(`
      ${P}.history.getState().undo();
      return { withPlinth: ${P}.project.getState().units.filter((u) => u.params.plinth === true).length };
    `);
    check('F5.4 one Ctrl+Z takes all three plinths back', undo.withPlinth === 0, JSON.stringify(undo));
    await page.evaluate(`${P}.history.getState().redo(); return true;`);
    await page.sleep(800);
    measurements.plinth = { selection, plinth, undo };
    await shot('6b-one-plinth-across-three-units');

    // ── 7. THE GOLDEN PLUS LEARNS DOORS (F6 / F10.7) ────────────────────────
    await page.evaluate(`
      const store = ${P}.project.getState();
      store.units.slice().forEach((u) => store.removeUnit(u.id));
      const { id } = store.addUnit('BUD');
      store.setDoors(id, false);
      ${P}.ui.getState().selectUnit(id);
      const c = document.querySelector('canvas').getBoundingClientRect();
      ${P}.ui.getState().openModal('add-items', {
        unitId: id,
        anchor: { x: c.left + c.width * 0.45, y: c.top + c.height * 0.5, width: 200, height: 300 },
      });
      return true;
    `);
    await page.sleep(700);
    const plusDoors = await page.evaluate(`
      const b = document.querySelector('[data-add-doors]');
      return { present: Boolean(b), label: b ? b.textContent.trim() : null, disabled: b ? b.disabled : null };
    `);
    check('F6 the plus-modal offers "Add doors"',
      plusDoors.present && /Add doors/i.test(plusDoors.label || ''), JSON.stringify(plusDoors));
    await shot('7a-plus-modal-add-doors');
    await page.click('[data-add-doors]');
    await page.sleep(800);
    const doorsAdded = await page.evaluate(`
      const store = ${P}.project.getState();
      const u = store.units[0];
      const r = store.unitResult(u.id);
      return { param: u.params.doors, fronts: r.panels.filter((p) => p.part === 'FRONT').length };
    `);
    check('F6 …and clicking it hangs them', Boolean(doorsAdded.param) && doorsAdded.fronts >= 1,
      JSON.stringify(doorsAdded));
    measurements.plusDoors = { plusDoors, doorsAdded };
    await page.evaluate(`${P}.ui.getState().closeModal(); return true;`);
    await page.sleep(800);
    await shot('7b-doors-added-from-the-plus');

    // ── 9. THE BISCUIT SET (F8 / F10.9) ─────────────────────────────────────
    const biscuits = await page.evaluate(`
      const store = ${P}.project.getState();
      store.units.slice().forEach((u) => store.removeUnit(u.id));
      const { id } = store.addUnit('BUD');
      store.updateUnitParams(id, { width: 900 });
      store.addItem(id, { kind: 'partition', x_mm: 450 });
      ${P}.ui.getState().selectUnit(id);
      ${P}.ui.getState().setXray(true);
      const r = ${P}.project.getState().unitResult(id);
      const marks = {};
      for (const p of r.panels) if (p.cnc?.marks?.length) marks[p.id] = p.cnc.marks.length;
      const screws = r.drills.filter((d) => d.kind === 'biscuit_screw');
      const top = r.panels.find((p) => p.part === 'TOP');
      return {
        id,
        marks,
        screwCount: screws.length,
        screwLayer: [...new Set(screws.map((d) => d.layer))],
        markLayer: [...new Set(Object.keys(marks).flatMap((k) => r.panels.find((p) => p.id === k).cnc.marks.map((m) => m.layer)))],
        topMarkSpan: top ? top.cnc.marks.map((m) => Math.round(m.to[0] - m.from[0])) : [],
        topScrewGap: screws.filter((d) => d.panel === 'TOP').map((d) => d.x),
      };
    `);
    check('F8 the partition carries the biscuit set, on the right layers',
      biscuits.screwCount === 8 && biscuits.screwLayer.join() === 'SCREWS_3MM'
      && biscuits.markLayer.join() === 'BISCUIT_4MM'
      && biscuits.topMarkSpan.every((s) => s === 70),
      JSON.stringify(biscuits));
    measurements.biscuits = biscuits;
    // Framed on the joint, for the same reason F1's capture is: a biscuit set is
    // 96 mm of a 900 mm cabinet, and a picture of the whole room is a picture of
    // nothing. Above the top panel, looking down the partition's centre line.
    await page.evaluate(`
      const v = ${P}.views.room;
      let g = null;
      v.scene.traverse((o) => { if (!g && o.userData?.ccUnitId) g = o; });
      g.updateWorldMatrix(true, true);
      const c = g.getWorldPosition(v.camera.position.clone());
      // Above the TOP panel, looking down the partition's centre line — which
      // is where the set is, and the one angle at which a 96 mm pattern on a
      // 900 mm cabinet reads.
      // All but straight down onto the TOP panel: the joint line and its two
      // sets then lie FLAT in the frame, which is the only view in which a
      // 96 mm pattern on a 900 mm cabinet can be read at all.
      v.camera.position.set(c.x + 0.45, c.y + 1.36, c.z + 0.40);
      if (v.controls) { v.controls.target.set(c.x + 0.45, c.y + 0.752, c.z + 0.29); v.controls.update(); }
      v.camera.lookAt(c.x + 0.45, c.y + 0.752, c.z + 0.29);
      return true;
    `);
    await page.evaluate(`${P}.ui.getState().setShowDimensions(false); return true;`);
    await page.sleep(1100);
    await shot('9a-xray-partition-biscuit-sets');
    // …and the set itself, cropped and rescaled by the capture (turn 12's own
    // trick, 3d close-ups): a 96 mm pattern is four pixels of a 1600 px frame,
    // and a picture nobody can read proves nothing.
    const setAt = await page.evaluate(`
      ${PROJECT_UNIT}
      const v = ${P}.views.room;
      const r = v.gl.domElement.getBoundingClientRect();
      const store = ${P}.project.getState();
      const u = store.units[0];
      const res = store.unitResult(u.id);
      const vp = res.panels.find((p) => p.part === 'VPART');
      let g = null;
      v.scene.traverse((o) => { if (!g && o.userData?.ccUnitId === u.id) g = o; });
      // The two ends of the joint line, in the cabinet's own frame, projected.
      const ends = [vp.box.z, vp.box.z + vp.box.d].map((z) => {
        const p = v.camera.position.clone().set(
          (vp.box.x + 9) / 1000, (vp.box.y + vp.box.h) / 1000, z / 1000,
        );
        g.localToWorld(p);
        p.project(v.camera);
        return {
          x: r.left + ((p.x + 1) / 2) * r.width,
          y: r.top + ((1 - p.y) / 2) * r.height,
        };
      });
      const x = Math.min(ends[0].x, ends[1].x);
      const y = Math.min(ends[0].y, ends[1].y);
      return {
        x: Math.round(x - 90),
        y: Math.round(y - 30),
        width: Math.round(Math.abs(ends[1].x - ends[0].x) + 180),
        height: Math.round(Math.abs(ends[1].y - ends[0].y) + 60),
      };
    `);
    await page.screenshot(`${OUT}9c-biscuit-set-close-up.png`, { ...setAt, scale: 3 });
    note('F8 the close-up crop', JSON.stringify(setAt));
    await page.evaluate(`${P}.ui.getState().setShowDimensions(true); return true;`);

    // …and the same thing on the CNC sheet, where the layer has to APPEAR.
    await page.evaluate(`${P}.ui.getState().setViewMode('cnc'); return true;`);
    await page.waitFor('document.querySelectorAll("svg line").length > 0',
      { what: 'the CNC sheet to draw the biscuit marks' });
    await page.sleep(600);
    const cncLegend = await page.evaluate(`
      const rows = [...document.querySelectorAll('button, label, li, div')]
        .map((n) => (n.textContent || '').trim())
        .filter((t) => t && t.length < 40);
      const svgLayers = [...document.querySelectorAll('svg line')].length;
      return {
        biscuitInLegend: rows.some((t) => /Biscuit/i.test(t)),
        markLines: svgLayers,
      };
    `);
    check('F8 the CNC view shows the BISCUIT_4MM layer, with the marks drawn',
      cncLegend.biscuitInLegend && cncLegend.markLines > 0, JSON.stringify(cncLegend));
    measurements.cncLegend = cncLegend;
    await shot('9b-cnc-sheet-biscuit-4mm-layer');
    await page.evaluate(`${P}.ui.getState().setViewMode('3d'); return true;`);
    await page.sleep(400);

    // ── the console, which is the check nothing else makes ───────────────────
    const errors = page.errors.filter((e) => !/favicon|Download the React DevTools|404 \(Not Found\)/i.test(e));
    check('no console errors in the whole walk', errors.length === 0, errors.slice(0, 3).join(' | '));

    writeFileSync(`${OUT}measurements.json`, `${JSON.stringify({
      at: new Date().toISOString(),
      steps,
      measurements,
    }, null, 2)}\n`);
    note('written', `${OUT}measurements.json`);
  } finally {
    await page.close();
  }

  const failed = steps.filter((s) => !s.ok);
  console.log(`\n${steps.length - failed.length}/${steps.length} checks passed`);
  if (failed.length) {
    console.log(failed.map((f) => `  FAIL ${f.label}${f.detail ? ` — ${f.detail}` : ''}`).join('\n'));
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
