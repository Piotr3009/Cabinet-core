# CLAUDE.md — TURN 50 · THE WALL IS DRAWN, THE RUN IS SHARED OUT, AND THE SLOPE IS FINISHED

The owner, 25.08.2026. His rulings, verbatim law:

* **Drawing a wall.** *"myśle że będzie rysowanie ściany poprzez dodawanie
  kresek i wpisywanie długości odcinka ściany — czyli zaznaczasz kierunek, a
  później długość wpisujesz. domyślnie jak inny kierunek to 90 stopni, chyba
  że wpiszesz inny kąt."*
* **Sharing out a run.** *"jak dodaję ostatnią szafkę do ściany i zostanie
  mniej niż 400 mm … czy chcesz wyśrodkować? i wtedy wszystkie szafy się
  ustawią w jednej szerokości od ściany do ściany, oczywiście odejmując
  infill."* Which cabinets: *"wszystkie co nie mają narzucone."* Rounding:
  *"zaokrąglamy — milimetr nie robi różnicy."* And: *"tylko jednorazowe, z
  możliwością zrobienia Undo — ale to już mamy."*
* **The end panel.** *"w kuchni jak dodamy niską szafkę do wysokiej bez panela,
  powinien się dodać panel automatycznie — i informacja na środku monitora:
  system dodał panel wykończeniowy, chcesz to go usuń, naciśnij prawym myszką
  i usuń panel."*
* **The room's edge.** *"dlaczego pozwala system dodawać top box powyżej
  rozmiaru pokoju? to powinno być blokada."*
* **The slope, still owed.** *"end panele nie powinny się ciągnąć do płaskiego
  sufitu jak jest skos — koniecznie muszą się zakończyć na skosie."* And:
  *"shaker nie powinien znikać jak najedziemy na skos, powinien się renderować
  razem z drzwiami."* And: *"jak drzwi się zmniejszają, automatycznie usuwamy
  zawiasy tam gdzie jest skos."*
* **The defaults.** *"default wysokości szaf 2150"*, and on the rig:
  *"default oświetlenia jasności … teraz 100 to niech będzie jakby teraz było
  75."*
* **The menu.** *"cargo pull-out i waste bin po wyborze wardrobe w ogóle nie
  ma sensu — tylko w kitchen. to ważne, żeby się menu ustawiało pod typ
  mebla."* And: *"w prawym przycisku myszy menu nie powinno być Add doors oraz
  Show dimensions — dimension już mamy na górze."*

Fourteen features, one night, by the owner's own decision: *"mamy całą noc."*
The sacrifices are stacked from the bottom so that if the night runs short it
is the cosmetics that fall, never the geometry.

## Two decisions taken FOR the owner — veto either

Both were asked and left open, and neither can be guessed at three in the
morning. They are written here so he can strike them out in one line.

1. **The share-out is offered as a BAR at the gap, not a modal in the middle
   of the screen.** He asked for *"duży napis"*; the argument against is that
   a modal in the centre is dismissed reflexively by the tenth time, and this
   one re-sizes every cabinet in the run. A strip that appears IN the leftover
   gap — `Zostało 312 mm · Rozłożyć równo?` and one button — is read where the
   problem is, and ignoring it costs no click. If he wants the modal, it is one
   swap.
2. **A share-out that would make the fronts too wide OFFERS the extra
   cabinet rather than silently doing it.** 3900 mm over six cabinets is 650 mm
   of front, wider than one door should be. The bar then says so and offers
   *seven, at 557 mm* as a second button. It never adds a cabinet on its own.

## Iron rules (binding)

1. **Zero-stop overnight.** PR before morning regardless. Sacrifices, in the
   order they may fall: **F14** first, then **F13**, then **F12**, then **F11**, then **F10**.
   **F1–F9 never fall.** If F1 alone eats the night, say so in the PR and ship it
   whole rather than shipping all twelve half-done.
2. **BYTE-IDENTITY.** `t50-classify` (copy `t49-classify.mjs`, runnable from
   inside `scripts/`): six IDENTICAL, UNNAMED = 0. The goldens are single
   cabinets with no run, no slope and no room, so nothing here may move them.
   **F2 and F3 are the ones that could:** if a golden shifts, the share-out or
   the clamp is reaching a cabinet that is not in a run — that is a bug, not a
   licence. Stop and say so.
3. **LISP IS LAW — FIRST, for F8 only.** `drawBUL`/`drawBUR` in
   `SKYLON_COMMON.lsp` learn the slope so they can skip their top socket row,
   which the application has been doing alone since 25.08. No other LISP file
   is touched. Paren 13/13 at 0/0 by script.
4. **Sanctity.** Nothing is deleted. F10 removes two ENTRIES from a context
   menu — the actions behind them stay, reachable where they already are, and
   the PR says where.
5. **Suite in full at every commit, never `--silent`. One commit per feature.
   Zero new dependencies. No SQL. Modals draggable and beside. English copy.
   Every screenshot LOOKED AT — and `verify/t50/` shows the wall editor mid-draw,
   a run before and after the share-out, and a cut end panel.**

