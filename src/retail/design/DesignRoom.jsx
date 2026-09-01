import {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import { useProjectStore } from '../../stores/projectStore.js';
import { useUiStore } from '../../stores/uiStore.js';
import Categories from './Categories.jsx';
import Options from './Options.jsx';
import Detail from './Detail.jsx';
import Stage, { applyPreset, saveStageImage, useCameraMemory } from './Stage.jsx';
import ViewBar from './ViewBar.jsx';
import QuoteForm from '../ui/QuoteForm.jsx';
import Button from '../ui/Button.jsx';
import GoldLine from '../ui/GoldLine.jsx';
import * as A from './adapter.js';
import { useEstimateStore } from '../estimate/store.js';
import { buildEstimateDocument, describeDesign, estimateMailBody } from '../estimate/document.js';
import { downloadJson, estimateFilename, readJsonFile } from '../estimate/download.js';
import { openMail } from '../estimate/mail.js';
import { collectionById } from './collections.js';
import { FRONT_STYLE_OPTIONS } from '../../engine/design.js';

// ─── F3 · THE DESIGN ROOM ──────────────────────────────────────────────────
//
// The owner: *"to nie okna, więc musi być miejsce na design."* A window is
// configured from a sheet of attributes; a wardrobe is DESIGNED in a room. So
// the 3-D stage is the middle of the page and the controls stand either side
// of it — never over it, never in front of it.
//
//     RAIL (2) │ OPTIONS (3) │ VIEW BAR (4) / STAGE (5) / HINT (6) │ DETAIL (7)
//     Ivory    │ Soft Ivory  │ Porcelain                           │ Warm White
//
// NOTHING FOLDS OPEN IN PLACE. No accordions (the PSW law); the second column
// IS the expansion of the first, and it is always there.
//
// ─── T60 · WHAT CHANGED, AND WHY ───────────────────────────────────────────
//
// F1  Not one measurement is written in this file any more. Every dimension is
//     a class in `styles/room.css` reading a token from `styles/scale.css`, so
//     the room is 100% on the owner's 2560 monitor and 78% on a 1280 laptop
//     with one number deciding it.
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

/** F5.2 · the quote form, over the room, in the design system. */
function QuoteOverlay({ onClose, onSubmit }) {
  return (
    <div
      data-testid="quote-overlay"
      className="pbi-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="pbi-overlay-card">
        <h2 className="pbi-display pbi-h3">REQUEST A QUOTE</h2>
        <GoldLine />
        <p className="pbi-choice pbi-choice-15 pbi-overlay-line">
          Your design comes with the message. Nothing is ordered and nothing is charged.
        </p>
        <QuoteForm testid="quote-form" onSubmit={onSubmit} />
        <div className="pbi-overlay-back">
          <button type="button" className="pbi-link" data-testid="quote-close" onClick={onClose}>
            ‹ BACK TO THE DESIGN
          </button>
        </div>
      </div>
    </div>
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

export default function DesignRoom({ collection: wantCollection, today = '1970-01-01' }) {
  const width = useViewport();
  const units = useProjectStore((s) => s.units);
  const project = useProjectStore((s) => s.project);
  const unitResult = useProjectStore((s) => s.unitResult);
  const selectedElement = useUiStore((s) => s.selectedElement);

  const estimate = useEstimateStore();

  const [active, setActive] = useState('space');
  const [target, setTarget] = useState(null);      // { menu, unitId, ref } — three strings
  const [fullScreen, setFullScreen] = useState(false);
  const [preset, setPreset] = useState('room');
  const [quoteOpen, setQuoteOpen] = useState(false);
  // ─── T61 F1 · WHAT THE SHARED CORE SAID ABOUT THE LAST `+` ───────────────
  //
  // `addUnit` refuses on its RETURN VALUE — it does not push the sentence
  // through the message queue, so `lastEngineWord()` would never see it (PRO
  // reads the return and notifies itself, `LibraryPanel.jsx:128`). This is
  // where the room reads it instead: one string, under the stage, in the third
  // voice every refusal in this app is written in.
  const [said, setSaid] = useState('');
  const handle = useRef(null);
  const booted = useRef(false);

  // ─── A STABLE CALLBACK, AND IT MATTERS MORE THAN IT LOOKS ────────────────
  //
  // `Scene`'s RenderRig holds `onReady` in its effect's dependency list, and
  // its cleanup calls `onReady(null)`. An inline arrow here is a NEW function
  // on every render of this component — so every slider drag, every chip, every
  // store change tore the render handle down and built it again, and with it
  // the walk's own `window.__cc.pbi`. Keep the last GOOD handle: a teardown
  // hands back null, and a null here would take SAVE IMAGE with it.
  //
  // ─── AND IT IS WHERE THE CAMERA IS FINALLY PLACED ────────────────────────
  //
  // MEASURED FAULT, and the frames are what found it. The boot effect parked
  // the camera 350 ms after mount — a guess at when the renderer would have a
  // handle — and on a cold load it does not: `applyPreset` was called with
  // `handle.current === null`, returned nothing, and the client's first sight
  // of the room was Scene's default camera pointing at a bare wall with the
  // wardrobe edge-on at the far left.
  //
  // A timeout cannot know. The HANDLE can: this is called the moment the
  // renderer has one, so the camera is placed then, once, and never again.
  const parked = useRef(false);
  const keepHandle = useCallback((h) => {
    if (!h) return;
    handle.current = h;
    if (parked.current) return;
    parked.current = true;
    // One frame later, so the furniture it is aimed at has bounds to aim at.
    requestAnimationFrame(() => { applyPreset('room', h); });
  }, []);

  const unit = A.designUnit(units);
  const slope = (project?.wallSlopes || []).find((s) => s.kind === 'slope') || null;

  // ─── BOOT ────────────────────────────────────────────────────────────────
  // One wardrobe, in the collection the link named (F2.2 / F6). The store is
  // already memory-only; nothing here reads or writes anybody's disk.
  useEffect(() => {
    if (booted.current) return;
    booted.current = true;

    // ─── THE ROOM OWNS ITS OWN VIEW STATE ────────────────────────────────
    //
    // `main-retail.jsx` turns these off at boot, and that is the right place
    // for it. This is the SECOND place, and it is not redundant: the entry
    // runs once for the whole site, the design room can be entered later by a
    // hash change, and a view flag that depends on which order two modules
    // happened to evaluate in is a flag that will be wrong on somebody's
    // machine. Idempotent setters, run where the stage actually is.
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

    A.startDesign('Bedroom wardrobe');
    if (wantCollection && collectionById(wantCollection)) A.applyCollection(wantCollection);
    estimate.begin('Bedroom wardrobe');
    return undefined;
  }, [wantCollection, estimate]);

  // ─── F3.5 · FULL SCREEN IS A LOOKING MODE ────────────────────────────────
  // *"the return restores EXACTLY the prior state: same active category, same
  // options, same selection, same camera. Nothing resets."*
  useCameraMemory(fullScreen);
  useEffect(() => {
    if (!fullScreen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setFullScreen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullScreen]);

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
  // and the ref is the ENGINE's own panel id. t59 tried to match that ref
  // against the interior items' ids — `ref.includes(String(i.id))` — and it
  // could never succeed: a panel id is positional (`SHELF-1`, `W01-FL`) and an
  // item id is `shelf_` plus seven characters of base 36. So every click in
  // the stage fell through to the placeholder this turn deletes, and the
  // owner's *"jak naciśniemy na drzwi to się pojawi drzwi"* was not true of one
  // element in the room.
  //
  // `adapter.resolveSelection` is the fix and it asks the engine: the computed
  // result's own panels, `elementKind`, and the item the panel names on its own
  // meta. An unmapped kind answers null — and a null CLEARS the selection,
  // because a highlight with no menu behind it is the empty panel by another
  // road.
  useEffect(() => {
    if (fullScreen) { setTarget(null); return; }
    if (!selectedElement) return;                 // a menu opened from the list stays open
    const found = A.resolveSelection(selectedElement);
    if (!found) {
      setTarget(null);
      useUiStore.getState().clearElement?.();
      return;
    }
    setTarget({ menu: found.menu, unitId: found.unitId, ref: found.ref });
  }, [selectedElement, fullScreen]);

  // ─── AND THE TARGET IS RESOLVED FRESH, EVERY RENDER ──────────────────────
  //
  // MEASURED FAULT. Holding the RESOLVED selection in state and rebuilding it
  // whenever the store changed closed any menu that had been opened from the
  // INTERIOR list the instant one of its controls wrote anything — the shelf
  // slider moved the shelf and then vanished. Three strings in state, resolved
  // against the live store here, and a menu's panel and item are never one
  // edit out of date.
  const selection = useMemo(
    () => (target ? A.resolveTarget(target) : null),
    [target, units, project],
  );

  // ─── THE CATEGORY HINTS (PSW's cat-hint) ─────────────────────────────────
  const choices = useMemo(() => describeDesign({ project, units }), [project, units]);

  const hints = useMemo(() => {
    const params = unit?.params || {};
    const items = params.sections?.[0]?.items || [];
    // The engine's own leaf count, so the hint cannot disagree with the stage —
    // and `unit` is null on the very first render, before the boot effect has
    // made one, so it is asked for only when there is something to ask about.
    const doors = (unit && A.doorCount(unit.id))
      || (items.filter((i) => i.kind === 'partition').length + 1);
    const style = FRONT_STYLE_OPTIONS.find((o) => o.id === project?.design?.fronts?.style)?.label;
    const inside = A.interiorCounts(unit);
    const filled = Object.entries(inside).filter(([, n]) => n > 0).length;
    return {
      space: `${Math.round(Math.abs(project?.room?.corners?.[1]?.x ?? 0))} mm wall${slope ? ', sloped' : ''}`,
      layout: `${Math.round(params.width || 0)} mm · ${doors} door${doors === 1 ? '' : 's'}`,
      fronts: style || 'not chosen',
      interior: filled ? `${filled} thing${filled === 1 ? '' : 's'} inside` : 'empty',
      details: project?.design?.fronts?.handle?.type
        ? `${project.design.fronts.handle.type} handles` : 'no handles',
      estimate: `${estimate.designs.length} design${estimate.designs.length === 1 ? '' : 's'}`,
    };
  }, [unit, project, slope, estimate.designs.length]);

  // ─── F5 · THE ESTIMATE'S OWN BUTTONS ─────────────────────────────────────
  const document_ = useCallback(() => {
    estimate.capture();
    return buildEstimateDocument({
      designs: useEstimateStore.getState().designs,
      details: estimate.details,
      isoDate: today,
    });
  }, [estimate, today]);

  const onSave = useCallback(() => {
    downloadJson(estimateFilename(today), document_());
  }, [document_, today]);

  const onQuoteSubmit = useCallback((details) => {
    estimate.setDetails(details);
    const doc = { ...document_(), details };
    downloadJson(estimateFilename(today), doc);
    openMail({ subject: `Estimate request — ${details.name || 'Prime Bespoke Interiors'}`, body: estimateMailBody(doc) });
    setQuoteOpen(false);
  }, [document_, estimate, today]);

  const onLoad = useCallback((file) => {
    readJsonFile(file).then((doc) => useEstimateStore.getState().loadEstimate(doc)).catch(() => {});
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

  const stage = (
    <div className="pbi-stage-col">
      <ViewBar
        preset={preset}
        onPreset={pickPreset}
        doorEntries={doorEntries}
        lightsOn={lightsOn}
        onLights={() => A.setLighting(!lightsOn)}
        onReset={() => pickPreset('room')}
        fullScreen={fullScreen}
        onFullScreen={() => setFullScreen((v) => !v)}
        onBack={() => setFullScreen(false)}
        onSaveImage={() => saveStageImage(handle.current, designName)}
      />
      <Stage
        onHandle={keepHandle}
        // THE RUN-END PLUS adds the neighbour's own type beside it, which is
        // the same call PRO's library makes with the same `{ near, side }`.
        onAddPlus={(point) => setSaid(A.addBesidePlus(point).said)}
        // THE INNER PLUS asks "what goes inside this one" — and retail's answer
        // to that question is the INTERIOR list, which is where PRO's own
        // `setPanelSection('add', true)` sends a joiner. One destination for
        // the question, not two.
        onAddInside={(unitId) => {
          setSaid('');
          setActive('interior');
          const found = A.selectionForMenu('wardrobe', unitId);
          if (found) setTarget({ menu: found.menu, unitId: found.unitId, ref: found.ref });
        }}
      />
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
    >
      {!fullScreen ? (
        <Categories
          active={active}
          onPick={setActive}
          hints={hints}
          onReset={() => { A.startDesign(designName || 'Bedroom wardrobe'); setTarget(null); }}
        />
      ) : null}

      {!fullScreen ? (
        <Options
          active={active}
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
            if (found) setTarget({ menu: found.menu, unitId: found.unitId, ref: found.ref });
          }}
          onQuote={() => setQuoteOpen(true)}
          onSave={onSave}
        />
      ) : null}

      {stage}

      {!fullScreen ? (
        <Detail
          selection={selection}
          onSelect={setTarget}
          unit={unit}
          project={project}
          designName={designName}
          onDesignName={(name) => estimate.rename(estimate.activeId, name)}
          designs={estimate.designs}
          activeId={estimate.activeId}
          onSelectDesign={(id) => estimate.select(id)}
          onRenameDesign={(id, name) => estimate.rename(id, name)}
          onAdd={() => estimate.addDesign((name) => A.startDesign(name), 'Second wardrobe')}
          onQuote={() => setQuoteOpen(true)}
          onSave={onSave}
          onLoad={onLoad}
        />
      ) : null}

      {quoteOpen ? (
        <QuoteOverlay onClose={() => setQuoteOpen(false)} onSubmit={onQuoteSubmit} />
      ) : null}
    </div>
  );
}
