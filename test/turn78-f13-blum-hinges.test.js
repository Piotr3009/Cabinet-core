// ─── T78 · F13 / F8 · THE HINGE DATA: reference/hardware/blum-hinges.json ────
//
// The owner, 11.10.2026: "otwieranie drzwi wiekszy kat otwarcia 180 stopni,
// zawiasy" (F13) and "zawiasy podwojne czyli jedne drzwiczki do carcasu a
// pozniej zawiasy od drzwiczek do drzwiczek" (F8). CLAUDE.md T78: the Blum
// wide-angle families (CLIP top BLUMOTION 155, CLIP top 170) and the CLIP top
// 60 degree bi-fold corner hinge go into `reference/hardware/blum-hinges.json`
// beside the existing hinge data, each number with its catalogue page,
// `owner to confirm`.
//
// What this file pins:
//   . the new file is read by the SAME code as cliptop-hinges.json and answers
//     the same angles for the same fronts (the standard ladder is restated,
//     the owner's 19 GLB rows are copied byte for byte);
//   . every catalogue number carries its page and URL and `owner to confirm`;
//     every null carries a sentence saying where the number lives;
//   . the cup pattern is unchanged in position (CLAUDE.md T78 F13);
//   . the wide ladder is PROPOSED, never decided here (T22 law: the angle
//     stays derived from the front thickness inside the family);
//   . the bi-fold hinge is never a door's choice, and until its TB and plate
//     position are read off p. 117 it is a line and a body, never a hole.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  clearHingeCatalogue, hingeAngleFor, hingeChoices, hingeFamilies, parseHingeCatalogue,
  setHingeCatalogue,
} from '../src/engine/hinges.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');

const NEW_TXT = read('reference/hardware/blum-hinges.json');
const NEW = JSON.parse(NEW_TXT);
const OLD = JSON.parse(read('reference/hardware/cliptop-hinges.json'));
const OTC = 'owner to confirm';
const CAT = 'https://publications.blum.com/2024/catalogue/en/';

const THICKNESSES = [12, 16, 18, 19, 22, 25, 25.5, 26, 28, 32, 33, 40];

/** Walk every object in a tree; `fn(node, path)`. */
function walk(node, fn, path = '') {
  if (!node || typeof node !== 'object') return;
  fn(node, path);
  for (const [k, v] of Object.entries(node)) walk(v, fn, path ? `${path}.${k}` : k);
}

/** Resolve a dotted path on the file; null where a segment is missing. */
function at(path) {
  let cur = NEW;
  for (const seg of path.split('.')) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = cur[seg];
  }
  return cur;
}

// ─── the file, as text ──────────────────────────────────────────────────────

test('F13 · no em or en dash in the data file or in this test', () => {
  // The two code points are written as escapes so this very line is not one.
  const DASH = new RegExp('[\\u2013\\u2014]');
  assert.doesNotMatch(NEW_TXT, DASH);
  assert.doesNotMatch(read('test/turn78-f13-blum-hinges.test.js'), DASH);
});

