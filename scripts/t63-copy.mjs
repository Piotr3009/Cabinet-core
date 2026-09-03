#!/usr/bin/env node
// ─── TURN 63 · THE COPY, MADE BY A MACHINE SO IT CANNOT BE A RE-WRITE ──────
//
// The owner, 01.09.2026, verbatim:
//
//   *"jak piszę 1 do 1 to KOPIUJ. ale kopiuj — nie kasuj, nie zmieniaj PRO,
//   tylko zrób identycznie w retail."*
//
// T60 re-wrote PRO's surfaces "in retail language" and produced 61 lines where
// PRO has 861. T62 COPIED, and the owner's verdict was *"super, widzę"*. This
// script is T62's method with the hand taken out of it: every file in
// `scripts/t63-copies.mjs` is read from `src/components/`, and exactly THREE
// mechanical passes are run over it —
//
//   1. IMPORTS REPOINTED   `../engine/x` → `../../../engine/x` (three
//                          directories deeper, same module); `./Modal.jsx` →
//                          the copy T62 already made; `./Other.jsx` → that
//                          file's OWN copy, which must be in the manifest.
//   2. CLASSES RESKINNED   every token inside a `className=` (and a Modal's
//                          `width=`) becomes a `pbi-re-*` name from THE MAP
//                          below. One token in, one token out, so the copy's
//                          class lists have PRO's shape exactly. A token the
//                          map does not know STOPS the run — nothing is guessed.
//   3. COLOURS SWAPPED     the handful of hexes PRO's dark shell draws with
//                          become Ivory & Onyx tokens (`turn59-f2-the-shell`
//                          holds every retail file to the twelve).
//
// …and nothing else. No control is removed, no label reworded, no default
// changed. The stylesheet for the map is GENERATED beside the copies
// (`src/retail/styles/copies.css`) from the same table, so a class the copy
// wears is a class the sheet defines, by construction.
//
//   node scripts/t63-copy.mjs            make every copy and the sheet
//   node scripts/t63-copy.mjs --check    list the tokens each file uses
//
// `test/turn63-the-copies.test.js` reads both sides off disk afterwards and
// proves each copy carries every label, hook, gesture and imported name the
// original has.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

import { ALL_COPIES, T63_COPIES } from './t63-copies.mjs';

const ROOT = new URL('../', import.meta.url).pathname;
const check = process.argv.includes('--check');

// ─── THE MAP · PRO's class → PBI's class, and what PBI's class IS ──────────
//
// GEOMETRY IS PRO'S. COLOUR IS PBI'S. Every entry below keeps PRO's padding,
// width, type size and border and swaps only the hue for one of the twelve
// tokens in `styles/tokens.css`. Where T62's `roomeditor.css` already defines
// the name, the CSS here is `null` and the sheet does not repeat it.
//
// The status palette follows T62's ruling: warn → Deep Gold, danger → Onyx
// bold, ok → Soft Graphite. No thirteenth colour.
const T62_DEFINED = new Set(
  [...readFileSync(join(ROOT, 'src/retail/styles/roomeditor.css'), 'utf8').matchAll(/^\.(pbi-re-[a-z0-9-]+)/gm)]
    .map((m) => m[1]),
);

