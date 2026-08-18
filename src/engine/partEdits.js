// ─── THE PENCIL ON ONE PRINT (turn 23, CLAUDE.md F9) ────────────────────────
//
// The owner's words, after the scope was cut to the bone: he does NOT want to
// touch the engine. He wants to edit ONE part in ONE project — a 2400 back cut
// from a 1200 board, no back behind the washing machine — and the next wardrobe
// must come out stock.
//
// So this is a pencil on a print, and the print is not the book:
//
//     computeCabinet()  →  applyPartEdits()  →  the 3-D, the sheet, the DXF
//        (pure, and                (thin)
//         ignorant)
//
// THE ENGINE NEVER LEARNS. `computeCabinet` is not given the edits, does not
// take a flag for them and cannot see them; the LISP is untouched, the kits are
// untouched, and a fresh unit of the same kit is stock BY CONSTRUCTION rather
// than by care. That is F9.2 in one sentence and it is the whole architecture.
//
// ONE FUNCTION, THREE CONSUMERS (F9.2). The overrides are applied in the
// project store's `unitResult` / `allResults`, which is what the 3-D view, the
// CNC sheet, the part detail, the BOM and the DXF export all read. There is no
// second path where a hidden hole could come back.
//
// ─── FEATURE IDS ARE STABLE ACROSS IDENTICAL RECOMPUTES (F9.3) ─────────────
//
// An override says "hide THIS hole", and it has to still mean that hole after
// the app recomputes the cabinet — which it does on every render. An INDEX
// would not do: delete a shelf and every hole after it renumbers, so the
// owner's pencil would jump to a different hole. So an id is derived from what
// the feature IS: its kind, its layer and its position, rounded to the
// micrometre. Two genuinely identical features in the same place are told apart
// by an occurrence counter, which is stable for the same reason.
//
// ─── AND A PART THAT HAS CHANGED SHAPE IS NOT THAT PART ────────────────────
//
// F9.3: "When a recompute changes that part's geometry (resize etc.), the app
// ASKS." The safety is here and the question is in the UI: a stored edit
// carries the SIGNATURE of the board it was drawn on, and edits whose signature
// no longer matches are NOT APPLIED. So a 2400 back that becomes a 1800 back
// exports stock rather than exporting a hole 2300 mm up a 1800 mm board, and
// the owner is asked what he wants done about it. Refusing to apply is the
// conservative half; the asking is the courteous half.
//
// Pure functions and pure data. No React, no store, no three.js.

import { rectCorners } from './partObjects.js';

/** Round to the micrometre — the same 4 places `addDrill` stores at. */
const q = (v) => {
  const n = Math.round((Number(v) || 0) * 1e4) / 1e4;
  return Object.is(n, -0) ? 0 : n;
};

/**
 * The kinds an override may name.
 *
 * ─── TURN 38 (CLAUDE.md F5): FIVE MORE, AND NOT ONE FEWER ──────────────────
 * CLAUDE.md's word is *"Ops already carry `op`, `layer`, and coordinates;
 * extend, do not replace."* So the four turn 23 and turn 24 wrote are
 * untouched and the drawing board's own shapes join them on the same list, in
 * the same structure, saved and loaded by the same code that has carried the
 * pencil since turn 23. `engine/partObjects.js` is their arithmetic.
 */
const EDIT_OPS = ['hide', 'drill', 'line', 'dowels', 'polyline', 'rect', 'circle', 'arc'];

/**
 * The STABLE id of one feature on one part.
 *
 * Deliberately readable: `hole|SCREWS_3MM|37|50|3`. A person reading a saved
 * project can see which hole an override is about, which is worth more than
 * four bytes of hash.
 */
export function featureKey(kind, layer, coords) {
  return [kind, layer || '?', ...coords.map(q)].join('|');
}

/**
 * Every feature on a part, with its stable id.
 *
 * @param {object} panel
 * @param {Array} drills   the unit's own `result.drills`
 * @returns {Array<{fid:string, kind:'hole'|'pocket'|'mark', source:object}>}
 */
