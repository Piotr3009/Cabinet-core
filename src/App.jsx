import { LAYER_CLASS } from './lib/modalLayer.js';
import { useEffect } from 'react';
import ConfiguratorPage from './pages/ConfiguratorPage.jsx';
import StartScreen from './components/StartScreen.jsx';
import Messages from './components/Messages.jsx';
import { useUiStore } from './stores/uiStore.js';
import { useProjectStore } from './stores/projectStore.js';
import { UNSAVED_MESSAGE } from './engine/messages.js';
import { loadDecorCatalogue } from './lib/decorCatalogue.js';
import { loadRunnerCatalogue } from './lib/runnerCatalogue.js';
import { onStorageBase } from './lib/storageBase.js';
import { loadHardwareCatalogues } from './lib/hardwareCatalogue.js';
import { refreshHardwareCatalogues } from './lib/hardwareHealth.js';
import { loadHardwareRegister } from './lib/hardwareRegister.js';
import { useSettingsSetsStore } from './stores/settingsSetsStore.js';

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

  // ─── THE HARDWARE REGISTER (turn 32, CLAUDE.md F6) ──────────────────────
  // The registry of EXISTENCE — which articles the automat may write into
  // the BOM. Loaded once, never awaited, never blocking: mock mode or no
  // table leaves an empty cache, every lookup answers null, and the BOM's
  // yellow named-spec lines do the honest talking.
  useEffect(() => { loadHardwareRegister(); }, []);

  // ─── THE SAVED SETTINGS SETS (turn 44, CLAUDE.md F8) ────────────────────
  // `cc_settings_sets`, asked once and never awaited. Mock mode, no session or
  // a database that has not had `supabase/migrations/t44_settings_sets.sql` run
  // against it are the same quiet answer: the store keeps `source: 'local'`,
  // the local shelf it has used since turn 7 is the list, and the wizard says
  // so in an amber line. Nothing here can throw and nothing here can block.
  useEffect(() => { useSettingsSetsStore.getState().syncFromDb(); }, []);

  // ─── THE OTHER DOOR OUT (turn 31, CLAUDE.md F2) ─────────────────────────
  //
  // The bar's own four doors go through `leaveProject`, which raises the RED.
  // This is the fifth: closing the tab or reloading it. No page may draw its
  // own message there — the browser owns that dialog — so the honest thing is
  // to ASK FOR IT, which is what a non-empty `returnValue` does. Registered
  // only while there is work to lose, because a page that always asks is a
  // page whose question stops being read.
  const dirty = useProjectStore((s) => s.dirty);
  const unitCount = useProjectStore((s) => s.units.length);
  useEffect(() => {
    if (!dirty || !unitCount) return undefined;
    const onLeave = (e) => { e.preventDefault(); e.returnValue = UNSAVED_MESSAGE; return UNSAVED_MESSAGE; };
    window.addEventListener('beforeunload', onLeave);
    return () => window.removeEventListener('beforeunload', onLeave);
  }, [dirty, unitCount]);


  // ─── TURN 45 (CLAUDE.md F2): WHICH DOOR THIS APP WAS OPENED THROUGH ──────
  //
  // *"One codebase, TWO entries: the workshop app hardwires `factory`; a
  // separate route `/client` … hardwires `retail`."* The word itself is read at
  // boot by `stores/uiStore.js` (`entryAudience()`); what happens HERE is that
  // the page SAYS which door it is, on `<html>`, so the fact is readable from
  // outside without asking a React tree to confess. Nothing branches on it in
  // this file: there is one app, one tree and one filter, and the head only
  // decides which of that tree's rows are drawn.
  const audience = useUiStore((s) => s.audience);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-app-entry', audience);
  }, [audience]);

  // ─── CHAT-FIX 16.08 (owner): THE BUILD STAMP ──────────────────────────────
  // "nic nie weszło" vs "the bundle has it" cost an afternoon — from now on
  // the app SAYS which build it is: a small corner badge and one console
  // line. `__BUILD_STAMP__` is burned in by vite.config's define at build
  // time; `dev` when running un-built.
  const buildStamp = typeof __BUILD_STAMP__ !== 'undefined' ? __BUILD_STAMP__ : 'dev';
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.info(`Cabinet Core build: ${buildStamp}`);
  }, [buildStamp]);
  const buildBadge = (
    <div
      data-build-stamp={buildStamp}
      className={`fixed bottom-1 right-2 ${LAYER_CLASS.chrome} text-xs font-mono text-ink-300 bg-shell-900/80 px-2 py-0.5 rounded pointer-events-none select-none`}
    >
      {buildStamp}
    </div>
  );

  if (screen === 'start') {
    return (
      <>
        <StartScreen />
        {/* The start screen can fail to open a project, and has to be able to
            say so — the configurator's own Messages are not mounted yet. */}
        <Messages />
        {buildBadge}
      </>
    );
  }
  return (
    <>
      <ConfiguratorPage />
      {buildBadge}
    </>
  );
}
