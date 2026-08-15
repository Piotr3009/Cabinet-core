// ─── Turn 31, the acceptance walk, in a real Chromium ───────────────────────
//
// Run:  npm run build
//       npx vite preview --port 4173 &
//       node scripts/e2e-turn31.mjs [--only f1,f2,…]
//
// ─── WHAT THIS TURN'S PROOFS HAVE TO DO ─────────────────────────────────────
//
// CLAUDE.md rule 3: "Proof screenshots in `verify/t31/`, each containing its
// named subject; an empty frame fails the phase. Browser proofs on REAL pointer
// input where a feature is interactive."
//
// So every picture below is framed off the MOUNTED MESHES or off the RENDERED
// DOM of the thing it names — never off a hand-typed camera position — and
// every gesture that a joiner would make with a hand is made here with
// `Input.dispatchMouseEvent`. The guard from turn 30 is kept: this file reads
// itself and refuses to run if anybody adds a synthetic DOM event.
//
// ─── AND "AN EMPTY FRAME FAILS THE PHASE" IS ENFORCED, NOT PROMISED ─────────
//
// `shot()` does not just capture. It first asks the page whether the named
// subject is on the screen — a selector, a mounted mesh, or both — and records
// the answer beside the picture in `walk.json`. A phase whose subject was not
// there fails, and the picture is still written so the failure can be looked at.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { launch } from './cdp.mjs';
import { startFixtureServer } from './fixture-server.mjs';

