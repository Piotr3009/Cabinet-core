// ─── THE COMPANY'S OWN DEFAULTS (turn 22, CLAUDE.md F2b) ────────────────────
//
// The owner's design, and the sentence he used for it: *the missing storey
// between the code and the project.*
//
// Until now this app had three storeys. The PROFILE is the workshop's
// engineering — every millimetre the engine computes with. The PROJECT is this
// job. The ELEMENT is this piece of this job. What was missing is the one in
// between: "we fit onyx CLIP tops on the knock-in plate and TIP-ON runners",
// which is not a number the engine computes with and is not a fact about one
// kitchen either. It was being retyped into every project, or forgotten.
//
// ─── WHAT MAY LIVE HERE, AND WHAT MAY NOT ───────────────────────────────────
//
// CLAUDE.md F2b.1 draws the line and it is the important part of this file:
//
//   "ONLY preferences a rule cannot infer — never anything a rule computes
//    (hinge ANGLE stays derived from front thickness; writing it here is
//    forbidden and the validator rejects it)."
//
// So the test is not "is this a hinge fact" but "does something in this app
// already KNOW this?" The angle is known — `hingeAngleFor` reads it off the
// front's thickness — and a workshop preference that argued with it would be
// the app overruling its own arithmetic on the strength of a saved dropdown.
// `validateCompanyDefaults` refuses those keys by name, and `sql/004_tura22.sql`
// says the same thing again as a CHECK constraint, because the application is
// not the only way into a table.
//
// ─── ONE CASCADE ────────────────────────────────────────────────────────────
//
// "Cascade: profile → company row → project → element, later wins, exactly one
// implementation." `cascade()` below is that implementation, and every resolver
// in the app calls it — `engine/hinges.js` for the system, the finish and the
// plate, `engine/runners.js` for the variant. None of them keeps a private
// ladder of `||`s any more, which is what makes the new storey arrive
// everywhere at once instead of in the three places somebody remembered.
//
// With NO ROW the cascade is the ladder that was there before, evaluated in the
// same order over the same values — which is why golden defaults come out of
// the CNC export byte-for-byte unchanged.
//
// Pure functions. No React, no store, no network.

export const COMPANY_DEFAULTS_SCHEMA = 1;

/**
 * The shape of the row. Every value is `null` for "the workshop has not said",
 * which is the same null every other layer in this app uses for it.
 */
export const DEFAULT_COMPANY_DEFAULTS = {
  schema: COMPANY_DEFAULTS_SCHEMA,
  hinge_system: null,
  hinge_finish: null,       // nickel | onyx
  plate: null,              // the mounting plate the shop drills for
  runner_variant: null,     // T | S
  // Per-family board defaults: what a wardrobe is built from in this shop, and
  // what a kitchen is. Thicknesses and stock ids — never a rule.
  boards: {},
};

/** The families a `boards` entry may be keyed on — `engine/types.js` families. */
export const BOARD_FAMILIES = ['kitchen', 'wardrobe'];

/** What ONE family's board preference may say. */
export const BOARD_KEYS = ['carcass_thickness', 'front_thickness', 'carcass_material_id', 'front_material_id'];

/**
 * Keys a RULE owns. Writing one here is forbidden and the validator says so
 * out loud rather than dropping it quietly: a workshop that typed a hinge angle
 * into a defaults screen has misunderstood something, and silence would leave
 * it misunderstood.
 *
 * Spelled in every casing the app and the database use, because this list is
 * read against whatever somebody actually stored.
 */
export const RULE_OWNED_KEYS = [
  'hinge_angle', 'hingeAngle', 'angle',
  'hinge_count', 'hinge_centres', 'hinge_positions', 'hingeStandard',
  'drilling', 'cup_diameter', 'cup_depth', 'cupDiameter',
];

