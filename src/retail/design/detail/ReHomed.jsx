import {
  Button, ChipRow, Field, NumberField, Said,
} from '../controls.jsx';
import { REASONS } from '../reasons.js';
import * as A from '../adapter.js';
import { ShoeDrawing } from './drawings.jsx';

// ─── TURN 67 · F7 — LEFT ADDS, RIGHT EDITS ─────────────────────────────────
//
// The owner, on the screenshot of INSIDE grown long, 11.09.2026:
//
//   *"jak dodajesz szuflady, to się nie powinny pokazywać pod spodem, tu menu
//   po lewej ma być puste — powinno się pokazywać po prawej … te funkcje niech
//   przejdą na prawą stronę."*
//
// T66 F3 deleted eleven thin Duty menus and re-homed the stack-wide controls
// they carried INTO the INSIDE row that counts the things — *"that control
// moves into INSIDE's row — never lost"*. He has now seen that, and the row is
// the wrong place: adding three drawers grew the left column by four fields.
//
// So the component MOVES ON, whole, to the surface that was already the one
// editor: the docked right panel. Not one call below changed — this file is
// T66's `ReHomed` lifted out of `Options.jsx` byte for byte, with its imports
// repointed one directory up, because a control that is re-homed twice and
// re-written once is a control that has quietly become two.
//
// ONE SENTENCE LAW: **left adds, right edits.**
//
// WHAT STAYS ON THE LEFT is the row and its count — *"tu menu po lewej ma być
// puste"* — and the two things that are not about one element at all: the
// wardrobe's colour and the project palette, which live under MORE OPTIONS
// where T66 put them.

/* ─── T66 F3 · THE CONTROLS THE DEAD THIN MENUS CARRIED ────────────────────
 *
 * The owner: *"w zasadzie po prawej powinien być tylko menu edycji."* Eleven
 * thin `design/detail/*Menu.jsx` files are DELETED tonight; the docked copied
 * editor does their editing. What it does NOT do is the stack-wide and
 * whole-fitting questions those menus also carried — how many drawers, what
 * goes in the top one, the glass, where the pull-down's rod hangs, and REMOVE
 * for a bought mechanism the engine cuts no board for.
 *
 * CLAUDE.md's own clause for that: *"that control moves into INSIDE's row —
 * never lost, named in the PR body."* This is the row, one component, keyed on
 * the same `INTERIOR_ROWS` id the counter above it reads — so a row that adds
 * a thing and the controls for that thing are one line apart, and the right-
 * hand panel keeps its single duty.
 *
 * Every call below is the one the deleted menu made, unchanged.
 */

// ─── TURN 67 · F8 — THE LIST IS NAMES, NOT SENTENCES ───────────────────────
//
// The owner, 11.09.2026, of the docked panel with a stack in it:
//
//   *"po prawej się pokazuje każda szuflada jako fitted — nie powinna, tylko
//   nazwa."*
//
// A list is a list of NAMES. `Drawer 1`, `Drawer 2`, `Accessories drawer` —
// and the accessories one takes its name off the SAME table INSIDE counts
// with (`adapter.INTERIOR_ROWS`), which is where F9 renamed it, so the two
// sides cannot drift.
//
// The EXPLANATION — *"a fitted one — its height is set by what goes in it"* —
// is not deleted and is not repeated: it belongs to ONE drawer, so it appears
// when THAT drawer is clicked, once, in the copied `ElementProperties` below
// this list, which is PRO's own detail for the piece and is untouched.
//
// Clicking a name SELECTS that drawer through the same store the stage writes,
// so the detail under the list swaps to it in place — the dock never opens a
// second window, which is T66 F3's law and still holds.
/** Which ROW a drawer belongs to — the same three the engine distinguishes. */
function drawerMenu(d) {
  if (d?.watch_insert === true || d?.variant === 'watch') return 'watch';
  if (d?.variant === 'shoe') return 'shoe';
  return d?.kind === 'overlay_drawer' ? 'overlay' : 'drawers';
}

function drawerName(d, n) {
  if (d?.watch_insert === true || d?.variant === 'watch') {
    return A.INTERIOR_ROWS.find((row) => row.id === 'watch')?.name || 'Accessories drawer';
  }
  if (d?.variant === 'shoe') {
    return A.INTERIOR_ROWS.find((row) => row.id === 'shoe')?.name || 'Shoe drawer';
  }
  return `Drawer ${n}`;
}

