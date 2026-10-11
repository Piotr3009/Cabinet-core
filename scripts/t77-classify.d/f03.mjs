// ─── T77 · F3 · THE REFERENCE FILES SHRINK TO WHAT A BROWSER CAN SHIP ──────
//
// CLAUDE.md T77 F3: *"GPT's STL for one 600 x 800 leaf is 12 to 36 MB (ASCII
// STL at a 1 mm relief sample). A kitchen of eight ornate leaves would hand
// the browser a quarter of a gigabyte. Fix, with no change to the geometry the
// 3D shows."*  Every delta below is reached only through an Ornate recipe
// (`ornateRecipe`), which no golden carries. Merged by
// `scripts/t77-classify.mjs` (T76's shape).

export const COMMIT = 'e8ecf0354596985561114090f73e360438a16cc1';

export const LICENSED = {
  'src/engine/ornateFront.js': {
    why: 'F3 · RELIEF_SAMPLE_MM, SURFACE_CHORD_MM and CHORD_ERROR_MM deleted: `ornateSampling(profile, level)` reads '
      + '`front.decoration.ornateSolid` for the record (level \'solid\', GPT\'s numbers: what the 3D, the drawings and the '
      + 'CNC preview read) and `ornateReference` for the two export levels, built lean (a flat straight-side column '
      + 'left out); ORNATE_SAMPLING and ORNATE_COMPLEXITY refuse in words. Reached only through an Ornate recipe',
    gates: ['ornateRecipe'],
  },
  'src/engine/cnc/ornateExport.js': {
    why: 'F3 · BINARY STL (`ornateSurfaceStl`, 80 byte header, uint32 count, 50 bytes a triangle; `readBinaryStl`), the '
      + 'two levels (`ORNATE_REFERENCE_LEVELS`, `ornateLevelSurface` at the level\'s numbers off the profile), number '
      + 'arrays on one line in the JSON, `referenceLevel` and `bytes` on every file record. Written only for an Ornate leaf',
    gates: ['ornateRecipe'],
  },
  'src/engine/profile.js': {
    why: 'F3 · `front.decoration.ornateSolid` (1.0 / 2.0 / 0.06, GPT\'s, the 3D\'s own) and `ornateReference` (2.0 / '
      + '2.0 / 0.06 / 1.0 and leafTargetBytes 4000000, "T77 proposed, owner to confirm"). Read only by ornateFront.js '
      + 'and ornateExport.js; no style is named by either key, so no recipe of the six reads them',
    gates: ['ornateRecipe'],
  },
  'src/lib/cncExport.js': {
    why: 'F3 · `referenceLevel` (default \'reference\') on the three ZIP routes, handed with the profile to '
      + '`buildOrnateReferenceFiles`; nothing else reads it. A file writer, not a cut',
    gates: ['ornateRecipe'],
  },
};
