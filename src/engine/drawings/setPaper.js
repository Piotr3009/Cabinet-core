// ─── T71 · THE PAPER SHEETS: COVER, CUT LIST, VISUALISATION ─────────────────
//
// Three sheets of the set carry no scaled drawing: the cover (what this job
// is, which sheets it has, which revision), the cut list (every panel the
// engine published, per unit, with the totals the estimate is priced on) and
// the visualisation (the render, with the finishes beside it). They are laid
// in PAPER millimetres straight into the drawing box `setSheet.js` hands
// them, Y up.
//
// Pure functions: no React, no store imports.

import { entLine as line, entRect as rect, entText as text } from './primitives.js';
import { formatMm } from '../format.js';
import { SET_LEGEND, SET_NOTES, wrapWords } from './setSheet.js';

const muted = (x, y, s, h = 2, align = 'left', extra = {}) => ({ ...text('SHEET_MUTED', x, y, s, h, align), ...extra });
const ink = (x, y, s, h = 2.4, align = 'left', extra = {}) => ({ ...text('FRAME', x, y, s, h, align), ...extra });

/**
 * THE COVER: title, the job in one line, the sheet index, the revisions, the
 * conventions and the general notes. The picture is handed in by the set as
 * a builder `(box) => entities` in paper mm (the first wall's perspective,
 * fitted), as ready entities, or left empty.
 */
export function buildCover(zones, {
  project = {}, title = {}, sheets = [], revisions = [], picture = null, notes = SET_NOTES,
}) {
  const b = zones.box;
  const top = b.y + b.h;
  const left = b.x + 6;
  const right = b.x + b.w - 6;
  const out = [];
  const name = String(project.name || 'Untitled project');
  out.push(muted(left, top - 30, String(title.kicker || '').toUpperCase(), 4, 'left', { tracking: 0.6 }));
  out.push(ink(left, top - 42, name, 12, 'left', { weight: 'bold' }));
  const meta = [
    title.client ? `Client ${title.client}` : null,
    title.job ? `Job ${title.job}` : null,
    title.rev ? `Rev ${title.rev}` : null,
    title.date ? `Issued ${title.date}` : null,
    title.statusName ? `Status ${title.status}, ${title.statusName}` : null,
  ].filter(Boolean).join(' · ');
  out.push(muted(left, top - 52, meta, 3));
  out.push({ ...line('FRAME', left, top - 58, right, top - 58), pen: 'VISIBLE' });

  // The picture, in the left two thirds: the set hands in a builder that
  // lays the perspective into this box (`fitEntities`), or nothing.
  const pic = { x: left, y: b.y + 60, w: Math.min(200, b.w * 0.5), h: 118 };
  const drawn = typeof picture === 'function' ? (picture(pic) || []) : (Array.isArray(picture) ? picture : []);
  if (drawn.length) {
    out.push(...drawn);
  } else {
    out.push({ ...rect('SHEET_MUTED', pic.x, pic.y, pic.w, pic.h), pen: 'FINE', hidden: true });
    out.push(muted(pic.x + pic.w / 2, pic.y + pic.h / 2, 'perspective, sheet 06', 2.4, 'centre'));
  }
  out.push(muted(left, pic.y - 4, 'Perspective as on its own sheet. The visualisation sheet carries the render.', 2));

  // The index, on the right.
  const ix = left + 212;
  const iw = right - ix;
  let y = top - 66;
  out.push(muted(ix, y, 'SHEET INDEX', 2.4, 'left', { tracking: 0.4 }));
  y -= 3;
  out.push({ ...line('FRAME', ix, y, ix + iw, y), pen: 'THIN' });
  const cols = [ix, ix + 12, ix + iw - 56, ix + iw - 22];
  y -= 4;
  ['No', 'Drawing', 'Scale', 'Rev'].forEach((h, i) => out.push(muted(cols[i], y, h, 2)));
  for (const s of sheets) {
    y -= 5.2;
    out.push(ink(cols[0], y, s.no, 2.4, 'left', { weight: 'bold' }));
    out.push(ink(cols[1], y, s.name, 2.4));
    out.push(muted(cols[2], y, s.scale || '', 2.2));
    out.push(muted(cols[3], y, s.rev || title.rev || '', 2.2));
    out.push({ ...line('SHEET_MUTED', ix, y - 2.6, ix + iw, y - 2.6), pen: 'FINE' });
  }
  y -= 10;
  out.push(muted(ix, y, 'REVISIONS', 2.4, 'left', { tracking: 0.4 }));
  y -= 3;
  out.push({ ...line('FRAME', ix, y, ix + iw, y), pen: 'THIN' });
  const rc = [ix, ix + 12, ix + 36, ix + iw - 22];
  y -= 4;
  ['Rev', 'Date', 'Description', 'By'].forEach((h, i) => out.push(muted(rc[i], y, h, 2)));
  const revs = revisions.length ? revisions : [{ rev: title.rev || 'A', date: title.date || '', description: 'First issue', by: title.drawn || '' }];
  for (const r of revs) {
    y -= 5.2;
    out.push(ink(rc[0], y, String(r.rev || ''), 2.3, 'left', { weight: 'bold' }));
    out.push(ink(rc[1], y, String(r.date || ''), 2.3));
    out.push(ink(rc[2], y, String(r.description || ''), 2.3));
    out.push(ink(rc[3], y, String(r.by || ''), 2.3));
    out.push({ ...line('SHEET_MUTED', ix, y - 2.6, ix + iw, y - 2.6), pen: 'FINE' });
  }

  // Conventions and notes along the bottom.
  const cy = b.y + 46;
  out.push(muted(left, cy, 'DRAWING CONVENTIONS', 2.4, 'left', { tracking: 0.4 }));
  SET_LEGEND.forEach(([kind, layer, label], i) => {
    const yy = cy - 6 - i * 4.2;
    if (kind === 'line') out.push({ ...line(layer, left, yy, left + 8, yy), pen: 'VISIBLE' });
    if (kind === 'dash') out.push({ ...line(layer, left, yy, left + 8, yy), pen: 'HIDDEN', hidden: true });
    if (kind === 'text') out.push({ ...text(layer, left + 4, yy, '01', 2.4), weight: 'bold' });
    if (kind === 'box') out.push({ ...rect(layer, left, yy - 1.5, 8, 3), pen: 'THIN' });
    out.push(ink(left + 10.5, yy, label, 2));
  });
  const nx = left + 96;
  out.push(muted(nx, cy, 'GENERAL NOTES', 2.4, 'left', { tracking: 0.4 }));
  let ny = cy - 6;
  notes.forEach((n, i) => { out.push(ink(nx, ny, `${i + 1}. ${n}`, 2)); ny -= 3.6; });
  return out;
}

