// ─── T78 F18 · LIFT-UP WALL UNITS, BLUM AVENTOS: HK top | HS top | HL top | HF top ──
//
// The owner, 11.10.2026: *"szafki poziome otwierane do gory system blum ...
// podwojne drzwi pojedyncze etc."*  CLAUDE.md T78 F18: four FRONT MOTIONS on
// a wall unit (WUD, WUD_GLASS, WARDROBE_WALL), chosen in the Doors section as
// the opening: `front_system: 'hinged' (default) | 'hk' | 'hs' | 'hl' | 'hf'`.
//
//   hk  AVENTOS HK top   one leaf, swings up about its top edge, two stay-lift arms
//   hs  AVENTOS HS top   one leaf, swings up and over the carcass (parallel arms)
//   hl  AVENTOS HL top   one leaf, lifts parallel and forward
//   hf  AVENTOS HF top   a bi-fold leaf in two halves (the owner's "podwojne
//                        drzwi"): the upper hinged to the carcass top, the lower
//                        to the upper
//
// THE LAW OF THIS FILE (CLAUDE.md T78 LAWS): a bought mechanism is a line and a
// body, never a hole, until its manufacturer's drilling is in
// `reference/hardware/` with a page number. On 11.10.2026 the fixing pattern of
// every one of the four systems is NULL in `reference/hardware/aventos.json`
// (`t78_f18.systems.*.fixingLiftMechanism.holePositions.value`), the HF top's
// H / X / Y table has no datum, and the front fixing bracket's holes on the
// leaf were printed nowhere; so every system here is BOM lines and placeholder
// bodies, the leaf carries NO hinge cups, the sides NO plate rows, and the unit
// says so in words (`LIFT_NO_PATTERN`). No LISP is needed: the leaf is a plain
// rectangle, no cut geometry moved.
//
// THE NUMBERS ARE THE CATALOGUE'S. Every number read here comes out of
// `aventos.json`'s `t78_f18` key, which the data agent wrote from the named
// catalogue pages with `owner to confirm` beside each; nothing is retyped.
// The file is IMPORTED (as `engine/checks.js` imports
// `cliptop-hinge-count.json`): a file that ships with the app cannot 404 and
// the engine never fetches. The HK top's power-unit ladder is still chosen by
// T19's `selectLiftUnit` (engine/lifts.js) against `power_units_hk_top`, so
// T19's rules stand (an overlap resolves to the SMALLER unit; PF below or
// above the ladder is said in words). Where nobody has handed lifts.js its
// catalogue yet (a bare `computeCabinet()`, a golden), this module hands it
// the same file, once, so a lift unit computes the same article everywhere.
//
// T19's `engineNotes.selectLiftUnit` in the data file: *"HS top and HL top
// select by cabinet height AND front weight bands, not by a single LF; HF top
// selects by LF with its own three bands and by lever arm cabinet height. A
// kit builder must read systems.hs / systems.hl / systems.hf here and may not
// reuse the HK ladder for them."*  That is what `liftPlanFor` does.
//
// Pure functions: no React, no store, no fetch.

import AVENTOS from '../../reference/hardware/aventos.json' with { type: 'json' };
import {
  aventosCatalogue, boardKgM2, frontWeightKg, powerFactor, selectLiftUnit, setAventosCatalogue,
} from './lifts.js';
import { roundTo } from './format.js';

/** The four lift systems, in CLAUDE.md F18's order. */
export const LIFT_SYSTEMS = Object.freeze(['hk', 'hs', 'hl', 'hf']);
/** What `params.front_system` may say. `hinged` (or nothing) is today's door. */
export const FRONT_SYSTEMS = Object.freeze(['hinged', ...LIFT_SYSTEMS]);

/** The words the Doors section and the BOM print for each system. */
export const LIFT_LABELS = Object.freeze({
  hk: 'AVENTOS HK top',
  hs: 'AVENTOS HS top',
  hl: 'AVENTOS HL top',
  hf: 'AVENTOS HF top',
});

