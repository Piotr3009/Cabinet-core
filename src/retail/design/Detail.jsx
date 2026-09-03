import { useUiStore } from '../../stores/uiStore.js';
import * as A from './adapter.js';
import { menuFor } from './detail/index.jsx';

// ─── 7 · THE DETAIL — A PANEL THAT SLIDES IN OVER THE STAGE ────────────────
//
// T60 F3's law, unchanged: *"numer 7 to już musi być detalistyczne menu — jak
// naciśniemy na drzwi to się pojawi drzwi, jak na szafę to na szafę, jak na
// półkę to półkę."* This file holds the ROUTER; the thirteen menus live in
// `design/detail/`, one file each, and not one of them imports a store or an
// engine module — each asks `adapter.js`, which is the only place retail
// speaks engine.
//
// ─── T64 F4 · IT IS NO LONGER A COLUMN ─────────────────────────────────────
//
// The owner chose layout B: *"zróbmy wariant B."* Column 7 is a PANEL now —
// it slides in from the right OVER the stage when an element is clicked (or
// a row's `›` is pressed) and slides out on DONE or on a click on the empty
// stage. It carries the same content it carried as a column: the element
// menus, the copied editors' entries. Width ≈ 360px at 1440 — the token
// `--pbi-col-detail`. Draggable is not required for the slide panel; the
// modals opened from it keep the house rule (draggable, beside the click).
//
// ─── T64 F5 · …AND THE ESTIMATE DUTY LEFT THIS SCREEN ──────────────────────
//
// T59's second duty — the estimate's rows, ADD ANOTHER, REQUEST A QUOTE,
// SAVE / LOAD — is its own page now (`estimate/EstimatePage.jsx`, modelled on
// PSW's `EstimatesPage.jsx`). One duty, one panel, closed when there is
// nothing selected: an empty panel over the stage is the placeholder T60
// deleted, back by another road.
//
// ─── THE DELETED PLACEHOLDER (T60) ─────────────────────────────────────────
//
// `MENU_COMPONENTS` is a table; a kind that is not a key in it has no menu,
// `adapter.resolveSelection` therefore answers null, and `DesignRoom` clears
// the selection rather than rendering anything. There is nowhere for the
// sentence "No options for this element yet" to come back, because there is
// no branch left for it to live in.

export default function Detail(props) {
  const { selection } = props;
  const clear = () => { props.onSelect(null); useUiStore.getState().clearElement?.(); };
  const Menu = selection ? menuFor(selection.menu) : null;

  return (
    <aside
      className="pbi-detail"
      data-testid="column-detail"
      data-open={Menu ? 'yes' : 'no'}
      data-duty={Menu ? 'detail' : 'closed'}
      data-menu={Menu ? selection.menu : ''}
      aria-hidden={Menu ? undefined : 'true'}
    >
      {Menu ? (
        <Menu
          unitId={selection.unitId}
          // ─── T61 F3 · THE SELECTION'S OWN UNIT ───────────────────────────
          // Not the OPTIONS column's. They were the same unit while there was
          // one wardrobe; a TOP BOX is a unit of its own, and a menu opened on
          // it was reading and writing the cabinet underneath it.
          unit={A.unitById(selection.unitId) || props.unit}
          project={props.project}
          panel={selection.panel}
          item={selection.item}
          designName={props.designName}
          onRename={props.onDesignName}
          onBack={clear}
          onDone={clear}
          onRemoved={clear}
        />
      ) : null}
    </aside>
  );
}
