# The black cylinder — a mesh report, not a render (turn 23, CLAUDE.md F3)

> Owner's screenshot: **a black drum floating beside each hinge.**

F3's first line is the rule this report exists for: **diagnose by MESH, not by
eye.** A render is a picture of an answer.

---

## THE VERDICT

**The drum is not in the file. It is ours.**

It is `Hardware.jsx`'s own procedural **cup and boss** — a ⌀35 × 12.5 cylinder
and a ⌀33 × 16 cylinder, drawn in `appearance.hardware.hinge` (`#5b5f63`, a dark
hardware grey) — rendered straight through the downloaded model that had just
arrived over the top of them.

The cause is one missing guard, and it has a very precise shape. Turn 19 gave
the ARM and the PLATE this line when it introduced the GLB path:

```jsx
<Pieces … visible={!drawnModel}>          // the arm
<Pieces … visible={!drawnModel}>          // the plate
```

`DoorHinges` — the cup and the boss, drawn since turn 12, in a different
component and under a different parent — never got it. So on any project where
the bucket answered, every hinge was drawn **twice**: once as Blum's own body,
and once as a dark ⌀33 drum standing 16 mm proud of the door's back face, right
beside it. On a project where the bucket did NOT answer, the stand-in was all
there was and the picture was correct — which is exactly why this survived three
turns of review and only showed up on the owner's screen.

The fix is the same line, three times, in `3d/Hardware.jsx → DoorHinges`:

```jsx
<Pieces … visible={!drawnModel}>          // the cup   ← new
<Pieces … visible={!drawnModel}>          // the boss  ← new
<Pieces … visible={!drawnModel}>          // the arm   ← moved here with the body (F2)
```

`test/turn23-f2-f4-hardware.test.js` asserts all three, by walking the
component's `<Pieces>` and requiring every one of them to carry the gate.

### What this rules OUT

F3 anticipated "an adjustment cam / cover mesh with its own material and a
displaced origin from the DAE conversion". That hypothesis makes a testable
prediction — a mesh sitting **clear of the rest of the model** — and
`scripts/glb-meshes.mjs` reports exactly that column. Two facts stand against
it:

