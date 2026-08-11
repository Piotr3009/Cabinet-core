import { useEffect } from 'react';
import ConfiguratorPage from './pages/ConfiguratorPage.jsx';
import StartScreen from './components/StartScreen.jsx';
import Toast from './components/Toast.jsx';
import { useUiStore } from './stores/uiStore.js';
import { loadDecorCatalogue } from './lib/decorCatalogue.js';
import { loadRunnerCatalogue } from './lib/runnerCatalogue.js';
import { onStorageBase } from './lib/storageBase.js';
import { loadHardwareCatalogues } from './lib/hardwareCatalogue.js';
import { refreshHardwareCatalogues } from './lib/hardwareHealth.js';

// ─── THE KNOWLEDGE FILES (turn 19, CLAUDE.md F0.3) ──────────────────────────
//
// The four catalogues under `reference/hardware/` ship WITH the app, so unlike
// the decor pack and the runner manifest there is nothing to wait for and
// nothing that can fail. Handing them to the engine at module scope rather than
// in an effect is therefore the honest shape: by the time the first cabinet is
// computed the hinge rule is in place, and no cabinet is ever computed against
// a half-loaded catalogue and then quietly recomputed against a full one.
loadHardwareCatalogues();

// Two screens (turn 4, BACKLOG #7): the start screen, and the project.
// The canvas is only ever reached THROUGH a project, so a drawing always
// belongs to something that can be saved and reopened.
export default function App() {
  const screen = useUiStore((s) => s.screen);

  // The decor pack, once, at the top (turn 5, BACKLOG #19). It is loaded here
  // and not in the picker because a SAVED project can already be finished in an
  // EGGER decor: without the catalogue in hand the 3D view would fall back to
  // broken white and the BOM would name nothing. One small JSON; the thumbnails
  // stay lazy and are only fetched by the picker when it is opened.
  useEffect(() => { loadDecorCatalogue(); }, []);

  // …and the runner manifest, for the same reason and in the same place (turn
  // 18, CLAUDE.md F6.1/F6.8): a saved project's drawers are already fitted with
  // a runner, and the BOM has to be able to name the article. One small JSON;
  // the 40 models stay unfetched until a drawer actually needs one. It never
  // rejects — mock mode and a dead bucket both resolve to "no catalogue", and
  // the app draws its own profile and orders by spec.
  // ─── Turn 21 (CLAUDE.md F2) ───
  // …and again the moment the app learns where its own storage is. On a build
  // made without `VITE_SUPABASE_URL` the host is DERIVED from the decor pack,
  // which lands after this effect has already run — so the first ask honestly
  // finds no bucket, and this is the second one. Without it the owner's build
  // draws grey stand-ins for the whole session with nothing to say why.
  useEffect(() => {
    loadRunnerCatalogue();
    return onStorageBase(() => { loadRunnerCatalogue(); });
  }, []);

  // ─── THE DATA MODULE (turn 22, CLAUDE.md F2a) ───────────────────────────
  //
  // `cc_hardware`, parked since turn 15. The repository catalogues are already
  // in the engine's registries by the time this runs (module scope, above), so
  // this is the OVERRULE and not the load: where the owner has seeded a row,
  // it replaces what shipped; where he has not, nothing happens at all and the
  // app is exactly what it was.
  //
  // It is deliberately not awaited by anything: a cabinet computed a moment
  // before the row lands is computed against the catalogue that ships, which
  // is the same catalogue it would have had yesterday.
  useEffect(() => { refreshHardwareCatalogues(); }, []);


  if (screen === 'start') {
    return (
      <>
        <StartScreen />
        {/* The start screen can fail to open a project, and has to be able to
            say so — the configurator's own Toast is not mounted yet. */}
        <Toast />
      </>
    );
  }
  return <ConfiguratorPage />;
}
