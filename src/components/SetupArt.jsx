/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// Decorative interface art only. Cabinet geometry remains the engine's job.
import { useId } from 'react';

const iconPaths = {
  project: ['M3 7V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z', 'M3 9h18'],
  space: ['M3 20V4h18v16H3Z', 'M7 20V8h6v12M16 8h2v5h-2Z'],
  dimensions: ['M5 3h14v16H5Z', 'M2 3v16M1 3h2M1 19h2M5 22h14M5 21v2M19 21v2', 'M9 3v16M5 13h14'],
  carcases: ['m3 7 9-4 9 4v13H3V7Z', 'M3 7h14v13M17 7l4-4M3 13h14M9 7v13'],
  fronts: ['M3 3h18v18H3Z', 'M12 3v18M6 6h3v12H6ZM15 6h3v12h-3Z'],
  hardware: ['M9 3h6v5l3 3v4l-3 3v3H9v-3l-3-3v-4l3-3V3Z', 'M10 5h4M10 19h4', 'M9 12a3 3 0 1 0 6 0a3 3 0 1 0-6 0'],
  production: ['M3 21V9l6 4V8l6 4V3h5v18H3Z', 'M6 17h2M11 17h2M16 17h1'],
  lighting: ['M8 15a6 6 0 1 1 8 0l-1 2H9l-1-2Z', 'M9 20h6M10 23h4M12 2V1M3 6 1 5M21 6l2-1'],
  review: ['M8 4H5v18h14V4h-3M8 2h8v4H8Z', 'm8 14 3 3 5-6'],
  window: ['M3 3h18v18H3Z', 'M6 6h12v12H6ZM12 6v12M6 12h12'],
  door: ['M4 22V2h16v20M7 22V5h10v17', 'M14 13h1'],
  'slope-left': ['M3 21V11L12 3h9v18H3Z', 'M3 11h9V3'],
  'slope-right': ['M3 21V3h9l9 8v10H3Z', 'M12 3v8h9'],
  recess: ['M3 4h18v17h-6V9H9v12H3V4Z', 'M9 9l3-3h6v12l-3 3'],
  chimney: ['M3 4h18v17h-5V8H8v13H3V4Z', 'M8 8h8v13H8M10 12h4M10 16h4'],
  check: ['m5 12 4 4L19 6'],
  'arrow-left': ['M20 12H4m6-6-6 6 6 6'],
  'arrow-right': ['M4 12h16m-6-6 6 6-6 6'],
};

/** Labels sit beside the icons; the icon itself is hidden from screen readers. */
export function SetupIcon({ name = 'project', className = '', ...props }) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor"
      strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" focusable="false" className={`cc-setup-icon ${className}`} {...props}>
      {(iconPaths[name] || iconPaths.project).map((d, i) => <path d={d} key={i} />)}
    </svg>
  );
}

function Door({ x, y, width, height, panel = false, handle = 'right' }) {
  return <g>
    <rect x={x} y={y} width={width} height={height} rx="1" />
    {panel && <rect x={x + 4} y={y + 5} width={width - 8} height={height - 10} rx=".6" opacity=".5" fill="none" />}
    <path d={`M${handle === 'right' ? x + width - 4 : x + 4} ${y + height * .43}v${Math.min(8, height * .19)}`} stroke="var(--setup-art-brass, #c8a678)" strokeWidth="2" />
  </g>;
}

function KitchenArt() {
  return <>
    <path d="M20 92V55h120v37" fill="var(--setup-art-board)" />
    <path d="M17 52h126v5H17Z" fill="var(--setup-art-stone)" />
    <Door x={22} y={59} width={26} height={30} panel />
    <Door x={50} y={59} width={26} height={30} panel handle="left" />
    <rect x="78" y="59" width="32" height="30" rx="1" fill="var(--setup-art-dark)" />
    <path d="M82 63h24M82 67h24v17H82Z" />
    <circle cx="87" cy="62" r=".7" /><circle cx="102" cy="62" r=".7" />
    <Door x={112} y={59} width={26} height={30} panel />
    <Door x={22} y={21} width={26} height={26} /><Door x={50} y={21} width={26} height={26} handle="left" />
    <path d="M85 45h22l-5-5H90l-5 5ZM94 21h4v19" fill="var(--setup-art-stone)" />
    <path d="M113 36v11m0-8c0-7 10-7 10 0M109 50h21" />
    <path d="M25 94h111" stroke="var(--setup-art-muted)" />
  </>;
}

