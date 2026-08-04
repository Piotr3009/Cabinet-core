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
];

// Sample workshop material list — this is what "Mock data mode" runs on.
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
