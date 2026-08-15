// ─── TURN 33 (CLAUDE.md F1): THE LED SYSTEM — the owner's spec, verbatim ────
//
// "Pod menu Lighting": ON/OFF for the project, a colour temperature, a
// switching choice by project type — and PLACEMENTS: under a clicked SHELF
// with a depth slider, a 4 mm SIDE line top to bottom, BOTTOM at the plinth,
// TOP washing upward, and small SPOTS in kitchen wall units.
//
// ─── LIGHTING DRILLS NOTHING (rule 3) ───────────────────────────────────────
//
// This module computes PICTURES and PURCHASE LINES: a strip is a thin box in
// the unit's own millimetre frame for the 3D view to draw emissive, and a
// metres line for the BOM. It never touches `result.drills`, never adds a
// panel, never reaches a fixture — the register knows no LED articles today,
// so every BOM line is a YELLOW NAMED SPEC until the owner names products
// (Q4 travels with the PR).
//
// It is deliberately NOT `engine/lighting.js` — that module is turn 26's
// studio-rig arithmetic (the ceiling source and the jupiters) and knows
// nothing of LEDs; the two share nothing but the word.
//
// Pure functions — no React, no three.js, no store (engine rule).

import { migrateDesign } from './design.js';
import { getUnitType } from './types.js';
import { getProjectType } from './projectTypes.js';
import { roundTo } from './format.js';

/** The five placement kinds the owner dictated, 15.08.2026. */
export const LIGHTING_KINDS = ['shelf', 'side', 'bottom', 'top', 'spot'];

/** The profile's lighting block, with every field present. */
export function lightingSpec(profile) {
  const l = profile?.lighting || {};
  const strip = l.strip || {};
  const spot = l.spot || {};
  return {
    temperatures: Array.isArray(l.temperatures) && l.temperatures.length
      ? l.temperatures
      : [{ k: 4000, label: '4000 K', hint: 'Neutral white', hex: '#fff3e0' }],
    defaultTemperature: Number(l.defaultTemperature) > 0 ? Number(l.defaultTemperature) : 4000,
    strip: {
      width: Number(strip.width) > 0 ? Number(strip.width) : 12,
      thickness: Number(strip.thickness) > 0 ? Number(strip.thickness) : 3,
      sideLineWidth: Number(strip.sideLineWidth) > 0 ? Number(strip.sideLineWidth) : 4,
      shelfDepthDefault: Number(strip.shelfDepthDefault) >= 0 ? Number(strip.shelfDepthDefault) : 30,
    },
    spot: {
      diameter: Number(spot.diameter) > 0 ? Number(spot.diameter) : 55,
      defaultCount: Number(spot.defaultCount) > 0 ? Math.trunc(Number(spot.defaultCount)) : 2,
    },
    view: { emissive: Number(l.view?.emissive) > 0 ? Number(l.view.emissive) : 0.85 },
    demo: {
      dimFactor: Number(l.demo?.dimFactor) > 0 ? Number(l.demo.dimFactor) : 0.15,
      emissiveBoost: Number(l.demo?.emissiveBoost) > 0 ? Number(l.demo.emissiveBoost) : 2.6,
    },
  };
}

/**
 * The switching choices for THIS project type — the owner's menu, 15.08.2026:
 * a WARDROBE is `At the door` or a `Sensor`; a KITCHEN is `Touchless`
 * ("kuchnia bezdotykowy"). Every tile in the flow carries a CATEGORY
 * (engine/projectTypes.js) and an untyped project resolves to kitchen there —
 * the app's own fallback since turn 7 — so the menu follows the same road and
 * cannot disagree with the Library or the heights about what kind of job
 * this is.
 */
export function switchChoicesFor(projectTypeId) {
  const category = getProjectType(projectTypeId || '')?.category || null;
  const all = [
    { id: 'door', label: 'At the door', hint: 'A door-contact switch — the light follows the door' },
    { id: 'sensor', label: 'Sensor', hint: 'A motion sensor inside the carcass' },
    { id: 'touchless', label: 'Touchless', hint: 'A wave switch under the cabinet' },
  ];
  if (category === 'wardrobe') return all.filter((c) => c.id !== 'touchless');
  return all.filter((c) => c.id === 'touchless');
}

