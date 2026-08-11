// ─── THE HARDWARE WEARS ITS FINISH (turn 23, CLAUDE.md F4) ──────────────────
//
// Owner: "the model renders WHITE — raw file material. Settings say nickel or
// onyx; the metal should follow, the way panels follow decors."
//
// He is right twice. A downloaded GLB carries whatever material the converter
// wrote — for the CLIP top pack that is an unlit near-white — so every hinge in
// the app looked like a hinge nobody stocks, and the turn-19 finish setting
// (project cascade, turn-22 company default) reached the BOM and the file name
// and stopped there. And a PANEL has followed its decor since turn 4 through
// exactly this shape: the engine says which finish, the view applies it.
//
// ─── ONE OVERRIDE FUNCTION, TWO FAMILIES (F4.3) ────────────────────────────
//
// The hinges and the runners take the same treatment through the same helper.
// A third piece of ironmongery next turn is a block of numbers in `profile.js`,
// not a second copy of this file.
//
// ─── THE PLASTIC IS AN ALLOWLIST, NOT A BLANKET (F4.2) ─────────────────────
//
// A CLIP top's release lever and the caps on a plate are plastic and stay
// plastic: plating them would be worse than leaving them white, because a
// chrome lever is a hinge that does not exist. So the override is applied per
// MATERIAL NAME — the names in the mesh table `verify/t23/hinge-meshes.md`
// publishes — and a name on the plastic list gets the plastic answer instead.
// A file whose materials are named something else gets the metal, which is the
// safe default: the alternative is a hinge with no finish at all.
//
// ─── MATERIALS ARE CLONED BEFORE THEY ARE TOUCHED ──────────────────────────
//
// `Object3D.clone()` shares materials with the original, and the original here
// is the ONE decoded copy in `3d/glbSource.js`'s cache that every hinge in the
// project is cloned from. Writing a colour onto it would repaint every hinge in
// the room the moment one door asked for onyx — and would survive a reload,
// because the cache is module state. Every material this function writes to is
// its own copy.

import { attachHardwareEnv } from './hardwareEnv.js';

/**
 * The finish this family is wearing, as numbers.
 *
 * @param {object} profile
 * @param {string} family   'hinge' | 'runner'
 * @param {string|null} id  the finish the project settled on
 * @returns {{id:string|null, metal:object, plastic:object, plasticMaterials:string[]}|null}
 */
export function hardwareFinishSpec(profile, family, id = null) {
  const block = family === 'runner'
    ? profile?.hardware?.runner?.movento
    : profile?.hardware?.hinge?.cliptop;
  if (!block) return null;
  const wanted = id ? String(id).toLowerCase() : null;
  const list = Array.isArray(block.finishes) ? block.finishes : [];
  // The named finish, the family's default, or the single neutral metal the
  // block carries. The MOVENTO takes the last of those today: orion grey and
  // silk white are real Blum finishes and this repository does not have their
  // numbers, so it ships one honest metal rather than two invented ones.
  const row = list.find((f) => f.id === wanted && f.material)
    || list.find((f) => f.id === block.defaultFinish && f.material)
    || null;
  const metal = row?.material || block.finish || null;
  if (!metal) return null;
  return {
    id: row?.id || (block.finish ? (wanted || 'default') : null),
    metal,
    plastic: block.plastic || null,
    plasticMaterials: Array.isArray(block.plasticMaterials) ? block.plasticMaterials : [],
  };
}

/**
 * Is this material one of the pieces that must NOT be plated?
 *
 * Matched case-insensitively on a SUBSTRING, because a converter names the same
 * lever `plastic_black`, `Plastic.001` and `POM_black` depending on which
 * export it came out of, and the allowlist is a workshop list rather than a
 * checksum.
 */
export function isPlasticMaterial(name, spec) {
  const text = String(name || '').toLowerCase();
  if (!text) return false;
  return (spec?.plasticMaterials || []).some((needle) => text.includes(String(needle).toLowerCase()));
}

/**
 * Paint every mesh of a CLONE in the workshop's finish.
 *
 * @param {THREE.Object3D} object  a clone — never a cached source
 * @param {object} spec            hardwareFinishSpec() output
 * @returns {Array<{material:string, kind:'metal'|'plastic'}>} what was applied,
 *          which is what the registry publishes for the walk to assert against
 *          (R4: a claim about a material is read off the scene, not off a pixel)
 */
export function applyHardwareFinish(object, spec) {
  const applied = [];
  if (!object || !spec) return applied;
  object.traverse((node) => {
    const list = Array.isArray(node.material) ? node.material : (node.material ? [node.material] : []);
    if (!list.length) return;
    const painted = list.map((source) => {
      const plastic = isPlasticMaterial(source.name, spec);
      const want = plastic ? spec.plastic : spec.metal;
      if (!want) return source;
      // Its own copy. See the note at the top of this file — the alternative
      // repaints every hinge in the project and survives a reload.
      const material = source.clone();
      material.name = source.name;
      if (want.colour && material.color?.set) material.color.set(want.colour);
      if (Number.isFinite(want.metalness)) material.metalness = want.metalness;
      if (Number.isFinite(want.roughness)) material.roughness = want.roughness;
      // ─── TURN 24 (CLAUDE.md F12): AND SOMETHING TO REFLECT ────────────────
      //
      // "Nickel without an environment is grey paint." A METAL gets the
      // hardware's own probe — a small procedural studio, built once, applied
      // PER MATERIAL and never to the scene, so boards, fronts and lacquers are
      // untouched and `scene.environment` stays null (F12.2). The PLASTIC does
      // not: a release lever is moulded POM and a lever with a lightbox in it
      // is the same mistake as a chrome one.
      if (!plastic) {
        attachHardwareEnv(material, want.envMapIntensity);
        // An optional thin lacquer over a plated part. `MeshPhysicalMaterial`
        // has it; a `MeshStandardMaterial` from a converter does not, and
        // writing the property onto one is harmless and ignored — which is why
        // it is guarded by the NUMBER being present rather than by the class.
        if (Number.isFinite(want.clearcoat)) material.clearcoat = want.clearcoat;
        if (Number.isFinite(want.clearcoatRoughness)) {
          material.clearcoatRoughness = want.clearcoatRoughness;
        }
      }
      // A converter's material may carry an emissive or a map that fights the
      // finish. Neither is touched: an override that started deleting texture
      // slots would be a second renderer, and F4 asks for three numbers.
      material.needsUpdate = true;
      applied.push({
        material: source.name || '',
        kind: plastic ? 'plastic' : 'metal',
        // Turn 24 (F12 / R4): whether this material actually got the probe, so
        // the walk asserts the reflection off the SCENE rather than off a pixel.
        env: plastic ? false : Boolean(material.envMap),
      });
      return material;
    });
    // eslint-disable-next-line no-param-reassign
    node.material = Array.isArray(node.material) ? painted : painted[0];
  });
  return applied;
}
