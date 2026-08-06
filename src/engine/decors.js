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
//     scan reduced, which is allowed. It must never be cropped, tiled, recoloured
//     or used as part of another image.
//  2. Attribution is MANDATORY and must sit NEXT TO the image: the word EGGER
//     plus the decor code and name. `decorLabel()` below is that string, and it
//     is the only label the picker renders — there is no unattributed path.
//  3. EGGER IMAGES MAY NOT BE USED AS 3D TEXTURES until there is written
//     consent. That is the hard one, and it is why `finishFromDecor()` never
//     returns a decor thumbnail as a texture:
//        uni_colour → the flat `hex`;
//        woodgrain  → OUR OWN procedural grain (scripts/gen-textures.mjs →
//                     public/textures/grain-neutral.png) multiplied by `hex`.
//     The figure on a 3D panel is ours; only the colour comes from EGGER.
//     `test/decors.test.js` holds that line.
//  4. Every decor is a reproduction: colour matching is only valid against the
//     original sample. The picker's footer says so.
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
 * The grain a woodgrain decor is rendered with in 3D. OURS, not EGGER's — see
 * the licence note above. Greyscale and near-white, so multiplying it by the
 * decor's `hex` gives that decor's colour with our figure in it.
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
  };
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
 * Licence rule 3 lives here: `texture` is never the decor's own image.
 *   uni_colour → no texture at all, the flat hex;
 *   woodgrain  → our procedural grain, `tint: true` so the renderer multiplies
 *                it by the hex instead of showing it at its own (grey) tone.
 */
export function finishFromDecor(decor) {
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
  return {
    id: finishIdForDecor(decor),
    label,
    kind: 'decor',
    hex: decor.hex,
    texture: DECOR_GRAIN_TEXTURE,
    repeatMm: DECOR_GRAIN_REPEAT_MM,
    // The renderer multiplies the grain by `hex` rather than showing it plain.
    tint: true,
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
  return finishFromDecor(decorById(id));
}
