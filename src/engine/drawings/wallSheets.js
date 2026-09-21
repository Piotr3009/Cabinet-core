// ─── THE WALL DRAWING SET, ON PAPER (turn 40, CLAUDE.md F5) ─────────────────
//
// The join between "what the geometry is" (wallElevation.js) and "what the
// sheet says" (sheet.js), exactly as `card.js` joins the unit card to it. It
// lives in the engine and not in the modal because the PDF, the DXF and the
// on-screen preview must all be the same set of sheets: a drawing built one way
// for the screen and another way for the file is how a printed drawing stops
// matching the one it was approved from.
//
// THE SET IS HIS. `Wall A /1`, `Wall A /2`, `Wall B /1`, `Wall B /2`, …, then
// one `Horizontal section` for the whole project — the sheet list of the
// Anderson Kitchen rev B drawings he supplied as the standard.
//
// Pure functions — no React, no store imports, no jsPDF.

import { turnedAway, wallGroups, wallLabel } from './wallElevation.js';
// ─── TURN 43 (CLAUDE.md F5): THE VERTICAL SECTIONS. BOTH. ───────────────────
// The owner: *"Nie widzę przekroju w pionie ani w poziomie."* The horizontal
// one exists (the set's last sheet). The vertical one did not exist anywhere
// under `src/engine/drawings/` — never written, not regressed — and he has
// asked for BOTH twice: a section per wall, AND an A-A through a cabinet he
// points at.
import { sectionableUnits } from './section.js';
// ─── TURN 43 (CLAUDE.md F2): THE PROJECT'S OWN MILLIMETRES ──────────────────
// The owner: *"shaker prawdziwy — ile mam mm, tyle powinno być pokazane."*
// MEASURED on the real engine before a line was written: project frame 80 mm →
// DRAWN 60 mm, because `frontDetail` was called with no frame and `design`
// never reached this module at all, so `shakerFrameMm(null, profile)` answered
// with the profile default every single time. The function already knew how to
// read the project's number; nobody handed it the project.
import { shakerFrameMm } from '../shaker.js';

// ─── T71 · THE SET, IN THE ORDER IT IS BOUND ────────────────────────────────
//
// The owner, 21.09.2026, Skylon Joinery's own set on the table: one view per
// A3, the same title strip on every sheet, and *"wszystko osobno"*. The list:
//
//   00  Cover, index and revisions
//   01  Plan · base units          02  Plan · wall units
//   NN  Wall A · Front view        NN  Wall A · Internal layout
//   NN  Wall A · Sections          (and the same three for every wall)
//   NN  Wall A · Perspective       NN  Visualisation
//   NN  Cut list and materials
//
// The sheet law (`setSheet.js`) lays every one of them; the builders draw the
// engine's own boxes; this file only binds them in order and numbers them.
// The unit card and the booklet are untouched (iron rule 4).

import { SET_NOTES, drawingContext, fitEntities, layoutSetSheet, setZones } from './setSheet.js';
import { buildRunElevation, measureRun, worktopsOnWall } from './setElevation.js';
import { buildPlan, measurePlan } from './setPlan.js';
import { sectionStations, stationSet } from './setSection.js';
import { buildPerspective } from './setPerspective.js';
import { buildCover, buildCutList, buildVisual, cutListPages, visualPictureBox } from './setPaper.js';
import { decorById, decorIdFromFinishId, decorLabel } from '../decors.js';
import { worktopsFor } from '../worktop.js';

/** The title strip's words, from the project and its title block. */
export function titleFor({ project = {}, profile, no, name, date = '' }) {
  const tb = project.titleBlock || {};
  const S = profile.drawings.set;
  const job = String(project.number ?? project.project_number ?? '');
  return {
    company: { ...S.company, ...(tb.company || {}) },
    client: project.client || '',
    address: tb.address || project.address || '',
    project: project.name || 'Untitled project',
    drawing: `${no} · ${name}`,
    drawingNo: job ? `${job.replace(/\//g, '-')}-${no}` : no,
    drawn: tb.drawnBy || '',
    checked: tb.checkedBy || '',
    date: tb.date || date || '',
    job,
    rev: tb.rev || project.rev || 'A',
    status: tb.status || 'B',
    statusName: (S.statuses.find(([k]) => k === (tb.status || 'B')) || [])[1] || '',
    sheet: '', of: '',
  };
}

