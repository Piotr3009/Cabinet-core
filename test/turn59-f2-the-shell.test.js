// ─── TURN 59 · F2 — THE SHELL, ENFORCED TO THE HEX ─────────────────────────
//
// CLAUDE.md, STANDING LAW: *"PETROS DESIGN SYSTEM IS LAW. Every colour on the
// PBI side is one of the twelve named tokens, used where the system says; 72 /
// 23 / max 5 gold; zero border-radius; no gradients; no #FFFFFF as a large
// background; no brown/camel/pastel; gold only in 1-px lines, button borders,
// small marks, active menu. A colour not in the token file is a violation."*
//
// A design system nobody can fail is a mood board. This file is the thing that
// can be failed: it reads tokens.css, builds the set, walks every retail source
// and reports the first hex that is not in it.
//
// THE ONE CARVE-OUT, and it is the brief's own (F2.2): *"the image slot a flat
// block of that collection's signature tone (CONTENT tones inside cards, not UI
// chrome)."* So a hex outside the token set is allowed in exactly one file —
// `design/collections.js` — and only when it is a decor's OWN colour, which is
// checked against `public/decors/egger/egger-decors.json` id by id.

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { isCopy } from '../scripts/t63-copies.mjs';
import { join, relative } from 'node:path';

import { COLLECTIONS, DEFAULT_COLLECTION, collectionDecorIds } from '../src/retail/design/collections.js';
import { COPY_PAGES } from '../src/retail/site/copy.js';
import { ROUTES, go, parseHash } from '../src/retail/site/router.js';
import { PRICE_ON_REQUEST, QUOTE_EMAIL } from '../src/retail/config.js';

const ROOT = new URL('../', import.meta.url).pathname;
const RETAIL = join(ROOT, 'src/retail');
const TOKENS = join(RETAIL, 'styles/tokens.css');

function filesUnder(dir, re = /\.(js|jsx|css)$/) {
  const out = [];
  for (const entry of readdirSync(dir).sort()) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out.push(...filesUnder(path, re));
    else if (re.test(path)) out.push(path);
  }
  return out;
}

const HEX = /#[0-9a-fA-F]{3,8}\b/g;

/**
 * COMMENTS ARE NOT THE PAGE.
 *
 * Every file in the retail tree quotes the law it obeys — "no #FFFFFF as a
 * large background", "never '£0'", "no BOM, CNC, DXF" — and a scanner that
 * read those quotations would fail this turn for writing down its own rules.
 * So the prose goes and the code stays, which is also the only reading under
 * which these tests mean anything: what is banned is what a CLIENT SEES.
 */
const stripComments = (text) => text
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^[ \t]*\/\/.*$/gm, ' ');

const code = (file) => stripComments(readFileSync(file, 'utf8'));

const tokenHexes = () => new Set(
  [...readFileSync(TOKENS, 'utf8').matchAll(HEX)].map((m) => m[0].toLowerCase()),
);

const decorHexes = () => {
  const raw = JSON.parse(readFileSync(join(ROOT, 'public/decors/egger/egger-decors.json'), 'utf8'));
  const rows = Array.isArray(raw) ? raw : Object.values(raw).find(Array.isArray);
  return new Map(rows.map((d) => [d.id, String(d.hex || '').toLowerCase()]));
};

