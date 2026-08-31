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
// T55 (CLAUDE.md F7): the SAME roof law the carcass is cut with — named
// source: `slopeHeightAt` over `carcassCutLineOf` (engine/puzzle.js, the T54
// two-reach law, the TOP PANEL / CORNICE precedent). Never a second sampler.
import {
  carcassCutLineOf, roofLinePts, slopeCutActive, slopeHeightAt,
} from './puzzle.js';

/** The five placement kinds the owner dictated, 15.08.2026. */
export const LIGHTING_KINDS = ['shelf', 'side', 'bottom', 'top', 'spot'];

const pos = (v, fallback) => (Number(v) > 0 ? Number(v) : fallback);

/** The profile's lighting block, with every field present. */
export function lightingSpec(profile) {
  const l = profile?.lighting || {};
  // Turn 34 (CLAUDE.md F2): the EMISSION numbers live here now.
  const a = profile?.appearance?.lighting || {};
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
      // CHAT-FIX 16.08 (owner, variant A): the edge-offset default is 80 for
      // EVERY strip, saved projects included; the slider walks 0…insetMax in
      // 10s beside a type-in field. Profile keys win when a profile names
      // them — these literals are the fallback, same as width/thickness.
      insetDefault: Number(strip.insetDefault) >= 0 ? Number(strip.insetDefault) : 80,
      // CHAT-FIX 16.08 (owner): "światła pod plinthem na stałe 10 mm od
      // krawędzi, bez możliwości zmiany" — the bottom strip's inset is LAW,
      // not a setting: the engine ignores the item's own number.
      plinthInset: Number(strip.plinthInset) >= 0 ? Number(strip.plinthInset) : 10,
      insetMax: Number(strip.insetMax) > 0 ? Number(strip.insetMax) : 200,
    },
    // ─── CHAT-FIX 16.08 (owner, point 2): THE HALO ───────────────────────────
    // "nie daje światła typowo wychodzącego ze stripów … nie widzę poświaty,
    // promieni od tej linii". Two parts, both in-core (zero new deps): a
    // RectAreaLight per strip (real light falling on the boards) and an
    // additive glow quad around the line itself. Numbers here are fallbacks;
    // a profile that names `lighting.halo.*` wins.
    halo: {
      area: Number(l.halo?.area) > 0 ? Number(l.halo.area) : 22,
      glowOpacity: Number(l.halo?.glowOpacity) > 0 ? Number(l.halo.glowOpacity) : 0.32,
      glowScale: Number(l.halo?.glowScale) > 0 ? Number(l.halo.glowScale) : 6,
      maxAreaLights: Number(l.halo?.maxAreaLights) > 0 ? Number(l.halo.maxAreaLights) : 16,
    },
    spot: {
      diameter: Number(spot.diameter) > 0 ? Number(spot.diameter) : 55,
      defaultCount: Number(spot.defaultCount) > 0 ? Math.trunc(Number(spot.defaultCount)) : 2,
    },
    // ─── TURN 34 (CLAUDE.md F2): THE BRIGHTNESS LIVES IN `appearance` ───────
    // "są zbyt słabe — nic nie widać, za słabo świecą" (owner, 16.08.2026).
    // The numbers moved to `profile.appearance.lighting.*` — the spec's own
    // home for them — and rose. `profile.lighting.view/demo` is still read as
    // the fallback, so a profile saved before this turn keeps its own answer
    // rather than being silently brightened.
    view: {
      emissive: pos(a.emissive, pos(l.view?.emissive, 0.85)),
      spotMultiplier: pos(a.spotEmissiveMultiplier, 1),
      // CHAT-FIX 16.08 (owner): "jak wyłączę światło, to się LED-y nie
      // wyłączają, a powinny" — the switch is a SWITCH now. Off = the strip
      // is dark plastic (a whisper of emissive so the geometry still reads),
      // no aura, no lamp.
      offEmissive: pos(a.offEmissive, 0.1),
    },
    demo: {
      dimFactor: pos(a.demoDimFactor, pos(l.demo?.dimFactor, 0.15)),
      emissiveBoost: pos(a.emissiveBoost, pos(l.demo?.emissiveBoost, 2.6)),
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

/**
 * ─── F2: THE DEMO'S DIM (one factor, derived, never stored) ────────────────
 * What the WHOLE studio rig is multiplied by while "Turn on the light" is on.
 * One number on every lamp and on the environment together, so the balance
 * turn 26 computed — the ceiling against the jupiters, the key against the
 * fill — does not move; the room only goes down, and comes back exactly
 * because nothing was written anywhere.
 */
export function demoDimFactor(on, profile) {
  return on ? lightingSpec(profile).demo.dimFactor : 1;
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
    // ─── TURN 35 (CLAUDE.md F10): ONE FLAG ────────────────────────────────
    // `enabled` and the session's demo flag are one answer now — `on` — and
    // this is where everything downstream reads it (design.js migrateLighting
    // holds the merge and the legacy rule).
    on: d.lighting.on,
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
  if (!lighting.on) return [];                    // T35 F10: the one state
  const spec = lightingSpec(profile);
  const hex = lighting.temperatureEntry?.hex || '#fff3e0';

  // ─── TURN 58b (CLAUDE.md F2): THE STRIPS THE GLASS BROUGHT WITH IT ────────
  //
  // A watch pane births its own strip beside its aperture, at the BACK of the
  // shelf (`engine/cabinet.js`, the T53 block). It is an ORDINARY record —
  // `kind: 'shelf'`, a box, a length — so it needs no special case anywhere
  // downstream: `LedStrips.jsx` draws it as it draws every strip and
  // `lightingBomLines` counts its metres like any other. All this adds is the
  // two fields that belong to the PROJECT rather than to the cabinet: the
  // colour temperature and its hex, which every strip below is stamped with
  // in exactly the same way.
  //
  // A unit with no pane answers an empty list, so a project without one is
  // byte for byte what it always was — including the early return below.
  const born = (result?.assemblies?.watchGlass || [])
    .map((pane) => pane?.strip)
    .filter((strip) => strip && strip.box)
    .map((strip) => ({ ...strip, temperature: lighting.temperature, hex }));

  const mine = lighting.items.filter((it) => it.unitId === unit?.id);
  if (!mine.length && !born.length) return [];

  const {
    W, H, D, G,
  } = interior(unit);
  const t = spec.strip.thickness;
  const sw = spec.strip.width;
  const out = [...born];

  // ─── T55 (CLAUDE.md F7): THE LED LEARNS THE RAKE — LEVEL RUNS ONLY ───────
  // The owner: *"skos bez LED … pionowych i poziomych łatwiej."*
  // The roof is the carcass's OWN: `slopeHeightAt` over `carcassCutLineOf`
  // (the engine echoes the line it was cut with on `result.params.slope_cut`)
  // capped at H — the same walk `roofLinePts` gives the top boards. A flat
  // room has no line, `raked` is false, and every strip below is byte for
  // byte what it always was.
  const cutLine = carcassCutLineOf(result?.params?.slope_cut || null, W, H, profile);
  const raked = Boolean(cutLine) && slopeCutActive(cutLine);
  const roofAt = (x) => (raked ? Math.min(H, slopeHeightAt(cutLine, x)) : H);
  /** LEVEL stretches of the roof polyline inside [x0, x1] — no strip on the
   * diagonal, each run trimmed to its own span at its own height. */
  const levelRuns = (x0, x1) => {
    if (!raked) return [{ from: x0, to: x1, y: H }];
    const pts = roofLinePts(cutLine, H) || [];
    const runs = [];
    for (let i = 1; i < pts.length; i += 1) {
      const a = pts[i - 1];
      const b = pts[i];
      if (Math.abs(b.y - a.y) > 1e-6) continue;          // the diagonal: no strip
      const from = Math.max(x0, Math.min(a.x, b.x));
      const to = Math.min(x1, Math.max(a.x, b.x));
      if (to - from > 1e-6) runs.push({ from, to, y: Math.min(H, a.y) });
    }
    return runs;
  };

  // ─── TURN 34 (CLAUDE.md F2): THE EDGE OFFSET ──────────────────────────────
  // "nie ma możliwości ustawienia jak daleko od edge" (owner, 16.08.2026).
  // ONE number per strip, applied along DEPTH and to nothing else: the strip
  // moves back from the front edge by `inset_mm` and keeps its length, its
  // width and its height.
  //
  // CHAT-FIX 16.08 (owner, variant A — his word): *"default 80 mm wszystkie"*
  // — a strip with NO answer sits 80 off the edge, and that includes every
  // strip already placed in a saved project. An EXPLICIT 0 is still the
  // owner's own hand saying "flush at the edge" and stays T33's geometry.
  //
  // DRILLING STAYS ZERO — this module has never touched `result.drills` and
  // this feature does not begin (T33 rule 3, verbatim).
  const insetOf = (item) => {
    // The plinth line is FIXED (owner, 16.08): always the profile's 10, the
    // item's own number — old or new — is not read.
    if (item?.kind === 'bottom') return spec.strip.plinthInset;
    if (item?.inset_mm === undefined || item?.inset_mm === null) {
      // Variant A is a STRIP law — the panel offers no edge field for a
      // spot ("spots have no edge to be off"), so a silent 80 would move
      // what no hand can put back. A spot with no answer stays put.
      return item?.kind === 'spot' ? 0 : spec.strip.insetDefault;
    }
    const n = Number(item.inset_mm);
    return Number.isFinite(n) && n > 0 ? n : 0;
  };

  for (const item of mine) {
    const inset = insetOf(item);
    if (item.kind === 'shelf') {
      const panel = (result?.panels || []).find((p) => p.id === item.ref && p.box);
      if (!panel || panel.role !== 'shelf') continue;      // no shelf, no strip
      // CHAT-FIX 16.08 (variant A): the clamp counts the INSET too — with a
      // default 80 a full-depth strip used to poke 80 through the shelf's
      // back. The strip lives within the shelf, inset included.
      const depthMax = Math.max(0, panel.box.d - sw - inset);
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
          z: panel.box.z + panel.box.d - depth - sw - inset,
          w: panel.box.w,
          h: t,
          d: sw,
        },
        round: false,
        length_mm: panel.box.w,
        depth_mm: depth,
        inset_mm: inset,
        depth_max: depthMax,
        temperature: lighting.temperature,
        hex,
      });
    } else if (item.kind === 'side') {
      // The owner's 4 mm line, top to bottom, on the INTERIOR face — flush
      // with the carcass front edge, full interior height.
      // T55 (F7): under the rake the vertical strip ENDS AT THE ROOF over its
      // own x — sampled conservatively across its own thickness, minus the
      // same board insets it has always kept. A flat roof answers H and the
      // strip is the strip it always was.
      const line = spec.strip.sideLineWidth;
      const x = item.ref === 'R' ? W - G - t : G;
      const topY = Math.min(roofAt(x), roofAt(x + t));
      out.push({
        id: item.id,
        kind: 'side',
        side: item.ref === 'R' ? 'R' : 'L',
        box: {
          x, y: G, z: D - line - inset, w: t, h: Math.max(0, topY - 2 * G), d: line,
        },
        round: false,
        length_mm: Math.max(0, topY - 2 * G),
        inset_mm: inset,
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
          x: G, y: -t, z: D - sw - inset, w: Math.max(0, W - 2 * G), h: t, d: sw,
        },
        round: false,
        length_mm: Math.max(0, W - 2 * G),
        inset_mm: inset,
        temperature: lighting.temperature,
        hex,
      });
    } else if (item.kind === 'top') {
      // "Nad szafą w górę" — on top of the carcass at the front, washing the
      // wall or the ceiling above a wardrobe.
      // T55 (F7): only on LEVEL stretches of the roof polyline, each piece
      // trimmed to its stretch's span at its stretch's own height — NO strip
      // along the diagonal, nothing proud of the carcass. A flat roof is one
      // level stretch and the strip is byte for byte what it always was.
      levelRuns(G, W - G).forEach((run, i, all) => {
        out.push({
          id: all.length === 1 ? item.id : `${item.id}:${i}`,
          kind: 'top',
          box: {
            x: run.from, y: run.y, z: D - sw - inset, w: Math.max(0, run.to - run.from), h: t, d: sw,
          },
          round: false,
          length_mm: Math.max(0, run.to - run.from),
          inset_mm: inset,
          temperature: lighting.temperature,
          hex,
          ...(all.length === 1 ? {} : { itemId: item.id }),
        });
      });
    } else if (item.kind === 'top_under') {
      // ─── CHAT-FIX 16.08 (owner): UNDER the top — "mamy ledy na górnym
      // wieńcu, ale od góry tylko, a nie ma od dołu jak półka" ──────────────
      // The same strip the top wash is, hung on the UNDERSIDE of the top
      // board, shining down into the cabinet — the top behaves like one more
      // shelf. Same width law, same inset, same everything.
      // T55 (F7): the same level-runs law as the wash above — the underside
      // of a raked roof takes no strip; a level stretch takes its own.
      levelRuns(G, W - G).forEach((run, i, all) => {
        out.push({
          id: all.length === 1 ? item.id : `${item.id}:${i}`,
          kind: 'top_under',
          box: {
            x: run.from, y: run.y - G - t, z: D - sw - inset, w: Math.max(0, run.to - run.from), h: t, d: sw,
          },
          round: false,
          length_mm: Math.max(0, run.to - run.from),
          inset_mm: inset,
          temperature: lighting.temperature,
          hex,
          ...(all.length === 1 ? {} : { itemId: item.id }),
        });
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
            x: cx - dia / 2, y: -t, z: D / 2 - dia / 2 - inset, w: dia, h: t, d: dia,
          },
          round: true,
          length_mm: 0,
          inset_mm: inset,
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
  if (!lighting.on) return [];                    // T35 F10: the one state
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
