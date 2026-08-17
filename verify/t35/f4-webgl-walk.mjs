// ─── T35 · F4 — the WebGL walk, in a real Chromium ──────────────────────────
//
// CLAUDE.md F4, verbatim: "PROOF: a walk step that flips screens/projects 10x
// and asserts one canvas and zero loseContext errors in the console log."
//
// Run:  npx vite build && npx vite preview --port 4173 &
//       node verify/t35/f4-webgl-walk.mjs
//
// It lives beside its evidence rather than in `scripts/` because this turn's
// agent owns `verify/t35/` and nothing else; it uses `scripts/cdp.mjs`, which
// is the house's own zero-dependency browser driver, and adds nothing.
//
// WHAT IT MEASURES, and none of it is a photograph:
//
//   • `document.querySelectorAll('canvas').length` — the DOM's own count.
//   • `window.__cc.diag.liveContexts()` — the guard's count of contexts it is
//     still responsible for. One flip that leaks shows here first.
//   • every console line and every browser log entry, filtered for
//     `loseContext` — the owner's exact wall of red.
//
// A "flip" is what the owner does all day: leave the project for the start
// screen and open it again. That unmounts `ConfiguratorPage`, and with it the
// room's `<Canvas>`, which is where a context is made and given back.

import { mkdirSync, writeFileSync } from 'node:fs';
import { launch } from '../../scripts/cdp.mjs';

const BASE = process.env.E2E_URL || 'http://127.0.0.1:4173/';
const OUT = new URL('./', import.meta.url).pathname;
const FLIPS = 10;

