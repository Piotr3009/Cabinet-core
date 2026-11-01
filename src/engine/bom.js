// ─── Bill of materials ───
// Aggregates engine output across units into the rows the BOM panel and the
// exports render. Computed LIVE from the current state at all times; the panel
// only decides WHEN to show it (SPEC 4.11), and an export is a snapshot of
// whatever the state is at that moment.
//
// Pure functions — no React, no store imports.

// T83 F4 . formatMm: the mirror cabinet's order lines print a size as the app prints a millimetre.
import { formatMm, roundTo } from './format.js';
import { resolvePanelMaterial } from './materials.js';
import { frontManufacturing } from './frontDecorationBom.js';
import {
  PART_REGISTRY, HARDWARE_TO_PART_ID, LIGHTING_TO_PART_ID,
  partIdForElement, edgePartFor, cabinetFamilyOf, assignmentFor, normalizeAssignments,
} from './partRegistry.js';
// T-CC2a F6: the family sheet sizes of checks.js stay for the CNC checks and
// are no longer read by the purchase list (the company's link holds the size).
import { lightingBomLines } from './ledStrips.js';
// T75 F5 · the worktop's slabs, joint and cut-outs, resolved from the design.
// T75 F22 · the state of every line, read off the part.
import { appliedStripNotes, readinessOf, vanityTopNotes } from './readiness.js';
import { worktopsFor } from './worktop.js';
import { migrateDesign, sprayFinishLabel } from './design.js';
import { roomWalls } from './room.js';
import { dowelNoteRow } from './dowels.js';
// T78 F20 · a Cabineo unit's cut list says so in a NOTE row of the same grammar (OUTSIDE FACE UP, the gate).
import { cabineoNoteRow } from './cabineo.js';
// T78 F21 - the paint of the sprayed sets, litres off the spray schedule (CLAUDE.md PART F).
import { paintLinesFor, paintPurchaseQtys, sprayAreaFor } from './spray.js';
// T-CC2a PART B: the catalogue the purchase list is keyed by, the plate the hinges
// sit on, the plinth's front legs and the bought boxes (bomInvoice.js's own reads).
import {
  DEPARTMENTS, NOT_IN_CATALOGUE, catalogueIdOfLine, edgeEntryOfBoard, entryById, isMdfSource,
} from './catalogue.js';
import { resolveHingePlate } from './hinges.js';
import { frontLegCount } from './legs.js';
import { readyBoxLines } from './bomInvoice.js';
// T83 F4 . the profile the mirror cabinet's articles are read from when the caller hands none.
import { getCabinetProfile } from './profile.js';

// ─── T83 F4 · THE MIRROR CABINET IS BOUGHT AS MUCH AS IT IS CUT ─────────────
//
// The owner, 25.10.2026 (14:09): *"zobacz szafki z mirrorami na wierzchu i
// szybkami w srodku czyli szklane polki, czasami lustro z tylu, podswietlenie
// pod spodem etc"*; (14:29) *"nie wlasny box, ktos nam to zrobi na
// zamowienie"*, *"4k"*. CLAUDE.md T83 F4: *"Lines per cabinet: "LED light
// panel, made to measure, 4000 K, 75 x H" (one per LED stile), "Mirror 4 mm"
// (m2, the doors and the back when on), "Glass shelf 6 mm toughened, W x D"
// (one per shelf), "LED strip under" and "LED strip inside" (lm), "LED driver
// 24 V" (one), "Fused spur by electrician" (a note), the hinges by weight, the
// shelf pins, the hanging brackets as the vanity's. Articles empty strings
// (`profile.mirror.articles`) for the owner to fill."*
//
// Every quantity is the KIT's (`derived.mirror` and the parts of
// `engine/mirrorCabinet.js`, KIT_MIRROR.lsp): nothing is counted here that the
// kit did not say. The lines are hardware lines in `computeCabinet`'s own
// shape ({ role, label, qty, unit, spec, spec_label }), so the BOM merges them
// as it merges every bought thing (role and spec label), the ironmongery block
// prints them, and the purchase list reads the ones the registry knows (the
// hinges, the pins, the strip, the vanity's hanger). The kit's BOUGHT parts
// (the LED stiles, the glass shelves: `material_role` 'bought') leave the cut
// rows: they are these order lines, never a board.

/** Is this panel one of a mirror cabinet's bought parts (an order line, not a cut)? */
function mirrorBought(result, panel) {
  return Boolean(result?.derived?.mirror) && panel?.material_role === 'bought';
}

/** A size as the line prints it: 75 x 937, 336.5 x 177. */
const mmText = (v) => formatMm(v);

/**
 * The mirror cabinet's order lines, in `result.hardware`'s shape; [] for every
 * other unit.
 *
 * @param {object} result   computeCabinet's result
 * @param {object} [profile] the cabinet profile (the articles, the pins)
 */
export function mirrorCabinetOrderLines(result, profile = null) {
  const m = result?.derived?.mirror;
  if (!m) return [];
  const P = profile || getCabinetProfile();
  const articles = P?.mirror?.articles || {};
  const art = (k) => String(articles[k] || '');
  const said = (k, text) => (art(k) ? `${art(k)} · ${text}` : text);
  const lines = [];
  const push = (role, label, qty, unit, spec, specLabel) => {
    if (qty > 0) lines.push({ role, label, qty, unit, spec, spec_label: specLabel });
  };
  const kelvin = Number(m.led?.kelvin) || Number(P?.mirror?.ledKelvin) || 4000;

  // ── the LED light panels: one a LED stile, made to measure, by size ──
  const ledPanels = new Map();
  for (const s of m.stiles || []) {
    if (s.kind !== 'led') continue;
    const key = `${mmText(s.w)} x ${mmText(s.h)}`;
    const had = ledPanels.get(key);
    if (had) had.n += 1; else ledPanels.set(key, { w: s.w, h: s.h, n: 1 });
  }
  for (const [size, g] of ledPanels) {
    push('mirror_led_panel', `LED light panel, made to measure, ${kelvin} K, ${size}`, g.n, 'pcs',
      {
        width_mm: g.w, height_mm: g.h, thickness_mm: m.faceT, kelvin, made_to_measure: true, article: art('ledPanel') || null,
      },
      said('ledPanel', `${size} mm`));
  }

  // ── the mirror, 4 mm, in m2: the doors' and the back's when asked ──
  const doorsM2 = Number(m.mirrorArea?.doors_m2) || 0;
  const backM2 = Number(m.mirrorArea?.back_m2) || 0;
  const back = (result.panels || []).find((p) => p.meta?.mirrorBack?.panes?.length);
  const pieces = [
    ...(m.mirrorDoors ? (m.doors || []).map((d) => ({ on: d.id, w: d.w, h: d.h })) : []),
    ...(back ? back.meta.mirrorBack.panes.map((pn) => ({ on: `${back.id} bay ${pn.bay}`, w: pn.w, h: pn.h })) : []),
  ];
  // eslint-disable-next-line no-nested-ternary
  const where = doorsM2 > 0 && backM2 > 0 ? 'on the doors and the back' : (backM2 > 0 ? 'on the back' : 'on the doors');
  push('mirror_m2', `Mirror ${formatMm(m.mirrorT)} mm`, roundTo(doorsM2 + backM2, 4), 'm²',
    {
      thickness_mm: m.mirrorT, doors_m2: doorsM2, back_m2: backM2, pieces, article: art('mirror') || null,
    },
    said('mirror', where));

  // ── the glass shelves, 6 mm toughened, one a shelf, by size ──
  const glass = new Map();
  for (const p of result.panels || []) {
    if (!p.meta?.glassShelf) continue;
    const key = `${mmText(p.w)} x ${mmText(p.h)}`;
    const had = glass.get(key);
    if (had) had.n += 1; else glass.set(key, { w: p.w, d: p.h, t: Number(p.meta.glassShelf.t) || Number(m.glassT) || 0, n: 1 });
  }
  for (const [size, g] of glass) {
    push('mirror_glass_shelf', `Glass shelf ${formatMm(g.t)} mm toughened, ${size}`, g.n, 'pcs',
      {
        width_mm: g.w, depth_mm: g.d, thickness_mm: g.t, toughened: true, article: art('glassShelf') || null,
      },
      said('glassShelf', `${size} mm`));
  }

  // ── the LED strips, under and inside, in linear metres ──
  const under = m.led?.under;
  if (under) {
    push('led_strip', 'LED strip under', roundTo(under.length / 1000, 3), 'm',
      {
        length_mm: under.length, kelvin, face: under.face, article: art('ledStripUnder') || null,
      },
      said('ledStripUnder', `${mmText(under.length)} mm, ${kelvin} K, under the cabinet`));
  }
  const inside = m.led?.inside;
  if (inside) {
    push('led_strip', 'LED strip inside', roundTo(inside.length / 1000, 3), 'm',
      {
        length_mm: inside.length, kelvin, side: inside.side, article: art('ledStripInside') || null,
      },
      said('ledStripInside', `${mmText(inside.length)} mm, ${kelvin} K, inside on the ${inside.side === 'R' ? 'right' : 'left'} side`));
  }

  // ── the one LED driver, 24 V, in the bottom box ──
  const volts = Number(m.led?.driverVolts) || Number(P?.mirror?.ledDriverVolts) || 24;
  push('mirror_led_driver', `LED driver ${volts} V`, Number(m.led?.driver) || 0, 'pcs',
    {
      volts, panels: m.led?.stiles || 0, under: Boolean(under), inside: Boolean(inside), article: art('ledDriver') || null,
    },
    said('ledDriver', m.bottomBox?.on ? 'in the bottom box, for the LED panels and the strips' : 'for the LED panels and the strips'));

  // ── the hinges, by the door's weight with its mirror (the kit's ladder) ──
  const hinges = new Map();
  for (const d of m.doors || []) {
    const onDivider = /^DIVIDER-/.test(String(d.hingeOn || ''));
    const key = `${d.hinges}|${onDivider ? 'divider' : 'side'}|${d.band?.maxWeightKg ?? ''}|${d.band?.maxHeightMm ?? ''}`;
    const had = hinges.get(key);
    if (had) { had.doors.push(d); } else {
      hinges.set(key, {
        per: d.hinges, onDivider, band: d.band, doors: [d],
      });
    }
  }
  for (const g of hinges.values()) {
    const n = g.doors.length;
    const band = g.band ? `, the ladder's band to ${formatMm(g.band.maxWeightKg)} kg and ${formatMm(g.band.maxHeightMm)} mm` : '';
    push('hinges', 'Hinges', g.per * n, 'pcs',
      {
        per_door: g.per,
        doors: n,
        cup_diameter_mm: P?.hinges?.cups?.diameter ?? null,
        by_weight: true,
        door_kg: g.doors.map((d) => d.weightKg),
        band: g.band || null,
        on_divider: g.onDivider,
        angle: null,
        family: 'standard',
        article: null,
        articles: [],
        finish: null,
        system: null,
        assigned: false,
      },
      `${g.per} per door x ${n} door${n === 1 ? '' : 's'}, by the door's weight with its mirror${band}`
        + (g.onDivider ? ', hung on a divider: the hinge is the owner\'s to name' : ''));
  }

  // ── the shelf pins, the house's, four a glass shelf ──
  const SH = P?.shelfHoles || {};
  const shelves = (result.panels || []).filter((p) => p.meta?.glassShelf).length;
  push('shelf_pins', 'Shelf pins', shelves * (Number(SH.pinsPerShelf) || 0), 'pcs',
    { diameter_mm: SH.diameter, per_shelf: SH.pinsPerShelf, article: art('shelfPin') || null },
    said('shelfPin', `⌀${SH.diameter}`));

  // ── the hanging brackets, the vanity's ──
  const hang = m.hangers || {};
  const hangArticle = art('hanger') || String(hang.article || '');
  push('vanity_hangers', String(hang.name || 'Cabinet hanger'), Number(hang.count) || 0, 'pcs',
    { article: hangArticle || null, on: 'the sides\' hanger cut-outs' },
    hangArticle ? `${hangArticle} · in the sides' hanger cut-outs` : 'in the sides\' hanger cut-outs');

  return lines;
}

