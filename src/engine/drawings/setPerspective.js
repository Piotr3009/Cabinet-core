// ─── T71 · THE PERSPECTIVE: THE SAME BOXES, SEEN FROM THE ROOM ──────────────
//
// The owner's set closes with a "perspective view", an elevation with its
// ends drawn back at an angle. This is the real thing: a pinhole camera at
// eye height (`set.perspective`), standing in the room, looking at the run,
// and every box on the picture is a box the engine already published: a
// unit's carcass with its fronts, the plinth, the worktop, the infills. No
// hidden-line pass: the faces are painted farthest first, each filled with
// the paper colour, so a nearer box covers what stands behind it. For boxes
// standing in a row along a wall that is exactly right, and it is the whole
// of the geometry this sheet needs.
//
// It is a picture, so nothing on it is dimensioned: NTS in the title block.
//
// Pure functions: no React, no store imports.

import { entLine as line, entPoly as poly, entText as text } from './primitives.js';
import { handleMarks } from './wallElevation.js';
import { roomWalls } from '../room.js';

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const norm = (v) => { const l = Math.hypot(...v) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** A camera at P looking at T. `project` returns picture x, y (Y up) and distance. */
export function makeCamera(P, T) {
  const fw = norm(sub(T, P));
  const rt = norm(cross(fw, [0, 1, 0]));
  const up = cross(rt, fw);
  return {
    P,
    project: (Q) => {
      const v = sub(Q, P);
      const z = Math.max(1, dot(v, fw));
      return [1000 * dot(v, rt) / z, 1000 * dot(v, up) / z, Math.hypot(...v)];
    },
    sees: (n, c) => dot(n, sub(P, c)) > 0,
  };
}

function boxFaces(b) {
  const { x0, x1, y0, y1, z0, z1 } = b;
  return [
    { kind: 'front', n: [0, 0, 1], pts: [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]] },
    { kind: 'top', n: [0, 1, 0], pts: [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]] },
    { kind: 'bottom', n: [0, -1, 0], pts: [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]] },
    { kind: 'left', n: [-1, 0, 0], pts: [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]] },
    { kind: 'right', n: [1, 0, 0], pts: [[x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0]] },
  ];
}

/**
 * THE BOXES OF ONE WALL, in the wall's frame (x along, y up, z into the room).
 * Read off the members' published panels: the carcass box, the fronts, the
 * plinth; and the design layer's worktops.
 */
export function runBoxes(group, { worktops = [], profile }) {
  const clearance = Math.max(0, Number(profile.room?.wallBackClearance) || 0);
  const boxes = [];
  for (const m of group.members) {
    const r = m.result;
    const W = Number(r.params.width) || 0;
    const H = Number(r.params.height) || 0;
    const D = Number(r.params.depth) || 0;
    const fronts = (r.panels || []).filter((p) => p.box && (p.part === 'FRONT' || p.part === 'DRAWER-FRONT'));
    const frontOut = Math.max(D, ...fronts.map((p) => p.box.z + p.box.d));
    boxes.push({ tag: 'unit', member: m, x0: m.x, x1: m.x + W, y0: m.base, y1: m.base + H, z0: clearance, z1: clearance + frontOut, fronts, W, H });
    const plinth = (r.panels || []).find((p) => p.role === 'plinth' && p.box);
    if (plinth) boxes.push({ tag: 'plinth', x0: m.x + plinth.box.x, x1: m.x + plinth.box.x + plinth.box.w, y0: 0, y1: m.base, z0: clearance, z1: clearance + plinth.box.z + plinth.box.d });
    for (const p of (r.panels || []).filter((q) => q.box && (q.role === 'end_panel' || q.role === 'infill'))) {
      boxes.push({ tag: 'panel', x0: m.x + p.box.x, x1: m.x + p.box.x + p.box.w, y0: m.base + p.box.y, y1: m.base + p.box.y + p.box.h, z0: clearance + p.box.z, z1: clearance + p.box.z + p.box.d });
    }
  }
  for (const w of worktops) boxes.push({ tag: 'worktop', x0: w.x, x1: w.x + w.w, y0: w.y, y1: w.y + w.h, z0: 0, z1: w.d });
  return boxes;
}