/**
 * ─── THE CASCADE ────────────────────────────────────────────────────────────
 *
 * `levels` is profile → company → project → element, in that order, and the
 * LAST usable answer wins. "Usable" is `allowed`'s job: a stored value the
 * workshop no longer offers is not an override, it is a stale field, and the
 * ladder simply carries on to the answer below it — which is the rule every
 * resolver in this app already followed on its own.
 *
 * @param {Array} levels     [profile, company, project, element], any of them
 *                           null/undefined for "this layer has not said"
 * @param {object} args
 *   allowed     a Set (or array) of acceptable values, or null for "anything"
 *   normalise   (v) => v, applied before the check — lower-casing a finish,
 *               upper-casing a runner variant
 * @returns the winning value, or null when nothing in the ladder is usable
 */
export function cascade(levels, { allowed = null, normalise = null } = {}) {
  const ok = allowed == null
    ? () => true
    : (v) => (allowed instanceof Set ? allowed.has(v) : allowed.includes(v));
  let answer = null;
  for (const level of levels || []) {
    if (level == null || level === '') continue;
    const value = normalise ? normalise(level) : level;
    if (value == null || value === '') continue;
    if (!ok(value)) continue;
    answer = value;
  }
  return answer;
}

/** The four layers, named — so a caller cannot get the ORDER wrong by hand. */
export function levelsOf({
  profile = null, company = null, project = null, element = null,
} = {}) {
  return [profile, company, project, element];
}

/**
 * Validate a stored row.
 *
 * @returns {{value:object, rejected:Array<{key:string, why:string}>}}
 *   `value` is always a usable row — an unusable field is dropped, never
 *   thrown, because a defaults screen that refuses to open because of one bad
 *   key is a defaults screen nobody can fix.
 */
export function validateCompanyDefaults(raw, profile) {
  const rejected = [];
  const source = raw && typeof raw === 'object' ? raw : {};
  const value = { ...DEFAULT_COMPANY_DEFAULTS, boards: {} };

  // ── the forbidden keys, first and by name ──
  for (const key of Object.keys(source)) {
    if (RULE_OWNED_KEYS.includes(key)) {
      rejected.push({
        key,
        why: 'a rule owns this — the hinge angle follows the front’s thickness, and a preference cannot overrule arithmetic',
      });
    }
  }

  const C = profile?.hardware?.hinge?.cliptop;
  const M = profile?.hardware?.runner?.movento;

  const pick = (key, { allowed = null, normalise = null } = {}) => {
    const stated = source[key];
    if (stated == null || stated === '') return null;
    const v = normalise ? normalise(stated) : stated;
    if (allowed && !allowed.has(v)) {
      rejected.push({ key, why: `"${stated}" is not something this workshop offers` });
      return null;
    }
    return v;
  };

  value.hinge_system = pick('hinge_system', {
    allowed: new Set((C?.systems || []).map((s) => s.id)),
  });
  value.hinge_finish = pick('hinge_finish', {
    allowed: new Set((C?.finishes || []).map((f) => f.id)),
    normalise: (v) => String(v).trim().toLowerCase(),
  });
  value.plate = pick('plate', {
    // Only a plate this build can actually drill for — the same gate
    // `resolveHingePlate` applies, for the same reason: an export that lies
    // about the machine is worse than a default.
    allowed: new Set((C?.plates || []).filter((p) => p.enabled).map((p) => p.id)),
  });
  value.runner_variant = pick('runner_variant', {
    allowed: new Set((M?.variants || []).map((v) => v.id)),
    normalise: (v) => String(v).trim().toUpperCase(),
  });

  // ── per-family boards ──
  const boards = source.boards && typeof source.boards === 'object' ? source.boards : {};
  const thicknesses = new Set(profile?.board?.thicknessOptions || []);
  const frontThicknesses = new Set(profile?.front?.thicknessOptions || []);
  for (const [family, entry] of Object.entries(boards)) {
    if (!BOARD_FAMILIES.includes(family)) {
      rejected.push({ key: `boards.${family}`, why: 'not a unit family this app builds' });
      continue;
    }
    if (!entry || typeof entry !== 'object') continue;
    const out = {};
    for (const key of BOARD_KEYS) {
      const stated = entry[key];
      if (stated == null || stated === '') continue;
      if (key === 'carcass_thickness' || key === 'front_thickness') {
        const n = Number(stated);
        const allowed = key === 'carcass_thickness' ? thicknesses : frontThicknesses;
        if (!Number.isFinite(n) || (allowed.size && !allowed.has(n))) {
          rejected.push({ key: `boards.${family}.${key}`, why: `${stated} is not a thickness this workshop stocks` });
          continue;
        }
        out[key] = n;
        continue;
      }
      out[key] = String(stated);
    }
    for (const key of Object.keys(entry)) {
      if (RULE_OWNED_KEYS.includes(key)) {
        rejected.push({ key: `boards.${family}.${key}`, why: 'a rule owns this' });
      } else if (!BOARD_KEYS.includes(key)) {
        rejected.push({ key: `boards.${family}.${key}`, why: 'not a board preference' });
      }
    }
    if (Object.keys(out).length) value.boards[family] = out;
  }

  return { value, rejected };
}

