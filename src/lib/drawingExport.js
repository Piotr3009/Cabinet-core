import jsPDFDefault from 'jspdf';
// jszip is already this project's ZIP (src/lib/cncExport.js has used it since
// turn 3) and it lives in src/lib/ for the same reason jsPDF does: the drawing
// ENGINE stays dependency-free and testable in node (CLAUDE.md rule 2).
import JSZip from 'jszip';
import { drawingLayer, layerGroups, penWidth } from '../engine/drawings/layers.js';
import { sheetToSvg } from '../engine/drawings/svg.js';
// TURN 40 (CLAUDE.md F5): the wall set's DXF, which is the ONE drawing path in
// this app that ships text — see engine/drawings/dxf.js for why it is a
// separate writer from the CNC one and not a flag on it.
import { DXF_AUTOCAD_ONLY, sheetToDxf } from '../engine/drawings/dxf.js';
import { slug } from '../engine/render.js';
import { exportFileName } from '../engine/naming.js';
import { LOGO_TYPES, dataUrlType, imageSizeOf } from '../engine/drawings/setSheet.js';
// T83 F11 · the pages of what is bound, counted as bound (`n / N`).
import { numberPages } from '../engine/drawings/wallSheets.js';
import { download } from './exporters.js';

// ─── Getting a drawing off the screen (turn 6, CLAUDE.md F7; turn 7, F1) ───
//
// SVG and PDF, from the SAME laid-out sheet. jsPDF lives here and not in
// src/engine/ so the drawing engine stays dependency-free (CLAUDE.md rule 2)
// and the whole of it — geometry, sheet, layers, SVG — is testable in node.
//
// The PDF is drawn with real vectors rather than an embedded raster: a joiner
// prints this and works off it, and a 150 dpi picture of a drawing is not a
// drawing.
//
// Turn 7 adds the BOOKLET: one PDF, a page per unit, and it is the same
// function with a list instead of a sheet. There is no second renderer for it —
// `drawSheet` below draws one page and the booklet calls it n times, so a
// booklet page cannot come out looking different from the single card.

/**
 * jsPDF ships CJS. Vite's interop hands back the constructor as the default
 * export; node's hands back the module object, and `new` on that throws. One
 * line, so a node test can count the pages of a booklet — which is the only way
 * "the PDF really is n pages long" gets checked by anything other than a
 * browser.
 */
const jsPDF = jsPDFDefault?.jsPDF || jsPDFDefault;

/**
 * `{ProjectName}-drawing-{unit}-{view}-{DDMM-HHMM}.{ext}` (turn 31, CLAUDE.md F5).
 *
 * "Same pattern for any other export the app writes." A drawing already said
 * which job and which cabinet; what it did not say is WHEN, so exporting the
 * same elevation twice after a correction produced two identical names and the
 * same afternoon the owner lost to `All-materials-cnc`.
 */
export function drawingFilename({
  project, unit, view = 'front-elevation', ext = 'svg', now = new Date(),
}) {
  return exportFileName({
    project, kind: 'drawing', subject: `${slug(unit, 'unit')}-${slug(view, 'view')}`, ext, now,
  });
}

/** `{ProjectName}-unit-cards-{DDMM-HHMM}.pdf` — the whole job in one document. */
export function bookletFilename({ project, ext = 'pdf', now = new Date() }) {
  return exportFileName({
    project, kind: 'unit-cards', ext, now,
  });
}

