// ─── Manufacturer decors (BACKLOG #19, picker v1) ───
//
// The Skylon decor pack: 85 EGGER decors, collected by Piotr, shipped in the
// repo as `public/decors/egger-decors.json` plus 256 px thumbnails. This module
// is the DATA side of it — parsing, filtering, naming, and turning a chosen
// decor into a finish the appearance system already understands.
//
// ════════════════════════════════════════════════════════════════════════════
// EGGER IMAGE LICENCE — read before changing anything here
// (EGGER General Terms for Image Use; CLAUDE.md turn 5; BACKLOG #19)
//
//  1. A decor image may be shown ONLY WHOLE — the thumbnail is the entire board
//     scan reduced, which is allowed. It must never be cropped, recoloured or
//     used as part of another image.
//  2. Attribution is MANDATORY and must sit NEXT TO the image: the word EGGER
//     plus the decor code and name. `decorLabel()` below is that string, and it
//     is the only label the picker renders — there is no unattributed path.
//  3. Every decor is a reproduction: colour matching is only valid against the
//     original sample. The picker's footer says so.
//
// ─── WHAT CHANGED IN TURN 8 (Piotr's decision, 07.08.2026) ───
//
// Turn 5 read rule 2 of EGGER's terms as forbidding the scans as 3D textures
// until there is written consent, and shipped OUR OWN procedural grain tinted
// by the decor's average colour instead. Piotr has taken that decision back:
// the full-board scans are in Supabase Storage, every woodgrain row carries a
// `tex` URL, and a woodgrain decor is now rendered with the manufacturer's own
// image. His words: an end to procedural wood on decors.
//
// The decision is HIS to make — it is his workshop, his supplier relationship
// and his risk — and it is recorded here rather than argued with. What has NOT
// changed is everything the licence asks of the software: the image is shown
// whole and unedited (no crop, no recolour — `tint` is off wherever a real scan
// is used), the attribution string is mandatory and unconditional, and the
// reproduction note travels with it. BLOCKERS #44 carries the one thing code
// cannot settle: the written consent for public demo and sale.
//
// A decor with no scan — and a build with no network — still falls back to the
// procedural grain, so mock mode WORKS rather than showing white panels
// (CLAUDE.md rule 7).
// ════════════════════════════════════════════════════════════════════════════
//
// Pure functions plus one registry, exactly like engine/profile.js: the catalogue
// is a file the UI fetches (src/lib/decorCatalogue.js) and pushes in here, so
// nothing in the engine ever reaches for the network.

export const DECOR_BRAND = 'EGGER';
export const DECOR_ID_PREFIX = 'egger';

export const DECOR_CATEGORIES = [
  { id: 'uni_colour', label: 'Uni' },
  { id: 'woodgrain', label: 'Woodgrain' },
];

/**
 * The grain a woodgrain decor FALLS BACK to when it has no scan of its own, or
 * when the scan cannot be fetched (mock mode, no network, a bad URL). OURS, not
 * EGGER's. Greyscale and near-white, so multiplying it by the decor's `hex`
 * gives that decor's colour with our figure in it.
 *
 * Since turn 8 this is the second choice rather than the only one — see the
 * licence note above.
 */
export const DECOR_GRAIN_TEXTURE = 'textures/grain-neutral.png';
export const DECOR_GRAIN_REPEAT_MM = 900;

/** The footer note the picker must carry, verbatim. */
export const DECOR_DISCLAIMER = 'All decors are reproductions — colour matching only on the original sample (EGGER).';

/** One catalogue row, with everything the app needs and nothing it does not. */
export function normaliseDecor(raw, { basePath = '' } = {}) {
  if (!raw?.id || !raw?.code) return null;
  const hex = String(raw.hex || '').trim();
  return {
    id: String(raw.id),
    code: String(raw.code),
    texture: raw.texture ? String(raw.texture) : '',    // EGGER's surface code, e.g. ST37
    name: String(raw.name || raw.code),
    hex: /^#[0-9a-fA-F]{6}$/.test(hex) ? hex.toUpperCase() : '#CCCCCC',
    category: raw.category === 'uni_colour' ? 'uni_colour' : 'woodgrain',
    // The thumbnail URL as the browser will ask for it. A uni colour needs no
    // file at all — it is one flat colour, and 16 needless requests on a picker
    // that opens in a modal is 16 needless requests.
    thumb: raw.thumb ? `${basePath}${String(raw.thumb)}` : null,
    // The full-board scan (turn 8). An ABSOLUTE url — the scans live in Supabase
    // Storage, not in the repo, so `basePath` has nothing to say about it and
    // prefixing it would break every one of them. A row without one falls back
    // to the procedural grain, which is why this is `null` and not `''`.
    tex: absoluteUrl(raw.tex),
  };
}

