// ─── THE FAMILY FILTER BAR (turn 45, CLAUDE.md F3) ──────────────────────────
//
// The approved mockup, 23.08.2026:
//
//   *"a FAMILY filter bar (Oak, Walnut, Ash… — Egger's own taxonomy,
//   supplier-agnostic for the future)"*
//
// Eighty-five tiles is not a list anybody reads; it is a wall somebody scrolls
// past. Thirty-nine of the eighty-five are OAK, and a joiner who has been told
// "something oaky, lighter than the last one" wants those thirty-nine and
// nothing else on the screen. So the bar is the timber, not the code.
//
// ─── WHY THE FAMILY IS DERIVED AND NOT A COLUMN ─────────────────────────────
//
// `public/decors/egger/egger-decors.json` carries `category` — `uni_colour` or
// `woodgrain` — and nothing finer. The species is in the NAME, which is EGGER's
// own taxonomy written out: "H1180 ST37 Natural Halifax Oak", "H1307 ST19 Brown
// Warmia Walnut". Reading it out of the name is therefore reading the
// supplier's own word for the thing, which is exactly what F3 asks for; adding
// a `family` column to the pack would have been US inventing a taxonomy and
// then having to maintain it against theirs.
//
// SUPPLIER-AGNOSTIC FOR THE FUTURE is the other half of the sentence, and it is
// why the species list below is a plain array of words rather than an EGGER
// enum: the day a second supplier's pack lands, its "Rustic Oak" falls into Oak
// with nothing changed, and a species this list has never heard of falls into
// `other` rather than vanishing. A decor that no filter can reach is the bug
// this file exists to prevent, and `familiesInCatalogue()` proves there is none
// by only ever offering families that actually have tiles behind them.
//
// Pure — no React, no store, no engine, no network.

/**
 * The timbers, longest name first WITHIN each entry's own matcher, so
 * "Hard Maple" cannot be read as anything but Maple and "Coco Bolo" does not
 * become "Oak" on the strength of three letters in the middle of a word.
 * Matching is on WHOLE WORDS for exactly that reason.
 */
export const DECOR_SPECIES = [
  'Oak', 'Walnut', 'Ash', 'Pine', 'Maple', 'Beech', 'Birch', 'Cherry',
  'Chestnut', 'Hickory', 'Acacia', 'Eucalyptus', 'Willow', 'Elm', 'Teak',
];

// The three families that are not a timber: a plain colour, a fineline, and the
// place a species nobody has classified lands in. Not exported — they exist to
// BUILD `DECOR_FAMILIES` below and to be named by `decorFamily()`, and an export
// nothing imports is a promise this house does not make (T31 F12's sweep).
const UNI_FAMILY = { id: 'uni', label: 'Uni' };
const FINELINE_FAMILY = { id: 'fineline', label: 'Fineline' };
const OTHER_FAMILY = { id: 'other', label: 'Other' };

/** Every family this module can name, in the order the bar draws them. */
export const DECOR_FAMILIES = [
  UNI_FAMILY,
  ...DECOR_SPECIES.map((s) => ({ id: s.toLowerCase(), label: s })),
  FINELINE_FAMILY,
  OTHER_FAMILY,
];

const WORDS = (text) => String(text || '').split(/[^A-Za-z]+/).filter(Boolean);

/**
 * Which family one decor belongs to.
 *
 * A uni colour is a Uni whatever its name says — "Premium White" is not a
 * timber and a wood filter must never surface it. Everything else is asked for
 * its species by whole word; a fineline (EGGER's own name for the straight
 * synthetic grain) is its own family because it is what a client asks for by
 * that word; anything left is `other`, which is a place rather than a hole.
 *
 * @param {object} decor a normalised catalogue row
 * @returns {string} a family id from DECOR_FAMILIES
 */
export function decorFamily(decor) {
  if (!decor) return OTHER_FAMILY.id;
  if (decor.category === 'uni_colour') return UNI_FAMILY.id;
  const words = new Set(WORDS(decor.name).map((w) => w.toLowerCase()));
  for (const species of DECOR_SPECIES) {
    if (words.has(species.toLowerCase())) return species.toLowerCase();
  }
  if (words.has('fineline')) return FINELINE_FAMILY.id;
  return OTHER_FAMILY.id;
}

/**
 * The families that actually have tiles behind them, with their counts.
 *
 * The bar is built from THIS and never from `DECOR_FAMILIES` directly: a button
 * that filters to nothing is a button that lies, and a pack from a second
 * supplier will have families this repository has never seen.
 *
 * @returns {Array<{id:string,label:string,count:number}>}
 */
export function familiesInCatalogue(decors = []) {
  const counts = new Map();
  for (const d of Array.isArray(decors) ? decors : []) {
    const id = decorFamily(d);
    counts.set(id, (counts.get(id) || 0) + 1);
  }
  return DECOR_FAMILIES
    .filter((f) => counts.get(f.id) > 0)
    .map((f) => ({ ...f, count: counts.get(f.id) }));
}

/** Every decor of one family — and the whole list when no family is chosen. */
export function filterByFamily(decors = [], family = null) {
  if (!family) return Array.isArray(decors) ? decors : [];
  return (Array.isArray(decors) ? decors : []).filter((d) => decorFamily(d) === family);
}
