#!/usr/bin/env node
// ─── TURN 69 · THE COPY, AFTER TONIGHT'S EDIT INTO PRO ─────────────────────
//
// The standing law, unchanged and the whole reason this file exists:
//
//   *"jak piszę 1 do 1 to KOPIUJ. ale kopiuj — nie kasuj, nie zmieniaj PRO,
//   tylko zrób identycznie w retail."*
//
// CLAUDE.md F1, tonight: *"Both apps: PRO's RoomModal (renewed exemption) and
// the retail copy re-copied the same night."*  So the machine is T67's,
// unchanged in every rule, pointed at the ONE file tonight edits.
//
// ─── AND THE ONE FILE IT MUST NOT TOUCH ────────────────────────────────────
//
// `DrawRoomModal.jsx` is NOT in the list below, and that is F2's own sentence:
//
//   *"This REPLACES the current DrawRoomModal interaction in the retail copy;
//   PRO's DrawRoomModal is NOT touched (not in EXEMPT) — retail's copy carries
//   the new controls and says so."*
//
// A copy that DIVERGES BY LICENCE is still a copy of nothing if a machine
// overwrites it the same night. T67 copied it once; tonight retail's owns its
// interaction, PRO's keeps the one it had, and neither is re-made from the
// other. `test/turn69-f1-f2-the-room-and-the-line.test.js` holds that divergence
// to exactly what F2 licenses and nothing more.
//
//   node scripts/t69-copy.mjs            make the copy
//   node scripts/t69-copy.mjs --check    print the tokens the file uses
//
// THE THREE RULES ARE T67'S, VERBATIM:
//
//   1. IMPORTS REPOINTED   `../engine/x` → `../../../engine/x`. A PRO SIBLING
//                          (`./Modal.jsx`, `./NumberField.jsx`,
//                          `./WallElevationModal.jsx`) is already a copy beside
//                          the destination, so its specifier is left as it is.
//   2. CLASSES RESKINNED   every token inside a `className=` (and the shell's
//                          `width=`) becomes the `pbi-re-*` name the MAP gives
//                          it. A token the map does not know STOPS the run.
//   3. COLOURS SWAPPED     PRO's dark-shell hexes become the Ivory & Onyx
//                          tokens.
//
// …and NOTHING ELSE. No control removed, no label reworded, no default moved.

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('../', import.meta.url).pathname;
const check = process.argv.includes('--check');

/** THE FILE. One, because one is what tonight edits. */
export const T69_COPIES = [
  {
    pro: 'src/components/RoomModal.jsx',
    retail: 'src/retail/design/room/RoomModal.jsx',
    why: 'T69 F1 edited PRO — the 1/2/3-wall row, IMPORT DXF struck out, and the '
      + 'two sites the APPLY probe convicted; 1:1 = COPY, so the copy is re-made',
  },
];

/**
 * PRO's class → PBI's class. DERIVED from the T62 pair (`git show HEAD` of
 * both `RoomModal.jsx` files, every `className=` literal aligned token for
 * token, zero conflicts), then extended by exactly THREE names for the three
 * Tailwind tokens tonight's layout introduces — each already defined in
 * retail's sheets, none invented here:
 *
 *   border-t     → `pbi-re-line-t`   (styles/roomeditor.css)
 *   pt-3         → `pbi-re-pt3`      (styles/copies.css)
 *   justify-end  → `pbi-re-end`      (styles/roomeditor.css)
 */
