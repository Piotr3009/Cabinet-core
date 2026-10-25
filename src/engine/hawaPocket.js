/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── T82 F2, F3 · THE HAWA POCKET (reference/lisp/KIT_HAWA.lsp) ─────────────
//
// The owner, 25.10.2026, 11:40: *"potrzebujemy zaprojektowac to jako
// wstawienie pomiedzy 2 panele 110 mm przestrzen pomiedzy, wysuwasz pocket
// door i zakrywasz szafke lub szafki"*; 13:46: *"panele po bokach to jest nie
// carcas tylko front zawsze, wiec jesli jest 18 mm to daj zawsze 22 mm
// automatycznie, i napisz informacje minimum 19 mm"*, *"raczej zawsze wystaja
// troche wiec nie ma problemu"*, *"3 tak moga"*, *"4 - tak, 5 - tak"*.
//
// This module is KIT_HAWA.lsp's mirror, routine for routine (section 4 of the
// kit; each function names the routine it is), as engine/inframe.js is
// KIT_INFRAME.lsp's: (a) the panels, the width, the heights, (b) the door's
// width and its class, (c) the depth, (d) the door's drilling, (e) the panels'
// holes, (f) the cut, (g) the door open, (h) the hand and the sets, (i) the
// Checks in words. The numbers are profile.hawa's, the LISP's constants of the
// same values (test/turn82-f01-hawa-lisp.test.js holds the two to each other).
//
// And two things the kit leaves to the house: WHICH units a door covers (the
// run's, engine/runs.js, slice A3) and what stands past their far edge (the
// house's front clearance, profile.doors.clearance). `pocketCoverOf` turns the
// covered units into the numbers the kit takes (span, KT1, far), and
// `hawaPocketFigures` is the ONE derivation every reader takes: the engine
// cuts from it and publishes it as `result.hawa`; the right panel, the BOM,
// the CNC, the room and the sheets read it and never derive a figure again.
//
// THE FRAMES are the LISP's. A UNIT box is { x, y, z, w, h, d }: x along the
// wall from the pocket's left outer face, y up from its carcass bottom (the
// run's plinth line), z from its BACK (z = KT is the carcass front plane). A
// PANEL face (u, v): u from the panel's own FRONT edge backwards, v up from its
// bottom edge, on its POCKET face. The DOOR face (u, v): u from its HINGE edge,
// v up from its bottom edge, on its back face. A hole is the LISP's list
// (layer, u, v, diameter, depth); a depth equal to the board is through.
//
// Pure functions: no store, no React. A bare computeCabinet() of any other kit
// never reaches a line of this file.

import { getUnitType } from './types.js';
import WEIGHT_25 from '../../reference/hawa/weight-25.json' with { type: 'json' };
import WEIGHT_35 from '../../reference/hawa/weight-35.json' with { type: 'json' };

/** The two kg tables of 160704 p1, as A1 committed them (rows TH, columns TB). */
const WEIGHT_TABLES = Object.freeze({ 25: WEIGHT_25, 35: WEIGHT_35 });

/** The Check numbers (BRIEF section 6: #37, #38 as CLAUDE.md; its #42 is #47). */
export const HAWA_CHECKS = Object.freeze({ OUT_OF_RANGE: 37, POCKET_DEPTH: 38, PANEL_22: 47 });

/** The warning codes the engine publishes and engine/checks.js maps to them. */
export const HAWA_CODES = Object.freeze({
  OUT_OF_RANGE: 'HAWA_OUT_OF_RANGE', POCKET_DEPTH: 'HAWA_POCKET_DEPTH', PANEL_22: 'HAWA_PANEL_22',
});

const num = (v, fallback) => (Number.isFinite(Number(v)) && v !== '' && v != null ? Number(v) : fallback);

/**
 * The kit's constants (KIT_HAWA.lsp section 3), off the profile: one name per
 * LISP constant, the LISP's own name, so a line here reads against the kit.
 */
