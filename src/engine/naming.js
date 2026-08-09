// ─── WHAT A CABINET IS CALLED (turn 16, CLAUDE.md F6) ───────────────────────
//
// "Default stays automatic (01, 02, WU05…), but it becomes EDITABLE …
// Uniqueness: duplicates allowed but flagged (a soft warning, not a block)."
//
// Both halves of that sentence are decisions, and this module is the second
// one. A name in this app is not an id — the id is `unit.id`, invisible and
// never typed — so two cabinets called "Island" break nothing: the project
// saves, the BOM builds, the DXFs are written. What it costs is a joiner
// looking at a cut list with two "Island" columns, and that is worth a word on
// the screen and nothing stronger.
//
// It is a pure function of the units so the panel, the CNC tree and a node test
// all flag the same thing.

/** The name a unit shows, with a fallback that is never empty. */
export function unitName(unit) {
  const own = String(unit?.params?.unit_num ?? '').trim();
  return own || String(unit?.id ?? '');
}

/**
 * Which names are used more than once, lower-cased.
 *
 * Case-INSENSITIVE, because "island" and "Island" are the same name on a
 * bench, and a warning that could not see that would be a warning nobody
 * trusts.
 *
 * @param {Array} units
 * @returns {Set<string>}
 */
export function duplicateUnitNames(units = []) {
  const seen = new Map();
  for (const u of units) {
    const key = unitName(u).toLowerCase();
    if (!key) continue;
    seen.set(key, (seen.get(key) || 0) + 1);
  }
  return new Set([...seen].filter(([, n]) => n > 1).map(([name]) => name));
}

/** Is THIS unit's name shared with another? */
export function isDuplicateName(unit, units = []) {
  return duplicateUnitNames(units).has(unitName(unit).toLowerCase());
}

/**
 * A name made safe for a FILENAME, without changing what it says.
 *
 * The CNC export writes `${unitNum}-${PANEL}.dxf`, and a name a joiner typed
 * may contain a slash, a colon or a space — none of which belong in a path a
 * workshop's machine has to open. Everything outside the safe set becomes a
 * hyphen, runs collapse, and the automatic names ("01", "WU05") pass through
 * UNTOUCHED — which is what keeps the export byte-identical for every project
 * that has never renamed a cabinet (rule 0).
 */
export function fileSafeName(name, fallback = 'unit') {
  const cleaned = String(name ?? '')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '');
  return cleaned || fallback;
}