function WardrobeArt() {
  return <>
    <path d="M36 16h92l8 5v72H36Z" fill="var(--setup-art-board)" />
    <path d="m128 16 8 5v72h-8V16Z" fill="var(--setup-art-shadow)" />
    <Door x={39} y={19} width={28} height={72} panel />
    <Door x={69} y={19} width={28} height={72} panel handle="left" />
    <path d="M99 19h26v72H99Z" fill="var(--setup-art-dark)" />
    <path d="M100 34h24M100 63h24M100 77h24M104 26h16M111 26v7l-7 7h16l-7-7" />
    <path d="M36 94h100" stroke="var(--setup-art-muted)" />
  </>;
}

function MediaArt() {
  return <>
    <rect x="23" y="20" width="28" height="52" rx="1" fill="var(--setup-art-board)" />
    <path d="M25 36h24M25 52h24M30 29h13M29 57v12m5-11v11m5-12v12" />
    <rect x="57" y="25" width="72" height="41" rx="2" fill="var(--setup-art-dark)" />
    <path d="m60 59 31-31h29" opacity=".25" /><path d="M89 66v7m-8 0h24" />
    <path d="M21 75h118v17H21Z" fill="var(--setup-art-board)" />
    <path d="M60 76v15M99 76v15M27 79h26M67 79h25M107 79h25M25 93v3m110-3v3" />
  </>;
}

function SideboardArt() {
  return <>
    <path d="M23 47h114v39H23Z" fill="var(--setup-art-board)" />
    <path d="M20 43h120v5H20Z" fill="var(--setup-art-stone)" />
    <Door x={26} y={51} width={34} height={32} panel />
    <Door x={62} y={51} width={34} height={32} panel handle="left" />
    <path d="M98 51h36v32H98ZM98 62h36M98 73h36M111 55h10M111 66h10M111 77h10M29 86v8m102-8v8" />
    <path d="M41 42V31h13v11M44 31c-7-6-1-14 4-9m0 10c6-12 13-8 9-3" fill="none" />
    <path d="M94 41V23h24v18M97 38V26h18v12" fill="var(--setup-art-dark)" />
  </>;
}

function VanityArt() {
  return <>
    <rect x="48" y="14" width="65" height="38" rx="17" fill="var(--setup-art-glass)" />
    <path d="m53 41 22-22m13 27 19-19" opacity=".35" />
    <path d="M32 65h98v26H32Z" fill="var(--setup-art-board)" />
    <path d="M32 78h98M80 66v24M47 69h18M95 69h18M47 82h18M95 82h18" />
    <path d="M29 61h104v5H29Z" fill="var(--setup-art-stone)" />
    <path d="M62 55h36l-4 7H66l-4-7Z" fill="var(--setup-art-stone)" />
    <path d="M82 54v-5q0-5 6-5v5" />
    <path d="M38 96h86" stroke="var(--setup-art-muted)" opacity=".6" />
  </>;
}

function UtilityArt() {
  return <>
    <path d="M22 50h116v5H22Z" fill="var(--setup-art-stone)" />
    <rect x="26" y="57" width="39" height="35" rx="2" fill="var(--setup-art-stone)" />
    <circle cx="45.5" cy="75" r="12" fill="var(--setup-art-glass)" /><circle cx="45.5" cy="75" r="8" fill="var(--setup-art-dark)" />
    <path d="M30 61h16M56 61h4" /><Door x={69} y={57} width={30} height={35} /><Door x={101} y={57} width={34} height={35} handle="left" />
    <Door x={26} y={18} width={39} height={26} /><Door x={69} y={18} width={30} height={26} /><Door x={101} y={18} width={34} height={26} handle="left" />
  </>;
}

