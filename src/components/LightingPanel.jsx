import { useMemo } from 'react';
import Modal from './Modal.jsx';
import { useUiStore } from '../stores/uiStore.js';
import { useProjectStore } from '../stores/projectStore.js';
import { useCabinetProfileStore } from '../stores/cabinetProfileStore.js';
import { migrateDesign } from '../engine/design.js';
import {
  lightingSpec, resolveLighting, stripsForUnit, switchChoicesFor,
} from '../engine/ledStrips.js';
// T51 (CLAUDE.md F6): the room's own four lamps — ceiling, left wall, right
// wall, facing — and the one fixed rig every export uses.
import {
  EXPORT_NOTICE, PRESET_IDS, RIG_HINTS, RIG_LABELS, RIG_LAMPS, RIG_PRESETS,
  STRENGTH_MAX, STRENGTH_MIN, STRENGTH_STEP, matchesPreset, migrateLightRig, rigFromPreset,
} from '../engine/lightRig.js';
// T54-F5.3: the scene-light law — one clamp, engine-owned, both readers.
import { SCENE_LIGHT_MAX, SCENE_LIGHT_MIN, sceneLightScale } from '../engine/lighting.js';
import { getUnitType } from '../engine/types.js';
// T37-F1: the piece selection spans cabinets — members are keyed, not bare refs.
import { memberKey } from '../lib/selection.js';

// ─── TURN 33 (CLAUDE.md F1): THE LIGHTING PANEL — the owner's spec ──────────
//
// Top to bottom, exactly his flow: ON/OFF for the project; when ON, the
// choices (colour temperature, switching by project type) and the PLACEMENT
// tools; and "pod tym menu będzie też sporo informacji i może nawet jakaś
// wizualna instrukcja" — each placement kind carries a small instructional
// drawing in the CornerArt grammar the wizard already speaks.
//
// The SHELF interaction is the one he dictated: the user CLICKS A SHELF in the
// scene — the hover/pick machinery that already exists — and this panel offers
// "Add LED under this shelf"; the strip appears and a DEPTH SLIDER positions
// it front-to-back. The panel never raycasts anything itself: it reads the
// same `selectedElement` every other surface reads.
//
// LIGHTING DRILLS NOTHING — every action here writes `design.lighting` and
// nothing else; the 3D draws it emissive and the BOM prints yellow specs.

const KIND_WORDS = {
  shelf: 'Under-shelf strip',
  side: 'Side line (4 mm)',
  bottom: 'Bottom, at the plinth',
  top: 'Top wash',
  top_under: 'Under the top',
  spot: 'Spotlights',
};

