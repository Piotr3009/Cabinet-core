// ─── DXF generator ───
// One DXF file per cut part, straight out of the engine's CNC geometry.
// Pure JavaScript: no React, no store, no third-party library (the ZIP wrapper
// that needs jszip lives in src/lib/, not here — CLAUDE.md rule 2).
//
// DIALECT — why R12 and not a modern DXF.
//   Syntax pattern: reference/production-core/dxfWriter.js, which is in
//   production at Piotr's shop today. Its header records why: an AC1015
//   attempt died in VCarve's parser (02.08.2026), so the writer was downgraded
//   to R12 (AC1009) ASCII — the oldest mainstream dialect, no handles, no
//   subclass markers, no BLOCKS/OBJECTS sections, and the dialect Vectric's own
//   documentation recommends for DXF import.
//   R12 has no LWPOLYLINE, so a closed polyline is written the R12 way:
//   POLYLINE + VERTEX… + SEQEND with the closed flag (70 = 1). Semantically
//   identical to the LWPOLYLINE the AutoLISP entmakes — same points, same
//   closed flag, same layer — just spelled in the dialect that is known to
//   import. See BLOCKERS.md #8.
//
// COORDINATES — origin is the bottom-left corner of the part's nominal
// rectangle, i.e. exactly the panel-local frame the engine already emits
// (src/engine/puzzle.js). Puzzle tabs and socket reliefs deliberately reach
// OUTSIDE that rectangle (a tab on BUR runs to x = −G, a socket overshoots the
// edge by 6 mm) because that is what they physically do; the coordinates are
// therefore not clamped to the positive quadrant. $EXTMIN/$EXTMAX in the
// header state the true extents so any CAM package sees them immediately.

import { layerTableFor } from './layers.js';
import { partLabelText, slopeNoteText } from './partLabel.js';
import { labelBlock } from './annotation.js';
import { turnPoint } from './layout.js';
import { exportFileName, fileSafeName } from '../naming.js';
import {
  frontDecorationOf, frontDecorationLayers, frontPanelEntities, mirrorAboutVerticalAxis,
} from './frontOperations.js';
// T78 F20 · a board machined from the carcass's OUTSIDE face (a Cabineo top,
// bottom or fixed shelf, `meta.machinedFace: 'outside'`) is written as seen
// from that face: reflected through T76's one helper above, labelled OUTSIDE
// FACE UP by partLabel.js. Only `isOutsideFace` is asked here.
import { isOutsideFace } from '../cabineo.js';
import { edgeArrowGeometry } from '../partNumbers.js';
import { markPoints } from '../marks.js';

// ─── Low-level R12 serialiser (shape from production-core/dxfWriter.js) ───

/** Plain decimal, no exponent, trimmed — CAD readers dislike 1e-7 notation. */
const fmt = (n) => {
  const s = Number(n).toFixed(6).replace(/\.?0+$/, '');
  return s === '-0' ? '0' : s;
};

/**
 * @param {Array} entities  { type:'poly'|'circle'|'text', … } — see below
 * @param {Array} layers    [{ name, color }] — every layer the entities use
 * @param {object} [extents] { min:[x,y], max:[x,y] } for $EXTMIN/$EXTMAX
 * @returns {string} DXF R12 ASCII, CRLF line endings (what AutoCAD itself emits)
 */
