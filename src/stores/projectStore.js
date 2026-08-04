import { create } from 'zustand';
import { computeCabinet } from '../engine/cabinet.js';
import { getCabinetProfile } from '../engine/profile.js';
import { defaultParamsFor, getUnitType } from '../engine/types.js';
import { snap as snapTo, clamp } from '../engine/format.js';

// ─── Project state ───
// The room, the units standing in it and their interior contents (SPEC 5).
// The database is the home of this data; localStorage is only a cache so a
// refresh in mock mode does not lose work (CLAUDE.md rule 7).

const CACHE_KEY = 'cc.project.cache.v1';

const uid = (prefix) => `${prefix}_${Math.random().toString(36).slice(2, 9)}`;

export const DEFAULT_ROOM = { height: 2500, walls: [{ width: 4000 }] };

function newUnit(typeId, profile, index) {
  const type = getUnitType(typeId);
  const params = defaultParamsFor(type.id, profile);
  return {
    id: uid('u'),
    type: type.id,
    position: { wall: 0, x_mm: 0 },
    params: {
      ...params,
      unit_num: type.id === 'WARDROBE' ? `W${String(index + 1).padStart(2, '0')}` : String(index + 1).padStart(2, '0'),
      doors: false,                 // doors are the LAST step (SPEC 4.10)
      sections: [{ width_mm: params.width, items: [] }],
      materials: {},
    },
  };
}

/** Interior items -> the count/flag shape the engine consumes. */
function paramsForEngine(unit) {
  const p = unit.params;
  const items = p.sections?.[0]?.items || [];
  return {
    ...p,
    type: unit.type,
    items,
    shelves: items.filter((i) => i.kind === 'shelf').length,
    drawers: items.filter((i) => i.kind === 'drawer').length,
    rail: items.some((i) => i.kind === 'hanger'),
    rail_offset: items.find((i) => i.kind === 'hanger')?.pos_mm ?? p.rail_offset,
  };
}

function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.project || !Array.isArray(parsed.units)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveCache(state) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ project: state.project, units: state.units }));
  } catch { /* quota or private mode — the DB is the real home anyway */ }
}

const cached = typeof localStorage !== 'undefined' ? loadCache() : null;

