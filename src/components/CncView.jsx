import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useUiStore } from '../stores/uiStore.js';
import { useProjectStore } from '../stores/projectStore.js';
import { useCabinetProfileStore } from '../stores/cabinetProfileStore.js';
import { useMaterialAssignmentStore } from '../stores/materialAssignmentStore.js';
import { layoutPanels, sheetPolygon, sheetRect, toSheet } from '../engine/cnc/layout.js';
import { CNC_LAYERS, layerScreenColor } from '../engine/cnc/layers.js';
import { exportablePanels } from '../engine/cnc/groups.js';
import { CNC_VIEWS, groupByCabinet, groupByMaterial } from '../engine/cnc/views.js';
import { labelFit, symbolVisible } from '../engine/cnc/annotation.js';
import { panelLabelBlock } from '../engine/cnc/dxf.js';
import { useElementSize, useSheetView } from '../lib/sheetView.js';
import { partRollovers } from '../engine/cnc/rollover.js';
import { clampMenuPosition } from '../lib/menuPlacement.js';
import { formatMmPair } from '../engine/format.js';

// ─── CNC view ───
// The workshop's visual check before the machine — the job AutoCAD used to do.
// Laid out flat, drawn from the engine's own CNC geometry with one colour per
// layer. Read only: nothing here writes to the project, and nothing re-derives a
// dimension (CLAUDE.md task 1).
//
// ─── TURN 11 (CLAUDE.md F8): THE WHOLE PROJECT, AT ONCE ───
//
// It used to show ONE unit — the selected one — and a joiner checking a kitchen
// before sending it to the machine had to click through fourteen of them. It
// shows every unit now, each laid out as its own block with its number over it,
// stacked down the sheet the way a nesting program stacks them.
//
// WHICH of them are on the sheet is the checkbox tree, and the tree lives in
// the RIGHT PANEL (components/CncTree.jsx), which is the other half of F8: the
// panels stay open when you enter CNC, so the tool you need is the one that is
// already there. This file no longer carries an export panel at all.
//
// Readability beats beauty. Dark background and bright layer colours because
// that is what VCarve and AutoCAD look like on Piotr's screen; strokes are
// non-scaling so a 3 mm screw hole is still visible when the whole sheet fits.

const PADDING_MM = 120;
// The +/− buttons' own step. The WHEEL's is `lib/sheetView.js`'s, shared with
// the part detail so one notch means the same thing on both drawings.
const ZOOM_STEP = 1.25;
const MIN_VIEW_MM = 40;    // hard zoom-in limit: 40 mm across the viewport
const MAX_VIEW_MM = 60000; // hard zoom-out limit
// How far apart two SECTIONS stand, in layout gaps (turn 15, CLAUDE.md F9).
// Wider than the gap between two blocks inside a section, so a section boundary
// reads as one — which is the whole point of splitting the sheet up.
const SECTION_GAPS = 6;
// Clear space above the sheet for the SECTION CAPTIONS. They are drawn above
// the first block, so without it they sit at a negative y and the fit — which
// frames the sheet's own extents — crops the one line that says which board
// this is.
const HEADROOM_GAPS = 4;