export function writeDxf(entities, layers, extents) {
  const out = [];
  const put = (code, val) => { out.push(String(code), String(val)); };

  // ── HEADER ──
  put(0, 'SECTION'); put(2, 'HEADER');
  put(9, '$ACADVER'); put(1, 'AC1009');
  put(9, '$INSBASE'); put(10, 0); put(20, 0); put(30, 0);
  if (extents) {
    put(9, '$EXTMIN'); put(10, fmt(extents.min[0])); put(20, fmt(extents.min[1])); put(30, 0);
    put(9, '$EXTMAX'); put(10, fmt(extents.max[0])); put(20, fmt(extents.max[1])); put(30, 0);
  }
  put(0, 'ENDSEC');

  // ── TABLES (layers only, R12 style) ──
  put(0, 'SECTION'); put(2, 'TABLES');
  put(0, 'TABLE'); put(2, 'LAYER'); put(70, layers.length + 1);
  // ─── TURN 41 (F5b): A LAYER MAY CARRY A PEN AND A LINETYPE ────────────────
  //
  // ADDITIVELY, and that word is the whole design. The CNC path passes neither
  // `lw` nor `ltype`, so its layer rows are emitted by exactly the three `put`s
  // they were emitted by yesterday and every CNC fingerprint is byte-identical.
  // Only the DRAWINGS path asks for them.
  //
  // 370 is the lineweight group code, in 1/100 mm, and R12 readers that predate
  // it ignore an unknown group — which is the same bargain every other optional
  // code in this dialect makes. 6 is the linetype name, and it is written
  // instead of the hard-coded CONTINUOUS only when one is asked for.
  const layerRow = (name, color, lw = null, ltype = null) => {
    put(0, 'LAYER'); put(2, name); put(70, 0); put(62, color);
    put(6, ltype || 'CONTINUOUS');
    if (lw != null) put(370, Math.round(Number(lw)));
  };
  layerRow('0', 7);
  for (const l of layers) layerRow(l.name, l.color, l.lw ?? null, l.ltype ?? null);
  put(0, 'ENDTAB');

  // ─── THE LINETYPE TABLE, WHEN AND ONLY WHEN SOMETHING ASKS FOR ONE ────────
  //
  // T40's drawings DXF wrote every layer CONTINUOUS, so a hidden shelf — dashed
  // in the SVG and dashed in the PDF — plotted SOLID in the one output that is
  // meant to be opened in CAD. An R12 LTYPE record is 72 = 65 ('A' alignment),
  // 73 = element count, 40 = total pattern length, then one 49 per element:
  // positive is a dash, negative is a gap.
  //
  // Emitted only when a layer names a linetype, so a file that asks for none —
  // every CNC file — has no LTYPE table at all and is the file it was.
  const dashed = layers.filter((l) => l.ltype && Array.isArray(l.dash) && l.dash.length);
  if (dashed.length) {
    const seen = new Map();
    for (const l of dashed) if (!seen.has(l.ltype)) seen.set(l.ltype, l.dash);
    put(0, 'TABLE'); put(2, 'LTYPE'); put(70, seen.size);
    for (const [name, pattern] of seen) {
      const total = pattern.reduce((sum, v) => sum + Math.abs(Number(v) || 0), 0);
      put(0, 'LTYPE'); put(2, name); put(70, 0);
      put(3, name); put(72, 65); put(73, pattern.length); put(40, fmt(total));
      pattern.forEach((v, i) => put(49, fmt(i % 2 === 0 ? Math.abs(v) : -Math.abs(v))));
    }
    put(0, 'ENDTAB');
  }
  put(0, 'ENDSEC');

  // ── ENTITIES ──
  put(0, 'SECTION'); put(2, 'ENTITIES');
  for (const e of entities) {
    if (e.type === 'poly') {
      put(0, 'POLYLINE'); put(8, e.layer);
      put(66, 1);                                 // vertices follow
      put(70, e.closed ? 1 : 0);
      put(10, 0); put(20, 0); put(30, 0);
      for (const [x, y, b] of e.pts) {
        put(0, 'VERTEX'); put(8, e.layer);
        put(10, fmt(x)); put(20, fmt(y)); put(30, 0);
        if (b) put(42, fmt(b));
      }
      put(0, 'SEQEND'); put(8, e.layer);
    } else if (e.type === 'circle') {
      put(0, 'CIRCLE'); put(8, e.layer);
      put(10, fmt(e.cx)); put(20, fmt(e.cy)); put(30, 0);
      put(40, fmt(e.r));
    } else if (e.type === 'arc') {
      // ─── TURN 38 (CLAUDE.md F10): AND R12 HAS AN ARC ────────────────────
      // ARC is in AC1009 exactly as CIRCLE is — centre, radius, then group
      // codes 50 and 51, the start and end angles in DEGREES, swept
      // ANTICLOCKWISE from 50 to 51. `engine/partObjects.js` stores an arc in
      // that convention for this reason: one convention, no conversion, and
      // therefore nothing to be wrong at the wrap past 360.
      //
      // It is ADDITIVE. No engine-computed geometry in this app emits an arc,
      // so every DXF the app wrote before tonight is byte-for-byte what it was.
      put(0, 'ARC'); put(8, e.layer);
      put(10, fmt(e.cx)); put(20, fmt(e.cy)); put(30, 0);
      put(40, fmt(e.r));
      put(50, fmt(e.start)); put(51, fmt(e.end));
    } else if (e.type === 'text') {
      put(0, 'TEXT'); put(8, e.layer);
      put(10, fmt(e.x)); put(20, fmt(e.y)); put(30, 0);
      put(40, fmt(e.h)); put(1, e.str);
      if (e.rot) put(50, fmt(e.rot));
      put(72, e.halign ?? 1);                     // 1 = centred horizontally
      put(11, fmt(e.x)); put(21, fmt(e.y)); put(31, 0);
      put(73, e.valign ?? 2);                     // 2 = middle vertically
    }
  }
  put(0, 'ENDSEC');
  put(0, 'EOF');
  return `${out.join('\r\n')}\r\n`;
}

// ─── Engine geometry → entities ───

/**
 * A pocket record { x1,y1,x2,y2 } is a closed 4-point rectangle.
 *
 * ─── TURN 25 (CLAUDE.md F1.2): AND A CUT-OUT RUNS THE OTHER WAY ────────────
 * Anticlockwise for the ordinary pocket — a socket, a dog bone, a runner groove
 * — every one of which deliberately breaks the board's edge so the cutter
 * enters and leaves off the work, and is therefore a piece of the PROFILE.
 *
 * A pocket flagged `cutout` lies wholly INSIDE the board (F3's shaker panel is
 * the first this engine has ever cut) and is traced CLOCKWISE. That opposition
 * is not tidiness: it is the signal VCarve reads to know which side of the line
 * the material is on, and a hole traced the same way round as its outline is a
 * hole machined to its own outside.
 */
function pocketPoints(p) {
  // ─── Turn 34 (CLAUDE.md F4): a pocket may carry its OWN points ───────────
  // The shoe box's side groove is a PARALLELOGRAM — six deep, running at the
  // slope's own angle from (G, 0) to (depth − G, rear), its width taken
  // PERPENDICULAR to that slope (KIT_SHOE_BOX.lsp `drawSHOE_SIDE`, a
  // `makePolyline`). A rectangle cannot say that. `cnc/edgeGuard.js` has read
  // `pocket.pts` since turn 25; this is the writer learning the same field.
  // A pocket without it is the axis-aligned rectangle it has always been, so
  // no existing byte moves.
  if (Array.isArray(p?.pts) && p.pts.length >= 3) {
    const own = p.pts.map(([x, y]) => [x, y]);
    return p.cutout ? own.reverse() : own;
  }
  const pts = [[p.x1, p.y1], [p.x2, p.y1], [p.x2, p.y2], [p.x1, p.y2]];
  return p.cutout ? pts.reverse() : pts;
}

/**
 * The part's own rectangle, in the frame the file is written in.
 *
 * A part drawn TURNED (a top, a shelf, a drawer side) says so with `drawn_w` /
 * `drawn_h`; everything else is its cut size.
 */
function labelBox(panel) {
  return {
    w: Math.abs(panel.cnc?.drawn_w ?? panel.w),
    h: Math.abs(panel.cnc?.drawn_h ?? panel.h),
  };
}

