# verify/t26 — the lighting sum, before and after (F10)

> "One broad ceiling source at real ceiling height above the tall units, set
> back 1.5 m from the fronts, medium intensity." — and, in the same breath —
> "**Whatever is added above is subtracted from the facing spots** — the
> scene's total luminous contribution stays as it is today. Compute it, do
> not eyeball it."

This file is GENERATED (`node scripts/t26-lighting.mjs`) from
`src/engine/lighting.js` and the shipped profile, and
`test/turn26-f10-lighting.test.js` asserts the two sums below are the ones
the code produces. It cannot drift.

## The metric

"Total luminous contribution" has to mean ONE comparable number or
"subtract" is not an operation — and the rig mixes two kinds of source:

| kind | what `intensity` is | at the subject |
| --- | --- | --- |
| ambient, hemisphere, directional | an irradiance | `intensity` |
| spot, point (three r0.180, `decay: 2`) | candela-like | `intensity / d²` |

So the metric is **irradiance at the subject** — at the very point the whole
rig is already aimed at (`fit.centre`, which `ShadowFit` puts at the middle
of the furniture). Every source is converted to it and the sum is what must
not move. It is not the only defensible metric — one could integrate over
the furniture's surface — but it is the one the rig is built around and it
is exactly computable, which is what "compute it" asks for.

The fit below is a five-metre kitchen: the rig stands
**3.9 m** out from the furniture, whose front face is at
z = 0.9 m under a **2.7 m** ceiling. Scene units are metres.

## The ledger, lamp by lamp

| lamp | before | after | note |
| --- | ---: | ---: | --- |
| `ambient` | 0.2000 | 0.2000 | unchanged |
| `hemisphere` | 0.4500 | 0.4500 | unchanged |
| `key` | 1.0000 | 1.0000 | unchanged |
| `fill` | 0.5500 | 0.5500 | unchanged |
| `rim` | 0.3000 | 0.3000 | unchanged |
| `spot-0` | 3.1450 | 2.0442 | × 0.65 — the share the ceiling takes |
| `spot-1` | 2.6484 | 1.7215 | × 0.65 — the share the ceiling takes |
| `point-0` | 1.0734 | 1.0734 | the eye-level pair, unchanged (turn 14, F9) |
| `point-1` | 1.0734 | 1.0734 | the eye-level pair, unchanged (turn 14, F9) |
| `point-2` | 0.3220 | 0.3220 | the low pair, unchanged |
| `point-3` | 0.3220 | 0.3220 | the low pair, unchanged |
| `ceiling` | — | 2.0277 | NEW — and it is exactly what the two jupiters gave up |
| **total** | **11.0842** | **11.0842** | drift **0** |

## The identity

It is exact by construction rather than by tuning, which is why the drift is
zero to six decimals at any room size and any camera fit (the test sweeps
three distances × three ceilings × three setbacks):

```
before = A + H + K + F + R + Σ sᵢ/dᵢ²
after  = A + H + K + F + R + (1−share)·Σ sᵢ/dᵢ² + share·Σ sᵢ/dᵢ²
       = before
```

`share` is **0.35** — the fraction of the FACING SPOTS' contribution the
ceiling source takes over. "Medium intensity" is a judgement, and the honest
way to ship a judgement is as a fraction of something real rather than as a
magic candela: at any room size the spots keep
**0.65** of what they gave and the ceiling supplies the rest, with no
number to re-tune when the kitchen gets longer.

The ceiling lamp's own candela FALLS OUT of that. It hangs at
`[0, 2.7, -0.6]` — 1.836 m from the subject — so the intensity that
delivers the share from there is **6.83**. There is no intensity in
`profile.appearance.studio.ceiling` at all, deliberately: a number there would
be a second answer to a question the share has already answered.

## What a rig with no jupiters gets

Nothing. The constraint read the other way round: a workshop that has turned
the two facing spots off has nothing for the ceiling to take the light FROM,
and giving it a lamp anyway would be this feature making the room brighter —
which is the one thing it may not do. `enabled: false`, sum unchanged at
**5.2909**.

## And the slider (F10.3)

One multiplier on every lamp, **0.5–1.5** in steps of 0.05, default 1, remembered in
`localStorage` under `cc.brightness` exactly as X-ray and the front
dimensions are. PROPORTIONALLY is the whole of it: the RATIOS the rig was
balanced at — the key against the fill, the jupiters against the ambient —
are the ones turn 10 measured whatever the slider says, so nothing in
`verify/t10/measurements.json` is invalidated by moving it. A slider that
touched one lamp would be a slider that re-lights the scene.

The ledger scales with it and does not tilt: at 0.5 every row above is
exactly half of itself, which the test asserts row by row.

