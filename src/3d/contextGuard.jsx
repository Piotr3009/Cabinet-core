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
//
// ─── TURN 35 (CLAUDE.md F4): THE THIRD FINDING, AND IT WAS OURS ─────────────
//
// The owner's console, 16.08: a wall of `WebGL: INVALID_OPERATION: loseContext:
// context already lost`, a frozen viewport, and "renderowanie zabiera sporo
// pamięci, bo się zacina".
//
// Turn 21 had already stopped THIS module shooting a corpse. The lines came
// back because a SECOND caller shoots the same one, 500 ms later, and it is not
// ours. `@react-three/fiber` 9.4.0, `unmountComponentAtNode` — the cleanup of
// `CanvasImpl`'s own `React.useEffect(… return () => unmountComponentAtNode(
// canvas), [])` — schedules this, verbatim from
// `node_modules/@react-three/fiber/dist/events-*.esm.js`:
//
//     setTimeout(() => {
//       try {
//         state.events.disconnect?.();
//         state.gl?.renderLists?.dispose?.();
//         state.gl?.forceContextLoss?.();      // ← the second shot
//         if (state.gl?.xr) state.xr.disconnect();
//         dispose(state.scene);                // ← and this, on a live scene
//         _roots.delete(canvas);               // ← and this
//         if (callback) callback(canvas);
//       } catch (e) { /* ... */ }
//     }, 500);
//
// TWO different failures come out of that one timer, and they need different
// answers:
//
//   THE CANVAS IS GONE — an ordinary unmount. Our release has already given the
//   context back (that is this module's whole job), so half a second later
//   r3f's call finds an already-lost context and the browser prints one line
//   per canvas. Nothing is broken; the console is. The call is SWALLOWED.
//
//   THE CANVAS IS STILL THERE — `<React.StrictMode>` (src/main.jsx). React's
//   simulated unmount runs every effect cleanup and then runs the effect again
//   WITHOUT touching the DOM: r3f's cleanup fires, schedules the timer, and the
//   canvas, the renderer and the whole tree go on living. 500 ms after the
//   window opens the timer force-loses a LIVE context and disposes the scene
//   the visible tree is drawing — the frozen viewport, exactly. Here the call
//   THROWS, because r3f wraps that whole body in ONE try/catch: throwing on the
//   `forceContextLoss` line is what stops `dispose(state.scene)` and
//   `_roots.delete(canvas)` from reaching a root that is still in use, and the
//   exception dies in r3f's own empty catch. (`state.events.disconnect()` and
//   `renderLists.dispose()` run before it and are left alone: `disconnect` is
//   called by r3f's own `connect()` too, so a wrapper on it would break event
//   wiring — and CanvasImpl's layout effect has no dependency array, so the
//   next render reconnects the events by itself. The render lists rebuild every
//   frame.)
//
// And the first half of that same StrictMode sequence was OURS: the effect
// cleanup below called `release()` on a canvas that was not going anywhere, so
// this module killed the live context and then handed the corpse back to a tree
// that carried on rendering into it. `release()` asks first now — a canvas that
// is still in the document is not an unmount, it is React looking twice.

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

/**
 * The handle guarding each canvas — ONE per element, for the life of it.
 *
 * Turn 35 (CLAUDE.md F4). `attach` used to make a new handle every time it was
 * asked, which was true while a ref could only be given one element once.
 * StrictMode's simulated unmount breaks that: the hook's `held` is cleared by
 * the cleanup and the ref then re-attaches THE SAME CANVAS, so a second handle
 * would count a second `created`, hang a second pair of listeners on one
 * element and leave the first handle holding a renderer nobody will release.
 * Weak, so a canvas that goes away takes its entry with it.
 */
const GUARDED = new WeakMap();

/**
 * How many times ONE canvas will be brought back from a loss nobody asked for.
 *
 * A driver that keeps killing contexts must not be answered forever — three
 * tries is a hiccup survived, a fourth is a machine saying no.
 */
const MAX_RESTORES = 3;