test('F13 · the file names its catalogue, its pages, how it was read and that nothing was fetched', () => {
  assert.equal(NEW.units, 'mm');
  assert.equal(NEW.status, OTC);
  assert.equal(NEW.source.url, CAT);
  assert.deepEqual(NEW.source.sections, { lift_systems_from_page: 10, hinge_systems_from_page: 70, box_systems_from_page: 194 });
  assert.match(NEW.source.access, /search result snippets/);
  assert.match(NEW.source.access, /no page and no PDF was opened/);
  for (const [n, p] of Object.entries(NEW.source.pages_read)) {
    assert.equal(p.url, `${CAT}${n}/`);
    assert.ok(p.what.length > 20, `page ${n} says what it holds`);
  }
  assert.ok(Object.keys(NEW.source.dealers).length >= 30);
  for (const [id, d] of Object.entries(NEW.source.dealers)) {
    assert.match(id, /^D\d\d$/);
    assert.match(d.url, /^https:\/\//);
    assert.ok(d.what.length > 20, `${id} says what it gave`);
  }
});

// ─── the same code reads it ─────────────────────────────────────────────────

test('F13 · parseHingeCatalogue reads the new file and the rules are the old file\'s, restated', () => {
  const n = parseHingeCatalogue(NEW);
  const o = parseHingeCatalogue(OLD);
  assert.ok(n && o);
  assert.equal(n.system, o.system, 'the same system id, so a swap of the import changes no test of turn 19');
  assert.deepEqual(n.rules.byThickness, o.rules.byThickness);
  assert.deepEqual(n.rules.byThickness.map((r) => [r.max, r.angle]), [[25, 110], [32, 95]]);
  assert.equal(n.rules.wardrobeInnerDrawer, 155);
  assert.equal(n.rules.plateDefault, o.rules.plateDefault);
  assert.equal(n.rules.plateOption, o.rules.plateOption);
  assert.deepEqual(n.rules.layers, o.rules.layers);
  // The three layers the export writes (turn 19 rule 7), held to the profile.
  assert.equal(n.rules.layers.cup, P.hinges.cups.layer);
  assert.equal(n.rules.layers.cup_screws, P.hinges.cups.screwLayer);
  assert.equal(n.rules.layers.plate_knockin5, P.hinges.layer);
});

test('F13 · the owner\'s 19 GLB rows are copied byte for byte, in order, first', () => {
  assert.equal(OLD.items.length, 19);
  assert.deepEqual(NEW.items.slice(0, OLD.items.length), OLD.items);
  for (const row of OLD.items) {
    assert.ok(NEW.items.some((n) => JSON.stringify(n) === JSON.stringify(row)), `${row.family} ${row.article}`);
  }
});

test('F13 · hingeAngleFor answers the same for every front with either file (nothing older moves)', () => {
  const answers = (raw) => {
    setHingeCatalogue(raw);
    const out = THICKNESSES.map((t) => hingeAngleFor({ frontThickness: t }));
    out.push(hingeAngleFor({ frontThickness: 18, innerDrawer: true }));
    out.push(hingeAngleFor({ frontThickness: 0 }));
    return out;
  };
  try {
    const a = answers(OLD);
    const b = answers(NEW);
    assert.deepEqual(b, a);
    assert.deepEqual(a.slice(0, 6), [110, 110, 110, 110, 110, 110]);
    assert.deepEqual(a.slice(6, 10), [95, 95, 95, 95]);
    assert.deepEqual(a.slice(10, 14), [null, null, 155, null]);
  } finally {
    clearHingeCatalogue();
  }
});

test('F13 · the wide rows read as hinges a door may be assigned; the bi-fold rows never do', () => {
  try {
    setHingeCatalogue(NEW);
    const wide = hingeFamilies({ angle: 170 });
    assert.deepEqual(wide.map((f) => [f.family, f.article, f.role, f.finish, f.file]), [
      ['71T6550', '71T6550', 'hinge', 'nickel', null],
      ['71T6580', '71T6580', 'hinge', 'nickel', null],
    ]);
    const fifty5 = hingeFamilies({ angle: 155 });
    assert.deepEqual(fifty5.map((f) => f.family), ['71B7550', '71B7590'], 'the 155 is the owner\'s own GLB pair, unchanged');
    // The 60 degree corner hinge is `hinge_bifold` in the file: whether or not
    // the engine knows that role yet, it is never in a door's dropdown.
    assert.ok(hingeChoices().every((c) => c.angle !== 60 && !/60°/.test(c.label)));
    assert.ok(hingeFamilies({ role: 'hinge' }).every((f) => f.angle !== 60));
    const bifold = NEW.items.filter((i) => i.role === 'hinge_bifold');
    assert.deepEqual(bifold.map((i) => [i.family, i.angle, i.t78.page]), [['79T8500', 60, 116], ['79T8530', 60, 116]]);
  } finally {
    clearHingeCatalogue();
  }
});

// ─── every number has its page; every null has its sentence ─────────────────

test('F13 · every catalogue or dealer number carries its page and URL or its dealer id, and owner to confirm; every null a sentence', () => {
  let numbers = 0;
  let nulls = 0;
  const dealers = new Set(Object.keys(NEW.source.dealers));
  for (const branch of ['families', 'plates', 'accessories', 'rules.cup_pattern']) {
    walk(at(branch), (node, path) => {
      if (!Object.prototype.hasOwnProperty.call(node, 'value')) return;
      assert.equal(node.status, OTC, `${branch}.${path} is owner to confirm`);
      if (node.value === null) {
        nulls += 1;
        assert.equal(typeof node.note, 'string');
        assert.ok(node.note.length >= 20, `${branch}.${path} null carries a sentence`);
        return;
      }
      numbers += 1;
      const hasPage = Number.isInteger(node.page) && node.url === `${CAT}${node.page}/`;
      const hasDealer = Array.isArray(node.dealers) && node.dealers.length > 0
        && node.dealers.every((d) => dealers.has(d));
      assert.ok(hasPage || hasDealer, `${branch}.${path} names a catalogue page or a dealer`);
      if (hasPage) {
        assert.ok(node.page >= 70 && node.page < 194, `${branch}.${path} p. ${node.page} is a hinge systems page (70 to 193)`);
        assert.ok(NEW.source.pages_read[node.page], `${branch}.${path} p. ${node.page} is in pages_read`);
      }
    });
  }
  assert.ok(numbers >= 80, `numbers with a source: ${numbers}`);
  assert.ok(nulls >= 15, `nulls with a sentence: ${nulls}`);
});

test('F13 · the nulls list names every null and each resolves to a null in the tree', () => {
  assert.ok(NEW.nulls.length >= 20);
  for (const n of NEW.nulls) {
    assert.ok(n.where && n.why, `${n.path} says where and why`);
    if (n.path.includes('[')) continue; // the 175H9 rows, checked below
    const hit = at(n.path);
    assert.ok(hit !== undefined, `${n.path} exists`);
    const value = (hit && typeof hit === 'object' && 'value' in hit) ? hit.value : hit;
    assert.equal(value, null, `${n.path} is null`);
  }
  const h9 = NEW.plates.cruciform_37_32.rows.filter((r) => r.family.startsWith('175H9'));
  assert.equal(h9.length, 5);
  assert.ok(h9.every((r) => r.height === null && typeof r.height_note === 'string'));
});

// ─── the families: what is decided, what is proposed ────────────────────────

test('F13 · the door chooses a FAMILY, standard by default; the wide ladder is proposed and unconfirmed (T22 law)', () => {
  assert.equal(NEW.rules.hinge_family_default, 'standard');
  assert.deepEqual(NEW.rules.hinge_family_options, ['standard', 'wide']);
  assert.deepEqual(NEW.rules.families.standard.hinge_by_front_thickness, NEW.rules.hinge_by_front_thickness);
  const wide = NEW.rules.families.wide;
  assert.deepEqual(wide.hinge_by_front_thickness, [{ max: 21, angle: 170 }, { max: 24, angle: 155 }]);
  assert.equal(wide.proposed, true);
  assert.equal(wide.confirmed, false);
  assert.match(wide.rationale, /T78 proposed, owner to confirm/);
  assert.match(wide.rationale, /p\. 89/);
  assert.deepEqual(NEW.rules.opening_angles, { standard: [110, 95], wide: [155, 170], bifold: [60] });
  // Company defaults never carry an angle: the file holds no key that is an angle choice.
  assert.ok(!('hinge_angle' in NEW.rules) && !('angle_default' in NEW.rules));
});

test('F13 · the catalogue pages per family: 110 p. 76, 155 p. 84/85, 170 p. 88/89, bi-fold p. 116/117, plates p. 153', () => {
  const F = NEW.families;
  assert.equal(F.standard.hinges['110'].articles.screw_on.value, '71B3550');
  assert.equal(F.standard.hinges['110'].articles.screw_on.page, 76);
  assert.deepEqual(F.standard.hinges['95'].page_candidates, [98, 100]);
  assert.equal(F.standard.hinges['95'].articles.screw_on.value, '71B9550');
  assert.equal(F.wide.hinges['155'].articles.screw_on.value, '71B7550');
  assert.equal(F.wide.hinges['155'].articles.screw_on.page, 84);
  assert.equal(F.wide.hinges['155'].overlay.planning_page.page, 85);
  assert.equal(F.wide.hinges['155'].opening_angle.value, 155);
  assert.equal(F.wide.hinges['170'].articles.screw_on_sprung.value, '71T6550');
  assert.equal(F.wide.hinges['170'].articles.knock_in.value, '71T6580');
  assert.equal(F.wide.hinges['170'].articles.screw_on_sprung.page, 88);
  assert.equal(F.wide.hinges['170'].overlay.planning_page.page, 89);
  assert.equal(F.wide.hinges['170'].opening_angle.value, 170);
  assert.equal(F.wide.hinges['170'].front_thickness_fd.no_gap_up_to.value, 21);
  assert.equal(F.wide.hinges['170'].front_thickness_fd.trial_above.value, 22);
  assert.equal(F.bifold.hinge.articles.screw_on.value, '79T8500');
  assert.equal(F.bifold.hinge.articles.knock_in.value, '79T8530');
  assert.equal(F.bifold.hinge.articles.screw_on.page, 116);
  assert.equal(F.bifold.hinge.planning_page.page, 117);
  assert.equal(NEW.plates.cruciform_37_32.page, 153);
});

test('F13 · the 170 has no integrated soft close: 973A6000 clip-on, one per hinge (p. 88, 178, 180, 181), zero holes; 973A0500.01 is not it (p. 82)', () => {
  const s = NEW.families.wide.hinges['170'].soft_close;
  assert.equal(s.integrated.value, false);
  assert.equal(s.clip_on.value, '973A6000');
  assert.equal(s.clip_on.page, 88);
  assert.match(s.not_this.value, /973A0500\.01/);
  assert.equal(s.not_this.page, 82);
  const acc = NEW.accessories.find((a) => a.part === '973A6000');
  assert.ok(acc);
  assert.equal(acc.per_hinge.value, 1);
  assert.equal(acc.per_hinge.page, 181);
  assert.equal(acc.holes, 0);
  assert.deepEqual(acc.pages, [88, 178, 180, 181]);
  assert.ok(NEW.accessories.every((a) => a.holes === 0), 'a bought mechanism is a line and a body, never a hole');
});

// ─── the cup pattern is unchanged in position ───────────────────────────────

test('F13 · the cup pattern is unchanged in position: the same 35 cup, the same layers, the repo\'s TB 4 inside every family\'s range', () => {
  const c = NEW.rules.cup_pattern;
  assert.equal(c.unchanged, true);
  assert.equal(c.diameter, 35);
  assert.equal(c.diameter, P.hinges.cups.diameter);
  assert.equal(c.layer_cup, P.hinges.cups.layer);
  assert.equal(c.layer_cup_screws, P.hinges.cups.screwLayer);
  assert.equal(c.layer_plate, P.hinges.layer);
  assert.equal(c.repo_drilling_distance_tb, P.hinges.cups.xFromHingeEdge - 17.5);
  assert.equal(c.repo_drilling_distance_tb, 4);
  assert.equal(c.repo_cup_depth, P.hardware.hinge.cupDepth);
  assert.equal(c.screw_offset_x_catalogue.value, P.hinges.cups.screwOffsetX);
  assert.equal(c.screw_spacing_catalogue.value, 45);
  assert.match(c.screw_spacing_catalogue.note, /46/, 'the repo\'s 2 x 23 is said beside Blum\'s 45, nothing moves');
  // TB 4 sits inside the standard range (p. 79: 3 to 7) and the dealers' wide range (3 to 8).
  const std = NEW.families.standard.hinges['110'].drilling_distance_tb;
  assert.ok(std.min.value <= 4 && 4 <= std.max.value);
  assert.deepEqual([std.min.page, std.max.page], [79, 79]);
  for (const a of ['155', '170']) {
    const d = NEW.families.wide.hinges[a].drilling_distance_tb;
    assert.equal(d.catalogue.value, null);
    assert.ok(d.dealer.min.value <= 4 && 4 <= d.dealer.max.value);
  }
});

// ─── F8: the bi-fold corner hinge, a line and a body until p. 117 is read ────

test('F8 · the bi-fold: 60 degrees, FD 15 to 23 factory 19, companion 155 or 170 (p. 116); plate 0 or 3 (p. 117); TB and plate position null, so no hole', () => {
  const b = NEW.families.bifold.hinge;
  assert.equal(b.opening_angle.value, 60);
  assert.equal(b.opening_angle.page, 116);
  assert.deepEqual([b.front_thickness_fd.min.value, b.front_thickness_fd.max.value, b.front_thickness_fd.factory_setting.value], [15, 23, 19]);
  assert.equal(b.companion_hinge_on_leaf_a.value, '155 or 170');
  assert.equal(b.companion_hinge_on_leaf_a.page, 116);
  assert.equal(b.plate_on_leaf_a.spacing.value, '0 mm or 3 mm spaced standard mounting plate');
  assert.equal(b.plate_on_leaf_a.spacing.page, 117);
  assert.equal(b.cup_on_leaf_b.diameter.value, 35);
  assert.deepEqual(b.cup_on_leaf_b.layers, { cup: 'FRONT_HINGES_35MM', cup_screws: 'FRONT_HINGES_3MM' });
  assert.equal(b.cup_on_leaf_b.drilling_distance_tb.value, null);
  assert.match(b.cup_on_leaf_b.drilling_distance_tb.note, /a line and a body, never a hole/);
  assert.equal(b.plate_on_leaf_a.position_on_leaf_a.value, null);
  assert.deepEqual(b.cup_on_leaf_b.depth.value, { imperialglassandtimber: 11, blum_uk_distributor: 13.5 }, 'the two dealers conflict and the file says so');
});
