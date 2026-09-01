#!/usr/bin/env node
// ─── THE BYTE-IDENTITY CONTRACT FOR TURN 61 ────────────────────────────────
//
// CLAUDE.md, STANDING LAW, verbatim:
//
//   *"**BYTE-IDENTITY.** Engine untouched → goldens byte-identical,
//   `tNN-classify.mjs` = ZERO deltas, `UNNAMED=0`, `NAMED=0`. LISP untouched,
//   census 14/14."*
//
// ─── AND THIS TURN'S ONE HONEST DIFFERENCE ─────────────────────────────────
//
// T59's classifier and T60's could both say the strongest possible thing: that
// no file under `src/engine` had moved, so no mechanism existed by which a
// golden COULD move. T61 CANNOT SAY THAT, and pretending otherwise would be the
// whole point of this file thrown away.
//
// CLAUDE.md licenses three engine files by name and no others:
//
//   engine/room.js          scope `'two'` in `wallsInScope`, and the `profile`
//                           pass-through `wallIndicesInScope` had dropped.
//   engine/design.js        the scope VOCABULARY — `ROOM_SCOPES` and
//                           `normaliseScope` — and `migrateDesign` reading it.
//   engine/projectTypes.js  `normaliseScope` delegating to that one list, so
//                           the migrator and the flow cannot disagree about a
//                           word. (This is the *"scope-normalisation sites you
//                           find by READING"* the spec asks to be named.)
//
// NONE OF THE THREE IS IN THE CUT PATH. `computeCabinet` takes a unit's params
// and the profile; it is never handed a room and never asks a scope. So the
// argument is not "no engine file moved" — it is "the engine files that moved
// are not reachable from a golden", and the `engine` probe below proves that by
// naming the three, refusing a fourth, and asking whether the SIX GOLDEN HASHES
// moved. A hash is the answer; the whitelist is only what makes the question
// honest.
//
//   node scripts/t61-classify.mjs                  the six goldens, hashed
//   node scripts/t61-classify.mjs --dump           the results, as JSON
//   node scripts/t61-classify.mjs base.json head.json     classify two dumps
//   node scripts/t61-classify.mjs --probe          argue every option
//   node scripts/t61-classify.mjs --probe chrome   argue one of them

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';

const ROOT = new URL('../', import.meta.url).pathname;

/**
 * THE SIX, AND THEY ARE T58b'S SIX — by way of T59's.
 *
 * Not a new set: the point of a golden is that it is the SAME question asked
 * again, and a turn that chose its own configurations would be marking its own
 * homework.
 */
const STANDARD_CONFIGS = [
  { id: 'WARDROBE', type: 'WARDROBE', drawers: false },
  { id: 'BUD', type: 'BUD', drawers: false },
  { id: 'WUD', type: 'WUD', drawers: false },
  { id: 'BUDR', type: 'BUDR', drawers: true },
  { id: 'BUDR4', type: 'BUDR4', drawers: true },
  { id: 'PANTRY', type: 'PANTRY', drawers: true },
];

const stable = (value) => JSON.stringify(value, (key, v) => {
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    return Object.fromEntries(Object.keys(v).sort().map((k) => [k, v[k]]));
  }
  return v;
});

function resultFor(cfg) {
  const params = defaultParamsFor(cfg.type, P);
  return computeCabinet(params, P);
}

export function dump() {
  const out = {};
  for (const cfg of STANDARD_CONFIGS) {
    try {
      const result = resultFor(cfg);
      out[cfg.id] = {
        drawers: cfg.drawers,
        sha256: createHash('sha256').update(stable(result)).digest('hex'),
      };
    } catch (e) {
      out[cfg.id] = { drawers: cfg.drawers, error: e.message };
    }
  }
  return out;
}

function classify(base, head) {
  const counts = { IDENTICAL: 0, UNNAMED: 0 };
  const rows = [];
  for (const cfg of STANDARD_CONFIGS) {
    const b = base[cfg.id];
    const h = head[cfg.id];
    const same = b && h && b.sha256 && b.sha256 === h.sha256;
    if (same) counts.IDENTICAL += 1;
    else counts.UNNAMED += 1;
    rows.push(`${cfg.id.padEnd(12)}${same ? 'IDENTICAL' : 'UNNAMED  '}  ${h?.sha256 || h?.error || '(missing)'}`);
  }
  return { rows, counts };
}

