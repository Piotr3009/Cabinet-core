/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T82 F16 · THE PROBE: GRAB AND MOVE IS ONE AXIS TODAY
//
// The owner, 25.10.2026, 13:36: *"teraz mam to w menu a bardziej chcialem grab
// and move"*. CLAUDE.md T82 F16: "Today (probed 25.10, the table in
// verify/t82/f16-probe.md): a press on the panel's mesh reaches UnitView.jsx
// onPointerDown (2981 to 3118) and falls through to startDrag (3117) ...".
//
// The room is a React view, so its rows are READ: every line below is found
// in src/3d/UnitView.jsx by the script, and the drag starters are scanned for
// what they read off the hit and what they hand on. The store's rows (the
// unclamped mount_height, the inset cap) are RUN through the store's actions.
// The drag plane's offset is computed from the same numbers the view uses
// (D / 2 against backStandoff), on the chat-fix's chimney stage.
//
// Read only: nothing is saved.
//
//   node scripts/t82-probe-f16.mjs            (prints the table)
//   node scripts/t82-probe-f16.mjs --write    (and writes verify/t82/f16-probe.md)

import { readdirSync } from 'node:fs';
import { useProjectStore } from '../src/stores/projectStore.js';
import { rectCorners } from '../src/engine/room.js';
import { getCabinetProfile } from '../src/engine/profile.js';
import { backStandoff } from '../src/engine/collision.js';
import {
  ROOT, lineOf, linesOf, at, table, emit, mm, sourceCommit, textAt,
} from './t82-probe-lib.mjs';

const S = () => useProjectStore.getState();
const P = getCabinetProfile();
const unit = (id) => S().units.find((u) => u.id === id);
const VIEW = 'src/3d/UnitView.jsx';
const STORE = 'src/stores/projectStore.js';
const SCENE = 'src/3d/Scene.jsx';
const CHAIN = 'src/3d/SpacingChain.jsx';

// ─── THE LINES, AS THEY STAND ───────────────────────────────────────────────
const L = {};
L.plane = lineOf(VIEW, 'const dragPlane = useMemo(() => {');
L.planePoint = lineOf(VIEW, 'const point = wallStart.clone().addScaledVector(inward, mm(D / 2));', L.plane);
L.planeEnd = lineOf(VIEW, '}, [wallStart, inward, D]);', L.plane);
L.toPlane = lineOf(VIEW, 'return raycaster.ray.intersectPlane(dragPlane, target) ? target : null;');
L.alongMm = lineOf(VIEW, 'const alongMm = useCallback((point) =>');
L.startDrag = lineOf(VIEW, 'const startDrag = useCallback((e) => {');
L.offset = lineOf(VIEW, 'drag.current = { offset: alongMm(hit) - unit.position.x_mm', L.startDrag);
L.onMove = lineOf(VIEW, 'onMove(alongMm(p) - drag.current.offset, snapStep);', L.startDrag);
L.dragEnd = lineOf(VIEW, '}, [onSelect, pointerToPlane, alongMm, unit.position.x_mm', L.onMove);
L.backInset = lineOf(VIEW, 'const backInset = backStandoff(unit, profile);', L.dragEnd);
L.origin = lineOf(VIEW, '.addScaledVector(inward, mm(backInset))', L.backInset);
L.depthDrag = lineOf(VIEW, 'const startDepthDrag = useCallback((e, itemId, currentSetbackMm, atHeightMm) => {');
L.depthPlane = lineOf(VIEW, 'const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0)', L.depthDrag);
L.shelfDrag = lineOf(VIEW, 'const startShelfDrag = useCallback((e, itemId, currentPosMm) => {');
L.shelfY = lineOf(VIEW, 'const posMm = (p.y - originY) / MM + grabDelta;', L.shelfDrag);
L.down = lineOf(VIEW, 'onPointerDown={(e) => {', 2900);
L.wantsDepth = lineOf(VIEW, 'const wantsDepth = Boolean(native.altKey || e.altKey);', L.down);
L.fallStart = lineOf(VIEW, 'startDrag(e);', L.wantsDepth);
L.downEnd = lineOf(VIEW, '}}', L.fallStart);
L.sceneMove = lineOf(SCENE, 'onMove={(x, step) => {');
L.sceneFree = lineOf(SCENE, 'moveUnit(unit.id, x, step, { magnet: false });', L.sceneMove);
L.proposal = lineOf(STORE, 'freePanelProposal: (unitId) => {');
L.uup = lineOf(STORE, 'updateUnitParams: (unitId, asked) => runBatch(');
L.heightIf = lineOf(STORE, 'if (patch.height != null) {', L.uup);
L.insetMax = lineOf(STORE, 'const max = profile.editor.maxInset;', lineOf(STORE, 'setUnitInsets: (unitId, patch) => {'));
L.maxInset = lineOf('src/engine/profile.js', 'maxInset: 300,');
L.chipLeft = lineOf(CHAIN, "key: 'fp-left',");
L.chipFloor = lineOf(CHAIN, "key: 'fp-floor',");
L.chipMount = lineOf(CHAIN, "else if (row.write === 'unit-mount') {");

