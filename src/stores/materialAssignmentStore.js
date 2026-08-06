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
];

// Hardware roles. The ENGINE decides the quantities from the geometry
// (result.hardware); this list only says which roles exist and what they are
// called, so the same ASSIGN pattern covers hinges the way it covers boards.
// Counted in pieces and pairs, so no yield coefficient applies.
export const HARDWARE_ROLES = [
  { id: 'hinges',       label: 'Hinges',        hint: 'Per door, from the hinge rule' },
  { id: 'runner_pairs', label: 'Drawer runners', hint: 'One pair per drawer, at the snapped length' },
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
  { id: 'mat_mfc18_white',  name: 'MFC White W980 18 mm',        category: 'board',  thickness: 18, unit: 'm²', price: 11.4 },
  { id: 'mat_mfc18_oak',    name: 'MFC Halifax Oak 18 mm',       category: 'board',  thickness: 18, unit: 'm²', price: 14.9 },
  { id: 'mat_mdf18',        name: 'MDF 18 mm',                   category: 'board',  thickness: 18, unit: 'm²', price: 9.8 },
  { id: 'mat_ply18_birch',  name: 'Birch Plywood 18 mm',         category: 'board',  thickness: 18, unit: 'm²', price: 24.5 },
  { id: 'mat_mfc22_white',  name: 'MFC White W980 22 mm',        category: 'board',  thickness: 22, unit: 'm²', price: 13.9 },
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