/**
 * The part's own caption AS THE SHEET LAYS IT OUT — the words, the line breaks
 * and the size, from `annotation.js`'s one layout function.
 *
 * Exported so the CNC VIEW can ask the same question with the same box and get
 * the same answer, which is what CLAUDE.md F1.1 means by "used by the sheet AND
 * the file, so they cannot disagree". The only thing the two do differently is
 * the SIZE, and that is one profile number (`cnc.exportLabelScale`).
 */
export function panelLabelBlock(panel, {
  unitNum, profile, mmPerPx = 1, minPx = 0,
  // ─── TURN 48 (CLAUDE.md F9): 'outside' IS THE PREVIEW'S ANSWER ───────────
  // *"Preview only; the DXF text is already whole."* The FILE keeps turn 16's
  // ladder exactly — a caption that does not fit its board is truncated and
  // then dropped, because a DXF has nowhere to put a leader that the machine
  // will not also try to cut, and because a label that wandered outside its own
  // outline in a nesting file would land on the part beside it. The GLASS is
  // where a joiner reads the size, and on the glass it steps out and stays
  // whole. Default 'truncate' — every caller that predates tonight, the DXF
  // writer included, gets exactly the block it got yesterday.
  onOverflow = 'truncate',
  // CHAT FIX 17.10.2026: the part's number in the project, when the caller
  // has a plan for it (engine/partNumbers.js); null prints yesterday's label.
  no = null,
}) {
  const cnc = profile.cnc;
  const box = labelBox(panel);
  return labelBlock({
    onOverflow,
    text: partLabelText(unitNum, panel, { no }),
    sizeMm: profile.cnc.annotation.partLabelMm,
    boxW: box.w,
    boxH: box.h,
    maxLines: cnc.labelMaxLines,
    fillRatio: cnc.labelFillRatio,
    lineGap: cnc.labelLineGap,
    minSize: cnc.labelMinHeight,
    mmPerPx,
    minPx,
    // ASCII, for the reason partLabel.js gives about the multiplication sign:
    // R12 predates any agreement about what a byte above 127 means, and the
    // screen takes the export's spelling rather than the other way round.
    ellipsis: '~',
  });
}

/**
 * ─── AND WHAT THE OUTLINE CANNOT SAY, LAID OUT THE SAME WAY (turn 47) ───────
 *
 * The bevel, the cut angle and the scribe allowance (`partLabel.js
 * slopeNoteText`) are a caption like any other, so they obey turn 16's rule
 * like any other: *"a caption is N millimetres tall on the sheet at every zoom,
 * it is laid out INSIDE the outline of the thing it names, and where it will
 * not fit it TRUNCATES and then HIDES — it never grows into its neighbour."*
 *
 * The FIRST run of this got that wrong — the note was drawn at a fixed size and
 * `BEVEL 67.8° BOTH ENDS · 5-AXIS` ran clean across the part beside it on the
 * sheet. The eye is what caught it, which is what looking at the picture is
 * for. So it goes through `labelBlock` with the part's own box, exactly as the
 * part label does, and a note too long for its board is truncated and then
 * dropped rather than printed over the neighbour.
 *
 * It is SMALLER than the part label on purpose (`noteScale`): the label is what
 * the board IS and the note is what to do to it, and the two must not compete.
 */
export function panelNoteBlock(panel, {
  profile, mmPerPx = 1, minPx = 0, ascii = false,
}) {
  const cnc = profile.cnc;
  const box = labelBox(panel);
  const text = slopeNoteText(panel, { ascii });
  const ellipsis = ascii ? '~' : '…';
  const at = (sizeMm) => labelBlock({
    text,
    sizeMm,
    boxW: box.w,
    boxH: box.h,
    // MORE lines than the part label allows, and that is the difference between
    // the two: a label is a NAME and reads best on one line, a note is an
    // INSTRUCTION and reads fine stacked. A scribe filler is 60 mm wide and
    // 2250 tall — the only way `OVERSIZE +20 — TRIM ON SITE (NOM 40)` fits on
    // it at a legible height is DOWN it.
    maxLines: Math.max(cnc.labelMaxLines, 6),
    fillRatio: cnc.labelFillRatio,
    lineGap: cnc.labelLineGap,
    minSize: cnc.labelMinHeight,
    mmPerPx,
    minPx,
    ellipsis,
  });
  // ─── AND IT WOULD RATHER BE SMALL THAN HALF-SAID ────────────────────────
  //
  // `labelBlock` maximises SIZE, which for a NAME is right — `01 BUR 5~` still
  // tells a joiner which board he is holding. For an INSTRUCTION it is not:
  // `+20 - TRI~` is worse than nothing, because nobody can act on it. So the
  // note steps its size down until the words survive whole, and only takes a
  // truncated block when even the readability floor cannot hold them.
  let block = at(cnc.annotation.partLabelMm * 0.7);
  const cut = (b) => b.visible && b.lines.some((l) => l.text.endsWith(ellipsis));
  for (let size = cnc.annotation.partLabelMm * 0.7; cut(block) && size > cnc.labelMinHeight;) {
    size = Math.max(cnc.labelMinHeight, size * 0.7);
    const next = at(size);
    if (!next.visible) break;
    block = next;
    if (size <= cnc.labelMinHeight) break;
  }
  return block;
}

/**
 * …and the same block AS THE FILE WRITES IT: the same words and the same line
 * breaks, at half the height (turn 18, CLAUDE.md F1.2).
 *
 * Two limits stand above the halved size and both are older than this turn: the
 * absolute `labelHeight` the LISP's `drawText` used, and `labelFitRatio` × the
 * part's short side. Below it is `labelMinHeight`, which is the floor a board
 * can still be read at across a bench.
 *
 * The file's size is therefore never GREATER than the sheet's, which is what
 * makes the shared line breaks safe: a string that fitted its line at the
 * sheet's size fits it at half of it with room to spare.
 *
 * @returns {{lines:string[], h:number, str:string, step:number}}
 *   `str` is the whole caption on one line — what the part says, however it is
 *   broken — and is '' where not even one character fits.
 */
