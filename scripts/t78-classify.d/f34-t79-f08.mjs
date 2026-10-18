/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T79 F8 · A NOTCH AND A RECESS ON THE SAME CARCASS. CLAUDE.md T79 PART C, the owner's list of 18.10.2026:
// *"dlaczego cut the corner likwiduje nam wcięcie do recess?"*  THE PROBE (verify/t79/f08-probe.md, HEAD 14b6fd1):
// BUD 600, notch BL 200 / 200 / 0 (golden-notch.json's) and CASE A's band (golden-recess.json's, x 310..600, floor to
// top, 150 deep): the footprints on the BACK do not touch (x 0..200 against 310..600), yet the cut was the notch alone,
// board for board, and the extension was refused by KIT_RECESS.lsp D13 ("a carcass notched round an obstacle cannot grow
// into a recess as well") in a sentence no screen showed (checks.js mapped no EXTENSION_REFUSED). LISP first: D13 amended
// to WITH A NOTCH (the footprints on the BACK decide: the notch's width at its corner's end against x0..x1, its height,
// from the floor, the whole height or, D21, from the top, against z0..z1), section H (what the extension asks of a carcass
// the notch has cut: the TOP / BOTTOM, a side, the BACK and a shelf both cut, the runs between the two, EXT-FLOOR and
// EXT-LID) and the NUMBERS block CASE D; engine/extension.js mirrors it routine for routine and cuts it in
// extensionCarcass after notchCarcass. The gate is the pair: a unit with only a notch or only an extension runs the
// lines it ran, so the six, golden-notch*.json, golden-recess*.json and every other golden hold.

import { computeCabinet } from '../../src/engine/cabinet.js';
import { defaultParamsFor } from '../../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../../src/engine/profile.js';

const OWNER = '*"dlaczego cut the corner likwiduje nam wcięcie do recess?"*';
const BUD = (extra = {}) => ({ ...defaultParamsFor('BUD', P), unit_num: '01', front_t: 25, shelves: 1, hinge: 'L', ...extra });
const NOTCH = { corner: 'BL', w: 200, d: 200, h: 0 };
const BAND = { x0: 310, x1: 600, z0: 0, z1: 770, d: 150 };
const SENTENCE = 'The recess cannot be cut: the corner cut stands where the recess band is; move one of them.';

export const GATES = {
  notchRecess: {
    what: 'a unit carrying a corner notch AND a recess extension (`params.notch` and `params.extension` together; the band '
      + 'is the room\'s, projectStore recessExtensionFor). KIT_RECESS.lsp D13 as amended 18.10.2026: the footprints on the '
      + 'BACK decide; apart, both are cut (the notch first, the extension on the boards it left, section H), overlapping, '
      + 'the band is refused in words the Check shows (#36). Until T79 any notch refused the band. Never opens on a unit '
      + 'with one of the two',
    opens: (p) => Boolean(p?.notch) && typeof p.notch === 'object' && Boolean(p?.extension) && typeof p.extension === 'object',
  },
  recessBurMarks: {
    what: 'a recess band that reaches the RIGHT side (x1 at the width: BUR grows) and stops short of the floor or the top '
      + '(the side\'s bump has corners, so CORNER_4MM marks). extensionDrills re-origins BUR into its frame from the new '
      + 'back edge and moved the outline, the pockets and the holes by ed, never the marks: they stood ed off the corners in '
      + 'the DXF, the bump\'s alone and, both cut, the notch\'s on BUR too (found by the F8 review). A full-height band or '
      + 'one short of the right side never opens it',
    opens: (p) => {
      const e = p?.extension;
      if (!e || typeof e !== 'object') return false;
      const W = Number(p.width) || 0;
      const H = Number(p.height) || 0;
      return W > 0 && Number(e.x1) >= W && (Number(e.z0) > 0 || (H > 0 && Number(e.z1) < H));
    },
  },
};

