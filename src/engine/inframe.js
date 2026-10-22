/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── T80 · THE BRITISH FRAME, ONE BOARD PER RUN (reference/lisp/KIT_INFRAME.lsp)
//
// The owner, 21.10.2026: *"a co z british style kitchen z ramkami?"*; at 22:03
// *"raczej plyta"*, *"wszedzie ramke 38 mm"*, *"1 mm bedzie w srodku
// wystawac"*, *"ramka 25, drzwi 22"*, *"3 mm zawsze"*, *"jak podwojne drzwi to
// miedzy drzwiami nie ma ramki, tylko miedzy szafkami"*; at 22:14 *"wariant
// C"*, *"gora ... tak samo jak dol"*; at 22:40 *"3 per projekt"*.
//
// This module is KIT_INFRAME.lsp's mirror, routine for routine (section 4 of
// the kit): (a) the frame of a run, (b) the join, (c) the fronts inset, (d) the
// hinge column, (e) the end panel, the worktop and the filler. And one thing
// the kit leaves to the house: WHICH cabinets are a run. That is
// `engine/runs.js buildRuns`, the plinth's own grouping (one law, one path),
// cut into frame SEGMENTS at a unit the frame stops at.
//
// Pure functions: no store, no React. The numbers are profile.inframe's, the
// LISP's constants of the same names. Nothing here is reached by a lay-on
// project: the store asks `runFrameParams` only when design.inframe is true,
// and computeCabinet reads `params.inframe` / `params.run_frame` only when the
// store handed them in (paramsForEngine).

import { getUnitType } from './types.js';
import { buildRuns, unitBase, wallGapOf } from './runs.js';
import { sheetSizeForFamily } from './checks.js';

const EPS = 1e-6;
const r4 = (v) => Math.round(Number(v) * 10000) / 10000;

/** The owner's numbers (KIT_INFRAME.lsp section 3), off the profile. */
export function inframeSpec(profile) {
  const F = profile?.inframe || {};
  return {
    stile: Number(F.stile), rail: Number(F.rail), frameT: Number(F.frameT), frontT: Number(F.frontT),
    gap: Number(F.gap), outside: Number(F.outside), boardMax: Number(F.boardMax),
  };
}

// ═══ (a) THE FRAME OF A RUN ═══════════════════════════════════════════════

/** inframe-lip: what 38 leaves after two sides (D2). */
export function lipOf(bt, F) {
  return (F.stile - bt - bt) / 2;
}

/** inframe-lip-ok-p: a board over 19 is refused (a red Check), never a wider stile. */
export function lipOk(bt, F) {
  return lipOf(bt, F) >= 0;
}

/** inframe-outside: how far a rail stands outside the carcass (D3), 19. */
export function outsideOf(bt, F) {
  return F.rail - bt - lipOf(bt, F);
}

/** inframe-opening: one cabinet's opening in its OWN frame, [x0, y0, x1, y1]. */
export function openingOf(cab, F) {
  const lip = lipOf(cab.bt, F);
  return [cab.bt + lip, cab.bt + lip, cab.w - cab.bt - lip, cab.h - cab.bt - lip];
}

/** inframe-end-reach: how far the frame runs past the carcass's outer face (D6, D7, D8). */
export function endReach(end, bt, F) {
  if (end?.kind === 'PANEL') return F.stile - bt - lipOf(bt, F);
  if (end?.kind === 'OPEN') return lipOf(bt, F);
  return 0;
}

/** inframe-end-overhang: past an END PANEL's outer face (D6); negative = the panel proud. */
export function endOverhang(end, bt, F) {
  return endReach(end, bt, F) - (Number(end?.panel) || 0);
}

/**
 * inframe-frame: the frame of a run of cabinets `{ x0, w, h, y0, bt }` (x0
 * along the wall, y0 above the floor), with its two ends. Returns the frame's
 * corner along the wall and above the floor, its size and the openings in its
 * own coordinates (origin at its bottom-left corner), one per cabinet.
 */
export function frameOf(cabs, leftEnd, rightEnd, F) {
  const first = cabs[0];
  const last = cabs[cabs.length - 1];
  const fx0 = first.x0 - endReach(leftEnd, first.bt, F);
  const fx1 = last.x0 + last.w + endReach(rightEnd, last.bt, F);
  let fy0 = null;
  let fy1 = null;
  for (const c of cabs) {
    const lo = c.y0 - outsideOf(c.bt, F);
    const hi = c.y0 + c.h + outsideOf(c.bt, F);
    if (fy0 == null || lo < fy0) fy0 = lo;
    if (fy1 == null || hi > fy1) fy1 = hi;
  }
  const openings = cabs.map((c) => {
    const o = openingOf(c, F);
    return [r4(c.x0 + o[0] - fx0), r4(c.y0 + o[1] - fy0), r4(c.x0 + o[2] - fx0), r4(c.y0 + o[3] - fy0)];
  });
  return { fx0: r4(fx0), fy0: r4(fy0), w: r4(fx1 - fx0), h: r4(fy1 - fy0), openings };
}

