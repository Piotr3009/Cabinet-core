/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T82 F6 / F7 · THE HAWA POCKET DOOR, CLOSED AND OPEN: ONE POSE FOR THE ROOM
// AND THE SHEETS
//
// The owner, 25.10.2026 (11:40): *"hawa III sa to drzwi ktore sa pocket doors
// ... wysuwasz pocket door i zakrywasz szafke lub szafki"*. CLAUDE.md T82 F6:
// "open = the door rotated 90 degrees about its hinge edge and translated E1
// into the pocket, its leading edge M proud"; F7: "the plan cuts the pocket
// and draws the open door dashed (HIDDEN) inside it; the section through the
// pocket shows T1 and the tracks' zones (22 and 41 lines). Dimensions: TB and
// M on the plan."
//
// This module DERIVES NOTHING HAWA PRINTS. The door shut and the door open are
// the engine's two boxes (`computeCabinet(...).hawa.doors[i].closed` and
// `.open`, KIT_HAWA.lsp `hawa-door-box` and `hawa-door-open`), and E1, M, T1,
// the hinge edge, the cups' heights and the drilling are the same figures
// (A2's one function, `hawaPocketFigures`). What is worked out here is only
// WHERE the door stands between those two boxes, so the room
// (3d/PocketDoor.jsx) and the sheets (the projector, the plan, the section)
// draw the one same door:
//
//   . t = 0: the `closed` box, 3 in front of the pocket's front plane, its
//     hinge edge Z3 inside panel A (the outer panel, which runs forward flush
//     with the door's face; KIT_HAWA.lsp D2, D6);
//   . t in (0, 0.5]: the door turns a quarter about its hinge, its back face
//     (the cups, the hinge arms to the vertical profile) coming round to face
//     panel B, the panel beside the covered cabinet;
//   . t in (0.5, 1]: it slides E1 straight back along the pocket, to the
//     `open` box: hinge edge E1 behind the front plane, free edge M in front
//     of it (D18).
//
// The turn is about the one vertical axis that carries the closed box onto
// the open box's slot (the hinge's own pivot, a hair in front of the door, as
// a concealed hinge's is); a rotation is rigid, so the door keeps its size at
// every t, and at t = 1 it IS the engine's open box (the test reads both).
//
// Pure functions: no React, no three.js, no store.

import { formatDimension } from './format.js';
import { chainH, chainV } from './drawings/setChains.js';
import { entLine as line, entText as text } from './drawings/primitives.js';

/** The engine's part name of the door (its ids: POCKET-DOOR, POCKET-DOOR-L, POCKET-DOOR-R). */
const POCKET_DOOR_PART = 'POCKET-DOOR';

/**
 * The Push ejector's height, a PICTURE number (PROPOSED, A5): the ejector is
 * the HAWA set's own bought part (KIT_HAWA.lsp D19, "a BOM name, never a hole
 * of this kit"), drawn as a block on the vertical profile at mid height so a
 * Push door reads as Push. Never cut, never ordered by this size: like the
 * room's 4 mm glass pane (3d/UnitView.jsx GLASS_PANE_MM), it is the view's,
 * not the workshop's. Its section is the profile symbol's own (profile.hawa).
 */
export const EJECTOR_PICTURE_HEIGHT_MM = 100;

/** Is this board the HAWA door? */
export function isPocketDoor(panel) {
  return panel?.part === POCKET_DOOR_PART && Boolean(panel.box);
}

const clamp01 = (v) => Math.max(0, Math.min(1, Number(v) || 0));
// Rounded to a millionth, and never -0 (a shut door has turned by nothing, not by minus nothing).
const r6 = (v) => Math.round(v * 1e6) / 1e6 + 0;
// A number the record states, or null: a missing figure is never read as 0.
const num = (v) => (v == null || v === '' || typeof v === 'boolean' || !Number.isFinite(Number(v)) ? null : Number(v));
const boxOk = (b) => Boolean(b) && [b.x, b.y, b.z, b.w, b.h, b.d].every((v) => num(v) != null) && b.w > 0 && b.h > 0 && b.d > 0;

