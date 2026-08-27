// ─── PLINTHS AND INFILLS: VERTICAL, AND SPLIT AT A CABINET EDGE ─────────────
//
// Turn 53, CLAUDE.md F6. The owner, 27.08.2026:
//
//   *"infille i plinthy układaj na CNC w pionie zawsze i dziel tak, żeby się
//   równo z szafką którąś — żeby nie przekroczyło wysokości materiału. przy
//   okazji rozwiążemy problem oversizu."*
//
// …and his own worked example, which is the assertion this module is held to:
//
//   *"płyta ma 2400 a plinth wychodzi 3200 — zobacz jakie mamy szafki:
//   3 × 650 = 1950, reszta drugi pasek. łączenie zawsze równo z szafką, a nie
//   na środku szafki."*
//
// ─── LISP IS LAW, FIRST (iron rule 3) ───────────────────────────────────────
//
// `SKY:stripsAtCabinetEdges` and `SKY:stripOversize` in
// `reference/lisp/SKYLON_COMMON.lsp`. This file MATCHES them; it does not
// interpret them.
//
// ─── THE THREE CLAUSES, AND THEY ARE ONE LAW ────────────────────────────────
//
//   VERTICAL — the piece's LENGTH runs along the board's HEIGHT. That is
//   `engine/grain.js CUT_STANDING_PARTS`, and the PLINTH has been on that list
//   since T40. The INFILL was not, and tonight it is: the owner's *"zawsze"*
//   is one word about both pieces.
//
//   SPLIT AT A CABINET EDGE — a joint in the middle of a cabinet is a joint the
//   eye finds. A strip takes WHOLE CABINET WIDTHS while the sum still fits the
//   board, and closes the moment the next one would not.
//
//   AND THE SPLIT CLOSES THE OVERSIZE — no strip may exceed the sheet, so what
//   is left to flag is a SINGLE CABINET wider than the board, which no split
//   can save.
//
// Pure functions: numbers in, numbers out. No store, no React, no three.js.

/**
 * The board a family's parts are cut from, in millimetres.
 *
 * The same three-step fallback `engine/checks.js sheetSizeForFamily` takes, and
 * for the same reason: a workshop does not buy its carcass board and its front
 * board off the same rack, and a shop that has never opened the panel is cut
 * from the board it has always been cut from. It is DUPLICATED here rather than
 * imported because `checks.js` reaches half the engine and `cabinet.js` may not
 * depend on it — and the duplication is three lines of lookup with no arithmetic
 * in it, which is the kind that cannot drift.
 *
 * @param {object} profile
 * @param {'carcasses'|'fronts'} family
 * @returns {{width:number, height:number}}
 */
function boardSizeFor(profile, family = 'carcasses') {
  const own = family === 'fronts' ? profile?.cnc?.sheetFronts : profile?.cnc?.sheetCarcass;
  const w = Number(own?.width);
  const h = Number(own?.height);
  if (Number.isFinite(w) && w > 0 && Number.isFinite(h) && h > 0) return { width: w, height: h };
  const fallback = profile?.cnc?.sheet || {};
  return {
    width: Math.max(0, Number(fallback.width) || 0),
    height: Math.max(0, Number(fallback.height) || 0),
  };
}

/** How long a strip of this family may be: the board's own HEIGHT, because the
 * piece is nested standing. */
export function stripLimitMm(profile, family = 'carcasses') {
  return boardSizeFor(profile, family).height;
}

/**
 * The strips one long piece becomes, split ONLY at a cabinet boundary.
 *
 * @param {Array<{id?:string, width:number}>} spans  the cabinets under the
 *   piece, left to right
 * @param {number} limit  the board's own height
 * @returns {Array<{from:number, length:number, unitIds:string[], index:number,
 *   of:number}>} `from` is measured from the piece's own left end.
 *
 * ONE strip — the whole piece, unsplit — whenever it already fits, so a run
 * shorter than a board is byte-for-byte what it was. A single cabinet WIDER
 * than the board yields a strip that is over: no split can save it, and
 * `oversizeCabinets` below is what names it.
 */
export function stripsAtCabinetEdges(spans, limit) {
  const list = (spans || [])
    .map((s) => ({ id: s?.id ?? null, width: Math.max(0, Number(s?.width) || 0) }))
    .filter((s) => s.width > 0);
  const cap = Number(limit) > 0 ? Number(limit) : Infinity;
  const out = [];
  let cur = null;
  let cursor = 0;
  for (const s of list) {
    if (cur && cur.length + s.width > cap + 1e-6) {
      out.push(cur);
      cursor += cur.length;
      cur = null;
    }
    if (!cur) cur = { from: cursor, length: 0, unitIds: [] };
    cur.length += s.width;
    if (s.id) cur.unitIds.push(s.id);
  }
  if (cur) out.push(cur);
  return out.map((s, i) => ({
    from: Math.round(s.from * 1000) / 1000,
    length: Math.round(s.length * 1000) / 1000,
    unitIds: s.unitIds,
    index: i + 1,
    of: out.length,
  }));
}

/**
 * The one thing a split cannot save: a cabinet wider than the board.
 *
 * *"the check that used to flag the oversize now flags only a single cabinet
 * wider than the board."*
 */
export function oversizeCabinets(spans, limit) {
  const cap = Number(limit) > 0 ? Number(limit) : Infinity;
  return (spans || [])
    .filter((s) => Math.max(0, Number(s?.width) || 0) > cap + 1e-6)
    .map((s) => ({ id: s?.id ?? null, width: Math.max(0, Number(s?.width) || 0) }));
}

/**
 * The same split, asked of a STRETCH of a run rather than of the whole of it.
 *
 * F3's top infill already breaks at every knee in the ceiling, and CLAUDE.md
 * says the two laws compose: *"a segment that is still too long splits again,
 * at a cabinet edge."*  So this takes the cabinet boundaries that fall inside
 * `[from, to]` and splits there — and where a knee has left a stretch that
 * starts or ends mid-cabinet, the part-cabinet at each end is a span in its own
 * right, because the knee has already made that a joint.
 *
 * @returns {Array<{from:number, to:number}>} in the same frame as `from`/`to`.
 */
export function splitStretchAtEdges(from, to, edges, limit) {
  const a = Math.min(Number(from) || 0, Number(to) || 0);
  const b = Math.max(Number(from) || 0, Number(to) || 0);
  const cap = Number(limit) > 0 ? Number(limit) : Infinity;
  if (!(b - a > cap + 1e-6)) return [{ from: a, to: b }];
  const inside = (edges || [])
    .map(Number)
    .filter((x) => Number.isFinite(x) && x > a + 1e-6 && x < b - 1e-6)
    .sort((p, q) => p - q);
  const spans = [];
  let prev = a;
  for (const x of inside) { spans.push({ id: null, width: x - prev }); prev = x; }
  spans.push({ id: null, width: b - prev });
  const strips = stripsAtCabinetEdges(spans, cap);
  return strips.map((s) => ({
    from: Math.round((a + s.from) * 1000) / 1000,
    to: Math.round((a + s.from + s.length) * 1000) / 1000,
  }));
}