export function panelLabel(panel, { unitNum, profile, no = null }) {
  const cnc = profile.cnc;
  const box = labelBox(panel);
  const block = panelLabelBlock(panel, { unitNum, profile, no });
  if (!block.visible) return { lines: [], h: 0, str: '', step: 0 };
  const h = Math.max(
    cnc.labelMinHeight,
    Math.min(
      block.size * cnc.exportLabelScale,
      cnc.labelHeight,
      Math.min(box.w, box.h) * cnc.labelFitRatio,
    ),
  );
  const lines = block.lines.map((l) => l.text);
  return {
    lines, h, str: lines.join(' '), step: h * (1 + cnc.labelLineGap),
  };
}

/**
 * All DXF entities of one cut part, in panel-local mm.
 *
 * The circles come from `drills[]` and ONLY from there. `panel.cnc.holes` is
 * already copied into `drills[]` by computeCabinet, so reading both would
 * double every puzzle hole.
 *
 * @param {object} panel   one entry of result.panels
 * @param {object[]} drills  result.drills (the whole list; filtered here)
 * @param {object} opts    { unitNum, profile, label }
 *   label  CHAT FIX 17.10.2026: `{ no, layer }`, the part's number in the
 *          project and the cabinet's own text layer (LABEL_<cabinet>, coloured
 *          in the layer table so VCarve shows each cabinet's words in its
 *          colour). Left out, the text goes where it always went, unnumbered,
 *          and the file is byte for byte yesterday's.
 */
