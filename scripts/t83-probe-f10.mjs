/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T83 F10 · THE PROBE: IS THE PLAN A MIRROR?
//
// The owner, 25.10.2026, 22:41: *"przekroj z gory pokazuje jakby logike z dolu
// czyli lustrzane odbicie, sprawdz dokladnie"*. CLAUDE.md T83 F10: "PROBE (P1,
// verify/t83/f10-probe.md): the base plan of the T81 kitchen ... where does
// each unit's number land on the plan sheet, and is the order left to right
// the same as the fronts sheet's ... The probe names the mirrored axis per
// wall; the fix flips the one sign so the plan reads as a plan".
//
// The stage: the T81 kitchen itself (scripts/t81-kitchen.mjs, wall A), then
// the same three base units (BUD 600 one door, BUD 800 a pair, BUDR2 500, at
// 1000, 1600 and 2400 from the wall's start, a plinth, a worktop) on wall A,
// B, C and D of a rectangular room (engine/room.js rectCorners 6000 x 4000),
// one run per wall. The set is built as the window builds it
// (wallDrawingSheets); every position is read off the finished sheet in paper
// mm (Y up, as sheet.js states), never re-derived.
//
// THE TEST OF A MIRROR. A view from ABOVE keeps the room's handedness: a
// viewer standing in the room facing a wall has the wall's start on the left
// (the fronts sheet's order, a true view), so on a true plan, with the room
// side of that wall pointing n on the paper, the fronts' left to right runs
// along -n turned a quarter clockwise, (-n.y, n.x): cross(n, a) = +1 for the unit vector a
// from the first unit's number to the last. -1 is the view from BELOW.
//
// Read only: nothing is saved.
//
//   node scripts/t83-probe-f10.mjs            (prints the table)
//   node scripts/t83-probe-f10.mjs --write    (and writes verify/t83/f10-probe.md)

import { t81Kitchen, setArgs, S } from './t81-kitchen.mjs';
import { wallDrawingSheets } from '../src/engine/drawings/wallSheets.js';
import { orthoView } from '../src/engine/drawings/projector.js';
import { wallGroups, wallLabel } from '../src/engine/drawings/wallElevation.js';
import { sectionStations } from '../src/engine/drawings/setSection.js';
import { getCabinetProfile } from '../src/engine/profile.js';
import { rectCorners } from '../src/engine/room.js';
import {
  lineOf, at, table, emit, mm, sourceCommit,
} from './t83-probe-lib.mjs';

const PRJ = 'src/engine/drawings/projector.js';
const PLAN = 'src/engine/drawings/setPlan.js';
const SHEET = 'src/engine/drawings/setSheet.js';
const SVG = 'src/engine/drawings/svg.js';
const CARD = 'src/engine/drawings/unitCard.js';
const ROOM = 'src/engine/room.js';
const RM = 'src/components/RoomModal.jsx';
const SEC = 'src/engine/drawings/setSection.js';

