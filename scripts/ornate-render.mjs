#!/usr/bin/env node
// Offline QA view using the exact engine and the exact Three.js solid builder.
// Browser screenshots are local QA evidence. Deliverable PNGs are exported
// straight from the real WebGL canvas, not a copy of browser UI.
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createServer } from 'vite';
import { open } from './t74-harness.mjs';
const root=resolve('verify/ornate-a');mkdirSync(root,{recursive:true});
const port=Number(process.env.ORNATE_RENDER_PORT||4187);
const server=await createServer({server:{host:'127.0.0.1',port,strictPort:true,hmr:false,watch:{ignored:['**/*']}},clearScreen:false});
await server.listen();
const page=await open({width:1880,height:1000});
try{
 await page.goto(`http://127.0.0.1:${port}/scripts/ornate-preview.html`);
 await page.waitFor('window.__ornatePreview?.ready',{timeout:90000});
 const status=await page.ask('window.__ornatePreview');
 if(status.errors.length||status.variants.length!==4)throw Error(JSON.stringify(status));
 await page.screenshot(resolve(root,'preview-browser-qa.png'));
 const canvases=await page.ask(`[...document.querySelectorAll('canvas')].map(c=>c.toDataURL('image/png'))`);
 canvases.forEach((png,i)=>writeFileSync(resolve(root,`render-variant-${i+1}.png`),Buffer.from(png.split(',')[1],'base64')));
 // Compose a reusable figure from rendered canvas content only.
 const figure=await page.ask(`(() => {
  const c=document.createElement('canvas');c.width=2400;c.height=1400;const g=c.getContext('2d');
  g.fillStyle='#eeebe6';g.fillRect(0,0,c.width,c.height);g.fillStyle='#2e3436';
  g.font='48px Georgia';g.fillText('Ornate A | Four variants',66,90);
  g.font='22px Arial';g.fillStyle='#747870';g.fillText('600 × 800 × 18 mm | Actual Cabinet Core geometry',66,134);
  [...document.querySelectorAll('canvas')].forEach((source,i)=>{
   g.drawImage(source,40+i*580,190,580,580*source.height/source.width);g.fillStyle='#85877f';g.font='18px Arial';
   g.fillText('VARIANT '+(i+1),76+i*580,1100);g.fillStyle='#333c3b';g.font='32px Georgia';
   g.fillText(['Classic','Symmetric','Soft','Plain'][i],76+i*580,1148);
  });
  g.strokeStyle='#cbc8c2';g.beginPath();g.moveTo(66,1235);g.lineTo(2334,1235);g.stroke();
  g.font='22px Arial';g.fillStyle='#8c784f';g.fillText('Proposed pattern. Physical ornament, dimensions and CAM require workshop approval.',66,1308);
  return c.toDataURL('image/png');
 })()`);
 writeFileSync(resolve(root,'render-four-variants.png'),Buffer.from(figure.split(',')[1],'base64'));
 await page.goto(`http://127.0.0.1:${port}/scripts/ornate-preview.html?detail`);
 await page.waitFor('window.__ornatePreview?.ready',{timeout:90000});
 const large=await page.ask(`document.querySelector('canvas').toDataURL('image/png')`);
 writeFileSync(resolve(root,'render-variant-1-large.png'),Buffer.from(large.split(',')[1],'base64'));
 await page.screenshot(resolve(root,'preview-detail-browser-qa.png'));
 writeFileSync(resolve(root,'render-verification.json'),JSON.stringify({variants:status.variants,errors:page.errors},null,2));
 console.log(JSON.stringify(status));
}finally{await page.close();await server.close();}
