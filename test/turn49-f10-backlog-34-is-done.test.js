import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// ─── TURN 49 · F10 — BACKLOG 34 IS DONE, AND COMES OFF THE LIST ─────────────
//
// The owner, 25.08.2026: *"strzalki sa zrobione — usun z backlogu."*
//
// And the constraint that comes with it, which matters more than the removal:
// *"Do not renumber anything — the code cites backlog numbers in its comments,
// so the numbers are identifiers and the gaps are correct."* Renumbering would
// silently re-point seven comments in `src/` at somebody else's entry.

const BACKLOG = readFileSync(new URL('../BACKLOG.md', import.meta.url), 'utf8');

/** Every top-level numbered entry in the list, in the order it is written. */
function entryNumbers(text) {
  return [...text.matchAll(/^(\d+)\. \[/gm)].map((m) => Number(m[1]));
}

test('F10 — entry 34 is gone', () => {
  const numbers = entryNumbers(BACKLOG);
  assert.ok(numbers.length > 100, `the scan found ${numbers.length} entries — the test is broken, not the list`);
  assert.equal(numbers.includes(34), false, 'BACKLOG 34 is still on the list');
  // …and it is gone by its own words, not by a re-worded survivor.
  assert.doesNotMatch(BACKLOG, /Strzałki wymiarowe architektoniczne/);
  assert.doesNotMatch(BACKLOG, /groty odwrócone/);
});

test('F10 — NOTHING was renumbered: the gap at 34 is the only change', () => {
  const numbers = entryNumbers(BACKLOG);
  // Its neighbours did not move up into it.
  assert.ok(numbers.includes(33), '33 is still 33');
  assert.ok(numbers.includes(35), '35 is still 35');
  assert.ok(numbers.includes(36), '36 is still 36');
  // The list still climbs — a renumber would show up as a duplicate or as a
  // number that went backwards through the run 30…40.
  const run = numbers.filter((n) => n >= 30 && n <= 40);
  assert.deepEqual([...run].sort((a, b) => a - b), run, `30…40 is out of order: ${run.join(',')}`);
  assert.equal(new Set(run).size, run.length, `30…40 has a duplicate: ${run.join(',')}`);
});

test('F10 — the code that CITES #34 is untouched, because the number is an id', () => {
  // Seven comments record why every measurement in this app is drawn the way
  // turn 5 drew it. They are history, and history keeps its reference.
  const cites = [
    'src/stores/uiStore.js',
    'src/components/TopBar.jsx',
    'src/engine/profile.js',
    'src/engine/drawings/frontElevation.js',
    'src/engine/drawings/layers.js',
    'src/3d/DimLabel.jsx',
    'src/3d/DistanceArrows.jsx',
  ];
  for (const f of cites) {
    const text = readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
    assert.match(text, /#34|BACKLOG #34/, `${f} no longer cites the entry it was written for`);
  }
});
