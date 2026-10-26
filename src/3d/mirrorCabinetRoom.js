/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T83 F3 · THE MIRROR CABINET IN THE ROOM: THE ARITHMETIC
//
// The owner, 25.10.2026 (14:09): *"zobacz szafki z mirrorami na wierzchu i
// szybkami w srodku czyli szklane polki, czasami lustro z tylu, podswietlenie
// pod spodem etc"*; (14:14) *"panele led trzeba bedzie zamontowac na rowno z
// drzwiami, nie wcisniete, mamy carcas w srodku i panele dookola tego"*;
// *"czasami jak ktos chce to bedzie mial na plecach tez, klikasz na plecy i
// wyskakuje ci opcja chcesz lustro na plecach?"*.
//
// The half of `3d/MirrorCabinet.jsx` that needs no three.js and no React, so a
// node test holds it (the T82 road: `test/turn82-f11-basin-top-room.test.js`).
// Every number is the KIT's (`derived.mirror`, the parts of
// `engine/mirrorCabinet.js`, KIT_MIRROR.lsp) or the house's lighting numbers
// (`engine/ledStrips.js lightingSpec`, read, never written). What is HERE is
// how the room draws them:
//
//   · a MIRROR DOOR is the kit's 22 (the board 18 and the mirror 4, D3): the
//     room draws the board as an 18 deep leaf and the mirror as the 4 in front
//     of it, so the mirror's face IS the kit's face (z = the door box's front)
//     and no board enters the glass (*"material nigdy nie wchodzi w drugi
//     material"*). Both ride the door's own swing (the mirror is T33's mesh,
//     inside the leaf's group).
//   · an LED STILE is a made-to-measure light panel, 4000 K: an emissive warm
//     white at the stile's own box, its face at the mirror's face (D8), lit by
//     the house's switch as every LED is (CHAT-FIX 16.08: off is a whisper).
//   · a GLASS SHELF is drawn with T30's clear pane (the glass door's alpha
//     glass, `paneMaterialFor('clear')` in UnitView), and stays a shelf to the
//     hand: it is dragged and picked as every shelf is.
//   · the LED UNDER and the LED INSIDE are strips as `LedStrips.jsx` draws a
//     strip (the house's strip width and thickness, its emissive numbers, the
//     temperature's hex), at the kit's own lines (`derived.mirror.led`).
//   · the MIRROR ON THE BACK (when asked) is a pane a bay on the BACK's inside
//     face (`BACK.meta.mirrorBack.panes`), in T33's mirror material.
//   · the RECESS: the cabinet's back line is `collision.js backStandoff`, the
//     one placement every unit stands at (`runs.js wallGapOf` takes
//     `recess_mm` off the gap), so typing 155 moves the whole cabinet 155 into
//     the wall and nothing here moves a part on its own.
//   · the BACK's click asks "Mirror on the back?" (`openModal('mirror-back')`).

import { lightingSpec, resolveLighting, temperatureEntry } from '../engine/ledStrips.js';
import { backStandoff } from '../engine/collision.js';
import { useUiStore } from '../stores/uiStore.js';

// ─── THE MATERIALS (pictures, never a cut: T30 F21's standing) ─────────────

/**
 * T33's mirror, the one mirror of the app: a light grey, fully metallic,
 * almost no roughness, the environment in it (*"a reflective grey with an
 * environment reflection"*, CLAUDE.md T83 F3, PROPOSED). The door's mirror
 * (UnitView MovingPanel) and the back's panes (MirrorCabinet.jsx) both wear it.
 */
export const MIRROR_LOOK = Object.freeze({
  color: '#e8edf0',
  metalness: 1,
  roughness: 0.03,
  envMapIntensity: 2.2,
});

/**
 * The LED light panel's diffuser: milky (*"mleczne led panele"*), matt, no
 * environment in it. A picture number, PROPOSED.
 */
