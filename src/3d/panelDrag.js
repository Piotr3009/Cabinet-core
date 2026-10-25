/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── T82 F16 · GRAB AND MOVE, THREE AXES ────────────────────────────────────
//
// The owner, 25.10.2026, 13:36: *"teraz mam to w menu a bardziej chcialem
// grab and move"*. The free panel is in the hand, not in a menu.
//
// The probe (`verify/t82/f16-probe.md`) found the room's drag of a free panel
// reading ONE axis on the WRONG plane: `UnitView.jsx dragPlane` stood half
// the panel's depth off the wall line (9 mm for an 18 board), so a panel
// stuck on a chimney's face 350 off the wall was dragged on a plane 350
// behind the board the eye sees, and `startDrag` handed on `alongMm(p)` alone.
//
// This file is the view's arithmetic, pure and in millimetres, so it can be
// held by a test without a browser: where the plane stands, which gesture a
// press starts, and where the hand puts the panel. The CLAMPS are the store's
// (`moveFreePanelY`, `moveFreePanelZ`, both reading `freePanelReach`), as a
// shelf's and a divider's are: this view never second-guesses the room.
//
//   along the wall   x, on the vertical plane through the panel's own back
//                    line, through `onMove` (moveUnit, the T74 F13 proposal)
//   up and down      the SAME plane's height, through `onMovePanelY`
//   off the wall     Shift held at the press: a horizontal plane at the grab
//                    point's height (the `startDepthDrag` pattern), its
//                    distance into the room, through `onMovePanelZ`

import { backStandoff } from '../engine/collision.js';
import { isFreePanel } from '../engine/types.js';

const num = (v, fallback = 0) => (Number.isFinite(Number(v)) && v !== '' && v != null ? Number(v) : fallback);

/**
 * How far off the wall line, in mm, the vertical plane a unit is dragged on
 * stands. A free panel: its OWN back line (`backStandoff`, the number the view
 * draws it at), so a panel stood off the wall drags where the eye sees it.
 * Every other unit: halfway into its depth, as since turn 3.
 */
export function dragPlaneOffsetMm(unit, profile) {
  if (isFreePanel(unit?.type)) return backStandoff(unit, profile);
  return num(unit?.params?.depth) / 2;
}

/**
 * Which gesture a press starts: `'off'` (a free panel with Shift held: off
 * the wall), `'face'` (a free panel: along the wall AND up and down) or
 * `'along'` (every other unit; and a panel in a view that was given neither
 * setter, such as the editor window, which drags as it always did).
 */
export function panelDragMode(unit, { shiftKey = false, canLift = false, canPull = false } = {}) {
  if (!isFreePanel(unit?.type)) return 'along';
  if (shiftKey && canPull) return 'off';
  return canLift ? 'face' : 'along';
}

/**
 * The grab: how far the hand is from the panel's own three datums at the
 * press (its left edge along the wall, its underside above the floor, its
 * back face off the wall line), so the panel never jumps to the cursor.
 */
export function panelGrab(unit, profile, { alongMm = 0, upMm = 0, offMm = 0 } = {}) {
  return {
    along: alongMm - num(unit?.position?.x_mm),
    up: upMm - num(unit?.params?.mount_height),
    off: offMm - backStandoff(unit, profile),
  };
}

/** Where the hand puts the panel: its x, its mounting height, its back's distance off the wall. */
export function panelDragTo(grab, { alongMm = 0, upMm = 0, offMm = 0 } = {}) {
  return { x: alongMm - grab.along, y: upMm - grab.up, z: offMm - grab.off };
}

/**
 * The height above the floor (mm) of the horizontal plane the Shift drag
 * travels on: the grab point's own, so the board stays under the cursor, else
 * the panel's middle.
 */
export function offPlaneHeightMm({ pointMm = null, baseMm = 0, heightMm = 0 } = {}) {
  if (pointMm != null && Number.isFinite(Number(pointMm))) return Number(pointMm);
  return num(baseMm) + num(heightMm) / 2;
}
