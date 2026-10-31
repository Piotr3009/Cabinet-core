import { useCallback, useEffect, useMemo, useState } from 'react';
import { useProjectStore } from '../stores/projectStore.js';
import { useUiStore } from '../stores/uiStore.js';
import { useAuthStore } from '../stores/authStore.js';
import NewProjectFlow from './NewProjectFlow.jsx';
import { browserStorage } from '../lib/projectLibrary.js';
import { anchorOfEvent } from '../lib/modalAnchor.js';
import { getProjectType } from '../engine/projectTypes.js';
import { migrateDesign } from '../engine/design.js';
import { useHistoryStore } from '../stores/historyStore.js';
// Chat fix 28.10.2026: a job saved to a file on another computer (Open from file).
import { fileStamp, pickProjectFile } from '../lib/projectFile.js';
import { openProjectFromFile } from '../lib/projectFileRoad.js';
import { askProjectFile } from './ProjectFileModal.jsx';
// T-CC1a F6: the import asks which Joinery Core project the old job belongs to.
import { askJcProject } from './jc/JcProjectPicker.jsx';
// T-CC1a F4: the list is Joinery Core's.
import {
  archiveItem, createItem, listView, loadJcList, projectOfItem, pushRecent, readRecent, revisionLabel,
} from '../lib/jcList.js';
// T-CC1a F9: the crash buffer's boot question (law 7) and the one save for "Save as new item".
import { bootOffers, clearBuffer, offerQuestion, RESTORED_WORDS } from '../lib/crashBuffer.js';
import { persistProject } from '../lib/persist.js';

// ─── Start screen (BACKLOG #7; turn 7, BACKLOG #41) ───
// The AutoCAD arrangement, because that is what Piotr opens every morning:
// the name of the thing top left, what you can DO down the left, and the work
// you had open filling the page. The canvas is reached THROUGH a project —
// there is no way in without one, so a drawing always belongs somewhere.
//
// ─── T-CC1a F4 · THE START SCREEN IS JOINERY CORE'S PROJECT LIST (law 3) ────
// The owner, 30.10.2026: *"w cc musimy zapisywac na glownej stronie; projekty
// dzielimy na itemy; kazdy projekt dodany to folder w JC"*. The page lists the
// company's Production and Pipeline projects as JC holds them (lib/jcList.js,
// four reads, never the design), each with its Cabinet Core items: Open,
// Archive, and behind "Show archived" Restore (law 8). A search narrows by
// number, name, client or item name over the embedded list (JC rule 6.3).
// Recent is the last five items this tenant opened. A project number is JC's
// and is never typed here; New item is asked of a project row. The shelf of
// this browser (`cc.library.v1`) is no longer a list: nothing is lost there,
// and Open from file is the one road in for an old job (F6).