export function hawaSpec(profile) {
  const h = profile?.hawa || {};
  const g = h.gaps || {};
  const door = h.door || {};
  const c25 = h.classes?.[25] || {};
  const c35 = h.classes?.[35] || {};
  const dep = h.depth || {};
  const hi = h.hinge || {};
  const st = h.steel || {};
  const ho = h.holes || {};
  const b = ho.b || {};
  const a = ho.a || {};
  const toTable = (t) => Object.entries(t || {}).map(([k, v]) => [Number(k), Number(v)]).sort((x, y) => x[0] - y[0]);
  return {
    hawaPocketOne: Number(h.pocketClearMm?.one),
    hawaPocketTwo: Number(h.pocketClearMm?.two),
    hawaPanelMin: Number(h.panelMinMm),
    hawaPanelAMin: Number(h.panelAMinMm),
    hawaPanelThinFront: Number(h.panelThinFrontMm),
    hawaBoardT: Number(h.topBottomMm),
    hawaCapOne: Number(h.connectorCapMm),
    hawaHardwareZone: Number(h.hardwareZoneMm),
    hawaZ1: Number(g.z1),
    hawaZ2: Number(g.z2),
    hawaZ3: Number(g.z3),
    hawaZ5: Number(g.z5),
    hawaZFront: Number(g.front),
    hawaSMin: Number(door.sMinMm),
    hawaSMax: Number(door.sMaxMm),
    hawaTBMin: Number(door.tbMinMm),
    hawaTBMax: Number(door.tbMaxMm),
    hawaRound: Number(door.roundMm),
    hawaTH25Min: Number(c25.thMinMm),
    hawaTH25Max: Number(c25.thMaxMm),
    hawaTH35Min: Number(c35.thMinMm),
    hawaTH35Max: Number(c35.thMaxMm),
    hawaHinges25: Number(c25.hinges),
    hawaHinges35: Number(c35.hinges),
    hawaDensity: Number(h.doorDensityKgPerM3),
    hawaT1Plus: Number(dep.t1PlusMm),
    hawaMPlus: Number(dep.mPlusMm),
    hawaMLess: Number(dep.mLessMm),
    hawaT1Min: Number(dep.t1MinMm),
    hawaTrackMax: Number(dep.trackMaxMm),
    hawaTrackLess: Number(dep.trackLessMm),
    hawaTrackStart: Number(dep.trackStartMm),
    hawaRear: Number(h.rearAllowanceMm),
    hawaCupD: Number(hi.cupDiaMm),
    hawaCupDepth: Number(hi.cupDepthMm),
    hawaCupFromEnd: Number(hi.cupFromEndMm),
    hawaScrewD: Number(hi.screwDiaMm),
    hawaScrewDepth: Number(hi.screwDepthMm),
    hawaScrewPitch: Number(hi.screwPitchMm),
    hawaScrewIn: Number(hi.screwInMm),
    hawaSleeveD: Number(hi.sleeveDiaMm),
    hawaSleeveDepth: Number(hi.sleeveDepthMm),
    hawaSleeveFromEnd: Number(hi.sleeveFromEndMm),
    hawaTA1Table: toTable(hi.ta1),
    hawaTA2Table: toTable(hi.ta2),
    hawaSteelTop: Number(st.topMm),
    hawaSteelBottom: Number(st.bottomMm),
    hawaSteelFirst: Number(st.firstMm),
    hawaSteelPitch: Number(st.pitchMm),
    hawaSteelPlus: Number(st.plusMm),
    hawaGrooveW: Number(st.grooveWidthMm),
    hawaGrooveDepth: Number(st.grooveDepthMm),
    hawaPitch: Number(ho.pitchMm),
    hawaBTopAxis: Number(b.topAxisMm),
    hawaBTopFirst: Number(b.topFirstMm),
    hawaBBottomAxis: Number(b.bottomAxisMm),
    hawaBBottomFirst: Number(b.bottomFirstMm),
    hawaBracketLess: Number(b.bracketLessMm),
    hawaBracketW: Number(b.bracketWidthMm),
    hawaBracketH: Number(b.bracketHeightMm),
    hawaATopAxis: Number(a.topAxisMm),
    hawaATopFirst: Number(a.topFirstMm),
    hawaABottomAxis: Number(a.bottomAxisMm),
    hawaABottomFirst: Number(a.bottomFirstMm),
    hawaABracketPitch: Number(a.bracketPitchMm),
    hawaABracketGapLess: Number(a.bracketGapLessMm),
    hawaAPadFrom: Number(a.padFromMm),
    hawaAPadTop: Number(a.padTopMm),
    hawaAPadBottom: Number(a.padBottomMm),
    hawaTrackHoleEnd: Number(ho.trackHoleEndMm),
    hawaPilotD: Number(ho.pilotDiaMm),
    hawaPilotDepth: Number(ho.pilotDepthMm),
    hawaFootD: Number(h.foot?.diaMm),
    hawaFootFrom: Number(h.foot?.fromMm),
    layers: { ...(h.layers || {}) },
    defaultPush: h.defaults?.push !== false,
  };
}

/** hawa-mm: a number as the Check prints it, 572.5, or 415 when whole. */
export function hawaMm(x) {
  return Math.abs(x - Math.trunc(x)) <= 0.0001 ? String(Math.trunc(x)) : Number(x).toFixed(1);
}

// ═══ (a) THE PANELS, THE WIDTH, THE HEIGHTS (D1 D3 D4 D5) ═════════════════

/** hawa-panel-t: a pocket panel's thickness, the front's from 19, else 22 (D3). */
export function panelT(frontT, K) {
  return frontT >= K.hawaPanelMin ? frontT : K.hawaPanelThinFront;
}

/** hawa-panel-swap-p: did the 22 replace the front's thickness (note #47)? */
export function panelSwapP(frontT, K) {
  return frontT < K.hawaPanelMin;
}

/** hawa-panel-ok-p: both minimums met, B 19 and A 18 (D3). */
export function panelOkP(frontT, K) {
  return panelT(frontT, K) >= K.hawaPanelMin && panelT(frontT, K) >= K.hawaPanelAMin;
}

/** hawa-clear: the clear width between the panels (D1). */
export function clearOf(doors, K) {
  return doors === 2 ? K.hawaPocketTwo : K.hawaPocketOne;
}

/** hawa-width: the unit's width, panel + clear + panel (D1). */
function widthOf(doors, frontT, K) {
  return clearOf(doors, K) + 2 * panelT(frontT, K);
}

/** hawa-cap: the Connector 55 cap under the one-door pocket's top board (D4). */
export function capOf(doors, K) {
  return doors === 2 ? 0 : K.hawaCapOne;
}

/** hawa-eh: the panels' height (D4 D5). */
export function ehOf(doors, h, K) {
  return h - K.hawaBoardT - K.hawaBoardT - capOf(doors, K);
}

/** hawa-th: the door's height (D5). */
export function thOf(doors, h, K) {
  return ehOf(doors, h, K) - K.hawaZ1 - K.hawaZ2;
}

/** hawa-z: the gap at the hinge edge, Z3 to panel A, Z5 between two doors (D9). */
export function zOf(doors, K) {
  return doors === 2 ? K.hawaZ5 : K.hawaZ3;
}

/** hawa-share: each door's share of the pocket, its half less its hinge gap (D6). */
export function shareOf(doors, K) {
  return doors === 2 ? K.hawaPocketTwo / 2 - K.hawaZ5 / 2 : K.hawaPocketOne - K.hawaZ3;
}

