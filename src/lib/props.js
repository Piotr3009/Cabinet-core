// ─── PROPS v1 — THE PICTURE'S OWN LAW (turn 58b F5, T58 F8 verbatim) ────────
//
// The owner approved the pack and the switch: *"ok props on/off — zegarki
// wiedzą i reszta też wie."*  Watches ×4, belt rolls ×5, folded ties ×6 —
// metres, real sizes, light meshes.
//
// ─── WHY THIS FILE IS IN `src/lib` AND NOT IN `src/engine` ─────────────────
//
// T58 F8, point 3: *"BOM, CNC, DXF and the invoice are BLIND to props — state
// where that blindness is structural."*
//
// This is where. The BOM, the cut list, the DXF and the invoice are all built
// out of `src/engine`, and NO module in `src/engine` imports this file or the
// component that draws it. A prop cannot add a row or a path because there is
// no edge in the import graph along which it could travel — not because
// somebody remembered to filter it out. `test/turn58b-f5-props.test.js` walks
// the graph and says so.
//
// ─── AND WHY THE ASSETS ARE NOT IN THE REPOSITORY ──────────────────────────
//
// T58 F8, point 1: the models live in the Supabase bucket `props/` beside a
// `manifest.json`, in the Movento school. The repo carries NO model binaries —
// the CONERO precedent. A bucket that is missing, moved, empty or unreachable
// is NOT an error path: it is the other path. The machinery is built, the
// toggle ships GREYED WITH ITS REASON, and nothing throws.
//
// Pure functions — no React, no three.js, no fetch, no store.

/** Where the pack lives, bucket-relative. One place, so a move is one line. */
export const PROPS_BUCKET = 'props';
export const PROPS_MANIFEST = 'manifest.json';

/**
 * The three kinds the owner approved, and the SLOT each is laid into.
 *
 * `slot` names the insert feature a piece belongs in; `lay` says which of the
 * model's own axes has to end up vertical once it is lying in that slot. A
 * watch model stands about 80 mm tall and a watch pocket is 60 mm deep, so a
 * watch that is not LAID DOWN does not fit — and the law is to measure it,
 * never to guess (T58 F8, point 2).
 */
export const PROP_KINDS = Object.freeze([
  { id: 'watch', slot: 'pocket', count: 4, lay: true, label: 'Watches' },
  { id: 'belt', slot: 'lane', count: 5, lay: true, label: 'Belt rolls' },
  { id: 'tie', slot: 'section', count: 6, lay: true, label: 'Folded ties' },
]);

/** The pack's own kind ids, as a Set — for a manifest row's `kind`. */
const KIND_IDS = new Set(PROP_KINDS.map((k) => k.id));

/**
 * A manifest, read the way the hardware families read theirs: what the file
 * says is a suggestion about the FILENAME and nothing else. Rows without a
 * usable kind or file are dropped rather than thrown over.
 *
 * @returns {{rows: Array<{kind, file, id}>, kinds: string[]}}
 */
export function parsePropsManifest(json) {
  const raw = Array.isArray(json) ? json : (json?.files || json?.items || []);
  const rows = [];
  for (const row of Array.isArray(raw) ? raw : []) {
    const kind = String(row?.kind || '').toLowerCase().trim();
    const file = String(row?.file || row?.name || '').split(/[\\/]/).pop().trim();
    if (!KIND_IDS.has(kind) || !file) continue;
    rows.push({ kind, file, id: String(row?.id || file) });
  }
  return { rows, kinds: [...new Set(rows.map((r) => r.kind))] };
}

/**
 * A prop's model URL — the same three-part rule every hardware family keeps:
 * the bucket, the pack's folder, and the LAST SEGMENT of whatever the row
 * called the file. Nothing the manifest guessed at.
 *
 * A missing `storageBase` is the honest answer in mock mode and in a node
 * test: the path is still true, it simply has no host in front of it.
 */
export function propModelUrl(file, storageBase = '') {
  const name = String(file || '').split(/[\\/]/).pop().trim();
  if (!name) return null;
  const path = `${PROPS_BUCKET}/${name}`;
  return storageBase ? `${String(storageBase).replace(/\/$/, '')}/${path}` : path;
}

/**
 * ─── WHICH PIECE GOES IN WHICH SLOT ────────────────────────────────────────
 *
 * T58 F8, point 2: *"Fewer slots → fill what exists; more → repeat variants."*
 *
 * So the answer is never "some slots are empty because the pack is short" and
 * never "some pieces are dropped because the drawer is small". It is one piece
 * per slot, taken round the variants in order.
 *
 * @param {Array} variants  the manifest rows of ONE kind
 * @param {Array} slots     the insert's own boxes for that kind
 * @returns {Array<{slot, variant, index}>}  empty where either side is empty
 */
