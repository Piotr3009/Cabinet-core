import { useMemo } from 'react';
import { mm, COLORS } from './constants.js';
import DimLabel from './DimLabel.jsx';
import { roomDistances, distanceLabel } from '../engine/dimensions.js';

// ─── Distance arrows ───
// "How far is that unit from the wall, and how big is the gap between those
// two?" — drawn on the plan, live (CLAUDE.md turn 3, phase 8). The arithmetic
// is engine/dimensions.js; this file only turns each measurement into a line,
// two heads and a caption.
//
// Live during a drag for free: the store moves the unit, the measurements are
// derived from the units, so the arrow follows the cabinet frame by frame with
// no drag state of its own to keep in step.

const THICK = 6;        // line thickness, room mm — scales with the drawing
const HEAD_R = 18;      // arrow head radius

/**
 * One measurement, in its wall's local frame: +X runs along the wall from the
 * start corner, +Z points into the room. The parent group does the placing, so
 * nothing here needs to know which wall of which shaped room it is on.
 */
function Arrow({ mark, standoff, headLen }) {
  const x1 = mm(mark.from);
  const x2 = mm(mark.to);
  const y = mm(mark.y);
  const z = mm(mark.depth + standoff);
  const span = x2 - x1;
  const head = mm(headLen);
  const t = mm(THICK);
  const r = mm(HEAD_R);
  // A narrow gap has no room for two heads pointing inwards at each other:
  // past that point they turn round and point at the gap from outside, the way
  // a draughtsman does it.
  const inward = span > head * 2.2;
  const colour = mark.kind === 'wall' ? COLORS.rail : COLORS.gold;

  return (
    <group>
      <mesh position={[(x1 + x2) / 2, y, z]}>
        <boxGeometry args={[Math.max(span, t), t, t]} />
        <meshBasicMaterial color={colour} />
      </mesh>

      {/* witness ticks: the exact faces being measured between */}
      {[x1, x2].map((x, i) => (
        <mesh key={`tick${i}`} position={[x, y, z]}>
          <boxGeometry args={[t, mm(90), t]} />
          <meshBasicMaterial color={colour} />
        </mesh>
      ))}

      {[[x1, 1], [x2, -1]].map(([x, dir], i) => (
        <mesh
          key={`head${i}`}
          position={[x + (inward ? dir : -dir) * head * 0.5, y, z]}
          rotation={[0, 0, (inward ? -dir : dir) * Math.PI * 0.5]}
        >
          <coneGeometry args={[r, head, 10]} />
          <meshBasicMaterial color={colour} />
        </mesh>
      ))}

      <DimLabel position={[(x1 + x2) / 2, y + mm(70), z]} text={distanceLabel(mark.mm)} tone="gold" scale={0.9} />
    </group>
  );
}

export default function DistanceArrows({ walls, units, roomCentre, profile }) {
  const cfg = profile.dimensions;
  const marks = useMemo(
    () => roomDistances({ walls, units, minGap: cfg.minGap }),
    [walls, units, cfg.minGap],
  );

  return (
    <>
      {walls.map((wall) => {
        const mine = marks.filter((m) => m.wall === wall.index);
        if (!mine.length) return null;
        return (
          <group
            key={`dim-wall-${wall.index}`}
            position={[mm(wall.start.x - roomCentre.x), 0, mm(wall.start.y - roomCentre.y)]}
            rotation={[0, wall.angle, 0]}
          >
            {mine.map((m, i) => (
              <Arrow key={`${m.kind}-${i}`} mark={m} standoff={cfg.standoff} headLen={cfg.arrowHead} />
            ))}
          </group>
        );
      })}
    </>
  );
}
