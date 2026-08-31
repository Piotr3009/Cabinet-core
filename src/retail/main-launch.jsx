import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/tokens.css';
import './styles/base.css';
import './styles/scale.css';
import './styles/room.css';
import LaunchPage from './launch/LaunchPage.jsx';

// The switch's own entry. It touches no store, no engine, no viewer — it is
// two links and the design system, and it boots in one frame.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LaunchPage />
  </StrictMode>,
);
