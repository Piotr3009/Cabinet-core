import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { useProjectStore } from './stores/projectStore.js';
import { modalShellFaults, useUiStore } from './stores/uiStore.js';
import * as exportGate from './engine/cnc/exportGate.js';
import * as drillGuard from './engine/cnc/drillGuard.js';
import * as cncExport from './lib/cncExport.js';
import { useCabinetProfileStore } from './stores/cabinetProfileStore.js';
import { useHistoryStore, watchProjectHistory } from './stores/historyStore.js';
import { useMaterialAssignmentStore } from './stores/materialAssignmentStore.js';
import * as dxf from './engine/cnc/dxf.js';
import * as hardware3d from './engine/hardware3d.js';
import * as runners from './engine/runners.js';
import * as hinges from './engine/hinges.js';
import * as lifts from './engine/lifts.js';
import * as menuPlacement from './lib/menuPlacement.js';
import * as doors from './engine/doors.js';
import * as drawerPilots from './engine/drawerPilots.js';
import * as shelfHeights from './engine/shelfHeights.js';
import * as shelfMagnet from './engine/shelfMagnet.js';
import * as shelfTypes from './engine/shelfTypes.js';
import * as hardwareUrl from './engine/hardwareUrl.js';
import * as storageBase from './lib/storageBase.js';
import * as cornice from './engine/cornice.js';
import * as companyDefaults from './engine/companyDefaults.js';
import * as hardwareSource from './lib/hardwareSource.js';
import * as hardwareHealth from './lib/hardwareHealth.js';
import * as machining from './engine/machining.js';
import * as recesses from './engine/recesses.js';
import * as lighting from './engine/lighting.js';
import * as format from './engine/format.js';
import * as shelfBearers from './engine/shelfBearers.js';
import * as hoverRows from './engine/hoverRows.js';
import * as dimensionArrows from './engine/dimensionArrows.js';
import * as bevel from './3d/bevel.js';
import * as hardwareFinish from './3d/hardwareFinish.js';
import * as decors from './engine/decors.js';
import * as dimensions from './engine/dimensions.js';
import * as frontDimensions from './engine/frontDimensions.js';
import { useCompanyDefaultsStore } from './stores/companyDefaultsStore.js';

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
  // ─── Turn 21 (CLAUDE.md R4 / F1.4 / F7 / F10 / F11 / F12) ───
  // The same reason a fifth time. THIS turn's gate is a pair of drilled holes,
  // and R4 says a URL is proven by asking the APP for it — so the walk asks
  // these, which are the very functions the scene and the CNC sheet ask. All
  // pure; the mount registry that goes with them is `window.__cc.hardware`,
  // published by 3d/hardwareRegistry.js from the scene itself.
  window.__ccT21 = {
    doors, drawerPilots, shelfHeights, shelfMagnet, shelfTypes, hardwareUrl, storageBase,
  };
  window.__ccLifts = lifts;
  window.__ccPlacement = menuPlacement;
  // ─── Turn 22 (CLAUDE.md F1 / F2 / F3 / R4) ───
  // The same reason a sixth time, for this turn's four questions. The CORNICE
  // is pure geometry and the walk checks the run, the stop and the 45° against
  // the very functions the 3D sweeps from; the CASCADE is what a claim about a
  // company row has to be read off; and the HARDWARE SOURCE and HEALTH are R4
  // again — "models loaded / expected" is asserted against the registries, not
  // against the pixels that print them.
  window.__ccT22 = {
    cornice, companyDefaults, hardwareSource, hardwareHealth,
  };
  window.__cc.company = useCompanyDefaultsStore;
  // ─── Turn 26 (CLAUDE.md R10 / R11 / F10) ───
  // The same reason a seventh time, and R10 makes it sharper than it has ever
  // been: the turn's central claim is that THE SCENE RENDERS THE RECORD. A walk
  // that photographed a hole would be proving a picture; a walk that asks
  // `recesses.panelRecesses` — the very function `3d/panelSolid.js` builds the
  // cut faces from — and compares it with the panel's own `cnc` and `drills` is
  // proving the parity itself. `machining` is the per-class policy those two
  // agree through, and `lighting` is F10's "compute it, do not eyeball it" —
  // the walk reads the before/after sum out of the running scene rather than
  // recomputing it beside the app. All pure; none reaches anything the page
  // could not already compute.
  window.__ccT26 = {
    machining, recesses, lighting, format,
  };
  // ─── Turn 27 (CLAUDE.md F1 / F4 / R4) ───
  // The same reason an eighth time, for this turn's two questions that are
  // arithmetic rather than pixels. F1's whole claim is that a shelf drills the
  // two boards that CARRY it, so the walk asks `shelfBearers` — the very
  // resolution the drilling pass and the dimension chain both go through —
  // rather than reading a hole off a picture. F4's is that the label palette is
  // ONE decision read from the profile, so the walk asks `dimensionStyle`, the
  // call the component makes. Both pure; neither reaches anything the page
  // could not already compute.
  window.__ccT27 = {
    shelfBearers, hoverRows, dimensionArrows,
  };
  // ─── Turn 28 (CLAUDE.md F3 / F4 / F5 / F7 / F8 / R4) ───
  // The same reason a ninth time, for the five questions this turn answers
  // with arithmetic rather than with pixels.
  //
  //   `shelfHeights`     F3: which BAY a shelf is in and which flank its
  //                      ladder stands on, asked of the very function the view
  //                      feeds the one dimension component from.
  //   `bevel`            F4: the blend band the shader is COMPILED with, so
  //                      the walk reads the number rather than a screenshot's
  //                      opinion of it.
  //   `hardwareFinish`   F5: one colour source for the sleeve, the pin and the
  //                      collar — asked of the resolver all three call.
  //   `decors`           F7: which way the grain runs on a piece, off the same
  //                      pair of functions `3d/materials.js` places with.
  //   `dimensions`       F8.2: WHICH cabinet of a run carries the chain, off
  //                      the function the scene asks.
  //   `frontDimensions`  F8.3/F8.4: where a front's two labels sit.
  //
  // All pure; none reaches anything the page could not already compute.
  window.__ccT28 = {
    shelfHeights, bevel, hardwareFinish, decors, dimensions, frontDimensions,
  };
  // ─── Turn 31 (CLAUDE.md F1) ───
  // The shell's own guard, published for the same reason every reader above is:
  // R4 says a claim is proven by asking the APP. "No modal opened without
  // knowing what it is about" is a claim about a session, and this is the
  // session's own record of it — the guard SPEAKS (rule 4) and this is where
  // it can be heard from outside.
  window.__cc.modalFaults = modalShellFaults;
  // ─── Turn 31 (CLAUDE.md F3 / R4) ───
  // The two the export gate is made of, published for the same reason every
  // reader above is: a claim about what the EXPORT does has to be read off the
  // functions the export button calls, not off a re-implementation beside it.
  window.__ccT31 = { exportGate, drillGuard, cncExport };
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
