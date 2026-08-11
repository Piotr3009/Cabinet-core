// ─── WHAT THE SCENE ACTUALLY MOUNTED (turn 21, CLAUDE.md R4 / F2.2 / F6.3) ──
//
// **R4. A URL is proven by asking the APP for it.**
//
// Turn 20's audit fetched hinge models over URLs the VERIFY SCRIPT built for
// itself — correctly — while the app built its own without host or bucket and
// 404'd on the owner's machine. Three audits missed what the owner's console
// said in one paste. The rule that came out of it: the walk takes the exact URL
// STRING out of the app's own registry and fetches THAT.
//
// This is that registry. Every piece of hardware the scene mounts reports one
// row here — which family it is, which surface it was drawn on, the exact url
// string the loader was given, and whether what got drawn is the MODEL or the
// stand-in. It is published at `window.__cc.hardware`, beside the context
// guard's `window.__cc.diag`, and it is the only thing the walk is allowed to
// believe about hardware.
//
// It answers three of this turn's questions with one object:
//
//   F2.2  the walk pulls the hinge URL from here and fetches it (200, >10 KB);
//   F2.3  "the mounted hinge is the GLB mesh, not the stand-in" — `model`;
//   F6.3  "the editor's mounted hardware entries are model-backed" — `surface`.
//
// It is a DIAGNOSTIC and never an input: nothing in the app reads it back, so
// a scene that never reports is a scene that renders identically. No React, no
// store — a module-level Map keyed by identity, cleared when a surface unmounts.

/** surface → (`family:scope` → rows). One map per surface, so an unmount
 *  clears its own and only its own. `scope` exists because a surface may mount
 *  the same family more than once — the editor explodes each piece of hardware
 *  with the part it travels with, which is one mount per part. */
const surfaces = new Map();

function publish() {
  if (typeof window === 'undefined') return;
  const cc = (window.__cc = window.__cc || {});
  cc.hardware = {
    rows: hardwareRows(),
    surfaces: [...surfaces.keys()],
    /** Every distinct url the scene has actually asked a loader for. */
    urls: () => [...new Set(hardwareRows().map((r) => r.url).filter(Boolean))],
    /** The rows of one family, e.g. `window.__cc.hardware.of('hinge')`. */
    of: (family) => hardwareRows().filter((r) => r.family === family),
    /** Is every row of this family drawn from a downloaded model? */
    allModelled: (family) => {
      const rows = hardwareRows().filter((r) => r.family === family);
      return rows.length > 0 && rows.every((r) => r.model === true);
    },
  };
}

/**
 * Report what one surface mounted, replacing whatever it reported before.
 *
 * @param {string} surface  'room' | 'editor' | 'drawer-editor' — the same names
 *                          the context guard uses, for the same reason
 * @param {string} family   'hinge' | 'plate' | 'runner'
 * @param {Array} rows      [{ key, url, model, reason }]
 *                          url    the EXACT string handed to the loader, or
 *                                 null where there is nothing to fetch
 *                          model  true = the GLB mesh is what is drawn;
 *                                 false = the procedural stand-in is
 *                          reason  why not, in one word, for the walk's report
 */
export function reportHardware(surface, family, rows, scope = '') {
  if (!surfaces.has(surface)) surfaces.set(surface, new Map());
  const mine = surfaces.get(surface);
  mine.set(`${family}:${scope}`, (rows || []).map((r, i) => ({
    surface,
    family,
    key: r.key ?? i,
    url: r.url ?? null,
    model: Boolean(r.model),
    reason: r.reason ?? null,
  })));
  publish();
}

/** A surface has gone. Its rows go with it — nothing is mounted any more. */
export function clearHardwareSurface(surface) {
  if (surfaces.delete(surface)) publish();
}

/** Every row currently mounted, across every surface. */
export function hardwareRows() {
  const out = [];
  for (const families of surfaces.values()) for (const rows of families.values()) out.push(...rows);
  return out;
}

/** For tests. */
export function clearHardwareRegistry() {
  surfaces.clear();
  publish();
}
