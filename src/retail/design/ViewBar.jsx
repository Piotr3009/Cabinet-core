import { Fragment } from 'react';
import { useUiStore } from '../../stores/uiStore.js';
// T68 F2 · PRO's own history store. Not a copy, not a mirror: the very store
// `src/components/CanvasToolbar.jsx` reads, so a client's ↺ and a joiner's
// Ctrl+Z are one stack with one depth and one set of rules.
import { useHistoryStore } from '../../stores/historyStore.js';
import { getCabinetProfile } from '../../engine/profile.js';
import { propsAvailable, propsReason, usePropsPack } from '../../3d/propsPack.js';
import { VIEW_TOOLS, WORKSHOP_TOOLS } from './viewTools.js';
import { RETAIL_SHOW_WORKSHOP_TOOLS } from '../config.js';

// ─── T60 F2 · THE VIEW BAR (4) — PRO'S TOOLS, ONE FOR ONE ──────────────────
//
// *"nr 4 musi być identyczne jak mamy w PRO, identyczne ma mieć funkcje."*
//
// The TABLE is `viewTools.js`; this file is the hand that renders it and the
// only place retail speaks to the ui store about a view. Every entry flips the
// SAME field on the SAME shared store PRO's `CanvasToolbar` flips — not a
// retail copy of the flag, not a mirror kept in sync: the identical flag, so a
// view that behaves one way in the workshop behaves that way for the client by
// construction rather than by maintenance.
//
// ─── NO DEAD CONTROL, AND WHAT IT COST ─────────────────────────────────────
//
// Four of PRO's entries — dimensions, front dimensions, outlines and X-ray's
// contour, and the ruler — draw through components that `setProChrome(false)`
// switches off wholesale for the retail mount. Flipping their flags here would
// have changed a boolean and nothing on the glass: the dead control the
// standing law forbids. So `src/3d/chrome.js` gained CHANNELS this turn
// (additive, PRO's behaviour the default, listed in the morning report), the
// entry claims the three the bar needs, and every one of these buttons now
// does what its tooltip says.
//
// ─── STYLING IS PBI'S, NOT PRO'S ───────────────────────────────────────────
//
// UI font, uppercase, 0.18em tracking, hairline separators between the groups,
// the active entry in Deep Gold under a Champagne hairline. The LABELS are
// PRO's own strings — the capitals are `text-transform` — which is what lets
// the test hold this bar up against `CanvasToolbar.jsx` and compare.

function BarButton({
  label, active = false, disabled = false, onClick, testid, title,
}) {
  return (
    <button
      type="button"
      className={`pbi-viewbar-btn${active ? ' is-on' : ''}`}
      data-testid={testid}
      data-active={active ? 'yes' : 'no'}
      title={title}
      disabled={disabled}
      aria-pressed={active}
      onClick={disabled ? undefined : onClick}
    >
      {label}
    </button>
  );
}

/**
 * ─── T65 F2 · THE BRIGHT SLIDER, COPIED FROM PRO'S TOP BAR ─────────────────
 *
 * The owner: *"retail jest za jasna … zapomniałeś o natężeniu naświetlenia —
 * kopia identycznie jak w PRO, włącznie z ustawieniem jasności etc."*
 *
 * PRO's control is `src/components/TopBar.jsx` (T26, the `data-brightness-
 * control` label): a range input over `uiStore.brightness`, bounded by
 * `profile.appearance.studio.brightness` and read back as a percentage. This
 * is that control, 1:1 — the SAME store field, the SAME setter, the SAME three
 * numbers out of the SAME profile block. Only the skin is PBI's.
 *
 * A SLIDER, deliberately. The no-slider law of T62 is about DIMENSIONS — a
 * millimetre is typed, never dragged. Light is not a dimension: it is a look,
 * and a look is exactly what a slider is for. PRO has had it as a slider since
 * T26 and 1:1 means it stays one.
 *
 * WHY THE CLIENT NEEDED IT AT ALL. Nothing in `src/retail/**` sets a lighting
 * number — the rig is `profile.appearance.studio`, read by the one `Scene.jsx`
 * both applications mount, so every lamp already matched. What did NOT match
 * was the one input a JOINER can move and a client could not:
 * `uiStore.brightness`. PRO persists it (`cc.brightness`); the retail mount
 * runs `setPersistence('none')`, so it resolved to the profile default 1.00 on
 * every load with no way down. That is the whole of *"za jasna"*, and this is
 * the whole of the fix.
 */
