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

import {
  buildHorizontalSection, buildWallElevation, turnedAway, wallGroups, wallLabel,
} from './wallElevation.js';
import { layoutSheet } from './sheet.js';
// ─── TURN 43 (CLAUDE.md F5): THE VERTICAL SECTIONS. BOTH. ───────────────────
// The owner: *"Nie widzę przekroju w pionie ani w poziomie."* The horizontal
// one exists (the set's last sheet). The vertical one did not exist anywhere
// under `src/engine/drawings/` — never written, not regressed — and he has
// asked for BOTH twice: a section per wall, AND an A-A through a cabinet he
// points at.
import { buildUnitSection, buildWallSection, sectionableUnits } from './section.js';
// ─── TURN 43 (CLAUDE.md F2): THE PROJECT'S OWN MILLIMETRES ──────────────────
// The owner: *"shaker prawdziwy — ile mam mm, tyle powinno być pokazane."*
// MEASURED on the real engine before a line was written: project frame 80 mm →
// DRAWN 60 mm, because `frontDetail` was called with no frame and `design`
// never reached this module at all, so `shakerFrameMm(null, profile)` answered
// with the profile default every single time. The function already knew how to
// read the project's number; nobody handed it the project.
import { shakerFrameMm } from '../shaker.js';

/**
 * The title block his set carries: Client Name, Client Address, Project,
 * Drawing name, Date, Job No, Scale, Rev.
 *
 * SCALE READS "No Scale". CLAUDE.md is explicit — *"he does not print to a
 * scale, he trusts the dimensions. Do not invent a scale label."* The sheet is
 * still LAID OUT at a ratio, because a drawing has to fit the paper; what the
 * title block says is what he says. `layoutSheet` spreads `title.extra` over
 * its own values last, which is what lets this override the computed one
 * without the sheet module knowing anything about wall drawings.
 */
function titleFor({ project = {}, drawing, profile }) {
  return {
    project: project.name || 'Untitled project',
    view: drawing,
    date: project.date || '',
    extra: {
      Client: project.client || '',
      Address: project.address || '',
      Drawing: drawing,
      'Job No': project.number ?? project.project_number ?? '',
      Rev: project.rev || '-',
      Scale: profile.drawings.wallDrawing.scaleLabel,
    },
  };
}

/**
 * Every sheet of the wall set, in the order they are bound.
 *
 * @param {object} args
 *   entries  [{ unit, result }] — the store's `allResults()` shape
 *   project  { name, client, address, number, rev, room }
 *   room     the project's room (the ceiling line and the plan's own walls)
 *   frontTypeOf  (unit) => front style; the design layer's answer, passed in
 *   design   the project design — T43-F2, the one thing that carries the
 *            shaker frame width the job was quoted and cut at. Falls back to
 *            `project.design`, so a caller that already hands the whole
 *            project over needs no second argument.
 *   profile
 *   format   'auto' | 'A4' | 'A3'
 *   date     already formatted by the caller — the engine owns no clock
 *   sectionUnitId  T43-F5b: the cabinet `Section A-A` is taken through, or
 *            null for none. An ARGUMENT and not a stored setting — a drawing
 *            option, not a design decision.
 * @returns {Array<{sheet:object, name:string, wall:(number|null), variant:string}>}
 *          A WALL WITH NO CABINETS PRODUCES NO SHEET: `wallGroups` never
 *          returns it, so there is nothing here to guard against.
 */
export function wallDrawingSheets({
  entries = [], project = {}, room = null, frontTypeOf = null, profile,
  format = 'auto', date = '', design = null, sectionUnitId = null,
}) {
  const groups = wallGroups(entries, profile);
  // ONE resolution for the whole set, threaded down: sheet → elevation →
  // `frontDetail`. `shakerFits` still decides PER FRONT whether the frame goes
  // on — a 100 mm drawer front that cannot carry an 85 mm frame stays plain,
  // exactly as the saw would leave it — but the NUMBER is asked once.
  const shakerFrame = shakerFrameMm(design ?? project?.design ?? null, profile);
  const rows = profile.drawings.wallDrawing.titleRows;
  const blockWidth = profile.drawings.wallDrawing.titleWidth;
  // T41-F5d: these sheets print "No Scale" in their own title block, so they
  // fill the paper instead of snapping to the ladder. Measured on T40's own
  // proof wall: 30.1 % of the usable area used, at a snapped 1:20, when the
  // exact fit was 1:14.46.
  const lay = (drawing, name) => layoutSheet({
    drawing: { ...drawing, fit: true },
    format: format === 'auto' ? 'A3' : format,
    profile,
    titleRows: rows,
    blockWidth,
    title: titleFor({ project: { ...project, date }, drawing: name, profile }),
  });

  const out = [];
  for (const group of groups) {
    // /1 — WITH FRONTS. /2 — the carcass, without them. His own split, and the
    // same one the Unit Card already makes per cabinet.
    const one = `Wall ${group.label} /1`;
    const two = `Wall ${group.label} /2`;
    out.push({
      name: one,
      wall: group.wall,
      variant: 'fronts',
      sheet: lay(buildWallElevation(group, {
        withFronts: true, room, frontTypeOf, profile, shakerFrame,
      }), one),
    });
    out.push({
      name: two,
      wall: group.wall,
      variant: 'carcass',
      sheet: lay(buildWallElevation(group, {
        withFronts: false, room, frontTypeOf, profile, shakerFrame,
      }), two),
    });
    // /3 — THE WALL'S OWN SECTION (T43-F5a), bound after /2. It is drawn only
    // where there is a floor-band member to cut through, for exactly the
    // reason an empty wall gets no elevation.
    const cut = buildWallSection(group, { room, profile });
    if (cut) {
      const three = `Wall ${group.label} /3`;
      out.push({
        name: three, wall: group.wall, variant: 'section-v', sheet: lay(cut, three),
      });
    }
  }

  // ONE horizontal section for the whole project — the sheet that says how the
  // walls stand to each other, with the cabinet numbers on it. It is drawn only
  // when there is something to draw, for the same reason an empty wall gets no
  // elevation.
  if (groups.length || entries.length) {
    const name = 'Horizontal section';
    out.push({
      name,
      wall: null,
      variant: 'section',
      sheet: lay(buildHorizontalSection(entries, { room, profile }), name),
    });
  }

  // ─── SECTION A-A (T43-F5b), when the owner has pointed at a cabinet ──────
  //
  // It is an ARGUMENT and it is NOT stored in the project this turn: it is a
  // drawing option, not a design decision. If he wants it remembered, that is a
  // sentence in a future turn. Appended to the SET rather than rendered in the
  // window, so the PDF, the DXF and the preview all carry it — one source, as
  // ever.
  if (sectionUnitId != null) {
    const chosen = sectionableUnits(groups).find((u) => u.id === sectionUnitId);
    const aa = chosen ? buildUnitSection(chosen.member, { room, profile }) : null;
    if (aa) {
      const name = `Section A-A — unit ${aa.unitNum}`;
      out.push({
        name, wall: chosen.wall, variant: 'section-aa', unitId: chosen.id, sheet: lay(aa, name),
      });
    }
  }
  return out;
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
