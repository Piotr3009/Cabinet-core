import { useUiStore } from '../stores/uiStore.js';
import { CHECKS, checkSummary } from '../engine/checks.js';
import { LAYER_CLASS } from '../lib/modalLayer.js';
import { anchorOfEvent } from '../lib/modalAnchor.js';
// ─── TURN 38 (CLAUDE.md F1a): AND IT IS READ FRESH ─────────────────────────
// The list used to be memoised here on `[units, design, runChecks]`, which
// left every rule that reads the PROFILE (the hinge ladders themselves), the
// ROOM or the MATERIAL assignments printing an answer that no longer existed
// until something else touched `units` — the owner's "reports a collision
// where no hinge is any more, and a reload clears it". `lib/checkFindings.js`
// owns the dependency list now, and the canvas toolbar's badge reads the same
// one, so the two surfaces cannot disagree about what the job's faults are.
import { useCheckFindings } from '../lib/checkFindings.js';

// ─── CHECK v1's PANEL (turn 31, CLAUDE.md F6) ───────────────────────────────
//
// "Result = a PANEL of findings (not toasts): click → camera flies to the
// subject and the right editor opens (the F7/T30 mechanism)."
//
// NOT TOASTS is the whole design. Eleven rules over a kitchen produce thirty
// findings on a bad day, and thirty things a joiner has to act on is a LIST —
// one he works down, clicks into, and comes back to. F2's message levels are
// for things that happen TO him; this is for work he has to do.
//
// ─── A ROW IS A DOOR ────────────────────────────────────────────────────────
//
// Every finding carries a `subject` — a unit, a panel and which editor opens
// it — so this component needs no branch per rule: it flies the camera to the
// piece and opens the window, which is the mechanism turn 30's F7 built for
// the shelf/hinge clash and which every rule now inherits.
//
// A finding that cannot name a subject (a whole-cabinet fault, a run) opens
// the CABINET, and a finding that can name two — the shelf/hinge clash offers
// "move the shelf" and "move the hinge" — carries the second as `alternative`
// and shows it beside the first, exactly as turn 30's own prompt did.

const TONE = {
  red: 'border-status-danger/60 text-status-danger',
  yellow: 'border-status-warn/60 text-status-warn',
};

export default function CheckPanel() {
  const selectUnit = useUiStore((s) => s.selectUnit);
  const selectElement = useUiStore((s) => s.selectElement);
  const openModal = useUiStore((s) => s.openModal);
  const setCheckOpen = useUiStore((s) => s.setCheckOpen);

  const findings = useCheckFindings();
  const summary = checkSummary(findings);

  /** The F7/T30 mechanism: select the piece — which is what flies the camera —
   *  and open the editor the finding names. */
  const goTo = (subject, e) => {
    if (!subject?.unitId) return;
    if (subject.panelId) selectElement(subject.unitId, subject.panelId);
    else selectUnit(subject.unitId);
    const editor = subject.editor || 'cabinet';
    openModal(editor, {
      unitId: subject.unitId,
      panelId: subject.panelId || undefined,
      ...(subject.section ? { section: subject.section } : {}),
      ...(subject.hingeIndex != null ? { hingeIndex: subject.hingeIndex } : {}),
      anchor: anchorOfEvent(e),
    });
  };

  return (
    <aside
      className={`absolute right-0 top-0 bottom-0 w-[380px] cc-panel rounded-none border-y-0 border-r-0
        ${LAYER_CLASS.panel} flex flex-col`}
      data-check-panel={findings.length}
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b border-shell-600">
        <span className="text-sm text-ink-50">Check</span>
        <span className="cc-tag" data-check-summary>{summary}</span>
        <span className="flex-1" />
        <button type="button" className="cc-btn-ghost" title="Close" onClick={() => setCheckOpen(false)}>×</button>
      </div>

      {!findings.length ? (
        <p className="p-3 text-sm text-ink-400" data-check-clean="1">
          Eleven rules, nothing to fix. The job is ready to cut.
        </p>
      ) : (
        <ul className="flex-1 overflow-y-auto cc-scroll p-2 space-y-1.5">
          {findings.map((f, i) => (
            <li
              // eslint-disable-next-line react/no-array-index-key
              key={`${f.check}-${f.unitId}-${f.panelId}-${i}`}
              className={`rounded border bg-shell-800/70 ${TONE[f.level] || TONE.yellow}`}
              data-check-finding={f.check}
              data-check-level={f.level}
            >
              <button
                type="button"
                className="w-full text-left px-2 py-1.5 hover:bg-shell-700 rounded disabled:cursor-default"
                data-check-goto={f.subject ? '1' : '0'}
                disabled={!f.subject}
                title={f.subject ? 'Fly to it and open its editor' : 'Nothing to fly to'}
                onClick={(e) => goTo(f.subject, e)}
              >
                <span className="block text-[10px] uppercase tracking-wide opacity-70">
                  #{f.check} · {CHECKS.find((c) => c.n === f.check)?.label || ''}
                </span>
                <span className="block text-[11px] leading-snug text-ink-100">{f.message}</span>
              </button>
              {f.alternative && (
                <div className="px-2 pb-1.5">
                  <button
                    type="button"
                    className="cc-btn px-2 text-[11px]"
                    data-check-alternative={f.check}
                    onClick={(e) => goTo(f.alternative, e)}
                  >
                    {f.alternative.label || 'The other side of it'}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="px-3 py-2 border-t border-shell-600 text-[11px] text-ink-400">
        Nothing here blocks anything. The one hold-out in the app is the export
        gate’s, and it carries “Export anyway”.
      </p>
    </aside>
  );
}
