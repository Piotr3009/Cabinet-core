import Button from '../../ui/Button.jsx';
import { ChipRow, Field, Said } from '../controls.jsx';
import Duty, { DutyRow } from './Duty.jsx';
import { WatchLayoutDrawing } from './drawings.jsx';
import * as A from '../adapter.js';

// ─── T60 F3.6 · THE WATCH DRAWER ───────────────────────────────────────────
//
// Read from PRO's `WatchLayoutModal`.
//
// FOUR LAYOUTS, and they are the engine's four — `WATCH_LAYOUTS` in
// `engine/watchDrawer.js`, with the engine's own ids, labels and hints. The
// little plan beside each chip is drawn from the layout's OWN fields (`rows`,
// `across`, `backStrip`), so a fifth layout added to the engine draws itself
// and none of these four can drift from what is cut.
//
// THE FINISH IS THE T58 PAIR, and it is a pair of two different things:
// `WATCH_FINISHES` holds one entry, `spray`, and `watchFinishOf` answers `null`
// for "the project's own decor". PROJECT is that null. Retail names neither.
//
// THERE IS NO HEIGHT HERE. `addWatchDrawer` stamps the engine's own
// `watchDrawerFixedHeight` and the owner ordered no field for it, so there is
// none — and where the tray will not fit, the engine says why in its own words
// and this shows that sentence rather than a greyed control with a guess under
// it.

export default function WatchMenu({ unitId, item, onBack, onDone, onRemoved }) {
  if (!item) return null;
  const layout = A.watchLayoutOf(item);
  const finish = A.watchFinishIdOf(item);
  const glass = item.watch_shelf_glass === true;
  const glassWhy = A.watchGlassRefusal(unitId, item);
  const said = A.watchFitWords(unitId, item);

  return (
    <Duty title="WATCH DRAWER" onBack={onBack} onDone={onDone}>
      <Field label="LAYOUT">
        <ChipRow
          testid="watch-layout"
          value={layout}
          options={A.watchLayouts().map((l) => ({
            id: l.id,
            label: l.label,
            title: l.hint,
            draw: <WatchLayoutDrawing layout={l} />,
          }))}
          onPick={(id) => A.setWatchLayout(unitId, item.id, id)}
        />
      </Field>

      <Field label="GLASS">
        <ChipRow
          testid="watch-glass"
          value={glass ? 'on' : 'off'}
          options={[
            { id: 'off', label: 'OFF' },
            { id: 'on', label: 'ON', reason: glassWhy },
          ]}
          onPick={(id) => A.setGlassTop(unitId, item.id, id === 'on')}
        />
      </Field>

      <Field label="FINISH">
        <ChipRow
          testid="watch-finish"
          value={finish}
          options={A.watchFinishes().map((f) => ({ id: f.id, label: f.label, title: f.hint }))}
          onPick={(id) => A.setWatchFinish(unitId, item.id, id)}
        />
      </Field>

      <DutyRow>
        <Button
          kind="secondary"
          data-testid="watch-remove"
          onClick={() => { A.removeElement(unitId, item.id); onRemoved(); }}
        >
          REMOVE
        </Button>
      </DutyRow>

      {said.map((w) => <Said key={w} testid="watch-said">{w}</Said>)}
    </Duty>
  );
}
