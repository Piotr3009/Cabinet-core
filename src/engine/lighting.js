// ─── THE LIGHT COMES FROM THE CEILING (turn 26, CLAUDE.md F10) ──────────────
//
// The owner's proposal, and his constraint in the same breath:
//
//   "One broad ceiling source at real ceiling height above the tall units, set
//    back 1.5 m from the fronts, medium intensity."
//   "**Whatever is added above is SUBTRACTED from the facing spots** — the
//    scene's total luminous contribution stays as it is today. Compute it, do
//    not eyeball it."
//
// So this module is the computation. It is pure arithmetic over the rig's own
// numbers and it has no idea three.js exists; `3d/Scene.jsx` asks it what the
// intensities are and sets them.
//
// ─── WHAT "TOTAL LUMINOUS CONTRIBUTION" MEANS HERE ──────────────────────────
//
// It has to mean ONE comparable number or "subtract" is not an operation, and
// the rig mixes two kinds of source that are measured in two different ways:
//
//   AMBIENT, HEMISPHERE, DIRECTIONAL   an irradiance. `intensity` IS the light
//                                      arriving, wherever the subject is.
//   SPOT, POINT (three r0.180, decay 2) a candela-like quantity. What arrives
//                                      falls off with distance SQUARED, so the
//                                      light at the subject is `intensity / d²`
//                                      for `d` the source's distance from it.
//
// The metric is therefore **irradiance at the subject** — at the very point the
// whole rig is already aimed at, `fit.centre`. Every source is converted to it
// and the sum is what must not move. That is not the only defensible metric
// (one could integrate over the furniture's surface) but it is the one the rig
// is built around, it is exactly computable, and it is written down here so the
// number in `verify/t26/lighting.md` means something.
//
// ─── AND THE SHARE IS A FRACTION, NOT A CANDELA ─────────────────────────────
//
// "Medium intensity" is a judgement, and the honest way to ship a judgement is
// as a fraction of something real rather than as a magic number. `ceiling.share`
// is how much of the FACING SPOTS' contribution the ceiling source takes over.
// At 0.35 the spots keep 0.65 of what they gave and the ceiling supplies the
// rest — so the identity holds exactly, at any room size and any camera fit,
// without anybody re-tuning a candela when the kitchen gets longer.
//
// Pure functions and pure data. No React, no three.js, no store.

/** Distance between two [x, y, z] points, in whatever units they are in. */
export function distanceBetween(a, b) {
  return Math.hypot(
    (Number(a?.[0]) || 0) - (Number(b?.[0]) || 0),
    (Number(a?.[1]) || 0) - (Number(b?.[1]) || 0),
    (Number(a?.[2]) || 0) - (Number(b?.[2]) || 0),
  );
}

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/**
 * What one punctual source (a spot or a point, decay 2) delivers at the
 * subject.
 *
 * A source AT the subject would divide by zero; the floor of one scene unit is
 * a metre of room, which is closer than any lamp in this rig ever gets and is
 * there so the arithmetic is total rather than nearly total.
 */
export function irradianceAt(intensity, distance) {
  const d = Math.max(1e-3, num(distance));
  return num(intensity) / (d * d);
}

/**
 * Where every lamp of the rig is, in SCENE units, given the fit the camera has.
 *
 * The positions are `3d/Scene.jsx`'s own — the same expressions it feeds to
 * three — and they are here so the sum below and the scene cannot disagree
 * about where a lamp is.
 *
 * @param {object} args
 *   studio    profile.appearance.studio
 *   centre    [x, y, z] the rig is aimed at, in scene units
 *   distance  the rig's own reach, in scene units
 */
export function rigPositions(studio, { centre = [0, 0, 0], distance = 1 } = {}) {
  const d = num(distance);
  const at = (x, y, z) => [centre[0] + d * x, centre[1] + d * y, centre[2] + d * z];
  const out = {
    key: at(0.55, 0.85, 0.7),
    fill: at(-0.8, 0.5, 0.55),
    rim: at(-0.3, 0.6, -0.9),
    spots: (studio?.spots || []).map((s) => at(num(s.x), num(s.y), num(s.z))),
  };
  // The GLINTS are deliberately not here. A `points` entry may carry `yMm` — an
  // absolute eye height above the floor (turn 14, F9) — and only the scene knows
  // what that is in its own units, so `luminousSum` takes their heights as an
  // argument rather than this guessing at one.
  return out;
}

