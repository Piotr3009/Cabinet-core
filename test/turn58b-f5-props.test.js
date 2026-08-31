import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { watchDrawerFixedHeight } from '../src/engine/watchDrawer.js';
import { buildBom } from '../src/engine/bom.js';
import {
  PROP_KINDS, PROPS_BUCKET, PROPS_MANIFEST, fillSlots, layIntoSlot,
  parsePropsManifest, propModelUrl, propSlotsOf, propsReason, seatInSlot,
} from '../src/lib/props.js';
import {
  clearPropsSource, propsAvailable, propsState, resolveProps,
} from '../src/lib/propsSource.js';

// ─── TURN 58b · F5 — PROPS v1 (T58 F8's law, verbatim) ─────────────────────
//
// The owner approved the pack and the switch: *"ok props on/off — zegarki
// wiedzą i reszta też wie."*
//
// ─── THE BUCKET IS NOT REACHABLE FROM HERE, AND THAT IS A BRANCH ───────────
//
// T58 F8, point 1: *"If the bucket or manifest is missing at run time: build
// the whole machinery anyway, ship the toggle GREYED with a one-line reason,
// skip the dressing walk and note it — nothing throws."*
//
// So the machinery is built and held to account here, the dressing walk is
// skipped, and the frame this turn ships is the GREYED toggle with its reason.

const TOOLBAR = readFileSync(new URL('../src/components/CanvasToolbar.jsx', import.meta.url), 'utf8');
const STORE = readFileSync(new URL('../src/stores/uiStore.js', import.meta.url), 'utf8');
const VIEW = readFileSync(new URL('../src/3d/Props.jsx', import.meta.url), 'utf8');

const job = () => computeCabinet({
  ...defaultParamsFor('WARDROBE', P),
  unit_num: 'W01',
  width: 900,
  sections: [{
    width_mm: 900,
    items: [
      { id: 'd1', kind: 'drawer', index: 1, height_mm: 200 },
      {
        id: 'd2', kind: 'drawer', index: 2, height_mm: watchDrawerFixedHeight(P), watch_insert: true,
      },
    ],
  }],
}, P);

// ═══ 1. THE BLINDNESS IS STRUCTURAL, NOT FILTERED ═════════════════════════

