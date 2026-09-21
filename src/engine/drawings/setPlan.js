// ─── T71 · THE TWO PLANS: BASE UNITS, WALL UNITS ────────────────────────────
//
// The owner's set has two horizontal sections and ours had one, with the wall
// run drawn on top of the base run (*"nakładają się"*). So: two sheets, two
// cuts. `Plan · base units` is cut at `set.planCut.base` (400 above FFL) and
// shows every unit the knife passes through at that height, `Plan · wall
// units` is cut at `planCut.wall` (1700) and shows the wall run and the tall
// units, with what lies BELOW the cut, the worktop, drawn lightly under them.
//
// The room is `roomWalls(room)`: every wall, every opening, in the room's own
// frame, so an L-shaped room draws as an L and a door on wall B swings on wall
// B. Every cabinet is placed through its wall's frame, the way
// `buildHorizontalSection` has placed them since T40, and every rectangle of a
// cabinet is `buildTopView`'s, which is the engine's plan of that cabinet.
//
// Pure functions: no React, no store imports.

import { buildTopView } from './views.js';
import { entLine as line, entPoly as poly, entText as text } from './primitives.js';
import { roomWalls, openingsOnWall } from '../room.js';
import { wallGroups, wallLabel } from './wallElevation.js';
import { chainH, chainV } from './setChains.js';
import { sectionStations } from './setSection.js';
import { unitBase, unitTop } from '../runs.js';

const AXIS = 1e-6;

/** A point in one wall's frame (`u` along, `v` into the room) in the room's. */
const at = (wall, u, v) => [
  wall.start.x + wall.along.x * u + wall.inward.x * v,
  wall.start.y + wall.along.y * u + wall.inward.y * v,
];

/** Which cut this sheet is: 'base' or 'wall'. */
export function cutHeight(which, profile) {
  const c = profile.drawings.set.planCut;
  return which === 'wall' ? c.wall : c.base;
}

/** Every entry the knife passes through at this height. */
export function cutEntries(entries, cut, profile) {
  return (entries || []).filter((e) => e?.unit && e?.result
    && unitBase(e.unit, profile) < cut && unitTop(e.unit, profile) > cut);
}

