import * as THREE from 'three';
import { decorMapping, grainRun } from '../engine/decors.js';
import { roughnessFromSheen } from '../engine/design.js';

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
 *
 * `failed` is turn 8's addition and it is what keeps mock mode WORKING
 * (CLAUDE.md rule 7): the manufacturer scans live in Supabase Storage, so a
 * machine with no network, a bad url or a bucket that has moved must fall back
 * to our own procedural grain rather than render 400 white panels.
 */
export function decorSource(url) {
  if (!url) return null;
  const known = sources.get(url);
  if (known) return known;
  const entry = {
    tex: null, loaded: false, failed: false, listeners: new Set(),
  };
  sources.set(url, entry);
  const notify = () => { for (const cb of entry.listeners) cb(); };
  entry.tex = new THREE.TextureLoader().load(
    url,
    () => { entry.loaded = true; notify(); },
    undefined,
    () => { entry.failed = true; notify(); },
  );
  entry.tex.wrapS = THREE.RepeatWrapping;
  entry.tex.wrapT = THREE.RepeatWrapping;
  entry.tex.colorSpace = THREE.SRGBColorSpace;
  return entry;
}

/** Tell me when this decor's image is ready — or has given up. */
export function onDecorLoad(url, callback) {
  const entry = decorSource(url);
  if (!entry) return () => {};
  if (entry.loaded || entry.failed) { callback(); return () => {}; }
  entry.listeners.add(callback);
  return () => entry.listeners.delete(callback);
}

/** Did this image fail to arrive? Then the caller shows the fallback. */
export function decorFailed(url) {
  return Boolean(url && sources.get(url)?.failed);
}

// Clones keyed by url AND the whole transform: a room full of 600 mm doors
// shares one.
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
 * Clones are cached by url AND transform, so the extra uploads are a handful
 * per project rather than one per panel.
 *
 * @param {string} url
 * @param {object} t   { repeatX, repeatY, rotate, anisotropy }
 */
export function decorTexture(url, { repeatX, repeatY, rotate = false, anisotropy = 8 }) {
  const entry = decorSource(url);
  if (!entry?.loaded || !entry.tex || entry.failed) return null;
  const rx = Math.round(Math.max(0.01, repeatX) * 1000) / 1000;
  const ry = Math.round(Math.max(0.01, repeatY) * 1000) / 1000;
  const key = `${url}|${rx}|${ry}|${rotate ? 1 : 0}|${anisotropy}`;
  const known = clones.get(key);
  if (known) return known;
  const tex = entry.tex.clone();
  tex.repeat.set(rx, ry);
  if (rotate) {
    // Turning the image a quarter turn is what puts the grain along the face's
    // U axis. `center` matters: rotate about (0,0) and the whole map slides off
    // the panel, which shows up as a piece that is the right colour and has no
    // figure on it at all.
    tex.center.set(0.5, 0.5);
    tex.rotation = Math.PI / 2;
  }
  // A cabinet side is seen at a glancing angle far more often than face-on, and
  // that is exactly where an unfiltered woodgrain turns into a shimmer.
  tex.anisotropy = Math.max(1, Math.round(anisotropy));
  tex.needsUpdate = true;
  clones.set(key, tex);
  return tex;
}

/**
 * Everything one panel needs to wear a decor image: which file, how it is
 * scaled onto this piece, and whether it is turned.
 *
 * A finish that carries `scanAlongGrainMm` is a MANUFACTURER SCAN and is placed
 * by its physical size — one image is that many millimetres of real board along
 * the grain, so a tall door and a drawer front cut from the same board show
 * different parts of the same figure at the same scale.
 *
 * A finish that carries `repeatMm` instead is our own procedural grain, which
 * is a TILE: it repeats every `repeatMm` in both directions, which is what turn
 * 5 built and what a decor with no scan still falls back to.
 *
 * @param {object} surface  from surfaceFor()
 * @param {object} panel    the engine's panel record (box + cut dimensions)
 * @param {object} profile
 */
export function decorPlacement(surface, panel, profile) {
  if (!surface?.texture || !panel?.box) return null;
  const anisotropy = profile?.appearance?.decor?.anisotropy ?? 8;
  const { lengthMm } = grainRun(panel);
  const map = decorMapping(panel.box, lengthMm);

  if (surface.scanAlongGrainMm > 0) {
    // The image's own proportions decide how wide that many millimetres is; the
    // aspect is read off the decoded image, so a scan re-exported at a different
    // shape stays physically right instead of stretching.
    const entry = sources.get(surface.texture);
    const img = entry?.tex?.image;
    const aspect = img?.width && img?.height ? img.width / img.height : 1;
    const alongMm = surface.scanAlongGrainMm;
    const acrossMm = alongMm * aspect;
    return map.rotate
      // Grain along U: the image's height axis lies along the face's width.
      ? { url: surface.texture, repeatX: map.heightMm / acrossMm, repeatY: map.widthMm / alongMm, rotate: true, anisotropy }
      : { url: surface.texture, repeatX: map.widthMm / acrossMm, repeatY: map.heightMm / alongMm, rotate: false, anisotropy };
  }

  const tile = surface.repeatMm > 0 ? surface.repeatMm : 900;
  return {
    url: surface.texture,
    repeatX: map.widthMm / tile,
    repeatY: map.heightMm / tile,
    rotate: map.rotate,
    anisotropy,
  };
}

