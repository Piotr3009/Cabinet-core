// ─── THE VISIBILITY ENGINE (turn 44, CLAUDE.md F2 / iron rule 5) ────────────
//
// *"every tab, submodal and field carries `audience: 'factory' | 'both'`.
// App-level mode (header toggle, default `factory`, persisted) filters the
// tree. … One tree, one filter — never two parallel wizards."*
//
// That last sentence is the whole reason this file exists as DATA rather than
// as a scatter of `{mode === 'factory' && …}` in the surface. Two parallel
// wizards is what a component full of inline conditions becomes on the third
// change: one of them gets a new field and the other does not, and nobody finds
// out until a client is looking at the screen. Here the tree is one list, the
// filter is one function, and a new node is one row.
//
// Pure data and pure functions — no React, no store, no engine. `src/engine/**`
// is closed byte-for-byte tonight (iron rule 2), and this is UI law anyway: it
// decides what is DRAWN, never what is cut.
//
// ─── WHAT RETAIL SEES (iron rule 5, verbatim) ───────────────────────────────
//
//   "Retail sees: Ustawienia (read-only basics), material/colour pickers,
//    drawer choice, front type + opening + shine, hardware COLOUR only,
//    summary. Factory sees everything."
//
// Every `audience: 'both'` row below is one clause of that sentence, and there
// are no others. A node that is not in the map at all is FACTORY — the safe
// direction, because a field nobody classified is a workshop field until
// somebody says otherwise.

/** The two heads this app is read by. */
export const AUDIENCES = ['factory', 'retail'];

/** The one the app opens in. */
export const DEFAULT_AUDIENCE = 'factory';

/** Anything that is not the client's is the workshop's. */
export function normaliseAudience(raw) {
  return raw === 'retail' ? 'retail' : 'factory';
}

/**
 * The step-4 sequence, in the owner's own order and his own words:
 *
 *   1 Ustawienia → 2 Carcases → 3 Fronts → 4 Hardware → 5 Produkcja →
 *   6 Podsumowanie
 */
export const WIZARD_TABS = [
  {
    id: 'ustawienia', n: 1, label: 'Ustawienia', audience: 'both', hint: 'The job, its numbers and the set it starts from',
  },
  {
    id: 'carcases', n: 2, label: 'Carcases', audience: 'both', hint: 'How many carcass materials, and which',
  },
  {
    id: 'fronts', n: 3, label: 'Fronts', audience: 'both', hint: 'How many front colours, the shape, the opening and the shine',
  },
  {
    id: 'hardware', n: 4, label: 'Hardware', audience: 'both', hint: 'Hinges, runners, metals',
  },
  {
    id: 'produkcja', n: 5, label: 'Produkcja', audience: 'factory', hint: 'The workshop’s own numbers — never the client’s',
  },
  {
    id: 'podsumowanie', n: 6, label: 'Podsumowanie', audience: 'both', hint: 'Everything chosen, in one place',
  },
];

/**
 * EVERY node the sequence renders, with the tab it lives in and who may see it.
 *
 * A node is a tab section, a submodal or a single field — whatever the surface
 * can decide to draw or not draw. The id is the `data-wizard-node` stamped on
 * it, so the DOM audit (F2's test) can walk the rendered page and compare it
 * against this table without the component being asked to confess anything.
 */
export const WIZARD_NODES = [
  // ── 1 · Ustawienia — the read-only basics are the client's; the rest is not ──
  { id: 'ustawienia.identity', tab: 'ustawienia', audience: 'both' },
  { id: 'ustawienia.sets', tab: 'ustawienia', audience: 'factory' },
  { id: 'ustawienia.dimensions', tab: 'ustawienia', audience: 'both' },
  { id: 'ustawienia.kitchen-heights', tab: 'ustawienia', audience: 'both' },
  { id: 'ustawienia.ceiling', tab: 'ustawienia', audience: 'both' },

  // ── 2 · Carcases — the picker is the client's, the board and the CNC are not ──
  { id: 'carcases.count', tab: 'carcases', audience: 'both' },
  { id: 'carcases.picker', tab: 'carcases', audience: 'both' },
  { id: 'carcases.drawers', tab: 'carcases', audience: 'both' },
  { id: 'carcases.stock-board', tab: 'carcases', audience: 'factory' },
  { id: 'carcases.sheets', tab: 'carcases', audience: 'factory' },
  { id: 'carcases.cnc-corner', tab: 'carcases', audience: 'factory' },
  { id: 'carcases.joinery', tab: 'carcases', audience: 'factory' },
  { id: 'carcases.thickness-note', tab: 'carcases', audience: 'factory' },
  { id: 'carcases.chosen', tab: 'carcases', audience: 'both' },

  // ── 3 · Fronts — shape, opening and shine are exactly what a client picks ──
  { id: 'fronts.count', tab: 'fronts', audience: 'both' },
  { id: 'fronts.picker', tab: 'fronts', audience: 'both' },
  { id: 'fronts.style', tab: 'fronts', audience: 'both' },
  { id: 'fronts.opening', tab: 'fronts', audience: 'both' },
  { id: 'fronts.shine', tab: 'fronts', audience: 'both' },
  { id: 'fronts.shaker-frame', tab: 'fronts', audience: 'factory' },
  { id: 'fronts.door-styles', tab: 'fronts', audience: 'factory' },
  { id: 'fronts.run-materials', tab: 'fronts', audience: 'factory' },
  { id: 'fronts.chosen', tab: 'fronts', audience: 'both' },

  // ── 4 · Hardware — "retail sees ONLY colour" ──
  { id: 'hardware.colour', tab: 'hardware', audience: 'both' },
  { id: 'hardware.choices', tab: 'hardware', audience: 'factory' },
  { id: 'hardware.hinge-standard', tab: 'hardware', audience: 'factory' },
  { id: 'hardware.hinge-system', tab: 'hardware', audience: 'factory' },
  { id: 'hardware.hinge-plate-pilot', tab: 'hardware', audience: 'factory' },
  { id: 'hardware.shelf-sleeve', tab: 'hardware', audience: 'factory' },
  { id: 'hardware.runners', tab: 'hardware', audience: 'factory' },

  // ── 5 · Produkcja — the whole tab is the workshop's ──
  { id: 'produkcja.infill', tab: 'produkcja', audience: 'factory' },
  { id: 'produkcja.per-material', tab: 'produkcja', audience: 'factory' },
  { id: 'produkcja.box-gate', tab: 'produkcja', audience: 'factory' },

  // ── 6 · Podsumowanie — the summary itself is both; it filters its own rows ──
  { id: 'podsumowanie.summary', tab: 'podsumowanie', audience: 'both' },
  { id: 'podsumowanie.save-set', tab: 'podsumowanie', audience: 'factory' },
];

