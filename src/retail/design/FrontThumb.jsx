// ─── F4.3 · THE FRONT STYLES, DRAWN ────────────────────────────────────────
//
// *"Front style chips with small Onyx-hairline SVG thumbnails drawn by you"*.
//
// Drawn here, in one-pixel Onyx on nothing, because that is what the system
// allows and because a photograph of a door would be an EGGER image used the
// one way the licence forbids. Four lines each: a slab is an outline, a shaker
// adds its frame, a J-pull cuts its lip off the top edge, a grooved door is
// scored, an arched one has its head curved.

const BOX = { width: 44, height: 58, viewBox: '0 0 44 58' };
const LINE = { fill: 'none', stroke: 'var(--pbi-onyx)', strokeWidth: 1 };

export default function FrontThumb({ style }) {
  return (
    <svg {...BOX} aria-hidden="true" style={{ display: 'block' }}>
      {style === 'A' ? (
        <path d="M2.5 55.5 V14 A19.5 12 0 0 1 41.5 14 V55.5 Z" {...LINE} />
      ) : (
        <rect x="2.5" y="2.5" width="39" height="53" {...LINE} />
      )}

      {/* SHAKER — the frame, equal on all four sides (engine/shaker.js). */}
      {style === 'S' ? <rect x="8.5" y="8.5" width="27" height="41" {...LINE} /> : null}

      {/* J-PULL — the lip machined into the front's own top edge (T57). */}
      {style === 'HJ' ? (
        <>
          <line x1="2.5" y1="10.5" x2="41.5" y2="10.5" {...LINE} />
          <line x1="6.5" y1="2.5" x2="6.5" y2="10.5" {...LINE} />
        </>
      ) : null}

      {/* GROOVED — scored, evenly. */}
      {style === 'G' ? [14, 22, 30].map((x) => (
        <line key={x} x1={x} y1="6.5" x2={x} y2="51.5" {...LINE} />
      )) : null}
    </svg>
  );
}
