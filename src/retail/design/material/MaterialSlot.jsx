import { useState } from 'react';
import MaterialChoicePanel from './MaterialChoicePanel.jsx';
import DecorPicker from './DecorPicker.jsx';
import VeneerPicker from './VeneerPicker.jsx';
import ColourPicker from './ColourPicker.jsx';
import * as A from '../adapter.js';
import { Button } from '../controls.jsx';

// ─── TURN 63 F4 · ONE SLOT, WIRED THE WAY PRO'S WIZARD WIRES IT ────────────
//
// `MaterialChoicePanel.jsx` beside this file is PRO's — copied, its imports
// repointed, its classes reskinned. It takes what `WizardSettings.jsx
// slotPicker` hands it: the slot's record, the picker the SOURCE names, the
// category strip, and four writers. This file is that hand, for retail: the
// strip is PRO's `sourceSeg` in shape (the same buttons, the same data hooks,
// PRO's own words for the sources read off the profile), and every writer is
// `adapter.js`, which is the same four store setters PRO's wizard calls.
//
// The owner: *"nadal kafelki Egger nie widzę w uzgodnionej wersji."* The
// agreed version is `DecorPickerModal` — the tiled window with search and the
// family bar, a tile chosen and the window closed — and the copied panel
// opens it beside the slot exactly as the wizard does.
//
// ─── AND THE THREE IN-STEP PICKERS, BEHIND ONE LINK ────────────────────────
//
// PRO's older settings surface (`SettingsPanel.jsx`) mounts the same choice
// as an in-step grid — `DecorPicker`, `VeneerPicker`, `ColourPicker`, by the
// picker the source names. All three are copied tonight and reachable here
// under BROWSE HERE, which is PRO's own condition for which one appears.

export default function MaterialSlot({ kind, title = null }) {
  const m = A.materialSlot(kind);
  const [inline, setInline] = useState(false);

  const categoryStrip = (
    <div className="pbi-re-row pbi-re-gap-2" data-source-seg={`${kind}:${m.slot?.id || ''}`}>
      {m.sources.map((s) => (
        <button
          key={s.id}
          type="button"
          className={`pbi-re-grow pbi-re-line pbi-re-round pbi-re-px3 pbi-re-py2 pbi-re-tsm pbi-re-fade ${s.active
            ? 'pbi-re-hair-gold pbi-re-gold pbi-re-fill-soft'
            : 'pbi-re-hair pbi-re-ink-1 pbi-re-fill-hover'}`}
          data-source-option={s.id}
          data-material-category={s.id}
          aria-pressed={s.active}
          data-carcass-source={kind === 'carcass' ? s.id : undefined}
          data-front-source={kind === 'front' ? s.id : undefined}
          title={s.thickness ? `${s.thickness} mm — the thickness rides with the source` : undefined}
          onClick={() => A.setMaterialSource(kind, s.id)}
        >
          {s.label}
        </button>
      ))}
    </div>
  );

  return (
    <div data-material-picker-for={`${kind}:${m.slot?.id || ''}`} data-testid={`material-slot-${kind}`}>
      <MaterialChoicePanel
        kind={kind}
        slot={m.slot}
        title={title}
        picker={m.picker}
        categoryStrip={categoryStrip}
        value={m.value}
        colour={m.colour}
        onDecor={(id) => A.pickMaterialDecor(kind, id)}
        onVeneer={(id) => A.pickMaterialVeneer(kind, id)}
        onColour={(c) => A.pickMaterialColour(kind, c)}
        onClear={() => A.clearMaterialFinish(kind)}
        footer={(
          <Button
            kind="link"
            data-testid={`material-browse-${kind}`}
            onClick={() => setInline((v) => !v)}
          >
            {inline ? 'HIDE THE LIST' : 'BROWSE HERE ›'}
          </Button>
        )}
      />
      {inline && m.picker === 'decor' ? (
        <DecorPicker
          value={m.value}
          onPick={(id) => A.pickMaterialDecor(kind, id)}
          onClear={() => A.clearMaterialFinish(kind)}
        />
      ) : null}
      {inline && m.picker === 'veneer' ? (
        <VeneerPicker
          value={m.value}
          thickness={m.thickness}
          onPick={(id) => A.pickMaterialVeneer(kind, id)}
          onClear={() => A.clearMaterialFinish(kind)}
        />
      ) : null}
      {inline && m.picker === 'colour' ? (
        <ColourPicker
          label={kind === 'carcass' ? 'Sprayed carcass colour' : 'Sprayed front colour'}
          value={m.colour}
          onChange={(c) => A.pickMaterialColour(kind, c)}
        />
      ) : null}
    </div>
  );
}
