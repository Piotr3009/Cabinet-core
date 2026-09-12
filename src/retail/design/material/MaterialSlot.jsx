import { useState } from 'react';
import MaterialChoicePanel from './MaterialChoicePanel.jsx';
import DecorPicker from './DecorPicker.jsx';
import VeneerPicker from './VeneerPicker.jsx';
import ColourPicker from './ColourPicker.jsx';
import * as A from '../adapter.js';
import { REASONS } from '../reasons.js';
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

/**
 * ─── T67 F4 · THE SOURCE CHIP SAYS "DECOR" ─────────────────────────────────
 *
 * The owner, 11.09.2026: *"nie wpisuj Egger w przycisku głównego menu … nie
 * laminat, bo będzie że cheap."*  His decision, in one word: **DECOR**.
 *
 * The two sources it covers are the profile's `egger` ("EGGER decor") and
 * `laminate` ("Laminate") — the board a carcass and a front are faced with.
 * Every other source keeps the profile's own word, because "veneer" and
 * "sprayed" are what those things ARE and a client knows the difference.
 *
 * WHERE THIS HAPPENS MATTERS. It is RETAIL'S OWN CHROME — this file builds the
 * strip; the copied `MaterialChoicePanel` below only renders what it is given
 * — so not one byte of a copy is touched, and PRO's own panels keep saying
 * EGGER, which is right for a workshop. The EGGER name also stays INSIDE the
 * picker, on the boards themselves, where it is information and where the
 * licence requires it (`adapter.decorLabel`).
 */
const RETAIL_SOURCE_LABEL = { egger: 'DECOR', laminate: 'DECOR' };
const sourceLabel = (s) => RETAIL_SOURCE_LABEL[s.id] || s.label;

export default function MaterialSlot({ kind, title = null }) {
  const m = A.materialSlot(kind);
  const [inline, setInline] = useState(false);

  const categoryStrip = (
    // T66 F11 · `pbi-source-seg` lets the three source buttons WRAP rather than
    // splitting a 337-px column three ways and breaking "EGGER decor" over
    // three lines. Retail's own class on retail's own file — the COPY below
    // (`MaterialChoicePanel`) is untouched.
    <div className="pbi-re-row pbi-re-gap-2 pbi-source-seg" data-source-seg={`${kind}:${m.slot?.id || ''}`}>
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
          {sourceLabel(s)}
        </button>
      ))}
    </div>
  );

  return (
    <div data-material-picker-for={`${kind}:${m.slot?.id || ''}`} data-testid={`material-slot-${kind}`}>
      {/* ─── T69 F4 · ONE SENTENCE AT THE CHOICE ───────────────────────────
          *"One sentence at the choice: 'Unpainted — ready for your own finish.
          We sand it, you paint it.'"*

          It stands ONLY when RAW is the live source, and it is the whole of
          what the step says about it: there is no picker under it — choosing
          RAW ends the choice — so without this sentence the panel would go
          blank and read as a control that failed. */}
      {m.activeSource === A.RAW_FRONT_SOURCE ? (
        <p className="pbi-re-t11 pbi-re-lead-snug pbi-re-quiet" data-testid="material-raw-note">
          {REASONS.rawIsUnpainted}
        </p>
      ) : null}
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
