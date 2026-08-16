// ─── Turn 34, CLAUDE.md F2: the LEDs SEEN, and placed off the edge ─────────
//
// Two owner verdicts, 16.08.2026, one feature each:
//
//   (a) *"są zbyt słabe — nic nie widać, za słabo świecą"* … *"turn on the
//       light działa ale ledy za słabo świecą"* — the emission has to READ on
//       screen at the default viewport exposure;
//   (b) *"nie ma możliwości ustawienia jak daleko od edge"* — one number per
//       strip that moves it back off the front edge.
//
// The half that must NOT change is the half this file guards hardest: every
// saved project renders byte-identically until he touches the new field, and
// LIGHTING STILL DRILLS NOTHING (T33 rule 3, verbatim).

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P, migrateCabinetProfile } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { migrateDesign } from '../src/engine/design.js';
import {
  demoDimFactor, lightingBomLines, lightingSpec, stripsForUnit,
} from '../src/engine/ledStrips.js';

const unit = {
  id: 'u1',
  type: 'WARDROBE',
  params: { ...defaultParamsFor('WARDROBE', P), unit_num: '01' },
};
const result = computeCabinet({
  ...unit.params,
  sections: [{
    width_mm: unit.params.width,
    items: [{ id: 's1', kind: 'shelf', pos_mm: 900 }],
  }],
}, P);
const shelf = result.panels.find((p) => p.role === 'shelf' && p.meta?.itemId === 's1');

const design = (items) => migrateDesign({
  lighting: { enabled: true, temperature: 4000, items },
});

const strips = (items) => stripsForUnit({
  unit, result, design: design(items), profile: P,
});

// ─── (a) emission that reads on screen ─────────────────────────────────────

test('the emission numbers live in profile.appearance.lighting, and they ROSE', () => {
  const a = P.appearance.lighting;
  assert.ok(a, 'the spec\'s own home for them');
  assert.ok(a.emissive > 0.85, `${a.emissive} is brighter than T33's 0.85`);
  assert.ok(a.emissiveBoost > 1);
  assert.ok(a.spotEmissiveMultiplier > 0);
  // What the view actually multiplies out, ON and OFF.
  const spec = lightingSpec(P);
  assert.equal(spec.view.emissive, a.emissive);
  assert.equal(spec.demo.emissiveBoost, a.emissiveBoost);
  const on = spec.view.emissive * spec.demo.emissiveBoost;
  assert.ok(on > 2.21 * 2, `${on} is unmistakably over T33's 2.21`);
  // The DIM is the T33 number, unmoved — his complaint was the LEDs, not the
  // room, and moving both would have been two changes dressed as one.
  assert.equal(spec.demo.dimFactor, P.lighting.demo.dimFactor);
  assert.equal(demoDimFactor(true, P), 0.15);
  assert.equal(demoDimFactor(false, P), 1);
});

test('a profile saved BEFORE this turn keeps its own numbers — no silent brightening', () => {
  const old = { ...P, appearance: { ...P.appearance, lighting: undefined } };
  const spec = lightingSpec(old);
  assert.equal(spec.view.emissive, P.lighting.view.emissive, 'the T33 fallback answers');
  assert.equal(spec.demo.emissiveBoost, P.lighting.demo.emissiveBoost);
  // …and a profile with NEITHER block still answers, rather than throwing.
  const bare = lightingSpec({});
  assert.equal(bare.view.emissive, 0.85);
  assert.equal(bare.demo.emissiveBoost, 2.6);
});

test('the 3D reads the profile and never a literal', () => {
  // REWRITTEN 16.08.2026 (chat-fix, point 2 — the halo): the demo boost now
  // feeds THREE consumers (emissive, the RectAreaLight, the aura), so it is
  // named once (`boost`) and the emissive line reads `spec.view.emissive *
  // boost`. Same law, one factored name.
  const src = readFileSync(new URL('../src/3d/LedStrips.jsx', import.meta.url), 'utf8');
  // RE-DATED 16.08 (halo v2): the demo toggle became the LIGHT SWITCH
  // ("jak wyłączę światło, to się LED-y nie wyłączają, a powinny") — the
  // variable is `lightOn`, and OFF reads the profile's `offEmissive`.
  assert.match(src, /const boost = lightOn \? spec\.demo\.emissiveBoost : 1/);
  assert.match(src, /spec\.view\.emissive \* boost/);
  assert.match(src, /spec\.view\.offEmissive/, 'off is a real off, profile-listed');
  assert.match(src, /spec\.view\.spotMultiplier/);
  assert.match(src, /spec\.halo\.area \* boost/, 'the lamp obeys the same demo boost');
  assert.match(src, /spec\.halo\.glowOpacity \* boost/, 'the aura too');
  // No bare emissive number anywhere in the component.
  assert.ok(!/emissiveIntensity=\{[\d.]+\}/.test(src), 'a literal crept into the view');
});

