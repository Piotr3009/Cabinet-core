# CLAUDE.md — TURN 49 · THE WIZARD STOPS ASKING TWICE

The owner, 25.08.2026, screenshot in hand. His rulings, verbatim law:

* **The scope.** *"default powinno sie ustawic na one wall, zawsze."* And
  the room: *"a room ustawienie z gory to usun boxy, to bez sensu."*
* **The two Backs.** *"jak mamy otwarty modal to inne przyciski z glownego
  modalu nie powinny byc widoczne, to sie myli."* And on the Back that
  jumped too far: *"jak zniknie 2x back to automatycznie bedzie poprawny
  back dzialal jak dziala — poprostu byly 2 i to bylo confuse."*
* **The carcasses.** *"przy carcasach jest 2 stopnie wybierania … a
  dlaczego nie dodac rozmiar plyty w pierwszym modalu i drugi usunac, jeden
  mniej bedzie."* And the warning that goes with it: *"jest funkcja wyboru
  materials size, jumbo etc — tez trzeba bedzie przeniesc do pierwszego
  wyboru materialow, inaczej zniknie nam ta funkcja."*
* **The fronts.** *"na pierwszym etapie wybieramy type of fronts, a pozniej
  next etapy kolory."* And: *"modal front nr 2 i 3 moze byc polaczony …
  tak samo jak Carcases."*
* **The slope, in the wall dialog.** *"flat jest ok chyba. poza tym jak
  beda 2 skosy to wtedy skosy musisz dac a nie flat."*
* **Editing a setup.** *"jak juz mamy edit setup to powinno byc
  mozliwosc przeskakiwania z 5.1 do 5.4 … i jest po zmianie przycisk
  update and save."*
* **The sheen.** *"suwak powinien dzialac tylko na spray i veneer, nie na
  laminat — na laminat zostaw jak jest."*

This turn touches the WIZARD and the wall dialog. It is the first turn in
a while that moves no geometry at all: the engine is not edited, and the
six goldens must not move by a byte.

**Branch from main AFTER T48 is merged.** T48 changes the store's create
path (the plinth default) and this turn works next door to it; starting
from an older main will collide there.

## Iron rules (binding)

1. **Zero-stop overnight.** PR before morning regardless. Sacrifice, first
   and only: **F6** (merging the fronts' modals 2 and 3 — convenience,
   where F5 carries the real change). **F1–F5 and F7–F10 never fall.**
2. **BYTE-IDENTITY.** `t49-classify` (copy `t48-classify.mjs`, runnable
   from inside `scripts/`): six IDENTICAL, UNNAMED=0. **Nothing in this
   turn has any business near the engine.** If a golden moves, something
   was edited that should not have been — stop and say so.
3. **NOTHING IS LOST, ONLY MOVED.** Two dialogs are merged and the room's
   canned boxes go, and the owner named the danger himself: the material
   SIZE choice (jumbo and the rest) must SURVIVE the merge, in the first
   dialog. Before deleting any step, list every control it owns and show
   in the PR where each one now lives — or that the owner ordered it gone.
   A control that quietly disappears is the failure this turn is most
   likely to produce.
4. **Sanctity, with TWO named licences**, both ordered above: the second
   carcass dialog is removed (its controls move to the first), and the
   fronts' dialogs 2 and 3 become one. Nothing else is deleted.
5. **Suite in full at every commit, never `--silent`. One commit per
   feature. Zero new dependencies. No SQL. No LISP file is touched.
   Modals draggable and beside. English copy. Every screenshot LOOKED
   AT — and `verify/t49/` shows each merged dialog BEFORE and AFTER, so
   the owner can see for himself that nothing went missing.**

---

## F1 [HIGH] — the scope arrives as One Wall

A new project opens with the scope already set to **One Wall**, every
time. It is what the owner starts from, and choosing it by hand every
time is a click that never had a reason.

## F2 [HIGH] — the room's canned boxes are gone

The pre-made room boxes come out of the wizard — *"to bez sensu."* The
room path itself stays (a project can still be a room); it is the
pre-filled box shapes that go, so nothing arrives pretending to be
someone's kitchen. What a room needs instead is the wall editor, and that
is **T50's** work, not this turn's: do not start it here.

## F3 [HIGH] — one Back at a time

When a dialog is open, the buttons of the dialog UNDERNEATH are not
visible. The owner's screenshot shows two Backs and two Nexts stacked
within an inch of each other, and he pressed the wrong one.

* The open dialog covers the one beneath it, or the lower one's footer is
  hidden while a child is open — either way, **exactly one row of
  navigation is visible at any moment**.
* **Do not touch Back's behaviour.** The owner: *"automatycznie bedzie
  poprawny back dzialal."* The step-back logic is correct today and the
  confusion was two buttons, not one wrong button. Changing it as well
  would be fixing something that is not broken.

