import { Fragment, useEffect, useMemo, useState } from 'react';
import NumberField from './NumberField.jsx';
import { StockPhoto, PhotoCard } from './MaterialPicker.jsx';
import { useUiStore } from '../stores/uiStore.js';
import { useProjectStore, BESPOKE_UNITS } from '../stores/projectStore.js';
import { useMaterialAssignmentStore } from '../stores/materialAssignmentStore.js';
// ─── T-CC2a F10 · THE BOM: MATERIALS AND COSTS (CLAUDE.md T-CC2a laws 3, 7, 9) ─
// The owner, 01.11.2026: *"chodzi o robienie listy materialow na dany projekt
// oraz listy kosztow"*. Every line is ONE catalogue entry of the purchase list
// (bom.js purchaseBom, the same road the CSV writes), priced through the
// company's link to its Joinery Core stock; a line without one says so in red
// and carries a Link that opens the Link materials window at that entry. The
// per-part blob is not read here any more.
import {
  buildBom, purchaseBom, formatQty, LINK_WORDS, incompleteWords,
} from '../engine/bom.js';
import { DEPARTMENTS } from '../engine/catalogue.js';
import { useMaterialLinkStore } from '../stores/materialLinkStore.js';
import { exportPurchaseBomCsv } from '../lib/exporters.js';
// Turn 32 (CLAUDE.md F5): the invoice — materials per decor, ironmongery
// with articles, yellow named specs where the registry does not know.
import { ironmongerySummary, materialsSummary, readyBoxLines } from '../engine/bomInvoice.js';
// Turn 33 (CLAUDE.md F1): the lighting block — yellow named specs throughout.
import { lightingBomLines, stripsForUnit } from '../engine/ledStrips.js';
import { applyDriverPlan, driverSummary } from '../lib/ledDrivers.js';
import { registerLookup } from '../lib/hardwareRegister.js';
import { formatMm } from '../engine/format.js';
// T75 F22 · the state of every line.
import { READINESS_LABELS } from '../engine/readiness.js';
import { migrateDesign, resolveFinishes } from '../engine/design.js';
import { LAYER_CLASS } from '../lib/modalLayer.js';
import { useCabinetProfileStore } from '../stores/cabinetProfileStore.js';
// T78 F21 - the warehouse's paints beside the stock list, so the purchase
// list prices the paint lines the spray schedule puts on it.
import { useWarehouseStore } from '../stores/warehouseStore.js';
import { withPaints } from '../engine/spray.js';

