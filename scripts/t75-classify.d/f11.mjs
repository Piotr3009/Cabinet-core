// T75 F11 · ONE WORKTOP OVER THE WHOLE. CLAUDE.md T75 F11. The worktop is the
// design layer: computeCabinet never reads it (test/turn30-f8-worktop.test.js).

export const LICENSED = {
  'src/engine/worktop.js': {
    why: 'F11 · a selection on one island asks for the ISLAND\'s slab (`worktopEligible`); `worktopsFor` '
      + 'resolves an island record as ONE slab: the bounding rectangle of everything on the island plus 20 on '
      + 'every face plus the per-face `extend` (`islandExtend`), drawn as an outline in face A\'s frame, '
      + 'every face\'s cut-outs carried into it',
    gates: [],
  },
  'src/engine/design.js': {
    why: 'F11 · `migrateDesign` keeps an island\'s worktop record (`island`, `extend` per face)',
    gates: [],
  },
};
