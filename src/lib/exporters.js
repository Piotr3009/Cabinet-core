import jsPDF from 'jspdf';
import {
  buildBom, materialDemand, hardwareDemand, demandCost, purchaseBom,
} from '../engine/bom.js';
// Turn 39 (CLAUDE.md F1/F6): the registry the purchase list is grouped by.
import { PART_GROUPS } from '../engine/partRegistry.js';
// Turn 32 (CLAUDE.md F5): the invoice blocks and their one CSV.
import {
  buildBomCsvText, ironmongerySummary, materialsSummary, readyBoxLines,
} from '../engine/bomInvoice.js';
// Turn 33 (CLAUDE.md F1): the lighting block — yellow named specs, metres and
// counts, never an invented article.
import { lightingBomLines } from '../engine/ledStrips.js';
import { getCabinetProfile } from '../engine/profile.js';
import { registerLookup } from './hardwareRegister.js';
import { formatMm } from '../engine/format.js';
import { exportFileName } from '../engine/naming.js';
import { migrateDesign, resolveFinishes } from '../engine/design.js';

// ─── Exports ───
// An export is a SNAPSHOT of the always-live engine state (SPEC 4.11), so the
// "materials first, doors after" sequence can never produce a BOM without
// fronts.

export function download(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * `{ProjectName}-{kind}-{DDMM-HHMM}.{ext}` (turn 31, CLAUDE.md F5).
 *
 * SPEC 2's family rule with the WORD "cabinetcore" replaced by the word that
 * identifies the file: which job it belongs to. Every export the app writes
 * already carried the minute; what none of them carried was the project, and
 * that is the half a Downloads folder needs.
 *
 * `project` is optional and the fallback is the old literal, so nothing that
 * has not yet been handed one produces a broken name.
 */
export function exportFilename(kind, ext, now = new Date(), project = null) {
  return exportFileName({ project: project || 'cabinetcore', kind, ext, now });
}

/**
 * Cutting list CSV in exactly the LISP SKYLON_labels.csv format:
 * UNIT,PANEL,SZER,WYS,EDGE,EDG_L,SQM — the rows come straight from the engine.
 */
export function buildCuttingListCsv(entries, profile = getCabinetProfile()) {
  const lines = [profile.csv.header];
  for (const { result } of entries) lines.push(...result.csvLines);
  // Trailing terminator: the LISP writes every row with write-line, so the
  // file ends with a newline and the last row is not special.
  return `${lines.join('\r\n')}\r\n`;
}

/**
 * ─── TURN 32 (CLAUDE.md F5): THE BOM CSV — `{ProjectName}-bom-{DDMM-HHMM}` ──
 * Two blocks, one file: materials per decor (fronts apart) and ironmongery
 * with articles. RED Check findings ride at the top as WARNING rows; ready-
 * made boxes (F7) drop their cut parts and appear as purchase lines.
 */
export function exportBomCsv({
  entries, design = null, profile = getCabinetProfile(), materials = [],
  projectName = 'project', redWarnings = [], lookup = registerLookup,
}) {
  const d = migrateDesign(design);
  const ready = d.drawerBoxes?.mode === 'ready';
  const bom = buildBom(entries, {
    design: d, profile, materials, excludeDrawerBoxes: ready,
  });
  const summary = materialsSummary(bom, profile, { excludeDrawerBoxes: ready });
  const ironmongery = [
    ...ironmongerySummary({
      entries, bom, design: d, profile, materials, lookup,
    }),
    ...(ready ? readyBoxLines(entries) : []),
    // ─── Turn 33 (CLAUDE.md F1): the LIGHTING block rides the same file ────
    // Metres per temperature, the driver, the switch and the spots — every
    // one a yellow NAMED SPEC until the register knows an article (Q4).
    ...lightingBomLines({ entries, design: d, profile }),
  ];
  const csv = buildBomCsvText({ summary, ironmongery, warnings: redWarnings });
  download(
    exportFilename('bom', 'csv', new Date(), projectName),
    new Blob([csv], { type: 'text/csv;charset=utf-8;' }),
  );
  return csv;
}

/**
 * ─── TURN 39 (CLAUDE.md F6): THE PURCHASE LIST, AS A FILE ───────────────────
 *
 * The BOM view's own CSV. Not a second BOM — the SAME `purchaseBom()` the view
 * renders, written out, so a printed order and the screen it was read off can
 * never disagree.
 *
 * Two things about the shape are deliberate:
 *   • UNASSIGNED LINES ARE IN IT, at the top, with no cost. A purchase order
 *     that silently dropped the parts nobody has chosen a board for would be an
 *     order for half a kitchen.
 *   • The total is labelled INCOMPLETE whenever one of those lines exists.
 *     CLAUDE.md F6: never a confident number.
 */
export function buildPurchaseBomCsvText(bom, { scope = 'project' } = {}) {
  const q = (v) => {
    const t = String(v ?? '');
    return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  const money = (v) => (v == null ? '' : Number(v).toFixed(2));
  const lines = [`SCOPE,${q(scope)}`, ''];
  lines.push('GROUP,MATERIAL,ASSIGNED,QTY,UNIT,SHEETS,UNIT_COST,LINE_COST,PARTS');
  const groupOf = (id) => PART_GROUPS.find((g) => g.id === id)?.label || 'OTHER';
  for (const g of [null, ...PART_GROUPS.map((x) => x.id)]) {
    const rows = bom.rows.filter((r) => (g === null ? !r.group : r.group === g));
    if (!rows.length) continue;
    for (const r of rows) {
      lines.push([
        q(g ? groupOf(g) : 'OTHER'), q(r.name), r._assigned ? 'yes' : 'NO',
        Number(r.qty).toFixed(3), q(r.unit), r.sheets ?? '',
        money(r._assigned ? r.costPerUnit : null), money(r.lineCost), q(r.parts.join(' + ')),
      ].join(','));
    }
    const sub = rows.reduce((s2, r) => s2 + (r.lineCost || 0), 0);
    lines.push(`,${q(`${g ? groupOf(g) : 'OTHER'} subtotal`)},,,,,,${money(sub)},`);
  }
  lines.push('');
  lines.push(`,TOTAL${bom.totals.complete ? '' : ' (INCOMPLETE)'},,,,${bom.totals.sheets || ''},,${money(bom.totals.cost)},`);
  if (!bom.totals.complete) {
    lines.push('');
    lines.push(`WARNING,${q(`${bom.totals.unassigned} line(s) have no material assigned — this total is not the price of the job`)}`);
  }
  return `${lines.join('\n')}\n`;
}

/** The BOM view's export button. Same numbers, written to a file. */
export function exportPurchaseBomCsv({
  entries, assignments = null, materials = [], profile = getCabinetProfile(),
  design = null, projectName = 'project', scope = 'project',
}) {
  const bom = purchaseBom(entries, {
    assignments, materials, profile, design: migrateDesign(design),
  });
  const csv = buildPurchaseBomCsvText(bom, { scope });
  download(
    exportFilename('purchase-bom', 'csv', new Date(), projectName),
    new Blob([csv], { type: 'text/csv;charset=utf-8;' }),
  );
  return csv;
}

export function exportCuttingListCsv(entries, projectName = 'project') {
  const csv = buildCuttingListCsv(entries);
  // Turn 31 (CLAUDE.md F5): `projectName` has been a parameter of this function
  // since turn 3 and was never once used for anything. It names the file now.
  download(
    exportFilename('cutlist', 'csv', new Date(), projectName),
    new Blob([csv], { type: 'text/csv;charset=utf-8;' }),
  );
  return csv;
}

/**
 * Project PDF: the 3D view captured from the live WebGL canvas plus the parts
 * table and totals. `capture` is the function the CaptureRig handed over.
 */
export function exportProjectPdf({ entries, project, capture, assignments, materials }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const gold = [170, 142, 104];
  let y = margin;

  doc.setFontSize(16);
  doc.setTextColor(...gold);
  doc.text('CABINET CORE', margin, y + 2);
  doc.setFontSize(11);
  doc.setTextColor(40);
  doc.text(project?.name || 'Untitled project', margin, y + 9);
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(new Date().toLocaleString(), pageW - margin, y + 9, { align: 'right' });
  y += 14;
  doc.setDrawColor(...gold);
  doc.line(margin, y, pageW - margin, y);
  y += 6;

  // 3D snapshot
  const shot = typeof capture === 'function' ? capture() : null;
  if (shot?.dataUrl) {
    const imgW = pageW - margin * 2;
    const imgH = imgW * (shot.height / shot.width);
    try {
      doc.addImage(shot.dataUrl, 'JPEG', margin, y, imgW, imgH);
      y += imgH + 6;
    } catch {
      // A tainted or empty canvas must not cost us the rest of the document.
      y += 2;
    }
  }

  const bom = buildBom(entries, { design: project?.design, profile: getCabinetProfile() });
  const demand = materialDemand(bom, assignments, materials);
  const hardware = hardwareDemand(bom, assignments, materials);
  const boardCost = demandCost(demand);
  const hwCost = demandCost(hardware);
  const cost = boardCost == null && hwCost == null ? null : (boardCost ?? 0) + (hwCost ?? 0);

  doc.setFontSize(9);
  doc.setTextColor(40);
  doc.text(
    `${bom.units.length} unit(s) · ${bom.totals.pieces} pieces · board ${bom.totals.board_area_m2.toFixed(3)} m² · `
    + `fronts ${bom.totals.front_area_m2.toFixed(3)} m² · edging ${bom.totals.edging_m.toFixed(2)} m`,
    margin, y,
  );
  y += 6;

  const cols = [
    { key: 'unit_num', label: 'Unit', w: 16, align: 'left' },
    { key: 'id', label: 'Panel', w: 42, align: 'left' },
    { key: 'w', label: 'W', w: 18, align: 'right' },
    { key: 'h', label: 'H', w: 18, align: 'right' },
    { key: 'qty', label: 'Qty', w: 12, align: 'right' },
    { key: 'edge', label: 'Edge', w: 18, align: 'left' },
    { key: 'area_m2', label: 'm²', w: 20, align: 'right' },
  ];

  const header = () => {
    doc.setFillColor(240, 238, 234);
    doc.rect(margin, y - 4, pageW - margin * 2, 6, 'F');
    doc.setFontSize(8);
    doc.setTextColor(90);
    let x = margin + 1;
    for (const c of cols) {
      doc.text(c.label, c.align === 'right' ? x + c.w - 2 : x, y, { align: c.align });
      x += c.w;
    }
    y += 6;
    doc.setTextColor(40);
  };
  header();

  for (const unit of bom.units) {
    for (const r of unit.rows) {
      if (y > pageH - margin - 8) { doc.addPage(); y = margin + 6; header(); }
      let x = margin + 1;
      doc.setFontSize(8);
      for (const c of cols) {
        let v = r[c.key];
        if (c.key === 'w' || c.key === 'h') v = formatMm(v);
        else if (c.key === 'area_m2') v = v.toFixed(3);
        else if (c.key === 'edge') v = v || '';
        doc.text(String(v), c.align === 'right' ? x + c.w - 2 : x, y, { align: c.align });
        x += c.w;
      }
      y += 4.6;
    }
  }

  const section = (title) => {
    if (y > pageH - margin - 30) { doc.addPage(); y = margin + 6; }
    y += 4;
    doc.setFontSize(10);
    doc.setTextColor(...gold);
    doc.text(title, margin, y);
    y += 5;
    doc.setFontSize(8);
    doc.setTextColor(40);
  };
  const line = (text) => {
    if (y > pageH - margin - 8) { doc.addPage(); y = margin + 6; doc.setFontSize(8); doc.setTextColor(40); }
    doc.text(text, margin, y);
    y += 4.6;
  };

  // Finish — what the job is FINISHED in. A decor is named in full and with
  // its attribution: "EGGER H1180 ST37 Natural Halifax Oak" is what gets
  // ordered, and the brand is not optional (BACKLOG #19).
  const finishes = resolveFinishes(null, project?.design, getCabinetProfile());
  if (finishes.carcass || finishes.front) {
    section('Finish');
    line(`Carcass — ${finishes.carcass?.label || 'not set'}${finishes.carcass?.hex ? ` · ${finishes.carcass.hex}` : ''}`);
    line(`Fronts — ${finishes.front?.label || 'not set'}${finishes.front?.hex ? ` · ${finishes.front.hex}` : ''}`);
  }

  // Materials
  const assigned = demand.filter((d) => d.material);
  if (assigned.length) {
    section('Materials');
    for (const d of assigned) {
      line(`${d.role} — ${d.material.name} · ${d.area_m2.toFixed(3)} m² × yield ${d.yield} = ${d.required_m2.toFixed(3)} m²`
        + (d.cost != null ? ` · ${d.cost.toFixed(2)}` : ''));
    }
  }

  // Hardware — quantities from the geometry, product from the assignment.
  // The cutting-list CSV stays the LISP format and never carries any of this.
  if (hardware.length) {
    section('Hardware');
    for (const h of hardware) {
      line(`${h.label} — ${h.qty} ${h.unit}${h.spec_label ? ` · ${h.spec_label}` : ''}`
        + (h.material ? ` · ${h.material.name}` : ' · not assigned')
        + (h.cost != null ? ` · ${h.cost.toFixed(2)}` : ''));
    }
  }

  if (cost != null) {
    if (y > pageH - margin - 10) { doc.addPage(); y = margin + 6; }
    doc.setFontSize(9);
    doc.setTextColor(...gold);
    doc.text(
      `Total: ${cost.toFixed(2)}`
      + (boardCost != null ? `  (materials ${boardCost.toFixed(2)}` : '  (')
      + (hwCost != null ? `${boardCost != null ? ', ' : ''}hardware ${hwCost.toFixed(2)}` : '')
      + ')',
      margin, y + 2,
    );
  }

  doc.save(exportFilename('project', 'pdf', new Date(), project?.name || null));
  return doc;
}
