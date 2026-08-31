import { useCallback, useEffect, useRef } from 'react';
import Scene from '../../3d/Scene.jsx';
import { parkCamera, readCamera, writeCamera } from '../../3d/cameraPresets.js';
import { renderJob } from '../../engine/render.js';
import { getCabinetProfile } from '../../engine/profile.js';
import { savePng } from '../../3d/renderCapture.js';
import { imageFilename } from '../estimate/download.js';

// ─── F3.3 · THE STAGE ──────────────────────────────────────────────────────
//
// *"The SHARED viewer from `src/3d/` — the same room, walls, floor and units
// PRO renders — mounted by the retail app WITHOUT PRO's chrome."*
//
// THE SAME COMPONENT. Not a copy, not a cut-down version, not a second
// renderer: `import Scene from '../../3d/Scene.jsx'`, the exact file
// ConfiguratorPage mounts. What differs is that `main-retail.jsx` called
// `setProChrome(false)` before the first render, so every dimension chip,
// hinge ring, LED icon, `+` marker and share-out bar returns null from its own
// first line. The furniture is identical because it IS identical.
//
// F3.6 also bans the top bar, the Check panel, X-ray, the Outlines toggle,
// "MOCK DATA MODE" and the build stamp. None of those live in `src/3d` — they
// are PRO's own DOM, in `src/components`, and the retail app simply never
// renders them. The iron boundary makes that a fact rather than a promise.

export default function Stage({ onHandle }) {
  const handle = useRef(null);

  const onRenderReady = useCallback((h) => {
    const previous = handle.current;
    handle.current = h || previous;
    if (h) onHandle?.(h);

    // ─── THE WALK'S OWN HANDLE (turn 11's practice, kept) ──────────────────
    //
    // `src/3d/viewHandle.js` says why, and the reason has not changed: *"a walk
    // that can only click is a walk that can only photograph… it ships in the
    // production bundle deliberately, and that is the whole point: the build
    // that gets verified has to be the build that gets used."*
    //
    // So the PBI stage registers beside PRO's, under its own key. It exposes
    // nothing the page does not already do — `saveImage` is the same call the
    // SAVE IMAGE button makes — and no behaviour depends on it.
    //
    // THE GUARD IS THE SAME ONE `viewHandle.js` CARRIES, and for the same
    // reason: React tears an effect down AFTER the replacement has registered,
    // so a naive cleanup clears a handle a live stage has just published. The
    // acceptance walk read `undefined` off a handle it had already waited for,
    // which is how this was found rather than guessed at.
    if (typeof window === 'undefined') return;
    const cc = (window.__cc = window.__cc || {});
    if (!h) {
      if (cc.pbi && cc.pbi.render === previous) cc.pbi = null;
      return;
    }
    cc.pbi = { render: h, saveImage: (name) => stageImage(h, name) };
  }, [onHandle]);

  return (
    <div
      data-testid="stage-canvas"
      style={{ flex: '1 1 auto', minHeight: 0, background: 'var(--pbi-porcelain)', position: 'relative' }}
    >
      <Scene onRenderReady={onRenderReady} />
    </div>
  );
}

/**
 * F3.5 · the camera, held across the trip into full screen and back.
 * *"the return restores EXACTLY the prior state: … same camera. Nothing
 * resets."*
 */
export function useCameraMemory(fullScreen) {
  const saved = useRef(null);
  useEffect(() => {
    if (fullScreen) { saved.current = readCamera(); return; }
    if (saved.current) {
      // One frame later: on the way back the columns are re-laid out and the
      // canvas resizes, and a camera written before that is a camera the
      // resize then overwrites.
      const id = requestAnimationFrame(() => writeCamera(saved.current));
      return () => cancelAnimationFrame(id);
    }
    return undefined;
  }, [fullScreen]);
}

/** Park the camera at a named place, once the furniture has bounds to aim at. */
export function applyPreset(preset, handle) {
  return parkCamera(preset, { box: handle?.bounds?.() || null });
}

/**
 * F5.4 · SAVE IMAGE — *"a PNG of the stage through the app's FIXED lighting rig
 * (the Petros render law: one rig regardless of panel switches — reuse
 * `src/3d/renderCapture.js`), no overlays, props honoured if on"*.
 *
 * Nothing new was needed in the shared core for this. `Scene` already hands
 * back a `capture(job)`; `engine/render.js renderJob()` already builds the job
 * off the profile's own fixed rig; and `captureRender` already hides every
 * helper, every outline and every label before it reads the canvas back. The
 * retail button is four lines of wiring on machinery that was already right.
 */
export function saveStageImage(handle, designName) {
  const shot = stageImage(handle, designName);
  if (!shot) return null;
  savePng(shot.dataUrl, shot.filename);
  return shot.filename;
}

/** The picture itself, and the name it should be saved under. Internal:
 *  `saveStageImage` hands it to the browser and `window.__cc.pbi.saveImage`
 *  hands it to the acceptance walk, and those are the only two callers. */
function stageImage(handle, designName) {
  if (!handle?.capture) return null;
  const job = renderJob({
    resolution: '4k',
    preset: 'current',          // the client's own view — what they are looking at
    aspect: handle.aspect?.() || 16 / 9,
    bounds: handle.bounds?.() || null,
    project: 'pbi',
    subject: designName || 'wardrobe',
  }, getCabinetProfile());
  const shot = handle.capture(job);
  if (!shot?.dataUrl) return null;
  return { dataUrl: shot.dataUrl, filename: imageFilename(designName), width: shot.width, height: shot.height };
}
