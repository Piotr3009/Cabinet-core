import FrontDecorationControls from './FrontDecorationControls.jsx';
import { useEffect, useMemo, useState } from 'react';
import { useProjectStore } from '../stores/projectStore.js';
import { useUiStore } from '../stores/uiStore.js';
import { useSettingsSetsStore } from '../stores/settingsSetsStore.js';
import { useCabinetProfileStore } from '../stores/cabinetProfileStore.js';
import { useMaterialAssignmentStore } from '../stores/materialAssignmentStore.js';
// ─── T-CC2a F11 (CLAUDE.md T-CC2a laws 2 and 3): THE SLOT, ITS ENTRY AND ITS LINK ─
// The three MaterialStock selects are gone (the Deletion licence): a board is
// what the design says (its source, decor, colour, thickness), its catalogue
// entry follows from it (engine/catalogue.js, the resolver the cut list reads),
// and the company's link to its Joinery Core stock says what is bought.
import { useMaterialLinkStore } from '../stores/materialLinkStore.js';
import {
  NOT_IN_CATALOGUE, boardChoiceOfEntry, catalogueIdOfBoard, entriesOf, entryById,
} from '../engine/catalogue.js';
import { LINK_WORDS } from '../engine/bom.js';
import { decorById, decorLabel } from '../engine/decors.js';
import { linkStatus, matchesEntry } from '../lib/linkSuggest.js';
import { Photo } from './MaterialPicker.jsx';
import {
  FRONT_STYLE_OPTIONS, colourLabel, finishById, frontStyleSelection, migrateDesign, projectHeights, resolveJoinery,
  INFRAME_CHOICES, inframeHint, inframeTooltip,
} from '../engine/design.js';
import { RUN_MATERIAL_GROUPS, boardChoiceOfPanel, runMaterialSetting } from '../engine/materials.js';
import {
  carcassSources, frontSources, hardwareChoices, pickerForSource, projectBoardThickness,
  projectDimensions, projectFrontThickness, saveButtonState, settingsSectionSnapshot, sourceById,
} from '../engine/projectSettings.js';
import { formatMm } from '../engine/format.js';
// ─── TURN 24 (CLAUDE.md F3): THE CALIPER, NOT THE LABEL ─────────────────────
import {
  drawerBoxGate, projectThicknesses, thicknessOf, thicknessSlotRows,
} from '../engine/thickness.js';
import { hingePlatePilotD, hingeStandard } from '../engine/cabinet.js';
// Turn 35 (CLAUDE.md F15): the board on the bed, per family — one resolver, so
// the buttons and check #7 read the same answer.
import { sheetOptionIdFor, sheetSizeForFamily } from '../engine/checks.js';
import {
  hingeAngleFor, resolveHingeFinish, resolveHingePlate, resolveHingeSystem,
} from '../engine/hinges.js';
import { resolveRunnerVariant } from '../engine/runners.js';
import { PROJECT_TYPES as PROJECT_TYPE_OPTIONS } from '../engine/projectTypes.js';
import { contrastInk } from '../lib/pswColors.js';
import SheenSlider from './SheenSlider.jsx';
import JoineryPreview from './JoineryPreview.jsx';
import DecorPicker from './DecorPicker.jsx';
import VeneerPicker from './VeneerPicker.jsx';
import ColourPicker from './ColourPicker.jsx';
import FrontStyleGallery, { FrontStyleArt } from './FrontStyleGallery.jsx';
import NumberField from './NumberField.jsx';
import { shakerFrameMm } from '../engine/shaker.js';
import { useAuthStore } from '../stores/authStore.js';
import { STYLE_NOT_OFFERED, frontStylesFor, styleNotOffered } from '../lib/tenantFlags.js';

// ─── THE SETTINGS SURFACE (turn 12, CLAUDE.md F1) ───────────────────────────
//
// ONE component. It is opened from the top bar as a modal and shown as step 5
// of the new-project flow, and those are two doors into the same room rather
// than two rooms furnished alike.
//
// Turn 11 shipped step 5 as a COPY of the Design-settings modal, and the owner
// hit both consequences within minutes of opening the app:
//
//   • THE SCENE IGNORED IT. The copy set the front colour by writing
//     `design.fronts.types[0].colour`; every consumer in the app reads
//     `design.colour.front`. Two fields for one fact, one of them wired to
//     nothing. Fixed at the root, in engine/design.js — front type 1's colour
//     IS the project's front colour now, and `withFrontColour` is the only way
//     to set either half. Nothing in this file can get that wrong again,
//     because there is nothing in this file that could write only one of them.
//   • ROOM SETUP WENT MISSING. A job whose scope is "wall units" skips the room
//     step, and once step 5 was showing there was no way back to it. The button
//     is in the Project section below, so the room is reachable from the
//     settings surface wherever the settings surface is.
//
// The CONTENT is the union of the two, with nothing dropped: step 5's
// dimensions, carcasses, fronts, hardware and thickness, and the older modal's
// project facts, decor picker, wall infill, door styles and joinery preview. A
// section that existed in both exists once.
//
// It reads the design from the STORE rather than taking it as a prop. That is
// the "ONE data path" of CLAUDE.md F1.1 made structural: an entry point cannot
// hand this component a different design to edit, because it cannot hand it one
// at all.

/**
 * @param {object} props
 *   onRoomSetup  opens the room editor. Left out, the button is not shown —
 *                which is what the new-project flow wants, since the room step
 *                is two clicks behind it.
 */
