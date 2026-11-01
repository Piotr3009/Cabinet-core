// === THE SPRAY SCHEDULE (T78 F21, CLAUDE.md PART F) ==========================
//
// The owner, 11.10.2026, element by element: twenty rows saying what of each
// sprayed element is painted (faces, edges, a 100 mm frame on the back of an
// end panel, a 100 mm strip on a blind blank, the two 8 mm sides of an applied
// strip), the waste (10 percent), the edges counted in the m2 for the paint
// with the running metres beside them (the work), and *"cale sprayowanie jako
// osobne menu Cabinet Core"*: the schedule, its page, the paint order.
//
// THE NUMBERS ARE NOT HERE. They live in `profile.spray` (engine/profile.js):
// the rule table keyed by rule id, the frame and strip millimetres, the waste,
// the defaults a paint is assumed to have when its warehouse row says nothing.
// This module is the LAW's arithmetic and nothing else:
//
//   which rule a panel falls under  (`sprayRuleFor`: role, part, meta, set)
//   what that rule paints on it     (`sprayAreaFor`: faces + edges + frames)
//   the schedule of a whole job     (`sprayScheduleFor`: lines by colour,
//                                    the cards, the paint per colour)
//   the paint as a purchase         (`paintPurchaseQtys`, the BOM's hook)
//   the code on the CNC label       (`sprayCodeFor`, read by cnc/partLabel.js)
//
// WHERE THE COLOUR COMES FROM: the unit's own finish, resolved by the ONE
// resolver every other document reads (engine/materials.js
// resolvePanelMaterial, which carries an element override, the run pieces'
// switch and the project's palette). This page only GROUPS by it.
//
// SET 2 (the carcass) appears when the unit's carcass is veneer or sprayed:
// the carcass type's source, as design.js records it.
//
// Pure functions: no React, no store, no DOM. Plain ASCII throughout.

import { DEFAULT_CABINET_PROFILE } from './profile.js';
import { roundTo } from './format.js';
import { migrateDesign, resolveFinishes, resolveUnitDesign } from './design.js';
import { resolvePanelMaterial } from './materials.js';
import { assignmentFor, normalizeAssignments } from './partRegistry.js';
// The paint record of a warehouse row, normalised (tin sizes typed as a list).
import { paintOf } from './warehouse.js';

/** The registry parts the paint is bought under, one per sprayed set. */
export const PAINT_PART_IDS = Object.freeze({ 1: 'paint_fronts', 2: 'paint_carcass' });

/** The stock-list category a paint wears when it reaches a material picker. */
const PAINT_CATEGORY = 'paint';

/** The rules whose paint is not "all around" and so get a CARD on the page (PART B). */
export const CARD_RULES = Object.freeze([
  'end_panel', 'island_end', 'back_panel', 'blind_blank', 'corner_post', 'plinth', 'infill', 'top_infill', 'mask', 'front_moulding',
]);

/**
 * The spray block of a profile: the stored profile's where it has one (a
 * profile saved before T78 is migrated with it), the app's otherwise.
 * @throws when neither carries the block, which is the T78 F21 profile patch
 *         not applied; the numbers are never invented here.
 */
function spraySettings(profile) {
  const S = profile?.spray || DEFAULT_CABINET_PROFILE.spray;
  if (!S || !S.rules) throw new Error('profile.spray is missing: the T78 F21 profile patch (engine/profile.js spray block) is not applied.');
  return S;
}

/** The twenty rows, as the profile holds them, keyed by rule id. */
export function sprayRules(profile) {
  return spraySettings(profile).rules;
}

/** A rule record with `as:` resolved to the row it points at (8 and 9 read as 7, 15 as 14). */
function ruleRecord(ruleId, profile) {
  const rules = sprayRules(profile);
  const own = rules[ruleId];
  if (!own) return null;
  const base = own.as ? rules[own.as] : null;
  return { ...(base || {}), ...own, id: ruleId, baseId: own.as || ruleId };
}

// === WHICH RULE ==============================================================

const CARCASS_KIND_BY_PART = Object.freeze({
  BUL: 'side', BUR: 'side', SIDE: 'side', DP: 'side', FILLER: 'side', SPURS: 'side',
  TOP: 'horizontal', BOTTOM: 'horizontal', HOLDER: 'horizontal',
  BACK: 'back', 'BACK-RAIL': 'back',
  SHELF: 'shelf', FIXED: 'shelf', 'SHELF-L': 'shelf',
  PARTITION: 'partition', VPART: 'partition',
});

/** Is this infill the TOP infill (the strip up to the ceiling) rather than a side filler? */
function isTopInfill(panel) {
  const id = String(panel?.id || '');
  return /^INFILL-T(?:-|$)/.test(id) || panel?.meta?.side === 'T';
}

/**
 * Does this unit stand OPEN: no door, no drawer front, no blank in front of
 * its shelves (the owner's *"open shelves"*, row 20). A unit of shelves and
 * nothing else is one; a cabinet with a door is not.
 */
export function unitIsOpen(result) {
  const panels = result?.panels || [];
  const faced = panels.some((p) => p.part === 'FRONT' || p.part === 'DRAWER-FRONT' || p.role === 'blind_blank' || p.role === 'false_front');
  return !faced && panels.some((p) => p.role === 'shelf');
}

