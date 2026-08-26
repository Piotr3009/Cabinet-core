# CLAUDE.md — TURN 52 · THE RUN SHARES OUT FROM EITHER END, THE CUP HIDES, AND THE WATCH DRAWER

The owner, 26.08.2026, walking T51. His rulings, verbatim law:

* **The share-out is one-sided.** *"chodziło o to żeby były zawsze equal, i to
  działa — ale od lewej, a nie od prawej strony, czyli od jednej strony."*
  And: *"jak robię po prawej, to proponuje tylko 1 lub 2 szafki i nadal nie
  może przesunąć reszty."*
* **The cup still shows.** *"nie działa — nadal widać zawiasy."* On a 25 mm
  shaker, where T51's fix cannot even fire.
* **The dog bones.** *"jak niska szafka poniżej 600 mm to już zrób 2 dog
  bonesy, a jak poniżej 300 to jeden dog bones — na plecach i BUL i BUR."*
* **The watch drawer.** *"szuflada z przegródkami na zegarki, krawaty etc …
  szkło i podświetlenie … rama z Eggera ale podświetlone zegarki … oczywiście
  szuflada nasza standardowa, tylko przegródki z 9 mm zrób, i szuflada płytka
  w środku, myślę że około 60 mm."*

Five features. F1–F3 are corrections to work already in his hands and go
first. F5 is new geometry and is the one that may fall.

## Iron rules (binding)

1. **Zero-stop overnight.** PR before morning regardless. Sacrifices, in
   order: **F5** first (the watch drawer — new work), then **F4**. **F1, F2
   and F3 never fall.**
2. **BYTE-IDENTITY.** `t52-classify`: six IDENTICAL, UNNAMED = 0. F3 and F4
   touch drillings; if a golden moves, that is a FINDING to write up, not a
   licence.
3. **LISP IS LAW — FIRST for F4 and F5.** Dog-bone counts and the insert's
   geometry are cut on the machine, so they are born in `reference/lisp/`
   before any JS. Paren 13/13 at 0/0.
4. **Sanctity.** Nothing is deleted.
5. **Suite in full at every commit, never `--silent`. One commit per feature.
   Zero new dependencies. English copy. Every screenshot LOOKED AT.
   `verify/t52/` shows: a run shared out from the RIGHT end, a shaker door
   with no cup visible through its face, and the watch drawer lit.**

---

## F1 [CRITICAL] — the run shares out from EITHER end, and takes every cabinet

Two faults, one feature, both diagnosed already.

**(a) The run breaks at a millimetre.** `buildRuns` starts a new run when the
gap between two cabinets exceeds `profile.autoParts.topInfill.runGap`, which
is **1 mm**. That number is right for what it was written for — whether two
cabinets share one top filler — and far too tight for this. Six cabinets with
one 2 mm shadow between them are TWO runs, so the share-out divides the one
the hand touched and refuses to move the rest. That is exactly the owner's
*"proponuje tylko 1 lub 2 szafki i nadal nie może przesunąć reszty."*

The share-out gets its OWN definition of scope, and it is the owner's own
sentence: **every cabinet on this wall at this mount height, wall to wall** —
whatever millimetre shadows stand between them. `runGap` is NOT changed;
nothing else may inherit this.

**(b) It only lays out from the left.** The cursor starts at the run's left
edge, so a run reached from the right end grows the wrong way and stops
against whatever it meets. The lay-out anchors on the end the gap is at: a
gap on the right means the run is laid from the LEFT wall rightwards, and a
gap on the left means it is laid from the RIGHT wall leftwards. Either way it
finishes flush on both walls, because the arithmetic below says it must.

**The arithmetic, in the owner's own words** — assert it in the test exactly
so:

```
(wall clear − infill − infill − fixed-width cabinets) ÷ movable count = each
```

**Both infills, always.** T51 reserves the filler that EXISTS and not the one
that will exist: at a 4000 wall with 40 on the left and a 260 gap on the
right, it offered 660 each (6 × 660 = 3960, leaving 40 — one filler, not
two). Correct is `(4000 − 40 − 40) ÷ 6 = 653`. Reserve a filler at EVERY end
where the run will meet a wall after the share-out, whether or not one stands
there now. The bar's own figure must equal what the cabinets end up at.

**And they must move.** Cabinet-on-cabinet overlap stays absolutely
forbidden — the owner: *"nachodzenie na siebie to sztywna zasada."* The run's
own auto-parts come out of the obstacle set for the duration of the lay-out
(T51's own note says why) and are restored after.

## F2 [CRITICAL] — the cup does not show through the face

The owner's screenshot: a **25 mm** shaker, rebate 6, so 19 mm of material
under an 11 mm cup — seven millimetres of floor, and the cup is still visible
on the face. T51's F5 was a real fix for a real fault (a thin front bored
through) but it **cannot fire here**, so this is a different fault and it is
in the SCENE, not the bore.