/**
 * The mirror cabinet's NOTE rows: the fused spur, by the electrician, where the
 * cabinet carries anything lit (a note in the cut list's grammar, `manual`,
 * counted in nothing, merged with nothing). [] for every other unit.
 */
export function mirrorCabinetNotes(result, profile = null) {
  const m = result?.derived?.mirror;
  if (!m || !(Number(m.led?.driver) > 0)) return [];
  const P = profile || getCabinetProfile();
  const article = String(P?.mirror?.articles?.fusedSpur || '');
  const volts = Number(m.led?.driverVolts) || 24;
  return [{
    unit_num: result.unitNum,
    id: `${result.unitNum} fused spur`,
    part: 'MIRROR-SPUR',
    role: 'mirror_note',
    material_role: 'note',
    material_label: `NOTE: Fused spur by electrician${article ? ` (${article})` : ''}: it feeds the LED driver ${volts} V`
      + `${m.bottomBox?.on ? ' in the bottom box' : ''}`,
    w: 0,
    h: 0,
    qty: 1,
    thickness: 0,
    edge: '',
    edge_m: 0,
    area_m2: 0,
    readiness: 'manual',
  }];
}

/**
 * What ONE piece is finished in, as a name a workshop can order against
 * (turn 9, CLAUDE.md F4.5 / F6.3).
 *
 * ─── TURN 16 (CLAUDE.md F1.5): ONE SOURCE ───────────────────────────────────
 *
 * This function used to be a resolution of its own — the piece's override, then
 * `material_role === 'front' ? finishes.front : finishes.carcass`. That was the
 * second lookup table CLAUDE.md F1.5 removes: it could not tell Front 1 from
 * Front 2, and it knew nothing about the run pieces' own board, so a plinth cut
 * from a different sheet printed as a door.
 *
 * It is `engine/materials.js resolvePanelMaterial` now — the same call the 3D
 * view, the CNC sheet and the check-out make — and this is the thin wrapper
 * that keeps the BOM's own contract: the LABEL, and null when the caller gave
 * no design to resolve against (`buildBom` is used by tests and by callers that
 * only want quantities, and a made-up label would be worse than none).
 */
function partMaterialLabel(panel, resolved) {
  if (resolved?.assignmentProblem) return resolved.label;
  const own = panel.meta?.material_label;
  if (own) return String(own);
  return resolved?.label || null;
}

/**
 * @param {Array<{unit:object, result:object}>} entries
 * @param {object} [context]  { design, profile, materials } — supply the design
 *                            and every row carries the material it is cut from,
 *                            resolved per PIECE (turn 16) so a cabinet on Front
 *                            2 and a plinth on its own board are each labelled
 *                            with what they are actually cut from. `materials`
 *                            is the workshop's stock list, so an assigned board
 *                            with no finish of its own is named by its stock
 *                            name rather than by its slot.
 * @returns aggregated BOM
 */
