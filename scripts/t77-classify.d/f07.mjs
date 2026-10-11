// ─── T77 · F7 · WHAT THE WALK FOUND ────────────────────────────────────────
//
// CLAUDE.md T77 F7: *"The walk, real mouse, PRO and retail"*. The walk found
// three things in the engine and lib, each fixed where it lives. Two hang on
// an Ornate recipe (`ornateRecipe`, named in scripts/t77-classify.mjs), the
// L's on any decoration recipe (`frontDecoration`); no old golden carries
// either. This fragment lands in its own F's commit, so it names
// no COMMIT and is asked at file level. Merged by `scripts/t77-classify.mjs`.

export const LICENSED = {
  'src/engine/cabinet.js': {
    why: 'F7 · the L block no longer carries the virtual arm parent\'s DECORATION findings (problems and '
      + 'advisories) over to the L: the L\'s own decoration pass decorates the leaf again and says them once (the '
      + 'walk found each said twice on the L\'s panel, T76\'s A as much as Ornate). Every other finding of the '
      + 'parent is carried as before; a leaf with no decoration carries everything as before',
    gates: ['frontDecoration'],
  },
  'src/lib/cncExport.js': {
    why: 'F7 · `withReferenceReadiness` counts a READINESS line only for a leaf whose relief model (its STL) is in '
      + 'the package: a refused relief (a 12 mm board) shipped only its invalid-reference JSON and was still '
      + 'listed. A file writer, not a cut',
    gates: ['ornateRecipe'],
  },
  'src/engine/ornateFront.js': {
    why: 'F7 · `ornamentSurface` is asked as soon as the variant is known, so a relief refused further down (a '
      + 'board too thin, radii that do not fit) still names its ornament on the record and in the cut list '
      + 'sentence; the surface of a relief that builds is the same',
    gates: ['ornateRecipe'],
  },
};
