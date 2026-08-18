import { create } from 'zustand';

import {
  normalizeAssignments, expandAssignments, legacyToCanonical, seedFromDefaults,
  assignmentFor, unassignedParts, unassignedByGroup, ALL_PARTS, PART_REGISTRY,
} from '../engine/partRegistry.js';
import { withDb, isMockMode, supabase } from '../lib/supabase.js';
import { loadAssignments as cloudLoad, saveAssignments as cloudSave } from '../lib/cloudSync.js';

// ─── Material assignments per BOM role ───
// Pattern taken from Production Core's materialAssignmentStore: a canonical
// schema-2 object (base assignment + per-variant overrides) with a flat legacy
// view derived from it, plus a `yield` coefficient that models offcut waste.
//
// Cabinet Core roles come from SPEC 4.12: side / top / bottom / back / shelf /
// front / drawer_box. Sources: 'own' (the local list below) or 'jc' (a
// JoineryCore stock_items UUID — the integration lands in a later phase).

const ASSIGNMENT_SCHEMA = 2;

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


// Sample workshop material list — this is what "Mock data mode" runs on.
// `category` is the same vocabulary as cc_materials (board | front | edging |
// hardware), so a real list loaded from the database drops straight in.
export const MOCK_MATERIALS = [
  // ─── Generic boards (owner's soft start, 09.08) ───
  // A project may BEGIN on one of these — the geometry is pinned, honestly and
  // visibly, before the real board exists in the stock. They are placeholders
  // by name and by flag: the yellow warning stays up while one is assigned,
  // and the future check-out/JC export refuses them (the hard gate).
  // ─── Turn 19 (CLAUDE.md F5.1): AND WHAT IT WEIGHS ─────────────────────────
  // `kg_m2` is carried exactly as `thickness` is — a column on the stock record
  // — because an AVENTOS is chosen on the weight of the front and a workshop
  // that stocks a heavier board must be able to say so. A board with no figure
  // falls back to profile.board.kgM2 (engine/lifts.js `boardKgM2`), which is
  // what the GENERIC placeholders deliberately do: they pin the geometry
  // honestly and they are not a real board, so they carry no real weight.
  { id: 'generic-18', code: '—', name: 'Generic board 18 mm', category: 'board', thickness: 18, unit: 'm²', price: 0, placeholder: true },
  { id: 'generic-22', code: '—', name: 'Generic board 22 mm', category: 'board', thickness: 22, unit: 'm²', price: 0, placeholder: true },
  { id: 'generic-25', code: '—', name: 'Generic board 25 mm', category: 'board', thickness: 25, unit: 'm²', price: 0, placeholder: true },
  { id: 'mat_mfc18_white',  code: 'W980 SM', name: 'MFC White W980 18 mm',        category: 'board',  thickness: 18, kg_m2: 12,   board_kind: 'mfc', unit: 'm²', price: 11.4 },
  { id: 'mat_mfc18_oak',    code: 'H1180 ST37', name: 'MFC Halifax Oak 18 mm',    category: 'board',  thickness: 18, kg_m2: 12,   board_kind: 'mfc', unit: 'm²', price: 14.9 },
  { id: 'mat_mdf18',        code: 'MDF-18', name: 'MDF 18 mm',                    category: 'board',  thickness: 18, kg_m2: 14,   board_kind: 'mdf_lacquered', unit: 'm²', price: 9.8 },
  { id: 'mat_ply18_birch',  code: 'BB/BB-18', name: 'Birch Plywood 18 mm',        category: 'board',  thickness: 18, kg_m2: 12.6, board_kind: 'mfc', unit: 'm²', price: 24.5 },
  { id: 'mat_mfc22_white',  code: 'W980 SM', name: 'MFC White W980 22 mm',        category: 'board',  thickness: 22, kg_m2: 14.5, board_kind: 'mfc', unit: 'm²', price: 13.9 },
  { id: 'mat_mdf25_shaker', name: 'MDF Shaker blank 25 mm',      category: 'front',  thickness: 25, kg_m2: 19,   board_kind: 'mdf_lacquered', unit: 'm²', price: 27.0 },
  { id: 'mat_mfc19_front',  name: 'Melamine front 19 mm',        category: 'front',  thickness: 19, kg_m2: 12.6, board_kind: 'mfc', unit: 'm²', price: 16.2 },
  { id: 'mat_hdf6_back',    name: 'HDF backing 6 mm',            category: 'board',  thickness: 6,  kg_m2: 5.4,  board_kind: 'mfc', unit: 'm²', price: 4.6 },
  { id: 'mat_edge_abs',     name: 'ABS edging 22 × 1 mm',        category: 'edging', thickness: 1,  unit: 'm',  price: 0.55 },
  { id: 'hw_hinge_clip',    name: 'Clip-top hinge 110° + plate', category: 'hardware', unit: 'pcs',   price: 2.35 },
  { id: 'hw_hinge_soft',    name: 'Soft-close hinge 110° + plate', category: 'hardware', unit: 'pcs', price: 3.80 },
  { id: 'hw_runner_bb',     name: 'Ball-bearing runner, full ext.', category: 'hardware', unit: 'pairs', price: 6.90 },
  { id: 'hw_runner_soft',   name: 'Soft-close undermount runner', category: 'hardware', unit: 'pairs', price: 14.50 },
  { id: 'hw_leg_100',       name: 'Adjustable leg 100 mm',       category: 'hardware', unit: 'pcs',   price: 0.95 },
  { id: 'hw_rail_oval',     name: 'Oval hanging rail 30 × 15',   category: 'hardware', unit: 'm',     price: 4.20 },
  { id: 'hw_shelf_pin',     name: 'Shelf pin ⌀7.5 nickel',       category: 'hardware', unit: 'pcs',   price: 0.09 },
  { id: 'hw_hanger_wall',   name: 'Wall unit hanger + rail plate', category: 'hardware', unit: 'pcs', price: 1.85 },
];

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
    // Nothing under this project's own key: fall back to turn 3's global blob,
    // so the first project a joiner opens on this build arrives wearing the
    // boards he assigned two turns ago.
    if (projectId) {
      const legacy = localStorage.getItem(KEY);
      if (legacy) return normalize(JSON.parse(legacy));
    }
    return normalize(null);
  } catch {
    return normalize(null);
  }
}

