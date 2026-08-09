// ─── Render configuration (turn 6, CLAUDE.md F2 / BACKLOG #37) ───
//
// The maths behind "Render": what size the image is, where the camera stands
// for each preset, what the file is called. None of it touches three.js — the
// 3D layer takes these numbers and points a camera with them, which is what
// makes the framing testable in node instead of by eye on a 4K PNG.
//
// The business reason this exists at all (BACKLOG #37): our customer is a
// workshop, and the workshop shows this image to ITS customer. The picture has
// to sell, not merely inform.
//
// Pure functions — no React, no store imports, no three.js.

import { getCabinetProfile } from './profile.js';

// ─── Resolution ───

/**
 * The pixel size of a render: the LONGER side is fixed by the preset, the
 * shorter one follows the aspect the user is looking at, so the render frames
 * what the screen frames instead of cropping it.
 *
 * @param {number} longSide   pixels on the longer edge (1920, 3840…)
 * @param {number} aspect     width / height of the live view
 * @returns {{width:number, height:number}}  even numbers, both ≥ 2
 */
export function renderSize(longSide, aspect) {
  const long = Math.max(2, Math.round(Number(longSide) || 0));
  const a = Number(aspect);
  const ratio = Number.isFinite(a) && a > 0 ? a : 16 / 9;
  const landscape = ratio >= 1;
  const short = Math.round(long * (landscape ? 1 / ratio : ratio));
  const width = landscape ? long : short;
  const height = landscape ? short : long;
  // Even dimensions: an odd-width canvas is legal but every downstream tool
  // (video, print RIP) prefers even, and it costs nothing to hand over even.
  return { width: even(width), height: even(height) };
}

const even = (n) => Math.max(2, n % 2 === 0 ? n : n + 1);

/** The resolution options, as the settings panel lists them. */
export function renderResolutions(profile = getCabinetProfile()) {
  return profile.render.resolutions.map((r) => ({ ...r }));
}

export function resolutionById(id, profile = getCabinetProfile()) {
  return profile.render.resolutions.find((r) => r.id === id) || profile.render.resolutions[0];
}

// ─── Lens ───

/**
 * Vertical field of view, in degrees, of a lens of `focalMm` on a sensor
 * `sensorHeightMm` tall. 35 mm on full frame — the profile default — is 37.8°,
 * which is the "stand back and take it in" framing an interior photographer
 * uses, and the reason the presets do not look like a CAD viewport.
 */
export function lensFov(focalMm, sensorHeightMm) {
  const f = Number(focalMm);
  const s = Number(sensorHeightMm);
  if (!(f > 0) || !(s > 0)) return 45;
  return (2 * Math.atan(s / (2 * f)) * 180) / Math.PI;
}

// ─── Camera presets ───

/**
 * Where each preset stands, as a direction from the subject: `az` is degrees
 * around the room from straight-on (positive = towards the unit's right), `el`
 * is degrees above the horizon.
 *
 * `current` has no direction — it means "the camera as it is on screen", which
 * is what a user who has already framed the shot wants and is why it is first.
 */
export const CAMERA_PRESETS = [
  { id: 'current', label: 'Current view', hint: 'Exactly what is on screen now' },
  { id: 'front', label: 'Front', az: 0, el: 6, hint: 'Straight on, a touch above' },
  { id: 'iso-left', label: '3/4 Left', az: -35, el: 16, hint: 'Three-quarter from the left' },
  { id: 'iso-right', label: '3/4 Right', az: 35, el: 16, hint: 'Three-quarter from the right' },
  { id: 'top', label: 'Top', az: 0, el: 84, hint: 'Looking down — the plan' },
];

export function cameraPreset(id) {
  return CAMERA_PRESETS.find((p) => p.id === id) || CAMERA_PRESETS[0];
}

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
function unit(v) {
  const len = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / len, v[1] / len, v[2] / len];
}

/**
 * Frame a box. Given what has to be in the picture and the shape of the
 * picture, this is where the camera stands and what it looks at.
 *
 * Every CORNER is fitted, not the bounding sphere. A sphere is the easy answer
 * and it is the wrong one here: a run of kitchen units is 1.8 m wide, 0.9 m
 * tall and 0.6 m deep, so its sphere is nearly twice as tall as the furniture
 * and the render comes back with the cabinets sitting in the middle third of a
 * lot of empty floor. Fitting the corners frames what is actually there.
 *
 * The reason the sphere is tempting — that it does not change when the camera
 * swings round — still holds for the corner fit on the presets that matter:
 * "3/4 left" and "3/4 right" are mirror images, and a box is symmetric, so the
 * two come out at the same distance and a pair of renders reads as one project.
 *
 * @param {object} args
 *   bounds  { min:[x,y,z], max:[x,y,z] } in ANY one unit — metres here, since
 *           that is what the scene is in; the result comes back in the same one
 *   preset  a CAMERA_PRESETS id
 *   aspect  width / height of the image
 *   fov     vertical field of view, degrees
 *   margin  how much air around the subject (1.0 = touching the frame)
 * @returns {{position:number[], target:number[], fov:number, distance:number}}
 */