## F4 [HIGH] — the carcass asks once

Today: pick Egger, then a stock board, then the stock board AGAIN with the
sheet size. The middle step goes and its controls move UP into the first
material dialog: **the board choice and the SHEET SIZE (jumbo and the
rest) in one place**.

* **The size control keeps every option it has today** — this is rule 3's
  case in point, and the owner said it in as many words.
* The dialog after it (dog bones and the CNC corner) is **untouched** —
  *"to tak musi byc, to zostaw."*
* Prove it: a project set up through the new single dialog produces the
  same material and size record as the old two did.

## F5 [HIGH] — the fronts ask for TYPES first, colours later

The first fronts step asks for **how many types and colours** — its
heading in those words, and larger than it is today. On that step the
owner picks the NUMBER and the TYPE, nothing else: **no colour picker, no
laminate list at this stage.** Colours belong to the steps that follow.

## F6 [MEDIUM] — the fronts' second and third dialogs become one

Same treatment as the carcasses: two dialogs into one, every control
surviving the move (rule 3). **First to fall if the night is short** —
the owner gets F5's ordering either way.

## F7 [HIGH] — EDITING a setup is not a chain: jump straight to the step

The owner: *"jak juz mamy edit setup to powinno byc mozliwosc
przeskakiwania z 5.1 do 5.4 etc, bo juz bylo ustawione i nie potrzebujemy
sztywnego lancucha — bo zmieniamy tylko niektore itemy, i jest po zmianie
przycisk update and save."*

A NEW project keeps its chain — the steps carry each other and skipping
one would leave a hole. **Editing an existing setup is the opposite
case**: everything is already answered, and the owner opens it to change
one thing.

* In EDIT mode every step header is clickable: 5.1 → 5.4 in one move, in
  any order, back and forth.
* The footer carries **Update and save** — it commits from wherever the
  user stands, without walking the rest of the chain.
* The chain in NEW-project mode is untouched: this is a second mode of the
  same wizard, not a rewrite of the first.
* An unanswered step, if one exists in an old project, still says so — a
  jump may not commit a setup that was never finished.

## F8 [HIGH] — the wall dialog takes FLAT, and steps aside for two slopes

A slope is entered today as `run` — the length of the fall. The architect
gives the flat stretch instead, so the dialog takes **Flat**: the distance
from the opposite corner to where the slope begins, with `flat + run =
wall width`. Type either, the other follows; the sum is always the wall.

**With TWO slopes on one wall, the Flat field steps aside and each slope
is entered by its own `run`** — the owner's own ruling, and the reason is
his: with slopes at both ends there is no single "flat" to name, and a
field that means two things is worse than a field that means one. Say so
in the dialog in one short line when the second slope appears.

Nothing about `ceilingAt`, the cut line or the engine changes — this is
the DIALOG's arithmetic only.

## F9 [HIGH] — the sheen moves veneer too, and leaves laminate alone

`materials.js` gates the sheen on `sprayed`, so the slider does nothing
to anything else. The owner's ruling: it drives **spray AND veneer**, and
**laminate keeps the roughness it has** — a laminate arrives from the
factory with its own finish and no slider changes that.

## F10 [LOW] — BACKLOG 34 is done, and comes off the list

The owner, 25.08: *"strzalki sa zrobione — usun z backlogu."* Remove
entry 34. **Do not renumber anything** — the code cites backlog numbers in
its comments, so the numbers are identifiers and the gaps are correct.

## Execution order

`F1` → `F2` → `F3` → `F4` → `F5` → `F6` → `F7` → `F8` → `F9` → `F10`.
The two merges (F4, F6) come after F3, so the navigation is already honest when
the dialogs change shape.

## What this turn does NOT touch

The engine, in any file — and therefore the goldens' bytes. Any LISP
file. The wall EDITOR (drawing walls by direction and length: **T50**,
with its own spec — do not begin it here). The slope geometry, the cut
line, the drawings, the CNC. The `cc_*` schema — **no SQL this turn**.
Back's step logic (F3 says why).

## Morning audit will run

Fresh clone → install → suite (never `--silent`) → build → `t49-classify`
(six IDENTICAL, UNNAMED=0) → **the survivors' audit: every control the two
merged dialogs used to own, listed against where it lives now, with the
sheet-size control named first** → the wizard walked end to end on real
pointer input, one navigation row visible at every step → the Flat field
proved both ways (`flat + run = wall width`, and stepping aside when a
second slope appears) → edit mode jumped 5.1 → 5.4 and committed with Update and save, while a NEW project still walks its chain → the sheen proved on all three finishes (spray
moves, veneer moves, laminate does not) → BACKLOG 34 gone and nothing
renumbered → before/after screenshots of both merged dialogs, LOOKED AT →
verdict → the numbered eye-test list.