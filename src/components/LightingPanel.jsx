import { useMemo } from 'react';
import Modal from './Modal.jsx';
import { useUiStore } from '../stores/uiStore.js';
import { useProjectStore } from '../stores/projectStore.js';
import { useCabinetProfileStore } from '../stores/cabinetProfileStore.js';
import { migrateDesign } from '../engine/design.js';
import {
  lightingSpec, resolveLighting, stripsForUnit, switchChoicesFor,
} from '../engine/ledStrips.js';
import { getUnitType } from '../engine/types.js';

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

  const units = useProjectStore((s) => s.units);
  const unitResult = useProjectStore((s) => s.unitResult);
  const storedDesign = useProjectStore((s) => s.project.design);
  const setLighting = useProjectStore((s) => s.setLighting);
  const addLightingItem = useProjectStore((s) => s.addLightingItem);
  const updateLightingItem = useProjectStore((s) => s.updateLightingItem);
  const removeLightingItem = useProjectStore((s) => s.removeLightingItem);
  const profile = useCabinetProfileStore((s) => s.profile);

  const design = useMemo(() => migrateDesign(storedDesign), [storedDesign]);
  const spec = lightingSpec(profile);
  const lighting = useMemo(() => resolveLighting(design, profile), [design, profile]);
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
  const unitStrips = useMemo(() => (unit && result ? stripsForUnit({
    unit, result, design, profile,
  }) : []), [unit, result, design, profile]);
  const stripOf = (itemId) => unitStrips.find((s) => s.id === itemId || s.itemId === itemId) || null;

  const hasOf = (kind, ref = null) => lighting.items.some((it) => it.unitId === unit?.id
    && it.kind === kind && (ref == null || it.ref === ref));

  const add = (item, said) => {
    addLightingItem(item);
    notify(said);
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
    >
      <div data-lighting-panel="1" className="space-y-3">
        {/* ─── ON / OFF for the project ──────────────────────────────────── */}
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            data-lighting-enabled
            checked={lighting.enabled}
            onChange={(e) => setLighting({ enabled: e.target.checked })}
          />
          <span className="text-sm text-ink-50">Lighting in this project</span>
        </label>

        {lighting.enabled && (
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

            {/* ─── placements ───────────────────────────────────────────── */}
            <div className="space-y-2 pt-1 border-t border-shell-600">
              <span className="text-[11px] uppercase tracking-wide text-gold">Place a light</span>

              {/* the owner's shelf flow: a REAL click on a shelf in the scene */}
              <div className="flex items-start gap-2" data-lighting-tool="shelf">
                <LightArt kind="shelf" />
                <div className="flex-1 space-y-1">
                  <span className="text-[11px] text-ink-100">{KIND_WORDS.shelf}</span>
                  {shelfPanel && !shelfItem && (
                    <button
                      type="button"
                      className="cc-btn w-full text-[11px]"
                      data-lighting-add-shelf={shelfPanel.id}
                      onClick={() => add(
                        { unitId: unit.id, kind: 'shelf', ref: shelfPanel.id },
                        `LED under ${shelfPanel.id} · ${numOf(unit.id)} — slide it front to back below.`,
                      )}
                    >
                      Add LED under this shelf ({shelfPanel.id})
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
                            disabled={hasOf('side', side)}
                            title="A 4 mm line, top to bottom, on the interior face"
                            onClick={() => add(
                              { unitId: unit.id, kind: 'side', ref: side },
                              `4 mm side line · ${side} · ${numOf(unit.id)}.`,
                            )}
                          >
                            {side === 'L' ? 'Left side' : 'Right side'}
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
                        disabled={hasOf('bottom')}
                        onClick={() => add(
                          { unitId: unit.id, kind: 'bottom' },
                          `Bottom strip at the plinth · ${numOf(unit.id)}.`,
                        )}
                      >
                        Add under {unit.params.unit_num}
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
                        disabled={hasOf('top')}
                        title="Above the cabinet, washing upward — the wardrobe-to-ceiling wash"
                        onClick={() => add(
                          { unitId: unit.id, kind: 'top' },
                          `Top wash · ${numOf(unit.id)}.`,
                        )}
                      >
                        Add above {unit.params.unit_num}
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
                          disabled={hasOf('spot')}
                          title="Small spotlights under a kitchen wall unit, evenly spaced"
                          onClick={() => add(
                            { unitId: unit.id, kind: 'spot', count: spec.spot.defaultCount },
                            `${spec.spot.defaultCount} spotlights under ${numOf(unit.id)}.`,
                          )}
                        >
                          Add {spec.spot.defaultCount} spots under {unit.params.unit_num}
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

            {/* ─── what is placed ───────────────────────────────────────── */}
            {lighting.items.length > 0 && (
              <div className="space-y-1 pt-1 border-t border-shell-600" data-lighting-items={lighting.items.length}>
                <span className="text-[11px] uppercase tracking-wide text-ink-400">
                  Placed · {lighting.items.length}
                </span>
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
                            onChange={(e) => updateLightingItem(it.id, { depth_mm: Number(e.target.value) })}
                          />
                          <span className="text-[10px] text-ink-400 tabular-nums w-14 text-right">
                            {strip.depth_mm} mm
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <p className="text-[10px] text-ink-400 pt-1 border-t border-shell-600">
              Lighting drills nothing: strips and spots are pictures in the scene and NAMED SPEC
              lines in the BOM — yellow until the register knows the articles.
            </p>
          </>
        )}
      </div>
    </Modal>
  );
}
