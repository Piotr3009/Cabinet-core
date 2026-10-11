// Proposed numbers from Piotr's 600 × 800 concept board, 10 October 2026.
// These are profile seeds, not a measured cutter catalogue or production recipe.
// profile.js imports this object into front.decoration; engines read the profile.

// T77 · each number says whose it is (CLAUDE.md T77, THE NUMBERS PROPOSED):
// the owner's board of 10.10.2026, or GPT's proposal for the owner to confirm.
const proposal = {
  boardMm: 18,                  // owner's board: the board OF THE DRAWING, not a demand (T77 F4)
  referenceWidthMm: 600,        // owner's board
  referenceHeightMm: 800,       // owner's board
  outerFrameMm: 60,             // owner's board
  innerFrameMm: 60,             // owner's board
  innerRadiusMm: 150,           // owner's board (variants 1 and 4)
  secondaryRadiusMm: 3,         // T77 proposed, owner to confirm (GPT's small corners, R3)
  stepWidthsMm: [12, 8, 6, 4],  // owner's board
  stepDepthsMm: [3, 6, 9, 12],  // owner's board, absolute depths from the face
  cornerDepthMm: 3,             // T77 proposed, owner to confirm (GPT's ornament background, 3 down)
  ornamentReliefMm: 2.5,        // T77 proposed, owner to confirm (GPT's ornament, 2.5 up, under the face)
  ornamentScale: 1,             // GPT's: the ornament at the size it has on the board
  mirror: false,
};

export const ORNATE_PROFILE_DEFAULTS = Object.freeze(Object.fromEntries(
  [1, 2, 3, 4].map((variant) => [`ORNATE_A_${variant}`, Object.freeze({
    ...proposal,
    variant,
    ornament: variant !== 4,
    // Variant 2 is a true capsule: its semicircle follows the available width
    // (GPT's reading of the board; the rule is in ornateFront.js).
    // Variant 3's gentler diagonal corners are a proposed interpretation:
    // R110 and R18, T77 proposed, owner to confirm (GPT's).
    ...(variant === 3 ? { innerRadiusMm: 110, secondaryRadiusMm: 18 } : {}),
    stepWidthsMm: Object.freeze([...proposal.stepWidthsMm]),
    stepDepthsMm: Object.freeze([...proposal.stepDepthsMm]),
  })]),
));
