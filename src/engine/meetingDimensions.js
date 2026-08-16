// ─── THE MEETING LINE, MEASURED ONCE (turn 34, CLAUDE.md F5) ────────────────
//
// The owner, 16.08.2026: *"czasami pokazuje 2 wymiary 1.5 i 1.5, a mi zależało
// żeby zawsze pokazywało jeden — przy dojechaniu do szafki żeby się sumowały i
// pokazywało 3"*.
//
// And, asked what should happen when the cabinets are NOT touching, his own
// ruling in the same breath: *"oczywiście, że 1.5, 100 i 1.5 — bo tak jest w
// rzeczywistości; dopiero jak dojeżdżają do siebie, to 3."*
//
// So there are two pictures and the difference between them is a FACT about
// the carcasses, not a preference:
//
//   TOUCHING  the two per-unit edge figures at the meeting line are
//             SUPPRESSED and one leaf-to-leaf dimension is drawn in their
//             place. A healthy joint reads 3.00 — the 1.5 each kit leaves,
//             added up, which is the number the client sees.
//   APART     three figures, and they are all true: own 1.5 · the carcass
//             distance · own 1.5.
//
// ─── THE NUMBERS ARE NOT RE-DERIVED HERE ────────────────────────────────────
//
// Everything below is read off `frontClearances()` — the T31 matrix, which
// already knows what stands beside every front edge, how far away it is
// (`gapMm`, rule 14: front↔neighbour) and how far that front stands inside its
// own carcass end (`haveClearanceMm`). The CARCASS distance is then simple
// arithmetic on those three, and cannot disagree with the matrix that healed
// them:
//
//     carcassGap = leafGap − ownClearanceLeft − ownClearanceRight
//
// UnitView's inside-one-cabinet dimensions (turn 25) are untouched everywhere
// else; only the pair at the meeting line merges, and only the `to-side`
// figures facing that line are suppressed. The red <3 clash overlay
// (`frontGapClash.js`) keeps its own job — this is a DIMENSION, not a verdict.
//
// Pure: reads clearances, answers rows. No React, no store, no three.js.

import { NEIGHBOUR } from './frontClearance.js';

const round2 = (v) => Math.round((Number(v) || 0) * 100) / 100;

/**
 * How near two carcasses may stand and still count as TOUCHING.
 *
 * `carcassGaps()`'s own tolerance, 0.5 mm — the same number, so a pair the
 * Check calls "touching" and a pair this draws one figure for are the same
 * pair. Not a knob: two answers to one question is how the two drift.
 */
export const TOUCH_TOLERANCE_MM = 0.5;

/**
 * The scene-level dimensions at every front-to-front meeting line.
 *
 * @param {Array} clearances  `frontClearances()` output
 * @returns {Array<{
 *   key:string, wall:number, atX:number,
 *   touching:boolean,
 *   rows: Array<{kind:'leaf-to-leaf'|'own-clearance'|'carcass-gap', mm:number,
 *                unitId:string|null, panelId:string|null, side:'left'|'right'|null}>,
 *   suppress: Array<{unitId:string, panelId:string, side:'left'|'right'}>,
 *   mm:number
 * }>}
 */
export function meetingDimensions(clearances) {
  const byKey = new Map();

  for (const front of clearances || []) {
    if (front.appliance) continue;
    for (const side of ['left', 'right']) {
      const edge = front.edges?.[side];
      if (!edge || edge.parked) continue;
      // A MEETING LINE is front-to-front and nothing else. A panel, an infill,
      // a wall and an appliance are each one figure already and always were.
      if (edge.kind !== NEIGHBOUR.FRONT) continue;
      const other = edge.of;
      if (!other?.panelId || !other?.unitId) continue;
      if (edge.gapMm == null) continue;

      // The pair, named the same way from either end, so it is measured once.
      const key = `meet|${[
        `${front.unitId}:${front.panelId}`, `${other.unitId}:${other.panelId}`,
      ].sort().join('|')}`;
      if (byKey.has(key)) continue;

      // Whose edge faces whom. `side` is THIS front's edge; the other front
      // meets it with the opposite one.
      const mine = { unitId: front.unitId, panelId: front.panelId, side };
      const theirs = {
        unitId: other.unitId,
        panelId: other.panelId,
        side: side === 'left' ? 'right' : 'left',
      };

      const ownMine = Number(edge.haveClearanceMm) || 0;
      // The far side's own clearance, off its OWN row in the matrix — never
      // assumed to be the same number, because a healed edge may not be.
      const theirRow = (clearances || []).find((r) => r.unitId === theirs.unitId
        && r.panelId === theirs.panelId);
      const ownTheirs = Number(theirRow?.edges?.[theirs.side]?.haveClearanceMm) || 0;

      const leafGap = round2(edge.gapMm);
      const carcassGap = round2(leafGap - ownMine - ownTheirs);
      const touching = Math.abs(carcassGap) <= TOUCH_TOLERANCE_MM;

      // Left-to-right, so the three-figure case reads in the order a joiner
      // would call it out.
      const [a, b] = mine.side === 'right' ? [mine, theirs] : [theirs, mine];
      const ownA = a === mine ? ownMine : ownTheirs;
      const ownB = b === mine ? ownMine : ownTheirs;

      byKey.set(key, {
        key,
        wall: front.wall,
        atX: front.atX ?? null,
        touching,
        mm: touching ? leafGap : carcassGap,
        leafGapMm: leafGap,
        carcassGapMm: carcassGap,
        rows: touching
          // "przy dojechaniu do szafki żeby się sumowały i pokazywało 3"
          ? [{
            kind: 'leaf-to-leaf', mm: leafGap, unitId: null, panelId: null, side: null,
          }]
          // "oczywiście, że 1.5, 100 i 1.5 — bo tak jest w rzeczywistości"
          : [
            {
              kind: 'own-clearance', mm: round2(ownA), unitId: a.unitId, panelId: a.panelId, side: a.side,
            },
            {
              kind: 'carcass-gap', mm: carcassGap, unitId: null, panelId: null, side: null,
            },
            {
              kind: 'own-clearance', mm: round2(ownB), unitId: b.unitId, panelId: b.panelId, side: b.side,
            },
          ],
        // ONLY at a touch: the two per-unit edge figures at this line would
        // say 1.5 and 1.5 where the client sees one 3, so they stand down.
        // Apart, they are the truth and they stay.
        suppress: touching ? [a, b] : [],
      });
    }
  }

  return [...byKey.values()].sort((a, b) => (a.wall - b.wall) || ((a.atX || 0) - (b.atX || 0)));
}

/**
 * The per-unit `to-side` figures this scene must NOT draw, as a lookup the
 * view can ask one question of.
 *
 * `frontDimensions.frontGaps` names a `to-side` row by the front it touches
 * and the side of the CABINET it runs to: the LEFT figure has `b = leftMost`
 * and the RIGHT figure has `a = rightMost`. So the key is the panel and the
 * side of the front that faces the meeting line, which is exactly what
 * `suppress` carries.
 */
export function suppressedEdgeDims(meetings) {
  const out = new Set();
  for (const m of meetings || []) {
    for (const s of m.suppress) out.add(`${s.unitId}|${s.panelId}|${s.side}`);
  }
  return out;
}

/** Is THIS unit's `to-side` figure on this side suppressed by a meeting? */
export function isEdgeDimSuppressed(suppressed, unitId, panelId, side) {
  return suppressed instanceof Set
    && suppressed.has(`${unitId}|${panelId}|${side}`);
}
