import { useEffect } from 'react';
import { useUiStore } from '../../stores/uiStore.js';
import { useProjectStore } from '../../stores/projectStore.js';
import * as A from './adapter.js';
import { Button } from './controls.jsx';
import Editors from './Editors.jsx';
import ElementProperties from './detail/ElementProperties.jsx';
import { DOCK_MODALS, dockFor } from './detail/docked.jsx';
import ReHomed, { rowForSelection } from './detail/ReHomed.jsx';

// ─── 7 · THE DETAIL — A PANEL THAT SLIDES IN OVER THE STAGE ────────────────
//
// T60 F3's law, unchanged: *"numer 7 to już musi być detalistyczne menu — jak
// naciśniemy na drzwi to się pojawi drzwi, jak na szafę to na szafę, jak na
// półkę to półkę."*
//
// ─── T64 F4 · IT IS NO LONGER A COLUMN ─────────────────────────────────────
//
// The owner chose layout B: *"zróbmy wariant B."* Column 7 is a PANEL now —
// it slides in from the right OVER the stage when an element is clicked and
// slides out on CLOSE or on a click on the carcass or the empty stage. Width
// ≈ 360px at 1440 — the token `--pbi-col-detail`.
//
// ─── T66 F3 · …AND EXACTLY ONE EDITOR LIVES IN IT ──────────────────────────
//
// The owner, on the screenshot where a floating `ElementProperties` window and
// this docked panel showed the same drawer at once:
//
//   *"w zasadzie po prawej powinien być tylko menu edycji."*
//
// So this file is no longer a ROUTER OVER THIRTEEN THIN MENUS retail wrote. It
// is a DOCK, and what it docks is the COPIED PRO EDITOR for whatever was
// clicked (`detail/docked.jsx` is the table). The thin menus are deleted, the
// floating element window is gone, and there is ONE surface on which a
// selected element is edited.
//
// TWO SHAPES, because PRO's own editors have two — see `detail/docked.jsx`:
//
//   a copied WINDOW reads its subject off the shared ui store's `modalArgs`,
//   so the dock WRITES that slot (with no anchor — the panel is the place) and
//   `Editors.jsx` renders it here, inside the aside, rather than at the room's
//   level. `Editors` is given `where`, so a name is drawn in exactly one of
//   the two places and never in both.
//
//   a copied PANEL takes its subject as props, and `ElementProperties` — PRO's
//   own piece panel, the very surface the floating window was showing — is
//   rendered straight into the slot.
//
// THE WORKSHOP FIELDS ARE HIDDEN, NOT CUT: through PRO's own `omit` prop where
// retail is the caller (`docked.omitted`), and through the room's own
// stylesheet inside a copied window where it is not. One flag either way,
// `RETAIL_SHOW_WORKSHOP_TOOLS`.
//
// ─── THE DELETED PLACEHOLDER (T60) STAYS DELETED ───────────────────────────
//
// `dockFor` is a table; a selection it has no entry for answers null, and
// `adapter.MENU_FOR_KIND` no longer maps a carcass kind to anything at all —
// so a click on a side, a top, a plinth or the empty stage CLEARS the
// selection and the panel slides out. There is nowhere for "No options for
// this element yet" to come back to, because there is no branch left for it.

