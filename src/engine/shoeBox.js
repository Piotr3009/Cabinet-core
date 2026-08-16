// ─── THE SHOE BOX (turn 34, CLAUDE.md F4) ───────────────────────────────────
//
// The owner retired the T33 pinned 15° shelf in one sentence, 16.08.2026:
// *"jeżeli nie jest szuflada to powinien być fix, nie z pinami — tu jest
// błąd"*. What replaces it he designed line by line in chat the same day, and
// the record of it is `reference/lisp/KIT_SHOE_BOX.lsp` — its own kit, the
// house pattern, delivered with the spec.
//
// ─── THE LISP IS LAW (iron rule 3) ─────────────────────────────────────────
//
// Every constant below is `SHOE_*` from the kit's constants block A and every
// formula is the kit's section B. This file MATCHES it; it does not interpret
// it. Where the spec prose and the kit disagreed, the kit won and the
// disagreement rides the PR body.
//
//   SHOE_WALL_H     80    sides, back and box front height
//   SHOE_FRONT_H   120    decorative front, BOTH variants
//   SHOE_DIV_H      50    divider height
//   SHOE_RUNNER_W   13    side runner thickness, per side
//   SHOE_GROOVE_D    6    groove depth in EVERY wall
//   SHOE_GROOVE_PLAY 0.2  groove width = bottom G + this
//   SHOE_ANGLE_MAX  10°   the ceiling, never exceeded
//   SHOE_PILOT_D     3    FIX: through-pilot in the carcass side
//   SHOE_PILOT_N     3    FIX: pilots per side, in a row
//   SHOE_PILOT_END  50    FIX: first/last pilot from the box ends
//   SHOE_RUNFIX_D    5    DRAWER: runner fixing hole (euro)
//   SHOE_FIX_AXIS   40    pilot/runner axis above the box floor
//   SHOE_SETBACK_X   3    runner face = frontT + this, from the carcass front
//   SHOE_INFILL     30    per hinged side, behind doors (dpSideLaw)
//
// ONE construction, TWO mounting laws — his plan: *"jak zrobimy szufladę to tę
// samą skrzyneczkę wykorzystamy, tylko dodamy prowadnice po bokach i zwęzimy —
// całość pozostanie bez zmian, będzie prościej"*.
//
// Pure functions and pure data: no React, no store, no three.js. The cabinet
// builder asks here for millimetres and cuts what it is told.
//
// ─── AND IT READS THE ONE BEHIND-DOOR LAW (T33-F6) ─────────────────────────
// WHICH sides are hinged is not decided here and never will be: `cabinet.js`
// owns exactly one `dpSideLaw` object — `{ left, right }`, the law the
// full-width drawer zone and every column already read — and it is handed in
// as `hingedLeft` / `hingedRight`. One law, another reader, zero divergence.
// HOW MUCH each hinged side costs is the kit's own SHOE_INFILL = 30.

/** The kit's constants block A, off the profile (owner-tunable, one place). */
export function shoeConst(profile) {
  const s = profile?.wardrobeAccessories?.shoeBox || {};
  const n = (v, fallback) => (Number.isFinite(Number(v)) ? Number(v) : fallback);
  return Object.freeze({
    wallH: n(s.wallH, 80),
    frontH: n(s.frontH, 120),
    dividerH: n(s.dividerH, 50),
    runnerW: n(s.runnerW, 13),
    grooveDepth: n(s.grooveDepth, 6),
    groovePlay: n(s.groovePlay, 0.2),
    angleMaxDeg: n(s.angleMaxDeg, 10),
    pilotD: n(s.pilotD, 3),
    pilotN: n(s.pilotN, 3),
    pilotEnd: n(s.pilotEnd, 50),
    runnerFixD: n(s.runnerFixD, 5),
    fixAxis: n(s.fixAxis, 40),
    setbackX: n(s.setbackX, 3),
    infill: n(s.infill, 30),
    runnerFrontFix: n(s.runnerFrontFix, 37),
    layers: Object.freeze({
      groove: s.layers?.groove || 'SHOE_GROOVE_6MM',
      runner: s.layers?.runner || 'SHOE_RUNNER_5MM',
      // Reused, never renamed: the FIX pilots are ordinary ⌀3 screw holes.
      screw: s.layers?.screw || 'SCREWS_3MM',
    }),
  });
}

