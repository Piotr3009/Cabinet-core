import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/tokens.css';
import './styles/base.css';
import './styles/scale.css';
import './styles/room.css';
import './styles/roomeditor.css';
import './styles/copies.css';
import { setPersistence } from '../stores/persistence.js';
import { setChromePart, setProChrome } from '../3d/chrome.js';
import { setPickMode } from '../3d/picking.js';
import { loadDecors } from './decorPack.js';

// ─── PRIME BESPOKE INTERIORS · THE ENTRY, AND ITS ORDER ────────────────────
//
// THE ORDER OF THE NEXT TWENTY LINES IS THE WHOLE POINT OF THEM.
//
// `projectStore.js` reads PRO's localStorage cache while it is still being
// EVALUATED — `const cached = persistenceOn() && localStorage.getItem(...)` at
// its top level, before any store exists. A static `import` of the retail app
// would hoist above everything here and that read would already have happened.
//
// So: the two switches are thrown first, against modules that import nothing
// (`stores/persistence.js` and `3d/chrome.js` have no imports at all), and the
// application arrives by DYNAMIC import afterwards. That is not a style
// choice — it is the only ordering in which a client cannot open the
// workshop's last kitchen.
//
//   persistence 'none'  — no localStorage read, none written, no Supabase.
//   proChrome  false    — no dimension chips, hinge rings, LED icons, `+`
//                         markers, share-out bar, ruler or drill rings.
//
// PRO calls neither, so PRO is exactly what it was.

setPersistence('none');
setProChrome(false);

// ─── T60 F2 · AND THEN THE THREE CHANNELS THE VIEW BAR OWNS ────────────────
//
// The owner: *"nr 4 musi być identyczne jak mamy w PRO, identyczne ma mieć
// funkcje."* PRO's bar carries Show dimensions, Front dimensions, Outlines,
// X-ray and Measure — and all five draw through components the line above
// switched off wholesale. Left like that, five buttons would have flipped a
// store flag and changed nothing on the glass: the DEAD CONTROL the standing
// law forbids.
//
// A channel says only that this application OWNS the overlay. What decides
// whether it is SHOWING is the store flag it was always gated by
// (`showDimensions`, `showFrontDimensions`, `showOutlines`, `xray`,
// `rulerOn`) — every one of which the design room sets to false at boot, so
// the first frame is exactly the clean stage t59 shipped.
//
// Said HERE, beside the master switch, and for the same reason: these are
// boot-time constants, read by guards that sit before their components' hooks.
// A value that changed between renders would change a hook count.
setChromePart('dimensions', true);   // DimLabel · DimensionChain · DistanceArrows
setChromePart('outlines', true);     // the contour pass — Outlines, and what holds an X-ray together
setChromePart('measure', true);      // the Ruler

// ─── T61 F1 · AND THEN THE REMAINING EIGHT ─────────────────────────────────
//
// The owner, asked which of the tool's overlays a client should get back:
// *"takwlacz praktycznei wszystko"* · *"1 all 8, 2 - jal dzis"*. So all eight,
// through the channel T60 built, set immediately after the three that are
// already there — one working pattern, not two.
//
// *"2 — jak dziś"* is the second half and it is the load-bearing half: the
// CHANNEL says only that this application owns the overlay. What decides
// whether it is SHOWING is the store flag PRO already gates it by, reached
// through the same VIEW BAR buttons (T60's law: retail's bar IS PRO's, 1:1).
// Where PRO has no toggle, the overlay is simply on, exactly as it is for a
// joiner. NOT ONE NEW BUTTON is invented here.
//
// Boot-time constants, for the reason the header above gives: these guards sit
// BEFORE their components' hooks, and a value that changed between renders
// would change a hook count. Set once, here, before the first render.
setChromePart('drill', true);        // DrillRings — shelf pins and every CNC hole
setChromePart('plus', true);         // AddPlus — the `+` markers beside and on a unit
setChromePart('machining', true);    // PartMachining — machining on a single opened part
setChromePart('led-icons', true);    // LedIcons — the LED mounting icons
setChromePart('hover-dims', true);   // HoverDimensions — the figures under the cursor
setChromePart('edge', true);         // EdgeHandle — the drag handles on a unit's edges
setChromePart('hover', true);        // UnitView — the shelf-gap readout under the cursor
// ShareOutBar, and it is the one that needs saying out loud.
//
// Channel `true` per *"all 8"* — wired exactly like the seven above. But it has
// no entry of its own and cannot be given one: its ONE trigger is
// `uiStore.shareOutOffer`, and the ONLY thing that raises it is
// `projectStore.settleLayout` finding a shareable GAP inside a RUN — two or
// more cabinets standing side by side on ONE wall with air between them
// (`engine/shareOut.js shareOutOffered`). Tonight's retail room cannot make
// one: it starts with a single wardrobe, and F2's ADD WARDROBE ON WALL 2 puts
// the second one round the corner, so there is never a run to share out.
//
// So the bar is not dead — the moment the shared core raises an offer it draws,
// and its buttons call the store's own `shareOutRun` and `dismissShareOut`.
// It is simply UNREACHABLE from the entries this turn ships, and that is stated
// here and in the PR body rather than hidden by gating the channel off or by
// inventing a retail button for a workshop's layout operation.
setChromePart('share', true);        // ShareOutBar — the share-out bar

