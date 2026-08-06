import { create } from 'zustand';
import { computeCabinet } from '../engine/cabinet.js';
import { getCabinetProfile } from '../engine/profile.js';
import { defaultParamsFor, getUnitType, UNIT_NUM_PREFIX } from '../engine/types.js';
import { snap as snapTo } from '../engine/format.js';
import {
  clampShelfPos, clampUnitDepth, clampUnitWidth, clampUnitX, firstFreeUnitX,
  shelfBand, shelfBounds, unitIssues, unitPlanSpan, unitSpan, wallObstacles,
} from '../engine/collision.js';
import {
  DEFAULT_ROOM as ENGINE_DEFAULT_ROOM, migrateRoom, roomChangeGuard, roomWalls, wallWidth,
} from '../engine/room.js';

// ─── Project state ───
// The room, the units standing in it and their interior contents (SPEC 5).
// The database is the home of this data; localStorage is only a cache so a
// refresh in mock mode does not lose work (CLAUDE.md rule 7).

const CACHE_KEY = 'cc.project.cache.v1';

const uid = (prefix) => `${prefix}_${Math.random().toString(36).slice(2, 9)}`;

export const DEFAULT_ROOM = ENGINE_DEFAULT_ROOM;

function newUnit(typeId, profile, index) {
  const type = getUnitType(typeId);
  const params = defaultParamsFor(type.id, profile);
  // A drawer unit IS its drawers — the LISP kit has no "how many" question, so
  // the stack exists from the moment the unit is placed.
  const items = type.drawerStyle === 'budr'
    ? profile.baseDrawerUnit.ratio.map((_, i) => ({ id: uid('drawer'), kind: 'drawer', index: i + 1, mount: 'overlay' }))
    : [];
  return {
    id: uid('u'),
    type: type.id,
    position: { wall: 0, x_mm: 0, rotation_deg: 0 },
    params: {
      ...params,
      unit_num: `${UNIT_NUM_PREFIX[type.id] ?? ''}${String(index + 1).padStart(2, '0')}`,
      // Doors are the LAST step (SPEC 4.10) — except where the type has none.
      doors: type.supports.doors ? false : null,
      sections: [{ width_mm: params.width, items }],
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
  // A cached project may predate room v2 — migrate on the way in, so an old
  // tab that reloads gets four walls instead of a crash.
  project: cached?.project
    ? { ...cached.project, room: migrateRoom(cached.project.room) }
    : { id: null, name: 'Untitled project', room: DEFAULT_ROOM, jc_tenant_id: null, jc_project_id: null },
  units: cached?.units || [],
  dirty: false,

  // ── project / room ───────────────────────────────────────────────────────
  setProjectName: (name) => set((s) => ({ project: { ...s.project, name }, dirty: true })),

  /**
   * Change the room. REFUSED when the new shape would leave a unit hanging off
   * a wall or under a lowered ceiling: shrinking the room is the one path that
   * can create an overlap with nobody dragging anything, so it is blocked at
   * the setter rather than repaired afterwards (CLAUDE.md phase 3).
   *
   * @returns {{ok:boolean, message:string|null, blocking:Array}}
   */
  setRoom: (patch) => {
    const s = get();
    const next = migrateRoom({ ...s.project.room, ...patch });
    const verdict = roomChangeGuard(next, s.units);
    if (!verdict.ok) return verdict;
    set((st) => ({ project: { ...st.project, room: next }, dirty: true }));
    return verdict;
  },

  /** What a room change WOULD do, without doing it (live preview in the modal). */
  previewRoom: (patch) => {
    const s = get();
    return roomChangeGuard(migrateRoom({ ...s.project.room, ...patch }), s.units);
  },

  addOpening: (opening) => set((s) => ({
    project: {
      ...s.project,
      room: { ...s.project.room, openings: [...(s.project.room.openings || []), { id: uid('op'), ...opening }] },
    },
    dirty: true,
  })),

  updateOpening: (id, patch) => set((s) => ({
    project: {
      ...s.project,
      room: {
        ...s.project.room,
        openings: (s.project.room.openings || []).map((o) => (o.id === id ? { ...o, ...patch } : o)),
      },
    },
    dirty: true,
  })),

  removeOpening: (id) => set((s) => ({
    project: {
      ...s.project,
      room: { ...s.project.room, openings: (s.project.room.openings || []).filter((o) => o.id !== id) },
    },
    dirty: true,
  })),

  loadProject: (project, units) => set({
    project: { ...project, room: migrateRoom(project?.room) },
    units,
    dirty: false,
  }),

  // ── units ────────────────────────────────────────────────────────────────
  addUnit: (typeId) => {
    const profile = getCabinetProfile();
    const state = get();
    const unit = newUnit(typeId, profile, state.units.length);
    // Centred on an empty wall, otherwise butted into the first gap it fits —
    // a new unit never lands on top of an existing one. Wall units and floor
    // units occupy different bands of the same wall, so they are placed
    // against their own kind only.
    const level = getUnitType(typeId).mount;
    unit.position.x_mm = firstFreeUnitX({
      width: unit.params.width,
      wallWidth: wallWidth(state.project.room, 0),
      others: state.units
        .filter((u) => (u.position.wall ?? 0) === 0 && getUnitType(u.type).mount === level)
        .map(unitSpan),
    });
    set((s) => ({ units: [...s.units, unit], dirty: true }));
    return unit.id;
  },

  removeUnit: (unitId) => set((s) => ({ units: s.units.filter((u) => u.id !== unitId), dirty: true })),

  /**
   * Edit a unit's parameters.
   *
   * Growing a unit is a MOVE — the far edge travels — so it stops at exactly
   * the same barriers a drag stops at, through the same pure functions
   * (engine/collision.js). Width stops at the neighbour or the end of the
   * wall; depth stops at the far wall or at a unit standing in the corner it
   * would grow into. What cannot be honoured is reported, not silently
   * applied and not silently dropped.
   *
   * @returns {{applied:object, notices:string[]}}
   */
  updateUnitParams: (unitId, patch) => {
    const s = get();
    const unit = s.units.find((u) => u.id === unitId);
    if (!unit) return { applied: {}, notices: [] };
    const profile = getCabinetProfile();
    const walls = roomWalls(s.project.room);
    const wallIndex = unit.position.wall ?? 0;
    const wall = walls[wallIndex] || walls[0];
    const others = neighboursOf(s, unit).map(toObstacleUnit);
    const notices = [];
    const applied = { ...patch };

    if (patch.width != null) {
      const spans = wallObstacles({ wall, walls, depth: unit.params.depth, others });
      const clamp = clampUnitWidth({
        width: Number(patch.width) || 0, x: unit.position.x_mm, wallWidth: wall.width, others: spans,
      }, profile);
      applied.width = clamp.width;
      if (clamp.blocked) notices.push(`Width limited to ${Math.round(clamp.max)} mm by ${clamp.by}.`);
    }
    if (patch.depth != null) {
      const clamp = clampUnitDepth({
        depth: Number(patch.depth) || 0,
        x: unit.position.x_mm, width: applied.width ?? unit.params.width,
        wall, walls, others,
      }, profile);
      applied.depth = clamp.depth;
      if (clamp.blocked) notices.push(`Depth limited to ${Math.round(clamp.max)} mm by ${clamp.by}.`);
    }

    set((st) => ({
      units: st.units.map((u) => {
        if (u.id !== unitId) return u;
        const params = { ...u.params, ...applied };
        if (applied.width != null && params.sections?.[0]) {
          params.sections = [{ ...params.sections[0], width_mm: applied.width }];
        }
        return { ...u, params };
      }),
      dirty: true,
    }));
    // The clamp above keeps the unit inside its slot without moving it; this
    // re-runs the position clamp anyway, so a unit that was already overlapping
    // (an imported project, a room change) still settles legally.
    if (applied.width != null) get().moveUnit(unitId, get().units.find((u) => u.id === unitId)?.position.x_mm ?? 0, 0);
    if (patch.height != null || applied.width != null) get().reclampShelves(unitId);
    return { applied, notices };
  },

  /** Slide a unit along the wall: snapped, then hard-clamped into its free slot. */
  moveUnit: (unitId, xRaw, snapStep) => {
    const s = get();
    const unit = s.units.find((u) => u.id === unitId);
    if (!unit) return null;
    const walls = roomWalls(s.project.room);
    const wallIndex = unit.position.wall ?? 0;
    const wall = walls[wallIndex] || walls[0];
    // Obstacles include units on OTHER walls whose footprint reaches into this
    // one's depth band — the corner case, in both senses.
    const others = wallObstacles({
      wall, walls, depth: unit.params.depth, others: neighboursOf(s, unit).map(toObstacleUnit),
    });
    // A rotated unit covers a different stretch of wall than its nominal
    // width, so the clamp is given the FOOTPRINT — and the offset between the
    // footprint's left edge and the unit's anchor is constant during a move,
    // which is what makes this a translation of the same one clamp.
    const span = unitPlanSpan({
      wall, x: unit.position.x_mm, width: unit.params.width, depth: unit.params.depth,
      rotation: unit.position.rotation_deg,
    });
    const lead = span.left - unit.position.x_mm;
    const footprintWidth = span.right - span.left;

    const result = clampUnitX({
      x: snapTo(xRaw, snapStep) + lead,
      current: unit.position.x_mm + lead,
      width: footprintWidth,
      wallWidth: wall.width,
      others,
    }, getCabinetProfile());
    const x = result.x - lead;

    set((st) => ({
      units: st.units.map((u) => (u.id === unitId ? { ...u, position: { ...u.position, x_mm: x } } : u)),
      dirty: true,
    }));
    return { ...result, x };
  },

  /**
   * Turn a unit. `mode` 'step' adds 90° per click (the button), 'set' takes an
   * exact angle (the field), 'back' and 'side' are the two alignments Piotr
   * asked for. The result goes straight back through the position clamp, so a
   * turn can no more create an overlap than a drag can.
   */
  rotateUnit: (unitId, mode = 'step', value = 90) => {
    const s = get();
    const unit = s.units.find((u) => u.id === unitId);
    if (!unit) return null;
    const current = Number(unit.position.rotation_deg) || 0;
    let next = current;
    if (mode === 'step') next = current + (Number(value) || 90);
    else if (mode === 'set') next = Number(value) || 0;
    else if (mode === 'back') next = 0;
    else if (mode === 'side') next = 90;
    next = ((next % 360) + 360) % 360;

    set((st) => ({
      units: st.units.map((u) => (u.id === unitId ? { ...u, position: { ...u.position, rotation_deg: next } } : u)),
      dirty: true,
    }));
    // Turning changes the footprint; settle it legally where it stands.
    get().moveUnit(unitId, get().units.find((u) => u.id === unitId)?.position.x_mm ?? 0, 0);
    return next;
  },

  /**
   * Move a unit to another wall. It keeps its distance from the wall start
   * where that still fits, and is clamped into the first free slot otherwise.
   */
  setUnitWall: (unitId, wallIndex) => {
    const s = get();
    const unit = s.units.find((u) => u.id === unitId);
    const walls = roomWalls(s.project.room);
    if (!unit || !walls[wallIndex]) return null;
    const level = getUnitType(unit.type).mount;
    const x = firstFreeUnitX({
      width: unit.params.width,
      wallWidth: walls[wallIndex].width,
      others: s.units
        .filter((u) => u.id !== unitId && (u.position.wall ?? 0) === wallIndex && getUnitType(u.type).mount === level)
        .map(unitSpan),
    });
    set((st) => ({
      units: st.units.map((u) => (u.id === unitId ? { ...u, position: { wall: wallIndex, x_mm: x } } : u)),
      dirty: true,
    }));
    return { wall: wallIndex, x_mm: x };
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

  /**
   * Replace the drawer stack. `heightMm` is the height every NEW drawer gets;
   * heights already set on surviving drawers are kept, so bumping the count
   * from 2 to 3 does not silently reset the two the user already sized.
   */
  addDrawers: (unitId, count, mount = 'overlay', heightMm) => {
    const fallback = Number(heightMm) > 0
      ? Number(heightMm)
      : getCabinetProfile().wardrobe.drawers.frontHeight;
    set((s) => ({
      units: s.units.map((u) => {
        if (u.id !== unitId) return u;
        const section = u.params.sections?.[0] || { width_mm: u.params.width, items: [] };
        const kept = section.items.filter((i) => i.kind !== 'drawer');
        const previous = section.items
          .filter((i) => i.kind === 'drawer')
          .sort((a, b) => (Number(a.index) || 0) - (Number(b.index) || 0));
        const drawers = Array.from({ length: count }, (_, i) => ({
          id: previous[i]?.id || uid('drawer'),
          kind: 'drawer',
          index: i + 1,
          mount,
          height_mm: Number(previous[i]?.height_mm) > 0 ? Number(previous[i].height_mm) : fallback,
        }));
        return { ...u, params: { ...u.params, sections: [{ ...section, items: [...drawers, ...kept] }] } };
      }),
      dirty: true,
    }));
    // The drawer stack raises the floor the shelves stand on.
    get().reclampShelves(unitId);
  },

  /** One drawer's height. Clamped by the engine, then the shelves re-settle. */
  setDrawerHeight: (unitId, itemId, heightMm) => {
    const DR = getCabinetProfile().wardrobe.drawers;
    const h = Number(heightMm);
    const clamped = Number.isFinite(h)
      ? Math.min(Math.max(h, DR.minFrontHeight), DR.maxFrontHeight)
      : DR.frontHeight;
    get().updateItem(unitId, itemId, { height_mm: clamped });
    get().reclampShelves(unitId);
  },

  removeItem: (unitId, itemId) => {
    const wasDrawer = get().units.find((u) => u.id === unitId)
      ?.params.sections?.[0]?.items?.find((i) => i.id === itemId)?.kind === 'drawer';
    set((s) => ({
      units: s.units.map((u) => {
        if (u.id !== unitId) return u;
        const section = u.params.sections[0];
        let items = section.items.filter((i) => i.id !== itemId);
        if (wasDrawer) {
          // Renumber bottom-up, so drawer i keeps meaning "i-th from the floor"
          // for the engine, the runner rows and the cut list.
          let n = 0;
          const order = new Map(items.filter((i) => i.kind === 'drawer')
            .sort((a, b) => (Number(a.index) || 0) - (Number(b.index) || 0))
            .map((i) => [i.id, (n += 1)]));
          items = items.map((i) => (order.has(i.id) ? { ...i, index: order.get(i.id) } : i));
        }
        return { ...u, params: { ...u.params, sections: [{ ...section, items }] } };
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

/**
 * The units a given unit can actually collide with: same wall, same mounting
 * level. A wall unit hangs ABOVE a base unit — that is how a kitchen is built,
 * not an overlap, so they never constrain each other.
 */
function neighboursOf(state, unit) {
  const level = getUnitType(unit.type).mount;
  // Every wall, not just this one: a unit around the corner is a neighbour the
  // moment its footprint reaches into this one's depth (engine/collision.js
  // decides that; this only decides who is even in the running).
  return state.units.filter((u) => u.id !== unit.id && getUnitType(u.type).mount === level);
}

/** A unit as the plain numbers engine/collision.js works with. */
function toObstacleUnit(u) {
  return {
    wall: u.position?.wall ?? 0,
    x_mm: Number(u.position?.x_mm) || 0,
    width: Number(u.params?.width) || 0,
    depth: Number(u.params?.depth) || 0,
    rotation: Number(u.position?.rotation_deg) || 0,
    label: u.params?.unit_num || u.id,
  };
}

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
    const level = getUnitType(unit.type).mount;
    const walls = roomWalls(context.room);
    const wallIndex = unit.position?.wall ?? 0;
    const wall = walls[wallIndex] || walls[0];
    const others = (context.units || [])
      .filter((u) => u.id !== unit.id && getUnitType(u.type).mount === level)
      .map(toObstacleUnit);
    issues.push(...unitIssues({
      unit,
      wallWidth: wall?.width ?? 0,
      roomHeight: context.room.height,
      // Same wall or around the corner — both are an overlap on the floor.
      others: wallObstacles({ wall, walls, depth: unit.params?.depth ?? 0, others })
        .map((o) => ({ left: o.left, right: o.right, label: o.label })),
    }));
  }

  // SPEC 4.7 applies to an INTERNAL drawer stack (a wardrobe): it has to be
  // closed by a partition. A drawer unit whose fronts are the face of the
  // cabinet (BUDR) has no partition by design, so the rule does not apply.
  const type = getUnitType(unit.type);
  if (type.supports.partition) {
    if (drawers > 0 && !result.assemblies.drawerZone) {
      issues.push({ level: 'error', message: 'Drawers do not fit this carcass — they were dropped from the cut list.' });
    }
    if (drawers > 0 && result.assemblies.drawerZone && !result.panels.some((p) => p.part === 'PARTITION')) {
      issues.push({ level: 'error', message: 'A drawer stack must be closed by a shelf (partition) above it.' });
    }
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
