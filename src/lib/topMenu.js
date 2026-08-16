// ─── The top menu, as DATA (turn 11, CLAUDE.md F7) ──────────────────────────
//
// Piotr's order: File · View · Library · Settings · Database · Spraying ·
// Output — with Output at the END, because it is what LEAVES the app and a
// joiner reaches for it last, and with Database gaining a dropdown of its own
// (Materials, Clients, Projects).
//
// It is a REORDER and not a cull: every item that was reachable before is
// reachable now. "Clients" was a top-level menu of its own and is a Database
// entry; nothing else moved house.
//
// The SHAPE is here rather than inside the component for the reason CLAUDE.md
// gives in the same breath — "if the owner later decides Settings moves, it is a
// one-line data change". A node test can look at this; nobody can look at a JSX
// literal inside a header that has to be mounted to exist.

/** The order Piotr asked for, top to bottom of the bar, left to right. */
// ─── TURN 33 (CLAUDE.md F1): LIGHTING, BEFORE OUTPUT ────────────────────────
// The owner's placement, in as many words: "a Lighting button in the top menu,
// placed BEFORE Output." It is a BUTTON and not a dropdown — it opens the
// Lighting panel beside itself — which MenuBar's data grammar carries as a
// top-level entry with `run` and no `items`.
export const MENU_ORDER = ['File', 'View', 'Library', 'Settings', 'Database', 'Spraying', 'Lighting', 'Output'];

/**
 * Put the menus in the owner's order.
 *
 * Anything the caller supplies that is NOT in `MENU_ORDER` keeps its own place
 * at the end rather than being dropped: this function orders menus, it does not
 * decide which menus exist, and a menu that fell off the bar because somebody
 * renamed it would be exactly the cull this phase is not.
 *
 * @param {Array<{label:string}>} menus
 * @returns {Array} the same objects, reordered
 */
export function orderMenus(menus = []) {
  const rank = (m) => {
    const i = MENU_ORDER.indexOf(m?.label);
    return i === -1 ? MENU_ORDER.length : i;
  };
  return [...menus]
    .map((m, i) => ({ m, i }))
    // Stable: two menus with the same rank keep the order they arrived in.
    .sort((a, b) => rank(a.m) - rank(b.m) || a.i - b.i)
    .map(({ m }) => m);
}

/**
 * The Database menu (turn 11, CLAUDE.md F7).
 *
 * Three entries, and each one is enabled only where there is something behind
 * it. `Materials` is real — the assignment store is what Design Settings and the
 * BOM already read — and `Clients` and `Projects` are the JoineryCore halves,
 * held open with a "soon" badge in exactly the state the rest of the app's mock
 * mode is in. A menu entry that opened a half-answer would be worse than one
 * that says "not yet" (turn 4's reasoning, unchanged).
 *
 * @param {object} handlers  { onMaterials, onClients, onProjects }
 */
export function buildDatabaseMenu({
  onMaterials = null, onClients = null, onProjects = null, onCompanyDefaults = null,
} = {}) {
  return {
    label: 'Database',
    items: [
      {
        label: 'Materials…',
        hint: 'The boards and hardware this workshop buys — what a cut list is costed against',
        disabled: !onMaterials,
        soon: !onMaterials,
        run: (e) => onMaterials?.(e),
      },
      // ─── Turn 22 (CLAUDE.md F2b.2 / F3) ───
      // The storey between the code and the project: what this workshop fits
      // when nobody has said otherwise, and — at the bottom of the same screen
      // — what the app is actually working from (the hardware health line, so
      // the owner never opens DevTools for it again).
      {
        label: 'Company defaults…',
        hint: 'Hinges, plates, runners and boards this workshop fits — every new project starts here',
        disabled: !onCompanyDefaults,
        soon: !onCompanyDefaults,
        run: (e) => onCompanyDefaults?.(e),
      },
      {
        label: 'Clients…',
        hint: 'JoineryCore clients — a later phase',
        disabled: !onClients,
        soon: !onClients,
        run: (e) => onClients?.(e),
      },
      {
        label: 'Projects…',
        hint: 'Everything saved, and the recent jobs',
        disabled: !onProjects,
        soon: !onProjects,
        run: (e) => onProjects?.(e),
      },
    ],
  };
}
