// ─── TURN 33 (CLAUDE.md F11): READY-MADE DRAWER INSERTS, CATALOGUED ─────────
//
// T32 shipped the ready-made BOX; the INSERTS (cutlery trays, shoe inserts,
// belt/tie dividers) stayed free-text specs. This is the small catalogue the
// spec asks for: LABEL + NOMINAL WIDTHS, profile-listed, feeding the BOM
// line — an insert whose box interior fits a nominal now says which nominal
// to buy, in the runner ladder's own snap-below grammar.
//
// It is a catalogue of SPECS, not of articles (rule 3): no product numbers
// live here — a named spec with a nominal width is what a workshop can shop
// with, and the register (F6 T32) is where articles arrive the day the owner
// names products. Everything stays YELLOW until then. Pure functions.

/** The profile's insert catalogue, whole — [] where a profile has none. */
export function insertCatalogue(profile) {
  const rows = profile?.drawerInserts?.catalogue;
  return Array.isArray(rows) ? rows : [];
}

/**
 * The catalogue row an insert KIND resolves to, and the largest nominal
 * width not above the box's own interior — the snap-below the runner ladder
 * taught. Null where the catalogue has no row or no nominal fits: the plain
 * named spec stands, exactly as before this turn.
 *
 * @param {string} kind      'shoe' | 'belt_tie' (the F3 drawer variants)
 * @param {number} widthMm   the box interior the insert must drop into
 */
export function insertFor(kind, widthMm, profile) {
  const key = kind === 'belt_tie_glass' ? 'belt_tie' : kind;
  const row = insertCatalogue(profile).find((r) => r.id === key);
  if (!row || !Array.isArray(row.widths)) return null;
  let nominal = null;
  for (const w of [...row.widths].sort((a, b) => a - b)) {
    if (Number(w) <= Number(widthMm)) nominal = Number(w);
  }
  return nominal == null ? null : { id: row.id, label: row.label, nominal };
}
