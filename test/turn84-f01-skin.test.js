/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T84 F1 . THE SKIN (slice D1)
//
// CLAUDE.md T84 F1: *"`components/studio/studio.css`: the designer's compiled tokens from Stage-1
// (`shell-900/800/700/600`, `ink-50/100/200/400`, `gold`, `gold-hover`, `gold-dark`, `warn`,
// `danger`, `ok`), the scale 13 px text, 30 px fields, 32 px buttons, 4 px radius, the rail, the
// context strip, the inspector, the status bar, the popup, the floating window, the toast (every
// number in `profile.ui.studio` and read from there into CSS variables at mount, not typed
// twice). Scoped under `.studio-pro`; the classes `cc-btn`, `cc-input`, `cc-label`, `cc-frame`
// keep their meaning. `StudioIcons.jsx`: the Stage-1 SVG symbols as one sprite component."*
//
// Tested the way node can: the pure module (lib/studioSkin.js) by what it returns; the stylesheet
// and the sprite by their source (a test never imports a .jsx file); and the stylesheet once more
// through the repo's own PostCSS, because a theme() that does not resolve is a shell with no
// colours. The frames beside the designer's HTML are the walk's (verify/t84/f01-skin-*.png).

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

import tailwindConfig from '../tailwind.config.js';
import postcssConfig from '../postcss.config.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { studioCssVars, studioWidths } from '../src/components/studio/lib/studioSkin.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');

const CSS_PATH = 'src/components/studio/studio.css';
const ICONS_PATH = 'src/components/studio/StudioIcons.jsx';
const SKIN_PATH = 'src/components/studio/lib/studioSkin.js';
const SELF_PATH = 'test/turn84-f01-skin.test.js';
const STAGE1_PATH = 'verify/t84/astra/Cabinet-Core-PRO-Studio-Stage-1.html';

const CSS = read(CSS_PATH);
const ICONS = read(ICONS_PATH);

// The profile's numbers (INT's `profile.ui.studio`): read, typed once below where THE NUMBERS pins them.
const S = P.ui.studio;

// --- a little reading of CSS: flat rules (studio.css has no at-rules), selectors split at the top level

const uncomment = (css) => css.replace(/\/\*[\s\S]*?\*\//g, ' ');

/** `a, b:is(c, d)` -> ['a', 'b:is(c, d)']: commas inside parentheses stay. */
function splitSelectors(text) {
  const out = [];
  let depth = 0;
  let cur = '';
  for (const ch of text) {
    if (ch === '(') depth += 1;
    if (ch === ')') depth -= 1;
    if (ch === ',' && depth === 0) { out.push(cur.trim()); cur = ''; } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

function rulesOf(css) {
  return [...uncomment(css).matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, head, body]) => ({
    selectors: splitSelectors(head.trim()),
    decls: body.split(';').map((d) => d.trim()).filter(Boolean).map((d) => {
      const at = d.indexOf(':');
      return [d.slice(0, at).trim(), d.slice(at + 1).trim()];
    }),
  }));
}

const RULES = rulesOf(CSS);
const ruleFor = (selector) => RULES.find((r) => r.selectors.includes(selector));
/** A property of a selector as the cascade reads it in this one file: the last one written wins. */
const declOf = (selector, prop) => {
  const rules = RULES.filter((r) => r.selectors.includes(selector));
  assert.ok(rules.length, `studio.css has no rule for ${selector}`);
  return rules.flatMap((r) => r.decls).filter(([p]) => p === prop).pop()?.[1];
};

/** Every px number THE NUMBERS holds: a key of profile.ui.studio that ends in Px, at any depth. */
function profilePxNumbers(node, out = new Set()) {
  for (const [key, value] of Object.entries(node)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) profilePxNumbers(value, out);
    else if (/Px$/.test(key) && typeof value === 'number') out.add(value);
  }
  return out;
}

// --- 1. the inputs: THE NUMBERS, in the profile ---------------------------------------------------

test('F1 . the numbers the skin reads are the profile\'s, as THE NUMBERS table holds them tonight', () => {
  assert.equal(S.enabled, true, 'Studio on for PRO, no UI switch (the owner, 16:27: "nie, juz jest przy wyborze")');
  assert.deepEqual(S.scale, { textPx: 13, fieldPx: 30, buttonPx: 32, radiusPx: 4 }, 'the scale, CONFIRMED');
  assert.deepEqual(S.bars, { topPx: 48, contextPx: 34, statusPx: 30 }, 'the bars, PROPOSED');
  assert.deepEqual(S.rail, { widePx: 112, narrowPx: 56, labelsFromPx: 1440 }, 'the rail, PROPOSED');
  assert.deepEqual(S.inspector, {
    quickPx: 344, quickNarrowPx: 316, quickNarrowBelowPx: 1440, fullPx: 400, fullNarrowPx: 360, fullNarrowBelowPx: 1500,
  }, 'the quick card and the full panel, PROPOSED');
  assert.deepEqual(S.issues, { warn: '#d9a441', danger: '#c9524b', textPx: 13 }, 'the issue colours, PROPOSED');
  assert.deepEqual(S.marker, { sizePx: 16 });
  assert.equal(S.libraryGapPx, 8);
  // The designer's palette IS the house's status palette: one warn, one danger in the app.
  const status = tailwindConfig.theme.extend.colors.status;
  assert.equal(S.issues.warn.toLowerCase(), status.warn.toLowerCase());
  assert.equal(S.issues.danger.toLowerCase(), status.danger.toLowerCase());
});