// ─── THE LINES, AS THEY STAND ───────────────────────────────────────────────
const L = {};
L.plan = lineOf(PRJ, "return { name, ortho: true, dir: [0, -1, 0], screen: (p) => [p[0], p[2]], depth: (p) => -p[1] };");
L.section = lineOf(PRJ, "return { name, ortho: true, dir: [1, 0, 0], screen: (p) => [p[2], p[1]], depth: (p) => p[0] };");
L.front = lineOf(PRJ, "return { name: 'front', ortho: true, dir: [0, 0, -1], screen: (p) => [p[0], p[1]], depth: (p) => -p[2] };");
L.numbers = lineOf(PRJ, "if (view === 'plan' || view === 'top-of-card') at = [ox + W / 2, oz + D / 2];");
L.at = lineOf(PLAN, 'const at = (wall, u, v) => [');
L.through = lineOf(PLAN, 'function throughWall(e, wall) {');
L.measureY = lineOf(PLAN, 'const y0 = Math.min(...ys); const y1 = Math.max(...ys);');
L.tip = lineOf(PLAN, 'const tip = [p[0] - nx * s * 1.4, p[1] - ny * s * 1.4];');
L.chainY = lineOf(PLAN, 'const y = wall.start.y - wall.inward.y * ctx.chainFirst;');
L.chainAbove = lineOf(PLAN, 'chains.push(chainH({ edges: [pts[0], pts[pts.length - 1]], y: wall.start.y - wall.inward.y * ctx.chainSecond, ctx, above: wall.inward.y < 0 }));');
L.place = lineOf(SHEET, 'const place = (x, y) => [ox + x / scale, oy + y / scale];');
L.keyNote = lineOf(SHEET, 'on paper it is drawn as it lies, Y up, with wall A at the bottom.');
L.keyP = lineOf(SHEET, 'const P = (px, py) => [ox + (px - bx0) / s, oy + (py - by0) / s];');
L.svgFlip = lineOf(SVG, 'const flip = (y) => height - y;');
L.cardFlip = lineOf(CARD, 'function fromTheFront(e, back) {');
L.cardTop = lineOf(CARD, "const top = { entities: [...drawn('top-of-card', 'fronts').map((e) => fromTheFront(e, back)), number(W / 2, D / 2)] };");
L.world = lineOf(ROOM, 'World mapping: plan (x, y)');
L.clockwise = lineOf(ROOM, 'The four corners of a rectangular room, clockwise from the front-left.');
L.rmSvg = lineOf(RM, 'const toSvg = (c) => ({ x: pad + (c.x - bounds.minX) * scale, y: pad + (c.y - bounds.minY) * scale });');
L.secLook = lineOf(SEC, 'The plane at the station, looking along the wall towards its end; beyond');

const P = getCabinetProfile();
const rows = [];
const row = (r) => rows.push(r);
const r1 = (v) => Math.round(v * 10) / 10;
const pt = (p) => `(${mm(p[0])}, ${mm(p[1])})`;
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const unit = (v) => { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; };
const cross = (a, b) => a[0] * b[1] - a[1] * b[0];
const dirWord = (v) => {
  const [x, y] = unit(v);
  if (Math.abs(x) >= Math.abs(y)) return x > 0 ? 'right' : 'left';
  return y > 0 ? 'up' : 'down';
};

// ─── 1 · THE VIEWS THEMSELVES (the projector's frames) ──────────────────────
// A view is true when its screen x axis crossed into its screen y axis points
// back at the viewer (-dir): the right hand rule of a camera.
for (const [name, line] of [['front', L.front], ['section', L.section], ['plan', L.plan]]) {
  const V = orthoView(name);
  const e = [[1, 0, 0], [0, 1, 0], [0, 0, 1]].map((v) => V.screen(v));
  const a = e.map((s) => s[0]);
  const b = e.map((s) => s[1]);
  const n = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const back = V.dir.map((d) => -d);
  const ok = n.every((v, i) => Math.abs(v - back[i]) < 1e-9);
  row({
    what: `the projector's ${name} view: screen x crossed into screen y, against the way back to the viewer (-dir)`,
    where: at(PRJ, line),
    measured: `dir [${V.dir.join(', ')}], screen x along [${a.join(', ')}], screen y along [${b.join(', ')}]: x cross y = [${n.map((v) => v + 0).join(', ')}], -dir [${back.map((v) => v + 0).join(', ')}]`,
    said: name === 'plan' ? 'the plan view (projector.js 1804 on 25.10, at = [ox + W / 2, oz + D / 2])' : 'not a 25.10 row',
    verdict: ok ? 'TRUE VIEW' : 'MIRROR: screen (x, z) with Y up on paper is the view from below; the true view looking down is (x, -z) or (-x, z)',
  });
}

// ─── 2 · THE STAGES ─────────────────────────────────────────────────────────
function threeUnitsOn(wall) {
  S().newProject(`T83 F10 probe, wall ${wallLabel(wall)}`);
  // 6000 x 4000: on the T81 room's 3000 walls B and D the store refuses the
  // BUDR2 at 2400 (it is born 600 wide, to the wall's very end); 4000 holds it.
  S().setRoom({ corners: rectCorners(6000, 4000), height: 2500 });
  const add = (type, x) => S().addUnit(type, { wall, x }).id;
  const ids = { a: add('BUD', 1000), b: add('BUD', 1600), c: add('BUDR2', 2400) };
  for (const [id, width] of [[ids.a, 600], [ids.b, 800], [ids.c, 500]]) S().updateUnitParams(id, { width });
  S().setDoors(ids.a, { count: 1, hinge: 'L' });
  S().setDoors(ids.b, { count: 2, hinge: 'L' });
  S().addPlinth(ids.a);
  S().addWorktop([ids.a, ids.b, ids.c]);
  return ids;
}

