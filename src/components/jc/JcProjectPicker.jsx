/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
import { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Modal from '../Modal.jsx';
import { allProjects, loadJcList } from '../../lib/jcList.js';
import { PROFILE_NOT_IMPORTED } from '../../lib/projectFileRoad.js';

// ─── T-CC1a F6 · OPEN FROM FILE IS THE IMPORT ROAD: WHICH JC PROJECT? ────────
//
// The owner, 31.10.2026, 01:06 (answer 10): *"w przyszlosci nie bedzie save to
// file, po co?"*: Open from file stays only as the one-time import of the
// owner's old jobs. An imported job is an item like any other, born bound to
// ONE Joinery Core project (law 4), so the road asks which: the start screen's
// own list (lib/jcList.js) in a small picker, the list embedded with a search
// above it (JC rule 6.3: never search-only). A file that carries workshop
// settings is told so in read-only words: they are not imported.


/** The picker: `onAnswer(projectRow)` or `onAnswer(null)` for Cancel. `list` may be handed in (the start screen's). */
export default function JcProjectPicker({ list: given = null, jobName = '', profileNote = false, anchor = null, onAnswer }) {
  const [list, setList] = useState(given);
  const [query, setQuery] = useState('');
  useEffect(() => {
    if (given) return undefined;
    let live = true;
    loadJcList().then((l) => { if (live) setList(l); });
    return () => { live = false; };
  }, [given]);
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = list && !list.error ? allProjects(list) : [];
    return q ? all.filter((p) => `${p.number} ${p.name} ${p.client}`.toLowerCase().includes(q)) : all;
  }, [list, query]);
  const cancel = () => onAnswer(null);
  return (
    <Modal
      name="project-file"
      anchor={anchor}
      title="Open from file"
      onClose={cancel}
      width="w-[560px]"
      footer={<button type="button" className="cc-btn" data-jc-picker-cancel="1" onClick={cancel}>Cancel</button>}
    >
      <div className="space-y-2" data-jc-picker="1">
        <p className="text-sm text-ink-50">
          {jobName ? <span className="text-gold">{jobName}</span> : 'This job'}
          {' becomes a new item of the Joinery Core project you choose.'}
        </p>
        {profileNote && <p className="text-[12px] text-ink-200" data-jc-picker-profile="1">{PROFILE_NOT_IMPORTED}</p>}
        <input
          className="cc-input w-full"
          data-jc-picker-search="1"
          placeholder="Search by number, name or client"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {!list && <p className="text-[12px] text-ink-400">Reading the projects from Joinery Core...</p>}
        {list?.error && <p className="text-[12px] text-status-danger" role="alert">{list.error}</p>}
        {list && !list.error && rows.length === 0 && <p className="text-[12px] text-ink-400">No project matches.</p>}
        <ul className="divide-y divide-shell-600 max-h-[320px] overflow-y-auto">
          {rows.map((p) => (
            <li key={p.key}>
              <button
                type="button"
                className="w-full text-left px-2 py-2 hover:bg-shell-700 flex items-center gap-3"
                data-jc-picker-project={p.key}
                onClick={() => onAnswer(p)}
              >
                <span className="text-[11px] text-gold w-20 shrink-0 truncate">{p.number}</span>
                <span className="text-sm text-ink-50 flex-1 truncate">{p.name}{p.client ? ` · ${p.client}` : ''}</span>
                <span className="cc-tag">{p.kind === 'production' ? 'Production' : 'Pipeline'}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  );
}

/**
 * Ask in a root of its own (the pattern of components/ProjectFileModal.jsx askProjectFile), so neither the
 * top bar nor the start screen hosts the window. Resolves the chosen project row, or null for Cancel.
 * Handed to lib/projectFileRoad.js openProjectFromFile as its `pickProject`.
 */
export function askJcProject({
  list = null, jobName = '', profileNote = false, anchor = null,
  doc = (typeof document !== 'undefined' ? document : null),
} = {}) {
  return new Promise((resolve) => {
    if (!doc?.body) { resolve(null); return; }
    const host = doc.createElement('div');
    host.setAttribute('data-jc-picker-window', '1');
    doc.body.appendChild(host);
    const root = createRoot(host);
    let done = false;
    const answer = (value) => {
      if (done) return;
      done = true;
      resolve(value);
      setTimeout(() => { root.unmount(); host.remove(); }, 0);
    };
    root.render(<JcProjectPicker list={list} jobName={jobName} profileNote={profileNote} anchor={anchor} onAnswer={answer} />);
  });
}
