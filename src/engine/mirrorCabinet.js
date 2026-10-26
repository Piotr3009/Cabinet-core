/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T83 F2 . THE MIRROR CABINET'S ARITHMETIC (reference/lisp/KIT_MIRROR.lsp)
//
// The owner, 25.10.2026 (14:09): *"teraz zaprojektujmy dokladnie to co masz
// na rysunku szafka wiszaca"*; *"lustro opcjonalnie, wtedy pamietaj ze
// drzwiczki 18 plus 4 mm lustro, przedluzamy panele do grubosci drzwiczek i
// lustra"*; (14:14) *"panele led trzeba bedzie zamontowac na rowno z
// drzwiami, nie wcisniete, mamy carcas w srodku i panele dookola tego"*;
// (22:41) *"daj wszystkie mozliwosci z panelami, z ledami, bez, szerokosc
// ustawianych drzwiczek etc"*.
//
// LISP IS LAW. This module is KIT_MIRROR.lsp part 5's mirror, routine for
// routine and in the same argument order (mirror-zones is mirrorZones, a LISP
// list is an array, nil a null or an empty array, T a true), and
// test/turn83-f02-mirror-kit.test.js runs both on the same inputs and holds
// them equal. `mirrorCabinetFigures` is the ONE derivation computeCabinet cuts
// from (`carcass.top === 'mirror'`, KIT_MIRROR D1 to D21): every part of the
// kit, its holes, its sentences and `derived.mirror`, the record the room,
// the BOM, the right panel and the sheets read. Pure: no store, no React.
//
// THE FRAME (the LISP's): x from the cabinet's left face (the left panel's
// outer face), y up from its underside (the bottom panel's underside), z from
// the carcass's back plane (the BACK's back face) towards the room.

import HINGE_COUNT from '../../reference/hardware/cliptop-hinge-count.json' with { type: 'json' };
import { biscuitLayers, biscuitSets } from './biscuits.js';
import { metres, roundTo } from './format.js';
import { partitionBackScrewRun, partitionBackSpec } from './partitionFixings.js';
import {
  backPanelGeometry, rectGeometry, resolvedJointInset, sidePanelGeometry, topPanelGeometry,
} from './puzzle.js';

// ─── THE CONSTANTS: KIT_MIRROR.lsp parts 3 and 4, read off the profile ──────

/**
 * Every number the routines compute with, read off the profile (part 3 is
 * profile.mirror, part 4 the parent's numbers as the house cuts them) and the
 * Blum CLIP top table. One object, so a routine never reaches for a number of
 * its own.
 */
export function mirrorConstants(profile) {
  const M = profile.mirror;
  const cups = profile.hinges.cups.baseOffsets;
  return {
    gap: profile.doors.gap,
    topDemand: profile.doors.gap,
    cupBottom: cups.bottom,
    cupUpperFromTop: cups.upperFromTop,
    cupTopFromTop: cups.topFromTop,
    plateFromFront: profile.hinges.xFromFrontEdge,
    platePair: profile.hinges.holePairOffset,
    pinColumn: profile.shelfHoles.columnFromEdge,
    pinD: profile.shelfHoles.diameter,
    pinLayer: profile.shelfHoles.layer,
    pinCluster: [...profile.shelfHoles.clusterOffsets],
    shelfWidthClear: profile.carcass.shelfWidthClearance,
    shelfFrontClear: profile.carcass.shelfDepthClearance,
    hangerFromBack: [...profile.wallUnit.hangers.fromBackEdge],
    hangerFromTop: profile.wallUnit.hangers.fromTop,
    hangerHoleD: profile.wallUnit.hangers.holeDiameter,
    hangerLayer: profile.wallUnit.hangers.layer,
    hangerCutW: profile.wallUnit.hangers.cutoutWidth,
    hangerCutH: profile.wallUnit.hangers.cutoutHeight,
    hangerCutLayer: profile.wallUnit.hangers.cutoutLayer,
    blumBands: HINGE_COUNT.bands.map((b) => [b.maxHeightMm, b.maxWeightKg, b.hinges]),
    blumBeyond: HINGE_COUNT._beyond_the_table.hinges,
    doorWidths: [...M.defaults.doorWidths],
    doorBoard: M.doorBoardMm,
    mirrorT: M.mirrorMm,
    glassShelf: M.glassShelfMm,
    bottomBox: M.bottomBoxMm,
    minDoor: M.minDoorMm,
    boardKgM3: M.boardKgM3,
    mirrorKgM2: M.mirrorKgM2,
  };
}

// ─── PART 5: THE ROUTINES, ONE FOR ONE ──────────────────────────────────────

/** mirror-mm: a figure for a sentence, 45 or 45.5. */
export function mirrorMm(v) {
  return v === Math.trunc(v) ? String(Math.trunc(v)) : Number(v).toFixed(1);
}

/** mirror-sum */
export function mirrorSum(lst) {
  let s = 0;
  for (const v of lst || []) s += v;
  return s;
}

// (a) THE CABINET AND ITS PANELS ROUND

/** mirror-carcass: (x0 y0 Wc Hc) inside the panels that are on (D2). */
export function mirrorCarcass(W, H, onL, onR, onT, onB, pt) {
  const x0 = onL ? pt : 0;
  const y0 = onB ? pt : 0;
  return [x0, y0, W - x0 - (onR ? pt : 0), H - y0 - (onT ? pt : 0)];
}

/** mirror-face-t: the board and the mirror on it (D9). */
export function mirrorFaceT(doorT, mirrorOn, K) {
  return doorT + (mirrorOn ? K.mirrorT : 0);
}

/** mirror-panel-depth: the back plane to the doors' face (D3). */
export function mirrorPanelDepth(D, faceT) {
  return D + faceT;
}

/** mirror-panels: ((name x y z w h d) ...) for the panels that are on (D3). */
export function mirrorPanels(W, H, D, faceT, onL, onR, onT, onB, pt) {
  const dp = mirrorPanelDepth(D, faceT);
  const xa = onL ? pt : 0;
  const xb = onR ? W - pt : W;
  const out = [];
  if (onL) out.push(['PANEL-L', 0, 0, 0, pt, H, dp]);
  if (onR) out.push(['PANEL-R', W - pt, 0, 0, pt, H, dp]);
  if (onT) out.push(['PANEL-TOP', xa, H - pt, 0, xb - xa, pt, dp]);
  if (onB) out.push(['PANEL-BOTTOM', xa, 0, 0, xb - xa, pt, dp]);
  return out;
}

// (b) THE CARCASS, THE PARENT'S FIVE BOARDS