export function exportDrawingSvg(sheet, { project, unit, view = 'front-elevation' }) {
  const svg = sheetToSvg(sheet, { kind: view });
  const filename = drawingFilename({ project, unit, view, ext: 'svg' });
  download(filename, new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  return { filename, svg };
}

/**
 * The same sheet as a PDF, at its true paper size.
 *
 * jsPDF measures from the TOP-LEFT and the sheet is held Y-up, so this flips
 * once at the boundary and never again — the same bargain the SVG renderer
 * makes, for the same reason.
 */
export function exportDrawingPdf(sheet, { project, unit, view = 'front-elevation' }) {
  const doc = newDoc(sheet);
  drawSheet(doc, sheet);
  const filename = drawingFilename({ project, unit, view, ext: 'pdf' });
  doc.save(filename);
  return { filename, doc, pages: 1 };
}

/**
 * Every unit of the project, one page each, in one PDF.
 *
 * Pages may differ in size and orientation — a wardrobe turns the paper and a
 * base unit does not — and jsPDF takes both per `addPage`, so a booklet is not
 * forced onto one shape to keep the code simple.
 *
 * @param {Array} sheets  laid-out sheets, in the order they should be bound
 * @returns {{filename:string, doc:object, pages:number}}
 */
export function exportBookletPdf(sheets, { project }) {
  const doc = bookletDoc(sheets);
  const filename = bookletFilename({ project });
  doc.save(filename);
  return { filename, doc, pages: doc.getNumberOfPages() };
}

/**
 * The document itself, without writing it anywhere.
 *
 * Split out from the export so a node test can count the pages: `doc.save()`
 * reaches for a filesystem or a browser download, and neither belongs in a
 * test whose question is "did the booklet come out n pages long".
 */
export function bookletDoc(sheets) {
  const pages = sheets.filter(Boolean);
  if (!pages.length) throw new Error('There is nothing to draw yet — add a unit first.');

  const doc = newDoc(pages[0]);
  pages.forEach((sheet, i) => {
    if (i > 0) {
      doc.addPage([sheet.width, sheet.height], sheet.width >= sheet.height ? 'landscape' : 'portrait');
    }
    drawSheet(doc, sheet);
  });
  return doc;
}

function newDoc(sheet) {
  return new jsPDF({
    unit: 'mm',
    format: [sheet.width, sheet.height],
    orientation: sheet.width >= sheet.height ? 'landscape' : 'portrait',
  });
}

// ─── T81 F8 · THE LAYERS, AS THE PDF'S OWN ───────────────────────────────
// The owner, 22.10.2026 (22:56): *"6 nie export do dxf, zrob layery wedlug
// cabinet core"*. Every layer a sheet draws becomes one named optional content
// group, the layers a PDF reader lists and switches. jsPDF 2.5 has no public
// call for them, so they are written through its own document events: one
// /OCG object per layer before the resource dictionary, the /Properties that
// names them in it, the catalog's /OCProperties, and each layer's drawing
// marked `/OC /<tag> BDC ... EMC` on the page.
const OCG = new WeakMap();

function optionalContent(doc) {
  if (OCG.has(doc)) return OCG.get(doc);
  const api = doc.internal;
  if (!api?.events?.subscribe || typeof api.newObject !== 'function' || typeof api.write !== 'function') {
    OCG.set(doc, null);
    return null;
  }
  const names = [];
  const objs = new Map();
  const tag = (name) => `CC${names.indexOf(name) + 1}`;
  const refs = () => names.map((name) => `${objs.get(name)} 0 R`).join(' ');
  api.events.subscribe('putResources', () => {
    for (const name of names) {
      objs.set(name, api.newObject());
      api.write(`<< /Type /OCG /Name (${name}) >>`);
      api.write('endobj');
    }
  });
  // Written inside jsPDF's own /XObject dictionary, after every image it
  // lists: that dictionary is closed, the layers' /Properties stand beside it,
  // and an empty dictionary under a key no reader asks for takes jsPDF's own
  // closing bracket. The image writer subscribes when the first picture is
  // drawn, so this one is subscribed again as each build begins, to run last.
  const properties = () => {
    if (!names.length) return;
    api.write(`>> /Properties << ${names.map((name) => `/${tag(name)} ${objs.get(name)} 0 R`).join(' ')} >> /CCLayers <<`);
  };
  let token = null;
  api.events.subscribe('buildDocument', () => {
    if (token) api.events.unsubscribe(token);
    token = api.events.subscribe('putXobjectDict', properties);
  });
  api.events.subscribe('putCatalog', () => {
    if (!names.length) return;
    api.write(`/OCProperties << /OCGs [${refs()}] /D << /Name (Cabinet Core) /Order [${refs()}] /ON [${refs()}] /OFF [] >> >>`);
  });
  const oc = {
    names,
    begin(name) {
      if (!names.includes(name)) names.push(name);
      api.write(`/OC /${tag(name)} BDC`);
    },
    end() { api.write('EMC'); },
  };
  OCG.set(doc, oc);
  return oc;
}

/** One laid-out sheet onto the CURRENT page of a jsPDF document. */
function drawSheet(doc, sheet) {
  const { width, height } = sheet;
  const flip = (y) => height - y;

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, width, height, 'F');

  // T81 F8: the layers in the pen order the table gives, each one group.
  const oc = optionalContent(doc);
  for (const [layer, ents] of layerGroups(sheet.entities)) {
    if (oc) oc.begin(layer);
    for (const e of ents) {
      const L = drawingLayer(e.layer);
      const [r, g, b] = hexToRgb(L.colour);
      doc.setDrawColor(r, g, b);
      doc.setTextColor(r, g, b);
      // T41-F5a: the same single resolver the SVG uses, so the PDF and the
      // screen cannot disagree about how heavy a line is.
      doc.setLineWidth(penWidth(e));
      const dash = !e.solid && (e.hidden || L.dash) ? (L.dash || [5, 3]) : null;
      // setLineDashPattern is jsPDF 2.x; guarded because a dashed line that
      // throws would cost the whole document.
      if (typeof doc.setLineDashPattern === 'function') doc.setLineDashPattern(dash || [], 0);

      if (e.kind === 'line') {
        doc.line(e.x1, flip(e.y1), e.x2, flip(e.y2));
      } else if (e.kind === 'rect') {
        // T71: a filled rect fills; everything older strokes exactly as before.
        if (e.fill) {
          const [fr, fg, fb] = e.fill === 'white' ? [255, 255, 255] : hexToRgb(e.fill);
          doc.setFillColor(fr, fg, fb);
          doc.rect(e.x, flip(e.y + e.h), e.w, e.h, e.noStroke ? 'F' : 'FD');
        } else {
          doc.rect(e.x, flip(e.y + e.h), e.w, e.h, 'S');
        }
      } else if (e.kind === 'circle') {
        doc.circle(e.cx, flip(e.cy), e.r, 'S');
      } else if (e.kind === 'poly') {
        // T71: a closed run of points; filled where the sheet says so (the
        // perspective's faces, the arrowheads). `lines` takes deltas.
        const pts = e.pts || [];
        if (pts.length >= 2) {
          const [x0, y0] = pts[0];
          const deltas = [];
          for (let i = 1; i < pts.length; i += 1) deltas.push([pts[i][0] - pts[i - 1][0], -(pts[i][1] - pts[i - 1][1])]);
          let style = 'S';
          if (e.fill) {
            const [fr, fg, fb] = e.fill === 'white' ? [255, 255, 255] : hexToRgb(e.fill);
            doc.setFillColor(fr, fg, fb);
            style = e.noStroke ? 'F' : 'FD';
          }
          doc.lines(deltas, x0, flip(y0), [1, 1], style, !e.open);
        }
      } else if (e.kind === 'image' && e.href) {
        // T71: the render on the visualisation sheet. A data URL from the scene;
        // anything jsPDF cannot read is skipped rather than failing the booklet.
        // T82 F20: and the logo in the title strip, an SVG one by its raster.
        try {
          const picture = pdfImageOf(e);
          if (!picture) throw new Error('an SVG picture with no PNG beside it: jsPDF reads PNG and JPEG');
          doc.addImage(picture, e.x, flip(e.y + e.h), e.w, e.h);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn('[drawings] image skipped', err);
        }
      } else if (e.kind === 'text') {
        if (typeof doc.setLineDashPattern === 'function') doc.setLineDashPattern([], 0);
        // jsPDF sizes text in POINTS whatever the document unit is.
        doc.setFontSize(e.height * 2.8346);
        const opts = { align: e.align === 'left' ? 'left' : (e.align === 'right' ? 'right' : 'center'), baseline: 'middle' };
        if (e.rotate) opts.angle = -e.rotate;
        // T71: a masked text stands on white, so a number can sit on a line.
        if (e.mask && !e.rotate) {
          const mw = String(e.text).length * e.height * 0.62 + e.height * 0.6;
          const mh = e.height * 1.3;
          const mx = e.align === 'left' ? e.x - e.height * 0.3 : (e.align === 'right' ? e.x - mw + e.height * 0.3 : e.x - mw / 2);
          doc.setFillColor(255, 255, 255);
          doc.rect(mx, flip(e.y) - mh / 2, mw, mh, 'F');
        }
        if (e.colour) { const [cr, cg, cb] = hexToRgb(e.colour); doc.setTextColor(cr, cg, cb); }
        doc.setFont(undefined, e.weight === 'bold' ? 'bold' : 'normal');
        if (opts.angle) {
          // T82 F21, after the review: a turned text is anchored here, not by jsPDF (below).
          const [ox, oy] = turnedTextOrigin(doc, String(e.text), e.x, flip(e.y), opts.angle, opts.align);
          doc.text(String(e.text), ox, oy, { angle: opts.angle });
        } else {
          doc.text(String(e.text), e.x, flip(e.y), opts);
        }
      }
    }
    if (oc) oc.end();
  }
  return doc;
}

