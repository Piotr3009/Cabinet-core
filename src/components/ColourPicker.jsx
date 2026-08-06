import { useState } from 'react';
import { COLOUR_SYSTEMS, SWATCHES, contrastInk, findColour } from '../lib/pswColors.js';
import { normaliseColour } from '../engine/design.js';

// RAL / Farrow & Ball / a hex you type. The lists and their grouping come
// straight from reference/colors/psw-colors.json (CLAUDE.md phase 6) — the
// grouped dropdown is the shape PSW itself uses, which is the shape Piotr
// already knows.

export default function ColourPicker({ value, onChange, label = 'Colour' }) {
  const current = normaliseColour(value);
  const [system, setSystem] = useState(current?.system === 'F&B' ? 'F&B' : 'RAL');
  const [hexDraft, setHexDraft] = useState(current?.hex || '#');

  const pick = (hex, name, sys) => onChange(normaliseColour({ hex, name, system: sys }));

  const groups = COLOUR_SYSTEMS.find((s) => s.id === system)?.groups || [];

  return (
    <div className="space-y-2">
      <div className="cc-row">
        <span className="cc-label mb-0">{label}</span>
        <div className="flex items-center gap-2">
          {current && (
            <span
              className="px-2 py-0.5 rounded text-[11px] border border-shell-600"
              style={{ background: current.hex, color: contrastInk(current.hex) }}
            >
              {current.name}
            </span>
          )}
          {current && (
            <button type="button" className="cc-btn-ghost" title="Clear the colour" onClick={() => onChange(null)}>×</button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        {SWATCHES.map((s) => (
          <button
            key={s.key}
            type="button"
            title={`${s.name} · ${s.ral}`}
            className={`w-7 h-7 rounded border ${current?.hex === s.hex ? 'border-gold' : 'border-shell-600'}`}
            style={{ background: s.hex }}
            onClick={() => pick(s.hex, s.name, 'RAL')}
          />
        ))}
      </div>

      <div className="flex gap-1">
        {COLOUR_SYSTEMS.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`cc-btn px-2 ${system === s.id ? 'border-gold text-ink-50' : ''}`}
            onClick={() => setSystem(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>

      <select
        className="cc-input"
        value={current?.system === system ? current.hex : ''}
        onChange={(e) => {
          const found = findColour(e.target.value);
          if (found) pick(found.hex, found.name, found.system);
        }}
      >
        <option value="">Choose a {system} colour…</option>
        {groups.map((g) => (
          <optgroup key={g.group} label={g.group}>
            {g.colours.map((c) => <option key={`${g.group}-${c.hex}-${c.name}`} value={c.hex}>{c.name}</option>)}
          </optgroup>
        ))}
      </select>

      <div className="flex items-center gap-1">
        <span className="text-[11px] text-ink-400">or hex</span>
        <input
          className="cc-input w-28"
          value={hexDraft}
          placeholder="#1f3a5f"
          onChange={(e) => {
            setHexDraft(e.target.value);
            const c = normaliseColour({ hex: e.target.value, system: 'custom' });
            // A named colour typed as its own hex keeps its name — the order
            // says "Hague Blue", not "#3a4a4a".
            if (c) onChange(findColour(c.hex) || c);
          }}
        />
      </div>
    </div>
  );
}
