// ─── TURN 74 · F13 · THE FREE PANEL ─────────────────────────────────────────
//
// The owner, 23.09.2026 (list point 3):
//
//   *"SWOBODNY PANEL (wstaw panel). Użytkownik wstawia panel, ustawia
//   pion/poziom/każdą orientację, długość, grubość. Przyciąganie (snap) jako
//   PROPOZYCJA, nie na siłę, zawsze do odrzucenia. Przesuwanie przez
//   kliknięcie w wymiar. Z paneli można złożyć własną figurę (np. box).
//   Dwuklik = wejście w edycję jak w PRO (wycięcie łuku itp.)."*
//
// A free panel is a KIT (`types.js FREE_PANEL`) whose whole carcass is one
// board (`carcass.top: 'free'`), so it is placed, moved, cut, listed and
// machined by the roads every cabinet already takes. This file is the
// arithmetic that is its own: what its board is, how big the box it stands in
// is at a given tilt, how a size typed on either side of that pair is read,
// and where a drop would be caught by a neighbour's edge (the PROPOSAL).
//
// THE BOARD, in the unit's own frame (x along the wall, y up, z out):
//
//   facing     'along' the wall (its length runs along x) or 'across' it (its
//              length runs out into the room, along z, as a cabinet side does)
//   length     its long face size, along x or along z
//   width      its other face size
//   thickness  the unit's board (`board_t`)
//   tilt       0 stands it upright (its face vertical), 90 lays it flat;
//              anything between leans it: along the wall it leans out into the
//              room about its bottom edge (x), across the wall it leans to the
//              left about its bottom edge (z).
//
// Facing and tilt are all the orientations a board has in a room where it
// belongs to a wall, and the unit is never turned in plan for either, so every
// distance along the wall, every snap and every collision is read in the
// unit's own frame, the way every cabinet's is.
//
// The unit's width, height and depth are the BOX the leant board fills, so
// every placement, collision and dimension that reads a unit reads the true
// space the board takes.

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
const num = (v, fallback) => (Number.isFinite(Number(v)) && v !== '' && v != null ? Number(v) : fallback);
const round4 = (v) => Math.round(v * 1e4) / 1e4;

/** The profile's defaults for a free panel. */
function freePanelDefaults(profile) {
  const d = profile?.freePanel?.defaults || {};
  return {
    length: num(d.length, 800),
    width: num(d.width, 400),
    tilt: clamp(num(d.tilt, 0), 0, 90),
    mountHeight: num(d.mountHeight, 0),
  };
}

/**
 * The params a new free panel is born with: its box (from the profile's
 * length, width and tilt at the board's thickness) and the board's own fields.
 */
export function freePanelDefaultParams(profile) {
  const d = freePanelDefaults(profile);
  const thickness = num(profile?.board?.thickness, 18);
  return {
    ...freePanelBox({
      facing: 'along', length: d.length, width: d.width, thickness, tilt: d.tilt,
    }),
    panel_facing: 'along',
    panel_width: d.width,
    panel_tilt_deg: d.tilt,
    mount_height: d.mountHeight,
    // A board is not a cabinet: no scribe filler is made for it, and it may
    // stand as close to a wall as any unit (the wall clearance).
    side_infill_off: true,
  };
}

/**
 * The board a free panel's params describe: `{ length, width, thickness, tilt }`.
 * `length` is the unit width; `width` is `panel_width`, else read back from the
 * box the unit states (its height when upright, its depth when flat).
 */
export function freePanelOf(params, profile) {
  const d = freePanelDefaults(profile);
  const facing = params?.panel_facing === 'across' ? 'across' : 'along';
  const thickness = num(params?.board_t, num(profile?.board?.thickness, 18));
  const tilt = clamp(num(params?.panel_tilt_deg, d.tilt), 0, 90);
  // The long side runs along x along the wall, along z across it; the other
  // face size is `panel_width`, else what the box says (its height upright,
  // its spread flat).
  const length = num(facing === 'across' ? params?.depth : params?.width, d.length);
  const spread = facing === 'across' ? params?.width : params?.depth;
  const fallback = tilt >= 45 ? num(spread, d.width) : num(params?.height, d.width);
  const width = Math.max(1, num(params?.panel_width, fallback));
  return {
    facing, length, width, thickness, tilt,
  };
}

/** The box a board of `width` x `thickness`, leant by `tilt`, stands in. */
function freePanelBox({
  facing = 'along', length, width, thickness, tilt,
}) {
  const t = (clamp(Number(tilt) || 0, 0, 90) * Math.PI) / 180;
  const c = Math.cos(t);
  const s = Math.sin(t);
  // Upright and flat are exact, so a board stood square is not 1e-13 off.
  const up = tilt === 0 ? width : tilt === 90 ? thickness : width * c + thickness * s;
  const spread = tilt === 0 ? thickness : tilt === 90 ? width : width * s + thickness * c;
  return facing === 'across'
    ? { width: round4(spread), height: round4(up), depth: round4(length) }
    : { width: round4(length), height: round4(up), depth: round4(spread) };
}

/**
 * A size edit of a free panel, read the way the person meant it, as ONE patch
 * for `updateUnitParams`: the unit's box and the board's own fields together,
 * so the two can never disagree.
 *
 *   width                 is the board's length
 *   height (upright-ish)  is the board's width, when it leans under 45
 *   depth  (flat-ish)     is the board's width, when it leans 45 and over
 *   panel_width / panel_tilt_deg / board_t   the board's own fields
 *
 * The other of height/depth is then the box the board fills, recomputed.
 */
