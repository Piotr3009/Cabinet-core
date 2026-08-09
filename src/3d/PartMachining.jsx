import { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { mm } from './constants.js';
import { machiningLines } from '../engine/joinery.js';
import { layerScreenColor } from '../engine/cnc/layers.js';

// ─── WHAT THE MACHINE WILL DO TO THIS BOARD (turn 17, CLAUDE.md F4.1) ───────
//
// Owner, editing a drawer: "jak je edytuję to nie mają żadnych wcięć, nie widzę
// dziurek." And, on a fridge back: "na CNC są dog bones a na elemencie nie ma."
//
// He is right on both, and both were the same gap: the CABINET EDITOR draws a
// part as its solid and nothing else. A socket is visible there because turn 11
// cuts it out of the solid; a DOG BONE, a runner groove and every drilled hole
// are not part of the outline, so they were on the sheet and on the file and
// nowhere on the piece the joiner had in his hand.
//
// This is the overlay that closes it, and it is a VIEW and only a view — named
// delta 4, "a VIEW change with no geometry change". The lines are
// `engine/joinery.js machiningLines`, which reads `panel.cnc` and the unit's
// own `drills`: the same two records `engine/cnc/dxf.js` writes the DXF from.
// There is no second drawing of a dog bone in this app and there must not be
// one — where the two ever disagree the export is the truth and this is the bug.
//
// COST. One LineSegments per LAYER, not per hole: a side panel has eighteen
// holes, six pockets and one outline, and eighteen draw calls for a few circles
// is a frame rate spent on hairlines. Grouped, it is four or five buffers for a
// whole part, built once per panel and disposed with it. The canvas it lives on
// is mounted only while the editor window is open.
//
// The COLOURS are `engine/cnc/layers.js` — the CNC preview's own — so a
// DRAWER_RUNNER_POCKET is the same orange here, on the sheet and in the detail
// window, and the legend a joiner has already learnt keeps meaning what it
// meant.

export default function PartMachining({
  panel, drills = [], profile, lift = null, visible = true,
}) {
  const geometries = useMemo(() => {
    if (!visible || !panel) return [];
    const off = lift == null ? (profile?.appearance?.joinery?.lift ?? 0.4) : lift;
    const byLayer = new Map();
    for (const line of machiningLines(panel, drills, { lift: off })) {
      const list = byLayer.get(line.layer) || [];
      // A polyline becomes the segments between its points — LineSegments takes
      // them in pairs, which is what lets one buffer hold a whole layer's worth
      // of pockets and holes however many there are.
      for (let i = 0; i < line.points.length - 1; i += 1) {
        list.push(...line.points[i].map(mm), ...line.points[i + 1].map(mm));
      }
      byLayer.set(line.layer, list);
    }
    return [...byLayer.entries()].map(([layer, points]) => {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(points), 3));
      return { layer, geometry, colour: layerScreenColor(layer) };
    });
  }, [panel, drills, profile, lift, visible]);

  useEffect(() => () => { for (const g of geometries) g.geometry.dispose(); }, [geometries]);

  if (!geometries.length) return null;
  return (
    <group userData={{ ccHelper: true }} data-part-machining={panel.id}>
      {geometries.map(({ layer, geometry, colour }) => (
        <lineSegments key={layer} geometry={geometry} userData={{ ccHelper: true, ccMachiningLayer: layer }}>
          <lineBasicMaterial
            color={colour}
            // It sits a fraction off the board and must not also fight the board
            // behind it for the depth buffer — the same rule 3d/JointLines.jsx
            // follows, and for the same reason.
            depthWrite={false}
            toneMapped={false}
          />
        </lineSegments>
      ))}
    </group>
  );
}
