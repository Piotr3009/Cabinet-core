// ─── T78 F20 · THE FOURTH JOINT SYSTEM: LAMELLO CABINEO 8 / 12, THE ENGINE'S ─
// ─── MIRROR OF reference/lisp/SKYLON_JOINTS_CABINEO.lsp ─────────────────────
//
// The owner, 9.10.2026: *"lisp najpierw."*  CLAUDE.md T78 F19/F20: Cabineo 8
// AND 12, chosen in the company's default settings (`joints.system`
// 'cabineo8' | 'cabineo12'); the pocket milled into the FACE of the
// horizontal board at its end, cut from the OUTSIDE face of the carcass
// (*"ciecie nie od srodka korpusu tylko do zewnatrz"*), the dia 5 hole in the
// FACE of the side from the inside; the export reflected through T76's one
// reflection and labelled OUTSIDE FACE UP; the skin check between the two
// faces; the `confirmed: false` gate on the CNC export.
//
// `reference/lisp/SKYLON_JOINTS_CABINEO.lsp` was written and paren-balanced
// BEFORE this file existed, and sections A to F below mirror it routine for
// routine under the same names: `cabineo-positions` is `cabineoPositions`,
// the same arguments in the same order, the same 1e-9 slack, the same
// answers. Every Lamello number comes from
// `reference/hardware/cabineo/cabineo.json` (the page and the drawing beside
// each, OWNER TO CONFIRM), imported here once; `cabineoSheet()` restates it in
// the LISP's flat shape (section A.2) so the test can hold the three to each
// other. A value the sheet does not print is null here as it is nil there
// (the counterpart hole's depth, every article).
//
// Section Z is what the LISP leaves to the engine. The pattern is asked of the
// PARENT's own puzzle cut first (`cabineoVerdict`, the T75 F23 grammar: *"Room
// refuses first: nothing is clipped silently"*), and refused in words where
// the kit is not the five-board carcass the LISP's table is written for, where
// the carcass is cut under a slope or notched, where the profile cannot make
// a sound joint (`cabineoRefusal`), where a hole would meet a hole the kit
// already drills, or where an outside-face pocket would leave less than the
// T76 skin over an inside-face cut of the same board (`cabineoSkinFindings`).
// Accepted, it is a PLAN: `computeCabinet` strips the puzzle off the planned
// joints before its drilling pass (`cabineoStrip`), lays the pockets and the
// recesses onto the horizontal boards and marks them `machinedFace:
// 'outside'` (`cabineoPocketsOnto`), adds the sides' dia 5 holes after the
// copy loop (`cabineoDrills`), lets the FIX shelves the plan names give up
// their biscuit set and their through screws (`cabineoShelf`), counts the
// connectors and the caps as order lines (`cabineoHardwareLines`), and says
// what it is (`cabineoSummary`) with THE GATE while it is shut. A unit whose
// joint system is 'puzzle' (every unit, unless a person chose otherwise)
// never reaches a line of section Z, so every golden is byte-identical by
// construction.
//
// THE REFLECTION is NOT written here a second time: `cabineoReflectPt` calls
// `mirrorAboutVerticalAxis` of `cnc/frontOperations.js`, the helper T76's
// FRONT files are written through (`frontX = partWidth - backX`), and
// `cnc/dxf.js` reflects an 'outside' board's whole file through the same
// helper. One formula, one path.
//
// Pure: numbers in, numbers or records out. No store, no React, no three.js.

import { roundTo } from './format.js';
import { JOINTS_REFUSED, JOINT_SYSTEMS } from './dowels.js';
import { bjPlainEnds } from './biscuitJoints.js';
import { minSkinOf, skinShort } from './frontBoard.js';
import { machiningFor } from './machining.js';
import { mirrorAboutVerticalAxis } from './cnc/frontOperations.js';
import SHEET from '../../reference/hardware/cabineo/cabineo.json' with { type: 'json' };

const EPS = 1e-6;
const r4 = (v) => roundTo(v, 4);

/** THE GATE's sentence, the LISP's `cabineo-gate`, word for word. */
export const CABINEO_GATE = 'the Cabineo pattern is proposed, not confirmed by the owner';
/** The engine's warning code for the gate; Check #31 reads it beside DOWEL_GATE. */
export const CABINEO_GATE_CODE = 'CABINEO_GATE';
/** The two system ids a unit (or the company default) may name. */
export const CABINEO_SYSTEMS = Object.freeze(['cabineo8', 'cabineo12']);
/** The boards the LISP's table (sections D.2 and D.2b) touches: the five of the carcass since 15.10.2026. */
export const CABINEO_BOARDS = Object.freeze(['BUL', 'BUR', 'TOP', 'BOTTOM', 'BACK']);
/** The BACK's sentence since the morning of 15.10.2026 (*"plecy tez na cabineo"*). */
export const CABINEO_BACK = 'the BACK is on Cabineo too: pockets at the sides\' back ends (inside face) and at the TOP\'s and BOTTOM\'s (outside face), dia 5 holes in the BACK; the puzzle joint and the dia 3 rows go (the owner, 15.10.2026)';
/**
 * The boards the system leaves as the kit cuts them: NONE since 15.10.2026.
 * The BACK is not a Cabineo board (the owner's sentence of 11.10.2026 names
 * top, bottom, fixed shelf and side), but its puzzle joint goes too: *"jak
 * mamy cabineo to nie robimy dog bonsow"*; the BACK is screwed on with the
 * kit's own dia 3 rows (`screwedBack.js`, the LISP's head and section F).
 */
export const CABINEO_LEAVES = Object.freeze([]);
/** What the operations JSON and the part label print for an 'outside' board, the LISP's `cabineo-face-label`. */
export const OUTSIDE_FACE_LABEL = 'OUTSIDE FACE UP';
/** The record kinds this system writes. */
export const CABINEO_POCKET_KIND = 'cabineo_pocket';
export const CABINEO_RECESS_KIND = 'cabineo_recess';
export const CABINEO_HOLE_KIND = 'cabineo_hole';
/** The LISP's D.9 layer names (T78 proposed), the house grammar {FEATURE}_{DIAMETER}MM. */
export const CABINEO_LAYERS = Object.freeze({
  pocket: Object.freeze({ drill15: 'CABINEO_POCKET_15MM', cutter10: 'CABINEO_POCKET_10MM', cutter12: 'CABINEO_POCKET_12MM' }),
  recess: 'CABINEO_RECESS',
  hole: 'CABINEO_HOLE_5MM',
});
/**
 * The sentence for the dia 5 hole's depth, which the sheet does not print.
 * Since 15.10.2026 the depth written is X, the screw's projection (8 / 12), as
 * a dealer's technical sheet prints it (dia 5 x 8, dia 5 x 12), unless the
 * profile names `holeDepthMm`; the owner: *"nie pamietam jakie"*.
 */
export const HOLE_DEPTH_NOTE = 'depth not on the sheet; the screw reaches X beyond the board\'s end, so the hole is X deep (8 / 12, DERIVED, a dealer\'s sheet prints the same) until the owner names it (joints.cabineo.holeDepthMm)';

// ═══════════════════════════════════════════════════════════════════════════
// A. THE NUMBERS (cabineo-profile, cabineo-get, cabineo-path, cabineo-sheet,
//    cabineo-set-id, cabineo-option, cabineo-mounting, cabineo-variant,
//    cabineo-pocket-width)
// ═══════════════════════════════════════════════════════════════════════════

/** '8' | '12' off a system id, or null for anything else. */
export function cabineoVariantOf(system) {
  if (system === 'cabineo8') return '8';
  if (system === 'cabineo12') return '12';
  return null;
}

/** Is this system id one of Cabineo's two? */
export function isCabineoSystem(system) {
  return CABINEO_SYSTEMS.includes(system);
}

/**
 * cabineo-profile: `profile.joints.cabineo`, every key the LISP's assoc list
 * carries, read under the LISP's own key. The fallbacks are the LISP's
 * numbers, so a bare call answers exactly what SKYLON_JOINTS_CABINEO.lsp
 * prints. The VARIANT is the system id's (the company's choice, CLAUDE.md
 * T78 F20), '12' when none is named, as the LISP's default; the sheet's two
 * limits (max. 300 apart, min. 20 from the edge, page 1 Assembly panel 1)
 * are read off cabineo.json and never off the profile; `minSkinMm` is T76's
 * one skin number (`frontBoard.js minSkinOf`).
 */
export function cabineoProfile(profile = {}, system = null) {
  const c = profile?.joints?.cabineo || {};
  const num = (v, fallback) => (Number.isFinite(Number(v)) && v !== null && v !== '' ? Number(v) : fallback);
  const str = (v, allowed, fallback) => (allowed.includes(v) ? v : fallback);
  const asked = system || (isCabineoSystem(profile?.joints?.system) ? profile.joints.system : null);
  // The owner's own machining, 15.10.2026 (DECIDED, the LISP's head): three
  // dia 15 holes (drill15), the collar skimmed 0.5 into the laminate (flush,
  // skimMm 0.5), the side's dia 5 hole X deep unless he names a depth.
  const machining = str(c.machining, ['drill15', 'cutter10', 'cutter12'], 'drill15');
  return {
    variant: cabineoVariantOf(asked) || '12',       // company defaults joints.system cabineo8 | cabineo12 (owner: both offered)
    mounting: str(c.mounting, ['surface', 'flush', 'flushCap', 'hpl'], 'flush'),  // the owner, 15.10.2026, DECIDED
    machining,                                       // the owner, 15.10.2026, DECIDED ("cabineo 15 mm")
    skimMm: num(c.skimMm, 0.5),                      // the owner, 15.10.2026, DECIDED ("zebranie 0.5 mm laminatu"; the sheet's flush collar prints 0.8)
    holeDepthMm: num(c.holeDepthMm, null),           // null = X, the screw's projection (DERIVED); the owner names it when he remembers
    pitchMm: num(c.pitchMm, 250),                    // T78 proposed, owner to confirm
    endOffsetMm: num(c.endOffsetMm, 50),             // T78 proposed, owner to confirm
    minPerJoint: num(c.minPerJoint, 2),              // CLAUDE.md T78 F20: never fewer than two
    maxSpacingMm: num(SHEET.spacing?.maxMm, 300),    // THE SHEET's: page 1, Assembly panel 1, owner to confirm
    minFromEdgeMm: num(SHEET.spacing?.edgeMinMm, 20), // THE SHEET's: page 1, Assembly panel 1, owner to confirm
    caps: str(c.caps, ['all', 'shelves'], 'all'),    // T78 proposed
    minSkinMm: minSkinOf(profile),                   // T76's MIN_SKIN between opposing blind cuts
    confirmed: c.confirmed !== false,                // THE GATE: OPEN since 15.10.2026 (the owner: "otworz"); false shuts it
    layers: {
      pocket: { ...CABINEO_LAYERS.pocket, ...(c.layers?.pocket || {}) },
      recess: c.layers?.recess || CABINEO_LAYERS.recess,
      hole: c.layers?.hole || CABINEO_LAYERS.hole,
    },
  };
}

/** cabineo-get: one value off a profile. */
export function cabineoGet(prof, key) {
  return prof?.[key];
}

/** cabineo-path: a nested value, `cabineoPath(sheet, ['mountings', 'flushCap', 'pocketDepthMm'])`. */
export function cabineoPath(obj, keys) {
  let out = obj;
  for (const k of keys) out = out?.[k];
  return out === undefined ? null : out;
}

const orNull = (v) => (v === undefined ? null : v);

/**
 * cabineo-sheet: cabineo.json in the LISP's FLAT shape (section A.2), key for
 * key, so one test holds the JSON, the LISP and this file to each other. Every
 * group keeps its `pageOf` and `drawing`. Units mm. Owner to confirm throughout.
 */
export function cabineoSheet() {
  const J = SHEET;
  const variant = (id) => {
    const v = J.variants?.[id] || {};
    return {
      label: v.label ?? null,
      screwReachXMm: orNull(v.screwReachXMm),
      screw: v.screw ?? null,
      ...(v.insert ? { insertMm: orNull(v.insert.lengthMm) } : {}),
      minCounterpartMm: orNull(v.minPanelMm?.cornerJoint?.counterpartPanel),
      minConnectorBoardMm: orNull(v.minPanelMm?.cornerJoint?.connectorBoard),
      minCentreWallMm: orNull(v.minPanelMm?.centreWall?.centrePanel ?? v.minPanelMm?.centreWall?.centrePanelMin),
      ...(v.minPanelMm?.centreWall?.centrePanelMax != null ? { maxCentreWallMm: v.minPanelMm.centreWall.centrePanelMax } : {}),
      article: orNull(v.article),
      pageOf: 1,
      drawing: v.minPanelMm?.cornerJoint?.drawing ?? null,
    };
  };
  const mounting = (id) => {
    const m = J.mountings?.[id] || {};
    return {
      label: m.label ?? null,
      variants: [...(m.variants || [])],
      pocketDepthMm: orNull(m.pocketDepthMm),
      axisFromCollarSeatMm: orNull(m.axisFromCollarSeatMm),
      axisToFarFace: m.axisToFarFace ?? null,
      axisFromSurfaceMm: orNull(m.derived?.axisFromSurfaceMm),   // DERIVED: D - (D-5 / D-5.8 / D-7.1)
      recessDepthMm: orNull(m.collarRecessDepthMm ?? m.capRecessDepthMm),
      recessWidthMm: orNull(m.recessOutline?.widthMm),
      recessEndRadiusMm: orNull(m.recessOutline?.endRadiusMm),
      recessEndCentreFromEndMm: orNull(m.recessOutline?.endCentreFromEndMm),
      recessLengthMm: orNull(m.recessOutline?.lengthMm),
      floorMm: orNull(m.floorDimensionMm),
      pageOf: 2,
      drawing: m.drawing ?? null,
    };
  };
  const optionSet = (id, set) => {
    const o = J.machining?.[id]?.[set] || {};
    return {
      ...(o.holes != null ? { holes: o.holes } : {}),
      lobeDiaMm: orNull(o.lobeDiaMm ?? o.diaMm),
      ...(o.firstCentreFromEndMm != null ? { firstCentreFromEndMm: o.firstCentreFromEndMm, pitchMm: o.pitchMm } : {}),
      lobeCentresFromEndMm: [...(o.lobeCentresFromEndMm || o.derived?.centresFromEndMm || [])],
      ...(o.waistsFromEndMm ? { waistsFromEndMm: [...o.waistsFromEndMm], halfHeightAtWaistMm: o.halfHeightAtWaistMm } : {}),
      ...(o.channelHeightMm != null ? { channelHeightMm: o.channelHeightMm, halfHeightAtChannelMm: o.halfHeightAtChannelMm } : {}),
      ...(o.halfHeightAtEndMm != null ? { halfHeightAtEndMm: o.halfHeightAtEndMm } : {}),
      ...(o.reliefs ? { reliefs: o.reliefs.map((rl) => [rl.fromEndMm, rl.lengthMm]) } : {}),
      pageOf: 2,
      drawing: o.drawing ?? null,
    };
  };
  const option = (id) => ({
    label: J.machining?.[id]?.label ?? null,
    ...(J.machining?.[id]?.tool?.diaMm != null ? { toolDiaMm: J.machining[id].tool.diaMm } : {}),
    ...(J.machining?.[id]?.tool?.diaMinMm != null ? { toolMinDiaMm: J.machining[id].tool.diaMinMm, toolMaxDiaMm: J.machining[id].tool.diaMaxMm } : {}),
    standard: optionSet(id, 'standard'),
    hpl: optionSet(id, 'hpl'),
  });
  return {
    source: {
      file: J.source?.file ?? null, json: 'reference/hardware/cabineo/cabineo.json',
      document: J.source?.document ?? null, status: J.status ?? 'owner to confirm',
    },
    connector: {
      lengthMm: orNull(J.connector?.sizeMm?.length), widthMm: orNull(J.connector?.sizeMm?.width),
      heightMm: orNull(J.connector?.sizeMm?.height), bodyHeightMm: orNull(J.connector?.bodyHeightMm?.value),
      cutterMaxDiaMm: orNull(J.connector?.cutterMaxDiaMm?.value), pageOf: 1,
    },
    spacing: { edgeMinMm: orNull(J.spacing?.edgeMinMm), maxMm: orNull(J.spacing?.maxMm), pageOf: 1, drawing: J.spacing?.drawing ?? null },
    counterpartHole: {
      diaMm: orNull(J.counterpartHole?.diaMm),
      depthMm: orNull(J.counterpartHole?.depthMm),      // NOT ON THE SHEET
      axisFromCollarSeatMm: orNull(J.mountings?.surface?.axisFromCollarSeatMm),
      pageOf: 2, drawing: J.counterpartHole?.drawing ?? null,
    },
    variants: { 8: variant('8'), 12: variant('12'), '8M6': variant('8M6') },
    mountings: { surface: mounting('surface'), flush: mounting('flush'), flushCap: mounting('flushCap'), hpl: mounting('hpl') },
    machining: { drill15: option('drill15'), cutter10: option('cutter10'), cutter12: option('cutter12') },
    cap: { article: orNull(J.cap?.article), sizeMm: orNull(J.cap?.sizeMm), pageOf: 1 },
  };
}

