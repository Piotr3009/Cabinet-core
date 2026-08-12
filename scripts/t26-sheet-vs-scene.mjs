// ─── verify/t26/sheet-vs-scene.md, WRITTEN FROM THE CODE (turn 26, R10/F3.3) ─
//
// "Where a class is deliberately not drawn, name it in
// `verify/t26/sheet-vs-scene.md` with the reason; silence is not allowed."
//
// The document is GENERATED from `engine/machining.js` and from a real
// `computeCabinet` run, so it cannot drift from the behaviour it describes —
// and `test/turn26-f3-sheet-vs-scene.test.js` asserts that every class and
// every reason in the code appears in the file.
//
//   node scripts/t26-sheet-vs-scene.mjs > verify/t26/sheet-vs-scene.md

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { joineryLayers } from '../src/engine/joinery.js';
import { panelRecesses } from '../src/engine/recesses.js';
import { machiningClasses, machiningFor } from '../src/engine/machining.js';
import { hardwareInstances } from '../src/engine/hardware3d.js';

const L = joineryLayers(P);
const at = (type, extra = {}) => computeCabinet({ ...defaultParamsFor(type, P), unit_num: '01', ...extra }, P);

const JOBS = {
  'base, 2 shelves, doors': at('BUD', { shelves: 2, doors: true }),
  'base, partition, bay doors': at('BUD', {
    width: 900,
    doors: false,
    sections: [{ width_mm: 900, items: [{ id: 'p1', kind: 'partition', x_mm: 450, front_mm: 0 }] }],
    bay_doors: [{ door: 'one', hinge: 'R' }, { door: 'one', hinge: 'L' }],
  }),
  'base, shaker fronts': at('BUD', { front_type: 'S', doors: true }),
  'base with drawers': at('BUDR', {}),
  'wardrobe, doors + shelves': at('WARDROBE', { doors: true, shelves: 2 }),
};

const CLASSES = {
  'BUL/BUR': (p) => p.part === 'BUL' || p.part === 'BUR',
  'TOP/BOTTOM': (p) => p.part === 'TOP' || p.part === 'BOTTOM',
  BACK: (p) => p.part === 'BACK',
  shelves: (p) => p.part === 'SHELF',
  partitions: (p) => p.part === 'VPART' || p.part === 'PARTITION',
  fronts: (p) => p.part === 'FRONT' || p.part === 'DRAWER-FRONT',
  'drawer box': (p) => String(p.part).startsWith('DRAWER-') && p.part !== 'DRAWER-FRONT',
};

const out = [];
const say = (s = '') => out.push(s);

say('# verify/t26 — the sheet against the scene (R10)');
say();
say('> *"cut CNC musi być twoją drogą do wizualizacji, nie na odwrót."* — the owner');
say();
say('R10: **the sheet is the truth and the scene follows it.** Every drilling,');
say('pocket and cut on a panel\'s CNC record must be visible on that panel in 3-D.');
say('Hardware may ADD to the picture — a sleeve inside a hole, a hinge in its bore');
say('— it may never replace or omit the hole.');
say();
say('This file is GENERATED (`node scripts/t26-sheet-vs-scene.mjs`) from');
say('`src/engine/machining.js` and from real `computeCabinet` runs, and');
say('`test/turn26-f3-sheet-vs-scene.test.js` asserts that every class and every');
say('reason below is the one in the code. It cannot drift.');
say();

say('## 1 — the policy, class by class');
say();
say('`draw` — is this class bored out of the board\'s own solid in 3-D?');
say('`depth` — how deep, where the RECORD does not state one. The record always');
say('wins; the table is only the default, and it is the workshop\'s own');
say('(`profile.editor.drillDefaults`), the same numbers the hand editor stamps.');
say();
say('| layer | drawn | default depth | why |');
say('| --- | --- | --- | --- |');
for (const c of machiningClasses()) {
  const rule = machiningFor(c.layer, P);
  const depth = rule.draw ? (rule.depth ? `${rule.depth} mm` : 'through') : '—';
  say(`| \`${c.layer}\` | ${c.draw ? '**yes**' : 'no' } | ${depth} | ${c.reason} |`);
}
say();
say('### the deliberate omissions, gathered');
say();
for (const c of machiningClasses().filter((x) => !x.draw)) {
  say(`* **\`${c.layer}\`** — ${c.reason}`);
}
say();
say('One further omission is a DRAWING rule rather than a class, and it is named');
say('here for the same reason: a hole whose rim comes within');
say('`engine/recesses.js EDGE_KEEP` (0.2 mm) of the board\'s outline is left out of');
say('the picture. The machine drills it; a polygon whose hole touches its own');
say('boundary is a shape a triangulator is entitled to refuse. The DXF carries it');
say('unchanged.');
say();

