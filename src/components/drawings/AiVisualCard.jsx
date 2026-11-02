/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T-CC1b F13 . THE AI VISUALISATION CARD (CLAUDE.md T-CC1b, PART D, law 8)
//
// The owner, 01.11.2026: *"wizualizacja AI z renderu, max 3 proby, wybierasz
// jedna i dodajesz do rysunkow, tanie API"*.
//
// Mounted by the Drawings window under the sheet list (components/DrawingModal.jsx).
// The source is one of the two angles or the user's render; one click of
// Generate asks Joinery Core for at most `profile.visuals.aiTries` (3) pictures
// in sequence (lib/aiVisualise.js), each shown as it arrives with "Use this
// one" under it, Stop between calls, each try in its own room (chat, 02.11.2026). Nothing is kept until "Use this one":
// then ONE picture is kept under `profile.visuals.maxKb` in
// `project.visuals.ai` and the set shows "Visualisation, AI" ticked.

import { useMemo, useRef, useState } from 'react';
import { useProjectStore } from '../../stores/projectStore.js';
import { getCabinetProfile } from '../../engine/profile.js';
import { visualNumbers } from '../../lib/visualNumbers.js';
import {
  AI_DEFAULTS, AI_QUALITIES, AI_SIZES, aiSources, buildPrompt, generateRun, keepChosen, visualise,
} from '../../lib/aiVisualise.js';

