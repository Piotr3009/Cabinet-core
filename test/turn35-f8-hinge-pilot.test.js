// ─── TURN 35, CLAUDE.md F8: THE HINGE-SCREW PILOT, ⌀3 OR ⌀5 ────────────────
//
// The owner, 16.08.2026: *"nie mamy ustawienia w ogóle 5 mm czy 3 mm screws
// zawiasy wiercenie — niektórzy używają tak, inni inaczej"*. Where it lives:
// *"to ustawienie musi być w hardware ustawieniach"*. What it opens on:
// *"5, jak jest teraz"*.
//
// Two things are pinned below and they are pinned TOGETHER, every time: the
// DIAMETER of the hole and the LAYER NAME THAT CARRIES IT. They are one fact
// on the machine — VCarve maps a tool by layer name — so a ⌀3 hole that landed
// on `HINGES_5MM` would be a 5 mm bit going into a 3 mm hole, and a ⌀5 on
// `HINGES_3MM` would be the reverse. Neither is ever allowed to move alone.
//
// The diameter goes in the LAYER NAME and nowhere else. No text style rides
// with it: the DXF writer has no STYLE table, which is the 02.08 VCarve crash
// law, and this turn does not reopen it.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  DEFAULT_CABINET_PROFILE as P, migrateCabinetProfile,
} from '../src/engine/profile.js';
import { computeCabinet, hingePlatePilotD } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { CNC_LAYERS, cncLayer, hingePlateLayer } from '../src/engine/cnc/layers.js';
import { machiningFor } from '../src/engine/machining.js';

const unit = (type, extra = {}, profile = P) => computeCabinet({
  ...defaultParamsFor(type, profile), unit_num: '01', ...extra,
}, profile);

/** Every hinge-plate hole a cabinet drills, as `layer|d`. */
const plateHoles = (r) => [...new Set(
  r.drills.filter((d) => d.kind === 'hinge' && /^HINGES_/.test(d.layer))
    .map((d) => `${d.layer}|${d.d}`),
)].sort();

// ═══════════════════════════════════════════════════════════════════════════
// THE PROFILE NUMBER
// ═══════════════════════════════════════════════════════════════════════════

test('the setting is a PROFILE number, it opens on 5, and an old profile gains it', () => {
  assert.equal(P.hinges.platePilotD, 5, '"5, jak jest teraz"');
  assert.deepEqual(P.hinges.platePilotOptions, [3, 5]);
  // The number this app has drilled since turn 1 is untouched — it is what a
  // bare computeCabinet takes, and it is what keeps the fixtures still.
  assert.equal(P.hinges.holeDiameter, 5);
  assert.equal(P.hinges.layer, 'HINGES_5MM');

  // A profile saved before this turn comes back with both keys. Built from a
  // RECOGNISABLE profile with the new keys removed — a two-key object would
  // prove nothing about a key-by-key merge.
  const before = { ...P, hinges: { ...P.hinges } };
  delete before.hinges.platePilotD;
  delete before.hinges.platePilotOptions;
  const old = migrateCabinetProfile(before);
  assert.equal(old.hinges.platePilotD, 5);
  assert.deepEqual(old.hinges.platePilotOptions, [3, 5]);
  // …and everything else in the block came through with it.
  assert.equal(old.hinges.holeDiameter, 5);
  assert.equal(old.hinges.xFromFrontEdge, P.hinges.xFromFrontEdge);
});

test('the resolver: project over workshop over the app\'s own ⌀5', () => {
  assert.equal(hingePlatePilotD(P), 5, 'nobody has said anything');
  assert.equal(hingePlatePilotD(P, {}), 5);
  // The workshop's own answer.
  const shop3 = { ...P, hinges: { ...P.hinges, platePilotD: 3 } };
  assert.equal(hingePlatePilotD(shop3), 3);
  // …and the PROJECT outranks it, both ways round — the shelf-pin setback's
  // own cascade (turn 30, F5).
  assert.equal(hingePlatePilotD(shop3, { hinge_plate_pilot_d: 5 }), 5);
  assert.equal(hingePlatePilotD(P, { hinge_plate_pilot_d: 3 }), 3);
  // A diameter this app has no layer for is not honoured — a hole on a layer
  // no tool is mapped to is a hole nobody cuts.
  assert.equal(hingePlatePilotD(P, { hinge_plate_pilot_d: 4 }), 5);
  assert.equal(hingePlatePilotD(P, { hinge_plate_pilot_d: 0 }), 5);
  assert.equal(hingePlatePilotD({}, {}), 5, 'and no profile at all still answers');
});

