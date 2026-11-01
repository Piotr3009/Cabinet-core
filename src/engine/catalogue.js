/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── T-CC2a · ONE CATALOGUE IN CABINET CORE (CLAUDE.md T-CC2a PART A) ────────
//
// The owner, 01.11.2026, 12:34: *"musimy miec liste materialow wszystkich
// materialow jakie CC uzywa i wtedy dopiero przypisujemy wszystko a lista BOM
// do danego projektu sie bierze z tej bazy danych"*; *"kazdy material musi miec
// identyfikator ... nie moze byc po nazwie"*. 12:50: *"CC powinien miec swoja
// (nie widoczna) numeracje materialow, a nazwa tylko sie wyswietla"*.
//
// THIS TURN REVERSES T-CC1b's LAW 6. A material in Cabinet Core is an ENTRY of
// this catalogue (src/engine/catalogueData.js, generated append only by
// scripts/t-cc2a-catalogue.mjs) with a hidden id that never changes. A company
// links each entry once to one row of its Joinery Core stock (lib/jcLinks.js);
// the BOM of every project reads the links (engine/bom.js purchaseBom).
//
// Three questions, three answers, and no fourth:
//
//   catalogueIdOfBoard   a BOARD CHOICE of the design (source, decor, thickness)
//                        to its sheet entry. Law 2: a board is what the design
//                        says; the cut list, the purchase list, the 3D finish
//                        and the BOM read the SAME resolver (engine/materials.js
//                        boardChoiceOfPanel hands it the choice).
//   catalogueIdOfLine    a hardware, edging or paint LINE of the BOM to its
//                        entry, from the line's ROLE and its structured fields,
//                        never from its `spec_label`. Where the engine gives a
//                        role nothing structured, the ONE bridge table below
//                        reads the label, each row naming its emitter.
//   boardChoiceOfOldId   an old Cabinet Core material id (the sample rows of
//                        the stores before T-CC1b, the three generics) to the
//                        source and thickness it meant: the ONE old-id table of
//                        F13. A Joinery Core uuid is never mapped by name.
//
// No id is computed at run time: every lookup FINDS an entry by the fields it
// carries (`match`, `decorId`, `thickness`, `brand`). Names are for display
// only and may change; no code path here selects by name.
//
// Pure: no store, no React, no network.

import { CATALOGUE_DATA } from './catalogueData.js';
import { thicknessForSource } from './projectSettings.js';

// ─── THE WINDOW'S TABS (F1.1) ────────────────────────────────────────────────

/** The departments, in the order the Link materials window shows them (*"departamenty podzielone na gorze"*). */
export const DEPARTMENTS = Object.freeze([
  Object.freeze({ id: 'sheets', label: 'Sheets' }),
  Object.freeze({ id: 'hinges', label: 'Hinges' }),
  Object.freeze({ id: 'runners', label: 'Runners' }),
  Object.freeze({ id: 'ironmongery', label: 'Ironmongery' }),
  Object.freeze({ id: 'internal', label: 'Internal fittings' }),
  Object.freeze({ id: 'paint', label: 'Paint' }),
  Object.freeze({ id: 'consumables', label: 'Consumables' }),
]);

/**
 * The sheet brands (*"decory wszystkie ale podziel na rozne formy, narazie mamy
 * eggery ale dojda veneery i dojda przeciez fenixy i kronospany"*). The three
 * `soon` brands carry no entries tonight.
 */
export const SHEET_BRANDS = Object.freeze([
  Object.freeze({ id: 'egger', label: 'Egger' }),
  Object.freeze({ id: 'mdf', label: 'MDF' }),
  Object.freeze({ id: 'generic', label: 'Generic' }),
  Object.freeze({ id: 'veneer', label: 'Veneer', soon: true }),
  Object.freeze({ id: 'fenix', label: 'Fenix', soon: true }),
  Object.freeze({ id: 'kronospan', label: 'Kronospan', soon: true }),
]);

