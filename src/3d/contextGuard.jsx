import { useCallback, useEffect, useRef } from 'react';

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
// ─── WHY IT IS A HOOK OUTSIDE THE CANVAS AND NOT A COMPONENT INSIDE IT ──────
//
// It was a component inside, and the turn-20 walk caught it: open and close the
// editor twelve times QUICKLY and the counter said no context had been made at
// all, while the console filled with the very message this exists to remove.
//
// A `<Canvas>` renders its children into a SEPARATE React root. Close the
// window before that root has flushed its effects and the effects never run —
// so a guard mounted INSIDE the canvas never registers, never releases, and the
// context it was meant to give back leaks exactly as before. The one case that
// matters is the one it missed.
//
// So the guard hangs off the component that OWNS the canvas, in the main tree,
// where React's own unmount is what runs the cleanup — and it hangs off the
// CANVAS ELEMENT rather than off r3f's `onCreated`, which the same walk caught
// a second time: close the window fast enough and r3f has made the WebGL
// context but not yet called back, so a guard waiting to be told still misses
// it. A callback ref is attached and detached by React itself in the commit
// phase; there is no window in which the element exists and the guard does not.
//
// `onCreated` is still taken, for the renderer HANDLE: with it the release can
// dispose the renderer as well as drop the context. Without it — the fast case
// — the extension on the element does the same job on its own.
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
// It reaches nothing — four counters and a Set of canvases.

/**
 * Canvases whose context THIS MODULE dropped.
 *
 * `webglcontextlost` is dispatched asynchronously, so a canvas released and
 * re-guarded in the same commit — React handing the same element back — fires
 * its loss AFTER the new handle is attached, and the new handle would count our
 * own teardown as an incident. A canvas that has been deliberately lost is
 * remembered here instead of on the handle, which is the only thing that
 * survives the handover. Weak, so nothing is retained.
 */
const DELIBERATE = new WeakSet();

