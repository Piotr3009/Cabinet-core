import { useCallback, useMemo, useState } from 'react';
import Modal from './Modal.jsx';
import { useUiStore } from '../stores/uiStore.js';
import { useProjectStore } from '../stores/projectStore.js';
import { useCabinetProfileStore } from '../stores/cabinetProfileStore.js';
import { CAMERA_PRESETS, renderJob } from '../engine/render.js';
import { savePng } from '../3d/renderCapture.js';

// ─── Render (turn 6, CLAUDE.md F2 / BACKLOG #37) ───
//
// The business case, in one line: our customer is a workshop, and the workshop
// shows this picture to ITS customer. It has to sell, not merely inform.
//
// Four choices and a button. Everything behind them — where the camera stands,
// what size the image is, what the file is called — is engine/render.js, so the
// numbers are testable in node rather than eyeballed on a 4K PNG. This file is
// the panel and nothing else.
//
// The render is of the SELECTED unit when one is selected and of the whole
// scene otherwise, which is also what the filename says.

export default function RenderModal({ rig }) {
  const closeModal = useUiStore((s) => s.closeModal);
  // Where this modal opens (turn 12, rule 15): beside whatever asked for it.
  // Nothing to work out here — the opener said, and the shell places it.
  const anchor = useUiStore((s) => s.modalArgs?.anchor) || null;
  const notify = useUiStore((s) => s.notify);
  const selectedUnitId = useUiStore((s) => s.selectedUnitId);
  const project = useProjectStore((s) => s.project);
  const units = useProjectStore((s) => s.units);
  const profile = useCabinetProfileStore((s) => s.profile);

  const [resolution, setResolution] = useState(profile.render.defaultResolution);
  const [preset, setPreset] = useState('current');
  const [shadows, setShadows] = useState(profile.render.defaultShadows);
  const [busy, setBusy] = useState(false);
  const [shot, setShot] = useState(null);          // { dataUrl, filename, width, height }

  const selected = units.find((u) => u.id === selectedUnitId) || null;
  // The whole scene by default, ALWAYS — even with a unit selected. A workshop
  // opening Render wants the picture of the job; framing on whichever cabinet
  // happened to be clicked last is a surprise, and one that ends up in the
  // filename as well.
  const [subjectAll, setSubjectAll] = useState(true);

  const subjectLabel = selected && !subjectAll ? selected.params.unit_num : 'scene';

  const run = useCallback(() => {
    if (!rig) { notify('The 3D view is not ready yet.', 'warn'); return; }
    if (!units.length) { notify('Nothing to render yet — add a unit first.', 'warn'); return; }
    setBusy(true);
    // One frame of breathing room, so the button reaches its "Rendering…"
    // state before a 4K read-back blocks the thread for a second.
    requestAnimationFrame(() => {
      try {
        const bounds = rig.bounds(selected && !subjectAll ? selected.id : null);
        const job = renderJob({
          resolution,
          preset,
          shadows,
          aspect: rig.aspect(),
          bounds,
          project: project?.name,
          subject: subjectLabel,
        }, profile);
        const out = rig.capture(job);
        setShot({ ...out, filename: job.filename });
      } catch (e) {
        notify(e?.message || 'The render failed.', 'warn');
      } finally {
        setBusy(false);
      }
    });
  }, [rig, units.length, selected, subjectAll, resolution, preset, shadows, project, subjectLabel, profile, notify]);

  const save = useCallback(() => {
    if (!shot) return;
    savePng(shot.dataUrl, shot.filename);
    notify(`Saved ${shot.filename}.`, 'ok');
  }, [shot, notify]);

  const presets = useMemo(() => CAMERA_PRESETS, []);

  return (
    <Modal
      name="render"
      anchor={anchor}
      title="Render"
      width="w-[640px]"
      onClose={closeModal}
      footer={(
        <>
          <button type="button" className="cc-btn" onClick={closeModal}>Close</button>
          <button type="button" className="cc-btn" disabled={!shot} onClick={save}>Save PNG</button>
          <button type="button" className="cc-btn-gold" disabled={busy} onClick={run}>
            {busy ? 'Rendering…' : 'Render'}
          </button>
        </>
      )}
    >
      <div className="space-y-3">
        {/* ── shot ── */}
        <div>
          <span className="cc-label">Shot</span>
          <div className="flex flex-wrap gap-1">
            {presets.map((p) => (
              <button
                key={p.id}
                type="button"
                title={p.hint}
                className={`cc-btn px-2 ${preset === p.id ? 'border-gold text-gold' : ''}`}
                onClick={() => setPreset(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── subject ── */}
        {selected && (
          <div className="cc-row">
            <div className="flex flex-col">
              <span className="text-sm text-ink-100">Frame</span>
              <span className="text-[11px] text-ink-400">
                {preset === 'current'
                  ? 'Current view is already framed — this only names the file'
                  : 'What the camera is placed around'}
              </span>
            </div>
            <div className="flex gap-1">
              <button
                type="button"
                className={`cc-btn px-2 ${subjectAll ? 'border-gold text-gold' : ''}`}
                onClick={() => setSubjectAll(true)}
              >
                Whole scene
              </button>
              <button
                type="button"
                className={`cc-btn px-2 ${subjectAll ? '' : 'border-gold text-gold'}`}
                onClick={() => setSubjectAll(false)}
              >
                Unit {selected.params.unit_num}
              </button>
            </div>
          </div>
        )}

        {/* ── resolution ── */}
        <div className="cc-row">
          <div className="flex flex-col">
            <span className="text-sm text-ink-100">Resolution</span>
            <span className="text-[11px] text-ink-400">
              {profile.render.resolutions.find((r) => r.id === resolution)?.hint}
            </span>
          </div>
          <div className="flex gap-1">
            {profile.render.resolutions.map((r) => (
              <button
                key={r.id}
                type="button"
                className={`cc-btn px-2 ${resolution === r.id ? 'border-gold text-gold' : ''}`}
                onClick={() => setResolution(r.id)}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── shadows ── */}
        <div className="cc-row">
          <div className="flex flex-col">
            <span className="text-sm text-ink-100">Shadow quality</span>
            <span className="text-[11px] text-ink-400">High is slower and only ever used here</span>
          </div>
          <div className="flex gap-1">
            {Object.entries(profile.render.shadow).map(([id, cfg]) => (
              <button
                key={id}
                type="button"
                className={`cc-btn px-2 ${shadows === id ? 'border-gold text-gold' : ''}`}
                onClick={() => setShadows(id)}
              >
                {cfg.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── preview ── */}
        <div className="rounded border border-shell-600 bg-canvas overflow-hidden min-h-[180px] flex items-center justify-center">
          {shot ? (
            <img src={shot.dataUrl} alt="Render preview" className="max-h-[320px] w-auto" />
          ) : (
            <p className="text-[12px] text-ink-400 px-4 py-10 text-center">
              Press Render. The image is taken from this scene with the tool hidden —
              no handles, no dimensions, no outlines.
            </p>
          )}
        </div>

        {shot && (
          <p className="text-[11px] text-ink-400">
            {shot.width} × {shot.height} px · saves as <span className="text-ink-100">{shot.filename}</span>
          </p>
        )}
      </div>
    </Modal>
  );
}
