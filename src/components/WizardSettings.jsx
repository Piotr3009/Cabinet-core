import { useEffect, useMemo, useState } from 'react';
import { useProjectStore } from '../stores/projectStore.js';
import { useCabinetProfileStore } from '../stores/cabinetProfileStore.js';
import { useMaterialAssignmentStore } from '../stores/materialAssignmentStore.js';
import { useSettingsSetsStore } from '../stores/settingsSetsStore.js';
import { useUiStore } from '../stores/uiStore.js';
import {
  FRONT_STYLE_OPTIONS, migrateDesign, projectHeights, resolveJoinery,
} from '../engine/design.js';
import { getProjectType } from '../engine/projectTypes.js';
import {
  carcassSources, ceilingFit, frontSources, materialsAssigned, pickerForSource,
  projectDepth, projectDimensions, sourceById, wardrobeStack,
} from '../engine/projectSettings.js';
import { loadDecorCatalogue } from '../lib/decorCatalogue.js';
import { getVeneers, veneerFinishId } from '../engine/veneers.js';
import FrontStyleGallery, { FrontStyleArt } from './FrontStyleGallery.jsx';
import DecorPicker from './DecorPicker.jsx';
import VeneerPicker from './VeneerPicker.jsx';
import ColourPicker from './ColourPicker.jsx';
import JoineryPreview from './JoineryPreview.jsx';
import SheenSlider from './SheenSlider.jsx';
import NumberField from './NumberField.jsx';
// Turn 33 (CLAUDE.md F8): the shaker frame's one resolver — the same number
// the engine cuts pockets to and the settings panel edits.
import { shakerFrameMm } from '../engine/shaker.js';

// ─── TURN 32 (CLAUDE.md F1), RE-SHAPED 15.08.2026 EVENING — THE MOCKUP ──────
//
// The owner walked the shipped step and rejected its one-list shape:
// "przede wszystkim nie oddzielone są carcasy od frontów… bardzo źle."
// The rebuild was then ITERATED AS A CLICKABLE MOCKUP (v1 → v4, each version
// his corrections, v4 his "podoba mi się") and this file is that mockup:
//
//   · TWO SEPARATE CONTAINERS, each with its own small drawing in the corner:
//     CARCASSES first, FRONTS locked until the carcasses are SAVED.
//   · Carcasses: 1–3 types; per type the SOURCE returns —
//     Laminate · Veneer · Spraying, IN THAT ORDER (his ruling: the order is
//     deliberate and differs from the fronts'). Spraying is RAL / F&B lists,
//     never tiles. Drawer boxes stay. The DOG-BONE choice returns, drawn by
//     the ORIGINAL JoineryPreview ("ta grafika… ważne na przyszłość").
//   · Fronts: 1–3 types; per type the SHAPE (the 8-style gallery) and the
//     source — Spraying · Veneer · Laminate, HIS order, the mirror of the
//     carcasses'. Spray = the colour lists, "bez cholernych kafelek".
//   · Under each container, the CHOSEN list with mini swatches — "żeby się
//     pokazywała miniaturka jak przedtem".
//   · Each container gates on ITS OWN Save; nothing proceeds unassigned,
//     but an explicit default counts ("Generic counts; nothing does not").
//
// The turn-12 lesson still holds: this is a SURFACE. Every control writes
// through the same store setters Design Settings uses — a colour chosen here
// is the colour the scene renders and the cut list prices.

const isWardrobeType = (id) => id === 'wardrobe';

// The owner's button words, per container. The profile's records keep their
// own labels for the Settings menu; the WIZARD speaks the mockup's.
const CARCASS_ORDER = ['egger', 'veneer', 'sprayed'];
const CARCASS_WORDS = { egger: 'Laminate', veneer: 'Veneer', sprayed: 'Spraying' };
const FRONT_ORDER = ['spray', 'veneer', 'laminate'];
const FRONT_WORDS = { spray: 'Spraying', veneer: 'Veneer', laminate: 'Laminate' };

function SectionLabel({ children }) {
  return <span className="block text-[10px] uppercase tracking-wide text-ink-400 mb-1">{children}</span>;
}