/** The sensible pre-selection for a project type — the first of its own menu. */
export function defaultSwitchFor(projectTypeId) {
  return switchChoicesFor(projectTypeId)[0]?.id || 'sensor';
}

/** One temperature row, by kelvin — the nearest the list has, never nothing. */
export function temperatureEntry(k, profile) {
  const spec = lightingSpec(profile);
  const want = Number(k) > 0 ? Number(k) : spec.defaultTemperature;
  return spec.temperatures.reduce((best, t) => (
    !best || Math.abs(t.k - want) < Math.abs(best.k - want) ? t : best
  ), null);
}

/**
 * The project's lighting, RESOLVED: design answers first, the profile answers
 * every null — the same shape of resolution the sheen and the heights use.
 */
export function resolveLighting(design, profile) {
  const d = migrateDesign(design);
  const spec = lightingSpec(profile);
  const temperature = d.lighting.temperature || spec.defaultTemperature;
  return {
    enabled: d.lighting.enabled,
    temperature,
    temperatureEntry: temperatureEntry(temperature, profile),
    switch: d.lighting.switch || defaultSwitchFor(d.projectType),
    items: d.lighting.items,
  };
}

/** The interior clear span of a carcass, off its own params. */
function interior(unit) {
  const W = Number(unit?.params?.width) || 0;
  const H = Number(unit?.params?.height) || 0;
  const D = Number(unit?.params?.depth) || 0;
  const G = Number(unit?.params?.board_t) || 18;
  return {
    W, H, D, G,
  };
}

/**
 * The STRIP PICTURES for one unit — thin boxes in the unit's own mm frame
 * (the very frame `panel.box` is in: x across, y up, z back→front), one per
 * placed item that still resolves. An item whose shelf has left the cabinet
 * resolves to nothing and draws nothing: no shelf, no strip.
 *
 * @returns {Array<{id, kind, box:{x,y,z,w,h,d}, round:boolean,
 *   length_mm:number, temperature:number, hex:string}>}
 */
export function stripsForUnit({
  unit, result, design, profile,
}) {
  const lighting = resolveLighting(design, profile);
  if (!lighting.enabled) return [];
  const mine = lighting.items.filter((it) => it.unitId === unit?.id);
  if (!mine.length) return [];

  const spec = lightingSpec(profile);
  const {
    W, H, D, G,
  } = interior(unit);
  const t = spec.strip.thickness;
  const sw = spec.strip.width;
  const hex = lighting.temperatureEntry?.hex || '#fff3e0';
  const out = [];

  for (const item of mine) {
    if (item.kind === 'shelf') {
      const panel = (result?.panels || []).find((p) => p.id === item.ref && p.box);
      if (!panel || panel.role !== 'shelf') continue;      // no shelf, no strip
      const depthMax = Math.max(0, panel.box.d - sw);
      const depth = Math.min(
        depthMax,
        Math.max(0, item.depth_mm == null ? spec.strip.shelfDepthDefault : item.depth_mm),
      );
      out.push({
        id: item.id,
        kind: 'shelf',
        // Under the shelf, the slider's depth measured back from its front edge.
        box: {
          x: panel.box.x,
          y: panel.box.y - t,
          z: panel.box.z + panel.box.d - depth - sw,
          w: panel.box.w,
          h: t,
          d: sw,
        },
        round: false,
        length_mm: panel.box.w,
        depth_mm: depth,
        depth_max: depthMax,
        temperature: lighting.temperature,
        hex,
      });
    } else if (item.kind === 'side') {
      // The owner's 4 mm line, top to bottom, on the INTERIOR face — flush
      // with the carcass front edge, full interior height.
      const line = spec.strip.sideLineWidth;
      const x = item.ref === 'R' ? W - G - t : G;
      out.push({
        id: item.id,
        kind: 'side',
        box: {
          x, y: G, z: D - line, w: t, h: Math.max(0, H - 2 * G), d: line,
        },
        round: false,
        length_mm: Math.max(0, H - 2 * G),
        temperature: lighting.temperature,
        hex,
      });
    } else if (item.kind === 'bottom') {
      // "Pod szafą koło plinth" — under the carcass, at the front, where the
      // plinth line is. It hangs just below y = 0; the legs are below that.
      out.push({
        id: item.id,
        kind: 'bottom',
        box: {
          x: G, y: -t, z: D - sw, w: Math.max(0, W - 2 * G), h: t, d: sw,
        },
        round: false,
        length_mm: Math.max(0, W - 2 * G),
        temperature: lighting.temperature,
        hex,
      });
    } else if (item.kind === 'top') {
      // "Nad szafą w górę" — on top of the carcass at the front, washing the
      // wall or the ceiling above a wardrobe.
      out.push({
        id: item.id,
        kind: 'top',
        box: {
          x: G, y: H, z: D - sw, w: Math.max(0, W - 2 * G), h: t, d: sw,
        },
        round: false,
        length_mm: Math.max(0, W - 2 * G),
        temperature: lighting.temperature,
        hex,
      });
    } else if (item.kind === 'spot') {
      // Kitchen WALL units only — the owner's "małe spotlighty w szafkach
      // wiszących". Evenly spaced under the carcass, count from the item.
      if (getUnitType(unit?.type)?.mount !== 'wall') continue;
      const count = item.count || spec.spot.defaultCount;
      const dia = spec.spot.diameter;
      for (let i = 0; i < count; i += 1) {
        const cx = (W / (count + 1)) * (i + 1);
        out.push({
          id: `${item.id}:${i}`,
          itemId: item.id,
          kind: 'spot',
          box: {
            x: cx - dia / 2, y: -t, z: D / 2 - dia / 2, w: dia, h: t, d: dia,
          },
          round: true,
          length_mm: 0,
          temperature: lighting.temperature,
          hex,
        });
      }
    }
  }
  return out;
}

