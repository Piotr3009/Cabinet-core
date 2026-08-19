import { useUiStore } from '../stores/uiStore.js';
import { CHECKS, checkSummary } from '../engine/checks.js';
import { LAYER_CLASS } from '../lib/modalLayer.js';
// ─── TURN 38 (CLAUDE.md F1a): AND IT IS READ FRESH ─────────────────────────
// The list used to be memoised here on `[units, design, runChecks]`, which
// left every rule that reads the PROFILE (the hinge ladders themselves), the
// ROOM or the MATERIAL assignments printing an answer that no longer existed
// until something else touched `units` — the owner's "reports a collision
// where no hinge is any more, and a reload clears it". `lib/checkFindings.js`
// owns the dependency list now, and the canvas toolbar's badge reads the same
// one, so the two surfaces cannot disagree about what the job's faults are.
// ─── TURN 40 (CLAUDE.md F4a/F4c) ───────────────────────────────────────────
// The findings, and the ONE "take me there" gesture both surfaces use — open
// the doors if the piece is behind them, ring it, fly to it, open its editor.
import { useCheckFindings, useGoToSubject } from '../lib/checkFindings.js';

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
  const setCheckOpen = useUiStore((s) => s.setCheckOpen);

  const findings = useCheckFindings();
  const summary = checkSummary(findings);

  /**
   * ─── TURN 40 (CLAUDE.md F4c): AND IT TAKES YOU THERE ─────────────────────
   *
   * The F7/T30 mechanism did two of the four things: it selected the piece and
   * opened the editor. It did not FLY (selection alone does not move a camera)
   * and it did not open a door in front of the piece, which is why the owner
   * said *"nie bierze nas dokładnie do tego miejsca"*. All four live in
   * `lib/checkFindings.js useGoToSubject`, in one order, so the cabinet modal's
   * own list behaves identically.
   */
  const goTo = useGoToSubject();

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
              {/* ─── TURN 40 (CLAUDE.md F4a): THE FAULT'S OWN BUTTONS ──────
                  The owner, with two screenshots: *"raczej powinny się
                  pokazywać i tu i tu"* — the same fault, the same wording, the
                  SAME BUTTONS, in both places. The list is the FINDING's
                  (`engine/checks.js`), so this renders it and owns no label;
                  `ShelfHingeClash` renders the very same array. A fault with no
                  actions of its own still carries `alternative`, which is every
                  rule written before tonight. */}
              {(f.actions?.length || f.alternative) && (
                <div className="px-2 pb-1.5 flex flex-wrap gap-1">
                  {(f.actions?.length
                    ? f.actions
                    : [{ id: 'alternative', label: f.alternative.label || 'The other side of it', subject: f.alternative }]
                  ).map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      className="cc-btn px-2 text-[11px]"
                      data-check-action={a.id}
                      data-check-alternative={a.id === 'move-hinge' || a.id === 'alternative' ? f.check : undefined}
                      title={a.title || ''}
                      onClick={(e) => goTo(a.subject, e)}
                    >
                      {a.label}
                    </button>
                  ))}
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