/**
 * THE HAWA NUMBERS THE PICTURE READS, from the profile (`profile.hawa`, A1's,
 * each the LISP constant named there with its page). Null when the profile
 * carries none: the room then draws the door the engine cut, shut.
 *
 *   zone        hardwareZoneMm: the hardware zone between panel B and the door's back (160704 p1, 17)
 *   zoneTop     zoneTopMm: the top hardware zone below the panels' top edge (160704 p1, 63)
 *   zoneBottom  zoneBottomMm: the bottom hardware zone above the bottom board (160704 p1, 50)
 *   symbol      profileSymbolMm { w, d }: the room's vertical profile block (PROPOSED, CLAUDE.md F6 "17 x 60")
 *   trackStart  depth.trackStartMm: the tracks start this far behind panel B's front edge (52676 p1 step 2, 5)
 *   topAxis     holes.b.topAxisMm: the top track's screw axis below panel B's top edge (160704 p1, 22)
 *   bottomAxis  holes.b.bottomAxisMm: the bottom track's screw axis above panel B's bottom edge (160704 p1, 41)
 *   cupLayer    layers.cup: the layer the door's cups are drilled on (KIT_HAWA.lsp D15)
 */
function hawaPictureNumbers(profile) {
  const H = profile?.hawa;
  if (!H) return null;
  const out = {
    zone: num(H.hardwareZoneMm),
    zoneTop: num(H.zoneTopMm),
    zoneBottom: num(H.zoneBottomMm),
    symbol: H.profileSymbolMm && num(H.profileSymbolMm.w) > 0 && num(H.profileSymbolMm.d) > 0
      ? { w: Number(H.profileSymbolMm.w), d: Number(H.profileSymbolMm.d) } : null,
    trackStart: num(H.depth?.trackStartMm),
    topAxis: num(H.holes?.b?.topAxisMm),
    bottomAxis: num(H.holes?.b?.bottomAxisMm),
    cupLayer: H.layers?.cup || null,
  };
  return out.zone != null ? out : null;
}

/**
 * THE RIG OF ONE DOOR, between the engine's two boxes: the quarter turn and
 * its pivot. Hung on its LEFT edge (`hingeEdge` 'L', seen from the room: the
 * door reaches right over the cabinet), the turn is -90 degrees about y and
 * the back face ends facing +x, toward panel B; hung on its right edge, +90
 * and -x.
 *
 * @param {object} args { closed, open, hinge: 'L' | 'R', E1 }
 */
function pocketDoorRig({ closed, open, hinge, E1 }) {
  const zb = closed.z;
  // Before the slide the door's hinge end stands on the front plane: E1 in front of where it ends.
  const zPre = open.z + E1;
  if (hinge === 'L') {
    const xb = open.x + open.w;
    const hx = closed.x;
    return {
      hinge, theta: -Math.PI / 2, E1, box: closed, open, zf: zPre,
      pivot: [(xb + zb - zPre + hx) / 2, (xb + zb + zPre - hx) / 2],
    };
  }
  const xb = open.x;
  const hx = closed.x + closed.w;
  return {
    hinge, theta: Math.PI / 2, E1, box: closed, open, zf: zPre,
    pivot: [(xb - zb + zPre + hx) / 2, (zPre + hx - xb + zb) / 2],
  };
}

/** The pocket's panel B a door hangs its hardware on: the one on the door's side. */
function hardwarePanelOf(result, door) {
  const bs = (result?.panels || []).filter((p) => p.part === 'POCKET-B' && p.box);
  return bs.find((p) => p.meta?.pocket?.side === door.side) || (bs.length === 1 ? bs[0] : null);
}

/**
 * EVERY HAWA DOOR OF ONE UNIT, with its rig, read off the engine's figures.
 * Null for a unit with no HAWA door, or no numbers in the profile to draw by.
 *
 * @returns {{numbers:object, figures:object, doors:Array}|null}
 */