export default function Detail(props) {
  const { selection } = props;
  const units = useProjectStore((s) => s.units);
  const route = selection ? dockFor(selection) : null;
  const unit = A.unitById(selection?.unitId) || props.unit || null;
  // ─── T69 F8 · THE DOOR THIS DOCK IS STANDING ON, IF IT IS A DOOR ────────
  // The panel is the subject: `dockFor` has already resolved it, and the swing
  // row asks the ADAPTER — never the panel object — which way it hangs and
  // whether the engine has taken the choice away.
  const swingPanel = route?.props?.panel || route?.args?.panel || null;
  const swing = swingPanel && A.isDoorPanel(swingPanel) && selection?.unitId
    ? { ...A.doorHinge(selection.unitId, swingPanel), panel: swingPanel }
    : null;

  // CLOSE, a removal, a carcass click: the panel slides OUT — so the WHOLE
  // selection goes (the scene's own `clearSelection`, as a click on the empty
  // stage), and the shared modal slot with it if the dock is what filled it.
  const clear = () => {
    props.onSelect(null);
    const ui = useUiStore.getState();
    if (DOCK_MODALS.includes(ui.modal)) ui.closeModal();
    ui.clearSelection?.();
  };

  // ─── THE COPIED WINDOW'S SUBJECT ─────────────────────────────────────────
  //
  // A copy reads `modalArgs`, so the dock writes it. NO ANCHOR is passed: rule
  // 15 places a window beside the object it is about, and a docked panel is
  // not placed at all — it stands where the owner put it.
  //
  // The effect follows the SELECTION and nothing else, which is what lets a
  // copy re-point itself from inside (`DoorModal`'s split-segment tabs call
  // `openModal('element', …)` on the sibling leaf) without this writing the
  // old panel straight back over it.
  const name = route?.modal || '';
  const args = route?.args || null;
  const key = args ? JSON.stringify(args) : '';
  // …and the slot is WATCHED, not written once. A copy may close itself — the
  // Escape key on `WatchLayoutModal`, the × on a window whose header the dock
  // hides — and a panel standing open around an editor that has shut itself is
  // the empty panel by yet another road. So the dock re-asserts its own name
  // whenever the slot stops holding it, and leaves the ARGS alone: `DoorModal`
  // re-points itself at a sibling split segment through this very slot, and
  // that is its business, not the dock's.
  const modal = useUiStore((s) => s.modal);
  useEffect(() => {
    const ui = useUiStore.getState();
    if (name) { if (ui.modal !== name) ui.openModal(name, args); return; }
    if (DOCK_MODALS.includes(ui.modal)) ui.closeModal();
    // `args` is `key`'s own content; `key` is in the list so a re-point runs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, key, modal]);

  const open = Boolean(route);

  return (
    <aside
      className="pbi-detail"
      data-testid="column-detail"
      data-open={open ? 'yes' : 'no'}
      data-duty={open ? 'detail' : 'closed'}
      data-menu={open ? selection.menu : ''}
      data-editor={open ? (route.modal || 'element-properties') : ''}
      aria-hidden={open ? undefined : 'true'}
    >
      {open ? (
        <div className="pbi-dock" data-testid="detail-dock">
          {/* ONE HEADER, because there is one editor. The copied window's own
              header is hidden inside the dock by the room's stylesheet — a
              docked panel has nothing to drag and nowhere to be placed — and
              this is the × in its place, in the room's own voice. */}
          <div className="pbi-dock-head">
            <span className="pbi-ui pbi-ui-light pbi-quiet pbi-dock-name" data-testid="detail-name">
              {A.selectionName(selection).toUpperCase()}
            </span>
            <Button kind="link" data-testid="detail-close" onClick={clear}>CLOSE ×</Button>
          </div>

          {/* ─── T67 F7 · THE STACK-WIDE CONTROLS, ON THE RIGHT ──────────
              The owner: *"te funkcje niech przejdą na prawą stronę."*  HOW
              MANY, TOP DRAWER INSERT, GLASS TOP and FRONT HEIGHTS are about
              the STACK the clicked piece belongs to, not about that one
              piece, so they stand ABOVE the piece's own editor and below the
              one header — which is the order a person reads them in: what is
              this row, then which of them am I changing. `ReHomed` is T66's
              component, moved whole; the selection names its row. */}
          {rowForSelection(selection) && selection?.unitId ? (
            <div data-testid="dock-rehomed">
              <ReHomed row={rowForSelection(selection)} unitId={selection.unitId} />
            </div>
          ) : null}

          {/* ─── T69 F8 · THE SWING COMES BACK TO THE DOOR'S DOCK ───────────
              *"Door swing L/R returns to the door's dock — it left with the
              hinge block in T68 F6; the swing is the CLIENT's choice, the
              hinge model stays hidden."*

              T68 F6 hid TWO blocks of the copied `DoorModal` from the client —
              the hinge PICKER and the hinge HEIGHT ROWS — and the owner was
              right about both: *"wybór hinges to nie jest dobry pomysł, nie
              tutaj."*  Which way the door OPENS went with them, and it is not
              the same question at all: it is the first thing anyone asks about
              a door in a corner, and it has nothing to do with which hinge the
              workshop screws on.

              SO IT STANDS HERE, in retail's own dock file, and NOT inside the
              copy: `DoorModal.jsx` is held to PRO's own line count, element
              count and every one of PRO's lines (`turn63-the-copies`), and a
              row written into it would fail all three. The call is
              `adapter.setDoorHinge` — the SAME store path PRO's own control
              presses — so the hinge model stays hidden and one law decides the
              hand.

              And when the ENGINE has decided the hand (a rake forces it —
              T46/T55), the row says so and does not pretend to offer a choice:
              `doorHinge().forced` is the engine's own flag, read and never
              re-derived. */}
          {swing ? (
            <div className="pbi-dock-swing" data-testid="dock-door-swing">
              <span className="pbi-ui pbi-ui-light pbi-quiet">DOOR SWING</span>
              <div className="pbi-duty-actions">
                <div className="pbi-opening-list" data-testid="dock-swing-row">
                  {[['L', 'HINGES LEFT'], ['R', 'HINGES RIGHT']].map(([hand, label]) => (
                    <button
                      key={hand}
                      type="button"
                      className={`pbi-opening-row${swing.hand === hand ? ' is-on' : ''}`}
                      data-testid={`dock-swing-${hand}`}
                      data-on={swing.hand === hand ? 'yes' : 'no'}
                      aria-pressed={swing.hand === hand}
                      disabled={swing.forced}
                      title={swing.reason || label}
                      onClick={() => A.setDoorHinge(selection.unitId, route.props?.panel || swing.panel, hand)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {swing.reason ? (
                  <span className="pbi-chip-reason" data-testid="dock-swing-reason">{swing.reason}</span>
                ) : null}
              </div>
            </div>
          ) : null}

          {/* THE COPIED PANEL — PRO's own piece window, on the piece. */}
          {route.props && unit ? (
            <ElementProperties
              unit={unit}
              panel={route.props.panel}
              item={route.props.item}
              omit={route.props.omit}
              actions
              compact
              // `units` is read above so this re-renders on every engine
              // recompute: PRO's panel takes a PANEL, and a panel object is
              // replaced whole every time the cabinet is computed again.
              key={`${route.props.panel.id}:${units.length}`}
            />
          ) : null}

          {/* THE COPIED WINDOW — rendered HERE and nowhere else. */}
          {route.modal ? <Editors where="dock" /> : null}
        </div>
      ) : null}
    </aside>
  );
}