/**
 * ─── T82 F21, AFTER THE REVIEW · A TURNED FIGURE PRINTS WHERE THE DRAWING PUTS IT
 *
 * The owner, 25.10.2026, 11:40: *"musze miec dzisiaj profesjonalne rysunki
 * dla klientow"*, and the drawings are the model. jsPDF applies `align` and
 * `baseline` along the PAGE's axes and only then turns the text about the
 * point it reached, so every figure up a vertical chain printed about 3 mm
 * across its line and 1.3 mm along it from where the sheet (and its collision
 * law) put it. So the anchor is turned here: back along the text's own line
 * by its alignment's share of the width (jsPDF's own getTextWidth), and
 * across it by jsPDF's own 'middle' offset (half the size, less the
 * line-height descent), then jsPDF is handed the baseline origin with the
 * angle and no alignment. A flat text never comes here and prints as before.
 *
 * @param {number} angle  jsPDF's degrees, counter-clockwise on the paper
 * @returns {[number, number]} the baseline origin, jsPDF's frame (Y down)
 */
export function turnedTextOrigin(doc, s, x, y, angle, align) {
  const a = (angle * Math.PI) / 180;
  const along = [Math.cos(a), -Math.sin(a)];
  const down = [Math.sin(a), Math.cos(a)];
  const share = align === 'center' ? 0.5 : (align === 'right' ? 1 : 0);
  const w = doc.getTextWidth(s) * share;
  const h = doc.getFontSize() / doc.internal.scaleFactor;
  const lift = h / 2 - h * (doc.getLineHeightFactor() - 1);
  return [x - along[0] * w + down[0] * lift, y - along[1] * w + down[1] * lift];
}