/** inframe-stiles: left to right, the outer one, one between each two cabinets, the outer one. */
export function stilesOf(frame) {
  const out = [];
  let prev = 0;
  for (const o of frame.openings) { out.push(r4(o[0] - prev)); prev = o[2]; }
  out.push(r4(frame.w - prev));
  return out;
}

/** inframe-rails: one opening's (bottom, top). */
export function railsOf(frame, o) {
  return [r4(o[1]), r4(frame.h - o[3])];
}

/** inframe-gaps: the gaps between neighbours (D5), 0 when butted. */
export function gapsOf(cabs) {
  const out = [];
  for (let i = 1; i < cabs.length; i += 1) out.push(r4(cabs[i].x0 - (cabs[i - 1].x0 + cabs[i - 1].w)));
  return out;
}

/** inframe-cutout: an opening as the DXF writes a cut-out pocket (D10), clockwise. */
export function cutoutOf(o) {
  return [[o[0], o[3]], [o[2], o[3]], [o[2], o[1]], [o[0], o[1]]];
}

// ═══ (b) THE JOIN ═════════════════════════════════════════════════════════

/** inframe-join-candidates: the centre line of every stile between two cabinets. */
export function joinCandidates(frame) {
  const out = [];
  for (let i = 1; i < frame.openings.length; i += 1) out.push(r4((frame.openings[i - 1][2] + frame.openings[i][0]) / 2));
  return out;
}

/** inframe-join-from: { pieces, longest, cuts } for the stretch from..w, or null when no stile is in reach (D9). */
export function joinFrom(from, w, cands, lmax) {
  if (w - from <= lmax + EPS) return { pieces: 1, longest: r4(w - from), cuts: [] };
  let best = null;
  for (const c of cands) {
    if (!(c > from + EPS) || c - from > lmax + EPS) continue;
    const sub = joinFrom(c, w, cands, lmax);
    if (!sub) continue;
    const tryIt = { pieces: sub.pieces + 1, longest: r4(Math.max(c - from, sub.longest)), cuts: [c, ...sub.cuts] };
    if (!best || tryIt.pieces < best.pieces || (tryIt.pieces === best.pieces && tryIt.longest < best.longest - EPS)) best = tryIt;
  }
  return best;
}

/** inframe-join: the whole frame against the board. */
export function joinOf(frame, lmax) {
  return joinFrom(0, frame.w, joinCandidates(frame), lmax);
}

/**
 * T80 F4 · THE BOARD A PIECE MUST FIT: the owner's 2800 (profile.inframe.
 * boardMax), and never longer than the sheet the workshop chose for its
 * FRONTS (the frame is front material; checks.js sheetSizeForFamily). A frame
 * longer than that sheet is the LISP's join (b), never a layout refusal
 * (CLAUDE.md T80 F4). The frame's height lies across the sheet's short side
 * when it fits there, else along its long side.
 */
export function joinLimit(profile, frameH) {
  const F = inframeSpec(profile);
  const sheet = sheetSizeForFamily(profile, 'fronts') || {};
  const long = Math.max(Number(sheet.width) || 0, Number(sheet.height) || 0);
  const short = Math.min(Number(sheet.width) || 0, Number(sheet.height) || 0);
  if (!(long > 0)) return F.boardMax;
  const along = frameH <= short + EPS ? long : (frameH <= long + EPS ? short : long);
  return Math.min(F.boardMax, along);
}

/** inframe-pieces: [[from, to], ...]. */
export function piecesOf(w, cuts) {
  const out = [];
  let prev = 0;
  for (const c of cuts) { out.push([prev, c]); prev = c; }
  out.push([prev, w]);
  return out;
}

/** inframe-piece-names: FRAME, or FRAME-1 .. FRAME-n. */
export function pieceNames(n) {
  if (n === 1) return ['FRAME'];
  return Array.from({ length: n }, (_, i) => `FRAME-${i + 1}`);
}

// ═══ (c) THE FRONTS INSET ═════════════════════════════════════════════════

const overlap = (a0, a1, b0, b1) => a1 > b0 + EPS && a0 < b1 - EPS;

