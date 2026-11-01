import { create } from 'zustand';

import {
  normalizeAssignments, expandAssignments, legacyToCanonical, seedFromDefaults,
  assignmentFor, unassignedParts, unassignedByGroup, ALL_PARTS, PART_REGISTRY, migrateHardwareKeys,
  HARDWARE_TO_PART_ID,
} from '../engine/partRegistry.js';
import { hardwareDemand } from '../engine/bom.js';
import { loadJcStock, toMaterial } from '../lib/jcStock.js';

// ─── Material assignments per BOM role ───
// Pattern taken from Production Core's materialAssignmentStore: a canonical
// schema-2 object (base assignment + per-variant overrides) with a flat legacy
// view derived from it, plus a `yield` coefficient that models offcut waste.
//
// Cabinet Core roles come from SPEC 4.12: side / top / bottom / back / shelf /
// front / drawer_box. T-CC1b F9: the material behind a role is a Joinery Core
// stock_items uuid (lib/jcStock.js) or one of the three generic placeholders;
// the blob is schema 3 (engine/partRegistry.js, the hardware keys of F10).

export const BOM_ROLES = [
  { id: 'side',       label: 'Sides',          hint: 'BUL / BUR, drawer panels, fillers' },
  { id: 'top',        label: 'Top',            hint: 'Top panel' },
  { id: 'bottom',     label: 'Bottom',         hint: 'Bottom panel' },
  { id: 'back',       label: 'Back',           hint: 'Back panel' },
  { id: 'shelf',      label: 'Shelves',        hint: 'Shelves, partition, rail partition' },
  { id: 'front',      label: 'Fronts',         hint: 'Doors and drawer fronts' },
  { id: 'drawer_box', label: 'Drawer boxes',   hint: 'Drawer sides, front/back, bottoms' },
  // Turn 3: the automatics are cut pieces, so they get their own material.
  { id: 'plinth',     label: 'Plinth',         hint: 'Toe kick under standing units' },
  { id: 'infill',     label: 'Infill / scribe', hint: 'Fillers at the wall and up to the ceiling' },
  // Turn 4: a masking panel over the outside of a carcass side — usually cut
  // from the FRONT material, which is why it is its own role and not "sides".
  { id: 'end_panel',  label: 'End panels',     hint: 'Masking panels on the outside of a run' },
];

// Hardware roles. The ENGINE decides the quantities from the geometry
// (result.hardware); this list only says which roles exist and what they are
// called, so the same ASSIGN pattern covers hinges the way it covers boards.
// Counted in pieces and pairs, so no yield coefficient applies.
export const HARDWARE_ROLES = [
  { id: 'hinges',       label: 'Hinges',        hint: 'Per door, from the hinge rule' },
  { id: 'runner_pairs', label: 'Drawer runners', hint: 'One pair per drawer, at the snapped length' },
  // Turn 18 (CLAUDE.md F6.5): the rod that ties a wide drawer's two runners
  // together. Its own line because it is its own product with its own price,
  // and because a narrow drawer does not have one.
  { id: 'runner_sync_rods', label: 'Runner sync rods', hint: 'One per wide drawer — Blum’s own threshold' },
  { id: 'legs',         label: 'Legs',          hint: 'Per unit, from the profile' },
  { id: 'rail',         label: 'Hanging rail',  hint: 'Cut to the internal width' },
  { id: 'shelf_pins',   label: 'Shelf pins',    hint: 'Four per shelf' },
  { id: 'hangers',      label: 'Wall hangers',  hint: 'Two per wall unit' },
];


// ─── T-CC1b F9 · THE STOCK IS JOINERY CORE'S (CLAUDE.md T-CC1b law 6) ──────
// The owner, 01.11.2026: *"materialy z JC (jego baza), przypisanie w CC"*. A
// material IS a row of the tenant's `stock_items` (lib/jcStock.js), keyed by
// JC's uuid; the 19 sample rows that stood here are deleted (kasacja, the
// Deletion licence). What stays are the three honest placeholders.
//
// ─── Generic boards (owner's soft start, 09.08) ───
// A project may BEGIN on one of these: the geometry is pinned, honestly and
// visibly, before the real board exists in the stock. They are placeholders
// by name and by flag: the yellow warning stays up while one is assigned. They
// carry no `kg_m2`, so a front on one weighs profile.board.kgM2 (engine/lifts.js).
export const GENERIC_MATERIALS = [
  { id: 'generic-18', code: '', name: 'Generic board 18 mm', category: 'board', thickness: 18, unit: 'm²', price: 0, placeholder: true },
  { id: 'generic-22', code: '', name: 'Generic board 22 mm', category: 'board', thickness: 22, unit: 'm²', price: 0, placeholder: true },
  { id: 'generic-25', code: '', name: 'Generic board 25 mm', category: 'board', thickness: 25, unit: 'm²', price: 0, placeholder: true },
];

