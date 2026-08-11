# F10 — the lost contexts, counted

The owner's console carried `THREE.WebGLRenderer: Context Lost.` ten times over.

## The cause

`WebGLRenderer.dispose()` — which react-three-fiber DOES call when a canvas
unmounts — frees the renderer's GPU objects and **does not release the drawing
context**. The context stays alive on a detached canvas until the collector comes
past. Chrome allows about sixteen live WebGL contexts and kills the OLDEST to make
room, so a joiner who opens the cabinet editor a dozen times watches the browser
reclaim contexts this app was still holding. Not lost — hoarded.

`3d/contextGuard.jsx` releases it deliberately (`forceContextLoss`) as the canvas
goes away, and counts what happens on `window.__cc.diag`. A deliberate release is
counted APART from a loss nobody asked for, which is what lets the gate below be
zero and mean something.

## The counter, after the walk's own cycle

12 × open/close the cabinet editor, then 4 × open/close the render modal:

```json
{
 "created": 12,
 "released": 12,
 "lost": 0,
 "restored": 0,
 "live": 1,
 "names": [
  "room"
 ]
}
```

* **lost: 0** — the gate. A `webglcontextlost` nobody here asked for.
* **released: 12** — our own, on the way out, every time.
* **live: 1** (room) — one per surface, reused across opens.
