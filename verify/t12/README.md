# verify/t12 — what turn 12 was seen doing

Produced by `node scripts/e2e-turn12.mjs` against a production build in a real
Chromium (`npm run build && npx vite preview --port 4173`). **29/29 checks
passed**; `measurements.json` carries every number the walk read, not just the
verdicts.

The walk MEASURES rather than photographing: the colour is read out of the
store the scene paints from, the modal's position out of the DOM, the plinth's
length out of the engine's own panel record.

| shot | what it shows |
|---|---|
| `1a-settings-from-top-bar` | F1 — ONE settings surface, opened from the top bar, with Room setup on it |
| `2a-modal-beside-its-object` | rule 15 — the window stands beside the cabinet, covering nothing |
| `2b-modal-dragged-still-on-screen` | rule 15 — dragged by its header, off the screen, and clamped back onto it |
| `3a-library-kitchen-order` | F3 — the Kitchen list in the owner's order, DW/Corner/L-shape held open |
| `3b-drawer-group-expanded` | F3.2 — the drawer unit expanded to its four splits, 1× disabled |
| `3c-two-drawer-unit-placed` | F3.2 — a 2× drawer unit standing in the room, two fronts of 382 |
| `4a-explode-mid-animation` | F4.1 — the parts caught on the way apart |
| `4b-exploded` | F4.1 — settled, with the properties panel mirroring the same piece |
| `4c-part-rotated` | F4.2 — one part turned over in the hand |
| `5a-partitions-centred` | F5.2 — Centre: three equal bays |
| `5b-partition-follows-the-shelf` | F5.3 — the shelf set back, the partition shrunk with it |
| `5c-zone-highlight` | F5.3 — the bay a shelf would land in, highlighted |
| `6a-wall-unit-stops-at-tall` | F7 — the hanging unit stopped flush at the tall one |
| `7a-one-plinth-across-four-units` | F8 — one toe kick across the run |
| `8a-ctrl-z-brought-it-back` | F9 — the cabinet after Ctrl+Z, selected |
| `9a-hinges-in-solid` | F6.1 — the door open, the ironmongery on the carcass |
| `9b-dogbone-tab-close-up` | F6.1 — six hinge bodies down the side, at the drilled rows |
| `9c-dogbone-tabs-exploded` | **F6.2 — the dog-bone tabs, with their reliefs, standing out of the panel edges** |
| `10a-tall-back-panel` | F10 — the fridge housing's back, laid down at its cut size |

`cnc-export-identity.md` is the rule-7 report: the fingerprint diff between the
turn-11 baseline and this branch, with the one deliberate delta explained and
the new variants listed separately. `fingerprints-turn11-baseline.txt` and
`fingerprints-turn12.txt` are the raw outputs it was made from.
