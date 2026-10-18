# T79 F8 · PROBE: A CORNER NOTCH SILENTLY TAKES THE RECESS EXTENSION AWAY

The owner, 18.10.2026: *"dlaczego cut the corner likwiduje nam wcięcie do
recess?"*

Engine and store, UNMODIFIED code (HEAD `14b6fd1`, T79 F4 on top), node.
The unit is golden-recess.json's own BUD (`defaultParamsFor('BUD')`, unit 01,
front 25, 1 shelf, hinge L: W 600, D 558, H 770, G 18). The notch is
golden-notch.json's (`{ corner: 'BL', w: 200, d: 200, h: 0 }`, full height,
back left); the band is golden-recess.json's CASE A (`{ x0: 310, x1: 600, z0: 0,
z1: 770, d: 150 }`, the right part of the carcass, floor to top, 150 deep). On
the BACK the notch takes x 0..200 and the band x 310..600: they do not touch.

## 1. THE ENGINE: WHAT IS CUT (boards `w x h`, verbatim)

| board | notch alone | extension alone | notch + extension |
| - | - | - | - |
| BUL | 340 x 770 | 540 x 770 | 340 x 770 |
| BUR | 540 x 770 | 690 x 770 | 540 x 770 |
| TOP | 564 x 540 | 564 x 690 | 564 x 540 |
| BOTTOM | 564 x 540 | 564 x 690 | 564 x 540 |
| BACK | 400 x 770 | 328 x 770 | 400 x 770 |
| SHELF-1 | 560 x 520 | 560 x 670 | 560 x 520 |
| RETURN | 182 x 770 | - | 182 x 770 |
| STEP | 218 x 770 | - | 218 x 770 |
| RETURN-L | - | 132 x 770 | - |
| EXT-BACK | - | 290 x 770 | - |

With both asked, the cut is the notch alone, board for board: BUR, the TOP, the
BOTTOM and SHELF-1 do not grow, the BACK keeps the notch's 400, no RETURN-L and
no EXT-BACK. That is the owner's "likwiduje".

## 2. THE ENGINE: WHAT IT SAYS (verbatim)

| case | warnings | derived.notch | derived.extension |
| - | - | - | - |
| notch alone | `[]` | `{"corner":"BL","w":200,"d":200,"h":0,"full":true,"boxed":true,"boards":["RETURN","STEP"],"dropped":0}` | `null` |
| extension alone | `[]` | `null` | `{"x0":310,"x1":600,"z0":0,"z1":770,"d":150,"window":[328,0,600,770],"grown":["BUR","TOP","BOTTOM","BACK","SHELF-1"],"boards":["RETURN-L","EXT-BACK"],"pieces":1,"for":"a recess in this wall"}` |
| notch + extension | `[{"code":"EXTENSION_REFUSED","message":"RECESS: a carcass notched round an obstacle cannot grow into a recess as well; the notch stands."}]` | as notch alone | `{"x0":310,"x1":600,"z0":0,"z1":770,"d":150,"for":"a recess in this wall","refused":"RECESS: a carcass notched round an obstacle cannot grow into a recess as well; the notch stands."}` |

## 3. THE CHECK: WHAT THE JOINER SEES (`runChecks`, the same three results)

| case | findings (check, level) |
| - | - |
| notch alone | #2 red, #6 yellow, #30 yellow (`NOTCH-RETURN (outline only), NOTCH-STEP (outline only)`) |
| extension alone | #2 red, #6 yellow, #30 yellow (`RECESS-RETURN (outline only), RECESS-BACK (outline only)`) |
| notch + extension | #2 red, #6 yellow, #30 yellow (`NOTCH-RETURN (outline only), NOTCH-STEP (outline only)`) |

#2 (the 1.5 mm gap to the wall) and #6 (legs, no plinth) are the bare BUD's own
and the same in all three. The refusal of row 2 appears NOWHERE: the CHECKS
table runs 1..21, 25..35 and no row reads `EXTENSION_REFUSED`.

## 4. THE STORE: THE SAME, AS A PERSON CLICKS IT

`newProject`, a 4000 x 3000 room, a recess on wall 0 at x 1000, 1300 wide, 300
deep, floor to ceiling; `addUnit('BUD')`, `moveUnit` to x 1800 (half across the
recess's right reveal); then `setUnitNotch(id, { corner: 'BR', w: 80, d: 200,
h: 0 })`, a notch at the far end from the band.

| step | derived.extension (verbatim) | EXTENSION_REFUSED | `runChecks()` |
| - | - | - | - |
| no notch | `{"x0":0,"x1":490,"z0":0,"z1":770,"d":300,"window":[0,0,472,770],"grown":["BUL","TOP","BOTTOM","BACK"],"boards":["RETURN-R","EXT-BACK"],"pieces":1,"for":"a recess in this wall"}` | `[]` | `#30 yellow` |
| notch BR 80 (band 0..490) | `{"x0":0,"x1":490,"z0":0,"z1":770,"d":300,"for":"a recess in this wall","refused":"RECESS: a carcass notched round an obstacle cannot grow into a recess as well; the notch stands."}` | the same sentence | `#30 yellow` |

`setUnitNotch` answered `{"ok":true,"said":"","notch":{"corner":"BR","w":80,"d":200,"h":0}}`:
nothing said at the moment of the cut either.

## 5. WHERE IT IS DECIDED (file:line, this tree)

| # | line | what it does |
| - | - | - |
| 1 | `src/engine/extension.js:496` | `recessRefusal(..., notched, K)`: `if (notched) return 'RECESS: a carcass notched round an obstacle cannot grow into a recess as well; the notch stands.'` (KIT_RECESS.lsp D13, "a unit never carries both") |
| 2 | `src/engine/extension.js:540` | `extensionVerdict` passes `Boolean(params?.notch)`: ANY notch, wherever it stands, refuses the band, whatever the band's place |
| 3 | `src/engine/cabinet.js:1790-1793` | the extension asked of the notched parent; refused, the parent (with its notch) is returned with the warning |
| 4 | `src/engine/cabinet.js:8714` | `const extensionCut = params?.extension && !notchCut`: even past the verdict the extension is never cut on a notched carcass |
| 5 | `src/engine/checks.js:665` | the warnings map knows `NOTCH_REFUSED: 28` and nothing reads `EXTENSION_REFUSED`: the refusal is SILENT |
| 6 | `src/stores/projectStore.js:1004` | `recessExtensionFor` asks `recessRefusal(W, D, H, G, x0, x1, z0, z1, d, false, K)`: the store never looks at the notch, derives the band, and hands it to the engine that drops it |
| 7 | `src/stores/projectStore.js:10744` (`setUnitNotch`) | reads `NOTCH_REFUSED` only; an `EXTENSION_REFUSED` the new notch causes is not said |

## THE FAULT

Two faults, one sentence each. The law (D13) refuses on the mere presence of a
notch, never asking whether the notch and the band meet; and the refusal it
writes reaches no screen: not the Check, not the notch window, not the
retail room.
