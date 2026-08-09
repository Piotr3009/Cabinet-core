// ─── Partition fixing: the BISCUIT pattern (turn 13, CLAUDE.md F8 / #59) ────
//
// BLOCKERS #59 has been open since turn 11, when the vertical partition landed
// with no drilling at all: "it is screwed or pinned to the boards it stands
// between… its DRILLING is a later question and is written down as one." This
// is the owner's answer, given as workshop truth, and it is now the reference
// pattern for a butt joint in this app.
//
// ─── THE STANDARD SET ───
//
//   screw ⌀3 → 10 mm gap → biscuit mark 70 mm → 10 mm gap → screw ⌀3
//
// laid out ALONG the joint line, and the set STARTS no closer than 50 mm from
// the element's edge — never less.
//
// HOW THE CHAIN IS READ. The owner wrote a sequence of items and gaps, and it
// is read as exactly that: each item occupies its own length and each gap is
// CLEAR SPACE between two items. So a set is
//
//   3 (screw) + 10 + 70 (mark) + 10 + 3 (screw) = 96 mm
//
// with the screw CENTRES at +1.5 and +94.5 from the start of the set and the
// mark running from +13 to +83. Every one of those five numbers is a profile
// value, so a workshop that means the gaps to be centre-to-centre changes them
// rather than this file.
//
// ─── HOW MANY ───
//
// Width ≤ 700 → TWO sets, one at each end honouring the 50 mm rule. Wider → ONE
// more in the middle, three in total. "That is all", and it is: there is no
// pitch, no density, no per-metre rule to argue about later.
//
// ─── THE NO-SCREW SET ───
//
// A through-screw exists only where the RECEIVING FACE IS CONCEALED. A
// partition meeting the visible top of a fixed shelf must not be drilled
// through, so that joint gets the 70 mm mark alone — in the same positions, so
// the two kinds of joint set out identically and a joiner reads one pattern.
//
// ─── WHERE THE MACHINING GOES ───
//
// A butt joint has two halves and a 3-axis bed can only reach faces:
//
//   THE RECEIVING PANEL (a carcass top or bottom, or a fixed shelf) takes the
//   whole set on its face — the two ⌀3 through-screws, which pass through it
//   into the partition's edge, and the 70 mm mark between them.
//
//   THE PARTITION takes the MARK only, along its own end, set in from the end
//   edge. No screws: the screw comes through the other board into this one's
//   edge, so drilling it here would be drilling the same hole twice. The mark
//   is why the layer is called a mark and is cut with a dedicated in-and-out
//   program: it is the set-out transferred to the second half of the joint, so
//   the two pieces agree before anything is glued.
//
// Pure functions and pure data. No React, no store, no three.js.

/**
 * THE LAYER NAME. Exactly as CLAUDE.md writes it, and it is a hard contract in
 * the same way every other name in cnc/layers.js is: it is what the owner's
 * VCarve tool mapping matches on. It is not "tidied up", ever.
 */
export const BISCUIT_LAYER = 'BISCUIT_4MM';

/** The numbers, defensively read, so a partial profile cannot produce NaN. */
function settings(profile) {
  const B = profile?.biscuits || {};
  const num = (v, fallback) => (Number.isFinite(Number(v)) ? Number(v) : fallback);
  return {
    markLength: num(B.markLength, 70),
    gap: num(B.gap, 10),
    screwDiameter: num(B.screwDiameter, 3),
    edgeMin: num(B.edgeMin, 50),
    wideThreshold: num(B.wideThreshold, 700),
    markFromEnd: num(B.markFromEnd, 20),
    layer: B.layer || BISCUIT_LAYER,
    screwLayer: B.screwLayer || 'SCREWS_3MM',
    concealed: Array.isArray(B.concealedReceivers) ? B.concealedReceivers : ['TOP', 'BOTTOM'],
  };
}

/** How long one set is, end to end: screw + gap + mark + gap + screw. */
export function biscuitSetLength(profile) {
  const s = settings(profile);
  return s.screwDiameter * 2 + s.gap * 2 + s.markLength;
}

/**
 * How many sets a joint of this length takes.
 *
 * Two, or three when the element is wider than the threshold — and fewer only
 * when the arithmetic says they will not fit, which is the case the owner's
 * two-line rule does not cover and a total function has to. A count is never
 * bought by breaking the 50 mm rule: that one is "never less".
 *
 * @returns {number} 0, 1, 2 or 3
 */
export function biscuitSetCount(length, profile) {
  const s = settings(profile);
  const L = Math.max(0, Number(length) || 0);
  const set = biscuitSetLength(profile);
  const usable = L - s.edgeMin * 2;
  if (usable < set) return 0;
  const wanted = L > s.wideThreshold ? 3 : 2;
  // Sets may touch but never overlap. n sets need n × set inside the usable
  // band; below that, drop one and ask again.
  for (let n = wanted; n >= 1; n -= 1) {
    if (usable >= set * n) return n;
  }
  return 1;
}

/**
 * Where each set sits along the joint line, and what is in it.
 *
 * @param {object} args
 *   length    the joint line's length, in mm — for a partition, its DEPTH
 *   screws    false for the no-screw set: the mark alone, same positions
 *   profile
 * @returns {Array<{start:number, end:number, screws:number[], mark:{from:number,to:number}}>}
 *   `screws` are CENTRE positions along the line; `mark` is the 70 mm run.
 *   Both measured from the same datum as `length`.
 */
export function biscuitSets({ length, screws = true, profile }) {
  const s = settings(profile);
  const L = Math.max(0, Number(length) || 0);
  const set = biscuitSetLength(profile);
  const n = biscuitSetCount(L, profile);
  if (!n) return [];

  // The three anchors, in the order the owner describes them: one at each end
  // honouring the 50 mm minimum, and the middle one centred on the element.
  const first = s.edgeMin;
  const last = L - s.edgeMin - set;
  const middle = (L - set) / 2;
  const starts = n === 1 ? [middle] : (n === 2 ? [first, last] : [first, middle, last]);

  return starts.map((start) => ({
    start,
    end: start + set,
    // The chain: screw, gap, mark, gap, screw. A screw is a hole with a
    // diameter, so its CENTRE is half a diameter in from where it starts.
    screws: screws
      ? [start + s.screwDiameter / 2, start + set - s.screwDiameter / 2]
      : [],
    mark: {
      from: start + s.screwDiameter + s.gap,
      to: start + s.screwDiameter + s.gap + s.markLength,
    },
  }));
}

/**
 * May a through-screw be driven into this panel?
 *
 * "A through-screw exists only where the receiving face is concealed." The
 * carcass top and bottom are: the screw head goes under a worktop or into the
 * plinth void. A FIXED SHELF's faces are not — they are what you look at with
 * the doors open — so a partition landing on one gets the biscuit-only set,
 * which is the owner's own example.
 *
 * A LIST rather than a branch, in the profile, because the next kit that grows
 * a concealed receiver should be one entry and not a new `if`.
 */
export function receiverTakesScrews(part, profile) {
  return settings(profile).concealed.includes(part);
}

/**
 * Where the MARK is set in from the end of the partition itself.
 *
 * The second half of the joint is an END, and a flat bed cannot reach it, so
 * what the partition carries is the set-out transferred onto its face. This is
 * how far from the end edge that line is drawn.
 */
export function markFromEnd(profile) {
  return settings(profile).markFromEnd;
}

/** Which layers this pattern writes to — for the layer table and the tests. */
export function biscuitLayers(profile) {
  const s = settings(profile);
  return { mark: s.layer, screw: s.screwLayer };
}