/** mirror-carcass-boards (D1). */
export function mirrorCarcassBoards(x0, y0, Wc, Hc, D, G) {
  return [
    ['BUL', x0, y0, G, G, Hc, D - G],
    ['BUR', x0 + Wc - G, y0, G, G, Hc, D - G],
    ['TOP', x0 + G, y0 + Hc - G, G, Wc - G - G, G, D - G],
    ['BOTTOM', x0 + G, y0, G, Wc - G - G, G, D - G],
    ['BACK', x0, y0, 0, Wc, Hc, G],
  ];
}

// (c) THE BOTTOM BOX

/** mirror-box-h (D12). */
export function mirrorBoxH(boxOn, K) {
  return boxOn ? K.bottomBox : 0;
}

/** mirror-box-lid: the FIX board over the box (D12). */
export function mirrorBoxLid(x0, y0, Wc, D, G, boxH) {
  return boxH > 0 ? ['BOX-TOP', x0 + G, y0 + boxH - G, G, Wc - G - G, G, D - G] : null;
}

/** mirror-box-front: the strip in the doors' board plane (D12). */
export function mirrorBoxFront(x0, y0, Wc, D, doorT, boxH, K) {
  return boxH > 0 ? ['BOX-FRONT', x0 + K.gap / 2, y0, D, Wc - K.gap, boxH - K.gap, doorT] : null;
}

/** mirror-floor: the box's top, else the BOTTOM's top face. */
export function mirrorFloor(y0, G, boxH) {
  return boxH > 0 ? y0 + boxH : y0 + G;
}

/** mirror-ceiling: the TOP's underside. */
export function mirrorCeiling(y0, Hc, G) {
  return y0 + Hc - G;
}

/** mirror-door-y and mirror-door-h (D13). */
export function mirrorDoorY(y0, boxH) {
  return y0 + boxH;
}
export function mirrorDoorH(Hc, boxH, K) {
  return Hc - boxH - K.topDemand;
}

// (d) THE FACE: DOORS, STILES, DIVIDERS

/** mirror-stile-kinds: one a divider when given, else the one kind (D8). */
export function mirrorStileKinds(bays, kind, kinds) {
  if (Array.isArray(kinds) && kinds.length && kinds.length === bays - 1) return [...kinds];
  const out = [];
  for (let i = 1; i < bays; i += 1) out.push(kind);
  return out;
}

/** mirror-stile-w */
export function mirrorStileW(k, sw) {
  return k === 'none' ? 0 : sw;
}

/** mirror-stile-ws and mirror-stiles-total */
export function mirrorStileWs(kinds, sw) {
  return (kinds || []).filter((k) => k !== 'none').map(() => sw);
}
export function mirrorStilesTotal(kinds, sw) {
  return mirrorSum(mirrorStileWs(kinds, sw));
}

/** mirror-widths-fit-p (D4, D5). */
export function mirrorWidthsFitP(Wc, bays, widths, kinds, sw, K) {
  let ok = Array.isArray(widths) && widths.length > 0 && widths.length === bays;
  if (ok) for (const v of widths) if (v <= K.gap) ok = false;
  return ok ? Math.abs((mirrorSum(widths) + mirrorStilesTotal(kinds, sw)) - Wc) <= 0.01 : false;
}

/** mirror-own-widths (D6). */
export function mirrorOwnWidths(Wc, bays, kinds, sw, K) {
  const own = K.doorWidths;
  if (mirrorWidthsFitP(Wc, bays, own, kinds, sw, K)) return [...own];
  const each = (Wc - mirrorStilesTotal(kinds, sw)) / bays;
  const out = [];
  for (let i = 0; i < bays; i += 1) out.push(each);
  return out;
}

/** mirror-widths (D5, D6). */
export function mirrorWidths(Wc, bays, widths, kinds, sw, K) {
  return mirrorWidthsFitP(Wc, bays, widths, kinds, sw, K) ? [...widths] : mirrorOwnWidths(Wc, bays, kinds, sw, K);
}

/** mirror-zones: ("DOOR" from to), ("STILE" from to), ("JOINT" x x) (D4, D8). */
export function mirrorZones(x0, widths, kinds, sw) {
  let x = x0;
  const out = [];
  widths.forEach((w, i) => {
    out.push(['DOOR', x, x + w]);
    x += w;
    if (i < kinds.length) {
      const k = kinds[i];
      if (k === 'none') out.push(['JOINT', x, x]);
      else {
        out.push(['STILE', x, x + sw]);
        x += sw;
      }
    }
  });
  return out;
}

/** mirror-hands (D9). */
export function mirrorHands(bays, hands) {
  if (Array.isArray(hands) && hands.length && hands.length === bays) return [...hands];
  if (bays === 1) return ['L'];
  if (bays === 2) return ['L', 'R'];
  const out = ['R'];
  for (let i = 1; i < bays; i += 1) out.unshift('L');
  return out;
}

/** mirror-doors: ((idx x y z w h d hand) ...) (D4, D9, D13). */
export function mirrorDoors(zones, yD, hD, D, faceT, hands, K) {
  const out = [];
  let i = 0;
  for (const z of zones) {
    if (z[0] !== 'DOOR') continue;
    out.push([i + 1, z[1] + K.gap / 2, yD, D, z[2] - z[1] - K.gap, hD, faceT, hands[i]]);
    i += 1;
  }
  return out;
}

/** mirror-stiles: ((idx kind x y z w h d) ...) (D8). */
export function mirrorStiles(zones, kinds, yD, hD, D, faceT) {
  const out = [];
  let i = 0;
  for (const z of zones) {
    if (z[0] === 'STILE') {
      out.push([i + 1, kinds[i], z[1], yD, D, z[2] - z[1], hD, faceT]);
      i += 1;
    } else if (z[0] === 'JOINT') i += 1;
  }
  return out;
}

/** mirror-dividers: ((idx x y z w h d) ...) (D7). */
export function mirrorDividers(zones, bf, bc, D, G) {
  const out = [];
  let i = 0;
  for (const z of zones) {
    if (z[0] !== 'STILE' && z[0] !== 'JOINT') continue;
    const c = (z[1] + z[2]) / 2;
    i += 1;
    out.push([i, c - G / 2, bf, G, G, bc - bf, D - G]);
  }
  return out;
}

/** mirror-bays: ((idx from to) ...) (D14). */
export function mirrorBays(x0, Wc, G, dividers) {
  const out = [];
  let from = x0 + G;
  let i = 1;
  for (const dv of dividers) {
    out.push([i, from, dv[1]]);
    from = dv[1] + G;
    i += 1;
  }
  out.push([i, from, x0 + Wc - G]);
  return out;
}

// (e) THE WEIGHT AND THE HINGES

/** mirror-door-kg (D10). */
export function mirrorDoorKg(dw, dh, doorT, mirrorOn, K) {
  const a = (dw * dh) / 1000000;
  return K.boardKgM3 * (doorT / 1000) * a + (mirrorOn ? K.mirrorKgM2 * a : 0);
}

