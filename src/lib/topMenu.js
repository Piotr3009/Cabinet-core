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
// ─── T-CC1b F3 and F4: LIBRARY AND DATABASE LEAVE THE BAR ────────────────────
// The owner, 01.11.2026: *"Database niepotrzebne, wszystko jest w JC, Assign
// materials juz jest po lewej"*; *"Library powinno byc po lewej"*. The rail's
// Add is the Library's one door; Company defaults is a Settings entry.
export const MENU_ORDER = ['File', 'View', 'Settings', 'Spraying', 'Lighting', 'Output'];

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

// T-CC1b F3 · the Database menu's builder is deleted: *"Database niepotrzebne, wszystko jest w JC"* (the owner, 01.11.2026).
// Its homes: Company defaults in Settings; Assign materials and Stock on the rail's Materials.

// ─── T-CC1b F1 · THE WORDS OF THE JOB BLOCK AND THE WAY BACK ───────────────
/** The label of the way back, the same on the Studio bar and the start screen. */
export const BACK_TO_JC_LABEL = 'Back to Joinery Core';
/** Where the way back goes: Joinery Core's dashboard. */
export const JC_DASHBOARD = '/dashboard.html';

/**
 * Line two of the job block (CLAUDE.md T-CC1b F1.1): `<number> · <JC project name> · <client>`.
 * When the project's name is unknown (F1.3) the block shows the number alone.
 */
export function jobProjectLine(project) {
  const said = (v) => (v == null ? '' : String(v).trim());
  const number = said(project?.number);
  const name = said(project?.jcProjectName);
  if (!name) return number;
  return [number, name, said(project?.client)].filter(Boolean).join(' · ');
}

/** The browser leaves Cabinet Core for Joinery Core's dashboard. */
export function goToJoineryCore(location = globalThis.location) {
  location?.assign?.(JC_DASHBOARD);
}
