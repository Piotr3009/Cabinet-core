import WardrobeMenu from './WardrobeMenu.jsx';
import DoorMenu from './DoorMenu.jsx';
import ShelfMenu from './ShelfMenu.jsx';
import DrawersMenu from './DrawersMenu.jsx';
import RailMenu from './RailMenu.jsx';
import WatchMenu from './WatchMenu.jsx';
import ShoeMenu from './ShoeMenu.jsx';
import PulldownMenu from './PulldownMenu.jsx';
import LightingMenu from './LightingMenu.jsx';
// T61 F4 · the four the INTERIOR list grew, because an element with no menu is
// not clickable and a row that adds one of those adds nothing a client can then
// change. `KitMenu` is the shape the two bought mechanisms share and is NOT in
// the table: a table with two keys pointing at one component has stopped being
// readable, so each kit has its own one-line file naming its own kind.
import OverlayMenu from './OverlayMenu.jsx';
import PartitionMenu from './PartitionMenu.jsx';
import TrouserMenu from './TrouserMenu.jsx';
import TieRackMenu from './TieRackMenu.jsx';

// ─── T60 F3 · THE ROUTER IS A TABLE ────────────────────────────────────────
//
// *"The router is a table (`kind → component`), so an unmapped kind cannot
// render an empty panel — it is not selectable in the first place."*
//
// Which is why this is nine entries and not a switch with a default branch. A
// default branch is where "No options for this element yet" lived, and the
// reason it could exist at all: a `switch` invites one. A table does not — a
// kind that is not a key here has no menu, `adapter.resolveSelection` returns
// null for it, and `DesignRoom` clears the selection rather than opening
// anything. The string is DELETED under this turn's one licence and the shape
// of this file is what stops it coming back in another wording.
//
// The left-hand side is `adapter.MENU_FOR_KIND`'s vocabulary, which is the
// ENGINE's own (`engine/elements.js elementKind`) plus the three things the
// engine does not cut a board for — the rod, the pull-down and the two fitted
// drawers.

const MENU_COMPONENTS = Object.freeze({
  wardrobe: WardrobeMenu,
  door: DoorMenu,
  shelf: ShelfMenu,
  drawers: DrawersMenu,
  rail: RailMenu,
  watch: WatchMenu,
  shoe: ShoeMenu,
  pulldown: PulldownMenu,
  lighting: LightingMenu,
  overlay: OverlayMenu,
  partition: PartitionMenu,
  trouser: TrouserMenu,
  tie_rack: TieRackMenu,
});

/** The component for a resolved selection, or null — which is never rendered. */
export const menuFor = (name) => MENU_COMPONENTS[name] || null;

// The names the table holds are asserted against `adapter.MENUS` in
// `test/turn60-f3-the-element-menus.test.js` — read off this file's own source,
// because node cannot import a `.jsx` and a router shaped by its test would be
// a router with an export nobody calls.
