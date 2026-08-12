import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { mm } from './constants.js';
import { dimensionSet } from '../engine/dimensionArrows.js';
import { formatDimension } from '../engine/format.js';

// ─── ONE DIMENSION COMPONENT (turn 26, CLAUDE.md R11 / F4) ───────────────────
//
// R11, the owner's law: **ONE DIMENSION COMPONENT.** The partition chain is the
// house style and the only implementation. Anything that dimensions anything —
// shelves, sides, fronts, gaps, the distance from a cabinet to a wall — feeds
// POINTS to this component and draws nothing itself.
//
// His verdict on turn 25: the partition chain is right; shelves, sides and
// fronts are wrong — white labels, no arrows, badly placed, rounded to 1 mm.
// Three implementations existed (`DistanceArrows`, `HoverDimensions`,
// `DimLabel`) and that is exactly how four dialects happened. There is one now,
// and `test/turn26-f4-one-dimension.test.js` asserts at grep level that no
// other module draws an arrowhead.
//
// ─── WHAT IT DRAWS ──────────────────────────────────────────────────────────
//
// The partition chain's own drawing, unchanged in kind: a thin blue line
// between two points, WITNESS LINES out from each, real OPEN arrowheads meeting
// AT the measured points, and the value on the line. The geometry is the pure
// `engine/dimensionArrows.js dimensionEntities` — the same function the CNC
// part detail's SVG consumes — so neither surface invents an arrowhead.
//
// ─── WHERE IT DRAWS (F4.2, the owner's picture) ─────────────────────────────
//
// A chain is FLAT, in one of two planes, and the caller says which:
//
//   `plane="xz"`  a HORIZONTAL chain, lying ON THE FLOOR in front of the run
//                 like a drawing's dimension line, with witness lines dropping
//                 from the front edges to it. `at` is the height it lies at.
//   `plane="xy"`  a VERTICAL chain, down the SIDE of the unit or across a face.
//                 `at` is the depth it stands at.
//
// Never across the face of a front: that is the caller's business, and the
// callers are `3d/HoverDimensions.jsx`, `3d/DistanceArrows.jsx` and
// `3d/UnitView.jsx`, each of which now hands over points and a plane.
//
// ─── R7: NOTHING HERE IS A DOM NODE ─────────────────────────────────────────
//
// Every group carries `userData.ccHelper` — which the ruler's picking and the
// render's bounds already skip — and NOT a `data-*` attribute, which crashes
// the R3F reconciler. A walk finds a chain by traversing for `ccDimensionChain`.

/**
 * One thin bar between two points of the chain's own plane.
 *
 * A flat quad rather than a line: `LineBasicMaterial`'s width is one pixel on
 * every driver that matters, and "thin, small, beautiful" is a millimetre
 * measurement rather than a pixel one.
 */
function Stroke({
  from, to, plane, at, weight, colour,
}) {
  const du = to[0] - from[0];
  const dv = to[1] - from[1];
  const length = Math.hypot(du, dv);
  if (!(length > 1e-6)) return null;
  const mu = (from[0] + to[0]) / 2;
  const mv = (from[1] + to[1]) / 2;
  const angle = Math.atan2(dv, du);
  // A bar is modelled along its own +x; the two planes differ only in which way
  // that is turned into the room and which axis the thin dimension goes on.
  const position = plane === 'xz' ? [mu, at, mv] : [mu, mv, at];
  const rotation = plane === 'xz' ? [0, -angle, 0] : [0, 0, angle];
  const size = plane === 'xz'
    ? [length, weight * 0.6, weight]
    : [length, weight, weight * 0.6];
  return (
    <mesh
      position={position}
      rotation={rotation}
      userData={{ ccHelper: true, ccNoBounds: true }}
    >
      <boxGeometry args={size} />
      {/* `toneMapped={false}`: a dimension is INK and must read at the same
          value whatever the studio rig is doing to the furniture. */}
      <meshBasicMaterial color={colour} toneMapped={false} />
    </mesh>
  );
}

/**
 * THE dimension component.
 *
 * @param {object} props
 *   rows    [{ key, from:[u,v], to:[u,v], offset?, label? }] in the plane's own
 *           millimetres. `offset` pushes the dimension line clear of the two
 *           points along their normal — 0 draws it straight through them, which
 *           is what a measurement BETWEEN two features wants.
 *   style   `engine/dimensionArrows.js dimensionStyle(profile)` output
 *   plane   'xy' (vertical, across a face or down a side) | 'xz' (on the floor)
 *   at      the third coordinate, in millimetres: z for 'xy', y for 'xz'
 *   colour  an ink to override the style's (the room's distance marks use the
 *           project's dimension colour; everything else uses the chain's blue)
 *   name    what the walk finds this chain by
 */