/** The motion, in words, for the select and the Check. */
export const LIFT_MOTIONS = Object.freeze({
  hk: 'lift up',
  hs: 'up and over',
  hl: 'lift parallel',
  hf: 'bi-fold up',
});

/** The `t78_f18` record of the catalogue file, or null if the file has none. */
export function liftData() {
  const d = AVENTOS?.t78_f18;
  return d && typeof d === 'object' ? d : null;
}

/** One system's record (`t78_f18.systems.<id>`), or null. */
export function liftSystemData(system) {
  const d = liftData();
  const s = d?.systems?.[system];
  return s && typeof s === 'object' ? s : null;
}

/**
 * Which kits take a lift: a wall-hung box with a door, that is not an
 * appliance housing, a corner, a blind kit, a desk or a drop front, and does
 * not ride on another unit. WUD, WUD_GLASS and WARDROBE_WALL are the three
 * CLAUDE.md names; the test pins that a hood, an L and a blind refuse.
 */
export function liftTakesKit(type) {
  if (!type || typeof type !== 'object') return false;
  return type.mount === 'wall'
    && Boolean(type.supports?.doors)
    && !type.appliance
    && !type.corner
    && !type.blind
    && !type.desk
    && !type.ridesOn
    && type.frontOpens !== 'drop';
}

/**
 * The lift system a unit asked for, or null for a hinged front (the default,
 * and every unit saved before tonight). A kit that takes no lift answers null
 * whatever its params say, so a stale field is a field and not an order.
 */
export function liftSystemOf(params, type) {
  const s = params?.front_system;
  if (!LIFT_SYSTEMS.includes(s)) return null;
  return liftTakesKit(type) ? s : null;
}

/** A two-number range `[lo, hi]` holds `v` (inclusive), or not. */
const inRange = (range, v) => Array.isArray(range) && range.length === 2
  && Number.isFinite(Number(v)) && Number(v) >= Number(range[0]) && Number(v) <= Number(range[1]);

const fmt = (v, dec = 1) => String(roundTo(Number(v), dec));

/**
 * The HK top's set id for T19's unit number (`existingUnit` in the data),
 * e.g. 2700 -> '22K2700'. Null when the data does not pair them.
 */
function hkSetFor(unit, hk) {
  const row = (hk?.liftMechanismSets || []).find((s) => Number(s?.existingUnit) === Number(unit));
  return row?.set ? String(row.set) : null;
}

/**
 * THE RISE: how far the leaf's highest point stands above the leaf's own top
 * edge at full opening, in mm. ONE derivation for the scene and the Check.
 *
 *   hk   the leaf swung up about its top edge by `angleDeg`: past square its
 *        free edge climbs `-h cos(angle)` above the pivot, and the board's
 *        thickness stands proud with it. At 107 degrees this is FH x 0.29 + FD,
 *        which is the catalogue's own Y (systems.hk.planning.spaceRequirementY,
 *        `Y = FH x 0.29 + FD minus SOB`), so the two agree by construction.
 *   hf   the UPPER half swung the same way (the lower hangs from its free edge
 *        and is never higher than the centre hinge).
 *   hs / hl  the catalogue's keyframes where the data has them (the highest
 *        `dy`), else the PLACEHOLDER path: a plain rise of the leaf height.
 */
export function liftRiseMm({
  system, angleDeg = null, travel = null, halves = null,
}, { heightMm, thicknessMm = 0 }) {
  const h = Number(heightMm) || 0;
  const d = Math.max(0, Number(thicknessMm) || 0);
  if (system === 'hk' || system === 'hf') {
    const leafH = system === 'hf' && Array.isArray(halves) && Number(halves[0]) > 0 ? Number(halves[0]) : h;
    const a = ((Number(angleDeg) > 0 ? Number(angleDeg) : 90) * Math.PI) / 180;
    return roundTo(Math.max(0, -leafH * Math.cos(a)) + d, 1);
  }
  if (system === 'hs' || system === 'hl') {
    if (Array.isArray(travel) && travel.length) {
      return roundTo(Math.max(0, ...travel.map((k) => Number(k?.dy) || 0)), 1);
    }
    return roundTo(h, 1);
  }
  return 0;
}

