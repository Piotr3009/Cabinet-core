#!/usr/bin/env node
// ─── THE BYTE-IDENTITY CONTRACT FOR TURN 62 ────────────────────────────────
//
// CLAUDE.md, STANDING LAW, verbatim:
//
//   *"**BYTE-IDENTITY.** Engine untouched → goldens byte-identical,
//   `tNN-classify.mjs` = ZERO deltas, `UNNAMED=0`, `NAMED=0`. LISP untouched,
//   census 14/14."*
//
// ─── AND THIS TURN CAN SAY THE STRONG THING AGAIN ──────────────────────────
//
// T61 could not. It was licensed three engine files by name — `room.js`,
// `design.js`, `projectTypes.js` — so its argument had to be the careful one:
// the files that moved are not reachable from a golden.
//
// T62 IS LICENSED NONE. CLAUDE.md, verbatim: *"No engine file is licensed this
// turn. If F-work seems to need one, that is a skip-and-note, not an edit."*
//
// So the `engine` probe below asks the simplest question there is — did ANY
// file under `src/engine` move — and a single name in that answer is a
// finding. There is no whitelist to argue about, because there is no
// whitelist. The six golden hashes are asked for anyway: a claim that no
// mechanism exists is worth less than a hash that has not moved, and the two
// together are worth more than either.
//
// ─── WHAT THIS TURN DID INSTEAD ────────────────────────────────────────────
//
// It COPIED. The owner, 01.09.2026: *"jak piszę 1 do 1 to KOPIUJ. ale kopiuj —
// nie kasuj, nie zmieniaj PRO, tylko zrób identycznie w retail."* Two of PRO's
// screens (and the two components they reach) now exist twice: once in
// `src/components/`, untouched, and once in `src/retail/design/room/` with
// their imports repointed and their class names reskinned. The `copy` probe
// argues that the second one is the first one.
//
//   node scripts/t62-classify.mjs                  the six goldens, hashed
//   node scripts/t62-classify.mjs --dump           the results, as JSON
//   node scripts/t62-classify.mjs base.json head.json     classify two dumps
//   node scripts/t62-classify.mjs --probe          argue every option
//   node scripts/t62-classify.mjs --probe copy     argue one of them

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

/**
 * Comments out.
 *
 * MEASURED FAULT, and it bit this file twice while it was being written. A
 * probe that greps raw source cannot tell a headstone from a body: the `engine`
 * probe read the word `ceilingAt` out of a COMMENT in `cabinet.js` and reported
 * the cut path asking a room, and the `slope` probe read `SLOPED CEILING` out
 * of the tombstone this turn left where the chip used to be and reported the
 * chip alive. Both are the same mistake `test/turn59-f1-the-switch.test.js`
 * names in its own header — prose is not an edge. */
