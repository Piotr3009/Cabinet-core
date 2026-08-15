# verify/t30 — the proofs of turn 30

**Baseline: `07ea132`, main. Suite at that commit: 2 328 tests, 2 328 pass, from
a clean `npm ci`.** Every phase below adds its own tests and its own pictures,
and the suite is green and the build clean at every one of the twenty-one
commits.

Run the walk with:

```
npm run build
npx vite preview --port 4173 &
node scripts/e2e-turn30.mjs            # or --only f1,f3,…
```

---

## R2 — the live bucket is BLOCKED in this container, and it is recorded

`bucket-live.json`: the storage host answers **403** to both manifests through
this session's egress proxy. Every GLB-dependent phase therefore runs on the
SILENT SHOWROOM (`test/fixtures/hardware-local/`, served by
`scripts/fixture-server.mjs`, reached through the app's own documented
`localStorage['cc.hardwareBase']` knob) — the app's catalogue resolution, URL
composition, loader, cache, clone, pose, mirror, swing and finish all run
exactly as they run against Blum's own files.

**Turn 30 grew the showroom by one family, and that growth is the point of F1.**
Until tonight it carried only `71B3550` — the 110° file every origin in
`profile.js` was derived from, and therefore the one file the old placement
could not get wrong. `scripts/make-fixture-hardware.mjs` now also writes
`71B7550` / `71B7590`, the 155° wardrobe family: the same cup at the same
absolute place, and an arm long enough to move the file's `min`. No Blum bytes
entered the repository; every vertex is written by that script from numbers in
that script.

---

## F1 [CRITICAL] — the hinge body stands on an ABSOLUTE datum

The owner, of a 155° hinge: *"jest za głęboko osadzony w drzwiach i się nie
otwiera."*

`modelOrigin` is MIN-RELATIVE — it says how far a file's bounding-box corner
must travel — and it was derived from `71B3550_42542984`'s own box. On that
file it is right by construction. A 155° body is longer behind the leaf, so its
`min` is somewhere else and the same subtraction carries the whole hinge in
after it.

**The fix is the KIND of number, not the number.** `fileDatum: { x: −7.75,
y: 0, z: 40.3 }` is the cup datum of the ONE authoring frame every Blum hinge
GLB in the bucket shares, and the body is placed at `−fileDatum`, absolute,
with the bounding box out of it altogether. `foldPivotMm` collapses with it, to
`axis − fileDatum`.

### Proved, not asserted

| | |
| --- | --- |
| on `42542984` the two transforms are **byte-identical** | `−min + modelOrigin = −min + (min − fileDatum) = −fileDatum`, read off the file's own bytes in `test/turn30-f1-hinge-datum.test.js` |
| on the 155° file they are **17.02 mm apart** | the old math lands the flange plane 17.02 mm inside an 18 mm leaf — the owner's fault, as arithmetic — and slides it 7.5 mm sideways as well |
| the pin has **not moved** | `axis − fileDatum` = (−10.33, 0, +2.56) mm, turn 29's measured knuckle to the micron |
| the PLATE is untouched | `plateOrigin` and `plateSpinDeg` keep the min-relative path; CLAUDE.md: "the owner's plate is right today" |

### And in a real Chromium, on the mounted meshes

`node scripts/e2e-turn30.mjs --only f1` → **12 ok · 0 failed · 1 blocked (R2)**.

The reading is how far the mounted body reaches into the mounted leaf, taken in
the LEAF's own frame — each mesh's own geometry box transformed corner by corner
by `leaf⁻¹ · mesh`, so it survives the door swinging.

| | 0° | 90° | 110° |
| --- | --- | --- | --- |
| **110° file**, cup, L and R | 11.00 | 11.00 | 11.00 |
| **155° file**, cup, L and R | 11.00 | 11.00 | 11.00 |

Eleven millimetres is the bore the owner measured. Both files, both hands, every
angle, to the hundredth. The 155° cup sits **exactly** where the 110° cup sits,
which is the whole claim of a shared authoring frame — and it is what the old
placement could not do.

Also read off the same scene: the knuckle is one point to 0.000 mm at every
angle on both hands, the pin is the measured (−10.33, 0, 2.56), and the arm
keeps the carcass's attitude to 0.000°.

### The pictures

| file | |
| --- | --- |
| `1a-155-left-hand-{closed,90,110}-cup-in-its-bore.png` | the 155° hinge on the left-hung leaf, framed off the ironmongery's own mounted meshes |
| `1b-155-right-hand-{closed,90,110}-cup-in-its-bore.png` | the same, mirrored |
| `1c-155-both-hands-open-the-doors-do-open.png` | both leaves at 90° with the 155° hinges in frame — the sentence the owner's fault denied |
| `1d-110-left-hand-{closed,90,110}-cup-in-its-bore.png` | the 110° file at the same three angles, for comparison |
| `1e-110-right-hand-110-cup-in-its-bore.png` | and the other hand |

---
