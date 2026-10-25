// ─── T71 · THE SECTIONS: THE WHOLE HEIGHT, TWO TO A SHEET ───────────────────
//
// T43 wrote the grammar (`section.js cutCabinet`): every board the knife
// passes through as a CUT bar, the drawer boxes as side profiles on their
// runners, the legs. What the owner's set showed us is WHERE the knife goes
// and WHAT ELSE is in the picture: one cut, at the drawer unit, shows the
// plinth, the base carcass, the worktop, the wall unit above it, the wall
// behind and the ceiling over it, all on one drawing, because that is the
// section a fitter reads the heights off. And a second cut, through the sink.
//
// So a sheet carries the stations `sectionStations()` names, A-A and B-B, side
// by side at one scale, each with its own chains. T81 F6: what a station
// shows is the projector's (`projector.js`): the boards the knife meets CUT,
// and beyond the plane, as far as the cut cabinets reach, what the room shows
// there (the drawer boxes on their runners, the legs, the shelves, the
// plates, the knob), each from the same solid the room draws.
//
// Pure functions: no React, no store imports.

import { cutMembers } from './section.js';
import { mountingBands } from './wallElevation.js';
import { boundsOf, entLine as line, entRect as rect, entText as text, moveEntities } from './primitives.js';
import { chainH, chainV } from './setChains.js';
import { projectRun, unitNumbers } from './projector.js';
// T72 F14 · how far THIS unit stands off its wall — the one helper.
import { wallGapOf } from '../runs.js';
// T82 F7 · the HAWA pocket on its section: the tracks' two axes and T1.
import { isPocketDoor, pocketSectionEntities } from '../pocketDoorPose.js';
// T82 F12 · the vanity's service void: the one number the slab, the plan and the Check read.
import { serviceVoidOf } from '../worktop.js';

/**
 * WHERE THE KNIFE GOES on this wall: A-A through the first drawer unit of the
 * floor run (a section is read for the drawers), else the first floor unit;
 * B-B through the sink unit when there is one and it is not A-A's. A chosen
 * unit (the dropdown) is added as C-C, or replaces A-A when it is the same.
 *
 * @returns {Array<{letter:string, x:number, member:object}>}
 */
export function sectionStations(group, { chosenId = null } = {}) {
  const bands = mountingBands(group?.members || []);
  const floor = bands[0];
  if (!floor || !floor.members.length) return [];
  const isDrawer = (m) => (m.result.assemblies?.drawerFronts || []).length > 0
    || (m.result.panels || []).some((p) => p.part === 'DRAWER-SIDE');
  const isSink = (m) => m.unit.type === 'SINK';
  const centre = (m) => m.x + (Number(m.width) || 0) / 2;
  const out = [];
  const a = floor.members.find(isDrawer) || floor.members[0];
  out.push({ letter: 'A', x: centre(a), member: a });
  const b = floor.members.find((m) => isSink(m) && m !== a);
  if (b) out.push({ letter: 'B', x: centre(b), member: b });
  // T82 F7 · *"the section through the pocket shows T1 and the tracks' zones"*:
  // a run with a HAWA pocket is cut through it too, mid pocket (its clear space).
  const pk = floor.members.find((m) => (m.result.panels || []).some(isPocketDoor) && !out.some((s) => s.member === m));
  if (pk) out.push({ letter: String.fromCharCode(65 + out.length), x: centre(pk), member: pk });
  if (chosenId) {
    const c = (group.members || []).find((m) => m.unit.id === chosenId);
    if (c && !out.some((s) => s.member === c)) out.push({ letter: String.fromCharCode(65 + out.length), x: centre(c), member: c });
  }
  return out;
}

/**
 * T82 F12 · a 45 degree hatch clipped to a rectangle: the segments of the
 * lines y = x + k, k on the pitch, inside [x0, x1] x [y0, y1]. The house's
 * hatch (the wall band's and the T80 filler's direction), handed out once so
 * the plan's void and the section's are the same lines.
 *
 * @returns {Array<[number, number, number, number]>} [ax, ay, bx, by] each
 */
export function hatchLines(x0, y0, x1, y1, pitch) {
  const out = [];
  if (!(pitch > 0) || !(x1 > x0) || !(y1 > y0)) return out;
  for (let k = y0 - x1 + pitch / 2; k < y1 - x0; k += pitch) {
    const ax = Math.max(x0, y0 - k);
    const bx = Math.min(x1, y1 - k);
    if (bx - ax <= 1e-6) continue;
    out.push([ax, ax + k, bx, bx + k]);
  }
  return out;
}

/** The wall's own thickness on a section, drawn as a hatched band behind the run. */
function wallBand(ctx, { top, profile }) {
  const S = profile.drawings.set;
  const t = ctx.mm(6);                 // the band on paper, whatever the scale
  const out = [{ ...rect('BUILDING', -t, 0, t, top), pen: 'CUT' }];
  const pitch = ctx.mm(S.hatchPitch);
  for (let y = 0; y < top; y += pitch) {
    const y1 = Math.min(top, y + t);
    out.push({ ...line('BUILDING', -t, y, -t + (y1 - y), y1), pen: 'FINE' });
  }
  return out;
}

