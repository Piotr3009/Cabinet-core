import { useMemo, useState } from 'react';
import NumberField from './NumberField.jsx';
import { useUiStore } from '../stores/uiStore.js';
import { useProjectStore } from '../stores/projectStore.js';
import { useCabinetProfileStore } from '../stores/cabinetProfileStore.js';
import { useMaterialAssignmentStore } from '../stores/materialAssignmentStore.js';
import { getUnitType } from '../engine/types.js';
import { hangerOf } from '../engine/items.js';
import { formatMm } from '../engine/format.js';
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
  const addShelves = useProjectStore((s) => s.addShelves);
  const addPartition = useProjectStore((s) => s.addPartition);
  const addHangerRail = useProjectStore((s) => s.addHangerRail);
  const unitResult = useProjectStore((s) => s.unitResult);
  const zonesOf = useProjectStore((s) => s.zonesOf);

  const type = getUnitType(unit.type);
  const items = unit.params.sections?.[0]?.items || [];
  const rail = hangerOf(items);
  const hardware = materials.filter((m) => m.category === 'hardware');
  const zones = useMemo(() => zonesOf(unit.id), [zonesOf, unit.id, items]);

  const DR = profile.wardrobe.drawers;
  const existingDrawers = items.filter((i) => i.kind === 'drawer').length;
  const ratioDrawers = type.drawerStyle === 'budr';

  const [drawerCount, setDrawerCount] = useState(existingDrawers || 2);
  const [drawerHeight, setDrawerHeight] = useState(DR.frontHeight);
  // ─── TURN 32 (CLAUDE.md F4): overlay or INTERNAL, per stack — the owner
  // set "internal" and nothing listened; the click listens now. And WHICH
  // COLUMN, when the cabinet is divided — same grammar as the shelves.
  const [drawerMount, setDrawerMount] = useState('overlay');
  const [drawerZone, setDrawerZone] = useState(null);
  const [railZone, setRailZone] = useState(null);
  const [shelfCount, setShelfCount] = useState(1);
  const [shelfZone, setShelfZone] = useState(null);
  const [railMaterial, setRailMaterial] = useState(hardware.find((m) => /rail/i.test(m.name))?.id || '');
  // ─── Turn 11 (CLAUDE.md F4.4) ───
  // The list is FILTERED by what this kind of cabinet is for, and "Show all" is
  // the way past the filter. Never a hard block: everything the kit supports is
  // one click away, which is the difference between a default and a rule.
  const [showAll, setShowAll] = useState(false);

  const done = () => { setAddItemKind(null); onZoneHover?.(null); onDone?.(); };

  const onAddDrawers = (count, height) => {
    const before = items.filter((i) => i.kind === 'drawer').length;
    const zone = zones.length > 1 ? drawerZone : null;
    // ─── CHAT FIX 15.08.2026: THE CLICK LISTENS ─────────────────────────────
    // This handler used to congratulate BLIND — the store refused (turn 24's
    // gate) and the toast said "added". The gate is open now, but a handler
    // that ignores its store's answer will lie again the next time anything
    // refuses; so the answer is read, and a refusal is said out loud.
    // ─── TURN 32 (CLAUDE.md F4): …and the answer may carry a DOOR ───────────
    // The recessed-partition law refuses with the number and ONE button:
    // [Reset the setback], which opens the partition's own editor
    // (F7-pattern). The guard SPEAKS; it fixes nothing by itself.
    const res = addDrawers(unit.id, count, drawerMount, height, zone);
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
    notify(before
      ? `Stack is ${count} drawer${count === 1 ? '' : 's'} — new ones at ${height} mm, the existing heights kept.`
      : `${count} × ${height} mm drawer${count === 1 ? '' : 's'} added — the partition above them is automatic.`, 'ok');
    // BACKLOG #13: internal drawers live behind the doors, so the doors get out
    // of the way to show what was just added.
    const fronts = unitResult(unit.id)?.panels.filter((p) => p.part === 'FRONT').map((p) => p.id) || [];
    if (fronts.length) openFrontsFor(unit.id, fronts);
    done();
  };

  const onAddShelves = (count) => {
    const { added, requested } = addShelves(unit.id, count, zones.length > 1 ? shelfZone : null);
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
    const id = addHangerRail(unit.id, {
      materialId: material?.id || null,
      materialLabel: material?.name || null,
      zone: zones.length > 1 ? railZone : null,
    });
    if (!id) {
      notify(zones.length > 1
        ? 'That column already has a hanging rail.'
        : 'This unit already has a hanging rail.', 'warn');
      return;
    }
    done();
  };

  const kinds = [
    {
      id: 'drawers',
      label: 'Drawers',
      disabled: !type.supports.drawers || ratioDrawers,
      why: ratioDrawers ? 'this kit IS its drawers' : 'not for this type',
    },
    { id: 'shelves', label: 'Shelves', disabled: !type.supports.shelves, why: 'not for this type' },
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
    { id: 'cargo', label: 'Cargo pull-out', disabled: true, soon: true },
    { id: 'bins', label: 'Waste bins', disabled: true, soon: true },
    { id: 'pulldown', label: 'Pull-down rail', disabled: true, soon: true },
  ];

  // What this FAMILY of cabinet offers by default (profile.itemsByContext) —
  // structure as data, so a workshop reorders its own list in profile.js.
  const offered = profile.itemsByContext[type.family] || profile.itemsByContext.default || [];
  const shown = showAll ? kinds : kinds.filter((k) => offered.includes(k.id));

  return (
    <div className="space-y-1" data-add-items="1">
      {shown.map((kind) => (
        <div key={kind.id}>
          <button
            type="button"
            disabled={kind.disabled}
            aria-expanded={addItemKind === kind.id}
            data-add-kind={kind.id}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-left transition-colors
              disabled:opacity-40 disabled:cursor-not-allowed hover:enabled:bg-shell-700 ${
              addItemKind === kind.id ? 'bg-shell-700 text-gold' : 'text-ink-100'}`}
            onClick={() => setAddItemKind(kind.id)}
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
                  <div className="flex items-end gap-2">
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
                    <button
                      type="button"
                      className="cc-btn-gold"
                      disabled={zones.length > 1 && drawerZone == null}
                      onClick={() => onAddDrawers(drawerCount, drawerHeight)}
                    >
                      Add
                    </button>
                  </div>
                  {/* ─── TURN 32 (CLAUDE.md F4): OVERLAY OR INTERNAL ───
                      The mechanism T30 F20 built for the pantry, wired to the
                      question at last: an INTERNAL drawer is given no face and
                      lives behind the doors, revealed when a front opens. */}
                  <div className="flex gap-1">
                    <button
                      type="button"
                      data-drawer-mount="overlay"
                      className={`cc-btn flex-1 ${drawerMount === 'overlay' ? 'border-gold text-gold' : ''}`}
                      onClick={() => setDrawerMount('overlay')}
                    >
                      Overlay
                    </button>
                    <button
                      type="button"
                      data-drawer-mount="internal"
                      className={`cc-btn flex-1 ${drawerMount === 'internal' ? 'border-gold text-gold' : ''}`}
                      title="No front of its own — the drawer lives behind the doors"
                      onClick={() => setDrawerMount('internal')}
                    >
                      Internal
                    </button>
                    <button
                      type="button" className="cc-btn flex-1" disabled
                      title="Inset deductions still to come from Piotr — BLOCKERS #6"
                    >
                      Inset <span className="cc-tag ml-1">soon</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-ink-400">
                    Stacked from the bottom, {DR.minFrontHeight}–{DR.maxFrontHeight} mm each. A partition closes the
                    stack automatically (SPEC 4.7), and the doors open so you can see them.
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
                      </div>
                      {shelfZone == null && (
                        <p className="text-[11px] text-gold">
                          This cabinet is divided — pick the bay the shelf goes in.
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
                      disabled={zones.length > 1 && shelfZone == null}
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
                  <p className="text-[11px] text-ink-400">
                    Hung as high as it can go under the lowest shelf, above the drawer partition. The rail you pick
                    is the line that appears in the BOM hardware.
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      ))}

      {/* The escape hatch, under the list, exactly where CLAUDE.md F4.4 puts
          it. A filter you cannot see past is a block, and the owner asked for a
          filter. */}
      <button
        type="button"
        className="w-full text-left px-2 py-1 text-[11px] text-ink-400 hover:text-gold transition-colors"
        onClick={() => setShowAll((v) => !v)}
      >
        {showAll
          ? `▴ Show what a ${type.family} unit usually takes`
          : `▾ Show all (${kinds.length - shown.length} more)`}
      </button>
    </div>
  );
}