/** Is this row saying anything at all? An empty row is the same as no row. */
export function hasCompanyDefaults(row) {
  if (!row) return false;
  if (row.hinge_system || row.hinge_finish || row.plate || row.runner_variant) return true;
  return Object.keys(row.boards || {}).length > 0;
}

// ─── The ACTIVE row ─────────────────────────────────────────────────────────
//
// The same shape `engine/profile.js getCabinetProfile()` and
// `engine/hinges.js hingeCatalogue()` already have, and for the same reason: a
// pure resolver in the engine cannot import a React store, and threading a
// company row through every call site would be a change to thirty signatures
// for a value that is one per session.

let ACTIVE = null;

/** Hand the engine the workshop's row. Validated on the way in. */
export function setCompanyDefaults(row, profile) {
  if (!row) { ACTIVE = null; return null; }
  const { value } = validateCompanyDefaults(row, profile);
  ACTIVE = hasCompanyDefaults(value) ? value : null;
  return ACTIVE;
}

/** The workshop's row, or null — which is what every session before this had. */
export function companyDefaults() {
  return ACTIVE;
}

/** Forget it — for tests, and for signing out. */
export function clearCompanyDefaults() {
  ACTIVE = null;
}

// ─── PREFILL (F2b.3) ────────────────────────────────────────────────────────

/**
 * A new project's design, prefilled from the workshop's row.
 *
 * "New-project flow PREFILLS from the row; project settings stay the place
 * deviations live." So this writes the company's answers INTO the project's own
 * fields at creation — which is what makes them editable there, and what makes
 * a later change to the company row leave finished jobs alone. It is a starting
 * point, exactly like the project type's heights.
 *
 * It never overwrites something the design already says: a project created from
 * a template has already answered, and the workshop's default is not a later
 * decision than the one in front of it.
 */
export function prefillDesignFromCompany(design, company, profile) {
  const row = company === undefined ? companyDefaults() : company;
  if (!row || !hasCompanyDefaults(row)) return design;
  const d = design && typeof design === 'object' ? design : {};
  const hinges = { ...(d.hinges || {}) };
  const runners = { ...(d.runners || {}) };

  if (hinges.system == null && row.hinge_system) hinges.system = row.hinge_system;
  if (hinges.finish == null && row.hinge_finish) hinges.finish = row.hinge_finish;
  if (hinges.plate == null && row.plate) hinges.plate = row.plate;
  if (runners.variant == null && row.runner_variant) runners.variant = row.runner_variant;

  const next = { ...d, hinges, runners };

  // The board a KITCHEN is built from is the project's board: one G per
  // project (#58), and the family a job mostly is decides it. A wardrobe shop
  // whose row says 18 gets 18 without retyping it.
  const kitchen = row.boards?.kitchen || row.boards?.wardrobe || null;
  if (kitchen?.carcass_thickness && next.thickness?.board == null) {
    next.thickness = { ...(next.thickness || {}), board: kitchen.carcass_thickness };
  }
  const profileOptions = profile?.front?.thicknessOptions || [];
  if (kitchen?.front_thickness && profileOptions.includes(Number(kitchen.front_thickness))) {
    const types = Array.isArray(next.fronts?.types) ? next.fronts.types : [];
    if (!types.length) next.fronts = { ...(next.fronts || {}), thickness: Number(kitchen.front_thickness) };
  }
  return next;
}
