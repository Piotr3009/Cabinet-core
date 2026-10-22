/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
import { useCheckFindings, useGoToSubject } from '../lib/checkFindings.js';
import { LAYER_CLASS } from '../lib/modalLayer.js';
import { INFRAME_CHECKS } from '../engine/inframeChecks.js';

// ─── T80 F10 · THE IN-FRAME CHECKS, IN THE LEFT COLUMN ──────────────────────
//
// CLAUDE.md T80 F10: *"Each in the left messages and in the Check panel."*
// The Check panel reads every finding already; the left column did not (the
// probe, verify/t80/f10-probe.md section 4: no finding reaches it by itself).
// So the in-frame findings stand here as the front-gap rows do, from the SAME
// list the Check panel and the toolbar badge read (`useCheckFindings`), and a
// click takes the same road (`useGoToSubject`). Nothing is computed here.

const NUMBERS = new Set(Object.values(INFRAME_CHECKS));

const TONE = {
  red: 'text-status-danger border-status-danger/50',
  yellow: 'text-status-warn border-status-warn/50',
};

export default function InframeWarnings() {
  const findings = useCheckFindings();
  const goTo = useGoToSubject();
  const rows = findings.filter((f) => NUMBERS.has(f.check));
  if (!rows.length) return null;
  return (
    <div
      className={`absolute left-3 bottom-3 ${LAYER_CLASS.panel} max-w-[30rem] space-y-1`}
      data-inframe-warnings={rows.length}
    >
      {rows.map((f, i) => (
        <button
          // eslint-disable-next-line react/no-array-index-key
          key={`${f.check}-${f.unitId}-${f.panelId}-${i}`}
          type="button"
          data-inframe-check={f.check}
          data-check-level={f.level}
          disabled={!f.subject}
          title={f.subject ? 'Fly to it and open its editor' : ''}
          onClick={(e) => goTo(f.subject, e)}
          className={`flex w-full items-start gap-1.5 rounded border bg-shell-900/85 px-2 py-1 text-left text-[11px]
            leading-snug backdrop-blur-sm ${TONE[f.level] || TONE.yellow}`}
        >
          <span aria-hidden className="shrink-0">■</span>
          <span>#{f.check} · {f.message}</span>
        </button>
      ))}
    </div>
  );
}