/**
 * `SHOE_RUNNER_MAP` — the rear fixing's system column per NL.
 *
 * The owner's own sheet, 16.08.2026 (Hafele-type pattern). The FIRST fixing is
 * always 37 from the runner front face; this is where the SECOND one goes. An
 * NL that is not a key here drills NOTHING and says so — the kit's own refusal
 * grammar, and the reason this is a table and not a formula.
 */
export function shoeRunnerMap(profile) {
  const map = profile?.wardrobeAccessories?.shoeBox?.drillMap;
  const rows = map && typeof map === 'object' ? map : {
    150: 77.2,
    200: 128,
    250: 128,
    300: 224,
    350: 224,
    400: 320,
    450: 352,
    500: 416,
    550: 448,
    600: 480,
    650: 544,
    700: 544,
  };
  const out = new Map();
  for (const [k, v] of Object.entries(rows)) {
    const nl = Number(k);
    const col = Number(v);
    if (nl > 0 && col > 0) out.set(nl, col);
  }
  return out;
}

/** The NLs the sheet knows, ascending — the side runner's own ladder. */
export function shoeRunnerLadder(profile) {
  return [...shoeRunnerMap(profile).keys()].sort((a, b) => a - b);
}

/**
 * Which NL a box of this depth is fitted with: the largest rung not above it.
 *
 * The LISP asks the joiner ("Runner NL from the ladder [150..700 step 50]");
 * the app answers with the same grammar every other ladder in this codebase
 * uses, and an explicit choice on the item overrides it.
 */
export function shoeRunnerNl(depth, profile, asked = null) {
  const explicit = Number(asked);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  const d = Number(depth);
  if (!(d > 0)) return null;
  let best = null;
  for (const rung of shoeRunnerLadder(profile)) if (rung <= d) best = rung;
  return best;
}

const rad = (deg) => (deg * Math.PI) / 180;
const r2 = (v) => Math.round(Number(v) * 100) / 100;
const r4 = (v) => Math.round(Number(v) * 10000) / 10000;

/**
 * `shoeRearEdge` — the slope's rear-edge height, section B of the kit.
 *
 *     rearEdge = min(SHOE_WALL_H, run × tan(SHOE_ANGLE_MAX))
 *
 * `run` is the CLEAR inner depth, between the inner faces of the box front and
 * the back. Deep box ⇒ the rear edge pins at 80 and the angle comes out under
 * 10° by construction (600 ⇒ ≈7.6°); shallow box ⇒ exactly 10°. One board, one
 * formula, no second flat panel — the owner delegated the variant
 * (*"co łatwiej obliczać? dla mnie bez różnicy"*) and this is the single-formula
 * law he was offered.
 */
export function shoeRearEdge(run, profile, G = 18) {
  const C = shoeConst(profile);
  const r = Number(run);
  if (!(r > 0)) return 0;
  // ─── LAW v2, CHAT-FIX 16.08 (owner): "dno ma za duży skos, wychodzi poza
  // obręb boxa" ─────────────────────────────────────────────────────────────
  // v1 capped the UNDERSIDE at the wall top, so the board's own thickness
  // (and the groove) broke out above the side at the rear. The cap now
  // subtracts the board standing perpendicular on the slope: the WHOLE
  // bottom — thickness, groove and play included — finishes inside the box.
  const first = Math.min(C.wallH, r * Math.tan(rad(C.angleMaxDeg)));
  const board = (Number(G) > 0 ? Number(G) : 18) + C.groovePlay;
  // The cap depends on the angle and the angle on the cap — three passes of
  // the fixed point settle it to well under a hundredth of a millimetre.
  let rear = first;
  for (let i = 0; i < 3; i += 1) {
    const cap = Math.max(0, C.wallH - board * Math.cos(Math.atan2(rear, r)));
    rear = Math.min(first, cap);
  }
  return rear;
}

/** The DERIVED angle, in degrees. Informational — the geometry above is law. */
export function shoeAngleDeg(run, rear) {
  const r = Number(run);
  if (!(r > 0)) return 0;
  return (Math.atan(Number(rear) / r) * 180) / Math.PI;
}