export default function CncView() {
  const selectedUnitId = useUiStore((s) => s.selectedUnitId);
  const units = useProjectStore((s) => s.units);
  const unitResult = useProjectStore((s) => s.unitResult);
  const profile = useCabinetProfileStore((s) => s.profile);
  const hiddenUnits = useUiStore((s) => s.cncHiddenUnits);
  const hiddenParts = useUiStore((s) => s.cncHiddenParts);
  const view = useUiStore((s) => s.cncView);
  const setCncView = useUiStore((s) => s.setCncView);
  // Turn 19 (CLAUDE.md F4): double-click a part and the right-hand tree opens
  // on it. Pure navigation — the sheet itself does not change.
  const focusCncPart = useUiStore((s) => s.focusCncPart);
  const focus = useUiStore((s) => s.cncFocusPart);
  const materials = useMaterialAssignmentStore((s) => s.materials);
  // The PROJECT's own assignment is what a material section is (turn 16, F2) —
  // the carcass types, the front types and the four run-piece switches. The
  // purchasing table (the assignment store's role → board map) is a different
  // question and is no longer asked here.
  const storedDesign = useProjectStore((s) => s.project.design);

  const wrapRef = useRef(null);
  const svgRef = useRef(null);
  const [hidden, setHidden] = useState(() => new Set());
  // ─── Turn 20 (CLAUDE.md F7): the rollover ─────────────────────────────────
  // `{ readout, at:{x,y} }` — WHAT is under the pointer and WHERE the pointer
  // is, in client px. It is state and nothing else: no store, no project, no
  // export. Leaving the feature clears it, which is the second half of what
  // the owner asked for.
  const [rollover, setRollover] = useState(null);

  // ── what is on the sheet ──────────────────────────────────────────────────
  //
  // EVERY unit, each laid out as its own block and stacked down the sheet with a
  // gap between them (turn 11, CLAUDE.md F8.1). The layout inside a block is the
  // one the export uses — engine/cnc/layout.js, unchanged — so a block IS the
  // file that unit would produce, and the sheet is those files side by side.
  //
  // The ticks come from the store (components/CncTree.jsx, in the right panel):
  // a hidden UNIT contributes no block at all, and a hidden PART is simply not
  // in its block.
  // What each ticked unit contributes, before the view decides where it goes.
  const entries = useMemo(() => {
    const out = [];
    for (const unit of units) {
      if (hiddenUnits[unit.id]) continue;
      const result = unitResult(unit.id);
      if (!result) continue;
      const panels = exportablePanels(result.panels).filter((p) => !hiddenParts[unit.id]?.[p.id]);
      if (!panels.length) continue;
      out.push({ unit, result, panels });
    }
    return out;
  }, [units, unitResult, hiddenUnits, hiddenParts]);

  // ─── The two views (turn 15, CLAUDE.md F9) ──────────────────────────────
  //
  // Both produce the SAME shape — a list of SECTIONS, each a caption and a
  // stack of per-unit blocks — so there is one renderer below and not two, and
  // the checkbox tree, the pan, the zoom and the legend cannot behave one way
  // in one view and another way in the other (the turn-11 rule).
  //
  // A BLOCK is one unit's parts laid out by engine/cnc/layout.js — the same
  // function the export uses, untouched, which is what keeps a block equal to
  // the file that unit would produce. Drills stay with their own block, because
  // a panel id is only unique inside its own cabinet.
  const sections = useMemo(() => {
    if (view === 'cabinet') {
      const { cabinets, run } = groupByCabinet(entries);
      return [
        ...cabinets.map((e) => ({
          key: `cab:${e.unit.id}`,
          label: e.unit.params.unit_num,
          kind: 'cabinet',
          units: [e],
        })),
        // "infille i plinthy osobno" — the owner, in as many words. A plinth
        // belongs to the run, so it is not part of any one carcass's square.
        ...(run.length
          ? [{ key: 'run', label: 'Run parts', kind: 'run', units: run }]
          : []),
      ];
    }
    return groupByMaterial(entries, { design: storedDesign, profile, materials }).map((s2) => ({
      key: s2.key,
      label: s2.label,
      kind: 'material',
      assigned: s2.assigned,
      units: s2.units,
    }));
  }, [entries, view, storedDesign, profile, materials]);

  // ─── …and where each of them stands ─────────────────────────────────────
  // Sections run LEFT→RIGHT, which is what CLAUDE.md asks of the material view
  // ("the sheet area splits left→right into one section per assigned material")
  // and what makes the cabinet view a row of squares. Inside a section the
  // blocks stack downwards.
  const placed = useMemo(() => {
    const gap = profile.cnc.layoutGap;
    const out = [];
    let x = 0;
    for (const section of sections) {
      const blocks = [];
      let y = 0;
      let width = 0;
      for (const e of section.units) {
        const layout = layoutPanels(e.panels, e.result.drills, {
          gap, rowWidth: profile.cnc.layoutRowWidth,
        });
        blocks.push({
          unit: e.unit, result: e.result, layout, offsetY: y,
        });
        width = Math.max(width, layout.width);
        // One layout gap for the block's caption and two to keep two blocks
        // from reading as one nest.
        y += layout.height + gap * 3;
      }
      const height = Math.max(0, y - gap * 3);
      out.push({
        ...section, blocks, offsetX: x, offsetY: gap * HEADROOM_GAPS, width, height,
      });
      x += width + gap * SECTION_GAPS;
    }
    return out;
  }, [sections, profile.cnc.layoutGap, profile.cnc.layoutRowWidth]);

  const sheet = useMemo(() => {
    if (!placed.length) return null;
    const last = placed[placed.length - 1];
    return {
      width: last.offsetX + last.width,
      height: last.offsetY + Math.max(...placed.map((s2) => s2.height)),
    };
  }, [placed]);

  // Every block on the sheet, flattened — the legend counts over this and so
  // does the "n parts" caption.
  const blocks = useMemo(
    () => placed.flatMap((s2) => s2.blocks.map((b) => ({ ...b, section: s2 }))),
    [placed],
  );

  // ── viewport (turn 23, CLAUDE.md F7) ──────────────────────────────────────
  //
  // The wheel-zoom-about-the-cursor, the drag-to-pan and turn 20's capture-on
  // -MOVEMENT law used to live here, written out. F7 asks the PART DETAIL for
  // the same grammar, so it is `lib/sheetView.js` now and both surfaces stand
  // on it — one implementation, no possibility of the two behaving differently,
  // and turn 20's hard-won capture rule stated once.
  //
  // Nothing about the gesture changed. The two limits and the padding are still
  // this sheet's own, because a sheet holding a whole project zooms further out
  // than a single part does.
  const size = useElementSize(wrapRef);
  const content = useMemo(() => (sheet ? {
    x: -PADDING_MM,
    y: -PADDING_MM,
    w: sheet.width + PADDING_MM * 2,
    h: sheet.height + PADDING_MM * 2,
  } : null), [sheet]);
  const sheetView = useSheetView({
    svgRef,
    content,
    size,
    min: MIN_VIEW_MM,
    max: MAX_VIEW_MM,
    panThreshold: profile.cnc.annotation.panThresholdPx,
    // A label chasing the cursor across a sheet being dragged is noise, and F7
    // of turn 20 asks for a ROLLOVER.
    onPanStart: () => setRollover(null),
  });
  const {
    box, viewH, mmPerPx, zoomBy, panning,
  } = sheetView;


  // ── layers actually present, for the legend ───────────────────────────────
  // Counted over the parts actually on the SHEET — every unit's, since turn 11
  // — so the legend describes the picture rather than one cabinet: untick the
  // drawers everywhere and the drawer layers go.
  const layerCounts = useMemo(() => {
    const counts = new Map();
    const bump = (name, n = 1) => counts.set(name, (counts.get(name) || 0) + n);
    for (const s2 of blocks) {
      const onSheet = new Set(s2.layout.places.map((pl) => pl.panel.id));
      for (const place of s2.layout.places) {
        const p = place.panel;
        bump(p.cnc.layer || profile.puzzle.layers.outline);
        for (const pk of p.cnc?.pockets || []) bump(pk.layer);
        // Turn 13 (F8): the biscuit marks are a layer of their own, so the
        // legend has to count them or BISCUIT_4MM never appears in it.
        for (const mk of p.cnc?.marks || []) bump(mk.layer);
      }
      for (const d of s2.result.drills) if (onSheet.has(d.panel)) bump(d.layer);
    }
    return counts;
  }, [blocks, profile.puzzle.layers.outline]);

  const legend = CNC_LAYERS.filter((l) => layerCounts.has(l.name));
  const toggle = (name) => setHidden((prev) => {
    const next = new Set(prev);
    if (next.has(name)) next.delete(name); else next.add(name);
    return next;
  });
  const visible = (name) => !hidden.has(name);

  // ── empty state ───────────────────────────────────────────────────────────
  if (!units.length) {
    return <Empty text="Add a unit from the Library, then switch to CNC." />;
  }

  const partCount = blocks.reduce((n, s2) => n + s2.layout.places.length, 0);
  // ─── Turn 16 (CLAUDE.md F3): the lettering is part of the DRAWING ────────
  // Sheet millimetres from the profile, NOT pixels converted at the current
  // zoom — which is what made every caption grow as the drawing shrank. The
  // only screen-space numbers left are the two thresholds under which a thing
  // is hidden rather than drawn on top of its neighbour.
  const A = profile.cnc.annotation;

  return (
    <div ref={wrapRef} className="absolute inset-0 bg-[#131313] overflow-hidden select-none">
      {box && sheet && (
        <svg
          ref={svgRef}
          className="w-full h-full touch-none"
          style={{ cursor: panning ? 'grabbing' : 'grab' }}
          viewBox={`${box.x} ${box.y} ${box.w} ${viewH}`}
          {...sheetView.handlers}
        >
          {placed.map((s2) => (
            // One group per SECTION, moved across the sheet by its offset, and
            // one group per BLOCK inside it. A block is exactly the layout that
            // unit would export (turn 11, CLAUDE.md F8.1); what turn 15 changes
            // is only which blocks stand together and where.
            <g key={s2.key} transform={`translate(${s2.offsetX} ${s2.offsetY})`} data-cnc-section={s2.key}>
              {/* The square a cabinet sits in (F9.2). Drawn for the material
                  sections too, because a section boundary a joiner cannot see
                  is the same complaint as the settings panel's. */}
              <rect
                x={-profile.cnc.layoutGap}
                y={-profile.cnc.layoutGap * 2.6}
                width={s2.width + profile.cnc.layoutGap * 2}
                height={s2.height + profile.cnc.layoutGap * 3.6}
                fill="none"
                stroke={s2.kind === 'run' ? '#7a6a3a' : '#3a3a3a'}
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
              {/* The SECTION header: which board this is, as the BOM names it
                  (F2.1). It may run the width of its own section and no
                  further — a header that overprints the section beside it is
                  the same complaint as a part code that does. */}
              <Caption
                x={0}
                y={-profile.cnc.layoutGap * 3.2}
                text={s2.label}
                tail={`  ${s2.blocks.reduce((n, b) => n + b.layout.places.length, 0)} parts`}
                sizeMm={A.sectionLabelMm}
                boxW={s2.width + profile.cnc.layoutGap * 2}
                mmPerPx={mmPerPx}
                minPx={A.minLabelPx}
                fill="#e0b64a"
              />
              {s2.blocks.map((b) => (
                <g key={b.unit.id} transform={`translate(0 ${b.offsetY})`}>
                  <Caption
                    x={0}
                    y={-profile.cnc.layoutGap}
                    text={b.unit.params.unit_num}
                    tail={`  ${b.layout.places.length} parts`}
                    sizeMm={A.blockLabelMm}
                    boxW={Math.max(b.layout.width, profile.cnc.layoutGap * 4)}
                    mmPerPx={mmPerPx}
                    minPx={A.minLabelPx}
                    fill={b.unit.id === selectedUnitId ? '#e0b64a' : '#9a9a92'}
                  />
                  {b.layout.places.map((place) => (
                    <Part
                      // Turn 23 (F9.3): how many hand changes this part
                      // carries, straight off the result the sheet is drawn
                      // from — one thin step after the engine, one answer.
                      handEdits={b.result.handEdits?.byPanel?.[place.panel.id]?.count || 0}
                      key={place.panel.id}
                      place={place}
                      unitNum={b.unit.params.unit_num}
                      drills={b.result.drills}
                      outlineLayer={profile.puzzle.layers.outline}
                      annotation={A}
                      profile={profile}
                      mmPerPx={mmPerPx}
                      visible={visible}
                      lit={focus?.unitId === b.unit.id && focus?.panelId === place.panel.id}
                      onOpenInTree={() => focusCncPart(b.unit.id, place.panel.id)}
                      onRollover={setRollover}
                      rollover={rollover}
                    />
                  ))}
                </g>
              ))}
            </g>
          ))}
        </svg>
      )}

      {!sheet && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-sm text-ink-400">
            Nothing on the sheet — tick a unit in the panel on the right.
          </p>
        </div>
      )}

      {/* ─── Turn 20 (CLAUDE.md F7): the rollover ─────────────────────────────
          Presentation only. Every number in it came out of
          engine/cnc/rollover.js, which reads the same records the DXF is
          written from — so the sheet after a thousand hovers is byte-for-byte
          the sheet before, and there is no second opinion in this app about how
          deep a groove is. */}
      {rollover?.readout && <Rollover at={rollover.at} readout={rollover.readout} wrap={wrapRef.current} />}

      {/* toolbar */}
      <div className="absolute top-3 left-3 flex items-center gap-2 bg-shell-800/95 border border-shell-600 rounded px-2 py-1.5">
        <span className="text-xs text-gold uppercase tracking-wide">CNC</span>
        <span className="text-[11px] text-ink-400 tabular-nums">
          {entries.length} of {units.length} units · {partCount} parts
        </span>
        <span className="w-px h-4 bg-shell-600" />
        {/* ─── The toggle (turn 15, CLAUDE.md F9.3) ───
            Visible, not hidden in a menu: it is the question the sheet answers,
            and a workshop switches between the two several times in a job. The
            Library and the right-hand panel stay exactly where they are through
            it — the turn-11 rule — because this changes what the SHEET shows and
            nothing else. */}
        <div className="flex rounded border border-shell-600 overflow-hidden" role="group" aria-label="CNC view">
          {CNC_VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              data-cnc-view={v.id}
              aria-pressed={view === v.id}
              title={v.hint}
              className={`px-2 py-1 text-[11px] transition-colors ${view === v.id
                ? 'bg-gold text-shell-900'
                : 'text-ink-200 hover:bg-shell-700'}`}
              onClick={() => setCncView(v.id)}
            >
              {v.label}
            </button>
          ))}
        </div>
        <span className="w-px h-4 bg-shell-600" />
        <button type="button" className="cc-btn-ghost" title="Zoom out" onClick={() => zoomBy(ZOOM_STEP)}>−</button>
        <button type="button" className="cc-btn-ghost" title="Zoom in" onClick={() => zoomBy(1 / ZOOM_STEP)}>+</button>
        <button type="button" className="cc-btn-ghost" title="Fit the whole sheet" onClick={sheetView.fit}>Fit</button>
      </div>

      {/* layer legend — click a row to hide that layer */}
      <div className="absolute bottom-3 left-3 bg-shell-800/95 border border-shell-600 rounded p-2 max-w-[230px]">
        <div className="text-[11px] uppercase tracking-wide text-ink-400 mb-1.5">Layers</div>
        <ul className="space-y-0.5">
          {legend.map((l) => (
            <li key={l.name}>
              <button
                type="button"
                className={`w-full flex items-center gap-2 text-left px-1 py-0.5 rounded hover:bg-shell-700 ${visible(l.name) ? '' : 'opacity-40'}`}
                onClick={() => toggle(l.name)}
                title={`${l.name} — click to ${visible(l.name) ? 'hide' : 'show'}`}
              >
                <span className="w-3 h-3 rounded-sm shrink-0 border border-black/40" style={{ background: l.screen }} />
                <span className="text-[11px] text-ink-100 flex-1 truncate">{l.name}</span>
                <span className="text-[10px] text-ink-400 tabular-nums">{layerCounts.get(l.name)}</span>
              </button>
            </li>
          ))}
        </ul>
        <p className="text-[10px] text-ink-400 mt-1.5 leading-snug">
          Preview only. Drag to pan, scroll to zoom.
        </p>
      </div>
    </div>
  );
}

