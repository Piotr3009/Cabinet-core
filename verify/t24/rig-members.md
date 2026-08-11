# The hinge splits in two — the members, re-verified (turn 24, CLAUDE.md F1)

> The owner's verdict on turn 23: the model must **BREAK in the middle** — cup
> side with the door, body side with the plate — or, failing that, disappear
> when open. A better file will not fix this; a GLB is a rigid cast. A rig will.

---

## The table CLAUDE.md measured, and what it is used for

| node | z range (file mm) | tris | member |
| --- | --- | --- | --- |
| `bau0015089612` | 35.3 .. 51.3 | 5216 | **A** cup |
| `bau0015088783` | 39.4 .. 50.1 | 332 | **A** cup |
| `bau0015088853` | 31.1 .. 44.9 | 416 | **A** cup |
| `bau0015088251` | −28.0 .. 46.2 | 2634 | **B** body |
| `bau0019416036` | −29.4 .. 22.5 | 364 | **B** body |

Member **A** — cup, flange, clip cap, link cover — parents to the DOOR and
rides the leaf exactly as turn 23 left it. Member **B** — arm and rear body with
the lever — parents to the CARCASS beside the plate and stays there.

`bau0015088251` is the node that makes the rule: it spans **−28 … 46.2**, right
across the 30 mm threshold, and it is member B. A split done by geometry alone
would cut the arm in half. **The split is by NODE NAME**, and the z-threshold
(`z > 30 ⇒ A`) is only the fallback for a future file whose names nobody has
seen yet.

## As shipped, in `profile.js`

```js
hardware.hinge.cliptop.rig = {
  enabled: true,
  hideBeyondDeg: 15,
  memberA: ['bau0015089612', 'bau0015088783', 'bau0015088853'],
  memberB: ['bau0015088251', 'bau0019416036'],
  zThresholdMm: 30,
  axis: { z: 33.5, x: -7.75 },      // the arm's front pivot, in file mm
}
```

`axis` is F1.2's fold pivot: member B rotates about a horizontal axis parallel
to the hinge row (the file's Y) at the arm's front pivot, by the door's own
opening angle, so the arm follows the cup into the opening while its rear stays
at the plate. **This is a one-joint approximation of Blum's seven-hinge
linkage** — it is named as such in `3d/hingeModels.js` and no attempt is made at
the real four-bar geometry.

`enabled: false` is the owner's explicit fallback: with the flag off, an opening
door HIDES the hinge model beyond `hideBeyondDeg` and shows the plate only. The
flag ships; the owner decides after his eye test.

---

## Re-verification — what was measured, and against which file

### R2 honesty, first

**The live bucket could not be read in this session.** The storage host answers
`403 CONNECT` at this environment's egress proxy — the fourth turn running (see
`bucket-live.md`, and `verify/t23/bucket-live.md` for turns 21–23). So the z
ranges and triangle counts in the table above are **quoted from CLAUDE.md**,
where the owner's own export was measured; they are not re-measured here,
because the file this session can reach is not that file.

The instrument is ready for the moment it is: `scripts/glb-meshes.mjs` takes a
URL as readily as a path, so

```
node scripts/glb-meshes.mjs --md \
  https://…/hardware/hinges/blum/71B3550_10001.glb
```

drops the real table straight into this document from any machine that can
reach the bucket.

### What CAN be verified here, and is

The silent showroom (R8) is built by `scripts/make-fixture-hardware.mjs` to
**the table above** — the real export's own `bau…` node names, at the real
export's own z ranges. That is not decoration: F1.3 splits by NAME, so a
showroom whose nodes were called `HINGE_CUP` would exercise the fallback and
never the rule.

`node scripts/glb-meshes.mjs --md test/fixtures/hardware-local/hardware/hinges/blum/71B3550_10001.glb`:

| mesh | material | verts | size (mm) | min (mm) | max (mm) |
| --- | --- | --- | --- | --- | --- |
| `bau0015089612` | `metal_nickel_raw` | 146 | 35 × 35 × 16 | -25.25, -17.5, **35.3** | 9.75, 17.5, **51.3** |
| `bau0015088783` | `metal_nickel_raw` | 24 | 37.5 × 57 × 10.7 | -26.5, -28.5, **39.4** | 11, 28.5, **50.1** |
| `bau0015088853` | `metal_nickel_raw` | 24 | 28 × 28 × 13.8 | -22, -14, **31.1** | 6, 14, **44.9** |
| `bau0015088251` | `metal_nickel_raw` | 24 | 24 × 22 × 74.2 | -20, -11, **−28** | 4, 11, **46.2** |
| `bau0019416036` | `plastic_black` | 24 | 16 × 12 × 51.98 | -16, -6, **−29.48** | 0, 6, **22.5** |

Every z range matches the table. The vertex counts do not and are not meant to:
these are boxes and a cylinder standing in for a STEP conversion's 5216-triangle
cup, and F1 is about which node goes where, not how finely it is tessellated.

### …and the split itself, off the running scene (R4)

The walk does not read the fixture. It reads `window.__cc.hardware` — the app's
own registry — after the app has loaded, split and mounted the model:

```
F1.1  the model is cut in two, and each half says which it is
      cup ["A"] · body ["B"]

F1.3  the split is by NODE NAME, off the file's own strings
      A ["bau0015088783","bau0015088853","bau0015089612"]
      B ["bau0015088251","bau0019416036"]

F1.1  member B is parented to the CARCASS, beside the plate — 6 rows
F1.2  the fold pivot is on the cup's axis, 1.8 mm behind the flange
      {"x":-3.1e-7,"y":0,"z":-1.8000009047985088}
```

The pivot is reported in the CUP's own frame: `axis.z 33.5` and `axis.x −7.75`
resolved against the file's measured box put the joint 1.8 mm behind the cup
flange and dead on the cup's bore axis (x ≈ 0 to within a float). That is the
number as shipped, measured, not asserted.

### And that it folds

Three poses, from the same registry, on the same six hinges:

| | member A (cup) | member B (arm) | fold | plate |
| --- | --- | --- | --- | --- |
| closed | `-0.277, -0.929` | `-0.277, -0.929` | 0 rad | `-0.282, -0.969` |
| 90° open | `-0.2895, -0.8933` | `-0.277, -0.929` | **−1.7279 rad** | `-0.282, -0.969` |

Six of six cups travelled with their doors; **zero of six arms** were dragged
into the room; six of six folded at the axis by the door's own angle; the plate
did not move at all. −1.7279 rad is 99°, which is this leaf's own opening angle
— the fold follows the door, it does not have an angle of its own.

Pictures: `1a-rig-closed.png`, `1b-rig-45.png`, `1c-rig-90.png`,
`1d-rig-90-close-up.png`.
