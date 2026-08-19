import { useProjectStore } from '../stores/projectStore.js';
import { useCabinetProfileStore } from '../stores/cabinetProfileStore.js';
// ─── TURN 40 (CLAUDE.md F4a): ONE DEFINITION, TWO RENDERERS ────────────────
// The fault, its wording and its BUTTONS are `engine/checks.js`'s; this
// component draws them and owns no label of its own. `useGoToSubject` is the
// same four-step gesture the Check panel uses, so the two windows behave
// identically as well as reading identically.
import { shelfHingeFindings } from '../engine/checks.js';
import { useGoToSubject } from '../lib/checkFindings.js';

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
  const profile = useCabinetProfileStore((s) => s.profile);
  const units = useProjectStore((s) => s.units);
  const goTo = useGoToSubject();
  const result = unitId ? unitResult(unitId) : null;
  const unitNum = units.find((u) => u.id === unitId)?.params?.unit_num || result?.unitNum || '';
  // THE SAME DEFINITION the Check panel prints — the same sentence and the same
  // buttons, which is exactly what the owner asked for: *"raczej powinny się
  // pokazywać i tu i tu"*.
  const rows = result ? shelfHingeFindings({ unitId, unitNum, result, profile }) : [];
  if (!rows.length) return null;

  return (
    <ul className={compact ? 'space-y-1' : 'space-y-1.5 mt-2'} data-shelf-hinge-clash={rows.length}>
      {rows.map((f) => (
        <li
          key={`${f.shelfY}-${f.hingeY}`}
          data-clash-gap={Math.round(Math.abs(f.hingeY - f.shelfY) * 100) / 100}
          className="rounded border border-status-warn/50 p-1.5 space-y-1"
        >
          <div className="flex items-start gap-1.5 text-[11px] text-status-warn leading-snug">
            <span aria-hidden className="shrink-0">▲</span>
            <span>{f.message}</span>
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            {f.actions.map((a) => (
              <button
                key={a.id}
                type="button"
                className="cc-btn px-2 text-[11px]"
                data-check-action={a.id}
                // The two `data-` hooks turn 30 shipped, kept so every gesture
                // that worked yesterday still finds its button.
                data-clash-remove-sleeves={a.id === 'remove-sleeves' ? (a.subject.panelId || '') : undefined}
                data-clash-move-hinge={a.id === 'move-hinge' ? a.subject.hingeIndex : undefined}
                title={a.title || ''}
                onClick={(e) => goTo(a.subject, e)}
              >
                {a.label}
              </button>
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}
