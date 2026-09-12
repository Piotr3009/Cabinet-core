// ─── F4.3 · THE COLLECTIONS — A PRESET, NOT A NEW MATERIAL ─────────────────
//
// CLAUDE.md F4.3, verbatim: *"**COLLECTION**: four flat swatches (Ivory & Onyx
// · Mayfair Green · Black Label · Royal Burgundy) — a PRESET applying front
// decor + carcass decor + handle default from a table in
// `src/retail/design/collections.js` that references EGGER decor ids already in
// the app's decor list (no new textures)."*
//
// EVERY ID BELOW IS IN `public/decors/egger/egger-decors.json` TODAY. Not one
// new decor, not one new texture, not one new hex invented — and
// `test/turn59-f4-the-options.test.js` reads that JSON and proves it, id by id
// and hex by hex. A collection is a way of choosing four things at once; it is
// not a material and it does not add one.
//
// ─── ON THE HEXES ──────────────────────────────────────────────────────────
//
// The standing law: *"A colour not in the token file is a violation."* The
// brief carves out exactly one exception, in F2's collection cards: *"the image
// slot a flat block of that collection's signature tone (CONTENT tones inside
// cards, not UI chrome)."* This file is the ONLY file in the retail tree that
// may hold a hex that is not a Petros token, every one of those hexes is a
// decor's own colour copied from the catalogue, and the shell test enforces
// both halves of that sentence.
//
// ─── ON EGGER ──────────────────────────────────────────────────────────────
//
// `decorLabel()` from the engine is rendered beside every swatch a client can
// choose. The licence asks for the brand, the code and the name next to the
// image, unconditionally, and the app has exactly one label function so that
// there is no unattributed path. R1 ships nothing public — the licensing gate
// stands before any publication (CLAUDE.md).

/**
 * @typedef {object} Collection
 * @property {string} id            slug used by `#/design?collection=…`
 * @property {string} name          the client-facing name
 * @property {string} line          one line of copy for the card
 * @property {string} tone          the card's flat block — the FRONT decor's own hex
 * @property {string} frontDecor    an EGGER id in the app's catalogue
 * @property {string} carcassDecor  an EGGER id in the app's catalogue
 * @property {string} handle        a handle system id from engine/handles.js HANDLE_TYPES
 * @property {boolean} [namesCarcass] T68 F1 — does this collection SPEAK for the
 *                                  carcass? See the block below. None of the four
 *                                  house collections does.
 * @property {string[]} swatches    the collection's own handful of decors (front colours)
 */

/**
 * ─── T68 F1 · A COLLECTION DRESSES THE FRONTS; THE CARCASS IS H3325 ────────
 *
 * The owner, unconditionally: *"powinien być oak H3325 … dodaj do kodu jako
 * default, na zawsze"* — and the link he was looking at when he said it
 * carried `?collection=royal-burgundy`.
 *
 * The probe (`verify/t68/f1-probe.md` §2) measured what that cost him: a fresh
 * design with ANY of the four in the URL came up on that collection's carcass
 * decor and never on the oak. Without a collection it was H3325; with one it
 * was Cashmere, Black, Graphite. His default was real and unreachable.
 *
 * CLAUDE.md F1 leaves exactly one door open — *"unless the collection
 * explicitly names a carcass decor"* — so the permission is made EXPLICIT
 * rather than implied by a field's existence. `namesCarcass` is that word.
 * NOTHING IS DELETED: every `carcassDecor` id below stays, stays catalogued by
 * `collectionDecorIds`, and stays the collection's own suggestion for the day
 * one of them is meant to speak for the box. Today none of them is, so the
 * carcass is the workshop's own default — `profile.projectSettings
 * .defaultCarcassDecorId`, H3325 ST28 Tobacco Gladstone Oak — on every fresh
 * design, with a collection and without one.
 *
 * Flip one `namesCarcass` to `true` and that collection's carcass wins again:
 * the law is a value in this table and not an `if` somewhere else.
 */
/** @type {Collection[]} */
export const COLLECTIONS = [
  {
    id: 'ivory-and-onyx',
    name: 'IVORY & ONYX',
    line: 'The house palette. Pale fronts, a dark carcass, and nothing shouting.',
    tone: '#ECE9E4',
    frontDecor: 'H3195_19',   // H3195 ST19 White Fineline
    carcassDecor: 'U999_12',  // U999 ST12 Black
    handle: 'jpull',
    swatches: ['H3195_19', 'W1000_9', 'U702_9', 'H1225_12', 'U999_12'],
  },
  {
    id: 'mayfair-green',
    name: 'MAYFAIR GREEN',
    line: 'A deep green front against cashmere. Quiet in daylight, heavy at night.',
    tone: '#15402D',
    frontDecor: 'U606_9',     // U606 ST9 Forest Green
    carcassDecor: 'U702_9',   // U702 ST9 Cashmere Grey
    handle: 'bar',
    swatches: ['U606_9', 'U699_9', 'U636_9', 'U961_7', 'U702_9'],
  },
  {
    id: 'black-label',
    name: 'BLACK LABEL',
    line: 'Black on graphite. The whole wardrobe reads as one surface.',
    tone: '#040406',
    frontDecor: 'U999_12',    // U999 ST12 Black
    carcassDecor: 'U961_7',   // U961 ST7 Graphite Grey
    handle: 'jpull',
    swatches: ['U999_12', 'H3190_19', 'U961_7', 'U963_9', 'H3198_19'],
  },
  {
    id: 'royal-burgundy',
    name: 'ROYAL BURGUNDY',
    line: 'Garnet fronts, a pale carcass, brass-weight bar handles.',
    tone: '#5F1D1F',
    frontDecor: 'U399_9',     // U399 ST9 Garnet Red
    carcassDecor: 'U702_9',   // U702 ST9 Cashmere Grey
    handle: 'bar',
    swatches: ['U399_9', 'U961_7', 'U999_12', 'U702_9', 'W1000_9'],
  },
];

export const DEFAULT_COLLECTION = COLLECTIONS[0];

export const collectionById = (id) => COLLECTIONS.find((c) => c.id === id) || null;

/** Every decor id any collection names — what the catalogue must contain. */
export const collectionDecorIds = () => [...new Set(COLLECTIONS.flatMap(
  (c) => [c.frontDecor, c.carcassDecor, ...c.swatches],
))];