/** What the visualisation sheet says beside the render, read off the design. */
export function finishesOf(design) {
  const rows = [];
  const decorRow = (finishId) => {
    const d = decorById(decorIdFromFinishId(finishId));
    return d ? { desc: decorLabel(d), colour: d.hex || d.colour || '#e6e6e6' } : null;
  };
  const front = design?.fronts?.types?.[0];
  const frontDecor = front?.finish_id ? decorRow(front.finish_id) : null;
  const frontColour = design?.colour?.front;
  rows.push({
    name: 'FRONTS',
    desc: frontDecor ? frontDecor.desc : (frontColour ? `Sprayed, ${frontColour.name || frontColour.hex}${design?.finish?.front ? `, ${design.finish.front}` : ''}` : 'not chosen yet'),
    colour: frontDecor ? frontDecor.colour : (frontColour?.hex || '#e6e6e6'),
  });
  const carc = design?.carcass?.types?.[0];
  const carcDecor = carc?.finish_id ? decorRow(carc.finish_id) : null;
  rows.push({ name: 'CARCASS', desc: carcDecor ? carcDecor.desc : 'not chosen yet', colour: carcDecor ? carcDecor.colour : '#e6e6e6' });
  const wt = (design?.worktops || []).find((w) => w?.decor);
  const wtDecor = wt ? decorRow(wt.decor) || decorRow(`egger:${wt.decor}`) : null;
  rows.push({ name: 'WORKTOP', desc: wtDecor ? wtDecor.desc : 'by others', colour: wtDecor ? wtDecor.colour : '#f1efe9' });
  return rows;
}

/**
 * Every sheet of the set, in the order they are bound.
 *
 * @param {object} args
 *   entries       [{ unit, result }], the store's `allResults()` shape
 *   project       { name, number, client, room, design, titleBlock }
 *   room          the project's room
 *   worktops      the design layer's resolved slabs (`worktopsOf()`)
 *   frontTypeOf   (unit) => front style
 *   design        the project design (the shaker frame, the finishes)
 *   profile
 *   date          already formatted; the engine owns no clock
 *   sectionUnitId a cabinet the owner pointed at for one more section, or null
 *   renderImage   a data URL of the scene's render for the visualisation, or null
 * @returns {Array<{no:string, name:string, wall:number|null, variant:string, sheet:object}>}
 */
