# CLAUDE.md, TURN CC1a · THE DOOR, THE LIST, THE SAVE: CABINET CORE ENTERS JOINERY CORE

Run autonomously. Zero questions, zero stops: every decision below is the
owner's own (18.10, 30.10 and 31.10.2026, in chat; his words are quoted where
they decide), so nothing here is asked again. Where a number or a name is
marked PROPOSED it is the turn's best reading and is used as written; the
owner confirms or changes it after the merge, never during the run. If a point
cannot be done, skip it WHOLE, write why in the PR, and go on to the next.
Full suite, never `--silent`. Frames under `verify/t-cc1a/`. Branch
`claude/t-cc1a-the-door`, cut from `origin/main` (the merge of PR #91, T86B),
with THIS file taken from `origin/chat/t-cc1a-spec`; one commit per F; PR
against main at the end; the owner merges. Nothing lands in Petros from this
session. The owner's name for this turn is "T-CC1a"; it is the first Cabinet
Core turn of the merger with Joinery Core (JC) and runs on the same day as
T-JC1 in the JC repository. The two meet only on Vercel after both merges: this
turn never calls a live JC; every proof here is a test with a fake JC.

THIS TURN STANDS ON T86B AND T85, both merged. Nothing of theirs is re-audited
or re-touched; a T85 or T86B test that goes red is a defect of THIS turn, fixed
in this turn's own code, never by editing their tests. THE ENGINE IS NOT
TOUCHED: `src/engine/**` has no delta in this turn (the six base goldens and
every later golden are IDENTICAL by definition; the turn still runs the
checks). The list of Cabinet Core features is CLOSED (the owner, 30.10, 22:42):
this turn adds no feature to the design tool; it changes where the work lives.

## THE COST OF THE DAY (the law of T83 to T86B, kept)
THREE agents and one integrator, never ten. NO review wave: a slice is
reviewed ONCE by INT when its patch lands; the morning audit is the owner's.
Targeted tests while writing; the full suite ONCE per PART when it lands and
ONCE at the end. Every agent reads this file and its PART, never the whole
repo: INT hands each agent the files it OWNS and the ones it must read. A
report is twenty lines, the six stations of DONE. Agents and parallel mode ON.

## THE AGENTS (3 slices and one integrator)
| Agent | Slice | OWNS (writes) | Hands patches to |
| - | - | - | - |
| INT | the only writer of `src/stores/projectStore.js`, `src/main.jsx`, `src/App.jsx`, `index.html`, `vite.config.js`; applies patches in F order; the freeze test's EXEMPT rows, deletions and re-hashes; NEW_FILES; `scripts/t78-classify.d/f51-t-cc1a-f*.mjs`; the full suite once per PART and at the end; classifier strict, copy check, walk; the PR | the five files, the manifest, `test/turn59-f1-the-switch.test.js` | nobody |
| A1 | PART A, the door: F1 one client, JC's; F2 the session and the refusal screen; F3 the kasacja of the login, the mock mode and the cloud road | `src/lib/jcApi.js` (NEW), `src/stores/authStore.js`, `src/components/jc/RefusalScreen.jsx` (NEW), `src/lib/storageBase.js`, `src/lib/cloudSync.js`, `src/stores/materialAssignmentStore.js`, `src/stores/warehouseStore.js`, `.env.example`, the 12 files with `isMockMode` branches EXCEPT those owned by A2 and A3 (patches to them), `test/turn-cc1a-f01-client.test.js`, `test/turn-cc1a-f02-session.test.js`, `test/turn-cc1a-f03-kasacja.test.js`; deletions: `src/lib/supabase.js`, `src/components/AuthModal.jsx`, `src/components/MockModeBadge.jsx` | INT (main.jsx, App.jsx, index.html, vite.config.js, the manifest), A2 (StartScreen, TopBar, StatusBar mounts), A3 (persist.js) |
| A2 | PART B, the list and the binding: F4 the start screen is JC's project list; F5 New item binds to a JC project; F6 Open from file is the import road | `src/components/StartScreen.jsx`, `src/components/NewProjectFlow.jsx`, `src/components/TopBar.jsx`, `src/components/StatusBar.jsx`, `src/lib/jcList.js` (NEW, pure: the list built from four reads), `src/lib/projectLibrary.js` (reduced), `src/lib/projectFileRoad.js`, `src/lib/topMenu.js`, `test/turn-cc1a-f04-list.test.js`, `test/turn-cc1a-f05-new-item.test.js`, `test/turn-cc1a-f06-import.test.js` | INT (projectStore.js: openItem, newProject's binding fields) |
| A3 | PART C, the save: F7 one save, one request; F8 the triggers; F9 the crash buffer | `src/lib/persist.js`, `src/lib/saveTriggers.js` (NEW), `src/lib/crashBuffer.js` (NEW), `src/pages/ConfiguratorPage.jsx` (Ctrl+S, the exports await the save), `src/components/DesignSettingsModal.jsx` (its save call), `test/turn-cc1a-f07-save.test.js`, `test/turn-cc1a-f08-triggers.test.js`, `test/turn-cc1a-f09-crash-buffer.test.js` | INT (projectStore.js: projectForSave merged, the cache key and subscriber), A2 (the boot question in StartScreen) |
| A1 | PART D, F10 the walk (after A2 and A3 land) | `scripts/t-cc1a-walk.mjs`, `scripts/t-cc1a-fake-jc.mjs` (NEW: the fake Joinery Core for the walk), `verify/t-cc1a/walk.txt`, `verify/t-cc1a/f*-*.png` | INT |

