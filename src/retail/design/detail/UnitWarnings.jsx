import { useProjectStore } from '../../../stores/projectStore.js';
// The list lives in the engine beside the codes it names, so a rename cannot
// quietly stop a warning reaching this modal (turn 25, CLAUDE.md F10).
import { DRAWER_WARNING_CODES } from '../../../engine/drawerBox.js';

export { DRAWER_WARNING_CODES };

// ─── SILENT CLAMPING ENDS HERE (turn 25, CLAUDE.md F10) ─────────────────────
//
// "When the fronts do not fit the opening, or a front is too shallow for a sane
// box, the app says so — a YELLOW WARNING on the unit and in the drawer modal,
// naming the number. It does NOT block; the owner wants to see it in practice
// first."
//
// The engine has clamped quietly in half a dozen places for twenty-four turns —
// a front under the runner minimum is raised, a stack that does not add up has
// its last free drawer absorb the drift, a box side that will not clear the top
// panel is cut short — and every one of those was the right answer to a bad
// number that never reached a person. `result.warnings` has carried them the
// whole time. This is the reading that shows them.
//
// It is ONE component and it is used in both places CLAUDE.md names, so a
// warning cannot appear on the unit and not in the modal.
//
// ─── IT DOES NOT BLOCK ──────────────────────────────────────────────────────
//
// No dialog, no disabled button, no refusal to compute. The cabinet is cut as
// asked and the app says what it found — which is the same grammar F3's shaker
// frame uses and, in the end, the same grammar as a joiner's own eye.

/**
 * @param {object} props
 *   unitId  the cabinet whose warnings to show
 *   only    optional list of codes — the drawer modal shows the drawer's own
 *   compact one line each, for a modal
 */
export default function UnitWarnings({ unitId, only = null, compact = false }) {
  const unitResult = useProjectStore((s) => s.unitResult);
  const result = unitId ? unitResult(unitId) : null;
  const wanted = only ? new Set(only) : null;
  const rows = (result?.warnings || []).filter((w) => !wanted || wanted.has(w.code));
  if (!rows.length) return null;
  return (
    <ul className={compact ? 'pbi-re-stack-05' : 'pbi-re-stack-1 pbi-re-mt2'} data-unit-warnings={rows.length}>
      {rows.map((w, i) => (
        <li
          // eslint-disable-next-line react/no-array-index-key
          key={`${w.code}-${i}`}
          data-warning-code={w.code}
          className="pbi-re-row pbi-re-top pbi-re-gap-15 pbi-re-t11 pbi-re-warn pbi-re-lead-snug"
        >
          {/* A triangle rather than an icon font: it reads at 11 px and it is
              the shape everybody already means by "look at this". */}
          <span aria-hidden className="pbi-re-nogrow">▲</span>
          <span>{w.message}</span>
        </li>
      ))}
    </ul>
  );
}