/** hawa-round: rounded to 0.5 (D6). */
export function roundOf(x, K) {
  return K.hawaRound * Math.trunc(x / K.hawaRound + 0.5);
}

// ═══ (b) THE DOOR'S WIDTH AND ITS CLASS (D6 D7) ═══════════════════════════

/** hawa-tb: the span, panel B, the share, less the free edge's clearance (D6). */
export function tbOf(doors, frontT, span, far, K) {
  return roundOf(span + panelT(frontT, K) + shareOf(doors, K) - far, K);
}

/** hawa-kg: the door's weight in kg (D7). */
export function kgOf(tb, th, s, dens) {
  return (tb / 1000) * (th / 1000) * (s / 1000) * dens;
}

/** hawa-table: the class's kg table (rows { th, kg[] }, columns TB). */
export function tableOf(cls) {
  return cls === 35 ? WEIGHT_TABLES[35] : WEIGHT_TABLES[25];
}

/** hawa-th-min, hawa-th-max, hawa-hinges. */
export function thMinOf(cls, K) { return cls === 35 ? K.hawaTH35Min : K.hawaTH25Min; }
export function thMaxOf(cls, K) { return cls === 35 ? K.hawaTH35Max : K.hawaTH25Max; }
export function hingesOf(cls, K) { return cls === 35 ? K.hawaHinges35 : K.hawaHinges25; }

/**
 * hawa-allowed-kg: the kg a class allows the door at its cell, the largest row
 * at or below TH and the smallest column at or above TB; null off the table (D7).
 */
export function allowedKg(cls, th, tb) {
  const table = tableOf(cls);
  const idx = (table.columns || []).findIndex((c) => c >= tb);
  let best = null;
  if (idx >= 0) {
    for (const row of table.rows || []) {
      if (row.th <= th && (best == null || row.th > best.th)) best = row;
    }
  }
  return idx >= 0 && best ? best.kg[idx] : null;
}

/** hawa-class-fits-p: does a class carry this door (D7)? */
export function classFitsP(cls, th, tb, kg, K) {
  const allowed = allowedKg(cls, th, tb);
  return th >= thMinOf(cls, K) && th <= thMaxOf(cls, K) && allowed != null && kg <= allowed;
}

/**
 * hawa-class: the owner's class when he set one and it carries the door, else
 * 25 when it carries it, else 35, else null: refused (D7).
 */
export function classOf(th, tb, s, dens, cls, K) {
  const kg = kgOf(tb, th, s, dens);
  if (cls) return classFitsP(cls, th, tb, kg, K) ? cls : null;
  if (classFitsP(25, th, tb, kg, K)) return 25;
  if (classFitsP(35, th, tb, kg, K)) return 35;
  return null;
}

// ═══ (c) THE DEPTH (D8) ═══════════════════════════════════════════════════

/** hawa-t1-max: the deepest pocket the 560 track serves, 567. */
export function t1Max(K) {
  return K.hawaTrackMax + K.hawaTrackLess;
}

/** hawa-t1-need: the shallowest pocket HAWA accepts, T1 >= 414 and M <= TB - 320. */
export function t1Need(doors, K) {
  return Math.max(K.hawaT1Min, K.hawaT1Plus + K.hawaMLess + zOf(doors, K));
}

/**
 * hawa-depth: [T1, M, E1, KT], the pocket as deep as the cabinet and never
 * past the track, M proud, the flush case when M would be under S + 3 (D8).
 */
export function depthOf(doors, tb, kt1, s, K) {
  const z = zOf(doors, K);
  let t1 = Math.min(kt1, t1Max(K));
  let m = tb + K.hawaT1Plus + z - t1;
  if (m < s + K.hawaMPlus) {
    m = s + K.hawaMPlus;
    t1 = tb + K.hawaT1Plus + z - m;
  }
  return [t1, m, tb - m, Math.min(t1 + K.hawaRear, kt1)];
}

/** hawa-depth-ok-p: refused where HAWA refuses, and only there (D8). */
export function depthOkP(doors, tb, kt1, s, K) {
  const d = depthOf(doors, tb, kt1, s, K);
  return d[0] >= K.hawaT1Min && d[0] <= t1Max(K) && d[1] <= tb - K.hawaMLess && kt1 >= d[0];
}

/** hawa-track-length: the top and the bottom track, T1 - 7 (D8). */
export function trackLength(t1, K) {
  return t1 - K.hawaTrackLess;
}

// ═══ (d) THE DOOR'S DRILLING (D10 D11) ════════════════════════════════════

/** hawa-lookup: a row of a two-column table by its first number, or null. */
function lookup(key, table) {
  const row = (table || []).find((r) => Math.abs(r[0] - key) <= 0.0001);
  return row ? row[1] : null;
}

/** hawa-ta: the cup axis from the hinge edge, TA1 by Z3, TA2 by Z5 (D10). */
export function taOf(doors, K) {
  return doors === 2 ? lookup(K.hawaZ5, K.hawaTA2Table) : lookup(K.hawaZ3, K.hawaTA1Table);
}

/** hawa-cup-vs: the cups' heights from the bottom edge, 200, the rest equal, 200 (D10). */
export function cupVs(cls, th, K) {
  const n = hingesOf(cls, K);
  const step = (th - 2 * K.hawaCupFromEnd) / (n - 1);
  const out = [];
  for (let i = 0; i < n; i += 1) out.push(K.hawaCupFromEnd + i * step);
  return out;
}

/** hawa-steel-length: the III/35 profile, hinge edge to M - 3 from the free edge (D11). */
export function steelLength(tb, m, K) {
  return tb - m + K.hawaSteelPlus;
}

/** hawa-steel-rows: the III/35 profile's rows [top, bottom], from the bottom edge (D11). */
export function steelRows(th, K) {
  return [th - (K.hawaSteelTop - K.hawaZ1), K.hawaSteelBottom - K.hawaZ2];
}

