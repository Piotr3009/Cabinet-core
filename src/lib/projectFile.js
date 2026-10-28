/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── CHAT FIX 28.10.2026 · THE PROJECT AS A FILE (.ccproject) ────────────────
//
// The owner, 28.10.2026: *"ja mowie o pliku z CC zebym mial ten sam na innym
// kompie"*; *"wiesz ze CC nie jest w chmurze jeszcze"*; *"zrobisz mi pozniej
// cos co zadziala, czyli export i import projektow"*; *"problem polega na tym
// ze nie dzialaja te szuflady ani import ani export plikow"*.
//
// Mock mode keeps a job on ONE computer's shelf (lib/projectLibrary.js). This
// file carries it to another: File > Save to file... writes the whole job into
// one JSON file, File > Open from file... and the start screen's Open from
// file... put it on this computer's shelf and open it. What the file holds:
//
//   format, version   'cabinet-core-project', 1: what it is and which reader
//   saved_at, app     when and by which build it was written
//   project           the job, its material assignments folded in exactly as
//                     lib/persist.js folds them for a save, its logo WHOLE
//   units             every cabinet with its params
//   profile           the workshop settings this computer drew it with
//
// Everything here is PURE but the one browser door at the end (picking a file):
// numbers and objects in, objects out, so a node test holds the round trip.
// The window that asks the two questions is components/ProjectFileModal.jsx.

import { migrateCabinetProfile } from '../engine/profile.js';
import { projectWithLogo } from './projectLibrary.js';

export const PROJECT_FILE_FORMAT = 'cabinet-core-project';
export const PROJECT_FILE_VERSION = 1;
export const PROJECT_FILE_EXT = '.ccproject';
/** What the file picker offers: the file's own extension, and JSON for a file a mail program renamed. */
const PROJECT_FILE_ACCEPT = `${PROJECT_FILE_EXT},.json,application/json`;

const pad = (n) => String(n).padStart(2, '0');