export function panelEntities(panel, drills, { unitNum, profile, label = null }) {
  const pz = profile.puzzle;
  const cnc = profile.cnc;
  const entities = [];
  const textLayer = label?.layer || cnc.unitNumberLayer;
  const partNo = label?.no ?? null;
  // ─── T78 F20 · OUTSIDE FACE UP ──────────────────────────────────────────
  // The owner, 11.10.2026: a Cabineo pocket is cut from the OUTSIDE face of
  // the top, the bottom and a fixed shelf ("ciecie nie od srodka korpusu
  // tylko do zewnatrz"). Such a board's file is drawn as seen from that face:
  // every entity below is built in the drawn (inside) frame as always, and
  // the whole set is reflected once at the end, x' = W - x, through the SAME
  // helper T76's FRONT files go through (`mirrorAboutVerticalAxis`), never a
  // second formula. A board no plan marked is untouched, byte for byte.
  const outside = isOutsideFace(panel);
  const thick = Number(panel.thickness) || 0;

  const outline = panel.cnc?.outline || [];
  if (outline.length >= 2) {
    entities.push({
      type: 'poly',
      layer: panel.cnc?.layer || pz.layers.outline,
      closed: true,
      pts: outline.map(([x, y]) => [x, y]),
    });
  }

  for (const pocket of panel.cnc?.pockets || []) {
    entities.push({ type: 'poly', layer: pocket.layer, closed: true, pts: pocketPoints(pocket) });
  }

  // ─── Turn 13 (CLAUDE.md F8): the biscuit MARKS ───
  // An OPEN two-point polyline — a path the cutter follows in and back out —
  // rather than a closed rectangle, because that is what the owner's dedicated
  // 4 mm program is: plunge, run 70 mm, retract. R12 has the closed flag
  // already (`70 = 0` here against `1` for a pocket), so nothing about the
  // writer changes. A panel with no marks contributes nothing, which is what
  // keeps every existing file byte-identical.
  // 17.10.2026 (16:10): a mark is an open walk; the corner mark is ONE L
  // polyline of three points in the outline's direction (KIT_NOTCH.lsp D12),
  // so VCarve profiles its waste side on both arms with one setting.
  for (const mark of panel.cnc?.marks || []) {
    entities.push({ type: 'poly', layer: mark.layer, closed: false, pts: markPoints(mark) });
  }

  // ─── TURN 38 (CLAUDE.md F10): EVERYTHING DRAWN EXPORTS ────────────────────
  //
  // "Lines, polylines (LWPOLYLINE), circles, arcs, rects (as closed
  // LWPOLYLINE), dowel-line holes as today, on their layer."
  //
  // R12 HAS NO LWPOLYLINE — this file's own header records why the dialect is
  // R12 and not something newer (an AC1015 attempt died in VCarve's parser on
  // 02.08.2026) — so a polyline is written the R12 way, POLYLINE + VERTEX… +
  // SEQEND with the closed flag, which is the very shape `marks` and every
  // pocket in this app have used since turn 3. Same points, same closed flag,
  // same layer; spelled in the dialect that is known to import.
  //
  // A RECT is a closed run of its four corners, which `partEdits.js` has
  // already resolved onto `cnc.paths` — the writer is not asked to know what a
  // rectangle is, only how to write a closed polyline.
  for (const path of panel.cnc?.paths || []) {
    if (!Array.isArray(path.pts) || path.pts.length < 2) continue;
    entities.push({
      type: 'poly', layer: path.layer, closed: Boolean(path.closed), pts: path.pts.map(([x, y]) => [x, y]),
    });
  }

  for (const curve of panel.cnc?.curves || []) {
    if (curve.kind === 'arc') {
      entities.push({
        type: 'arc', layer: curve.layer, cx: curve.cx, cy: curve.cy, r: curve.r, start: curve.start, end: curve.end,
      });
      continue;
    }
    entities.push({
      type: 'circle', layer: curve.layer, cx: curve.cx, cy: curve.cy, r: curve.r,
    });
  }

  for (const hole of drills) {
    if (hole.panel !== panel.id) continue;
    // T75 F23 · a dowel's EDGE bore is horizontal: a 3-axis bed drills from
    // above and a circle here would plunge it through the face. It stays on
    // the sheet and the drawings, and never reaches the machine file.
    if (hole.face === 'edge') continue;
    // T78 F20 · on an OUTSIDE FACE UP board a BLIND hole drilled from the
    // inside face cannot be drilled in this setup (it would be bored into
    // the wrong face); it is held out of this file and named in the
    // operations JSON for a second setup. A through hole, and a hole the
    // record says is from the outside face (the drill15 option's dia 15),
    // is written, reflected with the rest.
    if (outside && hole.face !== 'outside' && Number(hole.depth) > 0 && thick > 0 && Number(hole.depth) < thick - 1e-6) continue;
    entities.push({ type: 'circle', layer: hole.layer, cx: hole.x, cy: hole.y, r: hole.d / 2 });
  }

  // ─── Turn 17 (CLAUDE.md F1): THE PART SAYS WHICH CABINET IT IS FOR ────────
  //
  // Part label at the centre of the nominal rectangle, exactly like
  // (drawText "UNIT_NUMBER" midX midY 40.0 unitNum) in the LISP — but the
  // STRING is `engine/cnc/partLabel.js` now, the same one the sheet draws, so
  // the board on the bench and the picture on the screen say the same words.
  // It is INSIDE the part (F1.2), on the existing text layer (F1.4), and it is
  // the only text this file ever writes (F2.2).
  //
  // ─── Turn 18 (CLAUDE.md F1): IT IS A BLOCK, AND IT IS HALF THE SIZE ──────
  // The caption breaks onto up to three centred lines and the block is centred
  // on the part's own middle — so a one-line label is written at exactly the
  // coordinate it always was, and a part too small to hold the words on one
  // line gets them stacked instead of hanging over its edges.
  const w = panel.cnc?.drawn_w ?? panel.w;
  const h = panel.cnc?.drawn_h ?? panel.h;
  // ─── TURN 47 (CLAUDE.md F2/F3/F4): AND WHAT THE OUTLINE CANNOT SAY ───────
  //
  // *"najlepiej zeby bylo napisane jaki kat ciecia, na CNC tez zeby bylo
  // napisane."*
  //
  // A bevel through the thickness, a vertically cut end and a 20 mm scribe
  // allowance are all invisible in a flat outline — the file would hand the
  // machine a rectangle and say nothing. So the board SAYS it, on the same
  // text layer the part label uses, at the TOP edge (beside the cut) rather
  // than in the middle (where the label is). One formatter, and the sheet draws
  // the identical words at the identical place.
  //
  // A panel with nothing extra to say contributes NO ENTITY AT ALL, which is
  // what keeps every existing file byte-identical.
  const note = panelNoteBlock(panel, { profile, ascii: true });
  const caption = panelLabel(panel, { unitNum, profile, no: partNo });
  if (note.visible) {
    // At the part's TOP EDGE — beside the cut, not in the middle where the
    // label is — and laid out inside the part's own box, so it can never grow
    // into the board next to it on the sheet.
    for (const [i, l] of note.lines.entries()) {
      entities.push({
        type: 'text',
        layer: textLayer,
        x: w / 2,
        y: h - note.size * 1.2 - i * note.step,
        h: note.size,
        str: l.text,
      });
    }
  }
  for (const [i, line] of caption.lines.entries()) {
    entities.push({
      type: 'text',
      layer: textLayer,
      x: w / 2,
      y: h / 2 + ((caption.lines.length - 1) / 2 - i) * caption.step,
      h: caption.h,
      str: line,
    });
  }
  // ─── CHAT FIX 17.10.2026 (14:10): THE EDGE ARROW, ON THE BOARD ────────────
  // The owner: *"na projekcie nie ma strzalek ktora strone oklejamy, jak mam
  // przykleic naklejki?"*  On every NUMBERED board (the ones with a sticker)
  // the sticker's own arrow: a line inside the banded edge, the arrow at it,
  // the word EDGE, all on the cabinet's text layer (drawn in VCarve, never
  // cut), in the board's drawn frame (engine/partNumbers.js edgeArrowGeometry,
  // the one geometry the sheet draws too). A file written without a plan has
  // none of it, as it has no number.
  if (partNo != null) {
    const arrow = edgeArrowGeometry(panel, profile, { textMm: caption.h || cnc.labelMinHeight });
    if (arrow) {
      for (const pts of arrow.lines) entities.push({ type: 'poly', layer: textLayer, closed: false, pts: pts.map(([x, y]) => [x, y]) });
      if (arrow.text && arrow.text.h > 0) {
        // The word stands at the shaft's tail, reading away from the arrow:
        // right-justified before a rightward arrow, left-justified after a
        // leftward one; centred over or under a vertical shaft.
        const halign = arrow.text.anchor === 'end' ? 2 : (arrow.text.anchor === 'start' ? 0 : 1);
        const valign = arrow.text.anchor === 'top' ? 3 : (arrow.text.anchor === 'bottom' ? 1 : 2);
        entities.push({
          type: 'text', layer: textLayer, x: arrow.text.x, y: arrow.text.y, h: arrow.text.h, str: arrow.text.str, halign, valign,
        });
      }
    }
  }

  // T78 F20 · the one reflection, applied once to the whole part.
  return outside ? reflectEntities(entities, Number(w)) : entities;
}

/**
 * T78 F20 · an entity list as seen from the part's other face: every point
 * through T76's `mirrorAboutVerticalAxis(width)` (polyline points, circle
 * and arc centres, text anchors; the label sits on the part's middle, so it
 * stays where it is), and an arc's two angles swapped and turned, which is
 * what a mirror does to a sweep. The closed flag and the layers are untouched:
 * a reflected CCW contour is a CW pocket, as T76's FRONT files already say.
 */
export function reflectEntities(entities, width) {
  const mirror = mirrorAboutVerticalAxis(width);
  const deg = (a) => ((a % 360) + 360) % 360;
  return entities.map((e) => {
    if (e.type === 'poly') return { ...e, pts: e.pts.map(([x, y]) => mirror([x, y])) };
    if (e.type === 'circle') {
      const [cx, cy] = mirror([e.cx, e.cy]);
      return { ...e, cx, cy };
    }
    if (e.type === 'arc') {
      const [cx, cy] = mirror([e.cx, e.cy]);
      return { ...e, cx, cy, start: deg(180 - e.end), end: deg(180 - e.start) };
    }
    if (e.type === 'text') {
      const [x, y] = mirror([e.x, e.y]);
      return { ...e, x, y };
    }
    return e;
  });
}

