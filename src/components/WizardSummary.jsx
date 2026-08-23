import { useEffect, useMemo, useState } from 'react';
import { useProjectStore } from '../stores/projectStore.js';
import { useCabinetProfileStore } from '../stores/cabinetProfileStore.js';
import { useMaterialAssignmentStore } from '../stores/materialAssignmentStore.js';
import { useUiStore } from '../stores/uiStore.js';
import { migrateDesign, projectHeights } from '../engine/design.js';
import { getProjectType } from '../engine/projectTypes.js';
import {
  carcassSources, frontSources, pickerForSource, projectDimensions, sourceById,
} from '../engine/projectSettings.js';
import { hingeStandard } from '../engine/cabinet.js';
import { resolveRunnerVariant } from '../engine/runners.js';
import { thicknessSlotRows } from '../engine/thickness.js';
import { formatMm } from '../engine/format.js';
import { loadDecorCatalogue } from '../lib/decorCatalogue.js';
import { chosenTile } from '../lib/chosenDecor.js';
import { frontOpening, frontOpeningLabel } from '../lib/frontOpening.js';
import { pushToOpenLock, pushToOpenOn } from '../lib/pushToOpen.js';
import { crossTabConflicts } from '../lib/wizardConflicts.js';
import { dimensionAsked, nodeVisible } from '../lib/wizardTabs.js';
import ChosenDecorTile from './ChosenDecorTile.jsx';
import SaveSettingsSetModal from './SaveSettingsSetModal.jsx';

// ─── STEP 6 IS THE SUMMARY (turn 45, CLAUDE.md F4) ──────────────────────────
//
// *"Wizard step `6. Hardware` REMOVED → replaced by `6. Summary`: the whole
// project in miniatures — chosen decor tiles, base dimensions, hardware —
// `Change` per section, and ONE button: `Start designing`. (`Save as set &
// start` is gone; the standard was already offered at the settings finale.)"*
//
// T44's wizard had TWO endings. Step 5 finished with its own `Podsumowanie`
// sub-tab — a summary of the settings — and then the wizard walked on to step
// 6, "Hardware", which asked four questions tab 5.4 had already asked, and
// ended in a row of two buttons that both started the job.
//
// One ending survives, and it is the one that shows the WHOLE project: the
// decors as the same single tiles the tabs show (F3 — `ChosenDecorTile`, so the
// two surfaces cannot disagree), the numbers the job is cut at, the hardware,
// and — for the workshop — what was measured. Every section carries a `Change`
// that goes BACK TO THE SCREEN THAT ASKED, which is the whole point of a
// summary and is also F7's rule stated once more: nothing here re-asks
// anything, and going back and returning costs no answer.
//
// The retail filter is the same filter. Every section names its node
// (`lib/wizardTabs.js` `summary.*`), so a client's summary is BUILT smaller
// rather than built and then hidden — iron rule 5's own wording.

