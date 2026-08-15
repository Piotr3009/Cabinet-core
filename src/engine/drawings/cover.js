// ─── The booklet cover (turn 7, CLAUDE.md F1) ───
//
// "All units (PDF)" is a page per cabinet. A stack of pages is not a document —
// what makes it one is a first page that says whose job it is and what is in
// it, so the man who picks it up off the bench knows what he is holding before
// he reads a single dimension.
//
// It is built as a SHEET, not as a drawing: everything here is already in paper
// millimetres, because a cover has no scale — there is nothing on it to
// measure. That is why it does not go through `layoutSheet`: it has no
// geometry to fit and no scale to choose, and pretending otherwise would put
// "1:5" in a title block over a list of names.
//
// Pure functions — no React, no store imports, no jsPDF.

import { pageFormat } from './sheet.js';

/**
 * @param {object} args
 *   project   { name, number, client }
 *   units     [{ unitNum, type, width, height, depth }] — already formatted
 *   format    'A4' | 'A3'
 *   date
 *   profile
 * @returns {{entities:Array, width:number, height:number, scale:null, format:object}}
 */
export function buildCoverSheet({
  project = {}, units = [], format = 'A4', orientation = 'landscape', date = '', profile,
}) {
  const D = profile.drawings;
  const B = D.booklet;
  const page = pageFormat(format, orientation);
  const m = D.margin;
  const frame = { x: m, y: m, w: page.width - m * 2, h: page.height - m * 2 };
  const pad = D.padding * 2;
  const entities = [{ kind: 'rect', layer: 'FRAME', x: frame.x, y: frame.y, w: frame.w, h: frame.h }];

  const left = frame.x + pad;
  let y = frame.y + frame.h - pad;

  const put = (text, height, layer = 'FRAME', align = 'left', x = left) => {
    y -= height;
    entities.push({ kind: 'text', layer, x, y: y + height / 2, text, height, align });
  };

  put('CABINET CORE', B.titleHeight, 'FRAME');
  y -= B.rowHeight * 0.4;
  entities.push({ kind: 'line', layer: 'FRAME', x1: left, y1: y, x2: frame.x + frame.w - pad, y2: y });
  y -= B.rowHeight * 0.6;

  put(project.name || 'Untitled project', B.headingHeight);
  const meta = [
    project.number ? `Project ${project.number}` : null,
    project.client ? `Client: ${project.client}` : null,
    date ? `Date: ${date}` : null,
    `${units.length} unit${units.length === 1 ? '' : 's'}`,
  ].filter(Boolean);
  put(meta.join('   ·   '), B.textHeight, 'FRAME_LIGHT');

  y -= B.rowHeight;

  // ── the list ──
  // Two columns once one will not hold it. A cover that runs onto a second page
  // is not a cover.
  const columns = units.length > B.rowsPerColumn ? 2 : 1;
  const columnWidth = (frame.w - pad * 2) / columns;
  const listTop = y;
  const perColumn = Math.ceil(units.length / columns) || 1;

  units.forEach((u, i) => {
    const column = Math.floor(i / perColumn);
    const row = i % perColumn;
    const x = left + column * columnWidth;
    const rowY = listTop - row * B.rowHeight - B.rowHeight / 2;
    entities.push({
      kind: 'text', layer: 'UNIT_NUMBER', x, y: rowY, text: String(u.unitNum ?? ''),
      height: B.textHeight, align: 'left',
    });
    entities.push({
      kind: 'text', layer: 'FRAME', x: x + 16, y: rowY, text: String(u.type ?? ''),
      height: B.textHeight, align: 'left',
    });
    entities.push({
      kind: 'text', layer: 'FRAME_LIGHT', x: x + 58, y: rowY, text: String(u.size ?? ''),
      height: B.textHeight, align: 'left',
    });
  });

  const listBottom = listTop - perColumn * B.rowHeight;
  entities.push({
    kind: 'text', layer: 'FRAME_LIGHT', x: left, y: Math.max(frame.y + pad, listBottom - B.rowHeight),
    text: 'One page per unit follows — front, carcass and plan, with the dimensions the bench measures.',
    height: B.textHeight, align: 'left',
  });

  return { entities, width: page.width, height: page.height, scale: null, format: page, cover: true };
}