/** hawa-steel-us: the III/35 profile's holes as u from the HINGE edge (D11). */
export function steelUs(tb, m, K) {
  const out = [];
  let f = m + K.hawaSteelFirst;
  while (f <= tb - (K.hawaSteelFirst + K.hawaSteelPlus)) {
    out.push(tb - f);
    f += K.hawaSteelPitch;
  }
  return out;
}

/** hawa-steel-grooves: [u0, v0, u1, v1] each, centred on a row (D11). */
export function steelGrooves(tb, th, m, K) {
  const len = steelLength(tb, m, K);
  const half = K.hawaGrooveW / 2;
  return steelRows(th, K).map((v) => [0, v - half, len, v + half]);
}

/** hawa-door-holes: every hole of the door, [layer, u, v, diameter, depth] (D10 D11 D15). */
export function doorHoles(doors, cls, tb, th, m, K) {
  const ta = taOf(doors, K);
  const L = K.layers;
  const out = [];
  for (const v of cupVs(cls, th, K)) {
    out.push([L.cup, ta, v, K.hawaCupD, K.hawaCupDepth]);
    out.push([L.screw, ta + K.hawaScrewIn, v + K.hawaScrewPitch, K.hawaScrewD, K.hawaScrewDepth]);
    out.push([L.screw, ta + K.hawaScrewIn, v - K.hawaScrewPitch, K.hawaScrewD, K.hawaScrewDepth]);
  }
  out.push([L.sleeve, ta, K.hawaSleeveFromEnd, K.hawaSleeveD, K.hawaSleeveDepth]);
  out.push([L.sleeve, ta, th - K.hawaSleeveFromEnd, K.hawaSleeveD, K.hawaSleeveDepth]);
  if (cls === 35) {
    for (const v of steelRows(th, K)) {
      for (const u of steelUs(tb, m, K)) out.push([L.sleeve, u, v, K.hawaSleeveD, K.hawaSleeveDepth]);
    }
  }
  return out;
}

// ═══ (e) THE PANELS' HOLES (D12 D13 D14) ══════════════════════════════════

/** hawa-row: first, then every pitch, while at most last. */
export function rowOf(first, pitch, last) {
  const out = [];
  for (let u = first; u <= last; u += pitch) out.push(u);
  return out;
}

/** hawa-track-last: the last centre a track's hole may take, from the front plane (D12). */
export function trackLast(t1, K) {
  return K.hawaTrackStart + trackLength(t1, K) - K.hawaTrackHoleEnd;
}

/** hawa-b-bracket: panel B's catch bracket footprint [u0, v0, u1, v1] (D12). */
export function bBracket(t1, eh, K) {
  return [t1 - K.hawaBracketLess, eh / 2, t1 - K.hawaBracketLess + K.hawaBracketW, eh / 2 + K.hawaBracketH];
}

/** hawa-b-holes: panel B's pilots, the two track rows and the bracket's mark (D12). */
export function bHoles(t1, eh, K) {
  const P = [K.hawaPilotD, K.hawaPilotDepth];
  const L = K.layers.pilot;
  const out = [];
  for (const u of rowOf(K.hawaBTopFirst, K.hawaPitch, trackLast(t1, K))) out.push([L, u, eh - K.hawaBTopAxis, ...P]);
  for (const u of rowOf(K.hawaBBottomFirst, K.hawaPitch, trackLast(t1, K))) out.push([L, u, K.hawaBBottomAxis, ...P]);
  const r = bBracket(t1, eh, K);
  out.push([L, (r[0] + r[2]) / 2, (r[1] + r[3]) / 2, ...P]);
  return out;
}

/** hawa-a-holes: panel A's pilots from A's own front edge, S + 3 forward of the plane (D13). */
export function aHoles(s, t1, e1, eh, K) {
  const P = [K.hawaPilotD, K.hawaPilotDepth];
  const L = K.layers.pilot;
  const fwd = s + K.hawaZFront;
  const out = [];
  for (const u of rowOf(s + K.hawaATopFirst, K.hawaPitch, fwd + trackLast(t1, K))) out.push([L, u, eh - K.hawaATopAxis, ...P]);
  const b2 = s + K.hawaABottomFirst + K.hawaABracketPitch + (e1 - K.hawaABracketGapLess) / 2;
  for (const u of [s + K.hawaABottomFirst, s + K.hawaABottomFirst + K.hawaABracketPitch, b2, b2 + K.hawaABracketPitch]) {
    out.push([L, u, K.hawaABottomAxis, ...P]);
  }
  out.push([L, s + K.hawaAPadFrom, eh - K.hawaAPadTop, ...P]);
  out.push([L, s + K.hawaAPadFrom, K.hawaABottomAxis + K.hawaAPadBottom, ...P]);
  return out;
}

/** hawa-foot: the foot hole in the bottom board, u across from its left edge, v from its FRONT edge (D14). */
export function footOf(doors, frontT, s, K) {
  const pt = panelT(frontT, K);
  return [K.layers.foot, pt + clearOf(doors, K) / 2, s + K.hawaFootFrom, K.hawaFootD, K.hawaBoardT];
}

// ═══ (f) THE CUT (D2 D4 D20) ══════════════════════════════════════════════

const boxOf = (l) => ({
  x: l[0], y: l[1], z: l[2], w: l[3], h: l[4], d: l[5],
});

/** hawa-door-box: one door's box when closed, at x0 (its left edge). */
export function doorBox(x0, doors, h, tb, s, kt, K) {
  return [x0, K.hawaBoardT + K.hawaZ2, kt + K.hawaZFront, tb, thOf(doors, h, K), s];
}

