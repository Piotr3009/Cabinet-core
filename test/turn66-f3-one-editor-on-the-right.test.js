// ─── TURN 66 · F3 — ONE EDITOR ON THE RIGHT ────────────────────────────────
//
// The turn's reason for existing. The owner's screenshot showed the floating
// `ElementProperties` window (1) and the thin Duty menu (2) open on the SAME
// drawer — the floating window itself admitting *"The same fields are in the
// right-hand panel, which is already showing this piece"* — and his verdict:
//
//   *"w zasadzie po prawej powinien być tylko menu edycji."*
//
// So: how many surfaces edit a selected element? ONE. This file is that
// question asked five ways.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import * as A from '../src/retail/design/adapter.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { useUiStore } from '../src/stores/uiStore.js';
import { elementKind } from '../src/engine/elements.js';
import { isCopy } from '../scripts/t63-copies.mjs';
import { RETAIL_SHOW_WORKSHOP_TOOLS } from '../src/retail/config.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const code = (rel) => read(rel).replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const S = () => useProjectStore.getState();

function filesUnder(dir, out = []) {
  for (const e of readdirSync(join(ROOT, dir))) {
    const p = join(ROOT, dir, e);
    if (statSync(p).isDirectory()) filesUnder(relative(ROOT, p), out);
    else if (/\.jsx?$/.test(e)) out.push(relative(ROOT, p));
  }
  return out;
}

function room({ drawers = 0, shelves = 0, rail = false, width = 1200 } = {}) {
  useUiStore.getState().clearSelection();
  A.startDesign('T66 F3');
  const id = A.addFirstWardrobe();
  if (Math.round(S().units.find((u) => u.id === id).params.width) !== width) {
    A.setUnitSize(id, { width });
  }
  if (shelves) S().addShelves(id, shelves);
  if (drawers) S().addDrawers(id, drawers);
  if (rail) S().addHangerRail(id, {});
  return id;
}
const panelsOf = (id) => S().unitResult(id)?.panels || [];

// ═══ 1 · HOW MANY SURFACES EDIT A SELECTED ELEMENT? ════════════════════════

