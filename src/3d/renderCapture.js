import * as THREE from 'three';
import { forEachBevelled } from './bevel.js';
import { wallFacesCamera } from './Room.jsx';

// ─── Taking the picture (turn 6, CLAUDE.md F2) ───
//
// The render is the SAME scene the editor is looking at, photographed properly:
// the working view is a tool and shows handles, dimension labels, outlines and
// a selection box, and none of that belongs in an image a workshop shows to its
// customer. So this module does four things and then puts everything back:
//
//   1. hides the tool — every helper, every outline, every label;
//   2. turns the picture up — ACES tone mapping, a brighter environment, the
//      big shadow map, the stronger cavity darkening;
//   3. renders at the asked-for pixel size through a camera of its own;
//   4. restores all of it, exactly, before the next frame.
//
// Why the canvas and not a render target: rendering to a target hands back
// LINEAR pixels, so the tone mapping and the sRGB conversion the renderer is
// configured with would have to be redone by hand and would be a second place
// for the picture to be wrong. `setSize(w, h, false)` resizes the DRAWING
// BUFFER and leaves the CSS size alone — the canvas on screen does not move
// while its backing store is briefly 4K.

/** Objects carrying this in userData are the TOOL, not the furniture. */
export const HELPER_FLAG = 'ccHelper';

/** …and this marks something that IS in the picture but must not frame it. */
export const NO_BOUNDS_FLAG = 'ccNoBounds';

/** …and this one marks a LINE that is furniture rather than tool (turn 8, F8). */
export const FURNITURE_FLAG = 'ccFurniture';

/**
 * A helper, an outline pass, or a billboarded label — all of it tool chrome.
 *
 * `isLineSegments2` is not paranoia: drei's <Edges> draws a fat line, which is
 * a LineSegments2, which extends MESH. Checking only `isLineSegments` left
 * every contour in the render and the first 4K still came back with a wire
 * frame drawn over the furniture.
 */
function isChrome(object) {
  // ─── Turn 8 (CLAUDE.md F8) ───
  // The joint is drawn as line segments and is NOT chrome: it is furniture, it
  // belongs in a still exactly as an edge belongs on a board, and the whole
  // point of drawing it is that a customer sees it. Everything else made of
  // lines still is chrome — the contour pass, the dimension arrows, the
  // selection box — so the flag is on the thing that is the exception.
  if (object.userData?.[FURNITURE_FLAG]) return false;
  return Boolean(object.userData?.[HELPER_FLAG])
    || object.isLineSegments || object.isLine || object.isSprite
    || object.isLineSegments2 || object.isLine2;
}

const BOX = new THREE.Box3();

/**
 * The box the furniture occupies, in world units.
 *
 * Written out rather than `Box3.setFromObject`, which expands for EVERY
 * descendant with a geometry — including the invisible ones. A dimension label
 * is a sprite with a quad on it, and a contact shadow is a quad half again as
 * big as the cabinet: framing on either of them would push the furniture into
 * the middle distance of its own render.
 */
export function furnitureBounds(roots) {
  const box = new THREE.Box3().makeEmpty();
  const walk = (object) => {
    if (!object || object.userData?.[HELPER_FLAG] || object.userData?.[NO_BOUNDS_FLAG]) return;
    if (object.isMesh && object.geometry) {
      if (!object.geometry.boundingBox) object.geometry.computeBoundingBox();
      BOX.copy(object.geometry.boundingBox).applyMatrix4(object.matrixWorld);
      box.union(BOX);
    }
    for (const child of object.children) walk(child);
  };
  for (const root of roots || []) {
    root?.updateWorldMatrix(true, true);
    walk(root);
  }
  if (box.isEmpty()) return null;
  return { min: box.min.toArray(), max: box.max.toArray() };
}

/**
 * Photograph the scene.
 *
 * @param {object} rig   { gl, scene, camera }  from useThree()
 * @param {object} job   engine/render.js renderJob() output
 * @returns {{dataUrl:string, width:number, height:number}}
 */