// ─── T-CC1b F10 · THE SIX GROUPS OF THE ASSIGN WINDOW (law 7) ─────────────
// The owner, 01.11.2026: *"grupy (plyty, zawiasy, prowadnice, okucia/inne,
// materialy eksploatacyjne, wyposazenie wewnetrzne) ... kazda funkcja
// przypisana (10 rodzajow zawiasow, wszystkie przypisane)"*. Groups of CC's
// ROLES (what the project needs), never of JC's stock. PROPOSED membership;
// "Consumables" is the fallback, so a role no group names can never vanish.
export const ASSIGN_GROUPS = [
  { id: 'sheets', label: 'Sheets', kind: 'board', roles: [
    'side', 'top', 'bottom', 'back', 'shelf', 'front', 'drawer_box', 'plinth', 'infill', 'end_panel'] },
  { id: 'hinges', label: 'Hinges', kind: 'hardware', roles: [
    'hinge', 'hinges', 'bifold_hinges', 'hawa_hinges', 'lift_hinges'] },
  { id: 'runners', label: 'Runners', kind: 'hardware', roles: ['runner_pairs', 'runner_sync_rods'] },
  { id: 'internal', label: 'Internal fittings', kind: 'hardware', roles: [
    'drawer_insert', 'drawer_glass', 'lift_unit', 'led_strip', 'mirror', 'watch_insert', 'space_corner', 'rail',
    'shelf_pins', 'rail_supports', 'shoe_insert', 'ready_boxes',
    // PROPOSED beside the list of F10.3: the lift's own parts, the kits, the
    // mirror cabinet's order lines.
    'lift_arm', 'lift_caps', 'lift_bracket', 'bin_pullout', 'cargo_frame', 'carousel', 'blind_pullout',
    'wardrobe_kit_trouser', 'wardrobe_kit_tie_rack', 'wardrobe_kit_pulldown_rail', 'wardrobe_kit_hooks',
    'wardrobe_kit_valet_rod', 'glass_pane', 'mirror_led_panel', 'mirror_m2', 'mirror_glass_shelf', 'mirror_led_driver'] },
  { id: 'ironmongery', label: 'Ironmongery and other', kind: 'hardware', roles: [
    'legs', 'hangers', 'handle', 'cabineo_connector', 'cabineo_cap', 'worktop_bolts', 'hawa_set',
    'hawa_connector', 'hawa_tracks', 'hawa_stiffener', 'hawa_foot', 'extractor', 'vanity_hangers'] },
  { id: 'consumables', label: 'Consumables', kind: 'other', roles: ['edging'] },
];

/** The group a role lands in: the first that names it, else Consumables (the fallback). */
export function groupOfRole(role) {
  const r = String(role || '');
  return (ASSIGN_GROUPS.find((g) => g.roles.includes(r)) || ASSIGN_GROUPS[ASSIGN_GROUPS.length - 1]).id;
}

/** The BOM's own hardware key (engine/bom.js, the hardware merge): role and specification. */
export function hardwareKey(row) {
  return `${row?.role}|${row?.spec_label}`;
}

// The registry parts the BOM's hardware keys do not stand for (a hinge's
// plate, a rail's supports, the lighting, the edging, the paint, the screws):
// the group each lands in. A part this table does not name follows its
// registry group (board, front, drawer box: Sheets; lighting: Internal
// fittings; hardware: Ironmongery and other; the rest: Consumables).
const PART_GROUP_OF = {
  hinge_plate: 'hinges',
  rail_support: 'internal',
  shoe_insert: 'internal',
  ready_drawer_box: 'internal',
  handle: 'ironmongery',
  plinth_clip: 'ironmongery',
  plinth_clip_connector: 'ironmongery',
  top_box_connector: 'ironmongery',
};

