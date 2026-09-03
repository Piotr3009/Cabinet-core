import { useCallback, useEffect, useRef } from 'react';
import Scene from '../../3d/Scene.jsx';
import { parkCamera, readCamera, writeCamera } from '../../3d/cameraPresets.js';
import { stageKeyAction } from './keys.js';
// T63 F3 · PRO's only door into the front-gap repair: the rows over the canvas
// (`src/components/FrontGapWarnings.jsx`, COPIED). Solid view only in PRO, and
// the retail stage has no other view.
import FrontGapWarnings from './detail/FrontGapWarnings.jsx';
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

/**
 * ─── T61 F1 · THE TWO PLUS ROUTES ──────────────────────────────────────────
 *
 * The `+` markers are drawn again in the client's room (channel `plus`), and a
 * marker that is drawn must do something. PRO answers both of them with a PRO
 * surface — `openLibraryToInsert` for the run-end plus, `openModal('add-items')`
 * for the inner one — and both of those are rendered by
 * `src/pages/ConfiguratorPage.jsx`, which this page never mounts. Left alone
 * they would be two visible, clickable, DEAD markers.
 *
 * So `Scene` grew two optional props, defaulting to exactly what PRO does, and
 * the handlers arrive from here: they live in `src/retail/**`, they call the
 * adapter and nothing else, and the iron boundary is untouched.
 */
export default function Stage({
  onHandle, onAddPlus = null, onAddInside = null, onSaid = null,
  fullScreen = false, onExitFullScreen = null,
}) {
  const handle = useRef(null);

  // ─── T64 F1.1 · THE ONE KEYBOARD HANDLER ─────────────────────────────────
  //
  // The owner: *"usuwanie elementów Delete przyciskiem w ogóle teraz nie
  // działa."* The stage had no keydown listener; PRO's page has one. Its
  // logic is COPIED into `keys.js` (from `src/pages/ConfiguratorPage.jsx:
  // 160-245`) and these are the lines that hang it on the window — the ONLY
  // `keydown` listener in the retail room, Escape for full screen included,
  // so the balance's answer is one.
  useEffect(() => {
    const onKey = (e) => {
      const out = stageKeyAction(e, { fullScreen, onExitFullScreen });
      if (out.handled && onSaid) onSaid(out.said);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullScreen, onExitFullScreen, onSaid]);

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
    <div className="pbi-stage" data-testid="stage-canvas">
      <Scene onRenderReady={onRenderReady} onAddPlus={onAddPlus} onAddInside={onAddInside} />
      <FrontGapWarnings />
    </div>
  );
}

/**
 * T63 F5 · RESET VIEW — the camera on the design's own centre line, looking
 * at its centre, far enough back to hold it.
 *
 * ─── T64 F1.6 · …AND IT IS THE FRONT PRESET, NOT A FOURTH PLACE ───────────
 * The owner: *"chcę żeby się default ustawiał od frontu."* `cameraPresets.js`
 * FRONT already stands square on the design's centre line, level with its
 * middle, framed to its bounds — which is T63's centred reset by another
 * name — so RESET VIEW and the first frame both park there, and the
 * `resetPlacement` maths of `viewTools.js` retires (tombstone there).
 */
export function resetStageView(handle) {
  return applyPreset('front', handle);
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

/**
 * T64 F5 · THE ESTIMATE'S THUMBNAIL — *"captured off the fixed rig, front
 * view"*. The camera is parked at FRONT first (the same preset the room
 * opens on), then the very capture SAVE IMAGE makes, at the profile's own
 * preview resolution rather than 4K: it is a tile on a list, not a print.
 * Returns the data URL, or null before the renderer has a handle.
 */
export function stageThumbnail(handle, designName) {
  if (!handle?.capture) return null;
  applyPreset('front', handle);
  const job = renderJob({
    resolution: 'preview',
    preset: 'current',
    aspect: 4 / 3,
    bounds: handle.bounds?.() || null,
    project: 'pbi',
    subject: designName || 'wardrobe',
  }, getCabinetProfile());
  const shot = handle.capture(job);
  return shot?.dataUrl || null;
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
