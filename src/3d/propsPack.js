// ─── TURN 60 · F2 · THE PROPS PACK, WHERE THE VIEWER CAN REACH IT ──────────
//
// PRO's canvas toolbar carries a PROPS switch (T58b F5) and the owner approved
// it in those words: *"ok props on/off — zegarki wiedzą i reszta też wie."* It
// is a VIEW tool — a picture of what is in the drawers — so F2's *"identyczne
// ma mieć funkcje"* puts it in PBI's bar too.
//
// ─── WHY THIS FILE EXISTS AT ALL ───────────────────────────────────────────
//
// The pack's availability lives in `src/lib/propsSource.js`, and THE IRON
// BOUNDARY says `src/lib` is PRO's: *"src/lib and src/index.css are not core —
// they are PRO's, and a retail file reaching for either is the same violation
// as reaching for a component."* That rule is about PRO's INSTRUMENTS. This is
// not one: `src/3d/Props.jsx` — a shared-core file, the thing that draws the
// watches — already depends on the pack, so the pack is part of the viewer's
// own surface and always was. What was missing is a door onto it inside the
// core, and this is that door and nothing else: three re-exports, no
// component, no PRO copy, no decision of its own.
//
// A switch that cannot ask whether its pack arrived is a switch that lies, and
// T58 F8 is explicit about the alternative: *"ship the toggle GREYED with a
// one-line reason … nothing throws."* `propsReason` is that one line, written
// by the shared core, and it is the sentence PBI shows.
//
// PRO imports `src/lib/usePropsPack.js` directly, as it always has, and cannot
// tell this file exists.

// Imported and re-exported rather than `export … from`: `test/imports.test.js`
// reads a file's own names against the ones it imported, and a bare re-export
// reads to it as three names used out of nowhere.
import { propsAvailable, usePropsPack } from '../lib/usePropsPack.js';
import { propsReason } from '../lib/props.js';

export { propsAvailable, propsReason, usePropsPack };