/**
 * THE RULE A PANEL FALLS UNDER, or null when the law does not paint it
 * (a drawer box, a back of a closed unit, an upstand, legs).
 *
 * @param {object} panel   an engine panel record
 * @param {object} [ctx]   set2: the unit's carcass is sprayed or veneered;
 *                         openUnit: the unit stands open (row 20)
 * @returns {{ id:string, kind:string|null }|null}  `kind` is the carcass
 *          board's kind under rule 19 (side | horizontal | back | shelf |
 *          partition), null elsewhere.
 */
export function sprayRuleFor(panel, { set2 = false, openUnit = false, profile = null } = {}) {
  if (!panel) return null;
  const S = spraySettings(profile);
  const role = panel.role;
  const part = String(panel.part || '');
  const meta = panel.meta || {};
  // 5 - an applied moulding strip, bonded to a door and painted after gluing.
  if (part === 'FRONT-MOULDING' || meta.frontDecorationParent) return { id: 'front_moulding', kind: null };
  if (role === 'front') {
    // 3 - the D/W front is a dummy over a machine: the false front's row.
    if (part === 'FRONT' && meta.appliance) return { id: 'false_front', kind: null };
    if (part === 'FRONT') return { id: 'door', kind: null };
    if (part === 'DRAWER-FRONT') return { id: 'drawer_front', kind: null };
    return { id: 'door', kind: null };
  }
  if (role === 'drawer_front') return { id: 'inner_front', kind: null };     // 6 - T78 F15
  if (role === 'false_front') return { id: 'false_front', kind: null };
  if (role === 'blind_blank') return { id: 'blind_blank', kind: null };
  if (role === 'end_panel') return { id: part === 'ISLAND-END-PANEL' ? 'island_end' : 'end_panel', kind: null };
  if (role === 'back_panel') return { id: 'back_panel', kind: null };
  if (role === 'mask') return { id: 'mask', kind: null };
  if (role === 'corner_post') return { id: 'corner_post', kind: null };
  if (role === 'free_panel') return { id: 'free_panel', kind: null };
  if (role === 'plinth') return { id: 'plinth', kind: null };
  if (role === 'infill') return { id: isTopInfill(panel) ? 'top_infill' : 'infill', kind: null };
  if (role === 'pelmet') return { id: 'pelmet', kind: null };
  // T82 F4 - the HAWA pocket (KIT_HAWA.lsp D3, the front's material): its door
  // is a door, all round (rule 1); its two panels stand beside the carcasses
  // as an end panel does, one face, the back framed, four edges (rule 7):
  // PROPOSED, owner to confirm.
  if (role === 'pocket_door') return { id: 'door', kind: null };
  if (role === 'pocket_panel') return { id: 'end_panel', kind: null };
  if (role === 'upstand') return null;                                        // 18 - worktop material
  // 20 - open shelves, desk and sideboard tops 25: all around, whatever set.
  if (role === 'shelf' || role === 'top') {
    const thick = Number(panel.thickness) >= Number(S.rules.open_shelf25?.thicknessMm ?? 25);
    if ((role === 'shelf' && (openUnit || thick)) || (role === 'top' && thick && openUnit)) return { id: 'open_shelf25', kind: null };
  }
  // 19 - the carcass, SET 2 only.
  if (set2) {
    const kind = CARCASS_KIND_BY_PART[part] || null;
    if (kind && ['side', 'top', 'bottom', 'back', 'shelf'].includes(role)) return { id: 'carcass_set2', kind };
  }
  return null;
}

// === WHAT THE RULE PAINTS ====================================================

const mm2ToM2 = (v) => v / 1e6;
const r4 = (v) => roundTo(v, 4);
const r3 = (v) => roundTo(v, 3);

/**
 * THE AREA ONE PART TAKES under its rule: faces, edges (perimeter x
 * thickness, counted in the m2 when `edgesInM2`), frames and strips by the
 * rule's own numbers. `edgesLm` is the running length of painted edge, the
 * WORK, printed beside the m2 whatever `edgesInM2` says.
 *
 * @param {object} panel  { w, h, thickness } in mm (w along, h up on the board)
 * @param {{id:string, kind:string|null}} rule  from `sprayRuleFor`
 * @returns {{ m2Each:number, edgesLm:number, code:string, faceM2:number,
 *             edgeM2:number, extraM2:number, breakdown:Array<{label:string, m2:number}> }}
 */
