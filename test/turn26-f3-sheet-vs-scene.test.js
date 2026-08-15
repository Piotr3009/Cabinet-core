// ─── TURN 26 · F3 / R10 — THE SCENE DRAWS WHAT THE SHEET DRILLS [CRITICAL] ──
//
// R10, the owner's own law: *"cut CNC musi być twoją drogą do wizualizacji, nie
// na odwrót."* The sheet is the truth and the scene follows it. Every drilling,
// pocket and cut on a panel's CNC record MUST be visible on that panel in 3-D
// — the scene renders the RECORD, never a parallel idea of what should be
// there. Hardware may ADD to the picture (a sleeve inside a hole, a hinge in
// its bore); it may never replace or omit the hole.
//
// His clearest example: a side panel carries three ⌀7.5 holes in a row per
// shelf level on the sheet, and in the scene there were no holes at all —
// X-ray included — only sleeves where a shelf happened to stand.
//
// ─── WHAT THIS FILE IS ──────────────────────────────────────────────────────
//
// R10's own words: "A test per part class asserts count and position parity
// between `panel.cnc` and what the scene mounts, to 0.01 mm." F3.4 names the
// classes it must cover: BUL/BUR, TOP/BOTTOM, BACK, shelves, partitions and
// fronts.
//
// The scene's side of the parity is `engine/recesses.js panelRecesses` — the
// exact list `3d/panelSolid.js` punches out of the board's polygon and builds
// the cut faces from, and (turn 26) the exact list `3d/shakerSolid.js` bores
// into a shaker tray. Asserting against it is asserting against the geometry:
// there is no third reading in between.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { joineryLayers } from '../src/engine/joinery.js';
import { panelRecesses } from '../src/engine/recesses.js';
import { machiningClasses, machiningFor, machiningOmissions } from '../src/engine/machining.js';
import { CNC_LAYERS } from '../src/engine/cnc/layers.js';
import { hardwareInstances } from '../src/engine/hardware3d.js';

const L = joineryLayers(P);
const TOL = 0.01;

// ─── the cabinets, chosen so every named class is on at least one of them ───

const base = (type, extra = {}) => computeCabinet({
  ...defaultParamsFor(type, P), unit_num: '01', ...extra,
}, P);

function cabinets() {
  return {
    // Sides, top, bottom, back, an adjustable shelf and a plain front.
    base: base('BUD', { shelves: 2, doors: true }),
    // A tall unit with a partition down it and doors in the bays.
    partition: base('BUD', {
      width: 900,
      doors: false,
      sections: [{ width_mm: 900, items: [{ id: 'p1', kind: 'partition', x_mm: 450, front_mm: 0 }] }],
      bay_doors: [{ door: 'one', hinge: 'R' }, { door: 'one', hinge: 'L' }],
    }),
    // A shaker leaf — the one FRONT class that never went through panelSolids.
    shaker: base('BUD', { front_type: 'S', doors: true }),
    // Drawer boxes: the two groove classes.
    drawers: base('BUDR', {}),
    // A wardrobe: the tall rules, a rail, a fix shelf.
    wardrobe: base('WARDROBE', { doors: true, shelves: 2 }),
  };
}

/** The part classes F3.4 names, as a predicate on a panel. */
const CLASSES = {
  'BUL/BUR': (p) => p.part === 'BUL' || p.part === 'BUR',
  'TOP/BOTTOM': (p) => p.part === 'TOP' || p.part === 'BOTTOM',
  BACK: (p) => p.part === 'BACK',
  shelves: (p) => p.part === 'SHELF',
  partitions: (p) => p.part === 'VPART' || p.part === 'PARTITION',
  fronts: (p) => p.part === 'FRONT' || p.part === 'DRAWER-FRONT',
};

/** Every hole on this panel's RECORD that the policy says the scene bores. */
function recordHoles(result, panel) {
  return result.drills
    .filter((d) => d.panel === panel.id)
    .filter((d) => machiningFor(d.layer, P).draw);
}

/** …and what the scene actually cuts out of it. */
function sceneHoles(result, panel) {
  const thickness = panel.thickness || panel.box?.d || 0;
  return panelRecesses(panel, result.drills, {
    thickness, skipLayers: [L.socket], profile: P,
  }).filter((f) => f.kind === 'round');
}