Start where the cup's body is placed through the door's thickness:
`engine/hardware3d.js` reads `cupDepth: bore?.depth`, which is right, and
`3d/Hardware.jsx` sets the cylinder at `z + cupDepth/2` against a comment that
assumes a 25 mm door. Check the SIGN and the datum: `innerZ` is the door's
INNER face and the cup is bored from it, so the body must run from `innerZ`
INTO the board, and the boss must stand proud on the CARCASS side. If either
runs the other way the cup reaches the face.

Prove it by measurement, not by eye: assert the cup body's far plane sits at
`innerZ + bore.depth` and that the boss lies entirely at `z < innerZ`. Then
photograph a shaker door at 25 mm and at 18 mm.

## F3 [HIGH] — LISP first: the dog-bone counts follow the cabinet's height

The owner: two dog bones below 600, one below 300, on the BACK and on BUL and
BUR. Today `middleTabBelow: 346` decides three-versus-two and nothing ever
yields one.

* **346 → 600** for the third tab. Note in the profile that this is now the
  OWNER'S number, not the derived one — the comment currently explains 346 as
  `190 + 120 + 36` from the socket geometry, and that explanation stops being
  true. Keep the derivation in the note as the FLOOR it must not go below.
* **A new threshold at 300 for a single tab.** `LOW_CABINET.minHeight` is
  exactly 300, so `< 300` can never fire — it is `<= 300`, and say so in the
  note, or the feature ships dead.
* Born in `reference/lisp/` first, as every drilling rule is.

## F4 [MEDIUM] — the leftover, once more, and the bar tells the truth

Whatever F1 computes, the BAR must show the same number the cabinets will end
up at. Where the two disagree today the owner reads the bar, builds to it and
finds forty millimetres missing at the wall. One number, computed once,
displayed and applied.

## F5 [HIGH] — the watch drawer

*"szuflada nasza standardowa, tylko przegródki"* — so this is an INSERT, not
a new drawer type. It drops into a standard drawer box and the box is
untouched.

**The numbers**, from the trade and from the owner:

* **Divider stock 9 mm** (owner). **Inside depth 60 mm** (owner) — the trade
  standard is ~50 mm for a watch pocket, so 60 carries a chronograph and a
  lining. Note both in the profile.
* **Pocket ~110 × 95** on a 900 drawer, five across; the count follows the
  width, never a fixed five. A watch case runs 30–48 mm, so a pocket must
  never fall below 60 mm clear.
* **ONE row of pockets, at the FRONT.** Behind it, long sections for ties,
  cufflinks and straps. Three rows of pockets is a known mistake: the back row
  cannot be reached once the drawer is in.
* **Frame in the carcass decor** (Egger), like every other part — it takes the
  project's material, it is not special-cased.
* **Glass over the pockets, LED in a rebate in the frame**, aimed at the
  watches rather than at the eye. The strip is the one the app already
  places — same catalogue, same groove law (T48's +10 each end).

**Three decisions taken FOR the owner — veto any.** He was asked and left:

1. **The glass LIFTS OUT.** A fixed pane looks better and makes a watch
   unreachable without opening the whole drawer; a lift-out pane is what a
   joiner would fit.
2. **The LED lights the WATCHES**, not the glass. Lighting the pane makes a
   shop display; lighting the contents makes a wardrobe.
3. **The insert is its own BOM line**, addable to any drawer — not a drawer
   type. That way a customer can have it in one drawer of six.

CNC: the divider slots, the frame, the rebate for the glass and the LED
groove. Report in Check when a drawer is too shallow to take the insert
rather than shipping a squashed one.

## Execution order

`F1` → `F2` → `F3` → `F4` → `F5`. Corrections first; the new drawer last,
where it can fall without taking anything with it.

## What this turn does NOT touch

The six goldens' bytes. The DXF export's emptiness — still its own CRITICAL,
still not this turn. The lighting rig (the owner: *"lights działają super"*).
The warehouse. `runGap` itself (F1 says why).

## Morning audit will run

Fresh clone → install → suite (never `--silent`) → build → `t52-classify` →
paren 13/13 → the share-out probe: a six-cabinet run with a 2 mm shadow in it
shared out as ONE run, from the right end, arithmetic checked by hand against
`(wall − 2 fillers − fixed) ÷ movable`, and the bar's figure equal to the
built widths → the cup probe: body plane and boss plane measured, at 25 mm and
at 18 mm → the dog-bone probe: 700, 500 and 280 mm cabinets yielding three,
two and one → the watch drawer: pockets counted against the drawer width, the
LED groove matching the LISP → every screenshot LOOKED AT → verdict → the
numbered eye-test list.