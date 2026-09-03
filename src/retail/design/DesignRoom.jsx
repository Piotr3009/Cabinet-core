import {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import { useProjectStore } from '../../stores/projectStore.js';
import { useUiStore } from '../../stores/uiStore.js';
import Categories, { CATEGORIES, stepIndex } from './Categories.jsx';
import Options from './Options.jsx';
import Detail from './Detail.jsx';
import Stage, {
  applyPreset, resetStageView, saveStageImage, stageThumbnail, useCameraMemory,
} from './Stage.jsx';
import Editors from './Editors.jsx';
import ViewBar from './ViewBar.jsx';
import { Button } from './controls.jsx';
import GoldLine from '../ui/GoldLine.jsx';
import RoomEditor from './room/RoomEditor.jsx';
import * as A from './adapter.js';
import { useEstimateStore } from '../estimate/store.js';
import { describeDesign } from '../estimate/document.js';
import { collectionById } from './collections.js';
import { loadDecors } from '../decorPack.js';
import { go } from '../site/router.js';

// ─── F3 · THE DESIGN ROOM ──────────────────────────────────────────────────
//
// The owner: *"to nie okna, więc musi być miejsce na design."* A window is
// configured from a sheet of attributes; a wardrobe is DESIGNED in a room. So
// the 3-D stage is the middle of the page and the controls stand either side
// of it — never over it, never in front of it.
//
// ─── T64 · LAYOUT B, THE OWNER'S CHOICE ────────────────────────────────────
//
//     RAIL (2)  │ OPTIONS (3)      │ VIEW BAR (4) / STAGE (5) / HINT (6)
//     six tiles │ the active step  │ the stage, with DETAIL (7) sliding in
//     72px      │ ~340px           │ from the right, over it, when a piece
//               │ BACK · NEXT      │ is clicked; out on DONE or an empty click
//
// The estimate (T59's 7e) is its own page now (F5). What the room shows is
// ONE design; the six steps of column 3 are the owner's own order (F2), each
// with its answer already chosen — the lazy client's law — and NEXT always
// works.
//
// NOTHING FOLDS OPEN IN PLACE except a step's own MORE OPTIONS, which is the
// owner's picky half of the same step and not a category folding inside a
// column (the PSW law T59 wrote is about categories, and the six still stand
// in the rail).
//
// ─── T60 · WHAT CHANGED, AND WHY ───────────────────────────────────────────
//
// F1  Not one measurement is written in this file any more. Every dimension is
//     a class in `styles/room.css` reading a token from `styles/scale.css`.
// F2  The VIEW BAR is PRO's own tools, one for one (`viewTools.js`).
// F3  A click in the stage opens THAT element's menu, and the resolution is
//     the ENGINE's own (`adapter.resolveSelection`) rather than a string match.
// F4  The STAGE HINT names what is selected.

const MOBILE = 768;
const TABLET = 1280;

function useViewport() {
  const [w, setW] = useState(() => (typeof window === 'undefined' ? 1600 : window.innerWidth));
  useEffect(() => {
    const on = () => setW(window.innerWidth);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return w;
}

/** F7 · under 768 there is no design room, and saying so beats pretending. */
function TooSmall() {
  return (
    <main data-testid="design-too-small" className="pbi-room-toosmall">
      <h1 className="pbi-display pbi-h2">DESIGN ON A LARGER SCREEN</h1>
      <GoldLine />
      <p className="pbi-choice pbi-choice-15 pbi-room-toosmall-line">
        The design room needs a wider screen than this one. Send yourself the link and open it on a
        laptop — everything you choose there comes back as an estimate you can keep.
      </p>
      <div className="pbi-duty-actions">
        <Button kind="secondary" href="#/contact">EMAIL ME THE LINK</Button>
      </div>
    </main>
  );
}

/**
 * ─── F4 · THE STAGE HINT (6), AND THE ITEM'S NAME ─────────────────────────
 *
 * The owner: *"6 bez zmian, ale dodaj nazwę itemu."* So the copy is unchanged
 * and the name comes after a hairline: the DESIGN's own name (which the client
 * may change in F3.1 or on the estimate row) and, when something is selected,
 * the element's plain-English kind — which is `engine/elements.js
 * elementLabel`'s word, not one retail invented.
 */
function StageHint({ designName, selected, said = '' }) {
  return (
    <div className="pbi-ui pbi-ui-light pbi-quiet pbi-hint" data-testid="stage-caption">
      {/* T61 F1: what the shared core said about the last `+`, where the `+`
          was pressed. *"6 bez zmian"* still holds — the copy below is untouched
          and comes back the moment there is nothing to report. */}
      <span data-testid="stage-said">
        {said || 'DRAG TO ORBIT · SCROLL TO ZOOM · CLICK AN ELEMENT FOR DETAIL'}
      </span>
      <span className="pbi-hint-sep" aria-hidden="true" />
      <span className="pbi-hint-name" data-testid="stage-caption-name">
        {selected ? `${designName} — ${selected}`.toUpperCase() : String(designName || '').toUpperCase()}
      </span>
    </div>
  );
}

/**
 * ─── T64 F5 · HOW THE ROOM IS ENTERED, AND WHAT IT SHOWS ───────────────────
 *
 * PSW's model (`EstimateConfiguratorPage.jsx`): one item at a time, in ADD
 * or EDIT mode, the mode read off the URL (`?edit=<id>` there,
 * `#/design?edit=<id>` here). Three doors into the room:
 *
 *   #/design?edit=<id>   EDIT — the estimate page's row: that item goes on the
 *                        stage (`estimate.select`, which is `loadProject`)
 *   #/design?new=1       ADD ANOTHER WARDROBE — a fresh design in the same
 *                        estimate (`estimate.addDesign`), at step 1
 *   #/design             the header's DESIGN, a reload, a link with a
 *                        collection: whatever is on the stage stays; a bare
 *                        store starts the first wardrobe (T59's boot)
 *
 * Returns the mode, so the title and the REVIEW button can say which.
 */
function enterRoom(query, wantCollection) {
  const estimate = useEstimateStore.getState();
  const editId = query?.edit || null;
  if (editId && estimate.designs.some((d) => d.id === editId)) {
    if (estimate.activeId !== editId) estimate.select(editId);
    return { mode: 'edit', fresh: false };
  }
  const wantsNew = query?.new === '1';
  const active = estimate.activeDesign();
  if (!wantsNew && active && A.designUnit(useProjectStore.getState().units)) {
    return { mode: active.committed ? 'edit' : 'add', fresh: false };
  }
  const n = estimate.designs.length + 1;
  const name = n === 1 ? 'Bedroom wardrobe' : `Wardrobe ${n}`;
  if (!estimate.designs.length) {
    A.startDesign(name);
    estimate.begin(name);
  } else {
    estimate.addDesign((nm) => A.startDesign(nm), name);
  }
  return { mode: 'add', fresh: true, collection: wantCollection };
}

export default function DesignRoom({ collection: wantCollection, query = {} }) {
  const width = useViewport();
  const units = useProjectStore((s) => s.units);
  const project = useProjectStore((s) => s.project);
  const unitResult = useProjectStore((s) => s.unitResult);
  const selectedElement = useUiStore((s) => s.selectedElement);
  // T64 F1.2 · the UNIT selection too — a plus selects the cabinet it was
  // pressed on, and the columns must follow that selection, not wall 0.
  const selectedUnitId = useUiStore((s) => s.selectedUnitId);

  const estimate = useEstimateStore();

  const [active, setActive] = useState('what');
  const [done, setDone] = useState([]);
  const [target, setTarget] = useState(null);      // { menu, unitId, ref, from } — four strings
  const [fullScreen, setFullScreen] = useState(false);
  const [preset, setPreset] = useState('front');
  const [mode, setMode] = useState('add');
  // ─── T62 F2/F3 · THE ROOM IS SET UP IN A MODAL, AS IT IS IN PRO ──────────
  // `null` is closed; `{ anchor }` is open, and the rectangle is the
  // trigger's own, so the window stands BESIDE the button (rule 15).
  const [roomEditor, setRoomEditor] = useState(null);
  // ─── T61 F1 · WHAT THE SHARED CORE SAID ABOUT THE LAST `+` ───────────────
  // One string, under the stage, in the third voice every refusal in this
  // app is written in. T64 F1.1: the Delete key's refusals land here too.
  const [said, setSaid] = useState('');
  const handle = useRef(null);
  const booted = useRef(false);

  // ─── A STABLE CALLBACK, AND IT MATTERS MORE THAN IT LOOKS ────────────────
  //
  // `Scene`'s RenderRig holds `onReady` in its effect's dependency list, and
  // its cleanup calls `onReady(null)`. An inline arrow here is a NEW function
  // on every render — so every chip, every store change tore the render
  // handle down and built it again. Keep the last GOOD handle.
  //
  // ─── AND IT IS WHERE THE CAMERA IS FINALLY PLACED ────────────────────────
  //
  // T64 F1.6 · the owner: *"chcę żeby się default ustawiał od frontu."* The
  // first frame is `cameraPresets.js` FRONT, framed to the design's bounds —
  // placed the moment the renderer has a handle, once, and never again.
  const parked = useRef(false);
  const keepHandle = useCallback((h) => {
    if (!h) return;
    handle.current = h;
    if (parked.current) return;
    parked.current = true;
    // One frame later, so the furniture it is aimed at has bounds to aim at.
    requestAnimationFrame(() => { applyPreset('front', h); });
  }, []);

  const unit = A.designUnit(units);
  const slope = (project?.wallSlopes || []).find((s) => s.kind === 'slope') || null;

  // ─── BOOT ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (booted.current) return;
    booted.current = true;

    // ─── THE ROOM OWNS ITS OWN VIEW STATE ────────────────────────────────
    // `main-retail.jsx` turns these off at boot, and that is the right place
    // for it. This is the SECOND place, and it is not redundant: the design
    // room can be entered later by a hash change. Idempotent setters.
    const ui = useUiStore.getState();
    ui.setShowDimensions(false);
    ui.setShowFrontDimensions(false);
    ui.setShowOutlines(false);
    ui.setXray(false);
    ui.setContourView(false);
    ui.setRuler(false);
    ui.setHideFronts(false);
    ui.setProps(false);
    ui.clearSelection();

    const entered = enterRoom(query, wantCollection);
    setMode(entered.mode);
    if (entered.fresh) {
      // THE LAZY CLIENT'S ANSWERS, once the decor pack has landed — a decor is
      // a thing the pack names. `loadDecors` is memoised, so this is the same
      // promise the entry started.
      const u = A.designUnit(useProjectStore.getState().units);
      if (u) A.fitWardrobeToWall(u.id);
      const collectionId = wantCollection && collectionById(wantCollection) ? wantCollection : null;
      loadDecors().then(() => {
        const live = A.designUnit(useProjectStore.getState().units);
        if (live) A.applyLazyDefaults(live.id, { collectionId });
        useEstimateStore.getState().capture();
      });
    }
    return undefined;
  }, [wantCollection, query]);

  // ─── F3.5 · FULL SCREEN IS A LOOKING MODE ────────────────────────────────
  // *"the return restores EXACTLY the prior state: same active category, same
  // options, same selection, same camera. Nothing resets."* Its Escape is on
  // the stage's ONE key handler (`keys.js`), not a listener of its own.
  useCameraMemory(fullScreen);
  const exitFullScreen = useCallback(() => setFullScreen(false), []);

  // ─── THE STAGE'S OWN CONTROLS ────────────────────────────────────────────
  const doorEntries = useMemo(() => units.map((u) => ({
    unitId: u.id,
    panelIds: (unitResult(u.id)?.panels || []).filter((p) => p.part === 'FRONT').map((p) => p.id),
  })).filter((e) => e.panelIds.length), [units, unitResult]);

  const lightsOn = A.lightingOn(project);

  const pickPreset = useCallback((id) => {
    setPreset(id);
    // INSIDE means doors open AND the camera in (F3.3).
    if (id === 'inside') useUiStore.getState().toggleAllFronts(doorEntries);
    applyPreset(id, handle.current);
  }, [doorEntries]);

  // ─── T60 F3 · THE SELECTION LAW ──────────────────────────────────────────
  //
  // A click in the stage stores `{ unitId, elementRef }` on the SHARED ui store
  // and the ref is the ENGINE's own panel id. `adapter.resolveSelection` asks
  // the engine which menu that is; an unmapped kind answers null, and a null
  // CLEARS the selection, because a highlight with no menu behind it is the
  // empty panel by another road.
  //
  // ─── T64 F4 · …AND THE PANEL SLIDES ──────────────────────────────────────
  // A piece clicked on the stage slides the DETAIL in; a click on the empty
  // stage — the scene's own `onPointerMissed`, which clears the selection —
  // slides it out. A menu opened from a row's `›` (`from: 'list'`) is not the
  // stage's to close, so a cleared selection leaves it standing until DONE.
  // A click on the CARCASS is a UNIT selection (turn 13's verdict: *"clicking
  // a cabinet must select the CABINET"*) and opens the wardrobe's own menu.
  useEffect(() => {
    if (fullScreen) { setTarget(null); return; }
    if (selectedElement) {
      const found = A.resolveSelection(selectedElement);
      if (!found) {
        setTarget(null);
        useUiStore.getState().clearElement?.();
        return;
      }
      setTarget({
        menu: found.menu, unitId: found.unitId, ref: found.ref, from: 'stage',
      });
      return;
    }
    if (selectedUnitId && A.unitById(selectedUnitId)) {
      const found = A.selectionForMenu('wardrobe', selectedUnitId);
      if (found) {
        setTarget({
          menu: found.menu, unitId: found.unitId, ref: found.ref, from: 'stage',
        });
      }
      return;
    }
    setTarget((t) => (t && t.from === 'stage' ? null : t));
  }, [selectedElement, selectedUnitId, fullScreen]);

  // ─── AND THE TARGET IS RESOLVED FRESH, EVERY RENDER ──────────────────────
  //
  // Three strings in state, resolved against the live store here, and a
  // menu's panel and item are never one edit out of date (T60's measured
  // fault: a menu that closed the instant its own control wrote anything).
  const selection = useMemo(
    () => (target ? A.resolveTarget(target) : null),
    [target, units, project],
  );

  // ─── THE SUMMARY THE REVIEW STEP READS ───────────────────────────────────
  const choices = useMemo(() => describeDesign({ project, units }), [project, units]);

  // ─── T64 F2 · THE STEPS — NEXT ALWAYS WORKS, AND THE RAIL SHOWS WHAT IS DONE
  const pickStep = useCallback((id) => {
    setActive((from) => {
      if (from !== id && stepIndex(id) > stepIndex(from)) {
        setDone((d) => (d.includes(from) ? d : [...d, from]));
      }
      return id;
    });
    // REVIEW opens on the front view (F2, step 6: *"front view, the design's
    // summary, Price on request"*).
    if (id === 'review') { setPreset('front'); applyPreset('front', handle.current); }
  }, []);

  // ─── T64 F5 · DONE → ADD TO MY ESTIMATE / SAVE CHANGES ───────────────────
  //
  // The same act in both modes (PSW: `addItem` / `updateItem`): what is on the
  // stage becomes the item, with a front-view thumbnail off the fixed rig,
  // and the client lands on the estimate page — the list is where you go
  // between items.
  const onDone = useCallback(() => {
    const name = useEstimateStore.getState().activeDesign()?.name || '';
    const thumb = stageThumbnail(handle.current, name);
    useEstimateStore.getState().commit({ thumb });
    useUiStore.getState().clearSelection();
    go('/estimate');
  }, []);

  if (width < MOBILE) return <TooSmall />;
  if (!unit) {
    return (
      <main className="pbi-room-waiting">
        <p className="pbi-choice pbi-choice-15">Setting the room out…</p>
      </main>
    );
  }

  const narrow = width < TABLET;
  const designName = estimate.activeDesign()?.name || '';
  const editing = mode === 'edit';
  // PSW's title line: "{estimate number} — Add window" / "Edit {name}".
  const title = editing ? `EDIT — ${designName}` : 'MY ESTIMATE — ADD A WARDROBE';

  const stage = (
    <div className="pbi-stage-col">
      <ViewBar
        preset={preset}
        onPreset={pickPreset}
        doorEntries={doorEntries}
        lightsOn={lightsOn}
        // T63 F2 · LIGHTS opens PRO's Lighting panel beside the button — the
        // very call PRO's own Lighting button makes (`TopBar.jsx`).
        onLights={(e) => A.openEditor('lighting', { anchor: A.anchorOf(e) })}
        // T64 F1.6 · RESET VIEW is the FRONT preset, framed to the design.
        onReset={() => { setPreset('front'); resetStageView(handle.current); }}
        fullScreen={fullScreen}
        onFullScreen={() => setFullScreen((v) => !v)}
        onBack={exitFullScreen}
        onSaveImage={() => saveStageImage(handle.current, designName)}
      />
      <Stage
        onHandle={keepHandle}
        onSaid={setSaid}
        fullScreen={fullScreen}
        onExitFullScreen={exitFullScreen}
        // THE RUN-END PLUS adds the neighbour's own type beside it, which is
        // the same call PRO's library makes with the same `{ near, side }`.
        onAddPlus={(point) => setSaid(A.addBesidePlus(point).said)}
        // THE INNER PLUS asks "what goes inside this one" — and retail's answer
        // is the INSIDE step, which is where PRO's own `setPanelSection('add',
        // true)` sends a joiner. The scene has SELECTED that cabinet first
        // (`Scene.jsx onAddItems`), so the step's rows add to it (F1.2).
        onAddInside={(unitId) => {
          setSaid('');
          useUiStore.getState().selectUnit(unitId);
          setActive('inside');
        }}
      />
      {!fullScreen ? (
        <Detail
          selection={selection}
          onSelect={setTarget}
          unit={unit}
          project={project}
          designName={designName}
          onDesignName={(name) => estimate.rename(estimate.activeId, name)}
        />
      ) : null}
      {!fullScreen ? (
        <StageHint designName={designName} selected={A.selectionName(selection)} said={said} />
      ) : null}
    </div>
  );

  return (
    <div
      data-testid="design-room"
      className="pbi-room-shell"
      data-fullscreen={fullScreen ? 'yes' : 'no'}
      data-narrow={narrow ? 'yes' : 'no'}
      data-mode={mode}
    >
      {!fullScreen ? (
        <Categories active={active} onPick={pickStep} done={done} />
      ) : null}

      {!fullScreen ? (
        <Options
          active={active}
          onPick={pickStep}
          title={title}
          editing={editing}
          unit={unit}
          room={project.room}
          slope={slope}
          design={project.design}
          project={project}
          choices={choices}
          designName={designName}
          onDesignName={(name) => estimate.rename(estimate.activeId, name)}
          onOpenDetail={(menu) => {
            const found = A.selectionForMenu(menu, unit.id);
            // A row with nothing behind it opens nothing — which is what makes
            // a row without a `›` honest rather than merely quiet.
            if (found) {
              setTarget({
                menu: found.menu, unitId: found.unitId, ref: found.ref, from: 'list',
              });
            }
          }}
          onDone={onDone}
          onEditRoom={(anchor) => setRoomEditor({ anchor })}
          onReset={() => {
            A.startDesign(designName || 'Bedroom wardrobe');
            const u = A.designUnit(useProjectStore.getState().units);
            if (u) A.applyLazyDefaults(u.id);
            setTarget(null);
            setDone([]);
            setActive('what');
          }}
        />
      ) : null}

      {stage}

      {/* PRO's own two screens, copied into `design/room/` and routed by
          `RoomEditor`. Mounted at the ROOM's level rather than inside the
          options column, because the shell it uses is `position: fixed`. */}
      {roomEditor && !fullScreen ? (
        <RoomEditor anchor={roomEditor.anchor} onClose={() => setRoomEditor(null)} />
      ) : null}

      {/* ─── T63 · PRO'S OWN WINDOWS, ANSWERING THE SHARED `modal` SLOT ─────
          `src/pages/ConfiguratorPage.jsx`'s block, for this room: every name
          the shared scene already opens and every name the Duty menus open
          from their buttons, rendered by the COPY of the window PRO renders.
          Mounted at the room's level, and in full screen too. */}
      <Editors />
    </div>
  );
}