export function sprayAreaFor(panel, rule, profile = null) {
  const S = spraySettings(profile);
  const R = ruleRecord(rule.id, profile) || {};
  const w = Number(panel.w) || 0;
  const h = Number(panel.h) || 0;
  const t = Number(panel.thickness) || 0;
  const face = w * h;
  const edgeAll = 2 * (w + h) * t;
  const lmAll = 2 * (w + h);
  const bd = [];
  let faceA = 0; let edgeA = 0; let extraA = 0; let lm = 0; let code = R.code || '';
  const add = (label, mm2) => { bd.push({ label, m2: r4(mm2ToM2(mm2)) }); };

  switch (rule.id) {
    case 'door': case 'drawer_front': case 'false_front': case 'inner_front': case 'free_panel': {
      faceA = 2 * face; edgeA = edgeAll; lm = lmAll;
      add('2 faces', faceA); add('4 edges', edgeA);
      break;
    }
    case 'pelmet': case 'open_shelf25': {
      faceA = 2 * face; edgeA = edgeAll; lm = lmAll;
      add('2 faces', faceA); add('4 edges', edgeA);
      break;
    }
    case 'end_panel': case 'island_end': case 'back_panel': {
      const f = Number(R.backFrameMm ?? S.frameMm) || 0;
      const inner = Math.max(0, w - 2 * f) * Math.max(0, h - 2 * f);
      faceA = face; edgeA = edgeAll; extraA = face - inner; lm = lmAll;
      add('visible face', faceA); add('4 edges', edgeA); add(`${f} mm frame on the back`, extraA);
      break;
    }
    case 'blind_blank': {
      const f = Number(R.faceStripMm ?? S.frameMm) || 0;
      const strip = Math.min(f, w) * h;
      const doorEdge = h * t;
      const ends = 2 * Math.min(f, w) * t;
      faceA = strip; edgeA = doorEdge + ends; lm = h + 2 * Math.min(f, w);
      add(`${f} mm strip of the face at the door side`, strip); add('door-side edge', doorEdge); add(`top and bottom edges for ${f} mm`, ends);
      break;
    }
    case 'front_moulding': {
      // The strip's face lies in the door's face, already counted on the door;
      // what the strip adds is its two sides, each the strip's own thickness
      // (the owner's 8), along its length.
      const sides = 2 * w * t;
      edgeA = sides; lm = 2 * w;
      add(`2 sides of ${t} mm, after gluing`, sides);
      break;
    }
    case 'mask': {
      faceA = face; edgeA = w * t; lm = w;
      add('underside', faceA); add('front edge', edgeA);
      break;
    }
    case 'corner_post': {
      faceA = face; edgeA = 2 * h * t + w * t; lm = 2 * h + w;
      add('face', faceA); add('2 long edges', 2 * h * t); add('top edge', w * t);
      break;
    }
    case 'plinth': {
      faceA = face; edgeA = w * t; lm = w;
      add('face', faceA); add('top edge', edgeA);
      break;
    }
    case 'infill': case 'top_infill': {
      // The edge toward the unit: a side filler's long edge (its height), the
      // top strip's long edge (its length).
      const toward = (rule.id === 'top_infill' ? w : h);
      faceA = face; edgeA = toward * t; lm = toward;
      add('face', faceA); add('edge toward the unit', edgeA);
      break;
    }
    case 'cornice': {
      // A bought moulding, ordered by the metre: the profile's perimeter
      // (height + projection, both faces: all around the section) x length.
      // `w` carries the length in mm, `h` the height, `thickness` the projection.
      const perimeter = 2 * (h + t);
      extraA = perimeter * w; lm = w; // the length, as the lm beside it
      add(`profile perimeter ${perimeter} mm x length`, extraA);
      break;
    }
    case 'carcass_set2': {
      const kind = rule.kind;
      if (kind === 'shelf') { faceA = 2 * face; edgeA = edgeAll; lm = lmAll; add('2 faces', faceA); add('4 edges', edgeA); code = R.codes?.shelf || 'ALL'; }
      else if (kind === 'back') { faceA = face; add('inside face', faceA); code = R.codes?.back || '1S'; }
      else if (kind === 'side') { faceA = face; edgeA = h * t; lm = h; add('inside face', faceA); add('front edge', edgeA); code = R.codes?.side || '1S + FE'; }
      else if (kind === 'horizontal') { faceA = face; edgeA = w * t; lm = w; add('inside face', faceA); add('front edge', edgeA); code = R.codes?.horizontal || '1S + FE'; }
      else if (kind === 'partition') { faceA = 2 * face; edgeA = w * t; lm = w; add('2 faces', faceA); add('front edge', edgeA); code = R.codes?.partition || '2S + FE'; }
      break;
    }
    default:
      break;
  }
  const edgesIn = S.edgesInM2 !== false;
  const m2Each = r4(mm2ToM2(faceA + extraA + (edgesIn ? edgeA : 0)));
  return {
    m2Each,
    edgesLm: r3(lm / 1000),
    code,
    faceM2: r4(mm2ToM2(faceA)),
    edgeM2: r4(mm2ToM2(edgeA)),
    extraM2: r4(mm2ToM2(extraA)),
    breakdown: bd,
  };
}

/**
 * THE CODE ON THE CNC LABEL (cnc/partLabel.js): the rule's paint code,
 * compact (no spaces, so the label block keeps its word count), or '' for a
 * part the law does not paint. Set 2 is said by the caller: a label knows
 * nothing about the job's carcass material.
 */
export function sprayCodeFor(panel, { set2 = false, openUnit = false, profile = null } = {}) {
  try { spraySettings(profile); } catch { return ''; }
  const rule = sprayRuleFor(panel, { set2, openUnit, profile });
  if (!rule) return '';
  const R = ruleRecord(rule.id, profile) || {};
  let code = R.code || '';
  if (rule.id === 'carcass_set2') code = R.codes?.[rule.kind] || '';
  return String(code).replace(/\s+/g, '');
}

