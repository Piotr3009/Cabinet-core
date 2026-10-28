/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T84 F1, THE SKIN (CLAUDE.md T84 PART A, F1): the Studio's icons, one sprite
//
// CLAUDE.md F1: *"`StudioIcons.jsx`: the Stage-1 SVG symbols as one sprite component."* The
// designer's eighteen symbols are copied byte for byte from her Stage-1 file; seven more are drawn
// for this turn's controls in her own style: a 24-unit box, no fill, a round 1.6 stroke.
//
// The sprite is drawn ONCE (StudioShell mounts `<StudioIcons />`) and every icon is a `<use>` of
// it, so an icon costs one element and a colour is the text's own (`currentColor`).
//
// THE SKIN TRAVELS WITH THE SPRITE: the Studio's stylesheet is imported here, so it arrives with
// the shell that mounts the sprite, and the retail entry, which imports no Studio module, never
// sees it. Every rule in it is scoped under `.studio-pro`, so the legacy face does not see it
// either.

import './studio.css';

const PATHS = Object.freeze({
  // The designer's eighteen, byte for byte: verify/t84/astra/Cabinet-Core-PRO-Studio-Stage-1.html,
  // the <defs> of her sprite, `<symbol id="i-NAME" viewBox="0 0 24 24"><path d="..."/>`.
  cube: 'm12 3 9 5v8l-9 5-9-5V8zM3 8l9 5 9-5m-9 5v8M7.5 5.5l9 5v8',
  select: 'm5 3 14 10-7 1-3 7z',
  plus: 'M12 4v16M4 12h16',
  room: 'M3 21V4h18v17h-6v-7H9v7z',
  material: 'm12 3 9 5-9 5-9-5zM3 12l9 5 9-5M3 16l9 5 9-5',
  down: 'm6 9 6 6 6-6',
  right: 'm9 6 6 6-6 6',
  close: 'm6 6 12 12M6 18 18 6',
  pin: 'm8 3 8 0-1 6 4 4v2H5v-2l4-4zM12 15v7',
  open: 'M14 3h7v7m0-7L10 14M10 4H4v16h16v-6',
  sliders: 'M4 7h7m4 0h5M4 17h3m4 0h9M11 4v6M7 14v6',
  drawing: 'M5 3h11l4 4v14H5zM16 3v5h4M8 12h9M8 16h9M8 19h5',
  undo: 'm8 4-5 5 5 5M3 9h11a6 6 0 0 1 0 12',
  link: 'm10 7 3-3a5 5 0 0 1 7 7l-3 3M14 17l-3 3a5 5 0 0 1-7-7l3-3m1 6 8-8',
  warning: 'm12 3 10 18H2zM12 9v5m0 3v1',
  panel: 'M3 4h18v16H3zM14 4v16M17 8h1m-1 4h1',
  check: 'm4 12 5 5L20 6',
  save: 'M4 3h14l3 3v15H3V3zM7 3v6h10V3M7 21v-8h10v8',
  // Drawn for T84 in the same style. Redo is her Undo mirrored about the box's centre line; the
  // camera a body and its lens; the eye an almond and its pupil; Frame selection four corners
  // round a box; Plan a room seen from above, two walls inside; Iso a box seen from its corner;
  // Output an arrow leaving its tray.
  redo: 'm16 4 5 5-5 5M21 9H10a6 6 0 0 0 0 12',
  camera: 'M3 8h4l2-3h6l2 3h4v12H3zM12 10.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 1 0 0-7',
  eye: 'M2 12c2.4-4.7 5.9-7 10-7s7.6 2.3 10 7c-2.4 4.7-5.9 7-10 7s-7.6-2.3-10-7zM12 9a3 3 0 1 0 0 6 3 3 0 1 0 0-6',
  frame: 'M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5M9 9h6v6H9z',
  plan: 'M3 3h18v18H3zM10 3v7H3M14 21v-7h7',
  iso: 'm12 4 8 4.5-8 4.5-8-4.5zM4 8.5v7l8 4.5 8-4.5v-7M12 13v7',
  output: 'M12 15V3M7 8l5-5 5 5M4 14v6h16v-6',
});

/**
 * The sprite: every symbol once, in a 0 x 0 box taken out of the flow (her own markup), so it
 * occupies no cell of the shell's grid. Mount it once, inside the `.studio-pro` root.
 */
export default function StudioIcons() {
  return (
    <svg
      width="0"
      height="0"
      aria-hidden="true"
      focusable="false"
      style={{ position: 'absolute', overflow: 'hidden', pointerEvents: 'none' }}
    >
      <defs>
        {Object.entries(PATHS).map(([name, d]) => (
          <symbol key={name} id={`studio-i-${name}`} viewBox="0 0 24 24">
            <path d={d} />
          </symbol>
        ))}
      </defs>
    </svg>
  );
}

/**
 * One icon of the sprite. The stroke is drawn here, on the element, so an icon reads the same
 * wherever it stands; its SIZE is studio.css's (`.studio-icon`, half a button, and the places
 * that want another size), and `1em` until a stylesheet says otherwise. Decorative: the control
 * it sits in carries the words.
 */
export function Icon({ name, className = '' }) {
  return (
    <svg
      className={className ? `studio-icon ${className}` : 'studio-icon'}
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <use href={`#studio-i-${name}`} />
    </svg>
  );
}
