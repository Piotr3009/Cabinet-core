# T70 · F6 — the bay hover probe

CLAUDE.md F6: *"T69 F6 claims this fixed and its walk agreed; the owner says it
does not happen. **Probe first** … commit the table. Then fix what the probe
convicts."*  Nothing below is changed by this file — it reads.

## The chain, link by link

| # | link | where | the line itself |
|---|------|-------|-----------------|
| 1 | the element | `src/retail/design/Options.jsx:470` | `data-testid={`inside-bay-${z.index}`}` |
| 2 | the event | `src/retail/design/Options.jsx:502` | `onPointerEnter={() => { A.selectUnitOnStage(unit.id); A.hoverBay(z.index); }}` |
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
| AFTER A CLICK on the wardrobe on the stage | bay 1 | `1` | `u_mq4miem` | `1` | a slab over bay 1 (576 mm) |
| AS ENTERED — pointing at the chip AS IT IS WIRED | bay 1 | `1` | `u_mq4miem` | `1` | a slab over bay 1 (576 mm) |

## The verdict

  THE HOVER WORKS. The element is the chip
  `data-testid="inside-bay-N"` in the INSIDE step (`src/retail/design/Options.jsx:470`) and the
  event is `onPointerEnter` (`src/retail/design/Options.jsx:502`), which now reads:

      onPointerEnter={() => { A.selectUnitOnStage(unit.id); A.hoverBay(z.index); }}

  ─── WHAT THE FIRST TWO ROWS OF THE TABLE ARE, AND WHY THEY STAY ─────────

  They are the DIAGNOSIS this probe was written for, kept verbatim. Row 1 is
  the adapter call on its own — `A.hoverBay(1)` and nothing else — and it still
  draws NOTHING, because the chain breaks at LINK 6,
  `src/3d/Scene.jsx:1739`:

      zoneHint={selectedUnitId === unit.id ? zoneHint : null}

  `Scene.jsx` hands the hint to the SELECTED unit only, and `selectedUnitId` was
  `null` — `DesignRoom.jsx` calls `ui.clearSelection()` at boot and a client who
  walks WHAT → WHERE → SIZE → INSIDE has clicked no wardrobe, while the left
  column still shows that wardrobe's chips because `adapter.designUnit` FALLS
  BACK to the first one. The chips were about a cabinet the scene did not think
  was selected.

  WHY T69's WALK AGREED: its test presses a chip, and the CLICK has always called
  `selectUnitOnStage`. Pressing one made every later hover work. The owner hovers
  without pressing, which is what a pointer is for.

  THE FIX, and it is the click's own line moved onto the hover: no second
  highlighter, and not one byte of `Scene.jsx` or `UnitView.jsx` — both are shared
  with PRO and both were correct.