// === THE SCHEDULE ============================================================

const ELEMENT_LABELS = Object.freeze({
  door: 'Door', drawer_front: 'Drawer front', false_front: 'False / dummy front', blind_blank: 'Blind blank',
  front_moulding: 'Applied moulding strip', inner_front: 'Inner drawer front', end_panel: 'End panel',
  island_end: 'Island end panel', back_panel: 'Island back panel', mask: 'Mask', corner_post: 'Corner post 40',
  free_panel: 'Free panel', plinth: 'Plinth', infill: 'Side infill', top_infill: 'Top infill', cornice: 'Cornice',
  pelmet: 'Pelmet', upstand: 'Upstand', open_shelf25: 'Open shelf / top 25',
});
const CARCASS_LABELS = Object.freeze({
  side: 'Carcass side', horizontal: 'Carcass top / bottom', back: 'Carcass back, inside face', shelf: 'Carcass shelf', partition: 'Carcass partition',
});

/** What the page calls an element under a rule. */
export function elementLabel(rule) {
  if (!rule) return '';
  if (rule.id === 'carcass_set2') return CARCASS_LABELS[rule.kind] || 'Carcass';
  return ELEMENT_LABELS[rule.id] || rule.id;
}

/** Is this unit's carcass in SET 2: a veneer or a sprayed carcass. */
export function carcassSet2(unit, design, profile) {
  const d = migrateDesign(design);
  const r = resolveUnitDesign(unit, d);
  const source = r.carcassType?.source || null;
  if (source === 'sprayed' || source === 'veneer') return true;
  const f = resolveFinishes(unit, d, profile);
  return f.carcass?.kind === 'spray';
}

/** The colour record a resolved material gives: what the page groups by. */
function colourOf(resolved, fallbackLabel) {
  const finish = resolved?.finish || null;
  const label = finish?.label || resolved?.label || fallbackLabel || 'No colour chosen';
  return {
    key: finish?.id || resolved?.key || `name:${label}`,
    label,
    hex: finish?.hex || resolved?.hex || null,
    kind: finish?.kind || null,
  };
}

const sizeOf = (w, h, t) => `${fmt(w)} x ${fmt(h)} x ${fmt(t)}`;
function fmt(v) {
  const n = Number(v) || 0;
  return Number.isInteger(n) ? String(n) : String(roundTo(n, 1));
}

/** The line key the typed note is stored under: deterministic, no unit in it (the units are listed on the line). */
export function lineKeyOf({ colourKey, ruleId, kind, w, h, t, code }) {
  return [colourKey, ruleId, kind || '', `${fmt(w)}x${fmt(h)}x${fmt(t)}`, String(code).replace(/\s+/g, '')].join('|');
}

/**
 * THE WHOLE SCHEDULE OF A JOB.
 *
 * @param {object} args
 *   results | entries  [{ unit, result }], the store's `allResults()` shape
 *   design, profile
 *   materials          the stock list (for an element override's board name)
 *   assignments        the project's assignment blob (the paint per set)
 *   notes              project.sprayNotes: { [lineKey]: text }
 *   project            { name, number, client, deadline, titleBlock }
 *   date               already formatted; the engine owns no clock
 * @returns {{ info, groups, lines, cards, paint, totals }}
 */