say('## 2 — parity, part class by part class');
say();
say('Counted on real cabinets. `sheet` is what `computeCabinet` puts on the CNC');
say('record for that part class; `scene` is what `engine/recesses.js panelRecesses`');
say('— the exact list `3d/panelSolid.js` punches out of the board and');
say('`3d/shakerSolid.js` bores into a shaker tray — cuts. Positions are compared to');
say('**0.01 mm** by the test.');
say();
for (const [job, result] of Object.entries(JOBS)) {
  say(`### ${job}`);
  say();
  say('| part class | parts | sheet | scene | at the edge |');
  say('| --- | --- | --- | --- | --- |');
  for (const [name, isKind] of Object.entries(CLASSES)) {
    const parts = result.panels.filter((p) => p.box && isKind(p));
    if (!parts.length) continue;
    let sheet = 0; let scene = 0; let edge = 0;
    for (const panel of parts) {
      const thickness = panel.thickness || panel.box.d;
      const drawn = panelRecesses(panel, result.drills, { thickness, skipLayers: [L.socket], profile: P })
        .filter((f) => f.kind === 'round');
      const wanted = result.drills.filter((d) => d.panel === panel.id && machiningFor(d.layer, P).draw);
      sheet += wanted.length;
      scene += drawn.length;
      edge += wanted.length - drawn.length;
    }
    if (!sheet) continue;
    say(`| ${name} | ${parts.length} | ${sheet} | ${scene} | ${edge} |`);
  }
  say();
}

say('## 3 — the hardware ADDS, it does not replace');
say();
const r = JOBS['base, 2 shelves, doors'];
const side = r.panels.find((p) => p.id === 'BUL');
const ladder = r.drills.filter((d) => d.panel === 'BUL' && d.layer === P.shelfHoles.layer);
const carrying = hardwareInstances(r, P).shelfSupports.filter((s) => s.panel === 'BUL');
say(`On \`BUL\` of the base unit the sheet drills **${ladder.length}** ⌀${P.shelfHoles.diameter} pin holes —`);
say(`${P.shelfHoles.clusterOffsets.length} to a level, which is the owner's "three in a row" — and the scene bores`);
say(`**${panelRecesses(side, r.drills, { thickness: side.box.w, skipLayers: [L.socket], profile: P }).filter((f) => f.layer === P.shelfHoles.layer).length}** of them. **${carrying.length}** carry a shelf and take a brass sleeve;`);
say('the rest are empty and are drawn empty, which is the whole of F3.1 — the full');
say('ladder of levels reads at a glance, exactly as it does on the sheet.');
say();
say('The sleeve is the hardware\'s and the hole is the panel\'s: the collar\'s barrel');
say(`is scaled to the drilling's own ⌀${P.shelfHoles.diameter} and clamped to the bore's own`);
say(`${machiningFor(P.shelfHoles.layer, P).depth} mm, so a fitting can never be a different size from the hole it`);
say('is knocked into.');
say();
say('## 4 — the cup, which is where R10 was first applied');
say();
const leaf = r.panels.find((p) => p.part === 'FRONT');
const cup = r.drills.find((d) => d.panel === leaf.id && d.kind === 'cup');
say(`The ⌀${cup.d} cup on \`${leaf.id}\` states its own depth on the record: **${cup.depth} mm**, the`);
say('owner\'s measured number. Before this turn it stated none, and');
say('`engine/recesses.js` read a hole with no depth as a hole that goes THROUGH —');
say('so a ⌀35 cup was bored clean through a 25 mm door. That is the pierce he');
say('photographed, and R10 is what decided the cure: the sheet gains the number and');
say('the scene reads the sheet.');
say();
say('The DXF is unchanged either way — a circle carries a diameter and a layer and');
say('never a depth (`engine/cnc/dxf.js`) — so the fingerprint does not move.');
say();
process.stdout.write(`${out.join('\n')}\n`);
