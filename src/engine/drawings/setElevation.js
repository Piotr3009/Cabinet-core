// ─── T71 · THE WALL ELEVATION OF THE SET. T81: THREE SHEETS PER WALL ────────
//
// The fronts, the wall without its fronts and the X-ray (T81 F2 to F5), each
// drawn by the one projector from the boards and the hardware the room draws
// (`projector.js`). What this file adds is what T71 hung around them:
//
//   · the WORKTOP, from the design layer's own records (`worktopsFor`);
//   · the BUILDING: the floor, the ceiling and the wall's two ends;
//   · chains with ONE home each: wall run widths above, base run widths and
//     the overall below, heights on the left, fronts (or shelves) on the
//     right. No figure appears twice.
//
// Pure functions: no React, no store imports.

import {
  boundsOf, entLine as line, entText as text,
} from './primitives.js';
import {
  frontChainLines, leafChains, mountingBands, widthChains, widthGroups,
} from './wallElevation.js';
import { chainH, chainV } from './setChains.js';
import { roomWalls } from '../room.js';
// T81 · the sheets draw what the room draws, through the one projector.
import { applianceMarks as projectedAppliances, projectRun, unitNumbers } from './projector.js';

/** The wall this group stands on, with its width, when the room knows it. */
function wallOf(group, room) {
  const walls = room ? roomWalls(room) : [];
  // T75 F9 · an island face has no wall ends to draw: the group stands alone.
  return walls[group.wall]?.island ? null : (walls[group.wall] || null);
}

/**
 * What the run OCCUPIES before any chain is hung: units, worktops, the floor
 * with its overhang, the ceiling, and the wall's two ends when they are near
 * enough to draw. Drawing mm, in the wall's own frame.
 */
export function measureRun(group, { room = null, worktops = [], profile }) {
  const W = profile.drawings.wallDrawing;
  const pad = W.fabricOverhang;
  const wall = wallOf(group, room);
  const ends = wallEnds(group, wall);
  const xs = [group.from - pad, group.to + pad, ...ends, ...worktops.flatMap((w) => [w.x, w.x + w.w])];
  const top = Math.max(group.top, ...worktops.map((w) => w.y + w.h));
  const ceiling = Number(room?.height) || 0;
  return {
    x: Math.min(...xs), y: 0,
    w: Math.max(...xs) - Math.min(...xs),
    h: Math.max(top, ceiling > top ? ceiling : top),
  };
}

/**
 * The wall's own two ends, when the run reaches near them: a run that spans
 * most of its wall is drawn between the two walls it meets, as the owner's
 * set draws it. A short run on a long wall keeps the floor overhang only.
 */
function wallEnds(group, wall) {
  if (!wall) return [];
  const span = group.to - group.from;
  if (wall.width <= span * 1.6 + 600) return [0, wall.width];
  return [];
}

// T81 F6: legHardware is retired with the composers that called it (kasacja); every
// sheet's leg is the projector's solid of the room's leg.
// T81 F4: hingePlateMarks, maskNumbers, numberSlot and the composed applianceMarks are retired;
// the projector draws the plates, the numbers and the appliances (kasacja).

/**
 * ─── T81 · ONE WALL THROUGH THE PROJECTOR ──────────────────────────────────
 *
 * The owner, 22.10.2026: *"zalezy mi zebys rysowal w pdf 1 do 1 co mamy na
 * cabinet core, a przeciez mamy x-ray, to tez mozna zrobic x-ray prosze."*
 * The geometry is the projector's (the boards, the hardware and the handles
 * the room draws, visibility by depth); this adds the words (the unit
 * numbers, the appliance a unit is built around), the building and the
 * chains, each in its home as T71 hung them.
 */