/** Bounding box over every entity, so the header can state the real extents. */
export function entitiesExtents(entities) {
  let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity;
  const hit = (x, y) => {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  };
  for (const e of entities) {
    if (e.type === 'poly') for (const [x, y] of e.pts) hit(x, y);
    else if (e.type === 'circle' || e.type === 'arc') { hit(e.cx - e.r, e.cy - e.r); hit(e.cx + e.r, e.cy + e.r); }
    else if (e.type === 'text') hit(e.x, e.y);
  }
  if (!Number.isFinite(minX)) return { min: [0, 0], max: [0, 0] };
  return { min: [minX, minY], max: [maxX, maxY] };
}

/** `{unitNum}-{PANEL_ID}.dxf`, without repeating a unit number already in the id. */
export function dxfFileName(unitNum, panelId) {
  const prefix = `${unitNum}-`;
  const id = String(panelId).startsWith(prefix) ? String(panelId).slice(prefix.length) : String(panelId);
  const safe = `${unitNum}-${id}`.replace(/[^A-Za-z0-9._-]+/g, '_');
  return `${safe}.dxf`;
}

// ─── CHAT FIX 17.10.2026: THE CABINET'S OWN TEXT LAYER, AND ITS NUMBERS ─────
//
// The owner: the label text of each cabinet in that cabinet's colour, so the
// nesting in VCarve reads cabinet by cabinet (*"przynajmniej kolory napisow
// pod kolory szafki"*), and every carcass board NUMBERED through the project
// (*"ponumerujemy wszystkie elementy"*). A `labels` record is the plan's
// answer for one cabinet (engine/partNumbers.js dxfLabelsFor): the text
// layer, its colour index and the numbers by panel. Every writer below takes
// it as an option; without it nothing moves.

/** The per-panel `label` option out of a cabinet's `labels` record. */
export function labelFor(labels, panelId) {
  if (!labels?.layer) return null;
  const no = labels.byPanel instanceof Map ? labels.byPanel.get(panelId) : labels.byPanel?.[panelId];
  return { layer: labels.layer, no: no ?? null };
}

/** The layer table row a cabinet's text layer declares itself with. */
export function labelLayerRow(labels) {
  return labels?.layer ? [{ name: labels.layer, aci: Number(labels.aci) || 7 }] : [];
}

/** Complete DXF text for one part. */
export function panelDxf(panel, drills, opts) {
  const label = opts?.label ?? labelFor(opts?.labels, panel?.id);
  const entities = panelEntities(panel, drills, { ...opts, label });
  const layers = layerTableFor(entities.map((e) => e.layer), [...(opts?.userLayers || []), ...labelLayerRow(opts?.labels)]);
  return writeDxf(entities, layers, entitiesExtents(entities));
}

/**
 * Every cut part of one unit as its own DXF.
 *
 * Door and drawer FRONTS are included: they carry the hinge cups and cup
 * screws, which are drilled on the CNC just like the carcass holes.
 *
 * @param {object} result  computeCabinet() output
 * @param {object} profile the profile the result was computed with
 * @returns {{name:string, panelId:string, dxf:string, entities:object[]}[]}
 */
export function buildUnitDxfFiles(result, profile, { userLayers = [], labels = null } = {}) {
  const unitNum = result.unitNum;
  // CHAT FIX 17.10.2026: the cabinet's text layer, declared once with its colour.
  const layerRows = [...userLayers, ...labelLayerRow(labels)];
  return result.panels
    .filter((p) => p.cnc && Array.isArray(p.cnc.outline) && p.cnc.outline.length >= 2)
    .flatMap((panel) => {
      const entities = panelEntities(panel, result.drills, { unitNum, profile, label: labelFor(labels, panel.id) });
      const layers = layerTableFor(entities.map((e) => e.layer), layerRows);
      const name = dxfFileName(unitNum, panel.id);
      const files = [{
        name,
        panelId: panel.id,
        // T78 F20 · an OUTSIDE FACE UP board's file says which setup it is
        // (cabineo-operations.json lists it); every other file is the back
        // setup it always was and says nothing new.
        ...(isOutsideFace(panel) ? { setup: 'outside' } : {}),
        entities,
        dxf: writeDxf(entities, layers, entitiesExtents(entities)),
      }];
      if (frontDecorationOf(panel)) {
        const front = frontPanelEntities(panel);
        files.push({
          name: name.replace(/\.dxf$/, '-FRONT.dxf'),
          panelId: panel.id,
          setup: 'front',
          entities: front,
          dxf: writeDxf(front, layerTableFor(front.map((e) => e.layer), [...userLayers, ...frontDecorationLayers([panel])]), entitiesExtents(front)),
        });
      }
      return files;
    });
}

/**
 * ONE DXF holding several parts, laid out exactly as the preview shows them.
 *
 * The arrangement is not recomputed here: it comes from the same
 * layoutPanels() the CNC view draws with, so "what you see is what you cut" is
 * a fact about the code, not a promise in a comment. The only thing that
 * changes is the frame — the preview works in y-DOWN sheet coordinates (an SVG
 * viewport) and a DXF is y-UP, so each part's placement is flipped once, as a
 * whole, which preserves the layout exactly.
 *
 * @param {object} args
 *   panels   the SELECTED parts, in cut-list order
 *   drills   result.drills (filtered per part inside)
 *   layout   { places, width, height } from layoutPanels()
 *   unitNum, profile
 */
