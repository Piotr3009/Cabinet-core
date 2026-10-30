/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── T84 F5, THE STRIP AND THE COUNTERS (CLAUDE.md T84 PART C) ──────────────
//
// The owner, 27.10.2026: *"chcialbym jako uzytkownik widziec jakie beda
// zmiany"* and *"napewno naprzyklad wszystkie bledy zolte i czerwone sa
// totalnie niewidoczne, mala czcionka etc"*. Today a finding lives only in the
// Check panel, 11 px, gold on dark. From T84 it also stands:
//
// THE STRIP (IssueStrip, the default export), under the full panel's rows, in
// the column's foot beneath Open cabinet (InspectorHost's `renderStrip`; CHAT
// FIX 30.10.2026, the owner: *"open cabinet na samym dole a pod nim wszystkie
// bledy ktore pokazuje"*): CLAUDE.md T84 F5,
// *"`#48 · the bowl enters a board` in the finding's own words (`message`),
// its level colour, and Show: the camera frames the unit (the camera bar's
// Frame selection) and, for a panel finding, selects the part (`subject`).
// Several findings stack, the red first."*  The number is the Check's own
// (#48 is "Basins that do not fit the vanity's top, or whose bowl enters a
// board"), so a strip line and its row in the Check panel read alike. Show
// asks the frame through the store (`requestFrame`, verify/t84/agents/
// CONTRACT.md section 4); the camera bar (F6) answers it. It opens no window:
// the Check panel's row still does that (lib/checkFindings.js useGoToSubject).
//
// THE COUNTERS (IssueCounters), on the status bar: *"`1 red · 3 yellow` in
// their colours; click opens Check filtered to that level"* (`openCheckFiltered`;
// the Check panel reads `checkFilter` and offers "Show all"). A level with
// nothing in it is not said (lib/studioIssues.js issueCountText).
//
// All three places (the marker too) read the ONE shared list
// (lib/checkFindings.js useCheckFindings) through the engine's findingsToAct,
// so they, the rail's Check badge and the Check panel cannot disagree. How
// they look (13 px, dark on the level's ground) is the skin's one stylesheet
// for the class vocabulary (studio.css `.studio-issue-strip`, `.studio-counter`,
// `.is-red`, `.is-yellow`); this file types no colour and no size.

import { Fragment } from 'react';
import { useCheckFindings } from '../../lib/checkFindings.js';
import { useUiStore } from '../../stores/uiStore.js';
import { Icon } from './StudioIcons.jsx';
import { issueCounters, issueStripText, unitIssue } from './lib/studioIssues.js';

/**
 * One cabinet's findings to act on, the red first, each in its own words.
 *
 * @param {{ unitId: string }} props
 */
export default function IssueStrip({ unitId }) {
  const findings = useCheckFindings();
  const issue = unitIssue(findings, unitId);
  if (!issue) return null;

  const show = (finding) => {
    const ui = useUiStore.getState();
    const subject = finding.subject || null;
    // A panel finding of THIS cabinet selects its part; any other selects the
    // cabinet. A refused edit in the inspector holds the selection (F4).
    const part = subject?.panelId && (subject.unitId ?? unitId) === unitId ? subject.panelId : null;
    const moved = part ? ui.selectElement(unitId, part) : ui.selectUnit(unitId);
    if (moved === false) return;
    useUiStore.getState().requestFrame([unitId]);
  };

  // The strips stand side by side in a plain block, so the skin's spacing
  // between two of them (studio.css `.studio-issue-strip + .studio-issue-strip`)
  // is the only spacing there is.
  return (
    <div data-issue-unit={unitId} data-issue-count={issue.count} data-issue-level={issue.level}>
      {issue.findings.map((finding, i) => (
        <div
          // eslint-disable-next-line react/no-array-index-key
          key={`${finding.check}-${finding.panelId ?? ''}-${i}`}
          className={`studio-issue-strip is-${finding.level}`}
          data-studio="issue-strip"
          data-level={finding.level}
          data-check={finding.check}
        >
          <Icon name="warning" />
          <span>{issueStripText(finding)}</span>
          <button
            type="button"
            data-studio="issue-show"
            title={finding.subject?.panelId ? 'Frame the cabinet and select the part' : 'Frame the cabinet'}
            onClick={() => show(finding)}
          >
            Show
          </button>
        </div>
      ))}
    </div>
  );
}

/**
 * The status bar's counters: one button per level that has findings, each in
 * its colour, opening the Check filtered to that level.
 */
export function IssueCounters() {
  const findings = useCheckFindings();
  const counters = issueCounters(findings);
  if (!counters.length) return null;
  return (
    <span className="inline-flex items-center gap-1" data-issue-counters={counters.map((c) => c.label).join(' · ')}>
      {counters.map((c, i) => (
        <Fragment key={c.level}>
          {i > 0 ? <span aria-hidden="true" className="text-ink-400">·</span> : null}
          <button
            type="button"
            className={`studio-counter is-${c.level}`}
            data-studio={`counter-${c.level}`}
            data-count={c.count}
            title={`Open the Check with the ${c.level} findings only`}
            onClick={() => useUiStore.getState().openCheckFiltered(c.level)}
          >
            {c.label}
          </button>
        </Fragment>
      ))}
    </span>
  );
}