export function sprayScheduleFor({
  results = null, entries = null, design = null, profile = null, materials = [], assignments = null,
  notes = null, project = null, date = '',
} = {}) {
  const S = spraySettings(profile);
  const list = Array.isArray(results) ? results : (Array.isArray(entries) ? entries : []);
  const d = migrateDesign(design);
  const merged = new Map();
  const colours = new Map();
  let set2Any = false;

  const push = ({ unit, result, panel, rule, set, resolved, fallbackLabel }) => {
    const area = sprayAreaFor(panel, rule, profile);
    if (!(area.m2Each > 0)) return;
    const colour = colourOf(resolved, fallbackLabel);
    const w = Number(panel.w) || 0; const h = Number(panel.h) || 0; const t = Number(panel.thickness) || 0;
    const code = area.code;
    const key = lineKeyOf({ colourKey: colour.key, ruleId: rule.id, kind: rule.kind, w, h, t, code });
    const unitNum = String(result?.unitNum ?? unit?.params?.unit_num ?? unit?.id ?? '');
    const qty = Number(panel.qty) || 1;
    // A GROUP is one colour of one SET: the fronts' topcoat and a veneer or
    // sprayed carcass's coat are two paint lines even where the colour's key
    // is the same (a carcass with no colour of its own falls to the job's
    // label, which the fronts carry too; the PART F walk read one line where
    // the owner's law asks two). The colour's own key stays on the group as
    // `colourKey`; the group key carries the set.
    const gkey = `${colour.key}|set${set}`;
    if (!colours.has(gkey)) colours.set(gkey, { ...colour, key: gkey, colourKey: colour.key, set, m2: 0, edgesLm: 0, lines: 0 });
    const c = colours.get(gkey);
    c.m2 = r4(c.m2 + area.m2Each * qty);
    c.edgesLm = r3(c.edgesLm + area.edgesLm * qty);
    const row = merged.get(key);
    if (row) {
      row.qty += qty;
      if (!row.units.includes(unitNum)) row.units.push(unitNum);
      row.m2 = r4(row.m2Each * row.qty);
      row.edgesLm = r3(row.edgesLmEach * row.qty);
      row.partIds.push(`${unitNum}:${panel.id}`);
      return;
    }
    c.lines += 1;
    merged.set(key, {
      key,
      colour,
      set,
      ruleId: rule.id,
      ruleNo: (ruleRecord(rule.id, profile) || {}).no ?? 99,
      kind: rule.kind,
      element: elementLabel(rule),
      code,
      w, h, t,
      size: sizeOf(w, h, t),
      m2Each: area.m2Each,
      edgesLmEach: area.edgesLm,
      qty,
      m2: r4(area.m2Each * qty),
      edgesLm: r3(area.edgesLm * qty),
      units: [unitNum],
      partIds: [`${unitNum}:${panel.id}`],
      breakdown: area.breakdown,
      note: (notes && notes[key]) || '',
      cardRule: CARD_RULES.includes(rule.id),
    });
  };

  for (const entry of list) {
    const unit = entry?.unit || null;
    const result = entry?.result || null;
    if (!result) continue;
    const set2 = unit ? carcassSet2(unit, d, profile) : false;
    if (set2) set2Any = true;
    const openUnit = unitIsOpen(result);
    const finishes = resolveFinishes(unit, d, profile);
    for (const panel of result.panels || []) {
      const rule = sprayRuleFor(panel, { set2, openUnit, profile });
      if (!rule) continue;
      const resolved = resolvePanelMaterial(panel, unit, d, profile, materials);
      // A set-2 carcass board is grouped under the CARCASS colour; a shelf of
      // row 20 in a set-1 unit under the fronts' (it is sprayed with the doors).
      const set = rule.id === 'carcass_set2' ? 2 : 1;
      const fallback = set === 2 ? finishes.carcass?.label : finishes.front?.label;
      push({ unit, result, panel, rule, set, resolved: set === 2 || rule.id !== 'open_shelf25' ? resolved : { ...resolved, finish: finishes.front }, fallbackLabel: fallback });
    }
    // 16 - the cornice: a bought moulding, no panel; its metres are the hardware line's.
    for (const hwRow of result.hardware || []) {
      if (hwRow.role !== 'cornice' || !(Number(hwRow.qty) > 0)) continue;
      const spec = hwRow.spec || {};
      const lengthMm = (Number(hwRow.qty) || 0) * 1000;
      const pseudo = { id: 'CORNICE', part: 'CORNICE', role: 'cornice', w: lengthMm, h: Number(spec.height_mm) || 0, thickness: Number(spec.projection_mm) || 0, qty: 1 };
      push({ unit, result, panel: pseudo, rule: { id: 'cornice', kind: null }, set: 1, resolved: { finish: finishes.front, label: finishes.front?.label }, fallbackLabel: finishes.front?.label });
    }
  }

  // Groups by colour, lines by rule then size; numbered down the page.
  const groups = [...colours.values()]
    .sort((a, b) => a.set - b.set || String(a.label).localeCompare(String(b.label)))
    .map((c) => ({
      ...c,
      lines: [...merged.values()].filter((l) => l.colour.key === c.colourKey && l.set === c.set)
        .sort((a, b) => a.ruleNo - b.ruleNo || a.element.localeCompare(b.element) || b.h - a.h || b.w - a.w),
    }));
  let no = 0;
  const lines = [];
  for (const g of groups) for (const l of g.lines) { no += 1; l.no = no; lines.push(l); }

  const cards = buildCards(lines, profile);
  const paint = paintOrderFor(groups, { profile, assignments, materials });
  const totals = {
    parts: lines.reduce((s, l) => s + l.qty, 0),
    lines: lines.length,
    m2: r4(lines.reduce((s, l) => s + l.m2, 0)),
    edgesLm: r3(lines.reduce((s, l) => s + l.edgesLm, 0)),
  };
  return {
    info: {
      project: project?.name || 'Untitled project',
      number: project?.number ? String(project.number) : '',
      client: project?.client || '',
      type: project?.type || project?.projectType || '',
      deadline: project?.deadline || project?.titleBlock?.deadline || '',
      date,
      sets: { set1: lines.some((l) => l.set === 1), set2: set2Any },
      colours: groups.map((g) => ({ key: g.key, label: g.label, hex: g.hex, set: g.set, m2: g.m2 })),
      wastePct: S.wastePct,
      edgesInM2: S.edgesInM2 !== false,
    },
    groups,
    lines,
    cards,
    paint,
    totals,
  };
}

// === THE CARDS (PART B) ======================================================

/**
 * THE BOARD UNFOLDED, as data a drawing can lay out: the face, the back and
 * the four edges, each saying whether it is painted and how much of it. A
 * drawing draws the edges THICKER than true and says so (`edgesExaggerated`).
 */
