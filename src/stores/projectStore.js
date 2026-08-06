import { create } from 'zustand';
import { computeCabinet } from '../engine/cabinet.js';
import { getCabinetProfile } from '../engine/profile.js';
import { defaultParamsFor, getUnitType, UNIT_NUM_PREFIX } from '../engine/types.js';
import { formatMm, snap as snapTo } from '../engine/format.js';
import {
  clampShelfPos, clampUnitDepth, clampUnitHeight, clampUnitWidth, clampUnitX, endPanelPads,
  freeSlotOnWall, shelfBand, shelfBounds, unitIssues, unitPlanSpan, unitSpan,
  wallObstacles,
} from '../engine/collision.js';
import {
  DEFAULT_ROOM as ENGINE_DEFAULT_ROOM, migrateRoom, roomChangeGuard, roomWalls,
} from '../engine/room.js';
import {
  HEIGHT_KEYS, migrateDesign, normaliseDoorStyle, projectHeights, setCarcassTypeCount,
} from '../engine/design.js';
import { autoPartsFor, takesPlinth, topInfillHeight, topInfillToCeiling } from '../engine/autoparts.js';
import { drawersInEngineOrder, nextHangerOffset, nextShelfPos, shelvesInEngineOrder } from '../engine/items.js';

// ─── Project state ───
// The room, the units standing in it and their interior contents (SPEC 5).
// The database is the home of this data; localStorage is only a cache so a
// refresh in mock mode does not lose work (CLAUDE.md rule 7).

const CACHE_KEY = 'cc.project.cache.v1';

const uid = (prefix) => `${prefix}_${Math.random().toString(36).slice(2, 9)}`;

export const DEFAULT_ROOM = ENGINE_DEFAULT_ROOM;

function newUnit(typeId, profile, index, design) {
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
      // The unit arrives at the PROJECT's heights (turn 5, BACKLOG #29): a
      // kitchen is built to one set of them, so a new cabinet matching the run
      // beside it is the default and a different height is the exception.
      ...projectHeightParams(type, design, profile),
      unit_num: `${UNIT_NUM_PREFIX[type.id] ?? ''}${String(index + 1).padStart(2, '0')}`,
      // Doors are the LAST step (SPEC 4.10) — except where the type has none.
      doors: type.supports.doors ? false : null,
      sections: [{ width_mm: params.width, items }],
      materials: {},
    },
  };
}

/**
 * The height parameters a unit of this type INHERITS from the project: its
 * carcass height (when its kind has a project height at all), the toe kick it
 * stands on, and — for a wall unit — how high it hangs.
 *
 * `height_custom: false` is written explicitly rather than left undefined: it
 * is the answer to "did somebody set this by hand?", and the panel and the
 * project-wide push both read it.
 */
