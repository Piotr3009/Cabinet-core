// ─── CHOOSING A LIFT (turn 19, CLAUDE.md F5) ────────────────────────────────
//
// Turn 20 builds the AVENTOS HK and HF wall-cabinet KITS, after a pattern
// session with the owner. This turn lays the MATHS under them, so that when the
// kits arrive they only consume it and there is nothing left to argue about:
//
//   • what a square metre of board weighs, and therefore what a front weighs;
//   • the POWER FACTOR — the cabinet's height times that weight — and which
//     power unit's range holds it;
//   • the limits the HK has on the cabinet it is fitted to;
//   • and what happens when a client assigns a unit the maths did not propose.
//
// The owner's rule for that last one, verbatim: "silnik proponuje, klient
// assign, ale guidance i sprzeciw." The engine PROPOSES, the client ASSIGNS, and
// the engine keeps the right to object — a warning with guidance, never a
// refusal. A workshop that has fitted a hundred of these knows something the
// table does not; a workshop that has fitted none needs to be told the front is
// too heavy for the unit it just picked.
//
// ─── THE NUMBERS ARE THE CATALOGUE'S (CLAUDE.md F5.2) ───────────────────────
//
// "ranges READ from the json, not retyped." `reference/hardware/aventos.json`
// is the CATALOGUE OF RECORD and the four pf ranges live there and nowhere
// else. The engine is HANDED it (lib/hardwareCatalogue.js) exactly as it is
// handed the hinges and the runners, and it never fetches.
//
// The board weights are the one thing that lives in both places, and on purpose:
// profile.js carries them because a workshop tunes its own boards (rule 2) and
// aventos.json carries them because they came with the lift data.
// test/turn19-lifts.test.js holds the two tables to each other, so they cannot
// drift apart in silence.
//
// NO KIT AND NO UI (F5.4) — beyond a front's weight in the element detail
// footer. The kits are turn 20.
//
// Pure functions — no React, no store, no fetch.

/** The parsed AVENTOS catalogue, once somebody has read it. `null` until then. */
let CATALOGUE = null;

/** Hand the engine `reference/hardware/aventos.json`. */
export function setAventosCatalogue(raw) {
  CATALOGUE = parseAventosCatalogue(raw);
  return CATALOGUE;
}

/** What the engine currently knows, or null. */
export function aventosCatalogue() {
  return CATALOGUE;
}

/** Forget it — for tests. */
export function clearAventosCatalogue() {
  CATALOGUE = null;
}

/**
 * Normalise the file into { powerUnits, limits, boardKgM2 }.
 *
 * A unit whose range is not two ascending numbers is DROPPED: a range nobody
 * can read is not a range, and proposing a lift off one is how a door ends up
 * on a spring that cannot hold it.
 */
export function parseAventosCatalogue(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const rows = Array.isArray(raw.power_units_hk_top) ? raw.power_units_hk_top : null;
  if (!rows) return null;

  const powerUnits = [];
  for (const row of rows) {
    const unit = Number(row?.unit);
    const lo = Number(row?.pf?.[0]);
    const hi = Number(row?.pf?.[1]);
    if (!(unit > 0) || !(lo > 0) || !(hi > lo)) continue;
    powerUnits.push({
      unit,
      pf: [lo, hi],
      articles: (row?.articles || []).map((a) => String(a)),
    });
  }
  if (!powerUnits.length) return null;
  // Ascending by the bottom of the range, so "the SMALLER unit wins an overlap"
  // (F5.2) is the first match in this list and not a second sort somewhere else.
  powerUnits.sort((a, b) => a.pf[0] - b.pf[0] || a.unit - b.unit);

  const hk = raw.rules?.hk_limits || {};
  const height = Array.isArray(hk.cabinet_height_mm) ? hk.cabinet_height_mm.map(Number) : [];
  return {
    powerUnits,
    limits: {
      heightMm: height.length === 2 && height[1] > height[0] ? height : null,
      widthMaxMm: Number(hk.cabinet_width_max_mm) > 0 ? Number(hk.cabinet_width_max_mm) : null,
      innerDepthMinMm: Number(hk.inner_depth_min_mm) > 0 ? Number(hk.inner_depth_min_mm) : null,
    },
    boardKgM2: raw.board_kg_m2 && typeof raw.board_kg_m2 === 'object' ? raw.board_kg_m2 : null,
  };
}

