import { useUiStore } from '../stores/uiStore.js';
import { useHistoryStore } from '../stores/historyStore.js';

// ─── Canvas toolbar ───
// The controls that act on the DRAWING, sitting on the drawing (CLAUDE.md turn
// 3, phase 8): the dimensions switch, the BOM — moved here off the top bar —
// and the 3D | CNC toggle. The top bar keeps what acts on the PROJECT: its
// name, the account, the export.

export default function CanvasToolbar() {
  const viewMode = useUiStore((s) => s.viewMode);
  const setViewMode = useUiStore((s) => s.setViewMode);
  const showDimensions = useUiStore((s) => s.showDimensions);
  const toggleDimensions = useUiStore((s) => s.toggleDimensions);
  const bomOpen = useUiStore((s) => s.bomOpen);
  const setBomOpen = useUiStore((s) => s.setBomOpen);
  const showOutlines = useUiStore((s) => s.showOutlines);
  const toggleOutlines = useUiStore((s) => s.toggleOutlines);
  const contourView = useUiStore((s) => s.contourView);
  const xray = useUiStore((s) => s.xray);
  const toggleXray = useUiStore((s) => s.toggleXray);
  const rulerOn = useUiStore((s) => s.rulerOn);
  const toggleRuler = useUiStore((s) => s.toggleRuler);
  const hideFronts = useUiStore((s) => s.hideFronts);
  const toggleHideFronts = useUiStore((s) => s.toggleHideFronts);

  // ─── Undo / redo (turn 12, CLAUDE.md F9) ───
  // Read as LENGTHS rather than through the store's own `canUndo()`, because a
  // selector that calls a function returns a fresh answer every render and
  // zustand would re-render this bar on every frame of every drag.
  const undoDepth = useHistoryStore((s) => s.past.length);
  const redoDepth = useHistoryStore((s) => s.future.length);
  const undo = useHistoryStore((s) => s.undo);
  const redo = useHistoryStore((s) => s.redo);

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 bg-shell-800/95 border border-shell-600 rounded px-1.5 py-1 shadow-lg">
      {/* First on the bar, where a hand reaching for "no, not that" goes. */}
      <button
        type="button"
        data-undo="1"
        disabled={undoDepth === 0}
        className="px-2 py-1 text-xs rounded transition-colors text-ink-100 hover:bg-shell-700
          disabled:opacity-35 disabled:cursor-not-allowed"
        title={undoDepth ? `Undo (Ctrl+Z) — ${undoDepth} step${undoDepth === 1 ? '' : 's'} back` : 'Nothing to undo'}
        onClick={() => undo()}
      >
        ↶
      </button>
      <button
        type="button"
        data-redo="1"
        disabled={redoDepth === 0}
        className="px-2 py-1 text-xs rounded transition-colors text-ink-100 hover:bg-shell-700
          disabled:opacity-35 disabled:cursor-not-allowed"
        title={redoDepth ? 'Redo (Ctrl+Y)' : 'Nothing to redo'}
        onClick={() => redo()}
      >
        ↷
      </button>

      <span className="w-px h-4 bg-shell-600" />

      <button
        type="button"
        aria-pressed={showDimensions}
        // Disabled rather than hidden in CNC: the sheet carries its own
        // captions, and a control that disappears reads as a bug.
        disabled={viewMode !== '3d'}
        className={`px-2.5 py-1 text-xs rounded transition-colors disabled:opacity-35 disabled:cursor-not-allowed ${
          showDimensions && viewMode === '3d'
            ? 'bg-gold text-shell-900 font-medium'
            : 'text-ink-100 hover:bg-shell-700'}`}
        onClick={toggleDimensions}
        title={showDimensions ? 'Hide dimensions and distance arrows' : 'Show dimensions and distance arrows'}
      >
        {showDimensions ? 'Hide dimensions' : 'Show dimensions'}
      </button>

      <span className="w-px h-4 bg-shell-600" />

      {/* Thin black contours on every piece — ON by default. In contour view
          they ARE the drawing, so the switch says so rather than pretending it
          can turn them off. */}
      <button
        type="button"
        aria-pressed={showOutlines || contourView}
        disabled={viewMode !== '3d' || contourView}
        className={`px-2.5 py-1 text-xs rounded transition-colors disabled:cursor-not-allowed ${
          (showOutlines || contourView) && viewMode === '3d'
            ? 'bg-gold text-shell-900 font-medium disabled:opacity-60'
            : 'text-ink-100 hover:bg-shell-700 disabled:opacity-35'}`}
        onClick={toggleOutlines}
        title={contourView
          ? 'Contour view draws nothing but the outlines'
          : (showOutlines ? 'Hide the outlines' : 'Show the outlines')}
      >
        Outlines
      </button>

      {/* X-ray (turn 7, CLAUDE.md F3): the board goes translucent and the
          ironmongery appears. On the toolbar rather than only in the menu,
          because it is something you flick on and off while looking at a
          cabinet, not something you set up. */}
      <button
        type="button"
        aria-pressed={xray}
        disabled={viewMode !== '3d' || contourView}
        className={`px-2.5 py-1 text-xs rounded transition-colors disabled:opacity-35 disabled:cursor-not-allowed ${
          xray && viewMode === '3d'
            ? 'bg-gold text-shell-900 font-medium'
            : 'text-ink-100 hover:bg-shell-700'}`}
        onClick={toggleXray}
        title={contourView
          ? 'Contour view already draws nothing but the outlines'
          : 'See through the carcasses — hinges, runners and legs where they are fitted'}
      >
        X-ray
      </button>

      {/* ─── Turn 18 (CLAUDE.md F4 / BACKLOG W22): hide fronts ───
          Beside X-ray, because it answers the same question — "what is inside
          this?" — with the other half of the answer: X-ray looks THROUGH the
          board, this takes the doors and the drawer fronts off it.
          A LENS. Nothing in the BOM, the CNC, the cut list or the params
          changes; "Remove doors" is the one that edits the project, and it is
          in the right-click menu where a decision belongs. */}
      <button
        type="button"
        aria-pressed={hideFronts}
        data-hide-fronts="1"
        disabled={viewMode !== '3d'}
        className={`px-2.5 py-1 text-xs rounded transition-colors disabled:opacity-35 disabled:cursor-not-allowed ${
          hideFronts && viewMode === '3d'
            ? 'bg-gold text-shell-900 font-medium'
            : 'text-ink-100 hover:bg-shell-700'}`}
        onClick={toggleHideFronts}
        title={hideFronts
          ? 'Show the doors and drawer fronts again — nothing about the project changed'
          : 'Take the doors and drawer fronts off the picture — a way of LOOKING, not an edit'}
      >
        Hide fronts
      </button>

      {/* ─── Turn 17 (CLAUDE.md F11): the ruler ───
          Beside X-ray, because it is the same kind of thing: something you
          flick on, use, and flick off again while looking at a cabinet. It
          measures and it never edits — while it is on, a click takes a point
          instead of selecting anything, and Escape gives the canvas back. */}
      <button
        type="button"
        aria-pressed={rulerOn}
        data-ruler="1"
        disabled={viewMode !== '3d'}
        className={`px-2.5 py-1 text-xs rounded transition-colors disabled:opacity-35 disabled:cursor-not-allowed ${
          rulerOn && viewMode === '3d'
            ? 'bg-gold text-shell-900 font-medium'
            : 'text-ink-100 hover:bg-shell-700'}`}
        onClick={toggleRuler}
        title={rulerOn
          ? 'Measuring — click two points to read the distance. Escape clears, then closes.'
          : 'Measure between two points on the drawing'}
      >
        Measure
      </button>

      <span className="w-px h-4 bg-shell-600" />

      <button
        type="button"
        aria-pressed={bomOpen}
        className={`px-2.5 py-1 text-xs rounded transition-colors ${bomOpen
          ? 'bg-gold text-shell-900 font-medium'
          : 'text-ink-100 hover:bg-shell-700'}`}
        onClick={() => setBomOpen(!bomOpen)}
        title="Bill of materials"
      >
        BOM
      </button>

      <span className="w-px h-4 bg-shell-600" />

      {/* 3D | CNC — the same engine output, drawn two ways */}
      <div className="flex rounded border border-shell-600 overflow-hidden" role="group" aria-label="View mode">
        {[['3d', '3D'], ['cnc', 'CNC']].map(([mode, label]) => (
          <button
            key={mode}
            type="button"
            aria-pressed={viewMode === mode}
            className={`px-2.5 py-1 text-xs transition-colors ${viewMode === mode
              ? 'bg-gold text-shell-900 font-medium'
              : 'bg-shell-700 text-ink-100 hover:bg-shell-600'}`}
            onClick={() => setViewMode(mode)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