// ─── THE PROBES ────────────────────────────────────────────────────────────

const git = (args) => {
  try { return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }); } catch { return null; }
};

const baseRef = () => ['origin/main', 'main'].find(
  (ref) => git(['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]) !== null,
);

const src = (rel) => readFileSync(new URL(`../src/${rel}`, import.meta.url), 'utf8');

/** Does any PRO file mention this name? PRO must not know these exist. */
function proMentions(name) {
  const out = git(['grep', '-l', '-e', name, '--',
    'src/App.jsx', 'src/main.jsx', 'src/components', 'src/pages', 'src/lib', 'index.html']);
  return (out || '').trim().split('\n').filter(Boolean);
}

const PROBES = {
  /**
   * THE ENGINE, AND THE THREE FILES THIS TURN WAS GIVEN.
   *
   * The whitelist is CLAUDE.md's, quoted in the header, and it is checked in
   * both directions: a licensed file that moved is fine, an unlicensed one is
   * not, and — the half that matters — the six golden hashes have to be the
   * ones they were whatever moved.
   */
  engine: () => {
    const ref = baseRef();
    const rows = [];
    if (!ref) {
      return {
        title: 'THE ENGINE, AGAINST ITS BASE',
        head: ['what', 'answer'],
        rows: [{ id: 'git', cells: ['no base ref — cannot answer'], ok: null }],
        verdict: ['NO BASE REF. The goldens above are the whole proof here.',
          'NO BASE REF. The goldens above are the whole proof here.'],
      };
    }
    // The three, by name. Anything else under src/engine is a finding.
    const LICENSED = ['src/engine/room.js', 'src/engine/design.js', 'src/engine/projectTypes.js'];
    const moved = (git(['diff', '--name-only', ref, '--', 'src/engine']) || '')
      .trim().split('\n').filter(Boolean);
    const strays = moved.filter((f) => !LICENSED.includes(f));
    for (const path of LICENSED) {
      const diff = (git(['diff', '--stat', ref, '--', path]) || '').trim();
      rows.push({
        id: path.replace('src/engine/', ''),
        cells: [diff === '' ? 'unchanged' : diff.split('\n').pop().trim(), 'licensed'],
        ok: true,
      });
    }
    rows.push({
      id: 'anything else',
      cells: [strays.length ? strays.join(' ') : 'nothing', 'nothing'],
      ok: strays.length === 0,
    });
    for (const path of ['KIT_SINK.lsp', 'reference']) {
      const diff = (git(['diff', '--stat', ref, '--', path]) || '').trim();
      rows.push({ id: path, cells: [diff === '' ? 'unchanged' : 'MOVED', 'unchanged'], ok: diff === '' });
    }
    // AND THE CUT PATH ITSELF: is a scope reachable from `computeCabinet`?
    // It takes a unit's params and the profile. It is never handed a room.
    const cabinet = src('engine/cabinet.js');
    const asksScope = /\bwallsInScope\b|\bnormaliseScope\b|design\??\.scope/.test(cabinet);
    rows.push({
      id: 'cut path asks scope',
      cells: [String(asksScope), 'false'],
      ok: asksScope === false,
    });
    return {
      title: 'THE ENGINE, AGAINST ITS BASE — AND THE THREE FILES T61 WAS GIVEN',
      head: ['path', `diff vs ${ref}`, 'wanted'],
      rows,
      note: 'T59 and T60 could say "no engine file moved". T61 cannot, and says the\n'
        + 'true thing instead: THREE moved, all three named in CLAUDE.md, and none of\n'
        + 'them in the cut path. A scope decides which walls are DRAWN and OFFERED;\n'
        + '`computeCabinet` is never handed a room and never asks. The six hashes\n'
        + 'above are what settles it — the whitelist only makes the question honest.',
      verdict: ['CLEAN — only the three licensed files moved, and none is in the cut path.',
        'NOT CLEAN — an engine file moved that CLAUDE.md did not license. Iron rule: '
        + 'write it up as a FINDING.'],
    };
  },

  /** PRO's own surface did not move either. */
  pro: () => {
    const ref = baseRef();
    if (!ref) {
      return {
        title: 'THE FROZEN PRO SURFACE',
        head: ['what', 'answer'],
        rows: [{ id: 'git', cells: ['no base ref — see test/turn59-f1-the-switch.test.js'], ok: null }],
        verdict: ['NO BASE REF.', 'NO BASE REF.'],
      };
    }
    const paths = ['index.html', 'src/App.jsx', 'src/main.jsx', 'src/components', 'src/pages'];
    const rows = paths.map((path) => {
      const diff = (git(['diff', '--stat', ref, '--', path]) || '').trim();
      return { id: path, cells: [diff === '' ? 'unchanged' : 'MOVED'], ok: diff === '' };
    });
    return {
      title: 'THE FROZEN PRO SURFACE',
      head: ['path', `diff vs ${ref}`],
      rows,
      note: 'The owner, verbatim: "ten istniejący tryb to jest tryb PRO i musi być\n'
        + 'zachowany jak teraz." NOT ONE VISIBLE BYTE OF PRO CHANGES THIS TURN —\n'
        + 'including the turn that put PRO\'s whole VIEW BAR into the client\'s room.',
      verdict: ['CLEAN — PRO IS FROZEN.',
        'NOT CLEAN — PRO moved. That is the one thing this turn was not allowed to do.'],
    };
  },

  /**
   * T60's headline addition: the viewer's chrome CHANNELS.
   *
   * The argument is a fall-through. `chromeOn(part)` answers the master switch
   * for any part nobody has claimed — and PRO claims none — so every guard in
   * the five files below still reads `if (!true) return null`, exactly as it
   * did last night.
   */
  chrome: async () => {
    const {
      chromeOn, proChromeOn, setChromePart, setProChrome,
    } = await import('../src/3d/chrome.js');
    const before = proChromeOn();
    const fell = ['dimensions', 'outlines', 'measure', 'anything'].every((p) => chromeOn(p) === true);
    setProChrome(false);
    setChromePart('dimensions', true);
    const claimed = chromeOn('dimensions') === true && chromeOn('hinges') === false;
    setProChrome(true);                       // …which also clears every channel
    const cleared = chromeOn('dimensions') === true;
    const mentions = [...proMentions('setChromePart'), ...proMentions('chromeOn')];

    // ─── T61: ALL ELEVEN ASK A CHANNEL NOW ────────────────────────────────
    //
    // The owner: *"takwlacz praktycznei wszystko"* · *"1 all 8"*. T60 had four
    // channelled and seven on the master switch; tonight the remaining seven
    // components and UnitView's hover-shelf ghost joined them, so
    // `proChromeOn()` holds nothing but the switch every channel falls through
    // to. THE ARGUMENT IS THE SAME ARGUMENT — a channel PRO never sets returns
    // the master switch, so each of these guards still reads `if (!true)`.
    const CHANNELLED = {
      DimLabel: "chromeOn('dimensions')",
      DimensionChain: "chromeOn('dimensions')",
      DistanceArrows: "chromeOn('dimensions')",
      Ruler: "chromeOn('measure')",
      DrillRings: "chromeOn('drill')",
      AddPlus: "chromeOn('plus')",
      PartMachining: "chromeOn('machining')",
      LedIcons: "chromeOn('led-icons')",
      HoverDimensions: "chromeOn('hover-dims')",
      EdgeHandle: "chromeOn('edge')",
      ShareOutBar: "chromeOn('share')",
    };
    const ELEVEN = ['AddPlus', 'DimLabel', 'DimensionChain', 'DistanceArrows', 'DrillRings',
      'EdgeHandle', 'HoverDimensions', 'LedIcons', 'PartMachining', 'Ruler', 'ShareOutBar'];
    const guards = ELEVEN.filter((n) => src(`3d/${n}.jsx`)
      .includes(`if (!${CHANNELLED[n] || 'proChromeOn()'}) return null;`));
    const contour = src('3d/UnitView.jsx').includes("chromeOn('outlines') && (outlines || contour || xray)");
    // …and the eighth of tonight's eight, which is a JSX condition rather than
    // a component guard and so is asked for by name.
    const ghost = src('3d/UnitView.jsx').includes("chromeOn('hover') && hoverShelf");
    // THE RETAIL ENTRY CLAIMS ELEVEN, and PRO claims none.
    const entry = src('retail/main-retail.jsx');
    const claimedParts = [...entry.matchAll(/setChromePart\('([^']+)'/g)].map((m) => m[1]);
    // TWO ROUTES, NOT A RENDER SITE MOVED. The `+` markers terminate in PRO
    // surfaces retail does not mount, so `Scene` grew two optional props whose
    // default is the line PRO always ran.
    const scene = src('3d/Scene.jsx');
    const routes = /onAddPlus = null/.test(scene) && /onAddInside = null/.test(scene)
      && /if \(onAddPlus\) \{ onAddPlus\(point\); return; \}/.test(scene)
      && /if \(onAddInside\) \{ onAddInside\(unit\.id, at \|\| null\); return; \}/.test(scene);

    return {
      title: 'src/3d/chrome.js — THE VIEWER\'S CHROME, AND ITS CHANNELS',
      head: ['what', 'answer', 'wanted'],
      rows: [
        { id: 'default', cells: [String(before), 'true'], ok: before === true },
        { id: 'falls through', cells: [String(fell), 'true'], ok: fell },
        { id: 'a channel', cells: [String(claimed), 'true'], ok: claimed },
        { id: 'switch clears it', cells: [String(cleared), 'true'], ok: cleared },
        { id: 'PRO calls it', cells: [mentions.length ? mentions.join(' ') : 'nowhere', 'nowhere'], ok: mentions.length === 0 },
        { id: 'guards intact', cells: [`${guards.length}`, '11'], ok: guards.length === 11 },
        { id: 'contour guarded', cells: [String(contour), 'true'], ok: contour },
        { id: 'hover ghost', cells: [String(ghost), 'true'], ok: ghost },
        { id: 'entry claims', cells: [`${claimedParts.length}`, '11'], ok: claimedParts.length === 11 },
        { id: 'plus routes default to PRO', cells: [String(routes), 'true'], ok: routes },
      ],
      note: 'A CHANNEL is an override, and PRO sets none — so `chromeOn(part)` returns\n'
        + 'the master switch and every one of the eleven guards is the line it was.\n'
        + 'T61 claims ELEVEN of them from the retail entry (*"1 all 8"*, on top of\n'
        + 'T60\'s three), which is what stops eleven overlays being invisible in the\n'
        + 'client\'s room — and what makes two `+` markers need a route, since both\n'
        + 'of PRO\'s terminate in a surface retail does not mount.',
      verdict: ['CLEAN — the chrome is on by default and PRO cannot tell this file grew.',
        'NOT CLEAN — PRO\'s overlays are not what they were.'],
    };
  },

  /** The store's five additions: three read-only, two write, none of them PRO's. */
  store: async () => {
    const { useProjectStore } = await import('../src/stores/projectStore.js');
    const s = useProjectStore.getState();
    const ADDED = ['shelfTravelFor', 'railTravelFor', 'unitSizeBoundsFor',
      'setRailMount', 'setDrawerFitting'];
    const rows = ADDED.map((name) => {
      const mentions = proMentions(name);
      return {
        id: name,
        cells: [typeof s[name], mentions.length ? mentions.join(' ') : 'nowhere'],
        ok: typeof s[name] === 'function' && mentions.length === 0,
      };
    });
    // The three READ-ONLY ones must write nothing: asked twice, the project is
    // the same object it was.
    const before = JSON.stringify(useProjectStore.getState().units);
    s.unitSizeBoundsFor('nothing-like-this');
    s.shelfTravelFor('nothing-like-this', 'nor-this');
    s.railTravelFor('nothing-like-this', 'nor-this');
    const after = JSON.stringify(useProjectStore.getState().units);
    rows.push({ id: 'read-only', cells: [before === after ? 'wrote nothing' : 'WROTE', 'wrote nothing'], ok: before === after });
    return {
      title: 'src/stores/projectStore.js — FIVE ADDITIONS, NONE OF THEM PRO\'S',
      head: ['name', 'is', 'PRO calls it'],
      rows,
      note: 'Three ANSWER a question the surface had no way to ask without performing\n'
        + 'an edit — where a shelf may go, how high a rod may hang, how big a\n'
        + 'wardrobe may be. Two ACT where PRO has only ever acted at add time. No\n'
        + 'existing line changed except the rail selector\'s own lookup.',
      verdict: ['CLEAN — additive, read-only where it says so, and invisible to PRO.',
        'NOT CLEAN — one of them is not what it claims.'],
    };
  },

  /** Nothing outside src/retail imports src/retail, and retail imports no PRO. */
  boundary: () => {
    const mentions = proMentions('src/retail');
    const fromRetail = (git(['grep', '-l', '-e', "from '\\.\\./\\.\\./components", '--', 'src/retail'])
      || '').trim().split('\n').filter(Boolean);
    const intoLib = (git(['grep', '-l', '-e', "from '\\.\\./\\.\\./lib", '--', 'src/retail'])
      || '').trim().split('\n').filter(Boolean);
    return {
      title: 'THE IRON BOUNDARY (Petros, 30.08)',
      head: ['what', 'answer', 'wanted'],
      rows: [
        { id: 'PRO names retail', cells: [mentions.length ? mentions.join(' ') : 'nowhere', 'nowhere'], ok: mentions.length === 0 },
        { id: 'retail names PRO', cells: [fromRetail.length ? fromRetail.join(' ') : 'nowhere', 'nowhere'], ok: fromRetail.length === 0 },
        { id: 'retail names lib', cells: [intoLib.length ? intoLib.join(' ') : 'nowhere', 'nowhere'], ok: intoLib.length === 0 },
      ],
      note: 'The walker in test/turn59-f1-the-switch.test.js is the real assertion —\n'
        + 'it resolves every specifier under src/ and sorts it into three zones.\n'
        + 'T60 added `src/3d/propsPack.js` so the VIEW BAR could ask whether the\n'
        + 'props pack arrived WITHOUT reaching into src/lib, which the boundary\n'
        + 'calls PRO\'s. The door is in the core; retail knocks on the core.',
      verdict: ['CLEAN — two applications, one house, one wall between them.',
        'NOT CLEAN — the boundary leaks.'],
    };
  },

  /**
   * T61 F2 · THE SECOND WALL — the one engine LAW this turn wrote.
   *
   * It is `'wall'`'s law with one more real wall, and this argues it rather
   * than asserting it: the pair is adjacent, the two FREE ends get the same
   * `wallStub` returns one-wall mode gives its own two, "real" is still the
   * absence of the stub flag, and the two scopes PRO can produce answer exactly
   * what they answered before.
   */
  walls: async () => {
    const {
      DEFAULT_WALL_STUB, rectCorners, wallsInScope, wallIndicesInScope,
    } = await import('../src/engine/room.js');
    const { ROOM_SCOPES, migrateDesign, normaliseScope } = await import('../src/engine/design.js');
    const { normaliseScope: flowScope } = await import('../src/engine/projectTypes.js');

    const room = {
      schema: 2, height: 2500, corners: rectCorners(4000, 3000), openings: [],
    };
    const two = wallsInScope(room, 'two');
    const real = two.filter((w) => !w.stub);
    const stubs = two.filter((w) => w.stub);
    const near = (a, b) => Math.abs(a.x - b.x) < 1e-6 && Math.abs(a.y - b.y) < 1e-6;
    // The pair shares corner 1; the free ends are wall 0's start and wall 1's end.
    const adjacent = real.length === 2 && near(real[0].end, real[1].start);
    const capped = stubs.length === 2
      && stubs.every((s) => near(s.end, real[0].start) || near(s.start, real[1].end))
      && stubs.every((s) => Math.abs(s.width - DEFAULT_WALL_STUB) < 1e-6);
    const indices = JSON.stringify(wallIndicesInScope(room, 'two'));
    // …and the two scopes PRO can write are the answers they always were.
    const unchanged = wallsInScope(room, 'wall').length === 3
      && JSON.stringify(wallIndicesInScope(room, 'wall')) === '[0]'
      && wallsInScope(room, 'room').length === 4
      && JSON.stringify(wallIndicesInScope(room, 'room')) === '[0,1,2,3]';
    // ONE VOCABULARY, so the migrator and the flow cannot disagree about a word.
    const oneList = normaliseScope === flowScope
      && JSON.stringify(ROOM_SCOPES) === '["room","wall","two"]';
    const survives = migrateDesign({ scope: 'two' }).scope === 'two'
      && migrateDesign({ scope: 'nonsense' }).scope === 'room'
      && migrateDesign({ scope: 'wall' }).scope === 'wall';
    // NO PRO SURFACE CAN WRITE IT, which is why PRO's output cannot move.
    const proWrites = proMentions("scope: 'two'");

    return {
      title: "engine/room.js — SCOPE 'two', AND WHY PRO CANNOT SEE IT",
      head: ['what', 'answer', 'wanted'],
      rows: [
        { id: 'two real walls', cells: [String(adjacent), 'true'], ok: adjacent },
        { id: 'two free ends capped', cells: [String(capped), 'true'], ok: capped },
        { id: 'indices', cells: [indices, '[0,1]'], ok: indices === '[0,1]' },
        { id: "'wall' and 'room'", cells: [String(unchanged), 'true'], ok: unchanged },
        { id: 'one vocabulary', cells: [String(oneList), 'true'], ok: oneList },
        { id: 'survives the migrator', cells: [String(survives), 'true'], ok: survives },
        { id: 'PRO writes it', cells: [proWrites.length ? proWrites.join(' ') : 'nowhere', 'nowhere'], ok: proWrites.length === 0 },
      ],
      note: "The owner: *\"zrob 2 sciany, Elki bedziemy dokaldac\"*. It is the ONE-WALL\n"
        + 'law with one more real wall — the previous wall keeps the end that touches\n'
        + 'corner 0 exactly as it did, and the next one moves along by one because\n'
        + 'walls[1] is now a wall a client stands furniture against. No PRO surface\n'
        + "can produce a 'two' project, so PRO's rendered output cannot move: that\n"
        + 'is the same fall-through argument the chrome channels make, on another axis.',
      verdict: ["CLEAN — 'two' is 'wall' with one more real wall, and PRO cannot write it.",
        'NOT CLEAN — the scope law is not what it claims.'],
    };
  },

  /** The nine menus, and the law that governs all of them. */
  menus: async () => {
    const A = await import('../src/retail/design/adapter.js');
    const router = src('retail/design/detail/index.jsx');
    const keys = [...router.matchAll(/^ {2}(\w+): \w+Menu,$/gm)].map((m) => m[1]);
    const placeholder = (git(['grep', '-l', '-e', 'No options for this element', '--', 'src'])
      || '').trim().split('\n').filter(Boolean);
    return {
      title: 'COLUMN 7 — A MENU FOR EVERY ELEMENT',
      head: ['what', 'answer', 'wanted'],
      rows: [
        { id: 'menus', cells: [String(A.MENUS.length), '13'], ok: A.MENUS.length === 13 },
        { id: 'router table', cells: [String(keys.length), '13'], ok: keys.length === 13 },
        // T61 F4: ten rows, and every one of them opens a menu that exists.
        { id: 'interior rows', cells: [String(A.INTERIOR_ROWS.length), '10'], ok: A.INTERIOR_ROWS.length === 10 },
        {
          id: 'every row has a menu',
          cells: [String(A.INTERIOR_ROWS.every((r) => A.MENUS.includes(r.menu))), 'true'],
          ok: A.INTERIOR_ROWS.every((r) => A.MENUS.includes(r.menu)),
        },
        { id: 'no default branch', cells: [String(!/default:/.test(router)), 'true'], ok: !/default:/.test(router) },
        {
          id: 'placeholder',
          cells: [placeholder.length ? placeholder.join(' ') : 'deleted', 'deleted'],
          // The two files that ARGUE the deletion quote the sentence in a
          // comment; a hit anywhere else is the placeholder coming back.
          ok: placeholder.every((f) => /Detail\.jsx$|detail\/index\.jsx$/.test(f)),
        },
      ],
      note: 'The router is a TABLE, so a kind that is not a key in it has no menu, is\n'
        + 'not selectable, and cannot render an empty panel. That is where the\n'
        + 'licensed deletion actually lands: the DEFAULT BRANCH went with the string.\n'
        + 'T61 F4 grew the list to PRO\'s ten rows and the table to thirteen menus,\n'
        + 'which is the same law asked of four more elements: an element with no menu\n'
        + 'is not clickable, so a row that adds one would be adding nothing.',
      verdict: ['CLEAN — thirteen menus, ten rows, no default branch, no placeholder.',
        'NOT CLEAN — column 7 can render a panel with nothing in it.'],
    };
  },
};

async function runProbe(name) {
  const probe = await PROBES[name]();
  const clean = probe.rows.every((r) => r.ok !== false);
  const width = Math.max(18, ...probe.rows.map((r) => r.id.length + 2));
  const colW = probe.head.slice(1).map((h, i) => Math.max(
    h.length + 2, ...probe.rows.map((r) => String(r.cells[i] ?? '').length + 2),
  ));
  let out = `${probe.title}\n${'─'.repeat(72)}\n`;
  out += probe.head[0].padEnd(width);
  probe.head.slice(1).forEach((h, i) => { out += h.padEnd(colW[i]); });
  out += '\n';
  for (const r of probe.rows) {
    out += r.id.padEnd(width);
    r.cells.forEach((c, i) => { out += String(c).padEnd(colW[i] || 14); });
    out += `${r.ok === false ? '  ← ' : ''}\n`;
  }
  if (probe.note) out += `\n${probe.note}\n`;
  out += `\n${clean ? probe.verdict[0] : probe.verdict[1]}\n`;
  return { out, clean };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const probeAt = argv.indexOf('--probe');
  if (argv.includes('--dump')) {
    process.stdout.write(`${JSON.stringify(dump())}\n`);
  } else if (probeAt >= 0) {
    const only = argv[probeAt + 1] && !argv[probeAt + 1].startsWith('--')
      ? argv[probeAt + 1].toLowerCase() : null;
    const names = only ? [only] : Object.keys(PROBES);
    if (only && !PROBES[only]) {
      process.stdout.write(`no probe named ${only} — have [${Object.keys(PROBES).join(', ')}]\n`);
      process.exit(2);
    }
    let bad = 0;
    for (const name of names) {
      // eslint-disable-next-line no-await-in-loop
      const { out, clean } = await runProbe(name);
      process.stdout.write(`${out}\n`);
      if (!clean) bad += 1;
    }
    if (names.length > 1) {
      process.stdout.write(`${'─'.repeat(72)}\n${names.length} probe(s), ${bad === 0
        ? 'every one CLEAN — only the three licensed engine files moved, none of them in\n'
        + 'the cut path, and PRO cannot tell this turn happened.'
        : `${bad} NOT CLEAN. Iron rule: write it up as a FINDING.`}\n`);
    }
    process.exit(bad === 0 ? 0 : 1);
  } else if (argv.length === 2) {
    const base = JSON.parse(readFileSync(argv[0], 'utf8'));
    const head = JSON.parse(readFileSync(argv[1], 'utf8'));
    const { rows, counts } = classify(base, head);
    process.stdout.write(`${rows.join('\n')}\n\n`);
    process.stdout.write('EXPECTED BUCKETS: none, and this turn cannot name one. Turn 61 changed\n'
      + 'THREE files under src/engine — room.js, design.js and projectTypes.js, all\n'
      + 'three named in CLAUDE.md — and every one of them is about a room SCOPE:\n'
      + 'which walls are drawn and offered. `computeCabinet` is handed a unit\'s\n'
      + 'params and the profile, never a room, and the `engine` probe checks that it\n'
      + 'names no scope function at all. So there is no mechanism by which a golden\n'
      + 'could move, and `--probe` argues every other change as an exit code.\n');
    process.stdout.write('IF A GOLDEN MOVED:  iron rule — write it up as a FINDING. Do not name a bucket for it.\n');
    process.stdout.write(`NAMED:            0\nUNNAMED:          ${counts.UNNAMED}\n`);
    process.exit(counts.UNNAMED === 0 ? 0 : 1);
  } else {
    const d = dump();
    for (const cfg of STANDARD_CONFIGS) {
      const row = d[cfg.id];
      process.stdout.write(`${cfg.id.padEnd(12)}drawers=${cfg.drawers ? 'yes' : 'no '}  ${row.sha256 || row.error}\n`);
    }
    process.stdout.write('\nNAMED deltas this turn: 0 — the three engine files that changed are\n'
      + 'the scope vocabulary, and the cut path never asks a scope.\n');
  }
}