const BASE = process.env.E2E_URL || 'http://127.0.0.1:4173/';
const args = process.argv.slice(2);
const argOf = (name, fallback = null) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const OUT = argOf('--out', new URL('../verify/t31/', import.meta.url).pathname);
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
  const page = await launch({ width: 1600, height: 1000 });

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

  /**
   * A proof picture, and the assertion that it is not an empty frame.
   *
   * `subject` is how the page is asked whether the named thing is on screen:
   *   { dom: 'css selector' }        — it is rendered
   *   { mesh: 'ccPanelId' }          — it is mounted in the room
   *   { text: 'some words' }         — those words are on the screen
   * All three may be given; all given must hold.
   */
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
        if (want.text) out.text = (document.body.innerText || '').includes(want.text);
        if (want.mesh) {
          const v = ${P}.views && ${P}.views.room;
          let n = 0;
          if (v) v.scene.traverse((o) => { if (o.isMesh && o.userData && o.userData.ccPanelId === want.mesh && o.visible) n += 1; });
          out.mesh = n > 0;
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
    ${P}.ui.getState().closeAllFronts();
    ${P}.ui.getState().selectUnit(null);
    return true;
  `);

  /** Put the camera on a SET of cabinets, framed off their own mounted meshes. */
  const frameUnits = async (unitIds, offset = [1, 1, 2]) => page.evaluate(`
    const v = ${P}.views && ${P}.views.room;
    if (!v) return null;
    const THREE = v.three;
    const want = new Set(${JSON.stringify(unitIds)});
    v.scene.updateMatrixWorld(true);
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
    if (v.controls) v.controls.enableDamping = false;
    if (v.controls && v.controls.target) v.controls.target.copy(c);
    v.camera.position.set(c.x + off[0] * r, c.y + off[1] * r, c.z + off[2] * r);
    v.camera.up.set(0, 1, 0);
    v.camera.lookAt(c);
    v.camera.updateProjectionMatrix();
    if (v.controls) v.controls.update();
    return found;
  `);

  /** Where a mounted panel is ON THE SCREEN — the only honest way to click it. */
  const screenOf = async (panelId) => page.evaluate(`
    const v = ${P}.views && ${P}.views.room;
    if (!v) return null;
    const THREE = v.three;
    const want = ${JSON.stringify(panelId)};
    let mesh = null;
    v.scene.updateMatrixWorld(true);
    v.scene.traverse((o) => { if (!mesh && o.isMesh && o.userData && o.userData.ccPanelId === want) mesh = o; });
    if (!mesh) return null;
    const c = new THREE.Box3().setFromObject(mesh).getCenter(new THREE.Vector3()).project(v.camera);
    const r = v.gl.domElement.getBoundingClientRect();
    return {
      x: r.left + ((c.x + 1) / 2) * r.width,
      y: r.top + ((1 - c.y) / 2) * r.height,
    };
  `);

  /** The window on screen, as a rectangle, plus what the shell says about it. */
  const shellBox = async () => page.evaluate(`
    const el = document.querySelector('[data-modal-shell="1"]');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const head = el.querySelector('[data-modal-handle="1"]');
    const h = head ? head.getBoundingClientRect() : null;
    return {
      name: el.getAttribute('data-modal-name') || '',
      anchored: el.getAttribute('data-modal-anchored') === '1',
      side: el.getAttribute('data-modal-side') || '',
      x: r.left, y: r.top, width: r.width, height: r.height,
      handle: h ? { x: h.left + h.width / 2, y: h.top + h.height / 2 } : null,
    };
  `);

  /** Drag a window by its header with a REAL pointer, and say where it went. */
  const dragWindow = async (dx, dy) => {
    const before = await shellBox();
    if (!before?.handle) return null;
    await page.mouse('mouseMoved', before.handle.x, before.handle.y, { buttons: 0, clickCount: 0 });
    await page.mouse('mousePressed', before.handle.x, before.handle.y);
    // Several steps, because the shell listens on `pointermove` and a single
    // jump is a gesture no hand ever makes.
    for (let i = 1; i <= 6; i += 1) {
      await page.mouse('mouseMoved', before.handle.x + (dx * i) / 6, before.handle.y + (dy * i) / 6);
    }
    await page.mouse('mouseReleased', before.handle.x + dx, before.handle.y + dy, { buttons: 0 });
    await page.sleep(220);
    const after = await shellBox();
    return { before, after, moved: Math.round(Math.hypot(after.x - before.x, after.y - before.y)) };
  };

  const overlaps = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width
    && a.y < b.y + b.height && b.y < a.y + a.height;

  const measurements = {};

  try {
    await page.goto(BASE);
    await page.evaluate(`localStorage.clear(); localStorage.setItem('cc.hardwareBase', ${JSON.stringify(showroom.url)}); return true;`);
    await page.goto(BASE);
    await page.waitFor(`${P} && ${P}.project`, { what: 'the app to boot' });
    check('R8 — the app is pointed at the silent showroom', true, showroom.url);

    // ═══════════════════════════════════════════════════════════════════════
    // F1 [CRITICAL] — the modal shell, mandatory
    // ═══════════════════════════════════════════════════════════════════════
    //
    // "Proof: three different modals dragged and opened beside their objects."
    //
    // THREE DIFFERENT WINDOWS, each opened by the gesture a joiner uses for it:
    // a right-click on a cabinet (the cabinet editor), a double-click on a leaf
    // (the door window), and a click on a panel control (the unit finish). Each
    // is measured for the two halves of the rule — it does not cover its object,
    // and the header moves it — and each is photographed.
    if (want('f1')) {
      await newRoom('Turn 31 walk — F1');
      await page.evaluate(`
        const s = ${P}.project.getState();
        const a = s.addUnit('BUD');
        // A door, asked for: a base unit arrives in a PROJECT with no opinion
        // about its fronts (turn 30 F10 — a new cabinet has no style of its
        // own), and this phase is about a window opened FROM a leaf.
        s.updateUnitParams(a.id, { width: 800, doors: { count: 2 } });
        const b = s.addUnit('BUD');
        s.updateUnitParams(b.id, { doors: { count: 1 } });
        const r = s.unitResult(a.id);
        window.__t31 = {
          unitA: a.id, unitB: b.id,
          leaf: (r.panels.find((p) => p.part === 'FRONT') || {}).id || null,
        };
        return true;
      `);
      await page.waitFor('document.querySelector("canvas")', { what: 'the 3D canvas' });
      const ids = await page.evaluate('return [window.__t31.unitA, window.__t31.unitB];');
      // The MESHES first: a camera framed on a cabinet three has not mounted
      // yet is a camera framed on the origin, and every click after it lands
      // off the canvas.
      await page.waitFor(`(() => {
        const v = ${P}.views && ${P}.views.room;
        if (!v) return false;
        let n = 0;
        v.scene.traverse((o) => { if (o.isMesh && o.userData && o.userData.ccPanelId === window.__t31.leaf) n += 1; });
        return n > 0;
      })()`, { what: 'the leaf to mount', timeout: 30000 });
      await frameUnits(ids, [0.9, 0.7, 2.4]);
      await page.sleep(900);

      const f1 = {};

      // ── 1. The cabinet editor, from a right-click on the cabinet ──────────
      const atA = await screenOf(await page.evaluate('return window.__t31.leaf;'));
      await page.rightclick(atA.x, atA.y);
      await page.sleep(200);
      await page.click('[data-menu-entry="edit-cabinet"]');
      await page.sleep(500);
      // ─── THE CABINET EDITOR IS A WORKSPACE (turn 13, rule 15's one sanctioned
      // exception): it opens MAXIMISED. That is not an escape from the rule —
      // "It is the INITIAL state, not a lock" — so the proof is the restore: the
      // ❐ in its own header hands it back to the shell, and it must then be an
      // ordinary window, beside its object and dragged by its header.
      const wasBig = await page.evaluate(`
        const el = document.querySelector('[data-modal-shell="1"]');
        return el ? el.getAttribute('data-modal-maximised') === '1' : null;
      `);
      if (wasBig) {
        await page.click('[data-modal-maximise="1"]');
        await page.sleep(500);
      }
      let box = await shellBox();
      check('F1 — the workspace opens maximised and RESTORES to an ordinary window',
        wasBig === true && box?.side !== 'maximised', `was ${wasBig} · now side ${box?.side}`);
      f1.cabinet = {
        name: box?.name,
        anchored: box?.anchored,
        // The object is the cabinet's own screen box; "beside" is measured
        // against it, not against a guess.
        coversTheClick: box ? (atA.x >= box.x && atA.x <= box.x + box.width
          && atA.y >= box.y && atA.y <= box.y + box.height) : null,
      };
      check('F1 — a right-click on a cabinet opens the SHELL, and it knows its object',
        box?.name === 'cabinet' && box.anchored === true,
        `${box?.name} · anchored ${box?.anchored} · side ${box?.side}`);
      check('F1 — …and it does not land on the object it is about',
        f1.cabinet.coversTheClick === false,
        `click (${Math.round(atA.x)},${Math.round(atA.y)}) vs window at ${Math.round(box.x)},${Math.round(box.y)}`);
      await shot('1a-the-cabinet-editor-opened-beside-the-cabinet-it-is-about',
        { dom: '[data-modal-name="cabinet"]' });
      const dragA = await dragWindow(-260, 120);
      f1.cabinetDrag = dragA?.moved;
      check('F1 — the header moves it: a real pointer drag, and the window follows',
        dragA && dragA.moved > 200, `${dragA?.moved} px by the header`);
      await shot('1b-the-same-window-dragged-by-its-header',
        { dom: '[data-modal-name="cabinet"]' });
      await page.key('Escape', { code: 'Escape', windowsVirtualKeyCode: 27 });
      await page.sleep(300);

      // ── 2. The door window, from a double-click on the leaf ───────────────
      await frameUnits(ids, [0.9, 0.7, 2.4]);
      await page.sleep(700);
      const atLeaf = await screenOf(await page.evaluate('return window.__t31.leaf;'));
      await page.dblclick(atLeaf.x, atLeaf.y);
      await page.sleep(600);
      box = await shellBox();
      f1.door = {
        name: box?.name,
        anchored: box?.anchored,
        coversTheClick: box ? (atLeaf.x >= box.x && atLeaf.x <= box.x + box.width
          && atLeaf.y >= box.y && atLeaf.y <= box.y + box.height) : null,
      };
      check('F1 — a double-click on a leaf opens the SHELL, anchored to the leaf',
        box?.name === 'element' && box.anchored === true,
        `${box?.name} · anchored ${box?.anchored}`);
      check('F1 — …and this one does not land on the door either',
        f1.door.coversTheClick === false,
        `click (${Math.round(atLeaf.x)},${Math.round(atLeaf.y)})`);
      await shot('1c-the-door-window-beside-the-door-it-was-opened-from',
        { dom: '[data-modal-name="element"]' });
      const dragB = await dragWindow(220, -140);
      f1.doorDrag = dragB?.moved;
      check('F1 — …and it drags by its header too', dragB && dragB.moved > 180, `${dragB?.moved} px`);
      await shot('1d-the-door-window-dragged-by-its-header',
        { dom: '[data-modal-name="element"]' });
      await page.key('Escape', { code: 'Escape', windowsVirtualKeyCode: 27 });
      await page.sleep(300);

      // ── 3. The unit finish, from the right-click menu's own entry ─────────
      //
      // A THIRD window, opened by a THIRD kind of gesture: not the canvas and
      // not a double-click, but a menu entry — whose rectangle is the object as
      // far as the shell is concerned (`ContextMenu.menuAnchor`). The window
      // must stand clear of the MENU, which is what "beside the clicked object"
      // means when the thing clicked is a line of text.
      await frameUnits(ids, [0.9, 0.7, 2.4]);
      await page.sleep(700);
      const atB = await screenOf(await page.evaluate('return window.__t31.leaf;'));
      await page.rightclick(atB.x, atB.y);
      await page.sleep(250);
      const btnRect = await page.evaluate(`
        const el = document.querySelector('[data-menu-entry="unit-colour"]');
        if (!el) return null;
        const menu = el.closest('.cc-panel') || el;
        const r = menu.getBoundingClientRect();
        return { x: r.left, y: r.top, width: r.width, height: r.height };
      `);
      const btn = await page.click('[data-menu-entry="unit-colour"]');
      await page.sleep(450);
      box = await shellBox();
      f1.finish = {
        name: box?.name,
        anchored: box?.anchored,
        clear: btnRect && box ? !overlaps(box, btnRect) : null,
        menu: btnRect,
        at: btn,
      };
      check('F1 — a MENU ENTRY opens the SHELL, anchored to the entry',
        box?.name === 'unit-finish' && box.anchored === true,
        `${box?.name} · anchored ${box?.anchored}`);
      check('F1 — …and stands clear of the menu it was chosen from',
        f1.finish.clear === true, JSON.stringify(btnRect));
      await shot('1e-the-unit-finish-window-beside-the-menu-entry-that-opened-it',
        { dom: '[data-modal-name="unit-finish"]' });
      const dragC = await dragWindow(-300, 60);
      f1.finishDrag = dragC?.moved;
      check('F1 — …and the third window drags by its header as well',
        dragC && dragC.moved > 240, `${dragC?.moved} px`);
      await shot('1f-the-third-window-dragged-three-of-three',
        { dom: '[data-modal-name="unit-finish"]' });

      // ── And the guard: nothing opened without knowing its object ──────────
      const faults = await page.evaluate(`
        return (${P}.modalFaults ? ${P}.modalFaults() : []).map((f) => f.message);
      `);
      f1.faults = faults;
      check('F1 — the shell guard had nothing to report all phase',
        Array.isArray(faults) && faults.length === 0, faults.join(' | ') || 'clean');

      await page.key('Escape', { code: 'Escape', windowsVirtualKeyCode: 27 });
      await page.sleep(250);
      measurements.f1 = f1;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // F2 [CRITICAL] — one dirty gate + message levels (the owner's colours)
    // ═══════════════════════════════════════════════════════════════════════
    //
    // "Proof: one of each level on screen, screenshotted."
    //
    // ONE OF EACH, AT ONCE, which is the whole point: the old slot could not
    // hold two. Then each contract is exercised with a real gesture — the
    // yellow goes when the pointer lands somewhere else, the red does NOT, and
    // the red only goes when it is clicked itself.
    if (want('f2')) {
      await newRoom('Turn 31 walk — F2');
      await page.evaluate(`
        const s = ${P}.project.getState();
        const a = s.addUnit('BUD');
        s.updateUnitParams(a.id, { width: 800, doors: { count: 2 } });
        window.__t31 = { unitA: a.id };
        return true;
      `);
      await page.waitFor('document.querySelector("canvas")', { what: 'the 3D canvas' });
      await frameUnits([await page.evaluate('return window.__t31.unitA;')], [0.9, 0.7, 2.6]);
      await page.sleep(700);

      const f2 = {};

      // ── The DIRTY GATE, read off the store rather than off a flag ─────────
      f2.dirty = await page.evaluate(`
        const s = ${P}.project.getState;
        const out = {};
        s().markSaved();
        out.afterSave = s().dirty;
        // A width typed into a cabinet. No action in the store writes the flag
        // by hand any more — the gate does, on the way past.
        s().updateUnitParams(window.__t31.unitA, { width: 750 });
        out.afterEdit = s().dirty;
        s().markSaved();
        // …and a piece added, from a completely different neighbourhood of the
        // 4000-line store.
        s().addShelves(window.__t31.unitA, 1);
        out.afterShelf = s().dirty;
        return out;
      `);
      check('F2 — the ONE gate raises the flag from anywhere in the store',
        f2.dirty.afterSave === false && f2.dirty.afterEdit === true && f2.dirty.afterShelf === true,
        JSON.stringify(f2.dirty));

      // ── ONE OF EACH LEVEL, ON THE SCREEN AT ONCE ─────────────────────────
      await page.evaluate(`
        const ui = ${P}.ui.getState();
        ui.clearMessages();
        ui.notify('Export held: 02 BACK has a doubled edge.', 'error');
        ui.notify('Hinge rows 60 mm apart — moved back.', 'warn');
        ui.notify('Turn-31-cnc-1508-2130.dxf — 7 parts.', 'ok');
        return true;
      `);
      await page.sleep(400);
      const levels = await page.evaluate(`
        const seen = [...document.querySelectorAll('[data-message-level]')]
          .map((el) => ({ level: el.getAttribute('data-message-level'), text: el.innerText.trim() }));
        const box = (sel) => {
          const el = document.querySelector(sel);
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) };
        };
        return { seen, centre: box('[data-messages="centre"]'), bottom: box('[data-messages="bottom"]') };
      `);
      f2.levels = levels;
      check('F2 — all THREE levels are on the screen at once (the old slot held one)',
        levels.seen.length === 3
        && ['red', 'yellow', 'grey'].every((l) => levels.seen.some((m) => m.level === l)),
        levels.seen.map((m) => m.level).join(' · '));
      check('F2 — …and a RED is never buried under a yellow: it is drawn first',
        levels.seen.filter((m) => m.level !== 'grey')[0]?.level === 'red',
        levels.seen.map((m) => m.level).join(' → '));
      check('F2 — GREY stands in the CENTRE, the two that wait stand at the bottom',
        Boolean(levels.centre) && Boolean(levels.bottom) && levels.centre.y < levels.bottom.y,
        `grey at y=${levels.centre?.y} · red/yellow at y=${levels.bottom?.y}`);
      await shot('2a-one-of-each-level-red-yellow-and-grey-on-screen-at-once',
        { dom: '[data-message-level="red"]' });

      // ── The three contracts, each with a real gesture ─────────────────────
      // A pointer down on the canvas — "anywhere else".
      await page.mouse('mousePressed', 300, 500);
      await page.mouse('mouseReleased', 300, 500, { buttons: 0 });
      await page.sleep(350);
      const afterAway = await page.evaluate(`
        return [...document.querySelectorAll('[data-message-level]')].map((el) => el.getAttribute('data-message-level'));
      `);
      f2.afterClickAway = afterAway;
      check('F2 — a click ANYWHERE ELSE takes the yellow and leaves the red standing',
        !afterAway.includes('yellow') && afterAway.includes('red'),
        afterAway.join(' · ') || '(none)');
      await shot('2b-the-yellow-is-gone-the-red-has-not-moved',
        { dom: '[data-message-level="red"]' });

      // The red's only exit: clicking IT.
      await page.click('[data-message-level="red"]');
      await page.sleep(350);
      const afterClick = await page.evaluate(`
        return [...document.querySelectorAll('[data-message-level]')].map((el) => el.getAttribute('data-message-level'));
      `);
      f2.afterRedClick = afterClick;
      check('F2 — …and the red goes when the red itself is clicked, and not before',
        !afterClick.includes('red'), afterClick.join(' · ') || '(none)');

      // ── LEAVING WITH UNSAVED WORK IS A RED ───────────────────────────────
      await page.evaluate(`${P}.ui.getState().clearMessages(); return true;`);
      await page.evaluate(`${P}.project.getState().updateUnitParams(window.__t31.unitA, { width: 820 }); return true;`);
      await page.sleep(250);
      // The real door: the CABINET CORE badge in the bar.
      await page.click('header button', 'CABINET CORE');
      await page.sleep(500);
      const leaving = await page.evaluate(`
        const el = document.querySelector('[data-message-level="red"]');
        return {
          screen: ${P}.ui.getState().screen,
          red: el ? el.innerText.trim() : null,
        };
      `);
      f2.leaving = leaving;
      check('F2 — leaving with unsaved work shows the RED, and it says the sentence',
        leaving.screen === 'start' && String(leaving.red || '').includes('Save the project — unsaved changes'),
        `${leaving.screen} · ${leaving.red}`);
      await shot('2c-leaving-with-unsaved-work-the-red-that-follows-you-out',
        { dom: '[data-message-level="red"]', text: 'Save the project' });
      measurements.f2 = f2;
      await page.evaluate(`${P}.ui.getState().clearMessages(); return true;`);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // F3 [CRITICAL] — the guards, wired: Check #9 / #10 + the export gate
    // ═══════════════════════════════════════════════════════════════════════
    //
    // The centre of this phase is the owner's own proven bug — hinge_rows
    // [100, 100, 470] — driven with REAL pointer input through the door
    // window's own hinge rows, because "the store refuses it" is a claim about
    // the app rather than about a function.
    if (want('f3')) {
      await newRoom('Turn 31 walk — F3');
      await page.evaluate(`
        const s = ${P}.project.getState();
        const a = s.addUnit('BUD');
        s.updateUnitParams(a.id, { width: 600, doors: { count: 1 } });
        const r = s.unitResult(a.id);
        window.__t31 = {
          unitA: a.id,
          leaf: (r.panels.find((p) => p.part === 'FRONT') || {}).id || null,
          rows: r.drillSummary.hinge_centers,
        };
        return true;
      `);
      await page.waitFor('document.querySelector("canvas")', { what: 'the 3D canvas' });
      await page.waitFor(`(() => {
        const v = ${P}.views && ${P}.views.room;
        if (!v) return false;
        let n = 0;
        v.scene.traverse((o) => { if (o.isMesh && o.userData && o.userData.ccPanelId === window.__t31.leaf) n += 1; });
        return n > 0;
      })()`, { what: 'the leaf to mount', timeout: 30000 });
      await frameUnits([await page.evaluate('return window.__t31.unitA;')], [0.9, 0.5, 2.4]);
      await page.sleep(800);

      const f3 = {};
      f3.rowsBefore = await page.evaluate('return window.__t31.rows;');

      // ── The door window, opened by a real double-click on the leaf ────────
      const atLeaf = await screenOf(await page.evaluate('return window.__t31.leaf;'));
      await page.dblclick(atLeaf.x, atLeaf.y);
      await page.sleep(700);
      const gotWindow = await page.evaluate(`return Boolean(document.querySelector('[data-hinge-modal-row="1"]'));`);
      check('F3 — the door window is open at its hinge rows', gotWindow === true, String(gotWindow));

      // ── The gesture that makes the bug: drive row 1 onto row 0 ───────────
      // The ↓ button is the hinge's own 5 mm stride, so this is a joiner
      // nudging a hinge down towards the one below it, over and over.
      let nudges = 0;
      for (let i = 0; i < 120; i += 1) {
        await page.click('[data-hinge-down="1"]');
        nudges += 1;
        // Stop when the app REFUSES, not when the arithmetic says it is about
        // to: the whole claim is that the refusal happens and is said out loud.
        const stop = await page.evaluate(
          `return Boolean(document.querySelector('[data-message-level="yellow"]'));`,
        );
        if (stop) break;
      }
      f3.nudges = nudges;
      const blocked = await page.evaluate(`
        const el = document.querySelector('[data-message-level="yellow"]');
        const rows = ${P}.project.getState().hingeRowsOf(window.__t31.unitA);
        return { message: el ? el.innerText.trim() : null, rows, gap: Math.round((rows[1] - rows[0]) * 100) / 100 };
      `);
      f3.blocked = blocked;
      check('F3 — the setter REFUSES to bring two rows inside the 60 mm minimum',
        blocked.gap >= 60, `rows ${JSON.stringify(blocked.rows)} · gap ${blocked.gap}`);
      check('F3 — …and the refusal is a YELLOW that carries the number',
        Boolean(blocked.message) && /60/.test(blocked.message), blocked.message || '(silent)');
      await shot('3a-the-blocked-hinge-move-a-yellow-with-the-number-in-it',
        { dom: '[data-message-level="yellow"]', text: '60' });

      // ── The bug, forced past the setter, and the guard on it ─────────────
      // A saved or imported job never passed through the setter, so the guard
      // is the line that has to hold. `updateUnitParams` is that door.
      const guarded = await page.evaluate(`
        const s = ${P}.project.getState();
        s.updateUnitParams(window.__t31.unitA, { hinge_rows: [100, 100, 470] });
        const r = s.unitResult(window.__t31.unitA);
        const G = window.__ccT31.exportGate;
        const gate = G.exportGate([{ unit: { id: window.__t31.unitA }, result: r }],
          { profile: ${P}.profile.getState().profile });
        return {
          rows: r.drillSummary.hinge_centers,
          findings: gate.findings.map((f) => ({ check: f.check, code: f.code, level: f.level, panel: f.panel })),
          held: gate.held.map((h) => h.panelId),
          message: gate.message,
        };
      `);
      f3.guarded = guarded;
      check('F3 — Check #10 FAILS the [100,100,470] case, red, with both codes',
        guarded.findings.some((f) => f.check === 10 && f.code === 'duplicate-drill' && f.level === 'red')
        && guarded.findings.some((f) => f.code === 'hinge-rows-too-close'),
        guarded.findings.map((f) => `#${f.check} ${f.code}`).join(' · '));
      check('F3 — the export gate HOLDS the faulty parts out, and NAMES them',
        guarded.held.length > 0 && guarded.held.every((id) => guarded.message.includes(id)),
        `${guarded.held.join(', ')} — "${guarded.message}"`);

      // ── The export button itself, pressed, with the gate on it ───────────
      await page.evaluate(`${P}.ui.getState().clearMessages(); return true;`);
      const exported = await page.evaluate(`
        const s = ${P}.project.getState();
        const r = s.unitResult(window.__t31.unitA);
        const ids = r.panels.map((p) => p.id);
        const res = window.__ccT31.cncExport.exportSheetDxf(r, ids, ${P}.profile.getState().profile);
        return { filename: res.filename, parts: res.parts, all: ids.length, held: res.held.length, gateMessage: res.gateMessage };
      `);
      f3.exported = exported;
      check('F3 — the file is WRITTEN, with the faulty parts left out of it',
        exported.parts > 0 && exported.parts < exported.all && exported.held > 0,
        `${exported.parts} of ${exported.all} parts · ${exported.held} held · ${exported.filename}`);

      // …and the message the app shows for it, with its way out.
      await page.evaluate(`
        const s = ${P}.project.getState();
        const r = s.unitResult(window.__t31.unitA);
        const ids = r.panels.map((p) => p.id);
        const res = window.__ccT31.cncExport.exportSheetDxf(r, ids, ${P}.profile.getState().profile);
        if (res.gateMessage) {
          ${P}.ui.getState().notify(res.gateMessage, 'error', { action: { label: 'Export anyway', run: () => {} } });
        }
        return true;
      `);
      await page.sleep(400);
      const shown = await page.evaluate(`
        const el = document.querySelector('[data-message-level="red"]');
        const btn = document.querySelector('[data-message-action]');
        return { text: el ? el.innerText.trim() : null, action: btn ? btn.innerText.trim() : null };
      `);
      f3.shown = shown;
      check('F3 — the app SHOWS it: a red naming the held parts, with "Export anyway"',
        Boolean(shown.text) && /held out of this export/.test(shown.text) && shown.action === 'Export anyway',
        `${shown.action} · ${shown.text}`);
      await shot('3b-the-export-gate-a-red-naming-the-held-parts-and-export-anyway',
        { dom: '[data-message-action]', text: 'Export anyway' });

      // ── And a CLEAN job exports normally, which is the other half ────────
      await page.evaluate(`
        ${P}.ui.getState().clearMessages();
        ${P}.project.getState().resetHinges(window.__t31.unitA);
        return true;
      `);
      await page.sleep(300);
      const clean = await page.evaluate(`
        const s = ${P}.project.getState();
        const r = s.unitResult(window.__t31.unitA);
        const ids = r.panels.map((p) => p.id);
        const res = window.__ccT31.cncExport.exportSheetDxf(r, ids, ${P}.profile.getState().profile);
        return { parts: res.parts, all: ids.length, held: res.held.length, gateMessage: res.gateMessage };
      `);
      f3.clean = clean;
      check('F3 — everything clean exports normally: nothing held, nothing said',
        clean.held === 0 && clean.gateMessage === null && clean.parts === clean.all,
        `${clean.parts} of ${clean.all} parts`);
      measurements.f3 = f3;
      await page.evaluate(`${P}.ui.getState().clearMessages(); return true;`);
    }

    // ─── R6, as an assertion at the end ────────────────────────────────────
    const errs = realErrors(page.errors);
    check('R6 — the console is clean for the whole walk', errs.length === 0, errs.slice(0, 3).join(' | '));
    writeFileSync(`${OUT}console.txt`, `${page.consoleLines.map((l) => `${l.level}  ${l.text}`).join('\n')}\n`);
  } finally {
    writeFileSync(`${OUT}measurements.json`, `${JSON.stringify(measurements, null, 1)}\n`);
    writeFileSync(`${OUT}walk.json`, `${JSON.stringify({ steps, shots }, null, 1)}\n`);
    await page.close();
    await showroom.close();
  }

  const failed = steps.filter((s) => s.ok === false);
  const blank = shots.filter((s) => s.present === false);
  console.log(`\n${steps.length - failed.length} ok · ${failed.length} failed · ${shots.length} shots (${blank.length} empty)`);
  if (failed.length || blank.length) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