export function buildBom(entries, {
  design = null, profile = null, materials = [], excludeDrawerBoxes = false, room = null,
} = {}) {
  const units = [];
  const roleTotals = {};
  const cutRows = new Map();       // identical pieces merge across the project
  const hardwareRows = new Map();  // …and so do identical hardware lines

  let pieces = 0;
  let boardArea = 0;
  let frontArea = 0;
  let boardEdging = 0;
  let frontEdging = 0;
  // T75 F5 · the worktop's own area (its slabs and upstands), kept apart.
  let worktopArea = 0;

  for (const { unit, result } of entries) {
    // Per PIECE, not per project and not per unit: a cabinet on its own door
    // style is finished in that style's material, a run piece on its own board
    // is cut from that board, and the cut list has to say so for each of them.
    // ─── Turn 32 (CLAUDE.md F7): a BOUGHT box is not a cut part ────────────
    // Its purchase line is bomInvoice's business; here it simply leaves the
    // rows, the areas, the edging and the counts.
    const counted = (excludeDrawerBoxes
      ? result.panels.filter((p) => p.role !== 'drawer_box')
      : result.panels)
      // T83 F4 · a mirror cabinet's LED stile and glass shelf are BOUGHT: order lines below, never a cut row.
      .filter((p) => !mirrorBought(result, p));
    const rows = counted.map((p) => {
      const resolved = design ? resolvePanelMaterial(p, unit, design, profile, materials) : null;
      const manufacturing = frontManufacturing(p);
      return {
        unit_num: result.unitNum,
        id: p.id,
        part: p.part,
        role: p.role,
        material_role: p.material_role,
        material_label: partMaterialLabel(p, resolved),
        // The GROUPING identity (CLAUDE.md F1.5): same board, same key. Two
        // front types on one board merge; two on different boards do not, and
        // an override moves a piece between groups.
        material_key: resolved?.key || null,
        material_id: resolved ? resolved.material_id : (p.meta?.material_id ?? null),
        // T-CC2a F3 (law 2): the catalogue entry this piece is cut from, the
        // SAME answer the purchase list reads (`purchaseBom` below), or null
        // with the words of law 7 where the catalogue does not hold the board.
        ...(resolved ? {
          catalogue_id: resolved.catalogue_id ?? null,
          catalogue_reason: resolved.catalogue_reason ?? null,
          board_source: resolved.board?.source ?? null,
        } : {}),
        w: p.w,
        h: p.h,
        qty: p.qty,
        thickness: p.thickness,
        edge: p.edging.code,
        edge_m: p.edging.len_m,
        area_m2: p.area_m2,
        // T75 F22 · *"The cut list, the BOM and the CNC export show the state
        // on every line"*: read off the part, never written into it.
        readiness: readinessOf(p, { drills: result.drills }),
        ...(manufacturing ? { manufacturing } : {}),
      };
    });
    // T75 F23 · a dowel unit's cut list says so in a NOTE row (the gate while
    // it is shut); counted in nothing, merged with nothing.
    const dowelNote = dowelNoteRow(result);
    // T80 F8 · the joiner's filler over a framed base run (the owner, 21.10.2026:
    // *"6 informacja"*): a NOTE row under the run's owner, counted in nothing,
    // merged with nothing, never a board and never a DXF.
    const fillerNotes = (result.panels || [])
      .filter((p) => p.role === 'frame' && p.meta?.inframe?.fillerNote)
      .map((p) => ({
        unit_num: result.unitNum,
        id: `${p.id}-FILLER`,
        part: 'FILLER',
        role: 'inframe_note',
        material_role: 'note',
        material_label: `NOTE: ${p.meta.inframe.fillerNote}`,
        w: 0,
        h: 0,
        qty: 1,
        thickness: 0,
        edge: '',
        edge_m: 0,
        area_m2: 0,
        readiness: 'manual',
      }));
    const cabineoNote = cabineoNoteRow(result);
    // T76 F5 · a front with applied strips carries a NOTE for their gluing,
    // `manual`, in the same grammar: counted in nothing, merged with nothing.
    const stripNotes = appliedStripNotes(counted).map((n) => ({
      unit_num: result.unitNum,
      id: n.id,
      part: n.part,
      role: 'front_note',
      material_role: 'note',
      material_label: `NOTE: glue the ${n.strips} applied strips to ${n.host}`
        + `${n.mitre != null ? `, ${n.mitre} degree mitres` : ''}, after machining`,
      w: 0,
      h: 0,
      qty: 1,
      thickness: 0,
      edge: '',
      edge_m: 0,
      area_m2: 0,
      readiness: n.state,
    }));
    // T82 F9, after the review · a vanity's carcass TOP under a basin (KIT_VANITY.lsp
    // D18): the oval is cut on site to the basin's template, a NOTE row, `manual`,
    // counted in nothing, merged with nothing, never a board and never a DXF.
    const basinNotes = vanityTopNotes(counted).map((n) => ({
      unit_num: result.unitNum,
      id: n.id,
      part: n.part,
      role: 'vanity_note',
      material_role: 'note',
      material_label: `NOTE: ${n.note}`,
      w: 0,
      h: 0,
      qty: 1,
      thickness: 0,
      edge: '',
      edge_m: 0,
      area_m2: 0,
      readiness: n.state,
    }));
    // T83 F4 · the mirror cabinet's fused spur, by the electrician: a NOTE row, `manual`.
    const mirrorNotes = mirrorCabinetNotes(result, profile);
    units.push({
      unitId: unit.id, unitNum: result.unitNum, type: result.type, rows: [...rows, ...stripNotes, ...(dowelNote ? [dowelNote] : []), ...(cabineoNote ? [cabineoNote] : []), ...fillerNotes, ...basinNotes, ...mirrorNotes], totals: result.totals, warnings: result.warnings,
    });

    for (const r of rows) {
      pieces += r.qty;
      if (r.material_role === 'front') { frontArea += r.area_m2 * r.qty; frontEdging += r.edge_m * r.qty; }
      // T75 F5 · an upstand is worktop material: neither board nor front.
      else if (r.material_role === 'worktop') { worktopArea += r.area_m2 * r.qty; }
      else { boardArea += r.area_m2 * r.qty; boardEdging += r.edge_m * r.qty; }

      const rt = roleTotals[r.role] || (roleTotals[r.role] = { role: r.role, pieces: 0, area_m2: 0, edging_m: 0, thicknesses: new Set() });
      rt.pieces += r.qty;
      rt.area_m2 += r.area_m2 * r.qty;
      rt.edging_m += r.edge_m * r.qty;
      rt.thicknesses.add(r.thickness);

      // The MATERIAL is part of the identity of a cut piece: two 560 × 500
      // shelves the same thickness are one line only if they come off the same
      // sheet. Without it, the 25 mm oak shelf somebody overrode (CLAUDE.md F4)
      // would merge into the white ones and be cut in white.
      //
      // Turn 16 (F1.5): the identity is the resolved material's KEY where there
      // is one — the owner's rule, in the place the rule is applied. Two front
      // types on ONE board merge; two on different boards do not, even when the
      // label reads the same because neither has been given a finish.
      // T75 F22 · …and its state: an outline is not merged into a cut part.
      // T76 F1 · …and its decoration: two fronts with different recipes are
      // never one line (GPT's `manufacturing.identity`, one key with both).
      const key = `${r.part}|${r.w}|${r.h}|${r.thickness}|${r.edge}|${r.material_key || r.material_label || ''}|${r.readiness}`
        + (r.manufacturing ? `|${r.manufacturing.identity}` : '');
      const merged = cutRows.get(key);
      if (merged) merged.qty += r.qty;
      else cutRows.set(key, { ...r, qty: r.qty, units: new Set([r.unit_num]) });
      if (merged) merged.units.add(r.unit_num);
    }

    // Hardware merges on role AND spec: 440 mm runners and 490 mm runners are
    // two different things to buy, even though they are one BOM role.
    // T83 F4 · …and a mirror cabinet's order lines (its LED panels, mirror,
    // glass, strips, driver, hinges, pins and hangers) are hardware lines too.
    for (const h of [...(result.hardware || []), ...mirrorCabinetOrderLines(result, profile)]) {
      const key = `${h.role}|${h.spec_label}`;
      const merged = hardwareRows.get(key);
      if (merged) { merged.qty += h.qty; merged.units.add(result.unitNum); } else {
        hardwareRows.set(key, {
          ...h, qty: h.qty, units: new Set([result.unitNum]), readiness: 'bought',
        });
      }
    }
  }

  // ─── T75 F5 · THE WORKTOP REACHES THE BOM ──────────────────────────────
  //
  // *"one JOINT RECORD at the corner ... three worktop connector bolts as a
  // hardware BOM line; the bolt pockets are a NOTE ... A [cut-out] record is
  // drawn on the worktop sheet ... and listed as a BOM note."*  The slab is a
  // design-layer piece `computeCabinet` never reads (T30's law, held), so it
  // is resolved HERE from the design's records and the units it lies on, and
  // listed as its own block: one line per slab (bought, its size), the bolts
  // as an order line, and every cut-out and joint as a NOTE line. Only when a
  // room is handed in, because a slab that turns a corner is resolved in two
  // walls' frames; every caller written before tonight passes none and gets
  // exactly the BOM it got.
  if (design && room) {
    const slabs = worktopsFor({
      records: migrateDesign(design).worktops,
      units: entries.map((e) => e.unit).filter(Boolean),
      profile,
      walls: roomWalls(room),
      // T80 F8 · the slab on the frame, as the store resolves it.
      inframe: migrateDesign(design).inframe === true,
    });
    if (slabs.length) {
      const rows = [];
      const joints = new Map();
      for (const slab of slabs) {
        const g = slab.geometry;
        const area = Array.isArray(g.outline) ? polygonAreaM2(g.outline) : roundTo((g.w * g.d) / 1e6, 4);
        // ─── T86B F8 (law 7) · A SPRAYED SLAB IS A SPRAYED PANEL ──────────
        // *"mozliwosc dodania worktopu z naszego sprayowanego panelu nie tylko
        // szary worktop"* (the owner, 30.10.2026, 22:52): not a bought decor
        // slab but the house's panel, cut and sprayed: listed on the panel's
        // own road (the free panel's spray rule, 2 faces and 4 edges, its
        // spray area beside it), never counted in the worktop's bought area.
        if (slab.finish === 'spray' && slab.colour?.hex) {
          const spray = sprayAreaFor({ w: g.w, h: g.d, thickness: g.thickness }, { id: 'free_panel', kind: null }, profile);
          rows.push({
            unit_num: 'WT',
            id: slab.slabId || slab.id,
            part: 'WORKTOP-PANEL',
            role: 'free_panel',
            material_role: 'front',
            material_label: `Sprayed panel ${g.thickness} mm, ${sprayFinishLabel(slab.colour)}`,
            material_key: null,
            material_id: null,
            w: roundTo(g.w, 1),
            h: roundTo(g.d, 1),
            qty: 1,
            thickness: g.thickness,
            edge: '',
            edge_m: 0,
            area_m2: area,
            spray_m2: spray.m2Each,
            spray_code: spray.code,
            finish: 'spray',
            colour: slab.colour,
            sheen: slab.sheen ?? null,
            readiness: 'cut',
          });
        } else {
          worktopArea += area;
          rows.push({
            unit_num: 'WT',
            id: slab.slabId || slab.id,
            part: 'WORKTOP',
            role: 'worktop',
            material_role: 'worktop',
            material_label: g.decor || `Worktop ${g.thickness} mm${g.shape === 'L' ? ', L-shaped' : ''}`,
            material_key: null,
            material_id: null,
            w: roundTo(g.w, 1),
            h: roundTo(g.d, 1),
            qty: 1,
            thickness: g.thickness,
            edge: '',
            edge_m: 0,
            area_m2: area,
            readiness: 'bought',
          });
        }
        for (const c of slab.cutouts || []) {
          rows.push({
            unit_num: 'WT',
            id: `${slab.slabId || slab.id} ${c.kind} cut-out`,
            part: 'WORKTOP-CUTOUT',
            role: 'worktop_note',
            material_role: 'note',
            material_label: `NOTE: ${c.note}`,
            w: c.w,
            h: c.d,
            qty: 1,
            thickness: g.thickness,
            edge: '',
            edge_m: 0,
            area_m2: 0,
            readiness: c.readiness,
          });
        }
        // T78 F2 · one note per JOINT, not per record: an L with a run along
        // each arm carries TWO (arm A, arm B) under one record, and T75's
        // corner pair carries ONE shared by its two slabs (the same `at`), so
        // the key is where the joint is. The probe (verify/t78/f02-probe.md,
        // THE FIX) found the second arm's joint overwrote the first: one note
        // and three bolts for two joints.
        if (slab.joint) {
          const at = slab.joint.at || {};
          joints.set(`${slab.id}@${at.wall ?? ''}:${at.x ?? ''}`, { recordId: slab.id, joint: slab.joint });
        }
      }
      for (const { recordId, joint } of joints.values()) {
        rows.push({
          unit_num: 'WT',
          id: `${recordId} joint${joint.arm ? ` arm ${joint.arm}` : ''}`,
          part: 'WORKTOP-JOINT',
          role: 'worktop_note',
          material_role: 'note',
          material_label: `NOTE: ${joint.note}`,
          w: 0,
          h: 0,
          qty: 1,
          thickness: 0,
          edge: '',
          edge_m: 0,
          area_m2: 0,
          readiness: joint.readiness,
        });
        const key = 'worktop_bolts|connector bolt';
        const merged = hardwareRows.get(key);
        if (merged) { merged.qty += joint.boltCount; merged.units.add('WT'); } else {
          hardwareRows.set(key, {
            role: 'worktop_bolts',
            label: 'Worktop connector bolts',
            qty: joint.boltCount,
            unit: 'pcs',
            spec: { per_joint: joint.boltCount },
            spec_label: 'connector bolt',
            units: new Set(['WT']),
            readiness: 'bought',
          });
        }
      }
      units.push({
        unitId: 'worktops',
        unitNum: 'WT',
        type: 'WORKTOP',
        rows,
        totals: { pieces_total: rows.filter((r) => r.role === 'worktop' || r.part === 'WORKTOP-PANEL').length },
        warnings: [],
      });
    }
  }

  const roles = Object.values(roleTotals).map((rt) => ({
    ...rt,
    thicknesses: [...rt.thicknesses].sort((a, b) => a - b),
    area_m2: roundTo(rt.area_m2, 4),
    edging_m: roundTo(rt.edging_m, 3),
  }));

  return {
    units,
    roles,
    cutRows: [...cutRows.values()].map((r) => ({ ...r, units: [...r.units] })),
    hardware: [...hardwareRows.values()].map((r) => ({ ...r, units: [...r.units] })),
    totals: {
      pieces,
      board_area_m2: roundTo(boardArea, 4),
      front_area_m2: roundTo(frontArea, 4),
      area_m2: roundTo(boardArea + frontArea, 4),
      edging_m: roundTo(boardEdging, 3),
      edging_front_m: roundTo(frontEdging, 3),
      edging_total_m: roundTo(boardEdging + frontEdging, 3),
      // T75 F5 · present only when a slab is listed, so every BOM before
      // tonight reads the same totals.
      ...(worktopArea > 0 ? { worktop_area_m2: roundTo(worktopArea, 4) } : {}),
    },
  };
}

