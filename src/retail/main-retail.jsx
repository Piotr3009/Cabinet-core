import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/tokens.css';
import './styles/base.css';
import './styles/scale.css';
import './styles/room.css';
import { setPersistence } from '../stores/persistence.js';
import { setChromePart, setProChrome } from '../3d/chrome.js';
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
  const ui = useUiStore.getState();
  ui.setAudience('retail');

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
