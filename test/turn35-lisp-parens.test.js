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
  // T54-F7 AMENDED (28.08.2026): KIT_SHOE_BOX.lsp is deleted under licence 2 —
  // the shoe is a standard drawer now (variant 'shoe', side 80) and the shoe
  // kit's grave is asserted here; the replacement coverage lives in
  // test/turn54-f7-the-shoe-drawer.test.js. The paren walk is 13 kits, derived.
  assert.ok(!KITS.includes('KIT_SHOE_BOX.lsp'), 'T54-F7 killed the shoe kit — it must stay dead');
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

// ─── T75 · LISP FIRST: THE TURN'S NEW KITS, PRESENT AND BALANCED ────────────
//
// CLAUDE.md T75 LAWS: *"LISP IS LAW, and "lisp najpierw". Every new cut
// geometry in this turn (the L carcass, the blind blank, the corner notch, the
// dowel pattern) is written as `reference/lisp/*.lsp` FIRST, paren-balanced in
// `test/turn35-lisp-parens.test.js` (14 become 14 + the new files)."*  The walk
// above already balances every file in the folder; these name the new ones so
// that one deleted by accident fails by name. Existing LISP is untouched.

const T75_KITS = ['KIT_CORNER_L.lsp', 'KIT_NOTCH.lsp', 'SKYLON_JOINTS_DOWEL.lsp'];

test('T75 · the new kits are in the folder, and the old fourteen are still there', () => {
  for (const kit of T75_KITS) assert.ok(KITS.includes(kit), `${kit} is missing`);
  assert.ok(KITS.length >= 14 + T75_KITS.length, `${KITS.length} kits`);
});

for (const kit of T75_KITS) {
  test(`T75 · ${kit} balances 0/0 and carries its NUMBERS block`, () => {
    const text = readFileSync(join(LISP_DIR, kit), 'utf8');
    const { balance, min, open } = parenScan(text);
    assert.equal(balance, 0);
    assert.equal(min, 0);
    assert.ok(open > 100, 'a kit, not a stub');
    assert.match(text, /NUMBERS/, 'the numbers the engine mirrors line for line');
    assert.doesNotMatch(text, /[\u2013\u2014]/, 'no em or en dash');
  });
}