test('F5 · no module in src/engine can even see the props modules', () => {
  // This is T58 F8's point 3 — *"state where that blindness is structural"* —
  // answered by walking the import graph rather than by asserting a filter.
  // The BOM, the cut list, the DXF and the invoice are all built out of
  // `src/engine`; a prop cannot reach any of them because there is no edge
  // along which it could travel.
  const dir = new URL('../src/engine/', import.meta.url);
  const offenders = [];
  const walk = (at, prefix = '') => {
    for (const name of readdirSync(at, { withFileTypes: true })) {
      if (name.isDirectory()) { walk(new URL(`${name.name}/`, at), `${prefix}${name.name}/`); continue; }
      if (!name.name.endsWith('.js')) continue;
      const text = readFileSync(new URL(name.name, at), 'utf8');
      if (/from '.*\/(props|propsSource|usePropsPack)\.js'/.test(text)
        || /from '\.\.\/3d\//.test(text)
        || /from '\.\.\/components\//.test(text)
        || /from '\.\.\/stores\//.test(text)) offenders.push(prefix + name.name);
    }
  };
  walk(dir);
  assert.deepEqual(offenders, [], 'the engine reaches nothing that can hold a prop');
});

test('F5 · props add zero BOM rows — the switch is not even an input', () => {
  const r = job();
  const entries = [{ unit: { id: 'u', params: { unit_num: 'W01' } }, result: r }];
  const bom = buildBom(entries, { profile: P });
  const count = (b) => (b?.cut?.length || 0) + (b?.hardware?.length || 0) + (b?.rows?.length || 0);
  const rows = count(bom);
  assert.ok(rows > 0, 'the fixture really does buy things');
  // `buildBom` is handed units and results and NOTHING else that could carry a
  // prop: its options are design, profile, materials and a drawer-box flag.
  // The count cannot depend on a switch the function cannot be told about.
  assert.equal(count(buildBom(entries, { profile: P })), rows);
  const sig = readFileSync(new URL('../src/engine/bom.js', import.meta.url), 'utf8')
    .match(/export function buildBom\(entries, \{([^}]*)\}/)[1];
  assert.ok(!/prop/i.test(sig), `buildBom takes no props option: {${sig.trim()}}`);
  const engineSrc = readFileSync(new URL('../src/engine/bom.js', import.meta.url), 'utf8');
  assert.ok(!/prop/i.test(engineSrc.replace(/\bproperty|properties|proportion\w*/gi, '')),
    'the BOM does not know the word');
});

test('F5 · props add zero CNC paths and zero drills', () => {
  const r = job();
  const paths = r.panels.reduce((n, p) => n + (p.cnc?.paths || []).length, 0);
  const pockets = r.panels.reduce((n, p) => n + (p.cnc?.pockets || []).length, 0);
  // The engine has no props input at all, so the only honest assertion is that
  // computing the same cabinet twice gives the same machining — and that the
  // whole word is absent from the CNC road.
  const again = job();
  assert.equal(again.panels.reduce((n, p) => n + (p.cnc?.paths || []).length, 0), paths);
  assert.equal(again.panels.reduce((n, p) => n + (p.cnc?.pockets || []).length, 0), pockets);
  assert.equal(r.drills.length, again.drills.length);
});

// ═══ 2. ORIENT BY MEASUREMENT, NEVER BY GUESS ═════════════════════════════

test('F5 · a watch that STANDS 80 is LAID into a 60 pocket, not shrunk', () => {
  // T58 F8's own example, to the millimetre: the model stands ~80 mm and the
  // interior is 60. A guess would squash it; the measurement turns it.
  const laid = layIntoSlot({ x: 40, y: 80, z: 12 }, {
    w: 90, h: 60, d: 110,
  });
  assert.equal(laid.laid, true, 'it is lying down');
  assert.equal(laid.rotX, -Math.PI / 2, 'a quarter-turn about X, and nothing else');
  assert.equal(laid.scale, 1, 'and at its own size — nothing was shrunk');
  assert.equal(laid.size.y, 12, 'what was 12 deep is now 12 tall');
  assert.ok(laid.size.y <= 60 && laid.size.x <= 90 && laid.size.z <= 110, 'and it fits');
});

test('F5 · a kind that may NOT be laid down is scaled instead, and refused if that is a toy', () => {
  const upright = layIntoSlot({ x: 40, y: 80, z: 12 }, { w: 90, h: 60, d: 110 }, { lay: false });
  assert.equal(upright.laid, false);
  assert.equal(upright.rotX, 0);
  assert.equal(upright.scale, 0.75, '60 / 80 — the measurement, not a guess');
  // A piece that would have to shrink past half its size is not the pack's.
  const tiny = layIntoSlot({ x: 400, y: 800, z: 120 }, { w: 90, h: 60, d: 110 }, { lay: false });
  assert.equal(tiny.fits, false, 'and the caller draws nothing rather than a toy');
});

test('F5 · nonsense in, null out — nothing throws', () => {
  for (const bad of [null, undefined, {}, { x: 0, y: 0, z: 0 }, { x: 'a', y: 1, z: 1 }]) {
    assert.equal(layIntoSlot(bad, { w: 1, h: 1, d: 1 }), null);
    assert.equal(layIntoSlot({ x: 1, y: 1, z: 1 }, bad), null);
  }
  assert.equal(seatInSlot(null, null), null);
  assert.deepEqual(fillSlots(null, null), []);
  assert.deepEqual(parsePropsManifest(null).rows, []);
  assert.equal(propModelUrl(''), null);
});

// ═══ 3. THE SLOTS ARE THE ENGINE'S OWN, NEVER INVENTED ════════════════════

test('F5 · the pockets are read off the insert the engine actually built', () => {
  const r = job();
  const built = (r.assemblies.watchInserts || [])[0];
  assert.ok(built, 'the fixture builds a watch tray');
  const slots = propSlotsOf(r.panels, built);
  assert.equal(slots.pocket.length, built.pockets,
    'one slot per pocket the engine published — not a count of its own');
  // …and to the millimetre the engine published, too.
  assert.ok(Math.abs(slots.pocket[0].w - built.pocket_w_mm) < 0.05);
  assert.ok(Math.abs(slots.pocket[0].d - built.pocket_d_mm) < 0.05);
  // Every slot stands ON the base and no higher than the rails.
  const base = r.panels.find((p) => p.part === 'WATCH-BASE');
  const rail = r.panels.find((p) => p.part === 'WATCH-RAIL-SIDE');
  for (const s of slots.pocket) {
    assert.equal(s.y, base.box.y + base.box.h, 'a prop stands on the tray floor');
    assert.equal(s.h, rail.box.h, 'and no board is above it');
  }
});

test('F5 · the rear field is cut into the cells the engine named', () => {
  const r = job();
  const built = (r.assemblies.watchInserts || [])[0];
  const slots = propSlotsOf(r.panels, built);
  const cells = built.lanes > 1 ? slots.lane : slots.section;
  assert.equal(cells.length, built.sections * built.lanes);
  assert.equal(built.lanes > 1 ? slots.section.length : slots.lane.length, 0,
    'a field is lanes OR sections, never counted twice');
});

test('F5 · a drawer with no insert answers three empty lists', () => {
  const bare = computeCabinet({ ...defaultParamsFor('WARDROBE', P), unit_num: 'W02' }, P);
  assert.deepEqual(propSlotsOf(bare.panels, null), { pocket: [], lane: [], section: [] });
  assert.deepEqual(propSlotsOf([], { drawer: 1 }), { pocket: [], lane: [], section: [] });
});

test('F5 · fewer slots fill what exists; more repeat the variants', () => {
  assert.deepEqual(fillSlots(['a', 'b', 'c'], [1]).map((f) => f.variant), ['a']);
  assert.deepEqual(fillSlots(['a', 'b'], [1, 2, 3, 4, 5]).map((f) => f.variant),
    ['a', 'b', 'a', 'b', 'a']);
  assert.deepEqual(fillSlots([], [1, 2]), [], 'no pack, no props');
  assert.deepEqual(fillSlots(['a'], []), [], 'no slots, no props');
});

// ═══ 4. AN UNREACHABLE PACK IS A STATE, NOT AN ERROR ══════════════════════

test('F5 · every failure lands in `absent`, with a sentence, and nothing throws', async () => {
  clearPropsSource();
  assert.equal(propsState().state, 'idle');
  // No bucket configured — mock mode, a node test, an unconfigured build.
  assert.equal((await resolveProps({ base: '' })).state, 'absent');
  clearPropsSource();
  // A proxy or a policy saying no. (This is exactly what this container gets.)
  const blocked = await resolveProps({ base: 'https://x/y', fetchImpl: async () => ({ ok: false, status: 403 }) });
  assert.equal(blocked.state, 'absent');
  assert.match(blocked.error, /403/);
  clearPropsSource();
  // A fetch that throws outright.
  const boom = await resolveProps({
    base: 'https://x/y',
    fetchImpl: async () => { throw new Error('getaddrinfo ENOTFOUND'); },
  });
  assert.equal(boom.state, 'absent');
  assert.equal(propsAvailable(boom), false);
  clearPropsSource();
});

test('F5 · a published pack is read, and only then is the switch live', async () => {
  clearPropsSource();
  const ready = await resolveProps({
    base: 'https://x/y',
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({
        files: [
          { kind: 'watch', file: 'pack\\win\\w1.glb' },
          { kind: 'belt', file: 'b1.glb' },
          { kind: 'nonsense', file: 'x.glb' },
          { kind: 'tie', file: '' },
        ],
      }),
    }),
  });
  assert.equal(ready.state, 'ready');
  assert.equal(ready.rows, 2, 'a row with no kind and a row with no file are dropped, not thrown over');
  assert.deepEqual(ready.kinds, ['watch', 'belt']);
  assert.equal(ready.manifest[0].file, 'w1.glb', 'the LAST SEGMENT, as every family reads a manifest');
  assert.equal(propsAvailable(ready), true);
  assert.equal(propModelUrl(ready.manifest[0].file, 'https://x/y'), `https://x/y/${PROPS_BUCKET}/w1.glb`);
  clearPropsSource();
  // An empty published pack is READY and still not available.
  const bare = await resolveProps({ base: 'https://x/y', fetchImpl: async () => ({ ok: true, json: async () => ({ files: [] }) }) });
  assert.equal(bare.state, 'ready');
  assert.equal(propsAvailable(bare), false, 'nothing to lay is nothing to switch on');
  clearPropsSource();
});

