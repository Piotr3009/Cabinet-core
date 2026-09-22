import { useMemo } from 'react';
import Modal from './Modal.jsx';
import { useUiStore } from '../stores/uiStore.js';
import { useProjectStore } from '../stores/projectStore.js';
import { useCabinetProfileStore } from '../stores/cabinetProfileStore.js';
import { formatMm } from '../engine/format.js';
import {
  WATCH_FELT_COLOURS, WATCH_FINISHES, WATCH_LAYOUTS,
  watchDrawerLayout, watchFeltOf, watchFinishOf, watchLayoutOf,
} from '../engine/watchDrawer.js';
import NumberField from './NumberField.jsx';

// ─── THE WATCH DRAWER'S OWN WINDOW (turn 53, CLAUDE.md F8e) ─────────────────
//
// The owner, 27.08.2026:
//
//   *"i dodajesz do opcji kilka zaproponowanych i zaprojektowanych układów na
//   te zegarki i krawaty i paski — otwiera się nowy modal z 4 propozycjami
//   rozmieszczenia."*  …and: *"i wybierasz finish: spray (jak finish
//   wszystkiego), czy oak, walnut."*
//
// So: a NEW window, DRAGGABLE, opening BESIDE the drawer that was clicked (the
// house rule, and `anchor` is how every other window in this app keeps it).
// Four cards, each a small TOP-VIEW schematic of the tray — drawn from the very
// layout the engine will build, so a card cannot promise a tray the machine
// does not cut.
//
// ─── ALL FOUR KEEP THE HARD LAW ────────────────────────────────────────────
//
// ONE pocket row, at the FRONT — *"the back row cannot be reached once the
// drawer is in"* (T52, unrepealed). What varies is the REAR FIELD, and the
// cards show exactly that: the front row is identical on all four.
//
// The GLASS and the FINISH live here too, because they are the same decision
// taken at the same moment, and because F8d's *"disabled with a reason"* wants
// somewhere to put the reason.

/** One card's schematic, drawn from the engine's own answer for this tray. */
function Schematic({ layout, clear, profile }) {
  const L = useMemo(
    () => (clear ? watchDrawerLayout(clear, profile, { layout: layout.id }) : null),
    [clear, profile, layout.id],
  );
  // No tray to draw (a drawer that refuses the insert) — the card still shows
  // WHAT THE LAYOUT IS, because the joiner is choosing a design and not a size.
  const inner = L?.inner || { w: 500, d: 400 };
  const pockets = L?.pockets || { count: 5, depth: 110 };
  const field = L?.sections || { count: 4, lanes: 1, backStrip: false, depth: 250 };
  const t = L?.spec?.dividerT ?? 9;

  const W = 100;
  const H = 76;
  const sx = W / (inner.w || 1);
  const sy = H / (inner.d || 1);
  const rowH = Math.max(6, pockets.depth * sy);
  const cells = [];
  // The FRONT pocket row — the same in all four, and drawn at the FRONT
  // (the bottom of a top view, which is the way a joiner looks into a drawer).
  for (let i = 0; i < pockets.count; i += 1) {
    const w = (W - (pockets.count - 1) * t * sx) / pockets.count;
    cells.push({
      key: `p${i}`, x: i * (w + t * sx), y: H - rowH, w, h: rowH, kind: 'pocket',
    });
  }
  // …and the REAR FIELD, lane by lane, which is what the layout decides.
  const fieldH = H - rowH - t * sy;
  const laneH = (fieldH - (field.lanes - 1) * t * sy) / Math.max(1, field.lanes);
  for (let lane = 0; lane < field.lanes; lane += 1) {
    const y = lane * (laneH + t * sy);
    const back = field.backStrip && lane === field.lanes - 1;
    const n = back ? 1 : Math.max(1, field.count);
    for (let i = 0; i < n; i += 1) {
      const w = (W - (n - 1) * t * sx) / n;
      cells.push({
        key: `s${lane}-${i}`, x: i * (w + t * sx), y, w, h: Math.max(3, laneH), kind: back ? 'strip' : 'cell',
      });
    }
  }
  return (
    <svg viewBox={`-2 -2 ${W + 4} ${H + 4}`} className="w-full" role="img" aria-label={layout.label}>
      <rect x="-2" y="-2" width={W + 4} height={H + 4} rx="2" className="fill-shell-900 stroke-shell-700" strokeWidth="1" />
      {cells.map((c) => (
        <rect
          key={c.key}
          x={c.x}
          y={c.y}
          width={Math.max(1, c.w)}
          height={Math.max(1, c.h)}
          rx="1"
          className={c.kind === 'pocket' ? 'fill-gold/25 stroke-gold/70' : 'fill-shell-800 stroke-ink-500'}
          strokeWidth="0.8"
        />
      ))}
    </svg>
  );
}

