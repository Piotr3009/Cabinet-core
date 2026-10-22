# T80 F10 PROBE: the Check numbers, and how a new check is added

22.10.2026. Read-only probe for TURN 80 PART F F10 (CLAUDE.md: "New checks,
numbered from #40 (PROBE first: the next free numbers in `engine/checks.js`; if
#40..#44 are taken, take the next free and say so in the PR)"). It reads
`src/engine/checks.js`, every module that hands it a numbered finding,
`src/components/CheckPanel.jsx`, `src/components/Messages.jsx` and the tests,
and records which numbers are in use, which are free, the shape of a check and
the road a finding takes to the Check panel and to the left messages. Nothing
in `src/` was changed.

## 1. How a check is numbered

There is no string id per check. A check IS its number:

- the registry `CHECKS` (`src/engine/checks.js:87-292`, `Object.freeze`d) holds
  one row per rule, `{ n, level, label }`, in number order;
- every finding carries the same number as `check` (built by `finding(n,
  level, {...})`, `checks.js:430-446`);
- the Check panel prints `#{f.check}`, a middle dot, then
  `CHECKS.find((c) => c.n === f.check)?.label` (`src/components/CheckPanel.jsx:98`),
  so the label comes from the registry and only from there.

Severity is the string `'red'` or `'yellow'`, both in the registry row and on
the finding (a finding may carry a different level from its row: see #2, #18,
#21, #25 below).

## 2. Every number in use

Labels are written in ASCII here (the registry spells #1 and #13 with a multiplication sign and #8 with a degree sign). "Emitted at" is where `runChecks` (`checks.js:560`) pushes it.

| # | Label (registry) | Registry level | Registry line | Emitted at (level) |
| - | - | - | - | - |
| 1 | Shelf x hinge collision | red | `checks.js:88` | `checks.js:529` in `shelfHingeFindings`, called at `596` (red) |
| 2 | Front gap | red | `checks.js:89` | `checks.js:983` (the row's own level; parked becomes yellow) |
| 3 | Tall cabinet with no fixed shelf | yellow | `checks.js:90` | `checks.js:724` (yellow) |
| 4 | Door too heavy for its hinges | red | `checks.js:91` | `checks.js:751` (red) |
| 5 | Open gap above a run | yellow | `checks.js:92` | `checks.js:836` (yellow) |
| 6 | Base run with no plinth | yellow | `checks.js:93` | `checks.js:860` (yellow) |
| 7 | Panel larger than the sheet | red | `checks.js:94` | `checks.js:795` (red) |
| 8 | Wide front at 110 degrees | yellow | `checks.js:95` | `checks.js:813` (yellow) |
| 9 | Outline faults | red | `checks.js:96` | `checks.js:823` from `unitFindings` (`cnc/exportGate.js:51`, `cnc/offBoardGuard.js:220`, `cnc/frontOperations.js:117`, `367`) (red) |
| 10 | Drill faults | red | `checks.js:97` | `checks.js:823` from `cnc/drillGuard.js:192`, `226` (red) |
| 11 | Carcass gap in a run | red | `checks.js:98` | `checks.js:997` from `frontClearance.js:664` `carcassGaps` (red) |
| 12 | Shoe box rebuilt as a drawer | yellow | `checks.js:105` | `checks.js:712` (yellow) |
| 13 | Rail x obstacle above | red | `checks.js:111` | `checks.js:634` (red) |
| 14 | Top box standing on nothing | red | `checks.js:118` | `checks.js:1011` (red) |
| 15 | Top box overlapping its main | red | `checks.js:126` | `checks.js:1025` (red) |
| 16 | Manual geometry off the panel | yellow | `checks.js:140` | `checks.js:850` from `partEdits.js:604` (yellow) |
| 17 | Manual geometry on OUTLINE | yellow | `checks.js:141` | `checks.js:850` from `partEdits.js:591` (yellow) |
| 18 | Runner rung with no article | red | `checks.js:157` | `checks.js:886` (red), `905` (yellow, no catalogue at all) |
| 19 | Unit under slope minimum (400 mm) | red | `checks.js:170` | `checks.js:654` (red) |
| 20 | Drawer stack crosses the slope line | red | `checks.js:178` | `checks.js:689` via warning code `SLOPE_DRAWER_CROSSES` (`672-680`) (red); `1347` (red) |
| 21 | Shelf crosses the slope line | red | `checks.js:186` | `checks.js:689` via `SLOPE_SHELF_CROSSES` (red); `1199` (YELLOW: the slope took a hinge off a door) |
| 22 | (no registry row) | | | `checks.js:1060` a front too thin to take a cup, T51-F5 (red) |
| 23 | (no registry row) | | | `checks.js:1102` watch glass needs a shelf (yellow), `1117` watch insert refused (red), T52-F5 |
| 24 | (no registry row) | | | `checks.js:1144` the slope forced a hinge onto the door partition, T55-F3 (yellow) |
| 25 | J-pull run does not fit the leaf | red | `checks.js:204` | `checks.js:1167` (red when refused, yellow when clamped) |
| 26 | Hinges too near the slope's apex | red | `checks.js:211` | `checks.js:1314` (red) |
| 27 | Corner with nothing between the runs | red | `checks.js:218` | `checks.js:1285` from `corners.js:352` `cornerChecks` (red) |
| 28 | Corner notch refused | red | `checks.js:226` | `checks.js:689` via `NOTCH_REFUSED` (red) |
| 29 | The price list moved since this job was priced | yellow | `checks.js:232` | `checks.js:1216` (yellow) |
| 30 | Parts the machine does not finish | yellow | `checks.js:240` | `checks.js:1235`, `1263` (yellow) |
| 31 | Joint system: not confirmed (dowels, Cabineo), or refused | red | `checks.js:251` | `checks.js:689` via `DOWEL_GATE`, `JOINTS_REFUSED`, `CABINEO_GATE` (red) |
| 32 | Front thinner than its decoration's board | yellow | `checks.js:259` | `checks.js:683` via `FRONT_DECORATION_BOARD` (yellow) |
| 33 | Door swing at 155 / 170 reaches a neighbour | yellow | `checks.js:265` | `checks.js:944` (yellow) |
| 34 | Hood clearance over the hob | yellow | `checks.js:274` | `checks.js:962` (yellow, with a store action button) |
| 35 | Lift-up leaf reaches the ceiling, a cornice or the unit above | yellow | `checks.js:282` | `checks.js:1375` from `liftChecks.js:30` (`LIFT_CLEARANCE_CHECK = 35`) (yellow) |
| 36 | Recess extension refused | red | `checks.js:291` | `checks.js:689` via `EXTENSION_REFUSED` (red) |

The registry has 33 rows: 1 to 21 and 25 to 36. Numbers 22, 23 and 24 are
EMITTED but have no row (the Check panel prints them with an empty label); the
gap is named in `test/turn31-f6-check-v1.test.js:100-102` ("#22, #23 and #24
are already emitted by T52/T53/T55: they were never given rows in this
registry"). They are taken, not free.

## 3. The free numbers

| Numbers | State | Evidence |
| - | - | - |
| 37, 38, 39 | FREE | no registry row, no `finding(37..39, ...)`, no `check: 37..39` in `src/`, no "Check #37..#39" in `src/`, `test/`, `scripts/` or any `.md` / `.lsp` |
| **40, 41, 42, 43, 44** | **FREE** | the same searches; the only mentions are this turn's `CLAUDE.md` and `_nie-do-repo/CZYTAJ.md` (the owner's T80 note, lines 33, 42, 43) |
| 45 and up | free | the same searches |

**#40 to #44 are free and can be taken as CLAUDE.md names them.** The lowest
free number is 37; CLAUDE.md asks for #40 onward, so 37 to 39 stay unused (say
so in the PR so nobody reads them as a hole).

## 4. How a new check is added

1. **The registry row.** Append `{ n: 40, level: 'red', label: '...' }` (and
   41 to 44) at the end of `CHECKS`, after #36 (`checks.js:291`), in number
   order, with the turn's comment block above it as every earlier row has.
   `level` is `'red'` or `'yellow'`; `label` is what the panel prints after the
   number.
2. **The finding.** Inside `runChecks` (`checks.js:560-1392`) push
   `finding(40, 'red', { unitId, unitNum, panelId, message, subject, ...extra })`.
   `finding` (`checks.js:430-446`) returns `{ check, level, unitId, unitNum,
   panelId, message, subject, ...rest }`; `subject` defaults to the panel's
   element editor when a `panelId` is given, else the cabinet editor, else
   null (no flight). Extra fields (`actions: [{ id, label, title, subject }]`,
   any data a test wants) ride along as `...rest`; `actions` become buttons in
   the panel (`CheckPanel.jsx:110-129`). A whole-run fault names the unit the
   click should open.
3. **The inputs.** `runChecks` receives `entries` (every `{ unit, result }`
   from `allResults`), `units`, `room`, `design` (migrated), `materials`,
   `profile`, `wallWidthOf`, `slopeShortfallOf`, `priceMoves` from the store's
   `runChecks` (`src/stores/projectStore.js:10086-10125`). `design.inframe`
   will therefore reach it with no new plumbing; a rule about runs can call
   `buildRuns` (`src/engine/runs.js`, already imported by `checks.js:46` for
   `unitBase`, `unitTop`, `hasTopInfill`) on `units`. `state.runElements` is
   NOT handed in today; a rule that needs the frame element needs either a new
   input from the store or to re-derive it from `units` (one law one path says
   re-derive through the same function the store calls).
4. **Order and de-duplication** are automatic: findings are de-duplicated on
   `check|unitId|panelId|message` (`checks.js:1380-1386`) and sorted reds
   first, then by number, then by unit number (`checks.js:1388-1391`).
5. **The Check panel** (`src/components/CheckPanel.jsx`, a PRO file under the
   T59 freeze) needs NO edit: it reads `useCheckFindings()` (`:47`), renders
   each finding with `data-check-finding={f.check}` (`:86`) and
   `data-check-level={f.level}` (`:87`), tones it by level (`TONE`, `:39-42`)
   and prints the label from `CHECKS` (`:98`). The same findings feed the
   toolbar count (`src/components/CanvasToolbar.jsx:67`), the BOM's red rows
   (`src/components/BomPanel.jsx:107`), the CNC tree (`src/components/CncTree.jsx:175`)
   and the export summary (`src/pages/ConfiguratorPage.jsx:373-380`), all
   through the store's one `runChecks`. `useCheckFindings`
   (`src/lib/checkFindings.js:80-102`) recomputes on `units`, `design`, `room`,
   `profile`, `materials` (`checkDependencies`, `:64-68`), so flipping
   `design.inframe` re-runs the checks.
6. **The left messages** (`src/components/Messages.jsx`) draw
   `useUiStore().messages`, filled only by `notify(message, tone)`
   (`src/stores/uiStore.js:1068-1130`); the level comes from the tone
   (`src/engine/messages.js:97-100`: `'error'` is red, `'warn'` is yellow).
   **No finding reaches the left column by itself today.** The paths that do
   exist: (a) the export-time summary sentence, one line for the whole list
   (`ConfiguratorPage.jsx:376-380`); (b) a store action's returned `notices`,
   notified by the component that called it (for example
   `src/components/SettingsPanel.jsx:295`, `src/components/RightPanel.jsx:337`);
   (c) a rule's own rows rendered as a child of `<Messages>`, as the front-gap
   rows are (`FrontGapWarnings`, `ConfiguratorPage.jsx:649-655`). T79's #36
   test (`test/turn79-f08-notch-and-recess.test.js:544-559`) proves the Check
   panel road only. "Each in the left messages" for #40 to #44 therefore needs
   one of (b) or (c) to be built, and the PR should say which.

## 5. Tests that count or list the checks (they must grow)

| Test | Line | What it pins today | After #40 to #44 |
| - | - | - | - |
| `test/turn31-f6-check-v1.test.js` ("the rules, each with the owner's colour", starts `:45`) | `:129` | `CHECKS.length` is 33 | 38 |
| same | `:130` | the exact list `[1 .. 21, 25 .. 36]` | append 40, 41, 42, 43, 44 |
| same | `:132-177` | the colour of every row (`{ 1: 'red', ..., 36: 'red' }`) | add 40 red, 41 yellow, 42 yellow, 43 yellow, 44 red |
| same | `:178` | every row has a label | holds |
| `test/turn37-f5-top-box.test.js` ("F5c, the rule is in the list, in red, and it is the fifteenth", starts `:122`) | `:153` | `CHECKS.length` is 33 | 38 |
| same | `:154` | `CHECKS[14].n` is 15 | holds (rows appended at the end) |

Both files carry an "AMENDED BY Tnn" ledger above the count, one entry per turn
that added a row (T79 F8 is the last); T80 adds its own entry in each. Tests
that read single rows by number (`CHECKS.find((c) => c.n === N)`) are not
affected by an append: `turn35-f1-rail-datum`, `turn36-f7-top-box`,
`turn43-f7-runner-stand-in-dies`, `turn46-f4-option-a-the-front-is-cut`,
`turn46-f5-the-interior-obeys`, `turn57-f4-f5-the-entry-and-the-checks`,
`turn59-f4-the-options`, `turn74-f10-hinges-150-from-the-apex`,
`turn75-f1-corner-rulebook`, `turn75-f21-the-csv-contract`,
`turn75-f22-readiness`, `turn75-f23-dowels`, `turn76-f4-the-recipes-in-the-profile`,
`turn78-f13-wide-hinges`, `turn79-f08-notch-and-recess`. Retail reads one row
only (`src/retail/design/adapter.js:1838`, #8).

## 6. Notes for the F10 writer

- An existing rule overlaps #41: **#11 Carcass gap in a run** (red,
  `frontClearance.js:664-709`, tolerance 0.5 mm, reach `neighbourReachMm` 200)
  already fires for "cabinets A and B stand 4 mm apart". A 4 mm gap also
  splits the run (`runGap` 1 mm, see `verify/t80/f03-probe.md` section 8), so
  #41 yellow and #11 red would report the same junction in two colours unless
  #41 is scoped to what #11 does not say.
- #40 as written ("front type not 22") is red on every project today: no front
  source in the profile is 22 (Spray 18, Veneer 19, Laminate 18, Wood 20, Raw
  18; no source gives `profile.front.thickness` 25), see
  `verify/t80/f03-probe.md` section 9.
- The empty-list sentence in the panel ("Eleven rules, nothing to fix",
  `CheckPanel.jsx:76-77`) is static text and does not need the count.
