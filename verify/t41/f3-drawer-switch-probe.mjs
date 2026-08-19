#!/usr/bin/env node
// ─── T41-F3 PROBE: THE DRAWER SWITCH, IN MILLIMETRES ────────────────────────
//
// The brief names the observable fact for this feature by hand: THE FRONT WIDTH
// IN MM. So that is what this prints — for every combination of drawer kind and
// door state — together with the two things a switch has to be a switch:
// exactly one stack at a time, and a height slider that moves the board.
//
//     node verify/t41/f3-drawer-switch-probe.mjs
//
// Exit code is the number of disagreements.

import { DEFAULT_CABINET_PROFILE as P } from '../../src/engine/profile.js';
import { computeCabinet } from '../../src/engine/cabinet.js';
import { useProjectStore, paramsForEngine } from '../../src/stores/projectStore.js';
import { migrateRoom, rectCorners } from '../../src/engine/room.js';
// The SAME lookup the properties panel uses — not a copy of it, so this probe
// discriminates the fault instead of re-implementing the fix.
import { drawerHeightValue, drawerRefOf } from '../../src/engine/drawerRef.js';

let bad = 0;
const say = (t) => process.stdout.write(t + '\n');
const check = (label, got, want) => {
  const ok = String(got) === String(want);
  if (!ok) bad += 1;
  say(`  ${ok ? 'OK  ' : 'FAIL'}  ${String(label).padEnd(52)} ${got}${ok ? '' : `   (expected ${want})`}`);
};

const store = () => useProjectStore.getState();
const fresh = () => store().loadProject({
  id: null, name: 't41-f3', design: {},
  room: migrateRoom({ height: 2500, corners: rectCorners(6000, 3000) }),
}, []);

const resultOf = (id) => computeCabinet(paramsForEngine(store().units.find((x) => x.id === id)), P);
const frontsOf = (r) => (r.panels || []).filter((p) => p.part === 'DRAWER-FRONT')
  .sort((a, b) => a.box.y - b.box.y);

say('T41-F3 — THE DRAWER SWITCH');
say('='.repeat(84));

// ═══ 1. THE FRONT WIDTH IN MM ═══════════════════════════════════════════════
say('\n1. THE FRONT WIDTH IN MM — a 900 wardrobe, four combinations');
say('   (F3a: the 30 mm hinge strip exists only when a door does. The app');
say('    reserves 48 mm a side — the owner\'s 30 mm inset plus one board.)');
const widths = {};
for (const kind of ['internal', 'overlay']) {
  for (const doors of [true, false]) {
    fresh();
    const u = store().addUnit('WARDROBE', { params: { width: 900, height: 2150 } });
    if (doors) store().addDoors(u.id);
    if (kind === 'internal') store().addDrawers(u.id, 3, 'overlay', 200);
    else store().addOverlayDrawers(u.id, 3, 200);
    const r = resultOf(u.id);
    const f = frontsOf(r);
    const key = `${kind}/${doors ? 'doors ON' : 'doors OFF'}`;
    widths[key] = f[0] ? Math.round(f[0].w) : null;
    say(`  ${key.padEnd(24)} front w = ${String(widths[key]).padStart(5)} mm    `
      + `DP = ${(r.panels || []).filter((p) => p.part === 'DP').length}`);
  }
}
say('');
check('internal: doors OFF is wider than doors ON',
  widths['internal/doors OFF'] > widths['internal/doors ON'], true);
check('overlay: NEVER the strip, under any door state',
  widths['overlay/doors ON'] === widths['overlay/doors OFF'], true);

// ═══ 2. IT IS A SWITCH: ONE STACK, NOT TWO ══════════════════════════════════
say('\n2. IT IS A SWITCH — one stack at a time, whichever order they are chosen');
fresh();
const u = store().addUnit('WARDROBE', { params: { width: 900, height: 2150 } });
store().addDrawers(u.id, 3, 'overlay', 200);
check('internal only: fronts', frontsOf(resultOf(u.id)).length, 3);
store().addOverlayDrawers(u.id, 3, 200);
check('then overlay: fronts (NOT six)', frontsOf(resultOf(u.id)).length, 3);
check('…and it is the overlay stack', frontsOf(resultOf(u.id))[0].meta?.overlay === true, true);
store().addDrawers(u.id, 3, 'overlay', 200);
check('then internal again: fronts', frontsOf(resultOf(u.id)).length, 3);
check('…and the overlay stack is gone',
  frontsOf(resultOf(u.id)).some((p) => p.meta?.overlay), false);

// ═══ 3. THE HEIGHT SLIDER MOVES THE BOARD ═══════════════════════════════════
say('\n3. THE PER-DRAWER HEIGHT MOVES THE BOARD — on BOTH kinds');
for (const kind of ['overlay', 'internal']) {
  fresh();
  const v = store().addUnit('WARDROBE', { params: { width: 900, height: 2150 } });
  if (kind === 'overlay') store().addOverlayDrawers(v.id, 3, 200);
  else store().addDrawers(v.id, 3, 'overlay', 200);
  const before = frontsOf(resultOf(v.id)).map((p) => Math.round(p.h));
  // Exactly what the panel does: the piece under the pointer names its item.
  const panel = frontsOf(resultOf(v.id)).find((p) => Number(p.meta?.drawer) === 2);
  const unit = store().units.find((x) => x.id === v.id);
  const ref = drawerRefOf(unit, panel, 2);
  store().setDrawerHeight(v.id, ref, 300);
  const after = frontsOf(resultOf(v.id)).map((p) => Math.round(p.h));
  // …and what the FIELD would display, which is the half that lied.
  const shown = drawerHeightValue(store().units.find((x) => x.id === v.id), panel, 2);
  say(`  ${kind.padEnd(10)} ref = ${typeof ref}  ${before.join(',')}  ->  ${after.join(',')}`
    + `   field shows ${shown}`);
  check(`${kind}: drawer 2 is 300 mm`, after[1], 300);
  check(`${kind}: the others did not move`, `${after[0]},${after[2]}`, `${before[0]},${before[2]}`);
  check(`${kind}: and the field shows what the board is`, shown, after[1]);
}

say('\n' + '='.repeat(84));
say(bad === 0 ? 'One stack, the right width, and a slider that moves the board. T41-F3 holds.'
  : `${bad} disagreement(s). T41-F3 does NOT hold.`);
process.exit(bad === 0 ? 0 : 1);