/** The words of a line whose material the catalogue does not hold yet (law 7). */
export const NOT_IN_CATALOGUE = 'Not in the catalogue yet';

// ─── THE ENTRIES ─────────────────────────────────────────────────────────────

const freezeEntry = (e) => Object.freeze({ ...e, ...(e.match ? { match: Object.freeze({ ...e.match }) } : {}) });
const ALL = Object.freeze(CATALOGUE_DATA.map(freezeEntry));
const BY_ID = new Map(ALL.map((e) => [e.id, e]));
const LIVE = ALL.filter((e) => !e.retired);

/** Every entry of the catalogue, retired ones included (law 1: an id is never deleted). Frozen. */
export function catalogueEntries() {
  return ALL;
}

/** One entry by its id, or null. */
export function entryById(id) {
  return BY_ID.get(String(id ?? '')) || null;
}

/** The entries of one department (and brand), retired ones EXCLUDED: what the window offers. */
export function entriesOf(department, brand = undefined) {
  return LIVE.filter((e) => e.department === department && (brand == null || e.brand === brand));
}

// ─── F2.1 · THE BOARD RESOLVER ───────────────────────────────────────────────

const SHEETS = new Map();
for (const e of LIVE) {
  if (e.kind !== 'sheet') continue;
  const key = `${e.brand}|${e.decorId || ''}|${Number(e.thickness)}`;
  if (!SHEETS.has(key)) SHEETS.set(key, e);
}
const EDGES = new Map();
for (const e of LIVE) if (e.kind === 'edging' && e.decorId) EDGES.set(`${e.brand}|${e.decorId}`, e);

const DECOR_PREFIX = 'egger:';
/** An Egger decor id out of a finish id ('egger:H3325_28') or a bare decor id. */
function decorIdOf(finishOrDecor) {
  const s = String(finishOrDecor || '');
  if (!s) return null;
  if (s.startsWith(DECOR_PREFIX)) return s.slice(DECOR_PREFIX.length) || null;
  return null;
}

// The source words the design stores (profile.projectSettings carcassSources /
// frontSources, the old ids' own), sorted into what is BOUGHT.
const MDF_SOURCES = new Set(['sprayed', 'spray', 'raw', 'mdf', 'ral', 'fb']);
const DECOR_SOURCES = new Set(['egger', 'laminate', 'decor']);
const SOON_SOURCES = new Set(['veneer', 'wood', 'plywood', 'hdf']);

/** Is this source a sprayed or raw MDF board (its edges are painted or left, never taped)? */
export function isMdfSource(source) {
  return MDF_SOURCES.has(String(source || '').toLowerCase());
}

const answer = (id, reason = null, extra = {}) => ({ id, reason, ...extra });
const notIn = (why, extra = {}) => answer(null, NOT_IN_CATALOGUE, { why, ...extra });

/** The thickness a source pins, when a choice carries none (profile.projectSettings). */
function sourceThickness(source, side, profile) {
  if (!profile) return null;
  const sides = side ? [side] : ['front', 'carcass'];
  for (const s of sides) {
    const t = Number(thicknessForSource(profile, s, source));
    if (t > 0) return t;
  }
  return null;
}

/**
 * A stored board choice, read into the four things a sheet is (F2.1): its
 * source, its decor, its colour and its thickness. Accepts every shape the
 * design stores: `{ source, finish_id }` (a carcass or front type), `{ source,
 * finishId }`, `{ source, decorId }`, a choice of `boardChoiceOfEntry`.
 */
export function normaliseBoardChoice(choice) {
  if (!choice || typeof choice !== 'object') return null;
  const finishId = choice.finishId ?? choice.finish_id ?? null;
  const decorId = choice.decorId ? String(choice.decorId) : decorIdOf(finishId);
  const source = choice.source == null || choice.source === '' ? null : String(choice.source).toLowerCase();
  const t = Number(choice.thickness);
  return {
    source,
    decorId,
    finishId: finishId == null ? null : String(finishId),
    colour: choice.colour ?? null,
    thickness: t > 0 ? t : null,
    ...(choice.side ? { side: choice.side } : {}),
    ...(choice.unknown ? { unknown: true } : {}),
  };
}

