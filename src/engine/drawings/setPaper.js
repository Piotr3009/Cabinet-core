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
// T75 F22 · the state of every part on the parts card.
import { readinessOf } from '../readiness.js';
import { formatMm } from '../format.js';
import { wrapWords } from './setSheet.js';

const muted = (x, y, s, h = 2, align = 'left', extra = {}) => ({ ...text('SHEET_MUTED', x, y, s, h, align), ...extra });
const ink = (x, y, s, h = 2.4, align = 'left', extra = {}) => ({ ...text('FRAME', x, y, s, h, align), ...extra });

// T81 F2 · the cover as a page of its own is retired: its index and revisions
// stand in the 3D sheet's column (setSheet.js indexColumn), its picture is the 3D.

/** One unit's rows for the cut list: the carcass panels, then the fronts. */
export function cutRows(result) {
  const carcass = []; const fronts = [];
  for (const p of result.panels || []) {
    const row = { id: p.id, part: p.part, qty: Number(p.qty) || 1, w: p.w, h: p.h, t: p.thickness, edging: p.edging?.len_m || 0, area: p.area_m2 || 0 };
    // T75 F22 · *"The T71 drawing set prints the state in the parts card"*:
    // read off the part (`engine/readiness.js`), never written into it.
    row.state = readinessOf(p, { drills: result.drills });
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
/** T75 F22 · the state as the parts card prints it, short enough for its column. */
const READINESS_SHORT = {
  cut: 'CNC', geometry: 'OUTLINE', manual: 'ON SITE', bought: 'BOUGHT',
};

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
      // T75 F22 · the state, on every line: what the machine finishes reads
      // CNC; anything else is said in the joiner's words.
      out.push({ ...text(r.state === 'cut' ? 'SHEET_MUTED' : 'BUILDING', x + w - 10, yy, READINESS_SHORT[r.state] || '', 1.6, 'right') });
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