/**
 * BUILD THE PICTURE of one wall. Returns entities in PICTURE millimetres
 * (a projection, so `layoutSetSheet` fits it as NTS), Y up.
 */
export function buildPerspective(group, { room = null, worktops = [], profile, ctx }) {
  const S = profile.drawings.set.perspective;
  const boxes = runBoxes(group, { worktops, profile });
  const span = group.to - group.from;
  const top = Math.max(group.top, ...worktops.map((w) => w.y + w.h));
  const P = [group.from - S.leftOffset, S.eyeHeight, S.standOff];
  const T = [group.from + span * 0.55, top * 0.5, 0];
  const cam = makeCamera(P, T);
  const faces = [];
  for (const b of boxes) {
    for (const f of boxFaces(b)) {
      const c = f.pts.reduce((a, p) => [a[0] + p[0] / 4, a[1] + p[1] / 4, a[2] + p[2] / 4], [0, 0, 0]);
      if (cam.sees(f.n, c)) faces.push({ ...f, box: b, dist: Math.hypot(c[0] - P[0], c[1] - P[1], c[2] - P[2]) });
    }
  }
  faces.sort((a, b) => b.dist - a.dist);
  const Sx = (Q) => { const p = cam.project(Q); return [p[0], p[1]]; };
  const entities = [];

  // The building behind: the floor line, the wall's two ends, the ceiling.
  const walls = room ? roomWalls(room) : [];
  const wall = walls[group.wall];
  const ceiling = Number(room?.height) || 0;
  const x0 = wall ? 0 : group.from - 300;
  const x1 = wall ? wall.width : group.to + 300;
  const L = (a, b) => { const [ax, ay] = Sx(a); const [bx, by] = Sx(b); return { ...line('BUILDING', ax, ay, bx, by), pen: 'THIN' }; };
  entities.push(L([x0 - 200, 0, 0], [x1 + 200, 0, 0]));
  if (ceiling > 0) entities.push(L([x0 - 200, ceiling, 0], [x1 + 200, ceiling, 0]));
  if (wall) {
    entities.push(L([x0, 0, 0], [x0, ceiling || top, 0]), L([x1, 0, 0], [x1, ceiling || top, 0]));
    entities.push(L([x0, 0, 0], [x0, 0, 900]), L([x1, 0, 0], [x1, 0, 900]));
  }

  for (const f of faces) {
    const q = f.pts.map(Sx);
    const layer = f.box.tag === 'worktop' ? 'CARCASE' : 'CARCASE';
    entities.push({ ...poly(layer, q, { fill: 'white' }), pen: f.box.tag === 'plinth' ? 'THIN' : 'VISIBLE' });
    if (f.kind === 'front' && f.box.tag === 'unit') {
      const b = f.box;
      const z = b.z1 + 0.5;
      for (const p of b.fronts) {
        const fx0 = b.x0 + p.box.x; const fx1 = fx0 + p.box.w;
        const fy0 = b.y0 + p.box.y; const fy1 = fy0 + p.box.h;
        const fq = [Sx([fx0, fy0, z]), Sx([fx1, fy0, z]), Sx([fx1, fy1, z]), Sx([fx0, fy1, z])];
        entities.push({ ...poly('DOORS', fq), pen: 'VISIBLE' });
      }
      // Handles, where the engine drills them, standing 15 off the face.
      for (const h of handleMarks(b.member.result, profile)) {
        if (h.kind !== 'line') continue;
        const a = Sx([b.x0 + h.x1, b.y0 + h.y1, z + 15]); const c = Sx([b.x0 + h.x2, b.y0 + h.y2, z + 15]);
        entities.push({ ...line('HANDLES', a[0], a[1], c[0], c[1]), pen: 'VISIBLE' });
      }
      const [nx, ny] = Sx([(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, z]);
      entities.push({ ...text('UNIT_NUMBER', nx, ny, String(b.member.unit.params?.unit_num ?? ''), ctx.unitNumberHeight), paperHeight: ctx.unitNumberHeight / ctx.scale, mask: true, weight: 'bold' });
    }
  }
  return { entities };
}