/** mirror-hinge-band: (max height, max kg, hinges), or null past the table. */
export function mirrorHingeBand(dh, kg, K) {
  return K.blumBands.find((b) => dh <= b[0] && kg <= b[1]) || null;
}

/** mirror-hinge-count (D10). */
export function mirrorHingeCount(dh, kg, K) {
  const b = mirrorHingeBand(dh, kg, K);
  return b ? b[2] : K.blumBeyond;
}

/** mirror-cups: up from the door's foot (D10). */
export function mirrorCups(dh, n, K) {
  if (n === 2) return [K.cupBottom, dh - K.cupTopFromTop];
  if (n === 3) return [K.cupBottom, dh - K.cupUpperFromTop, dh - K.cupTopFromTop];
  const sp = (dh - K.cupTopFromTop - K.cupBottom) / (n - 1);
  const out = [];
  for (let k = 0; k < n; k += 1) out.push(K.cupBottom + sp * k);
  return out;
}

/** mirror-hinge-board: the board and the face of it the plates are on (D9). */
export function mirrorHingeBoard(idx, bays, hand) {
  if (hand === 'L') return idx === 1 ? ['BUL', 'R'] : [`DIVIDER-${idx - 1}`, 'R'];
  return idx === bays ? ['BUR', 'L'] : [`DIVIDER-${idx}`, 'L'];
}

/** mirror-board-span: (bx0 bx1) of that board (D11). */
export function mirrorBoardSpan(board, x0, Wc, G, dvs) {
  if (board === 'BUL') return [x0, x0 + G];
  if (board === 'BUR') return [x0 + Wc - G, x0 + Wc];
  const dv = (dvs || []).find((d) => board === `DIVIDER-${d[0]}`);
  return dv ? [dv[1], dv[1] + dv[4]] : null;
}

/** mirror-overlay: how far the door covers its board; negative, it stands off (D11). */
export function mirrorOverlay(door, hand, bx0, bx1) {
  return hand === 'L' ? bx1 - door[1] : door[1] + door[4] - bx0;
}

/** mirror-plate-ys: two pilots a cup, 16 either side, in the board's own frame (D10). */
export function mirrorPlateYs(cups, doorY, boardY, K) {
  const out = [];
  for (const c of cups) {
    out.push(((doorY + c) - boardY) - K.platePair);
    out.push(((doorY + c) - boardY) + K.platePair);
  }
  return out;
}

/** mirror-plate-x: BUL and a divider's left face 37, BUR and its right face depth - 37 (D10). */
export function mirrorPlateX(board, face, depth, K) {
  if (board === 'BUL') return K.plateFromFront;
  if (board === 'BUR') return depth - K.plateFromFront;
  if (face === 'L') return K.plateFromFront;
  return depth - K.plateFromFront;
}

/** mirror-reach-note (D11). */
export function mirrorReachNote(num, idx, board, overlay) {
  if (!(overlay < 0)) return null;
  return `${num}: door ${Math.trunc(idx)} hangs on ${board} and stands ${mirrorMm(-overlay)} mm off its face: `
    + 'the hinge that reaches it is the owner\'s to name.';
}

// (f) THE GLASS SHELVES AND THEIR PINS

/** mirror-shelf-ys: n undersides spaced evenly (D14). */
export function mirrorShelfYs(bf, bc, n) {
  const sp = (bc - bf) / (n + 1);
  const out = [];
  for (let i = 1; i <= n; i += 1) out.push(bf + sp * i);
  return out;
}

/** mirror-shelf-depth (D14, D15). */
export function mirrorShelfDepth(D, G, backOn, K) {
  return D - G - K.shelfFrontClear - (backOn ? K.mirrorT : 0);
}

/** mirror-shelf: (x y z w h d) in bay b at y (D14). */
export function mirrorShelf(b, y, D, G, backOn, K) {
  const sd = mirrorShelfDepth(D, G, backOn, K);
  return [b[1] + K.shelfWidthClear / 2, y, D - K.shelfFrontClear - sd, b[2] - b[1] - K.shelfWidthClear, K.glassShelf, sd];
}

/** mirror-shelf-fits-p (D14). */
export function mirrorShelfFitsP(y, bf, bc, K) {
  return y >= bf && y + K.glassShelf <= bc;
}

/** mirror-pin-ys: three a shelf, each row once, on the board's own frame (D14). */
export function mirrorPinYs(ys, boardY, boardH, K) {
  const out = [];
  for (const y of ys) {
    for (const dy of K.pinCluster) {
      const v = (y + dy) - boardY;
      if (v >= 0 && v <= boardH && !out.includes(v)) out.push(v);
    }
  }
  return out;
}

/** mirror-pin-xs: 70 from the front and the back edge. */
export function mirrorPinXs(depth, K) {
  return [K.pinColumn, depth - K.pinColumn];
}

// (g) THE BACK'S MIRROR

/** mirror-back-panes: one a bay on the BACK's inside face (D15). */
export function mirrorBackPanes(bays, bf, bc, G, K) {
  return bays.map((b) => [b[0], b[1], bf, G, b[2] - b[1], bc - bf, K.mirrorT]);
}

// (h) THE HANGERS, THE LIGHT, THE RECESS

/** mirror-hanger-holes: ((x y) ...) in the side's own frame (D18). */
export function mirrorHangerHoles(board, sideW, Hc, K) {
  return K.hangerFromBack.map((f) => [board === 'BUL' ? sideW - f : f, Hc - K.hangerFromTop]);
}

/** mirror-hanger-cuts: the BACK's two cut-outs, ((x1 y1 x2 y2) ...) (D18). */
export function mirrorHangerCuts(Wc, Hc, K) {
  return [
    [0, Hc - K.hangerCutH, K.hangerCutW, Hc],
    [Wc - K.hangerCutW, Hc - K.hangerCutH, Wc, Hc],
  ];
}

/** mirror-in-cut-p: does a hole stand in one of the cut-outs (D18)? */
export function mirrorInCutP(x, y, cuts) {
  return (cuts || []).some((c) => x > c[0] && x < c[2] && y > c[1] && y < c[3]);
}

/** mirror-led-under-length, mirror-led-inside-length, mirror-led-inside-z (D16). */
export function mirrorLedUnderLength(Wc, G) {
  return Wc - G - G;
}
export function mirrorLedInsideLength(bf, bc) {
  return bc - bf;
}
export function mirrorLedInsideZ(D, K) {
  return D - K.shelfFrontClear / 2;
}

/** mirror-proud and mirror-face-proud (D17). */
export function mirrorProud(D, recess) {
  return D - recess;
}
export function mirrorFaceProud(D, faceT, recess) {
  return (D + faceT) - recess;
}