export function partFeatures(panel, drills = []) {
  const out = [];
  const seen = new Map();
  const push = (kind, layer, coords, source) => {
    const base = featureKey(kind, layer, coords);
    // Two identical features in the same place: the second is `…#1`. Stable,
    // because the order the engine emits them in is stable.
    const n = seen.get(base) || 0;
    seen.set(base, n + 1);
    out.push({ fid: n ? `${base}#${n}` : base, kind, source });
  };

  for (const p of panel?.cnc?.pockets || []) {
    push('pocket', p.layer, [Math.min(p.x1, p.x2), Math.min(p.y1, p.y2), Math.abs(p.x2 - p.x1), Math.abs(p.y2 - p.y1)], p);
  }
  for (const m of panel?.cnc?.marks || []) {
    push('mark', m.layer, [m.from[0], m.from[1], m.to[0], m.to[1]], m);
  }
  for (const d of drills || []) {
    if (d.panel !== panel?.id) continue;
    push('hole', d.layer, [d.x, d.y, d.d], d);
  }
  return out;
}


/**
 * WHAT BOARD THIS IS: the identity an edit is pinned to.
 *
 * Its cut size and its thickness, and nothing else. A part that has been moved,
 * renamed or re-materialed is still the same board with the same holes in it; a
 * part that has been RESIZED is not, and every set-out on it is wrong.
 */
export function partSignature(panel) {
  if (!panel) return '';
  const cnc = panel.cnc || {};
  return [
    q(Number(cnc.drawn_w) || Number(panel.w) || 0),
    q(Number(cnc.drawn_h) || Number(panel.h) || 0),
    q(panel.thickness),
  ].join('×');
}

/** How many hand changes a part carries — the badge's number. */
export function editCount(entry) {
  return Array.isArray(entry?.ops) ? entry.ops.length : 0;
}

/**
 * A DOWEL LINE, expanded to its holes.
 *
 * The owner types a start, an end and a pitch; a machine wants holes. The ends
 * are ALWAYS drilled and the intermediates are spread EVENLY so no gap exceeds
 * the pitch — the same rule F6's back screws follow, because it is the same
 * question and a joiner should not meet two answers to it in one turn.
 */
export function dowelPositions({
  from, to, pitch,
}) {
  const ax = Number(from?.[0]);
  const ay = Number(from?.[1]);
  const bx = Number(to?.[0]);
  const by = Number(to?.[1]);
  if (![ax, ay, bx, by].every(Number.isFinite)) return [];
  const length = Math.hypot(bx - ax, by - ay);
  if (!(length > 0)) return [{ x: ax, y: ay }];
  const step = Math.max(1, Number(pitch) || 0);
  const gaps = Math.max(1, Math.ceil(length / step - 1e-9));
  const out = [];
  for (let i = 0; i <= gaps; i += 1) {
    out.push({ x: ax + ((bx - ax) * i) / gaps, y: ay + ((by - ay) * i) / gaps });
  }
  return out;
}

/**
 * THE THIN STEP (F9.2).
 *
 * @param {object} result     computeCabinet() output — never mutated
 * @param {object} partEdits  { [panelId]: { signature, ops: [...] } }
 * @returns {object} a result of the same shape, plus `handEdits`:
 *   {
 *     byPanel: { [panelId]: { count, stale } },
 *     stale:   [{ panelId, was, now, count }],   ← what the app ASKS about
 *     edited:  [panelId, …]
 *   }
 *   A project with no edits gets the SAME OBJECT back, identity and all: the
 *   stock path must not even allocate, because it is every project.
 */