/** inframe-front: one lay-on front `f` [x0, y0, x1, y1] of `fronts`, set in the opening `o` with the gap `g` (D11). */
export function insetFront(f, fronts, o, g) {
  const half = g / 2;
  let [x0, y0, x1, y1] = [o[0] + g, o[1] + g, o[2] - g, o[3] - g];
  for (const n of fronts) {
    if (n === f) continue;
    if (n[2] <= f[0] + EPS && overlap(n[1], n[3], f[1], f[3])) x0 = Math.max(x0, (n[2] + f[0]) / 2 + half);
    if (n[0] >= f[2] - EPS && overlap(n[1], n[3], f[1], f[3])) x1 = Math.min(x1, (n[0] + f[2]) / 2 - half);
    if (n[3] <= f[1] + EPS && overlap(n[0], n[2], f[0], f[2])) y0 = Math.max(y0, (n[3] + f[1]) / 2 + half);
    if (n[1] >= f[3] - EPS && overlap(n[0], n[2], f[0], f[2])) y1 = Math.min(y1, (n[1] + f[3]) / 2 - half);
  }
  return [r4(x0), r4(y0), r4(x1), r4(y1)];
}

/** inframe-fronts: every front of a cabinet, inset. */
export function insetFronts(o, fronts, g) {
  return fronts.map((f) => insetFront(f, fronts, o, g));
}

/** inframe-front-planes: the inset front's back and face, from the carcass front (D12). */
export function frontPlanes(F) {
  return [F.frameT - F.frontT, F.frameT];
}

// ═══ (d) THE HINGE ON THE SIDE ════════════════════════════════════════════

/** inframe-plate-setback: frontT + inset, less what the door stands forward of the carcass (D13). */
export function plateSetback(frontT, inset, frameT) {
  return r4(frontT + inset - (frameT - frontT));
}

/** inframe-cup-clear-p: the cup's edge stands K + g off the lip, never under 3 (D13). */
export function cupClear(k, g, F) {
  return k + g >= F.gap - EPS;
}

// ═══ (e) THE END PANEL, THE WORKTOP, THE FILLER ═══════════════════════════

/** inframe-end-panel-depth (D14). */
export const endPanelDepth = (d, F) => d + F.frameT;

/** inframe-end-panel-grow (D14): [top, bottom]. */
export const endPanelGrow = (bt, wallUnit, F) => (wallUnit ? [outsideOf(bt, F), outsideOf(bt, F)] : [outsideOf(bt, F), 0]);

/** inframe-worktop-lift (D15). */
export const worktopLift = (bt, F) => outsideOf(bt, F);

/** inframe-filler (D15): [height, length], a note and never a board. */
export const fillerOf = (bt, runW, F) => [outsideOf(bt, F), runW];

/** The joiner's note for a run's filler (CLAUDE.md T80 F8), its words. */
export function fillerNote(lengthMm, F) {
  return `Site filler ${F.outside} mm x ${Math.round(lengthMm)} under the worktop (joiner, not supplied)`;
}

// ═══ THE RUN, AS THE HOUSE GROUPS IT ══════════════════════════════════════

/** Does a frame stand on this unit type this turn (profile.inframe.unitTypes)? */
export function framedType(typeId, profile) {
  return (profile?.inframe?.unitTypes || []).includes(typeId);
}

/** The carcass board of a unit: its own board_t, else the profile's. */
function boardOf(unit, profile) {
  const own = Number(unit?.params?.board_t);
  return own > 0 ? own : Number(profile?.board?.thickness) || 18;
}

/** The end panel a unit carries on one side, its thickness (ep.thickness, else front_t), or null. */
function endPanelOn(unit, side) {
  const ep = (unit?.params?.end_panels || []).find((e) => (side === 'R' ? e?.side === 'R' : e?.side !== 'R'));
  if (!ep) return null;
  const t = Number(ep.thickness) > 0 ? Number(ep.thickness) : Number(unit?.params?.front_t) || 0;
  return t;
}

/** Where a unit's carcass front stands off its wall: its gap plus its depth. */
const frontPlaneOf = (unit, profile) => wallGapOf(unit, profile) + (Number(unit?.params?.depth) || 0);

/**
 * The frame SEGMENTS of one run (buildRuns's own, never a second grouping):
 * maximal stretches of framed units whose carcass fronts stand on one line.
 * A unit the frame stops at closes the segment (D8, Check #42), and so does a
 * front that steps off the line (the frame is one flat board).
 *
 * @returns {Array<{units, left, right, stops}>} each segment with its two ends
 *   ({ kind: 'PANEL'|'OPEN'|'SPLIT', panel, by }) and the units it stopped at
 */
