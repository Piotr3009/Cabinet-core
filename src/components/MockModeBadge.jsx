import { isJcOffline, JC_OFFLINE } from '../lib/jcApi.js';

// CLAUDE.md rule 6 — with no Supabase keys the app runs on sample data and says so.
export default function MockModeBadge() {
  if (!isJcOffline()) return null;
  return (
    <span
      title={JC_OFFLINE}
      className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded border border-status-warn/60 bg-status-warn/15 text-status-warn select-none"
    >
      Mock data mode
    </span>
  );
}
