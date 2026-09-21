import { useEffect, useMemo, useState } from 'react';
import Modal from './Modal.jsx';
import { useUiStore } from '../stores/uiStore.js';
import { useProjectStore } from '../stores/projectStore.js';
import { useCabinetProfileStore } from '../stores/cabinetProfileStore.js';
import { resolveUnitDesign } from '../engine/design.js';
import { buildFrontElevation } from '../engine/drawings/frontElevation.js';
import { shakerFrameMm } from '../engine/shaker.js';
import { projectBookletSheets, unitCardSheet } from '../engine/drawings/card.js';
// ─── TURN 40 (CLAUDE.md F5): A SHEET IS A WALL ─────────────────────────────
// The owner: *"nie mamy drawingu całościowego — pokazuje nam tylko pojedyncze
// szafki."* The set is his own — Wall A /1 with the fronts, Wall A /2 the
// carcass, and one horizontal section — and it is previewed HERE, in the same
// window and by the same code that writes the files, so the screen and the
// paper cannot drift apart.
// ─── TURN 42 (CLAUDE.md F0): …AND IT SAYS WHY WHEN IT CANNOT ──────────────
// `wallSetReport` is the census of what went on the sheets and what did not,
// so the window can name a turned-away cabinet instead of leaving a wall off
// the list without a word.
// ─── TURN 43 (CLAUDE.md F5b): `Section A-A through:` ───────────────────────
// The list of cabinets a section may be taken through is the ENGINE's own
// census (`wallSectionUnits`), so the dropdown on screen and the sheet the set
// builds cannot offer two different answers.
import { wallDrawingSheets, wallSectionUnits, wallSetReport, visualAspect } from '../engine/drawings/wallSheets.js';
// ─── T71: THE SET, AS A JOINER'S SET ────────────────────────────────────────
// The owner, Skylon's own AutoCAD set on the table: *"nasze w CC teraz się
// nakładają, a tutaj jest wszystko osobno"*, and *"weź zakoduj"*. The set is
// now cover, plans, one view per sheet per wall, perspective, visualisation
// and cut list (`wallDrawingSheets`), on one A3 law. This window walks it,
// carries the title block's words (who drew it, status, revision) and asks
// the scene for the render the visualisation sheet frames.
import { renderJob } from '../engine/render.js';
import { PAGE_FORMATS, layoutSheet, scaleLabel } from '../engine/drawings/sheet.js';
import { sheetToSvg } from '../engine/drawings/svg.js';
import {
  drawingErrorText,
  exportBookletPdf, exportDrawingPdf, exportDrawingSvg,
  exportWallDrawingsDxf, exportWallDrawingsPdf,
} from '../lib/drawingExport.js';

// ─── Drawings (turn 6 F7 — one view; turn 7 F1 — the card) ───
//
// Turn 6 drew a single front elevation as a STYLE PROBE, so that this turn had
// a calibrated look to build the rest of the set on. This is the rest: three
// views on one sheet, dimensioned the way a bench measures, plus the booklet
// that carries the whole project.
//
// Everything except the preview frame is engine code (src/engine/drawings/):
// the geometry, the sheet, the layer colours and the SVG are pure and tested in
// node. This file picks a paper size and offers the buttons — and the PREVIEW
// IS THE EXPORT, the same SVG string either way, so what is on screen cannot
// differ from what lands in the file.

const KINDS = {
  preview: { title: 'Unit card', view: 'unit-card' },
  'unit-card': { title: 'Unit card', view: 'unit-card' },
  'front-elevation': { title: 'Front elevation', view: 'front-elevation' },
  // TURN 40 (F5): the whole run, not one cabinet.
  // T71: the whole set, not the walls alone.
  walls: { title: 'Drawing set', view: 'wall-elevation' },
};