export function frameSegments(run, profile) {
  const out = [];
  let current = [];
  const close = () => { if (current.length) out.push(current); current = []; };
  for (const unit of run.units) {
    if (!framedType(unit.type, profile)) { close(); continue; }
    if (current.length) {
      const prev = current[current.length - 1];
      if (Math.abs(frontPlaneOf(prev, profile) - frontPlaneOf(unit, profile)) > 0.5) close();
    }
    current.push(unit);
  }
  close();
  return out.map((units) => {
    const first = units[0];
    const last = units[units.length - 1];
    const i0 = run.units.indexOf(first);
    const i1 = run.units.indexOf(last);
    const before = i0 > 0 ? run.units[i0 - 1] : null;
    const after = i1 < run.units.length - 1 ? run.units[i1 + 1] : null;
    const end = (unit, side, neighbour) => {
      const panel = endPanelOn(unit, side);
      if (panel != null) return { kind: 'PANEL', panel };
      if (neighbour) {
        const why = framedType(neighbour.type, profile) ? 'line' : 'type';
        return { kind: 'SPLIT', panel: 0, by: neighbour.id, why };
      }
      return { kind: 'OPEN', panel: 0 };
    };
    return { units, left: end(first, 'L', before), right: end(last, 'R', after) };
  });
}

/** One unit as the kit's cabinet: x0 along the wall, y0 above the floor. */
export function cabOf(unit, profile) {
  return {
    id: unit.id,
    x0: Number(unit.position?.x_mm) || 0,
    w: Number(unit.params?.width) || 0,
    h: Number(unit.params?.height) || 0,
    y0: unitBase(unit, profile),
    bt: boardOf(unit, profile),
  };
}

/**
 * The FRAME element of one segment: the geometry the owner cuts (its first
 * unit, as the plinth's), in the OWNER's frame: `offset` along its width from
 * its left side's outer face, `dy` from its carcass bottom.
 */
export function segmentFrame(segment, profile) {
  const F = inframeSpec(profile);
  const cabs = segment.units.map((u) => cabOf(u, profile));
  const frame = frameOf(cabs, segment.left, segment.right, F);
  const limit = joinLimit(profile, frame.h);
  const join = joinOf(frame, limit);
  const cuts = join ? join.cuts : [];
  const names = pieceNames(cuts.length + 1);
  const pieces = piecesOf(frame.w, cuts).map(([from, to], i) => ({ name: names[i], from: r4(from), to: r4(to) }));
  const owner = cabs[0];
  const gaps = gapsOf(cabs);
  return {
    role: 'owner',
    offset: r4(frame.fx0 - owner.x0),
    dy: r4(frame.fy0 - owner.y0),
    width: frame.w,
    height: frame.h,
    frameT: F.frameT,
    openings: frame.openings.map((o, i) => ({ unitId: cabs[i].id, x0: o[0], y0: o[1], x1: o[2], y1: o[3] })),
    stiles: stilesOf(frame),
    gaps,
    pieces,
    joined: pieces.length > 1,
    joinRefused: !join,
    limit,
    unitIds: cabs.map((c) => c.id),
    // T80 F4 · the run's name on the label: its cabinets' own names, left to right.
    unitNums: segment.units.map((u) => String(u.params?.unit_num ?? '')),
    ends: { left: segment.left, right: segment.right },
    overhang: {
      left: segment.left.kind === 'PANEL' ? r4(endOverhang(segment.left, cabs[0].bt, F)) : null,
      right: segment.right.kind === 'PANEL' ? r4(endOverhang(segment.right, cabs[cabs.length - 1].bt, F)) : null,
    },
    // The carcasses' own span, for the joiner's filler note (D15).
    runWidth: r4(cabs[cabs.length - 1].x0 + cabs[cabs.length - 1].w - cabs[0].x0),
    mount: getUnitType(segment.units[0].type)?.mount || 'floor',
    boards: [...new Set(cabs.map((c) => c.bt))],
  };
}

/**
 * The `run_frame` value for EVERY unit, the plinth's twin (runs.js
 * runPlinthParams): the owner of each segment carries the frame, every other
 * framed unit a note naming it, every unit the frame stops at nothing.
 * Asked only for an in-frame project; a lay-on project never reaches here.
 *
 * @returns {Map<string, object|null>} unit id -> the element
 */
export function runFrameParams(units, profile) {
  const out = new Map(units.map((u) => [u.id, null]));
  for (const run of buildRuns(units, profile)) {
    for (const segment of frameSegments(run, profile)) {
      const element = segmentFrame(segment, profile);
      out.set(segment.units[0].id, element);
      for (const u of segment.units.slice(1)) out.set(u.id, { role: 'member', ownerId: segment.units[0].id });
    }
  }
  return out;
}
