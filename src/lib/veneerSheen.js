// ─── WHICH PIECES A VENEER IS (turn 49, CLAUDE.md F9) ───────────────────────
//
// The owner, 25.08.2026: *"suwak powinien dzialac tylko na spray i veneer, nie
// na laminat — na laminat zostaw jak jest."*
//
// `3d/materials.js` widens the sheen's gate to a finish of kind `veneer`, and
// that is the whole answer for a CARCASS: a carcass veneer is picked from the
// timber list and comes back as `veneer:oak-natural`, which says what it is.
//
// A FRONT does not. Turn 20 (F12.3) settled that *"a FRONT's veneer picks from
// the 85-decor catalogue"* — it borrows an EGGER scan because a veneer has no
// picture of its own yet — so a veneered door is stored as `decor:H1180_37` and
// is, at the finish level, indistinguishable from a laminate faced in the same
// decor. Gate the slider on the finish alone and the commonest veneer in the
// shop — a veneered door — would go on ignoring it, which is the half-fix this
// module exists to prevent.
//
// The app is not short of the fact. The front TYPE carries `source: 'veneer'`,
// which is what the joiner pressed, and the engine already answers "which type
// does this panel wear" — `materialSlotOf`, a pure function it has exported
// since turn 16. So this module asks that question and reads the source off the
// answer. Two engine READERS, called; `src/engine/**` is not edited, which iron
// rule 2 requires of every line of this turn.
//
// It is a lib and not a component for the usual reason: a node test can ask it,
// and a `.jsx` cannot be imported by one.

import { migrateDesign } from '../engine/design.js';
import { materialSlotOf } from '../engine/materials.js';

/** The one source word that means "timber face under lacquer". */
export const VENEER_SOURCE = 'veneer';

/** Is this the veneer source? Asked in one place so the string is written once. */
export function isVeneerSource(src) {
  return String(src ?? '') === VENEER_SOURCE;
}

/**
 * What a material SLOT (`{ kind, typeId }`, the engine's own answer) is made of.
 *
 * Null for a slot nobody has answered — a run piece on its own board, an
 * override from an older project — which reads as "not a veneer", the safe
 * direction: a piece we cannot name does not get the slider.
 */
export function sourceOfSlot(designIn, slot) {
  if (!designIn || !slot?.typeId) return null;
  const d = migrateDesign(designIn);
  const list = slot.kind === 'front' ? d.fronts.types : d.carcass.types;
  const type = (list || []).find((t) => t.id === slot.typeId) || null;
  return type?.source ?? null;
}

/**
 * Is THIS panel cut from a veneered board?
 *
 * `materialSlotOf` is the engine's own routing — a door, an end panel and an
 * infill are all `front`, a shelf switched to Front 2 wears Front 2 — so this
 * cannot disagree with the finish the same panel is painted with.
 */
export function panelIsVeneered(panel, unit, designIn) {
  if (!designIn) return false;
  return isVeneerSource(sourceOfSlot(designIn, materialSlotOf(panel, unit, designIn)));
}

/**
 * …and the FRONTS as a whole — for the pieces that are not cut panels at all.
 *
 * A cornice is bought moulding: it has no `role`, no `material_role` and no row
 * in the cut list, and it is finished with the doors. Front type 1 is the
 * project's front (engine/design.js says so for the colour and the facing
 * alike), so front type 1 is what it is finished like.
 */
export function frontsAreVeneered(designIn) {
  if (!designIn) return false;
  const d = migrateDesign(designIn);
  return isVeneerSource(d.fronts.types[0]?.source);
}