/** One stage measured: the plan sheet, the fronts sheet, the key plan, the section marker. */
function measure(label, ids, wall) {
  const a = setArgs();
  const sheets = wallDrawingSheets(a);
  const plan = sheets.find((s) => s.variant === 'plan-base');
  const fronts = sheets.find((s) => s.variant === 'fronts' && s.wall === wall);
  const order = [ids.a, ids.b, ids.c];
  const nums = (sh) => new Map(sh.sheet.entities.filter((e) => e.layer === 'UNIT_NUMBER' && e.unit).map((e) => [e.unit, e]));
  const pn = nums(plan);
  const fn = nums(fronts);
  const name = (id) => pn.get(id)?.text ?? fn.get(id)?.text ?? id;
  const walls = new Map(plan.sheet.entities.filter((e) => e.kind === 'text' && /^WALL [A-Z]$/.test(e.text)).map((e) => [e.text.slice(5), [e.x, e.y]]));
  const mine = walls.get(wallLabel(wall));
  const pts = order.map((id) => [pn.get(id).x, pn.get(id).y]);
  const centroid = [pts.reduce((s, p) => s + p[0], 0) / 3, pts.reduce((s, p) => s + p[1], 0) / 3];
  const along = unit(sub(pts[2], pts[0]));
  // The room side: the normal to the run that points from the wall's label to the numbers.
  const off = sub(centroid, mine);
  const n0 = [-along[1], along[0]];
  const n = n0[0] * off[0] + n0[1] * off[1] >= 0 ? n0 : [-n0[0], -n0[1]];
  const hand = cross(n, along);
  const sideOf = (p) => {
    const xs = [...walls.values()].map((q) => q[0]); const ys = [...walls.values()].map((q) => q[1]);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2; const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    const d = [p[0] - cx, p[1] - cy];
    return Math.abs(d[0]) > Math.abs(d[1]) ? (d[0] > 0 ? 'right' : 'left') : (d[1] > 0 ? 'top' : 'bottom');
  };
  const signed = (list) => {
    let s = 0;
    for (let i = 0; i < list.length; i += 1) s += cross(list[i], list[(i + 1) % list.length]);
    return s / 2;
  };
  const wallsArea = signed(['A', 'B', 'C', 'D'].map((k) => walls.get(k)));
  const key = new Map(plan.sheet.entities.filter((e) => e.kind === 'text' && e.layer === 'SHEET_MUTED' && /^[A-D]$/.test(e.text)).map((e) => [e.text, [e.x, e.y]]));
  const keyArea = signed(['A', 'B', 'C', 'D'].map((k) => key.get(k)));
  // The fronts sheet's own left to right, and the plan's, along the paper axis the wall runs on.
  const axis = Math.abs(along[0]) >= Math.abs(along[1]) ? 0 : 1;
  const fOrder = [...order].sort((p, q) => fn.get(p).x - fn.get(q).x).map(name);
  const pOrder = [...order].sort((p, q) => pn.get(p)[axis ? 'y' : 'x'] - pn.get(q)[axis ? 'y' : 'x']).map(name);
  // What a true plan wants with this wall where it stands: the viewer faces
  // -n, and his right hand (y up) is -n turned a quarter clockwise: (-n.y, n.x).
  const want = [-n[1], n[0]];
  // The key plan's arrow on this wall's fronts sheet.
  const tri = fronts.sheet.entities.filter((e) => e.layer === 'FRAME' && e.kind === 'poly' && e.pts?.length === 3 && e.pts[0][0] > 300);
  // The section marker on the plan: the stations of this wall's run, the
  // dashed station line, its two arrowheads and their letters.
  const group = wallGroups(a.entries, P).find((g) => g.wall === wall);
  const stations = sectionStations(group);
  const st = stations[0];
  const heads = plan.sheet.entities.filter((e) => e.layer === 'FRAME' && e.kind === 'poly' && e.pts?.length === 3 && e.pts[0][0] < 330);
  const letters = plan.sheet.entities.filter((e) => e.layer === 'FRAME' && e.kind === 'text' && e.text === st.letter && e.x < 330);
  const cutUnit = st.member.unit;
  const cutNum = pn.get(cutUnit.id);
  const headDirs = heads.map((h) => unit(sub(h.pts[0], [(h.pts[1][0] + h.pts[2][0]) / 2, (h.pts[1][1] + h.pts[2][1]) / 2])));
  const headAlong = headDirs.map((d) => d[0] * along[0] + d[1] * along[1]);
  const baseAlong = heads.map((h) => {
    const m = [(h.pts[1][0] + h.pts[2][0]) / 2, (h.pts[1][1] + h.pts[2][1]) / 2];
    return m[0] * along[0] + m[1] * along[1];
  });
  const numAlong = cutNum.x * along[0] + cutNum.y * along[1];
  return {
    label, wall, plan, fronts, walls, mine, pts, n, along, hand, sideOf, wallsArea, keyArea, key, fOrder, pOrder, want, axis,
    pn, fn, name, order, tri, st, heads, letters, cutUnit, cutNum, headAlong, baseAlong, numAlong,
  };
}

