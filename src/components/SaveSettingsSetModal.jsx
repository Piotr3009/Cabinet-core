import { useRef, useState } from 'react';
import Modal from './Modal.jsx';
import { useSettingsSetsStore } from '../stores/settingsSetsStore.js';
import { useUiStore } from '../stores/uiStore.js';
import { NO_TABLE_NOTE } from '../lib/settingsSetsDb.js';

// ─── THE FINALE (turn 44, CLAUDE.md F8) ─────────────────────────────────────
//
// *"Final separate modal: 'Zapisać te ustawienia jako Twój standard?' big Y/N +
// name field → INSERT into `cc_settings_sets` (payload = the whole settings
// object)."*
//
// This is where the `Keep as…` control went — iron rule 3's first licensed
// removal, relocated rather than deleted. It used to sit at the TOP of the
// settings screen, beside a list of sets, asking a workshop to name a standard
// it had not finished choosing yet. Asked once, at the end, it is a question
// somebody can actually answer.
//
// A separate window, on the one shell, opened BESIDE the button that asked for
// it (rule 4 / rule 15) and draggable like everything else.
//
// ─── WITHOUT THE SQL (iron rule 7) ──────────────────────────────────────────
// The set is written to the LOCAL shelf first and always — that is what has
// made mock mode a working app since turn 7 — and the table is then offered the
// same row. No table, no session, no network: the save still happened, and the
// amber note says where it landed and what to run to change that. Nothing here
// throws and nothing here blocks.

export default function SaveSettingsSetModal({
  design, suggestion = '', anchor = null, onClose, onSaved = null,
}) {
  const saveSet = useSettingsSetsStore((s) => s.save);
  const source = useSettingsSetsStore((s) => s.source);
  const notify = useUiStore((s) => s.notify);
  const [name, setName] = useState(suggestion || 'Default settings');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const done = useRef(false);

  const save = async () => {
    const label = name.trim();
    if (!label || done.current) return;
    done.current = true;
    setBusy(true);
    // `save` writes the local shelf synchronously and then offers the row to
    // cc_settings_sets; it never rejects, so there is no catch to write here.
    const verdict = await saveSet(label, design);
    setBusy(false);
    setResult(verdict);
    notify(
      verdict.source === 'db'
        ? `"${label}" saved to your account.`
        : `"${label}" saved on this computer.`,
      verdict.source === 'db' ? 'ok' : 'warn',
    );
    onSaved?.(verdict);
    onClose?.();
  };

  return (
    <Modal
      name="save-settings-set"
      title="Your standard"
      anchor={anchor}
      width="w-[460px]"
      onClose={onClose}
      footer={(
        <>
          <button type="button" className="cc-btn px-4" data-set-answer="no" onClick={onClose}>
            Nie
          </button>
          <button
            type="button"
            className="cc-btn-gold px-4"
            data-set-answer="yes"
            data-set-save="1"
            disabled={busy || !name.trim()}
            onClick={save}
          >
            {busy ? 'Saving…' : 'Tak — zapisz'}
          </button>
        </>
      )}
    >
      <div className="space-y-3" data-save-set-modal="1">
        <p className="text-base text-ink-50">Save these as your standard?</p>
        <p className="text-[11px] text-ink-400">
          Everything on the six tabs, under a name. The next job can start from it — and this project
          keeps them either way.
        </p>
        <label className="block">
          <span className="cc-label">Name this set</span>
          <input
            className="cc-input"
            autoFocus
            data-set-name="1"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') save(); }}
          />
        </label>
        <p className="text-[10px] text-ink-400" data-set-target="1">
          {source === 'db'
            ? 'It goes to cc_settings_sets, so it follows the account rather than the browser.'
            : NO_TABLE_NOTE}
        </p>
        {result && result.source !== 'db' && (
          <p className="text-[11px] text-status-warn" data-set-local-note="1">{NO_TABLE_NOTE}</p>
        )}
      </div>
    </Modal>
  );
}
