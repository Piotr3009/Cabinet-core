/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
import { useEffect, useMemo, useState } from 'react';

import Modal from './Modal.jsx';
import MaterialPicker, { StockPhoto, PhotoCard } from './MaterialPicker.jsx';
import { useUiStore } from '../stores/uiStore.js';
import { useProjectStore } from '../stores/projectStore.js';
import { useCabinetProfileStore } from '../stores/cabinetProfileStore.js';
import { useMaterialLinkStore } from '../stores/materialLinkStore.js';
import {
  DEPARTMENTS, SHEET_BRANDS, catalogueEntries, entriesOf, entryById,
} from '../engine/catalogue.js';
import { LINK_WORDS, purchaseBom } from '../engine/bom.js';
import { migrateDesign } from '../engine/design.js';
import { decorById, decorLabel } from '../engine/decors.js';
import { loadDecorCatalogue } from '../lib/decorCatalogue.js';
import { decorFamily, familiesInCatalogue } from '../lib/decorFamilies.js';
import { JC_OFFLINE } from '../lib/jcApi.js';
import { LINKS_NOT_SET_UP } from '../lib/jcLinks.js';
import { categoryTree, STOCK_EMPTY, STOCK_PAGE } from '../lib/jcStock.js';
import {
  acceptAllLinks, formKindOf, linkStatus, matchesEntry, offcutPctOf, paintFields, rowToken, sheetFields, suggestAll,
} from '../lib/linkSuggest.js';

/**
 * ─── T-CC2a F8 · LINK MATERIALS (CLAUDE.md T-CC2a laws 3 and 7) ─────────────
 *
 * The owner, 01.11.2026: *"zebysmy przypisali pewne materialy na stale nie do
 * projektu, tylko na stale i wtedy cokolwiek sobie wygeneruje projekt to ma
 * albo juz przypisane materialy albo jest napisane materials not assigned"*;
 * the layout: *"departamenty podzielone na gorze plyty, ironmongery etc etc, nie
 * scrolowane ... polaczenie A i C plus B"*; *"link bedzie lepiej brzmial"*.
 *
 * Every entry of Cabinet Core's catalogue (engine/catalogue.js), linked ONCE
 * to one row of the company's own Joinery Core stock, for every project. The
 * maximised work window of SprayingPanel (near full screen, a restore button,
 * drags when restored), the font floor `cc-modal-wide`. Back to project top
 * left (the team's rule: the way back is top left), the shell's cross top
 * right. The departments are TABS with their counts, never one scrolled list
 * of every group. LEFT the tab's table (the Cabinet Core material, its link,
 * the price, the status), RIGHT the company's stock (MaterialPicker, the
 * component the Stock window uses) with a Link button per row. A sheet cannot
 * be linked without its width and length (law 6); every save goes to Joinery
 * Core at once (useMaterialLinkStore.link / unlink) and a refusal is said on
 * its row. A suggestion is a sentence with an Accept, never a link (law 8).
 * No catalogue id is ever written into the page (*"nie widoczna numeracja"*):
 * the rows carry a token of it (lib/linkSuggest.js rowToken).
 */

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'not-linked', label: 'Not linked' },
  { id: 'used', label: 'Used in this project' },
];

const LINKED = 'Linked';

/** The tone of a tab's count: green when every entry is linked, amber otherwise. */
const toneOf = (linked, total) => (total === 0 ? 'none' : linked === total ? 'all' : 'some');

const money = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? `£${Number(v).toFixed(2)}` : '');

/** The decor behind an entry (an EGGER sheet, its edging), or null. */
function decorOf(entry) {
  if (!entry?.decorId) return null;
  return decorById(entry.decorId) || decorById(String(entry.decorId).toUpperCase()) || null;
}