export const LED_PANEL_ROUGHNESS = 0.6;

/** The glass kind a glass shelf is drawn in: T30 / T78 F12's clear pane, PROPOSED. */
export const GLASS_SHELF_KIND = 'clear';

/** The house's strip, as `LedStrips.jsx` draws it (its own roughness). */
export const LED_STRIP_ROUGHNESS = 0.4;

// ─── WHAT A PART IS ────────────────────────────────────────────────────────

/** The kit's record of a mirror cabinet, or null for every other unit. */
export function mirrorOf(result) {
  return result?.derived?.mirror || null;
}

/** A mirror cabinet's door (part FRONT, `meta.mirrorCabinet.role` door). */
export function isMirrorDoor(panel) {
  return panel?.part === 'FRONT' && panel?.meta?.mirrorCabinet?.role === 'door';
}

/** A mirror cabinet's LED stile (the bought light panel), not a timber one. */
export function isLedStile(panel) {
  return panel?.role === 'led_stile';
}

/** A mirror cabinet's glass shelf (`meta.glassShelf`, never the glass door's `meta.glass`). */
export function isGlassShelf(panel) {
  return Boolean(panel?.meta?.glassShelf);
}

// ─── THE DOOR: THE BOARD 18 AND THE MIRROR 4 ───────────────────────────────

/**
 * The two solids of a mirror door: the board (its box from the back, the
 * board's own thickness) and the mirror in front of it, which together are
 * the kit's box. A door without a mirror (`mirror_doors` off) is its board.
 *
 * @returns {{ board: object, mirror: object|null }|null}  null for any other part
 */
export function mirrorDoorSolids(panel) {
  if (!isMirrorDoor(panel) || !panel.box) return null;
  const b = panel.box;
  const m = panel.meta?.mirror;
  const t = Number(m?.t) || 0;
  const board = Number(panel.meta.mirrorCabinet.board) || (b.d - t);
  if (!m || !(t > 0)) return { board: { ...b }, mirror: null };
  const mw = Number(m.w) || b.w;
  const mh = Number(m.h) || b.h;
  return {
    board: { ...b, d: board },
    mirror: {
      x: b.x + (b.w - mw) / 2, y: b.y + (b.h - mh) / 2, z: b.z + board, w: mw, h: mh, d: t,
    },
  };
}

const ROOM_PANELS = new WeakMap();

/**
 * The panel the room draws for a kit part: a mirror door's BOARD (its box the
 * board's 18, `meta.mirror.flush` so MovingPanel lays T33's mirror as the 4 in
 * front of it, at the kit's face); every other part is itself, the same
 * object, so every kit before tonight is drawn from exactly what it was.
 * Kept per engine panel, so a leaf's memos hold from one render to the next.
 */
export function mirrorRoomPanel(panel) {
  if (!isMirrorDoor(panel) || !panel.meta?.mirror || !(Number(panel.meta.mirror.t) > 0)) return panel;
  const had = ROOM_PANELS.get(panel);
  if (had) return had;
  const { board } = mirrorDoorSolids(panel);
  const room = {
    ...panel,
    box: board,
    meta: { ...panel.meta, mirror: { ...panel.meta.mirror, flush: true } },
  };
  ROOM_PANELS.set(panel, room);
  return room;
}

/**
 * Where a door's mirror stands in the room, in the unit's mm (z0 its back,
 * t its thickness), read off the panel MovingPanel is handed: a flush mirror
 * (the mirror cabinet's) is the 4 in front of the board; T33's stuck-on
 * mirror is its own 2 mm plane 1.2 mm off the leaf's face, as it always was.
 */
export function doorMirrorPlate(panel) {
  const m = panel?.meta?.mirror;
  if (!m || !panel.box) return null;
  const b = panel.box;
  if (m.flush) return { z0: b.z + b.d, t: Number(m.t) };
  const centre = m.face === 'outside' ? b.z + b.d + 1.2 : b.z - 1.2;
  return { z0: centre - 1, t: 2 };
}

