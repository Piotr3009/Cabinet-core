import KitMenu from './KitMenu.jsx';

// ─── T61 F4 · THE TROUSER PULL-OUT ─────────────────────────────────────────
//
// PRO HAS NO EDITOR FOR THIS. Its entire surface is one Add button in
// `components/AddItems.jsx` (plus a column chip when the cabinet is divided):
// a kit is not a panel, `elementKind` has no case for it, `3d/Hardware.jsx`
// `KitBodies` draws it with no click handler, there is no `kit` modal, and
// `RightPanel` carries no remove for it. So there is nothing to read across
// and nothing to carry over — and this menu is therefore AHEAD of PRO, exactly
// as `PulldownMenu`'s REMOVE already is. Said plainly in the PR body.
//
// Which means the honest menu is the smallest one: what was bought, in the
// shared core's own terms, and REMOVE. There is no position field, because the
// profile's `posMm` is a workshop default that only the pull-down exposes, and
// a second one would be the invented field the rule forbids.

export default function TrouserMenu({
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
      kind="trouser"
      onBack={onBack}
      onDone={onDone}
      onRemoved={onRemoved}
    />
  );
}