export const LICENSED = {
  'src/engine/extension.js': {
    why: `T79 F8 · KIT_RECESS.lsp D13 and section H mirrored: recessRefusal takes the notch's footprint (recessNotchFootprint, `
      + 'recessNotchOverlapP) in place of `notched` and answers an overlap with RECESS_NOTCH_OVERLAP; recessRuns, recessInRun, '
      + 'recessNotchZcut, recessNotchXcut, recessCutCorner (cutNotchCorner, one path), recessNotchedTopOutline / -Joints, '
      + 'recessNotchedSideOutline / -Joints, recessNotchedBackPieces / -Corner / -Outline, recessNotchedShelfOutline, '
      + 'recessBoxName; recessBackJoints keeps a BOXED back notch\'s box off its rows (`nb`, run by run) and, the F6 x F8 '
      + 'seam (KIT_NOTCH.lsp D10 AMENDED, the owner: *"jak mamy cut the corners lub recess to nie rysujesz mi dziurek na '
      + 'śrubki 3 mm, to trzeba będzie dodać"*; *"ale tylko na plecach."*), draws the rows into that box on the piece that '
      + 'holds them exactly as the notched BACK alone (recessNotchBoxRows, the notch\'s own notchBackBoxRows, one routine: '
      + 'the RETURN\'s column at full height, its run and the LID\'s or FLOOR\'s row at part height), a hole once '
      + '(recessPutHole: where the footprints touch the window\'s column falls on the notch\'s, found by the F8 review), and '
      + 'on the side edge the notch cuts runs drawBACK\'s row on what the notch AND the window leave of it, a row on its run '
      + '(recessSideRow, recessWindowZcut: D13\'s "every edge cut by both"; holes stood in the window, in the notch and off '
      + 'the board, found by the F8 review); extensionVerdict '
      + 'asks the footprint (and reads a notched parent\'s BACK pockets in carcass x); extensionCarcass takes `notchCut`: a '
      + 'board both cut takes section H\'s outline and joints, the BACK is cut from the notched BACK (the notch\'s re-origin '
      + 'of it taken over, its region re-stated per piece), the box boards EXT-FLOOR / EXT-LID, every piece\'s box from the '
      + `parent's (the first piece of a notched BACK starts past the notch). Every changed answer is behind the pair. ${OWNER} `
      + 'And extensionDrills moves a grown BUR\'s CORNER_4MM marks with its re-origin (shiftMark), as it moves the outline, the '
      + 'pockets and the holes: behind recessBurMarks (a band reaching BUR short of the floor or the top), which no golden opens.',
    gates: ['notchRecess', 'recessBurMarks'],
  },
  'src/engine/cabinet.js': {
    why: `T79 F8 · extensionCarcass runs after notchCarcass on a notched carcass (the \`!notchCut\` gate gone; the verdict `
      + `above refuses every band that overlaps), handed the notch's cut record; the notch's verdict is asked of the kit's own `
      + `carcass when a band is there too (the notch first: on the grown parent a hinge the notch takes on BUR was read ed past `
      + `it and cut away, found by the F8 review); comments. Behind the pair. ${OWNER}`,
    gates: ['notchRecess'],
  },
  'src/engine/notch.js': {
    why: 'T79 F8 · cutNotchCorner honours a corner\'s own frame (`fw` its depth, `ox` where it stands: a notched side grown '
      + 'into a recess keeps the old side\'s corner past the bump), notchDrills a region\'s offset (`ox`, `oy`: the recess '
      + 're-states the notch\'s region on a board it cut too), notchCornerKey (3d/panelSolid.js\'s cache key, the whole '
      + `chain). Absent, every answer is the notch's own: only the pair writes them. ${OWNER}`,
    gates: ['notchRecess'],
  },
  'src/engine/checks.js': {
    why: `T79 F8 · Check #36 Recess extension refused (red, #28's twin) reads the engine's EXTENSION_REFUSED in its own words; `
      + 'CLAUDE.md names #32, which T76 F4 holds, so it takes the next free number. A Check row, not a cut: no golden reaches '
      + `it. ${OWNER}`,
    gates: [],
  },
  'src/3d/panelSolid.js': {
    why: `T79 F8 · the cache key of a notched board names the whole \`also\` chain and a corner's frame (notchCornerKey); `
      + `the import line of cutNotchCorner stands as it was. ${OWNER}`,
    gates: [],
  },
};