const MAP = {
  // ─── PRO's own component classes (src/index.css) ────────────────────────
  'cc-btn': ['pbi-re-btn', null],
  'cc-btn-gold': ['pbi-re-btn-gold', null],
  'cc-btn-ghost': ['pbi-re-btn-ghost', null],
  'cc-input': ['pbi-re-input', null],
  'cc-label': ['pbi-re-fieldlabel', null],
  'cc-row': ['pbi-re-fieldrow', null],
  'cc-divider': ['pbi-re-divider', null],
  'cc-tag': ['pbi-re-tag', '.pbi-re-tag { font-size: 10px; text-transform: uppercase; letter-spacing: 0.025em; padding: 0.125rem 0.375rem; border-radius: var(--pbi-field-radius); background: var(--pbi-porcelain); color: var(--pbi-soft-graphite); border: 1px solid var(--pbi-stone-line); }'],
  'cc-scroll': ['pbi-re-scrollbox', '.pbi-re-scrollbox { overflow-y: auto; overscroll-behavior: contain; }'],

  // ─── flow ───────────────────────────────────────────────────────────────
  flex: ['pbi-re-row', null],
  'flex-1': ['pbi-re-grow', null],
  'flex-col': ['pbi-re-col', null],
  'flex-wrap': ['pbi-re-wrap', '.pbi-re-wrap { flex-wrap: wrap; }'],
  block: ['pbi-re-block', null],
  'inline-block': ['pbi-re-inline', '.pbi-re-inline { display: inline-block; }'],
  grid: ['pbi-re-grid', null],
  'grid-cols-2': ['pbi-re-grid-2', null],
  'grid-cols-3': ['pbi-re-grid-3', '.pbi-re-grid-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }'],
  'grid-cols-4': ['pbi-re-grid-4', '.pbi-re-grid-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }'],
  'grid-cols-5': ['pbi-re-grid-5', '.pbi-re-grid-5 { grid-template-columns: repeat(5, minmax(0, 1fr)); }'],
  'col-span-2': ['pbi-re-span-2', '.pbi-re-span-2 { grid-column: span 2 / span 2; }'],
  'content-start': ['pbi-re-content-start', '.pbi-re-content-start { align-content: flex-start; }'],
  'auto-rows-min': ['pbi-re-rows-min', '.pbi-re-rows-min { grid-auto-rows: min-content; }'],
  'items-center': ['pbi-re-mid', null],
  'items-start': ['pbi-re-top', '.pbi-re-top { align-items: flex-start; }'],
  'items-end': ['pbi-re-bottom', null],
  'justify-center': ['pbi-re-centre', '.pbi-re-centre { justify-content: center; }'],
  'justify-end': ['pbi-re-end', null],
  'justify-between': ['pbi-re-between', '.pbi-re-between { justify-content: space-between; }'],
  'shrink-0': ['pbi-re-nogrow', null],
  'min-w-0': ['pbi-re-minw', null],
  'min-h-0': ['pbi-re-minh', null],
  'ml-auto': ['pbi-re-mlauto', '.pbi-re-mlauto { margin-left: auto; }'],
  relative: ['pbi-re-rel', '.pbi-re-rel { position: relative; }'],
  absolute: ['pbi-re-abs', '.pbi-re-abs { position: absolute; }'],
  'top-0.5': ['pbi-re-top05', '.pbi-re-top05 { top: 0.125rem; }'],
  'left-0.5': ['pbi-re-left05', '.pbi-re-left05 { left: 0.125rem; }'],
  'left-3': ['pbi-re-left3', '.pbi-re-left3 { left: 0.75rem; }'],
  'left-6': ['pbi-re-left6', '.pbi-re-left6 { left: 1.5rem; }'],
  'bottom-3': ['pbi-re-bottom3', '.pbi-re-bottom3 { bottom: 0.75rem; }'],
  'overflow-hidden': ['pbi-re-clip', null],
  'overflow-y-auto': ['pbi-re-scroll', null],
  truncate: ['pbi-re-trunc', '.pbi-re-trunc { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }'],
  'object-cover': ['pbi-re-cover', '.pbi-re-cover { object-fit: cover; }'],

  // ─── gaps and stacks ────────────────────────────────────────────────────
  'gap-1': ['pbi-re-gap-1', null],
  'gap-1.5': ['pbi-re-gap-15', '.pbi-re-gap-15 { gap: 0.375rem; }'],
  'gap-2': ['pbi-re-gap-2', null],
  'gap-3': ['pbi-re-gap-3', null],
  'space-y-0.5': ['pbi-re-stack-05', '.pbi-re-stack-05 > * + * { margin-top: 0.125rem; }'],
  'space-y-1': ['pbi-re-stack-1', null],
  'space-y-1.5': ['pbi-re-stack-15', '.pbi-re-stack-15 > * + * { margin-top: 0.375rem; }'],
  'space-y-2': ['pbi-re-stack-2', null],
  'space-y-3': ['pbi-re-stack-3', null],
  'space-y-4': ['pbi-re-stack-4', '.pbi-re-stack-4 > * + * { margin-top: 1rem; }'],

  // ─── padding and margin ─────────────────────────────────────────────────
  'p-1.5': ['pbi-re-p15', '.pbi-re-p15 { padding: 0.375rem; }'],
  'p-2': ['pbi-re-p2', null],
  'p-3': ['pbi-re-p3', '.pbi-re-p3 { padding: 0.75rem; }'],
  'px-1': ['pbi-re-px1', '.pbi-re-px1 { padding-left: 0.25rem; padding-right: 0.25rem; }'],
  'px-2': ['pbi-re-px2', null],
  'px-2.5': ['pbi-re-px25', null],
  'px-3': ['pbi-re-px3', null],
  'py-0.5': ['pbi-re-py05', null],
  'py-1': ['pbi-re-py1', null],
  'py-1.5': ['pbi-re-py15', null],
  'py-2': ['pbi-re-py2', null],
  'py-3': ['pbi-re-py3', null],
  'py-4': ['pbi-re-py4', '.pbi-re-py4 { padding-top: 1rem; padding-bottom: 1rem; }'],
  'pt-1': ['pbi-re-pt1', '.pbi-re-pt1 { padding-top: 0.25rem; }'],
  'pt-2': ['pbi-re-pt2', '.pbi-re-pt2 { padding-top: 0.5rem; }'],
  'pt-3': ['pbi-re-pt3', '.pbi-re-pt3 { padding-top: 0.75rem; }'],
  'pb-1': ['pbi-re-pb1', '.pbi-re-pb1 { padding-bottom: 0.25rem; }'],
  'pb-2': ['pbi-re-pb2', '.pbi-re-pb2 { padding-bottom: 0.5rem; }'],
  'pb-3': ['pbi-re-pb3', '.pbi-re-pb3 { padding-bottom: 0.75rem; }'],
  'pl-1': ['pbi-re-pl1', '.pbi-re-pl1 { padding-left: 0.25rem; }'],
  'pl-2': ['pbi-re-pl2', '.pbi-re-pl2 { padding-left: 0.5rem; }'],
  'pr-1': ['pbi-re-pr1', '.pbi-re-pr1 { padding-right: 0.25rem; }'],
  'mt-0.5': ['pbi-re-mt05', '.pbi-re-mt05 { margin-top: 0.125rem; }'],
  'mt-1': ['pbi-re-mt1', null],
  'mt-2': ['pbi-re-mt2', null],
  'mt-3': ['pbi-re-mt3', '.pbi-re-mt3 { margin-top: 0.75rem; }'],
  'mb-0': ['pbi-re-mb0', '.pbi-re-mb0 { margin-bottom: 0; }'],
  'mb-1': ['pbi-re-mb1', '.pbi-re-mb1 { margin-bottom: 0.25rem; }'],
  'mb-2': ['pbi-re-mb2', null],
  'mb-3': ['pbi-re-mb3', '.pbi-re-mb3 { margin-bottom: 0.75rem; }'],
  'mr-2': ['pbi-re-mr2', null],
  'ml-1': ['pbi-re-ml1', '.pbi-re-ml1 { margin-left: 0.25rem; }'],
  'ml-2': ['pbi-re-ml2', '.pbi-re-ml2 { margin-left: 0.5rem; }'],

  // ─── type ───────────────────────────────────────────────────────────────
  'text-[9px]': ['pbi-re-t9', '.pbi-re-t9 { font-size: 9px; }'],
  'text-[10px]': ['pbi-re-t10', null],
  'text-[11px]': ['pbi-re-t11', null],
  'text-[13px]': ['pbi-re-t13', '.pbi-re-t13 { font-size: 13px; }'],
  'text-xs': ['pbi-re-txs', null],
  'text-sm': ['pbi-re-tsm', null],
  'text-base': ['pbi-re-tbase', '.pbi-re-tbase { font-size: 1rem; line-height: 1.5rem; }'],
  'text-xl': ['pbi-re-txl', '.pbi-re-txl { font-size: 1.25rem; line-height: 1.75rem; }'],
  'text-left': ['pbi-re-left', null],
  'text-right': ['pbi-re-right', null],
  'text-center': ['pbi-re-centre-text', '.pbi-re-centre-text { text-align: center; }'],
  uppercase: ['pbi-re-caps', null],
  'tracking-wide': ['pbi-re-track', null],
  'tracking-[0.16em]': ['pbi-re-track16', '.pbi-re-track16 { letter-spacing: 0.16em; }'],
  'tabular-nums': ['pbi-re-tnum', '.pbi-re-tnum { font-variant-numeric: tabular-nums; }'],
  'leading-tight': ['pbi-re-lead-tight', '.pbi-re-lead-tight { line-height: 1.25; }'],
  'leading-snug': ['pbi-re-lead-snug', null],
  'font-semibold': ['pbi-re-semibold', '.pbi-re-semibold { font-weight: 600; }'],
  'font-medium': ['pbi-re-medium', '.pbi-re-medium { font-weight: 500; }'],
  'font-mono': ['pbi-re-mono', '.pbi-re-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }'],
  underline: ['pbi-re-underline', '.pbi-re-underline { text-decoration: underline; }'],

  // ─── behaviour ──────────────────────────────────────────────────────────
  'transition-colors': ['pbi-re-fade', null],
  'transition-all': ['pbi-re-fade-all', '.pbi-re-fade-all { transition: all 150ms ease; }'],
  'cursor-not-allowed': ['pbi-re-nope', null],
  'cursor-default': ['pbi-re-cursor-default', '.pbi-re-cursor-default { cursor: default; }'],
  'opacity-45': ['pbi-re-dim', null],
  'opacity-70': ['pbi-re-dim70', '.pbi-re-dim70 { opacity: 0.7; }'],
  'opacity-80': ['pbi-re-dim80', '.pbi-re-dim80 { opacity: 0.8; }'],
  'disabled:opacity-40': ['pbi-re-dis-dim', '.pbi-re-dis-dim:disabled { opacity: 0.4; }'],
  'disabled:cursor-not-allowed': ['pbi-re-dis-nope', '.pbi-re-dis-nope:disabled { cursor: not-allowed; }'],
  'backdrop-blur-sm': ['pbi-re-blur', '.pbi-re-blur { backdrop-filter: blur(4px); }'],
  'accent-gold': ['pbi-re-accent', '.pbi-re-accent { accent-color: var(--pbi-deep-gold); }'],

  // ─── edges ──────────────────────────────────────────────────────────────
  border: ['pbi-re-line', null],
  'border-t': ['pbi-re-line-t', null],
  'border-b': ['pbi-re-line-b', null],
  'border-l': ['pbi-re-line-l', '.pbi-re-line-l { border-left: 1px solid var(--pbi-stone-line); }'],
  'border-dashed': ['pbi-re-dashed', '.pbi-re-dashed { border-style: dashed; }'],
  rounded: ['pbi-re-round', null],
  'rounded-lg': ['pbi-re-round', null],
  'rounded-full': ['pbi-re-round', null],
  'ring-1': ['pbi-re-ring', '.pbi-re-ring { box-shadow: 0 0 0 1px var(--pbi-deep-gold); }'],
  'ring-gold': ['pbi-re-ring-gold', '.pbi-re-ring-gold { box-shadow: 0 0 0 1px var(--pbi-deep-gold); }'],
  'ring-gold/70': ['pbi-re-ring-gold', null],

  // ─── widths and heights — PRO's own, to the pixel ───────────────────────
  'w-3': ['pbi-re-w3', '.pbi-re-w3 { width: 0.75rem; }'],
  'w-4': ['pbi-re-w4', '.pbi-re-w4 { width: 1rem; }'],
  'w-7': ['pbi-re-w7', '.pbi-re-w7 { width: 1.75rem; }'],
  'w-8': ['pbi-re-w8', '.pbi-re-w8 { width: 2rem; }'],
  'w-10': ['pbi-re-w10', null],
  'w-11': ['pbi-re-w11', '.pbi-re-w11 { width: 2.75rem; }'],
  'w-12': ['pbi-re-w12', null],
  'w-14': ['pbi-re-w14', null],
  'w-16': ['pbi-re-w16', null],
  'w-20': ['pbi-re-w20', '.pbi-re-w20 { width: 5rem; }'],
  'w-24': ['pbi-re-w24', null],
  'w-28': ['pbi-re-w28', '.pbi-re-w28 { width: 7rem; }'],
  'w-44': ['pbi-re-w44', '.pbi-re-w44 { width: 11rem; }'],
  'w-full': ['pbi-re-wfull', null],
  'w-[110px]': ['pbi-re-w110', '.pbi-re-w110 { width: 110px; }'],
  'w-[260px]': ['pbi-re-w260', '.pbi-re-w260 { width: 260px; }'],
  'w-[300px]': ['pbi-re-w300', '.pbi-re-w300 { width: 300px; }'],
  'w-[320px]': ['pbi-re-w320', '.pbi-re-w320 { width: 320px; }'],
  'w-[340px]': ['pbi-re-w340', '.pbi-re-w340 { width: 340px; }'],
  'w-[360px]': ['pbi-re-w360', '.pbi-re-w360 { width: 360px; }'],
  'w-[380px]': ['pbi-re-w380', '.pbi-re-w380 { width: 380px; }'],
  'w-[420px]': ['pbi-re-w420', null],
  'w-[460px]': ['pbi-re-w460', '.pbi-re-w460 { width: 460px; }'],
  'w-[520px]': ['pbi-re-w520', '.pbi-re-w520 { width: 520px; }'],
  'w-[640px]': ['pbi-re-w640', null],
  'w-[860px]': ['pbi-re-w860', null],
  'max-w-[30rem]': ['pbi-re-maxw30', '.pbi-re-maxw30 { max-width: 30rem; }'],
  'h-3': ['pbi-re-h3', '.pbi-re-h3 { height: 0.75rem; }'],
  'h-4': ['pbi-re-h4', '.pbi-re-h4 { height: 1rem; }'],
  'h-6': ['pbi-re-h6', '.pbi-re-h6 { height: 1.5rem; }'],
  'h-7': ['pbi-re-h7', '.pbi-re-h7 { height: 1.75rem; }'],
  'h-8': ['pbi-re-h8', '.pbi-re-h8 { height: 2rem; }'],
  'h-11': ['pbi-re-h11', '.pbi-re-h11 { height: 2.75rem; }'],
  'h-12': ['pbi-re-h12', '.pbi-re-h12 { height: 3rem; }'],
  'h-full': ['pbi-re-hfull', '.pbi-re-hfull { height: 100%; }'],
  'h-[68px]': ['pbi-re-h68', '.pbi-re-h68 { height: 68px; }'],
  'h-[620px]': ['pbi-re-h620', '.pbi-re-h620 { height: 620px; }'],
  'max-h-[260px]': ['pbi-re-maxh260', '.pbi-re-maxh260 { max-height: 260px; }'],
  'max-h-[280px]': ['pbi-re-maxh280', '.pbi-re-maxh280 { max-height: 280px; }'],
  'max-h-[86vh]': ['pbi-re-maxh86', '.pbi-re-maxh86 { max-height: 86vh; }'],

  // ─── COLOUR — declared last in the sheet, so a modifier beats a component ─
  'text-ink-50': ['pbi-re-ink', null],
  'text-ink-100': ['pbi-re-ink-1', null],
  'text-ink-200': ['pbi-re-ink-2', null],
  'text-ink-300': ['pbi-re-ink-3', null],
  'text-ink-400': ['pbi-re-quiet', null],
  'text-ink-500': ['pbi-re-ink-3', null],
  'text-gold': ['pbi-re-gold', null],
  'text-gold/80': ['pbi-re-gold-soft', '.pbi-re-gold-soft { color: var(--pbi-gold); }'],
  'hover:text-gold': ['pbi-re-gold-hover', '.pbi-re-gold-hover:hover { color: var(--pbi-deep-gold); }'],
  'text-status-warn': ['pbi-re-warn', null],
  'text-status-danger': ['pbi-re-bad', null],
  'text-red-300': ['pbi-re-bad', null],
  'text-shell-900': ['pbi-re-on-dark', '.pbi-re-on-dark { color: var(--pbi-porcelain); }'],
  'bg-shell-900': ['pbi-re-fill-ground', null],
  'bg-shell-900/85': ['pbi-re-fill-ground-85', '.pbi-re-fill-ground-85 { background: rgb(250 248 243 / 88%); }'],
  'bg-shell-800': ['pbi-re-fill-panel', null],
  'bg-shell-700': ['pbi-re-fill-soft', '.pbi-re-fill-soft { background: var(--pbi-soft-ivory); }'],
  'bg-gold/5': ['pbi-re-fill-gold-wash', '.pbi-re-fill-gold-wash { background: rgb(128 106 68 / 6%); }'],
  'bg-status-ok': ['pbi-re-fill-on', '.pbi-re-fill-on { background: var(--pbi-onyx); }'],
  'bg-status-danger': ['pbi-re-fill-bad-solid', '.pbi-re-fill-bad-solid { background: var(--pbi-onyx); }'],
  'bg-ink-400': ['pbi-re-fill-quiet', '.pbi-re-fill-quiet { background: var(--pbi-soft-graphite); }'],
  'hover:bg-shell-700': ['pbi-re-fill-hover', null],
  'hover:bg-shell-800': ['pbi-re-fill-hover', null],
  'hover:enabled:bg-shell-700': ['pbi-re-fill-hover-en', '.pbi-re-fill-hover-en:hover:enabled { background: var(--pbi-ivory); }'],
  'border-shell-600': ['pbi-re-hair', null],
  'border-shell-700': ['pbi-re-hair-soft', null],
  'border-gold': ['pbi-re-hair-gold', null],
  'border-gold/40': ['pbi-re-hair-gold-soft', '.pbi-re-hair-gold-soft { border-color: var(--pbi-gold); }'],
  'border-gold/70': ['pbi-re-hair-gold', null],
  'border-status-ok': ['pbi-re-hair-ok', null],
  'border-status-danger': ['pbi-re-hair-bad', null],
  'border-status-danger/50': ['pbi-re-hair-bad', null],
  'border-status-warn/50': ['pbi-re-hair-warn', null],
  'hover:border-ink-200': ['pbi-re-hair-hover', '.pbi-re-hair-hover:hover { border-color: var(--pbi-graphite); }'],
  'hover:border-ink-400': ['pbi-re-hair-hover', null],
  'hover:border-ink-500': ['pbi-re-hair-hover', null],
  'hover:border-gold': ['pbi-re-hair-gold-hover', null],
  // SVG paint, for the schematics drawn with classes rather than attributes.
  'fill-shell-900': ['pbi-re-svg-fill-ground', '.pbi-re-svg-fill-ground { fill: var(--pbi-porcelain); }'],
  'fill-shell-800': ['pbi-re-svg-fill-panel', '.pbi-re-svg-fill-panel { fill: var(--pbi-warm-white); }'],
  'fill-gold/25': ['pbi-re-svg-fill-gold-wash', '.pbi-re-svg-fill-gold-wash { fill: rgb(128 106 68 / 25%); }'],
  'stroke-shell-700': ['pbi-re-svg-stroke-hair', '.pbi-re-svg-stroke-hair { stroke: var(--pbi-stone-line); }'],
  'stroke-gold/70': ['pbi-re-svg-stroke-gold', '.pbi-re-svg-stroke-gold { stroke: var(--pbi-deep-gold); }'],
  'stroke-ink-500': ['pbi-re-svg-stroke-quiet', '.pbi-re-svg-stroke-quiet { stroke: var(--pbi-soft-graphite); }'],
};