// (i) THE REFUSAL

/** mirror-list-mm: 330 + 480 + 330. */
export function mirrorListMm(lst) {
  return lst && lst.length ? lst.map(mirrorMm).join(' + ') : 'none';
}

/** mirror-widths-refusal: typed widths that do not fill the carcass, in words, or null (D5). */
export function mirrorWidthsRefusal(num, Wc, bays, widths, kinds, sw, K) {
  if (!Array.isArray(widths) || !widths.length) return null;
  if (mirrorWidthsFitP(Wc, bays, widths, kinds, sw, K)) return null;
  const tail = ' The doors are cut at the kit\'s own widths.';
  if (widths.length !== bays) {
    return `${num}: ${widths.length} door widths for ${Math.trunc(bays)} bays: type one width a bay.${tail}`;
  }
  if (widths.some((v) => v <= K.gap)) {
    return `${num}: a door ${mirrorMm(K.gap)} wide or less is no door: type every width wider than ${mirrorMm(K.gap)}.${tail}`;
  }
  const ws = mirrorStileWs(kinds, sw);
  return `${num}: the door widths ${mirrorListMm(widths)}${ws.length ? ` and the stiles ${mirrorListMm(ws)}` : ''}`
    + ` make ${mirrorMm(mirrorSum(widths) + mirrorStilesTotal(kinds, sw))}, the carcass is ${mirrorMm(Wc)} wide: `
    + `type door widths that make ${mirrorMm(Wc)} with the stiles.${tail}`;
}

/**
 * mirror-balance-widths (KIT_MIRROR.lsp D5a, the owner 26.10.2026): the door
 * widths as the panel hands them to the kit, always filling the carcass.
 *
 * `widths` are the doors as they stand (one a bay); `order` the bays typed
 * so far, the longest ago first, each one HELD at its number; `bay` and
 * `mm` the one typed now (bay null: nothing typed, the stiles or the panels
 * moved under the held doors). The typed door keeps its number; the free
 * doors share what is left of `room` (the carcass less the stiles) to the
 * tenth of a millimetre, the last free door taking the rest so the sum is
 * exact; when there is no free door, or the free ones would fall under
 * `minDoor`, the held door typed longest ago is set free, then the next.
 * The typed number is never set free: when it alone leaves the other doors
 * less than `minDoor` each it is refused, with the most it can be.
 *
 * @returns {{ widths: number[], order: number[], freed: number[], refused: null }
 *          | { refused: string, most: number }}
 */
export function mirrorBalanceWidths(room, bays, widths, order, bay, mm, minDoor) {
  const n = Math.max(1, Math.trunc(bays));
  const base = Array.isArray(widths) && widths.length === n ? widths.map(Number) : null;
  const w = base ? [...base] : Array.from({ length: n }, () => room / n);
  let held = (Array.isArray(order) ? order : []).map((i) => Math.trunc(Number(i)))
    .filter((i, k, a) => i >= 0 && i < n && a.indexOf(i) === k);
  const tenth = (v) => Math.floor(v * 10 + 1e-6) / 10;
  if (bay != null) {
    const i = Math.trunc(Number(bay));
    const most = room - (n - 1) * minDoor;
    if (n === 1 && Math.abs(Number(mm) - room) > 1e-6) {
      return { refused: `the one door is the carcass less the stiles: ${mirrorMm(tenth(room))}.`, most: tenth(room) };
    }
    if (!(Number(mm) > 0) || Number(mm) > most + 1e-6) {
      return { refused: `door ${i + 1} at ${mirrorMm(Number(mm) || 0)} leaves the other door${n > 2 ? 's' : ''} less than `
        + `${mirrorMm(minDoor)}: ${mirrorMm(tenth(most))} is the most it can be.`, most: tenth(most) };
    }
    w[i] = Number(mm);
    held = [...held.filter((k) => k !== i), i];
  }
  const typed = bay != null ? Math.trunc(Number(bay)) : null;
  const freed = [];
  let free = Array.from({ length: n }, (_, i) => i).filter((i) => !held.includes(i));
  for (;;) {
    const rest = room - held.reduce((t, i) => t + w[i], 0);
    // Every door held and the held ones fill the room: nothing to share, nothing to set free.
    if (!free.length && Math.abs(rest) <= 0.01) return { widths: w, order: held, freed, refused: null };
    if (free.length && rest / free.length >= minDoor - 1e-6) {
      const each = tenth(rest / free.length);
      let given = 0;
      free.forEach((i, k) => {
        w[i] = k < free.length - 1 ? each : Math.round((rest - given) * 10) / 10;
        given += w[i];
      });
      return { widths: w, order: held, freed, refused: null };
    }
    const give = held.find((i) => i !== typed);
    // Nothing held to set free (one bay, checked above): the doors as they stand.
    if (give == null) return { widths: w, order: held, freed, refused: null };
    held = held.filter((i) => i !== give);
    free = Array.from({ length: n }, (_, i) => i).filter((i) => !held.includes(i));
    freed.push(give);
  }
}

// ─── THE UNIT'S ANSWERS ─────────────────────────────────────────────────────

export const MIRROR_STILE_KINDS = Object.freeze(['led', 'timber', 'none']);
const PANEL_KEYS = ['L', 'R', 'top', 'bottom'];
const bool = (v, d) => (typeof v === 'boolean' ? v : Boolean(d));
const posNum = (v, d) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : d);

/**
 * What a mirror cabinet's own params say, each with the profile's answer
 * where they say nothing (KIT_MIRROR.lsp section 3). `params.mirror` is the
 * kit's one key; `recess_mm` is T79's (read by the room, runs.js wallGapOf).
 * `door_widths` unsaid is the kit's own (D6); `stiles` and `door_hinges` are
 * per divider and per door, each only when its length is right.
 */
