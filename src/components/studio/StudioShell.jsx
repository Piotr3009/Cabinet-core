/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T84 F2, THE SHELL (CLAUDE.md T84 PART A, F2): StudioShell, PRO's face.
//
// The owner, 27.10.2026, 16:27: *"nie, juz jest przy wyborze"*: PRO is chosen
// at the start and Studio is its face (lib/studioFace.js `isStudioFace`). The
// shell is the grid of the designer's Stage-1 (verify/t84/astra/): the top bar,
// the context strip, the workspace `rail | scene | inspector`, the status bar.
// It owns LAYOUT and the display of the selection, never a part, never a row:
//
//   topBar         the existing TopBar, `variant="studio"` (row 1)
//   inspector      the inspector column (F4); absent, or 'none', or with nothing
//                  to show (the UX turn, U2, below), the column is 0
//   sceneEdge      what stands at the scene's edge (F6), drawn over the scene
//   statusExtras   what the status bar carries besides its own (F5's counters)
//   renderRailMenu (kind, { anchor, onClose }) => the rail's popups (F7)
//   children       the EXISTING scene layer, unchanged: the canvas, the CNC
//                  view, the messages, the Library, the BOM, the Check, every
//                  window. Nothing in 3d/ learns that the shell exists.
//
// It imports nothing from a later F: every later part comes in through a slot
// (verify/t84/agents/CONTRACT.md section 5). Every number is the profile's
// (`profile.ui.studio`), set on the root as CSS variables by studioSkin's
// `studioCssVars` and re-read when the window is resized.
//
// THE UX TURN, U2 · THE PANEL THAT HIDES. Nothing selected and nothing pinned,
// the inspector column is not drawn; a cabinet or a part selected, it comes
// back. The grid's third column is 0 or the panel's width (`--studio-inspector`);
// the scene slot below and the canvas inside it stay mounted, and the camera
// stays where it is (@react-three/fiber makes its camera once, at the canvas's
// creation). U2 narrowed the scene for the column (*"niech sie zweza"*); the
// owner reversed that the same evening, below.
//
// THE PANELS LIE OVER THE SCENE (the owner, 01.11.2026, 22:08, over the
// merged U2: *"miales racje, przy chowaniu sie i otwieraniu panelu zmniejszanie
// sie widoku szafy to masakra, powinno sie nakladac a nie ruszac scena"*). In
// the 3D view the scene spans the inspector's column too (studio.css,
// `data-scene-under-panels`), so the canvas keeps the same width whether the
// inspector, the BOM or the Check is up or not: the inspector is drawn over
// the scene's right edge, the BOM and the Check stand beside it, and the canvas
// is never resized by a panel. The inspector still goes when nothing is
// selected and nothing is pinned. The two bars centre in what the panels leave
// visible (`--studio-dock`, below). The CNC view keeps its column as before, so
// no part of the sheet stands under its tree.

import {
  useEffect, useLayoutEffect, useRef, useState,
} from 'react';
import './studio.css';
import { useUiStore } from '../../stores/uiStore.js';
import { useProjectStore } from '../../stores/projectStore.js';
import { useCabinetProfileStore } from '../../stores/cabinetProfileStore.js';
import { ChangesBarRehomed } from '../Messages.jsx';
import StudioIcons from './StudioIcons.jsx';
import { studioCssVars, studioWidths } from './lib/studioSkin.js';
import StudioRail from './StudioRail.jsx';
import SelectionBreadcrumb from './SelectionBreadcrumb.jsx';
import StatusBar from './StatusBar.jsx';
import { LAYER_CLASS } from '../../lib/modalLayer.js';