function projectHeightParams(type, design, profile) {
  const heights = projectHeights(design, profile);
  const group = type.heightGroup ?? null;
  return {
    ...(group ? { height: heights[group], height_custom: false } : { height_custom: false }),
    ...(type.mount === 'wall' ? { mount_height: heights.wallMount } : {}),
    ...(type.legs ? { leg_height: heights.toeKick } : {}),
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
    // Which rail was chosen from the hardware list, so the BOM line names the
    // product and not just a length (turn 4, BACKLOG #14).
    rail_material_id: items.find((i) => i.kind === 'hanger')?.material_id ?? null,
    rail_material_label: items.find((i) => i.kind === 'hanger')?.material_label ?? null,
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
    ? { ...cached.project, room: migrateRoom(cached.project.room), design: migrateDesign(cached.project.design) }
    : {
      id: null, name: 'Untitled project', room: DEFAULT_ROOM, design: migrateDesign(null),
      jc_tenant_id: null, jc_project_id: null,
    },
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
    // A lower ceiling shortens every top infill; a longer wall opens a gap.
    get().refreshAutoParts();
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
    project: { ...project, room: migrateRoom(project?.room), design: migrateDesign(project?.design) },
    units: Array.isArray(units) ? units : [],
    dirty: false,
  }),

  /**
   * A blank project (turn 4: the start screen's New project).
   *
   * Deliberately a RESET, not a patch: an empty room, no units, no design
   * carried over. "New" that inherits the last project's walls is how somebody
   * quotes a kitchen against the wrong room.
   */
  newProject: (name = 'Untitled project') => set({
    project: {
      id: null,
      name: name || 'Untitled project',
      room: DEFAULT_ROOM,
      design: migrateDesign(null),
      jc_tenant_id: null,
      jc_project_id: null,
    },
    units: [],
    dirty: false,
  }),

  // ── design settings (project level, CLAUDE.md phase 6) ───────────────────
  // Materials, the standard front, the workshop's own door styles, the front
  // colour and the infill width. Stored WITH the project, so opening a project
  // opens the way it is built, not the way the last one was.
  setDesign: (patch) => {
    set((s) => ({
      project: { ...s.project, design: migrateDesign({ ...s.project.design, ...patch }) },
      dirty: true,
    }));
    // The infill width lives in Design Settings, so changing it re-cuts the
    // fillers everywhere.
    get().refreshAutoParts();
  },

  setCarcassTypes: (count) => set((s) => ({
    project: { ...s.project, design: setCarcassTypeCount(migrateDesign(s.project.design), count) },
    dirty: true,
  })),

  setCarcassMaterial: (typeId, materialId) => set((s) => {
    const design = migrateDesign(s.project.design);
    return {
      project: {
        ...s.project,
        design: {
          ...design,
          carcass: {
            types: design.carcass.types.map((t) => (t.id === typeId ? { ...t, material_id: materialId || null } : t)),
          },
        },
      },
      dirty: true,
    };
  }),

  /** What a carcass material LOOKS like (turn 4): its decor, per material type. */
  setCarcassFinish: (typeId, finishId) => set((s) => {
    const design = migrateDesign(s.project.design);
    return {
      project: {
        ...s.project,
        design: {
          ...design,
          carcass: {
            types: design.carcass.types.map((t) => (t.id === typeId ? { ...t, finish_id: finishId || null } : t)),
          },
        },
      },
      dirty: true,
    };
  }),

  addDoorStyle: (style) => {
    const id = style?.id || uid('ds');
    set((s) => {
      const design = migrateDesign(s.project.design);
      const next = normaliseDoorStyle({ ...style, id });
      if (!next) return {};
      return {
        project: { ...s.project, design: { ...design, doorStyles: [...design.doorStyles, next] } },
        dirty: true,
      };
    });
    return id;
  },

  updateDoorStyle: (id, patch) => set((s) => {
    const design = migrateDesign(s.project.design);
    return {
      project: {
        ...s.project,
        design: {
          ...design,
          doorStyles: design.doorStyles.map((st) => (st.id === id ? normaliseDoorStyle({ ...st, ...patch, id }) : st)),
        },
      },
      dirty: true,
    };
  }),

  removeDoorStyle: (id) => set((s) => {
    const design = migrateDesign(s.project.design);
    return {
      project: { ...s.project, design: { ...design, doorStyles: design.doorStyles.filter((st) => st.id !== id) } },
      // A unit pointing at a style that no longer exists falls back to the
      // project default rather than rendering nothing.
      units: s.units.map((u) => (u.params.door_style_id === id
        ? { ...u, params: { ...u.params, door_style_id: null } }
        : u)),
      dirty: true,
    };
  }),

  // ── construction automatics (CLAUDE.md phase 7) ──────────────────────────
  /**
   * Re-derive the automatic parts for one unit (or all of them) from the room
   * around it: the plinth underneath, the scribe fillers where it meets a
   * wall, and the top infill up to the ceiling.
   *
   * Called wherever the geometry it depends on changes — placing, moving,
   * resizing, turning, editing the room or the infill setting — so the extra
   * pieces in the cut list are never stale.
   *
   * @returns {string[]} notices worth telling the user about
   */
  refreshAutoParts: (unitId = null) => {
    const s = get();
    const profile = getCabinetProfile();
    const walls = roomWalls(s.project.room);
    const design = migrateDesign(s.project.design);
    const roomHeight = Number(s.project.room.height) || 0;
    const notices = [];

    const next = s.units.map((u) => {
      if (unitId && u.id !== unitId) return u;
      const wall = walls[u.position?.wall ?? 0] || walls[0];
      const level = getUnitType(u.type).mount;
      const others = s.units
        .filter((o) => o.id !== u.id && (o.position?.wall ?? 0) === (u.position?.wall ?? 0)
          && getUnitType(o.type).mount === level)
        .map(unitSpan);
      const parts = autoPartsFor({
        unit: u, wallWidth: wall?.width ?? 0, others, roomHeight, design,
      }, profile);
      notices.push(...parts.notices);
      return {
        ...u,
        params: {
          ...u.params,
          plinth: parts.plinth,
          top_infill_mm: parts.top_infill_mm,
          side_infill_left_mm: parts.side_infill_left_mm,
          side_infill_right_mm: parts.side_infill_right_mm,
        },
      };
    });

    set({ units: next, dirty: true });
    return notices;
  },

  /**
   * Drag the top infill up. `heightMm` is the height the pointer asks for; it
   * is clamped to what is left between the unit and the ceiling.
   */
  setTopInfill: (unitId, heightMm) => {
    const s = get();
    const unit = s.units.find((u) => u.id === unitId);
    if (!unit) return 0;
    const profile = getCabinetProfile();
    const height = topInfillHeight({
      requested: snapTo(heightMm, profile.editor.mmStep),
      unitTop: unitTopOf(unit, profile),
      roomHeight: Number(s.project.room.height) || 0,
    }, profile);
    set((st) => ({
      units: st.units.map((u) => (u.id === unitId ? { ...u, params: { ...u.params, top_infill_mm: height } } : u)),
      dirty: true,
    }));
    return height;
  },

  // ── the manual pieces (turn 4, BACKLOG #16/#17) ──────────────────────────
  // A plinth, a top infill and an end panel are DECISIONS, not consequences of
  // placing a unit. Each one exists from the moment it is added and not before:
  // no ghost rows in the cut list for pieces nobody ordered.

  /** @returns {boolean} false when this type cannot take a plinth at all. */
  addPlinth: (unitId) => {
    const unit = get().units.find((u) => u.id === unitId);
    if (!unit || !takesPlinth(unit.type, getCabinetProfile())) return false;
    set((s) => ({
      units: s.units.map((u) => (u.id === unitId ? { ...u, params: { ...u.params, plinth: true } } : u)),
      dirty: true,
    }));
    return true;
  },

  removePlinth: (unitId) => set((s) => ({
    units: s.units.map((u) => (u.id === unitId ? { ...u, params: { ...u.params, plinth: false } } : u)),
    dirty: true,
  })),

  /**
   * Add the top infill at the profile default, clamped to whatever the room has
   * left above the unit. Returns the height it got — 0 means the unit is already
   * at the ceiling, and the caller says so.
   */
  addTopInfill: (unitId) => {
    const profile = getCabinetProfile();
    return get().setTopInfill(unitId, profile.autoParts.topInfill.defaultHeight);
  },

  removeTopInfill: (unitId) => set((s) => ({
    units: s.units.map((u) => (u.id === unitId ? { ...u, params: { ...u.params, top_infill_mm: 0 } } : u)),
    dirty: true,
  })),

  /**
   * Add an end panel to one side of a unit.
   *
   * `applyToAll` ✓ writes the settings back to the PROJECT (design.endPanel), so
   * the next end panel anywhere inherits them — which is what the checkbox in
   * the panel promises. The panel is a cut piece the moment it exists, and the
   * unit's footprint grows by its thickness, so the neighbour beside it is
   * clamped out of the space it now occupies.
   *
   * @returns {{id:string|null, error:string|null}}
   */
  addEndPanel: (unitId, { side = 'L', height = null, thickness = null, applyToAll = null } = {}) => {
    const s = get();
    const unit = s.units.find((u) => u.id === unitId);
    if (!unit) return { id: null, error: 'No unit selected.' };
    const design = migrateDesign(s.project.design);
    const wanted = side === 'R' ? 'R' : 'L';
    const existing = unit.params.end_panels || [];
    if (existing.some((ep) => ep.side === wanted)) {
      return { id: null, error: `This unit already has an end panel on the ${wanted === 'L' ? 'left' : 'right'}.` };
    }

    const profile = getCabinetProfile();
    const settings = {
      height: height || design.endPanel.height,
      // "Same as the doors" is what a workshop means by a default thickness.
      thickness: Number(thickness) > 0
        ? Number(thickness)
        : (Number(design.endPanel.thickness) > 0
          ? Number(design.endPanel.thickness)
          : (unit.params.front_t || profile.front.thickness)),
    };

    // Collisions are RESPECTED, which for a piece that appears out of nowhere
    // means it is refused when it does not fit: adding it anyway would be an
    // overlap the app created itself, which is exactly what turn 3 phase 4
    // closed off. What is in the way is named, so the answer is actionable.
    const room = freeBesideUnit(s, unit, wanted);
    if (room.gap < settings.thickness) {
      return {
        id: null,
        error: `No room for a ${formatMm(settings.thickness)} mm end panel on the `
          + `${wanted === 'L' ? 'left' : 'right'} — only ${formatMm(room.gap)} mm free `
          + `before ${room.by}.`,
      };
    }

    const id = uid('ep');

    set((st) => ({
      units: st.units.map((u) => (u.id === unitId
        ? { ...u, params: { ...u.params, end_panels: [...(u.params.end_panels || []), { id, side: wanted, ...settings }] } }
        : u)),
      project: applyToAll === false
        ? st.project
        : { ...st.project, design: migrateDesign({ ...design, endPanel: { ...settings, applyToAll: true } }) },
      dirty: true,
    }));
    // The unit is wider than it was; settle it legally where it stands.
    get().moveUnit(unitId, unit.position.x_mm, 0);
    return { id, error: null };
  },

  removeEndPanel: (unitId, panelId) => {
    set((s) => ({
      units: s.units.map((u) => (u.id === unitId
        ? { ...u, params: { ...u.params, end_panels: (u.params.end_panels || []).filter((ep) => ep.id !== panelId) } }
        : u)),
      dirty: true,
    }));
    get().refreshAutoParts();
  },

  updateEndPanel: (unitId, panelId, patch) => {
    set((s) => {
      const design = migrateDesign(s.project.design);
      const next = s.units.map((u) => (u.id === unitId
        ? {
          ...u,
          params: {
            ...u.params,
            end_panels: (u.params.end_panels || []).map((ep) => (ep.id === panelId ? { ...ep, ...patch } : ep)),
          },
        }
        : u));
      const edited = next.find((u) => u.id === unitId)?.params.end_panels?.find((ep) => ep.id === panelId);
      return {
        units: next,
        // With "apply to all" ticked, editing one panel is editing the default —
        // that is what makes the next one match without being told again.
        project: design.endPanel.applyToAll && edited
          ? {
            ...s.project,
            design: migrateDesign({
              ...design,
              endPanel: { height: edited.height, thickness: edited.thickness, applyToAll: true },
            }),
          }
          : s.project,
        dirty: true,
      };
    });
    get().moveUnit(unitId, get().units.find((u) => u.id === unitId)?.position.x_mm ?? 0, 0);
  },

  /** The "Apply to all end panels" checkbox itself. */
  setEndPanelDefaults: (patch) => set((s) => {
    const design = migrateDesign(s.project.design);
    return {
      project: { ...s.project, design: migrateDesign({ ...design, endPanel: { ...design.endPanel, ...patch } }) },
      dirty: true,
    };
  }),

  /** Double click: run the top infill all the way to the ceiling. */
  fillToCeiling: (unitId) => {
    const s = get();
    const unit = s.units.find((u) => u.id === unitId);
    if (!unit) return 0;
    const profile = getCabinetProfile();
    return get().setTopInfill(unitId, topInfillToCeiling({
      unitTop: unitTopOf(unit, profile),
      roomHeight: Number(s.project.room.height) || 0,
    }));
  },

  /** Point a unit at one of the project's door styles (or back at the default). */
  assignDoorStyle: (unitId, styleId) => set((s) => ({
    units: s.units.map((u) => (u.id === unitId
      ? { ...u, params: { ...u.params, door_style_id: styleId || null } }
      : u)),
    dirty: true,
  })),

  // ── units ────────────────────────────────────────────────────────────────
  addUnit: (typeId) => {
    const profile = getCabinetProfile();
    const state = get();
    const unit = newUnit(typeId, profile, state.units.length, state.project.design);
    // Centred on an empty wall, otherwise butted onto the end of the run —
    // a new unit never lands on top of an existing one. Wall units and floor
    // units occupy different bands of the same wall, so they are placed
    // against their own kind only.
    //
    // When wall 0 is full the unit goes round the room looking for a wall with
    // room, and when the whole room is full it is REFUSED. Dropping it on the
    // far end of a full wall and reporting the overlap afterwards would be an
    // overlap the app created itself (CLAUDE.md turn 3, phase 4).
    const level = getUnitType(typeId).mount;
    const walls = roomWalls(state.project.room);
    let placed = null;
    for (const wall of walls) {
      const x = freeSlotOnWall({
        width: unit.params.width,
        wallWidth: wall.width,
        wallMargin: wallMarginOf(state),
        others: state.units
          .filter((u) => (u.position.wall ?? 0) === wall.index && getUnitType(u.type).mount === level)
          .map(unitSpan),
      }, profile);
      if (x != null) { placed = { wall: wall.index, x }; break; }
    }
    if (!placed) {
      return {
        id: null,
        error: `No wall has ${formatMm(unit.params.width)} mm of free space for this unit — move or remove something first.`,
      };
    }
    unit.position.wall = placed.wall;
    unit.position.x_mm = placed.x;
    set((s) => ({ units: [...s.units, unit], dirty: true }));
    // A unit arrives with its SCRIBE FILLERS worked out from where it landed.
    // The plinth and the top infill are decisions and wait to be asked for
    // (turn 4, BACKLOG #16) — turn 3 put both in the cut list unasked.
    get().refreshAutoParts(unit.id);
    return { id: unit.id, error: null, wall: placed.wall };
  },

  removeUnit: (unitId) => {
    set((s) => ({ units: s.units.filter((u) => u.id !== unitId), dirty: true }));
    get().refreshAutoParts();
  },

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
        width: Number(patch.width) || 0,
        x: unit.position.x_mm,
        wallWidth: wall.width,
        others: spans,
        // Growing a unit is a move of its far edge: it stops at the infill gap
        // and carries its own end panel with it.
        wallMargin: wallMarginOf(s),
        padRight: endPanelPads(unit, unit.params.front_t).right,
      }, profile);
      applied.width = clamp.width;
      if (clamp.blocked) notices.push(`Width limited to ${formatMm(clamp.max)} mm by ${clamp.by}.`);
    }
    if (patch.depth != null) {
      const clamp = clampUnitDepth({
        depth: Number(patch.depth) || 0,
        x: unit.position.x_mm, width: applied.width ?? unit.params.width,
        wall, walls, others,
      }, profile);
      applied.depth = clamp.depth;
      if (clamp.blocked) notices.push(`Depth limited to ${formatMm(clamp.max)} mm by ${clamp.by}.`);
    }
    if (patch.height != null) {
      const clamp = clampUnitHeight({
        height: Number(patch.height) || 0,
        floorY: floorYOf(unit, applied, profile),
        roomHeight: Number(s.project.room.height) || 0,
        minHeight: minHeightOf(unit.type, profile),
      });
      applied.height = clamp.height;
      if (clamp.blocked) notices.push(`Height limited to ${formatMm(clamp.max)} mm by ${clamp.by}.`);
      // Typing a height into the panel is the DELIBERATE exception (BACKLOG
      // #29): from here this unit keeps its own height and stops following the
      // project's, until Reset puts it back. The project-wide push passes the
      // flag itself, which is how it can move a unit without claiming a joiner
      // did it by hand.
      if (patch.height_custom === undefined) applied.height_custom = true;
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
    notices.push(...get().refreshAutoParts());
    return { applied, notices };
  },

  // ── project heights (turn 5, BACKLOG #29) ────────────────────────────────
  // A kitchen is built to ONE set of heights. They live with the project, a new
  // unit inherits the one for its kind, and changing a project height carries
  // every unit that has not been given its own along with it.

  /**
   * Set one or more project heights and apply them.
   *
   * @param {object} patch  { base?, wall?, tall?, wallMount?, toeKick? } in mm
   * @returns {{applied:object, moved:number, notices:string[]}}
   *          `moved` is how many units followed the change, which is what the
   *          panel says out loud — a silent edit that re-cuts nine cabinets is
   *          not something to find out about from the BOM.
   */
  setProjectHeights: (patch) => {
    const s = get();
    const profile = getCabinetProfile();
    const limits = profile.projectHeights;
    const design = migrateDesign(s.project.design);
    const heights = { ...design.heights };
    const applied = {};
    for (const key of HEIGHT_KEYS) {
      if (patch[key] == null) continue;
      const value = Math.min(limits.max, Math.max(limits.min, Number(patch[key]) || 0));
      heights[key] = value;
      applied[key] = value;
    }
    if (!Object.keys(applied).length) return { applied: {}, moved: 0, notices: [] };

    const nextDesign = migrateDesign({ ...design, heights });
    set((st) => ({ project: { ...st.project, design: nextDesign }, dirty: true }));

    const resolved = projectHeights(nextDesign, profile);
    const notices = [];
    let moved = 0;
    for (const unit of get().units) {
      const type = getUnitType(unit.type);
      const group = type.heightGroup ?? null;
      const changes = {};
      // The carcass height — only for a unit that still follows the project.
      if (group && applied[group] != null && !unit.params.height_custom) {
        changes.height = resolved[group];
        changes.height_custom = false;
      }
      if (applied.wallMount != null && type.mount === 'wall') changes.mount_height = resolved.wallMount;
      if (applied.toeKick != null && type.legs) changes.leg_height = resolved.toeKick;
      if (!Object.keys(changes).length) continue;
      const result = get().updateUnitParams(unit.id, changes);
      moved += 1;
      for (const n of result.notices) notices.push(`${unit.params.unit_num}: ${n}`);
    }
    return { applied, moved, notices };
  },

  /** Put a unit back on the project's height for its kind. */
  resetUnitHeight: (unitId) => {
    const s = get();
    const unit = s.units.find((u) => u.id === unitId);
    if (!unit) return null;
    const profile = getCabinetProfile();
    const type = getUnitType(unit.type);
    const group = type.heightGroup ?? null;
    if (!group) return null;
    const height = projectHeights(s.project.design, profile)[group];
    return get().updateUnitParams(unitId, { height, height_custom: false });
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
    // End panels are part of the footprint, so the span is measured from the
    // outside of the left panel to the outside of the right one. (A ROTATED unit
    // with an end panel pivots about that outer corner rather than the carcass
    // corner — a fraction of the panel thickness, and the same corner the clamp
    // and the view both use.)
    const pad = endPanelPads(unit, unit.params.front_t);
    const span = unitPlanSpan({
      wall,
      x: unit.position.x_mm - pad.left,
      width: unit.params.width + pad.left + pad.right,
      depth: unit.params.depth,
      rotation: unit.position.rotation_deg,
    });
    const lead = span.left - unit.position.x_mm;
    const footprintWidth = span.right - span.left;

    const result = clampUnitX({
      x: snapTo(xRaw, snapStep || getCabinetProfile().editor.mmStep) + lead,
      current: unit.position.x_mm + lead,
      width: footprintWidth,
      wallWidth: wall.width,
      others,
      // The stop that makes the side infill appear (BACKLOG #15).
      wallMargin: wallMarginOf(s),
    }, getCabinetProfile());
    const x = result.x - lead;

    set((st) => ({
      units: st.units.map((u) => (u.id === unitId ? { ...u, position: { ...u.position, x_mm: x } } : u)),
      dirty: true,
    }));
    // Moving changes which gaps exist — and a gap is a filler.
    get().refreshAutoParts();
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
    // Turning changes the footprint; settle it legally where it stands
    // (moveUnit re-derives the automatics on the way through).
    get().moveUnit(unitId, get().units.find((u) => u.id === unitId)?.position.x_mm ?? 0, 0);
    return next;
  },

  /**
   * Move a unit to another wall — into a free slot, or not at all.
   *
   * A wall with no room for it REFUSES the move. Moving it there anyway and
   * reporting the overlap afterwards would be an overlap the app created
   * itself, which is exactly what phase 4 closes off.
   */
  setUnitWall: (unitId, wallIndex) => {
    const s = get();
    const unit = s.units.find((u) => u.id === unitId);
    const walls = roomWalls(s.project.room);
    if (!unit || !walls[wallIndex]) return null;
    const level = getUnitType(unit.type).mount;
    const x = freeSlotOnWall({
      width: unit.params.width,
      wallWidth: walls[wallIndex].width,
      wallMargin: wallMarginOf(s),
      others: s.units
        .filter((u) => u.id !== unitId && (u.position.wall ?? 0) === wallIndex && getUnitType(u.type).mount === level)
        .map(unitSpan),
    }, getCabinetProfile());
    if (x == null) {
      return {
        wall: unit.position.wall ?? 0,
        x_mm: unit.position.x_mm,
        blocked: true,
        error: `Wall ${wallIndex + 1} has no free space for this unit — move or remove something there first.`,
      };
    }
    set((st) => ({
      units: st.units.map((u) => (u.id === unitId ? { ...u, position: { ...u.position, wall: wallIndex, x_mm: x } } : u)),
      dirty: true,
    }));
    get().refreshAutoParts(unitId);
    return { wall: wallIndex, x_mm: x, blocked: false, error: null };
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

  /**
   * One height for the WHOLE stack (turn 4, BACKLOG #11: "Equal heights" ✓).
   * One call, one clamp, one re-settle of the shelves above — rather than the UI
   * looping over setDrawerHeight and re-running the shelf clamp per drawer.
   */
  setAllDrawerHeights: (unitId, heightMm) => {
    const DR = getCabinetProfile().wardrobe.drawers;
    const h = Number(heightMm);
    const clamped = Number.isFinite(h)
      ? Math.min(Math.max(h, DR.minFrontHeight), DR.maxFrontHeight)
      : DR.frontHeight;
    set((s) => ({
      units: s.units.map((u) => {
        if (u.id !== unitId) return u;
        const section = u.params.sections?.[0];
        if (!section) return u;
        return {
          ...u,
          params: {
            ...u.params,
            drawer_equal_heights: true,
            sections: [{
              ...section,
              items: section.items.map((i) => (i.kind === 'drawer' ? { ...i, height_mm: clamped } : i)),
            }],
          },
        };
      }),
      dirty: true,
    }));
    get().reclampShelves(unitId);
    return clamped;
  },

  /** ✓ = one height for every drawer; unticked = a field per drawer. */
  setDrawerEqualHeights: (unitId, equal) => {
    set((s) => ({
      units: s.units.map((u) => (u.id === unitId
        ? { ...u, params: { ...u.params, drawer_equal_heights: Boolean(equal) } }
        : u)),
      dirty: true,
    }));
    // Ticking it back on has to MEAN something: the bottom drawer's height (the
    // one the eye starts from) becomes the height of the stack.
    if (equal) {
      const unit = get().units.find((u) => u.id === unitId);
      const bottom = drawersInEngineOrder(unit?.params.sections?.[0]?.items || [])[0];
      if (bottom) get().setAllDrawerHeights(unitId, bottom.height_mm ?? getCabinetProfile().wardrobe.drawers.frontHeight);
    }
  },

  /**
   * Add `count` shelves, each in the topmost free slot (turn 4, BACKLOG #12):
   * shelves fill from the TOP down and never land on one another. Returns how
   * many actually fitted, so the caller can say "no room for the rest" instead
   * of silently dropping them.
   */
  addShelves: (unitId, count = 1) => {
    const profile = getCabinetProfile();
    let added = 0;
    for (let i = 0; i < Math.max(1, Math.trunc(count)); i += 1) {
      const unit = get().units.find((u) => u.id === unitId);
      if (!unit) break;
      const items = unit.params.sections?.[0]?.items || [];
      const pos = nextShelfPos({
        band: shelfLimits(unit, profile),
        positions: shelvesInEngineOrder(items).map((sh) => sh.pos_mm),
      }, profile);
      if (pos == null) break;
      get().addItem(unitId, { kind: 'shelf', variant: 'fixed', pos_mm: pos });
      added += 1;
    }
    return { added, requested: Math.max(1, Math.trunc(count)) };
  },

  /**
   * Add the hanging rail, as high as it can go under the lowest shelf and clear
   * of the drawer stack below it (BACKLOG #12: "hangers in between"). The chosen
   * hardware travels with the item, so the BOM names the product.
   */
  addHangerRail: (unitId, { materialId = null, materialLabel = null } = {}) => {
    const profile = getCabinetProfile();
    const unit = get().units.find((u) => u.id === unitId);
    if (!unit) return null;
    const items = unit.params.sections?.[0]?.items || [];
    if (items.some((i) => i.kind === 'hanger')) return null;
    const result = computeCabinet(paramsForEngine(unit), profile);
    const G = unit.params.board_t ?? profile.board.thickness;
    const zoneBase = result.assemblies.drawerZone ? result.assemblies.drawerZone.top + G : G;
    const offset = nextHangerOffset({
      band: shelfLimits(unit, profile),
      positions: shelvesInEngineOrder(items).map((sh) => sh.pos_mm),
      zoneBase,
      fallback: unit.params.rail_offset,
    }, profile);
    return get().addItem(unitId, {
      kind: 'hanger', pos_mm: snapTo(offset, profile.editor.mmStep), material_id: materialId, material_label: materialLabel,
    });
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
    const profile = getCabinetProfile();
    const limits = shelfLimits(unit, profile);
    const items = unit.params.sections[0].items;
    const shelves = items.filter((i) => i.kind === 'shelf');
    const step = (limits.max - limits.min) / (shelves.length + 1);
    let n = 0;
    const next = items.map((i) => (i.kind === 'shelf'
      ? { ...i, pos_mm: snapTo(limits.min + step * (++n), profile.editor.mmStep) }
      : i));
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
      // A stored millimetre is ALWAYS on the workshop grid (BACKLOG #33): the
      // drag's own snap when there is one, half a millimetre when there is not
      // — so a shelf never ends up at 704.68231 mm however it got there.
      pos: snapTo(posRaw, snapStep || profile.editor.mmStep),
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
/**
 * How far off the floor this unit's carcass starts: its toe kick when it stands
 * on legs, its mounting height when it hangs. That is what a height has to fit
 * UNDER the ceiling on top of.
 */
function floorYOf(unit, applied, profile) {
  const type = getUnitType(unit.type);
  if (type.mount === 'wall') {
    return Number(applied?.mount_height ?? unit.params.mount_height ?? profile.wallUnit.defaults.mountHeight) || 0;
  }
  if (!type.legs) return 0;
  const own = Number(applied?.leg_height ?? unit.params.leg_height);
  if (Number.isFinite(own) && own >= 0) return own;
  return type.legSource === 'wardrobe' ? profile.wardrobe.legHeight : profile.baseUnit.legHeight;
}

/** The type's own minimum height, if its kit declares one (engine/types.js). */
function minHeightOf(typeId, profile) {
  const key = getUnitType(typeId).minHeightKey;
  if (!key) return 0;
  return Number(key.split('.').reduce((acc, k) => (acc == null ? acc : acc[k]), profile)) || 0;
}

function neighboursOf(state, unit) {
  const level = getUnitType(unit.type).mount;
  // Every wall, not just this one: a unit around the corner is a neighbour the
  // moment its footprint reaches into this one's depth (engine/collision.js
  // decides that; this only decides who is even in the running).
  return state.units.filter((u) => u.id !== unit.id && getUnitType(u.type).mount === level);
}

/** Height of a unit's top above the floor — where its top infill starts. */
function unitTopOf(unit, profile) {
  const type = getUnitType(unit.type);
  const base = type.mount === 'wall'
    ? Number(unit.params.mount_height) || 0
    : (type.legs ? (type.legSource === 'wardrobe' ? profile.wardrobe.legHeight : profile.baseUnit.legHeight) : 0);
  return base + (Number(unit.params.height) || 0);
}

/**
 * A unit as the plain numbers engine/collision.js works with — END PANELS
 * INCLUDED, so a neighbour cannot be moved into a panel it cannot see.
 */
function toObstacleUnit(u) {
  const pad = endPanelPads(u, u.params?.front_t);
  return {
    wall: u.position?.wall ?? 0,
    x_mm: (Number(u.position?.x_mm) || 0) - pad.left,
    width: (Number(u.params?.width) || 0) + pad.left + pad.right,
    depth: Number(u.params?.depth) || 0,
    rotation: Number(u.position?.rotation_deg) || 0,
    label: u.params?.unit_num || u.id,
  };
}

/**
 * How much clear space there is beside a unit on one side, and what closes it.
 * Used by the end-panel path: a masking panel that does not fit is refused
 * rather than dropped on top of the neighbour.
 */
function freeBesideUnit(state, unit, side) {
  const walls = roomWalls(state.project.room);
  const wall = walls[unit.position?.wall ?? 0] || walls[0];
  const span = unitSpan(unit);
  const spans = wallObstacles({
    wall,
    walls,
    depth: unit.params.depth,
    others: neighboursOf(state, unit).map(toObstacleUnit),
  });
  if (side === 'L') {
    let edge = 0;
    let by = 'the wall';
    for (const o of spans) {
      if (o.right <= span.left + 1e-6 && o.right > edge) { edge = o.right; by = o.label || 'a neighbour'; }
    }
    return { gap: Math.max(0, span.left - edge), by };
  }
  let edge = wall?.width ?? 0;
  let by = 'the wall';
  for (const o of spans) {
    if (o.left >= span.right - 1e-6 && o.left < edge) { edge = o.left; by = o.label || 'a neighbour'; }
  }
  return { gap: Math.max(0, edge - span.right), by };
}

/**
 * How far from each end of a wall a unit must stop (BACKLOG #15). It is the
 * project's infill width, so the gap the unit leaves IS the filler that closes
 * it — which is what makes the filler appear by itself when the unit parks.
 */
function wallMarginOf(state) {
  return Math.max(0, Number(migrateDesign(state.project.design).infill.sideWidth) || 0);
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
      issues.push({ level: 'warn', message: `A shelf sits inside the drawer zone (${formatMm(item.pos_mm)} mm) — move it above ${formatMm(zoneTop)} mm.` });
    }
  }
  for (const w of result.warnings) issues.push({ level: 'warn', message: w.message });
  return issues;
}

export { paramsForEngine };
