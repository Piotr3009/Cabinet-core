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

// ─── T64 F4 · THE RAIL'S SIX ICONS ─────────────────────────────────────────
//
// One drawing per step, in this file's own manner: a viewBox that is a
// SHAPE, one-pixel Onyx on nothing, no size attribute (T60 F1 — how big it is
// drawn is `.pbi-tile-icon` in `styles/room.css`, which is a token). No npm
// icon set — the house rule — and no picture of a product: a wardrobe is a
// rectangle with a line down it, a room is a corner, a review is a tick.

const ICON = { viewBox: '0 0 24 24', className: 'pbi-tile-icon', 'aria-hidden': 'true' };
const INK = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.2, strokeLinecap: 'round', strokeLinejoin: 'round' };

const STEP_ICONS = {
  // WHAT — a wardrobe: a tall box, a door line, two feet.
  what: (
    <svg {...ICON}><rect x="5" y="3" width="14" height="16" {...INK} /><line x1="12" y1="3" x2="12" y2="19" {...INK} /><line x1="7" y1="19" x2="7" y2="21" {...INK} /><line x1="17" y1="19" x2="17" y2="21" {...INK} /><circle cx="10.2" cy="11" r="0.5" {...INK} /><circle cx="13.8" cy="11" r="0.5" {...INK} /></svg>
  ),
  // WHERE — the room: a wall in plan, a corner, a dimension.
  where: (
    <svg {...ICON}><path d="M4 20 V6 H20" {...INK} /><path d="M4 20 H20" {...INK} /><path d="M7 9 V17" {...INK} /><path d="M7 17 H17" {...INK} /><path d="M6 11 L8 9 L6 7" {...INK} /></svg>
  ),
  // INSIDE — the open carcass: shelves and a rail.
  inside: (
    <svg {...ICON}><rect x="4" y="3" width="16" height="18" {...INK} /><line x1="4" y1="9" x2="20" y2="9" {...INK} /><line x1="4" y1="15" x2="12" y2="15" {...INK} /><line x1="12" y1="9" x2="12" y2="21" {...INK} /><line x1="14" y1="12" x2="18" y2="12" {...INK} /></svg>
  ),
  // FRONTS — a shaker leaf, face on.
  fronts: (
    <svg {...ICON}><rect x="6" y="3" width="12" height="18" {...INK} /><rect x="8.5" y="5.5" width="7" height="13" {...INK} /><circle cx="16" cy="12" r="0.6" {...INK} /></svg>
  ),
  // EXTRAS — the light: a strip and its rays.
  extras: (
    <svg {...ICON}><rect x="7" y="4" width="10" height="2.5" {...INK} /><path d="M9 9 L8 13 M12 9 V13.5 M15 9 L16 13" {...INK} /><path d="M5 20 H19" {...INK} /><path d="M7 17 H17" {...INK} /></svg>
  ),
  // REVIEW — the tick, in a square.
  review: (
    <svg {...ICON}><rect x="4" y="4" width="16" height="16" {...INK} /><path d="M8 12.5 L11 15.5 L16.5 9" {...INK} /></svg>
  ),
};

/** The rail's icon for a step, by the step's own id. */
export function StepIcon({ step }) {
  return STEP_ICONS[step] || STEP_ICONS.review;
}
