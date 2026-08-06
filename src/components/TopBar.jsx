import { useState } from 'react';
import { useProjectStore } from '../stores/projectStore.js';
import { useUiStore } from '../stores/uiStore.js';
import { useCabinetProfileStore } from '../stores/cabinetProfileStore.js';
import MockModeBadge from './MockModeBadge.jsx';
import MenuBar from './MenuBar.jsx';
import { UNIT_CATEGORIES } from '../engine/types.js';
import { persistProject } from '../lib/persist.js';

// Frozen layout, SPEC section 7: logo in gold, project name, gold Export button.
// Turn 4 (BACKLOG #8) puts the classic menu bar in between: File · View ·
// Library · Settings · Database · Clients on the left, Account and Export
// staying on the right where they were.
export default function TopBar({ onExportCsv, onExportPdf, onExportDxfZip, onAuth }) {
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
  const toggleContourView = useUiStore((s) => s.toggleContourView);
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
        {
          label: 'Export',
          items: [
            { label: 'Cutting list CSV', run: onExportCsv },
            { label: 'Project PDF', run: onExportPdf },
            { label: 'Unit DXF (ZIP)', hint: 'Every cut part of the selected unit', run: onExportDxfZip },
            { divider: true },
            { label: 'Bill of materials…', hint: 'Live BOM, with the export buttons', run: () => setBomOpen(true) },
          ],
        },
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
        hint: c.soon ? 'Coming later' : `${c.types.length} type${c.types.length === 1 ? '' : 's'}`,
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
    { label: 'Database', soon: true, disabled: true, hint: 'JoineryCore data — a later phase' },
    { label: 'Clients', soon: true, disabled: true, hint: 'JoineryCore clients — a later phase' },
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

      <MenuBar menus={menus} />

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
