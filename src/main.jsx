import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { useProjectStore } from './stores/projectStore.js';
import { useUiStore } from './stores/uiStore.js';
import { useCabinetProfileStore } from './stores/cabinetProfileStore.js';
import { useHistoryStore, watchProjectHistory } from './stores/historyStore.js';

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
    project: useProjectStore, ui: useUiStore, profile: useCabinetProfileStore, history: useHistoryStore,
  };
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