/** cabineo-set-id: the machining set in use, "hpl" under the HPL mounting, else "standard". */
export function cabineoSetId(prof) {
  return cabineoGet(prof, 'mounting') === 'hpl' ? 'hpl' : 'standard';
}

/** cabineo-option: the chosen machining option's numbers (one set). */
export function cabineoOption(prof, sheet = cabineoSheet()) {
  return cabineoPath(sheet, ['machining', cabineoGet(prof, 'machining'), cabineoSetId(prof)]);
}

/** cabineo-mounting: the chosen mounting's numbers. */
export function cabineoMounting(prof, sheet = cabineoSheet()) {
  return cabineoPath(sheet, ['mountings', cabineoGet(prof, 'mounting')]);
}

/** cabineo-variant: the chosen variant's numbers. */
export function cabineoVariant(prof, sheet = cabineoSheet()) {
  return cabineoPath(sheet, ['variants', cabineoGet(prof, 'variant')]);
}

/**
 * cabineo-pocket-width: the widest outline a pocket draws ACROSS the axis,
 * the recess where the mounting has one (18.8 / 16.7), else the lobe
 * diameter (15 / 15.2). Two pockets closer than this would meet.
 */
export function cabineoPocketWidth(prof, sheet = cabineoSheet()) {
  const m = cabineoMounting(prof, sheet);
  const o = cabineoOption(prof, sheet);
  return m?.recessWidthMm != null ? m.recessWidthMm : (o?.lobeDiaMm ?? 15);
}

// ═══════════════════════════════════════════════════════════════════════════
// B. THE SET-OUT RULE (cabineo-ceil, cabineo-positions, cabineo-too-close)
// ═══════════════════════════════════════════════════════════════════════════

/** cabineo-ceil: ceil for x >= 0, with the 1e-9 slack (`fix` truncates). */
export function cabineoCeil(x) {
  const n = Math.trunc(x);
  return x - n > 1e-9 ? n + 1 : n;
}

/**
 * cabineo-positions: the offsets along a joint of length L, from its
 * reference end: THE SAME RULE AS THE DOWELS of T78 F19, bounded by the sheet
 * (the LISP, section B, step for step):
 *   1. L <= 0: none.
 *   2. The two END pockets at e and L - e; the span S = L - 2e.
 *   3. S < wide (the two end pockets would MEET): ONE pocket on the centre,
 *      L / 2. The only case under the minimum of two (L < 2e + wide).
 *   4. The COUNT n = max(nMin, 1 + ceil(S / p)).
 *   5. The SPACING: n - 1 EQUAL gaps of S / (n - 1), the last offset written
 *      as L - e so no floating remainder reaches the far end.
 * g <= p <= 300 and e >= 20 are held by `cabineoRefusal` before any pattern
 * is used. Same five arguments as the LISP, in its order.
 */
export function cabineoPositions(L, e, p, nMin, wide) {
  L = Number(L); e = Number(e); p = Number(p); wide = Number(wide);
  if (L <= 0) return [];
  if (L - e - e < wide) return [L / 2];
  const S = L - e - e;
  const n = Math.trunc(Math.max(nMin, 1 + cabineoCeil(S / p)));
  const g = S / (n - 1);
  const out = [];
  for (let i = 0; i < n - 1; i += 1) out.push(e + i * g);
  out.push(L - e);
  return out;
}

/** cabineo-too-close: do two neighbouring pockets stand closer than the pocket's width? */
export function cabineoTooClose(offs, wide) {
  let prev = null;
  let hit = false;
  for (const o of offs) {
    if (prev !== null && o - prev < wide) hit = true;
    prev = o;
  }
  return hit;
}

// ═══════════════════════════════════════════════════════════════════════════
// C. THE INVERTED SIDE: WHICH FACE, AND THE ONE REFLECTION
//    (cabineo-machined-face, cabineo-face-label, cabineo-reflect-x,
//    cabineo-reflect-pt, cabineo-axis-from-outside, cabineo-skin-left,
//    cabineo-skin-clash, cabineo-footprint-clash)
// ═══════════════════════════════════════════════════════════════════════════
//
// THE OWNER, 11.10.2026 (DECIDED): the pocket is cut from the OUTSIDE face of
// the carcass board (the top from above, the bottom from below, a fixed shelf
// from its underside, with the cap); the dia 5 hole from the side's inside
// face. The frames are the ones each board is drawn and placed in
// (engine/joinery.js panelPlacement): BUL x from the FRONT, BUR x from the
// BACK, y up; TOP and BOTTOM drawn ROT90 from the inside, x the depth from
// the BACK (0) to the front (D - G), y the width from the BUL end (0) to the
// BUR end (W - 2G); a SHELF x from its FRONT (0) to the back (D - G -
// setback), y from the BUL end to the BUR end. The ends of a horizontal
// board, where its pockets open, are y = 0 and y = its width.

/** cabineo-machined-face: "outside" for TOP, BOTTOM and SHELF-n, "inside" for a side. */
export function cabineoMachinedFace(board) {
  return /^(TOP|BOTTOM|SHELF)/.test(String(board)) ? 'outside' : 'inside';
}

/** cabineo-face-label: what the operations JSON and the part label print for an "outside" board. */
export function cabineoFaceLabel(board) {
  return cabineoMachinedFace(board) === 'outside' ? OUTSIDE_FACE_LABEL : '';
}

/** cabineo-reflect-x: T76's one reflection, x' = W - x, through the one helper. */
export function cabineoReflectX(x, W) {
  return mirrorAboutVerticalAxis(W)([Number(x), 0])[0];
}

/** cabineo-reflect-pt: [x, y] -> [W - x, y], through the one helper. */
export function cabineoReflectPt(pt, W) {
  return mirrorAboutVerticalAxis(W)([Number(pt[0]), Number(pt[1])]);
}

/** Is this the owner's skimmed flush collar (mounting 'flush' with a named `skimMm`)? */
const skimmedFlush = (prof) => cabineoGet(prof, 'mounting') === 'flush' && Number.isFinite(Number(cabineoGet(prof, 'skimMm')))
  && cabineoGet(prof, 'skimMm') !== null;

/**
 * cabineo-recess-depth: what the job really cuts. Under 'flush' the owner's
 * skim (0.5, 15.10.2026) when he names one, else the sheet's; under every
 * other mounting the sheet's (the cap needs its full 2.1; the surface bands
 * have none). Null where the mounting draws no recess.
 */
export function cabineoRecessDepth(prof, sheet = cabineoSheet()) {
  const m = cabineoMounting(prof, sheet);
  if (!m) return null;
  if (skimmedFlush(prof)) return Number(cabineoGet(prof, 'skimMm'));
  return m.recessDepthMm ?? null;
}

/**
 * cabineo-axis-from-outside: the screw axis below the pocket face, by
 * mounting: 5 / 5.8 / 7.1 / 5 off the sheet; under 'flush' with the owner's
 * skim it is 5 (from the collar seat, page 2) + the skim = 5.5 (DERIVED, the
 * sheet's own arithmetic for its 5.8 = 5 + 0.8).
 */
export function cabineoAxisFromOutside(prof, sheet = cabineoSheet()) {
  const m = cabineoMounting(prof, sheet);
  if (!m) return null;
  if (skimmedFlush(prof)) return r4(Number(m.axisFromCollarSeatMm) + Number(cabineoGet(prof, 'skimMm')));
  return m.axisFromSurfaceMm ?? null;
}

/** cabineo-skin-left: what is left between a pocket (outside) and an opposing blind cut (inside). */
export function cabineoSkinLeft(boardT, pocketDepth, otherDepth) {
  return Number(boardT) - Number(pocketDepth) - Number(otherDepth);
}

/**
 * cabineo-skin-clash: T76's one skin rule (`frontBoard.js skinShort`) asked
 * of the two cuts together: a clash when the board minus both depths is under
 * the profile's skin.
 */
export function cabineoSkinClash(boardT, pocketDepth, otherDepth, profile) {
  return skinShort(Number(boardT), Number(pocketDepth) + Number(otherDepth), profile);
}

/** cabineo-footprint-clash: two cuts on the SAME face whose boxes [x1, y1, x2, y2] overlap. */
export function cabineoFootprintClash(a, b) {
  return Math.min(a[0], a[2]) < Math.max(b[0], b[2]) - EPS && Math.max(a[0], a[2]) > Math.min(b[0], b[2]) + EPS
    && Math.min(a[1], a[3]) < Math.max(b[1], b[3]) - EPS && Math.max(a[1], a[3]) > Math.min(b[1], b[3]) + EPS;
}

// ═══════════════════════════════════════════════════════════════════════════
// D. PER BOARD: THE POCKET, THE HOLE, THE RECESS (cabineo-joint, cabineo-jget,
//    cabineo-joint-table, cabineo-pockets, cabineo-board-pt, cabineo-export-pt,
//    cabineo-lobe-centres, cabineo-lobe-radius, cabineo-outline-key-points,
//    cabineo-outline-box, cabineo-outline-arcs, cabineo-recess,
//    cabineo-recess-box, cabineo-side-holes, cabineo-joint-cuts, the layers)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * cabineo-joint: one joint, every field the LISP names, in its order. A
 * horizontal board's END on a side's FACE: the board carries the pocket, the
 * side the hole. `boardW` is the board's DRAWN WIDTH, the W of the reflection.
 */
export function cabineoJoint(
  name, len, ref,
  side, sFrom, sDir, sOut, sIn,
  board, eNm, eAt, bFrom, bDir, bW, bT,
) {
  return {
    name, len: Number(len), ref,
    side, sideFrom: Number(sFrom), sideDir: Number(sDir), sideOut: Number(sOut), sideIn: Number(sIn),
    board, endName: eNm, endAt: Number(eAt), boardFrom: Number(bFrom), boardDir: Number(bDir),
    boardW: Number(bW), boardT: Number(bT),
  };
}

/** cabineo-jget: one field off a joint. */
export function cabineoJget(jt, key) {
  return jt?.[key];
}

/**
 * cabineo-joint-table: side to TOP, side to BOTTOM, side to every FIX shelf.
 * NOT the back. fixShelves: [[row, shelfT, setback], ...], row the shelf's
 * UNDERSIDE from the floor, setback its front behind the carcass front.
 */
export function cabineoJointTable(W, D, H, G, fixShelves = []) {
  W = Number(W); D = Number(D); H = Number(H); G = Number(G);
  const sideW = D - G;
  const topW = W - G - G;
  const out = [
    cabineoJoint('BUL-TOP', sideW, 'FRONT', 'BUL', 0.0, 1.0, H, -1.0, 'TOP', 'Y0', 0.0, sideW, -1.0, sideW, G),
    cabineoJoint('BUR-TOP', sideW, 'FRONT', 'BUR', sideW, -1.0, H, -1.0, 'TOP', 'YH', topW, sideW, -1.0, sideW, G),
    cabineoJoint('BUL-BOTTOM', sideW, 'FRONT', 'BUL', 0.0, 1.0, 0.0, 1.0, 'BOTTOM', 'Y0', 0.0, sideW, -1.0, sideW, G),
    cabineoJoint('BUR-BOTTOM', sideW, 'FRONT', 'BUR', sideW, -1.0, 0.0, 1.0, 'BOTTOM', 'YH', topW, sideW, -1.0, sideW, G),
  ];
  let k = 1;
  for (const sh of fixShelves) {
    const row = Number(sh[0]);
    const st = Number(sh[1]);
    const sb = Number(sh[2]);
    const depthS = D - G - sb;
    out.push(
      cabineoJoint(`BUL-SHELF-${k}`, depthS, 'FRONT', 'BUL', sb, 1.0, row, 1.0, `SHELF-${k}`, 'Y0', 0.0, 0.0, 1.0, depthS, st),
      cabineoJoint(`BUR-SHELF-${k}`, depthS, 'FRONT', 'BUR', sideW - sb, -1.0, row, 1.0, `SHELF-${k}`, 'YH', topW, 0.0, 1.0, depthS, st),
    );
    k += 1;
  }
  return out;
}

/**
 * cabineo-back-joint (D.2b, the owner 15.10.2026: *"plecy tez na cabineo"*):
 * one of the BACK's four joints. The BACK is the counterpart (holes in its
 * inside face at (hx0 + hdx off, hy0 + hdy off), the axis distance already in
 * hx0 / hy0); the pocket board's channel runs ALONG ITS X from `endAt` in
 * `dirIn`, at y = acrossFrom + acrossDir off; `face` is the face the pocket
 * is cut from: 'inside' for a side, 'outside' for the TOP and BOTTOM.
 */
export function cabineoBackJoint(name, len, ref, hx0, hy0, hdx, hdy, board, face, endAt, dirIn, aFrom, aDir, bW, bT) {
  return {
    name, len: Number(len), ref, kind: 'back',
    side: 'BACK', hx0: Number(hx0), hy0: Number(hy0), hdx: Number(hdx), hdy: Number(hdy),
    board, face, endAt: Number(endAt), dirIn: Number(dirIn), acrossFrom: Number(aFrom), acrossDir: Number(aDir),
    boardW: Number(bW), boardT: Number(bT),
  };
}

