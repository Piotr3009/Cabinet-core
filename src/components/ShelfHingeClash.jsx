import { useProjectStore } from '../stores/projectStore.js';
import { useUiStore } from '../stores/uiStore.js';
import { anchorOfEvent } from '../lib/modalAnchor.js';

// ─── A SHELF AND A HINGE AT THE SAME HEIGHT (turn 30, CLAUDE.md F7) ─────────
//
// The owner's case: a shelf row and a hinge cup land level with each other and
// the cabinet is cut anyway. Two things go wrong at once on the same board —
// the shelf's own ⌀7.5 sleeve cluster reaches into the circle the cup occupies,
// and the shelf's front edge stands where the arm swings.
//
// ─── IT ASKS. IT DOES NOT FIX ───────────────────────────────────────────────
//
// CLAUDE.md is explicit: "show a conflict prompt: **Remove sleeves at this
// shelf** / **Move the hinge**. The choice OPENS the matching editor … **No
// silent auto-fix.**"
//
// So neither button changes anything. Each one opens the window where the
// decision actually belongs, on the very row that is in conflict:
//
//   REMOVE SLEEVES   the SHELF's own modal — where its TYPE lives, and a FIX
//                    shelf has no sleeve cluster at all (turn 24 F7: "jak fix,
//                    to nie ma 3 poziomów 7,5"). That is the fix a joiner
//                    makes, and he makes it, not us.
//   MOVE THE HINGE   F2's Door window, scrolled to section B with THAT hinge's
//                    row wearing the gold ring — the same modal, the same
//                    section and the same `hingeIndex` a double-click on the
//                    ironmongery opens.
//
// The window it is measured against is DERIVED from the geometry
// (`engine/shelfHingeClash.js`) and the sentence says the number, because a
// warning that will not say how near is too near is a warning nobody can argue
// with.

/**
 * @param {object} props
 *   unitId   the cabinet to report on
 *   compact  one line each, for a modal
 */
export default function ShelfHingeClash({ unitId, compact = false }) {
  const unitResult = useProjectStore((s) => s.unitResult);
  const openModal = useUiStore((s) => s.openModal);
  const result = unitId ? unitResult(unitId) : null;
  const rows = result?.clashes || [];
  if (!rows.length) return null;

  return (
    <ul className={compact ? 'space-y-1' : 'space-y-1.5 mt-2'} data-shelf-hinge-clash={rows.length}>
      {rows.map((c) => (
        <li
          key={`${c.shelfY}-${c.hingeIndex}`}
          data-clash-gap={c.gapMm}
          className="rounded border border-status-warn/50 p-1.5 space-y-1"
        >
          <div className="flex items-start gap-1.5 text-[11px] text-status-warn leading-snug">
            <span aria-hidden className="shrink-0">▲</span>
            <span>{c.message}</span>
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            <button
              type="button"
              className="cc-btn px-2 text-[11px]"
              data-clash-remove-sleeves={c.shelfPanelId || ''}
              disabled={!c.shelfPanelId}
              title="Open this shelf — a FIX shelf takes no sleeves at all, which is the joint that clears the hinge"
              onClick={(e) => openModal('element', {
                unitId, panelId: c.shelfPanelId, anchor: anchorOfEvent(e),
              })}
            >
              Remove sleeves at this shelf
            </button>
            <button
              type="button"
              className="cc-btn px-2 text-[11px]"
              data-clash-move-hinge={c.hingeIndex}
              disabled={!c.doorPanelId}
              title="Open the door’s own window at its hinges, on this row"
              onClick={(e) => openModal('element', {
                unitId,
                panelId: c.doorPanelId,
                hingeIndex: c.hingeIndex,
                section: 'hinges',
                anchor: anchorOfEvent(e),
              })}
            >
              Move the hinge
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