export function wallDrawingSheets({
  entries = [], project = {}, room = null, worktops = [], frontTypeOf = null, profile,
  date = '', design = null, sectionUnitId = null, renderImage = null,
}) {
  const groups = wallGroups(entries, profile);
  // No cabinet against a wall: no set. The window and the menu read an empty
  // list as "nothing to draw yet" (T42 F0), and a cover of nothing is not a set.
  if (!groups.length) return [];
  const shakerFrame = shakerFrameMm(design ?? project?.design ?? null, profile);
  const theRoom = room || project?.room || null;
  // The worktops: the store's own resolution when the caller passes it, else
  // resolved here from the design's records and the entries' units, so a
  // caller that never knew about worktops still gets them on the sheets.
  const records = (design ?? project?.design)?.worktops;
  const resolved = (worktops && worktops.length) ? worktops
    : (Array.isArray(records) && records.length ? worktopsFor({ records, units: entries.map((e) => e?.unit).filter(Boolean), profile }) : []);
  const slabs = resolved.map((w) => w.geometry || w);
  const plan = [];
  const push = (name, variant, wall, make) => plan.push({ name, variant, wall, make });

  // ── the order ──
  push('Cover, index and revisions', 'cover', null, null);
  if (entries.length && theRoom) {
    push('Plan · base units', 'plan-base', null, (no) => layoutSetSheet({
      profile,
      drawing: { measure: () => measurePlan({ room: theRoom, profile }), build: (ctx) => buildPlan(entries, { which: 'base', room: theRoom, worktops: slabs, profile, ctx, frontTypeOf, shakerFrame }) },
      caption: { title: `${no} · PLAN · BASE UNITS`, sub: `Horizontal section at ${profile.drawings.set.planCut.base} above FFL, looking down. Wall units not shown.` },
      column: { room: theRoom, highlight: null, arrow: false, notes: SET_NOTES },
      title: titleFor({ project, profile, no, name: 'Plan · base units', date }),
    }));
    push('Plan · wall units', 'plan-wall', null, (no) => layoutSetSheet({
      profile,
      drawing: { measure: () => measurePlan({ room: theRoom, profile }), build: (ctx) => buildPlan(entries, { which: 'wall', room: theRoom, worktops: slabs, profile, ctx, frontTypeOf, shakerFrame }) },
      caption: { title: `${no} · PLAN · WALL UNITS`, sub: `Horizontal section at ${profile.drawings.set.planCut.wall} above FFL, looking down. The worktop is seen below the cut.` },
      column: { room: theRoom, highlight: null, arrow: false, notes: SET_NOTES },
      title: titleFor({ project, profile, no, name: 'Plan · wall units', date }),
    }));
  }
  for (const group of groups) {
    const onWall = worktopsOnWall(slabs, group.wall);
    const label = `Wall ${group.label}`;
    push(`${label} · Front view`, 'fronts', group.wall, (no) => layoutSetSheet({
      profile,
      drawing: {
        measure: () => measureRun(group, { room: theRoom, worktops: onWall, profile }),
        build: (ctx) => buildRunElevation(group, { withFronts: true, room: theRoom, worktops: onWall, frontTypeOf, shakerFrame, profile, ctx }),
      },
      caption: { title: `${no} · ${label.toUpperCase()} · FRONT VIEW`, sub: 'Fronts on, looking at the wall from the room. Panel sizes: see the cut list.' },
      column: { room: theRoom, highlight: group.wall, arrow: true, notes: SET_NOTES },
      title: titleFor({ project, profile, no, name: `${label} · Front view`, date }),
    }));
    push(`${label} · Internal layout`, 'carcass', group.wall, (no) => layoutSetSheet({
      profile,
      drawing: {
        measure: () => measureRun(group, { room: theRoom, worktops: onWall, profile }),
        build: (ctx) => buildRunElevation(group, { withFronts: false, room: theRoom, worktops: onWall, frontTypeOf, shakerFrame, profile, ctx }),
      },
      caption: { title: `${no} · ${label.toUpperCase()} · INTERNAL LAYOUT`, sub: 'Fronts removed: carcasses, shelves, drawer boxes, hinge plates, legs and appliance spaces.' },
      column: { room: theRoom, highlight: group.wall, arrow: true, notes: SET_NOTES },
      title: titleFor({ project, profile, no, name: `${label} · Internal layout`, date }),
    }));
    const stations = sectionStations(group, { chosenId: sectionUnitId });
    if (stations.length) {
      const letters = stations.map((s) => `${s.letter}-${s.letter}`).join(' and ');
      push(`${label} · Sections ${letters}`, 'sections', group.wall, (no) => layoutSetSheet({
        profile,
        drawing: stationSet(group, stations, { room: theRoom, worktops: onWall, profile }),
        caption: { title: `${no} · ${label.toUpperCase()} · SECTIONS ${letters.toUpperCase()}`, sub: 'Vertical sections marked on the plans. One cut shows plinth, base unit, worktop, wall unit, wall and ceiling together.' },
        column: { room: theRoom, highlight: group.wall, arrow: false, notes: SET_NOTES },
        title: titleFor({ project, profile, no, name: `${label} · Sections ${letters}`, date }),
      }));
    }
  }
  for (const group of groups) {
    const onWall = worktopsOnWall(slabs, group.wall);
    const label = `Wall ${group.label}`;
    push(`${label} · Perspective view`, 'perspective', group.wall, (no) => layoutSetSheet({
      profile,
      drawing: { nts: true, build: (ctx) => buildPerspective(group, { room: theRoom, worktops: onWall, profile, ctx }) },
      caption: { title: `${no} · ${label.toUpperCase()} · PERSPECTIVE VIEW`, sub: `Line perspective from the room, eye height ${profile.drawings.set.perspective.eyeHeight}. Not to scale; for orientation only.` },
      column: { room: theRoom, highlight: group.wall, arrow: true, legend: false, notes: ['Unit numbers as on the elevations.', 'Drawn from the same model as every other sheet; it cannot disagree with them.'] },
      title: { ...titleFor({ project, profile, no, name: `${label} · Perspective view`, date }), scale: 'NTS' },
    }));
  }
  if (entries.length) {
    push('Visualisation', 'visual', null, (no) => layoutSetSheet({
      profile,
      drawing: { paper: true, build: (zones) => buildVisual(zones, { image: renderImage, finishes: finishesOf(design ?? project?.design), note: 'Colours are screen approximations; confirm against physical samples.' }) },
      caption: { title: `${no} · VISUALISATION`, sub: 'Rendered from the 3D scene with the fixed export lighting rig, the same rig on every sheet, so two decors compare.' },
      column: { room: theRoom, highlight: null, arrow: false, legend: false, notes: ['Worktop, sink, taps and appliances are indicative, supplied by others.'] },
      title: { ...titleFor({ project, profile, no, name: 'Visualisation', date }), scale: 'NTS' },
    }));
    // As many cut-list sheets as the job's units need; the totals on the last.
    const pages = cutListPages(setZones(profile, { column: false, caption: true }), entries);
    pages.forEach((page, i) => {
      const name = pages.length > 1 ? `Cut list and materials ${i + 1} of ${pages.length}` : 'Cut list and materials';
      push(name, 'cutlist', null, (no) => layoutSetSheet({
        profile,
        drawing: { paper: true, build: (zones) => buildCutList(zones, { entries, page, showTotals: i === pages.length - 1 }) },
        caption: { title: `${no} · ${name.toUpperCase()}`, sub: 'Every panel per unit from the engine, the same numbers the CNC sheets and the BOM carry. Fronts in magenta.' },
        column: false,
        title: { ...titleFor({ project, profile, no, name, date }), scale: 'n/a' },
      }));
    });
  }

  // ── number and build, the cover last because it lists the others ──
  const of = String(plan.length).padStart(2, '0');
  const out = plan.map((p, i) => ({ no: String(i).padStart(2, '0'), name: p.name, variant: p.variant, wall: p.wall, make: p.make }));
  for (const s of out) {
    if (!s.make) continue;
    s.sheet = s.make(s.no);
    delete s.make;
    stamp(s.sheet, s.no, of);
  }
  const cover = out[0];
  if (cover && cover.make === null) {
    const index = out.map((s) => ({ no: s.no, name: s.name, scale: s.sheet ? s.sheet.scaleLabel : 'n/a' }));
    const t = titleFor({ project, profile, no: '00', name: 'Cover, index and revisions', date });
    // The cover's picture is the first wall's perspective, built once more
    // and fitted into the cover's frame; a job with no run has no picture.
    const first = groups[0];
    const picture = first
      ? (box) => fitEntities(buildPerspective(first, { room: theRoom, worktops: worktopsOnWall(slabs, first.wall), profile, ctx: drawingContext(1, profile) }).entities, box)
      : null;
    cover.sheet = layoutSetSheet({
      profile,
      drawing: { paper: true, build: (zones) => buildCover(zones, { project, title: { ...t, kicker: project.titleBlock?.kicker || 'Fitted furniture' }, sheets: index, revisions: project.titleBlock?.revisions || [], picture }) },
      caption: { title: '00 · COVER, INDEX AND REVISIONS', sub: '' },
      column: false,
      title: { ...t, scale: 'n/a' },
    });
    delete cover.make;
    stamp(cover.sheet, '00', of);
  }
  return out;
}