/** The small instructional drawings — the wizard's CornerArt grammar. */
function LightArt({ kind }) {
  const stroke = '#8a8172';
  const led = '#c8a24a';
  if (kind === 'shelf') {
    return (
      <svg width="72" height="44" viewBox="0 0 72 44" fill="none" aria-hidden className="opacity-80 shrink-0">
        {/* the shelf, seen from the side, and the strip under it */}
        <rect x="8" y="10" width="56" height="5" stroke={stroke} strokeWidth="1.2" />
        <rect x="40" y="17" width="10" height="3" fill={led} />
        {/* the depth arrow: front edge → strip */}
        <path d="M64 26 L52 26" stroke={stroke} strokeWidth="1" />
        <path d="M55 24 L52 26 L55 28" stroke={stroke} strokeWidth="1" fill="none" />
        <path d="M64 20 L64 30" stroke={stroke} strokeWidth="1" />
        <path d="M8 34 L64 34" stroke={stroke} strokeWidth="0.6" strokeDasharray="2 3" />
      </svg>
    );
  }
  if (kind === 'side') {
    return (
      <svg width="72" height="44" viewBox="0 0 72 44" fill="none" aria-hidden className="opacity-80 shrink-0">
        {/* the carcass, face on; the 4 mm line down one interior face */}
        <rect x="14" y="4" width="44" height="36" stroke={stroke} strokeWidth="1.2" />
        <rect x="19" y="6" width="2.5" height="32" fill={led} />
        <path d="M26 8 L26 36" stroke={stroke} strokeWidth="0.6" strokeDasharray="2 3" />
        <text x="30" y="25" fill={stroke} fontSize="7">4 mm</text>
      </svg>
    );
  }
  if (kind === 'bottom') {
    return (
      <svg width="72" height="44" viewBox="0 0 72 44" fill="none" aria-hidden className="opacity-80 shrink-0">
        {/* the carcass on its legs; the strip at the plinth line */}
        <rect x="14" y="4" width="44" height="26" stroke={stroke} strokeWidth="1.2" />
        <path d="M18 30 L18 38 M54 30 L54 38" stroke={stroke} strokeWidth="1.2" />
        <rect x="22" y="31" width="28" height="3" fill={led} />
        <path d="M14 40 L58 40" stroke={stroke} strokeWidth="0.8" />
      </svg>
    );
  }
  if (kind === 'top') {
    return (
      <svg width="72" height="44" viewBox="0 0 72 44" fill="none" aria-hidden className="opacity-80 shrink-0">
        {/* the wash upward off the carcass top */}
        <rect x="14" y="18" width="44" height="22" stroke={stroke} strokeWidth="1.2" />
        <rect x="22" y="14" width="28" height="3" fill={led} />
        <path d="M26 10 L24 4 M36 10 L36 3 M46 10 L48 4" stroke={led} strokeWidth="1" opacity="0.7" />
      </svg>
    );
  }
  // ─── TURN 48 (CLAUDE.md F7): `top_under` GETS ITS OWN PICTURE ─────────────
  //
  // It had none. The chain of `if`s above ended at `top` and everything after
  // it fell through to the SPOTS drawing at the bottom of this function — and
  // the call site, knowing that, asked for `kind="top"` instead. So the control
  // that puts a strip on the UNDERSIDE of the top board, shining DOWN into the
  // cabinet, was illustrated by a strip sitting ON TOP of it and washing UP the
  // wall. The owner's screenshot is of exactly that.
  //
  // The two are opposites and the drawing has to say so, so this one is the
  // other one turned inside out: the top board is INSIDE the carcass outline,
  // the strip is UNDER it, and the rays go DOWN onto a shelf.
  if (kind === 'top_under') {
    return (
      <svg width="72" height="44" viewBox="0 0 72 44" fill="none" aria-hidden className="opacity-80 shrink-0">
        {/* the carcass, face on, with its TOP BOARD drawn as its own line */}
        <rect x="14" y="4" width="44" height="36" stroke={stroke} strokeWidth="1.2" />
        <path d="M14 11 L58 11" stroke={stroke} strokeWidth="1.2" />
        {/* the strip on the UNDERSIDE of that board — inside the cabinet */}
        <rect x="22" y="12" width="28" height="3" fill={led} />
        {/* …washing DOWN, which is the whole difference from the one above */}
        <path d="M26 19 L24 27 M36 19 L36 29 M46 19 L48 27" stroke={led} strokeWidth="1" opacity="0.7" />
        {/* the shelf it lands on */}
        <path d="M18 33 L54 33" stroke={stroke} strokeWidth="0.6" strokeDasharray="2 3" />
      </svg>
    );
  }
  return (
    <svg width="72" height="44" viewBox="0 0 72 44" fill="none" aria-hidden className="opacity-80 shrink-0">
      {/* a wall unit, spots beneath */}
      <rect x="14" y="4" width="44" height="24" stroke={stroke} strokeWidth="1.2" />
      <circle cx="26" cy="31" r="2.5" fill={led} />
      <circle cx="46" cy="31" r="2.5" fill={led} />
      <path d="M24 35 L22 40 M28 35 L30 40 M44 35 L42 40 M48 35 L50 40" stroke={led} strokeWidth="0.8" opacity="0.7" />
    </svg>
  );
}