export function unfoldBoard(ruleId, { w, h, t }, profile = null) {
  const S = spraySettings(profile);
  const R = ruleRecord(ruleId, profile) || {};
  const f = Number(R.backFrameMm ?? R.faceStripMm ?? S.frameMm) || 0;
  const none = { top: 'none', bottom: 'none', left: 'none', right: 'none' };
  const all = { top: 'all', bottom: 'all', left: 'all', right: 'all' };
  const base = {
    w, h, t, edgesExaggerated: true, numbers: { frameMm: null, stripMm: null, sideMm: null },
  };
  switch (ruleId) {
    case 'end_panel': case 'island_end': case 'back_panel':
      return { ...base, face: { painted: 'all' }, back: { painted: 'frame', frameMm: f }, edges: all, numbers: { ...base.numbers, frameMm: f } };
    case 'blind_blank':
      return { ...base, face: { painted: 'strip', stripMm: f, side: 'left' }, back: { painted: 'none' }, edges: { top: `${f}`, bottom: `${f}`, left: 'all', right: 'none' }, numbers: { ...base.numbers, stripMm: f } };
    case 'corner_post':
      return { ...base, face: { painted: 'all' }, back: { painted: 'none' }, edges: { top: 'all', bottom: 'none', left: 'all', right: 'all' } };
    case 'plinth':
      return { ...base, face: { painted: 'all' }, back: { painted: 'none' }, edges: { ...none, top: 'all' } };
    case 'infill':
      return { ...base, face: { painted: 'all' }, back: { painted: 'none' }, edges: { ...none, right: 'all' }, edgeNote: 'the edge toward the unit' };
    case 'top_infill':
      return { ...base, face: { painted: 'all' }, back: { painted: 'none' }, edges: { ...none, bottom: 'all' }, edgeNote: 'the edge toward the unit' };
    case 'mask':
      return { ...base, face: { painted: 'all', label: 'underside' }, back: { painted: 'none', label: 'top (against the carcass)' }, edges: { ...none, bottom: 'all' }, edgeNote: 'the front edge' };
    case 'front_moulding':
      return { ...base, face: { painted: 'after gluing', label: 'face, painted with the door after gluing' }, back: { painted: 'none', label: 'glued to the door' }, edges: { top: 'all', bottom: 'all', left: 'none', right: 'none' }, numbers: { ...base.numbers, sideMm: Number(R.sideMm) || t }, edgeNote: `both ${Number(R.sideMm) || t} mm sides` };
    default:
      return { ...base, face: { painted: 'all' }, back: { painted: 'all' }, edges: all };
  }
}

function buildCards(lines, profile) {
  const out = [];
  for (const ruleId of CARD_RULES) {
    const mine = lines.filter((l) => l.ruleId === ruleId);
    if (!mine.length) continue;
    const R = ruleRecord(ruleId, profile) || {};
    const first = mine[0];
    out.push({
      ruleId,
      no: R.no ?? null,
      title: `${R.no != null ? `${R.no}. ` : ''}${elementLabel({ id: ruleId, kind: null })}`,
      code: first.code,
      rule: R,
      board: { w: first.w, h: first.h, t: first.t },
      unfolded: unfoldBoard(ruleId, { w: first.w, h: first.h, t: first.t }, profile),
      lines: mine.map((l) => ({
        key: l.key, no: l.no, units: l.units, size: l.size, qty: l.qty, m2Each: l.m2Each, m2: l.m2, edgesLm: l.edgesLm, breakdown: l.breakdown, colour: l.colour,
      })),
      m2: r4(mine.reduce((s, l) => s + l.m2, 0)),
    });
  }
  return out;
}

// === THE PAINT (PART C) ======================================================

/** The paint record a warehouse row carries, normalised; the defaults where it says nothing. */
function paintSpecOf(material, profile = null) {
  const S = spraySettings(profile);
  const p = paintOf(material) || {};
  const coats = Number(p.coats) > 0 ? Number(p.coats) : S.defaults.coats;
  const coverage = Number(p.coverage_m2_per_l) > 0 ? Number(p.coverage_m2_per_l) : S.defaults.coverageM2PerL;
  const sizes = Array.isArray(p.tin_sizes_l) && p.tin_sizes_l.length ? p.tin_sizes_l : S.defaults.tinSizesL;
  return {
    type: p.type || null,
    sheen: p.sheen || null,
    coats,
    coverage,
    tinSizesL: [...new Set(sizes.map(Number).filter((v) => v > 0))].sort((a, b) => a - b),
    // The row said its own coverage AND coats; a row that says neither is priced
    // at the profile's defaults and the page says so.
    fromMaterial: Boolean(p.coverage_m2_per_l && p.coats),
  };
}

/** Litres = m2 x coats / coverage, plus the waste. */
export function litresFor(m2, { coats, coverage, wastePct }) {
  if (!(m2 > 0) || !(coverage > 0)) return 0;
  return roundTo((m2 * coats / coverage) * (1 + (Number(wastePct) || 0) / 100), 2);
}

/**
 * TINS ROUNDED UP to the material's sizes: the largest tin for the bulk, the
 * smallest tin that still covers the remainder. Never under the litres.
 * @returns {Array<{sizeL:number, count:number}>} sorted largest first
 */
