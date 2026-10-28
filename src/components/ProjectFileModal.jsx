/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import Modal from './Modal.jsx';
import {
  fileStamp, jobLabel, settingValue, settingWords,
} from '../lib/projectFile.js';

// ─── CHAT FIX 28.10.2026 · OPEN FROM FILE: THE TWO QUESTIONS ─────────────────
//
// The owner, 28.10.2026: *"zrobisz mi pozniej cos co zadziala, czyli export i
// import projektow"*; the mockup he was shown the same evening (File > Open
// from file... and Save to file..., the start screen's Open from file..., and
// these two questions) is built as drawn, its own defaults standing where he
// has not answered yet.
//
// A job opened from a .ccproject file (lib/projectFileRoad.js) asks, only when
// there is something to ask, in the shell's own window (rule 15: draggable,
// beside the entry that picked the file):
//
//   1. the job is already on this computer (the same id on the shelf):
//      Replace with the file (gold) / Keep both (open as a copy) / Cancel;
//   2. the file was drawn with other workshop settings than this computer's:
//      Use the file's settings (gold) / Keep this computer's.
//
// `askProjectFile` draws it in a root of its own, so neither the top bar nor
// the start screen has to host a window to ask it.

/** The window: the two questions, one at a time. `onAnswer(null)` is Cancel. */
export default function ProjectFileModal({
  file, questions, anchor = null, onAnswer,
}) {
  const [step, setStep] = useState(questions?.collision ? 'collision' : 'profile');
  const [mode, setMode] = useState('replace');
  const cancel = () => onAnswer(null);
  const choose = (picked) => {
    if (questions?.profile) {
      setMode(picked);
      setStep('profile');
      return;
    }
    onAnswer({ mode: picked, takeProfile: false });
  };

  if (step === 'collision') {
    const row = questions.collision;
    return (
      <Modal
        name="project-file"
        anchor={anchor}
        title="Open from file"
        onClose={cancel}
        width="w-[560px]"
        footer={(
          <>
            <button type="button" className="cc-btn-gold" data-project-file-choice="replace" onClick={() => choose('replace')}>
              Replace with the file
            </button>
            <button type="button" className="cc-btn" data-project-file-choice="copy" onClick={() => choose('copy')}>
              Keep both (open as a copy)
            </button>
            <button type="button" className="cc-btn" data-project-file-choice="cancel" onClick={cancel}>Cancel</button>
          </>
        )}
      >
        <div data-project-file-step="collision" className="space-y-2">
          <p className="text-sm text-ink-50">
            <span className="text-gold">{jobLabel(file.project)}</span>
            {' is already on this computer.'}
          </p>
          <p className="text-[12px] text-ink-200">
            {`On this computer: saved ${fileStamp(row.updated_at) || 'at a time it does not say'}.`}
          </p>
          <p className="text-[12px] text-ink-200">
            {`In the file: saved ${fileStamp(file.savedAt) || 'at a time it does not say'}.`}
          </p>
          <p className="text-[11px] text-ink-400">
            Replace puts the file&apos;s job in place of this computer&apos;s. Keep both opens the file as a copy beside it.
          </p>
        </div>
      </Modal>
    );
  }

  const diff = questions.profile;
  const shown = diff.rows.slice(0, 3);
  return (
    <Modal
      name="project-file"
      anchor={anchor}
      title="Open from file"
      onClose={cancel}
      width="w-[480px]"
      footer={(
        <>
          <button
            type="button"
            className="cc-btn-gold"
            data-project-file-choice="file-settings"
            onClick={() => onAnswer({ mode, takeProfile: true })}
          >
            Use the file&apos;s settings
          </button>
          <button
            type="button"
            className="cc-btn"
            data-project-file-choice="keep-settings"
            onClick={() => onAnswer({ mode, takeProfile: false })}
          >
            Keep this computer&apos;s
          </button>
        </>
      )}
    >
      <div data-project-file-step="profile" className="space-y-2">
        <p className="text-sm text-ink-50">This job was saved with other workshop settings.</p>
        <ul className="text-[12px] text-ink-200 space-y-1">
          {shown.map((r) => (
            <li key={r.path}>
              {`${settingWords(r.path)}: ${settingValue(r.file)} in the file, ${settingValue(r.here)} on this computer.`}
            </li>
          ))}
        </ul>
        {diff.count > shown.length && (
          <p className="text-[12px] text-ink-200">{`And ${diff.count - shown.length} more.`}</p>
        )}
        <p className="text-[11px] text-ink-400">
          The file&apos;s settings become this computer&apos;s for every job on it (Settings). Keeping this
          computer&apos;s draws the job with them instead.
        </p>
      </div>
    </Modal>
  );
}

/**
 * Ask the questions in the window, drawn in a root of its own beside the
 * entry that picked the file. Resolves `{ mode, takeProfile }`, or null for
 * Cancel (the window's Cancel, its x, Escape). Handed to
 * lib/projectFileRoad.js openProjectFromFile as its `ask`.
 */
export function askProjectFile({
  file, questions, anchor = null, doc = (typeof document !== 'undefined' ? document : null),
}) {
  return new Promise((resolve) => {
    if (!doc?.body) { resolve(null); return; }
    const host = doc.createElement('div');
    host.setAttribute('data-project-file-window', '1');
    doc.body.appendChild(host);
    const root = createRoot(host);
    let done = false;
    const answer = (value) => {
      if (done) return;
      done = true;
      resolve(value);
      // Unmounted after the click that answered has finished, never inside it.
      setTimeout(() => { root.unmount(); host.remove(); }, 0);
    };
    root.render(<ProjectFileModal file={file} questions={questions} anchor={anchor} onAnswer={answer} />);
  });
}
