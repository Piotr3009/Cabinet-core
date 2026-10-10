// ─── T76 · F3 · KASACJA: THE SLIM SHAKER GOES ──────────────────────────────
//
// The owner, 10.10.2026: *"a po co mi slim shaker jak mamy ustawianie shakera
// po wyborze shaker, bez sensu."*  `SS` is deleted from the three engine files
// GPT's patch put it in. Merged by `scripts/t76-classify.mjs` (T75's shape).

export const LICENSED = {
  'src/engine/design.js': {
    why: 'F3 · `SS` deleted from FRONT_STYLE_OPTIONS, a two-line tombstone with the owner\'s words. The design layer',
    gates: [],
  },
  'src/engine/frontDecoration.js': {
    why: 'F3 · SS\'s recipe (frame 25, recess 2) deleted; no golden carries a recipe',
    gates: ['frontDecoration'],
  },
  'src/engine/frontStyleArt.js': {
    why: 'F3 · SS\'s drawing deleted (FROZEN 5 lifts the FRONTS BOUNDARY for this file tonight). Pictures, not a cut',
    gates: [],
  },
};
