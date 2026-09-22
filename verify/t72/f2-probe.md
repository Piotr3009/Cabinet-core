# T72 · F2 — the count shelf: the probe

> *"jest menu po 2kliku, ale nie ma opcji back 20 mm, czyli regulacji głębokości,
> ani nie ma wyboru fix / adjustable, nie choose, tylko te 2 opcje."*

CLAUDE.md F2 names a suspect and makes the fix conditional on it: a shelf added as
a COUNT has no `itemId`, and `elementFields` then drops every field but material.
This asks whether such a shelf can reach the room the owner is looking at.

| where | what was asked | what it answered |
| --- | --- | --- |
| the guard | `the line, as `engine/elements.js` writes it` | `if ((kind === 'shelf' || kind === 'partition') && !panel.meta?.itemId) {` |
| the guard | `where` | `src/engine/elements.js:326` |
| a bare engine call | `computeCabinet({…, shelves: 3, items: none})` | `3 shelf panels` |
| a bare engine call | `the first shelf's meta.itemId` | `null` |
| a bare engine call | `elementFields on it` | `material` |
| the retail room | `the line that derives the count` | `shelves: items.filter((i) => i.kind === 'shelf').length,` |
| the retail room | `where` | `src/stores/projectStore.js:853` |
| the retail room | `params.shelves = 3 written by hand → panels cut` | `0` |
| the retail room | `addShelves(unitId, 3) → items` | `3` |
| the retail room | `…→ shelf panels cut` | `3` |
| the retail room | `shelf panels with NO meta.itemId` | `0` |
| the retail room | `elementFields on every one of them` | `shelf-type · position-y · setback · thickness · material` |

## The fact

```
NOT CONVICTED · THE COUNT SHELF CANNOT REACH THE RETAIL ROOM.

`projectStore.paramsForEngine` derives `shelves` FROM THE ITEMS, so a bare count
written onto a unit reaches the engine as 0 and cuts no board at all (row 8 above:
three written, none cut). Every shelf a client can point at came from `addShelves`,
which makes an item, so every one of them carries `meta.itemId` and
`elementFields` returns the whole list — `shelf-type` included.

The guard IS real and it IS reachable: a BARE `computeCabinet({shelves: 3})` — the
goldens' own road — produces exactly the panel turn 21 wrote it for. It is not a
road through the app, and nothing in the store needs to change.

F2's clause is conditional — *"IF that is why the type is missing"* — and it is not.
So no count-to-item conversion is built: it would be a store path nothing can call.

WHAT IS ACTUALLY MISSING ON HIS SCREEN is `verify/t72/f6-probe.md`'s finding, and it
is one CSS selector: `.pbi-dock label:has(> select.pbi-re-input)` hides EVERY
`<select>` in the docked editor, because `ElementProperties`' `Field` wraps every
control in a `<label>`. `shelf-type` was a `<select>`. It is TWO CHIPS tonight —
the owner's own *"nie choose, tylko te 2 opcje"* — so it is not a `<select>` any
more, and F6 narrows the selector to the board pickers it was written for.
```

