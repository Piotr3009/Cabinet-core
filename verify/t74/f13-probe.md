# T74 F13 · the probe: is there anything like a free panel

The owner, 23.09.2026: *"SWOBODNY PANEL (wstaw panel). Użytkownik wstawia panel, ustawia pion/poziom/każdą
orientację, długość, grubość. Przyciąganie (snap) jako PROPOZYCJA, nie na siłę, zawsze do odrzucenia. Przesuwanie
przez kliknięcie w wymiar. Z paneli można złożyć własną figurę (np. box). Dwuklik = wejście w edycję jak w PRO
(wycięcie łuku itp.)."*

Run by `node scripts/t74-engine-probes.mjs f13`.

| question | answer |
|---|---|
| a unit type that is ONE free board | (none): the nearest is `DW_PANEL`, a dishwasher's front rail, which belongs to its gap |
| the library's free-standing panel row | [{"id":"free-standing-panels","kind":"soon"},{"id":"cornice-pelmet","kind":"soon"}] |
| the wardrobe category | ["WARDROBE","WARDROBE_TOP"] |
| the piece editor with the arc (PRO) | `src/components/PartDetailModal.jsx`, reached only from the cabinet editor (`CabinetEditorModal`), never by a 2klik in the room; no retail copy |
| a room snap that PROPOSES (shows a line, can be refused) | none: the unit magnet (`collision.js clampUnitX`, 40 mm) snaps silently; `moveUnit` takes `{ magnet: false }` but no gesture reaches it |

Nothing like it exists: a board belongs to a cabinet, and the library row held for this since turn 12 is `soon`.

