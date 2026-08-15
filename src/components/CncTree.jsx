import { useEffect, useMemo, useRef, useState } from 'react';
import { useUiStore } from '../stores/uiStore.js';
import { useProjectStore } from '../stores/projectStore.js';
import { useCabinetProfileStore } from '../stores/cabinetProfileStore.js';
import { useMaterialAssignmentStore } from '../stores/materialAssignmentStore.js';
import {
  PART_GROUPS, QUICK_SELECTS, exportablePanels, groupOfPanel, panelIdsForQuickSelect,
  treePathOfPanel,
} from '../engine/cnc/groups.js';
import { groupByMaterial } from '../engine/cnc/views.js';
import { exportMaterialDxf, exportSheetDxf, exportUnitDxfZip } from '../lib/cncExport.js';
import { formatMm } from '../engine/format.js';

// ─── What is on the sheet (turn 11, CLAUDE.md F8.1/F8.2) ────────────────────
//
// The CNC view shows every unit's parts at once now, grouped per unit, and this
// is the tree that decides which of them are on it. It lives in the RIGHT PANEL
// — CLAUDE.md F8.2 asks for it there in as many words — which is also what makes
// "entering CNC no longer closes the panels" mean something: the panel that
// stays open is the one you need.
//
// Three levels, and each is a tick: the UNIT, the part GROUP inside it, and the
// part. Hiding is view state and nothing else (uiStore) — it is not in the
// project and does not survive a reload.
//
// The DOWNLOADS are here too, and they are turn 3's functions with turn 3's
// inputs: one unit's result and a list of panel ids. Nothing about the export
// path changed this turn, which is what test/cnc-export-identity.test.js holds
// it to.

