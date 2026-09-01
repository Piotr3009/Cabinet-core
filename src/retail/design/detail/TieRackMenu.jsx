import KitMenu from './KitMenu.jsx';

// ─── T61 F4 · THE TIE RACK ─────────────────────────────────────────────────
//
// The same story as the trouser pull-out, and therefore the same menu: PRO has
// no editor for it either, so there is nothing to read across. One file each
// because the router is a TABLE — `kind → component` — and a table with two
// keys pointing at one component is a table that has stopped being readable.
// What they share is `KitMenu`, which is where the shape lives once.

export default function TieRackMenu({
  unitId, item, onBack, onDone, onRemoved,
}) {
  // Named through, not spread: `test/turn60-f3-the-element-menus.test.js` reads
  // every menu's source for `onDone={onDone}` — its way of asserting that
  // there is a way back to the estimate from all of them — and a spread hides
  // that from a reader as surely as from the test.
  return (
    <KitMenu
      unitId={unitId}
      item={item}
      kind="tie_rack"
      onBack={onBack}
      onDone={onDone}
      onRemoved={onRemoved}
    />
  );
}