// --- 2. studioWidths ------------------------------------------------------------------------------

test('F1 . studioWidths at the walk\'s three sizes and at both breakpoints: rail 56 / 112 and its labels, quick 316 / 344, full 360 / 400', () => {
  const R = S.rail;
  const I = S.inspector;
  const W = (w) => studioWidths(P, w);
  assert.deepEqual(W(1280), { railPx: R.narrowPx, railLabels: false, quickPx: I.quickNarrowPx, fullPx: I.fullNarrowPx });
  assert.deepEqual(W(1440), { railPx: R.widePx, railLabels: true, quickPx: I.quickPx, fullPx: I.fullNarrowPx });
  assert.deepEqual(W(1499), { railPx: R.widePx, railLabels: true, quickPx: I.quickPx, fullPx: I.fullNarrowPx });
  assert.deepEqual(W(1500), { railPx: R.widePx, railLabels: true, quickPx: I.quickPx, fullPx: I.fullPx });
  assert.deepEqual(W(1920), { railPx: R.widePx, railLabels: true, quickPx: I.quickPx, fullPx: I.fullPx });
  // In tonight's numbers, the five widths read:
  assert.deepEqual([1280, 1440, 1499, 1500, 1920].map((w) => Object.values(W(w))), [
    [56, false, 316, 360], [112, true, 344, 360], [112, true, 344, 360], [112, true, 344, 400], [112, true, 344, 400],
  ]);
  // "Below" is strict, at the profile's own breakpoints (whatever the owner moves them to).
  assert.equal(W(R.labelsFromPx - 1).railLabels, false);
  assert.equal(W(R.labelsFromPx).railLabels, true);
  assert.equal(W(I.quickNarrowBelowPx - 1).quickPx, I.quickNarrowPx);
  assert.equal(W(I.quickNarrowBelowPx).quickPx, I.quickPx);
  assert.equal(W(I.fullNarrowBelowPx - 1).fullPx, I.fullNarrowPx);
  assert.equal(W(I.fullNarrowBelowPx).fullPx, I.fullPx);
});

// --- 3. studioCssVars -----------------------------------------------------------------------------

const CONTRACT_VARS = [
  '--studio-text', '--studio-field', '--studio-button', '--studio-radius', '--studio-top', '--studio-context',
  '--studio-status', '--studio-rail', '--studio-inspector', '--studio-warn', '--studio-danger', '--studio-issue-text',
  '--studio-marker', '--studio-library-gap',
];

test('F1 . studioCssVars: the contract\'s fourteen variables, each from the profile', () => {
  const v = studioCssVars(P, { viewportWidth: 1920, inspector: 'quick' });
  assert.deepEqual(Object.keys(v).sort(), [...CONTRACT_VARS].sort());
  assert.deepEqual(v, {
    '--studio-text': `${S.scale.textPx}px`,
    '--studio-field': `${S.scale.fieldPx}px`,
    '--studio-button': `${S.scale.buttonPx}px`,
    '--studio-radius': `${S.scale.radiusPx}px`,
    '--studio-top': `${S.bars.topPx}px`,
    '--studio-context': `${S.bars.contextPx}px`,
    '--studio-status': `${S.bars.statusPx}px`,
    '--studio-rail': `${S.rail.widePx}px`,
    '--studio-inspector': `${S.inspector.quickPx}px`,
    '--studio-warn': S.issues.warn,
    '--studio-danger': S.issues.danger,
    '--studio-issue-text': `${S.issues.textPx}px`,
    '--studio-marker': `${S.marker.sizePx}px`,
    '--studio-library-gap': `${S.libraryGapPx}px`,
  });
  // The inspector's column: the card, the panel, or nothing.
  const at = (viewportWidth, inspector) => studioCssVars(P, { viewportWidth, inspector })['--studio-inspector'];
  assert.equal(at(1920, 'full'), `${S.inspector.fullPx}px`);
  assert.equal(at(1280, 'quick'), `${S.inspector.quickNarrowPx}px`);
  assert.equal(at(1280, 'full'), `${S.inspector.fullNarrowPx}px`);
  assert.equal(at(1440, 'full'), `${S.inspector.fullNarrowPx}px`);
  assert.equal(at(1440, 'none'), '0px');
  assert.equal(at(1440, undefined), '0px', 'no inspector column at all is a column of 0');
  assert.equal(studioCssVars(P, { viewportWidth: 1280, inspector: 'quick' })['--studio-rail'], `${S.rail.narrowPx}px`);
  assert.throws(() => studioCssVars(P, { viewportWidth: 1440, inspector: 'Full' }), /'quick', 'full', 'none'; it was given "Full"/);
});