/**
 * The parts of a pocket from its doors' widths and its depth, the LISP's
 * `hawa-cut` order: the bottom, the panels, the top, the door(s). Each part is
 * [part, id, w, h, t, box]. `tbs` is { one } or { L, R } (a side with no door
 * is absent: the two-door pocket beside one cabinet cuts one door).
 */
function cutParts({
  doors, hand, frontT, h, kt, tbs,
}, K) {
  const pt = panelT(frontT, K);
  const c = clearOf(doors, K);
  const w = widthOf(doors, frontT, K);
  const eh = ehOf(doors, h, K);
  const s = frontT;
  const fwd = K.hawaZFront + s;
  const parts = [];
  parts.push(['POCKET-BOTTOM', 'POCKET-BOTTOM', w, kt + fwd, K.hawaBoardT, [0, 0, 0, w, K.hawaBoardT, kt + fwd]]);
  if (doors === 2) {
    parts.push(['POCKET-B', 'POCKET-B-L', kt, eh, pt, [0, K.hawaBoardT, 0, pt, eh, kt]]);
    parts.push(['POCKET-B', 'POCKET-B-R', kt, eh, pt, [w - pt, K.hawaBoardT, 0, pt, eh, kt]]);
  } else if (hand === 'L') {
    parts.push(['POCKET-B', 'POCKET-B', kt, eh, pt, [0, K.hawaBoardT, 0, pt, eh, kt]]);
    parts.push(['POCKET-A', 'POCKET-A', kt + fwd, eh, pt, [pt + c, K.hawaBoardT, 0, pt, eh, kt + fwd]]);
  } else {
    parts.push(['POCKET-A', 'POCKET-A', kt + fwd, eh, pt, [0, K.hawaBoardT, 0, pt, eh, kt + fwd]]);
    parts.push(['POCKET-B', 'POCKET-B', kt, eh, pt, [pt + c, K.hawaBoardT, 0, pt, eh, kt]]);
  }
  parts.push(['POCKET-TOP', 'POCKET-TOP', w, kt + fwd, K.hawaBoardT, [0, h - K.hawaBoardT, 0, w, K.hawaBoardT, kt + fwd]]);
  const th = thOf(doors, h, K);
  if (doors === 2) {
    if (tbs.L != null) parts.push(['POCKET-DOOR', 'POCKET-DOOR-L', tbs.L, th, s, doorBox(w / 2 - K.hawaZ5 / 2 - tbs.L, doors, h, tbs.L, s, kt, K)]);
    if (tbs.R != null) parts.push(['POCKET-DOOR', 'POCKET-DOOR-R', tbs.R, th, s, doorBox(w / 2 + K.hawaZ5 / 2, doors, h, tbs.R, s, kt, K)]);
  } else if (tbs.one != null) {
    const x0 = hand === 'L' ? w - pt - K.hawaZ3 - tbs.one : pt + K.hawaZ3;
    parts.push(['POCKET-DOOR', 'POCKET-DOOR', tbs.one, th, s, doorBox(x0, doors, h, tbs.one, s, kt, K)]);
  }
  return parts;
}

/** hawa-cut: the cut of a pocket, [part, id, w, h, t, box] per part (the LISP's own arguments). */
export function cutOf(doors, hand, frontT, h, kt1, span, far, K) {
  const tb = tbOf(doors, frontT, span, far, K);
  const kt = depthOf(doors, tb, kt1, frontT, K)[3];
  return cutParts({
    doors, hand, frontT, h, kt, tbs: doors === 2 ? { L: tb, R: tb } : { one: tb },
  }, K);
}

// ═══ (g) THE DOOR OPEN (D18) ══════════════════════════════════════════════

/** The open box from the door's own figures (the arithmetic of hawa-door-open). */
function openBox({
  doors, hand, side, frontT, h, kt, e1, tb,
}, K) {
  const pt = panelT(frontT, K);
  const w = widthOf(doors, frontT, K);
  const s = frontT;
  let x0;
  if (doors === 2) x0 = side === 'L' ? pt + K.hawaHardwareZone : w - pt - K.hawaHardwareZone - s;
  else if (hand === 'L') x0 = pt + K.hawaHardwareZone;
  else x0 = w - pt - K.hawaHardwareZone - s;
  return [x0, K.hawaBoardT + K.hawaZ2, kt - e1, s, thOf(doors, h, K), tb];
}

/** hawa-door-open: the open door's box, square to the front, 17 off its panel B (the LISP's own arguments). */
export function doorOpenOf(doors, hand, side, frontT, h, kt1, span, far, K) {
  const tb = tbOf(doors, frontT, span, far, K);
  const d = depthOf(doors, tb, kt1, frontT, K);
  return openBox({
    doors, hand, side, frontT, h, kt: d[3], e1: d[2], tb,
  }, K);
}

// ═══ (h) THE HAND, THE SETS (D16 D19) ═════════════════════════════════════

/** hawa-system-hand: HAWA's hand of a door covering the units on `covers`' side. */
export function systemHand(covers) {
  return covers === 'R' ? 'left' : 'right';
}

/** hawa-set-name: the set's name for the BOM, "Hawa Concepta III 25 Push, left". */
export function hawaSetName(cls, push, covers) {
  return `Hawa Concepta III ${String(Math.trunc(cls))}${push ? ' Push, ' : ' Pull, '}${systemHand(covers)}`;
}

/** hawa-connector-name: one per pocket. */
export function connectorName(doors) {
  return doors === 2 ? 'Hawa Connector 110' : 'Hawa Connector 55';
}

// ═══ (i) THE CHECKS, IN WORDS (D3 D7 D8 D17) ══════════════════════════════

/** hawa-join: strings joined with "; ". */
export function joinOf(l) {
  return l.reduce((out, s) => (out === '' ? s : `${out}; ${s}`), '');
}

