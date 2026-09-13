#!/usr/bin/env node
// ─── T70 · F6 — THE BAY HOVER PROBE ────────────────────────────────────────
//
// CLAUDE.md F6, verbatim:
//
//   *"T69 F6 claims this fixed and its walk agreed; the owner says it does not
//   happen. **Probe first**: which element carries the hover handler, what the
//   chip emits, what the scene listens for — commit the table. Then fix what
//   the probe convicts. If the probe shows it working, say so plainly with the
//   exact element and event, so the owner can tell us where he is hovering."*
//
// DIAGNOSE BEFORE YOU CUT. Nothing is changed by this file. It walks the chain
// link by link at RUNTIME — the real stores, the real adapter, the engine's own
// zones — and prints what each link actually holds, in the two states a client
// is really in:
//
//   AS ENTERED   the design room's own boot state. `DesignRoom.jsx` calls
//                `ui.clearSelection()` at boot, and a client who walks WHAT →
//                WHERE → SIZE → INSIDE has clicked no wardrobe.
//   AFTER A CLICK  the same scene with the wardrobe selected on the stage.
//
// The last link is the one `Scene.jsx` computes, quoted from its own line:
//
//     zoneHint={selectedUnitId === unit.id ? zoneHint : null}
//
//   node scripts/t70-f6-probe.mjs            print the table
//   node scripts/t70-f6-probe.mjs --md       …as the markdown committed to verify/

import { readFileSync } from 'node:fs';

import { rectCorners } from '../src/engine/room.js';
import { widthZones } from '../src/engine/zones.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { useUiStore } from '../src/stores/uiStore.js';
import * as A from '../src/retail/design/adapter.js';

const src = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const S = () => useProjectStore.getState();
const U = () => useUiStore.getState();
const md = process.argv.includes('--md');

/** The line in a file that carries a pattern, as the file itself writes it. */
function lineWith(rel, re) {
  const lines = src(rel).split('\n');
  const i = lines.findIndex((l) => re.test(l));
  return i < 0 ? null : { at: `${rel}:${i + 1}`, text: lines[i].trim() };
}

// ─── THE SCENE, BUILT THE WAY A CLIENT BUILDS IT ───────────────────────────

S().newProject();
S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
const { id: unitId } = S().addUnit('WARDROBE', { params: { width: 1800, height: 2200, depth: 600 } });
S().updateUnitParams(unitId, { width: 1800, height: 2200 });
A.setBayCount(unitId, 3);

/** `DesignRoom.jsx`'s own boot line — the state a client arrives in. */
const asEntered = () => { U().clearSelection(); };
/** …and the state after a click on the wardrobe on the stage. */
const afterAClick = () => { U().clearSelection(); U().selectUnit(unitId); };

/**
 * WHAT THE SCENE WOULD DRAW. `Scene.jsx` picks the unit's prop on one line and
 * `UnitView.jsx` gates the mesh on one line; both are quoted, and this runs the
 * same arithmetic against the live stores rather than asserting it.
 */
function whatTheSceneDraws() {
  const hint = U().zoneHint;
  const selected = U().selectedUnitId;
  const passed = selected === unitId ? hint : null;      // Scene.jsx:1739
  const unit = S().units.find((u) => u.id === unitId);
  const bays = widthZones({
    width: unit.params.width,
    boardT: unit.params.board_t ?? P.board.thickness,
    partitions: (unit.params.sections?.[0]?.items || []).filter((i) => i.kind === 'partition'),
  });                                                     // UnitView.jsx:1082
  const drawn = passed != null && bays[passed] ? bays[passed] : null; // UnitView.jsx:2719
  return {
    zoneHint: hint, selectedUnitId: selected, passed, bays: bays.length, drawn,
  };
}

function run(label, arrange, hoverIndex) {
  arrange();
  const before = whatTheSceneDraws();
  A.hoverBay(hoverIndex);
  const after = whatTheSceneDraws();
  return { label, hoverIndex, before, after };
}

/**
 * …and the THIRD row, which is the chip's own wiring rather than the adapter
 * call underneath it. READ FROM THE SOURCE so it cannot drift: whatever
 * `onPointerEnter` does today is what this row runs.
 */