const stages = [];
{
  const ids = t81Kitchen({ inframe: true });
  stages.push(measure('the T81 kitchen (wall A)', ids, 0));
}
for (const wall of [0, 1, 2, 3]) stages.push(measure(`three base units on wall ${wallLabel(wall)}`, threeUnitsOn(wall), wall));

for (const s of stages) {
  const W = wallLabel(s.wall);
  const nums = s.order.map((id) => `${s.name(id)} plan ${pt([s.pn.get(id).x, s.pn.get(id).y])}, fronts x ${mm(s.fn.get(id).x)}`).join('; ');
  const truePlan = s.hand > 0;
  const keepWall = `with wall ${W} kept at the ${s.sideOf(s.mine)}, a true plan runs the fronts' left to right ${dirWord(s.want)}`;
  row({
    what: `${s.label}: the unit numbers on the base plan (${s.plan.no} ${s.plan.name}) and on the fronts sheet (${s.fronts.no} ${s.fronts.name}), paper mm, Y up`,
    where: `${at(PRJ, L.numbers)}; ${at(PLAN, L.at)} (the wall's frame), ${at(SHEET, L.place)} (onto the paper, Y up); ${at(SVG, L.svgFlip)} (Y up to the SVG's Y down, every sheet alike)`,
    measured: `${nums}. WALL ${W} label at ${pt(s.mine)}: the wall at the ${s.sideOf(s.mine)} of the plan, the room side ${dirWord(s.n)}; fronts sheet left to right ${s.fOrder.join(', ')}; on the plan ${s.axis ? 'bottom to top' : 'left to right'} ${s.pOrder.join(', ')}, the fronts' order running ${dirWord(s.along)}`,
    said: s.wall === 0 ? 'a viewer facing wall A sees 01, 02, DR01 left to right; the plan seen from above with wall A at the bottom shows them in the SAME order' : 'the same table per wall',
    verdict: `${truePlan ? 'TRUE' : 'MIRROR'}: cross(room side, fronts' order) = ${mm(s.hand)}; ${keepWall}, the plan runs it ${dirWord(s.along)}`,
  });
}