export default function DimensionChain({
  rows, style, plane = 'xy', at = 0, colour = null, name = null, children = null,
}) {
  const drawn = useMemo(() => dimensionSet(rows || [], style), [rows, style]);
  if (!drawn.length) return null;

  const ink = colour || style.colour;
  const weight = mm(style.strokeMm * 2);
  const third = mm(at);

  return (
    <group userData={{ ccHelper: true, ccNoBounds: true, ccDimensionChain: name ?? drawn.length }}>
      {children}
      {drawn.map((row) => (
        <group key={row.key} userData={{ ccHelper: true, ccNoBounds: true }}>
          {row.segments.map(([a, b], j) => (
            <Stroke
              // eslint-disable-next-line react/no-array-index-key -- a segment has no id
              key={j}
              from={[mm(a[0]), mm(a[1])]}
              to={[mm(b[0]), mm(b[1])]}
              plane={plane}
              at={third}
              weight={weight}
              colour={ink}
            />
          ))}
          {/* ─── F4.3: HALF A MILLIMETRE ─────────────────────────────────────
              The value, ON the line, at the precision these are actually for.
              `formatDimension` quantises to 0.5 — a 3 mm gap and a 2.5 mm one
              are two different numbers, and rounding them both to "3" is what
              the owner was looking at. */}
          <Value
            row={row}
            plane={plane}
            at={third}
            colour={ink}
            style={style}
          />
        </group>
      ))}
    </group>
  );
}

/**
 * The number on the line.
 *
 * Drawn as a flat quad of text through the same sprite the rest of the scene
 * labels with — but OWNED here, so that "a dimension's caption" is one decision
 * in one place (R11) rather than a `DimLabel` every module reaches for with its
 * own tone, its own rounding and its own offset.
 */
function Value({
  row, plane, at, colour, style,
}) {
  const text = row.text?.value ?? formatDimension(row.value);
  const u = mm(row.text?.at?.[0] ?? 0);
  const v = mm(row.text?.at?.[1] ?? 0);
  // Just clear of the line, on the side the offset pushed it — a value sitting
  // ON its own line is a value with a stroke through it. The lift is the ink's
  // own weight, so it scales with the drawing.
  const lift = mm(style.strokeMm * 3);
  const position = plane === 'xz' ? [u, at + lift, v] : [u, v, at + lift];
  return <DimensionValue position={position} text={text} colour={colour} />;
}

/**
 * A billboarded number, in the dimension ink.
 *
 * SPEC 7: labels must ALWAYS face the camera. A sprite with a canvas texture,
 * for the same three reasons `3d/DimLabel.jsx` gives — sprites are billboards
 * by definition, need no font download, and appear in the WebGL snapshot the
 * PDF is made from.
 *
 * It is NOT `DimLabel`. That component draws a speech-bubble plate for a CHIP
 * (a cabinet's name, a magnet's height) and this is a dimension's value on a
 * drawing: no plate, no outline, the ink of the line it sits on, and a halo so
 * it survives landing on a dark carcass.
 */
function DimensionValue({ position, text, colour }) {
  const texture = useMemo(() => {
    const size = 48;
    const font = `600 ${size}px ui-monospace, Menlo, Consolas, monospace`;
    const canvas = document.createElement('canvas');
    const measure = canvas.getContext('2d');
    measure.font = font;
    const pad = 10;
    const width = Math.ceil(measure.measureText(text).width) + pad * 2;
    const height = size + pad * 2;
    canvas.width = width;
    canvas.height = height;
    const c = canvas.getContext('2d');
    c.font = font;
    c.textBaseline = 'middle';
    c.textAlign = 'center';
    // The halo: the drawing's own paper, thinly, so a number that lands on a
    // walnut carcass is still a number. Not a plate — a plate is a chip.
    c.lineWidth = 6;
    c.strokeStyle = 'rgba(255,255,255,0.85)';
    c.strokeText(text, width / 2, height / 2 + 1);
    c.fillStyle = colour;
    c.fillText(text, width / 2, height / 2 + 1);
    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 4;
    tex.needsUpdate = true;
    tex.userData.aspect = width / height;
    return tex;
  }, [text, colour]);

  useEffect(() => () => texture.dispose(), [texture]);

  const h = 0.042;
  const w = h * (texture.userData.aspect || 3);
  return (
    <sprite position={position} scale={[w, h, 1]} renderOrder={10} userData={{ ccHelper: true, ccNoBounds: true }}>
      {/* `allowOverride={false}` — a dimension is TOOL, and tool casts no
          shadow (turn 9, CLAUDE.md F1.3). */}
      <spriteMaterial attach="material" map={texture} transparent depthTest={false} allowOverride={false} />
    </sprite>
  );
}
