# T70 · F6 — the bay hover probe

CLAUDE.md F6: *"T69 F6 claims this fixed and its walk agreed; the owner says it
does not happen. **Probe first** … commit the table. Then fix what the probe
convicts."*  Nothing below is changed by this file — it reads.

## The chain, link by link

| # | link | where | the line itself |
|---|------|-------|-----------------|
| 1 | the element | `src/retail/design/Options.jsx:470` | `data-testid={`inside-bay-${z.index}`}` |
| 2 | the event | `src/retail/design/Options.jsx:474` | `onPointerEnter={() => A.hoverBay(z.index)}` |
| 3 | what it emits | `src/retail/design/adapter.js:2142` | `U().setZoneHint(index == null ? null : index);` |
| 4 | the store | `src/stores/uiStore.js:638` | `setZoneHint: (index) => set({ zoneHint: index == null ? null : Math.trunc(Number(index)) }),` |
| 5 | what the scene reads | `src/3d/Scene.jsx:1342` | `const zoneHint = useUiStore((s) => s.zoneHint);` |
| 6 | WHICH UNIT it reaches | `src/3d/Scene.jsx:1739` | `zoneHint={selectedUnitId === unit.id ? zoneHint : null}` |
| 7 | what is drawn | `src/3d/UnitView.jsx:2719` | `{zoneHint != null && bays[zoneHint] && !contour && (` |

  every link present: YES

## What the scene actually draws

| the client is | hovers | `zoneHint` | `selectedUnitId` | Scene passes | UnitView draws |
|---------------|--------|-----------|------------------|--------------|----------------|
| AS ENTERED — the room booted, nothing clicked | bay 1 | `1` | `null` | `null` | **NOTHING** |
| AFTER A CLICK on the wardrobe on the stage | bay 1 | `1` | `u_hpqih7r` | `1` | a slab over bay 1 (576 mm) |

## The verdict

  **CONVICTED.** The hover does nothing when the client is: *AS ENTERED — the room booted, nothing clicked*.

  Every link of the chain is present and the chip writes the integer — `zoneHint`
  is `1` after the hover, exactly as T69 built it. The chain breaks at
  LINK 6, `src/3d/Scene.jsx:1739`:

      zoneHint={selectedUnitId === unit.id ? zoneHint : null}

  `Scene.jsx` hands the hint to the SELECTED unit only, and `selectedUnitId` is
  `null` — because `DesignRoom.jsx` calls `ui.clearSelection()` at boot and a
  client who walks WHAT → WHERE → SIZE → INSIDE has clicked no wardrobe. The left
  column is still showing that wardrobe's chips, because `adapter.designUnit`
  FALLS BACK to the first wardrobe when nothing is selected — so the chips are
  about a cabinet the scene does not think is selected.

  WHY T69's WALK AGREED: its own test presses the chip (`onClick`), and the chip's
  click calls `A.selectUnitOnStage(unit.id)` before hovering. Pressing one makes
  every later HOVER work. The owner hovers without pressing, which is what a
  pointer is for.

  THE FIX THE PROBE CONVICTS: the HOVER must reach the same cabinet the CHIP is
  about — one line, at the chip, calling the same `selectUnitOnStage` its own
  click already calls. No second highlighter and no change to Scene or UnitView.

