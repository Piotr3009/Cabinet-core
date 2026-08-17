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
// ─── TURN 38 (CLAUDE.md F2–F12): THE CNC EDITOR ─────────────────────────────
import {
  allLayers, resolveLayer, USER_LAYER_COLOURS,
} from '../engine/partLayers.js';
import {
  arcPoints, copyObject, groupIn, isObjectOp, makeArc, makeCircle, makeLine, makePolyline,
  makeRect, mirrorObject, moveObject, nextGroupId, nextObjectId, nextObjectIds, objectBounds,
  objectInBox, objectPoints, rotateObject, selectionFor, ungroupIn,
} from '../engine/partObjects.js';
import {
  arrayRect, filletLines, offsetObject, trimObject,
} from '../engine/partPrecision.js';
// ─── TURN 38 (CLAUDE.md F2): THE TOOL TABLE, AND THE ARITHMETIC OF ENTRY ────
// The toolbar's own table and the pure helpers that turn "the points a hand
// has placed plus the numbers it has typed" into a point live in `lib/` for
// the reason every other pure helper in this app does: a table with seventeen
// entries and a dimension resolver with six cases are things a node test
// should be able to read without mounting React.
import {
  THUMB_SIZES, TOOL_BY_ID, TOOLS, UNDO_DEPTH, VERB_TOOLS, ghostOf, liveDimValues, measureText,
  nearestObject, pointFromDims, promptFor,
} from '../lib/partTools.js';

// ─── The element DETAIL window (turn 14, CLAUDE.md F7) ──────────────────────
//
// Double-click a part in the exploded cabinet and this opens: the piece on the
// left, in the hand; the piece on the right, as the machine will cut it.
//
// It is the answer to the question a joiner asks holding a panel — "what is
// THAT hole for?" — and until now the only place to ask it was the CNC sheet,
// which shows forty parts at once and cannot tell you what any one of them is.
//
// ─── TURN 38 (CLAUDE.md F2): AND NOW IT IS A DRAWING BOARD ──────────────────
//
// The owner's verdict after the T37 eye test was the whole editor in one
// night: *"daj wszystko w 38, zmieścimy."* So the WINDOW is rebuilt round the
// canvas — full screen, a slim top bar, an AutoCAD-style toolbar, the drawing
// taking everything else, a status bar under it — and the two panels that used
// to take room from the drawing (the snap checkbox row, the layer legend) are
// now overlays and dropdowns that take none.
//
// WHAT DID NOT CHANGE is everything under it. The pencil still writes ops into
// `unit.params.part_edits`, the engine is still handed nothing, the badge is
// still the badge, and `partSnap.js` is still the osnap. This file is the
// SURFACE of turn 23's and turn 24's mechanics, redrawn; not one of them was
// replaced.
//
// THREE THINGS ABOUT THE ORIGINAL ARE STILL THE PHASE.
//
//   IT SHOWS ONE PIECE (F7.1). The 3-D view is the room's own `MovingPanel`,
//   with the room's own machined geometry. Turn 38 docks it as a thumbnail
//   over the canvas (F8) — it is the same renderer, in a smaller box.
//
//   THE DRAWING IS THE DRAWING (F7.2/F7.4). The outline, every path on it, the
//   layers with the names and colours from `cnc/layers.js` (plus the
//   project's own, F3), and the overall dimensions with the delicate extension
//   lines a draughtsman leaves.
//
//   IT ANSWERS (F7.3). Hovering a machining lights it and prints its NOTE.

const PAD = 0.14;   // margin round the drawing, as a fraction of its long side
// Turn 23 (CLAUDE.md F7): the zoom's own limits, in the part's millimetres —
// 10 mm across the window is a ⌀5 hole filling it, and 5 m is any part in the
// app lost in the middle.
const MIN_VIEW_MM = 10;
const MAX_VIEW_MM = 5000;