/** dd.mm.yyyy, the way the workshop writes a date. */
function fileDate(at) {
  const d = at instanceof Date ? at : new Date(Number(at) || 0);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

/** dd.mm.yyyy hh:mm, the start screen's own stamp; '' for no time at all. */
export function fileStamp(at) {
  const ms = at instanceof Date ? at.getTime() : (typeof at === 'string' ? Date.parse(at) : Number(at));
  if (!Number.isFinite(ms) || ms <= 0) return '';
  const d = new Date(ms);
  return `${fileDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Windows refuses these in a file name; so do the control characters.
const WINDOWS_BAD = /[<>:"/\\|?*\u0000-\u001f]/g;
const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
const NAME_MAX = 120;

/** A part of a file name Windows, macOS and a USB stick all take. */
export function safeFilePart(text) {
  let s = String(text ?? '').replace(WINDOWS_BAD, ' ').replace(/\s+/g, ' ').trim();
  // A name may not END in a dot or a space on Windows.
  s = s.replace(/[. ]+$/g, '');
  if (s.length > NAME_MAX) s = s.slice(0, NAME_MAX).replace(/[. ]+$/g, '');
  if (WINDOWS_RESERVED.test(s)) s = `${s} project`;
  return s;
}

/**
 * The file's name: `${number} ${name} ${dd.mm.yyyy}.ccproject`, the way a
 * Downloads folder can tell two jobs and two days apart.
 */
export function projectFileName(project, now = new Date()) {
  const parts = [project?.number, project?.name]
    .map((v) => String(v ?? '').trim())
    .filter(Boolean);
  const base = safeFilePart(parts.join(' ')) || 'Cabinet Core project';
  return `${base} ${fileDate(now)}${PROJECT_FILE_EXT}`;
}

/**
 * The job with its material assignments folded in, exactly as lib/persist.js
 * folds them for a save: the live blob of the assignment store when there is
 * one, else what the project already carried.
 */
export function withAssignments(project, live = null) {
  const assignments = live || project?.assignments || null;
  return assignments ? { ...project, assignments } : project;
}

/** The build that wrote a file, as the corner of the app shows it. */
function buildStamp() {
  // eslint-disable-next-line no-undef
  return typeof __BUILD_STAMP__ !== 'undefined' ? __BUILD_STAMP__ : 'dev';
}

/**
 * The file as an object. `storage`, when given, puts a logo the shelf keeps as
 * a `{ ref }` back WHOLE: a file read on another computer has no shelf to look
 * the picture up on.
 */
export function buildProjectFile({
  project, units, assignments = null, profile = null, at = Date.now(), storage = null,
}) {
  const folded = withAssignments(project || {}, assignments);
  const whole = storage ? projectWithLogo(storage, folded) : folded;
  return {
    format: PROJECT_FILE_FORMAT,
    version: PROJECT_FILE_VERSION,
    saved_at: new Date(Number(at) || Date.now()).toISOString(),
    app: { name: 'Cabinet Core', build: buildStamp() },
    project: whole,
    units: Array.isArray(units) ? units : [],
    profile: profile || null,
  };
}

/** The file's text. One space of indent: a person can read it, and a logo does not double it. */
export function projectFileText(file) {
  return `${JSON.stringify(file, null, 1)}\n`;
}

/**
 * Read a file's text. `{ ok: true, file }` with the job, its units, its
 * workshop settings and when it was saved; `{ ok: false, error }` with the
 * reason in words otherwise. Nothing here throws.
 */
export function parseProjectFile(text) {
  if (typeof text !== 'string' || !text.trim()) {
    return { ok: false, error: 'That file is empty: there is no project in it.' };
  }
  let data;
  try {
    data = JSON.parse(text.replace(/^﻿/, ''));
  } catch {
    return { ok: false, error: 'That file is not a Cabinet Core project: its text cannot be read as one.' };
  }
  if (!data || typeof data !== 'object' || data.format !== PROJECT_FILE_FORMAT) {
    return { ok: false, error: 'That file is not a Cabinet Core project file (.ccproject).' };
  }
  const version = Number(data.version);
  if (!Number.isInteger(version) || version < 1) {
    return { ok: false, error: 'That project file names no version Cabinet Core can read.' };
  }
  if (version > PROJECT_FILE_VERSION) {
    return {
      ok: false,
      error: `That project file was saved by a newer Cabinet Core (file version ${version}); this one reads version `
        + `${PROJECT_FILE_VERSION}. Update the app and open it again.`,
    };
  }
  if (!data.project || typeof data.project !== 'object' || Array.isArray(data.project)) {
    return { ok: false, error: 'That project file holds no project.' };
  }
  if (!Array.isArray(data.units)) {
    return { ok: false, error: 'That project file holds no list of cabinets.' };
  }
  const profile = data.profile && typeof data.profile === 'object' && !Array.isArray(data.profile) ? data.profile : null;
  const savedAt = Date.parse(String(data.saved_at || ''));
  return {
    ok: true,
    file: {
      version,
      savedAt: Number.isFinite(savedAt) ? savedAt : 0,
      app: data.app && typeof data.app === 'object' ? data.app : null,
      project: data.project,
      units: data.units,
      profile,
    },
  };
}

/** The job's name as the workshop says it: `number · name`. */
export function jobLabel(project) {
  const number = String(project?.number ?? '').trim();
  const name = String(project?.name ?? '').trim() || 'Untitled project';
  return number ? `${number} · ${name}` : name;
}

/** The shelf's row this file's job would land on (the same id), or null. */
export function shelfCollision(rows, project) {
  const id = project?.id;
  if (!id) return null;
  return (Array.isArray(rows) ? rows : []).find((r) => r && r.id === id) || null;
}

const isPlain = (v) => v && typeof v === 'object' && !Array.isArray(v);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** Every leaf where two objects differ: `[{ path, a, b }]`, arrays compared whole. */
export function objectDifferences(a, b, path = '') {
  if (isPlain(a) && isPlain(b)) {
    const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
    return keys.flatMap((k) => objectDifferences(a[k], b[k], path ? `${path}.${k}` : k));
  }
  return same(a, b) ? [] : [{ path, a, b }];
}

/**
 * The workshop settings of the file against this computer's, both through
 * migrateCabinetProfile (an older file's settings are merged with today's
 * keys, never trusted raw). Null when they agree, or when the file carries
 * none; else `{ count, rows: [{ path, file, here }] }`.
 */
export function compareProfiles(fileProfile, hereProfile) {
  if (!isPlain(fileProfile)) return null;
  const mine = migrateCabinetProfile(fileProfile);
  const here = migrateCabinetProfile(hereProfile) || hereProfile;
  if (!mine || !here) return null;
  const rows = objectDifferences(mine, here).map((d) => ({ path: d.path, file: d.a, here: d.b }));
  return rows.length ? { count: rows.length, rows } : null;
}

/** A settings path the way a person reads it: `carcass > shelf setback mm`. */
export function settingWords(path) {
  return String(path || '').split('.')
    .map((part) => part.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase())
    .join(' > ');
}

/** A setting's value in a line of text. */
export function settingValue(v) {
  if (v === undefined) return 'nothing';
  if (typeof v === 'string') return v;
  const s = JSON.stringify(v);
  return s.length > 40 ? `${s.slice(0, 39)}…` : s;
}

/**
 * The two questions opening a file can ask, before anything is written:
 * `collision` (the shelf's row with this job's id) and `profile` (the
 * settings that differ). Both null: the file opens without a window.
 */
export function projectFileQuestions({ file, shelfRows = [], hereProfile = null }) {
  return {
    collision: shelfCollision(shelfRows, file?.project),
    profile: compareProfiles(file?.profile, hereProfile),
  };
}

/**
 * The job to put on the shelf. `replace` keeps the file's id, so the shelf's
 * row of that job is overwritten; `copy` takes a new id and the name the
 * shelf's own copy takes (Save as: `${name} copy`), so both stand.
 */
export function projectForOpen(file, mode = 'replace') {
  const project = { ...(file?.project || {}) };
  if (mode === 'copy') {
    return { ...project, id: null, name: `${String(project.name || 'Untitled project').trim()} copy` };
  }
  return project;
}

// ─── THE ONE BROWSER DOOR ────────────────────────────────────────────────────

/**
 * Ask the browser for a file. Resolves `{ name, text }`, or null when the
 * picker is closed with nothing chosen. Called from the click itself (a menu
 * entry, a button): a browser opens its picker only for a person's gesture.
 */
export function pickProjectFile(doc = (typeof document !== 'undefined' ? document : null)) {
  return new Promise((resolve) => {
    if (!doc?.body) { resolve(null); return; }
    const input = doc.createElement('input');
    input.type = 'file';
    input.accept = PROJECT_FILE_ACCEPT;
    input.style.display = 'none';
    input.setAttribute('data-project-file-input', '1');
    let done = false;
    const finish = (value) => {
      if (done) return;
      done = true;
      input.remove();
      resolve(value);
    };
    input.addEventListener('change', () => {
      const f = input.files && input.files[0];
      if (!f) { finish(null); return; }
      f.text().then((text) => finish({ name: f.name, text }), () => finish({ name: f.name, text: null }));
    });
    input.addEventListener('cancel', () => finish(null));
    doc.body.appendChild(input);
    input.click();
  });
}