test('F1 . studioCssVars follows the profile it is given: change a number, the variable follows', () => {
  const studio = structuredClone(S);
  studio.scale = { textPx: 14, fieldPx: 31, buttonPx: 36, radiusPx: 6 };
  studio.bars = { topPx: 52, contextPx: 36, statusPx: 28 };
  studio.rail = { widePx: 120, narrowPx: 60, labelsFromPx: 1600 };
  studio.inspector = { ...studio.inspector, quickPx: 350, fullPx: 420, fullNarrowBelowPx: 1700 };
  studio.issues = { warn: '#123456', danger: '#654321', textPx: 15 };
  studio.marker = { sizePx: 18 };
  studio.libraryGapPx = 10;
  const fixture = { ui: { studio } };
  const v = studioCssVars(fixture, { viewportWidth: 1650, inspector: 'quick' });
  assert.equal(v['--studio-text'], '14px');
  assert.equal(v['--studio-field'], '31px');
  assert.equal(v['--studio-button'], '36px');
  assert.equal(v['--studio-radius'], '6px');
  assert.equal(v['--studio-top'], '52px');
  assert.equal(v['--studio-context'], '36px');
  assert.equal(v['--studio-status'], '28px');
  assert.equal(v['--studio-rail'], '120px', '1650 is past the fixture\'s 1600: the wide rail');
  assert.equal(v['--studio-inspector'], '350px');
  assert.equal(v['--studio-warn'], '#123456');
  assert.equal(v['--studio-danger'], '#654321');
  assert.equal(v['--studio-issue-text'], '15px');
  assert.equal(v['--studio-marker'], '18px');
  assert.equal(v['--studio-library-gap'], '10px');
  assert.equal(studioCssVars(fixture, { viewportWidth: 1650, inspector: 'full' })['--studio-inspector'],
    `${studio.inspector.fullNarrowPx}px`, '1650 is under the fixture\'s 1700: the narrow panel');
  assert.deepEqual(studioWidths(fixture, 1599), {
    railPx: 60, railLabels: false, quickPx: 350, fullPx: studio.inspector.fullNarrowPx,
  });
});