export function fillSlots(variants = [], slots = []) {
  const v = Array.isArray(variants) ? variants.filter(Boolean) : [];
  const s = Array.isArray(slots) ? slots.filter(Boolean) : [];
  if (!v.length || !s.length) return [];
  return s.map((slot, index) => ({ slot, variant: v[index % v.length], index }));
}

/**
 * ─── ORIENT BY MEASUREMENT, NEVER BY GUESS ─────────────────────────────────
 *
 * T58 F8, point 2, verbatim: *"load → `updateMatrixWorld` → Box3 → LAY the
 * piece into its slot — watches LYING into the watch insert's pockets (the
 * model stands ~80 mm, the interior is 60 — orient by measurement, never by
 * guess)."*
 *
 * This is that sentence as arithmetic, and it is pure so a test can hold it to
 * account without a browser. Given the model's measured size and the slot's
 * clear box, it answers the quarter-turn (about X, in radians) and the scale
 * that make the piece FIT — and it refuses rather than shrinking a model to
 * nothing.
 *
 * @param {{x,y,z}} size  the model's own measured size, millimetres
 * @param {{w,h,d}} slot  the slot's clear box, millimetres
 * @param {boolean} lay   may this kind be laid on its side at all
 * @returns {{rotX:number, scale:number, size:{x,y,z}, fits:boolean, laid:boolean}|null}
 */
export function layIntoSlot(size, slot, { lay = true, minScale = 0.5 } = {}) {
  const sx = Number(size?.x);
  const sy = Number(size?.y);
  const sz = Number(size?.z);
  const w = Number(slot?.w);
  const h = Number(slot?.h);
  const d = Number(slot?.d);
  if (![sx, sy, sz, w, h, d].every((n) => Number.isFinite(n) && n > 0)) return null;

  /** How much a box has to shrink to sit inside another, 1 when it already does. */
  const fitOf = (bx, by, bz) => Math.min(1, w / bx, h / by, d / bz);

  const upright = { rotX: 0, scale: fitOf(sx, sy, sz), laid: false };
  // A quarter-turn about X swaps the model's own Y and Z: what stood up now
  // lies along the slot's depth.
  const laid = lay
    ? { rotX: -Math.PI / 2, scale: fitOf(sx, sz, sy), laid: true }
    : null;

  // The pose that has to shrink LEAST is the pose the piece belongs in — which
  // is the measurement doing the deciding, not a rule about watches.
  const best = laid && laid.scale > upright.scale ? laid : upright;
  const s = best.scale;
  return {
    rotX: best.rotX,
    scale: s,
    laid: best.laid,
    size: best.laid ? { x: sx * s, y: sz * s, z: sy * s } : { x: sx * s, y: sy * s, z: sz * s },
    // A piece that had to be shrunk past half its size is not the pack's piece
    // any more; the caller draws nothing rather than a toy.
    fits: s >= minScale,
  };
}

/**
 * Where the piece is put once it is oriented: CENTRED in its slot on the two
 * horizontal axes and STANDING ON THE FLOOR of it. Never intersecting a board
 * — T58 F8, point 2's last sentence, as arithmetic.
 *
 * @param {{x,y,z,w,h,d}} slot  the slot's clear box in the unit's own frame
 * @param {{x,y,z}} laidSize    the piece's size AFTER `layIntoSlot`
 */
export function seatInSlot(slot, laidSize) {
  if (!slot || !laidSize) return null;
  return {
    x: slot.x + slot.w / 2,
    y: slot.y + laidSize.y / 2,
    z: slot.z + slot.d / 2,
  };
}

/**
 * The one-line reason a greyed toggle carries. The owner never sees a dead
 * control with no explanation — the house rule T53-F8d wrote down for the
 * watch pane's own option ("disabled WITH A REASON, never hidden").
 */
export function propsReason(state) {
  switch (state?.state) {
    case 'ready':
      return state.rows > 0
        ? `${state.rows} prop${state.rows === 1 ? '' : 's'} in the pack`
        : 'The props pack is published but empty';
    case 'loading':
      return 'Reading the props pack…';
    case 'absent':
      return state.error
        ? `The props pack is not reachable — ${state.error}`
        : 'The props pack is not published yet';
    default:
      return 'The props pack has not been read yet';
  }
}

