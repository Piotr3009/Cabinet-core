import { useUiStore } from '../stores/uiStore.js';
import { AUDIENCES } from '../lib/wizardTabs.js';

// ─── FACTORY OR RETAIL (turn 44, CLAUDE.md iron rule 5) ─────────────────────
//
// *"App-level mode (header toggle, default `factory`, persisted) filters the
// tree."*
//
// One switch, in the header, on both screens a wizard can be opened from — the
// start screen and the configurator's top bar. It is APP-level and not
// project-level on purpose: a workshop turning the laptop round to show a
// client is a fact about the room the laptop is standing in, not about the
// kitchen on the screen.
//
// It changes what is DRAWN and nothing else. No design field moves, no BOM line
// changes, no cut is different — `lib/wizardTabs.js` is the only reader, and
// all it decides is which nodes of one tree are rendered. Retail is not a
// second wizard with fewer steps; it is the same tree with the workshop's rows
// not built at all (no disabled ghosts, which iron rule 5 forbids by name).

const WORDS = { factory: 'Factory', retail: 'Retail' };
const HINTS = {
  factory: 'Everything — the boards, the sheets, the CNC corner, the measured thicknesses.',
  retail: 'What a client is shown: the materials, the colours, the fronts, the hardware colour.',
};

export default function AudienceToggle({ className = '' }) {
  const audience = useUiStore((s) => s.audience);
  const setAudience = useUiStore((s) => s.setAudience);

  return (
    <div
      className={`flex items-center gap-1 ${className}`}
      data-audience-toggle="1"
      data-audience={audience}
      title={HINTS[audience]}
    >
      <span className="cc-label mb-0">View</span>
      {AUDIENCES.map((id) => (
        <button
          key={id}
          type="button"
          data-audience-option={id}
          aria-pressed={audience === id}
          title={HINTS[id]}
          className={`cc-btn px-2 ${audience === id ? 'border-gold text-gold' : ''}`}
          onClick={() => setAudience(id)}
        >
          {WORDS[id]}
        </button>
      ))}
    </div>
  );
}