export default function DrawingModal({ rig = null }) {
  const closeModal = useUiStore((s) => s.closeModal);
  // Where this modal opens (turn 12, rule 15): beside whatever asked for it.
  // Nothing to work out here — the opener said, and the shell places it.
  const anchor = useUiStore((s) => s.modalArgs?.anchor) || null;
  const notify = useUiStore((s) => s.notify);
  const modalArgs = useUiStore((s) => s.modalArgs);
  const selectedUnitId = useUiStore((s) => s.selectedUnitId);
  const units = useProjectStore((s) => s.units);
  const project = useProjectStore((s) => s.project);
  const unitResult = useProjectStore((s) => s.unitResult);
  const allResults = useProjectStore((s) => s.allResults);
  // T71: the design layer's worktops go on the sheets, and the title block's
  // words live on the project.
  const worktopsOf = useProjectStore((s) => s.worktopsOf);
  const setTitleBlock = useProjectStore((s) => s.setTitleBlock);
  const profile = useCabinetProfileStore((s) => s.profile);

  const requested = KINDS[modalArgs?.kind] ? modalArgs.kind : 'unit-card';
  const [kind, setKind] = useState(requested === 'preview' ? 'unit-card' : requested);
  // TURN 40 (F5): which sheet of the wall SET is on screen. A set has as many
  // sheets as the job has walls, twice, plus the section — so the window walks
  // them rather than showing the first one and calling that a preview.
  const [wallPage, setWallPage] = useState(0);
  // T43-F5b: which cabinet `Section A-A` is taken through, or `— none —`. It is
  // deliberately NOT stored in the project: a drawing option, not a design
  // decision. It lives here for as long as the window is open, and the sheet
  // it produces is part of the SET — so the PDF, the DXF and the preview all
  // carry it.
  const [sectionUnitId, setSectionUnitId] = useState('');
  // 'auto' is the default and it is not laziness: a card chooses between two
  // arrangements AND two paper sizes to draw the cabinet as big as it will go
  // (engine/drawings/card.js). Forcing A4 here would throw that away and hand a
  // base unit back at 1:20 when A3 draws it at 1:10.
  const [format, setFormat] = useState('auto');

  const unit = units.find((u) => u.id === selectedUnitId) || units[0] || null;
  const date = useMemo(() => new Date().toLocaleDateString(), []);

  // ─── THE WALL SET ─────────────────────────────────────────────────────────
  // Built by the ENGINE, once, and used for the preview, the PDF and the DXF.
  //
  // ─── TURN 42 (CLAUDE.md F0): THE GAG COMES OFF, PERMANENTLY ───────────────
  //
  // The owner, 19/20.08.2026: *"pdf w ogóle nie zadziałał — coś się znowu
  // zablokowało."* This memo ended in `catch { return [] }`, and that one line
  // is how an OUTAGE and an EMPTY JOB became the same picture: the same grey
  // buttons, the same footer sentence, the same four green probes beside a
  // dead feature. A crash anywhere under `wallDrawingSheets()` — which includes
  // `allResults()`, so ONE unit whose `computeCabinet` throws kills the whole
  // set — was reported to the joiner as "there is nothing here".
  //
  // So the memo answers with BOTH facts and the window shows the difference:
  //
  //   { sheets: [...], error: null }   the set, however long
  //   { sheets: [],    error: Error }  the builder CRASHED, and it says so
  //
  // The two states must stay distinguishable on screen forever after. That is
  // F0's whole demand, and `test/turn42-f0-wall-pdf-speaks.test.js` holds it.
  // ─── T71: THE RENDER FOR THE VISUALISATION SHEET ──────────────────────────
  // Asked of the scene once per set, through the same rig Output ▸ Render
  // uses (`captureRender`, the fixed export lighting), framed on the whole job
  // from the three-quarter left and shaped to the sheet's picture frame. A
  // window with no scene behind it (tests, a page without the 3D view) binds
  // the sheet with its frame empty, and the sheet says what it is waiting for.
  const [renderImage, setRenderImage] = useState(null);
  useEffect(() => {
    if (kind !== 'walls' || !rig || !units.length) { setRenderImage(null); return undefined; }
    let cancelled = false;
    const frame = requestAnimationFrame(() => {
      if (cancelled) return;
      try {
        const job = renderJob({
          resolution: 'preview',
          preset: 'iso-left',
          shadows: profile.render.defaultShadows,
          aspect: visualAspect(profile),
          bounds: rig.bounds(null),
          project: project?.name,
          subject: 'set',
        }, profile);
        const out = rig.capture(job);
        if (!cancelled) setRenderImage(out?.dataUrl || null);
      } catch (e) {
        // T42-F0's law: a catch REPORTS. The set still binds without the picture.
        // eslint-disable-next-line no-console
        console.error('[wall drawings] the visualisation render failed', e);
        if (!cancelled) setRenderImage(null);
      }
    });
    return () => { cancelled = true; cancelAnimationFrame(frame); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, rig, units, project?.design, project?.name, profile]);

  const wallSet = useMemo(() => {
    if (kind !== 'walls') return { sheets: [], error: null, report: null };
    try {
      const sheets = wallDrawingSheets({
        entries: allResults(),
        project,
        room: project?.room,
        // T71: the slabs the design layer carries, resolved by the store.
        worktops: worktopsOf(),
        renderImage,
        frontTypeOf: (u) => resolveUnitDesign(u, project?.design).frontType,
        // ─── TURN 43 (CLAUDE.md F2) ─────────────────────────────────────
        // *"Shaker prawdziwy — ile mam mm, tyle powinno być pokazane."* The
        // design is the only thing that carries the frame width this job was
        // quoted and cut at (`design.fronts.shakerFrame`, pinned per saved
        // job by projectStore.js). It never reached the drawings before
        // tonight, so every shaker on every sheet was drawn at the profile's
        // default whatever the owner had typed.
        design: project?.design,
        sectionUnitId: sectionUnitId || null,
        profile,
        date,
      });
      // The census is built in the same try: a reader that threw would be one
      // more silent failure, and it is exactly what this turn is about.
      return { sheets, error: null, report: wallSetReport({ entries: allResults(), profile }) };
    } catch (e) {
      // BOTH: the console gets the whole error with its stack, because that is
      // what a diagnosis needs; the screen gets the sentence, because that is
      // what a joiner needs.
      // eslint-disable-next-line no-console
      console.error('[wall drawings] the set could not be built', e);
      return { sheets: [], error: e, report: null };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, units, project, profile, date, allResults, sectionUnitId, renderImage]);

  // The cabinets the dropdown may offer — the same census the set uses, asked
  // once, and never a second list of its own.
  const sectionChoices = useMemo(() => {
    if (kind !== 'walls') return [];
    try {
      return wallSectionUnits({ entries: allResults(), profile });
    } catch (e) {
      // T42-F0's law, which this turn does not get to break: a catch REPORTS.
      // The whole error goes to the console; the sentence a joiner reads is
      // already on the glass, because whatever took this census down took the
      // wall-set memo above down with it and that one speaks.
      // eslint-disable-next-line no-console
      console.error('[wall drawings] the Section A-A census could not be built', e);
      return [];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, units, project, profile, allResults]);
  const wallSheetList = wallSet.sheets;
  const wallError = wallSet.error;
  const wallReport = wallSet.report;
  const wallAt = wallSheetList.length
    ? wallSheetList[Math.min(wallPage, wallSheetList.length - 1)]
    : null;

  const sheet = useMemo(() => {
    if (kind === 'walls') return wallAt?.sheet || null;
    if (!unit) return null;
    const result = unitResult(unit.id);
    if (!result) return null;
    if (kind === 'front-elevation') {
      const drawing = buildFrontElevation(result, {
        unitNum: unit.params.unit_num,
        frontType: resolveUnitDesign(unit, project?.design).frontType,
        profile,
        // T43-F2: the third drawing path in the app, and it told the same lie
        // as the other two. One resolution, from the same module.
        shakerFrame: shakerFrameMm(project?.design, profile),
      });
      return layoutSheet({
        drawing,
        // The single elevation has no arrangement to choose, so 'auto' means
        // the smaller sheet: A4 unless the drawing will not fit on it.
        format: format === 'auto' ? 'A4' : format,
        title: { project: project?.name, unit: unit.params.unit_num, view: 'Front elevation', date },
        profile,
      });
    }
    return unitCardSheet({ result, unit, project, profile, format, date });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unit, kind, format, profile, project?.name, project?.design, unitResult, date, wallAt]);

  const svg = useMemo(
    () => (sheet ? sheetToSvg(sheet, { kind: KINDS[kind]?.view || 'unit-card' }) : null),
    [sheet, kind],
  );

  const view = KINDS[kind]?.view || 'unit-card';

  const save = (target) => {
    // TURN 40 (F5): the wall set binds as a whole — every sheet, in order.
    if (target === 'walls-pdf' || target === 'walls-dxf') {
      // T42-F0: a CRASH is not an empty job, and it never again borrows that
      // sentence. The button is disabled in both states, so this is the belt to
      // the braces — and it still says which of the two it is.
      if (wallError) { notify(`Wall drawings failed: ${drawingErrorText(wallError)}`, 'warn'); return; }
      if (!wallSheetList.length) { notify('No cabinet is standing against a wall yet.', 'warn'); return; }
      try {
        if (target === 'walls-pdf') {
          // T42-F0: `exportWallDrawingsPdf` now LOOKS at the bytes it produced
          // — `%PDF`, and a page per sheet — so the word "Saved" is a
          // measurement rather than a claim. Anything else lands in the catch
          // below, which speaks.
          const { filename, pages } = exportWallDrawingsPdf(wallSheetList.map((x) => x.sheet), {
            project: project?.name,
          });
          notify(`Saved ${filename} — ${pages} sheets.`, 'ok');
          return;
        }
        exportWallDrawingsDxf(wallSheetList, { project: project?.name })
          .then(({ filename, files }) => notify(
            `Saved ${filename} — ${files.length} DXF. AutoCAD only: do NOT open these in VCarve.`, 'ok',
          ))
          // eslint-disable-next-line no-console
          .catch((err) => { console.error('[wall drawings] DXF', err); notify(drawingErrorText(err), 'warn'); });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[wall drawings] export', err);
        notify(drawingErrorText(err), 'warn');
      }
      return;
    }
    if (target === 'booklet') {
      try {
        const sheets = projectBookletSheets({
          entries: allResults(), project, profile, format, date,
        });
        const { filename, pages } = exportBookletPdf(sheets, { project: project?.name });
        notify(`Saved ${filename} — ${pages} pages.`, 'ok');
      } catch (e) {
        // T42-F0: the same law on the booklet path — an error is reported as an
        // error, never relabelled as emptiness.
        // eslint-disable-next-line no-console
        console.error('[booklet] export', e);
        notify(drawingErrorText(e), 'warn');
      }
      return;
    }
    if (!sheet) return;
    const args = { project: project?.name, unit: unit.params.unit_num, view };
    const { filename } = target === 'pdf'
      ? exportDrawingPdf(sheet, args)
      : exportDrawingSvg(sheet, args);
    notify(`Saved ${filename}.`, 'ok');
  };

  return (
    <Modal
      name="drawing"
      anchor={anchor}
      title={KINDS[kind]?.title || 'Unit card'}
      width="w-[880px]"
      onClose={closeModal}
      footer={(
        <>
          <button type="button" className="cc-btn" onClick={closeModal}>Close</button>
          <button
            type="button"
            className="cc-btn"
            disabled={!units.length}
            title="A cover and a page per unit"
            onClick={() => save('booklet')}
          >
            All units (PDF)
          </button>
          {/* ─── TURN 40 (CLAUDE.md F5): THE WALL SET ─────────────────────
              PDF beside the Unit Card, and the DXF as a SEPARATE output that
              says on the button what it says on every sheet in it. */}
          <button
            type="button"
            className="cc-btn"
            data-wall-drawings-pdf="1"
            disabled={!wallSheetList.length}
            title="The whole set: cover, plans, per wall the front view, internal layout and sections, perspective, visualisation, cut list"
            onClick={() => save('walls-pdf')}
          >
            Drawing set (PDF)
          </button>
          <button
            type="button"
            className="cc-btn"
            data-wall-drawings-dxf="1"
            disabled={!wallSheetList.length}
            title="AutoCAD only — do NOT open in VCarve"
            onClick={() => save('walls-dxf')}
          >
            Wall DXF
          </button>
          <button type="button" className="cc-btn" disabled={!sheet} onClick={() => save('svg')}>Export SVG</button>
          <button type="button" className="cc-btn-gold" disabled={!sheet} onClick={() => save('pdf')}>Export PDF</button>
        </>
      )}
    >
      {!unit && kind !== 'walls' ? (
        <p className="text-sm text-ink-400">Select a unit first — a drawing is of one unit.</p>
      ) : (
        <div className="space-y-3" data-drawing-kind={kind}>
          <div className="cc-row">
            <div className="flex flex-col">
              <span className="text-sm text-ink-100">
                {/* T42-F0: and the HEADING stops lying too. "No wall has a
                    cabinet on it" over a red failure box is the same untruth
                    the footer used to tell, said one line higher up. */}
                {kind === 'walls'
                  ? (wallAt?.name
                    || (wallError ? 'The wall set could not be built' : 'No wall has a cabinet on it'))
                  : unit.params.unit_num}
              </span>
              <span className="text-[11px] text-ink-400">
                {kind === 'walls'
                  // T71: the set prints its scale in the title block ("1:20 @
                  // A3", or NTS for a picture); the window repeats it.
                  ? (sheet
                    ? `${sheet.format.id} ${sheet.format.orientation} · ${sheet.scaleLabel || scaleLabel(sheet.scale)}`
                      + (wallSheetList.length ? ` · sheet ${sheet.sheetNo} of ${sheet.sheetOf}` : '')
                    : '—')
                  : (sheet
                    ? `${sheet.format.id} ${sheet.format.orientation}, drawn at ${scaleLabel(sheet.scale)}`
                      + ' — the largest standard scale that fits'
                    : '—')}
              </span>
            </div>
            <div className="flex gap-1">
              {[['unit-card', 'Card (3 views)'], ['front-elevation', 'Front only'], ['walls', 'Set']].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  data-drawing-kind-tab={id}
                  className={`cc-btn px-2 ${kind === id ? 'border-gold text-gold' : ''}`}
                  onClick={() => { setKind(id); setWallPage(0); }}
                >
                  {label}
                </button>
              ))}
              {/* T71: the set is A3 landscape by its own law; the paper choice
                  belongs to the unit card and the single elevation. */}
              {kind !== 'walls' ? (
                <>
                  <span className="w-px bg-shell-600 mx-1" />
                  {[{ id: 'auto', label: 'Auto' }, ...Object.values(PAGE_FORMATS)].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      title={f.id === 'auto' ? 'The smaller sheet, unless the bigger one draws it bigger' : ''}
                      className={`cc-btn px-2 ${format === f.id ? 'border-gold text-gold' : ''}`}
                      onClick={() => setFormat(f.id)}
                    >
                      {f.label}
                    </button>
                  ))}
                </>
              ) : null}
            </div>
          </div>

          {/* ─── TURN 40 (CLAUDE.md F5): THE SHEET LIST ──────────────────
              A wall set is `Wall A /1`, `Wall A /2`, `Wall B /1`, … and one
              `Horizontal section`. The window walks them; showing only the
              first would be a preview of a set nobody can see. */}
          {kind === 'walls' && wallSheetList.length ? (
            <div className="flex gap-1 flex-wrap" data-wall-sheets={wallSheetList.length}>
              {wallSheetList.map((page, i) => (
                <button
                  key={page.no || page.name}
                  type="button"
                  data-wall-sheet={page.name}
                  aria-pressed={i === Math.min(wallPage, wallSheetList.length - 1)}
                  className={`cc-btn px-2 text-[11px] ${i === Math.min(wallPage, wallSheetList.length - 1) ? 'border-gold text-gold' : ''}`}
                  onClick={() => setWallPage(i)}
                >
                  {page.no ? `${page.no} · ${page.name}` : page.name}
                </button>
              ))}
            </div>
          ) : null}

          {/* ─── T71: THE TITLE BLOCK'S WORDS ──────────────────────────────
              What every sheet's strip says and the engine cannot know: the
              company, who drew and checked it, the status and the revision.
              They ride the project (`setTitleBlock`); the company is
              remembered on this computer for the next job. */}
          {kind === 'walls' ? (
            <details className="text-[11px] text-ink-400" data-title-block="1">
              <summary className="cursor-pointer select-none">Title block: company, drawn by, status, revision</summary>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {[
                  ['Company', 'company.name', 'CABINET CORE'],
                  ['Tagline', 'company.tagline', 'Bespoke fitted furniture'],
                  ['Address, contact (use ; between lines)', 'company.lines', 'Unit 4, ...; 020 ...; hello@...'],
                  ['Site address', 'address', 'as the project, if empty'],
                  ['Drawn by', 'drawnBy', 'initials'],
                  ['Checked by', 'checkedBy', 'initials'],
                  ['Revision', 'rev', 'A'],
                  ['Date on the sheets', 'date', 'today, if empty'],
                ].map(([label, key, placeholder]) => {
                  const tb = project?.titleBlock || {};
                  const value = key === 'company.name' ? (tb.company?.name ?? '')
                    : key === 'company.tagline' ? (tb.company?.tagline ?? '')
                      : key === 'company.lines' ? (Array.isArray(tb.company?.lines) ? tb.company.lines.join('; ') : '')
                        : (tb[key] ?? '');
                  const onChange = (e) => {
                    const v = e.target.value;
                    if (key === 'company.name') setTitleBlock({ company: { name: v } });
                    else if (key === 'company.tagline') setTitleBlock({ company: { tagline: v } });
                    else if (key === 'company.lines') setTitleBlock({ company: { lines: v.split(';').map((x) => x.trim()).filter(Boolean) } });
                    else setTitleBlock({ [key]: v });
                  };
                  return (
                    <label key={key} className="block">
                      <span className="cc-label">{label}</span>
                      <input className="cc-input" data-title-block-field={key} value={value} placeholder={placeholder} onChange={onChange} />
                    </label>
                  );
                })}
                <label className="block">
                  <span className="cc-label">Status</span>
                  <select
                    className="cc-input"
                    data-title-block-field="status"
                    value={project?.titleBlock?.status || 'B'}
                    onChange={(e) => setTitleBlock({ status: e.target.value })}
                  >
                    {(profile.drawings.set?.statuses || []).map(([k, name]) => (
                      <option key={k} value={k}>{`${k} · ${name}`}</option>
                    ))}
                  </select>
                </label>
              </div>
            </details>
          ) : null}

          {/* ─── TURN 43 (CLAUDE.md F5b): SECTION A-A THROUGH: ─────────────
              The owner has asked for BOTH sections, twice. `/3` is the wall's
              own and needs no choosing; A-A is *"through the cabinet the owner
              points at"*, so this is where he points. Choosing appends a sheet
              to the SET — not a second preview — which is what makes it land
              in the PDF and in the DXF zip as well as on the glass. */}
          {kind === 'walls' && sectionChoices.length ? (
            <label className="flex items-center gap-2 text-[11px] text-ink-400" htmlFor="cc-section-aa">
              {/* T71: A-A and B-B are the set's own (the drawer unit, the
                  sink); a cabinet chosen here is one more station. */}
              <span>One more section through:</span>
              <select
                id="cc-section-aa"
                data-section-aa="1"
                className="cc-input px-1 py-0.5 text-[11px]"
                value={sectionUnitId}
                onChange={(e) => { setSectionUnitId(e.target.value); setWallPage(0); }}
              >
                <option value="">— none —</option>
                {sectionChoices.map((u) => (
                  <option key={u.id} value={u.id}>{`${u.unitNum} (Wall ${u.wallLabel})`}</option>
                ))}
              </select>
            </label>
          ) : null}

          {/* ─── TURN 42 (CLAUDE.md F0): CRASHED, OR GENUINELY EMPTY ───────
              THREE STATES, and they are three different sentences on the
              glass. Before tonight the first two were one sentence, which is
              how a dead feature and an empty job looked identical to the man
              holding the mouse. */}
          {kind === 'walls' && wallError ? (
            <p
              className="text-sm text-status-danger border border-status-danger/60 bg-status-danger/10 rounded px-2 py-1"
              data-wall-failed="1"
              data-wall-sheets="0"
            >
              Wall drawings failed: {drawingErrorText(wallError)}
              <span className="block text-[11px] text-status-danger/80">
                This is a FAULT, not an empty job — the whole error is in the browser console.
              </span>
            </p>
          ) : null}
          {kind === 'walls' && !wallError && !wallSheetList.length ? (
            <p className="text-sm text-ink-400" data-wall-sheets="0" data-wall-empty="1">
              No cabinet is standing against a wall yet — a wall drawing is of a wall.
            </p>
          ) : null}

          {/* …and when a cabinet was LEFT OFF a sheet, the window says which
              one and why, rather than dropping a wall out of the list without
              a word. `wallGroups` had the reason all along; nothing asked. */}
          {kind === 'walls' && wallReport?.walls?.some((w) => w.skipped.length) ? (
            <div className="text-[11px] text-status-warn" data-wall-skips="1">
              {wallReport.walls.filter((w) => w.skipped.length).map((w) => (
                <p key={w.wall}>
                  <b>{`Wall ${w.label}`}</b>
                  {w.elevation ? ' — drawn, but ' : ' — no elevation: '}
                  {w.skipped.map((sk) => `${sk.unit} ${sk.reason}`).join('; ')}
                  .
                </p>
              ))}
            </div>
          ) : null}

          {/* The preview IS the export: the same SVG string, so what is on
              screen cannot differ from what lands in the file. */}
          <div
            className="cc-drawing rounded border border-shell-600 bg-white p-2 overflow-auto"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: svg || '' }}
          />

          <p className="text-[11px] text-ink-400">
            Layer colours follow the AutoLISP view layers: magenta fronts, green shelves behind them in a
            hidden line, grey swing lines from the hinge side, teal hardware. Shelf positions are measured
            from the base, drawer fronts front by front.
          </p>
          {kind === 'walls' ? (
            <p className="text-[11px] text-ink-400" data-wall-note="1">
              One view per A3 sheet, every sheet with the same title strip: <b>00</b> cover with the index and
              revisions, <b>01</b> and <b>02</b> the plans cut through the base and the wall units, then per wall
              the <b>front view</b>, the <b>internal layout</b> (fronts off: shelves, drawer boxes, hinge plates, legs)
              and the <b>sections</b> A-A through the drawer unit and B-B through the sink, the <b>perspective</b>,
              the <b>visualisation</b> rendered from the scene, and the <b>cut list</b>. Every dimension appears once,
              in its own band. Fronts are magenta, handles green, the building fabric red. The DXF carries
              text and is <b>AutoCAD only, do NOT open it in VCarve</b>; the CNC export is a separate path
              and still ships no text of any kind.
            </p>
          ) : null}
        </div>
      )}
    </Modal>
  );
}
