# F9 — the eye-level pair, measured

Chromium (SwiftShader), the shipped build, three BUD units on a 4 × 3 m wall,
fronts painted RAL Slate `#2E3946` at **sheen 75** (the 60–90 band CLAUDE.md
F9.2 asks for). The camera orbits −40°…+40° in 10° steps at 2.8 m out, looking
at 0.75 m.

Only the **painted front pixels** are read (luminance < 170 and blue-leaning).
That filter is the point of the third probe: the first two measured a band of
the frame, and a white room saturates at 253 whatever the lights are doing, so
they showed nothing. The fronts are the surface the phase is about.

The pair is found in the live scene at

```
{x: 2.139, y: 1.650, z: 1.866, i: 12, colour #fff6ec}
{x: -0.939, y: 1.650, z: 1.866, i: 12, colour #fff3e4}
```

— symmetric about the FURNITURE's own centre (x 0.600 ± 1.539), as every other
light in this rig is, and at **exactly 1650 mm above the floor**: `yMm` is
absolute and does not scale with the rig distance, which is the whole of F9.1.

## At eye level (camera y = 1.65 m)

| azimuth | −40 | −30 | −20 | −10 | 0 | +10 | +20 | +30 | +40 |
|---|---|---|---|---|---|---|---|---|---|
| Δ mean on the fronts | +5.3 | +9.5 | +9.4 | +12.4 | +2.1 | **+18.4** | +14.0 | +14.2 | +12.8 |
| Δ brightest patch | 0 | −1 | +1 | +1 | **+59** | 0 | 0 | 0 | **+59** |

Every azimuth gains, and at two of them a **new brightest patch appears** —
a highlight that was not there with the pair off.

## From a steep angle (camera y = 3.2 m), for contrast

| azimuth | −40 | −30 | −20 | −10 | 0 | +10 | +20 | +30 | +40 |
|---|---|---|---|---|---|---|---|---|---|
| Δ mean on the fronts | +21.8 | +2.9 | — | — | — | +17.8 | −2.7 | −0.3 | −5.0 |

Three azimuths read nothing at all: from above, the fronts are not in the frame
to be lit. That is the owner's complaint stated the other way round, and it is
why the pair is at eye level rather than one more light in the ceiling.

**Shipped value: intensity 12**, the owner's own starting number (F9.1). It
gives roughly +10 luminance on a painted front at normal viewing angles without
blowing anything out; the numbers are in `profile.appearance.studio.points` and
he will turn them.