export default function PartDetailModal() {
  const args = useUiStore((s) => s.modalArgs);
  const closeModal = useUiStore((s) => s.closeModal);
  const popModal = useUiStore((s) => s.popModal);
  const canBack = useUiStore((s) => s.modalStack.length > 0);
  const notify = useUiStore((s) => s.notify);
  const units = useProjectStore((s) => s.units);
  const unitResult = useProjectStore((s) => s.unitResult);
  const storedDesign = useProjectStore((s) => s.project.design);
  const projectLayersRaw = useProjectStore((s) => s.project.cncLayers);
  const addProjectLayer = useProjectStore((s) => s.addProjectLayer);
  const addPartEdit = useProjectStore((s) => s.addPartEdit);
  const setPartOps = useProjectStore((s) => s.setPartOps);
  const clearPartEdits = useProjectStore((s) => s.clearPartEdits);
  const undoPartEdit = useProjectStore((s) => s.undoPartEdit);
  const profile = useCabinetProfileStore((s) => s.profile);
  const [hovered, setHovered] = useState(null);
  const [tool, setTool] = useState('select');
  // ─── TURN 26 (CLAUDE.md F12.1): THE LAYER IS ASKED ONCE ──────────────────
  // `null` is "nobody has said"; the first op to be committed opens the
  // question, and the answer stands for the rest of the session exactly as the
  // drill's ⌀ and depth do (F2.6).
  const [layer, setLayer] = useState(null);
  const [askLayer, setAskLayer] = useState(null);
  const [picked, setPicked] = useState(null);   // the engine feature Select holds
  // ─── TURN 38 (F5): a gesture collects POINTS, however many it takes ───────
  // Turn 24's `pending` was one point, because every tool it had took two. An
  // arc takes three and a polyline takes as many as it is given, so the field
  // is the run of points placed so far and "how many is enough" is a property
  // of the tool (`TOOLS` above) rather than a branch per tool.
  const [pending, setPending] = useState([]);
  const [drillSpec, setDrillSpec] = useState(null);
  const [askDrill, setAskDrill] = useState(null);
  const [pitch, setPitch] = useState(null);
  const [cursor, setCursor] = useState(null);
  // Turn 24's in-flight number: a distance from the nearest EDGE (F2.5).
  const [typed, setTyped] = useState(null);
  const [typedSecond, setTypedSecond] = useState(null);
  // ─── TURN 38 (F5): …and the SHAPE's own dimensions, which are a different
  // question. `{ values: {width: '38'}, active: 0 }` — TAB cycles `active`.
  const [entry, setEntry] = useState(null);
  // F6: the manual objects the hand is holding, by op id.
  const [selected, setSelected] = useState([]);
  const [menu, setMenu] = useState(null);          // { x, y } in canvas px
  const [marquee, setMarquee] = useState(null);    // { from, to } in mm
  // F7: screen-only measurements. They never enter `part_edits` (iron rule 7).
  const [measures, setMeasures] = useState([]);
  // F3/F4: the two toolbar dropdowns, and the layer overlay's own fold.
  const [openMenu, setOpenMenu] = useState(null);  // 'layers' | 'snap' | null
  const [overlayOpen, setOverlayOpen] = useState(true);
  const [newLayer, setNewLayer] = useState(null);  // { name, aci } while adding
  const [layerFault, setLayerFault] = useState(null);
  const [hiddenLayers, setHiddenLayers] = useState([]);
  // F8: the thumbnail's size, cycled by a double-click.
  const [thumb, setThumb] = useState(0);
  // F2: the status bar's live snap kind, reported up from the canvas.
  const [snapNow, setSnapNow] = useState(null);
  const [status, setStatus] = useState(null);

  const snapsOn = usePartSnapStore((s) => s.enabled);
  const toggleSnap = usePartSnapStore((s) => s.toggle);
  const setAllSnaps = usePartSnapStore((s) => s.setAll);

  const unit = units.find((u) => u.id === args?.unitId) || null;
  const result = unit ? unitResult(unit.id) : null;
  const panel = result?.panels.find((p) => p.id === args?.panelId) || null;

  const userLayers = useMemo(() => allLayers(projectLayersRaw).filter((l) => l.user), [projectLayersRaw]);
  const layerList = useMemo(() => allLayers(projectLayersRaw), [projectLayersRaw]);

  const drawing = useMemo(
    () => (panel
      ? partDetailDrawing(panel, { drills: result?.drills || [], profile, userLayers })
      : null),
    [panel, result, profile, userLayers],
  );
  const features = useMemo(
    () => (panel ? partFeatures(panel, result?.drills || []) : []),
    [panel, result],
  );
  const edits = unit?.params?.part_edits?.[panel?.id] || null;
  const changes = editCount(edits);
  /** This part's manual ops as they stand — the list every verb rewrites. */
  const ops = useMemo(() => (Array.isArray(edits?.ops) ? edits.ops : []), [edits]);
  const objects = useMemo(() => ops.filter(isObjectOp), [ops]);

  const layerDefaults = profile.editor.drillDefaults[layer] || profile.editor.drillDefaults.fallback;
  const dowelPitch = Number(pitch) > 0 ? Number(pitch) : profile.editor.dowelPitchMm;
  const spec = TOOL_BY_ID.get(tool) || TOOL_BY_ID.get('select');

  // ─── F11: UNDO / REDO OVER THIS PANEL'S OWN OPS ──────────────────────────
  //
  // A bounded snapshot stack of the ops list, held for the life of the editor
  // session and nothing else in the app. The DROP-BY-RESIZE is deliberately
  // not in it: F9 calls that a RULE and not an edit, and a Ctrl+Z that put
  // geometry back on a board that no longer has room for it would be the app
  // arguing with the tape measure.
  const history = useRef({ stack: [], at: -1, key: null });
  const panelKey = `${unit?.id || ''}|${panel?.id || ''}`;
  useEffect(() => {
    if (history.current.key === panelKey) return;
    history.current = { stack: [ops], at: 0, key: panelKey };
  }, [panelKey, ops]);

  /** Every write the editor makes goes through here, and every one is undoable. */
  const commitOps = useCallback((next) => {
    if (!unit || !panel) return;
    setPartOps(unit.id, panel.id, next);
    const h = history.current;
    const stack = [...h.stack.slice(0, h.at + 1), next].slice(-UNDO_DEPTH);
    history.current = { stack, at: stack.length - 1, key: panelKey };
  }, [unit, panel, setPartOps, panelKey]);

  const step = useCallback((delta) => {
    const h = history.current;
    const at = h.at + delta;
    if (at < 0 || at >= h.stack.length || !unit || !panel) return false;
    history.current = { ...h, at };
    setPartOps(unit.id, panel.id, h.stack[at]);
    setSelected([]);
    setStatus(delta < 0 ? 'Undone.' : 'Redone.');
    return true;
  }, [unit, panel, setPartOps]);

  /** Back to Select, with nothing half-drawn left behind (F2.1: Esc). */
  const disarm = useCallback(() => {
    setTool('select');
    setPending([]);
    setTyped(null);
    setTypedSecond(null);
    setEntry(null);
    setAskDrill(null);
    setMarquee(null);
    setMenu(null);
  }, []);

  const armTool = (id) => {
    setTool(id);
    setPending([]);
    setTyped(null);
    setTypedSecond(null);
    setEntry(null);
    setPicked(null);
    setMenu(null);
    setOpenMenu(null);
    if (id !== 'measure') setMeasures([]);
  };

  /**
   * ADD ONE OP. F12.1's layer gate is unchanged — an op that names no layer
   * yet is held, the question is asked once, and `commitOnLayer` lets it
   * through — and turn 38 only changes where the op then goes: onto the LIST,
   * through `commitOps`, so undo can take it back off again.
   */
  const addOp = useCallback((op) => {
    if (!unit || !panel || !op) return;
    if (!layer) { setAskLayer(op); return; }
    commitOps([...ops, { ...op, layer }]);
  }, [unit, panel, layer, ops, commitOps]);

  /** Several at once — an array, a fillet's arc-plus-two-shortened-lines. */
  const addOps = useCallback((list) => {
    const clean = (list || []).filter(Boolean);
    if (!clean.length || !unit || !panel) return;
    if (!layer) { setAskLayer(clean[0]); return; }
    commitOps([...ops, ...clean.map((o) => ({ ...o, layer: o.layer || layer }))]);
  }, [unit, panel, layer, ops, commitOps]);

  const commitOnLayer = useCallback((chosen) => {
    const op = askLayer;
    setLayer(chosen);
    setAskLayer(null);
    if (!op || !unit || !panel) return;
    commitOps([...ops, { ...op, layer: chosen }]);
  }, [askLayer, unit, panel, ops, commitOps]);

  const size = drawing ? drawing.size : null;

  // ─── F5: WHAT THE POINTS SO FAR MAKE ─────────────────────────────────────
  //
  // ONE function turns "the points a hand has placed, plus where the cursor
  // is" into an object — and the ghost preview, the dimension read-out and the
  // committed op are all built from its answer. That is what makes the preview
  // honest: it is not a second drawing of what will happen, it IS what will
  // happen, drawn before it is written down.
  const shapeFrom = useCallback((pts, id) => {
    if (!pts || pts.length < 2) return null;
    const p = pts.map((v) => [v.x, v.y]);
    if (tool === 'line') return makeLine({ id, layer, from: p[0], to: p[1] });
    if (tool === 'rect') return makeRect({ id, layer, from: p[0], to: p[1] });
    if (tool === 'circle') {
      return makeCircle({ id, layer, at: p[0], r: Math.hypot(p[1][0] - p[0][0], p[1][1] - p[0][1]) });
    }
    if (tool === 'arc') return pts.length >= 3 ? makeArc({ id, layer, a: p[0], b: p[1], c: p[2] }) : null;
    if (tool === 'polyline') return makePolyline({ id, layer, pts: p });
    return null;
  }, [tool, layer]);

  /**
   * PLACE A POINT — the one door every gesture goes through (turn 24), widened
   * to the tools turn 38 adds.
   */
  const placePoint = useCallback((at) => {
    if (!at || !size) return;
    // A QUESTION ON SCREEN IS ANSWERED BEFORE THE NEXT POINT IS TAKEN (turn 24).
    if (askDrill) return;
    const next = [...pending, at];

    if (tool === 'drill') {
      if (!drillSpec) { setAskDrill({ at, d: layerDefaults.d, depth: layerDefaults.depth }); return; }
      addOp({
        op: 'drill', x: at.x, y: at.y, d: drillSpec.d, depth: drillSpec.depth, id: nextObjectId(ops),
      });
      return;
    }

    // ─── F7: MEASURE, AND IT NEVER LEAVES THE SCREEN ───────────────────────
    if (tool === 'measure') {
      if (next.length < 2) { setPending(next); return; }
      setMeasures((was) => [...was, { from: next[0], to: next[1] }]);
      setPending([]);
      return;
    }

    if (tool === 'dowels') {
      if (next.length < 2) { setPending(next); return; }
      addOp({
        op: 'dowels',
        from: [next[0].x, next[0].y],
        to: [next[1].x, next[1].y],
        pitch: dowelPitch,
        d: drillSpec?.d ?? layerDefaults.d,
        depth: drillSpec?.depth ?? layerDefaults.depth,
        id: nextObjectId(ops),
      });
      setPending([]);
      return;
    }

    // A polyline runs until the hand says stop — Enter, C or a double-click.
    if (tool === 'polyline') { setPending(next); return; }

    if (next.length < (spec.pts || 2)) { setPending(next); return; }
    const made = shapeFrom(next, nextObjectId(ops));
    setPending([]);
    setEntry(null);
    if (!made) { setStatus('Those points make no shape — try again.'); return; }
    addOp(made);
  }, [tool, size, pending, spec, drillSpec, askDrill, layerDefaults, dowelPitch, ops, addOp, shapeFrom]);

  // ─── F6/F12: THE VERBS ───────────────────────────────────────────────────
  //
  // Every one of them acts on MANUAL objects only. The engine's own geometry —
  // the print itself — is not selectable for these: CLAUDE.md is explicit, and
  // it is also the whole architecture (turn 23: the engine stays pure and
  // ignorant, and a hand that could move a computed hole would be editing the
  // kit). Taking a computed hole OFF this print is the separate, older flow,
  // and it still works exactly as it did: Select the feature, press Delete.
  const chosen = useMemo(() => objects.filter((o) => selected.includes(o.id)), [objects, selected]);

  const runVerb = useCallback((pts) => {
    const base = pts[0];
    const to = pts[1];
    const idsFor = (n) => nextObjectIds(ops, n);

    if (tool === 'move' || tool === 'copy') {
      if (pts.length < 2 || !chosen.length) return false;
      const dx = to.x - base.x;
      const dy = to.y - base.y;
      if (tool === 'move') {
        const moved = new Map(chosen.map((o) => [o.id, moveObject(o, dx, dy)]));
        commitOps(ops.map((o) => moved.get(o.id) || o));
      } else {
        const ids = idsFor(chosen.length);
        const made = chosen.map((o, i) => moveObject(copyObject(o, ids[i]), dx, dy));
        commitOps([...ops, ...made]);
        setSelected(ids);
      }
      return true;
    }
    if (tool === 'rotate') {
      if (pts.length < 2 || !chosen.length) return false;
      const deg = (Math.atan2(to.y - base.y, to.x - base.x) * 180) / Math.PI;
      const turned = new Map(chosen.map((o) => [o.id, rotateObject(o, base.x, base.y, deg)]));
      commitOps(ops.map((o) => turned.get(o.id) || o));
      return true;
    }
    if (tool === 'mirror') {
      if (pts.length < 2 || !chosen.length) return false;
      const ids = idsFor(chosen.length);
      const made = chosen.map((o, i) => mirrorObject(copyObject(o, ids[i]), base, to));
      commitOps([...ops, ...made.filter(Boolean)]);
      setSelected(ids);
      return true;
    }
    if (tool === 'offset') {
      const distance = Number(entry?.values?.distance);
      if (!Number.isFinite(distance) || distance === 0) {
        setStatus('Type an offset distance first.');
        return false;
      }
      if (chosen.length !== 1) { setStatus('Offset works on one shape at a time.'); return false; }
      const made = offsetObject(chosen[0], distance, base, idsFor(1)[0]);
      if (!made) { setStatus('That shape cannot be offset by that distance.'); return false; }
      addOps([made]);
      return true;
    }
    if (tool === 'trim') {
      if (!chosen.length) { setStatus('Select the cutting edges first.'); return false; }
      const victim = nearestObject(objects.filter((o) => !selected.includes(o.id)), base, 1e9);
      if (!victim) { setStatus('Nothing to trim there.'); return false; }
      const result2 = trimObject(victim, chosen, base, idsFor(2));
      if (!result2) { setStatus('No intersection — nothing was trimmed.'); return false; }
      commitOps([...ops.filter((o) => o.id !== victim.id), ...result2]);
      return true;
    }
    if (tool === 'fillet') {
      const radius = Number(entry?.values?.radius);
      const hit = nearestObject(objects, base, 1e9);
      if (!hit) return false;
      const held = pending.length ? chosen : [];
      if (!held.length) { setSelected([hit.id]); setPending([base]); setStatus('Now the second line.'); return false; }
      const made = filletLines(held[0], hit, Number.isFinite(radius) ? radius : 0, idsFor(1)[0]);
      if (!made) { setStatus('Those two lines cannot take that radius.'); setPending([]); return false; }
      commitOps([
        ...ops.map((o) => made.replaced.get(o.id) || o),
        ...(made.arc ? [made.arc] : []),
      ]);
      setPending([]);
      setSelected([]);
      return true;
    }
    return false;
  }, [tool, chosen, ops, objects, selected, entry, pending, commitOps, addOps]);

  /** The point-taking half of a verb, wired into `placePoint`'s one door. */
  const placeVerbPoint = useCallback((next) => {
    const need = TOOL_BY_ID.get(tool)?.pts || 2;
    if (next.length < need) { setPending(next); return; }
    const ok = runVerb(next);
    setPending(ok ? [] : next.slice(0, need - 1));
    if (ok) setEntry(null);
  }, [tool, runVerb]);

  const onPlace = useCallback((at) => {
    if (VERB_TOOLS.has(tool)) {
      if (askDrill) return;
      placeVerbPoint([...pending, at]);
      return;
    }
    placePoint(at);
  }, [tool, pending, askDrill, placeVerbPoint, placePoint]);

  /** F5: the polyline ends where the hand says — Enter, or a double-click. */
  const endPolyline = useCallback((close = false) => {
    if (tool !== 'polyline' || pending.length < 2) { setPending([]); return; }
    const made = makePolyline({
      id: nextObjectId(ops), layer, pts: pending.map((p) => [p.x, p.y]), closed: close,
    });
    setPending([]);
    setEntry(null);
    if (made) addOp(made);
  }, [tool, pending, ops, layer, addOp]);

  const deletePicked = useCallback(() => {
    if (!picked || !unit || !panel || !drawing) return;
    const at = drawing.machinings.findIndex((m) => m.id === picked);
    const feature = features[at];
    if (!feature) return;
    addPartEdit(unit.id, panel.id, { op: 'hide', feature: feature.fid });
    setPicked(null);
  }, [picked, unit, panel, drawing, features, addPartEdit]);

  /** F6's Delete, on the objects a hand is holding. */
  const deleteSelected = useCallback(() => {
    if (!selected.length) return;
    commitOps(ops.filter((o) => !selected.includes(o.id)));
    setSelected([]);
    setMenu(null);
  }, [selected, ops, commitOps]);

  const groupSelected = useCallback(() => {
    if (selected.length < 2) return;
    commitOps(groupIn(ops, selected, nextGroupId(ops)));
    setMenu(null);
  }, [selected, ops, commitOps]);

  const ungroupSelected = useCallback(() => {
    const g = chosen.find((o) => o.group)?.group;
    if (!g) return;
    commitOps(ungroupIn(ops, g));
    setMenu(null);
  }, [chosen, ops, commitOps]);

  /** F12's Array — typed values, then Enter. */
  const runArray = useCallback(() => {
    if (!chosen.length) { setStatus('Select something to array first.'); return; }
    const rows = Math.trunc(Number(entry?.values?.rows) || 1);
    const cols = Math.trunc(Number(entry?.values?.cols) || 1);
    const pitch2 = Number(entry?.values?.spacing) || 0;
    const made = arrayRect({
      objects: chosen, rows, cols, spacing: pitch2, ids: nextObjectIds(ops, Math.max(0, rows * cols - 1) * chosen.length),
    });
    if (!made.length) { setStatus('An array needs rows, columns and a spacing.'); return; }
    commitOps([...ops, ...made]);
    setEntry(null);
    setStatus(`${rows} × ${cols} array placed.`);
  }, [chosen, entry, ops, commitOps]);

  // ─── THE KEYBOARD (F2.1 / F2.5 / F5 / F6 / F11) ──────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      const typing = e.target?.tagName === 'INPUT' || e.target?.tagName === 'SELECT';
      if (typing && e.key !== 'Escape' && e.key !== 'Tab' && e.key !== 'Enter') return;

      // ─── F11: Ctrl+Z / Ctrl+Y, over this panel's manual ops only ─────────
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z' || e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        e.stopImmediatePropagation();
        const redo = e.key === 'y' || e.key === 'Y' || (e.shiftKey && (e.key === 'z' || e.key === 'Z'));
        step(redo ? 1 : -1);
        return;
      }

      if (e.key === 'Escape') {
        // `stopImmediatePropagation`, not `stopPropagation`: the shell's own
        // Escape-is-Back listener is on the SAME target (window), and this one
        // is registered FIRST — a child's effect runs before its parent's — so
        // consuming the key here is what makes "Esc closes the editor only
        // when nothing is armed" (F11) true.
        if (menu) { e.stopImmediatePropagation(); setMenu(null); return; }
        if (typed !== null) { e.stopImmediatePropagation(); setTyped(null); setTypedSecond(null); return; }
        if (entry) { e.stopImmediatePropagation(); setEntry(null); return; }
        if (measures.length) { e.stopImmediatePropagation(); setMeasures([]); return; }
        if (openMenu) { e.stopImmediatePropagation(); setOpenMenu(null); return; }
        if (tool !== 'select' || pending.length) { e.stopImmediatePropagation(); disarm(); return; }
        if (selected.length) { e.stopImmediatePropagation(); setSelected([]); }
        return;
      }

      if (e.key === 'Enter') {
        if (tool === 'polyline' && pending.length >= 2) { e.preventDefault(); endPolyline(false); return; }
        if (tool === 'array') { e.preventDefault(); runArray(); return; }
        return;
      }
      if ((e.key === 'c' || e.key === 'C') && tool === 'polyline' && pending.length >= 2) {
        e.preventDefault();
        endPolyline(true);
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (typed !== null || typing) return;
        if (selected.length) { e.preventDefault(); deleteSelected(); return; }
        if (tool === 'select' && picked) { e.preventDefault(); deletePicked(); }
        return;
      }

      // ─── F5: TAB CYCLES THE DIMENSION FIELDS ────────────────────────────
      if (e.key === 'Tab' && spec.dims?.length) {
        e.preventDefault();
        setEntry((was) => {
          const fields = spec.dims;
          const at = was ? (was.active + 1) % fields.length : 0;
          return { values: was?.values || {}, active: at };
        });
        return;
      }

      if (tool === 'select' || !size) return;
      if (/^[0-9]$/.test(e.key) || (e.key === '.' && (typed !== null || entry))) {
        // A tool with its OWN dimensions takes the number into the dimension
        // box (F5); a tool that places a POINT takes it as a distance from the
        // nearest edge, which is turn 24's grammar and is untouched.
        if (spec.dims?.length) {
          e.preventDefault();
          setEntry((was) => {
            const at = was?.active ?? 0;
            const key = spec.dims[at];
            const values = { ...(was?.values || {}) };
            values[key] = `${values[key] || ''}${e.key}`;
            return { values, active: at };
          });
          return;
        }
        e.preventDefault();
        setTyped((was) => (was === null ? e.key : was + e.key));
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [
    tool, picked, pending, typed, entry, size, menu, measures, openMenu, selected, spec,
    disarm, deletePicked, deleteSelected, endPolyline, runArray, step,
  ]);

  /** Enter, on turn 24's floating input: the point goes where the NUMBER says. */
  const commitTyped = () => {
    if (typed === null || !size) return;
    const at = placeByNumber({
      at: pending[pending.length - 1] || cursor || { x: 0, y: 0 },
      value: typed,
      second: typedSecond,
      size: { w: size.w, h: size.h },
    });
    setTyped(null);
    setTypedSecond(null);
    if (at) onPlace({ x: at.x, y: at.y });
  };

  /** Enter, on F5's dimension box: the shape takes the numbers it was given. */
  const commitEntry = useCallback(() => {
    if (!entry || !size) return;
    if (tool === 'array') { runArray(); return; }
    const start = pending[0];
    if (!start) { setStatus('Place the first point, then type.'); return; }
    const at = pointFromDims({
      tool, start, cursor, values: entry.values,
    });
    if (!at) { setStatus('That is not enough to place it.'); return; }
    setEntry(null);
    onPlace(at);
  }, [entry, size, tool, pending, cursor, runArray, onPlace]);

  if (!unit || !panel || !drawing) return null;

  const note = drawing.machinings.find((m) => m.id === hovered)?.note || null;
  const activeSnaps = SNAP_KINDS.filter((k) => snapsOn[k.id] !== false);

  return (
    <Modal
      name="part-detail"
      anchor={args?.anchor || null}
      title={(
        <span className="flex items-center gap-3" data-editor-topbar="1">
          <span className="text-ink-50">{`${unit.params.unit_num} · ${elementLabel(panel) || panel.part} — ${panel.id}`}</span>
          <span className="text-[11px] text-ink-400 tabular-nums" data-editor-size="1">
            {formatMmPair(panel.w, panel.h, ' × ')} · {formatMm(panel.thickness)} mm
          </span>
          {/* ─── TURN 23 (CLAUDE.md F9.3): THE BADGE ───────────────────────── */}
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
      // ─── TURN 38 (CLAUDE.md F2): FULL SCREEN, AND THE CANVAS TAKES IT ──────
      maximised
      fullscreen
    >
      <div className="h-full min-h-0 flex flex-col" data-editor-shell="1">
        {/* ─── F2: THE TOOLBAR ───────────────────────────────────────────── */}
        <div
          className="flex items-center gap-1 px-2 py-1 border-b border-shell-600 shrink-0 flex-wrap"
          data-part-tools="1"
          data-editor-toolbar="1"
        >
          {TOOLS.map((g) => (
            <span key={g.group} className="flex items-center gap-0.5" data-tool-group={g.group}>
              {g.items.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`cc-btn px-1.5 py-0.5 text-[13px] leading-none ${tool === t.id ? 'border-gold text-gold' : ''}`}
                  data-part-tool={t.id}
                  data-tool-armed={tool === t.id ? '1' : undefined}
                  title={`${t.label} — ${t.hint || ''}`}
                  onClick={() => (t.id === 'select' ? disarm() : armTool(t.id))}
                >
                  <span aria-hidden>{t.glyph}</span>
                  <span className="sr-only">{t.label}</span>
                </button>
              ))}
              <span className="w-px h-4 bg-shell-600 mx-1" aria-hidden />
            </span>
          ))}

          <span className="flex-1" />

          {changes > 0 && (
            <>
              <button
                type="button" className="cc-btn-ghost px-1.5 text-[11px]"
                data-part-undo="1"
                title="Undo the last change on this part"
                onClick={() => undoPartEdit(unit.id, panel.id)}
              >
                Undo
              </button>
              <button
                type="button" className="cc-btn px-1.5 text-[11px]"
                data-back-to-computed="1"
                title="Drop every manual change on this part and go back to what the engine computed"
                onClick={() => { clearPartEdits(unit.id, panel.id); setPicked(null); setSelected([]); }}
              >
                Back to computed
              </button>
            </>
          )}

          {/* ─── F3: layers ▾ ─────────────────────────────────────────────── */}
          <div className="relative">
            <button
              type="button"
              className={`cc-btn px-2 text-[11px] ${openMenu === 'layers' ? 'border-gold text-gold' : ''}`}
              data-layers-menu="1"
              data-menu-open={openMenu === 'layers' ? '1' : undefined}
              onClick={() => setOpenMenu((was) => (was === 'layers' ? null : 'layers'))}
            >
              layers ▾
            </button>
            {openMenu === 'layers' && (
              <LayerList
                layers={layerList}
                drawing={drawing}
                active={layer}
                hidden={hiddenLayers}
                onPick={(name) => { setLayer(name); setOpenMenu(null); }}
                onToggle={(name) => setHiddenLayers((was) => (was.includes(name)
                  ? was.filter((n) => n !== name) : [...was, name]))}
                newLayer={newLayer}
                onNewLayer={setNewLayer}
                fault={layerFault}
                onAdd={() => {
                  const { layer: made, error } = addProjectLayer(newLayer || {});
                  setLayerFault(error);
                  if (made) { setNewLayer(null); setLayer(made.name); }
                }}
                className={`absolute right-0 top-full mt-1 ${LAYER_CLASS.panel}`}
              />
            )}
          </div>

          {/* ─── F4: snap ▾ ───────────────────────────────────────────────── */}
          <div className="relative">
            <button
              type="button"
              className={`cc-btn px-2 text-[11px] ${openMenu === 'snap' ? 'border-gold text-gold' : ''}`}
              data-snap-menu="1"
              data-menu-open={openMenu === 'snap' ? '1' : undefined}
              onClick={() => setOpenMenu((was) => (was === 'snap' ? null : 'snap'))}
            >
              snap ▾
            </button>
            {openMenu === 'snap' && (
              <div
                className={`absolute right-0 top-full mt-1 w-44 cc-panel p-2 space-y-1 ${LAYER_CLASS.panel}`}
                data-snap-panel="1"
                data-snap-dropdown="1"
              >
                {SNAP_KINDS.map((k) => (
                  <label key={k.id} className="flex items-center gap-1.5 text-[11px] text-ink-300" title={k.label}>
                    <input
                      type="checkbox"
                      data-snap-kind={k.id}
                      checked={snapsOn[k.id] !== false}
                      onChange={() => toggleSnap(k.id)}
                    />
                    <SnapGlyph marker={k.marker} />
                    <span className="flex-1">{k.id}</span>
                    <span className="text-ink-500">{k.label}</span>
                  </label>
                ))}
                <div className="flex gap-1 pt-1 border-t border-shell-600">
                  <button type="button" className="cc-btn-ghost px-1 text-[11px]" data-snap-all="1" onClick={() => setAllSnaps(true)}>all</button>
                  <button type="button" className="cc-btn-ghost px-1 text-[11px]" data-snap-none="1" onClick={() => setAllSnaps(false)}>none</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── F2: THE CANVAS TAKES EVERYTHING ELSE ───────────────────────── */}
        <div className="flex-1 min-h-0 relative bg-[#131313]" data-part-drawing="1" data-editor-canvas="1">
          <PartDrawing
            drawing={drawing}
            hovered={hovered}
            onHover={setHovered}
            profile={profile}
            picked={picked}
            onPickFeature={(id) => (tool === 'select'
              ? setPicked((was) => (was === id ? null : id))
              : null)}
            tool={tool}
            snapsOn={snapsOn}
            cursor={cursor}
            onCursor={setCursor}
            pending={pending}
            onPlace={onPlace}
            onEndRun={() => endPolyline(false)}
            typed={typed}
            onTypedChange={setTyped}
            onTypedSecond={setTypedSecond}
            onTypedCommit={commitTyped}
            onTypedCancel={() => { setTyped(null); setTypedSecond(null); }}
            drillPopover={askDrill}
            onDrillPopover={setAskDrill}
            onDrillConfirm={(chosenSpec) => {
              setDrillSpec(chosenSpec);
              const at = askDrill?.at;
              setAskDrill(null);
              if (at) {
                addOp({
                  op: 'drill', x: at.x, y: at.y, d: chosenSpec.d, depth: chosenSpec.depth, id: nextObjectId(ops),
                });
              }
            }}
            // ─── TURN 38 ────────────────────────────────────────────────────
            objects={objects}
            selected={selected}
            onSelect={(ids, additive) => setSelected((was) => (additive
              ? [...new Set([...was, ...ids])] : ids))}
            onContextMenu={(atPx) => setMenu(atPx)}
            marquee={marquee}
            onMarquee={setMarquee}
            measures={measures}
            ghost={ghostOf({
              tool, pending, cursor, layer, shapeFrom, entry, spec,
            })}
            entry={entry}
            onEntryChange={setEntry}
            onEntryCommit={commitEntry}
            spec={spec}
            hiddenLayers={hiddenLayers}
            userLayers={userLayers}
            onSnapKind={setSnapNow}
          />

          {/* ─── F3: THE LAYER OVERLAY — over the canvas, taking no width ─── */}
          <div
            className={`absolute right-2 top-2 ${LAYER_CLASS.inPanel} w-56`}
            data-layer-overlay="1"
            data-overlay-open={overlayOpen ? '1' : '0'}
          >
            <button
              type="button"
              className="w-full cc-btn px-2 py-0.5 text-[11px] flex items-center gap-1"
              data-layer-overlay-toggle="1"
              onClick={() => setOverlayOpen((was) => !was)}
            >
              <span>Layers</span>
              <span className="flex-1 text-right text-ink-400">{drawing.legend.length}</span>
              <span aria-hidden>{overlayOpen ? '▾' : '▸'}</span>
            </button>
            {overlayOpen && (
              <LayerList
                layers={layerList}
                drawing={drawing}
                active={layer}
                hidden={hiddenLayers}
                onPick={setLayer}
                onToggle={(name) => setHiddenLayers((was) => (was.includes(name)
                  ? was.filter((n) => n !== name) : [...was, name]))}
                newLayer={newLayer}
                onNewLayer={setNewLayer}
                fault={layerFault}
                onAdd={() => {
                  const { layer: made, error } = addProjectLayer(newLayer || {});
                  setLayerFault(error);
                  if (made) { setNewLayer(null); setLayer(made.name); }
                }}
                onlyUsed
                className="mt-1"
              />
            )}
          </div>

          {/* ─── F8: THE 3-D THUMBNAIL THAT GROWS ──────────────────────────── */}
          <div
            className={`absolute left-2 bottom-2 ${LAYER_CLASS.inPanel} rounded border border-shell-600 overflow-hidden`}
            data-part-canvas="1"
            data-thumb-size={THUMB_SIZES[thumb].id}
            style={{
              width: THUMB_SIZES[thumb].w,
              height: THUMB_SIZES[thumb].h,
              background: profile.appearance.room?.background || '#fafaf8',
            }}
            title="Double-click to grow"
            onDoubleClick={() => setThumb((was) => (was + 1) % THUMB_SIZES.length)}
          >
            <PartCanvas
              unit={unit}
              panel={panel}
              design={storedDesign}
              profile={profile}
              drills={result?.drills || []}
            />
          </div>

          {/* ─── F6: THE CONTEXT MENU ──────────────────────────────────────── */}
          {menu && (
            <ObjectMenu
              at={menu}
              canGroup={selected.length > 1}
              canUngroup={chosen.some((o) => o.group)}
              onPick={(verb) => {
                setMenu(null);
                if (verb === 'delete') { deleteSelected(); return; }
                if (verb === 'group') { groupSelected(); return; }
                if (verb === 'ungroup') { ungroupSelected(); return; }
                armTool(verb);
                setStatus(`${TOOL_BY_ID.get(verb)?.hint || ''}`);
              }}
              onClose={() => setMenu(null)}
            />
          )}

          {/* ─── TURN 26 (CLAUDE.md F12.1): WHICH LAYER SHOULD THESE GO ON? ── */}
          {askLayer && (
            <div
              className={`absolute left-1/2 -translate-x-1/2 top-2 cc-panel p-2 flex items-center gap-2 ${LAYER_CLASS.panel}`}
              data-layer-ask="1"
            >
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
                {layerList.map((l) => (
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

        {/* ─── F2: THE STATUS BAR ─────────────────────────────────────────── */}
        <div
          className="shrink-0 flex items-center gap-3 px-2 py-1 border-t border-shell-600 text-[11px] text-ink-400"
          data-editor-status="1"
        >
          <span className="tabular-nums w-40" data-status-cursor="1">
            {cursor ? `x ${formatMm(cursor.x)}  y ${formatMm(cursor.y)}` : 'x —  y —'}
          </span>
          <span data-status-snap={snapNow || ''}>
            snap {snapNow || '—'}
            <span className="text-ink-500"> ({activeSnaps.length}/{SNAP_KINDS.length})</span>
          </span>
          <span data-status-layer={layer || ''} data-part-layer-chosen={layer || undefined}>
            layer {layer || '— (asked on the first edit)'}
          </span>
          {measures.length > 0 && (
            <span data-status-measure={measures.length}>
              {measureText(measures[measures.length - 1])}
            </span>
          )}
          {/* ─── TURN 23 (CLAUDE.md F8.1): THE CAPTION GOES AWAY ──────────
              Owner: "the corner caption is not what he asked for." What a
              hovered feature IS still belongs in words — a ⌀35 cup and a ⌀35
              pocket are the same circle — but WHERE it is is DRAWN, by the
              hover arrows. Turn 38 moves the sentence off the footer and onto
              the status bar, which is the one place this window keeps a
              persistent readout; it is still a sentence and it is still not a
              caption over the drawing. */}
          <span className="flex-1 text-right text-ink-300" data-part-note="1" data-part-prompt="1">
            {status || note || promptFor({
              tool, spec, pending, picked, selected,
            })}
          </span>
          <span className="text-ink-300" data-part-orientation={drawing.size.rotated ? 'turned' : 'upright'}>
            drawn as the sheet lays it{drawing.size.rotated ? ' — turned, along the grain' : ''}
          </span>
          {tool === 'select' && (
            <button
              type="button"
              className="cc-btn px-2"
              data-delete-feature="1"
              disabled={!picked && !selected.length}
              title={picked || selected.length ? 'Take this off this print' : 'Click something first'}
              onClick={() => (selected.length ? deleteSelected() : deletePicked())}
            >
              Delete
            </button>
          )}
          {tool === 'dowels' && (
            <>
              <span className="text-ink-400">pitch</span>
              <NumberField
                className="cc-input w-16 text-right"
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
      </div>
    </Modal>
  );
}

/**
 * ─── F3: THE LAYER LIST ─────────────────────────────────────────────────────
 *
 * One component, two homes: the collapsible overlay in the canvas's top-right
 * corner and the toolbar's `layers ▾` dropdown show THE SAME LIST, because two
 * lists of layers is how two lists of layers come to disagree.
 *
 * A row is a colour chip, a name, an entity count and a visibility toggle —
 * CLAUDE.md's own four. `+ new layer` opens the name and colour picker.
 */
function LayerList({
  layers, drawing, active, hidden = [], onPick, onToggle, newLayer, onNewLayer,
  fault = null, onAdd, onlyUsed = false, className = '',
}) {
  const counts = useMemo(() => {
    const map = new Map([[drawing.outlineLayer, 1]]);
    for (const m of drawing.machinings) map.set(m.layer, (map.get(m.layer) || 0) + 1);
    return map;
  }, [drawing]);
  const rows = onlyUsed ? layers.filter((l) => counts.has(l.name)) : layers;

  return (
    <div className={`cc-panel p-1.5 max-h-[45vh] overflow-y-auto cc-scroll ${className}`} data-part-legend="1" data-layer-list="1">
      <ul className="space-y-0.5">
        {rows.map((l) => (
          <li key={l.name}>
            <div
              className={`w-full flex items-center gap-1.5 px-1 py-0.5 rounded text-left hover:bg-shell-700 ${
                active === l.name ? 'bg-shell-700' : ''}`}
              data-legend-layer={l.name}
              data-layer-active={active === l.name ? '1' : undefined}
              data-layer-user={l.user ? '1' : undefined}
            >
              <span className="w-3 h-3 rounded-sm shrink-0 border border-black/40" style={{ background: l.screen }} />
              <button
                type="button"
                className="text-[11px] text-ink-100 flex-1 truncate text-left"
                title={`Draw on ${l.name}`}
                onClick={() => onPick(l.name)}
              >
                {l.name}
              </button>
              <span className="text-[10px] text-ink-400 tabular-nums w-5 text-right">{counts.get(l.name) || 0}</span>
              <button
                type="button"
                className="text-[10px] text-ink-400 w-4"
                data-layer-visible={hidden.includes(l.name) ? '0' : '1'}
                title={hidden.includes(l.name) ? 'Show this layer' : 'Hide this layer'}
                onClick={() => onToggle(l.name)}
              >
                {hidden.includes(l.name) ? '◌' : '◉'}
              </button>
            </div>
          </li>
        ))}
      </ul>

      {/* ─── F3: + NEW LAYER ─────────────────────────────────────────────── */}
      {newLayer ? (
        <div className="mt-1 pt-1 border-t border-shell-600 space-y-1" data-new-layer="1">
          <input
            className="cc-input w-full text-[11px]"
            data-new-layer-name="1"
            placeholder="LAYER NAME"
            aria-label="New layer name"
            value={newLayer.name || ''}
            onChange={(e) => onNewLayer({ ...newLayer, name: e.target.value })}
          />
          <div className="flex flex-wrap gap-1" data-new-layer-colours="1">
            {USER_LAYER_COLOURS.map((c) => (
              <button
                key={c.aci}
                type="button"
                className={`w-4 h-4 rounded-sm border ${newLayer.aci === c.aci ? 'border-gold' : 'border-black/40'}`}
                style={{ background: c.hex }}
                data-new-layer-colour={c.aci}
                title={`${c.label} — ACI ${c.aci}`}
                onClick={() => onNewLayer({ ...newLayer, aci: c.aci })}
              />
            ))}
          </div>
          {fault && <p className="text-[10px] text-status-danger" data-new-layer-fault="1">{fault}</p>}
          <div className="flex gap-1">
            <button type="button" className="cc-btn-gold px-2 text-[11px]" data-new-layer-add="1" onClick={onAdd}>Add</button>
            <button type="button" className="cc-btn-ghost px-2 text-[11px]" onClick={() => onNewLayer(null)}>Cancel</button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="mt-1 w-full cc-btn-ghost px-1 text-[11px] text-left"
          data-new-layer-open="1"
          onClick={() => onNewLayer({ name: '', aci: USER_LAYER_COLOURS[0].aci })}
        >
          + new layer
        </button>
      )}
    </div>
  );
}

/**
 * ─── F6: THE CONTEXT MENU ───────────────────────────────────────────────────
 *
 * The owner named five, 17.08: **Move, Copy, Rotate, Group, Delete.** Ungroup
 * appears in the same menu when what is held is a group, because that is where
 * a hand goes looking for it.
 */
function ObjectMenu({
  at, canGroup, canUngroup, onPick, onClose,
}) {
  const items = [
    ['move', 'Move'],
    ['copy', 'Copy'],
    ['rotate', 'Rotate'],
    ...(canGroup ? [['group', 'Group']] : []),
    ...(canUngroup ? [['ungroup', 'Ungroup']] : []),
    ['delete', 'Delete'],
  ];
  return (
    <>
      <div className="absolute inset-0" onPointerDown={onClose} />
      <div
        className={`absolute cc-panel py-1 w-36 ${LAYER_CLASS.panel}`}
        data-object-menu="1"
        style={{ left: at.left, top: at.top }}
      >
        {items.map(([id, label]) => (
          <button
            key={id}
            type="button"
            className="w-full text-left px-2 py-1 text-[11px] text-ink-100 hover:bg-shell-700"
            data-object-verb={id}
            onClick={() => onPick(id)}
          >
            {label}
          </button>
        ))}
      </div>
    </>
  );
}

/**
 * The drawing. Entities in, SVG out — and every machining is its own DOM node,
 * which is what makes F7.3's hover possible at all.
 *
 * ─── TURN 23 (CLAUDE.md F7): IT ZOOMS ──────────────────────────────────────
 *
 * Wheel zooms about the cursor, drag pans, double-click or the ⌂ fits — the
 * grammar is the MAIN CNC SHEET's, extracted to `lib/sheetView.js` and consumed
 * by both. Turn 20's capture-on-MOVEMENT law comes with it: nothing is captured
 * on a press, so a click still reaches the feature under it.
 *
 * ─── TURN 38: AND IT IS THE WHOLE WINDOW ────────────────────────────────────
 *
 * The same SVG, given the room the shell used to spend on panels, plus what a
 * drawing board needs on top of it: the ghost of the shape being dragged out,
 * its dimension box, the marquee, the selection, and F7's screen-only
 * measurements.
 */
function PartDrawing({
  drawing, hovered, onHover, profile, picked = null, onPickFeature = null,
  tool = 'select', snapsOn = null, cursor = null, onCursor = null, pending = [],
  onPlace = null, onEndRun = null, typed = null, onTypedChange = null, onTypedSecond = null,
  onTypedCommit = null, onTypedCancel = null,
  drillPopover = null, onDrillPopover = null, onDrillConfirm = null,
  objects = [], selected = [], onSelect = null, onContextMenu = null,
  marquee = null, onMarquee = null, measures = [], ghost = null,
  entry = null, onEntryChange = null, onEntryCommit = null, spec = null,
  hiddenLayers = [], userLayers = [], onSnapKind = null,
}) {
  const { size } = drawing;
  const svgRef = useRef(null);
  const wrapRef = useRef(null);
  // Where the hand LAST was on SCREEN — only so the floating boxes sit under
  // it. Nothing geometric is ever measured in pixels, and it is NEVER cleared
  // (turn 24: a floating box is anchored to where the gesture happened, and a
  // gesture that has finished does not move).
  const [screen, setScreen] = useState(null);
  const down = useRef(null);
  const pad = Math.max(size.w, size.h) * PAD + drawing.dimensionOffset;
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
    onPanStart: () => onHover(null),
  });
  const dimInk = drawingLayer('DIMENSIONS').colour;
  const outlineColour = drawing.legend.find((l) => l.name === drawing.outlineLayer)?.colour || '#f0ece4';
  const lit = (id) => hovered === id;
  const drawingMode = tool !== 'select';
  const hidden = useMemo(() => new Set(hiddenLayers), [hiddenLayers]);

  // ─── TURN 24 (CLAUDE.md F2.3): THE OSNAP ─────────────────────────────────
  const geometry = useMemo(() => snapGeometry(drawing), [drawing]);
  const magnetMm = profile.editor.partSnap.magnetMm;
  const snap = useMemo(() => (drawingMode && cursor
    ? snapAt({
      geometry, cursor, enabled: snapsOn || undefined, magnetMm,
    })
    : null), [drawingMode, cursor, geometry, snapsOn, magnetMm]);
  const target = snap ? { x: snap.x, y: snap.y } : cursor;
  useEffect(() => { onSnapKind?.(snap?.kind || null); }, [snap, onSnapKind]);

  // ─── TURN 23 (CLAUDE.md F8.1): THE HOVER IS A DRAWING ────────────────────
  const style = useMemo(() => dimensionStyle(profile), [profile]);
  const arrows = useMemo(() => {
    if (!hovered) return [];
    const me = drawing.machinings.find((m) => m.id === hovered);
    if (!me) return [];
    return dimensionSet(featureDimensionRows({
      feature: { x: me.at[0], y: me.at[1] },
      size: { w: size.w, h: size.h },
      others: drawing.machinings.filter((m) => m.id !== hovered).map((m) => ({ id: m.id, x: m.at[0], y: m.at[1] })),
      style,
    }), style);
  }, [hovered, drawing.machinings, size.w, size.h, style]);

  // ─── F2.4: LIVE DIMENSIONS WHILE DRAWING ─────────────────────────────────
  const liveDims = useMemo(() => {
    if (!drawingMode || !target) return [];
    return dimensionSet(drawingDimensionRows({
      at: target,
      size: { w: size.w, h: size.h },
      features: drawing.machinings.map((m) => ({ id: m.id, x: m.at[0], y: m.at[1] })),
      alignMm: profile.editor.partSnap.alignMm,
    }), style);
  }, [drawingMode, target, drawing.machinings, size.w, size.h, style, profile]);

  const viewBox = view.box
    ? `${view.box.x} ${view.box.y} ${view.box.w} ${view.viewH}`
    : `${content.x} ${content.y} ${content.w} ${content.h}`;

  const worldAt = (e) => {
    const at = view.pointerToWorld(e.clientX, e.clientY);
    return at ? { x: at.x, y: -at.y } : null;
  };

  const selectAt = (raw, additive) => {
    const grace = (profile.cnc.annotation.hoverGracePx || 8) * view.mmPerPx;
    const hit = nearestObject(objects.filter((o) => !hidden.has(o.layer)), raw, Math.max(grace, magnetMm));
    if (!hit) { if (!additive) onSelect?.([], false); return false; }
    onSelect?.(selectionFor(objects, hit.id), additive);
    return true;
  };

  return (
    <div ref={wrapRef} className="w-full h-full relative">
      <button
        type="button"
        className={`absolute left-1 top-1 ${LAYER_CLASS.inPanel} cc-btn-ghost text-[11px] px-1.5 py-0.5`}
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
        onDoubleClick={(e) => {
          // F5: a double-click ENDS a polyline; anywhere else it still fits.
          if (tool === 'polyline' && pending.length >= 2) { e.preventDefault(); onEndRun?.(); return; }
          view.fit();
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          const rect = wrapRef.current?.getBoundingClientRect();
          if (!rect) return;
          const raw = worldAt(e);
          if (raw && !selected.length) selectAt(raw, false);
          onContextMenu?.(floatAt(
            { x: e.clientX - rect.left, y: e.clientY - rect.top }, px, 150, 170,
          ));
        }}
        {...view.handlers}
        onPointerDown={(e) => {
          view.handlers.onPointerDown?.(e);
          if (e.button !== 0) return;
          const raw = worldAt(e);
          down.current = raw;
          if (tool === 'select' && raw) onMarquee?.({ from: raw, to: raw });
        }}
        onPointerMove={(e) => {
          view.handlers.onPointerMove?.(e);
          const at = view.pointerToWorld(e.clientX, e.clientY);
          const rect = wrapRef.current?.getBoundingClientRect();
          setScreen(rect ? { x: e.clientX - rect.left, y: e.clientY - rect.top } : null);
          const here = at ? { x: at.x, y: -at.y } : null;
          onCursor?.(here);
          if (marquee && here && down.current) onMarquee?.({ from: down.current, to: here });
          if (hovered && !hoverHolds({
            cursor: here, box: featureBox(drawing, hovered), magnetMm: style.hoverMagnetMm,
          })) onHover(null);
        }}
        onPointerUp={(e) => {
          view.handlers.onPointerUp?.(e);
          const raw = worldAt(e);
          const from = down.current;
          down.current = null;
          if (tool !== 'select' || !marquee || !from || !raw) { onMarquee?.(null); return; }
          const box = {
            x: Math.min(from.x, raw.x), y: Math.min(from.y, raw.y), w: Math.abs(raw.x - from.x), h: Math.abs(raw.y - from.y),
          };
          onMarquee?.(null);
          // A marquee is a DRAG. A press and release in the same place is a
          // click, and a click selects one thing — the same distinction turn
          // 20 drew between a pan and a press.
          if (box.w * box.h < (view.mmPerPx * 4) ** 2) return;
          const inside = objects.filter((o) => !hidden.has(o.layer) && objectInBox(o, box));
          onSelect?.([...new Set(inside.flatMap((o) => selectionFor(objects, o.id)))], e.shiftKey);
        }}
        onPointerLeave={(e) => {
          view.handlers.onPointerLeave?.(e);
          onCursor?.(null);
          onHover(null);
          down.current = null;
        }}
        onClick={(e) => {
          if (view.lastGesturePanned()) return;
          const raw = worldAt(e);
          if (!raw) return;
          if (!drawingMode) { selectAt(raw, e.shiftKey); return; }
          if (!onPlace) return;
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
            if (hidden.has(m.layer)) return null;
            const colour = resolveLayer(m.layer, userLayers).screen;
            const mine = m.opId && selected.includes(m.opId);
            const common = {
              stroke: mine ? '#e0b64a' : colour,
              fill: 'none',
              strokeWidth: mine ? 3 : (lit(m.id) ? 3 : 1.2),
              vectorEffect: 'non-scaling-stroke',
              opacity: hovered && !lit(m.id) && !mine ? 0.35 : 1,
              pointerEvents: 'none',
              'data-machining': m.id,
              ...(m.opId ? { 'data-object-id': m.opId } : {}),
              ...(mine ? { 'data-object-selected': '1' } : {}),
              ...(picked === m.id ? { 'data-picked': '1', strokeWidth: 3.4, stroke: '#e0b64a' } : {}),
            };
            // ─── TURN 23 (F8.1 / F9.1): THE HIT ZONE SURVIVES THE ZOOM ──────
            const grace = (profile.cnc.annotation.hoverGracePx || 8) * view.mmPerPx;
            const hit = {
              fill: 'transparent',
              stroke: 'none',
              style: { cursor: 'pointer' },
              onPointerEnter: () => onHover(m.id),
              onPointerLeave: () => {},
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
                  <line x1={m.from[0]} y1={m.from[1]} x2={m.to[0]} y2={m.to[1]} strokeLinecap="round" {...common} />
                  <line
                    x1={m.from[0]} y1={m.from[1]} x2={m.to[0]} y2={m.to[1]}
                    strokeLinecap="round" strokeWidth={grace * 2} {...hit} stroke="transparent"
                  />
                </g>
              );
            }
            // ─── TURN 38 (F5): the drawn runs and the drawn curves ──────────
            if (m.kind === 'path') {
              const d = polylinePath(m.pts, m.closed);
              return (
                <g key={m.id}>
                  <path d={d} {...common} strokeLinejoin="round" />
                  <path d={d} {...hit} stroke="transparent" strokeWidth={grace * 2} fill="none" />
                </g>
              );
            }
            if (m.kind === 'circle' || m.kind === 'arc') {
              if (m.kind === 'circle') {
                return (
                  <g key={m.id}>
                    <circle cx={m.cx} cy={m.cy} r={m.r} {...common} />
                    <circle cx={m.cx} cy={m.cy} r={m.r} {...hit} stroke="transparent" strokeWidth={grace * 2} fill="none" />
                  </g>
                );
              }
              const d = polylinePath(arcPoints(m, 48), false);
              return (
                <g key={m.id}>
                  <path d={d} {...common} />
                  <path d={d} {...hit} stroke="transparent" strokeWidth={grace * 2} fill="none" />
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

          {/* ─── THE INK LAYER TAKES NO POINTER (turn 24, CLAUDE.md F2.2) ─── */}
          <g style={{ pointerEvents: 'none' }}>
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

            {liveDims.map((d) => (
              <g key={`live-${d.key}`} data-live-dim={String(d.key)}>
                {d.segments.map(([a, b], i) => (
                  <line
                    // eslint-disable-next-line react/no-array-index-key -- a segment has no identity of its own
                    key={i}
                    x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]}
                    stroke={style.colour} strokeWidth={style.strokeMm}
                    vectorEffect="non-scaling-stroke" strokeLinecap="round"
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

            {/* ─── F5: THE GHOST of the shape being dragged out ───────────── */}
            {ghost && (
              <path
                d={ghost.op === 'circle'
                  ? circlePath(ghost.at[0], ghost.at[1], ghost.r)
                  : polylinePath(objectPoints(ghost, 48), false)}
                data-ghost={ghost.op}
                fill="none"
                stroke={style.colour}
                strokeWidth={style.strokeMm}
                strokeDasharray="6 4"
                vectorEffect="non-scaling-stroke"
              />
            )}

            {/* ─── F2.3 / F2.1: the RUBBER BAND of a two-click tool ───────── */}
            {pending.length > 0 && target && !ghost && (
              <line
                x1={pending[pending.length - 1].x}
                y1={pending[pending.length - 1].y}
                x2={target.x}
                y2={target.y}
                stroke={style.colour}
                strokeWidth={style.strokeMm}
                strokeDasharray="6 4"
                vectorEffect="non-scaling-stroke"
                data-rubber-band="1"
              />
            )}

            {/* ─── F6: THE MARQUEE ────────────────────────────────────────── */}
            {marquee && (
              <rect
                x={Math.min(marquee.from.x, marquee.to.x)}
                y={Math.min(marquee.from.y, marquee.to.y)}
                width={Math.abs(marquee.to.x - marquee.from.x)}
                height={Math.abs(marquee.to.y - marquee.from.y)}
                data-marquee="1"
                fill="rgba(224,182,74,0.08)"
                stroke="#e0b64a"
                strokeDasharray="4 3"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            )}

            {/* ─── F7: THE MEASUREMENTS — screen only, never exported ─────── */}
            {measures.map((m, i) => (
              // eslint-disable-next-line react/no-array-index-key -- a measurement has no identity but its order
              <g key={`m${i}`} data-measure={i}>
                <line
                  x1={m.from.x} y1={m.from.y} x2={m.to.x} y2={m.to.y}
                  stroke="#7bd88f" strokeWidth={1.4} vectorEffect="non-scaling-stroke" strokeDasharray="2 3"
                />
                <text
                  x={(m.from.x + m.to.x) / 2}
                  y={(m.from.y + m.to.y) / 2}
                  fill="#7bd88f"
                  fontSize={style.textMm}
                  textAnchor="middle"
                  transform={`scale(1 -1) translate(0 ${-(m.from.y + m.to.y)})`}
                  style={{ fontFamily: 'ui-monospace, Menlo, Consolas, monospace' }}
                >
                  {formatMm(Math.hypot(m.to.x - m.from.x, m.to.y - m.from.y))}
                </text>
              </g>
            ))}

            {/* ─── F6: what is HELD, boxed ────────────────────────────────── */}
            {objects.filter((o) => selected.includes(o.id)).map((o) => {
              const b = objectBounds(o);
              if (!b) return null;
              const m = Math.max(2, view.mmPerPx * 4);
              return (
                <rect
                  key={`sel-${o.id}`}
                  data-selection-box={o.id}
                  x={b.x - m} y={b.y - m} width={b.w + m * 2} height={b.h + m * 2}
                  fill="none" stroke="#e0b64a" strokeDasharray="3 2" strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}

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
                    x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]}
                    stroke={style.colour} strokeWidth={style.strokeMm}
                    vectorEffect="non-scaling-stroke" strokeLinecap="round"
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

      {/* ─── F2.5: THE NUMBER IS AN IN-FLIGHT OVERRIDE (turn 24) ──────────── */}
      {typed !== null && (
        <div
          className={`absolute ${LAYER_CLASS.panel} flex items-center gap-1 rounded border border-gold bg-shell-800 px-1 py-0.5 shadow`}
          data-typed-entry="1"
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
                e.preventDefault();
                onTypedSecond?.(typed);
                onTypedChange?.('');
              }
            }}
          />
          <span className="text-[10px] text-ink-400">mm</span>
        </div>
      )}

      {/* ─── F5: THE DIMENSION BOX, AND TAB CYCLES IT ─────────────────────── */}
      {entry && spec?.dims?.length > 0 && (
        <div
          className={`absolute ${LAYER_CLASS.panel} rounded border border-gold bg-shell-800 px-1.5 py-1 shadow flex items-center gap-1`}
          data-dim-entry={spec.id}
          style={floatAt(screen, px, 90 + spec.dims.length * 76, 34)}
        >
          {spec.dims.map((key, i) => {
            const live = liveDimValues({ tool, start: pending[pending.length - 1], cursor });
            const typedValue = entry.values?.[key];
            const shown = typedValue !== undefined && typedValue !== ''
              ? typedValue
              : (live[key] === undefined ? '' : formatMm(live[key]));
            return (
              <label key={key} className="flex items-center gap-1 text-[10px] text-ink-400">
                <span className={i === entry.active ? 'text-gold' : ''}>{key}</span>
                <input
                  // eslint-disable-next-line jsx-a11y/no-autofocus -- the box IS the gesture
                  autoFocus={i === entry.active}
                  className={`cc-input w-14 text-right text-[12px] ${i === entry.active ? 'border-gold' : ''}`}
                  data-dim-field={key}
                  data-dim-active={i === entry.active ? '1' : undefined}
                  value={shown}
                  onChange={(e) => onEntryChange?.({
                    values: { ...(entry.values || {}), [key]: e.target.value }, active: i,
                  })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); onEntryCommit?.(); return; }
                    if (e.key === 'Tab') {
                      e.preventDefault();
                      onEntryChange?.({ values: entry.values || {}, active: (i + 1) % spec.dims.length });
                    }
                  }}
                />
              </label>
            );
          })}
        </div>
      )}

      {/* ─── F2.6: ⌀ AND DEPTH, ASKED ONCE (turn 24) ──────────────────────── */}
      {drillPopover && (
        <div
          className={`absolute ${LAYER_CLASS.panel} rounded border border-gold bg-shell-800 p-2 space-y-1 shadow`}
          data-drill-popover="1"
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

/** A run of points as an SVG path — the one place the two are converted. */
function polylinePath(pts, closed) {
  if (!pts?.length) return '';
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ');
  return closed ? `${d} Z` : d;
}

/** A circle as a path, so the ghost renderer has one shape to draw. */
function circlePath(cx, cy, r) {
  return `M${cx - r} ${cy} a${r} ${r} 0 1 0 ${r * 2} 0 a${r} ${r} 0 1 0 ${-r * 2} 0`;
}

/**
 * WHERE A FLOATING BOX GOES, so that all of it is reachable.
 *
 * Beside the cursor, and never past the edge of the window it floats in.
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
 * rectangle for a pocket, the run for a mark.
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
  // Turn 38: a drawn run or curve is boxed by its own points, which is the one
  // reading `engine/partObjects.js` gives everything.
  if (m.kind === 'path') {
    const xs = (m.pts || []).map((p) => p[0]);
    const ys = (m.pts || []).map((p) => p[1]);
    if (!xs.length) return null;
    return {
      x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys),
    };
  }
  if (m.kind === 'circle' || m.kind === 'arc') {
    return {
      x: m.cx - m.r, y: m.cy - m.r, w: m.r * 2, h: m.r * 2,
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

/** The same eight shapes, tiny, beside their checkboxes (F4's dropdown). */
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

/** The piece on its own, in the room's own materials (F8's thumbnail). */
function PartCanvas({ unit, panel, design, profile, drills = [] }) {
  const guardContext = useContextGuard('part-detail');
  const finishes = useMemo(() => resolveFinishes(unit, design, profile), [unit, design, profile]);
  const unitDesign = useMemo(() => resolveUnitDesign(unit, design), [unit, design]);
  const sheen = useMemo(() => projectSheen(design, profile), [design, profile]);
  const joineryLayers = useMemo(
    () => resolveJoineryLayers(profile, unitDesign?.joinery || null),
    [profile, unitDesign],
  );
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
      ref={guardContext.ref}
      onCreated={guardContext.onCreated}
      dpr={[1, 2]}
      camera={{ position: [radius * 0.7, radius * 0.6, radius], fov: 40, near: 0.01, far: 100 }}
      onContextMenu={(e) => e.preventDefault()}
    >
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
          machining
          drills={drills}
        />
      </group>
      <OrbitControls makeDefault enablePan enableDamping dampingFactor={0.12} />
    </Canvas>
  );
}
