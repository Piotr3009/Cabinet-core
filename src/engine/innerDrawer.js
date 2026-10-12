// ─── T78 F16 · THE DOUBLE DRAWER: BLUM'S INNER DRAWER BEHIND A FRONT ────────
//
// The owner, 11.10.2026: *"podwojne szuflady szafki z szuflada na sztucce z
// bluma."*  Behind ONE front a deep box and, above it, a shallow inner drawer
// on its own runners: Blum's "inner drawer behind a front" (LEGRABOX, Box
// systems p. 194 onward). The numbers are the catalogue's, in
// reference/hardware/blum-inner-drawer.json (every value with its page or
// its source, `owner to confirm`); this module only reads the file the app
// hands it (`lib/hardwareCatalogue.js`), like the hinge families. Unloaded,
// every number is null and the engine refuses the double drawer in words.
//
// Pure: no React, no three.js, no store.
let CATALOGUE = null;

/** Hand the engine `reference/hardware/blum-inner-drawer.json`. Null clears it. */
export function setInnerDrawerCatalogue(raw) {
  CATALOGUE = raw && typeof raw === 'object' && raw.innerDrawers && typeof raw.innerDrawers === 'object' ? raw : null;
  return Boolean(CATALOGUE);
}

/** The loaded file, or null. Exported for the store's result cache. */
export function innerDrawerCatalogue() {
  return CATALOGUE;
}

const leafValue = (node) => (node && typeof node === 'object' && !Array.isArray(node) && 'value' in node ? node.value : node);
const leafNumber = (node) => {
  const raw = leafValue(node);
  if (raw === null || raw === undefined || raw === '') return null;
  const v = Number(raw);
  return Number.isFinite(v) ? v : null;
};

/**
 * What the double drawer needs, as the file states it: the inner drawer's box
 * side (LEGRABOX M, 90.5) and the cabinet height it takes, runner included
 * (109); the deep pull-out below (C: 177 side, 193 taken); and the sum the two
 * take together (302), which is the least a row may have. Null where the page
 * did not give it up; nothing here is a profile number.
 */
export function innerDrawerSpec() {
  const d = CATALOGUE;
  const inner = d?.innerDrawers?.M || null;
  const deep = d?.deepPullOutBelow?.C || null;
  return {
    loaded: Boolean(d),
    innerSideMm: leafNumber(inner?.drawerSideHeightMm),
    innerSpaceMm: leafNumber(inner?.spaceRequirementInCabinetMm),
    deepSideMm: leafNumber(deep?.drawerSideHeightMm),
    deepSpaceMm: leafNumber(deep?.spaceRequirementInCabinetMm),
    stackMinMm: leafNumber(d?.derived?.stackMinimumMm?.C_below_M_above),
    nominalLengthsMm: Array.isArray(d?.nominalLengthsMm?.values) ? [...d.nominalLengthsMm.values] : null,
    page: inner?.catalogue2024 || null,
    status: 'owner to confirm',
  };
}