const enterHandler = lineWith('src/retail/design/Options.jsx', /onPointerEnter=\{\(\) => \{? ?A\.(selectUnitOnStage|hoverBay)/);
const hoverSelects = /selectUnitOnStage/.test(enterHandler?.text || '');
function runTheChip(label, arrange, hoverIndex) {
  arrange();
  const before = whatTheSceneDraws();
  // Exactly what the chip's `onPointerEnter` contains, in its own order.
  if (hoverSelects) A.selectUnitOnStage(unitId);
  A.hoverBay(hoverIndex);
  const after = whatTheSceneDraws();
  return { label, hoverIndex, before, after, viaChip: true };
}

const cases = [
  run('AS ENTERED — the room booted, nothing clicked', asEntered, 1),
  run('AFTER A CLICK on the wardrobe on the stage', afterAClick, 1),
  runTheChip('AS ENTERED — pointing at the chip AS IT IS WIRED', asEntered, 1),
];

// ─── THE CHAIN, LINK BY LINK, QUOTED FROM THE FILES THEMSELVES ─────────────

const chain = [
  ['1 · the element', 'src/retail/design/Options.jsx', /data-testid=\{`inside-bay-\$\{z\.index\}`\}/],
  // The handler's SHAPE is what this feature changes, so the pattern asks for
  // the event and not for a particular body — a probe that stops finding its
  // own link the moment the link is fixed is a probe that lies twice.
  ['2 · the event', 'src/retail/design/Options.jsx', /onPointerEnter=\{\(\) =>.*A\.(hoverBay|selectUnitOnStage)/],
  ['3 · what it emits', 'src/retail/design/adapter.js', /U\(\)\.setZoneHint\(index == null \? null : index\)/],
  ['4 · the store', 'src/stores/uiStore.js', /setZoneHint: \(index\) => set\(/],
  ['5 · what the scene reads', 'src/3d/Scene.jsx', /const zoneHint = useUiStore/],
  ['6 · WHICH UNIT it reaches', 'src/3d/Scene.jsx', /zoneHint=\{selectedUnitId === unit\.id \? zoneHint : null\}/],
  ['7 · what is drawn', 'src/3d/UnitView.jsx', /\{zoneHint != null && bays\[zoneHint\] && !contour && \(/],
].map(([what, rel, re]) => ({ what, ...(lineWith(rel, re) || { at: `${rel}:—`, text: 'NOT FOUND' }) }));

const broken = chain.filter((r) => r.text === 'NOT FOUND');
// THE VERDICT IS ABOUT THE CHIP, not about the adapter call under it: the
// question the owner asked is *"I hover and nothing happens"*, and the chip is
// what his pointer is on. Rows 1 and 2 stay in the table as the DIAGNOSIS —
// they are what convicted link 6 — and row 3 is what the app does today.
const viaChip = cases.find((c) => c.viaChip);
const verdict = viaChip.after.drawn == null ? viaChip : null;

// ─── THE REPORT ────────────────────────────────────────────────────────────

const out = [];
const say = (s = '') => out.push(s);

say(md ? '# T70 · F6 — the bay hover probe' : '─── T70 · F6 — THE BAY HOVER PROBE ───');
say();
say('CLAUDE.md F6: *"T69 F6 claims this fixed and its walk agreed; the owner says it');
say('does not happen. **Probe first** … commit the table. Then fix what the probe');
say('convicts."*  Nothing below is changed by this file — it reads.');
say();
say(md ? '## The chain, link by link' : 'THE CHAIN');
say();
if (md) {
  say('| # | link | where | the line itself |');
  say('|---|------|-------|-----------------|');
  for (const r of chain) say(`| ${r.what.split(' · ')[0]} | ${r.what.split(' · ')[1]} | \`${r.at}\` | \`${r.text.replace(/\|/g, '\\|')}\` |`);
} else {
  for (const r of chain) say(`  ${r.what.padEnd(26)} ${r.at.padEnd(34)} ${r.text}`);
}
say();
say(`  every link present: ${broken.length === 0 ? 'YES' : `NO — ${broken.map((b) => b.what).join(', ')}`}`);
say();
say(md ? '## What the scene actually draws' : 'WHAT THE SCENE ACTUALLY DRAWS');
say();
if (md) {
  say('| the client is | hovers | `zoneHint` | `selectedUnitId` | Scene passes | UnitView draws |');
  say('|---------------|--------|-----------|------------------|--------------|----------------|');
}
for (const c of cases) {
  const a = c.after;
  const drew = a.drawn ? `a slab over bay ${a.passed} (${Math.round(a.drawn.size)} mm)` : '**NOTHING**';
  if (md) {
    say(`| ${c.label} | bay ${c.hoverIndex} | \`${a.zoneHint}\` | \`${a.selectedUnitId ?? 'null'}\` | \`${a.passed ?? 'null'}\` | ${drew} |`);
  } else {
    say(`  ${c.label}`);
    say(`      hovers bay ${c.hoverIndex} · zoneHint=${a.zoneHint} · selectedUnitId=${a.selectedUnitId ?? 'null'}`);
    say(`      Scene passes ${a.passed ?? 'null'} · UnitView draws ${drew}`);
    say();
  }
}
say();
say(md ? '## The verdict' : 'THE VERDICT');
say();
if (!verdict) {
  say('  THE HOVER WORKS. The element is the chip');
  say(`  \`data-testid="inside-bay-N"\` in the INSIDE step (\`${chain[0].at}\`) and the`);
  say(`  event is \`onPointerEnter\` (\`${chain[1].at}\`), which now reads:`);
  say();
  say(`      ${enterHandler?.text || '—'}`);
  say();
  say('  ─── WHAT THE FIRST TWO ROWS OF THE TABLE ARE, AND WHY THEY STAY ─────────');
  say();
  say('  They are the DIAGNOSIS this probe was written for, kept verbatim. Row 1 is');
  say('  the adapter call on its own — `A.hoverBay(1)` and nothing else — and it still');
  say('  draws NOTHING, because the chain breaks at LINK 6,');
  say(`  \`${chain[5].at}\`:`);
  say();
  say(`      ${chain[5].text}`);
  say();
  say('  `Scene.jsx` hands the hint to the SELECTED unit only, and `selectedUnitId` was');
  say('  `null` — `DesignRoom.jsx` calls `ui.clearSelection()` at boot and a client who');
  say('  walks WHAT → WHERE → SIZE → INSIDE has clicked no wardrobe, while the left');
  say('  column still shows that wardrobe\'s chips because `adapter.designUnit` FALLS');
  say('  BACK to the first one. The chips were about a cabinet the scene did not think');
  say('  was selected.');
  say();
  say('  WHY T69\'s WALK AGREED: its test presses a chip, and the CLICK has always called');
  say('  `selectUnitOnStage`. Pressing one made every later hover work. The owner hovers');
  say('  without pressing, which is what a pointer is for.');
  say();
  say('  THE FIX, and it is the click\'s own line moved onto the hover: no second');
  say('  highlighter, and not one byte of `Scene.jsx` or `UnitView.jsx` — both are shared');
  say('  with PRO and both were correct.');
} else {
  say(`  **CONVICTED.** The hover does nothing when the client is: *${verdict.label}*.`);
  say();
  say('  Every link of the chain is present and the chip writes the integer — `zoneHint`');
  say(`  is \`${verdict.after.zoneHint}\` after the hover, exactly as T69 built it. The chain breaks at`);
  say(`  LINK 6, \`${chain[5].at}\`:`);
  say();
  say(`      ${chain[5].text}`);
  say();
  say('  `Scene.jsx` hands the hint to the SELECTED unit only, and `selectedUnitId` is');
  say('  `null` — because `DesignRoom.jsx` calls `ui.clearSelection()` at boot and a');
  say('  client who walks WHAT → WHERE → SIZE → INSIDE has clicked no wardrobe. The left');
  say('  column is still showing that wardrobe\'s chips, because `adapter.designUnit`');
  say('  FALLS BACK to the first wardrobe when nothing is selected — so the chips are');
  say('  about a cabinet the scene does not think is selected.');
  say();
  say('  WHY T69\'s WALK AGREED: its own test presses the chip (`onClick`), and the chip\'s');
  say('  click calls `A.selectUnitOnStage(unit.id)` before hovering. Pressing one makes');
  say('  every later HOVER work. The owner hovers without pressing, which is what a');
  say('  pointer is for.');
  say();
  say('  THE FIX THE PROBE CONVICTS: the HOVER must reach the same cabinet the CHIP is');
  say('  about — one line, at the chip, calling the same `selectUnitOnStage` its own');
  say('  click already calls. No second highlighter and no change to Scene or UnitView.');
}
say();

process.stdout.write(`${out.join('\n')}\n`);
process.exit(0);