export function framedCamera({ bounds, preset = 'front', aspect = 16 / 9, fov = 38, margin = null }) {
  const p = cameraPreset(preset);
  const profile = getCabinetProfile();
  const pad = Number(margin) > 0 ? Number(margin) : profile.render.margin;

  const min = bounds?.min || [0, 0, 0];
  const max = bounds?.max || [1, 1, 1];
  const centre = [0, 1, 2].map((i) => (min[i] + max[i]) / 2);

  // Where the camera stands, as a direction from the subject.
  // 'current' still returns a frame — the caller uses the live camera and
  // ignores it, but a preset that returned nothing would force a null check
  // into every caller for no gain.
  const az = ((p.az ?? 0) * Math.PI) / 180;
  const el = ((p.el ?? 12) * Math.PI) / 180;
  const dir = unit([
    Math.sin(az) * Math.cos(el),
    Math.sin(el),
    Math.cos(az) * Math.cos(el),
  ]);

  // The camera's own axes. Looking straight down, world up is parallel to the
  // view direction and the cross product collapses — so the top preset takes
  // its "up" from the room instead.
  const worldUp = Math.abs(dir[1]) > 0.999 ? [0, 0, -1] : [0, 1, 0];
  const right = unit(cross(worldUp, dir));
  const up = unit(cross(dir, right));

  // The vertical fov is what the camera carries; the horizontal one follows the
  // aspect. Both are checked, because a PORTRAIT render is limited by the
  // horizontal — which is the case that quietly crops a wide kitchen in half.
  const vHalf = (fov * Math.PI) / 360;
  const hHalf = Math.atan(Math.tan(vHalf) * Math.max(0.01, aspect));
  const tanH = Math.tan(hHalf);
  const tanV = Math.tan(vHalf);

  // For a corner at offset v from the centre, at camera distance D its depth
  // is (D − v·dir); it is in frame while |v·right| ≤ depth·tan(h) and
  // |v·up| ≤ depth·tan(v). Solved for D and maximised over the eight corners.
  let distance = 1e-4;
  for (const sx of [0, 1]) {
    for (const sy of [0, 1]) {
      for (const sz of [0, 1]) {
        const v = [
          (sx ? max[0] : min[0]) - centre[0],
          (sy ? max[1] : min[1]) - centre[1],
          (sz ? max[2] : min[2]) - centre[2],
        ];
        const behind = dot(v, dir);
        distance = Math.max(
          distance,
          Math.abs(dot(v, right)) / tanH + behind,
          Math.abs(dot(v, up)) / tanV + behind,
        );
      }
    }
  }
  distance *= pad;

  return {
    position: [0, 1, 2].map((i) => centre[i] + dir[i] * distance),
    target: centre,
    fov,
    distance,
  };
}

/**
 * The box that has to be in the picture: every unit, plus the floor under them
 * and a little headroom, so a render is never a cabinet floating in a void.
 *
 * @param {Array<{min:number[], max:number[]}>} boxes
 * @param {{floor?:number}} [opts]  floor level to include (default: include it)
 */
export function subjectBounds(boxes, { floor = 0 } = {}) {
  const list = (boxes || []).filter((b) => b?.min && b?.max);
  if (!list.length) return { min: [-1, 0, -1], max: [1, 2, 1] };
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const b of list) {
    for (let i = 0; i < 3; i += 1) {
      min[i] = Math.min(min[i], b.min[i]);
      max[i] = Math.max(max[i], b.max[i]);
    }
  }
  if (Number.isFinite(floor)) min[1] = Math.min(min[1], floor);
  return { min, max };
}

// ─── Shadows ───

export function shadowQualities(profile = getCabinetProfile()) {
  return Object.entries(profile.render.shadow).map(([id, cfg]) => ({ id, ...cfg }));
}

export function shadowQuality(id, profile = getCabinetProfile()) {
  return profile.render.shadow[id] || profile.render.shadow.normal;
}

// ─── The file ───

// Letters that are NOT an accent over a Latin base and so survive NFKD intact.
// Polish ł is the one that matters here — the workshop is in Poland and "Łódź"
// coming out as "odz" is a filename nobody recognises as their own project.
const STANDALONE = {
  ł: 'l', Ł: 'L', đ: 'd', Đ: 'D', ø: 'o', Ø: 'O', ß: 'ss', æ: 'ae', Æ: 'AE', œ: 'oe', Œ: 'OE', ħ: 'h', ı: 'i',
};

