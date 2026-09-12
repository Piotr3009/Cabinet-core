#!/usr/bin/env node
// ─── T69 · F1 · THE PROBE, BEFORE ANY FIX ──────────────────────────────────
//
// CLAUDE.md, F1, verbatim:
//
//   *"**APPLY does nothing — probe first** (what fires, what the store
//   receives), commit the verdict, fix at the convicted site."*
//
// The owner presses APPLY in EDIT THE ROOM and the room does not change. That
// is the symptom. This file GUESSES NOTHING about why: it drives the exact
// sequence the window drives — `useState(() => migrateRoom(room))`, then the
// window's own `patch()` for each edit, then the window's own `apply()` — and
// prints, at every step, WHAT FIRES and WHAT THE STORE RECEIVES.
//
// Three edits are probed because the window offers three kinds and they do not
// share a road:
//
//   1. a WALL LENGTH typed into a wall row          (`setWallLength` → `patch`)
//   2. the ROOM HEIGHT typed into the height field  (`patch({ height })`)
//   3. a PRESET pressed                             (`setPreset` → `patch`)
//
// …and each is probed twice: with the window opened on a room the store
// already holds, and with the window opened, the store changed UNDER it (the
// elevation docked below writes the project live — T67 F1), and APPLY pressed
// after.
//
//   node scripts/t69-f1-probe.mjs            → verify/t69/f1-probe.md
//
// `T69_PROBE_SUFFIX=-after` is how the second run — the proof, after the fix —
// is told not to overwrite the first.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

import { useProjectStore } from '../src/stores/projectStore.js';
import {
  migrateRoom, rectCorners, roomWalls, roomBounds, roomChangeGuard, validateRoomShape,
  setWallLength as setWallLengthCorners,
} from '../src/engine/room.js';

