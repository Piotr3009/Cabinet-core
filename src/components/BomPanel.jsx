import { useMemo, useState } from 'react';
import NumberField from './NumberField.jsx';
import { useUiStore } from '../stores/uiStore.js';
import { useProjectStore } from '../stores/projectStore.js';
import { useMaterialAssignmentStore, BOM_ROLES, HARDWARE_ROLES } from '../stores/materialAssignmentStore.js';
import { buildBom, materialDemand, hardwareDemand, demandCost } from '../engine/bom.js';
// Turn 32 (CLAUDE.md F5): the invoice — materials per decor, ironmongery
// with articles, yellow named specs where the registry does not know.
import { ironmongerySummary, materialsSummary, readyBoxLines } from '../engine/bomInvoice.js';
import { registerLookup } from '../lib/hardwareRegister.js';
import { formatMm } from '../engine/format.js';
import { migrateDesign, resolveFinishes } from '../engine/design.js';
import { LAYER_CLASS } from '../lib/modalLayer.js';
import { useCabinetProfileStore } from '../stores/cabinetProfileStore.js';

// SPEC 4.11 — the BOM is computed LIVE from the current state at all times;
// this panel only decides when to SHOW it. Exports are a snapshot of the same
// live numbers, so "materials first, doors after" cannot produce a BOM without
// fronts.
export default function BomPanel({ onExportCsv, onExportPdf, onExportBom }) {
  const setBomOpen = useUiStore((s) => s.setBomOpen);
  const notify = useUiStore((s) => s.notify);
  const allResults = useProjectStore((s) => s.allResults);
  const units = useProjectStore((s) => s.units);   // the subscription that re-runs the BOM
  const assignments = useMaterialAssignmentStore((s) => s.assignments);
  const materials = useMaterialAssignmentStore((s) => s.materials);
  const setAssignment = useMaterialAssignmentStore((s) => s.setAssignment);
  const setYield = useMaterialAssignmentStore((s) => s.setYield);
  const jcConnected = useMaterialAssignmentStore((s) => s.jcConnected);
  const design = useProjectStore((s) => s.project.design);
  const profile = useCabinetProfileStore((s) => s.profile);

  const [tab, setTab] = useState('parts');
  const runChecks = useProjectStore((s) => s.runChecks);
  const entries = useMemo(() => allResults(), [units, allResults]);
  // The design and the profile go in so every row carries the finish it is cut
  // from — a sprayed front says "RAL 3005 Wine Red spray", an overridden shelf
  // says its own material (turn 9, CLAUDE.md F4.5 / F6.3). Turn 32 (F5): and
  // the STOCK LIST goes in at last — an assigned board with no finish of its
  // own was named by its slot instead of its stock name, because `materials`
  // was accepted here since turn 16 and never once passed.
  // ─── TURN 32 (CLAUDE.md F5/F7): THE INVOICE ──────────────────────────────
  const migrated = useMemo(() => migrateDesign(design), [design]);
  const readyBoxes = migrated.drawerBoxes?.mode === 'ready';
  const bom = useMemo(() => buildBom(entries, {
    design, profile, materials, excludeDrawerBoxes: readyBoxes,
  }), [entries, design, profile, materials, readyBoxes]);
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
  // "BOM warns at the top when Check holds a RED on any counted unit."
  const redFindings = useMemo(
    () => runChecks().filter((f) => f.level === 'red'),
    [units, design, runChecks],
  );
  const demand = useMemo(() => materialDemand(bom, assignments, materials), [bom, assignments, materials]);
  const hardware = useMemo(() => hardwareDemand(bom, assignments, materials), [bom, assignments, materials]);
  const boardCost = demandCost(demand);
  const hwCost = demandCost(hardware);
  const cost = boardCost == null && hwCost == null ? null : (boardCost ?? 0) + (hwCost ?? 0);

  // Boards go with boards, hinges with hinges: offering the whole list for
  // every role is how a hinge ends up assigned to the back panel.
  // The project's finishes, resolved the same way the 3D view resolves them —
  // one unit is enough, because these two are PROJECT settings.
  const finish = useMemo(
    () => resolveFinishes(null, design, profile),
    [design, profile],
  );

  const boardChoices = materials.filter((m) => m.category !== 'hardware');
  const hardwareChoices = materials.filter((m) => m.category === 'hardware');

  return (
    <aside className={`absolute right-0 top-0 bottom-0 w-[560px] cc-panel rounded-none border-y-0 border-r-0 ${LAYER_CLASS.panel} flex flex-col`}>
      <div className="flex items-center px-3 py-2 border-b border-shell-600 gap-2">
        <span className="text-xs uppercase tracking-wide text-ink-200">Bill of materials</span>
        <span className="cc-tag">live</span>
        <span className="flex-1" />
        <button type="button" className={tab === 'parts' ? 'cc-btn border-gold text-gold' : 'cc-btn'} onClick={() => setTab('parts')}>Parts</button>
        <button type="button" className={tab === 'materials' ? 'cc-btn border-gold text-gold' : 'cc-btn'} onClick={() => setTab('materials')}>Materials</button>
        <button type="button" data-bom-order-tab="1" className={tab === 'order' ? 'cc-btn border-gold text-gold' : 'cc-btn'} onClick={() => setTab('order')}>Order</button>
        <button type="button" className="cc-btn-ghost" onClick={() => setBomOpen(false)}>×</button>
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
              </tr>
            </thead>
            <tbody>
              {bom.units.map((u) => (
                <FragmentRows key={u.unitId} unit={u} />
              ))}
            </tbody>
          </table>
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
                  </li>
                ))}
              </ul>
              <p className="text-[10px] text-ink-400 mt-1">
                A yellow line is a NAMED SPEC the registry does not know an article for — it informs,
                it never blocks, and nothing is invented or dropped.
              </p>
            </section>
          </div>
        ) : (
          <div className="p-3 space-y-3">
            <p className="text-[11px] text-ink-400">
              One material per role. <span className="text-ink-200">Yield</span> is the waste allowance:
              1.00 orders exactly the panel area, 1.15 orders 15 % more.
            </p>
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

            <div className="text-[11px] uppercase tracking-wide text-gold">Boards &amp; fronts</div>
            {BOM_ROLES.map((role) => {
              const d = demand.find((x) => x.role === role.id);
              const a = assignments[role.id] || {};
              const used = d && d.pieces > 0;
              return (
                <div key={role.id} className={`p-2 rounded border ${used ? 'border-shell-600 bg-shell-700/40' : 'border-shell-600/50 opacity-50'}`}>
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm text-ink-50">{role.label}</span>
                    <span className="text-[11px] text-ink-400">{role.hint}</span>
                    <span className="flex-1" />
                    <span className="text-[11px] text-ink-200">
                      {d ? `${d.pieces} pcs · ${d.area_m2.toFixed(3)} m²` : '—'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <select
                      className="cc-input flex-1"
                      value={a.material_id || ''}
                      onChange={(e) => setAssignment(role.id, e.target.value, a.yield ?? 1.0)}
                    >
                      <option value="">— not assigned —</option>
                      {boardChoices.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                    <NumberField
                      className="cc-input w-20 text-right"
                      integer={false}
                      min={1}
                      title="Yield / waste allowance — Enter to apply"
                      value={a.yield ?? 1.0}
                      onCommit={(v) => setYield(role.id, v || 1)}
                    />
                    <span className="text-[11px] text-ink-400 w-24 text-right">
                      {d?.required_m2 != null ? `${d.required_m2.toFixed(3)} m²` : ''}
                      {d?.cost != null ? ` · ${d.cost.toFixed(2)}` : ''}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* ── Hardware ──
                Quantities come from the geometry, not from a product list: the
                engine counts hinges, runner pairs, legs, rail and shelf pins,
                and this is where the workshop says WHICH ones. No yield — you
                do not order 15 % extra hinges for offcuts. The cutting-list CSV
                is untouched by any of this and stays cut parts only. */}
            <div className="text-[11px] uppercase tracking-wide text-gold pt-1">Hardware</div>
            {HARDWARE_ROLES.map((role) => {
              const lines = hardware.filter((h) => h.role === role.id);
              const a = assignments[role.id] || {};
              const qty = lines.reduce((s, h) => s + h.qty, 0);
              const lineCost = lines.reduce((s, h) => (h.cost == null ? s : s + h.cost), 0);
              const priced = lines.some((h) => h.cost != null);
              const used = qty > 0;
              return (
                <div key={role.id} className={`p-2 rounded border ${used ? 'border-shell-600 bg-shell-700/40' : 'border-shell-600/50 opacity-50'}`}>
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm text-ink-50">{role.label}</span>
                    <span className="text-[11px] text-ink-400">{role.hint}</span>
                    <span className="flex-1" />
                    <span className="text-[11px] text-ink-200">
                      {used ? `${qty} ${lines[0].unit}` : '—'}
                      {/* One spec: say it right here. Several (440 mm and
                          490 mm runners in the same project): break them out
                          below, because they are separate things to buy. */}
                      {lines.length === 1 && lines[0].spec_label ? ` · ${lines[0].spec_label}` : ''}
                    </span>
                  </div>
                  {lines.length > 1 && (
                    <ul className="text-[11px] text-ink-400 mt-0.5">
                      {lines.map((h) => (
                        <li key={h.spec_label} className="flex justify-between">
                          <span>{h.spec_label || '—'}</span>
                          <span className="tabular-nums">
                            {h.qty} {h.unit}
                            {h.units.length > 1 ? ` · ${h.units.length} units` : ''}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="flex items-center gap-2 mt-1.5">
                    <select
                      className="cc-input flex-1"
                      value={a.material_id || ''}
                      onChange={(e) => setAssignment(role.id, e.target.value, 1)}
                    >
                      <option value="">— not assigned —</option>
                      {hardwareChoices.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                    <span className="text-[11px] text-ink-400 w-24 text-right">
                      {priced ? lineCost.toFixed(2) : ''}
                    </span>
                  </div>
                </div>
              );
            })}
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
          {hwCost != null && <Stat label="Hardware cost" value={hwCost.toFixed(2)} />}
          {cost != null && <Stat label="Total cost" value={cost.toFixed(2)} accent />}
        </div>
        <div className="flex gap-2">
          <button type="button" className="cc-btn flex-1" onClick={onExportCsv}>Cutting list CSV</button>
          <button type="button" className="cc-btn flex-1" data-bom-export="1" onClick={onExportBom}>BOM CSV</button>
          <button type="button" className="cc-btn flex-1" onClick={onExportPdf}>PDF</button>
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
    </aside>
  );
}

function FragmentRows({ unit }) {
  return (
    <>
      <tr className="bg-shell-700/60">
        <td colSpan={8} className="px-2 py-1 text-[11px] uppercase tracking-wide text-gold">
          {unit.unitNum} · {unit.type} · {unit.totals.pieces_total} pcs
        </td>
      </tr>
      {unit.rows.map((r) => (
        <tr key={`${unit.unitId}-${r.id}`} className="border-b border-shell-600/40 text-ink-100">
          <td className="px-2 py-1 text-ink-400">{r.unit_num}</td>
          <td className="px-2 py-1">{r.id}</td>
          <td className="px-2 py-1 text-ink-400 max-w-[180px] truncate" title={r.material_label || ''}>
            {formatMm(r.thickness)} · {r.material_label || '—'}
          </td>
          <td className="px-2 py-1 text-right tabular-nums">{formatMm(r.w)}</td>
          <td className="px-2 py-1 text-right tabular-nums">{formatMm(r.h)}</td>
          <td className="px-2 py-1 text-center">{r.qty}</td>
          <td className="px-2 py-1 text-center font-mono text-ink-400">{r.edge || '—'}</td>
          <td className="px-2 py-1 text-right tabular-nums">{r.area_m2.toFixed(3)}</td>
        </tr>
      ))}
    </>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div className="flex justify-between">
      <span className="text-ink-400">{label}</span>
      <span className={accent ? 'text-gold' : 'text-ink-50'}>{value}</span>
    </div>
  );
}
