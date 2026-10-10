// ─── T75 · F22 · PRODUCTION READINESS, ON EVERY LINE ────────────────────────
//
// CLAUDE.md T75 F22: *"`engine/readiness.js`, pure: `readinessOf(part |
// hardwareLine)` returns `'cut'` (fully machined from a LISP or an agreed
// pattern), `'geometry'` (outline only, no holes: the blind blank, a box-out
// board, the T30 lattice), `'bought'` (an order line), or `'manual'` (the
// joiner fits it on site: the worktop joint, the blank's fixing). It reads the
// meta the parts ALREADY carry (`meta.corner`, `hardwareKit`, the yellow notes
// of BLOCKERS) and a side map keyed by part id; it writes nothing into the
// panel records, so every golden dump is byte-identical by construction."*
//
// THE ORDER OF THE QUESTIONS, first answer wins:
//   1. an ORDER LINE (a hardware line, a bought mechanism, a worktop slab) is
//      `bought`: nothing of it is machined here;
//   2. what the line says of itself (`readiness`, or `meta.readiness`): the
//      blind blank, the corner post, the notch's box-out, the pelmet, the hob's
//      dummy front, the worktop's cut-outs and its joint all say it already;
//   3. a hole on the part the machine cannot drill (`meta.readiness` on the
//      drill: a dowel's edge bore on a 3-axis bed) makes the part `manual`;
//   4. the side map, by part name, for the parts that predate the meta (the
//      T30 lattice);
//   5. a part with a CNC outline is `cut`: its outline and its drilling are the
//      LISP's or the agreed pattern's. A note row that names no state is
//      `manual` (a note is something somebody does by hand).
//
// ─── T76 F5 · ONE STATE: THE DECORATED FRONT ─────────────────────────────
//
// CLAUDE.md T76 F5: *"a front whose recipe validated is `'cut'`; a front whose
// recipe is BLOCKED by GPT's validator (the pattern is not exported) is
// `'cut'` for the slab and the Check names the blocked recipe (the state of
// the LINE is the slab's; the decoration's refusal is a Check, as GPT built
// it); an AM strip is a `'cut'` part of its own and the host front carries a
// `'manual'` NOTE for the gluing of its strips (the T75 worktop-joint
// grammar)."*  So a decoration never makes a state of its own (question 4b
// below), and `appliedStripNotes` is the one place that says which fronts
// carry a gluing NOTE: the cut list, the Check and the CNC banner read it.
//
// Pure: no store, no React, no profile. It READS; the panel records are never
// written, so no golden can move.

/** The four states, in the order a line sheet sorts them. */
export const READINESS_STATES = ['cut', 'geometry', 'manual', 'bought'];

/** What each state is called on a screen and a sheet. */
export const READINESS_LABELS = {
  cut: 'Cut',
  geometry: 'Outline only',
  manual: 'Fit on site',
  bought: 'Bought',
};

/**
 * The side map: parts that predate the meta, by part name. T30 F17's wine
 * lattice is cut as plain rectangles: *"the cross-halving joints a lattice is
 * really made with"* are not machined.
 */
const READINESS_SIDE_MAP = Object.freeze({
  'LATTICE-V': 'geometry',
  'LATTICE-H': 'geometry',
});

const KNOWN = new Set(READINESS_STATES);
const known = (v) => (KNOWN.has(v) ? v : null);

/** Is this line an order line (hardware, a bought mechanism, a slab)? */
function isOrderLine(line) {
  if (!line) return false;
  if (line.hardwareKit || line.kind === 'hardware') return true;
  // A hardware line from `computeCabinet` (`result.hardware`): a role, a
  // quantity and a unit of count, and no board.
  if (line.qty != null && line.unit != null && line.w == null && line.cnc == null && line.part == null) return true;
  return false;
}

/**
 * The state of ONE line: a panel of `computeCabinet`, a cut list row of
 * `bom.js`, a hardware line, or a worktop row.
 *
 * @param {object} line
 * @param {object} [opts]
 *   drills   the result's drills; holes on THIS part that say `manual` make it so
 *   side     the side map (defaults to READINESS_SIDE_MAP)
 * @returns {'cut'|'geometry'|'manual'|'bought'|null}
 */
