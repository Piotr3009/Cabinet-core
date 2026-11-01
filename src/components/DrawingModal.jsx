import { useEffect, useMemo, useState } from 'react';
import Modal from './Modal.jsx';
import RenderModal from './RenderModal.jsx';
// T-CC1b F13 · A4's card, mounted here under the sheet list (one line, CLAUDE.md T-CC1b PART D).
import AiVisualCard from './drawings/AiVisualCard.jsx';
import { useUiStore } from '../stores/uiStore.js';
import { useProjectStore } from '../stores/projectStore.js';
import { useCabinetProfileStore } from '../stores/cabinetProfileStore.js';
import { useAuthStore } from '../stores/authStore.js';
import { resolveUnitDesign } from '../engine/design.js';
// T-CC1b F7 · the company's logo from Joinery Core; F8 · a picture kept with the item is kept small.
import { companyLogo as loadCompanyMark } from '../lib/jcLogo.js';
import { keepPicture } from '../lib/keepPicture.js';
import { visualNumbers } from '../lib/visualNumbers.js';
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
// T83 F11 · `pickedSheets`: the sheets the window ticked, in the set's order.
import {
  pickedSheets, wallDrawingSheets, wallSectionUnits, wallSetReport, visualAspect,
} from '../engine/drawings/wallSheets.js';
// ─── T71: THE SET, AS A JOINER'S SET ────────────────────────────────────────
// The owner, Skylon's own AutoCAD set on the table: *"nasze w CC teraz się
// nakładają, a tutaj jest wszystko osobno"*, and *"weź zakoduj"*. The set is
// now cover, plans, one view per sheet per wall, perspective, visualisation
// and cut list (`wallDrawingSheets`), on one A3 law. This window walks it,
// carries the title block's words (who drew it, status, revision) and asks
// the scene for the render the visualisation sheet frames.
// T81 F2 · and the set is the OWNER'S order now (22.10.2026, 21:23): the 3D
// first, every wall's fronts, every wall without fronts, every wall in X-ray,
// the plans, the sections, the visualisation, the cut list. The buttons walk
// the list the engine returns, so they follow it with no list of their own.
import { renderJob } from '../engine/render.js';
import { scaleLabel } from '../engine/drawings/sheet.js';
import { sheetToSvg } from '../engine/drawings/svg.js';
// T82 F20 · the logo beside the company (*"dodawanie loga do rysunkow"*).
import { logoOf } from '../engine/drawings/setSheet.js';
import {
  drawingErrorText,
  exportWallDrawingsDxf, exportWallDrawingsPdf,
  readLogoFile,
} from '../lib/drawingExport.js';

// ─── Drawings (turn 6 F7 — one view; turn 7 F1 — the card) ───
//
// Turn 6 drew a single front elevation as a STYLE PROBE, so that this turn had
// a calibrated look to build the rest of the set on. This is the rest: three
// views on one sheet, dimensioned the way a bench measures, plus the bound book
// that carries the whole project.
//
// Everything except the preview frame is engine code (src/engine/drawings/):
// the geometry, the sheet, the layer colours and the SVG are pure and tested in
// node. This file picks a paper size and offers the buttons — and the PREVIEW
// IS THE EXPORT, the same SVG string either way, so what is on screen cannot
// differ from what lands in the file.

// ─── T-CC1b F6 · ONE WINDOW, ONE EXPORT ─────────────────────────────────────
// The owner, 01.11.2026: *"usunac card 3D view i front only"* and *"usunac
// przyciski all units i drawing set pdf, tylko export pdf"*. The window is the
// set and nothing else: the unit card, the single front elevation, their kind
// row and their paper choice, the all-units book, the SVG and the per-sheet PDF are
// gone; Export PDF binds the ticked sheets, Wall DXF stays (PROPOSED: the
// AutoCAD road has no other door).
const KINDS = {
  // TURN 40 (F5): the whole run, not one cabinet.
  // T71: the whole set, not the walls alone.
  walls: { title: 'Drawings', view: 'wall-elevation' },
};

