/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── T84 F5, THE MARKER (CLAUDE.md T84 PART C) ──────────────────────────────
//
// CLAUDE.md T84 F5: *"THE MARKER: `UnitIssueMarker`, one per unit with
// findings, beside the unit number in the scene (the same anchor the number
// uses), a red triangle for a red finding, a yellow one for yellow only, with
// the count; click = select the unit and open its card with the strip."*
// THE NUMBERS: *"Marker | a triangle beside the unit number, 16 px, with the
// count"* and the issue colours with their 13 px dark text: the profile's
// (profile.ui.studio.marker.sizePx, profile.ui.studio.issues), drawn by the
// skin's one stylesheet for the class vocabulary this file uses
// (studio.css `.studio-marker`, `.is-red`, `.is-yellow`, the triangle being
// the Stage-1 sprite's `warning`); not one of them is typed here.
//
// WHERE: 3d/UnitView.jsx renders this through its ONE slot (CLAUDE.md T84
// FROZEN 3, `setUnitAdornment`), at the name chip's own anchor, inside the
// unit's group, whether or not the labels are shown; ConfiguratorPage fills
// the slot while the Studio face is mounted. Nothing in 3d/ imports this file.
//
// BESIDE THE NUMBER, NEVER OVER IT: the chip is a sprite that holds a pixel
// size on screen by 3d/DimLabel.jsx's own law, LABEL_PX_BASE (26 px) at the
// reference depth and never more than MAX_FACTOR (1.8) times that, so its top
// edge is never more than 26 x 1.8 / 2 = 23.4 px above the anchor. The marker
// stands on the anchor lifted clear of that, in CSS pixels, at every depth;
// with the labels off it stands where the number would be.
//
// NEVER IN A RENDER: the marker is drei's <Html>, a DOM element laid over the
// canvas, and every render and PDF picture reads the WebGL canvas alone
// (3d/Scene.jsx CaptureRig, 3d/renderCapture.js), so it cannot reach one; its
// group carries `ccHelper` as every tool in the room does (3d/ShareOutBar.jsx,
// the precedent), so no bounds or framing ever counts it.
//
// ITS OWN CLICK: the Html element stands inside the canvas wrapper the room's
// pointer events are connected to, so a press on the marker would also reach
// the room as a press on the canvas (and a miss there drops the selection,
// Scene.jsx `onPointerMissed`). The marker keeps its presses to itself.

import { Html } from '@react-three/drei';
import { useCheckFindings } from '../../lib/checkFindings.js';
import { LAYER_CLASS } from '../../lib/modalLayer.js';
import { useUiStore } from '../../stores/uiStore.js';
import { Icon } from './StudioIcons.jsx';
import { issueCountText, unitIssue } from './lib/studioIssues.js';

/** 3d/DimLabel.jsx: LABEL_PX_BASE 26 px, MAX_FACTOR 1.8; the chip's tallest half, rounded up. */
const CHIP_CLEARANCE_PX = Math.ceil((26 * 1.8) / 2);

/** The z-order's one authority (lib/modalLayer.js): a canvas overlay, under the panels laid over the scene. */
const zOfLayer = (layer) => Number(String(layer).replace(/\D+/g, '')) || 0;
const MARKER_Z = [zOfLayer(LAYER_CLASS.panel) - 1, zOfLayer(LAYER_CLASS.inPanel) + 1];

const keepToItself = (e) => { e.stopPropagation(); };

/**
 * @param {object} props
 *   unit      the unit, as 3d/UnitView.jsx holds it
 *   position  the name chip's anchor in the unit's own frame
 */
export default function UnitIssueMarker({ unit, position }) {
  const findings = useCheckFindings();
  const issue = unitIssue(findings, unit?.id);
  if (!unit || !issue) return null;

  const num = unit.params?.unit_num ?? '';
  const said = `${num}: ${issueCountText(issue)}`;

  const onClick = (e) => {
    e.stopPropagation();
    const ui = useUiStore.getState();
    // A refused edit in the inspector keeps the selection where it is (F4's
    // guard): then nothing else moves either.
    if (ui.selectUnit(unit.id) === false) return;
    if (useUiStore.getState().inspector === 'none') useUiStore.getState().showInspector();
  };

  return (
    <group position={position} userData={{ ccHelper: true }}>
      <Html
        zIndexRange={MARKER_Z}
        style={{
          pointerEvents: 'auto',
          transform: `translate3d(-50%, calc(-100% - ${CHIP_CLEARANCE_PX}px), 0)`,
        }}
      >
        <button
          type="button"
          className={`studio-marker is-${issue.level}`}
          data-studio="marker"
          data-unit={unit.id}
          data-level={issue.level}
          data-count={issue.count}
          aria-label={said}
          title={`${said}. Select it and show its card.`}
          onClick={onClick}
          onPointerDown={keepToItself}
          onPointerUp={keepToItself}
          onPointerMove={keepToItself}
          onDoubleClick={keepToItself}
          onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
        >
          <Icon name="warning" />
          <span>{issue.count}</span>
        </button>
      </Html>
    </group>
  );
}