export function sheetEntities({
  panels, drills, layout, unitNum, profile, sheetHeight = null, offsetY = 0, setup = 'back',
  // CHAT FIX 17.10.2026: this cabinet's text layer and numbers (dxfLabelsFor); null = yesterday's file.
  labels = null,
}) {
  const byId = new Map(layout.places.map((pl) => [pl.panel.id, pl]));
  const entities = [];
  // `sheetHeight`/`offsetY` are how a MATERIAL sheet stacks several cabinets'
  // blocks into one file (F2.1). Left out, they are this layout's own height and
  // no offset — which is the arithmetic that has produced every sheet since
  // turn 3, to the byte.
  const total = sheetHeight == null ? layout.height : sheetHeight;

  for (const panel of panels) {
    const place = byId.get(panel.id);
    if (!place) continue;
    const turn = place.bounds.turn || 0;
    const localEntities = setup === 'front' ? frontPanelEntities(panel)
      : panelEntities(panel, drills, { unitNum, profile, label: labelFor(labels, panel.id) });
    // Sheet (y-down, origin top-left) → DXF (y-up, origin bottom-left).
    let dx = place.x - place.bounds.minX;
    let dy = (total - (offsetY + place.y) - place.h) - place.bounds.minY;
    // T78 F20 · an OUTSIDE FACE UP board was reflected in its own frame by
    // `panelEntities`, so its back tenons now stand on the other side of its
    // rectangle: the slot the layout measured is the same size, but the
    // reflected geometry's own corner is what lands on it. Measured here from
    // the entities themselves, turned as the layout turns them; a board no
    // plan marked keeps the two lines above, byte for byte.
    if (setup !== 'front' && isOutsideFace(panel)) {
      let minX = Infinity; let minY = Infinity;
      const hit = (x, y) => {
        const [tx, ty] = turnPoint(x, y, turn);
        if (tx < minX) minX = tx;
        if (ty < minY) minY = ty;
      };
      for (const e of localEntities) {
        if (e.type === 'poly') for (const [x, y] of e.pts) hit(x, y);
        else if (e.type === 'circle' || e.type === 'arc') { hit(e.cx - e.r, e.cy - e.r); hit(e.cx + e.r, e.cy + e.r); }
      }
      if (Number.isFinite(minX)) {
        dx = place.x - minX;
        dy = (total - (offsetY + place.y) - place.h) - minY;
      }
    }
    // Turn 17 (CLAUDE.md F3): a part may be laid down TURNED, and the file has
    // to agree with the picture — so it is the SAME transform the preview uses
    // (engine/cnc/layout.js `turnPoint`), applied to the part's own geometry
    // before it is moved into place. A part at turn 0 goes through unchanged.
    const at = (x, y) => {
      const [tx, ty] = turnPoint(x, y, turn);
      return [tx + dx, ty + dy];
    };
    for (const e of localEntities) {
      if (e.type === 'poly') entities.push({ ...e, pts: e.pts.map(([x, y]) => at(x, y)) });
      else if (e.type === 'circle') {
        const [cx, cy] = at(e.cx, e.cy);
        entities.push({ ...e, cx, cy });
      } else if (e.type === 'arc') {
        // Turn 38 (F10): an arc turns with the board like everything else on
        // it — its centre goes through the same transform, and its two angles
        // take the turn, which is the whole of what turning a circle's sector
        // means.
        const [cx, cy] = at(e.cx, e.cy);
        entities.push({
          ...e, cx, cy, start: ((e.start + turn) % 360 + 360) % 360, end: ((e.end + turn) % 360 + 360) % 360,
        });
      } else if (e.type === 'text') {
        const [x, y] = at(e.x, e.y);
        // The caption is cut INTO the board, so it turns with the board.
        entities.push({ ...e, x, y, rot: ((e.rot || 0) + turn) % 360 });
      }
    }
  }
  return entities;
}

/**
 * `{ProjectName}-cnc-{unitNum}-{preset}-{DDMM-HHMM}.dxf` (turn 31, CLAUDE.md F5).
 *
 * The file says WHICH JOB, what is inside it and WHEN it was written. Turn 3
 * wrote `{unitNum}-cnc-{preset}.dxf`, which says two of the four and produces
 * the same name every time the same sheet is exported — the owner's "nine
 * identical filenames".
 *
 * `project` is optional so nothing that has not been handed one breaks; without
 * it the file is named after the unit alone, as it always was.
 */
export function sheetDxfFileName(unitNum, presetId, { project = null, now = new Date() } = {}) {
  if (project) {
    return exportFileName({
      project, kind: 'cnc', subject: `${unitNum}-${presetId}`, ext: 'dxf', now,
    });
  }
  const safe = `${unitNum}-cnc-${presetId}`.replace(/[^A-Za-z0-9._-]+/g, '_');
  return `${safe}.dxf`;
}

/** Complete DXF text for a whole sheet of selected parts. */
export function sheetDxf(args) {
  const entities = sheetEntities(args);
  const userLayers = args?.setup === 'front'
    ? [...(args.userLayers || []), ...frontDecorationLayers(args.panels)]
    : [...(args?.userLayers || []), ...labelLayerRow(args?.labels)];
  const layers = layerTableFor(entities.map((e) => e.layer), userLayers);
  return writeDxf(entities, layers, entitiesExtents(entities));
}

// ─── ONE BOARD, ONE FILE (turn 17, CLAUDE.md F2.1) ──────────────────────────
//
// "Choose the material, export the lot." Turn 16 gave the SHEET its material
// grouping; this is the same identity driving what leaves the app. A material
// section on screen is a stack of per-cabinet blocks (components/CncView.jsx),
// and this writes exactly that stack into one file — the blocks in the same
// order, at the same spacing, so what the joiner ticked is what he gets.
//
// It carries THE PART LABELS AND NOTHING ELSE (F2.2, delta 2). The sheet draws
// a yellow header over each section and a name over each block; those are
// SCREEN furniture — "żadnych innych liter bo to nam zaśmieca program w CNC" —
// and there is deliberately no code path here that could write one. The only
// TEXT entity any of this can emit is `panelEntities`'s single in-part label.