// ─── T63 F1 · AND THE TWELFTH: HINGES AND RUNNERS, IN EVERY VIEW ───────────
//
// The owner: *"nadal nie widać zawiasów"* → *"1 — zawiasy zawsze"*.
// `src/3d/Hardware.jsx` keeps its law — hinges and runners are X-RAY ONLY,
// because a working view of a cabinet is not a hardware drawing — and reads
// this channel beside it. The client is buying the hardware and wants to see
// it. PRO sets no channel and never calls `setProChrome`, so PRO's two
// conditions still read exactly what they read last night; the channel only
// counts once the master switch above is OFF, which is this page and no other.
// Runners come with hinges — same law, same channel, one decision.
setChromePart('hardware-always', true); // Hardware — hinge plates and runners, Solid included

// ─── T60 F3 · AND A SINGLE CLICK REACHES A DOOR ────────────────────────────
//
// *"jak naciśniemy na drzwi to się pojawi drzwi."* PRO's single click selects
// the CABINET and a leaf is reached by double-clicking it — turn 13's verdict
// and turn 14's gesture, both right for a bench. A client double-clicks
// nothing. `setPickMode('client')` asks `engine/elements.js` the OTHER
// question it already answers (`opensOwnModal` rather than
// `isMainViewElement`), so the set of clickable pieces is the set PRO's double
// click already opens and only the gesture differs. PRO sets no mode.
setPickMode('client');

// ─── T63 F1 · THE HARDWARE CATALOGUES, AS PRO'S App.jsx LOADS THEM ─────────
//
// The owner: *"nadal nie widać zawiasów."* And the reason, found by the walk
// rather than by reading: a hinge on screen is *"the downloaded GLB or
// nothing"* (T36), and the GLB is named by the CLIP top CATALOGUE — which PRO's
// `App.jsx` hands the engine at module scope (`loadHardwareCatalogues()`) and
// this entry never did. With no catalogue `hingeFamilies` answers nothing,
// `resolveDoorHinge` finds no article, no article names no file, and every
// gate `Hardware.jsx` opens draws NOTHING. The same calls, in the same order,
// from the same shared lib: the shipped catalogues, the bucket's own manifests
// as the OVERRULE (`refreshHardwareCatalogues`, App.jsx turn 22 — where the
// bucket names an article, it replaces what shipped), and both asked for again
// the moment the bucket is known, because on this page the bucket is learnt
// from the decor pack, which lands after boot.
//
// They are called INSIDE the dynamic block below, after the two switches and
// before the first render — never as static imports up here, because a static
// import hoists above `setPersistence('none')` and the lib these loaders
// reach is not the import-free two-file graph the switches are held to.

// The EGGER pack, fetched by retail's own loader into the engine's own
// registry. PRO's `src/lib/decorCatalogue.js` does the same thing and is on
// the far side of the iron boundary.
loadDecors();

import('./RetailApp.jsx').then(async (module) => {
  const App = module.default;
  // WHICH DOOR THIS PAGE WAS OPENED THROUGH. `entryAudience()` reads it off the
  // location and answers 'factory' for anything it does not recognise — right
  // for PRO, wrong for here. Said through the store's own setter, and said
  // HERE rather than at the top of this file: a static `import { useUiStore }`
  // would hoist above `setPersistence` and the store's initial state would be
  // built from PRO's localStorage keys before the switch was ever thrown.
  const { useUiStore } = await import('../stores/uiStore.js');
  const { useProjectStore } = await import('../stores/projectStore.js');
  const ui = useUiStore.getState();
  ui.setAudience('retail');

  // T63 F1 · the hardware catalogues, as PRO's App.jsx loads them (see the
  // note above `loadDecors()`): a hinge on screen is the downloaded GLB or
  // nothing, and the GLB is named by these.
  const { loadHardwareCatalogues } = await import('../lib/hardwareCatalogue.js');
  const { refreshHardwareCatalogues } = await import('../lib/hardwareHealth.js');
  const { loadRunnerCatalogue } = await import('../lib/runnerCatalogue.js');
  const { onStorageBase } = await import('../lib/storageBase.js');
  loadHardwareCatalogues();
  loadRunnerCatalogue();
  refreshHardwareCatalogues();
  onStorageBase(() => { loadRunnerCatalogue(); refreshHardwareCatalogues(); });

  // ─── T63 · THE WALK'S OWN HANDLES, AS PRO'S `main.jsx` REGISTERS THEM ────
  // The same two stores every retail component already subscribes to, on the
  // same key PRO uses (`window.__cc.project`, `window.__cc.ui`), beside the
  // stage handle `Stage.jsx` registers under `window.__cc.pbi`. PRO's own
  // words for why: *"the build that gets verified has to be the build that
  // gets used. There is nothing behind it that devtools could not already
  // reach."* Nothing reads them but `scripts/t63-walk.mjs`.
  if (typeof window !== 'undefined') {
    const cc = (window.__cc = window.__cc || {});
    cc.project = useProjectStore;
    cc.ui = useUiStore;
  }

  // ─── THE OVERLAYS THAT ALREADY HAD A SWITCH ──────────────────────────────
  //
  // `setProChrome(false)` above is for the overlays that had NO flag. These
  // five DID — they are PRO's own View menu — so the retail mount turns them
  // off through the store's own setters and the shared core gains nothing.
  //
  //   showDimensions  the room's distance arrows and every wall label
  //   showOutlines    the thin black contour on every board. `captureRender`
  //                   has called that pass "chrome" since turn 6 and strips it
  //                   from any picture a workshop shows a customer; a client
  //                   looking at the live stage is in exactly that position.
  //   xray            a look THROUGH the furniture — a tool, not a view
  //   contourView     a silhouette, for a printout
  //   ruler           a measuring tool
  ui.setShowDimensions(false);
  ui.setShowOutlines(false);
  ui.setXray(false);
  ui.setContourView(false);
  ui.setRuler(false);
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
