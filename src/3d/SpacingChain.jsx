import { useEffect, useMemo, useRef, useState } from 'react';
import { Html } from '@react-three/drei';
import { mm } from './constants.js';
import DimensionChain from './DimensionChain.jsx';
import { dimensionStyle } from '../engine/dimensionArrows.js';
import { formatDimension } from '../engine/format.js';
import { columnOfShelf } from '../engine/shelfHeights.js';
import { bayGapsAround, xFromChain } from '../engine/partitionPositions.js';
import { chromeOn } from './chrome.js';
import { useProjectStore } from '../stores/projectStore.js';

// ─── TURN 72 · F3 — THE SPACING IS ON THE WARDROBE, AND IT IS CLICKABLE ────
//
// The owner, 22.09.2026:
//
//   *"jak kliknę 2 razy na półkę to wymiary pomiędzy półkami niech zostaną i
//   będą klikalne i wtedy będzie można ustawić wysokość pomiędzy półkami"*
//
// …then, on the mock-up: *"to samo przenieś, dodaj do PRO; plus szerokości;
// dodaj na dole tego modalu CENTER ALL."*
//
// ─── WHAT IS NEW HERE, AND WHAT IS NOT ─────────────────────────────────────
//
// THE CHAIN IS NOT NEW. Turn 8 drew the clear openings of a shelf's column on
// HOVER; turn 28 taught it to measure the shelf's own BAY; turn 23 drew the
// bay widths either side of a hovered divider. Every number below comes out of
// those same two pure functions — `engine/shelfHeights.js shelfColumns` and
// `engine/partitionPositions.js bayGapsAround` — and is drawn by the ONE
// dimension component (R11). Nothing re-derives a gap here.
//
// THREE THINGS ARE NEW, and they are the owner's three:
//
//   IT STAYS       a hover chain lives as long as the pointer is on the board.
//                  This one is tied to the SELECTION, so it is on the scene for
//                  as long as the shelf is the thing in hand.
//   IT IS CLICKED  every figure is a chip. One click opens a number field ON
//                  the chip — `<Html>`, the same door `3d/ShareOutBar.jsx`
//                  already goes through when a tool needs a real control in the
//                  scene. Enter writes, Escape cancels, a click away cancels.
//   IT WRITES ONE  *"będzie można ustawić wysokość pomiędzy półkami"* — the
//                  typed number moves THE SELECTED PIECE and nothing else. Its
//                  neighbours stand exactly where they are, and the write goes
//                  through `setShelfPos` / `setPartitionX`, which is the clamp
//                  the DRAG obeys. The room refuses first, as it always has.
//
// ─── WHICH FIGURES ARE CHIPS, AND WHY NOT ALL OF THEM ──────────────────────
//
// A gap the selected shelf does not touch cannot be set by moving the selected
// shelf — it is bounded by two other boards. Those figures are drawn and are
// not clickable, which is the honest answer: a control that cannot act is the
// thing this project refuses to draw (#58).
//
// ─── THE STORE IS REACHED DIRECTLY, AND THAT IS THE HOUSE PATTERN ──────────
//
// `3d/LedIcons.jsx` has written to the project store since T33 for exactly this
// reason: a control that lives in the scene has no page to route through, and
// routing one through PRO's page and retail's stage would be two callers of one
// law. The store IS the law; this presses it.

// T73 F3 · the field's own look: big enough to read at the room camera,
// white, onyx ink, a gold edge (the Ivory and Onyx tokens, written out here
// because this component draws in PRO's page as well as in the client's).
const SPACING_FIELD_WRAP = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '4px 8px',
  background: '#FFFFFF',
  border: '2px solid #806A44',
  borderRadius: 6,
  boxShadow: '0 2px 10px rgba(9, 10, 9, 0.25)',
};
const SPACING_FIELD = {
  width: 96,
  height: 36,
  fontSize: 16,
  lineHeight: '36px',
  textAlign: 'right',
  color: '#090A09',
  background: '#FFFFFF',
  border: 'none',
  outline: 'none',
  fontFamily: 'Inter, Helvetica Neue, Arial, sans-serif',
};
const SPACING_FIELD_UNIT = {
  fontSize: 12,
  letterSpacing: '0.12em',
  color: '#5C5B57',
  fontFamily: 'Inter, Helvetica Neue, Arial, sans-serif',
};