## THE ORDER (the owner's words that frame this turn)
- 18.10: *"ja chce zrobic cabinet core jako dodatek do joinery core ... chce
  zmusic klientow do korzystania z joinery core"*; *"czy moze to byc jedna
  baza danych ale dwa osobne programy?"* (yes).
- 30.10, 22:0x: *"oczywiscie do CC laczysz sie tylko przez JC"*.
- 30.10, 22:1x: *"moje zdanie to powinno sie wszystko zapisywac na pamiec
  podreczna, dopiero caly json powinien sie zapisac do DB przy nacisnieciu
  Zapisz lub co 5 minut automatycznie"*.
- 30.10, 22:42: *"robimy tylko testowe polaczenie tylko z naszym JC, czyli
  tylko Skylon"*; 22:45: *"przygotujmy nasze menu i cala reszte magazyn pod
  fuzje z JC"*.
- 30.10, 22:5x: *"w cc musimy zapisywac na glownej stronie; projekty dzielimy
  na itemy; kazdy projekt dodany to folder w JC ... ale materialy jedne dla
  calego projektu"*; *"automatyczne polaczenie danego projektu do danego
  pipelinu lub production projektu"*.
- 31.10, 01:06 (answer 10): *"w przyszlosci nie bedzie save to file, po co?"*:
  Save to file / Open from file stay ONLY as the one-time import of the owner's
  old jobs and die in T-CC2.
- 31.10, 09:08: *"warunek: tylko przez JC po zalogowaniu, nie dziala skopiowany
  url wklejony przez byle kogo"*.

## WHAT THE OTHER SIDE GIVES (T-JC1, the JC repository, same day; read, do not assume more)
- The address: `joinerycore.com/cabinet`. JC's `vercel.json` routes `^/cabinet/?$`
  to CC's deployment `index.html` and `^/cabinet/(.+)$` to the same path on CC's
  deployment; `/cabinet/retail.html` and `/cabinet/start.html` answer 404 there.
  CC is therefore built with `base: '/cabinet/'` and every asset URL starts
  with it.
- The session: JC's `/js/api-client.js?v=9`, a classic script, puts on the
  window `apiFetch(endpoint, options) -> { data, error }`, `rpc(name, params) ->
  { data, error }` and `supabaseClient = { auth, from, storage, rpc, channel }`,
  a supabase-js look-alike whose `from(table).select(cols).eq(...).order(...)
  .limit(...).single()/.maybeSingle()` is thenable and goes to `POST
  /api/db/query`; `rpc` goes to `POST /api/rpc`; `storage` is the three-request
  signed upload (a later turn). The token is `localStorage.authToken`; a 401 is
  refreshed once; a failed refresh clears the three keys (`authToken`,
  `currentSession`, `currentUser`) and goes to `/login.html?expired=1&next=
  <path>`; JC's login returns to `next`. `supabaseClient.auth.getSession()` signs
  the user OUT on ANY error of `/me`, so CC never calls it: CC calls
  `apiFetch('/api/auth/me')` itself.
- `/api/auth/me` answers `{ user: { id, email, full_name, role, tenant_id,
  cabinet_core, cabinet_core_company, ... }, organization: { id, name, ... } }`.
  `cabinet_core` is true for owner, admin and manager of a listed company
  (Skylon only today); `cabinet_core_company` says whether the company is
  listed. The roles in the database are owner, admin, manager, worker, viewer;
  the word a user reads for worker is EMPLOYEE, never worker (JC rule 6.1).
- The reads CC may make through `/api/db/query` (owner, admin, manager):
  `pipeline_projects` (id, project_number, name, client_id, site_address,
  status), `projects` (id, project_number, name, client_id, site_address,
  status, pipeline_id), `clients` (id, company_name, contact_person, address),
  `company_settings` (company_name, company_address, logo_url), `cc_items`
  (id, name, revision, updated_at, archived_at, jc_pipeline_id, jc_project_id,
  jc_project_number, folder_name, design; NEVER `select('*')` on cc_items in a
  list: the design is the big column), `cc_item_revisions`,
  `cc_company_profile`. Every write to a `cc_*` table is refused there.
- The writes, through `rpc` (p_tenant_id and p_user_id are injected by JC; the
  client sends the rest): `cc_create_item(p_name, p_pipeline_id, p_project_id)`
  returns the row without design (exactly one of the two ids);
  `cc_save_item(p_item_id, p_name, p_design)` returns `{ id, updated_at,
  revision }`; `cc_cut_revision(p_item_id, p_reason)` (not called this turn);
  `cc_archive_item(p_item_id, p_restore)`; `cc_register_item_files` (not this
  turn); `cc_save_company_profile` (T-CC1b). An unlisted company or a role
  outside the three gets 403 with `{ error }` in words.
- The fake JC of this turn's tests and walk (`scripts/t-cc1a-fake-jc.mjs` and
  the test doubles) implements exactly the lines above and nothing more; where
  the real JC differs, T-JC1's PR is the truth and the owner's live walk after
  both merges finds it.