// ═══════════════════════════════════════════════════════════════════════════
// THE LAYER — the diameter's only carrier
// ═══════════════════════════════════════════════════════════════════════════

test('HINGES_3MM joins the table beside HINGES_5MM, by the house grammar', () => {
  const three = cncLayer('HINGES_3MM');
  const five = cncLayer('HINGES_5MM');
  assert.equal(three.name, 'HINGES_3MM', '{FEATURE}_{DIAMETER}MM');
  assert.equal(three.kind, 'hole');
  assert.equal(five.kind, 'hole');
  // A colour of its own on the bed and on the screen, or the preview cannot
  // tell the two apart — the whole reason `screen` is separate from `aci`.
  assert.notEqual(three.aci, five.aci);
  assert.notEqual(three.screen, five.screen);
  // …and the ACI is genuinely unused by the rest of the table, so nothing
  // AutoCAD already draws changes colour.
  assert.equal(CNC_LAYERS.filter((l) => l.aci === three.aci).length, 1);

  assert.equal(hingePlateLayer(5), 'HINGES_5MM');
  assert.equal(hingePlateLayer(3), 'HINGES_3MM');
  assert.equal(hingePlateLayer(4), 'HINGES_5MM', 'an unknown diameter falls back to the app\'s own');
  assert.equal(hingePlateLayer(null), 'HINGES_5MM');
});

test('no text style rides with the diameter — the 02.08 VCarve crash law', () => {
  const dxf = readFileSync(new URL('../src/engine/cnc/dxf.js', import.meta.url), 'utf8');
  assert.ok(!/\bSTYLE\b/.test(dxf), 'the DXF writer still declares no STYLE table');
  assert.ok(!/HINGES_3MM/.test(dxf), 'and the new layer needed no special case in it');
});

// ═══════════════════════════════════════════════════════════════════════════
// THE DRILLING — both diameters, and the layer that carries each
// ═══════════════════════════════════════════════════════════════════════════

test('a BARE computeCabinet still drills ⌀5 on HINGES_5MM (rule 2: no unnamed delta)', () => {
  const r = unit('BUD');
  assert.deepEqual(plateHoles(r), ['HINGES_5MM|5']);
  assert.ok(!r.drills.some((d) => d.layer === 'HINGES_3MM'), 'nothing on the new layer');
});

test('⌀3 on the project: every plate hole moves to HINGES_3MM, and nothing else moves', () => {
  const five = unit('BUD');
  const three = unit('BUD', { hinge_plate_pilot_d: 3 });
  assert.deepEqual(plateHoles(three), ['HINGES_3MM|3']);

  // SAME HOLES, SAME PLACES. Only the layer and the diameter differ — the
  // 37 mm from the front edge and the ±16 pair are the plate's geometry and
  // this setting is a screw, not a plate.
  const at = (r) => r.drills.filter((d) => d.kind === 'hinge' && /^HINGES_/.test(d.layer))
    .map((d) => `${d.panel}|${d.x}|${d.y}`).sort();
  assert.deepEqual(at(three), at(five));
  assert.ok(at(five).length > 0, 'and there were some to compare');

  // The CUPS are the door's, drilled from the door's own edge, and they do not
  // follow the plate's screw.
  const cups = (r) => r.drills.filter((d) => d.layer === 'FRONT_HINGES_35MM')
    .map((d) => `${d.panel}|${d.x}|${d.y}|${d.d}`).sort();
  assert.deepEqual(cups(three), cups(five));
  // …and so are the cups' own ⌀3 fixing screws, on their own layer as ever.
  assert.ok(five.drills.some((d) => d.layer === 'FRONT_HINGES_3MM'));
  assert.ok(three.drills.some((d) => d.layer === 'FRONT_HINGES_3MM'));
});

test('⌀3 on the WORKSHOP profile drills ⌀3 with nothing said in the project', () => {
  const shop3 = migrateCabinetProfile({ ...P, hinges: { ...P.hinges, platePilotD: 3 } });
  assert.deepEqual(plateHoles(unit('BUD', {}, shop3)), ['HINGES_3MM|3']);
  // …and one project can still say ⌀5 back at it.
  assert.deepEqual(plateHoles(unit('BUD', { hinge_plate_pilot_d: 5 }, shop3)), ['HINGES_5MM|5']);
});