export const useProjectStore = create((set, get) => ({
  project: cached?.project || { id: null, name: 'Untitled project', room: DEFAULT_ROOM, jc_tenant_id: null, jc_project_id: null },
  units: cached?.units || [],
  dirty: false,

  // ── project / room ───────────────────────────────────────────────────────
  setProjectName: (name) => set((s) => ({ project: { ...s.project, name }, dirty: true })),
  setRoom: (room) => set((s) => ({ project: { ...s.project, room: { ...s.project.room, ...room } }, dirty: true })),
  loadProject: (project, units) => set({ project, units, dirty: false }),

  // ── units ────────────────────────────────────────────────────────────────
  addUnit: (typeId) => {
    const profile = getCabinetProfile();
    const state = get();
    const unit = newUnit(typeId, profile, state.units.length);
    // Park it next to whatever already stands at the wall.
    const wallWidth = state.project.room.walls[0]?.width ?? DEFAULT_ROOM.walls[0].width;
    const rightMost = state.units.reduce((max, u) => Math.max(max, u.position.x_mm + u.params.width), 0);
    unit.position.x_mm = Math.min(rightMost, Math.max(0, wallWidth - unit.params.width));
    set((s) => ({ units: [...s.units, unit], dirty: true }));
    return unit.id;
  },

  removeUnit: (unitId) => set((s) => ({ units: s.units.filter((u) => u.id !== unitId), dirty: true })),

  updateUnitParams: (unitId, patch) => set((s) => ({
    units: s.units.map((u) => {
      if (u.id !== unitId) return u;
      const params = { ...u.params, ...patch };
      if (patch.width != null && params.sections?.[0]) {
        params.sections = [{ ...params.sections[0], width_mm: patch.width }];
      }
      return { ...u, params };
    }),
    dirty: true,
  })),

  /** Slide a unit along the wall, snapped, clamped, and butted against neighbours. */
  moveUnit: (unitId, xRaw, snapStep) => {
    const s = get();
    const unit = s.units.find((u) => u.id === unitId);
    if (!unit) return;
    const wallWidth = s.project.room.walls[unit.position.wall]?.width ?? DEFAULT_ROOM.walls[0].width;
    let x = snapTo(xRaw, snapStep);
    x = clamp(x, 0, Math.max(0, wallWidth - unit.params.width));
    // Unit-to-unit magnet: butt against a neighbour when within one snap step
    const tolerance = Math.max(snapStep, 12);
    for (const other of s.units) {
      if (other.id === unitId) continue;
      const oLeft = other.position.x_mm;
      const oRight = oLeft + other.params.width;
      if (Math.abs(x - oRight) <= tolerance) x = oRight;
      else if (Math.abs(x + unit.params.width - oLeft) <= tolerance) x = oLeft - unit.params.width;
    }
    set((st) => ({
      units: st.units.map((u) => (u.id === unitId ? { ...u, position: { ...u.position, x_mm: x } } : u)),
      dirty: true,
    }));
  },

  // ── interior items ───────────────────────────────────────────────────────
  addItem: (unitId, item) => {
    const id = uid(item.kind);
    set((s) => ({
      units: s.units.map((u) => {
        if (u.id !== unitId) return u;
        const section = u.params.sections?.[0] || { width_mm: u.params.width, items: [] };
        return { ...u, params: { ...u.params, sections: [{ ...section, items: [...section.items, { id, ...item }] }] } };
      }),
      dirty: true,
    }));
    return id;
  },

  addDrawers: (unitId, count, mount = 'overlay') => {
    set((s) => ({
      units: s.units.map((u) => {
        if (u.id !== unitId) return u;
        const section = u.params.sections?.[0] || { width_mm: u.params.width, items: [] };
        const kept = section.items.filter((i) => i.kind !== 'drawer');
        const drawers = Array.from({ length: count }, (_, i) => ({ id: uid('drawer'), kind: 'drawer', index: i + 1, mount }));
        return { ...u, params: { ...u.params, sections: [{ ...section, items: [...drawers, ...kept] }] } };
      }),
      dirty: true,
    }));
  },

  removeItem: (unitId, itemId) => set((s) => ({
    units: s.units.map((u) => {
      if (u.id !== unitId) return u;
      const section = u.params.sections[0];
      return { ...u, params: { ...u.params, sections: [{ ...section, items: section.items.filter((i) => i.id !== itemId) }] } };
    }),
    dirty: true,
  })),

  updateItem: (unitId, itemId, patch) => set((s) => ({
    units: s.units.map((u) => {
      if (u.id !== unitId) return u;
      const section = u.params.sections[0];
      return {
        ...u,
        params: { ...u.params, sections: [{ ...section, items: section.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)) }] },
      };
    }),
    dirty: true,
  })),

  /** Even out the shelves in the free zone — used by [+] / [×]. */
  redistributeShelves: (unitId) => {
    const s = get();
    const unit = s.units.find((u) => u.id === unitId);
    if (!unit) return;
    const limits = shelfLimits(unit, getCabinetProfile());
    const items = unit.params.sections[0].items;
    const shelves = items.filter((i) => i.kind === 'shelf');
    const step = (limits.max - limits.min) / (shelves.length + 1);
    let n = 0;
    const next = items.map((i) => (i.kind === 'shelf' ? { ...i, pos_mm: Math.round(limits.min + step * (++n)) } : i));
    set((st) => ({
      units: st.units.map((u) => (u.id === unitId ? { ...u, params: { ...u.params, sections: [{ ...u.params.sections[0], items: next }] } } : u)),
      dirty: true,
    }));
  },

  /** Drag a shelf vertically: snap, then clamp against neighbours and the zones. */
  moveShelf: (unitId, itemId, posRaw, snapStep) => {
    const s = get();
    const unit = s.units.find((u) => u.id === unitId);
    if (!unit) return null;
    const profile = getCabinetProfile();
    const bounds = shelfDragBounds(unit, itemId, profile);
    const pos = clamp(snapTo(posRaw, snapStep), bounds.min, bounds.max);
    get().updateItem(unitId, itemId, { pos_mm: pos });
    return { pos, ...bounds };
  },

  // ── doors (last step) ────────────────────────────────────────────────────
  setDoors: (unitId, doors) => set((s) => ({
    units: s.units.map((u) => (u.id === unitId ? { ...u, params: { ...u.params, doors } } : u)),
    dirty: true,
  })),

  // ── derived ──────────────────────────────────────────────────────────────
  /** Live engine output for one unit — recomputed on every read (SPEC 4.11). */
  unitResult: (unitId) => {
    const unit = get().units.find((u) => u.id === unitId);
    if (!unit) return null;
    return computeCabinet(paramsForEngine(unit), getCabinetProfile());
  },

  allResults: () => get().units.map((u) => ({ unit: u, result: computeCabinet(paramsForEngine(u), getCabinetProfile()) })),

  markSaved: (project) => set((s) => ({ project: project || s.project, dirty: false })),
}));

