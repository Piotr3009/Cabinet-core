// ─── THE HINGE, AS A BOUGHT THING (turn 19, CLAUDE.md F1 / W36) ─────────────
//
// The owner's model, his words: "jeden główny wybór przypisany… a jak jedna
// szafka będzie miała inne hinges, to po podwójnym kliknięciu na hinge otworzy
// się modal… przesuń up/down plus assign if other hinge."
//
// Two levels, and they are the colour hierarchy and the runner hierarchy again,
// because they are the same question asked about a third thing: the PROJECT
// says which system and which finish, the RULE says which angle, and ONE DOOR
// may say something else and be believed.
//
// ─── WHAT IS AND IS NOT A CHOICE ────────────────────────────────────────────
//
// The ANGLE is not a choice. `reference/hardware/cliptop-hinges.json → rules`
// says a front up to 25 mm takes the 110°, a thicker one the 95°, and a
// WARDROBE door with an inner drawer behind it the 155° — because the drawer
// has to clear the open door. The engine resolves that per door and the BOM
// lists the article that follows. What a person picks is the FINISH (nickel or
// onyx), the SYSTEM (one, today) and the PLATE — and, per door, an exception.
//
// ─── THE CATALOGUE IS THE RULE (CLAUDE.md F0.3) ─────────────────────────────
//
// Those four JSON files under `reference/hardware/` have the standing the LISP
// files have for geometry: they are the CATALOGUE OF RECORD. So the thresholds
// are NOT retyped into profile.js — a rule written down twice is a rule that
// will disagree with itself — they are read from the catalogue the engine is
// handed. `lib/hardwareCatalogue.js` does the handing, exactly as
// lib/runnerCatalogue.js does for MOVENTO and lib/decorCatalogue.js does for
// the EGGER pack. THE ENGINE NEVER FETCHES.
//
// With no catalogue the answers are `null` all the way down, and null is a
// complete answer: it means "no article number and no angle to print", never
// "no hinges". The drilling, the counts and the 3D bodies are untouched by any
// of this — the default hinge IS today's drilling, which is the iron rule of
// this turn.
//
// Pure functions — no React, no store, no fetch.

/** The parsed catalogue, once somebody has read it. `null` until then. */
let CATALOGUE = null;

/**
 * Hand the engine the CLIP top catalogue.
 *
 * @param {object|null} raw  reference/hardware/cliptop-hinges.json, or anything
 *                           close to it — the parser below is forgiving because
 *                           the file is the owner's and not a schema we own.
 */
export function setHingeCatalogue(raw) {
  CATALOGUE = parseHingeCatalogue(raw);
  return CATALOGUE;
}

/** What the engine currently knows, or null. */
export function hingeCatalogue() {
  return CATALOGUE;
}

/** Forget it — for tests, and for a workshop switching catalogues. */
export function clearHingeCatalogue() {
  CATALOGUE = null;
}

/** The roles the catalogue files carry. A row with any other role is ignored. */
const ROLES = new Set(['hinge', 'plate_knockin5', 'plate_screw3']);

/**
 * Normalise the file into { system, rules, items }.
 *
 * A row missing its family, its article or its role is DROPPED rather than
 * guessed at: half an entry in a parts list is how a workshop orders the wrong
 * hinge, which is the same reason the runner manifest is parsed this way.
 */
export function parseHingeCatalogue(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const rows = Array.isArray(raw.items) ? raw.items : null;
  if (!rows) return null;

  const byThickness = (raw.rules?.hinge_by_front_thickness || [])
    .map((r) => ({ max: Number(r?.max), angle: Number(r?.angle) }))
    .filter((r) => r.max > 0 && r.angle > 0)
    // Smallest threshold first: the rule is read as a ladder and the first
    // rung the front fits under wins.
    .sort((a, b) => a.max - b.max);

  const items = [];
  for (const row of rows) {
    const family = String(row?.family ?? '').trim();
    const article = row?.article == null ? null : String(row.article).trim();
    const role = String(row?.role ?? '').trim();
    if (!family || !article || !ROLES.has(role)) continue;
    items.push({
      file: String(row?.file ?? '').trim() || null,
      family,
      article,
      role,
      angle: Number(row?.angle) > 0 ? Number(row.angle) : null,
      finish: String(row?.finish ?? '').trim().toLowerCase() || null,
    });
  }
  if (!items.length) return null;

  return {
    system: String(raw.system || '').trim() || null,
    rules: {
      byThickness,
      wardrobeInnerDrawer: Number(raw.rules?.hinge_wardrobe_inner_drawer) > 0
        ? Number(raw.rules.hinge_wardrobe_inner_drawer)
        : null,
      plateDefault: raw.rules?.plate_default || null,
      plateOption: raw.rules?.plate_option || null,
      // The LAYERS the catalogue names for the three drillings. They are here
      // so a test can hold them to profile.js — the export must keep writing
      // `FRONT_HINGES_35MM`, `FRONT_HINGES_3MM` and `HINGES_5MM`, and a
      // catalogue that named something else would be a catalogue describing a
      // machine this app does not drive.
      layers: { ...(raw.rules?.layers || {}) },
    },
    items,
  };
}