export function applyPartEdits(result, partEdits = null) {
  const entries = Object.entries(partEdits || {}).filter(([, e]) => editCount(e) > 0);
  if (!result || !entries.length) return result;

  const byPanel = {};
  const stale = [];
  const edited = [];
  const hidden = new Map();          // panelId → Set of fids
  const added = new Map();           // panelId → { drills: [], marks: [] }

  for (const [panelId, entry] of entries) {
    const panel = (result.panels || []).find((p) => p.id === panelId);
    if (!panel) continue;
    const now = partSignature(panel);
    const was = entry.signature || now;
    if (was !== now) {
      // NOT APPLIED. The board is a different board and every set-out on it is
      // in the wrong place; the app asks the owner what to do (F9.3).
      stale.push({
        panelId, was, now, count: editCount(entry),
      });
      byPanel[panelId] = { count: editCount(entry), stale: true };
      continue;
    }
    byPanel[panelId] = { count: editCount(entry), stale: false };
    edited.push(panelId);

    const drop = new Set();
    const drills = [];
    const marks = [];
    // Turn 38 (F5): the two new channels, beside the two turn 24 wrote.
    const paths = [];
    const curves = [];
    for (const op of entry.ops) {
      if (op?.op === 'hide' && op.feature) { drop.add(op.feature); continue; }
      if (op?.op === 'drill') {
        drills.push({
          panel: panelId,
          kind: 'hand',
          layer: op.layer,
          x: q(op.x),
          y: q(op.y),
          d: Number(op.d) || 0,
          ...(Number(op.depth) > 0 ? { depth: Number(op.depth) } : {}),
          ...(op.id ? { opId: op.id } : {}),
        });
        continue;
      }
      if (op?.op === 'line') {
        marks.push({
          layer: op.layer,
          from: [q(op.from?.[0]), q(op.from?.[1])],
          to: [q(op.to?.[0]), q(op.to?.[1])],
          ...(op.id ? { opId: op.id } : {}),
        });
        continue;
      }
      if (op?.op === 'dowels') {
        for (const at of dowelPositions({ from: op.from, to: op.to, pitch: op.pitch })) {
          drills.push({
            panel: panelId,
            kind: 'hand',
            layer: op.layer,
            x: q(at.x),
            y: q(at.y),
            d: Number(op.d) || 0,
            ...(Number(op.depth) > 0 ? { depth: Number(op.depth) } : {}),
            ...(op.id ? { opId: op.id } : {}),
          });
        }
        continue;
      }
      // ─── TURN 38 (CLAUDE.md F5): THE DRAWN SHAPES ────────────────────────
      //
      // TWO NEW CHANNELS on `panel.cnc`, and no more than two:
      //
      //   `paths`   open and closed runs of points — a polyline, a rectangle.
      //             `marks` above already carries the two-point case and keeps
      //             it, so every project saved since turn 24 reads back byte
      //             for byte.
      //   `curves`  circles and arcs, which are the two entities R12 writes
      //             round rather than straight and are therefore the two a
      //             list of points would throw away.
      //
      // Both are ABSENT on a panel that has none, exactly as `marks` is, so a
      // part with no drawn shape is the part it was before the channels
      // existed. Every record carries `opId` — WHICH op drew it — because the
      // editor's verbs (F6) name objects and the canvas has to be able to walk
      // back from a rendered shape to the op it came from.
      if (op?.op === 'polyline') {
        paths.push({
          layer: op.layer, pts: (op.pts || []).map(([x, y]) => [q(x), q(y)]), closed: Boolean(op.closed), ...(op.id ? { opId: op.id } : {}),
        });
        continue;
      }
      if (op?.op === 'rect') {
        paths.push({
          layer: op.layer, pts: rectCorners(op), closed: true, ...(op.id ? { opId: op.id } : {}),
        });
        continue;
      }
      if (op?.op === 'circle') {
        curves.push({
          kind: 'circle', layer: op.layer, cx: q(op.at?.[0]), cy: q(op.at?.[1]), r: q(op.r), ...(op.id ? { opId: op.id } : {}),
        });
        continue;
      }
      if (op?.op === 'arc') {
        curves.push({
          kind: 'arc',
          layer: op.layer,
          cx: q(op.cx),
          cy: q(op.cy),
          r: q(op.r),
          start: q(op.start),
          end: q(op.end),
          ...(op.id ? { opId: op.id } : {}),
        });
      }
    }
    hidden.set(panelId, drop);
    added.set(panelId, { drills, marks, paths, curves });
  }

  if (!edited.length) {
    // Every edit was stale: nothing to apply, but the app still has to be told
    // so it can ask.
    return {
      ...result,
      handEdits: {
        byPanel, stale, edited: [],
      },
    };
  }

  // The features to drop, resolved to the very records they name. Done ONCE per
  // panel, against the untouched result, so hiding one hole cannot renumber the
  // id of the next.
  const dropDrills = new Set();
  const dropOn = new Map();          // panelId → { pockets:Set, marks:Set }
  for (const panelId of edited) {
    const panel = result.panels.find((p) => p.id === panelId);
    const drop = hidden.get(panelId);
    if (!panel || !drop?.size) continue;
    const pockets = new Set();
    const markSet = new Set();
    for (const f of partFeatures(panel, result.drills)) {
      if (!drop.has(f.fid)) continue;
      if (f.kind === 'hole') dropDrills.add(f.source);
      if (f.kind === 'pocket') pockets.add(f.source);
      if (f.kind === 'mark') markSet.add(f.source);
    }
    dropOn.set(panelId, { pockets, marks: markSet });
  }

  const panels = result.panels.map((panel) => {
    const drop = dropOn.get(panel.id);
    const grow = added.get(panel.id);
    if (!drop && !grow) return panel;
    const cnc = { ...panel.cnc };
    if (drop?.pockets.size) cnc.pockets = (cnc.pockets || []).filter((p) => !drop.pockets.has(p));
    if (drop?.marks.size) cnc.marks = (cnc.marks || []).filter((m) => !drop.marks.has(m));
    if (grow?.marks.length) cnc.marks = [...(cnc.marks || []), ...grow.marks];
    // A panel that has lost its last mark loses the key with it, so a part with
    // no marks is byte-for-byte the part it was before the channel existed.
    if (cnc.marks && !cnc.marks.length) delete cnc.marks;
    // Turn 38 (F5): and the same rule for the two new channels — absent unless
    // something has been drawn, so a part that carries none is unchanged.
    if (grow?.paths.length) cnc.paths = [...(cnc.paths || []), ...grow.paths];
    if (grow?.curves.length) cnc.curves = [...(cnc.curves || []), ...grow.curves];
    return { ...panel, cnc };
  });

  const drills = [
    ...(result.drills || []).filter((d) => !dropDrills.has(d)),
    ...edited.flatMap((panelId) => added.get(panelId)?.drills || []),
  ];

  return {
    ...result,
    panels,
    drills,
    handEdits: { byPanel, stale, edited },
  };
}

