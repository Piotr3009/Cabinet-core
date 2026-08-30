import test from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';

// ─── TURN 58 · F5 — THE HISTORY VERDICT, WITH THE COMMIT NAMED ──────────────
//
// THE QUESTION. The shoe shelf's law — its 15° tilt and its stop rail — lives
// in JavaScript and in no kit, and iron rule 1 says geometry is written in
// `reference/lisp/` FIRST. When did that break, and in which commit?
//
// THE OBVIOUS ANSWER IS WRONG, and this turn believed it for an hour. It runs:
// T54-F7 ("the shoe becomes a DRAWER; the parallel world dies", 0bb6425,
// 28.08.2026) deleted `reference/lisp/KIT_SHOE_BOX.lsp` — 461 lines — and took
// the paren census from 14 kits to 13. The shoe's only presence under
// `reference/lisp/` vanished that night, so the shelf's law must have gone
// with it.
//
// IT DID NOT. `KIT_SHOE_BOX.lsp` was the shoe BOX's kit (T34, 002e62a,
// 16.08.2026): 80 mm walls, a sloped bottom seated in 6 mm grooves, the
// `rearEdge = min(80, run × tan 10°)` angle law, the divider. Nothing in it
// mentions the tilted SHELF, its 15°, or its rail. T54-F7's own sentence —
// *"The tilted shoe SHELF (15°, T33) is a DIFFERENT entity and is NOT
// touched"* — is exactly true of the LISP too, because there was nothing there
// to touch.
//
// ─── THE VERDICT ────────────────────────────────────────────────────────────
//
// THE COMMIT IS 38c2a5f, *"Turn 33 · F3 — the wardrobe's insides: what we cut,
// what we buy"*, 15.08.2026. It cut the tilted shoe shelf, its `SHOE-RAIL`
// stop rail, the `wardrobeAccessories.shoeShelf` profile block and the `shoe`
// shelf type — twelve files, 766 added lines — and NOT ONE LINE under
// `reference/lisp/`.
//
// So the law was never lost. It was BORN HOMELESS, and iron rule 1 was broken
// on the day the feature arrived. Two later turns handled the shoe (T34's box,
// T54's burial of it) and neither noticed, because both were looking at the
// box. That is the whole reason this took forensics rather than memory: the
// deletion was loud and innocent, and the omission was silent and fifteen days
// older.
//
// WHY IT IS A TEST AND NOT A PARAGRAPH. A verdict in a report is read once. The
// assertions below are the evidence itself, re-run every night: if anyone ever
// claims again that T54 buried this law, the suite says which commit it was.

/** git, or `null` where the history is not there to ask (a shallow checkout). */
const git = (cmd) => {
  try {
    return execSync(`git ${cmd}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return null;
  }
};

const VERDICT = '38c2a5f';
const ACCUSED = '0bb6425';

test('F5 · the accused: T54-F7 really did delete the shoe BOX\'s kit', () => {
  const deleted = git('log --format=%h --diff-filter=D -- reference/lisp/KIT_SHOE_BOX.lsp');
  if (deleted == null) return;
  assert.equal(deleted.trim().split('\n')[0], ACCUSED,
    'the loud, innocent event — and the reason the wrong answer is so easy');
  const stat = git(`show --stat --format= ${ACCUSED} -- reference/lisp/`);
  assert.match(stat, /KIT_SHOE_BOX\.lsp/);
  assert.match(stat, /461 deletions/, 'the whole kit, in one commit');
});

test('F5 · …but that kit never carried the SHELF\'s law', () => {
  const kit = git(`show ${ACCUSED}^:reference/lisp/KIT_SHOE_BOX.lsp`);
  if (kit == null) return;
  // The BOX's numbers are all over it…
  assert.match(kit, /80 mm high/, 'the box walls');
  assert.match(kit, /tan 10deg/, 'the box bottom\'s angle law');
  // …and the SHELF's are nowhere in it.
  assert.doesNotMatch(kit, /tiltDeg/);
  assert.doesNotMatch(kit, /shoeShelf/);
  assert.doesNotMatch(kit, /SHOE-RAIL/);
});

test('F5 · THE VERDICT: the law was born homeless in 38c2a5f, not lost later', () => {
  const born = git('log --format=%h -S\'SHOE-RAIL\' -- src/engine/cabinet.js');
  if (born == null) return;
  const oldest = born.trim().split('\n').filter(Boolean).pop();
  assert.equal(oldest, VERDICT, 'the rail is cut for the first time here');

  const subject = git(`log -1 --format=%s ${VERDICT}`);
  assert.match(subject, /Turn 33 · F3/, 'and this is the commit that did it');

  // The charge itself: the commit that introduced the geometry wrote no LISP.
  const lisp = git(`show --stat --format= ${VERDICT} -- reference/lisp/`);
  assert.equal(lisp.trim(), '', 'not one line under reference/lisp/ — iron rule 1, broken at birth');
});

test('F5 · and no kit ever stated the tilt before tonight', () => {
  // The claim in one command. `-S` counts occurrences, so this finds any commit
  // where either name entered or left a file under reference/lisp/.
  for (const needle of ['shoeShelf', 'tiltDeg', 'shoeTiltDeg']) {
    const hits = git(`log --format=%h -S'${needle}' -- reference/lisp/`);
    if (hits == null) return;
    const commits = hits.trim().split('\n').filter(Boolean);
    for (const sha of commits) {
      const subject = git(`log -1 --format=%s ${sha}`) || '';
      assert.match(subject, /^t58 /,
        `${needle} entered reference/lisp/ in ${sha} — the only turn that may is this one`);
    }
  }
});