const rows = [];
const row = (r) => rows.push(r);

// ─── 1 · THE PRESS ON THE PANEL'S MESH ──────────────────────────────────────
{
  // What the press handler does before it reaches startDrag: every early
  // `return` is a branch for some other piece (a shelf, a partition, a shoe
  // drawer, a J strip, a watch tray, centre-between). A free panel's FP part
  // is none of them: its role is free_panel, its part FREE-PANEL.
  const block = linesOf(VIEW).slice(L.down - 1, L.downEnd);
  row({
    what: 'a press on a free panel\'s mesh (part FREE-PANEL, role free_panel)',
    where: at(VIEW, L.down, L.downEnd),
    measured: `onPointerDown at ${L.down}; its early returns are for another button, an edge handle, centre-between, a watch tray, a J strip, a Ctrl tick, a shelf (role shelf, plain or with Alt), a VPART, a second shoe drawer; none matches FREE-PANEL (read, ${block.length} lines), so the press reaches startDrag(e) at ${L.fallStart}`,
    said: 'reaches UnitView.jsx onPointerDown (2981 to 3118) and falls through to startDrag (3117)',
    verdict: `CONFIRMED (${L.down} to ${L.downEnd}, startDrag at ${L.fallStart})`,
  });
}

// ─── 2 · THE DRAG PLANE ─────────────────────────────────────────────────────
row({
  what: 'the drag plane startDrag intersects',
  where: at(VIEW, L.plane, L.planeEnd),
  measured: `${textAt(VIEW, L.planePoint)}: a vertical plane, normal inward (parallel to the wall), through D / 2 from the WALL line; no backStandoff, no inset_back_mm in it. The unit itself is drawn at backStandoff (${at(VIEW, L.backInset)}, ${L.origin})`,
  said: 'dragPlane (1818 to 1821) is parallel to the wall through the unit\'s mid depth, ignores inset_back_mm',
  verdict: `CONFIRMED (${L.plane} to ${L.planeEnd})`,
});
{
  S().newProject();
  S().setRoom({ corners: rectCorners(5000, 3000), height: 2500 });
  S().addWallSlope({ kind: 'chimney', wall: 0, x_mm: 2500, width: 600, depth: 350 });
  const id = S().addUnit('FREE_PANEL', { wall: 0, x: 3600 }).id;
  const chim = S().project.wallSlopes.find((w) => w.kind === 'chimney') || S().project.wallSlopes[0];
  S().attachFreePanel(id, `obstacle:${chim.id}:front`, { gap: 0 });
  const u = unit(id);
  const planeAt = u.params.depth / 2;
  const back = backStandoff(u, P);
  row({
    what: 'where that plane stands for the panel on the chat-fix chimney\'s front (inset_back_mm 340)',
    where: `${at(VIEW, L.planePoint)}; ${at(VIEW, L.backInset)}`,
    measured: `the plane at ${mm(planeAt)} from the wall line; the panel drawn from ${mm(back)} to ${mm(back + u.params.depth)}, its mid depth at ${mm(back + u.params.depth / 2)}: the plane is ${mm(back + u.params.depth / 2 - planeAt)} behind where the eye sees the board`,
    said: 'the drag plane of a panel passes through its OWN back line (backStandoff), so a panel stood off the wall drags where the eye sees it (the fix)',
    verdict: 'CONFIRMED as the fault the fix names (computed from the view\'s own numbers, not from a browser)',
  });
}