/**
 * WHICH ANGLE THIS DOOR TAKES (CLAUDE.md F1.2).
 *
 * The front's thickness decides it, except on a wardrobe door with a drawer
 * behind it — that one opens to 155° so the drawer can come out past it. The
 * inner-drawer case is checked FIRST because it is the reason the rule exists:
 * a 155° hinge on an 18 mm wardrobe door is not the thickness ladder being
 * wrong, it is a different question being answered.
 *
 * @param {object} args
 *   frontThickness  mm
 *   innerDrawer     true where this door's own section holds a drawer AND the
 *                   cabinet is a wardrobe — the caller decides, because only
 *                   the caller knows what is behind the door
 * @returns {number|null} degrees, or null with no catalogue to read
 */
export function hingeAngleFor({ frontThickness, innerDrawer = false } = {}) {
  const cat = CATALOGUE;
  if (!cat) return null;
  if (innerDrawer && cat.rules.wardrobeInnerDrawer) return cat.rules.wardrobeInnerDrawer;
  const t = Number(frontThickness);
  if (!(t > 0)) return null;
  for (const rung of cat.rules.byThickness) if (t <= rung.max) return rung.angle;
  // Thicker than anything the catalogue has a hinge for. No angle is the honest
  // answer — the BOM prints the spec without an article and says so, rather
  // than ordering the nearest thing and hoping.
  return null;
}

/**
 * The hinge FAMILIES in the catalogue, one entry per family.
 *
 * The catalogue lists each family TWICE, under two article numbers, and nobody
 * in this building knows yet what the second one means (a pack size, a hand, a
 * bag quantity — the owner will read an invoice). So a family is one choice
 * with BOTH articles on it: the first is what is drawn and what the BOM leads
 * with, and the pair travels with it so the day the meaning is known nothing
 * has to be re-derived. BLOCKERS carries the question.
 *
 * @param {object} filter  { angle, finish, role } — any of them may be left out
 * @returns {Array<{family, role, angle, finish, articles:string[], article, file}>}
 */
export function hingeFamilies({ angle = null, finish = null, role = 'hinge' } = {}) {
  const cat = CATALOGUE;
  if (!cat) return [];
  const wantFinish = finish ? String(finish).toLowerCase() : null;
  const grouped = new Map();
  for (const item of cat.items) {
    if (role && item.role !== role) continue;
    if (angle != null && item.angle !== Number(angle)) continue;
    if (wantFinish && item.finish !== wantFinish) continue;
    let entry = grouped.get(item.family);
    if (!entry) {
      entry = {
        family: item.family,
        role: item.role,
        angle: item.angle,
        finish: item.finish,
        articles: [],
        article: null,
        file: null,
        files: new Map(),
      };
      grouped.set(item.family, entry);
    }
    entry.articles.push(item.article);
    if (item.file) entry.files.set(item.article, item.file);
  }
  // The LEADING article of a family — sorted, so the answer does not depend on
  // the order a JSON file happened to be written in — is the one drawn and the
  // one the BOM leads with (F1.6), and the FILE is that article's own. Both
  // articles travel on the entry: nobody in this building knows yet what the
  // second one means and BLOCKERS carries the question, so neither is thrown
  // away to make the shape tidier.
  return [...grouped.values()]
    .map((entry) => {
      const articles = [...entry.articles].sort();
      const [article] = articles;
      const { files, ...rest } = entry;
      return {
        ...rest,
        articles,
        article,
        file: files.get(article) || files.values().next().value || null,
      };
    })
    .sort((a, b) => a.family.localeCompare(b.family));
}

/** One family by name, whatever its role. */
export function hingeFamily(family) {
  if (!family) return null;
  for (const role of ['hinge', 'plate_knockin5', 'plate_screw3']) {
    const hit = hingeFamilies({ role }).find((f) => f.family === String(family));
    if (hit) return hit;
  }
  return null;
}

