import { create } from 'zustand';

// ─── Material assignments per BOM role ───
// Pattern taken from Production Core's materialAssignmentStore: a canonical
// schema-2 object (base assignment + per-variant overrides) with a flat legacy
// view derived from it, plus a `yield` coefficient that models offcut waste.
//
// Cabinet Core roles come from SPEC 4.12: side / top / bottom / back / shelf /
// front / drawer_box. Sources: 'own' (the local list below) or 'jc' (a
// JoineryCore stock_items UUID — the integration lands in a later phase).

export const ASSIGNMENT_SCHEMA = 2;

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

export const HARDWARE_ROLE_IDS = new Set(HARDWARE_ROLES.map((r) => r.id));

// Sample workshop material list — this is what "Mock data mode" runs on.
// `category` is the same vocabulary as cc_materials (board | front | edging |
// hardware), so a real list loaded from the database drops straight in.
export const MOCK_MATERIALS = [
  // ─── Generic boards (owner's soft start, 09.08) ───
  // A project may BEGIN on one of these — the geometry is pinned, honestly and
  // visibly, before the real board exists in the stock. They are placeholders
  // by name and by flag: the yellow warning stays up while one is assigned,
  // and the future check-out/JC export refuses them (the hard gate).
  { id: 'generic-18', code: '—', name: 'Generic board 18 mm', category: 'board', thickness: 18, unit: 'm²', price: 0, placeholder: true },
  { id: 'generic-22', code: '—', name: 'Generic board 22 mm', category: 'board', thickness: 22, unit: 'm²', price: 0, placeholder: true },
  { id: 'generic-25', code: '—', name: 'Generic board 25 mm', category: 'board', thickness: 25, unit: 'm²', price: 0, placeholder: true },
  { id: 'mat_mfc18_white',  code: 'W980 SM', name: 'MFC White W980 18 mm',        category: 'board',  thickness: 18, unit: 'm²', price: 11.4 },
  { id: 'mat_mfc18_oak',    code: 'H1180 ST37', name: 'MFC Halifax Oak 18 mm',    category: 'board',  thickness: 18, unit: 'm²', price: 14.9 },
  { id: 'mat_mdf18',        code: 'MDF-18', name: 'MDF 18 mm',                    category: 'board',  thickness: 18, unit: 'm²', price: 9.8 },
  { id: 'mat_ply18_birch',  code: 'BB/BB-18', name: 'Birch Plywood 18 mm',        category: 'board',  thickness: 18, unit: 'm²', price: 24.5 },
  { id: 'mat_mfc22_white',  code: 'W980 SM', name: 'MFC White W980 22 mm',        category: 'board',  thickness: 22, unit: 'm²', price: 13.9 },
  { id: 'mat_mdf25_shaker', name: 'MDF Shaker blank 25 mm',      category: 'front',  thickness: 25, unit: 'm²', price: 27.0 },
  { id: 'mat_mfc19_front',  name: 'Melamine front 19 mm',        category: 'front',  thickness: 19, unit: 'm²', price: 16.2 },
  { id: 'mat_hdf6_back',    name: 'HDF backing 6 mm',            category: 'board',  thickness: 6,  unit: 'm²', price: 4.6 },
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

const KEY = 'cc.assignments.v2';

function normalize(data) {
  const d = data && typeof data === 'object' ? data : {};
  return { schema: ASSIGNMENT_SCHEMA, base: { ...(d.base || {}) }, overrides: { ...(d.overrides || {}) } };
}

/** Flat, inheritance-applied view: role -> { material_id, yield, category }. */
function expand(data) {
  const flat = {};
  for (const [role, value] of Object.entries(data.base || {})) flat[role] = { ...value };
  for (const [role, variants] of Object.entries(data.overrides || {})) {
    for (const [variant, value] of Object.entries(variants)) flat[`${role}@${variant}`] = { ...flat[role], ...value };
  }
  return flat;
}

function project(data) {
  const d = normalize(data);
  try { localStorage.setItem(KEY, JSON.stringify(d)); } catch { /* private mode */ }
  return { data: d, assignments: expand(d) };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? normalize(JSON.parse(raw)) : normalize(null);
  } catch {
    return normalize(null);
  }
}

const initial = typeof localStorage !== 'undefined' ? load() : normalize(null);

export const useMaterialAssignmentStore = create((set, get) => ({
  data: initial,
  assignments: expand(initial),
  materials: MOCK_MATERIALS,
  source: 'own',                 // 'own' | 'jc' — JoineryCore stock lands later
  jcConnected: false,

  setMaterials: (materials) => set({ materials }),

  setAssignment: (role, materialId, yieldCoeff = 1.0, variant = null) => set((s) => {
    const d = normalize(s.data);
    const prev = (variant ? d.overrides?.[role]?.[variant] : d.base?.[role]) || {};
    const next = { material_id: materialId, yield: yieldCoeff ?? prev.yield ?? 1.0, source: get().source };
    if (variant) d.overrides[role] = { ...(d.overrides[role] || {}), [variant]: next };
    else d.base[role] = next;
    return project(d);
  }),

  setYield: (role, yieldCoeff, variant = null) => set((s) => {
    const d = normalize(s.data);
    const prev = (variant ? d.overrides?.[role]?.[variant] : d.base?.[role]) || {};
    const next = { ...prev, yield: yieldCoeff };
    if (variant) d.overrides[role] = { ...(d.overrides[role] || {}), [variant]: next };
    else d.base[role] = next;
    return project(d);
  }),

  removeAssignment: (role, variant = null) => set((s) => {
    const d = normalize(s.data);
    if (variant) {
      const o = { ...(d.overrides[role] || {}) };
      delete o[variant];
      if (Object.keys(o).length) d.overrides[role] = o; else delete d.overrides[role];
    } else {
      delete d.base[role];
      delete d.overrides[role];
    }
    return project(d);
  }),

  addMaterial: (material) => set((s) => ({ materials: [...s.materials, { id: `mat_${Date.now().toString(36)}`, ...material }] })),

  materialFor: (role) => {
    const a = get().assignments[role];
    if (!a?.material_id) return null;
    return get().materials.find((m) => m.id === a.material_id) || null;
  },

  yieldFor: (role) => get().assignments[role]?.yield ?? 1.0,

  reset: () => set(project(normalize(null))),
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