/** One unit's rows for the cut list: the carcass panels, then the fronts. */
export function cutRows(result) {
  const carcass = []; const fronts = [];
  for (const p of result.panels || []) {
    const row = { id: p.id, part: p.part, qty: Number(p.qty) || 1, w: p.w, h: p.h, t: p.thickness, edging: p.edging?.len_m || 0, area: p.area_m2 || 0 };
    if (p.material_role === 'front') fronts.push(row); else carcass.push(row);
  }
  return { carcass, fronts };
}

/** The block a unit takes on the cut list: its rows and its paper height. */
function cutBlock(e, rowH) {
  const rows = cutRows(e.result);
  return {
    num: String(e.unit.params?.unit_num ?? e.result.unitNum ?? ''),
    type: `${e.unit.type} ${formatMm(e.unit.params?.width)}`,
    rows,
    totals: e.result.totals || {},
    h: 12 + (rows.carcass.length + rows.fronts.length) * rowH + 9,
  };
}

const CUT_ROW = 3.0;
const CUT_COLS = 4;

/**
 * HOW THE CUT LIST PAGINATES: blocks flow down four columns, a block that does
 * not fit the column starts the next, and a block that does not fit the last
 * column starts the next sheet. The totals take the bottom of the last sheet.
 * Exposed so the set can bind as many cut-list sheets as the job needs.
 */
export function cutListPages(zones, entries) {
  const b = zones.box;
  const top = b.y + b.h - 22;
  const floor = b.y + 6;
  const totalsH = 22;
  const pages = [];
  let page = []; let col = 0; let y = top;
  const list = entries.filter((e) => e?.unit && e?.result);
  list.forEach((e, i) => {
    const block = cutBlock(e, CUT_ROW);
    const last = i === list.length - 1;
    const limit = floor + (last ? totalsH : 0);
    if (y - block.h < limit) {
      col += 1; y = top;
      if (col >= CUT_COLS) { pages.push(page); page = []; col = 0; }
    }
    page.push({ ...block, col, y });
    y -= block.h + 2;
  });
  if (page.length || !pages.length) pages.push(page);
  return pages;
}

/**
 * THE CUT LIST, one sheet: a block per unit, every panel with its size, the
 * fronts in magenta, and on the last sheet the totals the whole job adds up
 * to. Nothing here is typed: `result.panels` and `result.totals` are the
 * engine's, the same numbers the CNC sheet and the BOM carry.
 */