export function freePanelPatch(params, patch, profile) {
  const now = freePanelOf(params, profile);
  const next = { ...now };
  if (patch.panel_facing != null) next.facing = patch.panel_facing === 'across' ? 'across' : 'along';
  if (patch.board_t != null) next.thickness = Math.max(1, Number(patch.board_t) || now.thickness);
  if (patch.panel_tilt_deg != null) next.tilt = clamp(Number(patch.panel_tilt_deg) || 0, 0, 90);
  if (patch.panel_length != null) next.length = Math.max(1, Number(patch.panel_length) || now.length);
  // The box's own figures, read the way the person meant them (the facing is
  // the one before this patch: a size typed on a panel is a size of THAT panel).
  const lengthKey = now.facing === 'across' ? 'depth' : 'width';
  const spreadKey = now.facing === 'across' ? 'width' : 'depth';
  if (patch.panel_length == null && patch[lengthKey] != null) next.length = Math.max(1, Number(patch[lengthKey]) || now.length);
  if (patch.panel_width != null) next.width = Math.max(1, Number(patch.panel_width) || now.width);
  else if (patch.height != null && next.tilt < 45) next.width = Math.max(1, Number(patch.height) || now.width);
  else if (patch[spreadKey] != null && next.tilt >= 45) next.width = Math.max(1, Number(patch[spreadKey]) || now.width);
  const box = freePanelBox(next);
  const { panel_length: _typedLength, ...rest } = patch;
  const out = {
    ...rest,
    ...box,
    panel_facing: next.facing,
    panel_width: round4(next.width),
    panel_tilt_deg: next.tilt,
  };
  if (patch.board_t != null) out.board_t = next.thickness;
  return out;
}

/**
 * THE ROOM CLAMPED THE BOX: the board re-read from the box it was given, so
 * the two stay one. A clamp only ever shrinks, so the board only ever
 * shrinks: its length is the box's along its length, its width what the
 * clamped height (upright-ish) or spread (flat-ish) leaves at its tilt.
 */
export function freePanelFit(params, box, profile) {
  const now = freePanelOf(params, profile);
  const t = (now.tilt * Math.PI) / 180;
  const c = Math.cos(t);
  const s = Math.sin(t);
  const lengthKey = now.facing === 'across' ? 'depth' : 'width';
  const spreadKey = now.facing === 'across' ? 'width' : 'depth';
  const length = Math.max(1, Math.min(now.length, num(box?.[lengthKey], now.length)));
  let width = now.width;
  if (now.tilt < 45 && box?.height != null) {
    width = now.tilt === 0 ? Number(box.height) : (Number(box.height) - now.thickness * s) / c;
  } else if (now.tilt >= 45 && box?.[spreadKey] != null) {
    width = now.tilt === 90 ? Number(box[spreadKey]) : (Number(box[spreadKey]) - now.thickness * c) / s;
  }
  width = Math.max(1, Math.min(now.width, width));
  return {
    ...freePanelBox({ ...now, length, width }),
    panel_width: round4(width),
  };
}

/**
 * THE BOARD IN THE UNIT'S FRAME, and how it leans: `{ box, tilt }`, the box
 * being the UNLEANT board and `tilt` the `{ deg, pivot }` the 3-D turns it by
 * about x (null when it stands square). Leant by +t about a pivot on its back
 * face `thickness * sin t` up, the board fills exactly `freePanelBox`.
 */
export function freePanelPlacement({
  facing = 'along', length, width, thickness, tilt,
}) {
  const s = Math.sin((tilt * Math.PI) / 180);
  if (facing === 'across') {
    // Its length out into the room (z), its face in y/z; leant about z to
    // the left, the pivot on its bottom edge `width * sin t` in from the left.
    if (tilt === 0) return { box: { x: 0, y: 0, z: 0, w: thickness, h: width, d: length }, tilt: null };
    if (tilt === 90) return { box: { x: 0, y: 0, z: 0, w: width, h: thickness, d: length }, tilt: null };
    const shift = round4(width * s);
    return {
      box: { x: shift, y: 0, z: 0, w: thickness, h: width, d: length },
      tilt: { deg: tilt, axis: 'z', pivot: { x: shift, y: 0, z: 0 } },
    };
  }
  if (tilt === 0) {
    return { box: { x: 0, y: 0, z: 0, w: length, h: width, d: thickness }, tilt: null };
  }
  if (tilt === 90) {
    return { box: { x: 0, y: 0, z: 0, w: length, h: thickness, d: width }, tilt: null };
  }
  const lift = round4(thickness * s);
  return {
    box: { x: 0, y: lift, z: 0, w: length, h: width, d: thickness },
    tilt: { deg: tilt, pivot: { y: lift, z: 0 } },
  };
}

/**
 * THE PROPOSAL. Where a panel dropped with its left edge at `left` (and its
 * right at `left + width`) would be caught: the nearest EDGE of anything else
 * on the wall (`edges`, each `{ at, label }`) within `magnet` millimetres of
 * either of its own edges. Returns `{ left, at, edge, label }` (the left the
 * catch would move it to, the edge it met, and which of its own edges met it)
 * or null. It decides nothing: the drop does, and the drop can refuse it.
 */
export function freePanelSnap({ left, width, edges, magnet }) {
  const m = Math.max(0, Number(magnet) || 0);
  if (!m || !Array.isArray(edges) || !edges.length) return null;
  let best = null;
  for (const e of edges) {
    const at = Number(e?.at);
    if (!Number.isFinite(at)) continue;
    for (const [mine, shift] of [['left', 0], ['right', width]]) {
      const gap = Math.abs(left + shift - at);
      if (gap <= m && gap > 1e-6 && (!best || gap < best.gap)) {
        best = { left: round4(at - shift), at, edge: mine, label: e.label || null, gap };
      }
    }
  }
  if (!best) return null;
  const { gap, ...out } = best;
  return out;
}