/** The message r3f's own empty catch swallows. See the header. */
const LATE_TEARDOWN_STOPPED = 'cabinet-core: r3f\'s late teardown was stopped — this canvas is still live';

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
  // ─── TURN 35 (CLAUDE.md F4): ONE HANDLE PER CANVAS ────────────────────────
  // Asked twice for the same element — which is what React's simulated unmount
  // does, and what a recomposed ref has always been able to do — the answer is
  // the handle that already guards it. Anything else counts a context that was
  // never made and leaves a live renderer unguarded. See `GUARDED`.
  const already = GUARDED.get(canvas);
  if (already && !already.releasing) return already;

  const handle = {
    name, canvas, gl: null, releasing: false,
    // Turn 35 (F4): the ONE call our own release is allowed to make through
    // the wrapper below, and the count of restores already attempted.
    allowForce: false, loseExt: null, restores: 0, deferred: false,
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
      // ─── TURN 35 (CLAUDE.md F4): "…AND RESTORES" ────────────────────────
      // Preventing the default makes a context restorable; it does not restore
      // it. A context lost through `WEBGL_lose_context` — which is what
      // `forceContextLoss` is, and what a browser reclaiming the oldest of
      // sixteen amounts to — comes back only when somebody asks for it. Nobody
      // ever did, so the guard has been counting a fault it could have healed.
      // This is a loss NOBODY here asked for: ask.
      restoreLater(handle);
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
    // ─── TURN 35 (CLAUDE.md F4): "one console line naming a restore" ───────
    // ONE line, and it says WHICH surface came back — a restore is the rare
    // thing in this file that a person actually wants to be told about, and a
    // console that says it twice is a console that gets read as noise.
    // eslint-disable-next-line no-console
    console.info(`[cabinet-core] WebGL context restored — the ${name} canvas is live again.`);
  };

  canvas.addEventListener('webglcontextlost', handle.onLost, true);
  canvas.addEventListener('webglcontextrestored', handle.onRestored, false);
  diag.created += 1;
  diag._live.add(handle);
  diag.events.push({ name, kind: 'created' });
  GUARDED.set(canvas, handle);
  return handle;
}

/**
 * Ask for a lost context back — on the NEXT task, and not forever.
 *
 * Turn 35 (CLAUDE.md F4). `restoreContext()` may not be called from inside the
 * `webglcontextlost` handler: the loss has to have been dispatched in full
 * first, or the browser ignores it. The extension object is the one taken at
 * `onCreated` time, because `getExtension` on a context that has already gone
 * answers null and there would be nothing left to ask with.
 */
function restoreLater(handle) {
  if (!handle?.loseExt || handle.restores >= MAX_RESTORES) return;
  handle.restores += 1;
  setTimeout(() => {
    try { handle.loseExt.restoreContext(); } catch { /* the driver said no */ }
  }, 0);
}

/**
 * Take r3f's renderer, and take its `forceContextLoss` with it.
 *
 * Turn 35 (CLAUDE.md F4), and the header says why in full. The one line being
 * defused is `state.gl?.forceContextLoss?.()` inside the 500 ms `setTimeout`
 * that `unmountComponentAtNode` schedules —
 * `node_modules/@react-three/fiber/dist/events-*.esm.js`, r3f 9.4.0. An own
 * property on the renderer INSTANCE shadows three's prototype method, so
 * nothing global is patched and a renderer this app never adopted is untouched.
 *
 *   ours          `release()` raises `allowForce` for exactly one call, which
 *                 goes straight through to three's own method.
 *   canvas gone   the context went with it; the call would print
 *                 `INVALID_OPERATION: loseContext: context already lost` and do
 *                 nothing else. Swallowed, and r3f's remaining cleanup — the
 *                 scene disposal, the root de-registration — runs as it should.
 *   canvas live   StrictMode's simulated unmount. THROW: r3f's timer wraps its
 *                 whole body in one try/catch, so the throw is what keeps
 *                 `dispose(state.scene)` and `_roots.delete(canvas)` off a root
 *                 the visible tree is still rendering into.
 */
const WRAPPED = Symbol('cabinet-core.guardedForceContextLoss');

/**
 * WHAT TO DO with a call to `forceContextLoss` — the whole decision, pure.
 *
 * Turn 35 (CLAUDE.md F4). It is three lines and it is the centre of the
 * feature, so it is a function of its two facts and nothing else: whether the
 * call is OURS, and whether the canvas is still in the document. Everything
 * around it — the renderer, the timer, the try/catch it is thrown into — is
 * wiring, and wiring cannot be asserted in node.
 *
 * @returns {'through'|'stop'|'swallow'}
 *   through  our own release, on a live context: three's own method runs.
 *   stop     somebody else's call against a canvas that is STILL LIVE. It must
 *            not happen and the rest of the caller must not happen either.
 *   swallow  somebody else's call against a canvas that has gone. Harmless,
 *            except that the browser prints a line about it. Say nothing.
 */
export function lateLossVerdict({ ours = false, connected = false } = {}) {
  if (ours) return 'through';
  return connected ? 'stop' : 'swallow';
}