/** T75 F5 · the area of a plan outline in m2 (the shoelace). */
function polygonAreaM2(points) {
  let a = 0;
  for (let i = 0; i < points.length; i += 1) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    a += x1 * y2 - x2 * y1;
  }
  return roundTo(Math.abs(a) / 2 / 1e6, 4);
}

/**
 * Material demand per role, with the yield coefficient applied.
 * yield = 1.0 means no waste allowance; 1.15 means order 15 % more.
 */
export function materialDemand(bom, assignments, materials) {
  const byId = new Map((materials || []).map((m) => [m.id, m]));
  return bom.roles.map((role) => {
    const a = assignments?.[role.role];
    const material = a?.material_id ? byId.get(a.material_id) : null;
    const yieldCoeff = Number(a?.yield ?? 1) || 1;
    const required = role.area_m2 * yieldCoeff;
    return {
      role: role.role,
      pieces: role.pieces,
      area_m2: role.area_m2,
      thicknesses: role.thicknesses,
      material,
      yield: yieldCoeff,
      required_m2: roundTo(required, 3),
      cost: material?.price != null ? roundTo(required * material.price, 2) : null,
    };
  });
}

/**
 * Hardware demand: the same ASSIGN pattern as the boards, but counted in
 * pieces and pairs rather than m², and with no yield coefficient — you do not
 * buy 15 % extra hinges to allow for offcuts.
 *
 * One assignment per ROLE; a role that needs two specs (440 mm and 490 mm
 * runners in the same project) shows both lines under that one assignment, so
 * the quantities are always right even before the products are split out
 * (BLOCKERS.md #9).
 */
export function hardwareDemand(bom, assignments, materials) {
  const byId = new Map((materials || []).map((m) => [m.id, m]));
  return (bom.hardware || []).map((row) => {
    // T-CC1b F10 (LICENSED, the key only): *"10 rodzajow zawiasow, wszystkie
    // przypisane"*, the owner, 01.11.2026. The line's own key FIRST (schema 3,
    // engine/partRegistry.js), the legacy role second; a key that is present
    // wins even when it was cleared on purpose.
    const key = `${row.role}|${row.spec_label}`;
    const own = assignments?.hardware?.[key];
    const a = own || assignments?.[row.role];
    const material = (a?.material_id ? byId.get(a.material_id) : null) || null;
    return {
      ...row,
      key,
      material,
      assigned: Boolean(material),
      cost: material?.price != null ? roundTo(row.qty * material.price, 2) : null,
    };
  });
}

/** Total cost of the assigned materials, or null when nothing is priced. */
export function demandCost(demand) {
  const priced = demand.filter((d) => d.cost != null);
  if (!priced.length) return null;
  return roundTo(priced.reduce((s, d) => s + d.cost, 0), 2);
}

// ═══════════════════════════════════════════════════════════════════════════
// TURN 39 (CLAUDE.md F5): THE BOM ENGINE
// ═══════════════════════════════════════════════════════════════════════════
//
// Everything above this line is turn 3's BOM and stays exactly as it is: a
// CUT LIST, grouped by the engine's own roles, which is what a saw needs.
//
// What a joiner BUYS is a different document, and this is it. The shape and
// the naming are Production Core's `bom.js` — `buildWindowPartQtys` /
// `mergeWindowMaterials` / `bump()` — with cabinet nouns.
//
// ─── THE SECOND COLLAPSE ────────────────────────────────────────────────────
//
// The owner: *"jeśli ten sam wszędzie to połączyć w jedno"*. F1 collapsed many
// engine elements into one assignable PART. This collapses many parts into one
// PURCHASE LINE, and it needs no special case at all: the accumulator is keyed
// on `mat:{material_id}`, so if the sides, the top, the bottom, the partitions
// and the shelves all point at the same Egger board, they land on the same key
// and the BOM shows ONE line with the summed area. That is the whole feature,
// and it falls out of the key.
//
// PURE. Arguments in, list out. No React, no store read, no engine call — the
// COMPUTED result is handed in, which is what makes this turn byte-identical
// (iron rule 2): the BOM is a READ-ONLY consumer of the engine's answer.

/** m² per one sheet of a given board. */
function sheetAreaM2(sheet) {
  const w = Number(sheet?.width) || 0;
  const h = Number(sheet?.height) || 0;
  return w > 0 && h > 0 ? (w * h) / 1e6 : 0;
}

/**
 * How many sheets an area needs — and it ALWAYS ROUNDS UP, because half a
 * sheet is a sheet you had to buy.
 *
 * CLAUDE.md F5 is explicit that this is an ESTIMATE and says why: real nesting
 * is parked, and a number that pretends otherwise is worse than no number. Two
 * shelves that would nest side by side off one offcut are counted here as
 * their area, not as their outline.
 */
export function sheetsFor(m2, sheet) {
  const one = sheetAreaM2(sheet);
  const area = Number(m2) || 0;
  if (!(one > 0) || !(area > 0)) return null;
  return Math.ceil(area / one);
}

/**
 * Which of the workshop's TWO boards a part is bought off (T35-F15).
 *
 * ONE DECIDER, and it is not this file's. `cnc/groups.js groupOfPanel` decides
 * which group a cut part is in — on its ROLE, never on its id string — and
 * `checks.js sheetFamilyOfPanel` turns that into 'fronts' or 'carcasses'. The
 * sheet a part is CHECKED against and the sheet it is ESTIMATED against must be
 * the same board or the two documents contradict each other, so this set is the
 * exact image of `groups.js:125`:
 *
 *     role 'front' | 'end_panel' | 'mask' | 'blind_blank' (T75 F3) | 'false_front' (T75 F14)
 *       | 'pelmet' (T75 F15)  → fronts
 *     everything else                      → carcasses
 *
 * Note what that puts on the CARCASS board: the plinth and the infills. They
 * are sprayed with the doors and this app files them under FRONT material, but
 * the engine has measured them against the carcass sheet since T35 and a
 * workshop cuts them off it. `test/t39-bom-engine.test.js` walks every cabinet
 * and asserts the two answers agree panel by panel.
 */
// T76 F1 · the union: T75's `pelmet` and GPT's `front_moulding` both.
// T82 F4 · the HAWA pocket's panels are cut off the front board (the owner,
// 25.10.2026: *"panele po bokach to jest nie carcas tylko front zawsze"*), as
// groups.js files role `pocket_panel` with the fronts; its door is a `door`.
const FRONT_SHEET_PARTS = new Set(['door', 'drawer_front', 'front_moulding', 'false_front', 'end_panel', 'mask', 'pelmet', 'pocket_panel']);

export function sheetFamilyOfPart(partId) {
  return FRONT_SHEET_PARTS.has(partId) ? 'fronts' : 'carcasses';
}

/** A quantity as a workshop reads it: whole pieces, two decimals otherwise. */
export function formatQty(value, unit) {
  const n = Number(value) || 0;
  const whole = unit === 'pcs' || unit === 'pairs';
  return `${whole ? Math.round(n) : n.toFixed(2)} ${unit}`;
}

/**
 * What ONE CABINET needs, keyed by assignable part id.
 *
 * @param {object} computed   a `computeCabinet()` result — READ, never called
 * @param {object} unit       the unit record it came from
 * @param {object} [settings] { profile }
 * @returns {{[partId]: { m2?:number, m?:number, pcs?:number, unit:string }}}
 *
 * Three sources and no fourth:
 *   PANELS    → area, and the edging metres the engine already decided
 *   HARDWARE  → `result.hardware`, the engine's own hinge / runner / pin lists
 *   DRILLING  → the consumables, counted off holes that are already drilled
 *               (turn 32's invoice has read them this way for four turns)
 */