function hexToRgb(hex) {
  const h = String(hex).replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [
    parseInt(full.slice(0, 2), 16) || 0,
    parseInt(full.slice(2, 4), 16) || 0,
    parseInt(full.slice(4, 6), 16) || 0,
  ];
}

// ─── T82 F20 · THE LOGO, READ IN THE BROWSER AND EMBEDDED IN THE PDF ────────
//
// The owner, 25.10.2026, 11:40: *"do tego dodawanie loga do rysunkow musze
// miec dzisiaj profesjonalne rysunki dla klientow"*. The sheet draws the logo
// as an `image` entity (engine/drawings/setSheet.js titleStrip); the SVG
// preview and the SVG file take its picture as it is, a vector stays a
// vector. jsPDF embeds PNG and JPEG and no SVG, so an SVG logo is drawn ONCE,
// when it is chosen, through a canvas into a PNG `profile.drawings.set.logo
// .maxPx` on its long side, and that PNG rides beside it as `raster`: the PDF
// embeds the raster, synchronously, in the same pass as every other entity.

/**
 * The picture the PDF embeds for an image entity: its `raster` when it has
 * one (the SVG logo's PNG), else the picture itself, and null for an SVG with
 * no raster (skipped in words on the console, the page still binds).
 */
export function pdfImageOf(e) {
  if (/^image\/(png|jpeg)$/.test(dataUrlType(e?.raster))) return e.raster;
  if (dataUrlType(e?.href) === 'image/svg+xml') return null;
  return e?.href || null;
}