## LAWS
Every law of T75 to T86B holds in full: LISP IS LAW (no engine delta at all);
the fossil six untouchable (`scripts/t64-classify.mjs --dump` vs
`verify/t70/goldens-base.json` IDENTICAL); material never enters material;
the room refuses in words and never clamps in silence; one law one path;
numbers in the profile, none typed; 1:1 = COPY (`scripts/t78-copy.mjs --check`
CLEAN); the Skylon header on every new file; no em or en dash in anything
written; test the way the client clicks; a new function has a visible entry in
the same package; a green test beside old broken code is a lie; "usun" and
"kasacja" are physical deletions, never gates. Eight laws are this turn's own:
1. **THE DOOR IS JOINERY CORE'S.** CC runs only with a Joinery Core session on
   the Joinery Core host. No token: CC sends the browser to JC's login with
   `next=/cabinet/` and makes no other request. A token whose `/me` says the
   role is employee or viewer, or the company is not listed: one refusal screen
   in words, no other request, no sign out. The owner: *"tylko przez JC po
   zalogowaniu, nie dziala skopiowany url wklejony przez byle kogo"*.
2. **ONE CLIENT, AND IT IS JC'S.** CC creates NO supabase-js client and holds
   no key of its own (two clients refreshing one rotating token sign the user
   out). The one door is `window.supabaseClient` and `window.apiFetch` from
   JC's script; `withDb` keeps its `{ data, error, mock }` contract for every
   call site, and `mock: true` now means "Joinery Core did not answer", said in
   words where the user sees it. There is no mock mode, no demo mode, no local
   app: the owner, 30.10: *"oczywiscie do CC laczysz sie tylko przez JC"*.
3. **THE LIST IS JC'S.** The start screen shows the company's pipeline and
   production projects from Joinery Core, each with its Cabinet Core items; a
   project number is JC's and is never typed or invented in CC.
4. **AN ITEM IS BORN BOUND.** An item is one piece of furniture; it is bound to
   ONE JC project when it is made (`cc_create_item`) and never asks again; its
   id is minted by the server; CC's `loc_` ids are over.
5. **A CHANGE IS MEMORY, A SAVE IS ONE REQUEST.** Editing touches the network
   never; Save is one `cc_save_item` carrying the whole item JSON (the
   `.ccproject` shape without `profile`, logo as `{ ref }`), built in ONE place.
   The owner: *"dopiero caly json powinien sie zapisac do DB przy nacisnieciu
   Zapisz lub co 5 minut automatycznie"*.
6. **FOUR TRIGGERS, ONE SAVE.** Ctrl+S; autosave every 5 minutes when dirty;
   leaving the page (the local buffer flushed, the network save only when the
   body is under 64 KiB); before every export. Autosave writes the working
   revision only and never cuts a letter.
7. **NOTHING IS LOST IN A CRASH.** The browser keeps the open item as a crash
   buffer keyed by tenant and item; on boot a dirty buffer newer than the saved
   row is OFFERED back in words ("Restore unsaved changes to <item>?"), never
   applied in silence, never dropped in silence.
8. **ARCHIVED, NEVER DESTROYED.** Delete becomes Archive (`cc_archive_item`);
   archived items hide behind "Show archived" and come back with Restore.

## FROZEN
1. The six base goldens and every T75 to T86B golden IDENTICAL (no engine
   delta; the checks run anyway and the PR pastes them).
2. T85's and T86B's code, tests and goldens: as they left them.
3. The editor: every panel, the Section, the scene, the exports (CNC, DXF,
   labels, PDF, CSV until T-CC2), the title block, the Studio shell: untouched
   except the two lines the save triggers need (Ctrl+S beside Ctrl+Z; the six
   export callbacks awaiting the save).
4. The profile and its store (`cabinetProfileStore.js`, `cc.profile.v1`), the
   company defaults store, the hardware register, settings sets, templates, the
   warehouse rows: they stay LOCAL in this turn and move to the tenant's row in
   T-CC1b and T-CC2. A call of theirs that reaches a table JC does not have
   gets `withDb`'s `{ mock: true }` and falls back to local as today; nothing
   crashes; the PR lists these calls by file and line as "pending T-CC1b /
   T-CC2".
5. PRO freeze: every PRO file edited is licensed in EXEMPT with the owner's
   words from this file and re-frozen in the same commit; the two deleted PRO
   files leave the manifest with the owner's words beside the deletion; the
   new `src/components/jc/RefusalScreen.jsx` enters it at its first hash; the
   count assertion at `test/turn59-f1-the-switch.test.js:1001` is amended by
   INT with the new count and the words. Retail copies NOT edited: `t78-copy
   --check` CLEAN. If `src/retail/**` imports `src/lib/supabase.js`, the import
   is re-pointed to `jcApi.js` (a one-line change, named in the PR) and nothing
   else of retail moves.
6. The suite is green at the start (the count on main at the start of the run,
   written in the PR) and at the end, plus this turn's tests, minus the tests
   this turn REWRITES by name (F3).

## PART A · THE DOOR (F1 to F3; A1 and INT)

### F1 · One client, JC's (law 2)
1. `src/lib/jcApi.js` (NEW, Skylon header): `jcClient()` returns
   `globalThis.supabaseClient` or `null`; `jcFetch(endpoint, options)` returns
   `globalThis.apiFetch(endpoint, options)` or `{ data: null, error: { message:
   JC_OFFLINE } }`; `hasToken()` reads `localStorage.authToken`; `withDb(fn,
   mockValue)` with TODAY'S body and contract (`src/lib/supabase.js:21-32`),
   where "no client" gives `{ data: mockValue, error: null, mock: true }`;
   `JC_OFFLINE = 'Joinery Core did not answer. Your work is kept in this
   browser until it does.'` (PROPOSED words); `isJcOffline()` = no client or
   no token. NO `createClient`, NO `@supabase/supabase-js` import anywhere in
   `src/` after this turn (the package may stay in package.json for retail if
   retail needs it; the PR says which).
