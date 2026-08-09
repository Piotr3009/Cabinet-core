// ─── The library, as DATA (turn 12, CLAUDE.md F3; restructured turn 15, F5.2) ─
//
// "The owner's exact list, in this order, as DATA — components render, data
// decides." That was turn 12's rule and it still is; turn 15 replaces the LIST
// with the one the owner wrote out in full, and it is the same shape of file.
// Moving an entry is moving a line here rather than rearranging JSX.
//
// ─── THE OWNER'S CATALOGUE (turn 15, CLAUDE.md F5.2) ────────────────────────
//
// Four groups, because that is how a kitchen is quoted and how the owner listed
// it — and because turn 12's flat list of ten had become a list that would be
// thirty by the end of this turn:
//
//   BASE UNITS   Standard · Drawer unit (2× 3× 4×) · Sink · Corner · L-shape ·
//                DW · Oven · Bin storage · Wine rack · Small fridge ·
//                Twin space · Low cabinet
//   TALL UNITS   Standard · Fridge housing · Basket tall · Pantry ·
//                Pantry-on-worktop · Space tower · Oven tall · American fridge
//   WALL UNITS   Standard · Glass unit · L-shape wall
//   EXTRAS       Free-standing panels · Decorative cornice / pelmet
//
// EVERYTHING THAT WORKED BEFORE STILL WORKS. CLAUDE.md F5.2 names them and they
// are all still wired to their kits: Base, Sink, Drawer 2×/3×/4×, Tall, Fridge,
// Wall, Low cabinet. Nothing was culled to make room for the new names.
//
// ─── WHAT IS HELD OPEN, AND WHY ────────────────────────────────────────────
// Most of the new names are PRESENT and DISABLED, each carrying the honest
// one-liner that says why. That is CLAUDE.md's pattern-first rule (the same one
// BACKLOG #59 stands under) and the same wording the DW and Corner entries have
// carried since turn 12: no kit and no LISP defines the carcass yet, and the
// owner writes the pattern with the assistant before any of them is drawn.
//
// A grey row that does not say why is a row a workshop asks about twice.
//
// Pure data and pure functions — no React, no store, no profile import at the
// top level. `library.js` is read by the engine tests as well as the panel.

/** The one-liner every held-open kit carries, so the wording cannot drift. */
const NO_PATTERN = 'No kit or LISP defines this carcass yet — the pattern comes first';

/**
 * An entry is one of:
 *   { kind: 'type',  id, typeId, label?, hint? }
 *   { kind: 'group', id, label, hint?, items: [entry…] }   — flies out to the side
 *   { kind: 'soon',  id, label, hint, reason }             — held open
 *
 * `label` left out means "whatever the unit type calls itself", which keeps one
 * name for a kit instead of two that can drift.
 */
