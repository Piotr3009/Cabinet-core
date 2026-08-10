import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { useProjectStore } from './stores/projectStore.js';
import { useUiStore } from './stores/uiStore.js';
import { useCabinetProfileStore } from './stores/cabinetProfileStore.js';
import { useHistoryStore, watchProjectHistory } from './stores/historyStore.js';
import { useMaterialAssignmentStore } from './stores/materialAssignmentStore.js';
import * as dxf from './engine/cnc/dxf.js';
import * as hardware3d from './engine/hardware3d.js';
import * as runners from './engine/runners.js';
import * as hinges from './engine/hinges.js';
import * as lifts from './engine/lifts.js';
import * as menuPlacement from './lib/menuPlacement.js';

// ─── The end-to-end handle (turn 11, CLAUDE.md F10) ─────────────────────────
//
// Browser verification is a STANDARD phase from turn 11 on — "a feature that was
// never seen in a browser is not done" — and a walk that can only click is a
// walk that can only photograph. This is what lets it MEASURE: the acceptance
// script (scripts/e2e-turn11.mjs) reads the shelf positions the 3D is drawing
// from, the width the engine cut a pinned filler to, and whether X-ray is still
// on after a drag and an orbit, instead of inferring any of it from pixels.
//
// It ships in the production bundle deliberately, and that is the whole point:
// the build that gets verified has to be the build that gets used. There is
// nothing behind it that devtools could not already reach — these are the same
// three stores every component in the app subscribes to, and the app has no
// server-side authority for them to speak for.
if (typeof window !== 'undefined') {
  window.__cc = {
    project: useProjectStore,
    ui: useUiStore,
    profile: useCabinetProfileStore,
    history: useHistoryStore,
    // Turn 15 (CLAUDE.md F9): the CNC "by material" view is a claim ABOUT the
    // assignments, so the walk has to be able to make some before it can check
    // that the sheet splits on them. Same store, same rule as the other four.
    materials: useMaterialAssignmentStore,
  };
  // ─── Turn 18 (CLAUDE.md F7) ───
  // Three ENGINE modules the walk has to be able to ask questions of, for the
  // same reason the stores are here: a claim about a FILE has to be read off
  // the file, a claim about where a runner sits has to be read off the same
  // function the scene draws from, and a claim about a missing bucket has to be
  // read off the registry that is missing it. All three are pure and reach
  // nothing the page could not already compute.
  window.__ccDxf = dxf;
  window.__ccHardware3d = hardware3d;
  window.__ccRunners = runners;
  // ─── Turn 19 (CLAUDE.md F6) ───
  // The same three reasons again, for this turn's three engines: a claim about
  // WHICH HINGE a door takes is read off the resolver the BOM and the 3D both
  // use; a claim about a LIFT is read off the selection engine, which has no UI
  // this turn and could otherwise only be checked in node; and the placement
  // arithmetic is read off the same pure function the shell places with. All
  // pure, all reaching nothing the page could not already compute.
  window.__ccHinges = hinges;
  window.__ccLifts = lifts;
  window.__ccPlacement = menuPlacement;
}

// ─── Undo / redo (turn 12, CLAUDE.md F9) ───
// One subscriber, started once, for the life of the tab. It watches the project
// store rather than being called by it — see stores/historyStore.js for why.
watchProjectHistory();

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