export function readinessOf(line, { drills = null, side = READINESS_SIDE_MAP } = {}) {
  if (!line) return null;
  if (isOrderLine(line)) return 'bought';
  const own = known(line.readiness) || known(line.meta?.readiness);
  if (own) return own;
  const id = line.id ?? null;
  if (id != null && Array.isArray(drills)
    && drills.some((d) => d && d.panel === id && known(d.meta?.readiness) === 'manual')) {
    return 'manual';
  }
  const mapped = known(side?.[line.part]) || known(side?.[id]);
  if (mapped) return mapped;
  // 4b. T76 F5 · a decorated front is the slab's state, ready or blocked (a
  // blocked recipe is Check #9's, never a state), and an applied strip is a
  // cut part of its own: both are `cut`, asked by name so no later rule can
  // read the decoration as something else.
  if (line.meta?.frontDecoration || line.meta?.frontDecorationParent) return 'cut';
  if (line.material_role === 'note' || line.role === 'worktop_note') return 'manual';
  return 'cut';
}

/**
 * T76 F5 · the gluing of applied strips, one NOTE per host front: the strips
 * are cut parts (`cut`), fixing them to the front is the joiner's (`manual`).
 * Only a front whose recipe validated carries strips (a blocked recipe has
 * none), so only it carries the note.
 *
 * @returns {Array<{id, part, host, strips, mitre, state}>}
 */
export function appliedStripNotes(panels) {
  return (panels || [])
    .filter((p) => p?.meta?.frontDecoration?.status === 'ready' && (p.meta.frontDecoration.additions || []).length)
    .map((p) => {
      const additions = p.meta.frontDecoration.additions;
      return {
        id: `${p.id} strips`,
        part: 'APPLIED-STRIPS',
        host: p.id,
        strips: additions.length,
        mitre: additions[0]?.mitres?.start ?? null,
        state: 'manual',
      };
    });
}

/**
 * Every line of one result that is NOT `cut`, with its state: what a joiner
 * has to do or buy beyond what the machine makes.
 *
 * @returns {Array<{id, part, state}>}
 */
export function notCutParts(result) {
  const drills = result?.drills || [];
  return [
    ...(result?.panels || [])
      .map((p) => ({ id: p.id, part: p.part, state: readinessOf(p, { drills }) }))
      .filter((r) => r.state !== 'cut'),
    // T76 F5 · and the strips a joiner glues on, as the worktop joint is listed.
    ...appliedStripNotes(result?.panels).map((n) => ({ id: n.id, part: n.part, state: n.state })),
  ];
}

/**
 * How many lines of a list are not `cut`, and the sentence a CNC export
 * carries for them. `lines` are `{ state }` rows (or anything `readinessOf`
 * reads, when `read` is true).
 *
 * @returns {{ count:number, byState:object, banner:string|null }}
 */
export function readinessBanner(lines, { read = false } = {}) {
  const states = (lines || []).map((l) => (read ? readinessOf(l) : l?.state)).filter(Boolean);
  const byState = { geometry: 0, manual: 0 };
  for (const s of states) if (s in byState) byState[s] += 1;
  const count = byState.geometry + byState.manual;
  if (!count) return { count: 0, byState, banner: null };
  const parts = [];
  if (byState.geometry) parts.push(`${byState.geometry} outline only (no holes)`);
  if (byState.manual) parts.push(`${byState.manual} to fit on site`);
  return {
    count,
    byState,
    banner: `${count} part${count === 1 ? ' is' : 's are'} not fully machined: ${parts.join(', ')}.`,
  };
}

/**
 * The Check's sentence, by unit: `[{ unitNum, lines: [{ id, state }] }]` into
 * one line per unit, or null when every part is cut.
 */
export function readinessCheckMessage(byUnit) {
  const rows = (byUnit || []).filter((u) => (u.lines || []).length);
  if (!rows.length) return null;
  // Like parts are counted, not listed twenty times: "LATTICE-H x20".
  const said = (lines) => {
    const groups = new Map();
    for (const l of lines) {
      const key = `${l.part || l.id}|${l.state}`;
      const g = groups.get(key) || { name: l.part || l.id, state: l.state, n: 0 };
      g.n += 1;
      groups.set(key, g);
    }
    return [...groups.values()]
      .map((g) => `${g.name}${g.n > 1 ? ` x${g.n}` : ''} (${READINESS_LABELS[g.state].toLowerCase()})`).join(', ');
  };
  return `Not fully machined, the joiner's to finish: ${rows.map((u) => `${u.unitNum}: ${said(u.lines)}`).join('; ')}.`;
}
