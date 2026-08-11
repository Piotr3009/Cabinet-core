# F5 — the context guard stops shooting corpses

> **CLAUDE.md F5.** The owner's console: `WebGL: INVALID_OPERATION: loseContext:
> context already lost`, ten times, from `forceContextLoss`.

## Before

`3d/contextGuard.jsx → release()` did the right thing — release the context,
which is what `dispose()` does not — and asked no question first:

```js
  try {
    if (handle.gl) {
      handle.gl.forceContextLoss?.();     // ← on a context that may be gone
      handle.gl.dispose?.();
    } else {
      loseContextOf(handle.canvas);       // ← same, without a renderer
    }
  } catch { /* already gone */ }
```

`forceContextLoss()` on an already-lost context is an `INVALID_OPERATION`, and
the browser logs one line per call. `try/catch` cannot help: it is not an
exception, it is a WebGL error the driver records and the console prints.

## After

Two different questions, asked separately:

* **"have I already done this?"** — turn 20's `handle.releasing`, untouched.
* **"is there anything to do?"** — turn 21's `stillLive(handle)`, which asks in
  three ways and takes any one of them for an answer:
  * `handle.gone`, set by the `webglcontextlost` listener however the loss
    arrived — ours, or a driver reset — and set FIRST in that listener so an
    early return cannot skip it;
  * `gl.getContext().isContextLost()`, which is the authority;
  * no renderer at all, in which case the fallback asks the raw context the
    same question before reaching for `WEBGL_lose_context`.

`dispose()` still runs either way: it frees the renderer's own GPU objects and
is safe on a context that has gone. `handle.gone` is set to false again on
`webglcontextrestored` — a driver reset under a working scene is a hiccup, and
the canvas that comes back still owns a context this hook is responsible for.

## The evidence

`scripts/e2e-turn21.mjs` opens and closes the cabinet editor **twelve times**
and reads the console across the whole cycle (R5). From `verify/t21/walk.json`:

```
ok  F5.2 twelve editor cycles: ≤ 2 live contexts and nothing LOST
    — {"created":12,"released":12,"lost":0,"live":1}
ok  F5.1 …and ZERO `INVALID_OPERATION: loseContext: context already lost`
    — clean
```

Twelve created, twelve released, none lost, one live at the end (the room's).
The console capture for the cycle is `verify/t21/context-guard-console.txt`; it
contains one line, and it is not an error:

```
warning: THREE.WebGLRenderer: WEBGL_lose_context extension not supported.
```

That is SwiftShader saying it has no `WEBGL_lose_context` — this container has
no GPU. It is the fallback branch reporting honestly, and the release still
happens through the renderer. On the owner's machine the extension is there;
what has changed is that it is only ever called on a context that still exists.

`verify/t21/console.txt` carries the whole session's console. The only errors in
it are two `favicon.ico` 404s (the page never asks for one) and the blocked
storage host — see `bucket-live.md`.
