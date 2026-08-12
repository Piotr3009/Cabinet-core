# verify/t26 — the cornice toggle did nothing, and why (F9.1)

> "Diagnose first: the right-click cornice toggle does nothing (the owner). Find
> whether the menu item, the store write or the resolver is at fault; report in
> `verify/t26/cornice-toggle.md`."

## The answer: none of the three

All three were correct. The fault was in the WIRE between the first and the
second, and it was one missing line.

| stage | file | state before this turn |
| --- | --- | --- |
| the menu ITEM | `src/lib/contextActions.js` | ✅ present — three entries (`cornice-0`, `cornice-70`, `cornice-100`), correctly grouped under `run-pieces`, correctly ticked from `corniceOption(unit.params.cornice)` |
| the RUN | `src/lib/contextActions.js` | ✅ present — `run: () => { store.setCornice?.(unit.id, h); store.openPanelSection?.('construction'); }` |
| the STORE WRITE | `src/stores/projectStore.js` | ✅ present — `setCornice` sets `params.cornice`, raises the top infill to the profile's 40 mm so the moulding has something to be screwed to, recomputes the run and returns the ceiling notices |
| the RESOLVER | `src/engine/cornice.js` | ✅ present — `corniceOption`, `corniceSegments`, `segmentCornice`, `corniceSolids` |
| **the WIRE** | `src/components/ContextMenu.jsx` | ❌ **`setCornice` was never put into the `store` object handed to `menuActions`** |

`menuActions` is given a plain object of the functions its entries may call, and
every call site uses optional chaining so that a caller which has never heard of
an entry is simply inert. That is what makes the list safe to grow — and it is
exactly what made a missing line invisible:

```js
store.setCornice?.(unit.id, h);   // store.setCornice === undefined  ⇒  no-op
```

No error, no console line, no toast. The menu ticked the entry it was given
(`checked: fitted === h` reads the params, which never changed), so the item did
not even look wrong — it looked like a toggle that would not stay on.

Every other entry in that menu — `addTopInfill`, `addPlinth`, `addEndPanel`,
`addBottomMask`, `setSideInfillPinned`, `addDoors`, `unitColour` — was wired.
The cornice arrived in turn 25 (F12.3) and its wire was the one that did not.

## The fix

Two lines in `src/components/ContextMenu.jsx`: the selector, and the entry.

```js
const setCornice = useProjectStore((s) => s.setCornice);
…
setCornice: (unitId, height) => {
  const { notices } = setCornice(unitId, height) || {};
  for (const notice of notices || []) notify(notice, 'warn');
},
```

The notices are the store's own — the ceiling honesty check
(`corniceCeilingNotice`) and anything the auto-part refresh has to say — and
they are SHOWN rather than dropped, which is the second half of the entry
working: a 2400 wardrobe under a 2400 ceiling now says so when the moulding is
switched on rather than after somebody notices it clipping.

## And the guard, so it cannot happen to the next entry

`test/turn26-f9-cornice.test.js` walks EVERY action `menuActions` can produce,
for every unit type, collects the `store.<name>?.(` call each one makes, and
asserts that the object `ContextMenu.jsx` hands over has a function of that name.

That is the real repair. The specific missing line is one commit; the class of
fault — an optional call on a function nobody supplied — is what the test
closes, and it would have failed on the day turn 25 shipped the entry.

## What else moved for F9

* **F9.2 — wall units join the run.** `WUD.supports.cornice` is `true`. A run of
  wall units finishes in the air at the same height as the tall unit beside it
  and takes the same moulding; leaving it off was the app deciding a joinery
  question by unit type. The three menu entries now appear on a wall unit's
  right-click menu, in the same `run-pieces` group.
* **F9.3 — the fourth end case.** `runEnd` answered three — a `run` that
  continues, a `wall` that stops it square, an `open` end that turns the corner
  and returns to the back wall. The fourth is a CORNER: another piece of the same
  moulding finishing flush at this end, which a joiner mitres internally at 45°
  exactly as he mitres externally at an open end. `corniceCorner` decides it, and
  `runCorniceParams` gathers every segment in the room first — because a wall
  unit and a tall unit are on different mounts and therefore in different runs
  by construction, which is precisely why F9.3 speaks of "two runs meeting".
* **F9.4 — and when it refuses.** Two different heights cannot be mitred to each
  other and two different DEPTHS cannot either: a 45° between a 350 mm wall unit
  and a 578 mm tall unit does not close, and whether the moulding steps or
  carries the deeper line and returns is a workshop decision nobody has made.
  The corner is left square and the app says why, in a plain sentence.
  **BLOCKERS #92** carries the question.
