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
//     CATEGORIES 220 │ OPTIONS 320 │ STAGE (flex) │ DETAIL 300
//     Ivory          │ Soft Ivory  │ Porcelain    │ Warm White
//
// NOTHING FOLDS OPEN IN PLACE. No accordions (the PSW law); the second column
// IS the expansion of the first, and it is always there.

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
    <main
      data-testid="design-too-small"
      style={{
        background: 'var(--pbi-porcelain)',
        padding: '80px var(--pbi-side-margin)',
        minHeight: '60vh',
      }}
    >
      <h1 className="pbi-display pbi-h2">DESIGN ON A LARGER SCREEN</h1>
      <GoldLine />
      <p className="pbi-choice pbi-choice-15" style={{ maxWidth: 460, marginTop: 20 }}>
        The design room needs a wider screen than this one. Send yourself the link and open it on a
        laptop — everything you choose there comes back as an estimate you can keep.
      </p>
      <div style={{ marginTop: 30 }}>
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
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(9,10,9,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 40,
        padding: 24,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: 'var(--pbi-porcelain)',
          border: '1px solid var(--pbi-stone-line)',
          padding: '40px 44px',
          maxWidth: 620,
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <h2 className="pbi-display pbi-h3">REQUEST A QUOTE</h2>
        <GoldLine />
        <p className="pbi-choice pbi-choice-15" style={{ margin: '0 0 28px' }}>
          Your design comes with the message. Nothing is ordered and nothing is charged.
        </p>
        <QuoteForm testid="quote-form" onSubmit={onSubmit} />
        <div style={{ marginTop: 26 }}>
          <button type="button" className="pbi-link" data-testid="quote-close" onClick={onClose}>
            ‹ BACK TO THE DESIGN
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DesignRoom({ collection: wantCollection, today = '1970-01-01' }) {
  const width = useViewport();
  const units = useProjectStore((s) => s.units);
  const project = useProjectStore((s) => s.project);
  const unitResult = useProjectStore((s) => s.unitResult);
  const openFronts = useUiStore((s) => s.openFronts);
  const selectedElement = useUiStore((s) => s.selectedElement);
  const toggleAllFronts = useUiStore((s) => s.toggleAllFronts);

  const estimate = useEstimateStore();

  const [active, setActive] = useState('space');
  const [target, setTarget] = useState(null);
  const [fullScreen, setFullScreen] = useState(false);
  const [preset, setPreset] = useState('room');
  const [quoteOpen, setQuoteOpen] = useState(false);
  const handle = useRef(null);
  const booted = useRef(false);

  // ─── A STABLE CALLBACK, AND IT MATTERS MORE THAN IT LOOKS ────────────────
  //
  // `Scene`'s RenderRig holds `onReady` in its effect's dependency list, and
  // its cleanup calls `onReady(null)`. An inline arrow here is a NEW function
  // on every render of this component — so every slider drag, every chip, every
  // store change tore the render handle down and built it again, and with it
  // the walk's own `window.__cc.pbi`. The acceptance walk found it by reading
  // `undefined` off a handle it had already waited for.
  // Keep the last GOOD handle: a teardown hands back null, and a null here
  // would take SAVE IMAGE with it.
  const keepHandle = useCallback((h) => { if (h) handle.current = h; }, []);

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
    //
    // The acceptance walk is what insisted: it read eight contour lines off a
    // scene whose store said the contours were off, and no amount of staring
    // at boot order explained it. Owning the state here ends the argument.
    const ui = useUiStore.getState();
    ui.setShowDimensions(false);
    ui.setShowOutlines(false);
    ui.setXray(false);
    ui.setContourView(false);
    ui.setRuler(false);
    ui.clearSelection();

    A.startDesign('Bedroom wardrobe');
    if (wantCollection && collectionById(wantCollection)) A.applyCollection(wantCollection);
    estimate.begin('Bedroom wardrobe');
    // The furniture needs one frame to exist before a camera can be aimed at it.
    const id = setTimeout(() => { applyPreset('room', handle.current); }, 350);
    return () => clearTimeout(id);
  }, [wantCollection, estimate]);

  // ─── F3.5 · FULL SCREEN IS A LOOKING MODE ────────────────────────────────
  // *"Return by ⛶, by Esc, or by BACK TO DESIGN — and the return restores
  // EXACTLY the prior state: same active category, same options, same
  // selection, same camera. Nothing resets."*
  //
  // Which is why nothing below is cleared on the way in: `active`, `target`
  // and the selection are simply not rendered while `fullScreen` is true, and
  // are still there when it goes false. The camera is the one thing that is
  // NOT React state, so it is held explicitly.
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

  const doorsOpen = doorEntries.length > 0 && doorEntries.every(
    (e) => e.panelIds.every((id) => (openFronts[e.unitId]?.[id] ?? 0) > 0.5),
  );
  const lightsOn = A.lightingOn(project);

  const pickPreset = useCallback((id) => {
    setPreset(id);
    // INSIDE means doors open AND the camera in (F3.3).
    if (id === 'inside' && !doorsOpen) toggleAllFronts(doorEntries);
    applyPreset(id, handle.current);
  }, [doorEntries, doorsOpen, toggleAllFronts]);

  // ─── F3.3 · A CLICK IN THE STAGE SELECTS ─────────────────────────────────
  // The shared store's own selection, read by retail's own detail column.
  useEffect(() => {
    if (fullScreen || !selectedElement) return;       // looking mode selects nothing
    const ref = String(selectedElement.elementRef || '');
    const items = unit?.params?.sections?.[0]?.items || [];
    const item = items.find((i) => ref.includes(String(i.id))) || null;
    const kind = item?.kind === 'drawer' ? 'drawers'
      : (item?.kind === 'shelf' ? 'shelves' : (item?.kind || 'element'));
    setTarget({ kind, item, panelId: ref });
  }, [selectedElement, fullScreen, unit]);

  // ─── THE CATEGORY HINTS (PSW's cat-hint) ─────────────────────────────────
  const choices = useMemo(
    () => (estimate.activeDesign()
      ? describeDesign({ project, units })
      : describeDesign({ project, units })),
    [project, units],
  );

  const hints = useMemo(() => {
    const params = unit?.params || {};
    const items = params.sections?.[0]?.items || [];
    // The engine's own leaf count, so the hint cannot disagree with the stage.
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
      <main style={{ background: 'var(--pbi-porcelain)', padding: 60 }}>
        <p className="pbi-choice pbi-choice-15">Setting the room out…</p>
      </main>
    );
  }

  const narrow = width < TABLET;

  const stage = (
    <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minWidth: 0 }}>
      <ViewBar
        preset={preset}
        onPreset={pickPreset}
        doorsOpen={doorsOpen}
        onDoors={() => toggleAllFronts(doorEntries)}
        lightsOn={lightsOn}
        onLights={() => A.setLighting(!lightsOn)}
        onReset={() => pickPreset('room')}
        fullScreen={fullScreen}
        onFullScreen={() => setFullScreen((v) => !v)}
        onBack={() => setFullScreen(false)}
        onSaveImage={() => saveStageImage(handle.current, estimate.activeDesign()?.name)}
      />
      <Stage onHandle={keepHandle} />
      {!fullScreen ? (
        <div
          className="pbi-ui pbi-ui-light pbi-quiet"
          data-testid="stage-caption"
          style={{
            padding: '9px 14px',
            background: 'var(--pbi-warm-white)',
            borderTop: '1px solid var(--pbi-stone-line)',
            fontSize: 10,
          }}
        >
          DRAG TO ORBIT · SCROLL TO ZOOM · CLICK AN ELEMENT FOR DETAIL
        </div>
      ) : null}
    </div>
  );

  return (
    <div
      data-testid="design-room"
      data-fullscreen={fullScreen ? 'yes' : 'no'}
      data-narrow={narrow ? 'yes' : 'no'}
      style={{
        display: 'flex',
        flex: '1 1 auto',
        minHeight: 0,
        height: 'calc(100vh - var(--pbi-header-h-room))',
        background: 'var(--pbi-porcelain)',
      }}
    >
      {!fullScreen ? (
        <Categories
          active={active}
          onPick={setActive}
          hints={hints}
          onReset={() => { A.startDesign(estimate.activeDesign()?.name || 'Bedroom wardrobe'); setTarget(null); }}
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
          designName={estimate.activeDesign()?.name || ''}
          onDesignName={(name) => estimate.rename(estimate.activeId, name)}
          onOpenDetail={(kind) => setTarget({ kind })}
          onQuote={() => setQuoteOpen(true)}
          onSave={onSave}
        />
      ) : null}

      {stage}

      {!fullScreen ? (
        <Detail
          target={target}
          onTarget={setTarget}
          unit={unit}
          project={project}
          designs={estimate.designs}
          activeId={estimate.activeId}
          onSelect={(id) => estimate.select(id)}
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
