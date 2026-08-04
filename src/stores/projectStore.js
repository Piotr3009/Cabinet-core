import { create } from 'zustand';
import { computeCabinet } from '../engine/cabinet.js';
import { getCabinetProfile } from '../engine/profile.js';
import { defaultParamsFor, getUnitType } from '../engine/types.js';
import { snap as snapTo } from '../engine/format.js';
import {
  clampShelfPos, clampUnitX, firstFreeUnitX, shelfBand, shelfBounds, unitIssues, unitSpan,
} from '../engine/collision.js';

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

// Throttled: a shelf drag updates the store on every pointer frame, and
// serialising the whole project 60 times a second is pure jank.
let cacheTimer = null;
let cachePending = null;
function saveCache(state) {
  cachePending = { project: state.project, units: state.units };
  if (cacheTimer) return;
  cacheTimer = setTimeout(() => {
    cacheTimer = null;
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(cachePending));
    } catch { /* quota or private mode — the DB is the real home anyway */ }
  }, 250);
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
    // Centred on an empty wall, otherwise butted into the first gap it fits —
    // a new unit never lands on top of an existing one.
    const wallWidth = state.project.room.walls[0]?.width ?? DEFAULT_ROOM.walls[0].width;
    unit.position.x_mm = firstFreeUnitX({
      width: unit.params.width,
      wallWidth,
      others: state.units.filter((u) => (u.position.wall ?? 0) === 0).map(unitSpan),
    });
    set((s) => ({ units: [...s.units, unit], dirty: true }));
    return unit.id;
  },

  removeUnit: (unitId) => set((s) => ({ units: s.units.filter((u) => u.id !== unitId), dirty: true })),

  updateUnitParams: (unitId, patch) => {
    set((s) => ({
      units: s.units.map((u) => {
        if (u.id !== unitId) return u;
        const params = { ...u.params, ...patch };
        if (patch.width != null && params.sections?.[0]) {
          params.sections = [{ ...params.sections[0], width_mm: patch.width }];
        }
        return { ...u, params };
      }),
      dirty: true,
    }));
    // A unit that just got wider can now stick out of the wall or into its
    // neighbour, so re-run the same clamp the drag uses. Typing a number and
    // dragging must not be able to reach different states.
    if (patch.width != null) get().moveUnit(unitId, get().units.find((u) => u.id === unitId)?.position.x_mm ?? 0, 0);
    if (patch.height != null || patch.width != null) get().reclampShelves(unitId);
  },

  /** Slide a unit along the wall: snapped, then hard-clamped into its free slot. */
  moveUnit: (unitId, xRaw, snapStep) => {
    const s = get();
    const unit = s.units.find((u) => u.id === unitId);
    if (!unit) return null;
    const wall = unit.position.wall ?? 0;
    const wallWidth = s.project.room.walls[wall]?.width ?? DEFAULT_ROOM.walls[0].width;
    const result = clampUnitX({
      x: snapTo(xRaw, snapStep),
      current: unit.position.x_mm,
      width: unit.params.width,
      wallWidth,
      others: s.units.filter((u) => u.id !== unitId && (u.position.wall ?? 0) === wall).map(unitSpan),
    }, getCabinetProfile());

    set((st) => ({
      units: st.units.map((u) => (u.id === unitId ? { ...u, position: { ...u.position, x_mm: result.x } } : u)),
      dirty: true,
    }));
    return result;
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
    // A shelf added at a position someone else already occupies is a collision
    // like any other — it goes through the same clamp.
    if (item.kind === 'shelf' && Number.isFinite(item.pos_mm)) get().setShelfPos(unitId, id, item.pos_mm);
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
    // The drawer stack raises the floor the shelves stand on.
    get().reclampShelves(unitId);
  },

  removeItem: (unitId, itemId) => {
    const wasDrawer = get().units.find((u) => u.id === unitId)
      ?.params.sections?.[0]?.items?.find((i) => i.id === itemId)?.kind === 'drawer';
    set((s) => ({
      units: s.units.map((u) => {
        if (u.id !== unitId) return u;
        const section = u.params.sections[0];
        return { ...u, params: { ...u.params, sections: [{ ...section, items: section.items.filter((i) => i.id !== itemId) }] } };
      }),
      dirty: true,
    }));
    if (wasDrawer) get().reclampShelves(unitId);   // the floor just dropped
  },

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
    // Even spacing can still be too tight when the band is short; the clamp has
    // the final word, as it does for every other path.
    get().reclampShelves(unitId);
  },

  /**
   * The ONE way a shelf position is ever written. The drag calls it, the number
   * field in the right panel calls it, and anything added later must call it
   * too: the clamp lives on this side of the setter, not in the caller.
   */
  setShelfPos: (unitId, itemId, posRaw, snapStep = 0) => {
    const s = get();
    const unit = s.units.find((u) => u.id === unitId);
    if (!unit) return null;
    const profile = getCabinetProfile();
    const item = unit.params.sections?.[0]?.items?.find((i) => i.id === itemId);
    const state = clampShelfPos({
      pos: snapTo(posRaw, snapStep),
      current: item?.pos_mm,
      others: otherShelfPositions(unit, itemId),
      band: shelfBandFor(unit, profile),
    }, profile);
    get().updateItem(unitId, itemId, { pos_mm: state.pos });
    return state;
  },

  /** Drag a shelf vertically. Same setter, so the drag cannot bypass the clamp. */
  moveShelf: (unitId, itemId, posRaw, snapStep) => get().setShelfPos(unitId, itemId, posRaw, snapStep),

  /**
   * Re-clamp every shelf of a unit. Called after a carcass parameter changes:
   * shrinking the height or adding a drawer stack moves the band the shelves
   * are allowed to sit in, and a shelf left outside it would be an overlap
   * nobody dragged.
   */
  reclampShelves: (unitId) => {
    const s = get();
    const unit = s.units.find((u) => u.id === unitId);
    if (!unit) return;
    const profile = getCabinetProfile();
    const band = shelfBandFor(unit, profile);
    const items = unit.params.sections?.[0]?.items || [];
    const shelves = items.filter((i) => i.kind === 'shelf' && Number.isFinite(i.pos_mm))
      .sort((a, b) => a.pos_mm - b.pos_mm);
    if (!shelves.length) return;

    // Bottom-up, each shelf clamped against the ones already settled below it.
    const settled = [];
    const next = new Map();
    for (const sh of shelves) {
      const state = clampShelfPos({
        pos: sh.pos_mm, current: sh.pos_mm, others: settled, band,
      }, profile);
      next.set(sh.id, state.pos);
      settled.push(state.pos);
    }
    if ([...next].every(([id, pos]) => items.find((i) => i.id === id)?.pos_mm === pos)) return;

    set((st) => ({
      units: st.units.map((u) => (u.id === unitId
        ? {
          ...u,
          params: {
            ...u.params,
            sections: [{
              ...u.params.sections[0],
              items: items.map((i) => (next.has(i.id) ? { ...i, pos_mm: next.get(i.id) } : i)),
            }],
          },
        }
        : u)),
      dirty: true,
    }));
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
// Thin adapters: they turn a unit into the plain numbers the pure collision
// functions want, and nothing more. The RULES live in engine/collision.js.

/** Every OTHER shelf's position in this unit. */
function otherShelfPositions(unit, itemId) {
  return (unit.params.sections?.[0]?.items || [])
    .filter((i) => i.kind === 'shelf' && i.id !== itemId && Number.isFinite(i.pos_mm))
    .map((i) => i.pos_mm);
}

/** The band this unit's shelves may live in, read off the engine result. */
function shelfBandFor(unit, profile) {
  const G = unit.params.board_t ?? profile.board.thickness;
  const result = computeCabinet(paramsForEngine(unit), profile);
  return shelfBand({
    height: unit.params.height,
    boardT: G,
    // Top face of the drawer partition when there is a stack, else the base.
    floorY: result.assemblies.drawerZone ? result.assemblies.drawerZone.top + G : null,
  }, profile);
}

/** The vertical band a shelf may live in: above the drawer stack, below the top. */
export function shelfLimits(unit, profile) {
  const band = shelfBandFor(unit, profile);
  const G = unit.params.board_t ?? profile.board.thickness;
  return { ...band, drawerTop: band.floor === G ? null : band.floor };
}

/** Drag bounds for one shelf: the band, narrowed by its immediate neighbours. */
export function shelfDragBounds(unit, itemId, profile) {
  const band = shelfBandFor(unit, profile);
  const self = unit.params.sections?.[0]?.items?.find((i) => i.id === itemId);
  return shelfBounds({
    pos: self?.pos_mm ?? band.min,
    others: otherShelfPositions(unit, itemId),
    band,
  }, profile);
}

/**
 * Interior validation. The hard rule from SPEC 4.7: a drawer stack must be
 * closed by a shelf above it. The engine always emits the PARTITION panel for
 * that, so this reports the case where the drawers were dropped instead.
 */
export function validateUnit(unit, result, context = {}) {
  const issues = [];
  const items = unit.params.sections?.[0]?.items || [];
  const drawers = items.filter((i) => i.kind === 'drawer').length;

  // Room fit. Position is hard-clamped by the setters, so what is left here is
  // exactly what clamping CANNOT fix: a unit that does not fit the room at all
  // and needs a number changed (CLAUDE.md task 3).
  if (context.room) {
    issues.push(...unitIssues({
      unit,
      room: context.room,
      others: (context.units || [])
        .filter((u) => u.id !== unit.id && (u.position?.wall ?? 0) === (unit.position?.wall ?? 0))
        .map((u) => ({ ...unitSpan(u), label: u.params?.unit_num })),
    }));
  }

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