2. `src/lib/supabase.js` DELETED (kasacja); its 23 `withDb` call sites in 7
   modules import `withDb` from `jcApi.js`; `isMockMode` is gone from the
   codebase: of its 29 references in 12 files, those that drew a badge or a
   login die with F3, those that chose "local only" become `isJcOffline()`
   where a local fallback still makes sense this turn (FROZEN 4) and are
   deleted where the road itself dies (the cloud list, the direct save). The
   PR lists all 29 with their fate.
3. `index.html` (INT; frozen, EXEMPT with *"do CC laczysz sie tylko przez
   JC"*): `<script src="/js/api-client.js?v=9"></script>` BEFORE the module
   script, so JC's globals exist when `main.jsx` runs; the tag must survive the
   build unchanged in `dist/index.html` (Vite leaves an unresolvable absolute
   `src` alone and warns; the PR pastes the built tag). `vite.config.js`
   (INT): `base: '/cabinet/'`; `server.open` becomes `'/cabinet/start.html'`
   (a dev convenience, nothing else); the three inputs stay.
4. `src/lib/storageBase.js`: the configured storage root reads
   `VITE_HARDWARE_STORAGE_URL` first and `VITE_SUPABASE_URL` second (so the
   current Vercel setting keeps the hinge and runner models until the owner
   renames the variable), the derived host when both are unset; `.env.example`
   names `VITE_HARDWARE_STORAGE_URL` and drops the anon key line.
5. `test/turn-cc1a-f01-client.test.js`: with a fake `globalThis.supabaseClient`
   a `withDb` call reaches it and returns its data; without it `{ mock: true }`
   and the mock value; `grep` of `src/` finds no `createClient`, no
   `isMockMode`, no `VITE_SUPABASE_ANON_KEY`; `vite.config.js` has `base:
   '/cabinet/'`; `index.html` carries the JC script tag before the module tag.

### F2 · The session and the refusal screen (law 1)
1. `src/stores/authStore.js` REWRITTEN: state `{ status: 'booting' | 'ready' |
   'refused' | 'offline', refusal: null | 'role' | 'company', user: { id, email,
   full_name, role }, tenant: { id, name }, flags: { cabinetCore,
   cabinetCoreCompany } }`; `init()`: (a) `!hasToken()` →
   `location.replace('/login.html?next=' + encodeURIComponent('/cabinet/'))`
   and NO request (law 1); (b) `jcFetch('/api/auth/me')`; an `error` with
   status 401 → the same redirect (JC's script already cleared the keys); any
   other error → `offline` with the words and a Retry; (c) `user.cabinet_core
   === true` → `ready`; else `cabinet_core_company === true` → `refused:
   'role'`; else `refused: 'company'`. `signIn`, `signUp`, `signOut`, the
   `projects` list and the company-defaults hook at `:26, :31` are deleted
   (the company defaults load moves to `companyDefaultsStore` itself, called
   from App after `ready`, FROZEN 4).
2. `src/components/jc/RefusalScreen.jsx` (NEW, Skylon header, EXEMPT at its
   first hash): one centred card at the house scale. `refused: 'role'`: title
   "Cabinet Core opens for owners, admins and managers", line "Your Joinery
   Core account is an employee account. Ask an admin of <company> if you need
   the design tool.", button "Back to Joinery Core" → `/dashboard.html`.
   `refused: 'company'`: title "Cabinet Core is coming soon for <company>",
   line "It is in testing with one workshop today.", buttons "What is Cabinet
   Core" → `/cabinet-core.html` and "Back to Joinery Core". `offline`: title
   "Joinery Core did not answer", the JC_OFFLINE words, button "Try again" →
   `init()`. PROPOSED words; never the word "worker".
3. `src/main.jsx` and `src/App.jsx` (INT; frozen, EXEMPT with *"tylko przez
   JC po zalogowaniu"*): the boot order becomes session FIRST, then the app:
   `main.jsx` awaits `useAuthStore.getState().init()`, renders
   `RefusalScreen` when the status is not `ready`, and only on `ready`
   dynamically imports `./App.jsx` (the stores load with it, the order the
   retail entry already uses, `src/stores/persistence.js:26-34`,
   `src/retail/main-retail.jsx:35`). The build stamp, the `beforeunload`
   question (App.jsx:96-103, replaced by F8's save on leaving) and the two
   screens stay. A `storage` event that removes `authToken` while CC is open
   (another tab signed out): CC flushes the crash buffer (F9) and shows the
   `offline` card with "You were signed out of Joinery Core" (PROPOSED).
4. `test/turn-cc1a-f02-session.test.js`: no token → `location.replace`
   called with `/login.html?next=%2Fcabinet%2F` and `apiFetch` never called;
   `/me` with role worker and company listed → `refused: 'role'`, the card's
   words contain "employee" and not "worker"; `/me` with company unlisted →
   `refused: 'company'` with the Coming soon link; `/me` network error →
   `offline` and no sign-out call on the fake client; `/me` with admin and
   listed → `ready`, `tenant.id` and `user.role` set; `supabaseClient.auth.
   getSession` is never called by CC (the fake throws if it is).

### F3 · The kasacja of the login, the mock mode and the cloud road (law 2)
1. DELETED, physically: `src/components/AuthModal.jsx` and
   `src/components/MockModeBadge.jsx` (manifest rows removed with the owner's
   words *"oczywiscie do CC laczysz sie tylko przez JC"*); their mounts and
   imports: `ConfiguratorPage.jsx:10, :696, :754` (A3's file, patch),
   `TopBar.jsx:9, :488-491` the Account button (A2's file, patch),
   `StartScreen.jsx:4, :152` and `StatusBar.jsx:30, :104` (A2's files,
   patches); `src/lib/cloudSync.js`: the auth block (:164-208), the
   cc_projects and cc_units road (:8-76: listProjects, saveProject,
   loadProject, deleteProject) and `MOCK_REASON`; the company-defaults
   functions (:129-160) STAY in the file until T-CC1b (named in the PR).
   `src/stores/materialAssignmentStore.js`: `scheduleCloudSave` (:164-172) and
   its 8 calls, the cloud-wins read (:226-235): deleted; assignments ride
   `project.assignments` alone. `src/stores/warehouseStore.js`: the 6 network
   writes (:82, :91, :111, :117, :124, :139) deleted; rows stay local until
   T-CC2. Tombstones two lines at most. Deletions outnumber additions in this
   F's commit (the kasacja law); the PR prints the two counts.
2. The tests that asserted the mock badge, the Account window, the cloud list,
   the direct save or the assignments' cloud write are REWRITTEN to the new law
   by name (grep the suite for `MockModeBadge`, `AuthModal`, `isMockMode`,
   `listProjects`, `scheduleCloudSave`, `cloudSync`); never kept green beside a
   deleted road; the PR lists each test file and what it now asserts.
3. `test/turn-cc1a-f03-kasacja.test.js`: the two files do not exist; `src/`
   contains no `AuthModal`, `MockModeBadge`, `isMockMode`, `scheduleCloudSave`,
   `listProjects` from cloudSync; the manifest has no row for the two files;
   `materialAssignmentStore` changes write no network call on a fake client
   (the fake counts calls: 0 after ten assignment changes); `warehouseStore`
   the same.

## PART B · THE LIST AND THE BINDING (F4 to F6; A2 and INT)

### F4 · The start screen is JC's project list (law 3)
1. `src/lib/jcList.js` (NEW, pure, Skylon header): `loadJcList(client) ->
   { pipeline: [...], production: [...], items: [...], clients: Map, error }`
   from FOUR reads through `withDb`: `pipeline_projects` (id, project_number,
   name, client_id, site_address, status; `status` 'active' only, PROPOSED),
   `projects` (id, project_number, name, client_id, site_address, status,
   pipeline_id; 'active' only, PROPOSED), `clients` (id, company_name),
   `cc_items` (id, name, revision, updated_at, archived_at, jc_pipeline_id,
   jc_project_id, jc_project_number; NEVER design), ordered by project_number
   desc; `groupItems(list) -> Map<projectKey, items[]>` where the key is
   `'p:' + jc_project_id` or `'pl:' + jc_pipeline_id`. Tested as written with
   fixture rows.
2. `StartScreen.jsx` (frozen, EXEMPT with *"w cc musimy zapisywac na glownej
   stronie; projekty dzielimy na itemy"*): the list has two groups, "Production"
   and "Pipeline" (PROPOSED order), each project row `<number> <name> ·
   <client>` with its items under it (name, revision letter, updated, Open,
   Archive); a project without items shows "No items yet" and the "New item"
   button; "Show archived" (off by default) reveals archived items with
   Restore; a search box narrows by number, name, client or item name
   (JC rule 6.3: embedded list plus a search, never search-only); Recent
   stays as the last 5 opened ITEM ids per tenant, key `cc.<tenantId>.recent.v1`
   (PROPOSED); the shelf list (`cc.library.v1`) is NO LONGER shown (the code
   survives only for F6 and the logo helpers); `nextProjectNumber` and the
   delete-local-row road are deleted (`projectLibrary.js:241-260, :295-300`).
   "Open from file" stays as F6's import. The header shows the company name
   from `/me` and the signed-in name (PROPOSED). An `error` from the reads
   shows the JC_OFFLINE words and a Retry, never an empty list in silence.
3. Open: `projectStore.openItem(itemId)` (INT): ONE read of `cc_items` by id
   with `select('id, name, revision, design, jc_pipeline_id, jc_project_id,
   jc_project_number, updated_at')`; the design is the `.ccproject` shape
   without profile (`{ format, version, project, units, assignments }`); a
   `version` newer than the app's is refused in words (R16); `project.id` is
   the item id; `project.number` = `jc_project_number` and `project.client` =
   the client's company_name from the list (read-only in the UI: `setProjectInfo`
   no longer edits them; the item NAME is the editable field); then today's
   `loadProject` (migrations, healing, recompute) and `markSaved` with the
   row's `updated_at` remembered in the store (`project.savedAt`, PROPOSED).
   The design's `jc_tenant_id` / `jc_project_id` fields, if any, are ignored on
   load and not written on save: the binding lives in the row's columns.
4. `test/turn-cc1a-f04-list.test.js`: the four reads named with their columns
   (the fake client records every `select` string; none on cc_items contains
   `*` or `design` in the LIST read); grouping puts two items under their
   production project and one under a pipeline project; an archived item is
   hidden until "Show archived"; the search narrows by client name; the JC
   error path shows the words; `openItem` reads design by id and `loadProject`
   receives the inner `project` and `units`; a newer `version` is refused in
   words and nothing loads.

### F5 · New item binds to a JC project (law 4)
1. `NewProjectFlow.jsx` (frozen, EXEMPT with *"automatyczne polaczenie danego
   projektu do danego pipelinu lub production projektu"*) becomes "New item":
   its first section shows the project it was opened from, READ-ONLY: number,
   name, client; the one typed field is the item name (required, the
   placeholder "Kitchen, Wardrobe bedroom 2 ..."); the room and design
   settings stay as today. `commitProject` (:168-191) calls
   `rpc('cc_create_item', { p_name, p_pipeline_id | p_project_id })` through
   `withDb`, takes the returned row (id, jc_project_number, revision), builds
   the record with `newProject` (INT: `newProject` accepts `{ id, name, number,
   client }` and writes no `loc_` id), and opens the editor; a refusal from JC
   (403, offline) stays on the flow with the words and nothing is created
   locally. The first save (F7) writes the design; until then the row's design
   is `{}` and the crash buffer (F9) holds the work.
2. The item name is also editable in the editor where the project name was
   (TopBar's title field or the Design settings modal, whichever edits
   `project.name` today), and travels to `cc_save_item` as `p_name`.
3. `test/turn-cc1a-f05-new-item.test.js`: the flow opened from a pipeline
   project calls `cc_create_item` with `p_pipeline_id` and no `p_project_id`;
   from a production project the reverse; the record's `id` is the server's
   uuid, `number` the returned `jc_project_number`, `client` the project's
   client; a 403 leaves no record and shows the words; `grep` of `src/` finds
   no `loc_` id minting.

### F6 · Open from file is the import road (the owner's answer 10)
1. `projectFileRoad.js` and the StartScreen entry: "Open from file" parses as
   today (`projectFile.js` keeps its version gate and its id-collision
   question), then ASKS which JC project the imported job belongs to (the F4
   list in a small picker, embedded list plus search), then calls
   `cc_create_item` with the file's `project.name` and that binding, replaces
   `project.id` with the server's id (`projectForOpen` 'copy' road,
   `projectFile.js:249-255`), loads it, and runs ONE `cc_save_item` at once
   so the row holds the design. The file's `profile` block is NOT applied to
   this browser any more by default: the "take the file's settings" question
   (`projectFileRoad.js:94-96`) becomes read-only text "This file carries
   workshop settings; they are not imported (the company numbers live in
   Joinery Core from T-CC1b)" (PROPOSED). "Save to file" stays as today (it
   dies in T-CC2 with this road).
2. `test/turn-cc1a-f06-import.test.js`: the owner's `verify/t86b/owner.
   ccproject` imported against a fake JC: `cc_create_item` then `cc_save_item`
   called once each, the saved design has no `profile` key, the unit's params
   are byte-identical to the file's unit, the local profile (`cc.profile.v1`)
   is unchanged by the import.

## PART C · THE SAVE (F7 to F9; A3 and INT)

### F7 · One save, one request (law 5)
1. `projectStore.projectForSave()` (INT, :12433-12456) becomes the ONE
   builder of the item JSON: `{ format: 'cabinet-core-project', version: <the
   file's current version>, saved_at, app: { name, build }, project, units,
   assignments }` with the assignments folded (`persist.js:32-34`), the
   `warehouseStamp`, the logo as `{ ref }` (`projectLibrary.js:157-162`), and
   NO `profile`; `persist.js`'s `persistProject(opts)` loses the shelf write
   and the cloud branch and does: build → `withDb(c => c.rpc('cc_save_item',
   { p_item_id: project.id, p_name: project.name, p_design }))` → on `data`:
   `markSaved`, `project.savedAt = data.updated_at`, the status words "Saved
   <time>"; on `error` or `mock`: `markUnsaved`, the words (JC_OFFLINE or the
   server's message) and the crash buffer already holds the work. Returns `{
   project, message, tone, stored }` as today for its three callers. "Save as"
   (`ConfiguratorPage.jsx:657-663`) becomes "Save as new item" in the same JC
   project: `cc_create_item` with the typed name, then the same save
   (PROPOSED). The direct save of AuthModal is gone with F3.
2. A size guard before the request: a body over 3.5 MB (Vercel's 4.5 MB wall
   with room, PROPOSED `profile.save.maxBodyMb: 3.5`) is refused in words
   ("This item is too large to save: <n> MB. A logo or a picture is riding in
   it.") and never sent.
3. `test/turn-cc1a-f07-save.test.js`: a 10-unit store job saved against the
   fake client makes exactly ONE `rpc` call named `cc_save_item` with
   `p_item_id` = the item id and a `p_design` that has `project`, `units`,
   `assignments`, `format`, `version` and NO `profile`; the design parses back
   through `loadProject` to the same units (JSON byte identity of `units`);
   `markSaved` after success and `dirty` false; a refused save leaves `dirty`
   true and the words; the size guard refuses a 4 MB body without a call.

### F8 · The triggers (law 6)
1. `src/lib/saveTriggers.js` (NEW, Skylon header): `installSaveTriggers({
   save, isDirty, hasItem, buffer, now })` returns `uninstall()`; Ctrl+S (and
   Cmd+S) with `preventDefault` → `save()` when an item is open
   (`ConfiguratorPage.jsx:246-250`, beside Ctrl+Z, A3's file, EXEMPT with the
   owner's words of law 5); the autosave timer every `profile.save.
   autosaveMinutes` (5, CONFIRMED by the owner's words) → `save()` only when
   `isDirty()` and an item is open, never while a save is in flight; on
   `pagehide` and on `visibilitychange` to hidden: `buffer.flush()`
   synchronously (F9), then, when `isDirty()` and the body is under 64 KiB
   (the keepalive quota; `profile.save.keepaliveMaxKb: 64`, PROPOSED), ONE
   `fetch('/api/rpc', { method: 'POST', keepalive: true, headers: {
   Authorization: 'Bearer ' + localStorage.authToken, 'Content-Type':
   'application/json' }, body })` with the same payload as F7 (JC's `apiFetch`
   has no keepalive, so this one road is written here, once); a body over the
   quota relies on the boot question (F9). The six export callbacks
   (`ConfiguratorPage.jsx:445, 456, 475, 494, 512, 554`) `await` the same
   `persistProject` before they export when dirty and read `stored`; a failed
   save does not stop a local export (CNC, DXF, PDF are local), it says so.
2. `App.jsx`'s `beforeunload` question (:96-103) is replaced (INT) by the
   pagehide road above: no question when the buffer flushed; the browser's own
   question only if the flush itself failed (a full quota).
3. `test/turn-cc1a-f08-triggers.test.js`: with fake timers, a dirty item and a
   5-minute tick: one save; a clean item: none; two ticks with a save in
   flight: one; Ctrl+S on a dirty item: one save and the default prevented;
   `pagehide` with a 10 KB dirty body: the buffer written and one keepalive
   fetch to `/api/rpc` with `keepalive: true`; with a 100 KB body: the buffer
   written and NO fetch; an export callback on a dirty item awaits one save
   first; the three numbers come from the profile (none typed in the UI).

### F9 · The crash buffer (law 7)
1. `src/lib/crashBuffer.js` (NEW, Skylon header): `bufferKey(tenantId, itemId)
   = 'cc.' + tenantId + '.item.' + itemId + '.buffer.v1'` (PROPOSED), `write(
   key, { savedAt, dirty, at, design })`, `read(key)`, `clear(key)`, `list(
   tenantId)` (every buffer of the tenant), a size guard (a design over 1 MB is
   not buffered and the status bar says "Crash buffer off: the item is over 1
   MB", PROPOSED `profile.save.bufferMaxMb: 1`), and the browser's refusal
   returned in words (`projectLibrary.js:53-56` is the model). The store's
   cache (`projectStore.js:248`, the subscriber `:1861-1883`, INT) writes THIS
   key instead of `cc.project.cache.v1` (deleted), still at most once per 250
   ms, with `dirty` and `savedAt` beside the design; `markSaved` writes it
   once more with `dirty: false`. The read at module load (`:1883-1922`) is
   deleted: the app opens on the start screen and the buffer is OFFERED, never
   applied in silence.
2. The boot question (A2's StartScreen, A3's patch): after the list loads, for
   every buffer of the tenant with `dirty: true` whose `at` is newer than the
   item row's `updated_at`: "Restore unsaved changes to <item name> (<time>)?"
   with Restore (opens the item from the buffer's design, dirty, and says "Not
   saved yet: press Ctrl+S") and Discard (clears the buffer); an item that no
   longer exists in the list (archived or gone) is offered with "Save as new
   item" instead (PROPOSED). Buffers of another tenant are never shown and are
   cleared when `/me` names a different tenant than the buffer's key (CC-1 R6).
3. `test/turn-cc1a-f09-crash-buffer.test.js`: an edit writes the buffer under
   the tenant and item key within 250 ms; a save marks it `dirty: false`; a
   dirty buffer newer than the row is offered at boot and Restore reproduces
   the edited units byte for byte; an older buffer is not offered; Discard
   clears it; a 2 MB design is not buffered and the words appear; a buffer of
   tenant A is not listed for tenant B and is cleared.

## PART D · THE WALK (F10; A1, after PART B and PART C land)
`scripts/t-cc1a-fake-jc.mjs` (NEW): a Node `http` server (no new dependency)
that serves `/js/api-client.js` as a MINIMAL shim written here (apiFetch,
rpc, supabaseClient.from with select/eq/order/limit/single/maybeSingle and
thenable, rpc, auth.getSession that THROWS if called), `/login.html` (a page
with one button that sets `authToken`, `currentSession`, `currentUser` in
localStorage and follows `next`), `/api/auth/me`, `/api/db/query` and
`/api/rpc` over an in-memory store seeded with one company, one admin, one
employee, two production projects, one pipeline project and two items; it
proxies every other path to `vite preview` at 4173 under `/cabinet/`, so the
page runs on ONE origin as it will behind JC. `scripts/t-cc1a-walk.mjs`
drives it with the real mouse through `scripts/t74-harness.mjs` (BASE =
the fake's origin + `/cabinet/`), Playwright's clock API for the 5 minutes:
(a) open `/cabinet/` with no token: the browser lands on `/login.html?next=
%2Fcabinet%2F`; press Sign in: back on `/cabinet/`, the list shows two
production projects and one pipeline project with their items (frame);
(b) switch the fake's user to the employee, reload: the refusal card with
"employee" and no list request made (the fake counts requests; frame);
(c) as admin, New item on the pipeline project, name "Walk wardrobe", Start:
the editor opens, the fake has one `cc_create_item`; add a WARDROBE, Ctrl+S:
one `cc_save_item` with a design that has no profile (the fake stores it);
(d) move a shelf, advance the clock 5 minutes: one more `cc_save_item`;
advance 5 more with no change: none; (e) add a drawer, close the tab (no
save): reopen `/cabinet/`: "Restore unsaved changes to Walk wardrobe?",
Restore: the drawer is there and the status says not saved; (f) Archive the
item from the list: it disappears, "Show archived" lists it, Restore brings
it back; (g) Open from file `verify/t86b/owner.ccproject`, bind to the
production project: one create, one save, the list shows it (frame). Every
line PASS or FAIL with the number expected and the number read; never patched
in the walk. `verify/t-cc1a/walk.txt` and the frames.

## NOT THIS TURN
- The profile in the tenant's row, the company defaults, the title block's
  client and address from JC, the materials picker on JC stock: T-CC1b.
- The drawings into the project's folder, `cc_register_item_files`, the
  storage road, `cc_cut_revision` on export: T-CC1c.
- The materials export, the estimate hint report, the CSV kasacja, the death
  of Save to file / Open from file: T-CC2. The picture: T-CC3.
- A live call to joinerycore.com: the owner's walk after both merges.
- `TopBar.jsx`'s legacy menu beyond the Account button's deletion (FROZEN 5 of
  T86B); the editor, the Section, the scene, the exports.
- Retail (`src/retail/**`, `retail.html`): not edited beyond FROZEN 5's
  one-line re-point if needed; its deployment under `/cabinet/` is out of
  reach by T-JC1's route (404), which the PR states as a consequence for the
  owner, not a defect.

## LINEAGE (one line a test reads from this file)
T79's horizontal notch stays as built and its owner's words stay here
because `test/turn79-f05-edge-notch.test.js` reads them from CLAUDE.md:
*"cut the corner działa idealnie, ale możesz zrobić mi też poziome cut?
wszystkich 4 rogów?"* (18.10.2026). T85 (PR #89), T86B (PR #91), the chat
fixes of 28.10 to 30.10 (PR #84 to #86, #90) and main at the merge of #91 are
the base of this turn; their numbers hold untouched.

## TESTS AND PROOF
Full suite once per PART and at the end (never `--silent`); the classifier
strict with `f51-t-cc1a-f*.mjs` naming every lib delta (persist.js,
projectLibrary.js, projectFileRoad.js, cloudSync.js, storageBase.js, topMenu.js
and the three new lib files; NO engine delta: the classifier's engine set is
empty and the PR says so); the six base goldens IDENTICAL (`scripts/
t64-classify.mjs --dump` vs `verify/t70/goldens-base.json`); `t75-goldens
--check`, `t78-goldens --check` and every later golden check as T86B's list
names them; `t78-copy --check` CLEAN; `vite build` green with `base:
'/cabinet/'` and the built `dist/index.html` quoted (the JC script tag, the
`/cabinet/assets/` URLs); `t-cc1a-walk.mjs`; NEW_FILES; the Skylon header; no
em or en dash; the kasacja counts of F3; `grep` of `src/` for `createClient`,
`isMockMode`, `AuthModal`, `MockModeBadge`, `loc_`, `cc.project.cache.v1`:
all 0; every F the six stations of DONE in twenty lines.

## PR BODY
First line: "Stands on main at the merge of PR #91 (<sha>); meets T-JC1 of the
Joinery Core repository on Vercel; no live JC was called." Then files and
lines per F; the 29 `isMockMode` references with their fate; the kasacja
counts of F3; the tests rewritten by name; the four reads of F4 with their
column lists; the one request of F7 quoted (the payload's keys); the three
profile numbers of F8 and F9; the EXEMPT rows and the manifest count before
and after; the built `index.html` tag; the test count before and after; the
walk result; the "pending T-CC1b / T-CC2" list of FROZEN 4; the consequence
for retail; DECISIONS TAKEN; SKIPPED AND WHY; RED AT THE END; THE NUMBERS
below.

## THE NUMBERS (in the profile; none typed in the UI)
| Number | Where | Value | Status |
| - | - | - | - |
| the autosave period | `profile.save.autosaveMinutes` | 5 | CONFIRMED ("co 5 minut automatycznie", 30.10) |
| the keepalive ceiling | `profile.save.keepaliveMaxKb` | 64 | PROPOSED (the Fetch standard's in-flight quota) |
| the body ceiling | `profile.save.maxBodyMb` | 3.5 | PROPOSED (Vercel's 4.5 MB wall, with room) |
| the crash buffer ceiling | `profile.save.bufferMaxMb` | 1 | PROPOSED |
| the cache throttle | the store subscriber | 250 ms | as today |
| Recent | `cc.<tenant>.recent.v1` | 5 items | as today's 5, per tenant |
| the list's filter | `status = 'active'` on both project tables | | PROPOSED |
| the refusal words | `RefusalScreen.jsx` | three cards | PROPOSED words; "employee", never "worker" |
| the login return | `/login.html?next=%2Fcabinet%2F` | | CONFIRMED (31.10, 09:08) |
| the item JSON | `projectForSave` | the .ccproject shape without `profile`, logo `{ ref }` | CONFIRMED (PLAN 2.5) |