// ─── THE REDUCTION OF A TYPE TO ITS BOARD CHOICE (one place) ────────────────
// A carcass or front TYPE of the design reduced to the choice this resolver
// reads. The cut list reads it (engine/materials.js boardChoiceOfPanel) and so
// does the wizard's gate (engine/projectSettings.js materialsAssigned, UX turn
// B1): one reduction, so the gate and the cut list never disagree about a
// board. Moved here unchanged from engine/materials.js (T-CC2a F3).

/** A carcass type's board choice: its source, its decor (or the project's old finish), no colour. */
export function carcassTypeChoice(type, d) {
  const finishId = type?.finish_id || d?.finish?.carcass || null;
  let source = type?.source || null;
  if (!source && finishId) source = String(finishId).startsWith('egger:') ? 'egger' : 'decor';
  return { source, finishId: source === 'sprayed' ? null : finishId, colour: source === 'sprayed' ? d?.colour?.carcass || null : null };
}

/** A front type's board choice: spray, raw, a faced decor, or nothing chosen. */
export function frontTypeChoice(type, d) {
  if (!type) {
    if (d?.colour?.front) return { source: 'spray', colour: d.colour.front };
    const finishId = d?.finish?.front || null;
    return { source: finishId ? (String(finishId).startsWith('egger:') ? 'laminate' : 'decor') : null, finishId };
  }
  let source = type.source || null;
  if (!source) {
    if (type.finish_id) source = String(type.finish_id).startsWith('egger:') ? 'laminate' : 'decor';
    else if (type.colour || d?.colour?.front) source = 'spray';
  }
  const faced = source === 'laminate' || source === 'egger' || source === 'decor';
  return { source, finishId: faced ? (type.finish_id || null) : null, colour: faced ? null : (type.colour || d?.colour?.front || null) };
}

/**
 * THE BOARD'S CATALOGUE ENTRY (law 2), from the design alone.
 *
 *   egger / laminate with a decor   → sheet.egger.<decor>.<t>
 *   sprayed / spray / raw / mdf     → sheet.mdf.<t>
 *   nothing chosen, or generic      → sheet.generic.<t>  (the honest placeholder)
 *   veneer / wood                   → null, "Not in the catalogue yet"
 *
 * The thickness is the one the engine cuts the slot at: the caller hands the
 * panel's own (engine/materials.js), or the slot's (engine/thickness.js); a
 * choice with none takes its source's (profile.projectSettings).
 *
 * @returns {{ id: string|null, reason: string|null, why?: string }}
 */
export function catalogueIdOfBoard(choice, profile = null) {
  const c = normaliseBoardChoice(choice);
  if (!c) return notIn('no board choice');
  if (c.unknown) return notIn('the board is a stock row of an old assignment, never mapped by name');
  const t = c.thickness ?? sourceThickness(c.source, c.side, profile) ?? (Number(profile?.board?.thickness) || null);
  if (!(t > 0)) return notIn('the board has no thickness');
  const src = c.source;
  if (src && SOON_SOURCES.has(src)) return notIn(`${src} boards are not in the catalogue yet`);
  let key;
  if (src && MDF_SOURCES.has(src)) key = `mdf||${t}`;
  else if ((src && DECOR_SOURCES.has(src)) || src === null || src === 'generic') {
    if (c.decorId) key = `egger|${c.decorId}|${t}`;
    else if (c.finishId && src !== 'generic') return notIn(`the decor "${c.finishId}" is not an Egger decor of the catalogue`);
    else key = `generic||${t}`;
  } else {
    return notIn(`the source "${src}" is not in the catalogue yet`, { unmatched: true });
  }
  const entry = SHEETS.get(key);
  if (!entry) return notIn(`no ${key.split('|')[0]} sheet ${c.decorId ? `${c.decorId} ` : ''}at ${t} mm in the catalogue`);
  return answer(entry.id);
}

