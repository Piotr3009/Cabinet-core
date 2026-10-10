// ─── T76 · F4 · THE RECIPES MOVE INTO THE PROFILE, THE OWNER'S NUMBERS FIRST
//
// CLAUDE.md T76 F4: *"GPT put the recipe defaults in code (`RECIPES` ...).
// The house law: numbers live in `engine/profile.js`."*  Every delta below
// hangs on GPT's opt-in (`params.front_decoration`), which no golden carries,
// or reads a result and cuts nothing. Merged by `scripts/t76-classify.mjs`.

export const LICENSED = {
  'src/engine/profile.js': {
    why: 'F4 · NEW block `front.decoration` (one recipe per decorative style: the owner\'s numbers of 31.08.2026 '
      + 'first, GPT\'s marked "T76 proposed, owner to confirm") and `front.decorationMinSkinMm`, with their migrate '
      + 'line. Read only by frontDecoration.js, behind `params.front_decoration`; the six read none of it',
    gates: ['frontDecoration'],
  },
  'src/engine/frontDecoration.js': {
    why: 'F4 · RECIPES and MIN_SKIN deleted: recipes off the profile handed in, else getCabinetProfile(); the V '
      + 'groove (`vgroove`, width and depth, no angle assumed), the semicircular arch and its refusal in words, the AM '
      + 'mitre off the profile, the board advisory (`advisories`)',
    gates: ['frontDecoration', 'appliedStrips'],
  },
  'src/engine/cabinet.js': {
    why: 'F4 · the decoration\'s advisories ride the warnings (Check #32 says them); nothing is cut differently',
    gates: ['frontDecoration'],
  },
  'src/engine/checks.js': {
    why: 'F4 · Check #32, yellow, "Front thinner than its decoration\'s board", read off the engine\'s '
      + 'FRONT_DECORATION_BOARD. Reads a result; cuts nothing',
    gates: [],
  },
  'src/engine/cnc/frontOperations.js': {
    why: 'F4 · the `vgroove` operation: validated, exported as its open centre line, named in the layer table and in '
      + 'front-operations.json (tool kind v, width, depth, "groove centre line")',
    gates: ['frontDecoration'],
  },
};
