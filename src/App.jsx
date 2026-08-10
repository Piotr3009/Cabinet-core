import { useEffect } from 'react';
import ConfiguratorPage from './pages/ConfiguratorPage.jsx';
import StartScreen from './components/StartScreen.jsx';
import Toast from './components/Toast.jsx';
import { useUiStore } from './stores/uiStore.js';
import { loadDecorCatalogue } from './lib/decorCatalogue.js';
import { loadRunnerCatalogue } from './lib/runnerCatalogue.js';

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
  useEffect(() => { loadRunnerCatalogue(); }, []);


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
