import { useMemo } from 'react';
import { useProjectStore } from '../stores/projectStore.js';
import { useCabinetProfileStore } from '../stores/cabinetProfileStore.js';
import { useMaterialAssignmentStore } from '../stores/materialAssignmentStore.js';
import { migrateDesign, projectHeights } from '../engine/design.js';
import { hardwareVariant, projectFrontThickness } from '../engine/projectSettings.js';
import { hingeAutomat } from '../engine/hinges.js';
import { registerLookup } from '../lib/hardwareRegister.js';
import { pushToOpenLock, pushToOpenPatch } from '../lib/pushToOpen.js';

// ─── TURN 32 (CLAUDE.md F2), RE-SHAPED 15.08.2026 EVENING ───────────────────
//
// The owner walked the shipped step on his screen and re-ruled the metals:
//
//   · HINGES — Silver / Onyx and NOTHING ELSE. "zawiasy bez złota — Blum nie
//     robi": a gold cup does not exist in the catalogue, so a gold button here
//     was an order nobody could fill. Writes `design.hinges.finish`
//     ('nickel' | 'onyx' — the ids the finish spec has carried since T21).
//   · INTERNAL METAL — Silver / Gold. The family the rail, the sleeves and
//     the collars follow (`design.hardware.shelfSleeve`, T28's one resolver).
//     Onyx is not offered here: the interior pair the owner stocks is
//     chrome-or-brass.
//   · SOFT-CLOSE — unchanged, ships YES (his "raczej standardowo").
//   · PUSH-TO-OPEN — NEW, his proposal accepted. It IS the runner variant the
//     design has carried since T18: T = TIP-ON, S = the soft-close runner —
//     so the switch writes `design.runners.variant` and invents no field.
//     TIP-ON on the drawers and soft-close on the doors coexist; the note
//     says what the pairing costs (the TIP-ON BLUMOTION family).
//
// The plinth line and the automat line are T32's, untouched. The automat
// speaks the METAL-map dialect (chrome/onyx/gold → published finish), so the
// hinge finish is translated at the door rather than the map growing keys.

const HINGE_FINISHES = [['nickel', 'Silver'], ['onyx', 'Onyx']];
const INTERNAL_METALS = [['chrome', 'Silver'], ['gold', 'Gold']];

