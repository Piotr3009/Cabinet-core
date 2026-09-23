# T74 F13 · the probe: is there anything like a free panel

The owner, 23.09.2026: *"SWOBODNY PANEL (wstaw panel). Użytkownik wstawia panel, ustawia pion/poziom/każdą
orientację, długość, grubość. Przyciąganie (snap) jako PROPOZYCJA, nie na siłę, zawsze do odrzucenia. Przesuwanie
przez kliknięcie w wymiar. Z paneli można złożyć własną figurę (np. box). Dwuklik = wejście w edycję jak w PRO
(wycięcie łuku itp.)."*

Run by `node scripts/t74-engine-probes.mjs f13`.

| question | answer |
|---|---|
| a unit type that is ONE free board | FREE_PANEL |
| the library's free-standing panel row | [{"id":"free-standing-panels","kind":"type"},{"id":"cornice-pelmet","kind":"soon"}] |
| the wardrobe category | ["WARDROBE","WARDROBE_TOP","WARDROBE_WALL"] |
| the piece editor with the arc (PRO) | `src/components/PartDetailModal.jsx`; a 2klik on a free panel in the room opens it: true; its retail copy is in the manifest: true |
| a room snap that PROPOSES (shows a line, can be refused) | a free panel's drag: `freePanelProposal` names the edge a drop would catch (40 mm, `editor.unitMagnet`), the scene draws it, the drop takes it (`acceptFreePanelSnap`) or refuses it with Alt held |

After the build: a kit of its own (`FREE_PANEL`, one board, `carcass.top: 'free'`), the Extras row opened, the piece editor one 2klik away in both apps, and the snap a proposal.

