import { identity } from '../../web/tests/lib/run-state.mjs';
import { execFileSync } from 'node:child_process';
import { statSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
const git=(args)=>execFileSync('git',args,{maxBuffer:1<<30}).toString();
const files=git(['ls-files','--others','--exclude-standard','-z']).split('\0').filter(Boolean);
let total=0,read=0,large=0;
for(const f of files){try{const n=statSync(f).size;total+=n;if(n<32<<20)read+=n;else large++;}catch{}}
const runs=[];
for(let i=0;i<3;i++){const t=performance.now();const result=identity();if(result.head!==git(['rev-parse','HEAD']).trim()||!result.dirty)throw Error('Git identity unavailable');runs.push({ms:performance.now()-t,identity:result});}
console.log(JSON.stringify({node:process.version,untracked_files:files.length,total_bytes:total,legacy_content_bytes_per_call:read,size_only_files:large,runs},null,2));