/**
 * WHAT A SQUARE METRE OF THIS BOARD WEIGHS (CLAUDE.md F5.1).
 *
 * "The material store carries the column (as thickness is carried); assigned
 * board wins, profile fallback otherwise." So: the stock record's own `kg_m2`
 * where a board has been assigned and somebody has filled it in, and the
 * workshop's table otherwise.
 *
 * The fallback is looked up on the EXACT thickness first and on the nearest one
 * in the table after that — an 18, a 22 and a 25 are the three boards this shop
 * buys, and a 19 mm melamine front is nearer the 18 than it is to nothing at
 * all. A guess is worse than a fallback only when it is silent, and the caller
 * is told which of the two it got.
 *
 * @param {object} args
 *   stock      the assigned material record, or null
 *   thickness  mm — the piece's own, which is what it is actually cut at
 *   kind       'mfc' | 'mdf_lacquered'
 *   profile
 * @returns {{kgM2:number|null, source:'stock'|'profile'|null, exact:boolean}}
 */
export function boardKgM2({
  stock = null, thickness = null, kind = null, profile,
}) {
  const own = Number(stock?.kg_m2);
  if (own > 0) return { kgM2: own, source: 'stock', exact: true };

  const table = profile?.board?.kgM2 || {};
  const family = table[kind || profile?.board?.defaultKgM2Kind || 'mfc'] || null;
  if (!family) return { kgM2: null, source: null, exact: false };

  const t = Number(thickness);
  if (!(t > 0)) return { kgM2: null, source: null, exact: false };
  const exact = family[String(t)] ?? family[t];
  if (Number(exact) > 0) return { kgM2: Number(exact), source: 'profile', exact: true };

  // The nearest board the shop stocks. Ties go to the THICKER one, which is the
  // heavier — a lift proposed on a weight that is too low is the failure that
  // drops a door on somebody.
  const steps = Object.keys(family).map(Number).filter((n) => n > 0).sort((a, b) => a - b);
  if (!steps.length) return { kgM2: null, source: null, exact: false };
  let best = steps[0];
  for (const step of steps) {
    const d = Math.abs(step - t);
    const bd = Math.abs(best - t);
    if (d < bd || (d === bd && step > best)) best = step;
  }
  return { kgM2: Number(family[String(best)] ?? family[best]), source: 'profile', exact: false };
}

/**
 * A front's WEIGHT, in kilogrammes (CLAUDE.md F5.1: "area × kg_m2").
 *
 * Millimetres in, kilogrammes out — the conversion is here rather than in the
 * caller so that a panel's own `w`/`h` can be handed straight over.
 */
export function frontWeightKg({ widthMm, heightMm, kgM2 }) {
  const w = Number(widthMm);
  const h = Number(heightMm);
  const k = Number(kgM2);
  if (!(w > 0) || !(h > 0) || !(k > 0)) return null;
  return (w / 1000) * (h / 1000) * k;
}

/**
 * THE POWER FACTOR (CLAUDE.md F5.2).
 *
 * `pf = cabinet_height_mm × front_weight_kg`, which is Blum's own formula and
 * is the number their whole HK table is indexed on. The catalogue records that
 * the weight is "incl. handles" — a handle a client has not chosen yet is not a
 * weight this app can add, and BLOCKERS says so.
 */
export function powerFactor({ cabinetHeightMm, frontWeightKg: weight }) {
  const h = Number(cabinetHeightMm);
  const w = Number(weight);
  if (!(h > 0) || !(w > 0)) return null;
  return h * w;
}

/**
 * WHICH POWER UNIT THIS FRONT NEEDS — and what to say about the one that was
 * asked for instead (CLAUDE.md F5.2/F5.3).
 *
 * @param {object} args
 *   cabinetHeightMm  the cabinet, not the front — Blum's table is on the box
 *   frontWeightKg
 *   cabinetWidthMm   optional, for the HK width limit
 *   innerDepthMm     optional, for the HK depth limit
 *   assigned         a unit number the client picked (2300 | 2500 | …), or null
 * @returns {{unit:number|null, proposed:number|null, pf:number|null,
 *            assigned:number|null, articles:string[], warnings:Array}}
 *
 *   `proposed` is what the maths says; `unit` is what will actually be fitted,
 *   which is the assignment where there is one. An assignment is NEVER refused
 *   — that is the owner's rule — it is warned about.
 */
