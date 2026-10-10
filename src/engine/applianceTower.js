// ─── T75 F12 · THE APPLIANCE TOWER: KIT_FRIDGE'S APERTURE, STACKED ─────────
//
// CLAUDE.md T75 F12, verbatim: *"`APPLIANCE_TALL` in `engine/types.js`, copied
// field by field from `FRIDGE` (`lisp: 'KIT_FRIDGE.lsp'`, `widthFixed`, tall,
// legs, `carcass.back: 'rails'`), with `apertures: [...]` read from its
// defaults block: each aperture `{ role, h }` cuts KIT_FRIDGE's own aperture
// pattern (the back rails, the fixed panel, the spurs panel on its blocks) at
// that height, and the test asserts a one-aperture tower hole for hole
// against FRIDGE at the same numbers. Cupboard space above or below an
// aperture takes a door through the existing path; the appliance itself
// shows no front (the machine is the face)."*
//
// KIT_FRIDGE.lsp stands the appliance on the BOTTOM panel and closes it with
// the FIXED panel at `G + fridgeH` (L77, L105-125); above that is the spurs
// zone, closed by the BACK and the SPURS board. A tower is the same zone cut
// into apertures, one standing on the fixed panel of the one below:
//
//   · the TOP aperture's fixed panel IS KIT_FRIDGE's FIXED, at `G + fridgeH`
//     where `fridgeH` is the height of the whole stack, so the BACK, the
//     SPURS, the moving block screws and the fixed screws are the fridge's to
//     the millimetre (`cabinet.js` reads `cfg.fridgeH` and nothing else);
//   · every aperture under it is closed by the same board, cut again at its
//     own top and screwed the same way (`fixedScrewFromEnd`, on its centre).
//
// One aperture is therefore FRIDGE, by construction. No board, outline or
// hole is invented: the pieces are KIT_FRIDGE's and the lower fixed panels are
// its FIXED at another height. The rail rule stays KIT_FRIDGE's own warning.
//
// Pure: no store, no React. Read by `types.js defaultParamsFor` (the defaults
// block's list, each aperture given its height) and by `cabinet.js` (the
// stack).

const readPath = (obj, path) => (path
  ? String(path).split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), obj)
  : undefined);

/** The role's record in the profile, or null. */
function applianceRoleOf(role, profile) {
  return profile?.applianceTall?.roles?.[role] || null;
}

/**
 * How tall an aperture of this role is when the list does not say: the
 * role's own number, or the number it names where it already lives (the
 * oven's 595 is `ovenUnit.ovenHeight`, the fridge's is `fridgeUnit.defaults.
 * fridgeH`), or a `fridge_h` the unit itself carries.
 */
function apertureHeightOf(role, profile, fridgeH) {
  const r = applianceRoleOf(role, profile);
  if (!r) return null;
  if (Number(r.h) > 0) return Number(r.h);
  if (role === 'fridge' && Number(fridgeH) > 0) return Number(fridgeH);
  const v = Number(readPath(profile, r.hKey));
  return v > 0 ? v : null;
}

/**
 * The list a defaults block (or a saved unit) names, each aperture given its
 * height. An aperture whose role the profile does not know, and which says
 * no height of its own, is dropped: nothing is cut to a guessed number.
 *
 * @returns {Array<{role:string, h:number}>}
 */
export function resolveApertures(list, profile, { fridgeH } = {}) {
  return (Array.isArray(list) ? list : [])
    .map((a) => {
      const role = String(a?.role || '');
      const h = Number(a?.h) > 0 ? Number(a.h) : apertureHeightOf(role, profile, fridgeH);
      return role && h > 0 ? { role, h } : null;
    })
    .filter(Boolean);
}

/**
 * The stack, bottom-up: where each aperture stands, where its fixed panel is,
 * the `fridgeH` KIT_FRIDGE's arithmetic is handed (the TOP fixed panel stands
 * at `G + fridgeH`), and where the door starts.
 *
 * THE DOOR. A machine whose face IS its front (an oven, a washer) shows no
 * door, so the one door the existing path cuts starts at the top of the
 * highest such aperture: the hood's line, a door ABOVE an aperture
 * (`cabinet.js` `hoodApertureMm`). With no machine face (a fridge freezer,
 * which hides behind KIT_FRIDGE's own door) it is the whole height, FRIDGE's.
 *
 * @returns {{rows:Array, fridgeH:number, doorBase:number}|null}
 */
export function apertureStack(apertures, G, profile) {
  if (!Array.isArray(apertures) || !apertures.length) return null;
  let floor = G;
  const rows = apertures.map((a, i) => {
    const fixedY = floor + a.h;
    const face = applianceRoleOf(a.role, profile)?.face === 'machine' ? 'machine' : 'door';
    const row = {
      index: i + 1, role: a.role, h: a.h, floorY: floor, fixedY, face,
    };
    floor = fixedY + G;
    return row;
  });
  const top = rows[rows.length - 1];
  const faces = rows.filter((r) => r.face === 'machine');
  const machine = faces.length ? faces[faces.length - 1] : null;
  return {
    rows,
    fridgeH: top.fixedY - G,
    doorBase: machine ? machine.fixedY : 0,
  };
}

/** What the BOM calls the machine an aperture is ordered for. */
export function applianceLabelOf(role, profile) {
  return applianceRoleOf(role, profile)?.label || role;
}
