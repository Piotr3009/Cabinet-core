// ─────────────────────────────────────────────────────────────────────────────
// THE AUTOMATIC ASSIGNMENTS (turn 39, CLAUDE.md F4)
//
// The owner, 18.08.2026: *"zawiasy automatycznie po wyborze koloru, nóżki też
// automatycznie w zależności od wysokości."*
//
// Four rules, and one law over all four:
//
//   A MANUAL ASSIGNMENT ALWAYS WINS AND IS NEVER OVERWRITTEN.
//
// The rules only ever propose. `stores/materialAssignmentStore.js
// setAutoAssignment()` is what refuses to touch a part a hand has set, and the
// `auto` tag it writes is what a later run reads to know it may still speak.
// Assigning by hand clears the tag, and from that moment the rule is silent
// about that part forever.
//
// ─── WHY THE TABLES ARE EMPTY ───────────────────────────────────────────────
//
// Every rule below resolves to a MATERIAL ID — a row in this workshop's own
// `cc_materials` list — and this app does not invent workshop numbers. So the
// ladders live in `profile.materials.*Rules`, they ship empty, and a rule with
// nothing to choose from returns a REASON rather than a guess:
//
//     { material_id: null, why: 'no leg rule covers a 150 mm plinth' }
//
// which is exactly what CLAUDE.md F4 asks for — *"Out of range → leaves it
// unassigned and says why."*
//
// PURE. No store, no React. Arguments in, proposals out.
// ─────────────────────────────────────────────────────────────────────────────

import { metalHingeFinish, resolveHingeSystem, hingeAngleFor } from './hinges.js';
import { resolveRunnerVariant } from './runners.js';
import { migrateDesign } from './design.js';

/** A proposal that chose nothing, and says why. */
const nothing = (why) => ({ material_id: null, label: null, why });

/** A proposal that chose something. */
const chose = (rule, why) => ({
  material_id: rule.material_id,
  label: rule.label || rule.material_id,
  why,
});

/** Only rules that name a material can be chosen — a blank row is not a rule. */
const usable = (rules) => (Array.isArray(rules) ? rules : []).filter((r) => r && r.material_id);

// ─── HINGES ─────────────────────────────────────────────────────────────────

/**
 * The metal this project's internal ironmongery is in.
 *
 * `design.hardware.shelfSleeve` is the app's existing internal-metal choice —
 * the same field the shelf sleeves, the 3-D and turn 32's invoice read. There
 * is not a second colour question for hinges and there must not be one.
 */
export function projectMetal(design, profile) {
  const d = migrateDesign(design);
  return d.hardware?.shelfSleeve || profile?.appearance?.metalDefault || null;
}

/**
 * Which hinge product the chosen colour asks for.
 *
 * The chain, every link of it already in the app:
 *   metal (gold|silver|chrome|onyx)
 *     → `appearance.metalHingeFinish` → hinge finish (nickel | onyx | null)
 *     → the workshop's `profile.materials.hingeRules`
 *
 * GOLD RESOLVES TO NULL ON PURPOSE. `profile.js` records why: there is no
 * published gold cup hinge, so the BOM prints a named spec and never an
 * invented article. The rule says so in as many words rather than silently
 * picking the nickel one.
 */
export function hingeProductFor({
  design, profile, rules = null, part = 'hinge',
} = {}) {
  const table = usable(rules ?? (part === 'hinge_plate'
    ? profile?.materials?.hingePlateRules
    : profile?.materials?.hingeRules));
  const metal = projectMetal(design, profile);
  if (!metal) return nothing('the project has no internal metal colour chosen');
  const finish = metalHingeFinish(profile, metal);
  if (!finish) {
    return nothing(`no hinge is published in ${metal} — the BOM names the spec instead`);
  }
  if (!table.length) {
    return nothing(`no ${part === 'hinge_plate' ? 'hinge plate' : 'hinge'} rules — add them in the workshop profile`);
  }
  const system = resolveHingeSystem(design, profile);
  const matches = table.filter((r) => String(r.finish || '').toLowerCase() === finish);
  if (!matches.length) return nothing(`no rule for hinge finish "${finish}"`);
  // The most specific rule wins: one that names the system beats one that does
  // not, so a workshop can write a general row and one exception beside it.
  const scored = matches
    .map((r) => ({ r, score: (r.system && r.system === system ? 2 : 0) + (r.angle ? 1 : 0) }))
    .sort((a, b) => b.score - a.score);
  return chose(scored[0].r, `${metal} → ${finish}${system ? ` · ${system}` : ''}`);
}

