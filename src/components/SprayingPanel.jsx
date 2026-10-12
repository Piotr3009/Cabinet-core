import { Fragment, useMemo } from 'react';
import Modal from './Modal.jsx';
import { useUiStore } from '../stores/uiStore.js';
import { useProjectStore } from '../stores/projectStore.js';
import { useCabinetProfileStore } from '../stores/cabinetProfileStore.js';
import { useMaterialAssignmentStore } from '../stores/materialAssignmentStore.js';
import { useWarehouseStore } from '../stores/warehouseStore.js';
import { sprayScheduleFor, withPaints } from '../engine/spray.js';
import { unfoldedLayout } from '../engine/drawings/spraySheets.js';
import { exportSprayingPdf } from '../lib/sprayExport.js';
import { drawingErrorText } from '../lib/drawingExport.js';

// === T78 F21 (CLAUDE.md PART F): OUTPUT > SPRAYING, ONE PAGE ================
//
// The owner, 11.10.2026: *"cale sprayowanie jako osobne menu Cabinet Core"*,
// and the one-page layout of Production Core's Spraying tab (mockup v2,
// agreed): a SPRAYING INFORMATION card (project, type, deadline, date, the
// colour chips, which sets are on); PART A, the elements grouped by colour
// (a section row with a swatch), one line per part group with the law's
// columns and a typed Additional info note that is printed; PART B, the
// CARDS, open, under the list, one per rule present in the job that is not
// "all around": the board unfolded (face, back, edges drawn thicker than true
// and said so), the painted areas filled, the rule's numbers, the area per
// part broken down, the parts of this job under the card; PART C, the PAINT
// per colour (m2, coats, coverage, waste, litres, tins, which material, the
// price or its absence). Export PDF: the same page, landscape, in the T71
// report frame (lib/sprayExport.js).
//
// THE PAGE ONLY GROUPS. Every number is `engine/spray.js sprayScheduleFor`'s,
// computed LIVE off the store's results (the same `allResults()` the BOM
// reads), the colour is the unit's own finish through the one resolver, and
// nothing is typed here but the note. The paint is assigned in the Assign
// Materials modal (Consumable > Paint, set 1 / set 2), not on this page.
//
// A shell window (rule 15): draggable by its header, opened beside the menu
// entry that opened it, maximised because a schedule is a WORKSPACE, not a
// side dialog (the same one sanctioned exception the editor takes).
//
// Plain ASCII in this file; the owner's words transliterated.

const f2 = (v) => (Number(v) || 0).toFixed(2);
const f3 = (v) => (Number(v) || 0).toFixed(3);

export default function SprayingPanel() {
  const closeModal = useUiStore((s) => s.closeModal);
  const notify = useUiStore((s) => s.notify);
  const anchor = useUiStore((s) => s.modalArgs?.anchor) || null;

  const allResults = useProjectStore((s) => s.allResults);
  const units = useProjectStore((s) => s.units);
  const runElements = useProjectStore((s) => s.runElements);
  const project = useProjectStore((s) => s.project);
  // The store's T78 F21 setter; absent until the integrator's patch lands, and
  // the page then shows the note read-only rather than crashing.
  const setSprayNote = useProjectStore((s) => s.setSprayNote);
  const profile = useCabinetProfileStore((s) => s.profile);
  const assignmentData = useMaterialAssignmentStore((s) => s.data);
  const ownMaterials = useMaterialAssignmentStore((s) => s.materials);
  const warehouseRows = useWarehouseStore((s) => s.rows);

  const entries = useMemo(() => allResults(), [units, runElements, allResults]);
  const materials = useMemo(() => withPaints(ownMaterials, warehouseRows), [ownMaterials, warehouseRows]);
  const date = useMemo(() => new Date().toLocaleDateString('en-GB'), []);
  const notes = project?.sprayNotes || null;

  const built = useMemo(() => {
    try {
      return {
        schedule: sprayScheduleFor({
          entries, design: project?.design, profile, materials, assignments: assignmentData, notes, project, date,
        }),
        error: null,
      };
    } catch (e) {
      return { schedule: null, error: drawingErrorText(e) };
    }
  }, [entries, project, profile, materials, assignmentData, notes, date]);
  const schedule = built.schedule;

  const exportPdf = () => {
    if (!schedule) return;
    try {
      const { filename, pages } = exportSprayingPdf({ schedule, project, profile, date });
      notify(`Saved ${filename} (${pages} page${pages === 1 ? '' : 's'}).`, 'ok');
    } catch (e) {
      notify(`The spraying PDF did not come out: ${drawingErrorText(e)}`, 'error');
    }
  };

  return (
    <Modal
      name="spraying"
      title="Spraying"
      anchor={anchor}
      onClose={closeModal}
      maximised
      width="w-[1240px]"
      footer={(
        <>
          {schedule && (
            <span className="text-[11px] text-ink-400 mr-auto tabular-nums" data-spray-totals={f3(schedule.totals.m2)}>
              {schedule.totals.parts} parts on {schedule.totals.lines} lines, {f3(schedule.totals.m2)} m2 for the paint, {f2(schedule.totals.edgesLm)} lm of edges
            </span>
          )}
          <button
            type="button"
            className="cc-btn-gold"
            data-spray-export-pdf="1"
            disabled={!schedule}
            title="The same page, landscape, in the T71 report frame"
            onClick={exportPdf}
          >
            Export PDF
          </button>
          <button type="button" className="cc-btn" onClick={closeModal}>Close</button>
        </>
      )}
    >
      <div className="cc-scroll max-h-[76vh] pr-1 space-y-4 text-[12px]" data-spraying="1">
        {built.error && (
          <p className="border border-status-warn/60 bg-status-warn/10 text-status-warn rounded px-2 py-1.5 text-[11px]" data-spray-error="1">
            The spray schedule cannot be built: {built.error}
          </p>
        )}
        {schedule && (
          <>
            <InfoCard info={schedule.info} />
            <PartA schedule={schedule} notes={notes} setSprayNote={setSprayNote} />
            <PartB cards={schedule.cards} />
            <PartC paint={schedule.paint} info={schedule.info} />
          </>
        )}
      </div>
    </Modal>
  );
}

