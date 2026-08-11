import { useMemo, useState } from 'react';
import { useProjectStore } from '../stores/projectStore.js';
import { useUiStore } from '../stores/uiStore.js';
import { useSettingsSetsStore } from '../stores/settingsSetsStore.js';
import { useCabinetProfileStore } from '../stores/cabinetProfileStore.js';
import { isJcMaterial, materialSlotState, useMaterialAssignmentStore } from '../stores/materialAssignmentStore.js';
import {
  FRONT_STYLE_OPTIONS, colourLabel, finishById, migrateDesign, projectHeights, resolveJoinery,
} from '../engine/design.js';
import { RUN_MATERIAL_GROUPS, runMaterialSetting } from '../engine/materials.js';
import {
  carcassSources, frontSources, hardwareChoices, pickerForSource, projectBoardThickness,
  projectDimensions, projectFrontThickness, saveButtonState, settingsSectionSnapshot, sourceById,
} from '../engine/projectSettings.js';
import { formatMm } from '../engine/format.js';
// ─── TURN 24 (CLAUDE.md F3): THE CALIPER, NOT THE LABEL ─────────────────────
import { drawerBoxGate, thicknessSlotRows } from '../engine/thickness.js';
import { doorCountFor, hingeStandard } from '../engine/cabinet.js';
import { UNIT_TYPES } from '../engine/types.js';
import {
  hingeAngleFor, hingeReResolve, resolveHingeFinish, resolveHingePlate, resolveHingeSystem,
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
  const setCarcassTypes = useProjectStore((s) => s.setCarcassTypes);
  const setCarcassFinish = useProjectStore((s) => s.setCarcassFinish);
  const setCarcassMaterial = useProjectStore((s) => s.setCarcassMaterial);
  const setCarcassSource = useProjectStore((s) => s.setCarcassSource);
  const setFrontTypes = useProjectStore((s) => s.setFrontTypes);
  const setFrontType = useProjectStore((s) => s.setFrontType);
  const setFrontColour = useProjectStore((s) => s.setFrontColour);
  const setFrontMaterial = useProjectStore((s) => s.setFrontMaterial);
  const setRunMaterial = useProjectStore((s) => s.setRunMaterial);
  const addDoorStyle = useProjectStore((s) => s.addDoorStyle);
  const updateDoorStyle = useProjectStore((s) => s.updateDoorStyle);
  const removeDoorStyle = useProjectStore((s) => s.removeDoorStyle);

  const materials = useMaterialAssignmentStore((s) => s.materials);
  const units = useProjectStore((s) => s.units);
  const unitCount = units.length;
  const updateUnitParamsBulk = useProjectStore((s) => s.updateUnitParamsBulk);
  /** Re-cut every cabinet's fronts at a new board — one action, one undo step. */
  const recutFronts = (thickness) => updateUnitParamsBulk(units.map((u) => u.id), { front_t: thickness });

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
  const boardMaterials = materials.filter((m) => m.category === 'board');
  // What the project is DRAWN at today. Carcass 1's assigned board is the
  // truth once one exists; before that, the soft-start Generic 18 default.
  const carcass1Board = materials.find((m) => m.id === design.carcass.types[0]?.material_id) || null;
  const drawnBoardT = carcass1Board?.thickness
    ?? (design.thickness.custom ?? design.thickness.board ?? 18);
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

  const assignBoard = (typeId, materialId) => {
    const m = boardMaterials.find((x) => x.id === materialId) || null;
    if (!m) { setCarcassMaterial(typeId, null); return; }
    gateOrApply(typeId, m.thickness, m.name, () => setCarcassMaterial(typeId, m.id));
  };

  // ─── Turn 16 (CLAUDE.md F1.1): A FRONT TYPE'S BOARD ──────────────────────
  //
  // "Each front type gains the same MaterialStock dropdown a carcass type has —
  // same store, same Generic fallback, same T15-B hard gates (changing an
  // effective thickness with units present ASKS Recompute/Keep)."
  //
  // The gate is the CARCASS's gate, reused rather than rewritten — a front
  // board pins what every door in the job is cut from exactly as the carcass
  // board pins the boxes, so the question ("the project is drawn at 18 and this
  // is 22 — recompute, or keep?") is the same question and deserves the same
  // dialog. `frontGate` holds the offered assignment while the owner decides.
  const [frontGate, setFrontGate] = useState(null);       // { typeId, thickness, label, apply }
  const assignFrontBoard = (typeId, materialId) => {
    const m = frontStock.find((x) => x.id === materialId) || null;
    if (!m) { setFrontMaterial(typeId, null); return; }
    const apply = () => setFrontMaterial(typeId, m.id);
    // Front type 1 is the project's front, so it is the one that pins the
    // thickness — the same rule carcass 1 follows (#58: one G per project).
    if (unitCount > 0 && typeId === frontTypes[0]?.id && m.thickness && m.thickness !== frontBoard) {
      setFrontGate({
        typeId, thickness: m.thickness, label: m.name, apply,
      });
      return;
    }
    apply();
  };

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
  // The stock a FRONT may be assigned (turn 16, F1.1): the front blanks AND the
  // ordinary boards, because a workshop cuts doors out of both — an MDF shaker
  // blank and an 18 mm melamine board are both real answers to "what are these
  // doors made of", and the Generic placeholders are on the board list.
  const frontStock = materials.filter((m) => m.category === 'front' || m.category === 'board');
  const slots = materialSlotState(
    design.carcass.types.map((t) => ({ id: t.id, label: t.label, material_id: t.material_id })),
    materials,
  );
  const joinery = resolveJoinery(design, profile);
  const PS = profile.projectSettings;
  const frontTypes = design.fronts.types.length
    ? design.fronts.types
    : [{
      id: 'f1', label: 'Front 1', source: PS.frontSources[0].id, colour: null, material_id: null,
    }];
  const board = projectBoardThickness(design, profile);
  // Turn 16 (F1.1): the assigned board wins over the source, so the folded line
  // and the gate both speak about what the doors are actually cut from.
  const frontBoard = projectFrontThickness(design, profile, materials);

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
              {design.carcass.types.map((t) => {
                const m = materials.find((x) => x.id === t.material_id);
                return `${t.label}: ${m ? `${m.code ? `${m.code} · ` : ''}${m.name}` : 'Generic 18 (default)'}`;
              }).join('   ·   ')}
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
                const assigned = materials.find((m) => m.id === t.material_id) || null;
                const gateHere = thickGate && thickGate.typeId === t.id ? thickGate : null;
                return (
                  <div className="space-y-1">
                    <div className="cc-row">
                      <span className="text-[11px] text-ink-400 flex-1">
                        {assigned
                          ? `${assigned.code ? `${assigned.code} · ` : ''}${assigned.name} · ${assigned.thickness} mm`
                          : 'No board assigned — drawing on Generic 18 mm'}
                        {isJcMaterial(assigned) ? ' · JC' : ''}
                      </span>
                      <select
                        className="cc-input w-[260px]"
                        value={t.material_id || ''}
                        onChange={(e) => assignBoard(t.id, e.target.value || null)}
                      >
                        <option value="">MaterialStock…</option>
                        <optgroup label="Generic — geometry only, assign a real board before check-out">
                          {boardMaterials.filter((m) => m.placeholder).map((m) => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                          ))}
                        </optgroup>
                        <optgroup label="Stock">
                          {boardMaterials.filter((m) => !m.placeholder).map((m) => (
                            <option key={m.id} value={m.id}>
                              {`${m.code ? `${m.code} · ` : ''}${m.name}`}{isJcMaterial(m) ? ' · JC' : ''}
                            </option>
                          ))}
                        </optgroup>
                      </select>
                    </div>
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

        {slots.missing.length > 0 && (
          <p className="text-[11px] text-status-warn">
            {slots.missing.map((t) => t.label).join(', ')} has no board behind it yet — the look is set, the cost is not.
          </p>
        )}
        {design.carcass.types.some((t) => materials.find((m) => m.id === t.material_id)?.placeholder) && (
          <p className="text-[11px] text-status-warn">
            A Generic board is a placeholder: the geometry is pinned, the cost is not — assign a real
            board before check-out.
          </p>
        )}
        <p className="text-[11px] text-ink-400">
          Board thickness: <span className="text-ink-200">{formatMm(drawnBoardT)}</span> — from{' '}
          {carcass1Board ? `${carcass1Board.code ? `${carcass1Board.code} · ` : ''}${carcass1Board.name}` : 'the Generic 18 default'}.
          One board thickness per project — the kit's own boundary (#58). Changing it once cabinets
          exist asks first, and recuts everything.
        </p>
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
              {(() => {
                const assigned = materials.find((m) => m.id === t.material_id) || null;
                const gateHere = frontGate && frontGate.typeId === t.id ? frontGate : null;
                return (
                  <div className="space-y-1">
                    <div className="cc-row">
                      <span className="text-[11px] text-ink-400 flex-1">
                        {assigned
                          ? `${assigned.code ? `${assigned.code} · ` : ''}${assigned.name} · ${assigned.thickness} mm`
                          : `No board assigned — drawing on ${formatMm(src.thickness)} mm from the source`}
                        {isJcMaterial(assigned) ? ' · JC' : ''}
                      </span>
                      <select
                        className="cc-input w-[260px]"
                        data-front-material={t.id}
                        value={t.material_id || ''}
                        onChange={(e) => assignFrontBoard(t.id, e.target.value || null)}
                      >
                        <option value="">MaterialStock…</option>
                        <optgroup label="Generic — geometry only, assign a real board before check-out">
                          {frontStock.filter((m) => m.placeholder).map((m) => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                          ))}
                        </optgroup>
                        <optgroup label="Stock">
                          {frontStock.filter((m) => !m.placeholder).map((m) => (
                            <option key={m.id} value={m.id}>
                              {`${m.code ? `${m.code} · ` : ''}${m.name}`}{isJcMaterial(m) ? ' · JC' : ''}
                            </option>
                          ))}
                        </optgroup>
                      </select>
                    </div>
                    {gateHere && (
                      /* The T15-B hard gate, on the fronts: the doors in this
                         job are DRAWN at one thickness and this board is
                         another. Nothing changes until the owner says which
                         truth wins. */
                      <div className="cc-row rounded border border-status-warn/60 bg-status-warn/10 px-2 py-1" data-front-thickness-gate="1">
                        <span className="text-[11px] text-status-warn flex-1">
                          Fronts are drawn at {formatMm(frontBoard)} mm — {gateHere.label} is {formatMm(gateHere.thickness)} mm.
                        </span>
                        <button
                          type="button"
                          className="cc-btn px-2"
                          onClick={() => {
                            gateHere.apply();
                            // RECOMPUTE means recompute: every cabinet already
                            // on the floor is re-cut at the new front board, in
                            // one batch and one undo step. Assigning the board
                            // alone would only change what the NEXT cabinet is
                            // drawn at, which is exactly the silent half-change
                            // the gate exists to prevent.
                            const { notices } = recutFronts(gateHere.thickness) || { notices: [] };
                            for (const n of notices) notify(n, 'warn');
                            setFrontGate(null);
                            notify(`Fronts recomputed at ${formatMm(gateHere.thickness)} mm`, 'warn');
                            // ─── Turn 19 (CLAUDE.md F1.4): THE RE-RESOLVE GATE ───
                            // A thicker front is a different HINGE — 110° up to
                            // 25 mm, 95° above it — so a board change can flip
                            // the angle under every door in the job. The doors
                            // that follow the rule follow it; a door somebody
                            // ASSIGNED a hinge to by hand is never silently
                            // overruled, which is the whole point of assigning
                            // one. Both facts are said out loud rather than
                            // discovered on an invoice.
                            const { message } = hingeReResolve({
                              fromThickness: frontBoard,
                              toThickness: gateHere.thickness,
                              assignedDoors: doorsWithOwnHinge(units),
                              totalDoors: doorsInProject(units, profile),
                            });
                            if (message) notify(message, 'warn');
                          }}
                        >
                          Recompute at {formatMm(gateHere.thickness)}
                        </button>
                        <button type="button" className="cc-btn px-2" onClick={() => setFrontGate(null)}>
                          Keep {formatMm(frontBoard)} — pick another
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}
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
            const assigned = materials.find((m) => m.id === setting.material_id) || null;
            return (
              <div key={g.id} className="cc-row" data-run-material={g.id}>
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
                  <span className="text-[11px] text-ink-400 flex-1 text-right truncate">
                    {frontTypes[0]?.label || 'Front 1'}
                    {materials.find((m) => m.id === frontTypes[0]?.material_id)
                      ? ` · ${materials.find((m) => m.id === frontTypes[0].material_id).name}`
                      : ''}
                  </span>
                ) : (
                  <select
                    className="cc-input flex-1"
                    data-run-material-stock={g.id}
                    value={setting.material_id || ''}
                    onChange={(e) => setRunMaterial(g.id, { material_id: e.target.value || null })}
                  >
                    <option value="">MaterialStock…</option>
                    <optgroup label="Generic — geometry only, assign a real board before check-out">
                      {frontStock.filter((m) => m.placeholder).map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Stock">
                      {frontStock.filter((m) => !m.placeholder).map((m) => (
                        <option key={m.id} value={m.id}>
                          {`${m.code ? `${m.code} · ` : ''}${m.name}`}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                )}
                {!setting.sameAsFronts && assigned?.placeholder && (
                  <span className="text-[10px] text-status-warn shrink-0" title="A placeholder board — assign a real one before check-out">⚠</span>
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

      {/* ── how the carcass is held together ── */}
      <section className="space-y-2">
        <span className="text-xs uppercase tracking-wide text-ink-200">Joinery type</span>
        <div className="flex flex-wrap gap-2">
          {profile.joinery.types.map((t) => (
            <button
              key={t.id}
              type="button"
              title={t.hint}
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
          onPick={(id) => setDesign({ fronts: { ...design.fronts, style: id } })}
        />

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
                  onChange={(e) => updateDoorStyle(style.id, { frontType: e.target.value })}
                >
                  {FRONT_STYLE_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
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
  const setProjectInfo = useProjectStore((s) => s.setProjectInfo);
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
            onChange={(e) => setProjectInfo({ number: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="cc-label">Client</span>
          <input
            className="cc-input"
            value={project.client || ''}
            onChange={(e) => setProjectInfo({ client: e.target.value })}
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
// (components/HingeModal.jsx); this is the answer every door starts from.
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
function HingeHardware({
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

/**
 * How many doors in this job carry a hinge somebody picked by hand
 * (turn 19, CLAUDE.md F1.4).
 *
 * These are the doors the re-resolve gate does NOT touch: an assignment is
 * somebody's decision about that door and a board change is not an argument
 * against it.
 */
function doorsWithOwnHinge(units) {
  let n = 0;
  for (const u of units) n += Object.keys(u.params?.door_hinges || {}).length;
  return n;
}

/**
 * How many hinged doors the job has altogether.
 *
 * `doorCountFor` is the engine's own width rule, so this counts the doors the
 * engine will actually hang rather than a guess of one per cabinet — a 1200 mm
 * base unit has two, and both of them re-resolve.
 */
function doorsInProject(units, profile) {
  let n = 0;
  for (const u of units) {
    const type = UNIT_TYPES[u.type];
    if (!type?.supports?.doors) continue;
    const said = u.params?.doors;
    if (said === false || said === 0) continue;
    if (said && typeof said === 'object') {
      n += Number.isFinite(Number(said.count)) ? Number(said.count) : doorCountFor(u.params.width, profile);
    } else {
      n += doorCountFor(u.params.width, profile);
    }
  }
  return n;
}
