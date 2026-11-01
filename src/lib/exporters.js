import jsPDFDefault from 'jspdf';
import {
  buildBom, purchaseBom, incompleteWords, LINK_WORDS,
} from '../engine/bom.js';
// T-CC2a F5 (law 7): the departments the purchase list is grouped by, in the window's order.
import { DEPARTMENTS } from '../engine/catalogue.js';
import { useMaterialLinkStore } from '../stores/materialLinkStore.js';
// Turn 39 (CLAUDE.md F1/F6): the registry the purchase list is grouped by.
import { PART_GROUPS } from '../engine/partRegistry.js';
// Turn 32 (CLAUDE.md F5): the invoice blocks and their one CSV.
import {
  buildBomCsvText, ironmongerySummary, materialsSummary, readyBoxLines,
} from '../engine/bomInvoice.js';
// Turn 33 (CLAUDE.md F1): the lighting block — yellow named specs, metres and
// counts, never an invented article.
import { lightingBomLines, stripsForUnit } from '../engine/ledStrips.js';
import { applyDriverPlan, driverSummary } from './ledDrivers.js';
import { getCabinetProfile } from '../engine/profile.js';
import { registerLookup } from './hardwareRegister.js';
import { formatMm } from '../engine/format.js';
import { exportFileName } from '../engine/naming.js';
import { migrateDesign, resolveFinishes } from '../engine/design.js';

// T-CC1b F11: jsPDF ships CJS; Vite's interop hands back the constructor as the default and node's
// hands back the module, so the BOM PDF reads it the way lib/drawingExport.js already does (one law,
// and the export can be tested the way it is written).
const jsPDF = jsPDFDefault?.jsPDF || jsPDFDefault;

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

// ─── T-CC2a F5.3 · "NOT LINKED" IN EVERY EXPORT (law 7, REWRITES T-CC1b F11's words) ───
// The owner, 01.11.2026: *"jesli CC wybierze MDF 25 a nie mamy przypisanego
// materialu z JC to bedzie napisane MDF 25 materials not assigned"*; 13:33, the
// total with "incomplete" when a line is not linked: *"zgoda"*. The words are
// the engine's (engine/bom.js LINK_WORDS, incompleteWords), read here by the BOM
// PDF and the purchase CSV; a line without a link is never priced at zero.

/** The department's label, 'Bespoke' for this project's own rows. */
function departmentLabel(id) {
  if (id === 'bespoke') return 'Bespoke';
  return DEPARTMENTS.find((d) => d.id === id)?.label || 'Other';
}

/** The departments in the window's order, then bespoke. */
const DEPARTMENT_IDS = [...DEPARTMENTS.map((d) => d.id), 'bespoke'];

/** A row's status column: yes when linked, Bespoke for the project's own, else the red words of law 7. */
function statusWords(r) {
  if (r.status === 'linked') return 'yes';
  if (r.status === 'bespoke') return r.suppliedByClient ? 'Bespoke (supplied by client)' : 'Bespoke';
  return r.words || LINK_WORDS.notLinked;
}

