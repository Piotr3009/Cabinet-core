# TURN 53 — the eye test

*Twelve things to look at, in the order they take least clicking. Each names
what you should see, and what it would mean if you did not. The pictures beside
each item are in this folder, and every one of them was looked at before it was
committed.*

---

## 1 · The bar appears ON THE ADD, not one millimetre later

Four-metre wall. Put base units against the LEFT wall until the sixth one goes
in — six 600s, so 360 mm of bare wall is left on the right.

The share-out bar should stand **the moment the sixth cabinet lands**:
`360 mm left over · Share it out equally · 653 mm each`.

*Before tonight you had to nudge a cabinet one millimetre to make it appear.
The gate counted the LEFT end's 40 mm scribe reserve as leftover, so it read
400 ≥ 400 and stayed silent. That is his "działa w 99 procentach", and it was
one line of arithmetic: the gate now measures the leftover LESS what is already
reserved.*
— `f1-the-bar-stands-on-the-add.png`

## 2 · …and the ✕ closes it, for THIS gap only

Same bar. There is a cross at its right end. Press it.

The bar goes, and it **stays gone** while nothing changes — move nothing, and
it does not come back on the next settle. Now move a cabinet, or add one, or
type a width: the offer returns, because it is a different offer.

*"musi też być przycisk dismiss … pamiętaj krzyżyk zasada."*
— `f1-the-bar-with-its-cross.png`, `f1-gone-after-the-cross-and-still-gone.png`

## 3 · The DXF is not empty, and never was — but one part never reached you

Output ▸ Download DXF, on any job with a shoe box behind doors.

Count the files. A shoe box with a hinged side each way cuts **two** battens,
and until tonight both were called `SHOE1-BATTEN` — one name, one ZIP entry,
so the machine got **one batten**. They are `SHOE1-BATTEN-L` and `-R` now.

Open any part file in the viewer. It has geometry, it has its drillings, its
extents match the part.

*The five-day "DXF eksport PUSTY" is not reproducible: the seeded job writes 80
files, 537,034 bytes, 1,917 entities and 375 drillings, and every one of them
was read back byte for byte. What WAS broken is the missing batten, and it was
found by opening the files rather than by running the suite.*
— `f2-dxf-in-a-viewer.png`, `dxf/` (the sample set), `audit/dxf.txt`

## 4 · Under a slope, the infill is drawn cut — the same cut the machine makes

A run of wardrobes against a wall with a slope on it. Look at the vertical
infill beside the last cabinet, and at the top infill above the run.

Both should be **cut on the rake**: the vertical's top edge follows the ceiling
line at its own x, the top infill breaks at each knee and never crosses the
ceiling polyline, and nothing stands outside the wall.

*"top infill po skosie w ogóle nie działa … jakoś dziwnie się rysuje gdzieś
poza ścianami."  "pionowy infill na CNC się tnie pod skosem, ale na
wizualizacji pokazuje prosto."  Two sources of truth; one now.*
— `f3-f4-the-run-under-the-slope.png`

## 5 · …and the side under the slope has its wedge taken OFF

Same scene. Zoom into the corner where the last cabinet's side meets the roof
board.

The side's top edge is bevelled: **the high point toward the peak**, the short
face on the fall side, and the roof board lying flat on it. No wedge of side
standing proud past the roof line, and no overlap.

*"zamiast BUL obciąć pod kątem pasującym do wieńca, to się nachodzą materiały
na siebie."  The engine's numbers were right the whole time — the 3D never
applied them, because the bevel was gated on something a side never carries.*
— `f4-the-corner-close-up-right-slope.png`

## 6 · Two top boxes stand SIDE BY SIDE on one main

A 1200 wardrobe. Add a top box, narrow it to 600, then add another with the
add-plus on its right.

Two boxes, **beside each other**, both on the one main, and they stay there
through a settle. Add a third: it is **refused in words** — there is no room.

*"top box łamią zasadę — nakłada się jeden na drugi … jak dodaję plusik po
lewej, to on się nie pojawia po lewej, tylko jeden w drugim."*
— `f5-two-top-boxes-side-by-side.png`, `f5-the-third-box-refuses.png`

## 7 · A long plinth comes off the sheet in strips, joined on a cabinet line