export function pocketDoorGeometry(result, profile) {
  const H = result?.hawa;
  if (!H || !Array.isArray(H.doors) || !H.doors.length) return null;
  const n = hawaPictureNumbers(profile);
  if (!n) return null;
  const out = [];
  for (const f of H.doors) {
    const door = (result.panels || []).find((p) => p.id === f.id && isPocketDoor(p));
    if (!door || !boxOk(f.closed) || !boxOk(f.open) || !(num(f.E1) > 0)) continue;
    const hinge = f.hingeEdge === 'R' ? 'R' : 'L';
    const rig = pocketDoorRig({ closed: f.closed, open: f.open, hinge, E1: Number(f.E1) });
    const panelB = hardwarePanelOf(result, f);
    // Panel B's pocket face: the face toward the door (B's left face when the door is hung on its left edge).
    // eslint-disable-next-line no-nested-ternary
    const faceX = panelB ? (hinge === 'L' ? panelB.box.x : panelB.box.x + panelB.box.w)
      : (hinge === 'L' ? f.open.x + f.open.w + n.zone : f.open.x - n.zone);
    out.push({
      ...rig,
      doorId: f.id,
      door,
      figures: f,
      side: f.side,
      TB: num(f.TB),
      M: num(f.M),
      T1: num(f.T1),
      trackMm: num(f.trackMm),
      push: f.push !== false,
      cupY: Array.isArray(f.cupY) ? f.cupY.map(Number).filter(Number.isFinite) : [],
      panelB,
      faceX,
    });
  }
  if (!out.length) return null;
  return { numbers: n, figures: H, doors: out };
}

/**
 * WHERE THE DOOR IS AT t (0 shut, 1 open): the turn, the slide, and the
 * door's plan rectangle (x along the unit, z off its back) in the unit's own
 * frame. The two phases share the one 0..1 every front in the room rides.
 */
export function pocketDoorPose(rig, t) {
  const a = clamp01(2 * Number(t));
  const s = clamp01(2 * Number(t) - 1);
  const angle = rig.theta * a + 0;
  const slideZ = -rig.E1 * s;
  const [px, pz] = rig.pivot;
  const c = Math.cos(angle);
  const sn = Math.sin(angle);
  // three's rotation about +y: x' = x cos + z sin, z' = -x sin + z cos.
  const place = (x, z) => {
    const dx = x - px; const dz = z - pz;
    return [r6(px + c * dx + sn * dz), r6(pz - sn * dx + c * dz + slideZ)];
  };
  const b = rig.box;
  const corners = [
    place(b.x, b.z), place(b.x + b.w, b.z), place(b.x + b.w, b.z + b.d), place(b.x, b.z + b.d),
  ];
  const xs = corners.map((q) => q[0]); const zs = corners.map((q) => q[1]);
  const hx = rig.hinge === 'L' ? b.x : b.x + b.w;
  const fx = rig.hinge === 'L' ? b.x + b.w : b.x;
  return {
    t: clamp01(t),
    angle,
    slideZ: r6(slideZ),
    pivot: [px, pz],
    corners,
    rect: { x0: Math.min(...xs), x1: Math.max(...xs), z0: Math.min(...zs), z1: Math.max(...zs) },
    // The middle of each upright edge, in plan: the hinge's and the free one.
    hingeEdge: place(hx, b.z + b.d / 2),
    leadingEdge: place(fx, b.z + b.d / 2),
  };
}

/**
 * THE DOOR'S DRILLING, as the engine states it (the figures' `holes`, the
 * LISP's `(layer u v d depth)` in the door's face frame: u from the hinge
 * edge, v from the bottom edge, on its back face), in the unit's frame on the
 * door's back. The cups are the rows on the cup layer.
 */
export function pocketDoorHoles(rig, numbers = null) {
  const b = rig.box;
  const holes = [];
  for (const h of rig.figures?.holes || []) {
    const [layer, u, v, d, depth] = h;
    if (num(u) == null || num(v) == null || !(num(d) > 0)) continue;
    holes.push({
      layer,
      x: r6(rig.hinge === 'L' ? b.x + Number(u) : b.x + b.w - Number(u)),
      y: r6(b.y + Number(v)),
      z: r6(b.z),
      d: Number(d),
      depth: num(depth) ?? 0,
      normal: [0, 0, -1],
    });
  }
  const cupLayer = numbers?.cupLayer || null;
  const widest = Math.max(0, ...holes.map((h) => h.d));
  const cups = holes.filter((h) => (cupLayer ? h.layer === cupLayer : h.d === widest));
  return { holes, cups };
}

