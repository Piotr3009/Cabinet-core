# T35 · F4 — WebGL context lost: the cause, named, and the guard

> **CLAUDE.md F4.** *"The owner's console today: a wall of `WebGL:
> INVALID_OPERATION: loseContext: context already lost`, a frozen viewport, and
> «renderowanie zabiera sporo pamięci, bo się zacina»."*
>
> **Build:** find WHY the app loses/multiplies GL contexts … Then: ONE canvas
> instance for the app's life; cleanup calls `forceContextLoss` at most once and
> only on a live context; a `webglcontextlost` listener that prevents default
> and restores; one console line naming a restore. **PROOF:** a walk step that
> flips screens/projects 10x and asserts one canvas and zero loseContext errors
> in the console log. **Name the actual cause in the PR body.**

Everything below was executed. Nothing here is a photograph of a console.

---

## The cause, named

Two callers shoot the same context, and one of them is ours.

`@react-three/fiber` 9.4.0's `unmountComponentAtNode` — the cleanup of
`CanvasImpl`'s own `React.useEffect(… return () => unmountComponentAtNode(canvas),
[])` — does not tear a canvas down when it is asked to. It schedules this, half
a second later (`node_modules/@react-three/fiber/dist/events-*.esm.js`):

```js
setTimeout(() => {
  try {
    state.events.disconnect?.();
    state.gl?.renderLists?.dispose?.();
    state.gl?.forceContextLoss?.();      // ← the second shot
    if (state.gl?.xr) state.xr.disconnect();
    dispose(state.scene);                // ← and this, on a live scene
    _roots.delete(canvas);               // ← and this
    if (callback) callback(canvas);
  } catch (e) { /* ... */ }
}, 500);
```

That one timer produces **two different faults**, and they had to be told apart
before either could be fixed.

### 1 · The console wall — every build, including the owner's

A real unmount (leave the project for the start screen; close the editor
window). `3d/contextGuard.jsx` releases the context on the way out — which is
its whole job since turn 20, because `renderer.dispose()` frees GPU objects and
does **not** give the context back. Five hundred milliseconds later r3f calls
`forceContextLoss()` on the context this app has already dropped. The browser
answers `WebGL: INVALID_OPERATION: loseContext: context already lost`, **one
line per canvas**. Turn 21 stopped *this module* shooting a corpse; the lines
came back because the second caller was never ours to begin with.

Chrome files that message as a **rendering** entry at **warning** level, which
is why an acceptance walk reading `console.*` and error-level entries had been
reporting a clean console over the owner's exact complaint. The walk below takes
the raw log at every level.

### 2 · The frozen viewport — `npm run dev`, and it was ours first

`src/main.jsx` wraps the app in `<React.StrictMode>`. In development React runs
every effect, tears it down and runs it again — a *simulated* unmount that
touches no DOM. On that second pass:

* **our** cleanup called `release()`, so this module force-lost the context of a
  canvas that was not going anywhere, and handed the corpse back to a tree that
  carried on rendering into it;
* **r3f's** cleanup armed the timer above, which 500 ms later force-lost the
  context again, **disposed the scene the visible tree was drawing**
  (`dispose(state.scene)`) and de-registered the root (`_roots.delete(canvas)`),
  after which no later unmount released anything at all.

Measured, before the fix, in `npm run dev`, 2.6 s after a project opened:

```json
{ "canvases": 1, "contextLost": true, "meshesInScene": null,
  "diag": { "created": 2, "released": 1, "lost": 0, "restored": 0, "live": 1 } }