export default function CncTree() {
  const units = useProjectStore((s) => s.units);
  const unitResult = useProjectStore((s) => s.unitResult);
  const selectedUnitId = useUiStore((s) => s.selectedUnitId);
  const selectUnit = useUiStore((s) => s.selectUnit);
  const notify = useUiStore((s) => s.notify);
  const profile = useCabinetProfileStore((s) => s.profile);

  const hiddenUnits = useUiStore((s) => s.cncHiddenUnits);
  const hiddenParts = useUiStore((s) => s.cncHiddenParts);
  const toggleCncUnit = useUiStore((s) => s.toggleCncUnit);
  const toggleCncPart = useUiStore((s) => s.toggleCncPart);
  const setCncParts = useUiStore((s) => s.setCncParts);
  const resetCncVisibility = useUiStore((s) => s.resetCncVisibility);

  const materials = useMaterialAssignmentStore((s) => s.materials);
  const storedDesign = useProjectStore((s) => s.project.design);
  // Turn 31 (CLAUDE.md F5): every file this panel writes is named after the job.
  const projectName = useProjectStore((s) => s.project.name);
  const runChecks = useProjectStore((s) => s.runChecks);
  const setCheckOpen = useUiStore((s) => s.setCheckOpen);

  const [open, setOpen] = useState(() => new Set());
  const [busy, setBusy] = useState(false);
  const [material, setMaterial] = useState('all');

  // ─── Turn 19 (CLAUDE.md F4): THE SHEET POINTS AT THE LIST ─────────────────
  //
  // "Kliknięcie 2 razy na dany element zabiera nas do listy po prawej, otwiera
  // i podświetla który to element."
  //
  // Three verbs and this is all three: OTWIERA — the unit's branch is expanded;
  // ZABIERA — the row is scrolled into view; PODŚWIETLA — it is lit until
  // something else is pointed at. Nothing is ticked, nothing is edited: the
  // export is byte-for-byte what it was, because this touches no export.
  //
  // The unit is only expanded, never collapsed: a joiner who has three branches
  // open and double-clicks a part in the fourth wants four open branches, not a
  // tree that closes behind him.
  const focus = useUiStore((s) => s.cncFocusPart);
  const rowRefs = useRef(new Map());
  useEffect(() => {
    if (!focus?.unitId) return;
    setOpen((prev) => (prev.has(focus.unitId) ? prev : new Set([...prev, focus.unitId])));
  }, [focus]);
  useEffect(() => {
    if (!focus?.panelId) return undefined;
    // One frame after the branch has been expanded, or the row does not exist
    // yet and there is nothing to scroll to.
    const id = requestAnimationFrame(() => {
      rowRefs.current.get(`${focus.unitId}|${focus.panelId}`)
        ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
    return () => cancelAnimationFrame(id);
  }, [focus]);

  const sheets = useMemo(() => units.map((u) => {
    const result = unitResult(u.id);
    return { unit: u, result, parts: result ? exportablePanels(result.panels) : [] };
  }), [units, unitResult]);

  const shownIds = (unitId, parts) => parts
    .filter((p) => !hiddenParts[unitId]?.[p.id])
    .map((p) => p.id);

  // ─── Turn 17 (CLAUDE.md F2.1): WHAT IS ON THE SHEET, BY BOARD ─────────────
  // The same entries the CNC view builds — the ticked cabinets and the ticked
  // parts inside them — so "one material" here means exactly the section the
  // owner is looking at, and never a second reading of the assignment.
  const entries = useMemo(() => sheets
    .filter((s) => s.result && !hiddenUnits[s.unit.id])
    .map((s) => ({
      unit: s.unit,
      result: s.result,
      panels: s.parts.filter((p) => !hiddenParts[s.unit.id]?.[p.id]),
    }))
    .filter((e) => e.panels.length), [sheets, hiddenUnits, hiddenParts]);

  const sections = useMemo(
    () => groupByMaterial(entries, { design: storedDesign, profile, materials }),
    [entries, storedDesign, profile, materials],
  );

  // A section that has just been unticked out of existence must not leave the
  // picker pointing at nothing — the download would then say "nothing on the
  // sheet for that material" about a board the joiner can still see listed.
  const materialKey = material === 'all' || sections.some((s) => s.key === material) ? material : 'all';

  // ─── TURN 31 (CLAUDE.md F3): THE EXPORT GATE, SAID ────────────────────────
  //
  // The gate itself is in lib/cncExport.js, so every one of these three buttons
  // is guarded whether or not its handler remembers. What belongs HERE is the
  // sentence and the way out: a RED that NAMES the parts that stayed behind —
  // red because it stays until it is clicked, which is what makes the button on
  // it reachable — carrying "Export anyway", which re-runs the very same press
  // with the owner's own judgement applied.
  // Turn 31 (CLAUDE.md F6): "…and the same list automatically before Export."
  // Every button on this panel goes past it. It does not block — it opens the
  // Check panel and says what is there.
  const preflight = (exportAnyway) => {
    if (exportAnyway) return;
    const found = runChecks();
    if (!found.length) return;
    const reds = found.filter((f) => f.level === 'red').length;
    setCheckOpen(true);
    notify(
      `Check: ${reds ? `${reds} fault${reds === 1 ? '' : 's'}` : `${found.length} to look at`} `
      + 'before this goes to the machine.',
      reds ? 'error' : 'warn',
    );
  };

  const sayGate = (res, again) => {
    if (res?.gateMessage) notify(res.gateMessage, 'error', { action: { label: 'Export anyway', run: again } });
  };

  const downloadMaterial = (exportAnyway = false) => {
    preflight(exportAnyway);
    try {
      const res = exportMaterialDxf(entries, {
        key: materialKey, design: storedDesign, materials, profile, exportAnyway, project: projectName,
      });
      notify(`${res.filename} — ${res.parts} parts off ${res.label}.`, 'ok');
      sayGate(res, () => downloadMaterial(true));
    } catch (e) {
      notify(e?.message || 'DXF export failed.', 'warn');
    }
  };

  const download = (sheet, kind, exportAnyway = false) => {
    preflight(exportAnyway);
    const ids = shownIds(sheet.unit.id, sheet.parts);
    if (!ids.length) { notify('Nothing ticked on this unit.', 'warn'); return; }
    if (kind === 'zip') {
      setBusy(true);
      exportUnitDxfZip(sheet.result, profile, { exportAnyway, project: projectName })
        .then((res) => {
          notify(`${res.filename} — ${res.files.length} DXF files.`, 'ok');
          sayGate(res, () => download(sheet, kind, true));
        })
        .catch((e) => notify(e?.message || 'DXF export failed.', 'warn'))
        .finally(() => setBusy(false));
      return;
    }
    try {
      const res = exportSheetDxf(sheet.result, ids, profile, { exportAnyway, project: projectName });
      notify(`${res.filename} — ${res.parts} parts, laid out as shown.`, 'ok');
      sayGate(res, () => download(sheet, kind, true));
    } catch (e) {
      notify(e?.message || 'DXF export failed.', 'warn');
    }
  };

  if (!units.length) {
    return <p className="p-3 text-sm text-ink-400">Nothing to cut yet — add a unit in 3D.</p>;
  }

  return (
    <div className="p-2.5 space-y-2">
      <div className="cc-row">
        <span className="text-[11px] uppercase tracking-wide text-ink-400">On the sheet</span>
        <button type="button" className="cc-btn px-2" onClick={resetCncVisibility}>Show all</button>
      </div>

      {/* ─── Turn 17 (CLAUDE.md F2.1): CHOOSE THE MATERIAL, EXPORT THE LOT ───
          One board, one file, across every ticked cabinet — the section the
          sheet is already showing, sent to the machine. "All" is the export
          the app has always had and is still the default. */}
      <div className="border border-shell-600 rounded p-2 space-y-1.5" data-material-export="1">
        <span className="text-[11px] uppercase tracking-wide text-ink-400">Export by material</span>
        <select
          className="cc-input w-full"
          data-export-material="1"
          value={materialKey}
          title="Which assigned board to send. One material, one file — laid out exactly as the sheet shows it."
          onChange={(e) => setMaterial(e.target.value)}
        >
          <option value="all">All materials</option>
          {sections.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label} · {s.units.reduce((n, u) => n + u.panels.length, 0)} parts
            </option>
          ))}
        </select>
        <button
          type="button"
          className="cc-btn-gold w-full"
          data-download-material="1"
          disabled={!entries.length}
          onClick={() => downloadMaterial(false)}
        >
          Download DXF — {materialKey === 'all' ? 'all materials' : (sections.find((s) => s.key === materialKey)?.label || 'material')}
        </button>
        <p className="text-[10px] text-ink-400 leading-snug">
          The file carries each part’s own label and nothing else — no headings, no material names, no
          counts. Those are for the screen.
        </p>
      </div>

      {sheets.map((sheet) => {
        const { unit, parts } = sheet;
        const unitOn = !hiddenUnits[unit.id];
        const isOpen = open.has(unit.id);
        const on = shownIds(unit.id, parts).length;
        return (
          <div key={unit.id} className={`border rounded ${unit.id === selectedUnitId ? 'border-gold/60' : 'border-shell-600'}`}>
            <div className="flex items-center gap-2 px-2 py-1.5">
              <button
                type="button"
                aria-pressed={unitOn}
                title={unitOn ? 'Take this unit off the sheet' : 'Put it back on the sheet'}
                onClick={() => toggleCncUnit(unit.id)}
              >
                <Tick state={unitOn ? 'on' : 'off'} />
              </button>
              <button
                type="button"
                className="flex-1 text-left text-sm text-ink-100 truncate hover:text-gold"
                title="Make this the unit the downloads are about"
                onClick={() => selectUnit(unit.id)}
              >
                {unit.params.unit_num}
              </button>
              <span className="text-[10px] text-ink-400 tabular-nums">{on}/{parts.length}</span>
              <button
                type="button"
                className="text-ink-400 text-[10px] w-4"
                aria-expanded={isOpen}
                // Turn 25: the acceptance walk opens the branch with a real
                // click before reading the four groups (CLAUDE.md F7), and a
                // caret with no name of its own is a caret nothing can aim at.
                data-cnc-branch={unit.id}
                title={isOpen ? 'Hide the parts' : 'Show the parts'}
                onClick={() => setOpen((prev) => {
                  const next = new Set(prev);
                  if (next.has(unit.id)) next.delete(unit.id); else next.add(unit.id);
                  return next;
                })}
              >
                {isOpen ? '▾' : '▸'}
              </button>
            </div>

            {isOpen && (
              <div className="px-1.5 pb-1.5">
                {/* ─── Turn 16 (CLAUDE.md F2.1) ───
                    The SPRAYED / NON-SPRAYED pair is gone from the view: which
                    board a part comes off is the sheet's own grouping now, and
                    a button that sorted parts by whether they meet a spray gun
                    was answering a question the sheet answers better. What is
                    left is the two selections that are about the PARTS — the
                    whole unit, and the fronts — and they are the same
                    `panelIdsForPreset` the export has used since turn 3.
                    Nothing about the EXPORT changed: the presets are all still
                    in engine/cnc/groups.js and still name the files. */}
                {/* ─── Turn 25 (CLAUDE.md F7.2): FIVE QUICK-SELECT BUTTONS ───
                    All · Carcasses · Shelves · Doors, fronts & panels ·
                    Infills & plinths, each ticking its WHOLE group. They are
                    derived from the same `PART_GROUPS` the headers below are
                    drawn from (engine/cnc/groups.js), so a button and the
                    header it selects cannot come to mean different things —
                    which is what the old row did, where the buttons were EXPORT
                    PRESETS and the headers were groups. */}
                <div className="grid grid-cols-2 gap-1 pb-1.5">
                  {QUICK_SELECTS.map((q) => (
                    <button
                      key={q.id}
                      type="button"
                      title={q.hint || ''}
                      data-cnc-quick={q.id}
                      className="px-1.5 py-1 text-[10px] rounded border border-shell-600 text-ink-100 hover:bg-shell-700"
                      onClick={() => {
                        const wanted = new Set(panelIdsForQuickSelect(parts, q.id));
                        setCncParts(unit.id, parts.map((p) => p.id), false);
                        setCncParts(unit.id, [...wanted], true);
                      }}
                    >
                      {q.label}
                    </button>
                  ))}
                </div>

                {PART_GROUPS.map((g) => {
                  const mine = parts.filter((p) => groupOfPanel(p) === g.id);
                  if (!mine.length) return null;
                  const lit = mine.filter((p) => !hiddenParts[unit.id]?.[p.id]).length;
                  // Turn 19 (F4): which GROUP the double-clicked part is in —
                  // the engine's own answer, so the header a joiner's eye lands
                  // on and the row that is highlighted cannot disagree.
                  const inGroup = focus?.unitId === unit.id
                    && treePathOfPanel(parts, focus.panelId)?.group === g.id;
                  return (
                    <div key={g.id} className="mb-1">
                      <button
                        type="button"
                        data-cnc-group={g.id}
                        data-cnc-group-focus={inGroup ? '1' : '0'}
                        className={`w-full flex items-center gap-2 px-1 py-0.5 rounded hover:bg-shell-700 text-left ${inGroup ? 'text-gold' : ''}`}
                        title={g.hint}
                        onClick={() => setCncParts(unit.id, mine.map((p) => p.id), lit !== mine.length)}
                      >
                        <Tick state={lit === mine.length ? 'on' : (lit === 0 ? 'off' : 'some')} />
                        <span className="text-[11px] text-ink-100 flex-1 truncate">{g.label}</span>
                        <span className="text-[10px] text-ink-400 tabular-nums">{lit}/{mine.length}</span>
                      </button>
                      <ul>
                        {mine.map((p) => {
                          const isFocus = focus?.unitId === unit.id && focus?.panelId === p.id;
                          return (
                          <li key={p.id}>
                            <button
                              type="button"
                              ref={(el) => {
                                const key = `${unit.id}|${p.id}`;
                                if (el) rowRefs.current.set(key, el);
                                else rowRefs.current.delete(key);
                              }}
                              data-cnc-row={p.id}
                              data-cnc-row-focus={isFocus ? '1' : '0'}
                              className={`w-full flex items-center gap-2 pl-6 pr-1 py-0.5 rounded hover:bg-shell-700 text-left ${hiddenParts[unit.id]?.[p.id] ? 'opacity-45' : ''} ${isFocus ? 'bg-gold/15 ring-1 ring-gold/70' : ''}`}
                              onClick={() => toggleCncPart(unit.id, p.id)}
                            >
                              <Tick state={hiddenParts[unit.id]?.[p.id] ? 'off' : 'on'} small />
                              <span className="text-[11px] text-ink-100 flex-1 truncate font-mono">{p.id}</span>
                              <span className="text-[10px] text-ink-400 tabular-nums">
                                {formatMm(p.w)}×{formatMm(p.h)}
                              </span>
                            </button>
                          </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })}

                <div className="space-y-1 pt-1">
                  <button type="button" className="cc-btn-gold w-full" onClick={() => download(sheet, 'sheet')}>
                    Download DXF (one file)
                  </button>
                  <button type="button" className="cc-btn w-full" disabled={busy} onClick={() => download(sheet, 'zip')}>
                    {busy ? 'Zipping…' : 'Download ZIP (per panel)'}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      <p className="text-[10px] text-ink-400 leading-snug">
        Ticks change what the sheet SHOWS and what the one-file DXF contains. The per-panel ZIP is always
        the whole unit — it is there for re-cutting one damaged formatka.
      </p>
    </div>
  );
}

// Drawn rather than an <input type="checkbox">: the row is the button, and a
// real checkbox inside a button is a nested control the browser fights over.
function Tick({ state, small = false }) {
  const box = small ? 'w-3 h-3' : 'w-3.5 h-3.5';
  if (state === 'on') {
    return (
      <span className={`${box} shrink-0 rounded-sm bg-gold border border-gold flex items-center justify-center`}>
        <svg viewBox="0 0 10 10" className="w-2.5 h-2.5" aria-hidden="true">
          <path d="M1.5 5.2 L4 7.5 L8.5 2.5" fill="none" stroke="#131313" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }
  if (state === 'some') {
    return (
      <span className={`${box} shrink-0 rounded-sm border border-gold flex items-center justify-center`}>
        <span className="w-1.5 h-0.5 bg-gold" />
      </span>
    );
  }
  return <span className={`${box} shrink-0 rounded-sm border border-shell-500`} />;
}