/**
 * THE HARDWARE, AS SYMBOLS (CLAUDE.md T82 F6, KIT_HAWA.lsp D21: no HAWA model
 * in the bucket). In the unit's frame, with the door shut:
 *
 *   . `zoneTop`, `zoneBottom`: the two hardware zones on panel B's pocket face
 *     (63 below its top edge, 50 above its bottom edge, 17 across), as long as
 *     the tracks in them (T1 - 7 from 5 behind the front edge); fixed to B;
 *   . `profile`: the vertical profile block (17 x 60, PROPOSED) between the
 *     zones at the front of the tracks; it rides the carriage (`slides`);
 *   . `ejector` (Push): a length of the profile at its mid height, on the
 *     profile's own section, the picture's height; it rides with the profile
 *     (the profile is then drawn in two lengths, below and above it).
 */
export function pocketHardwareBoxes(geometry) {
  if (!geometry) return [];
  const n = geometry.numbers;
  const out = [];
  for (const d of geometry.doors) {
    if (!d.panelB) continue;
    const pb = d.panelB.box;
    const zone = n.zone;
    const x0 = d.hinge === 'L' ? d.faceX - zone : d.faceX;
    const front = d.zf - (n.trackStart ?? 0);
    const yBot = pb.y;
    const yTop = pb.y + pb.h;
    if (d.trackMm > 0) {
      if (n.zoneTop > 0) {
        out.push({
          id: `${d.doorId}:zone-top`, kind: 'zoneTop', doorId: d.doorId, slides: false,
          x0, x1: x0 + zone, y0: yTop - n.zoneTop, y1: yTop, z0: front - d.trackMm, z1: front,
        });
      }
      if (n.zoneBottom > 0) {
        out.push({
          id: `${d.doorId}:zone-bottom`, kind: 'zoneBottom', doorId: d.doorId, slides: false,
          x0, x1: x0 + zone, y0: yBot, y1: yBot + n.zoneBottom, z0: front - d.trackMm, z1: front,
        });
      }
    }
    if (!n.symbol) continue;
    const w = n.symbol.w;
    const px0 = d.hinge === 'L' ? d.faceX - w : d.faceX;
    const py0 = yBot + (n.zoneBottom ?? 0);
    const py1 = yTop - (n.zoneTop ?? 0);
    if (!(py1 > py0)) continue;
    const at = { doorId: d.doorId, slides: true, x0: px0, x1: px0 + w, z0: front - n.symbol.d, z1: front };
    // T82 F6, after the review (roomsheets 1): the Push ejector is ON the vertical profile at mid height
    // (hawa-numbers.md 5; 160704 p1, the Push side view), a length of it, never a block behind it: behind,
    // it rode the carriage out of the pocket's back and past its track (T1 - E1 is 95, the profile and a
    // block behind it 125). So the profile runs below and above it, all three on the one 17 x 60 section,
    // and the carriage never leaves the track at any t.
    const e0 = (py0 + py1) / 2 - EJECTOR_PICTURE_HEIGHT_MM / 2;
    const e1 = e0 + EJECTOR_PICTURE_HEIGHT_MM;
    if (!d.push || !(e0 > py0 && e1 < py1)) {
      out.push({ id: `${d.doorId}:profile`, kind: 'profile', ...at, y0: py0, y1: py1 });
      continue;
    }
    out.push({ id: `${d.doorId}:profile`, kind: 'profile', ...at, y0: py0, y1: e0 });
    out.push({ id: `${d.doorId}:ejector`, kind: 'ejector', ...at, y0: e0, y1: e1 });
    out.push({ id: `${d.doorId}:profile-upper`, kind: 'profile', ...at, y0: e1, y1: py1 });
  }
  return out;
}

// ═══ THE SHEETS (F7) ═══════════════════════════════════════════════════════

/**
 * THE HINGE BARS of the fronts sheet (T81 F3's grammar: a solid 6 x 70 bar on
 * the hinge edge at each cup's height, the cups' heights the engine's
 * `cupY`), for every HAWA door of one member, in the run's frame. `off` is
 * the member's offset (the projector's own).
 */
