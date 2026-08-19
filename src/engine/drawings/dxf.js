// ─── A DRAWING SHEET AS DXF (turn 40, CLAUDE.md F5) ─────────────────────────
//
// *"DXF 2D as a SEPARATE output, same geometry, WITH TEXT (dimensions, labels,
// title block). It carries a clear label: 'AutoCAD only — do NOT open in
// VCarve', because DXF text styles crash VCarve's parser (02.08.2026). The CNC
// export path is untouched by this feature and still ships no text of any
// kind."*
//
// ─── WHY THIS IS A SEPARATE FILE FROM engine/cnc/dxf.js ─────────────────────
//
// Those two sentences are the whole reason. The CNC writer's contract is that
// it emits no text but one in-part label, because the machine's importer chokes
// on text styles and a crashed importer is a lost afternoon at the bench. A
// DRAWING is the opposite: it is nothing WITHOUT its dimensions, and it is
// opened in AutoCAD, which has read DXF text since 1982.
//
// So the two paths are kept apart at the module level rather than at a flag.
// A flag on one writer is one `if` away from shipping a dimension into a
// toolpath; two writers cannot make that mistake. What IS shared is the R12
// serialiser itself (`writeDxf`), because the dialect question — AC1009, no
// handles, no LWPOLYLINE — was settled in BLOCKERS #8 and answering it twice
// would be the same fault one storey down.
//
// COORDINATES: a laid-out sheet is in PAPER millimetres with Y UP, which is
// exactly the frame AutoCAD works in. No flip, unlike the SVG and the PDF.
//
// Pure functions — no React, no store imports, no jsPDF.

import { writeDxf } from '../cnc/dxf.js';
import { DRAWING_LAYERS, drawingLayer, PEN, penWidth } from './layers.js';

/**
 * The label CLAUDE.md requires, verbatim, and it goes ON THE DRAWING.
 *
 * A warning in a menu is read once and forgotten; a warning in the file is
 * read by whoever opens the file, which is the person it is for.
 */
export const DXF_AUTOCAD_ONLY = 'AutoCAD only - do NOT open in VCarve';

/**
 * One laid-out sheet as DXF R12 ASCII, text and all.
 *
 * @param {object} sheet  `layoutSheet()` output — paper mm, Y up
 * @param {object} [opts]
 *   note   the warning stamped on the sheet; the default is the required one
 *          and passing `null` removes it (nothing in the app does)
 * @returns {string}
 */
export function sheetToDxf(sheet, { note = DXF_AUTOCAD_ONLY } = {}) {
  const entities = [];
  const used = new Set();
  /**
   * The DXF layer this entity belongs on: its own layer where it is drawn at
   * that layer's default role, and a suffixed sibling where it is not (T41-F5b).
   */
  const use = (e) => {
    const base = e.layer;
    const L = DRAWING_LAYERS[base] || drawingLayer(base);
    const role = e.pen || null;
    const name = role && role !== L.pen ? `${base}-${role}` : base;
    used.add(name);
    return name;
  };

  for (const e of sheet.entities || []) {
    if (e.kind === 'line') {
      entities.push({
        type: 'poly', layer: use(e), closed: false, pts: [[e.x1, e.y1], [e.x2, e.y2]],
      });
    } else if (e.kind === 'rect') {
      entities.push({
        type: 'poly',
        layer: use(e),
        closed: true,
        pts: [[e.x, e.y], [e.x + e.w, e.y], [e.x + e.w, e.y + e.h], [e.x, e.y + e.h]],
      });
    } else if (e.kind === 'circle') {
      entities.push({
        type: 'circle', layer: use(e), cx: e.cx, cy: e.cy, r: e.r,
      });
    } else if (e.kind === 'text') {
      entities.push({
        type: 'text',
        layer: use(e),
        x: e.x,
        y: e.y,
        h: e.height,
        // R12 TEXT is 7-bit country. A dimension is digits and a title block is
        // a name, so this is a guard rather than a transformation — and it is
        // the same bargain the PDF makes (jsPDF's built-in faces are WinAnsi).
        str: ascii(e.text),
        // The DXF rotation is anticlockwise in degrees; the sheet's own
        // `rotate` is the SVG convention, which is clockwise.
        rot: e.rotate ? -e.rotate : 0,
        halign: e.align === 'left' ? 0 : 1,
        valign: 2,
      });
    }
  }

  if (note) {
    entities.push({
      type: 'text',
      layer: use({ layer: 'FRAME_LIGHT' }),
      x: 2,
      y: 2,
      h: 3,
      str: ascii(note),
      rot: 0,
      halign: 0,
      valign: 2,
    });
  }

  // ─── TURN 41 (F5b): THE SHEET'S PENS REACH THE FILE ───────────────────────
  //
  // A DXF layer carries ONE weight, and after F5a our entities carry several —
  // a CARCASE line may be an OUTLINE on an elevation and a CUT on a section. So
  // an entity drawn at anything other than its layer's default role goes onto a
  // SUFFIXED SIBLING layer (`CARCASE-CUT`), same colour, same name stem, with
  // its own 370. The drawing still reads as the owner's set — the colour
  // convention is untouched — and every line plots at the weight it was drawn
  // at instead of all of them plotting the same.
  //
  // And the hidden layers get a real DASHED linetype, so a shelf behind a door
  // is dashed in AutoCAD as it already is on screen and in the PDF.
  const DASHED = 'CC_DASHED';
  const layers = [...used].map((name) => {
    const stem = name.replace(/-(CUT|OUTLINE|VISIBLE|HIDDEN|THIN|ANNOTATION|FINE)$/, '');
    const L = DRAWING_LAYERS[stem] || drawingLayer(stem);
    const role = name === stem ? (L.pen || null) : name.slice(stem.length + 1);
    const lw = Number.isFinite(PEN[role]) ? Math.round(PEN[role] * 100) : Math.round((L.width ?? 0.25) * 100);
    const dash = L.dash && (role === 'HIDDEN' || (name === stem && L.dash)) ? L.dash : null;
    return {
      name,
      color: L.aci,
      lw,
      ...(dash ? { ltype: DASHED, dash } : {}),
    };
  });
  return writeDxf(entities, layers, {
    min: [0, 0],
    max: [Number(sheet.width) || 0, Number(sheet.height) || 0],
  });
}

/** Anything outside 7-bit ASCII becomes a hyphen, so an R12 reader never sees it. */
function ascii(value) {
  // eslint-disable-next-line no-control-regex
  return String(value ?? '').replace(/[^\x20-\x7E]/g, '-');
}