---

## F1 [CRITICAL] — the wall editor: direction, then length

The owner's own description is the specification. In the room's top view:

* Click a start point. Then **pick a DIRECTION** and **type the LENGTH** of
  that segment. The wall grows one segment at a time.
* **A change of direction is 90° by default** — *"chyba że wpiszesz inny
  kąt."* So the angle field carries 90 and is there to be overtyped, not
  filled in every time.
* Each segment shows its length as it is drawn, and a drawn segment can be
  re-typed without starting again.
* **Undo takes back one SEGMENT**, not the whole wall.
* Closing the outline back onto the start point finishes the room; an open
  chain is a valid one-wall or L job and must not be forced closed.

Nothing about the ENGINE changes: this draws `project.room`'s walls, which
every consumer already reads. If a segment would produce a wall shorter than
the room model's own minimum, say so at the field rather than accepting it.

This is the biggest feature of the night. Build it first, while there is time
to do it properly.

## F2 [HIGH] — the run is shared out, equally, once

When a cabinet is added to a run and the leftover against the wall falls
**below 400 mm**, offer the share-out:

* **Which cabinets**: every one in the run whose width is NOT fixed. A
  dishwasher, an oven housing, a fridge keep their width — the owner: *"wszystkie
  co nie mają narzucone."* If that leaves nothing to widen, the bar says so
  instead of offering.
* **The arithmetic**: `(wall clear − infills) ÷ n`, rounded to 1 mm, the odd
  millimetre going to the last cabinet — *"milimetr nie robi różnicy."*
* **Once, not a state.** It runs when pressed and that is all; Undo takes it
  back, which the app already has. Nothing recalculates itself later.
* **The bar, at the gap** — decision 1 above. And the too-wide case — decision
  2 — offers the extra cabinet rather than adding one.

**Say plainly in the PR what this does to a SLOPED run**: changing a
cabinet's width changes where the ceiling line crosses it, so the cut, the
angle and the hinge set are all recomputed. That is correct and it is not
free — a share-out under a slope is a bigger change than it looks.

## F3 [HIGH] — nothing is built bigger than the room

A unit may not be given a width, a height or a depth that puts it outside the
room it stands in — the owner saw a top box accepted above the room's own
height. The guard sits where the number is ACCEPTED (the parameter panel and
the size modal), so it can refuse with a reason, and the reason names the
room's figure: `Pokój ma 2400 mm — szafka nie zmieści się na 2600`.

An existing project that already contains such a unit opens unchanged and
says so in Check, rather than being silently resized under the owner's hands.

## F4 [HIGH] — a low unit meeting a tall one grows its own end panel

In a kitchen, where a LOW unit meets a TALL one and there is no end panel
between them, one is added automatically — and the app says what it did:
a message in the middle of the screen, `System dodał panel wykończeniowy —
kliknij prawym i usuń, jeśli go nie chcesz.`

* It is a real end panel, on the same board and the same rules as one added
  by hand — not a special case.
* It carries `meta.autoAdded: true`, so a later turn can tell the two apart,
  and so the message can be shown once per panel rather than on every redraw.
* Removing it by hand is final for that junction: it does not come back on the
  next redraw, or the message becomes a nag.

## F5 [HIGH] — an end panel stops at the slope

*"end panele nie powinny się ciągnąć do płaskiego sufitu jak jest skos."* The
end panel takes the same treatment the sides took in T47: its top edge follows
the ceiling polyline, cut at the segment's angle, with the angle stated on the
part and on the CNC sheet. Gated on the slope like everything else, so a flat
room's end panel is byte-identical.

## F6 [HIGH] — the shaker leaf is cut with its door (T46's named debt, paid)

A shaker front under a slope renders the engine's pentagon but loses its
recess — named as a debt in T46 and still owed. The recess follows the cut
outline: five edges instead of four, the rail widths as the profile has them,
mitres where the cut crosses a rail. If the cut passes through a rail rather
than a panel, the rail is what gets shortened — a shaker with half a rail is
not a shaker.

## F7 [HIGH] — a hinge that has no door goes

Where the slope has eaten the part of a door a hinge was on, that hinge is
removed automatically rather than left drilling air. The remaining hinges
re-space over what is LEFT of the leaf, by the same rule that spaces them on a
full door. Check reports what was removed, per door — the app never silently
changes a drilling pattern.

## F8 [MEDIUM] — LISP first: the kits learn the slope

`drawBUL`/`drawBUR` in `SKYLON_COMMON.lsp` take the slope and skip their
"Puzzle sockets — TOP edge" block when it is on. The law was stated beside
`SKY:slopeCutPts` on 25.08 and the application has been obeying it alone since
— this closes that gap. Only this LISP file moves. Paren 13/13 at 0/0.

## F9 [HIGH] — the menu asks what kind of furniture this is

Cargo pull-outs and waste bins are kitchen fittings and have no business in a
wardrobe. `AddItems` ALREADY filters by type — `type.supports.rail`,
`type.family !== 'wardrobe'`, each with its reason in the tooltip. These two
are hard-coded `disabled: true, soon: true` and never ask. Wire them to the
same mechanism: available where the family makes sense, absent with a reason
where it does not. No new mechanism.

