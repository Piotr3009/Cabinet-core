import {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import Modal from './Modal.jsx';
import ElementProperties from './ElementProperties.jsx';
import { MovingPanel, frontKind as frontOf } from '../3d/UnitView.jsx';
import Hardware from '../3d/Hardware.jsx';
import { hardwareInstances } from '../engine/hardware3d.js';
import { resolveDoorHinge } from '../engine/hinges.js';
import { useStorageBase } from '../lib/storageBase.js';
import { useViewHandle } from '../3d/viewHandle.js';
import EditorRig from '../3d/EditorRig.jsx';
import useContextGuard from '../3d/contextGuard.jsx';
import { Environment } from '../3d/Scene.jsx';
import { mm } from '../3d/constants.js';
import { surfaceFor, outlineFor } from '../3d/materials.js';
import { useUiStore } from '../stores/uiStore.js';
import { useProjectStore } from '../stores/projectStore.js';
import { useCabinetProfileStore } from '../stores/cabinetProfileStore.js';
import { projectSheen, resolveFinishes, resolveUnitDesign } from '../engine/design.js';
import { panelFinish } from '../engine/materials.js';
import { joineryLayers as resolveJoineryLayers } from '../engine/joinery.js';
import { cabinetBounds, explodeOffsets, explodeSettings } from '../engine/explode.js';
import { elementLabel, isSelectableElement } from '../engine/elements.js';
import { getUnitType } from '../engine/types.js';
import { anchorAtPoint } from '../lib/modalAnchor.js';

// ─── The cabinet editor window (turn 12, CLAUDE.md F4) ──────────────────────
//
// Right-click a unit → "Edit cabinet" → this. A modal on the F2 shell, standing
// beside the cabinet it is about, with its own small 3D canvas holding THAT
// CABINET and nothing else.
//
// What it is: a VIEWER AND EDITOR OVER EXISTING DATA. It renders the panels the
// engine already computed for this unit — the same `result.panels`, through the
// same `MovingPanel` the room view uses — so a mitre, a machined dog-bone
// socket, a decor and an X-ray all look the way they look everywhere else. It
// re-derives nothing. The working scene, the engine and the BOM do not know it
// exists, and the canvas is mounted only while the window is open.
//
// What it adds is two gestures a room view cannot give you:
//
//   EXPLODE (F4.1) — the parts slide apart along their face normals, like the
//   cabinet was unscrewed. The arithmetic is engine/explode.js and the distance
//   is a profile number; this file only animates towards the answer.
//
//   ─── TURN 13 (CLAUDE.md F2): GROWN UP ───
//
//   The owner worked in it and asked for three things. It opens MAXIMISED —
//   rule 15's one sanctioned exception, because this is a workspace and not a
//   side dialog, and the exception is spelled out in the shell rather than
//   worked around here. It PANS as well as orbits, on the room view's own
//   convention (right or middle button), because a cabinet you cannot slide
//   across the frame is a cabinet you can only look at from the middle. And
//   clicking a part opens EDIT ELEMENT — the full properties, edited here.
//
//   That last one is the half of the change the main view feels: carcass panels
//   are edited EXCLUSIVELY through this window now (F2.4), so the room stops
//   routing their clicks to the element paths and selects the whole cabinet
//   again. The paths themselves are untouched — this window is what uses them.
//
//   TURN A PART OVER (F4.2) — in the exploded state, a part can be selected and
//   ROTATED freely, which is how you look at the back of a side panel without
//   taking the room apart around it. Selecting a part shows its EXISTING
//   properties: `ElementProperties`, the same component the right panel and the
//   double-click modal use, so an edit made here is the same override made
//   anywhere else. It is reused, not forked — CLAUDE.md F4.2 says so, and two
//   copies would offer different fields for the same piece within a turn.

export default function CabinetEditorModal() {
  const args = useUiStore((s) => s.modalArgs);
  const closeModal = useUiStore((s) => s.closeModal);
  const openModal = useUiStore((s) => s.openModal);
  // The click point travels with the request when the window is opened by a
  // double-click in 3D (turn 20, F11.1), exactly as the element and hinge
  // modals take theirs — so the shell puts it beside what was clicked.
  const anchor = args?.anchor || anchorAtPoint(args?.at?.x, args?.at?.y);
  const units = useProjectStore((s) => s.units);
  const unitResult = useProjectStore((s) => s.unitResult);
  const storedDesign = useProjectStore((s) => s.project.design);
  const profile = useCabinetProfileStore((s) => s.profile);

  const unit = units.find((u) => u.id === args?.unitId) || null;
  const result = unit ? unitResult(unit.id) : null;
  // ─── TURN 20 (CLAUDE.md F11): THE DRAWER GETS ITS OWN EDITOR ──────────────
  //
  // Owner: "click a drawer and edit THE DRAWER the way a cabinet is edited —
  // its own window, the drawer selected, rotate it, EXPLODE it, look at every
  // part."
  //
  // The window IS this one, scoped (F11.2). Not a second editor: the shell,
  // the explode, the orbit, the part selection and the properties block are
  // the same code, and a joiner who has learnt one has learnt both. What a
  // `drawer` in the args changes is WHICH PANELS are in it and what the header
  // says — which is the whole feature, and is why it is four lines rather than
  // a file.
  const drawer = Number(args?.drawer) > 0 ? Number(args.drawer) : null;
  // Where the hardware models are served from. '' is a complete answer: the
  // grey stand-in is drawn from the workshop's own profile instead (turn 18,
  // F6.6). Turn 21 (F2): the host may arrive after this window opened, so it
  // is a hook and not a one-shot memo.
  const storageBase = useStorageBase();

  const [exploded, setExploded] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  // ─── Turn 14 (CLAUDE.md F8.1): the doors OPEN in here ───
  // The swing animation has existed since turn 8 and this window never had a
  // way to ask for it, so a joiner could look at a cabinet from every angle
  // except the one that matters — inside it. `{}` means every front shut; a
  // front's own entry overrides the ALL switch, so opening the lot and then
  // shutting one behaves the way a hand expects.
  const [openFronts, setOpenFronts] = useState({});
  const [allOpen, setAllOpen] = useState(false);
  const toggleFront = useCallback((panelId) => {
    setOpenFronts((prev) => ({ ...prev, [panelId]: (prev[panelId] ?? (allOpen ? 1 : 0)) > 0.5 ? 0 : 1 }));
  }, [allOpen]);
  // The shell owns the window; this is only what the CONTENT does with the room
  // it has been given — a side-by-side workspace when there is width for one.
  const [big, setBig] = useState(true);

  // A part that has gone (a shelf deleted from the panel below) must not stay
  // selected: the properties block would be showing a piece that is not there.
  const panels = useMemo(() => {
    const all = (result?.panels || []).filter((p) => p.box);
    if (!drawer) return all;
    // One drawer: its two sides, its box front and back, its bottom and its
    // face. `meta.drawer` is the engine's own index — the same one the runner
    // rows, the BOM lines and the CNC tree are keyed on — so nothing here has
    // to know how a drawer is put together.
    return all.filter((p) => Number(p.meta?.drawer) === drawer
      && (p.role === 'drawer_box' || p.part === 'DRAWER-FRONT'));
  }, [result, drawer]);
  // ─── TURN 21 (CLAUDE.md F6): THE EDITOR MOUNTS WHAT THE ROOM MOUNTS ───────
  //
  // Owner: the exploded drawer showed GREY SLABS where Movento models belong.
  // Two reasons, and both are gone:
  //
  //   • the host. The editor asked `storageBaseUrl()` once, at mount, on a
  //     build that learns its host a moment later (F2) — so its runners could
  //     never be anything but stand-ins. It is a hook now.
  //   • the HINGES were not mounted at all. `hinges: []` and no `hingeSpecs`,
  //     so a joiner opening a door in here saw the procedural cup while the
  //     room three feet away showed the CLIP top. F6.1: one loader, one cache,
  //     one degradation story, no parallel stand-in-only path anywhere.
  //
  // Everything below is the ROOM's own — `hardwareInstances` for the
  // positions, `resolveDoorHinge` for which hinge each door wears, the same
  // `<Hardware>` component for the drawing. What is editor-specific is the
  // FILTER: a drawer window shows that drawer's pair and nothing else.
  const hardware = useMemo(() => {
    if (!result) return null;
    const all = hardwareInstances(result, profile);
    if (!drawer) {
      // The whole cabinet: its hinges. Not its runners — a cabinet editor
      // showing every runner in a drawer stack is the wall of ironmongery the
      // room view goes behind X-ray to avoid, and the DRAWER window is where a
      // joiner goes to look at one.
      return {
        hinges: all.hinges, legs: [], rails: [], runners: [], rods: [],
      };
    }
    return {
      hinges: [],
      legs: [],
      rails: [],
      runners: all.runners.filter((row) => row.drawer === drawer),
      rods: (all.rods || []).filter((row) => row.drawer === drawer),
    };
  }, [drawer, result, profile]);
  // WHICH hinge each door wears — the room's own resolution, from the same
  // registry, so the editor cannot show a different hinge than the BOM orders.
  const hingeSpecs = useMemo(() => {
    if (!unit || !result || drawer) return null;
    const out = {};
    for (const p of result.panels || []) {
      if (p.role !== 'front' || p.part !== 'FRONT') continue;
      const spec = resolveDoorHinge({
        panelId: p.id, unit, design: storedDesign, profile, thickness: p.thickness,
      });
      if (spec) out[p.id] = spec;
    }
    return out;
  }, [unit, result, storedDesign, profile, drawer]);
  useEffect(() => {
    if (selectedId && !panels.some((p) => p.id === selectedId)) setSelectedId(null);
  }, [panels, selectedId]);

  const selected = panels.find((p) => p.id === selectedId) || null;

  // ─── Turn 17 (CLAUDE.md F5): BACK, ONE LEVEL ─────────────────────────────
  //
  // Owner: inside the editor, with ONE element open, there is no way back to
  // the cabinet — the whole window has to be closed and reopened.
  //
  // So the window has TWO LEVELS and now says so: the CABINET, and one PIECE of
  // it. Back returns to the cabinet and deselects the part. It does NOT collapse
  // the explode and it does not close the window (owner's answer 1) — a joiner
  // who has taken the carcass apart to look at three pieces in turn does not
  // want it assembled between two of them.
  //
  // Escape does the same thing AT THIS LEVEL, and only at this level: with
  // nothing selected the key belongs to the shell and still closes the window,
  // which is the one navigation rule this app has and the reason this is a
  // capture-phase listener rather than a second Escape handler arguing with the
  // modal's own.
  const back = useCallback(() => setSelectedId(null), []);
  useEffect(() => {
    if (!selectedId) return undefined;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      e.preventDefault();
      setSelectedId(null);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [selectedId]);

  const item = useMemo(() => {
    const id = selected?.meta?.itemId;
    if (!id) return null;
    return (unit?.params.sections?.[0]?.items || []).find((i) => i.id === id) || null;
  }, [selected, unit]);

  if (!unit || !result) return null;

  const type = getUnitType(unit.type);

  return (
    <Modal
      anchor={anchor}
      title={drawer
        ? `${unit.params.unit_num} · Drawer ${drawer} — edit drawer`
        : `${unit.params.unit_num} · ${type.label} — edit cabinet`}
      onClose={closeModal}
      width="w-[560px]"
      // ─── Turn 13 (CLAUDE.md F2.1) ───
      // The owner's request, and rule 15's one exception: a workspace opens
      // near-fullscreen. The header drag, Escape and the × all survive, and the
      // ❐ in the header puts it back beside the cabinet.
      maximised
      onMaximisedChange={setBig}
      footer={(
        <>
          <span className="text-[11px] text-ink-400 flex-1 text-left">
            {/* eslint-disable-next-line no-nested-ternary */}
            {selectedId
              ? `Editing one piece — Back (or Escape) returns to the ${drawer ? 'drawer' : 'cabinet'} and leaves the explode as it is.`
              : (exploded
                ? 'Click a part to select it, drag it to turn it over — DOUBLE-CLICK it for the full detail.'
                : `Drag to orbit · right or middle button to pan · click a part to edit it${drawer ? ', or the front to open it.' : ', or a door to open it.'}`)}
          </span>
          {/* F8.1: one control for the whole cabinet, and a click on a door
              for one of them. A cabinet with no fronts is not offered it. */}
          {panels.some((p) => p.part === 'FRONT' || p.part === 'DRAWER-FRONT') && (
            <button
              type="button"
              className={`cc-btn ${allOpen ? 'border-gold text-gold' : ''}`}
              data-open-doors="1"
              onClick={() => { setAllOpen((v) => !v); setOpenFronts({}); }}
            >
              {allOpen ? 'Close doors' : 'Open doors'}
            </button>
          )}
          <button
            type="button"
            className={`cc-btn ${exploded ? 'border-gold text-gold' : ''}`}
            data-explode="1"
            onClick={() => { setExploded((v) => !v); }}
          >
            {exploded ? 'Assemble' : 'Explode'}
          </button>
          <button type="button" className="cc-btn-gold" onClick={closeModal}>Done</button>
        </>
      )}
    >
      {/* Maximised, the properties stand BESIDE the cabinet — there is width
          for them and a joiner editing a side wants to see the side. Restored,
          the window is 560 px and they go under it, as they did in turn 12. */}
      <div className={`h-full min-h-0 flex gap-3 ${big ? 'flex-row' : 'flex-col'}`}>
        <div
          className={`rounded border border-shell-600 overflow-hidden ${big ? 'flex-1 min-w-0' : 'h-[300px]'}`}
          data-cabinet-canvas="1"
          style={{ background: profile.appearance.room?.background || '#fafaf8' }}
        >
          {/* The canvas exists only while this window is open — CLAUDE.md F4.3:
              "Cost: canvas mounts only while the modal is open." */}
          <CabinetCanvas
            unit={unit}
            panels={panels}
            hardware={hardware}
            hingeSpecs={hingeSpecs}
            storageBase={storageBase}
            design={storedDesign}
            profile={profile}
            exploded={exploded}
            selectedId={selectedId}
            onSelect={setSelectedId}
            openFronts={openFronts}
            allOpen={allOpen}
            onToggleFront={toggleFront}
            drills={result.drills}
            drawer={drawer}
            onOpenDetail={(panelId, at) => openModal('part-detail', {
              unitId: unit.id, panelId, anchor: null, at,
            })}
          />
        </div>

        <div
          className={`${big ? 'w-[340px] shrink-0 overflow-y-auto' : ''} space-y-2`}
          data-editor-properties="1"
        >
          {selected ? (
            <div className="border border-shell-600 rounded p-2 space-y-2">
              <div className="cc-row">
                {/* ─── Turn 17 (CLAUDE.md F5): the way back up ───
                    First in the row, where a hand looking for "out of here"
                    goes, and it says where it goes back TO. */}
                <button
                  type="button"
                  className="cc-btn px-2 shrink-0"
                  data-editor-back="1"
                  title={`Back to the ${drawer ? 'drawer' : 'cabinet'} (Escape). The explode stays as it is.`}
                  onClick={back}
                >
                  {drawer ? '‹ Drawer' : '‹ Cabinet'}
                </button>
                {/* ─── Turn 13 (CLAUDE.md F2.3) ───
                    "Clicking a part inside the editor shows EDIT ELEMENT."
                    Named, so the window says what it is offering rather than
                    leaving a joiner to infer it from a row of fields. */}
                <span className="text-xs uppercase tracking-wide text-gold flex-1 truncate" data-edit-element="1">
                  {elementLabel(selected)}
                </span>
                <button type="button" className="cc-btn-ghost" title="Deselect" onClick={back}>×</button>
              </div>
              {/* The SAME properties block the right panel shows. An edit here is
                  the same override, on the same unit, through the same store. */}
              {/* Turn 14 (CLAUDE.md F8.2): the editor is where a piece has
                  ACTIONS — this is the window in which you have it in your
                  hand. The right panel and the beside-the-piece modal show the
                  same properties without them. */}
              <ElementProperties unit={unit} panel={selected} item={item} compact actions />
            </div>
          ) : (
            <p className="text-[11px] text-ink-400">
              {drawer
                ? (
                  <>
                    Drawer {drawer} on its own — its sides, its box front and back, its bottom, its face
                    and the runners it rides on. Click a piece for its height, its runner and its
                    material; <b className="text-ink-200">Explode</b> takes the box apart.
                  </>
                )
                : (
                  <>
                    Nothing selected. Click a piece in the view — <b className="text-ink-200">Edit element</b> opens
                    here, and it is the same override machinery the right-hand panel uses. Carcass panels are
                    edited here and nowhere else.
                  </>
                )}
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}

/**
 * The little canvas. A cut-down version of the room's rig — the same tone
 * mapping is not needed for one cabinet on a plain ground, but the LIGHTS are
 * the room's shape so a panel does not read a different colour here than it
 * does in the scene.
 */
function CabinetCanvas({
  unit, panels, design, profile, exploded, selectedId, onSelect, onOpenDetail,
  openFronts, allOpen, onToggleFront, drills = [], hardware = null, storageBase = '',
  hingeSpecs = null, drawer = null,
}) {
  // Turn 20 (CLAUDE.md F10): the editor's context, released when this window
  // closes — however fast it is closed. See 3d/contextGuard.jsx.
  const guardContext = useContextGuard('editor');
  const bounds = useMemo(() => cabinetBounds(panels), [panels]);
  const size = bounds ? Math.max(bounds.size.x, bounds.size.y, bounds.size.z) : 800;
  const radius = mm(size) * 1.9;

  return (
    <Canvas
      ref={guardContext.ref}
      onCreated={guardContext.onCreated}
      dpr={[1, 2]}
      camera={{
        position: [radius * 0.75, radius * 0.55, radius], fov: 40, near: 0.01, far: 100,
      }}
      onPointerMissed={() => onSelect(null)}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* The editor's end-to-end handle (turn 13, F2.2): a PAN leaves no trace
          in the DOM at all, so the walk reads the controls' own target. */}
      <EditorViewHandle />
      {/* ─── Turn 16 (CLAUDE.md F7): THE BENCH LAMP ───
          The owner: "serio nic nie widać". Three literal lights lived here —
          an ambient and two directionals — so there was no knob to turn. The
          rig is `appearance.editorRig` now, shared with the part-detail
          window, and it was tuned by MEASURING (verify/t16/editor-light.json)
          rather than by eye in the code. */}
      <EditorRig profile={profile} radius={radius} />
      {/* ─── The probe the bench was missing ───
          Every panel material carries an `envMapIntensity` — 1.0 on board,
          0.25 on lacquer — and in this window it multiplied NOTHING, because
          nothing ever set `scene.environment`. The main view has had the
          RoomEnvironment probe since turn 6; the editor never did, so a whole
          term of the lighting equation was zero here and turn 16's brighter
          lamps could only buy back part of it. The inside faces are the proof:
          a directional lamp outside a carcass does not reach them, and a probe
          does. Same component, same profile number as the main view — one rig,
          two windows, no second set of numbers to drift. */}
      <Environment
        intensity={profile.appearance.environment.intensity}
        on
      />
      <ExplodedCabinet
        unit={unit}
        panels={panels}
        design={design}
        profile={profile}
        exploded={exploded}
        selectedId={selectedId}
        onSelect={onSelect}
        onOpenDetail={onOpenDetail}
        openFronts={openFronts}
        allOpen={allOpen}
        onToggleFront={onToggleFront}
        bounds={bounds}
        drills={drills}
        hardware={hardware}
        hingeSpecs={hingeSpecs}
        storageBase={storageBase}
        drawer={drawer}
      />
      {/* ─── Turn 13 (CLAUDE.md F2.2): IT PANS NOW ───
          Turn 12 said `enablePan={false}`, so the cabinet was nailed to the
          centre of the frame and the only gesture was orbit. The convention is
          the MAIN VIEW's, deliberately and literally: the room's OrbitControls
          take three.js's defaults — left orbits, middle dollies, right pans —
          so the same hand works in both places and there is nothing new to
          learn. `screenSpacePanning` is left at its default for the same
          reason. The context menu is already suppressed on this canvas, which
          is what lets the right button through to the controls. */}
      <OrbitControls
        makeDefault
        enablePan
        minDistance={radius * 0.35}
        maxDistance={radius * 4}
        enableDamping
        dampingFactor={0.12}
      />
    </Canvas>
  );
}

function EditorViewHandle() {
  useViewHandle('editor');
  return null;
}

/**
 * The cabinet itself, centred on the origin so the orbit turns around it.
 *
 * Every piece is a `MovingPanel` — the room view's own — wrapped in a group
 * this file animates. The wrapper is why nothing about the shared renderer had
 * to change: the explode is an OFFSET applied outside it, exactly as the door
 * swing is an offset applied inside it.
 */
function ExplodedCabinet({
  unit, panels, design, profile, exploded, selectedId, onSelect, onOpenDetail, bounds,
  openFronts, allOpen, onToggleFront, drills = [], showMachining = true,
  hardware = null, hingeSpecs = null, storageBase = '', drawer = null,
}) {
  const finishes = useMemo(() => resolveFinishes(unit, design, profile), [unit, design, profile]);
  const unitDesign = useMemo(() => resolveUnitDesign(unit, design), [unit, design]);
  const sheen = useMemo(() => projectSheen(design, profile), [design, profile]);
  const joineryLayers = useMemo(
    () => resolveJoineryLayers(profile, unitDesign?.joinery || null),
    [profile, unitDesign],
  );
  const offsets = useMemo(
    () => explodeOffsets(panels, explodeSettings(profile)),
    [panels, profile],
  );
  const centre = bounds ? [-mm(bounds.centre.x), -mm(bounds.centre.y), -mm(bounds.centre.z)] : [0, 0, 0];

  return (
    <group position={centre}>
      {panels.map((p) => (
        <ExplodingPart
          key={p.id}
          panel={p}
          offset={offsets.get(p.id) || { x: 0, y: 0, z: 0 }}
          exploded={exploded}
          selected={selectedId === p.id}
          selectable={isSelectableElement(p)}
          onSelect={onSelect}
          onOpenDetail={onOpenDetail}
          open={openFronts?.[p.id] ?? (allOpen ? 1 : 0)}
          onToggleFront={onToggleFront}
          profile={profile}
          finishes={finishes}
          design={design}
          unit={unit}
          unitDesign={unitDesign}
          sheen={sheen}
          joineryLayers={joineryLayers}
          depth={unit.params.depth}
          drills={drills}
          showMachining={showMachining}
        />
      ))}
      {/* ─── TURN 21 (CLAUDE.md F6.2): THE MODELS RIDE THEIR PARTS APART ────
          Turn 20 mounted the drawer's runners as a sibling of this group — so
          they sat at raw engine coordinates while the cabinet was CENTRED on
          the origin for the orbit, and they stayed put while the boards flew
          apart. Both are the same mistake: the hardware was outside the scene
          it belongs to. It is inside it now, and each piece travels with the
          part it is screwed beside. */}
      {hardware && (
        <ExplodedHardware
          hardware={hardware}
          offsets={offsets}
          exploded={exploded}
          profile={profile}
          hingeSpecs={hingeSpecs}
          storageBase={storageBase}
          surface={drawer ? 'drawer-editor' : 'editor'}
        />
      )}
    </group>
  );
}

/**
 * The hardware, exploding with the boards (turn 21, CLAUDE.md F6).
 *
 * ONE loader, ONE cache, ONE degradation story: this is the room's own
 * `<Hardware>`, given the room's own instances, and the only thing this adds is
 * WHICH PART each piece travels with. A runner rides the box side it carries; a
 * hinge's carcass half rides the side panel it is plated to. Anything whose
 * part is not in this window rides nothing and stays where the engine put it,
 * which is what an assembled cabinet looks like.
 */
function ExplodedHardware({
  hardware, offsets, exploded, profile, hingeSpecs, storageBase, surface,
}) {
  // Group the instances by the panel they travel with. A Map of `<panel id> →
  // instance set`, so one <Hardware> is mounted per travelling group and the
  // instanced meshes inside it are still shared.
  const groups = useMemo(() => {
    const out = new Map();
    const put = (panelId, key, item) => {
      const id = panelId && offsets.has(panelId) ? panelId : '';
      if (!out.has(id)) {
        out.set(id, {
          hinges: [], runners: [], rods: [], legs: [], rails: [],
        });
      }
      out.get(id)[key].push(item);
    };
    for (const h of hardware.hinges || []) put(h.side === 'R' ? 'BUR' : 'BUL', 'hinges', h);
    for (const r of hardware.runners || []) put(`D${r.drawer}-S${r.side}`, 'runners', r);
    // The rod ties the two runners together across the back of the box; it
    // travels with the box's own back board.
    for (const r of hardware.rods || []) put(`D${r.drawer}-BB`, 'rods', r);
    for (const l of hardware.legs || []) put('', 'legs', l);
    for (const r of hardware.rails || []) put('', 'rails', r);
    return out;
  }, [hardware, offsets]);

  return (
    <>
      {[...groups.entries()].map(([panelId, instances]) => (
        <RidingHardware
          key={panelId || 'still'}
          offset={offsets.get(panelId) || { x: 0, y: 0, z: 0 }}
          exploded={exploded && Boolean(panelId)}
          profile={profile}
        >
          <Hardware
            instances={instances}
            profile={profile}
            runners
            hinges
            hingeSpecs={hingeSpecs}
            storageBase={storageBase}
            // Turn 21 (CLAUDE.md F6.3 / R4): which window these entries were
            // mounted in, so the walk can assert that the EDITOR's hardware is
            // model-backed and not a stand-in. The scope is the part they ride.
            surface={surface}
            scope={panelId || 'still'}
          />
        </RidingHardware>
      ))}
    </>
  );
}

/**
 * A group that eases to a part's explode offset — the same spring
 * `ExplodingPart` runs, so hardware and board arrive together instead of one of
 * them snapping.
 */
function RidingHardware({
  offset, exploded, profile, children,
}) {
  const group = useRef(null);
  const at = useRef(0);
  const { seconds } = explodeSettings(profile);
  useFrame((_, delta) => {
    if (!group.current) return;
    const target = exploded ? 1 : 0;
    const step = Math.min(1, delta / Math.max(0.0001, seconds) * 2);
    at.current += (target - at.current) * step;
    if (Math.abs(target - at.current) < 1e-4) at.current = target;
    group.current.position.set(
      mm(offset.x) * at.current, mm(offset.y) * at.current, mm(offset.z) * at.current,
    );
  });
  return <group ref={group}>{children}</group>;
}

/**
 * One piece: it slides out, it comes back, and while it is out it can be turned
 * over in the hand.
 *
 * The rotation is the PART's own and is remembered while the window is open —
 * a joiner who has turned a side panel round to look at the drilling has not
 * finished looking at it just because he clicked something else. Assembling
 * puts every part back the way it was found, because a cabinet with one side
 * panel at 40° is not an assembled cabinet.
 */
function ExplodingPart({
  panel: p, offset, exploded, selected, selectable, onSelect, onOpenDetail,
  profile, finishes, design, unit, unitDesign, sheen, joineryLayers, depth,
  open = 0, onToggleFront = null, drills = [], showMachining = true,
}) {
  const group = useRef(null);
  const spin = useRef(null);
  const [turning, setTurning] = useState(false);
  const { gl } = useThree();
  const { seconds } = explodeSettings(profile);

  // The animated position, in metres, eased towards the target every frame.
  const at = useRef(0);
  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;
    const target = exploded ? 1 : 0;
    if (Math.abs(at.current - target) < 0.001) at.current = target;
    else at.current += (target - at.current) * Math.min(1, delta / Math.max(0.05, seconds / 3));
    const a = at.current;
    g.position.set(mm(offset.x) * a, mm(offset.y) * a, mm(offset.z) * a);
    // Assembled means assembled: a part turned over springs back as it lands.
    if (!exploded && spin.current) {
      spin.current.rotation.x *= 1 - Math.min(1, delta * 6);
      spin.current.rotation.y *= 1 - Math.min(1, delta * 6);
    }
  });

  // ─── Turning a part over (CLAUDE.md F4.2) ───
  // Only while it is out, and only the SELECTED one: a drag on an unexploded
  // cabinet is how the orbit works, and taking that away would make the window
  // unusable for the thing it is mostly used for — looking at the cabinet.
  const startTurn = useCallback((e) => {
    if (!exploded || !selected || !spin.current) return;
    e.stopPropagation();
    setTurning(true);
    const from = { x: e.clientX, y: e.clientY };
    const start = { x: spin.current.rotation.x, y: spin.current.rotation.y };
    const move = (ev) => {
      if (!spin.current) return;
      spin.current.rotation.y = start.y + (ev.clientX - from.x) * 0.01;
      spin.current.rotation.x = start.x + (ev.clientY - from.y) * 0.01;
    };
    const up = () => {
      setTurning(false);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  }, [exploded, selected]);

  // Turn 16 (CLAUDE.md F1.4): the piece's OWN material, resolved by the engine
  // — the same call the room view makes, so a shelf given Front 2's board is
  // that colour in both windows.
  const own = useMemo(
    () => (design ? panelFinish(p, unit, design, profile) : null),
    [p, unit, design, profile],
  );
  const surface = useMemo(() => surfaceFor({
    role: p.role,
    materialRole: p.material_role,
    finishExposed: p.finish_exposed,
    finishes,
    profile,
    // The HEX, not the colour record: `THREE.Color` takes a string or a number
    // and quietly stays white for anything else, which is why a sprayed front
    // has been coming out white in this window since turn 12.
    frontColour: own ? (own.colour?.hex || null) : (unitDesign?.colour?.hex || null),
    sheen,
    ...(own ? { finish: own.finish } : {}),
  }), [p, finishes, profile, unitDesign, sheen, own]);

  // The selected part goes gold, the same signal a dragged shelf gives in the
  // room — one colour for "this is the one you have hold of" (rule 14 territory:
  // the rig and its colours are not reinvented per window).
  const shown = selected
    ? { ...surface, colour: profile.appearance.selection?.colour || '#2B6CB0', texture: null }
    : surface;

  return (
    <group ref={group}>
      <group ref={spin}>
        <MovingPanel
          panel={p}
          // ─── Turn 14 (CLAUDE.md F8.1) ───
          // Turn 12 passed `front={null}` and `open={0}`, which is what kept
          // every door in this window shut: the swing has existed since turn 8
          // and the editor simply never asked for it. It is the ROOM's own
          // `frontKind` and the room's own animation — nothing new is drawn.
          front={frontOf(p)}
          open={open}
          surface={shown}
          outline={outlineFor(profile)}
          outlines
          contour={false}
          xray={false}
          depth={depth}
          profile={profile}
          joineryLayers={joineryLayers}
          swing={frontOf(p) === 'door' ? 1 : null}
          onPointerDown={(e) => {
            if (!selectable) return;
            e.stopPropagation();
            if (selected && exploded) { startTurn(e); return; }
            onSelect(p.id);
            // A click on a DOOR opens it. It is the one part where "click it"
            // has an obvious physical meaning, and the properties still appear
            // beside it — the two do not fight (F8.1).
            if (frontOf(p) && onToggleFront && !exploded) onToggleFront(p.id);
          }}
          // ─── Turn 14 (CLAUDE.md F7) ───
          // "Double-click a part after explode" → the DETAIL window: the piece
          // on its own on the left, the piece as the machine will cut it on the
          // right. The gesture is turn 11's, one layer down — a single click
          // selects, a double click opens the thing.
          onDoubleClick={(e) => {
            if (!selectable) return;
            e.stopPropagation();
            onSelect(p.id);
            onOpenDetail?.(p.id, { x: e.clientX, y: e.clientY });
          }}
          onPointerOver={selectable ? () => { gl.domElement.style.cursor = turning ? 'grabbing' : 'pointer'; } : undefined}
          onPointerOut={selectable ? () => { gl.domElement.style.cursor = 'auto'; } : undefined}
          // ─── Turn 17 (CLAUDE.md F4.1) ───
          // The dog bones, the grooves and the drilling, ON the piece — drawn
          // by the shared renderer from the same `panel.cnc` and
          // `result.drills` the DXF is written from, so a door that swings open
          // takes its hinge cups with it and there is nothing to keep in step.
          machining={showMachining}
          drills={drills}
        />
      </group>
    </group>
  );
}