/**
 * cabineo-back-table: the four back joints. `ax` is the screw axis below the
 * pocket face (`cabineoAxisFromOutside`), `sideLen` the sides' joint length
 * (H, or less under a wall unit's hanger). BUL's pocket face is its inside
 * face at x = G of the BACK, the axis ax toward the outer face: the hole at
 * G - ax; BUR's at W - G + ax; the TOP's pocket face is its top face: the
 * hole at y = H - ax; the BOTTOM's at y = ax.
 */
export function cabineoBackTable(W, D, H, G, ax, sideLen = H) {
  W = Number(W); D = Number(D); H = Number(H); G = Number(G); ax = Number(ax);
  const sideW = D - G;
  const topW = W - G - G;
  return [
    cabineoBackJoint('BUL-BACK', sideLen, 'BOTTOM', G - ax, 0.0, 0.0, 1.0, 'BUL', 'inside', sideW, -1.0, 0.0, 1.0, sideW, G),
    cabineoBackJoint('BUR-BACK', sideLen, 'BOTTOM', W - G + ax, 0.0, 0.0, 1.0, 'BUR', 'inside', 0.0, 1.0, 0.0, 1.0, sideW, G),
    cabineoBackJoint('TOP-BACK', topW, 'LEFT', G, H - ax, 1.0, 0.0, 'TOP', 'outside', 0.0, 1.0, 0.0, 1.0, sideW, G),
    cabineoBackJoint('BOTTOM-BACK', topW, 'LEFT', G, ax, 1.0, 0.0, 'BOTTOM', 'outside', 0.0, 1.0, 0.0, 1.0, sideW, G),
  ];
}

/** Is this joint one of the BACK's (D.2b)? */
export function isBackJoint(jt) {
  return jt?.kind === 'back';
}

/**
 * cabineo-pockets: one record per offset, on the horizontal board, in ITS OWN
 * (inside) frame. The LISP's list (board x yEnd dirIn W T joint off) is an
 * object here under those names: `x` the screw axis along the depth, `yEnd`
 * the end the channel opens from, `dirIn` +1 (into +y, the BUL end) or -1.
 * A BACK joint's pocket (cabineo-back-pockets) runs along x instead: `along:
 * 'x'`, `xEnd` the end, `y` the across coordinate, and the face it is cut from.
 */
export function cabineoPockets(jt, offs) {
  if (isBackJoint(jt)) {
    return offs.map((off) => ({
      board: jt.board, along: 'x', xEnd: jt.endAt, dirIn: jt.dirIn,
      y: jt.acrossFrom + jt.acrossDir * off, W: jt.boardW, T: jt.boardT, joint: jt.name, off, face: jt.face,
    }));
  }
  const dirIn = cabineoJget(jt, 'endName') === 'Y0' ? 1.0 : -1.0;
  return offs.map((off) => ({
    board: cabineoJget(jt, 'board'),
    x: cabineoJget(jt, 'boardFrom') + cabineoJget(jt, 'boardDir') * off,
    yEnd: cabineoJget(jt, 'endAt'),
    dirIn,
    W: cabineoJget(jt, 'boardW'),
    T: cabineoJget(jt, 'boardT'),
    joint: cabineoJget(jt, 'name'),
    off,
  }));
}

/** cabineo-board-pt: a sheet-frame point (s, t) of one pocket in the board's own frame (cabineo-back-board-pt for an x-channel). */
export function cabineoBoardPt(pk, s, t) {
  if (pk.along === 'x') return [pk.xEnd + pk.dirIn * Number(s), pk.y + Number(t)];
  return [pk.x + Number(t), pk.yEnd + pk.dirIn * Number(s)];
}

/** cabineo-export-pt: the same point in the EXPORT frame of an "outside" board: reflected. */
export function cabineoExportPt(pk, s, t) {
  return cabineoReflectPt(cabineoBoardPt(pk, s, t), pk.W);
}

/** cabineo-lobe-centres: the three (s) centres by option: 3.6 / 14.8 / 26 (standard), 3.5 / 14.7 / 25.9 (hpl). */
export function cabineoLobeCentres(opt) {
  return [...(opt?.lobeCentresFromEndMm || [])];
}

/** cabineo-lobe-radius: half the lobe diameter. */
export function cabineoLobeRadius(opt) {
  return Number(opt?.lobeDiaMm) / 2;
}

/**
 * cabineo-outline-key-points: the outline's key points in the sheet frame, in
 * order round the pocket from the end's upper corner to the end's lower corner
 * (the end itself, s = 0, is open). drill15: null (three circles).
 */
export function cabineoOutlineKeyPoints(opt, machining) {
  const c = cabineoLobeCentres(opt);
  const [c1, c2, c3] = c;
  const r = cabineoLobeRadius(opt);
  const far = c3 + r;
  const he = Number(opt?.halfHeightAtEndMm);
  if (machining === 'drill15') return null;
  if (machining === 'cutter10') {
    const [w1, w2] = opt.waistsFromEndMm;
    const hw = Number(opt.halfHeightAtWaistMm);
    return [[0, he], [c1, r], [w1, hw], [c2, r], [w2, hw], [c3, r], [far, 0],
      [c3, -r], [w2, -hw], [c2, -r], [w1, -hw], [c1, -r], [0, -he]];
  }
  if (machining === 'cutter12') {
    const hc = Number(opt.halfHeightAtChannelMm);
    const [[r1s, l1], [r2s, l2]] = opt.reliefs;
    const r1e = r1s + l1;
    const r2e = r2s + l2;
    return [[0, he], [c1, r], [r1s, hc], [r1e, hc], [c2, r], [r2s, hc], [r2e, hc], [c3, r], [far, 0],
      [c3, -r], [r2e, -hc], [r2s, -hc], [c2, -r], [r1e, -hc], [r1s, -hc], [c1, -r], [0, -he]];
  }
  return null;
}

/** cabineo-outline-box: the pocket's bounding box in the sheet frame: [0, -r, far, r]. */
export function cabineoOutlineBox(opt) {
  const c3 = cabineoLobeCentres(opt)[2];
  const r = cabineoLobeRadius(opt);
  return [0, -r, c3 + r, r];
}

/**
 * cabineo-outline-arcs: the arcs and lines of the milled outline (cutter10 /
 * cutter12) in the sheet frame. Each arc is [centre, start, mid, end], each a
 * point [s, t]; mid is a point the arc passes through, so the direction is
 * decided by three points in whatever frame the arc lands in. Lines are
 * [start, end]. Returns { arcs, lines }.
 */
export function cabineoOutlineArcs(opt, machining) {
  const [c1, c2, c3] = cabineoLobeCentres(opt);
  const r = cabineoLobeRadius(opt);
  const far = c3 + r;
  const he = Number(opt?.halfHeightAtEndMm);
  let a = null;
  let b = null;
  let hc = null;
  if (machining === 'cutter10') {
    const [w1, w2] = opt.waistsFromEndMm;
    a = [w1, w1]; b = [w2, w2]; hc = Number(opt.halfHeightAtWaistMm);
  } else if (machining === 'cutter12') {
    const [[r1s, l1], [r2s, l2]] = opt.reliefs;
    a = [r1s, r1s + l1]; b = [r2s, r2s + l2]; hc = Number(opt.halfHeightAtChannelMm);
  }
  if (!a) return { arcs: [], lines: [] };
  const arcs = [
    [[c1, 0], [0, he], [c1, r], [a[0], hc]],
    [[c1, 0], [0, -he], [c1, -r], [a[0], -hc]],
    [[c2, 0], [a[1], hc], [c2, r], [b[0], hc]],
    [[c2, 0], [a[1], -hc], [c2, -r], [b[0], -hc]],
    [[c3, 0], [b[1], hc], [far, 0], [b[1], -hc]],
  ];
  const lines = a[1] - a[0] > 1e-9 ? [
    [[a[0], hc], [a[1], hc]], [[a[0], -hc], [a[1], -hc]],
    [[b[0], hc], [b[1], hc]], [[b[0], -hc], [b[1], -hc]],
  ] : [];
  return { arcs, lines };
}

/**
 * cabineo-recess: the collar's (flush) or the cap's (flushCap) recess in the
 * sheet frame, [width, length, endRadius, endCentre, depth], or null where the
 * mounting draws none. Under flush the sheet prints the width and the depth
 * only: length, radius and centre are null and no recess outline is drawn.
 */
export function cabineoRecess(prof, sheet = cabineoSheet()) {
  const m = cabineoMounting(prof, sheet);
  const d = cabineoRecessDepth(prof, sheet);
  if (d == null) return null;
  if (m.recessLengthMm != null) return [m.recessWidthMm, m.recessLengthMm, m.recessEndRadiusMm, m.recessEndCentreFromEndMm, d];
  // Under flush the sheet prints the width only; its own reading of Options 1
  // to 3 is "the collar recess around the three lobes with a rounded end
  // concentric with the third lobe" (cabineo.json recessOutline.reading), so
  // the rest is DERIVED from that sentence: end radius = half the width, end
  // centre = the third lobe's centre, length = the two added. THE SKIM LAYER
  // (the owner's second of three, 15.10.2026); before, this drew no outline.
  if (m.recessWidthMm != null) {
    const w = Number(m.recessWidthMm);
    const c3 = cabineoLobeCentres(cabineoOption(prof, sheet))[2];
    if (c3 == null) return [w, null, null, null, d];
    return [w, r4(c3 + w / 2), r4(w / 2), c3, d];
  }
  return [null, null, null, null, d];
}

/** cabineo-recess-box: [0, -w/2, length, w/2], or null when the length is not on the sheet. */
export function cabineoRecessBox(rc) {
  if (!rc || rc[1] == null) return null;
  return [0, -rc[0] / 2, rc[1], rc[0] / 2];
}

/**
 * cabineo-side-holes: dia 5, in the side's FACE (inside), on the joint line at
 * the screw axis: y = sideOut + sideIn * axisFromOutside. Depth: NOT ON THE
 * SHEET (null). Returns [{ side, x, y, dia, depth, joint, off }].
 */
/**
 * cabineo-hole-depth: the side's dia 5 hole depth. The profile's `holeDepthMm`
 * when the owner names one; else the sheet's (it prints none); else X, the
 * screw's projection (8 / 12), which is what a dealer's technical sheet
 * prints ("drill hole dia 5 x 12" for Cabineo 12, "dia 5 x 8" for Cabineo 8).
 * DERIVED; the owner, 15.10.2026: *"nie pamietam jakie"*.
 */
export function cabineoHoleDepth(prof, sheet = cabineoSheet()) {
  const named = cabineoGet(prof, 'holeDepthMm');
  if (Number.isFinite(Number(named)) && named !== null && named !== '') return Number(named);
  const printed = cabineoPath(sheet, ['counterpartHole', 'depthMm']);
  if (printed != null) return printed;
  return cabineoVariant(prof, sheet)?.screwReachXMm ?? null;
}

export function cabineoSideHoles(jt, offs, prof, sheet = cabineoSheet()) {
  const dia = cabineoPath(sheet, ['counterpartHole', 'diaMm']);
  const depth = cabineoHoleDepth(prof, sheet);
  if (isBackJoint(jt)) {
    // cabineo-back-holes: in the BACK's inside face, the axis distance already in hx0 / hy0.
    return offs.map((off) => ({
      side: 'BACK', x: jt.hx0 + jt.hdx * off, y: jt.hy0 + jt.hdy * off, dia, depth, joint: jt.name, off,
    }));
  }
  const ax = cabineoAxisFromOutside(prof, sheet);
  const y = cabineoJget(jt, 'sideOut') + cabineoJget(jt, 'sideIn') * ax;
  return offs.map((off) => ({
    side: cabineoJget(jt, 'side'),
    x: cabineoJget(jt, 'sideFrom') + cabineoJget(jt, 'sideDir') * off,
    y,
    dia,
    depth,
    joint: cabineoJget(jt, 'name'),
    off,
  }));
}

/** cabineo-joint-cuts: one joint, whole: { offs, pockets, holes }. */
export function cabineoJointCuts(jt, prof, sheet = cabineoSheet()) {
  const offs = cabineoPositions(
    cabineoJget(jt, 'len'),
    cabineoGet(prof, 'endOffsetMm'),
    cabineoGet(prof, 'pitchMm'),
    cabineoGet(prof, 'minPerJoint'),
    cabineoPocketWidth(prof, sheet),
  );
  return { offs, pockets: cabineoPockets(jt, offs), holes: cabineoSideHoles(jt, offs, prof, sheet) };
}

/** cabineo-pocket-layer: by the tool that cuts it. */
export function cabineoPocketLayer(prof) {
  return prof?.layers?.pocket?.[cabineoGet(prof, 'machining')] || CABINEO_LAYERS.pocket.cutter12;
}
/** cabineo-recess-layer. */
export function cabineoRecessLayer(prof) {
  return prof?.layers?.recess || CABINEO_LAYERS.recess;
}
/** cabineo-hole-layer. */
export function cabineoHoleLayer(prof) {
  return prof?.layers?.hole || CABINEO_LAYERS.hole;
}

// ─── D, the engine's own: the outline as a closed polygon ──────────────────
//
// The LISP draws the milled outline as true arcs and lines (CABINEO_DRAW,
// cab-arc3). A pocket on a panel's CNC record is a closed polyline (every
// pocket this app has written since turn 3; `cnc/dxf.js pocketPoints` reads
// `pts` since turn 34), so the engine walks the SAME arcs (`cabineoOutlineArcs`)
// and samples each on its true circle every `stepDeg`, the printed key points
// kept exactly as the arcs' ends. The polygon is closed along the board's end
// (s = 0), where the channel runs out of the board: the pocket boundary and
// the stock edge coincide there, which is what an open-ended pocket IS to a
// CAM program.

/**
 * Points along an arc about `centre` from `start` through `mid` to `end`,
 * the three given points kept EXACTLY (the printed key points are the arcs'
 * ends and apexes), the interior sampled on the circle of `radius` (the
 * lobe's own; the end corner's printed 6.6 is the sheet's rounding of 6.58
 * and is not let decide the radius) every `stepDeg` or less.
 */
export function cabineoArcPoints(centre, start, mid, end, stepDeg = 15, radius = null) {
  const [cx, cy] = centre;
  const r = radius != null ? Number(radius) : Math.hypot(start[0] - cx, start[1] - cy);
  const ang = (p) => Math.atan2(p[1] - cy, p[0] - cx);
  const two = Math.PI * 2;
  const a1 = ang(start);
  const am = ang(mid);
  const a2 = ang(end);
  let sweep = a2 - a1;
  if (sweep < 0) sweep += two;
  let sweepM = am - a1;
  if (sweepM < 0) sweepM += two;
  const ccwDir = sweepM <= sweep;
  const step = stepDeg * Math.PI / 180;
  const between = (from, to) => {
    let d = ccwDir ? to - from : from - to;
    while (d < 0) d += two;
    while (d >= two) d -= two;
    const n = Math.max(1, Math.ceil(d / step));
    const pts = [];
    for (let i = 1; i < n; i += 1) {
      const t = from + (ccwDir ? 1 : -1) * (d * i) / n;
      pts.push([r4(cx + r * Math.cos(t)), r4(cy + r * Math.sin(t))]);
    }
    return pts;
  };
  return [start.map(Number), ...between(a1, am), mid.map(Number), ...between(am, a2), end.map(Number)];
}