/**
 * The shape (width / height) of the visualisation sheet's picture, so the
 * scene captures a render that fills the frame without cropping.
 */
export function visualAspect(profile) {
  const pic = visualPictureBox(setZones(profile, { column: true, caption: true }));
  return pic.w / pic.h;
}

/** Write the sheet's own number into its title strip. */
function stamp(sheet, no, of) {
  for (const e of sheet.entities) {
    if (e.kind === 'text' && e.text === ' / ' && e.layer === 'FRAME') e.text = `${no} / ${of}`;
  }
  sheet.sheetNo = no;
  sheet.sheetOf = of;
}

/**
 * ─── TURN 42 (CLAUDE.md F0): THE SET STOPS LYING BY SILENCE ─────────────────
 *
 * *"make the footer name WHY per wall — `wallGroups` already returns `skipped`
 * with the reason in hand (turned away / no result) — so the screen stops lying
 * by silence."*
 *
 * `wallGroups` cannot answer it on its own, and that is the whole finding:
 * a wall whose EVERY cabinet is turned away has no members, so the loop drops
 * the wall — `skipped` and all — and the set that comes back has no record
 * that the wall was ever considered. A joiner looking at a sheet list with no
 * `Wall B` on it is told nothing about why.
 *
 * So the census is taken here, over the ENTRIES, and it is a pure reader: it
 * builds nothing, changes nothing, and `wallDrawingSheets` above is byte for
 * byte the function it was before this turn. What it produces is the sentence
 * the modal prints under the sheet list.
 *
 * @returns {{units:number, drawn:number, walls:Array<{wall:number, label:string,
 *            drawn:number, skipped:Array<{unit:string, reason:string}>}>}}
 */
