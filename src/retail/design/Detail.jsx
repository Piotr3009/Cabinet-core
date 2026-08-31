import { useUiStore } from '../../stores/uiStore.js';
import Button from '../ui/Button.jsx';
import Duty from './detail/Duty.jsx';
import { menuFor } from './detail/index.jsx';
import { PRICE_ON_REQUEST } from '../config.js';
import { designSummaryLine } from '../estimate/document.js';

// ─── COLUMN 7 — TWO DUTIES, AND NOW NINE MENUS ─────────────────────────────
//
// t59's law, unchanged: *"By default: the ESTIMATE … When an element is
// selected, the column becomes that element's DETAIL with '‹ BACK TO ESTIMATE'
// at the top; DONE returns to the estimate."* One column, two duties, never
// both — a detail panel that appears BESIDE the estimate is the accordion the
// owner refused, one column to the right.
//
// T60 F3 is what fills the second duty. The owner:
//
//   *"numer 7 to już musi być detalistyczne menu — jak naciśniemy na drzwi to
//   się pojawi drzwi, jak na szafę to na szafę, jak na półkę to półkę."*
//
// So this file no longer holds a single control. It holds the ROUTER and the
// estimate; the nine menus live in `design/detail/`, one file each, and not one
// of them imports a store or an engine module — each asks `adapter.js`, which
// is the only place retail speaks engine.
//
// ─── THE DELETED PLACEHOLDER ───────────────────────────────────────────────
//
// t59 ended this file with an `UnknownDetail` whose whole content was the
// sentence "No options for this element yet." CLAUDE.md licenses its deletion
// by name — and deletes the DEFAULT BRANCH with it, which is the half that
// matters. `MENU_COMPONENTS` is a table; a kind that is not a key in it has no
// menu, `adapter.resolveSelection` therefore answers null, and `DesignRoom`
// clears the selection rather than rendering anything. There is nowhere for the
// sentence to come back in another wording, because there is no branch left for
// it to live in.

/* ─── THE ESTIMATE DUTY (F6) ──────────────────────────────────────────────── */
function EstimateDuty({
  designs, activeId, onSelect, onRename, onAdd, onQuote, onSave, onLoad,
}) {
  return (
    <Duty title="YOUR ESTIMATE">
      <div className="pbi-est-list">
        {designs.map((d, i) => {
          const on = d.id === activeId;
          return (
            <div key={d.id}>
              {/* ─── F6 · SELECTING A ROW PUTS THAT DESIGN ON THE STAGE ────
                  The estimate store's own `select` captures what is on the
                  stage before it swaps, so a client comparing two wardrobes
                  loses nothing on the way between them. */}
              <button
                type="button"
                className={`pbi-est-row${on ? ' is-on' : ''}`}
                data-testid={`estimate-row-${i + 1}`}
                aria-current={on ? 'true' : undefined}
                onClick={() => onSelect(d.id)}
              >
                <span className="pbi-ui pbi-ui-light pbi-quiet pbi-est-row-index">
                  {`${i + 1}`}
                </span>
                <span className="pbi-display pbi-h4 pbi-est-row-name">{d.name}</span>
                <span className="pbi-choice pbi-est-row-choices">{designSummaryLine(d.snapshot)}</span>
                <span className="pbi-display pbi-est-row-price">{PRICE_ON_REQUEST}</span>
              </button>
              {/* …and its NAME is the client's to change, on the row itself
                  (F6). The same name the STAGE HINT says (F4). */}
              {on ? (
                <input
                  className="pbi-field pbi-est-rename"
                  data-testid={`estimate-rename-${i + 1}`}
                  aria-label="Name this design"
                  value={d.name}
                  onChange={(e) => onRename(d.id, e.target.value)}
                />
              ) : null}
            </div>
          );
        })}
      </div>

      <button type="button" className="pbi-link" data-testid="add-another" onClick={onAdd}>
        + ADD ANOTHER WARDROBE
      </button>

      <div className="pbi-duty-actions">
        <Button onClick={onQuote} data-testid="detail-quote">REQUEST A QUOTE</Button>
        <Button kind="secondary" onClick={onSave} data-testid="detail-save">SAVE ESTIMATE</Button>
        <label className="pbi-link pbi-link-file">
          LOAD AN ESTIMATE
          <input
            type="file"
            accept="application/json,.json"
            hidden
            data-testid="detail-load"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onLoad(f); }}
          />
        </label>
      </div>
    </Duty>
  );
}

export default function Detail(props) {
  const { selection } = props;
  const clear = () => { props.onSelect(null); useUiStore.getState().clearElement?.(); };
  const Menu = selection ? menuFor(selection.menu) : null;

  return (
    <aside
      className="pbi-detail"
      data-testid="column-detail"
      data-duty={Menu ? 'detail' : 'estimate'}
      data-menu={Menu ? selection.menu : ''}
    >
      {Menu ? (
        <Menu
          unitId={selection.unitId}
          unit={props.unit}
          project={props.project}
          panel={selection.panel}
          item={selection.item}
          designName={props.designName}
          onRename={props.onDesignName}
          onBack={clear}
          onDone={clear}
          onRemoved={clear}
        />
      ) : (
        <EstimateDuty
          designs={props.designs}
          activeId={props.activeId}
          onSelect={props.onSelectDesign}
          onRename={props.onRenameDesign}
          onAdd={props.onAdd}
          onQuote={props.onQuote}
          onSave={props.onSave}
          onLoad={props.onLoad}
        />
      )}
    </aside>
  );
}
