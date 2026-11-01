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
// the inspector column is not drawn and the scene takes the whole width; a
// cabinet or a part selected, the column comes back and the scene narrows. The
// owner: *"niech sie zweza, nie chce ustawiac sceny od nowa"*. Only the grid's
// third column changes (`--studio-inspector`, 0 or the panel's width): the
// scene slot below and the canvas inside it stay mounted, so the canvas is
// resized as it is when the window is resized, and the camera stays where it
// is (@react-three/fiber makes its camera once, at the canvas's creation, and
// a new size only sets its aspect).

import { useEffect, useRef, useState } from 'react';
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
 * THE UX TURN, U2, after Ewa's check of the BOM frame: how much of the scene's
 * right edge a DOCKED panel covers. A docked panel is a direct `<aside>` of
 * the scene standing against its right edge for its whole height (the BOM and
 * the Check, both `absolute right-0 top-0 bottom-0`); the widest one wins. A
 * floating panel (the Library) is not docked. The scene then narrows for it as
 * it narrows for the inspector (studio.css `--studio-dock`): the canvas, the
 * same one with its camera, ends where the panel begins and the two bars centre
 * in what is left. Pure: the rectangles are handed in.
 *
 * @param {{left:number,right:number,top:number,bottom:number,width:number}} scene
 * @param {Array<{left:number,right:number,top:number,bottom:number,width:number}>} asides
 * @returns {number} the px covered, 0 when nothing is docked
 */
function dockedCover(scene, asides = []) {
  if (!scene || !(scene.width > 0)) return 0;
  let cover = 0;
  for (const r of asides) {
    if (!r || !(r.width > 0)) continue;
    const againstRight = Math.abs(r.right - scene.right) <= 1;
    const wholeHeight = r.top <= scene.top + 1 && r.bottom >= scene.bottom - 1;
    if (againstRight && wholeHeight) cover = Math.max(cover, scene.right - r.left);
  }
  return Math.max(0, Math.min(scene.width, Math.round(cover)));
}

/**
 * The scene's `--studio-dock`, kept up to date: re-read when a panel is mounted
 * or unmounted in the scene (the BOM, the Check), when a docked panel changes
 * width (the BOM's tabs) and when the scene itself is resized. Written on the
 * scene element's own style, so nothing re-renders and the canvas is only
 * resized, never mounted again.
 */
function useSceneDock(sceneRef) {
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || typeof ResizeObserver !== 'function' || typeof MutationObserver !== 'function') return undefined;
    const asides = () => [...scene.children].filter((el) => el.tagName === 'ASIDE');
    const apply = () => {
      const px = dockedCover(scene.getBoundingClientRect(), asides().map((el) => el.getBoundingClientRect()));
      scene.style.setProperty('--studio-dock', `${px}px`);
    };
    const sizes = new ResizeObserver(apply);
    const watch = () => {
      sizes.disconnect();
      sizes.observe(scene);
      asides().forEach((el) => sizes.observe(el));
      apply();
    };
    const kids = new MutationObserver(watch);
    kids.observe(scene, { childList: true });
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
  const widths = studioWidths(profile, viewport.width);
  const vars = studioCssVars(profile, { viewportWidth: viewport.width, inspector: column });
  // The scene slot, for the rail's Add (the Library is placed in its
  // coordinates), and the layer the rail's popups are drawn in: at the shell's
  // root, after everything, so no column can paint over a popup (the menu
  // layer, lib/modalLayer.js: a menu stands over a window).
  const sceneRef = useRef(null);
  const [popupLayer, setPopupLayer] = useState(null);
  // U2: a docked panel (the BOM, the Check) narrows the visible scene as the inspector does.
  useSceneDock(sceneRef);

  return (
    <ChangesBarRehomed.Provider value>
      <div
        className="studio-pro h-full w-full min-w-0 min-h-0 overflow-hidden bg-shell-900"
        data-studio="shell"
        data-studio-shell=""
        data-inspector={mode || 'full'}
        data-inspector-column={column}
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