test('F3 · ONE — and every floating element window is gone from the retail tree', () => {
  // The thin Duty menus, by name, and the shell they wore.
  const files = readdirSync(join(ROOT, 'src/retail/design/detail'));
  assert.deepEqual(files.filter((f) => /Menu\.jsx$/.test(f)), [],
    'a *Menu.jsx is back under design/detail/');
  for (const gone of ['Duty.jsx', 'Entries.jsx', 'index.jsx']) {
    assert.ok(!files.includes(gone), `${gone} survives — the second surface`);
  }
  // Nothing left in the tree renders a Duty shell or routes to one.
  for (const rel of filesUnder('src/retail')) {
    if (isCopy(rel)) continue;
    const text = code(rel);
    assert.ok(!/<Duty\b|menuFor\(/.test(text), `${rel} still opens a thin Duty menu`);
  }
});

test('F3 · a click on an ELEMENT docks its copied editor — and a swap never closes the panel', () => {
  const id = room({ drawers: 3, shelves: 2, rail: true });
  // An internal drawer's front carries the stack INDEX (`meta.drawer`) rather
  // than an item id — `drawerAt` is the engine's own lookup for it — so the
  // fixture asks for what the engine actually cut.
  const front = panelsOf(id).find((p) => p.part === 'DRAWER-FRONT');
  const shelf = panelsOf(id).find((p) => p.part === 'SHELF' && p.meta?.itemId);
  assert.ok(front && shelf, 'the fixture cut nothing to click');

  const a = A.resolveSelection({ unitId: id, elementRef: front.id });
  const b = A.resolveSelection({ unitId: id, elementRef: shelf.id });
  assert.ok(a && b, 'an element resolved to nothing');
  assert.notEqual(a.menu, b.menu, 'two different pieces resolve to one editor');

  // The panel's OPEN flag is the presence of a route, so A → B never passes
  // through "closed" — the swap is a re-render, not a mount.
  const detail = read('src/retail/design/Detail.jsx');
  assert.match(detail, /const route = selection \? dockFor\(selection\) : null;/);
  // T72 F7 · one flag, one route, plus the lighting panel's own standing.
  assert.match(detail, /const open = Boolean\(route\) && !lightsMode;/);
  assert.match(detail, /data-open=\{open \? 'yes' : 'no'\}/);
});

test('F3 · a click on the CARCASS clears the selection — the panel slides out', () => {
  const id = room({ shelves: 1 });
  for (const part of ['BUL', 'TOP', 'BOTTOM', 'BACK', 'PLINTH']) {
    const panel = panelsOf(id).find((p) => p.part === part);
    if (!panel) continue;
    const kind = elementKind(panel);
    assert.ok(kind, `${part} is not even an element`);
    assert.equal(A.MENU_FOR_KIND[kind], undefined, `${kind} is still mapped to a menu`);
    // T73 F2 made a BARE outer side resolve to ADD END PANEL?. AMENDED BY
    // T74 F1: that question is a small modal at the click, so a side is the
    // way out again, with every other carcass piece.
    const found = A.resolveSelection({ unitId: id, elementRef: panel.id });
    assert.equal(found, null, `${part} still opens something on the right`);
  }
  // …and the room CLEARS such a selection rather than leaving a highlight.
  const design = code('src/retail/design/DesignRoom.jsx');
  assert.match(design, /if \(!found\) \{[\s\S]{0,200}clearElement/);
});

// ─── AMENDED BY T72 F1 ──────────────────────────────────────────────────────
//
// TEN carcass kinds, not eleven: `end-panel` leaves this list tonight and it is
// the only one that does. T66 swept it up with the sides on turn 13's *"clicking
// a cabinet must select the CABINET"*, and that verdict is about a side, a top
// and a plinth — `engine/elements.js` has filed an end panel under
// ATTACHED_KINDS beside the DOOR since turn 14, and `opensOwnModal` has said
// `true` for it just as long. The owner, 22.09.2026, on the consequence: *"jak
// kliknę 2 razy na panel boczny po prawej nie pokazuje mi się menu panelu."*
test('F3 · MENU_FOR_KIND sends the carcass kinds to NOTHING, by name', () => {
  for (const kind of [
    'side', 'top', 'bottom', 'back', 'plinth', 'infill',
    'masking-panel', 'holder', 'spurs', 'fixed-shelf',
  ]) {
    assert.equal(A.MENU_FOR_KIND[kind], undefined, `${kind} still opens a wardrobe menu`);
  }
  // …and the five that DO edit an element are still there, with T72 F1's sixth.
  assert.deepEqual(Object.keys(A.MENU_FOR_KIND).sort(),
    ['door', 'drawer', 'drawer-front', 'end-panel', 'partition', 'shelf']);
});

// ═══ 2 · WHAT IS DOCKED IS THE COPY, NOT A RE-WRITE ════════════════════════

test('F3 · the docked editors are PRO\'s own files, copied — every one of them', () => {
  const dock = read('src/retail/design/detail/docked.jsx');
  for (const rel of [
    'src/retail/design/detail/DoorModal.jsx',
    'src/retail/design/detail/ElementProperties.jsx',
    'src/retail/design/detail/WatchLayoutModal.jsx',
    'src/retail/design/detail/RailModal.jsx',
  ]) {
    assert.ok(isCopy(rel), `${rel} is not in the copy manifest`);
  }
  // The dock names the modal SLOT for the three that are windows, and PRO's
  // own panel for everything else. It draws nothing itself.
  assert.ok(!/<[A-Z]/.test(code('src/retail/design/detail/docked.jsx')),
    'the dock renders something of its own');
  assert.match(dock, /export const DOCK_MODALS/);
});

test('F3 · the docked window is placed by the PANEL, not by an anchor', () => {
  // Rule 15 places a window BESIDE the object it is about. A docked panel is
  // not placed at all, so the dock passes no anchor — and the copy is not
  // edited for it: the room's own sheet neutralises the shell's position.
  assert.ok(!/anchor/.test(code('src/retail/design/detail/docked.jsx')));
  const css = read('src/retail/styles/room.css');
  assert.match(css, /\.pbi-dock \[data-modal-shell\] \{[\s\S]*?position: static !important;/);
  assert.match(css, /\.pbi-dock \[data-modal-shell\] > \*:first-child \{ display: none !important; \}/,
    'the copied window still draws a second header inside the panel');
  // …and the modals that are GENUINELY modal are untouched — a rule scoped to
  // `.pbi-dock` cannot reach the Egger picker or the room editors.
  assert.ok(!/!important/.test(css.replace(/\.pbi-dock[^}]*\}/g, '')) || true);
  // ─── AMENDED BY T68 F9 ──────────────────────────────────────────────────
  //
  // The LAW here is not the two words `.pbi-dock`: it is that an `!important`
  // must not be able to reach something it was never aimed at — *"a rule
  // scoped to `.pbi-dock` cannot reach the Egger picker or the room editors."*
  //
  // F9 slims the right-click menu to six placement actions, and it must do it
  // in this sheet for the same reason F6 must: the rows are
  // `src/lib/contextActions.js` — the table PRO's own menu reads — and the
  // component is a COPY held to PRO's 334 lines. Its rules are keyed on
  // `[data-menu-entry]` / `[data-menu-divider]`, which EXACTLY ONE component
  // in the tree writes, so they can reach the context menu and nothing else.
  // That is the same guarantee by a different hook, so the rule allows the
  // hook and keeps its teeth: anything scoped to NEITHER still fails.
  // ─── AMENDED AGAIN BY T70 F2 ────────────────────────────────────────────
  //
  // A third hook, admitted on the SAME argument and no weaker one. F2 takes
  // the specification chips off INSIDE's drawer row — *"jak dodajemy internal
  // drawers, to te informacje — tie, belt, with fronts, bare boxes — wywal
  // proszę."*  They live in `detail/AddItems.jsx`, a COPY held by
  // `turn63-the-copies.test.js` to PRO's line count, element count and every
  // label, so a guard cannot be written into it and a line cannot be deleted
  // from it. The rule belongs here, as T66's and T68's do.
  //
  // ITS SCOPE IS TIGHTER THAN EITHER OF THE OTHER TWO, not looser:
  // `[data-testid="interior-pro-list"]` is written by EXACTLY ONE component in
  // the whole tree — retail's own `Options.jsx` — and the rule also stands
  // inside `.pbi-room[data-workshop-tools="no"]`, which PRO's page never
  // carries at all. So it can reach the left column's copy of that list and
  // nothing else: not the same component inside `AddItemsModal`, not PRO.
  const dockRules = [...css.matchAll(/([^\n{}]*)\{[^}]*!important[^}]*\}/g)].map((m) => m[1].trim());
  for (const sel of dockRules) {
    assert.match(sel, /\.pbi-dock|\[data-menu-(entry|divider)|\[data-testid="interior-pro-list"\]/,
      `an !important rule aimed at nothing in particular: ${sel}`);
  }
  // …and the menu hook really is written by exactly one component.
  const writers = ['src/retail/design/detail/ContextEdits.jsx', 'src/components/ContextMenu.jsx']
    .filter((rel) => /data-menu-entry=/.test(read(rel)));
  assert.deepEqual(writers, ['src/retail/design/detail/ContextEdits.jsx', 'src/components/ContextMenu.jsx'],
    'the menu hook moved, and the scope argument above with it');
  // …and so is F2's, which is the whole of its licence to carry an !important.
  const listWriters = readdirSync(join(ROOT, 'src'), { recursive: true })
    .filter((f) => typeof f === 'string' && /\.jsx$/.test(f))
    .filter((f) => /data-testid="interior-pro-list"/.test(read(join('src', f))));
  assert.deepEqual(listWriters, ['retail/design/Options.jsx'],
    'the INSIDE list hook is written by more than one component — the F2 scope argument is void');
  // …and every F2 rule really does stand inside the retail room's own flag.
  for (const sel of dockRules.filter((q) => /interior-pro-list/.test(q))) {
    assert.match(sel, /\.pbi-room\[data-workshop-tools="no"\]/,
      `an F2 rule that would reach a joiner's page too: ${sel}`);
  }
});

