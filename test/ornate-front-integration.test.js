import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { FRONT_STYLE_OPTIONS, frontStyleSelection, migrateDesign, normaliseDoorStyle, resolveUnitDesign } from '../src/engine/design.js';
import { defaultFrontDecoration, boardRefusal } from '../src/engine/frontDecoration.js';
import { drawnFrontStyleIds } from '../src/engine/frontStyleArt.js';
import { DEFAULT_CABINET_PROFILE as PROFILE } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { paramsForEngine, useProjectStore } from '../src/stores/projectStore.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';
import { buildBom } from '../src/engine/bom.js';

const STYLES=['ORNATE_A_1','ORNATE_A_2','ORNATE_A_3','ORNATE_A_4'];
const room=()=>migrateRoom({height:2500,corners:rectCorners(6000,3000)});
const make=(style,extra={})=>computeCabinet({...defaultParamsFor('BUD',PROFILE),front_type:style,
  front_decoration:defaultFrontDecoration(style),...extra},PROFILE);

test('all four ornate gallery selections resolve explicit profile recipes through JSON persistence',()=>{
 for(const style of STYLES){
  assert.ok(FRONT_STYLE_OPTIONS.some(option=>option.id===style),`${style} option`);
  assert.ok(drawnFrontStyleIds().includes(style),`${style} thumbnail`);
  const chosen=frontStyleSelection(style);
  assert.deepEqual(chosen.decoration,defaultFrontDecoration(style));
  const saved=migrateDesign(JSON.parse(JSON.stringify({fronts:chosen})));
  assert.deepEqual(resolveUnitDesign({params:{}},saved).frontDecoration,chosen.decoration);
  assert.equal(chosen.decoration.mirror,false);
 }
});

test('project, front slot, saved style and unit retain ornate mirroring without crossing styles',()=>{
 const recipe={...defaultFrontDecoration('ORNATE_A_1'),mirror:true};
 const design=migrateDesign({fronts:{style:'ORNATE_A_1',decoration:recipe,types:[{id:'f1',style:'ORNATE_A_1',decoration:recipe}]},
  doorStyles:[{id:'s1',frontType:'ORNATE_A_1',decoration:recipe}]});
 for(const params of [{},{front_type_id:'f1'},{door_style_id:'s1'},{front_type:'ORNATE_A_1',front_decoration:recipe}]){
  assert.equal(resolveUnitDesign({params},design).frontDecoration.mirror,true);
 }
 assert.equal(frontStyleSelection('ORNATE_A_1',design.fronts).decoration.mirror,true);
 assert.equal(frontStyleSelection('ORNATE_A_4',design.fronts).decoration.mirror,false);
 assert.equal(normaliseDoorStyle({id:'different',frontType:'G',decoration:recipe}).decoration,undefined);
 assert.equal(resolveUnitDesign({params:{front_type:'F'}},design).frontDecoration,undefined);
});

test('saved ornate projects rebuild the same cabinet fronts and operation coordinates',()=>{
 const s=()=>useProjectStore.getState();
 s().loadProject({id:null,name:'Ornate integration',room:room(),design:{}},[]);
 const recipe={...defaultFrontDecoration('ORNATE_A_1'),mirror:true};
 s().setProjectDefaults({fronts:{...frontStyleSelection('ORNATE_A_1'),decoration:recipe}});
 const unit={id:'ornate-unit',type:'BUD',params:{...defaultParamsFor('BUD',PROFILE),front_type:'ORNATE_A_1',front_decoration:recipe},position:{x_mm:0}};
 // First load performs the application's existing unit migrations. The
 // round trip starts with that canonical state, just like a real saved job.
 s().loadProject(JSON.parse(JSON.stringify(s().project)),[unit]);
 const project=JSON.parse(JSON.stringify(s().project));const units=JSON.parse(JSON.stringify(s().units));
 const before=computeCabinet(paramsForEngine(s().units[0],s().project.design),PROFILE);
 s().loadProject(project,units);
 const after=computeCabinet(paramsForEngine(s().units[0],s().project.design),PROFILE);
 const hash=(value)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
 assert.equal(hash(after.panels),hash(before.panels));
 assert.deepEqual(after.drills,before.drills);
 assert.ok(after.panels.some(p=>p.meta?.frontDecoration?.parameters.mirror));
});

test('ornate styles preserve cabinet structure, hardware and rear drilling while changing only front records',()=>{
 const plain=make('F');
 for(const style of STYLES){
  const built=make(style);
  assert.deepEqual(built.panels.filter(p=>p.role!=='front'),plain.panels.filter(p=>p.role!=='front'),style);
  assert.deepEqual(built.drills,plain.drills,style);
  assert.deepEqual(built.hardware,plain.hardware,style);
  const fronts=built.panels.filter(p=>p.role==='front');assert.ok(fronts.length>0);
  for(const p of fronts){assert.equal(p.meta.frontDecoration.style,style);assert.equal(p.meta.frontDecoration.referenceOnly,true);}
 }
});

test('BOM never merges different ornate variants or mirrored recipes into the same front row',()=>{
 const jobs=STYLES.map((style,i)=>({unit:{id:`ornate-${i}`},result:make(style)}));
 jobs.push({unit:{id:'ornate-mirror'},result:make('ORNATE_A_1',{front_decoration:{...defaultFrontDecoration('ORNATE_A_1'),mirror:true}})});
 const bom=buildBom(jobs);const fronts=bom.cutRows.filter(p=>p.role==='front');
 assert.equal(fronts.length,5);
 assert.ok(fronts.every(p=>p.qty===1));
 assert.equal(new Set(fronts.map(p=>p.manufacturing.identity)).size,5);
});

test('legacy ornate name without a recipe does not silently opt into machining',()=>{
 const legacy=migrateDesign({fronts:{style:'ORNATE_A_1'}});
 assert.equal(Object.hasOwn(legacy.fronts,'decoration'),false);
 assert.equal(resolveUnitDesign({params:{}},legacy).frontDecoration,undefined);
});


test('board refusal counts the deeper corner relief in an owner-adjusted ornate profile',()=>{
 const profile=structuredClone(PROFILE);
 profile.front.decoration.ORNATE_A_1.cornerDepthMm=16;
 const refusal=boardRefusal('ORNATE_A_1',18,profile);
 assert.equal(refusal.needMm,19);
 assert.equal(refusal.haveMm,18);
 assert.equal(refusal.code,'FRONT_DECORATION_BOARD_TOO_THIN');
 assert.equal(boardRefusal('ORNATE_A_1',19,profile),null);
});

// T77 F6 · the cut list sentence names the ornament it carries.
test('the cut list sentence says relief proposed, and names the ornament placeholder',()=>{
 for(const style of STYLES){
  const bom=buildBom([{unit:{id:style},result:make(style)}]);
  const front=bom.cutRows.find(p=>p.role==='front');
  assert.match(front.manufacturing.construction,/relief proposed, not production approved/);
  assert.match(front.manufacturing.construction,style==='ORNATE_A_4'?/ornament: none$/:/ornament: procedural placeholder$/);
  assert.equal(front.readiness,'cut','the slab is cut');
 }
});