/** A sheet entry back to a board choice (CONTRACT E): the UI stores a choice, never an id typed by hand. */
export function boardChoiceOfEntry(entry) {
  const e = typeof entry === 'string' ? entryById(entry) : entry;
  if (!e || e.kind !== 'sheet') return null;
  if (e.brand === 'egger') return { source: 'egger', finishId: `${DECOR_PREFIX}${e.decorId}`, decorId: e.decorId, thickness: e.thickness };
  if (e.brand === 'mdf') return { source: 'mdf', thickness: e.thickness };
  return { source: 'generic', thickness: e.thickness };
}

/** The edging entry a board's decor takes (the tape follows the decor), or null. */
export function edgeEntryOfBoard(boardId) {
  const e = entryById(boardId);
  if (!e || e.kind !== 'sheet' || !e.decorId) return null;
  return EDGES.get(`${e.brand}|${e.decorId}`) || null;
}

// ─── F2.2 · THE LINE RESOLVER ────────────────────────────────────────────────

const BY_ROLE = new Map();
for (const e of LIVE) {
  if (!e.role) continue;
  if (!BY_ROLE.has(e.role)) BY_ROLE.set(e.role, []);
  BY_ROLE.get(e.role).push(e);
}

/** A role that is the same product as another role's (one product, one entry). */
const ROLE_ALIAS = Object.freeze({
  // engine/bom.js mirrorCabinetOrderLines: the mirror cabinet's own driver is an LED driver.
  mirror_led_driver: 'led_driver',
});

const n = (v) => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));
const s = (v) => (v == null || v === '' ? null : String(v));
const BLUM_CODE = /^\d{2}[A-Z]\d{4}/;

/**
 * The structured fields each role's product is told apart by, read off the
 * line's `spec` (never its `spec_label`). `{ why }` is a NAMED reason the line
 * has no product of its own; a role absent here goes to the bridge table.
 */
