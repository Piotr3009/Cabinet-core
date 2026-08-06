import * as THREE from 'three';

// ─── What a panel is made of, as far as the eye is concerned ───
//
// One place decides which finish a panel role wears, how dark a shade it takes
// and what the sheen is — read from profile.appearance, so none of it is a bare
// number in the view (CLAUDE.md rule 3). Nothing here touches the engine: a
// finish is not a dimension and never reaches the cut list.

/** Hex → THREE.Color, tolerating a missing value. */
function colour(hex, fallback = '#ffffff') {
  return new THREE.Color(hex || fallback);
}

/** The same colour, `amount` of the way towards black (0 = untouched). */
function shaded(hex, amount) {
  const c = colour(hex);
  if (!amount) return c;
  return c.lerp(new THREE.Color('#000000'), Math.max(0, Math.min(1, amount)));
}

// One decoded image per decor, however many panels wear it.
const sources = new Map();

/**
 * The shared texture for a decor. Cloned per panel (useDecor in UnitView) so
 * each piece can scale the grain to its own size; a clone shares this image, so
 * the GPU still holds exactly one copy of it.
 *
 * `loaded` and the listener set exist because a clone taken BEFORE the image
 * arrives keeps its own upload version — the renderer would never refresh it
 * and the panel would stay blank. Callers re-clone when the load fires.
 */
export function decorSource(url) {
  if (!url) return null;
  const known = sources.get(url);
  if (known) return known;
  const entry = { tex: null, loaded: false, listeners: new Set() };
  sources.set(url, entry);
  entry.tex = new THREE.TextureLoader().load(url, () => {
    entry.loaded = true;
    for (const cb of entry.listeners) cb();
  });
  entry.tex.wrapS = THREE.RepeatWrapping;
  entry.tex.wrapT = THREE.RepeatWrapping;
  entry.tex.colorSpace = THREE.SRGBColorSpace;
  return entry;
}

/** Tell me when this decor's image is ready. Returns an unsubscribe. */
export function onDecorLoad(url, callback) {
  const entry = decorSource(url);
  if (!entry) return () => {};
  if (entry.loaded) { callback(); return () => {}; }
  entry.listeners.add(callback);
  return () => entry.listeners.delete(callback);
}

// Clones keyed by url AND repeat: a room full of 600 mm doors shares one.
const clones = new Map();

/**
 * The decor scaled to a piece this size, or null while the image is still
 * loading — a texture with no image renders as a blank panel, which reads as a
 * bug rather than as "not ready yet".
 *
 * TWO things here are load-order traps, and both cost a debugging session:
 *   1. the clone must be taken AFTER the image has arrived, otherwise it holds
 *      the loader's placeholder for ever (the source updating does not reach a
 *      clone that was already uploaded);
 *   2. `needsUpdate` must be set on the clone, because three only uploads a
 *      texture whose `version > 0` — and a fresh clone starts at 0, so without
 *      this the panel is white with a perfectly good image sitting in memory.
 * Clones are cached by url AND repeat, so the extra uploads are a handful per
 * project rather than one per panel.
 */
export function decorTexture(url, repeatX, repeatY) {
  const entry = decorSource(url);
  if (!entry?.loaded || !entry.tex) return null;
  const rx = Math.round(Math.max(0.2, repeatX) * 100) / 100;
  const ry = Math.round(Math.max(0.2, repeatY) * 100) / 100;
  const key = `${url}|${rx}|${ry}`;
  const known = clones.get(key);
  if (known) return known;
  const tex = entry.tex.clone();
  tex.repeat.set(rx, ry);
  tex.needsUpdate = true;
  clones.set(key, tex);
  return tex;
}

/**
 * Which finish a panel role wears.
 * Fronts wear the front finish; everything else wears the carcass finish, some
 * of it a shade down so an open cabinet reads as separate pieces.
 */
export function surfaceFor({ role, finishes, profile, frontColour = null }) {
  const A = profile.appearance;
  const finish = role === 'front' ? finishes.front : finishes.carcass;
  const shade = A.shade[role] || 0;

  // A front colour chosen in Design Settings is PAINT: it covers the decor,
  // exactly as it does in the workshop.
  const paint = role === 'front' ? frontColour : null;
  const isDecor = !paint && finish?.kind === 'decor' && finish.texture;

  // A TINTED decor (turn 5, BACKLOG #19) carries our own greyscale grain and
  // the manufacturer's average colour: the multiply is the point, so the base
  // is the decor's hex rather than white. This is what lets an EGGER woodgrain
  // be shown in 3D at all without an EGGER pixel ever reaching the geometry —
  // the figure is ours, only the colour is theirs. See engine/decors.js.
  const tinted = isDecor && finish.tint;

  return {
    // An UNtinted decor's colour multiplies its own image, so the base has to be
    // white for that grain to come through at its own tone.
    colour: paint
      ? colour(paint)
      : ((isDecor && !tinted) ? shaded('#ffffff', shade) : shaded(finish?.hex, shade)),
    texture: isDecor ? finish.texture : null,
    repeatMm: isDecor ? (finish.repeatMm || 900) : 0,
    roughness: A.sheen.roughness,
    clearcoat: A.sheen.clearcoat,
    clearcoatRoughness: A.sheen.clearcoatRoughness,
    metalness: A.sheen.metalness,
  };
}

/** The contour-view surface: the material steps back, the outline stays. */
export function contourSurface(profile) {
  const C = profile.appearance.contour;
  return {
    colour: colour(C.hex),
    texture: null,
    repeatMm: 0,
    roughness: 1,
    clearcoat: 0,
    clearcoatRoughness: 1,
    metalness: 0,
    opacity: C.opacity,
  };
}

/** The outline every piece is drawn with — thin and black (BACKLOG #5). */
export function outlineFor(profile, { selected = false, contour = false } = {}) {
  const A = profile.appearance;
  if (selected) return { colour: A.selection.colour, width: A.selection.width, threshold: A.outline.threshold };
  return {
    colour: contour ? A.contour.outline : A.outline.colour,
    width: A.outline.width,
    threshold: A.outline.threshold,
  };
}
