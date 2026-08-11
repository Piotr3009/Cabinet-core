import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';

// ─── THE LOST CONTEXTS (turn 20, CLAUDE.md F10) ─────────────────────────────
//
// Owner's console: `THREE.WebGLRenderer: Context Lost.` ten times over.
//
// ─── THE CAUSE, AND IT IS NOT WHAT F10.2 GUESSED ────────────────────────────
//
// F10.2 supposed "a canvas that mounts per open without its predecessor being
// disposed". Every canvas in this app DOES truly unmount — the three of them
// are `{modal === 'cabinet' && <CabinetEditorModal />}` and friends, so React
// takes the whole tree down — and react-three-fiber does call
// `renderer.dispose()` on the way out.
//
// `WebGLRenderer.dispose()` DOES NOT RELEASE THE CONTEXT. It frees the
// renderer's own GPU objects — programs, render targets, the state cache — and
// leaves the drawing context attached to a detached canvas, alive until the
// garbage collector happens to come past. A browser allows a small number of
// live WebGL contexts (Chrome: about 16) and when the number is exceeded it
// KILLS THE OLDEST ONE to make room. That is what the owner's ten lines are:
// not this app losing a context, this app hoarding sixteen of them and the
// browser reclaiming the ones it thought were finished with.
//
// The cure is one call — `forceContextLoss()` — made deliberately as the canvas
// goes away. It is the WebGL-level "I am done with this", and after it the
// context is gone immediately rather than eventually.
//
// ─── AND THE COUNTER THAT PROVES IT ─────────────────────────────────────────
//
// F10.1 asks for the diagnosis to be IN THE REPOSITORY: a counter on
// `window.__cc.diag` fed by `webglcontextlost` listeners on every canvas the
// app mounts, so the walk can open the editor twelve times and then ASSERT
// rather than photograph a console.
//
// It distinguishes the two kinds of loss, which is the whole point of having it:
//
//   RELEASED  our own `forceContextLoss` on the way out. Expected, counted
//             separately, and never a failure.
//   LOST      a `webglcontextlost` nobody here asked for — the browser
//             reclaiming a context, a driver reset. THIS is the number that
//             must be zero, and it is what the walk gates on.
//
// It ships in the production bundle for the same reason `window.__cc` does
// (turn 11): the build that gets verified has to be the build that gets used.
// It reaches nothing — three counters and a Set of canvases.

/** The diagnosis object, created on first use. */
export function contextDiag() {
  if (typeof window === 'undefined') return null;
  const cc = (window.__cc = window.__cc || {});
  if (!cc.diag) {
    const live = new Set();
    cc.diag = {
      created: 0,
      released: 0,
      lost: 0,
      restored: 0,
      events: [],
      /** How many contexts are alive RIGHT NOW — the number that must stay small. */
      liveContexts: () => live.size,
      liveNames: () => [...live].map((entry) => entry.name),
      _live: live,
      reset() {
        this.created = 0;
        this.released = 0;
        this.lost = 0;
        this.restored = 0;
        this.events = [];
      },
    };
  }
  return cc.diag;
}

/**
 * Guard the context of the canvas this is mounted inside.
 *
 * Drop one into every `<Canvas>` the app mounts. It counts, it listens, and on
 * the way out it releases the context instead of hoping.
 *
 * @param {string} name  'room' | 'editor' | 'part-detail' — which surface
 */
export default function ContextGuard({ name }) {
  const gl = useThree((s) => s.gl);

  useEffect(() => {
    const diag = contextDiag();
    const canvas = gl?.domElement;
    if (!canvas) return undefined;

    const entry = { name, canvas };
    // `releasing` is what tells a deliberate teardown from a browser kill. The
    // flag is on the closure rather than on the module, so two canvases going
    // away in the same tick cannot read each other's.
    let releasing = false;

    const onLost = (e) => {
      // Preventing the default is what makes a context RESTORABLE. It costs
      // nothing on the way out and it is the difference between a hiccup and a
      // dead canvas when a driver resets under a working scene.
      e.preventDefault();
      if (releasing) return;
      diag.lost += 1;
      diag.events.push({ name, kind: 'lost' });
    };
    const onRestored = () => {
      diag.restored += 1;
      diag.events.push({ name, kind: 'restored' });
    };

    canvas.addEventListener('webglcontextlost', onLost, false);
    canvas.addEventListener('webglcontextrestored', onRestored, false);
    diag.created += 1;
    diag._live.add(entry);
    diag.events.push({ name, kind: 'created' });

    return () => {
      releasing = true;
      diag._live.delete(entry);
      diag.released += 1;
      diag.events.push({ name, kind: 'released' });
      canvas.removeEventListener('webglcontextlost', onLost, false);
      canvas.removeEventListener('webglcontextrestored', onRestored, false);
      // ─── THE FIX ─────────────────────────────────────────────────────────
      // `dispose()` frees the renderer's GPU objects; only this gives the
      // CONTEXT back. r3f calls the first for us and cannot call the second —
      // it does not know whether the canvas is coming back.
      try { gl.forceContextLoss?.(); } catch { /* already gone */ }
      try { gl.dispose?.(); } catch { /* already gone */ }
    };
  }, [gl, name]);

  return null;
}
