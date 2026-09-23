# T74 F12 · the probe: when is the J-pull groove seen

The owner, 23.09.2026: *"na 3D nie widać J-pulla w ogóle; czasami się pojawia, ale nie wiem co powoduje, że
czasami widać, czasami nie; pasowałoby, żeby miał cień, bo teraz nie ma i nic nie widać."*

Run by `node scripts/t74-probes.mjs f12`. A wardrobe from WHERE, doors and the J-pull from EXTRAS' own buttons,
then each condition by the room's own controls (FRONT, OPEN ALL, ROOM and a real orbit drag, a colour chip, a typed
width, a reload). `groove luma` is the mean luminance of the groove's patch on the screenshot (6 to 26 mm in from
the J edge, the middle of the run), `door face luma` a patch of plain door 60 to 120 mm in, same height; `groove vs
face` is how far apart the two are. A groove the eye can find differs from its door.

| condition | leaf | solid built | shadows | groove luma | door face luma | groove vs face | frame |
|---|---|---|---|---|---|---|---|
| doors shut, front camera | W01-FL (R) | BufferGeometry, 540 vertices | cast true, receive true, key normalBias 20 mm | 67.3 | 65.8 | 2.3 % | f12-probe-1-shut.png |
| doors open (OPEN ALL) | W01-FL (R) | BufferGeometry, 540 vertices | cast true, receive true, key normalBias 20 mm | 88 | 93.8 | 6.2 % | f12-probe-2-open.png |
| shut again (OPEN ALL twice) | W01-FL (R) | BufferGeometry, 540 vertices | cast true, receive true, key normalBias 20 mm | 67.3 | 65.8 | 2.3 % | f12-probe-3-shut-again.png |
| orbit (ROOM, then a real drag) | W01-FL (R) | BufferGeometry, 540 vertices | cast true, receive true, key normalBias 20 mm | 113.2 | 154.5 | 26.7 % | f12-probe-4-orbit.png |
| a colour change (fronts-colour-f1) | W01-FL (R) | BufferGeometry, 540 vertices | cast true, receive true, key normalBias 20 mm | 67.5 | 65.9 | 2.4 % | f12-probe-5-colour.png |
| a width change (SIZE, typed 1400) | W01-FL (R) | BufferGeometry, 540 vertices | cast true, receive true, key normalBias 20 mm | 64.3 | 63.2 | 1.7 % | f12-probe-6-width.png |
| a page reload | (the client's room keeps no project across a reload: `setPersistence('none')`, `main-retail.jsx`) |  |  |  |  |  |  |

## The verdict, before any fix

THE CONDITION IS THE CAMERA, NOT THE STATE. The J leaf's solid is built in every row (the groove is in the
geometry: 540 vertices, not a box), and it survives open, shut, a colour and a width. What changes is how the
groove faces the eye: its floor faces the room exactly as the door does, in the same material, so head-on
(shut, the colour, the width) it differs from the door by 2 %, which is nothing; only when the step walls turn
toward the light (an orbit: 27 %, a door open: 6 %) is it seen. That is *"czasami się pojawia"*.

AND NO SHADOW REACHES IT: the door mesh casts and receives, but the key light's `normalBias` is 20 mm
(`profile.render.shadow.normal.normalBias` 0.02 m), the whole depth of the step, so the shadow the lip would throw
into the groove is biased out of it. The reload row is not a J fault: the client's room keeps no project across a
reload at all.
