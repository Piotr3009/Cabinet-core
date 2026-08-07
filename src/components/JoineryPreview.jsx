import { useMemo } from 'react';
import { puzzlePreview } from '../engine/puzzle.js';
import { formatMm } from '../engine/format.js';

// ─── What the joint looks like (turn 7, CLAUDE.md F2) ───
//
// "Dog bones (Skylon puzzle)" is a name. This is the thing itself: one tab, the
// relief pocket that lets a round cutter reach the corner, and the socket it
// goes into — drawn from `profile.puzzle`, the same numbers the CNC files are
// cut from.
//
// Derived rather than illustrated, on purpose. A hand-drawn diagram is a
// picture of the joint somebody remembered; this one changes when the profile
// changes, which is the only way a preview stays true.
//
// A future joinery system arrives as a profile entry with its own geometryKey
// and its own branch here — not as a redesign of the settings screen.

export default function JoineryPreview({ profile, joinery }) {
  const geometry = useMemo(
    () => (joinery?.geometryKey === 'puzzle' ? puzzlePreview(profile) : null),
    [profile, joinery?.geometryKey],
  );

  if (!geometry) {
    return <p className="text-[11px] text-ink-400">No preview for this joinery system yet.</p>;
  }

  const pad = 12;
  const { w, h, outline, dogbone, mate, socket, holes } = geometry;
  const vb = `${-pad} ${-pad} ${w + pad * 2} ${h + pad * 2}`;
  const pz = profile.puzzle;

  // SVG counts Y down and the geometry is held Y up, exactly as everywhere else
  // in this app — one flip, at the boundary.
  const flip = (y) => h - y;
  const points = outline.map(([x, y]) => `${x},${flip(y)}`).join(' ');
  const box = (r, extra = {}) => (
    <rect
      x={r.x1}
      y={flip(r.y2)}
      width={Math.abs(r.x2 - r.x1)}
      height={Math.abs(r.y2 - r.y1)}
      {...extra}
    />
  );

  return (
    <div className="flex items-center gap-3">
      <svg viewBox={vb} className="w-[220px] h-[130px] shrink-0" role="img" aria-label={joinery.label}>
        {/* the piece the tab is cut on */}
        <polygon points={points} fill="#22262b" stroke="#D4AF37" strokeWidth="1.2" />
        {/* the dog-bone relief */}
        {box(dogbone, { fill: 'none', stroke: '#8A8A8A', strokeWidth: 0.9, strokeDasharray: '4 3' })}
        {/* the mating piece, and the socket in it */}
        {box(mate, { fill: '#1a1d21', stroke: '#5b6169', strokeWidth: 1 })}
        {box(socket, { fill: '#2c3138', stroke: '#009A3D', strokeWidth: 1.2 })}
        {holes.map((hole, i) => (
          <circle key={i} cx={hole.x} cy={flip(hole.y)} r={hole.d / 2} fill="none" stroke="#009A3D" strokeWidth="1" />
        ))}
      </svg>
      <dl className="text-[11px] text-ink-400 space-y-0.5">
        <Row label="Tab width" value={`${formatMm(pz.tabHalfWidth * 2)} mm`} />
        <Row label="Shoulder" value={`${formatMm(pz.shoulderDepth)} mm`} />
        <Row label="Dog bone" value={`${formatMm(pz.dogboneHalfHeight * 2)} mm`} />
        <Row label="Socket holes" value={`2 × ⌀${formatMm(pz.socketHoleDiameter)} at ${formatMm(pz.socketHoleOffset)} mm`} />
        <p className="text-ink-400 pt-1 max-w-[260px] leading-snug">
          Drawn from the workshop profile, not from a picture — change the numbers and this changes with them.
        </p>
      </dl>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex gap-2">
      <dt className="w-24 text-ink-400">{label}</dt>
      <dd className="text-ink-100">{value}</dd>
    </div>
  );
}