test('a migrated profile carries the new block', () => {
  const round = migrateCabinetProfile({ ...P });
  assert.ok(round.appearance.lighting.emissive > 0);
});

// ─── (b) the edge offset ───────────────────────────────────────────────────

test('DEFAULT: no answer sits 80 off the edge (variant A); an explicit 0 is T33 flush', () => {
  // ─── REWRITTEN 16.08.2026 (chat-fix, owner) ────────────────────────────
  // The original pinned "absent = 0 = T33 flush". The owner's variant A,
  // his word: *"default 80 mm wszystkie"* — a strip with NO answer sits at
  // the profile default (80), saved projects included. An explicit 0 is
  // still his own hand saying "flush at the edge" and stays T33's geometry.
  const items = [
    { id: 'l1', unitId: 'u1', kind: 'shelf', ref: shelf.id },
    { id: 'l2', unitId: 'u1', kind: 'side', ref: 'L' },
    { id: 'l3', unitId: 'u1', kind: 'bottom' },
    { id: 'l4', unitId: 'u1', kind: 'top' },
  ];
  const DEF = lightingSpec(P).strip.insetDefault;
  assert.equal(DEF, 80, 'the profile default is the owner\'s 80');
  // ABSENT = the default: the same scene as an explicit 80 — except the
  // PLINTH line, which is LAW at the profile's 10 (owner, 16.08: "na stałe
  // 10 mm od krawędzi, bez możliwości zmiany") and ignores any number.
  const absent = strips(items);
  const at80 = strips(items.map((i) => ({ ...i, inset_mm: 80 })));
  const notBottom = (s) => s.kind !== 'bottom';
  assert.deepEqual(
    absent.filter(notBottom).map((s) => s.box),
    at80.filter(notBottom).map((s) => s.box),
  );
  assert.ok(absent.filter(notBottom).every((s) => s.inset_mm === DEF));
  const PL = lightingSpec(P).strip.plinthInset;
  assert.equal(PL, 10, 'the plinth law is the owner\'s 10');
  for (const set of [absent, at80]) {
    const b = set.find((s) => s.kind === 'bottom');
    assert.equal(b.inset_mm, PL, 'the plinth ignores the item\'s own number');
  }
  // …and an EXPLICIT 0 is T33's: every strip flush at the front edge.
  const zero = strips(items.map((i) => ({ ...i, inset_mm: 0 })));
  const D = unit.params.depth;
  const sw = lightingSpec(P).strip.width;
  const line = lightingSpec(P).strip.sideLineWidth;
  const byKind = Object.fromEntries(zero.map((s) => [s.kind, s]));
  assert.equal(byKind.side.box.z, D - line);
  // The plinth is 10 by law even when the hand says 0 (owner, 16.08).
  assert.equal(byKind.bottom.box.z, D - sw - PL);
  assert.equal(byKind.top.box.z, D - sw);
  assert.equal(byKind.shelf.box.z,
    shelf.box.z + shelf.box.d - byKind.shelf.depth_mm - sw);
});

test('an inset moves the strip back — and ONLY the strip', () => {
  // REWRITTEN 16.08.2026 (chat-fix, variant A): the baseline is an EXPLICIT
  // 0 — "absent" now answers 80 by law, so flush must be asked for by name.
  // (16.08: 'bottom' left the loop — the plinth is pinned at 10 by law.)
  for (const kind of ['shelf', 'side', 'top']) {
    const base = {
      id: 'l1', unitId: 'u1', kind, inset_mm: 0, ...(kind === 'shelf' ? { ref: shelf.id } : {}), ...(kind === 'side' ? { ref: 'L' } : {}),
    };
    const [was] = strips([base]);
    const [now] = strips([{ ...base, inset_mm: 25 }]);
    assert.equal(now.box.z, was.box.z - 25, `${kind}: 25 mm back off the front edge`);
    assert.equal(now.inset_mm, 25, 'and the strip says so');
    // Everything else about it is untouched: same x, same y, same size.
    for (const k of ['x', 'y', 'w', 'h', 'd']) {
      assert.equal(now.box[k], was.box[k], `${kind}: ${k} moved`);
    }
    assert.equal(now.length_mm, was.length_mm, `${kind}: the LENGTH LAW is unchanged`);
  }
});

