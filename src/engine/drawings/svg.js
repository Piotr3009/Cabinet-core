// ─── A sheet, as SVG (turn 6, CLAUDE.md F7) ───
//
// The renderer for the preview AND for the export — the same string either way,
// so what is on screen is what lands in the file. White paper, black frame,
// the LISP's layer colours.
//
// The only thing that happens here beyond writing tags is the Y FLIP: the
// drawing is held with Y up, the way AutoCAD holds it and the way the engine's
// boxes are measured, and SVG counts Y down.
//
// Pure functions — no React, no DOM, no store imports. Which is what lets a
// node test parse the output.

import { drawingLayer } from './layers.js';

const esc = (s) => String(s)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const n = (v) => (Math.round(Number(v) * 1000) / 1000);

const FONT = 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif';

/**
 * @param {object} sheet   layoutSheet() output
 * @param {object} [opts]  { background }
 * @returns {string} a standalone SVG document
 */
export function sheetToSvg(sheet, { background = '#ffffff' } = {}) {
  const { width, height } = sheet;
  // Y up → Y down. Everything below writes `flip(y)` and never thinks about it
  // again, which is the point of having exactly one of these.
  const flip = (y) => height - y;

  const parts = [];
  for (const e of sheet.entities) {
    const L = drawingLayer(e.layer);
    const stroke = `stroke="${L.colour}" stroke-width="${n(L.width)}"`;
    // A hidden line is dashed whatever layer it is on; a layer may also be
    // dashed in its own right.
    const dash = e.hidden || L.dash ? ` stroke-dasharray="${(L.dash || [5, 3]).join(' ')}"` : '';
    const tag = e.meta ? ` data-cc="${esc(e.meta)}"` : '';

    if (e.kind === 'line') {
      parts.push(`<line x1="${n(e.x1)}" y1="${n(flip(e.y1))}" x2="${n(e.x2)}" y2="${n(flip(e.y2))}" ${stroke}${dash} stroke-linecap="round" data-layer="${e.layer}"${tag}/>`);
    } else if (e.kind === 'rect') {
      parts.push(`<rect x="${n(e.x)}" y="${n(flip(e.y + e.h))}" width="${n(e.w)}" height="${n(e.h)}" fill="none" ${stroke}${dash} data-layer="${e.layer}"${tag}/>`);
    } else if (e.kind === 'text') {
      const anchor = e.align === 'left' ? 'start' : 'middle';
      const rotate = e.rotate ? ` transform="rotate(${n(e.rotate)} ${n(e.x)} ${n(flip(e.y))})"` : '';
      const tracking = e.tracking ? ` letter-spacing="${n(e.tracking * e.height)}"` : '';
      parts.push(
        `<text x="${n(e.x)}" y="${n(flip(e.y))}" font-size="${n(e.height)}" font-family="${FONT}"`
        + ` fill="${L.colour}" text-anchor="${anchor}" dominant-baseline="central"${tracking}${rotate}`
        + ` data-layer="${e.layer}"${tag}>${esc(e.text)}</text>`,
      );
    }
  }

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${n(width)}mm" height="${n(height)}mm"`,
    ` viewBox="0 0 ${n(width)} ${n(height)}" data-cc-drawing="front-elevation">`,
    `<rect x="0" y="0" width="${n(width)}" height="${n(height)}" fill="${background}"/>`,
    ...parts,
    '</svg>',
  ].join('\n');
}