// T79 F4 · CLAUDE.md T79 FROZEN 2: *"parens test grows with every file
// touched."*  KIT_NOTCH.lsp is amended under licence (the owner, 18.10.2026:
// *"nie powinno być funkcji -500 na przykład i wtedy ucina od góry?"*) with
// D21 THE TOP-ANCHORED NOTCH and its NUMBERS block I2; it balances by name.
test('T79 F4 · KIT_NOTCH.lsp balances 0/0 with D21 and its NUMBERS block I2', () => {
  const text = readFileSync(join(LISP_DIR, 'KIT_NOTCH.lsp'), 'utf8');
  const { balance, min } = parenScan(text);
  assert.equal(balance, 0);
  assert.equal(min, 0);
  assert.match(text, /;;; D21 THE TOP-ANCHORED NOTCH\./);
  assert.match(text, /;;; I2\. NUMBERS - THE NOTCH FROM THE TOP/);
  assert.match(text, /\(defun notch-from-top-p \(ch nh\)/);
  assert.match(text, /\(defun notch-floor \(ch g nw nd nh\)/);
  assert.doesNotMatch(text, /[\u2013\u2014]/, 'no em or en dash');
});

// T79 F5 · CLAUDE.md T79 FROZEN 2, again: KIT_NOTCH.lsp is amended under
// licence (the owner, 18.10.2026: *"cut the corner działa idealnie, ale możesz
// zrobić mi też poziome cut? wszystkich 4 rogów?"*) with D22 THE EDGE NOTCH,
// its section H2, its NUMBERS block I3 and its command K2; it balances by name.
test('T79 F5 · KIT_NOTCH.lsp balances 0/0 with D22, section H2, its NUMBERS block I3 and EDGENOTCH_FULL', () => {
  const text = readFileSync(join(LISP_DIR, 'KIT_NOTCH.lsp'), 'utf8');
  const { balance, min } = parenScan(text);
  assert.equal(balance, 0);
  assert.equal(min, 0);
  assert.match(text, /;;; D22 THE EDGE NOTCH\./);
  assert.match(text, /;;; H2\. THE EDGE NOTCH \(D22, 18\.10\.2026\)/);
  assert.match(text, /;;; I3\. NUMBERS - THE EDGE NOTCH/);
  assert.match(text, /\(defun edge-notch-side-joints \(cd ch g ed eh edge\)/);
  assert.match(text, /\(defun edge-notch-meets-refusal \(cw cd ch g ed eh edge nw nd nh corner/);
  assert.match(text, /\(defun c:EDGENOTCH_FULL /);
  assert.doesNotMatch(text, /[\u2013\u2014]/, 'no em or en dash');
});

// T79 F6 \u00b7 the parens test grows again: KIT_NOTCH.lsp D10 and KIT_RECESS.lsp
// D17 are amended under licence (the owner, 18.10.2026: *"jak mamy cut the
// corners lub recess to nie rysujesz mi dziurek na \u015brubki 3 mm, to trzeba
// b\u0119dzie doda\u0107"*; *"ale tylko na plecach."*): the BACK's dia 3 rows follow
// every edge of a back that meets a board. Both balance by name.
for (const [kit, marks] of [
  ['KIT_NOTCH.lsp', [/AMENDED 18\.10\.2026 \(CLAUDE\.md T79 F6\)/, /\(defun notch-edge-row \(a b e\)/,
    /;;; I5\. NUMBERS - THE BACK'S ROWS ROUND THE BOX/, /\(cons "SHORT" \(reverse short\)\)/]],
  ['KIT_RECESS.lsp', [/AMENDED 18\.10\.2026 \(CLAUDE\.md T79 F6\)/, /\(foreach z \(notch-edge-row bz0 bz1 sfe\)/,
    /\(defun recess-ext-back-screws \(cw ch g ex0 ex1 ez0 ez1 \/ S sfe eb bz0 bz1 out\)/,
    /\(foreach x \(notch-edge-row g \(- \(car eb\) g\) sfe\)/, /;;; THE NARROWEST BAND \(D4, no golden; D17 AMENDED 18\.10\.2026\)/]],
]) {
  test(`T79 F6 \u00b7 ${kit} balances 0/0 with the BACK's rows round the box`, () => {
    const text = readFileSync(join(LISP_DIR, kit), 'utf8');
    const { balance, min } = parenScan(text);
    assert.equal(balance, 0);
    assert.equal(min, 0);
    for (const m of marks) assert.match(text, m);
    assert.ok(/^[\x00-\x7F]*$/.test(text), `${kit} is ASCII`);
  });
}

// T79 F8 · CLAUDE.md T79 FROZEN 2: the parens test grows with every file
// touched. KIT_RECESS.lsp is amended under licence (the owner, 18.10.2026:
// *"dlaczego cut the corner likwiduje nam wcięcie do recess?"*): D13 WITH A
// NOTCH, section H and the NUMBERS block CASE D; it balances by name.
test('T79 F8 · KIT_RECESS.lsp balances 0/0 with D13 WITH A NOTCH, section H and CASE D', () => {
  const text = readFileSync(join(LISP_DIR, 'KIT_RECESS.lsp'), 'utf8');
  const { balance, min } = parenScan(text);
  assert.equal(balance, 0);
  assert.equal(min, 0);
  assert.match(text, /;;; D13 WITH A NOTCH\./);
  assert.match(text, /;;; H\. WITH A NOTCH \(D13, 18\.10\.2026\)/);
  assert.match(text, /;;; CASE D \(fixtures\/golden-notch-and-recess\.json/);
  assert.match(text, /\(defun recess-notch-footprint \(cw ch nw nh corner/);
  assert.match(text, /\(defun recess-box-name \(name notched\)/);
  assert.doesNotMatch(text, /[\u2013\u2014]/, 'no em or en dash');
  assert.doesNotMatch(text, /[^\x00-\x7f]/, 'the LISP stays ASCII');
});

// T79 F8 x F6 · the seam: the extension's BACK piece cut from a notched BACK
// carries the rows into the notch's box exactly as the notched BACK alone
// (the owner, 18.10.2026: *"jak mamy cut the corners lub recess to nie
// rysujesz mi dziurek na śrubki 3 mm, to trzeba będzie dodać"*; *"ale tylko na
// plecach."*): ONE routine, KIT_NOTCH.lsp notch-back-box-rows, called by
// notch-back-joints and by KIT_RECESS.lsp recess-back-joints through
// recess-notch-box-rows. Both files balance by name.
for (const [kit, marks] of [
  ['KIT_NOTCH.lsp', [/\(defun notch-back-box-rows \(cw ch g nw nh corner /, /box \(notch-back-box-rows cw ch g nw nh corner\)\)/]],
  ['KIT_RECESS.lsp', [/\(defun recess-notch-box-rows \(nb cw ch g /, /\(foreach p \(recess-notch-box-rows nb cw ch g\)/,
    /;;; THE NOTCH'S BOX ROWS ON THE PIECE THAT HOLDS THEM/,
    // the F8 review: the side row on what the notch AND the window leave of the edge, a hole once
    /\(defun recess-side-row \(bh z0 tabs nb window onSide bandSide sfe /, /\(defun recess-window-zcut \(window z0 onSide\)/,
    /\(defun recess-put-hole \(pts p \/ found\)/, /;;; THE REVIEW CASES \(the T79 F8 review, 18\.10\.2026/]],
]) {
  test(`T79 F8 x F6 · ${kit} balances 0/0 with the rows into the notch's box, one routine`, () => {
    const text = readFileSync(join(LISP_DIR, kit), 'utf8');
    const { balance, min } = parenScan(text);
    assert.equal(balance, 0);
    assert.equal(min, 0);
    for (const m of marks) assert.match(text, m);
    assert.doesNotMatch(text, /[\u2013\u2014]/, 'no em or en dash');
    assert.ok(/^[\x00-\x7F]*$/.test(text), `${kit} is ASCII`);
  });
}

// T79 F9 · CLAUDE.md T79 FROZEN 2, again: KIT_NOTCH.lsp and KIT_RECESS.lsp are
// amended under licence (the owner, 18.10.2026: *"nie wycina mi panelu
// bocznego do recess a powinno."*): D23 THE END PANEL FOLLOWS ITS SIDE with
// section H3 and its NUMBERS block I4; D21 THE END PANEL GROWS WITH ITS SIDE
// with its two routines and its NUMBERS block F2. Both balance by name.
test('T79 F9 · KIT_NOTCH.lsp balances 0/0 with D23, section H3 and its NUMBERS block I4', () => {
  const text = readFileSync(join(LISP_DIR, 'KIT_NOTCH.lsp'), 'utf8');
  const { balance, min } = parenScan(text);
  assert.equal(balance, 0);
  assert.equal(min, 0);
  assert.match(text, /;;; D23 THE END PANEL FOLLOWS ITS SIDE\./);
  assert.match(text, /;;; H3\. THE END PANEL FOLLOWS ITS SIDE \(D23, 18\.10\.2026\)/);
  assert.match(text, /;;; I4\. NUMBERS - THE END PANEL/);
  assert.match(text, /\(defun notch-end-cut \(ch g nw nd nh corner hand sb sf ph pb/);
  assert.match(text, /\(defun notch-end-outline \(ew ph cuts/);
  assert.doesNotMatch(text, /[\u2013\u2014]/, 'no em or en dash');
});

test('T79 F9 · KIT_RECESS.lsp balances 0/0 with D21, recess-end-reach-p, recess-end-cuts and its NUMBERS block F2', () => {
  const text = readFileSync(join(LISP_DIR, 'KIT_RECESS.lsp'), 'utf8');
  const { balance, min } = parenScan(text);
  assert.equal(balance, 0);
  assert.equal(min, 0);
  assert.match(text, /;;; D21 THE END PANEL GROWS WITH ITS SIDE\./);
  assert.match(text, /\(defun recess-end-reach-p \(hand rx0 rx1 cw et\)/);
  assert.match(text, /\(defun recess-end-cuts \(ch ez0 ez1 ed hand ph pb rz0 rz1/);
  assert.match(text, /;;; F2\. NUMBERS - THE END PANEL/);
  assert.doesNotMatch(text, /[\u2013\u2014]/, 'no em or en dash');
});