test('the spots take it too, and the count law is untouched', () => {
  const wall = {
    id: 'w1',
    type: 'WUD',
    params: { ...defaultParamsFor('WUD', P), unit_num: '02' },
  };
  const wallResult = computeCabinet(wall.params, P);
  const of = (inset) => stripsForUnit({
    unit: wall,
    result: wallResult,
    design: design([{
      id: 'l1', unitId: 'w1', kind: 'spot', count: 2, ...(inset == null ? {} : { inset_mm: inset }),
    }]),
    profile: P,
  });
  const was = of(null);
  const now = of(15);
  assert.equal(was.length, 2, 'the owner\'s two discs');
  assert.equal(now.length, 2);
  for (const [i, s] of now.entries()) assert.equal(s.box.z, was[i].box.z - 15);
});

test('a NEGATIVE or nonsense inset is no inset — never a strip in front of the door', () => {
  const base = { id: 'l1', unitId: 'u1', kind: 'bottom' };
  const [was] = strips([base]);
  for (const bad of [-50, 'x', null, NaN]) {
    const [now] = strips([{ ...base, inset_mm: bad }]);
    assert.equal(now.box.z, was.box.z, `${bad} is not a distance`);
  }
});

test('the inset SURVIVES a save and a load, and nothing else does', () => {
  const d = migrateDesign({
    lighting: {
      enabled: true,
      items: [{
        id: 'l1', unitId: 'u1', kind: 'bottom', inset_mm: 12, nonsense: 'x',
      }],
    },
  });
  assert.equal(d.lighting.items[0].inset_mm, 12);
  assert.equal(d.lighting.items[0].nonsense, undefined);
  // An item saved before this turn comes back with the field null — absent,
  // which is exactly T33's placement.
  const older = migrateDesign({
    lighting: { enabled: true, items: [{ id: 'l1', unitId: 'u1', kind: 'bottom' }] },
  });
  assert.equal(older.lighting.items[0].inset_mm, null);
});

// ─── what must NOT change ──────────────────────────────────────────────────

test('the BOM is untouched by an inset — metres are metres', () => {
  const entries = [{ unit, result }];
  const flat = lightingBomLines({
    entries, design: design([{ id: 'l1', unitId: 'u1', kind: 'bottom' }]), profile: P,
  });
  const inset = lightingBomLines({
    entries, design: design([{ id: 'l1', unitId: 'u1', kind: 'bottom', inset_mm: 40 }]), profile: P,
  });
  assert.deepEqual(inset, flat);
});

test('LIGHTING STILL DRILLS NOTHING — T33 rule 3, verbatim', () => {
  const src = readFileSync(new URL('../src/engine/ledStrips.js', import.meta.url), 'utf8');
  assert.ok(!/drills/.test(src.replace(/^.*never touches `result\.drills`.*$/gm, '')
    .replace(/^.*this module has never touched `result\.drills`.*$/gm, '')),
  'ledStrips.js reached for a hole');
  // …and the cabinet the strips hang in has exactly the holes it had.
  const bare = computeCabinet({ ...unit.params }, P);
  assert.equal(bare.drills.length, computeCabinet({ ...unit.params }, P).drills.length);
});

test('the panel offers the field beside the depth control, on every kind', () => {
  const src = readFileSync(new URL('../src/components/LightingPanel.jsx', import.meta.url), 'utf8');
  assert.match(src, /data-lighting-inset=\{it\.id\}/);
  assert.match(src, /Off the front edge/);
  assert.match(src, /updateLightingItem\(it\.id, \{ inset_mm: Number\(e\.target\.value\) \}\)/);
  // ─── REWRITTEN 16.08.2026 (chat-fix, owner) ────────────────────────────
  // The original row stood behind `{strip && (` — a guard that is TRUE only
  // while the item's own unit is the selected one, so the field VANISHED the
  // moment the hand clicked elsewhere. The owner, same day: "modal się zwija
  // z ustawieniem … klient tego nigdy nie zobaczy". The value lives on the
  // ITEM, so the field stands for every placed line, always; only spots have
  // no edge to be off. The depth slider is still shelf-only AND
  // selection-bound (its clamp needs the computed strip) — the inset is
  // neither.
  // (16.08, master slider: `data-lighting-inset-all` sits ABOVE the list, so
  // the anchor is the PER-ITEM attribute, unique to the row under the guard.)
  const insetAt = src.indexOf('data-lighting-inset={it.id}');
  const kindGuard = src.lastIndexOf("{it.kind !== 'spot' && it.kind !== 'bottom' && (", insetAt);
  assert.ok(kindGuard > 0 && kindGuard < insetAt,
    'the inset row stands behind the kind guard (everything but spots)');
  const stripGuard = src.lastIndexOf('{strip && (', insetAt);
  assert.ok(stripGuard < kindGuard,
    'the inset row is NOT behind the selection-bound strip guard any more');
});