// ─── TURN 44 (CLAUDE.md F6): RETAIL SEES ONLY COLOUR ────────────────────────
// *"All existing hardware choices, relocated; retail sees ONLY colour."* The
// two COLOUR questions on this step are the hinge finish and the internal
// metal; soft-close, push-to-open, the plinth line and the automat's verdict
// are workshop facts. Nothing is disabled and nothing is greyed — a retail head
// simply does not build them, which is iron rule 5's own wording.
export default function WizardHardware({ audience = 'factory' }) {
  const retail = audience === 'retail';
  const storedDesign = useProjectStore((s) => s.project.design);
  const setShelfSleeve = useProjectStore((s) => s.setShelfSleeve);
  const setDesign = useProjectStore((s) => s.setDesign);
  const setProjectDefaults = useProjectStore((s) => s.setProjectDefaults);
  const profile = useCabinetProfileStore((s) => s.profile);
  const materials = useMaterialAssignmentStore((s) => s.materials);

  const design = useMemo(() => migrateDesign(storedDesign), [storedDesign]);
  const heights = useMemo(() => projectHeights(design, profile), [design, profile]);
  const metals = profile.appearance.metals;
  const internal = design.hardware.shelfSleeve || profile.appearance.metalDefault;
  const hingeFinish = design.hinges.finish || profile.hardware.hinge?.defaultFinish || 'nickel';
  const softClose = hardwareVariant(design, profile, 'hinges') === 'soft-close';
  const runnerVariant = (design.runners.variant
    || profile.hardware.runner?.movento?.defaultVariant || 'T').toUpperCase();
  const pushToOpen = runnerVariant === 'T';
  // T45 F5: whether the handles have taken this choice away, and the one line
  // that says why. The rule is `lib/pushToOpen.js` — one sentence, two surfaces
  // (this control and the wizard's summary).
  const lock = pushToOpenLock(design);

  const automat = useMemo(() => hingeAutomat({
    frontThickness: projectFrontThickness(design, profile, materials),
    metal: hingeFinish === 'onyx' ? 'onyx' : 'chrome',
    softClose,
  }, { profile, lookup: registerLookup }), [design, profile, materials, hingeFinish, softClose]);

  const plinthSetting = design.runMaterials.plinth;
  const plinthBoard = materials.find((m) => m.id === plinthSetting.material_id) || null;
  const plinthMaterial = plinthSetting.sameAsFronts
    ? 'Same as fronts (default)'
    : (plinthBoard ? plinthBoard.name : 'Same as fronts (default)');

  return (
    <div className="space-y-4" data-wizard-hardware="1" data-hardware-audience={audience}>
      {/* ── hinges: the two finishes Blum actually makes ── */}
      <div>
        <span className="block text-[10px] uppercase tracking-wide text-ink-400 mb-1">Hinges (finish)</span>
        <div className="flex gap-2" data-hinge-finish="1">
          {HINGE_FINISHES.map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`cc-btn px-3 ${hingeFinish === id ? 'border-gold text-gold' : ''}`}
              data-hinge-finish-option={id}
              onClick={() => setDesign({ hinges: { ...design.hinges, finish: id } })}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-ink-400 mt-1">
          Silver or Onyx — the two the catalogue makes. No gold on a hinge.
        </p>
      </div>

      {/* ── internal metal: the family the rail and the sleeves follow ── */}
      <div>
        <span className="block text-[10px] uppercase tracking-wide text-ink-400 mb-1">Internal metal</span>
        <div className="flex gap-2" data-shelf-sleeve="1">
          {INTERNAL_METALS.map(([id, label]) => {
            const m = metals[id];
            if (!m) return null;
            return (
              <button
                key={id}
                type="button"
                className={`cc-btn px-3 flex items-center gap-2 ${internal === id ? 'border-gold text-gold' : ''}`}
                data-metal-option={id}
                onClick={() => setShelfSleeve(id)}
              >
                <span
                  className="w-3 h-3 rounded-full border border-shell-600 inline-block"
                  style={{ background: m.colour }}
                />
                {label}
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-ink-400 mt-1">
          Hanging rail, shelf sleeves and collars — one choice for the family.
        </p>
      </div>

      {/* ── soft-close — ships YES; the owner confirms (PR question Q1) ── */}
      {!retail && (
      <div>
        <span className="block text-[10px] uppercase tracking-wide text-ink-400 mb-1">Soft-close</span>
        <div className="flex gap-2">
          {[['soft-close', 'On (standard)'], ['standard', 'Off']].map(([id, label]) => (
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
      )}

      {/* ─── TURN 45 (CLAUDE.md F5): PUSH-TO-OPEN OBEYS THE HANDLES ─────────
          *"Any handles chosen (J-pull / bar / knobs / any hands) → push-to-open
          is forced OFF and LOCKED, with a one-line reason under it. Handleless →
          available as before. The BOM follows the lock."*

          The lock is not a second flag to be kept in step with the first: the
          opening buttons WRITE the runner variant (`lib/frontOpening.js`, and
          the rule is `lib/pushToOpen.js`), so by the time this control is drawn
          the field already says soft-close and the BOM already reads it. What
          this block adds is the honesty — the buttons are dead, they LOOK dead,
          and the reason is under them in one line rather than in a tooltip
          nobody hovers. */}
      {!retail && (
      <div>
        <span className="block text-[10px] uppercase tracking-wide text-ink-400 mb-1">Push-to-open</span>
        <div className="flex gap-2" data-push-to-open="1" data-push-locked={lock.locked ? '1' : '0'}>
          {[['T', 'On'], ['S', 'Off']].map(([id, label]) => (
            <button
              key={id}
              type="button"
              disabled={lock.locked}
              aria-pressed={runnerVariant === id}
              title={lock.locked ? lock.reason : undefined}
              className={`cc-btn px-3 ${runnerVariant === id ? 'border-gold text-gold' : ''} ${
                lock.locked ? 'opacity-45 cursor-not-allowed' : ''}`}
              data-push-option={id}
              onClick={() => setDesign(pushToOpenPatch(design, id === 'T'))}
            >
              {label}
            </button>
          ))}
        </div>
        {lock.locked ? (
          <p className="text-[10px] text-status-warn mt-1" data-push-lock-reason="1">{lock.reason}</p>
        ) : (
          <p className="text-[10px] text-ink-400 mt-1">
            Drawers on MOVENTO TIP-ON{pushToOpen && softClose
              ? ' — with soft-close on, the BOM orders the TIP-ON BLUMOTION family'
              : ''}.
          </p>
        )}
      </div>
      )}

      {/* ── plinth — read-only; the engine counts, this only says so ── */}
      {!retail && (
      <div className="border border-shell-600 rounded px-2.5 py-2 space-y-0.5" data-plinth-summary="1">
        <span className="block text-[10px] uppercase tracking-wide text-ink-400">Plinth</span>
        <p className="text-[11px] text-ink-200">
          Plinth {heights.toeKick} mm · {plinthMaterial}
        </p>
        <p className="text-[10px] text-ink-400">
          Clips + clip connectors are counted automatically from the FRONT legs only, per unit.
        </p>
      </div>
      )}

      {/* ── what the automat just decided, for a standard door ── */}
      {!retail && (
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
      )}
    </div>
  );
}
