import { useMemo, useState } from 'react';
import Modal from './Modal.jsx';
import { useUiStore } from '../stores/uiStore.js';
import { useProjectStore } from '../stores/projectStore.js';
import { useCabinetProfileStore } from '../stores/cabinetProfileStore.js';
import { resolveUnitDesign } from '../engine/design.js';
import { buildFrontElevation } from '../engine/drawings/frontElevation.js';
import { projectBookletSheets, unitCardSheet } from '../engine/drawings/card.js';
import { PAGE_FORMATS, layoutSheet, scaleLabel } from '../engine/drawings/sheet.js';
import { sheetToSvg } from '../engine/drawings/svg.js';
import { exportBookletPdf, exportDrawingPdf, exportDrawingSvg } from '../lib/drawingExport.js';

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
};

export default function DrawingModal() {
  const closeModal = useUiStore((s) => s.closeModal);
  const notify = useUiStore((s) => s.notify);
  const modalArgs = useUiStore((s) => s.modalArgs);
  const selectedUnitId = useUiStore((s) => s.selectedUnitId);
  const units = useProjectStore((s) => s.units);
  const project = useProjectStore((s) => s.project);
  const unitResult = useProjectStore((s) => s.unitResult);
  const allResults = useProjectStore((s) => s.allResults);
  const profile = useCabinetProfileStore((s) => s.profile);

  const requested = modalArgs?.kind === 'front-elevation' ? 'front-elevation' : 'unit-card';
  const [kind, setKind] = useState(requested);
  const [format, setFormat] = useState('A4');

  const unit = units.find((u) => u.id === selectedUnitId) || units[0] || null;
  const date = useMemo(() => new Date().toLocaleDateString(), []);

  const sheet = useMemo(() => {
    if (!unit) return null;
    const result = unitResult(unit.id);
    if (!result) return null;
    if (kind === 'front-elevation') {
      const drawing = buildFrontElevation(result, {
        unitNum: unit.params.unit_num,
        frontType: resolveUnitDesign(unit, project?.design).frontType,
        profile,
      });
      return layoutSheet({
        drawing,
        format,
        title: { project: project?.name, unit: unit.params.unit_num, view: 'Front elevation', date },
        profile,
      });
    }
    return unitCardSheet({ result, unit, project, profile, format, date });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unit, kind, format, profile, project?.name, project?.design, unitResult, date]);

  const svg = useMemo(
    () => (sheet ? sheetToSvg(sheet, { kind: KINDS[kind]?.view || 'unit-card' }) : null),
    [sheet, kind],
  );

  const view = KINDS[kind]?.view || 'unit-card';

  const save = (target) => {
    if (target === 'booklet') {
      try {
        const sheets = projectBookletSheets({
          entries: allResults(), project, profile, format, date,
        });
        const { filename, pages } = exportBookletPdf(sheets, { project: project?.name });
        notify(`Saved ${filename} — ${pages} pages.`, 'ok');
      } catch (e) {
        notify(e.message || 'Nothing to draw yet.', 'warn');
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
      title={kind === 'front-elevation' ? 'Front elevation' : 'Unit card'}
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
          <button type="button" className="cc-btn" disabled={!sheet} onClick={() => save('svg')}>Export SVG</button>
          <button type="button" className="cc-btn-gold" disabled={!sheet} onClick={() => save('pdf')}>Export PDF</button>
        </>
      )}
    >
      {!unit ? (
        <p className="text-sm text-ink-400">Select a unit first — a drawing is of one unit.</p>
      ) : (
        <div className="space-y-3">
          <div className="cc-row">
            <div className="flex flex-col">
              <span className="text-sm text-ink-100">{unit.params.unit_num}</span>
              <span className="text-[11px] text-ink-400">
                Drawn at {sheet ? scaleLabel(sheet.scale) : '—'} — the largest standard scale that fits
              </span>
            </div>
            <div className="flex gap-1">
              {[['unit-card', 'Card (3 views)'], ['front-elevation', 'Front only']].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={`cc-btn px-2 ${kind === id ? 'border-gold text-gold' : ''}`}
                  onClick={() => setKind(id)}
                >
                  {label}
                </button>
              ))}
              <span className="w-px bg-shell-600 mx-1" />
              {Object.values(PAGE_FORMATS).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={`cc-btn px-2 ${format === f.id ? 'border-gold text-gold' : ''}`}
                  onClick={() => setFormat(f.id)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

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
        </div>
      )}
    </Modal>
  );
}
