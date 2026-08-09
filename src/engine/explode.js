// ─── Taking a cabinet apart (turn 12, CLAUDE.md F4.1) ───────────────────────
//
// "The parts animate APART — each panel slides out along its face normal,
// like the cabinet was unscrewed."
//
// The whole of it is arithmetic on the boxes the engine already emitted, which
// is what keeps this in the engine and out of the view: nothing here renders,
// nothing here re-derives a dimension, and a node test can check that a side
// panel goes sideways and a back goes backwards without a browser.
//
// ─── WHICH WAY IS "OUT"? ───
// A board is a flat thing, so its FACE is the pair of big surfaces and its face
// normal runs along its THINNEST axis. That is not a heuristic dressed up: it
// is what a board is, and it is why a shelf lifts, a side panel slides sideways
// and a back panel goes straight out of the back — which is exactly how the
// cabinet came together, run backwards.
//
// The SIGN comes from where the piece sits relative to the middle of the
// cabinet: a left side goes left, a right side goes right. A piece sitting
// dead-centre on its own thin axis — a partition in the middle of a carcass,
// a shelf halfway up — has no outward side to prefer, so it takes the axis's
// positive direction and is separated from its neighbours by the SPREAD below
// rather than by its own position.
//
// ─── HOW FAR? ───
// Far enough to see the joint, near enough to still read as one cabinet. The
// distance is a FACTOR of the cabinet's own size (profile.editor.explode), so a
// 300 mm vanity drawer and a 2.4 m wardrobe explode to the same picture rather
// than to the same number of millimetres.
//
// Pieces that share an axis and a direction — three shelves all lifting — would
// otherwise travel together and stay stacked. They are SPREAD: sorted along the
// axis and pushed out in proportion to their order, so the stack opens like a
// hand of cards.

/** The union of every panel's box — the cabinet, as one lump. */
export function cabinetBounds(panels = []) {
  const boxes = panels.map((p) => p?.box).filter(Boolean);
  if (!boxes.length) return null;
  const min = { x: Infinity, y: Infinity, z: Infinity };
  const max = { x: -Infinity, y: -Infinity, z: -Infinity };
  for (const b of boxes) {
    min.x = Math.min(min.x, b.x); max.x = Math.max(max.x, b.x + b.w);
    min.y = Math.min(min.y, b.y); max.y = Math.max(max.y, b.y + b.h);
    min.z = Math.min(min.z, b.z); max.z = Math.max(max.z, b.z + b.d);
  }
  return {
    min,
    max,
    size: { x: max.x - min.x, y: max.y - min.y, z: max.z - min.z },
    centre: { x: (min.x + max.x) / 2, y: (min.y + max.y) / 2, z: (min.z + max.z) / 2 },
  };
}

const AXES = ['x', 'y', 'z'];
const SPAN = { x: 'w', y: 'h', z: 'd' };

/**
 * Which way this piece faces: its thinnest axis, and which way along it is out.
 *
 * @returns {{axis:'x'|'y'|'z', dir:1|-1}}
 */
export function faceNormalOf(box, centre) {
  if (!box) return { axis: 'z', dir: 1 };
  // The thinnest axis. Ties go to the earlier axis, which only matters for a
  // cube — and a cube is not a board.
  let axis = 'x';
  for (const a of AXES) if (box[SPAN[a]] < box[SPAN[axis]]) axis = a;
  const mid = box[axis] + box[SPAN[axis]] / 2;
  const from = centre ? centre[axis] : mid;
  // Dead centre has no outward side; the positive direction stands in, and the
  // spread below is what separates it from its neighbours.
  return { axis, dir: mid < from ? -1 : 1 };
}

/**
 * Where every piece goes when the cabinet is exploded.
 *
 * @param {Array} panels   the engine's panels, `box` in cabinet-local mm
 * @param {object} opts
 *   factor   how far out, as a fraction of the cabinet's size on that axis
 *   spread   extra separation between pieces travelling the same way, as a
 *            fraction of the same
 * @returns {Map<string, {x:number,y:number,z:number}>} offsets in mm, per panel id
 */
export function explodeOffsets(panels = [], { factor = 0.45, spread = 0.18 } = {}) {
  const out = new Map();
  const bounds = cabinetBounds(panels);
  if (!bounds) return out;

  // Group by the direction each piece travels, so a stack can be fanned out.
  const groups = new Map();
  for (const p of panels) {
    if (!p?.box || !p.id) continue;
    const { axis, dir } = faceNormalOf(p.box, bounds.centre);
    const key = `${axis}${dir}`;
    if (!groups.has(key)) groups.set(key, { axis, dir, items: [] });
    groups.get(key).items.push(p);
  }

  for (const { axis, dir, items } of groups.values()) {
    // Ordered along the axis they travel, so the piece already furthest out
    // goes furthest — the stack opens rather than crossing over itself.
    const ordered = [...items].sort((a, b) => (
      (a.box[axis] + a.box[SPAN[axis]] / 2) - (b.box[axis] + b.box[SPAN[axis]] / 2)
    ));
    const size = bounds.size[axis] || 0;
    const base = size * factor;
    const step = items.length > 1 ? (size * spread) / (items.length - 1) : 0;
    ordered.forEach((p, i) => {
      // Counted from the OUTSIDE in for a piece travelling backwards, so that
      // "further along the axis" and "further out" mean the same thing for both
      // directions.
      const rank = dir > 0 ? i : ordered.length - 1 - i;
      const distance = base + step * rank;
      out.set(p.id, {
        x: axis === 'x' ? dir * distance : 0,
        y: axis === 'y' ? dir * distance : 0,
        z: axis === 'z' ? dir * distance : 0,
      });
    });
  }
  return out;
}

/**
 * The explode numbers, from the profile (rule 2). A profile that predates turn
 * 12 falls back to the defaults this module documents, so an old stored profile
 * does not produce a cabinet that refuses to come apart.
 */
export function explodeSettings(profile) {
  const e = profile?.editor?.explode || {};
  return {
    factor: Number.isFinite(Number(e.distanceFactor)) ? Number(e.distanceFactor) : 0.45,
    spread: Number.isFinite(Number(e.spreadFactor)) ? Number(e.spreadFactor) : 0.18,
    seconds: Number(e.seconds) > 0 ? Number(e.seconds) : 0.6,
  };
}