/**
 * THE HEXES. PRO's schematics draw with its dark shell's own greys and golds;
 * each becomes the nearest of the twelve. `#1f3a5f` is the EXAMPLE in the hex
 * field's placeholder — any hex would do there, so it is a token too.
 */
const HEX = {
  '#8a8172': '#5C5B57',   // a schematic's stroke → Soft Graphite
  '#c8a24a': '#806A44',   // the LED mark → Deep Gold (a small mark, which is what gold is for)
  '#C2A485': '#D9D1C6',   // the veneer fallback swatch → Ivory
  '#1f3a5f': '#5C5B57',   // the placeholder's example hex
};

// ─── PASS 2 · THE CLASS WALK — the same shape T62's fidelity test parses ────

const missing = new Map();
const report = process.argv.includes('--missing');
const left = new Map();
function mapTokens(text, file) {
  // A literal in which NOT ONE token is a class this map knows is not a class
  // list — it is a value PRO compares against (`'soft-close'`, `'standard'`)
  // that happens to sit inside a className expression. Left as written and
  // LISTED at the end of the run, so nothing passes unseen. A literal that
  // mixes known and unknown tokens is a class list with a hole in the map.
  const tokens = text.match(/\S+/g) || [];
  if (tokens.length && !tokens.some((t) => MAP[t])) {
    left.set(text.trim(), [...(left.get(text.trim()) || []), file]);
    return text;
  }
  return text.replace(/\S+/g, (token) => {
    const hit = MAP[token];
    if (!hit) {
      if (!report) throw new Error(`${file}: no PBI class for "${token}" — add it to THE MAP, never guess`);
      missing.set(token, [...(missing.get(token) || []), file]);
      return token;
    }
    return hit[0];
  });
}