export function pocketDoorBarMarks(m, off, profile) {
  const g = pocketDoorGeometry(m.result, profile);
  if (!g) return [];
  const bar = profile.drawings?.hingeBar || { width: 6, height: 70 };
  const out = [];
  for (const d of g.doors) {
    const b = d.box;
    const x0 = d.hinge === 'R' ? b.x + b.w - bar.width : b.x;
    const face = b.z + b.d + off[2];
    for (const cy of d.cupY) {
      const y = b.y + cy;
      const y0 = Math.max(b.y, Math.min(b.y + b.h - bar.height, y - bar.height / 2));
      out.push({
        kind: 'bar', host: `${m.unit.id}:${d.doorId}`, front: true, layer: 'HINGE_MARK',
        x: x0 + off[0], y: y0 + off[1], w: bar.width, h: bar.height, z: face, cupY: y + off[1],
      });
    }
  }
  return out;
}

/**
 * THE PLAN'S OWN WORDS FOR A POCKET (F7): the door open in its pocket, dashed
 * (the engine's `open` box, the doors' ink, the hidden pen), TB along the
 * shut door's face and M from the pocket's front plane to the open door's
 * leading edge. In the run's plan frame (x along the wall, y off it), as the
 * projector's plan entities are, so the plan takes them through its wall.
 * `gapOf(unit)` is how far the unit stands off its wall.
 */
export function pocketPlanEntities(group, { profile, ctx, gapOf }) {
  const out = [];
  for (const m of group?.members || []) {
    const g = pocketDoorGeometry(m.result, profile);
    if (!g) continue;
    const ox = Number(m.x) || 0;
    const oz = Number(gapOf(m.unit)) || 0;
    for (const d of g.doors) {
      const host = `${m.unit.id}:${d.doorId}`;
      const o = d.open;
      const pts = [[o.x, o.z], [o.x + o.w, o.z], [o.x + o.w, o.z + o.d], [o.x, o.z + o.d]]
        .map(([x, z]) => [ox + x, oz + z]);
      for (let i = 0; i < 4; i += 1) {
        const a = pts[i]; const b = pts[(i + 1) % 4];
        out.push({
          ...line('DOORS', a[0], a[1], b[0], b[1]), pen: 'HIDDEN', hidden: true, src: host, meta: 'pocket-door-open',
        });
      }
      // TB, in front of the shut door's face.
      const faceZ = oz + d.box.z + d.box.d;
      if (d.TB > 0) {
        const tb = chainH({
          edges: [ox + d.box.x, ox + d.box.x + d.box.w], y: faceZ + ctx.chainFirst, yObj: faceZ,
          labels: [`TB ${formatDimension(d.TB)}`], above: true, ctx,
        });
        for (const e of tb) out.push({ ...e, meta: 'pocket-door-TB', src: host });
      }
      // M, beside the open door on the side away from panel B, from the front plane to its leading edge.
      if (d.M > 0) {
        const free = d.hinge === 'L' ? ox + o.x : ox + o.x + o.w;
        const mz = chainV({
          edges: [oz + d.zf, oz + d.zf + d.M],
          x: free + (d.hinge === 'L' ? -1 : 1) * (ctx.chainFirst / 2),
          xObj: free,
          labels: [`M ${formatDimension(d.M)}`],
          left: d.hinge === 'L',
          ctx,
        });
        for (const e of mz) out.push({ ...e, meta: 'pocket-door-M', src: host });
      }
    }
  }
  return out;
}

/**
 * THE SECTION'S OWN WORDS FOR A POCKET (F7): the two tracks' screw axes on
 * panel B (22 below its top edge, 41 above its bottom edge), each as long as
 * the engine cuts the track (`trackMm`, T1 - 7) from 5 behind the front
 * edge, and T1 itself, from the pocket's front plane back. In the section's
 * frame (x off the wall, y up), as the projector's section entities are.
 * `gapOf(unit)` is how far the unit stands off its wall; `at` is the knife,
 * along the wall (the section looks along the wall towards its end).
 *
 * T82 F7, after the review (roomsheets 3): the tracks are on panel B. Where B
 * stands BEYOND the knife the section sees its face, and the axes are drawn
 * as seen (solid, as the projector draws B and its zones). Where B stands
 * BEHIND the knife (a hand-L pocket, at a run's right end) the section sees
 * panel A, which carries no track: the axes are drawn hidden (dashed) and
 * their words say so ("BEHIND THE CUT" under the track's name), so no track
 * is ever drawn on A as seen.
 */
