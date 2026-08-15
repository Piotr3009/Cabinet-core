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
  // ─── TURN 31 (CLAUDE.md F8): THE FIGURE IS A CONTROL ─────────────────────
  //
  // "Double-click the width or height figure on the canvas → a small modal."
  //
  // A dimension caption is a SPRITE, and a sprite is a billboard with no
  // thickness — pointing at one on a canvas showing a kitchen is F7's
  // pixel-hunting again. So the same answer: an invisible catchment at the
  // figure's own position, sized off the sprite's own drawn height, carrying
  // the gesture. Given no `onPick` a chain is exactly what it was.
  onPick = null,
}) {
  const drawn = useMemo(() => dimensionSet(rows || [], style), [rows, style]);
  if (!drawn.length) return null;

  const ink = colour || style.colour;
  const weight = mm(style.strokeMm * 2);
  const third = mm(at);

  return (
    <group userData={{
      ccHelper: true,
      ccNoBounds: true,
      ccDimensionChain: name ?? drawn.length,
      // …and the COUNT beside the name, so a walk can add up how many
      // dimensions the scene is drawing without parsing a label.
      ccDimensionRows: drawn.length,
    }}
    >
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
            style={style}
            onPick={onPick ? (e) => onPick(row, e) : null}
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
  row, plane, at, style, onPick = null,
}) {
  const text = row.text?.value ?? formatDimension(row.value);
  const u = mm(row.text?.at?.[0] ?? 0);
  const v = mm(row.text?.at?.[1] ?? 0);
  // Just clear of the line, on the side the offset pushed it — a value sitting
  // ON its own line is a value with a stroke through it. The lift is the ink's
  // own weight, so it scales with the drawing.
  const lift = mm(style.strokeMm * 3);
  const position = plane === 'xz' ? [u, at + lift, v] : [u, v, at + lift];
  return (
    <>
      <DimensionValue position={position} text={text} style={style} />
      {onPick && (
        // Turn 31 (CLAUDE.md F8): the catchment on the FIGURE. Sized off the
        // label's own drawn height so it grows and shrinks with the drawing,
        // and invisible — a dimension that grew a visible button would be a
        // drawing with a button on it.
        <mesh
          position={position}
          visible={false}
          userData={{ ccHelper: true, ccNoBounds: true, ccDimensionPick: row.key }}
          onDoubleClick={(e) => { e.stopPropagation(); onPick(e); }}
        >
          <boxGeometry args={[style.labelHeight * 3, style.labelHeight * 1.6, style.labelHeight]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}
    </>
  );
}

/**
 * A billboarded number, on the drawing office's own dark plate.
 *
 * SPEC 7: labels must ALWAYS face the camera. A sprite with a canvas texture,
 * for the same three reasons `3d/DimLabel.jsx` gives — sprites are billboards
 * by definition, need no font download, and appear in the WebGL snapshot the
 * PDF is made from.
 *
 * ─── TURN 27 (CLAUDE.md F4 / R12): THE PAINT COMES BACK ────────────────────
 *
 * R12's first debt. Turn 26 was asked to give shelves, sides and fronts the
 * partition chain's BEHAVIOUR and it repainted every label on the way: the
 * quiet dark plate the chain had carried since turn 17 became a white halo and
 * the line's own ink. Nobody asked for that.
 *
 * So this is turn 25's flat label again, exactly — square corners and no
 * stroke (the plate IS the edge), the app's own shell as the ground and its
 * own ink on it, the label type the panels use: small, letter-spaced,
 * monospace. What is NEW is that it is now the ONLY one: shelves, sides,
 * fronts, gaps and the room's distance marks all wear it, because there is one
 * dimension component and it has one look.
 *
 * The INK is the plate's, not the line's. A chain drawn in gold because its
 * cabinet is selected still turns gold — the strokes carry that — and its
 * number stays legible instead of turning into a gold word on a dark ground.
 * That is precisely how the partition chain behaved before turn 26.
 */
function DimensionValue({ position, text, style }) {
  const texture = useMemo(() => {
    // ─── TURN 29 (CLAUDE.md F4): A THIRD BIGGER, HALF THE WEIGHT ───────────
    //
    // *"napisy troszeczkę za małe — jakby były o 30% większe ale o połowę mniej
    // tłuste na tych wymiarowaniach wszędzie."* Both numbers are the profile's
    // (`hoverDimensions.label`), read through `dimensionStyle` like the two
    // inks beside them, because this component is the ONE place a dimension's
    // caption is drawn (R11) and a workshop tunes type in one block.
    //
    // The size that the EYE measures is the sprite's height below; `pixels` is
    // the canvas the glyphs are rasterised on and grows with it so the label
    // gets bigger rather than softer. The weight is a light cut of the SAME
    // monospace family — less fat, not a different face.
    const size = style.labelPixels;
    const font = `${style.labelWeight} ${size}px ui-monospace, Menlo, Consolas, monospace`;
    const canvas = document.createElement('canvas');
    const measure = canvas.getContext('2d');
    measure.font = font;
    // Padding and tracking are fractions of the type, so the plate grows WITH
    // it: turn 25's 16 px on 38 is the 0.42 the profile carries.
    const pad = Math.round(size * style.labelPad);
    // The plate is wider than the type: the letter-spacing the app's own
    // `cc-label` carries has to be paid for in pixels, and a caption that
    // touches its own edge reads as clipped.
    const tracking = size * style.labelTracking;
    const width = Math.ceil(measure.measureText(text).width + tracking * text.length) + pad * 2;
    const height = size + pad * 2;
    canvas.width = width;
    canvas.height = height;
    const c = canvas.getContext('2d');
    c.font = font;
    c.textBaseline = 'middle';
    // Square, quiet, and no outline at all — the plate IS the edge.
    c.fillStyle = style.labelPlate;
    c.globalAlpha = style.labelAlpha;
    c.fillRect(0, 0, width, height);
    c.globalAlpha = 1;
    c.fillStyle = style.labelInk;
    // Drawn letter by letter, which is the only way a canvas tracks type.
    const total = measure.measureText(text).width + tracking * (text.length - 1);
    let x = (width - total) / 2;
    c.textAlign = 'left';
    for (const ch of text) {
      c.fillText(ch, x, height / 2 + 1);
      x += measure.measureText(ch).width + tracking;
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 4;
    tex.needsUpdate = true;
    tex.userData.aspect = width / height;
    return tex;
  }, [text, style.labelPlate, style.labelInk, style.labelAlpha,
    style.labelPixels, style.labelWeight, style.labelPad, style.labelTracking]);

  useEffect(() => () => texture.dispose(), [texture]);

  // Turn 25's own size was 0.044 — `DimLabel`'s 0.055 at the chain's scale of
  // 0.8. Turn 29 (CLAUDE.md F4) is that × 1.3, and it is the number the eye
  // measures: the walk reads the mounted sprite's scale and checks the ratio.
  const h = style.labelHeight;
  const w = h * (texture.userData.aspect || 3);
  return (
    <sprite
      position={position}
      scale={[w, h, 1]}
      renderOrder={10}
      // ─── TURN 29 (CLAUDE.md F2/F4): WHAT THIS LABEL ACTUALLY SAYS ─────────
      // The value is rasterised into a canvas, so a walk counting the numbers
      // the scene draws — "one 600, one 100, one 770 for the run" — could only
      // count sprites, not read them. It travels on `userData` (R7: never a
      // `data-*` on an R3F object) beside the height the eye measures, and
      // nothing in the app reads either back.
      userData={{
        ccHelper: true, ccNoBounds: true, ccDimensionText: text, ccDimensionHeight: h,
      }}
    >
      {/* `allowOverride={false}` — a dimension is TOOL, and tool casts no
          shadow (turn 9, CLAUDE.md F1.3). */}
      <spriteMaterial attach="material" map={texture} transparent depthTest={false} allowOverride={false} />
    </sprite>
  );
}