/** Walk a className VALUE: a quoted list, or a balanced `{…}` expression. */
function walkValue(region, file) {
  let out = '';
  let i = 0;
  while (i < region.length) {
    const c = region[i];
    if (c === '"' || c === "'") {
      const j = region.indexOf(c, i + 1);
      if (j < 0) { out += region.slice(i); break; }
      // `c.kind === 'pocket' ? … : …` — the operand of a comparison is a
      // VALUE, not a class list, and it is left exactly as PRO wrote it.
      const operand = /(===|!==|==|!=)\s*$/.test(region.slice(0, i));
      out += c + (operand ? region.slice(i + 1, j) : mapTokens(region.slice(i + 1, j), file)) + c;
      i = j + 1;
    } else if (c === '`') {
      out += '`';
      i += 1;
      while (i < region.length && region[i] !== '`') {
        if (region[i] === '$' && region[i + 1] === '{') {
          let depth = 0;
          let j = i + 1;
          while (j < region.length) {
            if (region[j] === '{') depth += 1;
            else if (region[j] === '}') { depth -= 1; if (depth === 0) break; }
            j += 1;
          }
          out += `\${${walkValue(region.slice(i + 2, j), file)}}`;
          i = j + 1;
        } else {
          let k = i;
          while (k < region.length && region[k] !== '`'
            && !(region[k] === '$' && region[k + 1] === '{')) k += 1;
          out += mapTokens(region.slice(i, k), file);
          i = k;
        }
      }
      if (i < region.length) { out += '`'; i += 1; }
    } else {
      out += c;
      i += 1;
    }
  }
  return out;
}