// ─── one caption, in the drawing's units (turn 16, CLAUDE.md F3) ───────────
//
// One component for every piece of text on the sheet, so there is one answer to
// "how big, and does it fit" and not four. The arithmetic is
// engine/cnc/annotation.js, which is where a node test can reach it.
function Caption({
  x, y, text, tail = '', sizeMm, boxW, mmPerPx, minPx, fill, anchor = 'start',
}) {
  const fitted = labelFit({
    text: `${text}${tail}`, sizeMm, boxW, mmPerPx, minPx, fit: 'truncate',
  });
  if (!fitted.visible) return null;
  // The tail (" 8 parts") is dropped first when the room runs out: the NAME is
  // what a joiner is looking for.
  const keepsTail = fitted.text.length >= `${text}${tail}`.length;
  return (
    <text
      x={x}
      y={y}
      fontSize={fitted.size}
      fill={fill}
      textAnchor={anchor}
      style={{ fontFamily: 'ui-monospace, Menlo, Consolas, monospace' }}
    >
      {keepsTail ? text : fitted.text}
      {keepsTail && tail ? <tspan fill="#6f6f68">{tail}</tspan> : null}
    </text>
  );
}

// ─── one cut part ───

function Part({
  place, unitNum, drills, outlineLayer, annotation, profile, mmPerPx, visible,
  lit = false, onOpenInTree = null, onRollover = null, rollover = null, handEdits = 0,
}) {
  const { panel } = place;
  const cnc = panel.cnc || {};
  const holes = drills.filter((d) => d.panel === panel.id);
  const oLayer = cnc.layer || outlineLayer;

  // ─── Turn 20 (CLAUDE.md F7): WHAT EACH FEATURE IS ─────────────────────────
  // One pure call per part (engine/cnc/rollover.js), keyed the way
  // `partMachinings` has keyed features since turn 14 — `pocket-0`, `mark-2`,
  // `hole-11` — so the tooltip and the part-detail window name the same cut by
  // the same id. Memoised on the part and its drills: hovering builds nothing.
  const readouts = useMemo(
    () => new Map(partRollovers(panel, drills, profile).map((f) => [f.id, f.readout])),
    [panel, drills, profile],
  );
  // The hover handlers, made once per feature id rather than per render of it.
  const hoverProps = (id) => (onRollover ? {
    onPointerEnter: (e) => onRollover({
      key: `${panel.id}:${id}`, readout: readouts.get(id), at: { x: e.clientX, y: e.clientY },
    }),
    onPointerMove: (e) => onRollover((prev) => (prev?.key === `${panel.id}:${id}`
      ? { ...prev, at: { x: e.clientX, y: e.clientY } }
      : prev)),
    onPointerLeave: () => onRollover((prev) => (prev?.key === `${panel.id}:${id}` ? null : prev)),
    style: { cursor: 'crosshair' },
  } : {});
  const hovered = (id) => rollover?.key === `${panel.id}:${id}`;
  // ─── F7.4: the hit target survives the zoom ───────────────────────────────
  // "the hover zone is the drawn symbol or the feature's real extent, whichever
  // is larger on screen". A ⌀5 hole at sheet zoom is two pixels across, and a
  // rollover you have to hunt for is not one — so an INVISIBLE, stroke-free
  // shape sits over the symbol at `hoverGracePx` on screen where the symbol is
  // smaller than that. It draws nothing: `fill` is transparent and the drawn
  // symbol underneath is untouched, so the picture is the picture it was.
  const graceMm = (annotation.hoverGracePx || 0) * mmPerPx;

  // ─── Turn 16 (CLAUDE.md F3) ───
  // The caption is a fixed height in SHEET millimetres, shrunk to fit the part
  // it belongs to and drawn INSIDE its outline. Two parts side by side can
  // therefore never overprint each other's label at any zoom, and a caption
  // that would be too small to read is hidden rather than drawn.
  // ─── Turn 17 (CLAUDE.md F1) ───
  // The cabinet's number, the part code and the cut size — `F-01 BUR 597x568` —
  // and it is the EXPORT's own formatter (engine/cnc/partLabel.js), not a second
  // wording that happens to look similar. F1.1 asks for exactly that, and it is
  // why the sheet now spells the size with an ASCII `x`: this string is written
  // into a DXF R12 file as well as onto the glass.
  // ─── Turn 18 (CLAUDE.md F1.1) ───
  // …and it is laid out by the EXPORT's own layout call now, with the part's
  // own rectangle as the box — `panelLabelBlock` in engine/cnc/dxf.js, which is
  // the one function F1.1 asks for. The block breaks onto up to three centred
  // lines and sits in the middle of the part, both ways; the file writes the
  // same words at half the height. The sheet cannot word a label differently
  // from the board any more, because it no longer computes one.
  const label = panelLabelBlock(panel, {
    unitNum, profile, mmPerPx, minPx: annotation.minLabelPx,
  });
  // The part's own centre, in sheet coordinates — via `toSheet`, so a part laid
  // down TURNED carries its caption round with it exactly as the file does.
  const box = {
    w: Math.abs(panel.cnc?.drawn_w ?? panel.w),
    h: Math.abs(panel.cnc?.drawn_h ?? panel.h),
  };
  const [labelX, labelY] = toSheet(place, box.w / 2, box.h / 2);
  const labelTurn = place.bounds.turn || 0;
  // Drilling and machining marks are the drawing's own geometry now — a ⌀5 hole
  // is five millimetres wide at every zoom, never the screen-space minimum turn
  // 11 gave it. Under the threshold it is not drawn at all, which is what stops
  // thirty-six of them merging into one grey smudge over a part they have grown
  // bigger than.
  const showSymbol = (sizeMm) => symbolVisible(sizeMm, mmPerPx, annotation.minSymbolPx);

  return (
    // ─── Turn 19 (CLAUDE.md F4) ───
    // "Kliknięcie 2 razy na dany element zabiera nas do listy po prawej."
    // The gesture is on the whole part rather than on its outline alone, so
    // double-clicking the middle of a door works as well as double-clicking its
    // edge; the outline carries a faint fill and is therefore what the pointer
    // actually lands on. Nothing here edits, ticks or rotates anything — it is
    // navigation, and the sheet looks exactly the same afterwards apart from
    // the part being lit.
    <g
      data-cnc-part={panel.id}
      data-hand-edited={handEdits ? String(handEdits) : undefined}
      onDoubleClick={onOpenInTree || undefined}
      style={onOpenInTree ? { cursor: 'pointer' } : undefined}
    >
      {/* ─── TURN 23 (CLAUDE.md F9.3): THE BADGE, ON THE SHEET ──────────────
          "The edited part wears a small badge in the detail and on the sheet."
          A part somebody has drawn on by hand is not the part the kit cuts, and
          the one place that must never be a surprise is the sheet a joiner
          takes to the machine. Gold, like every "you did this" signal in the
          app, and drawn in SHEET millimetres so it is the same size at every
          zoom — the turn-16 lettering rule. */}
      {handEdits > 0 && (
        <text
          x={toSheet(place, box.w / 2, box.h)[0]}
          y={toSheet(place, box.w / 2, box.h)[1] - annotation.blockLabelMm * 0.4}
          fill="#e0b64a"
          fontSize={annotation.blockLabelMm}
          textAnchor="middle"
          style={{ fontFamily: 'ui-monospace, Menlo, Consolas, monospace' }}
        >
          {`✎ ${handEdits}`}
        </text>
      )}
      {visible(oLayer) && cnc.outline?.length >= 2 && (
        <polygon
          points={sheetPolygon(place, cnc.outline)}
          fill={lit ? 'rgba(224,182,74,0.14)' : 'rgba(255,255,255,0.035)'}
          stroke={lit ? '#e0b64a' : layerScreenColor(oLayer)}
          strokeWidth={lit ? 2.4 : 1.4}
          vectorEffect="non-scaling-stroke"
        />
      )}

      {(cnc.pockets || []).filter((p) => visible(p.layer)).map((p, i) => {
        const r = sheetRect(place, p);
        if (!showSymbol(Math.max(r.w, r.h))) return null;
        const id = `pocket-${(cnc.pockets || []).indexOf(p)}`;
        // The grace box is centred on the drawn rectangle and only ever grows
        // it, so a groove that is already big enough is hovered on itself.
        const gw = Math.max(r.w, graceMm);
        const gh = Math.max(r.h, graceMm);
        return (
          <g key={`p${i}`}>
            <rect
              x={r.x} y={r.y} width={r.w} height={r.h}
              fill="none" stroke={layerScreenColor(p.layer)}
              strokeWidth={hovered(id) ? 2.4 : 1} vectorEffect="non-scaling-stroke"
            />
            <rect
              x={r.x - (gw - r.w) / 2} y={r.y - (gh - r.h) / 2} width={gw} height={gh}
              fill="transparent" stroke="none" data-cnc-feature={id}
              {...hoverProps(id)}
            />
          </g>
        );
      })}

      {/* ─── Turn 13 (CLAUDE.md F8): the biscuit marks ───
          Drawn as the LINE the cutter runs, because that is what it is: an
          in-and-out pass, not a pocket and not a hole. Thicker than a pocket
          outline so a 70 mm mark reads at sheet zoom, where it is the only
          thing in a set that has any length. */}
      {(cnc.marks || []).filter((m) => visible(m.layer)).map((m, i) => {
        const [x1, y1] = toSheet(place, m.from[0], m.from[1]);
        const [x2, y2] = toSheet(place, m.to[0], m.to[1]);
        const id = `mark-${(cnc.marks || []).indexOf(m)}`;
        return (
          <g key={`m${i}`}>
            <line
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={layerScreenColor(m.layer)} strokeWidth={hovered(id) ? 4 : 2} strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
            {/* A line has no area to point at: the grace is its stroke width. */}
            <line
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="transparent" strokeWidth={Math.max(graceMm, 2 * mmPerPx)} strokeLinecap="round"
              data-cnc-feature={id}
              {...hoverProps(id)}
            />
          </g>
        );
      })}

      {holes.filter((h) => visible(h.layer)).map((h, i) => {
        const [cx, cy] = toSheet(place, h.x, h.y);
        if (!showSymbol(h.d)) return null;
        // `partMachinings` numbers the holes over the part's OWN drills in the
        // unit's order, which is exactly this list — so the index IS the id.
        const id = `hole-${holes.indexOf(h)}`;
        return (
          <g key={`h${i}`}>
            <circle
              cx={cx} cy={cy} r={h.d / 2}
              fill="none" stroke={layerScreenColor(h.layer)}
              strokeWidth={hovered(id) ? 2.6 : 1} vectorEffect="non-scaling-stroke"
            />
            <circle
              cx={cx} cy={cy} r={Math.max(h.d / 2, graceMm / 2)}
              fill="transparent" stroke="none" data-cnc-feature={id}
              {...hoverProps(id)}
            />
          </g>
        );
      })}

      {/* id + the cut-list dimensions, so the sheet reads like the CSV — INSIDE
          the part's own outline (F3), at a fixed size in sheet millimetres, and
          centred in it both ways on up to three lines (turn 18, F1.1).
          `dy` comes out of the layout positive UP, which is the drawing's frame;
          an SVG viewport is y-DOWN, so it is subtracted. A turned part turns its
          caption with it — the file has done that since turn 17 and the sheet
          had not, which is exactly the kind of disagreement F1.1 is about. */}
      {label.visible && (
        <text
          x={labelX} y={labelY} textAnchor="middle"
          fontSize={label.size} fill="#d6d6d2"
          data-part-label={panel.id}
          transform={labelTurn ? `rotate(${-labelTurn} ${labelX} ${labelY})` : undefined}
          style={{ fontFamily: 'ui-monospace, Menlo, Consolas, monospace' }}
        >
          {label.lines.map((line) => (
            <tspan
              key={line.text + line.dy}
              x={labelX}
              y={labelY - line.dy}
              dominantBaseline="central"
            >
              {line.text}
            </tspan>
          ))}
        </text>
      )}
    </g>
  );
}