const steps = [];
const check = (label, ok, detail = '') => {
  steps.push({ label, ok: Boolean(ok), detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
  console.log(`${ok ? '  ok' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
};

const P = 'window.__cc';

const run = async () => {
  const page = await launch({ headless: true });
  const readings = [];
  // ─── THE RAW LOG, AT EVERY LEVEL ──────────────────────────────────────────
  // `scripts/cdp.mjs` keeps `console.*` calls and Log entries at level ERROR,
  // which is the right default for a walk. It is not enough here: Chrome
  // reports `WebGL: INVALID_OPERATION: loseContext: context already lost` as a
  // RENDERING entry at warning level, so a walk that only reads errors would
  // report a clean console over the owner's exact complaint. Everything the
  // browser says is taken, and the filter below decides what matters.
  const rawLog = [];
  page.socket.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    if (msg.method !== 'Log.entryAdded') return;
    const { level, source, text, url } = msg.params.entry;
    rawLog.push({ level, source, text: url ? `${text} [${url}]` : text });
  });
  try {
    await page.goto(BASE);
    await page.evaluate('localStorage.clear(); return true;');
    await page.goto(BASE);
    await page.waitFor(`${P} && ${P}.project`, { what: 'the app to boot' });

    const project = (name) => page.evaluate(`
      const s = ${P}.project.getState();
      s.loadProject({
        id: null, name: ${JSON.stringify('T35 F4 walk')} + ' ' + ${JSON.stringify(name)},
        number: '35', client: 'the owner',
        room: { height: 2600, corners: [{x:0,y:0},{x:6000,y:0},{x:6000,y:3000},{x:0,y:3000}] },
        design: { projectType: 'wardrobe' },
      }, []);
      s.addUnit('WARDROBE');
      ${P}.ui.getState().openEditor();
      return true;
    `);

    const reading = async (at) => {
      const r = await page.evaluate(`
        const d = window.__cc.diag || null;
        return {
          canvases: document.querySelectorAll('canvas').length,
          live: d ? d.liveContexts() : null,
          names: d ? d.liveNames() : null,
          created: d ? d.created : null,
          released: d ? d.released : null,
          lost: d ? d.lost : null,
          restored: d ? d.restored : null,
        };
      `);
      readings.push({ at, ...r });
      return r;
    };

    // ─── the first project, and the 500 ms that follow it ─────────────────
    // The wait is not politeness. r3f's `unmountComponentAtNode` schedules its
    // teardown 500 ms out, and under `<React.StrictMode>` — i.e. `npm run dev`,
    // which is how the owner sees the app most of the day — that timer is armed
    // by a cleanup React runs on a mount that is NOT going away. Everything
    // below this line is asserted on the far side of it.
    await project('1');
    await page.sleep(2600);
    const first = await reading('after the first project opened');
    check('one canvas in the DOM when a project is open', first.canvases === 1, first);
    check('one live context, and it is the room', first.live === 1 && first.names.join() === 'room', first);
    check('one context MADE — a simulated unmount is not a second canvas',
      first.created === 1, `created ${first.created}, released ${first.released}`);

    // THE FROZEN VIEWPORT, asked of the canvas itself.
    const alive = await page.evaluate(`
      const c = document.querySelector('canvas');
      const gl = c && (c.getContext('webgl2') || c.getContext('webgl'));
      const room = window.__cc.views && window.__cc.views.room;
      let meshes = null;
      if (room && room.scene) { meshes = 0; room.scene.traverse((o) => { if (o.isMesh) meshes += 1; }); }
      return { contextLost: gl ? gl.isContextLost() : null, meshes };
    `);
    check('the visible canvas still HAS its context 2.6 s in', alive.contextLost === false, alive);
    check('and the scene it draws was not disposed under it', alive.meshes > 0, alive);

    // ─── ten flips ────────────────────────────────────────────────────────
    // Out to the start screen and back in, with a NEW project each time: this
    // is "flips screens/projects 10x" in one gesture, because the owner's own
    // route out of a job is the start screen and his route back in is a file.
    for (let i = 1; i <= FLIPS; i += 1) {
      await page.evaluate(`${P}.ui.getState().goToStart(); return true;`);
      await page.sleep(250);
      await project(`flip ${i}`);
      await page.sleep(650);
      await reading(`flip ${i}`);
    }
    // r3f's late teardown timer is 500 ms; wait past the last one so its
    // console line, if there were still one to come, has landed.
    await page.sleep(1500);

    const last = await reading('after ten flips');
    check(`ONE canvas after ${FLIPS} flips`, last.canvases === 1, last);
    check(`ONE live context after ${FLIPS} flips`, last.live === 1, last);
    check('every context that was made was given back but one',
      last.created - last.released === 1, `created ${last.created}, released ${last.released}`);
    check('no loss nobody asked for', last.lost === 0, `lost ${last.lost}`);

    const strays = readings.filter((r) => r.canvases > 1 || (r.live !== null && r.live > 1));
    check('no reading in the whole walk saw two', strays.length === 0, strays);

    // ─── the console, which is what the owner actually complained about ────
    const noisy = [
      ...page.consoleLines.map((l) => l.text), ...page.errors, ...rawLog.map((l) => l.text),
    ].filter((t) => /loseContext|context already lost|CONTEXT_LOST|Context Lost/i.test(t));
    check('ZERO loseContext errors in the console log', noisy.length === 0, noisy.slice(0, 5).join(' | '));

    // A restore, if one ever happens, says so in exactly one line.
    const restores = page.consoleLines.filter((l) => /WebGL context restored/.test(l.text));
    check('a restore would name itself once', restores.length === last.restored,
      `${restores.length} lines, ${last.restored} restores`);

    await page.screenshot(`${OUT}f4-after-ten-flips.png`);
  } finally {
    const report = {
      when: new Date().toISOString(),
      base: BASE,
      flips: FLIPS,
      readings,
      steps,
      console: page.consoleLines.slice(-40),
      errors: page.errors.slice(-40),
      rendering: rawLog.filter((l) => l.source === 'rendering'),
      loseContextLines: rawLog.filter((l) => /loseContext/i.test(l.text)).length,
    };
    mkdirSync(OUT, { recursive: true });
    writeFileSync(`${OUT}f4-webgl.json`, `${JSON.stringify(report, null, 2)}\n`);
    await page.close();
  }
  const failed = steps.filter((s) => !s.ok);
  console.log(`\n${steps.length - failed.length}/${steps.length} steps ok`);
  if (failed.length) process.exitCode = 1;
};

run().catch((e) => { console.error(e); process.exitCode = 1; });
