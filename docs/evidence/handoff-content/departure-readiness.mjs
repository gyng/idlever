// Current public legal-choice preparation from one immutable earned camp.
// No grants, time advance, policy bots, purchase substitutes, or historical fight edits.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gunzipSync,gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {Game,initSync} from '../../../web/src/engine/pkg/idlever_wasm.js';
const input='docs/evidence/handoff-menus/input.game.json.gz';
const hash=b=>createHash('sha256').update(b).digest('hex');
// The epoch label is the engine's own identity. The 2026-10-16 version pinned the wasm to
// `e62c0867…` and hardcoded `departure-readiness-e62c/`, so it refused to run on any later build
// (the R3 pair lane hit exactly that on 2026-10-17). Deriving the directory from the identity
// keeps a run from ever mixing builds and leaves the earlier epoch's outputs where they are; the
// identity is recorded in results.json and re-checked after the run.
const wasm=readFileSync('web/src/engine/pkg/idlever_wasm_bg.wasm');
const output=`docs/evidence/handoff-content/departure-readiness-${hash(wasm).slice(0,4)}`;
initSync({module:wasm});
const sourceBytes=readFileSync(input),raw=gunzipSync(sourceBytes).toString();
const source=Game.fromSave(raw);
const before=JSON.parse(source.lineage()),canonical=source.save();
mkdirSync(output,{recursive:true});
const result={scope:'Current public legal-choice preparation only from immutable earned Home camp; zero sends, no encounter/counter/outcome or R3/R4 acceptance claim',input,inputGzipSha256:hash(sourceBytes),inputRawSha256:hash(raw),wasm:{sha256:hash(wasm),bytes:wasm.length},canonicalSha256:hash(canonical),before,choices:[]};
writeFileSync(`${output}/baseline.session.json.gz`,gzipSync(canonical));
for(const spec of [
 ...['gas_step','pack_break','corridor_fighting','reflect_read','boss_focus','hunter'].map(id=>({kind:'package',id,slot:0})),
 ...['fighter','rogue','ranger','caster','gunner'].map(id=>({kind:'class',id})),
]){
 const g=Game.fromSave(canonical),untouched=g.save();
 assert.equal(untouched,canonical,'Canonical clone load must be exact');
 let error=null,after;
 try { after=JSON.parse(spec.kind==='package'?g.equipPackage(spec.id,spec.slot):g.setClass(spec.id)); }
 catch(e){error=String(e);}
 const saved=g.save();
 if(error)assert.equal(saved,untouched,'Refused public choice must preserve complete save');
 else {
  assert.equal(after.clock_s,before.clock_s,'Choice must not advance time');
  assert.equal(after.seed,before.seed);
  assert.equal(after.selected_bloodline,before.selected_bloodline);
  const path=`${output}/${spec.kind}-${spec.id}.session.json.gz`;
  writeFileSync(path,gzipSync(saved));
  result.choices.push({...spec,legal:true,path,saveSha256:hash(saved),goldBefore:before.gold,goldAfter:after.gold,legacyBefore:before.hero_legacy,legacyAfter:after.hero_legacy,after});
 }
 if(error)result.choices.push({...spec,legal:false,error,exactRefusalSave:true});
 g.free();
}
assert.equal(source.save(),canonical,'Preparation cannot mutate parent');
source.free();
assert.equal(hash(readFileSync(input)),result.inputGzipSha256);
assert.equal(hash(readFileSync('web/src/engine/pkg/idlever_wasm_bg.wasm')),result.wasm.sha256);
result.exactParentSave=true;result.status='PASS';
writeFileSync(`${output}/results.json`,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({status:result.status,choices:result.choices.map(({kind,id,legal,error,goldBefore,goldAfter})=>({kind,id,legal,error,goldBefore,goldAfter}))}));