/** The small drawing in a container's corner — a carcass, or a front leaf. */
function CornerArt({ kind }) {
  if (kind === 'front') {
    return (
      <svg width="40" height="50" viewBox="0 0 52 64" fill="none" className="opacity-80" aria-hidden>
        <rect x="6" y="4" width="40" height="56" rx="2" stroke="#8a8172" strokeWidth="1.5" />
        <rect x="13" y="11" width="26" height="42" rx="1.5" stroke="#8a8172" strokeWidth="1.2" />
        <circle cx="42" cy="32" r="1.8" fill="#c8a24a" />
      </svg>
    );
  }
  return (
    <svg width="56" height="46" viewBox="0 0 74 60" fill="none" className="opacity-80" aria-hidden>
      <path d="M8 18 L36 6 L66 16 L66 46 L38 58 L8 48 Z" stroke="#8a8172" strokeWidth="1.5" />
      <path d="M36 6 L36 36 M8 18 L36 30 L66 16 M36 36 L38 58" stroke="#8a8172" strokeWidth="1.2" />
      <path d="M8 18 L8 48 M66 16 L66 46" stroke="#8a8172" strokeWidth="1.2" />
      <rect x="14" y="26" width="18" height="3" fill="#5c5442" />
      <rect x="14" y="34" width="18" height="3" fill="#5c5442" />
    </svg>
  );
}

/** One line of the CHOSEN list — the mini swatch and the words beside it. */
function ChosenRow({ who, hex, thumb, text }) {
  return (
    <div className="flex items-center gap-2 text-[11px]" data-chosen-row={who}>
      <span className="w-[86px] shrink-0 text-[10px] uppercase tracking-wide text-ink-400">{who}</span>
      <span
        className="w-5 h-5 rounded border border-shell-600 shrink-0 bg-cover bg-center"
        style={thumb ? { backgroundImage: `url(${thumb})` } : { background: hex || '#3a3a3e' }}
      />
      <span className="truncate text-ink-200">{text}</span>
    </div>
  );
}

