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
| doors shut, front camera | W01-FL (R) | BufferGeometry, 540 vertices | cast true, receive true, key normalBias 20 mm | 49.5 | 65.8 | 24.8 % | f12-probe-1-shut-after.png |
| doors open (OPEN ALL) | W01-FL (R) | BufferGeometry, 540 vertices | cast true, receive true, key normalBias 20 mm | 168.8 | 29.2 | 478.1 % | f12-probe-2-open-after.png |
| shut again (OPEN ALL twice) | W01-FL (R) | BufferGeometry, 540 vertices | cast true, receive true, key normalBias 20 mm | 49.5 | 65.8 | 24.8 % | f12-probe-3-shut-again-after.png |
| orbit (ROOM, then a real drag) | W01-FL (R) | BufferGeometry, 540 vertices | cast true, receive true, key normalBias 20 mm | 112.7 | 154.5 | 27.1 % | f12-probe-4-orbit-after.png |
| a colour change (fronts-colour-f1) | W01-FL (R) | BufferGeometry, 540 vertices | cast true, receive true, key normalBias 20 mm | 49.8 | 66 | 24.5 % | f12-probe-5-colour-after.png |
| a width change (SIZE, typed 1400) | W01-FL (R) | BufferGeometry, 540 vertices | cast true, receive true, key normalBias 20 mm | 47.2 | 63.2 | 25.3 % | f12-probe-6-width-after.png |
| a page reload | (the client's room keeps no project across a reload: `setPersistence('none')`, `main-retail.jsx`) |  |  |  |  |  |  |


## After the fix

The same real-hand run after T74 F12. Head-on, where the room light cannot show the step, the groove now reads
at a quarter off its door (25 % against 2 % before: shut, shut again, the colour, the width), through
`appearance.jpull.grooveShade` (0.5, the workshop's number), and at the orbit it reads as it always did (27 %).
The door mesh casts and receives the scene's shadows in every row; the key light's `normalBias` (20 mm) is the
whole scene's and is untouched, which is why the shade and not a shadow carries the groove head-on. The open row
measures the leaf turned edge-on to the camera (the patches follow the leaf since this run), so its percentage says
nothing about the groove. Frames `f12-probe-*-after.png`, before them `f12-probe-*.png`.
