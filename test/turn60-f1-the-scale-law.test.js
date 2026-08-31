// ─── TURN 60 · F1 — THE SCALE LAW: ONE NUMBER, EVERY DIMENSION ─────────────
//
// The owner, after the first live look at the design room (31.08):
//
//   *"ludzie mają małe komputery, laptopy, iPady — będzie do dupy widać jak
//   wszystko będzie 25% większe."*
//
// and, of the RAIL: *"nr 2 może być spokojnie 15% węższe."*
//
// CLAUDE.md F1 turns that into an arithmetic rather than a preference:
//
//   1. `--pbi-scale: clamp(0.78, calc(0.78 + (100vw - 1280px) * 0.00017), 1)`
//   2. EVERY dimension in the room is `calc(<base> * var(--pbi-scale))`
//   3. the RAIL's base is 187px (220 × 0.85)
//   4. no rendered text below 11px at scale 0.78
//
// ─── WHAT THIS FILE CAN AND CANNOT PROVE ───────────────────────────────────
//
// It proves the SOURCE: the formula, the bases, and — the part that actually
// decays — that no raw pixel survives anywhere in the design room, in its
// stylesheet or in its components. A dimension written inline is a dimension
// that does not scale, and t59 wrote eight files of them.
//
// What it cannot prove is the PICTURE. `verify/t60/f1-scale-2560.png`,
// `f1-scale-1728.png` and `f1-scale-1280.png` are that, each shot in its OWN
// browser window at that width — because device-metrics emulation does not move
// `window.innerWidth`, which is the t59 walk's fifth lesson and cost it a night.

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('../', import.meta.url).pathname;
const RETAIL = join(ROOT, 'src/retail');
const SCALE = join(RETAIL, 'styles/scale.css');
const ROOM = join(RETAIL, 'styles/room.css');

const read = (p) => readFileSync(p, 'utf8');

/** Comments out. A paragraph of argument is prose, not a pixel. */
const stripComments = (text) => text
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^[ \t]*\/\/.*$/gm, ' ');

function filesUnder(dir, re = /\.(js|jsx|css)$/) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir).sort()) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out.push(...filesUnder(path, re));
    else if (re.test(path)) out.push(path);
  }
  return out;
}

// ─── 1 · THE FORMULA ───────────────────────────────────────────────────────

test('F1.1 · one scale, and it is the brief\'s own arithmetic', () => {
  const css = read(SCALE);
  // ─── THE FORMULA, IN PX ─────────────────────────────────────────────────
  //
  // CLAUDE.md F1.1 writes the terms as plain numbers. That expression has no
  // CSS type — `0.78 + <length>` is invalid — and the browser showed what it
  // costs: the property is invalid at computed-value time, every dimension
  // reading it falls back to its initial value, and the room lays itself out
  // on content widths. The RAIL measured 303px at 2560 where 187 was wanted.
  //
  // Every term is in px now, so the whole expression is a length; the
  // ARITHMETIC is character-for-character the brief's. A base is a plain
  // number, because number × length is a length.
  assert.match(
    css,
    /--pbi-scale:\s*clamp\(0\.78px,\s*calc\(0\.78px \+ \(100vw - 1280px\) \* 0\.00017\),\s*1px\)/,
    'the scale is not the formula CLAUDE.md F1.1 states',
  );
  // …and not one dimension multiplies a LENGTH by it, which is the mistake
  // that made the whole thing invisible.
  assert.ok(!/px \* var\(--pbi-scale\)/.test(css),
    'a base is still a length — number × length is a length, length × length is not');

  // …and the arithmetic lands where the brief says it lands. Read here rather
  // than trusted: a formula whose endpoints are wrong is a formula nobody
  // checked.
  const at = (vw) => Math.min(1, Math.max(0.78, 0.78 + (vw - 1280) * 0.00017));
  assert.equal(Math.round(at(2560) * 100) / 100, 1, '1.00 at 2560 — the owner\'s monitor');
  assert.equal(Math.round(at(1728) * 100) / 100, 0.86, '≈0.86 at 1728');
  assert.equal(at(1280), 0.78, '0.78 at 1280');
  assert.equal(at(900), 0.78, '…and it does not go below the floor');

  // The reference width is NAMED, so the next reader knows what 1.0 means.
  assert.match(css, /2560/, 'the reference width is not named in a comment');
});

