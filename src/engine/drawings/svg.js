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

import { drawingLayer, penWidth } from './layers.js';

const esc = (s) => String(s)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const n = (v) => (Math.round(Number(v) * 1000) / 1000);

const FONT = 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif';

/**
 * @param {object} sheet   layoutSheet() output
 * @param {object} [opts]  { background, kind } — `kind` names the drawing in
 *                         `data-cc-drawing`, which is what a test and the
 *                         browser both look for.
 * @returns {string} a standalone SVG document
 */
export function sheetToSvg(sheet, { background = '#ffffff', kind = 'front-elevation' } = {}) {
  const { width, height } = sheet;
  // Y up → Y down. Everything below writes `flip(y)` and never thinks about it
  // again, which is the point of having exactly one of these.
  const flip = (y) => height - y;

  const parts = [];
  for (const e of sheet.entities) {
    const L = drawingLayer(e.layer);
    // T41-F5a: the WEIGHT comes from the entity's drawing ROLE, resolved in one
    // place (`penWidth`), not from the layer's own `width`. Colour still comes
    // from the layer, which is the owner's convention and is right.
    const stroke = `stroke="${L.colour}" stroke-width="${n(penWidth(e))}"`;
    // A hidden line is dashed whatever layer it is on; a layer may also be
    // dashed in its own right. `solid` overrides both — the carcass-only view
    // draws a shelf you are LOOKING AT, and a shelf you are looking at is a
    // continuous line even though the shelf layer is a hidden-line layer
    // (turn 7, CLAUDE.md F1).
    const dash = !e.solid && (e.hidden || L.dash) ? ` stroke-dasharray="${(L.dash || [5, 3]).join(' ')}"` : '';
    const tag = e.meta ? ` data-cc="${esc(e.meta)}"` : '';

    if (e.kind === 'line') {
      parts.push(`<line x1="${n(e.x1)}" y1="${n(flip(e.y1))}" x2="${n(e.x2)}" y2="${n(flip(e.y2))}" ${stroke}${dash} stroke-linecap="round" data-layer="${e.layer}"${tag}/>`);
    } else if (e.kind === 'circle') {
      parts.push(`<circle cx="${n(e.cx)}" cy="${n(flip(e.cy))}" r="${n(e.r)}" fill="none" ${stroke}${dash} data-layer="${e.layer}"${tag}/>`);
    } else if (e.kind === 'rect') {
      // T71: a rect may ask for a fill (a cut bar, a title-block cell). Absent,
      // it is the outline it has always been.
      const rfill = e.fill === 'white' ? background : (e.fill || 'none');
      const rstroke = e.noStroke ? 'stroke="none"' : stroke;
      parts.push(`<rect x="${n(e.x)}" y="${n(flip(e.y + e.h))}" width="${n(e.w)}" height="${n(e.h)}" fill="${rfill}" ${rstroke}${dash} data-layer="${e.layer}"${tag}/>`);
    } else if (e.kind === 'text') {
      const anchor = e.align === 'left' ? 'start' : (e.align === 'right' ? 'end' : 'middle');
      const rotate = e.rotate ? ` transform="rotate(${n(e.rotate)} ${n(e.x)} ${n(flip(e.y))})"` : '';
      const tracking = e.tracking ? ` letter-spacing="${n(e.tracking * e.height)}"` : '';
      // ─── T71 (the sheet set): a MASKED text stands on white ────────────────
      // A unit number on a double door would sit on the meeting line; the mask
      // is what keeps it readable without moving it off the front it names.
      // Only a text that asks for it gets one, so every older sheet is byte
      // for byte what it was.
      if (e.mask) {
        const mw = String(e.text).length * e.height * 0.62 + e.height * 0.6;
        const mh = e.height * 1.3;
        const mr = e.rotate ? ` transform="rotate(${n(e.rotate)} ${n(e.x)} ${n(flip(e.y))})"` : '';
        const mx = e.align === 'left' ? e.x - e.height * 0.3 : (e.align === 'right' ? e.x - mw + e.height * 0.3 : e.x - mw / 2);
        parts.push(`<rect x="${n(mx)}" y="${n(flip(e.y) - mh / 2)}" width="${n(mw)}" height="${n(mh)}" fill="${background}" stroke="none"${mr} data-layer="${e.layer}" data-cc="mask"/>`);
      }
      const weight = e.weight === 'bold' ? ' font-weight="bold"' : '';
      parts.push(
        `<text x="${n(e.x)}" y="${n(flip(e.y))}" font-size="${n(e.height)}" font-family="${FONT}"`
        + ` fill="${e.colour || L.colour}" text-anchor="${anchor}" dominant-baseline="central"${tracking}${rotate}${weight}`
        + ` data-layer="${e.layer}"${tag}>${esc(e.text)}</text>`,
      );
    } else if (e.kind === 'poly') {
      // ─── T71: a closed run of points, optionally filled ───────────────────
      // The perspective's faces (white, so a nearer box hides a farther one),
      // arrowheads, hatch cells. `fill` is a colour, 'white' (the paper), or
      // absent for an outline.
      const d = (e.pts || []).map((p, i) => `${i ? 'L' : 'M'}${n(p[0])} ${n(flip(p[1]))}`).join(' ') + (e.open ? '' : ' Z');
      const fill = e.fill === 'white' ? background : (e.fill || 'none');
      const sw = e.noStroke ? 'none' : L.colour;
      parts.push(`<path d="${d}" fill="${fill}" stroke="${sw}" stroke-width="${n(penWidth(e))}"${dash} stroke-linejoin="round" data-layer="${e.layer}"${tag}/>`);
    } else if (e.kind === 'image' && e.href) {
      // ─── T71: a picture on the sheet (the render on the visualisation) ────
      parts.push(`<image x="${n(e.x)}" y="${n(flip(e.y + e.h))}" width="${n(e.w)}" height="${n(e.h)}" href="${esc(e.href)}" preserveAspectRatio="xMidYMid meet" data-layer="${e.layer || 'FRAME'}"${tag}/>`);
    }
  }

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${n(width)}mm" height="${n(height)}mm"`,
    ` viewBox="0 0 ${n(width)} ${n(height)}" data-cc-drawing="${esc(kind)}">`,
    `<rect x="0" y="0" width="${n(width)}" height="${n(height)}" fill="${background}"/>`,
    ...parts,
    '</svg>',
  ].join('\n');
}