export function mirrorParamsOf(params, profile) {
  const d = profile.mirror.defaults;
  const m = params?.mirror && typeof params.mirror === 'object' ? params.mirror : {};
  const bays = [1, 2, 3].includes(Math.trunc(Number(m.bays))) ? Math.trunc(Number(m.bays)) : d.bays;
  const kind = MIRROR_STILE_KINDS.includes(m.stile) ? m.stile : d.stile;
  const kinds = Array.isArray(m.stiles) && m.stiles.length === bays - 1 && m.stiles.every((k) => MIRROR_STILE_KINDS.includes(k))
    ? [...m.stiles] : null;
  const widths = Array.isArray(m.door_widths) && m.door_widths.length && m.door_widths.every((v) => Number.isFinite(Number(v)))
    ? m.door_widths.map(Number) : null;
  // D5a: the bays the owner typed, longest ago first, each held at its number.
  const order = widths && Array.isArray(m.door_widths_order)
    ? m.door_widths_order.map((i) => Math.trunc(Number(i))).filter((i, k, a) => i >= 0 && i < bays && a.indexOf(i) === k) : [];
  const hands = Array.isArray(m.door_hinges) && m.door_hinges.length === bays && m.door_hinges.every((h) => h === 'L' || h === 'R')
    ? [...m.door_hinges] : null;
  const said = m.panels && typeof m.panels === 'object' ? m.panels : {};
  const panels = Object.fromEntries(PANEL_KEYS.map((k) => [k, bool(said[k], d.panels[k])]));
  const spb = Math.trunc(Number(m.shelves_per_bay));
  const recess = Number(params?.recess_mm);
  return {
    bays,
    stile: kind,
    stiles: kinds,
    stileWidthMm: posNum(m.stile_width_mm, d.stileWidthMm),
    doorWidths: widths,
    doorWidthsOrder: order,
    doorHinges: hands,
    panels,
    panelT: posNum(m.panel_t, d.panelT),
    mirrorDoors: bool(m.mirror_doors, d.mirrorDoors),
    mirrorBack: bool(m.mirror_back, d.mirrorBack),
    shelvesPerBay: Number.isFinite(spb) && spb >= 0 && m.shelves_per_bay != null && m.shelves_per_bay !== ''
      ? Math.min(spb, 20) : d.shelvesPerBay,
    ledUnder: bool(m.led_under, d.ledUnder),
    ledInside: bool(m.led_inside, d.ledInside),
    bottomBox: bool(m.bottom_box, d.bottomBox),
    recessMm: Number.isFinite(recess) && recess > 0 ? recess : 0,
  };
}

/** What a new mirror cabinet is born with (types.js defaultParamsFor): the profile's answers, no widths typed. */
export function mirrorDefaultParams(profile) {
  const d = profile.mirror.defaults;
  return {
    mirror: {
      bays: d.bays,
      stile: d.stile,
      stile_width_mm: d.stileWidthMm,
      panels: { ...d.panels },
      panel_t: d.panelT,
      mirror_doors: d.mirrorDoors,
      mirror_back: d.mirrorBack,
      shelves_per_bay: d.shelvesPerBay,
      led_under: d.ledUnder,
      led_inside: d.ledInside,
      bottom_box: d.bottomBox,
    },
  };
}

const r4 = (v) => roundTo(v, 4);
const boxOf = (b) => ({
  x: r4(b[1]), y: r4(b[2]), z: r4(b[3]), w: r4(b[4]), h: r4(b[5]), d: r4(b[6]),
});

/**
 * THE KIT, CUT: every part of KIT_MIRROR.lsp in the shape computeCabinet's
 * `panel()` takes, with its holes, the sentences the room says and the record
 * the readers take (`derived`).
 *
 * @param {object} params   the unit's params (width, height, depth, board_t, unit_num, mirror, items, recess_mm)
 * @param {object} profile  the cabinet profile
 * @param {object} opts     { unitNum, G, plateD, plateLayer, partitionFace }: what computeCabinet has resolved
 */
