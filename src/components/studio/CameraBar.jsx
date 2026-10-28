/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T84 F6 (CLAUDE.md T84 PART D): THE SCENE'S EDGE, THE CAMERA BAR
//
// CLAUDE.md T84 F6: *"CameraBar at the scene's foot: Plan, Iso, A, B, C, D,
// Frame selection, beside 3D | Drawings.... Through the room's camera and
// controls ... Drawings... is `openModal('drawing', { kind: 'walls', anchor })`,
// the PREVIEW, never the direct export."*  The designer's foot bar (3D, then
// Drawings...) with the camera's places between them: 3D, Plan, Iso, A to D,
// Frame selection, then Drawings....
//
// Every place is computed in lib/cameraPresets.js (plain numbers, the room's
// own walls and runs) and PARKED on the live camera and orbit target that
// 3d/viewHandle.js registers as `window.__cc.views.room`: one step, no flight,
// nothing in src/3d edited or imported but the furniture's own bounds
// (3d/renderCapture.js furnitureBounds: meshes only, the tool's helpers left
// out, the box the key light and the render already fit).
//
// Frame selection fits the selected cabinets (every cabinet when none is) with
// profile.ui.studio.frameMargin, keeping the direction the camera looks from
// now. It also ANSWERS uiStore.frameRequest (F5: the issue strip's Show asks):
// the units named are framed the same way, then the request is cleared.
//
// THE GUARDS: the places act on the 3D scene, so they are greyed in the CNC
// view (the toolbar's own `viewMode !== '3d'`, disabled rather than hidden);
// a wall letter the room does not have is greyed with the reason; Frame
// selection with no cabinet in the room is greyed with the reason. 3D is never
// greyed (it is the way back from the CNC sheet), and Drawings... only when the
// page has not handed it its opener.

import { useEffect, useMemo } from 'react';
import { useUiStore } from '../../stores/uiStore.js';
import { useProjectStore } from '../../stores/projectStore.js';
import { useCabinetProfileStore } from '../../stores/cabinetProfileStore.js';
import { realWalls } from '../../engine/room.js';
import { LAYER_CLASS } from '../../lib/modalLayer.js';
import { furnitureBounds } from '../../3d/renderCapture.js';
import { Icon } from './StudioIcons.jsx';
import {
  WALL_VIEWS, fitBoxes, lensOf, placeCamera, roomView, unitRoots, viewDirection, viewPlacement,
} from './lib/cameraPresets.js';

/**
 * Fit these units (every unit when `ids` is null) in the live room view,
 * keeping the direction it looks from. True when the camera moved.
 */
function frameUnits(ids, margin) {
  const view = roomView();
  if (!view?.scene) return false;
  const roots = unitRoots(view.scene, ids);
  const box = roots.length ? furnitureBounds(roots) : null;
  if (!box) return false;
  return placeCamera(view, fitBoxes([box], { ...lensOf(view), margin, direction: viewDirection(view) }));
}

export default function CameraBar({ onDrawings = null }) {
  const viewMode = useUiStore((s) => s.viewMode);
  const setViewMode = useUiStore((s) => s.setViewMode);
  const selectedUnitIds = useUiStore((s) => s.selectedUnitIds);
  const frameRequest = useUiStore((s) => s.frameRequest);
  const clearFrameRequest = useUiStore((s) => s.clearFrameRequest);
  const room = useProjectStore((s) => s.project.room);
  const units = useProjectStore((s) => s.units);
  const profile = useCabinetProfileStore((s) => s.profile);
  const margin = Number(profile?.ui?.studio?.frameMargin) || 0;
  const walls = useMemo(() => realWalls(room), [room]);

  // One of the six places, parked on the live view at the press.
  const go = (id) => {
    const view = roomView();
    if (!view) return false;
    return placeCamera(view, viewPlacement(id, room, {
      ...lensOf(view), margin, units, profile,
    }));
  };

  // The issue strip's Show (F5) asks for a frame; this bar answers it, then clears it.
  useEffect(() => {
    if (!frameRequest) return;
    frameUnits(frameRequest.unitIds, margin);
    clearFrameRequest?.();
  }, [frameRequest, clearFrameRequest, margin]);

  const flat = viewMode !== '3d';
  const anySelected = selectedUnitIds.length > 0;

  return (
    <div
      className={`studio-scene-links studio-skin ${LAYER_CLASS.panel}`}
      data-studio="camera-bar"
      role="toolbar"
      aria-label="Camera"
    >
      <button
        type="button"
        className="cc-btn"
        data-studio="scene-3d"
        aria-pressed={viewMode === '3d'}
        onClick={() => setViewMode('3d')}
      >
        <Icon name="cube" />
        3D
      </button>

      <button
        type="button"
        className="cc-btn-ghost"
        data-studio="camera-plan"
        disabled={flat}
        title="The room from above, at its centre"
        onClick={() => go('plan')}
      >
        <Icon name="plan" />
        Plan
      </button>
      <button
        type="button"
        className="cc-btn-ghost"
        data-studio="camera-iso"
        disabled={flat}
        title="Into the corner of the first run, from above across the room"
        onClick={() => go('iso')}
      >
        <Icon name="iso" />
        Iso
      </button>
      {WALL_VIEWS.map((w) => (
        <button
          key={w.id}
          type="button"
          className="cc-btn-ghost"
          data-studio={`camera-${w.id}`}
          disabled={flat || !walls[w.wall]}
          title={walls[w.wall]
            ? `Wall ${w.label}, square on from inside the room`
            : `This room has no wall ${w.label}`}
          onClick={() => go(w.id)}
        >
          {w.label}
        </button>
      ))}
      <button
        type="button"
        className="cc-btn-ghost"
        data-studio="camera-frame"
        disabled={flat || !units.length}
        title={units.length
          ? (anySelected ? 'Fit the selected cabinets in the view' : 'Fit every cabinet in the view')
          : 'Nothing to frame: the room has no cabinets yet'}
        onClick={() => frameUnits(anySelected ? selectedUnitIds : null, margin)}
      >
        <Icon name="frame" />
        Frame selection
      </button>

      <span className="w-px h-4 bg-shell-600" aria-hidden />

      <button
        type="button"
        className="cc-btn-ghost"
        data-studio="drawings"
        disabled={typeof onDrawings !== 'function'}
        title="Preview the drawing set: nothing is exported from here"
        onClick={(e) => onDrawings?.(e)}
      >
        <Icon name="drawing" />
        Drawings…
      </button>
    </div>
  );
}