/**
 * THE SUM: every source's contribution at the subject, and the total.
 *
 * @param {object} args
 *   studio     profile.appearance.studio
 *   centre     the point the rig is aimed at, scene units
 *   distance   the rig's reach, scene units
 *   pointYs    the absolute scene y of each `points` entry (they may be given
 *              as `yMm`, an eye height above the floor — turn 14, F9 — which
 *              only the scene can resolve)
 *   ceiling    an extra source `{ intensity, position }`, or null
 * @returns {{ total:number, rows:Array<{role:string, at:number}> }}
 *   `rows` is per source, so `verify/t26/lighting.md` can print the ledger
 *   rather than a single number nobody can check.
 */
export function luminousSum({
  studio, centre = [0, 0, 0], distance = 1, pointYs = null, ceiling = null,
}) {
  const rows = [];
  const say = (role, at) => { rows.push({ role, at: Math.round(at * 1e6) / 1e6 }); return at; };
  const pos = rigPositions(studio, { centre, distance });

  let total = 0;
  total += say('ambient', num(studio?.ambient));
  total += say('hemisphere', num(studio?.hemisphere?.intensity));
  total += say('key', num(studio?.key));
  total += say('fill', num(studio?.fill));
  total += say('rim', num(studio?.rim));

  (studio?.spots || []).forEach((s, i) => {
    total += say(`spot-${i}`, irradianceAt(s.intensity, distanceBetween(pos.spots[i], centre)));
  });
  (studio?.points || []).forEach((p, i) => {
    const y = pointYs?.[i];
    const where = [
      centre[0] + num(distance) * num(p.x),
      Number.isFinite(Number(y)) ? num(y) : centre[1] + num(distance) * num(p.y),
      centre[2] + num(distance) * num(p.z),
    ];
    total += say(`point-${i}`, irradianceAt(p.intensity, distanceBetween(where, centre)));
  });

  if (ceiling) {
    total += say('ceiling', irradianceAt(ceiling.intensity, distanceBetween(ceiling.position, centre)));
  }
  return { total: Math.round(total * 1e6) / 1e6, rows };
}

/**
 * WHERE THE CEILING SOURCE HANGS (F10.1).
 *
 * "at real ceiling height above the tall units, set back 1.5 m from the fronts".
 *
 * Both numbers are the ROOM's, not the rig's: a ceiling is at a height and a
 * metre and a half is a metre and a half, in a galley and in a six-metre
 * kitchen alike. That is the same reasoning turn 14's eye-level pair carries
 * (`yMm` is absolute while x and z are rig fractions) and it is why this takes
 * millimetres and hands back scene units through the caller's own `mm`.
 *
 * @param {object} args
 *   centre     the rig's aim point, scene units
 *   frontZ     the furniture's own front face, scene units
 *   ceilingY   the room's ceiling, scene units
 *   setback    how far BACK from the fronts it hangs, scene units
 */
export function ceilingPosition({
  centre = [0, 0, 0], frontZ = 0, ceilingY = 0, setback = 0,
}) {
  return [centre[0], num(ceilingY), num(frontZ) - num(setback)];
}

/**
 * THE BALANCE (F10.2).
 *
 * The ceiling source takes `share` of what the FACING SPOTS deliver at the
 * subject, and the spots are scaled by `1 − share` so the sum is unchanged. It
 * is exact by construction rather than by tuning:
 *
 *     before = A + H + K + F + R + Σ sᵢ/dᵢ²
 *     after  = A + H + K + F + R + (1−share)·Σ sᵢ/dᵢ² + share·Σ sᵢ/dᵢ²
 *            = before
 *
 * …and the ceiling lamp's own INTENSITY falls out of it: whatever candela puts
 * `share · Σ sᵢ/dᵢ²` at the subject from where it hangs.
 *
 * A rig with NO spots has nothing to take the light from, so it gets no ceiling
 * source at all rather than a brighter room — which is the constraint, kept.
 *
 * @returns {{ enabled:boolean, share:number, spotScale:number,
 *             ceiling:{intensity:number, position:number[]}|null,
 *             before:number, after:number, drift:number }}
 */