/**
 * Which finish a panel role wears.
 *
 * ─── TURN 8 (CLAUDE.md F2.3): WHICH ROLE, EXACTLY ───
 * It used to ask `role === 'front'`, and that is the bug Piotr found: the
 * engine's own answer to "is this cut from the front sheet" is
 * `material_role === 'front'` (engine/cabinet.js wearsFrontMaterial), and it
 * says yes for a door, an END PANEL and an INFILL alike — they stand in the
 * room beside the doors and a workshop sprays them out of the same sheet.
 * Asking for the ROLE instead meant an end panel (role `end_panel`) and a
 * filler (role `infill`) quietly wore the CARCASS finish.
 *
 * That is also why the bug looked intermittent on Piotr's screenshots: with an
 * EGGER uni decor set on the carcass and nothing set on the fronts, the fronts
 * default to the carcass (design.js) and the two are the same colour — so the
 * end panel looked correct. The moment a front COLOUR was picked, it did not.
 *
 * Turn 6's second half is unchanged: not only the COLOUR but the SURFACE. A
 * melamine-faced carcass board and a two-pack sprayed door are different
 * materials and a customer can see it. Which family a piece is in is decided by
 * the engine's `finish_exposed` flag (the pieces that go to the spray booth —
 * BACKLOG #35), not by a list of panel ids here.
 *
 * ─── TURN 8 (CLAUDE.md F1): THE SPRAY BOOTH'S OWN RULE ───
 * A sprayed piece takes its roughness from the project's SHEEN (Piotr's 0–25
 * scale) and refuses the environment probe: a sprayed colour is the colour, and
 * a white door that picks up the walnut carcass beside it is not white any more.
 * Melamine and decors keep the probe, because a foil board really does reflect
 * the room and that is most of what makes one look alive.
 */
export function surfaceFor({
  role, materialRole = null, finishExposed = false, finishes, profile, frontColour = null, sheen = null,
  finish: resolvedFinish = undefined,
}) {
  const A = profile.appearance;
  // The engine's own answer, with the role as the fallback for a caller (a test,
  // an old cached project) that has no material_role to hand.
  const wearsFront = materialRole ? materialRole === 'front' : role === 'front';
  // ─── Turn 16 (CLAUDE.md F1.4): THE PIECE'S OWN MATERIAL, IF IT HAS ONE ────
  //
  // "An element override reaches the PICTURE. Today a per-element material
  // choice reaches the BOM and never the 3D view. Fix at the root: the view
  // resolves a panel's SURFACE from its effective material."
  //
  // The root is the ENGINE (engine/materials.js `panelFinish`), which is a pure
  // function of (panel, unit, design, profile) and is unit-tested there. This
  // file only consumes the answer — which is what keeps the rule that the view
  // decides nothing. The old pair is still accepted, and is what a caller with
  // no panel in its hand (a test, a swatch, the render preview) passes, so the
  // default path is byte-for-byte the picture turn 15 drew.
  const finish = resolvedFinish !== undefined
    ? resolvedFinish
    : (wearsFront ? finishes.front : finishes.carcass);
  const shade = A.shade[role] || 0;
  const pbr = (finishExposed ? A.materials?.lacquer : A.materials?.melamine) || A.sheen;

  // A front colour chosen in Design Settings is PAINT: it covers the decor,
  // exactly as it does in the workshop.
  const paint = wearsFront ? frontColour : null;
  const isDecor = !paint && finish?.kind === 'decor' && finish.texture;

  // A TINTED decor is our own greyscale grain multiplied by the manufacturer's
  // average colour (turn 5). A manufacturer SCAN is not tinted — it is shown at
  // its own tone, whole, which is both the licence's rule and the better
  // picture. Either way the base under an untinted image has to be white or the
  // multiply darkens the figure.
  const tinted = isDecor && finish.tint;

  // Is this piece coming out of the spray booth in a colour somebody chose? A
  // sprayed DECOR is not a thing — a decor is a foil, and if a piece is exposed
  // and wearing a decor it is a decor.
  //
  // ─── Turn 16: THE SECOND HALF OF "THE SHEEN ONLY MOVES ONE COLOUR" ───
  // `finish_exposed` is the engine's answer to "does this piece go to the SPRAY
  // BOOTH" — fronts, infills, plinths, end panels, masks. It is the right test
  // for a piece that is sprayed BECAUSE OF WHERE IT SITS, and it is not the
  // whole test: a workshop can spray the carcass itself, and then a side or a
  // shelf is lacquer as surely as a door is. What it is FINISHED IN answers
  // that, and `resolveFinishes` now hands a sprayed carcass back as a finish of
  // kind `spray` (engine/design.js). Either route makes a piece sprayed; a
  // decor still overrules both, because a foil board is a foil board.
  //
  // Nothing here touches `finish_exposed` itself — the engine's flag, the cut
  // list and the CNC output are exactly what they were.
  const sprayed = (finishExposed || finish?.kind === 'spray') && !isDecor;

  return {
    colour: paint
      ? colour(paint)
      : ((isDecor && !tinted) ? shaded('#ffffff', shade) : shaded(finish?.hex, shade)),
    texture: isDecor ? finish.texture : null,
    repeatMm: isDecor ? (finish.repeatMm || 0) : 0,
    scanAlongGrainMm: isDecor ? (finish.scanAlongGrainMm || 0) : 0,
    // What to fall back to when the scan cannot be fetched (mock mode, no
    // network). Null for anything that is not a scanned decor.
    fallback: isDecor && finish.scanAlongGrainMm > 0 && finish.fallback ? finish.fallback : null,
    fallbackHex: finish?.hex || null,
    sprayed,
    // Piotr's scale drives the sprayed surface; board keeps its family number.
    roughness: sprayed && sheen != null ? roughnessFromSheen(sheen, profile) : pbr.roughness,
    clearcoat: pbr.clearcoat,
    clearcoatRoughness: pbr.clearcoatRoughness,
    metalness: sprayed ? (A.spray?.metalness ?? 0) : pbr.metalness,
    // 0 switches the probe off for this material only — the scene keeps it for
    // everything else.
    envMapIntensity: sprayed ? (A.spray?.envMapIntensity ?? 0) : 1,
    // The fine orange peel a gun leaves. A tenth of the strength the board
    // edges are broken at, which is roughly the difference in real life.
    normalScale: sprayed ? (A.spray?.normalScale ?? 0.1) : 1,
  };
}

