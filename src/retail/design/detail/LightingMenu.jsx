import { ChipRow, Field, Said } from '../controls.jsx';
import Duty from './Duty.jsx';
import * as A from '../adapter.js';

// ─── T60 F3.9 · THE LIGHTING ───────────────────────────────────────────────
//
// Read from PRO's `LightingPanel`.
//
// ─── A STRIP BELONGS TO A BOARD, NOT TO A PROJECT ──────────────────────────
//
// The shared core's lighting items are `{ unitId, kind, ref }` and PRO writes
// `kind: 'shelf'` with the shelf PANEL's own id. Retail writes the identical
// record through `addLightingItem` / `removeLightingItem` — so a strip a client
// switches on is the same strip in the same list the BOM counts metres of.
// This menu is reached by selecting a SHELF, which is the only thing a strip
// can hang under.
//
// ─── AND THE PANE LIGHT IS NOT A SWITCH ────────────────────────────────────
//
// t59 offered a PANE LIGHT chip that called `setLighting({ pane })`.
// `migrateDesign` normalises the block to `{ on, temperature, switch, items }`
// and quietly drops anything else, so that chip wrote to nothing at all — a
// dead control by the letter of the law. And the shared core is right to have
// no switch: the owner specified the ring as AUTOMATIC — *"z automatycznym
// dodaniem leda dookoła szyby"* — and `shelfGlassPlan` cuts it into the same
// board as the opening whenever a pane is cut. So the chip is gone and one true
// line stands where it was.

export default function LightingMenu({
  unitId, panel, project, onBack, onDone,
}) {
  const strips = A.lightingOn(project);
  const strip = panel ? A.shelfStripOf(project, unitId, panel.id) : null;
  const pane = A.paneLight(project, unitId);

  return (
    <Duty title="LIGHTING" onBack={onBack} onDone={onDone}>
      <Field label="THE WARDROBE'S LIGHT">
        <ChipRow
          testid="lighting-strips"
          value={strips ? 'on' : 'off'}
          options={[{ id: 'off', label: 'OFF' }, { id: 'on', label: 'ON' }]}
          onPick={(id) => A.setLighting(id === 'on')}
        />
      </Field>

      {panel ? (
        <Field label="UNDER THIS SHELF">
          <ChipRow
            testid="lighting-shelf"
            value={strip ? 'on' : 'off'}
            options={[{ id: 'off', label: 'OFF' }, { id: 'on', label: 'ON' }]}
            onPick={(id) => A.setShelfStrip(unitId, panel.id, id === 'on')}
          />
        </Field>
      ) : null}

      {pane.present ? <Said testid="lighting-pane">{pane.said}</Said> : null}
    </Duty>
  );
}