/** A filename fragment: lower case, words joined by '-', nothing exotic left. */
export function slug(text, fallback = 'project') {
  const s = String(text ?? '')
    .replace(/[łŁđĐøØßæÆœŒħı]/g, (c) => STANDALONE[c])
    // NFKD splits an accented letter into its base plus a combining mark; the
    // marks are then dropped, so "Ostrów" becomes "ostrow" rather than "ostrw".
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return s || fallback;
}

/**
 * `{project}-{unit|scene}-{date}.png` (CLAUDE.md F2).
 *
 * `subject` is a unit number when one unit is selected and the literal 'scene'
 * when the render is of the whole room — so a folder of renders sorts by
 * project, then tells you at a glance which are details and which are the
 * money shot.
 */
export function renderFilename({ project, subject, date = new Date(), ext = 'png' } = {}) {
  const d = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return `${slug(project)}-${slug(subject, 'scene')}-${stamp}.${ext}`;
}

/**
 * Everything the 3D layer needs for one render, resolved from the choices in
 * the panel. One place turns "4K, 3/4 left, high shadows" into numbers, so the
 * preview and the saved file cannot disagree about what was asked for.
 */
export function renderJob({
  resolution = '4k', preset = 'current', shadows = 'normal', aspect = 16 / 9,
  bounds = null, project = 'project', subject = 'scene', date = new Date(),
} = {}, profile = getCabinetProfile()) {
  const res = resolutionById(resolution, profile);
  const size = renderSize(res.long, aspect);
  const fov = lensFov(profile.render.focalMm, profile.render.sensorHeightMm);
  const imageAspect = size.width / size.height;
  return {
    resolution: res.id,
    label: res.label,
    ...size,
    aspect: imageAspect,
    preset,
    useLiveCamera: preset === 'current',
    camera: framedCamera({ bounds, preset, aspect: imageAspect, fov, margin: profile.render.margin }),
    shadows: { id: shadows, ...shadowQuality(shadows, profile) },
    lightScale: { ...profile.render.lightScale },
    exposure: profile.render.exposure,
    environmentIntensity: profile.appearance.environment.renderIntensity,
    ao: profile.appearance.bevel.ao.render,
    filename: renderFilename({ project, subject, date }),
  };
}

// ─── The editor's rig, as numbers (turn 16, CLAUDE.md F7) ───────────────────

/**
 * The lamps the element editor and the part-detail window are lit by, resolved
 * against the window's own orbit radius.
 *
 * It is HERE and not in the component for the reason every number in this app
 * is: rule 3. Both windows carried three lights as literals in their JSX, which
 * is why the owner's "serio nic nie widać" could not be answered by turning a
 * knob — there was no knob. Now there is one rig, in `appearance.editorRig`,
 * and this is the arithmetic that turns its fractions into positions.
 *
 * Pure: give it a profile and a radius and it answers, which is what lets the
 * browser walk MEASURE the change rather than eyeball it.
 *
 * @param {object} profile
 * @param {number} radius   the window's orbit radius, in scene units (metres)
 * @returns {{ambient:number, hemisphere:object,
 *            lamps:Array<{id:string, position:[number,number,number], intensity:number}>}}
 */
export function editorRigLamps(profile = getCabinetProfile(), radius = 1) {
  const rig = profile?.appearance?.editorRig || {};
  const r = Number(radius) > 0 ? Number(radius) : 1;
  const lamps = Array.isArray(rig.lamps) ? rig.lamps : [];
  return {
    ambient: Number(rig.ambient) || 0,
    hemisphere: {
      sky: rig.hemisphere?.sky || '#ffffff',
      ground: rig.hemisphere?.ground || '#c8c2b4',
      intensity: Number(rig.hemisphere?.intensity) || 0,
    },
    lamps: lamps.map((l, i) => ({
      id: l.id || `lamp${i + 1}`,
      position: [r * Number(l.x || 0), r * Number(l.y || 0), r * Number(l.z || 0)],
      intensity: Number(l.intensity) || 0,
    })),
  };
}

/**
 * How much light the editor rig puts out in total, as one number.
 *
 * The measure CLAUDE.md F7 asks to be held to ("raise its rig ~25 %"): it is
 * the sum of every lamp plus the ambient and the hemisphere, so a turn that
 * moves one lamp and lowers another has to say what it did to the whole.
 */
export function editorRigOutput(profile = getCabinetProfile()) {
  const rig = editorRigLamps(profile, 1);
  return rig.ambient + rig.hemisphere.intensity
    + rig.lamps.reduce((sum, l) => sum + l.intensity, 0);
}