/**
 * Add one op to a part's list, creating the entry (and stamping the board's
 * signature) the first time.
 *
 * Pure: it takes the whole map and returns a new one, so the store's action is
 * one line and the arithmetic is testable without a browser.
 */
export function withPartEdit(partEdits, panelId, op, signature, panelSize = null) {
  if (!panelId || !op?.op || !EDIT_OPS.includes(op.op)) return partEdits || {};
  const before = (partEdits || {})[panelId];
  const entry = before && before.signature === signature
    ? before
    : { signature, ops: [] };
  return {
    ...(partEdits || {}),
    [panelId]: { ...entry, ...sizeStamp(entry, panelSize), ops: [...entry.ops, op] },
  };
}

/**
 * ─── TURN 38 (CLAUDE.md F5/F9): THE BOARD'S OWN SIZE, STAMPED ONCE ──────────
 *
 * *"Store `panelSize: {w, h}` on the override set the first time a manual op is
 * added (needed by F9)."*
 *
 * It is stamped ONCE and never re-stamped, which is the whole point: F9 asks
 * whether the panel is the size it was WHEN THE GEOMETRY WAS DRAWN, and a
 * stamp that refreshed itself on every op would answer "yes" forever.
 *
 * The `signature` beside it stays exactly what it is — it carries the
 * THICKNESS too and it is what turn 23's stale-edit machinery reads. This is
 * the size said in the two numbers F9's message has to print, and saying it
 * twice in two shapes is cheaper than a message that has to parse a string.
 */
function sizeStamp(entry, panelSize) {
  if (entry.panelSize) return {};
  const w = Number(panelSize?.w);
  const h = Number(panelSize?.h);
  if (!Number.isFinite(w) || !Number.isFinite(h)) return {};
  return { panelSize: { w: q(w), h: q(h) } };
}

/**
 * REPLACE a part's whole op list — the door every VERB goes through (F6/F11).
 *
 * Move, copy, rotate, group, delete and undo all rewrite the list rather than
 * appending to it, because a move written as an extra op would make the list
 * grow without bound and would make `applyPartEdits` a replayer instead of a
 * reader. An empty list is the same as no edits at all, which is what "Back to
 * computed" already means.
 */