```

`contextLost: true` on the one canvas on screen is the frozen viewport, and
`created: 2` is the guard counting the same canvas twice because the ref was
handed the same element again after its handle had been thrown away.

---

## The guard

All of it is in `src/3d/contextGuard.jsx`; not one existing behaviour was
removed, and turns 20 and 21 still pass their own tests unchanged.

| | |
|---|---|
| **A simulated unmount is not an unmount** | `release()` asks `handle.canvas.isConnected` before anything else. React removes a deleted subtree's DOM in the mutation phase and runs passive cleanups afterwards, so a **real** unmount has already detached the canvas — which is what turn 20 relied on in as many words. A canvas still in the document is React looking twice, and `releaseWhenGone` re-checks one task later so nothing can leak if that ever stops being true. |
| **One handle per canvas** | a `GUARDED` WeakMap. Asked twice for the same element, `attach` hands back the handle that already guards it — no second `created`, no second pair of listeners, no orphaned renderer. |
| **r3f's late call, defused** | `adoptRenderer` replaces `forceContextLoss` on the **renderer instance** (an own property shadowing three's prototype method — nothing global is patched). The decision is one pure function, `lateLossVerdict`: **through** for our own release, which raises a one-shot flag; **swallow** when the canvas has gone, so the redundant call is silent and r3f's remaining cleanup still runs; **stop** when the canvas is still live. |
| **"stop" means stop** | it throws. r3f wraps that whole timer body in **one** try/catch and reaches `forceContextLoss` **before** `dispose(state.scene)` and `_roots.delete(canvas)`, so the throw is what keeps those two off a root the visible tree is still rendering into. That ordering is a fact about a pinned dependency, so `test/turn35-f4-webgl-context.test.js` asserts it against the dist file rather than assuming it. |
| **Prevent the default, and restore** | `onLost` already prevented the default, which is what makes a context restorable — but nothing ever asked for it back, so the guard had been counting a fault it could have healed. A loss **nobody here asked for** now calls `WEBGL_lose_context.restoreContext()` on the next task (the specification forbids restoring from inside the handler), at most three times, using the extension taken while the context was alive because `getExtension` on a dead one answers null. |
| **One console line** | `console.info('[cabinet-core] WebGL context restored — the <name> canvas is live again.')`, and it is the only `console.*` call in the module. |

### What was looked at and left

* **`state.events.disconnect`** is the timer's *first* line and cannot be
  wrapped: r3f's own `connect()` calls it (same file, `connect: target => { …
  events.disconnect?.() … }`), so a wrapper that threw would break event wiring.
  It is left alone, and it costs nothing: `CanvasImpl`'s layout effect has no
  dependency array, so the next render reconnects the events by itself.
* **The editor's canvas, unmounted by the single `modal` slot.** Pushing
  'part-detail' from the cabinet editor is two teardowns and two creations per
  drill-in. Keeping the editor mounted-but-hidden does not survive the shell:
  `components/Modal.jsx` hangs its Escape handler on the **window**, and a hidden
  editor's `canBack` is true the moment the detail is pushed, so one Escape would
  go back two levels; its `ResizeObserver` re-places a window whose box has just
  become 0×0; its `big` state would survive a pop that today re-opens maximised;
  and a second canvas rendering behind a window nobody can see works against the
  very complaint F4 is about. `Modal.jsx` is not this turn's to change. Recorded
  in `src/pages/ConfiguratorPage.jsx` beside the mount, rather than forced.
* **`<React.StrictMode>` stays.** It is half of the cause and it is a
  development check that finds exactly this class of bug — it found this one. It
  compiles out of the production bundle by itself.
* **The renderer r3f never handed over.** If a window is closed before
  `onCreated` fires there is no renderer to wrap, and the guard falls back to
  `loseContextOf(canvas)` as it has since turn 20. A stray line is still possible
  in that window. Not seen in any run below; named rather than claimed away.

---

## The evidence

`verify/t35/f4-webgl-walk.mjs`, driven by the house's own zero-dependency
`scripts/cdp.mjs` in a real headless Chromium (SwiftShader). It opens a project,
waits **past r3f's 500 ms timer**, then leaves for the start screen and opens a
fresh project **ten times**, and reads:

* `document.querySelectorAll('canvas').length` — the DOM's own count;
* `window.__cc.diag` — the guard's `created / released / lost / restored` and
  `liveContexts()`;
* the canvas's own `gl.isContextLost()` and the live scene's mesh count;
* **every** browser log entry at **every** level, filtered for `loseContext`.

Run it with:

```
npx vite build && npx vite preview --port 4173 &
node verify/t35/f4-webgl-walk.mjs
# …and the half that only development can show:
npx vite --port 5199 &
E2E_URL=http://127.0.0.1:5199/ node verify/t35/f4-webgl-walk.mjs
```

"Before" is `git archive HEAD` built and served in an isolated copy, so the two
builds differ by this commit and nothing else.

| run | `loseContext` lines | `created` / `released` after 10 flips | canvases | steps |
|---|---|---|---|---|
| **before**, production preview | **10** — one per flip | 11 / 10 | 1 | 11/12 |
| **before**, dev (StrictMode) | 0 | **22 / 21** | 1 | **9/12** |
| **after**, production preview | **0** | 11 / 10 | 1 | **12/12** |
| **after**, dev (StrictMode) | **0** | **11 / 10** | 1 | **12/12** |

Raw: `f4-webgl-before-preview.json`, `f4-webgl-before-dev.json`,
`f4-webgl.json`, `f4-webgl-dev.json`. Pictures of the room after the tenth flip:
`f4-before-ten-flips.png`, `f4-after-ten-flips.png`.

The three steps that fail before and pass after, in development — the frozen
viewport, exactly:

```
FAIL  one context MADE — a simulated unmount is not a second canvas — created 2, released 1
FAIL  the visible canvas still HAS its context 2.6 s in — {"contextLost":true,"meshes":null}
FAIL  and the scene it draws was not disposed under it — {"contextLost":true,"meshes":null}
```

```
  ok  one context MADE — a simulated unmount is not a second canvas — created 1, released 0
  ok  the visible canvas still HAS its context 2.6 s in — {"contextLost":false,"meshes":59}
  ok  and the scene it draws was not disposed under it — {"contextLost":false,"meshes":59}
```

And the one that fails before and passes after in the build the owner actually
runs:

```
FAIL  ZERO loseContext errors in the console log — WebGL: INVALID_OPERATION: loseContext: context already lost | … ×10
  ok  ZERO loseContext errors in the console log
```

After ten flips, in both modes: **one canvas, one live context, eleven made and
ten given back, zero losses nobody asked for, zero `loseContext` lines.**

## The bench

`test/turn35-f4-webgl-context.test.js` — 13 tests. The verdict is pinned byte
for byte (an inverted ternary there flips the whole feature); the wiring is
pinned as source text, the way `test/turn23-f2-f4-hardware.test.js` does, because
`node --test` cannot import a `.jsx` and this module cannot become a `.js` —
`3d/Scene.jsx` imports it by name and turns 20 and 21 read it by name. r3f's own
dist is read and its call order asserted, so the day the dependency moves that
line the suite says so instead of the owner's viewport saying it. Full suite:
**3140 tests, 0 failures**, and `npx vite build` is green.
