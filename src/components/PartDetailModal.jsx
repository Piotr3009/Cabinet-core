import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import Modal from './Modal.jsx';
import { MovingPanel } from '../3d/UnitView.jsx';
import EditorRig from '../3d/EditorRig.jsx';
import { mm } from '../3d/constants.js';
import { outlineFor, surfaceFor } from '../3d/materials.js';
import { useUiStore } from '../stores/uiStore.js';
import { useProjectStore } from '../stores/projectStore.js';
import { useCabinetProfileStore } from '../stores/cabinetProfileStore.js';
import { projectSheen, resolveFinishes, resolveUnitDesign } from '../engine/design.js';
import { panelFinish } from '../engine/materials.js';
import { joineryLayers as resolveJoineryLayers } from '../engine/joinery.js';
import { elementLabel } from '../engine/elements.js';
import { partDetailDrawing } from '../engine/drawings/partDetail.js';
import { drawingLayer } from '../engine/drawings/layers.js';
import { CNC_LAYERS } from '../engine/cnc/layers.js';
import { editCount, partFeatures } from '../engine/partEdits.js';
import NumberField from './NumberField.jsx';
import { formatMm, formatMmPair } from '../engine/format.js';
import {
  dimensionSet, dimensionStyle, featureDimensionRows, hoverHolds,
} from '../engine/dimensionArrows.js';
import { useElementSize, useSheetView } from '../lib/sheetView.js';
import useContextGuard from '../3d/contextGuard.jsx';
// ─── TURN 24 (CLAUDE.md F2): THE PENCIL LEARNS TO DRAW ──────────────────────
import {
  SNAP_KINDS, drawingDimensionRows, placeByNumber, snapAt, snapGeometry,
} from '../engine/partSnap.js';
import { usePartSnapStore } from '../stores/partSnapStore.js';
import { LAYER_CLASS } from '../lib/modalLayer.js';

// ─── The element DETAIL window (turn 14, CLAUDE.md F7) ──────────────────────
//
// Double-click a part in the exploded cabinet and this opens: the piece on the
// left, in the hand; the piece on the right, as the machine will cut it.
//
// It is the answer to the question a joiner asks holding a panel — "what is
// THAT hole for?" — and until now the only place to ask it was the CNC sheet,
// which shows forty parts at once and cannot tell you what any one of them is.
//
// THREE THINGS ABOUT IT ARE THE PHASE.
//
//   IT SHOWS ONE PIECE (F7.1). The left half is the room's own `MovingPanel`,
//   with the room's own machined geometry — a socket is a socket here because
//   it is the same extrusion the scene draws — orbiting on its own centre. It
//   is not a second renderer.
//
//   THE DRAWING IS THE DRAWING (F7.2/F7.4). The outline, every path on it, a
//   LAYER LEGEND with the names and colours from `cnc/layers.js`, and the
//   overall dimensions with the delicate extension lines a draughtsman leaves.
//   Those dimensions are turn 7's `dimensionEntities`, unchanged and imported,
//   because CLAUDE.md says not to fork a second drawing engine and because a
//   dimension drawn twice is a dimension drawn two ways.
//
//   IT ANSWERS (F7.3). Hovering a machining lights it and prints its NOTE —
//   what it is, how big, and where on the part. The overall dimensions never
//   go away, whatever is being hovered, because they are the two numbers the
//   piece is ordered by.

const PAD = 0.14;   // margin round the drawing, as a fraction of its long side
// Turn 23 (CLAUDE.md F7): the zoom's own limits, in the part's millimetres —
// 10 mm across the window is a ⌀5 hole filling it, and 5 m is any part in the
// app lost in the middle. The main sheet's are wider because it holds a whole
// project; a part is a part.
const MIN_VIEW_MM = 10;
const MAX_VIEW_MM = 5000;

//   ─── TURN 23 (CLAUDE.md F1): AND THERE IS A WAY BACK ───
//
//   This window used to REPLACE the cabinet editor that opened it — one modal
//   slot, overwritten — so the only door out was ×, which threw away the
//   explode, the camera and the selection a joiner had set up to get here. It
//   is a level on a STACK now: ← Back beside the title, Escape for the same
//   thing, and the cabinet comes back exactly as it was left. Not a line of
//   history lives in this file; the shell owns all of it.