/** The Assign window's group of one registry part. */
function groupOfPart(partId) {
  const part = PART_REGISTRY[partId];
  if (PART_GROUP_OF[partId]) return PART_GROUP_OF[partId];
  const role = Object.keys(HARDWARE_TO_PART_ID).find((r) => HARDWARE_TO_PART_ID[r] === partId);
  if (role) return groupOfRole(role);
  if (!part) return 'consumables';
  if (part.group === 'board' || part.group === 'front' || part.group === 'drawer_box') return 'sheets';
  if (part.group === 'lighting') return 'internal';
  if (part.group === 'hardware') return 'ironmongery';
  return 'consumables';
}

/** The kind the stock list opens on for a line: boards for Sheets, the line's own kind else. */
function kindOfLine(group, materialType) {
  if (group === 'sheets') return 'board';
  if (materialType === 'edging' || materialType === 'paint') return materialType;
  return 'hardware';
}

/**
 * T-CC1b F10.3 · THE DEMAND OF THE ASSIGN WINDOW, LINE BY LINE (law 7).
 *
 * Pure. Every hardware line of the BOM (one line per `${role}|${spec_label}`,
 * resolved by engine/bom.js hardwareDemand, the same read the BOM PDF makes),
 * then every registry part the job uses that no hardware key stands for (the
 * boards with their yield and per-family exceptions, the edging, the lighting,
 * the paint), then the joiner's own consumables.
 *
 * @returns {Array<{ id, type: 'hardware'|'part'|'custom', key?, role?, partId?, group, kind,
 *   label, spec, qty, unit, material, assigned, families? }>}
 */
export function buildAssignLines({
  bom = null, data = null, materials = [], usage = {}, missingOf = {},
} = {}) {
  const d = normalize(data);
  const flat = expand(d);
  const byId = new Map((materials || []).map((m) => [m.id, m]));
  const lines = [];
  const hw = hardwareDemand(bom || { hardware: [] }, flat, materials);
  const covered = new Set(hw.map((h) => HARDWARE_TO_PART_ID[h.role]).filter(Boolean));
  for (const h of hw) {
    const group = groupOfRole(h.role);
    lines.push({
      id: `hw:${h.key}`, type: 'hardware', key: h.key, role: h.role, group, kind: kindOfLine(group, 'hardware'),
      label: h.label || h.role, spec: h.spec_label || '', qty: h.qty, unit: h.unit || 'pcs',
      material: h.material, assigned: h.assigned,
    });
  }
  for (const [partId, use] of Object.entries(usage || {})) {
    const part = PART_REGISTRY[partId];
    if (!part || covered.has(partId)) continue;
    const a = assignmentFor(d, partId, null);
    const material = (a?.material_id ? byId.get(a.material_id) : null) || null;
    const families = missingOf[partId] || null;
    const group = groupOfPart(partId);
    lines.push({
      id: `part:${partId}`, type: 'part', partId, group, kind: kindOfLine(group, part.materialType),
      label: part.name, spec: part.note || '', qty: use.qty, unit: use.unit || part.unit,
      material, yield: a?.yield ?? 1,
      // A part is assigned when no family that uses it is missing (engine/bom.js unassignedInUse);
      // the paint is said on the Spraying page and counts by its own row.
      // A part this job does not use ("Show every part") is assigned when it has a material.
      assigned: part.materialType === 'paint' || !(use.qty > 0) ? Boolean(material) : !families,
      families: families || [],
    });
  }
  for (const cp of d.customParts || []) {
    const a = assignmentFor(d, cp.id, null);
    const material = (a?.material_id ? byId.get(a.material_id) : null) || null;
    lines.push({
      id: `custom:${cp.id}`, type: 'custom', partId: cp.id, group: 'consumables', kind: 'all',
      label: cp.name, spec: `${cp.qtyPerUnit} ${cp.unit} per cabinet`, qty: null, unit: cp.unit,
      material, assigned: Boolean(material),
    });
  }
  return lines;
}

/** "<n> of <m> lines assigned" and the red count beside it (F10.3, F11.1). */
export function assignCount(lines = []) {
  const m = lines.length;
  const n = lines.filter((l) => l.assigned).length;
  return {
    assigned: n,
    total: m,
    missing: m - n,
    text: `${n} of ${m} lines assigned`,
    missingText: m > n ? `Not assigned materials: ${m - n} line${m - n === 1 ? '' : 's'}` : '',
  };
}