/** The window's size, read on mount and on every resize. */
function useViewport() {
  const read = () => ({
    width: typeof window === 'undefined' ? 0 : window.innerWidth,
    height: typeof window === 'undefined' ? 0 : window.innerHeight,
  });
  const [size, setSize] = useState(read);
  useEffect(() => {
    const onResize = () => setSize((was) => {
      const now = read();
      return now.width === was.width && now.height === was.height ? was : now;
    });
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return size;
}

// The grid of Stage-1, the four rows and the three columns, each length one of
// the profile's variables (the numbers are never typed here).
const SHELL_GRID = {
  display: 'grid',
  gridTemplateRows: 'var(--studio-top) var(--studio-context) minmax(0, 1fr) var(--studio-status)',
  gridTemplateColumns: 'minmax(0, 1fr)',
};
const WORKSPACE_GRID = {
  display: 'grid',
  gridTemplateColumns: 'var(--studio-rail) minmax(0, 1fr) var(--studio-inspector)',
  gridTemplateRows: 'minmax(0, 1fr)',
};

/**
 * THE UX TURN, U2: whether the inspector column has anything to show. The CNC
 * view (its tree), a cabinet or a part of one that still exists (`unitType`
 * is read off the project, null when the cabinet is gone), or a pinned panel
 * (its empty branch): a column. Nothing selected and nothing pinned: no
 * column. ONE answer: the shell sizes the column by it and InspectorHost.jsx
 * draws the column by it, so the two never disagree.
 *
 * @param {{ viewMode?: string, unitType?: string|null, pinned?: boolean }} at
 * @returns {boolean}
 */
export function inspectorHasContent({ viewMode = '3d', unitType = null, pinned = false } = {}) {
  return viewMode === 'cnc' || Boolean(unitType) || Boolean(pinned);
}

/**
 * How much of the scene's right edge the panels lying over it cover, from the
 * edge inwards: a panel counts when it stands the scene's whole height and its
 * right side touches the edge reached so far (the inspector against the
 * scene's edge, then the BOM or the Check against the inspector; two at one
 * edge, the wider). A floating panel (the Library) is not docked, and a column
 * beside the scene (the inspector in the CNC view) covers none of it. The two
 * bars centre in what is left (studio.css `--studio-dock`). Pure: the
 * rectangles are handed in.
 *
 * @param {{left:number,right:number,top:number,bottom:number,width:number}} scene
 * @param {Array<{left:number,right:number,top:number,bottom:number,width:number}>} panels
 * @returns {number} the px covered, 0 when nothing lies over the scene
 */
function dockedCover(scene, panels = []) {
  if (!scene || !(scene.width > 0)) return 0;
  const tall = panels.filter((r) => r && r.width > 0 && r.top <= scene.top + 1 && r.bottom >= scene.bottom - 1);
  let edge = scene.right;
  for (;;) {
    const touching = tall.filter((r) => Math.abs(r.right - edge) <= 1 && r.left < edge - 1);
    if (!touching.length) break;
    edge = Math.min(...touching.map((r) => r.left));
  }
  return Math.max(0, Math.min(scene.width, Math.round(scene.right - edge)));
}

/**
 * The scene's `--studio-dock`, kept up to date: re-read when a panel is mounted
 * or unmounted (the BOM and the Check in the scene, the inspector beside it in
 * the workspace), when a panel changes width (the BOM's tabs, the inspector at
 * a breakpoint) and when the scene itself is resized. Measured before the
 * frame is painted and written on the scene element's own style, so nothing
 * re-renders and the canvas is never touched.
 */
function useSceneDock(sceneRef) {
  useLayoutEffect(() => {
    const scene = sceneRef.current;
    const workspace = scene?.parentElement;
    if (!scene || !workspace || typeof ResizeObserver !== 'function' || typeof MutationObserver !== 'function') return undefined;
    const panels = () => [
      ...[...scene.children].filter((el) => el.tagName === 'ASIDE'),
      ...[...workspace.children].filter((el) => el.dataset?.studio === 'inspector'),
    ];
    const apply = () => {
      const px = dockedCover(scene.getBoundingClientRect(), panels().map((el) => el.getBoundingClientRect()));
      scene.style.setProperty('--studio-dock', `${px}px`);
    };
    const sizes = new ResizeObserver(apply);
    const watch = () => {
      sizes.disconnect();
      sizes.observe(scene);
      panels().forEach((el) => sizes.observe(el));
      apply();
    };
    const kids = new MutationObserver(watch);
    kids.observe(scene, { childList: true });
    kids.observe(workspace, { childList: true });
    watch();
    return () => { kids.disconnect(); sizes.disconnect(); };
  }, [sceneRef]);
}

export default function StudioShell({
  topBar = null,
  inspector = null,
  sceneEdge = null,
  statusExtras = null,
  renderRailMenu = null,
  children = null,
}) {
  const profile = useCabinetProfileStore((s) => s.profile);
  const mode = useUiStore((s) => s.inspector);
  // U2: what the column would show, read as the host reads it.
  const viewMode = useUiStore((s) => s.viewMode);
  const pinned = useUiStore((s) => s.inspectorPinned);
  const unitId = useUiStore((s) => s.selectedUnitId);
  const unitType = useProjectStore((s) => (unitId ? (s.units.find((u) => u.id === unitId)?.type ?? null) : null));
  const shown = inspectorHasContent({ viewMode, unitType, pinned });
  const viewport = useViewport();
  // The inspector column is 0 when no inspector is handed in (before F4), when
  // it is hidden, or (U2) when it has nothing to show; the root still says the
  // store's mode (`data-inspector`) and, beside it, the column it draws.
  const column = inspector && mode !== 'none' && shown ? mode : 'none';
  // 22:08: in the 3D view the panels lie over the scene; the CNC view keeps its column.
  const overlay = viewMode !== 'cnc';
  const widths = studioWidths(profile, viewport.width);
  const vars = studioCssVars(profile, { viewportWidth: viewport.width, inspector: column });
  // The scene slot, for the rail's Add (the Library is placed in its
  // coordinates), and the layer the rail's popups are drawn in: at the shell's
  // root, after everything, so no column can paint over a popup (the menu
  // layer, lib/modalLayer.js: a menu stands over a window).
  const sceneRef = useRef(null);
  const [popupLayer, setPopupLayer] = useState(null);
  // The visible part of the scene, left of whatever panel lies over it: the bars centre in it.
  useSceneDock(sceneRef);

  return (
    <ChangesBarRehomed.Provider value>
      <div
        className="studio-pro h-full w-full min-w-0 min-h-0 overflow-hidden bg-shell-900"
        data-studio="shell"
        data-studio-shell=""
        data-inspector={mode || 'full'}
        data-inspector-column={column}
        data-scene-under-panels={overlay ? '1' : '0'}
        style={{ ...vars, ...SHELL_GRID }}
      >
        <StudioIcons />
        {topBar}
        {/* U2: the breadcrumb's button stands only where the column it brings back would hold something. */}
        <SelectionBreadcrumb canShowInspector={shown} />
        <div className="studio-workspace min-h-0 min-w-0" data-studio="workspace" style={WORKSPACE_GRID}>
          <StudioRail
            renderMenu={renderRailMenu}
            labels={widths.railLabels}
            sceneRef={sceneRef}
            popupLayer={popupLayer}
          />
          <div ref={sceneRef} data-studio="scene" className="studio-scene relative overflow-hidden min-w-0 min-h-0">
            {/* T84 F6 · the edge first, where the canvas toolbar stands on the
                legacy face: the scene's panels (the Check, the BOM, the
                Library), drawn after it at the same layer, stand over it. */}
            {sceneEdge}
            {children}
          </div>
          {inspector}
        </div>
        <StatusBar extras={statusExtras} viewport={viewport} />
        <div
          ref={setPopupLayer}
          data-studio="popup-layer"
          className={`fixed left-0 top-0 w-0 h-0 overflow-visible ${LAYER_CLASS.menu}`}
        />
      </div>
    </ChangesBarRehomed.Provider>
  );
}