## F10 [MEDIUM] — two entries leave the right-click menu

`Add doors` and `Show all dimensions` come out of the context menu — the
owner: dimensions are already on the top bar, and doors are added where doors
are added. **The ACTIONS are not deleted** (iron rule 4): they stay wherever
else they live, and the PR says where each one is now reached.

## F11 [MEDIUM] — the infill corner is cut by ONE rule again

BACKLOG 122, raised by T48 itself: the TOP infill lost its half of the T15
corner when it became two plain boards, while the SIDE infill kept its mitre
— because *"infill pionowy nie ruszamy"* was taken literally. On a run that
turns a corner the vertical is still mitred for a long point that no longer
exists. Make the pair agree: where the top is a plain board, the side that
meets it is cut square too.

## F12 [LOW] — Room setup and the wizard show the same room step

T49 hid the canned shapes in the wizard and kept them in the menu, and the
owner noticed the two doors now differ. Make them the same screen. **Which
way is his call and it is not made here** — if he has not said by the time
this feature is reached, ship the wizard's version in both (no canned shapes
anywhere) and say so in the PR, because that is the version he asked for by
name.

## F13 [LOW] — the wardrobe's default height is 2150, in one place

The owner, 25.08: *"default wysokości szaf 2150."* The number is already what
`wardrobe.defaults.height` and `projectHeights.tall` carry — this feature is
to make sure it is the ONLY one. Find every other 2150 (and every other
default height a wardrobe can arrive with, in the store's create path, in the
wizard and in any fixture that ships to a user) and make each of them read the
profile rather than repeat the figure. If they already agree, say so in the PR
and change nothing — a confirmed single source is a result.

## F14 [LOW] — the studio ships a quarter darker

The owner: *"default oświetlenia jasności … teraz 100 to niech będzie jakby
teraz było 75."* So the whole rig is scaled by **0.75** at its base: what the
slider calls 100 % now lands where 75 % landed before, and every ratio inside
the rig is untouched.

* It goes in as ONE named number in the profile —
  `appearance.studio.baseGain: 0.75` — multiplied into the same `gain` the
  brightness slider already produces. It is NOT to be mixed into the
  individual lamps' intensities: the bands, the pillars, the key, the fill and
  the rim keep their own numbers so each can still be tuned on its own.
* **The pillars are halved, separately.** The owner, the same evening, on the
  showroom pillars specifically: *"za jasno świecą, ściemnij o połowę."* So
  `appearance.studio.pillars.intensity` goes from **22 to 11** — its own
  number, changed on its own, exactly because the rule above keeps the lamps
  independent. The two reductions COMPOUND, and that is intended: a pillar
  ends the night at 11 × 0.75 of the gain it had, and if that turns out to be
  a quarter too dark it is `pillars.intensity` alone that comes back up.
  Say the resulting figure in the PR so the owner can see what he is looking
  at.
* **Named consequence**: the CEILING drops with it. The slider's top is now a
  quarter dimmer than it could reach yesterday, which is what was asked for —
  but if a bright kitchen ever needs the old maximum, `baseGain` is the one
  number to raise, and this paragraph is where to come back to.
* Nothing else about the slider changes: its min, max, step and default stay
  as the profile has them.

## Execution order

`F1` → `F2` → `F3` → `F4` → `F5` → `F6` → `F7` → `F8` → `F9` → `F10` →
`F11` → `F12` → `F13` → `F14`. The wall editor first, while the night is young; then the two
that touch the engine (F2, F3) on green goldens; then the slope block
(F5–F8), which is one geometry and one file and must not be split; then the
menus.

## What this turn does NOT touch

The six goldens' bytes. The DXF export (its emptiness is a CRITICAL of its
own and is NOT this turn's — do not start it). The materials warehouse. The
dog-bone thresholds (the owner has not given the number). The lighting rig and
the dimension labels, both settled by chat-fix on 25.08. The `cc_*` schema —
**no SQL this turn**. Every LISP file but `SKYLON_COMMON.lsp`.

## Morning audit will run

Fresh clone → install → suite (never `--silent`) → build → `t50-classify`
(six IDENTICAL, UNNAMED = 0, with rule 2's stop honoured if it fired) → paren
13/13, only `SKYLON_COMMON.lsp` moved → the wall editor walked on real
pointer input: a segment typed, a 90° turn taken by default, one overtyped to
another angle, Undo taking back one segment → a run shared out, before and
after, the arithmetic checked by hand against the wall's clear width → a
too-wide run offering the extra cabinet instead of taking it → a unit refused
for being bigger than its room, with the room's figure in the message → a low
unit meeting a tall one growing its panel, and the panel staying gone when
removed → a cut end panel, a cut shaker WITH its recess, and a door whose
hinge count fell → the menu proved on a wardrobe and on a kitchen → every
screenshot LOOKED AT → verdict → the numbered eye-test list.