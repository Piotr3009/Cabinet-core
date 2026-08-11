# verify/t22 — the turn-22 proof

Everything CLAUDE.md's PROOF section asks for, produced by scripts anybody can
re-run.

```
npm test                                  # 1679, all green
npm run build && npx vite preview --port 4173 &
node scripts/e2e-turn22.mjs               # the acceptance walk
node scripts/cnc-fingerprint.mjs          # the CNC identity
node scripts/t22-probes.mjs               # the three equivalence probes
node scripts/bucket-live.mjs              # R2
```

## The walk — `walk.json`

**29 passed, 0 failed, 2 blocked by this environment**, on a real Chromium
driven over the DevTools protocol.

* **R1** every click and every drag is `Input.dispatchMouseEvent`. The ban on
  synthetic DOM events is enforced by a guard that reads the walk's own source
  and refuses to run if one appears.
* **R4** every count and every URL is taken out of the APP — `window.__cc.
  hardware`, `window.__cc.hardwareHealth`, `window.__ccRunners.
  runnerCatalogue()`, `window.__ccT22.*` — and never out of the pixels that
  print them. The health row's printed numbers are compared to the registry's,
  which is the one comparison that can catch a row that lies.
* **R5** the console is captured for the whole session (`console.txt`) and
  asserted at the end.

The two blocked steps are both R2 and both one cause: this session's egress
policy refuses the storage host. See `bucket-live.md`, which carries the
proxy's own answer.

## Screenshots

| file | what it shows |
| --- | --- |
| `1a-cornice-run-stop-and-return.png` | F1.6 — two adjacent wardrobes, ONE 70 mm moulding across both, stopping at the wall on the left and turning the corner on the right |
| `1b-cornice-45-return.png` | the same corner, close up: the 45° mitre and the return running back along the side to the wall, with the bead-and-cove section on it |
| `4a-bud-and-dw-one-plinth-line-at-50.png` | F4.6 — BUD + D/W panel on a run set to 50 mm legs, sharing one plinth line |
| `4b-dw-dragged-along-the-run.png` | F4.4(b) — the D/W after a real pointer drag along the run |
| `2a-company-defaults-and-hardware-health.png` | F2b.2 and F3 — the Company defaults screen (with the "needs an account" notice, the four preferences and the per-family boards) and the hardware health row under it |
| `2b-new-project-prefilled-from-the-row.png` | F2b.3 — a project created with a company row present, in its own settings |
| `99-the-room-at-the-end.png` | the room the walk finished in |

## CNC

| file | |
| --- | --- |
| `cnc-export-identity.md` | the argument, phase by phase |
| `fingerprints-turn21-baseline.txt` | 2766 lines, from a worktree of the turn-21 merge |
| `fingerprints-turn22.txt` | 2766 lines, from this branch |
| `fingerprints-diff.txt` | **empty** |
| `probes.txt` | the three equivalence probes F1.4, F4.5 and F2b.5 ask for |

The entity-level probe (`scripts/cnc-delta-probe.mjs`) diffs empty against the
same baseline as well: no geometry, no entity census, no lettering.

## R2

| file | |
| --- | --- |
| `bucket-live.md` | what was asked, what answered, and what it does and does not cost this turn |
| `bucket-live.txt` / `.json` | the script's raw output |

## What this turn did NOT ship

Nothing. All four phases — F1, F2a, F2b, F3, F4 — are in. The turn was written
to shrink from the bottom (F3, then F2's company-defaults half) and did not
need to.

Two things remain OUT OF SCOPE by CLAUDE.md's own list and are untouched: the
LIFT kits HK/HF gate, and the pull-out shelf unlock (still waiting on the tray
side height). The AVENTOS family appears in `cc_hardware` and in the health row
because the table has a row shape for it — its bucket manifest is deliberately
not fetched, because the owner has not published one and asking for a file
nobody has uploaded is a 404 in his console for no reason.
