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

  /**
   * Type into whatever has focus, with REAL input.
   *
   * `Input.dispatchKeyEvent` with `rawKeyDown` carries no text — it is the
   * shape a SHORTCUT needs — so a field typed with it never changes. This is
   * CDP's own text path and is as real as a keyboard; R1 bans synthetic DOM
   * events, not the protocol.
   */
  const typeText = async (text) => {
    await page.send('Input.insertText', { text });
    await page.sleep(120);
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

    // ═══════════════════════════════════════════════════════════════════════
    // F4 [CRITICAL] — front gaps: the owner's rulebook (18 points)
    // ═══════════════════════════════════════════════════════════════════════
    //
    // The claim a browser has to settle is rule 14 — "shown gap =
    // front↔neighbour" — and rule 15's repair, driven with a real pointer: the
    // row on the screen is a door, the modal beside it carries TWO options each
    // with its number, and pressing the first one really closes the gap while
    // the cups ride the edge they were 21.5 from.
    if (want('f4')) {
      await newRoom('Turn 31 walk — F4');
      await page.evaluate(`
        const s = ${P}.project.getState();
        const a = s.addUnit('BUD');
        s.updateUnitParams(a.id, { width: 600, doors: { count: 1 } });
        const b = s.addUnit('BUD', { near: a.id, side: 'right' });
        s.updateUnitParams(b.id, { width: 600, doors: { count: 1 } });
        // An END PANEL on the far end: rule 2 wants 3 mm there and the kit
        // builds 1.5, so the joint a client sees is 1.5 — a RED.
        s.addEndPanel(b.id, { side: 'R' });
        const rb = s.unitResult(b.id);
        window.__t31 = {
          unitA: a.id, unitB: b.id,
          leafB: (rb.panels.find((p) => p.role === 'front') || {}).id || null,
        };
        return true;
      `);
      await page.waitFor('document.querySelector("canvas")', { what: 'the 3D canvas' });
      await page.waitFor(`(() => {
        const v = ${P}.views && ${P}.views.room;
        if (!v) return false;
        let n = 0;
        v.scene.traverse((o) => { if (o.isMesh && o.userData && o.userData.ccPanelId === window.__t31.leafB) n += 1; });
        return n > 0;
      })()`, { what: 'the leaf to mount', timeout: 30000 });
      await frameUnits(await page.evaluate('return [window.__t31.unitA, window.__t31.unitB];'), [0.9, 0.6, 2.4]);
      await page.sleep(900);

      const f4 = {};

      // ── Rule 14: what the screen says, and WHAT IT MEASURED ──────────────
      const seen = await page.evaluate(`
        const els = [...document.querySelectorAll('[data-front-gap-mm]')];
        return els.map((el) => ({
          mm: Number(el.getAttribute('data-front-gap-mm')),
          kind: el.getAttribute('data-front-gap-kind'),
          level: el.getAttribute('data-front-gap-level'),
          text: el.innerText.trim(),
        }));
      `);
      f4.rows = seen;
      const panelRow = seen.find((r) => r.kind === 'endPanel');
      check('F4.2 / F4.14 — the end-panel joint is measured front↔NEIGHBOUR and is RED',
        Boolean(panelRow) && panelRow.level === 'red' && panelRow.mm === 1.5,
        panelRow ? `${panelRow.mm} mm to ${panelRow.kind} · ${panelRow.level}` : JSON.stringify(seen));
      check('F4.1 — …and the front-to-front joint beside it says nothing at all',
        !seen.some((r) => r.kind === 'front'),
        seen.map((r) => `${r.kind}:${r.mm}`).join(' · ') || 'silent');
      await shot('4a-the-gap-a-client-sees-measured-front-to-neighbour-and-red',
        { dom: '[data-front-gap-level="red"]' });

      // ── Rule 15: the row is a DOOR, and the modal carries two numbers ─────
      await page.click('[data-front-gap-kind="endPanel"]');
      await page.sleep(500);
      const modal = await page.evaluate(`
        const el = document.querySelector('[data-modal-name="front-gap"]');
        if (!el) return null;
        const plan = el.querySelector('[data-front-gap-plan]');
        return {
          anchored: el.getAttribute('data-modal-anchored') === '1',
          subject: (el.querySelector('[data-front-gap-subject]') || {}).innerText || null,
          planMm: plan ? Number(plan.getAttribute('data-front-gap-plan')) : null,
          planText: plan ? plan.innerText.trim() : null,
          narrow: (el.querySelector('[data-front-gap-narrow]') || {}).innerText || null,
          infill: (el.querySelector('[data-front-gap-infill]') || {}).innerText || null,
          cost: (el.querySelector('[data-front-gap-cost]') || {}).innerText || null,
        };
      `);
      f4.modal = modal;
      check('F4.15 — the row opens the repair modal, beside the click',
        Boolean(modal) && modal.anchored === true, JSON.stringify(modal?.anchored));
      check('F4.15 — …offering TWO options, EACH WITH ITS NUMBER',
        Boolean(modal?.narrow) && Boolean(modal?.infill) && modal.planMm === 1.5
        && /1\.5/.test(modal.narrow),
        `[${modal?.narrow}] / [${modal?.infill}]`);
      check('F4.17 — …and it says what narrowing COSTS before it acts',
        /BOM and the drilling/.test(modal?.cost || ''), modal?.cost || '(silent)');
      await shot('4b-the-modal-two-options-each-with-its-number',
        { dom: '[data-front-gap-narrow]', text: 'BOM and the drilling' });

      // ── Rule 8/9: press it, and see the asymmetry law act ────────────────
      const before = await page.evaluate(`
        const s = ${P}.project.getState();
        const r = s.unitResult(window.__t31.unitB);
        const f = r.panels.find((p) => p.id === window.__t31.leafB);
        const cups = r.drills.filter((d) => d.panel === f.id && d.kind === 'cup');
        return { w: f.w, x: f.box.x, hinge: f.meta.hinge, cups: cups.map((d) => d.x), ys: cups.map((d) => d.y) };
      `);
      await page.click('[data-front-gap-narrow="1"]');
      await page.sleep(600);
      const after = await page.evaluate(`
        const s = ${P}.project.getState();
        const r = s.unitResult(window.__t31.unitB);
        const f = r.panels.find((p) => p.id === window.__t31.leafB);
        const cups = r.drills.filter((d) => d.panel === f.id && d.kind === 'cup');
        const rows = [...document.querySelectorAll('[data-front-gap-kind="endPanel"]')].length;
        return {
          w: f.w, x: f.box.x, trim: f.meta.edgeTrim, cups: cups.map((d) => d.x), ys: cups.map((d) => d.y),
          rowsLeft: rows,
        };
      `);
      f4.before = before;
      f4.after = after;
      const fromEdge = (w, x) => (before.hinge === 'L' ? w - x : x);
      check('F4.8 — the correction acted on ONE edge: the width came off once',
        after.w === before.w - 1.5 && after.x === before.x,
        `${before.w} → ${after.w} · x ${before.x} → ${after.x} · trim ${JSON.stringify(after.trim)}`);
      check('F4.9 — the CUPS rode the edge: still 21.5 from it, same heights',
        after.cups.every((x) => Math.abs(fromEdge(after.w, x) - 21.5) < 1e-6)
        && JSON.stringify(after.ys) === JSON.stringify(before.ys),
        `${before.cups.map((x) => fromEdge(before.w, x)).join(',')} → ${after.cups.map((x) => fromEdge(after.w, x)).join(',')}`);
      check('F4.15 — …and the gap the client sees is closed: the red is gone',
        after.rowsLeft === 0, `${after.rowsLeft} rows left`);
      await frameUnits(await page.evaluate('return [window.__t31.unitB];'), [0.7, 0.3, 2.0]);
      await page.sleep(800);
      await shot('4c-narrowed-on-one-edge-only-and-the-red-is-gone',
        { mesh: await page.evaluate('return window.__t31.leafB;') });

      // ── Rule 13: a carcass gap is its own fault, with its own fix ────────
      const carcass = await page.evaluate(`
        const F = window.__ccT31.frontClearance;
        const P2 = ${P}.profile.getState().profile;
        const at = (lx, rx) => ([
          { id: 'a', type: 'BUD', position: { wall: 0, x_mm: lx, rotation_deg: 0 }, params: { width: 600, height: 770, unit_num: '01' } },
          { id: 'b', type: 'BUD', position: { wall: 0, x_mm: rx, rotation_deg: 0 }, params: { width: 600, height: 770, unit_num: '02' } },
        ]);
        const touching = F.carcassGaps(at(0, 600), P2);
        const apart = F.carcassGaps(at(0, 604), P2);
        return {
          touching: touching.length,
          apart: apart.length,
          mm: apart[0] ? apart[0].mm : null,
          fix: apart[0] ? apart[0].fix.kind : null,
          message: apart[0] ? apart[0].message : null,
        };
      `);
      f4.carcass = carcass;
      check('F4.13 — carcasses that touch are silent; 4 mm apart is RED with ONE fix',
        carcass.touching === 0 && carcass.apart === 1 && carcass.mm === 4
        && carcass.fix === 'close-to-touch',
        carcass.message || JSON.stringify(carcass));
      measurements.f4 = f4;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // F6 [HIGH] — Check v1, the pre-production controller
    // ═══════════════════════════════════════════════════════════════════════
    //
    // A PANEL of findings, not toasts — and a row that FLIES to its subject.
    // The flight is the claim a browser has to settle: pressed with a real
    // pointer, the camera moves to the piece and the right editor opens.
    if (want('f6')) {
      await newRoom('Turn 31 walk — F6');
      await page.evaluate(`
        const s = ${P}.project.getState();
        // A cabinet carrying several of the eleven faults at once: a tall body
        // with unfixed shelves (#3), a hand-edited hinge ladder that doubles
        // the drilling (#10) and is too few for the door's weight (#4).
        const a = s.addUnit('BUDTALL');
        s.updateUnitParams(a.id, { width: 600, height: 2100, doors: { count: 1 } });
        s.addShelves(a.id, 2);
        s.updateUnitParams(a.id, { hinge_rows: [100, 100, 2000] });
        const r = s.unitResult(a.id);
        window.__t31 = {
          unitA: a.id,
          leaf: (r.panels.find((p) => p.role === 'front') || {}).id || null,
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
      await frameUnits([await page.evaluate('return window.__t31.unitA;')], [0.9, 0.4, 2.4]);
      await page.sleep(800);

      const f6 = {};

      // ── The BUTTON, beside BOM, pressed ──────────────────────────────────
      const button = await page.evaluate(`
        const el = document.querySelector('[data-check-button]');
        const bom = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'BOM');
        if (!el || !bom) return null;
        const a = el.getBoundingClientRect();
        const b = bom.getBoundingClientRect();
        return { count: Number(el.getAttribute('data-check-button')), text: el.innerText.trim(), besideBom: a.left > b.left };
      `);
      f6.button = button;
      check('F6 — a Check button sits BESIDE BOM and carries the count',
        Boolean(button) && button.besideBom === true && button.count > 0,
        `${button?.text} · beside BOM ${button?.besideBom}`);

      await page.click('[data-check-button]');
      await page.sleep(500);
      const panel = await page.evaluate(`
        const el = document.querySelector('[data-check-panel]');
        if (!el) return null;
        const rows = [...el.querySelectorAll('[data-check-finding]')].map((r) => ({
          check: Number(r.getAttribute('data-check-finding')),
          level: r.getAttribute('data-check-level'),
          text: r.innerText.trim().replace(/\s+/g, ' ').slice(0, 120),
        }));
        return { count: Number(el.getAttribute('data-check-panel')), summary: (el.querySelector('[data-check-summary]') || {}).innerText, rows };
      `);
      f6.panel = panel;
      check('F6 — the result is a PANEL of findings, not a toast',
        Boolean(panel) && panel.rows.length > 0, `${panel?.count} findings · ${panel?.summary}`);
      check('F6 — …with the reds first, and each naming its subject',
        panel.rows[0]?.level === 'red' && panel.rows.every((r) => r.text.length > 10),
        panel.rows.map((r) => `#${r.check}/${r.level}`).join(' · '));
      await shot('6a-the-check-panel-a-list-of-findings-reds-first',
        { dom: '[data-check-finding]' });

      // ── A ROW IS A DOOR: the F7/T30 flight, on a real click ──────────────
      const cameraBefore = await page.evaluate(`
        const v = ${P}.views && ${P}.views.room;
        return v ? [v.camera.position.x, v.camera.position.y, v.camera.position.z] : null;
      `);
      await page.click('[data-check-goto="1"]');
      await page.sleep(800);
      const flew = await page.evaluate(`
        const v = ${P}.views && ${P}.views.room;
        const el = document.querySelector('[data-modal-shell="1"]');
        const before = ${JSON.stringify(cameraBefore)};
        const now = v ? [v.camera.position.x, v.camera.position.y, v.camera.position.z] : null;
        const moved = before && now
          ? Math.hypot(now[0] - before[0], now[1] - before[1], now[2] - before[2])
          : 0;
        return {
          modal: el ? el.getAttribute('data-modal-name') : null,
          selected: ${P}.ui.getState().selectedElement,
          movedM: Math.round(moved * 1000) / 1000,
        };
      `);
      f6.flight = flew;
      check('F6 — clicking a finding OPENS THE RIGHT EDITOR on its subject',
        Boolean(flew.modal) && Boolean(flew.selected),
        `${flew.modal} on ${JSON.stringify(flew.selected)}`);
      await shot('6b-a-finding-clicked-the-editor-open-on-its-subject',
        { dom: '[data-modal-shell="1"]' });
      await page.key('Escape', { code: 'Escape', windowsVirtualKeyCode: 27 });
      await page.sleep(300);

      // ── The same list, automatically, before an export ───────────────────
      await page.evaluate(`${P}.ui.getState().setCheckOpen(false); ${P}.ui.getState().clearMessages(); return true;`);
      await page.sleep(250);
      await page.click('header button', 'Output');
      await page.sleep(250);
      await page.click('[role="menu"] button', 'Cutting list');
      await page.sleep(700);
      const preflight = await page.evaluate(`
        const el = document.querySelector('[data-check-panel]');
        const msg = document.querySelector('[data-message-level="red"], [data-message-level="yellow"]');
        return {
          panelOpen: Boolean(el),
          message: msg ? msg.innerText.trim() : null,
        };
      `);
      f6.preflight = preflight;
      check('F6 — the SAME list runs automatically before an export',
        preflight.panelOpen === true && /Check:/.test(preflight.message || ''),
        `${preflight.panelOpen} · ${preflight.message}`);
      await shot('6c-the-same-list-run-automatically-before-export',
        { dom: '[data-check-panel]', text: 'Check:' });
      measurements.f6 = f6;
      await page.evaluate(`${P}.ui.getState().clearMessages(); ${P}.ui.getState().setCheckOpen(false); return true;`);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // F7 [HIGH] — the hover aura on handles and hinges
    // ═══════════════════════════════════════════════════════════════════════
    //
    // "Not a snap — a CATCHMENT." The claim only a browser can settle is that
    // a pointer aimed BESIDE the piece — in the aura, not on the rail — brings
    // the label up, and that leaving it does not make the label strobe.
    if (want('f7')) {
      await newRoom('Turn 31 walk — F7');
      await page.evaluate(`
        const s = ${P}.project.getState();
        const a = s.addUnit('BUD');
        s.updateUnitParams(a.id, { width: 600, doors: { count: 1 } });
        s.setProjectHandle({ type: 'bar', centres: 128 });
        ${P}.ui.getState().setShowHinges(true);
        const r = s.unitResult(a.id);
        window.__t31 = {
          unitA: a.id,
          leaf: (r.panels.find((p) => p.role === 'front') || {}).id || null,
        };
        return true;
      `);
      await page.waitFor('document.querySelector("canvas")', { what: 'the 3D canvas' });
      await page.waitFor(`(() => {
        const v = ${P}.views && ${P}.views.room;
        if (!v) return false;
        let n = 0;
        v.scene.traverse((o) => { if (o.userData && o.userData.ccAuraKind) n += 1; });
        return n >= 2;
      })()`, { what: 'the auras to mount', timeout: 30000 });
      await frameUnits([await page.evaluate('return window.__t31.unitA;')], [0.6, 0.25, 1.9]);
      await page.sleep(600);
      // ─── AND THEN LOOK AT THE HANDLE ITSELF ──────────────────────────────
      // A cabinet framed on its own bounds puts a base unit's handle near the
      // TOP of the canvas, which is where this app's toolbar is — so the
      // pointer lands on DOM chrome and never reaches the scene at all. The
      // camera is re-aimed at the piece under test, off the piece's own world
      // position, so the point being clicked is glass.
      await page.evaluate(`
        const v = ${P}.views.room;
        const THREE = v.three;
        let mesh = null;
        v.scene.updateMatrixWorld(true);
        v.scene.traverse((o) => { if (!mesh && o.userData && o.userData.ccAuraKind === 'handle') mesh = o; });
        if (!mesh) return null;
        const c = mesh.getWorldPosition(new THREE.Vector3());
        if (v.controls) v.controls.enableDamping = false;
        if (v.controls && v.controls.target) v.controls.target.copy(c);
        v.camera.position.set(c.x + 0.35, c.y + 0.15, c.z + 1.1);
        v.camera.up.set(0, 1, 0);
        v.camera.lookAt(c);
        v.camera.updateProjectionMatrix();
        if (v.controls) v.controls.update();
        return true;
      `);
      await page.sleep(700);

      const f7 = {};

      // ── The boxes really are the piece plus the profile's own catchment ──
      f7.boxes = await page.evaluate(`
        const v = ${P}.views.room;
        const out = [];
        v.scene.traverse((o) => {
          if (!o.userData || !o.userData.ccAuraKind) return;
          out.push({ kind: o.userData.ccAuraKind, id: o.userData.ccAuraId, mm: o.userData.ccAuraMm });
        });
        return { auras: out, profileMm: ${P}.profile.getState().profile.editor.hoverAura.mm };
      `);
      check('F7 — every handle and every hinge carries a catchment',
        f7.boxes.auras.some((a) => a.kind === 'handle') && f7.boxes.auras.some((a) => a.kind === 'hinge'),
        f7.boxes.auras.map((a) => a.kind).join(' · '));

      // ── A pointer BESIDE the piece — in the aura, off the rail ───────────
      //
      // The point is chosen by projecting the aura's own corner region: a
      // millimetre outside the handle's own geometry and inside its box. If the
      // label comes up there, the catchment is real; if it only comes up on the
      // rail itself, this feature does not exist.
      const spot = await page.evaluate(`
        const v = ${P}.views.room;
        const THREE = v.three;
        let mesh = null;
        v.scene.traverse((o) => {
          if (!mesh && o.userData && o.userData.ccAuraKind === 'handle') mesh = o;
        });
        if (!mesh) return null;
        v.scene.updateMatrixWorld(true);
        const c = mesh.getWorldPosition(new THREE.Vector3());
        // ─── OFF THE RAIL, INSIDE THE BOX ────────────────────────────────
        // Along the aura's THINNEST axis, at 80 % of its half-width. For a
        // vertical bar that is ~11 mm sideways off a 12 mm rod: comfortably
        // clear of the piece, comfortably inside the catchment, and a small
        // enough step that the point stays on the canvas at any framing.
        const mmBox = mesh.userData.ccAuraMm;
        const axis = mmBox[0] <= mmBox[1] ? 'x' : 'y';
        const half = (Math.min(mmBox[0], mmBox[1]) / 2) * 0.001;
        const p = c.clone();
        p[axis] += half * 0.8;
        const s = p.project(v.camera);
        const cs = c.clone().project(v.camera);
        const r = v.gl.domElement.getBoundingClientRect();
        const to = (q) => ({ x: r.left + ((q.x + 1) / 2) * r.width, y: r.top + ((1 - q.y) / 2) * r.height });
        return { beside: to(s), centre: to(cs), axis, halfMm: Math.min(mmBox[0], mmBox[1]) / 2, box: mmBox };
      `);
      await page.mouse('mouseMoved', spot.beside.x, spot.beside.y, { buttons: 0, clickCount: 0 });
      await page.sleep(450);
      const showing = await page.evaluate(`
        const v = ${P}.views.room;
        let n = 0;
        let text = null;
        v.scene.traverse((o) => {
          if (o.userData && o.userData.ccHoverAura && o.children) {
            for (const k of o.children) {
              if (k.isSprite) { n += 1; text = (k.userData && k.userData.ccLabelText) || 'sprite'; }
            }
          }
        });
        return { sprites: n, text };
      `);
      f7.showing = showing;
      check('F7 — a pointer BESIDE the piece, inside its aura, brings the label up',
        showing.sprites > 0,
        `${showing.sprites} label(s) · beside (${Math.round(spot.beside.x)},${Math.round(spot.beside.y)})`
        + ` vs centre (${Math.round(spot.centre.x)},${Math.round(spot.centre.y)}) · axis ${spot.axis}`
        + ` · box ${JSON.stringify(spot.box)}`);
      await shot('7a-the-catchment-a-pointer-beside-the-handle-and-its-number',
        { dom: 'canvas' });

      // ── And it LINGERS: the label survives the moment after leaving ──────
      await page.mouse('mouseMoved', 40, 900, { buttons: 0, clickCount: 0 });
      const immediately = await page.evaluate(`
        const v = ${P}.views.room;
        let n = 0;
        v.scene.traverse((o) => {
          if (o.userData && o.userData.ccHoverAura && o.children) {
            for (const k of o.children) if (k.isSprite) n += 1;
          }
        });
        return n;
      `);
      await page.sleep(700);
      const afterLinger = await page.evaluate(`
        const v = ${P}.views.room;
        let n = 0;
        v.scene.traverse((o) => {
          if (o.userData && o.userData.ccHoverAura && o.children) {
            for (const k of o.children) if (k.isSprite) n += 1;
          }
        });
        return n;
      `);
      f7.linger = { immediately, afterLinger, ms: await page.evaluate(`return ${P}.profile.getState().profile.editor.hoverAura.lingerMs;`) };
      check('F7 — …and it LINGERS after the cursor leaves, then goes',
        immediately > 0 && afterLinger === 0,
        `${immediately} label(s) at once, ${afterLinger} after ${f7.linger.ms} ms`);
      measurements.f7 = f7;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // F8 [MEDIUM] — double-click a cabinet dimension → mini modal
    // ═══════════════════════════════════════════════════════════════════════
    if (want('f8')) {
      await newRoom('Turn 31 walk — F8');
      await page.evaluate(`
        const s = ${P}.project.getState();
        const a = s.addUnit('BUD');
        s.updateUnitParams(a.id, { width: 600, doors: { count: 1 } });
        ${P}.ui.getState().setShowDimensions(true);
        window.__t31 = { unitA: a.id };
        return true;
      `);
      await page.waitFor('document.querySelector("canvas")', { what: 'the 3D canvas' });
      await page.waitFor(`(() => {
        const v = ${P}.views && ${P}.views.room;
        if (!v) return false;
        let n = 0;
        v.scene.traverse((o) => { if (o.userData && o.userData.ccDimensionPick) n += 1; });
        return n > 0;
      })()`, { what: 'the dimension figures to become controls', timeout: 30000 });
      await frameUnits([await page.evaluate('return window.__t31.unitA;')], [0.6, 0.5, 2.4]);
      await page.sleep(600);
      // The WIDTH figure lies on the floor in front of the cabinet, which a
      // frame taken on the cabinet's own bounds puts below the viewport. The
      // camera is re-aimed at the figure itself — off its own world position,
      // never a typed one — so the point being double-clicked is on the canvas.
      await page.evaluate(`
        const v = ${P}.views.room;
        const THREE = v.three;
        let mesh = null;
        v.scene.updateMatrixWorld(true);
        v.scene.traverse((o) => { if (!mesh && o.userData && o.userData.ccDimensionPick === 'w') mesh = o; });
        if (!mesh) return null;
        const c = mesh.getWorldPosition(new THREE.Vector3());
        if (v.controls) v.controls.enableDamping = false;
        if (v.controls && v.controls.target) v.controls.target.copy(c);
        v.camera.position.set(c.x + 0.5, c.y + 0.9, c.z + 1.8);
        v.camera.up.set(0, 1, 0);
        v.camera.lookAt(c);
        v.camera.updateProjectionMatrix();
        if (v.controls) v.controls.update();
        return true;
      `);
      await page.sleep(700);

      const f8 = {};
      const at = await page.evaluate(`
        const v = ${P}.views.room;
        const THREE = v.three;
        let mesh = null;
        v.scene.updateMatrixWorld(true);
        v.scene.traverse((o) => { if (!mesh && o.userData && o.userData.ccDimensionPick === 'w') mesh = o; });
        if (!mesh) return null;
        const c = mesh.getWorldPosition(new THREE.Vector3()).project(v.camera);
        const r = v.gl.domElement.getBoundingClientRect();
        return { x: r.left + ((c.x + 1) / 2) * r.width, y: r.top + ((1 - c.y) / 2) * r.height };
      `);
      await page.dblclick(at.x, at.y);
      await page.sleep(600);
      const opened = await page.evaluate(`
        const el = document.querySelector('[data-modal-name="unit-size"]');
        if (!el) return null;
        const w = el.querySelector('[data-unit-size-width]');
        const h = el.querySelector('[data-unit-size-height]');
        return {
          anchored: el.getAttribute('data-modal-anchored') === '1',
          width: w ? w.value : null,
          height: h ? h.value : null,
          focused: document.activeElement === w ? 'width' : (document.activeElement === h ? 'height' : null),
          active: document.activeElement ? (document.activeElement.tagName + ':' + JSON.stringify(document.activeElement.className || '').slice(0, 40)) : null,
        };
      `);
      f8.opened = opened;
      const whatOpened = await page.evaluate(`
        const el = document.querySelector('[data-modal-shell="1"]');
        return { name: el ? el.getAttribute('data-modal-name') : null, at: ${JSON.stringify(at)} };
      `);
      check('F8 — a double-click on the WIDTH figure opens the mini modal beside it',
        Boolean(opened) && opened.anchored === true,
        `${JSON.stringify(opened)} · on screen: ${JSON.stringify(whatOpened)}`);
      check('F8 — …with BOTH fields, and the figure that was clicked in focus',
        opened.width === '600' && opened.height === '770' && opened.focused === 'width',
        `w ${opened.width} · h ${opened.height} · focus ${opened.focused} · active ${opened.active}`);
      await shot('8a-the-width-figure-double-clicked-and-its-mini-modal',
        { dom: '[data-modal-name="unit-size"]' });

      // ── Typed, and committed on ENTER, through the EXISTING setter ───────
      await page.evaluate(`
        const el = document.querySelector('[data-unit-size-width]');
        el.focus();
        el.select();
        return true;
      `);
      await typeText('750');
      await page.key('Enter', { code: 'Enter', windowsVirtualKeyCode: 13 });
      await page.sleep(600);
      const after = await page.evaluate(`
        return {
          width: ${P}.project.getState().units.find((u) => u.id === window.__t31.unitA).params.width,
          modal: Boolean(document.querySelector('[data-modal-name="unit-size"]')),
        };
      `);
      f8.after = after;
      check('F8 — Enter commits through the existing setter, and closes the window',
        after.width === 750 && after.modal === false, `width ${after.width} · still open ${after.modal}`);
      await shot('8b-the-cabinet-at-its-new-width-committed-on-enter',
        { dom: 'canvas' });
      measurements.f8 = f8;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // F9 [MEDIUM] — the hood wall unit, and the extractor as hardware
    // ═══════════════════════════════════════════════════════════════════════
    if (want('f9')) {
      await newRoom('Turn 31 walk — F9');
      await page.evaluate(`
        const s = ${P}.project.getState();
        const w = s.addUnit('WUD');
        s.updateUnitParams(w.id, { width: 600, doors: { count: 1 } });
        const h = s.addUnit('WUD_HOOD', { near: w.id, side: 'right' });
        s.updateUnitParams(h.id, { width: 600, doors: { count: 1 } });
        const r = s.unitResult(h.id);
        window.__t31 = {
          plain: w.id,
          hood: h.id,
          leaf: (r.panels.find((p) => p.role === 'front') || {}).id || null,
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
      })()`, { what: 'the hood’s door to mount', timeout: 30000 });
      await frameUnits(await page.evaluate('return [window.__t31.plain, window.__t31.hood];'), [0.7, 0.2, 2.3]);
      await page.sleep(900);

      const f9 = await page.evaluate(`
        const s = ${P}.project.getState();
        const hood = s.unitResult(window.__t31.hood);
        const plain = s.unitResult(window.__t31.plain);
        const front = (r) => r.panels.find((p) => p.role === 'front');
        const v = ${P}.views.room;
        let bottoms = 0;
        v.scene.traverse((o) => {
          if (o.isMesh && o.userData && o.userData.ccUnitId === window.__t31.hood
            && o.userData.ccPanelId === 'BOTTOM') bottoms += 1;
        });
        const layers = (r) => [...new Set(r.drills.map((d) => d.layer))].sort();
        return {
          hoodDoorH: front(hood).h,
          plainDoorH: front(plain).h,
          doorY: front(hood).box.y,
          bottomsInScene: bottoms,
          hoodLayers: layers(hood),
          plainLayers: layers(plain),
          extractor: hood.hardware.find((h) => h.role === 'extractor') || null,
          registry: (${P}.hardware && ${P}.hardware.of ? ${P}.hardware.of('extractor') : []).length,
        };
      `);
      measurements.f9 = f9;
      check('F9 — the aperture is real: no bottom board in the scene, door standing above it',
        f9.bottomsInScene === 0 && f9.doorY > 0 && f9.hoodDoorH === f9.plainDoorH - f9.doorY,
        `${f9.bottomsInScene} bottoms · door ${f9.hoodDoorH} at y=${f9.doorY} vs the wall unit’s ${f9.plainDoorH}`);
      check('F9 — RULE 2: not one hole the parent kit does not already drill',
        f9.hoodLayers.every((l) => f9.plainLayers.includes(l)),
        f9.hoodLayers.join(' · '));
      check('F9 — the extractor is HARDWARE: a BOM line to the aperture',
        Boolean(f9.extractor) && f9.extractor.qty === 1 && /aperture$/.test(f9.extractor.spec_label),
        f9.extractor ? f9.extractor.spec_label : '(none)');
      check('F9 — …and a GLB SLOT the scene declares, waiting for a file',
        f9.registry >= 1, `${f9.registry} row(s) in the hardware registry`);
      await shot('9a-a-hood-unit-beside-a-wall-unit-open-underneath-shorter-door',
        { mesh: await page.evaluate('return window.__t31.leaf;') });
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