/**
 * The pocket's closed outline in the sheet frame, [s, t] points, clockwise in
 * that frame (s right, t up): from (0, he) over the lobes to the far end and
 * back under them to (0, -he); the closing run along s = 0 is implied by the
 * closed flag. drill15: null.
 */
export function cabineoOutlinePolygon(opt, machining, stepDeg = 15) {
  const { arcs, lines } = cabineoOutlineArcs(opt, machining);
  if (!arcs.length) return null;
  const [l1u, l1l, l2u, l2l, l3] = arcs;
  const r = cabineoLobeRadius(opt);
  const pts = [];
  const add = (list) => {
    for (const p of list) {
      const last = pts[pts.length - 1];
      if (!last || Math.hypot(last[0] - p[0], last[1] - p[1]) > 1e-9) pts.push(p);
    }
  };
  add(cabineoArcPoints(l1u[0], l1u[1], l1u[2], l1u[3], stepDeg, r));   // lobe 1, upper: end corner to the first straight
  if (lines.length) add([lines[0][1]]);                               // the first straight (cutter12)
  add(cabineoArcPoints(l2u[0], l2u[1], l2u[2], l2u[3], stepDeg, r));   // lobe 2, upper
  if (lines.length) add([lines[2][1]]);                               // the second straight
  // lobe 3, round the far end, through its two apexes (c3, +r) and (c3, -r) and the far end (c3 + r, 0), each exact
  add(cabineoArcPoints(l3[0], l3[1], [l3[0][0], r], l3[2], stepDeg, r));
  add(cabineoArcPoints(l3[0], l3[2], [l3[0][0], -r], l3[3], stepDeg, r));
  if (lines.length) add([lines[3][0]]);                               // the second straight, lower, backwards
  add([...cabineoArcPoints(l2l[0], l2l[1], l2l[2], l2l[3], stepDeg, r)].reverse());  // lobe 2, lower, backwards
  if (lines.length) add([lines[1][0]]);                               // the first straight, lower, backwards
  add([...cabineoArcPoints(l1l[0], l1l[1], l1l[2], l1l[3], stepDeg, r)].reverse());  // lobe 1, lower, back to the end
  return pts;
}

/** The recess's closed outline in the sheet frame (flushCap), or null where its length is not on the sheet. */
export function cabineoRecessPolygon(rc, stepDeg = 15) {
  if (!rc || rc[1] == null || rc[2] == null || rc[3] == null) return null;
  const [w, , rr, ec] = rc;
  const half = w / 2;
  const far = ec + rr;
  return [[0, half], ...cabineoArcPoints([ec, 0], [ec, half], [far, 0], [ec, -half], stepDeg, rr), [0, -half]];
}

/** The signed area of a polygon: positive counter-clockwise. */
function signedArea(pts) {
  let a = 0;
  for (let i = 0; i < pts.length; i += 1) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
}

/** The polygon running counter-clockwise (T76: a CCW back-view contour is a CW pocket in the reflected file). */
function ccw(pts) {
  return signedArea(pts) < 0 ? [...pts].reverse() : pts;
}

const boxOf = (pts) => {
  let x1 = Infinity; let y1 = Infinity; let x2 = -Infinity; let y2 = -Infinity;
  for (const [x, y] of pts) {
    if (x < x1) x1 = x; if (y < y1) y1 = y; if (x > x2) x2 = x; if (y > y2) y2 = y;
  }
  return [r4(x1), r4(y1), r4(x2), r4(y2)];
};

/**
 * One pocket of one joint as the records a panel's CNC carries, in the
 * board's OWN frame, and the same reflected (`export`) for the operations
 * JSON and the test. Under cutter10 / cutter12 a `pocket` polygon on the
 * pocket layer and, where the mounting has one with a length, a `recess`
 * polygon on CABINEO_RECESS; under drill15 three `holes` of the lobe
 * diameter (a drilling, which is what Option 1 is), no polygon. Every record
 * says `face: 'outside'` and its depth from that face.
 */
export function cabineoPocketGeometry(pk, prof, sheet = cabineoSheet()) {
  const opt = cabineoOption(prof, sheet);
  const mch = cabineoGet(prof, 'machining');
  const m = cabineoMounting(prof, sheet);
  const depth = m?.pocketDepthMm ?? null;
  const own = (p) => cabineoBoardPt(pk, p[0], p[1]).map(r4);
  const exp = (p) => cabineoExportPt(pk, p[0], p[1]).map(r4);
  const lobes = cabineoLobeCentres(opt).map((s) => [s, 0]);
  // The face the pocket is cut from: 'outside' (the TOP, the BOTTOM, a shelf,
  // the LISP's section C) or 'inside' (a side's back pocket, D.2b). An
  // 'inside' board is never reflected, so its export frame is its own.
  const face = pk.face || 'outside';
  const expOf = face === 'outside' ? exp : own;
  const end = pk.along === 'x' ? (pk.dirIn > 0 ? 'X0' : 'XW') : (pk.dirIn > 0 ? 'Y0' : 'YH');
  const meta = {
    joint: pk.joint, offset: r4(pk.off), end, board: pk.board, face,
    axis: own([0, 0]), lobes: lobes.map(own),
    export: { axis: expOf([0, 0]), lobes: lobes.map(expOf), W: pk.W },
  };
  const out = { pocket: null, recess: null, holes: [] };
  if (mch === 'drill15') {
    for (const [i, s] of cabineoLobeCentres(opt).entries()) {
      const [x, y] = own([s, 0]);
      out.holes.push({
        panel: pk.board, kind: CABINEO_POCKET_KIND, layer: cabineoPocketLayer(prof), x, y, d: opt.lobeDiaMm,
        ...(depth != null ? { depth } : {}), face,
        meta: { ...meta, lobe: i + 1, export: { ...meta.export, at: expOf([s, 0]) } },
      });
    }
  } else {
    const poly = cabineoOutlinePolygon(opt, mch);
    if (poly) {
      const pts = ccw(poly.map(own));
      const ept = poly.map(expOf);
      const [x1, y1, x2, y2] = boxOf(pts);
      out.pocket = {
        layer: cabineoPocketLayer(prof), kind: CABINEO_POCKET_KIND, face,
        ...(depth != null ? { depth } : {}), x1, y1, x2, y2, pts,
        meta: { ...meta, export: { ...meta.export, pts: face === 'outside' ? ccw(ept).reverse() : ccw(ept), box: boxOf(ept) } },
      };
    }
  }
  const rc = cabineoRecess(prof, sheet);
  const rpoly = cabineoRecessPolygon(rc);
  if (rpoly) {
    const pts = ccw(rpoly.map(own));
    const ept = rpoly.map(expOf);
    const [x1, y1, x2, y2] = boxOf(pts);
    out.recess = {
      layer: cabineoRecessLayer(prof), kind: CABINEO_RECESS_KIND, face, depth: rc[4], x1, y1, x2, y2, pts,
      meta: {
        joint: pk.joint, offset: r4(pk.off), end: meta.end, board: pk.board, face, widthMm: rc[0], lengthMm: rc[1],
        endRadiusMm: rc[2], endCentreFromEndMm: rc[3], export: { pts: face === 'outside' ? ccw(ept).reverse() : ccw(ept), box: boxOf(ept), W: pk.W },
      },
    };
  } else if (rc) {
    out.recessNote = `recess ${rc[0]} wide, ${rc[4]} deep; its length is not on the sheet, so no outline is drawn`;
  }
  return out;
}

// ═══════════════════════════════════════════════════════════════════════════
// E. THE GATE AND THE REFUSALS (cabineo-gate, cabineo-refusal)
// ═══════════════════════════════════════════════════════════════════════════

/** cabineo-gate: null when the owner has confirmed the pattern, else the sentence. */
export function cabineoGate(prof) {
  return cabineoGet(prof, 'confirmed') ? null : CABINEO_GATE;
}

const rtos2 = (v) => Number(v).toFixed(2);

/**
 * cabineo-refusal: a profile that cannot make a sound joint, in words, before
 * any pattern is used. `sideT` and `boardT` are the thinnest side and the
 * thinnest horizontal board the job uses. [] when there is nothing to say.
 */
export function cabineoRefusal(prof, sheet, sideT, boardT) {
  const v = cabineoVariant(prof, sheet);
  const m = cabineoMounting(prof, sheet);
  const o = cabineoOption(prof, sheet);
  const p = cabineoGet(prof, 'pitchMm');
  const e = cabineoGet(prof, 'endOffsetMm');
  const nMin = cabineoGet(prof, 'minPerJoint');
  const ms = cabineoGet(prof, 'minSkinMm');
  const variant = cabineoGet(prof, 'variant');
  sideT = Number(sideT); boardT = Number(boardT);
  const out = [];
  if (!v) out.push(`the Cabineo variant '${variant}' is not on the sheet (8, 12, 8M6)`);
  if (v && !['8', '12'].includes(String(variant))) out.push(`Cabineo ${variant} is not a company default: the owner chose 8 and 12`);
  if (!m) out.push(`the mounting '${cabineoGet(prof, 'mounting')}' is not on the sheet (surface, flush, flushCap, hpl)`);
  if (m && v && !m.variants.includes(String(variant))) {
    out.push(`the sheet captions the mounting '${cabineoGet(prof, 'mounting')}' for other variants than Cabineo ${variant}`);
  }
  if (!o || o.lobeDiaMm == null) out.push(`the machining option '${cabineoGet(prof, 'machining')}' is not on the sheet (drill15, cutter10, cutter12)`);
  if (p <= 0) out.push(`the pitch ${rtos2(p)} is not a positive length`);
  if (p > cabineoGet(prof, 'maxSpacingMm')) {
    out.push(`the pitch ${rtos2(p)} is over the sheet's max. ${rtos2(cabineoGet(prof, 'maxSpacingMm'))} between connectors (page 1, Assembly panel 1)`);
  }
  if (e < cabineoGet(prof, 'minFromEdgeMm')) {
    out.push(`the end offset ${rtos2(e)} is under the sheet's min. ${rtos2(cabineoGet(prof, 'minFromEdgeMm'))} from the board's edge (page 1, Assembly panel 1)`);
  }
  if (nMin < 2) out.push(`fewer than two pockets per joint: CLAUDE.md T78 F20 says never fewer than two, the profile says ${Math.trunc(nMin)}`);
  if (v && sideT < v.minCounterpartMm) {
    out.push(`Cabineo ${variant} needs the panel that takes the screw at least ${rtos2(v.minCounterpartMm)} thick (page 1, Applications); the side is ${rtos2(sideT)}`);
  }
  if (v && boardT < v.minConnectorBoardMm) {
    out.push(`the board that carries the connector must be at least ${rtos2(v.minConnectorBoardMm)} thick (page 1, Applications); it is ${rtos2(boardT)}`);
  }
  if (v && v.screwReachXMm >= sideT) out.push(`the screw reaches X = ${rtos2(v.screwReachXMm)} into a side only ${rtos2(sideT)} thick`);
  if (m) {
    const pd = m.pocketDepthMm;
    if (pd >= boardT) out.push(`a pocket ${rtos2(pd)} deep would break through a ${rtos2(boardT)} board`);
    if (pd < boardT && boardT - pd < ms) out.push(`a pocket ${rtos2(pd)} deep leaves less than ${rtos2(ms)} under it in a ${rtos2(boardT)} board`);
  }
  return out;
}

// ═══════════════════════════════════════════════════════════════════════════
// F. WHAT A CABINEO JOINT REPLACES, AND THE BOM (cabineo-bom-lines)
// ═══════════════════════════════════════════════════════════════════════════
//
// What it replaces is `cabineoStrip` (section Z): on a joint switched to
// Cabineo both boards lose that joint's puzzle whole (the end tenons, the
// sockets and their dia 7.5 holes, the dog bones, the dia 3 row); the FIX
// shelf's biscuit set and side screws go the same way (`cabineoShelf`); the
// BACK's puzzle joint goes too and the BACK is screwed (`screwedBack.js`, the
// owner, 15.10.2026: no dog bones under Cabineo).

/**
 * cabineo-bom-lines: a connector per pocket (article NOT on the sheet, owner
 * to supply); a cover cap per pocket under caps "all" or per FIX shelf
 * pocket under "shelves"; under 8M6 an insert per pocket. The screw comes
 * with the connector. Returns [{ label, article, qty, note }].
 */
export function cabineoBomLines(prof, sheet, nPockets, nShelfPockets) {
  const v = cabineoVariant(prof, sheet);
  const shelvesOnly = cabineoGet(prof, 'caps') === 'shelves';
  const out = [
    { label: v?.label || `Cabineo ${cabineoGet(prof, 'variant')}`, article: v?.article ?? null, qty: nPockets,
      note: 'connector with its screw; article not on the sheet, owner to supply' },
    { label: 'Cabineo cover cap', article: cabineoPath(sheet, ['cap', 'article']), qty: shelvesOnly ? nShelfPockets : nPockets,
      note: shelvesOnly ? 'caps on the fixed shelves\' pockets only (the owner: with the cap)'
        : 'a cap on every pocket, T78 proposed; article not on the sheet, owner to supply' },
  ];
  if (String(cabineoGet(prof, 'variant')) === '8M6') {
    out.push({ label: 'Cabineo 8 M6 insert 12.3', article: null, qty: nPockets, note: 'the threaded insert; article not on the sheet' });
  }
  return out;
}

// ═══════════════════════════════════════════════════════════════════════════
// THE PURE PLAN OF A CARCASS (the LISP's CABINEO_JOINTS command, as data)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * The whole pattern for a carcass W x H x D of boards G with its FIX shelves,
 * board by board, as the LISP's CABINEO_JOINTS prints it. `fixedShelfYs`: the
 * FIX shelves' UNDERSIDE rows from the floor (numbers), or `{ row, t, sb }`
 * records. `variant`, `mounting`, `machining` override the profile's.
 *
 * @returns {{ prof, sheet, gate, refused, joints, boards, counts, bom }}
 *   `joints[i]`: `{ joint, offs, pockets, holes, geometry }`; `boards[id]`:
 *   `{ machinedFace, label, W, pockets, recesses, holes }` with every record
 *   in the board's own frame and its `meta.export` reflected.
 */