export function wallSetReport({ entries = [], profile } = {}) {
  const walls = new Map();
  const row = (wall) => {
    if (!walls.has(wall)) walls.set(wall, { wall, label: wallLabel(wall), drawn: 0, skipped: [] });
    return walls.get(wall);
  };
  const nameOf = (e, i) => String(e?.unit?.params?.unit_num ?? e?.result?.unitNum ?? `unit ${i + 1}`);

  let drawn = 0;
  entries.forEach((e, i) => {
    if (!e?.unit) return;
    const at = row(Math.max(0, Math.trunc(Number(e.unit.position?.wall ?? 0))));
    // The two reasons `wallGroups` has, said in words rather than dropped. A
    // unit with no result is a unit the engine could not answer for; a turned
    // one cannot be drawn on an elevation of the wall it stands against.
    if (!e.result) { at.skipped.push({ unit: nameOf(e, i), reason: 'has nothing to draw yet' }); return; }
    if (turnedAway(e.unit)) {
      at.skipped.push({ unit: nameOf(e, i), reason: 'is turned away from the wall — see the horizontal section' });
      return;
    }
    at.drawn += 1;
    drawn += 1;
  });

  // Asked, so the census and the sheet list cannot drift: every wall that got
  // an elevation is a wall this reader counted a drawn member on.
  const grouped = new Set(wallGroups(entries, profile).map((g) => g.wall));
  for (const at of walls.values()) at.elevation = grouped.has(at.wall);

  return {
    units: entries.length,
    drawn,
    walls: [...walls.values()].sort((a, b) => a.wall - b.wall),
  };
}

/**
 * THE CABINETS THE `Section A-A` DROPDOWN MAY OFFER, for the window (T43-F5b).
 *
 * Re-exported from here rather than reached for in the modal, so the list on
 * screen and the sheet the set builds are the same census asked twice.
 */
export function wallSectionUnits({ entries = [], profile } = {}) {
  return sectionableUnits(wallGroups(entries, profile))
    .map(({ id, unitNum, wallLabel }) => ({ id, unitNum, wallLabel }))
    // By the number the workshop calls the cabinet, because that is what the
    // person choosing is reading off the screen.
    .sort((a, b) => String(a.unitNum).localeCompare(String(b.unitNum), undefined, { numeric: true })
      || String(a.id).localeCompare(String(b.id)));
}

/** Just the sheets, for a caller that only wants to bind them. */
export function wallDrawingPages(args) {
  return wallDrawingSheets(args).map((s) => s.sheet);
}
