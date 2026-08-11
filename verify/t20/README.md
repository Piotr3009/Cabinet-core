# verify/t20 — what is in here, and what each thing proves

Everything in this folder was produced by a script in `scripts/`, against the
build in `dist/`, on the branch it is committed to. Nothing here was written by
hand except the four `.md` reports, and each of those cites the machine output
beside it.

## The walk

`walk.json` — 40 checks, all green, from `node scripts/e2e-turn20.mjs` against
`npx vite preview`. Its header states the two standing rules it was written
under:

* **R1** — every click, double-click, drag and hover is CDP input
  (`Input.dispatchMouseEvent`, through `scripts/cdp.mjs`). `dispatchEvent` is
  used for **no** gesture anywhere in the script. Store-level asserts follow the
  real gesture; they never replace it.
* **R2** — the live bucket is asked before any hardware is photographed, and the
  answer is recorded verbatim, refusal included.

`measurements.json` — every number the walk read, so a claim in a report can be
traced to the reading behind it.

### The screenshots, in the order the walk takes them

| file | what it shows |
| --- | --- |
| `1a-drawer-box-on-its-runner.png` | F1 — the BUDR with its fronts off: three boxes standing on their runner rows |
| `3a-drawer-closed.png` / `3b-drawer-open-box-and-all.png` | F3 — before and after a REAL double-click on drawer 2's face. The box, not just the face, is out |
| `8a-main-scene-real-recesses.png` | F8 — the room, with every drilling cut into the board |
| `8b-editor-recesses-exploded.png` | F8.5 — the same unit exploded on the bench: the runner grooves read as dark recesses down each drawer side, and every drilling as a hole |
| `11a-drawer-editor.png` | F11 — the drawer's own window, opened by a REAL double-click on a box side |
| `11b-drawer-editor-exploded.png` | F11.3 — EXPLODE, with the runners going out beside their sides |
| `11c-drawer-editor-bottom-selected.png` | F11.5 — the bottom selected, its detail in the right panel |
| `5a-modal-beside-the-door.png` | F5 — a REAL double-click on a door; the panel stands clear of it |
| `6a-ruler-snap-marker.png` | F6 — a REAL hover near a corner: the END marker |
| `6b-ruler-two-marks-and-the-dimension.png` | F6.4 — two caught points and the dimension between them |
| `9a-cnc-real-doubleclick-lights-the-tree.png` | F9 — a REAL double-click on a part, which was dead to a real mouse in turn 19 |
| `9b-cnc-panned.png` | F9 — a REAL drag: the sheet pans, exactly as before |
| `9c-cnc-doubleclick-after-a-pan.png` | F9 — a REAL double-click AFTER the pan, on a DIFFERENT part: the capture was released |
| `7a-cnc-rollover-hole.png` / `7b-cnc-rollover-pocket.png` | F7 — a REAL mouse-move onto a drill and onto a pocket |
| `4a-cnc-sheet-half-size-labels.png` | F4 — the sheet with the halved label cap in force |
| `12a-interior-outlines.png` | F12.1 — interior edges reading against the faces they lie on |
| `12b-save-confirms.png` | F12.2 — a REAL click on Save: green, with a check |

## The CNC evidence

| file | what it is |
| --- | --- |
| `fingerprints-turn19-baseline.txt` | the turn-19 baseline, byte-identical to `verify/t19/fingerprints-turn19.txt` |
| `fingerprints-turn20.txt` | this branch |
| `fingerprints-diff.txt` | the diff |
| `probe-turn19-baseline.txt` / `probe-turn20.txt` / `probe-diff.txt` | `scripts/cnc-delta-probe.mjs`, entity by entity: geometry hashes, an entity census per preset sheet, and every TEXT entity with its layer, string, height and position |
| `cnc-export-identity.md` | the one named delta, and the count of everything that did not move: **0** geometry, **0** census, **0** strings, **0** positions, **397** text heights |

## The reports

| file | what it answers |
| --- | --- |
| `cnc-export-identity.md` | F4 — the turn's only intended CNC delta, and the proof it is confined to text heights |
| `fixture-delta.md` | F1 — what moved in the engine's Y positions, why, and why no golden fixture needed regenerating |
| `bucket-live.md` | R2 — the derived host, the URLs this turn's fix produces, and the egress refusal that stopped them being fetched here |
| `context-lost.md` | F10 — the counter after 12 editor opens and 4 render opens |
| `bucket-live.json` | the raw output of `node scripts/bucket-live.mjs --json` |

`perf.md` is deliberately absent: CLAUDE.md asks for it "only if F8 uses a
distance gate", and F8 does not — the recesses are one merged, cached buffer per
panel configuration, shared by every identical panel, with no per-frame work to
gate. The whole three-drawer base unit is a few thousand triangles
(`test/turn20-f8-recesses.test.js` pins the order of magnitude).