export default function LinkMaterialsModal() {
  const closeModal = useUiStore((s) => s.closeModal);
  const popModal = useUiStore((s) => s.popModal);
  // Opened over Project settings (pushModal), the way back is to it; opened from the BOM or the rail, it closes.
  const stacked = useUiStore((s) => (s.modalStack || []).length > 0);
  const goBack = stacked && popModal ? popModal : closeModal;
  const notify = useUiStore((s) => s.notify);
  const args = useUiStore((s) => s.modalArgs) || {};
  const anchor = args.anchor || null;

  const links = useMaterialLinkStore((s) => s.links);
  const stock = useMaterialLinkStore((s) => s.stock);
  const categories = useMaterialLinkStore((s) => s.categories);
  const status = useMaterialLinkStore((s) => s.status);
  const error = useMaterialLinkStore((s) => s.error);
  const stockStatus = useMaterialLinkStore((s) => s.stockStatus);
  const companyName = useMaterialLinkStore((s) => s.companyName);
  const rowErrors = useMaterialLinkStore((s) => s.rowErrors) || {};
  const saving = useMaterialLinkStore((s) => s.saving) || {};
  const load = useMaterialLinkStore((s) => s.load);
  const link = useMaterialLinkStore((s) => s.link);
  const unlink = useMaterialLinkStore((s) => s.unlink);

  const profile = useCabinetProfileStore((s) => s.profile);
  const allResults = useProjectStore((s) => s.allResults);
  const units = useProjectStore((s) => s.units);
  const runElements = useProjectStore((s) => s.runElements);
  const storedDesign = useProjectStore((s) => s.project.design);
  const bespoke = useProjectStore((s) => s.project.bespoke);
  const pricedAt = useProjectStore((s) => s.project.warehouseStamp) || null;

  const opened = args.entryId ? entryById(args.entryId) : null;
  const [tab, setTab] = useState(opened?.department || args.department || DEPARTMENTS[0].id);
  const [brand, setBrand] = useState(opened?.brand || 'egger');
  const [family, setFamily] = useState(null);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedId, setSelectedId] = useState(opened?.id || null);
  const [pending, setPending] = useState(null);       // the small form: { entryId, row, kind, width, length, offcut, coverage }
  const [acceptAll, setAcceptAll] = useState(null);   // { ticked: Set, width, length, offcut }
  const [enlarged, setEnlarged] = useState(null);     // { url, fill, title, caption, anchor }
  const [decorsReady, setDecorsReady] = useState(0);

  // The stock and the links: once per session (the store decides), and the decor pack for the thumbnails.
  useEffect(() => { load?.()?.catch?.(() => {}); }, [load]);
  useEffect(() => {
    let live = true;
    loadDecorCatalogue().then(() => { if (live) setDecorsReady((n) => n + 1); }).catch(() => {});
    return () => { live = false; };
  }, []);

  // Opened at an entry (the BOM's Link, Project settings' Link): its row is brought into view once.
  useEffect(() => {
    if (!opened || typeof document === 'undefined') return;
    const el = document.querySelector?.(`[data-link-row="${rowToken(opened.id)}"]`);
    el?.scrollIntoView?.({ block: 'center' });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const stockOk = (stockStatus ?? (status === 'ok' ? 'ok' : 'offline')) === 'ok';
  const readOnly = status !== 'ok';
  const fromProject = Boolean(args.from);

  // ── what THIS project uses: the purchase list's own catalogue ids (one road, bom.js purchaseBom) ──
  const usedIds = useMemo(() => {
    try {
      const entries = allResults();
      const { rows } = purchaseBom(entries, {
        links, stock, profile, design: migrateDesign(storedDesign), pricedAt, bespoke: bespoke || [],
      });
      return new Set((rows || []).map((r) => r.catalogueId).filter(Boolean));
    } catch {
      return new Set();
    }
  }, [allResults, units, runElements, links, stock, profile, storedDesign, pricedAt, bespoke]);

  const statusOf = (entry) => linkStatus(entry, links, stock, { stockOk });

  // ── the counts: the whole catalogue, and each department ──
  const live = useMemo(() => catalogueEntries().filter((e) => !e.retired), []);
  const totals = useMemo(() => {
    const per = {};
    let linked = 0;
    for (const d of DEPARTMENTS) per[d.id] = { linked: 0, total: 0 };
    for (const e of live) {
      const ok = linkStatus(e, links, stock, { stockOk }).status === 'linked';
      if (ok) linked += 1;
      if (!per[e.department]) per[e.department] = { linked: 0, total: 0 };
      per[e.department].total += 1;
      if (ok) per[e.department].linked += 1;
    }
    return { linked, total: live.length, per };
  }, [live, links, stock, stockOk]);

  // ── the tab's entries: department, then the sheet brand and the decor family ──
  const tabEntries = useMemo(() => entriesOf(tab), [tab]);
  const scoped = useMemo(() => {
    let list = tab === 'sheets' ? tabEntries.filter((e) => (e.brand || 'generic') === brand) : tabEntries;
    if (tab === 'sheets' && brand === 'egger' && family) list = list.filter((e) => decorFamily(decorOf(e)) === family);
    return list.filter((e) => matchesEntry(e, q));
    // decorsReady: the families are read off the decor pack once it has landed.
  }, [tabEntries, tab, brand, family, q, decorsReady]); // eslint-disable-line react-hooks/exhaustive-deps
  const counts = useMemo(() => ({
    all: scoped.length,
    'not-linked': scoped.filter((e) => linkStatus(e, links, stock, { stockOk }).status !== 'linked').length,
    used: scoped.filter((e) => usedIds.has(e.id)).length,
  }), [scoped, links, stock, stockOk, usedIds]);
  const shown = useMemo(() => {
    if (filter === 'not-linked') return scoped.filter((e) => linkStatus(e, links, stock, { stockOk }).status !== 'linked');
    if (filter === 'used') return scoped.filter((e) => usedIds.has(e.id));
    return scoped;
  }, [scoped, filter, links, stock, stockOk, usedIds]);

  const families = useMemo(() => {
    if (tab !== 'sheets' || brand !== 'egger') return [];
    const seen = new Map();
    for (const e of tabEntries) {
      if (e.brand !== 'egger') continue;
      const d = decorOf(e);
      if (d && !seen.has(d.id)) seen.set(d.id, d);
    }
    return familiesInCatalogue([...seen.values()]);
  }, [tab, brand, tabEntries, decorsReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── the suggestions of the tab (law 8: a sentence and an Accept, nothing saved) ──
  const suggestions = useMemo(
    () => suggestAll(tabEntries, stock, links, { stockOk }),
    [tabEntries, stock, links, stockOk],
  );
  const suggestionItems = useMemo(
    () => tabEntries.filter((e) => suggestions.has(e.id)).map((e) => ({ entry: e, row: suggestions.get(e.id) })),
    [tabEntries, suggestions],
  );

  const selected = selectedId ? entryById(selectedId) : null;
  const tree = useMemo(() => categoryTree(categories), [categories]);
  const yieldDefault = offcutPctOf(profile?.materials?.sheetYield);

  const switchTab = (id) => {
    setTab(id); setFamily(null); setFilter('all'); setQ(''); setPending(null); setAcceptAll(null);
    if (selected && selected.department !== id) setSelectedId(null);
  };

  /** The next row of the list that is not linked yet, after `entryId`: the hand goes on linking. */
  const nextAfter = (entryId) => {
    const at = shown.findIndex((e) => e.id === entryId);
    const rest = [...shown.slice(at + 1), ...shown.slice(0, Math.max(0, at))];
    return rest.find((e) => e.id !== entryId && statusOf(e).status !== 'linked')?.id || null;
  };

  const save = async (list, { advanceFrom = null } = {}) => {
    const res = await link(list);
    if (res?.ok) {
      setPending(null);
      if (fromProject) notify('Saved for all projects', 'success');
      // Opened at ONE line (the BOM's or Project settings' Link): the selection stays on it, never moves on by itself
      // to an entry the joiner did not choose (the walk of 01.11.2026, station g). From the rail, the hand goes on linking.
      if (advanceFrom && !fromProject) setSelectedId(nextAfter(advanceFrom));
    }
    return res;
  };

  /** Link the selected entry to a stock row: a sheet and a paint ask first, the rest is one click. */
  const startLink = (entry, row) => {
    if (!entry || !row || readOnly) return;
    const kind = formKindOf(entry);
    if (!kind) { save([{ cc_material_id: entry.id, stock_item_id: row.id }], { advanceFrom: entry.id }); return; }
    const own = statusOf(entry).link;
    setPending({
      entryId: entry.id,
      row,
      kind,
      width: own?.sheet_width_mm ?? '',
      length: own?.sheet_length_mm ?? '',
      offcut: own?.yield ? offcutPctOf(own.yield) : yieldDefault,
      coverage: own?.coverage_m2_per_l ?? '',
    });
  };

  const choose = (entry) => {
    setSelectedId(entry.id);
    if (pending && pending.entryId !== entry.id) setPending(null);
  };

  const notSetUp = status === 'not-set-up';
  const offline = status === 'offline';
  const loading = status === 'idle' || status === 'loading';
  const stockEmpty = stockOk && !loading && stock.length === 0;
  const pct = totals.total ? Math.round((totals.linked / totals.total) * 100) : 0;

  return (
    <Modal
      name="link-materials"
      anchor={anchor}
      title={(
        <span className="flex items-center gap-3">
          <button type="button" className="cc-btn" data-link-back="1" onClick={goBack} title="Close this window and go back to the project">
            Back to project
          </button>
          <span className="text-ink-50">Link materials</span>
        </span>
      )}
      onClose={closeModal}
      maximised
      width="w-[1240px]"
      className="cc-modal-wide"
    >
      <div className="flex flex-col gap-3 h-full min-h-0" data-link-materials="1">
        {/* THE HEADER: whose links these are, and how many are done. */}
        <div className="flex items-start gap-4">
          <p className="flex-1 text-ink-200" data-link-subline="1">
            {`Every material Cabinet Core uses, linked once to your Joinery Core stock. Saved for ${companyName || 'your company'}.`}
          </p>
          <div className="w-[260px] shrink-0" data-link-count={String(totals.linked)} data-link-total={String(totals.total)}>
            <div className="text-right text-ink-100 tabular-nums">{`${totals.linked} of ${totals.total} linked`}</div>
            <div className="h-1.5 rounded bg-shell-600 mt-1 overflow-hidden" data-link-bar={String(pct)}>
              <div className={`h-full ${pct === 100 ? 'bg-status-ok' : 'bg-gold'}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>

        {/* THE STATES, in words (F8.6). */}
        {offline && (
          <div className="flex items-center gap-2 rounded px-2 py-1.5 border border-status-warn/60 bg-status-warn/10 text-status-warn" data-link-offline="1">
            <span className="flex-1">{error || JC_OFFLINE}</span>
            <button type="button" className="cc-btn" data-link-retry="1" onClick={() => load?.({ force: true })}>Retry</button>
          </div>
        )}
        {notSetUp && (
          <div className="flex items-center gap-2 rounded px-2 py-1.5 border border-status-warn/60 bg-status-warn/10 text-status-warn" data-link-not-set-up="1">
            <span className="flex-1">{LINKS_NOT_SET_UP} The list below is read only until it is.</span>
            <button type="button" className="cc-btn" data-link-retry="1" onClick={() => load?.({ force: true })}>Retry</button>
          </div>
        )}
        {loading && <p className="text-ink-400" data-link-loading="1">Reading your Joinery Core stock and links...</p>}

        {/* THE DEPARTMENTS, as tabs with their counts (F8.2): never one scrolled list. */}
        <div className="flex flex-wrap gap-1 border-b border-shell-600 pb-2" role="tablist" data-link-tabs="1">
          {DEPARTMENTS.map((d) => {
            const c = totals.per[d.id] || { linked: 0, total: 0 };
            const tone = toneOf(c.linked, c.total);
            return (
              <button
                key={d.id}
                type="button"
                role="tab"
                aria-selected={tab === d.id}
                className={`cc-btn ${tab === d.id ? 'border-gold text-gold' : ''}`}
                data-link-tab={d.id}
                data-link-tab-tone={tone}
                onClick={() => switchTab(d.id)}
              >
                {d.label}
                <span
                  className={`ml-2 tabular-nums ${tone === 'all' ? 'text-status-ok' : tone === 'some' ? 'text-status-warn' : 'text-ink-400'}`}
                  data-link-tab-count={`${c.linked}/${c.total}`}
                >
                  {`${c.linked} / ${c.total}`}
                </span>
              </button>
            );
          })}
        </div>

        {tab === 'sheets' && (
          <div className="flex flex-col gap-1.5" data-link-sheet-filters="1">
            <div className="flex flex-wrap gap-1" data-link-brands="1">
              {SHEET_BRANDS.map((b) => (b.soon ? (
                <span
                  key={b.id}
                  className="cc-btn opacity-50 cursor-not-allowed"
                  aria-disabled="true"
                  title={`${b.label}: coming soon`}
                  data-link-brand={b.id}
                  data-link-brand-soon="1"
                >
                  {b.label}
                  <span className="cc-tag ml-1.5">Coming soon</span>
                </span>
              ) : (
                <button
                  key={b.id}
                  type="button"
                  className={`cc-btn ${brand === b.id ? 'border-gold text-gold' : ''}`}
                  aria-pressed={brand === b.id}
                  data-link-brand={b.id}
                  onClick={() => { setBrand(b.id); setFamily(null); }}
                >
                  {b.label}
                </button>
              )))}
            </div>
            {brand === 'egger' && families.length > 0 && (
              <div className="flex flex-wrap gap-1" data-link-families="1">
                <button
                  type="button"
                  className={`cc-btn px-2 py-0.5 ${family == null ? 'border-gold text-gold' : ''}`}
                  aria-pressed={family == null}
                  data-link-family=""
                  onClick={() => setFamily(null)}
                >
                  All decors
                </button>
                {families.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className={`cc-btn px-2 py-0.5 ${family === f.id ? 'border-gold text-gold' : ''}`}
                    aria-pressed={family === f.id}
                    data-link-family={f.id}
                    onClick={() => setFamily(family === f.id ? null : f.id)}
                  >
                    {f.label}
                    <span className="ml-1 text-ink-400 tabular-nums">{f.count}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-4 flex-1 min-h-0">
          {/* LEFT: the tab's table. */}
          <div className="flex-[3] min-w-0 flex flex-col gap-2 min-h-0" data-link-left="1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="relative flex items-center w-[320px]">
                <input
                  className="cc-input pr-7"
                  value={q}
                  placeholder="Search by name or decor code"
                  data-link-search="1"
                  onChange={(e) => setQ(e.target.value)}
                />
                {q !== '' && (
                  <button
                    type="button"
                    className="absolute right-1 px-1.5 text-ink-400 hover:text-gold"
                    aria-label="Clear the search"
                    title="Clear the search"
                    data-link-search-clear="1"
                    onClick={() => setQ('')}
                  >
                    ✕
                  </button>
                )}
              </span>
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={`cc-btn px-2 py-0.5 ${filter === f.id ? 'border-gold text-gold' : ''}`}
                  aria-pressed={filter === f.id}
                  data-link-filter={f.id}
                  data-link-filter-count={String(counts[f.id])}
                  onClick={() => setFilter(f.id)}
                >
                  {`${f.label} ${counts[f.id]}`}
                </button>
              ))}
              <span className="flex-1" />
              {suggestionItems.length > 0 && !acceptAll && (
                <button
                  type="button"
                  className="cc-btn"
                  disabled={readOnly}
                  data-link-accept-all="1"
                  onClick={() => setAcceptAll({
                    ticked: new Set(suggestionItems.map((it) => it.entry.id)), width: '', length: '', offcut: yieldDefault,
                  })}
                >
                  {`Accept all suggestions (${suggestionItems.length})`}
                </button>
              )}
            </div>

            {acceptAll && (
              <AcceptAllPanel
                items={suggestionItems}
                state={acceptAll}
                onState={setAcceptAll}
                disabled={readOnly}
                onCancel={() => setAcceptAll(null)}
                onSave={async (list) => {
                  const res = await save(list);
                  if (res?.ok) setAcceptAll(null);
                }}
              />
            )}

            <div className="cc-scroll flex-1 min-h-0 border border-shell-600 rounded" data-link-table="1" data-link-rows={String(shown.length)}>
              {shown.length === 0 && (
                <p className="px-3 py-4 text-ink-400" data-link-empty="1">
                  {scoped.length === 0 && q ? 'No material matches the search.' : 'Nothing in this list.'}
                </p>
              )}
              {shown.length > 0 && (
                <table>
                  <thead className="sticky top-0 bg-shell-800 text-ink-400 border-b border-shell-600">
                    <tr>
                      <th className="text-left font-normal">Cabinet Core material</th>
                      <th className="text-right font-normal">Thickness</th>
                      <th className="text-left font-normal">Joinery Core material</th>
                      <th className="text-right font-normal">Price</th>
                      <th className="text-left font-normal">Status</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((entry) => (
                      <EntryRow
                        key={entry.id}
                        entry={entry}
                        state={statusOf(entry)}
                        used={usedIds.has(entry.id)}
                        selected={selectedId === entry.id}
                        suggestion={suggestions.get(entry.id) || null}
                        rowError={rowErrors[entry.id] || null}
                        busy={Boolean(saving[entry.id])}
                        readOnly={readOnly}
                        pending={pending?.entryId === entry.id ? pending : null}
                        onPending={setPending}
                        onChoose={() => choose(entry)}
                        onAccept={(row) => { choose(entry); startLink(entry, row); }}
                        onChange={() => choose(entry)}
                        onUnlink={() => unlink(entry.id)}
                        onSave={(list) => save(list, { advanceFrom: entry.id })}
                        onEnlarge={setEnlarged}
                      />
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* RIGHT: the company's stock, the component the Stock window uses (F8.4). */}
          <div className="flex-[2] min-w-0 flex flex-col gap-2 min-h-0" data-link-stock="1">
            <div className="text-ink-100" data-link-target={selected ? rowToken(selected.id) : ''}>
              {selected
                ? <>Linking: <span className="text-gold">{selected.name}</span></>
                : <span className="text-ink-400">Choose a material on the left, then press Link on its row of your stock.</span>}
            </div>
            {stockEmpty && (
              <div className="flex items-center gap-2 rounded px-2 py-1.5 border border-shell-600" data-link-stock-empty="1">
                <span className="flex-1">{STOCK_EMPTY}</span>
                <a className="cc-btn" href={STOCK_PAGE} target="_blank" rel="noreferrer" data-link-open-stock="1">Open Stock</a>
              </div>
            )}
            <MaterialPicker
              materials={stock}
              value={pending?.row?.id || (selected ? statusOf(selected).link?.stock_item_id : null) || null}
              tree={tree}
              testId="link"
              showKind={false}
              categoryChips
              maxHeight="60vh"
              emptyText={stockOk ? STOCK_EMPTY : (error || JC_OFFLINE)}
              onLink={(row) => startLink(selected, row)}
              linkDisabled={readOnly || !selected}
            />
            <p className="text-ink-400" data-link-not-in-list="1">
              Not in the list? Add it to your Joinery Core stock first, then link it here.{' '}
              <a className="text-gold underline" href={STOCK_PAGE} target="_blank" rel="noreferrer" data-link-open-stock="1">Open Stock</a>
            </p>
          </div>
        </div>
      </div>
      {enlarged && (
        <PhotoCard
          url={enlarged.url}
          fill={enlarged.fill}
          title={enlarged.title}
          caption={enlarged.caption}
          anchor={enlarged.anchor}
          onClose={() => setEnlarged(null)}
        />
      )}
    </Modal>
  );
}

/** One catalogue entry: what Cabinet Core calls it, what it is linked to, its price, its status. */
function EntryRow({
  entry, state, used, selected, suggestion, rowError, busy, readOnly, pending,
  onPending, onChoose, onAccept, onChange, onUnlink, onSave, onEnlarge,
}) {
  const decor = decorOf(entry);
  const label = decor ? decorLabel(decor) : '';
  const row = state.row;
  const words = state.status === 'linked' ? LINKED : state.status === 'removed' ? LINK_WORDS.removed : LINK_WORDS.notLinked;
  const tone = state.status === 'linked' ? 'text-status-ok' : 'text-status-danger';
  return (
    <>
      <tr
        className={`border-b border-shell-600/60 cursor-pointer ${selected ? 'outline outline-2 outline-gold -outline-offset-2 bg-gold/5' : 'hover:bg-shell-700/40'}`}
        data-link-row={rowToken(entry.id)}
        data-link-status={state.status}
        data-link-selected={selected ? '1' : '0'}
        data-link-used={used ? '1' : '0'}
        onClick={onChoose}
      >
        <td>
          <div className="flex items-center gap-2">
            {decor && (
              <StockPhoto
                url={decor.thumb}
                fill={decor.hex}
                alt={label}
                testId="decor"
                onOpen={(anchor) => onEnlarge({ url: decor.thumb, fill: decor.hex, title: label, caption: label, anchor })}
              />
            )}
            <div className="min-w-0">
              <div className="text-ink-50">{entry.name}</div>
              {/* The licence of engine/decors.js: EGGER, the code and the name, NEXT TO the picture. */}
              {decor && <div className="text-ink-400" data-link-decor-label="1">{label}</div>}
            </div>
          </div>
        </td>
        <td className="text-right tabular-nums text-ink-200 whitespace-nowrap">{entry.thickness ? `${entry.thickness} mm` : ''}</td>
        <td>
          {row ? (
            <div className="flex items-center gap-2" data-link-jc="1">
              <StockPhoto
                url={row.image_url}
                alt={row.name}
                testId="jc"
                onOpen={(anchor) => onEnlarge({
                  url: row.image_url, title: row.name, caption: [row.item_number, row.name].filter(Boolean).join(', '), anchor,
                })}
              />
              <div className="min-w-0">
                <div className="text-ink-400 tabular-nums">{row.item_number || ''}</div>
                <div className="text-ink-100">{row.name}</div>
              </div>
            </div>
          ) : null}
          {!row && suggestion && state.status !== 'linked' && (
            <div className="flex items-center gap-2" data-link-suggested="1">
              <span className="text-ink-200">{`Suggested: ${suggestion.name}`}</span>
              <button
                type="button"
                className="cc-btn px-2 py-0.5"
                disabled={readOnly || busy}
                data-link-accept="1"
                onClick={(e) => { e.stopPropagation?.(); onAccept(suggestion); }}
              >
                Accept
              </button>
            </div>
          )}
        </td>
        <td className="text-right tabular-nums whitespace-nowrap">
          {row && money(row.price) ? `${money(row.price)}${row.unit ? ` / ${row.unit}` : ''}` : ''}
        </td>
        <td>
          <span className={tone} data-link-words="1">{words}</span>
          {busy && <div className="text-ink-400">Saving...</div>}
          {rowError && <div className="text-status-danger" data-link-row-error="1">{rowError}</div>}
        </td>
        <td className="text-right whitespace-nowrap">
          {state.link && (
            <>
              <button
                type="button"
                className="cc-btn-ghost"
                disabled={readOnly || busy}
                data-link-change="1"
                title="Choose another row of your stock on the right"
                onClick={(e) => { e.stopPropagation?.(); onChange(); }}
              >
                Change link
              </button>
              <button
                type="button"
                className="cc-btn-ghost text-status-danger"
                disabled={readOnly || busy}
                data-link-unlink="1"
                onClick={(e) => { e.stopPropagation?.(); onUnlink(); }}
              >
                Unlink
              </button>
            </>
          )}
        </td>
      </tr>
      {pending && (
        <tr data-link-form-row={rowToken(entry.id)}>
          <td colSpan={6}>
            <LinkForm entry={entry} pending={pending} onPending={onPending} disabled={readOnly || busy} onSave={onSave} />
          </td>
        </tr>
      )}
    </>
  );
}

/** The small form a sheet (both sizes required) or a paint (coverage, optional) asks for before the link is saved. */
function LinkForm({
  entry, pending, onPending, disabled, onSave,
}) {
  const put = (patch) => onPending({ ...pending, ...patch });
  const sheet = pending.kind === 'sheet';
  const check = sheet
    ? sheetFields({ width: pending.width, length: pending.length, offcutPct: pending.offcut })
    : paintFields({ coverage: pending.coverage });
  const submit = () => {
    if (!check.ok || disabled) return;
    onSave([{ cc_material_id: entry.id, stock_item_id: pending.row.id, ...check.values }]);
  };
  return (
    <div className="flex flex-wrap items-end gap-3 rounded border border-gold/60 bg-shell-700/40 p-2" data-link-form={pending.kind}>
      <div className="basis-full text-ink-100">
        {'Link to '}
        <span className="text-gold">{pending.row.name}</span>
        {pending.row.item_number ? <span className="text-ink-400">{`, ${pending.row.item_number}`}</span> : null}
      </div>
      {sheet ? (
        <>
          <Field label="Sheet width (mm)" error={pending.width !== '' ? check.errors.width : null}>
            <input className={`cc-input w-[120px] text-right ${pending.width === '' ? 'border-status-danger' : ''}`} inputMode="numeric" required value={pending.width} data-link-sheet-width="1" onChange={(e) => put({ width: e.target.value })} />
          </Field>
          <Field label="Sheet length (mm)" error={pending.length !== '' ? check.errors.length : null}>
            <input className={`cc-input w-[120px] text-right ${pending.length === '' ? 'border-status-danger' : ''}`} inputMode="numeric" required value={pending.length} data-link-sheet-length="1" onChange={(e) => put({ length: e.target.value })} />
          </Field>
          <Field label="Offcut allowance (%)" error={check.errors.offcut}>
            <input className="cc-input w-[100px] text-right" inputMode="decimal" value={pending.offcut} data-link-offcut="1" onChange={(e) => put({ offcut: e.target.value })} />
          </Field>
        </>
      ) : (
        <Field label="Coverage (m² per litre)" error={check.errors.coverage}>
          <input className="cc-input w-[120px] text-right" inputMode="decimal" value={pending.coverage} placeholder="optional" data-link-coverage="1" onChange={(e) => put({ coverage: e.target.value })} />
        </Field>
      )}
      <button type="button" className="cc-btn-gold" disabled={disabled || !check.ok} data-link-save="1" onClick={submit}>Save link</button>
      <button type="button" className="cc-btn" data-link-cancel="1" onClick={() => onPending(null)}>Cancel</button>
      {sheet && !check.ok && (pending.width === '' || pending.length === '') && (
        <span className="text-status-danger basis-full" data-link-form-hint="1">
          Type the sheet&apos;s width and length: Cabinet Core counts the sheets to buy from them.
        </span>
      )}
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <label className="block">
      <span className="cc-label">{label}</span>
      {children}
      {error && <span className="block text-status-danger" data-link-field-error="1">{error}</span>}
    </label>
  );
}

/** Accept all suggestions of a tab (F9.2): a tick each, the sheet size asked ONCE for the ticked sheets. */
function AcceptAllPanel({
  items, state, onState, disabled, onCancel, onSave,
}) {
  const tickedItems = items.filter((it) => state.ticked.has(it.entry.id));
  const plan = acceptAllLinks(items, state.ticked, { width: state.width, length: state.length, offcutPct: state.offcut });
  const needsSheet = tickedItems.some((it) => formKindOf(it.entry) === 'sheet');
  const toggle = (id) => {
    const next = new Set(state.ticked);
    if (next.has(id)) next.delete(id); else next.add(id);
    onState({ ...state, ticked: next });
  };
  return (
    <section className="rounded border border-gold/60 bg-shell-700/40 p-2 space-y-2" data-link-accept-all-panel="1">
      <div className="text-ink-100">Accept these suggestions. Untick any you do not want; nothing is saved until you press Link.</div>
      <ul className="cc-scroll max-h-[28vh] space-y-0.5">
        {items.map(({ entry, row }) => (
          <li key={entry.id}>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={state.ticked.has(entry.id)}
                data-link-accept-tick={rowToken(entry.id)}
                onChange={() => toggle(entry.id)}
              />
              <span className="text-ink-100">{entry.name}</span>
              <span className="text-ink-400">to</span>
              <span className="text-gold">{row.name}</span>
              {row.item_number && <span className="text-ink-400">{row.item_number}</span>}
            </label>
          </li>
        ))}
      </ul>
      {needsSheet && (
        <div className="flex flex-wrap items-end gap-3" data-link-accept-all-sheet="1">
          <span className="basis-full text-ink-200">One sheet size for every ticked sheet:</span>
          <Field label="Sheet width (mm)" error={state.width !== '' ? plan.errors.width : null}>
            <input className="cc-input w-[120px] text-right" inputMode="numeric" value={state.width} data-link-sheet-width="1" onChange={(e) => onState({ ...state, width: e.target.value })} />
          </Field>
          <Field label="Sheet length (mm)" error={state.length !== '' ? plan.errors.length : null}>
            <input className="cc-input w-[120px] text-right" inputMode="numeric" value={state.length} data-link-sheet-length="1" onChange={(e) => onState({ ...state, length: e.target.value })} />
          </Field>
          <Field label="Offcut allowance (%)" error={plan.errors.offcut}>
            <input className="cc-input w-[100px] text-right" inputMode="decimal" value={state.offcut} data-link-offcut="1" onChange={(e) => onState({ ...state, offcut: e.target.value })} />
          </Field>
        </div>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          className="cc-btn-gold"
          disabled={disabled || !plan.ok}
          data-link-accept-all-save="1"
          onClick={() => { if (plan.ok) onSave(plan.links); }}
        >
          {`Link ${tickedItems.length} ticked`}
        </button>
        <button type="button" className="cc-btn" data-link-accept-all-cancel="1" onClick={onCancel}>Cancel</button>
      </div>
    </section>
  );
}

