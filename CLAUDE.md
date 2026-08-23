# CLAUDE.md — TURN 44 · THE WIZARD GROWS UP: ONE WALL FIRST, AND PROJECT SETTINGS BECOMES A GUIDED SEQUENCE

Dictated by the owner, 23.08.2026, with screenshots: the current settings
step is *"do dupy — za małe, chaotyczne, wszystko naraz"*, the Egger
window is *"okno w oknie, przesuwamy, nic nie widać, gubimy się"*. This
turn rebuilds step 3 (Scope) and step 4 (Project settings) of the New
project wizard into a guided, tabbed sequence. **Wardrobes are the
subject; kitchen-only fields appear only for Kitchen.**

## Iron rules (binding)

1. **Zero-stop overnight.** PR before morning. Sacrifice order, first to
   fall first: F8 (save-set DB round-trip may fall back to
   local-only with a named skip), F6, F5-shine. **F1, F2, F3, F4 never
   fall.**
2. **BYTE-IDENTITY** — this is a UI/store turn. `computeCabinet()` and
   `src/engine/**` are untouched, byte for byte. `t44-classify` (T43's,
   re-headed): six IDENTICAL, UNNAMED=0.
3. **Sanctity.** No function deleted. `SettingsPanel.jsx` leaves the
   does-not-touch list for the FIRST time since T41 — restructure is
   licensed, deletion is not: every existing field survives, relocated.
   Named removals only: the `Keep as…` control (relocated to F8's final
   modal) and `Room setup…` button (belongs to Scope/Room step). Both
   listed in the PR body.
4. **Every modal**: draggable, opens BESIDE the trigger, never over it.
   Tabs across the top of the step-4 sequence — the user can return to
   any completed tab at any time; Next validates only the current tab.
5. **Visibility engine (the reason for submodals):** every tab, submodal
   and field carries `audience: 'factory' | 'both'`. App-level mode
   (header toggle, default `factory`, persisted) filters the tree.
   Retail sees: Ustawienia (read-only basics), material/colour pickers,
   drawer choice, front type + opening + shine, hardware COLOUR only,
   summary. Factory sees everything. One tree, one filter — never two
   parallel wizards.
6. **No new dependencies. Suite never --silent. One commit per feature.
   Proofs `verify/t44/`** — a probe drives the wizard end-to-end with
   real pointer input, screenshots every tab and submodal.
7. **SQL PRZED push** — F8 ships `supabase/migrations/t44_settings_sets.sql`:
   `cc_settings_sets(id uuid pk default gen_random_uuid(), name text not
   null, payload jsonb not null, created_at timestamptz default now())`,
   RLS enabled, owner-only policies matching the other `cc_*` tables.
   The app degrades gracefully without it (local list + amber note).

## Owner-overridable defaults baked into this spec

The owner approved the plan with five details open; these defaults are
LAW for the night unless his push edits them here: (1) depth default
stays **568**; (2) factory/retail = app-level header toggle;
(3) veneer picks from a LIST like spray (no tile assets exist);
(4) opening options are exactly `push-to-open / handles / knobs /
J-handle` — no separate "pull"; (5) `Infill at the wall` lives in
Produkcja (his own TBD, revisit later).

---

## F1 [CRITICAL] — Scope: One wall first, and the wall gets a face

- Step 3: **One wall is the FIRST card and the default focus**; Whole
  room second. Copy unchanged.
- Choosing One wall opens the **wall elevation modal** (front view):
  fields width + height; the elevation redraws live.
- Right-hand column of buttons (styled properly, not bare):
  `Add door` · `Add window` · `Add slope`. Each drops an element on the
  elevation; elements are draggable on the wall and editable
  (double-click → its small modal: position + size; slope: side L/R +
  start height + run). Store them on the wall model the Room path
  already uses — ONE wall schema, no twin.
- **Save (green)** → wizard continues to Project settings. Back returns
  without losing the wall.

Tests: store round-trip of a wall with door+window+slope; probe
screenshots `f1-one-wall-first.png`, `f1-wall-elevation-editor.png`.

## F2 [CRITICAL] — the step-4 shell: tabs, sequence, visibility

- Replace the single scroll with a tabbed sequence:
  `1 Ustawienia → 2 Carcases → 3 Fronts → 4 Hardware → 5 Produkcja →
  6 Podsumowanie`. Tabs stay clickable once visited; Next advances.
- The visibility engine of iron rule 5 lives here: one declarative map
  `{tabId, audience}` + per-field flags. Retail simply never renders
  factory nodes — no disabled ghosts.