export function withPartOps(partEdits, panelId, ops, signature, panelSize = null) {
  if (!panelId) return partEdits || {};
  const clean = (ops || []).filter((o) => o?.op && EDIT_OPS.includes(o.op));
  if (!clean.length) return withoutPartEdits(partEdits, panelId);
  const before = (partEdits || {})[panelId];
  const entry = before && before.signature === signature ? before : { signature, ops: [] };
  return {
    ...(partEdits || {}),
    [panelId]: { ...entry, ...sizeStamp(entry, panelSize), ops: clean },
  };
}

/** One part's ops, or an empty list — so no caller has to guess the shape. */
export function partOpsOf(partEdits, panelId) {
  const entry = (partEdits || {})[panelId];
  return Array.isArray(entry?.ops) ? entry.ops : [];
}

// ─── TURN 38 (CLAUDE.md F9): CUSTOM GEOMETRY DIES WITH A PANEL RESIZE ───────
//
// The owner's word, 17.08.2026, and it is a RULE and not an edit: *custom
// geometry DIES with a panel resize.*
//
// So on every recompute the engine's panel w×h is compared with the size
// stamped on that panel's override set:
//
//   THE SAME    the overrides ride along untouched. This is the common case
//               by a mile — a shelf moving, an LED toggling, a colour changing
//               all recompute the cabinet — and it must not clear anything,
//               which is why the comparison is against the SIZE and not
//               against "did anything happen".
//   DIFFERENT   that panel's manual objects are dropped, and the app says so
//               in a dismissible note naming the panel.
//
// It is deliberately NOT undoable (F11 says so in its own words): a rule is
// not an edit, and a Ctrl+Z that put back geometry the board no longer has
// room for would be the app arguing with the tape measure.
//
// A set with NO stamp — every part edited before tonight — is left exactly
// alone. Turn 23's `signature` still guards those: they simply do not apply
// while the board is a different board, which is the conservative answer this
// rule replaces for anything drawn from tonight on.

/** Two millimetres are the same millimetre within this much. */
const SAME_MM = 0.01;

/**
 * Which panels' manual geometry a recompute has invalidated.
 *
 * @param {object} partEdits  the unit's whole map
 * @param {Array} panels      `result.panels` as the engine has just computed them
 * @returns {Array<{panelId:string, was:{w,h}, now:{w,h}, count:number}>}
 */
export function resizedPanels(partEdits, panels = []) {
  const out = [];
  for (const [panelId, entry] of Object.entries(partEdits || {})) {
    if (!editCount(entry) || !entry.panelSize) continue;
    const panel = (panels || []).find((p) => p.id === panelId);
    if (!panel) continue;
    const now = { w: q(Number(panel.cnc?.drawn_w) || Number(panel.w) || 0), h: q(Number(panel.cnc?.drawn_h) || Number(panel.h) || 0) };
    const was = { w: q(entry.panelSize.w), h: q(entry.panelSize.h) };
    if (Math.abs(was.w - now.w) <= SAME_MM && Math.abs(was.h - now.h) <= SAME_MM) continue;
    out.push({
      panelId, was, now, count: editCount(entry),
    });
  }
  return out;
}

/**
 * The map with those panels' geometry gone — and the SAME map back, identity
 * and all, when nothing was invalidated.
 *
 * Returning the same object matters: this runs on every recompute, and a new
 * object every time would write the project on every render.
 */
export function withoutResizedPartEdits(partEdits, panels = []) {
  const rows = resizedPanels(partEdits, panels);
  if (!rows.length) return { next: partEdits || {}, dropped: [] };
  let next = partEdits;
  for (const row of rows) next = withoutPartEdits(next, row.panelId);
  return { next, dropped: rows };
}

// ─── TURN 38 (CLAUDE.md F9): THE TWO GUARDS ────────────────────────────────
//
//   GUARD A  "any manual object extending beyond the panel outline → warning
//            (name the panel and the object)"
//   GUARD B  "any manual object on layer OUTLINE → warning (OUTLINE is the cut
//            boundary — manual geometry there will be cut as the part's edge)"
//
// Both are WARNINGS and neither is a gate. They are asked of the OVERRIDE LIST
// rather than of the applied result, because a warning that cannot name the
// object — "circle o3" — leaves a joiner hunting for which of forty shapes it
// means.