/** hawa-check-37: the door out of HAWA's range, or null. */
export function check37(doors, tb, th, s, dens, cls, K) {
  const why = [];
  if (s < K.hawaSMin || s > K.hawaSMax) why.push(`S ${hawaMm(s)} (18 to 26)`);
  if (tb < K.hawaTBMin || tb > K.hawaTBMax) why.push(`TB ${hawaMm(tb)} (440 to 750)`);
  if (th < K.hawaTH25Min || th > K.hawaTH35Max) why.push(`TH ${hawaMm(th)} (1200 to 2700)`);
  if (!why.length && classOf(th, tb, s, dens, cls, K) == null) {
    why.push(`a door of ${kgOf(tb, th, s, dens).toFixed(1)} kg at TH ${hawaMm(th)} x TB ${hawaMm(tb)} is past ${
      cls ? `the III/${String(Math.trunc(cls))} table` : 'the III/25 and the III/35 tables'}`);
  }
  return why.length ? `#37 HAWA door out of range: ${joinOf(why)}` : null;
}

/** hawa-check-37-cover: #37 again, for a covered unit with drawer fronts (D17). */
export function check37Cover(unitNum) {
  return `#37 HAWA door out of range: unit ${unitNum} has drawer fronts; the pocket door covers doors only`;
}

/** hawa-check-38: the pocket the door needs, or null (D8). */
export function check38(doors, tb, kt1, s, K) {
  if (depthOkP(doors, tb, kt1, s, K)) return null;
  return `#38 HAWA: the door ${hawaMm(tb)} needs a pocket ${hawaMm(t1Need(doors, K))} deep on a ${hawaMm(kt1)} `
    + 'cabinet; make the cabinet deeper or the door narrower';
}

/** hawa-check-47: the 22 in place of an 18 front (D3). */
export function check47(frontT, K) {
  if (!panelSwapP(frontT, K)) return null;
  return `#47 HAWA pocket panels ${hawaMm(K.hawaPanelThinFront)}: the hardware panel needs ${hawaMm(K.hawaPanelMin)} mm minimum`;
}

// ═══ THE HOUSE'S SIDE: WHAT THE ENGINE AND THE STORE ASK ══════════════════

/** The project's front, as the engine reads it (cabinet.js normalizeParams: the front1 slot, front_t, the profile). */
export function frontTOf(params, profile) {
  const slots = params?.thickness_slots && typeof params.thickness_slots === 'object' ? params.thickness_slots : {};
  if (Number(slots.front1) > 0) return Number(slots.front1);
  return Number(params?.front_t) || Number(profile?.front?.thickness) || 0;
}

/** The pocket's own choices, read the one way (CLAUDE.md F2 `params.pocket`). */
export function pocketChoiceOf(params, profile) {
  const p = params?.pocket || {};
  const doors = Number(p.doors) === 2 ? 2 : 1;
  const cls = Number(p.cls) === 25 || Number(p.cls) === 35 ? Number(p.cls) : null;
  return {
    doors,
    hand: doors === 2 ? null : (p.hand === 'L' ? 'L' : 'R'),
    push: p.push == null ? hawaSpec(profile).defaultPush : p.push !== false,
    cls,
    covers: Array.isArray(p.covers) ? [...p.covers] : [],
  };
}

/** A pocket's width before it covers anything (its birth): panel + clear + panel. */
export function hawaPocketWidth({ doors = 1, frontT } = {}, profile) {
  return widthOf(Number(doors) === 2 ? 2 : 1, Number(frontT) || Number(profile?.front?.thickness) || 0, hawaSpec(profile));
}

/**
 * The params a new pocket is born with (types.js defaultParamsFor): one door,
 * hand R (the documents' "Anlage links": the pocket on the door's left), Push
 * (*"5 - tak"*), the class by F3, nothing covered yet; its width the pocket's
 * at the workshop's front; its height and depth a tall run's (heightGroup
 * 'tall'), until the store matches it to the unit beside it.
 */
export function hawaPocketDefaultParams(profile) {
  const frontT = Number(profile?.front?.thickness) || 0;
  const tall = profile?.tallUnit?.defaults || {};
  return {
    width: hawaPocketWidth({ doors: 1, frontT }, profile),
    ...(Number(tall.height) > 0 ? { height: Number(tall.height) } : {}),
    ...(Number(tall.depth) > 0 ? { depth: Number(tall.depth) } : {}),
    pocket: {
      doors: 1, hand: 'R', push: hawaSpec(profile).defaultPush, cls: null, covers: [],
    },
  };
}

/** The house's clearance at a front's edge for what stands there (profile.doors.clearance, engine/frontClearance.js's matrix). */
export function farClearanceMm(kind, profile) {
  const c = profile?.doors?.clearance || {};
  const none = num(c.none, 1.5);
  return num(c[kind], none);
}

/** Does this unit carry drawer fronts of its own (KIT_HAWA.lsp D17: refused, #37)? */
function hasDrawerFronts(unit) {
  // The drawer unit's family (BUDR, its counts, the hob and the chest kits):
  // its fronts ARE its face, standing S in front of the carcass where the
  // pocket door stands 3. A wardrobe's drawers are behind its doors.
  return getUnitType(unit?.type)?.drawerStyle === 'budr';
}

/**
 * What a pocket's doors cover, as the numbers KIT_HAWA.lsp takes, the shape
 * `params.pocket_cover` (handed to the engine by paramsForEngine; slice A3
 * decides WHICH units, engine/runs.js, and hands them here in order).
 *
 * @param {object} pocketUnit   the pocket ({ id, position, params })
 * @param {Array|object} covered the covered units nearest first: an array (one
 *                              door: the hand's side; two doors: each unit's
 *                              side read from where it stands) or { L, R }
 * @param {object} profile
 * @param {object} [opts]
 *   beyond  { L, R }: what stands past the last covered unit's far edge, a
 *           frontClearance kind ('front' | 'endPanel' | 'infill' | 'appliance'
 *           | 'wall' | 'none'); absent is 'none' (a run end, 1.5). A covered
 *           unit's own end panel on its far side is 'endPanel'.
 * @returns {{doors: Array}|null}  one entry per covered side:
 *   { side, units, unitNums, spanMm, KT1, far, freeEndClearanceMm, drawerFronts }
 */