const FIELDS = Object.freeze({
  // engine/cabinet.js hw('hinges') :12075; the mirror cabinet's (bom.js mirrorCabinetOrderLines).
  hinges: (sp) => {
    if (sp.family === 'inframe') return sp.article ? { family: 'inframe', article: s(sp.article) } : { why: 'the in-frame hinge has no article' };
    const angle = n(sp.angle);
    if (angle == null) return { why: 'the hinge has no angle (the catalogue of record is not loaded, or the hinge is the owner\'s to name)' };
    if (sp.family === 'wide') return [{ family: 'wide', angle }, { angle, finish: s(sp.finish) }];
    if (!s(sp.finish)) return { why: 'the hinge has no finish (gold: Blum publishes no gold cup hinge)' };
    return { angle, finish: s(sp.finish) };
  },
  bifold_hinges: () => ({}),
  hawa_hinges: () => ({}),
  lift_hinges: () => ({ system: 'hf' }),
  hinge_plates: (sp) => (s(sp.plate) && s(sp.finish) ? { plate: s(sp.plate), finish: s(sp.finish) } : { why: 'the plate or its finish is unknown' }),
  runner_pairs: (sp) => (n(sp.nl) && s(sp.variant)
    ? { system: s(sp.system), nl: n(sp.nl), variant: s(sp.variant) }
    : { why: 'the runner is below the ladder or has no variant' }),
  runner_sync_rods: (sp) => ({ kind: s(sp.kind) }),
  legs: () => ({}),
  plinth_clips: () => ({}),
  plinth_clip_connectors: () => ({}),
  hangers: () => ({}),
  vanity_hangers: () => ({}),
  handle: (sp) => {
    if (sp.type === 'bar') return { type: 'bar', centres: n(sp.centres) };
    if (sp.type === 'knob') return { type: 'knob' };
    if (sp.type === 'jpull') return { why: 'a J-pull is machined into the front, nothing is bought', notBought: true };
    return { why: `the handle type "${sp.type}" is not in the catalogue yet` };
  },
  cabineo_connector: (sp) => ({ variant: s(sp.variant), mounting: s(sp.mounting) }),
  cabineo_cap: (sp) => ({ mounting: s(sp.mounting) }),
  cabineo_insert: (sp) => ({ variant: s(sp.variant) }),
  worktop_bolts: () => ({}),
  hawa_set: (sp) => ({ class: n(sp.class), push: sp.push !== false, hand: s(sp.hand) }),
  hawa_connector: (sp) => ({ doors: n(sp.doors) }),
  hawa_tracks: () => ({}),
  hawa_stiffener: () => ({}),
  hawa_foot: () => ({}),
  cornice: (sp) => ({ height_mm: n(sp.height_mm) }),
  rail: () => ({}),
  rail_supports: () => ({}),
  shelf_pins: (sp) => ({ diameter_mm: n(sp.diameter_mm) }),
  drawer_insert: (sp) => ({ variant: sp.variant === 'belt_tie_glass' ? 'belt_tie' : s(sp.variant) }),
  watch_insert: () => ({}),
  drawer_glass: () => ({}),
  glass_pane: (sp) => ({ kind: s(sp.kind), pane_mm: n(sp.pane_mm) }),
  mirror: () => ({}),
  mirror_m2: (sp) => ({ thickness_mm: n(sp.thickness_mm) }),
  mirror_glass_shelf: (sp) => ({ thickness_mm: n(sp.thickness_mm) }),
  mirror_led_panel: () => ({}),
  led_driver: () => ({}),
  led_profile: () => ({}),
  led_spots: () => ({}),
  wardrobe_kit_trouser: () => ({}),
  wardrobe_kit_tie_rack: () => ({}),
  wardrobe_kit_pulldown_rail: () => ({}),
  wardrobe_kit_hooks: () => ({}),
  wardrobe_kit_valet_rod: () => ({}),
  carousel: () => ({}),
  space_corner: () => ({}),
  blind_pullout: () => ({}),
  bin_pullout: () => ({}),
  cargo_frame: () => ({}),
  ready_boxes: () => ({}),
  lift_unit: (sp) => (s(sp.article) ? { system: s(sp.system), article: s(sp.article) } : { why: 'no lift mechanism set covers this front (refused by the engine)' }),
  lift_arm: (sp) => (s(sp.article) ? { system: s(sp.system), article: s(sp.article) } : { why: 'no lever arm set covers this cabinet height' }),
  lift_caps: (sp) => (s(sp.article) ? { article: s(sp.article) } : { why: 'the cover cap set has no article' }),
  lift_bracket: (sp) => (s(sp.article) ? { article: s(sp.article) } : { why: 'the bracket set has no article' }),
  screws: (sp) => ({ d: n(sp.d) }),
  puzzle_screws: () => ({}),
  dowels: (sp) => ({ d: n(sp.d) }),
  // The roles a workshop never buys: the line is the client's appliance, or a note.
  appliance: () => ({ why: 'an appliance is the client\'s, supplied by others', notBought: true }),
  extractor: () => ({ why: 'an extractor is the client\'s appliance, supplied by others', notBought: true }),
});

/**
 * THE BRIDGE (F2.2): the roles the engine gives nothing structured, read by
 * their LABEL. One table, each row naming its emitter. A label a row of its
 * role does not know is UNMATCHED (a red test, never a silent fallback).
 */
export const LINE_BRIDGE = Object.freeze([
  // engine/ledStrips.js lightingBomLines :459 (`LED strip ${k} K`): no spec at all.
  Object.freeze({ role: 'led_strip', pattern: /^LED strip (\d{4}) K\b/, fields: (m) => ({ kelvin: Number(m[1]) }) }),
  // engine/bom.js mirrorCabinetOrderLines: 'LED strip under' / 'LED strip inside' carry spec.kelvin (read above the bridge).
  // engine/ledStrips.js lightingBomLines :475, the switch words of `switchWords`.
  Object.freeze({ role: 'led_switch', pattern: /^Door switch\b/, fields: () => ({ switch: 'door' }) }),
  Object.freeze({ role: 'led_switch', pattern: /^Motion sensor\b/, fields: () => ({ switch: 'sensor' }) }),
  Object.freeze({ role: 'led_switch', pattern: /^Touchless switch\b/, fields: () => ({ switch: 'touchless' }) }),
  Object.freeze({ role: 'led_switch', pattern: /^Switch\b/, fields: () => ({ why: 'the project has not chosen how its light is switched' }) }),
]);