// ─── THE LIGHT ─────────────────────────────────────────────────────────────

/**
 * The colour and the brightness of the cabinet's LEDs (the stiles and the two
 * strips): the temperature's hex (`profile.lighting.temperatures`, 4000 K the
 * kit's `ledKelvin`), and the house's emissive by the project's switch, the
 * very expression `LedStrips.jsx` lights a strip with.
 */
export function mirrorLedGlow(result, { profile, design = null } = {}) {
  const kelvin = Number(mirrorOf(result)?.led?.kelvin) || Number(profile?.mirror?.ledKelvin) || 4000;
  const spec = lightingSpec(profile);
  const on = Boolean(resolveLighting(design, profile).on);
  const boost = on ? spec.demo.emissiveBoost : 1;
  return {
    kelvin,
    hex: temperatureEntry(kelvin, profile)?.hex || '#fff3e0',
    on,
    intensity: on ? spec.view.emissive * boost : spec.view.offEmissive,
  };
}

/**
 * The surface the room hands MovingPanel for a part: an LED stile lit
 * (`emissive`), a glass shelf in T30's clear glass (`glass`), every other part
 * the surface it already had (the same object). The contour view is outlines
 * only: nothing changes there.
 */
export function mirrorRoomSurface(panel, surface, { profile, design = null, contour = false } = {}) {
  if (contour || !surface) return surface;
  if (isLedStile(panel)) {
    const kelvin = Number(panel.meta?.mirrorCabinet?.kelvin) || Number(profile?.mirror?.ledKelvin) || 4000;
    const spec = lightingSpec(profile);
    const on = Boolean(resolveLighting(design, profile).on);
    const hex = temperatureEntry(kelvin, profile)?.hex || '#fff3e0';
    return {
      ...surface,
      colour: hex,
      texture: null,
      fallback: null,
      sprayed: false,
      roughness: LED_PANEL_ROUGHNESS,
      metalness: 0,
      clearcoat: 0,
      clearcoatRoughness: 0,
      envMapIntensity: 0,
      emissive: hex,
      emissiveIntensity: on ? spec.view.emissive * spec.demo.emissiveBoost : spec.view.offEmissive,
    };
  }
  if (isGlassShelf(panel)) {
    return {
      ...surface, texture: null, fallback: null, sprayed: false, glass: GLASS_SHELF_KIND,
    };
  }
  return surface;
}

// ─── WHAT THE ROOM DRAWS BESIDE THE PARTS ──────────────────────────────────

/** The mirror on the BACK, a pane a bay on its inside face (empty when not asked). */
export function mirrorBackPanes(result) {
  if (!mirrorOf(result)) return [];
  const back = (result.panels || []).find((p) => p.meta?.mirrorCabinet?.clickAsks === 'mirror-back');
  const panes = back?.meta?.mirrorBack?.panes || [];
  return panes.map((pn) => ({ id: `${back.id}:MIRROR-${pn.bay}`, of: back.id, bay: pn.bay, box: { ...pn.box } }));
}

/**
 * The LED under and the LED inside as boxes in the unit's frame, the house's
 * strip (width and thickness from `lightingSpec`): the strip under lies on the
 * cabinet's underside along its line, the strip inside stands on the side's
 * inner face along its line, from the floor of the bays to the TOP.
 */
export function mirrorLedStrips(result, profile) {
  const m = mirrorOf(result);
  if (!m?.led) return [];
  const s = lightingSpec(profile).strip;
  const t = s.thickness;
  const out = [];
  const num = result.unitNum || '';
  if (m.led.under) {
    const u = m.led.under;
    out.push({
      id: `${num}:LED-UNDER`, kind: 'bottom', face: u.face, length: u.length,
      box: { x: u.x, y: u.y - t, z: u.z - s.width / 2, w: u.length, h: t, d: s.width },
    });
  }
  if (m.led.inside) {
    const i = m.led.inside;
    const line = s.sideLineWidth;
    out.push({
      id: `${num}:LED-INSIDE`, kind: 'side', side: i.side, wall: i.wall, length: i.length,
      box: { x: i.side === 'R' ? i.x - t : i.x, y: i.y0, z: i.z - line / 2, w: t, h: i.length, d: line },
    });
  }
  return out;
}

