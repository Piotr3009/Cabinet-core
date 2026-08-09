import { useMemo, useState } from 'react';
import { useProjectStore } from '../stores/projectStore.js';
import { useUiStore } from '../stores/uiStore.js';
import { useSettingsSetsStore } from '../stores/settingsSetsStore.js';
import { useCabinetProfileStore } from '../stores/cabinetProfileStore.js';
import { isJcMaterial, materialSlotState, useMaterialAssignmentStore } from '../stores/materialAssignmentStore.js';
import {
  FRONT_STYLE_OPTIONS, colourLabel, finishById, migrateDesign, projectHeights, resolveJoinery,
} from '../engine/design.js';
import {
  carcassSources, frontSources, hardwareChoices, projectBoardThickness,
  projectDimensions, projectFrontThickness, sourceById,
} from '../engine/projectSettings.js';
import { formatMm } from '../engine/format.js';
import { PROJECT_TYPES as PROJECT_TYPE_OPTIONS } from '../engine/projectTypes.js';
import { contrastInk } from '../lib/pswColors.js';
import SheenSlider from './SheenSlider.jsx';
import JoineryPreview from './JoineryPreview.jsx';
import DecorPicker from './DecorPicker.jsx';
import ColourPicker from './ColourPicker.jsx';
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

  const setDesign = useProjectStore((s) => s.setDesign);
  const setProjectHeights = useProjectStore((s) => s.setProjectHeights);
  const setProjectDefaults = useProjectStore((s) => s.setProjectDefaults);
  const setCarcassTypes = useProjectStore((s) => s.setCarcassTypes);
  const setCarcassFinish = useProjectStore((s) => s.setCarcassFinish);
  const setCarcassMaterial = useProjectStore((s) => s.setCarcassMaterial);
  const setCarcassSource = useProjectStore((s) => s.setCarcassSource);
  const setFrontTypes = useProjectStore((s) => s.setFrontTypes);
  const setFrontType = useProjectStore((s) => s.setFrontType);
  const setFrontColour = useProjectStore((s) => s.setFrontColour);
  const addDoorStyle = useProjectStore((s) => s.addDoorStyle);
  const updateDoorStyle = useProjectStore((s) => s.updateDoorStyle);
  const removeDoorStyle = useProjectStore((s) => s.removeDoorStyle);

  const materials = useMaterialAssignmentStore((s) => s.materials);
  const unitCount = useProjectStore((s) => s.units.length);

  const [picking, setPicking] = useState(null);          // { carcassId } | null
  const [joineryOpen, setJoineryOpen] = useState(false);
  const [editingStyle, setEditingStyle] = useState(null);
  // ── Owner, 09.08: each big section gets a red SAVE that folds it away ──
  const [folded, setFolded] = useState({ carcass: false, fronts: false });
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
  const assignBoard = (typeId, materialId) => {
    const m = boardMaterials.find((x) => x.id === materialId) || null;
    // The hard gate: units exist and the board would CHANGE the geometry.
    if (m && unitCount > 0 && m.thickness !== drawnBoardT && typeId === design.carcass.types[0]?.id) {
      setThickGate({ typeId, material: m });
      return;
    }
    setCarcassMaterial(typeId, materialId || null);
    // Carcass 1's board pins the project thickness — one G per project, the
    // kit's own boundary (#58). Types 2–3 are cost lines, not geometry.
    if (m && typeId === design.carcass.types[0]?.id) {
      setProjectDefaults({ thickness: { board: m.thickness, custom: null } });
    }
  };
  const frontMaterials = materials.filter((m) => m.category === 'front');
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
  const frontBoard = projectFrontThickness(design, profile);

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
      <section className="space-y-2">
        <div className="cc-row">
          <span className="text-xs uppercase tracking-wide text-ink-200">
            Carcasses
            <span className="ml-2 normal-case tracking-normal text-[11px] text-ink-400">— choose material types</span>
          </span>
          <button
            type="button"
            className="cc-btn px-3"
            style={{ borderColor: '#b03030', color: '#e05050' }}
            title="Saves these assignments and folds the section away"
            onClick={() => setFolded((f) => ({ ...f, carcass: true }))}
          >
            Save
          </button>
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
          <div className="cc-row text-[12px] text-ink-300">
            <span className="flex-1">
              {design.carcass.types.map((t) => {
                const m = materials.find((x) => x.id === t.material_id);
                return `${t.label}: ${m ? `${m.code ? `${m.code} · ` : ''}${m.name}` : 'Generic 18 (default)'}`;
              }).join('   ·   ')}
            </span>
            <button type="button" className="cc-btn px-2" onClick={() => setFolded((f) => ({ ...f, carcass: false }))}>Edit</button>
          </div>
        ) : (<>
        {design.carcass.types.map((t) => {
          const chosen = t.source || PS.carcassSources[0].id;
          const finish = finishById(profile, t.finish_id)
            || finishById(profile, design.finish.carcass)
            || finishById(profile, profile.appearance.defaultCarcassFinish);
          return (
            <div key={t.id} className="border border-shell-600 rounded p-2 space-y-2">
              <div className="cc-row">
                <span className="text-sm text-ink-50 flex-1">{t.label}</span>
                <div className="flex gap-1">
                  {carcassSources(profile).map((src) => (
                    <button
                      key={src.id}
                      type="button"
                      className={`cc-btn px-2 ${chosen === src.id ? 'border-gold text-gold' : ''}`}
                      title={`${src.label} — ${src.thickness} mm board`}
                      onClick={() => setCarcassSource(t.id, src.id)}
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
                  onClick={() => setPicking(picking?.carcassId === t.id ? null : { carcassId: t.id })}
                >
                  {chosen === 'sprayed' ? 'Colour…' : 'Decor…'}
                </button>
              </div>

              {picking?.carcassId === t.id && (
                <div className="border border-shell-600 rounded p-2 space-y-2">
                  {chosen === 'sprayed' ? (
                    // A sprayed carcass is a colour, not a board — CLAUDE.md F9.2
                    // says so explicitly ("yes, carcasses can be sprayed").
                    <ColourPicker
                      label="Sprayed carcass colour"
                      value={design.colour.carcass}
                      onChange={(c) => setDesign({ colour: { ...design.colour, carcass: c } })}
                    />
                  ) : (
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
                         DRAWN at one thickness and this board is another. Nothing
                         changes until the owner says which truth wins. */
                      <div className="cc-row rounded border border-status-warn/60 bg-status-warn/10 px-2 py-1">
                        <span className="text-[11px] text-status-warn flex-1">
                          Project is drawn at {drawnBoardT} mm — {gateHere.material.name} is {gateHere.material.thickness} mm.
                        </span>
                        <button
                          type="button"
                          className="cc-btn px-2"
                          onClick={() => {
                            setCarcassMaterial(t.id, gateHere.material.id);
                            setProjectDefaults({ thickness: { board: gateHere.material.thickness, custom: null } });
                            setThickGate(null);
                            notify(`Project recomputed at ${gateHere.material.thickness} mm`, 'warn');
                          }}
                        >
                          Recompute at {gateHere.material.thickness}
                        </button>
                        <button type="button" className="cc-btn px-2" onClick={() => setThickGate(null)}>
                          Keep {drawnBoardT} — pick another
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
      <section className="space-y-2">
        <div className="cc-row">
          <span className="text-xs uppercase tracking-wide text-ink-200">Fronts</span>
          <button
            type="button"
            className="cc-btn px-3"
            style={{ borderColor: '#b03030', color: '#e05050' }}
            title="Saves these choices and folds the section away"
            onClick={() => setFolded((f) => ({ ...f, fronts: true }))}
          >
            Save
          </button>
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
          <div className="cc-row text-[12px] text-ink-300">
            <span className="flex-1">
              {frontTypes.map((t) => `${t.label}: ${t.source || 'spray'}${t.colour?.name ? ` · ${t.colour.name}` : ''}`).join('   ·   ')}
              {`   ·   style: ${FRONT_STYLE_OPTIONS.find((o) => o.id === design.fronts.style)?.label || design.fronts.style}`}
            </span>
            <button type="button" className="cc-btn px-2" onClick={() => setFolded((f) => ({ ...f, fronts: false }))}>Edit</button>
          </div>
        ) : (<>
        <label className="block">
          <span className="cc-label">Standard front</span>
          <select
            className="cc-input"
            value={design.fronts.style}
            onChange={(e) => setDesign({ fronts: { ...design.fronts, style: e.target.value } })}
          >
            {FRONT_STYLE_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </label>

        {frontTypes.map((t) => {
          const src = sourceById(frontSources(profile), t.source) || frontSources(profile)[0];
          return (
            <div key={t.id} className="border border-shell-600 rounded p-2 space-y-2">
              <div className="cc-row">
                <span className="text-sm text-ink-50 flex-1">{t.label}</span>
                <span className="text-[11px] text-ink-400">{src.thickness} mm</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {frontSources(profile).map((one) => (
                  <button
                    key={one.id}
                    type="button"
                    className={`cc-btn px-2 ${src.id === one.id ? 'border-gold text-gold' : ''}`}
                    title={`${one.label} — ${one.thickness} mm`}
                    onClick={() => setFrontType(t.id, { source: one.id })}
                  >
                    {one.label}
                    {one.coloursSoon && <span className="cc-tag ml-1">colours soon</span>}
                  </button>
                ))}
              </div>
              {src.coloursSoon ? (
                <p className="text-[11px] text-ink-400">
                  The wood colour range arrives in a later turn. The option is here so a job set up in wood
                  keeps its choice; the colours are not yet.
                </p>
              ) : (
                <ColourPicker
                  label={`${src.label} colour`}
                  value={t.colour}
                  onChange={(c) => setFrontColour(c, t.id)}
                />
              )}
            </div>
          );
        })}
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
        <p className="text-[11px] text-ink-400">
          Every one of these is fitted by the automat and counted in the BOM. You pick the variant; it
          picks the item.
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

      {/* ── door style library ── */}
      <section className="space-y-2">
        <div className="cc-row">
          <span className="text-xs uppercase tracking-wide text-ink-200">Door styles</span>
          <button
            type="button"
            className="cc-btn"
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
