import { useMemo, useState } from 'react';
import Modal from './Modal.jsx';
import { useProjectStore } from '../stores/projectStore.js';
import { useHistoryStore } from '../stores/historyStore.js';
import { useUiStore } from '../stores/uiStore.js';

// ─── "THIS PART CARRIES MANUAL EDITS" (turn 23, CLAUDE.md F9.3) ─────────────
//
// "When a recompute changes that part's geometry (resize etc.), the app ASKS:
// 'this part carries manual edits — recompute drops them, continue?' — the
// owner chooses."
//
// THE SAFETY IS ALREADY DONE, and it is done where it cannot be argued with:
// `engine/partEdits.js` refuses to apply an override whose board no longer
// matches the signature it was drawn on. So a 2400 back that becomes an 1800
// back exports STOCK — never a hole 2300 mm up an 1800 mm board — whatever
// anybody clicks here. This window is the COURTESY half: the owner is told, and
// he decides which way to go.
//
// Two answers, and both are honest:
//
//   KEEP THE NEW SIZE   the edits are dropped, by his word. The part goes back
//                       to computed and the print is stock again.
//   PUT IT BACK         one step of the app's own undo (turn 12's history),
//                       which is what returns the board to the size the edits
//                       were drawn on. Nothing special: the same Ctrl+Z.
//
// It cannot be dismissed into silence: closing it leaves the edits stale and
// unapplied, and the window comes back the moment anything recomputes — which
// is the right behaviour for a part that is quietly not what its print says.

export default function HandEditsModal() {
  const units = useProjectStore((s) => s.units);
  const design = useProjectStore((s) => s.project.design);
  const unitResult = useProjectStore((s) => s.unitResult);
  const clearPartEdits = useProjectStore((s) => s.clearPartEdits);
  const undo = useHistoryStore((s) => s.undo);
  const canUndo = useHistoryStore((s) => s.canUndo);
  const notify = useUiStore((s) => s.notify);
  // Dismissed for THIS shape of problem. A different part going stale is a
  // different question and asks itself again.
  const [dismissed, setDismissed] = useState('');

  // Recomputed only when the units or the project's design actually change —
  // this walks every unit through the engine, and doing that on every render of
  // the page would be a frame rate spent on a question nobody has asked.
  const stale = useMemo(() => units.flatMap((u) => {
    if (!u.params?.part_edits) return [];
    const rows = unitResult(u.id)?.handEdits?.stale || [];
    return rows.map((row) => ({ ...row, unitId: u.id, unitNum: u.params.unit_num }));
  }), [units, design, unitResult]);

  const key = stale.map((r) => `${r.unitId}:${r.panelId}:${r.now}`).join(',');
  if (!stale.length || key === dismissed) return null;

  const total = stale.reduce((n, r) => n + r.count, 0);

  return (
    <Modal
      name="hand-edits"
      title="This part carries manual edits"
      onClose={() => setDismissed(key)}
      width="w-[460px]"
      footer={(
        <>
          <span className="text-[11px] text-ink-400 flex-1 text-left">
            Until you choose, the edits are not applied — the export is stock.
          </span>
          {canUndo() && (
            <button
              type="button"
              className="cc-btn"
              data-hand-edits-undo="1"
              onClick={() => { undo(); setDismissed(''); }}
            >
              Put the size back
            </button>
          )}
          <button
            type="button"
            className="cc-btn-gold"
            data-hand-edits-drop="1"
            onClick={() => {
              for (const row of stale) clearPartEdits(row.unitId, row.panelId);
              setDismissed('');
              notify(`${total} manual change${total === 1 ? '' : 's'} dropped — the part is stock again.`, 'ok');
            }}
          >
            Continue — drop them
          </button>
        </>
      )}
    >
      <div className="space-y-2 text-sm text-ink-200" data-hand-edits="1">
        <p>
          A recompute has changed the size of {stale.length === 1 ? 'a part' : `${stale.length} parts`} you
          had drawn on by hand. Every set-out on {stale.length === 1 ? 'it' : 'them'} was measured on the
          old board, so it cannot be carried across.
        </p>
        <ul className="space-y-1 text-[12px] text-ink-400">
          {stale.map((row) => (
            <li key={`${row.unitId}:${row.panelId}`} className="flex gap-2">
              <span className="text-ink-100">{row.unitNum} · {row.panelId}</span>
              <span className="tabular-nums">{row.was} → {row.now}</span>
              <span className="flex-1 text-right">
                {row.count} change{row.count === 1 ? '' : 's'}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  );
}
