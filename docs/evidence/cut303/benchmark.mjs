import {identity} from '../../web/tests/lib/run-state.mjs';
import {readFileSync,rmSync,statSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root=process.cwd();
const source=readFileSync('docs/evidence/cut303/baseline-run-state.mjs','utf8');
const match='export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");';assert(source.includes(match));
const old=(await import('data:text/javascript;base64,'+Buffer.from(source.replace(match,`export const ROOT = ${JSON.stringify(root)};`)).toString('base64'))).identity;
const files=execFileSync('git',['ls-files','--others','--exclude-standard','-z'],{maxBuffer:1<<30}).toString().split('\0').filter(Boolean);
const sizes=files.map(p=>Number(statSync(p).size));
const legacy=[];
for(let i=0;i<3;i++){const t=performance.now();const result=old();legacy.push({ms:performance.now()-t,identity:result});console.error('legacy',i,legacy.at(-1).ms);}
assert.deepEqual(legacy[0].identity,legacy[1].identity);assert.deepEqual(legacy[1].identity,legacy[2].identity);
const cachePath=root+'/target/cut303/benchmark-cache.json';rmSync(cachePath,{force:true});
const measure=()=>{const stats={};const t=performance.now();const result=identity(undefined,{cachePath,stats});return{ms:performance.now()-t,identity:result,stats};};
const cold=measure();console.error('cold',cold.ms);
const warm=[measure(),measure(),measure()];for(const x of warm){assert.deepEqual(x.identity,cold.identity);assert.equal(x.stats.contentBytesRead,0);assert.equal(x.stats.untrackedFiles,files.length);}
const median=a=>a.map(x=>x.ms).sort((a,b)=>a-b)[1];
const reduction=1-median(warm)/median(legacy);assert(reduction>=.75);
console.log(JSON.stringify({node:process.version,baseline_source_sha256:createHash('sha256').update(source).digest('hex'),coverage:{untracked_files:files.length,total_bytes:sizes.reduce((a,b)=>a+b,0),legacy_bytes:sizes.filter(n=>n<32<<20).reduce((a,b)=>a+b,0)},legacy,cold,warm,reduction,median_legacy_ms:median(legacy),median_warm_ms:median(warm)},null,2));