/**
 * A hole the picture leaves out ON PURPOSE and for one reason only: it is so
 * near the board's edge that cutting it would break the outline and produce a
 * shape a triangulator refuses. `engine/recesses.js EDGE_KEEP` is that rule and
 * it is named in verify/t26/sheet-vs-scene.md.
 */
function atTheEdge(panel, hole) {
  const cnc = panel.cnc || {};
  const w = cnc.drawn_w ?? panel.w;
  const h = cnc.drawn_h ?? panel.h;
  const r = hole.d / 2;
  return hole.x - r < 0.2 || hole.y - r < 0.2 || hole.x + r > w - 0.2 || hole.y + r > h - 0.2;
}

// ─── R10 — PARITY, PART CLASS BY PART CLASS ─────────────────────────────────

test('R10 — every drilling on the record is a bore in the picture, to 0.01 mm', () => {
  const covered = new Set();
  let compared = 0;

  for (const [job, result] of Object.entries(cabinets())) {
    for (const [name, isKind] of Object.entries(CLASSES)) {
      for (const panel of result.panels.filter((p) => p.box && isKind(p))) {
        const wanted = recordHoles(result, panel);
        const drawn = sceneHoles(result, panel);
        // Every part of every class is walked, whether or not it carries
        // anything: a class whose record is EMPTY has its own parity statement
        // (the test below), and skipping it here would leave the sweep unable
        // to say it had looked.
        covered.add(name);

        for (const hole of wanted) {
          if (atTheEdge(panel, hole)) continue;
          const hit = drawn.find((f) => f.layer === hole.layer
            && Math.abs(f.x - hole.x) <= TOL
            && Math.abs(f.y - hole.y) <= TOL);
          assert.ok(
            hit,
            `${job}/${panel.id}: ${hole.layer} at ${hole.x},${hole.y} is on the sheet and not in the picture`,
          );
          assert.ok(Math.abs(hit.r * 2 - hole.d) <= TOL, `${job}/${panel.id}: ${hole.layer} ⌀ differs`);
          compared += 1;
        }

        // …and nothing in the picture that is not on the sheet. A hole the
        // scene invented would be the other half of R10 broken.
        for (const f of drawn) {
          const back = wanted.find((d) => d.layer === f.layer
            && Math.abs(d.x - f.x) <= TOL
            && Math.abs(d.y - f.y) <= TOL);
          assert.ok(back, `${job}/${panel.id}: the picture bores a ${f.layer} the sheet does not drill`);
        }
      }
    }
  }

  // F3.4 names six classes this sweep must cover, and "covered" has to mean
  // something on a class whose record is EMPTY. Two of them are: a shelf and a
  // wieniec carry no drilling at all in these kits — a shelf is a clean
  // rectangle (which is F7's whole law) and a top's only feature is the joint
  // its outline already cuts. For those, parity is that BOTH sides are empty,
  // and that is asserted below rather than passed over.
  for (const name of ['BUL/BUR', 'TOP/BOTTOM', 'BACK', 'shelves', 'partitions', 'fronts']) {
    assert.ok(covered.has(name), `${name} was not reached by the sweep at all`);
  }
  assert.ok(compared > 200, `${compared} holes compared`);
});

