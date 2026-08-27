# TURN 52 — the eye test

*Ten things to look at, in the order they take least clicking. Each one names
what you should see and what it would mean if you did not.*

---

## 1 · The run shares out from the RIGHT end — the one that would not move

Put six 600 mm base units against the **right-hand** wall of a 4 m room, so the
bare wall is on the **left**. Make one of them 650 so the leftover is under
400 mm. Now open a **2 mm gap** between two of them in the middle — nudge one
cabinet two millimetres.

The bar appears in the **left** gap and says `… mm left over · Share it out
equally · 653 mm each`. Press it.

**Every one of the six** should move and widen, the 2 mm shadow should close, and
the run should finish on the **left** wall as well as the right — 40 mm of
scribe at each end and no "Width limited by …" message anywhere.

*Before tonight it offered one or two cabinets and moved nothing.*
— `f1-the-run-before-parked-right.png`, `f1-the-run-shared-out-from-the-right.png`

## 2 · …and the number on the bar is the number that gets built

Same run. **Read the bar before you press it.** Then read a cabinet's width in
the right-hand panel afterwards.

They must be the same number.

*T51's bar said 660 and the app built 653: it computed the plan without the wall
margin, so the end with no filler on it yet reserved nothing. Forty millimetres.*

## 3 · The 2 mm shadow is ONE run again — but only for the share-out

Same run, before pressing. Look at **Check**: it should still say `04 and 05
stand 2 mm apart — carcasses in a run must touch`. The gap is still a fault; what
changed is that the SHARE-OUT no longer treats it as the end of the world.

*If the top infill above such a run has become one long board bridging the gap,
`runGap` has been changed and it must not have been.*

## 4 · The cup does not read through a shaker face

Front style **shaker**, front thickness **25 mm**, then again at **18**. Look at a
door's face, straight on and then hard up against the hinge stile.

The face should be clean: the frame line, the recess line and nothing else.

Then set the shaker frame **under 39 mm** so the cup overhangs the frame, and
look at the inside face: the cup should be blind with real floor under it.

*The measured planes are in `verdict.md`: at 25 mm the cup runs −12.5 → −1.5 in
the leaf's own frame, and the face is at +12.5.*
— `f2-shaker-25mm-face.png`, `f2-shaker-25mm-stile.png`, `f2-shaker-18mm-*.png`

## 5 · A low cabinet cuts two dog bones — and a really low one, ONE

`LOW_CABINET` at **700**, at **500** and at **280** mm high. Open the CNC sheet
and count the dog bones down the back edge of **BUL**, of **BUR** and the sockets
down the sides of the **BACK**.

Three, two and one.

*At 600 there are still three — "poniżej 600" — and at 300, which is the lowest
the app will build, there is one. A rule written "below 300" could never have
fired.*

## 6 · Nothing 600 mm or taller moved

Any ordinary cabinet — a 720 wall unit, a 770 base, a 2150 wardrobe. Three dog
bones, exactly as before, at 95 / mid / height − 95.

*If one of these has grown or lost a tenon, the switch has been set below its
floor and the joint is a hole.*

## 7 · The watch drawer, fitted to ONE drawer of a stack

A wardrobe with a stack of drawers. Click a drawer (or its front) and find
**Watch insert** in the right-hand panel, beside its runner and its height.
Press it.

The line under it should say how many pockets you got, how big they are and how
big the glass is. The **other** drawers must be untouched.

*It is a switch on the drawer, not a fourth drawer type: a customer can have it
in one drawer of six.*

## 8 · …and it is one row at the FRONT

Open that drawer. You should see **one row of pockets across the front** and a
small number of **long sections behind them** — not a grid.

*Three rows of pockets is a known mistake: the back row cannot be reached once
the drawer is in.*
— `f5-the-watch-drawer-lit.png`, `f5-the-pockets-and-the-light.png`

## 9 · The glass sits DOWN in the frame, and the light is on the watches

Same drawer. The pane should sit **inside** the frame with a lip of rail standing
proud of it all round — that lip is what a fingernail lifts it out against — and
the strip should be **under** the glass on the inner face of the front rail,
throwing back and down into the pockets.

*A pane lying on top of the frame, or a line glowing along the top edge, is a
shop display. Both decisions were taken for you and are in `verdict.md` for you
to strike out in one line.*

## 10 · A drawer too shallow says so, and cuts nothing

Set a drawer's height down to about 110 mm and switch the insert on.

**Check should carry a red line** naming that drawer and saying by how much it is
short. No tray should be cut, no glass ordered and no strip bought.

*"Report in Check when a drawer is too shallow to take the insert rather than
shipping a squashed one."*

---

## The two things to tell us about

1. **If you still see hinges through a face** — tell us WHICH VIEW. X-ray shows
   them by design, and so does `View ▸ Hinges` with a door open. In the ordinary
   Solid view, on a 25 mm shaker, nothing of a hinge crosses the face, and the
   measurements are in `verdict.md`.
2. **One millimetre of floor is still legal.** An 18 mm shaker whose cup
   overhangs the frame has 12 mm at the cup and is bored 11, leaving one
   millimetre — which our own LISP note calls unacceptable. Changing that is a
   change to the BORE and tonight's brief ruled the bore out of scope. Say the
   word and it moves.