const MAP = {
  'bg-shell-900': 'pbi-re-fill-ground',
  'bg-status-danger/10': 'pbi-re-fill-bad',
  'bg-status-warn/10': 'pbi-re-fill-warn',
  border: 'pbi-re-line',
  'border-shell-600': 'pbi-re-hair',
  'border-status-danger/50': 'pbi-re-hair-bad',
  'border-status-warn/50': 'pbi-re-hair-warn',
  'border-t': 'pbi-re-line-t',
  capitalize: 'pbi-re-cap',
  'cc-btn': 'pbi-re-btn',
  'cc-btn-ghost': 'pbi-re-btn-ghost',
  'cc-btn-gold': 'pbi-re-btn-gold',
  'cc-divider': 'pbi-re-divider',
  'cc-input': 'pbi-re-input',
  'cc-label': 'pbi-re-fieldlabel',
  'cc-row': 'pbi-re-fieldrow',
  flex: 'pbi-re-row',
  'flex-1': 'pbi-re-grow',
  'gap-1': 'pbi-re-gap-1',
  'gap-2': 'pbi-re-gap-2',
  'gap-4': 'pbi-re-gap-4',
  grid: 'pbi-re-grid',
  'grid-cols-2': 'pbi-re-grid-2',
  hidden: 'pbi-re-none',
  'items-center': 'pbi-re-mid',
  'items-end': 'pbi-re-bottom',
  'justify-end': 'pbi-re-end',
  'leading-relaxed': 'pbi-re-lead-loose',
  'list-disc': 'pbi-re-bullets',
  'list-inside': 'pbi-re-bullets-in',
  'mb-2': 'pbi-re-mb2',
  'mt-1': 'pbi-re-mt1',
  'mt-2': 'pbi-re-mt2',
  'p-2': 'pbi-re-p2',
  'pt-3': 'pbi-re-pt3',
  'px-2': 'pbi-re-px2',
  'py-0.5': 'pbi-re-py05',
  'py-1': 'pbi-re-py1',
  rounded: 'pbi-re-round',
  'space-y-1': 'pbi-re-stack-1',
  'space-y-3': 'pbi-re-stack-3',
  'text-[11px]': 'pbi-re-t11',
  'text-ink-100': 'pbi-re-ink-1',
  'text-ink-200': 'pbi-re-ink-2',
  'text-ink-300': 'pbi-re-ink-3',
  'text-ink-400': 'pbi-re-quiet',
  'text-right': 'pbi-re-right',
  'text-sm': 'pbi-re-tsm',
  'text-status-danger': 'pbi-re-bad',
  'text-status-warn': 'pbi-re-warn',
  'text-xs': 'pbi-re-txs',
  'touch-none': 'pbi-re-notouch',
  'tracking-wide': 'pbi-re-track',
  uppercase: 'pbi-re-caps',
  'w-10': 'pbi-re-w10',
  'w-12': 'pbi-re-w12',
  'w-14': 'pbi-re-w14',
  'w-16': 'pbi-re-w16',
  'w-24': 'pbi-re-w24',
  'w-full': 'pbi-re-wfull',
  'cursor-ns-resize': 'pbi-re-ns',
  'cursor-ew-resize': 'pbi-re-ew',
  // The shell's `width=` prop is a class too, passed rather than written.
  'w-[860px]': 'pbi-re-w860',
  'w-[820px]': 'pbi-re-w820',

  // ─── AND WHAT `DrawRoomModal.jsx` ADDS ──────────────────────────────────
  //
  // The eleven below are T63's OWN names, read out of `scripts/t63-copy.mjs`'s
  // map so the CAD window wears what every other copy wears; the six after
  // them are new names, defined once in `styles/roomeditor.css` beside the
  // rest of the room copies' skin. Geometry is PRO's; colour is PBI's.
  relative: 'pbi-re-rel',
  absolute: 'pbi-re-abs',
  'px-1': 'pbi-re-px1',
  'pt-2': 'pbi-re-pt2',
  'leading-snug': 'pbi-re-lead-snug',
  'border-shell-700': 'pbi-re-hair-soft',
  'text-ink-500': 'pbi-re-ink-3',
  'text-status-ok': 'pbi-re-ok',
  'space-y-0.5': 'pbi-re-stack-05',
  'w-[300px]': 'pbi-re-w300',
  'text-gold': 'pbi-re-gold',

  'w-[280px]': 'pbi-re-w280',
  'w-[120px]': 'pbi-re-w120',
  'w-[1160px]': 'pbi-re-w1160',
  'pr-6': 'pbi-re-pr6',
  'right-1': 'pbi-re-right1',
  'top-1/2': 'pbi-re-midy',
  '-translate-y-1/2': 'pbi-re-midy-shift',
  'hover:text-ink-100': 'pbi-re-ink-1-hover',
};

