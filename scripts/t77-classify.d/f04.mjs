// ─── T77 · F4 · THE BOARD: 18 ON THE BOARD, 25 IN THE WORKSHOP ─────────────
//
// CLAUDE.md T77 F4: *"the Check speaks only when the assigned front is
// THINNER than the deepest step plus the 3 mm skin (15 mm for the default
// recipe), in words, naming the leaf and the number; a thicker board is
// silently fine. This is T76 F4's rule for A/AH applied the same way; one
// function serves both."*  The one function is `engine/frontBoard.js`: every
// decorated front reaches it (`validateFrontDecoration`'s skin rule and
// `boardRefusal`), so it hangs on `frontDecoration`, and T76's decoration
// records, which open that gate by design, are its proof (re-made byte for
// byte). The Ornate-only deltas hang on `ornateRecipe`. Merged by
// `scripts/t77-classify.mjs` (T76's shape).

export const COMMIT = '5961db1c4776e85d7bde7834eec73f1d8d9e0bb1';

export const LICENSED = {
  'src/engine/frontBoard.js': {
    why: 'F4 · NEW: THE one board rule. `minSkinOf` and `skinShort` moved here from frontDecoration.js unchanged; '
      + '`deepestCutMm` reads either family (an Ornate relief\'s deepest step or corner background; a recess plus its '
      + 'groove); `boardShortfall(style, board, recipe, profile)` says a too-thin board in words '
      + '(FRONT_DECORATION_BOARD_TOO_THIN, needMm, haveMm) and is silent above it. On the cut path through '
      + 'frontDecoration.js and ornateFront.js, behind `params.front_decoration`',
    gates: ['frontDecoration'],
  },
  'src/engine/frontDecoration.js': {
    why: 'F4 · `minSkinOf` and `skinShort` imported from frontBoard.js (the validator\'s skin rule, every decorated '
      + 'front); `boardRefusal` (T76 F7, retail\'s question) keeps its name and sentence and asks `boardShortfall`, '
      + 'with a leaf\'s own recipe where a caller has one; GPT\'s Ornate branch of it gone into the one function',
    gates: ['frontDecoration'],
  },
  'src/engine/ornateFront.js': {
    why: 'F4 · GPT\'s second copy of the rule (ORNATE_SKIN, its own sentence) replaced by `boardShortfall` on the '
      + 'leaf\'s ACTUAL board, never `boardMm`; the refusal carries needMm and haveMm; the always-on advisory names no '
      + 'board. Reached only through an Ornate recipe',
    gates: ['ornateRecipe'],
  },
  'src/engine/cnc/frontOperations.js': {
    why: 'F4 · `frontDecorationProblems` no longer pushes ORNATE_REFERENCE_MESSAGE for every Ornate leaf: a relief '
      + 'that built holds nothing (its slab is cut, its relief rides the reference files); a refused one is said in its '
      + 'own words and holds its leaf. `isOrnateReference` asks it, so only an Ornate leaf is answered differently',
    gates: ['ornateRecipe'],
  },
  'src/engine/cnc/ornateExport.js': {
    why: 'F4 · the operations JSON prints the leaf\'s ACTUAL board (`thicknessMm`) and leaves the recipe\'s `boardMm` '
      + 'out of the parameters it prints. Written only for an Ornate leaf',
    gates: ['ornateRecipe'],
  },
};