export function buildCabinetPartQtys(computed, unit, settings = {}) {
  const out = {};
  if (!computed) return out;
  const typeId = computed.type || unit?.type || null;

  const add = (partId, field, amount) => {
    if (!partId || !PART_REGISTRY[partId] || !(amount > 0)) return;
    const unitLabel = PART_REGISTRY[partId].unit;
    if (!out[partId]) out[partId] = { unit: unitLabel };
    out[partId][field] = (out[partId][field] || 0) + amount;
  };
  // The registry's own unit decides which field a quantity lands in, so a part
  // can never be counted in two currencies at once.
  const addQty = (partId, amount) => {
    const u = PART_REGISTRY[partId]?.unit;
    if (u === 'm²') add(partId, 'm2', amount);
    else if (u === 'm') add(partId, 'm', amount);
    else add(partId, 'pcs', amount);
  };

  // ── PANELS: area, and the banding the engine already measured ────────────
  for (const p of computed.panels || []) {
    // T83 F4 · a mirror cabinet's bought part is an order line (below), never board area.
    if (mirrorBought(computed, p)) continue;
    const partId = partIdForElement(p.part, { typeId });
    if (!partId) continue;                       // F1's test makes this unreachable
    const qty = Number(p.qty) || 1;
    add(partId, 'm2', (Number(p.area_m2) || 0) * qty);
    // *"edging length from the perimeter of edged sides (read the existing
    // edging decision, do not invent one)"* — `panel.edging.len_m` IS that
    // decision, already summed over the edges `panel.edging.code` names.
    const edgePart = edgePartFor(partId);
    if (edgePart) add(edgePart, 'm', (Number(p.edging?.len_m) || 0) * qty);
  }

  // ── HARDWARE: the engine's own counts, never recomputed ──────────────────
  let hingeQty = 0;
  // T83 F4 · the mirror cabinet's order lines, read where the registry knows them (hinges, pins, strip, hanger).
  for (const h of [...(computed.hardware || []), ...mirrorCabinetOrderLines(computed, settings.profile || null)]) {
    const partId = HARDWARE_TO_PART_ID[h.role];
    if (!partId) continue;
    const qty = Number(h.qty) || 0;
    if (h.role === 'hinges') hingeQty += qty;
    if (h.role === 'rail') {
      // The engine counts rails in PIECES and knows each one's length; a
      // workshop buys tube by the METRE. `bomInvoice.js` has made exactly this
      // conversion since turn 32 — same read, same answer, one law.
      add(partId, 'm', ((Number(h.spec?.length_mm) || 0) * qty) / 1000);
      continue;
    }
    addQty(partId, qty);
  }
  // A hinge has a PLATE, and the plate is a separate product with a separate
  // price. One per hinge, off the engine's own count — turn 32's invoice line,
  // now assignable rather than only named.
  if (hingeQty > 0) addQty('hinge_plate', hingeQty);

  // ── DRILLING: the supports and the fixings, counted off real holes ───────
  const drills = computed.drills || [];
  const brackets = drills.filter((d) => d.kind === 'rail_bracket').length;
  if (brackets > 0) addQty('rail_support', brackets);
  // `/screw/` is `bomInvoice.js`'s own test and it is copied deliberately: two
  // documents that count the same holes must count them the same way.
  const screws = drills.filter((d) => /screw/.test(d.kind)).length;
  if (screws > 0) addQty('screw_confirmat', screws);
  const puzzles = drills.filter((d) => d.kind === 'puzzle').length;
  if (puzzles > 0) addQty('puzzle_screw', puzzles);
  // T75 F23 · *"dowels count in the BOM by the hardware law"*: one dowel per
  // pair, counted ONCE, off its FACE hole (the edge bore is its other half).
  const dowels = drills.filter((d) => d.kind === 'dowel' && d.face !== 'edge').length;
  if (dowels > 0) addQty('dowel', dowels);
  // Handles are placements, not a hardware role — the engine publishes them on
  // `drillSummary.handles`, and the key is ABSENT when there are none.
  const handles = computed.drillSummary?.handles?.length || 0;
  if (handles > 0) addQty('handle', handles);

  // Registry rows with NO engine producer, and it is on purpose:
  //   false_front        a FIX front comes off the engine as a `FRONT` today
  //   top_box_connector  no LISP line fixes a top box to its host, so there is
  //                      no count to read (rule: no invented numbers)
  //   glue               the joiner's own quantity, F8's custom rows
  //   (dowel has a producer since T75 F23: the dowel unit's pairs, above)
  //   led_profile        derived at PROJECT level, from the strip metres
  // Each can still be ASSIGNED a product; none of them fabricates a quantity.

  return out;
}

/** The lighting the whole PROJECT carries, keyed by part id. */
function lightingPartQtys(entries, { design = null, profile = null } = {}) {
  const out = {};
  if (!design || !profile) return out;
  let strip = 0;
  for (const row of lightingBomLines({ entries, design, profile })) {
    const partId = LIGHTING_TO_PART_ID[row.role];
    if (!partId) continue;
    const qty = Number(row.qty) || 0;
    if (!(qty > 0)) continue;
    const u = PART_REGISTRY[partId].unit;
    const field = u === 'm' ? 'm' : 'pcs';
    if (!out[partId]) out[partId] = { unit: u };
    out[partId][field] = (out[partId][field] || 0) + qty;
    if (partId === 'led_strip') strip += qty;
  }
  // The aluminium CHANNEL. CLAUDE.md F1 names the row and the engine has no
  // line for it, so it is derived the only honest way there is: a metre of
  // channel per metre of strip. It is the strip's own length, not a guess.
  if (strip > 0) out.led_profile = { m: strip, unit: 'm' };
  return out;
}

/** The one measure a part entry carries, with the yield already applied. */
export function resolvePartTotal(entry, yieldCoeff = 1.0) {
  if (!entry) return { total: 0, unit: 'pcs' };
  const y = Number(yieldCoeff) > 0 ? Number(yieldCoeff) : 1.0;
  const raw = entry.m2 ?? entry.m ?? entry.pcs ?? 0;
  // Yield applies to EVERY unit, not only to area. Production Core made the
  // same call on Piotr's own instruction: a coefficient a joiner typed on a row
  // has to do something on that row, whatever the row is counted in.
  return { total: (Number(raw) || 0) * y, unit: entry.unit };
}

// Purchasing and assignment warnings validate the same individual strip stock.
function resolveMouldingMaterial(panel, unit, assignment, { design, profile, materials }) {
  const resolved = resolvePanelMaterial(panel, unit, design, profile, materials);
  if (resolved.overridden || !assignment?.material_id) return resolved;
  return resolvePanelMaterial({
    ...panel,
    meta: { ...panel.meta, material_key: null, material_label: null, material_id: assignment.material_id },
  }, unit, design, profile, materials);
}

// ═══════════════════════════════════════════════════════════════════════════
// T-CC2a PART B · ONE PRODUCT, ONE LINE (CLAUDE.md T-CC2a F5 to F7)
// ═══════════════════════════════════════════════════════════════════════════
//
// The owner, 01.11.2026, 12:14: *"jesli CC wybierze MDF 25 a nie mamy
// przypisanego materialu z JC to bedzie napisane MDF 25 materials not
// assigned, proste, chodzi o robienie listy materialow na dany projekt oraz
// listy kosztow"*; 12:34: *"jedne produkt osobna linia, proste"*.
//
// The purchase list is keyed by the CATALOGUE (engine/catalogue.js), never by
// the per-part assignment blob of T39 / T-CC1b (that window stays readable,
// F14, and is no longer read here: the board road's `assignmentFor` and the
// m2 row's `qty x costPerUnit` are DELETED, the Deletion licence). One
// catalogue entry a project uses is one row with its own price:
//
//   boards   the cut list's own catalogue id for every piece (buildBom, the
//            SAME resolver, engine/materials.js), m2 summed per entry, then
//            sheets = ceil(m2 x yield / sheet area) by the company's link
//   edging   the tape follows the decor: metres per Egger decor (a sprayed
//            or raw MDF edge is painted or left, never taped)
//   hardware the BOM's own hardware lines (buildBom().hardware, the engine's
//            quantities) and the counts the drilling already holds (plates,
//            screws, dowels, puzzle connectors, rail supports, handles, plinth
//            clips) and the project's light, resolved line by line by
//            catalogueIdOfLine and merged on the catalogue id
//   paint    one line a colour through the ONE paint.bespoke link, the primer,
//            the solvent (engine/spray.js paintLinesFor)
//   bespoke  project.bespoke rows: this project's only, never the catalogue
//
// Each row resolves its LINK (the company's, lib/jcLinks.js) to its STOCK row
// (Joinery Core stock_items through lib/jcStock.js toMaterial): name, item
// number, image, unit, the weighted average cost JC keeps; a quoted price of
// T75 F21 (`pricedAt`) still wins. A row with no link, a link to a stock row
// the company no longer has, an entry the catalogue does not hold, a sheet
// without its size, a stock unit the list does not know, a price of 0 (UX
// turn B5, 'No price'; a bespoke row "Supplied by client" is 0 by right): no
// price, said in words, counted in `incomplete` (law 7).

