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

import { buildHorizontalSection, buildWallElevation, wallGroups } from './wallElevation.js';
import { layoutSheet } from './sheet.js';

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
 *   profile
 *   format   'auto' | 'A4' | 'A3'
 *   date     already formatted by the caller — the engine owns no clock
 * @returns {Array<{sheet:object, name:string, wall:(number|null), variant:string}>}
 *          A WALL WITH NO CABINETS PRODUCES NO SHEET: `wallGroups` never
 *          returns it, so there is nothing here to guard against.
 */
export function wallDrawingSheets({
  entries = [], project = {}, room = null, frontTypeOf = null, profile,
  format = 'auto', date = '',
}) {
  const groups = wallGroups(entries, profile);
  const rows = profile.drawings.wallDrawing.titleRows;
  const blockWidth = profile.drawings.wallDrawing.titleWidth;
  const lay = (drawing, name) => layoutSheet({
    drawing,
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
        withFronts: true, room, frontTypeOf, profile,
      }), one),
    });
    out.push({
      name: two,
      wall: group.wall,
      variant: 'carcass',
      sheet: lay(buildWallElevation(group, {
        withFronts: false, room, frontTypeOf, profile,
      }), two),
    });
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
  return out;
}

/** Just the sheets, for a caller that only wants to bind them. */
export function wallDrawingPages(args) {
  return wallDrawingSheets(args).map((s) => s.sheet);
}
