// ─── THE DIVIDER'S HEAD AND FOOT (chat fix 17.10.2026) ──────────────────────
//
// The mirror of reference/lisp/SKYLON_JOINTS_BISCUIT.lsp section I, routine for
// routine. The owner, 17.10.2026, of a full-height divider: *"na dividerze mamy
// wiercenie 3 mm w bottom ale nie mamy w top, a nie ma przeciez fix shelves
// zeby divider sie zatrzymal, i do tego nie mamy ciastek"*; the T13 set on the
// TOP and the BOTTOM in place of T30's two bare foot screws: *"tak"*; a fix
// shelf under or over a divider: *"jak mamy polke fix to robisz tylko ciastka
// bez nawiertow"*; whatever the carcass joint system: *"tak, koduj"*.
//
// THE JOINT. A vertical divider (VPART) is an EDGE board twice over: its FOOT
// lands on the face of the board under it, its HEAD under the board over it.
// Each end is a butt joint and takes the owner's set (engine/biscuits.js:
// screw 3, gap 10, mark 70, gap 10, screw 3; two sets, three above 700):
//   TOP and BOTTOM are CONCEALED receivers (profile.biscuits.concealedReceivers):
//     the through-screw set, two dia 3 screws and the 70 mark per set;
//   a FIX shelf, a drawer stack's PARTITION, any other horizontal board: the
//     mark alone, in the same positions, drawn on the board's drawn face;
//   the divider itself carries NOTHING (T26 F7.1, the fix shelf's ruling: its
//     ends are plain; the slot in the end is the bench's).
// THE JOINT LINE is the overlap in depth of the divider and its receiver; the
// datum is the overlap's FRONT end, offsets run towards the back. THE ACROSS
// is the divider's centre line. Both are projected into the receiver's own CNC
// frame through engine/topFrame.js producerPlacement (engine/joinery.js
// panelPlacement for every board but the TOP, whose record is mirrored once
// at the end of computeCabinet into the frame panelPlacement publishes): one
// placement, one answer for the DXF, the sheet, the 3-D and this.
//
// The wardrobe kit's own DP keeps drawWardrobeDPHolesBOTTOM (engine/
// partitionFixings.js): the fossil's law for its own piece. The dia 3 row
// through the BACK along a divider (T23 F6) stays: it is the back's joint.
//
// Pure functions, pure data: no React, no store, no three.js.
import { biscuitLayers, biscuitSets, receiverTakesScrews } from './biscuits.js';
// Chat fix 17.10.2026 (14:15): the TOP's record is written in the LISP's
// ROT90 frame and mirrored ONCE at the end of computeCabinet (topFrame.js),
// so this producer projects into the producers' frame, not panelPlacement's.
import { producerPlacement } from './topFrame.js';

const EPS = 1e-6;
const FACE_EPS = 1e-3;
const r4 = (v) => Math.round(v * 1e4) / 1e4;

/** The drill `kind` of the set's through screws on a divider's receiver. */
export const DIVIDER_SCREW_KIND = 'divider_screw';

/** A fix shelf by the engine's own record (T24 F6; T36's split divider is one too). */
export function isFixedShelfPanel(p) {
  return p?.part === 'SHELF' && Boolean(p.meta?.variant === 'fixed' || p.meta?.splitDivider);
}

/** May this horizontal board receive a divider's end at all? */
export function canReceiveDivider(p) {
  if (!p?.box) return false;
  return p.part === 'TOP' || p.part === 'BOTTOM' || p.part === 'PARTITION' || p.part === 'FIXED'
    || isFixedShelfPanel(p);
}

/**
 * The board whose face stands at height `y` under (foot) or over (head) a
 * divider whose centre line is at `x`. Null when the end is in the air.
 */
export function dividerReceiverAt(panels, { y, x, foot }) {
  return panels.find((p) => canReceiveDivider(p)
    && Math.abs((foot ? p.box.y + p.box.h : p.box.y) - y) < FACE_EPS
    && x > p.box.x - EPS && x < p.box.x + p.box.w + EPS) || null;
}

/** A cabinet point in a panel's CNC frame: x along u, y along v (n ignored). */
function inFrame(placement, pt) {
  const { origin: o, u, v } = placement;
  const d = [pt[0] - o[0], pt[1] - o[1], pt[2] - o[2]];
  return [
    d[0] * u[0] + d[1] * u[1] + d[2] * u[2],
    d[0] * v[0] + d[1] * v[1] + d[2] * v[2],
  ];
}

/**
 * Every divider's head and foot joint of a unit.
 *
 * @param {object} args
 *   panels   the unit's panels (boxes in cabinet mm)
 *   profile  the cabinet profile (biscuits numbers and layers)
 * @returns {{
 *   drills: Array<{panel:string, kind:string, layer:string, x:number, y:number, d:number}>,
 *   marks:  Array<{panelId:string, layer:string, from:number[], to:number[]}>,
 *   joints: Array<{divider:string, end:'foot'|'head', receiver:string|null, length:number, sets:number, screws:boolean}>,
 * }}
 *   `drills` and `marks` are in the RECEIVER's own CNC frame as its producers
 *   draw it (the TOP's before the end mirror, engine/topFrame.js), the shape
 *   cabinet.js's addDrill and its marks writer take.
 */
export function dividerJointCuts({ panels, profile }) {
  const layers = biscuitLayers(profile);
  const dia = Number(profile?.biscuits?.screwDiameter) || 3;
  const drills = [];
  const marks = [];
  const joints = [];
  for (const vp of panels || []) {
    if (vp?.part !== 'VPART' || !vp.box) continue;
    const xc = vp.box.x + vp.box.w / 2;
    for (const end of ['foot', 'head']) {
      const foot = end === 'foot';
      const yEnd = foot ? vp.box.y : vp.box.y + vp.box.h;
      const receiver = dividerReceiverAt(panels, { y: yEnd, x: xc, foot });
      if (!receiver) {
        joints.push({ divider: vp.id, end, receiver: null, length: 0, sets: 0, screws: false });
        continue;
      }
      // The overlap in depth: the joint line, from its FRONT end towards the back.
      const zb = Math.max(vp.box.z, receiver.box.z);
      const zf = Math.min(vp.box.z + vp.box.d, receiver.box.z + receiver.box.d);
      const length = zf - zb;
      const placement = producerPlacement(receiver);
      if (!(length > EPS) || !placement) {
        joints.push({ divider: vp.id, end, receiver: receiver.id, length: r4(Math.max(0, length)), sets: 0, screws: false });
        continue;
      }
      const screws = receiverTakesScrews(receiver.part, profile);
      const sets = biscuitSets({ length, screws, profile });
      const yFace = foot ? receiver.box.y + receiver.box.h : receiver.box.y;
      const at = (t) => inFrame(placement, [xc, yFace, zf - t]);
      for (const set of sets) {
        for (const sc of set.screws) {
          const [x, y] = at(sc);
          drills.push({ panel: receiver.id, kind: DIVIDER_SCREW_KIND, layer: layers.screw, x: r4(x), y: r4(y), d: dia });
        }
        const a = at(set.mark.from);
        const b = at(set.mark.to);
        marks.push({ panelId: receiver.id, layer: layers.mark, from: [r4(a[0]), r4(a[1])], to: [r4(b[0]), r4(b[1])] });
      }
      joints.push({ divider: vp.id, end, receiver: receiver.id, length: r4(length), sets: sets.length, screws });
    }
  }
  return { drills, marks, joints };
}