export function balanceRig({
  studio, centre = [0, 0, 0], distance = 1, pointYs = null,
  frontZ = 0, ceilingY = 0, setback = 0,
}) {
  const before = luminousSum({
    studio, centre, distance, pointYs,
  });
  const C = studio?.ceiling || {};
  const share = Math.max(0, Math.min(1, num(C.share)));
  const pos = rigPositions(studio, { centre, distance });
  const spotSum = (studio?.spots || []).reduce(
    (sum, s, i) => sum + irradianceAt(s.intensity, distanceBetween(pos.spots[i], centre)),
    0,
  );

  if (!C.enabled || !(share > 0) || !(spotSum > 0)) {
    return {
      enabled: false,
      share,
      spotScale: 1,
      ceiling: null,
      before: before.total,
      after: before.total,
      drift: 0,
      rows: before.rows,
    };
  }

  const position = ceilingPosition({
    centre, frontZ, ceilingY, setback,
  });
  const d = distanceBetween(position, centre);
  // The candela that delivers exactly the share, from where it hangs.
  const intensity = share * spotSum * Math.max(1e-3, d) ** 2;
  const spotScale = 1 - share;

  const after = luminousSum({
    studio: { ...studio, spots: (studio.spots || []).map((s) => ({ ...s, intensity: num(s.intensity) * spotScale })) },
    centre,
    distance,
    pointYs,
    ceiling: { intensity, position },
  });

  return {
    enabled: true,
    share,
    spotScale,
    ceiling: { intensity, position, angle: num(C.angle), penumbra: num(C.penumbra), colour: C.colour },
    before: before.total,
    after: after.total,
    drift: Math.round((after.total - before.total) * 1e6) / 1e6,
    rows: after.rows,
  };
}

/**
 * THE BRIGHTNESS SLIDER (F10.3).
 *
 * "A brightness slider in the View menu scales every source proportionally,
 * state remembered."
 *
 * PROPORTIONALLY is the whole of it: one multiplier on every lamp, so the
 * RATIOS the rig was balanced at — the key against the fill, the spots against
 * the ambient — are exactly the ones turn 10 measured, whatever the slider is
 * set to. A slider that touched one lamp would be a slider that re-lights the
 * scene, and this one only turns it up.
 */
// ─── TURN 54 (CLAUDE.md F5.3): THE SCENE LIGHT, PER PROJECT ────────────────
//
// The owner: *"ustawienie światła pokoju, czyli sceny, poniżej LED."* One
// slider in the Lighting panel, stored ON THE PROJECT (like the T51 rig,
// beside `design` — `migrateLighting`'s whitelist would drop it), riding the
// LIVE lamps only. The bounds are the owner's own: 0.4× to 1.5×, default =
// today's 1.0 over `baseGain` 0.75. The IRON rule stands and is asserted:
// exports and PDFs ignore this number — the fixed rig only.

export const SCENE_LIGHT_MIN = 0.4;
export const SCENE_LIGHT_MAX = 1.5;

/** The project's scene-light multiplier, clamped; "nothing said" is 1. */
export function sceneLightScale(value) {
  if (value == null || value === '' || typeof value === 'boolean') return 1;
  const n = Number(value);
  if (!Number.isFinite(n)) return 1;
  return Math.min(SCENE_LIGHT_MAX, Math.max(SCENE_LIGHT_MIN, n));
}

/** The stored record, normalised — the same shape `migrateLightRig` keeps. */
export function migrateSceneLight(stored) {
  return { scale: sceneLightScale(stored?.scale) };
}

export function brightnessScale(value, profile) {
  const B = profile?.appearance?.studio?.brightness || {};
  const min = Number.isFinite(Number(B.min)) ? num(B.min) : 0.5;
  const max = Number.isFinite(Number(B.max)) ? num(B.max) : 1.5;
  const fallback = Number.isFinite(Number(B.default)) ? num(B.default) : 1;
  // Deliberately stricter than `Number()`, for the same reason `formatMm` is:
  // null, undefined, '' and booleans are NOT zero here. A stored key that has
  // never been written must read as "nothing said" and take the default, not as
  // a request for the dimmest room the slider can make.
  if (value == null || value === '' || typeof value === 'boolean') return fallback;
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}
