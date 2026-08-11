import { useEffect } from 'react';

import Modal from './Modal.jsx';
import { useUiStore } from '../stores/uiStore.js';
import { useAuthStore } from '../stores/authStore.js';
import { useCabinetProfileStore } from '../stores/cabinetProfileStore.js';
import { useCompanyDefaultsStore } from '../stores/companyDefaultsStore.js';
import { BOARD_FAMILIES } from '../engine/companyDefaults.js';
import { hardwareHealth } from '../lib/hardwareHealth.js';

// ─── DATABASE ▸ COMPANY DEFAULTS (turn 22, CLAUDE.md F2b.2 / F3) ────────────
//
// The screen for the storey between the code and the project: "we fit onyx
// CLIP tops on the knock-in plate and TIP-ON runners, and our wardrobes are
// 18 mm". Read, edit, save.
//
// TWO THINGS ARE DELIBERATE ABOUT IT.
//
// It offers ONLY what a rule cannot infer. There is no hinge-angle field here
// and there never will be: the angle follows the front's thickness
// (`engine/hinges.js hingeAngleFor`), and the validator refuses the key even if
// somebody puts it in the row by hand. What the screen shows is preferences.
//
// And it degrades. With no keys, or with nobody signed in, it says so in one
// sentence and the app goes on running on profile numbers exactly as it always
// has — CLAUDE.md's own rule 0 for this turn, at the one screen where a joiner
// would otherwise be left wondering whether he had broken something.
//
// The HARDWARE HEALTH row (F3) lives at the bottom of it rather than in a
// second window, because it answers the same question this screen exists for —
// "what is this app actually working from?" — and because a status line nobody
// can find is a status line that goes on being read out of DevTools.

export default function CompanyDefaultsModal() {
  const closeModal = useUiStore((s) => s.closeModal);
  const notify = useUiStore((s) => s.notify);
  const anchor = useUiStore((s) => s.modalArgs?.anchor) || null;
  const profile = useCabinetProfileStore((s) => s.profile);
  const user = useAuthStore((s) => s.user);

  const defaults = useCompanyDefaultsStore((s) => s.defaults);
  const rejected = useCompanyDefaultsStore((s) => s.rejected);
  const busy = useCompanyDefaultsStore((s) => s.busy);
  const saved = useCompanyDefaultsStore((s) => s.saved);
  const error = useCompanyDefaultsStore((s) => s.error);
  const mock = useCompanyDefaultsStore((s) => s.mock);
  const load = useCompanyDefaultsStore((s) => s.load);
  const setField = useCompanyDefaultsStore((s) => s.set);
  const save = useCompanyDefaultsStore((s) => s.save);

  useEffect(() => { load(); }, [load]);

  const C = profile.hardware.hinge.cliptop;
  const M = profile.hardware.runner.movento;
  const row = defaults || {};
  const boards = row.boards || {};
  const signedIn = Boolean(user) && !mock;

  const health = hardwareHealth(profile);

  const commit = async () => {
    const ok = await save();
    notify(
      ok ? 'Company defaults saved — every new project starts here.' : 'Company defaults need an account.',
      ok ? 'ok' : 'warn',
    );
  };

  const Choice = ({ label, hint, value, options, onPick, testKey }) => (
    <label className="block" data-company-field={testKey}>
      <span className="cc-label">{label}</span>
      <select
        className="cc-input"
        value={value ?? ''}
        onChange={(e) => onPick(e.target.value || null)}
      >
        <option value="">Workshop profile ({hint})</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>{o.label}</option>
        ))}
      </select>
    </label>
  );

  return (
    <Modal
      anchor={anchor}
      title="Company defaults"
      onClose={closeModal}
      width="w-[560px]"
      footer={(
        <>
          <button type="button" className="cc-btn" onClick={closeModal}>Close</button>
          <button
            type="button"
            className={saved ? 'cc-btn-saved' : 'cc-btn-gold'}
            disabled={busy || !signedIn}
            onClick={commit}
            data-company-save="1"
          >
            {saved ? 'Saved' : 'Save'}
          </button>
        </>
      )}
    >
      <div className="space-y-3" data-company-defaults="1">
        {!signedIn && (
          <p className="text-[12px] text-ink-200 cc-frame p-2" data-company-anonymous="1">
            {mock
              ? 'This build has no database — company defaults need an account. Everything below is the workshop profile, and the app is running on it exactly as it always does.'
              : 'Company defaults need an account. Sign in and this row is read, edited and saved here; until then every project starts from the workshop profile.'}
          </p>
        )}

        <p className="text-[11px] text-ink-400">
          What this workshop fits when nobody has said otherwise. A new project starts here;
          deviations live in the project’s own settings, and a single element still overrules both.
          Only preferences — never anything a rule works out. The hinge ANGLE follows the front’s
          thickness and is not on this screen.
        </p>

        <div className="grid grid-cols-2 gap-2">
          <Choice
            testKey="hinge_system"
            label="Hinge system"
            hint={C.systemLabel}
            value={row.hinge_system}
            options={C.systems.map((s) => ({ id: s.id, label: s.label }))}
            onPick={(v) => setField({ hinge_system: v })}
          />
          <Choice
            testKey="hinge_finish"
            label="Hinge finish"
            hint={C.defaultFinish}
            value={row.hinge_finish}
            options={C.finishes.map((f) => ({ id: f.id, label: f.label || f.id }))}
            onPick={(v) => setField({ hinge_finish: v })}
          />
          <Choice
            testKey="plate"
            label="Mounting plate"
            hint={C.defaultPlate}
            value={row.plate}
            options={C.plates.filter((p) => p.enabled).map((p) => ({ id: p.id, label: p.label || p.id }))}
            onPick={(v) => setField({ plate: v })}
          />
          <Choice
            testKey="runner_variant"
            label="Runner variant"
            hint={M.defaultVariant}
            value={row.runner_variant}
            options={(M.variants || []).map((v) => ({ id: v.id, label: v.label || v.id }))}
            onPick={(v) => setField({ runner_variant: v })}
          />
        </div>

        <div className="cc-divider" />

        <span className="text-xs uppercase tracking-wide text-ink-200">Boards, per family</span>
        <div className="grid grid-cols-2 gap-2">
          {BOARD_FAMILIES.map((family) => (
            <label key={family} className="block" data-company-board={family}>
              <span className="cc-label">{family === 'kitchen' ? 'Kitchen carcass' : 'Wardrobe carcass'}</span>
              <select
                className="cc-input"
                value={boards[family]?.carcass_thickness ?? ''}
                onChange={(e) => setField({
                  boards: {
                    ...boards,
                    [family]: {
                      ...(boards[family] || {}),
                      carcass_thickness: e.target.value ? Number(e.target.value) : null,
                    },
                  },
                })}
              >
                <option value="">Workshop profile ({profile.board.thickness} mm)</option>
                {profile.board.thicknessOptions.map((t) => (
                  <option key={t} value={t}>{`${t} mm`}</option>
                ))}
              </select>
            </label>
          ))}
        </div>

        {rejected.length > 0 && (
          <div className="cc-frame p-2 space-y-1" data-company-rejected="1">
            <span className="text-[11px] text-red-400">
              {rejected.length === 1 ? 'One field was refused' : `${rejected.length} fields were refused`}
            </span>
            {rejected.map((r) => (
              <p key={r.key} className="text-[11px] text-ink-400">
                <span className="text-ink-100">{r.key}</span>
                {' — '}
                {r.why}
              </p>
            ))}
          </div>
        )}

        {error && <p className="text-[11px] text-red-400">{error}</p>}

        <div className="cc-divider" />

        {/* ─── HARDWARE HEALTH (turn 22, CLAUDE.md F3) ─── */}
        <HardwareHealthRow rows={health} />
      </div>
    </Modal>
  );
}

