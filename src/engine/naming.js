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

// ─── THE PROJECT NAMES ITS OWN FILES (turn 31, CLAUDE.md F5) ────────────────
//
// The owner, 15.08.2026: "`{ProjectName}-cnc-{DDMM-HHMM}.dxf` (sanitised),
// never `All-materials-cnc` again — nine identical filenames were half of
// yesterday's confusion. Same pattern for any other export the app writes."
//
// Nine identical filenames is the whole argument. A workshop exports the same
// sheet three times while it corrects something, opens a Downloads folder
// holding `All-materials-cnc.dxf`, `All-materials-cnc (1).dxf` and
// `All-materials-cnc (2).dxf`, and has no way on earth to tell which is the
// one to cut. Two facts fix it and both were already in the app: WHICH JOB and
// WHEN.
//
// ─── ONE PATTERN, AND IT IS ONE FUNCTION ────────────────────────────────────
//
//     {ProjectName}-{kind}[-{subject}]-{DDMM-HHMM}.{ext}
//
// `subject` is the part of the job the file is about — a cabinet number, a
// material, a view — and it is there for the same reason the stamp is: two
// exports pressed in the same minute must not collide, and the difference
// between them is worth reading off the name. The exports the owner named have
// no subject and come out exactly as he wrote them.
//
// Sanitised through `fileSafeName`, which is turn 16's and unchanged: a project
// called "Smith / kitchen 2" is a path a machine can open.

/** `DDMM-HHMM` — the family stamp, unchanged since SPEC 2. */
export function exportStamp(now = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${p(now.getDate())}${p(now.getMonth() + 1)}-${p(now.getHours())}${p(now.getMinutes())}`;
}

/**
 * The ONE name every export the app writes is built from.
 *
 * @param {object} args
 *   project  the project's name, however the joiner typed it
 *   kind     'cnc' | 'cutlist' | 'drawing' | 'render' | … — what sort of file
 *   subject  optional: which cabinet, which material, which view
 *   ext      without the dot
 *   now      injectable, so a test can pin the stamp
 */
export function exportFileName({
  project, kind, subject = null, ext, now = new Date(),
}) {
  const parts = [
    fileSafeName(project, 'project'),
    fileSafeName(kind, 'export'),
    ...(subject ? [fileSafeName(subject, '')].filter(Boolean) : []),
    exportStamp(now),
  ];
  return `${parts.join('-')}.${ext}`;
}
