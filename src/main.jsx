import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { useProjectStore } from './stores/projectStore.js';
import { modalShellFaults, useUiStore } from './stores/uiStore.js';
import * as exportGate from './engine/cnc/exportGate.js';
import * as drillGuard from './engine/cnc/drillGuard.js';
import * as cncExport from './lib/cncExport.js';
import * as frontClearance from './engine/frontClearance.js';
// Turn 32 (CLAUDE.md F5): the invoice, readable from the walk (R4 — a claim
// about the BOM is proven by asking the app's own functions).
import * as bomInvoice from './engine/bomInvoice.js';
import * as bomCore from './engine/bom.js';
import * as exporters from './lib/exporters.js';
import * as autoAssign from './engine/autoAssign.js';
import * as partRegistry from './engine/partRegistry.js';
// Turn 32 (CLAUDE.md F6): the register, drivable from the walk — mock mode's
// null answers and a seeded row's overrule are both claims about the APP.
import * as hardwareRegister from './lib/hardwareRegister.js';
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
// TURN 40: the modules the walk asks about (see `window.__ccT40` below).
import * as hingeLadder from './engine/hingeLadder.js';
import * as grain from './engine/grain.js';
import * as drawerRef from './engine/drawerRef.js';
import * as drawingLayers from './engine/drawings/layers.js';
import * as wallElevation from './engine/drawings/wallElevation.js';
import * as wallSheets from './engine/drawings/wallSheets.js';
// TURN 42 (CLAUDE.md F0): the export's own byte assertions, asked by the walk.
import * as drawingExport from './lib/drawingExport.js';
import * as drawingsDxf from './engine/drawings/dxf.js';
import * as overlayDrawers from './engine/overlayDrawers.js';
import * as checks from './engine/checks.js';
import * as dimensions from './engine/dimensions.js';
import * as frontDimensions from './engine/frontDimensions.js';
// Turn 34 (CLAUDE.md F1/F4/F7/F8): the four readers the acceptance walk asks.
import * as projectSettings from './engine/projectSettings.js';
import * as shoeBox from './engine/shoeBox.js';
import * as deleteElement from './engine/deleteElement.js';
import * as shaker from './engine/shaker.js';
import * as design from './engine/design.js';
// Turn 35 (CLAUDE.md F4): the context guard's own counters, readable before the
// first canvas has mounted — see below.
import * as contextGuard from './3d/contextGuard.jsx';
// ─── Turn 37 (CLAUDE.md F1/F2/F7): the three readers this turn's walk asks ──
import * as layout from './engine/cnc/layout.js';
import * as railAssembly from './engine/railAssembly.js';
import * as selection from './lib/selection.js';
// ─── TURN 44 (CLAUDE.md F1/F2/F5/F8): the four readers THIS turn's walk asks ─
import * as wizardTabs from './lib/wizardTabs.js';
import * as wallElements from './lib/wallElements.js';
import * as frontOpening from './lib/frontOpening.js';
import * as settingsSetsDb from './lib/settingsSetsDb.js';
// ─── TURN 45 (CLAUDE.md F1/F2/F5/F7/F9): the readers THIS turn's walk asks ──
import * as appEntry from './lib/appEntry.js';
import * as wizardConflicts from './lib/wizardConflicts.js';
import * as pushToOpen from './lib/pushToOpen.js';
import * as ledSpec from './lib/ledSpec.js';
import * as ledDrivers from './lib/ledDrivers.js';
import * as ledGroove from './lib/ledGroove.js';
import * as ledStrips from './engine/ledStrips.js';
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
  window.__ccT31 = { exportGate, drillGuard, cncExport, frontClearance };
  // ─── Turn 32 (CLAUDE.md F5/F6) ───
  window.__ccT32 = { bomInvoice, bomCore, hardwareRegister };
  // ─── Turn 34 (CLAUDE.md F1/F4/F7/F8) ───
  // Four readers the walk has to ask questions OF, for the same reason every
  // one above is here: a claim about the wizard's GATE has to be read off the
  // function the Save button is disabled by, a claim about the shoe box off
  // the module that mirrors the kit, a claim about what Delete removes off the
  // decision both doors run, and a claim about the shaker pin off the function
  // `loadProject` calls. All four are pure.
  window.__ccT34 = {
    projectSettings, shoeBox, deleteElement, shaker, design,
  };
  // ─── Turn 35 (CLAUDE.md F4) ───
  // The WebGL guard, for the same reason every reader above is here: F4's proof
  // is "one canvas and zero loseContext errors after ten flips", and that is a
  // claim about the APP's own bookkeeping rather than about pixels. `__cc.diag`
  // has counted since turn 20 but is BUILT by the first canvas to mount, so a
  // walk that reads it too early cannot tell "no contexts" from "no counter" —
  // `contextDiagnosis()` makes it on demand and answers the same object.
  window.__ccT35 = { contextGuard };
  // ─── Turn 37 (CLAUDE.md F1/F2/F7) ───
  // Three readers this turn's walk has to ask questions OF, for the same
  // reason every one above is here — a claim is proven by asking the APP, off
  // the function the app itself calls, never off a re-implementation beside
  // it. `layout` answers WHICH WAY a part goes down on the sheet (F7a),
  // `railAssembly` answers where the rod hangs under its shelf (F2), and
  // `selection` is how a cross-cabinet member is spelled (F1) — a walk that
  // parsed the key itself would be a second copy of the separator. All pure.
  window.__ccT37 = { layout, railAssembly, selection };
  // ─── Turn 39 (CLAUDE.md F1/F5) ───
  // The registry and the purchase-list engine, for the same reason every reader
  // above is here: the walk's claim about what a BOM contains has to be read
  // off the function the BOM VIEW calls, never off a second copy beside it.
  // `bomCore` (turn 32) already exposes `engine/bom.js`; this names the two new
  // things by the turn that added them so a reader of the walk can find them.
  // `csv` is the purchase list's own writer, so the walk can prove the FILE
  // and the SCREEN carry the same numbers off the same call.
  // ─── TURN 40 ───────────────────────────────────────────────────────────
  // What the acceptance walk has to be able to ASK rather than guess: the one
  // post-split hinge ladder (F1), the single grain source and its reader (F2),
  // the wall drawing set and its DXF (F5), the overlay stack's law (F3b), the
  // rail's mount (F6) and the check definition both surfaces render (F4a).
  // All pure, all already reachable from the page.
  window.__ccT40 = {
    hingeLadder,
    layout,
    decors,
    grain,
    wallElevation,
    wallSheets,
    drawingsDxf,
    overlayDrawers,
    railAssembly,
    checks,
  };
  // ─── TURN 41 ───────────────────────────────────────────────────────────
  // Two pure decisions the walk has to be able to ask about, for the same
  // reason every reader above is here: a claim that "the height field moves
  // the board" has to be read off the SAME lookup the properties panel uses,
  // and a claim about line weight has to be read off the single resolver both
  // renderers call. `layout`, `decors` and `grain` are already on __ccT40.
  window.__ccT41 = { drawerRef, drawingLayers };
  // ─── TURN 42 ───────────────────────────────────────────────────────────
  // What THIS turn's walk has to be able to ask rather than infer:
  //   F0  the wall set's own census (which cabinet was left off which wall and
  //       why) and the export's byte assertions, so a claim about the PAPER is
  //       read off the bytes and a claim about the SCREEN off the same reader
  //       the window renders from.
  //   F1  the rail's mount law — `railAssembly` is already on `__ccT40`; what
  //       is new is that an ALONE rod is a first-class branch, and the walk
  //       asks the PANEL LIST for that (rule 6: prove the thing, not the field).
  //   F2  the runner channel — already `window.__ccRunners` and
  //       `window.__ccHardware3d`, which is exactly the point: the overlay
  //       stack goes through the same two.
  window.__ccT42 = { wallSheets, drawingExport };
  // ─── TURN 44 ───────────────────────────────────────────────────────────
  // The same reason every reader above is here, for this turn's four claims:
  //
  //   `tabs`      F2's whole rule. "Retail renders zero factory nodes" is a
  //               claim about a TREE and a FILTER, so the DOM audit asks the
  //               very table the surface draws from — a walk that listed the
  //               hidden nodes itself would be a second copy of the map.
  //   `wall`      F1's elevation arithmetic, so a claim about where a slope
  //               cuts the wall is read off the function that draws it.
  //   `opening`   F5's four buttons, and WHICH field each of them writes.
  //   `sets`      F8's amber note — a claim that the app degraded gracefully
  //               is read off the layer that decided it did.
  //
  // All four are pure and reach nothing the page could not already compute.
  window.__ccT44 = {
    tabs: wizardTabs, wall: wallElements, opening: frontOpening, sets: settingsSetsDb,
  };
  // ─── TURN 45 ───────────────────────────────────────────────────────────
  // The same reason every reader above is here, for this turn's five claims:
  //
  //   `entry`     F2's whole rule. "Which door was this opened through" is a
  //               claim about a ROUTE, so the walk asks the function the store
  //               asked rather than reading a word off the screen.
  //   `conflicts` F7. A red note and a jump are a claim about a READING of the
  //               project, and this is the reader both surfaces ask.
  //   `pushToOpen` F5's lock, and the one sentence under it.
  //   `wall`      F1a's dimension chains and F1b's plan elements.
  //   `ledSpec` / `ledDrivers` / `ledGroove`
  //               F9's groove width, its driver arithmetic and the CUT — so
  //               "the DXF carries a groove" is read off the very function the
  //               export calls, never off a picture of a DXF.
  //
  // All pure, and none reaches anything the page could not already compute.
  window.__ccT45 = {
    entry: appEntry,
    conflicts: wizardConflicts,
    pushToOpen,
    wall: wallElements,
    ledSpec,
    ledDrivers,
    ledGroove,
    // The strip geometry the 3D draws and the BOM counts, so the walk can
    // prove a claim about a CUT off the very function the export calls.
    strips: ledStrips,
    grooveWidth: ledSpec.grooveWidthMm,
  };
  window.__ccT39 = {
    partRegistry,
    bom: bomCore,
    csv: exporters.buildPurchaseBomCsvText,
    autoAssign,
    // F7: the gate is a pure function, so the walk asks IT rather than guessing
    // from a disabled button.
    settings: projectSettings,
    heights: design.projectHeights,
  };
}

// ─── Undo / redo (turn 12, CLAUDE.md F9) ───
// One subscriber, started once, for the life of the tab. It watches the project
// store rather than being called by it — see stores/historyStore.js for why.
watchProjectHistory();

// ─── STRICT MODE STAYS (turn 35, CLAUDE.md F4) ──────────────────────────────
//
// It is named here because it is half of F4's cause and the next person to read
// that finding will come looking for it. In DEVELOPMENT React runs every effect
// once, tears it down and runs it again — a "simulated unmount" that touches no
// DOM. Two things used to happen on that second pass and both of them killed a
// canvas that was not going anywhere:
//
//   • `3d/contextGuard.jsx` released the context, because a cleanup had run;
//   • `@react-three/fiber`'s `unmountComponentAtNode` scheduled its 500 ms
//     teardown timer, which then force-lost the context and disposed the scene
//     the still-visible tree was drawing.
//
// Both are answered in `3d/contextGuard.jsx` — a canvas still in the document
// is React looking twice, and r3f's late call is defused — rather than by
// taking this wrapper off. StrictMode is a development check that finds exactly
// this class of bug, and it found this one. It compiles out of the production
// bundle by itself; nothing here is a cost the owner's build pays.
createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