/**
 * A class list PRO keeps in a plain object and reads later —
 * `const TONE = { red: 'text-status-danger border-status-danger/50', … }` in
 * FrontGapWarnings.jsx — is not on a `className=` and the walk above would
 * miss it. An object property whose string is MADE ENTIRELY of classes the
 * map knows is one, and is mapped; anything else is left exactly as written.
 */
function reskinObjectClassLists(source, file) {
  return source.replace(/^(\s+\w+:\s*')([^']+)(',?)$/gm, (whole, open, text, close) => {
    const tokens = text.match(/\S+/g) || [];
    if (!tokens.length || !tokens.every((t) => MAP[t])) return whole;
    return open + mapTokens(text, file) + close;
  });
}

/** Every `className=` and every Modal `width="w-…"` in a file, reskinned. */
function reskin(source, file) {
  source = reskinObjectClassLists(source, file);
  const out = [];
  let last = 0;
  const re = /\b(className|width)=/g;
  let m = re.exec(source);
  while (m) {
    const i = m.index + m[0].length;
    let end = i;
    if (source[i] === '"' || source[i] === "'") {
      end = source.indexOf(source[i], i + 1) + 1;
      // `width="72"` on an <svg> is a number, not a class. Only a `w-` value.
      if (m[1] === 'width' && !/^w-/.test(source.slice(i + 1, end - 1))) {
        m = re.exec(source);
        continue;
      }
    } else if (source[i] === '{' && m[1] === 'className') {
      let depth = 0;
      end = i;
      while (end < source.length) {
        if (source[end] === '{') depth += 1;
        else if (source[end] === '}') {
          depth -= 1;
          if (depth === 0) { end += 1; break; }
        }
        end += 1;
      }
    } else {
      m = re.exec(source);
      continue;
    }
    out.push(source.slice(last, m.index), `${m[1]}=`);
    out.push(walkValue(source.slice(i, end), file));
    last = end;
    re.lastIndex = end;
    m = re.exec(source);
  }
  out.push(source.slice(last));
  return out.join('');
}