/** PRO's dark shell → Ivory & Onyx. Derived from the same T62 pair. */
const HEX = {
  '#2d2d30': '#E7E1D8',
  '#AA8E68': '#090A09',
  '#6b6b70': '#C7BCAF',
  '#c9c9cd': '#090A09',
  '#7fb3d5': '#5C5B57',
  '#3a3a3e': '#D9D1C6',
  '#C8A678': '#806A44',
  '#1a1a1a': '#FAF8F3',
  // `DrawRoomModal.jsx`'s own plan colours, the same shell drawn the same way:
  // the grid becomes the stone line, the drawn wall becomes Onyx, the labels
  // Soft Graphite, and the LIVE segment — the one the hand is drawing, PRO's
  // gold — becomes Deep Gold, which is what gold is on this side of the house.
  '#3a3a3d': '#D9D1C6',
  '#e6e6ea': '#090A09',
  '#9a9aa0': '#C7BCAF',
  '#2a2a2d': '#E7E1D8',
  '#2f2f24': '#E7E1D8',
  '#e9e4d8': '#090A09',
  '#9a9384': '#5C5B57',
  '#d8b45a': '#806A44',
};

/** A PRO SIBLING is already a copy beside the destination; everything else
 *  under `src/` is three directories further away than it was. */
function repoint(text) {
  return text.replace(/from '(\.\.\/)(engine|stores|lib|3d)\//g, "from '../../../$2/");
}

/**
 * Every token inside a `className=` and inside a Modal's `width=`.
 *
 * A `className` value is a quoted list OR a balanced `{…}` expression, and the
 * expression may hold quoted lists and template literals — `className={vertical
 * ? 'cursor-ew-resize' : 'cursor-ns-resize'}` is two class lists, and a regex
 * that only saw `className="…"` would leave PRO's own cursor classes in the
 * copy, unstyled. So the attribute is WALKED, exactly as T63's machine and
 * T62's fidelity test walk it, and every quoted run inside one — and only
 * inside one — is mapped.
 */
function reskin(text, unknown) {
  const swap = (value) => value.split(/\s+/).filter(Boolean).map((token) => {
    if (MAP[token]) return MAP[token];
    unknown.add(token);
    return token;
  }).join(' ');

  /** Map every quoted run inside one attribute region. */
  const region = (src) => src.replace(/(['"])([^'"]*)\1/g, (_, q, v) => `${q}${swap(v)}${q}`);

  const out = [];
  let last = 0;
  const re = /\b(className|width)=/g;
  let m = re.exec(text);
  while (m) {
    const i = m.index + m[0].length;
    let end = i;
    if (text[i] === '"' || text[i] === "'") {
      end = text.indexOf(text[i], i + 1) + 1;
      // `width="72"` on an <svg> is a number, not a class list.
      if (m[1] === 'width' && !/^w-/.test(text.slice(i + 1, end - 1))) { m = re.exec(text); continue; }
    } else if (text[i] === '{' && m[1] === 'className') {
      let depth = 0;
      end = i;
      while (end < text.length) {
        if (text[end] === '{') depth += 1;
        else if (text[end] === '}') { depth -= 1; if (depth === 0) { end += 1; break; } }
        end += 1;
      }
    } else { m = re.exec(text); continue; }
    out.push(text.slice(last, m.index), `${m[1]}=`, region(text.slice(i, end)));
    last = end;
    re.lastIndex = end;
    m = re.exec(text);
  }
  out.push(text.slice(last));
  return out.join('');
}

const recolour = (text) => text.replace(/#[0-9a-fA-F]{3,8}\b/g, (h) => HEX[h] || h);

/** Every token in a className, so `--check` can list what a file needs. */
function tokensOf(text) {
  const out = new Set();
  for (const m of text.matchAll(/className="([^"]*)"/g)) {
    for (const t of m[1].split(/\s+/).filter(Boolean)) out.add(t);
  }
  return [...out].sort();
}

let failed = false;
for (const { pro, retail } of T69_COPIES) {
  const source = readFileSync(join(ROOT, pro), 'utf8');
  if (check) {
    console.log(`${pro}\n  ${tokensOf(source).join(' ')}`);
    continue;
  }
  const unknown = new Set();
  const made = recolour(reskin(repoint(source), unknown));
  if (unknown.size) {
    console.error(`${pro}: THE MAP DOES NOT KNOW ${[...unknown].join(', ')} — nothing is guessed.`);
    failed = true;
    continue;
  }
  writeFileSync(join(ROOT, retail), made);
  console.log(`copied  ${pro} → ${retail}`);
}
if (failed) process.exit(1);
