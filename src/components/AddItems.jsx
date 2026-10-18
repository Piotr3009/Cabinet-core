import { useMemo, useState } from 'react';
import NumberField from './NumberField.jsx';
import { useUiStore } from '../stores/uiStore.js';
import { useProjectStore } from '../stores/projectStore.js';
import { useCabinetProfileStore } from '../stores/cabinetProfileStore.js';
import { useMaterialAssignmentStore } from '../stores/materialAssignmentStore.js';
import { getUnitType } from '../engine/types.js';
import { hangerOf } from '../engine/items.js';
import { formatMm } from '../engine/format.js';
import { watchDrawerFixedHeight } from '../engine/watchDrawer.js';
import { anchorOfEvent } from '../lib/modalAnchor.js';

// ─── "What goes inside" (turn 4, BACKLOG #10; turn 12, CLAUDE.md F5.1) ──────
//
// A list of TYPES. Clicking one opens ITS settings right here — no separate
// modals, which is what BACKLOG #10 asked for and what makes "add three
// shelves" two clicks instead of a round trip.
//
// ─── TURN 12: ONE COPY, TWO PLACES ───
// It lived inside RightPanel.jsx, which was fine while the right panel was the
// only way to add something. The golden "+" opens a MODAL now (CLAUDE.md F5.1)
// and that modal offers the same menu, so the block moved out into a component
// of its own and wires its own store actions. The right panel and the modal
// both render `<AddItems unit={unit} />` — there is no second list to keep in
// step, and no props to thread through two callers.
//
// ─── TURN 12: WHICH SIDE (CLAUDE.md F5.3) ───
// With a partition present the cabinet has more than one column, so "add a
// shelf" is an incomplete sentence. The shelf block asks which BAY — the same
// zones the canvas highlights (engine/zones.js) — and the shelf lands centred
// in the one that was picked. With no partition there is one zone and nothing
// is asked, which is every cabinet until somebody divides it.

