# The silent showroom (turn 23, CLAUDE.md R8)

> **R8.** Hardware visuals are proven on the SILENT SHOWROOM. The cloud sandbox
> cannot fetch the bucket (403), so GLB-dependent phases can never again end
> `blocked`.

Everything in this folder is **generated**, by

```
node scripts/make-fixture-hardware.mjs
```

and it is checked in so the acceptance walk needs nothing but a static file
server. Delete the folder and re-run the script and you get it back byte for
byte.

## No Blum bytes

Every vertex is written by `scripts/make-fixture-hardware.mjs` from numbers in
that file. Nothing was downloaded, converted or copied from a manufacturer's
pack, so the licence question (BLOCKERS #75) stays exactly where it was.

## Why it is shaped like the bucket

The layout is the bucket's, not a convenience:

| path | family |
| --- | --- |
| `hardware/hinges/blum/manifest.json` + `*.glb` | CLIP top BLUMOTION |
| `hardware/runners/blum/movento/manifest.json` + `*.glb` | MOVENTO 760H |

`hardware` is the bucket name and the rest is `profile.hardware.*.path`, so the
app composes exactly the same URLs it composes against Supabase Storage —
`engine/hardwareUrl.js` is not asked to do anything different. Point the app at
this folder with

```js
localStorage.setItem('cc.hardwareBase', 'http://127.0.0.1:4174')
```

(`lib/storageBase.js` — the documented service knob, and the TOP slot of
`lib/hardwareSource.js`'s resolution order) and the catalogue resolution, the
URL composition, the loader, the cache, the clone, the pose, the mirror, the
swing and the finish all run on the path they run on in production. **No
fixture-only branch exists anywhere in the app.**

## The dimensions are the measured ones

The synthetic hinge fills the same box as the owner's real 71B3550, measured
headless in the chat hotfix and written into `profile.js` beside `modelOrigin`:

```
bbox  x −26.5 … 11      (37.5 wide)
      y ±28.5           (57 across the door's height)
      z −29.48 … 51.3   (80.78 front to back)
cup slab  37.5 × 57 × 16 at z 35.3 … 51.3
```

and the plate fills the 173L6100's: 8.5 × 53 × 41.5 with its base at x −8.5.
That is what makes the profile's `modelOrigin` / `plateOrigin` — which were
DERIVED from those numbers — land the cup in its bore and the plate on the panel
face here without a single fixture-only constant. `test/turn23-f2-f4-hardware
.test.js` asserts it.

## What it does NOT prove

The FILES. That is R2's job and it is unchanged: `node scripts/bucket-live.mjs`
fetches the real manifests and HEADs a real model over the URLs the app itself
composes. In this session that check is refused by the egress proxy and
`verify/t23/bucket-live.md` records the refusal verbatim.

This folder proves the RENDERING. The two together are the whole claim.