/**
 * @param {object} args
 *   blocks  [{ unitNum, panels, drills, layout, labels? }]: one per cabinet, in order;
 *           `labels` (17.10.2026) the cabinet's text layer and numbers (dxfLabelsFor)
 *   gap     profile.cnc.layoutGap; the blocks stand three gaps apart, exactly
 *           as the preview stacks them
 *   profile
 */
export function materialSheetEntities({ blocks = [], gap = 0, profile, setup = 'back' }) {
  const step = gap * 3;
  const height = blocks.reduce((h, b) => h + b.layout.height, 0)
    + step * Math.max(0, blocks.length - 1);
  const entities = [];
  let offsetY = 0;
  for (const block of blocks) {
    entities.push(...sheetEntities({
      panels: block.panels,
      drills: block.drills,
      layout: block.layout,
      unitNum: block.unitNum,
      profile,
      sheetHeight: height,
      offsetY,
      setup,
      labels: block.labels || null,
    }));
    offsetY += block.layout.height + step;
  }
  return entities;
}

/**
 * `{ProjectName}-cnc-{material}-{DDMM-HHMM}.dxf` (turn 31, CLAUDE.md F5).
 *
 * THE file the owner named: this is where `All-materials-cnc.dxf` came from,
 * nine times in one afternoon. The material is still in the name — the file
 * says which board goes on the bed — and the job and the minute are in front of
 * it.
 */
export function materialDxfFileName(label, { project = null, now = new Date() } = {}) {
  if (project) {
    return exportFileName({
      project, kind: 'cnc', subject: label, ext: 'dxf', now,
    });
  }
  return `${fileSafeName(label, 'material')}-cnc.dxf`;
}

/** Complete DXF text for one material's worth of parts, across every cabinet. */
export function materialSheetDxf(args) {
  const entities = materialSheetEntities(args);
  const userLayers = args?.setup === 'front'
    ? [...(args.userLayers || []), ...frontDecorationLayers((args.blocks || []).flatMap((block) => block.panels))]
    : [...(args?.userLayers || []), ...(args.blocks || []).flatMap((block) => labelLayerRow(block.labels))];
  const layers = layerTableFor(entities.map((e) => e.layer), userLayers);
  return writeDxf(entities, layers, entitiesExtents(entities));
}

// ─── Reading our own output back ───
// Used by test/dxf.test.js, and small enough to keep next to the writer so the
// two can never drift apart.

/** DXF text → [[code, value], …]. */
export function parseDxfPairs(text) {
  const lines = text.split(/\r\n|\r|\n/);
  if (lines.length && lines[lines.length - 1] === '') lines.pop();
  const pairs = [];
  for (let i = 0; i + 1 < lines.length; i += 2) pairs.push([Number(lines[i]), lines[i + 1]]);
  return pairs;
}

/**
 * DXF text → { sections, entities } where every entity is
 * { type, layer, closed?, pts?, cx?, cy?, r?, str? }.
 */
export function parseDxf(text) {
  const pairs = parseDxfPairs(text);
  const sections = [];
  const entities = [];
  const layerTable = [];
  let inEntities = false;
  let inLayerTable = false;
  let current = null;
  let expectSectionName = false;
  let expectTableName = false;

  const flush = () => {
    if (current) entities.push(current);
    current = null;
  };

  for (const [code, raw] of pairs) {
    if (expectSectionName && code === 2) { sections.push(raw); expectSectionName = false; inEntities = raw === 'ENTITIES'; continue; }
    if (expectTableName && code === 2) { inLayerTable = raw === 'LAYER'; expectTableName = false; continue; }

    if (code === 0) {
      if (raw === 'SECTION') { expectSectionName = true; continue; }
      if (raw === 'ENDSEC') { flush(); inEntities = false; continue; }
      if (raw === 'TABLE') { expectTableName = true; continue; }
      if (raw === 'ENDTAB') { inLayerTable = false; continue; }

      if (inLayerTable && raw === 'LAYER') { layerTable.push({ name: null, color: null }); continue; }

      if (!inEntities) continue;
      if (raw === 'VERTEX') continue;                    // folded into the open POLYLINE
      if (raw === 'SEQEND') { flush(); continue; }
      flush();
      if (raw === 'POLYLINE') current = { type: 'poly', layer: null, closed: false, pts: [] };
      else if (raw === 'CIRCLE') current = { type: 'circle', layer: null };
      else if (raw === 'ARC') current = { type: 'arc', layer: null };
      else if (raw === 'TEXT') current = { type: 'text', layer: null };
      else current = null;
      continue;
    }

    if (inLayerTable && layerTable.length) {
      const row = layerTable[layerTable.length - 1];
      if (code === 2 && row.name === null) row.name = raw;
      else if (code === 62) row.color = Number(raw);
      continue;
    }

    if (!current) continue;
    if (code === 8 && current.layer === null) { current.layer = raw; continue; }

    if (current.type === 'poly') {
      if (code === 70) { current.closed = Number(raw) === 1; continue; }
      // The first 10/20 pair belongs to the POLYLINE header (always 0,0 in R12);
      // every pair after it is a VERTEX.
      if (code === 10) { current._x = Number(raw); continue; }
      if (code === 20) {
        if (current._seenHeader) current.pts.push([current._x, Number(raw)]);
        else current._seenHeader = true;
        continue;
      }
    } else if (current.type === 'circle' || current.type === 'arc') {
      if (code === 10) { current.cx = Number(raw); continue; }
      if (code === 20) { current.cy = Number(raw); continue; }
      if (code === 40) { current.r = Number(raw); continue; }
      if (code === 50) { current.start = Number(raw); continue; }
      if (code === 51) { current.end = Number(raw); continue; }
    } else if (current.type === 'text') {
      if (code === 10 && current.x == null) { current.x = Number(raw); continue; }
      if (code === 20 && current.y == null) { current.y = Number(raw); continue; }
      if (code === 40) { current.h = Number(raw); continue; }
      if (code === 1) { current.str = raw; continue; }
    }
  }
  flush();

  for (const e of entities) { delete e._x; delete e._seenHeader; }
  return { sections, entities, layerTable };
}