test('a partition\'s plate follows the same number — it is the same plate', () => {
  // A doored wardrobe with a partition hangs a leaf on it (turn 21, F12.2).
  const three = unit('WARDROBE', { width: 1200, partitions: 1, hinge_plate_pilot_d: 3 });
  const holes = three.drills.filter((d) => d.kind === 'hinge' && /^HINGES_/.test(d.layer));
  assert.ok(holes.length > 0, 'a doored wardrobe drills plates somewhere');
  for (const h of holes) {
    assert.equal(h.layer, 'HINGES_3MM');
    assert.equal(h.d, 3);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// THE SATELLITES — everything keyed by the layer name knows the new one
// ═══════════════════════════════════════════════════════════════════════════

test('the 3-D bore and the hand-editor\'s defaults both know HINGES_3MM', () => {
  // The scene: a plate pilot is BLIND, exactly as the ⌀5 is — a hole through
  // the outer face of a side panel would be visible in the room. A layer this
  // table has never heard of would come back `known: false` and be bored
  // THROUGH, which is the fault this row exists to prevent.
  const three = machiningFor('HINGES_3MM', P);
  const five = machiningFor('HINGES_5MM', P);
  assert.equal(three.known, true, 'the class is named, not inferred');
  assert.equal(three.draw, true);
  assert.equal(three.depth, five.depth, 'same plate, same board — same blind depth');
  assert.ok(three.depth > 0, 'blind, not through');

  // The stamping convention (profile.editor.drillDefaults) — the same table
  // the scene reads when a record states no depth.
  assert.deepEqual(P.editor.drillDefaults.HINGES_3MM, { d: 3, depth: 12 });
  assert.deepEqual(P.editor.drillDefaults.HINGES_5MM, { d: 5, depth: 12 },
    'and the ⌀5 row is untouched');
});

test('the WALL UNIT\'s hangers do NOT follow this setting', () => {
  // `wallUnit.hangers` reuses HINGES_5MM for a hanger fixing — a different
  // feature that happens to share a layer. It is a ⌀5 hole in a wall unit's
  // side and it stays one whatever the hinge plates are screwed with.
  assert.equal(P.wallUnit.hangers.layer, 'HINGES_5MM');
  assert.equal(P.wallUnit.hangers.holeDiameter, 5);
  const r = unit('WUD', { hinge_plate_pilot_d: 3 });
  const hangers = r.drills.filter((d) => d.kind === 'hanger');
  assert.ok(hangers.length > 0, 'a wall unit hangs on something');
  for (const h of hangers) {
    assert.equal(h.d, 5, 'the hanger is still ⌀5');
    assert.equal(h.layer, 'HINGES_5MM');
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// THE PANEL — the house's own control, never a <select> and never a radio
// ═══════════════════════════════════════════════════════════════════════════

test('Settings → Hardware carries the row, in the "Standard hinges" pattern', () => {
  const src = readFileSync(new URL('../src/components/SettingsPanel.jsx', import.meta.url), 'utf8');
  const from = src.indexOf('data-hinge-plate-pilot="1"');
  assert.ok(from > 0, 'the row is not in the panel');
  const row = src.slice(from, from + 1400);

  // It sits in the HARDWARE section, where the owner put it ("to ustawienie
  // musi być w hardware ustawieniach") — after the hinge rows and before the
  // shelf supports.
  const hardware = src.indexOf('data-settings-section="thickness"');
  assert.ok(from < hardware, 'the row escaped the hardware section');
  assert.ok(src.indexOf('data-hinge-standard="1"') < from, 'it follows the hinge rows');

  // The house style, verbatim from the "Standard hinges" row: buttons, not a
  // dropdown and not a radio. There is neither in this panel and this row does
  // not introduce the first one.
  assert.match(row, /platePilotOptions\.map/);
  assert.match(row, /data-hinge-plate-pilot-option=\{d\}/);
  assert.match(row, /aria-pressed=/);
  assert.match(row, /cc-btn px-2/);
  assert.match(row, /border-gold text-gold/);
  assert.ok(!/<select/i.test(row) && !/type="radio"/.test(row), 'no dropdown, no radio');
});