/**
 * The status line the owner has been reading out of DevTools for two turns.
 *
 * Per family: models loaded / expected, where the CATALOGUE came from, and — in
 * red, when there is one — how many fetches failed and the first url that did,
 * copyable. It reads the registries and fetches nothing.
 */
export function HardwareHealthRow({ rows }) {
  const notify = useUiStore((s) => s.notify);
  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      notify('The failing URL is on the clipboard.', 'ok');
    } catch {
      notify(text, 'warn');
    }
  };
  return (
    <div className="space-y-1" data-hardware-health="1">
      <span className="text-xs uppercase tracking-wide text-ink-200">Hardware</span>
      {rows.map((r) => (
        <div key={r.family} className="cc-row text-[11px]" data-hardware-family={r.family}>
          <span className="text-ink-100">
            {r.short}
            {' '}
            <span data-hardware-count={r.family}>
              {r.loaded}
              /
              {r.expected}
            </span>
          </span>
          <span className="flex items-center gap-2">
            <span className="text-ink-400" data-hardware-source={r.family}>
              {r.source || 'not asked'}
            </span>
            {r.failed > 0 && (
              <button
                type="button"
                className="text-red-400 underline"
                title={r.firstFailure || ''}
                data-hardware-failed={r.family}
                onClick={() => r.firstFailure && copy(r.firstFailure)}
              >
                {r.failed}
                {' failed — copy URL'}
              </button>
            )}
          </span>
        </div>
      ))}
      <p className="text-[11px] text-ink-400">
        Loaded models against what the catalogue names, and where that catalogue came from:
        <span className="text-ink-100"> db</span>
        {' (a '}
        <span className="text-ink-100">cc_hardware</span>
        {' row), '}
        <span className="text-ink-100">bucket</span>
        {' (the manifest) or '}
        <span className="text-ink-100">mock</span>
        {' (what ships with the app). A model nobody has needed yet is neither loaded nor failed.'}
      </p>
    </div>
  );
}