test('R10 — a class with an EMPTY record has an empty picture, and that is parity too', () => {
  // The other half of R10, and the half a count cannot tell from a bug: a part
  // the sheet drills nothing in must show nothing, and a part the sheet drills
  // must show exactly that. Both are stated per class.
  for (const [job, result] of Object.entries(cabinets())) {
    for (const panel of result.panels.filter((p) => p.box && CLASSES.shelves(p))) {
      assert.equal(
        result.drills.filter((d) => d.panel === panel.id).length, 0,
        `${job}/${panel.id}: a shelf is a clean rectangle (F7) — nothing is drilled in it`,
      );
      assert.equal((panel.cnc?.pockets || []).length, 0, `${job}/${panel.id}: and nothing is pocketed in it`);
      assert.equal(sceneHoles(result, panel).length, 0, `${job}/${panel.id}: so the picture bores nothing`);
    }
    for (const panel of result.panels.filter((p) => p.box && CLASSES['TOP/BOTTOM'](p))) {
      // ─── TURN 30 (CLAUDE.md F4): ONE THING IS DRILLED IN A WIENIEC ──────
      //
      // Turn 26 wrote "nothing is DRILLED in a wieniec in these kits", and it
      // was true — because the thing that belonged there had been LOST. The
      // LISP screws a vertical divider's FOOT up through the bottom board
      // (`drawWardrobeDPHolesBOTTOM`, KIT_WARDROBE_FULL.lsp L377-385, called
      // at L934) and turn 23 removed it along with the biscuits that never
      // belonged. It is back, so the sentence is corrected rather than
      // widened: a wieniec carries the divider's foot AND NOTHING ELSE, and
      // the picture bores exactly that — which is what R10 is for.
      const drilled = result.drills.filter((d) => d.panel === panel.id);
      assert.deepEqual(
        [...new Set(drilled.map((d) => d.kind))].sort(), drilled.length ? ['partition_foot_screw'] : [],
        `${job}/${panel.id}: a wieniec takes the divider's foot and nothing else`,
      );
      assert.equal(
        sceneHoles(result, panel).length, drilled.length,
        `${job}/${panel.id}: and the picture bores exactly the record's own holes`,
      );
      // What it does carry is the joint: dog-bone relief, which the picture cuts,
      // and (on the boards that take them) the sockets the outline already cuts.
      const pockets = panel.cnc?.pockets || [];
      assert.ok(pockets.length > 0, `${job}/${panel.id}: it does carry its joint`);
      for (const k of pockets) {
        const rule = machiningFor(k.layer, P);
        assert.ok(rule.known, `${k.layer} has a policy`);
        if (!rule.draw) assert.ok(rule.reason, `${k.layer} is omitted WITH a reason`);
      }
    }
  }
});

test('R10 — every POCKET on the record is a recess in the picture too', () => {
  for (const [job, result] of Object.entries(cabinets())) {
    for (const panel of result.panels.filter((p) => p.box && (p.cnc?.pockets || []).length)) {
      const thickness = panel.thickness || panel.box.d;
      const drawn = panelRecesses(panel, result.drills, {
        thickness, skipLayers: [L.socket], profile: P,
      }).filter((f) => f.kind === 'rect');
      for (const pocket of panel.cnc.pockets) {
        const rule = machiningFor(pocket.layer, P);
        if (!rule.draw) continue;                 // named in machiningOmissions
        if (pocket.layer === L.socket) continue;  // cut by the outline
        if (!(Number(pocket.depth) > 0)) continue; // no depth stated ⇒ not cut
        const cx = (pocket.x1 + pocket.x2) / 2;
        const cy = (pocket.y1 + pocket.y2) / 2;
        const hit = drawn.find((f) => f.layer === pocket.layer
          && Math.abs(f.x - cx) <= 0.3 && Math.abs(f.y - cy) <= 0.3);
        assert.ok(hit, `${job}/${panel.id}: pocket ${pocket.layer} at ${cx},${cy} is not in the picture`);
      }
    }
  }
});

// ─── F3.1 — THE LADDER, AND THE EMPTY RUNGS ─────────────────────────────────

test('F3.1 — every ⌀7.5 shelf hole is bored, EMPTY ones included', () => {
  const r = cabinets().base;
  const side = r.panels.find((p) => p.id === 'BUL');
  const sheet = r.drills.filter((d) => d.panel === 'BUL' && d.layer === P.shelfHoles.layer);
  // Three per level per column — the owner's "three ⌀7.5 holes in a row".
  assert.ok(sheet.length >= 3, `${sheet.length} pin holes on the sheet`);
  assert.equal(sheet.length % P.shelfHoles.clusterOffsets.length, 0, 'they come in clusters of three');

  const drawn = sceneHoles(r, side).filter((f) => f.layer === P.shelfHoles.layer);
  assert.equal(drawn.length, sheet.length, 'the full ladder, not just the carrying rungs');

  // …and the carrying ones are a MINORITY, which is the whole of F3.1: a scene
  // that drew only the holes with a shelf in them would pass a count test that
  // did not know how many there ought to be.
  const carrying = hardwareInstances(r, P).shelfSupports.filter((s) => s.panel === 'BUL');
  assert.ok(carrying.length > 0, 'some rungs do carry a shelf');
  assert.ok(carrying.length < drawn.length, `${carrying.length} carrying of ${drawn.length} bored`);
  assert.ok(drawn.every((f) => f.through === false), 'a pin hole is BLIND — daylight through a side is not a shelf hole');
});