// --- the information card -----------------------------------------------------

function InfoCard({ info }) {
  return (
    <section className="rounded border border-shell-600 bg-shell-700/40 p-3" data-spray-info="1">
      <div className="text-[10px] uppercase tracking-wide text-gold mb-2">Spraying information</div>
      <div className="grid grid-cols-4 gap-3 text-[12px]">
        <Field label="Project" value={info.project} />
        <Field label="Job no / type" value={[info.number, info.type].filter(Boolean).join(' / ') || 'not set'} />
        <Field label="Deadline" value={info.deadline || 'not set'} />
        <Field label="Date" value={info.date} />
      </div>
      <div className="flex flex-wrap items-center gap-2 mt-3" data-spray-colours={String(info.colours.length)}>
        <span className="text-[10px] uppercase tracking-wide text-ink-400 mr-1">Colours</span>
        {info.colours.length === 0 && <span className="text-ink-400">nothing sprayed yet</span>}
        {info.colours.map((c) => (
          <span key={c.key} className="inline-flex items-center gap-1.5 rounded border border-shell-600 px-1.5 py-0.5" data-spray-chip={c.key}>
            <Swatch hex={c.hex} />
            <span className="text-ink-100">{c.label}</span>
            <span className="text-ink-400 tabular-nums">set {c.set}, {f3(c.m2)} m2</span>
          </span>
        ))}
      </div>
      <div className="flex flex-wrap gap-4 mt-2 text-[11px]" data-spray-sets={`${info.sets.set1 ? '1' : ''}${info.sets.set2 ? '2' : ''}`}>
        <span className={info.sets.set1 ? 'text-ink-100' : 'text-ink-400'}>
          Set 1, fronts and run pieces: {info.sets.set1 ? 'ON' : 'nothing sprayed'}
        </span>
        <span className={info.sets.set2 ? 'text-ink-100' : 'text-ink-400'}>
          Set 2, veneer or sprayed carcass: {info.sets.set2 ? 'ON' : 'off, the carcass is board'}
        </span>
        <span className="text-ink-400">
          Edges {info.edgesInM2 ? 'count in the m2 for the paint; the lm beside them is the work' : 'in lm only'}; waste {info.wastePct} percent.
        </span>
      </div>
    </section>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-ink-400">{label}</div>
      <div className="text-ink-50 truncate" title={String(value || '')}>{value || ''}</div>
    </div>
  );
}

function Swatch({ hex, className = '' }) {
  return (
    <span
      className={`inline-block w-4 h-3 rounded-sm border border-shell-500 shrink-0 ${className}`}
      style={{ background: hex || 'transparent' }}
      aria-hidden="true"
    />
  );
}

// --- PART A -------------------------------------------------------------------