function adoptRenderer(handle, gl) {
  if (!handle || !gl) return;
  handle.gl = gl;
  // The extension, taken while the context is alive — `restoreLater` needs it
  // after the context is not.
  if (!handle.loseExt) {
    try {
      handle.loseExt = gl.getContext?.()?.getExtension?.('WEBGL_lose_context') || null;
    } catch { handle.loseExt = null; }
  }
  if (typeof gl.forceContextLoss !== 'function' || gl.forceContextLoss[WRAPPED]) return;
  const native = gl.forceContextLoss.bind(gl);
  const guarded = function guardedForceContextLoss() {
    const verdict = lateLossVerdict({
      ours: handle.allowForce === true,
      connected: handle.canvas?.isConnected === true,
    });
    if (verdict === 'through') {
      handle.allowForce = false;
      return native();
    }
    if (verdict === 'stop') throw new Error(LATE_TEARDOWN_STOPPED);
    return undefined;
  };
  guarded[WRAPPED] = true;
  gl.forceContextLoss = guarded;
}

/**
 * A canvas that is still in the document has not been unmounted.
 *
 * Turn 35 (CLAUDE.md F4). React removes a deleted subtree's DOM in the mutation
 * phase and runs the passive cleanups afterwards, so at the moment the hook's
 * cleanup runs a REAL unmount has already detached the canvas — which is what
 * turn 20 relied on in as many words ("the canvas element is detached by then").
 * StrictMode's simulated unmount touches no DOM at all, so a connected canvas
 * is React looking twice and its context must be left exactly where it is.
 *
 * The re-check is belt and braces: if some path ever runs the cleanup before
 * the element goes, the context is still given back one task later rather than
 * leaked. A canvas that is STILL connected then is simply alive, and the real
 * unmount will come back through `release` in its own time.
 */
function releaseWhenGone(handle) {
  if (handle.deferred) return;
  handle.deferred = true;
  setTimeout(() => {
    handle.deferred = false;
    if (!handle.canvas?.isConnected) release(handle);
  }, 0);
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
 * `stillLive`, which is turn 21's; and turn 35's third question in front of
 * both — "is this canvas actually going anywhere". Three questions, three
 * turns, and each one of them cost the owner a console full of red.
 */
function release(handle) {
  if (!handle || handle.releasing) return;
  // ─── TURN 35 (CLAUDE.md F4): A SIMULATED UNMOUNT IS NOT AN UNMOUNT ───────
  // `<React.StrictMode>` runs every cleanup and then runs the effect again
  // without taking one node out of the document. Releasing here killed a
  // context the visible tree went on drawing into — this module causing the
  // very freeze it was written to prevent. See `releaseWhenGone`.
  if (handle.canvas?.isConnected) { releaseWhenGone(handle); return; }
  const diag = contextDiag();
  handle.releasing = true;
  GUARDED.delete(handle.canvas);
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
  // ─── TURN 35 (CLAUDE.md F4): THE ONE SHOT THE WRAPPER LETS THROUGH ───────
  // `adoptRenderer` replaced `gl.forceContextLoss` with a guard that refuses
  // every caller but this one. Raised for the length of the try and lowered
  // again whatever happens — including the branch where `live` is false and the
  // call is never made, or r3f's timer half a second later would find the door
  // open and print the owner's line after all.
  handle.allowForce = true;
  try {
    if (handle.gl) {
      if (live) handle.gl.forceContextLoss?.();
      handle.gl.dispose?.();
    } else if (live) {
      loseContextOf(handle.canvas);
    }
  } catch { /* already gone */ }
  handle.allowForce = false;
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
  //
  // ─── TURN 35 (CLAUDE.md F4) ───
  // Under `<React.StrictMode>` React runs this cleanup on a mount that is NOT
  // going away, so "exactly once" was never true in development — `release`
  // asks whether the canvas is still in the document before it does anything,
  // and `attach` hands the same handle back when the ref comes round again.
  // Not one character of the line below changes: the question belongs where
  // both callers of `release` go through it.
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
    const gl = state?.gl;
    if (!gl) return;
    // ─── TURN 35 (CLAUDE.md F4) ───
    // `held` can be empty for a moment — StrictMode's cleanup clears it and the
    // ref fills it again, and r3f's `onCreated` is the end of an AWAIT, so it
    // can land in between. The renderer knows its own canvas
    // (`gl.domElement`), and `GUARDED` knows that canvas's handle, so the
    // renderer is never adopted by nobody.
    const handle = held.current || GUARDED.get(gl.domElement) || null;
    adoptRenderer(handle, gl);
  }, []);

  return { ref, onCreated };
}

/**
 * The diagnosis, for a walk that has to ASK rather than photograph (R4).
 *
 * Turn 35 (CLAUDE.md F4). `window.__cc.diag` has existed since turn 20 but is
 * built by the first canvas to mount, so a proof script that lands before one
 * has nothing to read and cannot tell "zero contexts" from "no counter yet".
 * This is the same object, made on demand — published in `src/main.jsx` beside
 * every other reader the acceptance walks ask questions of.
 */
export function contextDiagnosis() {
  return contextDiag();
}

/** Which canvas the guard holds a handle for — the walk's "one canvas" check. */
export function guardedHandle(canvas) {
  return GUARDED.get(canvas) || null;
}