/** The type a chosen file is, by its own word or by its name. */
function logoTypeOf(file) {
  const said = String(file?.type || '').toLowerCase();
  if (LOGO_TYPES.includes(said)) return said;
  const ext = (/\.([a-z0-9]+)$/i.exec(String(file?.name || '')) || [])[1]?.toLowerCase();
  return { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', svg: 'image/svg+xml' }[ext] || '';
}

/** The browser's three hands: read a file, load a picture, draw it smaller. */
function browserLogoEnv() {
  return {
    readAsDataURL: (file) => new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result || ''));
      r.onerror = () => reject(r.error || new Error('the file could not be read'));
      r.readAsDataURL(file);
    }),
    loadImage: (href) => new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('the browser could not draw it'));
      img.src = href;
    }),
    draw: (img, w, h, type) => {
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      return canvas.toDataURL(type, 0.92);
    },
  };
}

/**
 * A LOGO FILE, READ FOR THE TITLE BLOCK (the Drawings window's "Choose
 * image"). A PNG or a JPG larger than `maxPx` on its long side is drawn down
 * to it (24 mm at 400 px is past 400 dpi on the paper); an SVG keeps its own
 * text for the sheet and gains its PNG for the PDF. What is kept may be at
 * most `maxKb` as data URLs, because it is kept in this computer's storage
 * (once, beside the company memory: `lib/projectLibrary.js keepLogo`; a job
 * carries only its `{ ref }`); past that the window says so and keeps nothing.
 *
 * @param {File} file
 * @param {object} profile    reads `drawings.set.logo { maxPx, maxKb }`
 * @param {object} [env]      the browser's hands (a node test hands its own)
 * @returns {Promise<{href:string, width:number, height:number, raster?:string}>}
 * @throws {Error} a sentence the window puts on the glass
 */
export async function readLogoFile(file, profile, env = browserLogoEnv()) {
  const { maxPx, maxKb } = profile.drawings.set.logo;
  const name = String(file?.name || 'the file');
  const type = logoTypeOf(file);
  if (!type) throw new Error(`A logo is a PNG, JPG or SVG picture; ${name} is not one.`);
  let href = await env.readAsDataURL(file);
  // A file the system did not type reads as octet-stream: it is named by its own extension.
  if (dataUrlType(href) !== type) href = href.replace(/^data:[^;,]*/i, `data:${type}`);
  let img;
  try { img = await env.loadImage(href); } catch (err) {
    throw new Error(`${name} could not be read as a picture (${drawingErrorText(err)}).`);
  }
  const size = imageSizeOf(href) || { width: Number(img?.naturalWidth) || 0, height: Number(img?.naturalHeight) || 0 };
  if (!(size.width > 0 && size.height > 0)) throw new Error(`${name} does not say how big it is; save it with a width and a height and choose it again.`);
  const long = Math.max(size.width, size.height);
  const at = (k) => [Math.max(1, Math.round(size.width * k)), Math.max(1, Math.round(size.height * k))];
  const logo = { href, width: size.width, height: size.height };
  try {
    if (type === 'image/svg+xml') {
      const [w, h] = at(maxPx / long);
      logo.raster = env.draw(img, w, h, 'image/png');
    } else if (long > maxPx) {
      const [w, h] = at(maxPx / long);
      logo.href = env.draw(img, w, h, type);
      logo.width = w;
      logo.height = h;
    }
  } catch (err) {
    throw new Error(`${name} could not be drawn into a picture for the PDF in this browser (${drawingErrorText(err)}); save it as a PNG and choose that.`);
  }
  const kb = Math.ceil((logo.href.length + (logo.raster || '').length) / 1024);
  if (kb > maxKb) {
    throw new Error(`${name} is ${kb} KB as the title block would keep it; a logo is kept up to ${maxKb} KB. Save it smaller and choose it again.`);
  }
  return logo;
}


