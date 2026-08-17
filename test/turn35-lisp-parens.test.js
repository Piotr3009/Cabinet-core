// ─── Turn 35, CLAUDE.md iron rule 3: LISP IS LAW, AND LAW MUST PARSE ───────
//
// "Any LISP edit ships with a paren-balance check in the test suite (strip
// strings and comments, count parens, assert balance 0 and min 0 — the chat's
// own script, now a test)."
//
// This turn edits `KIT_WARDROBE_FULL.lsp` — F13 appends a SPLIT DOORS (T35)
// section and F12 appends a DOOR TOP EDGE (T35) one. An unbalanced kit is a
// kit AutoCAD refuses to load, and a reference file nobody can run is a
// reference file nobody checks. So the balance is asserted here, on EVERY kit
// in the house and not only the edited one: the check costs nothing and the
// day somebody hand-edits KIT_SINK is the day it earns its keep.
//
// Two assertions, and the second is the one that matters:
//   · balance 0  — every `(` is closed by the end of the file;
//   · min 0      — the running depth NEVER goes negative, i.e. no `)` ever
//                  arrives before its `(`. A file can be 0-balanced and still
//                  be nonsense: `) (` balances at 0 and is not LISP.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const LISP_DIR = fileURLToPath(new URL('../reference/lisp/', import.meta.url));

/**
 * The chat's own stripper, written down.
 *
 * AutoLISP has exactly two things that may hold a paren the reader must not
 * count: a `"…"` string and a `;` comment to end of line. Inside a string,
 * `\"` is an escaped quote and does NOT end it — `"\nNumber of drawers (1-6)
 * <2>: "` is one string carrying two parens, and the wardrobe kit is full of
 * them. Everything else is code.
 *
 * @returns {{balance:number, min:number, open:number, close:number}}
 */
export function parenScan(text) {
  let depth = 0;
  let min = 0;
  let open = 0;
  let close = 0;
  let inString = false;
  let inComment = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inComment) {
      if (ch === '\n') inComment = false;
      continue;
    }
    if (inString) {
      if (ch === '\\') { i += 1; continue; }   // \" and \n — skip the escapee
      if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === ';') { inComment = true; continue; }
    if (ch === '(') { depth += 1; open += 1; }
    else if (ch === ')') { depth -= 1; close += 1; if (depth < min) min = depth; }
  }
  return { balance: depth, min, open, close };
}

const KITS = readdirSync(LISP_DIR).filter((f) => f.endsWith('.lsp')).sort();

test('rule 3 — there ARE kits to check, and the list is not silently empty', () => {
  assert.ok(KITS.length >= 12, `only ${KITS.length} kits found in reference/lisp/`);
  assert.ok(KITS.includes('KIT_WARDROBE_FULL.lsp'), 'the kit this turn edits');
  assert.ok(KITS.includes('KIT_SHOE_BOX.lsp'), 'T34’s kit, the VERIFY SECOND gate');
});

for (const kit of KITS) {
  test(`rule 3 — ${kit} balances: every ( closes, and no ) arrives early`, () => {
    const text = readFileSync(join(LISP_DIR, kit), 'utf8');
    const { balance, min, open, close } = parenScan(text);
    assert.equal(balance, 0, `${kit}: ${open} open vs ${close} close — balance ${balance}`);
    assert.equal(min, 0, `${kit}: depth went to ${min} — a ) before its (`);
  });
}

// The root-level KIT_SINK.lsp is a second copy that lives outside reference/,
// and it is edited by the same hands. It gets the same check.
test('rule 3 — the root KIT_SINK.lsp balances too', () => {
  const text = readFileSync(fileURLToPath(new URL('../KIT_SINK.lsp', import.meta.url)), 'utf8');
  const { balance, min } = parenScan(text);
  assert.equal(balance, 0);
  assert.equal(min, 0);
});

// ─── the stripper itself, proved on the cases that break naive counters ────

test('the stripper: a paren inside a STRING is not a paren', () => {
  assert.deepEqual(parenScan('"(((" '), { balance: 0, min: 0, open: 0, close: 0 });
  // The wardrobe kit's own prompt, verbatim.
  assert.equal(parenScan('(setq n (getint "\\nNumber of drawers (1-6) <2>: "))').balance, 0);
});

test('the stripper: a paren inside a COMMENT is not a paren', () => {
  assert.equal(parenScan(';; (((\n(princ)').balance, 0);
  assert.equal(parenScan(';;; a comment with ) in it\n').balance, 0);
});

test('the stripper: an escaped quote does NOT end the string', () => {
  // `"a\"(b"` is ONE string carrying a paren. A counter that ends the string at
  // the escaped quote would count that `(` and report an imbalance.
  assert.equal(parenScan('(princ "a\\"(b")').balance, 0);
});

test('the stripper: balance 0 is NOT enough — `) (` is caught by min', () => {
  const scan = parenScan(') (');
  assert.equal(scan.balance, 0, 'it balances…');
  assert.equal(scan.min, -1, '…and it is still not LISP');
});

// ─── F13: the SPLIT DOORS section is IN the kit, and it is the marked one ──

test('F13 — KIT_WARDROBE_FULL carries the `;; --- SPLIT DOORS (T35)` marker', () => {
  const text = readFileSync(join(LISP_DIR, 'KIT_WARDROBE_FULL.lsp'), 'utf8');
  assert.match(text, /^;; --- SPLIT DOORS \(T35\)$/m);
});