/**
 * ONE STATION, cut: every member the knife passes through, the worktop over
 * the run, the wall band, the floor and the ceiling, and its chains.
 */
export function buildStation(group, station, {
  room = null, worktops = [], profile, ctx, frontTypeOf = null, shakerFrame = null,
}) {
  const members = cutMembers(group, station.x);
  const entities = [];
  const ceiling = Number(room?.height) || 0;
  const top = Math.max(ceiling, ...members.map((m) => m.top));
  // ─── TURN 72 (CLAUDE.md F14): EACH MEMBER'S OWN GAP ─────────────────────
  // A section is a knife through the room, so what it draws is where each
  // cabinet STANDS. `wallGapOf` answers the project's own number for every
  // unit that has never been asked, which is every unit in every job saved
  // before tonight: the sheet is unchanged unless a client typed a gap.
  const gapOf = (m) => wallGapOf(m.unit, profile);

  // ─── T81 F6 · THE KNIFE THROUGH THE ROOM ──────────────────────────────
  // The plane at the station, looking along the wall towards its end; beyond
  // it, as far as the cut cabinets reach. The frame of an in-frame run is the
  // FRAME board itself: the knife through a cabinet's opening cuts its two
  // rails and sees the stile beyond, as T80 F8 drew it, now from the board.
  const far = Math.max(station.x, ...members.map((m) => m.x + (Number(m.width) || 0)));
  const drawn = projectRun(group, {
    view: 'section', cut: station.x, beyond: [station.x, far], mode: 'fronts', profile, worktops, frontTypeOf, shakerFrame,
    minEdge: ctx.mm(profile.drawings.projector.minEdgePaperMm),
  });
  entities.push(...drawn.entities);
  // T82 F7 · a HAWA pocket the knife passes: its tracks' axes (22, 41) and T1.
  entities.push(...pocketSectionEntities(members, { profile, ctx, gapOf: (u) => wallGapOf(u, profile) }));
  // ─── T80 F8 · THE FILLER ON THE SECTION ────────────────────────────────
  // The owner, 21.10.2026 (22:40): *"6 informacja i na pdf na przekroju pokaz
  // kawalek timber"*. Over a base carcass, behind the top rail, the joiner's
  // 19 of timber, hatched and named: a note, never a board. Every number is
  // the cabinet's own (`derived.inframe`). Lay-on: nothing.
  for (const m of members) {
    const fr = m.result.derived?.inframe;
    if (!fr) continue;
    const clearance = gapOf(m);
    const H = Number(m.result.params.height) || 0;
    if (fr.filler) {
      const x0 = clearance + fr.filler.z0;
      const x1 = clearance + fr.filler.z1;
      const y0 = m.base + H;
      const h = fr.filler.h;
      entities.push({ ...rect('CARCASE', x0, y0, x1 - x0, h), pen: 'CUT', solid: true, meta: { inframe: 'filler' } });
      // The timber's hatch: 45 degree lines at the house's pitch, inside the piece.
      const pitch = ctx.mm(profile.drawings.set.hatchPitch);
      for (let k = -h; k < x1 - x0; k += pitch) {
        const ax = Math.max(x0, x0 + k);
        const bx = Math.min(x1, x0 + k + h);
        if (bx - ax <= 1e-6) continue;
        entities.push({ ...line('CARCASE', ax, y0 + (ax - (x0 + k)), bx, y0 + (bx - (x0 + k))), pen: 'FINE', meta: { inframe: 'filler-hatch' } });
      }
      entities.push({
        ...text('SHEET_MUTED', (x0 + x1) / 2, y0 + h + ctx.mm(3.2), `site filler ${h} (timber)`, ctx.mm(1.9)),
        paperHeight: 1.9,
        mask: true,
        meta: { inframe: 'filler-label' },
      });
    }
  }
  // ─── T82 F12 · THE SERVICE VOID BEHIND A VANITY ─────────────────────────
  // The owner, 25.10.2026 (12:57): *"to bedzie miejsce z tylu na rurki"*. The
  // space from the wall to the carcass back, over the carcass's height,
  // hatched on its own ink (SERVICE_VOID, one ink one layer) and named; the
  // two rails across it are the vanity's own boards, cut above by the knife.
  for (const m of members) {
    const v = serviceVoidOf(m.unit, profile);
    if (!(v > 0)) continue;
    const back = gapOf(m);
    const y0 = m.base;
    const y1 = m.base + (Number(m.result.params.height) || 0);
    for (const [ax, ay, bx, by] of hatchLines(0, y0, back, y1, ctx.mm(profile.drawings.set.hatchPitch))) {
      entities.push({ ...line('SERVICE_VOID', ax, ay, bx, by), pen: 'FINE', meta: 'service-void' });
    }
    entities.push({
      ...text('SHEET_MUTED', back / 2, (y0 + y1) / 2, `SERVICE VOID ${Math.round(v)}`, ctx.mm(1.9)),
      paperHeight: 1.9,
      rotate: -90,
      mask: true,
      meta: 'service-void-label',
    });
  }
  const deepest = Math.max(0, ...members.map((m) => gapOf(m) + (Number(m.result.params.depth) || 0) + (Number(profile.doors?.gap) || 0) + (Number(m.result.params.front_t) || 0)), ...worktops.map((w) => w.d));
  entities.push(...wallBand(ctx, { top, profile }));
  entities.push({ ...line('BUILDING', -ctx.mm(6), 0, deepest + ctx.mm(12), 0), pen: 'VISIBLE' });
  if (ceiling > 0) entities.push({ ...line('BUILDING', -ctx.mm(6), ceiling, deepest + ctx.mm(12), ceiling), pen: 'VISIBLE' });

  // Unit numbers, on white, in the carcass.
  entities.push(...unitNumbers(group, { view: 'section', profile, ctx, only: (m) => members.includes(m) }));

  // ── chains: heights up the right, depths along the bottom, the wall run's depth on top ──
  const chains = [];
  const hs = new Set([0, top]);
  for (const m of members) { hs.add(m.base); hs.add(m.top); }
  for (const w of worktops) if (w.x <= station.x && station.x <= w.x + w.w) { hs.add(w.y); hs.add(w.y + w.h); }
  const xr = deepest + ctx.chainFirst;
  chains.push(chainV({ edges: [...hs].sort((a, b) => a - b), x: xr, xObj: deepest, ctx, left: false }));
  chains.push(chainV({ edges: [0, top], x: deepest + ctx.chainSecond, ctx, left: false }));
  const floorMember = members.find((m) => m.base < 200) || members[0];
  if (floorMember) {
    const D = Number(floorMember.result.params.depth) || 0;
    const frontT = Number(floorMember.result.params.front_t) || 0;
    const gap = Number(profile.doors?.gap) || 0;
    const clearance = gapOf(floorMember);
    const ds = new Set([0, clearance, clearance + D, clearance + D + gap + frontT]);
    const wt = worktops.find((w) => w.x <= station.x && station.x <= w.x + w.w);
    if (wt) ds.add(wt.d);
    chains.push(chainH({ edges: [...ds].sort((a, b) => a - b), y: -ctx.chainFirst, yObj: 0, ctx, above: false }));
  }
  const hung = members.find((m) => m.base >= 200);
  if (hung) {
    const D = Number(hung.result.params.depth) || 0;
    const frontT = Number(hung.result.params.front_t) || 0;
    const gap = Number(profile.doors?.gap) || 0;
    const clearance = gapOf(hung);
    chains.push(chainH({ edges: [0, clearance, clearance + D, clearance + D + gap + frontT].filter((v, i, arr) => arr.indexOf(v) === i), y: hung.top + ctx.chainFirst, yObj: hung.top, ctx, above: true }));
  }
  entities.push(...chains.flat());

  const names = members.map((m) => String(m.unit.params?.unit_num ?? '')).filter(Boolean);
  const caption = `SECTION ${station.letter}-${station.letter} · through unit${names.length > 1 ? 's' : ''} ${names.join(' and ')}`;
  // The caption sits in the bottom band, under the depth chain and its lifted
  // figures, and never lower: the band is what the sheet reserved for it.
  entities.push({ ...text('VIEW_TITLE', deepest / 2, -ctx.mm(19.5), caption, ctx.mm(2.8)), paperHeight: 2.8, weight: 'bold' });
  entities.push({ ...text('SHEET_MUTED', deepest / 2, -ctx.mm(23), 'looking along the wall, towards its end', ctx.mm(1.9)), paperHeight: 1.9 });

  return { entities, chains, members, bounds: boundsOf(entities.filter((e) => e.layer !== 'DIMENSIONS')) };
}

/**
 * THE SHEET: the stations side by side at ONE scale. Measured as the tallest
 * station's height and the sum of the widths with a gap between them.
 */
export function stationSet(group, stations, args) {
  return {
    // No `measure`: the sheet builds this once at 1:1 to read its extent, then
    // again at the scale it chose (`layoutSetSheet`).
    build: (ctx) => {
      const entities = [];
      let dx = 0;
      const gapMm = ctx.mm(args.profile.drawings.set.band * 2.2);
      for (const st of stations) {
        const one = buildStation(group, st, { ...args, ctx });
        entities.push(...moveEntities(one.entities, dx, 0));
        const width = (one.bounds.x + one.bounds.w) - Math.min(0, one.bounds.x);
        dx += width + gapMm;
      }
      return { entities };
    },
  };
}
