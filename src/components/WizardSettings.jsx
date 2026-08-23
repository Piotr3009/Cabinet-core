import { useEffect, useMemo, useRef, useState } from 'react';
import { useProjectStore } from '../stores/projectStore.js';
import { useCabinetProfileStore } from '../stores/cabinetProfileStore.js';
import { isJcMaterial, useMaterialAssignmentStore } from '../stores/materialAssignmentStore.js';
import { useSettingsSetsStore } from '../stores/settingsSetsStore.js';
import { useUiStore } from '../stores/uiStore.js';
import {
  FRONT_STYLE_OPTIONS, colourLabel, finishById, migrateDesign, projectHeights, resolveJoinery,
} from '../engine/design.js';
import { getProjectType, PROJECT_TYPES as PROJECT_TYPE_OPTIONS } from '../engine/projectTypes.js';
import {
  carcassSources, ceilingFit, frontSources, hardwareChoices, materialsAssigned, pickerForSource,
  projectBoardThickness, projectDepth, projectDimensions, projectFrontThickness, sourceById,
  wardrobeStack,
} from '../engine/projectSettings.js';
import { RUN_MATERIAL_GROUPS, runMaterialSetting } from '../engine/materials.js';
import { drawerBoxGate, thicknessSlotRows } from '../engine/thickness.js';
import { hingePlatePilotD, hingeStandard } from '../engine/cabinet.js';
import { hingeReResolve } from '../engine/hinges.js';
import { resolveRunnerVariant } from '../engine/runners.js';
import { formatMm } from '../engine/format.js';
import { loadDecorCatalogue } from '../lib/decorCatalogue.js';
import { contrastInk } from '../lib/pswColors.js';
import { getVeneers, veneerFinishId } from '../engine/veneers.js';
import FrontStyleGallery, { FrontStyleArt } from './FrontStyleGallery.jsx';
import ColourPicker from './ColourPicker.jsx';
import JoineryPreview from './JoineryPreview.jsx';
import SheenSlider from './SheenSlider.jsx';
import WizardHardware from './WizardHardware.jsx';
import AudienceToggle from './AudienceToggle.jsx';
import NumberField from './NumberField.jsx';
// ─── TURN 36 (CLAUDE.md F1): ONE SETTINGS MODAL ─────────────────────────────
// The two rows the old panel owns and the unified one now shows are IMPORTED
// from it rather than copied — one implementation, two surfaces, so the sheet
// buttons and the hinge block cannot drift between the doors.
import { HingeHardware, SheetSizeRow } from './SettingsPanel.jsx';
// Turn 33 (CLAUDE.md F8): the shaker frame's one resolver — the same number
// the engine cuts pockets to and the settings panel edits.
import { shakerFrameMm } from '../engine/shaker.js';
// ─── TURN 44 (CLAUDE.md F2 / iron rule 5): THE TREE AND ITS ONE FILTER ──────
// The tab list, the per-node audience map and the kitchen-only dimension rule
// are DATA in lib/wizardTabs.js. Nothing about who-sees-what is decided in
// this file: it asks `show(id)` and draws or does not draw.
import {
  WIZARD_TABS, dimensionAsked, firstTab, nodeVisible, tabAfter, tabBefore, tabPosition,
  visibleTabs,
} from '../lib/wizardTabs.js';
// T44 F5: the four openings, and the fields they already write.
import { FRONT_OPENINGS, frontOpening, frontOpeningPatch } from '../lib/frontOpening.js';
// T44 F4: the picker that stops fighting you — full width, in the sequence.
import MaterialChoicePanel from './MaterialChoicePanel.jsx';
// T44 F8: the finale — "Zapisać te ustawienia jako Twój standard?"
import SaveSettingsSetModal from './SaveSettingsSetModal.jsx';

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

/** What the settings-set dropdown says when no set has been chosen (T44 F3). */
const DEFAULT_SET_LABEL = 'Default settings';

/**
 * What a project dimension is CALLED on this screen (T44 F3).
 *
 * `projectDimensions` is the engine's list and it names the plinth "Plinth
 * height"; the owner's own words for the row are *"Plinth height (toe kick)"*.
 * `src/engine/**` is frozen byte-for-byte tonight (iron rule 2) and a LABEL is
 * a surface decision in any case, so the one word that differs is corrected
 * here — in one function, so the wardrobe headline and the kitchen grid cannot
 * disagree about what the row is called.
 */
const dimensionLabel = (d) => (d.key === 'toeKick' ? 'Plinth height (toe kick)' : d.label);

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

