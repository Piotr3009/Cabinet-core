// Proposed numbers from Piotr's 600 × 800 concept board, 10 October 2026.
// These are profile seeds, not a measured cutter catalogue or production recipe.
// profile.js imports this object into front.decoration; engines read the profile.

const proposal = {
  boardMm: 18,
  referenceWidthMm: 600,
  referenceHeightMm: 800,
  outerFrameMm: 60,
  innerFrameMm: 60,
  innerRadiusMm: 150,
  secondaryRadiusMm: 3,
  stepWidthsMm: [12, 8, 6, 4],
  stepDepthsMm: [3, 6, 9, 12],
  cornerDepthMm: 3,
  ornamentReliefMm: 2.5,
  ornamentScale: 1,
  mirror: false,
};

export const ORNATE_PROFILE_DEFAULTS = Object.freeze(Object.fromEntries(
  [1, 2, 3, 4].map((variant) => [`ORNATE_A_${variant}`, Object.freeze({
    ...proposal,
    variant,
    ornament: variant !== 4,
    // Variant 2 is a true capsule: its semicircle follows the available width.
    // Variant 3's gentler diagonal corners are a proposed interpretation.
    ...(variant === 3 ? { innerRadiusMm: 110, secondaryRadiusMm: 18 } : {}),
    stepWidthsMm: Object.freeze([...proposal.stepWidthsMm]),
    stepDepthsMm: Object.freeze([...proposal.stepDepthsMm]),
  })]),
));