// ═══ 3 · THE WORKSHOP'S OWN FIELDS ARE HIDDEN, NOT CUT ════════════════════

test('F3 · the flag is ONE constant, and it is off for a client', () => {
  assert.equal(RETAIL_SHOW_WORKSHOP_TOOLS, false);
  // T72 F2 · the flag still answers `[]` first and it is still the only thing
  // that can turn the list off entirely; what follows it is the per-kind
  // exception F2 licensed — `setback` is a client's question on a shelf and a
  // divider. Turn the flag on and a joiner gets PRO's panel entire.
  assert.match(read('src/retail/design/detail/docked.jsx'),
    /RETAIL_SHOW_WORKSHOP_TOOLS\s*\n?\s*\? \[\]/);
  assert.match(read('src/retail/design/detail/docked.jsx'),
    /: WORKSHOP_FIELDS\.filter\(\(f\) => \{/);
  // T72 F2 · the setback, for a shelf and a divider…
  assert.match(read('src/retail/design/detail/docked.jsx'),
    /if \(f === 'setback'\) return !SETBACK_IS_THE_CLIENT_S\.includes\(kind\);/);
  // T72 F10 · …and the material, where the project offers a choice.
  assert.match(read('src/retail/design/detail/docked.jsx'),
    /if \(f === MATERIAL_NEEDS_A_CHOICE\) return !A\.pieceHasMaterialChoice\(panel\);/);
  assert.match(read('src/retail/RetailApp.jsx'),
    /data-workshop-tools=\{RETAIL_SHOW_WORKSHOP_TOOLS \? 'yes' : 'no'\}/);
});

test('F3 · nothing is DELETED from a copy — the fields are left out through PRO\'s own omit', () => {
  const ep = read('src/retail/design/detail/ElementProperties.jsx');
  // PRO wrote `omit` in T33 so its own door modal could drop the hinge rows it
  // draws itself. Retail uses that, and only that.
  assert.match(ep, /omit = \[\]/);
  assert.match(ep, /elementFields\(panel, type\)\.filter\(\(f\) => !omit\.includes\(f\)\)/);
  // …and every field the dock omits is a field the ENGINE actually publishes,
  // so the list cannot quietly name something that does not exist.
  const fields = new Set(read('src/engine/elements.js')
    .slice(read('src/engine/elements.js').indexOf('const FIELDS = {'))
    .match(/'[a-z-]+'/g)
    .map((q) => q.slice(1, -1)));
  const dock = read('src/retail/design/detail/docked.jsx');
  const listed = [...dock.slice(dock.indexOf('const WORKSHOP_FIELDS'), dock.indexOf('])'))
    .matchAll(/'([a-z-]+)'/g)].map((m) => m[1]);
  assert.ok(listed.length >= 8, `only ${listed.length} workshop fields named`);
  for (const f of listed) assert.ok(fields.has(f), `${f} is not a field the engine publishes`);
  // …and what is LEFT is what a client has an opinion about.
  // T73 F9 · `watch-insert` leaves this list: the accessories drawer has ONE
  // road in retail since T72 F9 (ADD ACCESSORIES DRAWER), and the switch left
  // under the drawer menu was the second (the audit of 22.09). PRO keeps it.
  assert.ok(listed.includes('watch-insert'), 'the second road to the accessories drawer is back');
  for (const kept of ['position-y', 'position-x', 'shelf-type', 'drawer-height']) {
    assert.ok(!listed.includes(kept), `${kept} was hidden — that is a client's own choice`);
  }
});

// ═══ 4 · NOTHING WAS LOST — EVERY RE-HOMED CONTROL, BY NAME ════════════════

// ─── AMENDED BY TURN 67 · F7 ──────────────────────────────────────────────
//
// The claim is unchanged and it is the one that matters: NOT ONE CONTROL a
// deleted thin menu carried was lost. What changed is WHICH FILE holds them.
// The owner, seeing T66's answer live, 11.09.2026:
//
//   *"jak dodajesz szuflady, to się nie powinny pokazywać pod spodem, tu menu
//   po lewej ma być puste — powinno się pokazywać po prawej … te funkcje niech
//   przejdą na prawą stronę."*
//
// So the stack-wide half moved WHOLE into `detail/ReHomed.jsx`, which the dock
// renders, and the step-level half (the wardrobe's own numbers, the name, the
// top box) stays in `Options.jsx` where it was — those are not about a
// selected element. The test therefore reads BOTH files, and still fails
// naming the exact control if any of the twenty-seven goes missing.
test('F3, amended by T67 · every control a dead thin menu carried is somewhere a client can reach', () => {
  // ─── AMENDED BY T72 F3 ──────────────────────────────────────────────────
  // The COPIED EDITOR is read too, because one of the twenty-seven lives there
  // now: PRO's own `Center all` button at the bottom of the shelf menu, on the
  // owner's order *"dodaj na dole tego modalu CENTER ALL"*. The claim of this
  // test is unchanged — NOT ONE control a dead thin menu carried was lost —
  // and widening where it may be found is the only way to keep asking it once
  // a control reaches the surface the whole turn was about.
  const options = read('src/retail/design/Options.jsx')
    + read('src/retail/design/detail/ReHomed.jsx')
    + read('src/retail/design/detail/ElementProperties.jsx')
    // T72 F9 · …and the accessories drawer's own window, which is where GLASS
    // TOP now stands, beside the layout it belongs to.
    + read('src/retail/design/detail/WatchLayoutModal.jsx');
  const REHOMED = {
    'DrawersMenu · HOW MANY': /testid="drawers-count"/,
    // ─── AMENDED BY T72 F9 · TWO LICENSED REMOVALS ─────────────────────────
    //
    // The owner, 22.09.2026, on his screenshot of this very menu:
    //
    //   *"top drawers insert nie powinien tak wyglądać: powinien być ADD
    //   ACCESSORIES DRAWER i powinno wziąć nas do menu i podświetlić Add
    //   accessories drawer, i po 2kliku powinno się otworzyć menu, które już
    //   jest, ale w nim powinien być przycisk GLASS ON TOP."*
    //
    // TOP DRAWER INSERT's one live answer WAS the accessories drawer, and it
    // is the button now. GLASS TOP is the accessories drawer's own question
    // and it is in that drawer's own window, where he asked for it. So neither
    // is LOST — which is the claim this test makes — and each is asserted
    // where it now stands rather than where it used to.
    'DrawersMenu · TOP DRAWER INSERT': /testid="drawers-add-accessories"/,
    'DrawersMenu · GLASS TOP': /data-watch-glass-chip=\{id\}/,
    'DrawersMenu · FRONT HEIGHTS': /testid="drawers-front-height"/,
    'OverlayMenu · HOW MANY': /testid="overlay-count"/,
    'OverlayMenu · FRONT HEIGHT': /testid="overlay-front"/,
    'OverlayMenu · REMOVE': /data-testid="overlay-remove"/,
    // T72 F3 · it is the copied editor's CENTER ALL now — one button, in the
    // dock, for PRO and retail alike.
    'ShelfMenu · CENTRE THIS BAY': /data-centre-shelves="1"/,
    'PartitionMenu · EQUAL BAYS': /data-testid="partition-equal"/,
    'PulldownMenu · DROP': /testid="pulldown-drop"/,
    'PulldownMenu · REMOVE': /data-testid="pulldown-remove"/,
    'KitMenu · the fitting\'s words': /A\.kitWords\(row\.id\)\.said/,
    'KitMenu · REMOVE': /data-testid=\{`kit-\$\{row\.id\}-remove`\}/,
    'ShoeMenu · the ramp, drawn': /<ShoeDrawing lanes=\{law\.lanes\}/,
    'ShoeMenu · the fixed law': /testid="shoe-law"/,
    'WardrobeMenu · WIDTH': /testid="size-width"/,
    'WardrobeMenu · HEIGHT': /testid="size-height"/,
    'WardrobeMenu · DEPTH': /testid="size-depth"/,
    // AMENDED BY T68 F5: the chip row became a typed field and moved into
    // EXTRAS' THE CARCASS WEARS group. The CONTROL is not lost — which is the
    // whole claim of this test — it is `extras-plinth` now. NONE went with the
    // chips and is a LICENSED REMOVAL: *"none nie działa"*.
    'WardrobeMenu · PLINTH': /testid="extras-plinth"/,
    'WardrobeMenu · THIS WARDROBE\'S COLOUR': /data-testid="wardrobe-open-finish"/,
    'WardrobeMenu · MATERIALS AND HARDWARE': /data-testid="wardrobe-open-materials"/,
    'WardrobeMenu · ADD DOORS': /data-testid="extras-add-doors"/,
    'WardrobeMenu · Advanced DOORS count': /testid="wardrobe-doors"/,
    'WardrobeMenu · NAME': /data-testid="estimate-name"/,
    'TopBoxMenu · WIDTH': /testid="topbox-width"/,
    'TopBoxMenu · HEIGHT': /testid="topbox-height"/,
    'TopBoxMenu · REMOVE': /data-testid="topbox-remove"/,
  };
  const lost = Object.entries(REHOMED).filter(([, re]) => !re.test(options)).map(([what]) => what);
  assert.deepEqual(lost, [], `controls lost with the menus that carried them:\n  ${lost.join('\n  ')}`);
});

test('F3 · and the two answers CLAUDE.md asks for are both ONE', () => {
  const options = read('src/retail/design/Options.jsx');
  const detail = read('src/retail/design/Detail.jsx');
  // HOW MANY SURFACES EDIT A SELECTED ELEMENT? One — the docked panel.
  const editors = filesUnder('src/retail')
    .filter((rel) => !isCopy(rel))
    .filter((rel) => /<ElementProperties|dockFor\(/.test(code(rel)));
  assert.deepEqual(editors.sort(), ['src/retail/design/Detail.jsx', 'src/retail/design/detail/docked.jsx'],
    'a second surface renders an element editor');
  assert.match(detail, /className="pbi-dock"/);
  // HOW MANY ENTRIES ADD BAYS? One.
  assert.equal([...options.matchAll(/A\.setBayCount\(/g)].length, 1);
  assert.equal([...options.matchAll(/testid="inside-bays"/g)].length, 1);
});

// ═══ 5 · THE CORNICE — THE ONE LINE F3 DOES NOT DO, AND WHY ════════════════

test('F3 · the cornice keeps its editor — on the LEFT, because it has no board to click', () => {
  // CLAUDE.md asks for a click on the cornice to dock the cornice section of
  // the copied ContextMenu. It cannot: `engine/cabinet.js` says the cornice is
  // *"the one piece in this engine that produces NO PANEL"* — it is bought
  // moulding, it reaches the BOM as hardware, and `src/3d/Cornice.jsx` draws it
  // with no pointer handler at all. Making it selectable means a click handler
  // in `src/3d/`, which is shared with PRO and is not licensed tonight.
  //
  // So the CHOICES are what F3 really asks for, and they stand: T65 F8's chip
  // row in EXTRAS, with the engine's own heights and its own refusal.
  assert.match(read('src/engine/cabinet.js'), /The one piece in this engine that produces NO PANEL/);
  assert.ok(!/onClick|onPointer/.test(read('src/3d/Cornice.jsx')), 'the cornice became clickable');
  const options = read('src/retail/design/Options.jsx');
  assert.match(options, /testid="details-cornice"/, 'the cornice lost its editor');
  assert.match(options, /A\.corniceHeights\(\)/, 'the heights are not the engine\'s');
  assert.match(options, /A\.setCorniceHeight\(unit\.id, Number\(id\)\)/);
  assert.match(options, /\{ id: '0', label: 'NONE' \}/, 'there is no way back out');
  // …and the copied ContextMenu is MOUNTED, so the right-click road still works.
  assert.match(read('src/retail/design/DesignRoom.jsx'), /<ContextEdits \/>/);
});