function HallwayArt() {
  return <>
    <Door x={25} y={17} width={38} height={76} panel />
    <path d="M70 20h65v42H70Z" fill="var(--setup-art-board)" />
    <path d="M80 27v8q0 5 5 2M101 27v8q0 5 5 2M122 27v8q0 5 5 2" />
    <path d="M70 69h65v7H70Z" fill="var(--setup-art-stone)" />
    <path d="M72 76h61v17H72ZM92 77v15M112 77v15M78 86h8m12 0h8m12 0h8" fill="var(--setup-art-board)" />
  </>;
}

function OtherArt() {
  return <>
    <path d="M27 58h39v34H27Z" fill="var(--setup-art-board)" />
    <path d="m27 58 11-7h39l-11 7M66 58l11-7v34l-11 7" fill="var(--setup-art-shadow)" />
    <path d="M87 27h34v65H87Z" fill="var(--setup-art-board)" />
    <path d="m87 27 11-7h34l-11 7M121 27l11-7v65l-11 7" fill="var(--setup-art-shadow)" />
    <path d="M88 48h32M88 70h32M31 64h29M95 84h18" />
    <path d="M47 25v16m-8-8h16" stroke="var(--setup-art-brass)" strokeWidth="2" />
  </>;
}

const typeArt = { kitchen: KitchenArt, wardrobe: WardrobeArt, media_wall: MediaArt, sideboard: SideboardArt, vanity: VanityArt, utility: UtilityArt, hallway: HallwayArt, other: OtherArt };

/** Furniture silhouettes share a camera, palette and baseline for quick comparison. */
export function ProjectTypeArt({ type = 'kitchen', className = '', ...props }) {
  const uid = useId().replace(/:/g, '');
  const Art = typeArt[typeof type === 'object' ? type.id : type] || OtherArt;
  return <svg viewBox="0 0 160 108" fill="none" stroke="var(--setup-art-line, #b6ada0)" strokeWidth="1.2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"
    className={`cc-setup-type-art ${className}`} {...props}>
    <defs><radialGradient id={`setup-floor-${uid}`}><stop stopColor="var(--setup-art-shadow, #101010)" stopOpacity=".7" /><stop offset="1" stopColor="var(--setup-art-shadow, #101010)" stopOpacity="0" /></radialGradient></defs>
    <ellipse cx="80" cy="97" rx="69" ry="8" fill={`url(#setup-floor-${uid})`} stroke="none" />
    <path d="M13 96h134" stroke="var(--setup-art-muted, #55534f)" strokeWidth=".8" />
    <Art />
  </svg>;
}

export function ScopeArt({ scope = 'wall', className = '', ...props }) {
  return <svg viewBox="0 0 160 100" fill="none" stroke="var(--setup-art-line, #b6ada0)" strokeWidth="1.3"
    strokeLinejoin="round" aria-hidden="true" focusable="false" className={`cc-setup-scope-art ${className}`} {...props}>
    {scope === 'wall' ? <>
      <path d="M24 20h112v63H24Z" fill="var(--setup-art-board)" /><path d="m24 83-10 7h112l10-7" fill="var(--setup-art-shadow)" />
      <path d="M91 29h32v25H91ZM107 29v25M91 42h32" fill="var(--setup-art-glass)" />
      <path d="M33 54h49v29H33ZM57 54v29M33 57h49" fill="var(--setup-art-dark)" />
      <path d="M24 13h112M24 10v6M136 10v6" stroke="var(--setup-art-brass)" />
    </> : <>
      <path d="m21 39 65-24 52 25v43L73 96 21 73V39Z" fill="var(--setup-art-board)" />
      <path d="m21 73 65-24 52 34-65 13-52-23Z" fill="var(--setup-art-shadow)" />
      <path d="M86 15v34M21 39l65-24 52 25M86 49l52 34" />
      <path d="m33 51 31-12v20L33 71V51Z" fill="var(--setup-art-dark)" />
      <path d="m98 32 25 12v15L98 47V32Z" fill="var(--setup-art-glass)" /><path d="m110 38 0 15" />
      <path d="m23 81 49 22m-50-25-1 7m51 16-1 5" stroke="var(--setup-art-brass)" />
    </>}
  </svg>;
}

export function SetupSectionArt({ section, className = '' }) {
  return <span className={`cc-setup-section-art ${className}`}><SetupIcon name={section} /></span>;
}
