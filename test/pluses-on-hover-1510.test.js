/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── 15.10.2026 · THE PLUSES WAIT FOR THE HAND ──────────────────────────────
//
// The owner: *"jak mamy wyspę, a nawet jak nie mamy szafek, to wszędzie w
// przestrzeni są plusiki denerwujące; pokaż plusiki dopiero jak najedziesz na
// szafkę, albo jak najedziesz na miejsce w którym ma być szafka na wyspie."*
//
// The scene (src/3d/Scene.jsx) draws a run's end pluses only while the pointer
// is over a cabinet of that run, and an empty island face's plus only while
// the pointer is over the volume its cabinet would stand in. The plus itself
// counts as that place, and the hold outlives the pointer by a moment. These
// are source checks, the way turn 61 pinned the eight channels: the
// behaviour itself is a WebGL hover and lives in the acceptance walk.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ROOT = new URL('../', import.meta.url);
const read = (rel) => readFileSync(new URL(rel, ROOT), 'utf8');

const scene = read('src/3d/Scene.jsx');
const plus = read('src/3d/AddPlus.jsx');
const plan = read('src/3d/IslandPlan.jsx');

test('the plus tells the scene when the hand is on it, and keeps everything else it had', () => {
  assert.match(plus, /onHoverIn = null, onHoverOut = null/);
  assert.match(plus, /onPointerOver=\{\(e\) => \{ e\.stopPropagation\(\); setHover\(true\); document\.body\.style\.cursor = 'pointer'; onHoverIn\?\.\(\); \}\}/);
  assert.match(plus, /onPointerOut=\{\(\) => \{ setHover\(false\); document\.body\.style\.cursor = ''; onHoverOut\?\.\(\); \}\}/);
  // T61 F1's channel and the walk's handle stand.
  assert.match(plus, /if \(!chromeOn\('plus'\)\) return null;/);
  assert.match(plus, /userData=\{\{ ccHelper: true, ccAddPlus: true \}\}/);
});

test('the scene holds the run under the hand, a moment longer than the hand', () => {
  assert.match(scene, /const PLUS_GRACE_MS = 700;/);
  assert.match(scene, /const \[plusHover, setPlusHover\] = useState\(null\);/);
  assert.match(scene, /const holdPlus = useCallback\(\(key\) => \{ clearTimeout\(plusHoverTimer\.current\); setPlusHover\(key\); \}, \[\]\);/);
  assert.match(scene, /setTimeout\(\(\) => setPlusHover\(\(h\) => \(h === key \? null : h\)\), PLUS_GRACE_MS\)/);
  // The whole run, not only the cabinet the plus stands beside.
  assert.match(scene, /runMemberIds\(units, plusHover, profile\)/);
  assert.match(scene, /shown=\{plusRun\}/);
  assert.match(scene, /if \(shown && !shown\.has\(point\.unitId\)\) return null;/);
  // Every cabinet sits in a hold group that draws nothing.
  assert.match(scene, /<group\n\s+key=\{unit\.id\}\n\s+onPointerOver=\{\(e\) => \(firstOnRay\(e\) \? holdPlus\(unit\.id\) : dropPlus\(unit\.id\)\)\}/);
  assert.match(scene, /onPointerOut=\{\(\) => dropPlus\(unit\.id\)\}/);
});

test('an empty island face has an invisible volume where its cabinet would stand; the plus waits for it', () => {
  assert.match(scene, /function PlusZone\(\{ wall, roomCentre, depth, height, onHold, onDrop \}\)/);
  assert.match(scene, /userData=\{\{ ccHelper: true, ccPlusZone: true \}\}/);
  assert.match(scene, /visible=\{false\}/);
  assert.match(scene, /if \(onHold && hover !== `island:\$\{wall\.index\}`\) \{/);
  assert.match(scene, /hover=\{plusHover\}\n\s+onHold=\{holdPlus\}\n\s+onDrop=\{dropPlus\}/);
  // The first thing on the ray wins the hold; the zones are air.
  assert.match(scene, /function firstOnRay\(e\)/);
  assert.match(scene, /if \(hit\.object\?\.userData\?\.ccPlusZone && hit\.object !== e\.object\) continue;/);
});

test('the island plan\'s Add cabinet takes what the face has free, and says so when it has none', () => {
  assert.match(plan, /const free = planFaceFree\(plan, face, profile\);/);
  assert.match(plan, /if \(free < 150\) \{ setSaid\(`Face \$\{face\} has \$\{Math\.max\(0, free\)\} mm free: take a cabinet off it, or make the island bigger\.`\); return; \}/);
  assert.match(plan, /planCabinet\(face, type, Math\.min\(600, Math\.floor\(free \/ 10\) \* 10\)\)/);
});