/** The contour-view surface: the material steps back, the outline stays. */
export function contourSurface(profile) {
  const C = profile.appearance.contour;
  return {
    colour: colour(C.hex),
    texture: null,
    repeatMm: 0,
    scanAlongGrainMm: 0,
    fallback: null,
    fallbackHex: null,
    sprayed: false,
    roughness: 1,
    clearcoat: 0,
    clearcoatRoughness: 1,
    metalness: 0,
    envMapIntensity: 1,
    normalScale: 1,
    opacity: C.opacity,
  };
}

/**
 * The outline every piece is drawn with — thin and black (BACKLOG #5).
 *
 * Turn 6 (CLAUDE.md F5) took the SELECTION out of here. Turn 4 recoloured the
 * selected unit's own edges, which made the selection a property of the object
 * rather than a mark on top of it — and in the app's gold, which is a furniture
 * colour. A cabinet's edges are black because a cabinet's edges are black,
 * selected or not; the mark that says "this one" is a separate dashed box
 * (3d/SelectionOutline.jsx).
 */
export function outlineFor(profile, { contour = false } = {}) {
  const A = profile.appearance;
  return {
    colour: contour ? A.contour.outline : A.outline.colour,
    width: A.outline.width,
    threshold: A.outline.threshold,
  };
}

/**
 * The depth nudge a panel's FILL takes so the outlines win (turn 15, F2).
 *
 * The owner's bug: "the outer contour is crisp, the interior edges vanish."
 * They vanish because an edge INSIDE a cabinet is coplanar with the face it
 * butts into — a shelf's front arris lies in the plane of the side panel — and
 * two things at the same depth are decided by draw order rather than by depth.
 * The silhouette had nothing behind it, which is why only the outside looked
 * right.
 *
 * `polygonOffset` on the FILL is the textbook answer: the face is pushed a hair
 * back in the DEPTH BUFFER ONLY, so the line in front of it always wins.
 * Nothing moves in the scene, nothing reaches the cut list, and the numbers are
 * the profile's (`appearance.outline.polygonOffset`) rather than literals in a
 * component — CLAUDE.md rule 3.
 *
 * Spread straight onto a material: `{...panelFillOffset(profile)}`.
 */
export function panelFillOffset(profile) {
  const o = profile?.appearance?.outline?.polygonOffset || {};
  return {
    polygonOffset: true,
    polygonOffsetFactor: Number(o.factor) || 0,
    polygonOffsetUnits: Number(o.units) || 0,
  };
}
