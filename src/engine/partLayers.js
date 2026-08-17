// ─── A LAYER IS A NAME AND A COLOUR (turn 38, CLAUDE.md F3) ─────────────────
//
// The owner, 17.08.2026, asked whose problem a toolpath is: *"czy to już nie
// nasz problem czy to już VCarve?"* — **it is VCarve's**. So a user layer in
// this app carries NO cut/mark semantics, no depth, no tool, no diameter. It
// is a NAME and a COLOUR, the CNC operator assigns the toolpath per layer in
// VCarve exactly as he does today, and that is the whole of the feature.
//
// ─── THE NAME IS A HARD CONTRACT, SO IT IS SANITISED ────────────────────────
//
// `cnc/layers.js` opens by saying why the built-in names are never "tidied
// up": VCarve on the owner's machine maps the tool by layer NAME. A user layer
// goes into the same table and the same R12 file, so it has to be a name that
// table can hold — A–Z, 0–9 and underscore, uppercase, which is the charset
// every built-in name in this house is already written in.
//
// ─── AND THE COLOUR IS AN ACI, BECAUSE A DXF HAS NOWHERE ELSE TO PUT ONE ────
//
// An R12 LAYER row states its colour as group code 62: an AutoCAD Colour
// Index, 1–255. There is no RGB in the dialect (that arrived with AC1015, the
// version whose parser killed VCarve on 02.08.2026), so a free hex picker
// would be a promise the file cannot keep — it would have to guess a nearest
// index and the joiner would get a colour he did not choose.
//
// So the picker offers the INDEX COLOURS THEMSELVES: eleven of AutoCAD's own,
// each with the hex the screen paints it in. What is picked is what the file
// says and what the screen shows, and there is no conversion anywhere to be
// wrong.
//
// Pure functions and pure data — no React, no store, no DXF (the writer reads
// this, not the other way round).

import { CNC_LAYERS, cncLayer } from './cnc/layers.js';

/**
 * The palette. AutoCAD's own first seven, plus four of the high indices this
 * app already uses for its own layers' neighbours — every one of them an ACI
 * the R12 file can state exactly.
 */
export const USER_LAYER_COLOURS = Object.freeze([
  { aci: 1, hex: '#ff5252', label: 'Red' },
  { aci: 2, hex: '#ffd43b', label: 'Yellow' },
  { aci: 3, hex: '#69db7c', label: 'Green' },
  { aci: 4, hex: '#66d9e8', label: 'Cyan' },
  { aci: 5, hex: '#4dabf7', label: 'Blue' },
  { aci: 6, hex: '#da77f2', label: 'Magenta' },
  { aci: 7, hex: '#f0ece4', label: 'White' },
  { aci: 8, hex: '#868e96', label: 'Grey' },
  { aci: 30, hex: '#ff922b', label: 'Orange' },
  { aci: 90, hex: '#a9e34b', label: 'Lime' },
  { aci: 140, hex: '#3bc9db', label: 'Teal' },
]);

const BY_ACI = new Map(USER_LAYER_COLOURS.map((c) => [c.aci, c]));
const BUILT_IN = new Set(CNC_LAYERS.map((l) => l.name));

/** The colour row for an index, falling back to the table's own white. */
export function userLayerColour(aci) {
  return BY_ACI.get(Number(aci)) || USER_LAYER_COLOURS[6];
}

/**
 * A typed name → a name a DXF layer table can hold.
 *
 * Uppercase, A–Z 0–9 and underscore, runs of anything else collapsed to one
 * underscore, and trimmed of leading and trailing ones. A name that sanitises
 * to nothing is not a name — the caller is told so with `''` rather than being
 * handed `LAYER_1`, because a layer nobody named is a layer nobody will find
 * in VCarve.
 */
export function sanitiseLayerName(raw) {
  return String(raw ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 31);                 // the R12 table's own limit on a name
}

/**
 * Why a name cannot be used, or null.
 *
 * Deliberately a SENTENCE and not a boolean: the panel prints it, and "that
 * name is already a CNC layer" is the one thing a joiner needs to hear before
 * he draws forty holes on a layer that would have merged with the hinge cups.
 */
export function layerNameFault(raw, existing = []) {
  const name = sanitiseLayerName(raw);
  if (!name) return 'A layer needs a name — letters, digits and underscores.';
  if (BUILT_IN.has(name)) return `${name} is already one of the CNC layers.`;
  if ((existing || []).some((l) => l.name === name)) return `${name} already exists in this project.`;
  return null;
}

/** One user layer, made from what the picker collected. */
export function makeUserLayer({ name, aci }) {
  const clean = sanitiseLayerName(name);
  if (!clean) return null;
  const colour = userLayerColour(aci);
  return {
    name: clean, aci: colour.aci, screen: colour.hex, label: clean, kind: 'mark', user: true,
  };
}

/** Only the rows that really are user layers — a stored blob cannot invent one. */
export function normaliseUserLayers(raw) {
  const out = [];
  const seen = new Set(BUILT_IN);
  for (const row of Array.isArray(raw) ? raw : []) {
    const made = makeUserLayer({ name: row?.name, aci: row?.aci });
    if (!made || seen.has(made.name)) continue;
    seen.add(made.name);
    out.push(made);
  }
  return out;
}

/**
 * The whole list a picker shows: the CNC table, then this project's own.
 *
 * Built-ins FIRST and never re-ordered — a joiner reaching for `SCREWS_3MM`
 * finds it exactly where it has always been, and the project's own layers are
 * a block underneath rather than mixed through.
 */
export function allLayers(userLayers = []) {
  return [...CNC_LAYERS, ...normaliseUserLayers(userLayers)];
}

/**
 * ONE resolver for "what colour and what index is this layer", built-in or
 * not, so the canvas, the legend and the DXF layer table cannot disagree.
 */
export function resolveLayer(name, userLayers = []) {
  const own = normaliseUserLayers(userLayers).find((l) => l.name === name);
  return own || cncLayer(name);
}

/** Is this a layer the project made, as opposed to one of the app's? */
export function isUserLayer(name, userLayers = []) {
  return normaliseUserLayers(userLayers).some((l) => l.name === name);
}