export default function WizardSettings({ onRoomSetup, onGate, door = 'wizard' }) {
  // ─── TURN 36 (CLAUDE.md F1): TWO DOORS, ONE FORM ──────────────────────────
  //
  // The owner: "mamy new project i edit project — 2 różne setup modale, a
  // powinien to być ten sam modal." This component IS that one modal now. The
  // door it was opened through changes exactly two things and nothing else:
  //
  //   · the PROJECT TYPE is a label in the wizard (step 2 chose it, and a
  //     second control that could disagree with step 2 is the bug turn 12 was
  //     about) and an editable select from the menu, where there is no step 2
  //     to go back to;
  //   · the two container SAVES gate the wizard's "Next — hardware" button.
  //     From the menu there is nothing to gate — the project already exists —
  //     so both start satisfied and no edit re-locks them.
  //
  // Everything below that line is the same form, the same store setters and
  // the same behaviour whichever door was used.
  const editDoor = door === 'project';
  const project = useProjectStore((s) => s.project);
  const storedDesign = useProjectStore((s) => s.project.design);
  const setProjectInfo = useProjectStore((s) => s.setProjectInfo);
  const setDesign = useProjectStore((s) => s.setDesign);
  const setProjectDefaults = useProjectStore((s) => s.setProjectDefaults);
  const setProjectHeights = useProjectStore((s) => s.setProjectHeights);
  const setFrontTypes = useProjectStore((s) => s.setFrontTypes);
  const setFrontType = useProjectStore((s) => s.setFrontType);
  const setFrontMaterial = useProjectStore((s) => s.setFrontMaterial);
  const setFrontColour = useProjectStore((s) => s.setFrontColour);
  const setCarcassTypes = useProjectStore((s) => s.setCarcassTypes);
  const setCarcassSource = useProjectStore((s) => s.setCarcassSource);
  const setCarcassMaterial = useProjectStore((s) => s.setCarcassMaterial);
  const setCarcassFinish = useProjectStore((s) => s.setCarcassFinish);
  // ── the rows the old panel owned alone until this turn (F1) ──
  const setSlotThickness = useProjectStore((s) => s.setSlotThickness);
  const setHingeStandard = useProjectStore((s) => s.setHingeStandard);
  const setHingeHardware = useProjectStore((s) => s.setHingeHardware);
  const setRunnerVariant = useProjectStore((s) => s.setRunnerVariant);
  const setShelfSleeve = useProjectStore((s) => s.setShelfSleeve);
  const setRunMaterial = useProjectStore((s) => s.setRunMaterial);
  const addDoorStyle = useProjectStore((s) => s.addDoorStyle);
  const updateDoorStyle = useProjectStore((s) => s.updateDoorStyle);
  const removeDoorStyle = useProjectStore((s) => s.removeDoorStyle);
  const units = useProjectStore((s) => s.units);
  const updateUnitParamsBulk = useProjectStore((s) => s.updateUnitParamsBulk);
  const profile = useCabinetProfileStore((s) => s.profile);
  // F8/F15 are WORKSHOP numbers — the profile's, not the project's.
  const setProfile = useCabinetProfileStore((s) => s.setProfile);
  const materials = useMaterialAssignmentStore((s) => s.materials);
  const assignmentData = useMaterialAssignmentStore((s) => s.data);
  const sets = useSettingsSetsStore((s) => s.sets);
  const applyTo = useSettingsSetsStore((s) => s.applyTo);
  const applyToAsync = useSettingsSetsStore((s) => s.applyToAsync);
  const setsSource = useSettingsSetsStore((s) => s.source);
  const saveSet = useSettingsSetsStore((s) => s.save);
  const removeSet = useSettingsSetsStore((s) => s.remove);
  const notify = useUiStore((s) => s.notify);

  const design = useMemo(() => migrateDesign(storedDesign), [storedDesign]);
  const heights = useMemo(() => projectHeights(design, profile), [design, profile]);
  const type = getProjectType(design.projectType);
  const wardrobe = isWardrobeType(design.projectType);
  const roomHeight = Number(project.room?.height) || 0;
  const joinery = resolveJoinery(design, profile);

  // ── the two gates: each container SAVED, and any edit un-saves it ──
  // From the EDIT door there is nothing to gate (F1): both start satisfied and
  // an edit does not re-lock them, so the fronts container is never dead under
  // the hand of somebody editing a project that already exists.
  const [carcSaved, setCarcSaved] = useState(editDoor);
  const [frontsSaved, setFrontsSaved] = useState(editDoor);
  useEffect(() => { onGate?.(carcSaved, frontsSaved); }, [carcSaved, frontsSaved, onGate]);
  const touchCarcass = () => { if (!editDoor) setCarcSaved(false); };
  const touchFronts = () => { if (!editDoor) setFrontsSaved(false); };

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
  // Turn 39 (CLAUDE.md F7): the same third argument the Start button's gate
  // takes, so this panel and that button can never disagree about a board.
  const assignment = materialsAssigned(design, profile, assignmentData);
  const boardMaterials = materials.filter((m) => m.category === 'board' || m.category === 'front');

  // ─── TURN 36 (CLAUDE.md F1): THE OLD PANEL'S HARD GATES, CARRIED WHOLE ────
  //
  // "Every control keeps its exact behaviour and store wiring." The T15-B gate
  // is the one that matters most here: a board or a source that would change
  // what the project is DRAWN at, once cabinets exist, asks first. In the
  // wizard there are no cabinets yet, so it never fires and step 4 behaves
  // exactly as it did; from the menu it fires exactly as the old panel's did.
  const unitCount = units.length;
  const carcass1Board = materials.find((m) => m.id === design.carcass.types[0]?.material_id) || null;
  const drawnBoardT = carcass1Board?.thickness
    ?? (design.thickness.custom ?? design.thickness.board ?? 18);
  const frontBoard = projectFrontThickness(design, profile, materials);
  const board = projectBoardThickness(design, profile);
  const pinsThickness = (typeId) => typeId === design.carcass.types[0]?.id;
  const [thickGate, setThickGate] = useState(null);   // { typeId, thickness, label, apply }
  const [frontGate, setFrontGate] = useState(null);   // { typeId, thickness, label, apply }
  const [slotGate, setSlotGate] = useState(null);     // { id, label, was, next }
  const [editingStyle, setEditingStyle] = useState(null);
  const [joineryOpen, setJoineryOpen] = useState(false);

  // ─── TURN 44 (CLAUDE.md F2): THE SEQUENCE, AND WHO IS READING IT ──────────
  //
  // The owner's verdict on the single scroll: *"do dupy — za małe, chaotyczne,
  // wszystko naraz."* So step 4 is a SEQUENCE of six tabs, and this block is
  // its whole state: which tab, which tabs have been visited (they stay
  // clickable), and where inside the two long tabs the submodal walk has got
  // to. Everything below the tab bar is the same form it always was, drawn one
  // question at a time.
  //
  // `audience` is the app-level mode of iron rule 5. It is READ here and obeyed;
  // the tree and the filter are `lib/wizardTabs.js`'s, so this file never
  // decides who may see what.
  const audience = useUiStore((s) => s.audience);
  const tabs = useMemo(() => visibleTabs(audience), [audience]);
  const [tab, setTab] = useState(() => firstTab(audience));
  const [visited, setVisited] = useState(() => new Set([firstTab(audience)]));
  const show = (id) => nodeVisible(id, audience);
  // The stock board is a workshop fact; the picker itself is the client's.
  const showBoard = audience !== 'retail';

  // A head that loses a tab must not be left standing on it (retail, mid-walk).
  useEffect(() => {
    if (!tabs.some((t) => t.id === tab)) setTab(firstTab(audience));
  }, [tabs, tab, audience]);

  const goTab = (id) => {
    if (!id) return;
    setVisited((v) => new Set([...v, id]));
    setTab(id);
  };

  // ── the submodal walk inside the two long tabs (F4, F5) ──
  // 'count' → one stop per chosen type → the tail. Each stop gets its own dot.
  const [carcStop, setCarcStop] = useState('count');
  const [frontStop, setFrontStop] = useState('count');
  const [saveSetOpen, setSaveSetOpen] = useState(false);

  const [setName, setSetName] = useState('');

  const gateOrApply = (typeId, thickness, label, apply) => {
    if (unitCount > 0 && pinsThickness(typeId) && Number(thickness) > 0 && thickness !== drawnBoardT) {
      setThickGate({ typeId, thickness, label, apply });
      return;
    }
    apply();
    if (pinsThickness(typeId) && Number(thickness) > 0) {
      setProjectDefaults({ thickness: { board: thickness, custom: null } });
    }
  };
  /** Re-cut every cabinet's fronts at a new board — one action, one undo step. */
  const recutFronts = (thickness) => updateUnitParamsBulk(units.map((u) => u.id), { front_t: thickness });

  const thicknessRows = useMemo(
    () => thicknessSlotRows({ design, profile, materials }),
    [design, profile, materials],
  );
  const boxGate = useMemo(() => drawerBoxGate(design), [design]);
  const commitMeasured = (row, value) => {
    const next = Number(value);
    if (!(next > 0) || next === Number(row.measured)) return;
    if (unitCount > 0 && row.confirmed) {
      setSlotGate({ id: row.id, label: row.label, was: row.measured, next });
      return;
    }
    setSlotThickness(row.id, { measured: next });
  };

  const finishes = profile.appearance.finishes;
  const frontMaterials = materials.filter((m) => m.category === 'front');
  const platePilot = hingePlatePilotD(profile);
  const projectRunnerVariant = resolveRunnerVariant({ design, profile });

  const stack = wardrobeStack(heights);
  const fit = wardrobe ? ceilingFit({ total: stack.total, roomHeight, profile }) : { gap: null, state: 'ok' };

  // T44 F3/F8: a set may live on this computer or on the account, so the load
  // asks both — `applyTo` (the local shelf, unchanged) is still here and is
  // still what answers first inside `applyToAsync`.
  const loadSet = async (id, name) => {
    const next = applyTo(design, id) || await applyToAsync(design, id);
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
  //
  // TURN 36 (F1): every SOURCE and every BOARD now travels through the T15-B
  // gate — "material assignment keeps the T34 hard gate on every source". The
  // gate is a no-op until cabinets exist, which is every path the wizard walks.
  const sourceThickness = (kind, id) => sourceById(
    kind === 'carcass' ? carcassSources(profile) : frontSources(profile), id,
  )?.thickness;
  const pickCarcassSource = (typeId, src) => {
    touchCarcass();
    gateOrApply(typeId, sourceThickness('carcass', src), CARCASS_WORDS[src] || 'that source',
      () => setCarcassSource(typeId, src));
  };
  const pickCarcassDecor = (typeId, id) => {
    touchCarcass();
    gateOrApply(typeId, sourceThickness('carcass', 'egger'), CARCASS_WORDS.egger,
      () => { setCarcassSource(typeId, 'egger'); setCarcassFinish(typeId, id); });
  };
  const pickCarcassVeneer = (typeId, id) => {
    touchCarcass();
    gateOrApply(typeId, sourceThickness('carcass', 'veneer'), CARCASS_WORDS.veneer,
      () => { setCarcassSource(typeId, 'veneer'); setCarcassFinish(typeId, id); });
  };
  const pickCarcassBoard = (typeId, id) => {
    touchCarcass();
    const m = boardMaterials.find((x) => x.id === id) || null;
    if (!m) { setCarcassMaterial(typeId, null); return; }
    gateOrApply(typeId, m.thickness, m.name, () => setCarcassMaterial(typeId, m.id));
  };
  const pickCarcassColour = (c) => { touchCarcass(); setDesign({ colour: { ...design.colour, carcass: c } }); };

  const pickFrontSource = (typeId, src) => { touchFronts(); setFrontType(typeId, { source: src }); };
  const pickFrontDecor = (typeId, src, id) => { touchFronts(); setFrontType(typeId, { source: src, finish_id: id }); };
  const pickFrontBoard = (typeId, id) => {
    touchFronts();
    const m = boardMaterials.find((x) => x.id === id) || null;
    if (!m) { setFrontMaterial(typeId, null); return; }
    const apply = () => setFrontMaterial(typeId, m.id);
    // Front type 1 pins what every door in the job is cut from — the same rule
    // carcass 1 follows (#58: one G per project).
    if (unitCount > 0 && typeId === frontTypes[0]?.id && m.thickness && m.thickness !== frontBoard) {
      setFrontGate({ typeId, thickness: m.thickness, label: m.name, apply });
      return;
    }
    apply();
  };
  const pickFrontColour = (typeId, c) => { touchFronts(); setFrontType(typeId, { source: 'spray', colour: c }); };

  const carcassMissing = assignment.carcass.filter((a) => !a.assigned);
  const frontsMissing = assignment.fronts.filter((a) => !a.assigned);

  // ─── TURN 34 (CLAUDE.md F1): THE BOARD BEHIND EVERY LOOK ───────────────────
  //
  // The owner, 16.08, on finding the fronts container without a board
  // assignment: "w ustawieniach frontów nie ma przypisania materiałów, jest w
  // carcasach ale nie ma we frontach — to jest karygodne, niewybaczalne,
  // podstawowe przypisanie materiałów to podstawa tego programu." And the
  // scope: "przywracamy przypisanie materiałów bez różnicy jaki to wybór —
  // czy laminat czy mdf czy spray etc".
  //
  // Turn 16 F1.1 had already answered this once — "a front had a colour and NO
  // stock, so 'what board are these doors cut from' had no answer" — and the
  // 15.08 chat rebuild reintroduced the hole on two paths: `slotPicker` grew
  // the select ONLY on the decor grid, so Spraying (the DEFAULT front source)
  // and the carcass's veneer both came back with a bare picker.
  //
  // So the select is ONE thing now, lifted out of the decor branch, rendered on
  // EVERY path and for BOTH kinds. One select, one grammar (Generic optgroup +
  // Stock optgroup), the same `pickFrontBoard` / `pickCarcassBoard` wiring.
  const stockBoardSelect = (kind, t) => {
    const assigned = materials.find((m) => m.id === t.material_id) || null;
    const gateHere = kind === 'carcass'
      ? (thickGate && thickGate.typeId === t.id ? thickGate : null)
      : (frontGate && frontGate.typeId === t.id ? frontGate : null);
    return (
      <div className="space-y-1" data-wizard-node="carcases.stock-board">
        <div className="cc-row">
          <span className="text-[11px] text-ink-400 shrink-0">Stock board</span>
          <select
            className="cc-input flex-1"
            data-stock-board={`${kind}:${t.id}`}
            data-front-material={kind === 'front' ? t.id : undefined}
            data-carcass-material={kind === 'carcass' ? t.id : undefined}
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
        <p className="text-[11px] text-ink-400">
          {assigned
            ? `${assigned.code ? `${assigned.code} · ` : ''}${assigned.name} · ${formatMm(assigned.thickness)} mm`
            : 'No board assigned — drawing on the source’s own thickness'}
          {isJcMaterial(assigned) ? ' · JC' : ''}
        </p>
        {/* ─── THE HARD GATE, IN THE OPEN (T15-B, carried here by T36 F1) ───
            The project is DRAWN at one thickness and this choice is another.
            Nothing changes until the owner says which truth wins. */}
        {gateHere && kind === 'carcass' && (
          <div className="cc-row rounded border border-status-warn/60 bg-status-warn/10 px-2 py-1" data-thickness-gate="1">
            <span className="text-[11px] text-status-warn flex-1">
              Project is drawn at {formatMm(drawnBoardT)} mm — {gateHere.label} is {formatMm(gateHere.thickness)} mm.
            </span>
            <button
              type="button"
              className="cc-btn px-2"
              data-thickness-gate-apply="1"
              onClick={() => {
                gateHere.apply();
                setProjectDefaults({ thickness: { board: gateHere.thickness, custom: null } });
                setThickGate(null);
                notify(`Project recomputed at ${formatMm(gateHere.thickness)} mm`, 'warn');
              }}
            >
              Recompute at {formatMm(gateHere.thickness)}
            </button>
            <button type="button" className="cc-btn px-2" data-thickness-gate-keep="1" onClick={() => setThickGate(null)}>
              Keep {formatMm(drawnBoardT)} — pick another
            </button>
          </div>
        )}
        {gateHere && kind === 'front' && (
          <div className="cc-row rounded border border-status-warn/60 bg-status-warn/10 px-2 py-1" data-front-thickness-gate="1">
            <span className="text-[11px] text-status-warn flex-1">
              Fronts are drawn at {formatMm(frontBoard)} mm — {gateHere.label} is {formatMm(gateHere.thickness)} mm.
            </span>
            <button
              type="button"
              className="cc-btn px-2"
              data-front-thickness-gate-apply="1"
              onClick={() => {
                gateHere.apply();
                // RECOMPUTE means recompute: every cabinet on the floor is
                // re-cut at the new front board, in one batch and one undo step.
                const { notices } = recutFronts(gateHere.thickness) || { notices: [] };
                for (const n of notices) notify(n, 'warn');
                setFrontGate(null);
                notify(`Fronts recomputed at ${formatMm(gateHere.thickness)} mm`, 'warn');
                // T19 F1.4: a thicker front is a different HINGE. Say so.
                const { message } = hingeReResolve({
                  fromThickness: frontBoard,
                  toThickness: gateHere.thickness,
                  assignedDoors: doorsWithOwnHinge(units),
                  totalDoors: units.length,
                });
                if (message) notify(message, 'warn');
              }}
            >
              Recompute at {formatMm(gateHere.thickness)}
            </button>
            <button type="button" className="cc-btn px-2" data-front-thickness-gate-keep="1" onClick={() => setFrontGate(null)}>
              Keep {formatMm(frontBoard)} — pick another
            </button>
          </div>
        )}
      </div>
    );
  };

  // ─── TURN 44 (CLAUDE.md F4): THE PICKER, REBUILT AND RELOCATED ───────────
  //
  // The owner on the shipped one: *"okno w oknie, przesuwamy, nic nie widać,
  // gubimy się."* So the three branches this function used to draw inline —
  // colour, veneer, decor — move into `MaterialChoicePanel`, which is a
  // FULL-WIDTH PANEL IN the sequence rather than a window over it: big Egger
  // tiles with a live search, a veneer LIST, a spray LIST with no tiles at all.
  //
  // The function itself is unchanged in every way that matters: same name, same
  // arguments, same source resolution, same handlers, and the same stock-board
  // select standing under whichever body the category asks for. What changed is
  // what it hands back — which is the restructure this turn licences.
  const slotPicker = (kind, t, { title = null, footer = null } = {}) => {
    const list = kind === 'carcass' ? carcassSources(profile) : frontSources(profile);
    const src = sourceById(list, t.source) || sourceById(list, kind === 'carcass' ? 'egger' : 'laminate');
    const picker = pickerForSource(src);
    // A FRONT's veneer picks from the 85-decor catalogue (turn 20 F12.3), which
    // is what `pickerForSource` already answers; only the carcass's veneer is a
    // timber list. That rule is the engine's and is read, never restated.
    const body = picker === 'veneer' && kind === 'front' ? 'decor' : picker;
    return (
      <div data-material-picker-for={`${kind}:${t.id}`} data-spray-picker={body === 'colour' ? `${kind}:${t.id}` : undefined}>
        <MaterialChoicePanel
          kind={kind}
          slot={t}
          title={title}
          picker={body}
          categoryStrip={sourceSeg(kind, t, { big: true })}
          boardSelect={show(kind === 'carcass' ? 'carcases.stock-board' : 'fronts.picker')
            && showBoard ? stockBoardSelect(kind, t) : null}
          value={t.finish_id}
          colour={kind === 'carcass' ? design.colour.carcass : t.colour}
          onDecor={(id) => (kind === 'carcass'
            ? pickCarcassDecor(t.id, id)
            : pickFrontDecor(t.id, t.source || 'laminate', id))}
          onVeneer={(id) => (kind === 'carcass'
            ? pickCarcassVeneer(t.id, id)
            : pickFrontDecor(t.id, t.source || 'veneer', id))}
          onColour={(c) => (kind === 'carcass' ? pickCarcassColour(c) : pickFrontColour(t.id, c))}
          onClear={() => (kind === 'carcass'
            ? (touchCarcass(), setCarcassFinish(t.id, null))
            : (touchFronts(), setFrontType(t.id, { finish_id: null })))}
          footer={footer}
        />
      </div>
    );
  };

  const sourceSeg = (kind, t, { big = false } = {}) => {
    const order = kind === 'carcass' ? CARCASS_ORDER : FRONT_ORDER;
    const words = kind === 'carcass' ? CARCASS_WORDS : FRONT_WORDS;
    const active = t.source || (kind === 'carcass' ? 'egger' : 'laminate');
    return (
      <div className={big ? 'flex gap-2' : 'flex gap-1'} data-source-seg={`${kind}:${t.id}`}>
        {order.map((id) => (
          <button
            key={id}
            type="button"
            className={big
              ? `flex-1 border rounded px-3 py-2 text-sm transition-colors ${active === id
                ? 'border-gold text-gold bg-shell-700'
                : 'border-shell-600 text-ink-100 hover:bg-shell-700'}`
              : `cc-btn px-2 ${active === id ? 'border-gold text-gold' : ''}`}
            data-source-option={id}
            data-material-category={id}
            aria-pressed={active === id}
            // T36 F1: the old panel's own names for the same buttons, so a
            // walk written against either door finds them.
            data-carcass-source={kind === 'carcass' ? id : undefined}
            data-front-source={kind === 'front' ? id : undefined}
            onClick={() => (kind === 'carcass' ? pickCarcassSource(t.id, id) : pickFrontSource(t.id, id))}
          >
            {words[id]}
          </button>
        ))}
      </div>
    );
  };


  // ─── TURN 44 (CLAUDE.md F4 / F5): THE TWO SUBMODAL WALKS ──────────────────
  //
  // *"'Ile typów materiału carcase?' (1–3) → that many submodals, sequential,
  // each with its own tab-dot."* A STOP is one screen of the walk: the counting
  // question, then one per chosen type, then the tab's own tail. The list is
  // derived from the types rather than remembered, so changing the count from 3
  // to 1 cannot strand the walk on a type that no longer exists.
  const carcStops = [
    'count',
    ...carcassTypes.map((t) => t.id),
    ...(show('carcases.sheets') ? ['sheets'] : []),
    'summary',
  ];
  const carcAt = carcStops.includes(carcStop) ? carcStop : 'count';
  const carcTypeAt = carcassTypes.find((t) => t.id === carcAt) || null;
  const carcSubmodalNo = carcTypeAt ? carcassTypes.indexOf(carcTypeAt) + 1 : 0;
  const carcStopLabel = (stop) => {
    if (stop === 'count') return 'How many types';
    if (stop === 'sheets') return 'Sheets assignment';
    if (stop === 'summary') return 'What was chosen';
    return carcassTypes.find((t) => t.id === stop)?.label || 'Material';
  };

  const frontStops = ['count', ...frontTypes.map((t) => t.id), 'tail'];
  const frontAt = frontStops.includes(frontStop) ? frontStop : 'count';
  const frontTypeAt = frontTypes.find((t) => t.id === frontAt) || null;
  const frontSubmodalNo = frontTypeAt ? frontTypes.indexOf(frontTypeAt) + 1 : 0;
  const frontStopLabel = (stop) => {
    if (stop === 'count') return 'How many colours';
    if (stop === 'tail') return 'Shape, opening and shine';
    return frontTypes.find((t) => t.id === stop)?.label || 'Colour';
  };

  // ─── T44 F5: WHICH OF THE FOUR OPENINGS THIS JOB IS ON ────────────────────
  // Read off the fields the project already carries (`lib/frontOpening.js`).
  // The ref remembers the shape a J-handle replaced, so turning the J off puts
  // the door back to the shape somebody chose rather than to a guess.
  const opening = frontOpening(design);
  const lastStyle = useRef(design.fronts.style);
  useEffect(() => {
    if (design.fronts.style && design.fronts.style !== 'HJ') lastStyle.current = design.fronts.style;
  }, [design.fronts.style]);

  // ─── T44 F3: WHICH SET THIS JOB STARTED FROM ──────────────────────────────
  const [loadedSet, setLoadedSet] = useState('');

  // ─── T44 F7: THE MEASUREMENTS, GROUPED BY THE MATERIAL THEY ARE OF ────────
  //
  // *"Measurements + sheet sizes per chosen material: exactly the materials
  // picked in F4/F5, listed by name — 2 types → 2 blocks."* The rows are the
  // SAME rows (`thicknessSlotRows`) and the same setters; what changed is that
  // they stand under the material they measure instead of in one pile of six.
  const materialBlocks = [
    ...carcassTypes.map((t, i) => ({
      key: `carcass${i + 1}`,
      label: `${t.label} — the carcass board`,
      boardName: materials.find((m) => m.id === t.material_id)?.name || 'no stock board assigned',
      row: thicknessRows.find((r) => r.id === `carcass${i + 1}`) || null,
      sheet: i === 0
        ? {
          family: 'carcasses',
          label: 'Carcasses',
          hint: 'Sides, tops, bottoms, backs, shelves, infills and plinths.',
          key: 'sheetCarcass',
        }
        : null,
    })),
    ...frontTypes.slice(0, 2).map((t, i) => ({
      key: `front${i + 1}`,
      label: `${t.label} — the front board`,
      boardName: materials.find((m) => m.id === t.material_id)?.name || 'no stock board assigned',
      row: thicknessRows.find((r) => r.id === `front${i + 1}`) || null,
      sheet: i === 0
        ? {
          family: 'fronts',
          label: 'Fronts',
          hint: 'Doors, drawer fronts, end panels and masking boards.',
          key: 'sheetFronts',
        }
        : null,
    })),
    {
      key: 'box',
      label: 'Drawer box',
      boardName: (design.drawerBoxes.mode ?? 'same') === 'ready'
        ? 'Ready-made system'
        : 'Same board as the carcass',
      row: thicknessRows.find((r) => r.id === 'box') || null,
      sheet: null,
    },
  ];

  // ─── T44 F8: THE SUMMARY, GROUPED BY TAB AND FILTERED BY HEAD ─────────────
  //
  // Every row names the NODE it came from, so the retail filter is the same one
  // the tabs use — a row a client may not see is a row that is not built, not a
  // row that is built and then hidden.
  const summaryRow = (node, label, value) => (show(node) && value != null && value !== ''
    ? { label, value: String(value) }
    : null);
  const chosenText = (t, kind) => chosenOf(t, kind)?.text || 'nothing chosen yet';
  const summary = tabs
    .filter((t) => t.id !== 'podsumowanie')
    .map((t) => {
      let rows = [];
      if (t.id === 'ustawienia') {
        rows = [
          summaryRow('ustawienia.identity', 'Number', project.number || '—'),
          summaryRow('ustawienia.identity', 'Client', project.client || '—'),
          summaryRow('ustawienia.identity', 'Type', type.label),
          summaryRow('ustawienia.dimensions', wardrobe ? 'Wardrobe height' : 'Tall unit height', `${heights.tall} mm`),
          summaryRow('ustawienia.dimensions', 'Plinth height (toe kick)', `${heights.toeKick} mm`),
          summaryRow('ustawienia.dimensions', 'Depth (all units)', `${projectDepth(design, profile)} mm`),
          dimensionAsked('base', design.projectType)
            ? summaryRow('ustawienia.kitchen-heights', 'Base unit height', `${heights.base} mm`) : null,
          dimensionAsked('wall', design.projectType)
            ? summaryRow('ustawienia.kitchen-heights', 'Wall unit height', `${heights.wall} mm`) : null,
          dimensionAsked('wallMount', design.projectType)
            ? summaryRow('ustawienia.kitchen-heights', 'Wall mount height', `${heights.wallMount} mm`) : null,
          summaryRow('ustawienia.ceiling', 'To the ceiling', design.ceiling === 'flush' ? 'Yes — flush' : 'No — keep an infill'),
        ];
      }
      if (t.id === 'carcases') {
        rows = [
          ...carcassTypes.map((ct) => summaryRow('carcases.chosen', ct.label, chosenText(ct, 'carcass'))),
          summaryRow('carcases.drawers', 'Drawer boxes', (design.drawerBoxes.mode ?? 'same') === 'ready'
            ? 'Ready-made system' : 'Same board as carcass'),
          summaryRow('carcases.joinery', 'Joinery', joinery?.label || '—'),
          summaryRow('carcases.cnc-corner', 'CNC corner', design.cncCorner === 'square' ? 'Square (hand-chisel)' : 'Dog-bone (CNC)'),
          summaryRow('carcases.thickness-note', 'Board thickness', `${formatMm(drawnBoardT)} mm`),
        ];
      }
      if (t.id === 'fronts') {
        rows = [
          ...frontTypes.map((ft) => summaryRow('fronts.chosen', ft.label, chosenText(ft, 'front'))),
          summaryRow('fronts.style', 'Front type', FRONT_STYLE_OPTIONS.find((o) => o.id === design.fronts.style)?.label || '—'),
          summaryRow('fronts.opening', 'Opening', FRONT_OPENINGS.find((o) => o.id === opening)?.label || '—'),
          summaryRow('fronts.shine', 'Shine', `${design.sheen ?? profile.appearance.sheenScale.default} %`),
          summaryRow('fronts.shaker-frame', 'Shaker frame', design.fronts.style === 'S' ? `${shakerFrameMm(design, profile)} mm` : null),
        ];
      }
      if (t.id === 'hardware') {
        rows = [
          summaryRow('hardware.colour', 'Hinge finish', (design.hinges.finish || 'nickel') === 'onyx' ? 'Onyx' : 'Silver'),
          summaryRow('hardware.colour', 'Internal metal', profile.appearance.metals[design.hardware.shelfSleeve || profile.appearance.metalDefault]?.label || '—'),
          summaryRow('hardware.hinge-standard', 'Hinges per door', hingeStandard(design.hinges?.standard, profile)),
          summaryRow('hardware.runners', 'Runner variant', projectRunnerVariant),
          summaryRow('hardware.hinge-plate-pilot', 'Hinge plate pilot', `⌀${platePilot}`),
        ];
      }
      if (t.id === 'produkcja') {
        rows = [
          summaryRow('produkcja.infill', 'Infill at the wall', `${design.infill.sideWidth} mm`),
          ...materialBlocks.map((b) => (b.row
            ? summaryRow('produkcja.per-material', b.label, `${formatMm(b.row.measured)} mm${b.row.confirmed ? ' · measured' : ''}`)
            : null)),
        ];
      }
      return { tab: t.id, n: t.n, label: t.label, rows: rows.filter(Boolean) };
    });

  // ─── THE SEQUENCE'S NAVIGATION (F2: "Next validates only the current tab") ─
  const nextTab = tabAfter(tab, audience);
  const prevTab = tabBefore(tab, audience);
  const labelOf = (id) => WIZARD_TABS.find((t) => t.id === id)?.label || '';

  let nextTarget = null;
  let nextLabel = 'Next';
  let nextBlocked = false;
  let nextHint = '';
  let backTarget = prevTab;
  let goBack = () => goTab(prevTab);
  let goNext = () => goTab(nextTab);

  if (tab === 'carcases') {
    const i = carcStops.indexOf(carcAt);
    if (i > 0) { backTarget = 'stop'; goBack = () => setCarcStop(carcStops[i - 1]); }
    if (i < carcStops.length - 1) {
      nextTarget = 'stop';
      nextLabel = `Next — ${carcStopLabel(carcStops[i + 1])}`;
      goNext = () => setCarcStop(carcStops[i + 1]);
    } else {
      nextTarget = nextTab;
      nextLabel = `Next — ${labelOf(nextTab)}`;
      nextBlocked = !carcSaved;
      nextHint = carcSaved ? '' : 'Save the carcasses to go on.';
    }
  } else if (tab === 'fronts') {
    const i = frontStops.indexOf(frontAt);
    if (i > 0) { backTarget = 'stop'; goBack = () => setFrontStop(frontStops[i - 1]); }
    if (i < frontStops.length - 1) {
      nextTarget = 'stop';
      nextLabel = `Next — ${frontStopLabel(frontStops[i + 1])}`;
      goNext = () => setFrontStop(frontStops[i + 1]);
    } else {
      nextTarget = nextTab;
      nextLabel = `Next — ${labelOf(nextTab)}`;
      nextBlocked = !frontsSaved;
      nextHint = frontsSaved ? '' : 'Save the fronts to go on.';
    }
  } else if (nextTab) {
    nextTarget = nextTab;
    nextLabel = `Next — ${labelOf(nextTab)}`;
  } else {
    nextHint = 'Everything is answered — the wizard’s own footer starts the job.';
  }

  return (
    <div
      className="space-y-3"
      data-wizard-settings="1"
      data-settings-surface="1"
      data-settings-door={door}
      data-wizard-audience={audience}
    >
      {/* ══ THE SEQUENCE'S OWN BAR (T44 F2) ══════════════════════════════════
          Six stops, numbered, in the owner's own words. A tab STAYS clickable
          once it has been visited — going back to check what you put in
          Ustawienia must never mean walking the whole thing again — and one
          ahead of the walk is not yet a place you can be. `visibleTabs` does
          the renumbering, so retail's five read 1…5 rather than 1,2,3,4,6. */}
      <ol className="flex items-center gap-1 flex-wrap text-[11px]" data-wizard-tabs="1">
        {tabs.map((t, i) => {
          const state = t.id === tab ? 'current' : (visited.has(t.id) ? 'visited' : 'ahead');
          return (
            <li key={t.id} className="flex items-center gap-1">
              <button
                type="button"
                title={t.hint}
                data-wizard-tab={t.id}
                data-tab-state={state}
                data-tab-number={t.n}
                disabled={state === 'ahead'}
                className={`px-2 py-1 rounded border transition-colors ${state === 'current'
                  ? 'border-gold text-gold bg-shell-700'
                  : (state === 'visited'
                    ? 'border-shell-600 text-ink-100 hover:bg-shell-700'
                    : 'border-shell-700 text-ink-400 cursor-default')}`}
                onClick={() => goTab(t.id)}
              >
                {t.n}. {t.label}
              </button>
              {i < tabs.length - 1 && <span className="text-ink-400">›</span>}
            </li>
          );
        })}
        {/* ─── TURN 44 (CLAUDE.md iron rule 5): THE TWIN CONTROL ─────────────
            The head is chosen in the HEADER, which is where rule 5 puts it —
            and the header is BEHIND this window while the wizard stands open,
            because a modal shell closes on a pointer-down outside itself. So
            the switch has a twin here, on the tab bar, exactly as the
            brightness slider has one on the toolbar and one in the View menu:
            the SAME app-level state and the same setter, so moving either
            moves the other because there is only one value. */}
        <li className="flex-1" />
        <li><AudienceToggle /></li>
      </ol>

      <div className="space-y-3" data-wizard-tab-body={tab}>
      {tab === 'ustawienia' && (
        <>
          {show('ustawienia.identity') && (
            <div data-wizard-node="ustawienia.identity">
                  {/* ── 1 · Number · Client · Type — the type is a label, never a second dropdown ── */}
                  <div className="grid grid-cols-[150px_1fr_180px] gap-3 items-end">
                    <label className="block">
                      <span className="cc-label">Number</span>
                      <input
                        className="cc-input"
                        value={project.number || ''}
                        // ─── T44 F3: READ-ONLY — "chosen in step 1" ──────────────────
                        // The number and the client are answered on the wizard's own
                        // first screen, and a second editable copy of an answer is the
                        // turn-12 bug in miniature. From the EDIT door there is no step 1
                        // to have answered them, so there they stay editable.
                        readOnly={!editDoor}
                        title={editDoor ? undefined : 'Chosen in step 1 — go Back to change it'}
                        data-readonly={editDoor ? undefined : '1'}
                        onChange={(e) => setProjectInfo({ number: e.target.value })}
                      />
                    </label>
                    <label className="block">
                      <span className="cc-label">Client</span>
                      <input
                        className="cc-input"
                        value={project.client || ''}
                        readOnly={!editDoor}
                        title={editDoor ? undefined : 'Chosen in step 1 — go Back to change it'}
                        data-readonly={editDoor ? undefined : '1'}
                        onChange={(e) => setProjectInfo({ client: e.target.value })}
                      />
                    </label>
                    <div className="block">
                      <span className="cc-label">Type</span>
                      {/* T36 F1: a LABEL in the wizard — step 2 chose it, and a second
                          control that could disagree with step 2 is the turn-12 bug. From
                          the menu there IS no step 2, so the old panel's own select stands
                          here instead. Same field, same setter, one of them shown. */}
                      {editDoor ? (
                        <select
                          className="cc-input"
                          data-project-type="1"
                          value={design.projectType || ''}
                          onChange={(e) => setDesign({ projectType: e.target.value || null })}
                        >
                          <option value="">Not set</option>
                          {PROJECT_TYPE_OPTIONS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                        </select>
                      ) : (
                        <span
                          className="cc-input flex items-center text-gold cursor-default select-none"
                          title="Chosen in step 2 — go Back to change it"
                          data-wizard-type-label="1"
                        >
                          {type.label}
                        </span>
                      )}
                    </div>
                  </div>
            </div>
          )}
          {show('ustawienia.sets') && (
            <div data-wizard-node="ustawienia.sets" data-wizard-sets="1" data-settings-sets="1">
              <SectionLabel>Saved settings set</SectionLabel>
              {/* ─── T44 F3: A DROPDOWN, AND ITS DEFAULT HAS A NAME ─────────
                  *"dropdown fed from `cc_settings_sets` (F8), default `Default
                  settings`"*. The chip row it replaces was a row of buttons
                  that grew sideways until it wrapped twice; a set is one
                  choice out of a list, which is what a select is for.

                  ─── T44 LICENSED REMOVAL 1 of 2: `Keep as…` ────────────────
                  CLAUDE.md iron rule 3, by name — *"relocated to F8's final
                  modal"*, and that is where it now lives: tab 6 asks
                  "Zapisać te ustawienia jako Twój standard?" once, at the end,
                  with the name field on it. Nothing is lost; it is asked in
                  the one place a workshop has actually finished deciding. */}
              <div className="cc-row">
                <select
                  className="cc-input flex-1"
                  data-settings-set-select="1"
                  value={loadedSet || ''}
                  onChange={(e) => {
                    const id = e.target.value;
                    setLoadedSet(id);
                    if (!id) return;
                    const found = sets.find((x) => x.id === id);
                    if (found) loadSet(found.id, found.name);
                  }}
                >
                  <option value="">{DEFAULT_SET_LABEL}</option>
                  {sets.map((s) => (
                    <option key={s.id} value={s.id} data-set-load={s.id}>{s.name}</option>
                  ))}
                </select>
                {loadedSet && (
                  <button
                    type="button"
                    className="cc-btn-ghost text-status-danger px-1.5"
                    title="Delete this set"
                    data-set-remove={loadedSet}
                    onClick={() => { removeSet(loadedSet); setLoadedSet(''); }}
                  >
                    ×
                  </button>
                )}
              </div>
              <p className="text-[10px] text-ink-400 mt-1">
                {setsSource === 'db'
                  ? 'From cc_settings_sets — the sets this account has saved.'
                  : 'Saved on this computer. Run supabase/migrations/t44_settings_sets.sql and they follow the account.'}
              </p>
            </div>
          )}
          {show('ustawienia.dimensions') && (
            <div data-wizard-node="ustawienia.dimensions">
                  {/* ── 3 · Dimensions, per project type ── */}
                  <div data-wizard-dimensions="1">
                    <div className="cc-row">
                      <SectionLabel>Dimensions</SectionLabel>
                      <span className="flex-1" />
                      <span className="text-[10px] text-ink-400 mr-2">
                        {design.scope === 'room' ? 'Room' : 'Wall'} height: {roomHeight || '—'} mm
                      </span>
                      {/* ─── T44 LICENSED REMOVAL 2 of 2: `Room setup…` ────────────────
                          CLAUDE.md iron rule 3, by name: it *"belongs to Scope/Room
                          step"*, and it does — the wizard walks through the room editor
                          two steps earlier, and from the menu it is Settings ▸ Room
                          setup…, one click away. What went was the BUTTON on this
                          surface; the editor, the prop and every path to it are alive.
                          The prop is still accepted so no caller breaks. */}
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
                              data-dimension="tall"
                            />
                          </label>
                          <label className="block">
                            <span className="cc-label">Plinth height (toe kick)</span>
                            <NumberField
                              value={heights.toeKick}
                              min={profile.projectHeights.toeKickMin ?? 0}
                              max={profile.projectHeights.max}
                              onCommit={(v) => setProjectHeights({ toeKick: v })}
                              data-wizard-dim="toeKick"
                              data-dimension="toeKick"
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
                              data-dimension="depth"
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
                          <div
                  className="border border-gold/60 bg-gold/5 rounded px-2 py-1.5 space-y-1"
                  data-ceiling-question="1"
                  data-wizard-node="ustawienia.ceiling"
                >
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
                        {projectDimensions(design, profile, heights)
                          .filter((d) => dimensionAsked(d.key, design.projectType))
                          .map((d) => (
                          <label key={d.key} className="block">
                            {/* T44 F3: the plinth says what a joiner calls it.
                                The list is the engine's and `src/engine/**` is
                                frozen tonight (iron rule 2), so the WORD is
                                corrected at the surface — which is where a
                                label belongs anyway. */}
                            <span className="cc-label">{dimensionLabel(d)}</span>
                            <NumberField
                              value={d.value}
                              onCommit={(v) => {
                                if (d.key === 'depth') { setProjectDefaults({ depth: v }); return; }
                                const { notices } = setProjectHeights({ [d.key]: v });
                                for (const n of notices) notify(n, 'warn');
                              }}
                              data-wizard-dim={d.key}
                              data-dimension={d.key}
                            />
                          </label>
                          ))}
                      </div>
                    )}
                    {/* ─── TURN 36 (CLAUDE.md F1): THE NUMBERS THE OLD PANEL HAD AND THIS
                        ONE DID NOT ────────────────────────────────────────────────────
                        Rendered BY DIFFERENCE against what the block above already shows,
                        so nothing is asked twice and nothing is missing. The wardrobe
                        headline keeps the owner's three-field shape; the rest of his
                        project dimensions — and the WALL MOUNT HEIGHT, which the wizard
                        never had at all — stand under it. Same setters, so this is not a
                        sixth data path. */}
                    {(() => {
                      const all = projectDimensions(design, profile, heights);
                      const shown = new Set(wardrobe ? ['tall', 'toeKick', 'depth'] : all.map((d) => d.key));
                      // ─── T44 F3: THREE OF THESE ARE A KITCHEN'S ──────────────────
                      // *"Base unit height / Wall unit height / Wall mount height:
                      // rendered ONLY when project type is Kitchen — wardrobe never sees
                      // them."* A wardrobe has no wall units, so three fields that could
                      // only ever be answered "not applicable" were three fields the eye
                      // had to skip. The rule is data (`lib/wizardTabs.js`), so F3's test
                      // asks the rule rather than the JSX.
                      const rest = all
                        .filter((d) => !shown.has(d.key))
                        .filter((d) => dimensionAsked(d.key, design.projectType));
                      return (
                        <div
              className="grid grid-cols-6 gap-2 mt-1.5"
              data-more-dimensions="1"
              data-wizard-node="ustawienia.kitchen-heights"
            >
                          {rest.map((d) => (
                            <label key={d.key} className="block">
                              <span className="cc-label">{dimensionLabel(d)}</span>
                              <NumberField
                                className="cc-input text-right"
                                value={d.value}
                                onCommit={(v) => {
                                  if (d.key === 'depth') { setProjectDefaults({ depth: v }); return; }
                                  const { notices } = setProjectHeights({ [d.key]: v });
                                  for (const n of notices) notify(n, 'warn');
                                }}
                                data-wizard-dim={d.key}
                                data-dimension={d.key}
                              />
                            </label>
                          ))}
                          {dimensionAsked('wallMount', design.projectType) && (
                          <label className="block">
                            <span className="cc-label">Wall mount height</span>
                            <NumberField
                              className="cc-input text-right"
                              value={heights.wallMount}
                              title="How high a wall unit hangs"
                              onCommit={(v) => {
                                const { notices } = setProjectHeights({ wallMount: v });
                                for (const n of notices) notify(n, 'warn');
                              }}
                              data-wizard-dim="wallMount"
                              data-dimension="wallMount"
                            />
                          </label>
                          )}
                        </div>
                      );
                    })()}
                    <p className="text-[11px] text-ink-400 mt-1">
                      Pre-filled from the workshop profile — the UK standard. A unit may still be given its own height
                      in the panel; this is where every new one starts.
                    </p>
                  </div>
            </div>
          )}
        </>
      )}

      {tab === 'carcases' && (
              /* ══ 4 · CARCASSES — its own container, saved before the fronts open ══ */
              <section
                className={`relative border rounded-lg p-3 pt-2.5 space-y-2 ${carcSaved ? 'border-gold/70' : 'border-shell-600'}`}
                data-carcass-container="1"
                data-settings-section="carcass"
              >
                <div className="absolute top-2 right-2.5"><CornerArt kind="carcass" /></div>
                <div>
                  <span className="block text-[11px] uppercase tracking-[0.16em] text-gold">Carcasses</span>
                  <span className="block text-[10px] text-ink-400">The boxes — boards, drawer boxes and the CNC corner.</span>
                </div>
          {/* ── the walk's own dots: one per submodal, plus its two ends ── */}
          <ol className="flex items-center gap-1.5" data-carcass-dots="1">
            {carcStops.map((stop) => (
              <li key={stop}>
                <button
                  type="button"
                  title={carcStopLabel(stop)}
                  data-carcass-dot={stop}
                  data-dot-state={stop === carcAt ? 'current' : (carcStops.indexOf(stop) < carcStops.indexOf(carcAt) ? 'done' : 'ahead')}
                  disabled={carcStops.indexOf(stop) > carcStops.indexOf(carcAt)}
                  className={`w-2.5 h-2.5 rounded-full border ${stop === carcAt
                    ? 'bg-gold border-gold'
                    : (carcStops.indexOf(stop) < carcStops.indexOf(carcAt) ? 'bg-shell-600 border-shell-600' : 'border-shell-600')}`}
                  onClick={() => setCarcStop(stop)}
                />
              </li>
            ))}
            <li className="text-[10px] text-ink-400 ml-1">{carcStopLabel(carcAt)}</li>
          </ol>

          {carcAt === 'count' && show('carcases.count') && (
            <div data-wizard-node="carcases.count" className="space-y-2">
              <p className="text-sm text-ink-100">Ile typów materiału carcase?</p>
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
                          // T44 F4: "opened" is now WHICH STOP OF THE WALK this is — the
                          // submodal is a full-width panel in the sequence, not an accordion
                          // inside a card, so the card only says whether it is the one open.
                          const opened = carcStop === t.id;
                          return (
                            <div key={t.id} className="border border-shell-600 rounded p-2 space-y-1.5" data-carcass-slot={t.id} data-carcass-type={t.id}>
                              <div className="cc-row">
                                <span className="text-[11px] text-ink-50">{t.label}</span>
                                <span className="flex-1" />
                                <button
                                  type="button"
                                  className={`cc-btn px-2 ${opened ? 'border-gold text-gold' : ''}`}
                                  data-material-slot={`carcass:${t.id}`}
                                  data-carcass-picker={pickerForSource(
                                    sourceById(carcassSources(profile), t.source || 'egger'),
                                  ) || 'none'}
                                  onClick={() => setCarcStop(t.id)}
                                >
                                  Choose…
                                </button>
                              </div>
                              {sourceSeg('carcass', t)}
                            </div>
                          );
                        })}
                      </div>
            </div>
          )}

          {carcTypeAt && (
            <div data-wizard-node="carcases.picker" data-carcass-submodal={carcTypeAt.id}>
              {slotPicker('carcass', carcTypeAt, {
                title: `${carcTypeAt.label} — ${carcSubmodalNo} of ${carcassTypes.length}`,
                footer: show('carcases.drawers') ? (
                  <div data-wizard-node="carcases.drawers">
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
                    <p className="text-[10px] text-ink-400 mt-1">
                      What a drawer box for this carcass type is made of. It writes the flag the BOM already
                      reads (`design.drawerBoxes.mode`); the runner assignment is a later turn's.
                    </p>
                  </div>
                ) : null,
              })}
            </div>
          )}

          {carcAt === 'sheets' && show('carcases.sheets') && (
            <div data-wizard-node="carcases.sheets" className="space-y-2" data-sheets-assignment="1">
              <span className="block text-[11px] uppercase tracking-[0.16em] text-gold">Sheets assignment</span>
              <p className="text-[11px] text-ink-400">
                Which board each carcass type is cut from, and the biggest sheet the shop can buy it in.
                The same machinery as ever — relocated, and asked once the materials are chosen.
              </p>
              {carcassTypes.map((t) => (
                <div key={t.id} className="border border-shell-600 rounded p-2 space-y-1" data-sheet-assign={t.id}>
                  <span className="text-[11px] text-ink-50">{t.label}</span>
                  {stockBoardSelect('carcass', t)}
                </div>
              ))}
              <SheetSizeRow
                family="carcasses"
                label="Carcasses"
                hint="Sides, tops, bottoms, backs, shelves, infills and plinths."
                profile={profile}
                onChange={(size) => setProfile({ ...profile, cnc: { ...profile.cnc, sheetCarcass: size } })}
              />
            </div>
          )}

          {carcAt === 'summary' && (
            <>
              {show('carcases.cnc-corner') && (
                <div data-wizard-node="carcases.cnc-corner">
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
                </div>
              )}
              {show('carcases.joinery') && (
                <div data-wizard-node="carcases.joinery">
                        {/* ══ 8 · JOINERY TYPE — how the carcass is held together ══ */}
                        <section className="space-y-2" data-settings-section="joinery">
                          <span className="block text-[11px] uppercase tracking-[0.16em] text-gold">Joinery type</span>
                          <div className="flex flex-wrap gap-2">
                            {profile.joinery.types.map((t) => (
                              <button
                                key={t.id}
                                type="button"
                                title={t.hint}
                                data-joinery-option={t.id}
                                aria-pressed={joinery?.id === t.id}
                                className={`border rounded px-3 py-2 text-left transition-colors ${joinery?.id === t.id
                                  ? 'border-gold bg-shell-700'
                                  : 'border-shell-600 hover:bg-shell-700'}`}
                                onClick={() => {
                                  touchCarcass();
                                  setDesign({ joinery: t.id });
                                  setJoineryOpen((v) => !v || joinery?.id !== t.id);
                                }}
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
                </div>
              )}
              {show('carcases.chosen') && (
                <div data-wizard-node="carcases.chosen">
                          {/* the CHOSEN list — mini swatches, "jak przedtem" */}
                          <div className="border-t border-dashed border-shell-600 pt-1.5 space-y-1" data-carcass-chosen="1">
                            {carcassTypes.map((t) => {
                              const c = chosenOf(t, 'carcass');
                              return c ? <ChosenRow key={t.id} who={t.label} hex={c.hex} thumb={c.thumb} text={c.text} /> : null;
                            })}
                          </div>
                </div>
              )}
              {show('carcases.thickness-note') && (
                <div data-wizard-node="carcases.thickness-note">
                          {/* T36 F1: the old panel's thickness sentence — the one number every cut
                              in the job is measured from, said out loud where the boards are
                              chosen. `board` is the engine's own project answer; `drawnBoardT` is
                              what carcass 1's assigned board pins it to. */}
                          <p className="text-[11px] text-ink-400" data-folded-thickness="1" data-carcass-thickness="1">
                            Board thickness: <span className="text-ink-200">{formatMm(drawnBoardT)}</span> mm — from{' '}
                            {carcass1Board ? `${carcass1Board.code ? `${carcass1Board.code} · ` : ''}${carcass1Board.name}` : 'the Generic 18 default'}
                            {Number(board) !== Number(drawnBoardT) ? ` · project computes at ${formatMm(board)} mm` : ''}.
                            One board thickness per project — the kit&apos;s own boundary (#58). Changing it once cabinets
                            exist asks first, and recuts everything.
                          </p>
                </div>
              )}
                      <div className="flex items-center gap-2 border-t border-dashed border-shell-600 pt-2">
                        {carcassMissing.length > 0 ? (
                          <span className="flex-1 text-[11px] text-status-warn" data-carcass-missing="1">
                            {carcassMissing.map((s) => s.label).join(', ')} — no stock board yet. Generic counts as an
                            assignment; a colour or a decor alone does not.
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
            </>
          )}
        </section>
      )}

      {tab === 'fronts' && (
              /* ══ 5 · FRONTS — locked until the carcasses are saved ══ */
              <section
                className={`relative border rounded-lg p-3 pt-2.5 space-y-2 ${frontsSaved ? 'border-gold/70' : 'border-shell-600'} ${carcSaved ? '' : 'opacity-45 pointer-events-none select-none'}`}
                data-fronts-container="1"
                data-settings-section="fronts"
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
          <ol className="flex items-center gap-1.5" data-front-dots="1">
            {frontStops.map((stop) => (
              <li key={stop}>
                <button
                  type="button"
                  title={frontStopLabel(stop)}
                  data-front-dot={stop}
                  data-dot-state={stop === frontAt ? 'current' : (frontStops.indexOf(stop) < frontStops.indexOf(frontAt) ? 'done' : 'ahead')}
                  disabled={frontStops.indexOf(stop) > frontStops.indexOf(frontAt)}
                  className={`w-2.5 h-2.5 rounded-full border ${stop === frontAt
                    ? 'bg-gold border-gold'
                    : (frontStops.indexOf(stop) < frontStops.indexOf(frontAt) ? 'bg-shell-600 border-shell-600' : 'border-shell-600')}`}
                  onClick={() => setFrontStop(stop)}
                />
              </li>
            ))}
            <li className="text-[10px] text-ink-400 ml-1">{frontStopLabel(frontAt)}</li>
          </ol>

          {frontAt === 'count' && show('fronts.count') && (
            <div data-wizard-node="fronts.count" className="space-y-2">
              <p className="text-sm text-ink-100">Ile kolorów frontów?</p>
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
                          const matOpen = frontStop === t.id;
                          return (
                            <div key={t.id} className="border border-shell-600 rounded p-2 space-y-1.5" data-front-slot={t.id} data-front-type={t.id}>
                              {/* T36 F1: what this front is FACED with, named — the old
                                  panel's line, so a laminate faced in H1180 says so here too. */}
                              {t.finish_id && (
                                <p className="text-[10px] text-ink-200" data-front-facing={t.id}>
                                  Faced in <span className="text-gold">
                                    {finishById(profile, t.finish_id)?.label || String(t.finish_id).replace(/^(decor|egger|veneer):/, '')}
                                  </span>
                                </p>
                              )}
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
                                  onClick={() => setFrontStop(t.id)}
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
                                <div
                      className="flex items-center gap-1.5"
                      data-shaker-frame-slot={t.id}
                      data-wizard-node="fronts.shaker-frame"
                    >
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
            </div>
          )}

          {frontTypeAt && (
            <div data-wizard-node="fronts.picker" data-front-submodal={frontTypeAt.id}>
              {slotPicker('front', frontTypeAt, {
                title: `${frontTypeAt.label} — ${frontSubmodalNo} of ${frontTypes.length}`,
              })}
            </div>
          )}

          {frontAt === 'tail' && (
            <>
              {show('fronts.style') && (
                <div data-wizard-node="fronts.style">
                        {/* ══ 6 · DOOR STYLE — the gallery, the shaker number, and the workshop's
                               own styles. The old panel's whole section, carried whole (T36 F1) ══ */}
                        <section className="border border-shell-600 rounded-lg p-3 space-y-2" data-settings-section="door-style">
                          <div className="cc-row">
                            <span className="text-[11px] uppercase tracking-[0.16em] text-gold">Door style</span>
                            <span className="flex-1" />
                            <button
                              type="button"
                              className="cc-btn px-2"
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

                          {/* The gallery, not a dropdown (T15 F4) — a tile per shape with its own
                              drawing, a filter box and a scroll. This one writes the PROJECT's
                              shape; a front SLOT's own shape is picked in its card above. */}
                          <FrontStyleGallery
                            value={design.fronts.style}
                            onPick={(id) => { touchFronts(); setDesign({ fronts: { ...design.fronts, style: id } }); }}
                          />

                          {/* T25 F3.1: shaker is equal on all four sides — ONE field, no rail/stile
                              pair beside it, 10…200 mm. */}
                          {design.fronts.style === 'S' && (
                            <div className="flex items-center gap-2" data-shaker-frame="1">
                              <span className="text-[11px] text-ink-400 w-28">Shaker frame</span>
                              <NumberField
                                className="cc-input w-24"
                                value={shakerFrameMm(design, profile)}
                                min={profile.front.types.S.frameMin}
                                max={profile.front.types.S.frameMax}
                                onCommit={(v) => { touchFronts(); setDesign({ fronts: { ...design.fronts, shakerFrame: v } }); }}
                              />
                              <span className="text-[11px] text-ink-400">
                                mm, equal all round · {profile.front.types.S.frameMin}–{profile.front.types.S.frameMax} ·
                                {' '}panel recessed {profile.front.types.S.recessDepth} mm
                              </span>
                            </div>
                          )}
                        </section>
                </div>
              )}
              {show('fronts.opening') && (
                <div data-wizard-node="fronts.opening" className="space-y-1.5" data-front-opening="1">
                  <span className="block text-[10px] uppercase tracking-wide text-ink-400">Opening</span>
                  <div className="flex flex-wrap gap-1.5">
                    {FRONT_OPENINGS.map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        title={o.hint}
                        data-front-opening-option={o.id}
                        aria-pressed={opening === o.id}
                        className={`cc-btn px-2.5 ${opening === o.id ? 'border-gold text-gold' : ''}`}
                        onClick={() => {
                          touchFronts();
                          setDesign(frontOpeningPatch(design, o.id, { previousStyle: lastStyle.current }));
                          if (design.fronts.style !== 'HJ') lastStyle.current = design.fronts.style;
                        }}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-ink-400">
                    {FRONT_OPENINGS.find((o) => o.id === opening)?.hint}
                    {' '}Not a new field: each of the four writes what this project already carries — the
                    handle record, the shape, or the MOVENTO TIP-ON variant.
                  </p>
                </div>
              )}
              {show('fronts.shine') && (
                <div data-wizard-node="fronts.shine" data-front-shine="1">
                        {/* ── 10 · Sheen, after the colours — the owner's order. ── */}
                        <SheenSlider design={design} setDesign={setDesign} profile={profile} />
                  <p className="text-[10px] text-ink-400">
                    The shine reaches the 3D material: `roughness = 1 − sheen ÷ 100`, on every sprayed
                    surface in the scene (src/3d/materials.js). A laminate is a foil and keeps the sheen
                    that came on the board.
                  </p>
                </div>
              )}
              {show('fronts.door-styles') && (
                <div data-wizard-node="fronts.door-styles" className="border border-shell-600 rounded-lg p-3 space-y-2">
                          <div className="cc-divider" />
                          <span className="text-[10px] uppercase tracking-wide text-ink-400">The workshop&apos;s own styles</span>

                          {design.doorStyles.length === 0 && (
                            <p className="text-[11px] text-ink-400">
                              No styles yet. A style is a name, a front type and a material/colour — assign it to units from the
                              parameter panel.
                            </p>
                          )}

                          <ul className="space-y-2" data-door-styles="1">
                            {design.doorStyles.map((style) => (
                              <li key={style.id} className="border border-shell-600 rounded p-2 space-y-2" data-door-style={style.id}>
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
                                  <button type="button" className="cc-btn-ghost text-status-danger" data-door-style-remove={style.id} onClick={() => removeDoorStyle(style.id)}>×</button>
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
                </div>
              )}
              {show('fronts.run-materials') && (
                <div data-wizard-node="fronts.run-materials">
                          {/* ─── TURN 16 (CLAUDE.md F1.2): THE RUN PIECES, carried here by T36 F1 ─
                              "Infills, plinths, end panels and masking panels get a material
                              control with a checkbox 'Same as fronts', DEFAULT ON." The list is
                              RUN_MATERIAL_GROUPS in engine/materials.js and the resolver reads
                              the same four keys, so a fifth run piece is a data entry. */}
                          <div className="border border-shell-600 rounded p-2 space-y-1.5" data-run-materials="1">
                            <span className="text-[10px] uppercase tracking-wide text-ink-400">
                              Infills, plinths, end panels, masking panels
                            </span>
                            {RUN_MATERIAL_GROUPS.map((g) => {
                              const setting = runMaterialSetting(design, g.id);
                              const assigned = materials.find((m) => m.id === setting.material_id) || null;
                              return (
                                <div key={g.id} className="cc-row" data-run-material={g.id}>
                                  <span className="text-[11px] text-ink-100 w-28 shrink-0" title={g.hint}>{g.label}</span>
                                  <label className="flex items-center gap-1.5 text-[11px] text-ink-200 shrink-0">
                                    <input
                                      type="checkbox"
                                      data-same-as-fronts={g.id}
                                      checked={setting.sameAsFronts}
                                      onChange={(e) => { touchFronts(); setRunMaterial(g.id, { sameAsFronts: e.target.checked }); }}
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
                                      onChange={(e) => { touchFronts(); setRunMaterial(g.id, { material_id: e.target.value || null }); }}
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
                            <p className="text-[10px] text-ink-400">
                              Ticked, these are cut from front 1&apos;s board — which is what a workshop means by
                              &quot;same as the doors&quot;, and what puts them on the same CNC sheet.
                            </p>
                          </div>
                </div>
              )}
              {show('fronts.chosen') && (
                <div data-wizard-node="fronts.chosen">
                          {/* the CHOSEN list — mini swatches */}
                          <div className="border-t border-dashed border-shell-600 pt-1.5 space-y-1" data-fronts-chosen="1">
                            {frontTypes.map((t) => {
                              const c = chosenOf(t, 'front');
                              return c ? <ChosenRow key={t.id} who={t.label} hex={c.hex} thumb={c.thumb} text={c.text} /> : null;
                            })}
                          </div>
                </div>
              )}
                      <div className="flex items-center gap-2 border-t border-dashed border-shell-600 pt-2">
                        {frontsMissing.length > 0 ? (
                          <span className="flex-1 text-[11px] text-status-warn" data-fronts-missing="1">
                            {frontsMissing.map((s) => s.label).join(', ')} — no stock board yet. Generic counts as an
                            assignment; a colour or a decor alone does not.
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
            </>
          )}
        </section>
      )}

      {tab === 'hardware' && (
        <>
          {/* ─── T44 F6: THE COLOURS ARE WHAT RETAIL SEES ────────────────────
              *"All existing hardware choices, relocated; retail sees ONLY
              colour."* The two colour questions are the Hardware STEP's own
              (WizardHardware), so the step's component is rendered here and
              told which head is reading rather than being copied into a
              second one. Everything under it is the workshop's. */}
          <div data-wizard-node="hardware.colour">
            <WizardHardware audience={audience} />
          </div>
          {show('hardware.choices') && (
            <div data-wizard-node="hardware.choices">
                    {/* ══ 7 · HARDWARE — every row the old panel had. The Hardware STEP of the
                           wizard keeps its own client-facing four; these are the workshop's,
                           and both write the same fields (T36 F1: surfaces move, wiring does
                           not). ══ */}
                    <section className="border border-shell-600 rounded-lg p-3 space-y-2" data-settings-section="hardware">
                      <span className="block text-[11px] uppercase tracking-[0.16em] text-gold">Hardware</span>
                      <div className="space-y-1">
                        {hardwareChoices(design, profile).map((h) => (
                          <div key={h.key} className="cc-row" data-hardware-choice={h.key}>
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
                                    data-hardware-choice-option={`${h.key}:${v.id}`}
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

                      {/* T17 F7.1 — how many hinges this JOB hangs a door on. */}
                      <div className="cc-row" data-hinge-standard="1" data-wizard-node="hardware.hinge-standard">
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

                      {/* T19 F1.1 — WHICH hinge: system, finish, plate. The old panel's own
                          block, imported rather than copied. */}
                      <div data-wizard-node="hardware.hinge-system">
                        <HingeHardware
                          design={design}
                          profile={profile}
                          frontThickness={frontBoard}
                          onChange={setHingeHardware}
                        />
                      </div>

                      {/* T35 F8 — the hinge-plate pilot. A WORKSHOP number: the profile's. */}
                      <div className="cc-row" data-hinge-plate-pilot="1" data-wizard-node="hardware.hinge-plate-pilot">
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

                      {/* T25 F6.1 — the shelf supports the eye can see. */}
                      <div className="cc-row" data-shelf-sleeve="1" data-wizard-node="hardware.shelf-sleeve">
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

                      {/* T18 F6.4 — the runner SYSTEM the shop stocks and the VARIANT this job
                          is fitted with. The variant is the same field the Hardware step's
                          Push-to-open writes; two doors, one number. */}
                      <div className="cc-row" data-runner-system="1" data-wizard-node="hardware.runners">
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
            </div>
          )}
        </>
      )}

      {tab === 'produkcja' && (
        <>
          {show('produkcja.infill') && (
            <div data-wizard-node="produkcja.infill">
                    {/* ══ 9 · INFILL AT THE WALL — the filler between a unit and the wall ══ */}
                    <section className="space-y-2" data-settings-section="infill">
                      <span className="block text-[11px] uppercase tracking-[0.16em] text-gold">Infill at the wall</span>
                      <div className="flex items-center gap-2">
                        <NumberField
                          className="cc-input w-24 text-right"
                          data-infill-side-width="1"
                          min={0}
                          value={design.infill.sideWidth}
                          onCommit={(v) => setDesign({ infill: { ...design.infill, sideWidth: v } })}
                        />
                        <span className="text-[11px] text-ink-400">mm — the filler between a unit and the wall</span>
                      </div>
                    </section>
            </div>
          )}
          {show('produkcja.per-material') && (
            <section className="border border-shell-600 rounded-lg p-3 space-y-2" data-wizard-node="produkcja.per-material" data-settings-section="thickness">
              <span className="block text-[11px] uppercase tracking-[0.16em] text-gold">
                Measurements &amp; sheet sizes, per material
              </span>
              <p className="text-[11px] text-ink-400">
                The manufacturer never tells you the board is really 18.5 — the caliper does. Type what you
                measured and tick it; every formula in the app computes from that number and nothing rounds
                it. Grouped by the materials THIS job picked, in the order it picked them.
              </p>
              <ul className="space-y-2" data-thickness-slots="1">
                {materialBlocks.map((b) => (
                  <li key={b.key} className="border border-shell-600 rounded p-2 space-y-1.5" data-material-block={b.key}>
                    <div className="cc-row">
                      <span className="text-[12px] text-ink-50 flex-1">{b.label}</span>
                      <span className="text-[10px] text-ink-400">{b.boardName}</span>
                    </div>
                    {b.row && (
                      <div className="cc-row" data-thickness-slot={b.row.id}>
                        <span className="text-[11px] text-ink-400 w-24 shrink-0" title={b.row.hint}>Measured</span>
                        <span className="text-[11px] text-ink-400 w-20 shrink-0" data-slot-nominal={b.row.id}>
                          nominal {formatMm(b.row.nominal)}
                        </span>
                        <NumberField
                          className="cc-input w-20 text-right"
                          data-slot-measured={b.row.id}
                          value={b.row.measured}
                          onCommit={(v) => commitMeasured(b.row, v)}
                        />
                        <label className="flex items-center gap-1 text-[11px] text-ink-300">
                          <input
                            type="checkbox"
                            data-slot-confirmed={b.row.id}
                            checked={b.row.confirmed}
                            onChange={(e) => setSlotThickness(b.row.id, { confirmed: e.target.checked })}
                          />
                          measured
                        </label>
                        {b.row.dirty && (
                          <span className="text-[10px] text-gold" data-slot-dirty={b.row.id} title="The caliper disagrees with the label — which is normal.">
                            ≠ label
                          </span>
                        )}
                      </div>
                    )}
                    {b.sheet && (
                      <SheetSizeRow
                        family={b.sheet.family}
                        label={b.sheet.label}
                        hint={b.sheet.hint}
                        profile={profile}
                        onChange={(size) => setProfile({ ...profile, cnc: { ...profile.cnc, [b.sheet.key]: size } })}
                      />
                    )}
                  </li>
                ))}
              </ul>
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
            </section>
          )}
          {show('produkcja.box-gate') && (
            <div data-wizard-node="produkcja.box-gate" className="space-y-1">
              {boxGate.blocked && (
                <span className="text-[10px] px-1.5 py-0.5 rounded border border-status-warn text-status-warn" data-box-gate="1">
                  no drawers yet
                </span>
              )}
              {boxGate.blocked && (
                <p className="text-[11px] text-status-warn" data-box-gate-message="1">{boxGate.message}</p>
              )}
            </div>
          )}
        </>
      )}

      {tab === 'podsumowanie' && (
        <>
          <div data-wizard-node="podsumowanie.summary" className="space-y-2" data-summary="1">
            <span className="block text-[11px] uppercase tracking-[0.16em] text-gold">Podsumowanie</span>
            <p className="text-[11px] text-ink-400">
              Everything this job has been told, grouped the way it was asked. A tab is one click away if a
              line is wrong.
            </p>
            {summary.map((group) => (
              <div key={group.tab} className="border border-shell-600 rounded p-2 space-y-1" data-summary-group={group.tab}>
                <div className="cc-row">
                  <span className="text-[11px] text-ink-50 flex-1">{group.n}. {group.label}</span>
                  <button
                    type="button"
                    className="cc-btn-ghost px-2"
                    data-summary-goto={group.tab}
                    onClick={() => goTab(group.tab)}
                  >
                    Change…
                  </button>
                </div>
                {group.rows.map((row) => (
                  <div key={row.label} className="flex items-baseline gap-2 text-[11px]" data-summary-row={row.label}>
                    <span className="w-40 shrink-0 text-ink-400">{row.label}</span>
                    <span className="text-ink-100">{row.value}</span>
                  </div>
                ))}
                {group.rows.length === 0 && (
                  <p className="text-[11px] text-ink-400">Nothing to show for this head.</p>
                )}
              </div>
            ))}
          </div>
          {show('podsumowanie.save-set') && (
            <div data-wizard-node="podsumowanie.save-set" className="border-t border-dashed border-shell-600 pt-2">
              <button
                type="button"
                className="cc-btn-gold px-3"
                data-open-save-set="1"
                onClick={() => setSaveSetOpen(true)}
              >
                Zapisać te ustawienia jako Twój standard?
              </button>
              <p className="text-[10px] text-ink-400 mt-1">
                The `Keep as…` control that used to sit in Ustawienia, asked once and at the end — which is
                the only moment a workshop has actually finished deciding.
              </p>
            </div>
          )}
        </>
      )}
      </div>

      {/* ══ THE SEQUENCE'S FEET ══════════════════════════════════════════════
          ONE Next, and what it means is what the current stop means: inside
          Carcases and Fronts it walks the submodals, and on their last stop it
          waits for that container's own Save — the two buttons the gate has
          read since the 15.08 rebuild (`data-save-carcasses` /
          `data-save-fronts`) are exactly where they were, at the foot of their
          own tab, with their own status sentence beside them. "Next validates
          only the current tab", which is F2's rule and the reason a missing
          board on Fronts cannot block Ustawienia. ══ */}
      <div className="flex items-center gap-2 border-t border-shell-600 pt-2" data-wizard-nav="1">
        <button
          type="button"
          className="cc-btn px-3"
          data-tab-back="1"
          disabled={!backTarget}
          onClick={goBack}
        >
          Back
        </button>
        <span className="flex-1 text-[11px] text-ink-400" data-tab-hint="1">{nextHint}</span>
        {nextTarget && (
          <button
            type="button"
            className="cc-btn-gold px-3"
            data-tab-next="1"
            disabled={nextBlocked}
            title={nextBlocked ? nextHint : undefined}
            onClick={goNext}
          >
            {nextLabel}
          </button>
        )}
      </div>

      {/* ── F8's finale, its own draggable window, opened BESIDE its button ── */}
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

/**
 * The one-line explanation under the runner variant buttons (turn 18, F6.4),
 * carried here with the row itself (T36 F1).
 */
function runnerVariantHint(profile, chosen) {
  const list = profile.hardware.runner.movento.variants || [];
  const v = list.find((x) => x.id === chosen) || list[0];
  return v ? `${v.id} — ${v.label}. ${v.hint}` : '';
}

/**
 * How many doors in this job carry a hinge somebody picked by hand
 * (turn 19, CLAUDE.md F1.4). These are the doors the re-resolve gate does NOT
 * touch: an assignment is somebody's decision about that door.
 */
function doorsWithOwnHinge(units) {
  let n = 0;
  for (const u of units) n += Object.keys(u.params?.door_hinges || {}).length;
  return n;
}