/** The layer that IS the cut boundary. One name, said once. */
const OUTLINE_LAYER = 'OUTLINE';

/** A drawn op's own extent, in the panel's CNC millimetres. */
function opBounds(op) {
  const box = (xs, ys) => ({
    x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys),
  });
  if (op.op === 'line' || op.op === 'rect' || op.op === 'dowels') {
    return box([op.from?.[0], op.to?.[0]], [op.from?.[1], op.to?.[1]]);
  }
  if (op.op === 'polyline') {
    const pts = op.pts || [];
    if (!pts.length) return null;
    return box(pts.map((p) => p[0]), pts.map((p) => p[1]));
  }
  if (op.op === 'circle') {
    return {
      x: op.at[0] - op.r, y: op.at[1] - op.r, w: op.r * 2, h: op.r * 2,
    };
  }
  if (op.op === 'arc') {
    // The whole circle, deliberately: an arc's true box needs its quadrant
    // crossings, and a guard that under-reports is worse than one that asks
    // a joiner to look at a shape that turned out to be inside after all.
    return {
      x: op.cx - op.r, y: op.cy - op.r, w: op.r * 2, h: op.r * 2,
    };
  }
  if (op.op === 'drill') {
    const r = (Number(op.d) || 0) / 2;
    return {
      x: op.x - r, y: op.y - r, w: r * 2, h: r * 2,
    };
  }
  return null;
}

/** How a joiner names one op out loud. */
function opLabel(op) {
  return `${op.op}${op.id ? ` ${op.id}` : ''}`;
}

/**
 * Guards A and B over one unit's whole override map.
 *
 * @returns {Array<{check:16|17, panelId:string, objectId:string|null, message:string}>}
 */
export function manualGeometryFaults(partEdits, panels = []) {
  const out = [];
  for (const [panelId, entry] of Object.entries(partEdits || {})) {
    if (!editCount(entry)) continue;
    const panel = (panels || []).find((p) => p.id === panelId);
    if (!panel) continue;
    const w = q(Number(panel.cnc?.drawn_w) || Number(panel.w) || 0);
    const h = q(Number(panel.cnc?.drawn_h) || Number(panel.h) || 0);
    for (const op of entry.ops) {
      if (op?.op === 'hide') continue;
      if (op?.layer === OUTLINE_LAYER) {
        out.push({
          check: 17,
          panelId,
          objectId: op.id || null,
          message: `${opLabel(op)} is on OUTLINE — OUTLINE is the cut boundary, `
            + 'so manual geometry there will be cut as the part’s edge.',
        });
      }
      const b = opBounds(op);
      if (!b) continue;
      const over = b.x < -SAME_MM || b.y < -SAME_MM
        || b.x + b.w > w + SAME_MM || b.y + b.h > h + SAME_MM;
      if (!over) continue;
      out.push({
        check: 16,
        panelId,
        objectId: op.id || null,
        message: `${opLabel(op)} runs off the panel — it reaches `
          + `${q(b.x)}…${q(b.x + b.w)} × ${q(b.y)}…${q(b.y + b.h)} on a ${w} × ${h} board.`,
      });
    }
  }
  return out;
}

/** The note F9 puts on screen, in the owner's own words. */
export function resizeDropMessage(dropped = []) {
  const names = dropped.map((d) => d.panelId);
  if (!names.length) return '';
  if (names.length === 1) return `Custom geometry dropped — ${names[0]} was resized.`;
  return `Custom geometry dropped — ${names.join(', ')} were resized.`;
}

/** "Back to computed" — this part's edits, gone (F9.3). */
export function withoutPartEdits(partEdits, panelId) {
  if (!partEdits || !Object.hasOwn(partEdits, panelId)) return partEdits || {};
  const { [panelId]: _dropped, ...rest } = partEdits;
  return rest;
}

/** Undo the last op on a part — the tools' own step back. */
export function withoutLastPartEdit(partEdits, panelId) {
  const entry = (partEdits || {})[panelId];
  if (!editCount(entry)) return partEdits || {};
  const ops = entry.ops.slice(0, -1);
  if (!ops.length) return withoutPartEdits(partEdits, panelId);
  return { ...partEdits, [panelId]: { ...entry, ops } };
}