// ─── PASS 1 · THE IMPORTS ───────────────────────────────────────────────────

function repoint(source, copy) {
  const fromDir = dirname(join(ROOT, copy.retail));
  const rel = (to) => {
    let r = relative(fromDir, join(ROOT, to)).split('\\').join('/');
    if (!r.startsWith('.')) r = `./${r}`;
    return r;
  };
  return source.replace(/from '([^']+)'/g, (whole, spec) => {
    if (/^\.\.\/(engine|lib|stores|3d)\//.test(spec)) return `from '${spec.replace(/^\.\.\//, '../../../')}'`;
    if (/^\.\//.test(spec)) {
      const pro = `src/components/${spec.slice(2)}`;
      const target = ALL_COPIES.find((c) => c.pro === pro);
      if (!target) throw new Error(`${copy.pro} imports ${spec}, which is not in the manifest — copy it too (the method is recursive)`);
      return `from '${rel(target.retail)}'`;
    }
    return whole;
  });
}

// ─── PASS 3 · THE HEXES ─────────────────────────────────────────────────────

const swapHexes = (source) => source.replace(/#[0-9a-fA-F]{6}\b/g, (hex) => HEX[hex] ?? hex);

// ─── THE RUN ────────────────────────────────────────────────────────────────

const used = new Map();
const census = (source, file) => {
  const seen = new Set();
  const spy = (region) => {
    for (const m of region.matchAll(/['"`]([^'"`${}]*)['"`]/g)) {
      for (const t of m[1].split(/\s+/)) if (t && MAP[t]) seen.add(t);
    }
  };
  for (const m of source.matchAll(/className=(?:"[^"]*"|\{[\s\S]*?\}(?=\s*\n|\s+[a-zA-Z-]+=|\s*\/?>))/g)) spy(m[0]);
  used.set(file, [...seen].sort());
};

for (const copy of T63_COPIES) {
  const pro = readFileSync(join(ROOT, copy.pro), 'utf8');
  if (check) { census(pro, copy.pro); continue; }
  const out = swapHexes(reskin(repoint(pro, copy), copy.pro));
  if (report) continue;
  mkdirSync(dirname(join(ROOT, copy.retail)), { recursive: true });
  writeFileSync(join(ROOT, copy.retail), out);
  process.stdout.write(`  copied  ${copy.pro.padEnd(44)} → ${copy.retail}  (${pro.split('\n').length} lines)\n`);
}

if (check) {
  for (const [file, tokens] of used) process.stdout.write(`${file}\n  ${tokens.join(' ')}\n`);
  process.exit(0);
}
if (report) {
  for (const [token, files] of missing) process.stdout.write(`${token.padEnd(32)} ${[...new Set(files)].map((f) => f.split('/').pop()).join(' ')}\n`);
  process.exit(missing.size ? 1 : 0);
}

// ─── THE SHEET ──────────────────────────────────────────────────────────────
//
// Components and flow first, widths after them, colour LAST — T62's own
// cascade rule, learnt from the frame where `.pbi-re-input { width: 100% }`
// beat `.pbi-re-w24` on source order and every wall field collapsed.
const rules = [];
const emitted = new Set();
const order = (name) => {
  if (/^pbi-re-(w\d|h\d|maxw|maxh|hfull|wfull)/.test(name)) return 1;
  if (/^pbi-re-(ink|quiet|gold|warn|bad|on-dark|fill|hair|svg|ring|accent)/.test(name)) return 2;
  return 0;
};
for (const [token, [name, css]] of Object.entries(MAP)) {
  if (!css || emitted.has(name) || T62_DEFINED.has(name)) continue;
  emitted.add(name);
  rules.push({ name, css, token, rank: order(name) });
}
rules.sort((a, b) => a.rank - b.rank);

const sheet = `/* ─── TURN 63 · THE SKIN OF EVERY SURFACE COPIED TONIGHT ─────────────────────
 *
 * GENERATED by scripts/t63-copy.mjs from THE MAP in that file. Do not edit
 * here — edit the map and run the script, so the class a copy wears and the
 * rule that styles it can never disagree.
 *
 * The owner, 01.09.2026: *"jak piszę 1 do 1 to KOPIUJ. ale kopiuj — nie kasuj,
 * nie zmieniaj PRO, tylko zrób identycznie w retail."*
 *
 * Twenty-two files under src/retail/design/{lighting,detail,material}/ are
 * src/components/'s own, copied with their imports repointed and every class
 * renamed to a pbi-re-* name. T62's roomeditor.css defines the names it
 * needed; this sheet defines the rest, at PRO's geometry and in Ivory & Onyx.
 *
 * GEOMETRY IS PRO'S. COLOUR IS PBI'S. Widths after components, colour last —
 * T62's cascade rule, kept.
 */

/* NumberField's own default — the T62 copy keeps PRO's word for it, and a
 * field a copy renders without a className of its own must still be a field. */
.cc-input {
  width: 100%;
  background: var(--pbi-porcelain);
  border: 1px solid var(--pbi-stone-line);
  border-radius: var(--pbi-field-radius);
  padding: 0.25rem 0.5rem;
  font-family: var(--pbi-font-ui);
  font-size: 0.875rem;
  line-height: 1.25rem;
  color: var(--pbi-onyx);
}
.cc-input:focus { outline: none; border-color: var(--pbi-deep-gold); box-shadow: 0 0 0 1px var(--pbi-deep-gold); }

/* A range input in a copied window is PRO's own control, in PBI's gold. */
.pbi-re-panel input[type="range"] { accent-color: var(--pbi-deep-gold); }
.pbi-re-panel input[type="checkbox"] { accent-color: var(--pbi-deep-gold); }
.pbi-re-panel select { font-family: var(--pbi-font-ui); }

${rules.map((r) => `/* ${r.token} */\n${r.css}`).join('\n')}
`;
writeFileSync(join(ROOT, 'src/retail/styles/copies.css'), sheet);
for (const [lit, files] of left) {
  process.stdout.write(`  left    "${lit}" — a value, not a class (${[...new Set(files)].map((f) => f.split('/').pop()).join(' ')})\n`);
}
process.stdout.write(`  sheet   src/retail/styles/copies.css  (${rules.length} rules)\n`);
