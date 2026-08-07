import { useMemo, useState } from 'react';
import Modal from './Modal.jsx';
import { useUiStore } from '../stores/uiStore.js';
import { useProjectStore } from '../stores/projectStore.js';
import { useCabinetProfileStore } from '../stores/cabinetProfileStore.js';
import { resolveUnitDesign } from '../engine/design.js';
import { buildFrontElevation } from '../engine/drawings/frontElevation.js';
import { PAGE_FORMATS, layoutSheet, scaleLabel } from '../engine/drawings/sheet.js';
import { sheetToSvg } from '../engine/drawings/svg.js';
import { exportDrawingPdf, exportDrawingSvg } from '../lib/drawingExport.js';

// ─── Drawings ▸ Front elevation (turn 6, CLAUDE.md F7) ───
//
// A STYLE PROBE. One view, drawn the way Piotr's AutoLISP draws it, so turn 7
// has a calibrated look to build the rest of the set on — quality of line
// before number of views, in as many words.
//
// Everything except the preview frame is engine code (src/engine/drawings/):
// the geometry, the sheet, the layer colours and the SVG are pure and tested
// in node, and this file picks a paper size and offers two buttons.

export default function DrawingModal() {
  const closeModal = useUiStore((s) => s.closeModal);
  const notify = useUiStore((s) => s.notify);
  const selectedUnitId = useUiStore((s) => s.selectedUnitId);
  const units = useProjectStore((s) => s.units);
  const project = useProjectStore((s) => s.project);
  const unitResult = useProjectStore((s) => s.unitResult);
  const profile = useCabinetProfileStore((s) => s.profile);

  const [format, setFormat] = useState('A4');

  const unit = units.find((u) => u.id === selectedUnitId) || units[0] || null;

  const sheet = useMemo(() => {
    if (!unit) return null;
    const result = unitResult(unit.id);
    if (!result) return null;
    const drawing = buildFrontElevation(result, {
      unitNum: unit.params.unit_num,
      frontType: resolveUnitDesign(unit, project?.design).frontType,
      profile,
    });
    return layoutSheet({
      drawing,
      format,
      title: {
        project: project?.name,
        unit: unit.params.unit_num,
        view: 'Front elevation',
        date: new Date().toLocaleDateString(),
      },
      profile,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unit, format, profile, project?.name, project?.design, unitResult]);

  const svg = useMemo(() => (sheet ? sheetToSvg(sheet) : null), [sheet]);

  const save = (kind) => {
    if (!sheet) return;
    const args = { project: project?.name, unit: unit.params.unit_num };
    const { filename } = kind === 'pdf' ? exportDrawingPdf(sheet, args) : exportDrawingSvg(sheet, args);
    notify(`Saved ${filename}.`, 'ok');
  };

  return (
    <Modal
      title="Front elevation"
      width="w-[760px]"
      onClose={closeModal}
      footer={(
        <>
          <button type="button" className="cc-btn" onClick={closeModal}>Close</button>
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
            Layer colours follow the AutoLISP view layers: magenta fronts, green shelves behind them
            in a hidden line, grey swing lines from the hinge side. Two more views come in the next turn.
          </p>
        </div>
      )}
    </Modal>
  );
}