// ─── 3 · THE ROOM'S ROTATION ON THE PAPER ───────────────────────────────────
{
  const s = stages[0];
  const W = [...s.walls.entries()].map(([k, p]) => `${k} ${s.sideOf(p)} ${pt(p)}`).join(', ');
  const K = [...s.key.entries()].map(([k, p]) => `${k} ${pt(p)}`).join(', ');
  row({
    what: 'the walls\' own order on the plan and on its key plan: A, B, C, D around the room (signed area of the four labels, Y up: negative is clockwise)',
    where: `${at(ROOM, L.clockwise)} (rectCorners, clockwise seen from above, the room editor's top view ${at(RM, L.rmSvg)} drawing y DOWN the screen); ${at(ROOM, L.world)}; ${at(SHEET, L.keyNote, L.keyP)} (the key plan)`,
    measured: `plan labels ${W}: area ${mm(s.wallsArea)} (${s.wallsArea < 0 ? 'clockwise' : 'counter-clockwise'}); key plan letters ${K}: area ${r1(s.keyArea)} (${s.keyArea < 0 ? 'clockwise' : 'counter-clockwise'})`,
    said: 'the real plan: looking DOWN, wall C at the top, wall A at the bottom, wall D on the left, wall B on the right',
    verdict: s.wallsArea > 0
      ? 'MIRROR, on the plan and on the key plan alike: the room\'s corners run clockwise seen from above (rectCorners; the room editor draws A at the top, B on the right), and A bottom, B right, C top, D left is the same ring counter-clockwise, the view from below. The arrangement CLAUDE.md calls the real plan is the one B0 draws: no true plan has A at the bottom AND D on the left'
      : 'TRUE',
  });
}

// ─── 4 · THE SECTION MARKER AGAINST THE SECTION ─────────────────────────────
for (const s of [stages[0], stages[2], stages[3], stages[4]]) {
  const W = wallLabel(s.wall);
  const offset = s.baseAlong.map((b) => mm(b - s.numAlong));
  const pointsToEnd = s.headAlong.every((v) => v > 0.9);
  const pointsToStart = s.headAlong.every((v) => v < -0.9);
  row({
    what: `${s.label}: the section marker ${s.st.letter}-${s.st.letter} on the base plan, against the section it names`,
    where: `${at(PLAN, L.tip)} (the arrowhead); ${at(SEC, L.secLook)} (the section looks toward the wall's end); ${at(PRJ, L.section)}`,
    measured: `station ${s.st.letter} at ${mm(s.st.x)} along wall ${W}, through ${s.st.member.unit.params.unit_num} (its number on the plan at ${pt([s.cutNum.x, s.cutNum.y])}); ${s.heads.length} arrowheads, their bases ${offset.join(' and ')} mm of paper along the wall from that number, their tips pointing ${s.headAlong.map((v) => (v > 0 ? 'toward the wall\'s end' : 'toward the wall\'s start')).join(' and ')}; letters at ${s.letters.map((e) => pt([e.x, e.y])).join(' and ')}`,
    said: 'the section marker A-A stands where the section is cut',
    verdict: `${Math.max(...s.baseAlong.map((b) => Math.abs(b - s.numAlong))) < 1 ? 'PLACE CONFIRMED (the station line through the cut unit\'s centre)' : 'PLACE DIFFERS'}; ${pointsToStart ? 'DIRECTION REVERSED: the arrows point to the wall\'s start, the section looks to its end' : (pointsToEnd ? 'direction agrees' : 'direction mixed')}`,
  });
}

// ─── 5 · WHAT THE APP ALREADY DOES WITH THE SAME VIEW ───────────────────────
row({
  what: 'the unit card\'s top view: the same projector view (top-of-card), and what the card does with it',
  where: `${at(CARD, L.cardTop)}; ${at(CARD, L.cardFlip)}`,
  measured: 'fromTheFront writes y as back - y: the card turns the projector\'s (x, z) into (x, -z), the front at the bottom, x to the right',
  said: 'not a 25.10 row',
  verdict: 'TRUE on the card: one flip of y already mends this view there (one law, one path for the plan sheet)',
});