export default function LightingPanel() {
  const args = useUiStore((s) => s.modalArgs);
  const closeModal = useUiStore((s) => s.closeModal);
  const notify = useUiStore((s) => s.notify);
  const selectedUnitId = useUiStore((s) => s.selectedUnitId);
  const selectedElement = useUiStore((s) => s.selectedElement);
  // Turn 33 (CLAUDE.md F2) put the demo flag here beside the panel's own
  // checkbox. TURN 35 (CLAUDE.md F10) merged the two into the project's
  // `lighting.on`, read below through resolveLighting — the panel reads the
  // ONE state and nothing else.

  const units = useProjectStore((s) => s.units);
  const unitResult = useProjectStore((s) => s.unitResult);
  const storedDesign = useProjectStore((s) => s.project.design);
  const setLighting = useProjectStore((s) => s.setLighting);
  const addLightingItem = useProjectStore((s) => s.addLightingItem);
  const updateLightingItem = useProjectStore((s) => s.updateLightingItem);
  const updateLightingItemsBulk = useProjectStore((s) => s.updateLightingItemsBulk);
  const removeLightingItem = useProjectStore((s) => s.removeLightingItem);
  // T51 (CLAUDE.md F6 · decision 1): the rig is the PROJECT'S, so it is read
  // and written exactly where the LED spec is.
  const storedRig = useProjectStore((s) => s.project.lightRig);
  const setLightRig = useProjectStore((s) => s.setLightRig);
  // T54-F5.3: the scene light — the project's, clamped by the engine's law.
  const sceneLightRaw = useProjectStore((s) => s.project.sceneLight?.scale);
  const setSceneLight = useProjectStore((s) => s.setSceneLight);
  const sceneScale = sceneLightScale(sceneLightRaw);
  // ─── TURN 36 (CLAUDE.md F2): THE SELECTED STRIPS MOVE AS ONE ──────────────
  //
  // "LED strips: inset and depth to all selected." A strip is not a panel and
  // cannot be Ctrl+clicked in 3-D; what CAN be is the SHELF it runs under, and
  // a shelf strip carries that shelf's panel id in `ref`. So the set the
  // joiner has already ticked names the strips, and dragging any one of their
  // sliders moves the lot — in one write, one undo step, one recompute.
  //
  // A strip outside the selection is edited alone, exactly as it always was.
  const selectedElements = useUiStore((s) => s.selectedElements);
  const selectedUnit = useUiStore((s) => s.selectedElement?.unitId) || null;
  const profile = useCabinetProfileStore((s) => s.profile);

  const design = useMemo(() => migrateDesign(storedDesign), [storedDesign]);
  const rig = useMemo(() => migrateLightRig(storedRig), [storedRig]);
  const spec = lightingSpec(profile);
  const lighting = useMemo(() => resolveLighting(design, profile), [design, profile]);
  /** The strips this edit reaches: the whole ticked set, or the one in hand. */
  // ─── TURN 37 (CLAUDE.md F1): …AND ACROSS CABINETS ───────────────────────
  // The set is `{unitId, elementRef}` members now, so a strip in the wardrobe
  // next door is reached by the same slider. `selectedUnit` stays as the
  // PRIMARY's cabinet and is no longer the boundary of the edit.
  const strippedSet = (it) => {
    const set = Array.isArray(selectedElements) ? selectedElements : [];
    if (set.length < 2 || !set.includes(memberKey(it.unitId, it.ref))) return [it.id];
    const ids = lighting.items
      .filter((x) => x.kind === it.kind && set.includes(memberKey(x.unitId, x.ref)))
      .map((x) => x.id);
    return ids.length ? ids : [it.id];
  };
  const setInset = (it, v) => updateLightingItemsBulk(strippedSet(it), { inset_mm: v });
  const setDepth = (it, v) => updateLightingItemsBulk(strippedSet(it), { depth_mm: v });
  const switches = switchChoicesFor(design.projectType);

  const unit = units.find((u) => u.id === selectedUnitId) || null;
  const unitType = unit ? getUnitType(unit.type) : null;
  const result = unit ? unitResult(unit.id) : null;

  // The clicked SHELF, if the scene's selection is one — the owner's flow.
  const shelfPanel = useMemo(() => {
    if (!selectedElement || !result) return null;
    const p = result.panels.find((x) => x.id === selectedElement.elementRef);
    return p && p.part === 'SHELF' && p.role === 'shelf' ? p : null;
  }, [selectedElement, result]);
  const shelfItem = shelfPanel
    ? lighting.items.find((it) => it.unitId === unit?.id && it.kind === 'shelf' && it.ref === shelfPanel.id)
    : null;

  // The placed strips of the selected unit, for the depth sliders' clamps.
  // T45 F9a: `stripsForUnit` answers nothing while the light is off, and OFF is
  // a PREVIEW now — the lines are still there and still editable. So the read
  // forces the flag on. It is a read of the GEOMETRY; no stored field moves,
  // and `engine/ledStrips.js` is untouched (iron rule 2).
  const litDesign = useMemo(
    () => ({ ...design, lighting: { ...design.lighting, on: true } }),
    [design],
  );
  const unitStrips = useMemo(() => (unit && result ? stripsForUnit({
    unit, result, design: litDesign, profile,
  }) : []), [unit, result, litDesign, profile]);
  const stripOf = (itemId) => unitStrips.find((s) => s.id === itemId || s.itemId === itemId) || null;

  // ─── TURN 48 (CLAUDE.md F6): ONE BUTTON, BOTH WAYS ────────────────────────
  //
  // The owner, 25.08.2026: *"mamy przycisk dodania LED, to i ten sam przycisk
  // usuwa LED — proste."*
  //
  // Every placement control here was `disabled={hasOf(…)}`: press it once and
  // it went grey, and the only way back was to find the line in the list below
  // and press its ×. A control that does a thing and then refuses to undo it is
  // a control with half a job. So the SAME button removes what it added, and it
  // says which it is going to do.
  //
  // Nothing new is built: `removeLightingItem` has existed since T33 and is
  // what the list's own × calls. What is new is that the button knows the item
  // it made — `itemOf`, which is the `hasOf` this panel already had, answering
  // WHICH rather than WHETHER.
  const itemOf = (kind, ref = null) => lighting.items.find((it) => it.unitId === unit?.id
    && it.kind === kind && (ref == null || it.ref === ref)) || null;
  const hasOf = (kind, ref = null) => Boolean(itemOf(kind, ref));

  const add = (item, said) => {
    addLightingItem(item);
    notify(said);
  };

  /**
   * The toggle itself. `make()` is called only when there is nothing there, so
   * a control whose item is expensive to describe does not build it to throw it
   * away — and the two sentences are the two things that just happened, said in
   * the tense the joiner will read them in.
   */
  const toggle = (kind, ref, make, added, removed) => {
    const there = itemOf(kind, ref);
    if (there) {
      removeLightingItem(there.id);
      notify(removed);
      return;
    }
    add(make(), added);
  };

  // The items list, labelled by unit number so two wardrobes read apart.
  const numOf = (unitId) => {
    const u = units.find((x) => x.id === unitId);
    return u?.params?.unit_num || '?';
  };

  return (
    <Modal
      name="lighting"
      title="Lighting"
      onClose={closeModal}
      anchor={args?.anchor || null}
      width="w-[360px]"
      // The owner's flow: the panel stands open while the hand works the
      // scene — a shelf is CLICKED with this window up (Modal's own note).
      sticky
    >
      <div data-lighting-panel="1" className="space-y-3">
        {/* ─── TURN 35 (CLAUDE.md F10): INTERNAL LIGHTS — ON / OFF ────────────
            The owner crossed BOTH checkboxes off the screenshot and drew this
            pair in their place: *"te 2 funkcje usuń i na to miejsce dodaj duże
            zielony i czerwony przycisk ON i OFF — internal lights"*. So
            "Lighting in this project" and "Turn on the light" are gone and the
            two flags they wrote are ONE — `design.lighting.on`, persisted and
            migrated (engine/design.js migrateLighting). ON: the room dims, the
            placed LEDs shine, halo and lamps come up. OFF: dark.
            The colours are the house's own status pair, never a raw hex. */}
        <div className="flex gap-2" data-lighting-onoff="1">
          <button
            type="button"
            data-lighting-on
            // The T33 walk clicks this hook to light the project up; it now
            // lands on the ON button, which is the same act.
            data-lighting-enabled
            aria-pressed={lighting.on}
            className={`flex-1 h-11 rounded border text-base font-semibold tracking-wide ${
              lighting.on
                ? 'bg-status-ok border-status-ok text-shell-900'
                : 'border-shell-600 text-ink-400 hover:border-ink-200'
            }`}
            onClick={() => setLighting({ on: true })}
          >
            ON
          </button>
          <button
            type="button"
            data-lighting-off
            aria-pressed={!lighting.on}
            className={`flex-1 h-11 rounded border text-base font-semibold tracking-wide ${
              lighting.on
                ? 'border-shell-600 text-ink-400 hover:border-ink-200'
                : 'bg-status-danger border-status-danger text-shell-900'
            }`}
            onClick={() => setLighting({ on: false })}
          >
            OFF
          </button>
        </div>
        {/* ─── TURN 45 (CLAUDE.md F9a): ON/OFF IS A PREVIEW ─────────────────
            *"The Lighting menu is ALWAYS alive. ON/OFF is a PREVIEW (room dim)
            only — at OFF you still place, see and edit LED lines on
            carcasses."*

            T35 gave the owner his two big buttons and T33's whole panel folded
            away behind them: at OFF there was no temperature, no switching, no
            placement tools and no list — so turning the preview off to look at
            the carcass in daylight meant losing the controls that put the light
            on it. The flag never meant "there is no lighting in this project";
            it meant "show me the room dark". So it dims the room, and nothing
            else on this panel depends on it. */}
        <p className="text-[10px] text-ink-400" data-lighting-preview-note="1">
          A PREVIEW: ON dims the room so the placed LEDs read. The lines below are placed, seen and edited
          either way.
        </p>


        <>
            {/* ─── the choices ──────────────────────────────────────────── */}
            <div className="space-y-1">
              <span className="text-[11px] uppercase tracking-wide text-ink-400">Colour temperature</span>
              <div className="flex gap-1">
                {spec.temperatures.map((t) => (
                  <button
                    key={t.k}
                    type="button"
                    className={`cc-btn px-2 text-[11px] ${lighting.temperature === t.k ? 'border-gold text-ink-50' : ''}`}
                    data-lighting-temp={t.k}
                    title={t.hint}
                    onClick={() => setLighting({ temperature: t.k })}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-ink-400">
                4000 K is the default — owner to confirm (15.08.2026). The list is a profile line.
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] uppercase tracking-wide text-ink-400">Switching</span>
              <div className="flex gap-1">
                {switches.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={`cc-btn px-2 text-[11px] ${lighting.switch === c.id ? 'border-gold text-ink-50' : ''}`}
                    data-lighting-switch={c.id}
                    title={c.hint}
                    onClick={() => setLighting({ switch: c.id })}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ─── TURN 35 (CLAUDE.md F10) ────────────────────────────────
                T33-F2's "Turn on the light" checkbox stood here. It is the
                second of the owner's two crossed-out boxes: its flag is the ON
                button above now, and the View menu's twin control writes the
                same one state. */}

            {/* ─── placements ───────────────────────────────────────────── */}
            <div className="space-y-2 pt-1 border-t border-shell-600">
              <span className="text-[11px] uppercase tracking-wide text-gold">Place a light</span>

              {/* the owner's shelf flow: a REAL click on a shelf in the scene */}
              <div className="flex items-start gap-2" data-lighting-tool="shelf">
                <LightArt kind="shelf" />
                <div className="flex-1 space-y-1">
                  <span className="text-[11px] text-ink-100">{KIND_WORDS.shelf}</span>
                  {shelfPanel && (
                    <button
                      type="button"
                      className="cc-btn w-full text-[11px]"
                      data-lighting-add-shelf={shelfPanel.id}
                      data-lighting-on={shelfItem ? '1' : '0'}
                      onClick={() => toggle(
                        'shelf', shelfPanel.id,
                        () => ({ unitId: unit.id, kind: 'shelf', ref: shelfPanel.id }),
                        `LED under ${shelfPanel.id} · ${numOf(unit.id)} — slide it front to back below.`,
                        `LED removed from ${shelfPanel.id} · ${numOf(unit.id)}.`,
                      )}
                    >
                      {shelfItem ? 'Remove LED' : 'Add LED'} under this shelf ({shelfPanel.id})
                    </button>
                  )}
                  {shelfPanel && shelfItem && (
                    <p className="text-[10px] text-ink-400">
                      This shelf carries a strip — its depth slider is in the list below.
                    </p>
                  )}
                  {!shelfPanel && (
                    <p className="text-[10px] text-ink-400">
                      Click a shelf in the scene, then add the strip under it. The slider sets how
                      deep it sits.
                    </p>
                  )}
                </div>
              </div>

              {/* the unit tools — the rest of the owner's kinds */}
              {unit ? (
                <>
                  <div className="flex items-start gap-2" data-lighting-tool="side">
                    <LightArt kind="side" />
                    <div className="flex-1 space-y-1">
                      <span className="text-[11px] text-ink-100">{KIND_WORDS.side} · {unit.params.unit_num}</span>
                      <div className="flex gap-1">
                        {['L', 'R'].map((side) => (
                          <button
                            key={side}
                            type="button"
                            className="cc-btn px-2 text-[11px] flex-1"
                            data-lighting-add-side={side}
                            data-lighting-on={hasOf('side', side) ? '1' : '0'}
                            title="A 4 mm line, top to bottom, on the interior face"
                            onClick={() => toggle(
                              'side', side,
                              () => ({ unitId: unit.id, kind: 'side', ref: side }),
                              `4 mm side line · ${side} · ${numOf(unit.id)}.`,
                              `Side line removed · ${side} · ${numOf(unit.id)}.`,
                            )}
                          >
                            {hasOf('side', side) ? 'Remove ' : 'Add '}
                            {side === 'L' ? 'left side' : 'right side'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2" data-lighting-tool="bottom">
                    <LightArt kind="bottom" />
                    <div className="flex-1 space-y-1">
                      <span className="text-[11px] text-ink-100">{KIND_WORDS.bottom}</span>
                      <button
                        type="button"
                        className="cc-btn w-full text-[11px]"
                        data-lighting-add-bottom="1"
                        data-lighting-on={hasOf('bottom') ? '1' : '0'}
                        onClick={() => toggle(
                          'bottom', null,
                          () => ({ unitId: unit.id, kind: 'bottom' }),
                          `Bottom strip at the plinth · ${numOf(unit.id)}.`,
                          `Bottom strip removed · ${numOf(unit.id)}.`,
                        )}
                      >
                        {hasOf('bottom') ? 'Remove from' : 'Add under'} {unit.params.unit_num}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-start gap-2" data-lighting-tool="top">
                    <LightArt kind="top" />
                    <div className="flex-1 space-y-1">
                      <span className="text-[11px] text-ink-100">{KIND_WORDS.top}</span>
                      <button
                        type="button"
                        className="cc-btn w-full text-[11px]"
                        data-lighting-add-top="1"
                        data-lighting-on={hasOf('top') ? '1' : '0'}
                        title="Above the cabinet, washing upward — the wardrobe-to-ceiling wash"
                        onClick={() => toggle(
                          'top', null,
                          () => ({ unitId: unit.id, kind: 'top' }),
                          `Top wash · ${numOf(unit.id)}.`,
                          `Top wash removed · ${numOf(unit.id)}.`,
                        )}
                      >
                        {hasOf('top') ? 'Remove above' : 'Add above'} {unit.params.unit_num}
                      </button>
                    </div>
                  </div>

                  {/* CHAT-FIX 16.08 (owner): "mamy ledy na górnym wieńcu, ale
                      od góry tylko — a nie ma od dołu jak półka" — the same
                      strip on the UNDERSIDE of the top, shining down. */}
                  <div className="flex items-start gap-2" data-lighting-tool="top_under">
                    {/* T48-F7: its OWN drawing — it used to borrow `top`'s, which
                        shows a strip washing UP off the carcass. */}
                    <LightArt kind="top_under" />
                    <div className="flex-1 space-y-1">
                      <span className="text-[11px] text-ink-100">{KIND_WORDS.top_under}</span>
                      <button
                        type="button"
                        className="cc-btn w-full text-[11px]"
                        data-lighting-add-top-under="1"
                        data-lighting-on={hasOf('top_under') ? '1' : '0'}
                        title="On the underside of the top board, shining down into the cabinet — the top behaves like one more shelf"
                        onClick={() => toggle(
                          'top_under', null,
                          () => ({ unitId: unit.id, kind: 'top_under' }),
                          `Under-the-top strip · ${numOf(unit.id)}.`,
                          `Under-the-top strip removed · ${numOf(unit.id)}.`,
                        )}
                      >
                        {hasOf('top_under') ? 'Remove from' : 'Add under'} the top · {unit.params.unit_num}
                      </button>
                    </div>
                  </div>

                  {unitType?.mount === 'wall' && (
                    <div className="flex items-start gap-2" data-lighting-tool="spot">
                      <LightArt kind="spot" />
                      <div className="flex-1 space-y-1">
                        <span className="text-[11px] text-ink-100">{KIND_WORDS.spot}</span>
                        <button
                          type="button"
                          className="cc-btn w-full text-[11px]"
                          data-lighting-add-spot="1"
                          data-lighting-on={hasOf('spot') ? '1' : '0'}
                          title="Small spotlights under a kitchen wall unit, evenly spaced"
                          onClick={() => toggle(
                            'spot', null,
                            () => ({ unitId: unit.id, kind: 'spot', count: spec.spot.defaultCount }),
                            `${spec.spot.defaultCount} spotlights under ${numOf(unit.id)}.`,
                            `Spotlights removed from ${numOf(unit.id)}.`,
                          )}
                        >
                          {hasOf('spot')
                            ? `Remove the spots under ${unit.params.unit_num}`
                            : `Add ${spec.spot.defaultCount} spots under ${unit.params.unit_num}`}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-[10px] text-ink-400">
                  Select a cabinet in the scene for the side line, the bottom, the top wash and the
                  spots — the strip goes where the selection is.
                </p>
              )}
            </div>

            {/* ─── TURN 54 (CLAUDE.md F5.3): THE SCENE LIGHT, UNDER THE LED ──
                The owner: "ustawienie światła pokoju, czyli sceny, poniżej
                LED." One slider, the PROJECT's (0.4×–1.5×, default 1.0 over
                the studio's baseGain 0.75). It turns the live room lamps up
                and down together; the T51 iron rule stands: renders and PDFs
                ignore it — the fixed rig only. */}
            <div className="space-y-1 pt-1 border-t border-shell-600" data-scene-light="1">
              <span className="text-[11px] uppercase tracking-wide text-ink-400">
                Scene light
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={SCENE_LIGHT_MIN}
                  max={SCENE_LIGHT_MAX}
                  step={0.05}
                  value={sceneScale}
                  data-scene-light-slider="1"
                  className="flex-1 accent-gold"
                  onChange={(e) => setSceneLight({ scale: Number(e.target.value) })}
                />
                <span className="text-[11px] text-ink-300 w-10 text-right" data-scene-light-read="1">
                  {sceneScale.toFixed(2)}×
                </span>
              </div>
              <p className="text-[10px] text-ink-400">
                The room&apos;s own light, saved with the project. Renders and PDFs ignore this
                slider — they always use the one fixed rig.
              </p>
            </div>

            {/* ─── what is placed ───────────────────────────────────────── */}
            {lighting.items.length > 0 && (
              <div className="space-y-1 pt-1 border-t border-shell-600" data-lighting-items={lighting.items.length}>
                <span className="text-[11px] uppercase tracking-wide text-ink-400">
                  Placed · {lighting.items.length}
                </span>
                {/* ─── CHAT-FIX 16.08 (owner): ONE SLIDER, ALL STRIPS ──────
                    "przesuwanie pasków ma być na każdej szafie tak samo —
                    jeden przesuwak i wszystkie się przesuwają". The master
                    writes the SAME inset onto EVERY placed strip in the
                    project (spots have no edge). It shows the common value
                    when they agree and the default when they differ; the
                    per-strip rows below still override one at a time. */}
                {(() => {
                  const strips = lighting.items.filter(
                    // The plinth line is pinned at the profile's 10 (owner,
                    // 16.08) — the master leaves it alone, like the spots.
                    (i) => i.kind !== 'spot' && i.kind !== 'bottom',
                  );
                  if (!strips.length) return null;
                  const first = strips[0].inset_mm ?? spec.strip.insetDefault;
                  const common = strips.every(
                    (i) => (i.inset_mm ?? spec.strip.insetDefault) === first,
                  ) ? first : null;
                  // ─── TURN 36 (CLAUDE.md F2): ONE WRITE, ONE UNDO STEP ─
                  // This looped `updateLightingItem`, which wrote the design
                  // once per strip — a twelve-strip job cost twelve undo
                  // steps and twelve recomputes for one drag of one slider.
                  const setAll = (v) => updateLightingItemsBulk(
                    strips.map((i) => i.id), { inset_mm: v },
                  );
                  return (
                    <div className="flex items-center gap-2 pb-1" data-lighting-inset-all="1">
                      <span className="text-[10px] text-ink-400 shrink-0">All strips, off the edge</span>
                      <input
                        type="range"
                        className="flex-1 accent-gold"
                        min={0}
                        max={spec.strip.insetMax}
                        step={10}
                        value={common ?? spec.strip.insetDefault}
                        onChange={(e) => setAll(Number(e.target.value))}
                      />
                      <input
                        type="number"
                        className="cc-input w-16 text-right"
                        min={0}
                        step={1}
                        value={common ?? ''}
                        placeholder="—"
                        onChange={(e) => setAll(Number(e.target.value))}
                      />
                      <span className="text-[10px] text-ink-400">mm</span>
                    </div>
                  );
                })()}
                {lighting.items.map((it) => {
                  const strip = it.unitId === unit?.id ? stripOf(it.id) : null;
                  return (
                    <div key={it.id} className="text-[11px] text-ink-100" data-lighting-item={it.id}>
                      <div className="flex items-center gap-1">
                        <span className="flex-1">
                          {numOf(it.unitId)} · {KIND_WORDS[it.kind]}
                          {it.kind === 'shelf' ? ` · ${it.ref}` : ''}
                          {it.kind === 'side' ? ` · ${it.ref}` : ''}
                          {it.kind === 'spot' ? ` · ${it.count || spec.spot.defaultCount} pcs` : ''}
                        </span>
                        <button
                          type="button"
                          className="cc-btn-ghost px-2"
                          data-lighting-remove={it.id}
                          title="Take this light out"
                          onClick={() => removeLightingItem(it.id)}
                        >
                          ×
                        </button>
                      </div>
                      {/* the owner's depth slider — front to back under its shelf */}
                      {it.kind === 'shelf' && strip && (
                        <div className="flex items-center gap-2 pl-1">
                          <input
                            type="range"
                            className="flex-1 accent-gold"
                            min={0}
                            max={strip.depth_max}
                            step={5}
                            value={strip.depth_mm}
                            data-lighting-depth={it.id}
                            aria-label="How deep the LED sits under the shelf"
                            onChange={(e) => setDepth(it, Number(e.target.value))}
                          />
                          <span className="text-[10px] text-ink-400 tabular-nums w-14 text-right">
                            {strip.depth_mm} mm
                          </span>
                        </div>
                      )}
                      {/* ─── TURN 34 (CLAUDE.md F2): HOW FAR OFF THE EDGE ───
                          The owner, 16.08.2026: "nie ma możliwości ustawienia
                          jak daleko od edge". A number field BESIDE the depth
                          control, on EVERY kind — the depth slider only ever
                          answered for shelves. Blank/0 is T33's own placement,
                          so nothing moves until he types in it.
                          CHAT-FIX 16.08 (owner): the field was gated on
                          `strip`, i.e. it VANISHED whenever the item's unit
                          was not the selected one — "modal się zwija …
                          klient tego nigdy nie zobaczy". The value lives on
                          the ITEM, not on the computed strip, so the field
                          stands for every placed line, always. Only the
                          depth slider still needs the computed strip (its
                          clamp does). Spots have no edge to be off. */}
                      {it.kind !== 'spot' && it.kind !== 'bottom' && (
                        <div className="flex items-center gap-2 pl-1">
                          <span className="text-[10px] text-ink-400 shrink-0">Off the front edge</span>
                          {/* CHAT-FIX 16.08 (owner): *"paski co 10 mm są
                              lepsze — przesuwki plus pole do wpisywania"* —
                              a 10 mm slider BESIDE the field. The value shown
                              is the EFFECTIVE one: no answer = the profile's
                              80 default (variant A, his word: "default 80 mm
                              wszystkie"), an explicit 0 = flush at the edge. */}
                          <input
                            type="range"
                            className="flex-1 accent-gold"
                            min={0}
                            max={spec.strip.insetMax}
                            step={10}
                            value={it.inset_mm ?? spec.strip.insetDefault}
                            data-lighting-inset-slider={it.id}
                            aria-label="How far back from the front edge the LED sits"
                            onChange={(e) => setInset(it, Number(e.target.value))}
                          />
                          <input
                            type="number"
                            className="cc-input w-16 text-right"
                            min={0}
                            step={1}
                            value={it.inset_mm ?? spec.strip.insetDefault}
                            data-lighting-inset={it.id}
                            aria-label="How far back from the front edge the LED sits"
                            onChange={(e) => setInset(it, Number(e.target.value))}
                          />
                          <span className="text-[10px] text-ink-400">mm</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <p className="text-[10px] text-ink-400 pt-1 border-t border-shell-600">
              A line is a picture in the scene and a purchase line in the BOM. What is CUT under it — the
              4 mm flexi slot, or the channel width you set — is chosen on settings tab 5.6.
            </p>

        {/* ─── TURN 58 (CLAUDE.md F7.2): THE ROOM MOVES TO THE BOTTOM ─────
            The strip controls are what a joiner came here to use; the four
            room lamps and the room light are the SET DRESSING he adjusts
            once and leaves alone. They stood at the top, so every visit
            scrolled past them to reach the work.

            ORDER ONLY. Not one control is added, removed or renamed — this
            is the same block, verbatim, moved below the strips with its own
            divider. Every `data-` hook it carries is untouched, which is
            what lets the existing tests go on finding it exactly as they
            did. */}
        {/* ─── TURN 51 (CLAUDE.md F6): THE ROOM'S OWN LAMPS ────────────────
            The owner, 26.08.2026: *"robimy w Light coś na wzór pokoju, czyli
            lewa ściana, sufit i prawa ściana, i wtedy włącz/wyłącz światło
            poszczególną lampę."*

            Four lamps in the order you meet them standing in the room, each
            with a switch and a strength. Nothing is invented: the mapping onto
            the rig that is already there is `engine/lightRig.js`'s, and this
            panel drives it.

            DECISION 2, taken for him at the top of CLAUDE.md: a lamp has ON/OFF
            and a strength and does NOT slide along its wall. Position stays the
            rig's arithmetic. */}
        <div className="space-y-2" data-light-rig="1">
          <div className="cc-row">
            <span className="text-[11px] uppercase tracking-wide text-ink-400">The room</span>
            <span className="flex-1" />
            <span className="text-[10px] text-ink-500">
              {matchesPreset(rig) ? RIG_PRESETS[rig.preset].label : `${RIG_PRESETS[rig.preset].label} · tuned`}
            </span>
          </div>

          {/* The PRESETS — a starting point, and then he tunes. */}
          <div className="flex gap-1 flex-wrap" data-light-presets="1">
            {PRESET_IDS.map((id) => (
              <button
                key={id}
                type="button"
                data-light-preset={id}
                title={RIG_PRESETS[id].hint}
                aria-pressed={rig.preset === id && matchesPreset(rig)}
                className={`cc-btn px-2 text-[11px] ${
                  rig.preset === id && matchesPreset(rig) ? 'border-gold text-ink-50' : ''}`}
                onClick={() => setLightRig(rigFromPreset(id))}
              >
                {RIG_PRESETS[id].label}
              </button>
            ))}
          </div>

          <ul className="space-y-1" data-light-lamps="1">
            {RIG_LAMPS.map((id) => {
              const on = rig.lamps[id].on;
              return (
                <li key={id} className="border border-shell-600 rounded p-2 space-y-1" data-light-lamp={id}>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      data-light-switch={id}
                      aria-pressed={on}
                      title={on ? `Turn the ${RIG_LABELS[id].toLowerCase()} off` : `Turn the ${RIG_LABELS[id].toLowerCase()} on`}
                      className={`w-11 h-6 rounded-full border shrink-0 relative transition-colors ${
                        on ? 'bg-status-ok border-status-ok' : 'border-shell-600 bg-shell-800'}`}
                      onClick={() => setLightRig({ lamps: { [id]: { ...rig.lamps[id], on: !on } } })}
                    >
                      <span
                        className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${
                          on ? 'left-6 bg-shell-900' : 'left-0.5 bg-ink-400'}`}
                      />
                    </button>
                    <span className="text-sm text-ink-50 flex-1">{RIG_LABELS[id]}</span>
                    <span className="text-[11px] text-ink-400 tabular-nums w-10 text-right" data-light-strength-read={id}>
                      {on ? `${Math.round(rig.lamps[id].strength * 100)}%` : 'off'}
                    </span>
                  </div>
                  <p className="text-[10px] text-ink-500 leading-snug">{RIG_HINTS[id]}</p>
                  <input
                    type="range"
                    className="w-full"
                    data-light-strength={id}
                    min={STRENGTH_MIN}
                    max={STRENGTH_MAX}
                    step={STRENGTH_STEP}
                    value={rig.lamps[id].strength}
                    disabled={!on}
                    aria-label={`${RIG_LABELS[id]} strength`}
                    onChange={(e) => setLightRig({
                      lamps: { [id]: { ...rig.lamps[id], strength: Number(e.target.value) } },
                    })}
                  />
                </li>
              );
            })}
          </ul>

          {/* ─── AND THE ONE LINE THAT HAS TO BE SAID (CLAUDE.md F6) ────────
              *"THE EXPORT IGNORES THE PANEL … Say this in the panel, in one
              line."*  Here it is, and it is not a footnote in grey nobody
              reads: a joiner who has just made the room moody needs to know
              his client's render did not move. */}
          <p
            className="text-[10px] px-2 py-1 rounded border border-gold/40 bg-gold/5 text-ink-300 leading-snug"
            data-light-export-note="1"
          >
            {EXPORT_NOTICE}
          </p>
        </div>

        <div className="cc-divider" />
        </>
      </div>
    </Modal>
  );
}
