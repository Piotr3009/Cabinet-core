import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mm } from './constants.js';

// ─── "This one" (turn 6, CLAUDE.md F5) ───
//
// A selection mark has one job: to say which thing is selected, and to be
// impossible to mistake for the thing itself. Turn 4's gold outline failed the
// second half — gold is a furniture colour (a handle, a bronze frame), and it
// was drawn on the cabinet's OWN edges, so a selected unit looked like a unit
// made of something else.
//
// This is what every CAD package draws instead: a thin dashed box in the
// drawing-office navy, standing clear of the solid, following the BOUNDING BOX
// and not the geometry. Dashed because no piece of furniture has a dashed
// edge; offset because a line lying on an edge reads as that edge; navy
// because that is already the ink this app measures in, and a measurement and
// a selection are both the tool talking rather than the work.
//
// It is drawn with depth testing OFF and last, so it is never half-buried in
// the cabinet it is pointing at — a selection you have to orbit to see is not
// a selection.

export default function SelectionOutline({ box, profile, active = true, opacity = 1 }) {
  const ref = useRef(null);
  const S = profile.appearance.selection;
  const off = S.offset;

  const geometry = useMemo(() => {
    if (!box) return null;
    const solid = new THREE.BoxGeometry(
      mm(box.w + off * 2),
      mm(box.h + off * 2),
      mm(box.d + off * 2),
    );
    // The twelve edges of the box, not its twelve triangulated faces.
    const edges = new THREE.EdgesGeometry(solid);
    solid.dispose();
    return edges;
  }, [box?.w, box?.h, box?.d, off]);   // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => geometry?.dispose(), [geometry]);

  // A dashed material draws nothing at all without line distances, and they
  // have to be recomputed whenever the geometry changes — a resized unit would
  // otherwise keep the dash pattern of the size it used to be.
  useEffect(() => { ref.current?.computeLineDistances(); }, [geometry]);

  if (!box || !geometry || !active) return null;

  return (
    <lineSegments
      ref={ref}
      geometry={geometry}
      userData={{ ccHelper: true }}
      renderOrder={20}
      position={[mm(box.x + box.w / 2), mm(box.y + box.h / 2), mm(box.z + box.d / 2)]}
      raycast={() => null}
    >
      <lineDashedMaterial
        color={S.colour}
        dashSize={mm(S.dash)}
        gapSize={mm(S.gap)}
        transparent
        opacity={opacity}
        depthTest={false}
        toneMapped={false}
        // A mark on top of the furniture, not furniture: kept out of the
        // contact-shadow depth pass (turn 9, CLAUDE.md F1.3).
        allowOverride={false}
      />
    </lineSegments>
  );
}

/**
 * The box the mark goes round: the whole SOLID, from the engine's own panel
 * boxes. Doors stand proud of the carcass and an end panel stands outside it,
 * and a selection that stopped at the carcass would cut through both.
 */
export function solidBounds(panels) {
  let minX = Infinity; let minY = Infinity; let minZ = Infinity;
  let maxX = -Infinity; let maxY = -Infinity; let maxZ = -Infinity;
  for (const p of panels) {
    if (!p.box) continue;
    minX = Math.min(minX, p.box.x);
    minY = Math.min(minY, p.box.y);
    minZ = Math.min(minZ, p.box.z);
    maxX = Math.max(maxX, p.box.x + p.box.w);
    maxY = Math.max(maxY, p.box.y + p.box.h);
    maxZ = Math.max(maxZ, p.box.z + p.box.d);
  }
  if (!Number.isFinite(minX)) return null;
  return { x: minX, y: minY, z: minZ, w: maxX - minX, h: maxY - minY, d: maxZ - minZ };
}