/** The company's links and stock as the link store holds them, for a caller that hands none. */
function companyLinks() {
  try {
    const st = useMaterialLinkStore.getState();
    return { links: st.links, stock: st.stock };
  } catch {
    return { links: null, stock: null };
  }
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
  // T75 F5 · the room, so the worktop's lines ride the file as they ride the
  // panel (`buildBom`'s worktop block): a corner slab needs the walls.
  room = null,
  entries, design = null, profile = getCabinetProfile(), materials = [],
  projectName = 'project', redWarnings = [], lookup = registerLookup,
  // T45 F9c: the job's LED spec, so the FILE sizes the driver the same way the
  // screen does. Left out — every caller that predates this turn — there is no
  // W/m and the engine's own named-spec row stands, which is what a project
  // that has not said its W/m should get.
  ledSpec = null,
}) {
  const d = migrateDesign(design);
  const ready = d.drawerBoxes?.mode === 'ready';
  const bom = buildBom(entries, {
    design: d, profile, materials, excludeDrawerBoxes: ready, room,
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
    //
    // ─── TURN 45 (CLAUDE.md F9c): …and the DRIVER is sized, here too ───────
    // The screen and the file must order the same thing, so the CSV goes
    // through the same `applyDriverPlan` the BOM panel does. With no W/m typed
    // there is no plan, and the engine's own "sized to the strip run" row
    // stands exactly as it did.
    ...applyDriverPlan(
      lightingBomLines({ entries, design: d, profile }),
      driverSummary(
        entries.flatMap(({ unit, result }) => stripsForUnit({
          unit,
          result,
          design: { ...d, lighting: { ...d.lighting, on: true } },
          profile,
        })),
        ledSpec,
      ).plan,
    ),
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
  // T75 F21 · JC_UUID and CODE after PARTS, so JoineryCore imports the list by identity (the linked stock row's).
  // T-CC2a F5.3: ASSIGNED says "yes" for a linked line, the red words of law 7 otherwise, "Bespoke" for this job's own.
  lines.push('GROUP,MATERIAL,ASSIGNED,QTY,UNIT,SHEETS,UNIT_COST,LINE_COST,PARTS,JC_UUID,CODE');
  const rows = Array.isArray(bom?.rows) ? bom.rows : [];
  for (const g of DEPARTMENT_IDS) {
    const these = rows.filter((r) => (DEPARTMENT_IDS.includes(r.department) ? r.department : 'consumables') === g);
    if (!these.length) continue;
    for (const r of these) {
      lines.push([
        q(departmentLabel(g)), q(r.name), q(statusWords(r)),
        Number(r.qty || 0).toFixed(3), q(r.unit), r.sheets ?? '',
        money(r.lineCost == null ? null : r.price), money(r.lineCost), q((r.parts || []).join(' + ')),
        q(r.link?.stock_item_id || ''), q(r.stock?.item_number || r.stock?.code || ''),
      ].join(','));
    }
    const sub = these.reduce((s2, r) => s2 + (Number(r.lineCost) || 0), 0);
    lines.push(`,${q(`${departmentLabel(g)} subtotal`)},,,,,,${money(sub)},`);
  }
  const n = Number(bom?.totals?.notLinked) || 0;
  lines.push('');
  lines.push(`,TOTAL${n > 0 ? ' (INCOMPLETE)' : ''},,,,${bom?.totals?.sheets || ''},,${money(bom?.totals?.cost)},`);
  if (n > 0) {
    lines.push('');
    // T-CC2a F5.3 (law 7): the same words as the BOM window and the BOM PDF; never a complete price.
    lines.push(`WARNING,${q(`${incompleteWords(n)}. Link them in Cabinet Core, Materials, Link materials.`)}`);
  }
  return `${lines.join('\n')}\n`;
}

/** The BOM view's export button. Same numbers, written to a file (T-CC2a: the company's links, the job's bespoke rows). */
export function exportPurchaseBomCsv({
  entries, links = undefined, stock = undefined, bespoke = [], profile = getCabinetProfile(),
  design = null, projectName = 'project', scope = 'project',
  // T75 F21 · the prices the job was quoted at, as the panel shows them.
  pricedAt = null,
}) {
  const company = links === undefined || stock === undefined ? companyLinks() : null;
  const bom = purchaseBom(entries, {
    links: links === undefined ? company.links : links,
    stock: stock === undefined ? company.stock : stock,
    bespoke,
    profile,
    design: migrateDesign(design),
    pricedAt,
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

/** A purchase quantity as the PDF prints it: whole pieces, two decimals otherwise, then its unit. */
function formatQtyText(qty, unit) {
  const n = Number(qty) || 0;
  return `${Number.isInteger(n) ? n : n.toFixed(2)} ${unit || ''}`.trim();
}

/**
 * Project PDF: the 3D view captured from the live WebGL canvas plus the parts
 * table and totals. `capture` is the function the CaptureRig handed over.
 */
export function exportProjectPdf({
  entries, project, capture, links = undefined, stock = undefined, pricedAt = null,
}) {
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

  // T-CC2a F5.3: the purchase list (the ONE road, keyed by catalogue id, priced by the company's links) is read
  // BEFORE the cover is drawn, so the cover can say, in red, how many lines are not linked (law 7).
  const bom = buildBom(entries, { design: project?.design, profile: getCabinetProfile() });
  const company = links === undefined || stock === undefined ? companyLinks() : null;
  const purchase = purchaseBom(entries, {
    links: links === undefined ? company.links : links,
    stock: stock === undefined ? company.stock : stock,
    bespoke: project?.bespoke || [],
    profile: getCabinetProfile(),
    design: migrateDesign(project?.design),
    pricedAt: pricedAt ?? project?.warehouseStamp ?? null,
  });
  const notLinked = Number(purchase.totals.notLinked) || 0;
  if (notLinked > 0) {
    doc.setFontSize(10);
    doc.setTextColor(200, 30, 30);
    doc.text(`${incompleteWords(notLinked)}. Link them in Cabinet Core, Materials, Link materials.`, margin, y);
    doc.setTextColor(40);
    y += 7;
  }

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
      doc.setFontSize(7);
      // T76 F5 · the construction label; the line's state is its readiness.
      const manufacturingNotes = r.manufacturing
        ? doc.splitTextToSize(r.manufacturing.construction, pageW - margin * 2 - 18) : [];
      if (y > pageH - margin - 8 - manufacturingNotes.length * 3.5) {
        doc.addPage(); y = margin + 6; header();
      }
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
      if (manufacturingNotes.length) {
        doc.setFontSize(7);
        doc.setTextColor(80);
        for (const note of manufacturingNotes) {
          doc.text(note, margin + 17, y);
          y += 3.5;
        }
        doc.setTextColor(40);
      }
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

  // T-CC2a F5 (laws 4 and 7): ONE product, ONE line, by department: the catalogue entry, its quantity, the linked
  // Joinery Core material and its cost, or the red words of law 7 with no price. Bespoke rows stand last, marked.
  const qtyOf = (r) => `${formatQtyText(r.qty, r.unit)}${r.sheets != null ? ` (${r.sheets} sheet${r.sheets === 1 ? '' : 's'})` : ''}`;
  for (const g of DEPARTMENT_IDS) {
    const these = purchase.rows.filter((r) => (DEPARTMENT_IDS.includes(r.department) ? r.department : 'consumables') === g);
    if (!these.length) continue;
    section(departmentLabel(g));
    for (const r of these) {
      const said = r.status === 'linked'
        ? ` · JC: ${r.stock?.item_number ? `${r.stock.item_number} ` : ''}${r.stock?.name || ''}`.replace(/ · JC: $/, '')
        : (r.status === 'bespoke' ? ` · ${statusWords(r)}` : `, ${r.words || LINK_WORDS.notLinked}`);
      line(`${r.name} · ${qtyOf(r)}${said}${r.lineCost != null ? ` · £${Number(r.lineCost).toFixed(2)}` : ''}`);
    }
  }

  // T-CC2a F5.3 (law 7): the total of the priced lines; with any line not linked it carries the words, never a
  // complete price (REWRITES T-CC1b F11's "not a price" by name).
  if (y > pageH - margin - 10) { doc.addPage(); y = margin + 6; }
  doc.setFontSize(9);
  if (notLinked > 0) {
    doc.setTextColor(200, 30, 30);
    doc.text(`Total of the linked lines: £${Number(purchase.totals.cost).toFixed(2)}. ${incompleteWords(notLinked)}`, margin, y + 2);
  } else {
    doc.setTextColor(...gold);
    doc.text(`Total: £${Number(purchase.totals.cost).toFixed(2)}`, margin, y + 2);
  }

  doc.save(exportFilename('project', 'pdf', new Date(), project?.name || null));
  return doc;
}