test('F3.2 — the sleeve is INSIDE the hole, and it is the hole’s own size', () => {
  const r = cabinets().base;
  const supports = hardwareInstances(r, P).shelfSupports;
  assert.ok(supports.length > 0);
  for (const s of supports) {
    // The fitting is the drilling's, not a number of its own.
    assert.equal(s.diameter, P.shelfHoles.diameter);
    // …and it knows how deep the hole it lines is, so the barrel can never be
    // longer than the bore.
    assert.equal(s.holeDepth, machiningFor(P.shelfHoles.layer, P).depth);
    assert.ok(s.holeDepth > 0);
    assert.ok(P.hardware.shelfPin.sleeveDepth <= s.holeDepth, 'the collar fits the hole');
  }
  // The hole belongs to the PANEL and the sleeve to the hardware: a support is
  // always on a hole the record carries.
  const holes = r.drills.filter((d) => d.layer === P.shelfHoles.layer);
  for (const s of supports) {
    assert.ok(holes.some((h) => h.panel === s.panel), `${s.panel} is drilled`);
  }
});

// ─── F3.3 — WHAT IS NOT DRAWN IS NAMED ──────────────────────────────────────

test('F3.3 — every CNC class this app emits has a policy, and every omission a reason', () => {
  const known = new Set(machiningClasses().map((c) => c.layer));
  // Every layer in the table of record has an answer. Silence is not allowed.
  for (const row of CNC_LAYERS) {
    assert.ok(known.has(row.name), `${row.name} has no machining policy — F3.3 forbids silence`);
  }
  // …and every layer the ENGINE actually emits, on any of the fixtures.
  for (const result of Object.values(cabinets())) {
    for (const d of result.drills) assert.ok(known.has(d.layer), `${d.layer} is emitted and unnamed`);
    for (const p of result.panels) {
      for (const k of p.cnc?.pockets || []) assert.ok(known.has(k.layer), `${k.layer} is emitted and unnamed`);
      for (const k of p.cnc?.marks || []) assert.ok(known.has(k.layer), `${k.layer} is emitted and unnamed`);
    }
  }
  // Every omission carries a SENTENCE, not a shrug.
  const omissions = machiningOmissions();
  assert.ok(omissions.length > 0);
  for (const o of omissions) {
    assert.ok(o.reason && o.reason.length > 40, `${o.layer}: "${o.reason}" is not a reason`);
    assert.ok(!o.reason.includes('TODO'));
  }
});

test('F3.3 — the omissions in the code are the omissions in the document', () => {
  const doc = readFileSync(new URL('../verify/t26/sheet-vs-scene.md', import.meta.url), 'utf8');
  for (const o of machiningOmissions()) {
    assert.ok(doc.includes(o.layer), `${o.layer} is omitted in code and not named in sheet-vs-scene.md`);
    assert.ok(doc.includes(o.reason), `${o.layer}'s reason is not the document's`);
  }
  // …and the drawn ones are in it too, so the document is the whole table.
  for (const c of machiningClasses()) assert.ok(doc.includes(c.layer), `${c.layer} is missing from the document`);
});

// ─── the depths, and the one law that decides them ──────────────────────────

test('R10 — the RECORD’s own depth beats the workshop’s table', () => {
  const r = cabinets().base;
  const leaf = r.panels.find((p) => p.part === 'FRONT');
  const cup = r.drills.find((d) => d.panel === leaf.id && d.kind === 'cup');
  assert.equal(cup.depth, P.hardware.hinge.cupDepth, 'the sheet states the owner’s 11 mm');

  // Ask the same panel with the record's depth REMOVED and the table alone
  // answers — the same 11, because the two are one number in one place.
  const stripped = r.drills.map(({ depth, ...rest }) => rest);
  const withTable = panelRecesses(leaf, stripped, { thickness: leaf.box.d, profile: P })
    .find((f) => f.layer === P.hinges.cups.layer);
  assert.equal(withTable.depth, P.editor.drillDefaults.FRONT_HINGES_35MM.depth);
  assert.equal(withTable.depth, P.hardware.hinge.cupDepth);

  // …and a record that states something ELSE is obeyed, which is R10.
  const odd = stripped.map((d) => (d.kind === 'cup' ? { ...d, depth: 7 } : d));
  const obeyed = panelRecesses(leaf, odd, { thickness: leaf.box.d, profile: P })
    .find((f) => f.layer === P.hinges.cups.layer);
  assert.equal(obeyed.depth, 7, 'the sheet wins');
});
