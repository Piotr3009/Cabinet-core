// ─── T77 · F6 · THE ORNAMENT IS A PLACEHOLDER UNTIL THE OWNER'S MODEL ARRIVES
//
// CLAUDE.md T77 F6: *"The ornament enters the engine through ONE function
// (`ornamentSurface(variant, config, profile)` in `engine/ornateFront.js`, as
// GPT has it or refactored to it in one step). Beside it a slot the owner
// fills ... and the profile key `front.decoration.ornateReference.ornamentModel
// = null`. While it is null, the procedural ornament stands, labelled in the
// BOM sentence and the JSON as `ornament: 'procedural placeholder'`."*  Every
// delta below is reached only through an Ornate recipe (`ornateRecipe`), which
// no golden carries. Merged by `scripts/t77-classify.mjs` (T76's shape).

export const COMMIT = 'db84116a41aa133aafe00de0075f0e08efeeb865';

export const LICENSED = {
  'src/engine/ornateFront.js': {
    why: 'F6 · `ornamentSurface(variant, config, profile)`, the one road GPT\'s MOTIF reaches `buildOrnateFront` by: '
      + 'the procedural placeholder while the slot is null, nothing on the Plain variant, a named model refused in '
      + 'words (ORNATE_ORNAMENT_MODEL); the record carries `ornament` (its label). Reached only through an Ornate recipe',
    gates: ['ornateRecipe'],
  },
  'src/engine/profile.js': {
    why: 'F6 · `front.decoration.ornateReference.ornamentModel = null`, the owner\'s slot. Read only by '
      + '`ornamentSurface`',
    gates: ['ornateRecipe'],
  },
  'src/engine/frontDecorationBom.js': {
    why: 'F6 · the Ornate sentence names its ornament ("ORNATE_A_1 · Slab; relief proposed, not production approved; '
      + 'ornament: procedural placeholder"), GPT\'s " - " separator now the column\'s own " · ". Only for a record with '
      + '`referenceOnly` (an Ornate relief). A list, not a cut',
    gates: ['ornateRecipe'],
  },
  'src/engine/cnc/ornateExport.js': {
    why: 'F6 · the operations JSON carries `ornament` (\'procedural placeholder\', \'none\' on ORNATE_A_4). Written '
      + 'only for an Ornate leaf',
    gates: ['ornateRecipe'],
  },
};
