import {
  projectSheen, roughnessFromSheen, sheenLabel, sheenSteps,
} from '../engine/design.js';

/**
 * How glossy the SPRAYED surfaces of this job are (turn 8; rescaled turn 9,
 * CLAUDE.md F5).
 *
 * The industry's own scale: a lacquer is specified and ordered as a PERCENTAGE
 * of gloss, 5 % dead matt to 100 % full gloss, in fives. Turn 8 asked in 0–25,
 * which is the same information in a language a paint supplier does not speak —
 * and which had a 0 on it, and there is no such thing as a lacquer with no sheen
 * at all. A roughness slider from 0 to 1 would be worse again. The formula
 * behind it is one line in engine/design.js, so this control and the 3D view
 * cannot disagree about what a 60 looks like.
 *
 * It applies to the pieces that go to the spray booth and to nothing else: a
 * melamine carcass is a foil board and its sheen came with the board.
 */
export default function SheenSlider({ design, setDesign, profile }) {
  const steps = sheenSteps(profile);
  const value = projectSheen(design, profile);
  const S = profile.appearance.sheenScale;
  // Twenty stops is too many to number under a slider 250 px wide. The ticks are
  // the ends and the quarters, which is what a scale is read off anyway.
  const ticks = steps.filter((v, i) => i === 0 || i === steps.length - 1
    || Math.abs(v - S.max / 4) < 1e-9 || Math.abs(v - S.max / 2) < 1e-9
    || Math.abs(v - (S.max * 3) / 4) < 1e-9);
  return (
    <div className="space-y-1">
      <div className="cc-row">
        <span className="text-xs uppercase tracking-wide text-ink-200">Sheen</span>
        <span className="text-[11px] text-ink-400">
          {value} % · {sheenLabel(value, profile)}
        </span>
      </div>
      <input
        type="range"
        className="w-full accent-gold"
        min={S.min}
        max={S.max}
        step={S.step}
        value={value}
        onChange={(e) => setDesign({ sheen: Number(e.target.value) })}
      />
      <div className="flex justify-between text-[10px] text-ink-400">
        {ticks.map((v) => <span key={v}>{v}</span>)}
      </div>
      <p className="text-[11px] text-ink-400">
        Sprayed surfaces only — doors, fronts, end panels, fillers. {S.min} % is dead matt,
        {' '}{S.max} % is full gloss; the renderer takes roughness&nbsp;
        {roughnessFromSheen(value, profile).toFixed(2)} from it.
      </p>
    </div>
  );
}