// ─── LEGS ───────────────────────────────────────────────────────────────────

/**
 * Which leg the plinth height asks for.
 *
 * *"nóżki też automatycznie w zależności od wysokości"*, and the ADJUSTMENT
 * RANGE is respected: a 100 mm leg that winds from 95 to 120 covers a 110 mm
 * toe kick and does not cover a 150 one. Among the rules that DO cover the
 * height, the one whose nominal is nearest wins — a 100 and a 120 both reaching
 * 110 means the 100 is the one on the shelf for it.
 *
 * @param {number} heightMm  the plinth / leg height the engine is standing on
 * @param {Array}  rules     profile.materials.legRules
 */
export function legProductFor(heightMm, rules = []) {
  const h = Number(heightMm);
  const table = usable(rules);
  if (!Number.isFinite(h) || h <= 0) return nothing('this cabinet stands on no legs');
  if (!table.length) return nothing('no leg rules — add a height ladder in the workshop profile');
  const inRange = table.filter((r) => {
    const min = Number(r.min_mm);
    const max = Number(r.max_mm);
    if (!Number.isFinite(min) || !Number.isFinite(max)) return false;
    return h >= min && h <= max;
  });
  if (!inRange.length) {
    const spans = table
      .map((r) => `${r.label || r.material_id} ${r.min_mm}–${r.max_mm}`)
      .join(', ');
    return nothing(`no leg adjusts to ${Math.round(h)} mm — the ladder covers ${spans}`);
  }
  const best = inRange
    .map((r) => ({ r, off: Math.abs((Number(r.nominal_mm) || 0) - h) }))
    .sort((a, b) => a.off - b.off || String(a.r.material_id).localeCompare(String(b.r.material_id)))[0];
  return chose(best.r, `${Math.round(h)} mm plinth → ${best.r.nominal_mm} mm leg (${best.r.min_mm}–${best.r.max_mm})`);
}

/** Every leg height this project's cabinets actually stand on. */
export function legHeightsIn(entries = []) {
  const out = new Set();
  for (const e of entries || []) {
    for (const h of e?.result?.hardware || []) {
      if (h.role !== 'legs') continue;
      const mm = Number(h.spec?.height_mm);
      if (Number.isFinite(mm) && mm > 0) out.add(mm);
    }
  }
  return [...out].sort((a, b) => a - b);
}

// ─── RUNNERS ────────────────────────────────────────────────────────────────

/**
 * Which runner the drawers ask for.
 *
 * CLAUDE.md F4, verbatim: *"from drawer depth and the runner family already
 * chosen (MOVENTO/TANDEM), reusing the existing runner selection law. Do NOT
 * re-derive lengths here; read what the engine already decided."*
 *
 * So the length is `spec.nl` — the nominal the engine SNAPPED to off
 * `runners.js`'s own ladder, not the box depth and not depth + 10. This
 * function does no arithmetic on it at all; it looks it up.
 *
 * A project whose drawers are two different depths has two nominals, and that
 * is two products: this returns one proposal per nominal.
 */
export function runnerProductsFor({ entries = [], profile = null, design = null, rules = null } = {}) {
  const table = usable(rules ?? profile?.materials?.runnerRules);
  const asked = new Map();     // nl → { nl, variant, pairs }
  for (const e of entries || []) {
    for (const h of e?.result?.hardware || []) {
      if (h.role !== 'runner_pairs') continue;
      const nl = Number(h.spec?.nl);
      const variant = h.spec?.variant
        || resolveRunnerVariant({ design, profile, unit: e.unit });
      if (!Number.isFinite(nl) || nl <= 0) {
        const key = 'below-ladder';
        const row = asked.get(key) || { nl: null, variant, pairs: 0, offLadder: true };
        row.pairs += Number(h.qty) || 0;
        asked.set(key, row);
        continue;
      }
      const key = `${nl}|${variant}`;
      const row = asked.get(key) || { nl, variant, pairs: 0, offLadder: false };
      row.pairs += Number(h.qty) || 0;
      asked.set(key, row);
    }
  }
  if (!asked.size) return [];
  return [...asked.values()].map((row) => {
    if (row.offLadder) {
      return { ...row, ...nothing('the engine could not snap this drawer to the runner ladder') };
    }
    if (!table.length) {
      return { ...row, ...nothing('no runner rules — add a nominal-length ladder in the workshop profile') };
    }
    const matches = table.filter((r) => Number(r.nl_mm) === row.nl);
    if (!matches.length) return { ...row, ...nothing(`no runner rule for NL ${row.nl}`) };
    const exact = matches.find((r) => String(r.variant || '').toUpperCase() === String(row.variant || '').toUpperCase());
    const rule = exact || matches[0];
    return { ...row, ...chose(rule, `NL ${row.nl}${row.variant ? ` · ${row.variant}` : ''}`) };
  });
}