/**
 * The scan url, or null.
 *
 * Only http(s) is accepted, and that is a rule rather than tidiness: this
 * string is handed straight to a texture loader, so a `javascript:` or `data:`
 * value in a catalogue file must not become something the page executes or
 * decodes. The catalogue ships in the repo today and will come from a database
 * tomorrow; the check costs nothing and stops being optional the moment it does.
 */
function absoluteUrl(value) {
  const text = String(value ?? '').trim();
  if (!/^https?:\/\//i.test(text)) return null;
  return text;
}

/** The shipped JSON → the catalogue. Tolerates an array or the `{decors:[…]}` shape. */
export function parseDecorCatalogue(json, { basePath = '' } = {}) {
  const rows = Array.isArray(json) ? json : (json?.decors || []);
  const decors = rows.map((r) => normaliseDecor(r, { basePath })).filter(Boolean);
  return { meta: (Array.isArray(json) ? null : json?.meta) || null, decors };
}

/**
 * The attribution string. EGGER + code + name, and the name as shipped already
 * begins with the code and surface ("H1180 ST37 Natural Halifax Oak"), so this
 * does not say H1180 twice.
 *
 * This is the ONLY label in the app for a decor — the BOM, the material list
 * and every caption in the picker use it, because a decor shown without its
 * attribution is a licence breach wherever it appears.
 */
export function decorLabel(decor) {
  if (!decor) return '';
  const name = String(decor.name || '');
  const body = name.startsWith(decor.code) ? name : `${decor.code} ${name}`.trim();
  return `${DECOR_BRAND} ${body}`;
}

/** The finish id a chosen decor is stored under: "egger:H1180_37". */
export function finishIdForDecor(decor) {
  return decor ? `${DECOR_ID_PREFIX}:${decor.id}` : null;
}

/** The decor id inside a finish id, or null when it is not a decor at all. */
export function decorIdFromFinishId(finishId) {
  const text = String(finishId ?? '');
  if (!text.startsWith(`${DECOR_ID_PREFIX}:`)) return null;
  return text.slice(DECOR_ID_PREFIX.length + 1) || null;
}

/**
 * A chosen decor as a FINISH — the shape 3d/materials.js and the panel already
 * understand (profile.appearance.finishes).
 *
 *   uni_colour → no texture at all, the flat hex. Unchanged since turn 5: one
 *                flat colour is what a uni colour IS, and an image of it would
 *                be a photograph of nothing.
 *   woodgrain  → the manufacturer's own full-board scan (turn 8, Piotr 07.08),
 *                shown whole and unedited, so `tint` is OFF — a scan multiplied
 *                by an average colour is a recoloured image, which is both a
 *                licence problem and a worse picture.
 *                With no scan, our procedural grain tinted by the hex, exactly
 *                as turn 5 did it. `fallback` carries that second answer so the
 *                view can drop to it when a download fails.
 *
 * `scanAlongGrainMm` is what one image is worth on a real board, in millimetres
 * along the grain. It is not in this module's gift — it is a calibration, and
 * calibrations are profile numbers — so the caller passes it in and the default
 * only exists so a bare call in a test still produces a usable finish.
 */
export function finishFromDecor(decor, { scanAlongGrainMm = 2800 } = {}) {
  if (!decor) return null;
  const label = decorLabel(decor);
  if (decor.category === 'uni_colour') {
    return {
      id: finishIdForDecor(decor),
      label,
      kind: 'colour',
      hex: decor.hex,
      decor,
    };
  }
  const fallback = {
    texture: DECOR_GRAIN_TEXTURE,
    repeatMm: DECOR_GRAIN_REPEAT_MM,
    tint: true,
  };
  if (!decor.tex) {
    return {
      id: finishIdForDecor(decor), label, kind: 'decor', hex: decor.hex, decor, ...fallback, fallback,
    };
  }
  return {
    id: finishIdForDecor(decor),
    label,
    kind: 'decor',
    hex: decor.hex,
    texture: decor.tex,
    // A scan is placed by its PHYSICAL size along the grain, not by a repeat
    // length: a 720 mm door then shows the piece of board it would be cut from
    // rather than a tile that reads as wallpaper.
    scanAlongGrainMm,
    // Shown whole, at its own tone — see the licence note at the top.
    tint: false,
    fallback,
    decor,
  };
}

/** Filter the grid: by category, and by a search over code and name. */
export function filterDecors(decors = [], { category = null, query = '' } = {}) {
  const needle = String(query || '').trim().toLowerCase();
  return decors.filter((d) => {
    if (category && d.category !== category) return false;
    if (!needle) return true;
    return `${d.code} ${d.texture} ${d.name}`.toLowerCase().includes(needle);
  });
}

// ─── The registry ───
// Same pattern as engine/profile.js: one read point, pushed in by the loader,
// so plain-function code (design.js, the BOM) can resolve a decor id without a
// React import or a fetch.

let catalogue = { meta: null, decors: [] };
let byId = new Map();

// How many millimetres of real board one scan is worth, along the grain. Pushed
// in from profile.appearance.decor by the loader, exactly the way the profile
// itself is pushed into the engine — so `decorFinish()` stays a plain function
// that neither imports the profile nor reaches for a store.
let scanAlongGrainMm = 2800;

export function setDecorScale(mm) {
  if (Number(mm) > 0) scanAlongGrainMm = Number(mm);
  return scanAlongGrainMm;
}

// `getDecorScale()` — LICENSED REMOVAL, 17.08.2026 (T37-F9, iron rule 4). It
// read `scanAlongGrainMm` straight back out and nothing in src/, test/ or
// scripts/ ever called it. Authorised by the owner after the dead-code audit —
// not an accident, and not a precedent for anything else in this file. The
// variable and `setDecorScale()` STAY: the loader pushes through the setter and
// `decorFinish()` reads the variable itself.

export function setDecorCatalogue(next) {
  const decors = Array.isArray(next) ? next : (next?.decors || []);
  catalogue = { meta: (Array.isArray(next) ? null : next?.meta) || null, decors };
  byId = new Map(decors.map((d) => [d.id, d]));
  return catalogue;
}

export function getDecorCatalogue() {
  return catalogue;
}

export function decorById(id) {
  return (id && byId.get(String(id))) || null;
}

/**
 * A finish id → the finish it stands for, or null when it is not a decor id
 * (or names a decor this catalogue does not have). Null is the honest answer:
 * the caller then falls back exactly as it does for any finish that no longer
 * exists, rather than rendering a blank panel.
 */
export function decorFinish(finishId) {
  const id = decorIdFromFinishId(finishId);
  if (!id) return null;
  return finishFromDecor(decorById(id), { scanAlongGrainMm });
}

// ─── Which way the grain runs (turn 8, CLAUDE.md F1) ───

/**
 * The direction the figure runs on ONE cut piece, in millimetres of that piece.
 *
 * A board is cut with the grain running its LENGTH, so the grain runs along the
 * longer of a part's two cut dimensions. That is the whole rule, and it is the
 * rule because it is what a saw operator does — not because it is convenient.
 *
 * `cnc.rotated` does not enter into it and that is deliberate rather than an
 * oversight: `rotated` says the DXF draws the part turned 90° to nest it, and
 * the part's own `w`/`h` are already the part's, not the drawing's. A workshop
 * that genuinely wants the figure across a piece says so on the piece
 * (`cnc.grain`), which is the only statement that could ever beat the saw.
 *
 * ─── TURN 37 (CLAUDE.md F7b): …AND THE PARAGRAPH ABOVE IS THE BUG ──────────
 *
 * The owner: *"CNC jest ok, ale wizualizacja nie jest — sprawdź, co ci
 * nadpisuje."* He was right and the audit found where. The sentence *"the
 * part's own `w`/`h` are already the part's, not the drawing's"* is true of
 * `w` and `h`. It is NOT true of `cnc.grain`, which is written INSIDE the
 * `cnc` block, beside `drawn_w` and `drawn_h`, and means what it says in THAT
 * frame — the CNC DRAWN frame. This function read it as if it were in the
 * panel frame, and on every part whose drawn frame is turned, that is the
 * figure painted 90° out.
 *
 * The shelf is the worked example, and it is CLAUDE.md's own: drawn
 * `530 × 560` with `grain: 'h'`, which is its 560 — the cabinet's WIDTH. This
 * function resolved `h` to the panel's own `h`, which is 530 — the DEPTH — and
 * painted the figure front-to-back on every shelf in the app.
 *
 * So the stated axis is TRANSLATED out of the drawn frame before it is used.
 * A part with no `drawn_*` is drawn in its own frame (`rectGeometry(w, h)`),
 * the translation is the identity, and nothing about it moves — which is every
 * drawer front, every plinth and every drawer bottom in the tree.
 *
 * THIS REVERSES T28-F7/T29-F1 FOR THE SHELF, deliberately and by the owner's
 * verdict: those turns pinned the shelf's figure front-to-back, which is
 * exactly what he is now looking at and calling wrong. BLOCKERS #95 is the
 * open question and this is its answer. Their tests are re-pinned, dated, with
 * the sentence that overturned them.
 *
 * @returns {{axis:'w'|'h', lengthMm:number, acrossMm:number}}
 */

/**
 * The stated grain axis, translated out of the CNC DRAWN frame into the
 * PANEL's own frame — or null when the piece states nothing.
 *
 * The drawn frame is `drawn_w × drawn_h`; the panel frame is `w × h`. When the
 * two agree the translation is the identity. When the drawing is TURNED — a
 * shelf drawn `depth × width`, a BUDR drawer side drawn `height × depth` — the
 * drawn `w` is the panel's `h` and vice versa, so the axis swaps with it.
 *
 * Matched by SIZE rather than by trusting `cnc.rotated`, because size is the
 * fact and the flag is a claim about it: a part that carries `rotated: true`
 * and a drawn frame equal to its own would otherwise be swapped for nothing.
 * Where the two dimensions are equal — a square panel — the swap cannot be
 * detected and cannot matter.
 */
function statedPanelAxis(panel) {
  const stated = panel?.cnc?.grain;
  if (stated !== 'w' && stated !== 'h') return null;
  const dw = Math.abs(Number(panel?.cnc?.drawn_w) || 0);
  const dh = Math.abs(Number(panel?.cnc?.drawn_h) || 0);
  if (!(dw > 0) || !(dh > 0)) return stated;
  const w = Math.abs(Number(panel?.w) || 0);
  const h = Math.abs(Number(panel?.h) || 0);
  // The drawn frame IS the panel frame: nothing to translate.
  if (Math.abs(dw - w) < 0.5 && Math.abs(dh - h) < 0.5) return stated;
  // The drawn frame is the panel frame TURNED: the axes trade places.
  if (Math.abs(dw - h) < 0.5 && Math.abs(dh - w) < 0.5) return stated === 'w' ? 'h' : 'w';
  // Neither — a drawn frame that is some third size (a part drawn to a
  // different outline than its cut record). There is nothing honest to
  // translate through, so the statement is taken as written rather than
  // guessed at.
  return stated;
}
/**
 * ─── TURN 37 (CLAUDE.md F5d): A SIDE STANDS UP, HOWEVER SHORT IT IS ─────────
 *
 * The owner, on the top box: *"orientacja boków jest pozioma, a powinna być
 * pionowa."* The board itself is upright — the geometry is the main
 * wardrobe's own, line for line — so what is lying down is the FIGURE, and
 * the cause is the saw rule below: a side is cut with its grain running its
 * HEIGHT, and the fallback picks whichever dimension is longer. On a 2150-tall
 * wardrobe side those are the same answer. On a 500-tall top box side, whose
 * depth is 568, they are not, and the grain went front-to-back.
 *
 * So a side is asked by its ROLE and not by its proportions, which is what
 * *"match the main wardrobe's own side law"* means: the piece stands up, the
 * figure stands up with it, and a short one is still a side.
 */
const UPRIGHT_ROLES = new Set(['side']);

export function grainRun(panel) {
  const w = Math.abs(Number(panel?.w) || 0);
  const h = Math.abs(Number(panel?.h) || 0);
  const upright = UPRIGHT_ROLES.has(panel?.role) ? 'h' : null;
  const axis = statedPanelAxis(panel) || upright || (w >= h ? 'w' : 'h');
  return {
    axis,
    lengthMm: axis === 'w' ? w : h,
    acrossMm: axis === 'w' ? h : w,
  };
}

// ─── WHICH WAY THE FIGURE RUNS IN THE IMAGE ITSELF (turn 29, CLAUDE.md F1) ──
//
// THE APP PAINTS TWO FAMILIES OF WOOD AND THEY ARE 90° APART. Turn 8 wrote one
// mapping for both, and that is F1's fault: a decor shelf's grain ran across it
// exactly when the picture came from the family the mapping was not written
// for, which is the family a machine with no network always gets.
//
//   THE MANUFACTURER'S SCAN — an EGGER full-board photograph, 2 800 mm of board
//   down a 7 937 px image and 1 310 mm across a 3 685 px one. It is PORTRAIT
//   and the grain runs down its HEIGHT, its V axis. Measured, not assumed: the
//   shipped thumbnails ("the thumbnail is the entire board scan reduced") are
//   2.5× smoother down V than across U, and `scanAlongGrainMm` — 2 800 — is the
//   image's own height in millimetres of board, which is the same sentence said
//   as a number.
//
//   OUR OWN PROCEDURAL GRAIN — `scripts/gen-textures.mjs`, the fallback a decor
//   with no scan and a build with no network both drop to (rule 7). It renders
//   the ring phase from `v` and stretches the noise along `x`, so its figure
//   runs along the image's WIDTH, its U axis. The shipped file measures 6.6×
//   smoother along U than across it.
//
// Both numbers are re-measured from the shipped assets in
// `test/turn29-f1-shelf-grain-scene.test.js`, so neither can be a belief.
//
// ─── AND IT EXPLAINS BOTH OF THE OWNER'S REPORTS ────────────────────────────
//
//   turn 13  "słoje na wieńcach biegną front-tył zamiast lewo-prawo"
//   turn 29  the shelves' grain runs left-to-right instead of front-to-back
//
// A wieniec wants its grain along its face's U and a shelf along its V, so one
// mapping applied to the wrong image family gets them wrong in OPPOSITE
// directions — which is exactly the pair of complaints, four turns apart.

/** Our own procedural grain runs along the image's width. */
export const TILE_GRAIN_AXIS = 'u';
/** A manufacturer's board scan runs down the image's height. */
export const SCAN_GRAIN_AXIS = 'v';

/**
 * Which axis of THIS finish's image the figure runs along.
 *
 * The two families are already told apart by how they are PLACED — a scan
 * carries `scanAlongGrainMm` and is laid by its physical size, a tile carries
 * `repeatMm` and repeats — so this needs no new field on a finish and no new
 * flag on a piece. It is the fact that was missing, said once.
 */
export function imageGrainAxis(surface) {
  return Number(surface?.scanAlongGrainMm) > 0 ? SCAN_GRAIN_AXIS : TILE_GRAIN_AXIS;
}

/**
 * How to lay a scan on ONE panel's biggest face.
 *
 * A panel is drawn as a box, and three.js gives a box's six faces their own
 * u/v axes: on a ±X face u runs along Z and v along Y, on ±Y u runs along X and
 * v along Z, on ±Z u along X and v along Y. The face that MATTERS is the big
 * one — the two edges are 18 mm of board and nobody reads the grain on them —
 * so the mapping is worked out for that face and the edges take what falls out.
 *
 * `grainAxis` is the CABINET's own statement: which of that face's two axes the
 * figure has to run along, decided by which of them is the piece's length along
 * the grain. It owes nothing to any image, which is the turn-29 correction:
 * turn 8 returned `rotate` from here and so decided a question about a PICTURE
 * in a function that has never been shown one. Whether the image needs a
 * quarter turn is `3d/materials.js decorPlacement`, where the finish is —
 * `grainAxis` against `imageGrainAxis(surface)`, and the fix is where the scene
 * reads it rather than a second flag beside the first.
 *
 * @param {{w:number,h:number,d:number}} box  the panel's box, in mm
 * @param {number} grainMm  the piece's length along the grain (grainRun above)
 * @returns {{widthMm:number, heightMm:number, grainAxis:'u'|'v'}}
 */
export function decorMapping(box, grainMm) {
  const w = Math.abs(Number(box?.w) || 0);
  const h = Math.abs(Number(box?.h) || 0);
  const d = Math.abs(Number(box?.d) || 0);
  const faces = [
    { area: h * d, widthMm: d, heightMm: h },   // ±X: u along Z, v along Y
    { area: w * d, widthMm: w, heightMm: d },   // ±Y: u along X, v along Z
    { area: w * h, widthMm: w, heightMm: h },   // ±Z: u along X, v along Y
  ];
  const face = faces.reduce((best, f) => (f.area > best.area ? f : best), faces[0]);
  const target = Math.abs(Number(grainMm) || 0);
  const grainAxis = Math.abs(face.widthMm - target) < Math.abs(face.heightMm - target) ? 'u' : 'v';
  return { widthMm: face.widthMm, heightMm: face.heightMm, grainAxis };
}
