// ─── T77 F4 · ONE BOARD RULE FOR EVERY DECORATED FRONT ─────────────────────
//
// CLAUDE.md T77 F4: *"the Check speaks only when the assigned front is
// THINNER than the deepest step plus the 3 mm skin (15 mm for the default
// recipe), in words, naming the leaf and the number; a thicker board is
// silently fine. This is T76 F4's rule for A/AH applied the same way; one
// function serves both."*
//
// T76 put the rule in `engine/frontDecoration.js` (`boardRefusal`, asked by
// retail before a style is offered) and GPT's Ornate engine carried a second
// copy of it with its own words (`ORNATE_SKIN`). One law, one path: the rule
// lives here, `frontDecoration.js` and `ornateFront.js` both ask it, and
// neither imports the other to do so. `boardRefusal` keeps its name and its
// sentence; the recipe it measures is the one handed in (a leaf's own saved
// numbers), or the profile's.

import { getCabinetProfile } from './profile.js';

const EPS = 1e-7;
const round = (v) => Math.round(v * 1e7) / 1e7;

/** The least board left under and between cuts: the profile's number (the
 *  active workshop profile's when the one handed in does not name it). */
export function minSkinOf(profile) {
  return Number(profile?.front?.decorationMinSkinMm ?? getCabinetProfile().front.decorationMinSkinMm);
}

/** THE skin rule, one comparison for every caller: a cut `depth` into a
 *  `board` that leaves less than the profile's skin is refused. */
export function skinShort(board, depth, profile) {
  return board - depth < minSkinOf(profile) - EPS;
}

/**
 * The deepest cut a recipe makes from the face. An Ornate relief: its deepest
 * profile step, or its corner background if that is deeper (absolute depths,
 * never summed). Every other recipe: its recess and the groove below it (GF),
 * or its groove alone (G, FL); applied strips cut nothing.
 */
export function deepestCutMm(recipe) {
  if (Array.isArray(recipe?.stepDepthsMm)) {
    return Math.max(Number(recipe.cornerDepthMm) || 0, ...recipe.stepDepthsMm.map((d) => Number(d) || 0));
  }
  // T82 F15 · a reeded Fluted front cuts its valleys half the reed's diameter deep.
  if (recipe?.fluteProfile === 'reed') return (Number(recipe.recessDepthMm) || 0) + (Number(recipe.reedDiameterMm) || 0) / 2;
  return (Number(recipe?.recessDepthMm) || 0) + (Number(recipe?.grooveDepthMm) || 0);
}

/**
 * THE one function: a board too thin for a recipe, in words, or null. Silent
 * for a board that leaves the skin (any board thicker than the deepest cut
 * plus the skin, whatever board the recipe was drawn for).
 *
 * @returns {{code, message, needMm, haveMm}|null}
 */
export function boardShortfall(style, thicknessMm, recipe, profile = getCabinetProfile()) {
  if (!recipe) return null;
  const deepest = deepestCutMm(recipe);
  const board = Number(thicknessMm);
  if (!(deepest > 0) || !Number.isFinite(board) || !skinShort(board, deepest, profile)) return null;
  const needMm = round(deepest + minSkinOf(profile));
  return {
    code: 'FRONT_DECORATION_BOARD_TOO_THIN',
    message: `${style} cuts ${round(deepest)} mm into the face and must leave `
      + `${minSkinOf(profile)} mm under it: it needs a board of at least ${needMm} mm, and this one is ${round(board)} mm.`,
    needMm,
    haveMm: round(board),
  };
}