export function pocketCoverOf(pocketUnit, covered, profile, { beyond = {} } = {}) {
  if (!pocketUnit) return null;
  const choice = pocketChoiceOf(pocketUnit.params, profile);
  const px = Number(pocketUnit.position?.x_mm) || 0;
  const pw = Number(pocketUnit.params?.width) || 0;
  const bySide = { L: [], R: [] };
  if (Array.isArray(covered)) {
    for (const u of covered.filter(Boolean)) {
      const ux = Number(u.position?.x_mm);
      const side = choice.doors === 1 ? choice.hand
        : (Number.isFinite(ux) && ux + (Number(u.params?.width) || 0) / 2 < px + pw / 2 ? 'L' : 'R');
      bySide[side].push(u);
    }
  } else if (covered && typeof covered === 'object') {
    bySide.L = (covered.L || []).filter(Boolean);
    bySide.R = (covered.R || []).filter(Boolean);
  }
  const sides = choice.doors === 2 ? ['L', 'R'] : [choice.hand];
  const doors = [];
  for (const side of sides) {
    const list = bySide[side];
    if (!list.length) continue;
    const w = (u) => Number(u.params?.width) || 0;
    const x = (u) => Number(u.position?.x_mm);
    const placed = list.every((u) => Number.isFinite(x(u)));
    // The span along the wall from panel B's outer face (the pocket's edge on
    // this side) to the far edge of the last covered unit; unplaced units add
    // their widths.
    const spanMm = placed
      ? (side === 'R'
        ? Math.max(...list.map((u) => x(u) + w(u))) - (px + pw)
        : px - Math.min(...list.map((u) => x(u))))
      : list.reduce((sum, u) => sum + w(u), 0);
    const last = list[list.length - 1];
    const ownEnd = (last.params?.end_panels || []).some((e) => (e?.side === 'R' ? 'R' : 'L') === side);
    const far = ownEnd ? 'endPanel' : (beyond?.[side] || 'none');
    doors.push({
      side,
      units: list.map((u) => u.id),
      unitNums: list.map((u) => String(u.params?.unit_num ?? u.id)),
      spanMm,
      KT1: Math.min(...list.map((u) => Number(u.params?.depth) || 0)),
      far,
      freeEndClearanceMm: farClearanceMm(far, profile),
      drawerFronts: list.filter(hasDrawerFronts).map((u) => String(u.params?.unit_num ?? u.id)),
    });
  }
  return doors.length ? { doors } : null;
}

const rectOf = (b) => boxOf(b);

/**
 * THE ONE DERIVATION. Every figure of a pocket and its doors, from the
 * pocket's ENGINE params (paramsForEngine): `params.pocket` (the owner's
 * choices), `params.pocket_cover` (pocketCoverOf: what the doors cover),
 * `params.height` (H), the front (S). A door is cut per covered side; with no
 * cover the pocket is cut and no door. computeCabinet publishes exactly this
 * as `result.hawa`; every reader reads it there.
 *
 * KIT_HAWA.lsp takes ONE span, one KT1 and one far for the pocket; the house
 * hands each door its own (a two-door pocket between cabinets of two depths).
 * Equal sides give the LISP's cut to the byte; unequal, each door is the LISP
 * at its own numbers and the pocket is as deep as the deeper door needs, never
 * deeper than the shallower cabinet.
 */