/**
 * The WIDTH law, both variants.
 *
 *   FIX    → the bay's clear opening, whole.
 *   DRAWER → the opening less 2 × 13 mm of side runner, less 30 mm of infill
 *            per HINGED side — read from the ONE `dpSideLaw` object (T33-F6),
 *            so the shoe box and the drawer stack cannot drift apart.
 */
export function shoeBoxWidth({
  openingW, variant, hingedLeft = false, hingedRight = false, profile,
}) {
  const C = shoeConst(profile);
  const w = Number(openingW) || 0;
  if (variant !== 'D') return r2(w);
  const hinged = (hingedLeft ? 1 : 0) + (hingedRight ? 1 : 0);
  return r2(w - 2 * C.runnerW - C.infill * hinged);
}

/**
 * THE WHOLE BOX, as millimetres — the kit's main command, without the prompts.
 *
 * @param {object} args
 *   openingW    the bay's clear opening width
 *   depth       the box depth (front face to back face)
 *   boardT      G — the PROJECT CARCASS BOARD, which every box part is cut from
 *   frontT      the project's front thickness (the runner setback reads it)
 *   variant     'F' (fix, screwed) | 'D' (drawer, side runners)
 *   dividers    0 or 1 — "2 nie mają sensu"
 *   posZ        height from the BAY FLOOR, in mm
 *   hingedLeft/hingedRight   is there a hinged door on that side
 *   runnerNl    an explicit NL, or null to snap the depth to the sheet
 * @returns the plan: sizes, the slope, the panels and the carcass-side drills
 */