// ─── TURN 39 (CLAUDE.md F2): AN ASSIGNMENT BELONGS TO A PROJECT ─────────────
//
// The owner, 18.08.2026: *"każdy jeden projekt powinien mieć Assign
// materials"*. Turn 3's key below is GLOBAL — one set of assignments for every
// job this browser has ever opened — and that is the thing being fixed.
//
// `KEY` stays exactly where it was and keeps its name, because it is still
// read: it is the LEGACY blob, the one a joiner's browser is holding right
// now, and the first project opened on this build inherits it rather than
// starting empty (iron rule 3 — nothing is lost). Per-project blobs live under
// `${KEY}:${projectId}`.
const KEY = 'cc.assignments.v2';

/** Where THIS project's blob is cached locally. */
function keyFor(projectId) {
  return projectId ? `${KEY}:${projectId}` : KEY;
}

// The two shape functions are `engine/partRegistry.js`'s now — one definition
// of "what an assignment blob is", shared by the store, the BOM engine and the
// tests. These stay as the names the rest of this file already calls, so
// nothing in it had to move.
function normalize(data) {
  return normalizeAssignments(data);
}

/** Flat, inheritance-applied view: partId (and every legacy role id) -> value. */
function expand(data) {
  return expandAssignments(data);
}

/** Write the blob locally. Never throws — private mode is not an error here. */
function cacheLocally(projectId, d) {
  try { localStorage.setItem(keyFor(projectId), JSON.stringify(d)); } catch { /* private mode */ }
}

function project(data, projectId = null) {
  const d = normalize(data);
  cacheLocally(projectId, d);
  return { data: d, assignments: expand(d) };
}

function readLocal(projectId) {
  try {
    const raw = localStorage.getItem(keyFor(projectId));
    if (raw) return normalize(JSON.parse(raw));
    // T-CC2a F12 (the Deletion licence): a project with no blob of its own starts EMPTY; the legacy global blob is
    // never read for it again (*"nowy projekt przestaje dziedziczyc materialy z poprzedniego"*, the owner, 01.11.2026).
    return normalize(null);
  } catch {
    return normalize(null);
  }
}

function load() {
  return typeof localStorage === 'undefined' ? normalize(null) : readLocal(null);
}

const initial = typeof localStorage !== 'undefined' ? load() : normalize(null);

// T-CC1a F3: the assignments' own cloud row is deleted; they ride `project.assignments` alone, saved with the item
// (*"oczywiscie do CC laczysz sie tylko przez JC"*, the owner, 30.10.2026).