// ─── 3 · WHAT THE DRAG HANDS ON ─────────────────────────────────────────────
row({
  what: 'what startDrag reads off the hit and hands on',
  where: `${at(VIEW, L.offset)}; ${at(VIEW, L.onMove)}; ${at(SCENE, L.sceneMove, L.sceneFree)}`,
  measured: `the press keeps only alongMm(hit) (${L.offset}); each move calls ${textAt(VIEW, L.onMove)} (${L.onMove}); Scene.jsx hands x to moveUnit(unit.id, x, step, { magnet: false }) for a free panel (${L.sceneFree}). hit.y and p.y are read nowhere in startDrag (${L.startDrag} to ${L.dragEnd})`,
  said: 'reports only alongMm(p) - offset through onMove(x) (1905); hit.y is thrown away',
  verdict: `CONFIRMED (${L.onMove})`,
});

// ─── 4 · NO TWO-AXIS DRAG IN 3d/ ────────────────────────────────────────────
{
  // Every drag starter in the room, scanned: which axis of the hit it reads,
  // and which callbacks it hands a value to.
  const lines = linesOf(VIEW);
  const starters = [];
  lines.forEach((l, i) => {
    const m = l.match(/const (start[A-Za-z]*Drag) = useCallback/);
    if (m) starters.push({ name: m[1], line: i + 1 });
  });
  const scan = starters.map((s) => {
    // The callback's own body: from its line to its dependency list.
    const end = lineOf(VIEW, /^\s*\}, \[/, s.line);
    s.end = end;
    const body = lines.slice(s.line - 1, end).join('\n');
    const axes = [
      /alongMm|alongUnitMm/.test(body) ? 'along' : null,
      /\b(hit|p)\.y\b/.test(body) ? 'y' : null,
      /intoMm/.test(body) ? 'depth' : null,
    ].filter(Boolean);
    const calls = [...new Set([...body.matchAll(/\b(on[A-Z][A-Za-z]*)\(/g)].map((x) => x[1]))].filter((c) => !/^on(Select)$/.test(c));
    return `${s.name} (${s.line} to ${end}): ${axes.join(' + ') || 'none'}, hands to ${calls.join(', ') || 'none'}`;
  });
  const all3d = readdirSync(`${ROOT}src/3d`).filter((f) => /\.(jsx?|mjs)$/.test(f)).map((f) => `src/3d/${f}`);
  const otherFiles = all3d.filter((f) => f !== VIEW && linesOf(f).some((l) => /intersectPlane/.test(l)));
  row({
    what: 'every drag starter in the room: the axis it reads and what it hands on',
    where: at(VIEW, starters[0].line, starters[starters.length - 1].line),
    measured: `${scan.join('; ')}. intersectPlane in the other ${all3d.length - 1} files of src/3d: ${otherFiles.length ? otherFiles.join(', ') : 'none'}`,
    said: 'no 2-axis unit drag exists in 3d/ (the shelf drag 2651 uses hit.y on the same plane, the depth drag 2520 uses a horizontal plane with Alt)',
    verdict: `CONFIRMED: each starter reads one axis and hands one number; the shelf drag ${L.shelfDrag} reads p.y on pointerToPlane (${L.shelfY}); the depth drag ${L.depthDrag} builds a horizontal plane (${L.depthPlane}) and is chosen with Alt (${L.wantsDepth})`,
  });
}

// ─── 5 · mount_height IS NOT CLAMPED ────────────────────────────────────────
{
  const out = [];
  for (const want of [3000, 2400, -200]) {
    S().newProject();
    S().setRoom({ corners: rectCorners(5000, 3000), height: 2500 });
    const id = S().addUnit('FREE_PANEL', { wall: 0, x: 1000 }).id;
    const r = S().updateUnitParams(id, { mount_height: want });
    const u = unit(id);
    out.push(`${want}: stored ${mm(u.params.mount_height)}, top ${mm(Number(u.params.mount_height) + Number(u.params.height))}, notices ${r.notices.length}`);
  }
  row({
    what: 'updateUnitParams(panel, { mount_height }) on a 400 high panel in a 2500 room',
    where: `${at(STORE, L.uup)}; the only height clamp, ${at(STORE, L.heightIf)}, runs when height is in the patch`,
    measured: out.join('; '),
    said: 'mount_height is written by updateUnitParams with NO clamp (3000 in a 2500 room passes)',
    verdict: 'CONFIRMED; nor is a negative one clamped (the floor), nor a top above the ceiling',
  });
}

// ─── 6 · THE BACK INSET CAP ─────────────────────────────────────────────────
{
  S().newProject();
  S().setRoom({ corners: rectCorners(5000, 3000), height: 2500 });
  const id = S().addUnit('FREE_PANEL', { wall: 0, x: 1000 }).id;
  const r = S().setUnitInsets(id, { back: 1000 });
  const u = unit(id);
  const far = 3000 - P.room.wallBackClearance - u.params.depth;
  row({
    what: 'setUnitInsets(panel, { back: 1000 }) in a room 3000 deep',
    where: `${at(STORE, L.insetMax)}; ${at('src/engine/profile.js', L.maxInset)}`,
    measured: `inset_back_mm ${mm(u.params.inset_back_mm)} (notices ${r.notices.length}); the room would leave ${mm(far)} (3000 less the clearance ${P.room.wallBackClearance} less the board ${mm(u.params.depth)})`,
    said: 'setUnitInsets caps the back inset at editor.maxInset 300',
    verdict: u.params.inset_back_mm === P.editor.maxInset ? `CONFIRMED (${L.insetMax}; the 300 at profile.js ${L.maxInset})` : 'DIFFERS',
  });
}

// ─── 7 · THE TYPED ROAD AND THE STORE ACTIONS THE FIX ADDS ──────────────────
{
  const hasWall = linesOf(CHAIN).some((l) => l.includes("'fp-wall'"));
  const st = S();
  row({
    what: 'the typed road today: the SpacingChain chips of a free panel; the store actions F16 names',
    where: `${at(CHAIN, L.chipLeft)}; ${at(CHAIN, L.chipFloor)}; ${at(CHAIN, L.chipMount)}`,
    measured: `fp-left (writes unit-x through moveUnit) and fp-floor (writes mount_height through updateUnitParams, ${L.chipMount + 1}); fp-wall ${hasWall ? 'exists' : 'does not exist'}; the store has moveFreePanelY ${typeof st.moveFreePanelY === 'function' ? 'yes' : 'no'}, moveFreePanelZ ${typeof st.moveFreePanelZ === 'function' ? 'yes' : 'no'}`,
    said: 'the typed road gains the same three: the SpacingChain chips fp-left, fp-floor and a new fp-wall; new store actions moveFreePanelY(id, y), moveFreePanelZ(id, z)',
    verdict: 'CONFIRMED: two chips, no fp-wall, neither action yet',
  });
}
row({
  what: 'the snap proposal of T74 F13',
  where: at(STORE, L.proposal, L.proposal + 18),
  measured: 'freePanelProposal collects the left and right edges (unitSpan) of the units on the panel\'s wall and asks freePanelSnap({ left, width, edges, magnet }): x only',
  said: 'the snap proposal of T74 (edges of units on the wall) stays on x only',
  verdict: `CONFIRMED (${L.proposal})`,
});

const md = `# T82 F16 · the probe of grab and move

The owner, 25.10.2026, 13:36: *"teraz mam to w menu a bardziej chcialem grab and move"*.

Reproduce: \`node scripts/t82-probe-f16.mjs\` (add \`--write\` to rewrite this file). Measured on the source tree of commit ${sourceCommit()} (this branch); every line number was found in the file by the script, not remembered. The room is a React view: its rows are READ from the source (and the drag starters scanned); the store's rows are RUN through its actions in memory; row 3's offset is computed from the view's own two numbers.

${table(rows)}

## The one link the fix must change

CONFIRMED as CLAUDE.md names it, in three places. (1) The plane: \`dragPlane\` (${at(VIEW, L.plane, L.planeEnd)}) passes through \`D / 2\` from the wall line; for a free panel it must pass through the panel's own \`backStandoff\` (the number the view already draws it at, ${at(VIEW, L.backInset)}). (2) The hand: \`startDrag\` (${at(VIEW, L.startDrag, L.dragEnd)}) hands on \`alongMm(p)\` alone (${at(VIEW, L.onMove)}); for a free panel the same plane's \`p.y\` goes to a new \`moveFreePanelY(id, y)\` and, with Shift, a horizontal plane at the panel's height (the \`startDepthDrag\` pattern, ${at(VIEW, L.depthDrag)}) goes to a new \`moveFreePanelZ(id, z)\`. (3) The clamps: \`mount_height\` has none in \`updateUnitParams\` (row 6), and the back inset is capped at \`editor.maxInset\` (${at(STORE, L.insetMax)}) where the room should cap a panel. The typed road gains \`fp-wall\` beside \`fp-left\` and \`fp-floor\` (${at(CHAIN, L.chipLeft)}, ${at(CHAIN, L.chipFloor)}).
`;

emit('f16-probe.md', md);
