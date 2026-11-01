import {
  useEffect, useMemo, useRef, useState,
} from 'react';
import { useProjectStore } from '../stores/projectStore.js';
import { useUiStore } from '../stores/uiStore.js';
import { useCabinetProfileStore } from '../stores/cabinetProfileStore.js';
// T84 F2 (CLAUDE.md PART A): Undo and Redo on the Studio top bar, the history store's own.
import { useHistoryStore } from '../stores/historyStore.js';
// Turn 44 (CLAUDE.md iron rule 5): which head is reading — factory or retail.
import MenuBar from './MenuBar.jsx';
// Turn 35 (CLAUDE.md F10): the View item reads the project's ONE lighting state.
import { migrateDesign } from '../engine/design.js';
import { buildOutputMenu } from '../lib/outputMenu.js';
// T-CC1b F1: the job block's second line and the way back to Joinery Core (lib/topMenu.js).
import {
  BACK_TO_JC_LABEL, goToJoineryCore, jobProjectLine, orderMenus,
} from '../lib/topMenu.js';
import { persistProject } from '../lib/persist.js';
// Chat fix 28.10.2026: the job as a file (Save to file, Open from file).
import { pickProjectFile } from '../lib/projectFile.js';
import { openProjectFromFile, saveProjectToFile } from '../lib/projectFileRoad.js';
import { askProjectFile } from './ProjectFileModal.jsx';
// T-CC1a F6: Open from file is the import road, bound to a Joinery Core project picked in its own window.
import { askJcProject } from './jc/JcProjectPicker.jsx';
import { anchorOfEvent } from '../lib/modalAnchor.js';
import { LAYER_CLASS } from '../lib/modalLayer.js';
// T84 F2: the Studio's icons (StudioShell mounts their sprite once).
import { Icon } from './studio/StudioIcons.jsx';

