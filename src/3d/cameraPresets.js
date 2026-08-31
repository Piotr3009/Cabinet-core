// ─── TURN 59 · THREE PLACES TO STAND ───────────────────────────────────────
//
// CLAUDE.md F3.3: *"FRONT/INSIDE/ROOM are camera presets (front elevation;
// inside = doors open + camera in; room = the room corner)."* and the list of
// what this turn may add to the shared core: *"a camera-preset API if none
// exists"*.
//
// None exists. PRO moves its camera by ORBITING and by `focusOn` — an
// ANIMATION that flies from wherever you are — and neither can answer "stand
// square to the front of this wardrobe". So: three named places, computed off
// the furniture's own bounding box, parked rather than flown.
//
// PARKED, NOT FLOWN, is the whole design. T57's rule, kept: a frame taken while
// a camera is still moving is a frame nobody can reproduce. The client presses
// FRONT and is there; the walk presses FRONT and photographs the same pixels.
//
// PRO does not call any of this. Nothing in `src/components`, `src/pages`,
// `src/App.jsx` or `src/main.jsx` imports this file, so PRO's camera behaves
// exactly as it did last night.

/**
 * The live view the mounted Scene registered (src/3d/viewHandle.js, turn 11).
 * That handle ships in the production bundle deliberately — it is how every
 * acceptance walk since turn 11 has MEASURED instead of photographed — and it
 * is the same scene the canvas is drawing.
 */
export function viewHandle(name = 'room') {
  if (typeof window === 'undefined') return null;
  return window.__cc?.views?.[name] || null;
}

export const CAMERA_PRESETS = ['front', 'inside', 'room'];

const centreOf = (b) => [
  (b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, (b.min[2] + b.max[2]) / 2,
];
const sizeOf = (b) => [b.max[0] - b.min[0], b.max[1] - b.min[1], b.max[2] - b.min[2]];

/**
 * Where each preset stands and what it looks at, in world units (metres).
 *
 * @param {string} preset  'front' | 'inside' | 'room'
 * @param {{min:number[],max:number[]}} box  the furniture's bounding box
 * @returns {{from:number[], at:number[]}|null}
 */
export function presetPlacement(preset, box) {
  if (!box?.min || !box?.max) return null;
  const [cx, cy, cz] = centreOf(box);
  const [w, h, d] = sizeOf(box);

  if (preset === 'front') {
    // Square on. Far enough back that the tallest edge is inside a 40°-ish
    // field with room to breathe, and level with the middle of the piece.
    const reach = Math.max(w, h) * 1.5 + d;
    return { from: [cx, cy, box.max[2] + reach], at: [cx, cy, cz] };
  }

  if (preset === 'inside') {
    // Standing IN the opening, a little above the middle, looking at the back.
    // Held just outside the front face so the fronts — open — stay in frame
    // rather than clipping through the near plane.
    return {
      from: [cx, cy + h * 0.12, box.max[2] + Math.max(d * 0.55, 0.35)],
      at: [cx, cy, box.min[2]],
    };
  }

  // 'room' — the corner a person walks in from: off to one side, above eye
  // height, far enough out that the wall and the floor are both in the picture.
  const reach = Math.max(w, h, d) * 1.9 + 0.8;
  return {
    from: [cx - reach * 0.62, cy + h * 0.42, box.max[2] + reach * 0.78],
    at: [cx, cy - h * 0.05, cz],
  };
}

/**
 * Park the camera at a preset. Returns true when it moved.
 *
 * The controls' target moves WITH the camera — an orbit target left behind is
 * how a view ends up spinning around a point off the side of the screen the
 * first time the client drags.
 */
export function parkCamera(preset, { box, view = viewHandle() } = {}) {
  const place = presetPlacement(preset, box);
  if (!place || !view?.camera) return false;
  const { camera, controls } = view;
  camera.position.set(place.from[0], place.from[1], place.from[2]);
  if (controls?.target?.set) {
    controls.target.set(place.at[0], place.at[1], place.at[2]);
    controls.update?.();
  }
  camera.lookAt(place.at[0], place.at[1], place.at[2]);
  camera.updateProjectionMatrix();
  return true;
}

/**
 * Everything needed to put the camera back EXACTLY where it was — F3.5:
 * *"the return restores EXACTLY the prior state: … same camera. Nothing
 * resets."* Plain numbers, so it can be held in React state and compared.
 */
export function readCamera(view = viewHandle()) {
  if (!view?.camera) return null;
  const { camera, controls } = view;
  return {
    from: [camera.position.x, camera.position.y, camera.position.z],
    at: controls?.target
      ? [controls.target.x, controls.target.y, controls.target.z]
      : [0, 0, 0],
  };
}

export function writeCamera(saved, view = viewHandle()) {
  if (!saved?.from || !view?.camera) return false;
  const { camera, controls } = view;
  camera.position.set(saved.from[0], saved.from[1], saved.from[2]);
  if (controls?.target?.set) {
    controls.target.set(saved.at[0], saved.at[1], saved.at[2]);
    controls.update?.();
  }
  camera.lookAt(saved.at[0], saved.at[1], saved.at[2]);
  camera.updateProjectionMatrix();
  return true;
}
