// T75 F20 · MULTI-UNIT SETS, AND FIVE OF THEM SHIPPED AS DATA. *"A set is a
// RECIPE, not a group: after insertion the units are ordinary units."*  No new
// kit and no cut: a set places kits that exist through the ordinary add path,
// so no golden (a bare `computeCabinet` of one default kit) can reach any of it.

export const LICENSED = {
  'src/engine/sets.js': {
    why: 'F20 · NEW: the five shipped recipes (Media wall, Sideboard, Vanity, Utility, Hallway) as data, '
      + '`setRecipe`, `setLayout`, `setIsOneLevel`. Pure data and its readings; the store inserts. Not a cut',
    gates: [],
  },
  'src/engine/collision.js': {
    why: 'F20 · `slotTakes`: does a unit fit with its left edge EXACTLY at x (the same free stretches '
      + '`freeSlotOnWall` reads)? A placement question, not a cut',
    gates: [],
  },
  'src/engine/worktop.js': {
    why: 'F20 · a set\'s record of kind `top` lays a slab on ONE cabinet (the Vanity\'s sink, the Hallway\'s '
      + 'shoe bench); `worktopEligible(..., { single })`. The worktop layer: no cabinet\'s panels move',
    gates: [],
  },
  'src/engine/design.js': {
    why: 'F20 · `migrateDesign` keeps a worktop record of kind `top` with one unit. A design record, not a cut',
    gates: [],
  },
  'src/engine/types.js': {
    why: 'F20 · `UNIT_CATEGORIES`: `media` becomes the sets shelf (`sets: true`, label Sets); the `soon` '
      + 'flag deleted. A library category, no kit touched',
    gates: [],
  },
  'src/lib/templates.js': {
    why: 'F20 · the shelf grows `kind: \'set\'` rows: `isSetRow`, `setFrom` (left to right, the gaps, a hung '
      + 'unit OVER its unit, positions and cross-unit ids stripped), `saveSet`; `read` admits a set row. The '
      + 'saved-sets shelf, not a cut',
    gates: [],
  },
  'src/engine/projectTypes.js': {
    why: 'F20 · the five job types carry `set:` their shipped set\'s id. A job type, not a cut',
    gates: [],
  },
};