Tests: tab return keeps state; retail mode renders zero factory-flagged
nodes (DOM assert). Proof `f2-tabs-and-retail.png` (both modes side by
side).

## F3 [CRITICAL] — tab 1 · Ustawienia

- Number + Client: read-only (chosen in step 1). Type read-only.
- **Saved settings set**: dropdown fed from `cc_settings_sets` (F8),
  default `Default settings`. `Keep as…` REMOVED from here (rule 3).
  `Room setup…` REMOVED (rule 3).
- Dimensions: default height **2100**, plinth **100** with label
  `Plinth height (toe kick)`, depth **568**; the total line stays.
  Ceiling/infill question stays as is.
- Base unit height / Wall unit height / Wall mount height: rendered
  **only when project type is Kitchen** — wardrobe never sees them.

Proof `f3-ustawienia-wardrobe-vs-kitchen.png`.

## F4 [CRITICAL] — tab 2 · Carcases, and the picker that stops fighting you

- Opening question: **"Ile typów materiału carcase?"** (1–3) → that many
  submodals, sequential, each with its own tab-dot.
- Submodal = the NEW material picker, full-width panel (no
  window-in-window, nothing floating over the wizard):
  - categories separated hard: `Laminat` | `Veneer` | `Spray`;
  - Laminat: LARGE Egger tiles (min 96 px swatch, name in full-size
    type), a search box that actually filters as you type, source =
    the same `egger-decors.json` + thumbs the 3D uses;
  - Veneer: dropdown list; Spray: dropdown list, NO tiles (owner's
    explicit order — tiles here "zakłócają całość");
  - end of submodal: drawers for this carcase type —
    `Same as board` / `Ready-made system`; the choice writes the flag
    BOM already understands (runner assignment pending).
- After the last submodal: **Sheets assignment** (material → sheet), the
  existing machinery relocated, `audience: 'factory'`.
- Tab ends with a summary of the chosen types → Next.

Tests: N=2 produces two submodals and two BOM material rows; search
filters; spray renders zero tiles. Proofs `f4-picker-large.png`,
`f4-two-types-flow.png`.

## F5 [HIGH] — tab 3 · Fronts

- Same procedure as F4: **"Ile kolorów frontów?"** → N submodals with
  the same picker.
- Tail of the tab: **front type** (existing options), **opening**:
  `push-to-open / handles / knobs / J-handle`, and **shine** — and
  shine must actually reach the 3D material (the existing gloss param;
  if none exists, wire the material roughness — visibly).

Proof `f5-fronts-and-shine.png` (matte vs shine, same decor).

## F6 [HIGH] — tab 4 · Hardware

- All existing hardware choices, relocated; retail sees ONLY colour.

Proof `f6-hardware-factory-vs-retail.png`.

## F7 [HIGH] — tab 5 · Produkcja (factory-only)

- `Infill at the wall` (default here, rule "defaults" pt 5).
- **Measurements + sheet sizes per chosen material**: exactly the
  materials picked in F4/F5, listed by name — 2 types → 2 blocks. The
  existing measurement fields, grouped per material instead of the
  current pile.

Proof `f7-produkcja-per-material.png`.

## F8 [HIGH] — tab 6 · Podsumowanie + the save-set finale

- Summary of every choice, grouped by tab, retail-filtered.
- **Final separate modal**: "Zapisać te ustawienia jako Twój standard?"
  big Y/N + name field → INSERT into `cc_settings_sets` (payload = the
  whole settings object). The list in F3 reads from the same table.
  Without SQL applied: local fallback + amber note, named skip.

Tests: save → reload → the set appears in F3's dropdown and re-applies
byte-equal settings. Proof `f8-save-set-roundtrip.png`.

---

## Execution order

F1 → F2 → F3 → F4 → F5 → F6 → F7 → F8. Probe woven through (one wizard
walk, every screen shot).

## What this turn does NOT touch

`computeCabinet()` and all of `src/engine/**`. The drawings system. The
rail. The runner channel. Golden fixtures. The six configs' bytes. The
canvas/3D beyond F5's shine wiring.

## Morning audit will run

Fresh clone → suite → build → t44-classify (six IDENTICAL) → relocation
audit: every pre-existing settings field found alive in its new tab,
the two licensed removals and nothing else → retail-mode DOM audit →
the wizard probe re-run, every screenshot LOOKED AT → verdict → the
owner's numbered eye-test list.