/** The words of law 7, one place (CONTRACT B). */
export const LINK_WORDS = Object.freeze({
  notLinked: 'Not linked',
  removed: 'Not linked (removed from your Joinery Core stock)',
  notInCatalogue: NOT_IN_CATALOGUE,
  sheetSizeMissing: 'Sheet size missing, add it in Link materials',
  unitUnknown: 'Check the unit of this item in Joinery Core',
  // UX turn B5 (Ewa P9, Kamil P3): a price of 0 is no price, never a free line.
  noPrice: 'No price',
});

/**
 * "Incomplete total, <n> lines not linked" (one line: "1 line"). UX turn B5:
 * a line with no price is not "not linked", so when `noPrice` lines are among
 * the n the words say both: "... not linked or without a price". With none,
 * the words are T-CC2a's, unchanged.
 */
export function incompleteWords(n, noPrice = 0) {
  const k = Number(n) || 0;
  const tail = Number(noPrice) > 0 ? 'not linked or without a price' : 'not linked';
  return `Incomplete total, ${k} ${k === 1 ? 'line' : 'lines'} ${tail}`;
}

/** The statuses a row may carry; every one but `linked` and `bespoke` is counted incomplete. */
export const INCOMPLETE_STATUSES = Object.freeze(['not-linked', 'removed', 'not-in-catalogue', 'no-sheet-size', 'unit-unknown', 'no-price']);

// F6.2 (the word lists the owner confirms after the merge, case and plural folded): what a stock row's unit says it is sold by.
const SHEET_UNITS = new Set(['sheet', 'board', 'pc', 'pcs', 'each', 'ea']);
const AREA_UNITS = new Set(['m2', 'm²', 'sqm', 'sq m']);

/** 'sheet' | 'area' | null: how a sheet's stock row is priced (F6.2). */
export function sheetUnitKind(unit) {
  const raw = String(unit ?? '').trim().toLowerCase().replace(/\s+/g, ' ').replace(/\.$/, '');
  if (!raw) return null;
  // Case and plural folded: "Sheets", "boards", "PCS", "sq m".
  const forms = [raw, raw.replace(/s$/, ''), raw.replace(/es$/, '')];
  if (forms.some((f) => SHEET_UNITS.has(f))) return 'sheet';
  if (forms.some((f) => AREA_UNITS.has(f))) return 'area';
  return null;
}

/**
 * How many sheets an area needs (law 6): ceil(m2 x yield / (w x l / 1e6)).
 * Null when the link holds no size: the count is never guessed.
 */
export function sheetCount(m2, { yield: y = null, widthMm = null, lengthMm = null } = {}) {
  const w = Number(widthMm);
  const l = Number(lengthMm);
  const area = Number(m2) || 0;
  if (!(w > 0) || !(l > 0) || !(area > 0)) return null;
  const k = Number(y) > 0 ? Number(y) : 1;
  // A hair under a whole sheet from floating point is still that sheet, never one more.
  return Math.ceil(roundTo((area * k) / ((w * l) / 1e6), 9));
}

/**
 * The yield a sheet row is counted at: the link's own, else the company's
 * (`profile.materials.sheetYield`). Exported (UX turn B6) so the Order tab
 * (engine/bomInvoice.js materialsSummary) counts with the SAME number.
 */
export function sheetYieldOf(link, profile) {
  const own = Number(link?.yield);
  if (own > 0) return own;
  const p = Number(profile?.materials?.sheetYield);
  return p > 0 ? p : 1;
}

/** A link lookup over a Map, an object keyed by catalogue id, or an array of link rows. */
function linkLookup(links) {
  if (links instanceof Map) return (id) => links.get(id) || null;
  if (Array.isArray(links)) {
    const m = new Map(links.filter(Boolean).map((l) => [l.cc_material_id, l]));
    return (id) => m.get(id) || null;
  }
  if (links && typeof links === 'object') return (id) => links[id] || null;
  return () => null;
}

const DEPARTMENT_ORDER = new Map([...DEPARTMENTS.map((d, i) => [d.id, i]), ['bespoke', DEPARTMENTS.length]]);

// ─── UX TURN B3 · THE SCREWS, ONE LINE ───────────────────────────────────────
// The owner, 01.11.2026, 18:04: *"raczej zostawilbym wkrety jako jeden i
// wszystkie dziurki 3 mm na wkrety czyli to liczylbym to, z wyjatkiem zawiasow
// i runnersow"*. ONE Screws line; its quantity is the number of screw pilot
// holes at the carcass's screw diameter (`profile.puzzle.screwDiameter`, the
// SCREWS_3MM layer's 3), every drill kind of the drilling that is a screw
// (/screw/), less the hinges' own holes. The runners' holes are kind 'runner'
// (engine/cabinet.js addDrill(..., 'runner', RN.layer, ...)) and the hinge
// mounting plates' kind 'hinge' (engine/mirrorCabinet.js :704): neither is a
// screw kind, so neither is counted. A screw pilot at another diameter is not
// counted either (none is drilled on the fixtures or the owner's projects).

/** The drill kinds that are a HINGE's own screw holes: the cup's two screws (engine/cabinet.js :10396). */
const HINGE_SCREW_KINDS = new Set(['cup_screw']);

/** The screw pilot the Screws line counts, in mm: the carcass's own (`profile.puzzle.screwDiameter`). */
export function screwPilotDiameter(profile) {
  const d = Number(profile?.puzzle?.screwDiameter);
  return d > 0 ? d : null;
}

/** How many screws a drilling takes: its screw pilots at the carcass's diameter, the hinges' excluded. */
export function screwPilotCount(drills, profile) {
  const pilot = screwPilotDiameter(profile);
  if (pilot == null) return 0;
  let n = 0;
  for (const d of drills || []) {
    if (!/screw/.test(String(d?.kind || '')) || HINGE_SCREW_KINDS.has(d.kind)) continue;
    if (Number(d.d) === pilot) n += 1;
  }
  return n;
}

/** The drilling's own counts, as hardware lines (the T32 invoice's reads, one law). */
function drilledLines(entry, design, profile) {
  const out = [];
  const { result, unit } = entry;
  const drills = result.drills || [];
  const push = (role, label, qty, spec, specLabel, u = 'pcs') => {
    if (qty > 0) out.push({ role, label, qty, unit: u, spec, spec_label: specLabel });
  };
  // A hinge has a PLATE, one a hinge (T39 F1, bomInvoice's line), by its finish.
  const plate = profile?.hardware?.hinge?.cliptop ? resolveHingePlate(design, profile) : null;
  const byFinish = new Map();
  for (const h of result.hardware || []) {
    if (h.role !== 'hinges' || !(Number(h.qty) > 0)) continue;
    const f = h.spec?.finish ?? null;
    byFinish.set(f, (byFinish.get(f) || 0) + Number(h.qty));
  }
  for (const [finish, qty] of byFinish) {
    push('hinge_plates', 'Hinge mounting plates', qty, { plate, finish }, `Mounting plate · ${finish || 'finish unknown'}`);
  }
  push('rail_supports', 'Rail supports', drills.filter((d) => d.kind === 'rail_bracket').length, {}, 'Rail support bracket');
  const pilot = screwPilotDiameter(profile);
  push('screws', 'Screws', screwPilotCount(drills, profile), { d: pilot }, `Screw for a ${pilot} mm pilot`);
  push('puzzle_screws', 'Puzzle connectors', drills.filter((d) => d.kind === 'puzzle').length, {}, 'Puzzle connector');
  const dowels = new Map();
  for (const d of drills) if (d.kind === 'dowel' && d.face !== 'edge') dowels.set(Number(d.d), (dowels.get(Number(d.d)) || 0) + 1);
  for (const [d, qty] of dowels) push('dowels', 'Dowels', qty, { d }, `Dowel ${d} mm`);
  const handles = new Map();
  for (const h of result.drillSummary?.handles || []) {
    const key = `${h.type}|${h.centres ?? ''}`;
    handles.set(key, (handles.get(key) || 0) + 1);
  }
  for (const [key, qty] of handles) {
    const [type, centres] = key.split('|');
    push('handle', 'Handles', qty, { type, centres: centres === '' ? null : Number(centres) }, `${type}${centres ? ` ${centres} mm` : ''}`);
  }
  // The plinth's clips and their connectors, the FRONT legs only (bomInvoice.js, T32).
  if (unit?.params?.plinth && profile) {
    const clips = frontLegCount({
      width: Number(unit.params.width) || 0,
      depth: Number(unit.params.depth) || 0,
      boardT: Number(unit.params.board_t) || profile.board.thickness,
    }, profile);
    push('plinth_clips', 'Plinth clips', clips, {}, 'Plinth clip, one per front leg');
    push('plinth_clip_connectors', 'Plinth clip connectors', clips, {}, 'Plinth clip connector, one per front leg');
  }
  return out;
}

/**
 * THE PURCHASE LIST (CONTRACT B).
 *
 * @param {Array<{unit, result}>} unitsIn
 * @param {object} ctx
 *   links     the company's links: a Map (cc_material_id to link), an object, or an array
 *   stock     the company's stock as lib/jcStock.js toMaterial rows; null when not
 *             loaded (a link is then not judged "removed", and is unpriced)
 *   profile, design, pricedAt (T75 F21), bespoke (project.bespoke), room (the worktop's bolts)
 * @returns {{ rows: Array, totals: { lines, linked, notLinked, incomplete, cost, complete, sheets } }}
 */