export function buildCutList(zones, { entries = [], page = null, showTotals = true }) {
  const b = zones.box;
  const left = b.x + 6;
  const out = [];
  const colW = (b.w - 12) / CUT_COLS;
  const blocks = page || cutListPages(zones, entries)[0] || [];
  for (const bl of blocks) {
    const x = left + bl.col * colW;
    const w = colW - 4;
    const y = bl.y;
    const h = bl.h;
    out.push({ ...rect('SHEET_MUTED', x, y - h + 3, w, h - 3), pen: 'FINE' });
    out.push({ ...rect('SHEET_MUTED', x, y - 3, w, 6), fill: '#f2f2f2', noStroke: true });
    out.push({ ...text('UNIT_NUMBER', x + 2, y, `UNIT ${bl.num}`, 2.6, 'left'), weight: 'bold' });
    out.push(ink(x + 20, y, bl.type, 2.1));
    let yy = y - 8;
    const put = (r, layer) => {
      out.push({ ...text(layer, x + 2, yy, r.id, 2.0, 'left') });
      out.push({ ...text('SHEET_MUTED', x + 34, yy, `${r.qty} x`, 2.0, 'right') });
      out.push({ ...text(layer, x + 37, yy, `${formatMm(r.w)} x ${formatMm(r.h)}`, 2.0, 'left') });
      out.push({ ...text('SHEET_MUTED', x + w - 2, yy, `t${formatMm(r.t)}`, 1.7, 'right') });
      yy -= CUT_ROW;
    };
    bl.rows.carcass.forEach((r) => put(r, 'FRAME'));
    bl.rows.fronts.forEach((r) => put(r, 'DOORS'));
    const t = bl.totals;
    out.push({ ...line('SHEET_MUTED', x, y - h + 9, x + w, y - h + 9), pen: 'FINE' });
    const n = t.panels_true_incl_railpart ?? bl.rows.carcass.length;
    out.push(muted(x + 2, y - h + 6, `${n} carcass panel${n === 1 ? '' : 's'} · ${(t.board_area_m2 || 0).toFixed(2)} m² · edging ${(t.edging_m || 0).toFixed(2)} m · fronts ${(t.front_area_m2 || 0).toFixed(2)} m²`, 1.9));
  }
  if (showTotals) {
    const sum = (k) => entries.reduce((a, e) => a + (Number(e?.result?.totals?.[k]) || 0), 0);
    const ty = b.y + 6;
    out.push({ ...rect('FRAME', left, ty, b.w - 12, 16), pen: 'VISIBLE' });
    out.push({ ...rect('SHEET_MUTED', left, ty + 10, b.w - 12, 6), fill: '#f2f2f2', noStroke: true });
    out.push(ink(left + 2, ty + 13, `TOTALS · ${entries.length} units`, 2.6, 'left', { weight: 'bold' }));
    const items = [
      ['Carcass board', `${sum('board_area_m2').toFixed(2)} m²`],
      ['Fronts', `${sum('front_area_m2').toFixed(2)} m²`],
      ['Edging', `${sum('edging_total_m').toFixed(1)} m`],
      ['Hinges', `${sum('hinges')}`],
      ['Legs', `${sum('legs')}`],
      ['Runner pairs', `${sum('runner_pairs')}`],
    ];
    items.forEach(([k, v], i) => {
      const x = left + 4 + i * ((b.w - 20) / items.length);
      out.push(muted(x, ty + 5.5, k, 2));
      out.push(ink(x + 26, ty + 5.5, v, 2.6, 'left', { weight: 'bold' }));
    });
  }
  return out;
}

/**
 * THE VISUALISATION: the render in a frame, the finishes beside it. `image`
 * is a data URL from the scene (the fixed export rig); without one the frame
 * says what it is waiting for, and the sheet still binds.
 */
/** The frame the render fills on the visualisation sheet, in paper mm. */
export function visualPictureBox(zones) {
  const b = zones.box;
  return { x: b.x + 6, y: b.y + 8, w: b.w - 6 - 70, h: b.h - zones.captionHeight - 12 };
}

export function buildVisual(zones, { image = null, finishes = [], note = '' }) {
  const b = zones.box;
  const out = [];
  const pic = visualPictureBox(zones);
  out.push({ ...rect('FRAME', pic.x, pic.y, pic.w, pic.h), pen: 'VISIBLE' });
  if (image) {
    out.push({ kind: 'image', layer: 'FRAME', x: pic.x + 0.5, y: pic.y + 0.5, w: pic.w - 1, h: pic.h - 1, href: image });
  } else {
    out.push(muted(pic.x + pic.w / 2, pic.y + pic.h / 2 + 3, 'RENDER', 4, 'centre', { tracking: 0.5 }));
    out.push(muted(pic.x + pic.w / 2, pic.y + pic.h / 2 - 3, 'Captured from the 3D scene with the fixed export rig when the set is exported from the app.', 2.2, 'centre'));
  }
  const fx = pic.x + pic.w + 6;
  let fy = pic.y + pic.h - 4;
  out.push(muted(fx, fy, 'FINISHES', 2.2, 'left', { tracking: 0.35 }));
  fy -= 6;
  for (const f of finishes) {
    out.push({ ...rect('SHEET_MUTED', fx, fy - 6, 10, 8), fill: f.colour || '#e6e6e6', pen: 'FINE' });
    out.push(ink(fx + 13, fy - 1, String(f.name || ''), 2.2, 'left', { weight: 'bold' }));
    out.push(muted(fx + 13, fy - 4.4, String(f.desc || ''), 1.9));
    fy -= 12;
  }
  if (note) {
    const maxChars = Math.floor((b.x + b.w - fx - 2) / (1.9 * 0.55));
    wrapWords(note, maxChars).forEach((row, i) => out.push(muted(fx, fy - 2 - i * 2.9, row, 1.9)));
  }
  return out;
}
