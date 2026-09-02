// ─── T60 F3.6 · LICENSED REMOVAL (T63): `WatchLayoutDrawing` stood here ────
// Retail's own plan of the four watch layouts, drawn because *"retail cannot
// import PRO's"*. It can COPY it, and T63 did: `WatchLayoutModal.jsx` beside
// this file is PRO's window, schematics included, and the sketch's drawing
// went with the sketch it drew for.

const W = 40;
const D = 30;

export function ShoeDrawing({ lanes = 3 }) {
  const cuts = Array.from({ length: Math.max(0, lanes - 1) }, (_, i) => (i + 1) * (W / lanes));
  return (
    <svg viewBox={`0 0 ${W} ${D}`} className="pbi-mini" role="img" aria-label="A ramp and two dividers">
      <rect x="0.4" y="0.4" width={W - 0.8} height={D - 0.8} fill="none" stroke="currentColor" strokeWidth="0.9" />
      {/* the ramp, leaning at the shoe shelf's own tilt */}
      <line x1="1" y1={D - 2} x2={W - 1} y2="6" stroke="currentColor" strokeWidth="0.9" />
      {cuts.map((x) => (
        <line key={x} x1={x} y1={D - 2 - ((x / W) * (D - 8))} x2={x} y2={D - 2} stroke="currentColor" strokeWidth="0.7" />
      ))}
    </svg>
  );
}