/** The room's extent, for the scale: walls, plus a margin for the chains. */
export function measurePlan({ room, profile }) {
  const walls = roomWalls(room);
  const xs = walls.flatMap((w) => [w.start.x, w.end.x]);
  const ys = walls.flatMap((w) => [w.start.y, w.end.y]);
  // The walls themselves; the labels and the chains live in the bands the
  // sheet reserves around the object, so a 4420 x 3200 room lands on 1:20.
  void profile;
  const x0 = Math.min(...xs); const x1 = Math.max(...xs);
  const y0 = Math.min(...ys); const y1 = Math.max(...ys);
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/** A unit's plan (buildTopView, in its own frame) turned into the room's. */
function throughWall(entities, wall, u0, depth) {
  const out = [];
  const T = (x, y) => at(wall, u0 + x, depth - y);
  for (const e of entities) {
    if (e.kind === 'rect') {
      const q = [T(e.x, e.y), T(e.x + e.w, e.y), T(e.x + e.w, e.y + e.h), T(e.x, e.y + e.h)];
      out.push({ ...poly(e.layer, q), pen: e.pen, hidden: e.hidden, solid: e.solid, meta: e.meta });
    } else if (e.kind === 'line') {
      const [x1, y1] = T(e.x1, e.y1); const [x2, y2] = T(e.x2, e.y2);
      out.push({ ...e, x1, y1, x2, y2 });
    } else if (e.kind === 'circle') {
      const [cx, cy] = T(e.cx, e.cy);
      out.push({ ...e, cx, cy });
    } else if (e.kind === 'text') {
      const [x, y] = T(e.x, e.y);
      out.push({ ...e, x, y });
    } else if (e.kind === 'poly') {
      out.push({ ...e, pts: (e.pts || []).map((p) => T(p[0], p[1])) });
    }
  }
  return out;
}

/** The room: walls as the cut line, openings, and a label outside each wall. */
function roomFabric(room, { ctx, profile }) {
  const out = [];
  const walls = roomWalls(room);
  for (const wall of walls) {
    const ops = openingsOnWall(room, wall.index);
    // The wall line, broken at each opening.
    let u = 0;
    for (const o of ops) {
      const [x1, y1] = at(wall, u, 0); const [x2, y2] = at(wall, o.x_mm, 0);
      if (o.x_mm > u) out.push({ ...line('BUILDING', x1, y1, x2, y2), pen: 'CUT' });
      if (o.kind === 'door') {
        // The leaf standing open into the room, hinged at the far jamb, and
        // its swing.
        const hinge = o.x_mm + o.width;
        const [hx, hy] = at(wall, hinge, 0); const [lx, ly] = at(wall, hinge, o.width);
        out.push({ ...line('BUILDING', hx, hy, lx, ly), pen: 'THIN' });
        const pts = [];
        for (let i = 0; i <= 12; i += 1) {
          const a = (Math.PI / 2) * (i / 12);
          pts.push(at(wall, hinge - Math.sin(a) * o.width, Math.cos(a) * o.width));
        }
        out.push({ ...poly('BUILDING', pts, { open: true }), pen: 'FINE' });
        const [tx, ty] = at(wall, o.x_mm + o.width / 2, o.width * 0.55);
        out.push({ ...text('BUILDING', tx, ty, `DOOR ${Math.round(o.width)}`, ctx.labelHeight * 0.85), paperHeight: (ctx.labelHeight * 0.85) / ctx.scale });
      } else {
        // A window: the wall line stays, thin, with the sill line beside it.
        const [x3, y3] = at(wall, o.x_mm, 0); const [x4, y4] = at(wall, o.x_mm + o.width, 0);
        out.push({ ...line('BUILDING', x3, y3, x4, y4), pen: 'THIN' });
        const [x5, y5] = at(wall, o.x_mm, 60); const [x6, y6] = at(wall, o.x_mm + o.width, 60);
        out.push({ ...line('BUILDING', x5, y5, x6, y6), pen: 'THIN' });
      }
      u = o.x_mm + o.width;
    }
    const [x1, y1] = at(wall, u, 0); const [x2, y2] = at(wall, wall.width, 0);
    if (wall.width > u) out.push({ ...line('BUILDING', x1, y1, x2, y2), pen: 'CUT' });
    // Outside the wall, past the chains that hang there: in the band, below
    // the second chain's figures.
    const [lx, ly] = at(wall, wall.width / 2, -ctx.mm(profile.drawings.set.chainSecond + 6));
    out.push({ ...text('BUILDING', lx, ly, `WALL ${wallLabel(wall.index)}`, ctx.labelHeight), paperHeight: ctx.labelHeight / ctx.scale, tracking: 0.3 });
  }
  return out;
}

/**
 * BUILD ONE PLAN. `which` is 'base' or 'wall'.
 */
export function buildPlan(entries, {
  which = 'base', room, worktops = [], profile, ctx, frontTypeOf = null, shakerFrame = null,
}) {
  const cut = cutHeight(which, profile);
  const walls = roomWalls(room);
  const entities = [];
  const gap = Number(profile.doors?.gap) || 0;
  const clearance = Math.max(0, Number(profile.room?.wallBackClearance) || 0);

  // ── the room ──
  entities.push(...roomFabric(room, { ctx, profile }));

  // ── the worktop: under the wall cut it is seen; above the base cut it is hidden ──
  for (const w of worktops) {
    const wall = walls[Number(w.wall ?? 0)] || walls[0];
    if (!wall) continue;
    const q = [at(wall, w.x, 0), at(wall, w.x + w.w, 0), at(wall, w.x + w.w, w.d), at(wall, w.x, w.d)];
    entities.push(which === 'wall'
      ? { ...poly('CARCASE', q, { fill: '#f6f6f6' }), pen: 'THIN', solid: true }
      : { ...poly('SHELVES', q), pen: 'HIDDEN', hidden: true });
  }

  // ── the section stations, marked on both plans so the sections can be found ──
  // Drawn before the units, so a number's white mask covers the line.
  const groups = wallGroups(entries, profile);
  const gapMm = Number(profile.doors?.gap) || 0;
  for (const g of groups) {
    const wall = walls[g.wall]; if (!wall) continue;
    const deep = Math.max(0, ...g.members.map((m) => Number(m.result.params.depth) || 0)) + clearance + gapMm + 100;
    for (const st of sectionStations(g)) {
      const a = at(wall, st.x, -ctx.mm(3.2)); const b = at(wall, st.x, deep + 300);
      entities.push({ ...line('FRAME', a[0], a[1], b[0], b[1]), pen: 'VISIBLE', hidden: true });
      for (const [p, dir] of [[a, -1], [b, 1]]) {
        const s = ctx.mm(2.2);
        const nx = wall.along.x; const ny = wall.along.y;
        const ix = wall.inward.x * dir; const iy = wall.inward.y * dir;
        const tip = [p[0] - nx * s * 1.4, p[1] - ny * s * 1.4];
        entities.push({ ...poly('FRAME', [tip, [p[0] + nx * s * 0.2 + ix * s * 0.9, p[1] + ny * s * 0.2 + iy * s * 0.9], [p[0] + nx * s * 0.2 - ix * s * 0.9, p[1] + ny * s * 0.2 - iy * s * 0.9]], { fill: '#151515' }), pen: 'FINE' });
        entities.push({ ...text('FRAME', p[0] + nx * s * 1.6, p[1] + ny * s * 1.6, st.letter, ctx.mm(3.2)), paperHeight: 3.2, weight: 'bold', mask: true });
      }
    }
  }

  // ── the units the knife passes through ──
  const cutList = cutEntries(entries, cut, profile);
  for (const e of cutList) {
    const wall = walls[Math.max(0, Math.trunc(Number(e.unit.position?.wall ?? 0)))] || walls[0];
    if (!wall) continue;
    const u0 = (Number(e.unit.position?.x_mm) || 0);
    const depth = Number(e.result.params.depth) || 0;
    const view = buildTopView(e.result, {
      unitNum: e.unit.params?.unit_num, frontType: frontTypeOf ? frontTypeOf(e.unit) : null, profile,
      unitNumberHeight: ctx.unitNumberHeight, shakerFrame,
    });
    // The footprint is CUT on a plan; the number stands on white at paper size.
    const ents = view.entities.map((x) => {
      if (x.kind === 'text' && x.layer === 'UNIT_NUMBER') return { ...x, mask: true, weight: 'bold', paperHeight: ctx.unitNumberHeight / ctx.scale };
      if (x.kind === 'rect' && x.layer === 'CARCASE' && x.pen === 'OUTLINE') return { ...x, pen: 'CUT' };
      return x;
    });
    // Off the wall by the clearance the engine stands every unit at.
    entities.push(...throughWall(ents, wall, u0, depth + clearance));
    // The plinth lies below either cut: dashed, where the engine puts it.
    const plinth = (e.result.panels || []).find((p) => p.role === 'plinth' && p.box);
    if (plinth && which === 'base') {
      const v0 = clearance + plinth.box.z; const v1 = v0 + plinth.box.d;
      const q = [at(wall, u0 + plinth.box.x, v0), at(wall, u0 + plinth.box.x + plinth.box.w, v0), at(wall, u0 + plinth.box.x + plinth.box.w, v1), at(wall, u0 + plinth.box.x, v1)];
      entities.push({ ...poly('SHELVES', q), pen: 'HIDDEN', hidden: true });
    }
  }

  // ── chains: along each run, outside its wall; the depth beside wall A's start ──
  const chains = [];
  for (const g of groups) {
    const wall = walls[g.wall]; if (!wall) continue;
    // Every member of this wall the knife passes through: on the wall cut
    // that is the wall run AND the tall units standing among them.
    const members = g.members.filter((m) => cutList.some((e) => e.unit.id === m.unit.id));
    if (!members.length) continue;
    const edges = [...new Set([0, wall.width, ...members.flatMap((m) => [m.x, m.x + m.width])])].sort((p, q) => p - q);
    const axisX = Math.abs(wall.along.y) < AXIS;
    const axisY = Math.abs(wall.along.x) < AXIS;
    if (axisX) {
      const y = wall.start.y - wall.inward.y * ctx.chainFirst;
      const pts = edges.map((u) => at(wall, u, 0)[0]).sort((p, q) => p - q);
      chains.push(chainH({ edges: pts, y, yObj: wall.start.y, ctx, above: wall.inward.y < 0 }));
      chains.push(chainH({ edges: [pts[0], pts[pts.length - 1]], y: wall.start.y - wall.inward.y * ctx.chainSecond, ctx, above: wall.inward.y < 0 }));
    } else if (axisY) {
      const x = wall.start.x - wall.inward.x * ctx.chainFirst;
      const pts = edges.map((u) => at(wall, u, 0)[1]).sort((p, q) => p - q);
      chains.push(chainV({ edges: pts, x, xObj: wall.start.x, ctx, left: wall.inward.x > 0 }));
    }
    // The depth, once, beside the start of the first run: clearance, carcass,
    // front, and the worktop's reach.
    if (axisX && g === groups[0]) {
      const deepest = Math.max(...members.map((m) => Number(m.result.params.depth) || 0));
      const frontT = Math.max(...members.map((m) => Number(m.result.params.front_t) || 0));
      const vs = new Set([0, clearance, clearance + deepest, clearance + deepest + gap + frontT]);
      const wt = worktops.find((w) => Number(w.wall ?? 0) === g.wall);
      if (wt) vs.add(wt.d);
      const ys = [...vs].map((v) => at(wall, 0, v)[1]).sort((p, q) => p - q);
      const x = at(wall, 0, 0)[0] - wall.along.x * ctx.chainFirst * 1.6;
      chains.push(chainV({ edges: ys, x, xObj: at(wall, 0, 0)[0], ctx, left: wall.along.x > 0 }));
    }
  }
  entities.push(...chains.flat());
  return { entities, chains, cut, units: cutList.length };
}