function BrightSlider() {
  const brightness = useUiStore((s) => s.brightness);
  const setBrightness = useUiStore((s) => s.setBrightness);
  const B = getCabinetProfile().appearance.studio.brightness;
  return (
    <label
      className="pbi-viewbar-bright"
      data-testid="view-bright"
      data-brightness-control="1"
      title="Scales every light in the room together. The balance between them does not move."
    >
      <span className="pbi-viewbar-bright-label">Bright</span>
      <input
        type="range"
        min={B.min}
        max={B.max}
        step={B.step}
        value={brightness}
        data-brightness-value={brightness}
        onChange={(e) => setBrightness(Number(e.target.value))}
      />
      <span className="pbi-viewbar-bright-value">{`${Math.round(brightness * 100)} %`}</span>
    </label>
  );
}

const Sep = () => <span className="pbi-viewbar-sep" aria-hidden="true" />;

export default function ViewBar({
  preset, onPreset, doorEntries, onReset,
  lightsOn, onLights, fullScreen, onFullScreen, onBack, onSaveImage,
}) {
  // Every flag by the name PRO calls it. Subscribed individually so the bar
  // re-renders on exactly the changes it draws.
  const showDimensions = useUiStore((s) => s.showDimensions);
  const showFrontDimensions = useUiStore((s) => s.showFrontDimensions);
  const showOutlines = useUiStore((s) => s.showOutlines);
  const contourView = useUiStore((s) => s.contourView);
  const xray = useUiStore((s) => s.xray);
  const props = useUiStore((s) => s.props);
  const hideFronts = useUiStore((s) => s.hideFronts);
  const rulerOn = useUiStore((s) => s.rulerOn);
  const openFronts = useUiStore((s) => s.openFronts);

  // ─── T68 F2 · READ AS LENGTHS, FOR PRO'S OWN REASON ──────────────────────
  // `CanvasToolbar.jsx`, verbatim: *"Read as LENGTHS rather than through the
  // store's own `canUndo()`, because a selector that calls a function returns
  // a fresh answer every render and zustand would re-render this bar on every
  // frame of every drag."* The same trap, the same way round it.
  const undoDepth = useHistoryStore((s) => s.past.length);
  const redoDepth = useHistoryStore((s) => s.future.length);

  // T58 F8's own fallback, which PRO's toolbar obeys and so does this one:
  // *"ship the toggle GREYED with a one-line reason … nothing throws."*
  const pack = usePropsPack();
  const propsReady = propsAvailable(pack);

  const flags = {
    showDimensions, showFrontDimensions, showOutlines, xray, props, hideFronts, rulerOn,
  };

  const everyDoorOpen = doorEntries.length > 0 && doorEntries.every(
    (e) => e.panelIds.every((id) => (openFronts[e.unitId]?.[id] ?? 0) > 0.5),
  );

  /** Is this entry lit, and if not, is there a sentence saying why it cannot be? */
  const stateOf = (tool) => {
    switch (tool.id) {
      // PRO: `aria-pressed={showOutlines || contourView}`, disabled in contour
      // view because there the outlines ARE the drawing.
      case 'outlines':
        return { on: showOutlines || contourView, off: contourView, why: contourView ? 'Contour view draws nothing but the outlines' : '' };
      case 'xray':
        return { on: xray, off: contourView, why: contourView ? 'Contour view already draws nothing but the outlines' : '' };
      case 'props':
        return { on: props && propsReady, off: !propsReady, why: propsReady ? '' : propsReason(pack) };
      case 'open-all':
        return { on: everyDoorOpen, off: doorEntries.length === 0, why: doorEntries.length ? '' : 'This wardrobe has no doors on it' };
      case 'lights':
        return { on: lightsOn, off: false, why: '' };
      case 'fullscreen':
        return { on: fullScreen, off: false, why: '' };
      case 'reset':
        return { on: false, off: false, why: '' };
      // T68 F2 · GREYED WITH A REASON, never greyed in silence — the standing
      // no-dead-controls law, and PRO's own two sentences for it.
      case 'undo':
        return { on: false, off: undoDepth === 0, why: tool.titleOff };
      case 'redo':
        return { on: false, off: redoDepth === 0, why: tool.titleOff };
      default:
        if (tool.kind === 'preset') return { on: preset === tool.id, off: false, why: '' };
        return { on: Boolean(flags[tool.flag]), off: false, why: '' };
    }
  };

  const press = (tool) => {
    switch (tool.kind) {
      case 'preset': return () => onPreset(tool.id);
      case 'doors': return () => useUiStore.getState().toggleAllFronts(doorEntries);
      case 'lights': return onLights;
      case 'reset': return onReset;
      case 'fullscreen': return onFullScreen;
      // T68 F2 · PRO's two functions, called by name. No second history.
      case 'history': return () => useHistoryStore.getState()[tool.id]();
      default: return () => useUiStore.getState()[tool.action]();
    }
  };

  let lastGroup = null;
  return (
    <div data-testid="view-bar" className="pbi-viewbar">
      {/* F3.5: in full screen the bar stays, plus a way back at its left. */}
      {fullScreen ? (
        <>
          <BarButton label="‹ Back to design" onClick={onBack} testid="view-back" />
          <Sep />
        </>
      ) : null}

      {VIEW_TOOLS.map((tool) => {
        const { on, off, why } = stateOf(tool);
        const rule = lastGroup !== null && tool.group !== lastGroup;
        lastGroup = tool.group;
        // The two that are about the page — RESET VIEW and ⛶ — are pushed to
        // the far right instead of being ruled off from the doors.
        const spacer = tool.group === 'page' && rule;
        return (
          <Fragment key={tool.id}>
            {spacer ? <span className="pbi-viewbar-spacer" /> : null}
            {rule && !spacer ? <Sep /> : null}
            <BarButton
              label={on && tool.labelOn ? tool.labelOn : tool.label}
              active={on}
              disabled={off}
              onClick={press(tool)}
              testid={`view-${tool.id}`}
              title={off ? why : (
                // T68 F2 · PRO puts the depth in the tooltip; so does this.
                tool.id === 'undo' && undoDepth
                  ? `Undo (Ctrl+Z) — ${undoDepth} step${undoDepth === 1 ? '' : 's'} back`
                  : ((on && tool.titleOn) ? tool.titleOn : tool.title)
              )}
            />
          </Fragment>
        );
      })}

      {/* T65 F2 · PRO's BRIGHT slider, on the bar for PRO's own reason: *"it is
          the one lighting control a joiner reaches for while he is looking at
          the picture"* — and the client is doing nothing else. */}
      <Sep />
      <BrightSlider />

      {/* F3.5: *"In this mode the bar also carries SAVE IMAGE."* */}
      {fullScreen ? (
        <BarButton label="Save image" onClick={onSaveImage} testid="view-save-image" />
      ) : null}

      {/* Off, and the flag is the owner's to throw. */}
      {RETAIL_SHOW_WORKSHOP_TOOLS ? (
        <>
          <Sep />
          {WORKSHOP_TOOLS.map((t) => (
            <BarButton key={t.id} label={t.label} title={t.title} testid={`view-${t.id}`} onClick={() => {}} />
          ))}
        </>
      ) : null}
    </div>
  );
}