test('F1.3 · the RAIL narrows 15%, and every column scales', () => {
  const css = read(SCALE);
  const base = (name) => {
    const m = css.match(new RegExp(`${name}:\\s*calc\\((\\d+(?:\\.\\d+)?) \\* var\\(--pbi-scale\\)\\)`));
    assert.ok(m, `${name} is not a scaled calc()`);
    return Number(m[1]);
  };
  assert.equal(base('--pbi-col-categories'), 187, '220 × 0.85 — the owner\'s 15%');
  assert.equal(base('--pbi-col-options'), 320, '*"nr 3 zostaw jak jest"*');
  assert.equal(base('--pbi-col-detail'), 300);
  assert.equal(Math.round(220 * 0.85), 187, 'the 15% is the arithmetic, not a taste');
});

// ─── 2 · THE TYPE FLOOR ────────────────────────────────────────────────────

test('F1.4 · no rendered text below 11px at scale 0.78', () => {
  const css = read(SCALE);
  const sizes = [...css.matchAll(
    /(--pbi-fs-[\w-]+):\s*max\((\d+(?:\.\d+)?)px,\s*calc\((\d+(?:\.\d+)?) \* var\(--pbi-scale\)\)\)/g,
  )];
  assert.ok(sizes.length >= 8, `only ${sizes.length} type tokens — the scan is broken, not the CSS`);

  const bad = [];
  for (const [, name, floor, base] of sizes) {
    const at1280 = Math.max(Number(floor), Number(base) * 0.78);
    if (at1280 < 11) bad.push(`${name} → ${at1280.toFixed(2)}px at 1280`);
    // …and the floor itself may never be under 11 either, or a future base
    // change would sink through it in silence.
    if (Number(floor) < 11) bad.push(`${name} has a ${floor}px floor`);
  }
  assert.deepEqual(bad, [], `text under 11px at the scale floor:\n  ${bad.join('\n  ')}`);

  // The two smallest voices — the STAGE HINT and a chip's label — must land in
  // 11–12px there rather than ON the floor: a token that only ever reaches its
  // minimum has stopped scaling.
  for (const name of ['--pbi-fs-ui', '--pbi-fs-ui-sm']) {
    const hit = sizes.find(([, n]) => n === name);
    assert.ok(hit, `${name} is missing`);
    const at1280 = Number(hit[3]) * 0.78;
    assert.ok(at1280 >= 11 && at1280 <= 12,
      `${name} lands at ${at1280.toFixed(2)}px at 1280 — F1.4 asks for 11–12`);
  }
});

// ─── 3 · NO RAW DIMENSION SURVIVES IN THE ROOM ─────────────────────────────

test('F1.2 · not one raw pixel in the design room\'s own stylesheet', () => {
  const css = stripComments(read(ROOM));
  const bad = [];
  for (const m of css.matchAll(/(-?\d+(?:\.\d+)?)px/g)) {
    // A HAIRLINE is a hairline at every scale — half a pixel of Stone Line is
    // not a line. That is the whole of the allowance, and 0 needs no unit.
    if (m[1] === '1') continue;
    const at = css.slice(Math.max(0, m.index - 60), m.index + 20).replace(/\s+/g, ' ');
    bad.push(`${m[0]} — …${at}`);
  }
  assert.deepEqual(bad, [], `room.css holds a raw dimension:\n  ${bad.join('\n  ')}`);

  // …and every measurement it DOES use is a token, so there is exactly one
  // file to change.
  assert.ok(css.includes('var(--pbi-'), 'room.css uses no tokens at all — the scan is wrong');
});

