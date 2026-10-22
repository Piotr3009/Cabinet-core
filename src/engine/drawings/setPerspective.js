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
// T81 F2: the painter is retired. The picture is the room's own boards and
// hardware through the projector (./projector.js), visibility by depth, and
// it is the set's first sheet, the 3D.
//
// Pure functions: no React, no store imports.

import { entText as text } from './primitives.js';
import { roomWalls } from '../room.js';
// T81 · the 3D sheet: the room's own boards, through the one projector.
import { projectRoom } from './projector.js';
import { wallGapOf } from '../runs.js';

// T81 F2 · T71's own pinhole, box faces and painter's order are retired: the 3D
// sheet below projects the room's own boards through the one projector.

// ─── T81 F2 · THE 3D SHEET: THE ROOM, FIRST ──────────────────────────────────
//
// The owner, 22.10.2026 (21:23): *"najpierw chce widziec 3d jak zrobiles
// pierwsza strona"*. The picture the cover carried (the first wall's
// perspective, from eye height) becomes sheet 01, and it is drawn from the
// room's own boards and hardware through the projector, so the in-frame
// frame, the end panels, the plinth and the knobs are on it (the audit of
// 22.10: today's perspective drew the in-frame kitchen without its frame).
// Every run of the room stands in the one picture, moved into the room's
// frame by its wall; a run whose room side the camera is not on shows its
// back and is left out. The camera is T71's: `set.perspective` from the
// first wall, eye height, standing off into the room, to the left of the run.

/** The 3D sheet's camera, in the room's frame: T71's, from the first run's wall. */
function room3dCamera(groups, { room = null, worktops = [], profile }) {
  const S = profile.drawings.set.perspective;
  const first = groups[0];
  const walls = room ? roomWalls(room) : [];
  const wall = walls[first.wall] || null;
  const span = first.to - first.from;
  const top = Math.max(first.top, ...worktops.map((w) => w.y + w.h));
  const P = [first.from - S.leftOffset, S.eyeHeight, S.standOff];
  const T = [first.from + span * 0.55, top * 0.5, 0];
  if (!wall) return { P, T };
  const to = (p) => [wall.start.x + wall.along.x * p[0] + wall.inward.x * p[2], p[1], wall.start.y + wall.along.y * p[0] + wall.inward.y * p[2]];
  return { P: to(P), T: to(T) };
}

/**
 * BUILD THE 3D PICTURE of the room's runs. Entities in PICTURE units (a
 * projection, laid by `layoutSetSheet` as NTS), Y up.
 *
 * @param {Array} groups  the on-plaster `wallGroups()`
 */
export function buildRoom3d(groups, {
  room = null, worktops = [], profile, ctx, frontTypeOf = null, shakerFrame = null,
}) {
  if (!groups.length) return { entities: [] };
  const walls = room ? roomWalls(room) : [];
  const slabsOn = (i) => (worktops || []).map((w) => w.geometry || w).filter((g) => g && Number(g.wall ?? 0) === i);
  const camera = room3dCamera(groups, { room, worktops: slabsOn(groups[0].wall), profile });
  const runs = groups.map((g) => ({ group: g, wall: walls[g.wall] || null, worktops: slabsOn(g.wall) }));
  // The building behind each run: its floor line, its ceiling line and its
  // two ends, hidden behind the units like any edge.
  const ceiling = Number(room?.height) || 0;
  const building = (merged) => {
    const shown = new Set(merged.live.map((s) => s.member?.unit?.id).filter(Boolean));
    const out = [];
    for (const { group, wall } of runs) {
      if (!wall || !group.members.some((m) => shown.has(m.unit.id))) continue;
      const P = (x, y, z) => [wall.start.x + wall.along.x * x + wall.inward.x * z, y, wall.start.y + wall.along.y * x + wall.inward.y * z];
      const L = (a, b) => out.push({ a, b, props: { layer: 'BUILDING', pen: 'THIN' } });
      L(P(0, 0, 0), P(wall.width, 0, 0));
      if (ceiling > 0) L(P(0, ceiling, 0), P(wall.width, ceiling, 0));
      L(P(0, 0, 0), P(0, ceiling || group.top, 0));
      L(P(wall.width, 0, 0), P(wall.width, ceiling || group.top, 0));
    }
    return out;
  };
  const drawn = projectRoom(runs, {
    camera, profile, frontTypeOf, shakerFrame, extras: building,
  });
  const V = drawn.view;
  const entities = [...drawn.entities];
  const seen = new Set(drawn.solids.map((s) => s.member?.unit?.id).filter(Boolean));
  // The unit numbers, on the faces of the units the picture shows.
  for (const { group, wall } of runs) {
    for (const m of group.members) {
      if (!seen.has(m.unit.id)) continue;
      const r = m.result;
      const W = Number(r.params.width) || 0;
      const H = Number(r.params.height) || 0;
      const D = Number(r.params.depth) || 0;
      const fronts = (r.panels || []).filter((p) => p.box && (p.part === 'FRONT' || p.part === 'DRAWER-FRONT'));
      const face = Math.max(D, ...fronts.map((p) => p.box.z + p.box.d)) + wallGapOf(m.unit, profile);
      const x = m.x + W / 2; const y = m.base + H / 2;
      const Q = wall ? [wall.start.x + wall.along.x * x + wall.inward.x * face, y, wall.start.y + wall.along.y * x + wall.inward.y * face] : [x, y, face];
      const [nx, ny] = V.screen(Q);
      entities.push({
        ...text('UNIT_NUMBER', nx, ny, String(m.unit.params?.unit_num ?? ''), ctx.unitNumberHeight),
        paperHeight: ctx.unitNumberHeight / ctx.scale, mask: true, weight: 'bold',
      });
    }
  }
  return { entities, census: drawn.census };
}