/** One section of the summary: a heading, its Change, and its rows. */
function Section({
  node, audience, title, onChange, changeLabel = 'Change…', children,
}) {
  if (!nodeVisible(node, audience)) return null;
  return (
    <section
      className="border border-shell-600 rounded-lg p-3 space-y-2"
      data-summary-section={node}
      // The same stamp every node of the tree carries, so the DOM audit walks
      // one page and compares it with one table (lib/wizardTabs.js).
      data-wizard-node={node}
    >
      <div className="cc-row">
        <span className="text-[11px] uppercase tracking-[0.16em] text-gold flex-1">{title}</span>
        {onChange && (
          <button
            type="button"
            className="cc-btn px-2.5"
            data-summary-change={node}
            title={changeLabel}
            onClick={onChange}
          >
            Change…
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

/** One `label · value` line. */
function Row({ label, value }) {
  if (value == null || value === '') return null;
  return (
    <div className="flex items-baseline gap-2 text-[12px]" data-summary-row={label}>
      <span className="w-48 shrink-0 text-ink-400">{label}</span>
      <span className="text-ink-100">{String(value)}</span>
    </div>
  );
}

/**
 * @param {object} props
 *   onChangeTab  (tabId) => void — back to step 5, standing on that sub-tab
 *   onChangeStep (stepId) => void — back to one of the wizard's earlier steps
 *   extra        what a later feature hangs under the last section (F9's
 *                lighting summary uses it), rendered inside this screen so the
 *                one ending stays one ending
 */
export default function WizardSummary({
  onChangeTab = null, onChangeStep = null, onJump = null, blockers = [], extra = null,
}) {
  const project = useProjectStore((s) => s.project);
  const storedDesign = useProjectStore((s) => s.project.design);
  const profile = useCabinetProfileStore((s) => s.profile);
  const materials = useMaterialAssignmentStore((s) => s.materials);
  const audience = useUiStore((s) => s.audience);

  const design = useMemo(() => migrateDesign(storedDesign), [storedDesign]);
  const heights = useMemo(() => projectHeights(design, profile), [design, profile]);
  const type = getProjectType(design.projectType);

  // The pack, for the tiles' pictures and words — the same one request the app
  // already made at the top (`App.jsx`); this shares it rather than repeating it.
  const [decors, setDecors] = useState([]);
  useEffect(() => {
    let alive = true;
    loadDecorCatalogue().then((res) => {
      if (alive && Array.isArray(res.decors)) setDecors(res.decors);
    });
    return () => { alive = false; };
  }, []);

  const [saveSetOpen, setSaveSetOpen] = useState(false);

  /** What ONE slot was faced in, as the tile every other surface draws. */
  const tileFor = (t, kind) => {
    const list = kind === 'carcass' ? carcassSources(profile) : frontSources(profile);
    const src = sourceById(list, t.source) || sourceById(list, kind === 'carcass' ? 'egger' : 'laminate');
    const picker = pickerForSource(src);
    // A FRONT's veneer picks from the decor catalogue (T20 F12.3) — the same
    // rule the tab reads, asked of the engine rather than restated here.
    const body = picker === 'veneer' && kind === 'front' ? 'decor' : picker;
    return chosenTile({
      picker: body,
      value: t.finish_id,
      colour: kind === 'carcass' ? design.colour.carcass : t.colour,
      decors,
    });
  };

  const frontTypes = design.fronts.types.length ? design.fronts.types : [{
    id: 'f1', label: 'Front 1', style: null, material_id: null, finish_id: null, colour: design.colour.front,
  }];
  const thicknessRows = useMemo(
    () => thicknessSlotRows({ design, profile, materials }),
    [design, profile, materials],
  );
  const boardOf = (t) => materials.find((m) => m.id === t.material_id) || null;
  const metals = profile.appearance.metals;
  const internal = design.hardware.shelfSleeve || profile.appearance.metalDefault;
  const hingeFinish = design.hinges.finish || profile.hardware.hinge?.defaultFinish || 'nickel';
  const runnerVariant = resolveRunnerVariant({ design, profile });
  // T45 F5: the summary says what the BOM will order, and says WHY when the
  // handles took the choice away. One sentence, from the one rule.
  const ptoLock = pushToOpenLock(design);
  // ─── TURN 45 (CLAUDE.md F7): "…(Summary included)" ───────────────────────
  //
  // *"Fixing it returns the user STRAIGHT to where they were (Summary
  // included)."* So the summary carries the same notes, with the same jumps,
  // read off the same reader — and coming back from one lands here rather than
  // at the top of the walk.
  const conflicts = crossTabConflicts({
    design, heights, roomHeight: Number(project.room?.height) || 0, profile,
  });

  return (
    <div className="space-y-3" data-wizard-summary="1" data-summary="1" data-summary-audience={audience}>
      <p className="text-[11px] text-ink-400">
        The whole job, in miniatures. Every section goes back to the screen that asked it — and comes
        straight back here with every answer intact.
      </p>

      {/* ─── T45 F7: WHAT STILL STANDS BETWEEN HERE AND THE CANVAS ─────────
          `Start designing` is the one button that commits, so it is the one
          that still refuses a job that cannot be built — but it refuses it OUT
          LOUD, here, beside a door to the fix, rather than in a tooltip on a
          grey button. A materials blocker is answered on the carcases and
          fronts tabs; a ceiling one is answered by the notes under it. */}
      {blockers.filter((b) => b.code === 'materials').map((b) => (
        <div
          key={b.code}
          className="cc-row rounded border border-status-danger/60 bg-status-danger/10 px-2 py-1.5"
          data-blocker={b.code}
        >
          <span className="text-[11px] text-status-danger flex-1">{b.message}</span>
          {onChangeTab && (
            <button
              type="button"
              className="cc-btn px-2 shrink-0"
              data-blocker-goto="carcases"
              onClick={() => onChangeTab('carcases')}
            >
              Take me to it…
            </button>
          )}
        </div>
      ))}

      {conflicts.map((c) => (
        <div
          key={c.code}
          className="cc-row rounded border border-status-danger/60 bg-status-danger/10 px-2 py-1.5"
          data-conflict={c.code}
          data-conflict-field={c.field}
        >
          <span className="text-[11px] text-status-danger flex-1">{c.message}</span>
          {c.culprit && onJump && (
            <button
              type="button"
              className="cc-btn px-2 shrink-0"
              data-conflict-jump={c.culprit}
              title={`Open ${c.culpritLabel} — you come straight back to this summary`}
              onClick={() => onJump(c.culprit)}
            >
              {c.jumpLabel}
            </button>
          )}
          {!c.culprit && onChangeTab && (
            <button
              type="button"
              className="cc-btn px-2 shrink-0"
              data-conflict-goto={c.tab}
              onClick={() => onChangeTab(c.tab)}
            >
              Take me to it…
            </button>
          )}
        </div>
      ))}

      <Section
        node="summary.project"
        audience={audience}
        title="The job"
        onChange={onChangeStep ? () => onChangeStep('info') : null}
        changeLabel="Back to step 1"
      >
        <Row label="Number" value={project.number || '—'} />
        <Row label="Client" value={project.client || '—'} />
        <Row label="Type" value={type.label} />
        <Row label="Scope" value={design.scope === 'room' ? 'Whole room' : 'One wall'} />
      </Section>

      <Section
        node="summary.decors"
        audience={audience}
        title="What it is made of"
        onChange={onChangeTab ? () => onChangeTab('carcases') : null}
        changeLabel="Back to the materials"
      >
        <div className="grid grid-cols-2 gap-2">
          {design.carcass.types.map((t) => (
            <div key={t.id} data-summary-tile={`carcass:${t.id}`}>
              <span className="block text-[10px] uppercase tracking-wide text-ink-400 mb-1">{t.label}</span>
              <ChosenDecorTile tile={tileFor(t, 'carcass')} slot={`carcass:${t.id}`} label={t.label} compact readOnly />
            </div>
          ))}
          {frontTypes.map((t) => (
            <div key={t.id} data-summary-tile={`front:${t.id}`}>
              <span className="block text-[10px] uppercase tracking-wide text-ink-400 mb-1">{t.label}</span>
              <ChosenDecorTile tile={tileFor(t, 'front')} slot={`front:${t.id}`} label={t.label} compact readOnly />
            </div>
          ))}
        </div>
        <Row label="Front shape" value={design.fronts.style || 'project default'} />
        <Row label="Opening" value={frontOpeningLabel(frontOpening(design))} />
        <Row label="Drawer boxes" value={(design.drawerBoxes.mode ?? 'same') === 'ready'
          ? 'Ready-made system' : 'Same board as the carcass'}
        />
      </Section>

      <Section
        node="summary.dimensions"
        audience={audience}
        title="The numbers it is cut at"
        onChange={onChangeTab ? () => onChangeTab('settings') : null}
        changeLabel="Back to the settings"
      >
        {projectDimensions(design, profile, heights)
          .filter((d) => dimensionAsked(d.key, design.projectType))
          .map((d) => (
            <Row
              key={d.key}
              label={d.key === 'toeKick' ? 'Plinth height (toe kick)' : d.label}
              value={`${formatMm(d.value)} mm`}
            />
          ))}
        <Row label="Room height" value={project.room?.height ? `${formatMm(project.room.height)} mm` : '—'} />
      </Section>

      <Section
        node="summary.hardware"
        audience={audience}
        title="Hardware"
        onChange={onChangeTab ? () => onChangeTab('hardware') : null}
        changeLabel="Back to the hardware"
      >
        <Row label="Hinge finish" value={hingeFinish === 'onyx' ? 'Onyx' : 'Silver'} />
        <Row label="Internal metal" value={metals[internal]?.label || '—'} />
        {nodeVisible('hardware.hinge-standard', audience) && (
          <Row label="Hinges per door" value={hingeStandard(design.hinges?.standard, profile)} />
        )}
        {nodeVisible('hardware.runners', audience) && (
          <Row label="Runner variant" value={`MOVENTO ${runnerVariant}`} />
        )}
        <Row
          label="Push-to-open"
          value={pushToOpenOn(design, profile) ? 'On' : `Off${ptoLock.locked ? ' · locked' : ''}`}
        />
        {ptoLock.locked && (
          <p className="text-[11px] text-status-warn" data-summary-push-lock="1">{ptoLock.reason}</p>
        )}
      </Section>

      <Section
        node="summary.production"
        audience={audience}
        title="Production"
        onChange={onChangeTab ? () => onChangeTab('production') : null}
        changeLabel="Back to production"
      >
        <Row label="Infill at the wall" value={`${design.infill.sideWidth} mm`} />
        {design.carcass.types.map((t, i) => {
          const row = thicknessRows.find((r) => r.id === `carcass${i + 1}`);
          const board = boardOf(t);
          return row ? (
            <Row
              key={t.id}
              label={`${t.label} — ${board ? board.name : 'no stock board'}`}
              value={`${formatMm(row.measured)} mm${row.confirmed ? ' · measured' : ''}`}
            />
          ) : null;
        })}
        {frontTypes.slice(0, 2).map((t, i) => {
          const row = thicknessRows.find((r) => r.id === `front${i + 1}`);
          const board = boardOf(t);
          return row ? (
            <Row
              key={t.id}
              label={`${t.label} — ${board ? board.name : 'no stock board'}`}
              value={`${formatMm(row.measured)} mm${row.confirmed ? ' · measured' : ''}`}
            />
          ) : null;
        })}
      </Section>

      {extra}

      {/* ─── THE FINALE, ASKED ONCE AND AT THE END (F8's own words) ──────────
          *"the save-set finale → `Save these as your standard?`"*. It is not a
          second way out of this screen: the ONE button that leaves is `Start
          designing`, in the wizard's own footer. This is the offer that used to
          sit under T44's settings summary, standing where that summary now
          stands. */}
      {nodeVisible('summary.save-set', audience) && (
        <div
          data-summary-section="summary.save-set"
          data-wizard-node="summary.save-set"
          className="border-t border-dashed border-shell-600 pt-2"
        >
          <button
            type="button"
            className="cc-btn px-3"
            data-open-save-set="1"
            onClick={() => setSaveSetOpen(true)}
          >
            Save these as your standard?
          </button>
          <p className="text-[10px] text-ink-400 mt-1">
            The next job starts from it by name — or start designing, and this project keeps them to itself.
          </p>
        </div>
      )}

      {saveSetOpen && (
        <SaveSettingsSetModal
          design={design}
          suggestion={project.name || `${type.label} standard`}
          onClose={() => setSaveSetOpen(false)}
        />
      )}
    </div>
  );
}
