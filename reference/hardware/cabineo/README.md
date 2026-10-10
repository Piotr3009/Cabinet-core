# Cabineo: the data slot

CLAUDE.md T75 F23: *"Cabineo: `reference/hardware/cabineo/README.md` naming
what the owner drops in (Lamello's CAD and PDF for the articles the workshop
uses: Cabineo 8, Cabineo 12, 8 M6) and nothing else: no numbers, no geometry,
no holes."*

This folder holds no data yet. The system id `cabineo` is reserved in the
profile (`joints.system`) and in a unit's `joints_system`, and the engine
refuses it with one sentence until the files below are here:

> Cabineo is reserved: its data is not in the repo yet (reference/hardware/cabineo/README.md)

## What the owner drops in

Lamello's own published files, as downloaded, for the three articles the
workshop uses:

- **Cabineo 8**: the CAD file and the PDF.
- **Cabineo 12**: the CAD file and the PDF.
- **Cabineo 8 M6**: the CAD file and the PDF.

## What happens then

Nothing is read from this folder by any code today. When the files are here,
a turn of its own writes the Cabineo pattern as LISP first (the owner's
*"lisp najpierw"*, as `reference/lisp/SKYLON_JOINTS_DOWEL.lsp` was for the
dowel), reading every number from these files, and only then lifts the
refusal. Nothing in this repo invents a Cabineo number before that.