export function captureRender({ gl, scene, camera }, job) {
  const restore = [];
  const undo = (fn) => restore.push(fn);

  // ── 1. hide the tool ──
  const hidden = [];
  scene.traverse((object) => {
    if (object.visible && isChrome(object)) {
      object.visible = false;
      hidden.push(object);
    }
  });
  undo(() => { for (const o of hidden) o.visible = true; });

  // ── 2. turn the picture up ──
  const prevTone = gl.toneMapping;
  const prevExposure = gl.toneMappingExposure;
  gl.toneMapping = THREE.ACESFilmicToneMapping;
  gl.toneMappingExposure = job.exposure;
  undo(() => { gl.toneMapping = prevTone; gl.toneMappingExposure = prevExposure; });

  const prevEnv = scene.environmentIntensity;
  const prevEnvMap = scene.environment;
  scene.environmentIntensity = job.environmentIntensity;
  // A still is ALWAYS lit properly, whatever the editor is set to: somebody who
  // has turned the working view's lighting off to keep an old laptop responsive
  // is not asking for a flat render to show a customer. Putting the map back
  // costs a shader rebuild, which is a beat on a render and nothing at all on
  // the frame rate the switch was turned off to protect.
  if (!scene.environment && scene.userData?.ccEnvironment) {
    scene.environment = scene.userData.ccEnvironment;
  }
  undo(() => { scene.environmentIntensity = prevEnv; scene.environment = prevEnvMap; });

  const prevAo = [];
  forEachBevelled(scene, (state) => {
    prevAo.push([state, state.ao]);
    state.ao = job.ao;
    if (state.uniforms) state.uniforms.ccAo.value = job.ao;
  });
  undo(() => {
    for (const [state, value] of prevAo) {
      state.ao = value;
      if (state.uniforms) state.uniforms.ccAo.value = value;
    }
  });

  // The lighting balance. The editor runs a high ambient so the walls read
  // white with no tone mapping (turn 4); a still can afford less ambient and
  // more key, which is what puts modelling back into a matt white side panel.
  scene.traverse((object) => {
    const role = object.userData?.ccLight;
    const scale = role && job.lightScale?.[role];
    if (!scale) return;
    const prev = object.intensity;
    object.intensity = prev * scale;
    undo(() => { object.intensity = prev; });
  });

  // Shadow maps: the size is a property of the LIGHT, so the working view's
  // 1024 map is swapped for the render's 4096 and disposed back afterwards.
  // Changing the size needs the existing map thrown away — three allocates it
  // once and never checks whether the size it was allocated at is still asked
  // for, which is why a render at "high" would otherwise look identical.
  for (const light of lightsWithShadows(scene)) {
    const s = light.shadow;
    const prev = { w: s.mapSize.x, h: s.mapSize.y, radius: s.radius, bias: s.bias };
    s.mapSize.set(job.shadows.mapSize, job.shadows.mapSize);
    s.radius = job.shadows.radius;
    s.bias = job.shadows.bias;
    s.map?.dispose();
    s.map = null;
    s.needsUpdate = true;
    undo(() => {
      s.mapSize.set(prev.w, prev.h);
      s.radius = prev.radius;
      s.bias = prev.bias;
      s.map?.dispose();
      s.map = null;
      s.needsUpdate = true;
    });
  }

  // ── 3. render at size, through a camera of its own ──
  const size = new THREE.Vector2();
  gl.getSize(size);
  const prevPixelRatio = gl.getPixelRatio();
  undo(() => {
    gl.setPixelRatio(prevPixelRatio);
    gl.setSize(size.x, size.y, false);
  });

  const shot = new THREE.PerspectiveCamera(
    job.useLiveCamera ? camera.fov : job.camera.fov,
    job.width / job.height,
    camera.near,
    camera.far,
  );
  if (job.useLiveCamera) {
    shot.position.copy(camera.position);
    shot.quaternion.copy(camera.quaternion);
  } else {
    shot.position.set(...job.camera.position);
    shot.up.set(0, 1, 0);
    shot.lookAt(new THREE.Vector3(...job.camera.target));
  }
  shot.updateProjectionMatrix();

  // The walls the SHOT camera is behind, hidden — the same test the editor runs
  // per frame, run once here for a different camera. Without it, framing on a
  // unit standing at a wall puts the camera outside the room and the render
  // comes back as a full-frame rectangle of the back of that wall.
  scene.traverse((object) => {
    const face = object.userData?.ccWall;
    if (!face || !object.visible) return;
    if (wallFacesCamera(face, shot.position)) return;
    object.visible = false;
    undo(() => { object.visible = true; });
  });

  let out;
  try {
    // Pixel ratio 1: `job.width` is already the exact pixel count asked for,
    // and a 2× ratio on top of 4K is a 7680 px buffer nobody ordered.
    gl.setPixelRatio(1);
    gl.setSize(job.width, job.height, false);
    gl.render(scene, shot);
    out = {
      dataUrl: gl.domElement.toDataURL('image/png'),
      width: gl.domElement.width,
      height: gl.domElement.height,
    };
  } finally {
    // ── 4. put it all back, in reverse, whatever happened ──
    for (let i = restore.length - 1; i >= 0; i -= 1) restore[i]();
    // One frame at the restored settings, so the editor is never left showing
    // the render's exposure while it waits for the next animation frame.
    gl.render(scene, camera);
  }
  return out;
}

function lightsWithShadows(scene) {
  const out = [];
  scene.traverse((o) => { if (o.isLight && o.castShadow && o.shadow) out.push(o); });
  return out;
}

/** A data URL, saved as a file. Shares no code with the exporters by design —
 *  this one never touches jsPDF or the BOM, it is one anchor and one click. */
export function savePng(dataUrl, filename) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