function PartA({ schedule, notes, setSprayNote }) {
  const canType = typeof setSprayNote === 'function';
  return (
    <section data-spray-part-a="1">
      <div className="text-[10px] uppercase tracking-wide text-gold mb-1">Part A: elements, by colour</div>
      {schedule.groups.length === 0 ? (
        <p className="text-ink-400 py-2">Nothing to spray yet: add a cabinet with a door, or a run piece.</p>
      ) : (
        <table className="w-full text-[11px]">
          <thead className="text-ink-400 border-b border-shell-600">
            <tr>
              <th className="text-left font-normal px-1.5 py-1 w-[28px]">#</th>
              <th className="text-left font-normal px-1.5 py-1 w-[90px]">Unit no.</th>
              <th className="text-left font-normal px-1.5 py-1">Element</th>
              <th className="text-left font-normal px-1.5 py-1 w-[120px]">Paint code</th>
              <th className="text-left font-normal px-1.5 py-1 w-[130px]">Size (w x h x t)</th>
              <th className="text-right font-normal px-1.5 py-1 w-[68px]">m2 each</th>
              <th className="text-right font-normal px-1.5 py-1 w-[40px]">Qty</th>
              <th className="text-right font-normal px-1.5 py-1 w-[68px]">m2</th>
              <th className="text-right font-normal px-1.5 py-1 w-[68px]">Edges lm</th>
              <th className="text-left font-normal px-1.5 py-1 w-[220px]">Additional info</th>
            </tr>
          </thead>
          <tbody>
            {schedule.groups.map((g) => (
              <Fragment key={g.key}>
                <tr className="bg-shell-700/60" data-spray-colour={g.key} data-spray-colour-set={String(g.set)}>
                  <td colSpan={10} className="px-1.5 py-1">
                    <span className="inline-flex items-center gap-2 text-gold">
                      <Swatch hex={g.hex} />
                      <span className="uppercase tracking-wide text-[10px]">{g.label}</span>
                      <span className="text-[10px] text-ink-400 normal-case tracking-normal tabular-nums">
                        set {g.set}, {g.lines.length} line{g.lines.length === 1 ? '' : 's'}, {f3(g.m2)} m2, {f2(g.edgesLm)} lm
                      </span>
                    </span>
                  </td>
                </tr>
                {g.lines.map((l) => (
                  <tr key={l.key} className="border-b border-shell-600/40 text-ink-100" data-spray-line={l.key} data-spray-rule={l.ruleId} data-spray-qty={String(l.qty)}>
                    <td className="px-1.5 py-1 text-ink-400 tabular-nums">{l.no}</td>
                    <td className="px-1.5 py-1 text-ink-400 truncate max-w-[90px]" title={l.units.join(', ')}>{l.units.join(', ')}</td>
                    <td className="px-1.5 py-1">
                      {l.element}
                      {l.cardRule && <span className="ml-1 text-[10px] text-ink-400">card below</span>}
                    </td>
                    <td className="px-1.5 py-1 font-mono text-gold" data-spray-code={l.code}>{l.code}</td>
                    <td className="px-1.5 py-1 tabular-nums">{l.size}</td>
                    <td className="px-1.5 py-1 text-right tabular-nums">{f3(l.m2Each)}</td>
                    <td className="px-1.5 py-1 text-right tabular-nums">{l.qty}</td>
                    <td className="px-1.5 py-1 text-right tabular-nums" data-spray-m2={f3(l.m2)}>{f3(l.m2)}</td>
                    <td className="px-1.5 py-1 text-right tabular-nums">{f2(l.edgesLm)}</td>
                    <td className="px-1.5 py-1">
                      {canType ? (
                        <input
                          className="cc-input w-full text-[11px]"
                          data-spray-note={l.key}
                          defaultValue={(notes && notes[l.key]) || ''}
                          placeholder="a note, printed"
                          onBlur={(e) => setSprayNote(l.key, e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                        />
                      ) : (
                        <span className="text-ink-400" title="The note is typed once the store carries setSprayNote (T78 F21 store patch)">{l.note || ''}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </Fragment>
            ))}
            <tr data-spray-total={f3(schedule.totals.m2)}>
              <td colSpan={5} className="px-1.5 py-2 text-right uppercase tracking-wide text-[10px] text-ink-400">Total</td>
              <td />
              <td className="px-1.5 py-2 text-right tabular-nums text-ink-200">{schedule.totals.parts}</td>
              <td className="px-1.5 py-2 text-right tabular-nums text-gold">{f3(schedule.totals.m2)}</td>
              <td className="px-1.5 py-2 text-right tabular-nums text-ink-200">{f2(schedule.totals.edgesLm)}</td>
              <td />
            </tr>
          </tbody>
        </table>
      )}
    </section>
  );
}

// --- PART B -------------------------------------------------------------------

function PartB({ cards }) {
  if (!cards.length) return null;
  return (
    <section data-spray-part-b={String(cards.length)}>
      <div className="text-[10px] uppercase tracking-wide text-gold mb-1">Part B: cards, the rules that are not all around</div>
      <div className="grid grid-cols-2 gap-3">
        {cards.map((card) => <RuleCard key={card.ruleId} card={card} />)}
      </div>
    </section>
  );
}

function ruleNumbers(R) {
  const out = [];
  if (R.backFrameMm != null) out.push(`a ${R.backFrameMm} mm frame on the back`);
  if (R.faceStripMm != null) out.push(`a ${R.faceStripMm} mm strip of the face at the door side; the door-side edge; top and bottom edges for ${R.endEdgesMm} mm`);
  if (R.sideMm != null) out.push(`both ${R.sideMm} mm sides of each strip, painted after gluing inside the door's face`);
  if (R.topEdge) out.push('the top edge');
  if (R.frontEdge) out.push('the front edge');
  if (R.unitEdge) out.push('the edge toward the unit');
  if (R.longEdges) out.push(`${R.longEdges} long edges`);
  if (R.underside) out.push('the underside');
  return out;
}

function RuleCard({ card }) {
  const first = card.lines[0];
  const hex = first?.colour?.hex || '#9a9a9a';
  const lay = useMemo(() => unfoldedLayout(card.unfolded, { w: 300, h: 150 }), [card.unfolded]);
  const H = lay.height + lay.labelDrop + 8;
  const flip = (y, h) => H - lay.labelDrop - 6 - (y + h);
  return (
    <article className="rounded border border-shell-600 bg-shell-700/30 p-3" data-spray-card={card.ruleId} data-spray-card-open="1">
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-ink-50 font-medium">{card.title}</span>
        <span className="font-mono text-gold text-[11px]">{card.code}</span>
        <span className="flex-1" />
        <span className="text-[11px] text-ink-400 tabular-nums">{card.lines.length} line{card.lines.length === 1 ? '' : 's'}, {f3(card.m2)} m2</span>
      </div>
      <div className="text-[11px] text-ink-400 mb-2">
        Painted: {ruleNumbers(card.rule).concat(card.rule.faces === 1 ? ['the visible face'] : []).join('; ') || 'the face'}.
      </div>
      <div className="flex gap-3">
        <div className="shrink-0">
          <svg width={Math.ceil(lay.width) + 4} height={Math.ceil(H)} viewBox={`-2 0 ${lay.width + 4} ${H}`} data-spray-card-drawing={card.ruleId}>
            {lay.items.map((it, i) => (
              <rect
                key={i}
                x={it.x}
                y={flip(it.y, it.h)}
                width={Math.max(it.w, 0.5)}
                height={Math.max(it.h, 0.5)}
                fill={it.painted ? hex : '#2b2b2b'}
                fillOpacity={it.painted ? 0.9 : 1}
                stroke="#8a8a8a"
                strokeWidth={0.6}
                data-painted={it.painted ? '1' : '0'}
                data-kind={it.kind}
              >
                <title>{it.label}{it.painted ? ', painted' : ', not painted'}</title>
              </rect>
            ))}
            {lay.labels.map((l, i) => (
              <text key={i} x={l.x} y={H - 2} fontSize={8} textAnchor="middle" fill="#9a9a9a">{l.text}</text>
            ))}
          </svg>
          <div className="text-[10px] text-ink-500 max-w-[300px]">{lay.note}</div>
        </div>
        <div className="flex-1 min-w-0 text-[11px]">
          <div className="text-[10px] uppercase tracking-wide text-ink-400">Area per part, broken down ({first?.size})</div>
          <ul className="mb-2">
            {(first?.breakdown || []).map((b) => (
              <li key={b.label} className="flex justify-between border-b border-shell-700 py-0.5">
                <span className="text-ink-200">{b.label}</span>
                <span className="tabular-nums">{f3(b.m2)} m2</span>
              </li>
            ))}
            <li className="flex justify-between py-0.5 text-ink-50">
              <span>one part</span>
              <span className="tabular-nums" data-spray-card-each={f3(first?.m2Each)}>{f3(first?.m2Each)} m2</span>
            </li>
          </ul>
          <div className="text-[10px] uppercase tracking-wide text-ink-400">The parts of this job under this card</div>
          <ul>
            {card.lines.map((l) => (
              <li key={l.key} className="flex justify-between border-b border-shell-700 py-0.5" data-spray-card-line={l.key}>
                <span className="text-ink-200 truncate" title={l.units.join(', ')}>#{l.no} units {l.units.join(', ')} {l.size} x{l.qty}</span>
                <span className="tabular-nums">{f3(l.m2)} m2</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </article>
  );
}

// --- PART C -------------------------------------------------------------------

function PartC({ paint, info }) {
  return (
    <section data-spray-part-c={String(paint.length)}>
      <div className="text-[10px] uppercase tracking-wide text-gold mb-1">Part C: paint, per colour</div>
      {paint.length === 0 ? (
        <p className="text-ink-400 py-2">Nothing to spray yet.</p>
      ) : (
        <table className="w-full text-[11px]">
          <thead className="text-ink-400 border-b border-shell-600">
            <tr>
              <th className="text-left font-normal px-1.5 py-1">Colour</th>
              <th className="text-right font-normal px-1.5 py-1">Set</th>
              <th className="text-right font-normal px-1.5 py-1">m2</th>
              <th className="text-right font-normal px-1.5 py-1">Coats</th>
              <th className="text-right font-normal px-1.5 py-1">Coverage m2/L</th>
              <th className="text-right font-normal px-1.5 py-1">Waste</th>
              <th className="text-right font-normal px-1.5 py-1">Litres</th>
              <th className="text-left font-normal px-1.5 py-1">Tins</th>
              <th className="text-left font-normal px-1.5 py-1">Paint material</th>
              <th className="text-right font-normal px-1.5 py-1">Price</th>
            </tr>
          </thead>
          <tbody>
            {paint.map((p) => (
              <Fragment key={`${p.colour.key}-${p.set}`}>
                <tr className="border-b border-shell-600/40 text-ink-100" data-spray-paint={p.colour.key} data-spray-litres={f2(p.litres)}>
                  <td className="px-1.5 py-1"><span className="inline-flex items-center gap-1.5"><Swatch hex={p.colour.hex} />{p.colour.label}</span></td>
                  <td className="px-1.5 py-1 text-right tabular-nums">{p.set}</td>
                  <td className="px-1.5 py-1 text-right tabular-nums">{f3(p.m2)}</td>
                  <td className="px-1.5 py-1 text-right tabular-nums">{p.coats}</td>
                  <td className="px-1.5 py-1 text-right tabular-nums">{f2(p.coverage)}</td>
                  <td className="px-1.5 py-1 text-right tabular-nums">{p.wastePct} %</td>
                  <td className="px-1.5 py-1 text-right tabular-nums text-gold">{f2(p.litres)}</td>
                  <td className="px-1.5 py-1 tabular-nums" data-spray-tins={p.tins.map((t) => `${t.count}x${t.sizeL}`).join(',')}>
                    {p.tins.map((t) => `${t.count} x ${t.sizeL} L`).join(', ') || 'none'}
                  </td>
                  <td className={`px-1.5 py-1 ${p.material ? '' : 'text-status-warn'}`}>
                    {p.material ? `${p.material.name}${p.material.type ? `, ${p.material.type}` : ''}${p.material.sheen ? `, ${p.material.sheen}` : ''}` : 'NOT ASSIGNED'}
                    {p.material && !p.specFromMaterial && <span className="ml-1 text-[10px] text-ink-400">(coverage and coats: the profile's defaults)</span>}
                  </td>
                  <td className={`px-1.5 py-1 text-right tabular-nums ${p.priceMissing ? 'text-status-warn' : ''}`} data-spray-price-missing={p.priceMissing ? '1' : '0'}>
                    {p.priceMissing ? 'no price' : `${f2(p.pricePerUnit)} per ${p.material?.unit || 'L'} = ${f2(p.cost)}`}
                  </td>
                </tr>
                {p.says && (
                  <tr>
                    <td colSpan={10} className="px-1.5 pb-1 text-[10px] text-status-warn" data-spray-says={p.colour.key}>{p.says}</td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      )}
      <p className="text-[10px] text-ink-500 mt-1">
        Litres = m2 x coats / coverage, plus {info.wastePct} percent waste; tins rounded UP to the material&apos;s sizes.
        The paint is assigned in Database &gt; Assign materials (Consumable: Paint, set 1 / set 2); the lines go to BOM &gt; Purchase list.
      </p>
    </section>
  );
}