// Frozen layout, SPEC section 7: logo in gold, project name, gold Export button.
// Turn 4 (BACKLOG #8) puts the classic menu bar in between: File · View ·
// Library · Settings · Database · Clients on the left, Account and Export
// staying on the right where they were.
//
// Turn 6 adds OUTPUT (CLAUDE.md F1) and it is not another menu — it is THE
// menu for everything that leaves the app. Turn 4 scattered the exports into
// File ▸ Export because that is where a file menu usually keeps them; turn 6
// has a render, three drawings and three machine files to offer, and "where do
// I get a picture of this?" is not a question about files. So File goes back to
// being about the PROJECT, and everything that produces an artefact — a render,
// a drawing, a cut list, a DXF, a PDF — is in one place, in the order a
// workshop meets them: show the client, draw it, cut it.
// T-CC1b F5: Output takes the cutting list, the materials list and the labels
// only (*"Output zmniejszyc"*, the owner, 01.11.2026); the render, the
// drawings and the CNC files leave from their own windows.
export default function TopBar({
  onExportCsv, onExportPdf, onExportLabels,
  // T84 F2 (CLAUDE.md PART A): 'studio' when StudioShell holds the bar; absent, the bar of today.
  variant = null,
}) {
  const studio = variant === 'studio';
  const name = useProjectStore((s) => s.project.name);
  const project = useProjectStore((s) => s.project);
  const units = useProjectStore((s) => s.units);
  const dirty = useProjectStore((s) => s.dirty);
  const setProjectName = useProjectStore((s) => s.setProjectName);
  const markSaved = useProjectStore((s) => s.markSaved);

  const openModal = useUiStore((s) => s.openModal);
  const notify = useUiStore((s) => s.notify);
  const goToStart = useUiStore((s) => s.goToStart);
  const warnIfUnsaved = useUiStore((s) => s.warnIfUnsaved);

  // ─── LEAVING THE PROJECT (turn 31, CLAUDE.md F2) ──────────────────────────
  //
  // "Leaving with unsaved work shows a RED 'Save the project — unsaved
  // changes'." Every door out of the editor is in this bar — New project, Open,
  // Close project, and the CABINET CORE badge — so this is the one function all
  // four go through, rather than four remembered lines. It SPEAKS and does not
  // bar the door (rule 4); the message is a RED, so it stays until it is
  // clicked and is still there on the screen he has just walked to.
  const leaveProject = () => {
    warnIfUnsaved({ dirty, units });
    goToStart();
  };
  const showOutlines = useUiStore((s) => s.showOutlines);
  const toggleOutlines = useUiStore((s) => s.toggleOutlines);
  const showDimensions = useUiStore((s) => s.showDimensions);
  const dimensionColour = useUiStore((s) => s.dimensionColour);
  const setDimensionColour = useUiStore((s) => s.setDimensionColour);
  const toggleDimensions = useUiStore((s) => s.toggleDimensions);
  const contourView = useUiStore((s) => s.contourView);
  const xray = useUiStore((s) => s.xray);
  const toggleXray = useUiStore((s) => s.toggleXray);
  const toggleContourView = useUiStore((s) => s.toggleContourView);
  const hideFronts = useUiStore((s) => s.hideFronts);
  // Turn 25 (CLAUDE.md F13): project-wide, remembered.
  const showFrontDimensions = useUiStore((s) => s.showFrontDimensions);
  const toggleFrontDimensions = useUiStore((s) => s.toggleFrontDimensions);
  const toggleHideFronts = useUiStore((s) => s.toggleHideFronts);
  const realisticLighting = useUiStore((s) => s.realisticLighting);
  const toggleRealisticLighting = useUiStore((s) => s.toggleRealisticLighting);
  // Turn 33 (CLAUDE.md F2): the client demo — one flag, two controls.
  // ─── TURN 35 (CLAUDE.md F10) ────────────────────────────────────────────
  // Still one flag and still two controls; the flag is the PROJECT'S now
  // (`design.lighting.on`, the owner's merged ON/OFF), so this item writes the
  // very state the Lighting panel's two buttons write. Migrated on the way in,
  // because a project saved before tonight answers with `enabled`.
  const storedDesign = useProjectStore((s) => s.project.design);
  const setLighting = useProjectStore((s) => s.setLighting);
  const lightOn = useMemo(() => migrateDesign(storedDesign).lighting.on, [storedDesign]);
  // Turn 26 (CLAUDE.md F10.3): the brightness slider's value and its setter.
  const brightness = useUiStore((s) => s.brightness);
  const setBrightness = useUiStore((s) => s.setBrightness);
  const viewMode = useUiStore((s) => s.viewMode);
  const setViewMode = useUiStore((s) => s.setViewMode);
  const bomOpen = useUiStore((s) => s.bomOpen);
  const setBomOpen = useUiStore((s) => s.setBomOpen);
  const snapStep = useUiStore((s) => s.snapStep);
  const setSnapStep = useUiStore((s) => s.setSnapStep);
  const profile = useCabinetProfileStore((s) => s.profile);

  const [editing, setEditing] = useState(false);
  // ─── Turn 20 (CLAUDE.md F12.2): THE SAVE THAT SAYS SO ─────────────────────
  // Owner's pre-18 list: a save that works looks exactly like a save that does
  // nothing. It goes GREEN with a check for two seconds and then back to rest —
  // and a FAILED save does not, because a control that goes green whatever
  // happened is a control nobody reads. A failure keeps today's surface: the
  // toast, in its own tone, saying what went wrong.
  //
  // 'rest' | 'saving' | 'saved'. Nothing else in the app reads it: it is about
  // the click that just happened, not a state the project is in — `dirty` is
  // that, and it is the store's.
  const [saveState, setSaveState] = useState('rest');
  const confirmMs = profile.ui.saveConfirmMs;
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const save = async () => {
    clearTimeout(timer.current);
    setSaveState('saving');
    const { project: saved, message, tone, stored } = await persistProject({ project, units });
    // T82 F20, after the review: a job the shelf refused stays marked unsaved.
    if (stored) markSaved(saved);
    notify(message, tone);
    // Only a clean 'ok' is a success. A save that landed on this computer
    // because the database refused it comes back 'warn', and a joiner who
    // needs to know that must not be told everything is fine.
    if (tone !== 'ok') { setSaveState('rest'); return; }
    setSaveState('saved');
    timer.current = setTimeout(() => setSaveState('rest'), confirmMs);
  };

  // ─── CHAT FIX 28.10.2026 · THE JOB AS A FILE (lib/projectFileRoad.js) ─────
  // The owner: *"ja mowie o pliku z CC zebym mial ten sam na innym kompie"*;
  // *"zrobisz mi pozniej cos co zadziala, czyli export i import projektow"*.
  // Save to file downloads the job on the screen; Open from file picks a
  // .ccproject file, asks its questions in its own window
  // (components/ProjectFileModal.jsx) and, before the job on the screen is
  // replaced, speaks about unsaved work exactly as File > Open does
  // (warnIfUnsaved, the same red sentence; it never bars the door).
  const saveToFile = () => { saveProjectToFile(); };
  const openFromFile = async (anchor) => {
    const picked = await pickProjectFile();
    await openProjectFromFile({
      picked,
      anchor,
      ask: askProjectFile,
      pickProject: askJcProject,
      beforeOpen: () => {
        const now = useProjectStore.getState();
        warnIfUnsaved({ dirty: now.dirty, units: now.units });
      },
    });
  };

  const menus = [
    {
      label: 'File',
      items: [
        { label: 'New project…', hint: 'Name it and set the room on the start screen', run: leaveProject },
        { label: 'Open…', hint: 'Recent projects and everything saved', run: leaveProject },
        { label: 'Open from file…', hint: 'Import an old .ccproject job into a Joinery Core project', run: (e) => openFromFile(anchorOfEvent(e)) },
        { divider: true },
        { label: 'Save', hint: dirty ? 'Unsaved changes' : 'Up to date', run: save },
        { label: 'Save as…', run: (e) => openModal('save-as', { anchor: anchorOfEvent(e) }) },
        { label: 'Save to file…', hint: 'The whole job in one file, to open on another computer', run: saveToFile },
        { divider: true },
        { label: 'Close project', run: leaveProject },
      ],
    },
    {
      label: 'View',
      items: [
        { label: 'Outlines', checked: showOutlines || contourView, disabled: contourView, run: toggleOutlines },
        { label: 'Dimensions', checked: showDimensions, disabled: viewMode !== '3d' || contourView, run: toggleDimensions },
        {
          // ─── Turn 25 (CLAUDE.md F13): SHOW FRONT DIMENSIONS ───
          // Every front's width and height, and the gaps — between doors,
          // between drawer fronts, to the sides, to the top, to the floor.
          // PROJECT-WIDE, which is the owner's own choice and not a
          // simplification: the numbers this is for are the GAPS, and a gap
          // belongs to two fronts at once, so a per-door switch would let one
          // leaf of a pair show the gap between them and the other not.
          label: 'Show front dimensions',
          hint: 'Every front’s width and height, and the gaps between them — for the whole project.',
          checked: showFrontDimensions,
          disabled: viewMode !== '3d' || contourView,
          run: toggleFrontDimensions,
        },
        {
          // Which ink the distance dimensions are drawn in (BACKLOG #34). Both
          // are drawing-office colours; the hexes are in the profile.
          label: 'Dimension colour',
          disabled: viewMode !== '3d' || contourView,
          items: Object.keys(profile.dimensions.colours).map((key) => ({
            label: key === 'navy' ? 'Navy' : 'Red',
            checked: dimensionColour === key,
            run: () => setDimensionColour(key),
          })),
        },
        { divider: true },
        { label: '3D', checked: viewMode === '3d', run: () => setViewMode('3d') },
        { label: 'CNC sheet', checked: viewMode === 'cnc', run: () => setViewMode('cnc') },
        { divider: true },
        {
          // Turn 6. The one part of the new lifting that is not free: the room
          // probe is sampled for every lit pixel of every panel. On by default;
          // here so a machine with no GPU worth the name has a way out. A
          // RENDER lights itself properly whatever this says.
          // ─── TURN 26 (CLAUDE.md F10.3): HOW BRIGHT THE ROOM IS ──────────
          // ONE multiplier on every lamp, so the ratios the rig was balanced
          // at — the key against the fill, the jupiters against the ambient —
          // are exactly the ones turn 10 measured whatever this is set to. A
          // slider that touched one lamp would be a slider that re-lights the
          // scene; this one only turns it up. Remembered, like X-ray.
          label: 'Brightness',
          hint: 'Scales every light in the room together. The balance between them does not move.',
          disabled: viewMode !== '3d',
          slider: {
            min: profile.appearance.studio.brightness.min,
            max: profile.appearance.studio.brightness.max,
            step: profile.appearance.studio.brightness.step,
            value: brightness,
            format: (v) => `${Math.round(v * 100)} %`,
          },
          run: setBrightness,
        },
        {
          label: 'Realistic lighting',
          hint: 'Environment reflections and contact shadows. Turn it off if the view feels heavy — a render is unaffected.',
          checked: realisticLighting,
          disabled: viewMode !== '3d',
          run: toggleRealisticLighting,
        },
        {
          // ─── TURN 33 (CLAUDE.md F2): THE CLIENT DEMO ─────────────────────
          // The room dims to the profile's demo level, the placed LEDs come
          // up. In the View menu AND in the Lighting panel — one flag, two
          // controls, the front-dimensions grammar.
          //
          // ─── TURN 35 (CLAUDE.md F10): IT IS THE PROJECT'S SWITCH NOW ─────
          // The owner's ON/OFF buttons merged this with "Lighting in this
          // project", so the twin control here writes the same single state
          // and a job that goes home with the light on comes back with it on.
          // Toggling back still restores the view exactly — nothing but the
          // flag moves — but the flag is saved, which is what he asked for.
          label: 'Turn on the light',
          hint: 'Internal lights ON — the room dims and the placed LEDs shine. The same switch as the Lighting panel’s ON / OFF.',
          checked: lightOn,
          disabled: viewMode !== '3d',
          run: () => setLighting({ on: !lightOn }),
        },
        {
          // Turn 7 (BACKLOG #42). A way of LOOKING, like Contour view beside
          // it: nothing about it reaches the BOM or the CNC sheet.
          label: 'X-ray',
          hint: 'See through the carcasses. Hinges, runners and legs appear where they are fitted.',
          checked: xray,
          disabled: viewMode !== '3d' || contourView,
          run: toggleXray,
        },
        {
          // Turn 18 (CLAUDE.md F4 / BACKLOG W22). The other half of X-ray's
          // question, and a LENS in exactly the same sense: "Remove doors" is
          // the project decision and it lives in the right-click menu.
          label: 'Hide fronts',
          hint: 'Doors and drawer fronts off the picture. Nothing in the BOM, the cut list or the CNC changes — use Remove doors for that.',
          checked: hideFronts,
          disabled: viewMode !== '3d',
          run: toggleHideFronts,
        },
        {
          label: 'Contour view',
          hint: 'Presentation mode — outlines only. Changes nothing in the BOM.',
          checked: contourView,
          disabled: viewMode !== '3d',
          run: toggleContourView,
        },
      ],
    },
    // T-CC1b F4 · the Library menu is deleted: *"Library powinno byc po lewej"* (the owner, 01.11.2026); the rail's Add is its one door.
    {
      label: 'Settings',
      items: [
        { label: 'Settings…', run: (e) => openModal('design', { anchor: anchorOfEvent(e) }) },
        { label: 'Room setup…', run: (e) => openModal('room', { anchor: anchorOfEvent(e) }) },
        // T-CC1b F3 (the owner: *"Database: Company defaults do Settings"*): the
        // Database menu's entry moves house, the same window, the same call.
        {
          label: 'Company defaults…',
          hint: 'Hinges, plates, runners and boards this workshop fits: every new project starts here',
          run: (e) => openModal('company-defaults', { anchor: anchorOfEvent(e) }),
        },
        { divider: true },
        {
          label: 'Snap',
          items: profile.editor.snapSteps.map((step) => ({
            label: step === 32 ? '32 mm system' : `${step} mm`,
            checked: snapStep === step,
            run: () => setSnapStep(step),
          })),
        },
      ],
    },
    // T-CC1b F3 · the Database menu is deleted: *"Database niepotrzebne, wszystko jest w JC, Assign materials juz jest po lewej"* (the owner, 01.11.2026).
    // === T78 F21 (CLAUDE.md PART F): SPRAYING, THE OWNER'S OWN MENU =========
    // BACKLOG #36's held-open place, filled. The owner, 11.10.2026: *"cale
    // sprayowanie jako osobne menu Cabinet Core."*  A BUTTON like Lighting: it
    // opens the Spraying page (components/SprayingPanel.jsx) beside itself.
    // Output > Spraying... (lib/outputMenu.js) opens the same page: one window,
    // one registry entry (lib/modalLayer.js 'spraying').
    {
      label: 'Spraying',
      hint: 'The spray schedule: every sprayed element, its paint code, the m2 and the paint to order',
      run: (e) => openModal('spraying', { anchor: anchorOfEvent(e) }),
    },
    // ─── TURN 33 (CLAUDE.md F1): LIGHTING, BEFORE OUTPUT ─────────────────────
    // A BUTTON, not a dropdown — it opens the Lighting panel beside itself
    // (rule 5: draggable, beside, never covering). Its place in the bar is
    // lib/topMenu.js MENU_ORDER, where the owner's order is data.
    {
      label: 'Lighting',
      hint: 'LED strips, spots and the demo — placed in the scene, counted in the BOM',
      run: (e) => openModal('lighting', { anchor: anchorOfEvent(e) }),
    },
    // ── Output (turn 6, CLAUDE.md F1) ── built by lib/outputMenu.js, so its
    // shape is a thing a node test can look at rather than a thing inside a
    // component nobody mounts. Turn 11 moves it to the END of the bar (F7):
    // it is what LEAVES the app, and a joiner reaches for it last.
    // T-CC1b F5: the cutting list, the materials list and the two label sheets, nothing else.
    buildOutputMenu({ onExportCsv, onExportPdf, onExportLabels }),
  ];

  // ─── T84 F2 (CLAUDE.md PART A): ONE SET OF CONTROLS, TWO LAYOUTS ───────────
  //
  // The Studio top bar (`variant="studio"`, held by StudioShell) RE-HOMES this
  // header's controls; it never copies them. Each control both layouts draw is
  // written ONCE below and drawn by whichever layout is mounted, so the two
  // faces share its handler, its guard and its state (CLAUDE.md T84 LAW 1, ZERO
  // KASOWANIA). Each is a small function that returns its control in a return
  // statement of its own, because the census reads the header's controls out
  // of every return of this component (scripts/t84-census.mjs, rule 4). The
  // legacy layout draws them where it always did. The Studio layout adds three
  // things of its own: the PRO label, Undo and Redo (`StudioHistory`, at the
  // end of this file) and the word BOM on the gold button (the owner, 16:27:
  // *"tak"*, renamed, the same call). Its look is the skin's
  // (components/studio/studio.css, the `studio-*` classes). T-CC1a F3: the
  // mock badge and the Account button are deleted with the login.
  const drawWordmark = () => {
    return (
      <button
        type="button"
        className={studio
          ? 'studio-wordmark'
          : 'font-semibold tracking-[0.18em] text-gold text-sm select-none hover:text-gold-hover transition-colors'}
        title="Back to the start screen"
        onClick={leaveProject}
      >
        {studio && <Icon name="cube" />}
        CABINET CORE
      </button>
    );
  };
  const drawMenuBar = () => {
    return (
      <MenuBar menus={orderMenus(menus)} />
    );
  };
  // On the Studio bar the name is the part that gives way (the skin narrows it
  // so the eight menus fit at 1280); the edit ends on Enter, Escape and blur
  // as ever.
  const drawProjectName = () => {
    return (
      editing ? (
        <input
          autoFocus
          className={studio ? 'cc-input studio-project-name' : 'cc-input max-w-[220px]'}
          value={name}
          onChange={(e) => setProjectName(e.target.value)}
          onBlur={() => setEditing(false)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') setEditing(false); }}
        />
      ) : (
        <button
          type="button"
          className={studio
            ? 'studio-project-name'
            : 'text-sm text-ink-100 hover:text-gold transition-colors truncate max-w-[220px]'}
          onClick={() => setEditing(true)}
          title="Rename project"
        >
          {name}
          {dirty && <span className="ml-2 text-ink-400 text-xs">•</span>}
        </button>
      )
    );
  };
  // ─── T-CC1b F1 · THE JOB BLOCK (law 2) ──────────────────────────────────
  // The owner, over his screenshot: the project name before the File menu
  // *"wprowadza w blad"*; it belongs *"po prawej, z numerem projektu JC i
  // nazwa"*, *"srodkowe prawo, wyraznie oddzielone od menu"*. Line one is the
  // ITEM's name (editable as ever); line two the Joinery Core project it is
  // bound to, read-only here. An unknown project name shows the number alone.
  const drawJobBlock = () => {
    return (
      <div className="studio-job" data-studio="topbar-job">
        {drawProjectName()}
        <span
          className="studio-job-project"
          data-studio="topbar-job-project"
          title="Joinery Core project: read-only here"
        >
          {jobProjectLine(project)}
        </span>
      </div>
    );
  };
  // ─── T-CC1b F1.2 · BACK TO JOINERY CORE ─────────────────────────────────
  // The owner: *"duzy przycisk Return to Joinery Core"*. A dirty item is saved
  // first by today's road (the pagehide flush of T-CC1a F8 covers a refused
  // save), then the browser goes to Joinery Core's dashboard.
  const backToJc = async () => {
    if (dirty) await save();
    goToJoineryCore();
  };
  // THE UX TURN, U1: the same gold button, the same road, at the FAR LEFT of the
  // bar, before the wordmark. The owner: *"zostaje zloty, tylko na lewo"*;
  // *"serio zawsze back przyciski sa raczej po lewej, taka zasada i
  // przyzwyczajenie"*. The house set has no arrow-left icon (StudioIcons.jsx),
  // so the arrow is the single angle quote before the words, hidden from a
  // screen reader, which reads the words alone.
  const drawBackToJc = () => {
    return (
      <button
        type="button"
        className="cc-btn-gold shrink-0"
        data-studio="topbar-back-jc"
        title="Save this item if it has changes, then go back to Joinery Core"
        onClick={backToJc}
      >
        <span aria-hidden="true">‹</span> {BACK_TO_JC_LABEL}
      </button>
    );
  };
  const drawSave = () => {
    return (
      <button
        type="button"
        data-studio={studio ? 'topbar-save' : undefined}
        data-save-control="1"
        data-save-state={saveState}
        disabled={saveState === 'saving'}
        title={dirty ? 'Unsaved changes' : 'Up to date'}
        className={`cc-btn transition-colors ${saveState === 'saved' ? 'border-emerald-500 text-emerald-400' : ''}`}
        onClick={save}
      >
        {studio && <Icon name="save" />}
        {saveState === 'saved' ? '✓ Saved' : (saveState === 'saving' ? 'Saving…' : 'Save')}
      </button>
    );
  };
  // The Studio layout keeps the word for a screen reader and gives its width
  // to the menus (the label's `title` still says what the slider does).
  const drawBrightness = () => {
    return (
      <label
        className="flex items-center gap-2 select-none"
        data-studio={studio ? 'topbar-brightness' : undefined}
        data-brightness-control="1"
        title="Scales every light in the room together. The balance between them does not move."
      >
        <span className={studio ? 'sr-only' : 'cc-label mb-0'}>Bright</span>
        <input
          type="range"
          className="w-24 accent-gold"
          min={profile.appearance.studio.brightness.min}
          max={profile.appearance.studio.brightness.max}
          step={profile.appearance.studio.brightness.step}
          value={brightness}
          disabled={viewMode !== '3d'}
          data-brightness-value={brightness}
          onChange={(e) => setBrightness(Number(e.target.value))}
        />
        <span className="text-[11px] text-ink-400 tabular-nums w-9 text-right">
          {`${Math.round(brightness * 100)} %`}
        </span>
      </label>
    );
  };
  const drawBom = () => {
    return (
      <button type="button" className="cc-btn-gold" data-studio={studio ? 'topbar-bom' : undefined} onClick={() => setBomOpen(!bomOpen)}>
        {studio ? 'BOM' : 'Export'}
      </button>
    );
  };

  // ─── T84 F2 · THE STUDIO TOP BAR ─────────────────────────────────────────
  // Stage-1's order (verify/t84/astra/, CLAUDE.md T84 F2): the wordmark and the
  // PRO label, the project name, the legacy menus WHOLE (the same `menus`, the
  // same MenuBar: every leaf, `run`, `disabled` and `checked` of THE CENSUS),
  // then Undo and Redo, Save, Brightness and BOM (T-CC1a F3: Account deleted). Its height is the
  // profile's, through the shell's `--studio-top`.
  // THE UX TURN, U1: Back to Joinery Core first, at the far left, before the
  // wordmark (it stood last, after BOM, since T-CC1b F1).
  if (studio) {
    return (
      <header
        data-studio="topbar"
        className={`studio-topbar studio-skin flex items-center min-w-0 ${LAYER_CLASS.chrome}`}
        style={{ height: 'var(--studio-top)' }}
      >
        {drawBackToJc()}
        <span className="h-5 w-px bg-shell-600 shrink-0" aria-hidden />
        {drawWordmark()}
        <span className="studio-pro-label shrink-0">PRO</span>
        <span className="h-5 w-px bg-shell-600 shrink-0" aria-hidden />
        <div className="studio-legacy-menu min-w-0">{drawMenuBar()}</div>
        <span className="flex-1" />
        {/* T-CC1b F1: the job block, to the right of the menus and apart from them. */}
        {drawJobBlock()}
        <StudioHistory />
        {drawSave()}
        {drawBrightness()}
        {drawBom()}
      </header>
    );
  }

  return (
    <header className={`h-12 shrink-0 bg-shell-900 border-b border-shell-600 flex items-center px-4 gap-3 ${LAYER_CLASS.chrome}`}>
      {drawWordmark()}

      <div className="h-5 w-px bg-shell-600" />

      {/* The ORDER is data (lib/topMenu.js), so the owner changing his mind
          about where Settings sits is one line there. */}
      {drawMenuBar()}

      <div className="h-5 w-px bg-shell-600" />

      {drawProjectName()}

      {/* The SAVE control (turn 20, CLAUDE.md F12.2). It has lived in File ▸
          Save since turn 4, where a joiner cannot see what it did; this is the
          same call with a face on it, beside the dirty dot that asks for it. */}
      {drawSave()}

      <div className="flex-1" />

      {/* ─── TURN 45 (CLAUDE.md F2 / iron rule 4): THE TOGGLE DIED HERE ─────
          T44 put a Factory/Retail switch in this bar. It is REMOVED by name:
          the head is now WHICH DOOR the app was opened through — the workshop
          app hardwires `factory`, the `/client` route hardwires `retail`
          (lib/appEntry.js) — so there is nothing for a hand in this bar to
          change, and no stray click that can show a client the CNC corner or
          take the workshop's fields away from a joiner. The tree and its one
          filter (lib/wizardTabs.js) are untouched. */}

      {/* ─── TURN 28 (CLAUDE.md F10): THE BRIGHTNESS, WHERE THE HAND IS ─────
          The View menu's slider gets a TWIN on the toolbar. Not a second
          setting — the SAME state and the same setter, and the same three
          numbers out of the same profile block, which is what R11 means here:
          one source, two controls. Moving either moves the other, because
          there is only one value.

          It is on the toolbar because it is the one lighting control a joiner
          reaches for while he is looking at the picture, and a control you
          have to open a menu to reach is a control you use once. Nothing else
          about the lighting changes. */}
      {drawBrightness()}

      {/* T-CC1a F3: the Account button is deleted; the session is Joinery Core's (*"oczywiscie do CC laczysz sie tylko przez JC"*). */}
      {drawBom()}
    </header>
  );
}

// ─── T84 F2 (CLAUDE.md PART A): UNDO AND REDO ON THE STUDIO TOP BAR ─────────
//
// *"then Undo and Redo (useHistoryStore, the same depth guards as the
// toolbar's)"*: the canvas toolbar's two buttons (CanvasToolbar.jsx), re-homed
// with the same store, the same lengths read as lengths (that file says why),
// the same guards and the same titles, a colon where the toolbar's Undo title
// carries a dash (nothing this turn writes carries one). A component of its
// own, so the legacy bar subscribes to nothing new.
function StudioHistory() {
  const undoDepth = useHistoryStore((s) => s.past.length);
  const redoDepth = useHistoryStore((s) => s.future.length);
  const undo = useHistoryStore((s) => s.undo);
  const redo = useHistoryStore((s) => s.redo);
  return (
    <>
      <button
        type="button"
        data-studio="topbar-undo"
        disabled={undoDepth === 0}
        className="cc-btn-ghost studio-icon-btn shrink-0"
        aria-label="Undo"
        title={undoDepth ? `Undo (Ctrl+Z): ${undoDepth} step${undoDepth === 1 ? '' : 's'} back` : 'Nothing to undo'}
        onClick={() => undo()}
      >
        <Icon name="undo" />
      </button>
      <button
        type="button"
        data-studio="topbar-redo"
        disabled={redoDepth === 0}
        className="cc-btn-ghost studio-icon-btn shrink-0"
        aria-label="Redo"
        title={redoDepth ? 'Redo (Ctrl+Y)' : 'Nothing to redo'}
        onClick={() => redo()}
      >
        <Icon name="redo" />
      </button>
    </>
  );
}