export default function PartDetailModal() {
  const args = useUiStore((s) => s.modalArgs);
  const closeModal = useUiStore((s) => s.closeModal);
  const popModal = useUiStore((s) => s.popModal);
  const canBack = useUiStore((s) => s.modalStack.length > 0);
  const notify = useUiStore((s) => s.notify);
  const units = useProjectStore((s) => s.units);
  const unitResult = useProjectStore((s) => s.unitResult);
  const storedDesign = useProjectStore((s) => s.project.design);
  const addPartEdit = useProjectStore((s) => s.addPartEdit);
  const clearPartEdits = useProjectStore((s) => s.clearPartEdits);
  const undoPartEdit = useProjectStore((s) => s.undoPartEdit);
  const profile = useCabinetProfileStore((s) => s.profile);
  const [hovered, setHovered] = useState(null);
  // ─── TURN 24 (CLAUDE.md F2): THE PENCIL LEARNS TO DRAW ───────────────────
  //
  // Turn 23's MECHANICS survive untouched — `partEdits` on the project, the
  // engine blind by construction, the badge, Back to computed, the recompute
  // prompt, the exports carrying the edits. What died is the INTERACTION: four
  // buttons and eight number fields is a FORM, and a joiner marking out a board
  // does not fill in a form. This is the approved mock, transcribed.
  //
  //   SELECT · DRILL · LINE · DOWEL LINE, and a layer picker (F2.1)
  //   the tools draw with the MOUSE, on osnap markers (F2.3)
  //   live blue H/V dimensions while drawing (F2.4)
  //   a typed number is an IN-FLIGHT OVERRIDE, never a form (F2.5)
  //   the drill asks ⌀ and depth ONCE, then stamps (F2.6)
  const [tool, setTool] = useState('select');
  // ─── TURN 26 (CLAUDE.md F12.1): THE LAYER IS ASKED ONCE ──────────────────
  //
  // "The layer list moves OFF the toolbar; the layer is asked ONCE, before the
  // edits are committed."
  //
  // It was a permanent dropdown a joiner had to set before he drew, which is
  // the FORM this editor was rebuilt to stop being — and it is the wrong moment
  // besides: which layer a set of holes goes on is a decision about the SET,
  // and the set does not exist until it has been drawn. So `null` is "nobody
  // has said", the first op to be committed opens the question, and the answer
  // stands for the rest of the session exactly as the drill's ⌀ and depth do
  // (F2.6). The same grammar, one storey up.
  const [layer, setLayer] = useState(null);
  // The op waiting on that answer, if the question is open.
  const [askLayer, setAskLayer] = useState(null);
  const [picked, setPicked] = useState(null);   // the feature the Select tool holds
  const [pending, setPending] = useState(null); // the first click of a two-click tool
  // ⌀ and depth, asked ONCE per session (F2.6). `null` = not asked yet.
  const [drillSpec, setDrillSpec] = useState(null);
  const [askDrill, setAskDrill] = useState(null);   // { at, d, depth } while the popover is up
  const [pitch, setPitch] = useState(null);
  // Where the cursor is, in the PART's own millimetres, and where it is on
  // screen — the second is only so the floating number sits under the hand.
  const [cursor, setCursor] = useState(null);
  // The in-flight number (F2.5). `null` = nothing typed; a string = the entry
  // is open and this is what is in it.
  const [typed, setTyped] = useState(null);
  const [typedSecond, setTypedSecond] = useState(null);

  const snapsOn = usePartSnapStore((s) => s.enabled);
  const toggleSnap = usePartSnapStore((s) => s.toggle);
  const setAllSnaps = usePartSnapStore((s) => s.setAll);

  const unit = units.find((u) => u.id === args?.unitId) || null;
  const result = unit ? unitResult(unit.id) : null;
  const panel = result?.panels.find((p) => p.id === args?.panelId) || null;

  const drawing = useMemo(
    () => (panel ? partDetailDrawing(panel, { drills: result?.drills || [], profile }) : null),
    [panel, result, profile],
  );
  // The stable ids of everything on this part, in the SAME order the drawing
  // lists its machinings — so the id the SVG hovers and the id an override
  // names are two views of one walk (engine/partEdits.js).
  const features = useMemo(
    () => (panel ? partFeatures(panel, result?.drills || []) : []),
    [panel, result],
  );
  const edits = unit?.params?.part_edits?.[panel?.id] || null;
  const changes = editCount(edits);

  // What a hole on THIS layer is, until somebody says otherwise (F2.6): the
  // layer IS the convention in this app — `SCREWS_3MM` is a ⌀3 — so picking the
  // layer has already answered most of what the popover asks.
  const layerDefaults = profile.editor.drillDefaults[layer] || profile.editor.drillDefaults.fallback;
  // (With no layer chosen yet the fallback answers, and the popover's numbers
  //  are typed over anyway — the question about the LAYER comes after.)
  const dowelPitch = Number(pitch) > 0 ? Number(pitch) : profile.editor.dowelPitchMm;

  /** Back to Select, with nothing half-drawn left behind (F2.1: Esc). */
  const disarm = useCallback(() => {
    setTool('select');
    setPending(null);
    setTyped(null);
    setTypedSecond(null);
    setAskDrill(null);
  }, []);

  const armTool = (id) => {
    setTool(id);
    setPending(null);
    setTyped(null);
    setTypedSecond(null);
    setPicked(null);
  };

  const addOp = useCallback((op) => {
    if (!unit || !panel) return;
    // F12.1: the ONE gate. An op that names no layer yet is held and the
    // question is asked — once, for the whole session — and `commitOnLayer`
    // below is what lets it through afterwards.
    if (!layer) { setAskLayer(op); return; }
    addPartEdit(unit.id, panel.id, { ...op, layer });
    notify('Added by hand — this print only.', 'ok');
  }, [unit, panel, layer, addPartEdit, notify]);

  /** The answer, and the edit that was waiting for it. */
  const commitOnLayer = useCallback((chosen) => {
    const op = askLayer;
    setLayer(chosen);
    setAskLayer(null);
    if (!op || !unit || !panel) return;
    addPartEdit(unit.id, panel.id, { ...op, layer: chosen });
    notify(`Added by hand on ${chosen} — this print only.`, 'ok');
  }, [askLayer, unit, panel, addPartEdit, notify]);

  /**
   * PLACE A POINT — the one door every gesture goes through.
   *
   * A click on the drawing, and a typed number's Enter, arrive here with the
   * same thing: a point in the part's own millimetres. Which is the whole shape
   * of F2.5 — the number is an OVERRIDE of where the mouse is, not a second way
   * of doing the same job.
   */
  const placePoint = useCallback((at) => {
    if (!at) return;
    // A QUESTION ON SCREEN IS ANSWERED BEFORE THE NEXT POINT IS TAKEN (turn 24).
    // The popover is already holding a placed point and asking what size hole
    // goes in it. A click on the sheet behind it used to replace that point
    // silently, so the answer arrived about a hole nobody had asked for — the
    // failure the acceptance walk caught when the box moved out from under the
    // Stamp button. The runaway is fixed where `screen` is declared; this is
    // the belt to that brace, and it is the right rule anyway.
    if (askDrill) return;
    if (tool === 'drill') {
      // F2.6: asked ONCE per session, on the FIRST placement, then it stamps.
      if (!drillSpec) {
        setAskDrill({ at, d: layerDefaults.d, depth: layerDefaults.depth });
        return;
      }
      addOp({
        op: 'drill', layer, x: at.x, y: at.y, d: drillSpec.d, depth: drillSpec.depth,
      });
      return;
    }
    if (tool === 'line' || tool === 'dowels') {
      if (!pending) { setPending(at); return; }
      if (tool === 'line') {
        addOp({ op: 'line', layer, from: [pending.x, pending.y], to: [at.x, at.y] });
      } else {
        addOp({
          op: 'dowels',
          layer,
          from: [pending.x, pending.y],
          to: [at.x, at.y],
          pitch: dowelPitch,
          d: drillSpec?.d ?? layerDefaults.d,
          depth: drillSpec?.depth ?? layerDefaults.depth,
        });
      }
      setPending(null);
    }
  }, [tool, drillSpec, askDrill, layer, layerDefaults, pending, dowelPitch, addOp]);

  const deletePicked = useCallback(() => {
    if (!picked || !unit || !panel || !drawing) return;
    // The DRAWING's id and the OVERRIDE's id are the same walk in the same
    // order, so the nth machining is the nth feature.
    const at = drawing.machinings.findIndex((m) => m.id === picked);
    const feature = features[at];
    if (!feature) return;
    addPartEdit(unit.id, panel.id, { op: 'hide', feature: feature.fid });
    setPicked(null);
    notify('Removed from this print.', 'ok');
  }, [picked, unit, panel, drawing, features, addPartEdit, notify]);

  // ─── THE KEYBOARD (F2.1 / F2.2 / F2.5) ───────────────────────────────────
  //
  // Esc returns to Select — or, with a number in flight, cancels the ENTRY and
  // not the tool. Delete removes the selected feature. A DIGIT with a tool
  // armed opens the floating input, which is the whole of SketchUp's grammar:
  // you do not click a field, you just start typing.
  const size = drawing ? drawing.size : null;
  useEffect(() => {
    const onKey = (e) => {
      if (e.target?.tagName === 'INPUT' || e.target?.tagName === 'SELECT') {
        if (e.key !== 'Escape') return;
      }
      if (e.key === 'Escape') {
        // `stopImmediatePropagation`, not `stopPropagation`: the shell's own
        // Escape-is-Back listener is on the SAME target (window), and stopping
        // the bubble does not stop a sibling listener. This one is registered
        // FIRST — a child's effect runs before its parent's — so disarming the
        // tool consumes the key and the Back stack never sees it. Escape with
        // nothing armed falls through, which is what makes it still mean Back.
        if (typed !== null) { e.stopImmediatePropagation(); setTyped(null); setTypedSecond(null); return; }
        if (tool !== 'select' || pending) { e.stopImmediatePropagation(); disarm(); }
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (typed !== null) return;             // the input handles its own
        if (tool === 'select' && picked) { e.preventDefault(); deletePicked(); }
        return;
      }
      if (tool === 'select' || !size) return;
      if (/^[0-9]$/.test(e.key) || (e.key === '.' && typed !== null)) {
        e.preventDefault();
        setTyped((was) => (was === null ? e.key : was + e.key));
      }
    };
    // CAPTURE, and this is the line that makes Esc mean what F2.1 says it
    // means. The shell's own Escape-is-Back listener is on the same target and
    // is registered FIRST — a child's effect runs before its parent's, and the
    // shell is this component's child. A bubble-phase listener could never get
    // in front of it; a capture-phase one runs before every bubble listener on
    // the window, and stopping there consumes the key. With nothing armed this
    // handler does not stop anything, so Escape still means Back.
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [tool, picked, pending, typed, size, disarm, deletePicked]);

  /** Enter, on the floating input: the point goes where the NUMBER says (F2.5). */
  const commitTyped = () => {
    if (typed === null || !size) return;
    const at = placeByNumber({
      at: pending || cursor || { x: 0, y: 0 },
      value: typed,
      second: typedSecond,
      size: { w: size.w, h: size.h },
    });
    setTyped(null);
    setTypedSecond(null);
    if (at) placePoint({ x: at.x, y: at.y });
  };

  if (!unit || !panel || !drawing) return null;

  const note = drawing.machinings.find((m) => m.id === hovered)?.note || null;

  return (
    <Modal
      name="part-detail"
      anchor={args?.anchor || null}
      title={(
        <span className="flex items-center gap-2">
          <span>{`${unit.params.unit_num} · ${elementLabel(panel) || panel.part} — ${panel.id}`}</span>
          {/* ─── TURN 23 (CLAUDE.md F9.3): THE BADGE ─────────────────────────
              "The edited part wears a small badge (edited by hand · 3
              changes)." Here and on the sheet, so a part that has been drawn
              on says so wherever it is looked at. */}
          {changes > 0 && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded border border-gold text-gold"
              data-hand-edited={String(changes)}
              title="This print carries manual edits. The next cabinet of this kit is stock."
            >
              ✎ edited by hand · {changes} change{changes === 1 ? '' : 's'}
            </span>
          )}
        </span>
      )}
      onClose={closeModal}
      onBack={canBack ? popModal : null}
      backLabel="cabinet"
      width="w-[720px]"
      // The editor window's own exception to rule 15 (turn 13, F2.1): this is a
      // workspace — two views side by side — and not a side dialog.
      maximised
      footer={(
        <>
          {/* ─── TURN 23 (CLAUDE.md F8.1): THE CAPTION GOES AWAY ───────────
              Owner: "the corner caption is not what he asked for." What a
              hovered feature IS still belongs in words — a ⌀35 cup and a ⌀35
              pocket are the same circle — but WHERE it is, which is what the
              caption was mostly spending its room on, is drawn now. The
              turn-20 sheet tooltip stays where it is: different surface,
              different job. */}
          <span className="text-[11px] text-ink-400 flex-1 text-left" data-part-note="1">
            {note || 'Hover a hole, a pocket or a mark — it dimensions itself. Wheel to zoom, drag to pan, double-click to fit.'}
          </span>
          <button type="button" className="cc-btn-gold" onClick={closeModal}>Done</button>
        </>
      )}
    >
      {/* ─── TURN 26 (CLAUDE.md F12.3): 25 % VIEW, 75 % SHEET ────────────────
          "Panel split: the 3-D view shrinks to ~25 %, the sheet takes ~75 %."
          The two panes were `flex-1` each — half and half — and the half a
          joiner is actually working on is the SHEET: the view of the piece is
          there to say WHICH board this is, and the drawing is what he is
          drilling. The fractions are CSS variables so the pair is one decision
          in one place, and they fall back to the stacked column on a narrow
          window exactly as before. */}
      <div
        className="h-full min-h-0 flex gap-3 flex-col md:flex-row"
        data-editor-split="25/75"
        style={{ '--cc-editor-view': '25%', '--cc-editor-sheet': '75%' }}
      >
        {/* ── LEFT: the piece itself (F7.1) ── */}
        <div
          className="rounded border border-shell-600 overflow-hidden min-w-0 min-h-[240px] basis-full md:basis-[var(--cc-editor-view)] md:shrink-0 md:grow-0"
          data-part-canvas="1"
          style={{ background: profile.appearance.room?.background || '#fafaf8' }}
        >
          <PartCanvas unit={unit} panel={panel} design={storedDesign} profile={profile} drills={result?.drills || []} />
        </div>

        {/* ── RIGHT: the CNC drawing (F7.2) — and it takes three quarters ── */}
        <div className="min-w-0 flex flex-col gap-2 basis-full md:basis-[var(--cc-editor-sheet)] md:grow">
          <div
            className="flex-1 min-h-[240px] rounded border border-shell-600 bg-[#131313] overflow-hidden"
            data-part-drawing="1"
          >
            <PartDrawing
              drawing={drawing}
              hovered={hovered}
              onHover={setHovered}
              profile={profile}
              picked={picked}
              onPickFeature={(id) => (tool === 'select'
                ? setPicked((was) => (was === id ? null : id))
                : null)}
              // ─── TURN 24 (CLAUDE.md F2): the drawing is the drawing BOARD ──
              tool={tool}
              snapsOn={snapsOn}
              cursor={cursor}
              onCursor={setCursor}
              pending={pending}
              onPlace={placePoint}
              typed={typed}
              onTypedChange={setTyped}
              onTypedSecond={setTypedSecond}
              onTypedCommit={commitTyped}
              onTypedCancel={() => { setTyped(null); setTypedSecond(null); }}
              drillPopover={askDrill}
              onDrillPopover={setAskDrill}
              onDrillConfirm={(spec) => {
                setDrillSpec(spec);
                const at = askDrill?.at;
                setAskDrill(null);
                if (at) {
                  addOp({
                    op: 'drill', layer, x: at.x, y: at.y, d: spec.d, depth: spec.depth,
                  });
                }
              }}
            />
          </div>

          <div className="flex items-start gap-3">
            <div className="text-[11px] text-ink-400 flex-1">
              <div className="text-ink-100">
                {formatMmPair(panel.w, panel.h, ' × ')} · {formatMm(panel.thickness)} mm
              </div>
              {/* ─── TURN 23 (CLAUDE.md F9.4): THE ORIENTATION ──────────────
                  "The detail shows the part exactly as the CNC sheet lays it,
                  along the grain, no rotation for editing." It does, and it
                  always did: this drawing is `panel.cnc.drawn_w × drawn_h`,
                  which is the very rectangle `cnc/layout.js` places on the
                  sheet. What was missing was SAYING so — the old note read
                  "nested turned on the sheet", which invites a joiner to
                  wonder which way round he is looking. */}
              <div data-part-orientation={drawing.size.rotated ? 'turned' : 'upright'}>
                drawn as the sheet lays it{drawing.size.rotated ? ' — turned, along the grain' : ''}
              </div>
              {panel.meta?.material_label ? <div>{panel.meta.material_label}</div> : null}
            </div>

            {/* The LEGEND (F7.2): the names and the colours from cnc/layers.js,
                and only the layers this part actually carries. */}
            <ul className="space-y-0.5 min-w-[150px]" data-part-legend="1">
              {drawing.legend.map((l) => (
                <li key={l.name}>
                  <button
                    type="button"
                    data-legend-layer={l.name}
                    className={`w-full flex items-center gap-2 px-1 py-0.5 rounded text-left hover:bg-shell-700 ${
                      hovered && drawing.machinings.find((m) => m.id === hovered)?.layer === l.name ? 'bg-shell-700' : ''}`}
                    onPointerEnter={() => {
                      const first = drawing.machinings.find((m) => m.layer === l.name);
                      if (first) setHovered(first.id);
                    }}
                    onPointerLeave={() => setHovered(null)}
                  >
                    <span className="w-3 h-3 rounded-sm shrink-0 border border-black/40" style={{ background: l.colour }} />
                    <span className="text-[11px] text-ink-100 flex-1 truncate">{l.name}</span>
                    <span className="text-[10px] text-ink-400 tabular-nums">{l.count}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* ─── TURN 24 (CLAUDE.md F2): THE TOOLBAR, AS DRAWN ─────────────
              Select · Drill · Line · Dowel line. Esc goes back to Select.
              Every one of them writes an OVERRIDE on this project's own part —
              never the engine, never the kit, and never the next cabinet.

              ─── TURN 28 (CLAUDE.md F11): AND NO LAYER LIST ─────────────────
              "Turn 26 F12 was asked to remove it and did not." It was half
              removed: turn 26 turned the permanent dropdown into a question
              asked once — which is the right grammar — and then rendered the
              question INSIDE this box, so a list of every CNC layer in the app
              still opened on the toolbar. It is a strip of its own now, below
              the tools, and this box carries the four tools and the actions on
              what is drawn. Nothing else on it moved (R12). */}
          <div className="border border-shell-600 rounded p-2 space-y-2" data-part-tools="1">
            <div className="cc-row">
              {[
                ['select', 'Select'],
                ['drill', 'Drill'],
                ['line', 'Line'],
                ['dowels', 'Dowel line'],
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={`cc-btn px-2 ${tool === id ? 'border-gold text-gold' : ''}`}
                  data-part-tool={id}
                  data-tool-armed={tool === id ? '1' : undefined}
                  onClick={() => (id === 'select' ? disarm() : armTool(id))}
                >
                  {label}
                </button>
              ))}
              <span className="flex-1" />
              {changes > 0 && (
                <>
                  <button
                    type="button" className="cc-btn-ghost"
                    data-part-undo="1"
                    title="Undo the last change on this part"
                    onClick={() => undoPartEdit(unit.id, panel.id)}
                  >
                    Undo
                  </button>
                  <button
                    type="button" className="cc-btn px-2"
                    data-back-to-computed="1"
                    title="Drop every manual change on this part and go back to what the engine computed"
                    onClick={() => {
                      clearPartEdits(unit.id, panel.id);
                      setPicked(null);
                      notify('Back to computed — this part is stock again.', 'ok');
                    }}
                  >
                    Back to computed
                  </button>
                </>
              )}
            </div>

            <div className="cc-row">
              <span className="text-[11px] text-ink-400 flex-1" data-part-prompt="1">
                {tool === 'select'
                  ? (picked
                    ? 'Delete removes it from this print.'
                    : 'Click a hole, a pocket or a mark to select it — Delete takes it off this print.')
                  : (tool === 'drill'
                    ? 'Click to stamp a hole. Type a number to place it off the nearest edge; Esc cancels the number, Esc again the tool.'
                    : `Click ${pending ? 'the END' : 'the START'}. Type a number to place it off the nearest edge; Esc cancels.`)}
              </span>
              {layer && (
                <span
                  className="text-[11px] text-ink-400 shrink-0"
                  data-part-layer-chosen={layer}
                  title="The layer this session is drawing on — asked once, when the first edit was committed"
                >
                  on {layer}
                </span>
              )}
              {tool === 'select' && (
                <button
                  type="button"
                  className="cc-btn px-2"
                  data-delete-feature="1"
                  disabled={!picked}
                  title={picked ? 'Take this feature off this print' : 'Click a feature in the drawing first'}
                  onClick={deletePicked}
                >
                  Delete
                </button>
              )}
              {tool === 'dowels' && (
                <>
                  <span className="text-[11px] text-ink-400">pitch</span>
                  <NumberField
                    className="cc-input w-20 text-right"
                    data-part-pitch="1"
                    value={dowelPitch}
                    onCommit={(v) => setPitch(v)}
                  />
                </>
              )}
              {drillSpec && (
                <button
                  type="button"
                  className="cc-btn-ghost px-2"
                  data-part-drill-spec="1"
                  title="Change the diameter and depth this session stamps"
                  onClick={() => setDrillSpec(null)}
                >
                  ⌀{formatMm(drillSpec.d)} · {drillSpec.depth > 0 ? `${formatMm(drillSpec.depth)} deep` : 'through'}
                </button>
              )}
            </div>

            {/* ─── F2.3: THE SNAP PANEL, UNDER THE SHEET ─────────────────────
                Eight checkboxes, one per osnap kind, persisted per user. The
                markers are AutoCAD's own and so is the priority on conflict —
                CEN/END > MID > INT > PER > NEA. */}
            <div className="cc-row flex-wrap gap-x-3 gap-y-1" data-snap-panel="1">
              <span className="text-[11px] uppercase tracking-wide text-ink-400">Snap</span>
              {SNAP_KINDS.map((k) => (
                <label key={k.id} className="flex items-center gap-1 text-[11px] text-ink-300" title={k.label}>
                  <input
                    type="checkbox"
                    data-snap-kind={k.id}
                    checked={snapsOn[k.id] !== false}
                    onChange={() => toggleSnap(k.id)}
                  />
                  <SnapGlyph marker={k.marker} />
                  {k.id}
                </label>
              ))}
              <button type="button" className="cc-btn-ghost px-1 text-[11px]" data-snap-all="1" onClick={() => setAllSnaps(true)}>all</button>
              <button type="button" className="cc-btn-ghost px-1 text-[11px]" data-snap-none="1" onClick={() => setAllSnaps(false)}>none</button>
            </div>
          </div>
          {/* ─── TURN 26 (CLAUDE.md F12.1): WHICH LAYER SHOULD THESE GO ON? ──
              Asked ONCE, at the moment the first edit is committed, and never
              again for the rest of the session — the same grammar the drill's
              ⌀-and-depth popover has used since turn 24, one storey up. The
              list is the EXISTING one (`cnc/layers.js`); custom layers are
              parked by the owner's word, with three questions on file.

              It is a strip and not a modal: a dialog over the drawing would
              hide the very thing the joiner has just drawn on it. */}
          {askLayer && (
            <div className="cc-row items-center" data-layer-ask="1">
              <span className="text-[11px] text-ink-100 shrink-0" data-layer-ask-prompt="1">
                Which layer should these go on?
              </span>
              <select
                className="cc-input w-48"
                data-layer-ask-list="1"
                defaultValue="SCREWS_3MM"
                aria-label="Which layer should these go on?"
                onChange={(e) => commitOnLayer(e.target.value)}
              >
                {CNC_LAYERS.map((l) => (
                  <option key={l.name} value={l.name}>{l.name}</option>
                ))}
              </select>
              <button
                type="button"
                className="cc-btn-gold px-3"
                data-layer-ask-ok="1"
                onClick={() => commitOnLayer(
                  document.querySelector('[data-layer-ask-list="1"]')?.value || 'SCREWS_3MM',
                )}
              >
                Use it
              </button>
              <button
                type="button"
                className="cc-btn-ghost"
                data-layer-ask-cancel="1"
                title="Drop this edit — nothing is committed"
                onClick={() => setAskLayer(null)}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

/**
 * The drawing. Entities in, SVG out — and every machining is its own DOM node,
 * which is what makes F7.3's hover possible at all.
 *
 * ─── TURN 23 (CLAUDE.md F7): IT ZOOMS ──────────────────────────────────────
 *
 * Owner: "the part preview in the editor detail is fixed." Wheel zooms about
 * the cursor, drag pans, double-click or the ⌂ fits — and the grammar is the
 * MAIN CNC SHEET's, extracted to `lib/sheetView.js` and consumed by both, so
 * there is no possibility of the two behaving differently. Turn 20's capture-on
 * -MOVEMENT law comes with it: nothing is captured on a press, so a click still
 * reaches the feature under it.
 *
 * NOTHING ABOUT THE DRAWING CHANGES (F7.2). It is presentation: the same
 * entities, in the same frame, seen through a different window.
 */
function PartDrawing({
  drawing, hovered, onHover, profile, picked = null, onPickFeature = null,
  tool = 'select', snapsOn = null, cursor = null, onCursor = null, pending = null,
  onPlace = null, typed = null, onTypedChange = null, onTypedSecond = null,
  onTypedCommit = null, onTypedCancel = null,
  drillPopover = null, onDrillPopover = null, onDrillConfirm = null,
}) {
  const { size } = drawing;
  const svgRef = useRef(null);
  const wrapRef = useRef(null);
  // Where the hand LAST was on SCREEN — only so the floating number and the
  // drill popover sit under it. Nothing geometric is ever measured in pixels.
  //
  // ─── AND IT IS NEVER CLEARED (turn 24, found by the acceptance walk) ──────
  //
  // It used to be nulled on `pointerleave`, and that made the drill popover
  // run away from the hand that reached for it: the popover is a sibling of
  // the SVG, so moving the cursor ONTO it is moving the cursor OFF the sheet,
  // the anchor went null, and the box jumped to the default corner — under a
  // pointer that was already on its way to a Stamp button no longer there.
  // The click then landed on the DRAWING behind it and, with the drill armed,
  // quietly re-pointed the hole the popover was still asking about. A joiner
  // would have answered a question about a hole and got one somewhere else.
  //
  // A floating box is anchored to where the gesture happened, and a gesture
  // that has finished does not move. So the last position stands until the
  // next one replaces it.
  const [screen, setScreen] = useState(null);
  const pad = Math.max(size.w, size.h) * PAD + drawing.dimensionOffset;
  // The drawing's own frame has y UP (every engine drawing does); SVG has y
  // down, so the whole picture is flipped once by the group below rather than
  // every entity being written backwards. The VIEW therefore works in the
  // flipped frame, which is what `lib/sheetView.js` speaks.
  const content = useMemo(() => ({
    x: -pad, y: -size.h - pad, w: size.w + pad * 2, h: size.h + pad * 2,
  }), [pad, size.w, size.h]);
  const px = useElementSize(wrapRef);
  const view = useSheetView({
    svgRef,
    content,
    size: px,
    min: MIN_VIEW_MM,
    max: MAX_VIEW_MM,
    panThreshold: profile.cnc.annotation.panThresholdPx,
    // A dimension chasing the cursor across a drawing being dragged is noise.
    onPanStart: () => onHover(null),
  });
  const dimInk = drawingLayer('DIMENSIONS').colour;
  const outlineColour = drawing.legend.find((l) => l.name === drawing.outlineLayer)?.colour || '#f0ece4';
  const lit = (id) => hovered === id;
  const drawingMode = tool !== 'select';

  // ─── TURN 24 (CLAUDE.md F2.3): THE OSNAP ─────────────────────────────────
  //
  // The geometry a snap can be taken on is derived ONCE per drawing; the point
  // the cursor has caught is resolved per move, against the checkbox panel and
  // against the ONE magnet radius in `profile.editor.partSnap.magnetMm`.
  const geometry = useMemo(() => snapGeometry(drawing), [drawing]);
  const magnetMm = profile.editor.partSnap.magnetMm;
  const snap = useMemo(() => (drawingMode && cursor
    ? snapAt({
      geometry, cursor, enabled: snapsOn || undefined, magnetMm,
    })
    : null), [drawingMode, cursor, geometry, snapsOn, magnetMm]);
  // Where a click actually lands: the snapped point where one was caught, the
  // raw cursor otherwise. AutoCAD's contract exactly — the marker is a promise.
  const target = snap ? { x: snap.x, y: snap.y } : cursor;

  // ─── TURN 23 (CLAUDE.md F8.1): THE HOVER IS A DRAWING ────────────────────
  //
  // "…hovering a drill/pocket/feature draws dimension arrows from the feature
  // to the part's nearest edges and to the nearest neighbouring feature —
  // extension lines, arrowheads, the value on the line, formatMm." The corner
  // caption turn 22 put in the footer is gone; this is what replaces it.
  const style = useMemo(() => dimensionStyle(profile), [profile]);
  const arrows = useMemo(() => {
    if (!hovered) return [];
    const centreOf = (m) => (m.kind === 'pocket'
      ? { x: m.x + m.w / 2, y: m.y + m.h / 2 }
      : (m.kind === 'mark'
        ? { x: (m.from[0] + m.to[0]) / 2, y: (m.from[1] + m.to[1]) / 2 }
        : { x: m.x, y: m.y }));
    const me = drawing.machinings.find((m) => m.id === hovered);
    if (!me) return [];
    return dimensionSet(featureDimensionRows({
      feature: centreOf(me),
      size: { w: size.w, h: size.h },
      others: drawing.machinings.filter((m) => m.id !== hovered).map((m) => ({ id: m.id, ...centreOf(m) })),
      style,
    }), style);
  }, [hovered, drawing.machinings, size.w, size.h, style]);

  // ─── F2.4: LIVE DIMENSIONS WHILE DRAWING ─────────────────────────────────
  // "Thin blue arrows from the cursor to the nearest edges/features —
  // HORIZONTAL and VERTICAL ONLY, never diagonal — same profile style block as
  // turn 23's F8 arrows. They are the read-out; there is no form."
  const liveDims = useMemo(() => {
    if (!drawingMode || !target) return [];
    const centreOf = (m) => (m.kind === 'pocket'
      ? { x: m.x + m.w / 2, y: m.y + m.h / 2 }
      : (m.kind === 'mark'
        ? { x: (m.from[0] + m.to[0]) / 2, y: (m.from[1] + m.to[1]) / 2 }
        : { x: m.x, y: m.y }));
    return dimensionSet(drawingDimensionRows({
      at: target,
      size: { w: size.w, h: size.h },
      features: drawing.machinings.map((m) => ({ id: m.id, ...centreOf(m) })),
      alignMm: profile.editor.partSnap.alignMm,
    }), style);
  }, [drawingMode, target, drawing.machinings, size.w, size.h, style, profile]);

  const viewBox = view.box
    ? `${view.box.x} ${view.box.y} ${view.box.w} ${view.viewH}`
    : `${content.x} ${content.y} ${content.w} ${content.h}`;

  return (
    <div ref={wrapRef} className="w-full h-full relative">
      <button
        type="button"
        className={`absolute right-1 top-1 ${LAYER_CLASS.inPanel} cc-btn-ghost text-[11px] px-1.5 py-0.5`}
        data-part-fit="1"
        title="Fit the part to the window (or double-click the drawing)"
        onClick={view.fit}
      >
        ⌂
      </button>
      <svg
        ref={svgRef}
        className="w-full h-full"
        style={{
          cursor: view.panning ? 'grabbing' : (drawingMode ? 'crosshair' : 'default'),
          touchAction: 'none',
        }}
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        onDoubleClick={view.fit}
        {...view.handlers}
        // ─── TURN 24 (CLAUDE.md F2.3): THE CURSOR CARRIES THE SNAP ──────────
        // Every move re-asks where the point a joiner MEANS is. The pan's own
        // handler runs first (spread above); this only reads.
        onPointerMove={(e) => {
          view.handlers.onPointerMove?.(e);
          const at = view.pointerToWorld(e.clientX, e.clientY);
          const rect = wrapRef.current?.getBoundingClientRect();
          setScreen(rect ? { x: e.clientX - rect.left, y: e.clientY - rect.top } : null);
          const here = at ? { x: at.x, y: -at.y } : null;
          onCursor?.(here);
          // ─── TURN 24 (CLAUDE.md F10.1): THE MAGNET ──────────────────────
          // The hovered set fades only when the cursor leaves the feature's
          // own magnet radius — never on the twitch that takes it off a
          // hairline stroke.
          if (hovered && !hoverHolds({
            cursor: here, box: featureBox(drawing, hovered), magnetMm: style.hoverMagnetMm,
          })) onHover(null);
        }}
        onPointerLeave={(e) => {
          view.handlers.onPointerLeave?.(e);
          onCursor?.(null);
          onHover(null);
          // `screen` is deliberately left alone — see the note where it is
          // declared. The CURSOR is gone (no snap, no live dimensions); the
          // last place the hand was is still the right place for a box that
          // is already open.
        }}
        // ─── TURN 23 (CLAUDE.md F9.1) / TURN 24 (F2.3): the point goes down ─
        // It is a click and not a drag: turn 20's capture law means the pan
        // never swallowed it, and `lastGesturePanned` is what tells the two
        // apart after the fact — releasing a pan must not drill a hole. What
        // lands is the SNAPPED point where the marker showed one, which is the
        // whole contract of an osnap.
        onClick={(e) => {
          if (view.lastGesturePanned()) return;
          if (!drawingMode || !onPlace) return;
          const at = view.pointerToWorld(e.clientX, e.clientY);
          if (!at) return;
          const raw = { x: at.x, y: -at.y };
          const caught = snapAt({
            geometry, cursor: raw, enabled: snapsOn || undefined, magnetMm,
          });
          onPlace(caught ? { x: caught.x, y: caught.y } : raw);
        }}
      >
        <g transform="scale(1 -1)">
        {drawing.outline.length >= 2 && (
          <polygon
            points={drawing.outline.map(([x, y]) => `${x},${y}`).join(' ')}
            fill="rgba(255,255,255,0.04)"
            stroke={outlineColour}
            strokeWidth={1.4}
            vectorEffect="non-scaling-stroke"
          />
        )}

        {drawing.machinings.map((m) => {
          const colour = drawing.legend.find((l) => l.name === m.layer)?.colour || '#c0c0c0';
          const common = {
            stroke: colour,
            fill: 'none',
            strokeWidth: lit(m.id) ? 3 : 1.2,
            vectorEffect: 'non-scaling-stroke',
            opacity: hovered && !lit(m.id) ? 0.35 : 1,
            // The drawn symbol carries the LOOK; the grace shape below carries
            // the POINTER, so a feature is never both invisible and clickable.
            pointerEvents: 'none',
            'data-machining': m.id,
            ...(picked === m.id ? { 'data-picked': '1', strokeWidth: 3.4, stroke: '#e0b64a' } : {}),
          };
          // ─── TURN 23 (F8.1 / F9.1): THE HIT ZONE SURVIVES THE ZOOM ────────
          // The sheet learnt this in turn 20 (F7.4, `hoverGracePx`) and the
          // detail needs it for the same reason: a ⌀3 hole drawn `fill: none`
          // is a HAIRLINE, and with the whole part in the window its stroke is
          // under a pixel wide. Hovering it is then a matter of luck, and
          // clicking it to delete it is worse than luck. So an invisible shape
          // sits over every feature at no less than the profile's grace in
          // SCREEN pixels, and it is the one thing the pointer talks to.
          const grace = (profile.cnc.annotation.hoverGracePx || 8) * view.mmPerPx;
          const hit = {
            fill: 'transparent',
            stroke: 'none',
            style: { cursor: 'pointer' },
            onPointerEnter: () => onHover(m.id),
            // ─── TURN 24 (CLAUDE.md F10.1): THE ARROWS HOLD ──────────────────
            // Once shown, the set STAYS while the cursor is within
            // `hoverDimensions.hoverMagnetMm` of the feature — which is decided
            // on every MOVE below, against the feature's own box, rather than
            // by this hairline shape's own leave event. Turn 23 tied it to the
            // leave and the arrows vanished at a pixel's twitch.
            onPointerLeave: () => {},
            // Turn 23 (F9.1): clicking a feature SELECTS it, which is what the
            // Delete tool acts on. It stops there — nothing is removed by a
            // click, because a print you can rub out by touching it is not a
            // print anybody would open twice.
            onClick: onPickFeature ? (e) => { e.stopPropagation(); onPickFeature(m.id); } : undefined,
          };
          if (m.kind === 'pocket') {
            return (
              <g key={m.id}>
                <rect x={m.x} y={m.y} width={m.w} height={m.h} {...common} />
                <rect
                  x={Math.min(m.x, m.x + m.w / 2 - grace)}
                  y={Math.min(m.y, m.y + m.h / 2 - grace)}
                  width={Math.max(m.w, grace * 2)}
                  height={Math.max(m.h, grace * 2)}
                  {...hit}
                />
              </g>
            );
          }
          if (m.kind === 'mark') {
            return (
              <g key={m.id}>
                <line
                  x1={m.from[0]} y1={m.from[1]} x2={m.to[0]} y2={m.to[1]}
                  strokeLinecap="round" {...common}
                />
                <line
                  x1={m.from[0]} y1={m.from[1]} x2={m.to[0]} y2={m.to[1]}
                  strokeLinecap="round" strokeWidth={grace * 2} {...hit} stroke="transparent"
                />
              </g>
            );
          }
          return (
            <g key={m.id}>
              <circle cx={m.x} cy={m.y} r={Math.max(m.d / 2, 1.2)} {...common} />
              <circle cx={m.x} cy={m.y} r={Math.max(m.d / 2, grace)} {...hit} />
            </g>
          );
        })}

        {/* ─── THE INK LAYER TAKES NO POINTER (turn 24, CLAUDE.md F2.2) ────
            Everything below this line is ANNOTATION — the drawing office's
            dimensions, turn 23's hover arrows, F2.4's live dimensions, the
            rubber band and the osnap marker — and it is painted AFTER the
            machinings, which in SVG means on top of them.

            A witness line is a hairline that runs from a feature's own centre
            out to the edge it is measuring from, so it lies exactly across the
            thing it describes. Left interactive, it is the element the pointer
            finds there: hovering a pocket drew the arrows, and the click that
            followed landed on the arrow instead of the pocket and selected
            nothing. Which feature it happened to on depended on where a line
            fell to the pixel — the worst kind of bug, because it looks like
            luck.

            The rule the machinings already keep, one layer up: the drawn ink
            carries the LOOK, the grace shapes carry the POINTER. */}
        <g style={{ pointerEvents: 'none' }}>
          {/* The dimensions — turn 7's own entities, drawn in the drawing-office
              ink. Never dimmed: F7.3 asks for the overall size to be visible
              whatever is being hovered. */}
          {drawing.dimensions.map((e, i) => {
            if (e.kind === 'line') {
              return (
                <line
                  key={`d${i}`} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
                  stroke={dimInk} strokeWidth={0.9} vectorEffect="non-scaling-stroke" opacity={0.85}
                />
              );
            }
            if (e.kind !== 'text') return null;
            return (
              <text
                key={`d${i}`}
                x={e.x}
                y={e.y}
                fill="#9fb4d8"
                fontSize={e.height}
                textAnchor="middle"
                transform={`scale(1 -1) translate(0 ${-2 * e.y})${e.rotate ? ` rotate(${-e.rotate} ${e.x} ${e.y})` : ''}`}
                style={{ fontFamily: 'ui-monospace, Menlo, Consolas, monospace' }}
              >
                {e.text}
              </text>
            );
          })}

          {/* ─── F8.1: the hovered feature, dimensioned ───
              Extension lines, open arrowheads, the value on the line. Thin blue,
              from `profile.hoverDimensions` — the SAME style the scene's hover
              arrows use, defined once and consumed twice. */}
          {/* ─── F2.4: the live dimensions, while a tool is armed ───
              The SAME renderer turn 23's hover arrows use — one style block, one
              geometry module — and horizontal/vertical only, which is the rule
              `drawingDimensionRows` enforces rather than this loop. */}
          {liveDims.map((d) => (
            <g key={`live-${d.key}`} data-live-dim={String(d.key)}>
              {d.segments.map(([a, b], i) => (
                <line
                  // eslint-disable-next-line react/no-array-index-key -- a segment has no identity of its own
                  key={i}
                  x1={a[0]}
                  y1={a[1]}
                  x2={b[0]}
                  y2={b[1]}
                  stroke={style.colour}
                  strokeWidth={style.strokeMm}
                  vectorEffect="non-scaling-stroke"
                  strokeLinecap="round"
                />
              ))}
              <text
                x={d.text.at[0]}
                y={d.text.at[1]}
                fill={style.colour}
                fontSize={style.textMm}
                textAnchor="middle"
                transform={`scale(1 -1) translate(0 ${-2 * d.text.at[1]}) rotate(${-d.text.angle} ${d.text.at[0]} ${d.text.at[1]})`}
                style={{ fontFamily: 'ui-monospace, Menlo, Consolas, monospace' }}
              >
                {formatMm(d.value)}
              </text>
            </g>
          ))}

          {/* ─── F2.3 / F2.1: the RUBBER BAND of a two-click tool ───
              From the first click to where the point would land. It is the one
              thing that tells a joiner the tool is holding a start. */}
          {pending && target && (
            <line
              x1={pending.x}
              y1={pending.y}
              x2={target.x}
              y2={target.y}
              stroke={style.colour}
              strokeWidth={style.strokeMm}
              strokeDasharray="6 4"
              vectorEffect="non-scaling-stroke"
              data-rubber-band="1"
            />
          )}

          {/* ─── F2.3: THE OSNAP MARKER ───
              AutoCAD's own vocabulary, drawn at a constant size on screen — a
              marker is a piece of the tool, not a piece of the furniture. */}
          {snap && (
            <SnapMarker
              kind={snap.kind}
              x={snap.x}
              y={snap.y}
              mm={profile.editor.partSnap.markerPx * view.mmPerPx}
              colour={style.colour}
            />
          )}

          {arrows.map((d) => (
            <g key={d.key} data-hover-dim={String(d.key)}>
              {d.segments.map(([a, b], i) => (
                <line
                  // eslint-disable-next-line react/no-array-index-key -- a segment has no identity of its own
                  key={i}
                  x1={a[0]}
                  y1={a[1]}
                  x2={b[0]}
                  y2={b[1]}
                  stroke={style.colour}
                  strokeWidth={style.strokeMm}
                  vectorEffect="non-scaling-stroke"
                  strokeLinecap="round"
                />
              ))}
              <text
                x={d.text.at[0]}
                y={d.text.at[1]}
                fill={style.colour}
                fontSize={style.textMm}
                textAnchor="middle"
                transform={`scale(1 -1) translate(0 ${-2 * d.text.at[1]}) rotate(${-d.text.angle} ${d.text.at[0]} ${d.text.at[1]})`}
                style={{ fontFamily: 'ui-monospace, Menlo, Consolas, monospace' }}
              >
                {formatMm(d.value)}
              </text>
            </g>
          ))}
        </g>
        </g>
      </svg>

      {/* ─── F2.5: THE NUMBER IS AN IN-FLIGHT OVERRIDE ─────────────────────
          "With a tool armed, typing digits opens a small floating input at the
          cursor; Enter places the point AT that distance along the currently
          snapped axis from the reference edge." SketchUp's grammar: you do not
          click a field, you just start typing. Tab refines the other axis; Esc
          cancels the ENTRY, not the tool. */}
      {typed !== null && (
        <div
          className={`absolute ${LAYER_CLASS.panel} flex items-center gap-1 rounded border border-gold bg-shell-800 px-1 py-0.5 shadow`}
          data-typed-entry="1"
          // Kept INSIDE the window. The drawing sits in an `overflow-hidden`
          // frame, so a floating box that ran past its edge would be clipped —
          // half a number the hand cannot reach is worse than no number.
          style={floatAt(screen, px, 110, 34)}
        >
          <input
            // eslint-disable-next-line jsx-a11y/no-autofocus -- the entry IS the gesture: it opened because a digit was typed
            autoFocus
            className="cc-input w-16 text-right text-[12px]"
            data-typed-value="1"
            value={typed}
            onChange={(e) => onTypedChange?.(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); onTypedCommit?.(); return; }
              if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onTypedCancel?.(); return; }
              if (e.key === 'Tab') {
                // The OTHER axis. One field, two numbers: what is in the box
                // moves across and the box empties for the second.
                e.preventDefault();
                onTypedSecond?.(typed);
                onTypedChange?.('');
              }
            }}
          />
          <span className="text-[10px] text-ink-400">mm</span>
        </div>
      )}

      {/* ─── F2.6: ⌀ AND DEPTH, ASKED ONCE ─────────────────────────────────
          "Drill asks ⌀ and depth ONCE per session in a compact popover on
          first placement (defaults from the picked layer's convention), then
          stamps repeatedly." */}
      {drillPopover && (
        <div
          className={`absolute ${LAYER_CLASS.panel} rounded border border-gold bg-shell-800 p-2 space-y-1 shadow`}
          data-drill-popover="1"
          // WHERE STAMPING WILL PUT IT. The popover holds a point that was
          // decided before it opened — by the click, or by F2.5's typed
          // number — and this is that point, in the part's own millimetres, so
          // the acceptance walk can read the placement off the app instead of
          // inferring it from what appeared afterwards (R4's habit).
          data-drill-at={`${drillPopover.at.x},${drillPopover.at.y}`}
          style={floatAt(screen, px, 230, 108)}
        >
          <div className="text-[11px] text-ink-200">This session’s hole</div>
          <div className="cc-row">
            <span className="text-[11px] text-ink-400 w-8">⌀</span>
            <NumberField
              className="cc-input w-16 text-right"
              data-drill-d="1"
              value={drillPopover.d}
              onCommit={(v) => onDrillPopover?.({ ...drillPopover, d: v })}
            />
            <span className="text-[11px] text-ink-400">deep</span>
            <NumberField
              className="cc-input w-16 text-right"
              data-drill-depth="1"
              value={drillPopover.depth}
              onCommit={(v) => onDrillPopover?.({ ...drillPopover, depth: v })}
            />
          </div>
          <div className="cc-row">
            <span className="text-[10px] text-ink-400 flex-1">0 deep = through</span>
            <button
              type="button"
              className="cc-btn-gold px-2"
              data-drill-confirm="1"
              onClick={() => onDrillConfirm?.({ d: Number(drillPopover.d), depth: Number(drillPopover.depth) })}
            >
              Stamp
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * WHERE A FLOATING BOX GOES, so that all of it is reachable.
 *
 * Beside the cursor, and never past the edge of the window it floats in: the
 * drawing sits in an `overflow-hidden` frame and a box that ran past it would
 * be CLIPPED — which is a button somebody can see the corner of and cannot
 * press. `w` and `h` are the box's own size, which is fixed by its content.
 */
function floatAt(screen, box, w, h) {
  const gap = 14;
  const maxX = Math.max(4, (box?.w || 0) - w - 4);
  const maxY = Math.max(4, (box?.h || 0) - h - 4);
  return {
    left: Math.min(Math.max(4, (screen?.x ?? 40) + gap), maxX),
    top: Math.min(Math.max(4, (screen?.y ?? 40) + gap), maxY),
  };
}

/**
 * A machining's own EXTENT, for F10's magnet — a point for a hole, the
 * rectangle for a pocket, the run for a mark. Measured to the box and not to
 * the centre, because a joiner running his eye along a 70 mm mark has not left
 * the feature he is reading.
 */
function featureBox(drawing, id) {
  const m = drawing.machinings.find((x) => x.id === id);
  if (!m) return null;
  if (m.kind === 'pocket') {
    return {
      x: m.x, y: m.y, w: m.w, h: m.h,
    };
  }
  if (m.kind === 'mark') {
    return {
      x: Math.min(m.from[0], m.to[0]),
      y: Math.min(m.from[1], m.to[1]),
      w: Math.abs(m.to[0] - m.from[0]),
      h: Math.abs(m.to[1] - m.from[1]),
    };
  }
  const r = Math.max(Number(m.d) / 2, 0);
  return {
    x: m.x - r, y: m.y - r, w: r * 2, h: r * 2,
  };
}

/**
 * ONE OSNAP MARKER, in AutoCAD's own vocabulary (F2.3).
 *
 *   END   ■ square       MID  △ triangle    CEN  ○ circle
 *   Node  ⊙ small circle QUAD ◇ diamond     INT  ✕ cross
 *   PER   ⊾ right angle  NEA  ⧗ hourglass
 *
 * Drawn in the drawing's own frame at a size derived from SCREEN pixels, so it
 * is the same size however far the print is zoomed — a marker is a piece of the
 * tool and not a piece of the furniture, which is the same rule the ruler's
 * marker follows.
 */
function SnapMarker({
  kind, x, y, mm: sizeMm, colour,
}) {
  const h = sizeMm / 2;
  const common = {
    fill: 'none',
    stroke: colour,
    strokeWidth: 1.6,
    vectorEffect: 'non-scaling-stroke',
    pointerEvents: 'none',
  };
  const shape = () => {
    switch (kind) {
      case 'END':
        return <rect x={x - h} y={y - h} width={sizeMm} height={sizeMm} {...common} />;
      case 'MID':
        return <polygon points={`${x - h},${y - h} ${x + h},${y - h} ${x},${y + h}`} {...common} />;
      case 'CEN':
        return <circle cx={x} cy={y} r={h} {...common} />;
      case 'NODE':
        return (
          <>
            <circle cx={x} cy={y} r={h * 0.55} {...common} />
            <circle cx={x} cy={y} r={h} {...common} />
          </>
        );
      case 'QUAD':
        return <polygon points={`${x},${y - h} ${x + h},${y} ${x},${y + h} ${x - h},${y}`} {...common} />;
      case 'INT':
        return (
          <>
            <line x1={x - h} y1={y - h} x2={x + h} y2={y + h} {...common} />
            <line x1={x - h} y1={y + h} x2={x + h} y2={y - h} {...common} />
          </>
        );
      case 'PER':
        return (
          <>
            <polyline points={`${x - h},${y + h} ${x - h},${y - h} ${x + h},${y - h}`} {...common} />
            <polyline points={`${x - h},${y} ${x},${y} ${x},${y - h}`} {...common} />
          </>
        );
      default:                                     // NEA — the hourglass
        return (
          <polygon
            points={`${x - h},${y - h} ${x + h},${y - h} ${x - h},${y + h} ${x + h},${y + h}`}
            {...common}
          />
        );
    }
  };
  return <g data-snap-marker={kind}>{shape()}</g>;
}

/** The same eight shapes, tiny, beside their checkboxes (F2.3's panel). */
function SnapGlyph({ marker }) {
  const box = { width: 10, height: 10, viewBox: '0 0 10 10' };
  const line = {
    fill: 'none', stroke: 'currentColor', strokeWidth: 1.2, vectorEffect: 'non-scaling-stroke',
  };
  const inner = () => {
    switch (marker) {
      case 'square': return <rect x="1.5" y="1.5" width="7" height="7" {...line} />;
      case 'triangle': return <polygon points="1.5,2 8.5,2 5,8.5" {...line} />;
      case 'circle': return <circle cx="5" cy="5" r="3.5" {...line} />;
      case 'node': return (<><circle cx="5" cy="5" r="3.5" {...line} /><circle cx="5" cy="5" r="1.4" {...line} /></>);
      case 'diamond': return <polygon points="5,1.5 8.5,5 5,8.5 1.5,5" {...line} />;
      case 'cross': return (<><line x1="1.5" y1="1.5" x2="8.5" y2="8.5" {...line} /><line x1="1.5" y1="8.5" x2="8.5" y2="1.5" {...line} /></>);
      case 'perp': return <polyline points="1.5,8.5 1.5,1.5 8.5,1.5" {...line} />;
      default: return <polygon points="1.5,1.5 8.5,1.5 1.5,8.5 8.5,8.5" {...line} />;
    }
  };
  return <svg {...box} className="inline-block align-middle text-gold">{inner()}</svg>;
}

/** The piece on its own, in the room's own materials. */
function PartCanvas({ unit, panel, design, profile, drills = [] }) {
  // Turn 20 (CLAUDE.md F10): the third surface, and its context is released
  // when this window closes rather than left for the collector.
  const guardContext = useContextGuard('part-detail');
  const finishes = useMemo(() => resolveFinishes(unit, design, profile), [unit, design, profile]);
  const unitDesign = useMemo(() => resolveUnitDesign(unit, design), [unit, design]);
  const sheen = useMemo(() => projectSheen(design, profile), [design, profile]);
  // Named for the prop it feeds, exactly as the editor window names it: the
  // import is aliased, so a local of this name is what keeps
  // test/imports.test.js's tripwire honest about an aliased export.
  const joineryLayers = useMemo(
    () => resolveJoineryLayers(profile, unitDesign?.joinery || null),
    [profile, unitDesign],
  );
  // Turn 16 (CLAUDE.md F1.4): this piece's OWN material, resolved by the engine
  // — the same answer the room and the editor window get.
  const own = useMemo(
    () => (design ? panelFinish(panel, unit, design, profile) : null),
    [panel, unit, design, profile],
  );
  const surface = useMemo(() => surfaceFor({
    role: panel.role,
    materialRole: panel.material_role,
    finishExposed: panel.finish_exposed,
    finishes,
    profile,
    frontColour: own?.overridden ? (own.colour?.hex || null) : (unitDesign?.colour?.hex || null),
    sheen,
    ...(own ? { finish: own.finish } : {}),
  }), [panel, finishes, profile, unitDesign, sheen, own]);

  const box = panel.box;
  const span = Math.max(box.w, box.h, box.d);
  const radius = mm(span) * 1.8;
  const centre = [-mm(box.x + box.w / 2), -mm(box.y + box.h / 2), -mm(box.z + box.d / 2)];

  return (
    <Canvas
      // Turn 20 (CLAUDE.md F10): the third surface, the same guard.
      ref={guardContext.ref}
      onCreated={guardContext.onCreated}
      dpr={[1, 2]}
      camera={{ position: [radius * 0.7, radius * 0.6, radius], fov: 40, near: 0.01, far: 100 }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Turn 16 (CLAUDE.md F7): the editor's own rig, shared with the
          exploded editor — one rig for the two windows that show a part on a
          bench, and its numbers are in the profile. */}
      <EditorRig profile={profile} radius={radius} />
      <group position={centre}>
        <MovingPanel
          panel={panel}
          surface={surface}
          outline={outlineFor(profile, {})}
          outlines
          depth={unit.params.depth}
          profile={profile}
          joineryLayers={joineryLayers}
          // Turn 17 (CLAUDE.md F4.1): the same machining the right-hand drawing
          // lists, on the piece itself — one reading of `panel.cnc`, shown two
          // ways rather than drawn twice.
          machining
          drills={drills}
        />
      </group>
      {/* Zoom, pan and rotate — F7.1 names all three. */}
      <OrbitControls makeDefault enablePan enableDamping dampingFactor={0.12} />
    </Canvas>
  );
}
