import { useUiStore } from '../stores/uiStore.js';

const TONES = {
  info:  'border-shell-600 bg-shell-800 text-ink-100',
  warn:  'border-status-warn/60 bg-status-warn/15 text-status-warn',
  error: 'border-status-danger/60 bg-status-danger/15 text-status-danger',
  ok:    'border-status-ok/60 bg-status-ok/15 text-status-ok',
};

export default function Toast() {
  const toast = useUiStore((s) => s.toast);
  const dismiss = useUiStore((s) => s.dismissToast);
  if (!toast) return null;
  return (
    <button
      type="button"
      onClick={dismiss}
      className={`absolute bottom-6 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded border text-sm shadow-panel ${TONES[toast.tone] || TONES.info}`}
    >
      {toast.message}
    </button>
  );
}
