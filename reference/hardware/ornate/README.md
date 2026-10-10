# Ornate A: the slot for the owner's ornament model

CLAUDE.md T77 F6: *"The ornament is a placeholder until the owner's model
arrives."* This folder is where that model goes. Nothing in it is read yet.

## What is cut today

The flower and the leaves of Ornate A (variants 1, 2 and 3; variant 4 has
none) are GPT's procedural reconstruction of the owner's board of
10.10.2026, not a measurement of the physical pattern. The engine says so
wherever the relief appears:

- the cut list sentence: `ORNATE_A_1 · Slab; relief proposed, not
  production approved; ornament: procedural placeholder`;
- the operations JSON of the CNC reference files: `"ornament":
  "procedural placeholder"` (and `"none"` on variant 4).

## What to drop in

One corner ornament, the carved flower and its two sprays, as the owner's
pattern really is:

- an **STL or OBJ** file of the carved surface, in **millimetres**;
- lying **face up**: the carving rises toward +Z, the flat background it is
  carved from is the plane Z = 0;
- **origin at its bounding corner**: the corner of its bounding box with the
  least X, Y and Z, which is the corner the ornament sits in (the inside
  corner of the outer frame), X and Y running along the two frame edges.

Put the file in this folder and name it in the workshop profile:

```
front.decoration.ornateReference.ornamentModel = 'your-ornament.stl'
```

(`src/engine/profile.js`; `null` today).

## What happens when a model is named

The ornament enters the engine through ONE function,
`ornamentSurface(variant, config, profile)` in `src/engine/ornateFront.js`.

- While `ornamentModel` is `null`, it returns the procedural placeholder and
  the label `procedural placeholder`.
- When a model is named, the same function is where the model's surface is
  returned and the label becomes the model's name. **Reading the model is not
  built yet** (T77 builds the slot, the label and this README only), so today
  a named model is refused in words on every Ornate leaf
  (`ORNATE_ORNAMENT_MODEL`): the placeholder is never cut silently in its
  place.

The relief stays a proposal either way: the slab is cut, the relief ships as
CAD/CAM reference files (state `geometry`), and production needs the owner's
measurements and approval of the physical pattern.