/**
 * WHERE AN HS / HL LEAF IS AT `t` (0 shut, 1 open): `{ dy, dz, rotateDeg }` in
 * mm and degrees, linear between the catalogue's keyframes. With no keyframes
 * (the data has none for either system, 11.10.2026) the PLACEHOLDER path: a
 * plain rise of the leaf height, no travel forward, no rotation. The scene
 * reads this and nothing else, so the Check's rise above and the picture
 * cannot disagree.
 */
export function liftTravelAt(lift, leafHeightMm, t) {
  const a = Math.max(0, Math.min(1, Number(t) || 0));
  const kf = Array.isArray(lift?.travel)
    ? lift.travel
      .map((k) => ({
        t: Number(k?.t), dy: Number(k?.dy) || 0, dz: Number(k?.dz) || 0, rotateDeg: Number(k?.rotateDeg) || 0,
      }))
      .filter((k) => Number.isFinite(k.t))
      .sort((p, q) => p.t - q.t)
    : [];
  if (kf.length < 2) return { dy: roundTo(a * (Number(leafHeightMm) || 0), 2), dz: 0, rotateDeg: 0 };
  if (a <= kf[0].t) return { dy: kf[0].dy, dz: kf[0].dz, rotateDeg: kf[0].rotateDeg };
  for (let i = 1; i < kf.length; i += 1) {
    if (a <= kf[i].t) {
      const p = kf[i - 1];
      const q = kf[i];
      const k = q.t > p.t ? (a - p.t) / (q.t - p.t) : 1;
      return {
        dy: roundTo(p.dy + (q.dy - p.dy) * k, 2),
        dz: roundTo(p.dz + (q.dz - p.dz) * k, 2),
        rotateDeg: roundTo(p.rotateDeg + (q.rotateDeg - p.rotateDeg) * k, 2),
      };
    }
  }
  const last = kf[kf.length - 1];
  return { dy: last.dy, dz: last.dz, rotateDeg: last.rotateDeg };
}

/**
 * THE CATALOGUE'S KEYFRAMES for a system, as the engine hands them to the
 * scene, or null where the data has none. The HK and HF records print
 * rotation-only keyframes (`rotateDeg` / `upperRotateDeg`); the scene reads
 * `angleDeg` for those, so only a path with a `dy` or `dz` is a travel.
 */
function travelOf(sys) {
  const kf = sys?.animation?.keyframes;
  if (!Array.isArray(kf)) return null;
  const rows = kf.filter((k) => k && typeof k === 'object' && (Number.isFinite(Number(k.dy)) || Number.isFinite(Number(k.dz))));
  return rows.length >= 2 ? rows.map((k) => ({
    t: Number(k.t), dy: Number(k.dy) || 0, dz: Number(k.dz) || 0, rotateDeg: Number(k.rotateDeg) || 0,
  })) : null;
}

/**
 * THE PLAN OF ONE LIFT UNIT: the leaf's weight, the power factor, the set the
 * catalogue proposes (or the refusal in words), the lever arm, the caps, the
 * brackets, the HF hinge set, the opening angle or the path for the scene,
 * the rise for the Check, the placeholder bodies, and every sentence.
 *
 * @param {object} args
 *   system      'hk' | 'hs' | 'hl' | 'hf'
 *   cabinet     { widthMm, heightMm, depthMm, innerDepthMm, boardMm }
 *   leaf        { widthMm, heightMm, thicknessMm }  the ONE full-width leaf
 *   gapMm       the gap between the HF halves (the profile's door gap)
 *   kgM2Kind    'mfc' | 'mdf_lacquered' (the profile's default where unknown)
 *   profile
 * @returns {{ lift, lines, bodies, warnings, derived, halves, weightKg, pf }}
 */