export function mirrorCabinetFigures(params, profile, opts = {}) {
  const P = profile;
  const K = mirrorConstants(P);
  const codes = P.csv.codes;
  const pz = P.puzzle;
  const mp = mirrorParamsOf(params, P);
  const num = opts.unitNum || 'MC01';
  const W = Number(params?.width) || P.mirror.defaults.width;
  const H = Number(params?.height) || P.mirror.defaults.height;
  const D = Number(params?.depth) || P.mirror.defaults.depth;
  const G = Number(opts.G) || Number(params?.board_t) || P.board.thickness;
  const doorT = K.doorBoard;
  const pt = mp.panelT;
  const on = PANEL_KEYS.map((k) => mp.panels[k]);
  const [x0, y0, Wc, Hc] = mirrorCarcass(W, H, ...on, pt);
  const faceT = mirrorFaceT(doorT, mp.mirrorDoors, K);
  const boxH = mirrorBoxH(mp.bottomBox, K);
  const sw = mp.stileWidthMm;
  const kinds = mirrorStileKinds(mp.bays, mp.stile, mp.stiles);
  const widths = mirrorWidths(Wc, mp.bays, mp.doorWidths, kinds, sw, K);
  const zones = mirrorZones(x0, widths, kinds, sw);
  const yD = mirrorDoorY(y0, boxH);
  const hD = mirrorDoorH(Hc, boxH, K);
  const hands = mirrorHands(mp.bays, mp.doorHinges);
  const doors = mirrorDoors(zones, yD, hD, D, faceT, hands, K);
  const stiles = mirrorStiles(zones, kinds, yD, hD, D, faceT);
  const bf = mirrorFloor(y0, G, boxH);
  const bc = mirrorCeiling(y0, Hc, G);
  const dvs = mirrorDividers(zones, bf, bc, D, G);
  const bays = mirrorBays(x0, Wc, G, dvs);
  const sideW = D - G;
  const warnings = [];
  const refusal = mirrorWidthsRefusal(num, Wc, mp.bays, mp.doorWidths, kinds, sw, K);
  if (refusal) warnings.push({ code: 'MIRROR_DOOR_WIDTHS', level: 'warn', message: refusal });

  // Every hole a board takes, in its own frame, by board id.
  const holes = new Map();
  const marks = new Map();
  const hole = (id, h) => { if (!holes.has(id)) holes.set(id, []); holes.get(id).push(h); };
  const mark = (id, m) => { if (!marks.has(id)) marks.set(id, []); marks.get(id).push(m); };
  const boardOf = new Map([
    ...mirrorCarcassBoards(x0, y0, Wc, Hc, D, G).map((b) => [b[0], b]),
    ...dvs.map((dv) => [`DIVIDER-${dv[0]}`, ['VPART', dv[1], dv[2], dv[3], dv[4], dv[5], dv[6]]]),
  ]);

  // ── the doors, their weight, their hinges and the plates (D9 to D11) ──
  const plateD = Number(opts.plateD) || P.hinges.holeDiameter;
  const plateLayer = opts.plateLayer || P.hinges.layer;
  const doorRecs = doors.map((door) => {
    const [idx, , , , dw, dh, , hand] = door;
    const kg = mirrorDoorKg(dw, dh, doorT, mp.mirrorDoors, K);
    const band = mirrorHingeBand(dh, kg, K);
    const n = mirrorHingeCount(dh, kg, K);
    const cups = mirrorCups(dh, n, K);
    const [board, face] = mirrorHingeBoard(idx, mp.bays, hand);
    const span = mirrorBoardSpan(board, x0, Wc, G, dvs);
    const overlay = span ? mirrorOverlay(door, hand, span[0], span[1]) : null;
    const note = overlay == null ? null : mirrorReachNote(num, idx, board, overlay);
    if (note) warnings.push({ code: 'MIRROR_HINGE_REACH', level: 'info', message: note, panel: `${num}-F${idx}` });
    const bb = boardOf.get(board);
    if (bb) {
      const x = mirrorPlateX(board, face, bb[6], K);
      for (const y of mirrorPlateYs(cups, yD, bb[2], K)) {
        hole(board, { layer: plateLayer, kind: 'hinge', x: r4(x), y: r4(y), d: plateD });
      }
    }
    return {
      door, idx, kg, band, n, cups, board, face, overlay,
    };
  });

  // ── the glass shelves (D14): the unit's shelf items, else the count a bay ──
  const items = (Array.isArray(params?.items) ? params.items
    : (Array.isArray(params?.sections) ? params.sections.flatMap((s) => s.items || []) : []))
    .filter((it) => it && it.kind === 'shelf');
  const shelfPlan = [];
  if (items.length) {
    for (const it of items) {
      const bay = bays[Math.trunc(Number(it.zone))] || null;
      const y = Number(it.pos_mm);
      if (!bay || !Number.isFinite(y) || !mirrorShelfFitsP(y, bf, bc, K)) {
        warnings.push({
          code: 'MIRROR_SHELF_REFUSED',
          level: 'warn',
          message: `${num}: a glass shelf ${bay ? `at ${mirrorMm(r4(y))}` : 'in no bay'} does not stand in its bay `
            + `(${mirrorMm(bf)} to ${mirrorMm(bc - K.glassShelf)}): it is not cut.`,
        });
        continue;
      }
      shelfPlan.push({ bay, y, itemId: it.id || null });
    }
    shelfPlan.sort((a, b) => (a.bay[0] - b.bay[0]) || (a.y - b.y));
  } else {
    for (const bay of bays) {
      for (const y of mirrorShelfYs(bf, bc, mp.shelvesPerBay)) shelfPlan.push({ bay, y, itemId: null });
    }
  }
  const ysOfBay = (k) => shelfPlan.filter((s) => s.bay[0] === k).map((s) => s.y);
  // Their pins on the boards either side of each bay: BUL, the dividers, BUR.
  const pinBoards = [['BUL', [1]], ...dvs.map((dv) => [`DIVIDER-${dv[0]}`, [dv[0], dv[0] + 1]]), ['BUR', [bays.length]]];
  for (const [id, bayIdx] of pinBoards) {
    const bb = boardOf.get(id);
    const ys = bayIdx.flatMap((k) => ysOfBay(k));
    for (const y of mirrorPinYs(ys, bb[2], bb[5], K)) {
      for (const x of mirrorPinXs(bb[6], K)) hole(id, { layer: K.pinLayer, kind: 'shelf', x: r4(x), y: r4(y), d: K.pinD });
    }
  }

  // ── the hangers (D18) ──
  for (const side of ['BUL', 'BUR']) {
    for (const [x, y] of mirrorHangerHoles(side, sideW, Hc, K)) {
      hole(side, { layer: K.hangerLayer, kind: 'hanger', x: r4(x), y: r4(y), d: K.hangerHoleD });
    }
  }

  // ── the box's FIX board joint, the house's set (D12, engine/biscuits.js) ──
  const lid = mirrorBoxLid(x0, y0, Wc, D, G, boxH);
  if (lid) {
    const depth = lid[6];
    const front = lid[3] + depth;
    const sets = biscuitSets({ length: depth, screws: true, profile: P });
    const layers = biscuitLayers(P);
    const jointY = lid[2] + G / 2 - y0;
    for (const side of ['BUL', 'BUR']) {
      const at = (t) => (side === 'BUL' ? D - (front - t) : (front - t) - G);
      for (const set of sets) {
        for (const sc of set.screws) hole(side, { layer: pz.layers.screw, kind: 'shelf_screw', x: r4(at(sc)), y: r4(jointY), d: pz.screwDiameter });
        mark(side, { layer: layers.mark, from: [r4(at(set.mark.from)), r4(jointY)], to: [r4(at(set.mark.to)), r4(jointY)] });
      }
    }
    const spec = partitionBackSpec(P);
    for (const x of partitionBackScrewRun({ from: lid[1], to: lid[1] + lid[4], profile: P })) {
      hole('BACK', { layer: spec.layer, kind: 'shelf_back_screw', x: r4(x - x0), y: r4(lid[2] + G / 2 - y0), d: spec.diameter });
    }
  }

  // ── THE PARTS ──
  const parts = [];
  const mc = (role, extra = {}) => ({ mirrorCabinet: { role, ...extra } });
  const withHoles = (id, geom) => ({
    ...geom,
    holes: [...(geom.holes || []), ...(holes.get(id) || [])],
    ...(marks.get(id) ? { marks: [...(geom.marks || []), ...marks.get(id)] } : {}),
  });
  const jointInset = resolvedJointInset(D, pz);

  // (b) the carcass: the parent's five boards and their puzzle (D1).
  const [bul, bur, top, bottom, back] = mirrorCarcassBoards(x0, y0, Wc, Hc, D, G);
  parts.push({
    id: 'BUL', part: 'BUL', role: 'side', w: sideW, h: Hc, thickness: G,
    edgeCode: codes.left, edgeLen: metres(Hc), box: boxOf(bul),
    cnc: { rotated: false, drawn_w: sideW, drawn_h: Hc, ...withHoles('BUL', sidePanelGeometry({ w: sideW, h: Hc, G, side: 'L', puzzle: pz, jointInset })) },
    meta: mc('carcass'),
  });
  parts.push({
    id: 'BUR', part: 'BUR', role: 'side', w: sideW, h: Hc, thickness: G,
    edgeCode: codes.right, edgeLen: metres(Hc), box: boxOf(bur),
    cnc: { rotated: false, drawn_w: sideW, drawn_h: Hc, ...withHoles('BUR', sidePanelGeometry({ w: sideW, h: Hc, G, side: 'R', puzzle: pz, jointInset })) },
    meta: mc('carcass'),
  });
  const topW = Wc - 2 * G;
  const topH = D - G;
  const topCnc = () => ({
    rotated: true, drawn_w: topH, drawn_h: topW,
    ...topPanelGeometry({ drawnW: topH, drawnH: topW, G, puzzle: pz, backTabs: true, jointInset }),
  });
  parts.push({
    id: 'TOP', part: 'TOP', role: 'top', w: topW, h: topH, thickness: G,
    edgeCode: codes.right, edgeLen: metres(topW), box: boxOf(top), cnc: topCnc(), meta: mc('carcass'),
  });
  parts.push({
    id: 'BOTTOM', part: 'BOTTOM', role: 'bottom', w: topW, h: topH, thickness: G,
    edgeCode: codes.right, edgeLen: metres(topW), box: boxOf(bottom), cnc: topCnc(), meta: mc('carcass'),
  });
  // The parent's back; its two end screws under the top stand in the hanger cut-outs and go (D18).
  const cuts = mirrorHangerCuts(Wc, Hc, K);
  const parentBack = backPanelGeometry({ w: Wc, h: Hc, G, puzzle: pz });
  const backGeom = { ...parentBack, holes: parentBack.holes.filter((h) => !mirrorInCutP(h.x, h.y, cuts)) };
  const backCnc = {
    rotated: false,
    drawn_w: Wc,
    drawn_h: Hc,
    ...withHoles('BACK', backGeom),
    pockets: [
      ...backGeom.pockets,
      ...cuts.map(([x1, y1, x2, y2]) => ({ layer: K.hangerCutLayer, x1, y1, x2, y2 })),
    ],
    // The figure stands up on a back wider than it is tall (T38 F1c's own rule).
    ...(!(Hc > Wc) ? { grain: 'h' } : {}),
  };
  const panes = mp.mirrorBack ? mirrorBackPanes(bays, bf, bc, G, K) : [];
  parts.push({
    id: 'BACK', part: 'BACK', role: 'back', w: Wc, h: Hc, thickness: G,
    edgeCode: codes.none, edgeLen: 0, box: boxOf(back), cnc: backCnc,
    meta: {
      ...mc('carcass', { clickAsks: 'mirror-back' }),
      // D15: the mirror on the BACK's inside face, a pane a bay (bought, m2).
      ...(panes.length ? {
        mirrorBack: {
          t: K.mirrorT,
          face: 'inside',
          panes: panes.map((p) => ({ bay: p[0], w: r4(p[4]), h: r4(p[5]), box: boxOf(['PANE', ...p.slice(1)]) })),
          area_m2: r4(panes.reduce((s, p) => s + (p[4] * p[5]) / 1000000, 0)),
        },
      } : {}),
    },
  });

  // (c) the bottom box (D12): the FIX board and the strip.
  if (lid) {
    parts.push({
      id: 'BOX-TOP', part: 'FIXED', role: 'shelf', w: lid[4], h: lid[6], thickness: G,
      edgeCode: codes.right, edgeLen: metres(lid[4]), box: boxOf(lid),
      cnc: { rotated: true, drawn_w: lid[6], drawn_h: lid[4], ...rectGeometry(lid[6], lid[4]) },
      meta: { variant: 'fixed', locked: true, ...mc('box_top', { boxH }) },
    });
    const strip = mirrorBoxFront(x0, y0, Wc, D, doorT, boxH, K);
    parts.push({
      id: 'BOX-FRONT', part: 'FALSE-FRONT', role: 'false_front', w: strip[4], h: strip[5], thickness: doorT,
      edgeCode: codes.all, edgeLen: metres(2 * (strip[4] + strip[5])), box: boxOf(strip),
      cnc: { rotated: false, drawn_w: strip[4], drawn_h: strip[5], ...rectGeometry(strip[4], strip[5]) },
      meta: mc('box_front', { boxH }),
    });
  }

  // (d) the dividers that carry the doors (D7): the house's VPART.
  for (const dv of dvs) {
    const id = `DIVIDER-${dv[0]}`;
    const dh = dv[5];
    const dd = dv[6];
    parts.push({
      id, part: 'VPART', role: 'shelf', w: dh, h: dd, thickness: G,
      edgeCode: codes.right, edgeLen: metres(dh), box: boxOf(dv),
      cnc: { rotated: true, drawn_w: dd, drawn_h: dh, ...withHoles(id, rectGeometry(dd, dh)) },
      meta: {
        index: dv[0],
        vertical: true,
        fullHeight: true,
        itemId: null,
        x_mm: r4(dv[1]),
        front_mm: 0,
        setback: 0,
        drillFace: opts.partitionFace === 'R' ? 'R' : 'L',
        terminatesOn: null,
        locked: true,
        ...mc('divider', { stile: kinds[dv[0] - 1] }),
      },
    });
  }

  // (d) the doors (D9): the board 18 cut, the mirror 4 bought on its face.
  for (const rec of doorRecs) {
    const [idx, x, y, z, dw, dh, d, hand] = rec.door;
    const area = (dw * dh) / 1000000;
    parts.push({
      id: `${num}-F${idx}`, part: 'FRONT', role: 'mirror_door', w: dw, h: dh, thickness: doorT,
      edgeCode: codes.all, edgeLen: metres(2 * (dw + dh)), box: boxOf(['DOOR', x, y, z, dw, dh, d]),
      cnc: { rotated: false, drawn_w: dw, drawn_h: dh, ...rectGeometry(dw, dh) },
      meta: {
        hinge: hand,
        hingeOn: rec.board,
        hingeFace: rec.face,
        cupY: rec.cups.map(r4),
        // T33's door mirror, on its outside face, the whole face (D9): the room draws it.
        ...(mp.mirrorDoors ? {
          mirror: {
            face: 'outside', w: r4(dw), h: r4(dh), margin: 0, t: K.mirrorT, area_m2: r4(area),
          },
        } : {}),
        ...mc('door', {
          index: idx,
          board: doorT,
          faceT: d,
          weightKg: r4(rec.kg),
          hinges: rec.n,
          band: rec.band ? { maxHeightMm: rec.band[0], maxWeightKg: rec.band[1] } : null,
          overlayMm: rec.overlay == null ? null : r4(rec.overlay),
        }),
      },
    });
  }

  // (d) the stiles (D8): a bought LED light panel, or a timber board.
  for (const s of stiles) {
    const [k, kind, x, y, z, w, h, d] = s;
    const led = kind === 'led';
    parts.push({
      id: `STILE-${k}`, part: 'MIRROR-STILE', role: led ? 'led_stile' : 'mirror_stile', w, h, thickness: d,
      edgeCode: led ? codes.none : codes.all, edgeLen: led ? 0 : metres(2 * (w + h)), box: boxOf(['STILE', x, y, z, w, h, d]),
      cnc: led ? null : { rotated: false, drawn_w: w, drawn_h: h, ...rectGeometry(w, h) },
      bought: led,
      meta: {
        ...(led ? { readiness: 'bought' } : {}),
        ...mc('stile', {
          kind, divider: `DIVIDER-${k}`, ...(led ? { kelvin: P.mirror.ledKelvin, madeToMeasure: true } : {}),
        }),
      },
    });
  }

  // (a) the panels round (D3): front finish, an outline only.
  for (const p of mirrorPanels(W, H, D, faceT, ...on, pt)) {
    const [id, x, y, z, bw, bh, bd] = p;
    const upright = id === 'PANEL-L' || id === 'PANEL-R';
    const w = upright ? bd : bw;
    const h = upright ? bh : bd;
    parts.push({
      id, part: 'MIRROR-PANEL', role: 'mirror_panel', w, h, thickness: pt,
      edgeCode: codes.all, edgeLen: metres(2 * (w + h)), box: boxOf(p),
      cnc: { rotated: false, drawn_w: w, drawn_h: h, ...rectGeometry(w, h) },
      meta: {
        readiness: 'geometry',
        side: { 'PANEL-L': 'left', 'PANEL-R': 'right', 'PANEL-TOP': 'top', 'PANEL-BOTTOM': 'bottom' }[id],
        ...mc('panel'),
      },
    });
  }

  // (f) the glass shelves (D14): bought, no CNC, on the house's pins.
  shelfPlan.forEach((s, i) => {
    const [x, y, z, w, h, d] = mirrorShelf(s.bay, s.y, D, G, mp.mirrorBack, K);
    parts.push({
      id: `SHELF-${i + 1}`, part: 'SHELF', role: 'shelf', w, h: d, thickness: h,
      edgeCode: codes.none, edgeLen: 0, box: boxOf(['SHELF', x, y, z, w, h, d]),
      cnc: null,
      bought: true,
      meta: {
        index: i + 1,
        run: { from: r4(x), to: r4(x + w) },
        variant: 'adjustable',
        itemId: s.itemId,
        locked: false,
        front_mm: K.shelfFrontClear,
        thickness_mm: h,
        zone: s.bay[0] - 1,
        readiness: 'bought',
        // Not `meta.glass`: that is a glass DOOR's pane (T30 F21), ordered from its aperture.
        glassShelf: { t: h, toughened: true },
        ...mc('glass_shelf', { bay: s.bay[0] }),
      },
    });
  });

  // ── what the readers take: the room, the BOM, the right panel, the sheets ──
  const recess = mp.recessMm;
  const ledStiles = stiles.filter((s) => s[1] === 'led').length;
  const derived = {
    width: W,
    height: H,
    depth: D,
    carcass: { x: x0, y: y0, w: Wc, h: Hc, d: D },
    panelT: pt,
    panels: { ...mp.panels },
    panelDepth: mirrorPanelDepth(D, faceT),
    doorBoard: doorT,
    mirrorT: K.mirrorT,
    faceT,
    mirrorDoors: mp.mirrorDoors,
    mirrorBack: mp.mirrorBack,
    bays: mp.bays,
    doorWidths: widths.map(r4),
    doorWidthsTyped: mp.doorWidths,
    doorWidthsHeld: mp.doorWidthsOrder,
    widthsRefused: Boolean(refusal),
    stile: mp.stile,
    stileKinds: kinds,
    stileWidth: sw,
    zones: zones.map(([kind, from, to]) => ({ kind, from: r4(from), to: r4(to) })),
    doors: doorRecs.map((r) => ({
      id: `${num}-F${r.idx}`, index: r.idx, x: r4(r.door[1]), y: r4(r.door[2]), w: r4(r.door[4]), h: r4(r.door[5]),
      hinge: r.door[7], hingeOn: r.board, hingeFace: r.face, weightKg: r4(r.kg), hinges: r.n,
      band: r.band ? { maxHeightMm: r.band[0], maxWeightKg: r.band[1] } : null, cupY: r.cups.map(r4),
      overlayMm: r.overlay == null ? null : r4(r.overlay),
    })),
    hingesTotal: doorRecs.reduce((s, r) => s + r.n, 0),
    stiles: stiles.map((s) => ({
      id: `STILE-${s[0]}`, kind: s[1], x: r4(s[2]), w: r4(s[5]), h: r4(s[6]), divider: `DIVIDER-${s[0]}`,
    })),
    dividers: dvs.map((dv) => ({ id: `DIVIDER-${dv[0]}`, x: r4(dv[1]), y: r4(dv[2]), h: r4(dv[5]) })),
    bayOpenings: bays.map((b) => ({ index: b[0], from: r4(b[1]), to: r4(b[2]), w: r4(b[2] - b[1]) })),
    floor: r4(bf),
    ceiling: r4(bc),
    shelves: shelfPlan.map((s, i) => ({ id: `SHELF-${i + 1}`, bay: s.bay[0], y: r4(s.y), itemId: s.itemId })),
    shelvesPerBay: mp.shelvesPerBay,
    glassT: K.glassShelf,
    shelfDepth: r4(mirrorShelfDepth(D, G, mp.mirrorBack, K)),
    bottomBox: lid ? {
      on: true, h: boxH, lid: 'BOX-TOP', front: 'BOX-FRONT',
      driver: { box: boxOf(['DRIVER', x0 + G, y0 + G, G, Wc - 2 * G, boxH - 2 * G, D - G]) },
    } : { on: false, h: 0, lid: null, front: null, driver: null },
    led: {
      kelvin: P.mirror.ledKelvin,
      driverVolts: P.mirror.ledDriverVolts,
      stiles: ledStiles,
      under: mp.ledUnder ? {
        face: mp.panels.bottom ? 'PANEL-BOTTOM' : 'BOTTOM',
        x: r4(x0 + G), y: 0, z: r4(mirrorLedInsideZ(D, K)), length: r4(mirrorLedUnderLength(Wc, G)),
      } : null,
      inside: mp.ledInside ? {
        side: P.mirror.ledInsideSide,
        wall: P.mirror.ledInsideSide === 'R' ? 'BUR' : 'BUL',
        x: r4(P.mirror.ledInsideSide === 'R' ? x0 + Wc - G : x0 + G),
        y0: r4(bf), y1: r4(bc), z: r4(mirrorLedInsideZ(D, K)), length: r4(mirrorLedInsideLength(bf, bc)),
      } : null,
      driver: mp.ledUnder || mp.ledInside || ledStiles > 0 ? 1 : 0,
    },
    mirrorArea: {
      doors_m2: mp.mirrorDoors ? r4(doorRecs.reduce((s, r) => s + (r.door[4] * r.door[5]) / 1000000, 0)) : 0,
      back_m2: panes.length ? r4(panes.reduce((s, p) => s + (p[4] * p[5]) / 1000000, 0)) : 0,
    },
    recess: {
      mm: recess,
      proudMm: r4(mirrorProud(D, recess)),
      faceProudMm: r4(mirrorFaceProud(D, faceT, recess)),
      wallOpening: recess > 0 ? { x: 0, y: 0, w: W, h: H, depth: recess } : null,
    },
    hangers: { count: P.mirror.hangers.perUnit, name: P.mirror.hangers.name, article: P.mirror.hangers.article },
  };
  return { parts, warnings, derived };
}