export function selectLiftUnit({
  cabinetHeightMm = null, frontWeightKg: weight = null, cabinetWidthMm = null,
  innerDepthMm = null, assigned = null,
} = {}) {
  const warnings = [];
  const warn = (code, message) => warnings.push({ code, message });
  const cat = CATALOGUE;

  if (!cat) {
    warn('NO_CATALOGUE', 'The AVENTOS catalogue has not been read — no lift can be proposed.');
    return {
      unit: null, proposed: null, pf: null, assigned: null, articles: [], warnings,
    };
  }

  const pf = powerFactor({ cabinetHeightMm, frontWeightKg: weight });
  const asked = Number(assigned) > 0
    ? cat.powerUnits.find((u) => u.unit === Number(assigned)) || null
    : null;
  if (assigned != null && Number(assigned) > 0 && !asked) {
    warn('UNKNOWN_UNIT', `${assigned} is not a power unit in the catalogue.`);
  }

  // ── the cabinet itself ────────────────────────────────────────────────────
  // These are limits on the BOX, not on the pf, so they are checked whatever
  // the weight turns out to be: a 700 mm high wall unit cannot take an HK at
  // any front weight, and saying so early is more use than a unit number.
  const L = cat.limits;
  const h = Number(cabinetHeightMm);
  if (L.heightMm && h > 0 && (h < L.heightMm[0] || h > L.heightMm[1])) {
    warn('HK_HEIGHT', `An AVENTOS HK fits a cabinet ${L.heightMm[0]}–${L.heightMm[1]} mm high; this one is ${round1(h)} mm.`);
  }
  const w = Number(cabinetWidthMm);
  if (L.widthMaxMm && w > 0 && w > L.widthMaxMm) {
    warn('HK_WIDTH', `An AVENTOS HK fits a cabinet up to ${L.widthMaxMm} mm wide; this one is ${round1(w)} mm.`);
  }
  const d = Number(innerDepthMm);
  if (L.innerDepthMinMm && d > 0 && d < L.innerDepthMinMm) {
    warn('HK_DEPTH', `An AVENTOS HK needs at least ${L.innerDepthMinMm} mm inner depth; this cabinet has ${round1(d)} mm.`);
  }

  if (pf == null) {
    warn('NO_POWER_FACTOR', 'Without a cabinet height and a front weight there is no power factor to choose on.');
    return {
      unit: asked?.unit ?? null,
      proposed: null,
      pf: null,
      assigned: asked?.unit ?? null,
      articles: asked ? [...asked.articles] : [],
      warnings,
    };
  }

  // ── the proposal ──────────────────────────────────────────────────────────
  // "Overlaps resolve to the SMALLER unit." The list is sorted by the bottom of
  // the range, so the first unit whose range holds the pf IS the smaller one —
  // the rule is the order, not a comparison written out twice.
  const fits = cat.powerUnits.filter((u) => pf >= u.pf[0] && pf <= u.pf[1]);
  const proposed = fits[0] || null;

  if (!proposed) {
    const smallest = cat.powerUnits[0];
    const biggest = cat.powerUnits[cat.powerUnits.length - 1];
    if (pf < smallest.pf[0]) {
      warn('PF_BELOW_RANGE', `Power factor ${round1(pf)} is under the ${smallest.unit} unit's ${smallest.pf[0]} — the front is too light for an AVENTOS HK. A stay or a plain hinge is the fitting for this door.`);
    } else {
      warn('PF_ABOVE_RANGE', `Power factor ${round1(pf)} is over the ${biggest.unit} unit's ${biggest.pf[1]} — no HK power unit carries this front. Lighter board, a shorter cabinet or two narrower doors.`);
    }
  }

  // ── the client's own answer ───────────────────────────────────────────────
  if (asked && (pf < asked.pf[0] || pf > asked.pf[1])) {
    const guidance = proposed
      ? `${proposed.unit} fits`
      : 'nothing in the catalogue fits this power factor';
    warn(
      pf > asked.pf[1] ? 'ASSIGNED_TOO_SMALL' : 'ASSIGNED_TOO_LARGE',
      pf > asked.pf[1]
        ? `Front too heavy for ${asked.unit} — ${guidance}.`
        : `Front too light for ${asked.unit} — ${guidance}.`,
    );
  }

  return {
    unit: asked?.unit ?? proposed?.unit ?? null,
    proposed: proposed?.unit ?? null,
    pf,
    assigned: asked?.unit ?? null,
    articles: (asked || proposed)?.articles ? [...(asked || proposed).articles] : [],
    warnings,
  };
}

/** One decimal is as far as a power factor is ever worth reading. */
function round1(n) {
  return Math.round(Number(n) * 10) / 10;
}