/**
 * Every solid the room draws for a mirror cabinet, by id: each kit part (a
 * mirror door as its board and its mirror, both carrying the door's id in
 * `of`), the back's panes and the two strips (`of` null: they are the kit's
 * records, not parts). Empty for every other unit.
 */
export function mirrorRoomSolids(result, profile) {
  if (!mirrorOf(result)) return [];
  const out = [];
  for (const p of result.panels || []) {
    if (!p.box) continue;
    const door = mirrorDoorSolids(p);
    if (door) {
      out.push({ id: p.id, of: p.id, kind: 'door', box: door.board });
      if (door.mirror) out.push({ id: `${p.id}:MIRROR`, of: p.id, kind: 'door_mirror', box: door.mirror });
      continue;
    }
    let kind = 'board';
    if (isLedStile(p)) kind = 'led_stile';
    else if (isGlassShelf(p)) kind = 'glass_shelf';
    else if (p.meta?.mirrorCabinet?.role === 'panel') kind = 'panel';
    out.push({ id: p.id, of: p.id, kind, box: { ...p.box } });
  }
  for (const pn of mirrorBackPanes(result)) out.push({ id: pn.id, of: null, kind: 'back_mirror', box: pn.box });
  for (const s of mirrorLedStrips(result, profile)) out.push({ id: s.id, of: null, kind: `led_${s.kind}`, box: s.box });
  return out;
}

/**
 * Where the cabinet stands off its wall line (mm, + into the room): its back
 * (`backStandoff`, the room's own placement), its carcass front and its
 * mirror face. A recess of 155 is the back 155 further into the wall.
 */
export function mirrorRecessPlacement(unit, result, profile) {
  const m = mirrorOf(result);
  const back = backStandoff(unit, profile);
  const D = Number(m?.depth ?? unit?.params?.depth) || 0;
  const faceT = Number(m?.faceT) || 0;
  return {
    recessMm: Number(m?.recess?.mm) || 0,
    backMm: back,
    carcassFrontMm: back + D,
    faceMm: back + D + faceT,
    wallOpening: m?.recess?.wallOpening || null,
  };
}

// ─── THE BACK'S CLICK ──────────────────────────────────────────────────────

/** "Mirror on the back?": the small window at the click, about this cabinet. */
export function askMirrorBack(unitId, at) {
  useUiStore.getState().openModal('mirror-back', {
    unitId, at: at ? { x: at.x, y: at.y } : null,
  });
}

function isOverlay(object) {
  for (let o = object; o; o = o.parent) if (o.userData?.ccHelper) return true;
  return false;
}

/**
 * The click handler of a mirror cabinet's BACK (`meta.mirrorCabinet.clickAsks`),
 * or null for every other part. A plain click (the left button, no drag past
 * react-three-fiber's own 2 px) on the back itself, the nearest board the ray
 * meets (T74 F1's test: a door in front of the back keeps the click), asks.
 */
export function mirrorBackClick(panel, unitId) {
  if (panel?.meta?.mirrorCabinet?.clickAsks !== 'mirror-back') return null;
  return (e) => {
    if (((e.nativeEvent || e).button ?? 0) !== 0) return;
    if (Number(e.delta) > 2) return;
    const first = (e.intersections || []).find((h) => !isOverlay(h.eventObject))?.eventObject;
    if (first && first !== e.eventObject) return;
    e.stopPropagation?.();
    askMirrorBack(unitId, { x: e.clientX, y: e.clientY });
  };
}