/** The diagnosis object, created on first use. */
function contextDiag() {
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

/** Start watching one canvas's context. Returns the handle that releases it. */
function attach(canvas, name) {
  const diag = contextDiag();
  if (!diag || !canvas) return null;

  const handle = {
    name, canvas, gl: null, releasing: false,
    // ─── TURN 21 (CLAUDE.md F5.1): IS THERE STILL A CONTEXT TO GIVE BACK? ──
    // The owner's console: `WebGL: INVALID_OPERATION: loseContext: context
    // already lost`, ten times, out of `forceContextLoss`. Releasing a context
    // is right; releasing one that is ALREADY GONE is shooting a corpse, and
    // the browser says so once per shot. A context is gone when the driver
    // took it, when we took it, or when the element has been thrown away — and
    // this flag is set by all three routes below.
    gone: false,
  };

  handle.onLost = (e) => {
    // However this loss arrived — ours or the driver's — there is nothing left
    // to force. Recorded FIRST, so an early return cannot skip it.
    handle.gone = true;
    // Preventing the default is what makes a context RESTORABLE. It costs
    // nothing on the way out and it is the difference between a hiccup and a
    // dead canvas when a driver resets under a working scene.
    e.preventDefault();
    if (!handle.releasing && !DELIBERATE.has(handle.canvas)) {
      diag.lost += 1;
      diag.events.push({ name, kind: 'lost' });
      return;
    }
    // ─── OUR OWN RELEASE IS NOT AN INCIDENT ────────────────────────────────
    // three.js logs `THREE.WebGLRenderer: Context Lost.` from its own
    // `webglcontextlost` handler, and it cannot tell a teardown from a driver
    // reset. Left alone, the fix for the owner's ten console lines would have
    // printed ten of its own — and the next person to read that console would
    // chase the same ghost.
    //
    // This listener is registered in the CAPTURE phase, so it runs before
    // three's; stopping immediate propagation for a DELIBERATE release keeps
    // three's handler (and its message) out of a teardown it has no opinion
    // about. A real loss falls through to it untouched, which is the whole
    // point of telling the two apart.
    e.stopImmediatePropagation();
  };
  handle.onRestored = () => {
    // A restored context is a live one again — a driver reset under a working
    // scene is a hiccup, and the canvas that comes back from it still owns a
    // context this hook is responsible for releasing.
    handle.gone = false;
    diag.restored += 1;
    diag.events.push({ name, kind: 'restored' });
  };

  canvas.addEventListener('webglcontextlost', handle.onLost, true);
  canvas.addEventListener('webglcontextrestored', handle.onRestored, false);
  diag.created += 1;
  diag._live.add(handle);
  diag.events.push({ name, kind: 'created' });
  return handle;
}

/**
 * Is this handle's context still there to be given back?
 *
 * Turn 21 (CLAUDE.md F5.1). Three ways to find out, cheapest first, and any one
 * of them saying "gone" is enough:
 *
 *   • our own record — the `webglcontextlost` event has fired on this canvas;
 *   • the context's own answer — `isContextLost()`, which is the authority;
 *   • the element — a canvas that is no longer in a document has no context
 *     worth forcing, and asking for one would CREATE one.
 */
function stillLive(handle) {
  if (!handle || handle.gone) return false;
  const gl = handle.gl?.getContext?.();
  if (gl?.isContextLost?.()) return false;
  return true;
}

/**
 * Give the context back — ONCE, and only while there is one.
 *
 * Idempotent by `releasing`, which is turn 20's; and quiet on a dead context by
 * `stillLive`, which is turn 21's. The two are different questions: the first
 * is "have I already done this", the second is "is there anything to do".
 */
function release(handle) {
  if (!handle || handle.releasing) return;
  const diag = contextDiag();
  handle.releasing = true;
  diag._live.delete(handle);
  diag.released += 1;
  diag.events.push({ name: handle.name, kind: 'released' });
  // ─── THE FIX ─────────────────────────────────────────────────────────────
  // `dispose()` frees the renderer's GPU objects; only losing the context gives
  // the CONTEXT back. r3f calls the first for us and cannot call the second —
  // it does not know whether the canvas is coming back.
  //
  // Where r3f got as far as telling us about its renderer, both are done
  // through it. Where it did not — a window closed before the callback — the
  // WebGL extension on the ELEMENT does the same job, and it is the case this
  // whole hook exists for.
  //
  // The listener is still attached while this runs, ON PURPOSE: it is what
  // keeps three's own "Context Lost" message out of a teardown nobody needs to
  // be told about. It comes off immediately afterwards.
  DELIBERATE.add(handle.canvas);
  // ─── TURN 21 (CLAUDE.md F5.1): DO NOT SHOOT A CORPSE ─────────────────────
  // `forceContextLoss()` on an already-lost context is an INVALID_OPERATION,
  // and the browser logs one line per call — the owner's ten. `dispose()` is
  // still called either way: it frees the renderer's own GPU objects and is
  // safe on a context that has gone, which is exactly the split turn 20 missed
  // by treating "release" as one indivisible act.
  const live = stillLive(handle);
  try {
    if (handle.gl) {
      if (live) handle.gl.forceContextLoss?.();
      handle.gl.dispose?.();
    } else if (live) {
      loseContextOf(handle.canvas);
    }
  } catch { /* already gone */ }
  // Whatever happened above, this canvas's context is not ours any more.
  handle.gone = true;
  // `onLost` is deliberately NOT removed. `webglcontextlost` is dispatched
  // asynchronously, so taking the listener off here would let three's own
  // handler print "Context Lost." a moment later for a teardown that was ours
  // — which is the exact line this whole finding is about. The canvas is being
  // thrown away; the listener goes with it.
  handle.canvas.removeEventListener('webglcontextrestored', handle.onRestored, false);
}

/**
 * Drop a canvas's drawing context without going through a renderer.
 *
 * `getContext` with the SAME attributes returns the context the canvas already
 * has rather than making a second one — a canvas has exactly one — so this
 * reaches r3f's own context even though r3f never handed it over. On a canvas
 * that somehow has none it makes one and immediately loses it, which costs a
 * few microseconds and leaks nothing.
 */
function loseContextOf(canvas) {
  const ctx = canvas.getContext('webgl2') || canvas.getContext('webgl');
  // Turn 21 (CLAUDE.md F5.1): and not on one that is already gone. This path
  // has no renderer to ask, so the CONTEXT is asked directly — the authority
  // on the question, and the same one `stillLive` uses on the other branch.
  if (!ctx || ctx.isContextLost?.()) return;
  ctx.getExtension('WEBGL_lose_context')?.loseContext();
}

/**
 * Guard the context of a `<Canvas>` this component owns.
 *
 * Used from OUTSIDE the canvas, in the component that renders it:
 *
 *     const guard = useContextGuard('editor');
 *     …
 *     <Canvas ref={guard.ref} onCreated={guard.onCreated} …>
 *
 * @param {string} name  'room' | 'editor' | 'part-detail' — which surface
 * @returns {{ref:function, onCreated:function}}
 */
export default function useContextGuard(name) {
  const held = useRef(null);

  // THE RELEASE. The owner's unmount, which React runs exactly once and only
  // when the window is really going: the canvas element is detached by then
  // and the handle still holds it, which is all `loseContext` needs.
  useEffect(() => () => { release(held.current); held.current = null; }, [name]);

  const ref = useCallback((canvas) => {
    // ATTACH ONLY. React calls a ref with `null` for reasons that have nothing
    // to do with the element going away — a forwarded ref recomposed on a
    // re-render is detached and re-attached with the SAME canvas — and
    // releasing on every one of those would drop a live context because a
    // parent re-rendered, which is this module causing the bug it fixes.
    //
    // Attaching is idempotent on the same element, and the RELEASE belongs to
    // the owner's unmount below, which happens exactly once and cannot be
    // provoked by a render.
    if (!canvas || held.current?.canvas === canvas) return;
    release(held.current);
    held.current = attach(canvas, name);
  }, [name]);

  const onCreated = useCallback((state) => {
    if (held.current && state?.gl) held.current.gl = state.gl;
  }, []);

  return { ref, onCreated };
}