export function hawaPocketFigures(params, profile) {
  const K = hawaSpec(profile);
  const choice = pocketChoiceOf(params, profile);
  const { doors, hand, push } = choice;
  const frontT = frontTOf(params, profile);
  const S = frontT;
  const h = Number(params?.height) || 0;
  const dens = K.hawaDensity;
  const pt = panelT(frontT, K);
  const W = widthOf(doors, frontT, K);
  const EH = ehOf(doors, h, K);
  const TH = thOf(doors, h, K);
  const cover = Array.isArray(params?.pocket_cover?.doors) ? params.pocket_cover.doors : [];
  const sides = doors === 2 ? ['L', 'R'] : [hand];
  const refusals = [];
  const notes = [];
  const n47 = check47(frontT, K);
  if (n47) notes.push({ n: HAWA_CHECKS.PANEL_22, code: HAWA_CODES.PANEL_22, message: n47 });

  const doorsOut = [];
  for (const side of sides) {
    const c = cover.find((e) => e && (e.side === side || (doors === 1 && e.side == null)));
    if (!c) continue;
    const span = Number(c.spanMm) || 0;
    const far = c.freeEndClearanceMm != null ? Number(c.freeEndClearanceMm) : farClearanceMm(c.far || 'none', profile);
    const KT1 = Number(c.KT1) || Number(params?.depth) || 0;
    const TB = tbOf(doors, frontT, span, far, K);
    const [T1, M, E1, kt] = depthOf(doors, TB, KT1, S, K);
    const cls = classOf(TH, TB, S, dens, choice.cls, K);
    const r37 = check37(doors, TB, TH, S, dens, choice.cls, K);
    if (r37) refusals.push({ n: HAWA_CHECKS.OUT_OF_RANGE, code: HAWA_CODES.OUT_OF_RANGE, side, message: r37 });
    for (const unitNum of c.drawerFronts || []) {
      refusals.push({
        n: HAWA_CHECKS.OUT_OF_RANGE, code: HAWA_CODES.OUT_OF_RANGE, side, unit: unitNum, message: check37Cover(unitNum),
      });
    }
    const r38 = check38(doors, TB, KT1, S, K);
    if (r38) refusals.push({ n: HAWA_CHECKS.POCKET_DEPTH, code: HAWA_CODES.POCKET_DEPTH, side, message: r38 });
    doorsOut.push({
      id: doors === 2 ? `POCKET-DOOR-${side}` : 'POCKET-DOOR',
      side,
      covers: [...(c.units || [])],
      unitNums: [...(c.unitNums || [])],
      // HAWA's hand: the door covering the units on the right is the
      // left-hand set (the pocket on the door's left, "Anlage links").
      hawaHand: systemHand(side),
      setName: cls ? hawaSetName(cls, push, side) : null,
      push,
      spanMm: span,
      far: c.far || null,
      freeEndClearanceMm: far,
      TB,
      TH,
      S,
      cls,
      clsAsked: choice.cls,
      clsAuto: choice.cls == null,
      hinges: cls ? hingesOf(cls, K) : null,
      TA: taOf(doors, K),
      Zhinge: zOf(doors, K),
      Z1: K.hawaZ1,
      Z2: K.hawaZ2,
      proud: K.hawaZFront,
      T1,
      M,
      E1,
      KT1,
      ktOwn: kt,
      trackMm: trackLength(T1, K),
      steelMm: cls === 35 ? steelLength(TB, M, K) : null,
      weightKg: kgOf(TB, TH, S, dens),
      maxKg: cls ? allowedKg(cls, TH, TB) : null,
      // The edge that carries the cups, seen from the room: the pocket side.
      hingeEdge: doors === 2 ? (side === 'L' ? 'R' : 'L') : (hand === 'L' ? 'R' : 'L'),
      cupY: cls ? cupVs(cls, TH, K) : [],
      holes: cls ? doorHoles(doors, cls, TB, TH, M, K) : [],
      grooves: cls === 35 ? steelGrooves(TB, TH, M, K) : [],
    });
  }

  // The pocket's depth: the LISP's min(T1 + RE, KT1) for its door; with two
  // doors, the deeper door's T1 + RE, never past the shallower cabinet.
  let KT;
  if (!doorsOut.length) KT = Number(params?.depth) || 0;
  else if (doorsOut.length === 1) KT = doorsOut[0].ktOwn;
  else {
    KT = Math.min(Math.max(...doorsOut.map((d) => d.T1)) + K.hawaRear, Math.min(...doorsOut.map((d) => d.KT1)));
  }
  const KT1 = doorsOut.length ? Math.min(...doorsOut.map((d) => d.KT1)) : null;

  const tbs = doors === 2
    ? Object.fromEntries(doorsOut.map((d) => [d.side, d.TB]))
    : (doorsOut[0] ? { one: doorsOut[0].TB } : {});
  const parts = cutParts({
    doors, hand, frontT, h, kt: KT, tbs,
  }, K);
  for (const d of doorsOut) {
    const box = parts.find((p) => p[1] === d.id)[5];
    d.closed = rectOf(box);
    d.open = rectOf(openBox({
      doors, hand, side: d.side, frontT, h, kt: KT, e1: d.E1, tb: d.TB,
    }, K));
    delete d.ktOwn;
  }
  const doorOf = (id) => doorsOut.find((d) => d.id === id) || null;
  // Panel B carries the door that hangs on it: the one door, or in the
  // two-door pocket the door covering that side.
  const bDoor = (id) => (doors === 2 ? doorOf(id === 'POCKET-B-L' ? 'POCKET-DOOR-L' : 'POCKET-DOOR-R') : doorsOut[0] || null);
  const partsOut = parts.map(([part, id, w, hh, t, box]) => {
    let kind = 'door';
    let holes = [];
    let side = null;
    if (part === 'POCKET-BOTTOM') { kind = 'bottom'; holes = [footOf(doors, frontT, S, K)]; }
    if (part === 'POCKET-TOP') kind = 'top';
    if (part === 'POCKET-B') {
      kind = 'B';
      side = doors === 2 ? id.slice(-1) : hand;
      const d = bDoor(id);
      holes = d ? bHoles(d.T1, EH, K) : [];
    }
    if (part === 'POCKET-A') {
      kind = 'A';
      side = hand;
      const d = doorsOut[0];
      holes = d ? aHoles(S, d.T1, d.E1, EH, K) : [];
    }
    if (part === 'POCKET-DOOR') {
      const d = doorOf(id);
      side = d.side;
      holes = d.holes;
    }
    return {
      part, id, kind, side, w, h: hh, t, box: rectOf(box), holes,
      ...(part === 'POCKET-DOOR' ? { grooves: doorOf(id).grooves } : {}),
    };
  });

  return {
    count: doors,
    hand,
    push,
    clsAsked: choice.cls,
    covers: choice.covers,
    frontT,
    S,
    panel: { t: pt, swapped: panelSwapP(frontT, K) },
    clearMm: clearOf(doors, K),
    widthMm: W,
    H: h,
    EH,
    TH,
    KT,
    KT1,
    // How far the pocket's back stands in front of the covered cabinet's back,
    // so its front plane is theirs (KIT_HAWA.lsp D8: a pocket shallower than
    // the cabinet in the flush case). The store stands it off by this.
    frontAlignMm: KT1 == null ? 0 : KT1 - KT,
    connectorName: connectorName(doors),
    zones: { top: Number(profile?.hawa?.zoneTopMm), bottom: Number(profile?.hawa?.zoneBottomMm), hardware: K.hawaHardwareZone },
    parts: partsOut,
    doors: doorsOut,
    refusals,
    notes,
    ok: refusals.length === 0,
  };
}