test('F1.2 · nor in any component of the design room', () => {
  const bad = [];
  // A style prop with a NUMBER in it (`fontSize: 10`) is a pixel React writes
  // for you, and it is the form t59 actually used — so it is caught by name
  // rather than by hunting for the letters "px".
  const NUMERIC = new RegExp(
    '\\b(fontSize|lineHeight|padding|paddingTop|paddingRight|paddingBottom|paddingLeft'
    + '|margin|marginTop|marginRight|marginBottom|marginLeft|gap|rowGap|columnGap'
    + '|width|minWidth|maxWidth|height|minHeight|maxHeight'
    + '|top|right|bottom|left|borderWidth|borderRadius|letterSpacing)'
    + '\\s*:\\s*[-\\d]',
    'g',
  );
  for (const file of filesUnder(join(RETAIL, 'design'), /\.jsx?$/)) {
    const text = stripComments(read(file));
    const rel = relative(ROOT, file);
    for (const m of text.matchAll(NUMERIC)) bad.push(`${rel}: ${m[0].trim()}`);
    for (const m of text.matchAll(/(-?\d+(?:\.\d+)?)px/g)) {
      if (m[1] === '1' || m[1] === '0') continue;
      bad.push(`${rel}: ${m[0]}`);
    }
  }
  assert.deepEqual(bad, [], `a design-room component writes its own dimension:\n  ${bad.join('\n  ')}`);
});

test('F1.2 · …and the SVG drawings are shapes, not sizes', () => {
  // A `viewBox` is a coordinate space and scales with nothing; a `width` on the
  // element is a size and must come from a class. Checked because it is the one
  // place a dimension can hide behind an attribute rather than a style.
  for (const rel of ['design/FrontThumb.jsx', 'design/detail/drawings.jsx']) {
    const text = read(join(RETAIL, rel));
    assert.match(text, /viewBox/, `${rel} has no viewBox`);
    assert.ok(!/<svg[^>]*\swidth=/.test(text), `${rel} sizes an <svg> by attribute`);
    //  may be written as an attribute or spread from a props object;
    // what matters is that the size comes from the stylesheet.
    assert.match(text, /pbi-mini/, `${rel} does not take its size from a class`);
  }
});

// ─── 4 · THE ROOM'S SCALE IS THE ROOM'S ────────────────────────────────────

test('F1.1 · the marketing pages keep their own rhythm', () => {
  const css = read(SCALE);
  // Everything but the scale itself is scoped to `.pbi-room`, so a landing
  // page's 56px headline is not 44px because somebody opened a laptop.
  const rootBlock = css.slice(css.indexOf(':root {'), css.indexOf('}', css.indexOf(':root {')));
  const declared = [...rootBlock.matchAll(/(--pbi-[\w-]+):/g)].map((m) => m[1]);
  assert.deepEqual(declared, ['--pbi-scale'], ':root may declare the scale and nothing else');
  assert.match(css, /\.pbi-room \{/, 'the room\'s measurements are not scoped to the room');

  // …and the app puts that class on only while the room is the route.
  const app = read(join(RETAIL, 'RetailApp.jsx'));
  assert.match(app, /className=\{inRoom \? 'pbi-room' : undefined\}/,
    'RetailApp does not scope the room\'s scale to the room');

  // The five measurements that MOVED are not left behind in tokens.css: two
  // homes for one number is how they drift.
  const tokens = read(join(RETAIL, 'styles/tokens.css'));
  for (const name of ['--pbi-col-categories', '--pbi-col-options', '--pbi-col-detail',
    '--pbi-view-bar-h', '--pbi-header-h-room']) {
    assert.ok(!new RegExp(`${name}\\s*:`).test(tokens), `${name} is still in tokens.css as well`);
  }
});

test('F1 · every stylesheet the retail app loads is loaded by the retail app', () => {
  const entry = read(join(RETAIL, 'main-retail.jsx'));
  for (const sheet of ['tokens.css', 'base.css', 'scale.css', 'room.css']) {
    assert.match(entry, new RegExp(`import './styles/${sheet}'`), `${sheet} is never imported`);
  }
  // Order matters: the room overrides base, and both read the tokens.
  const at = (s) => entry.indexOf(`styles/${s}`);
  assert.ok(at('tokens.css') < at('base.css'), 'tokens must come before base');
  assert.ok(at('base.css') < at('scale.css'), 'the scale must come after base');
  assert.ok(at('scale.css') < at('room.css'), 'room.css must be able to override base.css');
});