function DrawerList({ unitId, drawers }) {
  if (!drawers.length) return null;
  return (
    <Field label="THE DRAWERS" block>
      <ul className="pbi-drawer-list" data-testid="dock-drawer-list">
        {drawers.map((d, i) => (
          <li key={d.id}>
            <Button
              kind="secondary"
              className="pbi-drawer-row"
              data-testid={`dock-drawer-${i + 1}`}
              data-drawer-name={drawerName(d, i + 1)}
              onClick={() => {
                // THIS drawer, by the panel the stage would have handed the
                // dock if the client had clicked its front.
                const menu = drawerMenu(d);
                const ref = A.stageRefFor(unitId, menu, d.id);
                if (ref) A.selectOnStage(unitId, ref);
              }}
            >
              {drawerName(d, i + 1)}
            </Button>
          </li>
        ))}
      </ul>
    </Field>
  );
}

export default function ReHomed({ row, unitId }) {
  const b = A.drawerBounds();

  // DRAWERS — from `DrawersMenu`: HOW MANY, TOP DRAWER INSERT, GLASS TOP and
  // the stack-wide FRONT HEIGHTS. One drawer's own height is the docked
  // editor's `drawer-height` field, which is PRO's own.
  if (row.id === 'drawers') {
    const stack = A.drawerStack(unitId);
    const refusals = A.insertRefusals(unitId);
    const top = stack.top;
    const glassWhy = A.glassRefusal(unitId);
    const fixed = A.stackHasFixedHeights(unitId);
    const word = A.stackWord(unitId);
    return (
      <div className="pbi-interior-more">
        <Field label="HOW MANY" note={A.countNote(unitId)}>
          <ChipRow
            testid="drawers-count"
            value={String(stack.drawers.length)}
            options={Array.from({ length: b.maxCount }, (_, i) => i + 1)
              .map((n) => ({ id: String(n), label: String(n) }))}
            onPick={(id) => A.setStackCount(unitId, Number(id))}
          />
        </Field>
        <Field label="TOP DRAWER INSERT">
          <ChipRow
            testid="drawers-insert"
            value={A.topInsertOf(top)}
            options={[
              { id: 'none', label: 'NONE' },
              { id: 'watches', label: 'WATCHES', reason: refusals.watches },
              { id: 'belts', label: 'BELTS', reason: refusals.belts },
              { id: 'shoes', label: 'SHOES', reason: refusals.shoes },
            ]}
            onPick={(id) => A.setTopInsert(unitId, id)}
          />
        </Field>
        <Field label="GLASS TOP">
          <ChipRow
            testid="drawers-glass"
            value={top?.watch_shelf_glass === true ? 'on' : 'off'}
            options={[{ id: 'off', label: 'OFF' }, { id: 'on', label: 'ON', reason: glassWhy }]}
            onPick={(id) => top && A.setGlassTop(unitId, top.id, id === 'on')}
          />
        </Field>
        <Field label="FRONT HEIGHTS">
          {fixed ? (
            <Said testid="drawers-fronts-fixed">{fixed}</Said>
          ) : (
            <NumberField
              outOfRange={REASONS.outOfRange}
              testid="drawers-front-height"
              min={b.front.min}
              max={b.front.max}
              standardAt={b.front.standard}
              value={Math.round(stack.drawers[0]?.height_mm ?? b.front.standard)}
              onCommit={(v) => A.setStackFronts(unitId, v)}
            />
          )}
        </Field>
        {word ? <Said testid="drawers-said">{word}</Said> : null}
        {/* T67 F8 · the list, by name. The explanation of a FITTED drawer is
            the drawer's own, and it is in its own detail, below. */}
        <DrawerList unitId={unitId} drawers={stack.drawers} />
      </div>
    );
  }

  // OVERLAY DRAWERS — from `OverlayMenu`. CLAUDE.md names this one: *"e.g.
  // OverlayMenu's HOW MANY chips"*. The stack is REBUILT rather than edited,
  // which is `addOverlayDrawers`' own shape and not a second law.
  if (row.id === 'overlay') {
    const { drawers, count } = A.overlayStack(unitId);
    return (
      <div className="pbi-interior-more">
        <Field label="HOW MANY" note={REASONS.overlayIsOutside}>
          <ChipRow
            testid="overlay-count"
            value={String(count)}
            options={Array.from({ length: b.maxCount }, (_, i) => ({ id: String(i + 1), label: String(i + 1) }))}
            onPick={(id) => A.setOverlayStackCount(unitId, Number(id))}
          />
        </Field>
        <Field label="FRONT HEIGHT">
          <NumberField
            outOfRange={REASONS.outOfRange}
            testid="overlay-front"
            min={b.front.min}
            max={b.front.max}
            standardAt={b.front.standard}
            value={A.overlayFrontHeight(unitId)}
            onCommit={(v) => A.setOverlayFronts(unitId, v)}
          />
        </Field>
        {/* T67 F8 · names, here too — an overlay stack is a stack. */}
        <DrawerList unitId={unitId} drawers={drawers} />
        <div className="pbi-duty-actions">
          <Button
            kind="secondary"
            size="small"
            data-testid="overlay-remove"
            onClick={() => { drawers.forEach((d) => A.removeElement(unitId, d.id)); }}
          >
            REMOVE
          </Button>
        </div>
      </div>
    );
  }

  // SHELVES — from `ShelfMenu`: the even ladder. One shelf's own height is the
  // docked editor's `position-y`, which is PRO's own field.
  if (row.id === 'shelves') {
    return (
      <div className="pbi-interior-more">
        <Field label="SPACING" note="Evenly, between whatever stands above and below them.">
          <div className="pbi-duty-actions">
            <Button
              kind="secondary"
              size="small"
              data-testid="shelf-centre"
              onClick={() => A.centreBay(unitId, null)}
            >
              SPACE THEM EVENLY
            </Button>
          </div>
        </Field>
      </div>
    );
  }

  // THE PULL-DOWN RAIL — from `PulldownMenu`. A bought mechanism: the engine
  // cuts no board for it, so it has no panel, no copied editor and no click.
  if (row.id === 'pulldown_rail') {
    const item = A.kitItem(unitId, 'pulldown_rail');
    const travel = item ? A.pulldownTravel(unitId, item.id) : null;
    if (!travel) return null;
    return (
      <div className="pbi-interior-more">
        <Field label="HOW FAR DOWN FROM THE TOP">
          <NumberField
            outOfRange={REASONS.outOfRange}
            testid="pulldown-drop"
            min={travel.min}
            max={travel.max}
            standardAt={travel.standard}
            value={travel.drop}
            onCommit={(v) => A.setPulldownDrop(unitId, item.id, v)}
          />
        </Field>
        <div className="pbi-duty-actions">
          <Button
            kind="secondary"
            size="small"
            data-testid="pulldown-remove"
            onClick={() => A.removeElement(unitId, item.id)}
          >
            REMOVE
          </Button>
        </div>
      </div>
    );
  }

  // THE TROUSER PULL-OUT AND THE TIE RACK — from `KitMenu`: the engine's own
  // sentence about a bought fitting, and the one act it allows.
  if (row.id === 'trouser' || row.id === 'tie_rack') {
    const item = A.kitItem(unitId, row.id);
    if (!item) return null;
    return (
      <div className="pbi-interior-more">
        <Said testid={`kit-${row.id}-said`}>{A.kitWords(row.id).said}</Said>
        <div className="pbi-duty-actions">
          <Button
            kind="secondary"
            size="small"
            data-testid={`kit-${row.id}-remove`}
            onClick={() => A.removeElement(unitId, item.id)}
          >
            REMOVE
          </Button>
        </div>
      </div>
    );
  }

  // THE SHOE DRAWER — from `ShoeMenu`: the ramp is fixed law and the honest
  // answer is a sentence, never a control that cannot act.
  if (row.id === 'shoe') {
    const law = A.shoeLaw();
    const words = A.shoeFitWords(unitId, A.selectionForMenu('shoe', unitId)?.item || null);
    return (
      <div className="pbi-interior-more">
        <div className="pbi-stack" data-testid="shoe-drawing"><ShoeDrawing lanes={law.lanes} /></div>
        <Said testid="shoe-law">{law.said}</Said>
        {words.map((w) => <Said key={w} testid="shoe-said">{w}</Said>)}
      </div>
    );
  }

  // A row with nothing re-homed onto it draws nothing — the counter above it
  // is the whole of what that row has to say.
  return null;
}

/**
 * WHICH ROW A SELECTION BELONGS TO — the dock knows the selection, and this
 * table is the same one INSIDE counts with (`adapter.INTERIOR_ROWS`), read by
 * the selection's own `menu`. A selection whose menu is on no row answers
 * null and the dock draws nothing extra, exactly as it did before tonight.
 */
export function rowForSelection(selection) {
  if (!selection?.menu) return null;
  return A.INTERIOR_ROWS.find((row) => row.menu === selection.menu) || null;
}