test('F2 · tokens.css carries the twelve Petros colours, verbatim', () => {
  const css = readFileSync(TOKENS, 'utf8');
  const WANT = {
    '--pbi-porcelain': '#FAF8F3',
    '--pbi-warm-white': '#F2EEE7',
    '--pbi-ivory': '#D9D1C6',
    '--pbi-soft-ivory': '#E7E1D8',
    '--pbi-stone-line': '#C7BCAF',
    '--pbi-onyx': '#090A09',
    '--pbi-carbon': '#171817',
    '--pbi-graphite': '#292A28',
    '--pbi-soft-graphite': '#5C5B57',
    '--pbi-gold': '#B8A588',
    '--pbi-deep-gold': '#806A44',
    '--pbi-gold-highlight': '#D2C19F',
  };
  for (const [name, hex] of Object.entries(WANT)) {
    assert.match(css, new RegExp(`${name}\\s*:\\s*${hex}\\s*;`, 'i'), `${name} is not ${hex}`);
  }
  assert.equal(Object.keys(WANT).length, 12, 'twelve, not thirteen');

  for (const [name, value] of Object.entries({
    '--pbi-header-h': '82px',
    '--pbi-hero-min-h': '720px',
    '--pbi-side-margin': '72px',
    '--pbi-section-gap': '112px',
    '--pbi-button-h': '50px',
    '--pbi-gold-line': '48px',
    '--pbi-radius': '0',
  })) {
    assert.match(css, new RegExp(`${name}\\s*:\\s*${value}\\s*;`), `${name} is not ${value}`);
  }
});

test('F2 · Champagne is an ALIAS, not a thirteenth colour', () => {
  const css = readFileSync(TOKENS, 'utf8');
  assert.match(css, /--pbi-champagne:\s*var\(--pbi-gold-highlight\)/,
    'Champagne must resolve to a token that exists, never to a hex of its own');
});

test('F2 · not one hex on the PBI side that is not a token — the carve-out aside', () => {
  const allowed = tokenHexes();
  const strays = [];
  for (const file of filesUnder(RETAIL)) {
    const rel = relative(ROOT, file);
    if (rel.endsWith('styles/tokens.css')) continue;
    // The brief's own carve-out: CONTENT tones inside cards. Checked below.
    if (rel.endsWith('design/collections.js')) continue;
    const text = code(file);
    for (const m of text.matchAll(HEX)) {
      if (!allowed.has(m[0].toLowerCase())) strays.push(`${rel}: ${m[0]}`);
    }
  }
  assert.deepEqual(strays, [], `a colour not in the token file is a violation:\n  ${strays.join('\n  ')}`);
});

test('F2 · the carve-out holds: every content tone is a decor\'s OWN colour', () => {
  const decors = decorHexes();
  for (const c of COLLECTIONS) {
    const own = decors.get(c.frontDecor);
    assert.ok(own, `${c.id} names a front decor the catalogue does not have: ${c.frontDecor}`);
    assert.equal(c.tone.toLowerCase(), own,
      `${c.id}'s tone ${c.tone} is not ${c.frontDecor}'s own colour ${own}`);
  }
  // …and not one collection names a decor that is not in the app already.
  const missing = collectionDecorIds().filter((id) => !decors.has(id));
  assert.deepEqual(missing, [], `collections name decors the catalogue has not got: ${missing.join(', ')}`);
  assert.equal(DEFAULT_COLLECTION.id, 'ivory-and-onyx');
  assert.equal(COLLECTIONS.length, 4);
});