export function pocketSectionEntities(members, { profile, ctx, gapOf, at = null }) {
  const out = [];
  const seen = new Set();
  for (const m of members || []) {
    const g = pocketDoorGeometry(m.result, profile);
    if (!g) continue;
    const n = g.numbers;
    const oz = Number(gapOf(m.unit)) || 0;
    const base = Number(m.base) || 0;
    const ox = Number(m.x) || 0;
    // The doors whose panel B the knife shows first, so a track seen wins over its twin behind the cut.
    const beyond = (d) => at == null || ox + d.panelB.box.x >= Number(at) - 1e-6;
    const doors = g.doors.filter((d) => d.panelB).sort((a, b) => Number(beyond(b)) - Number(beyond(a)));
    for (const d of doors) {
      const host = `${m.unit.id}:${d.doorId}`;
      const pb = d.panelB.box;
      const seenB = beyond(d);
      const front = oz + d.zf;
      const z0 = front - (n.trackStart ?? 0);
      const z1 = z0 - (d.trackMm ?? 0);
      // T82 F7, after the review (roomsheets 4): the words stand where no board runs. The top axis is
      // 22 under B's top edge and the top board, so a word beside it (with its white mask) erased the
      // board's cut and B's edge. They stand instead in the pocket's clear, inside the two hardware
      // zones' lines (63 under the top, 50 over the bottom) and behind the profile, on a leader from
      // their track, with no mask, as a dimension figure stands: nothing is ever painted out.
      const hText = ctx.mm(1.9);
      const lineH = hText * 1.3;
      const pad = ctx.mm(1);
      const zc = (z1 + z0 - (n.symbol?.d ?? 0)) / 2;
      const rows = [];
      if (n.topAxis != null) {
        rows.push({
          y: base + pb.y + pb.h - n.topAxis, dir: -1, meta: 'hawa-track-top',
          edge: base + pb.y + pb.h - Math.max(n.zoneTop ?? 0, n.topAxis) - pad,
          words: [`TOP TRACK ${formatDimension(n.topAxis)}`, ...(seenB ? [] : ['BEHIND THE CUT'])],
        });
      }
      if (n.bottomAxis != null) {
        rows.push({
          y: base + pb.y + n.bottomAxis, dir: 1, meta: 'hawa-track-bottom',
          edge: base + pb.y + Math.max(n.zoneBottom ?? 0, n.bottomAxis) + pad,
          words: [`BOTTOM TRACK ${formatDimension(n.bottomAxis)}`, ...(seenB ? [] : ['BEHIND THE CUT'])],
        });
      }
      if (d.trackMm > 0) {
        for (const r of rows) {
          const key = `${r.meta}:${r.y}:${z0}:${z1}`;
          if (seen.has(key)) continue;
          seen.add(key);
          out.push(seenB
            ? { ...line('HINGES', z1, r.y, z0, r.y), pen: 'THIN', src: host, meta: r.meta }
            : { ...line('HINGES', z1, r.y, z0, r.y), pen: 'HIDDEN', hidden: true, src: host, meta: r.meta });
          out.push({ ...line('SHEET_MUTED', zc, r.y, zc, r.edge), pen: 'FINE', src: host, meta: `${r.meta}-leader` });
          r.words.forEach((word, i) => {
            out.push({
              ...text('SHEET_MUTED', zc, r.edge + r.dir * (lineH / 2 + i * lineH), word, hText),
              paperHeight: 1.9, src: host, meta: i ? `${r.meta}-label-${i + 1}` : `${r.meta}-label`,
            });
          });
        }
      }
      const key = `T1:${front}:${d.T1}`;
      if (!(d.T1 > 0) || seen.has(key)) continue;
      seen.add(key);
      const t1 = chainH({
        edges: [front - d.T1, front], y: base + pb.y + pb.h / 2, yObj: null,
        labels: [`T1 ${formatDimension(d.T1)}`], above: true, ctx,
      });
      for (const e of t1) out.push({ ...e, meta: 'pocket-T1', src: host });
    }
  }
  return out;
}