// ─── THE WALL DRAWINGS (turn 40, CLAUDE.md F5) ──────────────────────────────
//
// *"Output as PDF, in the Output menu beside the existing Unit Card. DXF 2D as
// a SEPARATE output, same geometry, with text."*
//
// Both are the SAME laid-out sheets — `engine/drawings/wallSheets.js` builds
// them once and these two bind them. There is no second geometry for the DXF,
// which is what "same geometry" means and what stops the two files disagreeing
// about a wall after a correction.

/** `{ProjectName}-wall-drawings-{DDMM-HHMM}.pdf` — the whole set, bound. */
export function wallDrawingsFilename({ project, ext = 'pdf', now = new Date() }) {
  return exportFileName({ project, kind: 'wall-drawings', ext, now });
}

/**
 * ─── TURN 42 (CLAUDE.md F0): "SAVED" IS A MEASUREMENT, NOT A CLAIM ──────────
 *
 * The owner, 19/20.08.2026: *"pdf w ogóle nie zadziałał — coś się znowu
 * zablokowało."* This is the only feature in the app whose output is PAPER a
 * workshop hands to a client, and everything about the path before tonight was
 * a claim: the modal caught a crash and showed an empty set, the menu path
 * relabelled an error as emptiness, and THIS function announced `Saved …` on
 * the strength of having called `doc.save()`.
 *
 * F0's own law, applied to the product and not only to its test: *"assert the
 * EXPORTED BYTES … never the array's length alone."* So the document is
 * serialised and LOOKED AT before the toast is allowed to say the word saved —
 * the header really is `%PDF`, and the page count really is the sheet count.
 * Anything else THROWS, into a catch that now speaks (DrawingModal.jsx,
 * ConfiguratorPage.jsx), and the joiner is told rather than reassured.
 *
 * It costs one extra serialisation of a document that is tens of kilobytes.
 * That is the price of never again printing "Saved" over a file that is not
 * a PDF.
 */
export const PDF_MAGIC = '%PDF';

/** The document as bytes, which is the only form worth asserting anything about. */
export function pdfBytes(doc) {
  return new Uint8Array(doc.output('arraybuffer'));
}

/**
 * The two questions F0 asks of an exported PDF, asked of the BYTES.
 *
 * @throws {Error} named, so the reporting catches downstream have something to
 *                 put on the screen that a person can act on.
 */
export function assertPdfBytes(bytes, { pages, sheets, what = 'The PDF' }) {
  const head = String.fromCharCode(...(bytes || []).slice(0, PDF_MAGIC.length));
  if (head !== PDF_MAGIC) {
    throw new Error(`${what} did not come out as a PDF — it starts "${head}", not "${PDF_MAGIC}".`);
  }
  if (sheets != null && pages !== sheets) {
    throw new Error(`${what} came out ${pages} page${pages === 1 ? '' : 's'} long for ${sheets} sheet${sheets === 1 ? '' : 's'}.`);
  }
  return { bytes: bytes.length, pages };
}

/**
 * The wall set as one PDF: a page per sheet, in the order they were built —
 * Wall A /1, Wall A /2, Wall B /1, …, then the horizontal section.
 *
 * T83 F11 (*"daj mozliwosc exportowania tylko naprzyklad frontow lub cos
 * takiego, nie koniecznie wszystkie strony na raz"*): `sheets` is whatever
 * the window ticked, in the set's order, and each page's SHEET cell counts
 * the pages bound (`numberPages`): three sheets of nine print 01 / 03 to
 * 03 / 03. The whole set bound in order prints exactly what it printed.
 */
