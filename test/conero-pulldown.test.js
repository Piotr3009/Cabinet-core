// ─── 30.08.2026: THE CONERO PULL-DOWN — engine truths ───────────────────────
// The owner's law (mockup v3): bases fixed mid-depth, rod parks ABOVE them at
// a height HE sets from the top; the body is the real mechanism's envelope.
import test from 'node:test';
import assert from 'node:assert/strict';
import { computeCabinet } from '../src/engine/cabinet.js';
import { getCabinetProfile, migrateCabinetProfile } from '../src/engine/profile.js';

const P = getCabinetProfile();
const K = P.wardrobeAccessories.kits.pulldown_rail;

const build = (spec) => computeCabinet({
  type: 'WARDROBE',
  width: 800,
  height: 2200,
  depth: 600,
  items: [{ kind: 'pulldown_rail', ...spec }],
}, P);

test('CONERO · the body is the real mechanism, hung by the rod-from-top the owner typed', () => {
  const r = build({ pos_mm: 120 });
  const kit = r.assemblies.wardrobeKits.find((k) => k.kind === 'pulldown_rail');
  assert.ok(kit, 'the kit stands');
  const G = r.derived?.board_t ?? 18;
  assert.equal(kit.box.h, K.bodyHeight, 'envelope = the CONERO closed pose (704)');
  assert.equal(kit.box.y, 2200 - G - 120 - K.bodyHeight, 'rod parked 120 from the top');
});

test('CONERO · no number typed — the profile default hangs it', () => {
  const r = build({});
  const kit = r.assemblies.wardrobeKits.find((k) => k.kind === 'pulldown_rail');
  const G = r.derived?.board_t ?? 18;
  assert.equal(kit.box.y, 2200 - G - K.topDrop - K.bodyHeight);
});

test('CONERO · the BOM line carries the article beside the opening', () => {
  const r = build({});
  const line = r.hardware.find((h) => h.role === 'wardrobe_kit_pulldown_rail');
  assert.ok(line, 'one purchase line');
  assert.equal(line.spec.article, K.conero.article);
  assert.ok(line.spec_label.includes(K.conero.article));
});


test('CONERO · a stale stored profile cannot outvote the catalogue (the lighting law)', () => {
  // A profile persisted BEFORE today: old kit sizes, no conero block.
  const stale = JSON.parse(JSON.stringify(P));
  stale.wardrobeAccessories = {
    ...stale.wardrobeAccessories,
    pulldownSuggestMm: 1234,                       // the owner's own threshold
    kits: {
      trouser: { label: 'Trouser pull-out', bodyHeight: 120, posMm: 900 },
      tie_rack: { label: 'Tie rack', bodyHeight: 300, posMm: 1100 },
      pulldown_rail: { label: 'Pull-down rail', bodyHeight: 140, topDrop: 50 },
    },
  };
  const out = migrateCabinetProfile(stale);
  assert.equal(out.wardrobeAccessories.kits.pulldown_rail.bodyHeight, K.bodyHeight);
  assert.equal(out.wardrobeAccessories.kits.pulldown_rail.conero.file, K.conero.file);
  assert.equal(out.wardrobeAccessories.pulldownSuggestMm, 1234, 'his threshold survives');
});
