import { Button } from '../design/controls.jsx';

/**
 * ─── T64 F3 · ONE BUTTON ───────────────────────────────────────────────────
 *
 * The owner: *"przyciski i napisy w przyciskach bardziej posh … przyciski
 * kwadratowe."* CLAUDE.md F3: *"One `Button` in `src/retail/design/
 * controls.jsx`, used everywhere in `src/retail/**`."* This file is the
 * site's old door to it, kept so that the header, the landing page and the
 * quote form change no import line — and it is a re-export, not a second
 * component. The rules for the site's own rhythm (50px, the marketing
 * pages) stay in `styles/base.css`; the room's (44/36, 12px tracked) are in
 * `styles/room.css` under `.pbi-room`.
 */
export default Button;