export const KITCHEN_LIBRARY = [
  {
    kind: 'group',
    id: 'base-units',
    label: 'Base units',
    hint: 'Everything standing on the floor under the worktop',
    items: [
      { kind: 'type', id: 'door-base', typeId: 'BUD', label: 'Standard' },
      {
        kind: 'group',
        id: 'drawer-unit',
        label: 'Drawer unit',
        hint: 'How many drawers the stack is split into',
        // The items are built from the profile's variants (F3.2: the ratio IS
        // the variant), so adding a fifth split is a profile line and not a
        // code change.
        variantsOf: 'baseDrawerUnit',
        items: [
          { kind: 'type', id: 'drawer-1', typeId: null, variant: 'x1' },
          { kind: 'type', id: 'drawer-2', typeId: 'BUDR2', variant: 'x2' },
          { kind: 'type', id: 'drawer-3', typeId: 'BUDR', variant: 'x3' },
          { kind: 'type', id: 'drawer-4', typeId: 'BUDR4', variant: 'x4' },
        ],
      },
      { kind: 'type', id: 'sink', typeId: 'SINK', label: 'Sink' },
      {
        kind: 'soon',
        id: 'corner',
        label: 'Corner',
        hint: 'The cabinet that turns a run — L-shelves, left or right',
        reason: NO_PATTERN,
      },
      {
        kind: 'soon', id: 'l-shape', label: 'L-shape', hint: 'One carcass on two walls', reason: NO_PATTERN,
      },
      {
        kind: 'soon',
        id: 'dishwasher',
        label: 'DW',
        hint: 'Dishwasher housing',
        reason: 'No kit defines the appliance front and gap yet — the pattern comes first',
      },
      {
        kind: 'soon',
        id: 'oven-base',
        label: 'Oven',
        hint: 'Built-under oven housing',
        reason: 'No kit defines the appliance aperture yet — the pattern comes first',
      },
      {
        kind: 'soon', id: 'bin-storage', label: 'Bin storage', hint: 'Pull-out bins', reason: NO_PATTERN,
      },
      {
        kind: 'soon', id: 'wine-rack', label: 'Wine rack', hint: 'Bottle cradles instead of shelves', reason: NO_PATTERN,
      },
      {
        kind: 'soon',
        id: 'small-fridge',
        label: 'Small fridge',
        hint: 'Under-counter appliance housing',
        reason: 'No kit defines the appliance aperture yet — the pattern comes first',
      },
      {
        kind: 'soon',
        id: 'twin-space',
        label: 'Twin space',
        hint: 'The slimline filler unit — baskets or not',
        reason: NO_PATTERN,
      },
      // Kept rather than culled: it is a kit the workshop already builds.
      { kind: 'type', id: 'low', typeId: 'LOW_CABINET' },
    ],
  },
  {
    kind: 'group',
    id: 'tall-units',
    label: 'Tall units',
    hint: 'Floor to the top of the run',
    items: [
      { kind: 'type', id: 'tall', typeId: 'BUDTALL', label: 'Standard' },
      { kind: 'type', id: 'fridge', typeId: 'FRIDGE', label: 'Fridge housing' },
      {
        kind: 'soon', id: 'basket-tall', label: 'Basket tall', hint: 'Wire baskets top to bottom', reason: NO_PATTERN,
      },
      {
        kind: 'soon', id: 'pantry', label: 'Pantry', hint: 'Shelved larder with door racks', reason: NO_PATTERN,
      },
      {
        kind: 'soon',
        id: 'pantry-worktop',
        label: 'Pantry on worktop',
        hint: 'The larder that stands on the counter',
        reason: NO_PATTERN,
      },
      {
        kind: 'soon', id: 'space-tower', label: 'Space tower', hint: 'The drawer larder', reason: NO_PATTERN,
      },
      {
        kind: 'soon',
        id: 'oven-tall',
        label: 'Oven tall',
        hint: 'Single or double appliance housing',
        reason: 'No kit defines the appliance aperture yet — the pattern comes first',
      },
      {
        kind: 'soon',
        id: 'american-fridge',
        label: 'American fridge',
        hint: 'Side-by-side housing',
        reason: 'The owner writes this pattern with the assistant first',
      },
    ],
  },
  {
    kind: 'group',
    id: 'wall-units',
    label: 'Wall units',
    hint: 'Hung above the worktop',
    items: [
      { kind: 'type', id: 'wall', typeId: 'WUD', label: 'Standard' },
      {
        kind: 'soon',
        id: 'glass-unit',
        label: 'Glass unit',
        hint: 'Glass shelves behind a glass front',
        reason: 'Glass is not a board — no kit defines the frame, the shelf fixing or the cut list yet',
      },
      {
        kind: 'soon', id: 'l-shape-wall', label: 'L-shape wall', hint: 'One carcass on two walls', reason: NO_PATTERN,
      },
    ],
  },
  {
    // ─── The new group (turn 15, CLAUDE.md F5.2) ───
    // Not cabinets: the pieces that FINISH a run. They belong in the library
    // because they are things a joiner adds, and they belong in their own group
    // because none of them is a carcass.
    kind: 'group',
    id: 'extras',
    label: 'Extras',
    hint: 'The pieces that finish a run',
    items: [
      {
        kind: 'soon',
        id: 'free-standing-panels',
        label: 'Free-standing panels',
        hint: 'A panel that belongs to the room, not to a cabinet',
        reason: 'End panels are per-cabinet today — a free-standing one needs its own owner in the model',
      },
      {
        kind: 'soon',
        id: 'cornice-pelmet',
        label: 'Cornice / pelmet',
        hint: 'One click adds the strip along a whole run',
        reason: 'Run-logic like the plinth is ready; the strip\'s own profile and cut pattern are not',
      },
    ],
  },
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
  if (!entry) {
    return {
      enabled: false, reason: null, label: null, hint: null, count: null,
    };
  }
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

/**
 * How many entries a group holds, and how many of them can actually be placed
 * today (turn 15, CLAUDE.md F5.2).
 *
 * The panel prints "3 of 12" on a group row, which is the honest version of a
 * long list with most of it held open — a joiner opening "Base units" can see
 * before he opens it that most of what is inside is coming rather than gone.
 */
export function groupCounts(group, profile) {
  const entries = flattenLibrary(group?.items || []);
  return {
    total: entries.length,
    enabled: entries.filter((e) => resolveEntry(e, profile).enabled).length,
  };
}