// Cache to localStorage on every change (fallback only — the DB stays primary)
useProjectStore.subscribe((state) => saveCache(state));

// ─── Interior rules (shared by the store and the UI) ───

/** The vertical band a shelf may live in: above the drawer stack, below the top. */
export function shelfLimits(unit, profile) {
  const G = unit.params.board_t ?? profile.board.thickness;
  const H = unit.params.height;
  const gap = profile.editor.minShelfGap;
  const result = computeCabinet(paramsForEngine(unit), profile);
  const zoneTop = result.assemblies.drawerZone ? result.assemblies.drawerZone.top + G : G;
  return { min: zoneTop + gap, max: H - G - gap, drawerTop: result.assemblies.drawerZone ? result.assemblies.drawerZone.top + G : null };
}

/** Drag bounds for one shelf: the band, narrowed by its immediate neighbours. */
export function shelfDragBounds(unit, itemId, profile) {
  const limits = shelfLimits(unit, profile);
  const gap = profile.editor.minShelfGap;
  const shelves = unit.params.sections[0].items
    .filter((i) => i.kind === 'shelf' && i.id !== itemId && Number.isFinite(i.pos_mm))
    .map((i) => i.pos_mm)
    .sort((a, b) => a - b);
  const self = unit.params.sections[0].items.find((i) => i.id === itemId);
  const pos = self?.pos_mm ?? limits.min;
  const below = shelves.filter((y) => y <= pos).pop();
  const above = shelves.find((y) => y > pos);
  return {
    min: Math.max(limits.min, below != null ? below + gap : limits.min),
    max: Math.min(limits.max, above != null ? above - gap : limits.max),
    below: below ?? limits.drawerTop ?? null,
    above: above ?? null,
  };
}

/**
 * Interior validation. The hard rule from SPEC 4.7: a drawer stack must be
 * closed by a shelf above it. The engine always emits the PARTITION panel for
 * that, so this reports the case where the drawers were dropped instead.
 */
export function validateUnit(unit, result) {
  const issues = [];
  const items = unit.params.sections?.[0]?.items || [];
  const drawers = items.filter((i) => i.kind === 'drawer').length;

  if (drawers > 0 && !result.assemblies.drawerZone) {
    issues.push({ level: 'error', message: 'Drawers do not fit this carcass — they were dropped from the cut list.' });
  }
  if (drawers > 0 && result.assemblies.drawerZone && !result.panels.some((p) => p.part === 'PARTITION')) {
    issues.push({ level: 'error', message: 'A drawer stack must be closed by a shelf (partition) above it.' });
  }
  const zoneTop = result.assemblies.drawerZone?.top ?? null;
  for (const item of items) {
    if (item.kind !== 'shelf' || !Number.isFinite(item.pos_mm)) continue;
    if (zoneTop != null && item.pos_mm < zoneTop) {
      issues.push({ level: 'warn', message: `A shelf sits inside the drawer zone (${Math.round(item.pos_mm)} mm) — move it above ${Math.round(zoneTop)} mm.` });
    }
  }
  for (const w of result.warnings) issues.push({ level: 'warn', message: w.message });
  return issues;
}

export { paramsForEngine };