export default function StartScreen() {
  const storage = useMemo(() => browserStorage(), []);
  const openItem = useProjectStore((s) => s.openItem);
  const openEditor = useUiStore((s) => s.openEditor);
  const setLibraryCategory = useUiStore((s) => s.setLibraryCategory);
  const notify = useUiStore((s) => s.notify);
  const tenant = useAuthStore((s) => s.tenant);
  const user = useAuthStore((s) => s.user);

  const [list, setList] = useState(null);         // null while the four reads are out
  const [query, setQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [recentIds, setRecentIds] = useState(() => readRecent(storage, tenant?.id));
  const [busy, setBusy] = useState(false);
  const [flow, setFlow] = useState(null);         // { project, anchor } while New item is open

  const refresh = useCallback(async () => {
    setList(null);
    setList(await loadJcList());
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // ─── T-CC1a F9 · THE BOOT QUESTION (CLAUDE.md T-CC1a law 7) ────────────────
  // The owner, 30.10.2026: *"moje zdanie to powinno sie wszystko zapisywac na
  // pamiec podreczna"*. After the list loads, every dirty crash buffer of this
  // tenant newer than its item's row is OFFERED in words, never applied in
  // silence and never dropped in silence: Restore opens the item from the
  // buffer, unsaved; Discard clears it; an item no longer in the list is
  // offered "Save as new item" instead. Another tenant's buffers are cleared.
  const [offers, setOffers] = useState([]);
  useEffect(() => {
    if (!list || list.error || !tenant?.id) { setOffers([]); return; }
    setOffers(bootOffers({ storage, tenantId: tenant.id, items: list.items }));
  }, [list, storage, tenant?.id]);
  const dropOffer = (offer) => setOffers((all) => all.filter((o) => o.key !== offer.key));

  const onRestore = (offer) => {
    useHistoryStore.getState().clear();
    const res = useProjectStore.getState().openItemDesign(offer.item, offer.design, {
      client: projectOfItem(list, offer.item)?.client || '', storage, dirty: true,
    });
    if (!res.ok) { notify(res.error, 'error'); return; }
    dropOffer(offer);
    notify(RESTORED_WORDS, 'warn');
    opened(offer.itemId);
    openEditor();
  };

  const onDiscard = (offer) => {
    clearBuffer(storage, offer.key);
    dropOffer(offer);
  };

  const onSaveAsNew = async (offer, e) => {
    const project = await askJcProject({ jobName: offer.name, list: list && !list.error ? list : null, anchor: anchorOfEvent(e) });
    if (!project) return;
    setBusy(true);
    try {
      const made = await createItem({ name: offer.name, project });
      if (made.error) { notify(`${offer.name}: not saved as a new item. ${made.error}`, 'error'); return; }
      useHistoryStore.getState().clear();
      const res = useProjectStore.getState().openItemDesign(made.row, offer.design, { client: project.client || '', storage, dirty: true });
      if (!res.ok) { notify(res.error, 'error'); return; }
      const saved = await persistProject({});
      notify(saved.message, saved.tone);
      clearBuffer(storage, offer.key);
      dropOffer(offer);
      opened(made.row.id);
      openEditor();
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => { setRecentIds(readRecent(storage, tenant?.id)); }, [storage, tenant?.id]);

  const groups = useMemo(() => (list && !list.error ? listView(list, { query, showArchived }) : []), [list, query, showArchived]);
  const recent = useMemo(() => {
    if (!list || list.error) return [];
    const byId = new Map(list.items.filter((it) => !it.archived_at).map((it) => [it.id, it]));
    return recentIds.map((id) => byId.get(id)).filter(Boolean).map((item) => ({ item, project: projectOfItem(list, item) }));
  }, [list, recentIds]);

  const opened = (itemId) => setRecentIds(pushRecent(storage, tenant?.id, itemId));

  /**
   * "Start designing". The flow has already built the item in the store (its id the server's) and
   * opens the canvas on the Library category the type asks for.
   */
  const onFlowStart = () => {
    const { project } = useProjectStore.getState();
    // A different job: the undo stack from the last one must not reach into it
    // (turn 12, CLAUDE.md F9 — the history survives nothing, least of all a
    // project boundary).
    useHistoryStore.getState().clear();
    const design = migrateDesign(project.design);
    if (design.projectType) setLibraryCategory(getProjectType(design.projectType).category);
    if (project.id) opened(project.id);
    setFlow(null);
    openEditor();
  };

  const onOpen = async (item, project) => {
    setBusy(true);
    try {
      useHistoryStore.getState().clear();
      const res = await openItem(item.id, { client: project?.client || '' });
      if (!res.ok) { notify(res.error, 'error'); return; }
      const design = migrateDesign(useProjectStore.getState().project.design);
      if (design.projectType) setLibraryCategory(getProjectType(design.projectType).category);
      opened(item.id);
      openEditor();
    } finally {
      setBusy(false);
    }
  };

  const onArchive = async (item, restore) => {
    setBusy(true);
    try {
      const res = await archiveItem(item.id, { restore });
      if (!res.ok) { notify(res.error, 'error'); return; }
      notify(restore ? `${item.name} is back in the list.` : `${item.name} archived. Show archived lists it.`, 'ok');
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  // ─── CHAT FIX 28.10.2026 · OPEN FROM FILE ──────────────────────────────────
  // The owner: *"ja mowie o pliku z CC zebym mial ten sam na innym kompie"*;
  // *"zrobisz mi pozniej cos co zadziala, czyli export i import projektow"*.
  // lib/projectFileRoad.js, the one road the File menu takes too. T-CC1a F6 (the
  // owner, 31.10.2026: *"w przyszlosci nie bedzie save to file, po co?"*): it is
  // the one-time IMPORT of an old job, bound to the project picked from this
  // very list, and the list is read again so the new item shows.
  const onOpenFile = async (e) => {
    const anchor = anchorOfEvent(e);
    const picked = await pickProjectFile();
    const known = list && !list.error ? list : null;
    const pickProject = (opts) => askJcProject({ ...opts, list: known });
    const done = await openProjectFromFile({
      picked, anchor, storage, ask: askProjectFile, pickProject, list: known,
    });
    if (done === 'opened') opened(useProjectStore.getState().project.id);
  };

  const itemRow = (item, project) => (
    <li key={item.id} className="flex items-center gap-3 px-2 py-1.5" data-jc-item={item.id} data-archived={item.archived_at ? '1' : undefined}>
      <span className="text-sm text-ink-50 flex-1 truncate">{item.name}</span>
      <span className="cc-tag" title="Revision">{revisionLabel(item) || '-'}</span>
      <span className="text-[11px] text-ink-400 w-32 text-right">{fileStamp(item.updated_at)}</span>
      {item.archived_at ? (
        <button type="button" className="cc-btn" disabled={busy} data-jc-restore={item.id} onClick={() => onArchive(item, true)}>Restore</button>
      ) : (
        <>
          <button type="button" className="cc-btn-gold" disabled={busy} data-jc-open={item.id} onClick={() => onOpen(item, project)}>Open</button>
          <button type="button" className="cc-btn" disabled={busy} data-jc-archive={item.id} onClick={() => onArchive(item, false)}>Archive</button>
        </>
      )}
    </li>
  );

  return (
    <div className="h-full w-full bg-shell-900 text-ink-50 overflow-y-auto relative">
      <div className="max-w-[1100px] mx-auto px-8 py-10">
        <header className="flex items-baseline gap-4">
          <span className="font-semibold tracking-[0.2em] text-gold text-xl select-none">CABINET CORE</span>
          <span className="text-xs text-ink-400">Parametric cabinet &amp; fitted-furniture configurator</span>
          <span className="flex-1" />
          {/* T-CC1a F4.2: the company and the signed-in name, from Joinery Core's /me (PROPOSED). */}
          <span className="text-xs text-ink-200" data-jc-company="1">{tenant?.name || ''}</span>
          <span className="text-xs text-ink-400" data-jc-user="1">{user?.full_name || user?.email || ''}</span>
        </header>

        <div className="cc-divider" />

        {offers.length > 0 && (
          <section className="cc-panel p-4 mt-6 space-y-2" role="alertdialog" data-crash-offers="1">
            {offers.map((offer) => (
              <div key={offer.key} className="flex items-center gap-3" data-crash-offer={offer.itemId}>
                <span className="text-sm text-ink-50 flex-1">{offerQuestion(offer)}</span>
                {offer.exists ? (
                  <button type="button" className="cc-btn-gold" disabled={busy} data-crash-restore={offer.itemId} onClick={() => onRestore(offer)}>Restore</button>
                ) : (
                  <button type="button" className="cc-btn-gold" disabled={busy} data-crash-save-new={offer.itemId} onClick={(e) => onSaveAsNew(offer, e)}>Save as new item</button>
                )}
                <button type="button" className="cc-btn" disabled={busy} data-crash-discard={offer.itemId} onClick={() => onDiscard(offer)}>Discard</button>
              </div>
            ))}
          </section>
        )}

        <div className="grid grid-cols-[300px_1fr] gap-8 mt-6">
          {/* ── what you can do ── */}
          <div className="space-y-4">
            <section className="cc-panel p-4 space-y-2">
              <h2 className="text-xs uppercase tracking-wide text-ink-200">Recent</h2>
              {recent.length === 0 ? (
                <p className="text-[11px] text-ink-400">Items you open appear here.</p>
              ) : (
                <ul className="space-y-1" data-jc-recent="1">
                  {recent.map(({ item, project }) => (
                    <li key={item.id}>
                      <button type="button" className="cc-btn w-full text-left truncate" disabled={busy} onClick={() => onOpen(item, project)}>
                        {project ? `${project.number} ` : ''}{item.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="cc-panel p-4 space-y-2">
              <h2 className="text-xs uppercase tracking-wide text-ink-200">Import</h2>
              <button
                type="button"
                className="cc-btn w-full"
                data-open-from-file="1"
                title="A .ccproject file: an old job, imported once into a Joinery Core project"
                onClick={onOpenFile}
              >
                Open from file…
              </button>
            </section>
          </div>

          {/* ── the work: Joinery Core's projects and their items ── */}
          <section className="cc-panel p-4 space-y-3">
            <div className="cc-row gap-3">
              <input
                className="cc-input flex-1"
                data-jc-search="1"
                placeholder="Search by number, name, client or item"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <label className="text-[11px] text-ink-200 flex items-center gap-1">
                <input type="checkbox" data-jc-show-archived="1" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
                Show archived
              </label>
            </div>

            {!list && <p className="text-sm text-ink-400 py-8 text-center">Reading the projects from Joinery Core...</p>}
            {list?.error && (
              <div className="py-8 text-center space-y-3" role="alert" data-jc-list-error="1">
                <p className="text-sm text-ink-50">{list.error}</p>
                <button type="button" className="cc-btn-gold" data-jc-retry="1" onClick={refresh}>Retry</button>
              </div>
            )}
            {groups.map((g) => (
              <div key={g.id} data-jc-group={g.id}>
                <h2 className="text-xs uppercase tracking-wide text-ink-200 py-1">{g.label}</h2>
                {g.projects.length === 0 ? (
                  <p className="text-[11px] text-ink-400 px-2 pb-2">{query ? 'Nothing matches.' : 'No active projects.'}</p>
                ) : (
                  <ul className="divide-y divide-shell-600">
                    {g.projects.map((p) => (
                      <li key={p.key} className="py-2" data-jc-project={p.key}>
                        <div className="flex items-center gap-3 px-2">
                          <span className="text-[11px] text-gold w-20 shrink-0 truncate">{p.number}</span>
                          <span className="text-sm text-ink-50 flex-1 truncate">{p.name}{p.client ? ` · ${p.client}` : ''}</span>
                          <button
                            type="button"
                            className="cc-btn"
                            data-jc-new-item={p.key}
                            onClick={(e) => setFlow({ project: p, anchor: anchorOfEvent(e) })}
                          >
                            New item
                          </button>
                        </div>
                        {p.items.length === 0 ? (
                          <p className="text-[11px] text-ink-400 px-2 pl-[104px]">No items yet</p>
                        ) : (
                          <ul className="pl-[96px]">{p.items.map((it) => itemRow(it, p))}</ul>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </section>
        </div>
      </div>

      {flow && (
        <NewProjectFlow
          jcProject={flow.project}
          anchor={flow.anchor}
          onCancel={() => setFlow(null)}
          onStart={onFlowStart}
        />
      )}
    </div>
  );
}