export default function WizardSettings({ onRoomSetup, onGate }) {
  const project = useProjectStore((s) => s.project);
  const storedDesign = useProjectStore((s) => s.project.design);
  const setProjectInfo = useProjectStore((s) => s.setProjectInfo);
  const setDesign = useProjectStore((s) => s.setDesign);
  const setProjectDefaults = useProjectStore((s) => s.setProjectDefaults);
  const setProjectHeights = useProjectStore((s) => s.setProjectHeights);
  const setFrontTypes = useProjectStore((s) => s.setFrontTypes);
  const setFrontType = useProjectStore((s) => s.setFrontType);
  const setFrontMaterial = useProjectStore((s) => s.setFrontMaterial);
  const setCarcassTypes = useProjectStore((s) => s.setCarcassTypes);
  const setCarcassSource = useProjectStore((s) => s.setCarcassSource);
  const setCarcassMaterial = useProjectStore((s) => s.setCarcassMaterial);
  const setCarcassFinish = useProjectStore((s) => s.setCarcassFinish);
  const profile = useCabinetProfileStore((s) => s.profile);
  const materials = useMaterialAssignmentStore((s) => s.materials);
  const sets = useSettingsSetsStore((s) => s.sets);
  const applyTo = useSettingsSetsStore((s) => s.applyTo);
  const notify = useUiStore((s) => s.notify);

  const design = useMemo(() => migrateDesign(storedDesign), [storedDesign]);
  const heights = useMemo(() => projectHeights(design, profile), [design, profile]);
  const type = getProjectType(design.projectType);
  const wardrobe = isWardrobeType(design.projectType);
  const roomHeight = Number(project.room?.height) || 0;
  const joinery = resolveJoinery(design, profile);

  // ── the two gates: each container SAVED, and any edit un-saves it ──
  const [carcSaved, setCarcSaved] = useState(false);
  const [frontsSaved, setFrontsSaved] = useState(false);
  useEffect(() => { onGate?.(carcSaved, frontsSaved); }, [carcSaved, frontsSaved, onGate]);
  const touchCarcass = () => setCarcSaved(false);
  const touchFronts = () => setFrontsSaved(false);

  // One accordion at a time — a slot's picker scrolls inside itself.
  const [open, setOpen] = useState(null); // { kind:'style'|'material', slot:'front'|'carcass', id }
  const toggle = (kind, slot, id) => setOpen((o) => (
    o && o.kind === kind && o.slot === slot && o.id === id ? null : { kind, slot, id }
  ));

  // The decor catalogue, for the mini swatches ("miniaturka jak przedtem") —
  // hexes and thumbnails by finish id. Loaded once; a uni is a flat hex.
  const [decorSwatch, setDecorSwatch] = useState({});
  useEffect(() => {
    let alive = true;
    loadDecorCatalogue().then(({ decors }) => {
      if (!alive || !Array.isArray(decors)) return;
      const map = {};
      for (const d of decors) {
        const entry = { hex: d.hex || null, thumb: d.thumb || null };
        map[`egger:${d.id}`] = entry; map[`decor:${d.id}`] = entry;
      }
      setDecorSwatch(map);
    });
    return () => { alive = false; };
  }, []);
  const veneerHex = (finishId) => {
    const v = getVeneers().find((x) => veneerFinishId(x) === finishId);
    return v?.hex || '#C2A485';
  };

  const frontTypes = design.fronts.types.length ? design.fronts.types : [{
    id: 'f1', label: 'Front 1', style: null, material_id: null, finish_id: null, colour: design.colour.front,
  }];
  const carcassTypes = design.carcass.types;
  const assignment = materialsAssigned(design, profile);
  const boardMaterials = materials.filter((m) => m.category === 'board' || m.category === 'front');

  const stack = wardrobeStack(heights);
  const fit = wardrobe ? ceilingFit({ total: stack.total, roomHeight, profile }) : { gap: null, state: 'ok' };

  const loadSet = (id, name) => {
    const next = applyTo(design, id);
    if (!next) { notify('That settings set is no longer on this computer.', 'warn'); return; }
    setDesign(next);
    setCarcSaved(false); setFrontsSaved(false);
    notify(`"${name}" loaded — check both containers and Save them.`, 'ok');
  };

  const styleOf = (t) => FRONT_STYLE_OPTIONS.find((o) => o.id === (t.style || design.fronts.style)) || null;

  // What a slot has CHOSEN, as words + a swatch — the summary rows.
  const chosenOf = (t, kind) => {
    const board = materials.find((m) => m.id === t.material_id) || null;
    const sourceList = kind === 'carcass' ? carcassSources(profile) : frontSources(profile);
    const src = sourceById(sourceList, t.source) || null;
    const sprayColour = kind === 'carcass' ? design.colour.carcass : t.colour;
    if (src && pickerForSource(src) === 'colour') {
      if (!sprayColour?.hex && !sprayColour?.name) return null;
      return {
        hex: sprayColour.hex || '#888',
        text: `${sprayColour.name || sprayColour.hex} · sprayed`,
      };
    }
    if (t.finish_id) {
      const isVeneer = String(t.finish_id).startsWith('veneer:');
      const sw = isVeneer ? { hex: veneerHex(t.finish_id) } : (decorSwatch[t.finish_id] || {});
      const label = String(t.finish_id).replace(/^(decor|egger|veneer):/, '');
      return {
        hex: sw.hex || '#6b5a44',
        thumb: sw.thumb || null,
        text: `${isVeneer ? 'Veneer' : 'EGGER'} · ${label}${board ? ` · ${board.name}` : ''}`,
      };
    }
    if (board) return { hex: '#57616b', text: `${board.name}${board.placeholder ? ' (generic)' : ''}` };
    return null;
  };

  // ── slot mutations, each un-saving its own container ──
  const pickCarcassSource = (typeId, src) => { touchCarcass(); setCarcassSource(typeId, src); };
  const pickCarcassDecor = (typeId, id) => { touchCarcass(); setCarcassSource(typeId, 'egger'); setCarcassFinish(typeId, id); };
  const pickCarcassVeneer = (typeId, id) => { touchCarcass(); setCarcassSource(typeId, 'veneer'); setCarcassFinish(typeId, id); };
  const pickCarcassBoard = (typeId, id) => { touchCarcass(); setCarcassMaterial(typeId, id); };
  const pickCarcassColour = (c) => { touchCarcass(); setDesign({ colour: { ...design.colour, carcass: c } }); };

  const pickFrontSource = (typeId, src) => { touchFronts(); setFrontType(typeId, { source: src }); };
  const pickFrontDecor = (typeId, src, id) => { touchFronts(); setFrontType(typeId, { source: src, finish_id: id }); };
  const pickFrontBoard = (typeId, id) => { touchFronts(); setFrontMaterial(typeId, id); };
  const pickFrontColour = (typeId, c) => { touchFronts(); setFrontType(typeId, { source: 'spray', colour: c }); };

  const carcassMissing = assignment.carcass.filter((a) => !a.assigned);
  const frontsMissing = assignment.fronts.filter((a) => !a.assigned);

  // ── the picker a slot's source asks for, rendered inline in the open slot ──
  const slotPicker = (kind, t) => {
    const list = kind === 'carcass' ? carcassSources(profile) : frontSources(profile);
    const src = sourceById(list, t.source) || sourceById(list, kind === 'carcass' ? 'egger' : 'laminate');
    const picker = pickerForSource(src);
    if (picker === 'colour') {
      const current = kind === 'carcass' ? design.colour.carcass : t.colour;
      return (
        <div data-spray-picker={`${kind}:${t.id}`}>
          <ColourPicker
            value={current}
            onChange={(c) => (kind === 'carcass' ? pickCarcassColour(c) : pickFrontColour(t.id, c))}
          />
        </div>
      );
    }
    if (picker === 'veneer' && kind === 'carcass') {
      return (
        <VeneerPicker
          value={t.finish_id}
          onPick={(id) => pickCarcassVeneer(t.id, id)}
          onClear={() => { touchCarcass(); setCarcassFinish(t.id, null); }}
        />
      );
    }
    // decor grid — laminate always; the FRONT's veneer too (turn 20 F12.3:
    // both faced fronts pick from the same 85-decor catalogue).
    return (
      <div className="space-y-2">
        <div className="max-h-[220px] overflow-auto cc-scroll">
          <DecorPicker
            value={t.finish_id}
            onPick={(id) => (kind === 'carcass'
              ? pickCarcassDecor(t.id, id)
              : pickFrontDecor(t.id, t.source || 'laminate', id))}
            onClear={() => (kind === 'carcass'
              ? (touchCarcass(), setCarcassFinish(t.id, null))
              : (touchFronts(), setFrontType(t.id, { finish_id: null })))}
          />
        </div>
        <div className="cc-row">
          <span className="text-[11px] text-ink-400 shrink-0">Stock board</span>
          <select
            className="cc-input flex-1"
            value={t.material_id || ''}
            onChange={(e) => (kind === 'carcass'
              ? pickCarcassBoard(t.id, e.target.value || null)
              : pickFrontBoard(t.id, e.target.value || null))}
          >
            <option value="">No stock board…</option>
            <optgroup label="Generic — geometry only, assign a real board before check-out">
              {boardMaterials.filter((m) => m.placeholder).map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </optgroup>
            <optgroup label="Stock">
              {boardMaterials.filter((m) => !m.placeholder).map((m) => (
                <option key={m.id} value={m.id}>{`${m.code ? `${m.code} · ` : ''}${m.name}`}</option>
              ))}
            </optgroup>
          </select>
        </div>
      </div>
    );
  };

  const sourceSeg = (kind, t) => {
    const order = kind === 'carcass' ? CARCASS_ORDER : FRONT_ORDER;
    const words = kind === 'carcass' ? CARCASS_WORDS : FRONT_WORDS;
    const active = t.source || (kind === 'carcass' ? 'egger' : 'laminate');
    return (
      <div className="flex gap-1" data-source-seg={`${kind}:${t.id}`}>
        {order.map((id) => (
          <button
            key={id}
            type="button"
            className={`cc-btn px-2 ${active === id ? 'border-gold text-gold' : ''}`}
            data-source-option={id}
            onClick={() => (kind === 'carcass' ? pickCarcassSource(t.id, id) : pickFrontSource(t.id, id))}
          >
            {words[id]}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-3" data-wizard-settings="1">
      {/* ── 1 · Number · Client · Type — the type is a label, never a second dropdown ── */}
      <div className="grid grid-cols-[150px_1fr_180px] gap-3 items-end">
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
        <div className="block">
          <span className="cc-label">Type</span>
          <span
            className="cc-input flex items-center text-gold cursor-default select-none"
            title="Chosen in step 2 — go Back to change it"
            data-wizard-type-label="1"
          >
            {type.label}
          </span>
        </div>
      </div>

      {/* ── 2 · Saved settings sets — a LOAD list, at the top ── */}
      {sets.length > 0 && (
        <div data-wizard-sets="1">
          <SectionLabel>Load saved settings</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {sets.map((s) => (
              <button
                key={s.id}
                type="button"
                className="cc-btn px-2"
                title="Fills this step and the Hardware step completely"
                data-set-load={s.id}
                onClick={() => loadSet(s.id, s.name)}
              >
                ↧ {s.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── 3 · Dimensions, per project type ── */}
      <div data-wizard-dimensions="1">
        <div className="cc-row">
          <SectionLabel>Dimensions</SectionLabel>
          <span className="flex-1" />
          <span className="text-[10px] text-ink-400 mr-2">
            {design.scope === 'room' ? 'Room' : 'Wall'} height: {roomHeight || '—'} mm
          </span>
          {onRoomSetup && (
            <button type="button" className="cc-btn px-2" data-room-setup="1" onClick={onRoomSetup}>
              Room setup…
            </button>
          )}
        </div>
        {wardrobe ? (
          <div className="space-y-1.5">
            <div className="grid grid-cols-3 gap-3">
              <label className="block">
                <span className="cc-label">Default height of wardrobe</span>
                <NumberField
                  value={heights.tall}
                  min={profile.projectHeights.min}
                  max={profile.projectHeights.max}
                  onCommit={(v) => setProjectHeights({ tall: v })}
                  data-wizard-dim="tall"
                />
              </label>
              <label className="block">
                <span className="cc-label">Plinth height</span>
                <NumberField
                  value={heights.toeKick}
                  min={profile.projectHeights.toeKickMin ?? 0}
                  max={profile.projectHeights.max}
                  onCommit={(v) => setProjectHeights({ toeKick: v })}
                  data-wizard-dim="toeKick"
                />
              </label>
              <label className="block">
                <span className="cc-label">Depth (all units)</span>
                <NumberField
                  value={projectDepth(design, profile)}
                  min={100}
                  max={1000}
                  onCommit={(v) => setProjectDefaults({ depth: v })}
                  data-wizard-dim="depth"
                />
              </label>
            </div>
            <p className="text-[11px] text-ink-200" data-total-line="1">
              total item = wardrobe + legs = <span className="text-gold">{stack.total} mm</span>
            </p>
            {fit.state === 'over' && (
              <p className="text-[11px] text-status-danger border border-status-danger/60 bg-status-danger/10 rounded px-2 py-1" data-ceiling-error="1">
                Total item {stack.total} mm is {Math.abs(fit.gap)} mm taller than the {roomHeight} mm room — lower
                the wardrobe or the plinth to continue.
              </p>
            )}
            {fit.state === 'question' && (
              <div className="border border-gold/60 bg-gold/5 rounded px-2 py-1.5 space-y-1" data-ceiling-question="1">
                <p className="text-[11px] text-gold">
                  Only {fit.gap} mm to the ceiling. To the ceiling, with no infill?
                </p>
                <p className="text-[10px] text-ink-400">
                  An infill can be scribed to the ceiling&rsquo;s real shape — ceilings are rarely straight.
                </p>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    className={`cc-btn px-2 ${design.ceiling === 'flush' ? 'border-gold text-gold' : ''}`}
                    data-ceiling-answer="flush"
                    onClick={() => setDesign({ ceiling: 'flush' })}
                  >
                    Yes — to the ceiling
                  </button>
                  <button
                    type="button"
                    className={`cc-btn px-2 ${design.ceiling === 'infill' ? 'border-gold text-gold' : ''}`}
                    data-ceiling-answer="infill"
                    onClick={() => setDesign({ ceiling: 'infill' })}
                  >
                    No — keep an infill
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-2">
            {projectDimensions(design, profile, heights).map((d) => (
              <label key={d.key} className="block">
                <span className="cc-label">{d.label}</span>
                <NumberField
                  value={d.value}
                  onCommit={(v) => {
                    if (d.key === 'depth') { setProjectDefaults({ depth: v }); return; }
                    const { notices } = setProjectHeights({ [d.key]: v });
                    for (const n of notices) notify(n, 'warn');
                  }}
                  data-wizard-dim={d.key}
                />
              </label>
            ))}
          </div>
        )}
      </div>

      {/* ══ 4 · CARCASSES — its own container, saved before the fronts open ══ */}
      <section
        className={`relative border rounded-lg p-3 pt-2.5 space-y-2 ${carcSaved ? 'border-gold/70' : 'border-shell-600'}`}
        data-carcass-container="1"
      >
        <div className="absolute top-2 right-2.5"><CornerArt kind="carcass" /></div>
        <div>
          <span className="block text-[11px] uppercase tracking-[0.16em] text-gold">Carcasses</span>
          <span className="block text-[10px] text-ink-400">The boxes — boards, drawer boxes and the CNC corner.</span>
        </div>

        <div className="cc-row">
          <span className="text-[11px] text-ink-200">Carcass types</span>
          {[1, 2, 3].map((n) => (
            <button
              key={n}
              type="button"
              className={`cc-btn px-2.5 ${carcassTypes.length === n ? 'border-gold text-gold' : ''}`}
              data-carcass-count={n}
              onClick={() => { touchCarcass(); setCarcassTypes(n); }}
            >
              {n}
            </button>
          ))}
        </div>

        <div className={`grid gap-2 ${carcassTypes.length === 1 ? 'grid-cols-1' : carcassTypes.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
          {carcassTypes.map((t) => {
            const opened = open?.kind === 'material' && open.slot === 'carcass' && open.id === t.id;
            return (
              <div key={t.id} className="border border-shell-600 rounded p-2 space-y-1.5" data-carcass-slot={t.id}>
                <div className="cc-row">
                  <span className="text-[11px] text-ink-50">{t.label}</span>
                  <span className="flex-1" />
                  <button
                    type="button"
                    className={`cc-btn px-2 ${opened ? 'border-gold text-gold' : ''}`}
                    data-material-slot={`carcass:${t.id}`}
                    onClick={() => toggle('material', 'carcass', t.id)}
                  >
                    Choose…
                  </button>
                </div>
                {sourceSeg('carcass', t)}
              </div>
            );
          })}
        </div>
        {open?.kind === 'material' && open.slot === 'carcass' && (() => {
          const t = carcassTypes.find((x) => x.id === open.id);
          return t ? (
            <div className="border border-shell-600 rounded p-2" data-material-picker-for={`carcass:${t.id}`}>
              {slotPicker('carcass', t)}
            </div>
          ) : null;
        })()}

        {/* drawer boxes — asked once per project (T32 F7), lives with the boxes */}
        <div className="cc-row" data-drawer-boxes="1">
          <span className="text-[11px] text-ink-200 shrink-0">Drawer boxes</span>
          {[['same', 'Same board as carcass'], ['ready', 'Ready-made system']].map(([id, label]) => (
            <button
              key={id}
              type="button"
              data-drawer-boxes-option={id}
              className={`cc-btn px-2 ${(design.drawerBoxes.mode ?? 'same') === id ? 'border-gold text-gold' : ''}`}
              onClick={() => { touchCarcass(); setDesign({ drawerBoxes: { mode: id } }); }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* the CNC corner — the owner's returned choice, drawn by the ORIGINAL
            JoineryPreview ("ta grafika… ważne na przyszłość"). Recorded on the
            design (`cncCorner`) — the machining already cuts the LISP's relief;
            the export branches on this the day it needs to. */}
        <div className="space-y-1.5" data-cnc-corner="1">
          <span className="block text-[10px] uppercase tracking-wide text-ink-400">CNC corner</span>
          <div className="border border-shell-600 rounded p-2 bg-shell-800">
            <JoineryPreview profile={profile} joinery={joinery} />
          </div>
          <div className="flex gap-1.5">
            {[['dogbone', 'Dog-bone (CNC)'], ['square', 'Square (hand-chisel)']].map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`cc-btn px-2 ${design.cncCorner === id ? 'border-gold text-gold' : ''}`}
                data-cnc-corner-option={id}
                onClick={() => { touchCarcass(); setDesign({ cncCorner: id }); }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* the CHOSEN list — mini swatches, "jak przedtem" */}
        <div className="border-t border-dashed border-shell-600 pt-1.5 space-y-1" data-carcass-chosen="1">
          {carcassTypes.map((t) => {
            const c = chosenOf(t, 'carcass');
            return c ? <ChosenRow key={t.id} who={t.label} hex={c.hex} thumb={c.thumb} text={c.text} /> : null;
          })}
        </div>

        <div className="flex items-center gap-2 border-t border-dashed border-shell-600 pt-2">
          {carcassMissing.length > 0 ? (
            <span className="flex-1 text-[11px] text-status-warn" data-carcass-missing="1">
              {carcassMissing.map((s) => s.label).join(', ')} — no material yet. Generic counts as an
              assignment; nothing does not.
            </span>
          ) : (
            <span className="flex-1 text-[11px] text-status-ok" data-carcass-ok="1">
              {carcSaved ? 'Carcasses saved ✓' : 'All carcasses assigned — Save to open the fronts.'}
            </span>
          )}
          <button
            type="button"
            className="cc-btn-gold px-3"
            disabled={carcassMissing.length > 0 || carcSaved}
            data-save-carcasses="1"
            onClick={() => setCarcSaved(true)}
          >
            Save carcasses
          </button>
        </div>
      </section>

      {/* ══ 5 · FRONTS — locked until the carcasses are saved ══ */}
      <section
        className={`relative border rounded-lg p-3 pt-2.5 space-y-2 ${frontsSaved ? 'border-gold/70' : 'border-shell-600'} ${carcSaved ? '' : 'opacity-45 pointer-events-none select-none'}`}
        data-fronts-container="1"
        data-fronts-locked={carcSaved ? '0' : '1'}
        aria-disabled={!carcSaved}
      >
        <div className="absolute top-2 right-2.5"><CornerArt kind="front" /></div>
        <div>
          <span className="block text-[11px] uppercase tracking-[0.16em] text-gold">Fronts</span>
          <span className="block text-[10px] text-ink-400">
            Shape first, colours second{carcSaved ? '' : ' — save the carcasses to open this'}.
          </span>
        </div>

        <div className="cc-row" data-wizard-fronts="1">
          <span className="text-[11px] text-ink-200">How many front types in this project?</span>
          {[1, 2, 3].map((n) => (
            <button
              key={n}
              type="button"
              className={`cc-btn px-2.5 ${frontTypes.length === n ? 'border-gold text-gold' : ''}`}
              data-front-count={n}
              onClick={() => { touchFronts(); setFrontTypes(n); }}
            >
              {n}
            </button>
          ))}
        </div>

        <div className={`grid gap-2 ${frontTypes.length === 1 ? 'grid-cols-1' : frontTypes.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
          {frontTypes.map((t) => {
            const st = styleOf(t);
            const styleOpen = open?.kind === 'style' && open.id === t.id;
            const matOpen = open?.kind === 'material' && open.slot === 'front' && open.id === t.id;
            return (
              <div key={t.id} className="border border-shell-600 rounded p-2 space-y-1.5" data-front-slot={t.id}>
                <button
                  type="button"
                  className={`w-full border rounded p-1.5 flex items-center gap-2 text-left transition-colors ${styleOpen
                    ? 'border-gold bg-shell-700' : 'border-shell-600 hover:bg-shell-700'}`}
                  data-style-slot={t.id}
                  onClick={() => toggle('style', 'front', t.id)}
                >
                  <span className="w-8 h-10 shrink-0"><FrontStyleArt styleId={t.style || design.fronts.style} className="w-full h-full" /></span>
                  <span className="min-w-0">
                    <span className="block text-[11px] text-ink-50">{t.label}</span>
                    <span className="block text-[10px] text-ink-400 truncate">
                      {st ? st.label : 'Pick a style'}{t.style ? '' : ' (project default)'}
                    </span>
                  </span>
                </button>
                <div className="cc-row">
                  {sourceSeg('front', t)}
                  <span className="flex-1" />
                  <button
                    type="button"
                    className={`cc-btn px-2 ${matOpen ? 'border-gold text-gold' : ''}`}
                    data-material-slot={`front:${t.id}`}
                    onClick={() => toggle('material', 'front', t.id)}
                  >
                    Choose…
                  </button>
                </div>
                {/* ─── TURN 33 (CLAUDE.md F8): THE SHAKER FRAME RETURNS ─────
                    The chat rebuild lost the field; the engine's number
                    (T25: equal on all four sides, 10–200, profile default
                    70) never stopped being read. Shown ONLY when this slot's
                    style is Shaker — a slot with no style of its own is
                    Shaker when the project is — and it writes the
                    PROJECT-WIDE fronts.shakerFrame, which the label says.
                    [OWNER — placement to confirm]: in the Shaker slot's
                    card, accepted by silence. */}
                {(t.style || design.fronts.style) === 'S' && (
                  <div className="flex items-center gap-1.5" data-shaker-frame-slot={t.id}>
                    <span className="text-[10px] text-ink-400 shrink-0">Frame width (all shaker fronts)</span>
                    <NumberField
                      className="cc-input w-16 text-right"
                      value={shakerFrameMm(design, profile)}
                      min={profile.front.types.S.frameMin}
                      max={profile.front.types.S.frameMax}
                      onCommit={(v) => {
                        touchFronts();
                        setDesign({ fronts: { ...design.fronts, shakerFrame: v } });
                      }}
                    />
                    <span className="text-[10px] text-ink-400">mm</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {open?.kind === 'style' && (() => {
          const t = frontTypes.find((x) => x.id === open.id);
          return t ? (
            <div className="border border-shell-600 rounded p-2" data-style-gallery-for={t.id}>
              <FrontStyleGallery
                value={t.style || design.fronts.style}
                onPick={(id) => {
                  touchFronts();
                  setFrontType(t.id, { style: id });
                  // Slot 1's shape IS the project's shape — the field every
                  // pre-T32 reader (door styles, drawings) still reads.
                  if (frontTypes[0] && t.id === frontTypes[0].id) {
                    setProjectDefaults({ fronts: { style: id } });
                  }
                }}
              />
            </div>
          ) : null;
        })()}
        {open?.kind === 'material' && open.slot === 'front' && (() => {
          const t = frontTypes.find((x) => x.id === open.id);
          return t ? (
            <div className="border border-shell-600 rounded p-2" data-material-picker-for={`front:${t.id}`}>
              {slotPicker('front', t)}
            </div>
          ) : null;
        })()}

        {/* the CHOSEN list — mini swatches */}
        <div className="border-t border-dashed border-shell-600 pt-1.5 space-y-1" data-fronts-chosen="1">
          {frontTypes.map((t) => {
            const c = chosenOf(t, 'front');
            return c ? <ChosenRow key={t.id} who={t.label} hex={c.hex} thumb={c.thumb} text={c.text} /> : null;
          })}
        </div>

        <div className="flex items-center gap-2 border-t border-dashed border-shell-600 pt-2">
          {frontsMissing.length > 0 ? (
            <span className="flex-1 text-[11px] text-status-warn" data-fronts-missing="1">
              {frontsMissing.map((s) => s.label).join(', ')} — no material yet.
            </span>
          ) : (
            <span className="flex-1 text-[11px] text-status-ok" data-fronts-ok="1">
              {frontsSaved ? 'Fronts saved ✓' : 'All fronts assigned — Save to open the hardware.'}
            </span>
          )}
          <button
            type="button"
            className="cc-btn-gold px-3"
            disabled={frontsMissing.length > 0 || frontsSaved}
            data-save-fronts="1"
            onClick={() => setFrontsSaved(true)}
          >
            Save fronts
          </button>
        </div>
      </section>

      {/* ── 6 · Sheen, after the colours — the owner's order. Ironmongery is step 5. ── */}
      <SheenSlider design={design} setDesign={setDesign} profile={profile} />
    </div>
  );
}