export function tinsFor(litres, sizes) {
  const list = [...new Set((sizes || []).map(Number).filter((v) => v > 0))].sort((a, b) => a - b);
  if (!(litres > 0) || !list.length) return [];
  const big = list[list.length - 1];
  const counts = new Map();
  let n = Math.floor(litres / big + 1e-9);
  const rem = roundTo(litres - n * big, 4);
  if (n > 0) counts.set(big, n);
  if (rem > 1e-9) {
    const fit = list.find((s) => s >= rem - 1e-9) || big;
    counts.set(fit, (counts.get(fit) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[0] - a[0]).map(([sizeL, count]) => ({ sizeL, count }));
}

/** The paint material a set is assigned, out of the stock list, or null. */
function paintMaterialFor(set, { assignments = null, materials = [] } = {}) {
  const data = normalizeAssignments(assignments);
  const a = assignmentFor(data, PAINT_PART_IDS[set], null);
  if (!a?.material_id) return null;
  return (materials || []).find((m) => m.id === a.material_id) || null;
}

/**
 * PART C: per colour the m2, coats, coverage, waste, litres, tins and which
 * paint material; a missing price is SAID, never a zero.
 */
export function paintOrderFor(groups, { profile = null, assignments = null, materials = [] } = {}) {
  const S = spraySettings(profile);
  return (groups || []).filter((g) => g.m2 > 0).map((g) => {
    const material = paintMaterialFor(g.set, { assignments, materials });
    const spec = paintSpecOf(material, profile);
    const litres = litresFor(g.m2, { coats: spec.coats, coverage: spec.coverage, wastePct: S.wastePct });
    const tins = tinsFor(litres, spec.tinSizesL);
    const orderedL = roundTo(tins.reduce((s, t) => s + t.sizeL * t.count, 0), 2);
    const price = material ? (material.cost_per_unit ?? material.price ?? null) : null;
    const priced = price != null && Number.isFinite(Number(price)) && Number(price) > 0;
    return {
      colour: { key: g.key, label: g.label, hex: g.hex },
      set: g.set,
      partId: PAINT_PART_IDS[g.set],
      m2: g.m2,
      edgesLm: g.edgesLm,
      coats: spec.coats,
      coverage: spec.coverage,
      wastePct: S.wastePct,
      litres,
      tins,
      orderedL,
      material: material ? { id: material.id, name: material.name, unit: material.unit || 'L', type: spec.type, sheen: spec.sheen } : null,
      specFromMaterial: spec.fromMaterial,
      priceMissing: !priced,
      pricePerUnit: priced ? Number(price) : null,
      cost: priced ? roundTo(orderedL * Number(price), 2) : null,
      says: !material
        ? `No paint assigned to set ${g.set}: Database > Assign materials > Consumable > ${g.set === 1 ? 'Paint, set 1' : 'Paint, set 2'}.`
        : (!priced ? `${material.name}: no price on the warehouse row, the line cannot be costed.` : ''),
    };
  });
}

/**
 * THE BOM'S HOOK: litres per sprayed set, keyed by the registry part, in the
 * shape `buildCabinetPartQtys` hands `mergeUnitMaterials` (`pcs` is the one
 * numeric field `resolvePartTotal` reads for a part counted in neither m2 nor
 * m; the unit says what it is). A set with nothing sprayed is absent.
 */
export function paintPurchaseQtys(entries, { design = null, profile = null, assignments = null, materials = [] } = {}) {
  const out = {};
  let schedule;
  try {
    schedule = sprayScheduleFor({ entries, design, profile, materials, assignments });
  } catch {
    return out;
  }
  for (const p of schedule.paint) {
    const id = p.partId;
    if (!(p.litres > 0)) continue;
    if (!out[id]) out[id] = { pcs: 0, unit: 'L' };
    out[id].pcs = roundTo(out[id].pcs + p.litres, 2);
  }
  return out;
}

// === T-CC2a F7 . PAINT BY COLOUR, PRIMER, SOLVENT (CLAUDE.md T-CC2a laws 4, 7) ===
//
// The owner, 01.11.2026, 12:50: *"na farby jeden link z nazwa bespoke kolor
// (kolor w nazwie), linkowanie kolorow nie ma sensu ... rozpuszczalnik 5
// procent ilosc farby ... ilosc farby na sqm malowania oraz dodac primer czy
// basecoat"*; 13:28: *"2 razy zeby bylo widomo ile jednej i drugiej farby"*.
//
// ONE line a COLOUR the job sprays (the schedule's groups above, set 1 and set
// 2 of one colour are one tin), all priced through the ONE link of the
// catalogue's `paint.bespoke`; ONE primer line for the whole sprayed area at
// `profile.spray.primerCoats`; ONE solvent line at `profile.spray.solventPct`
// of the colours' litres. The litres are this file's own law (`litresFor`:
// m2 x coats / coverage, plus the waste); the coverage is the link's
// `coverage_m2_per_l` where the company typed one, the profile's default
// otherwise. A faced or raw board is not painted: its group is no paint line.
// A VENEERED set 2 is lacquered (*"lakiery tylko piszemy lakier i tyle"*):
// one lacquer line, the same litres law. Stain has no live source tonight;
// the catalogue holds it.

/**
 * Is this schedule group a tin of paint? A SPRAYED colour (`kind: 'spray'`,
 * engine/design.js sprayFinish), or one of the profile's plain colours (the
 * broken white a job with no colour chosen is sprayed in, T78's own law). An
 * Egger unicolour decor is `kind: 'colour'` too and is a BOARD, never paint.
 */
function isPaintGroup(g) {
  if (g.kind === 'spray') return true;
  return g.kind === 'colour' && !String(g.colourKey || g.key || '').startsWith('egger:');
}

/** The colour's own name off its group label ("RAL 3005 Wine Red spray" reads "RAL 3005 Wine Red"). */
function paintColourName(group) {
  return String(group.label || 'No colour chosen').replace(/\s+spray$/i, '');
}

/**
 * THE PAINT LINES OF A JOB (T-CC2a F7).
 *
 * @param {Array} entries  [{ unit, result }]
 * @param {object} args    design, profile; `coverage` / `primerCoverage` the
 *                         links' own m2 per litre (null: the profile's default)
 * @returns {Array<{ role:'paint'|'primer'|'solvent', colour:string|null,
 *   name:string, m2:number, litres:number, coats:number|null,
 *   coverage:number|null, pct?:number }>}
 */
export function paintLinesFor(entries, {
  design = null, profile = null, coverage = null, primerCoverage = null,
} = {}) {
  const S = spraySettings(profile);
  let schedule;
  try {
    schedule = sprayScheduleFor({ entries, design, profile });
  } catch {
    return [];
  }
  const cov = Number(coverage) > 0 ? Number(coverage) : S.defaults.coverageM2PerL;
  const primerCov = Number(primerCoverage) > 0 ? Number(primerCoverage) : S.defaults.coverageM2PerL;
  const coats = S.defaults.coats;
  const byColour = new Map();
  let lacquerM2 = 0;
  for (const g of schedule.groups || []) {
    if (!(g.m2 > 0)) continue;
    if (g.kind === 'veneer') { lacquerM2 = r4(lacquerM2 + g.m2); continue; }
    if (!isPaintGroup(g)) continue;
    const name = paintColourName(g);
    const had = byColour.get(name) || { m2: 0, hex: g.hex || null };
    had.m2 = r4(had.m2 + g.m2);
    byColour.set(name, had);
  }
  const lines = [];
  let colourLitres = 0;
  let sprayedM2 = 0;
  for (const [name, c] of [...byColour.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const litres = litresFor(c.m2, { coats, coverage: cov, wastePct: S.wastePct });
    colourLitres += litres;
    sprayedM2 += c.m2;
    lines.push({
      role: 'paint', colour: name, hex: c.hex, name: `Paint, bespoke colour: ${name}`, m2: c.m2, litres, coats, coverage: cov,
    });
  }
  if (lacquerM2 > 0) {
    lines.push({
      role: 'lacquer', colour: null, name: 'Lacquer', m2: lacquerM2,
      litres: litresFor(lacquerM2, { coats, coverage: S.defaults.coverageM2PerL, wastePct: S.wastePct }), coats, coverage: S.defaults.coverageM2PerL,
    });
  }
  if (!byColour.size) return lines;
  const primerCoats = Number(S.primerCoats) > 0 ? Number(S.primerCoats) : 0;
  if (primerCoats > 0) {
    lines.push({
      role: 'primer', colour: null, name: 'Primer or basecoat', m2: r4(sprayedM2),
      litres: litresFor(sprayedM2, { coats: primerCoats, coverage: primerCov, wastePct: S.wastePct }), coats: primerCoats, coverage: primerCov,
    });
  }
  const pct = Number(S.solventPct) > 0 ? Number(S.solventPct) : 0;
  if (pct > 0) {
    lines.push({
      role: 'solvent', colour: null, name: 'Solvent', m2: 0,
      litres: roundTo((colourLitres * pct) / 100, 2), coats: null, coverage: null, pct,
    });
  }
  return lines;
}

// === THE PAINT AS A MATERIAL =================================================

/**
 * The warehouse's PAINTS department, dressed as stock-list rows the material
 * picker and the BOM read (`category: 'paint'`, a price per unit, the paint
 * record beside them). A row with no name is not a product and is left out.
 */
export function paintMaterialsFrom(rows = []) {
  return (rows || [])
    .filter((r) => r && String(r.category || '').toLowerCase() === 'paints' && String(r.name || '').trim())
    .map((r) => ({
      id: r.id,
      code: r.item_number || null,
      name: r.name,
      category: PAINT_CATEGORY,
      unit: r.unit || 'L',
      price: r.cost_per_unit ?? null,
      cost_per_unit: r.cost_per_unit ?? null,
      price_source: r.price_source || null,
      jc_uuid: r.jc_uuid || null,
      color: r.color || '',
      paint: r.paint || null,
      fromWarehouse: true,
    }));
}

/** The stock list with the warehouse's paints beside it; a paint already in the list is not doubled. */
export function withPaints(materials = [], warehouseRows = []) {
  const own = Array.isArray(materials) ? materials : [];
  const have = new Set(own.map((m) => m.id));
  return [...own, ...paintMaterialsFrom(warehouseRows).filter((p) => !have.has(p.id))];
}