export function shoeBoxPlan({
  openingW, depth, boardT, frontT = 18, variant = 'F', dividers = 1,
  posZ = 0, hingedLeft = false, hingedRight = false, runnerNl = null, profile,
}) {
  const C = shoeConst(profile);
  const G = Number(boardT) > 0 ? Number(boardT) : 18;
  const d = Number(depth) > 0 ? Number(depth) : 0;
  const v = variant === 'D' ? 'D' : 'F';
  const nDiv = Number(dividers) >= 1 ? 1 : 0;

  const boxW = shoeBoxWidth({
    openingW, variant: v, hingedLeft, hingedRight, profile,
  });
  const innerW = r2(boxW - 2 * G);

  // ── the slope law ──
  const run = r2(d - 2 * G);
  const rear = r2(shoeRearEdge(run, profile, G));
  const angleDeg = r2(shoeAngleDeg(run, rear));
  const slopeLen = r2(Math.sqrt(run * run + rear * rear));
  const grooveW = r2(G + C.groovePlay);

  // ── the panels, exactly the kit's D section ──
  const panels = [];
  const warnings = [];
  const ok = boxW > 2 * G && innerW > 0 && run > 0;
  if (!ok) {
    warnings.push({
      code: 'SHOE_BOX_TOO_SMALL',
      message: `A shoe box needs more than ${2 * G} mm of opening and depth — `
        + `this bay offers ${r2(openingW)} × ${r2(depth)} mm.`,
    });
  }

  if (ok) {
    // SIDE panels: X = depth (front edge at x0), Y = height. The groove is a
    // PARALLELOGRAM whose lower edge runs (G, 0) → (depth − G, rear) and whose
    // width (G + play) is taken PERPENDICULAR to the slope.
    //
    // ─── A DIVERGENCE, NAMED (iron rule 3) ─────────────────────────────────
    // The kit's own `drawSHOE_SIDE` draws this parallelogram on a board only
    // SHOE_WALL_H (80) high, and its UPPER edge climbs past that whenever the
    // rear edge is over about 62 — which every box deeper than ~370 is, and
    // the kit's own default 450 certainly is (rear 77.41, upper corner 95.33).
    // So the groove breaks out through the TOP edge of the side at the rear.
    //
    // The engine MATCHES the kit and does not interpret it: these are the
    // kit's four points, verbatim. Physically it reads correctly — the sloped
    // bottom's rear corner finishes flush with the top of the side wall — and
    // it is the same shape the drawer box's own side pockets already have,
    // which deliberately overshoot the board so the cutter runs off the edge
    // (`B.pocketOvershoot`, turn 17). The disagreement is reported in the PR
    // body rather than silently clipped, because clipping would be a decision
    // this file has no authority to make.
    const a = Math.atan2(rear, run);
    const nx = r4(grooveW * -Math.sin(a));
    const ny = r4(grooveW * Math.cos(a));
    const p1 = [r4(G), 0];
    const p2 = [r4(d - G), r4(rear)];
    for (const side of ['L', 'R']) {
      panels.push({
        role: 'side',
        side,
        w: r2(d),
        h: C.wallH,
        thickness: G,
        grain: 'w',
        pockets: [{
          layer: C.layers.groove,
          depth: C.grooveDepth,
          pts: [p1, p2, [r4(p2[0] + nx), r4(p2[1] + ny)], [r4(p1[0] + nx), r4(p1[1] + ny)]],
        }],
      });
    }

    // BACK: horizontal groove band at the rear-edge height.
    panels.push({
      role: 'back',
      w: innerW,
      h: C.wallH,
      thickness: G,
      grain: 'w',
      pockets: [{
        layer: C.layers.groove,
        depth: C.grooveDepth,
        x1: 0,
        y1: r4(rear),
        x2: innerW,
        y2: r4(rear + grooveW),
      }],
    });

    // BOX FRONT: horizontal groove band at the box floor (y = 0).
    panels.push({
      role: 'boxFront',
      w: innerW,
      h: C.wallH,
      thickness: G,
      grain: 'w',
      pockets: [{
        layer: C.layers.groove,
        depth: C.grooveDepth,
        x1: 0,
        y1: 0,
        x2: innerW,
        y2: r4(grooveW),
      }],
    });

    // BOTTOM: engages 6 mm into every wall, so the CUT is inner + 12 both ways.
    // GRAIN ACROSS — *"pamiętaj, żeby dno były słoje w poprzek"* — which is
    // along the WIDTH, and the piece SAYS SO (`grain: 'w'`) so nesting keeps it.
    panels.push({
      role: 'bottom',
      w: r2(innerW + 2 * C.grooveDepth),
      h: r2(slopeLen + 2 * C.grooveDepth),
      thickness: G,
      grain: 'w',
      pockets: [],
    });

    // DIVIDER: 0 or 1, ACROSS the width, standing on the slope at mid-run.
    if (nDiv === 1) {
      panels.push({
        role: 'divider',
        w: innerW,
        h: C.dividerH,
        thickness: G,
        grain: 'w',
        pockets: [],
        // Where it stands: mid-run, on the slope. The cut is the plain
        // rectangle (the kit scribes the edges on site).
        seat: { atRunMm: r2(run / 2), heightMm: r2((rear * (run / 2)) / (run || 1)) },
      });
    }

    // ─── CHAT-FIX 16.08 (owner): THE INFILL IS A BOARD, NOT AN ABSENCE ────
    // "jak wstawiamy szufladę shoe, to nie zapomnij dodać ten [infill] 30 mm,
    // czyli boczną ściankę, bo zawiasy". Narrowing the box left 30 mm of AIR
    // — but the runner has to screw into SOMETHING. Per hinged side one
    // vertical board goes in: depth of the box, height of the front (120),
    // its INNER face 30 from the carcass side (the wardrobe's own dpSideLaw
    // number), so the runner mounts on it and the door's arc still clears
    // the 30 − G behind it. BOM part SHOE-INFILL; the runner drilling for a
    // hinged side goes into THIS board, not the carcass.
    if (v === 'D') {
      for (const side of [hingedLeft ? 'L' : null, hingedRight ? 'R' : null]) {
        if (!side) continue;
        panels.push({
          role: 'infill',
          side,
          w: r2(d),
          h: C.frontH,
          thickness: G,
          grain: 'w',
          pockets: [],
          // Where it stands: inner face at C.infill from the carcass side.
          seat: { innerFaceAtMm: C.infill },
        });
      }
    }

    // FRONT, on BOTH variants — his 16.08 change: *"jak będzie fix to też
    // będzie front, ale nie ze spray tylko z materiału carcasowego"*.
    panels.push({
      role: 'front',
      w: v === 'F' ? r2(openingW) : boxW,
      h: C.frontH,
      thickness: v === 'F' ? G : Number(frontT) || G,
      grain: 'w',
      pockets: [],
      // The MATERIAL law, in one word each: the FIX front is carcass board
      // (it covers the cut edges of a box made of carcass board), the DRAWER
      // front is a front like every other front and rides the clearance matrix.
      family: v === 'F' ? 'carcass' : 'fronts',
    });
  }

  // ── the carcass-side drilling, the kit's E section ──
  // Local x = distance from the CARCASS FRONT EDGE; local y = height above the
  // BAY FLOOR. `posZ` shifts the whole row.
  const axis = r2(Number(posZ) + C.fixAxis);
  const boxFrontX = r2((Number(frontT) || 0) + C.setbackX);
  const drills = [];
  let runner = null;

  if (ok && v === 'F') {
    // 3 × ⌀3 through-pilots per side, driven from OUTSIDE the carcass —
    // *"środek: nie widać nic"*. 50 from each box end + the middle.
    for (const x of [
      r2(boxFrontX + C.pilotEnd),
      r2(boxFrontX + d / 2),
      r2(boxFrontX + d - C.pilotEnd),
    ]) {
      for (const side of ['L', 'R']) {
        drills.push({
          side, kind: 'shoe_pilot', layer: C.layers.screw, x, y: axis, d: C.pilotD,
        });
      }
    }
  }

  if (ok && v === 'D') {
    const nl = shoeRunnerNl(d, profile, runnerNl);
    const col = nl == null ? null : (shoeRunnerMap(profile).get(nl) ?? null);
    // The runner FRONT FACE, set back from the carcass front edge by the
    // front's thickness + 3 — *"pamiętaj żeby cofnąć na front + 3 mm"*.
    const face = boxFrontX;
    runner = {
      nl, column: col, faceX: face, axisY: axis, onSheet: col != null,
    };
    if (col == null) {
      // The kit's own refusal grammar, in as many words: no hole is invented.
      warnings.push({
        code: 'SHOE_RUNNER_NL_OFF_SHEET',
        message: `Shoe-box runner NL${nl ?? '?'} is not on the owner's sheet — `
          + 'no fixing hole is drilled for it (the sheet is the record).',
      });
    } else {
      for (const x of [r2(face + C.runnerFrontFix), r2(face + col)]) {
        for (const side of ['L', 'R']) {
          drills.push({
            side, kind: 'shoe_runner_fix', layer: C.layers.runner, x, y: axis, d: C.runnerFixD,
          });
        }
      }
    }
  }

  return {
    variant: v,
    openingW: r2(openingW),
    boxW,
    innerW,
    depth: r2(d),
    boardT: G,
    posZ: r2(posZ),
    dividers: nDiv,
    slope: {
      run, rear, angleDeg, slopeLen, grooveW, grooveDepth: C.grooveDepth,
    },
    hinged: { left: Boolean(hingedLeft), right: Boolean(hingedRight) },
    panels,
    drills,
    runner,
    boxFrontX,
    axisY: axis,
    warnings,
  };
}

/**
 * The BOM line for the side runners — a YELLOW NAMED SPEC, never an article.
 *
 * A NEW hardware family (NOT MOVENTO: `profile.hardware.runner.sideShoe`),
 * and the register knows nothing about it yet. Iron rule 9: unknown articles
 * print as named specs and never as an invented number.
 */
export function shoeRunnerSpec(plan, profile) {
  if (!plan || plan.variant !== 'D') return null;
  const fam = profile?.hardware?.runner?.sideShoe || {};
  return {
    system: fam.system || 'Side-mount shoe runner',
    nl: plan.runner?.nl ?? null,
    width_mm: shoeConst(profile).runnerW,
    on_sheet: Boolean(plan.runner?.onSheet),
    articles: { L: null, R: null },
    // The whole point of the flag: the BOM prints this line yellow because
    // there is no article to order against, and says exactly what is missing.
    complete: false,
    note: fam.note || 'article unknown — the owner has not filled the register',
  };
}