Five 650 mm base units on a 6 m wall — 3250 mm of plinth over a 2400 mm board.
Open CNC.

Two pieces, both **standing vertically** on the sheet: `PLINTH-1 1950×100` and
`PLINTH-2 1300×100`. 1950 is three cabinets; the joint is on a cabinet edge and
never in the middle of one.

*His own worked example, to the millimetre: "3 × 650 = 1950, reszta drugi
pasek. łączenie zawsze równo z szafką, a nie na środku szafki."*
— `f6-the-cut-sheet-with-a-split-plinth.png`

## 8 · The shoe front is a drawer front now

A 900 wardrobe: two drawers, a shoe box above them, doors off so you can see.

The shoe face is **vertical** (the shelf behind it still tilts 15°), stands on
**the same plane** as the drawer fronts, keeps **the same gap** to the front
below, and does not overlap it.

*"nie licuje się z frontem, nie licuje się z innymi szufladami, nie wiem
dlaczego front zachodzi na szufladę na dole."  It stood 47 mm proud, 36 mm
inside the stack, and overlapped the front below by 31 mm.*
— `f7-the-shoe-front-on-the-drawer-plane.png`, `f7-the-shoe-front-behind-the-doors.png`

## 9 · The watch drawer is position 3, and it has no height slider

A wardrobe with a drawer stack. Add items ▸ the **third** entry is Watch drawer.
Press it.

It goes **on top of the stack**, at one fixed height (140 mm), and there is no
slider to argue with. Ask for it without a stack and it refuses in words.

*"szuflada z zegarkami powinna być jako osobna pozycja, pod szufladami — czyli
pozycja 3 … już bez możliwości sterowania wysokością — zawsze stała wysokość."*
— `f8-the-menu-entry-position-3.png`, `f8-the-watch-drawer-in-the-wardrobe.png`

## 10 · …four layouts, and the glass goes in the SHELF

Open the watch drawer's Layout window. Four cards — Classic, Cufflinks, Ties,
Belts — each a top view of **this** drawer, all four with one pocket row at the
front.

Tick **Glass over the drawer** with a shelf directly above: the opening is cut
in that shelf, 50 mm in from every edge, the pane sits flush with its top, and
the LED rings it underneath, ~15 mm outside. With no shelf above, the tick is
**greyed with the reason on it** rather than hidden.

*"opcja: dodać szybę ponad szufladą — wtedy wycinamy w półce otwór, offset od
półki na 50 mm … i dookoła tej szyby masz LED od spodu."*
— `f8-the-four-layouts.png`, `f8-the-glass-in-the-shelf-above.png`

## 11 · A cup bore leaves three millimetres of face, not one

Any 18 mm shaker door whose ⌀35 cup overhangs the frame.

The bore stops with **3 mm** of material under it. Where 3 cannot be kept the
bore shortens and Check names the leaf — it never leaves one millimetre.

*T52's own finding, standing since its morning audit: "one millimetre reads
through a sprayed face."  A shortened bore now draws the hinge standing proud,
which is the truth about that door.*
— `audit/probes.txt` (probe f9)

## 12 · The room is DRAWN — a direction, a number, Enter, and the catch

Settings ▸ Room setup ▸ **Draw room…**

Point the cursor right, type `4000`, Enter. Down, `3000`, Enter. Left, `4000`,
Enter. Now bring the pen back toward 0,0: the origin **lights up** and says
*catch — Enter closes the room*. Press Enter.

The room closes. **Save room**, and it is the project's room — furnish it,
export it, and it behaves exactly as a typed rectangle does. Then click any
wall: the standard elevation opens on it, with doors, windows and slopes.

Draw a six-wall L the same way and it saves too, and each of the six walls
opens its elevation.

*"robimy jak w CAD … na końcu ostatnią linię łapiesz i łączysz — zawsze
łączysz, taki catch, żeby pokój był zawsze połączony (jak w życiu ściany)."*
— `f10-mockup.png`, `f10-the-door-in-room-setup.png`,
`f10-mid-flow-the-ghost-segment.png`, `f10-the-catch-at-the-start-point.png`,
`f10-six-walls-closed.png`, `f10-six-corner-room-wall-elevation.png`
