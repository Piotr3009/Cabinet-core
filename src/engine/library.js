// ─── The library, as DATA (turn 12, CLAUDE.md F3) ───────────────────────────
//
// "The owner's exact list, in this order, as DATA — components render, data
// decides." So this is the list, and components/LibraryPanel.jsx walks it. The
// order below is Piotr's, written down once, and moving an entry is moving a
// line here rather than rearranging JSX.
//
// The owner's seven, in his order:
//
//   1. Door base unit                         BUD
//   2. Drawer unit — an expandable GROUP      1× · 2× · 3× · 4×
//   3. Tall unit                              BUDTALL
//   4. Fridge unit                            FRIDGE
//   5. DW unit (dishwasher housing)           held open — see below
//   6. Corner unit · L-shape unit             held open — see below
//   7. Wall units, last                       WUD
//
// Then the two kits the list does not name — the sink base and the low cabinet.
// They are kept, at the end, because dropping a kit a workshop already builds
// would be a cull nobody asked for; they are at the end rather than among the
// base units so that "wall units last" stays true of the list Piotr wrote.
//
// ─── WHAT IS HELD OPEN, AND WHY ───
// Three entries are PRESENT and DISABLED. That is CLAUDE.md's pattern-first
// rule (the same one BACKLOG #59 stands under), and it is not a shortcut:
//
//   • DW unit — a dishwasher housing is a front and a gap, and nothing in
//     reference/lisp or SPEC.md defines what that front is or what the gap
//     leaves. KIT_FRIDGE is the only appliance kit and it is a HOUSING with a
//     carcass around the appliance, which a dishwasher does not have.
//   • Corner unit, L-shape unit — no kit and no LISP defines either. CLAUDE.md
//     F3.6 says so outright: "the owner writes the pattern with the assistant
//     first".
//   • Drawer unit 1× (the drawerline) — a drawer over a DOOR needs a door of
//     partial height, and no kit defines one. See profile.baseDrawerUnit.
//
// A disabled entry carries the REASON with it, so the panel can say why rather
// than being mysteriously grey. BLOCKERS.md carries the same four.
//
// Pure data and pure functions — no React, no store, no profile import at the
// top level. `library.js` is read by the engine tests as well as the panel.

/**
 * An entry is one of:
 *   { kind: 'type',  id, typeId, label?, hint? }
 *   { kind: 'group', id, label, hint?, items: [entry…] }   — expandable
 *   { kind: 'soon',  id, label, hint, reason }             — held open
 *
 * `label` left out means "whatever the unit type calls itself", which keeps one
 * name for a kit instead of two that can drift.
 */
export const KITCHEN_LIBRARY = [
  { kind: 'type', id: 'door-base', typeId: 'BUD' },
  {
    kind: 'group',
    id: 'drawer-unit',
    label: 'Drawer unit',
    hint: 'How many drawers the stack is split into',
    // The items are built from the profile's variants (F3.2: the ratio IS the
    // variant), so adding a fifth split is a profile line and not a code change.
    variantsOf: 'baseDrawerUnit',
    items: [
      { kind: 'type', id: 'drawer-1', typeId: null, variant: 'x1' },
      { kind: 'type', id: 'drawer-2', typeId: 'BUDR2', variant: 'x2' },
      { kind: 'type', id: 'drawer-3', typeId: 'BUDR', variant: 'x3' },
      { kind: 'type', id: 'drawer-4', typeId: 'BUDR4', variant: 'x4' },
    ],
  },
  { kind: 'type', id: 'tall', typeId: 'BUDTALL' },
  { kind: 'type', id: 'fridge', typeId: 'FRIDGE' },
  {
    kind: 'soon',
    id: 'dishwasher',
    label: 'DW unit',
    hint: 'Dishwasher housing',
    reason: 'No kit defines the appliance front and gap yet — the pattern comes first',
  },
  {
    kind: 'soon',
    id: 'corner',
    label: 'Corner unit',
    hint: 'The cabinet that turns a run',
    reason: 'No kit or LISP defines a corner carcass yet — the pattern comes first',
  },
  {
    kind: 'soon',
    id: 'l-shape',
    label: 'L-shape unit',
    hint: 'One carcass on two walls',
    reason: 'No kit or LISP defines an L-shaped carcass yet — the pattern comes first',
  },
  { kind: 'type', id: 'wall', typeId: 'WUD', label: 'Wall unit' },
  // ── the kits Piotr's list does not name, kept rather than culled ──
  { kind: 'type', id: 'sink', typeId: 'SINK' },
  { kind: 'type', id: 'low', typeId: 'LOW_CABINET' },
];

/** Every entry, groups flattened — what a "which kits exist" question wants. */
export function flattenLibrary(entries = KITCHEN_LIBRARY) {
  const out = [];
  for (const e of entries) {
    if (e.kind === 'group') out.push(...flattenLibrary(e.items));
    else out.push(e);
  }
  return out;
}

/** Every unit TYPE the library can insert, in library order. */
export function libraryTypeIds(entries = KITCHEN_LIBRARY) {
  return flattenLibrary(entries).filter((e) => e.kind === 'type' && e.typeId).map((e) => e.typeId);
}

/**
 * One entry, resolved against the profile — is it clickable, and if not, why?
 *
 * A variant entry inherits its answer from the profile's variant record, which
 * is where the 1× drawerline is switched off. Everything else is `kind: 'soon'`
 * or a real type.
 *
 * @returns {{enabled:boolean, reason:string|null, label:string|null, hint:string|null, count:number|null}}
 */
export function resolveEntry(entry, profile) {
  if (!entry) return { enabled: false, reason: null, label: null, hint: null, count: null };
  if (entry.kind === 'soon') {
    return {
      enabled: false, reason: entry.reason || null, label: entry.label, hint: entry.hint || null, count: null,
    };
  }
  const variant = entry.variant
    ? (profile?.baseDrawerUnit?.variants || []).find((v) => v.id === entry.variant) || null
    : null;
  if (variant) {
    return {
      enabled: Boolean(variant.enabled) && Boolean(entry.typeId),
      reason: variant.enabled && entry.typeId ? null : (variant.soon || 'Not yet'),
      label: variant.label,
      hint: variant.hint || null,
      count: variant.count ?? null,
    };
  }
  return {
    enabled: Boolean(entry.typeId),
    reason: entry.typeId ? null : 'Not yet',
    label: entry.label || null,
    hint: entry.hint || null,
    count: null,
  };
}