1. the drum appears **beside every hinge, at the same offset**, which is what a
   second body drawn from OUR OWN instanced placement looks like and not what a
   file artefact looks like (an artefact travels with its own file, and the
   owner's project mixes 110° and 155° families);
2. the sizes match ours, not a cam's: a ⌀33 × 16 drum is
   `cupDiameter − 2` × `bossHeight` from `profile.hardware.hinge`, to the
   millimetre.

If the owner's own files DO also contain a stray mesh, the tool below finds it
in one command and the exclusion goes in the clone step by NAME. Nothing about
this turn's fix has to change for that.

---

## The tool

```
node scripts/glb-meshes.mjs <file|url> [more…]      # human-readable
node scripts/glb-meshes.mjs --md  <file|url> …      # the tables below
node scripts/glb-meshes.mjs --json <file|url> …
```

Zero dependencies and no three.js: a GLB is a header, a JSON chunk and a BIN
chunk, and every number it prints comes from the accessor `min`/`max` the spec
already requires on `POSITION`. It reads a **URL** as readily as a path, so the
moment anybody runs it on a machine that can reach the bucket, the real 71B and
173L tables drop straight in below.

The last column, **clear of the rest**, is the drum test stated as arithmetic:
the largest gap on any axis between this mesh's box and the union of every other
mesh's. A legitimate sub-assembly overlaps the model. A conversion orphan sits
clear of it.

---

## The real files: NOT READ IN THIS SESSION

This container's egress policy refuses the storage host outright:

```
$ curl -sS -o /dev/null -w "%{http_code}\n" \
    https://uhzwyhvwngfnyhxxlvmq.supabase.co/storage/v1/object/public/hardware/hinges/blum/71B3550_42542984.glb
curl: (56) CONNECT tunnel failed, response 403
```

`verify/t23/bucket-live.txt` records the same refusal for both family manifests,
over the URLs the APP itself composes. **No byte of the owner's pack reached
this machine**, so the tables below are the SILENT SHOWROOM's (R8) — synthetic
bodies this repository generates, filling the box measured off the real 71B3550
in the chat hotfix. Per F11.2 this is stated plainly rather than papered over.

One command, on a machine that can reach the bucket, produces the real tables:

```
node scripts/glb-meshes.mjs --md \
  https://uhzwyhvwngfnyhxxlvmq.supabase.co/storage/v1/object/public/hardware/hinges/blum/71B3550_42542984.glb \
  https://uhzwyhvwngfnyhxxlvmq.supabase.co/storage/v1/object/public/hardware/hinges/blum/173L6100_44724390.glb
```

### The measured facts we DO have about the real file

From the chat hotfix ("koduj te zawiasy"), written into `profile.js` beside
`modelOrigin` and reproduced here because they are the evidence the showroom is
built on:

```
71B3550   bbox  x −26.5 … 11      (37.5 wide)
                y ±28.5           (57 across the door's height)
                z −29.48 … 51.3   (80.78 front to back)
          cup slab 37.5 × 57 × 16 at z 35.3 … 51.3
          ⇒ authored axes ALREADY match the unit's (y up, +z into the door,
            arm to −z)
173L6100  8.5 × 53 × 41.5, base at x −8.5
```

Note what these say about the drum hypothesis: the real file's overall box is
80.78 mm front to back and 57 mm tall. A ⌀33 × 16 drum standing clear of that
would push the box out, and it does not — the measured extents are exactly the
cup slab plus the arm.

---

## The tables (the silent showroom, `test/fixtures/hardware-local/`)

### `71B3550_10001.glb` — one hinge

10480 bytes · glTF 2 · 5 mesh primitives · overall **37.5 × 57 × 80.78 mm**
(identical to the measured real bbox)

| mesh | material | verts | size (mm) | min (mm) | max (mm) | clear of the rest |
| --- | --- | --- | --- | --- | --- | --- |
| `HINGE_CUP` | `metal_nickel_raw` | 146 | 35 × 35 × 16 | -25.25, -17.5, 35.3 | 9.75, 17.5, 51.3 | touching |
| `HINGE_CUP_FLANGE` | `metal_nickel_raw` | 24 | 37.5 × 57 × 2 | -26.5, -28.5, 35.3 | 11, 28.5, 37.3 | touching |
| `HINGE_BODY` | `metal_nickel_raw` | 24 | 28 × 28 × 35.3 | -22, -14, 0 | 6, 14, 35.3 | touching |
| `HINGE_ARM` | `metal_nickel_raw` | 24 | 24 × 22 × 31.48 | -20, -11, -29.48 | 4, 11, 2 | touching |
| `CLIP_LEVER` | `plastic_black` | 24 | 16 × 12 × 11.48 | -16, -6, -29.48 | 0, 6, -18 | touching |

### `173L6100_20001.glb` — one plate

6564 bytes · glTF 2 · 2 mesh primitives · overall **8.5 × 53 × 41.5 mm**

| mesh | material | verts | size (mm) | min (mm) | max (mm) | clear of the rest |
| --- | --- | --- | --- | --- | --- | --- |
| `PLATE_BODY` | `metal_nickel_raw` | 24 | 8.5 × 53 × 41.5 | -8.5, -26.5, -20.75 | 0, 26.5, 20.75 | touching |
| `PLATE_CAM` | `plastic_black` | 146 | 8 × 8 × 6 | -8.25, -4, -8 | -0.25, 4, -2 | touching |

### `760H500T_3000500.glb` — one runner, for F4.3's second family

3028 bytes · glTF 2 · 2 mesh primitives · overall **12.5 × 51 × 500.5 mm**

| mesh | material | verts | size (mm) | min (mm) | max (mm) | clear of the rest |
| --- | --- | --- | --- | --- | --- | --- |
| `RUNNER_FACE` | `metal_nickel_raw` | 24 | 12.5 × 45 × 500.5 | 0, 0, 0 | 12.5, 45, 500.5 | touching |
| `RUNNER_FLANGE` | `metal_nickel_raw` | 24 | 6 × 6 × 500.5 | 0, -6, 0 | 6, 0, 500.5 | touching |

---

## What the table is FOR, beyond this turn

The **material names** in the second column are what F4.2's plastic allowlist
matches on. `profile.hardware.hinge.cliptop.plasticMaterials` ships as

```js
['plastic', 'pom', 'nylon', 'rubber', 'lever', 'cap']
```

matched case-insensitively as substrings, so `plastic_black`, `POM.001` and
`clip_lever` all keep a plastic look while `metal_nickel_raw` takes nickel or
onyx. **When the owner runs the tool on his own pack, the names it prints are
the list to check this against** — a converter that calls the lever
`Material.014` would plate it, and one line of `profile.js` fixes that without
touching code.
