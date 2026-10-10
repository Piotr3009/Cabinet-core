#!/usr/bin/env node
// Copyright Skylon Development Ltd. All rights reserved.
// Ornate A acceptance: genuine mouse / keyboard input into PRO and retail.
// T74's empty-project staging is the only direct store setup. Feature state
// is only READ: selectors, mirroring, saving and opening use actual controls.
// Run against a build or dev server: E2E_URL=http://127.0.0.1:4173/
// CHROME_PATH=/path/to/chromium node scripts/ornate-walk.mjs [pro|retail|cnc]
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import JSZip from 'jszip';
import { createServer } from 'vite';
import { open, pro, room, withWardrobe, showroomDown, reach, BASE } from './t74-harness.mjs';
import { boxOf, clickWith, choose } from './t75-harness.mjs';

const output = resolve('verify/ornate-a');
const downloads = resolve(output, `browser-downloads-${Date.now()}`);
mkdirSync(downloads, { recursive: true });
const styles = ['ORNATE_A_1', 'ORNATE_A_2', 'ORNATE_A_3', 'ORNATE_A_4'];
const checks = [];
const j = JSON.stringify;
const wanted = process.argv.slice(2);
const check = (label, ok, detail = null) => {
  checks.push({ label, ok: Boolean(ok), detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${detail == null ? '' : `: ${JSON.stringify(detail)}`}`);
};
const vite = process.env.CC_WALK_SERVER === '1'
  ? await createServer({ server: { host: '127.0.0.1', port: Number(new URL(BASE).port || 4173), strictPort: true, hmr: false, watch: { ignored: ['**/*'] } }, clearScreen: false }) : null;
await vite?.listen();
const state = (page) => page.ask(`(() => {
  const s=window.__cc.project.getState(); const u=s.units[0]; const r=u&&s.unitResult(u.id);
  return { projectName:s.project.name, dirty:s.dirty, projectFront:s.project.design?.fronts,
    unitId:u?.id, type:u?.type, params:u?.params,
    fronts:r?.panels.filter(p=>p.role==='front'&&!p.meta?.frontDecorationParent).map(p=>({
      id:p.id,w:p.w,h:p.h,t:p.thickness,deco:p.meta?.frontDecoration }))||[] };
})()`);
const compact = (s) => ({ style:s.params?.front_type || s.projectFront?.style,
  fronts:s.fronts.map(p=>({id:p.id,w:p.w,h:p.h,t:p.t,style:p.deco?.style,status:p.deco?.status,
    referenceOnly:p.deco?.referenceOnly,mirror:p.deco?.parameters?.mirror,
    problems:p.deco?.problems,operations:p.deco?.operations?.length})) });
const meshes = (page) => page.ask(`(() => { const out=[]; window.__cc.views?.room?.scene.traverse(m=> {
 if(!m.isMesh||!m.geometry?.userData?.frontDecoration) return; out.push({ id:m.userData?.ccPanelId,
 style:m.geometry.userData.frontDecoration.style, vertices:m.geometry.attributes.position.count });
 });return out;})()`);
const waitMeshes = (page, style) => page.waitFor(`(() => {let yes=false; window.__cc.views?.room?.scene.traverse(m=>{
 if(m.isMesh&&m.geometry?.userData?.frontDecoration?.style===${j(style)})yes=true;});return yes;})()`, { timeout:45000 });
const shot = (page, name) => page.screenshot(resolve(output, `${name}.png`));
async function menu(page,name,item) {
 await page.click('nav[aria-label="Main menu"] > div > button',name,{exact:true});await page.sleep(250);
 if(item)await page.press('[role="menuitem"]',item);
}
async function downloadAfter(page, action, extension) {
 const before=new Set(readdirSync(downloads));await action();
 for(let n=0;n<100;n+=1){const file=readdirSync(downloads).find(f=>!before.has(f)&&f.endsWith(extension));
  if(file)return resolve(downloads,file); await page.sleep(200);}
 throw Error(`No ${extension} download; ${await page.ask('document.body.innerText')}`);
}
async function runPro(page) {
 await pro(page);await page.send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:downloads,eventsEnabled:true});
 await menu(page,'Library','Kitchen');await page.press('[data-library-group="base-units"]');
 await page.press('[data-library-entry="door-base"]');await page.press('[aria-label="Close the library"]');
 await page.press('button','Doors');await page.press('button','Add doors');
 const target=(await state(page));
 for(const prefer of ['top','bottom','middle']) {const p=await reach(page,target.unitId,target.fronts[0].id,{prefer});
  if(!p)continue;await page.clickAt(p.x,p.y);if(await page.has('[data-unit-name]'))break;}
 if(await page.has('[data-section="Carcass"][data-open="0"]'))await page.press('[data-section="Carcass"] > button');
 check('PRO adds a base and doors through the library', (await state(page)).fronts.length>0);
 for(const style of styles) {
  const chosen=await choose(page,"document.querySelector('[data-unit-front-type]')",style);
  if(!chosen.ok)throw Error(`Could not select ${style}`);
  await page.sleep(600);const s=await state(page);
  check(`PRO ${style} selection reaches front metadata`,s.params.front_type===style&&s.fronts.length>0&&s.fronts.every(p=>p.deco?.style===style),compact(s));
  check(`PRO ${style} remains a proposal`,s.fronts.every(p=>p.deco?.referenceOnly===true),compact(s));
  await waitMeshes(page,style);const m=await meshes(page);
  check(`PRO ${style} renders its solid`,m.some(p=>p.style===style&&p.vertices>100),m);
  check(`PRO ${style} has no numeric recipe controls`,await page.count('[data-decoration-field]')===0);
  await shot(page,`pro-${style}`);
 }
 // A chiral variation must survive a real save/open cycle.
 await choose(page,"document.querySelector('[data-unit-front-type]')",'ORNATE_A_1');await page.sleep(700);
 await page.press('[data-ornate-mirror="ORNATE_A_1"]');
 const mirrored=await state(page);
 check('PRO mirror checkbox changes stored recipe',mirrored.params.front_decoration?.mirror===true&&mirrored.fronts.every(p=>p.deco?.parameters?.mirror===true),compact(mirrored));
 await shot(page,'pro-mirrored');
 // The existing CNC menu exports a reference package for unapproved faces.
 const zipPath=await downloadAfter(page,()=>menu(page,'Output','CNC / DXF'),'.zip');
 const archive=await JSZip.loadAsync(readFileSync(zipPath));const names=Object.keys(archive.files);
 const jsons=names.filter(n=>/operations\.json$/.test(n));
 const manifests=await Promise.all(jsons.map(async n=>({name:n,value:JSON.parse(await archive.file(n).async('string'))})));
 const dxfs=names.filter(n=>/\.dxf$/i.test(n));
 const dxfTexts=await Promise.all(dxfs.map(async n=>({name:n,text:await archive.file(n).async('string')})));
 check('PRO CNC menu downloads DXF and operation metadata',dxfs.length>0&&jsons.length>0,{file:zipPath,names});
 check('PRO downloaded package labels ornate proposal as reference',dxfTexts.some(f=>/REF|REFERENCE/i.test(f.name+' '+f.text))&&manifests.some(m=>/reference|approval|unapproved/i.test(JSON.stringify(m.value))),{manifests:manifests.map(m=>m.name),dxfs});
 writeFileSync(resolve(output,'browser-cnc-manifests.json'),JSON.stringify(manifests,null,2));
 if(await page.has('[data-check-panel] button[title="Close"]'))await page.press('[data-check-panel] button[title="Close"]');
 const before=JSON.stringify((await state(page)).fronts);const name=(await state(page)).projectName;
 await page.press('[data-save-control]');await page.waitFor('!window.__cc.project.getState().dirty',{timeout:15000});
 check('PRO Save writes the selected recipe',!((await state(page)).dirty));
 await page.send('Page.reload',{ignoreCache:true});await page.sleep(2000);
 await page.waitFor('window.__cc && window.__cc.project',{timeout:45000});
 await page.waitFor(`[...document.querySelectorAll('li button')].some(b=>b.offsetParent&&b.textContent.includes(${j(name)}))`,{timeout:25000});
 const at=await boxOf(page,`[...document.querySelectorAll('li button')].find(b=>b.offsetParent&&b.textContent.includes(${j(name)}))`);
 await clickWith(page,at.x,at.y);await page.waitFor('window.__cc.views?.room',{timeout:45000});await page.sleep(1800);
 check('PRO saved project reopens with identical front metadata',JSON.stringify((await state(page)).fronts)===before,compact(await state(page)));
 await waitMeshes(page,'ORNATE_A_1');await shot(page,'pro-reloaded');
}
async function runRetail(page) {
 await room(page);await withWardrobe(page);
 await page.send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:downloads,eventsEnabled:true});
 await page.press('[data-testid="cat-fronts"]');
 if(!(await state(page)).params.doors)await page.press('[data-testid="fronts-add-doors"]');
 for(const style of styles){
  await page.press(`[data-testid="fronts-style-${style}"]`);await page.sleep(700);const s=await state(page);
  check(`Retail ${style} real tile selects style and geometry`,s.projectFront.style===style&&s.fronts.length>0&&s.fronts.every(p=>p.deco?.style===style),compact(s));
  check(`Retail ${style} offers no numeric recipe fields`,await page.count('[data-testid="panel-fronts"] input[type="number"], [data-decoration-field]')===0);
  await waitMeshes(page,style);check(`Retail ${style} renders ornate solid`,(await meshes(page)).some(m=>m.style===style));
  await shot(page,`retail-${style}`);
 }
 await page.press('[data-testid="fronts-style-ORNATE_A_1"]');await page.sleep(500);
 await page.press('[data-ornate-mirror="ORNATE_A_1"]');const before=JSON.stringify((await state(page)).fronts);
 check('Retail mirror checkbox changes recipe',(await state(page)).projectFront.decoration.mirror===true);
 await page.press('[data-testid="cat-review"]');await page.press('[data-testid="review-done"]');
 await page.waitFor('document.querySelector(\'[data-testid="estimate-edit-1"]\')',{timeout:45000});
 const file=await downloadAfter(page,()=>page.press('[data-testid="estimate-save"]'),'.json');
 const saved=JSON.parse(readFileSync(file,'utf8'));
 check('Retail estimate file contains selected ornate recipe and mirror',/ORNATE_A_1/.test(JSON.stringify(saved))&&/"mirror":true/.test(JSON.stringify(saved)),{file});
 const started=await page.ask('performance.timeOrigin');await page.send('Page.reload',{});
 await page.waitFor(`performance.timeOrigin!==${started}&&document.querySelector('[data-testid="estimate-empty"]')`,{timeout:60000});
 const doc=await page.send('DOM.getDocument',{});
 const input=await page.send('DOM.querySelector',{nodeId:doc.root.nodeId,selector:'[data-testid="detail-load"]'});
 await page.send('DOM.setFileInputFiles',{nodeId:input.nodeId,files:[file]});
 await page.waitFor('document.querySelector(\'[data-testid="estimate-edit-1"]\')',{timeout:30000});
 await page.press('[data-testid="estimate-edit-1"]');
 await page.waitFor('window.__cc?.project?.getState().units.length>0&&document.querySelector(\'[data-testid="cat-fronts"]\')',{timeout:60000});
 await page.sleep(1800);const after=await state(page);
 check('Retail actual save/load preserves identical front metadata',JSON.stringify(after.fronts)===before,compact(after));
 await page.press('[data-testid="cat-fronts"]');await waitMeshes(page,'ORNATE_A_1');await shot(page,'retail-reloaded');
}

async function runCnc(page) {
 await pro(page);
 await menu(page,'Library','Kitchen');await page.press('[data-library-group="base-units"]');
 await page.press('[data-library-entry="door-base"]');await page.press('[aria-label="Close the library"]');
 await page.press('button','Doors');await page.press('button','Add doors');
 const target=await state(page);
 for(const prefer of ['top','bottom','middle']){const at=await reach(page,target.unitId,target.fronts[0].id,{prefer});
  if(!at)continue;await page.clickAt(at.x,at.y);if(await page.has('[data-unit-name]'))break;}
 if(await page.has('[data-section="Carcass"][data-open="0"]'))await page.press('[data-section="Carcass"] > button');
 const chosen=await choose(page,"document.querySelector('[data-unit-front-type]')",'ORNATE_A_1');
 check('CNC focused run selects actual ornate style',chosen.ok&&(await state(page)).fronts.every(p=>p.deco?.style==='ORNATE_A_1'));
 await waitMeshes(page,'ORNATE_A_1');
 check('Final detailed ornate surface renders after the real selection',(await meshes(page)).some(m=>m.style==='ORNATE_A_1'&&m.vertices>100));
 await menu(page,'View','CNC sheet');await page.press('[data-testid="cnc-face-front"]');
 if(await page.has('button[title="Fit the whole sheet"]'))await page.press('button[title="Fit the whole sheet"]');
 const frontView=await page.ask(`({face:document.querySelector('[data-cnc-face]')?.getAttribute('data-cnc-face'),
  features:document.querySelectorAll('[data-cnc-decoration]').length,
  labels:document.body.innerText})`);
 check('Front CNC sheet visibly draws reference entities',frontView.face==='front'&&frontView.features>4,{face:frontView.face,features:frontView.features});
 const expected=['FRONT_REF_PROFILE_D3','FRONT_REF_PROFILE_D6','FRONT_REF_PROFILE_D9','FRONT_REF_PROFILE_D12','FRONT_REF_ORNAMENT'];
 check('Front CNC legend names profile depths and ornamental reference layer',expected.every(layer=>frontView.labels.includes(layer)),expected);
 check('Front CNC sheet marks relief as a proposed reference',frontView.labels.includes('Proposed relief reference'));
 await shot(page,'pro-cnc-front-reference');
 await page.press('[data-testid="cnc-face-back"]');
 check('Rear CNC setup remains selectable',await page.has('[data-cnc-face="back"]'));
}

try {
 for(const [name,run] of [['pro',runPro],['retail',runRetail],['cnc',runCnc]]){
  if(wanted.length&&!wanted.includes(name))continue;
  const page=await open({width:1600,height:1050});const exceptions=[];
  page.socket.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.method==='Runtime.exceptionThrown')exceptions.push(m.params.exceptionDetails);});
  try{await run(page);check(`${name} has no runtime exception`,exceptions.length===0,exceptions);}
  catch(error){check(`${name} walk completes`,false,String(error.stack||error));await shot(page,`${name}-failure`).catch(()=>{});
   writeFileSync(resolve(output,`${name}-failure-dom.txt`),await page.ask('document.body.innerText').catch(()=>''));}
  finally{writeFileSync(resolve(output,`${name}-browser.json`),JSON.stringify({errors:page.errors,exceptions},null,2));await page.close();}
 }
}finally{
 writeFileSync(resolve(output,`walk${wanted.length?'-'+wanted.join('-'):''}.json`),JSON.stringify({base:BASE,checks,downloads},null,2));
 await showroomDown();await vite?.close();
}
if(checks.some(c=>!c.ok))process.exitCode=1;
