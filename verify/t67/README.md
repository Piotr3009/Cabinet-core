# verify/t67 — THE ROOM IN ONE WINDOW, AND THE FIRST NAMED CUTS INTO PRO

Every claim turn 67 makes about a PAGE ends in a frame here. `npm test` and
`npm run build` can both be green while the thing on screen is wrong, because
neither of them opens a browser.

```
npm run build && npx vite preview --port 4173
node scripts/t67-walk.mjs                 # every section
node scripts/t67-walk.mjs f1 lazy         # some of them
bash  scripts/t67-led-pair.sh             # F10's before/after, from two builds
node  scripts/t67-classify.mjs            # the engine/lib deltas, and the six goldens
```

## THE EVENT OF THIS TURN

PRO's component tree had been frozen at byte level since T59. Asked whether it
may change so the room can be ONE WINDOW and the watch drawer can take the name
a client understands, the owner answered:

> *"tak, zdecydowanie potwierdzam."*

Three files were exempted BY PATH, edited only as CLAUDE.md describes, and
RE-FROZEN at their new hashes in `test/turn59-f1-the-switch.test.js`, which
carries that sentence as the reason. Every other file of PRO is still guarded
byte for byte, and the exemption itself is held to three files by a test.

## What is here

| file | what it proves |
|---|---|
| `walk.txt` | the acceptance walk's own ledger, as it ran — 57 checks, 0 failed |
| `goldens-base.json` | the six fixtures as they stood on `origin/main`, unmoved |
| `f1-pro-*.png` | PRO: the plan on top, the UNCHANGED elevation docked below, three tools, wall 2 clicked and swapped in place, DRAW ROOM open |
| `f1-retail-*.png` | the same window in the client's app — and DRAW ROOM opening the window retail's copy never had behind its button |
| `f2-plan-low-corner.png` | the plan marking the corner a slope on wall 1 pulls down to 1800 |
| `f2-neighbour-implied-profile.png` | wall 2 saying so, read-only, and naming the wall that did it |
| `f2-3d-room-with-the-slope.png` | the room with the slope in it — see the SKIP below |
| `f3-clean-list.png` | WHAT as a clean list: no line under any tile, one note under all of them |
| `f3-coming-soon-*.png` | the card on an inactive tile, and COPIED after the address is taken |
| `f4-*.png` | the source chip reading DECOR in INSIDE and in FRONTS, and EGGER still on the boards inside the picker |
| `f5-*.png` | a fresh design on H3325 Gladstone Oak, and the REVIEW step naming it |
| `f6-*.png` | INSIDE without the duplicated row, and the carcass picker — the one write path — changing the interior |
| `f7-*.png` | the INSIDE column short after three drawers, and the stack's controls docked on the right |
| `f8-*.png` | the docked list as NAMES, and one drawer open with its own sentence |
| `f9-*.png` | PRO's own list row and retail's, both saying "Accessories drawer" |
| `f10-*.png` | the open accessories drawer at 100 % and at the owner's 25 % — two builds of one scene |
| `lazy-0*.png` | the empty room to ADD TO MY ESTIMATE, seven clicks, at tonight's defaults |

## F10's pair is two builds, and why that is the honest way

The CAP is what makes *"nie więcej niż 25 procent od teraz"* real:
`src/3d/LedStrips.jsx` clamps whatever the profile asks for, so lifting the
profile key in the browser changes nothing on the glass. The first run of the
walk proved it by producing two identical frames.

So `scripts/t67-led-pair.sh` takes the BEFORE from a build with the constant and
the key temporarily at 1 — which is exactly what the app did yesterday — and the
AFTER from the build that ships. Each frame is checked against the profile the
PAGE is running at, so neither can be mislabelled, and the script restores both
files from a copy (never `git checkout`, which on a night of uncommitted work
is a delete rather than a restore — it was, once).

## THE ONE SKIP

**F2's 3D draw.** The corner law, its readers and its tests are in the shared
core (`src/engine/room.js`, `src/lib/wallElements.js`), and the room window
draws it in both apps. `src/3d/Room.jsx` would draw it in the scene from ONE
line — it already asks `ceilingAt` per wall — but tonight's licence names
`src/3d/` only for F10's brightness, one file. Skipped and named rather than
taken. `f2-3d-room-with-the-slope.png` is the room as it stands tonight.
