import { useMemo, useState } from 'react';
import { useUiStore } from '../stores/uiStore.js';
import { useProjectStore } from '../stores/projectStore.js';
import { useMaterialAssignmentStore, BOM_ROLES } from '../stores/materialAssignmentStore.js';
import { buildBom, materialDemand, demandCost } from '../engine/bom.js';

// SPEC 4.11 — the BOM is computed LIVE from the current state at all times;
// this panel only decides when to SHOW it. Exports are a snapshot of the same
// live numbers, so "materials first, doors after" cannot produce a BOM without
// fronts.
export default function BomPanel({ onExportCsv, onExportPdf }) {
  const setBomOpen = useUiStore((s) => s.setBomOpen);
  const notify = useUiStore((s) => s.notify);
  const allResults = useProjectStore((s) => s.allResults);
  const units = useProjectStore((s) => s.units);   // the subscription that re-runs the BOM
  const assignments = useMaterialAssignmentStore((s) => s.assignments);
  const materials = useMaterialAssignmentStore((s) => s.materials);
  const setAssignment = useMaterialAssignmentStore((s) => s.setAssignment);
  const setYield = useMaterialAssignmentStore((s) => s.setYield);
  const jcConnected = useMaterialAssignmentStore((s) => s.jcConnected);

  const [tab, setTab] = useState('parts');
  const entries = useMemo(() => allResults(), [units, allResults]);
  const bom = useMemo(() => buildBom(entries), [entries]);
  const demand = useMemo(() => materialDemand(bom, assignments, materials), [bom, assignments, materials]);
  const cost = demandCost(demand);

  return (
    <aside className="absolute right-0 top-0 bottom-0 w-[560px] cc-panel rounded-none border-y-0 border-r-0 z-30 flex flex-col">
      <div className="flex items-center px-3 py-2 border-b border-shell-600 gap-2">
        <span className="text-xs uppercase tracking-wide text-ink-200">Bill of materials</span>
        <span className="cc-tag">live</span>
        <span className="flex-1" />
        <button type="button" className={tab === 'parts' ? 'cc-btn border-gold text-gold' : 'cc-btn'} onClick={() => setTab('parts')}>Parts</button>
        <button type="button" className={tab === 'materials' ? 'cc-btn border-gold text-gold' : 'cc-btn'} onClick={() => setTab('materials')}>Materials</button>
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
        ) : (
          <div className="p-3 space-y-3">
            <p className="text-[11px] text-ink-400">
              One material per role. <span className="text-ink-200">Yield</span> is the waste allowance:
              1.00 orders exactly the panel area, 1.15 orders 15 % more.
            </p>
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
                      {materials.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                    <input
                      type="number" step="0.01" min="1" className="cc-input w-20 text-right"
                      title="Yield / waste allowance"
                      value={a.yield ?? 1.0}
                      onChange={(e) => setYield(role.id, Number(e.target.value) || 1)}
                    />
                    <span className="text-[11px] text-ink-400 w-24 text-right">
                      {d?.required_m2 != null ? `${d.required_m2.toFixed(3)} m²` : ''}
                      {d?.cost != null ? ` · ${d.cost.toFixed(2)}` : ''}
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
          {cost != null && <Stat label="Material cost" value={cost.toFixed(2)} accent />}
        </div>
        <div className="flex gap-2">
          <button type="button" className="cc-btn flex-1" onClick={onExportCsv}>Cutting list CSV</button>
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
        <td colSpan={7} className="px-2 py-1 text-[11px] uppercase tracking-wide text-gold">
          {unit.unitNum} · {unit.type} · {unit.totals.pieces_total} pcs
        </td>
      </tr>
      {unit.rows.map((r) => (
        <tr key={`${unit.unitId}-${r.id}`} className="border-b border-shell-600/40 text-ink-100">
          <td className="px-2 py-1 text-ink-400">{r.unit_num}</td>
          <td className="px-2 py-1">{r.id}</td>
          <td className="px-2 py-1 text-right tabular-nums">{Math.round(r.w)}</td>
          <td className="px-2 py-1 text-right tabular-nums">{Math.round(r.h)}</td>
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