function projectedRun(group, {
  mode, room, worktops, frontTypeOf, shakerFrame, profile, ctx, defaultHandle = null,
}) {
  const W = profile.drawings.wallDrawing;
  const entities = [];
  const wall = wallOf(group, room);
  const ends = wallEnds(group, wall);
  const pad = W.fabricOverhang;
  const ceiling = Number(room?.height) || 0;
  const drawn = projectRun(group, {
    view: 'front', mode, profile, worktops, frontTypeOf, shakerFrame,
    // T82 F22: a front with no handle chosen shows the profile's default.
    defaultHandle,
    // A piece shorter than a quarter of a paper millimetre is not a line a
    // printer can draw: what a 3 mm slot leaves of a board behind it.
    minEdge: ctx ? ctx.mm(profile.drawings.projector.minEdgePaperMm) : 0,
  });
  entities.push(...drawn.entities);
  entities.push(...unitNumbers(group, { view: 'front', mode, profile, ctx }));
  entities.push(...projectedAppliances(group, { mode, profile, ctx }));
  const x0 = Math.min(group.from - pad, ...ends);
  const x1 = Math.max(group.to + pad, ...ends);
  entities.push({ ...line('BUILDING', x0, 0, x1, 0), pen: 'VISIBLE' });
  if (ceiling > group.top) {
    entities.push({ ...line('BUILDING', x0, ceiling, x1, ceiling), pen: 'VISIBLE' });
    entities.push({ ...text('BUILDING', (x0 + x1) / 2, ceiling + ctx.labelHeight, `CEILING ${Math.round(ceiling)}`, ctx.labelHeight * 0.85), paperHeight: (ctx.labelHeight * 0.85) / ctx.scale });
  }
  for (const e of ends) entities.push({ ...line('BUILDING', e, 0, e, ceiling > group.top ? ceiling : group.top), pen: 'VISIBLE' });
  entities.push({ ...text('BUILDING', (x0 + x1) / 2, -ctx.labelHeight, 'FFL', ctx.labelHeight * 0.85), paperHeight: (ctx.labelHeight * 0.85) / ctx.scale });
  const chains = runChains(group, { withFronts: mode !== 'no-fronts', ends, worktops, ceiling, profile, ctx });
  entities.push(...chains.flat());
  return { entities, chains, census: drawn.census, solid: boundsOf(entities.filter((e) => e.layer !== 'DIMENSIONS')) };
}

/**
 * BUILD ONE WALL, one sheet. `mode` picks the sheet: 'fronts', 'no-fronts'
 * or 'xray' (T81); `withFronts` is the T71 pair's own word for the first two.
 *
 * @returns {{entities, chains}} in drawing mm, Y up, in the wall frame
 */
export function buildRunElevation(group, {
  withFronts = true, mode = null, room = null, worktops = [], frontTypeOf = null, shakerFrame = null, profile, ctx,
  defaultHandle = null,
}) {
  // T81 F3 to F5 · every sheet of a wall is the projector's: only what the eye sees.
  // T82 F22 · `defaultHandle`: projector.js sheetDefaultHandle, drawn on the fronts and the X-ray.
  return projectedRun(group, {
    mode: mode || (withFronts ? 'fronts' : 'no-fronts'), room, worktops, frontTypeOf, shakerFrame, profile, ctx, defaultHandle,
  });
}

/**
 * THE HOMES. Above: the highest mounting band's widths (the wall run), or the
 * floor run when nothing hangs. Below: the floor run's widths with the
 * scribes to the wall ends, then the overall on the second line. Left: the
 * heights (legs, carcass, worktop, gap, wall run) and the overall with the
 * ceiling on the second line. Right: front heights on the fronts sheet;
 * shelf positions of the first shelved unit on the internal sheet.
 */