// ─── the rollover (turn 20, CLAUDE.md F7) ───────────────────────────────────
//
// Beside the cursor, clamped to the viewport, and NEVER over the feature it
// describes — which is `clampMenuPosition`'s job and it has known how to do it
// since turn 11 (F7.3 says so in as many words). The offset is what keeps the
// panel off the cut: the arithmetic clamps a box placed at the cursor, and the
// box starts a cursor's width down and to the right of it.
const ROLLOVER_OFFSET = { x: 16, y: 18 };

function Rollover({ at, readout, wrap }) {
  const ref = useRef(null);
  const [size, setSize] = useState({ width: 220, height: 120 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.width && (r.width !== size.width || r.height !== size.height)) {
      setSize({ width: r.width, height: r.height });
    }
  }, [readout, size.width, size.height]);

  // The CNC view fills its own wrapper, and the tooltip is positioned inside
  // it, so the clamp works in the wrapper's coordinates and a sheet in a
  // half-width panel does not put labels over the right-hand tree.
  const rect = wrap?.getBoundingClientRect?.() || { left: 0, top: 0, width: 0, height: 0 };
  const placed = clampMenuPosition({
    x: at.x - rect.left + ROLLOVER_OFFSET.x,
    y: at.y - rect.top + ROLLOVER_OFFSET.y,
    width: size.width,
    height: size.height,
    viewport: { width: rect.width, height: rect.height },
    margin: 8,
  });

  return (
    <div
      ref={ref}
      data-cnc-rollover="1"
      className="absolute z-20 pointer-events-none bg-shell-800/97 border border-shell-600 rounded px-2 py-1.5 shadow-lg max-w-[260px]"
      style={{ left: placed.left, top: placed.top }}
    >
      <div className="text-[11px] text-gold uppercase tracking-wide" data-rollover-title="1">{readout.title}</div>
      <div className="text-[10px] text-ink-400 mb-1">{readout.subtitle}</div>
      <dl className="space-y-0.5">
        {readout.rows.map((row) => (
          <div key={row.label} className="flex items-baseline gap-2">
            <dt className="text-[10px] text-ink-400 w-[86px] shrink-0">{row.label}</dt>
            <dd className="text-[11px] text-ink-100 tabular-nums" data-rollover-value={row.label}>{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Empty({ text, children }) {
  return (
    <div className="absolute inset-0 bg-[#131313] flex flex-col items-center justify-center">
      <p className="text-sm text-ink-400">{text}</p>
      {children}
    </div>
  );
}