function load() {
  return typeof localStorage === 'undefined' ? normalize(null) : readLocal(null);
}

const initial = typeof localStorage !== 'undefined' ? load() : normalize(null);

// ─── THE CLOUD WRITE, COALESCED ─────────────────────────────────────────────
// A joiner dragging a yield slider fires a mutation per frame. One row per
// project is cheap to write and expensive to write sixty times a second, so
// the write is debounced — and it is FIRE AND FORGET: a database that refuses
// it is the state before the migration has been run, which is a state this app
// works fine in (iron rule 6).
let cloudTimer = null;
function scheduleCloudSave(projectId, data) {
  if (!projectId || isMockMode || !supabase) return;
  if (cloudTimer) clearTimeout(cloudTimer);
  cloudTimer = setTimeout(() => {
    cloudTimer = null;
    cloudSave(projectId, data).catch(() => { /* the local copy is the copy */ });
  }, 600);
}

export const useMaterialAssignmentStore = create((set, get) => ({
  data: initial,
  assignments: expand(initial),
  materials: MOCK_MATERIALS,
  source: 'own',                 // 'own' | 'jc' — JoineryCore stock lands later
  jcConnected: false,

  // ─── TURN 39 (F2) ─────────────────────────────────────────────────────────
  // Which project these assignments belong to, and whether the stock list on
  // screen is the workshop's own or the sample list mock mode ships with.
  projectId: null,
  materialsSource: 'mock',       // 'mock' | 'db'
  // Parts the joiner has never touched, that the design has only just started
  // needing — the modal shows them as NEW (F3).
  seen: {},

  setMaterials: (materials) => set({ materials }),

  /**
   * The workshop's own stock list, out of `cc_materials`.
   *
   * Turn 3 shipped `setMaterials` and NOTHING EVER CALLED IT — every screen in
   * this app has been reading MOCK_MATERIALS since. This is the call that was
   * missing. It degrades exactly as everything else does: mock mode, a dead
   * network and a table that is not there all leave the sample list standing.
   */
  loadMaterials: async () => {
    if (isMockMode || !supabase) return { rows: MOCK_MATERIALS, mock: true };
    const { data } = await withDb(
      (db) => db.from('cc_materials').select('id, name, category, thickness, unit, price, jc_uuid').order('name'),
      null,
    );
    const rows = Array.isArray(data) ? data : null;
    if (!rows || !rows.length) return { rows: get().materials, mock: true };
    set({ materials: rows, materialsSource: 'db' });
    return { rows, mock: false };
  },

  /**
   * Open a project's assignments.
   *
   * The order is deliberate and it is the owner's: what the CLOUD holds wins,
   * then what this browser cached for this project, then turn 3's global blob —
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
    const local = blob ? normalize(blob) : readLocal(projectId);
    let d = local;
    const cloud = await cloudLoad(projectId).catch(() => null);
    if (cloud) d = normalize(cloud);
    if (defaults) d = seedFromDefaults(d, defaults);
    set({ projectId: projectId || null, ...project(d, projectId) });
    return d;
  },

  /** Synchronous half of the same act, for callers that cannot await. */
  setProject: (projectId, { blob = null, defaults = null } = {}) => set(() => {
    let d = blob ? normalize(blob) : readLocal(projectId);
    if (defaults) d = seedFromDefaults(d, defaults);
    return { projectId: projectId || null, ...project(d, projectId) };
  }),

  /** Fill every part the workshop has a default for and the project has not. */
  seedDefaults: (defaults) => set((s) => {
    const d = seedFromDefaults(s.data, defaults);
    scheduleCloudSave(s.projectId, d);
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
    scheduleCloudSave(s.projectId, d);
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
    scheduleCloudSave(s.projectId, d);
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
    scheduleCloudSave(s.projectId, d);
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
    scheduleCloudSave(s.projectId, d);
    return project(d, s.projectId);
  }),

  addMaterial: (material) => set((s) => ({ materials: [...s.materials, { id: `mat_${Date.now().toString(36)}`, ...material }] })),

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
      scheduleCloudSave(s.projectId, d);
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
    scheduleCloudSave(s.projectId, d);
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
    scheduleCloudSave(s.projectId, d);
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
