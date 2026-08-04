import { isMockMode, MOCK_REASON } from '../lib/supabase.js';

// CLAUDE.md rule 6 — with no Supabase keys the app runs on sample data and says so.
export default function MockModeBadge() {
  if (!isMockMode) return null;
  return (
    <span
      title={MOCK_REASON}
      className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded border border-status-warn/60 bg-status-warn/15 text-status-warn select-none"
    >
      Mock data mode
    </span>
  );
}
