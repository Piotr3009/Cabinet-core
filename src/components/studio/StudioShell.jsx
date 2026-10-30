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
//   inspector      the inspector column (F4); absent, or 'none', the column is 0
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

import { useEffect, useRef, useState } from 'react';
import './studio.css';
import { useUiStore } from '../../stores/uiStore.js';
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
  const viewport = useViewport();
  // The inspector column is 0 when no inspector is handed in (before F4) or
  // when it is hidden; the root still says the store's mode (`data-inspector`).
  const column = inspector && mode !== 'none' ? mode : 'none';
  const widths = studioWidths(profile, viewport.width);
  const vars = studioCssVars(profile, { viewportWidth: viewport.width, inspector: column });
  // The scene slot, for the rail's Add (the Library is placed in its
  // coordinates), and the layer the rail's popups are drawn in: at the shell's
  // root, after everything, so no column can paint over a popup (the menu
  // layer, lib/modalLayer.js: a menu stands over a window).
  const sceneRef = useRef(null);
  const [popupLayer, setPopupLayer] = useState(null);

  return (
    <ChangesBarRehomed.Provider value>
      <div
        className="studio-pro h-full w-full min-w-0 min-h-0 overflow-hidden bg-shell-900"
        data-studio="shell"
        data-studio-shell=""
        data-inspector={mode || 'full'}
        style={{ ...vars, ...SHELL_GRID }}
      >
        <StudioIcons />
        {topBar}
        <SelectionBreadcrumb />
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