/**
 * ─── THE BOM BLOCK (F1.4): metres, a driver, a switch, the spots ───────────
 *
 * Every line the same shape bomInvoice's are — `yellow: true` throughout,
 * because the register knows none of these articles today (rule 3: a NAMED
 * SPEC, never an invented number). Strip metres are grouped per temperature;
 * the driver is one line per project that has any run at all.
 *
 * @param {Array<{unit, result}>} entries  the same list buildBom eats
 */
export function lightingBomLines({ entries = [], design, profile }) {
  const lighting = resolveLighting(design, profile);
  if (!lighting.enabled) return [];
  const line = (l) => ({
    article: null, articles: [], source: null, yellow: true, note: null, ...l,
  });

  const metresByK = new Map();
  let spotCount = 0;
  let runCount = 0;
  for (const { unit, result } of entries) {
    for (const strip of stripsForUnit({
      unit, result, design, profile,
    })) {
      if (strip.kind === 'spot') { spotCount += 1; continue; }
      runCount += 1;
      metresByK.set(strip.temperature, (metresByK.get(strip.temperature) || 0) + strip.length_mm);
    }
  }
  if (!runCount && !spotCount) return [];

  const lines = [];
  for (const [k, mmTotal] of [...metresByK.entries()].sort((a, b) => a[0] - b[0])) {
    lines.push(line({
      role: 'led_strip',
      label: `LED strip ${k} K`,
      qty: roundTo(mmTotal / 1000, 2),
      unit: 'm',
      spec_label: `LED strip ${k} K · ${roundTo(mmTotal / 1000, 2)} m`,
    }));
  }
  lines.push(line({
    role: 'led_driver',
    label: 'LED driver / PSU',
    qty: 1,
    unit: 'pcs',
    spec_label: 'LED driver — sized to the strip run',
  }));
  const switchWords = { door: 'Door switch', sensor: 'Motion sensor', touchless: 'Touchless switch' };
  lines.push(line({
    role: 'led_switch',
    label: switchWords[lighting.switch] || 'Switch',
    qty: 1,
    unit: 'pcs',
    spec_label: `${switchWords[lighting.switch] || 'Switch'} — the project's switching choice`,
  }));
  if (spotCount > 0) {
    lines.push(line({
      role: 'led_spots',
      label: 'LED spotlights',
      qty: spotCount,
      unit: 'pcs',
      spec_label: 'LED spotlight — under-cabinet, kitchen wall units',
    }));
  }
  return lines;
}