/**
 * ─── THE SLOTS, READ OFF THE ENGINE'S OWN INSERT ───────────────────────────
 *
 * A prop is laid into a SLOT, and a slot is not invented here: it is the clear
 * space the engine's own insert leaves between its own boards. So this reads
 * the published pieces — the base it stands on, the rails that bound it, the
 * dividers that split it — and returns the boxes between them, in the unit's
 * own millimetre frame (the very frame `panel.box` is in).
 *
 * Three lists, in the engine's own vocabulary:
 *
 *   pocket   the FRONT row, between consecutive dividers. Watches.
 *   lane     the rear field's cells where the layout runs LANES. Belt rolls.
 *   section  the rear field's cells where it does not. Folded ties.
 *
 * A tray whose pieces are incomplete answers three empty lists, which is what
 * a drawer with no insert should answer and what a READY-MADE box does.
 *
 * @param {Array} panels  a computeCabinet result's panels
 * @param {object} built  the matching `assemblies.watchInserts` row
 */
export function propSlotsOf(panels = [], built = null) {
  const empty = { pocket: [], lane: [], section: [] };
  if (!built) return empty;
  const zone = built.zone ?? null;
  const mine = (panels || []).filter((p) => p.role === 'watch_insert' && p.box
    && Number(p.meta?.drawer) === Number(built.drawer)
    && (p.meta?.zone ?? null) === zone);
  const one = (part) => mine.find((p) => p.part === part) || null;
  const base = one('WATCH-BASE');
  const front = one('WATCH-RAIL-FRONT');
  const row = one('WATCH-RAIL-ROW');
  const sides = mine.filter((p) => p.part === 'WATCH-RAIL-SIDE').sort((a, b) => a.box.x - b.box.x);
  if (!base || !front || sides.length < 2) return empty;

  const [left, right] = [sides[0], sides[sides.length - 1]];
  const floor = base.box.y + base.box.h;
  const height = left.box.h;
  const x0 = left.box.x + left.box.w;
  const x1 = right.box.x;
  if (!(x1 > x0) || !(height > 0)) return empty;

  // The POCKET band runs from the row rail (or the tray's back, where there is
  // none) forward to the front rail.
  const pocketZ0 = row ? row.box.z + row.box.d : base.box.z;
  const pocketZ1 = front.box.z;
  const cut = (z0, z1, xs) => {
    const out = [];
    for (let i = 1; i < xs.length; i += 1) {
      const w = xs[i].from - xs[i - 1].to;
      if (!(w > 1e-6) || !(z1 - z0 > 1e-6)) continue;
      out.push({
        x: xs[i - 1].to, y: floor, z: z0, w, h: height, d: z1 - z0,
      });
    }
    return out;
  };

  // Every divider that stands IN the pocket band, plus the two side rails as
  // the outermost walls: the gaps between them are the pockets.
  const inBand = mine
    .filter((p) => p.part === 'WATCH-DIVIDER' && p.box.z >= pocketZ0 - 1e-6)
    .sort((a, b) => a.box.x - b.box.x)
    .map((p) => ({ from: p.box.x, to: p.box.x + p.box.w }));
  const pocket = cut(pocketZ0, pocketZ1, [
    { from: x0, to: x0 }, ...inBand, { from: x1, to: x1 },
  ]);

  // The REAR FIELD: everything behind the row rail, divided by the counts the
  // engine published for it. No row rail means no field — the whole tray is
  // pockets and the answer is honestly empty.
  const cells = [];
  if (row) {
    const fz0 = base.box.z;
    const fz1 = row.box.z;
    const cols = Math.max(1, Math.trunc(Number(built.sections) || 1));
    const rows = Math.max(1, Math.trunc(Number(built.lanes) || 1));
    const cw = (x1 - x0) / cols;
    const cd = (fz1 - fz0) / rows;
    if (cw > 1e-6 && cd > 1e-6) {
      for (let c = 0; c < cols; c += 1) {
        for (let r = 0; r < rows; r += 1) {
          cells.push({
            x: x0 + c * cw, y: floor, z: fz0 + r * cd, w: cw, h: height, d: cd,
          });
        }
      }
    }
  }
  // The engine's own word for what it built: a field it runs in LANES holds
  // belt rolls; one it does not holds folded ties.
  const laned = Math.max(1, Math.trunc(Number(built.lanes) || 1)) > 1;
  return {
    pocket,
    lane: laned ? cells : [],
    section: laned ? [] : cells,
  };
}