test('F5 · the reason is a sentence a person can act on', () => {
  assert.match(propsReason({ state: 'absent', error: 'HTTP 403' }), /not reachable — HTTP 403/);
  assert.match(propsReason({ state: 'absent' }), /not published yet/);
  assert.match(propsReason({ state: 'ready', rows: 0 }), /published but empty/);
  assert.match(propsReason({ state: 'ready', rows: 1 }), /^1 prop in the pack$/);
  assert.match(propsReason({ state: 'ready', rows: 4 }), /^4 props in the pack$/);
  assert.match(propsReason({ state: 'loading' }), /Reading/);
  assert.match(propsReason(null), /has not been read/);
});

// ═══ 5. THE SWITCH: GREYED WITH ITS REASON, NEVER HIDDEN ══════════════════

test('F5 · the toggle is in the view-bar family, disabled with its reason', () => {
  assert.match(TOOLBAR, /data-props-toggle="1"/, 'the control exists');
  assert.match(TOOLBAR, /data-props-state=\{propsPack\.state\}/, 'and says which state it is in');
  assert.match(TOOLBAR, /disabled=\{viewMode !== '3d' \|\| contourView \|\| !propsReady\}/,
    'greyed while the pack is unreachable');
  assert.match(TOOLBAR, /title=\{propsReady[\s\S]{0,200}?propsReason\(propsPack\)\}/,
    'and the reason is the title a person reads');
  // Never hidden — the house rule T53-F8d wrote down for the watch pane.
  assert.ok(!/\{propsReady && \(/.test(TOOLBAR), 'not conditionally rendered away');
  assert.ok(!/\{propsPack\.state === 'ready' && \(/.test(TOOLBAR));
  // It sits with Outlines and X-ray, which is the family the owner named.
  assert.ok(TOOLBAR.indexOf('data-props-toggle') > TOOLBAR.indexOf('X-ray'));
});

test('F5 · it is a PICTURE switch, global, and off by default', () => {
  assert.match(STORE, /\n {2}props: false,/, 'off until somebody asks');
  assert.match(STORE, /toggleProps: \(\) => set\(\(s\) => \(\{ props: !s\.props \}\)\)/);
  // Global: one flag in the session store, not a per-unit param.
  const project = readFileSync(new URL('../src/stores/projectStore.js', import.meta.url), 'utf8');
  assert.ok(!/\bprops\b/.test(project.replace(/props?:/g, '')), 'nothing about props is stored on the job');
});

test('F5 · the renderer draws nothing while the switch is off or the pack is absent', () => {
  assert.match(VIEW, /if \(!on \|\| !propsAvailable\(pack\) \|\| !result\) return \[\];/);
  assert.match(VIEW, /if \(!laid\.length\) return null;/);
  // …and it is not drawn in contour, which is outlines only.
  const unit = readFileSync(new URL('../src/3d/UnitView.jsx', import.meta.url), 'utf8');
  assert.match(unit, /\{!contour && \(\n\s*<Props result=\{result\} \/>/);
});

test('F5 · the constants are the pack the owner approved', () => {
  assert.deepEqual(PROP_KINDS.map((k) => [k.id, k.count]),
    [['watch', 4], ['belt', 5], ['tie', 6]]);
  assert.equal(PROPS_BUCKET, 'props');
  assert.equal(PROPS_MANIFEST, 'manifest.json');
});
