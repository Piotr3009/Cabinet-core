import { useState } from 'react';
import { COLOUR_SYSTEMS, SWATCHES, contrastInk, findColour } from '../../../lib/pswColors.js';
import { normaliseColour } from '../../../engine/design.js';

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
    <div className="pbi-re-stack-2">
      <div className="pbi-re-fieldrow">
        <span className="pbi-re-fieldlabel pbi-re-mb0">{label}</span>
        <div className="pbi-re-row pbi-re-mid pbi-re-gap-2">
          {current && (
            <span
              className="pbi-re-px2 pbi-re-py05 pbi-re-round pbi-re-t11 pbi-re-line pbi-re-hair"
              style={{ background: current.hex, color: contrastInk(current.hex) }}
            >
              {current.name}
            </span>
          )}
          {current && (
            <button type="button" className="pbi-re-btn-ghost" title="Clear the colour" onClick={() => onChange(null)}>×</button>
          )}
        </div>
      </div>

      <div className="pbi-re-row pbi-re-wrap pbi-re-gap-1">
        {SWATCHES.map((s) => (
          <button
            key={s.key}
            type="button"
            title={`${s.name} · ${s.ral}`}
            className={`pbi-re-w7 pbi-re-h7 pbi-re-round pbi-re-line ${current?.hex === s.hex ? 'pbi-re-hair-gold' : 'pbi-re-hair'}`}
            style={{ background: s.hex }}
            onClick={() => pick(s.hex, s.name, 'RAL')}
          />
        ))}
      </div>

      <div className="pbi-re-row pbi-re-gap-1">
        {COLOUR_SYSTEMS.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`pbi-re-btn pbi-re-px2 ${system === s.id ? 'pbi-re-hair-gold pbi-re-ink' : ''}`}
            onClick={() => setSystem(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>

      <select
        className="pbi-re-input"
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

      <div className="pbi-re-row pbi-re-mid pbi-re-gap-1">
        <span className="pbi-re-t11 pbi-re-quiet">or hex</span>
        <input
          className="pbi-re-input pbi-re-w28"
          value={hexDraft}
          placeholder="#5C5B57"
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