export function purchaseBom(unitsIn = [], ctx = {}) {
  const units = (Array.isArray(unitsIn) ? unitsIn : []).filter((e) => e?.result);
  const {
    links = null, stock = null, pricedAt = null, bespoke = [], room = null,
  } = ctx || {};
  const profile = ctx?.profile || getCabinetProfile();
  const design = migrateDesign(ctx?.design || null);
  const linkOf = linkLookup(links);
  const stockList = Array.isArray(stock) ? stock : null;
  const stockById = new Map((stockList || []).map((m) => [String(m.id), m]));
  const acc = new Map();

  const rowFor = (key, base) => {
    if (!acc.has(key)) {
      acc.set(key, {
        key, qty: 0, m2: 0, parts: new Set(), roles: new Set(), specs: new Set(), ...base,
      });
    }
    return acc.get(key);
  };

  // ── boards and edging, off the cut list's own catalogue ids ──────────────
  const ready = design.drawerBoxes?.mode === 'ready';
  const bom = buildBom(units, {
    design, profile, excludeDrawerBoxes: ready, room,
  });
  for (const r of bom.cutRows || []) {
    const qty = Number(r.qty) || 0;
    const area = (Number(r.area_m2) || 0) * qty;
    const partId = partIdForElement(r.part) || r.role;
    const id = r.catalogue_id || null;
    const entry = id ? entryById(id) : null;
    const key = id ? `cat:${id}` : `nc:board:${r.material_label || r.role}|${r.thickness}`;
    const row = rowFor(key, {
      catalogueId: id,
      department: 'sheets',
      kind: 'sheet',
      name: entry ? entry.name : `${r.material_label || 'Board'}, ${formatMm(r.thickness)} mm`,
      unit: 'm²',
      why: id ? null : (r.catalogue_reason || NOT_IN_CATALOGUE),
    });
    row.m2 += area;
    row.qty += area;
    row.parts.add(partId);
    row.roles.add(r.role);
    const edgeM = (Number(r.edge_m) || 0) * qty;
    if (!(edgeM > 0)) continue;
    // A painted or raw MDF edge is not taped, whether the catalogue holds that MDF or not.
    if (entry?.brand === 'mdf' || isMdfSource(r.board_source)) continue;
    const edge = entry ? edgeEntryOfBoard(id) : null;
    const ekey = edge ? `cat:${edge.id}` : `nc:edge:${entry?.name || r.material_label || r.role}`;
    const erow = rowFor(ekey, {
      catalogueId: edge?.id || null,
      department: 'consumables',
      kind: 'edging',
      name: edge ? edge.name : `Edging for ${entry?.name || r.material_label || 'a board'}`,
      unit: 'm',
      why: edge ? null : 'the edging follows a board with no Egger decor',
    });
    erow.qty += edgeM;
    erow.parts.add(edgePartFor(partId) || partId);
    erow.roles.add('edging');
  }

  // ── hardware: the engine's lines, the drilling's counts, the light ───────
  const lines = [];
  for (const h of bom.hardware || []) {
    if (h.role === 'rail') {
      // Tube is bought by the METRE (bomInvoice.js since T32, the T39 registry's unit).
      lines.push({ ...h, qty: roundTo(((Number(h.spec?.length_mm) || 0) * (Number(h.qty) || 0)) / 1000, 4), unit: 'm' });
    } else lines.push(h);
  }
  for (const e of units) lines.push(...drilledLines(e, design, profile));
  if (units.length) {
    const light = lightingBomLines({ entries: units, design, profile });
    lines.push(...light);
    const strip = light.filter((l) => l.role === 'led_strip').reduce((s, l) => s + (Number(l.qty) || 0), 0);
    if (strip > 0) lines.push({ role: 'led_profile', label: 'LED profile', qty: roundTo(strip, 2), unit: 'm', spec: {}, spec_label: 'a metre of profile a metre of strip' });
  }
  if (ready) lines.push(...readyBoxLines(units).map((l) => ({ ...l, spec: {} })));
  for (const l of lines) {
    const qty = Number(l.qty) || 0;
    if (!(qty > 0)) continue;
    const res = catalogueIdOfLine(l);
    if (res.notBought) continue;                          // the client's appliance, a machined J-pull
    const entry = res.id ? entryById(res.id) : null;
    const key = entry ? `cat:${entry.id}` : `nc:${l.role}|${l.spec_label || l.label || ''}`;
    const row = rowFor(key, {
      catalogueId: entry?.id || null,
      department: entry?.department || 'ironmongery',
      kind: entry?.kind || 'hardware',
      name: entry ? entry.name : `${l.label || l.role}${l.spec_label ? `, ${l.spec_label}` : ''}`,
      unit: l.unit || entry?.unit || 'pcs',
      why: entry ? null : (res.why || NOT_IN_CATALOGUE),
    });
    row.qty += qty;
    row.roles.add(l.role);
    if (l.spec_label) row.specs.add(l.spec_label);
    const partId = HARDWARE_TO_PART_ID[l.role] || LIGHTING_TO_PART_ID[l.role] || l.role;
    row.parts.add(partId);
  }

  // ── paint: one line a colour, through the ONE paint.bespoke link (F7) ────
  if (units.length) {
    const paintLink = linkOf('paint.bespoke');
    const primerLink = linkOf('paint.primer');
    for (const p of paintLinesFor(units, {
      design, profile, coverage: paintLink?.coverage_m2_per_l, primerCoverage: primerLink?.coverage_m2_per_l,
    })) {
      if (!(p.litres > 0)) continue;
      const id = { paint: 'paint.bespoke', primer: 'paint.primer', solvent: 'paint.solvent', lacquer: 'lacquer' }[p.role];
      const key = p.role === 'paint' ? `cat:${id}|${p.colour}` : `cat:${id}`;
      const row = rowFor(key, {
        catalogueId: id, department: 'paint', kind: 'paint', name: p.name, unit: 'L', why: null,
        colour: p.colour, coats: p.coats, coverage: p.coverage,
      });
      row.qty += p.litres;
      row.m2 += p.m2;
      row.roles.add(p.role);
    }
  }

  // ── resolve every row: link, stock row, price, status ─────────────────────
  const priceOf = (st, link) => {
    const sid = st?.id ?? link?.stock_item_id;
    const quoted = sid != null ? pricedAt?.prices?.[sid] : null;
    if (quoted && quoted.price != null) return { price: Number(quoted.price) || 0, source: 'quoted' };
    if (!st) return { price: null, source: null };
    const v = st.price ?? st.cost_per_unit;
    return { price: v == null || v === '' ? null : Number(v) || 0, source: 'stock' };
  };
  // UX turn B5 (Ewa P9, Kamil P3): NO PRICE IS NOT A PRICE. A linked row whose
  // price (the quote of T75 F21, else the stock row's average) is 0 or missing
  // is 'no-price': said in words, never in the total, counted incomplete. A
  // row with no price SOURCE at all (no quote, the stock not loaded) is still
  // 'linked' and unpriced, as T-CC2a F5.3 left it.
  const unpriced = (price, source) => source != null && !(Number(price) > 0);
  const NO_PRICE = { status: 'no-price', words: LINK_WORDS.noPrice, price: null, lineCost: null };
  const rows = [];
  for (const v of acc.values()) {
    const base = {
      key: v.key,
      catalogueId: v.catalogueId,
      department: v.department,
      kind: v.kind,
      name: v.name,
      qty: roundTo(v.qty, 4),
      unit: v.unit,
      ...(v.kind === 'sheet' ? { m2: roundTo(v.m2, 4), sheets: null } : {}),
      ...(v.kind === 'paint' ? {
        m2: roundTo(v.m2, 4), colour: v.colour ?? null, coats: v.coats ?? null, coverage: v.coverage ?? null,
      } : {}),
      parts: [...v.parts],
      roles: [...v.roles],
      specs: [...v.specs],
    };
    if (!v.catalogueId) {
      rows.push({
        ...base, status: 'not-in-catalogue', words: LINK_WORDS.notInCatalogue, why: v.why, link: null, stock: null, price: null, lineCost: null,
      });
      continue;
    }
    const link = linkOf(v.catalogueId);
    if (!link) {
      rows.push({
        ...base, status: 'not-linked', words: LINK_WORDS.notLinked, link: null, stock: null, price: null, lineCost: null,
      });
      continue;
    }
    const st = stockList ? (stockById.get(String(link.stock_item_id)) || null) : null;
    if (stockList && !st) {
      rows.push({
        ...base, status: 'removed', words: LINK_WORDS.removed, link, stock: null, price: null, lineCost: null,
      });
      continue;
    }
    const { price, source } = priceOf(st, link);
    const said = {
      link,
      stock: st,
      ...(st ? { stockName: st.name ?? null, item_number: st.item_number ?? null, image_url: st.image_url ?? null, stockUnit: st.unit ?? null } : {}),
      // T75 F21 · *"the purchase BOM export carries jc_uuid and the material code on every line that has them"*.
      jc_uuid: String(st?.jc_uuid ?? link.stock_item_id ?? '') || null,
      code: st?.code ?? st?.item_number ?? null,
      price_source: source,
    };
    if (v.kind === 'sheet') {
      const y = sheetYieldOf(link, profile);
      const sheets = sheetCount(v.m2, { yield: y, widthMm: link.sheet_width_mm, lengthMm: link.sheet_length_mm });
      const sized = { ...base, ...said, yield: y, sheetSize: sheets == null ? null : { width_mm: Number(link.sheet_width_mm), length_mm: Number(link.sheet_length_mm) } };
      if (sheets == null) {
        rows.push({
          ...sized, status: 'no-sheet-size', words: LINK_WORDS.sheetSizeMissing, sheets: null, price: null, lineCost: null,
        });
        continue;
      }
      const how = st ? sheetUnitKind(st.unit) : (price != null ? 'sheet' : null);
      if (st && !how) {
        rows.push({
          ...sized, status: 'unit-unknown', words: LINK_WORDS.unitUnknown, sheets, price: null, lineCost: null,
        });
        continue;
      }
      if (unpriced(price, source)) {
        rows.push({ ...sized, sheets, priceBy: how, ...NO_PRICE });
        continue;
      }
      const lineCost = price == null ? null : roundTo(how === 'area' ? v.m2 * y * price : sheets * price, 2);
      rows.push({
        ...sized, status: 'linked', words: null, sheets, price, priceBy: how, lineCost,
      });
      continue;
    }
    if (unpriced(price, source)) {
      rows.push({ ...base, ...said, ...NO_PRICE });
      continue;
    }
    rows.push({
      ...base, ...said, status: 'linked', words: null, price, lineCost: price == null ? null : roundTo(v.qty * price, 2),
    });
  }

  // ── bespoke: this project's own, never the catalogue (law 9) ─────────────
  for (const b of Array.isArray(bespoke) ? bespoke : []) {
    if (!b || !b.id) continue;
    // A quantity nobody can parse is ONE (T39 F8, Production Core's own answer), never zero and never NaN.
    const q = Number(b.qty);
    const qty = Number.isFinite(q) && q >= 0 && b.qty !== null && b.qty !== '' ? q : 1;
    const client = b.suppliedByClient === true;
    const price = client ? 0 : (Number(b.price) || 0);
    // UX turn B5: a bespoke row the workshop BUYS with no price is no price;
    // "Supplied by client" is 0 by right and complete.
    const free = !client && !(price > 0);
    rows.push({
      key: `bespoke:${b.id}`,
      catalogueId: null,
      department: 'bespoke',
      kind: 'other',
      name: String(b.name || 'Bespoke item'),
      qty,
      unit: b.unit || 'pcs',
      parts: [],
      roles: ['bespoke'],
      specs: [],
      status: 'bespoke',
      words: client ? 'Supplied by client' : null,
      link: null,
      stock: null,
      price,
      lineCost: roundTo(qty * price, 2),
      ...(free ? NO_PRICE : {}),
      bespoke: true,
      suppliedByClient: client,
    });
  }

  const incomplete = (r) => INCOMPLETE_STATUSES.includes(r.status);
  rows.sort((a, b) => (incomplete(a) === incomplete(b) ? 0 : (incomplete(a) ? -1 : 1))
    || (DEPARTMENT_ORDER.get(a.department) ?? 99) - (DEPARTMENT_ORDER.get(b.department) ?? 99)
    || String(a.name).localeCompare(String(b.name)));
  const notLinked = rows.filter(incomplete).length;
  return {
    rows,
    totals: {
      lines: rows.length,
      linked: rows.filter((r) => r.status === 'linked').length,
      // UX turn B5: the rows linked (or bespoke) with no price, a part of `incomplete`.
      noPrice: rows.filter((r) => r.status === 'no-price').length,
      notLinked,
      incomplete: notLinked,
      cost: roundTo(rows.reduce((s, r) => s + (Number(r.lineCost) || 0), 0), 2),
      complete: notLinked === 0,
      sheets: rows.reduce((s, r) => s + (Number(r.sheets) || 0), 0),
      ...(notLinked > 0 ? { words: incompleteWords(notLinked, rows.filter((r) => r.status === 'no-price').length) } : {}),
    },
  };
}