export function cabineoPlan({
  W, H, D, G, fixedShelfYs = [], fixedShelfT = null, shelfSetback = null, variant = null, mounting = null, machining = null,
} = {}, profile = {}) {
  const system = variant != null ? `cabineo${variant}` : null;
  const prof = {
    ...cabineoProfile(profile, system),
    ...(mounting ? { mounting } : {}),
    ...(machining ? { machining } : {}),
  };
  const sheet = cabineoSheet();
  const sb0 = Number.isFinite(Number(shelfSetback)) && shelfSetback !== null
    ? Number(shelfSetback)
    : (Number.isFinite(Number(profile?.carcass?.shelfDepthClearance)) ? Number(profile.carcass.shelfDepthClearance) : 20);
  const t0 = Number.isFinite(Number(fixedShelfT)) && fixedShelfT !== null ? Number(fixedShelfT) : Number(G);
  const fix = (fixedShelfYs || []).map((s) => (s && typeof s === 'object'
    ? [Number(s.row), Number(s.t ?? t0), Number(s.sb ?? sb0)]
    : [Number(s), t0, sb0]));
  const sideT = Number(G);
  const boardT = Math.min(Number(G), ...fix.map((f) => f[1]));
  const refused = cabineoRefusal(prof, sheet, sideT, boardT);
  const table = refused.length ? [] : [
    ...cabineoJointTable(W, D, H, G, fix),
    ...cabineoBackTable(W, D, H, G, cabineoAxisFromOutside(prof, sheet), H),
  ];
  const joints = table.map((jt) => {
    const cuts = cabineoJointCuts(jt, prof, sheet);
    return {
      joint: jt, ...cuts,
      tooClose: cabineoTooClose(cuts.offs, cabineoPocketWidth(prof, sheet)),
      geometry: cuts.pockets.map((pk) => cabineoPocketGeometry(pk, prof, sheet)),
    };
  });
  const boards = {};
  const board = (id) => {
    if (!boards[id]) {
      boards[id] = {
        machinedFace: cabineoMachinedFace(id), label: cabineoFaceLabel(id), W: null, pockets: [], recesses: [], holes: [],
      };
    }
    return boards[id];
  };
  for (const id of CABINEO_BOARDS) board(id);
  board('BACK').said = CABINEO_BACK;
  let nShelf = 0;
  for (const j of joints) {
    const b = board(j.joint.board);
    b.W = j.joint.boardW;
    for (const g of j.geometry) {
      if (g.pocket) b.pockets.push(g.pocket);
      if (g.recess) b.recesses.push(g.recess);
      b.holes.push(...g.holes);
    }
    board(j.joint.side).holes.push(...j.holes.map((h) => ({
      panel: h.side, kind: CABINEO_HOLE_KIND, layer: cabineoHoleLayer(prof), x: r4(h.x), y: r4(h.y), d: h.dia,
      ...(h.depth != null ? { depth: h.depth } : {}), meta: { joint: h.joint, offset: r4(h.off), depthNote: HOLE_DEPTH_NOTE },
    })));
    if (/^SHELF/.test(j.joint.board)) nShelf += j.offs.length;
  }
  const nPockets = joints.reduce((n, j) => n + j.offs.length, 0);
  return {
    prof, sheet, gate: cabineoGate(prof), refused, joints, boards, back: CABINEO_BACK,
    counts: { pockets: nPockets, holes: nPockets, shelfPockets: nShelf },
    bom: cabineoBomLines(prof, sheet, nPockets, nShelf),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Z. THE ENGINE HALF: WHICH UNITS, ASKED OF THE PARENT, STRIPPED, CUT,
//    COUNTED, GATED
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Can this KIT take Cabineo? The five-board carcass the LISP's table is
 * written for: sides, a TOP panel and a full BACK (the BOTTOM may be absent,
 * WUD_HOOD: its rows drop). Null when it can, the sentence when it cannot.
 */
export function cabineoKitRefusal(type) {
  const c = type?.carcass || {};
  const ok = (c.sides ?? 'panel') === 'panel' && c.top === 'panel' && c.back === 'full';
  if (ok) return null;
  return `${type?.id || 'this kit'}: its joints are not in SKYLON_JOINTS_CABINEO.lsp's table `
    + '(the five-board carcass: sides, a TOP panel, a full BACK), so it keeps the puzzle';
}

/** Can the UI offer Cabineo on this unit's kit? (The engine still asks the rest.) */
export function cabineoApplies(type) {
  return cabineoKitRefusal(type) === null;
}

const say = (message, panel = null) => ({ refused: true, message, panel });
const fmt = (v) => String(roundTo(v, 1));

/** A circle against an axis-aligned rectangle: do they overlap? */
function circleMeetsRect(cx, cy, r, x1, y1, x2, y2) {
  const nx = Math.max(Math.min(cx, Math.max(x1, x2)), Math.min(x1, x2));
  const ny = Math.max(Math.min(cy, Math.max(y1, y2)), Math.min(y1, y2));
  return Math.hypot(cx - nx, cy - ny) < r - EPS;
}

/** The LISP's section F, as a question of one hole or one pocket on a SIDE at one joint line. */
function sideHoleGoes(d, jointY, G, pz) {
  if (d.kind === 'puzzle') return Math.abs(Number(d.y) - jointY) <= G / 2 + EPS;
  if (d.kind === 'screw' && d.layer === pz?.layers?.screw) return Math.abs(Number(d.y) - jointY) < EPS;
  return false;
}
function sidePocketGoes(k, jointY, pz) {
  return k.layer === pz?.layers?.socket && k.y1 <= jointY + EPS && k.y2 >= jointY - EPS;
}
/** On a TOP or BOTTOM (drawn ROT90): the END dog bones go, the back-edge ones stay. */
function endPocketGoes(k, drawnH, pz) {
  return k.layer === pz?.layers?.dogbone && (k.y1 >= drawnH - EPS || k.y2 <= EPS);
}

/**
 * THE SKIN CHECK (T76, MIN_SKIN 3 between opposing blind cuts), board by
 * board: every outside-face pocket (a `pocket` or `recess` record with its
 * `depth`, or a drill15 hole) against every inside-face cut of the SAME board
 * whose footprint overlaps it. An inside cut is `{ kind: 'hole' | 'pocket',
 * layer, x, y, d }` or `{ ..., x1, y1, x2, y2 }`, with `depth` (null or absent
 * = through, or the machining policy's default for its layer). A clash is
 * refused in words naming the board and the two cuts.
 *
 * @returns {Array<{ panel, code, message, pocket, cut }>}
 */
export function cabineoSkinFindings(board, outsidePockets, insideCuts, profile, { boardT = null } = {}) {
  const out = [];
  const T = Number(boardT ?? board?.thickness);
  const id = typeof board === 'string' ? board : board?.id;
  const skin = minSkinOf(profile);
  for (const pk of outsidePockets || []) {
    const rect = pk.x1 != null ? [pk.x1, pk.y1, pk.x2, pk.y2]
      : [pk.x - pk.d / 2, pk.y - pk.d / 2, pk.x + pk.d / 2, pk.y + pk.d / 2];
    const pd = Number(pk.depth);
    const pocketName = `${pk.kind === CABINEO_RECESS_KIND ? 'cap recess' : 'Cabineo pocket'} of ${pk.meta?.joint || pk.layer}`
      + ` (${fmt(pd)} deep from the outside face, x ${fmt(rect[0])} to ${fmt(rect[2])}, y ${fmt(rect[1])} to ${fmt(rect[3])})`;
    for (const c of insideCuts || []) {
      const overlaps = c.x1 != null
        ? cabineoFootprintClash(rect, [c.x1, c.y1, c.x2, c.y2])
        : circleMeetsRect(Number(c.x), Number(c.y), (Number(c.d) || 0) / 2, ...rect);
      if (!overlaps) continue;
      const stated = Number(c.depth);
      const policy = stated > 0 ? stated : machiningFor(c.layer, profile).depth;
      const at = c.x1 != null ? `x ${fmt(c.x1)} to ${fmt(c.x2)}, y ${fmt(c.y1)} to ${fmt(c.y2)}` : `${fmt(c.x)}, ${fmt(c.y)}`;
      const cutName = `${c.layer || c.kind} ${c.x1 != null ? 'pocket' : 'hole'} at ${at}`;
      if (!(policy > 0)) {
        out.push({
          panel: id, code: 'cabineo-skin', pocket: pk, cut: c,
          message: `${id}: the ${pocketName} meets the ${cutName}, which goes through the board; the two cuts would open into each other`,
        });
        continue;
      }
      if (cabineoSkinClash(T, pd, policy, profile)) {
        out.push({
          panel: id, code: 'cabineo-skin', pocket: pk, cut: c,
          message: `${id}: the ${pocketName} meets the ${cutName} (${fmt(policy)} deep from the inside face): `
            + `${fmt(cabineoSkinLeft(T, pd, policy))} mm of skin would be left in the ${fmt(T)} board, the law asks ${fmt(skin)}`,
        });
      }
    }
  }
  return out;
}

/**
 * The verdict, asked of the PARENT (the same unit cut with the puzzle): a
 * plan, or a refusal in words. The plan is everything `computeCabinet` needs
 * to cut the unit with Cabineo and nothing it has to work out again.
 *
 * @returns {{ refused: true, message: string, panel: string|null }
 *          | { refused: false, plan: object }}
 */
export function cabineoVerdict({
  parent, params, asked, type, profile,
}) {
  if (!isCabineoSystem(asked)) return say(`${asked} is not a Cabineo system (cabineo8 | cabineo12)`);
  const kit = cabineoKitRefusal(type);
  if (kit) return say(kit);
  if (parent?.params?.slope_cut) {
    return say('a carcass cut under a slope keeps the puzzle: SKYLON_JOINTS_CABINEO.lsp has no row for its roof board');
  }
  if (params?.notch) {
    return say('a carcass with a corner notch keeps the puzzle: KIT_NOTCH.lsp re-plans the puzzle\'s joints, '
      + 'and SKYLON_JOINTS_CABINEO.lsp has no notch row');
  }
  // T79 F5 (KIT_NOTCH.lsp D22): the edge notch re-plans them the same way.
  if (params?.edgeNotch) {
    return say('a carcass with an edge notch keeps the puzzle: KIT_NOTCH.lsp re-plans the puzzle\'s joints, '
      + 'and SKYLON_JOINTS_CABINEO.lsp has no notch row');
  }
  const prof = cabineoProfile(profile, asked);
  const sheet = cabineoSheet();
  const pz = profile?.puzzle || {};
  const {
    width: W, height: H, depth: D, board_t: G,
  } = parent.params;
  const byId = new Map((parent.panels || []).map((p) => [p.id, p]));
  const dims = (p) => [Number(p?.cnc?.drawn_w ?? p?.w), Number(p?.cnc?.drawn_h ?? p?.h)];
  const want = {
    BUL: [D - G, H], BUR: [D - G, H], TOP: [D - G, W - 2 * G], BOTTOM: [D - G, W - 2 * G], BACK: [W, H],
  };
  // The carcass must BE the LISP's: every board it names, where it names it.
  for (const id of CABINEO_BOARDS) {
    const p = byId.get(id);
    if (!p) {
      if (id === 'BOTTOM' && type?.carcass?.bottom === 'none') continue;
      return say(`${id} is missing, so this is not the five-board carcass SKYLON_JOINTS_CABINEO.lsp is written for`, null);
    }
    const [w, h] = dims(p);
    if (Math.abs(w - want[id][0]) > EPS || Math.abs(h - want[id][1]) > EPS || (id === 'BACK' && p.cnc?.rotated)) {
      return say(`${id} is ${fmt(w)} x ${fmt(h)}, not the ${fmt(want[id][0])} x ${fmt(want[id][1])} `
        + 'SKYLON_JOINTS_CABINEO.lsp\'s table cuts', id);
    }
  }
  // The FIX shelves the table owns: a shelf screwed into BOTH carcass sides,
  // cut to the full clear light, its back edge on the BACK.
  const drills = parent.drills || [];
  const fix = [];
  for (const p of parent.panels || []) {
    if (p.part !== 'SHELF' || !p.box) continue;
    const jointY = p.box.y + (Number(p.thickness) || G) / 2;
    const screwed = (side) => drills.some((d) => d.panel === side && d.kind === 'shelf_screw' && Math.abs(d.y - jointY) < EPS);
    if (!screwed('BUL') || !screwed('BUR')) continue;
    if (Math.abs(p.box.x - G) > EPS || Math.abs(p.box.w - (W - 2 * G)) > EPS || Math.abs(p.box.z - G) > EPS) continue;
    fix.push({ id: p.id, row: p.box.y, t: Number(p.thickness) || G, sb: D - p.box.z - p.box.d, jointY });
  }
  const shelfIds = new Map(fix.map((f, i) => [`SHELF-${i + 1}`, f.id]));
  const rename = (s) => (shelfIds.has(s) ? shelfIds.get(s) : s);
  // D.2b: the BACK's four joints. A wall unit's side joint stops below its
  // hanger holes (the lowest one less its radius, the pocket's half width and 5).
  const hangerYs = drills.filter((d) => d.kind === 'hanger' && (d.panel === 'BUL' || d.panel === 'BUR'));
  const wide = cabineoPocketWidth(prof, sheet);
  const sideLen = hangerYs.length
    ? Math.min(...hangerYs.map((d) => Number(d.y) - (Number(d.d) || 0) / 2)) - wide / 2 - 5
    : H;
  const table = [
    ...cabineoJointTable(W, D, H, G, fix.map((f) => [f.row, f.t, f.sb]))
      .map((jt) => ({ ...jt, name: jt.name.replace(/SHELF-\d+$/, (m) => rename(m)), board: rename(jt.board) })),
    ...cabineoBackTable(W, D, H, G, cabineoAxisFromOutside(prof, sheet), sideLen),
  ].filter((jt) => byId.has(jt.side) && byId.has(jt.board));

  // cabineo-refusal, at the thinnest counterpart and the thinnest pocket board the table uses.
  const tOf = (id) => Number(byId.get(id)?.thickness) || G;
  const sideT = Math.min(...table.map((jt) => tOf(jt.side)));
  const boardT = Math.min(...table.map((jt) => tOf(jt.board)));
  if (sideLen < 2 * cabineoGet(prof, 'endOffsetMm') + wide) {
    return say('a side\'s back joint has no room under the hanger for two pockets; SKYLON_JOINTS_CABINEO.lsp D.2b, so the unit keeps the puzzle', 'BUL');
  }
  const bad = cabineoRefusal(prof, sheet, sideT, boardT);
  if (bad.length) return say(`the Cabineo profile cannot make a sound joint: ${bad.join('; ')}`);

  const joints = [];
  for (const jt of table) {
    const cuts = cabineoJointCuts(jt, prof, sheet);
    if (cabineoTooClose(cuts.offs, cabineoPocketWidth(prof, sheet))) {
      return say(`two pockets on ${jt.name} stand closer than the pocket's width`, jt.board);
    }
    joints.push({ joint: jt, ...cuts, geometry: cuts.pockets.map((pk) => cabineoPocketGeometry(pk, prof, sheet)) });
  }

  // Nothing is clipped silently. On a SIDE: a dia 5 hole that meets a hole or
  // a pocket the side KEEPS (not one the strip takes with the joint, not a
  // shelf screw of a shelf the plan owns). On a horizontal board: THE SKIN
  // CHECK between every outside-face pocket and every inside-face cut the
  // board keeps (a hole, a pocket other than the puzzle's end dog bones).
  const sideRows = (side) => joints.filter((j) => j.joint.side === side && !/^SHELF|SHELF/.test(j.joint.board) && byId.has(j.joint.board))
    .map((j) => j.joint.sideOut + (j.joint.board === 'TOP' ? -G / 2 : G / 2));
  const ownedShelfRows = fix.map((f) => f.jointY);
  const keepsSideHole = (d) => {
    if (sideRows(d.panel).some((y) => sideHoleGoes(d, y, G, pz))) return false;
    if (d.kind === 'shelf_screw' && ownedShelfRows.some((y) => Math.abs(d.y - y) < EPS)) return false;
    // The back joint's puzzle holes and the dia 3 rows go with it (screwedBack.js, 15.10.2026),
    // on the BACK and on every side's back edge; the hanger cut-outs stay.
    if (d.panel === 'BACK' && (d.kind === 'puzzle' || d.kind === 'screw')) return false;
    return true;
  };
  // The puzzle's own pockets go with the joints (the sockets with the TOP's and
  // BOTTOM's rows, the dog bones and the BACK's sockets with the back joint);
  // what a board keeps is asked against every hole and pocket the plan adds.
  const keptPocketsOf = (id) => (byId.get(id)?.cnc?.pockets || [])
    .filter((k) => !sideRows(id).some((y) => sidePocketGoes(k, y, pz)))
    .filter((k) => k.layer !== pz?.layers?.dogbone && k.layer !== pz?.layers?.socket);
  for (const j of joints) {
    const keptPockets = keptPocketsOf(j.joint.side);
    for (const h of j.holes) {
      for (const d of drills) {
        if (d.panel !== j.joint.side || !keepsSideHole(d)) continue;
        if (Math.hypot(h.x - Number(d.x), h.y - Number(d.y)) < h.dia / 2 + (Number(d.d) || 0) / 2 - EPS) {
          return say(`the Cabineo hole of ${j.joint.name} at ${fmt(h.x)}, ${fmt(h.y)} on ${j.joint.side} meets the ${d.kind} hole `
            + `at ${fmt(d.x)}, ${fmt(d.y)}; SKYLON_JOINTS_CABINEO.lsp has no answer for it yet, so the unit keeps the puzzle`, j.joint.side);
        }
      }
      for (const k of keptPockets) {
        if (circleMeetsRect(h.x, h.y, h.dia / 2, k.x1, k.y1, k.x2, k.y2)) {
          return say(`the Cabineo hole of ${j.joint.name} at ${fmt(h.x)}, ${fmt(h.y)} on ${j.joint.side} meets the ${k.layer} pocket; `
            + 'SKYLON_JOINTS_CABINEO.lsp has no answer for it yet, so the unit keeps the puzzle', j.joint.side);
        }
      }
    }
    // D.2b: a side's INSIDE pocket (its dia 15 holes, its skim) against every
    // hole the side keeps on that same face: a hinge plate, a shelf pin, a
    // hanger, the dia 5 holes of the TOP's and BOTTOM's joints.
    if (isBackJoint(j.joint) && j.joint.face === 'inside') {
      const cuts = j.geometry.flatMap((g) => [...g.holes, g.recess, g.pocket].filter(Boolean));
      for (const c of cuts) {
        const rect = c.x1 != null ? [c.x1, c.y1, c.x2, c.y2] : [c.x - c.d / 2, c.y - c.d / 2, c.x + c.d / 2, c.y + c.d / 2];
        for (const d of drills) {
          if (d.panel !== j.joint.board || !keepsSideHole(d)) continue;
          const hit = c.x1 != null
            ? circleMeetsRect(Number(d.x), Number(d.y), (Number(d.d) || 0) / 2, ...rect)
            : Math.hypot(c.x - Number(d.x), c.y - Number(d.y)) < c.d / 2 + (Number(d.d) || 0) / 2 - EPS;
          if (hit) {
            return say(`the Cabineo pocket of ${j.joint.name} on ${j.joint.board} (x ${fmt(rect[0])} to ${fmt(rect[2])}, y ${fmt(rect[1])} to ${fmt(rect[3])}) `
              + `meets the ${d.kind} hole at ${fmt(d.x)}, ${fmt(d.y)}; SKYLON_JOINTS_CABINEO.lsp has no answer for it yet, so the unit keeps the puzzle`, j.joint.board);
          }
        }
        for (const k of keptPocketsOf(j.joint.board)) {
          if (cabineoFootprintClash(rect, [k.x1, k.y1, k.x2, k.y2])) {
            return say(`the Cabineo pocket of ${j.joint.name} on ${j.joint.board} meets the ${k.layer} pocket; the unit keeps the puzzle`, j.joint.board);
          }
        }
      }
    }
  }
  const outsideBoards = [...new Set(joints.filter((j) => (j.joint.face || 'outside') === 'outside').map((j) => j.joint.board))];
  for (const id of outsideBoards) {
    const p = byId.get(id);
    const [, drawnH] = dims(p);
    const mine = joints.filter((j) => j.joint.board === id).flatMap((j) => j.geometry.flatMap((g) => [g.pocket, g.recess, ...g.holes].filter(Boolean)));
    const insideCuts = [
      ...drills.filter((d) => d.panel === id && d.face !== 'outside').map((d) => ({ kind: 'hole', layer: d.layer, x: d.x, y: d.y, d: d.d, depth: d.depth ?? null })),
      // Every puzzle dog bone goes with the joint since 15.10.2026 (the end
      // ones with the Cabineo joint, the back ones with the screwed back).
      ...(p?.cnc?.pockets || []).filter((k) => k.layer !== pz?.layers?.dogbone && k.layer !== pz?.layers?.socket)
        .map((k) => ({ kind: 'pocket', layer: k.layer, x1: k.x1, y1: k.y1, x2: k.x2, y2: k.y2, depth: k.depth ?? null })),
    ];
    const findings = cabineoSkinFindings(p, mine, insideCuts, profile);
    if (findings.length) return say(`${findings[0].message}; the unit keeps the puzzle`, id);
    // Two pockets of two joints on one board must not meet (a shallow board).
    for (let a = 0; a < mine.length; a += 1) {
      for (let b = a + 1; b < mine.length; b += 1) {
        const A = mine[a]; const B = mine[b];
        if (A.meta?.joint === B.meta?.joint || A.x1 == null || B.x1 == null) continue;
        if (A.kind !== B.kind) continue;
        if (cabineoFootprintClash([A.x1, A.y1, A.x2, A.y2], [B.x1, B.y1, B.x2, B.y2])) {
          return say(`on ${id} a Cabineo pocket of ${A.meta.joint} meets a pocket of ${B.meta.joint}`, id);
        }
      }
    }
  }

  const nShelf = joints.filter((j) => /SHELF/.test(j.joint.board)).reduce((n, j) => n + j.offs.length, 0);
  const nPockets = joints.reduce((n, j) => n + j.offs.length, 0);
  return {
    refused: false,
    plan: {
      system: asked,
      variant: prof.variant,
      prof,
      sheet,
      G: Number(G),
      layers: { pocket: cabineoPocketLayer(prof), recess: cabineoRecessLayer(prof), hole: cabineoHoleLayer(prof) },
      boards: CABINEO_BOARDS.filter((id) => byId.has(id)),
      outside: outsideBoards,
      leaves: [...CABINEO_LEAVES],
      back: CABINEO_BACK,
      joints,
      shelves: new Set(fix.map((f) => f.id)),
      counts: { pockets: nPockets, holes: nPockets, shelfPockets: nShelf },
      bom: cabineoBomLines(prof, sheet, nPockets, nShelf),
    },
  };
}

/** The parent, cut with the puzzle, and the reason in words (Check #31, the dowel's code). */
export function withCabineoRefusal(parent, verdict, asked) {
  return {
    ...parent,
    warnings: [...(parent.warnings || []), {
      code: JOINTS_REFUSED,
      ...(verdict.panel ? { panel: verdict.panel } : {}),
      message: `Cabineo ${cabineoVariantOf(asked) || ''} refused: ${verdict.message}`.replace('Cabineo  refused', 'Cabineo refused'),
    }],
    derived: { ...(parent.derived || {}), joints: { asked, system: 'puzzle', refused: verdict.message } },
  };
}

/**
 * The LISP's section F, on the boards the plan names: each loses the puzzle of
 * the PLANNED joints and nothing else here. A SIDE keeps its outline for now
 * and loses, at each planned joint line, the socket pocket, its two dia 7.5
 * holes and the dia 3 row. A TOP or BOTTOM loses its END tenons (the outline
 * re-traced with plain ends, its back-edge tenons kept for now:
 * `biscuitJoints.js bjPlainEnds`, one copy) and its end dog bones. A FIX
 * shelf's own board carries no puzzle. Run BEFORE the drilling pass, so
 * nothing of it is copied into the drills. The BACK is not in `boards`: the
 * back joint, on every board, is `screwedBackStrip`'s (15.10.2026), run next.
 */
export function cabineoStrip({ panels, plan, profile }) {
  const pz = profile?.puzzle || {};
  const G = plan.G;
  for (const p of panels) {
    if (!plan.boards.includes(p.id) || !p.cnc) continue;
    const w = Number(p.cnc.drawn_w ?? p.w);
    const h = Number(p.cnc.drawn_h ?? p.h);
    if (p.id === 'BUL' || p.id === 'BUR') {
      const rows = plan.joints.filter((j) => j.joint.side === p.id && (j.joint.board === 'TOP' || j.joint.board === 'BOTTOM'))
        .map((j) => j.joint.sideOut + (j.joint.board === 'TOP' ? -G / 2 : G / 2));
      p.cnc = {
        ...p.cnc,
        pockets: (p.cnc.pockets || []).filter((k) => !rows.some((y) => sidePocketGoes(k, y, pz))),
        holes: (p.cnc.holes || []).filter((d) => !rows.some((y) => sideHoleGoes(d, y, G, pz))),
      };
      continue;
    }
    const ends = new Set(plan.joints.filter((j) => j.joint.board === p.id).map((j) => j.joint.endName));
    if (!ends.has('Y0') || !ends.has('YH')) continue;
    const backTabs = (p.cnc.outline || []).some(([x]) => x < -EPS);
    p.cnc = {
      ...p.cnc,
      outline: bjPlainEnds({ drawnW: w, drawnH: h, G, pz, backTabs }),
      pockets: (p.cnc.pockets || []).filter((k) => !endPocketGoes(k, h, pz)),
    };
  }
}

/**
 * The POCKETS and the RECESSES onto the horizontal boards, in each board's
 * own frame, and the board marked `meta.machinedFace: 'outside'` with its
 * label, so the DXF writer reflects it (cnc/dxf.js, through T76's one
 * helper), the part label prints OUTSIDE FACE UP (cnc/partLabel.js) and the
 * operations JSON says so. Run with the strip, BEFORE the drilling pass.
 */
export function cabineoPocketsOnto({ panels, plan }) {
  const byId = new Map(panels.map((p) => [p.id, p]));
  const boards = [...new Set(plan.joints.map((j) => j.joint.board))];
  for (const id of boards) {
    const p = byId.get(id);
    if (!p?.cnc) continue;
    const mine = plan.joints.filter((j) => j.joint.board === id).flatMap((j) => j.geometry);
    const pockets = mine.map((g) => g.pocket).filter(Boolean);
    const recesses = mine.map((g) => g.recess).filter(Boolean);
    p.cnc = { ...p.cnc, pockets: [...(p.cnc.pockets || []), ...pockets, ...recesses] };
    // A side's back pockets (D.2b) are cut from its INSIDE face, with the rest
    // of its drilling: no reflection, no label; the outside boards keep theirs.
    const outside = plan.outside.includes(id);
    p.meta = {
      ...(p.meta || {}),
      ...(outside ? { machinedFace: 'outside', machinedFaceLabel: OUTSIDE_FACE_LABEL } : {}),
      cabineo: { pockets: mine.length, face: outside ? 'outside' : 'inside' },
    };
  }
}

/**
 * The drill records: the sides' dia 5 holes (no depth: NOT ON THE SHEET, the
 * note says so) and, under drill15, the horizontal boards' three dia 15 holes
 * per pocket from the OUTSIDE face (`face: 'outside'`, their depth stated).
 * Joint order (the table's), holes first.
 */
export function cabineoDrills(plan) {
  const out = [];
  for (const j of plan.joints) {
    for (const h of j.holes) {
      out.push({
        panel: h.side, kind: CABINEO_HOLE_KIND, layer: plan.layers.hole, x: r4(h.x), y: r4(h.y), d: h.dia,
        ...(h.depth != null ? { depth: r4(h.depth) } : {}), meta: { joint: j.joint.name, offset: r4(h.off), depthNote: HOLE_DEPTH_NOTE },
      });
    }
    for (const g of j.geometry) {
      for (const d of g.holes) out.push({ ...d, x: r4(d.x), y: r4(d.y) });
    }
  }
  return out;
}

/** Is this FIX shelf's joint to the sides a Cabineo joint (biscuits and screws give way)? */
export function cabineoShelf(plan, shelfId) {
  return Boolean(plan?.shelves?.has(shelfId));
}

/** The mounting's words on an order line (the carcass's lines and the box's, T79 F14). */
const mountLabelOf = (mounting) => ({
  surface: 'on the surface', flush: 'flush collar', flushCap: 'flush cover cap', hpl: 'HPL on the surface',
}[mounting] || mounting);

/**
 * The order lines (`result.hardware` shape): the connectors and the cover
 * caps, articles NOT on the sheet (null, owner to supply). `bom.js` merges
 * them on role and spec; the readiness law reads them as `bought`.
 */
export function cabineoHardwareLines(plan) {
  const m = cabineoMounting(plan.prof, plan.sheet);
  const v = cabineoVariant(plan.prof, plan.sheet);
  const mountLabel = mountLabelOf(plan.prof.mounting);
  const out = [];
  for (const line of plan.bom) {
    if (!(line.qty > 0)) continue;
    const isCap = /cover cap/.test(line.label);
    const isInsert = /insert/.test(line.label);
    out.push({
      role: isCap ? 'cabineo_cap' : (isInsert ? 'cabineo_insert' : 'cabineo_connector'),
      label: line.label,
      qty: line.qty,
      unit: 'pcs',
      spec: {
        article: line.article ?? null,
        variant: plan.variant,
        mounting: plan.prof.mounting,
        machining: plan.prof.machining,
        ...(isCap ? { recessDepthMm: m?.recessDepthMm ?? null, recessWidthMm: m?.recessWidthMm ?? null }
          : { screwReachXMm: v?.screwReachXMm ?? null }),
        note: line.note,
        confirmed: plan.prof.confirmed,
      },
      spec_label: isCap ? `${mountLabel}, article owner to supply` : `Cabineo ${plan.variant}, ${mountLabel}, ${plan.prof.machining}, article owner to supply`,
    });
  }
  return out;
}

/**
 * What `result.derived.joints` says of a Cabineo unit. T79 F14: with the
 * unit's drawer boxes on Cabineo too, `box: { joints, pockets, holes }`.
 */
export function cabineoSummary(plan, boxPlan = null) {
  return {
    system: plan.system,
    variant: plan.variant,
    mounting: plan.prof.mounting,
    machining: plan.prof.machining,
    pockets: plan.counts.pockets,
    holes: plan.counts.holes,
    joints: plan.joints.map((j) => ({ name: j.joint.name, len: roundTo(j.joint.len, 4), pockets: j.offs.length, board: j.joint.board, side: j.joint.side })),
    machinedFace: Object.fromEntries([...plan.outside.map((id) => [id, 'outside']), ...plan.boards.filter((id) => !plan.outside.includes(id)).map((id) => [id, 'inside'])]),
    backHoles: plan.joints.filter((j) => isBackJoint(j.joint)).reduce((n, j) => n + j.offs.length, 0),
    leaves: [...plan.leaves],
    back: plan.back,
    confirmed: plan.prof.confirmed,
    gate: cabineoGate(plan.prof),
    ...(boxPlan ? { box: cabineoBoxSummary(boxPlan) } : {}),
  };
}

/** The warning a Cabineo unit carries while the pattern is unconfirmed (Check #31). */
export function cabineoGateWarning(summary) {
  if (!summary?.gate) return null;
  return {
    code: CABINEO_GATE_CODE,
    message: `Cabineo ${summary.variant}: ${summary.gate}. The CNC export refuses this unit until the owner confirms the pattern `
      + '(profile joints.cabineo.confirmed).',
  };
}

/** Does this result carry a Cabineo cut on any of these panels (all of them by default)? */
export function carriesCabineo(result, panelIds = null) {
  const ids = panelIds ? new Set(panelIds) : null;
  const inHoles = (result?.drills || []).some((d) => (d.kind === CABINEO_HOLE_KIND || d.kind === CABINEO_POCKET_KIND) && (!ids || ids.has(d.panel)));
  if (inHoles) return true;
  return (result?.panels || []).some((p) => (!ids || ids.has(p.id))
    && (p.cnc?.pockets || []).some((k) => k.kind === CABINEO_POCKET_KIND || k.kind === CABINEO_RECESS_KIND));
}

/**
 * THE GATE at the export: the sentence when an export would MACHINE a Cabineo
 * pocket or hole while the owner has not confirmed the pattern, else null.
 * Asked of the profile the export is written with. `entries`: [{ result,
 * panels? }]; `panels` narrows to what goes.
 */
export function cabineoExportRefusal(entries, profile) {
  if (cabineoProfile(profile).confirmed) return null;
  for (const e of entries || []) {
    const ids = Array.isArray(e?.panels) ? e.panels.map((p) => p.id) : null;
    if (carriesCabineo(e?.result, ids)) return CABINEO_GATE;
  }
  return null;
}

/** Is this panel machined from the carcass's OUTSIDE face (its DXF is reflected, its label says so)? */
export function isOutsideFace(panel) {
  return panel?.meta?.machinedFace === 'outside';
}

/** Does any part of these entries carry an outside-face board? */
export function hasOutsideFaceBoards(entries = []) {
  return entries.some((entry) => (entry.panels || entry.result?.panels || []).some((panel) => isOutsideFace(panel)));
}

/**
 * The cut list's NOTE row for a Cabineo unit (the BOM panel's Parts tab reads
 * `unit.rows`): how many pockets, which boards are OUTSIDE FACE UP, and the
 * gate while it is closed. Null on every other unit.
 */
export function cabineoNoteRow(result) {
  const j = result?.derived?.joints;
  if (!j || !isCabineoSystem(j.system)) return null;
  const outside = Object.entries(j.machinedFace || {}).filter(([, f]) => f === 'outside').map(([id]) => id);
  const gate = j.gate ? `; ${j.gate}` : '';
  return {
    unit_num: result.unitNum,
    id: `${result.unitNum} cabineo`,
    part: 'CABINEO-NOTE',
    role: 'cabineo_note',
    material_role: 'note',
    material_label: `NOTE: Cabineo ${j.variant} joints, ${j.pockets} pockets (${j.mounting}, ${j.machining}) cut from the OUTSIDE face of `
      + `${outside.join(', ')} (${OUTSIDE_FACE_LABEL}) and from the sides' inside faces at the back, ${j.holes} dia 5 holes in the sides and the BACK${gate}`,
    w: 0,
    h: 0,
    qty: 1,
    thickness: 0,
    edge: '',
    edge_m: 0,
    area_m2: 0,
    readiness: 'manual',
  };
}

/**
 * The operations JSON for the ZIP: every outside-face board with its label,
 * the reflection it was written through (T76's one sentence), its pockets in
 * both frames, and the sides' holes; the gate on top. Data for CAM and for
 * the owner's eye; a DXF carries no letters but the part's own.
 */
export function cabineoOperationsManifest(entries = [], { files = [] } = {}) {
  const parts = [];
  let gate = null;
  for (const entry of entries) {
    const result = entry.result || {};
    const unitId = entry.unit?.id || result.unitId || null;
    const unitNum = result.unitNum || entry.unitNum || '';
    const j = result.derived?.joints;
    if (j?.gate) gate = j.gate;
    for (const panel of entry.panels || result.panels || []) {
      const mine = (panel.cnc?.pockets || []).filter((k) => k.kind === CABINEO_POCKET_KIND || k.kind === CABINEO_RECESS_KIND);
      const holes = (result.drills || []).filter((d) => d.panel === panel.id && (d.kind === CABINEO_HOLE_KIND || d.kind === CABINEO_POCKET_KIND));
      if (!isOutsideFace(panel) && !mine.length && !holes.length) continue;
      const W = Number(panel.cnc?.drawn_w ?? panel.w);
      parts.push({
        unitId, unitNum, panelId: panel.id, part: panel.part,
        machinedFace: isOutsideFace(panel) ? 'outside' : 'inside',
        label: isOutsideFace(panel) ? OUTSIDE_FACE_LABEL : '',
        widthMm: W, heightMm: panel.cnc?.drawn_h ?? panel.h, thicknessMm: panel.thickness,
        reflected: isOutsideFace(panel),
        files: files.filter((f) => f.panelId === panel.id).map((f) => ({ name: f.name, setup: f.setup || 'back' })),
        pockets: mine.map((k) => ({
          kind: k.kind, layer: k.layer, joint: k.meta?.joint, end: k.meta?.end, offsetFromFrontMm: k.meta?.offset,
          depthMm: k.depth ?? null, face: 'outside',
          own: { box: [k.x1, k.y1, k.x2, k.y2], axis: k.meta?.axis ?? null, lobes: k.meta?.lobes ?? null },
          export: { box: k.meta?.export?.box ?? null, axis: k.meta?.export?.axis ?? null, lobes: k.meta?.export?.lobes ?? null },
        })),
        holes: holes.map((d) => ({
          kind: d.kind, layer: d.layer, joint: d.meta?.joint, x: d.x, y: d.y, diaMm: d.d, depthMm: d.depth ?? null,
          face: d.face || 'inside', ...(d.kind === CABINEO_HOLE_KIND ? { depthNote: d.meta?.depthNote || HOLE_DEPTH_NOTE } : {}),
          ...(d.face === 'outside' ? { export: d.meta?.export?.at ? { at: d.meta.export.at } : null } : {}),
        })),
      });
    }
  }
  return {
    schema: 'cabinet-core.cabineo-operations', version: 1, units: 'mm',
    gate,
    source: 'reference/hardware/cabineo/cabineo.json (Lamello operating instructions, every number owner to confirm); reference/lisp/SKYLON_JOINTS_CABINEO.lsp',
    setups: {
      outside: `A board marked ${OUTSIDE_FACE_LABEL} is machined from the carcass's OUTSIDE face (the top from above, the bottom from below, a fixed shelf from its underside; a drawer box's front and back walls from the face away from the box, T79 F14). Its DXF is drawn as seen from that face.`,
      flip: 'Flip each individual part about its local vertical axis: frontX = partWidth - backX, frontY = backY (T76\'s one reflection, cnc/frontOperations.js). Do not flip a whole sheet using this layout.',
      inside: 'A side keeps its inside-face machining and gains the dia 5 counterpart holes on the joint line.',
      depths: 'Pocket and recess depths are positive millimetres below the OUTSIDE face. The dia 5 hole\'s depth is not on the sheet and is left to the owner.',
    },
    parts,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Z2. THE DRAWER BOX (T79 F14): SKYLON_JOINTS_CABINEO.lsp D.2c mirrored
//     routine for routine (cabineo-box-rule, cabineo-box-profile,
//     cabineo-box-positions, cabineo-box-joint, cabineo-box-table,
//     cabineo-box-pockets, cabineo-box-holes, cabineo-box-refusal,
//     cabineo-box-pocket-rect, cabineo-box-pilot-refusal,
//     cabineo-box-bom-lines), and its engine half
// ═══════════════════════════════════════════════════════════════════════════
//
// The owner, 18.10.2026: *"jak mamy wybrane jakąkolwiek funkcję łączenia czy
// dog bones czy inne zawsze projektuj cabineo na szuflady, na przednich i
// tylnych ściankach dodawaj cabineo jeden do 100 mm, 2 powyżej 100 mm,
// minimum odległość to 25 od góry i dołu"*; *"nawiercanie w bokach będzie
// liczone od góry boxa"*; Cabineo 12: *"tak"*; *"przy wysokich nie
// rozsuwaj"*; the bottom: *"wsuwane"*. The WALL's end stands on the SIDE's
// face, so the wall (BOX-FRONT, BOX-BACK) carries the pocket in its OUTSIDE
// face (machinedFace 'outside', OUTSIDE FACE UP) and the side the dia 5 hole
// in its inside face; four joints a box; one connector a joint to a 100 wall,
// two above at 25 from the wall's top and bottom edges, measured from the
// TOP, the side's holes at the same heights. CHAT FIX 31.10.2026: the wall's
// top edge IS the side's top edge (`dTop` measures 0 off the boxes; it
// measured 1 while engine/cabinet.js stood the wall on the bottom board, and
// the holes sat 1 low: the owner, *"dziurki 5 mm ... powinny byc przesuniete
// o 1 mm do gory boxa"*); the kit's 1 is the bottom's play in its groove.
//
// THE GATE is the unit NAMING a joint system (`boxCabineoAsked`): every unit
// a person builds names one (`projectStore.js paramsForEngine` hands the
// ladder's answer down on every unit, 'puzzle' included); a bare
// `computeCabinet()` names none and runs no line of this section, so every
// golden is byte-identical by construction. The carcass keeps its own system;
// the box always takes Cabineo 12 and shares the carcass profile's machining
// and its `confirmed` flag. The carcass table (D.2, D.2b) is not read here.

/** cabineo-box-rule: the box's three numbers (profile.joints.cabineo.box), the LISP's own as fallbacks. */
export function cabineoBoxRule(profile = {}) {
  const b = profile?.joints?.cabineo?.box || {};
  const num = (v, fallback) => (Number.isFinite(Number(v)) && v !== null && v !== '' ? Number(v) : fallback);
  return {
    // Cabineo 12 on the box (the owner: "tak"); the only id read, Cabineo 8 on the box is not this turn.
    variant: ['12'].includes(String(b.variant)) ? String(b.variant) : '12',
    onePerJointUpToMm: num(b.onePerJointUpToMm, 100),
    fromEdgeMm: num(b.fromEdgeMm, 25),
  };
}

/**
 * cabineo-box-profile: the company's machining (mounting, option, skim, hole
 * depth, the gate) with the box's own variant and its 25 as the end offset;
 * the carcass's pitch and minimum of two set where `cabineoRefusal` has
 * nothing to say of them (the box's own set-out is asked by
 * `cabineoBoxRefusal`).
 */
export function cabineoBoxProfile(prof, rule) {
  return {
    ...prof, variant: rule.variant, endOffsetMm: rule.fromEdgeMm, pitchMm: prof.maxSpacingMm, minPerJoint: 2,
  };
}

/** cabineo-box-positions: the offsets along one box joint, FROM THE WALL'S TOP EDGE. */
export function cabineoBoxPositions(hw, rule) {
  const h = Number(hw);
  const e = rule.fromEdgeMm;
  return h <= rule.onePerJointUpToMm ? [h / 2] : [e, h - e];
}

/** cabineo-box-joint: one box joint, the D.2b fields and the channel's axis (`along`), always 'outside'. */
export function cabineoBoxJoint(name, len, side, hx0, hy0, hdx, hdy, board, along, endAt, dirIn, aFrom, aDir, bW, bT) {
  return {
    name, len: Number(len), ref: 'TOP', kind: 'box',
    side, hx0: Number(hx0), hy0: Number(hy0), hdx: Number(hdx), hdy: Number(hdy),
    board, face: 'outside', along, endAt: Number(endAt), dirIn: Number(dirIn),
    acrossFrom: Number(aFrom), acrossDir: Number(aDir), boardW: Number(bW), boardT: Number(bT),
  };
}

/** Is this joint a drawer box's (D.2c)? */
export function isBoxJoint(jt) {
  return jt?.kind === 'box';
}

/**
 * cabineo-box-table: the four joints of one box (SL-BF, SR-BF, SL-BB, SR-BB),
 * in the frames the kits draw the boards in: `rotated` (KIT_BUDR_FULL: x up
 * every board) or not (KIT_WARDROBE_FULL: x along every board). `dTop` is the
 * side's top above the wall's top (0 since 31.10.2026, the tops flush; read off
 * the boxes, never typed), `ax` the screw axis inside the wall's outside face;
 * the side's holes stand ax from its end.
 */
export function cabineoBoxJointTable(sideL, sideH, wallL, hw, dTop, GB, ax, rotated) {
  const L = Number(sideL); const H = Number(sideH); const WL = Number(wallL); const h = Number(hw);
  const g = Number(GB); const a = Number(ax);
  const top = H - Number(dTop);
  if (rotated) {
    return [
      cabineoBoxJoint('SL-BF', h, 'SL', top, a, -1.0, 0.0, 'BF', 'y', 0.0, 1.0, h, -1.0, h, g),
      cabineoBoxJoint('SR-BF', h, 'SR', top, L - a, -1.0, 0.0, 'BF', 'y', WL, -1.0, h, -1.0, h, g),
      cabineoBoxJoint('SL-BB', h, 'SL', top, L - a, -1.0, 0.0, 'BB', 'y', WL, -1.0, h, -1.0, h, g),
      cabineoBoxJoint('SR-BB', h, 'SR', top, a, -1.0, 0.0, 'BB', 'y', 0.0, 1.0, h, -1.0, h, g),
    ];
  }
  return [
    cabineoBoxJoint('SL-BF', h, 'SL', L - a, top, 0.0, -1.0, 'BF', 'x', WL, -1.0, h, -1.0, WL, g),
    cabineoBoxJoint('SR-BF', h, 'SR', a, top, 0.0, -1.0, 'BF', 'x', 0.0, 1.0, h, -1.0, WL, g),
    cabineoBoxJoint('SL-BB', h, 'SL', a, top, 0.0, -1.0, 'BB', 'x', 0.0, 1.0, h, -1.0, WL, g),
    cabineoBoxJoint('SR-BB', h, 'SR', L - a, top, 0.0, -1.0, 'BB', 'x', WL, -1.0, h, -1.0, WL, g),
  ];
}

/**
 * cabineo-box-pockets: one record per offset in the wall's own frame, in the
 * two shapes `cabineoPocketGeometry` reads: along 'y' D.3's (`x`, `yEnd`),
 * along 'x' D.2b's (`along: 'x'`, `xEnd`, `y`); the across coordinate is hw - off.
 */
export function cabineoBoxPockets(jt, offs) {
  return offs.map((off) => {
    const a = jt.acrossFrom + jt.acrossDir * off;
    return jt.along === 'y'
      ? {
        board: jt.board, x: a, yEnd: jt.endAt, dirIn: jt.dirIn, W: jt.boardW, T: jt.boardT, joint: jt.name, off, face: 'outside',
      }
      : {
        board: jt.board, along: 'x', xEnd: jt.endAt, dirIn: jt.dirIn, y: a, W: jt.boardW, T: jt.boardT, joint: jt.name, off, face: 'outside',
      };
  });
}

/** cabineo-box-holes: the dia 5 holes in the SIDE's inside face, X deep: [{ side, x, y, dia, depth, joint, off }]. */
export function cabineoBoxHoles(jt, offs, prof, sheet = cabineoSheet()) {
  const dia = cabineoPath(sheet, ['counterpartHole', 'diaMm']);
  const depth = cabineoHoleDepth(prof, sheet);
  return offs.map((off) => ({
    side: jt.side, x: jt.hx0 + jt.hdx * off, y: jt.hy0 + jt.hdy * off, dia, depth, joint: jt.name, off,
  }));
}

/** The LISP's (rtos v 2 n). */
const rtosN = (v, n) => Number(v).toFixed(n);

/**
 * cabineo-box-refusal: the box refused in words before any pocket ([] when it
 * can be joined): `cabineoRefusal` of the two boards asked with the box's own
 * numbers, a wall under 2 x 25, two connectors over the sheet's 300 apart.
 * `prof` is the company's profile, `rule` the box's numbers.
 */
export function cabineoBoxRefusal(prof, sheet, rule, sideT, wallT, hw) {
  const bp = cabineoBoxProfile(prof, rule);
  const h = Number(hw);
  const e = rule.fromEdgeMm;
  const one = rule.onePerJointUpToMm;
  const out = cabineoRefusal(bp, sheet, sideT, wallT);
  if (h <= one && h / 2 < e) {
    out.push(`the box wall is ${rtosN(h, 1)} high: one Cabineo on its middle would stand ${rtosN(h / 2, 1)} from its top and `
      + `bottom edges, under the owner's minimum ${rtosN(e, 0)}`);
  }
  const gap = h - e - e;
  if (h > one && gap > prof.maxSpacingMm) {
    out.push(`the box wall is ${rtosN(h, 1)} high: its two Cabineo would stand ${rtosN(gap, 1)} apart, over the sheet's max. `
      + `${rtosN(prof.maxSpacingMm, 0)} between connectors (page 1, Assembly panel 1), and the owner does not spread them`);
  }
  return out;
}

/** cabineo-box-pocket-rect: a box pocket's rectangle in its wall's frame, the lobes' box and the recess's together. */
export function cabineoBoxPocketRect(pk, prof, sheet = cabineoSheet()) {
  let bx = cabineoOutlineBox(cabineoOption(prof, sheet));
  const rc = cabineoRecessBox(cabineoRecess(prof, sheet));
  if (rc) bx = [Math.min(bx[0], rc[0]), Math.min(bx[1], rc[1]), Math.max(bx[2], rc[2]), Math.max(bx[3], rc[3])];
  const a = cabineoBoardPt(pk, bx[0], bx[1]);
  const b = cabineoBoardPt(pk, bx[2], bx[3]);
  return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])].map(r4);
}

/**
 * cabineo-box-pilot-refusal: a box pocket meeting a hole its wall already
 * carries (the BUDR BOX-FRONT's facade pilots), the sentence in the carcass's
 * grammar, or null. `holes`: [[x, y, dia], ...] in the wall's own frame, each
 * asked by its box.
 */
export function cabineoBoxPilotRefusal(pk, prof, sheet, holes, wall) {
  const r = cabineoBoxPocketRect(pk, prof, sheet);
  for (const [x, y, dia] of holes || []) {
    const q = Number(dia) / 2;
    if (cabineoFootprintClash(r, [x - q, y - q, x + q, y + q])) {
      return `the Cabineo pocket of ${pk.joint} on ${wall} (x ${rtosN(r[0], 1)} to ${rtosN(r[2], 1)}, y ${rtosN(r[1], 1)} to `
        + `${rtosN(r[3], 1)}) meets the hole at ${rtosN(x, 1)}, ${rtosN(y, 1)}; SKYLON_JOINTS_CABINEO.lsp has no answer for it yet, `
        + 'so the box keeps no Cabineo';
    }
  }
  return null;
}

/** cabineo-box-bom-lines: one Cabineo 12 per pocket (4 a box to a 100 wall, 8 above), no cover cap. */
export function cabineoBoxBomLines(prof, rule, sheet, nPockets) {
  const v = cabineoVariant(cabineoBoxProfile(prof, rule), sheet);
  return [{
    label: v?.label || `Cabineo ${rule.variant}`, article: v?.article ?? null, qty: nPockets,
    note: 'drawer box: one per pocket, 4 a box to a 100 wall, 8 above; article not on the sheet, owner to supply',
  }];
}

// ─── Z2, the engine's half ─────────────────────────────────────────────────

/**
 * THE GATE: does this unit name a joint system at all (any id the engine
 * knows, 'puzzle' included)? A box bought ready (`drawer_boxes: 'ready'`, the
 * wizard's question) is not cut, so it is not machined either.
 */
export function boxCabineoAsked(params) {
  return JOINT_SYSTEMS.includes(params?.joints_system) && params?.drawer_boxes !== 'ready';
}

/**
 * The verdict for every box a builder joined (`tags`: the id prefix of its
 * four boards, `${tag}-SL` / `-SR` / `-BF` / `-BB`), asked of the boards as
 * built, before the drilling pass: the plan of the boxes that are joined and,
 * in words, every box that is not (it keeps no Cabineo, as the kit cuts it).
 */
export function cabineoBoxVerdict({ tags = [], panels = [], profile = {} } = {}) {
  const rule = cabineoBoxRule(profile);
  const company = cabineoProfile(profile, `cabineo${rule.variant}`);
  const prof = cabineoBoxProfile(company, rule);
  const sheet = cabineoSheet();
  const ax = cabineoAxisFromOutside(prof, sheet);
  const byId = new Map(panels.map((p) => [p.id, p]));
  const boxes = [];
  const refused = [];
  for (const tag of tags) {
    const [SL, SR, BF, BB] = ['SL', 'SR', 'BF', 'BB'].map((k) => byId.get(`${tag}-${k}`));
    if (!SL?.box || !SR?.box || !BF?.box || !BB?.box) continue;
    const ids = { SL: SL.id, SR: SR.id, BF: BF.id, BB: BB.id };
    const hw = Number(BF.box.h);
    const said = cabineoBoxRefusal(company, sheet, rule,
      Math.min(Number(SL.thickness), Number(SR.thickness)), Math.min(Number(BF.thickness), Number(BB.thickness)), hw);
    if (said.length) {
      refused.push({ tag, panel: BF.id, message: `${said.join('; ')}; the box keeps no Cabineo` });
      continue;
    }
    const dTop = r4((SL.box.y + SL.box.h) - (BF.box.y + BF.box.h));
    const offs = cabineoBoxPositions(hw, rule);
    const table = cabineoBoxJointTable(SL.box.d, SL.box.h, BF.box.w, hw, dTop, BF.thickness, ax, Boolean(BF.cnc?.rotated))
      .map((jt) => ({ ...jt, name: `${tag} ${jt.name}`, side: ids[jt.side], board: ids[jt.board] }));
    const joints = table.map((jt) => {
      const pockets = cabineoBoxPockets(jt, offs);
      return {
        joint: jt, offs, pockets, holes: cabineoBoxHoles(jt, offs, prof, sheet),
        geometry: pockets.map((pk) => cabineoPocketGeometry(pk, prof, sheet)),
      };
    });
    // Nothing is clipped silently: a pocket meeting a hole its wall carries
    // (D.2c, the BUDR's facade pilots), and a side's hole meeting a cut its
    // side carries (the runner strip, the bottom groove), as section Z asks a
    // carcass side's.
    let why = null;
    for (const j of joints) {
      const wall = byId.get(j.joint.board);
      const holes = (wall.cnc?.holes || []).map((d) => [Number(d.x), Number(d.y), Number(d.d) || 0]);
      for (const pk of j.pockets) why = why || cabineoBoxPilotRefusal(pk, prof, sheet, holes, wall.id);
      const side = byId.get(j.joint.side);
      for (const h of j.holes) {
        for (const k of side.cnc?.pockets || []) {
          if (!why && circleMeetsRect(h.x, h.y, h.dia / 2, k.x1, k.y1, k.x2, k.y2)) {
            why = `the Cabineo hole of ${j.joint.name} at ${rtosN(h.x, 1)}, ${rtosN(h.y, 1)} on ${side.id} meets the ${k.layer} pocket; `
              + 'SKYLON_JOINTS_CABINEO.lsp has no answer for it yet, so the box keeps no Cabineo';
          }
        }
        for (const d of side.cnc?.holes || []) {
          if (!why && Math.hypot(h.x - Number(d.x), h.y - Number(d.y)) < h.dia / 2 + (Number(d.d) || 0) / 2 - EPS) {
            why = `the Cabineo hole of ${j.joint.name} at ${rtosN(h.x, 1)}, ${rtosN(h.y, 1)} on ${side.id} meets the ${d.kind} hole at `
              + `${rtosN(d.x, 1)}, ${rtosN(d.y, 1)}; SKYLON_JOINTS_CABINEO.lsp has no answer for it yet, so the box keeps no Cabineo`;
          }
        }
      }
    }
    if (why) {
      refused.push({ tag, panel: BF.id, message: why });
      continue;
    }
    boxes.push({ tag, ids, rotated: Boolean(BF.cnc?.rotated), hw, dTop, offs, joints });
  }
  const nPockets = boxes.reduce((n, b) => n + b.joints.reduce((m, j) => m + j.offs.length, 0), 0);
  return {
    variant: rule.variant,
    rule,
    prof,
    sheet,
    layers: { pocket: cabineoPocketLayer(prof), recess: cabineoRecessLayer(prof), hole: cabineoHoleLayer(prof) },
    boxes,
    refused,
    counts: { joints: boxes.reduce((n, b) => n + b.joints.length, 0), pockets: nPockets, holes: nPockets },
    bom: cabineoBoxBomLines(company, rule, sheet, nPockets),
  };
}

/** Each box the verdict refused, as the warning Check #31 reads (JOINTS_REFUSED, the dowel's and the carcass Cabineo's code). */
export function cabineoBoxRefusalWarnings(plan) {
  return (plan?.refused || []).map((r) => ({
    code: JOINTS_REFUSED,
    panel: r.panel,
    message: `Cabineo ${plan.variant} refused on the drawer box ${r.tag}: ${r.message}`,
  }));
}

/**
 * The POCKETS and the RECESSES onto the box walls, in each wall's own frame,
 * and the wall marked `meta.machinedFace: 'outside'` with its label, so the
 * DXF writer reflects it and the part label prints OUTSIDE FACE UP, as the
 * carcass's outside boards are (`cabineoPocketsOnto`). The sides keep their
 * frame: their holes are drills. Run BEFORE the drilling pass.
 */
export function cabineoBoxPocketsOnto({ panels, plan }) {
  const byId = new Map(panels.map((p) => [p.id, p]));
  for (const b of plan.boxes) {
    for (const id of [b.ids.BF, b.ids.BB]) {
      const p = byId.get(id);
      if (!p?.cnc) continue;
      const mine = b.joints.filter((j) => j.joint.board === id).flatMap((j) => j.geometry);
      p.cnc = {
        ...p.cnc,
        pockets: [...(p.cnc.pockets || []), ...mine.map((g) => g.pocket).filter(Boolean), ...mine.map((g) => g.recess).filter(Boolean)],
      };
      p.meta = {
        ...(p.meta || {}),
        machinedFace: 'outside',
        machinedFaceLabel: OUTSIDE_FACE_LABEL,
        cabineo: { pockets: mine.length, face: 'outside', box: b.tag },
      };
    }
  }
}

/**
 * The drill records: the sides' dia 5 holes (X deep) and, under drill15, the
 * walls' three dia 15 holes per pocket from the OUTSIDE face. Box by box,
 * joint by joint, holes first, as `cabineoDrills`.
 */
export function cabineoBoxDrills(plan) {
  const out = [];
  for (const b of plan.boxes) {
    for (const j of b.joints) {
      for (const h of j.holes) {
        out.push({
          panel: h.side, kind: CABINEO_HOLE_KIND, layer: plan.layers.hole, x: r4(h.x), y: r4(h.y), d: h.dia,
          ...(h.depth != null ? { depth: r4(h.depth) } : {}),
          meta: { joint: j.joint.name, offset: r4(h.off), depthNote: HOLE_DEPTH_NOTE, box: b.tag },
        });
      }
      for (const g of j.geometry) {
        for (const d of g.holes) out.push({ ...d, x: r4(d.x), y: r4(d.y) });
      }
    }
  }
  return out;
}

/** The box's order line (`result.hardware` shape, the carcass connector's spec): one Cabineo 12 per pocket. */
export function cabineoBoxHardwareLines(plan) {
  const v = cabineoVariant(plan.prof, plan.sheet);
  const mountLabel = mountLabelOf(plan.prof.mounting);
  return plan.bom.filter((line) => line.qty > 0).map((line) => ({
    role: 'cabineo_connector',
    label: line.label,
    qty: line.qty,
    unit: 'pcs',
    spec: {
      article: line.article ?? null,
      variant: plan.variant,
      mounting: plan.prof.mounting,
      machining: plan.prof.machining,
      screwReachXMm: v?.screwReachXMm ?? null,
      note: line.note,
      confirmed: plan.prof.confirmed,
    },
    spec_label: `Cabineo ${plan.variant}, ${mountLabel}, ${plan.prof.machining}, drawer boxes, article owner to supply`,
  }));
}

/** What the box plan says (`derived.boxCabineo`, and `box` in `cabineoSummary`): { joints, pockets, holes }. */
export function cabineoBoxSummary(plan) {
  return { joints: plan.counts.joints, pockets: plan.counts.pockets, holes: plan.counts.holes };
}

/** The gate's warning for the boxes of a unit whose carcass carries none (Check #31), while the pattern is unconfirmed. */
export function cabineoBoxGateWarning(plan) {
  if (!plan?.boxes?.length) return null;
  const gate = cabineoGate(plan.prof);
  if (!gate) return null;
  return {
    code: CABINEO_GATE_CODE,
    message: `Cabineo ${plan.variant} on the drawer boxes: ${gate}. The CNC export refuses this unit until the owner confirms the pattern `
      + '(profile joints.cabineo.confirmed).',
  };
}