export default function WatchLayoutModal() {
  const args = useUiStore((s) => s.modalArgs);
  const closeModal = useUiStore((s) => s.closeModal);
  const notify = useUiStore((s) => s.notify);
  const units = useProjectStore((s) => s.units);
  const P = useCabinetProfileStore((s) => s.profile);
  const unitResult = useProjectStore((s) => s.unitResult);
  const setWatchLayout = useProjectStore((s) => s.setWatchLayout);
  const setWatchFinish = useProjectStore((s) => s.setWatchFinish);
  const setWatchShelfGlass = useProjectStore((s) => s.setWatchShelfGlass);
  // T72 F9 · which felt, and this drawer's own height.
  const setWatchFelt = useProjectStore((s) => s.setWatchFelt);
  const setDrawerHeight = useProjectStore((s) => s.setDrawerHeight);
  const watchShelfAbove = useProjectStore((s) => s.watchShelfAbove);

  const anchor = useMemo(() => args?.anchor || null, [args]);
  const unit = units.find((u) => u.id === args?.unitId) || null;
  const item = useMemo(() => {
    if (!unit || !args?.itemId) return null;
    return (unit.params.sections?.[0]?.items || []).find((i) => i.id === args.itemId) || null;
  }, [unit, args?.itemId]);

  if (!unit || !item) return null;

  const zone = item.zone != null && Number.isFinite(Number(item.zone))
    ? Math.trunc(Number(item.zone)) : null;
  const result = unitResult(unit.id);
  const built = (result?.assemblies?.watchInserts || [])
    .find((w) => Number(w.drawer) === Number(item.index) && (w.zone ?? null) === zone) || null;
  const chosen = watchLayoutOf(item);
  const finish = watchFinishOf(item);
  const felt = watchFeltOf(item);
  // F8d: the option is DISABLED WITH A REASON, never silently hidden.
  const shelf = watchShelfAbove(unit.id, Number(item.index), zone);
  const glassOn = item.watch_shelf_glass === true;
  // T72 F9 · THE PROPOSAL IS THE DRAWER'S OWN CURRENT HEIGHT, read off the
  // item the same way `setDrawerHeight` writes it — so the chip, the field and
  // the piece panel's `drawer-height` row are three readings of one number and
  // cannot disagree. A drawer the kit has not given its own height yet reads
  // the workshop's standard, which is what it will be cut at.
  const proposed = Math.round(Number(item.height_mm) > 0
    ? Number(item.height_mm)
    : P.wardrobe.drawers.frontHeight);

  // The tray the cards are drawn from — the engine's own interior, so a card
  // shows this drawer and not a picture of some drawer.
  const clear = useMemo(() => {
    if (!result) return null;
    const mine = result.panels.filter((p) => (p.meta?.zone ?? null) === zone);
    const sides = mine.filter((p) => p.part === 'DRAWER-SIDE'
      && Number(p.meta?.drawer) === Number(item.index)).sort((a, b) => a.box.x - b.box.x);
    const front = mine.find((p) => p.part === 'DRAWER-BOX-FRONT' && Number(p.meta?.drawer) === Number(item.index));
    const back = mine.find((p) => p.part === 'DRAWER-BOX-BACK' && Number(p.meta?.drawer) === Number(item.index));
    const bottom = mine.find((p) => p.part === 'DRAWER-BOTTOM' && Number(p.meta?.drawer) === Number(item.index));
    if (sides.length < 2 || !front || !back || !bottom) return null;
    const [l, r] = [sides[0], sides[sides.length - 1]];
    return {
      width: r.box.x - (l.box.x + l.box.w),
      depth: front.box.z - (back.box.z + back.box.d),
      height: (l.box.y + l.box.h) - (bottom.box.y + bottom.box.h),
    };
  }, [result, zone, item.index]);

  // ─── T67 F9 · THE NAME ON THE WINDOW ──────────────────────────────────
  // The owner: *"watches szuflad jest bez sensu … tam będzie watches, belts,
  // ties, cufflinks, biżuteria"*, and *"zmień w PRO też tę nazwę."*  The
  // LABEL below, and nothing else on the line: `WATCH_LAYOUTS`, `watch_drawer`
  // and every insert name are the engine's and stand exactly as they are.
  return (
    <Modal
      name="watch-layout"
      title={`${unit.params.unit_num} · Accessories drawer ${item.index} · Layout`}
      onClose={closeModal}
      anchor={anchor}
      width="w-[520px]"
    >
      <div className="space-y-3" data-watch-layout-modal={item.id}>
        <p className="text-[11px] text-ink-400">
          Every layout keeps ONE pocket row, at the front — the back row cannot be reached
          once the drawer is in. What changes is the field behind it.
        </p>

        <div className="grid grid-cols-2 gap-2">
          {WATCH_LAYOUTS.map((l) => (
            <button
              key={l.id}
              type="button"
              data-watch-layout={l.id}
              aria-pressed={chosen.id === l.id}
              className={`rounded border p-2 text-left ${chosen.id === l.id
                ? 'border-gold bg-shell-800'
                : 'border-shell-700 hover:border-ink-500'}`}
              onClick={() => {
                setWatchLayout(unit.id, item.id, l.id);
                notify(`${l.label} — ${l.hint}`, 'ok');
              }}
            >
              <Schematic layout={l} clear={clear} profile={P} />
              <div className="mt-1 text-sm text-ink-100">{l.label}</div>
              <div className="text-[10px] leading-tight text-ink-400">{l.hint}</div>
            </button>
          ))}
        </div>

        {/* ─── THE GLASS, IN THE SHELF ABOVE (F8b/F8d) ───────────────────
            ─── TURN 72 (CLAUDE.md F9): GLASS ON TOP · `Off` | `On` ─────────

            The owner, 22.09.2026, of the accessories drawer's own menu:
            *"w nim powinien być przycisk GLASS ON TOP (zmniejsz moc światła o
            połowę, powinno tylko tam świecić)."*

            TWO CHIPS where a checkbox stood — the same two states, the same
            store path (`setWatchShelfGlass`), the same F8d refusal with its
            reason on it. What changes is that the answer reads as an ANSWER
            rather than as a box somebody may or may not have ticked, which is
            the shape every other two-state question in this app now wears.

            THE HALF-POWER is the engine's and not this window's: the strip the
            glass births carries `power: 0.5` (`engine/cabinet.js`), and
            `3d/LedStrips.jsx` multiplies its lamp by it — under T67 F10's
            standing cap, so the two orders compose. */}
        <div className="cc-row text-sm">
          <span className="flex-1 text-ink-100">
            Glass on top
            <span className="block text-[10px] text-ink-400">
              Cut in the shelf above, {formatMm(50)} mm in from every edge, flush with its top.
              With it on, the light over this drawer runs at half power and lights this drawer alone.
            </span>
          </span>
          <div className="flex gap-1" data-watch-glass="1">
            {[['off', 'Off', false], ['on', 'On', true]].map(([id, label, on]) => (
              <button
                key={id}
                type="button"
                data-watch-glass-chip={id}
                aria-pressed={glassOn === on}
                disabled={!shelf && on}
                className={`cc-btn px-2 py-0.5 text-[11px] ${glassOn === on ? 'cc-btn-gold' : ''}`}
                title={shelf || !on
                  ? 'The opening is cut in the shelf above, with the LED ringing it underneath.'
                  : 'Needs a shelf directly above'}
                onClick={() => setWatchShelfGlass(unit.id, item.id, on)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {!shelf ? (
          <p className="text-[11px] text-status-warn" data-watch-glass-why="1">
            Needs a shelf directly above — add one and the opening is cut in it.
          </p>
        ) : null}

        {/* ─── TURN 72 (CLAUDE.md F9): DRAWER HEIGHT ─────────────────────
            The owner: *"powinien mieć wysokość szuflady zaproponowaną, ten co
            jest default."*

            A NUMBER FIELD plus ONE CHIP carrying the drawer's CURRENT height —
            which IS the proposal, because it is what the kit gave this drawer
            and it is the default until a hand types over it. The chip is
            therefore never a second number: it reads the same
            `drawerHeightValue` the field does, and pressing it writes what it
            says.

            ONE STORE PATH, and it is PRO's own: `setDrawerHeight(unit.id,
            item.id, mm)` carries the owner's clamp (the profile's min and max
            front height) and re-deals what is left to the drawers nobody has
            touched. Nothing about the stack is re-derived here. */}
        <div className="cc-row text-sm">
          <span className="flex-1 text-ink-100">Drawer height</span>
          <button
            type="button"
            className="cc-btn px-2 py-0.5 text-[11px]"
            data-watch-height-proposed={proposed}
            title="The height this drawer already has — the proposal, until it is typed over."
            onClick={() => setDrawerHeight(unit.id, item.id, proposed)}
          >
            Proposed {proposed}
          </button>
          <NumberField
            className="cc-input w-20 text-right"
            data-watch-height="1"
            min={P.wardrobe.drawers.minFrontHeight}
            max={P.wardrobe.drawers.maxFrontHeight}
            value={proposed}
            title="This drawer's own front height, in mm. The stack re-deals what is left."
            onCommit={(v) => setDrawerHeight(unit.id, item.id, v)}
          />
        </div>

        {/* ─── THE FINISH (F8f) ────────────────────────────────────────── */}
        <div className="cc-row text-sm">
          <span className="flex-1 text-ink-100">Finish</span>
          <div className="flex gap-1">
            {[{ id: null, label: 'Project' }, ...WATCH_FINISHES].map((f) => (
              <button
                key={f.id || 'project'}
                type="button"
                data-watch-finish={f.id || 'project'}
                aria-pressed={finish === f.id}
                className={`cc-btn px-2 py-0.5 text-[11px] ${finish === f.id ? 'cc-btn-gold' : ''}`}
                title={f.hint || 'The project’s own decor, which is what the frame has always taken.'}
                onClick={() => setWatchFinish(unit.id, item.id, f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* ─── TURN 72 (CLAUDE.md F9): AND WITH FELT, WHICH FELT ─────────
            *"dodaj materiałowe dno zamiast Veneer: ciemnozielone, czerwone,
            brązowe, czarne, tylko te 4 kolory filcu."*

            FOUR AND NO FIFTH: `WATCH_FELT_COLOURS` is the engine's closed list
            and the store refuses anything else, so this row cannot offer a
            colour the BOM could not name. It appears only with FELT BASE
            chosen — a colour row over a sprayed tray is a control that cannot
            act — and `Veneer` is not here because it never was: the finish
            list has carried exactly one entry since T53. */}
        {finish === 'felt' ? (
          <div className="cc-row text-sm" data-watch-felt-row="1">
            <span className="flex-1 text-ink-100">Felt colour</span>
            <div className="flex gap-1">
              {WATCH_FELT_COLOURS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  data-watch-felt={c.id}
                  aria-pressed={felt === c.id}
                  className={`cc-btn px-2 py-0.5 text-[11px] ${felt === c.id ? 'cc-btn-gold' : ''}`}
                  title={`${c.label} felt in the tray — the BOM names it.`}
                  onClick={() => setWatchFelt(unit.id, item.id, c.id)}
                >
                  {/* The swatch wears the SAME class list the piece panel's
                      material swatch wears — one look for "this is a colour",
                      and no token the copy machine has to be taught. */}
                  <span
                    className="w-4 h-4 rounded border border-shell-600 shrink-0"
                    data-watch-felt-swatch={c.id}
                    style={{ background: c.hex }}
                  />
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {/* What the engine actually built, so the window and the machine agree. */}
        {built ? (
          <div className="text-[11px] text-ink-400" data-watch-built="1">
            {built.pockets} pockets at {formatMm(built.pocket_w_mm)} mm ·
            {' '}{built.sections} across, {built.lanes} lane{built.lanes === 1 ? '' : 's'} behind
            {built.shelf_glass
              ? ` · pane ${formatMm(built.shelf_glass.glass_w_mm)} × ${formatMm(built.shelf_glass.glass_d_mm)} in ${built.shelf_glass.shelf}`
              : ''}
          </div>
        ) : (
          <div className="text-[11px] text-status-warn" data-watch-built="0">
            This drawer is not taking an insert — Check says why.
          </div>
        )}
      </div>
    </Modal>
  );
}