const matches = (entry, want) => Object.entries(entry.match || {}).every(([k, v]) => want[k] === v)
  && Object.keys(want).every((k) => k === 'why' || Object.hasOwn(entry.match || {}, k) || want[k] == null);

function findByFields(role, want) {
  const pool = BY_ROLE.get(role) || [];
  const wants = Array.isArray(want) ? want : [want];
  for (const w of wants) {
    if (w?.why) return notIn(w.why, w.notBought ? { notBought: true } : {});
    const hit = pool.find((e) => matches(e, w));
    if (hit) return answer(hit.id);
  }
  return null;
}

/**
 * A BOM LINE'S CATALOGUE ENTRY (F2.2): hardware, edging and paint.
 *
 * @param {object} line  `{ role, label, spec, spec_label }` (the engine's
 *   hardware shape), or `{ role: 'edging', decorId }`, or `{ role: 'paint' |
 *   'primer' | 'solvent' | 'stain' | 'lacquer' }`
 * @returns {{ id: string|null, reason: string|null, why?: string, unmatched?: true, notBought?: true }}
 *   `notBought` names a line the workshop never buys (the client's appliance,
 *   a J-pull machined into the front): the purchase list leaves it out.
 */
export function catalogueIdOfLine(line) {
  if (!line || typeof line !== 'object') return notIn('no line', { unmatched: true });
  const role = ROLE_ALIAS[line.role] || String(line.role || '');
  if (role === 'edging') {
    const decor = line.decorId ? String(line.decorId) : decorIdOf(line.finishId);
    const e = decor ? EDGES.get(`egger|${decor}`) : null;
    return e ? answer(e.id) : notIn('the edging follows a board with no Egger decor');
  }
  const paint = { paint: 'paint.bespoke', primer: 'paint.primer', solvent: 'paint.solvent', stain: 'stain.bespoke', lacquer: 'lacquer' }[role];
  if (paint) return answer(entryById(paint)?.id ?? null, entryById(paint) ? null : NOT_IN_CATALOGUE);
  const sp = line.spec && typeof line.spec === 'object' ? line.spec : {};
  // A strip that carries its own kelvin (the mirror cabinet's) is structured; the lighting's is not.
  if (role === 'led_strip' && n(sp.kelvin)) {
    return findByFields(role, { kelvin: n(sp.kelvin) }) || notIn(`no LED strip at ${sp.kelvin} K in the catalogue`);
  }
  const fieldsOf = FIELDS[role];
  if (fieldsOf) {
    const hit = findByFields(role, fieldsOf(sp, line));
    return hit || notIn(`no ${role} product with these fields in the catalogue`, { unmatched: true });
  }
  const text = String(line.label || line.spec_label || '');
  for (const row of LINE_BRIDGE) {
    if (row.role !== role) continue;
    const m = row.pattern.exec(text);
    if (!m) continue;
    const hit = findByFields(role, row.fields(m));
    if (hit) return hit;
  }
  return notIn(`the line "${role}" is not known to the catalogue`, { unmatched: true });
}

