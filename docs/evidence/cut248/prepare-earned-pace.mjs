// Public paid preparation on an immutable earned parent. No grants or state edits.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {gunzipSync,gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {Game,initSync} from '../../../web/src/engine/pkg/idlever_wasm.js';
const hash=b=>createHash('sha256').update(b).digest('hex');
const out='docs/evidence/cut248/baseline';assert(!existsSync(`${out}/earned-pace.json`));
const input='docs/evidence/cut246/prepared/fighter-sword.session.json.gz';
const bytes=gunzipSync(readFileSync(input));const wasm=readFileSync('web/src/engine/pkg/idlever_wasm_bg.wasm');initSync({module:wasm});
const g=Game.fromSave(bytes.toString());const before=JSON.parse(g.lineage());const armour=before.kit.find(k=>k.slot==='armour');assert(armour.next.affordable);assert(armour.branches.some(b=>b.id==='pace'));
const quote=armour.next.price;g.buyKit('armour:pace');const after=JSON.parse(g.lineage());assert.equal(after.gold,before.gold-quote);
writeFileSync(`${out}/earned-pace.paid-prepared.session.json.gz`,gzipSync(g.save()));
const snapshot=JSON.parse(g.send());const sent=g.save();const sentState=JSON.parse(sent);assert.equal(sentState.run.hero.pace,8);assert.equal(snapshot.depth,1);
writeFileSync('docs/evidence/cut248/earned-paid-pace.sent.session.json',sent);writeFileSync(`${out}/earned-pace.sent.snapshot.json.gz`,gzipSync(JSON.stringify(snapshot)));
const a=Game.fromSave(sent),b=Game.fromSave(sent);a.step(10);b.runOfflineSlice(1,false);const single=JSON.parse(a.save()).run,batched=JSON.parse(b.save()).run;
const expected=8*10+8;assert.equal(single.hero.energy,expected);
const result={utc:new Date().toISOString(),scope:'Earned public buyKit(armour:pace) + manual send; immutable parent, actual paid quote, no grants/direct edits. Controlled continuation comparison is not a default policy choice or pacing claim.',wasmSha256:hash(wasm),input,inputRawSha256:hash(bytes),goldBefore:before.gold,quote,goldAfter:after.gold,ownedBefore:armour.owned,ownedAfter:after.kit.find(k=>k.slot==='armour').owned,ledgerTail:after.gold_ledger.slice(-2),sentRawSha256:hash(sent),runId:sentState.run.id,pace:sentState.run.hero.pace,at10ticks:{independentExpectedEnergy:expected,singleEnergy:single.hero.energy,batchedEnergy:batched.hero.energy,otherHeroDifferences:Object.keys(single.hero).filter(k=>k!=='energy'&&JSON.stringify(single.hero[k])!==JSON.stringify(batched.hero[k])),rngEqual:JSON.stringify(single.rng)===JSON.stringify(batched.rng),monstersEqual:JSON.stringify(single.monsters)===JSON.stringify(batched.monsters)},inputUnchanged:hash(gunzipSync(readFileSync(input)))===hash(bytes)};
writeFileSync(`${out}/earned-pace.json`,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));g.free();a.free();b.free();