/**
 * Every hinge a person may pick from in the "Assign other hinge" dropdown
 * (F1.3) — the catalogue's hinge entries, in a shape a list can render.
 */
export function hingeChoices({ finish = null } = {}) {
  return hingeFamilies({ finish, role: 'hinge' }).map((f) => ({
    ...f,
    label: `${f.family} · ${f.angle}° · ${f.finish}`,
  }));
}

/**
 * The mounting PLATE for this project, as a catalogue entry.
 *
 * The plate ROLE comes off the profile's choice (`plate_knockin5` by default);
 * the ⌀3 option is disabled in the surface because its drilling pattern is a
 * workshop number nobody has supplied (F1.5), and this function does not know
 * or care about that — it answers what was asked for.
 */
export function plateFamily({ plate = null, finish = null } = {}) {
  const cat = CATALOGUE;
  if (!cat) return null;
  const role = plate || cat.rules.plateDefault || 'plate_knockin5';
  const list = hingeFamilies({ finish, role });
  return list[0] || null;
}

/**
 * WHICH HINGE ONE DOOR IS FITTED WITH — the whole hierarchy, in one call.
 *
 * Project (finish, system) → the RULE (angle, from the front and what is behind
 * the door) → THIS DOOR (a manual assignment, which wins).
 *
 * An assignment is stored as a FAMILY name, because that is what a person
 * picked off the catalogue; the angle then comes off the family rather than off
 * the rule, which is precisely what "assign other hinge" means. A stored family
 * the catalogue no longer has is ignored rather than obeyed — a hinge nobody
 * stocks is not an override, it is a stale field.
 *
 * @param {object} args
 *   assigned        the family this door was given by hand, or null
 *   frontThickness  mm
 *   innerDrawer     see hingeAngleFor
 *   finish          'nickel' | 'onyx'
 * @returns {{angle:number|null, family:string|null, article:string|null,
 *            articles:string[], finish:string|null, file:string|null,
 *            assigned:boolean, ruleAngle:number|null, complete:boolean}}
 */
export function resolveDoorHinge({
  assigned = null, frontThickness = null, innerDrawer = false, finish = null,
} = {}) {
  const ruleAngle = hingeAngleFor({ frontThickness, innerDrawer });
  const wantFinish = finish ? String(finish).toLowerCase() : null;

  if (assigned) {
    const own = hingeFamily(assigned);
    if (own && own.role === 'hinge') {
      return {
        angle: own.angle,
        family: own.family,
        article: own.article,
        articles: [...own.articles],
        finish: own.finish,
        file: own.file,
        assigned: true,
        ruleAngle,
        complete: Boolean(own.article),
      };
    }
  }

  const [match] = hingeFamilies({ angle: ruleAngle, finish: wantFinish, role: 'hinge' });
  if (!match) {
    return {
      angle: ruleAngle,
      family: null,
      article: null,
      articles: [],
      finish: wantFinish,
      file: null,
      assigned: false,
      ruleAngle,
      complete: false,
    };
  }
  return {
    angle: match.angle,
    family: match.family,
    article: match.article,
    articles: [...match.articles],
    finish: match.finish,
    // The FILE the first article names. It is on the answer rather than looked
    // up again by the view, so the hinge that is drawn is the hinge that is
    // ordered — one resolution, not two that agree by accident.
    file: match.file,
    assigned: false,
    ruleAngle,
    complete: Boolean(match.article),
  };
}

/**
 * The project's finish, resolved against the profile's list.
 *
 * A stored finish the workshop no longer offers falls back to the shop's
 * default rather than ordering something nobody stocks — the same rule the
 * runner variant follows.
 */
export function resolveHingeFinish(design, profile) {
  const C = profile.hardware.hinge.cliptop;
  const known = new Set(C.finishes.map((f) => f.id));
  const wanted = String(design?.hinges?.finish || '').toLowerCase();
  return known.has(wanted) ? wanted : C.defaultFinish;
}

/**
 * The project's mounting plate, resolved the same way — and never an option
 * this build cannot drill for (F1.5). A project carrying `plate_screw3`
 * (hand-edited, or saved by a future build) comes back on the knock-in plate,
 * because the alternative is an export that lies about the machine.
 */
export function resolveHingePlate(design, profile) {
  const C = profile.hardware.hinge.cliptop;
  const wanted = String(design?.hinges?.plate || '');
  const spec = C.plates.find((p) => p.id === wanted);
  return spec?.enabled ? spec.id : C.defaultPlate;
}

