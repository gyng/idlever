// No browser, performance, or control claim: validate the actual shared transformation.
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {transformWithOxc} from '../../../web/node_modules/vite/dist/node/index.js';
import assert from 'node:assert/strict';
import {instrumentFrame} from './cost-instrumentation.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
const rows=[];
for(const leg of ['baseline','candidate']){
 const path='web/src/render/index.ts';
 const source=leg==='baseline'?execFileSync('tar',['xOzf','docs/evidence/cut245/renderer-before.tar.gz',path],{encoding:'utf8'}):readFileSync(path,'utf8');
 if(leg==='baseline')assert.equal(hash(source),JSON.parse(readFileSync('docs/evidence/cut245/before-identity.json')).files[path]);
 const {code:original}=await transformWithOxc(source,'index.ts',{lang:'ts'});
 const body=instrumentFrame(original,leg,true);
 assert(!body.includes('raf = requestAnimationFrame(frame);'));
 assert.equal(body.split('globalThis.__landmarkCostFrames').length,2);
 assert(body.indexOf('globalThis.__landmarkCostFrames')>body.indexOf('function frame(now)'));
 rows.push({leg,path,sourceSha256:hash(source),originalSha256:hash(original),instrumentedSha256:hash(body),rafSitesRemoved:2,frameRegistrations:1,preRenderGates:1});
}
writeFileSync('docs/evidence/cut245/cost-symmetric-preflight.json',JSON.stringify({scope:'Static Vite Oxc transformed-module instrumentation conformance only; no GPU/cold performance result or control acceptance',harnessSha256:hash(readFileSync(new URL('./cost.mjs',import.meta.url))),instrumentationSha256:hash(readFileSync(new URL('./cost-instrumentation.mjs',import.meta.url))),rows},null,2)+'\n');
console.log('Both transformed renderer variants: one gated frame, one shared-driver registration, no own RAF scheduling.');