// SPEC 4.11 — the BOM is computed LIVE from the current state at all times;
// this panel only decides when to SHOW it. Exports are a snapshot of the same
// live numbers, so "materials first, doors after" cannot produce a BOM without
// fronts.
export default function BomPanel({ onExportCsv, onExportPdf, onExportBom }) {
  const setBomOpen = useUiStore((s) => s.setBomOpen);
  const notify = useUiStore((s) => s.notify);
  const allResults = useProjectStore((s) => s.allResults);
  const runElements = useProjectStore((s) => s.runElements);
  const units = useProjectStore((s) => s.units);   // the subscription that re-runs the BOM
  const ownMaterials = useMaterialAssignmentStore((s) => s.materials);
  // T78 F21 - THE PAINT LINES (CLAUDE.md PART F): `purchaseBom` carries the
  // paint of each sprayed set (engine/bom.js, through engine/spray.js
  // paintPurchaseQtys), and the row it is priced by is a warehouse Paints row;
  // it has to be in the list the BOM resolves against, or the line reads
  // unassigned with a tin chosen. Same helper the Assign Materials modal uses.
  const warehouseRows = useWarehouseStore((s) => s.rows);
  const materials = useMemo(() => withPaints(ownMaterials, warehouseRows), [ownMaterials, warehouseRows]);
  const jcConnected = useMaterialAssignmentStore((s) => s.jcConnected);
  // T-CC2a F10: the company's links and the stock they point at (read once per session, the store decides).
  const links = useMaterialLinkStore((s) => s.links);
  const linkStock = useMaterialLinkStore((s) => s.stock);
  const loadLinks = useMaterialLinkStore((s) => s.load);
  useEffect(() => { loadLinks?.()?.catch?.(() => {}); }, [loadLinks]);
  const bespoke = useProjectStore((s) => s.project.bespoke);
  const addBespoke = useProjectStore((s) => s.addBespoke);
  const updateBespoke = useProjectStore((s) => s.updateBespoke);
  const removeBespoke = useProjectStore((s) => s.removeBespoke);
  const [enlarged, setEnlarged] = useState(null);
  const design = useProjectStore((s) => s.project.design);
  // Turn 39 (F6): the export names its file after the job, like every other.
  const project = useProjectStore((s) => s.project);
  const profile = useCabinetProfileStore((s) => s.profile);

  const [tab, setTab] = useState('parts');
  const runChecks = useProjectStore((s) => s.runChecks);
  const entries = useMemo(() => allResults(), [units, runElements, allResults]);
  // The design and the profile go in so every row carries the finish it is cut
  // from — a sprayed front says "RAL 3005 Wine Red spray", an overridden shelf
  // says its own material (turn 9, CLAUDE.md F4.5 / F6.3). Turn 32 (F5): and
  // the STOCK LIST goes in at last — an assigned board with no finish of its
  // own was named by its slot instead of its stock name, because `materials`
  // was accepted here since turn 16 and never once passed.
  // ─── TURN 32 (CLAUDE.md F5/F7): THE INVOICE ──────────────────────────────
  const migrated = useMemo(() => migrateDesign(design), [design]);
  const readyBoxes = migrated.drawerBoxes?.mode === 'ready';
  // T75 F5 · the room goes in, so the worktop (a slab that may turn a corner)
  // reaches the cut list and the BOM: its slabs, its bolts and its notes.
  const bom = useMemo(() => buildBom(entries, {
    design, profile, materials, excludeDrawerBoxes: readyBoxes, room: project.room,
  }), [entries, design, profile, materials, readyBoxes, project.room]);
  const invoiceSummary = useMemo(
    () => materialsSummary(bom, profile, { excludeDrawerBoxes: readyBoxes }),
    [bom, profile, readyBoxes],
  );
  const invoiceIron = useMemo(() => [
    ...ironmongerySummary({
      // Turn 32 (F6): the REGISTRY answers first; in mock mode it answers
      // null and the yellow lines stand — it informs, it never blocks.
      entries, bom, design: migrated, profile, materials, lookup: registerLookup,
    }),
    ...(readyBoxes ? readyBoxLines(entries) : []),
  ], [entries, bom, migrated, profile, materials, readyBoxes]);
  // ─── TURN 33 (CLAUDE.md F1): THE LIGHTING BLOCK ──────────────────────────
  // Its own section under the ironmongery, and the same rows ride the BOM CSV
  // (lib/exporters.js) — metres per temperature, the driver, the switch, the
  // spots. All yellow: the register knows no LED articles today (Q4).
  // ─── TURN 45 (CLAUDE.md F9c): …AND THE DRIVER IS SIZED ───────────────────
  // *"Result lands in the BOM as `N × driver X W`."* The engine's own driver
  // row — qty 1, "sized to the strip run" — is the honest answer for a project
  // that has not said its W/m, and it stands untouched when there is none. Told
  // one, `applyDriverPlan` rewrites that one row into the order.
  const ledSpec = useProjectStore((s) => s.project.ledSpec);
  const lightingLines = useMemo(() => {
    const lines = lightingBomLines({ entries, design: migrated, profile });
    const litDesign = { ...migrated, lighting: { ...migrated.lighting, on: true } };
    const strips = entries.flatMap(({ unit, result }) => stripsForUnit({
      unit, result, design: litDesign, profile,
    }));
    return applyDriverPlan(lines, driverSummary(strips, ledSpec).plan);
  }, [entries, migrated, profile, ledSpec]);
  // "BOM warns at the top when Check holds a RED on any counted unit."
  const redFindings = useMemo(
    () => runChecks().filter((f) => f.level === 'red'),
    [units, design, runChecks],
  );
  // ─── TURN 39 (CLAUDE.md F6): THE PURCHASE LIST ───────────────────────────
  // Two levels, switchable, and the project one is the SUM of the cabinets by
  // construction (F5) — so "this cabinet" and "whole project" can never
  // disagree about a board.
  const selectedUnitId = useUiStore((s) => s.selectedUnitId);
  const openModal = useUiStore((s) => s.openModal);
  const [scope, setScope] = useState('project');
  const scoped = useMemo(() => {
    if (scope === 'project') return entries;
    const one = entries.find((e) => e.unit?.id === selectedUnitId) || entries[0] || null;
    return one ? [one] : [];
  }, [entries, scope, selectedUnitId]);
  // T75 F21 · priced at what the job was quoted at; a moved list is said, not obeyed.
  const pricedAt = useProjectStore((s) => s.project.warehouseStamp) || null;
  const catalogueMoves = useProjectStore((s) => s.catalogueMoves);
  const acceptCatalogue = useProjectStore((s) => s.acceptCatalogue);
  const moved = useMemo(() => catalogueMoves(), [catalogueMoves, pricedAt, materials]);
  // T-CC2a F10: ONE purchase list (bom.js purchaseBom), keyed by catalogue id and priced through the company's
  // links; the bespoke rows of this project ride it (law 9). The per-part blob is not read by it (law 2).
  const purchase = useMemo(() => purchaseBom(scoped, {
    links, stock: linkStock, profile, design: migrated, pricedAt, bespoke: bespoke || [],
  }), [scoped, links, linkStock, profile, migrated, pricedAt, bespoke]);
  const t = purchase.totals || {};
  const notLinked = Number(t.notLinked ?? t.incomplete ?? 0) || 0;
  const linkedLines = Number(t.linked ?? 0) || 0;
  // The lines a link can be made for: a bespoke row is this project's own and is never linked (law 9).
  const allLines = purchase.rows.filter((r) => !r.bespoke).length;
  const openLink = (r) => openModal('link-materials', { entryId: r.catalogueId, department: r.department, from: 'bom' });

  // The project's finishes, resolved the same way the 3D view resolves them —
  // one unit is enough, because these two are PROJECT settings.
  const finish = useMemo(
    () => resolveFinishes(null, design, profile),
    [design, profile],
  );

  return (
    <aside className={`absolute right-0 top-0 bottom-0 ${tab === 'bom' ? 'w-[720px]' : 'w-[560px]'} cc-panel rounded-none border-y-0 border-r-0 ${LAYER_CLASS.panel} flex flex-col`}>
      <div className="flex items-center px-3 py-2 border-b border-shell-600 gap-2">
        <span className="text-xs uppercase tracking-wide text-ink-200">Bill of materials</span>
        <span className="cc-tag">live</span>
        <span className="flex-1" />
        <button type="button" className={tab === 'parts' ? 'cc-btn border-gold text-gold' : 'cc-btn'} onClick={() => setTab('parts')}>Parts</button>
        <button type="button" className={tab === 'materials' ? 'cc-btn border-gold text-gold' : 'cc-btn'} onClick={() => setTab('materials')}>Materials</button>
        <button type="button" data-bom-order-tab="1" className={tab === 'order' ? 'cc-btn border-gold text-gold' : 'cc-btn'} onClick={() => setTab('order')}>Order</button>
        {/* Turn 39 (CLAUDE.md F6): the BOM proper — what the job costs. */}
        <button
          type="button"
          data-bom-purchase-tab="1"
          className={tab === 'bom' ? 'cc-btn border-gold text-gold' : 'cc-btn'}
          onClick={() => setTab('bom')}
        >
          BOM
          {notLinked > 0 && (
            <span className="ml-1 text-status-danger tabular-nums">{notLinked}</span>
          )}
        </button>
        <button type="button" className="cc-btn-ghost" onClick={() => setBomOpen(false)}>×</button>
      </div>

      {/* T-CC2a F10.4: the header, "<n> of <m> lines linked", and the total with law 7's words. */}
      <div
        className="px-3 py-1.5 border-b border-shell-600 text-[12px] flex gap-3 items-baseline"
        data-bom-link-count={String(linkedLines)}
        data-bom-link-total={String(allLines)}
      >
        <span className="text-ink-200 tabular-nums">{`${linkedLines} of ${allLines} lines linked`}</span>
        <span className="flex-1" />
        <span className={`tabular-nums ${notLinked > 0 ? 'text-status-danger' : 'text-gold'}`} data-bom-header-total={notLinked > 0 ? 'incomplete' : 'complete'}>
          {`Total £${Number(t.cost || 0).toFixed(2)}`}
          {notLinked > 0 ? `, ${incompleteWords(notLinked)}` : ''}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {bom.totals.pieces === 0 ? (
          <p className="p-4 text-sm text-ink-400">Nothing in the room yet.</p>
        ) : tab === 'parts' ? (
          <table className="w-full text-[12px]">
            <thead className="sticky top-0 bg-shell-800 text-ink-400 border-b border-shell-600">
              <tr>
                <th className="text-left font-normal px-2 py-1.5">Unit</th>
                <th className="text-left font-normal px-2 py-1.5">Panel</th>
                {/* Turn 9 (CLAUDE.md F4.5 / F6.3): what this ONE piece is cut
                    from. A 25 mm shelf somebody overrode is a 25 mm part with
                    its own material here, and a sprayed front reads
                    "RAL 3005 Wine Red spray" — the same words the drawing and
                    the PDF use, because all three read one resolver. */}
                <th className="text-left font-normal px-2 py-1.5">Material</th>
                <th className="text-right font-normal px-2 py-1.5">W</th>
                <th className="text-right font-normal px-2 py-1.5">H</th>
                <th className="text-center font-normal px-2 py-1.5">Qty</th>
                <th className="text-center font-normal px-2 py-1.5">Edge</th>
                <th className="text-right font-normal px-2 py-1.5">m²</th>
                {/* T75 F22 · *"The cut list, the BOM and the CNC export show
                    the state on every line"* (`engine/readiness.js`). */}
                <th className="text-left font-normal px-2 py-1.5">State</th>
              </tr>
            </thead>
            <tbody>
              {bom.units.map((u) => (
                <FragmentRows key={u.unitId} unit={u} />
              ))}
            </tbody>
          </table>
        ) : tab === 'bom' ? (
          /* ═══ TURN 39 (CLAUDE.md F6): THE BOM, T-CC2a F10 ═══════════════════
             What the job COSTS: one line per catalogue entry (law 4), grouped by
             the departments of the Link materials window, each with the company's
             Joinery Core material and its line cost, or the red words of law 7
             and a Link that opens the window at that entry. The bespoke rows of
             this project at the bottom (law 9). */
          <div className="p-3 space-y-2 text-[12px]" data-bom-purchase="1">
            <div className="flex items-center gap-2">
              <span className="cc-label mb-0">Level</span>
              <button
                type="button"
                data-bom-scope="cabinet"
                className={scope === 'cabinet' ? 'cc-btn border-gold text-gold' : 'cc-btn'}
                onClick={() => setScope('cabinet')}
              >
                This cabinet
              </button>
              <button
                type="button"
                data-bom-scope="project"
                className={scope === 'project' ? 'cc-btn border-gold text-gold' : 'cc-btn'}
                onClick={() => setScope('project')}
              >
                Whole project
              </button>
              <span className="flex-1" />
              <span className="text-[11px] text-ink-400 tabular-nums">
                {purchase.rows.length} line{purchase.rows.length === 1 ? '' : 's'}
              </span>
            </div>

            {/* A total with a hole in it is never shown as a confident number (law 7). */}
            {notLinked > 0 && (
              <p
                className="border border-status-danger/60 bg-status-danger/10 text-status-danger rounded px-2 py-1.5 text-[11px]"
                data-bom-incomplete={String(notLinked)}
              >
                {incompleteWords(notLinked)}. Press Link on a red line: the link is saved for all projects.
              </p>
            )}

            {purchase.rows.filter((r) => !r.bespoke).length === 0 ? (
              <p className="text-ink-400 text-[11px] py-3">
                Nothing to buy yet: add a cabinet first.
              </p>
            ) : (
              <PurchaseLines rows={purchase.rows} onLink={openLink} onEnlarge={setEnlarged} costs />
            )}

            <BespokeBlock
              rows={bespoke || []}
              purchaseRows={purchase.rows}
              onAdd={() => addBespoke?.()}
              onUpdate={(id, patch) => updateBespoke?.(id, patch)}
              onRemove={(id) => removeBespoke?.(id)}
            />

            <div
              className="flex items-baseline gap-2 border-t border-shell-600 pt-2"
              data-bom-total={notLinked > 0 ? 'incomplete' : 'complete'}
            >
              <span className="uppercase tracking-wide text-[10px] text-ink-400">
                {scope === 'project' ? 'Project total' : 'Cabinet total'}
              </span>
              <span className="flex-1" />
              {t.sheets ? <span className="text-ink-400 tabular-nums">{`${t.sheets} sheets`}</span> : null}
              <span className={`tabular-nums ${notLinked > 0 ? 'text-status-danger' : 'text-gold'}`}>
                {`£${Number(t.cost || 0).toFixed(2)}`}
              </span>
              {notLinked > 0 && <span className="text-status-danger" data-bom-incomplete-words="1">{incompleteWords(notLinked)}</span>}
            </div>
            <p className="text-[10px] text-ink-600">
              Sheets are counted from the area, the offcut allowance and the sheet size of each link, rounded up.
              Real nesting is a later turn and this is not it.
            </p>
          </div>
        ) : tab === 'order' ? (
          /* ─── TURN 32 (CLAUDE.md F5): THE ORDER — what the workshop buys ── */
          <div className="p-3 space-y-3 text-[12px]" data-bom-order="1">
            {redFindings.length > 0 && (
              <p
                className="border border-status-danger/60 bg-status-danger/10 text-status-danger rounded px-2 py-1.5 text-[11px]"
                data-bom-red-warning={redFindings.length}
              >
                Check holds {redFindings.length} RED finding{redFindings.length === 1 ? '' : 's'} on
                counted units — the numbers below include them.
              </p>
            )}

            {['carcasses', 'fronts'].map((kind) => {
              const rows = invoiceSummary.filter((g) => g.kind === kind);
              if (!rows.length) return null;
              return (
                <section key={kind} data-bom-materials={kind}>
                  <h3 className="text-[10px] uppercase tracking-wide text-ink-400 mb-1">
                    Materials — {kind}
                  </h3>
                  <table className="w-full text-[11px]">
                    <thead className="text-ink-400 border-b border-shell-600">
                      <tr>
                        <th className="text-left py-0.5">Decor</th>
                        <th className="text-right">mm</th>
                        <th className="text-right">net m²</th>
                        <th className="text-right">+{rows[0].waste_pct} %</th>
                        <th className="text-right">sheets</th>
                        <th className="text-right">edging</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((g) => (
                        <tr key={`${g.label}-${g.thickness}`} className="border-b border-shell-700">
                          <td className="py-0.5 pr-2">{g.label}</td>
                          <td className="text-right">{g.thickness}</td>
                          <td className="text-right">{g.net_m2.toFixed(3)}</td>
                          <td className="text-right">{g.order_m2.toFixed(3)}</td>
                          <td className="text-right whitespace-nowrap">{g.sheet_label}</td>
                          <td className="text-right">{g.edging_m.toFixed(2)} m</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              );
            })}
            <p className="text-[10px] text-ink-400">
              Sheets are a division with a label, never a cutting plan. Waste {invoiceSummary[0]?.waste_pct ?? 15} %
              and the {profile.bom?.sheet?.width ?? 2800}×{profile.bom?.sheet?.height ?? 2070} sheet are
              profile numbers — owner to confirm (15.08.2026).
            </p>

            <section data-bom-ironmongery="1">
              <h3 className="text-[10px] uppercase tracking-wide text-ink-400 mb-1">Ironmongery</h3>
              <ul className="space-y-0.5">
                {invoiceIron.map((l, i) => (
                  <li
                    key={`${l.role}-${i}`}
                    className={`flex items-baseline gap-2 border-b border-shell-700 py-0.5 ${l.yellow ? 'text-status-warn' : ''}`}
                    data-bom-line={l.role}
                    data-bom-yellow={l.yellow ? '1' : undefined}
                  >
                    <span className="flex-1">{l.label}</span>
                    <span className="text-right whitespace-nowrap">{l.qty} {l.unit}</span>
                    <span className="w-[170px] text-right text-[11px] whitespace-nowrap">
                      {l.article
                        ? <>art. {l.article}</>
                        : <>{l.spec_label} · SPEC</>}
                    </span>
                    {/* T75 F22 · an ironmongery line is an order line. */}
                    <span className="text-[10px] text-ink-400 whitespace-nowrap" data-readiness="bought">
                      {READINESS_LABELS.bought}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-[10px] text-ink-400 mt-1">
                A yellow line is a NAMED SPEC the registry does not know an article for — it informs,
                it never blocks, and nothing is invented or dropped.
              </p>
            </section>

            {/* ─── TURN 33 (CLAUDE.md F1): LIGHTING — metres, driver, switch, spots ── */}
            {lightingLines.length > 0 && (
              <section data-bom-lighting="1">
                <h3 className="text-[10px] uppercase tracking-wide text-ink-400 mb-1">Lighting</h3>
                <ul className="space-y-0.5">
                  {lightingLines.map((l, i) => (
                    <li
                      key={`${l.role}-${i}`}
                      className="flex items-baseline gap-2 border-b border-shell-700 py-0.5 text-status-warn"
                      data-bom-line={l.role}
                      data-bom-yellow="1"
                    >
                      <span className="flex-1">{l.label}</span>
                      <span className="text-right whitespace-nowrap">{l.qty} {l.unit}</span>
                      <span className="w-[170px] text-right text-[11px] whitespace-nowrap">
                        {l.spec_label} · SPEC
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="text-[10px] text-ink-400 mt-1">
                  Lighting drills nothing and blocks nothing — every line is a named spec until the
                  register knows the articles.
                </p>
              </section>
            )}
          </div>
        ) : (
          <div className="p-3 space-y-3" data-bom-materials-tab="1">
            {/* What the job is FINISHED in. A decor is named in full and with
                its attribution — "EGGER H1180 ST37 Natural Halifax Oak" is what
                gets ordered, and the brand is not optional (BACKLOG #19). */}
            <div className="text-[11px] uppercase tracking-wide text-gold">Finish</div>
            <div className="p-2 rounded border border-shell-600 bg-shell-700/40 space-y-1">
              {[['Carcass', finish.carcass], ['Fronts', finish.front]].map(([label, f]) => (
                <div key={label} className="flex items-baseline gap-2 text-[12px]">
                  <span className="text-ink-400 w-16">{label}</span>
                  <span className={f?.decor ? 'text-gold' : 'text-ink-50'}>{f?.label || '—'}</span>
                  <span className="flex-1" />
                  <span
                    className="w-6 h-4 rounded border border-shell-600 shrink-0"
                    style={{ background: f?.hex || 'transparent' }}
                  />
                </div>
              ))}
            </div>
            {/* T-CC2a F10.2: the board and hardware selects are gone (the Deletion licence). The same list,
                read only: what each line is linked to in Joinery Core, and Link where it is not. */}
            <p className="text-[11px] text-ink-400">
              Every material is linked once to your Joinery Core stock, for all projects, in Link materials.
            </p>
            {purchase.rows.filter((r) => !r.bespoke).length === 0
              ? <p className="text-ink-400 text-[11px]">Nothing in the room yet.</p>
              : <PurchaseLines rows={purchase.rows} onLink={openLink} onEnlarge={setEnlarged} costs={false} />}
          </div>
        )}
      </div>

      <div className="border-t border-shell-600 p-3 space-y-2">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[12px]">
          <Stat label="Pieces" value={bom.totals.pieces} />
          <Stat label="Board" value={`${bom.totals.board_area_m2.toFixed(3)} m²`} />
          <Stat label="Fronts" value={`${bom.totals.front_area_m2.toFixed(3)} m²`} />
          <Stat label="Edging (carcass)" value={`${bom.totals.edging_m.toFixed(2)} m`} />
          <Stat label="Edging (incl. fronts)" value={`${bom.totals.edging_total_m.toFixed(2)} m`} />
          <Stat label="Hardware" value={`${bom.hardware.reduce((s, h) => s + h.qty, 0)} items`} />
          <Stat label="Lines linked" value={`${linkedLines} of ${allLines}`} />
          <Stat
            label="Total cost"
            value={notLinked > 0 ? `${Number(t.cost || 0).toFixed(2)}, ${incompleteWords(notLinked)}` : Number(t.cost || 0).toFixed(2)}
            accent={notLinked === 0}
            danger={notLinked > 0}
          />
        </div>
        <div className="flex gap-2">
          <button type="button" className="cc-btn flex-1" onClick={onExportCsv}>Cutting list CSV</button>
          <button type="button" className="cc-btn flex-1" data-bom-export="1" onClick={onExportBom}>BOM CSV</button>
          {/* Turn 39 (CLAUDE.md F6): the purchase list, as a file. The SAME
              `purchaseBom()` the tab above renders — not a second BOM. */}
          <button
            type="button"
            className="cc-btn flex-1"
            data-bom-purchase-export="1"
            title="The purchase list, with the lines not linked in it and the total marked incomplete when there are any"
            onClick={() => {
              exportPurchaseBomCsv({
                entries: scoped,
                links,
                stock: linkStock,
                bespoke: bespoke || [],
                profile,
                design: migrated,
                projectName: project?.name || 'project',
                scope,
                pricedAt,
              });
              notify(`Purchase BOM exported — ${scope === 'project' ? 'whole project' : 'this cabinet'}.`, 'ok');
            }}
          >
            Purchase CSV
          </button>
          <button type="button" className="cc-btn flex-1" onClick={onExportPdf}>PDF</button>
          {/* T75 F21 · the owner's decision: re-price the job against today's list. */}
          {moved.length > 0 && (
            <button
              type="button"
              className="cc-btn flex-1"
              data-bom-accept-prices="1"
              title={`The price list moved for ${moved.length} material(s) since this job was priced: re-price it against today's list`}
              onClick={() => { acceptCatalogue(); notify('Re-priced against today\'s list.', 'ok'); }}
            >
              Accept today&apos;s prices
            </button>
          )}
          <button
            type="button"
            className="cc-btn flex-1 opacity-60"
            title="JoineryCore integration is a later phase — Stock, live prices and BOM push."
            onClick={() => notify('Connect JoineryCore lands in a later phase — Stock, prices and BOM push.', 'info')}
          >
            {jcConnected ? 'JoineryCore ✓' : 'Connect JoineryCore'}
          </button>
        </div>
      </div>
      {enlarged && (
        <PhotoCard
          url={enlarged.url}
          title={enlarged.title}
          caption={enlarged.caption}
          anchor={enlarged.anchor}
          onClose={() => setEnlarged(null)}
        />
      )}
    </aside>
  );
}

function FragmentRows({ unit }) {
  return (
    <>
      <tr className="bg-shell-700/60">
        <td colSpan={9} className="px-2 py-1 text-[11px] uppercase tracking-wide text-gold">
          {unit.unitNum} · {unit.type} · {unit.totals.pieces_total} pcs
        </td>
      </tr>
      {unit.rows.map((r) => (
        <tr key={`${unit.unitId}-${r.id}`} className="border-b border-shell-600/40 text-ink-100">
          <td className="px-2 py-1 text-ink-400">{r.unit_num}</td>
          <td className="px-2 py-1">
            {r.id}
            {/* T76 F5 · the construction label; the state is the State column's. */}
            {r.manufacturing && (
              <div className="text-[10px] text-ink-400 max-w-[260px]" data-front-manufacturing={r.id}>
                {r.manufacturing.construction}
              </div>
            )}
          </td>
          {/* T76 F7 · the walk measured the State column pushed past the panel
              (AM: a strip's stock and the gluing NOTE): the material cell
              truncates at 160, and the state may wrap ("Fit on / site"). */}
          <td className="px-2 py-1 text-ink-400 max-w-[160px] truncate" title={r.material_label || ''}>
            {formatMm(r.thickness)} · {r.material_label || '—'}
          </td>
          <td className="px-2 py-1 text-right tabular-nums">{formatMm(r.w)}</td>
          <td className="px-2 py-1 text-right tabular-nums">{formatMm(r.h)}</td>
          <td className="px-2 py-1 text-center">{r.qty}</td>
          <td className="px-2 py-1 text-center font-mono text-ink-400">{r.edge || '—'}</td>
          <td className="px-2 py-1 text-right tabular-nums">{r.area_m2.toFixed(3)}</td>
          <td
            className={`px-2 py-1 ${r.readiness && r.readiness !== 'cut' ? 'text-status-warn' : 'text-ink-400'}`}
            data-readiness={r.readiness || undefined}
          >
            {READINESS_LABELS[r.readiness] || ''}
          </td>
        </tr>
      ))}
    </>
  );
}

function Stat({
  label, value, accent, danger,
}) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-ink-400">{label}</span>
      <span className={danger ? 'text-status-danger text-right' : accent ? 'text-gold' : 'text-ink-50'}>{value}</span>
    </div>
  );
}

/** The quantity of a purchase line as a number and its unit, never a guessed sheet count. */
function qtyText(r) {
  const qty = Number(r.qty);
  if (!Number.isFinite(qty)) return '';
  return formatQty(qty, r.unit);
}

/**
 * T-CC2a F10.1 · the purchase lines, grouped by the departments of the Link materials window: the catalogue
 * entry's name, the quantity and unit, the company's Joinery Core material (photo, number, name) and the line cost,
 * or the red words of law 7 and a Link. `costs` false is the Materials tab: the same list, without the money.
 */
function PurchaseLines({
  rows, onLink, onEnlarge, costs,
}) {
  const known = new Set(DEPARTMENTS.map((d) => d.id));
  const groups = [
    ...DEPARTMENTS.map((d) => ({ ...d, rows: rows.filter((r) => !r.bespoke && r.department === d.id) })),
    { id: 'other', label: 'Other', rows: rows.filter((r) => !r.bespoke && !known.has(r.department)) },
  ].filter((g) => g.rows.length);
  return (
    <table className="w-full text-[11px]" data-bom-lines={costs ? 'bom' : 'materials'}>
      <thead className="sticky top-0 bg-shell-800 text-ink-400 border-b border-shell-600">
        <tr>
          <th className="text-left font-normal px-1.5 py-1.5">Material</th>
          <th className="text-right font-normal px-1.5 py-1.5">Qty</th>
          <th className="text-left font-normal px-1.5 py-1.5">Joinery Core</th>
          {costs && <th className="text-right font-normal px-1.5 py-1.5">Unit price</th>}
          {costs && <th className="text-right font-normal px-1.5 py-1.5">Line cost</th>}
          <th />
        </tr>
      </thead>
      <tbody>
        {groups.map((g) => {
          const sub = g.rows.reduce((acc, r) => acc + (Number(r.lineCost) || 0), 0);
          return (
            <Fragment key={g.id}>
              <tr className="bg-shell-700/60" data-bom-group={g.id}>
                <td colSpan={costs ? 6 : 4} className="px-1.5 py-1 text-[10px] uppercase tracking-wide text-gold">{g.label}</td>
              </tr>
              {g.rows.map((r, i) => {
                const linked = r.status === 'linked';
                const canLink = !linked && r.status !== 'not-in-catalogue' && r.catalogueId;
                return (
                  <tr key={r.key || i} className="border-b border-shell-600/40" data-bom-line-status={r.status}>
                    <td className="px-1.5 py-1">
                      <span className={linked ? 'text-ink-100' : 'text-status-danger'}>{r.name}</span>
                      {r.sheets != null && <div className="text-ink-400 tabular-nums">{`${r.sheets} sheet${r.sheets === 1 ? '' : 's'}`}</div>}
                    </td>
                    <td className="px-1.5 py-1 text-right tabular-nums whitespace-nowrap">{qtyText(r)}</td>
                    <td className="px-1.5 py-1">
                      {r.stock ? (
                        <div className="flex items-center gap-2" data-bom-jc="1">
                          <StockPhoto
                            url={r.stock.image_url}
                            alt={r.stock.name}
                            size={32}
                            testId="bom-jc"
                            onOpen={(anchor) => onEnlarge({
                              url: r.stock.image_url, title: r.stock.name, caption: [r.stock.item_number, r.stock.name].filter(Boolean).join(', '), anchor,
                            })}
                          />
                          <div className="min-w-0">
                            <div className="text-ink-400 tabular-nums">{r.stock.item_number || ''}</div>
                            <div className="text-ink-100">{r.stock.name}</div>
                          </div>
                        </div>
                      ) : null}
                      {r.words && <div className="text-status-danger" data-bom-words="1">{r.words}</div>}
                    </td>
                    {costs && (
                      <td className="px-1.5 py-1 text-right tabular-nums whitespace-nowrap">
                        {Number(r.price) > 0 ? `${Number(r.price).toFixed(2)}${r.stock?.unit ? ` / ${r.stock.unit}` : ''}` : ''}
                      </td>
                    )}
                    {costs && (
                      <td className="px-1.5 py-1 text-right tabular-nums">
                        {r.lineCost != null ? Number(r.lineCost).toFixed(2) : ''}
                      </td>
                    )}
                    <td className="px-1.5 py-1 text-right">
                      {canLink && (
                        <button
                          type="button"
                          className="cc-btn-ghost text-[10px] text-gold"
                          data-bom-link="1"
                          title="Link this material to a row of your Joinery Core stock, for all projects"
                          onClick={() => onLink(r)}
                        >
                          Link
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {costs && (
                <tr className="border-b border-shell-600" data-bom-subtotal={g.id}>
                  <td colSpan={4} className="px-1.5 py-1 text-[10px] text-ink-400 text-right">{`${g.label} subtotal`}</td>
                  <td className="px-1.5 py-1 text-right tabular-nums text-ink-200">{sub > 0 ? sub.toFixed(2) : ''}</td>
                  <td />
                </tr>
              )}
            </Fragment>
          );
        })}
      </tbody>
    </table>
  );
}

/**
 * T-CC2a F10.3 · BESPOKE, THIS PROJECT ONLY (law 9): rows typed in this project and saved with it
 * (`project.bespoke`, projectStore addBespoke / updateBespoke / removeBespoke); on the purchase list marked
 * Bespoke; never in the catalogue, never in Joinery Core's stock. "Supplied by client" is a row with nothing to buy.
 */
function BespokeBlock({
  rows, purchaseRows, onAdd, onUpdate, onRemove,
}) {
  const costOf = (row) => {
    const hit = purchaseRows.find((r) => r.bespoke && (r.key === `bespoke:${row.id}`));
    if (hit && hit.lineCost != null) return Number(hit.lineCost);
    return row.suppliedByClient ? 0 : (Number(row.qty) || 0) * (Number(row.price) || 0);
  };
  return (
    <section className="rounded border border-shell-600 p-2 space-y-1.5" data-bom-bespoke="1">
      <div className="flex items-center gap-2">
        <span className="text-[11px] uppercase tracking-wide text-gold">Bespoke, this project only</span>
        <span className="flex-1" />
        <button type="button" className="cc-btn px-2 py-0.5" data-bom-bespoke-add="1" onClick={onAdd}>Add bespoke item</button>
      </div>
      {rows.length === 0 && (
        <p className="text-[11px] text-ink-400">
          A material for this job only, the client&apos;s own ironmongery for example. It goes on this purchase list, never into the catalogue or your stock.
        </p>
      )}
      {rows.map((row) => (
        <div key={row.id} className="flex flex-wrap items-center gap-1.5 border-t border-shell-600/50 pt-1.5" data-bom-bespoke-row="1">
          <input
            className="cc-input flex-1 min-w-[160px]"
            placeholder="Name, e.g. Client's own handles"
            value={row.name}
            data-bom-bespoke-name="1"
            onChange={(e) => onUpdate(row.id, { name: e.target.value })}
          />
          <NumberField
            className="cc-input w-[70px] text-right"
            integer={false}
            decimals={2}
            min={0}
            value={row.qty}
            title="Quantity"
            data-bom-bespoke-qty="1"
            onCommit={(v) => onUpdate(row.id, { qty: Number(v) || 0 })}
          />
          <span className="flex gap-0.5" data-bom-bespoke-units="1">
            {(BESPOKE_UNITS || []).map((u) => (
              <button
                key={u}
                type="button"
                className={`cc-btn px-1.5 py-0.5 ${row.unit === u ? 'border-gold text-gold' : ''}`}
                aria-pressed={row.unit === u}
                data-bom-bespoke-unit={u}
                onClick={() => onUpdate(row.id, { unit: u })}
              >
                {u}
              </button>
            ))}
          </span>
          <NumberField
            className="cc-input w-[80px] text-right"
            integer={false}
            decimals={2}
            min={0}
            value={row.suppliedByClient ? 0 : row.price}
            title="Unit price"
            disabled={row.suppliedByClient}
            data-bom-bespoke-price="1"
            onCommit={(v) => onUpdate(row.id, { price: Number(v) || 0 })}
          />
          <label className="flex items-center gap-1 text-[11px] text-ink-200">
            <input
              type="checkbox"
              checked={Boolean(row.suppliedByClient)}
              data-bom-bespoke-client="1"
              onChange={(e) => onUpdate(row.id, { suppliedByClient: e.target.checked })}
            />
            Supplied by client
          </label>
          <span className="w-[64px] text-right tabular-nums text-ink-200" data-bom-bespoke-cost="1">{costOf(row).toFixed(2)}</span>
          <button type="button" className="cc-btn-ghost text-status-danger" data-bom-bespoke-remove="1" onClick={() => onRemove(row.id)}>Remove</button>
        </div>
      ))}
    </section>
  );
}