export function liftPlanFor({
  system, cabinet = {}, leaf = {}, gapMm = 0, kgM2Kind = null, profile,
}) {
  const sys = liftSystemData(system);
  const shared = liftData()?.shared || {};
  const warnings = [];
  const warn = (code, message, level = 'warn') => warnings.push({ code, level, message });
  const label = LIFT_LABELS[system] || `AVENTOS ${String(system).toUpperCase()}`;
  const H = Number(cabinet.heightMm) || 0;
  const W = Number(cabinet.widthMm) || 0;
  const LT = Number(cabinet.innerDepthMm) || 0;
  const leafW = Number(leaf.widthMm) || 0;
  const leafH = Number(leaf.heightMm) || 0;
  const leafT = Number(leaf.thicknessMm) || 0;
  const gap = Math.max(0, Number(gapMm) || 0);

  // ── the halves of an HF leaf ───────────────────────────────────────────────
  // Equal halves less the gap between them (`profile.lifts.hfSplit`, `equal`
  // // T78 proposed): the catalogue says only that *"the taller front must go
  // on top for asymmetrical applications"* (en/22), so an unequal split is
  // the owner's to ask for.
  const halves = system === 'hf'
    ? (() => {
      const open = Math.max(0, leafH - gap);
      const up = roundTo(open / 2, 4);
      return [up, roundTo(open - up, 4)];
    })()
    : null;

  // ── the weight and the power factor ────────────────────────────────────────
  // The whole leaf's area (an HF's two halves together), the board's weight by
  // the profile table (engine/lifts.js boardKgM2: the nearest stocked board,
  // said so). The handle the client has not chosen yet is not a weight this
  // app can add (T19 BLOCKERS), and the catalogue counts it twice (en/50).
  const kind = kgM2Kind || profile?.board?.defaultKgM2Kind || 'mfc';
  const board = boardKgM2({ thickness: leafT, kind, profile });
  const weightKg = frontWeightKg({ widthMm: leafW, heightMm: leafH, kgM2: board.kgM2 });
  const pf = powerFactor({ cabinetHeightMm: H, frontWeightKg: weightKg });

  // ── the selection, per system ──────────────────────────────────────────────
  let set = null;        // the lift mechanism set article, e.g. '22K2700'
  let unit = null;       // T19's unit number for the HK (2300 | 2500 | 2700 | 2900)
  let arm = null;        // the lever arm set (HS, HL, HF)
  let refused = null;    // the LIFT_NO_UNIT sentence, where no set covers the front
  const limits = [];     // the cabinet limits said in words (LIFT_CABINET)

  if (!sys) {
    refused = `${label}: reference/hardware/aventos.json carries no record of this system (t78_f18.systems.${system}); nothing can be proposed.`;
  } else if (system === 'hk') {
    // The HK ladder is T19's: `selectLiftUnit` against power_units_hk_top,
    // with the overlap rule, the limits and the words of turn 19. Hand it the
    // file where nobody has yet (a bare computeCabinet(), a golden).
    if (!aventosCatalogue()) setAventosCatalogue(AVENTOS);
    const pick = selectLiftUnit({
      cabinetHeightMm: H, frontWeightKg: weightKg, cabinetWidthMm: W, innerDepthMm: LT,
    });
    unit = pick.proposed ?? null;
    set = unit ? hkSetFor(unit, sys) : null;
    for (const w of pick.warnings) {
      if (w.code === 'PF_BELOW_RANGE' || w.code === 'PF_ABOVE_RANGE' || w.code === 'NO_POWER_FACTOR' || w.code === 'NO_CATALOGUE') {
        refused = `${label}: ${w.message}`;
      } else if (w.code === 'HK_HEIGHT' || w.code === 'HK_WIDTH' || w.code === 'HK_DEPTH') {
        limits.push(w.message);
      }
    }
    // The catalogue's second cap beside the LF ladder: 18 kg for two lift
    // mechanisms (en/50), a third mechanism lifts it by 50 percent (not
    // offered here; the owner decides).
    const maxKg = Number(sys.frontWeightMaxKg?.value);
    if (maxKg > 0 && weightKg > maxKg) {
      const cap = `${label}: the front weighs ${fmt(weightKg)} kg and the catalogue caps two lift mechanisms at ${maxKg} kg (en/50, owner to confirm). Lighter board, a shorter leaf, or a third mechanism.`;
      warn('LIFT_FRONT_WEIGHT', cap);
      if (!refused) refused = cap;
    }
  } else if (system === 'hs') {
    const sets = Array.isArray(sys.liftMechanismSets) ? sys.liftMechanismSets : [];
    const hit = sets.find((s) => (s?.bands || []).some((b) => inRange(b.cabinetHeightKHMm, H) && inRange(b.frontWeightFGKg, weightKg)));
    set = hit?.set ? String(hit.set) : null;
    if (!set) {
      const bands = sets.flatMap((s) => (s.bands || []).map((b) => `${s.set} KH ${b.cabinetHeightKHMm?.join(' to ')} / FG ${b.frontWeightFGKg?.join(' to ')} kg`)).join('; ');
      refused = `${label}: no lift mechanism set covers a ${fmt(H, 0)} mm cabinet with a ${fmt(weightKg)} kg front (en/34: ${bands}; owner to confirm).`;
    }
    if (inRange(sys.leverArm?.cabinetHeightKHMm, H) && sys.leverArm?.set) arm = String(sys.leverArm.set);
  } else if (system === 'hl') {
    const sets = Array.isArray(sys.liftMechanismSets) ? sys.liftMechanismSets : [];
    const hit = sets.find((s) => inRange(s?.cabinetHeightKHMm, H) && inRange(s?.frontWeightFGKg, weightKg));
    set = hit?.set ? String(hit.set) : null;
    if (!set) {
      const bands = sets.map((s) => `${s.set} KH ${s.cabinetHeightKHMm?.join(' to ')} / FG ${s.frontWeightFGKg?.join(' to ')} kg`).join('; ');
      refused = `${label}: no lift mechanism set covers a ${fmt(H, 0)} mm cabinet with a ${fmt(weightKg)} kg front (en/40: ${bands}; owner to confirm).`;
    }
    // The lever arm by cabinet height; two sets overlap at 480 to 540 and the
    // first (T19's "smaller wins") is taken; the catalogue's own advice for an
    // overlap (the more powerful) is recorded in the file for the owner.
    const arms = Array.isArray(sys.leverArms) ? sys.leverArms : [];
    const armHit = arms.find((a) => inRange(a?.cabinetHeightKHMm, H));
    arm = armHit?.set ? String(armHit.set) : null;
  } else if (system === 'hf') {
    const sets = Array.isArray(sys.liftMechanismSets) ? sys.liftMechanismSets : [];
    const hit = pf != null ? sets.find((s) => inRange(s?.powerFactorLF, pf)) : null;
    set = hit?.set ? String(hit.set) : null;
    if (!set) {
      const bands = sets.map((s) => `${s.set} LF ${s.powerFactorLF?.join(' to ')}`).join('; ');
      refused = pf == null
        ? `${label}: without a cabinet height and a front weight there is no power factor to choose on.`
        : `${label}: power factor ${fmt(pf)} is covered by no lift mechanism set (en/22: ${bands}; owner to confirm). Lighter board, a shorter cabinet, or a third mechanism.`;
    }
    const arms = Array.isArray(sys.leverArms) ? sys.leverArms : [];
    const armHit = arms.find((a) => inRange(a?.cabinetHeightKHMm, H));
    arm = armHit?.set ? String(armHit.set) : null;
  }

  // ── the cabinet's own limits, whatever the weight (every system) ───────────
  if (sys && system !== 'hk') {
    const KH = sys.cabinet?.heightKHMm?.value;
    if (Array.isArray(KH) && H > 0 && !inRange(KH, H)) {
      limits.push(`${label} fits a cabinet ${KH[0]} to ${KH[1]} mm high; this one is ${fmt(H, 0)} mm.`);
    }
    const KB = Number(sys.cabinet?.widthKBMaxMm?.value);
    if (KB > 0 && W > KB) limits.push(`${label} fits a cabinet up to ${KB} mm wide; this one is ${fmt(W, 0)} mm.`);
    const ltMin = Number(sys.cabinet?.internalDepthLTMinMm?.value);
    if (ltMin > 0 && LT > 0 && LT < ltMin) limits.push(`${label} needs at least ${ltMin} mm internal depth; this cabinet has ${fmt(LT, 0)} mm.`);
  }

  // ── the articles beside the mechanism ──────────────────────────────────────
  const capsArticle = system === 'hk'
    ? (sys?.coverCaps?.standard?.article ?? null)
    : (sys?.coverCaps?.standard ?? shared.coverCapsTop?.standard?.article ?? null);
  const bracketArticle = shared.frontFixingBrackets?.woodAndWideAlu?.article
    ?? (Array.isArray(sys?.frontFixingBracket?.articles) ? sys.frontFixingBracket.articles[0] : null) ?? null;

  // ── the HF hinges: the upper half on the top panel, the centre hinge between ─
  let hfHinges = null;
  if (system === 'hf' && sys) {
    const rule = sys.hinges?.upperFrontToTopPanel?.count?.rule || {};
    let count = Number(sys.hinges?.upperFrontToTopPanel?.count?.default) || 2;
    const three = rule.threeAt || {};
    const four = rule.fourAt || {};
    if ((Number(three.widthKBMm) > 0 && W >= Number(three.widthKBMm)) || (Number(three.frontWeightKg) > 0 && weightKg >= Number(three.frontWeightKg))) count = Math.max(count, 3);
    if ((Number(four.widthKBMm) > 0 && W >= Number(four.widthKBMm)) || (Number(four.frontWeightKg) > 0 && weightKg >= Number(four.frontWeightKg))) count = Math.max(count, 4);
    hfHinges = {
      count,
      setArticle: sys.hinges?.upperFrontToTopPanel?.sets?.insertaEDowel?.article ?? null,
      centreArticle: sys.hinges?.centreHinge?.articles?.expando?.article ?? null,
      cupDiameterMm: Number(sys.hinges?.upperFrontToTopPanel?.cup?.diameterMm) || 35,
      // Both patterns are null in the file (TB, cup depth, counterpart): no cup.
      cupPattern: null,
    };
  }

  // ── the motion the scene draws ─────────────────────────────────────────────
  const angleDeg = system === 'hk'
    ? (Number(sys?.animation?.openDeg?.full) || Number(sys?.openingAngleDeg?.value?.[1]) || null)
    : system === 'hf'
      ? (Number(sys?.animation?.upperLeafOpenDeg?.full) || Number(sys?.openingAngleDeg?.value?.[1]) || null)
      : null;
  const travel = system === 'hs' || system === 'hl' ? travelOf(sys) : null;
  const foldDeg = system === 'hf' ? (Number(sys?.animation?.foldAngleDeg?.value) || null) : null;
  const lift = {
    system,
    label,
    motion: LIFT_MOTIONS[system] || null,
    angleDeg,
    travel,
    halves,
    ...(system === 'hf' ? { foldDeg } : {}),
    // The path the scene has to invent: said on the piece so the walk and the
    // Check can say "placeholder" in words rather than draw a catalogue.
    placeholderPath: (system === 'hs' || system === 'hl') ? !travel : (system === 'hf' ? foldDeg == null : false),
    riseMm: liftRiseMm({
      system, angleDeg, travel, halves,
    }, { heightMm: leafH, thicknessMm: leafT }),
    article: set,
    ...(refused ? { refused: 'LIFT_NO_UNIT' } : {}),
  };

  // ── the sentences ──────────────────────────────────────────────────────────
  if (refused) warn('LIFT_NO_UNIT', refused);
  for (const l of limits) warn('LIFT_CABINET', l);
  // The fixing pattern: null for all four systems on 11.10.2026, so the arms
  // bore NOTHING, and the unit says so. The day the owner reads the page and
  // the value becomes a list of holes with its page, the engine bores the
  // sides at it (LISP first: KIT_WUD_AVENTOS.lsp), and this sentence goes.
  const pattern = sys?.fixingLiftMechanism?.holePositions?.value
    ?? sys?.fixingLiftMechanism?.preMountedSystemScrews?.holePositions?.value
    ?? null;
  if (!pattern) {
    const where = system === 'hf' ? 'the H / X / Y table has no datum (drillingPositionsLiftMechanism.datum null)' : `fixingLiftMechanism.holePositions is null`;
    warn('LIFT_NO_PATTERN',
      `${label}: a line and a body, zero holes. The lift mechanism's fixing pattern is not in reference/hardware/aventos.json (t78_f18.systems.${system}: ${where}; `
      + `the front fixing bracket's holes on the leaf are marked with the ZML.2200 template); the leaf carries no hinge cups${system === 'hf' ? ' (the HF hinges\' cup pattern is null too)' : ''}. Owner to read the catalogue page.`,
      'info');
  }
  if (board.kgM2 == null) {
    warn('LIFT_NO_WEIGHT', `${label}: the profile has no board weight for a ${fmt(leafT, 0)} mm front, so the front's weight and the power factor are unknown.`);
  } else if (!board.exact) {
    warn('LIFT_WEIGHT_NEAREST', `${label}: the front's weight is taken at the nearest stocked board (${board.kgM2} kg/m2, ${kind}); assign a board to say its own.`, 'info');
  }

  // ── the order lines ────────────────────────────────────────────────────────
  const sizeWords = `${fmt(W, 0)} x ${fmt(H, 0)} mm cabinet, ${fmt(leafW, 0)} x ${fmt(leafH, 0)} x ${fmt(leafT, 0)} front`;
  const weightWords = weightKg != null ? `${fmt(weightKg)} kg` : 'weight unknown';
  const lines = {
    unit: {
      label: `${label} lift mechanism set`,
      qty: 1,
      unit: 'pcs',
      spec: {
        system,
        article: set,
        ...(unit ? { power_unit: unit } : {}),
        ...(pf != null ? { power_factor: roundTo(pf, 1) } : {}),
        front_weight_kg: weightKg != null ? roundTo(weightKg, 2) : null,
        cabinet_height_mm: roundTo(H, 1),
        cabinet_width_mm: roundTo(W, 1),
        inner_depth_mm: roundTo(LT, 1),
        mechanisms: 2,
        ...(refused ? { refused: 'LIFT_NO_UNIT' } : {}),
        status: 'owner to confirm',
      },
      specLabel: set
        ? `${label} ${set} (2 mechanisms) · ${sizeWords} · ${weightWords}${pf != null ? ` · LF ${fmt(pf, 0)}` : ''}`
        : `${label}: no set covers this front (refused) · ${sizeWords} · ${weightWords}${pf != null ? ` · LF ${fmt(pf, 0)}` : ''}`,
    },
    arm: system === 'hk' ? null : {
      label: `${label} lever arm set`,
      qty: 1,
      unit: 'pcs',
      spec: { system, article: arm, cabinet_height_mm: roundTo(H, 1), status: 'owner to confirm' },
      specLabel: arm ? `${label} lever arm set ${arm} · KH ${fmt(H, 0)}` : `${label} lever arm set: none covers KH ${fmt(H, 0)}`,
    },
    caps: {
      label: `${label} cover cap set`,
      qty: 1,
      unit: 'pcs',
      spec: { system, article: capsArticle, status: 'owner to confirm' },
      specLabel: capsArticle ? `${label} cover cap set ${capsArticle}` : `${label} cover cap set`,
    },
    bracket: {
      label: 'AVENTOS front fixing bracket set',
      qty: 1,
      unit: 'pcs',
      spec: {
        system, article: bracketArticle, per_set: 2, holes_on_leaf: null, template: shared.frontFixingBrackets?.markingTemplate?.article ?? null, status: 'owner to confirm',
      },
      specLabel: `Front fixing bracket set${bracketArticle ? ` ${bracketArticle}` : ''} (2 pcs, wooden fronts) · holes marked with ${shared.frontFixingBrackets?.markingTemplate?.article || 'the template'}, not bored`,
    },
    hinges: hfHinges ? {
      label: 'AVENTOS HF top hinge set (CLIP top 120 unsprung + centre hinge)',
      qty: hfHinges.count,
      unit: 'pcs',
      spec: {
        system, article: hfHinges.setArticle, centre_article: hfHinges.centreArticle, cup_diameter_mm: hfHinges.cupDiameterMm, cup_pattern: null, status: 'owner to confirm',
      },
      specLabel: `${hfHinges.count} per leaf pair · ${hfHinges.setArticle || 'set'} · centre ${hfHinges.centreArticle || '?'} · cup ${hfHinges.cupDiameterMm}, pattern not read: zero holes`,
    } : null,
  };

  // ── the bodies: the two lift mechanisms, one per side, inside the carcass ──
  // Placeholders (CLAUDE.md T78 law: a line and a body). Each stands on its
  // side's inner face at the top front of the box, the size of a mechanism
  // housing; `profile.lifts.placeholder` may say the dimensions
  // (// T78 proposed), else these.
  const G = Number(cabinet.boardMm) || 0;
  const D = Number(cabinet.depthMm) || 0;
  const PH = profile?.lifts?.placeholder || {};
  const innerH = Math.max(0, H - 2 * G);
  const armW = Number(PH.armWidthMm) > 0 ? Number(PH.armWidthMm) : 22;
  const armH = Math.max(40, Math.min(Number(PH.armHeightMm) > 0 ? Number(PH.armHeightMm) : 140, innerH * 0.4));
  const armD = Math.max(60, Math.min(Number(PH.armDepthMm) > 0 ? Number(PH.armDepthMm) : 220, Math.max(0, LT) * 0.6));
  const bodies = ['L', 'R'].map((side) => ({
    id: `lift-${side}`,
    kind: 'lift_arm',
    label: `${label} lift mechanism (${side === 'L' ? 'left' : 'right'}), placeholder`,
    placeholder: true,
    side,
    system,
    article: set,
    box: {
      x: roundTo(side === 'L' ? G : W - G - armW, 4),
      y: roundTo(Math.max(G, H - G - armH), 4),
      z: roundTo(Math.max(G, D - G - armD), 4),
      w: roundTo(armW, 4),
      h: roundTo(armH, 4),
      d: roundTo(armD, 4),
    },
  }));

  const derived = {
    system,
    label,
    motion: LIFT_MOTIONS[system] || null,
    article: set,
    arm_article: arm,
    caps_article: capsArticle,
    bracket_article: bracketArticle,
    ...(hfHinges ? { hinge_set_article: hfHinges.setArticle, hinges: hfHinges.count } : {}),
    power_unit: unit,
    power_factor: pf != null ? roundTo(pf, 1) : null,
    front_weight_kg: weightKg != null ? roundTo(weightKg, 2) : null,
    angle_deg: angleDeg,
    rise_mm: lift.riseMm,
    halves,
    placeholder_path: lift.placeholderPath,
    holes: 0,
    refused: Boolean(refused),
    said: [
      set ? `${label} ${set}${arm ? ` + ${arm}` : ''}${unit ? ` (power unit ${unit})` : ''}` : (refused || `${label}: no set`),
      weightKg != null ? `front ${fmt(weightKg)} kg${pf != null ? `, LF ${fmt(pf, 0)}` : ''}` : null,
      'zero holes: the fixing pattern is not in the catalogue file (owner to confirm)',
    ].filter(Boolean).join(' · '),
  };

  return {
    lift, lines, bodies, warnings, derived, halves, weightKg, pf,
  };
}
