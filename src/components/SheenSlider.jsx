import {
  projectSheen, roughnessFromSheen, sheenLabel, sheenSteps,
} from '../engine/design.js';

/**
 * How glossy the SPRAYED surfaces of this job are (turn 8, CLAUDE.md F1).
 *
 * Piotr's own scale, carried over from Spraying-Calc — 0 matt, 25 mirror, in
 * fives — because it is the scale he already quotes people on. A roughness
 * slider from 0 to 1 would be the same information in a language nobody in a
 * workshop speaks. The formula behind it is one line in engine/design.js, so
 * this control and the 3D view cannot disagree about what a 15 looks like.
 *
 * It applies to the pieces that go to the spray booth and to nothing else: a
 * melamine carcass is a foil board and its sheen came with the board.
 */
export default function SheenSlider({ design, setDesign, profile }) {
  const steps = sheenSteps(profile);
  const value = projectSheen(design, profile);
  const S = profile.appearance.sheenScale;
  return (
    <div className="space-y-1">
      <div className="cc-row">
        <span className="text-xs uppercase tracking-wide text-ink-200">Sheen</span>
        <span className="text-[11px] text-ink-400">
          {value} · {sheenLabel(value, profile)}
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
        {steps.map((v) => <span key={v}>{v}</span>)}
      </div>
      <p className="text-[11px] text-ink-400">
        Sprayed surfaces only — doors, fronts, end panels, fillers. {S.min} is dead matt,
        {' '}{S.max} is a mirror; the renderer takes roughness&nbsp;
        {roughnessFromSheen(value, profile).toFixed(2)} from it.
      </p>
    </div>
  );
}
