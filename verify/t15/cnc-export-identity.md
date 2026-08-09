# CNC export identity — turn 15

CLAUDE.md, turn 15, IRON RULES:

> CNC EXPORT: byte-identical EXCEPT one named delta this turn — the side infill
> gains its 45° mitre where it meets a top infill (F6). Fingerprint both sides,
> publish in `verify/t15/cnc-export-identity.md`. The two new CNC VIEWS (F9) are
> views: they read, they never write.

This is that publication. Both sides were fingerprinted with
`scripts/cnc-fingerprint.mjs`, which prints one 32-bit FNV-1a per DXF file and
per sheet preset, for every unit type in ten configurations.

---

## 1. Everything that exists today: BYTE-IDENTICAL

The first run used the fingerprint script **exactly as turn 14 left it** — the
ten cases per type it already had — against the turn-14 engine and against this
branch:

```
git worktree add /tmp/cc-base HEAD~            # the turn-14 baseline
(cd /tmp/cc-base && node scripts/cnc-fingerprint.mjs > /tmp/base.txt)
node scripts/cnc-fingerprint.mjs > /tmp/head.txt
diff /tmp/base.txt /tmp/head.txt
```

**No output. 1 850 fingerprints, all equal.** Not one coordinate, layer name,
group code or entity order moved for anything the app cut before this turn.

That is not luck, and it is worth writing down WHY it is structural: every case
in the corpus is a cabinet **closing itself**. `computeCabinet` with no
`run_top_infill` falls back to `soloRun`, whose ends are `wall`/`wall`, and a
mitre needs an end that stops against a ceiling-height filler. No solo cabinet
can produce one. Neither can any of the twelve golden fixtures, for the same
reason — `fixtures/*.json` diff 0.

## 2. The ONE named delta: the mitred corner

A delta nothing exercises is a delta nobody can check, so the script gained
three cases per unit type — `+infills`, `+infill-mitre`, `+infill-mitre-narrow`
— and both sides were re-run with the NEW script, so the comparison is
engine-to-engine and not script-to-script:

```
cp scripts/cnc-fingerprint.mjs /tmp/cc-base/scripts/
(cd /tmp/cc-base && node scripts/cnc-fingerprint.mjs > /tmp/base2.txt)
node scripts/cnc-fingerprint.mjs > /tmp/head2.txt
diff /tmp/base2.txt /tmp/head2.txt
```

The full outputs are `fingerprints-turn14-baseline.txt` and
`fingerprints-turn15.txt`; the diff is `fingerprints-diff.txt`.

**80 changed lines, and every one of them is `+infill-mitre`.** The changed
rows, in full:

| case | what changed |
|---|---|
| `<TYPE>+infill-mitre  file  01-INFILL-L-FACE.dxf` | the vertical filler's OUTLINE — the named delta |
| `<TYPE>+infill-mitre  file  01-INFILL-T-FACE.dxf` | the top strip it mitres into |
| `<TYPE>+infill-mitre  sheet all` | the two files above, on the sheet |
| `<TYPE>+infill-mitre  sheet sprayed` | the same two — both are sprayed pieces |

for each of the ten unit types. **`+infills` and `+infill-mitre-narrow` are
byte-identical on both sides**, which is the other half of the proof: a filler
with no top infill above it, and a filler too narrow to take a 45° at all, are
cut exactly as turn 14 cut them.

`sheet non-sprayed` and `sheet fronts` are unchanged everywhere, because neither
preset contains an infill.

### What the two pieces became

Measured off the engine, for a 100 mm ceiling gap and a 100 mm filler:

```
INFILL-L-FACE   100 × 2350   outline [[0,0],[100,0],[100,2250],[0,2350]]
INFILL-T-FACE  1300 ×  100   outline [[100,0],[1300,0],[1300,100],[0,100]]
```

* The **filler is cut to the same size it always was** — 100 × 2350. Its outer
  edge runs full height and only its inner one is cut back, which is what a
  mitre IS. Only the OUTLINE moved, and that is the delta CLAUDE.md names.
* The **top strip runs to its long point** over the corner: 1300 at the top edge
  where it reaches the wall, 1200 at the bottom where it stops against the
  filler. Same piece, cut to its long point, which is how every mitre in this
  engine has been cut since turn 8.
* The two 45° cuts are **one plane**. In the unit's own frame both run from
  `(x = 0, y = H)` to `(x = −100, y = H + 100)`. `test/turn15-infill-mitre.test.js`
  asserts exactly that, vertex by vertex — it is a joint, not two pieces ending
  near each other.

### When it does NOT cut

Three conditions, each a joiner's reason, all in `runs.js infillCornerMitre`:

1. the thing in the way is a **side infill** (not a wall, an end panel or an
   open end);
2. the two **finish flush** — a filler standing 200 mm proud of a 40 mm strip is
   a T-junction, not a corner;
3. there is **room** — the 45° runs `faceH` across the filler, so a filler
   narrower than the strip is tall has no 45° to give and is butted.

Any of the three failing gives the turn-14 geometry back, byte for byte.

## 3. The two new VIEWS write nothing

F9's `engine/cnc/views.js` is imported by `components/CncView.jsx` and by
`test/turn15-sources-and-views.test.js`, and by nothing else:

```
$ grep -rl "cnc/views.js" src/ scripts/
src/components/CncView.jsx
```

`engine/cnc/dxf.js`, `engine/cnc/layout.js`, `engine/cnc/groups.js` and
`lib/cncExport.js` are untouched by this turn. A view buckets parts and names
the buckets; the file that goes to the machine is decided by the checkbox tree
and the presets, exactly as it was in turn 11.

## 4. The gate

| check | result |
|---|---|
| existing fingerprints (1 850 rows) | identical |
| golden fixtures | diff 0 |
| new-case fingerprints | 80 rows differ, all `+infill-mitre`, all on the two named files |
| `+infills`, `+infill-mitre-narrow` | identical |
| export code touched | none |
