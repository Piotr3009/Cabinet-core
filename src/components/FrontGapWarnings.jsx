import { useMemo } from 'react';
import { useProjectStore } from '../stores/projectStore.js';
import { getCabinetProfile } from '../engine/profile.js';

// ─── TURN 30 F12 — "…and SHOW THE VALUE" ────────────────────────────────────
//
// CLAUDE.md: "when a gap is < 3 mm, paint the pair's meeting edges red and show
// the value. It is a WARNING overlay, not a block."
//
// The paint is `3d/Scene.jsx FrontGapMarks`. This is the value. A red mark on a
// door edge says "something is wrong here" and a joiner still has to go and
// measure it; the number is the half that lets him decide whether it is a
// scribe, a re-cut or a cabinet 1 mm off its line.
//
// Both surfaces read `frontGapWarnings()` — ONE list, in the store — so a mark
// cannot appear without its millimetres or the other way round.
//
// ─── IT IS NOT A BLOCK, AND IT IS NOT A DIALOG ──────────────────────────────
//
// It does not steal focus, it has no buttons and it refuses nothing: the same
// grammar `UnitWarnings` uses for the per-cabinet ones, in the room's own red
// rather than that yellow, because this is a collision and not a clamp. It
// disappears by itself when the layout stops being wrong.

export default function FrontGapWarnings() {
  const units = useProjectStore((s) => s.units);
  const design = useProjectStore((s) => s.project.design);
  const frontGapWarnings = useProjectStore((s) => s.frontGapWarnings);
  // Recomputed when the cabinets move, not per frame — the same key the room's
  // own marks are memoised on, so the two lists are always the same list.
  const rows = useMemo(() => frontGapWarnings(), [units, design, frontGapWarnings]);
  if (!rows.length) return null;

  const colour = getCabinetProfile().appearance.frontGapWarning.colour;
  return (
    <div
      className="absolute left-3 bottom-3 z-20 pointer-events-none max-w-[26rem] space-y-1"
      data-front-gap-warnings={rows.length}
    >
      {rows.map((c) => (
        <div
          key={`${c.a.unitId}-${c.a.panelId}-${c.b.unitId}-${c.b.panelId}`}
          data-front-gap-mm={c.mm}
          data-front-gap-pair={`${c.a.panelId}|${c.b.panelId}`}
          className="flex items-start gap-1.5 rounded bg-shell-900/85 px-2 py-1 text-[11px] leading-snug backdrop-blur-sm"
          style={{ color: colour }}
        >
          <span aria-hidden className="shrink-0">▲</span>
          <span>{c.message}</span>
        </div>
      ))}
    </div>
  );
}