/** The gap's own faces, and which of them this piece is. */
function touching(gap, piece) {
  const near = (a, b) => Math.abs(a - b) < 0.5;
  if (near(gap.to, piece.from)) return 'above';   // the gap is BELOW the piece
  if (near(gap.from, piece.to)) return 'below';   // …and this one is ABOVE it
  return null;
}

/**
 * THE ROWS, for whichever piece is selected.
 *
 * @returns {{rows:Array, plane:string, at:number, name:string}|null}
 */
function chainFor({
  panel, result, columns, boardT,
}) {
  if (!panel?.box) return null;

  // ─── A SHELF · the whole ladder of its own bay ──────────────────────────
  if (panel.part === 'SHELF' || panel.part === 'FIXED') {
    const column = columnOfShelf(columns, panel.id);
    if (!column) return null;
    const me = { from: panel.box.y, to: panel.box.y + panel.box.h };
    const rows = (column.lights || []).map((g, i) => {
      const side = touching(g, me);
      return {
        key: `gap-${i}`,
        from: [column.flank.x, g.from],
        to: [column.flank.x, g.to],
        offset: column.flank.dir * 0,
        label: `${formatDimension(g.size)}${g.even ? '' : ' ≠'}`,
        value: g.size,
        // What the SELECTED shelf's underside becomes when this figure is
        // typed. Both cases are one subtraction off a face that does not move.
        commit: side === 'above'
          ? (want) => g.from + want
          : (side === 'below' ? (want) => g.to - want - panel.box.h : null),
      };
    });
    return {
      rows, plane: 'xy', at: panel.box.z + panel.box.d, name: `spacing-${panel.id}`,
    };
  }

  // ─── A DIVIDER · the bays either side of it ─────────────────────────────
  if (panel.part === 'VPART') {
    const panels = (result?.panels || []).filter((p) => p.box);
    const walls = panels
      .filter((p) => (p.part === 'BUL' || p.part === 'BUR' || (p.part === 'VPART' && p.id !== panel.id)))
      .map((p) => ({ x: p.box.x, w: p.box.w }));
    const others = panels
      .filter((p) => p.part === 'VPART' && p.id !== panel.id)
      .map((p) => ({ x: p.box.x, w: p.box.w }));
    const gaps = bayGapsAround({ at: { x: panel.box.x, w: panel.box.w }, walls });
    if (!gaps.length) return null;
    const y = panel.box.y + panel.box.h / 2;
    const rows = gaps.map((g) => ({
      key: `bay-${g.key}`,
      from: [g.from, y],
      to: [g.to, y],
      offset: 0,
      label: formatDimension(g.value),
      value: g.value,
      // LEFT: the divider's near face lands `want` past the face on its left.
      // RIGHT: it lands `want` back from the face on its right. Either way the
      // answer is an ABSOLUTE `x_mm`, which is what the store stores, and
      // `xFromChain` is the same mapping PRO's own field commits through.
      commit: g.key === 'left'
        ? (want) => xFromChain({
          value: want, x: panel.box.x, boardT, others,
        })
        : (want) => g.to - want - panel.box.w,
    }));
    return {
      rows, plane: 'xy', at: panel.box.z + panel.box.d, name: `widths-${panel.id}`,
    };
  }

  return null;
}

/**
 * The chain that stays while a piece is selected, with every figure a chip.
 *
 * @param {object} props
 *   unit     the design-layer unit (its id is what the store writes through)
 *   result   computeCabinet() output — every number is read off it
 *   columns  `shelfColumns(...)`, already computed by the view
 *   panelId  the SELECTED piece, or null
 *   profile
 */
