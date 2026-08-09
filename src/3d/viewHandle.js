import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';

// ─── The end-to-end handle, for the 3D (turn 13, CLAUDE.md F1 / F10) ────────
//
// Turn 11 put `window.__cc` in the bundle so the acceptance walk could MEASURE
// instead of photograph, and wrote down why: "a walk that can only click is a
// walk that can only photograph… it ships in the production bundle deliberately,
// and that is the whole point: the build that gets verified has to be the build
// that gets used."
//
// Two of turn 13's phases need the same thing one layer down.
//
//   F1 is a claim about GEOMETRY — that a machined panel's outward faces are
//   wound outward. There is a node test for that, and it is the guard; but the
//   thing the owner photographed is the RENDERER's copy, cache and all, and the
//   only honest way to check that one is to walk the live scene.
//
//   F2.2 is a claim about a CAMERA — that the editor pans. A pan leaves no
//   trace in the DOM at all: there is nothing to read but the controls' target.
//
// So the mounted views register themselves, by name, exactly as the stores do.
// There is nothing here that devtools could not already reach — it is the same
// scene the canvas is drawing — and no behaviour depends on it.

/**
 * Register this R3F root under `window.__cc.views[name]` while it is mounted.
 *
 * @param {string} name  'room' | 'editor'
 */
export function useViewHandle(name) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls);

  useEffect(() => {
    if (typeof window === 'undefined' || !name) return undefined;
    const cc = (window.__cc = window.__cc || {});
    cc.views = cc.views || {};
    cc.views[name] = { gl, scene, camera, controls };
    return () => {
      // A window that has closed must not leave a scene behind for a later
      // check to measure — that is exactly the kind of stale reading a walk
      // cannot tell from a real one.
      if (cc.views?.[name]?.scene === scene) delete cc.views[name];
    };
  }, [name, gl, scene, camera, controls]);
}
