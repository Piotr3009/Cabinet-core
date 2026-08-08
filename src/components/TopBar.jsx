import { useState } from 'react';
import { useProjectStore } from '../stores/projectStore.js';
import { useUiStore } from '../stores/uiStore.js';
import { useCabinetProfileStore } from '../stores/cabinetProfileStore.js';
import MockModeBadge from './MockModeBadge.jsx';
import MenuBar from './MenuBar.jsx';
import { UNIT_CATEGORIES } from '../engine/types.js';
import { buildOutputMenu } from '../lib/outputMenu.js';
import { buildDatabaseMenu, orderMenus } from '../lib/topMenu.js';
import { persistProject } from '../lib/persist.js';

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
export default function TopBar({
  onExportCsv, onExportPdf, onExportDxfZip, onRender, onDrawing, onAuth,
}) {
  const name = useProjectStore((s) => s.project.name);
  const project = useProjectStore((s) => s.project);
  const units = useProjectStore((s) => s.units);
  const dirty = useProjectStore((s) => s.dirty);
  const setProjectName = useProjectStore((s) => s.setProjectName);
  const markSaved = useProjectStore((s) => s.markSaved);

  const openModal = useUiStore((s) => s.openModal);
  const notify = useUiStore((s) => s.notify);
  const goToStart = useUiStore((s) => s.goToStart);
  const setLibraryCategory = useUiStore((s) => s.setLibraryCategory);
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
  const realisticLighting = useUiStore((s) => s.realisticLighting);
  const toggleRealisticLighting = useUiStore((s) => s.toggleRealisticLighting);
  const viewMode = useUiStore((s) => s.viewMode);
  const setViewMode = useUiStore((s) => s.setViewMode);
  const bomOpen = useUiStore((s) => s.bomOpen);
  const setBomOpen = useUiStore((s) => s.setBomOpen);
  const snapStep = useUiStore((s) => s.snapStep);
  const setSnapStep = useUiStore((s) => s.setSnapStep);
  const profile = useCabinetProfileStore((s) => s.profile);

  const [editing, setEditing] = useState(false);

  const save = async () => {
    const { project: saved, message, tone } = await persistProject({ project, units });
    markSaved(saved);
    notify(message, tone);
  };

  const menus = [
    {
      label: 'File',
      items: [
        { label: 'New project…', hint: 'Name it and set the room on the start screen', run: goToStart },
        { label: 'Open…', hint: 'Recent projects and everything saved', run: goToStart },
        { divider: true },
        { label: 'Save', hint: dirty ? 'Unsaved changes' : 'Up to date', run: save },
        { label: 'Save as…', run: () => openModal('save-as') },
        { divider: true },
        { label: 'Close project', run: goToStart },
      ],
    },
    {
      label: 'View',
      items: [
        { label: 'Outlines', checked: showOutlines || contourView, disabled: contourView, run: toggleOutlines },
        { label: 'Dimensions', checked: showDimensions, disabled: viewMode !== '3d' || contourView, run: toggleDimensions },
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
          label: 'Realistic lighting',
          hint: 'Environment reflections and contact shadows. Turn it off if the view feels heavy — a render is unaffected.',
          checked: realisticLighting,
          disabled: viewMode !== '3d',
          run: toggleRealisticLighting,
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
          label: 'Contour view',
          hint: 'Presentation mode — outlines only. Changes nothing in the BOM.',
          checked: contourView,
          disabled: viewMode !== '3d',
          run: toggleContourView,
        },
      ],
    },
    {
      label: 'Library',
      items: UNIT_CATEGORIES.map((c) => ({
        label: c.label,
        hint: c.soon
          ? 'Coming later'
          : (c.saved
            ? 'Units you have saved — right-click a unit to add one'
            : `${c.types.length} type${c.types.length === 1 ? '' : 's'}`),
        soon: c.soon,
        disabled: c.soon,
        run: () => setLibraryCategory(c.id),
      })),
    },
    {
      label: 'Settings',
      items: [
        { label: 'Design settings…', run: () => openModal('design') },
        { label: 'Room setup…', run: () => openModal('room') },
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
    // ─── Turn 11 (CLAUDE.md F7) ───
    // Database gains a dropdown of its own — Materials, Clients, Projects — and
    // absorbs the top-level "Clients" entry, which was a menu with nothing
    // behind it standing beside a menu with nothing behind it. Nothing is lost:
    // this is a reorder, not a cull.
    buildDatabaseMenu({
      // The one of the three that is real today. Design Settings is where the
      // assignment lives, so that is where the entry goes rather than to a
      // second screen that would have to be kept in step with it.
      onMaterials: () => openModal('design'),
    }),
    // BACKLOG #36 — the place in the menu, held open. What goes behind it
    // (finish per element, the list, m², the price) is still being designed with
    // Piotr; a button that opened a half-answer would be worse than one that
    // says "not yet".
    { label: 'Spraying', soon: true, disabled: true, hint: 'Spray finishing — a later phase' },
    // ── Output (turn 6, CLAUDE.md F1) ── built by lib/outputMenu.js, so its
    // shape is a thing a node test can look at rather than a thing inside a
    // component nobody mounts. Turn 11 moves it to the END of the bar (F7):
    // it is what LEAVES the app, and a joiner reaches for it last.
    buildOutputMenu({
      onRender,
      onDrawing,
      onExportDxf: onExportDxfZip,
      onExportCsv,
      onExportPdf,
      onOpenBom: () => setBomOpen(true),
    }),
  ];

  return (
    <header className="h-12 shrink-0 bg-shell-900 border-b border-shell-600 flex items-center px-4 gap-3 z-30">
      <button
        type="button"
        className="font-semibold tracking-[0.18em] text-gold text-sm select-none hover:text-gold-hover transition-colors"
        title="Back to the start screen"
        onClick={goToStart}
      >
        CABINET CORE
      </button>

      <div className="h-5 w-px bg-shell-600" />

      {/* The ORDER is data (lib/topMenu.js), so the owner changing his mind
          about where Settings sits is one line there. */}
      <MenuBar menus={orderMenus(menus)} />

      <div className="h-5 w-px bg-shell-600" />

      {editing ? (
        <input
          autoFocus
          className="cc-input max-w-[220px]"
          value={name}
          onChange={(e) => setProjectName(e.target.value)}
          onBlur={() => setEditing(false)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') setEditing(false); }}
        />
      ) : (
        <button type="button" className="text-sm text-ink-100 hover:text-gold transition-colors truncate max-w-[220px]" onClick={() => setEditing(true)} title="Rename project">
          {name}
          {dirty && <span className="ml-2 text-ink-400 text-xs">•</span>}
        </button>
      )}

      <MockModeBadge />

      <div className="flex-1" />

      <button type="button" className="cc-btn" onClick={onAuth}>Account</button>
      <button type="button" className="cc-btn-gold" onClick={() => setBomOpen(!bomOpen)}>Export</button>
    </header>
  );
}