/** The project's system, resolved against the profile's list. */
export function resolveHingeSystem(design, profile) {
  const C = profile.hardware.hinge.cliptop;
  const known = new Set(C.systems.map((s) => s.id));
  const wanted = String(design?.hinges?.system || '');
  return known.has(wanted) ? wanted : C.system;
}

/**
 * The door this hinge assignment belongs to, as a key.
 *
 * The engine's own panel id — `01-F`, `01-FL`, `01-FR` — because that is what
 * every other per-piece decision in this app is keyed on (element overrides
 * since turn 11) and because it survives a door being re-cut.
 */
export function doorHingeAssignment(params, panelId) {
  const map = params?.door_hinges;
  if (!map || typeof map !== 'object' || !panelId) return null;
  const own = map[panelId];
  return own ? String(own) : null;
}

/**
 * Where a hinge or plate model actually lives, as a URL the browser can fetch.
 *
 * The catalogue names the file with its whole path already on it
 * (`hardware/hinges/blum/cliptop/71B3550_42542984.glb`), so unlike the runners
 * this does not re-join the path — it only puts the bucket in front of it.
 */
export function hingeModelUrl(entry, profile, storageBase = '') {
  if (!entry?.file) return null;
  const C = profile.hardware.hinge.cliptop;
  if (!storageBase) return entry.file;
  return `${String(storageBase).replace(/\/+$/, '')}/${C.bucket}/${entry.file}`;
}

/**
 * THE THICKNESS RE-RESOLVE GATE (CLAUDE.md F1.4).
 *
 * "Changing a front's material to a thickness that flips the angle re-resolves
 * ONLY doors without a manual assignment, and says so in a toast. A manual
 * assignment is never silently overridden."
 *
 * The re-resolution itself needs no code: the angle is DERIVED from the front's
 * thickness every time a cabinet is computed, so a door that follows the rule
 * already follows it the moment the board changes, and a door with an
 * assignment already ignores it. What is missing is the SAYING SO, and that is
 * what this is — a pure answer about what just happened, so that the sentence
 * shown to a joiner and a test of the rule are the same function.
 *
 * @param {object} args
 *   fromThickness, toThickness   mm — the front board before and after
 *   assignedDoors                how many doors in the job carry a hand-picked
 *                                hinge (those are the ones that do NOT move)
 *   totalDoors                   how many doors there are altogether
 * @returns {{flipped:boolean, from:number|null, to:number|null,
 *            reResolved:number, kept:number, message:string|null}}
 *   `message` is null where nothing changed — a toast that fires on every board
 *   change would teach a joiner to ignore it.
 */
export function hingeReResolve({
  fromThickness = null, toThickness = null, assignedDoors = 0, totalDoors = 0,
} = {}) {
  const from = hingeAngleFor({ frontThickness: fromThickness });
  const to = hingeAngleFor({ frontThickness: toThickness });
  const kept = Math.max(0, Math.min(Number(assignedDoors) || 0, Number(totalDoors) || 0));
  const reResolved = Math.max(0, (Number(totalDoors) || 0) - kept);
  const flipped = Boolean(from && to && from !== to);
  if (!flipped) {
    return {
      flipped: false, from, to, reResolved: 0, kept, message: null,
    };
  }
  const doors = reResolved === 1 ? 'door' : 'doors';
  const held = kept === 1 ? 'door keeps' : 'doors keep';
  const tail = kept > 0
    ? ` ${kept} assigned ${held} the hinge it was given.`
    : '';
  return {
    flipped: true,
    from,
    to,
    reResolved,
    kept,
    message: `Hinges re-resolved ${from}° → ${to}°: ${reResolved} ${doors} follow the front.${tail}`,
  };
}

/**
 * The BOM line for one group of doors, as a label a workshop can order against.
 *
 * Angle, system, finish and article — and where the catalogue has not been read
 * it is the count alone, which is exactly the line the BOM has printed since
 * turn 3. Nothing here invents a number.
 */
export function hingeSpecLabel({
  perDoor, doors, angle = null, finish = null, article = null, systemLabel = null, assigned = false,
}) {
  if (!(doors > 0)) return '';
  const parts = [`${perDoor} per door × ${doors}`];
  if (angle) parts.push(`${angle}°`);
  if (systemLabel) parts.push(systemLabel);
  if (finish) parts.push(finish);
  if (article) parts.push(article);
  if (assigned) parts.push('assigned');
  return parts.join(' · ');
}