// ─── F13 · THE OLD CABINET CORE IDS, ONE TABLE ──────────────────────────────
//
// Every old CC material id grep finds in `src/` history and the fixtures: the
// three generic placeholders (still in the store, T-CC1b GENERIC_MATERIALS)
// and the sample rows T-CC1b F9 deleted from the store (git show
// c3542b9~3:src/stores/materialAssignmentStore.js :70 to :89). Each maps to
// the SOURCE and THICKNESS it meant. `pinsThickness` marks the three that still
// pin the geometry on main (the store still holds them, so engine/thickness.js
// keeps reading their thickness through this table); the sample rows have
// pinned nothing since T-CC1b F9 deleted them, and reading their thickness now
// would re-cut the owner's 0003 at 19 where main cuts it at 18 (FROZEN 1).
// The hardware samples (`hw_*`) and the edging sample are not boards.
export const OLD_CC_IDS = Object.freeze({
  'generic-18': Object.freeze({ source: 'generic', thickness: 18, pinsThickness: true }),
  'generic-22': Object.freeze({ source: 'generic', thickness: 22, pinsThickness: true }),
  'generic-25': Object.freeze({ source: 'generic', thickness: 25, pinsThickness: true }),
  mat_mfc18_white: Object.freeze({ source: 'egger', thickness: 18 }), // MFC White W980 18 mm (W980 SM is not one of the 85)
  mat_mfc18_oak: Object.freeze({ source: 'egger', thickness: 18 }), // MFC Halifax Oak 18 mm (the decor is the slot's own finish_id)
  mat_mdf18: Object.freeze({ source: 'mdf', thickness: 18 }), // MDF 18 mm
  mat_ply18_birch: Object.freeze({ source: 'plywood', thickness: 18 }), // Birch Plywood 18 mm: not in the catalogue yet
  mat_mfc22_white: Object.freeze({ source: 'egger', thickness: 22 }), // MFC White W980 22 mm
  mat_mdf25_shaker: Object.freeze({ source: 'mdf', thickness: 25 }), // MDF Shaker blank 25 mm
  mat_mfc19_front: Object.freeze({ source: 'laminate', thickness: 19 }), // Melamine front 19 mm
  mat_hdf6_back: Object.freeze({ source: 'hdf', thickness: 6 }), // HDF backing 6 mm: not in the catalogue yet
});

/**
 * The source and thickness an old CC id meant, or null: null for a Joinery
 * Core uuid (never mapped by name: it becomes a suggestion, F9.3), for a
 * hardware or edging sample, and for anything unknown.
 */
export function boardChoiceOfOldId(materialId) {
  const row = OLD_CC_IDS[String(materialId ?? '')];
  return row ? { source: row.source, thickness: row.thickness, ...(row.pinsThickness ? { pinsThickness: true } : {}) } : null;
}

/** The slots of `design.boards` (F11.2): back panels, drawer bottoms and the four run pieces. */
export const BOARD_SLOTS = Object.freeze(['back', 'drawerBottom', 'plinth', 'infill', 'end_panel', 'mask']);

/**
 * F13 · AN OLD PROJECT'S BOARD CHOICES, FILLED ONCE AT LOAD (pure, idempotent).
 *
 * What it fills: a run piece on its own board (`sameAsFronts: false`) whose
 * only answer is an old CC id gets that id's board choice in `design.boards`
 * (the catalogue resolver reads it there). What it never does: write or clear
 * a `material_id` (law 2, FROZEN 4), touch a carcass or front type (their
 * choice is already the source, the decor and the colour they store), change
 * a thickness, or map a Joinery Core uuid. A design with nothing to fill comes
 * back as the SAME object.
 */
export function migrateBoardChoices(design, profile = null) {
  void profile;
  if (!design || typeof design !== 'object') return design;
  const boards = design.boards && typeof design.boards === 'object' ? design.boards : {};
  const fill = {};
  for (const role of ['plinth', 'infill', 'end_panel', 'mask']) {
    const own = design.runMaterials?.[role];
    if (!own || own.sameAsFronts !== false || boards[role]) continue;
    const old = boardChoiceOfOldId(own.material_id);
    if (!old) continue;
    fill[role] = { source: old.source, thickness: old.thickness };
  }
  if (!Object.keys(fill).length) return design;
  return { ...design, boards: { ...boards, ...fill } };
}
