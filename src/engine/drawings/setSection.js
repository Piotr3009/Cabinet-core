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
// by side at one scale, each with its own chains. Everything drawn is
// `cutCabinet`'s, the design layer's worktop, the room's ceiling, and the same
// leg the scene draws.
//
// Pure functions: no React, no store imports.

import { cutCabinet, cutMembers } from './section.js';
import { mountingBands } from './wallElevation.js';
import { boundsOf, entLine as line, entRect as rect, entText as text, moveEntities } from './primitives.js';
import { chainH, chainV } from './setChains.js';
import { legHardware } from './setElevation.js';
// T72 F14 · how far THIS unit stands off its wall — the one helper.
import { wallGapOf } from '../runs.js';

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
  if (chosenId) {
    const c = (group.members || []).find((m) => m.unit.id === chosenId);
    if (c && !out.some((s) => s.member === c)) out.push({ letter: String.fromCharCode(65 + out.length), x: centre(c), member: c });
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
export function buildStation(group, station, { room = null, worktops = [], profile, ctx }) {
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

  for (const m of members) {
    // `cutCabinet` draws the carcass at z = 0 at the wall; every unit stands
    // its own clearance off it, and its legs are added here as the scene draws
    // them (the grammar's three lines are replaced by plate, stem and foot).
    const clearance = gapOf(m);
    const cut = cutCabinet(m, profile).filter((e) => e.layer !== 'LEG_BLOCK');
    entities.push(...moveEntities(cut, clearance, 0));
    const legs = m.result.assemblies?.legs;
    const legH = Number(m.result.assemblies?.carcass?.legHeight) || 0;
    if (legs && legH > 0) {
      const zs = [...new Set(legs.positions.map((p) => Math.round(Number(p.z) || 0)))];
      for (const z of zs) entities.push(...legHardware({ x: z }, { width: legs.width, height: legH, profile, dx: clearance, dy: m.base }));
    }
  }
  for (const w of worktops) {
    if (w.x <= station.x && station.x <= w.x + w.w) {
      entities.push({ ...rect('CARCASE', 0, w.y, w.d, w.h), pen: 'CUT', fill: '#d9d9d9', solid: true });
    }
  }
  const deepest = Math.max(0, ...members.map((m) => gapOf(m) + (Number(m.result.params.depth) || 0) + (Number(profile.doors?.gap) || 0) + (Number(m.result.params.front_t) || 0)), ...worktops.map((w) => w.d));
  entities.push(...wallBand(ctx, { top, profile }));
  entities.push({ ...line('BUILDING', -ctx.mm(6), 0, deepest + ctx.mm(12), 0), pen: 'VISIBLE' });
  if (ceiling > 0) entities.push({ ...line('BUILDING', -ctx.mm(6), ceiling, deepest + ctx.mm(12), ceiling), pen: 'VISIBLE' });

  // Unit numbers, on white, in the carcass.
  for (const m of members) {
    const D = Number(m.result.params.depth) || 0;
    const H = Number(m.result.params.height) || 0;
    entities.push({ ...text('UNIT_NUMBER', gapOf(m) + D * 0.55, m.base + H * 0.12, String(m.unit.params?.unit_num ?? ''), ctx.unitNumberHeight), paperHeight: ctx.unitNumberHeight / ctx.scale, mask: true, weight: 'bold' });
  }

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
  entities.push({ ...text('SHEET_MUTED', deepest / 2, -ctx.mm(23), 'looking along the wall, towards its start', ctx.mm(1.9)), paperHeight: 1.9 });

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