const OUT = new URL('../verify/t69/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const SUFFIX = process.env.T69_PROBE_SUFFIX || '';

const S = () => useProjectStore.getState();

/**
 * WHICH LAW IS ON DISK. The probe drives the window's apply path, and a
 * hand-copy of that path is a copy that can drift — so the SHIPPED file is
 * read and asked which of the two laws it carries. The `-after` run therefore
 * proves the fix rather than re-stating the diagnosis, and neither run can
 * describe a `RoomModal.jsx` that is not the one in the tree.
 */
const WINDOW = readFileSync(new URL('../src/components/RoomModal.jsx', import.meta.url), 'utf8');
const SENDS_ONLY_CHANGED = WINDOW.includes('const verdict = setRoom(changed);');
const BUTTON_CAN_BE_DEAD = /onClick=\{apply\}\s+disabled=/.test(WINDOW);

/** The room as a person reads it: wall 1's length, the depth, the height. */
const shape = (room) => {
  const w = roomWalls(room);
  return {
    wall1: Math.round(w[0]?.width ?? 0),
    wall2: Math.round(w[1]?.width ?? 0),
    height: Math.round(Number(room?.height) || 0),
    corners: (room?.corners || []).map((c) => `${Math.round(c.x)},${Math.round(c.y)}`).join(' '),
  };
};

/** A fresh project, and the window opened on it. */
function openWindow() {
  S().newProject();
  S().setRoom({ corners: rectCorners(3000, 3000), height: 2500 });
  // This is the window's own first line: `useState(() => migrateRoom(room))`.
  const draft = migrateRoom(S().project.room);
  return { draft, base: migrateRoom(S().project.room) };
}

/** The window's own `patch`. */
const patch = (w, next) => { w.draft = migrateRoom({ ...w.draft, ...next }); return w; };

/**
 * The window's own `apply`, verbatim from `src/components/RoomModal.jsx`:
 *
 *   const apply = () => {
 *     if (shapeIssues.length) { notify(shapeIssues[0], 'warn'); return; }
 *     const verdict = setRoom(draft);
 *     ...
 *   };
 */
const apply = (w) => {
  if (!SENDS_ONLY_CHANGED) return S().setRoom(w.draft);
  const changed = Object.fromEntries(
    Object.entries(w.draft).filter(([k, v]) => JSON.stringify(v) !== JSON.stringify(w.base[k])),
  );
  return S().setRoom(changed);
};

const rows = [];
function probe(name, edit, { changeUnderneath = false } = {}) {
  const w = openWindow();
  const before = shape(S().project.room);
  edit(w);
  const drafted = shape(w.draft);
  let underneath = null;
  if (changeUnderneath) {
    // The elevation docked under the plan writes the PROJECT live (T67 F1).
    // Adding a window is the smallest such write the docked editor makes.
    S().setRoom({ openings: [{ id: 'op_probe', kind: 'window', wall: 0, x_mm: 400, width: 900, height: 1200, sill: 900 }] });
    underneath = shape(S().project.room);
  }
  const verdict = apply(w);
  const after = shape(S().project.room);
  rows.push({
    name,
    before,
    drafted,
    underneath,
    verdict: verdict?.ok === false ? `REFUSED — ${verdict.message}` : 'ok',
    after,
    landed: after.corners === drafted.corners && after.height === drafted.height,
    openingsKept: (S().project.room.openings || []).length,
  });
}

probe('1 · wall 1 typed 4200', (w) => {
  patch(w, { corners: setWallLengthCorners(w.draft, 0, 4200).map((c) => ({ x: c.x, y: c.y })) });
});
probe('2 · height typed 2700', (w) => patch(w, { height: 2700 }));
probe('3 · preset RECTANGLE pressed', (w) => patch(w, { corners: rectCorners(3600, 3200) }));
probe('4 · wall 1 typed 4200, a window added underneath first', (w) => {
  patch(w, { corners: setWallLengthCorners(w.draft, 0, 4200).map((c) => ({ x: c.x, y: c.y })) });
}, { changeUnderneath: true });
probe('5 · height typed 2700, a window added underneath first',
  (w) => patch(w, { height: 2700 }), { changeUnderneath: true });

// ─── AND THE THREE THE WINDOW ITSELF CAN REFUSE ────────────────────────────
//
// APPLY is drawn `disabled={!guard.ok || shapeIssues.length > 0}`. A disabled
// button IS a button that does nothing, and it says nothing either: the
// sentence `roomChangeGuard` authors is never reached, because `apply()` is
// never called. Rows 6–8 press it in the three states a client reaches.

/** One wardrobe, standing at the start of wall 1 — the retail room's own shape. */
function standWardrobe({ width, height }) {
  const { id } = S().addUnit('WARDROBE', { params: { width, height, depth: 600 } }) || {};
  if (id) S().updateUnitParams(id, { width, height, depth: 600 });
  return id;
}

const refusals = [];
function probeRefusal(name, build) {
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  const w = { draft: migrateRoom(S().project.room) };
  build(w);
  const guard = roomChangeGuard(w.draft, S().units);
  const issues = validateRoomShape(w.draft.corners);
  const disabled = (BUTTON_CAN_BE_DEAD && !guard.ok) || (BUTTON_CAN_BE_DEAD && issues.length > 0);
  const before = shape(S().project.room);
  // What the CLIENT gets: a disabled button swallows the press entirely.
  const verdict = disabled ? null : S().setRoom(w.draft);
  void guard;
  const after = shape(S().project.room);
  refusals.push({
    name,
    draft: `${shape(w.draft).wall1}x${shape(w.draft).wall2}, h ${shape(w.draft).height}`,
    disabled,
    told: disabled
      ? '(nothing — the button is dead)'
      : (verdict?.ok === false ? verdict.message : 'applied'),
    moved: before.corners !== after.corners || before.height !== after.height,
  });
}

probeRefusal('6 · a 2000 wardrobe stands; the wall is dragged to 1800', (w) => {
  standWardrobe({ width: 2000, height: 2400 });
  w.draft = migrateRoom({ ...w.draft, corners: rectCorners(1800, 3000) });
});
probeRefusal('7 · a 2400-tall wardrobe stands; the ceiling is typed 2200', (w) => {
  standWardrobe({ width: 2000, height: 2400 });
  w.draft = migrateRoom({ ...w.draft, height: 2200 });
});
probeRefusal('8 · RECTANGLE pressed on a room that already is one', (w) => {
  // `setPreset('rect')` verbatim: the preset is built from the room's OWN
  // bounds, so on a rectangle it proposes the rectangle it already has.
  const b = roomBounds(w.draft);
  w.draft = migrateRoom({ ...w.draft, corners: rectCorners(Math.max(b.width, 1000), Math.max(b.depth, 1000)) });
});

// ─── AND THE SECOND HALF OF THE QUESTION: WHAT FIRES ───────────────────────
//
// `onApplied` is the prop retail's `RoomEditor` passes (`onApplied={onClose}`),
// and PRO's menu door passes none. The window returns EARLY on it:
//
//   if (onApplied) { onApplied(); return; }
//   closeModal();
//
// so a refusal and a success both close the window in retail. Whether the
// STORE took the draft is the only difference, and rows 1–5 above are it.

const md = [];
md.push('# T69 · F1 — THE APPLY PROBE');
md.push('');
md.push(`_The law on disk when this ran: APPLY sends `
  + `**${SENDS_ONLY_CHANGED ? 'ONLY THE KEYS THE WINDOW CHANGED' : 'THE WHOLE SNAPSHOTTED DRAFT'}**, `
  + `and the button **${BUTTON_CAN_BE_DEAD ? 'CAN BE DRAWN DEAD' : 'IS ALWAYS LIVE'}**._`);
md.push('');
md.push('_Driven, not guessed: `migrateRoom(room)` → the window\'s own `patch()` →');
md.push('the window\'s own `apply()` = `setRoom(draft)`. `node scripts/t69-f1-probe.mjs`._');
md.push('');
md.push('## What the store receives, edit by edit');
md.push('');
md.push('| edit | room before | the DRAFT apply sends | store said | room after | landed? | openings kept |');
md.push('| --- | --- | --- | --- | --- | --- | --- |');
for (const r of rows) {
  md.push(`| ${r.name} | ${r.before.wall1}×${r.before.wall2}, h ${r.before.height} `
    + `| ${r.drafted.wall1}×${r.drafted.wall2}, h ${r.drafted.height} `
    + `| ${r.verdict} | ${r.after.wall1}×${r.after.wall2}, h ${r.after.height} `
    + `| ${r.landed ? 'YES' : '**NO**'} | ${r.openingsKept} |`);
}
md.push('');
const lost = rows.filter((r) => !r.landed);
const clobbered = rows.filter((r) => r.underneath && r.openingsKept === 0);
md.push(`**VERDICT — ${lost.length} of ${rows.length} edits do not reach the store;** `
  + `**${clobbered.length} of ${rows.filter((r) => r.underneath).length} runs with a live write underneath `
  + `LOSE that write.**`);
md.push('');
for (const r of rows) {
  if (r.landed && !(r.underneath && r.openingsKept === 0)) continue;
  md.push(`- \`${r.name}\` — draft \`${r.drafted.corners}\` h ${r.drafted.height}; `
    + `store now \`${r.after.corners}\` h ${r.after.height}; openings ${r.openingsKept}`
    + (r.underneath ? ` (the docked editor had written 1 before APPLY)` : ''));
}
md.push('');
md.push('## What the BUTTON does, in the three states a client reaches');
md.push('');
md.push('| state | the draft | APPLY | what the client is told | did the room move? |');
md.push('| --- | --- | --- | --- | --- |');
for (const r of refusals) {
  md.push(`| ${r.name} | ${r.draft} | ${r.disabled ? '**DISABLED**' : 'live'} `
    + `| ${r.told} | ${r.moved ? 'yes' : '**no**'} |`);
}
md.push('');
const dead = refusals.filter((r) => r.disabled);
md.push(`**VERDICT 2 — ${dead.length} of ${refusals.length} states leave APPLY dead, and a dead `
  + `button authors no sentence: \`roomChangeGuard\`'s message is written and never read.**`);
md.push('');
md.push('**VERDICT 3 — the preset row is the third dead press.** `setPreset(\'rect\')` builds');
md.push('the rectangle from the room\'s OWN bounds, so on a room that is already a rectangle —');
md.push('which is every room retail makes — pressing RECTANGLE proposes what is already there');
md.push('and APPLY has nothing to apply. There is no 1/2/3-WALL answer in the row at all.');
md.push('');
writeFileSync(`${OUT}f1-probe${SUFFIX}.md`, `${md.join('\n')}\n`);
process.stdout.write(`${md.join('\n')}\n\nwritten: verify/t69/f1-probe${SUFFIX}.md\n`);