function runChains(group, { withFronts, ends, worktops, ceiling, profile, ctx }) {
  const out = [];
  const bands = mountingBands(group.members);
  const floor = bands[0];
  const upper = bands.length > 1 ? bands[bands.length - 1] : null;
  const left = Math.min(group.from, ...ends);
  const right = Math.max(group.to, ...ends);
  const top = Math.max(group.top, ceiling || 0);

  // TOP: the wall run (or the only run) at its own top edge.
  const topBand = upper || floor;
  if (topBand) {
    const edges = widthChains(topBand.members, profile).detailedEdges;
    const bandTop = Math.max(...topBand.members.map((m) => m.top));
    out.push(chainH({ edges, y: bandTop + ctx.chainFirst, yObj: bandTop, ctx, above: true }));
  }
  // BOTTOM: the floor run with its scribes, and the overall. T82 F21: on a
  // sheet with fronts the floor run's LEAF, GAP, LEAF hangs on the second line
  // under its unit chain, and the overall steps out to the third.
  const floorLeaves = withFronts && floor ? leafChains(floor.members).leafEdges : [];
  if (floor) {
    const edges = [...new Set([...ends, ...widthChains(floor.members, profile).detailedEdges])].sort((a, b) => a - b);
    out.push(chainH({ edges, y: -ctx.chainFirst, yObj: 0, ctx, above: false }));
    if (edges.length > 2) {
      out.push(chainH({ edges: [edges[0], edges[edges.length - 1]], y: floorLeaves.length > 1 ? -ctx.chainThird : -ctx.chainSecond, ctx, above: false }));
    }
  }
  // LEFT: heights.
  const heights = new Set([0]);
  for (const b of bands) for (const m of b.members) { heights.add(m.base); heights.add(m.top); }
  for (const w of worktops) { heights.add(w.y); heights.add(w.y + w.h); }
  const hs = [...heights].filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (hs.length > 1) out.push(chainV({ edges: hs, x: left - ctx.chainFirst, xObj: left, ctx, left: true }));
  const outer = [0, group.top];
  if (ceiling > group.top) outer.push(ceiling);
  if (outer[outer.length - 1] > 0) out.push(chainV({ edges: outer, x: left - ctx.chainSecond, ctx, left: true }));
  // RIGHT. T82 F21: every unit's own FRONT, GAP, FRONT (never two units'
  // edges pooled into one chain), one line per stack that overlaps another in
  // height; the inner line takes the extension lines, as T71's inner chains do.
  if (withFronts) {
    frontChainLines(group.members).forEach((line, k) => {
      for (const stack of line) {
        out.push(chainV({
          edges: stack.edges, x: right + ctx.chainFirst + k * (ctx.chainSecond - ctx.chainFirst), xObj: k === 0 ? right : null, ctx, left: false,
        }));
      }
    });
  } else {
    const shelved = (floor?.members || []).find((m) => (m.result.assemblies?.shelves || []).length);
    if (shelved) {
      const base = shelved.base;
      const H = Number(shelved.result.params.height) || 0;
      const ys = new Set([base, base + H]);
      for (const s of shelved.result.assemblies.shelves) { ys.add(base + s.y); ys.add(base + s.y + (s.thickness || 18)); }
      out.push(chainV({ edges: [...ys].sort((a, b) => a - b), x: right + ctx.chainFirst, xObj: right, ctx, left: false }));
    }
  }
  // T82 F21: the leaf chains, last, so every chain T71 hung keeps its place
  // in the list. The floor run's on its second line below the floor.
  if (floorLeaves.length > 1) out.push(chainH({ edges: floorLeaves, y: -ctx.chainSecond, ctx, above: false }));
  // A hung run's under its own carcasses, in the open wall between it and
  // what stands below, one chain per run of touching units (a tall unit
  // between two wall runs is never crossed), first leaf to last (a figure at
  // a carcass end would hang over the tall unit beside it). It needs the room
  // of two chain lines there, `chainSecond`; where a unit or a worktop stands
  // in that room the run's leaves are not hung over it.
  if (withFronts) {
    for (const band of bands.slice(1)) {
      for (const run of widthGroups(band.members, profile)) {
        const { leafEdges } = leafChains(run.members, { ends: false });
        if (leafEdges.length < 2) continue;
        const base = Math.min(...run.members.map((m) => m.base));
        const room = { x0: run.from, x1: run.to, y0: base - ctx.chainSecond, y1: base };
        // Half a millimetre, the house's "same edge" (wallElevation.js SAME).
        const across = (x0, x1, y0, y1) => x0 < room.x1 - 0.5 && x1 > room.x0 + 0.5 && y0 < room.y1 - 0.5 && y1 > room.y0;
        const blocked = group.members.some((m) => !run.members.includes(m) && across(m.x, m.x + m.width, m.base, m.top))
          || worktops.some((w) => across(w.x, w.x + w.w, w.y, w.y + w.h));
        if (!blocked) out.push(chainH({ edges: leafEdges, y: base - ctx.chainFirst, ctx, above: false }));
      }
    }
  }
  void top;
  return out;
}

/** The worktops that lie on THIS wall, from the design layer's resolved list. */
export function worktopsOnWall(worktops, wallIndex) {
  return (worktops || [])
    .map((w) => w.geometry || w)
    .filter((g) => g && Number(g.wall ?? 0) === wallIndex && Number.isFinite(g.x) && g.w > 0);
}