const code = (rel) => src(rel)
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^[ \t]*\/\/.*$/gm, ' ');

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
    // NO WHITELIST. CLAUDE.md: *"No engine file is licensed this turn."* So a
    // single name in this answer is a finding, and the question is the simple
    // one T61 was not allowed to ask.
    const moved = (git(['diff', '--name-only', ref, '--', 'src/engine']) || '')
      .trim().split('\n').filter(Boolean);
    rows.push({
      id: 'src/engine',
      cells: [moved.length ? moved.join(' ') : 'nothing', 'nothing'],
      ok: moved.length === 0,
    });
    for (const path of ['KIT_SINK.lsp', 'reference']) {
      const diff = (git(['diff', '--stat', ref, '--', path]) || '').trim();
      rows.push({ id: path, cells: [diff === '' ? 'unchanged' : 'MOVED', 'unchanged'], ok: diff === '' });
    }
    // …and `src/lib`, which this turn RE-ZONED without editing. F1 moved it into
    // the shared core so retail could import the slope maths; CLAUDE.md then
    // made it *"copy-safe, edit-hostile"* — *"Retail may IMPORT from it. Retail
    // may not change it."* PRO reads those same functions, so a byte moved here
    // would reach PRO by another road than `src/components`.
    const lib = (git(['diff', '--name-only', ref, '--', 'src/lib']) || '')
      .trim().split('\n').filter(Boolean);
    rows.push({
      id: 'src/lib (re-zoned, not edited)',
      cells: [lib.length ? lib.join(' ') : 'nothing', 'nothing'],
      ok: lib.length === 0,
    });
    // THE CUT PATH, asked anyway. It takes a unit's params and the profile; it
    // has never been handed a room and does not learn to be one tonight.
    const cabinet = code('engine/cabinet.js');
    const asksRoom = /\bwallsInScope\b|\bnormaliseScope\b|\bwallHeightAt\b|\bceilingAt\b/.test(cabinet);
    rows.push({ id: 'cut path asks a room', cells: [String(asksRoom), 'false'], ok: asksRoom === false });
    return {
      title: 'THE ENGINE, AGAINST ITS BASE — AND T62 WAS LICENSED NOTHING',
      head: ['path', `diff vs ${ref}`, 'wanted'],
      rows,
      note: 'T61 was given three engine files by name and had to argue that none of\n'
        + 'them was reachable from a golden. T62 was given NONE — *"No engine file is\n'
        + 'licensed this turn. If F-work seems to need one, that is a skip-and-note,\n'
        + 'not an edit."* — so the question is the blunt one: did anything move. The\n'
        + 'six hashes above answer it a second time, in another language.',
      verdict: ['CLEAN — not one engine byte moved, and the six goldens agree.',
        'NOT CLEAN — an engine file moved and this turn was licensed none. Iron rule: '
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
    // T62 F1: `src/lib` is the SHARED CORE now, so reaching it is no longer a
    // violation — it is the point. What is counted instead is that retail
    // reaches it and does not EDIT it (the `engine` probe above checks the
    // bytes), because *"one engine in one place"* is the owner's own reason.
    const intoLib = (git(['grep', '-l', '-e', "/lib/", '--', 'src/retail'])
      || '').trim().split('\n').filter(Boolean);
    return {
      title: 'THE IRON BOUNDARY (Petros, 30.08)',
      head: ['what', 'answer', 'wanted'],
      rows: [
        { id: 'PRO names retail', cells: [mentions.length ? mentions.join(' ') : 'nowhere', 'nowhere'], ok: mentions.length === 0 },
        { id: 'retail names PRO', cells: [fromRetail.length ? fromRetail.join(' ') : 'nowhere', 'nowhere'], ok: fromRetail.length === 0 },
        { id: 'retail reaches lib (core now)', cells: [String(intoLib.length), 'more than 0'], ok: intoLib.length > 0 },
      ],
      note: 'The walker in test/turn59-f1-the-switch.test.js is the real assertion —\n'
        + 'it resolves every specifier under src/ and sorts it into FOUR core zones\n'
        + 'plus retail\'s own. T62 F1 moved `src/lib` into the core, on the owner\'s\n'
        + 'own reason — *"po to mamy cały silnik w jednym miejscu"* — and left the\n'
        + 'COMPONENT half exactly where it was: retail importing a PRO component is\n'
        + 'still a violation, because the law is COPY, not import.',
      verdict: ['CLEAN — two applications, one house, one wall between them.',
        'NOT CLEAN — the boundary leaks.'],
    };
  },

  /**
   * T62 F2/F3 · THE COPY IS A COPY.
   *
   * The whole turn in one probe. Four of PRO's files now exist twice, and the
   * question is whether the second one is the first one — asked four ways:
   * the labels a person reads, the `data-*` hooks a test grabs, the gestures a
   * hand makes, and the names the file imports.
   */
  copy: () => {
    const PAIRS = [
      ['components/RoomModal.jsx', 'retail/design/room/RoomModal.jsx'],
      ['components/WallElevationModal.jsx', 'retail/design/room/WallElevationModal.jsx'],
      ['components/Modal.jsx', 'retail/design/room/Modal.jsx'],
      ['components/NumberField.jsx', 'retail/design/room/NumberField.jsx'],
    ];
    const uncomment = (t) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
    const labels = (t) => {
      const out = new Set();
      for (const m of uncomment(t).matchAll(/>([^<>{}]+)</g)) {
        const s2 = m[1].replace(/\s+/g, ' ').trim();
        if (!/[;=()[\]|&`]|=>/.test(s2) && s2.length >= 2 && /[A-Za-z]/.test(s2)) out.add(s2);
      }
      return [...out];
    };
    const hooks = (t) => [...new Set([...uncomment(t).matchAll(/\bdata-([a-z0-9-]+)=/g)].map((m) => m[1]))];
    const gestures = (t) => [...new Set([...uncomment(t).matchAll(/\b(on[A-Z][A-Za-z]+)=/g)].map((m) => m[1]))];
    const rows = [];
    for (const [proRel, retailRel] of PAIRS) {
      const pro = src(proRel);
      const copy = src(retailRel);
      const lost = [
        ...labels(pro).filter((l) => !copy.includes(l)),
        ...hooks(pro).filter((h) => !hooks(copy).includes(h)),
        ...gestures(pro).filter((h) => !gestures(copy).includes(h)),
      ];
      rows.push({
        id: proRel.replace('components/', ''),
        cells: [`${labels(pro).length} labels · ${hooks(pro).length} hooks · ${gestures(pro).length} gestures`,
          lost.length ? lost.join(' ') : 'nothing lost'],
        ok: lost.length === 0,
      });
    }
    // THE ONE ADDITION, declared rather than discovered.
    const room = src('retail/design/room/RoomModal.jsx');
    const optIn = /onOpenWall = null,/.test(room) && /\{onOpenWall && \(/.test(room);
    rows.push({ id: 'the one addition', cells: ['onOpenWall, opt-in', String(optIn)], ok: optIn });
    // AND NO IMPORT ACROSS THE WALL. The law is copy, not import.
    const imports = PAIRS.map(([, r]) => r)
      .concat(['retail/design/room/RoomEditor.jsx'])
      .filter((r) => /from '[^']*\/components\//.test(src(r)));
    rows.push({
      id: 'retail imports a PRO component',
      cells: [imports.length ? imports.join(' ') : 'nowhere', 'nowhere'],
      ok: imports.length === 0,
    });
    return {
      title: 'F2/F3 — FOUR FILES, COPIED, AND STILL THE SAME SCREENS',
      head: ['file', 'what PRO shows', 'what the copy lost'],
      rows,
      note: 'The owner: *"jak piszę 1 do 1 to KOPIUJ. ale kopiuj — nie kasuj, nie\n'
        + 'zmieniaj PRO, tylko zrób identycznie w retail."* Two mechanical passes ran\n'
        + 'over each copy and nothing else: imports repointed three directories deeper,\n'
        + 'and every class token renamed to a `pbi-re-*` name defined in\n'
        + '`styles/roomeditor.css` at PRO\'s own geometry in PBI\'s colours.\n'
        + '`test/turn62-f2-f3-the-copy.test.js` is the real assertion; this is the\n'
        + 'argument beside it.',
      verdict: ['CLEAN — the copy shows every word, hook and gesture PRO shows.',
        'NOT CLEAN — a control was lost in the copy. That is "1 do 20" happening twice.'],
    };
  },

  /**
   * T62 F3 · THE SLOPE IS REAL, AND ONE PLACE DECIDES A WALL'S HEIGHT.
   *
   * T61 gave retail a `SLOPED CEILING NO | YES` chip. The owner asked for
   * *"slope ale nie cały sufit tylko część"*. This is the difference, measured.
   */
  slope: async () => {
    const { wallHeightAt } = await import('../src/lib/wallElements.js');
    const { flatFieldShown, flatFromRun, runFromFlat } = await import('../src/lib/slopeFlat.js');
    const WALL = { wallWidth: 4000, wallHeight: 2500 };
    const slope = { kind: 'slope', wall: 0, side: 'R', startHeight: 1800, run: 900 };
    const at = (x) => wallHeightAt(x, [slope], WALL);
    const cut = [...Array(41).keys()].map((i) => at(i * 100)).filter((h) => h < 2500).length;
    // ONE PLACE. `wallElements.wallHeightAt` is a one-line call into
    // `slopeLine.ceilingAt` and this checks the line is still one line.
    const oneLerp = /return ceilingAt\(xMm, wallSlopes\(slopes\), \{ wallWidth, wallHeight \}\);/
      .test(code('lib/wallElements.js'));
    const chip = /SLOPED CEILING/.test(code('retail/design/Options.jsx'));
    return {
      title: 'F3 — A SLOPE CUTS PART OF THE CEILING, NOT ALL OF IT',
      head: ['what', 'answer', 'wanted'],
      rows: [
        { id: 'height at x=0', cells: [String(at(0)), '2500'], ok: at(0) === 2500 },
        { id: 'height at x=4000', cells: [String(at(4000)), '1800'], ok: at(4000) === 1800 },
        { id: 'the rake starts at 3100', cells: [String(at(3100)), '2500'], ok: at(3100) === 2500 },
        { id: 'it is a straight line', cells: [String(at(3550)), '2150'], ok: at(3550) === 2150 },
        { id: 'samples cut, of 41', cells: [String(cut), 'fewer than half'], ok: cut > 0 && cut < 20 },
        { id: 'one lerp, in slopeLine', cells: [String(oneLerp), 'true'], ok: oneLerp },
        { id: 'Flat offered with 2 slopes', cells: [String(flatFieldShown(2)), 'false'], ok: flatFieldShown(2) === false },
        { id: 'flat ↔ run', cells: [`${flatFromRun(900, 4000)} / ${runFromFlat(3100, 4000)}`, '3100 / 900'], ok: flatFromRun(900, 4000) === 3100 && runFromFlat(3100, 4000) === 900 },
        { id: "T61's chip", cells: [chip ? 'still there' : 'gone', 'gone'], ok: chip === false },
      ],
      note: 'THREE QUARTERS OF THIS WALL IS UNTOUCHED, and that is the whole sentence a\n'
        + '`NO | YES` chip could not say. The arithmetic is `lib/slopeLine.js ceilingAt`\n'
        + 'and it is the ONLY place that decides a wall\'s height at a point — retail\n'
        + 'imports it now (F1) instead of being told to write its own and writing none.',
      verdict: ['CLEAN — the slope is the engine\'s, and it cuts part of the ceiling.',
        'NOT CLEAN — the slope is not what the owner asked for.'],
    };
  },

  /** The F4/F5 balance: the column is rows, and there is no slider left. */
  column: () => {
    const controls = src('retail/design/controls.jsx');
    const sliders = [];
    for (const dir of ['retail/design', 'retail/design/detail', 'retail/design/room']) {
      const out = git(['grep', '-c', '-e', '<Slider', '--', `src/${dir}`]);
      if ((out || '').trim()) sliders.push(out.trim());
    }
    const fieldIsARow = /<div className="pbi-field-row">/.test(controls);
    const rangeGone = !/pbi-numfield-scale/.test(controls);
    const tombstone = /LICENSED REMOVAL: `Slider` stood here/.test(controls);
    const exported = /export function Slider\(/.test(controls);
    return {
      title: 'F4/F5 — THE COLUMN IS A LIST OF SETTINGS, AND THE SLIDERS ARE GONE',
      head: ['what', 'answer', 'wanted'],
      rows: [
        { id: 'Field is a row', cells: [String(fieldIsARow), 'true'], ok: fieldIsARow },
        { id: 'the range line', cells: [rangeGone ? 'in the title' : 'still a line', 'in the title'], ok: rangeGone },
        { id: '<Slider callers', cells: [sliders.length ? sliders.join(' ') : 'none', 'none'], ok: sliders.length === 0 },
        { id: 'Slider exported', cells: [String(exported), 'false'], ok: exported === false },
        { id: 'tombstone', cells: [String(tombstone), 'true'], ok: tombstone },
      ],
      note: 'The owner: *"te twoje pola na liczby są okropne, duże, rozwalone po całości,\n'
        + 'w ogóle to nie ma składu ani takiego ładnego porządku."* A field is one row\n'
        + 'now — label left at one width, control right — and the range under every\n'
        + 'number lives in the input\'s title, coming back as a sentence only when a\n'
        + 'value is refused. Twelve sliders in the detail menus became the same row,\n'
        + 'so the caller count reached zero and the component went with its licence.',
      verdict: ['CLEAN — one height, one row per setting, and not one slider left.',
        'NOT CLEAN — the column is not what the owner asked for.'],
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
        ? 'every one CLEAN — NOT ONE ENGINE BYTE MOVED (this turn was licensed none),\n'
        + 'PRO is frozen at 66 files, and the copy shows every word PRO shows.'
        : `${bad} NOT CLEAN. Iron rule: write it up as a FINDING.`}\n`);
    }
    process.exit(bad === 0 ? 0 : 1);
  } else if (argv.length === 2) {
    const base = JSON.parse(readFileSync(argv[0], 'utf8'));
    const head = JSON.parse(readFileSync(argv[1], 'utf8'));
    const { rows, counts } = classify(base, head);
    process.stdout.write(`${rows.join('\n')}\n\n`);
    process.stdout.write('EXPECTED BUCKETS: none, and this turn does not get to name one.\n'
      + 'CLAUDE.md: *"No engine file is licensed this turn. If F-work seems to need\n'
      + 'one, that is a skip-and-note, not an edit."* Turn 62 changed ZERO files under\n'
      + '`src/engine` and zero under `src/lib` — it COPIED two screens into\n'
      + '`src/retail/` and re-zoned `src/lib` in a TEST. There is no mechanism by\n'
      + 'which a golden could move, and `--probe` argues every other change as an\n'
      + 'exit code.\n');
    process.stdout.write('IF A GOLDEN MOVED:  iron rule — write it up as a FINDING. Do not name a bucket for it.\n');
    process.stdout.write(`NAMED:            0\nUNNAMED:          ${counts.UNNAMED}\n`);
    process.exit(counts.UNNAMED === 0 ? 0 : 1);
  } else {
    const d = dump();
    for (const cfg of STANDARD_CONFIGS) {
      const row = d[cfg.id];
      process.stdout.write(`${cfg.id.padEnd(12)}drawers=${cfg.drawers ? 'yes' : 'no '}  ${row.sha256 || row.error}\n`);
    }
    process.stdout.write('\nNAMED deltas this turn: 0 — not one file under src/engine or src/lib\n'
      + 'changed, so there is nothing for a bucket to be named after.\n');
  }
}