/**
 * The T39 name of the purchase list, kept as a door to the ONE road: the rows
 * of `purchaseBom`. Its assignment-keyed body (the board road's
 * `assignmentFor`, the `mat:` / `part:` keys, the m2 row's `qty x
 * costPerUnit`) is DELETED by T-CC2a's Deletion licence.
 */
export function mergeUnitMaterials(unitsIn = [], ctx = {}) {
  return purchaseBom(unitsIn, ctx).rows;
}

/**
 * WHAT THIS PROJECT ACTUALLY USES (turn 39, CLAUDE.md F3 / F7).
 *
 * The registry has 54 parts. A one-cabinet job uses a dozen. The Assign
 * Materials modal must not read "41 parts unassigned" at a joiner who has
 * assigned everything his kitchen contains, and the CNC warning must not fire
 * over a shoe box nobody has drawn.
 *
 * So this answers the only question either of them is really asking: which
 * parts does the CURRENT design need, in which cabinet families, and how much.
 *
 * @returns {{[partId]: { qty:number, unit:string, families:string[] }}}
 */
export function projectPartUsage(entries = [], { profile = null, design = null } = {}) {
  const rows = Array.isArray(entries) ? entries : [];
  const out = {};
  const note = (partId, entry, family) => {
    if (!entry || !PART_REGISTRY[partId]) return;
    const amount = entry.m2 ?? entry.m ?? entry.pcs ?? 0;
    if (!(amount > 0)) return;
    if (!out[partId]) out[partId] = { qty: 0, unit: entry.unit, families: [] };
    out[partId].qty += amount;
    if (family && !out[partId].families.includes(family)) out[partId].families.push(family);
  };
  for (const e of rows) {
    if (!e?.result) continue;
    const family = cabinetFamilyOf(e.result.type || e.unit?.type);
    const q = buildCabinetPartQtys(e.result, e.unit, { profile });
    for (const [partId, entry] of Object.entries(q)) note(partId, entry, family);
  }
  if (design && profile && rows.length) {
    // Lighting is a project fact, so it belongs to no family — a project's own
    // base assignment is what covers it.
    for (const [partId, entry] of Object.entries(lightingPartQtys(rows, { design, profile }))) {
      note(partId, entry, null);
    }
    // T78 F21 - and the paint, so the Assign Materials modal lists the two
    // paint parts as "used by this job" the moment a door exists.
    for (const [partId, entry] of Object.entries(paintPurchaseQtys(rows, { design, profile }))) {
      note(partId, entry, null);
    }
  }
  return out;
}

/**
 * The parts this project uses that have NOTHING behind them.
 *
 * A part counts as missing when any family that uses it has no material — so a
 * board assigned for the wardrobes and left blank for the kitchen bases is
 * still missing, and says which family it is missing for.
 *
 * @returns {Array<{ partId:string, part:object, families:string[] }>}
 */
export function unassignedInUse(entries = [], {
  assignments = null, assignmentsData = null, profile = null, design = null, materials = [],
} = {}) {
  const data = normalizeAssignments(assignmentsData || assignments);
  const usage = projectPartUsage(entries, { profile, design });
  const missingMouldingFamilies = new Set();
  if (usage.front_moulding) {
    for (const entry of entries) {
      if (!entry?.result) continue;
      const family = cabinetFamilyOf(entry.result.type || entry.unit?.type);
      const assignment = assignmentFor(data, 'front_moulding', family);
      for (const panel of entry.result.panels || []) {
        if (panel.part !== 'FRONT-MOULDING' || !(panel.area_m2 * (Number(panel.qty) || 1) > 0)) continue;
        const resolved = resolveMouldingMaterial(panel, entry.unit, assignment, { design, profile, materials });
        if (!resolved.assigned) missingMouldingFamilies.add(family);
      }
    }
  }
  const out = [];
  for (const [partId, use] of Object.entries(usage)) {
    // T78 F21 · the PAINT is not a cut part: a sprayed set with no paint
    // assigned is said on the Spraying page (PART C) and in the purchase list
    // (a missing price, the BOM law), never as a CNC assignment warning about
    // a board nobody chose. The litres ride the usage for the purchase list only.
    if (PART_REGISTRY[partId]?.materialType === 'paint') continue;
    const families = use.families.length ? use.families : [null];
    const missing = families.filter((f) => partId === 'front_moulding'
      ? missingMouldingFamilies.has(f)
      : !assignmentFor(data, partId, f)?.material_id);
    if (missing.length) {
      out.push({ partId, part: PART_REGISTRY[partId], families: missing.filter(Boolean) });
    }
  }
  return out.sort((a, b) => a.part.name.localeCompare(b.part.name));
}

/**
 * ─── THE CNC WARNING (turn 39, CLAUDE.md F7) ────────────────────────────────
 *
 * *"Export CNC warns (warns, not blocks) when the project has unassigned parts,
 * because a cut file for a board nobody has chosen is a cut file for the wrong
 * board."*
 *
 * WARNS. It returns a sentence or null; the caller says it and carries on. This
 * is the same grammar the Check pre-export hook already uses — it informs, it
 * never fixes and it never holds anything back. The one thing in this app that
 * holds a board back is the export gate, which is a different mechanism with
 * its own "Export anyway".
 *
 * It counts only the parts a BOARD is cut from: a missing hinge product is a
 * purchasing problem, and a DXF does not care what a hinge is made of.
 *
 * @returns {string|null}
 */
export function cncAssignmentWarning(entries = [], {
  assignments = null, assignmentsData = null, profile = null, design = null, materials = [],
} = {}) {
  const missing = unassignedInUse(entries, {
    assignments, assignmentsData, profile, design, materials,
  }).filter((m) => PART_REGISTRY[m.partId]?.unit === 'm²');
  if (!missing.length) return null;
  const names = missing.slice(0, 4).map((m) => m.part.name);
  const rest = missing.length - names.length;
  return `${missing.length} cut part${missing.length === 1 ? ' has' : 's have'} no board assigned `
    + `(${names.join(', ')}${rest > 0 ? ` and ${rest} more` : ''}) — `
    + 'the file will be cut, but nobody has said what from.';
}