export default function AddItems({ unit, onDone = null, onZoneHover = null }) {
  const profile = useCabinetProfileStore((s) => s.profile);
  const materials = useMaterialAssignmentStore((s) => s.materials);
  const notify = useUiStore((s) => s.notify);
  const openFrontsFor = useUiStore((s) => s.openFrontsFor);
  const openModal = useUiStore((s) => s.openModal);
  const addItemKind = useUiStore((s) => s.addItemKind);
  const setAddItemKind = useUiStore((s) => s.setAddItemKind);

  const addDrawers = useProjectStore((s) => s.addDrawers);
  // TURN 40 (CLAUDE.md F3b): the OVERLAY stack — fronts on the wardrobe, doors
  // above them, and never a 30 mm hinge strip.
  const addOverlayDrawers = useProjectStore((s) => s.addOverlayDrawers);
  // T53 (F8a): the watch drawer's own entry — position 3, fixed height.
  const addWatchDrawer = useProjectStore((s) => s.addWatchDrawer);
  const addShelves = useProjectStore((s) => s.addShelves);
  const addPartition = useProjectStore((s) => s.addPartition);
  const addHangerRail = useProjectStore((s) => s.addHangerRail);
  // Turn 33 (CLAUDE.md F3): the bought mechanisms and the rail-height measure
  // behind the pull-down suggestion.
  const addWardrobeKit = useProjectStore((s) => s.addWardrobeKit);
  // T54-F7: the shoe is a DRAWER — the row adds a `variant:'shoe'` item into
  // the stack at the clicked zone; the old shoe-box world died (licence 2).
  const addShoeDrawer = useProjectStore((s) => s.addShoeDrawer);
  const railHeightsAboveFloor = useProjectStore((s) => s.railHeightsAboveFloor);
  const unitResult = useProjectStore((s) => s.unitResult);
  const zonesOf = useProjectStore((s) => s.zonesOf);
  // T79 F2 · the undivided opening over the divider's FIX shelf, or null.
  const aboveDividerOf = useProjectStore((s) => s.aboveDividerOf);

  const type = getUnitType(unit.type);
  // T58-F4: is there a live rake over this cabinet? One reading, the store's.
  const underSlope = useProjectStore((st) => st.unitUnderSlope?.(unit.id) === true);
  const items = unit.params.sections?.[0]?.items || [];
  const rail = hangerOf(items);
  const hardware = materials.filter((m) => m.category === 'hardware');
  const zones = useMemo(() => zonesOf(unit.id), [zonesOf, unit.id, items]);
  const above = useMemo(
    () => aboveDividerOf(unit.id),
    [aboveDividerOf, unit.id, items, unit.params.width, unit.params.height],
  );

  const DR = profile.wardrobe.drawers;
  const existingDrawers = items.filter((i) => i.kind === 'drawer').length;
  const existingOverlay = items.filter((i) => i.kind === 'overlay_drawer').length;
  const ratioDrawers = type.drawerStyle === 'budr';

  const [drawerCount, setDrawerCount] = useState(existingDrawers || 2);
  const [drawerHeight, setDrawerHeight] = useState(DR.frontHeight);
  // TURN 40 (F3b): the overlay stack's own two numbers. Its heights DEFAULT TO
  // EQUAL — one number for the whole stack — which is the owner's own rule and
  // is why there is one field here and not a ladder of them; the per-drawer
  // slider then edits any of them exactly as it does an internal drawer's.
  const [overlayCount, setOverlayCount] = useState(existingOverlay || 3);
  const [overlayHeight, setOverlayHeight] = useState(DR.frontHeight);
  // ─── TURN 32 (CLAUDE.md F4): overlay or INTERNAL, per stack — the owner
  // set "internal" and nothing listened; the click listens now. And WHICH
  // COLUMN, when the cabinet is divided — same grammar as the shelves.
  const [drawerMount, setDrawerMount] = useState('overlay');
  const [drawerZone, setDrawerZone] = useState(null);
  // T79 F3 · 1 or 2 columns, asked like the bays while the unit is undivided.
  const [drawerColumns, setDrawerColumns] = useState(1);
  // T54-F7: the shoe drawer's ONE decision — which bay. The height is the
  // law (side 80, front by the drawer-front law) and offers no field.
  const [shoeBoxZone, setShoeBoxZone] = useState(null);
  // ─── TURN 33 (CLAUDE.md F3): the drawer's VARIANT — the insert is bought,
  // the box is cut unchanged. null = the plain drawer, as ever.
  const [drawerVariant, setDrawerVariant] = useState(null);
  const [railZone, setRailZone] = useState(null);
  const [shelfCount, setShelfCount] = useState(1);
  const [shelfZone, setShelfZone] = useState(null);
  // Turn 33 (F3): which column a bought mechanism goes in.
  const [kitZone, setKitZone] = useState(null);
  // 30.08: the parked ROD's distance from the top — the owner's number.
  const [rodFromTop, setRodFromTop] = useState('');
  const [railMaterial, setRailMaterial] = useState(hardware.find((m) => /rail/i.test(m.name))?.id || '');
  // ─── Turn 11 (CLAUDE.md F4.4) ───
  // The list is FILTERED by what this kind of cabinet is for, and "Show all" is
  // the way past the filter. Never a hard block: everything the kit supports is
  // one click away, which is the difference between a default and a rule.
  const [showAll, setShowAll] = useState(false);

  const done = () => { setAddItemKind(null); onZoneHover?.(null); onDone?.(); };

  /**
   * ─── TURN 40 (CLAUDE.md F3b): ADD AN OVERLAY STACK ───────────────────────
   *
   * The owner: *"fronty na szafie, drzwi powyżej szuflad."* Everything the
   * stack implies is the ENGINE's and not this handler's — the stack sits at
   * the bottom, a FIXED shelf is cut above it, and the doors above are
   * shortened with their hinges re-laddered — so the click asks for a count
   * and a height and nothing else.
   */
  const onAddOverlayDrawers = (count, height) => {
    const res = addOverlayDrawers(unit.id, count, height);
    if (res && res.ok === false) {
      notify(res.error || 'The drawers were not added.', 'warn');
      return;
    }
    notify(`${count} × ${height} mm overlay drawer${count === 1 ? '' : 's'} added — a fixed shelf above `
      + 'them and the doors shortened to start on it. No 30 mm hinge strip: an overlay front is outside '
      + 'the carcass, so nothing swings past it.', 'ok');
    done();
  };

  // ─── T79 F3 · 1 OR 2 COLUMNS ─────────────────────────────────────────────
  // The owner, 18.10.2026 (14:17): *"jak ustawiamy sobie teraz 3 szuflady
  // internal to niech pyta czy chcesz 1 czy 2 kolumny, coś jak baye."*;
  // mockup, 14:45: *"2 - tak."* Asked only while the unit is undivided and can
  // take a divider; once divided, "Which column" is the question, as before.
  const askColumns = zones.length <= 1 && type.supports.partition && type.drawerStyle === 'wardrobe';

  const onAddDrawers = (count, height) => {
    const before = items.filter((i) => i.kind === 'drawer').length;
    const zone = zones.length > 1 ? drawerZone : null;
    const columns = askColumns ? drawerColumns : 1;
    // ─── CHAT FIX 15.08.2026: THE CLICK LISTENS ─────────────────────────────
    // This handler used to congratulate BLIND — the store refused (turn 24's
    // gate) and the toast said "added". The gate is open now, but a handler
    // that ignores its store's answer will lie again the next time anything
    // refuses; so the answer is read, and a refusal is said out loud.
    // ─── TURN 32 (CLAUDE.md F4): …and the answer may carry a DOOR ───────────
    // The recessed-partition law refuses with the number and ONE button:
    // [Reset the setback], which opens the partition's own editor
    // (F7-pattern). The guard SPEAKS; it fixes nothing by itself.
    const res = addDrawers(unit.id, count, drawerMount, height, zone, drawerVariant, { columns });
    if (res && res.ok === false) {
      if (res.guard?.blocked) {
        notify(res.error, 'error', {
          action: {
            label: 'Reset the setback',
            run: (e) => openModal('element', {
              unitId: unit.id, panelId: res.guard.panelId, anchor: anchorOfEvent(e),
            }),
          },
        });
        return;
      }
      notify(res.error || 'The drawers were not added.', 'warn');
      return;
    }
    // Honest about what the number means: drawers that were already there KEEP
    // the height they were given, so this cannot claim the whole stack is now
    // `height` mm.
    // T79 F3 · two columns say what came with them.
    if (columns === 2) {
      notify(`${count} × ${height} mm drawer${count === 1 ? '' : 's'} in each of 2 columns: a divider mid-width `
        + 'and one fixed shelf over both.', 'ok');
    } else notify(before
      ? `Stack is ${count} drawer${count === 1 ? '' : 's'} — new ones at ${height} mm, the existing heights kept.`
      : `${count} × ${height} mm drawer${count === 1 ? '' : 's'} added — the partition above them is automatic.`, 'ok');
    // BACKLOG #13: internal drawers live behind the doors, so the doors get out
    // of the way to show what was just added.
    const fronts = unitResult(unit.id)?.panels.filter((p) => p.part === 'FRONT').map((p) => p.id) || [];
    if (fronts.length) openFrontsFor(unit.id, fronts);
    done();
  };

  const onAddShelves = (count) => {
    const { added, requested, refused } = addShelves(unit.id, count, zones.length > 1 ? shelfZone : null);
    // T79 F2 · a refusal has already been said, in its own words, by the store.
    if (refused) { done(); return; }
    if (added === 0) notify('Not enough clear height for another shelf.', 'warn');
    else if (added < requested) notify(`Room for ${added} of ${requested} shelves — the rest would not fit.`, 'warn');
    done();
  };

  const onAddPartition = () => {
    const id = addPartition(unit.id);
    if (!id) notify('No room for another partition in this cabinet.', 'warn');
    done();
  };

  const onAddRail = (material) => {
    const zone = zones.length > 1 ? railZone : null;
    const id = addHangerRail(unit.id, {
      materialId: material?.id || null,
      materialLabel: material?.name || null,
      zone,
    });
    if (!id) {
      notify(zones.length > 1
        ? 'That column already has a hanging rail.'
        : 'This unit already has a hanging rail.', 'warn');
      return;
    }
    // T79 F11: the rail is added alone, and the drag proposes its place under a shelf.
    notify(`Rail added. Drag it near a shelf and it settles ${formatMm(profile.hardware.hanger.belowShelfMm, { unit: true })} under it; Alt refuses.`, 'ok');
    // ─── TURN 33 (CLAUDE.md F3): THE PULL-DOWN SUGGESTION ───────────────────
    // The owner's rule: a rail above 2000 mm FROM THE FLOOR gets a grey HINT
    // suggesting the pull-down — never a block. Measured off the computed
    // result (rail y + legs), the same number the scene stands the tube at.
    const threshold = profile.wardrobeAccessories?.pulldownSuggestMm || 2000;
    const height = railHeightsAboveFloor(unit.id)
      .find((r) => (zone == null ? r.zone == null : r.zone === zone));
    if (height && height.mm > threshold) {
      notify(`Rail at ${Math.round(height.mm)} mm — above ${threshold}, a pull-down rail brings it to hand. Add items ▸ Pull-down rail.`);
    }
    done();
  };

  // T78 F9 · the L's carousel: on or off through the store's one writer
  // (`setCornerKit`), which refuses in words where a fixed shelf is in the way.
  const setCornerKit = useProjectStore((s) => s.setCornerKit);
  const carouselOn = unit.params?.carousel === true;
  const blindPulloutOn = unit.params?.blind_pullout === true;
  const onCornerKit = (kind, label, on) => {
    const res = setCornerKit(unit.id, kind, on);
    if (!res?.ok) { notify(res?.error || `The ${label.toLowerCase()} could not be fitted.`, 'warn'); return; }
    notify(on
      ? `${label} fitted: a purchase line in the BOM and the room it takes in the scene. Nothing is drilled; the shelves step aside.`
      : `${label} taken out: the shelves are cut again.`, 'ok');
    done();
  };

  // Turn 33 (CLAUDE.md F3): a bought mechanism into its column — the store
  // refuses a second of the same kind in the same opening, and says so.
  const onAddKit = (kitKind, label, extra = null) => {
    const id = addWardrobeKit(unit.id, kitKind, zones.length > 1 ? kitZone : null, extra);
    if (!id) {
      notify(`That ${zones.length > 1 ? 'column' : 'unit'} already has a ${label.toLowerCase()}.`, 'warn');
      return;
    }
    notify(`${label} added — a purchase line in the BOM and the room it takes in the scene. Nothing is drilled.`, 'ok');
    done();
  };

  const kinds = [
    {
      id: 'drawers',
      // TURN 40 (F3b): named for what it IS, now that there are two kinds.
      label: 'Drawers (internal)',
      disabled: !type.supports.drawers || ratioDrawers,
      why: ratioDrawers ? 'this kit IS its drawers' : 'not for this type',
    },
    // ─── TURN 40 (CLAUDE.md F3b): OVERLAY, BESIDE THE INTERNAL ONES ────────
    // "clearly distinguished (internal vs overlay)" — so the two sit next to
    // each other and each says which it is in its own label.
    {
      id: 'overlay_drawers',
      label: 'Drawers (overlay)',
      disabled: !type.supports.drawers || ratioDrawers || type.family !== 'wardrobe',
      why: ratioDrawers ? 'this kit IS its drawers' : 'a wardrobe thing',
    },
    // ─── TURN 53 (CLAUDE.md F8a): THE WATCH DRAWER, AT POSITION 3 ──────────
    //
    // The owner, 27.08.2026: *"szuflada z zegarkami powinna być jako osobna
    // pozycja, pod szufladami — czyli pozycja 3. dodajesz normalne szuflady i
    // później masz: czy chcesz dodać szufladę (nad nimi, z zegarkami)."*
    //
    // Third, under the two drawer entries, and it says in its own row why it
    // is unavailable rather than vanishing: a stack has to exist first, because
    // the watch drawer goes ON TOP of one.
    {
      id: 'watch_drawer',
      // T67 F9 · the owner: *"watches szuflad jest bez sensu … tam będzie
      // watches, belts, ties, cufflinks, biżuteria"* — and *"zmień w PRO też
      // tę nazwę."*  LABEL ONLY: the engine's `watch_drawer` id above is
      // untouched, so the cut path knows nothing of this line.
      label: 'Accessories drawer',
      disabled: !type.supports.drawers || ratioDrawers || !existingDrawers,
      why: ratioDrawers
        ? 'this kit IS its drawers'
        : (existingDrawers ? 'not for this type' : 'add the drawers first'),
    },
    { id: 'shelves', label: 'Shelves', disabled: !type.supports.shelves, why: 'not for this type' },
    // ─── TURN 54 (CLAUDE.md F7): THE SHOE IS A DRAWER ───────────────────────
    // The owner, screenshot in hand: "prosiłem żeby cała szuflada miała
    // logikę szuflad, czyli wiercenie, runners etc etc, głębokość etc — tylko
    // wysokość miała być mniejsza. usuń stary kod na shoes i zrób z logiką
    // drawers." The row keeps its place and its name; what it ADDS is a
    // `variant:'shoe'` drawer in the stack at the clicked zone — no height
    // slider, because the 80 side is the law.
    {
      id: 'shoe_box',
      label: 'Shoe box',
      // T75 F16 · a chest of drawers IS its drawers: the store has always
      // refused a shoe drawer in a ratio stack, and the row now says so first.
      disabled: !type.supports.drawers || type.family !== 'wardrobe' || ratioDrawers,
      why: ratioDrawers ? 'this kit IS its drawers' : 'a wardrobe thing',
    },
    // Turn 11 (CLAUDE.md F3.4): the vertical partition, at last. It divides the
    // cabinet into columns and is placed and edited exactly as a shelf is —
    // through the same item list, on the other axis.
    {
      id: 'partition',
      // Turn 32 (CLAUDE.md F4): the owner's name for it.
      label: 'Vertical partition (divider)',
      disabled: !type.supports.shelves,
      why: 'not for this type',
    },
    {
      id: 'hanger',
      label: 'Hanger rail',
      // Turn 32 (CLAUDE.md F4): a divided cabinet may hang one rail PER
      // COLUMN, so a fitted unit-wide rail only closes the door when there
      // are no columns left to ask about.
      disabled: !type.supports.rail || (Boolean(rail) && zones.length <= 1),
      why: rail ? 'already fitted' : 'not for this type',
    },
    // ─── TURN 50 (CLAUDE.md F9): THE MENU ASKS WHAT KIND OF FURNITURE ─────
    //
    // The owner, 25.08.2026: *"cargo pull-out i waste bin po wyborze wardrobe w
    // ogóle nie ma sensu — tylko w kitchen. to ważne, żeby się menu ustawiało
    // pod typ mebla."*
    //
    // These two were the only entries in this list that never asked. Every
    // other one has read the TYPE since it was written — `type.supports.rail`,
    // `type.family !== 'wardrobe'` — each with its reason in the row; these
    // were hard-coded `disabled: true, soon: true` and stood there on a
    // wardrobe offering a kitchen fitting.
    //
    // *"available where the family makes sense, absent with a reason where it
    // does not."*  So `families` is the SAME mechanism said once: an entry that
    // names its families is not rendered outside them (`shown`, below), and
    // where it IS rendered it answers to the ordinary `disabled`/`why` the rest
    // of the list answers to. NO NEW MECHANISM — `type.family` is what decides,
    // exactly as it decides the trouser pull-out three rows down.
    //
    // They stay `soon` in a KITCHEN, because a cargo pull-out is not built
    // tonight and CLAUDE.md does not ask for one. What F9 asks for is that the
    // menu stop offering it where it could never make sense.
    {
      id: 'cargo',
      label: 'Cargo pull-out',
      families: ['kitchen'],
      disabled: true,
      soon: true,
      why: 'a kitchen fitting',
    },
    {
      id: 'bins',
      label: 'Waste bins',
      families: ['kitchen'],
      disabled: true,
      soon: true,
      why: 'a kitchen fitting',
    },
    // ─── TURN 33 (CLAUDE.md F3): THE BOUGHT MECHANISMS GO LIVE ──────────────
    // Each is a BOM named spec + the room it takes in the scene (a labelled
    // placeholder until the owner supplies a GLB). ZERO holes ride them.
    {
      // ─── TURN 58 (CLAUDE.md F4): NOT UNDER A SLOPE ────────────────────────
      // The owner: *"Szafa ze skosem nie może mieć pull-down, bo to jest
      // zawsze na wysokości."*  The kit parks HIGH and its swing sweeps the
      // top front — exactly the air a rake takes away.
      //
      // NO SECOND GATE: this is the `disabled`/`why` channel every other row
      // in this list answers to, given one more reason to say no. The store
      // removes any kit already fitted when the slope arrives
      // (`settleSlopePulldowns`); this stops a new one being asked for, and
      // the two read the same fact — `unitUnderSlope` is the store's own
      // answer, not a second reading of the room.
      id: 'pulldown',
      label: 'Pull-down rail',
      disabled: !type.supports.pulldown || underSlope,
      why: underSlope ? 'not under a slope — it parks at the top' : 'not for this type',
    },
    // T75 F16 · a hanging kit goes in a wardrobe's hanging space: a chest of
    // drawers, a desk or a low unit stands BESIDE a wardrobe and has none
    // (`type.besideWardrobe`), so the row says so and the store refuses too.
    {
      id: 'trouser',
      label: 'Trouser pull-out',
      disabled: type.family !== 'wardrobe' || Boolean(type.besideWardrobe),
      why: type.besideWardrobe ? 'it goes in a wardrobe' : 'a wardrobe thing',
    },
    {
      id: 'tie_rack',
      label: 'Tie rack',
      disabled: type.family !== 'wardrobe' || Boolean(type.besideWardrobe),
      why: type.besideWardrobe ? 'it goes in a wardrobe' : 'a wardrobe thing',
    },
    // ─── T75 F19 · HOOKS AND THE VALET ROD ─────────────────────────────────
    // *"Two rows in Add items for the wardrobe family: `Hooks` (a row of N,
    // BOM line, placeholder bodies, zero holes) and `Valet rod` (pull-out,
    // BOM line, placeholder, zero holes), the `hardwareKit` grammar."*  Two
    // more bought fittings, added as the three above are.
    {
      id: 'hooks',
      label: 'Hooks',
      disabled: type.family !== 'wardrobe' || Boolean(type.besideWardrobe),
      why: type.besideWardrobe ? 'it goes in a wardrobe' : 'a wardrobe thing',
    },
    {
      id: 'valet_rod',
      label: 'Valet rod',
      disabled: type.family !== 'wardrobe' || Boolean(type.besideWardrobe),
      why: type.besideWardrobe ? 'it goes in a wardrobe' : 'a wardrobe thing',
    },
    // ─── T78 F9 · THE CAROUSEL, ON THE L ONLY ─────────────────────────────
    // The owner, 11.10.2026: *"krecacy sie naroznik na garnki w srodku."*  A
    // bought mechanism: one BOM line, a placeholder body in the inner corner,
    // zero holes; the L's shelves step aside (a fixed one refuses, in words).
    {
      id: 'carousel',
      label: 'Carousel',
      families: ['kitchen'],
      disabled: !type.corner,
      why: 'an L corner thing',
    },
    // T78 F11 · the Hafele blind-corner pull-out, on the blind kits only (the
    // owner: *"hafele naroznik slepy czyli wysuwane"*): a bought mechanism, one
    // BOM line, a placeholder body behind the blank, zero holes.
    {
      id: 'blind_pullout',
      label: 'Blind corner pull-out',
      families: ['kitchen'],
      disabled: !type.blind,
      why: 'a blind corner thing',
    },
  ];

  // What this FAMILY of cabinet offers by default (profile.itemsByContext) —
  // structure as data, so a workshop reorders its own list in profile.js.
  const offered = profile.itemsByContext[type.family] || profile.itemsByContext.default || [];
  // ─── DISABLED 19.08.2026 (chat-fix after T41) — COMMENTED OUT, NOT DELETED.
  // The owner: the list must be ALWAYS fully expanded — "Show all (3 more)"
  // hid three kinds behind a click. The per-family filter below is kept for
  // the day he wants it back:
  // const shown = showAll ? kinds : kinds.filter((k) => offered.includes(k.id));
  //
  // ─── TURN 50 (CLAUDE.md F9): …EXCEPT WHERE THE FAMILY SAYS NOT AT ALL ────
  // *"absent with a reason where it does not."*  An entry that names its
  // families is drawn inside them and nowhere else — the owner's *"w ogóle nie
  // ma sensu"* is ABSENT rather than greyed, because a greyed row a joiner can
  // never use is still a row he reads every time he opens this list.
  const shown = kinds.filter((k) => !k.families || k.families.includes(type.family));

  return (
    <div className="space-y-1" data-add-items="1">
      {shown.map((kind) => (
        <div key={kind.id}>
          <button
            type="button"
            disabled={kind.disabled}
            aria-expanded={addItemKind === kind.id}
            data-add-kind={kind.id}
            data-add-family={kind.families ? kind.families.join(',') : undefined}
            title={kind.disabled ? (kind.why || 'not for this type') : undefined}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-left transition-colors
              disabled:opacity-40 disabled:cursor-not-allowed hover:enabled:bg-shell-700 ${
              addItemKind === kind.id ? 'bg-shell-700 text-gold' : 'text-ink-100'}`}
            onClick={(e) => {
              // ─── TURN 54 (CLAUDE.md F4.2): THE ROW IS A ROAD, NOT A DEAD END
              // On a unit that already HAS one, the "Accessories drawer"
              // row's chevron opens the layout modal for that item — beside
              // the row (house modal law) — instead of expanding an add-form
              // for a drawer the store would refuse to add twice. (The
              // comparison is written operand-first so T53-F8a's source slice
              // still anchors on the row's own config block below.)
              if ('watch_drawer' === kind.id) {
                const watchItem = items.find((i) => i?.kind === 'drawer' && i.watch_insert === true);
                if (watchItem) {
                  openModal('watch-layout', {
                    unitId: unit.id, itemId: watchItem.id, anchor: anchorOfEvent(e),
                  });
                  return;
                }
              }
              setAddItemKind(kind.id);
            }}
          >
            <span className="flex-1">{kind.label}</span>
            {kind.soon && <span className="cc-tag">soon</span>}
            {kind.disabled && !kind.soon && <span className="text-[10px] text-ink-400">{kind.why}</span>}
            {!kind.disabled && <span className="text-ink-400 text-[10px]" aria-hidden>{addItemKind === kind.id ? '▾' : '▸'}</span>}
          </button>

          {addItemKind === kind.id && !kind.disabled && (
            <div className="mt-1 mb-2 ml-2 pl-2 border-l border-shell-600 space-y-2">
              {kind.id === 'drawers' && (
                <>
                  {/* ─── WHICH COLUMN (turn 32, CLAUDE.md F4) ───
                      The same grammar the shelves learned in turn 12: only
                      asked when the cabinet is divided. */}
                  {zones.length > 1 && (
                    <div className="space-y-1">
                      <span className="cc-label">Which column</span>
                      <div className="flex flex-wrap gap-1">
                        {zones.map((z) => (
                          <button
                            key={z.id}
                            type="button"
                            data-drawer-zone={z.index}
                            className={`cc-btn px-2 ${drawerZone === z.index ? 'border-gold text-gold' : ''}`}
                            title={`${formatMm(z.size)} mm clear`}
                            onPointerEnter={() => onZoneHover?.(z.index)}
                            onPointerLeave={() => onZoneHover?.(drawerZone)}
                            onClick={() => { setDrawerZone(z.index); onZoneHover?.(z.index); }}
                          >
                            Column {z.index + 1} · {formatMm(z.size)}
                          </button>
                        ))}
                      </div>
                      {drawerZone == null && (
                        <p className="text-[11px] text-gold">
                          This cabinet is divided — pick the column the drawers go in.
                        </p>
                      )}
                    </div>
                  )}
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="w-16">
                      <span className="cc-label">Count</span>
                      <NumberField min={1} max={DR.maxCount} value={drawerCount} onCommit={setDrawerCount} />
                    </div>
                    <div className="w-20">
                      <span className="cc-label">Height</span>
                      <NumberField
                        min={DR.minFrontHeight} max={DR.maxFrontHeight}
                        value={drawerHeight} onCommit={setDrawerHeight}
                      />
                    </div>
                    {/* T79 F3 · COLUMNS, beside the count: 1 or 2, like the bays. */}
                    {askColumns && (
                      <div>
                        <span className="cc-label">Columns</span>
                        <div className="flex gap-1">
                          {[1, 2].map((n) => (
                            <button
                              key={n}
                              type="button"
                              data-drawer-columns={n}
                              aria-pressed={drawerColumns === n}
                              className={`cc-btn px-2 ${drawerColumns === n ? 'border-gold text-gold' : ''}`}
                              onClick={() => setDrawerColumns(n)}
                            >
                              {n}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <button
                      type="button"
                      className="cc-btn-gold"
                      disabled={zones.length > 1 && drawerZone == null}
                      onClick={() => onAddDrawers(drawerCount, drawerHeight)}
                    >
                      Add
                    </button>
                  </div>
                  {askColumns && (
                    <p data-drawer-columns-hint className={`text-[11px] ${drawerColumns === 2 ? 'text-gold' : 'text-ink-400'}`}>
                      2 columns: a divider mid-width, a stack in each column, one fixed shelf over both.
                    </p>
                  )}
                  {/* ─── TURN 32 (CLAUDE.md F4): OVERLAY OR INTERNAL ───
                      The mechanism T30 F20 built for the pantry, wired to the
                      question at last: an INTERNAL drawer is given no face and
                      lives behind the doors, revealed when a front opens. */}
                  {/* ─── TURN 41 (F3): AND THE WORDS SAY WHAT THEY DO ─────────
                      The brief: *"in F3 do not tidy the menu before the switch
                      works."* The switch works now — choosing one drawer kind
                      clears the other — so the menu is tidied last, here.

                      WHAT WAS WRONG. This pair sat inside the panel labelled
                      "Drawers (internal)" and its buttons read Overlay and
                      Internal — the third unrelated meaning of those two words
                      in one menu, and the one pair in the app that CANNOT make
                      an overlay drawer. `mount` decides exactly one thing in
                      the engine: whether a drawer gets a FACE. Measured, with
                      the panel's own default 'overlay' lit gold: clicking it
                      changed nothing, and clicking "Internal" deleted the
                      fronts. Meanwhile the real overlay drawer — fronts on the
                      face, doors shortened above — is the OTHER entry in this
                      same offer.

                      So the buttons keep their behaviour to the byte and are
                      renamed to the question they actually answer: does this
                      drawer have a front of its own, or does it live bare
                      behind the doors? `drawerMount` and the `data-` hooks are
                      untouched, so every existing test and every saved item
                      reads exactly as it did. */}
                  <div className="flex gap-1">
                    <button
                      type="button"
                      data-drawer-mount="overlay"
                      className={`cc-btn flex-1 ${drawerMount === 'overlay' ? 'border-gold text-gold' : ''}`}
                      title="Each drawer gets a front of its own, behind the doors"
                      onClick={() => setDrawerMount('overlay')}
                    >
                      With fronts
                    </button>
                    <button
                      type="button"
                      data-drawer-mount="internal"
                      className={`cc-btn flex-1 ${drawerMount === 'internal' ? 'border-gold text-gold' : ''}`}
                      title="No front of its own — the bare box lives behind the doors"
                      onClick={() => setDrawerMount('internal')}
                    >
                      Bare boxes
                    </button>
                    <button
                      type="button" className="cc-btn flex-1" disabled
                      title="Inset deductions still to come from Piotr — BLOCKERS #6"
                    >
                      Inset <span className="cc-tag ml-1">soon</span>
                    </button>
                  </div>
                  {/* ─── TURN 33 (CLAUDE.md F3): THE VARIANT — insert bought,
                      box cut unchanged. Only a wardrobe asks. */}
                  {type.family === 'wardrobe' && (
                    <div className="flex gap-1 flex-wrap">
                      {[
                        [null, 'Standard', 'The plain box'],
                        // CHAT-FIX 16.08 (owner): the SHOE drawer variant is
                        // retired from the offer — "to shoe nadal jest w
                        // drawers, teraz już nie ma sensu, bo jest osobno".
                        // Saved projects keep rendering theirs; nothing NEW.
                        ['belt_tie', 'Belt/tie', 'Low box; the divider insert is a purchase line'],
                        ['belt_tie_glass', 'Belt/tie + glass', 'Display drawer: the glass is ordered to the box'],
                      ].map(([id, label, hint]) => (
                        <button
                          key={label}
                          type="button"
                          data-drawer-variant={id || 'std'}
                          className={`cc-btn px-2 text-[11px] ${drawerVariant === id ? 'border-gold text-gold' : ''}`}
                          title={hint}
                          onClick={() => setDrawerVariant(id)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                  <p className="text-[11px] text-ink-400">
                    Stacked from the bottom, {DR.minFrontHeight}–{DR.maxFrontHeight} mm each. A partition closes the
                    stack automatically (SPEC 4.7), and the doors open so you can see them.
                  </p>
                </>
              )}

              {/* ─── TURN 40 (CLAUDE.md F3b): THE OVERLAY STACK ───────────
                  Two numbers and nothing else. Everything the stack implies —
                  the bottom position, the fixed shelf over it, the shortened
                  doors and their re-laddered hinges — is the engine's law and
                  not a question a joiner should have to answer twice. */}
              {kind.id === 'overlay_drawers' && (
                <>
                  <div className="flex items-end gap-2">
                    <div className="w-16">
                      <span className="cc-label">Count</span>
                      <NumberField
                        min={1} max={DR.maxCount} value={overlayCount}
                        data-overlay-drawer-count="1"
                        onCommit={setOverlayCount}
                      />
                    </div>
                    <div className="w-20">
                      <span className="cc-label">Height</span>
                      <NumberField
                        min={DR.minFrontHeight} max={DR.maxFrontHeight}
                        value={overlayHeight}
                        data-overlay-drawer-height="1"
                        onCommit={setOverlayHeight}
                      />
                    </div>
                    <button
                      type="button"
                      className="cc-btn-gold"
                      data-add-overlay-drawers="1"
                      onClick={() => onAddOverlayDrawers(overlayCount, overlayHeight)}
                    >
                      Add
                    </button>
                  </div>
                  <p className="text-[11px] text-ink-400">
                    Fronts ON the wardrobe, at the bottom, {DR.gap} mm apart. A FIXED shelf is cut above the
                    stack and the doors start on it — shortened, with their hinges re-laddered for the
                    height they actually are. Heights default to EQUAL, and each one is still editable on
                    its own drawer. There is never a 30 mm hinge strip: an overlay front stands outside the
                    carcass, so no door swings past it.
                  </p>
                </>
              )}

              {/* ─── TURN 34 (CLAUDE.md F4): THE SHOE BOX ─────────────────
                  One construction, two mounting laws. The four decisions the
                  owner named on 16.08 and nothing else: fix or drawer, a
                  divider or none, which bay, and how high off the bay floor. */}
              {/* ─── TURN 53 (CLAUDE.md F8a): THE WATCH DRAWER ─────────────
                  *"dodajesz normalne szuflady i później masz: czy chcesz dodać
                  szufladę (nad nimi, z zegarkami). wtedy dokładamy taką
                  szufladę już bez możliwości sterowania wysokością — zawsze
                  stała wysokość."*

                  So there is NO height field here, and its absence is the
                  feature: the number is derived once (`watchDrawerFixedHeight`)
                  and stated below beside what it is made of. */}
              {kind.id === 'watch_drawer' && (
                <>
                  <button
                    type="button"
                    className="cc-btn-gold w-full"
                    data-add-watch-drawer="1"
                    onClick={() => {
                      const res = addWatchDrawer(unit.id, zones.length > 1 ? drawerZone : null);
                      if (!res?.ok) { notify(res?.error || 'The accessories drawer was not added.', 'warn'); return; }
                      notify(`Accessories drawer added on top of the stack — ${formatMm(res.height)} mm, fixed. `
                        + 'Open it to choose one of the four layouts.', 'ok');
                      done();
                    }}
                  >
                    Add an accessories drawer on top
                  </button>
                  <p className="text-[11px] text-ink-400">
                    One fixed height — {formatMm(watchDrawerFixedHeight(profile))} mm — because the tray
                    inside it is fixed: {profile.watchDrawer?.insideDepthMm ?? 60} mm of inside depth on a{' '}
                    {profile.watchDrawer?.baseT ?? 9} mm base, plus the box&apos;s own seat and its
                    front-to-side delta. There is no slider, and that is the point.
                    {' '}Choosing a layout, the glass over it and its finish all live in the drawer&apos;s
                    own window.
                  </p>
                </>
              )}

              {kind.id === 'shoe_box' && (
                <>
                  {zones.length > 1 && (
                    <div className="space-y-1">
                      <span className="cc-label">Which bay</span>
                      <div className="flex flex-wrap gap-1">
                        {zones.map((z) => (
                          <button
                            key={z.id}
                            type="button"
                            data-shoe-box-zone={z.index}
                            className={`cc-btn px-2 ${shoeBoxZone === z.index ? 'border-gold text-gold' : ''}`}
                            title={`${formatMm(z.size)} mm clear`}
                            onPointerEnter={() => onZoneHover?.(z.index)}
                            onPointerLeave={() => onZoneHover?.(shoeBoxZone)}
                            onClick={() => { setShoeBoxZone(z.index); onZoneHover?.(z.index); }}
                          >
                            Bay {z.index + 1} · {formatMm(z.size)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    className="cc-btn-gold w-full"
                    data-add-shoe-box="1"
                    disabled={zones.length > 1 && shoeBoxZone == null}
                    onClick={() => {
                      const id = addShoeDrawer(unit.id, zones.length > 1 ? shoeBoxZone : null);
                      if (!id) notify('Add the shoe drawer where a drawer can go — it joins the stack.', 'warn');
                      done();
                    }}
                  >
                    Add a shoe drawer
                  </button>
                  <p className="text-[11px] text-ink-400">
                    A standard drawer — sides, back, flat bottom, drilling and the same Blum
                    runner every drawer buys — with one number of its own: the side is{' '}
                    {profile.wardrobe?.drawers?.shoeSideMm ?? 80} mm. The front obeys the
                    drawer-front law with the stack. There is no height slider, and that is
                    the point.
                  </p>
                </>
              )}

              {kind.id === 'shelves' && (
                <>
                  {/* ─── WHICH SIDE (turn 12, CLAUDE.md F5.3) ───
                      Only asked when there is something to ask: one bay is not a
                      choice. Hovering a bay highlights it on the canvas, which is
                      what makes "left" and "right" mean a place rather than a word. */}
                  {zones.length > 1 && (
                    <div className="space-y-1">
                      <span className="cc-label">Which side</span>
                      <div className="flex flex-wrap gap-1">
                        {zones.map((z) => (
                          <button
                            key={z.id}
                            type="button"
                            data-zone={z.index}
                            className={`cc-btn px-2 ${shelfZone === z.index ? 'border-gold text-gold' : ''}`}
                            title={`${formatMm(z.size)} mm clear`}
                            onPointerEnter={() => onZoneHover?.(z.index)}
                            onPointerLeave={() => onZoneHover?.(shelfZone)}
                            onClick={() => { setShelfZone(z.index); onZoneHover?.(z.index); }}
                          >
                            Bay {z.index + 1} · {formatMm(z.size)}
                          </button>
                        ))}
                        {/* T79 F2 · THE THIRD BUTTON. The owner: *"jak dodamy fix
                            półkę i divider pod spodem to nie mam możliwości dodania
                            całkowitej półki powyżej"*; mockup approved 14:45, *"1 -
                            tak."* Shown only while the divider ends below the top. */}
                        {above && (
                          <button
                            type="button"
                            data-above-divider="1"
                            className={`cc-btn px-2 ${shelfZone === 'above' ? 'border-gold text-gold' : ''}`}
                            title={`${formatMm(above.width)} mm clear, ${formatMm(above.height)} mm high over the divider`}
                            onPointerEnter={() => onZoneHover?.('above')}
                            onPointerLeave={() => onZoneHover?.(shelfZone)}
                            onClick={() => { setShelfZone('above'); onZoneHover?.('above'); }}
                          >
                            Above divider · {formatMm(above.width)}
                          </button>
                        )}
                      </div>
                      {/* T79 F2 · an opening that went away while picked asks again, never a mute Add. */}
                      {(shelfZone == null || (shelfZone === 'above' && !above)) && (
                        <p className="text-[11px] text-gold">
                          This cabinet is divided — pick the bay the shelf goes in.
                        </p>
                      )}
                      {shelfZone === 'above' && above && (
                        <p className="text-[11px] text-ink-400" data-above-divider-hint="1">
                          Full width, centred in the opening above the fixed shelf that carries the divider.
                        </p>
                      )}
                    </div>
                  )}
                  <div className="flex items-end gap-2">
                    <div className="w-16">
                      <span className="cc-label">Add</span>
                      <NumberField min={1} max={10} value={shelfCount} onCommit={setShelfCount} />
                    </div>
                    <button
                      type="button"
                      className="cc-btn-gold"
                      disabled={zones.length > 1 && (shelfZone == null || (shelfZone === 'above' && !above))}
                      onClick={() => onAddShelves(shelfCount)}
                    >
                      Add
                    </button>
                  </div>
                  <p className="text-[11px] text-ink-400">
                    Centred in the biggest opening it can find, never on top of a shelf that is already
                    there. Drag any of them vertically, or press Even to space them out.
                  </p>
                </>
              )}

              {kind.id === 'partition' && (
                <>
                  <button type="button" className="cc-btn-gold w-full" onClick={onAddPartition}>
                    Add a vertical partition
                  </button>
                  <p className="text-[11px] text-ink-400">
                    A divider, centred in the widest bay it can find. It runs from the base to the first
                    FIXED shelf above it, or to the top when there is none — and if that shelf is set back,
                    the partition is set back with it. Select it in the canvas to move it along the width.
                  </p>
                </>
              )}

              {kind.id === 'hanger' && (
                <>
                  {zones.length > 1 && (
                    <div className="space-y-1">
                      <span className="cc-label">Which column</span>
                      <div className="flex flex-wrap gap-1">
                        {zones.map((z) => (
                          <button
                            key={z.id}
                            type="button"
                            data-rail-zone={z.index}
                            className={`cc-btn px-2 ${railZone === z.index ? 'border-gold text-gold' : ''}`}
                            title={`${formatMm(z.size)} mm clear`}
                            onPointerEnter={() => onZoneHover?.(z.index)}
                            onPointerLeave={() => onZoneHover?.(railZone)}
                            onClick={() => { setRailZone(z.index); onZoneHover?.(z.index); }}
                          >
                            Column {z.index + 1} · {formatMm(z.size)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <span className="cc-label">Rail (hardware)</span>
                    <select
                      className="cc-input"
                      value={railMaterial}
                      onChange={(e) => setRailMaterial(e.target.value)}
                    >
                      <option value="">Not specified</option>
                      {hardware.map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                      <option value="" disabled>— Connect JoineryCore for live stock (soon) —</option>
                    </select>
                  </div>
                  <button
                    type="button" className="cc-btn-gold w-full"
                    onClick={() => onAddRail(hardware.find((m) => m.id === railMaterial) || null)}
                  >
                    Add hanger rail
                  </button>
                </>
              )}

              {/* ─── T78 F9 · THE CAROUSEL ─────────────────────────────────── */}
              {kind.id === 'carousel' && (
                <>
                  <button
                    type="button"
                    className={carouselOn ? 'cc-btn w-full' : 'cc-btn-gold w-full'}
                    data-corner-kit="carousel"
                    data-corner-kit-on={carouselOn ? '1' : '0'}
                    onClick={() => onCornerKit('carousel', 'Carousel', !carouselOn)}
                  >
                    {carouselOn ? 'Remove carousel' : 'Add carousel'}
                  </button>
                  <p className="text-[11px] text-ink-400">
                    BOUGHT, never cut: a named line in the BOM ordered to the inner-corner square, and two round
                    trays on a post drawn in the scene as a placeholder until the owner&apos;s model arrives. Nothing
                    is drilled. The L&apos;s adjustable shelves step aside; a fixed shelf in its way is refused.
                  </p>
                </>
              )}
              {/* ─── T78 F11 · THE HAFELE BLIND-CORNER PULL-OUT ─────────────── */}
              {kind.id === 'blind_pullout' && (
                <>
                  <button
                    type="button"
                    className={blindPulloutOn ? 'cc-btn w-full' : 'cc-btn-gold w-full'}
                    data-corner-kit="blind_pullout"
                    data-corner-kit-on={blindPulloutOn ? '1' : '0'}
                    onClick={() => onCornerKit('blind_pullout', 'Blind corner pull-out', !blindPulloutOn)}
                  >
                    {blindPulloutOn ? 'Remove blind corner pull-out' : 'Add Hafele blind corner pull-out'}
                  </button>
                  <p className="text-[11px] text-ink-400">
                    BOUGHT, never cut: a named line in the BOM, and two wire trays behind the blank drawn in the scene
                    as a placeholder until the owner&apos;s model arrives. Nothing is drilled. The kit&apos;s shelves step
                    aside while it is fitted; a fixed shelf in its way is refused.
                  </p>
                </>
              )}
              {/* ─── TURN 33 (CLAUDE.md F3): THE BOUGHT MECHANISMS ─────────── */}
              {['pulldown', 'trouser', 'tie_rack', 'hooks', 'valet_rod'].includes(kind.id) && (() => {
                const kitKind = kind.id === 'pulldown' ? 'pulldown_rail' : kind.id;
                return (
                  <>
                    {zones.length > 1 && (
                      <div className="space-y-1">
                        <span className="cc-label">Which column</span>
                        <div className="flex flex-wrap gap-1">
                          {zones.map((z) => (
                            <button
                              key={z.id}
                              type="button"
                              data-kit-zone={z.index}
                              className={`cc-btn px-2 ${kitZone === z.index ? 'border-gold text-gold' : ''}`}
                              title={`${formatMm(z.size)} mm clear`}
                              onPointerEnter={() => onZoneHover?.(z.index)}
                              onPointerLeave={() => onZoneHover?.(kitZone)}
                              onClick={() => { setKitZone(z.index); onZoneHover?.(z.index); }}
                            >
                              Column {z.index + 1} · {formatMm(z.size)}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {kind.id === 'pulldown' && (
                      <label className="space-y-1 block">
                        <span className="cc-label">Rod from top (mm)</span>
                        <input
                          type="number"
                          className="cc-input w-full"
                          data-kit-rod-from-top="1"
                          min={0}
                          step={5}
                          placeholder={String(profile.wardrobeAccessories?.kits?.pulldown_rail?.topDrop ?? 50)}
                          value={rodFromTop}
                          onChange={(e) => setRodFromTop(e.target.value)}
                        />
                      </label>
                    )}
                    <button
                      type="button"
                      className="cc-btn-gold w-full"
                      data-add-kit={kitKind}
                      disabled={zones.length > 1 && kitZone == null}
                      onClick={() => onAddKit(kitKind, kind.label,
                        kind.id === 'pulldown' && rodFromTop !== ''
                          ? { pos_mm: Math.max(0, Number(rodFromTop) || 0) } : null)}
                    >
                      Add {kind.label.toLowerCase()}
                    </button>
                    <p className="text-[11px] text-ink-400">
                      BOUGHT, never cut: a named spec in the BOM ordered to the column&apos;s opening, and the
                      room it takes drawn in the scene — a labelled placeholder until the owner&apos;s model
                      arrives. Nothing is drilled: no fixing pattern is published.
                    </p>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      ))}

      {/* ─── DISABLED 19.08.2026 (chat-fix after T41) — COMMENTED OUT, NOT
          DELETED. The list is always fully expanded now, so the "Show all"
          escape hatch has nothing to escape. Kept with its filter above for
          the day the owner wants the per-family default back.
      <button
        type="button"
        className="w-full text-left px-2 py-1 text-[11px] text-ink-400 hover:text-gold transition-colors"
        onClick={() => setShowAll((v) => !v)}
      >
        {showAll
          ? `▴ Show what a ${'$'}{type.family} unit usually takes`
          : `▾ Show all (${'$'}{kinds.length - shown.length} more)`}
      </button> ─── */}
    </div>
  );
}