// ─── AMENDED BY T61 F5 ──────────────────────────────────────────────────────
//
// The owner, ordering the typed fields that replace the sliders: *"kratki do
// wpisywania rogi pieknie zaokraglone a nie kanciaki, ze zlota obwodka a nie
// jakis dziwny pomarancz."*
//
// So ONE element in the system is rounded, and it is rounded by a token of its
// own — `--pbi-field-radius`, declared beside `--pbi-radius` in tokens.css,
// which stays 0 and is still asserted to be 0 by the token test above. The law
// this test exists to keep is unchanged in substance: a radius may not be a
// number typed into a rule. It must be one of the two tokens, and a third
// value is still a violation.
test('F2 · zero border-radius — bar the owner\'s own field — and no gradient anywhere', () => {
  const bad = [];
  for (const file of filesUnder(RETAIL)) {
    const rel = relative(ROOT, file);
    const text = code(file);
    for (const m of text.matchAll(/border-?[Rr]adius\s*[:=]\s*['"]?([^,;'"}\n]+)/g)) {
      const value = m[1].trim();
      if (!/^(0|var\(--pbi-radius\)|var\(--pbi-field-radius\))$/.test(value)) {
        bad.push(`${rel}: border-radius ${value}`);
      }
    }
    for (const m of text.matchAll(/linear-gradient|radial-gradient|conic-gradient/g)) {
      bad.push(`${rel}: ${m[0]}`);
    }
  }
  assert.deepEqual(bad, [], `radius 0, no gradients:\n  ${bad.join('\n  ')}`);
});

test('F2 · no #FFFFFF as a background, anywhere on the PBI side', () => {
  const bad = [];
  for (const file of filesUnder(RETAIL)) {
    const text = code(file).toLowerCase();
    if (/#fff\b|#ffffff\b/.test(text)) bad.push(relative(ROOT, file));
  }
  assert.deepEqual(bad, [], `white is not in the palette: ${bad.join(', ')}`);
});

test('F2 · the fonts arrive by <link>, and never by npm', () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const fontish = Object.keys(deps).filter((d) => /font|cormorant|inter/i.test(d));
  assert.deepEqual(fontish, [], `a font came in through npm: ${fontish.join(', ')}`);

  const retail = readFileSync(join(ROOT, 'retail.html'), 'utf8');
  assert.match(retail, /fonts\.googleapis\.com\/css2\?family=Cormorant\+Garamond/);
  assert.match(retail, /family=Inter/);
  assert.match(retail, /src="\/src\/retail\/main-retail\.jsx"/);

  // PRO's entry is untouched and gains no font of its own.
  const pro = readFileSync(join(ROOT, 'index.html'), 'utf8');
  assert.ok(!/fonts\.googleapis\.com/.test(pro), 'PRO must not learn a webfont this turn');
});

test('F2 · the three entries exist and point at their own module', () => {
  const config = readFileSync(join(ROOT, 'vite.config.js'), 'utf8');
  for (const entry of ['index.html', 'retail.html', 'start.html']) {
    assert.match(config, new RegExp(`entry\\('${entry.replace('.', '\\.')}'\\)`), `${entry} is not a build input`);
  }
  const start = readFileSync(join(ROOT, 'start.html'), 'utf8');
  assert.match(start, /src="\/src\/retail\/main-launch\.jsx"/);
  // F1.3: `/` keeps opening PRO exactly as today.
  assert.match(readFileSync(join(ROOT, 'index.html'), 'utf8'), /src="\/src\/main\.jsx"/);
});

test('F6 · eight routes, and not one of them 404s', () => {
  assert.deepEqual(ROOTS_SORTED(), [
    // T64 F5: `/estimate` — MY ESTIMATE, its own page (PSW's EstimatesPage).
    '/', '/about', '/collections', '/contact', '/design', '/design-process', '/estimate', '/journal', '/materials',
  ]);
  // An unknown path is the landing page, not an error.
  assert.equal(parseHash('#/nowhere').path, '/');
  assert.equal(parseHash('#/nowhere').unknown, true);
  assert.equal(parseHash('').path, '/');
  assert.equal(parseHash('#/design?collection=black-label').path, '/design');
  assert.equal(parseHash('#/design?collection=black-label').query.collection, 'black-label');
  assert.equal(parseHash('#/collections/').path, '/collections');
  assert.equal(typeof go, 'function');

  for (const path of ['/materials', '/design-process', '/about', '/journal']) {
    assert.ok(COPY_PAGES[path], `${path} has no page`);
    assert.equal(COPY_PAGES[path].paragraphs.length, 2, `${path} wants two paragraphs`);
  }
});

const ROOTS_SORTED = () => [...ROUTES].sort();

test('F5.1 · there is not a price anywhere on the PBI side', () => {
  const bad = [];
  for (const file of filesUnder(RETAIL)) {
    const rel = relative(ROOT, file);
    const text = code(file);
    for (const m of text.matchAll(/[£$€]\s?[\d.,]+/g)) bad.push(`${rel}: ${m[0]}`);
  }
  assert.deepEqual(bad, [], `no price law exists yet — every slot says "${PRICE_ON_REQUEST}":\n  ${bad.join('\n  ')}`);
  assert.equal(PRICE_ON_REQUEST, 'Price on request');
  assert.match(QUOTE_EMAIL, /@/);
  // The form's five fields, read off the component's own source — node cannot
  // import a .jsx, and the shape matters more than the import does.
  const form = readFileSync(join(ROOT, 'src/retail/ui/QuoteForm.jsx'), 'utf8');
  for (const field of ['name', 'email', 'phone', 'postcode', 'message']) {
    assert.match(form, new RegExp(`data-testid=\\{?\`?field-\\$?\\{?key\\}?\`?|'${field}'`),
      `the quote form has no ${field}`);
  }
});

test('F3.6 · what the client never sees, is not there', () => {
  // *"No BOM, CNC, DXF, drilling, Check panel, X-ray, Outlines toggle, article
  // numbers, part prices, PRO menus, 'MOCK DATA MODE', build stamp."*
  //
  // Two scopes, because the ban has two strengths. PRO's own artefacts must be
  // absent from the WHOLE retail tree; the workshop's vocabulary must be absent
  // from the DESIGN ROOM, which is where F3.6 is written and what a client
  // actually stands in. The switch page names PRO's features on purpose — it is
  // the door marked PRO — and the landing page's own craftsmanship column says
  // "Cut on our CNC" because the brief's F2.4 says exactly that.
  const bad = [];

  // ─── AMENDED BY T60 F2, ON THE OWNER'S OWN ORDER ────────────────────────
  //
  // t59 banned X-ray and the Outlines toggle from the retail tree outright,
  // and t59 was right to: F3.6 listed them among the things a client never
  // sees. T60's brief overrules that in the owner's own words —
  //
  //   *"nr 4 musi być identyczne jak mamy w PRO, identyczne ma mieć funkcje."*
  //
  // — and names them in the bar: *"Show/Hide dimensions · Front dimensions ·
  // Outlines · X-ray · Hide fronts · Measure …"*. So the two names are allowed
  // in the TWO files that carry the bar, and nowhere else. Everything else the
  // ban covered is untouched, and BOM is still banned from the room's own
  // components — it survives only in `viewTools.js`, which is the list of what
  // is DELIBERATELY ABSENT behind `RETAIL_SHOW_WORKSHOP_TOOLS`.
  const BAR = new Set(['src/retail/design/ViewBar.jsx', 'src/retail/design/viewTools.js']);
  const NEVER = [/MOCK DATA MODE/, /__BUILD_STAMP__/, /\bxray\b/i, /showOutlines/, /CheckPanel/];
  for (const file of filesUnder(RETAIL)) {
    const rel = relative(ROOT, file);
    if (BAR.has(rel)) continue;
    // ─── AMENDED BY T63 ────────────────────────────────────────────────────
    // A COPY of a PRO window (`scripts/t63-copies.mjs`, per file and per PRO
    // original) reads `xray` off the store because PRO's file does — the
    // lighting panel greys its demo behind it, the door modal says what an
    // X-ray shows. A word-ban over a verbatim copy is a ban on copying, and
    // this turn's law is that the copy wins. Every other retail file still
    // answers to the whole list.
    if (isCopy(rel)) continue;
    const text = code(file);
    for (const re of NEVER) if (re.test(text)) bad.push(`${rel}: ${re}`);
  }

  // ─── AMENDED AGAIN BY T62 F2, ON THE OWNER'S OWN ORDER ──────────────────
  //
  // The owner, 01.09.2026: *"jak piszę 1 do 1 to KOPIUJ. ale kopiuj — nie
  // kasuj, nie zmieniaj PRO, tylko zrób identycznie w retail."* T62's brief
  // then names the control by name: *"**Import DXF plan** if PRO's file offers
  // it — copied"*, under the line that decides the argument in advance —
  // *"Do not delete a control because 'a client would not need it'. That
  // judgement already cost this project a turn."*
  //
  // `src/retail/design/room/` is that copy: four files taken from
  // `src/components/`, byte for byte bar their imports and their class names.
  // A word-ban over a VERBATIM COPY is a ban on copying, and this turn's law
  // is that the copy wins. So the copied editor is exempt from the
  // room-vocabulary list — and from nothing else: the hex law, the radius law,
  // the price law and the NEVER list above all still walk these four files,
  // and `test/turn62-f2-f3-the-copy.test.js` proves the copy is a copy.
  //
  // It is a CARVE-OUT, not a deletion: every other file under
  // `src/retail/design/` still answers to the whole list, and the day someone
  // writes "DXF" into `Options.jsx` this test still fails.
  //
  // The button is not merely tolerated, either — it WORKS. `proposeRoomFromDxf`
  // lives in `src/engine/dxfImport.js`, which is shared core on both sides of
  // the boundary, so nothing about the handler is workshop-only and the
  // brief's "greys with the reason" clause never had to fire.
  // …and the carve-out is kept HONEST, the same way T60's was. It is not the
  // DIRECTORY that is exempt — it is a file that HAS A PRO ORIGINAL of the same
  // name. `RoomEditor.jsx` sits in the same folder and is retail's own work, so
  // it answers to the whole list like every other retail file, and the day
  // somebody writes a new "DxfPanel.jsx" in there the ban still catches it.
  // ─── AND WIDENED BY T63, THE SAME WAY ──────────────────────────────────
  // Twenty-one more files, under `design/{lighting,detail,material}/`, each
  // one a PRO original of the same name; `scripts/t63-copies.mjs` is the list
  // and the same per-file, per-original honesty holds: `Entries.jsx`,
  // `MaterialSlot.jsx` and `MaterialsModal.jsx` sit in the same folders, are
  // retail's own work, and answer to the whole list.
  const copiedFromPro = (rel) => (rel.startsWith('src/retail/design/room/')
    && existsSync(join(ROOT, 'src/components', rel.split('/').pop()))) || isCopy(rel);

  const NOT_IN_THE_ROOM = [/\bBOM\b/, /\bDXF\b/, /drilling/i, /article number/i];
  for (const file of filesUnder(join(RETAIL, 'design'))) {
    const rel = relative(ROOT, file);
    if (rel === 'src/retail/design/viewTools.js') continue;
    if (copiedFromPro(rel)) continue;
    const text = code(file);
    for (const re of NOT_IN_THE_ROOM) if (re.test(text)) bad.push(`${rel}: ${re}`);
  }

  // The carve-out must also be USED, or it is dead law nobody notices rotting:
  // the four copies are there, and one of them really does carry the word the
  // ban would otherwise have deleted.
  assert.ok(copiedFromPro('src/retail/design/room/RoomModal.jsx'),
    'the copied room editor is missing — F2 of turn 62 did not land');
  assert.ok(/Import DXF plan/.test(code(join(ROOT, 'src/retail/design/room/RoomModal.jsx'))),
    "the copy dropped PRO's Import DXF plan — the whole point of the carve-out");
  assert.ok(!copiedFromPro('src/retail/design/room/RoomEditor.jsx'),
    'RoomEditor.jsx is retail\'s own and must NOT be exempt');

  // …and the exception is kept HONEST: the two bar files may name the two
  // lenses, and the client-facing string is still never the workshop's.
  const bar = code(join(ROOT, 'src/retail/design/viewTools.js'));
  assert.ok(/RETAIL_SHOW_WORKSHOP_TOOLS/.test(code(join(ROOT, 'src/retail/design/ViewBar.jsx'))),
    'the workshop tools must be behind the flag, not deleted');
  assert.ok(/WORKSHOP_TOOLS/.test(bar), 'BOM survives only as the list of what is absent');

  assert.deepEqual(bad, [], `a client never sees these:\n  ${bad.join('\n  ')}`);
});