export default function SettingsPanel({ onRoomSetup = null }) {
  // T-CC1b F14 . the ornate fronts are Skylon's (*"ornamenty zostaw tylko dla Skylon Joinery"*, the owner, 01.11.2026).
  const tenantId = useAuthStore((s) => s.tenant?.id);
  // Select the STORED value and migrate in a memo: a selector that builds a new
  // object every call makes zustand's snapshot change on every render, which
  // React reports as "Maximum update depth exceeded".
  const storedDesign = useProjectStore((s) => s.project.design);
  const design = useMemo(() => migrateDesign(storedDesign), [storedDesign]);
  const profile = useCabinetProfileStore((s) => s.profile);
  const notify = useUiStore((s) => s.notify);
  // Turn 18 (CLAUDE.md F6.4): what the WHOLE JOB is fitted with — no unit and
  // no drawer, so this is the project level of the hierarchy on its own.
  const projectRunnerVariant = resolveRunnerVariant({ design, profile });

  const setDesign = useProjectStore((s) => s.setDesign);
  const setProjectHeights = useProjectStore((s) => s.setProjectHeights);
  const setProjectDefaults = useProjectStore((s) => s.setProjectDefaults);
  // Turn 24 (CLAUDE.md F3.1): one slot's measured thickness and its tick.
  const setSlotThickness = useProjectStore((s) => s.setSlotThickness);
  // Turn 17 (CLAUDE.md F7.1): how many hinges this job hangs a door on.
  const setHingeStandard = useProjectStore((s) => s.setHingeStandard);
  // Turn 18 (CLAUDE.md F6.4): …and which runner it fits its drawers with.
  const setRunnerVariant = useProjectStore((s) => s.setRunnerVariant);
  // Turn 19 (CLAUDE.md F1.1): …and which HINGE — system, finish, plate.
  const setHingeHardware = useProjectStore((s) => s.setHingeHardware);
  // ─── TURN 35 (CLAUDE.md F8 / F15) ────────────────────────────────────────
  // Two WORKSHOP numbers land in this panel this turn — the hinge-plate pilot
  // and the two sheet sizes — and a workshop number is the profile's, not the
  // project's, so they are written through the profile store rather than
  // through `setDesign`. `setProfile` migrates, persists and pushes into the
  // engine's single read point in one call (stores/cabinetProfileStore.js).
  const setProfile = useCabinetProfileStore((s) => s.setProfile);
  // F8: what this job's plates are pilot-drilled at — the engine's own
  // resolver, so the buttons and the drilling read one answer.
  const platePilot = hingePlatePilotD(profile);
  const setShelfSleeve = useProjectStore((s) => s.setShelfSleeve);
  const setCarcassTypes = useProjectStore((s) => s.setCarcassTypes);
  const setCarcassFinish = useProjectStore((s) => s.setCarcassFinish);
  const setCarcassSource = useProjectStore((s) => s.setCarcassSource);
  const setFrontTypes = useProjectStore((s) => s.setFrontTypes);
  const setFrontType = useProjectStore((s) => s.setFrontType);
  const setFrontColour = useProjectStore((s) => s.setFrontColour);
  const setRunMaterial = useProjectStore((s) => s.setRunMaterial);
  const addDoorStyle = useProjectStore((s) => s.addDoorStyle);
  const updateDoorStyle = useProjectStore((s) => s.updateDoorStyle);
  const removeDoorStyle = useProjectStore((s) => s.removeDoorStyle);

  const materials = useMaterialAssignmentStore((s) => s.materials);
  const units = useProjectStore((s) => s.units);
  const unitCount = units.length;
  // T-CC2a F11.2: the back panels and the drawer bottoms on a sheet of their own (null = "As today").
  const setDesignBoard = useProjectStore((s) => s.setDesignBoard);

  const [picking, setPicking] = useState(null);          // { carcassId } | null
  const [joineryOpen, setJoineryOpen] = useState(false);
  const [editingStyle, setEditingStyle] = useState(null);
  // ── Owner, 09.08: each big section gets a red SAVE that folds it away ──
  //
  // ─── Turn 15 (CLAUDE.md F1.1): …AND THE SAVE TURNS GREEN ───
  // A red button that stays red after you press it says nothing back. Pressed,
  // it goes GREEN with a tick and the section folds.
  //
  // ─── TURN 16 (CLAUDE.md F5): …AND STAYS GREEN ────────────────────────────
  //
  // The owner's verdict on that: it shows for a moment. It did, because SAVED
  // was the same flag as FOLDED — a boolean in this component — so opening the
  // section again, or closing Settings and coming back, put it back to red with
  // nothing having changed.
  //
  // The two facts are separated now. FOLDED is still a view preference and
  // still lives here. SAVED is a SNAPSHOT of the section's own data, kept in
  // the ui store so it survives this component being unmounted, and the colour
  // is a pure comparison against it (engine/projectSettings.js). Green means
  // "what is on the screen is what was saved"; red means something has changed
  // since — which is the only thing a Save button should ever mean.
  const [folded, setFolded] = useState({ carcass: false, fronts: false });
  const settingsSaved = useUiStore((s) => s.settingsSaved);
  const markSettingsSaved = useUiStore((s) => s.markSettingsSaved);
  const snapshots = useMemo(() => ({
    carcass: settingsSectionSnapshot(design, 'carcass'),
    fronts: settingsSectionSnapshot(design, 'fronts'),
  }), [design]);
  const saveState = (key) => saveButtonState(settingsSaved[key], snapshots[key]);
  const saveSection = (key) => {
    markSettingsSaved(key, snapshots[key]);
    setFolded((f) => ({ ...f, [key]: true }));
  };
  const editSection = (key) => setFolded((f) => ({ ...f, [key]: false }));
  // ── The HARD gate (owner: B + hard gates): a board whose thickness differs
  // from what the project is DRAWN at cannot be assigned silently once units
  // exist. This holds the offered assignment while the owner decides. ──
  const [thickGate, setThickGate] = useState(null);      // { typeId, material } | null

  const heights = useMemo(() => projectHeights(design, profile), [design, profile]);
  const dimensions = useMemo(
    () => projectDimensions(design, profile, heights),
    [design, profile, heights],
  );

  const finishes = profile.appearance.finishes;
  // What the project is DRAWN at today. T-CC2a law 2: a board is what the design
  // says, so the thickness is the project's own (its typed number, else carcass
  // 1's source), never a Joinery Core stock row's.
  const drawnBoardT = projectBoardThickness(design, profile);
  // Is this type the one that PINS the project's thickness? Carcass 1 and only
  // carcass 1 — one G per project, the kit's own boundary (#58). Types 2–3 are
  // cost lines, not geometry.
  const pinsThickness = (typeId) => typeId === design.carcass.types[0]?.id;
  // The HARD gate, in one place (owner 09.08: B + hard gates). Anything that
  // would change what the project is DRAWN at, once cabinets exist, asks first.
  const gateOrApply = (typeId, thickness, label, apply) => {
    if (unitCount > 0 && pinsThickness(typeId) && Number(thickness) > 0 && thickness !== drawnBoardT) {
      setThickGate({
        typeId, thickness, label, apply,
      });
      return;
    }
    apply();
    if (pinsThickness(typeId) && Number(thickness) > 0) {
      setProjectDefaults({ thickness: { board: thickness, custom: null } });
    }
  };

  // T-CC2a F11.1: `assignBoard` and the front type's `assignFrontBoard` (with
  // the fronts' own thickness gate, reached only through its select) are gone
  // with the MaterialStock selects (the Deletion licence). The SOURCE still
  // goes through `gateOrApply` above, unchanged.

  // ─── TURN 24 (CLAUDE.md F3): THE SIX SLOTS, RESOLVED ─────────────────────
  //
  // One derivation for the rows the surface draws and for the numbers the
  // engine computes from — `engine/thickness.js` — so a field and a formula
  // cannot disagree about what a board measures.
  const thicknessRows = useMemo(
    () => thicknessSlotRows({ design, profile, materials }),
    [design, profile, materials],
  );
  const boxGate = useMemo(() => drawerBoxGate(design), [design]);
  // F3.4: the turn-16 identity gate, extended. Changing a CONFIRMED thickness
  // with cabinets on the floor asks first — the same warning, the same two
  // buttons, the same full recompute — because those cabinets were cut to the
  // number that was there at the time.
  const [slotGate, setSlotGate] = useState(null);   // { id, label, was, next }
  const commitMeasured = (row, value) => {
    const next = Number(value);
    if (!(next > 0) || next === Number(row.measured)) return;
    if (unitCount > 0 && row.confirmed) {
      setSlotGate({
        id: row.id, label: row.label, was: row.measured, next,
      });
      return;
    }
    setSlotThickness(row.id, { measured: next });
  };

  // ─── Turn 15 (CLAUDE.md F3.3) ───
  // A carcass SOURCE pins a thickness the same way a board does — an EGGER
  // board is 18 and a veneered carcass is 19 — so choosing one goes through the
  // same gate. Before this turn only the board assignment did, which meant the
  // one control that CAN silently recut a kitchen was the one that did not ask.
  const chooseCarcassSource = (typeId, src) => {
    gateOrApply(typeId, src?.thickness, src?.label || 'that source', () => setCarcassSource(typeId, src?.id || null));
  };
  const frontMaterials = materials.filter((m) => m.category === 'front');
  const joinery = resolveJoinery(design, profile);
  const PS = profile.projectSettings;
  const frontTypes = design.fronts.types.length
    ? design.fronts.types
    : [{
      id: 'f1', label: 'Front 1', source: PS.frontSources[0].id, colour: null, material_id: null,
    }];
  const board = projectBoardThickness(design, profile);
  // T-CC2a law 2: the doors are cut at front type 1's source, never a stock row's thickness.
  const frontBoard = projectFrontThickness(design, profile);
  // The slots' boards as the engine resolves them (engine/materials.js boardChoiceOfPanel).
  const allResults = useProjectStore((s) => s.allResults);
  const slotsOf = useMemo(() => slotChoices(design, profile, allResults ? allResults() : []), [design, profile, units, allResults]);

  const setDimension = (key, value) => {
    if (key === 'depth') { setProjectDefaults({ depth: value }); return; }
    const { notices } = setProjectHeights({ [key]: value });
    for (const n of notices) notify(n, 'warn');
  };

  return (
    <div className="space-y-4" data-settings-surface="1">
      {/* ── the project itself, its saved sets, and the room ── */}
      <ProjectSection design={design} setDesign={setDesign} onRoomSetup={onRoomSetup} />

      <div className="cc-divider" />

      {/* ── 1. default dimensions (CLAUDE.md F9.1) ── */}
      <section className="space-y-2">
        <div className="cc-row">
          <span className="text-xs uppercase tracking-wide text-ink-200">Default dimensions</span>
          <ProjectHeightNotice />
        </div>
        <div className="grid grid-cols-6 gap-2">
          {dimensions.map((d) => (
            <label key={d.key} className="block">
              <span className="cc-label">{d.label}</span>
              <NumberField
                className="cc-input text-right"
                data-dimension={d.key}
                value={d.value}
                title={`Every ${d.key === 'depth' ? 'unit' : 'new unit of that kind'} starts here — one may still be given its own`}
                onCommit={(v) => setDimension(d.key, v)}
              />
            </label>
          ))}
          {/* The sixth number the old modal had and step 5 did not: how high a
              wall unit hangs. Same setter, so it is not a sixth data path. */}
          <label className="block">
            <span className="cc-label">Wall mount height</span>
            <NumberField
              className="cc-input text-right"
              data-dimension="wallMount"
              value={heights.wallMount}
              title="How high a wall unit hangs"
              onCommit={(v) => setDimension('wallMount', v)}
            />
          </label>
        </div>
        <p className="text-[11px] text-ink-400">
          Pre-filled from the workshop profile — the UK standard. A unit may still be given its own height
          in the panel; this is where every new one starts.
        </p>
      </section>

      <div className="cc-divider" />

      {/* ── 2a. carcasses (CLAUDE.md F9.2; owner 09.08: hints, SAVE, fold) ── */}
      <section className="cc-frame space-y-2" data-settings-section="carcass">
        <div className="cc-row">
          <span className="text-xs uppercase tracking-wide text-ink-200">
            Carcasses
            <span className="ml-2 normal-case tracking-normal text-[11px] text-ink-400">— choose material types</span>
          </span>
          <SaveButton
            section="carcass"
            state={saveState('carcass')}
            folded={folded.carcass}
            onSave={() => saveSection('carcass')}
            onEdit={() => editSection('carcass')}
          />
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-ink-400" title="How many carcass types this project will use">types</span>
            {Array.from({ length: PS.maxCarcassTypes }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                className={`cc-btn px-2 ${design.carcass.types.length === n ? 'border-gold text-ink-50' : ''}`}
                onClick={() => setCarcassTypes(n)}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {folded.carcass ? (
          /* ─── Turn 15 (CLAUDE.md F1.2): the THICKNESS is on the folded line ───
             The owner's red box round the folded summary said "THICK": a
             carcass line that names the board but not how thick the project is
             DRAWN at hides the one number every cut in the job is measured
             from. It is the PROJECT thickness, not the board's own — those are
             the same until somebody keeps 18 and assigns a 22 mm board, and
             that is exactly the moment the line has to say which one won. */
          <div className="cc-row text-[12px] text-ink-300" data-folded="carcass">
            <span className="flex-1">
              {design.carcass.types.map((t) => `${t.label}: ${entryNameOf(slotsOf.carcass(t), profile)}`).join('   ·   ')}
              <span className="text-ink-100" data-folded-thickness="1">{`   ·   ${formatMm(drawnBoardT)} mm`}</span>
            </span>
            <button type="button" className="cc-btn px-2" onClick={() => editSection('carcass')}>Edit</button>
          </div>
        ) : (<>
        {design.carcass.types.map((t) => {
          const chosen = t.source || PS.carcassSources[0].id;
          const chosenSource = sourceById(carcassSources(profile), chosen) || carcassSources(profile)[0];
          const carcassPicker = pickerForSource(chosenSource);
          const finish = finishById(profile, t.finish_id)
            || finishById(profile, design.finish.carcass)
            || finishById(profile, profile.appearance.defaultCarcassFinish);
          return (
            <div key={t.id} className="border border-shell-600 rounded p-2 space-y-2" data-carcass-type={t.id}>
              <div className="cc-row">
                <span className="text-sm text-ink-50 flex-1">{t.label}</span>
                <div className="flex gap-1">
                  {carcassSources(profile).map((src) => (
                    <button
                      key={src.id}
                      type="button"
                      data-carcass-source={src.id}
                      className={`cc-btn px-2 ${chosen === src.id ? 'border-gold text-gold' : ''}`}
                      title={`${src.label} — ${formatMm(src.thickness)} mm board`}
                      onClick={() => chooseCarcassSource(t.id, src)}
                    >
                      {src.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* COLOUR FIRST, then the stock beneath it — the owner's order, and
                  the right one: a workshop decides what the job LOOKS like and
                  then finds the board that is that colour. */}
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded border border-shell-600 shrink-0" style={{ background: finish?.hex || '#7a7a7a' }} />
                <span className="text-[11px] text-ink-400 flex-1 truncate">{finish?.label || 'Project finish'}</span>
                <button
                  type="button"
                  className="cc-btn px-2"
                  data-carcass-picker={carcassPicker || 'none'}
                  onClick={() => setPicking(picking?.carcassId === t.id ? null : { carcassId: t.id })}
                >
                  {{ colour: 'Colour…', veneer: 'Veneer…', decor: 'Decor…' }[carcassPicker] || 'Finish…'}
                </button>
              </div>

              {picking?.carcassId === t.id && (
                <div className="border border-shell-600 rounded p-2 space-y-2">
                  {/* Which picker: the SOURCE's own answer, exactly as it is for
                      the fronts (turn 15, CLAUDE.md F3). A sprayed carcass is a
                      colour, not a board — CLAUDE.md F9.2 says so explicitly
                      ("yes, carcasses can be sprayed") — and since F3.3 a
                      veneered one picks from the fronts' own veneer list. */}
                  {carcassPicker === 'colour' && (
                    <ColourPicker
                      label="Sprayed carcass colour"
                      value={design.colour.carcass}
                      onChange={(c) => setDesign({ colour: { ...design.colour, carcass: c } })}
                    />
                  )}
                  {carcassPicker === 'veneer' && (
                    <VeneerPicker
                      value={t.finish_id}
                      thickness={chosenSource.thickness}
                      onPick={(id) => setCarcassFinish(t.id, id)}
                      onClear={() => setCarcassFinish(t.id, null)}
                    />
                  )}
                  {carcassPicker === 'decor' && (
                    <>
                      <DecorPicker
                        value={t.finish_id}
                        onPick={(id) => setCarcassFinish(t.id, id)}
                        onClear={() => setCarcassFinish(t.id, null)}
                      />
                      <div className="flex flex-wrap gap-1">
                        {finishes.map((f) => (
                          <button key={f.id} type="button" className="cc-btn px-2" onClick={() => setCarcassFinish(t.id, f.id)}>
                            {f.label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {(() => {
                const gateHere = thickGate && thickGate.typeId === t.id ? thickGate : null;
                return (
                  <div className="space-y-1">
                    {/* T-CC2a F11.1: the slot's catalogue entry and the company's link, under its WHAT. */}
                    <SlotLink choice={slotsOf.carcass(t)} testId={`carcass:${t.id}`} />
                    {gateHere && (
                      /* The HARD gate, in the open (owner 09.08): the project is
                         DRAWN at one thickness and this choice is another.
                         Nothing changes until the owner says which truth wins.
                         Turn 15: a SOURCE reaches it too, not only a board. */
                      <div className="cc-row rounded border border-status-warn/60 bg-status-warn/10 px-2 py-1" data-thickness-gate="1">
                        <span className="text-[11px] text-status-warn flex-1">
                          Project is drawn at {formatMm(drawnBoardT)} mm — {gateHere.label} is {formatMm(gateHere.thickness)} mm.
                        </span>
                        <button
                          type="button"
                          className="cc-btn px-2"
                          onClick={() => {
                            gateHere.apply();
                            setProjectDefaults({ thickness: { board: gateHere.thickness, custom: null } });
                            setThickGate(null);
                            notify(`Project recomputed at ${formatMm(gateHere.thickness)} mm`, 'warn');
                          }}
                        >
                          Recompute at {formatMm(gateHere.thickness)}
                        </button>
                        <button type="button" className="cc-btn px-2" onClick={() => setThickGate(null)}>
                          Keep {formatMm(drawnBoardT)} — pick another
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          );
        })}

        <p className="text-[11px] text-ink-400">
          Board thickness: <span className="text-ink-200">{formatMm(drawnBoardT)}</span>, from carcass 1&apos;s source.
          One board thickness per project — the kit's own boundary (#58). Changing it once cabinets
          exist asks first, and recuts everything.
        </p>
        {/* T-CC2a F11.2: the back panels and the drawer bottoms, "As today" or another sheet of the same thickness. */}
        <DesignBoardSlots design={design} onChange={setDesignBoard} />
        </>)}
      </section>

      <div className="cc-divider" />

      {/* ── 2b. fronts (CLAUDE.md F9.2) ── */}
      <section className="cc-frame space-y-2" data-settings-section="fronts">
        <div className="cc-row">
          <span className="text-xs uppercase tracking-wide text-ink-200">Fronts</span>
          <SaveButton
            section="fronts"
            state={saveState('fronts')}
            folded={folded.fronts}
            onSave={() => saveSection('fronts')}
            onEdit={() => editSection('fronts')}
          />
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-ink-400" title="How many front types this project will use">types</span>
            {Array.from({ length: PS.maxFrontTypes }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                className={`cc-btn px-2 ${frontTypes.length === n ? 'border-gold text-ink-50' : ''}`}
                onClick={() => setFrontTypes(n)}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {folded.fronts ? (
          <div className="cc-row text-[12px] text-ink-300" data-folded="fronts">
            <span className="flex-1">
              {frontTypes.map((t) => `${t.label}: ${t.source || 'spray'}${frontChoiceLabel(t) ? ` · ${frontChoiceLabel(t)}` : ''}`).join('   ·   ')}
              {`   ·   style: ${FRONT_STYLE_OPTIONS.find((o) => o.id === design.fronts.style)?.label || design.fronts.style}`}
              <span className="text-ink-100" data-folded-thickness="1">{`   ·   ${formatMm(frontBoard)} mm`}</span>
            </span>
            <button type="button" className="cc-btn px-2" onClick={() => editSection('fronts')}>Edit</button>
          </div>
        ) : (<>
        {/* The SHAPE is chosen in the gallery below (turn 15, CLAUDE.md F4) —
            this strip reports it, with its own little drawing, so the Fronts
            section still says what the doors look like without offering a
            second control that could disagree with the first. */}
        <div className="cc-row">
          <span className="cc-label mb-0">Standard front</span>
          <span className="flex items-center gap-2">
            <FrontStyleArt styleId={design.fronts.style} className="w-5 h-7 text-gold shrink-0" />
            <span className="text-sm text-ink-100">
              {FRONT_STYLE_OPTIONS.find((o) => o.id === design.fronts.style)?.label || design.fronts.style}
            </span>
            <span className="text-[11px] text-ink-400">— picked in Door style, below</span>
          </span>
        </div>

        {frontTypes.map((t) => {
          const src = sourceById(frontSources(profile), t.source) || frontSources(profile)[0];
          const picker = pickerForSource(src);
          const facing = finishById(profile, t.finish_id);
          return (
            <div key={t.id} className="border border-shell-600 rounded p-2 space-y-2" data-front-type={t.id}>
              <div className="cc-row">
                <span className="text-sm text-ink-50 flex-1">{t.label}</span>
                <span className="text-[11px] text-ink-400">{formatMm(src.thickness)} mm</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {frontSources(profile).map((one) => (
                  <button
                    key={one.id}
                    type="button"
                    data-front-source={one.id}
                    className={`cc-btn px-2 ${src.id === one.id ? 'border-gold text-gold' : ''}`}
                    title={`${one.label} — ${formatMm(one.thickness)} mm`}
                    onClick={() => setFrontType(t.id, { source: one.id })}
                  >
                    {one.label}
                    {one.coloursSoon && <span className="cc-tag ml-1">colours soon</span>}
                  </button>
                ))}
              </div>

              {/* ─── Turn 15 (CLAUDE.md F3.1/F3.2): THE RIGHT PICKER ───
                  Which question this source asks is the SOURCE's own answer
                  (profile.projectSettings.frontSources `picker`), read through
                  `pickerForSource`. That is what fixes the owner's "mega ważne":
                  a Laminate front was offering RAL palettes and a Veneer front
                  was too, and neither is a paint. A fifth source added to the
                  profile tomorrow names its picker there — not here. */}
              {picker === 'decor' && (
                <>
                  {facing && (
                    <p className="text-[11px] text-ink-200" data-front-facing={t.id}>
                      Faced in <span className="text-gold">{facing.label}</span>
                    </p>
                  )}
                  <DecorPicker
                    value={t.finish_id}
                    onPick={(id) => setFrontType(t.id, { finish_id: id })}
                    onClear={() => setFrontType(t.id, { finish_id: null })}
                  />
                </>
              )}
              {picker === 'veneer' && (
                <>
                  {facing && (
                    <p className="text-[11px] text-ink-200" data-front-facing={t.id}>
                      Faced in <span className="text-gold">{facing.label}</span>
                    </p>
                  )}
                  <VeneerPicker
                    value={t.finish_id}
                    thickness={src.thickness}
                    onPick={(id) => setFrontType(t.id, { finish_id: id })}
                    onClear={() => setFrontType(t.id, { finish_id: null })}
                  />
                </>
              )}
              {picker === 'colour' && (
                <ColourPicker
                  label={`${src.label} colour`}
                  value={t.colour}
                  onChange={(c) => setFrontColour(c, t.id)}
                />
              )}
              {picker === null && (
                <p className="text-[11px] text-ink-400">
                  The wood colour range arrives in a later turn. The option is here so a job set up in wood
                  keeps its choice; the colours are not yet.
                </p>
              )}

              {/* ─── Turn 16 (CLAUDE.md F1.1): THE BOARD BEHIND THE LOOK ───
                  The same MaterialStock dropdown a carcass type has had since
                  turn 11, on the front types — which is the hole the whole
                  turn is about. Until now a front had a colour and a facing and
                  NO stock, so "what board are these doors cut from" had no
                  answer anywhere in the project, the BOM could not name it and
                  the CNC sheet could not group by it. */}
              {/* T-CC2a F11.1: the front type's catalogue entry and the company's link; the MaterialStock
                  select and the gate it alone reached are gone (the Deletion licence). */}
              <SlotLink choice={slotsOf.front(t)} testId={`front:${t.id}`} />
            </div>
          );
        })}

        {/* ─── Turn 16 (CLAUDE.md F1.2): THE RUN PIECES ───────────────────────
            "Infills, plinths, end panels and masking panels get a material
            control with a checkbox 'Same as fronts', DEFAULT ON. On = they
            follow front type 1's board. Unticked = an own MaterialStock
            dropdown appears for that group."
            ONE component, four switches — the list is `RUN_MATERIAL_GROUPS` in
            engine/materials.js and the resolver reads the same four keys, so a
            fifth run piece is a data entry and not a widget. */}
        <div className="border border-shell-600 rounded p-2 space-y-1.5" data-run-materials="1">
          <span className="text-[11px] uppercase tracking-wide text-ink-400">
            Infills, plinths, end panels, masking panels
          </span>
          {RUN_MATERIAL_GROUPS.map((g) => {
            const setting = runMaterialSetting(design, g.id);
            return (
              <div key={g.id} className="space-y-1" data-run-material={g.id}>
              <div className="cc-row">
                <span className="text-sm text-ink-100 w-32 shrink-0" title={g.hint}>{g.label}</span>
                <label className="flex items-center gap-1.5 text-[11px] text-ink-200 shrink-0">
                  <input
                    type="checkbox"
                    data-same-as-fronts={g.id}
                    checked={setting.sameAsFronts}
                    onChange={(e) => setRunMaterial(g.id, { sameAsFronts: e.target.checked })}
                  />
                  <span>Same as fronts</span>
                </label>
                {setting.sameAsFronts ? (
                  <span className="text-[11px] text-ink-400 flex-1 text-right truncate">{frontTypes[0]?.label || 'Front 1'}</span>
                ) : <span className="flex-1" />}
              </div>
              {/* T-CC2a F11.1/F11.2: what it is cut from, and its link; unticked, "As today" or another sheet. */}
              {setting.sameAsFronts
                ? <SlotLink choice={slotsOf.run(g.id)} testId={`run:${g.id}`} />
                : (
                  <BoardSlotPicker
                    slot={g.id}
                    label={g.label}
                    thickness={slotsOf.thicknessOf(g.id)}
                    value={design.boards?.[g.id] || null}
                    today={slotsOf.run(g.id)}
                    onChange={(choice) => setDesignBoard?.(g.id, choice)}
                  />
                )}
              </div>
            );
          })}
          <p className="text-[11px] text-ink-400">
            Ticked, these are cut from front 1&apos;s board — which is what a workshop means by
            &quot;same as the doors&quot;, and what puts them on the same CNC sheet. Untick one to give
            that group a board of its own.
          </p>
        </div>
        <p className="text-[11px] text-ink-400">
          Front 1 is the project&apos;s front colour — it is what the scene paints and what the cut list
          names. End panels and infills are cut from it too. One cabinet&apos;s own can be changed by
          selecting the piece in the canvas.
        </p>
        <p className="text-[11px] text-ink-400">
          Shape only — colour lives with the front types above. Little style pictures arrive later.
        </p>
        </>)}
      </section>

      <div className="cc-divider" />

      {/* ── 2c. hardware (CLAUDE.md F9.2) ── */}
      <section className="space-y-2">
        <span className="text-xs uppercase tracking-wide text-ink-200">Hardware</span>
        <div className="space-y-1">
          {hardwareChoices(design, profile).map((h) => (
            <div key={h.key} className="cc-row">
              <div className="flex flex-col flex-1">
                <span className="text-sm text-ink-100">{h.label}</span>
                <span className="text-[11px] text-ink-400">
                  {h.fits ? `Fitted automatically: ${h.fits.join(', ')}` : (h.auto || h.hint || 'Fitted automatically')}
                </span>
              </div>
              {h.variants ? (
                <div className="flex gap-1">
                  {h.variants.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      className={`cc-btn px-2 ${h.chosen === v.id ? 'border-gold text-gold' : ''}`}
                      onClick={() => setProjectDefaults({ hardware: { [h.key]: v.id } })}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              ) : (
                <span className="cc-tag">automatic</span>
              )}
            </div>
          ))}
        </div>
        {/* ─── Turn 17 (CLAUDE.md F7.1): STANDARD HINGES ────────────────────
            How many hinges this JOB hangs a door on. Three is what every kit
            has drilled since turn 1, so a project that never touches this is
            cut exactly as it was. Two takes ONE MIDDLE hinge off each door and
            leaves the outer ones where the rule put them — the drilling in the
            export, the hinge bodies in 3D and the BOM's hardware count all
            follow, because all three count the same list. */}
        <div className="cc-row" data-hinge-standard="1">
          <div className="flex flex-col flex-1">
            <span className="text-sm text-ink-100">Standard hinges</span>
            <span className="text-[11px] text-ink-400">
              How many per door. On 2, each door loses one MIDDLE hinge — the outer ones never move.
            </span>
          </div>
          <div className="flex gap-1">
            {profile.hinges.standardOptions.map((n) => (
              <button
                key={n}
                type="button"
                data-hinge-standard-option={n}
                aria-pressed={hingeStandard(design.hinges?.standard, profile) === n}
                className={`cc-btn px-2 ${hingeStandard(design.hinges?.standard, profile) === n ? 'border-gold text-gold' : ''}`}
                onClick={() => setHingeStandard(n)}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        {/* ─── Turn 19 (CLAUDE.md F1.1): WHICH HINGE, NOT HOW MANY ─────────
            The project level of the owner's two-level model: "jeden główny
            wybór przypisany". Three answers — the SYSTEM the workshop stocks,
            the FINISH this job is ordered in, and the PLATE it is drilled for
            — and not one of them is the ANGLE, because the angle is not a
            choice: the front's own thickness decides it, and a wardrobe door
            with a drawer behind it takes the 155° so the drawer can clear it.
            The line under the controls says what the job's fronts resolve to
            today, so the rule is visible rather than folklore. */}
        <HingeHardware
          design={design}
          profile={profile}
          frontThickness={projectFrontThickness(design, profile, materials)}
          onChange={setHingeHardware}
        />

        {/* ─── TURN 35 (CLAUDE.md F8): THE HINGE-PLATE PILOT ─────────────────
            Owner, 16.08.2026: "nie mamy ustawienia w ogóle 5 mm czy 3 mm
            screws zawiasy wiercenie — niektórzy używają tak, inni inaczej",
            and where it belongs: "to ustawienie musi być w hardware
            ustawieniach". Default "5, jak jest teraz", so a shop that never
            opens this drills exactly what it drilled yesterday.

            The diameter goes into the CNC file the only way a diameter has
            ever gone into one here — in the LAYER NAME, HINGES_3MM beside
            HINGES_5MM. No text style rides with it (the 02.08 VCarve law). */}
        <div className="cc-row" data-hinge-plate-pilot="1">
          <div className="flex flex-col flex-1">
            <span className="text-sm text-ink-100">Hinge plate pilot</span>
            <span className="text-[11px] text-ink-400">
              What the plate is fixed with. ⌀5 knocks in, ⌀3 screws — the holes land on
              HINGES_{platePilot === 3 ? '3' : '5'}MM, which is what the machine maps its tool by.
            </span>
          </div>
          <div className="flex gap-1">
            {profile.hinges.platePilotOptions.map((d) => (
              <button
                key={d}
                type="button"
                data-hinge-plate-pilot-option={d}
                aria-pressed={platePilot === d}
                className={`cc-btn px-2 ${platePilot === d ? 'border-gold text-gold' : ''}`}
                onClick={() => setProfile({ ...profile, hinges: { ...profile.hinges, platePilotD: d } })}
              >
                ⌀{d}
              </button>
            ))}
          </div>
        </div>

        {/* ─── Turn 25 (CLAUDE.md F6.1): THE SHELF SUPPORTS ──────────────────
            "He wants to SEE gold or silver sleeves." Two buttons, beside the
            hinge finish because it is the same kind of decision — what the
            ironmongery in this job is plated in. It reaches the PICTURE and
            nothing else: the fitting sits in the ⌀7.5 this engine has drilled
            since turn 1, so no cut and no order follows from it. */}
        <div className="cc-row" data-shelf-sleeve="1">
          <div className="flex flex-col flex-1">
            <span className="text-sm text-ink-100">Shelf supports</span>
            <span className="text-[11px] text-ink-400">
              The sleeve and pin an adjustable shelf stands on — in the ⌀7.5 the machine already
              bores. A fixed shelf has none, and that is how you tell them apart.
            </span>
          </div>
          <div className="flex gap-1">
            {Object.entries(profile.appearance.metals).map(([id, m]) => (
              <button
                key={id}
                type="button"
                data-shelf-sleeve-option={id}
                aria-pressed={(design.hardware.shelfSleeve || profile.appearance.metalDefault) === id}
                className={`cc-btn px-2 ${(design.hardware.shelfSleeve || profile.appearance.metalDefault) === id ? 'border-gold text-gold' : ''}`}
                onClick={() => setShelfSleeve(id)}
              >
                <span
                  className="inline-block w-3 h-3 rounded-full align-middle mr-1 border border-shell-600"
                  style={{ background: m.colour }}
                />
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* ─── Turn 18 (CLAUDE.md F6.4): THE RUNNERS ────────────────────────
            The SYSTEM the workshop stocks and the VARIANT this job is fitted
            with. It is HARDWARE and not geometry: Blum's own installation page
            says the gaps, the pockets and the drilling do not change with the
            motion technology, so a T drawer and an S drawer are cut identically
            and differ in what is bought and in what you see on screen.
            A single drawer can say otherwise — select it in the editor. */}
        <div className="cc-row" data-runner-system="1">
          <div className="flex flex-col flex-1">
            <span className="text-sm text-ink-100">Runners</span>
            <span className="text-[11px] text-ink-400">
              Blum MOVENTO {profile.hardware.runner.movento.system} — the length follows the cabinet depth.
            </span>
          </div>
          <span className="cc-tag">MOVENTO {profile.hardware.runner.movento.system}</span>
        </div>
        <div className="cc-row" data-runner-variant="1">
          <div className="flex flex-col flex-1">
            <span className="text-sm text-ink-100">Runner variant</span>
            <span className="text-[11px] text-ink-400">
              {runnerVariantHint(profile, projectRunnerVariant)}
            </span>
          </div>
          <div className="flex gap-1">
            {profile.hardware.runner.movento.variants.map((v) => (
              <button
                key={v.id}
                type="button"
                data-runner-variant-option={v.id}
                aria-pressed={projectRunnerVariant === v.id}
                title={v.hint}
                className={`cc-btn px-2 ${projectRunnerVariant === v.id ? 'border-gold text-gold' : ''}`}
                onClick={() => setRunnerVariant(v.id)}
              >
                {v.id}
              </button>
            ))}
          </div>
        </div>
        <p className="text-[11px] text-ink-400">
          Every one of these is fitted by the automat and counted in the BOM. You pick the variant; it
          picks the item. One cabinet&apos;s own hinges can be added, removed and moved by hand —
          select its door in the editor.
        </p>
      </section>



      <div className="cc-divider" />

      {/* ── the filler between a unit and the wall ── */}
      <section className="space-y-2">
        <span className="text-xs uppercase tracking-wide text-ink-200">Infill at the wall</span>
        <div className="flex items-center gap-2">
          <NumberField
            className="cc-input w-24 text-right"
            min={0}
            value={design.infill.sideWidth}
            onCommit={(v) => setDesign({ infill: { ...design.infill, sideWidth: v } })}
          />
          <span className="text-[11px] text-ink-400">mm — the filler between a unit and the wall</span>
        </div>
      </section>

      <div className="cc-divider" />

      {/* ── sheen: one slider for every sprayed surface in the job ── */}
      <SheenSlider design={design} setDesign={setDesign} profile={profile} />

      <div className="cc-divider" />

      {/* ── T80 F2 · the fronts: lay-on or in-frame, per project ── */}
      <InframeRow design={design} setDesign={setDesign} profile={profile} />

      <div className="cc-divider" />

      {/* ── how the carcass is held together ── */}
      <section className="space-y-2">
        <span className="text-xs uppercase tracking-wide text-ink-200">Joinery type</span>
        <div className="flex flex-wrap gap-2">
          {profile.joinery.types.map((t) => (
            <button
              key={t.id}
              type="button"
              title={t.hint}
              // T45 F4: the wizard's REPEAT of this table went (iron rule 4 —
              // "the repeated joinery table goes"). This is the one that stays,
              // so it takes the hook the audit follows the choice by.
              data-joinery-option={t.id}
              aria-pressed={joinery?.id === t.id}
              className={`border rounded px-3 py-2 text-left transition-colors ${joinery?.id === t.id
                ? 'border-gold bg-shell-700'
                : 'border-shell-600 hover:bg-shell-700'}`}
              onClick={() => { setDesign({ joinery: t.id }); setJoineryOpen((v) => !v || joinery?.id !== t.id); }}
            >
              <span className="block text-sm text-ink-50">{t.label}</span>
              <span className="block text-[10px] text-ink-400">{t.hint}</span>
            </button>
          ))}
        </div>
        {joineryOpen && joinery ? (
          <div className="border border-shell-600 rounded p-2 bg-shell-800">
            <JoineryPreview profile={profile} joinery={joinery} />
          </div>
        ) : (
          <p className="text-[11px] text-ink-400">Click a joinery type again to see the joint.</p>
        )}
      </section>

      <div className="cc-divider" />

      {/* ── 2c. THE CALIPER (turn 24, CLAUDE.md F3) ──────────────────────────
          The owner's law: the manufacturer never tells you the board is really
          18.5 — the CALIPER does, and the engine must compute from the caliper.
          Six slots, each with the manufacturer's nominal as a SEED, the number
          somebody measured, and the tick that says somebody measured it. The
          drawer box is a HARD GATE: no thickness, no drawers. */}
      <section className="cc-frame space-y-2" data-settings-section="thickness">
        <div className="cc-row">
          <span className="text-xs uppercase tracking-wide text-ink-200 flex-1">Measured thickness</span>
          {boxGate.blocked && (
            <span className="text-[10px] px-1.5 py-0.5 rounded border border-status-warn text-status-warn" data-box-gate="1">
              no drawers yet
            </span>
          )}
        </div>
        <p className="text-[11px] text-ink-400">
          The manufacturer never tells you the board is really 18.5 — the caliper does. Type what
          you measured and tick it; every formula in the app computes from that number and nothing
          rounds it.
        </p>
        <ul className="space-y-1" data-thickness-slots="1">
          {thicknessRows.map((row) => (
            <li key={row.id} className="cc-row" data-thickness-slot={row.id}>
              <span className="text-[12px] text-ink-100 w-24 shrink-0" title={row.hint}>{row.label}</span>
              <span className="text-[11px] text-ink-400 w-20 shrink-0" data-slot-nominal={row.id}>
                nominal {formatMm(row.nominal)}
              </span>
              <NumberField
                className="cc-input w-20 text-right"
                data-slot-measured={row.id}
                value={row.measured}
                onCommit={(v) => commitMeasured(row, v)}
              />
              <label className="flex items-center gap-1 text-[11px] text-ink-300">
                <input
                  type="checkbox"
                  data-slot-confirmed={row.id}
                  checked={row.confirmed}
                  onChange={(e) => setSlotThickness(row.id, { confirmed: e.target.checked })}
                />
                measured
              </label>
              {row.dirty && (
                <span className="text-[10px] text-gold" data-slot-dirty={row.id} title="The caliper disagrees with the label — which is normal.">
                  ≠ label
                </span>
              )}
            </li>
          ))}
        </ul>
        {/* ─── F3.4: THE IDENTITY GATE, EXTENDED ───
            The turn-16 rule stands and now covers this field: changing a
            CONFIRMED thickness with cabinets on the floor asks first and then
            recomputes everything. Never silent — those cabinets were cut to
            the number that was there at the time. */}
        {slotGate && (
          <div className="cc-row rounded border border-status-warn/60 bg-status-warn/10 px-2 py-1" data-slot-thickness-gate="1">
            <span className="text-[11px] text-status-warn flex-1">
              {slotGate.label} is drawn at {formatMm(slotGate.was)} mm and {unitCount} cabinet
              {unitCount === 1 ? '' : 's'} {unitCount === 1 ? 'is' : 'are'} cut to it —
              {' '}{formatMm(slotGate.next)} mm recuts {unitCount === 1 ? 'it' : 'them all'}.
            </span>
            <button
              type="button"
              className="cc-btn px-2"
              data-slot-gate-apply="1"
              onClick={() => {
                setSlotThickness(slotGate.id, { measured: slotGate.next });
                notify(`${slotGate.label} recomputed at ${formatMm(slotGate.next)} mm`, 'warn');
                setSlotGate(null);
              }}
            >
              Recompute at {formatMm(slotGate.next)}
            </button>
            <button type="button" className="cc-btn-ghost px-2" data-slot-gate-keep="1" onClick={() => setSlotGate(null)}>
              Keep {formatMm(slotGate.was)}
            </button>
          </div>
        )}
        {boxGate.blocked && (
          <p className="text-[11px] text-status-warn" data-box-gate-message="1">{boxGate.message}</p>
        )}
      </section>

      <div className="cc-divider" />

      {/* ── TURN 35 (CLAUDE.md F15): THE BOARD ON THE BED, PER FAMILY ──────
          Owner, 16.08: "musimy wpisywać wymiary w setup produkcyjne płyt —
          jak mamy bok 2600 a maksymalna płyta 2400, to niech nie pozwoli",
          and the list: "z listy wybór — Jumbo 2070 × 2800, Standard 1220 ×
          2440, 10 foot 1020 × 3050, i Other, i tu wpisujemy sami. To musi być
          w carcases I fronty."

          TWO selectors because a shop does not buy its carcass board and its
          front board off the same rack. Check #7 then measures every panel
          against ITS OWN family's sheet and says, in red, what to do about
          one that will not go — it never splits anything itself. That
          decision is the owner's. */}
      <section className="cc-frame space-y-2" data-settings-section="sheet">
        <div className="cc-row">
          <span className="text-xs uppercase tracking-wide text-ink-200">Sheet sizes</span>
        </div>
        <p className="text-[11px] text-ink-400">
          The biggest board the shop can buy in each family. Check #7 refuses a panel that will
          not fit — loudly, and without splitting anything: that decision is yours.
        </p>
        <SheetSizeRow
          family="carcasses"
          label="Carcasses"
          hint="Sides, tops, bottoms, backs, shelves, infills and plinths."
          profile={profile}
          onChange={(size) => setProfile({ ...profile, cnc: { ...profile.cnc, sheetCarcass: size } })}
        />
        <SheetSizeRow
          family="fronts"
          label="Fronts"
          hint="Doors, drawer fronts, end panels and masking boards."
          profile={profile}
          onChange={(size) => setProfile({ ...profile, cnc: { ...profile.cnc, sheetFronts: size } })}
        />
      </section>

      <div className="cc-divider" />

      {/* ── door style: the GALLERY, then the workshop's own styles (F4) ── */}
      <section className="cc-frame space-y-2" data-settings-section="door-style">
        <div className="cc-row">
          <span className="text-xs uppercase tracking-wide text-ink-200">Door style</span>
          <button
            type="button"
            className="cc-btn"
            data-new-style="1"
            onClick={() => {
              const id = addDoorStyle({
                name: `Style ${design.doorStyles.length + 1}`,
                frontType: design.fronts.style,
                ...(design.fronts.decoration ? { decoration: design.fronts.decoration } : {}),
                material_id: frontMaterials[0]?.id || null,
                colour: design.colour.front,
              });
              setEditingStyle(id);
            }}
          >
            + New style
          </button>
        </div>

        {/* ─── Turn 15 (CLAUDE.md F4): the gallery, not a dropdown ───
            "There will be MANY kitchen/front styles — never a bare dropdown."
            A tile per shape with its own little drawing, a filter box and a
            scroll, and the whole list is DATA — engine/design.js for the ids,
            engine/frontStyleArt.js for the pictures. Style number thirty costs
            two data entries and no component work (F4.2). */}
        <FrontStyleGallery
          value={design.fronts.style}
          styles={frontStylesFor(tenantId, { current: design.fronts.style })}
          onPick={(id) => setDesign({ fronts: { ...design.fronts, ...frontStyleSelection(id, design.fronts) } })}
        />

        {styleNotOffered(tenantId, design.fronts.style) && (
          <p className="text-[11px] text-ink-400" data-style-not-offered>{STYLE_NOT_OFFERED}</p>
        )}
        <FrontDecorationControls
          style={design.fronts.style}
          value={design.fronts.decoration}
          onChange={(decoration) => setDesign({ fronts: { ...design.fronts, decoration } })}
        />

        {/* ─── Turn 25 (CLAUDE.md F3.1): THE SHAKER FRAME ───
            Equal on all four sides — "shaker zawsze równy" — so it is ONE
            field and there is deliberately no rail/stile pair beside it.
            10…200 mm, and where a front is too small to take it the app SAYS
            so on the cabinet rather than quietly cutting a narrower frame
            (F3.2); the message is the engine's own and reaches the unit's
            warnings. */}
        {design.fronts.style === 'S' && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-ink-400 w-28">Shaker frame</span>
            <NumberField
              className="cc-input w-24"
              value={shakerFrameMm(design, profile)}
              min={profile.front.types.S.frameMin}
              max={profile.front.types.S.frameMax}
              onCommit={(v) => setDesign({ fronts: { ...design.fronts, shakerFrame: v } })}
            />
            <span className="text-[11px] text-ink-400">
              mm, equal all round · {profile.front.types.S.frameMin}–{profile.front.types.S.frameMax} ·
              {' '}panel recessed {profile.front.types.S.recessDepth} mm
            </span>
          </div>
        )}

        {/* ─── TURN 33 (CLAUDE.md F10): THE SHELF-PIN CONTROL IS GONE ───
            The owner: "piny do półek default 50 mm bez ustawiania — kiedyś
            było ustawiane, teraz już nie trzeba." The T30 field that stood
            here is the turn's ONE SANCTIONED REMOVAL beside F7's hinge
            block: the profile answers 50 (shelfHoles.ownerPinSetback, dated),
            a saved project's own number is still honoured through the same
            design field, and the BARE engine stays on the LISP's 70. */}

        <div className="cc-divider" />
        <span className="text-[11px] uppercase tracking-wide text-ink-400">The workshop&apos;s own styles</span>

        {design.doorStyles.length === 0 && (
          <p className="text-[11px] text-ink-400">
            No styles yet. A style is a name, a front type and a material/colour — assign it to units from the
            parameter panel.
          </p>
        )}

        <ul className="space-y-2">
          {design.doorStyles.map((style) => (
            <li key={style.id} className="border border-shell-600 rounded p-2 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  className="cc-input flex-1"
                  value={style.name}
                  onChange={(e) => updateDoorStyle(style.id, { name: e.target.value })}
                />
                <select
                  className="cc-input w-28"
                  value={style.frontType}
                  onChange={(e) => {
                    const selected = frontStyleSelection(e.target.value, style);
                    updateDoorStyle(style.id, { frontType: selected.style, decoration: selected.decoration });
                  }}
                >
                  {frontStylesFor(tenantId, { current: style.frontType }).map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
                <select
                  className="cc-input w-40"
                  value={style.material_id || ''}
                  onChange={(e) => updateDoorStyle(style.id, { material_id: e.target.value || null })}
                >
                  <option value="">No material</option>
                  {frontMaterials.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                <select
                  className="cc-input w-32"
                  title="What this style looks like"
                  value={style.finish_id || ''}
                  onChange={(e) => updateDoorStyle(style.id, { finish_id: e.target.value || null })}
                >
                  <option value="">Project finish</option>
                  {finishes.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
                </select>
                {style.colour && (
                  <span
                    className="px-2 py-0.5 rounded text-[11px] border border-shell-600"
                    style={{ background: style.colour.hex, color: contrastInk(style.colour.hex) }}
                    title={colourLabel(style.colour)}
                  >
                    {style.colour.name}
                  </span>
                )}
                <button
                  type="button" className="cc-btn-ghost"
                  onClick={() => setEditingStyle(editingStyle === style.id ? null : style.id)}
                >
                  {editingStyle === style.id ? 'Hide' : 'Colour'}
                </button>
                <button type="button" className="cc-btn-ghost text-status-danger" onClick={() => removeDoorStyle(style.id)}>×</button>
              </div>
              {styleNotOffered(tenantId, style.frontType) && (
                <p className="text-[11px] text-ink-400" data-style-not-offered>{STYLE_NOT_OFFERED}</p>
              )}
              <FrontDecorationControls
                style={style.frontType}
                value={style.decoration}
                onChange={(decoration) => updateDoorStyle(style.id, { decoration })}
              />
              {editingStyle === style.id && (
                <ColourPicker
                  label={`${style.name} colour`}
                  value={style.colour}
                  onChange={(c) => updateDoorStyle(style.id, { colour: c })}
                />
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/**
 * The section SAVE (turn 15, CLAUDE.md F1.1; a STATE since turn 16, F5).
 *
 * RED "Save" while this section holds something that has not been saved; GREEN
 * with a tick when what is on the screen is what was saved — and it STAYS
 * green through a re-render, through folding the section away and through
 * closing Settings and opening it again, because the answer is a comparison
 * against the saved data rather than a flag somebody set.
 *
 * Pressing it while it is green does not "unsave" anything: it opens the
 * section for editing, and the button stays green until an edit actually
 * changes something.
 *
 * One component for both sections, so the two can never disagree about what
 * "saved" looks like, and the colours are the app's own status palette
 * (`.cc-btn-save` / `.cc-btn-saved` in index.css) rather than hex in JSX.
 */
function SaveButton({
  section, state, folded, onSave, onEdit,
}) {
  const saved = !state.dirty;
  return (
    <button
      type="button"
      className={saved ? 'cc-btn-saved px-3' : 'cc-btn-save px-3'}
      data-save-section={section}
      data-saved={saved ? '1' : '0'}
      data-folded={folded ? '1' : '0'}
      title={saved
        ? (folded ? 'Saved — click to open this section again' : 'Saved. Nothing has changed since.')
        : 'Saves these choices and folds the section away'}
      onClick={saved && folded ? onEdit : onSave}
    >
      {state.label}
    </button>
  );
}

/**
 * What a front type has actually been given — a colour if it is sprayed, the
 * decor or veneer it is faced with if it is a board (turn 15, F3).
 *
 * The folded summary printed `t.colour?.name` and nothing else, so a laminate
 * front faced in H1180 folded away as "Front 1: laminate" and the one decision
 * that was made vanished.
 */
function frontChoiceLabel(type) {
  if (type?.finish_id) return finishById(null, type.finish_id)?.label || type.finish_id;
  return type?.colour?.name || '';
}

/**
 * The project's own facts (turn 7, BACKLOG #41): its number, its client, what
 * kind of job it is — and the SAVED SETS, which are how a workshop stops making
 * the same five decisions on every job.
 *
 * ─── Turn 12 (CLAUDE.md F1.2): AND THE ROOM ───
 * "Room setup returns: reachable from the Settings menu (and anywhere it lived
 * before)." It lived in the new-project flow, which SKIPS it for a wall-units
 * job — and once step 5 was showing there was no way back to it at all. A
 * button here means the room is one click from the settings surface, whichever
 * of the two doors was used to get in.
 */
function ProjectSection({ design, setDesign, onRoomSetup }) {
  const project = useProjectStore((s) => s.project);
  // T-CC1a F4.3: the number and the client are Joinery Core's, read-only here (the item name is edited in the top bar).
  const notify = useUiStore((s) => s.notify);
  const sets = useSettingsSetsStore((s) => s.sets);
  const applyTo = useSettingsSetsStore((s) => s.applyTo);
  const saveSet = useSettingsSetsStore((s) => s.save);
  const removeSet = useSettingsSetsStore((s) => s.remove);
  const [name, setName] = useState('');

  const apply = (id) => {
    const next = applyTo(design, id);
    if (!next) { notify('That settings set is no longer on this computer.', 'warn'); return; }
    setDesign(next);
    notify('Saved settings applied.', 'ok');
  };

  return (
    <section className="space-y-2">
      <div className="cc-row">
        <span className="text-xs uppercase tracking-wide text-ink-200">Project</span>
        {onRoomSetup && (
          <button type="button" className="cc-btn" data-room-setup="1" onClick={onRoomSetup}>
            Room setup…
          </button>
        )}
      </div>
      <div className="grid grid-cols-3 gap-3">
        <label className="block">
          <span className="cc-label">Number</span>
          <input
            className="cc-input"
            value={project.number || ''}
            readOnly
            title="Joinery Core's: read-only in Cabinet Core"
          />
        </label>
        <label className="block">
          <span className="cc-label">Client</span>
          <input
            className="cc-input"
            value={project.client || ''}
            readOnly
            title="Joinery Core's: read-only in Cabinet Core"
          />
        </label>
        <label className="block">
          <span className="cc-label">Type</span>
          <select
            className="cc-input"
            value={design.projectType || ''}
            onChange={(e) => setDesign({ projectType: e.target.value || null })}
          >
            <option value="">Not set</option>
            {PROJECT_TYPE_OPTIONS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </label>
      </div>

      <div className="cc-row pt-1">
        <span className="text-[11px] text-ink-400">Saved settings sets</span>
        <div className="flex items-center gap-1">
          <input
            className="cc-input w-48"
            placeholder="Keep as…"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button
            type="button"
            className="cc-btn"
            disabled={!name.trim()}
            onClick={() => {
              const { replaced } = saveSet(name, design);
              setName('');
              notify(replaced ? 'Settings set replaced.' : 'Settings set saved.', 'ok');
            }}
          >
            Save set
          </button>
        </div>
      </div>
      {sets.length === 0 ? (
        <p className="text-[11px] text-ink-400">
          None yet. A set is every setting on this screen under a name — the next project can start from it.
        </p>
      ) : (
        <ul className="flex flex-wrap gap-1">
          {sets.map((s) => (
            <li key={s.id} className="flex items-center border border-shell-600 rounded">
              <button type="button" className="px-2 py-1 text-[11px] text-ink-100 hover:text-gold" onClick={() => apply(s.id)}>
                {s.name}
              </button>
              <button
                type="button"
                className="cc-btn-ghost text-status-danger px-1.5"
                title="Delete this set"
                onClick={() => removeSet(s.id)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** How many units are on a height of their own, and therefore left alone. */
function ProjectHeightNotice() {
  const units = useProjectStore((s) => s.units);
  const custom = units.filter((u) => u.params.height_custom).length;
  if (!custom) return null;
  return (
    <span className="text-[11px] text-ink-400">
      {custom} unit{custom === 1 ? '' : 's'} on a custom height — left alone
    </span>
  );
}

/**
 * What the finish actually looks like. One of this app's own decors shows its
 * generated image; a MANUFACTURER decor shows its colour only.
 *
 * That is the licence, not a shortcut: an EGGER image may be shown whole and
 * with its attribution beside it, and a 28 px swatch is neither.
 */
function FinishSwatch({ finish }) {
  if (!finish) return <span className="w-7 h-6 rounded border border-shell-600 opacity-30" />;
  const ownImage = finish.texture && !finish.decor;
  return (
    <span
      className="w-7 h-6 rounded border border-shell-600 bg-cover bg-center shrink-0"
      title={finish.label}
      style={{
        background: finish.hex,
        ...(ownImage ? { backgroundImage: `url(${finish.texture})` } : {}),
      }}
    />
  );
}

// ─── TURN 35 (CLAUDE.md F15): ONE FAMILY'S SHEET ───────────────────────────
//
// The owner's list, verbatim — "Jumbo 2070 × 2800, Standard 1220 × 2440, 10
// foot 1020 × 3050, i Other, i tu wpisujemy sami" — as the house's own row:
// buttons, `aria-pressed`, `border-gold text-gold` on the chosen one. There is
// no `<select>` in this panel and this did not introduce the first one.
//
// WHICH BUTTON IS LIT IS DERIVED FROM THE SIZE, never stored beside it, so the
// two cannot drift: a profile carrying 1220 × 2440 IS Standard whoever typed
// it, and a size no listed format carries is honestly `Other…` — which is what
// the workshop's own 2790 × 2060 has always been. That is why the two number
// fields open filled rather than empty: they are showing the board this shop
// has been checked against since turn 31, and nothing has changed under it.
//
// Both numbers travel TOGETHER on every write. Half a sheet size is not a
// sheet, and a width from the family with a height from the fallback would be
// a board nobody can buy.
// TURN 36 (CLAUDE.md F1): exported — the unified panel shows THIS row rather
// than a copy of it. Nothing else about it changed.
/**
 * ─── T80 F2 · FRONTS: LAY-ON OR IN-FRAME (BRITISH), PER PROJECT ─────────────
 *
 * The owner, 21.10.2026 (22:40): *"3 per projekt."*  One row, two buttons, the
 * chosen one lit; one write, `setDesign({ inframe })` (one undo step, saved
 * with the project). The line under it and its tooltip are the engine's
 * (engine/design.js inframeHint / inframeTooltip, from profile.inframe): no
 * number is typed here, and none can be edited here. WizardSettings draws the
 * same row (it imports this one), so the two surfaces cannot disagree.
 */
export function InframeRow({ design, setDesign, profile }) {
  const on = design?.inframe === true;
  return (
    <section className="space-y-2" data-inframe-row="1">
      <span className="text-xs uppercase tracking-wide text-ink-200">Fronts</span>
      <div className="flex flex-wrap gap-2">
        {INFRAME_CHOICES.map((c) => (
          <button
            key={c.id}
            type="button"
            data-inframe-option={c.id}
            aria-pressed={on === c.on}
            className={`border rounded px-3 py-2 text-left transition-colors ${on === c.on
              ? 'border-gold bg-shell-700'
              : 'border-shell-600 hover:bg-shell-700'}`}
            onClick={() => { if (on !== c.on) setDesign({ inframe: c.on }); }}
          >
            {c.label}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-ink-400" data-inframe-hint="1" title={inframeTooltip(profile)}>
        {inframeHint(profile)}
      </p>
    </section>
  );
}

export function SheetSizeRow({
  family, label, hint, profile, onChange,
}) {
  const options = profile.cnc.sheetOptions || [];
  const chosen = sheetOptionIdFor(profile, family);
  const size = sheetSizeForFamily(profile, family);
  return (
    <div className="space-y-1" data-sheet-family={family}>
      <div className="cc-row">
        <div className="flex flex-col flex-1">
          <span className="text-sm text-ink-100">{label}</span>
          <span className="text-[11px] text-ink-400">{hint}</span>
        </div>
        <div className="flex gap-1">
          {options.map((o) => (
            <button
              key={o.id}
              type="button"
              data-sheet-option={o.id}
              aria-pressed={chosen === o.id}
              title={o.label}
              className={`cc-btn px-2 ${chosen === o.id ? 'border-gold text-gold' : ''}`}
              // `Other…` keeps the size that is already resolved rather than
              // blanking it: pressing it means "I will type these", not "I have
              // no board". A listed format states both of its numbers at once.
              onClick={() => onChange(o.id === 'other'
                ? { width: size.width, height: size.height }
                : { width: o.width, height: o.height })}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
      {chosen === 'other' && (
        <div className="cc-row" data-sheet-other={family}>
          <span className="text-[11px] text-ink-400 flex-1">Sheet width × height, in mm</span>
          <NumberField
            className="cc-input w-20 text-right"
            data-sheet-width={family}
            value={size.width}
            onCommit={(v) => (Number(v) > 0 ? onChange({ width: Number(v), height: size.height }) : null)}
          />
          <span className="text-[11px] text-ink-400">×</span>
          <NumberField
            className="cc-input w-20 text-right"
            data-sheet-height={family}
            value={size.height}
            onCommit={(v) => (Number(v) > 0 ? onChange({ width: size.width, height: Number(v) }) : null)}
          />
        </div>
      )}
    </div>
  );
}

/**
 * The one-line explanation under the runner variant buttons (turn 18, F6.4).
 *
 * The owner asked for "a short tooltip", and the label alone ("T") says nothing
 * to anybody who has not read Blum's catalogue — so the hint of whichever
 * variant is currently chosen is spelled out under the row as well.
 */
function runnerVariantHint(profile, chosen) {
  const list = profile.hardware.runner.movento.variants || [];
  const v = list.find((x) => x.id === chosen) || list[0];
  return v ? `${v.id} — ${v.label}. ${v.hint}` : '';
}

// ─── THE HINGE, AT PROJECT LEVEL (turn 19, CLAUDE.md F1.1/F1.5/F1.7) ────────
//
// The owner's model has two levels and this is the top one: "jeden główny wybór
// przypisany… a jak jedna szafka będzie miała inne hinges, to po podwójnym
// kliknięciu na hinge otworzy się modal". The exception lives on the door
// (components/DoorModal.jsx, section B); this is the answer every door starts from.
//
// THREE controls, and the thing that is NOT one of them is the point:
//
//   SYSTEM   CLIP top BLUMOTION — the only one in the catalogue today, shown as
//            a row rather than a single tag because the next one the workshop
//            stocks is an entry in profile.js and not a rewrite of this.
//   FINISH   nickel or onyx. It decides which GLB is drawn and which ARTICLE
//            the BOM lists. Nothing else — the same hinge, the same hole.
//   PLATE    knock-in ⌀5, which is what the LISP drills and what every project
//            cut so far is bored for. The screw-on ⌀3 is VISIBLE AND DISABLED:
//            its drilling pattern is a workshop number nobody has supplied, and
//            an enabled option that silently drilled the ⌀5 pattern would make
//            the export lie about what is on the machine. BLOCKERS says exactly
//            which card is needed.
//
// The ANGLE is absent because it is not a choice. The line under the controls
// says what this job's fronts resolve to today so that the rule is READABLE —
// a joiner who changes the front board from 18 to 32 sees the answer change
// under his hand rather than discovering it on an invoice.
// TURN 36 (CLAUDE.md F1): exported — the unified panel shows THIS block rather
// than a copy of it. Nothing else about it changed.
export function HingeHardware({
  design, profile, frontThickness, onChange,
}) {
  const C = profile.hardware.hinge.cliptop;
  const system = resolveHingeSystem(design, profile);
  const finish = resolveHingeFinish(design, profile);
  const plate = resolveHingePlate(design, profile);
  const angle = hingeAngleFor({ frontThickness });
  const wardrobeAngle = hingeAngleFor({ frontThickness, innerDrawer: true });

  return (
    <>
      <div className="cc-row" data-hinge-system="1">
        <div className="flex flex-col flex-1">
          <span className="text-sm text-ink-100">Hinge system</span>
          <span className="text-[11px] text-ink-400">
            {C.systems.find((s) => s.id === system)?.hint || 'The cup hinge this job is fitted with.'}
          </span>
        </div>
        <div className="flex gap-1">
          {C.systems.map((s) => (
            <button
              key={s.id}
              type="button"
              data-hinge-system-option={s.id}
              aria-pressed={system === s.id}
              title={s.hint}
              className={`cc-btn px-2 ${system === s.id ? 'border-gold text-gold' : ''}`}
              onClick={() => onChange({ system: s.id })}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="cc-row" data-hinge-finish="1">
        <div className="flex flex-col flex-1">
          <span className="text-sm text-ink-100">Hinge finish</span>
          <span className="text-[11px] text-ink-400">
            {C.finishes.find((f) => f.id === finish)?.hint || ''}
          </span>
        </div>
        <div className="flex gap-1">
          {C.finishes.map((f) => (
            <button
              key={f.id}
              type="button"
              data-hinge-finish-option={f.id}
              aria-pressed={finish === f.id}
              title={f.hint}
              className={`cc-btn px-2 ${finish === f.id ? 'border-gold text-gold' : ''}`}
              onClick={() => onChange({ finish: f.id })}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="cc-row" data-hinge-plate="1">
        <div className="flex flex-col flex-1">
          <span className="text-sm text-ink-100">Mounting plate</span>
          <span className="text-[11px] text-ink-400">
            What the carcass side is drilled for. The ⌀5 pattern is the one this app knows.
          </span>
        </div>
        <div className="flex gap-1">
          {C.plates.map((p) => (
            <button
              key={p.id}
              type="button"
              data-hinge-plate-option={p.id}
              data-hinge-plate-disabled={p.enabled ? '0' : '1'}
              aria-pressed={plate === p.id}
              disabled={!p.enabled}
              title={p.hint}
              className={`cc-btn px-2 ${plate === p.id ? 'border-gold text-gold' : ''} ${p.enabled ? '' : 'opacity-40 cursor-not-allowed'}`}
              onClick={() => p.enabled && onChange({ plate: p.id })}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-[11px] text-ink-400" data-hinge-angle-note="1">
        {angle ? (
          <>
            The ANGLE is not a choice — the front decides it. This job&apos;s{' '}
            <span className="text-ink-100">{formatMm(frontThickness)} mm</span> fronts take the{' '}
            <span className="text-ink-100">{angle}°</span> hinge; a wardrobe door with a drawer behind
            it takes the <span className="text-ink-100">{wardrobeAngle || 155}°</span>, so the drawer
            clears the open door. One door can be given another by hand — double-click its hinge in 3D.
          </>
        ) : (
          <>
            The ANGLE is not a choice — the front decides it, from the hinge catalogue. One door can be
            given another by hand: double-click its hinge in 3D.
          </>
        )}
      </p>
    </>
  );
}

// ─── T-CC2a F11 · THE SLOT, ITS ENTRY AND ITS LINK (CLAUDE.md T-CC2a laws 2, 3) ─
//
// The owner, 01.11.2026: *"do wszystkich plyt na przyklad MDF 18 mamy
// przypisany material z JC MAT 018 MDF 18 i jak program go wybierze to bedzie
// na liscie BOM z przypisanym materialem"*. A slot keeps its choice of WHAT
// (source, decor, colour, thickness); under it, the catalogue entry that choice
// IS (the resolver the cut list reads, engine/materials.js boardChoiceOfPanel)
// and the company's link to its Joinery Core stock: "JC: <name>", or red
// "Not linked" with a Link that opens the Link materials window at that entry.
// Exported so the wizard's settings surface shows the same rows, never a copy.

/** What the engine cuts the back panels and the drawer bottoms at, read off the cut list when it has them. */
function cutThickness(entries, pred, fallback) {
  for (const { result } of entries || []) {
    const hit = (result?.panels || []).find(pred);
    if (Number(hit?.thickness) > 0) return Number(hit.thickness);
  }
  return fallback;
}

/**
 * Every board slot's choice, as engine/materials.js resolves it for a piece of
 * that slot (the SAME road the cut list and the purchase list read), at the
 * thickness the engine cuts that slot at.
 */
export function slotChoices(design, profile, entries = []) {
  const T = projectThicknesses({ design, profile });
  const at = (list, t) => Math.max(0, (list || []).findIndex((x) => x.id === t?.id));
  const thick = {
    back: cutThickness(entries, (pn) => pn.role === 'back', thicknessOf('BACK', T)),
    drawerBottom: cutThickness(entries, (pn) => pn.part === 'DRAWER-BOTTOM', thicknessOf('DRAWER-BOTTOM', T)),
  };
  for (const g of RUN_MATERIAL_GROUPS) {
    const same = runMaterialSetting(design, g.id).sameAsFronts;
    thick[g.id] = cutThickness(entries, (pn) => pn.role === g.id, same ? (T.front1 ?? T.carcass1) : T.carcass1);
  }
  return {
    carcass: (t) => boardChoiceOfPanel(
      { role: 'side', part: 'SIDE', thickness: T[`carcass${at(design.carcass.types, t) + 1}`] ?? T.carcass1 },
      { params: { carcass_type_id: t?.id || null } }, design, profile,
    ),
    front: (t) => boardChoiceOfPanel(
      { role: 'front', part: 'FRONT', material_role: 'front', thickness: T[`front${at(design.fronts.types, t) + 1}`] ?? T.front1 },
      { params: { front_type_id: t?.id || null } }, design, profile,
    ),
    run: (role) => boardChoiceOfPanel({ role, part: String(role).toUpperCase(), thickness: thick[role] }, { params: {} }, design, profile),
    // "As today": the slot the engine uses for that piece, without the slot's own choice.
    today: (slot) => boardChoiceOfPanel(
      slot === 'drawerBottom'
        ? { role: 'drawer_box', part: 'DRAWER-BOTTOM', thickness: thick.drawerBottom }
        : { role: 'back', part: 'BACK', thickness: thick.back },
      { params: {} }, { ...design, boards: { ...(design.boards || {}), [slot]: null } }, profile,
    ),
    thicknessOf: (slot) => thick[slot] ?? T.carcass1,
  };
}

/** The catalogue's answer for a board choice: `{ entry, reason }`. */
function entryOfChoice(choice, profile) {
  try {
    const { id, reason } = catalogueIdOfBoard(choice, profile);
    return { entry: id ? entryById(id) : null, reason: id ? null : (reason || NOT_IN_CATALOGUE) };
  } catch {
    return { entry: null, reason: NOT_IN_CATALOGUE };
  }
}

/** A slot's entry name for a folded line, or the reason it has none. */
function entryNameOf(choice, profile) {
  const { entry, reason } = entryOfChoice(choice, profile);
  return entry ? entry.name : reason;
}

/** Open Link materials at an entry: over the window this was opened from, so its Back returns there. */
function openLinkAt(entry, from) {
  const ui = useUiStore.getState();
  const open = ui.modal ? ui.pushModal : ui.openModal;
  open('link-materials', { entryId: entry.id, department: entry.department, from });
}

/**
 * One slot's catalogue entry and the company's link (F11.1): "JC: <name>" when
 * linked, the red words of law 7 and "Link" when not, the reason when the
 * catalogue does not hold the board yet.
 */
export function SlotLink({ choice, testId = null, from = 'settings' }) {
  const profile = useCabinetProfileStore((s) => s.profile);
  const links = useMaterialLinkStore((s) => s.links);
  const stock = useMaterialLinkStore((s) => s.stock);
  const stockStatus = useMaterialLinkStore((s) => s.stockStatus);
  const load = useMaterialLinkStore((s) => s.load);
  useEffect(() => { load?.()?.catch?.(() => {}); }, [load]);
  const { entry, reason } = useMemo(() => entryOfChoice(choice, profile), [choice, profile]);
  const st = entry ? linkStatus(entry, links, stock, { stockOk: stockStatus === 'ok' }) : null;
  return (
    <div className="flex items-center gap-2 text-[11px]" data-slot-link={testId || '1'} data-slot-link-status={st?.status || 'not-in-catalogue'}>
      <span className="text-ink-200 flex-1 truncate" title={entry?.name || reason}>{entry ? entry.name : reason}</span>
      {st?.status === 'linked' && (
        <span className="text-status-ok truncate" data-slot-link-jc="1">{`JC: ${st.row?.name || 'linked'}`}</span>
      )}
      {st && st.status !== 'linked' && (
        <>
          <span className="text-status-danger" data-slot-link-words="1">{st.status === 'removed' ? LINK_WORDS.removed : LINK_WORDS.notLinked}</span>
          <button type="button" className="cc-btn px-2 py-0.5" data-slot-link-open="1" onClick={() => openLinkAt(entry, from)}>Link</button>
        </>
      )}
    </div>
  );
}

/**
 * F11.2 · a board slot: "As today" (the part takes the slot the engine uses
 * today), or another sheet from a visible list with search of the catalogue's
 * sheets OF THE SAME THICKNESS the engine cuts that part at (geometry is not
 * this turn, so another thickness is never offered). The choice is a board
 * choice (engine/catalogue.js boardChoiceOfEntry), never an id typed by hand.
 */
export function BoardSlotPicker({
  slot, label, thickness, value = null, today = null, onChange,
}) {
  const profile = useCabinetProfileStore((s) => s.profile);
  const [open, setOpen] = useState(Boolean(value));
  const [q, setQ] = useState('');
  const sheets = useMemo(
    () => entriesOf('sheets').filter((e) => Number(e.thickness) === Number(thickness)),
    [thickness],
  );
  const shown = useMemo(() => sheets.filter((e) => matchesEntry(e, q)), [sheets, q]);
  const chosenId = value ? entryOfChoice({ ...value, thickness }, profile).entry?.id || null : null;
  return (
    <div className="space-y-1" data-board-slot={slot} data-board-slot-thickness={String(thickness ?? '')}>
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-ink-100 w-32 shrink-0">{label}</span>
        <span className="text-[11px] text-ink-400 tabular-nums shrink-0">{thickness ? `${formatMm(thickness)} mm` : ''}</span>
        <button
          type="button"
          className={`cc-btn px-2 py-0.5 ${!value && !open ? 'border-gold text-gold' : ''}`}
          aria-pressed={!value && !open}
          data-board-slot-today="1"
          onClick={() => { setOpen(false); onChange?.(null); }}
        >
          As today
        </button>
        <button
          type="button"
          className={`cc-btn px-2 py-0.5 ${value || open ? 'border-gold text-gold' : ''}`}
          aria-pressed={Boolean(value || open)}
          data-board-slot-other="1"
          onClick={() => setOpen(true)}
        >
          Another sheet
        </button>
      </div>
      <SlotLink choice={value ? { ...value, thickness } : today} testId={`board:${slot}`} />
      {open && (
        <div className="border border-shell-600 rounded p-1.5 space-y-1" data-board-slot-list={slot}>
          <span className="relative flex items-center">
            <input
              className="cc-input pr-7"
              value={q}
              placeholder="Search by name or decor code"
              data-board-slot-search="1"
              onChange={(e) => setQ(e.target.value)}
            />
            {q !== '' && (
              <button
                type="button"
                className="absolute right-1 px-1.5 text-ink-400 hover:text-gold"
                aria-label="Clear the search"
                data-board-slot-search-clear="1"
                onClick={() => setQ('')}
              >
                ✕
              </button>
            )}
          </span>
          <ul className="cc-scroll max-h-[220px]" data-board-slot-rows={String(shown.length)}>
            {shown.map((e) => {
              const decor = e.decorId ? decorById(e.decorId) : null;
              const chosen = chosenId === e.id;
              return (
                <li key={e.id}>
                  <button
                    type="button"
                    className={`w-full flex items-center gap-2 px-1.5 py-1 rounded text-left text-[11px] ${chosen ? 'outline outline-1 outline-gold bg-gold/10' : 'hover:bg-shell-700'}`}
                    aria-pressed={chosen}
                    data-board-slot-option="1"
                    onClick={() => onChange?.(boardChoiceOfEntry(e))}
                  >
                    {decor && <Photo url={decor.thumb} fill={decor.hex} alt={decorLabel(decor)} size={28} />}
                    <span className="flex-1 min-w-0">
                      <span className="block text-ink-100 truncate">{e.name}</span>
                      {decor && <span className="block text-ink-400 truncate">{decorLabel(decor)}</span>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

/** F11.2 · the two new board slots, "Back panels" and "Drawer bottoms", each "As today" by default. */
export function DesignBoardSlots({ design, entries = null, onChange }) {
  const profile = useCabinetProfileStore((s) => s.profile);
  const allResults = useProjectStore((s) => s.allResults);
  const units = useProjectStore((s) => s.units);
  const cut = useMemo(() => entries || (allResults ? allResults() : []), [entries, allResults, units]);
  const slots = useMemo(() => slotChoices(design, profile, cut), [design, profile, cut]);
  return (
    <div className="border border-shell-600 rounded p-2 space-y-2" data-design-boards="1">
      <span className="text-[11px] uppercase tracking-wide text-ink-400">Back panels and drawer bottoms</span>
      {[['back', 'Back panels'], ['drawerBottom', 'Drawer bottoms']].map(([slot, label]) => (
        <BoardSlotPicker
          key={slot}
          slot={slot}
          label={label}
          thickness={slots.thicknessOf(slot)}
          value={design.boards?.[slot] || null}
          today={slots.today(slot)}
          onChange={(choice) => onChange?.(slot, choice)}
        />
      ))}
    </div>
  );
}

// ─── TURN 58b (CLAUDE.md F3.1, licensed deletion 2): THE NUMBERS LEAVE ──────
//
// The owner, 30.08.2026, looking at this panel:
//
//   *"jakieś dziwne ustawienia, po co mi to? ja nie chcę tego… jak już to
//   pasek albo pokrętło… jedynie wysokość — jeden pasek, przedłuż wycięcie J
//   na pionowych i tyle, nic więcej."*
//
// `JPULL_FIELDS` and `JpullHardware` stood here: NINE numeric fields —
// `runMm`, `fromBottomMm`, `rampR`, `lipT`, `slotW`, `slotDepth`, `slotR`,
// `rearLeg`, `reliefMm` — writing straight into the workshop's profile from
// two entry points (this file's export, and the wizard's `hardware.jpull`
// node, which is the *"będzie w 2 miejscach do włączenia"* he counted). They
// are DELETED, not hidden: the constants stay exactly where they always were,
// in `profile.handles.jpull`, read by `jpullSpec` and by nothing a hand can
// reach. The `jpullSpec` import went with them.
//
// ONE of the nine survives, and not here: the RUN, as a per-LEAF override on
// one slider in `components/JpullRunModal.jsx`, opened by clicking the J strip
// itself. Petros's iron rule (30.08) — engine numbers do not enter the UI
// without the owner's order — is what the other eight are held to.
//
// The HANDLE-SYSTEM CHOICE is untouched and stands exactly where handle
// systems have always been chosen: `WizardSettings.jsx`'s `fronts.opening`
// tiles, and `DoorModal.jsx`'s per-front `HandleSection`.