export const LIVENESS = {
  // The golden case (KIT_RECESS.lsp CASE D) cuts both: the BACK is 128 wide at x 200 (the notch's strip and the window
  // off it), the TOP's plan is the bump less the notch's corner (eight points), RETURN / STEP and RETURN-L / EXT-BACK all
  // there, no refusal; the band from 100 overlaps and is refused in the sentence, the notch standing.
  notchRecess: () => {
    const r = computeCabinet(BUD({ notch: NOTCH, extension: BAND }), P);
    const o = computeCabinet(BUD({ notch: NOTCH, extension: { ...BAND, x0: 100 } }), P);
    const panel = (res, id) => res.panels.find((p) => p.id === id);
    const back = panel(r, 'BACK');
    const plan = panel(r, 'TOP')?.meta?.extension?.outline || [];
    const ids = r.panels.map((p) => p.id);
    const refusal = o.warnings.find((w) => w.code === 'EXTENSION_REFUSED');
    return {
      live: r.warnings.length === 0 && Boolean(r.derived?.notch) && Boolean(r.derived?.extension)
        && back?.w === 128 && back?.box?.x === 200 && plan.length === 8
        && ['RETURN', 'STEP', 'RETURN-L', 'EXT-BACK'].every((id) => ids.includes(id)) && new Set(ids).size === ids.length
        && refusal?.message === SENTENCE && Boolean(o.derived?.notch) && !o.derived?.notch?.refused,
      said: `BL 200 / 200 / 0 with the band 310..600: ${r.warnings.length} warning(s), BACK ${back?.w} wide at x ${back?.box?.x}, `
        + `TOP plan ${plan.length} points, boards ${[...(r.derived?.notch?.boards || []), ...(r.derived?.extension?.boards || [])].join(' ')}; `
        + `the band from 100: ${refusal ? `refused, "${refusal.message}"` : 'not refused'}, the notch ${o.derived?.notch ? 'stands' : 'gone'}`,
    };
  },
  // A band reaching BUR from the floor to 500: BUR is 690 deep, its frame from the new back edge, the bump x 0..150 up
  // to 482, so its one corner mark stands at (150, 482) on the board (it stood at (0, 482), ed off, until the review);
  // both cut with a BR notch 300 high under a band from 400, the notch's mark stands at (350, 300), the bump's at (150, 418).
  recessBurMarks: () => {
    const cornerOf = (r) => (r.panels.find((p) => p.id === 'BUR')?.cnc?.marks || [])
      .filter((m) => m.layer === 'CORNER_4MM').map((m) => (m.pts || [])[1]);
    const alone = cornerOf(computeCabinet(BUD({ extension: { x0: 310, x1: 600, z0: 0, z1: 500, d: 150 } }), P));
    const both = cornerOf(computeCabinet(BUD({
      notch: { corner: 'BR', w: 200, d: 200, h: 300 }, extension: { x0: 300, x1: 600, z0: 400, z1: 770, d: 150 },
    }), P));
    const key = (list) => JSON.stringify(list);
    return {
      live: key(alone) === key([[150, 482]]) && key(both) === key([[350, 300], [150, 418]]),
      said: `BUR's corner marks: the band 310..600 to 500 at ${key(alone)}; the BR notch 300 with the band from 400 at ${key(both)}`,
    };
  },
};

export const GOLDENS = [
  {
    file: 'golden-notch-and-recess.json',
    F: 'F34',
    source: 'KIT_RECESS.lsp D13 WITH A NOTCH (section H, the NUMBERS block CASE D) on KIT_BUD_FULL.lsp (golden-bud.json\'s BUD-A '
      + 'with 1 shelf): KIT_NOTCH.lsp\'s notch BL 200 x 200 x 0 and CASE A\'s band x 310..600, z 0..770, 150 deep, apart on the '
      + 'BACK: the notch first (BUL shorter, RETURN, STEP), the extension on what it left (BUR, TOP, BOTTOM and SHELF-1 grown, the '
      + 'TOP / BOTTOM / SHELF-1 both cut, the BACK 128 wide between the notch and the window, RETURN-L, EXT-BACK)',
    params: () => BUD({ notch: NOTCH, extension: BAND }),
  },
];

export const LISP = {
  'reference/lisp/KIT_RECESS.lsp': `Owner 18.10.2026 (CLAUDE.md T79 F8): ${OWNER} D13 amended from NOT WITH A NOTCH to WITH A `
    + 'NOTCH: a notch and an extension coexist when their footprints on the BACK do not overlap (the notch\'s width at its '
    + 'corner\'s end against x0..x1, its height, from the floor, the whole height or, D21, from the top, against z0..z1); then '
    + 'both are cut, the notch first and the extension on the boards it left, the BACK\'s pieces from the notched BACK; an '
    + 'overlap is refused in the sentence the Check shows. recess-refusal takes the footprint; recess-back-joints keeps a boxed '
    + 'notch\'s box off its rows (`nb`) and draws the rows into it on the piece that holds them, exactly as the notched BACK '
    + 'alone (the F6 x F8 seam, KIT_NOTCH.lsp D10 AMENDED, the owner: *"jak mamy cut the corners lub recess to nie rysujesz mi '
    + 'dziurek na srubki 3 mm, to trzeba bedzie dodac"*; *"ale tylko na plecach."*: recess-notch-box-rows reads the notch '
    + 'back off nb and calls KIT_NOTCH\'s own notch-back-box-rows; D13\'s text says it), a hole once (recess-put-hole: where '
    + 'the footprints touch the window\'s column falls on the notch\'s) and the side row on the edge the notch cuts on what '
    + 'the notch AND the window leave of it, a row on its run (recess-side-row, recess-window-zcut: D13\'s "every edge cut by '
    + 'both"; both found by the F8 review); section H (recess-notch-footprint, -overlap-p, recess-runs, recess-in-run, the zcut and '
    + 'xcut, recess-cut-corner, the notched TOP / side / BACK / shelf routines, recess-box-name: EXT-FLOOR, EXT-LID); the NUMBERS '
    + 'block CASE D (BUD 600, BL 200 / 200 / 0, the band 310..600, board by board; the BACK\'s 13 dia 3 holes, the RETURN\'s '
    + 'column x 209 among them, and the box rows of BL 300, BL -300 and BR 0 on the piece that holds them; the review\'s three '
    + 'cases, the footprints touching, the band and the notch on one side, a short run under a notch from the top); section H\'s header: the notch is asked '
    + 'first too, of the parent kit\'s own carcass, never of the grown one. Every answer without a notch is unchanged',
};