// ─── LIGHTING ───────────────────────────────────────────────────────────────

/**
 * Which LED products the design asks for.
 *
 * The QUANTITY is not this rule's business and never was — `engine/bom.js`
 * already reads the metres off the strips the design actually carries, and the
 * channel is a metre of channel per metre of strip. This only says which
 * PRODUCT those metres are bought as.
 */
export function lightingProductsFor({ profile = null, usage = null } = {}) {
  const rules = profile?.materials?.ledRules || {};
  const map = {
    led_strip: 'strip', led_profile: 'profile', led_driver: 'driver',
    led_switch: 'switch', led_spot: 'spot',
  };
  const out = [];
  for (const [partId, key] of Object.entries(map)) {
    // A product for a part the job does not carry is noise, not an assignment.
    if (usage && !usage[partId]) continue;
    const id = rules[key];
    out.push({
      partId,
      ...(id
        ? chose({ material_id: id, label: id }, 'the project’s LED products')
        : nothing(`no LED ${key} product in the workshop profile`)),
    });
  }
  return out;
}

// ─── THE WHOLE PASS ─────────────────────────────────────────────────────────

/**
 * Every proposal this project's state supports, as a flat list.
 *
 * Nothing here writes: the caller hands each proposal to
 * `setAutoAssignment()`, which is the one place the manual-wins law lives.
 *
 * @returns {Array<{ partId, material_id, label, why, note }>}
 *          `material_id: null` is a proposal that could NOT be made, carrying
 *          the sentence that says why — the modal shows it beside the row.
 */
export function autoAssignments({
  entries = [], design = null, profile = null, usage = null,
} = {}) {
  const out = [];
  const push = (partId, proposal, note = null) => out.push({ partId, note, ...proposal });

  // Hinges — and the plate that goes with every one of them.
  const anyHinge = !usage || usage.hinge;
  if (anyHinge) {
    push('hinge', hingeProductFor({ design, profile, part: 'hinge' }));
    push('hinge_plate', hingeProductFor({ design, profile, part: 'hinge_plate' }));
  }

  // Legs — one proposal per distinct height this project stands on. Two
  // different plinths in one job are two different legs, and saying so is more
  // use than picking one of them.
  const heights = legHeightsIn(entries);
  const legRules = profile?.materials?.legRules;
  if (heights.length) {
    const proposals = heights.map((h) => ({ h, p: legProductFor(h, legRules) }));
    const chosen = proposals.filter((x) => x.p.material_id);
    const ids = new Set(chosen.map((x) => x.p.material_id));
    if (ids.size === 1) {
      push('leg', chosen[0].p, heights.length > 1 ? `covers ${heights.join(' and ')} mm` : null);
    } else if (ids.size > 1) {
      push('leg', nothing(
        `this project stands on ${heights.join(' and ')} mm and wants ${ids.size} different legs — choose by hand`,
      ));
    } else {
      push('leg', proposals[0].p);
    }
  }

  // Runners — the same shape of answer for the same reason.
  const runners = runnerProductsFor({ entries, profile, design });
  if (runners.length) {
    const ids = new Set(runners.filter((r) => r.material_id).map((r) => r.material_id));
    if (ids.size === 1) {
      const first = runners.find((r) => r.material_id);
      push('runner', first, runners.length > 1 ? `covers NL ${runners.map((r) => r.nl).join(', ')}` : null);
    } else if (ids.size > 1) {
      push('runner', nothing(
        `this project needs runners at NL ${runners.map((r) => r.nl).join(' and ')} — choose by hand`,
      ));
    } else {
      push('runner', runners[0]);
    }
  }

  for (const row of lightingProductsFor({ profile, usage })) {
    push(row.partId, row);
  }

  return out;
}

/** The proposals that can actually be applied. */
export function applicable(proposals = []) {
  return proposals.filter((p) => p.material_id);
}

/** The ones that could not, with the sentence that says why. */
export function refusals(proposals = []) {
  return proposals.filter((p) => !p.material_id);
}
