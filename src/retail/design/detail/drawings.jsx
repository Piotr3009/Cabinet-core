// ─── T60 F3.6 · THE FOUR LINE DRAWINGS, DRAWN FROM THE ENGINE'S OWN LAYOUT ──
//
// `WatchLayoutModal` shows each layout as a little plan. Retail cannot import
// it (the iron boundary) so it draws its own — but NOT its own arrangement:
// every rectangle below is placed from the fields `engine/watchDrawer.js`
// publishes on the layout itself (`rows`, `across`, `backStrip`), so a fifth
// layout added to the engine draws itself and a change to one of the four
// changes this picture with it.
//
//   rows       how many rows of cells stand behind the pocket row
//   across     how many cells across, where the layout fixes it (BELTS: 2)
//   backStrip  a shallow tray behind everything else
//
// The POCKET ROW at the front is in all four — it is what the drawer is for.
// Nothing here is measured in millimetres: it is a picture of an arrangement,
// not a drawing of a part, and the engine's own `hint` is the words beside it.

const W = 40;
const D = 30;

function Cell({ x, y, w, h }) {
  return <rect x={x} y={y} width={w} height={h} fill="none" stroke="currentColor" strokeWidth="0.7" />;
}

export function WatchLayoutDrawing({ layout }) {
  const pocketD = 9;                       // the front row, in the same proportion for all four
  const backD = layout.backStrip ? 5 : 0;
  const midY = pocketD + 1;
  const midD = Math.max(4, D - pocketD - backD - (backD ? 2 : 1));
  const rows = Math.max(1, Number(layout.rows) || 1);
  const across = Math.max(1, Number(layout.across) || (rows > 1 ? 4 : 2));
  const cells = [];
  const cw = (W - 2) / across;
  const ch = midD / rows;
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < across; c += 1) {
      cells.push(<Cell key={`${r}-${c}`} x={1 + c * cw} y={midY + r * ch} w={cw - 0.6} h={ch - 0.6} />);
    }
  }
  return (
    <svg viewBox={`0 0 ${W} ${D}`} className="pbi-mini" role="img" aria-label={layout.hint}>
      <rect x="0.4" y="0.4" width={W - 0.8} height={D - 0.8} fill="none" stroke="currentColor" strokeWidth="0.9" />
      {/* the pocket row — four pockets, the row every layout begins with */}
      {[0, 1, 2, 3].map((i) => (
        <Cell key={`p${i}`} x={1 + i * ((W - 2) / 4)} y={1} w={(W - 2) / 4 - 0.6} h={pocketD - 1} />
      ))}
      {cells}
      {backD ? <Cell x={1} y={D - backD} w={W - 2} h={backD - 1} /> : null}
    </svg>
  );
}

/** The shoe drawer's fixed law, drawn: a ramp and its two dividers (T58 F2). */
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
