// ─── T75 · F20 · MULTI-UNIT SETS, FIVE OF THEM SHIPPED AS DATA ──────────────
//
// CLAUDE.md T75 F20: *"Today a saved set is ONE unit's params
// (`lib/templates.js`). Media wall, Sideboard, Vanity, Utility and Hallway are
// names in `engine/projectTypes.js` with no furniture behind them. Nothing here
// needs a new kit ... `engine/sets.js`, pure data, five sets built ONLY from
// kits that exist ... A set is a RECIPE, not a group: after insertion the
// units are ordinary units."*
//
// A recipe is a list of units, left to right, each placed either NEXT to the
// floor unit before it (`at: 'next'`, butted: the run's own grammar) or OVER
// another of the set's units (`at: { over: i }`, the same x: a wall unit above
// a base unit, a shelf above a wall unit). Widths are the kits' own unless the
// recipe names one, so the set's span is worked out at insertion from the
// numbers the units will really have. Then what the units get together: end
// panels at the run's two ends, one top over the floor units (its thickness
// the record's own, F17), a rail in a column, a height from the job's type.
//
// Pure data and its pure readings. The store inserts (`insertSet`).

/** The five, in the order `engine/projectTypes.js` lists their jobs. */
export const SHIPPED_SETS = [
  {
    id: 'set-media-wall',
    name: 'Media wall',
    projectType: 'media_wall',
    hint: 'Two tall columns, a wall unit hung low as the floating base, two shelves over it. '
      + 'The cable hole is a circle cut in the base\'s back (the part editor\'s circle). LED as the room\'s own law.',
    units: [
      { type: 'BUDTALL', at: 'next' },
      {
        type: 'WUD', at: 'next', params: { width: 1200, mount_height: 300 },
      },
      {
        type: 'FREE_PANEL',
        at: { over: 1 },
        params: {
          width: 1200, panel_facing: 'along', panel_tilt_deg: 90, panel_width: 300, mount_height: 1200,
        },
      },
      {
        type: 'FREE_PANEL',
        at: { over: 1 },
        params: {
          width: 1200, panel_facing: 'along', panel_tilt_deg: 90, panel_width: 300, mount_height: 1600,
        },
      },
      { type: 'BUDTALL', at: { after: 1 } },
    ],
  },
  {
    id: 'set-sideboard',
    name: 'Sideboard',
    projectType: 'sideboard',
    hint: 'A door unit, a drawer unit and a door unit, end panels at both ends, a 25 mm top over the three.',
    units: [
      { type: 'BUD', at: 'next' },
      { type: 'BUDR', at: 'next' },
      { type: 'BUD', at: 'next' },
    ],
    endPanels: true,
    top: { units: [0, 1, 2], thickness: 25 },
  },
  {
    id: 'set-vanity',
    name: 'Vanity',
    projectType: 'vanity',
    hint: 'A sink unit at the vanity height, a wall unit hung over it, a top with the basin cut-out.',
    units: [
      { type: 'SINK', at: 'next', heightOf: 'vanity' },
      { type: 'WUD', at: { over: 0 } },
    ],
    top: { units: [0], single: true },
  },
  {
    id: 'set-utility',
    name: 'Utility',
    projectType: 'utility',
    hint: 'A tall unit, the washer behind an appliance front, the washer and dryer tower, a door unit.',
    units: [
      { type: 'BUDTALL', at: 'next' },
      { type: 'DW_PANEL', at: 'next' },
      { type: 'APPLIANCE_TALL2', at: 'next' },
      { type: 'BUD', at: 'next' },
    ],
  },
  {
    id: 'set-hallway',
    name: 'Hallway',
    projectType: 'hallway',
    hint: 'A low unit with a 25 mm top as the shoe bench, an open wardrobe with a rail as the coat run, a tall unit.',
    units: [
      { type: 'LOW_CABINET', at: 'next' },
      { type: 'WARDROBE', at: 'next', rail: true },
      { type: 'BUDTALL', at: 'next' },
    ],
    top: { units: [0], thickness: 25, single: true },
  },
];

/** A shipped set by id, or null. */
export function shippedSet(id) {
  return SHIPPED_SETS.find((s) => s.id === id) || null;
}

/** The set a job type offers first, or null. */
export function setForProjectType(typeId) {
  return SHIPPED_SETS.find((s) => s.projectType === typeId) || null;
}

/**
 * A set as the inserter reads it, from a shipped recipe or a saved row
 * (`lib/templates.js`, `kind: 'set'`): the units with their params and where
 * each stands, and what they get together. Null when there is nothing to put.
 */
export function setRecipe(row) {
  const units = (row?.units || []).filter((u) => u && u.type);
  if (!units.length) return null;
  return {
    id: row.id || null,
    name: String(row.name || 'Set'),
    units: units.map((u) => ({
      type: u.type,
      params: u.params ? JSON.parse(JSON.stringify(u.params)) : null,
      at: u.at || 'next',
      heightOf: u.heightOf || null,
      rail: u.rail === true,
    })),
    endPanels: row.endPanels === true,
    top: row.top && Array.isArray(row.top.units) ? { ...row.top } : null,
  };
}

/**
 * Where each of a set's units stands, from the left edge of the set, given the
 * width each will really have (`widthOf(i)`). `next` (or `{ gap }`) stands
 * that far from the last unit laid along the run; `{ over: i }` takes unit
 * i's x (plus its own `dx`); `{ after: i }` butts unit i. `butts[i]` is the
 * unit a butted one goes in beside (the run's own grammar, panels and all),
 * or null when it is placed at its x.
 *
 * @returns {{ xs:number[], butts:(number|null)[], span:number }}
 */
export function setLayout(units, widthOf) {
  const xs = [];
  const butts = [];
  let cursor = 0;
  let last = null;
  const wOf = (i) => Number(widthOf(i)) || 0;
  units.forEach((u, i) => {
    const at = u.at || 'next';
    if (at !== 'next' && Number.isInteger(at.over)) {
      xs.push((xs[at.over] ?? 0) + (Number(at.dx) || 0));
      butts.push(null);
      return;
    }
    if (at !== 'next' && Number.isInteger(at.after)) {
      const x = (xs[at.after] ?? 0) + wOf(at.after);
      xs.push(x);
      butts.push(at.after);
      cursor = Math.max(cursor, x + wOf(i));
      last = i;
      return;
    }
    const gap = at === 'next' ? 0 : Math.max(0, Number(at.gap) || 0);
    xs.push(cursor + (last == null ? 0 : gap));
    butts.push(last != null && gap === 0 ? last : null);
    cursor = xs[i] + wOf(i);
    last = i;
  });
  const span = units.length ? Math.max(0, ...units.map((_, i) => xs[i] + wOf(i))) : 0;
  return { xs, butts, span };
}

/** Does a set stand at ONE level (every unit on the floor, or every one hung)? */
export function setIsOneLevel(units, mountOf) {
  const levels = new Set((units || []).map((u) => mountOf(u.type)));
  return levels.size === 1 && (units || []).every((u) => !u.at || u.at === 'next' || u.at.gap != null);
}