test('F1 . a missing block, or a missing number, is said in a sentence that names it', () => {
  assert.throws(() => studioWidths({}, 1440), /profile\.ui\.studio is missing/);
  assert.throws(() => studioWidths(undefined, 1440), /profile\.ui\.studio is missing/);
  assert.throws(() => studioCssVars({ ui: {} }, { viewportWidth: 1440, inspector: 'quick' }), /profile\.ui\.studio is missing/);
  const broken = { ui: { studio: { ...structuredClone(S), rail: { widePx: 112, narrowPx: 56 } } } };
  assert.throws(() => studioWidths(broken, 1440), /profile\.ui\.studio\.rail\.labelsFromPx is not a number/);
  const noColour = { ui: { studio: { ...structuredClone(S), issues: { textPx: 13 } } } };
  assert.throws(() => studioCssVars(noColour, { viewportWidth: 1440, inspector: 'quick' }), /profile\.ui\.studio\.issues\.warn is not a colour/);
  assert.throws(() => studioWidths(P, undefined), /the window's width/);
  assert.throws(() => studioWidths(P, '1440'), /the window's width/);
});

// --- 4. studio.css: the numbers, the colours, the scope -------------------------------------------

test('F1 . studio.css types no number of THE NUMBERS and no colour: the variables and theme() carry them', () => {
  const code = uncomment(CSS).replace(/var\(\s*(--[\w-]+)\s*,[^()]*\)/g, 'var($1)');   // var() fallbacks are allowed
  const forbidden = profilePxNumbers(S);
  assert.ok(forbidden.size >= 15, `the profile walk found only ${[...forbidden]}`);
  const typed = [...code.matchAll(/(\d*\.?\d+)px/g)].map((m) => Number(m[1])).filter((n) => forbidden.has(n));
  assert.deepEqual(typed, [], `studio.css types a number of profile.ui.studio: ${typed.join(', ')}`);
  assert.doesNotMatch(code, /#[0-9a-fA-F]{3,8}\b/, 'a hex colour is typed: the theme or the profile holds every colour');
  assert.doesNotMatch(code, /\b(?:rgba?|hsla?)\(/, 'a colour function is typed: read theme() instead');
  // The breakpoints are the profile's, applied by the shell through studioWidths, never a media query.
  assert.doesNotMatch(code, /@media/);
  // Every text size is the profile's text, or a step of it.
  for (const rule of RULES) {
    for (const [prop, value] of rule.decls) {
      if (prop !== 'font-size') continue;
      assert.match(value, /^(?:var\(--studio-(?:text|issue-text)\)|calc\(var\(--studio-text\) [+-] \d+px\)|1rem)$/,
        `${rule.selectors[0]} sets font-size ${value}`);
    }
  }
  // Every corner is the profile's radius (a square strip at 0, the Check badge a pill).
  for (const rule of RULES) {
    for (const [prop, value] of rule.decls) {
      if (prop !== 'border-radius') continue;
      const pill = rule.selectors.includes('.studio-pro .studio-rail-badge') && value === '10px';
      assert.ok(value === 'var(--studio-radius)' || value === '0' || pill, `${rule.selectors[0]} rounds ${value}`);
    }
  }
});

test('F1 . the grid is the profile\'s: four bars, three columns, the scene a clipped slot', () => {
  assert.equal(declOf('.studio-pro', 'grid-template-rows'),
    'var(--studio-top) var(--studio-context) minmax(0, 1fr) var(--studio-status)');
  assert.equal(declOf('.studio-pro .studio-workspace', 'grid-template-columns'),
    'var(--studio-rail) minmax(0, 1fr) var(--studio-inspector)');
  assert.equal(declOf('.studio-pro .studio-scene', 'position'), 'relative');
  assert.equal(declOf('.studio-pro .studio-scene', 'overflow'), 'hidden');
  assert.equal(declOf('.studio-pro .studio-scene', 'min-width'), '0');
  assert.equal(declOf('.studio-pro[data-inspector="none"] .studio-inspector', 'display'), 'none');
  // The root hands nothing down: a legacy surface inside the shell inherits the page's base.
  for (const [prop] of ruleFor('.studio-pro').decls) {
    assert.ok(!['font', 'font-size', 'font-family', 'line-height', 'color', 'letter-spacing'].includes(prop),
      `the root sets ${prop}, which every legacy panel in the shell would inherit`);
  }
});

test('F1 . every rule is under .studio-pro; nothing here layers, transforms or contains', () => {
  for (const rule of RULES) {
    for (const sel of rule.selectors) {
      assert.match(sel, /^(?:\.studio-pro(?![\w-])|:where\(\.studio-pro )/, `a rule outside the Studio: ${sel}`);
    }
  }
  const props = RULES.flatMap((r) => r.decls.map(([p]) => p));
  for (const banned of ['z-index', 'transform', 'filter', 'backdrop-filter', 'contain', 'will-change', 'perspective', 'isolation']) {
    assert.ok(!props.includes(banned), `studio.css sets ${banned}: the one z-order is lib/modalLayer.js, and the `
      + 'inspector column must stay no stacking context nor containing block (verify/t84/p1-host.md B 13)');
  }
  // One container, and it is a leaf: the card's row (the refused sentence's measure). A row holds
  // no window, and no column, shell or slot above the RightPanel is ever one.
  const containers = RULES.filter((r) => r.decls.some(([p]) => p.startsWith('container'))).flatMap((r) => r.selectors);
  assert.deepEqual(containers, ['.studio-pro .studio-field-row']);
});

test('F1 . the house classes keep their meaning and take the scale only in a .studio-skin surface, never in a .cc-panel', () => {
  const HOUSE = /\.cc-(?:btn-gold|btn-ghost|btn|input|label|frame)(?![\w-])/;
  for (const rule of RULES) {
    for (const sel of rule.selectors) {
      const at = sel.search(HOUSE);
      if (at < 0) continue;
      // Only where a Studio surface holds it: a studio- class stands before the house class.
      assert.match(sel.slice(0, at).replace(/^\.studio-pro/, ''), /\.studio-[\w-]+/,
        `a house class restyled where no Studio surface holds it: ${sel}`);
    }
  }
  const BUTTONS = '.studio-pro .studio-skin :where(.cc-btn, .cc-btn-gold, .cc-btn-ghost):where(:not(.cc-panel *))';
  assert.equal(declOf(BUTTONS, 'height'), 'var(--studio-button)');
  assert.equal(declOf(BUTTONS, 'border-radius'), 'var(--studio-radius)');
  assert.equal(declOf(BUTTONS, 'font-size'), 'var(--studio-text)');
  const FIELDS = '.studio-pro .studio-skin :where(.cc-input):where(:not(textarea, .cc-panel *))';
  assert.equal(declOf(FIELDS, 'height'), 'var(--studio-field)');
  assert.equal(declOf(FIELDS, 'border-radius'), 'var(--studio-radius)');
  assert.equal(declOf(FIELDS, 'font-size'), 'var(--studio-text)');
  assert.equal(declOf('.studio-pro .studio-skin :where(.cc-frame):where(:not(.cc-panel *))', 'border-radius'), 'var(--studio-radius)');
  assert.ok(declOf('.studio-pro .studio-skin :where(.cc-label):where(:not(.cc-panel *))', 'font-size'));
  // The meaning stays the house's: a button's and a field's colours are index.css's.
  for (const sel of [BUTTONS, FIELDS]) {
    for (const [prop] of ruleFor(sel).decls) {
      assert.ok(!/^(?:color|background|background-color|border-color)$/.test(prop), `${sel} recolours (${prop})`);
    }
  }
  // ...and a button's side padding is the house's or its own utility's (S2's chips are `cc-btn px-2`):
  // the scale takes only what its height needs, the padding above and below.
  const buttonProps = ruleFor(BUTTONS).decls.map(([p]) => p);
  assert.ok(!buttonProps.some((p) => ['padding', 'padding-left', 'padding-right', 'padding-inline'].includes(p)),
    `the scale takes a button's side padding: ${buttonProps.join(', ')}`);
  assert.equal(declOf(BUTTONS, 'padding-top'), '0');
  assert.equal(declOf(BUTTONS, 'padding-bottom'), '0');
  // A legacy panel nested in a Studio surface is left alone: .cc-panel is named only to be skipped,
  // or to hand it back the page's base at no specificity.
  for (const rule of RULES) {
    for (const sel of rule.selectors) {
      if (!sel.includes('cc-panel')) continue;
      if (sel === ':where(.studio-pro .studio-skin .cc-panel)') {
        assert.deepEqual(rule.decls.map(([p]) => p).sort(), ['color', 'font-size', 'line-height']);
        continue;
      }
      assert.doesNotMatch(sel.replace(/:not\([^()]*\)/g, ''), /cc-panel/, `a rule reaches into a legacy panel: ${sel}`);
    }
  }
});

// --- 5. the vocabulary, every class of CONTRACT 3 -------------------------------------------------

const VOCABULARY = [
  // Root and bars
  'studio-pro', 'studio-topbar', 'studio-wordmark', 'studio-pro-label', 'studio-project-name', 'studio-legacy-menu',
  'studio-context', 'studio-breadcrumb', 'studio-selection-scope', 'studio-statusbar',
  // Workspace
  'studio-workspace', 'studio-rail', 'studio-rail-text', 'studio-rail-separator', 'studio-rail-bottom',
  'studio-rail-caption', 'studio-rail-badge', 'studio-scene', 'studio-scene-tools', 'studio-scene-toggles',
  'studio-scene-links', 'studio-inspector',
  // Card
  'studio-inspector-head', 'studio-object-title', 'studio-object-id', 'studio-object-thumb', 'studio-scope-row',
  'studio-scope-pill', 'studio-inspector-body', 'studio-card-section-title', 'studio-field-row', 'studio-value-wrap',
  'studio-unit', 'studio-value-action', 'studio-readonly-value', 'studio-inheritance', 'studio-inline-note',
  'studio-card-actions', 'studio-inspector-bottom', 'studio-full-head', 'studio-empty-state',
  // Popups
  'studio-popup', 'studio-popup-head', 'studio-menu-item', 'studio-library-item',
  // Issues
  'studio-issue-strip', 'studio-counter', 'studio-marker', 'studio-refused', 'studio-refused-reason',
  // Scene, icons, the surface
  'studio-toggle', 'studio-icon', 'studio-icon-btn', 'studio-skin',
  // CLAUDE.md F1 names them too: the floating window and the toast
  'studio-floating-window', 'studio-window-head', 'studio-window-body', 'studio-window-actions', 'studio-toast',
];

test('F1 . every class of the contract\'s vocabulary is styled, with its modifiers', () => {
  const selectors = RULES.flatMap((r) => r.selectors).join('\n');
  const missing = VOCABULARY.filter((cls) => !new RegExp(`\\.${cls}(?![\\w-])`).test(selectors));
  assert.deepEqual(missing, [], `not styled: ${missing.join(', ')}`);
  for (const modifier of [
    '.studio-rail.is-narrow', '.studio-rail-badge.is-red',
    '.studio-issue-strip.is-red', '.studio-issue-strip.is-yellow',
    '.studio-counter.is-red', '.studio-counter.is-yellow',
    '.studio-marker.is-red', '.studio-marker.is-yellow',
    '.studio-toggle[aria-pressed="true"]', '.studio-pro[data-inspector="none"]',
  ]) {
    assert.ok(selectors.includes(modifier), `${modifier} is not styled`);
  }
});

test('F1 . a finding is 13 px, dark on its level\'s ground, in every place it stands (F5)', () => {
  for (const cls of ['studio-issue-strip', 'studio-counter', 'studio-marker', 'studio-refused-reason', 'studio-rail-badge']) {
    const sel = `.studio-pro .${cls}`;
    assert.equal(declOf(sel, 'font-size'), 'var(--studio-issue-text)', `${cls}: the issue size`);
    assert.equal(declOf(sel, 'color'), "theme('colors.black')", `${cls}: dark text`);
    assert.match(declOf(sel, 'background'), /^var\(--studio-(?:warn|danger)\)$/, `${cls}: its level's ground`);
  }
  for (const cls of ['studio-issue-strip', 'studio-counter', 'studio-marker']) {
    assert.equal(declOf(`.studio-pro .${cls}.is-red`, 'background'), 'var(--studio-danger)');
    assert.equal(declOf(`.studio-pro .${cls}.is-yellow`, 'background'), 'var(--studio-warn)');
  }
  assert.equal(declOf('.studio-pro .studio-rail-badge.is-red', 'background'), 'var(--studio-danger)');
  assert.equal(declOf('.studio-pro .studio-marker .studio-icon', 'width'), 'var(--studio-marker)');
  assert.equal(declOf('.studio-pro .studio-refused[data-refused="1"] :is(input, .cc-input)', 'border-color'), 'var(--studio-danger)');
  // In a card row the sentence takes the row's whole width, under the label and the field: as a
  // row of the row's grid when the refused field is the row's own child, by the row's measure (a
  // container query) when it stands in the value's cell, as S2's card holds it.
  assert.equal(declOf('.studio-pro .studio-field-row > .studio-refused', 'display'), 'contents');
  assert.equal(declOf('.studio-pro .studio-field-row > .studio-refused > .studio-refused-reason', 'grid-column'), '1 / -1');
  assert.equal(declOf('.studio-pro .studio-field-row', 'container-type'), 'inline-size');
  assert.equal(declOf('.studio-pro .studio-value-wrap .studio-refused-reason', 'width'), '100cqw');
  assert.equal(declOf('.studio-pro .studio-value-wrap .studio-refused-reason', 'margin-left'), 'calc(100% - 100cqw)');
  // ...and the label stays in sight, level with its field, above the sentence (it was covered,
  // centred in the taller row: measured on the mock at 1280, T84 D1).
  assert.equal(declOf('.studio-pro .studio-field-row:has(.studio-refused-reason)', 'align-items'), 'start');
  assert.equal(declOf('.studio-pro .studio-field-row:has(.studio-refused-reason) > .cc-label', 'min-height'), 'var(--studio-field)');
});

test('F1 . the rail: its word is never clipped, and Check\'s count never takes the word\'s room', () => {
  // S1's word wears `truncate`; at 112 "Materials" needs 56 px of the 54 the button holds.
  assert.equal(declOf('.studio-pro .studio-rail-text', 'overflow'), 'visible');
  assert.equal(declOf('.studio-pro .studio-rail-text', 'text-overflow'), 'clip');
  // The badge stands out of the flow, at the button's end (a corner when the rail is icons only).
  assert.equal(declOf('.studio-pro .studio-rail-badge', 'position'), 'absolute');
  assert.equal(declOf('.studio-pro .studio-rail button', 'position'), 'relative');
  assert.ok(declOf('.studio-pro .studio-rail.is-narrow .studio-rail-badge', 'top'));
  // Icons only, a word that is still there leaves the eye and keeps the button's name.
  assert.equal(declOf('.studio-pro .studio-rail.is-narrow :is(.studio-rail-text, .studio-rail-caption)', 'clip'), 'rect(0, 0, 0, 0)');
});

// --- 6. the legacy DOM the skin leans on is still there -------------------------------------------

test('F1 . the legacy menu bar, whole, in one line at 13 px; and the legacy hooks the skin reads exist', () => {
  const BTN = '.studio-pro .studio-legacy-menu nav[aria-label="Main menu"] > div > button';
  assert.equal(declOf(BTN, 'font-size'), 'var(--studio-text)');
  assert.equal(declOf(BTN, 'padding'), '0 6px', 'her narrow padding (her media query at 1500), at every width');
  assert.equal(declOf(BTN, 'white-space'), 'nowrap');
  assert.equal(declOf('.studio-pro .studio-legacy-menu nav[aria-label="Main menu"]', 'flex-wrap'), 'nowrap');
  // MenuBar renders exactly that shape: nav[aria-label="Main menu"] > div > button.
  const menuBar = read('src/components/MenuBar.jsx');
  assert.match(menuBar, /<nav ref=\{bar\} className="[^"]*" aria-label="Main menu">\s*\{menus\.map\(\(menu\) => \(\s*<div key=\{menu\.label\} className="relative">\s*<button/);
  assert.match(menuBar, /role="menu"\s*className=\{`absolute \$\{LAYER_CLASS\.menu\} min-w-\[210px\] cc-panel/, 'the dropdown is a cc-panel the skin leaves alone');
  // The Changes bar and the bottom-left column, by their own data attributes.
  const messages = read('src/components/Messages.jsx');
  assert.match(messages, /data-message-history=\{history\.length\}/);
  assert.match(messages, /data-message-history-list className="cc-panel /);
  assert.match(messages, /data-messages="left"/);
  // The embedded RightPanel and its windows are .cc-panel surfaces (verify/t84/p1-host.md C).
  // T84 F4 moved the aside's class into PANEL_ASIDE (overlay and embedded, both literal): each is a cc-panel.
  assert.match(read('src/components/RightPanel.jsx'), /const PANEL_ASIDE = \{\s*overlay: `[^`]*cc-panel[^`]*`,\s*embedded: '[^']*cc-panel[^']*',/);
  assert.match(read('src/components/RightPanel.jsx'), /<aside className=\{asideClass\} data-panel-layout=\{asideLayout\}>/);
  assert.match(read('src/components/Modal.jsx'), /className=\{`fixed cc-panel pointer-events-auto/);
});

// --- 7. theme() resolves through the repo's own PostCSS -------------------------------------------

test('F1 . studio.css through the repo\'s own PostCSS: every theme() resolves, nothing is added, the colours are the theme\'s', async () => {
  const KNOWN = { tailwindcss, autoprefixer };
  const plugins = Object.entries(postcssConfig.plugins).map(([name, options]) => {
    assert.ok(KNOWN[name], `postcss.config.js names ${name}, which this test cannot run`);
    // Tailwind with the repo's own config object (its theme is the point); its content scan is not.
    return name === 'tailwindcss'
      ? tailwindcss({ ...tailwindConfig, content: [{ raw: '<div class="studio-pro"></div>', extension: 'html' }] })
      : KNOWN[name](options);
  });
  const out = await postcss(plugins).process(CSS, { from: `${ROOT}${CSS_PATH}`, to: undefined });
  const compiled = uncomment(out.css);
  assert.doesNotMatch(compiled, /theme\(/, 'a theme() did not resolve');
  assert.equal(rulesOf(out.css).length, RULES.length, 'Tailwind added or dropped a rule (no preflight, no utilities here)');
  const flat = (node, out2 = []) => {
    for (const value of Object.values(node)) {
      if (typeof value === 'string') out2.push(value.toLowerCase());
      else if (value && typeof value === 'object') flat(value, out2);
    }
    return out2;
  };
  const themeHexes = new Set(flat(tailwindConfig.theme.extend.colors));
  const hexes = [...new Set([...compiled.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map((m) => m[0].toLowerCase()))];
  const strangers = hexes.filter((h) => !themeHexes.has(h) && h !== '#000');
  assert.deepEqual(strangers, [], 'a colour that is not the theme\'s');
  for (const shell of ['900', '800', '700', '600']) {
    assert.ok(hexes.includes(tailwindConfig.theme.extend.colors.shell[shell].toLowerCase()), `shell ${shell} is not used`);
  }
  assert.ok(compiled.includes('var(--studio-button)') && compiled.includes('var(--studio-inspector)'));
});

test('F1 . the stylesheet is imported by a JSX module: it travels with the sprite', () => {
  assert.match(ICONS, /^import '\.\/studio\.css';$/m);
});

// --- 8. the sprite --------------------------------------------------------------------------------

const EXTRA = ['redo', 'camera', 'eye', 'frame', 'plan', 'iso', 'output'];

/** Every point a path reaches, control points included (M L H V C S Q T A Z, both cases). */
function pathPoints(d) {
  const tokens = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?/g);
  const arity = { m: 2, l: 2, h: 1, v: 1, c: 6, s: 4, q: 4, t: 2, a: 7, z: 0 };
  const points = [];
  let x = 0; let y = 0; let sx = 0; let sy = 0; let cmd = null; let i = 0;
  while (i < tokens.length) {
    if (/[a-zA-Z]/.test(tokens[i])) { cmd = tokens[i]; i += 1; if (cmd.toLowerCase() === 'z') { x = sx; y = sy; continue; } }
    const lower = cmd.toLowerCase();
    const rel = cmd === lower;
    const n = arity[lower];
    assert.ok(n != null, `unknown path command ${cmd}`);
    const a = tokens.slice(i, i + n).map(Number);
    assert.equal(a.length, n, `a short ${cmd} in ${d}`);
    i += n;
    const X = (v) => (rel ? x + v : v);
    const Y = (v) => (rel ? y + v : v);
    if (lower === 'h') { x = X(a[0]); } else if (lower === 'v') { y = Y(a[0]); } else if (lower === 'a') { x = X(a[5]); y = Y(a[6]); } else {
      for (let k = 0; k < n - 2; k += 2) points.push([X(a[k]), Y(a[k + 1])]);
      x = X(a[n - 2]); y = Y(a[n - 1]);
    }
    points.push([x, y]);
    if (lower === 'm') { sx = x; sy = y; cmd = rel ? 'l' : 'L'; }
  }
  return points;
}

test('F1 . the sprite: the designer\'s eighteen byte for byte, seven more in her 24-unit stroke style', () => {
  const html = read(STAGE1_PATH);
  const hers = [...html.matchAll(/<symbol id="i-([a-z]+)" viewBox="0 0 24 24"><path d="([^"]+)"\/><\/symbol>/g)]
    .map(([, name, d]) => [name, d]);
  assert.equal(hers.length, 18, 'her sprite holds eighteen symbols');
  const ours = Object.fromEntries([...ICONS.matchAll(/^ {2}([a-z]+): '([^']+)',$/gm)].map(([, name, d]) => [name, d]));
  for (const [name, d] of hers) assert.equal(ours[name], d, `${name} is not her path, byte for byte`);
  assert.deepEqual(Object.keys(ours), [...hers.map(([name]) => name), ...EXTRA],
    'the contract\'s names: her eighteen, then redo, camera, eye, frame, plan, iso, output');
  // The seven drawn tonight stay in her 24-unit box.
  for (const name of EXTRA) {
    for (const [x, y] of pathPoints(ours[name])) {
      assert.ok(x >= 0 && x <= 24 && y >= 0 && y <= 24, `${name} leaves the 24 box at ${x}, ${y}`);
    }
  }
  // The sprite is hers: symbols in a 24 box, ids the contract names, out of the flow.
  assert.match(ICONS, /<symbol key=\{name\} id=\{`studio-i-\$\{name\}`\} viewBox="0 0 24 24">\s*<path d=\{d\} \/>/);
  assert.match(ICONS, /export default function StudioIcons\(\) \{/);
  assert.match(ICONS, /width="0"\s+height="0"\s+aria-hidden="true"/);
  assert.match(ICONS, /style=\{\{ position: 'absolute'/);
  // One Icon, a <use> of the sprite, with her `.icon` stroke drawn on the element.
  assert.match(ICONS, /export function Icon\(\{ name, className = '' \}\) \{/);
  assert.match(ICONS, /className=\{className \? `studio-icon \$\{className\}` : 'studio-icon'\}/);
  assert.match(ICONS, /<use href=\{`#studio-i-\$\{name\}`\} \/>/);
  const iconRule = html.match(/\.studio-pro \.icon\{([^}]*)\}/)[1];
  assert.match(iconRule, /fill:none;stroke:currentColor;stroke-width:1\.6;stroke-linecap:round;stroke-linejoin:round/);
  for (const attr of ['fill="none"', 'stroke="currentColor"', 'strokeWidth="1.6"', 'strokeLinecap="round"', 'strokeLinejoin="round"']) {
    assert.ok(ICONS.includes(attr), `Icon does not draw her stroke: ${attr}`);
  }
  // The size is the stylesheet's: half a button.
  assert.equal(declOf('.studio-pro .studio-icon', 'width'), 'calc(var(--studio-button) / 2)');
});

// --- 9. the files themselves ----------------------------------------------------------------------

test('F1 . every file this slice wrote opens with the Skylon header and carries no dash and no curly quote', () => {
  const header = read('scripts/t83-walk.mjs').split('\n').slice(0, 8).join('\n');
  assert.match(header, /^\/\*\n \* Copyright \(c\) 2026 Skylon Development Ltd\. All rights reserved\./);
  for (const rel of [CSS_PATH, ICONS_PATH, SKIN_PATH, SELF_PATH]) {
    const text = read(rel);
    assert.ok(text.startsWith(`${header}\n`), `${rel} does not open with the header`);
    assert.doesNotMatch(text, /[\u2013\u2014]/, `${rel} carries an em or en dash`);
    assert.doesNotMatch(text, /[\u2018\u2019\u201c\u201d]/, `${rel} carries a curly quote`);
    assert.match(text.split('\n')[8], /T84 F1/, `${rel} does not name T84 F1 under its header`);
  }
});

test('F1 . lib/studioSkin.js is pure: it imports nothing and touches no window', () => {
  const code = read(SKIN_PATH).replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
  assert.doesNotMatch(code, /^\s*import\s/m);
  // Its sentences may say "the window's width"; its code reaches for no browser object.
  const bare = code.replace(/`(?:\\.|[^\\`])*`/g, '``').replace(/'(?:\\.|[^\\'\n])*'/g, "''").replace(/"(?:\\.|[^\\"\n])*"/g, '""');
  assert.doesNotMatch(bare, /\b(?:window|document|localStorage|globalThis|navigator)\b/);
  assert.match(code, /export function studioWidths\(profile, viewportWidth\)/);
  assert.match(code, /export function studioCssVars\(profile, \{ viewportWidth, inspector \} = \{\}\)/);
});
