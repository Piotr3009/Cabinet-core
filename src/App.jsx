import ConfiguratorPage from './pages/ConfiguratorPage.jsx';
import StartScreen from './components/StartScreen.jsx';
import Toast from './components/Toast.jsx';
import { useUiStore } from './stores/uiStore.js';

// Two screens (turn 4, BACKLOG #7): the start screen, and the project.
// The canvas is only ever reached THROUGH a project, so a drawing always
// belongs to something that can be saved and reopened.
export default function App() {
  const screen = useUiStore((s) => s.screen);
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