export default function AiVisualCard({ project = null, visuals = null, initial = null }) {
  const units = useProjectStore((s) => s.units);
  const sources = useMemo(() => aiSources(visuals), [visuals]);
  const [sourceId, setSourceId] = useState(initial?.sourceId || 'isoLeft');
  const [size, setSize] = useState(initial?.size || AI_DEFAULTS.size);
  const [quality, setQuality] = useState(initial?.quality || AI_DEFAULTS.quality);
  const [extra, setExtra] = useState(initial?.extra || '');
  const [running, setRunning] = useState(Boolean(initial?.running));
  const [progress, setProgress] = useState(initial?.progress || 0);
  const [pictures, setPictures] = useState(initial?.pictures || []);
  const [error, setError] = useState(initial?.error || null);
  const [lastPrompt, setLastPrompt] = useState('');
  const stopRef = useRef(false);

  const numbers = visualNumbers(getCabinetProfile());
  const tries = numbers.aiTries;
  const source = sources.find((s) => s.id === sourceId) || sources[0];
  const chosen = project?.visuals?.ai || null;

  const generate = async () => {
    if (running) return;
    // Chat, 02.11.2026: each try asks with its own room (lib/aiVisualise.js roomOfAttempt), the furniture the same;
    // the picture keeps the prompt it was made with, so "Use this one" stores that one.
    const promptOf = (k) => buildPrompt({ project, design: project?.design, units, profile: getCabinetProfile(), extra, attempt: k });
    const prompts = {};
    stopRef.current = false;
    setLastPrompt(promptOf(1));
    setPictures([]);
    setError(null);
    setRunning(true);
    try {
      const run = await generateRun({
        tries,
        call: (k) => {
          prompts[k] = promptOf(k);
          setLastPrompt(prompts[k]);
          return visualise({ image: source?.image, prompt: prompts[k], size, quality, numbers });
        },
        onProgress: (k) => setProgress(k),
        onPicture: (pic, k) => setPictures((list) => [...list, { ...pic, prompt: prompts[k] }]),
        shouldStop: () => stopRef.current,
      });
      if (run.error) setError(run.error);
    } finally {
      setRunning(false);
      setProgress(0);
    }
  };

  const chooseOne = async (pic) => {
    const res = await keepChosen(pic.image, {
      prompt: pic.prompt || lastPrompt,
      numbers,
      setVisual: useProjectStore.getState().setVisual,
    });
    setError(res.error);
  };

  return (
    <section className="rounded border border-shell-600 bg-shell-700/40 p-3 space-y-2 text-[12px]" data-ai-card="1">
      <div className="flex items-center gap-2">
        <span className="text-sm text-ink-100">AI visualisation</span>
        <span className="text-[11px] text-ink-400 mr-auto">
          {`An impression for the client from a picture of this design, at most ${tries} pictures per click. Nothing is kept until you choose one.`}
        </span>
        {chosen ? (
          <button type="button" className="cc-btn px-2 text-[11px]" data-ai-remove="1" onClick={() => useProjectStore.getState().setVisual('ai', null)}>
            Remove
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3" data-ai-sources={sources.length}>
        <span className="text-ink-400">From</span>
        {sources.map((s) => (
          <label key={s.id} className="inline-flex items-center gap-1">
            <input
              type="radio"
              name="ai-source"
              data-ai-source={s.id}
              checked={source?.id === s.id}
              disabled={running}
              onChange={() => setSourceId(s.id)}
            />
            <span className={s.image ? 'text-ink-100' : 'text-ink-400'}>{s.image ? s.label : `${s.label} (not drawn yet)`}</span>
          </label>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex items-center gap-1">
          <span className="text-ink-400">Size</span>
          <select className="cc-input" data-ai-size={size} value={size} disabled={running} onChange={(e) => setSize(e.target.value)}>
            {AI_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label className="inline-flex items-center gap-1">
          <span className="text-ink-400">Quality</span>
          <select className="cc-input" data-ai-quality={quality} value={quality} disabled={running} onChange={(e) => setQuality(e.target.value)}>
            {AI_QUALITIES.map((q) => <option key={q} value={q}>{q}</option>)}
          </select>
        </label>
        <label className="inline-flex items-center gap-1 flex-1 min-w-[220px]">
          <span className="text-ink-400 whitespace-nowrap">Add to the prompt</span>
          <input
            type="text"
            className="cc-input flex-1"
            data-ai-extra="1"
            value={extra}
            placeholder="Optional: oak floor, a window on the left ..."
            disabled={running}
            onChange={(e) => setExtra(e.target.value)}
          />
        </label>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="cc-btn px-3"
          data-ai-generate="1"
          disabled={running || !source?.image}
          title={source?.image ? 'Ask Joinery Core for the pictures, one at a time' : 'The picture to start from is not drawn yet'}
          onClick={generate}
        >
          Generate
        </button>
        {running ? (
          <>
            <span className="inline-block w-3 h-3 rounded-full border-2 border-gold border-t-transparent animate-spin" aria-hidden="true" />
            <span className="text-ink-400" data-ai-progress={progress}>{`Picture ${progress} of ${tries}`}</span>
            <button type="button" className="cc-btn px-2 text-[11px]" data-ai-stop="1" onClick={() => { stopRef.current = true; }}>
              Stop
            </button>
          </>
        ) : null}
      </div>

      {error ? (
        <p className="border border-status-warn/60 bg-status-warn/10 text-status-warn rounded px-2 py-1.5 text-[11px]" data-ai-error="1">
          {error}
        </p>
      ) : null}

      {pictures.length ? (
        <div className="grid grid-cols-3 gap-2" data-ai-pictures={pictures.length}>
          {pictures.map((pic, i) => (
            <figure key={i} className="space-y-1">
              <img src={pic.image} alt={`AI picture ${i + 1}`} className="w-full rounded border border-shell-600" />
              <button type="button" className="cc-btn px-2 text-[11px] w-full" data-ai-use={i + 1} onClick={() => chooseOne(pic)}>
                Use this one
              </button>
            </figure>
          ))}
        </div>
      ) : null}

      {chosen?.dataUrl ? (
        <p className="text-[11px] text-ink-400" data-ai-chosen="1">
          The chosen picture is in the set as the sheet Visualisation, AI.
        </p>
      ) : null}
    </section>
  );
}
