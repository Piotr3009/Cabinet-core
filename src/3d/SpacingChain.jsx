import { useEffect, useMemo, useRef, useState } from 'react';
import { Html } from '@react-three/drei';
import { mm } from './constants.js';
import DimensionChain from './DimensionChain.jsx';
import { dimensionStyle } from '../engine/dimensionArrows.js';
import { formatDimension } from '../engine/format.js';
import { columnOfShelf } from '../engine/shelfHeights.js';
import { bayGapsAround, xFromChain } from '../engine/partitionPositions.js';
import { unitSpan } from '../engine/collision.js';
import { secondShoeItem } from '../engine/watchDrawer.js';
import { chromeOn } from './chrome.js';
import { useProjectStore } from '../stores/projectStore.js';
import { useUiStore } from '../stores/uiStore.js';

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
  panel, result, columns, boardT, unit = null, units = [],
}) {
  if (!panel?.box) return null;

  // ─── T74 F13 · THE FREE PANEL · where it stands, and it moves by the figure ─
  // *"Przesuwanie przez kliknięcie w wymiar."*  TWO figures, drawn on its
  // front face in its own frame: from what is on its LEFT along the wall (the
  // nearest edge of another unit, else the wall's start) to its left edge, and
  // from the FLOOR to its underside. Typing either moves the panel: along the
  // wall through `moveUnit` (the silent magnet off: a typed number is meant),
  // up and down through its own `mount_height`, the clamps saying no when the
  // room does.
  if (panel.part === 'FREE-PANEL' && unit) {
    const x = Number(unit.position?.x_mm) || 0;
    const wall = unit.position?.wall ?? 0;
    // Measured to what stands there: a neighbour's footprint, its end panel
    // included (`unitSpan`, the placement's own measure).
    const lefts = (units || [])
      .filter((u) => u.id !== unit.id && (u.position?.wall ?? 0) === wall)
      .map((u) => unitSpan(u).right)
      .filter((r) => r <= x + 1e-6);
    const from = lefts.length ? Math.max(...lefts) : 0;
    const W = Number(unit.params?.width) || 0;
    const H = Number(unit.params?.height) || 0;
    const up = Number(unit.params?.mount_height) || 0;
    const rows = [];
    if (x - from > 0.5) {
      rows.push({
        key: 'fp-left',
        from: [from - x, H / 2],
        to: [0, H / 2],
        offset: 0,
        label: formatDimension(x - from),
        value: x - from,
        commit: (want) => from + want,
        write: 'unit-x',
      });
    }
    // On the floor the figure still stands (it reads 0), so the height is
    // always one click away: drawn a millimetre long, labelled with the truth.
    rows.push({
      key: 'fp-floor',
      from: [W / 2, -Math.max(up, 1)],
      to: [W / 2, 0],
      offset: 0,
      label: formatDimension(up),
      value: up,
      commit: (want) => want,
      write: 'unit-mount',
    });
    return {
      rows,
      plane: 'xy',
      at: Number(unit.params?.depth) || 0,
      name: `free-panel-${unit.id}`,
      itemId: unit.id,
    };
  }

  // ─── T74 F6 · THE SECOND SHOE DRAWER · the distance to the drawer under it ─
  // *"Druga przesuwana góra/dół, program pokazuje odległość między
  // szufladami."*  ONE figure: from the top of the drawer front under it to
  // the bottom of its own. Typing a distance sets the drawer's MOUNTING
  // HEIGHT through the store's one clamp (`setDrawerMount`), the same one the
  // drag writes through; its own height is not a control here.
  if (panel.part === 'DRAWER-FRONT' && Number(panel.meta?.drawer) > 1) {
    const zone = panel.meta?.zone ?? null;
    const item = unit ? secondShoeItem(unit, panel.meta.drawer, zone) : null;
    const below = (result?.panels || []).find((p) => p.part === 'DRAWER-FRONT' && p.box
      && Number(p.meta?.drawer) === Number(panel.meta.drawer) - 1 && (p.meta?.zone ?? null) === zone);
    if (!item || !below) return null;
    const from = below.box.y + below.box.h;
    const to = panel.box.y;
    const x = panel.box.x + panel.box.w - 60;
    return {
      rows: [{
        key: 'drawer-gap',
        from: [x, from],
        to: [x, to],
        offset: 0,
        label: formatDimension(to - from),
        value: to - from,
        commit: (want) => from + want,
      }],
      plane: 'xy',
      at: panel.box.z + panel.box.d,
      name: `drawer-gap-${panel.id}`,
      itemId: item.id,
      write: 'drawer-mount',
    };
  }

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
  // T74 F6 · the second shoe drawer's mounting height, the drag's own setter.
  const setDrawerMount = useProjectStore((s) => s.setDrawerMount);
  // T74 F13 · a free panel's two figures move the unit itself.
  const units = useProjectStore((s) => s.units);
  const moveUnit = useProjectStore((s) => s.moveUnit);
  const updateUnitParams = useProjectStore((s) => s.updateUnitParams);
  const notify = useUiStore((s) => s.notify);

  const panel = useMemo(
    () => (panelId ? (result?.panels || []).find((p) => p.id === panelId) || null : null),
    [panelId, result],
  );
  const style = useMemo(() => dimensionStyle(profile), [profile]);
  const G = unit?.params?.board_t ?? profile?.board?.thickness ?? 18;
  const chain = useMemo(
    () => chainFor({
      panel, result, columns, boardT: G, unit, units,
    }),
    [panel, result, columns, G, unit, units],
  );

  // A selection that moves takes the open field with it: an input standing on
  // a figure that is no longer there is a control over nothing.
  useEffect(() => { setEditing(null); setDraft(''); }, [panelId]);

  if (!chromeOn('dimensions')) return null;
  if (!chain || !panel) return null;

  const itemId = chain.itemId || panel.meta?.itemId || null;
  const row = editing ? chain.rows.find((r) => r.key === editing) : null;

  const commit = () => {
    const want = Number(draft);
    if (!row?.commit || !Number.isFinite(want) || !itemId) { setEditing(null); return; }
    const next = row.commit(want);
    if (row.write === 'unit-x') moveUnit(unit.id, next, 0.5, { magnet: false });
    else if (row.write === 'unit-mount') {
      for (const note of updateUnitParams(unit.id, { mount_height: next })?.notices || []) notify(note, 'warn');
    } else if (chain.write === 'drawer-mount') setDrawerMount(unit.id, itemId, next);
    else if (panel.part === 'VPART') setPartitionX(unit.id, itemId, next);
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