export const useMaterialAssignmentStore = create((set, get) => ({
  data: initial,
  assignments: expand(initial),
  // T-CC1b F9.2: the three generics, then the tenant's stock rows once read.
  materials: GENERIC_MATERIALS,
  jcConnected: false,

  // ─── TURN 39 (F2) ─────────────────────────────────────────────────────────
  // Which project these assignments belong to.
  projectId: null,
  // T-CC1b F9.2: 'jc' once Joinery Core's stock was read, 'offline' until then
  // or when it did not answer (the words in `stockError`, never an empty list
  // in silence). `stockCategories` are the tenant's own (JC rule 6.5).
  materialsSource: 'offline',
  stockError: null,
  stockCategories: [],
  stockLoading: false,
  // Parts the joiner has never touched, that the design has only just started
  // needing: the modal shows them as NEW (F3).
  seen: {},

  setMaterials: (materials) => set({ materials }),

  /**
   * T-CC1b F9.2 · the tenant's stock, out of Joinery Core's `stock_items`
   * (lib/jcStock.js, two reads). The read of CC's own materials table, which JC does not
   * have, is deleted (the Deletion licence). The materials are the three
   * generics followed by every stock row; offline keeps the list that stood
   * and says JC_OFFLINE in `stockError`.
   *
   * @param {object} [opts] { db } the reader (lib/jcApi.js withDb by default; a test hands a fake)
   */
  loadMaterials: async ({ db } = {}) => {
    set({ stockLoading: true });
    const res = await loadJcStock(db ? { db } : {});
    if (res.error) {
      set({ materialsSource: 'offline', stockError: res.error, stockLoading: false, jcConnected: false });
      return { rows: get().materials, error: res.error };
    }
    const rows = [...GENERIC_MATERIALS, ...res.items.map(toMaterial)];
    set({
      materials: rows, materialsSource: 'jc', stockError: null, stockCategories: res.categories,
      stockLoading: false, jcConnected: true,
    });
    return { rows, error: null };
  },

  // ─── T-CC1b F10 · ONE HARDWARE LINE, ONE MATERIAL (law 7) ─────────────────
  // The owner: *"10 rodzajow zawiasow, wszystkie przypisane"*. A line is the
  // BOM's own key `${role}|${spec_label}`; its material is JC's uuid and
  // nothing else (law 6). Clearing writes an EMPTY material so the line reads
  // "Not assigned" even where a schema 2 role value still stands behind it.
  setHardwareAssignment: (key, materialId) => set((s) => {
    const d = normalize(s.data);
    d.hardware = { ...(d.hardware || {}), [key]: { material_id: materialId || '' } };
    return project(d, s.projectId);
  }),

  clearHardwareAssignment: (key) => set((s) => {
    const d = normalize(s.data);
    d.hardware = { ...(d.hardware || {}), [key]: { material_id: '' } };
    return project(d, s.projectId);
  }),

  /**
   * The schema 2 migration, at the Assign window's load (engine/partRegistry.js
   * migrateHardwareKeys): each legacy role value is copied to every key of that
   * role the CURRENT BOM lists, once (a key that exists is never touched).
   */
  adoptHardwareKeys: (rows = []) => {
    const d = normalize(get().data);
    const next = migrateHardwareKeys(d, rows);
    if (JSON.stringify(next.hardware) === JSON.stringify(d.hardware)) return false;
    set((s) => project(next, s.projectId));
    return true;
  },

  /**
   * The registry part behind a hardware role follows its lines, so the BOM
   * window (engine/bom.js purchaseBom, one product per part) never calls a role
   * complete while one of its lines is not: every key of the role assigned
   * gives the part the first key's material; any key missing clears it.
   *
   * @param {string} role   the engine's hardware role
   * @param {Array}  rows   the BOM's hardware rows
   */
  syncHardwarePart: (role, rows = []) => set((s) => {
    const partId = HARDWARE_TO_PART_ID[role];
    if (!partId || !PART_REGISTRY[partId]) return {};
    const d = normalize(s.data);
    const ids = rows.filter((r) => r.role === role).map((r) => d.hardware?.[hardwareKey(r)]?.material_id || '');
    if (ids.length && ids.every(Boolean)) {
      d.base[partId] = { material_id: ids[0], yield: 1.0, category: '', subcategory: '' };
    } else {
      delete d.base[partId];
    }
    if (d.auto) delete d.auto[partId];
    return project(d, s.projectId);
  }),

  /**
   * Open a project's assignments.
   *
   * The order is deliberate and it is the owner's: the project's own blob
   * (T-CC1a F3: the cloud row that won over it is deleted), then what this
   * browser cached for this project (T-CC2a F12: never turn 3's global blob),
   * and whatever comes out of that, the workshop's DEFAULTS fill in the parts
   * it is silent about, never overwriting a choice somebody made by hand.
   *
   * @param {string|null} projectId
   * @param {object} [opts]  { blob, defaults } — `blob` is the project's own
   *                         saved assignments (it rides `project.assignments`
   *                         through the local shelf); `defaults` is
   *                         `profile.materials.defaults`.
   */
  openProject: async (projectId, { blob = null, defaults = null } = {}) => {
    let d = blob ? normalize(blob) : readLocal(projectId);
    if (defaults) d = seedFromDefaults(d, defaults);
    set({ projectId: projectId || null, ...project(d, projectId) });
    return d;
  },

  /** T-CC2a F12 · a NEW item's blob: empty, never the previous project's, never read from this browser. */
  // An item with no id yet caches nothing: the legacy global blob is never overwritten with empty (FROZEN 4).
  startEmpty: (projectId = null) => set(() => {
    const d = normalize(null);
    if (projectId) cacheLocally(projectId, d);
    return { projectId: projectId || null, seen: {}, data: d, assignments: expand(d) };
  }),

  /** Synchronous half of the same act, for callers that cannot await. */
  setProject: (projectId, { blob = null, defaults = null } = {}) => set(() => {
    let d = blob ? normalize(blob) : readLocal(projectId);
    if (defaults) d = seedFromDefaults(d, defaults);
    return { projectId: projectId || null, ...project(d, projectId) };
  }),

  /** Fill every part the workshop has a default for and the project has not. */
  seedDefaults: (defaults) => set((s) => {
    const d = seedFromDefaults(s.data, defaults);
    return project(d, s.projectId);
  }),

  setAssignment: (role, materialId, yieldCoeff = 1.0, variant = null) => set((s) => {
    // `legacyToCanonical` is what lets turn 3's callers keep calling with a
    // ROLE ('side', 'front') while the new modal calls with a PART ID
    // ('carcase_side', 'door'), and both land on the same row.
    const { key, variantKey } = legacyToCanonical(role);
    const v = variant || variantKey;
    const d = normalize(s.data);
    const prev = (v ? d.overrides?.[key]?.[v] : d.base?.[key]) || {};
    const next = {
      material_id: materialId,
      yield: yieldCoeff ?? prev.yield ?? 1.0,
      category: prev.category || '',
      subcategory: prev.subcategory || '',
    };
    if (v) d.overrides[key] = { ...(d.overrides[key] || {}), [v]: next };
    else d.base[key] = next;
    // A HAND assignment clears the `auto` tag for that part (F4): the rule may
    // not take it back, and the tag is what the rule reads to know.
    if (d.auto?.[key]) { delete d.auto[key]; }
    return project(d, s.projectId);
  }),

  /**
   * The same act, performed by a RULE rather than by a hand (F4).
   * Refuses to touch a part a hand has already set — a manual assignment always
   * wins and is never overwritten.
   */
  setAutoAssignment: (partId, materialId, { yieldCoeff = null, variant = null } = {}) => set((s) => {
    const { key, variantKey } = legacyToCanonical(partId);
    const v = variant || variantKey;
    const d = normalize(s.data);
    const prev = (v ? d.overrides?.[key]?.[v] : d.base?.[key]) || {};
    if (prev.material_id && !d.auto?.[key]) return {};      // a hand set it: leave it alone
    const next = {
      material_id: materialId,
      yield: yieldCoeff ?? prev.yield ?? 1.0,
      category: prev.category || '',
      subcategory: prev.subcategory || '',
      auto: true,
    };
    if (v) d.overrides[key] = { ...(d.overrides[key] || {}), [v]: next };
    else d.base[key] = next;
    d.auto = { ...(d.auto || {}), [key]: true };
    return project(d, s.projectId);
  }),

  /** Was this part filled in by a rule rather than by a hand? */
  isAuto: (partId) => Boolean(normalize(get().data).auto?.[legacyToCanonical(partId).key]),

  setYield: (role, yieldCoeff, variant = null) => set((s) => {
    const { key, variantKey } = legacyToCanonical(role);
    const v = variant || variantKey;
    const d = normalize(s.data);
    const prev = (v ? d.overrides?.[key]?.[v] : d.base?.[key]) || {};
    const next = { ...prev, yield: yieldCoeff };
    if (v) d.overrides[key] = { ...(d.overrides[key] || {}), [v]: next };
    else d.base[key] = next;
    return project(d, s.projectId);
  }),

  removeAssignment: (role, variant = null) => set((s) => {
    const { key, variantKey } = legacyToCanonical(role);
    const v = variant || variantKey;
    const d = normalize(s.data);
    if (v) {
      const o = { ...(d.overrides[key] || {}) };
      delete o[v];
      if (Object.keys(o).length) d.overrides[key] = o; else delete d.overrides[key];
    } else {
      delete d.base[key];
      delete d.overrides[key];
      if (d.auto) delete d.auto[key];
    }
    return project(d, s.projectId);
  }),

  materialFor: (role) => {
    const a = get().assignments[role];
    if (!a?.material_id) return null;
    return get().materials.find((m) => m.id === a.material_id) || null;
  },

  yieldFor: (role) => get().assignments[role]?.yield ?? 1.0,

  /** The effective assignment for one part in one cabinet family. */
  assignmentFor: (partId, variantKey = null) => assignmentFor(get().data, partId, variantKey),

  /** Parts with nothing behind them, and the per-group counts beside them. */
  unassigned: (variantKey = null, parts = ALL_PARTS) => unassignedParts(get().data, variantKey, { parts }),
  unassignedCounts: (variantKey = null, parts = ALL_PARTS) => unassignedByGroup(get().data, variantKey, { parts }),

  /**
   * Mark parts as SEEN — the modal calls this when it shows them, so a part
   * that appears because the design gained its first drawer or its first LED
   * strip reads NEW until somebody has looked at it (F3).
   */
  markSeen: (partIds = []) => set((s) => {
    const seen = { ...s.seen };
    let changed = false;
    for (const id of partIds) {
      const key = legacyToCanonical(id).key;
      if (!PART_REGISTRY[key] || seen[key]) continue;
      seen[key] = true;
      changed = true;
    }
    return changed ? { seen } : {};
  }),

  isNew: (partId) => {
    const key = legacyToCanonical(partId).key;
    return Boolean(PART_REGISTRY[key]) && !get().seen[key];
  },

  // ─── TURN 39 (CLAUDE.md F8): THE JOINER'S OWN ROWS ────────────────────────
  //
  // Production Core's `customParts`, verbatim in shape: the user types a line
  // ("dowels 8×40", a quantity per cabinet, a unit), assigns a material to it,
  // and it flows into the BOM through THE SAME merge path every registry part
  // takes — `engine/bom.js mergeUnitMaterials` reads `data.customParts` beside
  // `ALL_PARTS` and bumps the same accumulator, so a custom row assigned to a
  // board a registry part also uses lands on ONE line with it.
  //
  // It is a per-cabinet quantity, not a per-project one: a job with nine
  // cabinets needs nine cabinets' worth of dowels.
  addCustomPart: ({ name, unit = 'pcs', qtyPerUnit = 1 } = {}) => {
    let id = null;
    set((s) => {
      const d = normalize(s.data);
      id = `custom_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
      d.customParts = [...(d.customParts || []), {
        id,
        name: String(name || '').trim() || 'Custom consumable',
        unit: unit || 'pcs',
        qtyPerUnit: Number(qtyPerUnit) > 0 ? Number(qtyPerUnit) : 1,
      }];
      return project(d, s.projectId);
    });
    return id;
  },

  updateCustomPart: (id, patch) => set((s) => {
    const d = normalize(s.data);
    d.customParts = (d.customParts || []).map((cp) => (cp.id === id
      ? {
        ...cp,
        ...patch,
        name: String(patch.name ?? cp.name).trim() || cp.name,
        qtyPerUnit: Number(patch.qtyPerUnit ?? cp.qtyPerUnit) > 0
          ? Number(patch.qtyPerUnit ?? cp.qtyPerUnit)
          : cp.qtyPerUnit,
      }
      : cp));
    return project(d, s.projectId);
  }),

  removeCustomPart: (id) => set((s) => {
    const d = normalize(s.data);
    d.customParts = (d.customParts || []).filter((cp) => cp.id !== id);
    // …and its assignment with it. A row nobody can see must not keep a board
    // reserved in a blob nobody can reach.
    delete d.base[id];
    delete d.overrides[id];
    if (d.auto) delete d.auto[id];
    return project(d, s.projectId);
  }),

  reset: () => set((s) => project(normalize(null), s.projectId)),
}));

// ─── JoineryCore coupling, locally (turn 7, CLAUDE.md F2) ───
//
// The integration itself is a later phase — there is no JoineryCore API call
// anywhere in this app. What turn 7 wires is the LOCAL half of it: a material
// that came from JoineryCore carries the evidence (a `jc_uuid`, or `source:
// 'jc'`), and everywhere a material is shown the app says so.
//
// It is a function of the DATA, not a flag somebody sets. The moment a real
// stock list is loaded through `setMaterials`, every tile that has a uuid gets
// its badge with nothing else changing — which is the point of doing it this
// way round.

/** Did this material come from JoineryCore? */
export function isJcMaterial(material) {
  return Boolean(material?.jc_uuid || material?.source === 'jc');
}

/** The badge a material tile shows, or null. One word: "JC". */
export function materialBadge(material) {
  return isJcMaterial(material) ? 'JC' : null;
}

/**
 * What the settings screen has to say about a set of material slots.
 *
 * `assigned` is what it can fill in; `missing` is the slots that have nothing
 * behind them, and the presence of any of those is what turns the section into
 * "Not assigned materials" with a button rather than a silent set of empty
 * tiles (CLAUDE.md F2).
 *
 * @param {Array} slots       [{ id, label, material_id }]
 * @param {Array} materials   the workshop's list
 */
export function materialSlotState(slots = [], materials = []) {
  const byId = new Map(materials.map((m) => [m.id, m]));
  const rows = slots.map((slot) => {
    const material = slot.material_id ? byId.get(slot.material_id) || null : null;
    return { ...slot, material, badge: materialBadge(material) };
  });
  return {
    rows,
    assigned: rows.filter((r) => r.material),
    missing: rows.filter((r) => !r.material),
    fromJc: rows.filter((r) => r.badge).length,
  };
}
