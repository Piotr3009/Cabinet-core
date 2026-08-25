import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { FRONT_STYLE_OPTIONS } from '../src/engine/design.js';
import { WIZARD_TABS } from '../src/lib/wizardTabs.js';
import { survivors } from '../scripts/t49-classify.mjs';

// ─── TURN 49 · F5 — THE FRONTS ASK FOR TYPES FIRST ──────────────────────────
//
// The owner, 25.08.2026: *"na pierwszym etapie wybieramy type of fronts, a
// pozniej next etapy kolory."*
//
// The first fronts step asks for HOW MANY TYPES AND COLOURS — its heading in
// those words, and larger than it is today. On that step he picks the NUMBER
// and the TYPE, nothing else: no colour picker, no laminate list at this stage.

const WIZ = readFileSync(new URL('../src/components/WizardSettings.jsx', import.meta.url), 'utf8');

const countStop = WIZ.slice(
  WIZ.indexOf("{frontAt === 'count' && show('fronts.count')"),
  WIZ.indexOf('{frontTypeAt && ('),
);

test('F5 — the heading is his, in his words, and it is bigger', () => {
  assert.match(countStop, /How many types and colours\?/);
  assert.match(countStop, /data-fronts-heading="1"/);
  // Larger than T44's 13 px caption: `text-base` on the ink the screen reads
  // brightest, where it was `text-sm text-ink-100`.
  assert.match(countStop, /className="text-base text-ink-50" data-fronts-heading/);
  assert.doesNotMatch(WIZ, /How many front colours\?/);
  // …and the walk's own dot says the same thing the screen does.
  assert.match(WIZ, /if \(stop === 'count'\) return 'How many types and colours';/);
  // The tab's hint agrees too — one question, one wording, three places.
  assert.match(WIZARD_TABS.find((t) => t.id === 'fronts').hint, /^How many types and colours,/);
});

test('F5 — the NUMBER and the TYPE are what this step asks', () => {
  // 1–3, the same setter.
  assert.match(countStop, /data-front-count=\{n\}/);
  assert.match(countStop, /setFrontTypes\(n\)/);
  // The TYPE: the eight-style gallery, per front slot, and slot 1's shape is
  // still the project's shape.
  assert.match(countStop, /data-style-slot=\{t\.id\}/);
  assert.match(countStop, /<FrontStyleGallery/);
  assert.match(countStop, /setFrontType\(t\.id, \{ style: id \}\)/);
  assert.match(countStop, /setProjectDefaults\(\{ fronts: \{ style: id \} \}\)/);
  assert.ok(FRONT_STYLE_OPTIONS.length >= 8, 'the gallery it opens still has its styles');
});

test('F5 — and NO colour picker and NO laminate list stand on it', () => {
  // The category strip — Spraying / Veneer / Laminate — is the colour question
  // in miniature, and it stood in every card. It is gone from this step.
  assert.doesNotMatch(countStop, /sourceSeg\('front'/);
  assert.doesNotMatch(countStop, /data-front-source=/);
  // Nothing that picks a colour, a decor or a board is drawn here either.
  assert.doesNotMatch(countStop, /<ColourPicker/);
  assert.doesNotMatch(countStop, /<MaterialChoicePanel/);
  assert.doesNotMatch(countStop, /stockBoardSelect\(/);
  assert.doesNotMatch(countStop, /data-stock-board=/);
});

test('F5 — the strip is MOVED, not lost: it is the colour dialog’s full-width one', () => {
  // `slotPicker` hands it to the panel as the category strip, `big` — four
  // times the size it was in the card — for BOTH kinds, so the carcasses' own
  // (which this ruling does not touch) is the same one implementation.
  assert.match(WIZ, /categoryStrip=\{sourceSeg\(kind, t, \{ big: true \}\)\}/);
  assert.match(WIZ, /const sourceSeg = \(kind, t, \{ big = false \} = \{\}\) => \{/);
  assert.match(WIZ, /FRONT_ORDER = \['spray', 'veneer', 'laminate'\]/, "the owner's order, kept");
  const row = survivors((f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8'))
    .find((r) => r.control === 'Spraying / Veneer / Laminate');
  assert.ok(row?.found, 'the survivors audit finds it by hook');
});

test('F5 — the carcasses’ own count card is NOT touched', () => {
  // The ruling is about the fronts. Iron rule 4: nothing else is deleted.
  const carcCount = WIZ.slice(
    WIZ.indexOf("{carcAt === 'count' && show('carcases.count')"),
    WIZ.indexOf('{carcTypeAt && ('),
  );
  assert.match(carcCount, /\{sourceSeg\('carcass', t\)\}/);
  assert.match(carcCount, /How many carcass material types\?/);
});

test('F5 — the way ON is still there, and it is navigation and not a choice', () => {
  assert.match(countStop, /data-material-slot=\{`front:\$\{t\.id\}`\}/);
  assert.match(countStop, /onClick=\{\(\) => setFrontStop\(t\.id\)\}/);
  // And what a front is already faced in is still SAID here — a read-back of a
  // decision, which is not a picker and is the only way a joiner coming back to
  // this step can see what he chose.
  assert.match(countStop, /data-front-facing=\{t\.id\}/);
});