const NODE_BY_ID = new Map(WIZARD_NODES.map((n) => [n.id, n]));
const TAB_BY_ID = new Map(WIZARD_TABS.map((t) => [t.id, t]));

/** A row's audience — and FACTORY for anything nobody has classified. */
export function nodeAudience(id) {
  return NODE_BY_ID.get(id)?.audience || 'factory';
}

/** May this head see this node? */
export function nodeVisible(id, audience) {
  const who = normaliseAudience(audience);
  if (who === 'factory') return true;
  return nodeAudience(id) === 'both';
}

/** May this head see this tab? */
export function tabVisible(id, audience) {
  const who = normaliseAudience(audience);
  if (who === 'factory') return true;
  return (TAB_BY_ID.get(id)?.audience || 'factory') === 'both';
}

/** The tabs this head is shown, in order, renumbered so 1…N has no holes. */
export function visibleTabs(audience) {
  return WIZARD_TABS
    .filter((t) => tabVisible(t.id, audience))
    .map((t, i) => ({ ...t, n: i + 1 }));
}

/** Every node of one tab this head may see. */
export function visibleNodes(tabId, audience) {
  return WIZARD_NODES.filter((n) => n.tab === tabId && nodeVisible(n.id, audience));
}

/** Every node this head may NOT see — what a DOM audit expects to find zero of. */
export function hiddenNodes(audience) {
  return WIZARD_NODES.filter((n) => !nodeVisible(n.id, audience)).map((n) => n.id);
}

/** The tab after this one, for this head — null at the end of the sequence. */
export function tabAfter(id, audience) {
  const list = visibleTabs(audience);
  const i = list.findIndex((t) => t.id === id);
  return i >= 0 && i < list.length - 1 ? list[i + 1].id : null;
}

/** …and the one before it. */
export function tabBefore(id, audience) {
  const list = visibleTabs(audience);
  const i = list.findIndex((t) => t.id === id);
  return i > 0 ? list[i - 1].id : null;
}

/** Where a tab stands in this head's sequence, 0-based; −1 when it is hidden.
 *  (Named `tabPosition` and not `tabIndex`: the DOM attribute of that name is
 *  used all over this app, and an export that shadows one is a grep landmine.) */
export function tabPosition(id, audience) {
  return visibleTabs(audience).findIndex((t) => t.id === id);
}

/** The first tab of the sequence — where the step opens. */
export function firstTab(audience) {
  return visibleTabs(audience)[0]?.id || WIZARD_TABS[0].id;
}

// ─── KITCHEN-ONLY DIMENSIONS (CLAUDE.md F3) ─────────────────────────────────
//
// *"Base unit height / Wall unit height / Wall mount height: rendered ONLY when
// project type is Kitchen — wardrobe never sees them."*
//
// A wardrobe has no wall units, so three fields that can only ever be answered
// "not applicable" were three fields the eye had to skip. The list is here
// rather than in the component because F3's test asks the RULE, not the JSX.

export const KITCHEN_ONLY_DIMENSIONS = ['base', 'wall', 'wallMount'];

/** Is this dimension asked of this project type at all? */
export function dimensionAsked(key, projectType) {
  if (!KITCHEN_ONLY_DIMENSIONS.includes(key)) return true;
  return projectType === 'kitchen';
}

/** The dimension keys a project type is asked, out of a list of rows. */
export function dimensionsFor(rows, projectType) {
  return (rows || []).filter((d) => dimensionAsked(d.key, projectType));
}

// ─── THE OWNER'S BAKED-IN DEFAULTS (CLAUDE.md "Owner-overridable defaults") ──
//
// *"(1) depth default stays 568; … (4) opening options are exactly
// push-to-open / handles / knobs / J-handle."* Both are LAW for the night, and
// both are read from here so the surface states neither.

/** The wardrobe depth the step opens at, and the sentence that says why. */
export const WARDROBE_DEPTH_MM = 568;

/** The height and plinth this turn's step-4 opens a wardrobe at (F3). */
export const T44_DEFAULTS = { height: 2100, plinth: 100, depth: WARDROBE_DEPTH_MM };

/**
 * How big an Egger tile's swatch is, at the smallest (F4).
 *
 * *"LARGE Egger tiles (min 96 px swatch, name in full-size type)"* — the
 * owner's floor, stated once and read by the picker, so a future column-count
 * tweak cannot quietly shrink it back to the 40 px thumbnail he rejected.
 */
export const TILE_SWATCH_PX = 96;
