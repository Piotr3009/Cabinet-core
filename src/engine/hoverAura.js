// ─── THE HOVER AURA (turn 31, CLAUDE.md F7) ─────────────────────────────────
//
// The owner: "Not a snap — a CATCHMENT."
//
// That distinction is the whole feature. A SNAP moves the thing you are
// pointing at; a CATCHMENT moves what COUNTS AS pointing at it. A bar handle is
// 12 mm of rod and a hinge arm is a 4 mm plate, and on a 1600 px canvas showing
// a whole kitchen both are two or three pixels across. Pointing at one is
// pixel-hunting, and pixel-hunting is why the owner has to zoom in before he
// can double-click a hinge.
//
// So: an invisible box a little bigger than the piece, around every handle and
// every hinge. Inside it, the piece's own number shows. Inside it, the
// double-click lands. Nothing about the piece itself moves, and nothing about
// the drilling changes — the aura is a fact about the POINTER, not about the
// furniture.
//
// ─── AND IT DOES NOT FLICKER, WHICH IS THE HALF THAT COSTS SOMETHING ────────
//
// "Label STAYS while the cursor is anywhere in the aura; disappears ~300 ms
// after leaving (no flicker at the boundary)."
//
// A hitbox with no linger flickers for a reason that is not a bug: three.js
// raycasts per frame, and a hand held still on the boundary of a box crosses
// it several times a second. `linger` is the answer and it is a NUMBER rather
// than a hysteresis: leaving starts a clock, coming back stops it, and the
// label is only pulled when the clock runs out. A second, larger "leave" box
// would work too and would double the geometry for a fact one timer already
// carries.
//
// ─── ORANGE, BECAUSE RED IS RESERVED ────────────────────────────────────────
//
// "colour ORANGE (red is reserved for Check)." An informational number that
// wore the fault colour would train an eye to ignore the fault colour, which
// costs more than a label is worth.
//
// Pure functions and pure data. No React, no store, no three.js.

/** How far past the piece the catchment reaches, in scene mm. Owner: ~8. */
export function auraMm(profile) {
  const n = Number(profile?.editor?.hoverAura?.mm);
  return Number.isFinite(n) && n > 0 ? n : 8;
}

/** How long the label stays after the cursor leaves, in ms. Owner: ~300. */
export function auraLingerMs(profile) {
  const n = Number(profile?.editor?.hoverAura?.lingerMs);
  return Number.isFinite(n) && n >= 0 ? n : 300;
}

/** The ink. ORANGE — red is reserved for Check (F7). */
export function auraColour(profile) {
  return profile?.editor?.hoverAura?.colour || '#e08a2e';
}

/**
 * The box the pointer is caught by, in scene mm, about the piece's own centre.
 *
 * @param {object} size   { w, h, d } of the piece itself
 * @param {object} profile
 * @returns {{w:number, h:number, d:number}}
 */
export function auraBox(size, profile) {
  const pad = auraMm(profile) * 2;
  const n = (v) => Math.max(0, Number(v) || 0);
  return {
    w: n(size?.w) + pad,
    h: n(size?.h) + pad,
    d: n(size?.d) + pad,
  };
}

const round1 = (v) => Math.round(Number(v) * 10) / 10;

/**
 * ─── THE HANDLE'S NUMBER (F7) ───────────────────────────────────────────────
 *
 * "the dimension label shows (handle: distance to its NEAREST front edge, one
 * number — default the owner may extend to two)"
 *
 * ONE NUMBER, and the honest one: a handle 45 from the left edge of a 597 door
 * is also 552 from the right, and only the first of those is what a joiner
 * checks. So: the smallest of the four distances to the leaf's own edges, with
 * WHICH edge it was named beside it — because "45" alone is a number you have
 * to go and work out the meaning of.
 *
 * The frame is the panel's own, which is the frame the engine placed the
 * handle in (`engine/handles.js`), so nothing is re-derived here and the number
 * cannot drift from the drilling.
 *
 * @param {object} panel   one `result.panels` entry with `meta.handle`
 * @returns {{mm:number, edge:'left'|'right'|'top'|'bottom', label:string}|null}
 */
export function handleEdgeDistance(panel) {
  const spec = panel?.meta?.handle;
  if (!spec) return null;
  const w = Number(panel.w) || 0;
  const h = Number(panel.h) || 0;
  const x = Number(spec.x);
  const y = Number(spec.y);
  if (!Number.isFinite(x) || !Number.isFinite(y) || !(w > 0) || !(h > 0)) return null;
  const options = [
    { edge: 'left', mm: x },
    { edge: 'right', mm: w - x },
    { edge: 'bottom', mm: y },
    { edge: 'top', mm: h - y },
  ].filter((o) => Number.isFinite(o.mm) && o.mm >= 0);
  if (!options.length) return null;
  const best = options.reduce((a, b) => (b.mm < a.mm ? b : a));
  return { ...best, mm: round1(best.mm), label: `${round1(best.mm)} from ${best.edge}` };
}

/**
 * …and the two, for the owner's "default the owner may extend to two".
 *
 * Written now because the extension he named is a PROFILE FLAG rather than a
 * feature: `hoverAura.showBothAxes` turns the second number on, and the
 * arithmetic for it has to exist for the flag to be one line.
 */
export function handleEdgeDistances(panel) {
  const spec = panel?.meta?.handle;
  if (!spec) return null;
  const w = Number(panel.w) || 0;
  const h = Number(panel.h) || 0;
  const x = Number(spec.x);
  const y = Number(spec.y);
  if (!Number.isFinite(x) || !Number.isFinite(y) || !(w > 0) || !(h > 0)) return null;
  const across = x <= w - x ? { edge: 'left', mm: x } : { edge: 'right', mm: w - x };
  const up = y <= h - y ? { edge: 'bottom', mm: y } : { edge: 'top', mm: h - y };
  return {
    across: { ...across, mm: round1(across.mm) },
    up: { ...up, mm: round1(up.mm) },
  };
}

/** Does the owner want both numbers? One profile line (F7's own note). */
export function showsBothAxes(profile) {
  return profile?.editor?.hoverAura?.showBothAxes === true;
}

/**
 * The label for one hovered piece.
 *
 * A HINGE's number is its row height off the carcass floor, which is the number
 * its own editor edits and the number the drilling is written in — anything
 * else would be a second way of saying where a hinge is.
 *
 * @param {object} what  { kind: 'handle'|'hinge', panel, mm }
 */
export function auraLabel(what, profile) {
  if (!what) return null;
  if (what.kind === 'hinge') {
    const mm = Number(what.mm);
    return Number.isFinite(mm) ? `${round1(mm)} up` : null;
  }
  const one = handleEdgeDistance(what.panel);
  if (!one) return null;
  if (!showsBothAxes(profile)) return one.label;
  const both = handleEdgeDistances(what.panel);
  return `${both.across.mm} from ${both.across.edge} · ${both.up.mm} from ${both.up.edge}`;
}
