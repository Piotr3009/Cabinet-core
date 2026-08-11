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

/** Round to the micrometre — the same 4 places `addDrill` stores at. */
const q = (v) => {
  const n = Math.round((Number(v) || 0) * 1e4) / 1e4;
  return Object.is(n, -0) ? 0 : n;
};

/** The kinds an override may name. */
export const EDIT_OPS = ['hide', 'drill', 'line', 'dowels'];

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

/** The same walk, as a Set of ids — what "is this feature hidden" asks. */
export function featureIdsOf(panel, drills = []) {
  return partFeatures(panel, drills).map((f) => f.fid);
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
        });
        continue;
      }
      if (op?.op === 'line') {
        marks.push({
          layer: op.layer,
          from: [q(op.from?.[0]), q(op.from?.[1])],
          to: [q(op.to?.[0]), q(op.to?.[1])],
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
          });
        }
      }
    }
    hidden.set(panelId, drop);
    added.set(panelId, { drills, marks });
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
export function withPartEdit(partEdits, panelId, op, signature) {
  if (!panelId || !op?.op || !EDIT_OPS.includes(op.op)) return partEdits || {};
  const before = (partEdits || {})[panelId];
  const entry = before && before.signature === signature
    ? before
    : { signature, ops: [] };
  return { ...(partEdits || {}), [panelId]: { ...entry, ops: [...entry.ops, op] } };
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