export function exportWallDrawingsPdf(sheets, { project }) {
  const pages = numberPages((sheets || []).filter(Boolean));
  const doc = bookletDoc(pages);
  // T42-F0: looked at, not assumed. See the note above.
  const measured = assertPdfBytes(pdfBytes(doc), {
    pages: doc.getNumberOfPages(), sheets: pages.length, what: 'The wall drawings PDF',
  });
  const filename = wallDrawingsFilename({ project });
  doc.save(filename);
  return { filename, doc, pages: doc.getNumberOfPages(), bytes: measured.bytes };
}

/**
 * ─── TURN 42 (CLAUDE.md F0): AN ERROR IS NEVER RELABELLED AS EMPTINESS ──────
 *
 * Both wall paths ended in `err.message || 'Nothing to draw yet.'`, so an error
 * whose message happens to be empty — a `TypeError` thrown by a minified frame,
 * a rejected promise carrying a string, an `AbortError` — was reported to the
 * joiner as "there is nothing here", which is the one thing it definitely was
 * not. CLAUDE.md: *"if `err.message` is empty, show the error's NAME — never
 * the emptiness sentence."*
 *
 * There is deliberately no fallback to any sentence about emptiness in this
 * function. The last resort is the word `unknown`, which is at least true.
 */
export function drawingErrorText(err) {
  const message = String(err?.message ?? '').trim();
  if (message) return message;
  const name = String(err?.name ?? '').trim();
  if (name) return `${name} (no message)`;
  const text = String(err ?? '').trim();
  if (text && text !== '[object Object]') return text;
  return 'an unknown error (the browser gave no message — see the console)';
}

/**
 * The same set as DXF, one file per sheet, in a ZIP.
 *
 * ONE FILE PER SHEET rather than one file with everything on it, because that
 * is what a wall drawing IS — AutoCAD opens a drawing, not a booklet — and
 * because a sheet's coordinates are its own paper's.
 *
 * Every file carries the warning ON THE DRAWING as well as in its name, which
 * is the point: a note in a menu is read once, a note in the file is read by
 * whoever opens it.
 */
export async function exportWallDrawingsDxf(sheets, { project }) {
  const pages = (sheets || []).filter((s) => s && s.sheet);
  if (!pages.length) throw new Error('There is nothing to draw yet — add a unit first.');
  // T83 F11 · the ticked sheets, each title strip counting the files bound, as the PDF's pages.
  const numbered = numberPages(pages.map((s) => s.sheet));

  const zip = new JSZip();
  const names = [];
  for (const [i, page] of pages.entries()) {
    const name = `${slug(page.name, 'sheet')}-autocad-only.dxf`;
    names.push(name);
    const sheet = numbered[i];
    // T81 F8: the painter's white is a fill with no stroke; R12 has no word for
    // a fill, so it leaves the file as dxf.js leaves every fill (no outline).
    zip.file(name, sheetToDxf({ ...sheet, entities: (sheet.entities || []).filter((e) => e.layer !== 'MASK') }));
  }
  // The warning travels with the files as well as ON them, because the person
  // who unzips this is not always the person who opens a sheet.
  zip.file('READ-ME-FIRST.txt', [
    DXF_AUTOCAD_ONLY,
    '',
    'These sheets carry TEXT - dimensions, labels and a title block - because a',
    'drawing is nothing without them. VCarve\'s DXF parser crashes on text styles',
    '(02.08.2026), so do not send these to the machine. The CNC export is a',
    'separate path and still ships no text of any kind.',
    '',
  ].join('\r\n'));

  const blob = await zip.generateAsync({
    type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 },
  });
  const filename = wallDrawingsFilename({ project, ext: 'zip' });
  download(filename, blob);
  return { filename, files: names };
}
