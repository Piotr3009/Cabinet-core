import { Button, ChipRow, Field } from '../controls.jsx';
import * as A from '../adapter.js';

// ─── TURN 72 · F1 — THE END PANEL'S MENU, AND IT SAYS TWO THINGS ───────────
//
// The owner, 22.09.2026, on the board he had double-clicked all afternoon:
//
//   *"jak kliknę 2 razy na panel boczny po prawej nie pokazuje mi się menu
//   panelu"*
//
// …and then, on the approved mock-up (board 1, "Makiety menu i wymiarów"):
//
//   *"panel: up to ceiling; drugi równo z carcasem od dołu; a default do
//   ziemi; reszta ok."*
//
// `verify/t72/f1-probe.md` is why nothing opened, found and committed before
// this file existed: `adapter.MENU_FOR_KIND` carried no `end-panel` key, so the
// selection resolved to null and the dock was never asked. That key is back;
// this is the menu it opens.
//
// ─── WHY THIS IS RETAIL'S OWN BLOCK AND NOT A COPIED PRO PANEL ─────────────
//
// PRO's own end-panel fields are FOUR NUMBERS (`end-panel-height`,
// `thickness-ep`, `above-unit-ep`, `below-unit-ep`) and F1 is explicit:
// *"No number fields in retail. … PRO keeps its numeric fields."*  A copy may
// not be edited (*"kopiuj — nie kasuj"*) and PRO may not lose its fields, so
// the client's answer is three CHIP ROWS standing where the copy would — the
// same shape T69 F8 gave DOOR SWING, in this same dock, for this same reason.
//
// ─── AND NOT ONE NEW LAW ───────────────────────────────────────────────────
//
// Every chip presses a store path that already existed and that PRO's own
// field presses today. They are named one by one in `adapter.endPanelMenu`'s
// header, they were READ before they were used, and this file contains no
// arithmetic at all: it asks the adapter what the panel says and hands back
// which chip was pressed.

/** The three rows and the way out, for one selected END-PANEL. */
export default function EndPanel({ unitId, panel }) {
  const menu = A.endPanelMenu(unitId, panel);
  if (!menu) return null;

  return (
    <div className="pbi-interior-more" data-testid="dock-end-panel" data-end-panel={menu.id}>
      {/* TOP — *"panel: up to ceiling"*. `Carcass` is the panel flush with the
          box; `Ceiling` runs it to whatever is over this piece, which is the
          room's own question and the store's own answer. */}
      <Field label="TOP">
        <ChipRow
          testid="end-panel-top"
          value={menu.top}
          options={[
            { id: 'carcass', label: 'CARCASS', title: 'Flush with the top of the wardrobe' },
            { id: 'ceiling', label: 'CEILING', title: 'All the way up to the ceiling over this piece' },
          ]}
          onPick={(id) => A.setEndPanelTopChip(unitId, panel, id)}
        />
      </Field>

      {/* BOTTOM — *"drugi równo z carcasem od dołu; a default do ziemi"*. The
          default is FLOOR and it is the engine's, not this file's: a standing
          unit with nothing said runs its panel down over the legs
          (`engine/autoparts.js endPanelDrop`). */}
      <Field label="BOTTOM">
        <ChipRow
          testid="end-panel-bottom"
          value={menu.bottom}
          options={[
            { id: 'carcass', label: 'CARCASS', title: 'Flush with the bottom of the wardrobe' },
            { id: 'floor', label: 'FLOOR', title: 'Down to the floor, past the legs — the standard answer' },
          ]}
          onPick={(id) => A.setEndPanelBottomChip(unitId, panel, id)}
        />
      </Field>

      {/* COLOUR — the project's own run-piece switch, ON by default since T16.
          `Other` puts the panel on its own board, which is the board the cut
          list already names for `run:end_panel`. */}
      <Field label="COLOUR">
        <ChipRow
          testid="end-panel-colour"
          value={menu.colour}
          options={[
            { id: 'fronts', label: 'AS THE FRONTS', title: 'The same board and the same finish as the doors' },
            { id: 'other', label: 'OTHER', title: 'A board of its own — named in the estimate' },
          ]}
          onPick={(id) => A.setEndPanelColourChip(unitId, panel, id)}
        />
      </Field>

      <div className="pbi-duty-actions">
        <Button
          kind="secondary"
          size="small"
          data-testid="end-panel-remove"
          onClick={() => A.removeEndPanelChip(unitId, panel)}
        >
          REMOVE PANEL
        </Button>
      </div>
    </div>
  );
}
