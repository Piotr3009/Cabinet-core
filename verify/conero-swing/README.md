# CONERO swing walk (30.08.2026, chat feature)

`scripts/e2e-conero-swing.mjs` — parked / lowered / parked-again, with the
tube's measured travel (dz, dy) between them. The bucket answers 403 in the
verification container, so before running, drop the REAL bucket file at:

    test/fixtures/hardware-local/hardware/lifts/conero/conero-pantograf-730.glb

(not committed — the bucket is the source; 6.4 MB of binary does not belong in
the repo). Headless chromium starves rAF, so the walk proves click→switch and
pose→geometry at the endpoints; the easing between them is MovingPanel's own
shared line, eye-tested in a real browser like every door.