const s0 = stages[0];
const md = `# T83 F10 · the probe of the plan that is a mirror

The owner, 25.10.2026, 22:41: *"przekroj z gory pokazuje jakby logike z dolu czyli lustrzane odbicie, sprawdz dokladnie"*.

Reproduce: \`node scripts/t83-probe-f10.mjs\` (add \`--write\` to rewrite this file). Measured on the source tree of commit ${sourceCommit()} (B0 of T83, 3da1e995); every line number was found in the file by the script, not remembered. The stages: the T81 kitchen (\`scripts/t81-kitchen.mjs\`, in-frame on), then three base units (BUD 600 one door, BUD 800 a pair, BUDR2 500 at 1000, 1600, 2400 from the wall's start, plinth, worktop) on wall A, B, C and D of a 6000 x 4000 room (the T81 room's 3000 walls refuse the BUDR2 at 2400 at birth), one run per wall. The set is built by \`wallDrawingSheets\` as the window builds it; every position is read off the finished sheet in paper mm, Y up (\`sheet.js\`: the renderer flips Y once for the SVG). THE TEST: a viewer facing a wall reads the fronts left to right with the wall's start on the left (the fronts sheet, a true view: row 1); on a true plan, with the room side of that wall pointing n on the paper, the viewer faces -n and that left to right runs along his right hand, -n turned a quarter clockwise, (-n.y, n.x), so cross(n, a) = +1 for a, the unit vector from the first unit's number to the last; -1 is the view from below.

${table(rows)}

## The one sign, and the choice it leaves

THE MIRROR IS GLOBAL, ONE SIGN, on every wall alike (rows 4 to 8: cross = -1 on A, B, C and D). Its root is the projector's plan frame (${at(PRJ, L.plan)}): screen (x, z) with Y up is the view from BELOW (row 3), while the front and the section views are true (rows 1, 2). The plan sheet carries it whole: \`throughWall\` puts the projector's (x, z) through the wall's frame \`at\` (${at(PLAN, L.at)}) into the room's plan (x, y), whose y is the world's Z (${at(ROOM, L.world)}), and \`layoutSetSheet\` lays that y UP the paper (${at(SHEET, L.place)}). The key plan does the same on its own (${at(SHEET, L.keyP)}, its comment ${at(SHEET, L.keyNote)}: "Y up, with wall A at the bottom"). The unit card already mends the same projector view by flipping y (${at(CARD, L.cardFlip)}, row 14).

Per wall (rows 5 to 8), both readings of the one mirror: walls A and C (along x on the paper) read with x along the wall reversed, or with the depth axis y reversed; walls B and D (along y) read with y along the wall reversed, or with the depth axis x reversed. ONE flip mends all four, and there are exactly two, never both:

1. **flip y** (room y down the paper, as the unit card and the room editor's own top view draw it, ${at(RM, L.rmSvg)}): wall A at the TOP, C at the bottom, D on the left, B on the right; wall A's numbers ${s0.fOrder.join(', ')} left to right as on its fronts sheet, wall C's reversed. This is the reading CLAUDE.md's own test asks for ("the unit numbers' x on the plan increase left to right as on the fronts sheet for wall A; for wall C ... they decrease") and its sentence "shows them in the SAME order".
2. **flip x**: wall A at the bottom, C at the top, but B on the LEFT and D on the right; wall A's numbers DR01, 02, 01 left to right (reversed against the fronts sheet).

CLAUDE.md's "wall C at the top, wall A at the bottom, wall D on the left, wall B on the right" is exactly what B0 draws (row 9), the view from below: no true plan has all four. The probe's reading: flip y (1), which keeps D left, B right and the fronts' order of wall A, and puts wall A at the top; it is said in the PR as a DECISION against the letter of "wall A at the bottom". BEWARE the test CLAUDE.md names: it reads x only and PASSES on B0 (the x order is the same before and after a y flip); the mirror is caught by y or by the turn (A, B, C, D clockwise on the paper, row 9).

The lines that carry the sign for E1 (the plan's frame, B0): ${at(PLAN, L.at)} \`at\` (every entity of the plan but the chains); the chains, which read the walls' y and inward y directly: ${at(PLAN, L.chainY)} and ${at(PLAN, L.chainAbove)} (and the line between); the extent ${at(PLAN, L.measureY)} (\`measurePlan\`, for the centring); the marker's arrowhead ${at(PLAN, L.tip)} (it reads along and inward directly); and the key plan's \`P\` at ${at(SHEET, L.keyP)}. \`place\` (${at(SHEET, L.place)}) is shared by every sheet and must not move. Independently of the mirror, the marker's arrows point to the wall's START while the section looks to its END (rows 10 to 13, ${at(PLAN, L.tip)} against ${at(SEC, L.secLook)}): the tip's sign there is a second, separate finding for E1.
`;

emit('f10-probe.md', md);
