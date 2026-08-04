import jsPDF from 'jspdf';
import { buildBom, materialDemand, demandCost } from '../engine/bom.js';
import { getCabinetProfile } from '../engine/profile.js';

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

/** `cabinetcore-{opis}-{DDMM}-{HHMM}.{ext}` — the family naming rule (SPEC 2). */
export function exportFilename(kind, ext, now = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  const stamp = `${p(now.getDate())}${p(now.getMonth() + 1)}-${p(now.getHours())}${p(now.getMinutes())}`;
  return `cabinetcore-${kind}-${stamp}.${ext}`;
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

export function exportCuttingListCsv(entries, projectName = 'project') {
  const csv = buildCuttingListCsv(entries);
  download(exportFilename('cutlist', 'csv'), new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
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

  const bom = buildBom(entries);
  const demand = materialDemand(bom, assignments, materials);
  const cost = demandCost(demand);

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
        if (c.key === 'w' || c.key === 'h') v = Math.round(v);
        else if (c.key === 'area_m2') v = v.toFixed(3);
        else if (c.key === 'edge') v = v || '';
        doc.text(String(v), c.align === 'right' ? x + c.w - 2 : x, y, { align: c.align });
        x += c.w;
      }
      y += 4.6;
    }
  }

  // Materials
  const assigned = demand.filter((d) => d.material);
  if (assigned.length) {
    if (y > pageH - margin - 30) { doc.addPage(); y = margin + 6; }
    y += 4;
    doc.setFontSize(10);
    doc.setTextColor(...gold);
    doc.text('Materials', margin, y);
    y += 5;
    doc.setFontSize(8);
    doc.setTextColor(40);
    for (const d of assigned) {
      doc.text(
        `${d.role} — ${d.material.name} · ${d.area_m2.toFixed(3)} m² × yield ${d.yield} = ${d.required_m2.toFixed(3)} m²`
        + (d.cost != null ? ` · ${d.cost.toFixed(2)}` : ''),
        margin, y,
      );
      y += 4.6;
    }
    if (cost != null) {
      doc.setTextColor(...gold);
      doc.text(`Total material cost: ${cost.toFixed(2)}`, margin, y + 1);
    }
  }

  doc.save(exportFilename('project', 'pdf'));
  return doc;
}
