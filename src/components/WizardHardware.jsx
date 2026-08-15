import { useMemo } from 'react';
import { useProjectStore } from '../stores/projectStore.js';
import { useCabinetProfileStore } from '../stores/cabinetProfileStore.js';
import { useMaterialAssignmentStore } from '../stores/materialAssignmentStore.js';
import { migrateDesign, projectHeights } from '../engine/design.js';
import { hardwareVariant, projectFrontThickness } from '../engine/projectSettings.js';
import { hingeAutomat } from '../engine/hinges.js';
import { registerLookup } from '../lib/hardwareRegister.js';

// ─── TURN 32 (CLAUDE.md F2): HARDWARE AS ITS OWN STEP 5 ─────────────────────
//
// The owner: settings screens that scroll get half-read and mis-filled; the
// client-facing choices and the workshop choices are two different heads. So
// the ironmongery leaves the settings screen and becomes this — small, always
// fully pre-filled from the saved set / defaults, under ten seconds for a
// returning user:
//
//   · METAL COLOUR — chrome / onyx / gold. It writes the existing family
//     choice (`design.hardware.shelfSleeve`); the rail already follows it.
//   · SOFT-CLOSE — yes / no. Ships YES (profile default, marked "owner to
//     confirm 15.08"; the question travels with the PR as Q1).
//   · PLINTH — a read-only summary: the height from step 4, and the automatic
//     materials line. Clips + connectors are counted from FRONT LEGS ONLY
//     (engine/legs.js `frontLegCount`), per unit, by the engine.
//
// Nothing else. The AUTOMAT line at the bottom shows what those two answers
// buy for a standard door — the same `hingeAutomat` the BOM orders from — so
// the step is honest about what it just decided.

const METAL_CHOICES = ['chrome', 'onyx', 'gold'];

export default function WizardHardware() {
  const storedDesign = useProjectStore((s) => s.project.design);
  const setShelfSleeve = useProjectStore((s) => s.setShelfSleeve);
  const setProjectDefaults = useProjectStore((s) => s.setProjectDefaults);
  const profile = useCabinetProfileStore((s) => s.profile);
  const materials = useMaterialAssignmentStore((s) => s.materials);

  const design = useMemo(() => migrateDesign(storedDesign), [storedDesign]);
  const heights = useMemo(() => projectHeights(design, profile), [design, profile]);
  const metals = profile.appearance.metals;
  const metal = design.hardware.shelfSleeve || profile.appearance.metalDefault;
  const softClose = hardwareVariant(design, profile, 'hinges') === 'soft-close';

  const automat = useMemo(() => hingeAutomat({
    frontThickness: projectFrontThickness(design, profile, materials),
    metal,
    softClose,
  }, { profile, lookup: registerLookup }), [design, profile, materials, metal, softClose]);

  const plinthSetting = design.runMaterials.plinth;
  const plinthBoard = materials.find((m) => m.id === plinthSetting.material_id) || null;
  const plinthMaterial = plinthSetting.sameAsFronts
    ? 'Same as fronts (default)'
    : (plinthBoard ? plinthBoard.name : 'Same as fronts (default)');

  return (
    <div className="space-y-4" data-wizard-hardware="1">
      {/* ── metal colour — writes the family choice the rail already follows ── */}
      <div>
        <span className="block text-[10px] uppercase tracking-wide text-ink-400 mb-1">Metal colour</span>
        <div className="flex gap-2" data-shelf-sleeve="1">
          {METAL_CHOICES.map((id) => {
            const m = metals[id];
            if (!m) return null;
            return (
              <button
                key={id}
                type="button"
                className={`cc-btn px-3 flex items-center gap-2 ${metal === id ? 'border-gold text-gold' : ''}`}
                data-metal-option={id}
                onClick={() => setShelfSleeve(id)}
              >
                <span
                  className="w-3 h-3 rounded-full border border-shell-600 inline-block"
                  style={{ background: m.colour }}
                />
                {m.label}
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-ink-400 mt-1">
          One choice for the family — shelf sleeves, pins and the hanging rail all follow it.
        </p>
      </div>

      {/* ── soft-close — ships YES; the owner confirms (PR question Q1) ── */}
      <div>
        <span className="block text-[10px] uppercase tracking-wide text-ink-400 mb-1">Soft-close</span>
        <div className="flex gap-2">
          {[['soft-close', 'Yes'], ['standard', 'No']].map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`cc-btn px-3 ${(softClose ? 'soft-close' : 'standard') === id ? 'border-gold text-gold' : ''}`}
              data-softclose-option={id}
              onClick={() => setProjectDefaults({ hardware: { hinges: id } })}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── plinth — read-only; the engine counts, this only says so ── */}
      <div className="border border-shell-600 rounded px-2.5 py-2 space-y-0.5" data-plinth-summary="1">
        <span className="block text-[10px] uppercase tracking-wide text-ink-400">Plinth</span>
        <p className="text-[11px] text-ink-200">
          Plinth {heights.toeKick} mm · {plinthMaterial}
        </p>
        <p className="text-[10px] text-ink-400">
          Clips + clip connectors are counted automatically from the FRONT legs only, per unit.
        </p>
      </div>

      {/* ── what the automat just decided, for a standard door ── */}
      <p className="text-[11px]" data-hinge-automat="1">
        {automat.resolved ? (
          <span className="text-ink-400">
            Standard door: {automat.angle}° · {automat.variant === 'soft' ? 'soft-close' : 'standard'} ·{' '}
            {automat.family} · art. {automat.article}
          </span>
        ) : (
          <span className="text-status-warn">
            Standard door: {automat.spec_label} — no article in the registry yet; the BOM prints it as a
            named spec.
          </span>
        )}
      </p>
    </div>
  );
}