export default function DrawingModal({ rig = null }) {
  const closeModal = useUiStore((s) => s.closeModal);
  // Where this modal opens (turn 12, rule 15): beside whatever asked for it.
  // Nothing to work out here — the opener said, and the shell places it.
  const anchor = useUiStore((s) => s.modalArgs?.anchor) || null;
  const notify = useUiStore((s) => s.notify);
  const modalArgs = useUiStore((s) => s.modalArgs);
  const units = useProjectStore((s) => s.units);
  const project = useProjectStore((s) => s.project);
  const allResults = useProjectStore((s) => s.allResults);
  // T71: the design layer's worktops go on the sheets, and the title block's
  // words live on the project.
  const worktopsOf = useProjectStore((s) => s.worktopsOf);
  const setTitleBlock = useProjectStore((s) => s.setTitleBlock);
  const setVisual = useProjectStore((s) => s.setVisual);
  const profile = useCabinetProfileStore((s) => s.profile);
  const tenantId = useAuthStore((s) => s.tenant?.id || null);

  // T-CC1b F6 · one kind, the set; `modalArgs` still says where the window opened from.
  void modalArgs;
  const kind = 'walls';
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
  // ─── T83 F11 · EXPORT THE SHEETS YOU CHOOSE ────────────────────────────────
  // The owner, 25.10.2026 (22:41): *"daj mozliwosc exportowania tylko
  // naprzyklad frontow lub cos takiego, nie koniecznie wszystkie strony na
  // raz"*. A check box per sheet of the set, all on by default: the window
  // keeps the names it was told to LEAVE OUT, so a sheet the set grows while
  // the window is open is ticked as every sheet starts. A drawing choice, not
  // a design decision: never in the project, gone when the window closes.
  const [leftOut, setLeftOut] = useState(() => new Set());
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
  // ─── T-CC1b F8 · TWO ANGLES AND THE RENDER AS SHEETS (law 8) ──────────────
  // The owner, 01.11.2026: *"dodac wizualizacje z drugiego kata, render wedlug
  // wyboru, wizualizacja AI z renderu, max 3 proby, wybierasz jedna i dodajesz
  // do rysunkow"*. The one render became `visuals = { isoLeft, isoRight,
  // render, ai }`: the two angles captured here as the one was (presets
  // 'iso-left' and 'iso-right', engine/render.js), the user's own render and
  // the chosen AI picture read off the item (`project.visuals`, INT's field).
  const [angles, setAngles] = useState({ isoLeft: null, isoRight: null });
  useEffect(() => {
    if (kind !== 'walls' || !rig || !units.length) { setAngles({ isoLeft: null, isoRight: null }); return undefined; }
    let cancelled = false;
    const frame = requestAnimationFrame(() => {
      if (cancelled) return;
      const shoot = (preset) => {
        try {
          const job = renderJob({
            resolution: 'preview',
            preset,
            shadows: profile.render.defaultShadows,
            aspect: visualAspect(profile),
            bounds: rig.bounds(null),
            project: project?.name,
            subject: 'set',
          }, profile);
          return rig.capture(job)?.dataUrl || null;
        } catch (e) {
          // T42-F0's law: a catch REPORTS. The set still binds without the picture.
          // eslint-disable-next-line no-console
          console.error(`[wall drawings] the visualisation render (${preset}) failed`, e);
          return null;
        }
      };
      const next = { isoLeft: shoot('iso-left'), isoRight: shoot('iso-right') };
      if (!cancelled) setAngles(next);
    });
    return () => { cancelled = true; cancelAnimationFrame(frame); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, rig, units, project?.design, project?.name, profile]);
  const visuals = useMemo(() => ({
    isoLeft: angles.isoLeft,
    isoRight: angles.isoRight,
    render: project?.visuals?.render || null,
    ai: project?.visuals?.ai || null,
  }), [angles, project?.visuals]);

  // ─── T-CC1b F7 · THE LOGO IS THE COMPANY'S ────────────────────────────────
  // *"logo domyslne z JC albo przycisk wstaw inne logo"* (the owner, 01.11.2026).
  // ONE read of Joinery Core's company_settings per session (lib/jcLogo.js);
  // a file the browser refuses leaves no logo and one line of words.
  const [companyMark, setCompanyMark] = useState({ href: null, logo: null, error: null });
  useEffect(() => {
    let live = true;
    loadCompanyMark({ tenantId, profile }).then((got) => { if (live) setCompanyMark(got); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);
  // F8.1 · the Render window opened over this one; its picture kept under profile.visuals.maxKb (PROPOSED 400).
  const [renderOpen, setRenderOpen] = useState(false);
  const keepRender = async ({ dataUrl, preset }) => {
    const { maxKb } = visualNumbers(profile);
    const kept = await keepPicture(dataUrl, { maxKb });
    if (!kept.dataUrl) { notify(kept.error, 'warn'); return; }
    setVisual('render', { dataUrl: kept.dataUrl, preset, at: new Date().toISOString() });
    setRenderOpen(false);
    notify(`The render is on the sheet Visualisation, render (${Math.ceil(kept.bytes / 1024)} KB, kept with the item).`, 'ok');
  };
  const ownLogoRaw = project?.titleBlock?.company?.logo;
  const logoRemoved = ownLogoRaw === 'none';
  const sheetCompanyLogo = logoRemoved ? null : companyMark.logo;

  const wallSet = useMemo(() => {
    if (kind !== 'walls') return { sheets: [], error: null, report: null };
    try {
      const sheets = wallDrawingSheets({
        entries: allResults(),
        project,
        room: project?.room,
        // T71: the slabs the design layer carries, resolved by the store.
        worktops: worktopsOf(),
        visuals,
        companyLogo: sheetCompanyLogo,
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
  }, [kind, units, project, profile, date, allResults, sectionUnitId, visuals, sheetCompanyLogo]);

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
  // T83 F11 · what Export PDF and Wall DXF bind: the ticked sheets, in the set's order.
  const wallPicked = useMemo(() => pickedSheets(wallSheetList, (s) => !leftOut.has(s.name)), [wallSheetList, leftOut]);
  const tickSheet = (name, on) => setLeftOut((was) => {
    const next = new Set(was);
    if (on) next.delete(name); else next.add(name);
    return next;
  });

  // T-CC1b F6 · the sheet on screen is the set's; there is no other kind.
  const sheet = wallAt?.sheet || null;

  const svg = useMemo(
    () => (sheet ? sheetToSvg(sheet, { kind: KINDS.walls.view }) : null),
    [sheet],
  );

  // ─── T82 F20 · THE LOGO BESIDE THE COMPANY ────────────────────────────────
  // The owner, 25.10.2026, 11:40: *"do tego dodawanie loga do rysunkow musze
  // miec dzisiaj profesjonalne rysunki dla klientow"*. "Choose image" reads a
  // PNG, JPG or SVG (`readLogoFile`: drawn down to the profile's size, an SVG
  // given its PNG for the PDF) and keeps it WITH the company, so it is
  // remembered on this computer where the company's name is (`setTitleBlock`
  // remembers the company whole); "Remove" takes it off every sheet.
  // T-CC1b F7.2 · the row shows the item's own logo, else the company's; "Insert other logo" is the Choose
  // image road above (unchanged inside), "Use company logo" clears the item's own so the company's shows again,
  // "Remove" takes every logo off this item's sheets ('none').
  const logo = logoOf(ownLogoRaw);
  const [screenLogoBroken, setScreenLogoBroken] = useState(false);
  const shownLogoHref = logo ? logo.href : (!logoRemoved && companyMark.logo ? companyMark.href : null);
  useEffect(() => { setScreenLogoBroken(false); }, [shownLogoHref]);
  const chooseLogo = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const picked = await readLogoFile(file, profile);
      const { remembered } = setTitleBlock({ company: { logo: picked } }) || {};
      // T82 F20, after the review: the logo is kept once on this computer;
      // when the browser refuses it, the window says so in words.
      if (remembered === false) {
        notify(`Logo ${file.name} is on this job's sheets, but this computer's storage refused to keep it, so the next job will not open with it.`, 'warn');
      } else {
        notify(`Logo ${file.name} is on every sheet of the set.`, 'ok');
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[drawings] logo', err);
      notify(drawingErrorText(err), 'warn');
    }
  };

  const save = (target) => {
    // TURN 40 (F5): the wall set binds as a whole — every sheet, in order.
    if (target === 'walls-pdf' || target === 'walls-dxf') {
      // T42-F0: a CRASH is not an empty job, and it never again borrows that
      // sentence. The button is disabled in both states, so this is the belt to
      // the braces — and it still says which of the two it is.
      if (wallError) { notify(`Wall drawings failed: ${drawingErrorText(wallError)}`, 'warn'); return; }
      if (!wallSheetList.length) { notify('No cabinet is standing against a wall yet.', 'warn'); return; }
      // T83 F11 · nothing ticked is refused in words (the buttons stay live, as T42 F0 keeps them), never an empty file.
      if (!wallPicked.length) { notify('No sheet is ticked: tick the sheets to export, or press All.', 'warn'); return; }
      try {
        if (target === 'walls-pdf') {
          // T42-F0: `exportWallDrawingsPdf` now LOOKS at the bytes it produced
          // — `%PDF`, and a page per sheet — so the word "Saved" is a
          // measurement rather than a claim. Anything else lands in the catch
          // below, which speaks.
          const { filename, pages } = exportWallDrawingsPdf(wallPicked.map((x) => x.sheet), {
            project: project?.name,
          });
          notify(`Saved ${filename} — ${pages} sheets.`, 'ok');
          return;
        }
        exportWallDrawingsDxf(wallPicked, { project: project?.name })
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
    // T-CC1b F6 · the all-units book, the SVG and the per-sheet PDF roads are deleted with their buttons.
  };

  return (
    <Modal
      name="drawing"
      anchor={anchor}
      title={KINDS.walls.title}
      width="w-[880px]"
      onClose={closeModal}
      footer={(
        <>
          <button type="button" className="cc-btn" onClick={closeModal}>Close</button>
          {/* ─── TURN 40 (CLAUDE.md F5): THE WALL SET ─────────────────────
              The DXF as a SEPARATE output that says on the button what it
              says on every sheet in it. T-CC1b F6: kept, secondary (PROPOSED). */}
          <button
            type="button"
            className="cc-btn"
            data-wall-drawings-dxf="1"
            disabled={!wallSheetList.length}
            title="AutoCAD only: do NOT open in VCarve"
            onClick={() => save('walls-dxf')}
          >
            Wall DXF
          </button>
          {/* T-CC1b F6 · *"tylko export pdf"*: the ticked sheets, in the set's order; nothing ticked, nothing to press. */}
          <button
            type="button"
            className="cc-btn-gold"
            data-wall-drawings-pdf="1"
            data-wall-drawings-pages={wallPicked.length}
            disabled={!wallPicked.length}
            title="The ticked sheets of the set, in its order"
            onClick={() => save('walls-pdf')}
          >
            Export PDF
          </button>
        </>
      )}
    >
      {(
        <div className="space-y-3" data-drawing-kind={kind}>
          <div className="cc-row">
            <div className="flex flex-col">
              <span className="text-sm text-ink-100">
                {/* T42-F0: and the HEADING stops lying too. "No wall has a
                    cabinet on it" over a red failure box is the same untruth
                    the footer used to tell, said one line higher up. */}
                {wallAt?.name
                  || (wallError ? 'The wall set could not be built' : 'No wall has a cabinet on it')}
              </span>
              <span className="text-[11px] text-ink-400">
                {/* T71: the set prints its scale in the title block ("1:20 @
                    A3", or NTS for a picture); the window repeats it. */}
                {sheet
                  ? `${sheet.format.id} ${sheet.format.orientation} · ${sheet.scaleLabel || scaleLabel(sheet.scale)}`
                    + (wallSheetList.length ? ` · sheet ${sheet.sheetNo} of ${sheet.sheetOf}` : '')
                  : 'no sheet'}
              </span>
            </div>
            {/* T-CC1b F8.1 · the user's own render, through the same Render window (its shots and its
                resolution untouched), kept with the item as a sheet of the set. */}
            <div className="flex gap-1 items-center">
              <button
                type="button"
                className="cc-btn px-2"
                data-drawing-render="1"
                disabled={!rig || !units.length}
                title="Render the scene with a camera and a resolution of your choosing; the picture becomes the sheet Visualisation, render"
                onClick={() => setRenderOpen(true)}
              >
                Render...
              </button>
              {project?.visuals?.render ? (
                <button type="button" className="cc-btn px-2" data-drawing-render-remove="1" onClick={() => setVisual('render', null)}>
                  Remove render
                </button>
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
                <span key={page.no || page.name} className="inline-flex items-center gap-1">
                  {/* T83 F11 · this sheet goes into the PDF and the DXF when ticked. */}
                  <input
                    type="checkbox"
                    data-wall-sheet-pick={page.name}
                    aria-label={`Export ${page.name}`}
                    title="Export this sheet with Export PDF and Wall DXF"
                    checked={!leftOut.has(page.name)}
                    onChange={(ev) => tickSheet(page.name, ev.target.checked)}
                  />
                  <button
                    type="button"
                    data-wall-sheet={page.name}
                    aria-pressed={i === Math.min(wallPage, wallSheetList.length - 1)}
                    className={`cc-btn px-2 text-[11px] ${i === Math.min(wallPage, wallSheetList.length - 1) ? 'border-gold text-gold' : ''}`}
                    onClick={() => setWallPage(i)}
                  >
                    {page.no ? `${page.no} · ${page.name}` : page.name}
                  </button>
                </span>
              ))}
            </div>
          ) : null}
          {kind === 'walls' && wallSheetList.length ? (
            <div className="flex gap-2 items-center text-[11px] text-ink-400" data-wall-sheets-picked={wallPicked.length}>
              <span>{`Export: ${wallPicked.length} of ${wallSheetList.length} sheets ticked, bound in the set's order and numbered 1 to ${wallPicked.length}.`}</span>
              <button type="button" className="cc-btn px-2 text-[11px]" data-wall-sheets-all="1" onClick={() => setLeftOut(new Set())}>All</button>
              <button type="button" className="cc-btn px-2 text-[11px]" data-wall-sheets-none="1" onClick={() => setLeftOut(new Set(wallSheetList.map((p) => p.name)))}>None</button>
            </div>
          ) : null}
          {/* T-CC1b F13 · the AI visualisation card, under the sheet list; it writes project.visuals.ai itself. */}
          <AiVisualCard project={project} visuals={visuals} />
          {renderOpen ? (
            <RenderModal rig={rig} onResult={keepRender} onClose={() => setRenderOpen(false)} />
          ) : null}

          {/* ─── T71: THE TITLE BLOCK'S WORDS ──────────────────────────────
              What every sheet's strip says and the engine cannot know: the
              company, who drew and checked it, the status and the revision.
              They ride the project (`setTitleBlock`); the company is
              remembered on this computer for the next job. */}
          {kind === 'walls' ? (
            <details className="text-[11px] text-ink-400" data-title-block="1">
              <summary className="cursor-pointer select-none">Title block: company, logo, drawn by, status, revision</summary>
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
                  const field = (
                    <label key={key} className="block">
                      <span className="cc-label">{label}</span>
                      <input className="cc-input" data-title-block-field={key} value={value} placeholder={placeholder} onChange={onChange} />
                    </label>
                  );
                  if (key !== 'company.name') return field;
                  // T82 F20 · the LOGO row, beside Company: kept with it.
                  return [field, (
                    <div key="company.logo" className="block" data-title-block-field="company.logo">
                      <span className="cc-label">Logo (PNG, JPG or SVG)</span>
                      <div className="flex items-center gap-1">
                        {shownLogoHref && !screenLogoBroken ? (
                          <img
                            src={shownLogoHref}
                            alt={logo ? 'Logo' : 'Company logo from Joinery Core'}
                            title={logo ? 'This item\'s own logo' : 'The company logo from Joinery Core'}
                            className="h-7 w-7 object-contain bg-white rounded border border-shell-600"
                            data-title-block-logo={logo ? 'own' : 'company'}
                            onError={() => setScreenLogoBroken(true)}
                          />
                        ) : null}
                        <label className="cc-btn px-2 cursor-pointer" data-title-block-logo-choose="1">
                          Insert other logo
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/svg+xml,.png,.jpg,.jpeg,.svg"
                            className="sr-only"
                            data-title-block-logo-input="1"
                            onChange={chooseLogo}
                          />
                        </label>
                        <button
                          type="button"
                          className="cc-btn px-2"
                          data-title-block-logo-company="1"
                          disabled={!companyMark.logo || (!logo && !logoRemoved)}
                          title="Clear this item's own logo, so the company's from Joinery Core shows again"
                          onClick={() => setTitleBlock({ company: { logo: null } })}
                        >
                          Use company logo
                        </button>
                        <button
                          type="button"
                          className="cc-btn px-2"
                          data-title-block-logo-remove="1"
                          disabled={!logo && (logoRemoved || !companyMark.logo)}
                          title="No logo on this item's sheets"
                          onClick={() => setTitleBlock({ company: { logo: 'none' } })}
                        >
                          Remove
                        </button>
                      </div>
                      {companyMark.error && !logo && !logoRemoved ? (
                        <span className="block text-[11px] text-status-warn" data-title-block-logo-refused="1">{companyMark.error}</span>
                      ) : null}
                    </div>
                  )];
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
              {/* T81 F2 · the owner's order, 22.10.2026: *"najpierw chce widziec 3d jak zrobiles pierwsza
                  strona, pozniej chce widziec wszystkie fronty ... nastepnie widok wszystkich scian bez
                  frontow ... pozniej przekroj z gory, i pozniej przekroje pionowe, a na koncu wizualizacja"*. */}
              One view per A3 sheet, every sheet with the same title strip, in the owner&apos;s order: <b>01</b> the
              room in <b>3D</b> with the index and the revisions, then every wall&apos;s <b>fronts</b> (only what the eye
              sees), every wall <b>without fronts</b> (the fronts lifted off), every wall in <b>X-ray</b>, the two
              <b> plans</b> cut through the base and the wall units, every wall&apos;s <b>sections</b>, the
              <b> visualisations</b> (the left and the right angle, your own render and the chosen AI picture when
              the item has them), and the <b>cut list</b>. Tick the sheets you want and press <b>Export PDF</b>.
              Every dimension appears once, in its own band. Fronts are magenta, handles green, the building fabric
              red. The DXF carries text and is <b>AutoCAD only, do NOT open it in VCarve</b>; the CNC export is a
              separate path and still ships no text of any kind.
            </p>
          ) : null}
        </div>
      )}
    </Modal>
  );
}