export default function SpacingChain({
  unit, result, columns = [], panelId = null, profile, colour = null,
}) {
  // The same channel the hover readout answers on: a client's room switches
  // the dimension overlay as a whole, and this is part of it.
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState('');
  // T73 F3 · the field opens with its number SELECTED: typing replaces it,
  // Enter confirms it as it stands.
  const fieldRef = useRef(null);
  useEffect(() => {
    if (!editing) return undefined;
    const t = setTimeout(() => { fieldRef.current?.focus(); fieldRef.current?.select(); }, 0);
    return () => clearTimeout(t);
  }, [editing]);
  const setShelfPos = useProjectStore((s) => s.setShelfPos);
  const setPartitionX = useProjectStore((s) => s.setPartitionX);

  const panel = useMemo(
    () => (panelId ? (result?.panels || []).find((p) => p.id === panelId) || null : null),
    [panelId, result],
  );
  const style = useMemo(() => dimensionStyle(profile), [profile]);
  const G = unit?.params?.board_t ?? profile?.board?.thickness ?? 18;
  const chain = useMemo(
    () => chainFor({
      panel, result, columns, boardT: G,
    }),
    [panel, result, columns, G],
  );

  // A selection that moves takes the open field with it: an input standing on
  // a figure that is no longer there is a control over nothing.
  useEffect(() => { setEditing(null); setDraft(''); }, [panelId]);

  if (!chromeOn('dimensions')) return null;
  if (!chain || !panel) return null;

  const itemId = panel.meta?.itemId || null;
  const row = editing ? chain.rows.find((r) => r.key === editing) : null;

  const commit = () => {
    const want = Number(draft);
    if (!row?.commit || !Number.isFinite(want) || !itemId) { setEditing(null); return; }
    const next = row.commit(want);
    if (panel.part === 'VPART') setPartitionX(unit.id, itemId, next);
    else setShelfPos(unit.id, itemId, next);
    setEditing(null);
    setDraft('');
  };

  // WHERE THE FIELD STANDS: on the figure it is editing, which is the middle of
  // that row. The chain draws its caption there and the input replaces it.
  const at = row
    ? [(row.from[0] + row.to[0]) / 2, (row.from[1] + row.to[1]) / 2]
    : null;

  return (
    <group userData={{ ccHelper: true, ccNoBounds: true, ccSpacingChain: panelId }}>
      <DimensionChain
        rows={chain.rows}
        style={style}
        plane={chain.plane}
        at={chain.at}
        colour={colour}
        name={chain.name}
        pickOn="click"
        onPick={(picked) => {
          const found = chain.rows.find((r) => r.key === picked.key);
          if (!found?.commit || !itemId) return;
          setEditing(found.key);
          setDraft(String(Math.round(found.value)));
        }}
      />
      {row && at && (
        <group
          position={chain.plane === 'xz'
            ? [mm(at[0]), mm(chain.at), mm(at[1])]
            : [mm(at[0]), mm(at[1]), mm(chain.at)]}
          userData={{ ccHelper: true, ccNoBounds: true }}
        >
          <Html center zIndexRange={[45, 35]} style={{ pointerEvents: 'auto' }}>
            {/* T73 F3 · the owner, 23.09.2026: *"2klik na wymiar otwiera
                malutkie pole, którego nie widać i nie mam jak wpisać; powinien
                tam być numer default i zaznaczone"*. The field carries its own
                size and colours, so it reads the same in PRO and in the
                client's room whatever stylesheet is loaded there. */}
            <div style={SPACING_FIELD_WRAP} data-spacing-field-wrap={row.key}>
              <input
                ref={fieldRef}
                type="text"
                inputMode="numeric"
                style={SPACING_FIELD}
                data-spacing-field={row.key}
                // eslint-disable-next-line jsx-a11y/no-autofocus -- the click WAS the focus
                autoFocus
                value={draft}
                onFocus={(e) => e.currentTarget.select()}
                onChange={(e) => setDraft(e.target.value.replace(/[^\d]/g, ''))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); commit(); }
                // *"Escape cancels."* — and so does a click anywhere else.
                if (e.key === 'Escape') { e.preventDefault(); setEditing(null); setDraft(''); }
              }}
                onBlur={() => { setEditing(null); setDraft(''); }}
              />
              <span style={SPACING_FIELD_UNIT}>mm</span>
            </div>
          </Html>
        </group>
      )}
    </group>
  );
}
